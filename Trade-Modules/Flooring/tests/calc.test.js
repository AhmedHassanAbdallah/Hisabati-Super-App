// اختبارات محرك الحسابات بحالات واقعية — التشغيل: node --test tests/
const test = require('node:test');
const assert = require('node:assert/strict');
const Calc = require('../js/calc.js');
const Fin = require('../js/finance.js');

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, `${a} ≠ ${b}`);

test('أرقام: تحويل الأرقام العربية والفاصلة وعدم قبول السالب', () => {
  assert.equal(Calc.n('١٢٫٥'), 12.5);
  assert.equal(Calc.n('3,5'), 3.5);
  assert.equal(Calc.nn(-4), 0);
  assert.equal(Calc.n('abc'), 0);
  assert.equal(Calc.round(0.1 + 0.2, 2), 0.3);
  assert.equal(Calc.ceilSafe(10.0000000001), 10);
  assert.equal(Calc.ceilSafe(10.01), 11);
});

test('حاسبة المساحات: غرفة 4×5 مع خصم باب وحوائط مع خصم شباك', () => {
  const room = Calc.areaEntry({ shape: 'rect', dims: { l: 4, w: 5 } });
  assert.equal(room.net, 20);
  assert.equal(room.perimeter, 18);
  const walls = Calc.areaEntry({ kind: 'wall', shape: 'walls', dims: { l: 4, w: 5, h: 3 }, deductions: [{ name: 'باب', w: 0.9, h: 2.1 }, { name: 'شباك', w: 1.2, h: 1.2, count: 2 }] });
  near(walls.gross, 54);
  near(walls.deduct, 1.89 + 2.88);
  near(walls.net, 54 - 4.77);
  const t = Calc.areaTotals([{ kind: 'floor', shape: 'rect', dims: { l: 4, w: 5 } }, { kind: 'floor', shape: 'triangle', dims: { b: 2, h: 3 } }, { kind: 'wall', shape: 'wall', dims: { l: 3, h: 2.5 }, count: 2 }]);
  near(t.byKind.floor, 23);
  near(t.byKind.wall, 15);
  near(t.total, 38);
  const over = Calc.areaEntry({ shape: 'rect', dims: { l: 1, w: 1 }, deductions: [{ w: 2, h: 2 }] });
  assert.equal(over.net, 0);
  assert.equal(over.overDeducted, true);
  near(Calc.shapeArea('circle', { d: 2 }), Math.PI);
  near(Calc.shapeArea('trapezoid', { a: 3, b: 5, h: 2 }), 8);
});

test('حاسبة السلالم: 15 درجة عرض 1.2م نائمة 30سم قائمة 16سم', () => {
  const s = Calc.stairs({ steps: 15, width: 1.2, tread: 30, riser: 16, skirtSides: 2, skirtType: 'stepped' });
  near(s.treadArea, 5.4);
  near(s.riserArea, 2.88);
  near(s.totalArea, 8.28);
  near(s.nosingLm, 18);
  near(s.skirtingLm, 2 * 15 * 0.46);
  const s2 = Calc.stairs({ steps: 10, width: 1, tread: 30, riser: 16, includeRisers: false, skirtSides: 1, skirtType: 'sloped', landingL: 1.2, landingW: 1 });
  near(s2.riserArea, 0);
  near(s2.landingArea, 1.2);
  near(s2.totalArea, 3 + 1.2);
  near(s2.skirtingLm, 10 * Math.sqrt(0.09 + 0.0256), 1e-3);
});

test('حاسبة البلاط: بورسلين 60×60 كرتونة 4 قطع، 25م² وهالك 10%', () => {
  const r = Calc.tiles({ tileL: 60, tileW: 60, pcsPerBox: 4, area: 25, waste: 10, priceMode: 'box', price: 400, laborPrice: 120 });
  assert.ok(r.ok);
  near(r.tileArea, 0.36);
  near(r.boxArea, 1.44);
  near(r.neededArea, 27.5);
  assert.equal(r.tilesNeeded, 77);   // 27.5 / 0.36 = 76.39 ← 77
  assert.equal(r.boxes, 20);          // 27.5 / 1.44 = 19.1 ← 20
  assert.equal(r.tilesBought, 80);
  near(r.purchasedArea, 28.8);
  near(r.extraArea, 3.8);
  near(r.material, 8000);
  near(r.labor, 3000);               // المصنعية على المساحة الصافية
  near(r.total, 11000);
});

