/*
 * أرزقي | Arzoqi — الألوميتال وUPVC: اختبارات الحسابات (node --test tests/calc.test.js)
 * الاختبارات الإلزامية (البند 39): شبابيك بأحجام ودرف وتقسيمات وزجاج وقطاعات مختلفة، أبواب، UPVC بالحديد، Cut List، المحاسبة.
 */
const test = require('node:test');
const assert = require('node:assert');
const C = require('../js/calc.js');
const close = (a, b, e = 0.01) => Math.abs(a - b) <= e;
const sug = (o, key) => o.sug.find(s => s.key === key);
const piece = (o, name) => o.pieces.filter(p => p.name === name);

// نظام قطاع بخصومات «من كتالوج» افتراضي للاختبار (المستخدم هو اللي بيكتبها في الحقيقة)
const LIB = [
  { id: 'fr', name: 'فريم 45', bar: 6000, weight: 0.9, cost: 600, price: 700, unit: 'عود' },
  { id: 'sa', name: 'ضلفة 45', bar: 6000, weight: 0.8, cost: 550, price: 650, unit: 'عود' },
  { id: 'il', name: 'إنترلوك', bar: 6000, cost: 300, unit: 'عود' },
  { id: 'st', name: 'حديد داخلي', bar: 6000, cost: 200, unit: 'عود' },
  { id: 'g6', name: 'زجاج 6 مم', cost: 250, price: 350, unit: 'م²', minArea: 0.25 },
  { id: 'g8', name: 'سيكوريت 8', cost: 600, price: 800, unit: 'م²' }
];
const SL = { id: 'sl', name: 'سحاب 45', material: 'alu', kerf: 4, roles: { frame: 'fr', sash: 'sa', interlock: 'il' }, rules: { sliding: [
  { kind: 'profile', role: 'frame', name: 'فريم أفقي', len: 'W', count: '2', angle: 45 }, { kind: 'profile', role: 'frame', name: 'فريم رأسي', len: 'H', count: '2', angle: 45 },
  { kind: 'profile', role: 'sash', name: 'ضلفة أفقي', len: '(W-40)/N+25', count: '2*N', angle: 45 }, { kind: 'profile', role: 'sash', name: 'ضلفة رأسي', len: 'H-45', count: '2*N', angle: 45 },
  { kind: 'profile', role: 'interlock', name: 'إنترلوك', len: 'H-45', count: '2*(N-1)', angle: 90 },
  { kind: 'glass', name: 'زجاج', w: '(W-40)/N+25-70', h: 'H-45-70', count: 'N' }, { kind: 'acc', name: 'رولر', qty: '2*M' }, { kind: 'gasket', name: 'جوان', qty: '2*N*(((W-40)/N-45)+(H-115))/1000' },
  { kind: 'mesh', name: 'سلك', w: 'W/N', h: 'H', count: '1', ifMesh: true }] } };
const CTX = { systems: [SL], lib: LIB };
const win = (o) => C.opening(Object.assign({ otype: 'sliding', sys: 'sl', unit: 'mm', glass: 'g6' }, o), CTX);

/* ---------- المعادلات ---------- */
test('المعادلات: أقواس وأولويات ومتغيرات وأخطاء من غير eval', () => {
  assert.equal(C.expr('(W-40)/N+25', { W: 1500, N: 2 }).value, 755);
  assert.equal(C.expr('2*(N-1)', { N: 3 }).value, 4);
  assert.equal(C.expr('W×2÷4', { W: 100 }).value, 50);
  assert.ok(!C.expr('W/0', { W: 1 }).ok); assert.ok(!C.expr('X+1', {}).ok); assert.ok(!C.expr('alert(1)', {}).ok); assert.ok(!C.expr('(W', { W: 1 }).ok);
});

