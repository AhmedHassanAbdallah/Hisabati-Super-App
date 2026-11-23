/*
 * أرزقي | Arzoqi — الرخام والجرانيت: اختبارات الحسابات (node --test tests/calc.test.js)
 * الاختبارات الإلزامية (البند 36): مطابخ مستقيم/L/U، فتحات الحوض والبوتاجاز، السلالم، المداخل، الواجهات، الأرضيات، الحوائط،
 * المتر الطولي، الألواح، الهالك، توزيع القطع على الألواح، الأسعار، المشروع والدفعات والمتبقي والربح.
 */
const test = require('node:test');
const assert = require('node:assert');
const C = require('../js/calc.js');
const close = (a, b, e = 0.001) => Math.abs(a - b) <= e;
const sug = (o, key) => o.sug.find(s => s.key === key);
const row = (o, label) => o.rows.find(r => r[0] === label);

// مكتبة اختبار: الأسعار والمقاسات والكثافة بيكتبها المستخدم في الحقيقة
const LIB = [
  { id: 'gal', name: 'جرانيت جلالة', fam: 'granite', thick: 3, slabL: 300, slabW: 180, slabPrice: 2700, cost: 450, price: 650, unit: 'م²', density: 2700 },
  { id: 'car', name: 'رخام كرارة', fam: 'marble', thick: 2, slabL: 280, slabW: 160, cost: 900, price: 1300, unit: 'م²', sizes: [{ t: 3, L: 300, W: 200, price: 6000 }] },
  { id: 'trv', name: 'ترافرتين', fam: 'travertine', thick: 2, cost: 600, price: 850, unit: 'م²' }
];
const CTX = { lib: LIB, edgePrices: { 'نص بلتة': 60, 'شطف': 40 }, cutPrices: { 'فتحة حوض فوق السطح': 150, 'فتحة بوتاجاز': 120 }, finishPrices: { 'تلميع': 80 } };

/* ---------- الأشكال والوحدات ---------- */
test('الأشكال: مستطيل/مثلث/شبه منحرف/دائرة/نص دائرة/قطع زاوية/L/U/يدوي، والوحدات مم/سم/م', () => {
  assert.ok(close(C.shape({ shape: 'rect', L: 200, W: 60 }, 'cm').area, 1.2));
  assert.ok(close(C.shape({ shape: 'rect', L: 2000, W: 600 }, 'mm').area, 1.2));
  assert.ok(close(C.shape({ shape: 'rect', L: 2, W: 0.6 }, 'm').area, 1.2));
  assert.ok(close(C.shape({ shape: 'square', L: 50 }, 'cm').area, 0.25));
  assert.ok(close(C.shape({ shape: 'tri', L: 100, W: 80 }, 'cm').area, 0.4));
  assert.ok(close(C.shape({ shape: 'trap', L: 100, A: 60, W: 50 }, 'cm').area, 0.4));
  assert.ok(close(C.shape({ shape: 'circle', D: 100 }, 'cm').area, Math.PI / 4, 1e-4));
  assert.ok(close(C.shape({ shape: 'semi', D: 100 }, 'cm').area, Math.PI / 8, 1e-4));
  assert.ok(close(C.shape({ shape: 'corner', L: 100, W: 100, A: 20, B: 20 }, 'cm').area, 0.98));
  assert.ok(close(C.shape({ shape: 'L', L: 200, W: 60, A: 100, B: 60 }, 'cm').area, 1.8));
  assert.ok(close(C.shape({ shape: 'U', L: 300, W: 60, A: 60, B: 100 }, 'cm').area, 3.0));
  assert.ok(close(C.shape({ shape: 'custom', manual: 1.37 }, 'cm').area, 1.37));
  assert.equal(C.shape({ shape: 'curve' }, 'cm').ok, false); // منحني من غير مساحة → لازم يتكتب يدوي، مش تقدير
});