test('حاسبة البلاط: مساحة الكرتونة المكتوبة على العلبة + سعر بالمتر + حالة حد عشري دقيق', () => {
  const r = Calc.tiles({ tileL: 30, tileW: 30, pcsPerBox: 11, boxArea: 1, area: 10, waste: 0, priceMode: 'sqm', price: 150 });
  assert.equal(r.boxes, 10);          // 10 / 1 = 10 بالظبط بدون تقريب زائد
  near(r.material, 1500);
  const exact = Calc.tiles({ tileL: 60, tileW: 60, pcsPerBox: 4, area: 14.4, waste: 0 });
  assert.equal(exact.boxes, 10);      // 14.4 / 1.44 = 10 (مش 11 بسبب كسور عشرية)
  assert.equal(exact.tilesNeeded, 40);
  const bad = Calc.tiles({ area: 10 });
  assert.equal(bad.ok, false);
});

test('حاسبة الباركيه: 40م² عبوة 2.4م² هالك 10% فوم 10م² وزرة 2.4م', () => {
  const r = Calc.parquet({ area: 40, waste: 10, packArea: 2.4, perPack: 8, priceMode: 'pack', price: 900, foamRoll: 10, foamPrice: 150, perimeter: 28, doors: 2, skirtLen: 2.4, skirtWaste: 5, skirtPrice: 80, laborPrice: 60, skirtLabor: 15 });
  assert.ok(r.ok);
  near(r.neededArea, 44);
  assert.equal(r.packs, 19);          // 44 / 2.4 = 18.33 ← 19
  assert.equal(r.planks, 152);
  near(r.purchasedArea, 45.6);
  assert.equal(r.foamRolls, 4);
  near(r.skirtLm, 26);
  assert.equal(r.skirtPieces, 12);    // 26 × 1.05 / 2.4 = 11.375 ← 12
  near(r.cost.flooring, 17100);
  near(r.material, 17100 + 600 + 960);
  near(r.labor, 2400 + 390);
});

test('حاسبة الإنترلوك: 100م² 50 قطعة/م² هالك 5% رمل 5سم سن 15سم حفر 25سم', () => {
  const r = Calc.interlock({ area: 100, perSqm: 50, waste: 5, priceMode: 'piece', price: 6, sandThk: 5, baseThk: 15, excDepth: 25, excPrice: 40, sandPrice: 200, basePrice: 250, curbLen: 40, curbPiece: 50, curbPrice: 35, laborPrice: 45, curbLabor: 20, transport: 500 });
  assert.ok(r.ok);
  assert.equal(r.pieces, 5250);
  near(r.excVol, 25);
  near(r.sandVol, 5);
  near(r.baseVol, 15);
  assert.equal(r.curbPieces, 80);
  near(r.cost.pavers, 31500);
  near(r.material, 31500 + 1000 + 3750 + 2800);
  near(r.labor, 4500 + 800 + 1000);
  near(r.total, 39050 + 6300 + 500);
  const bySize = Calc.interlock({ area: 10, pieceL: 20, pieceW: 10 });
  near(bySize.perSqm, 50);
  const factor = Calc.interlock({ area: 10, perSqm: 40, sandThk: 5, factor: 1.25 });
  near(factor.sandVol, 0.625);
});

test('حاسبة الرخام: قطع بمقاسات + هالك + وزن + تقطيع وجلي', () => {
  const r = Calc.marble({ pieces: [{ l: 120, w: 60, count: 10 }, { l: 60, w: 30, count: 4 }], thickness: 2, waste: 10, price: 900, cutLm: 12, cutPrice: 25, polishArea: 8, polishPrice: 60, edgeLm: 6, edgePrice: 90, laborPrice: 150, transport: 300 });
  near(r.netArea, 7.92);
  near(r.purchaseArea, 8.712);
  near(r.weightTon, 8.712 * 0.02 * 2.7, 1e-3);
  near(r.cost.stone, 7840.8);
  near(r.labor, 300 + 480 + 540 + 1188);
  assert.equal(r.pieceCount, 14);
});