/* ---------- الشبابيك ---------- */
test('شباك جرار صغير درفتين: أطوال القطع من قواعد النظام', () => {
  const o = win({ W: 1200, H: 1000, N: 2 });
  assert.equal(piece(o, 'ضلفة أفقي')[0].len, 605); // (1200−40)/2+25
  assert.equal(piece(o, 'ضلفة رأسي')[0].len, 955);
  assert.equal(piece(o, 'ضلفة أفقي')[0].count, 4);
  assert.equal(piece(o, 'إنترلوك')[0].count, 2);
  assert.equal(o.glass[0].w, 535); assert.equal(o.glass[0].h, 885); assert.equal(o.glass[0].count, 2);
  assert.equal(sug(o, 'a:رولر').qty, 4);
  assert.ok(close(o.area, 1.2));
});
test('شباك كبير 3 درف وأعداد متطابقة: العدد بيتضرب وخطة القص بالأعواد', () => {
  const o = win({ W: 3000, H: 1800, N: 3, qty: 2 });
  assert.equal(piece(o, 'ضلفة أفقي')[0].len, C.round((3000 - 40) / 3 + 25, 1));
  assert.equal(piece(o, 'ضلفة أفقي')[0].count, 2 * 3 * 2);
  const fr = o.profiles.find(p => p.libId === 'fr');
  assert.equal(fr.m, (3000 * 2 + 1800 * 2) * 2 / 1000);
  assert.ok(fr.bars >= Math.ceil(fr.m * 1000 / 6000)); assert.equal(sug(o, 'p:fr').unit, 'عود');
  assert.ok(close(o.metrics.m2, 10.8)); assert.equal(o.metrics.sash, 6);
});
test('درفة واحدة وثابت ومتحرك: M و F', () => {
  const o = win({ W: 1000, H: 1000, N: 2, M: 1 });
  assert.equal(sug(o, 'a:رولر').qty, 2);
  const v = C.vars({ W: 100, H: 100, unit: 'cm', N: 3, M: 1 }); assert.equal(v.F, 2); assert.equal(v.V, 2);
  const one = win({ W: 800, H: 800, N: 1 }); assert.equal(piece(one, 'إنترلوك').length, 0);
});
test('الوحدات: 150 سم = 1.5 م = 1500 مم بنفس النتيجة', () => {
  const a = win({ W: 1500, H: 1200, N: 2 }), b = C.opening({ otype: 'sliding', sys: 'sl', unit: 'cm', W: 150, H: 120, N: 2, glass: 'g6' }, CTX), c = C.opening({ otype: 'sliding', sys: 'sl', unit: 'm', W: 1.5, H: 1.2, N: 2, glass: 'g6' }, CTX);
  assert.deepEqual(a.pieces, b.pieces); assert.deepEqual(a.pieces, c.pieces);
});
test('زجاج مختلف: أقل مساحة للقطعة بتتحسب', () => {
  const o = win({ W: 600, H: 500, N: 2, glass: 'g6' }); // قطعة 230×385 = 0.0886 م² → بيتحسب 0.25
  assert.ok(close(sug(o, 'g:g6').qty, 0.5));
  const p = win({ W: 600, H: 500, N: 2, glass: 'g8' }); assert.ok(close(sug(p, 'g:g8').qty, 2 * 0.235 * 0.385, 0.001)); // 235 × 385 بعد خصومات النظام
});
test('قطاع مختلف / نظام تاني: نفس المقاس بأطوال مختلفة', () => {
  const other = { id: 'o', name: 'نظام تاني', material: 'alu', roles: {}, rules: { sliding: [{ kind: 'profile', role: 'sash', name: 'ضلفة أفقي', len: 'W/N+10', count: '2*N' }] } };
  const o = C.opening({ otype: 'sliding', sys: 'o', unit: 'mm', W: 1200, H: 1000, N: 2 }, { systems: [other], lib: LIB });
  assert.equal(o.pieces[0].len, 610); assert.notEqual(o.pieces[0].len, piece(win({ W: 1200, H: 1000, N: 2 }), 'ضلفة أفقي')[0].len);
  assert.ok(o.warn.some(w => /مش مربوط بقطاع/.test(w)));
});
test('سلك ناموسية بس لو متعلم', () => {
  assert.ok(!sug(win({ W: 1000, H: 1000, N: 2 }), 'mesh'));
  assert.ok(close(sug(win({ W: 1000, H: 1000, N: 2, mesh: true }), 'mesh').qty, 0.5));
});
test('معادلة غلط أو طول سالب → تنبيه ومن غير NaN', () => {
  const bad = { id: 'b', name: 'b', roles: {}, rules: { sliding: [{ kind: 'profile', role: 'frame', name: 'x', len: 'W-5000', count: '2' }, { kind: 'profile', role: 'frame', name: 'y', len: 'W/(', count: '2' }] } };
  const o = C.opening({ otype: 'sliding', sys: 'b', unit: 'mm', W: 1000, H: 1000 }, { systems: [bad], lib: [] });
  assert.equal(o.pieces.length, 0); assert.equal(o.warn.filter(w => /معادلة/.test(w)).length, 2);
});
test('القالب التقديري: هيكل بخصومات صفر ومعلّم إنه تقديري', () => {
  const t = C.template('casement', 'alu'); assert.ok(t.some(r => r.role === 'mullion')); assert.ok(!t.some(r => r.kind === 'steel'));
  const sys = { id: 'e', name: 'تقديري', estimate: true, roles: {}, rules: { casement: t } };
  const o = C.opening({ otype: 'casement', sys: 'e', unit: 'mm', W: 1500, H: 1200, N: 3, M: 1, T: 1 }, { systems: [sys], lib: [] });
  assert.ok(o.warn.some(w => /تقديري/.test(w)));
  assert.equal(o.pieces.find(p => p.name === 'قائم').count, 2);
  assert.equal(o.glass[0].count, 6); assert.equal(o.glass[0].h, 600);
});