/* ---------- المطابخ ---------- */
test('مطبخ مستقيم: المساحة والحافة الأمامية والظهر والهالك والألواح التقديرية', () => {
  const o = C.kitchen({ ktype: 'straight', unit: 'cm', L1: 300, D: 60, back: true, backH: 60, edgeType: 'نص بلتة', mat: 'gal', waste: 10, basis: 'm2' }, CTX);
  assert.ok(close(row(o, 'مساحة الأسطح') ? o.metrics.m2 : 0, 3.6)); // 1.8 سطح + 1.8 ظهر
  assert.ok(close(o.metrics.lm, 3));
  assert.ok(close(sug(o, 'm:gal').qty, 3.96)); // 3.6 × 1.1
  assert.equal(sug(o, 'e:نص بلتة').qty, 3); assert.equal(sug(o, 'e:نص بلتة').price, 60);
  const s = C.kitchen({ ktype: 'straight', unit: 'cm', L1: 300, D: 60, mat: 'gal', waste: 10, basis: 'slab' }, CTX);
  assert.equal(sug(s, 'm:gal').qty, 1); assert.equal(sug(s, 'm:gal').unit, 'لوح'); assert.equal(sug(s, 'm:gal').price, 2700); // 1.98 ÷ 5.4 → 1
  assert.ok(row(s, 'ألواح جرانيت جلالة 3 سم')[2].includes('تقديري'));
});
test('مطبخ L و U: الركن بيتحسب مرة واحدة', () => {
  const L = C.kitchen({ ktype: 'L', unit: 'cm', L1: 300, L2: 200, D: 60, mat: 'gal' }, CTX);
  assert.ok(close(L.metrics.m2, 1.8 + 1.4 * 0.6)); // 300×60 + (200−60)×60
  assert.ok(close(L.metrics.lm, 3.8)); // 300 + 200 − 2×60
  const U = C.kitchen({ ktype: 'U', unit: 'cm', L1: 200, L2: 300, L3: 200, D: 60, mat: 'gal' }, CTX);
  assert.ok(close(U.metrics.m2, 1.8 + 2 * 1.4 * 0.6));
  assert.ok(close(U.metrics.lm, 4.6)); // 700 − 4×60
  assert.equal(U.parts.length, 3);
});
test('مطبخ بجزيرة وبار وأطراف: المساحات والحواف', () => {
  const o = C.kitchen({ ktype: 'straight', unit: 'cm', L1: 300, D: 60, island: true, IL: 200, IW: 90, bar: true, BL: 150, BW: 40, ends: 2 }, CTX);
  assert.ok(close(o.metrics.m2, 1.8 + 1.8 + 0.6));
  assert.ok(close(o.metrics.lm, 3 + 2 * (2 + 0.9) + 1.5 + 1.2));
});
test('فتحات المطبخ: حوض فوق السطح وبوتاجاز وفتحة مخصوصة بسعرها من الإعدادات', () => {
  const o = C.kitchen({ ktype: 'straight', unit: 'cm', L1: 300, D: 60, cuts: [{ type: 'sinkTop', count: 1, w: 80, h: 45 }, { type: 'hob', count: 1 }, { type: 'mixer', count: 2 }] }, CTX);
  assert.equal(o.metrics.cutout, 4);
  assert.equal(sug(o, 'h:فتحة حوض فوق السطح').qty, 1); assert.equal(sug(o, 'h:فتحة حوض فوق السطح').price, 150);
  assert.equal(sug(o, 'h:فتحة بوتاجاز').price, 120);
  assert.equal(sug(o, 'h:فتحة خلاط').qty, 2);
  const c = C.cutouts({ rows: [{ type: 'sinkUnder', count: 2, method: 'CNC', price: 300 }] }, CTX);
  assert.equal(c.sug[0].qty, 2); assert.equal(c.sug[0].price, 300); assert.equal(c.metrics.cutout, 2);
});
test('ظهر المطبخ (Backsplash): الطول × الارتفاع وفتحات الكهرباء والخلاط', () => {
  const o = C.backsplash({ unit: 'cm', H: 60, walls: [{ len: 300 }, { len: 140 }], sockets: 3, mixers: 1, mat: 'gal' }, CTX);
  assert.ok(close(o.metrics.m2, 4.4 * 0.6)); assert.equal(o.metrics.cutout, 4);
  assert.equal(sug(o, 'h:فتحة كهرباء').qty, 3);
});

