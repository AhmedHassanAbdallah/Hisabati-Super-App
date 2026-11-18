/*
 * حساباتي — التطبيق الموحد: اختبار الـ Service Workers والعمل بدون إنترنت.
 *   node tests/launcher.offline.js [http://127.0.0.1:8790/]
 * بيتأكد إن:
 *  - الـ Service Worker بتاع اللانشر نطاقه Main-App/ بس.
 *  - كل تطبيق جوه اللانشر بيسجل الـ Service Worker الأصلي بتاعه في فولدره، وهو اللي بيتحكم فيه (مش بتاع اللانشر).
 *  - بعد فتح كل مهنة مرة أونلاين: اللانشر وكل المهن بتفتح وتشتغل أوفلاين.
 *  - أسماء الكاش ما بتتداخلش (اللانشر hisabati-super-* بس).
 */
const { chromium } = require('playwright');
const BASE = (process.argv[2] || 'http://127.0.0.1:8790/').replace(/\/?$/, '/');
const LAUNCHER = BASE + 'Main-App/';
const TRADES = [['electrical', 'Electrical'], ['plumbing', 'Plumbing'], ['hvac', 'HVAC'], ['painting', 'Painting'], ['flooring', 'Flooring'], ['gypsum', 'Gypsum']];
let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) { passed++; console.log('  ✔ ' + n); } else { failed++; console.log('  ✘ ' + n + (x !== undefined ? '  → ' + JSON.stringify(x) : '')); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function frameOf(page) {
  const h = await page.waitForSelector('#frameHost iframe', { timeout: 15000 });
  const f = await h.contentFrame(); await f.waitForLoadState('load');
  await page.waitForFunction(() => document.getElementById('frameLoading').hidden, null, { timeout: 15000 });
  return f;
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => d.accept());

  console.log('\n[1] أونلاين: تسجيل الـ Service Workers');
  await page.goto(LAUNCHER);
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null || navigator.serviceWorker.ready, null, { timeout: 15000 });
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload(); await sleep(800);
  const lscope = await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).scope);
  check('نطاق Service Worker اللانشر = Main-App/', lscope === LAUNCHER, lscope);
  check('اللانشر متحكم فيه Service Worker بتاعه', await page.evaluate(() => !!navigator.serviceWorker.controller && navigator.serviceWorker.controller.scriptURL.endsWith('/Main-App/service-worker.js')));

  for (const [id, dir] of TRADES) {
    await page.goto(LAUNCHER + '#' + id);
    let f = await frameOf(page);
    await f.evaluate(() => navigator.serviceWorker.ready);
    await sleep(800);
    // إعادة فتح علشان الـ Service Worker بتاع التطبيق يتحكم في الصفحة (نفس سلوك التشغيل المستقل)
    await page.reload(); f = await frameOf(page); await sleep(1200);
    const ctl = await f.evaluate(() => navigator.serviceWorker.controller && navigator.serviceWorker.controller.scriptURL);
    check(`${id}: متحكم فيه الـ Service Worker الأصلي بتاعه`, ctl === BASE + 'Trade-Modules/' + dir + '/service-worker.js', ctl);
  }
  const regs = await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).map(r => r.scope).sort());
  check('7 تسجيلات منفصلة (اللانشر + 6 تطبيقات)', regs.length === 7, regs);
  const cacheNames = await page.evaluate(() => caches.keys());
  check('كاش اللانشر بس بيبدأ بـ hisabati-super-', cacheNames.filter(k => k.startsWith('hisabati-super-')).length === 1, cacheNames);

  console.log('\n[2] أوفلاين');
  await ctx.setOffline(true);
  await page.goto(LAUNCHER); await sleep(800);
  check('اللانشر بيفتح أوفلاين', (await page.$$('.trade[data-trade]')).length === 6);
  for (const [id] of TRADES) {
    await page.click(`[data-trade="${id}"]`);
    const f = await frameOf(page); await sleep(800);
    const ok = await page.evaluate(() => document.getElementById('frameError').hidden);
    const nav = await f.$('nav, .bottom-nav');
    check(`${id}: بيشتغل أوفلاين جوه اللانشر`, ok && !!nav);
    await page.click('#homeBtn'); await sleep(700);
  }
  await ctx.setOffline(false);
  check('مفيش أخطاء JavaScript', errors.length === 0, errors);
  await browser.close();
  console.log(`\nالنتيجة: ${passed} نجح · ${failed} فشل`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
