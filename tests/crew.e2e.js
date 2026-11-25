/*
 * نوتة العمال واليوميات (Shared-Assets/brand/crew.js) — في الأقسام الـ 14.
 * usage: node tests/crew.e2e.js http://127.0.0.1:8790/
 */
const { chromium } = require('playwright');
const BASE = (process.argv[2] || 'http://127.0.0.1:8790/').replace(/\/?$/, '/');
let ok = 0, bad = 0;
const check = (name, cond, info) => { if (cond) { ok++; console.log('  ✔ ' + name); } else { bad++; console.log('  ✘ ' + name + (info !== undefined ? '  →  ' + JSON.stringify(info) : '')); } };
const OPEN = {
  Electrical: () => { customers.push({ id: 'c1', name: 'عميل تجربة', phone: '010', address: 'القاهرة', note: '', entries: [], createdAt: Date.now() }); openCustomer('c1'); },
  Painting: () => { customers.push({ id: 'c1', name: 'عميل تجربة', phone: '010', address: 'القاهرة', note: '', entries: [], createdAt: Date.now() }); openCustomer('c1'); },
  Plumbing: () => { DB.customers.push(NORMALIZERS.customers({ id: 'c1', name: 'عميل تجربة' })); openPage('customer', 'c1'); },
  HVAC: () => { DB.customers.push(NORMALIZERS.customers({ id: 'c1', name: 'عميل تجربة' })); openPage('customer', 'c1'); },
  Flooring: () => { Store.db.customers.push({ id: 'c1', name: 'عميل تجربة', phone: '010' }); App.openCustomer('c1'); },
  Gypsum: () => { DB().customers.push({ id: 'c1', name: 'عميل تجربة', phone: '010' }); openCustomer('c1'); },
  Plastering: () => { UI.S.db().clients.push({ id: 'c1', name: 'عميل تجربة', phone: '010' }); UI.go('client', 'c1'); },
  Metalwork: () => { const A = window.MetalApp; A.db.customers.push({ id: 'c1', name: 'عميل تجربة', phone: '010' }); A.db.jobs.push({ id: 'j1', number: 'MTL-0001', customerId: 'c1', title: '', date: '2026-11-22', items: [], materials: [], consumables: [], payments: [], discount: {} }); A.openJob('j1'); },
  Carpentry: () => { const A = window.CarpApp; A.db.customers.push({ id: 'c1', name: 'عميل تجربة', phone: '010' }); A.db.jobs.push({ id: 'j1', number: 'CRP-0001', customerId: 'c1', title: '', date: '2026-11-22', status: 'active', items: [], costs: [], payments: [], discount: {} }); A.openJob('j1'); },
  Masonry: () => { const A = window.MasonApp; A.db.customers.push({ id: 'c1', name: 'عميل تجربة', phone: '010' }); A.db.jobs.push({ id: 'j1', number: 'BLD-0001', customerId: 'c1', title: '', date: '2026-11-22', status: 'active', items: [], costs: [], payments: [], discount: {} }); A.openJob('j1'); },
  LowCurrent: () => { const A = window.LowApp; A.db.customers.push({ id: 'c1', name: 'عميل تجربة', phone: '010' }); A.db.jobs.push({ id: 'j1', number: 'LC-0001', customerId: 'c1', title: '', date: '2026-11-22', status: 'active', items: [], costs: [], payments: [], discount: {} }); A.openJob('j1'); },
  Aluminium: () => { const A = window.AluApp; A.db.customers.push({ id: 'c1', name: 'عميل تجربة', phone: '010' }); A.db.jobs.push({ id: 'j1', number: 'ALU-0001', customerId: 'c1', title: '', date: '2026-11-22', status: 'active', items: [], costs: [], payments: [], discount: {} }); A.openJob('j1'); },
  Marble: () => { const A = window.MarbleApp; A.db.customers.push({ id: 'c1', name: 'عميل تجربة', phone: '010' }); A.db.jobs.push({ id: 'j1', number: 'MRB-0001', customerId: 'c1', title: '', date: '2026-11-22', status: 'active', items: [], costs: [], payments: [], discount: {} }); A.openJob('j1'); },
  Automotive: () => { const A = window.AutoApp; A.db.customers.push({ id: 'c1', name: 'عميل تجربة', phone: '010' }); A.db.vehicles.push({ id: 'v1', customerId: 'c1', cls: 'car', make: 'تويوتا', model: 'كورولا', plate: 'أ ب ج 123' }); A.db.jobs.push({ id: 'j1', number: 'WO-0001', customerId: 'c1', vehicleId: 'v1', date: '2026-11-25', status: 'repair', labor: [], parts: [], outside: [], costs: [], payments: [], findings: [], recs: [], checkin: {}, next: {}, discount: {} }); A.openJob('j1'); },
};
(async () => {
  const b = await chromium.launch();
  console.log('\n[1] كارت النوتة في صفحة العميل في كل قسم');
  for (const [sec, fn] of Object.entries(OPEN)) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(`${BASE}Trade-Modules/${sec}/`); await p.waitForTimeout(1300);
    await p.evaluate(fn); await p.waitForTimeout(900);
    const n = await p.evaluate(() => [...document.querySelectorAll('[data-az-crew] .azc-card')].filter(e => e.offsetParent).length);
    check(`${sec}: الكارت ظاهر في صفحة العميل ومفيش أخطاء`, n === 1 && !errs.length, { n, errs });
    await ctx.close();
  }

  console.log('\n[2] يوميات ودفعات ومصروفات وصافي الربح (السباكة)');
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => { errs.push('dialog: ' + d.message()); d.accept(); });
  await p.goto(`${BASE}Trade-Modules/Plumbing/`); await p.waitForTimeout(1200);
  await p.evaluate(() => {
    DB.customers.push(NORMALIZERS.customers({ id: 'c1', name: 'م. خالد سمير' })); saveCol('customers');
    DB.docs.push(NORMALIZERS.docs({ id: 'd1', docType: 'invoice', number: 'INV-1', customerId: 'c1', clientName: 'م. خالد سمير', lines: [{ name: 'نقطة حوض', method: 'point', kind: 'service', qty: 20, price: 300 }] })); saveCol('docs');
    openPage('customer', 'c1');
  });
  await p.waitForTimeout(800);
  check('قيمة الشغلانة جاية من فواتير العميل (6,000)', (await p.locator('[data-az-crew]:visible').first().getAttribute('data-rev')) === '6000');
  await p.locator('[data-az-crew-open]:visible').first().click(); await p.waitForTimeout(400);
  check('النوتة اتفتحت', await p.isVisible('.azc-ov.on'));
  await p.click('.azc-actions [data-act="day"]'); await p.waitForTimeout(250);
  await p.fill('[data-nw-name]', 'أسطى محمود'); await p.fill('[data-nw-wage]', '500'); await p.fill('[data-days]', '2');
  await p.click('.azc-sheet [data-ss]'); await p.waitForTimeout(250);
  await p.click('.azc-actions [data-act="day"]'); await p.waitForTimeout(250);
  await p.click('.azc-new summary'); await p.fill('[data-nw-name]', 'كريم'); await p.click('[data-role] [data-r="helper"]'); await p.fill('[data-nw-wage]', '250');
  await p.click('[data-workers] .azc-chip'); await p.click('[data-dq] [data-q="1"]');
  await p.click('.azc-sheet [data-ss]'); await p.waitForTimeout(250);
  let st = await p.evaluate(() => ArzoqiCrew.stats('plumbing:c1', 6000));
  check('يومية لعاملين في نفس المرة: الأجور 2×500 + 500 + 250 = 1,750', st.wages === 1750 && st.days === 4, st);
  await p.click('.azc-actions [data-act="pay"]'); await p.waitForTimeout(250);
  await p.click('[data-rest]'); await p.click('.azc-sheet [data-ss]'); await p.waitForTimeout(250);
  await p.click('.azc-actions [data-act="exp"]'); await p.waitForTimeout(250);
  await p.fill('.azc-sheet [data-amt]', '150'); await p.click('.azc-sheet [data-ss]'); await p.waitForTimeout(300);
  st = await p.evaluate(() => ArzoqiCrew.stats('plumbing:c1', 6000));
  check('دفع «الباقي كله» لمحمود: كريم بس اللي ليه (250)', st.owed === 250 && st.paidOut === 1500, st);
  check('صافي الربح = 6,000 − 1,750 − 150 = 4,100', st.profit === 4100, st);
  check('شارة «ليه 250» و«خالص» ظاهرين', (await p.textContent('.azc-body')).includes('ليه 250') && (await p.textContent('.azc-body')).includes('خالص'));
  await p.click('.azc-hero [data-act="value"]'); await p.waitForTimeout(250);
  await p.fill('.azc-sheet [data-v]', '7000'); await p.click('.azc-sheet [data-ss]'); await p.waitForTimeout(250);
  st = await p.evaluate(() => ArzoqiCrew.stats('plumbing:c1', 6000));
  check('قيمة الشغلانة يدوي (7,000) ← الربح 5,100', st.value === 7000 && st.profit === 5100 && st.valueManual, st);
  const html = await p.evaluate(() => ArzoqiCrew.sheetHTML({ job: 'plumbing:c1', sec: 'السباكة', name: 'م. خالد سمير', rev: 6000, cur: 'ج.م' }));
  check('كشف اليوميات بشكل فواتير أرزقي وفيه الفوتر', html.includes('az-inv') && html.includes('كشف يوميات العمال') && html.includes('arzoqi-wordmark-light.png') && html.includes('5,100'));
  await p.click('.azc-bar [data-act="close"]'); await p.waitForTimeout(400);
  check('الكارت اتحدّث بعد القفل (صافي ربحك 5,100)', (await p.locator('[data-az-crew]:visible').first().textContent()).includes('5,100'));
  const saved = await p.evaluate(() => JSON.parse(localStorage.getItem('arzaqi_crew_v1')));
  check('البيانات متخزنة تحت arzaqi_ (بتدخل في النسخة الاحتياطية)', saved && saved.workers.length === 2 && saved.entries.length === 3 && saved.pays.length === 1 && saved.exps.length === 1);
  // العامل مشترك: نفس محمود في قسم تاني
  await p.goto(`${BASE}Trade-Modules/HVAC/`); await p.waitForTimeout(1200);
  const shared = await p.evaluate(() => JSON.parse(localStorage.getItem('arzaqi_crew_v1')).workers.map(w => w.name));
  check('العمال نفسهم متاحين في قسم التكييف', shared.includes('أسطى محمود') && shared.includes('كريم'), shared);
  check('مفيش أخطاء JavaScript', !errs.length, errs);
  await ctx.close();
  await b.close();
  console.log(`\nالنتيجة: ${ok} نجح · ${bad} فشل`);
  process.exit(bad ? 1 : 0);
})();