test('مطبخ متعدد الأركان / حسب الرسم: أجزاء بأطوالها الصافية وعمق مختلف', () => {
  const o = C.kitchen({ ktype: 'multi', unit: 'cm', D: 60, segs: [{ name: 'أ', L: 250 }, { name: 'ب', L: 140 }, { name: 'ج', L: 90, D: 40, noEdge: true }, { name: 'د', L: 100, count: 2 }] }, CTX);
  assert.ok(close(o.metrics.m2, 2.5 * 0.6 + 1.4 * 0.6 + 0.9 * 0.4 + 2 * 0.6));
  assert.ok(close(o.metrics.lm, 2.5 + 1.4 + 2)); assert.equal(o.parts.length, 5);
});
test('أنواع القصات الخاصة: زاوية وشطفة ومجرى مياه وتجويف', () => {
  const c = C.cutouts({ rows: [{ type: 'drain', count: 1, price: 90 }, { type: 'groove', count: 2 }, { type: 'corner', count: 4 }] }, CTX);
  assert.equal(c.metrics.cutout, 7); assert.ok(c.sug.some(x => x.name === 'مجرى مياه' && x.price === 90));
});

/* ---------- السلالم ---------- */
test('سلم بدرجات متساوية: نوايم وقوايم وبسطة ووزرة على الميل وحافة المقدمة', () => {
  const o = C.stairs({ unit: 'cm', n: 15, L: 120, W: 30, H: 16, landings: [{ L: 120, W: 120 }], skirtSides: 2, skirtH: 10, edgeType: 'نص بلتة', mat: 'gal' }, CTX);
  assert.equal(o.n, 15);
  assert.ok(close(o.tread, 15 * 1.2 * 0.3)); assert.ok(close(o.riser, 15 * 1.2 * 0.16)); assert.ok(close(o.land, 1.44));
  assert.ok(close(o.skirt, 2 * 15 * Math.sqrt(0.09 + 0.0256), 0.001));
  assert.ok(close(sug(o, 'e:نص بلتة').qty, 18));
  assert.equal(o.metrics.step, 15); assert.equal(o.metrics.piece, 31);
});
test('سلم بمقاس لكل درجة (مش كل الدرجات زي بعض) ومن غير قوايم', () => {
  const o = C.stairs({ unit: 'cm', mode: 'rows', risers: false, steps: [{ L: 100, W: 30, H: 17, count: 10 }, { L: 140, W: 45, H: 17, count: 1, name: 'مروحة' }, { L: 90, W: 28, H: 17, count: 3 }] }, CTX);
  assert.equal(o.n, 14);
  assert.ok(close(o.tread, 10 * 0.3 + 1.4 * 0.45 + 3 * 0.9 * 0.28));
  assert.equal(o.riser, 0);
  assert.ok(close(o.metrics.edge, 10 + 1.4 + 2.7));
});

