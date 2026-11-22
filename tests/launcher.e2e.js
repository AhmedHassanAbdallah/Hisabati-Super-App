/*
 * حساباتي — التطبيق الموحد: اختبار شامل للانشر في متصفح حقيقي (Playwright).
 *   python3 -m http.server 8790   (من فولدر Hisabati-Super-App)
 *   node tests/launcher.e2e.js [http://127.0.0.1:8790/] [مجلد_لقطات]
 *
 * بيتأكد من:
 *  1) قائمة المهن: 10 مهن شغالة، ومن غير أرقام إصدارات.
 *  2) كل مهنة بتفتح جوه اللانشر من فولدر نسختها، وبتحمّل نفس المستند ونفس العنوان زي التشغيل المستقل،
 *     ومن غير أي أخطاء JavaScript.
 *  3) التطبيق جوه اللانشر بيكتب نفس مفاتيح التخزين بالظبط اللي بيكتبها لما يشتغل لوحده.
 *  4) زرار الرجوع: يقفل نوافذ التطبيق الأول، وبعدها يرجع لقائمة المهن. وزرار "كل المهن" يرجع على طول.
 *  5) حفظ البيانات: تغيير إعداد من جوه التطبيق (الثيم) بيفضل محفوظ بعد إعادة التحميل،
 *     وبيظهر كمان لما التطبيق يتفتح لوحده (نفس البيانات).
 *  6) الطباعة/PDF: الطباعة من جوه التطبيق بتطبع مستند التطبيق نفسه مش صفحة اللانشر.
 *  7) فاتورة كهرباء: نفس الخطوات جوه اللانشر ولوحده بتطلع نفس نص الفاتورة بالظبط.
 */
const { chromium } = require('playwright');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const BASE = (process.argv[2] || 'http://127.0.0.1:8790/').replace(/\/?$/, '/');
const SHOTS = process.argv[3] || '';
const ROOT = path.join(__dirname, '..');
const LAUNCHER = BASE + 'Main-App/';
const TRADES = [
  { id: 'electrical', dir: 'Electrical' }, { id: 'plumbing', dir: 'Plumbing' }, { id: 'hvac', dir: 'HVAC' },
  { id: 'painting', dir: 'Painting' }, { id: 'flooring', dir: 'Flooring' }, { id: 'gypsum', dir: 'Gypsum' },
  { id: 'plastering', dir: 'Plastering' }, { id: 'metalwork', dir: 'Metalwork' }, { id: 'carpentry', dir: 'Carpentry' }, { id: 'masonry', dir: 'Masonry' }
];

let passed = 0, failed = 0;
const check = (name, cond, extra) => {
  if (cond) { passed++; console.log('  ✔ ' + name); }
  else { failed++; console.log('  ✘ ' + name + (extra !== undefined ? '  → ' + JSON.stringify(extra) : '')); }
};
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function newCtx(browser) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/favicon|net::ERR_|Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  page.on('dialog', d => d.accept());
  return { ctx, page, errors };
}
const shot = async (page, name) => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, name + '.png') }); };

