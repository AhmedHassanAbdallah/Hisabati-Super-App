/*
 * أرزقي | Arzoqi — ميكانيكا السيارات والموتوسيكلات والتروسيكلات: اختبارات الحسابات (node --test tests/calc.test.js)
 * أمر الشغل (مصنعية بالساعة ومبلغ، قطع من المخزن/اتشرت/من العميل، أعمال خارجية، مصاريف، خصم، ضريبة، دفعات، ربح)، المخزن،
 * الموردين، لوحة الورشة، التذكيرات، والحاسبات المستقلة — كل رقم متحسب باليد جنبه.
 */
const test = require('node:test');
const assert = require('node:assert');
const C = require('../js/calc.js');
const K = require('../js/catalog.js');
const close = (a, b, e = 0.01) => Math.abs(a - b) <= e;

test('الأرقام: عربي وفواصل', () => {
  assert.strictEqual(C.num('١٬٢٥٠٫٥'), 1250.5);
  assert.strictEqual(C.num('2,500'), 2500);
  assert.strictEqual(C.num(''), 0);
  assert.strictEqual(C.num('abc'), 0);
});

const JOB = {
  id: 'j1', status: 'repair',
  labor: [{ name: 'تغيير زيت', mode: 'hours', hours: 0.5 }, { name: 'تيل فرامل', mode: 'hours', hours: 1, rate: 300 }, { name: 'فحص كمبيوتر', mode: 'fixed', amount: 250 }],
  parts: [
    { partId: 'p1', name: 'زيت 5W30', qty: 4, cost: 180, price: 220, source: 'stock' },
    { name: 'فلتر زيت', qty: 1, cost: 90, price: 130, source: 'bought' },
    { name: 'تيل (من العميل)', qty: 1, cost: 400, price: 600, source: 'customer' }
  ],
  outside: [{ name: 'خرط طنابير', vendor: 'خراطة', cost: 150, price: 200 }],
  costs: [{ name: 'ونش', amount: 300, billed: true }, { name: 'شحم ومنظفات', amount: 40, billed: false }],
  discount: { type: 'amount', value: 100 }, taxPct: 14,
  payments: [{ amount: 1000, date: '2026-11-25' }]
};
test('أمر الشغل: الحساب كامل', () => {
  const r = C.job(JOB, { laborRate: 200, wlog: [{ jobId: 'j1', amount: 150 }, { jobId: 'other', amount: 999 }] });
  // مصنعية: 0.5×200 = 100 + 1×300 = 300 + 250 = 650
  assert.strictEqual(r.laborTotal, 650);
  assert.strictEqual(r.hours, 1.5);
  // قطع: 4×220 = 880 + 130 = 1010 (اللي من العميل صفر) ؛ التكلفة 4×180 = 720 + 90 = 810
  assert.strictEqual(r.partsSell, 1010); assert.strictEqual(r.partsCost, 810);
  assert.strictEqual(r.outsideSell, 200); assert.strictEqual(r.outsideCost, 150);
  assert.strictEqual(r.billedCosts, 300); assert.strictEqual(r.internalCosts, 40);
  // الإجمالي قبل الخصم: 650 + 1010 + 200 + 300 = 2160 ؛ − 100 = 2060 ؛ ضريبة 14% = 288.4 ؛ الإجمالي 2348.4
  assert.strictEqual(r.subtotal, 2160); assert.strictEqual(r.discount, 100);
  assert.strictEqual(r.tax, 288.4); assert.strictEqual(r.total, 2348.4);
  assert.strictEqual(r.paid, 1000); assert.strictEqual(r.remaining, 1348.4);
  // التكلفة: قطع 810 + خارجي 150 + مصاريف 340 + عمال 150 = 1450 ؛ الربح = (2348.4 − 288.4) − 1450 = 610
  assert.strictEqual(r.workers, 150); assert.strictEqual(r.totalCost, 1450); assert.strictEqual(r.profit, 610);
  assert.ok(close(r.margin, 29.6, 0.05));
});
test('أمر الشغل: خصم بالنسبة ومن غير ضريبة، والخصم مش أكبر من الإجمالي', () => {
  const r = C.job({ labor: [{ mode: 'fixed', amount: 1000 }], discount: { type: 'percent', value: 10 } }, {});
  assert.strictEqual(r.discount, 100); assert.strictEqual(r.total, 900); assert.strictEqual(r.tax, 0);
  const r2 = C.job({ labor: [{ mode: 'fixed', amount: 100 }], discount: { type: 'amount', value: 500 } }, {});
  assert.strictEqual(r2.discount, 100); assert.strictEqual(r2.total, 0);
  const e = C.job({}, {}); assert.strictEqual(e.total, 0); assert.strictEqual(e.margin, 0);
});
test('عمولة الفني بنسبة من المصنعية بتدخل في التكلفة', () => {
  const j = { id: 'w', labor: [{ mode: 'fixed', amount: 1000, tech: 't1' }, { mode: 'fixed', amount: 500, tech: 't2' }, { mode: 'fixed', amount: 300 }] };
  const r = C.job(j, { techPct: { t1: 30 } }); // 30% من 1000 = 300 ؛ الفني التاني من غير نسبة
  assert.strictEqual(r.commission, 300); assert.strictEqual(r.totalCost, 300); assert.strictEqual(r.profit, 1500);
});
test('حالات أمر الشغل', () => {
  assert.ok(C.isOpen({ status: 'repair' })); assert.ok(!C.isOpen({ status: 'delivered' })); assert.ok(!C.isOpen({ status: 'cancelled' }));
  assert.ok(C.isQuote({ status: 'approval' })); assert.ok(!C.isQuote({ status: 'repair' }));
  assert.strictEqual(K.STATUSES.length, 8);
});