/* ---------- المداخل والحوائط والأعمدة ---------- */
test('مدخل عمارة بقطع مختلفة وخامات مختلفة وحواف وفتحات', () => {
  const o = C.pieces({ unit: 'cm', waste: 5, parts: [
    { name: 'أرضية المدخل', shape: 'rect', L: 400, W: 250, count: 1, mat: 'car' },
    { name: 'عتبة', shape: 'rect', L: 120, W: 30, count: 2, mat: 'gal', edge: 1.2, edgeType: 'شطف' },
    { name: 'وزرة', shape: 'rect', L: 300, W: 10, count: 4, mat: 'car' },
    { name: 'نص دائرة', shape: 'semi', D: 120, count: 1, mat: 'car', holes: 1, holeType: 'فتحة ماسورة' }] }, CTX);
  const area = 10 + 0.72 + 1.2 + Math.PI * 1.44 / 8;
  assert.ok(close(o.area, area, 1e-3));
  assert.ok(close(sug(o, 'm:car').qty, C.round((10 + 1.2 + Math.PI * 1.44 / 8) * 1.05, 3), 1e-3));
  assert.ok(close(sug(o, 'm:gal').qty, 0.756));
  assert.equal(sug(o, 'e:شطف').qty, 2.4); assert.equal(sug(o, 'e:شطف').price, 40);
  assert.equal(o.metrics.cutout, 1); assert.equal(o.parts.length, 4);
});
test('قطعة منحنية من غير مساحة: تحذير ومش بتتحسب تقديري', () => {
  const o = C.pieces({ unit: 'cm', parts: [{ name: 'قوس', shape: 'curve', count: 1 }] }, CTX);
  assert.equal(o.area, 0); assert.ok(o.warn.some(w => w.includes('يدوي')));
});
test('حوائط وتجاليد: مناطق − فتحات، والوزن من الكثافة', () => {
  const o = C.facade({ unit: 'm', zones: [{ name: 'حمام', W: 3, H: 2.5, count: 4 }], openings: [{ W: 0.8, H: 2, count: 1 }], mat: 'gal' }, CTX);
  assert.ok(close(o.metrics.m2, 30 - 1.6));
  const w = C.weight({ area: 2, mat: 'gal' }, CTX);
  assert.ok(close(w.kg, 2 * 0.03 * 2700));
  assert.ok(C.weight({ area: 2, T: 2 }, CTX).warn[0].includes('الكثافة')); // من غير كثافة مش بنفترض رقم
});
test('أعمدة مربعة ودائرية: المساحة والأركان', () => {
  const o = C.column({ unit: 'cm', cols: [{ W: 40, D: 40, H: 300, count: 4 }, { type: 'round', W: 50, H: 300, count: 2 }], edgeType: 'شطف' }, CTX);
  assert.ok(close(o.metrics.m2, 4 * 1.6 * 3 + 2 * Math.PI * 0.5 * 3, 1e-3));
  assert.ok(close(sug(o, 'e:شطف').qty, 48));
});

/* ---------- الواجهات ---------- */
test('واجهة بمناطق وخامات مختلفة وفتحات وبروزات ونظام تثبيت وسقالات', () => {
  const o = C.facade({ unit: 'm', waste: 10, zones: [{ name: 'أرضي', W: 12, H: 4, mat: 'gal' }, { name: 'متكرر', W: 12, H: 3, count: 4, mat: 'trv' }], openings: [{ W: 1.5, H: 1.5, count: 8 }],
    extras: [{ name: 'بروز', area: 6 }], pL: 0.6, pW: 0.4, fixing: 'كانات ستانلس', fixPerM2: 4, fixPrice: 12, scaffold: 5000, lift: 2000 }, CTX);
  assert.ok(close(o.metrics.m2, 48 + 144 - 18 + 6));
  assert.ok(close(sug(o, 'm:gal').qty, (48 - 18 + 6) * 1.1)); // الفتحات من أول خامة
  assert.ok(close(sug(o, 'm:trv').qty, 144 * 1.1));
  assert.equal(o.metrics.piece, Math.ceil(180 * 1.1 / 0.24 - 1e-7));
  assert.equal(sug(o, 'fix').qty, 720); assert.equal(sug(o, 'fix').price, 12);
  assert.equal(sug(o, 'scaffold').price, 5000);
});

/* ---------- الأرضيات ---------- */
test('أرضية: غرف − مستثنى، عدد البلاط بالهالك، والبوردر', () => {
  const o = C.floor({ unit: 'm', rooms: [{ L: 5, W: 4 }, { L: 3, W: 3 }], ex: [{ L: 1, W: 1 }], tL: 0.6, tW: 0.6, waste: 5, border: true, borderMat: 'gal', mat: 'car' }, CTX);
  assert.ok(close(o.metrics.m2, 28));
  assert.equal(o.metrics.piece, Math.ceil(28 * 1.05 / 0.36 - 1e-7));
  assert.ok(close(sug(o, 'border').qty, 18 + 12));
});

