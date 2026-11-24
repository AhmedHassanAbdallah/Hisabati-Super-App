#!/usr/bin/env node
/*
 * اختبارات حساباتي السباكة
 *   node tests/run-tests.js              (منطق الحسابات + اختبارات المتصفح الكاملة)
 *   node tests/run-tests.js --no-browser (منطق الحسابات فقط — بيشتغل في CI)
 * © 2026 أحمد حسن عبدالله - جميع الحقوق محفوظة.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const http = require('http');

const ROOT = path.join(__dirname, '..');
const OUT = process.env.TEST_OUT || path.join(ROOT, 'tests', 'output');
const NSP = 'hesabati_plumbing_';
let passed = 0, failed = 0;
const fails = [];
function check(name, cond, extra) {
  if (cond) { passed++; console.log('  ✔ ' + name); }
  else { failed++; fails.push(name); console.log('  ✘ ' + name + (extra !== undefined ? '  → ' + JSON.stringify(extra) : '')); }
}
const eq = (a, b) => Math.abs(Number(a) - Number(b)) < 1e-9;

/* =========================================================
   1) منطق الحسابات (بدون متصفح)
   ========================================================= */
function logicTests() {
  console.log('\n[1] منطق الحسابات');
  const store = {};
  const noop = () => {};
  const el = null;
  const sandbox = {
    console, Math, JSON, Date, Number, String, Array, Object, Set, Promise, isFinite, parseFloat, parseInt, setTimeout, clearTimeout,
    location: { pathname: '/Hesabaty-plumbing/', protocol: 'https:' }, history: { pushState: noop, replaceState: noop, back: noop, go: noop },
    navigator: {}, requestAnimationFrame: noop,
    localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; }, key: i => Object.keys(store)[i], get length() { return Object.keys(store).length; } },
    document: { getElementById: () => el, querySelectorAll: () => [], querySelector: () => el, documentElement: { style: { setProperty: noop }, setAttribute: noop, removeAttribute: noop }, body: { classList: { add: noop, remove: noop }, style: {} }, addEventListener: noop, activeElement: null }
  };
  sandbox.window = sandbox;
  sandbox.addEventListener = noop;
  vm.createContext(sandbox);
  const files = ['core', 'catalog', 'docs', 'customers', 'modules', 'calc', 'print'].map(f => fs.readFileSync(path.join(ROOT, 'js', f + '.js'), 'utf8'));
  const testCode = `
    const R = {};
    const L = o => normalizeLine(o);
    const S0 = (tab, o) => Object.assign(JSON.parse(JSON.stringify(calcState[tab])), o);
    normalizeSettings();
    // ---- النقاط: 10 × 300 = 3000
    R.points = CALC.points({ rows: [{ name: 'نقطة حوض', qty: 10, price: 300 }] }).total;
    R.pointsLine = lineTotal(L({ name: 'نقطة حوض', method: 'point', kind: 'service', qty: 10, price: 300 }));
    // ---- المواسير: 20 م × 100 = 2000
    R.pipes = CALC.pipes({ segs: [{ len: 20, lines: 1, waste: 0, price: 100, labor: 0, bar: 0 }], fits: [] }).total;
    R.pipesLine = lineTotal(L({ name: 'ماسورة PPR', method: 'meter', kind: 'material', qty: 20, price: 100 }));
    R.pipes2Lines = lineTotal(L({ name: 'خط مياه باردة', method: 'meter', kind: 'service', qty: 20, mult: 2, price: 100 }));
    // الهالك وطول العود: 20 م + 10% = 22 م — عود 4 م = 6 أعواد
    const seg = CALC.pipeSeg({ len: 20, lines: 1, waste: 10, price: 100, labor: 15, bar: 4 });
    R.segRequired = seg.required; R.segMaterial = seg.material; R.segBars = seg.bars; R.segBuyLen = seg.buyLen; R.segLabor = seg.labor;
    R.segNoBar = CALC.pipeSeg({ len: 20, lines: 1, waste: 10, price: 100, labor: 0, bar: 0 }).bars;
    // ---- القطع: 5 محابس × 150 = 750
    R.fits = CALC.pipes({ segs: [], fits: [{ name: 'محبس', qty: 5, price: 150 }] }).total;
    R.fitsLine = lineTotal(L({ name: 'محبس', method: 'piece', kind: 'fitting', qty: 5, price: 150 }));
    // ---- الحمام: تأسيس 5000 + تركيب أدوات 1500 = 6500
    const bs = S0('bath', { mode: 'stages', feed: 3000, drain: 2000, fixtures: 1500 });
    R.bathRough = CALC.bath(bs).rough; R.bath = CALC.bath(bs).total;
    R.bathWhole = CALC.bath(S0('bath', { mode: 'whole', whole: 6500 })).total;
    calcState.bath = bs; R.bathLines = calcLines('bath').map(L).reduce((s, l) => s + lineTotal(l), 0); R.bathLinesN = calcLines('bath').length;
    R.bathLine = lineTotal(L({ name: 'تأسيس حمام', method: 'bath', kind: 'service', qty: 2, price: 5000 }));
    // ---- المطبخ
    R.kitchenDetail = CALC.kitchen(S0('kitchen', { mode: 'detail', sink: 1, pSink: 300, mixer: 1, pMixer: 200, feedPts: 3, pFeed: 250, drainPts: 2, pDrain: 250 })).total;
    R.kitchenWhole = CALC.kitchen(S0('kitchen', { mode: 'whole', whole: 4000 })).total;
    // ---- اليومية: 2 سباك × 500 × 3 أيام = 3000
    R.daily = CALC.daily({ plumbers: 2, wage: 500, days: 3 }).total;
    R.dailyLine = lineTotal(L({ name: 'يومية سباك', method: 'daily', kind: 'labor', qty: 3, mult: 2, price: 500 }));
    R.dailyNet = CALC.daily({ plumbers: 1, wage: 500, days: 6, helpers: 1, helperWage: 250, overtime: 200, advances: 400, deductions: 100 }).total;
    // ---- الحفر: 10 × 0.5 × 0.8 = 4 م³
    R.digVol = CALC.dig({ len: 10, wid: 0.5, dep: 0.8, price: 0 }).volume;
    R.digTotal = CALC.dig({ len: 10, wid: 0.5, dep: 0.8, price: 120, fill: 30, dewater: 100, haul: 50 }).total;
    const dl = L({ name: 'حفر', method: 'cubic', kind: 'excavation', len: 10, wid: 0.5, dep: 0.8, price: 120 });
    R.digLineQty = dl.qty; R.digLine = lineTotal(dl);
    R.cubicDirect = lineTotal(L({ name: 'ردم', method: 'cubic', kind: 'excavation', qty: 2.5, price: 40 }));
    // ---- طرق أخرى
    R.lump = lineTotal(L({ name: 'تأسيس شقة', method: 'lump', kind: 'service', qty: 7, price: 20000 }));
    R.visit = lineTotal(L({ name: 'زيارة طوارئ', method: 'visit', kind: 'diag', qty: 2, price: 250 }));
    R.hour = lineTotal(L({ name: 'ساعات إضافية', method: 'hour', kind: 'labor', qty: 3, price: 80 }));
    R.stage = lineTotal(L({ name: 'الاختبارات', method: 'stage', kind: 'service', price: 500 }));
    R.stageQty = lineTotal(L({ name: 'تركيب المحابس', method: 'stage', kind: 'service', qty: 4, price: 100 }));
    // ---- التوريد والتركيب: الشراء منفصل عن البيع وعن مصنعية التركيب
    const sup = L({ name: 'خلاط', method: 'supply', kind: 'fixture', qty: 2, price: 900, cost: 700, install: 100 });
    R.supTotal = lineTotal(sup); R.supSupply = lineSupplyTotal(sup); R.supInstall = lineInstallTotal(sup); R.supCost = lineCost(sup);
    const cli = L({ name: 'قاعدة حمام', method: 'supply', kind: 'fixture', qty: 2, price: 3000, cost: 2500, install: 400, source: 'client' });
    R.cliTotal = lineTotal(cli); R.cliCost = lineCost(cli);
    R.items = CALC.items({ rows: [{ name: 'خلاط', qty: 2, buy: 700, sell: 900, install: 100 }, { name: 'قاعدة', qty: 1, buy: 2500, sell: 3000, install: 400, client: true }] });
    R.maint = CALC.maint({ fee: 150, labor: 300, parts: [{ name: 'محبس زاوية', qty: 2, buy: 40, sell: 70 }] });
    R.tankRef = CALC.tankRef(5, 150, 2);
    // ---- المستند: فصل المصنعية عن الخامات + الإضافات والخصم
    const d = NORMALIZERS.docs({ id: 'dT', docType: 'invoice', addAmount: 500, discountAmount: 250, lines: [
      { name: 'نقطة حوض', method: 'point', kind: 'service', qty: 10, price: 300, space: 'حمام 1' },
      { name: 'ماسورة PPR', method: 'meter', kind: 'material', qty: 20, price: 100, cost: 70, size: '25 مم' },
      { name: 'ماسورة PPR', method: 'meter', kind: 'material', qty: 10, price: 140, cost: 100, size: '32 مم' },
      { name: 'محبس', method: 'piece', kind: 'fitting', qty: 5, price: 150, cost: 100 },
      { name: 'خلاط', method: 'supply', kind: 'fixture', qty: 2, price: 900, cost: 700, install: 100 },
      { name: 'حفر', method: 'cubic', kind: 'excavation', len: 10, wid: 0.5, dep: 0.8, price: 50 }
    ] });
    DB.docs.push(d);
    const t0 = computeDoc(d);
    R.doc = { subtotal: t0.subtotal, total: t0.total, service: t0.byKind.service, material: t0.byKind.material, fitting: t0.byKind.fitting, fixture: t0.byKind.fixture, excavation: t0.byKind.excavation, secFixture: t0.bySection.fixture, cost: t0.cost, points: t0.points, space: t0.bySpace['حمام 1'], general: t0.bySpace[''] };
    R.sumKinds = KIND_ORDER.reduce((s, k) => s + t0.byKind[k], 0);
    R.sumSpaces = Object.keys(t0.bySpace).reduce((s, k) => s + t0.bySpace[k], 0);
    R.multiSizeWarn = docWarnings(d).length;
    // ---- المدفوعات: 20000 - 5000 عربون - 7000 دفعة = 8000
    const dp = NORMALIZERS.docs({ id: 'dP', docType: 'invoice', lines: [{ name: 'مقاولة تأسيس شقة', method: 'lump', kind: 'service', price: 20000 }] });
    DB.docs.push(dp);
    DB.payments.push(NORMALIZERS.payments({ id: 'p1', docId: 'dP', amount: 5000, kind: 'deposit' }));
    DB.payments.push(NORMALIZERS.payments({ id: 'p2', docId: 'dP', amount: 7000, kind: 'payment' }));
    const tp = computeDoc(dp); R.pay = { total: tp.total, paid: tp.paid, remaining: tp.remaining };
    // ---- الخامات لا تتحسب مرتين (تكلفة البنود + مصروف خامات على نفس المستند)
    DB.expenses.push(NORMALIZERS.expenses({ id: 'x1', docId: 'dT', cat: 'خامات ومواسير', amount: 3000 }));
    DB.expenses.push(NORMALIZERS.expenses({ id: 'x2', docId: 'dT', cat: 'نقل ومواصلات', amount: 200 }));
    const t1 = computeDoc(d);
    R.noDouble = { cost: t1.cost, matExp: t1.matExpenses, materialsCost: t1.materialsCost, other: t1.otherExpenses, totalCost: t1.totalCost, profit: t1.profit };
    DB.expenses.push(NORMALIZERS.expenses({ id: 'x3', docId: 'dT', cat: 'أدوات صحية', amount: 2000 }));
    R.noDouble2 = computeDoc(d).materialsCost;
    // ---- تعريف النقطة ومنع التكرار
    const mkDoc = lines => NORMALIZERS.docs({ lines });
    const dup = (lines, def) => { settings.pointDef = def || 'combined'; return docWarnings(mkDoc(lines)).length; };
    const fx = { name: 'نقطة حوض', method: 'point', kind: 'service', qty: 1, price: 300, space: 'حمام 1' };
    const dr = { name: 'نقطة صرف حوض', method: 'point', kind: 'service', qty: 1, price: 200, space: 'حمام 1' };
    R.dupCombined = dup([fx, dr], 'combined');
    R.dupSeparate = dup([fx, dr], 'separate');
    R.dupOtherSpace = dup([fx, Object.assign({}, dr, { space: 'حمام 2' })], 'combined');
    R.dupOtherDevice = dup([fx, { name: 'نقطة صرف غسالة', method: 'point', kind: 'service', qty: 1, price: 200, space: 'حمام 1' }], 'combined');
    R.dupColdFeed = dup([fx, { name: 'نقطة تغذية باردة', method: 'point', kind: 'service', qty: 1, price: 150, space: 'حمام 1' }], 'combined');
    R.dupExact = dup([fx, fx], 'separate');
    R.dupExactOtherSize = dup([{ name: 'ماسورة PPR', method: 'meter', kind: 'material', qty: 5, price: 10, size: '20 مم' }, { name: 'ماسورة PPR', method: 'meter', kind: 'material', qty: 5, price: 10, size: '25 مم' }], 'separate');
    R.dupBathPoints = dup([{ name: 'تأسيس حمام', method: 'bath', kind: 'service', qty: 1, price: 5000, space: 'حمام 1' }, fx], 'separate');
    R.dupIncMat = dup([Object.assign({}, fx, { incMat: true }), { name: 'ماسورة PPR', method: 'meter', kind: 'material', qty: 5, price: 100, space: 'حمام 1' }], 'separate');
    R.dupClientMat = dup([Object.assign({}, fx, { incMat: true }), { name: 'ماسورة PPR', method: 'meter', kind: 'material', qty: 5, price: 100, space: 'حمام 1', source: 'client' }], 'separate');
    settings.pointDef = 'combined';
    R.connInfer = [connOfName('نقطة صرف أرضي'), connOfName('نقطة تغذية ساخنة'), connOfName('نقطة تغذية باردة'), connOfName('نقطة غسالة')].join(',');
    // ---- إضافة وتعديل وحذف النقاط
    R.ptDefault = pointTypes().length;
    pointTypes().push(normPointType({ name: 'نقطة بانيو', conn: 'fixture' }));
    R.ptAdded = catItems('points').some(i => i[0] === 'نقطة بانيو' && i[1] === 'point');
    pointTypes().find(p => p.name === 'نقطة بانيو').name = 'نقطة جاكوزي';
    R.ptRenamed = catItems('points').some(i => i[0] === 'نقطة جاكوزي') && !catItems('points').some(i => i[0] === 'نقطة بانيو');
    settings.pointTypes = pointTypes().filter(p => p.name !== 'نقطة جاكوزي');
    R.ptDeleted = !catItems('points').some(i => i[0] === 'نقطة جاكوزي') && pointTypes().length === R.ptDefault;
    R.stagesDefault = stagesList().length;
    // ---- المشروع: تجميع بدون تكرار
    DB.customers.push(NORMALIZERS.customers({ id: 'c1', name: 'عميل' }));
    DB.projects.push(NORMALIZERS.projects({ id: 'pr1', customerId: 'c1', name: 'شقة' }));
    d.customerId = 'c1'; d.projectId = 'pr1'; dp.customerId = 'c1'; dp.projectId = 'pr1';
    DB.expenses.forEach(x => { x.projectId = 'pr1'; }); // مصروف على المستند والمشروع معاً: يتحسب مرة واحدة
    DB.workers.push(NORMALIZERS.workers({ id: 'w1', name: 'سباك', dailyWage: 500, entries: [
      { type: 'day', days: 3, rate: 500, docId: 'dT', projectId: 'pr1' }, { type: 'overtime', amount: 200, projectId: 'pr1' }, { type: 'advance', amount: 400 }, { type: 'deduction', amount: 100 }, { type: 'payout', amount: 500 }] }));
    const ps = projectStats(getProject('pr1'));
    R.proj = { billed: ps.billed, paid: ps.paid, remaining: ps.remaining, expTotal: ps.expTotal, labor: ps.labor, materialsCost: ps.materialsCost, totalCost: ps.totalCost, profit: ps.profit, nExp: ps.expenses.length };
    const tk = projectTakeoff(getProject('pr1'));
    R.take = { points: tk.pointsTotal, pipes: Object.keys(tk.pipes).length, fittings: tk.fittings['محبس'], fixtures: tk.fixtures['خلاط'], cubic: tk.cubic };
    const ws = workerStats(getWorker('w1'));
    R.worker = { gross: ws.gross, due: ws.due };
    syncPaymentsToCustomers();
    const cs = customerStats(getCustomer('c1'));
    R.cust = { billed: cs.billed, paid: cs.paid, remaining: cs.remaining };
    finPeriod = 'all';
    const fin = financeTotals();
    R.fin = { collected: fin.collected, costsPaid: fin.costsPaid, net: fin.netProfit, expenses: fin.expenses, wagesPaid: fin.wagesPaid };
    // ---- الزيارة: رسوم الزيارة منفصلة عن الإصلاح وقطع الغيار
    const v = NORMALIZERS.visits({ customerId: 'c1', visitType: 'زيارة كشف', visitFee: 150, laborValue: 300, parts: [{ name: 'محبس زاوية', qty: 2, price: 70, cost: 40 }] });
    R.visitTotal = visitTotal(v);
    R.visitLines = visitDocLines(v).map(L).map(l => l.kind + ':' + lineTotal(l)).join('|');
    // ---- المخزون: الخصم والاسترجاع بدون تكرار
    DB.inventory.push(NORMALIZERS.inventory({ id: 'i1', name: 'ماسورة PPR', cat: 'مواسير PPR', unit: 'متر', qty: 100, buyPrice: 70, sellPrice: 100 }));
    const ds = NORMALIZERS.docs({ id: 'dS', docType: 'invoice', lines: [{ name: 'ماسورة PPR', method: 'meter', kind: 'material', qty: 20, price: 100, invId: 'i1' }] });
    DB.docs.push(ds); saveDoc(ds); R.stock1 = invById('i1').qty;
    saveDoc(ds); R.stock2 = invById('i1').qty;
    ds.lines[0].qty = 30; saveDoc(ds); R.stock3 = invById('i1').qty;
    reconcileStock(ds, {}, 'حذف'); R.stock4 = invById('i1').qty;
    R.invPreset = invLinePreset(invById('i1')).method + ':' + invLinePreset(invById('i1')).kind + ':' + invLinePreset(invById('i1')).pipeType;
    // ---- العملات: الرمز والكسور فقط بدون تحويل
    const before = computeDoc(dp).total;
    settings.currency = 'KWD'; applyCurrency(); R.kwd = money(1234.5678); R.afterCur = computeDoc(dp).total === before;
    settings.currency = 'IQD'; applyCurrency(); R.iqd = fmt(1234.5678);
    settings.currency = 'EGP'; applyCurrency(); R.egp = fmt(1234.5678);
    R.currencies = CURRENCIES.map(c => c.code);
    // ---- النسخة الاحتياطية: تنظيف البيانات يحافظ على كل الحقول
    const round = normalizeCol('docs', JSON.parse(JSON.stringify(DB.docs)));
    R.roundTrip = JSON.stringify(round.map(x => computeDoc(x).total)) === JSON.stringify(DB.docs.map(x => computeDoc(x).total)) && round[0].lines[4].install === 100 && round[0].projectId === 'pr1';
    R.docTypes = DOC_TYPE_ORDER.length; R.methods = METHOD_ORDER.length; R.cats = WORK_CAT_ORDER.length;
    R.pdf = buildDocHTML(d).length > 2000 && buildDocHTML(d).includes('ماسورة PPR');
    R.keys = Object.keys(KEYS).map(k => KEYS[k]);
    globalThis.__R = R;
  `;
  vm.runInContext(files.join('\n;\n') + '\n;\n' + testCode, sandbox, { filename: 'plumbing-bundle.js' });
  const R = sandbox.__R;
  check('النقاط: 10 × 300 = 3,000 (الحاسبة)', eq(R.points, 3000), R.points);
  check('النقاط: بند 10 × 300 = 3,000', eq(R.pointsLine, 3000), R.pointsLine);
  check('المواسير: 20 م × 100 = 2,000 (الحاسبة)', eq(R.pipes, 2000), R.pipes);
  check('المواسير: بند 20 م × 100 = 2,000', eq(R.pipesLine, 2000), R.pipesLine);
  check('المواسير: خطين × 20 م × 100 = 4,000', eq(R.pipes2Lines, 4000), R.pipes2Lines);
  check('الهالك: 20 م + 10% = 22 م مطلوب × 100 = 2,200', eq(R.segRequired, 22) && eq(R.segMaterial, 2200), [R.segRequired, R.segMaterial]);
  check('طول العود 4 م: 22 م = 6 أعواد (24 م) — والمصنعية على الصافي 20 × 15 = 300', R.segBars === 6 && eq(R.segBuyLen, 24) && eq(R.segLabor, 300), [R.segBars, R.segBuyLen, R.segLabor]);
  check('بدون طول عود: لا يُفترض طول موحد', R.segNoBar === 0);
  check('القطع: 5 محابس × 150 = 750 (الحاسبة)', eq(R.fits, 750), R.fits);
  check('القطع: بند 5 × 150 = 750', eq(R.fitsLine, 750), R.fitsLine);
  check('الحمام: تأسيس 5,000 + تركيب أدوات 1,500 = 6,500', eq(R.bathRough, 5000) && eq(R.bath, 6500), [R.bathRough, R.bath]);
  check('الحمام: سعر الحمام بالكامل = 6,500', eq(R.bathWhole, 6500));
  check('الحمام: بنود المراحل في المقايسة = 6,500 (3 بنود)', eq(R.bathLines, 6500) && R.bathLinesN === 3, [R.bathLines, R.bathLinesN]);
  check('الحساب بالحمام: 2 حمام × 5,000 = 10,000', eq(R.bathLine, 10000));
  check('المطبخ: تفصيلي = 300 + 200 + 750 + 500 = 1,750 / مقاولة = 4,000', eq(R.kitchenDetail, 1750) && eq(R.kitchenWhole, 4000), [R.kitchenDetail, R.kitchenWhole]);
  check('اليومية: 2 سباك × 500 × 3 أيام = 3,000 (الحاسبة)', eq(R.daily, 3000), R.daily);
  check('اليومية: بند 2 × 500 × 3 = 3,000', eq(R.dailyLine, 3000), R.dailyLine);
  check('اليومية: 3000 + 1500 + 200 إضافي − 400 سلف − 100 خصم = 4,200', eq(R.dailyNet, 4200), R.dailyNet);
  check('الحفر: 10 × 0.5 × 0.8 = 4 م³', eq(R.digVol, 4), R.digVol);
  check('الحفر: بند المتر المكعب كميته 4 م³ × 120 = 480', eq(R.digLineQty, 4) && eq(R.digLine, 480), [R.digLineQty, R.digLine]);
  check('الحفر: 480 حفر + 120 ردم + 100 نزح + 50 نقل = 750', eq(R.digTotal, 750), R.digTotal);
  check('المتر المكعب المباشر: 2.5 × 40 = 100', eq(R.cubicDirect, 100));
  check('المقاولة: المبلغ الإجمالي 20,000 (بدون ضرب في كمية)', eq(R.lump, 20000), R.lump);
  check('الزيارة 2 × 250 = 500 / الساعة 3 × 80 = 240', eq(R.visit, 500) && eq(R.hour, 240));
  check('المراحل: مرحلة بسعر 500 / مرحلة بكمية 4 × 100 = 400', eq(R.stage, 500) && eq(R.stageQty, 400));
  check('توريد وتركيب: بيع 1,800 + مصنعية 200 = 2,000 والشراء 1,400', eq(R.supTotal, 2000) && eq(R.supSupply, 1800) && eq(R.supInstall, 200) && eq(R.supCost, 1400), [R.supTotal, R.supSupply, R.supInstall, R.supCost]);
  check('خامات العميل: الثمن لا يُحسب — مصنعية التركيب فقط (2 × 400 = 800)', eq(R.cliTotal, 800) && eq(R.cliCost, 0), [R.cliTotal, R.cliCost]);
  check('حاسبة القطع: بيع 1,800 + تركيب 600 = 2,400 وربح التوريد 400', eq(R.items.total, 2400) && eq(R.items.profit, 400) && eq(R.items.install, 600), R.items);
  check('الصيانة: زيارة 150 + إصلاح 300 + قطع 140 = 590 (كل واحدة منفصلة)', eq(R.maint.total, 590) && eq(R.maint.fee, 150) && eq(R.maint.parts, 140), R.maint);
  check('مرجع الخزان: 5 أفراد × 150 لتر × يومين = 1,500 لتر', R.tankRef === 1500);
  check('المستند: مجموع البنود = 3000 + 2000 + 1400 + 750 + 2000 + 200 = 9,350', eq(R.doc.subtotal, 9350), R.doc);
  check('المستند: الإجمالي = البنود + 500 إضافات − 250 خصم = 9,600', eq(R.doc.total, 9600), R.doc.total);
  check('الفصل: المصنعية 3,200 (نقاط + تركيب) منفصلة عن الأدوات الصحية 1,800', eq(R.doc.service, 3200) && eq(R.doc.fixture, 1800) && eq(R.doc.secFixture, 2000), R.doc);
  check('الفصل: المواسير 3,400 / الوصلات 750 / الحفر 200', eq(R.doc.material, 3400) && eq(R.doc.fitting, 750) && eq(R.doc.excavation, 200), R.doc);
  check('لا تكرار: مجموع الأنواع = مجموع الأماكن = مجموع البنود', eq(R.sumKinds, 9350) && eq(R.sumSpaces, 9350), [R.sumKinds, R.sumSpaces]);
  check('تعدد مقاسات المواسير (25 مم و 32 مم) بدون تنبيه تكرار', R.multiSizeWarn === 0, R.multiSizeWarn);
  check('عدد النقاط 10 والتجميع حسب المكان (حمام 1 = 3,000)', eq(R.doc.points, 10) && eq(R.doc.space, 3000) && eq(R.doc.general, 6350), R.doc);
  check('المدفوعات: 20,000 − 5,000 عربون − 7,000 دفعة = 8,000 متبقي', eq(R.pay.total, 20000) && eq(R.pay.paid, 12000) && eq(R.pay.remaining, 8000), R.pay);
  check('الخامات مرة واحدة: تكلفة البنود 4,300 ومصروف خامات 3,000 → المحتسب 4,300 (مش 7,300)', eq(R.noDouble.cost, 4300) && eq(R.noDouble.matExp, 3000) && eq(R.noDouble.materialsCost, 4300), R.noDouble);
  check('الربح المتوقع = 9,600 − 4,300 − 200 = 5,100', eq(R.noDouble.totalCost, 4500) && eq(R.noDouble.profit, 5100), R.noDouble);
  check('لو مصروفات الخامات أكبر (5,000) تبقى هي المحتسبة', eq(R.noDouble2, 5000), R.noDouble2);
  check('تعريف النقطة «شاملة»: نقطة حوض + نقطة صرف حوض في نفس الحمام = تنبيه', R.dupCombined === 1, R.dupCombined);
  check('تعريف النقطة «كل توصيلة لوحدها»: نفس البنود بدون تنبيه', R.dupSeparate === 0, R.dupSeparate);
  check('نفس النقاط في حمامين مختلفين بدون تنبيه', R.dupOtherSpace === 0, R.dupOtherSpace);
  check('صرف جهاز مختلف (غسالة) لا يعتبر تكرار لنقطة الحوض', R.dupOtherDevice === 0, R.dupOtherDevice);
  check('نقطة تغذية عامة مع نقطة جهاز شاملة = تنبيه', R.dupColdFeed === 1, R.dupColdFeed);
  check('نفس البند مرتين في نفس المكان = تنبيه', R.dupExact === 1, R.dupExact);
  check('نفس الماسورة بمقاس مختلف ليست تكرار', R.dupExactOtherSize === 0);
  check('حمام متسعر بالكامل + نقاط في نفس الحمام = تنبيه', R.dupBathPoints === 1, R.dupBathPoints);
  check('سعر شامل الخامات + خامات متسعرة لوحدها = تنبيه (وخامات العميل لا)', R.dupIncMat === 1 && R.dupClientMat === 0, [R.dupIncMat, R.dupClientMat]);
  check('استنتاج نوع التوصيلة من الاسم (صرف / ساخن / بارد / جهاز)', R.connInfer === 'drain,hot,cold,fixture', R.connInfer);
  check('16 نقطة افتراضية و13 مرحلة عمل', R.ptDefault === 16 && R.stagesDefault === 13, [R.ptDefault, R.stagesDefault]);
  check('إضافة نقطة جديدة تظهر في بنود النقاط', R.ptAdded);
  check('تعديل اسم النقطة', R.ptRenamed);
  check('حذف النقطة', R.ptDeleted);
  check('المشروع: إجمالي المقاولة 29,600 والمدفوع 12,000 والمتبقي 17,600', eq(R.proj.billed, 29600) && eq(R.proj.paid, 12000) && eq(R.proj.remaining, 17600), R.proj);
  check('المشروع: المصروف المسجل على المستند والمشروع يتحسب مرة واحدة (3 مصروفات = 5,200)', R.proj.nExp === 3 && eq(R.proj.expTotal, 5200), R.proj);
  check('المشروع: الأجور 1,700 والخامات 5,000 والتكلفة 6,900 والربح 22,700', eq(R.proj.labor, 1700) && eq(R.proj.materialsCost, 5000) && eq(R.proj.totalCost, 6900) && eq(R.proj.profit, 22700), R.proj);
  check('حصر المشروع: 10 نقاط، مقاسين مواسير، 5 محابس، 2 خلاط، 4 م³', eq(R.take.points, 10) && R.take.pipes === 2 && eq(R.take.fittings, 5) && eq(R.take.fixtures, 2) && eq(R.take.cubic, 4), R.take);
  check('العامل: 1500 يومية + 200 إضافي − 400 سلفة − 100 خصم − 500 مصروف له = 700', eq(R.worker.gross, 1700) && eq(R.worker.due, 700), R.worker);
  check('حساب العميل: 29,600 − 12,000 = 17,600', eq(R.cust.remaining, 17600), R.cust);
  check('صافي الربح = المحصل 12,000 − التكاليف المدفوعة (5,200 مصروفات + 900 أجور) = 5,900', eq(R.fin.net, 5900) && eq(R.fin.costsPaid, 6100), R.fin);
  check('الزيارة: 150 + 300 + 140 = 590 وبنود فاتورتها منفصلة', eq(R.visitTotal, 590) && R.visitLines === 'diag:150|service:300|part:140', R.visitLines);
  check('المخزون: خصم 20 م مرة واحدة ثم تعديل لـ 30 ثم استرجاع', eq(R.stock1, 80) && eq(R.stock2, 80) && eq(R.stock3, 70) && eq(R.stock4, 100), [R.stock1, R.stock2, R.stock3, R.stock4]);
  check('صنف المخزن يتحول لبند بالمتر (خامة PPR)', R.invPreset === 'meter:material:PPR', R.invPreset);
  check('الدينار الكويتي 3 كسور: 1,234.568 د.ك', R.kwd === '1,234.568 د.ك', R.kwd);
  check('تغيير العملة لا يحوّل المبالغ المسجلة', R.afterCur === true);
  check('الدينار العراقي بدون كسور / الجنيه المصري كسرين', R.iqd === '1,235' && R.egp === '1,234.57', [R.iqd, R.egp]);
  const need = ['EGP', 'SAR', 'AED', 'KWD', 'QAR', 'BHD', 'OMR', 'JOD', 'IQD', 'LBP', 'SYP', 'ILS', 'MAD', 'DZD', 'TND', 'LYD', 'SDG', 'YER', 'MRU', 'SOS', 'DJF', 'KMF'];
  check('كل العملات العربية الـ 22 موجودة', need.every(c => R.currencies.includes(c)), need.filter(c => !R.currencies.includes(c)));
  check('تنظيف البيانات (استيراد/استعادة) يحافظ على الحسابات والحقول', R.roundTrip === true);
  check('11 نوع مستند، 13 طريقة محاسبة، 15 تصنيف أعمال', R.docTypes === 11 && R.methods === 13 && R.cats === 15, [R.docTypes, R.methods, R.cats]);
  check('توليد مستند PDF (HTML) من محرك الطباعة', R.pdf === true);
  check('كل مفاتيح التخزين تبدأ بـ hesabati_plumbing_', R.keys.every(k => k.startsWith(NSP)), R.keys);
  check('لا يوجد أي مفتاح من مفاتيح تطبيقات حساباتي الأخرى', !R.keys.some(k => /ahmed_elec|^hesabaty_|hvac|paint/.test(k)));
}