const appFrame = async page => {
  const h = await page.waitForSelector('#frameHost iframe', { timeout: 10000 });
  const f = await h.contentFrame();
  await f.waitForLoadState('load');
  await page.waitForFunction(() => document.getElementById('frameLoading').hidden, null, { timeout: 15000 });
  await sleep(600);
  return f;
};
// بعض الأقسام بتضيف #/home لعنوانها عند التشغيل (زي التشغيل المستقل بالظبط)
const noHash = u => String(u).split('#')[0];
const view = page => page.evaluate(() => document.body.dataset.view);
const frameIndex = f => f.evaluate(() => (window.navigation && navigation.currentEntry ? navigation.currentEntry.index : -1));
const lsKeys = page => page.evaluate(() => Object.keys(localStorage).sort());
// لقطة لبيانات التطبيقات مع تجاهل طوابع الوقت بس (بعض التطبيقات بتحدث updatedAt مع كل فتح — نفس السلوك لوحدها)
const dataSnapshot = page => page.evaluate(() => {
  const ts = v => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v)) || (typeof v === 'number' && v > 1e12 && v < 1e13);
  const norm = v => ts(v) ? '<ts>' : Array.isArray(v) ? v.map(norm) : (v && typeof v === 'object') ? Object.fromEntries(Object.keys(v).sort().map(k => [k, norm(v[k])])) : v;
  return JSON.stringify(Object.keys(localStorage).filter(k => !k.startsWith('hisabati_super_')).sort().map(k => {
    const raw = localStorage.getItem(k); let v; try { v = norm(JSON.parse(raw)); } catch (e) { v = ts(raw) || /^\d{13}$/.test(raw) ? '<ts>' : raw; }
    return [k, v];
  }));
});
const openPlus = async f => {
  if (await f.$('#navPlus')) await f.click('#navPlus');
  else if (await f.$('.bottom-nav [data-view="projects"]')) await f.click('.bottom-nav [data-view="projects"]'); // المحارة: التنقل بالصفحات (#/projects)
  else await f.click('.bottom-nav .nav-plus');
  await sleep(500);
};