const DB = {
  parts: [{ id: 'p1', name: 'زيت 5W30', open: 10, min: 8, cost: 180 }, { id: 'p2', name: 'فلتر', open: 2, min: 0, cost: 90 }],
  purchases: [{ id: 'u1', supplierId: 's1', lines: [{ partId: 'p1', qty: 12, cost: 175 }, { partId: 'p2', qty: 5, cost: 85 }], extra: 50, discount: 25, paid: 1000, date: '2026-11-20' }],
  moves: [{ partId: 'p2', qty: -1, note: 'تالف' }],
  spay: [{ supplierId: 's1', amount: 500 }],
  suppliers: [{ id: 's1', name: 'مورد' }],
  jobs: [
    { id: 'a', status: 'delivered', deliveredAt: '2026-11-25T10:00', parts: [{ partId: 'p1', qty: 4, cost: 180, price: 220, source: 'stock' }], labor: [{ mode: 'fixed', amount: 500 }], payments: [{ amount: 600, date: '2026-11-25' }] },
    { id: 'b', status: 'cancelled', parts: [{ partId: 'p1', qty: 100, source: 'stock' }] },
    { id: 'c', status: 'parts', parts: [{ partId: 'p1', qty: 2, cost: 180, price: 220, source: 'stock' }], labor: [], payments: [] }
  ],
  expenses: [{ amount: 200, date: '2026-11-25' }, { amount: 300, date: '2026-11-02' }, { amount: 999, date: '2026-10-30' }],
  vehicles: [{ id: 'v1', licenseExp: '2026-12-10' }, { id: 'v2', insuranceExp: '2027-06-01' }]
};
test('المخزن: الافتتاحي + المشتريات ± التسويات − المصروف على أوامر الشغل (الملغي مش محسوب)', () => {
  const s = C.stock(DB);
  // p1: 10 + 12 − (4 + 2) = 16 ؛ القيمة 16 × 180
  assert.strictEqual(s.p1.qty, 16); assert.strictEqual(s.p1.value, 2880); assert.strictEqual(s.p1.low, false);
  // p2: 2 + 5 − 1 = 6
  assert.strictEqual(s.p2.qty, 6); assert.strictEqual(s.p2.low, false);
  const low = C.stock(Object.assign({}, DB, { purchases: [] }));
  assert.strictEqual(low.p1.qty, 4); assert.strictEqual(low.p1.low, true); // 10 − 6 = 4 ≤ 8
});
test('الموردين: إجمالي الشراء − المدفوع', () => {
  // الفاتورة: 12×175 = 2100 + 5×85 = 425 + 50 − 25 = 2550 ؛ المدفوع 1000 + 500 = 1500
  assert.strictEqual(C.purchaseTotal(DB.purchases[0]), 2550);
  assert.deepStrictEqual(C.supplierBalance(DB, 's1'), { bought: 2550, paid: 1500, balance: 1050 });
});
test('لوحة الورشة من البيانات الفعلية', () => {
  const d = C.dashboard(DB, {}, '2026-11-25');
  assert.strictEqual(d.open, 1); // c بس (a اتسلمت، b ملغي)
  assert.strictEqual(d.byStatus.parts, 1);
  assert.strictEqual(d.collectedToday, 600);
  // a: 500 مصنعية + 880 قطع = 1380 ؛ التكلفة 720 ؛ الربح 660
  assert.strictEqual(d.deliveredToday, 1380); assert.strictEqual(d.laborMonth, 500); assert.strictEqual(d.partsMonth, 880); assert.strictEqual(d.profitMonth, 660);
  assert.strictEqual(d.dues, 780); // 1380 − 600
  assert.strictEqual(d.expensesMonth, 500); assert.strictEqual(d.expensesToday, 200); assert.strictEqual(d.netMonth, 160);
  assert.strictEqual(d.suppliersDue, 1050); assert.strictEqual(d.lowStock, 0);
  assert.strictEqual(d.reminders, 1); // الرخصة بعد 15 يوم
});
test('التواريخ والصيانة الجاية والتذكيرات', () => {
  assert.strictEqual(C.addMonths('2026-01-31', 1), '2026-02-28');
  assert.strictEqual(C.addMonths('2026-11-25', 6), '2027-05-25');
  assert.strictEqual(C.daysBetween('2026-11-25', '2026-12-10'), 15);
  assert.deepStrictEqual(C.nextService({ odo: 45000, interval: 5000, date: '2026-11-25', months: 6 }), { km: 50000, date: '2027-05-25' });
  const db = { jobs: [{ id: 'x', vehicleId: 'v9', status: 'delivered', deliveredAt: '2026-05-01', next: { km: 50000, date: '2026-11-20' } },
    { id: 'y', vehicleId: 'v9', status: 'delivered', deliveredAt: '2026-01-01', next: { date: '2026-02-01' } }], vehicles: [] };
  const r = C.reminders(db, '2026-11-25', 30);
  assert.strictEqual(r.length, 1); assert.strictEqual(r[0].jobId, 'x'); assert.strictEqual(r[0].overdue, true); assert.strictEqual(r[0].days, -5);
});
test('الحاسبات: الكاوتش', () => {
  assert.deepStrictEqual(C.parseTire('205/55R16'), { w: 205, ar: 55, rim: 16 });
  assert.deepStrictEqual(C.parseTire('195 / 65 r 15'), { w: 195, ar: 65, rim: 15 });
  assert.strictEqual(C.parseTire('xx'), null);
  const a = C.tire(205, 55, 16); // جنب 112.75 ؛ قطر 406.4 + 225.5 = 631.9
  assert.strictEqual(a.sidewall, 112.8); assert.strictEqual(a.diameter, 631.9); assert.strictEqual(a.circumference, 1985);
  const b = C.tire(215, 55, 17); // جنب 118.25 ؛ قطر 431.8 + 236.5 = 668.3
  assert.strictEqual(b.diameter, 668.3);
  const cmp = C.tireCompare(a, b); // (668.3 − 631.9) ÷ 631.9 = 5.76% ؛ العداد يقول 100 والحقيقي 105.8
  assert.ok(close(cmp.diffPct, 5.76)); assert.ok(close(cmp.at100, 105.8, 0.05));
});
test('الحاسبات: البنزين والسعة والانضغاط والخلط والردياتير', () => {
  assert.deepStrictEqual(C.fuel(400, 32, 15), { l100: 8, kml: 12.5, costKm: 1.2, cost: 480 });
  assert.strictEqual(C.cc(86, 86, 4), 1998.2); // π/4×86²×86×4/1000 = 1998.22
  assert.strictEqual(C.cc(52.4, 57.8, 1), 124.6); // موتوسيكل 125
  assert.strictEqual(C.cr(500, 50), 11);
  assert.strictEqual(C.mix(5, 50), 100); // 5 لتر على 1:50 = 100 مل
  assert.deepStrictEqual(C.coolant(6, 50), { antifreeze: 3, water: 3 });
});
test('الحاسبات: السرعة وأوم والوحدات والتسعير', () => {
  // 3000 لفة ، ترس 1.0 ، دفرنس 4.0 ، قطر 631.9 مم → 750 لفة عجلة/د × 1.9852 م × 60 / 1000 = 89.3 كم/س
  assert.strictEqual(C.speed(3000, 1, 4, 631.9), 89.3);
  assert.deepStrictEqual(C.ohm({ v: 12, r: 4 }), { v: 12, i: 3, r: 4, p: 36 });
  assert.deepStrictEqual(C.ohm({ v: 12, i: 5 }), { v: 12, i: 5, r: 2.4, p: 60 });
  assert.strictEqual(C.ohm({ v: 12 }), null);
  assert.strictEqual(C.convert('psi_bar', 32), 2.2063);
  assert.strictEqual(C.convert('c_f', 90), 194);
  assert.strictEqual(C.convert('nm_lbft', 100), 73.7562);
  assert.deepStrictEqual(C.laborQuote(2.5, 200, 10), { base: 500, total: 550 });
  assert.deepStrictEqual(C.priceFrom(100, 25, 'markup'), { sell: 125, profit: 25, margin: 20, markup: 25 });
  assert.deepStrictEqual(C.priceFrom(100, 20, 'margin'), { sell: 125, profit: 25, margin: 20, markup: 25 });
});
test('أكواد OBD-II', () => {
  const a = C.dtc('p0300', K);
  assert.strictEqual(a.code, 'P0300'); assert.strictEqual(a.generic, true); assert.ok(a.desc.includes('احتراق')); assert.ok(a.sub.includes('الإشعال'));
  const b = C.dtc('P1234', K); assert.strictEqual(b.generic, false); assert.strictEqual(b.desc, '');
  assert.strictEqual(C.dtc('U0100', K).family, K.DTC_FAM.U);
  assert.strictEqual(C.dtc('P0420X', K), null); assert.strictEqual(C.dtc('X0420', K), null);
});
test('الكتالوج: الخدمات والأعراض مربوطة بأنظمة موجودة', () => {
  K.SERVICES.forEach(s => { assert.ok(K.SYSTEMS[s[1]], s[0]); s[3].split(',').forEach(c => assert.ok(K.CLASSES[c], s[0])); });
  K.SYMPTOMS.forEach(s => { assert.ok(K.SYSTEMS[s[1]], s[0]); assert.ok(s[2].length >= 2, s[0]); });
  K.SYSTEM_ORDER.forEach(k => assert.ok(K.SYSTEMS[k], k));
  Object.keys(K.DTC).forEach(k => assert.ok(C.dtc(k, K), k));
  assert.ok(K.TOOLS.length >= 12);
});
