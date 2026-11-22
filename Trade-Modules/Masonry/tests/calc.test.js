// أرزقي | Arzoqi — البناء: اختبارات محرك الحسابات (الاختبارات الإلزامية من المواصفات + حالات الحدود).
//   node --test tests/calc.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../js/calc.js');

const RED = { id: 'red', name: 'طوب أحمر مصمت', L: 25, W: 12, H: 6.5, unit: 'cm', price: 3 };
const BLOCK = { id: 'blk', name: 'بلوك أسمنتي', L: 40, W: 20, H: 20, unit: 'cm', price: 12 };
const close = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;
const wallsItem = (walls, extra = {}) => C.walls({ dimUnit: 'm', jh: 1, jv: 1, walls, ...extra });

test('اختبار 1 — حائط 10 × 3 من غير فتحات = 30 م²', () => {
  const r = wallsItem([{ L: 10, H: 3, brick: RED }]);
  assert.equal(r.walls[0].gross, 30); assert.equal(r.walls[0].net, 30);
});
test('اختبار 2 — خصم باب 1 × 2.1 = 27.9 م²', () => {
  const r = wallsItem([{ L: 10, H: 3, brick: RED, openings: [{ name: 'باب', w: 1, h: 2.1 }] }]);
  assert.equal(r.walls[0].open, 2.1); assert.equal(r.walls[0].net, 27.9);
});
test('اختبار 3 — باب + شباكين 1.2 × 1.2 = فتحات 4.98 والصافي 25.02 م²', () => {
  const r = wallsItem([{ L: 10, H: 3, brick: RED, openings: [{ name: 'باب', w: 1, h: 2.1 }, { name: 'شباك', w: 1.2, h: 1.2, count: 2 }] }]);
  assert.equal(r.walls[0].open, 4.98); assert.equal(r.walls[0].net, 25.02);
});
test('اختبار 4 — طوبة 25 × 12 × 6.5 بعراميس 1 سم: الوش حسب طريقة البناء', () => {
  // نص طوبة: (0.25 + 0.01) × (0.065 + 0.01) = 0.0195 م² → 51.282 طوبة/م²
  const half = C.geom(RED, 'half', 0.01, 0.01);
  assert.ok(close(half.perM2, 1 / (0.26 * 0.075))); assert.ok(close(half.thickness, 0.12));
  // طوبة: (0.12 + 0.01) × 0.075 → 102.56 طوبة/م² والسمك 25 سم
  const one = C.geom(RED, 'one', 0.01, 0.01);
  assert.ok(close(one.perM2, 1 / (0.13 * 0.075))); assert.ok(close(one.thickness, 0.25));
  // طوبة ونص = طوبة + نص طوبة، والسمك 25 + 1 + 12 = 38 سم
  const oh = C.geom(RED, 'oneHalf', 0.01, 0.01);
  assert.ok(close(oh.perM2, half.perM2 + one.perM2)); assert.ok(close(oh.thickness, 0.38));
  // سكينة: الطول × العرض والسمك 6.5 سم
  const edge = C.geom(RED, 'edge', 0.01, 0.01);
  assert.ok(close(edge.perM2, 1 / (0.26 * 0.13))); assert.ok(close(edge.thickness, 0.065));
  // على حائط اختبار 3 (25.02 م²) نص طوبة: 25.02 × 51.282 = 1,283.08 → 1,284 قبل الهالك
  const r = wallsItem([{ L: 10, H: 3, brick: RED, layout: 'half', openings: [{ w: 1, h: 2.1 }, { w: 1.2, h: 1.2, count: 2 }] }]);
  assert.ok(close(r.walls[0].exact, 1283.0769, 1e-3)); assert.equal(r.groups[0].base, 1284); assert.equal(r.groups[0].waste, 0);
});
test('اختبار 5 — 1,000 طوبة + هالك 5% = 50 → 1,050', () => {
  // حائط مساحته بالظبط 1000 طوبة: 19.5 م² نص طوبة
  const r = wallsItem([{ L: 6.5, H: 3, brick: RED }], { waste: { mode: 'pct', pct: 5 } });
  assert.equal(r.groups[0].base, 1000); assert.equal(r.groups[0].waste, 50); assert.equal(r.groups[0].final, 1050);
  const none = wallsItem([{ L: 6.5, H: 3, brick: RED }]);
  assert.equal(none.groups[0].waste, 0, 'مفيش هالك من غير ما المستخدم يختار');
  const manual = wallsItem([{ L: 6.5, H: 3, brick: RED }], { waste: { mode: 'qty', qty: { 'red|half': 30 } } });
  assert.equal(manual.groups[0].final, 1030);
});
test('اختبار 6 — بلوك 40 × 20 وعرموس 1 سم على حائط 8 × 3: 11.61 بلوكة/م² → 279 قبل الفتحات والهالك', () => {
  const r = wallsItem([{ L: 8, H: 3, brick: BLOCK, layout: 'half' }]);
  assert.ok(close(r.walls[0].perM2, 1 / (0.41 * 0.21), 1e-3));
  assert.ok(close(r.walls[0].exact, 24 / (0.41 * 0.21), 1e-3));
  assert.equal(r.groups[0].base, 279); assert.ok(close(r.walls[0].thickness, 0.2));
});
test('اختبار 7 — 3 حوائط ونوعين طوب: التجميع حسب كل نوع', () => {
  const r = wallsItem([
    { name: 'خارجي', L: 10, H: 3, brick: RED, layout: 'one', openings: [{ name: 'باب', w: 1, h: 2.1 }] },
    { name: 'داخلي 1', L: 5, H: 3, brick: BLOCK, openings: [{ name: 'شباك', w: 1.2, h: 1.2 }] },
    { name: 'داخلي 2', L: 4, H: 3, brick: BLOCK }
  ]);
  assert.equal(r.groups.length, 2);
  const red = r.groups.find(g => g.key === 'red|one'), blk = r.groups.find(g => g.key === 'blk|half');
  assert.equal(red.net, 27.9); assert.equal(red.base, Math.ceil(27.9 / (0.13 * 0.075)));
  assert.ok(close(blk.net, 15 - 1.44 + 12)); assert.equal(blk.base, Math.ceil((25.56) / (0.41 * 0.21)));
  assert.ok(close(r.q.sqm, 53.46, 1e-6));
});
test('حوائط متطابقة: الفتحات بتتضرب في العدد', () => {
  const r = wallsItem([{ L: 4, H: 3, count: 4, brick: RED, openings: [{ w: 1, h: 2 }] }]);
  assert.equal(r.walls[0].gross, 48); assert.equal(r.walls[0].open, 8); assert.equal(r.walls[0].net, 40);
});
test('فتحات أكبر من الحائط: رسالة ومفيش مساحة سالبة', () => {
  const r = wallsItem([{ L: 2, H: 2, brick: RED, openings: [{ w: 3, h: 2 }] }]);
  assert.equal(r.walls[0].error, true); assert.equal(r.walls[0].net, 0); assert.equal(r.groups[0].base, 0);
  assert.ok(r.warnings.some(w => /الفتحات/.test(w)));
});
test('المقاسات بالسنتيمتر والمليمتر بنفس النتيجة', () => {
  const m = wallsItem([{ L: 10, H: 3, brick: RED }]).groups[0].base;
  assert.equal(C.walls({ dimUnit: 'cm', jh: 1, jv: 1, walls: [{ L: 1000, H: 300, brick: RED }] }).groups[0].base, m);
  assert.equal(C.walls({ dimUnit: 'mm', jh: 1, jv: 1, walls: [{ L: 10000, H: 3000, brick: { ...RED, L: 250, W: 120, H: 65, unit: 'mm' } }] }).groups[0].base, m);
});
test('العدد بالحجم (تقديري): حجم البناء ÷ الحجم الاسمي للوحدة بالعراميس', () => {
  const r = wallsItem([{ L: 10, H: 3, brick: RED, layout: 'half' }], { countMethod: 'volume' });
  const expect = 30 * 0.12 / (0.26 * 0.13 * 0.075);
  assert.ok(close(r.walls[0].exact, expect, 1e-3));
});
test('البالتات: تقريب لفوق والكمية الفعلية والتكلفة', () => {
  const r = wallsItem([{ L: 6.5, H: 3, brick: { ...RED, perPack: 400, priceUnit: 'pack', price: 1000 } }], { waste: { mode: 'pct', pct: 5 } });
  const g = r.groups[0];
  assert.equal(g.final, 1050); assert.equal(g.packs, 3); assert.equal(g.purchased, 1200); assert.equal(g.cost, 3000);
  const th = wallsItem([{ L: 6.5, H: 3, brick: { ...RED, priceUnit: 'thousand', price: 2500 } }]).groups[0];
  assert.equal(th.cost, 2500);
});

