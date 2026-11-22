// أرزقي | Arzoqi — النجارة: اختبارات محرك الحسابات.   node --test tests/calc.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../js/calc.js');

/* ---------- أمثلة المواصفات ---------- */
test('اختبار 1 — دولاب: عرض 3 متر × 1,500 للمتر = 4,500', () => {
  const r = C.item({ method: 'lm', w: 3, dimUnit: 'm', qty: 1, price: 1500 });
  assert.equal(r.qty, 3); assert.equal(r.total, 4500);
  assert.equal(C.item({ method: 'lm', w: 300, dimUnit: 'cm', price: 1500 }).total, 4500, 'نفس النتيجة بالسنتيمتر');
  assert.equal(C.item({ method: 'lm', w: 3000, dimUnit: 'mm', price: 1500 }).total, 4500, 'نفس النتيجة بالمليمتر');
});
test('اختبار 2 — 3 أبواب × 1,200 = 3,600', () => {
  assert.equal(C.item({ method: 'piece', qty: 3, price: 1200 }).total, 3600);
});
test('اختبار 3 — مطبخ بالمتر: أرضي 4 × 1,000 + علوي 3 × 800 = 6,400', () => {
  const r = C.item({ method: 'zones', zones: { unit: 'm', base: 4, basePrice: 1000, wall: 3, wallPrice: 800 } });
  assert.equal(r.zones[0].total, 4000); assert.equal(r.zones[1].total, 2400); assert.equal(r.total, 6400);
});
test('اختبار 4 — 5 ترابيزات × 700 = 3,500', () => {
  assert.equal(C.item({ method: 'piece', qty: 5, price: 700 }).total, 3500);
});
test('اختبار 5 — 10 ألواح × 500 = 5,000 خامات', () => {
  const j = C.job({ costs: [{ type: 'mat', name: 'MDF 18', qty: 10, unit: 'لوح', price: 500 }] });
  assert.equal(j.byType.mat, 5000); assert.equal(j.totalCost, 5000);
});
test('اختبار 6 — هالك 5% من خامات 5,000 = 250 (على الخامة أو كنسبة عامة)', () => {
  const a = C.job({ costs: [{ type: 'mat', qty: 10, price: 500, wastePct: 5 }] });
  assert.equal(a.costs[0].wasteCost, 250); assert.equal(a.byType.waste, 250); assert.equal(a.byType.mat, 5000); assert.equal(a.totalCost, 5250);
  const b = C.job({ costs: [{ type: 'mat', qty: 10, price: 500 }, { type: 'waste', mode: 'pct', pct: 5 }] });
  assert.equal(b.byType.waste, 250); assert.equal(b.totalCost, 5250);
  const none = C.job({ costs: [{ type: 'mat', qty: 10, price: 500 }] });
  assert.equal(none.byType.waste, 0, 'مفيش هالك تلقائي من غير ما النجار يكتبه');
});
// المواصفات: خامات 8,000 + إكسسوارات 1,500 + نقل وتركيب 1,000 = تكلفة 10,500، والسعر 15,000 → ربح 4,500.
// (مصنعية النجار 5,000 جزء من سعره للعميل مش تكلفة عليه — 8,000 + 1,500 + 5,000 + 1,000 = 15,500 مش 10,500.)
// العمالة اللي بيدفعها لغيره (type: labor) بتفضل تكلفة.
test('اختبار 7 — مشروع: تكلفة 10,500 وسعر 15,000 → ربح 4,500 (30%)', () => {
  const j = C.job({
    items: [{ method: 'lump', amount: 15000 }],
    costs: [{ type: 'mat', qty: 1, price: 8000 }, { type: 'acc', qty: 1, price: 1500 }, { type: 'transport', qty: 1, price: 1000 }]
  });
  assert.equal(j.total, 15000); assert.equal(j.totalCost, 10500); assert.equal(j.profit, 4500); assert.equal(j.margin, 30);
  assert.equal(j.complete, false, 'الربح تقديري لحد ما النجار يقول إنه سجل كل التكاليف');
  const withWorkers = C.job({ items: [{ method: 'lump', amount: 15000 }], costs: [{ type: 'mat', qty: 1, price: 8000 }, { type: 'labor', qty: 2, price: 500 }] });
  assert.equal(withWorkers.totalCost, 9000, 'يوميات العمال تكلفة');
});