test('حاسبة اللاصق والترويبة: معدل يدوي + معادلة الترويبة', () => {
  const a = Calc.adhesive({ area: 50, rate: 5, packSize: 25, waste: 5, packPrice: 180 });
  near(a.qty, 262.5);
  assert.equal(a.packs, 11);
  near(a.cost, 1980);
  near(Calc.groutRate(60, 60, 3, 9, 1.6), 0.144, 1e-9);
  const g = Calc.adhesive({ area: 50, mode: 'grout', tileL: 60, tileW: 60, joint: 3, depth: 9, packSize: 5, waste: 10 });
  near(g.qty, 7.92, 1e-6);
  assert.equal(g.packs, 2);
  assert.equal(Calc.adhesive({ area: 10 }).ok, false); // لازم يكتب المعدل — مفيش استهلاك ثابت مفترض
});

test('طرق المحاسبة: متر مربع، متر طولي، قطعة، يومية، مقطوعية، مرحلة، توريد فقط، توريد وتركيب', () => {
  near(Calc.item({ basis: 'measure', scope: 'labor', qty: 85.5, laborPrice: 110 }).total, 9405);
  near(Calc.item({ basis: 'measure', unit: 'م.ط', scope: 'labor', qty: 42, laborPrice: 35 }).total, 1470);
  near(Calc.item({ basis: 'measure', unit: 'قطعة', scope: 'labor', qty: 16, laborPrice: 250 }).total, 4000);
  const d = Calc.item({ basis: 'daily', scope: 'labor', workers: 3, days: 4, wage: 450 });
  near(d.total, 5400);
  near(Calc.item({ basis: 'daily', workers: 0, days: 4, wage: 450 }).total, 0);
  near(Calc.item({ basis: 'lump', scope: 'labor', amount: 3500 }).total, 3500);
  const st = Calc.item({ basis: 'stage', scope: 'labor', amount: 20000, progress: 40 });
  near(st.total, 20000); near(st.executed, 8000);
  const sup = Calc.item({ basis: 'measure', scope: 'supply', qty: 30, laborPrice: 100, materialPrice: 300 });
  near(sup.labor, 0); near(sup.material, 9000);
  const both = Calc.item({ basis: 'measure', scope: 'both', qty: 30, laborPrice: 100, materialPrice: 300 });
  near(both.labor, 3000); near(both.material, 9000); near(both.total, 12000); near(both.unitPrice, 400);
  assert.equal(Calc.METHODS.length, 14);
});

test('المستند: خصم وإضافات ومدفوع، والمستخلص', () => {
  const t = Calc.docTotals({ rows: [{ qty: 50, price: 120 }, { qty: 20, price: 40 }], additions: [{ name: 'نقل', amount: 300 }], discount: 100, paid: 2000 });
  near(t.subtotal, 6800); near(t.total, 7000); near(t.remaining, 5000);
  const x = Calc.docTotals({ type: 'extract', rows: [{ qty: 60, price: 120 }], previous: 3000, deductions: 200, paid: 0 });
  near(x.total, 7200); near(x.due, 4000);
  const big = Calc.docTotals({ rows: [{ qty: 1, price: 100 }], discount: 500 });
  near(big.total, 0); // الخصم لا يتجاوز الإجمالي
});