/* ---------- الأبواب ---------- */
test('الأبواب: مفصلي، مزدوج، جرار، فولدنج، زجاج كامل، بتقسيمات', () => {
  const sys = { id: 'd', name: 'أبواب', roles: {}, rules: { door: C.template('door', 'alu'), sliding: C.template('sliding', 'alu'), folding: C.template('folding', 'alu') } };
  const ctx = { systems: [sys], lib: [] };
  const hinged = C.opening({ otype: 'door', sys: 'd', unit: 'cm', W: 90, H: 210, N: 1 }, ctx);
  assert.equal(hinged.acc.find(a => a.name === 'مفصلات').qty, 3); assert.ok(!hinged.acc.find(a => a.name === 'ترباس'));
  const dbl = C.opening({ otype: 'door', sys: 'd', unit: 'cm', W: 160, H: 220, N: 2 }, ctx);
  assert.equal(dbl.acc.find(a => a.name === 'مفصلات').qty, 6); assert.equal(dbl.acc.find(a => a.name === 'ترباس').qty, 1);
  const div = C.opening({ otype: 'door', sys: 'd', unit: 'cm', W: 90, H: 210, N: 1, T: 2 }, ctx);
  assert.equal(div.glass[0].count, 3); assert.equal(div.pieces.find(p => p.name === 'عرضي ضلفة').count, 2);
  const full = C.opening({ otype: 'door', sys: 'd', unit: 'cm', W: 90, H: 210, N: 1 }, ctx); assert.equal(full.glass[0].count, 1);
  const sld = C.opening({ otype: 'sliding', sys: 'd', unit: 'cm', W: 240, H: 220, N: 2, variant: 'باب جرار' }, ctx); assert.equal(sld.metrics.door, 1);
  const fold = C.opening({ otype: 'folding', sys: 'd', unit: 'cm', W: 400, H: 220, N: 4 }, ctx);
  assert.equal(fold.acc.find(a => a.name === 'مفصلات فولدنج').qty, 9); assert.equal(fold.glass[0].count, 4);
});

/* ---------- UPVC ---------- */
test('UPVC: Sliding و Casement و Tilt & Turn و Fixed بالحديد الداخلي', () => {
  ['sliding', 'casement', 'tilt', 'fixed'].forEach(t => {
    const sys = { id: 'u', name: 'UPVC 70', material: 'upvc', roles: { steel: 'st' }, rules: { [t]: C.template(t, 'upvc') } };
    const o = C.opening({ otype: t, sys: 'u', unit: 'cm', W: 120, H: 140, N: 2, M: t === 'fixed' ? 0 : 1 }, { systems: [sys], lib: LIB });
    const steel = o.pieces.filter(p => p.kind === 'steel');
    assert.ok(steel.length >= 1, t);
    assert.equal(steel[0].len, 2 * (1200 + 1400), t);
    assert.ok(sug(o, 'p:st'), t);
  });
});
test('زجاج مزدوج/مختلف في حاسبة الزجاج بقطع مختلفة', () => {
  const o = C.glass({ unit: 'cm', glass: 'g6', rows: [{ w: 100, h: 50, count: 2 }, { w: 40, h: 40, count: 1, glass: 'g8' }, { w: 10, h: 10, count: 1 }], waste: 10 }, { lib: LIB });
  assert.ok(close(o.area, 1 + 0.16 + 0.01));
  assert.ok(close(sug(o, 'g:g6').qty, (1 + 0.25) * 1.1)); // القطعة الصغيرة بتتحسب 0.25
  assert.ok(close(sug(o, 'g:g8').qty, 0.16 * 1.1));
});