/* ---------- طرق الحساب ---------- */
test('بالمتر المربع: باب 210 × 90 سم × 2 × 1,000', () => {
  const r = C.item({ method: 'sqm', w: 90, h: 210, dimUnit: 'cm', qty: 2, price: 1000 });
  assert.equal(r.areaEach, 1.89); assert.equal(r.qty, 3.78); assert.equal(r.total, 3780);
});
test('باللوح', () => { assert.equal(C.item({ method: 'board', boards: 6, price: 350 }).total, 2100); });
test('دولاب بالأجزاء: وحدات + ضلف + أدراج + أرفف', () => {
  const r = C.item({ method: 'parts', parts: { units: 3, unitsPrice: 800, doors: 6, doorsPrice: 250, drawers: 4, drawersPrice: 300, shelves: 8, shelvesPrice: 50 } });
  assert.equal(r.total, 3 * 800 + 6 * 250 + 4 * 300 + 8 * 50);
});
test('غرفة نوم قطعة قطعة: سرير + دولاب + 2 كومود + تسريحة + وحدة', () => {
  const r = C.item({ method: 'list', rows: [{ name: 'سرير', qty: 1, price: 3000 }, { name: 'دولاب', qty: 1, price: 6000 }, { name: 'كومود', qty: 2, price: 800 }, { name: 'تسريحة', qty: 1, price: 1500 }, { name: 'وحدة', price: 1200 }] });
  assert.equal(r.rows.length, 5); assert.equal(r.rows[4].qty, 1); assert.equal(r.total, 3000 + 6000 + 1600 + 1500 + 1200);
});
test('مقطوعية + تركيب + إضافات', () => {
  const r = C.item({ method: 'lump', amount: 20000, install: 1500, extras: [{ name: 'نقل', amount: 500 }, { name: 'فك القديم', amount: '300' }] });
  assert.equal(r.labor, 20000); assert.equal(r.install, 1500); assert.equal(r.extrasTotal, 800); assert.equal(r.total, 22300);
});
test('اليومية: لكل عامل أو للفريق', () => {
  assert.equal(C.item({ method: 'daily', days: 3, workers: 2, price: 400 }).total, 2400);
  assert.equal(C.item({ method: 'daily', days: 3, workers: 2, price: 900, perWorker: false }).total, 2700);
});
test('CNC بالساعة + تصميم وتجهيز ملف', () => {
  assert.equal(C.item({ method: 'hour', hours: 2.5, price: 300, extras: [{ name: 'تصميم', amount: 400 }, { name: 'تجهيز ملف', amount: 100 }] }).total, 1250);
});

/* ---------- الفاتورة والتكاليف والربح ---------- */
test('خامات وإكسسوارات على العميل بتدخل الفاتورة، والباقي تكلفة بس', () => {
  const j = C.job({
    items: [{ method: 'piece', qty: 1, price: 5000 }],
    costs: [{ type: 'mat', qty: 4, price: 500, billed: true }, { type: 'acc', qty: 10, price: 30, billed: true }, { type: 'cons', qty: 1, price: 200 }]
  });
  assert.equal(j.billed, 2300); assert.equal(j.billedByType.mat, 2000); assert.equal(j.billedByType.acc, 300);
  assert.equal(j.total, 7300); assert.equal(j.totalCost, 2500); assert.equal(j.profit, 4800);
});
test('الخصم والمدفوع والمتبقي', () => {
  const base = { items: [{ method: 'piece', qty: 2, price: 1000 }], payments: [{ amount: 500 }, { amount: '300' }] };
  const a = C.job({ ...base, discount: { type: 'amount', value: 200 } });
  assert.equal(a.total, 1800); assert.equal(a.remaining, 1000);
  assert.equal(C.job({ ...base, discount: { type: 'percent', value: 10 } }).total, 1800);
  assert.equal(C.job({ ...base, discount: { type: 'amount', value: 99999 } }).total, 0);
});
test('هامش الربح من غير قسمة على صفر', () => {
  const j = C.job({ costs: [{ type: 'mat', qty: 1, price: 100 }] });
  assert.equal(j.total, 0); assert.equal(j.margin, 0); assert.equal(j.profit, -100);
});

