// أرزقي | Arzoqi — الحدادة: اختبارات محرك الحسابات.   node --test tests/calc.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../js/calc.js');

test('بوابة ليزر: 2م × 3م × 500 = مساحة 6 م² والإجمالي 3,000', () => {
  const r = C.item({ kind: 'laser', h: 2, w: 3, count: 1, price: 500 });
  assert.equal(r.area, 6);
  assert.equal(r.total, 3000);
});

test('بوابة ليزر بالسنتيمتر: 200سم × 300سم = نفس النتيجة', () => {
  const r = C.item({ kind: 'laser', h: '200', w: '300', dimUnit: 'cm', count: 1, price: 500 });
  assert.equal(r.area, 6);
  assert.equal(r.total, 3000);
});

test('بوابة ليزر: العدد بيتضرب في المساحة', () => {
  const r = C.item({ kind: 'laser', h: 2.2, w: 3.5, count: 2, price: 450 });
  assert.equal(r.areaEach, 7.7);
  assert.equal(r.area, 15.4);
  assert.equal(r.total, 6930);
});

test('بوابة مشغولة يدوي: 120 كجم × 35 = 4,200', () => {
  const r = C.item({ kind: 'hand', weight: 120, count: 1, price: 35 });
  assert.equal(r.weight, 120);
  assert.equal(r.total, 4200);
});

test('بوابة مشغولة: إجمالي الوزن = وزن البوابة × العدد', () => {
  const r = C.item({ kind: 'hand', weight: 85.5, count: 2, price: 40 });
  assert.equal(r.weight, 171);
  assert.equal(r.total, 6840);
});

test('باب صاج: 2م × 1م × 2 × 300 = 1,200', () => {
  const r = C.item({ kind: 'door', h: 2, w: 1, count: 2, price: 300 });
  assert.equal(r.areaEach, 2);
  assert.equal(r.area, 4);
  assert.equal(r.total, 1200);
});

test('سقف صاج: الطول × العرض × عدد المساحات × سعر المتر', () => {
  const r = C.item({ kind: 'roof', h: 6, w: 4.5, count: 2, price: 120 });
  assert.equal(r.area, 54);
  assert.equal(r.total, 6480);
});

test('كرسي حديد: 5 × 250 = 1,250', () => {
  const r = C.item({ kind: 'piece', name: 'كرسي حديد', count: 5, price: 250 });
  assert.equal(r.qty, 5);
  assert.equal(r.total, 1250);
});

test('مقطوعية: تصنيع وتعديل معدة زراعية = 3,500', () => {
  const r = C.item({ kind: 'lump', tasks: [{ desc: 'تصنيع وتعديل معدة زراعية', amount: 3500 }] });
  assert.equal(r.total, 3500);
});

test('مقطوعية بأكتر من مهمة: الإجمالي مجموع المهام', () => {
  const r = C.item({ kind: 'lump', tasks: [{ desc: 'لحام الشاسيه', amount: 1500 }, { desc: 'تغيير السكاكين', amount: '2,000' }, { desc: 'دهان' }] });
  assert.equal(r.total, 3500);
  assert.equal(r.tasks.length, 3);
});

test('أرقام عربية وفاصلة عشرية', () => {
  assert.equal(C.num('١٢٠'), 120);
  assert.equal(C.num('٢٫٥'), 2.5);
  assert.equal(C.num('2,5'), 2.5);
  const r = C.item({ kind: 'laser', h: '٢', w: '٣', price: '٥٠٠' });
  assert.equal(r.total, 3000);
});

test('مفيش NaN ولا Infinity ولا قيم سالبة', () => {
  for (const bad of ['', 'abc', null, undefined, NaN, Infinity, -5, '-5', {}]) {
    const n = C.num(bad);
    assert.ok(Number.isFinite(n) && n >= 0, String(bad));
  }
  const kinds = ['laser', 'hand', 'door', 'roof', 'piece', 'lump', 'غلط'];
  for (const kind of kinds) {
    const r = C.item({ kind, h: 'x', w: -2, weight: 'NaN', count: '', price: Infinity, tasks: [{ amount: 'abc' }] });
    assert.ok(Number.isFinite(r.total) && r.total >= 0, kind);
  }
  const j = C.job({ items: [{ kind: 'laser' }], consumables: [{}], materials: [{}], discount: { type: 'percent', value: 'x' }, payments: [{ amount: 'y' }] });
  for (const k of ['labor', 'subtotal', 'discount', 'total', 'paid', 'remaining', 'costs', 'profit']) assert.ok(Number.isFinite(j[k]), k);
});