test('مشروع متكامل: أكتر من نوع أرضيات وأكتر من طريقة حساب، والربح من غير احتساب مزدوج', () => {
  const db = {
    customers: [{ id: 'c1', name: 'عميل' }],
    projects: [{
      id: 'p1', customerId: 'c1', status: 'progress',
      items: [
        { name: 'تركيب بورسلين أرضيات', basis: 'measure', scope: 'labor', unit: 'م²', qty: 80, laborPrice: 120 },
        { name: 'وزرات', basis: 'measure', scope: 'labor', unit: 'م.ط', qty: 60, laborPrice: 25 },
        { name: 'سلم رخام', basis: 'measure', scope: 'both', unit: 'درجة', qty: 14, laborPrice: 200, materialPrice: 650 },
        { name: 'نقل', basis: 'lump', scope: 'labor', amount: 500 },
        { name: 'تكسير قديم', basis: 'daily', scope: 'labor', workers: 2, days: 1, wage: 400 }
      ],
      additions: [{ name: 'تشطيب ترويبة', amount: 300 }], discount: 200
    }, { id: 'p2', customerId: 'c1', status: 'cancelled', items: [{ basis: 'lump', amount: 99999 }] }],
    payments: [{ id: 'y1', projectId: 'p1', amount: 10000 }, { id: 'y2', customerId: 'c1', amount: 1000 }],
    projectMaterials: [
      { projectId: 'p1', materialId: 'm1', qty: 10, unitCost: 120, ownership: 'mine' },
      { projectId: 'p1', name: 'بورسلين العميل', qty: 60, unitCost: 300, ownership: 'client' }
    ],
    workLogs: [{ workerId: 'w1', projectId: 'p1', days: 5, wage: 400 }, { workerId: 'w1', projectId: null, days: 1, wage: 400 }],
    workerTxns: [{ workerId: 'w1', kind: 'advance', amount: 500 }, { workerId: 'w1', kind: 'pay', amount: 1000 }],
    expenses: [{ projectId: 'p1', category: 'transport', amount: 350 }, { projectId: null, category: 'admin', amount: 100 }],
    materials: [{ id: 'm1', name: 'لاصق', unit: 'شيكارة', buyPrice: 120, sellPrice: 160, openingStock: 50, minStock: 30 }],
    stockMoves: [{ materialId: 'm1', type: 'purchase', qty: 20 }, { materialId: 'm1', type: 'waste', qty: 2 }],
    docs: [
      { id: 'd1', type: 'labor', projectId: 'p1', rows: [{ qty: 80, price: 120 }] },                        // مربوطة بمشروع = لا تُحسب مرتين
      { id: 'd2', type: 'supply', customerId: 'c1', rows: [{ qty: 5, price: 160, materialId: 'm1' }], paid: 300 } // بيع منفصل من المخزن
    ]
  };
  const f = Fin.projectFinance(db, db.projects[0]);
  near(f.items.labor, 9600 + 1500 + 2800 + 500 + 800);
  near(f.items.material, 9100);
  near(f.value, 15200 + 9100 + 300 - 200);
  near(f.materialsCost, 1200);          // خامات العميل تكلفتها صفر
  near(f.wages, 2000);
  near(f.expenses, 350);
  near(f.cost, 3550);
  near(f.profit, 24400 - 3550);
  near(f.remaining, 24400 - 10000);
  assert.equal(Fin.projectFinance(db, db.projects[1]).value, 0); // الملغي لا يُحسب
  // المخزون: 50 + 20 − 2 − 10 (مشروع) − 5 (بيع) = 53
  assert.equal(Fin.stockOf(db, 'm1'), 53);
  const inv = Fin.inventory(db);
  near(inv.value, 53 * 120);
  assert.equal(inv.lowCount, 0);
  const w = Fin.workerBalance(db, { id: 'w1' });
  near(w.earned, 2400); near(w.due, 900);
  const acc = Fin.customerAccount(db, db.customers[0]);
  near(acc.value, 24400 + 800);
  near(acc.paid, 10000 + 1000 + 300);
  near(acc.balance, 25200 - 11300);
  const dash = Fin.dashboard(db);
  near(dash.revenue, 24400 + 800);        // الفاتورة d1 ما اتحسبتش تاني
  near(dash.costs, 3550 + 600 + 100 + 400);
  near(dash.profit, 25200 - 4650);
  near(dash.due, 13900);
  assert.equal(dash.active, 1);
  const st = Fin.customerStatement(db, db.customers[0]);
  near(st.lines[st.lines.length - 1].balance, 13900);
});

test('تحويل بنود المشروع لفاتورة مصنعية / توريد / توريد وتركيب / مستخلص', () => {
  const p = { items: [
    { name: 'بلاط', basis: 'measure', scope: 'both', unit: 'م²', qty: 20, laborPrice: 100, materialPrice: 250 },
    { name: 'هدم', basis: 'daily', scope: 'labor', workers: 2, days: 2, wage: 300 },
    { name: 'مرحلة 1', basis: 'stage', scope: 'labor', amount: 10000, progress: 50 }
  ] };
  const lab = Fin.rowsFromProject(p, 'labor');
  assert.equal(lab.length, 3);
  near(Calc.docTotals({ rows: lab }).total, 2000 + 1200 + 10000);
  const sup = Fin.rowsFromProject(p, 'supply');
  assert.equal(sup.length, 1); near(sup[0].price, 250);
  const both = Fin.rowsFromProject(p, 'both');
  near(Calc.docTotals({ rows: both }).total, 7000 + 1200 + 10000);
  const x = Fin.rowsFromProject(p, 'extract');
  near(Calc.docTotals({ rows: x }).total, 7000 + 1200 + 5000);
});
