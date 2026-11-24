/*
 * «طريقة الاستخدام» في كل قسم: الشرح بيمشي للآخر زي المستخدم (التالي ← التالي …) وكل خطوة لاقية الزرار/الخانة بتاعتها
 * (لو حد غيّر واجهة القسم والشرح مبقاش مطابق، الاختبار ده بيقع)، وبعد الشرح بيانات القسم بترجع زي ما كانت بالظبط،
 * والشرح مش بيظهر تاني لوحده، و«طريقة الاستخدام» موجودة في المزيد، ولو التطبيق اتقفل في نص الشرح البيانات بترجع.
 * usage: node tests/guide.e2e.js [http://127.0.0.1:8790/] [Section ...]
 */
const { chromium } = require('playwright');
const BASE = (process.argv[2] || 'http://127.0.0.1:8790/').replace(/\/?$/, '/');
const ALL = ['Electrical', 'Plumbing', 'HVAC', 'Painting', 'Flooring', 'Gypsum', 'Plastering', 'Metalwork', 'Carpentry', 'Masonry', 'LowCurrent', 'Aluminium', 'Marble'];
const ONLY = process.argv.slice(3);
const SECS = ONLY.length ? ALL.filter(s => ONLY.includes(s)) : ALL;
let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) { passed++; console.log('  ✔ ' + n); } else { failed++; console.log('  ✘ ' + n + (x !== undefined ? '  → ' + JSON.stringify(x).slice(0, 500) : '')); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
// بعض الأقسام بتحدّث «آخر تحديث» بتاع قاعدة بياناتها مع كل فتحة (حتى من غير الشرح) — ده بس اللي بيتشال من المقارنة، وكل السجلات بتتقارن
const dump = page => page.evaluate(pre => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (pre.some(p => k.startsWith(p)) || k === 'arzaqi_inv_extra_v1') { let v = localStorage.getItem(k); try { const j = JSON.parse(v); if (j && typeof j === 'object' && !Array.isArray(j) && 'updatedAt' in j) { delete j.updatedAt; v = JSON.stringify(j); } } catch (e) {} o[k] = v; } } return o; }, globalThis.__pre || []);