/* ---------- اختبار 8: المونة ---------- */
test('اختبار 8 — مونة بحجم يدوي ونسبة خلط وهالك وتكلفة', () => {
  const r = C.mortarItem({ mortar: { method: 'manual', manual: 1, wastePct: 10 }, mixSpec: { c: 1, s: 4, dryFactor: 1.3, density: 1440, bagKg: 50 },
    prices: { cement: 100, sand: 200 } });
  const m = r.mortar;
  assert.ok(close(m.wet, 1.1)); assert.ok(close(m.dry, 1.43));
  assert.ok(close(m.cementM3, 0.286)); assert.ok(close(m.sandM3, 1.144));
  assert.ok(close(m.cementKg, 411.84)); assert.equal(m.bags, 9);
  assert.equal(r.materials.find(x => x.key === 'cement').cost, 900);
  assert.ok(close(r.materials.find(x => x.key === 'sand').cost, 228.8));
});
test('المونة: من غير نسبة خلط أو معامل → بيقول الناقص ومفيش أرقام مخترعة', () => {
  const r = C.mortarItem({ mortar: { method: 'manual', manual: 1 }, mixSpec: {} });
  assert.deepEqual(r.mortar.missing, ['نسبة الخلط', 'معامل الحجم الجاف']);
  assert.equal(r.mortar.bags, undefined); assert.equal(r.materials.length, 0);
  const r2 = C.mortarItem({ mortar: { method: 'manual', manual: 1 }, mixSpec: { c: 1, s: 4, dryFactor: 1.3 } });
  assert.ok(r2.mortar.missing.includes('كثافة الأسمنت (كجم/م³)'));
});
test('مونة أسمنت وجير ورمل 1:1:6', () => {
  const m = C.mix(1, { c: 1, l: 1, s: 6, dryFactor: 1.25, density: 1440, bagKg: 50 });
  assert.ok(close(m.cementM3, 0.15625, 1e-4)); assert.ok(close(m.limeM3, 0.15625, 1e-4)); assert.ok(close(m.sandM3, 0.9375, 1e-4));
});
test('مونة الحوائط (تلقائي): حجم الحائط − حجم الطوب، والفراغات مش مونة', () => {
  const r = wallsItem([{ L: 10, H: 3, brick: RED, layout: 'half' }]);
  const exact = 30 / (0.26 * 0.075);
  assert.ok(close(r.mortar.wetBase, 30 * 0.12 - exact * 0.25 * 0.12 * 0.065, 1e-3));
  // المفرغ بنفس المقاسات = نفس المونة (مش بنعتبر الفراغات مونة)
  const hollow = wallsItem([{ L: 10, H: 3, brick: { ...RED, id: 'h', solid: 'hollow', voidPct: 40 } }]);
  assert.ok(close(hollow.mortar.wetBase, r.mortar.wetBase));
  const rate = wallsItem([{ L: 10, H: 3, brick: RED }], { mortar: { method: 'rate', basis: 'thousand', rate: 0.25 } });
  assert.ok(close(rate.mortar.wetBase, Math.ceil(exact) / 1000 * 0.25, 1e-3));
});
test('الرمل بالنقلة لو المستخدم كتب حجم النقلة', () => {
  const l = C.mixCost({ sandM3: 6 }, { sand: 900, sandUnit: 'load', loadM3: 3 });
  assert.equal(l[0].qty, 2); assert.equal(l[0].unit, 'نقلة'); assert.equal(l[0].cost, 1800);
  const ton = C.mixCost({ cementKg: 2500, bags: 50 }, { cement: 3000, cementUnit: 'ton' });
  assert.equal(ton[0].qty, 2.5); assert.equal(ton[0].cost, 7500);
});