/* ---------- Cut List ---------- */
test('Cut List: أطوال وأعداد متعددة، Kerf، بواقي وهالك', () => {
  const r = C.optimize([{ len: 2400, count: 2 }, { len: 1200, count: 3 }, { len: 800, count: 4 }], { bar: 6000, kerf: 4, trim: 10, minKeep: 300 });
  const all = r.bars.flatMap(b => b.items.map(i => i.len)).sort((a, b) => a - b);
  assert.deepEqual(all, [800, 800, 800, 800, 1200, 1200, 1200, 2400, 2400]);
  r.bars.forEach(b => assert.ok(b.pieces + b.kerf + b.trim + b.rest <= b.len + 0.01 && b.rest >= 0));
  assert.ok(r.count >= r.minBars); assert.equal(r.pieces, 9);
  assert.ok(close(r.used, 11600)); assert.ok(r.keep.length >= 1); assert.ok(r.bars.every(b => !b.keep || b.rest >= 300));
});
test('Cut List: Best Fit بيقلل الأعواد عن الترتيب العادي', () => {
  const r = C.optimize([{ len: 3000, count: 2 }, { len: 2900, count: 2 }, { len: 100, count: 2 }], { bar: 6000, kerf: 0 });
  assert.equal(r.count, 2);
});
test('Cut List: أعواد بأطوال مختلفة وبواقي بتتستخدم قبل العود الجديد', () => {
  const r = C.optimize([{ len: 1000, count: 3 }, { len: 4000, count: 1 }], { bar: 6000, kerf: 3, stock: [{ len: 1100, count: 2, remnant: true }, { len: 4500, count: 1 }] });
  assert.equal(r.bars.filter(b => b.src === 'remnant').length, 2);
  assert.equal(r.bars.find(b => b.items.some(i => i.len === 4000)).len, 4500);
  assert.equal(r.newBars, 1);
});
test('Cut List: قطعة أطول من العود → مش داخلة وتنبيه', () => {
  const o = C.cut({ unit: 'mm', bar: 6000, kerf: 3, pieces: [{ len: 6500, count: 1 }, { len: 1000, count: 2 }] }, {});
  assert.ok(o.warn.some(w => /أطول من العود/.test(w))); assert.equal(o.plan.pieces, 2);
});
test('Cut List من الحاسبة: احتياطي قطع وبواقي المخزن', () => {
  const o = C.cut({ unit: 'mm', bar: 6000, kerf: 4, spare: 10, pieces: [{ len: 1500, count: 10 }], useRemnants: true, prof: 'fr', minKeep: 500 }, { remnants: [{ profId: 'fr', len: 1600, count: 2 }, { profId: 'xx', len: 3000, count: 5 }] });
  assert.equal(o.plan.pieces, 11); assert.equal(o.plan.fromStock, 2);
  assert.equal(sug(o, 'bar').qty, o.plan.newBars);
});
test('عدد الأعواد السريع والهالك وعدد الضلف', () => {
  const b = C.bars({ unit: 'mm', bar: 6000, kerf: 5, pieces: [{ len: 1495, count: 8 }] }); assert.equal(sug(b, 'bar').qty, 2);
  const w = C.waste({ rows: [{ name: 'قطاعات', mode: 'pct', base: 20, value: 5, price: 600 }, { name: 'زجاج', mode: 'area', base: 10, value: 0.1, price: 300 }, { name: 'سيليكون', mode: 'manual', value: 50 }] });
  assert.equal(w.waste, 600 + 300 + 50);
  const s = C.sashes({ unit: 'cm', W: 300, maxSash: 120, overlap: 40 }); assert.equal(s.N, 3); assert.equal(s.sw, C.round((3000 + 80) / 3, 1));
});