/* ---------- الخشب الطبيعي ---------- */
test('الخشب الطبيعي: الحجم = ط × ع × س ÷ 1,000,000 × العدد × سعر المتر المكعب', () => {
  const r = C.woodRow({ L: 400, W: 10, T: 5, count: 20, unit: 'm3', price: 30000 });
  assert.equal(r.volEach, 0.02); assert.equal(r.vol, 0.4); assert.equal(r.cost, 12000);
});
test('الخشب الطبيعي: بالقدم المكعب وبالقطعة وبالمتر الطولي وقطع مختلفة', () => {
  const w = C.wood([
    { L: 400, W: 10, T: 5, count: 20, unit: 'm3', price: 30000 },
    { L: 300, W: 5, T: 5, count: 10, unit: 'piece', price: 90 },
    { L: 250, W: 4, T: 2, count: 8, unit: 'lm', price: 25 },
    { L: 100, W: 100, T: 2.832, count: 1, unit: 'ft3', price: 1000 }
  ]);
  assert.equal(w.rows[1].cost, 900); assert.equal(w.rows[2].cost, 500);
  assert.ok(Math.abs(w.rows[3].qty - 1) < 0.001); assert.ok(Math.abs(w.rows[3].cost - 1000) < 1);
  assert.equal(w.pieces, 39);
});