/* ---------- اختبار 9: المصنعية ---------- */
test('اختبار 9 — المصنعية بكل الطرق', () => {
  const q = { sqm: 25, m3: 3, brick: 1284, lm: 10, piece: 1350 };
  assert.equal(C.labor({ method: 'sqm', price: 60 }, q).amount, 1500);
  assert.equal(C.labor({ method: 'lm', price: 100 }, q).amount, 1000);
  assert.equal(C.labor({ method: 'm3', price: 400 }, q).amount, 1200);
  assert.equal(C.labor({ method: 'brick', price: 1.5 }, q).amount, 1926);
  assert.equal(C.labor({ method: 'lump', amount: 5000 }, q).amount, 5000);
  assert.equal(C.labor({ method: 'daily', days: 3, workers: 2, price: 400 }, q).amount, 2400);
  assert.equal(C.labor({ method: 'daily', days: 3, workers: 2, price: 900, perWorker: false }, q).amount, 2700);
  assert.equal(C.labor({ method: 'stages', stages: [{ name: 'بناء', amount: 3000 }, { name: 'محارة', amount: '2,000' }] }, q).amount, 5000);
});

/* ---------- المحارة والأرضيات والحجر والتكسير والعمال ---------- */
test('المحارة: المساحة × السمك، والخامات بالخلطة أو بالمعدل', () => {
  const r = C.plaster({ dimUnit: 'm', thickness: 2, surfaces: [{ L: 10, H: 3, openings: [{ w: 1, h: 2.1 }] }], mixSpec: { c: 1, s: 4, dryFactor: 1.3, density: 1440, bagKg: 50 }, prices: { cement: 100, sand: 200 } });
  assert.equal(r.area, 27.9); assert.ok(close(r.volume, 0.558));
  assert.ok(r.mortar.bags > 0 && r.mortar.sandM3 > 0);
  const rate = C.plaster({ dimUnit: 'm', thickness: 2, matMethod: 'rate', rates: { cement: 0.2, sand: 0.02 }, surfaces: [{ L: 10, H: 3 }], wastePct: 10, prices: { cement: 100, sand: 200 } });
  assert.equal(rate.mortar.bags, 7); assert.ok(close(rate.mortar.sandM3, 0.66));
});
test('الأرضيات: أكتر من طبقة كل واحدة بسمكها وخامتها', () => {
  const r = C.floor({ dimUnit: 'm', zones: [{ L: 5, W: 4 }, { L: 3, W: 2 }], layers: [{ name: 'رمل', thickness: 10, method: 'm3', price: 300 }, { name: 'تسوية', thickness: 3, method: 'mix', c: 1, s: 3 }],
    mixSpec: { dryFactor: 1.3, density: 1440, bagKg: 50 }, prices: { cement: 100, sand: 200 } });
  assert.equal(r.area, 26); assert.equal(r.layers[0].volume, 2.6); assert.equal(r.materials[0].cost, 780);
  assert.ok(close(r.layers[1].volume, 0.78)); assert.ok(r.layers[1].mix.bags > 0);
});
test('الحجر بالمتر المربع مع هالك وبالقطعة', () => {
  const r = C.stone({ dimUnit: 'm', unit: 'sqm', surfaces: [{ L: 6, H: 3, openings: [{ w: 1.2, h: 1.2 }] }], wastePct: 10, stonePrice: 350 });
  assert.ok(close(r.area, 16.56)); assert.ok(close(r.qty, 18.216)); assert.ok(close(r.materials[0].cost, 6375.6));
  const p = C.stone({ dimUnit: 'm', unit: 'piece', pieces: 100, wastePct: 5, stonePrice: 20 });
  assert.equal(p.qty, 105);
});
test('التكسير: م² و م³ واليومية', () => {
  const r = C.item({ kind: 'demo', dimUnit: 'm', L: 4, H: 3, T: 25, labor: { method: 'm3', price: 500 } });
  assert.equal(r.area, 12); assert.equal(r.volume, 3); assert.equal(r.labor.amount, 1500);
});
test('العمال: لكل عامل وللفريق ومبلغ ثابت، والسلف بتتخصم', () => {
  const w = C.workers([{ name: 'بنا', count: 2, days: 5, rate: 500, advance: 1000 }, { name: 'فريق', mode: 'team', days: 3, rate: 1200, hours: 4, hourRate: 50 }, { name: 'نقل', mode: 'lump', amount: 800 }]);
  assert.equal(w.rows[0].gross, 5000); assert.equal(w.rows[0].due, 4000);
  assert.equal(w.rows[1].gross, 3800); assert.equal(w.gross, 9600); assert.equal(w.due, 8600);
});