(async () => {
  const browser = await chromium.launch();
  for (const sec of SECS) {
    console.log('\n[' + sec + ']');
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    await ctx.addInitScript(() => { try { localStorage.setItem('arzaqi_guide_test', '1'); } catch (e) {} });
    const page = await ctx.newPage(); const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'warning' && /Arzoqi guide/.test(m.text())) errors.push(m.text()); });
    const url = BASE + 'Trade-Modules/' + sec + '/';
    // فتحة أولى «نضيفة» علشان القسم يكتب بياناته الافتراضية، ومن غير ما الشرح يبدأ
    await page.goto(url); await page.evaluate(() => localStorage.setItem('arzaqi_guide_off', '1')); await page.reload(); await sleep(1500);
    globalThis.__pre = await page.evaluate(() => (window.ArzoqiGuide && ArzoqiGuide.def && ArzoqiGuide.def.keys) || []);
    check('الشرح متعرّف للقسم', globalThis.__pre.length > 0);
    const before = await dump(page);
    await page.evaluate(() => localStorage.removeItem('arzaqi_guide_off')); await page.reload();
    await page.waitForFunction(() => window.ArzoqiGuide && ArzoqiGuide.running && ArzoqiGuide.step && !ArzoqiGuide.step.busy, null, { timeout: 15000 }).catch(() => {});
    check('بيظهر لوحده أول مرة', await page.evaluate(() => !!(window.ArzoqiGuide && ArzoqiGuide.running)));
    const titles = [], noEl = [], offScreen = []; let endPart1 = -1, total = 0; const deadline = Date.now() + 240000;
    while (Date.now() < deadline) {
      const st = await page.evaluate(() => ArzoqiGuide.running ? ArzoqiGuide.step : null);
      if (!st) break;
      if (st.busy) { await sleep(150); continue; }
      if (titles[st.i] === undefined) {
        titles[st.i] = st.title; if (!st.el) noEl.push(st.i + 1 + ' ' + st.title);
        await sleep(300); // بعد ما الحركة تخلص: الكارت كله جوه الشاشة، والتظليل باين
        const pos = await page.evaluate(() => { const c = document.querySelector('.azg-card').getBoundingClientRect(), sp = document.querySelector('.azg-spot').getBoundingClientRect(), vh = innerHeight;
          return { card: c.top >= 0 && c.bottom <= vh + 1, spot: !ArzoqiGuide.step.el || (sp.bottom > 0 && sp.top < vh && sp.height > 0) }; });
        if (!pos.card || !pos.spot) offScreen.push(st.i + 1 + ' ' + st.title + (pos.card ? '' : ' [الكارت برا الشاشة]') + (pos.spot ? '' : ' [التظليل برا الشاشة]'));
      }
      endPart1 = st.endPart1; total = st.total;
      if (st.i === st.total - 1) {
        await page.screenshot({ path: `/tmp/guide-${sec}-last.png` }).catch(() => {});
        await Promise.all([page.waitForNavigation({ timeout: 15000 }).catch(() => {}), page.click('.azg-card [data-azg="finish"]')]);
        break;
      }
      if (st.i === 1) await page.screenshot({ path: `/tmp/guide-${sec}-step2.png` }).catch(() => {});
      await page.click('.azg-card [data-azg="next"]'); await sleep(120);
    }
    await sleep(1500);
    check(`الشرح مشي للآخر (${titles.filter(Boolean).length} خطوة${endPart1 >= 0 ? '، الجزء الأول ' + (endPart1 + 1) : ''})`, titles.filter(Boolean).length === total && total >= 10, { total, shown: titles.filter(Boolean).length });
    check('الجزء الأول بيوصل للفاتورة PDF وبعده «كمّل شرح باقي الأجزاء»', endPart1 > 3 && /PDF|اطبع|الفاتورة|المستند/.test(titles.slice(Math.max(0, endPart1 - 2), endPart1 + 1).join(' ')), titles.slice(Math.max(0, endPart1 - 2), endPart1 + 1));
    check('كل خطوة لاقية الزرار/الخانة بتاعتها', noEl.length === 0, noEl);
    check('الكارت والتظليل جوه الشاشة في كل خطوة', offScreen.length === 0, offScreen);
    check('مفيش أخطاء ولا خطوات ناقصة', errors.length === 0, errors);
    const after = await dump(page);
    const diff = Object.keys(Object.assign({}, before, after)).filter(k => before[k] !== after[k]);
    check('بيانات القسم رجعت زي ما كانت بالظبط بعد المثال', diff.length === 0, diff);
    check('الشرح مش بيظهر تاني لوحده', await page.evaluate(() => new Promise(r => setTimeout(() => r(!ArzoqiGuide.running), 1800))));
    // «طريقة الاستخدام» في المزيد
    const hasMore = await page.evaluate(() => !!document.querySelector('.azg-more') || !!(window.ArzoqiGuide && ArzoqiGuide.def.more));
    check('«طريقة الاستخدام» في المزيد', hasMore);
    // اتقفل في نص الشرح: البيانات ترجع في الفتحة الجاية
    await page.evaluate(() => ArzoqiGuide.start());
    for (let i = 0; i < 8; i++) { await page.waitForFunction(() => ArzoqiGuide.step && !ArzoqiGuide.step.busy, null, { timeout: 8000 }).catch(() => {}); await page.click('.azg-card [data-azg="next"]').catch(() => {}); await sleep(200); }
    await page.waitForFunction(() => ArzoqiGuide.step && !ArzoqiGuide.step.busy, null, { timeout: 8000 }).catch(() => {});
    await page.evaluate(() => localStorage.setItem('arzaqi_guide_off', '1'));
    await page.reload(); await sleep(1500);
    const after2 = await dump(page);
    const diff2 = Object.keys(Object.assign({}, before, after2)).filter(k => before[k] !== after2[k]);
    check('اتقفل في نص الشرح ← البيانات رجعت في الفتحة الجاية', diff2.length === 0, diff2);
    await ctx.close();
  }
  await browser.close();
  console.log(`\nالنتيجة: ${passed} نجح · ${failed} فشل`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