/* ---------- واجهات وشتر وناموسية وشاور ---------- */
test('واجهة بتقسيمات مختلفة + ACP', () => {
  const o = C.facade({ unit: 'mm', W: 3900, H: 3000, cols: '1200,1500,1200', rows: '900,2100', glassDeduct: 20, acpRows: 1 });
  assert.equal(sug(o, 'mul').qty, 4 * 3); assert.equal(sug(o, 'tr').qty, 3 * 3.9);
  assert.ok(close(sug(o, 'acp').qty, (1180 * 880 + 1480 * 880 + 1180 * 880) / 1e6, 0.001));
  const bad = C.facade({ unit: 'mm', W: 4000, H: 3000, cols: '1200,1500' }); assert.ok(bad.warn.some(w => /مش مساوي/.test(w)));
  const a = C.acp({ unit: 'mm', W: 3000, H: 2000, mw: 1000, mh: 1000, ret: 25, sw: 1220, sh: 2440, waste: 10 });
  assert.equal(sug(a, 'acp').qty, Math.ceil(6 * 1.05 * 1.05 * 1.1 / (1.22 * 2.44)));
});
test('الشتر: الشرائح والجايد وتنبيه الموتور', () => {
  const o = C.shutter({ unit: 'cm', W: 200, H: 220, slatH: 55, extraSlats: 2, slatDeduct: 10, type: 'motor', kgm2: 4, motorCap: 15 });
  assert.ok(o.rows.some(r => /42 شريحة/.test(r[1]))); assert.ok(close(sug(o, 'gd').qty, 4.4));
  assert.ok(o.warn.some(w => /أكبر من قدرة الموتور/.test(w)));
});
test('الناموسية الجرار وكابينة الشاور', () => {
  const m = C.mosquito({ type: 'sliding', unit: 'cm', W: 60, H: 120, dw: 10, dh: 20, overlap: 15, qty: 2 });
  assert.ok(close(sug(m, 'mp').qty, 2 * (590 + 1180) * 2 / 1000)); assert.equal(sug(m, 'rol').qty, 4); assert.ok(close(sug(m, 'mesh').qty, 0.62 * 1.21 * 2, 0.001));
  const s = C.shower({ unit: 'cm', glass: 'g8', panels: [{ w: 80, h: 200, type: 'fixed' }, { w: 70, h: 200, type: 'door' }], hinges: 2 }, { lib: LIB });
  assert.ok(close(sug(s, 'g:g8').qty, 3)); assert.equal(sug(s, 'hin').qty, 2);
});

