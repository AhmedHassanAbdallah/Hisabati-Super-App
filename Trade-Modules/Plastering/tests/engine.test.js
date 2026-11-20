/*
 * اختبارات محرك الحسابات — مقارنة بالحساب اليدوي
 * التشغيل: node --test tests/
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../js/engine.js');

const close = (a, b, eps = 1e-6, msg) => assert.ok(Math.abs(a - b) <= eps, `${msg || ''} expected ${b} got ${a}`);

test('1) مساحة حوائط غرفة 5×4×3 مع خصم باب وشباك وإضافة الأكتاف', () => {
  // يدوياً: المحيط = 2×(5+4) = 18 م ، الحوائط = 18×3 = 54 م²
  // باب 0.9×2.1 = 1.89 م² ، شباك 1.2×1.2 = 1.44 م² → مجموع 3.33 م²
  // أكتاف الباب (جانبين + أعلى) بعمق 25 سم = (2×2.1 + 0.9)×0.25 = 1.275 م²
  // الصافي = 54 − 3.33 + 1.275 = 51.945 م²
  const m = E.measureCalc({
    mode: 'room', unit: 'm', room: { l: 5, w: 4, h: 3, walls: true, ceiling: false },
    openings: [{ name: 'باب', w: 0.9, h: 2.1, count: 1, reveal: 'door', depth: 25 }, { name: 'شباك', w: 1.2, h: 1.2, count: 1 }],
    rules: { mode: 'all' }
  });
  close(m.walls, 54); close(m.openings, 3.33); close(m.deducted, 3.33); close(m.reveals, 1.275); close(m.area, 51.945);
});

test('1ب) نفس الغرفة بالسنتيمتر + السقف + قواعد خصم مختلفة', () => {
  const base = { mode: 'room', unit: 'cm', room: { l: 500, w: 400, h: 300, walls: true, ceiling: true },
    openings: [{ name: 'باب', w: 90, h: 210, count: 1 }, { name: 'شباك', w: 120, h: 120, count: 2 }] };
  // السقف 20 م² + الحوائط 54 = 74 قبل الخصم ، الفتحات: 1.89 + 2×1.44 = 4.77
  let m = E.measureCalc(Object.assign({}, base, { rules: { mode: 'all' } }));
  close(m.ceiling, 20); close(m.area, 74 - 4.77);
  m = E.measureCalc(Object.assign({}, base, { rules: { mode: 'none' } }));
  close(m.area, 74);
  // خصم الفتحات الأكبر من 1.5 م² فقط: الباب 1.89 يُخصم، الشبابيك 1.44 لا
  m = E.measureCalc(Object.assign({}, base, { rules: { mode: 'above', threshold: 1.5 } }));
  close(m.deducted, 1.89);
  // خصم الزيادة عن 1 م²: (1.89−1) + 2×(1.44−1) = 0.89 + 0.88 = 1.77
  m = E.measureCalc(Object.assign({}, base, { rules: { mode: 'excess', threshold: 1 } }));
  close(m.deducted, 1.77);
  // خصم 50%: 4.77/2 = 2.385
  m = E.measureCalc(Object.assign({}, base, { rules: { mode: 'percent', percent: 50 } }));
  close(m.deducted, 2.385);
  // استثناء يدوي: الشباك "لا يخصم" مع قاعدة الخصم الكامل
  m = E.measureCalc(Object.assign({}, base, { rules: { mode: 'all' }, openings: [base.openings[0], Object.assign({}, base.openings[1], { deduct: 'no' })] }));
  close(m.deducted, 1.89);
});

test('1ج) مساحات غير منتظمة بالأشكال الهندسية', () => {
  // حائط 4×3 = 12 + مثلث (جملون) قاعدة 4 ارتفاع 1.5 = 3 + عمود 0.3×0.5 ارتفاع 3 = 2×0.8×3 = 4.8
  // − فتحة مستطيلة كمساحة سالبة 1×1 = 1 → 18.8
  const m = E.measureCalc({ mode: 'shapes', unit: 'm', shapes: [
    { type: 'rect', a: 4, b: 3 }, { type: 'tri', a: 4, h: 1.5 }, { type: 'column', a: 0.3, b: 0.5, h: 3 },
    { type: 'rect', a: 1, b: 1, sign: -1 }] });
  close(m.area, 18.8);
  close(E.shapeArea({ type: 'circle', a: 2 }, 'm'), Math.PI);
  close(E.shapeArea({ type: 'trap', a: 3, b: 5, h: 2 }, 'm'), 8);
  close(E.shapeArea({ type: 'beam', a: 0.25, b: 0.5, h: 4 }, 'm'), (0.25 + 1) * 4);
});

test('2) كمية المحارة الأسمنتية بالنسبة الحجمية', () => {
  // مساحة 100 م² ، سمك 20 مم ، طبقة واحدة → حجم رطب 2 م³
  // معامل جاف 1.27 → 2.54 م³ ، نسبة 1:4 → أسمنت 2.54/5 = 0.508 م³ × 1440 = 731.52 كجم
  // رمل 2.54×4/5 = 2.032 م³ ، هالك 5% → أسمنت 768.096 كجم = 15.36 شيكارة ← 16 شيكارة
  // رمل 2.1336 م³ ← 2.14 م³ (تقريب لأعلى لأقرب 0.01)
  const r = E.cementPlaster({ method: 'ratio', thickness: 20, layers: 1, ratio: 4, dryFactor: 1.27, density: 1440, bagKg: 50, waste: 5, cementPrice: 100, sandPrice: 300 }, 100);
  close(r.wetVolume, 2); close(r.dryVolume, 2.54); close(r.cementKg, 768.096, 1e-6); close(r.sandM3, 2.1336, 1e-9);
  assert.equal(r.bags, 16);
  close(r.materials[1].packs, 2.14);
});

test('2ب) المحارة بطريقة المحتوى (كجم أسمنت لكل م³ رمل) وعدد الطبقات', () => {
  // 50 م² × (10مم × 2 طبقة) = 1 م³ مونة ، رمل 1 م³ ، أسمنت 300 كجم = 6 شكاير بالظبط
  const r = E.cementPlaster({ method: 'content', thickness: 10, layers: 2, content: 300, sandPerM3: 1, bagKg: 50, waste: 0 }, 50);
  close(r.sandM3, 1); close(r.cementKg, 300); assert.equal(r.bags, 6);
});

test('2ج) المحارة الجاهزة حسب استهلاك المنتج', () => {
  // 40 م² × 15 مم × 1.4 كجم/م²/مم = 840 كجم + 5% = 882 كجم ÷ 25 = 35.28 ← 36 شيكارة
  const r = E.premixPlaster({ thickness: 15, layers: 1, kgPerMm: 1.4, bagKg: 25, waste: 5, price: 120 }, 40);
  close(r.kg, 882); assert.equal(r.bags, 36);
});

test('3) المعجون لعدة طبقات مع حالة السطح', () => {
  // 120 م² × 3 طبقات × 0.6 كجم = 216 كجم × سطح 1.15 × هالك 5% = 260.82 كجم ÷ 15 = 17.388 ← 18 بستلة
  const r = E.coverageCalc({ rateMode: 'perM2', rate: 0.6, coats: 3, packSize: 15, surface: 1.15, level: 1, waste: 5, price: 200 }, 120);
  close(r.qty, 260.82, 1e-9); assert.equal(r.packs, 18);
  // م² لكل وحدة: برايمر 10 م²/لتر، طبقة واحدة، 120 م² → 12 لتر ÷ 4 = 3 جالون بالظبط
  const p = E.coverageCalc({ rateMode: 'm2PerUnit', rate: 10, coats: 1, packSize: 4, waste: 0 }, 120);
  close(p.qty, 12); assert.equal(p.packs, 3);
});

test('4) عبوات الجرافيت والبرايمر حسب بيانات المنتج', () => {
  // 200 م² × 2.2 كجم/م² × هالك 7% = 470.8 كجم ÷ 25 = 18.83 ← 19 بستلة
  // برايمر 200 م² ÷ 8 م²/لتر = 25 لتر × 5% = 26.25 ÷ 4 = 6.56 ← 7 جالون
  const res = E.materialsFor({ type: 'graffiato',
    main: { rateMode: 'perM2', rate: 2.2, coats: 1, packSize: 25, waste: 7, price: 600 },
    primerOn: true, primer: { rateMode: 'm2PerUnit', rate: 8, coats: 1, packSize: 4, unit: 'لتر', waste: 5, price: 350 } }, 200);
  assert.equal(res.materials.length, 2);
  close(res.materials[0].qty, 470.8, 1e-9); assert.equal(res.materials[0].packs, 19);
  close(res.materials[1].qty, 26.25); assert.equal(res.materials[1].packs, 7);
  // المساحة القابلة للتنفيذ بـ 19 بستلة = 19×25/2.2 = 215.9 م²
  close(res.main.executable, 19 * 25 / 2.2, 1e-9);
  // منتج مختلف بمعدل مختلف يعطي نتيجة مختلفة (لا يوجد معدل موحد)
  const r2 = E.materialsFor({ type: 'graffiato', main: { rateMode: 'perM2', rate: 3, coats: 1, packSize: 30, waste: 0 }, primerOn: false }, 200);
  assert.equal(r2.materials.length, 1); assert.equal(r2.materials[0].packs, 20);
});

test('5) واجهة مقسمة لمناطق بتشطيبات مختلفة', () => {
  // الواجهة الرئيسية: عرض 12 × (4 أدوار × 3 م + دروة 1 م) = 12×13 = 156 م²
  //   فتحات: 8 شبابيك 1.2×1.5 = 14.4 م² تخصم → 141.6 م² جرافيت
  // السور: 30 م × 2 م = 60 م² دهان أكريليك
  const p = {
    id: 'p1', pricing: 'items',
    zones: [
      { id: 'z1', measure: { mode: 'facade', unit: 'm', facade: { width: 12, floors: 4, floorH: 3, extraH: 1, count: 1 }, openings: [{ w: 1.2, h: 1.5, count: 8 }], rules: { mode: 'all' } } },
      { id: 'z2', measure: { mode: 'shapes', unit: 'm', shapes: [{ type: 'rect', a: 30, b: 2 }] } }
    ],
    items: [
      { id: 'i1', zoneId: 'z1', unit: 'm2', supply: 'supply_install', laborRate: 90,
        calc: { type: 'graffiato', main: { rateMode: 'perM2', rate: 2, coats: 1, packSize: 25, waste: 0, price: 500 }, primerOn: false } },
      { id: 'i2', zoneId: 'z2', unit: 'm2', supply: 'labor', laborRate: 40,
        calc: { type: 'coverage', main: { rateMode: 'm2PerUnit', rate: 8, coats: 2, packSize: 9, waste: 0, price: 900 } } }
    ]
  };
  const pc = E.projectCalc(p, {});
  close(pc.zones.z1.area, 141.6, 1e-9); close(pc.zones.z2.area, 60);
  // بند الجرافيت: 141.6×2 = 283.2 كجم ← 12 بستلة × 500 = 6000 خامات + مصنعية 141.6×90 = 12744
  const g = pc.items[0].res;
  assert.equal(g.materials[0].packs, 12); close(g.matSell, 6000); close(g.labor, 12744); close(g.total, 18744);
  // بند السور مصنعية فقط: 60×40 = 2400، والخامات (60×2/8 = 15 لتر ← 2 بستلة) على العميل ولا تدخل الإجمالي
  const s = pc.items[1].res;
  close(s.total, 2400); assert.equal(s.materials[0].packs, 2); close(s.matCostClient, 1800);
  close(pc.contract, 21144);
});

test('6) أطوال الكرانيش وتحويلها لمسطح', () => {
  // 3 أدوار × 12 م + 2 جانب × 8 م = 36 + 16 = 52 م.ط ، تنمية 45 سم → 23.4 م²
  const m = E.measureCalc({ mode: 'linear', unit: 'm', linear: [{ len: 12, count: 3 }, { len: 8, count: 2 }], girth: 45 });
  close(m.linear, 52); close(m.area, 23.4);
  // محاسبة بالمتر الطولي: 52 × 75 = 3900 ، والخامات محسوبة على المسطح 23.4 م²
  const r = E.itemCalc({ unit: 'lm', supply: 'labor', laborRate: 75, measure: { mode: 'linear', unit: 'm', linear: [{ len: 12, count: 3 }, { len: 8, count: 2 }], girth: 45 },
    calc: { type: 'cement', cement: { method: 'ratio', thickness: 25, ratio: 3, dryFactor: 1.27, density: 1440, bagKg: 50 } } });
  close(r.qty, 52); close(r.labor, 3900);
  // 23.4 × 0.025 = 0.585 م³ × 1.27 = 0.74295 ÷ 4 × 1440 = 267.462 كجم ← 6 شكاير
  assert.equal(r.materials[0].packs, 6);
  // سنتيمتر: 1200 سم × 3 = 36 م
  close(E.measureCalc({ mode: 'linear', unit: 'cm', linear: [{ len: 1200, count: 3 }] }).linear, 36);
});

test('7) السقالات والنقل والمصروفات وتكاليف الموقع', () => {
  const p = { id: 'p2', pricing: 'items', zones: [], items: [
    { id: 'a', unit: 'day', qtyManual: 10, laborRate: 150, supply: 'labor', calc: { type: 'none' } },   // إيجار سقالة 10 أيام × 150
    { id: 'b', unit: 'lump', qtyManual: '', laborRate: 800, supply: 'labor', calc: { type: 'none' } },   // نقل مقطوعية 800
    { id: 'c', unit: 'm2', useManual: true, qtyManual: 100, laborRate: 5, supply: 'labor', calc: { type: 'none' } } // حماية 100 م² × 5
  ], expenses: [
    { amount: 1000, category: 'سقالات' }, { amount: 300, category: 'نقل' }, { amount: 200, category: 'مصروفات طارئة', paid: false }
  ] };
  const pc = E.projectCalc(p, {});
  close(pc.contract, 1500 + 800 + 500);
  close(pc.expenses, 1500); close(pc.expByCat['سقالات'], 1000);
  close(pc.cashOut, 1300); // الطارئ غير مدفوع بعد
});

test('8) مصنعية وخامات المشروع وطرق التوريد', () => {
  const calc = { type: 'coverage', main: { rateMode: 'perM2', rate: 1, coats: 1, packSize: 10, waste: 0, price: 100, sell: 120 } };
  const base = { unit: 'm2', laborRate: 20, measure: { mode: 'manual', manual: { area: 50 } }, calc };
  // 50 م² → 50 كجم = 5 عبوات
  const labor = E.itemCalc(Object.assign({}, base, { supply: 'labor' }));
  close(labor.total, 1000); close(labor.matCost, 0);
  const supply = E.itemCalc(Object.assign({}, base, { supply: 'supply' }));
  close(supply.total, 600); close(supply.matCost, 500); close(supply.labor, 0);
  const full = E.itemCalc(Object.assign({}, base, { supply: 'supply_install' }));
  close(full.total, 1600); close(full.unitPrice, 32);
  // هامش ربح على الخامات بدون سعر بيع محدد: 100 × 1.1 = 110
  const mk = E.itemCalc(Object.assign({}, base, { supply: 'supply_install', matMarkup: 10, calc: { type: 'coverage', main: Object.assign({}, calc.main, { sell: '' }) } }));
  close(mk.matSell, 550);
  // بالمتر المكعب: 50 م² × 20 مم = 1 م³ × 400 = 400
  const m3 = E.itemCalc({ unit: 'm3', laborRate: 400, supply: 'labor', measure: { mode: 'manual', manual: { area: 50 } }, calc: { type: 'cement', cement: { thickness: 20, layers: 1, ratio: 4, dryFactor: 1.27 } } });
  close(m3.qty, 1); close(m3.total, 400);
});

test('9) الدفعات والمتبقي والربح', () => {
  const p = {
    id: 'p3', pricing: 'items', discount: 500, matCostMode: 'estimate',
    zones: [], items: [
      { id: 'x', unit: 'm2', supply: 'supply_install', laborRate: 100, progress: 50, measure: { mode: 'manual', manual: { area: 100 } },
        calc: { type: 'coverage', main: { rateMode: 'perM2', rate: 1, coats: 1, packSize: 10, waste: 0, price: 200, sell: 250 } } }
    ],
    payments: [{ amount: 5000 }, { amount: 3000 }],
    expenses: [{ amount: 400, category: 'نقل' }, { amount: 999, category: 'خامات' }],
    labor: [{ workerId: 'w1', days: 10, rate: 300 }, { workerId: 'w2', fixed: true, amount: 1000 }]
  };
  // البند: مصنعية 10000 + خامات 10 عبوات × 250 = 2500 → 12500 − خصم 500 = 12000
  const pc = E.projectCalc(p, { workerPays: [{ workerId: 'w1', projectId: 'p3', amount: 2000 }] });
  close(pc.contract, 12500); close(pc.net, 12000); close(pc.received, 8000); close(pc.remaining, 4000);
  // التكاليف (تقديري): خامات 2000 + يوميات 4000 + نقل 400 (مشتريات الخامات 999 لا تُحسب مرتين) = 6400
  close(pc.wages, 4000); close(pc.costs, 6400); close(pc.profit, 5600);
  close(pc.wagesPaid, 2000); close(pc.wagesDue, 2000);
  // نقدي: المقبوض 8000 − (مصروفات 1399 + عمال 2000) = 4601
  close(pc.cashBalance, 8000 - 1399 - 2000);
  // الوضع الفعلي: خامات = مصروف من المخزن + مشتريات مسجلة
  const p2 = Object.assign({}, p, { matCostMode: 'actual' });
  const pc2 = E.projectCalc(p2, { materials: [{ id: 'm1', buyPrice: 200 }], movements: [{ materialId: 'm1', projectId: 'p3', type: 'issue', qty: 12 }, { materialId: 'm1', projectId: 'p3', type: 'return', qty: 1 }] });
  close(pc2.issuedValue, 2200); close(pc2.matCost, 2200 + 999); close(pc2.profit, 12000 - (3199 + 4000 + 400));
  // المستخلص: منفذ 50% من 12500 = 6250 − نصيبه من الخصم 250 = 6000 − المدفوع 8000
  close(pc.doneValue, 6000); close(pc.certificateDue, -2000);
  // مقاولة كاملة
  const pc3 = E.projectCalc(Object.assign({}, p, { pricing: 'lump', lumpPrice: 20000 }), {});
  close(pc3.net, 19500); close(pc3.remaining, 11500);
});

test('10ب) المخزن: الرصيد والقيمة والتنبيه', () => {
  const mat = { id: 'c', buyPrice: 100, openQty: 5, minQty: 10 };
  const mv = [
    { materialId: 'c', type: 'purchase', qty: 20, price: 95 },
    { materialId: 'c', type: 'issue', qty: 12, projectId: 'p' },
    { materialId: 'c', type: 'sale', qty: 3, price: 130 },
    { materialId: 'c', type: 'waste', qty: 1 },
    { materialId: 'c', type: 'adjust', qty: -1 }
  ];
  const s = E.stockFor(mat, mv);
  close(s.qty, 5 + 20 - 12 - 3 - 1 - 1); // 8
  close(s.value, 800); assert.equal(s.low, true);
  close(s.salesValue, 390); close(s.salesProfit, 390 - 300);
});

test('العمال: الأيام والمستحق', () => {
  const w = { id: 'w1' };
  const r = E.workerCalc(w, [{ labor: [{ workerId: 'w1', days: 6, rate: 250 }, { workerId: 'w1', days: 2, rate: 250, extra: 100 }] }],
    [{ workerId: 'w1', amount: 500, type: 'advance' }, { workerId: 'w1', amount: 1000 }]);
  close(r.days, 8); close(r.earned, 2100); close(r.paid, 1500); close(r.due, 600); close(r.advances, 500);
});

test('المدخلات العربية والفارغة لا تكسر الحساب', () => {
  close(E.n('٢٫٥'.replace('٫', '.')), 2.5);
  close(E.n('3,5'), 3.5);
  close(E.n(''), 0);
  const m = E.measureCalc({ mode: 'room', room: { l: '', w: '', h: '' } });
  close(m.area, 0);
  const r = E.itemCalc({});
  close(r.total, 0);
});