/* ---------- اختبار 10: مشروع متكامل ---------- */
test('اختبار 10 — مشروع متكامل: طوب + بلوك + مونة + مصنعية + عمال + نقل + هالك + خصم + دفعات', () => {
  const RP = { ...RED, price: 3 }, BP = { ...BLOCK, price: 12 };
  const mixSpec = { c: 1, s: 4, dryFactor: 1.3, density: 1440, bagKg: 50 }, prices = { cement: 100, sand: 200 };
  const j = {
    items: [
      { kind: 'walls', dimUnit: 'm', jh: 1, jv: 1, walls: [{ L: 10, H: 3, brick: RP, layout: 'half', openings: [{ w: 1, h: 2.1 }] }], waste: { mode: 'pct', pct: 5 }, mixSpec, prices, labor: { method: 'sqm', price: 60 }, matBilled: false },
      { kind: 'walls', dimUnit: 'm', jh: 1, jv: 1, walls: [{ L: 8, H: 3, brick: BP }], mixSpec, prices, labor: { method: 'brick', price: 5 }, matBilled: true }
    ],
    costs: [{ type: 'transport', qty: 1, price: 700, billed: true }, { type: 'labor', qty: 4, price: 400 }, { type: 'waste', mode: 'pct', pct: 2 }],
    discount: { type: 'amount', value: 100 }, payments: [{ amount: 1000 }]
  };
  const r = C.job(j);
  const w1 = r.items[0], w2 = r.items[1];
  assert.equal(w1.groups[0].base, Math.ceil(27.9 / (0.26 * 0.075)));
  assert.equal(w1.labor.amount, 27.9 * 60);
  assert.equal(w2.groups[0].base, 279); assert.equal(w2.labor.amount, 279 * 5);
  assert.equal(r.labor, 27.9 * 60 + 279 * 5);
  assert.equal(r.matBilled, w2.matCost, 'خامات البلوك على العميل');
  assert.equal(r.total, C.money(r.labor + w2.matCost + 700 - 100));
  assert.equal(r.remaining, C.money(r.total - 1000));
  const matAll = C.money(w1.matCost + w2.matCost);
  assert.equal(r.byType.mat, matAll);
  assert.equal(r.byType.waste, C.money(matAll * 0.02));
  assert.equal(r.totalCost, C.money(matAll + 700 + 1600 + matAll * 0.02));
  assert.equal(r.bricks.length, 2);
  assert.ok(r.cementBags > 0 && r.sandM3 > 0);
});

test('مفيش NaN ولا Infinity ولا سالب في أي حاجة', () => {
  for (const kind of ['walls', 'mortar', 'plaster', 'floor', 'stone', 'demo', 'غلط']) {
    const r = C.item({ kind, walls: [{ L: 'x', H: -1, brick: { L: 'a' }, openings: [{ w: 'NaN' }] }], surfaces: [{ L: Infinity }], zones: [{}], layers: [{ method: 'mix' }], labor: { method: 'daily' }, mortar: { method: 'rate' } });
    assert.ok(Number.isFinite(r.total) && r.total >= 0, kind);
  }
  const j = C.job({ items: [{}], costs: [{ type: 'غلط', qty: 'x' }, { mode: 'pct', pct: 'NaN' }], discount: { type: 'percent', value: 'x' }, payments: [{ amount: 'y' }] });
  for (const k of ['total', 'paid', 'remaining', 'totalCost', 'profit', 'margin']) assert.ok(Number.isFinite(j[k]), k);
});