/* ---------- المتر الطولي والحواف ---------- */
test('المتر الطولي والحواف بأنواعها', () => {
  const l = C.lm({ unit: 'cm', rows: [{ name: 'كورنيشة', len: 350, count: 4, price: 200 }, { name: 'سوكلة', len: 120 }] }, CTX);
  assert.ok(close(l.metrics.lm, 15.2)); assert.equal(l.sug[0].price, 200);
  const e = C.edges({ unit: 'cm', rows: [{ type: 'نص بلتة', len: 300 }, { type: 'نص بلتة', len: 200 }, { type: 'شطف', len: 100, count: 3, price: 55 }] }, CTX);
  assert.equal(sug(e, 'e:نص بلتة').qty, 5); assert.equal(sug(e, 'e:نص بلتة').price, 60); assert.equal(sug(e, 'e:شطف').price, 55);
});

/* ---------- الألواح والهالك ---------- */
test('حساب الألواح بالمساحة: الهالك والجزء المستغل ومقاس من سمك تاني', () => {
  const o = C.slabs({ area: 10, waste: 10, mat: 'gal' }, CTX);
  assert.equal(o.slabs, 3); // 11 ÷ 5.4
  const u = C.slabs({ area: 10, waste: 10, usable: 70, mat: 'gal' }, CTX);
  assert.equal(u.slabs, 3); // 11 ÷ 3.78 = 2.9
  const t = C.slabs({ area: 10, mat: 'car', T: 3 }, CTX);
  assert.equal(t.slabs, 2); assert.equal(sug(t, 'm:car').price, 6000); // مقاس 300×200 للسمك 3
  assert.ok(C.slabs({ area: 5, mat: 'trv' }, CTX).warn.length);
});
test('عدد القطع في اللوح بالسلاح، ومنع اللف', () => {
  const o = C.count({ unit: 'cm', a: 60, b: 40, sL: 300, sW: 180, kerf: 4, need: 40 }, CTX);
  // (3000+4)/(604)=4.97→4 × (1800+4)/(404)=4.46→4 = 16 ؛ ملفوف: 3004/404=7 × 1804/604=2 = 14
  assert.equal(row(o, 'القطع في اللوح')[1], '16'); assert.equal(o.metrics.slab, 3);
});
test('الهالك: نسبة ومساحة ولكل لوح بالبواقي ومبلغ يدوي', () => {
  assert.equal(C.waste({ mode: 'pct', need: 20, value: 10, price: 500 }).waste, 1000);
  assert.equal(C.waste({ mode: 'qty', value: 1.5, price: 500 }).waste, 750);
  assert.equal(C.waste({ mode: 'piece', value: 0.05, pieces: 10, price: 500 }).waste, 250);
  const s = C.waste({ mode: 'slab', need: 8, slabs: 2, slabArea: 5.4, reuse: 1, price: 500 });
  assert.ok(close(s.wasteArea, 1.8)); assert.equal(s.waste, 900);
  assert.equal(C.waste({ mode: 'manual', value: 333 }).waste, 333);
});