/* ---------- تقطيع الألواح ---------- */
const MDF = { id: 'b1', name: 'MDF 18', L: 2440, W: 1220, price: 900, grain: false };
function overlaps(a, b) { return a.x < b.x + b.l && b.x < a.x + a.l && a.y < b.y + b.w && b.y < a.y + a.w; }
function checkLayout(res, b, kerf, trim) {
  for (const s of res.sheets) {
    for (const p of s.placed) {
      assert.ok(p.x >= trim - 1e-6 && p.y >= trim - 1e-6, 'جوه هامش التهذيب');
      assert.ok(p.x + p.l <= b.L - trim + 1e-6 && p.y + p.w <= b.W - trim + 1e-6, 'جوه اللوح');
    }
    for (let i = 0; i < s.placed.length; i++) for (let k = i + 1; k < s.placed.length; k++) {
      const a = s.placed[i], c = s.placed[k];
      // مع سلاح المنشار: لازم يفضل بينهم kerf
      assert.ok(!overlaps({ x: a.x, y: a.y, l: a.l + kerf - 1e-6, w: a.w + kerf - 1e-6 }, c), 'القطع ما بتتداخلش ومعاها سلاح المنشار');
    }
  }
}
test('التقطيع: 4 قطع 1220 × 600 = لوح واحد بالظبط من غير سلاح منشار', () => {
  const r = C.nest([MDF], [{ name: 'جنب', L: 1220, W: 610, count: 4, boardId: 'b1' }], { kerf: 0, trim: 0 }).boards[0];
  assert.equal(r.count, 1); assert.equal(r.wastePct, 0);
});
test('التقطيع: سلاح المنشار ممكن يزوّد لوح (نفس القطع مع 4 مم)', () => {
  const r = C.nest([MDF], [{ name: 'جنب', L: 1220, W: 610, count: 4, boardId: 'b1' }], { kerf: 4, trim: 0 }).boards[0];
  assert.equal(r.count, 2);
});
test('التقطيع: دولاب كامل — كل القطع جوه اللوح ومن غير تداخل، وعدد الألواح ≥ الحد النظري', () => {
  const parts = [
    { name: 'جنب', L: 2200, W: 580, count: 4, boardId: 'b1' }, { name: 'سقف/قاعدة', L: 1180, W: 580, count: 4, boardId: 'b1' },
    { name: 'رف', L: 1144, W: 560, count: 8, boardId: 'b1' }, { name: 'ضلفة', L: 2190, W: 445, count: 6, boardId: 'b1' },
    { name: 'وش درج', L: 560, W: 180, count: 6, boardId: 'b1' }
  ];
  const kerf = 4, trim = 10;
  const res = C.nest([MDF], parts, { kerf, trim });
  const b = res.boards[0];
  assert.equal(b.partsCount, 28);
  assert.ok(b.count >= b.minSheets && b.count <= b.minSheets + 3, JSON.stringify({ count: b.count, min: b.minSheets }));
  checkLayout(b, MDF, kerf, trim);
  assert.equal(b.cost, b.count * 900);
  assert.ok(b.wastePct > 0 && b.wastePct < 50);
});
test('التقطيع: اتجاه العروق بيمنع لف القطعة', () => {
  const B = { id: 'w', name: 'قشرة', L: 2440, W: 1220, price: 1, grain: true };
  // قطعة 1000 طول × 2000 عرض: من غير لف ما تدخلش (العرض 1220)
  const locked = C.nest([B], [{ name: 'ضلفة', L: 1000, W: 2000, count: 1, boardId: 'w', grain: true }], {});
  assert.equal(locked.tooBig.length, 1);
  const free = C.nest([B], [{ name: 'ضلفة', L: 1000, W: 2000, count: 1, boardId: 'w', grain: false }], {});
  assert.equal(free.boards[0].count, 1); assert.equal(free.boards[0].sheets[0].placed[0].rot, true);
});
test('التقطيع: قطعة أكبر من اللوح بتتعلّم ومش بتتحسب', () => {
  const r = C.nest([MDF], [{ name: 'كبيرة', L: 3000, W: 1300, count: 1, boardId: 'b1' }], {});
  assert.equal(r.tooBig.length, 1); assert.equal(r.boards[0].count, 0);
});
test('التقطيع: أكتر من نوع لوح والكمية المتاحة', () => {
  const r = C.nest([{ ...MDF, qty: 1 }, { id: 'b2', name: 'HDF 3', L: 2440, W: 1220, price: 200 }],
    [{ name: 'جنب', L: 2200, W: 580, count: 6, boardId: 'b1' }, { name: 'ظهر', L: 2200, W: 1180, count: 2, boardId: 'b2' }], { kerf: 4, trim: 10 });
  assert.equal(r.boards.length, 2);
  assert.ok(r.boards[0].short >= 1, 'نقص في الألواح المتاحة');
  assert.equal(r.boards[1].count, 2);
  assert.equal(r.cost, r.boards[0].count * 900 + 400);
});

/* ---------- الأمان ---------- */
test('مفيش NaN ولا Infinity ولا سالب في أي طريقة حساب', () => {
  for (const method of C.METHOD_ORDER.concat(['غلط'])) {
    const r = C.item({ method, qty: 'x', w: -1, h: 'NaN', price: Infinity, boards: null, amount: {}, days: '', hours: 'abc', rows: [{ qty: 'q', price: -3 }], parts: {}, zones: {} });
    assert.ok(Number.isFinite(r.total) && r.total >= 0, method);
  }
  const j = C.job({ items: [{}], costs: [{ type: 'غلط', qty: 'x' }, { type: 'waste', mode: 'pct', pct: 'NaN' }], discount: { type: 'percent', value: 'x' }, payments: [{ amount: 'y' }] });
  for (const k of ['labor', 'subtotal', 'total', 'paid', 'remaining', 'totalCost', 'profit', 'margin']) assert.ok(Number.isFinite(j[k]), k);
  assert.equal(C.num('2,000'), 2000); assert.equal(C.num('٢٫٥'), 2.5); assert.equal(C.num('-5'), 0);
});