/* =========================================================
   2) اختبارات المتصفح الكاملة
   ========================================================= */
const serveOverride = { version: null };
function serve(port) {
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.css': 'text/css', '.woff2': 'font/woff2' };
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]).replace(/^\/Hesabaty-plumbing/, '');
    if (p === '/' || p === '') p = '/index.html';
    const f = path.join(ROOT, path.normalize(p));
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    // محاكاة إصدار قديم منشور (لاختبار فقاعة التحديث)
    if (serveOverride.version && /(service-worker\.js|core\.js|version\.json)$/.test(f)) {
      const v = serveOverride.version;
      res.end(fs.readFileSync(f, 'utf8').replace(/const SW_VERSION = "[^"]*";/, `const SW_VERSION = "${v}";`).replace(/const APP_VERSION = '[^']*';/, `const APP_VERSION = '${v}';`).replace(/"version": "[^"]*"/, `"version": "${v}"`));
      return;
    }
    fs.createReadStream(f).pipe(res);
  });
  return new Promise(r => server.listen(port, () => r(server)));
}
const wait = ms => new Promise(r => setTimeout(r, ms));

async function browserTests() {
  const { chromium } = require('playwright');
  fs.mkdirSync(OUT, { recursive: true });
  const PORT = 8795;
  const server = await serve(PORT);
  const BASE = `http://localhost:${PORT}/Hesabaty-plumbing/`;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 412, height: 900 }, acceptDownloads: true, serviceWorkers: 'allow' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message + ' @ ' + String(e.stack || '').split('\n').slice(1, 3).join(' | ')));
  page.on('console', m => { if (m.type() === 'error' && !/fonts\.g|net::ERR/.test(m.text())) errors.push(m.text()); });
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const settle = (ms = 250) => wait(ms);
  const shot = n => page.screenshot({ path: path.join(OUT, n + '.png') });
  const save = async () => { await page.click('.sheet.open #formFoot [data-f="save"]'); await settle(550); };

  /* ---------- العزل عن تطبيقات حساباتي الأخرى ---------- */
  console.log('\n[2] عزل البيانات عن حساباتي الكهرباء والنقاشة والتكييف');
  const OTHER = {
    ahmed_elec_invoices_v7: JSON.stringify({ invoices: [{ id: 'inv_1', clientName: 'عميل كهرباء', rooms: [] }] }),
    hesabaty_customers_v1: JSON.stringify({ version: 1, customers: [{ id: 'c_e1', name: 'عميل الكهرباء', entries: [] }] }),
    hesabaty_settings_v1: JSON.stringify({ currency: 'SAR', theme: 'dark' }),
    hesabati_hvac_customers_v1: JSON.stringify({ v: 1, items: [{ id: 'c_h1', name: 'عميل التكييف' }] }),
    hesabati_hvac_settings_v1: JSON.stringify({ currency: 'AED', theme: 'dark' }),
    hesabati_painting_customers_v1: JSON.stringify({ v: 1, items: [{ id: 'c_p1', name: 'عميل النقاشة' }] })
  };
  await page.goto(BASE + 'privacy.html');
  await ev(e => { localStorage.clear(); Object.keys(e).forEach(k => localStorage.setItem(k, e[k])); }, OTHER);
  await page.goto(BASE);
  await settle(1200);
  check('التطبيق اشتغل بدون أخطاء', errors.length === 0, errors);
  check('عملاء التطبيقات الأخرى لم يتم استيرادهم تلقائياً', (await ev(() => DB.customers.length + DB.docs.length + DB.projects.length)) === 0);
  check('العملة والمظهر مستقلين (لم تُقرأ إعدادات التطبيقات الأخرى)', (await ev(() => settings.currency + '/' + settings.theme)) === 'EGP/auto');
  check('اسم التطبيق وهويته: أرزقي | Arzoqi — السباكة', (await page.title()).includes('أرزقي | Arzoqi — السباكة') && (await page.textContent('.brand-tag')).includes('PLUMBING'));
  await shot('01-home');

  /* ---------- العملاء والمشروعات ---------- */
  console.log('\n[3] العملاء والمشروعات');
  await page.click('#navPlus'); await settle(350);
  await page.click('#cCust'); await settle(450);
  await page.fill('#cfName', 'م. خالد سمير');
  await page.fill('#cfPhone', '01012345678');
  await page.fill('#cfAddress', 'مدينة نصر');
  await save();
  const cid = await ev(() => DB.customers[0] && DB.customers[0].id);
  check('إضافة عميل من الواجهة', !!cid && (await ev(() => DB.customers[0].name)) === 'م. خالد سمير');
  check('صفحة العميل اتفتحت بعد الإضافة', await ev(() => pageStack.length === 1 && pageStack[0].key === 'customer'));
  await page.click('#page1 .pg-actions button:last-child'); await settle(400);
  await page.fill('#cfAddress', 'مدينة نصر - الحي السابع');
  await save();
  check('تعديل بيانات العميل', (await ev(() => DB.customers[0].address)) === 'مدينة نصر - الحي السابع');
  // مشروعين لنفس العميل
  await page.click('#custTabs [data-t="proj"]'); await settle(300);
  await page.click('#page1Body .btn-accent'); await settle(450);
  await page.fill('#pfName', 'شقة التجمع');
  await page.fill('#pfAddress', 'التجمع الخامس');
  await page.click('#pfType [data-t="شقة"]');
  await page.click('#pfStatus [data-s="progress"]');
  await page.fill('#pfDesc', 'تأسيس وتشطيب سباكة 2 حمام ومطبخ');
  await save(); await settle(400);
  const pid = await ev(() => DB.projects[0] && DB.projects[0].id);
  check('إضافة مشروع للعميل وفتح صفحته', !!pid && await ev(() => topPage().key === 'project' && DB.projects[0].status === 'progress' && DB.projects[0].propType === 'شقة'));
  await ev(c => { DB.projects.push(NORMALIZERS.projects({ id: 'pr2', customerId: c, name: 'فيلا الساحل', propType: 'فيلا', endDate: addDaysISO(todayISO(), 5), status: 'progress' })); saveCol('projects'); refreshAll(); }, cid);
  check('العميل الواحد له أكثر من مشروع', (await ev(c => customerStats(getCustomer(c)).projects.length, cid)) === 2);
  await page.click('#page2 .pg-actions button'); await settle(400);
  await page.fill('#pfName', 'شقة التجمع الخامس');
  await save();
  check('تعديل المشروع', (await ev(() => DB.projects[0].name)) === 'شقة التجمع الخامس');
  await shot('02-project');

  /* ---------- الخامات والأدوات الصحية ---------- */
  console.log('\n[4] الخامات والأدوات الصحية (المخزن)');
  await ev(() => closeEverythingThen(() => openPage('inventory'))); await settle(500);
  await page.click('#page1Body .btn-accent'); await settle(400);
  await page.fill('#ivName', 'ماسورة PPR');
  await page.selectOption('#ivCat', 'مواسير PPR');
  await page.fill('#ivBrand', 'بي آر'); await page.fill('#ivModel', 'PN20'); await page.fill('#ivSpec', '25 مم');
  await page.click('#ivUnits [data-u="متر"]');
  await page.fill('#ivQty', '100'); await page.fill('#ivBuy', '70'); await page.fill('#ivSell', '100'); await page.fill('#ivSup', 'مخزن النور');
  await page.check('#ivExp');
  await save();
  check('إضافة خامة بكل بياناتها (شركة، موديل، مقاس، وحدة، شراء/بيع، مورد)', await ev(() => { const i = DB.inventory[0]; return i && i.name === 'ماسورة PPR' && i.model === 'PN20' && i.spec === '25 مم' && i.unit === 'متر' && i.qty === 100 && i.supplier === 'مخزن النور'; }));
  check('ثمن الشراء اتسجل كمصروف خامات (100 × 70 = 7,000)', await ev(() => DB.expenses.length === 1 && DB.expenses[0].amount === 7000 && DB.expenses[0].cat === 'خامات ومواسير'));
  check('هامش الربح للوحدة = 30', (await ev(() => invMargin(DB.inventory[0]).unit)) === 30);
  await ev(() => { DB.inventory.push(NORMALIZERS.inventory({ id: 'iMix', name: 'خلاط حوض', cat: 'خلاطات', unit: 'قطعة', qty: 4, buyPrice: 700, sellPrice: 900, minQty: 5 }), NORMALIZERS.inventory({ id: 'iVal', name: 'محبس زاوية', cat: 'محابس', unit: 'قطعة', qty: 20, buyPrice: 40, sellPrice: 70 })); saveCol('inventory'); refreshAll(); });
  check('تصنيفات المخزن: مواسير / وصلات / أدوات صحية', await ev(() => invCatKind('مواسير PPR') === 'material' && invCatKind('محابس') === 'fitting' && invCatKind('خلاطات') === 'fixture' && invCatKind('طلمبات') === 'equipment'));

  /* ---------- العمال ---------- */
  console.log('\n[5] العمال والفريق');
  await ev(() => closeEverythingThen(() => openPage('workers'))); await settle(500);
  await page.click('#page1Body .btn-accent'); await settle(400);
  await page.fill('#wfName', 'أسطى محمود'); await page.fill('#wfSpec', 'معلم سباكة'); await page.fill('#wfWage', '500'); await page.fill('#wfHour', '80');
  await save();
  const wid = await ev(() => DB.workers[0].id);
  await ev(() => { DB.workers.push(NORMALIZERS.workers({ id: 'w2', name: 'كريم', specialty: 'مساعد سباك', dailyWage: 250 })); saveCol('workers'); });
  check('إضافة أكثر من عامل', (await ev(() => DB.workers.length)) === 2);

  /* ---------- مقايسة التأسيس: كل طرق المحاسبة من الواجهة ---------- */
  console.log('\n[6] مقايسة تأسيس + طرق المحاسبة + منع التكرار');
  await ev(() => closeEverythingThen(() => switchView('home'))); await settle(500);
  await page.click('#qEstimate'); await settle(800);
  check('مقايسة تأسيس جديدة برقم EST-0001', (await ev(() => getCurrentDoc().docType + ' ' + getCurrentDoc().number)) === 'est_rough EST-0001');
  await page.fill('#clientName', 'م. خالد'); await settle(400);
  await page.click('#clientSuggest button[data-id]'); await settle(500);
  check('ربط المقايسة بالعميل من الاقتراحات', (await ev(() => getCurrentDoc().customerId)) === cid);
  await page.click(`#docProjChips [data-proj="${pid}"]`); await settle(400);
  check('ربط المقايسة بالمشروع', (await ev(() => getCurrentDoc().projectId)) === pid);
  await page.fill('#docScope', 'تأسيس سباكة شقة: 2 حمام ومطبخ');
  await page.fill('#docExcl', 'توريد الأدوات الصحية');
  await page.fill('#docTerms', '30% عربون والباقي على مراحل');
  await page.click(`#docWorkerChips [data-w="${wid}"]`); await settle(300);
  await page.click('#ebNext'); await settle(500);
  // (1) بالنقطة: 10 نقاط × 300
  await page.click('#lineCatChips [data-cat="points"]'); await settle(450);
  check('نموذج البند يعرض النقاط الـ 16 الافتراضية', (await page.$$('#lfItems .chip')).length === 16);
  await page.click('#lfItems .chip:has-text("نقطة حوض") >> nth=0'); await settle(300);
  await page.fill('#lfQty', '10'); await page.fill('#lfPrice', '300'); await page.fill('#lfSpace', 'حمام رئيسي');
  await page.selectOption('#lfPipe', 'PPR'); await page.fill('#lfSize', '20 مم');
  check('الإجمالي اللحظي في نموذج البند = 3,000', (await page.textContent('#lfLive')).includes('3,000'));
  await shot('03-line-form');
  await save();
  check('بند النقاط اتحفظ: 10 × 300 = 3,000', (await ev(() => lineTotal(getCurrentDoc().lines[0]))) === 3000);
  // تنبيه التكرار: نقطة صرف حوض في نفس الحمام (تعريف النقطة: شاملة)
  await page.click('#lineCatChips [data-cat="points"]'); await settle(450);
  await page.click('#lfItems .chip:has-text("نقطة صرف حوض")'); await settle(300);
  await page.fill('#lfPrice', '200'); await page.fill('#lfSpace', 'حمام رئيسي'); await settle(200);
  check('تنبيه التكرار يظهر داخل النموذج قبل الحفظ', (await page.textContent('#lfWarn')).includes('محسوبة ضمن'));
  await page.click('.sheet.open #formFoot [data-f="save"]'); await settle(400);
  check('الحفظ يتوقف ويطلب موافقة صريحة على التكرار', await page.isVisible('#appConfirmModal.open') && (await ev(() => getCurrentDoc().lines.length)) === 1);
  await shot('04-duplicate-warning');
  await page.click('#appConfirmNoBtn'); await settle(300);
  check('رفض التكرار: البند لم يُضف', (await ev(() => getCurrentDoc().lines.length)) === 1);
  // تغيير تعريف النقطة → نفس البند يتحفظ بدون تنبيه
  await ev(() => setPointDef('separate')); await settle(300);
  await page.click('.sheet.open #formFoot [data-f="save"]'); await settle(550);
  check('بعد تغيير تعريف النقطة (كل توصيلة لوحدها) البند يتحفظ بدون تنبيه', (await ev(() => getCurrentDoc().lines.length)) === 2 && !(await page.isVisible('#appConfirmModal.open')));
  await ev(() => setPointDef('combined')); await settle(300);
  check('الرجوع للتعريف الشامل يُظهر تنبيه التكرار في المقايسة', await page.isVisible('#dupWarnBox'));
  // حذف البند المكرر
  await page.click('#linesBody .item-card >> nth=1'); await settle(400);
  await page.click('.sheet.open #formFoot [data-f="del"]'); await settle(200);
  await page.click('#appConfirmYesBtn'); await settle(500);
  check('حذف بند من المقايسة', (await ev(() => getCurrentDoc().lines.length)) === 1 && !(await page.isVisible('#dupWarnBox')));
  // (2) مواسير من المخزن: 20 م × 100
  await page.click('#linesBody button:has-text("من المخزن")'); await settle(400);
  await page.click('#pickList button >> nth=0'); await settle(500);
  await page.fill('#lfQty', '20');
  await save();
  check('ماسورة من المخزن: 20 م × 100 = 2,000 (بالمتر الطولي)', await ev(() => { const l = getCurrentDoc().lines[1]; return l.method === 'meter' && l.kind === 'material' && l.pipeType === 'PPR' && l.size === '25 مم' && lineTotal(l) === 2000 && l.cost === 70; }));
  check('المقايسة لا تخصم من المخزن (الخصم مع الفاتورة فقط)', (await ev(() => DB.inventory[0].qty)) === 100);
  // (3) بالقطعة: 5 محابس × 150
  await page.click('#lineCatChips [data-cat="fittings"]'); await settle(450);
  await page.click('#lfItems .chip:has-text("محبس")'); await settle(300);
  await page.fill('#lfQty', '5'); await page.fill('#lfPrice', '150'); await page.fill('#lfCost', '100');
  await save();
  check('القطع: 5 محابس × 150 = 750', (await ev(() => lineTotal(getCurrentDoc().lines[2]))) === 750);
  // (4) توريد وتركيب مع مصنعية منفصلة
  await page.click('#lineCatChips [data-cat="sanitary"]'); await settle(450);
  await page.click('#lfItems .chip:has-text("خلاط") >> nth=0'); await settle(300);
  await page.fill('#lfQty', '2'); await page.fill('#lfPrice', '900'); await page.fill('#lfCost', '700'); await page.fill('#lfInstall', '100');
  check('توريد وتركيب: الإجمالي اللحظي 2,000', (await page.textContent('#lfLive')).includes('2,000'));
  await save();
  // (5) الحفر بالمتر المكعب من الأبعاد
  await page.click('#lineCatChips [data-cat="external"]'); await settle(450);
  await page.click('#lfItems .chip:has-text("حفر")'); await settle(300);
  await page.fill('#lfLen', '10'); await page.fill('#lfWid', '0.5'); await page.fill('#lfDep', '0.8'); await page.fill('#lfPrice', '50'); await settle(200);
  check('الحفر: الحجم اتحسب تلقائياً 4 م³', (await page.inputValue('#lfQty')) === '4');
  await save();
  check('بند الحفر: 4 م³ × 50 = 200', await ev(() => { const l = getCurrentDoc().lines[4]; return l.qty === 4 && lineTotal(l) === 200 && l.kind === 'excavation'; }));
  // (6) يومية + مقاولة + مراحل + خامة العميل
  await ev(() => addLinesToCurrentDoc([
    { cat: 'labor', kind: 'labor', name: 'يومية سباك', method: 'daily', qty: 3, mult: 2, price: 500 },
    { cat: 'residential', kind: 'service', name: 'تأسيس مطبخ', method: 'kitchen', qty: 1, price: 3000, space: 'المطبخ' },
    { cat: 'sanitary', kind: 'fixture', name: 'قاعدة حمام', method: 'supply', qty: 2, price: 3000, install: 400, source: 'client' }
  ])); await settle(300);
  await page.click('#linesBody button:has-text("مراحل العمل")'); await settle(400);
  check('إضافة مراحل العمل الـ 13 للمقايسة', (await ev(() => getCurrentDoc().lines.filter(l => l.method === 'stage').length)) === 13);
  await page.click('#linesBody .stage-check >> nth=0'); await settle(300);
  check('تعليم المرحلة كمنفذة (حالة التنفيذ)', await ev(() => { const t = computeDoc(getCurrentDoc()); return t.stagesDone === 1 && t.stagesCount === 13; }));
  await page.click('#linesGroupSeg [data-g="space"]'); await settle(300);
  check('عرض البنود حسب المكان', (await page.textContent('#linesBody')).includes('حمام رئيسي') && (await page.textContent('#linesBody')).includes('بنود عامة'));
  await shot('05-lines');
  await page.click('#linesGroupSeg [data-g="kind"]'); await settle(300);
  const tEst = await ev(() => { const t = computeDoc(getCurrentDoc()); return { sub: t.subtotal, service: t.byKind.service, material: t.byKind.material, fitting: t.byKind.fitting, fixture: t.byKind.fixture, labor: t.byKind.labor, exc: t.byKind.excavation, cost: t.cost }; });
  check('مجموع المقايسة = 3000 + 2000 + 750 + 2000 + 200 + 3000 + 3000 + 800 = 14,750', tEst.sub === 14750, tEst);
  check('الفصل: مصنعية 7,000 / مواسير 2,000 / وصلات 750 / أدوات صحية 1,800 / أجور 3,000 / حفر 200', tEst.service === 7000 && tEst.material === 2000 && tEst.fitting === 750 && tEst.fixture === 1800 && tEst.labor === 3000 && tEst.exc === 200, tEst);
  await page.click('#ebNext'); await settle(500);
  check('المقايسة لا تقبل دفعات قبل تحويلها لفاتورة', await page.isVisible('#convInvoice') && !(await page.isVisible('#docPayList')));
  await page.fill('#docAdd', '500'); await page.fill('#docDisc', '250'); await settle(300);
  check('إجمالي المقاولة = البنود + الإضافات − الخصم = 15,000', (await ev(() => computeDoc(getCurrentDoc()).total)) === 15000);
  await shot('06-summary');

  /* ---------- PDF المقايسة ---------- */
  console.log('\n[7] مستندات PDF العربية');
  await page.click('#summaryBody button:has-text("معاينة")'); await settle(700);
  const pdf1 = await page.textContent('#printSheet');
  check('PDF المقايسة: العنوان والعميل والمشروع والعملة', pdf1.includes('مقايسة تأسيس سباكة') && pdf1.includes('م. خالد سمير') && pdf1.includes('شقة التجمع الخامس') && pdf1.includes('جنيه مصري'));
  check('PDF المقايسة: نطاق العمل وغير المشمول وشروط الاتفاق', pdf1.includes('تأسيس سباكة شقة: 2 حمام ومطبخ') && pdf1.includes('توريد الأدوات الصحية') && pdf1.includes('30% عربون'));
  check('PDF المقايسة: الأقسام مفصولة والإجمالي 15,000', pdf1.includes('المصنعية والخدمات') && pdf1.includes('المواسير والخامات') && pdf1.includes('الأدوات الصحية') && pdf1.includes('15,000'));
  check('PDF: خامات العميل ظاهرة ومش محسوبة', pdf1.includes('من العميل'));
  const rtl = await ev(() => { const s = document.getElementById('printSheet'); const cs = getComputedStyle(s); const th = s.querySelector('.p-table th'); const r1 = th.getBoundingClientRect(), r2 = th.parentElement.lastElementChild.getBoundingClientRect(); return { dir: cs.direction, firstIsRight: r1.left > r2.left, w: s.offsetWidth, over: [...s.querySelectorAll('td,th,h1,.val')].filter(e => e.scrollWidth > e.clientWidth + 2).length }; });
  check('PDF عربي RTL: الاتجاه يمين لشمال والجدول غير معكوس', rtl.dir === 'rtl' && rtl.firstIsRight, rtl);
  check('PDF: مفيش نص مقصوص داخل الجداول', rtl.over === 0, rtl);
  check('PDF: الحروف العربية متصلة (نص حقيقي مش صورة) وقابلة للتعديل', await ev(() => !!document.querySelector('#printSheet [contenteditable="true"]') && document.querySelector('#printSheet h1').textContent.trim() === 'مقايسة تأسيس سباكة'));
  await shot('07-pdf-estimate');
  await page.emulateMedia({ media: 'print' });
  const pdfPath = path.join(OUT, 'estimate.pdf');
  await page.pdf({ path: pdfPath, format: 'A4', printBackground: true });
  await page.emulateMedia({ media: 'screen' });
  check('توليد ملف PDF فعلي A4', fs.existsSync(pdfPath) && fs.statSync(pdfPath).size > 20000 && fs.readFileSync(pdfPath).slice(0, 5).toString() === '%PDF-', fs.existsSync(pdfPath) && fs.statSync(pdfPath).size);
  await ev(() => closeOverlay()); await settle(400);

  /* ---------- التحويل لفاتورة + المدفوعات ---------- */
  console.log('\n[8] التحويل لفاتورة والمدفوعات (عربون ودفعات)');
  await page.click('#convInvoice'); await settle(600);
  check('تحويل المقايسة لفاتورة أعمال بنفس البنود', await ev(() => { const d = getCurrentDoc(); return d.docType === 'invoice' && d.number === 'INV-0001' && d.convertedFrom === 'EST-0001' && computeDoc(d).total === 15000; }));
  check('الفاتورة خصمت المواسير من المخزن (100 − 20 = 80)', (await ev(() => DB.inventory[0].qty)) === 80);
  await page.click('#summaryBody button:has-text("تسجيل عربون")'); await settle(450);
  await page.fill('#payAmount', '5000'); await page.click('#payMethod [data-m="تحويل بنكي"]');
  await save();
  await page.click('#summaryBody button:has-text("تسجيل دفعة")'); await settle(450);
  await page.fill('#payAmount', '4000');
  await save();
  const tInv = await ev(() => { const t = computeDoc(getCurrentDoc()); return { paid: t.paid, rem: t.remaining, n: t.payments.length, kinds: t.payments.map(p => p.kind).join(','), methods: t.payments.map(p => p.method).join(',') }; });
  check('عربون 5,000 + دفعة 4,000 → المتبقي 6,000', tInv.paid === 9000 && tInv.rem === 6000 && tInv.kinds === 'deposit,payment', tInv);
  check('طرق دفع مختلفة وسجل مدفوعات', tInv.methods === 'تحويل بنكي,كاش' && (await ev(() => DB.payments.every(p => /^RCPT-/.test(p.number)))));
  check('شريط الفاتورة يعرض المتبقي 6,000', (await page.textContent('#ebValue')).includes('6,000'));
  // إيصال
  await ev(() => openReceiptPreview(DB.payments[0].id)); await settle(600);
  const rc = await page.textContent('#printSheet');
  check('إيصال استلام دفعة PDF (5,000 والمتبقي بعدها 10,000)', rc.includes('إيصال استلام دفعة') && rc.includes('5,000') && rc.includes('10,000') && rc.includes('عربون'));
  await shot('08-receipt');
  await ev(() => closeOverlay()); await settle(400);
  // يومية العامل على المشروع + مصروف نقل
  await ev(([w, p, d]) => {
    getWorker(w).entries.push(NORMALIZERS.workers({ entries: [{ type: 'day', days: 3, rate: 500, docId: d, projectId: p, task: 'تأسيس الحمام الرئيسي' }] }).entries[0]);
    DB.expenses.push(NORMALIZERS.expenses({ id: 'xT', cat: 'نقل ومواصلات', amount: 300, docId: d, projectId: p, note: 'نقل المواسير' }));
    saveCol('workers'); saveCol('expenses'); refreshAll();
  }, [wid, pid, await ev(() => getCurrentDoc().id)]);
  const prof = await ev(() => { const t = computeDoc(getCurrentDoc()); return { cost: t.cost, mat: t.materialsCost, other: t.otherExpenses, labor: t.labor, profit: t.profit }; });
  check('ربح الفاتورة: 15,000 − خامات 3,300 − نقل 300 − أجور 1,500 = 9,900', prof.cost === 3300 && prof.other === 300 && prof.labor === 1500 && prof.profit === 9900, prof);

  /* ---------- باقي المستندات ---------- */
  console.log('\n[9] كل أنواع المستندات');
  const docTypes = await ev(() => DOC_TYPE_ORDER.map(t => { const d = NORMALIZERS.docs({ docType: t, number: 'T-1', clientName: 'اختبار', lines: [{ name: 'نقطة حوض', method: 'point', kind: 'service', qty: 2, price: 100 }] }); const h = buildDocHTML(d); return [t, h.includes(DOC_TYPES[t].label) && h.includes('200')]; }));
  check('11 نوع مستند يتولد صح (مقايسات التأسيس/التشطيب/التغذية/الصرف/الحمام/المطبخ، عرض سعر، فواتير)', docTypes.length === 11 && docTypes.every(x => x[1]), docTypes.filter(x => !x[1]));
  await ev(() => closeEverythingThen(() => pickDocType())); await settle(500);
  check('قائمة اختيار نوع المستند فيها 11 نوع', (await page.$$('#docTypeList .mode-opt')).length === 11);
  await page.click('#docTypeList [data-t="supply"]'); await settle(800);
  check('فاتورة توريد وتركيب جديدة SUP-0001', (await ev(() => getCurrentDoc().number)) === 'SUP-0001');
  await ev(c => { const d = getCurrentDoc(); linkDocToCustomer(d, getCustomer(c)); addLinesToCurrentDoc([{ cat: 'pumps', kind: 'equipment', name: 'طلمبة رفع مياه', method: 'supply', qty: 1, price: 4500, cost: 3800, install: 500 }]); }, cid); await settle(400);
  check('توريد وتركيب: توريد 4,500 + مصنعية 500 منفصلين', await ev(() => { const t = computeDoc(getCurrentDoc()); return t.total === 5000 && t.byKind.equipment === 4500 && t.byKind.service === 500 && t.cost === 3800; }));
  // كشف حساب العميل
  await ev(c => closeEverythingThen(() => openStatementPreview(c)), cid); await settle(800);
  const stt = await page.textContent('#printSheet');
  check('كشف حساب العميل PDF: فاتورتين 20,000 − مدفوع 9,000 = 11,000', stt.includes('كشف حساب العميل') && stt.includes('INV-0001') && stt.includes('SUP-0001') && stt.includes('11,000'));
  await shot('09-statement');
  await ev(() => closeOverlay()); await settle(400);
  // تقرير مصروفات المشروع
  await ev(p => openProjectReportPreview(p), pid); await settle(800);
  const prt = await page.textContent('#printSheet');
  check('تقرير مصروفات المشروع PDF: المصروفات والأجور وصافي الربح', prt.includes('تقرير مصروفات المشروع') && prt.includes('نقل المواسير') && prt.includes('أسطى محمود') && prt.includes('9,900'));
  await shot('10-project-report');
  await ev(() => closeOverlay()); await settle(400);
  // فاتورة ختامية
  await ev(() => { openDoc(DB.docs.find(d => d.number === 'INV-0001').id); }); await settle(700);
  await ev(() => convertCurrentDoc('final')); await settle(600);
  check('تحويل لفاتورة ختامية مع بقاء المدفوعات', await ev(() => { const d = getCurrentDoc(); const t = computeDoc(d); return d.docType === 'final' && /^FIN-/.test(d.number) && t.paid === 9000 && t.remaining === 6000; }));
  await ev(() => openDocPreview(false)); await settle(700);
  check('الفاتورة الختامية PDF فيها المدفوعات والمتبقي', (await page.textContent('#printSheet')).includes('فاتورة ختامية') && (await page.textContent('#printSheet')).includes('المتبقي المطلوب سداده'));
  await shot('11-final-invoice');
  await ev(() => closeOverlay()); await settle(400);

  /* ---------- الصيانة والزيارات ---------- */
  console.log('\n[10] سجل الصيانة والإصلاح');
  await ev(() => closeEverythingThen(() => switchView('home'))); await settle(500);
  await page.click('#qVisit'); await settle(600);
  await page.click('#vfCust'); await settle(400);
  await page.click('#pickList button >> nth=0'); await settle(500);
  await page.click('#vfTypeChips [data-s="زيارة طوارئ"]');
  await page.click('#vfProbChips [data-p="تسريب مياه"]');
  await page.fill('#vfProblem', 'تسريب من وصلة السخان');
  await page.fill('#vfLoc', 'حمام رئيسي');
  await page.click('#vfRepChips [data-r="تغيير قطعة"]');
  await page.fill('#vfWork', 'تغيير محبس الزاوية واختبار التسريب');
  await page.click('#vfAddInv'); await settle(400);
  await page.click('#pickList button:has-text("محبس زاوية")'); await settle(450);
  await page.fill('#vpQty', '2');
  await page.click('.sheet.open [data-f="save"]'); await settle(500);
  await page.fill('#vfFee', '150'); await page.fill('#vfLabor', '300'); await page.fill('#vfWar', '3');
  await page.fill('#vfNext', await ev(() => addDaysISO(todayISO(), 3)));
  check('إجمالي الزيارة اللحظي = 150 + 300 + 140 = 590', (await page.textContent('#vfLive')).includes('590'));
  await page.click('button:has-text("حفظ الزيارة")'); await settle(800);
  const vis = await ev(() => { const v = DB.visits[0]; return v && { n: v.number, fee: v.visitFee, labor: v.laborValue, total: visitTotal(v), type: v.visitType, prob: v.problemType, loc: v.location, rep: v.repairType, parts: v.parts.length, stock: invById('iVal').qty }; });
  check('حفظ الزيارة بكل بياناتها (المشكلة، المكان، نوع الإصلاح، القطع، الضمان)', vis && vis.n === 'VST-0001' && vis.type === 'زيارة طوارئ' && vis.prob === 'تسريب مياه' && vis.loc === 'حمام رئيسي' && vis.rep === 'تغيير قطعة' && vis.parts === 1, vis);
  check('أجرة الزيارة (150) منفصلة عن مصنعية الإصلاح (300) والقطع (140)', vis.fee === 150 && vis.labor === 300 && vis.total === 590, vis);
  check('القطعة المستبدلة اتخصمت من المخزن (20 − 2 = 18)', vis.stock === 18);
  await ev(() => openVisitReportPreview(DB.visits[0].id)); await settle(700);
  const vr = await page.textContent('#printSheet');
  check('تقرير صيانة وإصلاح PDF', vr.includes('تقرير صيانة وإصلاح') && vr.includes('تسريب من وصلة السخان') && vr.includes('حمام رئيسي') && vr.includes('590'));
  await shot('12-maintenance-report');
  await ev(() => closeOverlay()); await settle(400);
  await page.click('button:has-text("إنشاء فاتورة من الزيارة")'); await settle(900);
  check('فاتورة صيانة من الزيارة ببنود منفصلة = 590', await ev(() => { const d = getCurrentDoc(); const t = computeDoc(d); return d.docType === 'maint' && t.total === 590 && t.byKind.diag === 150 && t.byKind.service === 300 && t.byKind.part === 140 && DB.visits[0].docId === d.id; }));
  check('القطع لم تُخصم من المخزن مرة تانية مع الفاتورة', (await ev(() => invById('iVal').qty)) === 18);
  await ev(() => closeEverythingThen(() => openPage('visits'))); await settle(500);
  await page.fill('#visSearch', 'السخان'); await settle(400);
  check('البحث في سجل الصيانة بوصف العطل', (await page.$$('#page1Body .inv-card[data-visit]')).length === 1);
  await page.fill('#visSearch', 'محبس زاوية'); await settle(400);
  check('البحث في سجل الصيانة بالقطعة المستبدلة', (await page.$$('#page1Body .inv-card[data-visit]')).length === 1);
  await page.fill('#visSearch', 'كهرباء'); await settle(400);
  check('بحث بدون نتائج', (await page.$$('#page1Body .inv-card[data-visit]')).length === 0);
  await ev(c => closeEverythingThen(() => openMaintHistoryPreview(c)), cid); await settle(800);
  check('سجل الصيانة للعميل PDF', (await page.textContent('#printSheet')).includes('سجل العميل') && (await page.textContent('#printSheet')).includes('تسريب مياه'));
  await ev(() => closeOverlay()); await settle(400);

  /* ---------- تعدد العملات ---------- */
  console.log('\n[11] تعدد العملات');
  await ev(() => switchView('more')); await settle(400);
  check('قائمة العملات فيها كل العملات العربية (23 خيار)', (await page.$$('#currencySelect option')).length >= 23);
  const totalBefore = await ev(() => customerStats(DB.customers[0]).billed);
  await page.selectOption('#currencySelect', 'SAR'); await settle(500);
  check('تغيير العملة للريال السعودي: الرمز يتغير في كل مكان', (await ev(() => money(1500))) === '1,500 ر.س' && (await page.textContent('.cur')).includes('ر.س'));
  check('تغيير العملة لا يحوّل القيم ولا يضيّع البيانات', (await ev(() => customerStats(DB.customers[0]).billed)) === totalBefore);
  await ev(() => { openDoc(DB.docs.find(d => d.docType === 'final').id); }); await settle(700);
  await ev(() => openDocPreview(false)); await settle(600);
  check('الفاتورة PDF بالعملة المختارة (ريال سعودي ر.س)', (await page.textContent('#printSheet')).includes('ريال سعودي') && (await page.textContent('#printSheet')).includes('ر.س'));
  await ev(() => closeOverlay()); await settle(300);
  await ev(() => closeEverythingThen(() => { setCurrency('KWD'); })); await settle(500);
  check('الدينار الكويتي بثلاث كسور', (await ev(() => money(10.1256))) === '10.126 د.ك');
  await page.reload(); await settle(1000);
  check('إعداد العملة محفوظ بعد إعادة الفتح', (await ev(() => settings.currency)) === 'KWD');
  await ev(() => setCurrency('EGP')); await settle(400);
  await ev(() => openPage('calc')); await settle(400);
  await page.click('#calcTabs [data-t="fx"]'); await settle(300);
  await page.selectOption('#c_fx_code', 'USD'); await settle(300);
  await page.fill('#fxRate', '50'); await page.fill('#c_fx_amount', '100'); await settle(200);
  check('تحويل العملات المرجعي: 100 $ × 50 = 5,000 ج.م', (await page.textContent('#calcTotal')).includes('5,000'));

  /* ---------- الحاسبات ---------- */
  console.log('\n[12] الحاسبات');
  const nDocs = await ev(() => DB.docs.length);
  await page.click('#calcTabs [data-t="points"]'); await settle(300);
  await page.fill('#calcCard [data-cr="points.rows.0.name"]', 'نقطة حوض'); await page.fill('#calcCard [data-cr="points.rows.0.qty"]', '10'); await page.fill('#calcCard [data-cr="points.rows.0.price"]', '300'); await settle(200);
  check('حاسبة النقاط: 10 × 300 = 3,000', (await page.textContent('#calcTotal')).includes('3,000'));
  await page.click('#calcTabs [data-t="bath"]'); await settle(300);
  await page.click('#calcCard [data-cseg="bath.mode"] [data-v="stages"]'); await settle(300);
  await page.fill('#c_bath_feed', '3000'); await page.fill('#c_bath_drain', '2000'); await page.fill('#c_bath_fixtures', '1500'); await settle(200);
  check('حاسبة الحمام: تأسيس 5,000 + تركيب الأدوات 1,500 = 6,500', (await page.textContent('#calcTotal')).includes('6,500') && (await page.textContent('#calcRes')).includes('5,000'));
  await shot('13-calc-bath');
  await page.click('button:has-text("جديدة بالحساب ده")'); await settle(900);
  check('الحاسبة أنشأت «مقايسة حمام» بالبنود = 6,500', (await ev(() => DB.docs.length)) === nDocs + 1 && await ev(() => getCurrentDoc().docType === 'est_bath' && computeDoc(getCurrentDoc()).total === 6500 && getCurrentDoc().lines.every(l => l.space === 'حمام 1')));
  await ev(() => closeEverythingThen(() => openPage('calc'))); await settle(500);
  await page.click('#calcTabs [data-t="pipes"]'); await settle(300);
  await page.fill('#calcCard [data-cr="pipes.segs.0.len"]', '20'); await page.fill('#calcCard [data-cr="pipes.segs.0.price"]', '100'); await settle(200);
  check('حاسبة المواسير: 20 م × 100 = 2,000', (await page.textContent('#calcTotal')).includes('2,000'));
  await page.fill('#calcCard [data-cr="pipes.segs.0.waste"]', '10'); await page.fill('#calcCard [data-cr="pipes.segs.0.bar"]', '4'); await settle(200);
  check('الهالك 10% وطول العود 4 م: مطلوب 22 م = 6 أعواد', (await page.textContent('#calcCard [data-segres="0"]')).includes('22') && (await page.textContent('#calcCard [data-segres="0"]')).includes('6 عود'));
  await page.click('#calcCard [data-cradd="pipes.fits"]'); await settle(300);
  await page.fill('#calcCard [data-cr="pipes.fits.0.name"]', 'محبس'); await page.fill('#calcCard [data-cr="pipes.fits.0.qty"]', '5'); await page.fill('#calcCard [data-cr="pipes.fits.0.price"]', '150'); await settle(200);
  check('المواسير 2,200 + 5 محابس 750 = 2,950 (الوصلات حصر يدوي)', (await page.textContent('#calcTotal')).includes('2,950') && (await page.textContent('#calcCard')).includes('ما ينفعش يتحسب بدقة من طول الماسورة'));
  await shot('14-calc-pipes');
  await page.click('#calcTabs [data-t="dig"]'); await settle(300);
  await page.fill('#c_dig_len', '10'); await page.fill('#c_dig_wid', '0.5'); await page.fill('#c_dig_dep', '0.8'); await settle(200);
  check('حاسبة الحفر: 10 × 0.5 × 0.8 = 4 م³', (await page.textContent('#digVol')).trim() === '4');
  await page.click('#calcTabs [data-t="daily"]'); await settle(300);
  await page.fill('#c_daily_plumbers', '2'); await page.fill('#c_daily_wage', '500'); await page.fill('#c_daily_days', '3'); await settle(200);
  check('حاسبة اليومية: 2 × 500 × 3 = 3,000', (await page.textContent('#calcTotal')).includes('3,000'));
  await page.click('#calcTabs [data-t="tanks"]'); await settle(300);
  await page.fill('#c_tanks_people', '5'); await settle(200);
  check('مرجع الخزان يوضح إنه «رقم مرجعي فقط» مش بديل للحسابات الهندسية', (await page.textContent('#tankRefOut')).includes('رقم مرجعي فقط') && (await page.textContent('#tankRefOut')).includes('حسابات هندسية'));
  for (const t of ['kitchen', 'items', 'maint']) { await page.click(`#calcTabs [data-t="${t}"]`); await settle(200); }
  check('كل الحاسبات تفتح بدون أخطاء', errors.length === 0, errors);

  /* ---------- النقاط والمراحل وقوائم الأسعار والعقود والنوتة ---------- */
  console.log('\n[13] تعريف النقاط، المراحل، قوائم الأسعار، العقود، النوتة، المواعيد');
  await ev(() => closeEverythingThen(() => openPage('pointsCfg'))); await settle(500);
  await page.click('button:has-text("نوع نقطة جديد")'); await settle(400);
  await page.fill('#ptName', 'نقطة بانيو'); await save();
  check('إضافة نوع نقطة جديد من الواجهة (17 نقطة)', (await ev(() => pointTypes().length)) === 17 && await ev(() => catItems('points').some(i => i[0] === 'نقطة بانيو')));
  await page.click('#page1Body .mat-row[data-pt] >> nth=16'); await settle(400);
  await page.fill('#ptName', 'نقطة جاكوزي'); await page.click('#ptConn [data-c="fixture"]'); await save();
  check('تعديل اسم النقطة', await ev(() => pointTypes().some(p => p.name === 'نقطة جاكوزي') && !pointTypes().some(p => p.name === 'نقطة بانيو')));
  await page.click('#page1Body .mat-row[data-pt] >> nth=16'); await settle(400);
  await page.click('.sheet.open #formFoot [data-f="del"]'); await settle(200); await page.click('#appConfirmYesBtn'); await settle(500);
  check('حذف النقطة', (await ev(() => pointTypes().length)) === 16);
  await page.click('#pdOpts [data-def="separate"]'); await settle(300);
  await page.reload(); await settle(1000);
  check('تعريف النقطة محفوظ في الإعدادات بعد إعادة الفتح', (await ev(() => pointDef())) === 'separate');
  await ev(() => setPointDef('combined'));
  await ev(() => openPage('stagesCfg')); await settle(400);
  await page.click('button:has-text("مرحلة جديدة")'); await settle(400);
  await page.fill('#sgName', 'عزل الحمامات'); await save();
  check('إضافة مرحلة عمل جديدة (14 مرحلة)', (await ev(() => stagesList().length)) === 14 && (await ev(() => stagesList()[13])) === 'عزل الحمامات');
  // قوائم الأسعار
  await ev(() => closeEverythingThen(() => openPage('pricelists'))); await settle(500);
  const plCount = await ev(() => activePriceList().items.length);
  check('قائمة الأسعار الأساسية جاهزة بدون أي سعر إجباري', plCount >= 14 && await ev(() => activePriceList().items.every(i => i.price === 0)));
  await page.fill('#page1Body [data-pp] >> nth=0', '250'); await page.press('#page1Body [data-pp] >> nth=0', 'Tab'); await settle(300);
  check('تعديل سعر في القائمة', (await ev(() => activePriceList().items[0].price)) === 250);
  await page.click('button:has-text("نسخ القائمة")'); await settle(400);
  await page.fill('#plName', 'أسعار الشركات'); await save();
  check('نسخ قائمة الأسعار (قوائم متعددة) بنفس الأسعار', await ev(() => DB.pricelists.length === 2 && activePriceList().name === 'أسعار الشركات' && activePriceList().items[0].price === 250 && activePriceList().items.length === DB.pricelists[0].items.length));
  // عقد صيانة
  await ev(c => { const k = NORMALIZERS.contracts({ id: 'ctT', number: 'CNT-0001', customerId: c, clientName: 'م. خالد سمير', period: 'annual', start: todayISO(), end: addMonthsISO(todayISO(), 12), visitsIncluded: 4, value: 2400, sites: 'عمارة 4 أدوار', services: CONTRACT_SERVICES.slice(0, 3), extraServices: 'قطع الغيار' }); DB.contracts.push(k); saveCol('contracts'); }, cid);
  await ev(() => closeEverythingThen(() => openPage('contract', 'ctT'))); await settle(500);
  await ev(() => openContractPreview('ctT')); await settle(600);
  check('عقد الصيانة PDF (سنوي، 4 زيارات، 2,400، قطع الغيار غير مشمولة)', (await page.textContent('#printSheet')).includes('عقد صيانة') && (await page.textContent('#printSheet')).includes('2,400') && (await page.textContent('#printSheet')).includes('قطع الغيار'));
  await ev(() => closeOverlay()); await settle(300);
  await ev(() => invoiceContract('ctT')); await settle(800);
  check('إصدار فاتورة بقيمة العقد 2,400', (await ev(() => computeDoc(getCurrentDoc()).total)) === 2400);
  // النوتة
  await ev(() => closeEverythingThen(() => openPage('notes'))); await settle(500);
  await page.click('#page1Body .btn-accent'); await settle(400);
  await page.click('#nfCat [data-c="مواقع المحابس"]');
  await page.fill('#nfTitle', 'المحبس العمومي'); await page.fill('#nfBody', 'خلف باب المطبخ على ارتفاع 40 سم');
  await page.selectOption('#nfCust', cid); await settle(200); await page.selectOption('#nfProj', pid);
  await save();
  await page.fill('#noteSearch', 'باب المطبخ'); await settle(400);
  check('النوتة: إضافة وتصنيف وبحث', (await page.textContent('#page1Body')).includes('المحبس العمومي') && (await page.$$('#page1Body .note-card')).length === 1);
  check('النوتة مربوطة بالعميل والمشروع', await ev(([c, p]) => DB.notes[0].customerId === c && DB.notes[0].projectId === p && projectStats(getProject(p)).notes.length === 1 && customerStats(getCustomer(c)).notes.length === 1, [cid, pid]));
  await page.click('#page1Body .note-card'); await settle(400);
  await page.fill('#nfBody', 'خلف باب المطبخ على ارتفاع 50 سم'); await save();
  check('تعديل الملاحظة', (await ev(() => DB.notes[0].body)).includes('50 سم'));
  await ev(() => { DB.notes.push(NORMALIZERS.notes({ id: 'nD', cat: 'مواعيد الزيارات', title: 'معاينة فيلا', date: addDaysISO(todayISO(), 2) })); saveCol('notes'); });
  const rem = await ev(() => collectReminders().map(r => r.kind));
  check('المواعيد: زيارة متابعة + تسليم مشروع + موعد النوتة + زيارة عقد', ['visit', 'project', 'note', 'contract'].every(k => rem.includes(k)), rem);
  check('الضمان: ضمان الزيارة (3 شهور) مسجل', (await ev(() => collectWarranties().filter(w => w.active).length)) >= 1);
  const ics = await ev(() => { let out = ''; const orig = downloadText; window.downloadText = t => { out = t; return true; }; exportICS(collectReminders()); window.downloadText = orig; return out; });
  check('تصدير المواعيد لتقويم الموبايل (ics) بدون سيرفر', ics.includes('BEGIN:VCALENDAR') && ics.includes('Hesabati Plumbing'));
  const fin = await ev(() => { finPeriod = 'all'; return financeTotals(); });
  check('صافي الربح = الإيرادات المحصلة − التكاليف الفعلية المدفوعة', fin.netProfit === Math.round((fin.collected - fin.expenses - fin.wagesPaid) * 100) / 100 && fin.collected === 9000, fin);
  // صفحة المشروع: الحصر
  await ev(p => closeEverythingThen(() => { projTab = 'qty'; openPage('project', p); }), pid); await settle(600);
  const tk = await page.textContent('#page1Body');
  check('حصر المشروع متجمع تلقائياً (10 نقاط، مواسير، محابس، خلاط)', tk.includes('إجمالي النقاط') && tk.includes('10 نقطة') && tk.includes('ماسورة PPR') && tk.includes('محبس'));
  await shot('15-project-takeoff');
  await page.click('#projTabs [data-t="cost"]'); await settle(300);
  check('مصروفات وأجور المشروع ظاهرة في صفحته', (await page.textContent('#page1Body')).includes('نقل المواسير') && (await page.textContent('#page1Body')).includes('أسطى محمود'));
  // زر الرجوع + كل الصفحات
  await ev(() => closeEverythingThen(() => openPage('customer', DB.customers[0].id))); await settle(400);
  await ev(() => openPage('project', DB.projects[0].id)); await settle(400);
  await page.goBack(); await settle(400);
  check('زر الرجوع يقفل الصفحة العلوية فقط', await ev(() => pageStack.length === 1 && pageStack[0].key === 'customer'));
  for (const k of ['projects', 'visits', 'inventory', 'workers', 'finance', 'payments', 'pricelists', 'contracts', 'reminders', 'notes', 'calc', 'pointsCfg', 'stagesCfg']) {
    await ev(k => closeEverythingThen(() => openPage(k)), k); await settle(300);
  }
  await ev(() => closeEverythingThen(() => openPage('finance'))); await settle(400);
  await shot('16-finance');
  await ev(() => closeEverythingThen(() => switchView('home'))); await settle(500);
  check('كل الأقسام فتحت بدون أخطاء JavaScript', errors.length === 0, errors);
  await shot('17-home-filled');

  /* ---------- النسخ الاحتياطي والاستعادة ---------- */
  console.log('\n[14] النسخ الاحتياطي والاستعادة');
  // صورة للزيارة
  await ev(() => mediaPut('phT1', 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/yQALCAABAAEBAREA/8wABgAQEAX/2gAIAQEAAD8A0s8g/9k=').then(() => { DB.visits[0].photos.push({ id: 'phT1', stage: 'before' }); saveCol('visits'); }));
  await ev(() => switchView('more')); await settle(400);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('button:has-text("نسخة كاملة")')]);
  const bpath = path.join(OUT, 'backup.json');
  await dl.saveAs(bpath);
  const backup = JSON.parse(fs.readFileSync(bpath, 'utf8'));
  const snapFn = () => ({ docs: DB.docs.length, customers: DB.customers.length, projects: DB.projects.length, visits: DB.visits.length, payments: DB.payments.length, inventory: DB.inventory.length, workers: DB.workers.length, notes: DB.notes.length, expenses: DB.expenses.length, pricelists: DB.pricelists.length, contracts: DB.contracts.length,
    rem: customerStats(DB.customers[0]).remaining, proj: projectStats(DB.projects[0]).profit, stock: DB.inventory.map(i => i.qty).join(','), cur: settings.currency, def: pointDef(), stages: stagesList().length, pts: pointTypes().length });
  const snap = await ev(snapFn);
  check('ملف النسخة الكاملة JSON مستقل (app = hesabati-plumbing)', backup.app === 'hesabati-plumbing' && backup.data.docs.length === snap.docs && backup.data.projects.length === snap.projects && backup.data.visits.length === snap.visits);
  check('النسخة فيها الإعدادات (العملة، تعريف النقطة، المراحل) والصور', backup.settings.currency === 'EGP' && backup.settings.stages.length === 14 && Object.keys(backup.media || {}).length === 1);
  // مسح البيانات ثم الاستعادة
  await ev(ns => { Object.keys(localStorage).filter(k => k.startsWith(ns)).forEach(k => localStorage.removeItem(k)); return mediaKeys().then(keys => Promise.all(keys.map(k => mediaTx('readwrite', s => s.delete(k))))); }, NSP);
  await page.reload(); await settle(1200);
  check('بعد المسح: البيانات فاضية', (await ev(() => DB.customers.length + DB.docs.length + DB.projects.length)) === 0);
  await ev(() => switchView('more')); await settle(300);
  await page.setInputFiles('#importFile', bpath); await settle(500);
  await page.click('#appConfirmYesBtn'); await settle(1200);
  const after = await ev(snapFn);
  check('الاستعادة رجّعت كل البيانات والحسابات والإعدادات بدون فقد', JSON.stringify(after) === JSON.stringify(snap), { snap, after });
  check('الصور رجعت مع الاستعادة', await ev(() => mediaGet('phT1').then(d => !!d)));
  // رفض نسخ التطبيقات الأخرى
  for (const [name, obj] of [['الكهرباء', { app: 'hesabaty', backupVersion: 3, invoices: [{ id: 'x', clientName: 'كهرباء' }], customers: [] }], ['التكييف', { app: 'hesabati-hvac', backupVersion: 1, data: { docs: [{ id: 'h1' }], customers: [{ id: 'hc', name: 'عميل تكييف' }] } }], ['النقاشة', { app: 'hesabati-painting', data: { docs: [], customers: [{ id: 'pc', name: 'عميل نقاشة' }] } }]]) {
    const f = path.join(OUT, 'other-backup.json');
    fs.writeFileSync(f, JSON.stringify(obj));
    await page.setInputFiles('#importFile', f); await settle(500);
    check(`رفض استيراد نسخة حساباتي ${name}`, (await page.textContent('#appToast')).includes('مش هيتستورد') && !(await page.isVisible('#appConfirmModal.open')) && (await ev(() => DB.customers.length)) === snap.customers);
  }
  // تحمّل البيانات التالفة ومعالجة أخطاء التخزين
  await ev(ns => localStorage.setItem(ns + 'notes_v1', '{broken json'), NSP);
  await page.reload(); await settle(1000);
  check('بيانات تالفة لا توقف التطبيق (وبتتحفظ نسخة منها)', errors.length === 0 && (await ev(ns => Object.keys(localStorage).some(k => k.startsWith(ns + 'notes_v1_corrupt_')), NSP)), errors);
  check('فشل الحفظ (التخزين ممتلئ) يظهر تنبيه بدل ما يضيع البيانات في صمت', await ev(() => { const orig = Storage.prototype.setItem; Storage.prototype.setItem = function () { throw new Error('QuotaExceededError'); }; const ok = saveCol('docs'); Storage.prototype.setItem = orig; return ok === false && document.getElementById('appToast').textContent.includes('تعذر الحفظ'); }));
  await ev(() => saveAll());

  /* ---------- العمل بدون إنترنت ---------- */
  console.log('\n[15] العمل بدون إنترنت');
  await page.goto(BASE); await settle(800);
  await ev(() => navigator.serviceWorker.ready); await settle(500);
  await page.reload(); await settle(1200);
  const controlled = await ev(() => !!navigator.serviceWorker.controller);
  const cachesList = await ev(() => caches.keys());
  check('Service Worker شغال ومتحكم في الصفحة', controlled, cachesList);
  check('أسماء الكاش مستقلة (hesabati-plumbing-*)', cachesList.length > 0 && cachesList.every(c => c.startsWith('hesabati-plumbing-')), cachesList);
  await ctx.setOffline(true);
  await page.reload(); await settle(1500);
  const offlineOk = await ev(() => typeof DB !== 'undefined' && DB.customers.length > 0 && document.getElementById('homeDue').textContent !== '');
  check('التطبيق يفتح ويعرض البيانات بدون إنترنت', offlineOk);
  await ev(() => startNewDoc('est_supply')); await settle(800);
  await ev(() => addLinesToCurrentDoc([{ name: 'خط مياه باردة', method: 'meter', kind: 'service', qty: 20, price: 100 }])); await settle(300);
  check('إنشاء مقايسة شبكة تغذية 20 م × 100 = 2,000 بدون إنترنت', (await ev(() => computeDoc(getCurrentDoc()).total)) === 2000);
  await ev(() => openDocPreview(false)); await settle(600);
  check('توليد PDF بدون إنترنت', (await page.textContent('#printSheet')).includes('مقايسة شبكة تغذية'));
  await ev(() => closeOverlay()); await settle(300);
  await page.reload(); await settle(1200);
  check('المقايسة محفوظة بعد إعادة الفتح بدون إنترنت', await ev(() => DB.docs.some(d => d.docType === 'est_supply' && d.lines.some(l => l.name === 'خط مياه باردة' && l.qty === 20))));
  await ctx.setOffline(false);
  await shot('18-offline');

  /* ---------- الاستقلال النهائي ---------- */
  console.log('\n[16] استقلال المشروع');
  const ls = await ev(() => { const o = {}; Object.keys(localStorage).forEach(k => { o[k] = localStorage.getItem(k); }); return o; });
  check('بيانات تطبيقات حساباتي الأخرى (الكهرباء/التكييف/النقاشة) لم تتغير حرفاً واحداً', Object.keys(OTHER).every(k => ls[k] === OTHER[k]));
  const ownKeys = Object.keys(ls).filter(k => !(k in OTHER));
  check('كل مفاتيح التخزين الجديدة تبدأ بـ hesabati_plumbing_', ownKeys.length > 10 && ownKeys.every(k => k.startsWith(NSP)), ownKeys.filter(k => !k.startsWith(NSP)));
  const idbNames = await ev(() => indexedDB.databases ? indexedDB.databases().then(d => d.map(x => x.name)) : []);
  check('قاعدة الصور مستقلة (hesabati_plumbing_media)', idbNames.length > 0 && idbNames.every(n => n.startsWith(NSP)), idbNames);
  const src = ['index.html', 'manifest.json', 'service-worker.js', 'js/core.js', 'js/app.js', 'android/app/build.gradle', '.github/workflows/android.yml'].map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n');
  check('لا يوجد في الكود أي مرجع لمستودعات أو مفاتيح التطبيقات الأخرى', !/Hesabaty-HAVC|hesabati[-_]?hvac|HesabatiHvac|HVAC_KEY|Ezaza|hesabaty-app-/i.test(src));
  check('مفتاح توقيع تطبيق التكييف غير منسوخ للمشروع', !fs.existsSync(path.join(ROOT, 'android', 'keystore.enc')) || !fs.existsSync(path.join(ROOT, '..', 'Hesabaty-HAVC', 'android', 'keystore.enc')) || !fs.readFileSync(path.join(ROOT, 'android', 'keystore.enc')).equals(fs.readFileSync(path.join(ROOT, '..', 'Hesabaty-HAVC', 'android', 'keystore.enc'))));
  check('لا أخطاء JavaScript طوال الاختبار', errors.length === 0, errors);

  /* ---------- فقاعة التحديث ---------- */
  console.log('\n[17] فقاعة «تحديث جديد» والتحديث المباشر');
  const realVer = JSON.parse(fs.readFileSync(path.join(ROOT, 'version.json'), 'utf8')).version;
  serveOverride.version = '0.9.0';
  const wctx = await browser.newContext({ viewport: { width: 412, height: 900 }, serviceWorkers: 'allow' });
  const wp = await wctx.newPage();
  wp.on('pageerror', e => errors.push('update: ' + e.message));
  await wp.goto(BASE); await wait(1500);
  await wp.evaluate(() => navigator.serviceWorker.ready); await wp.reload(); await wait(1500);
  check('الإصدار القديم شغال ومفيش فقاعة', (await wp.evaluate(() => APP_VERSION)) === '0.9.0' && await wp.isHidden('#updBubble'));
  serveOverride.version = null;
  await wp.evaluate(() => navigator.serviceWorker.getRegistration().then(r => r.update()));
  await wp.waitForSelector('#updBubble:not(.hidden)', { timeout: 20000 }).catch(() => {});
  check('فقاعة «تحديث جديد» ظهرت على الشاشة لوحدها', await wp.isVisible('#updBubble'));
  await wp.click('#updBubble'); await wait(500);
  await wp.evaluate(() => { DB.customers.push(NORMALIZERS.customers({ id: 'cU', name: 'عميل قبل التحديث' })); saveCol('customers'); });
  await Promise.all([wp.waitForNavigation({ timeout: 15000 }).catch(() => {}), wp.click('#appUpdBtn')]);
  await wait(1500);
  check('زرار التحديث حدّث التطبيق مباشرة للإصدار الجديد والبيانات محفوظة', (await wp.evaluate(() => APP_VERSION)) === realVer && await wp.evaluate(() => DB.customers.some(c => c.id === 'cU')));
  await wctx.close();
  // تطبيق أندرويد: الجسر مستقل والتحديث من مستودع السباكة فقط
  const actx = await browser.newContext({ viewport: { width: 412, height: 900 }, serviceWorkers: 'block' });
  await actx.addInitScript(() => {
    window.__dl = null;
    window.HesabatiPlumbingApp = { versionName: () => '0.9.0', sdk: () => 34, openExternal: () => {}, print: () => {}, saveFile: () => {}, downloadUpdate: (u, v) => { window.__dl = [u, v]; } };
  });
  let apiUrl = '';
  await actx.route('https://api.github.com/**', r => { apiUrl = r.request().url(); return r.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ tag_name: 'v9.9.9', body: '- ميزة جديدة للتجربة\n- إصلاحات', assets: [{ name: 'hesabati-plumbing.apk', size: 3145728, browser_download_url: 'https://github.com/AhmedHassanAbdallah/Hesabaty-plumbing/releases/download/v9.9.9/hesabati-plumbing.apk' }] }) }); });
  const ap = await actx.newPage();
  ap.on('pageerror', e => errors.push('apk: ' + e.message));
  await ap.goto(BASE); await wait(2500);
  check('أندرويد: التحديثات من مستودع Hesabaty-plumbing فقط', /repos\/AhmedHassanAbdallah\/Hesabaty-plumbing\/releases\/latest$/.test(apiUrl), apiUrl);
  check('أندرويد: فقاعة التحديث ظهرت', await ap.isVisible('#updBubble'));
  await ap.click('#updBubble'); await wait(500);
  await ap.click('#appUpdBtn'); await wait(300);
  const apkDl = await ap.evaluate(() => window.__dl);
  check('أندرويد: زرار التحديث بيحمّل hesabati-plumbing.apk', !!apkDl && /hesabati-plumbing\.apk$/.test(apkDl[0]) && apkDl[1] === '9.9.9', apkDl);
  await actx.close();
  check('لا أخطاء JavaScript في اختبار التحديث', errors.length === 0, errors);

  await browser.close();
  server.close();
}

(async () => {
  try { logicTests(); } catch (e) { failed++; fails.push('logic crash'); console.error(e); }
  if (!process.argv.includes('--no-browser')) {
    try { await browserTests(); } catch (e) { failed++; fails.push('browser crash: ' + e.message); console.error(e); }
  }
  console.log(`\n${failed ? '✘' : '✔'} ${passed} نجح · ${failed} فشل`);
  if (failed) { console.log('الفاشل: ' + fails.join(' | ')); process.exit(1); }
})();