test('العدد الفاضي = 1، والصفر = صفر', () => {
  assert.equal(C.item({ kind: 'piece', count: '', price: 100 }).total, 100);
  assert.equal(C.item({ kind: 'piece', count: 0, price: 100 }).total, 0);
});

test('دقة الكسور: 0.1 + 0.2', () => {
  const j = C.job({ items: [{ kind: 'piece', count: 1, price: 0.1 }, { kind: 'piece', count: 1, price: 0.2 }] });
  assert.equal(j.labor, 0.3);
});

test('حساب عميل فيه كل أنواع الأعمال مع بعض', () => {
  const j = C.job({
    items: [
      { kind: 'laser', h: 2, w: 3, count: 1, price: 500 },       // 3000 (6 م²)
      { kind: 'door', h: 2, w: 1, count: 1, price: 300 },        // 600 (2 م²)
      { kind: 'piece', name: 'كرسي حديد', count: 4, price: 250 },  // 1000
      { kind: 'lump', tasks: [{ desc: 'إصلاح معدة زراعية', amount: 3500 }] }, // 3500
      { kind: 'hand', weight: 120, count: 1, price: 35 },        // 4200
      { kind: 'roof', h: 5, w: 4, count: 1, price: 100 }         // 2000
    ],
    consumables: [
      { name: 'سلك لحام', qty: 2, unit: 'كيلو', price: 90 },     // 180
      { name: 'قرص قطع', qty: 3, unit: 'قطعة', price: 25 },      // 75
      { name: 'هالك حديد', qty: 4, unit: 'كيلو' }                // من غير سعر
    ]
  });
  assert.equal(j.labor, 14300);
  assert.equal(j.byKind.laser.qty, 6);
  assert.equal(j.byKind.door.qty, 2);
  assert.equal(j.byKind.piece.qty, 4);
  assert.equal(j.byKind.hand.qty, 120);
  assert.equal(j.consCost, 255);
  assert.equal(j.consUnpriced, 1);
  assert.equal(j.total, 14300, 'المستهلكات مش على العميل إلا لو اخترت');
  assert.equal(j.costs, 255);
  assert.equal(j.profit, 14045);
});

test('تكاليف التشغيل على فاتورة العميل لو اخترت كده', () => {
  const j = C.job({ items: [{ kind: 'piece', count: 1, price: 1000 }], consumables: [{ qty: 2, price: 50 }], billConsumables: true });
  assert.equal(j.consBilled, 100);
  assert.equal(j.total, 1100);
  assert.equal(j.profit, 1000);
});

test('الخامات: على العميل بتدخل الفاتورة، وعلى حسابي تكلفة بس', () => {
  const j = C.job({
    items: [{ kind: 'piece', count: 1, price: 1000 }],
    materials: [{ name: 'صاج', qty: 2, price: 400, billed: true }, { name: 'زوايا', qty: 1, price: 150, billed: false }]
  });
  assert.equal(j.matBilled, 800);
  assert.equal(j.matCost, 950);
  assert.equal(j.total, 1800);
  assert.equal(j.profit, 850);
});

test('الخصم بمبلغ وبنسبة، والمدفوع والمتبقي', () => {
  const base = { items: [{ kind: 'piece', count: 2, price: 1000 }], payments: [{ amount: 500 }, { amount: '300' }] };
  const a = C.job({ ...base, discount: { type: 'amount', value: 200 } });
  assert.equal(a.discount, 200); assert.equal(a.total, 1800); assert.equal(a.paid, 800); assert.equal(a.remaining, 1000);
  const p = C.job({ ...base, discount: { type: 'percent', value: 10 } });
  assert.equal(p.discount, 200); assert.equal(p.total, 1800);
  const big = C.job({ ...base, discount: { type: 'amount', value: 99999 } });
  assert.equal(big.total, 0, 'الخصم ما يعديش الإجمالي');
  const over = C.job({ ...base, discount: { type: 'percent', value: 250 } });
  assert.equal(over.total, 0, 'النسبة أقصاها 100%');
});

test('مستهلك من غير سعر: بيتسجل ومبيعطلش الحساب', () => {
  const c = C.consumable({ name: 'أقطاب لحام', qty: 10 });
  assert.equal(c.qty, 10); assert.equal(c.priced, false); assert.equal(c.total, 0);
});