/* ---------- تقسيم الألواح ---------- */
test('تقسيم الألواح: كل القطع داخلة، مفيش تداخل، في حدود اللوح بالهامش', () => {
  const parts = [{ name: 'سطح', L: 2400, W: 600, count: 2 }, { name: 'جنب', L: 600, W: 900, count: 2 }, { name: 'ظهر', L: 2400, W: 100, count: 2 }];
  const r = C.nest(parts, { std: { L: 3000, W: 1800 }, kerf: 4, margin: 10 });
  assert.equal(r.pieces, 6); assert.equal(r.tooBig.length, 0);
  r.sheets.forEach(s => {
    s.placed.forEach((p, i) => {
      assert.ok(p.x >= 10 - 1e-9 && p.y >= 10 - 1e-9 && p.x + p.l <= s.L - 10 + 1e-9 && p.y + p.w <= s.W - 10 + 1e-9, 'جوه اللوح');
      s.placed.slice(i + 1).forEach(q => assert.ok(p.x + p.l + 4 - 1e-9 <= q.x || q.x + q.l + 4 - 1e-9 <= p.x || p.y + p.w + 4 - 1e-9 <= q.y || q.y + q.w + 4 - 1e-9 <= p.y, 'من غير تداخل'));
    });
  });
  const used = (2.4 * 0.6 * 2 + 0.54 * 2 + 0.24 * 2);
  assert.ok(close(r.used, used, 1e-3)); assert.ok(r.count >= r.minSlabs);
  assert.ok(close(r.used + r.waste + r.remArea, r.area, 1e-3));
});
test('تقسيم الألواح: قفل اتجاه العروق، البواقي قبل اللوح الجديد، والبواقي الكبيرة مش هالك', () => {
  // قطعة 1700×500 مقفولة على لوح 1800 طول: مش بتتلف
  const g = C.nest([{ name: 'ق', L: 500, W: 1700, count: 1, grain: true }], { std: { L: 1800, W: 3000 }, kerf: 0 });
  assert.equal(g.sheets[0].placed[0].rot, false);
  const lock = C.nest([{ name: 'ق', L: 1700, W: 500, count: 1, grain: true }], { std: { L: 600, W: 3000 } });
  assert.equal(lock.tooBig.length, 1); // مقفولة ومش داخلة بالطول
  const free = C.nest([{ name: 'ق', L: 1700, W: 500, count: 1 }], { std: { L: 600, W: 3000 } });
  assert.equal(free.tooBig.length, 0); assert.equal(free.sheets[0].placed[0].rot, true);
  const r = C.nest([{ name: 'عتبة', L: 1200, W: 300, count: 2 }], { std: { L: 3000, W: 1800 }, slabs: [{ L: 1300, W: 700, count: 1, remnant: true }], kerf: 4 });
  assert.equal(r.count, 1); assert.equal(r.sheets[0].src, 'remnant'); assert.equal(r.newSlabs, 0);
  const k = C.nest([{ name: 'سطح', L: 2000, W: 600, count: 1 }], { std: { L: 3000, W: 1800 }, kerf: 4, keepL: 500, keepW: 300 });
  assert.ok(k.remArea > 0); assert.ok(close(k.used + k.remArea + k.waste, k.area, 1e-3));
});
test('تقسيم الألواح من الحاسبة بالسم ومع البواقي المخزنة ومطابقة الخامة', () => {
  const o = C.nestCalc({ unit: 'cm', mat: 'gal', kerf: 4, margin: 5, useRemnants: true, parts: [{ name: 'عتبة', L: 120, W: 30, count: 3 }] }, Object.assign({ remnants: [{ id: 'r1', matId: 'gal', L: 130, W: 70, count: 1 }, { id: 'r2', matId: 'car', L: 300, W: 200 }] }, CTX));
  assert.equal(o.plan.sheets[0].src, 'remnant'); assert.equal(o.plan.sheets[0].stockId, 'r1');
  assert.equal(o.plan.pieces, 3);
});

/* ---------- المطابقة والتشطيب والتسعير ---------- */
test('مطابقة العروق: Bookmatch أزواج، Waterfall من لوح واحد', () => {
  const b = C.vein({ mode: 'book', pieces: 4 });
  assert.equal(b.seq.length, 4); assert.equal(b.seq[1].face, 'مقلوب (وش التاني)'); assert.equal(b.seq[3].pair, 2);
  assert.ok(C.vein({ mode: 'book', pieces: 3 }).warn.length);
  assert.equal(C.vein({ mode: 'waterfall', pieces: 3 }).metrics.slab, 1);
});
test('التشطيب والتسعير وخطة الدفعات والنقل', () => {
  const f = C.finish({ rows: [{ type: 'تلميع', area: 10 }, { type: 'Leather', area: 5, price: 120 }] }, CTX);
  assert.equal(f.sug[0].price, 80); assert.equal(f.sug[1].price, 120); assert.equal(f.metrics.m2, 15);
  assert.equal(C.price({ cost: 1000, mode: 'markup', value: 25 }).sell, 1250);
  assert.equal(C.price({ cost: 1000, mode: 'margin', value: 20 }).sell, 1250);
  assert.equal(C.transport({ trips: 2, tripPrice: 500, floors: 3, floorPrice: 100 }).cost, 1300);
  assert.ok(C.payplan({ total: 1000, parts: [{ pct: 50 }, { pct: 30 }] }).warn.length);
});