(async () => {
  const browser = await chromium.launch();
  if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

  /* ---------------- 1) قائمة المهن ---------------- */
  console.log('\n[1] قائمة المهن');
  {
    const { ctx, page, errors } = await newCtx(browser);
    await page.goto(BASE); // الصفحة الجذرية بتحول للانشر
    await page.waitForURL(LAUNCHER + '**');
    await sleep(800);
    check('الجذر بيحوّل لـ Main-App/', page.url().startsWith(LAUNCHER));
    const enabled = await page.$$eval('.trade[data-trade]', els => els.map(e => e.dataset.trade));
    check('10 مهن شغالة بالترتيب', JSON.stringify(enabled) === JSON.stringify(TRADES.map(t => t.id)), enabled);
    const disabled = await page.$$eval('.trade[disabled]', els => els.map(e => e.textContent.replace(/\s+/g, ' ').trim()));
    check('كل الأقسام متاحة (مفيش أقسام "قريباً")', disabled.length === 0, disabled);
    const homeText = await page.evaluate(() => document.body.innerText);
    check('أرقام الإصدارات مخفية', !/إصدار/.test(homeText) && !(await page.$('[data-ver]')));
    check('مفيش أي ذكر لـ "تطبيق" في الرئيسية', !/تطبيق/.test(homeText), (homeText.match(/[^\n]*تطبيق[^\n]*/g) || []));
    check('مفيش أخطاء في الرئيسية', errors.length === 0, errors);
    await shot(page, '00-home');
    await ctx.close();
  }

  /* ---------------- 1ب) القائمة: التعريف بالأقسام ---------------- */
  console.log('\n[1ب] القائمة والتعريف بالأقسام');
  {
    const { ctx, page, errors } = await newCtx(browser);
    const drawerOpen = () => page.evaluate(() => document.getElementById('drawer').classList.contains('open'));
    await page.goto(LAUNCHER); await sleep(600);
    check('القائمة مقفولة في الأول', !(await drawerOpen()));
    await page.click('#menuBtn'); await sleep(450);
    check('زرار القائمة بيفتحها', await drawerOpen());
    const items = await page.$$eval('#drawerTrades [data-open]', els => els.map(e => e.dataset.open));
    check('القائمة فيها تعريف الـ 10 أقسام بزرار فتح', JSON.stringify(items) === JSON.stringify(TRADES.map(t => t.id)), items);
    const dText = await page.evaluate(() => document.getElementById('drawer').innerText);
    check('القائمة فيها "عن أرزقي" وقسم المحارة', dText.includes('عن أرزقي') && dText.includes('المحارة والواجهات') && !dText.includes('قريباً'));
    check('القائمة ما فيهاش ذكر لـ "تطبيق" ولا إصدارات', !/تطبيق|إصدار/.test(dText), (dText.match(/[^\n]*(تطبيق|إصدار)[^\n]*/g) || []));
    await page.click('#drawerTrades .dt:nth-child(3) summary'); await sleep(300);
    check('الضغط على قسم بيعرض مميزاته', await page.evaluate(() => { const d = document.querySelector('#drawerTrades .dt:nth-child(3)'); return d.open && d.querySelectorAll('li').length >= 3; }));
    await shot(page, '01-menu');
    await page.evaluate(() => history.back()); await sleep(450);
    check('زرار الرجوع بيقفل القائمة ويفضل في الرئيسية', !(await drawerOpen()) && (await view(page)) === 'home' && page.url().startsWith(LAUNCHER));
    await page.click('#menuBtn'); await sleep(450);
    await page.click('#drawer .drawer-head [data-close]'); await sleep(450);
    check('زرار X بيقفل القائمة', !(await drawerOpen()) && (await page.evaluate(() => history.state && history.state.hs)) === 'home');
    await page.click('#menuBtn'); await sleep(450);
    await page.keyboard.press('Escape'); await sleep(450);
    check('Esc بيقفل القائمة', !(await drawerOpen()));
    await page.click('#menuBtn'); await sleep(450);
    if (!(await page.$eval('#drawerTrades .dt:nth-child(3)', d => d.open))) { await page.click('#drawerTrades .dt:nth-child(3) summary'); await sleep(300); }
    await page.click('#drawerTrades [data-open="hvac"]');
    const f = await appFrame(page);
    check('زرار "افتح" في القائمة بيفتح القسم', f.url() === BASE + 'Trade-Modules/HVAC/' && !(await drawerOpen()));
    await page.evaluate(() => history.back()); await sleep(700);
    check('الرجوع من القسم بيروح للرئيسية على طول (مش للقائمة)', (await view(page)) === 'home' && !(await drawerOpen()));
    check('مفيش أخطاء', errors.length === 0, errors);
    await ctx.close();
  }

  /* ---------------- 2–4) كل مهنة ---------------- */
  for (const t of TRADES) {
    console.log(`\n[2-4] ${t.id}`);
    const url = BASE + 'Trade-Modules/' + t.dir + '/';

    // المرجع: التطبيق لوحده في سياق جديد
    const solo = await newCtx(browser);
    await solo.page.goto(url); await sleep(1500);
    const soloTitle = await solo.page.title();
    const soloKeys = await lsKeys(solo.page);
    const soloBody = await solo.page.evaluate(() => document.body.childElementCount);
    await solo.ctx.close();

    const { ctx, page, errors } = await newCtx(browser);
    await page.goto(LAUNCHER); await sleep(500);
    const before = await lsKeys(page);
    await page.click(`[data-trade="${t.id}"]`);
    let f = await appFrame(page);
    await sleep(900);
    check('اتفتح من فولدر النسخة', noHash(f.url()) === url, f.url());
    check('نفس عنوان المستند زي التشغيل المستقل', (await f.title()) === soloTitle, await f.title());
    check('نفس هيكل الصفحة', (await f.evaluate(() => document.body.childElementCount)) === soloBody);
    check('اللانشر في وضع التطبيق ورابطه #' + t.id, (await view(page)) === 'app' && page.url().endsWith('#' + t.id), page.url());
    const appKeys = (await lsKeys(page)).filter(k => !before.includes(k) && !k.startsWith('hisabati_super_'));
    check('نفس مفاتيح التخزين زي التشغيل المستقل', JSON.stringify(appKeys) === JSON.stringify(soloKeys), { inLauncher: appKeys, standalone: soloKeys });
    await shot(page, '10-' + t.id);

    // زرار الرجوع: نافذة جوه التطبيق ← قفلها ← القائمة
    await openPlus(f);
    const idx = await frameIndex(f);
    check('التطبيق فتح نافذة (خطوة في سجل الرجوع)', idx >= 1, idx);
    await page.evaluate(() => history.back()); await sleep(700);
    check('الرجوع الأول قفل نافذة التطبيق والتطبيق لسه مفتوح', (await view(page)) === 'app' && (await frameIndex(f)) === idx - 1, { view: await view(page), idx: await frameIndex(f) });
    for (let i = 0; i < 8 && (await view(page)) === 'app'; i++) { await page.evaluate(() => history.back()); await sleep(600); }
    check('الرجوع وصّل لقائمة المهن', (await view(page)) === 'home' && !(await page.$('#frameHost iframe')));
    check('حالة السجل = home', (await page.evaluate(() => history.state && history.state.hs)) === 'home');

    // زرار "كل المهن" وفيه نوافذ مفتوحة
    await page.click(`[data-trade="${t.id}"]`);
    f = await appFrame(page);
    await openPlus(f);
    await page.click('#homeBtn'); await sleep(900);
    check('زرار "كل المهن" رجّع للقائمة على طول', (await view(page)) === 'home' && (await page.evaluate(() => history.state && history.state.hs)) === 'home' && !(await page.$('#frameHost iframe')));
    check('"آخر استخدام" على المهنة دي', ((await page.textContent(`[data-trade="${t.id}"]`)) || '').includes('آخر استخدام'));

    // فتح مباشر من الرابط
    await page.goto(LAUNCHER + '#' + t.id); f = await appFrame(page);
    check('الرابط المباشر #' + t.id + ' بيفتح المهنة', noHash(f.url()) === url);
    await page.evaluate(() => history.back()); await sleep(700);
    check('الرجوع من الرابط المباشر بيروح للقائمة', (await view(page)) === 'home');

    check('مفيش أخطاء JavaScript', errors.length === 0, errors);
    await ctx.close();
  }

  /* ---------------- 5) حفظ البيانات ---------------- */
  console.log('\n[5] حفظ البيانات (من واجهة كل تطبيق)');
  {
    const { ctx, page, errors } = await newCtx(browser);
    await page.goto(LAUNCHER);
    for (const t of TRADES) {
      await page.goto(LAUNCHER + '#' + t.id);
      let f = await appFrame(page);
      const th0 = await f.evaluate(() => document.documentElement.getAttribute('data-theme'));
      await f.click('#themeBtn, [data-act="toggleTheme"]'); await sleep(400);
      const th1 = await f.evaluate(() => document.documentElement.getAttribute('data-theme'));
      check(`${t.id}: زرار الثيم جوه التطبيق اشتغل`, th1 && th1 !== th0, { th0, th1 });
      const snap = await dataSnapshot(page);
      await page.reload(); f = await appFrame(page);
      check(`${t.id}: الإعداد محفوظ بعد إعادة تحميل اللانشر`, (await f.evaluate(() => document.documentElement.getAttribute('data-theme'))) === th1);
      const solo = await ctx.newPage(); await solo.goto(BASE + 'Trade-Modules/' + t.dir + '/'); await sleep(1200);
      check(`${t.id}: نفس البيانات لما التطبيق يتفتح لوحده`, (await solo.evaluate(() => document.documentElement.getAttribute('data-theme'))) === th1);
      await solo.close();
      const snap2 = await dataSnapshot(page);
      check(`${t.id}: إعادة التحميل ما غيرتش أي بيانات (ماعدا طوابع الوقت اللي التطبيق بيحدثها لوحده)`, snap === snap2, snap === snap2 ? undefined : { before: snap.slice(0, 300), after: snap2.slice(0, 300) });
    }
    const launcherKeys = (await lsKeys(page)).filter(k => k.startsWith('hisabati_super_'));
    check('اللانشر بيستخدم مفاتيحه بس (hisabati_super_*)', launcherKeys.every(k => /^hisabati_super_(last|theme)_v1$/.test(k)), launcherKeys);
    check('مفيش أخطاء', errors.length === 0, errors);
    await ctx.close();
  }

  /* ---------------- 6–7) فاتورة كهرباء + طباعة ---------------- */
  console.log('\n[6-7] فاتورة كهرباء: نفس النتيجة + الطباعة من جوه التطبيق');
  async function electricalInvoice(f, page) {
    await f.click('#qPoints'); await sleep(700);
    const prev = f.locator('button:has-text("معاينة الفاتورة وطباعتها PDF")').first();
    // الفاتورة الجديدة بخطواتها: نتنقل لحد زرار المعاينة
    for (let i = 0; i < 4 && !(await prev.isVisible().catch(() => false)); i++) {
      const next = f.locator('button:visible:has-text("التالي")').first();
      if (await next.count()) { await next.click(); await sleep(500); } else break;
    }
    await prev.click(); await sleep(900);
    return f;
  }
  const normalize = s => s.replace(/\s+/g, ' ').replace(/[0-9٠-٩]{1,4}[\/\-.][0-9٠-٩]{1,2}[\/\-.][0-9٠-٩]{1,4}/g, '<date>').trim();
  {
    // جوه اللانشر
    const L = await newCtx(browser);
    await L.page.goto(LAUNCHER + '#electrical');
    const f = await electricalInvoice(await appFrame(L.page), L.page);
    const printable = await f.evaluate(() => {
      const el = document.querySelector('#printSheet, .print-sheet, #singlePage, .sp-page, #invoicePreview');
      return el ? el.innerText : '';
    });
    const tPrint = await f.evaluate(() => new Promise(res => {
      const log = [];
      window.addEventListener('beforeprint', () => log.push('frame'), { once: true });
      window.parent.addEventListener('beforeprint', () => log.push('launcher'), { once: true });
      const b = [...document.querySelectorAll('button')].find(x => /طباعة \/ PDF/.test(x.textContent) && x.offsetParent !== null);
      if (!b) return res(['no-button']);
      b.click();
      setTimeout(() => res(log), 900);
    }));
    await shot(L.page, '20-electrical-preview');
    check('معاينة الفاتورة اتعرضت جوه اللانشر', printable.length > 50, printable.length);
    check('زرار "طباعة / PDF" بيطبع مستند التطبيق بس (مش اللانشر)', JSON.stringify(tPrint) === '["frame"]', tPrint);

    // لوحده
    const S = await newCtx(browser);
    await S.page.goto(BASE + 'Trade-Modules/Electrical/'); await sleep(1500);
    await electricalInvoice(S.page.mainFrame(), S.page);
    const soloPrintable = await S.page.evaluate(() => {
      const el = document.querySelector('#printSheet, .print-sheet, #singlePage, .sp-page, #invoicePreview');
      return el ? el.innerText : '';
    });
    check('نص الفاتورة جوه اللانشر = نص الفاتورة لوحده', normalize(printable) === normalize(soloPrintable), { launcher: normalize(printable).slice(0, 200), solo: normalize(soloPrintable).slice(0, 200) });
    // PDF فعلي من نفس مستند التطبيق
    await S.page.emulateMedia({ media: 'print' });
    const pdf = await S.page.pdf({ format: 'A4', printBackground: true });
    check('توليد PDF فعلي A4 من الفاتورة', pdf.slice(0, 5).toString() === '%PDF-' && pdf.length > 10000, pdf.length);
    check('مفيش أخطاء', L.errors.length === 0 && S.errors.length === 0, L.errors.concat(S.errors));
    await L.ctx.close(); await S.ctx.close();
  }

  await browser.close();
  console.log(`\nالنتيجة: ${passed} نجح · ${failed} فشل`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