/* ---------- البند والتكلفة والمحاسبة ---------- */
test('تكلفة الشباك: قطاعات وزجاج وإكسسوارات ومصنعية وتكاليف داخلية وربح لكل قطعة', () => {
  const it = { kind: 'sliding', in: { sys: 'sl', unit: 'mm', W: 1500, H: 1200, N: 2, qty: 2, glass: 'g6' },
    lines: [{ name: 'فريم', qty: 2, unit: 'عود', cost: 600, price: 700, cat: 'profile' }, { name: 'زجاج', qty: 3, unit: 'م²', cost: 250, price: 350, cat: 'glass', wastePct: 10 }, { name: 'رولر', qty: 8, cost: 15, price: 25, cat: 'acc' }],
    labor: [{ name: 'تصنيع', method: 'window', price: 300 }, { name: 'تركيب', method: 'm2', price: 50, grp: 'install' }], icosts: [{ name: 'أجرة صنايعي', amount: 200 }] };
  const r = C.item(it, CTX);
  assert.equal(r.labor[0].qty, 2); assert.ok(close(r.labor[1].qty, 3.6));
  assert.equal(r.lines[1].final, 3.3);
  assert.equal(r.matCost, 1200 + 825 + 120); assert.equal(r.matSell, 1400 + 1155 + 200);
  assert.equal(r.laborT, 600 + 180); assert.equal(r.cost, 2145 + 200);
  assert.equal(r.total, 2755 + 780); assert.equal(r.unitProfit, C.money((3535 - 2345) / 2));
  assert.equal(r.costBy.glass, 825); assert.equal(r.wasteCost, 75);
});
test('تركيب فقط: الخامات برا السعر والتكلفة', () => {
  const r = C.item({ kind: 'custom', scope: 'install', lines: [{ qty: 10, cost: 100, price: 150 }], labor: [{ method: 'lump', price: 500 }] }, {});
  assert.equal(r.total, 500); assert.equal(r.cost, 0);
});
test('المشروع: مقايسة → خصم ومرتجع وإضافة وضريبة ودفعات متعددة وأجور العمال والمتبقي', () => {
  const j = { id: 'j1', items: [{ kind: 'custom', lines: [{ qty: 1, cost: 6000, price: 10000 }] }, { kind: 'custom', lines: [{ qty: 1, cost: 3000, price: 5000 }] }],
    costs: [{ type: 'transport', qty: 1, price: 400, billed: true }, { type: 'install', mode: 'amount', amount: 600 }],
    adjust: [{ type: 'add', amount: 1000 }, { type: 'return', amount: 500 }], discount: { type: 'percent', value: 10 }, tax: { pct: 14 },
    payments: [{ amount: 5000, method: 'نقدي', kind: 'مقدم' }, { amount: 3000, method: 'تحويل' }] };
  const r = C.job(j, { wlog: [{ jobId: 'j1', qty: 2, rate: 300 }, { jobId: 'other', amount: 999 }] });
  const sub = 15000 + 400 + 1000 - 500;
  assert.equal(r.subtotal, sub); assert.equal(r.discount, C.money(sub * 0.1)); assert.equal(r.tax, C.money(sub * 0.9 * 0.14));
  assert.equal(r.total, C.money(sub * 0.9 * 1.14)); assert.equal(r.paid, 8000); assert.equal(r.remaining, C.money(r.total - 8000));
  assert.equal(r.workers, 600); assert.equal(r.totalCost, 9000 + 400 + 600 + 600);
  assert.equal(r.profit, C.money(r.total - r.tax - r.totalCost));
  assert.equal(r.adds, 1000); assert.equal(r.returns, 500);
});
test('خطة قص المشروع: قطع كل الشبابيك على نفس القطاع مع البواقي', () => {
  const j = { items: [{ kind: 'sliding', title: 'ش1', in: { sys: 'sl', unit: 'mm', W: 1500, H: 1200, N: 2 } }, { kind: 'sliding', title: 'ش2', in: { sys: 'sl', unit: 'mm', W: 1000, H: 1000, N: 2 } }] };
  const plan = C.jobCut(j, Object.assign({ kerf: 4, useRemnants: true, remnants: [{ profId: 'fr', len: 2600, count: 1 }] }, CTX));
  const fr = plan.find(p => p.libId === 'fr');
  assert.equal(fr.plan.pieces, 8); assert.equal(fr.plan.fromStock, 1);
});
test('العمال: المستحق = الشغل − المدفوع والسلف', () => {
  const w = C.worker({ id: 'w1' }, [{ workerId: 'w1', qty: 5, rate: 300 }, { workerId: 'w1', amount: 500 }, { workerId: 'x', amount: 9 }], [{ workerId: 'w1', amount: 400, type: 'advance' }, { workerId: 'w1', amount: 600 }]);
  assert.equal(w.earned, 2000); assert.equal(w.paid, 1000); assert.equal(w.advances, 400); assert.equal(w.due, 1000);
});
test('السعر والربح والدفعات والتكلفة', () => {
  const p = C.price({ cost: 8000, mode: 'margin', value: 20, qty: 4 }); assert.equal(p.sell, 10000); assert.equal(p.profit, 2000);
  assert.equal(C.price({ cost: 8000, mode: 'markup', value: 25 }).sell, 10000);
  const pp = C.payplan({ total: 20000, paid: 5000, parts: [{ name: 'مقدم', pct: 50 }, { name: 'التركيب', pct: 30 }, { name: 'التسليم', amount: 4000 }] }); assert.ok(!pp.warn.length);
  assert.equal(C.mfg({ qty: 2, profiles: 1000, glass: 500, cut: 100 }).cost, 1600); assert.equal(C.install({ techs: 2, techRate: 400, helpers: 1, helperRate: 250, days: 2, transport: 300 }).cost, 1600 + 500 + 300);
});
test('قيم فاضية وسالبة ونصوص: مفيش NaN ولا Infinity', () => {
  const bad = { W: '-5', H: 'abc', N: '0', qty: '', w: '-1', h: '', count: '-3', len: 'x', bar: '0' };
  Object.keys(C.KIND_CALC).forEach(k => {
    const o = C.KIND_CALC[k](Object.assign({ otype: 'sliding', sys: 'sl', rows: [bad], pieces: [bad], panels: [bad], parts: [bad] }, bad), CTX);
    assert.ok(!/NaN|Infinity/.test(JSON.stringify(o)), k);
  });
  assert.ok(!/NaN|Infinity/.test(JSON.stringify(C.job({ items: [{ kind: 'sliding', in: bad, lines: [{ qty: '-1', cost: 'x' }] }] }, CTX))));
});