/* ---------- البند والمشروع ---------- */
test('بند مطبخ كامل: خامات + حواف + فتحات + مصنعيات تلقائي من الكميات + ربح', () => {
  const it = { kind: 'kitchen', title: 'مطبخ', 'in': { ktype: 'L', unit: 'cm', L1: 300, L2: 200, D: 60, mat: 'gal' },
    lines: [{ name: 'جرانيت', qty: 2.64, unit: 'م²', cost: 450, price: 650, wastePct: 10, cat: 'mat' }, { name: 'فتحة حوض', qty: 1, unit: 'فتحة', cost: 0, price: 150, cat: 'work' }],
    labor: [{ name: 'تركيب', method: 'm2', price: 100 }, { name: 'تشكيل حافة', method: 'lm', price: 50 }, { name: 'نقل', method: 'lump', price: 300 }], icosts: [{ name: 'يوميات', amount: 200 }] };
  const r = C.item(it, CTX);
  assert.ok(close(r.labor[0].qty, 2.64)); assert.ok(r.labor[0].auto);
  assert.ok(close(r.labor[1].qty, 3.8));
  assert.ok(close(r.lines[0].final, 2.904));
  assert.equal(r.matSell, C.money(2.904 * 650 + 150));
  assert.equal(r.laborT, C.money(264 + 190 + 300));
  assert.equal(r.cost, C.money(2.904 * 450 + 200));
  assert.equal(r.profit, C.money(r.total - r.cost));
  const inst = C.item(Object.assign({}, it, { scope: 'install' }), CTX);
  assert.equal(inst.matSell, 0); // تركيب فقط: مفيش توريد خامات
});
test('المشروع: دفعات متعددة ومتبقي وخصم وإضافة ومرتجع وضريبة ويوميات وربح', () => {
  const j = { id: 'j1', items: [{ kind: 'custom', lines: [{ name: 'رخام', qty: 10, unit: 'م²', cost: 800, price: 1200, cat: 'mat' }], labor: [{ method: 'lump', price: 2000 }] }],
    costs: [{ type: 'transport', mode: 'amount', amount: 500, billed: true }], adjust: [{ type: 'add', amount: 1000 }, { type: 'return', amount: 500 }],
    discount: { type: 'percent', value: 10 }, tax: { pct: 14 }, payments: [{ amount: 5000, kind: 'deposit' }, { amount: 3000, kind: 'materials' }] };
  const r = C.job(j, { wlog: [{ jobId: 'j1', amount: 700 }, { jobId: 'x', amount: 999 }] });
  assert.equal(r.subtotal, 12000 + 2000 + 500 + 1000 - 500);
  assert.equal(r.discount, 1500); assert.equal(r.tax, C.money(13500 * 0.14)); assert.equal(r.total, C.money(13500 * 1.14));
  assert.equal(r.paid, 8000); assert.equal(r.remaining, C.money(r.total - 8000));
  assert.equal(r.totalCost, 8000 + 500 + 700);
  assert.equal(r.profit, C.money(13500 - 9200));
  assert.equal(r.area, 0);
});
test('خطة ألواح المشروع: القطع متجمعة لكل خامة', () => {
  const j = { items: [{ kind: 'kitchen', title: 'مطبخ', 'in': { ktype: 'straight', unit: 'cm', L1: 240, D: 60, mat: 'gal' } }, { kind: 'pieces', title: 'مدخل', 'in': { unit: 'cm', parts: [{ L: 120, W: 30, count: 2, mat: 'gal' }, { L: 100, W: 100, mat: 'car' }] } }] };
  const p = C.jobNest(j, Object.assign({ kerf: 4 }, CTX));
  const g = p.find(b => b.matId === 'gal'), c = p.find(b => b.matId === 'car');
  assert.equal(g.plan.pieces, 3); assert.equal(c.plan.pieces, 1); assert.equal(g.plan.count, 1);
});
test('العمال: المستحق والمدفوع والسلف', () => {
  const w = C.worker({ id: 'w' }, [{ workerId: 'w', qty: 5, rate: 300 }, { workerId: 'w', amount: 400 }], [{ workerId: 'w', amount: 500, type: 'advance' }, { workerId: 'w', amount: 600 }]);
  assert.equal(w.earned, 1900); assert.equal(w.paid, 1100); assert.equal(w.advances, 500); assert.equal(w.due, 800);
});
