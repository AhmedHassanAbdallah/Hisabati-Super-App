#!/usr/bin/env node
/*
 * اختبارات حساباتي HVAC
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
    location: { pathname: '/Hesabaty-HAVC/', protocol: 'https:' }, history: { pushState: noop, replaceState: noop, back: noop, go: noop },
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
    // التركيب: 2 جهاز × 1500 = 3000
    R.install = CALC.install(Object.assign({}, calcState.install, { count: 2, price: 1500 })).total;
    R.installLine = lineTotal(normalizeLine({ name: 'تركيب تكييف سبليت', method: 'device', kind: 'service', qty: 2, price: 1500 }));
    // النحاس: 5 م × 250 = 1250
    R.copper = CALC.copper(Object.assign({}, calcState.copper, { len: 5, price: 250, lines: 1 })).total;
    R.copperLine = lineTotal(normalizeLine({ name: 'ماسورة نحاس', method: 'meter', kind: 'material', qty: 5, price: 250 }));
    R.copper2Lines = lineTotal(normalizeLine({ name: 'ماسورة نحاس', method: 'meter', kind: 'material', qty: 5, mult: 2, price: 250 }));
    // الفريون: 1.5 كجم × 500 = 750 (وبالجرام نفس النتيجة)
    R.ref = CALC.refrig(Object.assign({}, calcState.refrig, { qty: 1.5, qUnit: 'كجم', price: 500, pUnit: 'كجم', labor: 0 })).gas;
    R.refGrams = CALC.refrig(Object.assign({}, calcState.refrig, { qty: 1500, qUnit: 'جم', price: 500, pUnit: 'كجم', labor: 0 })).gas;
    R.refPerGram = CALC.refrig(Object.assign({}, calcState.refrig, { qty: 1.5, qUnit: 'كجم', price: 0.5, pUnit: 'جم', labor: 0 })).gas;
    R.refLine = lineTotal(normalizeLine({ name: 'شحن فريون', method: 'weight', kind: 'refrigerant', qty: 1500, wUnit: 'جم', pUnit: 'كجم', price: 500 }));
    // الصيانة: 4 × 300 = 1200
    R.maint = CALC.maint(Object.assign({}, calcState.maint, { count: 4, price: 300, visits: 1 })).total;
    R.maintLine = lineTotal(normalizeLine({ name: 'صيانة دورية', method: 'device', kind: 'service', qty: 4, price: 300 }));
    // اليومية: فنيان × 500 × يومين = 2000
    R.daily = CALC.daily(Object.assign({}, calcState.daily, { workers: 2, wage: 500, days: 2 })).total;
    R.dailyLine = lineTotal(normalizeLine({ name: 'يومية فني', method: 'daily', kind: 'labor', qty: 2, mult: 2, price: 500 }));
    R.dailyNet = CALC.daily({ workers: 1, wage: 500, days: 6, overtime: 200, deductions: 100, advances: 400 }).total;
    // الحساب بالقطعة / الزيارة / المقاولة
    R.piece = lineTotal(normalizeLine({ name: 'كابستور', method: 'piece', kind: 'part', qty: 3, price: 120 }));
    R.visit = lineTotal(normalizeLine({ name: 'زيارة طوارئ', method: 'visit', kind: 'service', qty: 2, price: 250 }));
    R.lump = lineTotal(normalizeLine({ name: 'مقاولة', method: 'lump', kind: 'service', qty: 7, price: 9000 }));
    R.client = lineTotal(normalizeLine({ name: 'نحاس من العميل', method: 'meter', kind: 'material', qty: 5, price: 250, source: 'client' }));
    // المدفوعات: 5000 - 1000 عربون - 2000 دفعة = 2000
    const d = NORMALIZERS.docs({ id: 'dT', docType: 'install', lines: [{ name: 'خدمة', method: 'lump', kind: 'service', price: 5000 }] });
    DB.docs.push(d);
    DB.payments.push(NORMALIZERS.payments({ id: 'p1', docId: 'dT', amount: 1000, kind: 'deposit' }));
    DB.payments.push(NORMALIZERS.payments({ id: 'p2', docId: 'dT', amount: 2000, kind: 'payment' }));
    const t = computeDoc(d);
    R.payTotal = t.total; R.payPaid = t.paid; R.payRem = t.remaining;
    // إجمالي الفاتورة = البنود + الإضافات - الخصومات
    d.addAmount = 300; d.discountAmount = 500;
    const t2 = computeDoc(d);
    R.formulaTotal = t2.total; R.formulaRem = t2.remaining;
    // عرض السعر لا يُحسب مديونية
    R.quoteBillable = docTypeInfo('quote').billable;
    // حساب الفني: يومية × أيام + إضافي - خصومات - سلف
    const w = NORMALIZERS.workers({ id: 'w1', name: 'فني', dailyWage: 500, entries: [
      { type: 'day', days: 6, rate: 500 }, { type: 'overtime', amount: 200 }, { type: 'deduction', amount: 100 }, { type: 'advance', amount: 400 } ] });
    DB.workers.push(w);
    R.workerDue = workerStats(w).due;
    // خصم المخزن التلقائي وعكسه
    const it = NORMALIZERS.inventory({ id: 'inv1', name: 'كابستور', qty: 10, unit: 'قطعة', buyPrice: 50, sellPrice: 120 });
    DB.inventory.push(it);
    const d2 = NORMALIZERS.docs({ id: 'dS', docType: 'repair', lines: [{ name: 'كابستور', method: 'piece', kind: 'part', qty: 3, price: 120, invId: 'inv1' }] });
    DB.docs.push(d2);
    saveDoc(d2); R.stockAfter = it.qty;
    d2.lines[0].qty = 1; saveDoc(d2); R.stockEdit = it.qty;
    d2.docType = 'quote'; saveDoc(d2); R.stockQuote = it.qty;
    // العملة: الكسور حسب العملة بدون تغيير القيم
    settings.currency = 'KWD'; applyCurrency(); R.kwd = fmt(1234.5678); R.kwdSym = CUR;
    settings.currency = 'IQD'; applyCurrency(); R.iqd = fmt(1234.5678);
    settings.currency = 'EGP'; applyCurrency(); R.egp = fmt(1234.5678);
    R.currencies = CURRENCIES.map(c => c.code).join(',');
    // مرجع القدرات
    const cap = CALC.capacity(1, 'طن تبريد (TR)'); R.trBtu = cap.btu; R.kw = Math.round(CALC.capacity(12000, 'BTU/h').kw * 100) / 100;
    R.keys = Object.keys(KEYS).map(k => KEYS[k]);
    globalThis.__R = R;
  `;
  vm.runInContext(files.join('\n;\n') + '\n;\n' + testCode, sandbox, { filename: 'hvac-bundle.js' });
  const R = sandbox.__R;
  check('التركيب: 2 × 1500 = 3000 (الحاسبة)', eq(R.install, 3000), R.install);
  check('التركيب: بند فاتورة 2 × 1500 = 3000', eq(R.installLine, 3000), R.installLine);
  check('النحاس: 5 م × 250 = 1250 (الحاسبة)', eq(R.copper, 1250), R.copper);
  check('النحاس: بند فاتورة 5 م × 250 = 1250', eq(R.copperLine, 1250), R.copperLine);
  check('النحاس: خطين × 5 م × 250 = 2500', eq(R.copper2Lines, 2500), R.copper2Lines);
  check('الفريون: 1.5 كجم × 500 = 750', eq(R.ref, 750), R.ref);
  check('الفريون: 1500 جرام × 500/كجم = 750', eq(R.refGrams, 750), R.refGrams);
  check('الفريون: 1.5 كجم × 0.5/جرام = 750', eq(R.refPerGram, 750), R.refPerGram);
  check('الفريون: بند بالوزن بالجرام = 750', eq(R.refLine, 750), R.refLine);
  check('الصيانة: 4 × 300 = 1200 (الحاسبة)', eq(R.maint, 1200), R.maint);
  check('الصيانة: بند 4 × 300 = 1200', eq(R.maintLine, 1200), R.maintLine);
  check('اليومية: فنيان × 500 × يومين = 2000 (الحاسبة)', eq(R.daily, 2000), R.daily);
  check('اليومية: بند فنيان × يومين × 500 = 2000', eq(R.dailyLine, 2000), R.dailyLine);
  check('اليومية: 6×500 + 200 − 100 − 400 = 2700', eq(R.dailyNet, 2700), R.dailyNet);
  check('بالقطعة: 3 × 120 = 360', eq(R.piece, 360), R.piece);
  check('بالزيارة: 2 × 250 = 500', eq(R.visit, 500), R.visit);
  check('المقاولة: قيمة إجمالية واحدة 9000', eq(R.lump, 9000), R.lump);
  check('خامات العميل لا تُحسب في الفاتورة', eq(R.client, 0), R.client);
  check('المدفوعات: الإجمالي 5000', eq(R.payTotal, 5000), R.payTotal);
  check('المدفوعات: عربون 1000 + دفعة 2000 = 3000', eq(R.payPaid, 3000), R.payPaid);
  check('المدفوعات: المتبقي = 2000', eq(R.payRem, 2000), R.payRem);
  check('الإجمالي = البنود + الإضافات − الخصم (5000+300−500=4800)', eq(R.formulaTotal, 4800), R.formulaTotal);
  check('المتبقي بعد الإضافات والخصم = 1800', eq(R.formulaRem, 1800), R.formulaRem);
  check('عرض السعر لا يُحسب مديونية', R.quoteBillable === false);
  check('مستحق الفني = 6×500 + 200 − 100 − 400 = 2700', eq(R.workerDue, 2700), R.workerDue);
  check('المخزن: خصم 3 قطع تلقائياً (10 ← 7)', eq(R.stockAfter, 7), R.stockAfter);
  check('المخزن: تعديل الكمية لـ 1 يرجّع الفرق (7 ← 9)', eq(R.stockEdit, 9), R.stockEdit);
  check('المخزن: التحويل لعرض سعر يرجّع الكل (9 ← 10)', eq(R.stockQuote, 10), R.stockQuote);
  check('الدينار الكويتي: 3 منازل عشرية (1,234.568 د.ك)', R.kwd === '1,234.568' && R.kwdSym === 'د.ك', [R.kwd, R.kwdSym]);
  check('الدينار العراقي: بدون كسور (1,235)', R.iqd === '1,235', R.iqd);
  check('الجنيه المصري: منزلتان (1,234.57)', R.egp === '1,234.57', R.egp);
  const need = ['EGP', 'SAR', 'AED', 'KWD', 'QAR', 'BHD', 'OMR', 'JOD', 'IQD', 'LBP', 'SYP', 'ILS', 'MAD', 'DZD', 'TND', 'LYD', 'SDG', 'YER', 'MRU', 'SOS', 'DJF', 'KMF', 'USD'];
  check('كل العملات العربية المطلوبة موجودة (+ الدولار من الأصل)', need.every(c => R.currencies.split(',').includes(c)), need.filter(c => !R.currencies.split(',').includes(c)));
  check('1 طن تبريد = 12000 BTU/h', eq(R.trBtu, 12000), R.trBtu);
  check('12000 BTU/h ≈ 3.52 kW', eq(R.kw, 3.52), R.kw);
  check('كل مفاتيح التخزين تبدأ بـ hesabati_hvac_', R.keys.every(k => k.startsWith('hesabati_hvac_')), R.keys);
  check('لا يوجد أي مفتاح من مفاتيح تطبيق الكهرباء', !R.keys.some(k => /ahmed_elec|^hesabaty_/.test(k)));
}

/* =========================================================
   2) اختبارات المتصفح الكاملة
   ========================================================= */
const serveOverride = { version: null };
function serve(port) {
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.css': 'text/css' };
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]).replace(/^\/Hesabaty-HAVC/, '');
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
  const PORT = 8790;
  const server = await serve(PORT);
  const BASE = `http://localhost:${PORT}/Hesabaty-HAVC/`;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 412, height: 900 }, acceptDownloads: true, serviceWorkers: 'allow' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message + ' @ ' + String(e.stack || '').split('\n').slice(1, 3).join(' | ')));
  page.on('console', m => { if (m.type() === 'error' && !/fonts\.g|net::ERR/.test(m.text())) errors.push(m.text()); });
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const settle = (ms = 250) => wait(ms);

  /* ---------- العزل عن تطبيق الكهرباء ---------- */
  console.log('\n[2] عزل البيانات عن حساباتي الكهرباء والنقاشة');
  const ELEC = {
    ahmed_elec_invoices_v7: JSON.stringify({ invoices: [{ id: 'inv_1', clientName: 'عميل كهرباء', rooms: [] }] }),
    hesabaty_customers_v1: JSON.stringify({ version: 1, customers: [{ id: 'c_e1', name: 'عميل الكهرباء', entries: [] }] }),
    hesabaty_settings_v1: JSON.stringify({ currency: 'SAR', theme: 'dark' }),
    hesabaty_matlists_v1: JSON.stringify({ version: 1, lists: [] })
  };
  await page.goto(BASE + 'privacy.html');
  await ev(e => { localStorage.clear(); Object.keys(e).forEach(k => localStorage.setItem(k, e[k])); }, ELEC);
  await page.goto(BASE);
  await settle(1200);
  check('التطبيق اشتغل بدون أخطاء', errors.length === 0, errors);
  check('عملاء الكهرباء لم يتم استيرادهم تلقائياً', (await ev(() => DB.customers.length)) === 0);
  check('العملة الافتراضية مستقلة (لم تقرأ إعدادات الكهرباء)', (await ev(() => settings.currency)) === 'EGP');
  await page.screenshot({ path: path.join(OUT, '01-home.png') });

  /* ---------- العملاء (من الواجهة) ---------- */
  console.log('\n[3] العملاء والأجهزة');
  await page.click('#navPlus'); await settle(350);
  await page.click('#cCust'); await settle(450);
  await page.fill('#cfName', 'م. خالد سمير');
  await page.fill('#cfPhone', '01012345678');
  await page.fill('#cfAddress', 'مدينة نصر');
  await page.click('#formFoot [data-f="save"]'); await settle(700);
  const cid = await ev(() => DB.customers[0] && DB.customers[0].id);
  check('إضافة عميل من الواجهة', !!cid && (await ev(() => DB.customers[0].name)) === 'م. خالد سمير');
  check('صفحة العميل اتفتحت بعد الإضافة', await ev(() => pageStack.length === 1 && pageStack[0].key === 'customer'));
  // تعديل العميل
  await page.click('#page1 .pg-actions button:last-child'); await settle(400);
  await page.fill('#cfAddress', 'مدينة نصر - الحي السابع');
  await page.click('#formFoot [data-f="save"]'); await settle(500);
  check('تعديل بيانات العميل', (await ev(() => DB.customers[0].address)) === 'مدينة نصر - الحي السابع');
  // إضافة جهاز من تبويب الأجهزة
  await page.click('#custTabs [data-t="dev"]'); await settle(300);
  await page.click('#page1Body .btn-accent'); await settle(400);
  await page.selectOption('#dvType', 'تكييف سبليت');
  await page.fill('#dvBrand', 'شارب'); await page.fill('#dvModel', 'AY-XP12'); await page.fill('#dvSerial', 'SN-001');
  await page.fill('#dvCap', '12000'); await page.selectOption('#dvRef', 'R410A'); await page.fill('#dvLoc', 'الصالة'); await page.fill('#dvEvery', '6');
  await page.click('#formFoot [data-f="save"]'); await settle(500);
  await page.click('#page1Body .btn-accent'); await settle(400);
  await page.click('#dvCat [data-c="تبريد"]'); await settle(100);
  await page.selectOption('#dvType', 'ديب فريزر');
  await page.fill('#dvBrand', 'كريازي');
  await page.click('#formFoot [data-f="save"]'); await settle(500);
  check('إضافة جهازين لنفس العميل (عدد غير محدود)', (await ev(c => devicesOf(c).length, cid)) === 2);
  const dev1 = await ev(c => devicesOf(c).find(d => d.brand === 'شارب').id, cid);
  const dev2 = await ev(c => devicesOf(c).find(d => d.brand === 'كريازي').id, cid);
  // تعديل جهاز
  await ev(id => openDeviceForm(id), dev2); await settle(400);
  await page.fill('#dvModel', 'DF-200');
  await page.click('#formFoot [data-f="save"]'); await settle(400);
  check('تعديل بيانات الجهاز', (await ev(id => getDevice(id).model, dev2)) === 'DF-200');

  /* ---------- المخزن ---------- */
  console.log('\n[4] الخامات وقطع الغيار');
  await ev(() => closeEverythingThen(() => openPage('inventory'))); await settle(500);
  await page.click('#page1Body .btn-accent'); await settle(400);
  await page.fill('#ivName', 'كابستور 35 ميكرو'); await page.selectOption('#ivCat', 'الكابستور');
  await page.fill('#ivQty', '10'); await page.fill('#ivBuy', '60'); await page.fill('#ivSell', '150'); await page.fill('#ivMin', '3');
  await page.check('#ivExp');
  await page.click('#formFoot [data-f="save"]'); await settle(500);
  const invId = await ev(() => DB.inventory[0].id);
  check('إضافة صنف بالمخزن برصيد 10', (await ev(() => DB.inventory[0].qty)) === 10);
  check('هامش الربح للوحدة = 90', (await ev(() => invMargin(DB.inventory[0]).unit)) === 90);
  check('ثمن الشراء اتسجل كمصروف (600)', (await ev(() => DB.expenses.reduce((s, x) => s + x.amount, 0))) === 600);
  await ev(() => { DB.inventory.push(NORMALIZERS.inventory({ id: 'invR', name: 'فريون R410A', cat: 'الفريون', unit: 'كجم', qty: 11.3, buyPrice: 350, sellPrice: 500 })); DB.inventory.push(NORMALIZERS.inventory({ id: 'invCu', name: 'ماسورة نحاس', cat: 'مواسير النحاس', spec: '3/8"', unit: 'متر', qty: 50, buyPrice: 180, sellPrice: 250 })); saveCol('inventory'); });

  /* ---------- الفنيين ---------- */
  console.log('\n[5] الفنيين والعمال');
  await ev(() => closeEverythingThen(() => openPage('workers'))); await settle(500);
  for (const [n, w] of [['أحمد الفني', '500'], ['محمود المساعد', '500']]) {
    await page.click('#page1Body .btn-accent'); await settle(400);
    await page.fill('#wfName', n); await page.fill('#wfWage', w); await page.fill('#wfHour', '80');
    await page.click('#formFoot [data-f="save"]'); await settle(450);
  }
  check('إضافة فنيين اثنين', (await ev(() => DB.workers.length)) === 2);
  const [w1, w2] = await ev(() => DB.workers.map(w => w.id));

  /* ---------- الزيارة وسجل الصيانة ---------- */
  console.log('\n[6] الزيارات وسجل الصيانة والتقرير الفني');
  await ev(([c, d]) => closeEverythingThen(() => openVisitForm(null, { customerId: c, deviceId: d })), [cid, dev1]); await settle(600);
  await page.click('#vfTypeChips [data-s="إصلاح عطل"]');
  await page.click(`#vfTechs [data-w="${w1}"]`); await page.click(`#vfTechs [data-w="${w2}"]`);
  await page.fill('#vfProblem', 'التكييف بيفصل ومش بيبرد');
  await page.fill('#vfFault', 'كابستور الضاغط ضعيف');
  await page.fill('#vfCause', 'ارتفاع الحرارة وتذبذب الجهد');
  await page.fill('#vfWork', 'تغيير الكابستور وتنظيف المكثف');
  // قطعة من المخزن
  await page.click('#vfAddInv'); await settle(400);
  await page.click(`#pickList button[data-i="${await ev(id => DB.inventory.findIndex(i => i.id === id), invId)}"]`); await settle(600);
  await page.fill('#vpQty', '2');
  await page.click('#formFoot [data-f="save"]'); await settle(500);
  await page.selectOption('#vfRefType', 'R410A'); await page.fill('#vfRefQty', '1.5'); await page.fill('#vfRefPrice', '500');
  await page.click('#vfReadChips [data-r="ضغط السحب (psi)"]'); await settle(300);
  await page.fill('[data-rv="0"]', '120');
  await page.fill('#vfValue', '400'); await page.fill('#vfRec', 'تنظيف الفلاتر كل أسبوعين');
  await page.fill('#vfWar', '3'); await page.fill('#vfNext', '2026-11-20');
  // صور قبل وبعد (تخزين محلي)
  for (const stage of ['before', 'after']) {
    const [fc] = await Promise.all([page.waitForEvent('filechooser'), ev(st => pickVisitPhoto(st), stage)]);
    await fc.setFiles(path.join(ROOT, 'icons', 'icon-512.png'));
    await settle(900);
  }
  check('إضافة صورتين قبل وبعد للزيارة', (await ev(() => vDraft.photos.map(p => p.stage).join())) === 'before,after');
  check('الصورة محفوظة محلياً (IndexedDB)', (await ev(() => mediaGet(vDraft.photos[0].id).then(d => d.startsWith('data:image/jpeg')))));
  check('إجمالي الزيارة الحي = 400 + 2×150 + 750 = 1450', (await page.textContent('#vfLive')).includes('1,450'));
  await page.screenshot({ path: path.join(OUT, '02-visit-form.png'), fullPage: false });
  await ev(() => saveVisitDraft()); await settle(800);
  const vId = await ev(() => DB.visits[0] && DB.visits[0].id);
  check('حفظ الزيارة في سجل الجهاز', !!vId && (await ev(d => deviceVisits(d).length, dev1)) === 1);
  check('الزيارة فيها فنيين اثنين', (await ev(id => getVisit(id).techIds.length, vId)) === 2);
  check('القطع المستخدمة اتخصمت من المخزن (10 ← 8)', (await ev(id => invById(id).qty, invId)) === 8);
  check('القراءات الفنية اتسجلت', (await ev(id => getVisit(id).readings[0].value, vId)) === '120');
  check('صفحة الزيارة اتفتحت بعد الحفظ', await ev(() => topPage() && topPage().key === 'visit'));
  // تعديل الزيارة
  await ev(id => openVisitForm(id), vId); await settle(500);
  await page.click('#vfParts [data-pi="0"]'); await settle(400);
  await page.fill('#vpQty', '1');
  await page.click('#formFoot [data-f="save"]'); await settle(400);
  await ev(() => saveVisitDraft()); await settle(700);
  check('تعديل الزيارة رجّع القطعة للمخزن (8 ← 9)', (await ev(id => invById(id).qty, invId)) === 9);
  // التقرير الفني PDF
  await ev(id => openVisitReportPreview(id), vId); await settle(600);
  const rep = await page.textContent('#printSheet');
  check('التقرير الفني: العطل والأعمال والقراءات', rep.includes('تقرير فني للزيارة') && rep.includes('كابستور الضاغط ضعيف') && rep.includes('ضغط السحب'));
  check('التقرير الفني منفصل عن الفاتورة (بدون أسعار القطع)', !rep.includes('150'));
  await page.screenshot({ path: path.join(OUT, '03-visit-report.png') });
  await ev(() => closeOverlay()); await settle(300);
  // فاتورة من الزيارة
  await ev(id => createDocFromVisit(id), vId); await settle(900);
  const fromVisit = await ev(() => { const d = getCurrentDoc(); return { type: d.docType, total: computeDoc(d).total, lines: d.lines.length, inv: d.lines.some(l => l.invId) }; });
  check('إنشاء فاتورة إصلاح من الزيارة بنفس القيمة (400+150+750=1300)', fromVisit.type === 'repair' && fromVisit.total === 1300, fromVisit);
  check('قطع الزيارة لا تتخصم من المخزن مرتين', !fromVisit.inv && (await ev(id => invById(id).qty, invId)) === 9);

  /* ---------- فاتورة تركيب كاملة من الواجهة ---------- */
  console.log('\n[7] فاتورة تركيب + طرق المحاسبة + المدفوعات');
  await ev(() => closeEverythingThen(() => switchView('home'))); await settle(500);
  await page.click('#qInstall'); await settle(800);
  check('فتح صفحة الفاتورة (الخطوة 1)', await ev(() => inEditor() && currentView === 'info'));
  await page.fill('#clientName', 'م. خالد');
  await page.focus('#clientName'); await settle(300);
  await page.click('#clientSuggest button[data-id]'); await settle(500);
  check('ربط الفاتورة بالعميل من الاقتراحات', (await ev(() => getCurrentDoc().customerId)) === cid);
  await page.click(`#docDevChips [data-dev="${dev1}"]`); await settle(300);
  await page.click(`#docWorkerChips [data-w="${w1}"]`); await settle(200);
  await page.click(`#docWorkerChips [data-w="${w2}"]`); await settle(200);
  await page.fill('#docWarranty', '12');
  check('اختيار الجهاز وتعدد الفنيين في نفس الفاتورة', await ev(() => getCurrentDoc().deviceIds.length === 1 && getCurrentDoc().workerIds.length === 2));
  await page.click('#ebNext'); await settle(400);
  // بند تركيب بالجهاز
  await page.click('#lineCatChips [data-cat="install"]'); await settle(400);
  await page.click('#lfItems [data-i="0"]'); await settle(300);
  await page.fill('#lfQty', '2'); await page.fill('#lfPrice', '1500');
  check('العرض الحي للبند = 3,000', (await page.textContent('#lfLive')).includes('3,000'));
  await page.check('#lfSavePl');
  await page.click('#formFoot [data-f="save"]'); await settle(500);
  // نحاس من المخزن
  await page.click('button:has-text("من المخزن")'); await settle(400);
  await page.click(`#pickList button[data-i="${await ev(() => DB.inventory.findIndex(i => i.id === 'invCu'))}"]`); await settle(600);
  await page.fill('#lfQty', '5'); await page.fill('#lfPrice', '250');
  await page.click('#formFoot [data-f="save"]'); await settle(500);
  // فريون بالوزن من المخزن بالجرام
  await page.click('button:has-text("من المخزن")'); await settle(400);
  await page.click(`#pickList button[data-i="${await ev(() => DB.inventory.findIndex(i => i.id === 'invR'))}"]`); await settle(600);
  await page.click('#lfWUnit [data-u="جم"]'); await settle(200);
  await page.fill('#lfQty', '1500'); await page.fill('#lfPrice', '500');
  await page.click('#formFoot [data-f="save"]'); await settle(500);
  // يومية فنيين
  await page.click('#lineCatChips [data-cat="labor"]'); await settle(400);
  await page.click('#lfItems [data-i="0"]'); await settle(300);
  await page.fill('#lfQty', '2'); await page.fill('#lfMult', '2'); await page.fill('#lfPrice', '500');
  await page.click('#formFoot [data-f="save"]'); await settle(500);
  // خامات من العميل (لا تحسب)
  await page.click('#lineCatChips [data-cat="copper"]'); await settle(400);
  await page.click('#lfItems [data-i="3"]'); await settle(300);
  await page.fill('#lfQty', '5'); await page.fill('#lfPrice', '40');
  await page.click('#lfSource [data-s="client"]'); await settle(200);
  await page.click('#formFoot [data-f="save"]'); await settle(500);
  // مراحل التنفيذ
  await page.click('button:has-text("مراحل التنفيذ")'); await settle(400);
  await page.click('.stage-check'); await settle(300);
  let doc = await ev(() => { const d = getCurrentDoc(); const t = computeDoc(d); return { total: t.total, byKind: t.byKind, n: d.lines.length, stages: [t.stagesDone, t.stagesCount] }; });
  check('بنود التركيب: 3000 + 1250 + 750 + 2000 + 0 = 7000', doc.total === 7000, doc);
  check('الفصل: الخدمات 3000 · الخامات 1250 · الفريون 750 · الأجور 2000', doc.byKind.service === 3000 && doc.byKind.material === 1250 && doc.byKind.refrigerant === 750 && doc.byKind.labor === 2000, doc.byKind);
  check('مراحل التنفيذ (8 مراحل، واحدة منفذة)', doc.stages[0] === 1 && doc.stages[1] === 8, doc.stages);
  check('المخزن: النحاس 50 ← 45 والفريون 11.3 ← 9.8', (await ev(() => [invById('invCu').qty, invById('invR').qty])).join() === '45,9.8');
  check('السعر اتحفظ في قائمة الأسعار بموافقة المستخدم', (await ev(() => (priceFor('تركيب تكييف سبليت') || {}).price)) === 1500);
  await page.screenshot({ path: path.join(OUT, '04-invoice-lines.png') });
  // تعديل بند
  const firstLine = await ev(() => getCurrentDoc().lines[0].id);
  await page.click(`.item-card[data-line="${firstLine}"]`); await settle(400);
  await page.fill('#lfPrice', '1600');
  await page.click('#formFoot [data-f="save"]'); await settle(400);
  check('تعديل البند (2 × 1600)', (await ev(() => computeDoc(getCurrentDoc()).byKind.service)) === 3200);
  check('السعر المرجعي لم يتغير بدون موافقة', (await ev(() => priceFor('تركيب تكييف سبليت').price)) === 1500);
  // حذف بند
  await page.click(`.item-card[data-line="${firstLine}"]`); await settle(400);
  await page.click('#formFoot [data-f="del"]'); await settle(200);
  await page.click('#appConfirmYesBtn'); await settle(500);
  check('حذف البند', (await ev(id => getCurrentDoc().lines.some(l => l.id === id), firstLine)) === false);
  // اختبار المدفوعات المطلوب: خدمة 5000، عربون 1000، دفعة 2000 → متبقي 2000
  await ev(() => { const d = getCurrentDoc(); d.lines = [normalizeLine({ name: 'تركيب وتشغيل', method: 'lump', kind: 'service', price: 5000 })].concat(d.lines.filter(l => l.method === 'stage')); saveDoc(d); renderEditor(); });
  await page.click('#ebNext'); await settle(400);
  await page.click('#summaryBody .btn-accent >> nth=0'); await settle(450);
  await page.fill('#payAmount', '1000'); await page.click('#payMethod [data-m="كاش"]');
  await page.click('#formFoot [data-f="save"]'); await settle(500);
  await page.click('#summaryBody .btn-accent >> nth=0'); await settle(450);
  await page.fill('#payAmount', '2000'); await page.click('#payMethod [data-m="تحويل بنكي"]');
  await page.click('#formFoot [data-f="save"]'); await settle(500);
  doc = await ev(() => { const d = getCurrentDoc(); const t = computeDoc(d); return { total: t.total, paid: t.paid, rem: t.remaining, kinds: t.payments.map(p => p.kind + ':' + p.method) }; });
  check('قيمة الخدمة 5000 − عربون 1000 − دفعة 2000 = المتبقي 2000', doc.total === 5000 && doc.paid === 3000 && doc.rem === 2000, doc);
  check('العربون والدفعة بطرق دفع مختلفة', doc.kinds.join('|') === 'deposit:كاش|payment:تحويل بنكي', doc.kinds);
  check('شريط الفاتورة يعرض المتبقي 2,000', (await page.textContent('#ebValue')).includes('2,000'));
  check('حساب العميل: المتبقي 2000 + فاتورة الزيارة 1300 = 3300', (await ev(c => customerStats(getCustomer(c)).remaining, cid)) === 3300);
  await page.screenshot({ path: path.join(OUT, '05-invoice-summary.png'), fullPage: true });
  // خصم وإضافات
  await page.fill('#docAdd', '200'); await page.fill('#docDisc', '700'); await settle(300);
  check('الإجمالي = 5000 + 200 − 700 = 4500 والمتبقي 1500', (await ev(() => { const t = computeDoc(getCurrentDoc()); return t.total + '/' + t.remaining; })) === '4500/1500');
  // مصروف وأجور على الفاتورة → الربح
  await ev(() => { const d = getCurrentDoc(); DB.expenses.push(NORMALIZERS.expenses({ id: 'xT', amount: 150, cat: 'نقل ومواصلات', docId: d.id })); saveCol('expenses'); const w = DB.workers[0]; w.entries.push(NORMALIZERS.workers({ entries: [{ type: 'day', days: 2, rate: 500, docId: d.id }] }).entries[0]); saveCol('workers'); refreshAll(); });
  check('الربح المتوقع = 4500 − 150 مصروف − 1000 أجور = 3350', (await ev(() => computeDoc(getCurrentDoc()).profit)) === 3350);

  /* ---------- مستندات PDF ---------- */
  console.log('\n[8] الفواتير والمستندات PDF (12 نوع)');
  const docId = await ev(() => getCurrentDoc().id);
  const pdfs = [];
  const preview = async (label, fn, mustHave, arg) => {
    await ev(fn, arg); await settle(500);
    const txt = await page.textContent('#printSheet');
    const ok = mustHave.every(s => txt.includes(s));
    check(`PDF: ${label}`, ok, mustHave.filter(s => !txt.includes(s)));
    pdfs.push(label);
    await ev(() => closeOverlay()); await settle(300);
  };
  const types = await ev(() => DOC_TYPE_ORDER.map(t => [t, DOC_TYPES[t].label]));
  for (const [t, label] of types) {
    await preview(label, ([id, t]) => { const d = getDoc(id); const old = d.docType; d.docType = t; openDocPreview(false); d.docType = old; }, [label, 'م. خالد سمير', 'شارب'], [docId, t]);
  }
  const p1 = await ev(id => paymentsOf(id)[0].id, docId);
  await preview('إيصال استلام دفعة', id => openReceiptPreview(id), ['إيصال استلام دفعة', '1,000', 'المتبقي بعد هذه الدفعة'], p1);
  await preview('كشف حساب العميل', c => openStatementPreview(c), ['كشف حساب العميل', 'المدفوعات'], cid);
  await ev(([c, d1]) => { DB.contracts.push(NORMALIZERS.contracts({ id: 'ctT', number: 'CNT-0001', customerId: c, clientName: 'م. خالد سمير', period: 'annual', start: '2026-11-01', end: '2027-10-31', visitsIncluded: 4, deviceIds: [d1], services: ['تنظيف الفلاتر', 'فحص الأداء'], value: 2400 })); saveCol('contracts'); }, [cid, dev1]);
  await preview('عقد صيانة', () => openContractPreview('ctT'), ['عقد صيانة', 'سنوي', '2,400', '(4) زيارة']);
  await preview('تقرير فني للزيارة', id => openVisitReportPreview(id), ['تقرير فني للزيارة'], vId);
  await preview('سجل صيانة الجهاز', id => openDeviceHistoryPreview(id), ['سجل صيانة الجهاز', 'إصلاح عطل', 'كابستور الضاغط ضعيف'], dev1);
  check('عدد أنواع المستندات المختبرة ≥ 12', pdfs.length >= 12, pdfs.length);
  // PDF فعلي متعدد الصفحات بالعربي
  await ev(id => { const d = getDoc(id); for (let i = 0; i < 45; i++) d.lines.push(normalizeLine({ name: 'بند اختبار ' + (i + 1), method: 'piece', kind: 'part', qty: 1, price: 10 })); saveDoc(d); settings.currentDocId = id; openDocPreview(false); }, docId);
  await settle(800);
  await page.emulateMedia({ media: 'print' });
  const pdfPath = path.join(OUT, 'sample-invoice.pdf');
  await page.pdf({ path: pdfPath, format: 'A4', printBackground: true, preferCSSPageSize: true });
  await page.emulateMedia({ media: 'screen' });
  const pdfBuf = fs.readFileSync(pdfPath);
  const pages = (pdfBuf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
  check('إنشاء ملف PDF فعلي متعدد الصفحات', pdfBuf.length > 20000 && pages >= 2, { bytes: pdfBuf.length, pages });
  await page.screenshot({ path: path.join(OUT, '06-print-preview.png') });
  await ev(() => closeOverlay()); await settle(300);
  await ev(id => { const d = getDoc(id); d.lines = d.lines.filter(l => !/^بند اختبار/.test(l.name)); saveDoc(d); }, docId);

  /* ---------- العملات ---------- */
  console.log('\n[9] تعدد العملات');
  await ev(() => closeEverythingThen(() => switchView('more'))); await settle(500);
  const before = await ev(id => computeDoc(getDoc(id)).total, docId);
  await page.selectOption('#currencySelect', 'KWD'); await settle(400);
  check('تغيير العملة للدينار الكويتي', (await ev(() => [settings.currency, CUR].join())) === 'KWD,د.ك');
  check('المبالغ لم تتحول عند تغيير العملة', (await ev(id => computeDoc(getDoc(id)).total, docId)) === before);
  await ev(id => openDoc(id, 'summary'), docId); await settle(700);
  check('الفاتورة تعرض رمز الدينار', (await page.textContent('#ebValue')).includes('د.ك'));
  await ev(() => openDocPreview(false)); await settle(500);
  check('PDF بالعملة المختارة', (await page.textContent('#printSheet')).includes('د.ك'));
  await ev(() => closeOverlay()); await settle(300);
  await ev(() => setCurrency('EGP')); await settle(300);
  check('العملة محفوظة في الإعدادات', JSON.parse(await ev(() => localStorage.getItem('hesabati_hvac_settings_v1'))).currency === 'EGP');

  /* ---------- الأقسام الأخرى ---------- */
  console.log('\n[10] الحاسبات والعقود والنوتة والضمان والحسابات');
  await ev(() => closeEverythingThen(() => openPage('calc'))); await settle(500);
  await page.fill('#c_install_count', '2'); await page.fill('#c_install_price', '1500');
  check('حاسبة التركيب في الواجهة = 3,000', (await page.textContent('#calcTotal')).includes('3,000'));
  await page.click('#calcTabs [data-t="refrig"]'); await settle(300);
  await page.fill('#c_refrig_qty', '1.5'); await page.fill('#c_refrig_price', '500');
  check('حاسبة الفريون في الواجهة = 750', (await page.textContent('#calcTotal')).includes('750'));
  const nDocs = await ev(() => DB.docs.length);
  await page.click('#page1Body .stack .btn-accent'); await settle(900);
  check('الحاسبة أنشأت فاتورة ببند الفريون', (await ev(() => DB.docs.length)) === nDocs + 1 && (await ev(() => computeDoc(getCurrentDoc()).total)) === 750);
  await ev(() => closeEverythingThen(() => openPage('calc'))); await settle(500);
  await page.click('#calcTabs [data-t="capacity"]'); await settle(300);
  await page.fill('#c_capacity_area', '20');
  check('مرجع القدرة يعرض تحذير «ليس قراراً نهائياً»', (await page.textContent('#estOut')).includes('ليس قراراً نهائياً'));
  await page.click('#calcTabs [data-t="daily"]'); await settle(300);
  await page.fill('#c_daily_workers', '2'); await page.fill('#c_daily_wage', '500'); await page.fill('#c_daily_days', '2');
  check('حاسبة اليومية في الواجهة = 2,000', (await page.textContent('#calcTotal')).includes('2,000'));
  // العقد: زيارة تحت العقد + فاتورة العقد
  await ev(([c, d]) => { DB.visits.push(NORMALIZERS.visits({ id: 'vC', number: 'VST-9', customerId: c, deviceId: d, contractId: 'ctT', date: '2026-11-05', serviceType: 'زيارة ضمن عقد' })); saveCol('visits'); }, [cid, dev1]);
  check('عقد الصيانة: زيارة 1 من 4 والزيارة القادمة محسوبة', await ev(() => { const s = contractStats(getContract('ctT')); return s.done === 1 && s.remaining === 3 && !!s.nextDue; }));
  await ev(() => invoiceContract('ctT')); await settle(800);
  check('إصدار فاتورة بقيمة العقد 2400', (await ev(() => computeDoc(getCurrentDoc()).total)) === 2400);
  // النوتة الفنية
  await ev(() => closeEverythingThen(() => openPage('notes'))); await settle(500);
  await page.click('#page1Body .btn-accent'); await settle(400);
  await page.click('#nfCat [data-c="أكواد الأعطال"]');
  await page.fill('#nfTitle', 'كود E1 شارب'); await page.fill('#nfBody', 'عطل حساس حرارة الغرفة');
  await page.click('#formFoot [data-f="save"]'); await settle(500);
  await page.fill('#noteSearch', 'E1'); await settle(400);
  check('النوتة الفنية: إضافة وبحث', (await page.textContent('#page1Body')).includes('عطل حساس حرارة الغرفة'));
  // الضمان والمواعيد
  const rem = await ev(() => collectReminders().map(r => r.kind));
  check('التذكير: زيارة متابعة + صيانة دورية للجهاز + زيارة عقد', ['visit', 'device', 'contract'].every(k => rem.includes(k)), rem);
  check('الضمان: ضمان الفاتورة (12 شهر) والزيارة (3 شهور)', (await ev(() => collectWarranties().filter(w => w.active).length)) >= 2);
  const ics = await ev(() => { let out = ''; const orig = downloadText; window.downloadText = (t) => { out = t; return true; }; exportICS(collectReminders()); window.downloadText = orig; return out; });
  check('تصدير المواعيد لتقويم الموبايل (ics) بدون سيرفر', ics.includes('BEGIN:VCALENDAR') && ics.includes('BEGIN:VALARM'));
  // الحسابات
  const fin = await ev(() => { finPeriod = 'all'; return financeTotals(); });
  check('صافي الربح = المحصل − التكاليف المدفوعة', fin.netProfit === Math.round((fin.collected - fin.expenses - fin.wagesPaid) * 100) / 100, fin);
  await ev(() => closeEverythingThen(() => openPage('finance'))); await settle(500);
  await page.screenshot({ path: path.join(OUT, '07-finance.png') });
  // حذف جهاز
  await ev(id => closeEverythingThen(() => openPage('device', id)), dev2); await settle(500);
  await page.click('#page1Body .btn-danger'); await settle(200);
  await page.click('#appConfirmYesBtn'); await settle(700);
  check('حذف الجهاز', (await ev(id => !!getDevice(id), dev2)) === false);
  // زر الرجوع
  await ev(() => closeEverythingThen(() => openPage('customer', DB.customers[0].id))); await settle(400);
  await ev(() => openPage('device', DB.devices[0].id)); await settle(400);
  await page.goBack(); await settle(400);
  check('زر الرجوع يقفل الصفحة العلوية فقط', await ev(() => pageStack.length === 1 && pageStack[0].key === 'customer'));
  // كل الصفحات تفتح بدون أخطاء
  for (const k of ['devices', 'visits', 'inventory', 'workers', 'finance', 'payments', 'pricelists', 'contracts', 'reminders', 'notes', 'calc']) {
    await ev(k => closeEverythingThen(() => openPage(k)), k); await settle(300);
  }
  await ev(() => closeEverythingThen(() => switchView('home'))); await settle(500);
  check('كل الأقسام فتحت بدون أخطاء JavaScript', errors.length === 0, errors);
  await page.screenshot({ path: path.join(OUT, '08-home-filled.png') });

  /* ---------- النسخ الاحتياطي والاستعادة ---------- */
  console.log('\n[11] النسخ الاحتياطي والاستعادة');
  await ev(() => switchView('more')); await settle(400);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('button:has-text("نسخة كاملة")')]);
  const bpath = path.join(OUT, 'backup.json');
  await dl.saveAs(bpath);
  const backup = JSON.parse(fs.readFileSync(bpath, 'utf8'));
  const snap = await ev(() => ({ docs: DB.docs.length, customers: DB.customers.length, devices: DB.devices.length, visits: DB.visits.length, payments: DB.payments.length, inventory: DB.inventory.length, workers: DB.workers.length, notes: DB.notes.length, rem: customerStats(DB.customers[0]).remaining }));
  check('ملف النسخة الكاملة JSON مستقل (app = hesabati-hvac)', backup.app === 'hesabati-hvac' && backup.data.docs.length === snap.docs && backup.data.visits.length === snap.visits);
  check('النسخة الاحتياطية فيها صور الزيارات', Object.keys(backup.media || {}).length === 2);
  // مسح البيانات ثم الاستعادة
  await ev(() => { Object.keys(localStorage).filter(k => k.startsWith('hesabati_hvac_')).forEach(k => localStorage.removeItem(k)); return mediaKeys().then(keys => Promise.all(keys.map(k => mediaTx('readwrite', s => s.delete(k))))); });
  await page.reload(); await settle(1200);
  check('بعد المسح: البيانات فاضية', (await ev(() => DB.customers.length + DB.docs.length)) === 0);
  await ev(() => switchView('more')); await settle(300);
  await page.setInputFiles('#importFile', bpath); await settle(500);
  await page.click('#appConfirmYesBtn'); await settle(1200);
  const after = await ev(() => ({ docs: DB.docs.length, customers: DB.customers.length, devices: DB.devices.length, visits: DB.visits.length, payments: DB.payments.length, inventory: DB.inventory.length, workers: DB.workers.length, notes: DB.notes.length, rem: customerStats(DB.customers[0]).remaining }));
  check('الاستعادة رجّعت كل البيانات والحسابات', JSON.stringify(after) === JSON.stringify(snap), { snap, after });
  check('الصور رجعت مع الاستعادة', await ev(() => { const v = DB.visits.find(x => x.photos.length); return mediaGet(v.photos[1].id).then(d => !!d); }));
  // رفض نسخة تطبيق الكهرباء
  const elecPath = path.join(OUT, 'electrical-backup.json');
  fs.writeFileSync(elecPath, JSON.stringify({ app: 'hesabaty', backupVersion: 3, invoices: [{ id: 'x', clientName: 'كهرباء' }], customers: [] }));
  await page.setInputFiles('#importFile', elecPath); await settle(500);
  check('رفض استيراد نسخة حساباتي الكهرباء', (await page.textContent('#appToast')).includes('مش هيتستورد') && (await ev(() => DB.docs.length)) === snap.docs);
  // تحمّل البيانات التالفة
  await ev(() => localStorage.setItem('hesabati_hvac_notes_v1', '{broken json'));
  await page.reload(); await settle(1000);
  check('بيانات تالفة لا توقف التطبيق (وبتتحفظ نسخة منها)', errors.length === 0 && (await ev(() => Object.keys(localStorage).some(k => k.startsWith('hesabati_hvac_notes_v1_corrupt_')))), errors);

  /* ---------- العمل بدون إنترنت ---------- */
  console.log('\n[12] العمل بدون إنترنت');
  await page.goto(BASE); await settle(800);
  await ev(() => navigator.serviceWorker.ready); await settle(500);
  await page.reload(); await settle(1200);
  const controlled = await ev(() => !!navigator.serviceWorker.controller);
  const caches = await ev(() => caches.keys());
  check('Service Worker شغال ومتحكم في الصفحة', controlled, caches);
  check('أسماء الكاش مستقلة (hesabati-hvac-*) ولا تلمس كاش الكهرباء', caches.length > 0 && caches.every(c => c.startsWith('hesabati-hvac-')), caches);
  await ctx.setOffline(true);
  await page.reload(); await settle(1500);
  const offlineOk = await ev(() => typeof DB !== 'undefined' && DB.customers.length > 0 && document.getElementById('homeDue').textContent !== '');
  check('التطبيق يفتح ويعرض البيانات بدون إنترنت', offlineOk);
  await ev(() => startNewDoc('maint')); await settle(800);
  await ev(() => addLinesToCurrentDoc([{ name: 'صيانة دورية', method: 'device', kind: 'service', qty: 4, price: 300 }])); await settle(300);
  check('إنشاء فاتورة صيانة 4 × 300 = 1200 بدون إنترنت', (await ev(() => computeDoc(getCurrentDoc()).total)) === 1200);
  await page.reload(); await settle(1200);
  check('الفاتورة محفوظة بعد إعادة الفتح بدون إنترنت', (await ev(() => DB.docs.some(d => d.lines.some(l => l.name === 'صيانة دورية' && l.qty === 4)))));
  await ctx.setOffline(false);
  await page.screenshot({ path: path.join(OUT, '09-offline.png') });

  /* ---------- الاستقلال النهائي ---------- */
  console.log('\n[13] استقلال المشروع');
  const ls = await ev(() => { const o = {}; Object.keys(localStorage).forEach(k => { o[k] = localStorage.getItem(k); }); return o; });
  const elecUntouched = Object.keys(ELEC).every(k => ls[k] === ELEC[k]);
  check('بيانات حساباتي الكهرباء لم تتغير حرفاً واحداً', elecUntouched);
  const ownKeys = Object.keys(ls).filter(k => !(k in ELEC));
  check('كل مفاتيح التخزين الجديدة تبدأ بـ hesabati_hvac_', ownKeys.every(k => k.startsWith('hesabati_hvac_')), ownKeys.filter(k => !k.startsWith('hesabati_hvac_')));
  const idbNames = await ev(() => indexedDB.databases ? indexedDB.databases().then(d => d.map(x => x.name)) : []);
  check('قاعدة الصور مستقلة (hesabati_hvac_media)', idbNames.every(n => n.startsWith('hesabati_hvac_')), idbNames);
  check('لا أخطاء JavaScript طوال الاختبار', errors.length === 0, errors);

  /* ---------- فقاعة التحديث ---------- */
  console.log('\n[14] فقاعة «تحديث جديد» والتحديث المباشر');
  const realVer = JSON.parse(fs.readFileSync(path.join(ROOT, 'version.json'), 'utf8')).version;
  // (أ) نسخة الويب: المستخدم على إصدار قديم، وينزل إصدار جديد
  serveOverride.version = '0.9.0';
  const wctx = await browser.newContext({ viewport: { width: 412, height: 900 }, serviceWorkers: 'allow' });
  const wp = await wctx.newPage();
  wp.on('pageerror', e => errors.push('update: ' + e.message));
  await wp.goto(BASE); await wait(1500);
  await wp.evaluate(() => navigator.serviceWorker.ready); await wp.reload(); await wait(1500);
  check('الإصدار القديم شغال ومفيش فقاعة', (await wp.evaluate(() => APP_VERSION)) === '0.9.0' && await wp.isHidden('#updBubble'));
  serveOverride.version = null; // نشر الإصدار الجديد
  await wp.evaluate(() => navigator.serviceWorker.getRegistration().then(r => r.update()));
  await wp.waitForSelector('#updBubble:not(.hidden)', { timeout: 20000 }).catch(() => {});
  check('فقاعة «تحديث جديد» ظهرت على الشاشة لوحدها', await wp.isVisible('#updBubble'));
  check('الفقاعة فيها رقم الإصدار الجديد', (await wp.textContent('#updBubbleVer')).includes(realVer));
  await wp.screenshot({ path: path.join(OUT, '10-update-bubble.png') });
  await wp.click('#updBubble'); await wait(500);
  check('الفقاعة بتفتح تفاصيل التحديث وزرار «تحديث الآن»', (await wp.textContent('#appUpdBtn')).includes('تحديث الآن') && (await wp.textContent('#appUpdNotes')).length > 10);
  await wp.screenshot({ path: path.join(OUT, '11-update-sheet.png') });
  await wp.evaluate(() => { DB.customers.push(NORMALIZERS.customers({ id: 'cU', name: 'عميل قبل التحديث' })); saveCol('customers'); });
  await Promise.all([wp.waitForNavigation({ timeout: 15000 }).catch(() => {}), wp.click('#appUpdBtn')]);
  await wait(1500);
  check('زرار «تحديث الآن» حدّث التطبيق مباشرة للإصدار الجديد', (await wp.evaluate(() => APP_VERSION)) === realVer);
  check('البيانات محفوظة بعد التحديث', await wp.evaluate(() => DB.customers.some(c => c.id === 'cU')));
  check('الفقاعة اختفت بعد التحديث', await wp.isHidden('#updBubble'));
  await wctx.close();
  // (ب) تطبيق أندرويد: الفقاعة بتحمّل ملف التحديث من GitHub وتفتح التثبيت
  const actx = await browser.newContext({ viewport: { width: 412, height: 900 }, serviceWorkers: 'block' });
  await actx.addInitScript(() => {
    window.__dl = null;
    window.HesabatiHvacApp = { versionName: () => '1.0.0', sdk: () => 34, openExternal: () => {}, print: () => {}, saveFile: () => {}, downloadUpdate: (u, v) => { window.__dl = [u, v]; } };
  });
  await actx.route('https://api.github.com/**', r => r.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ tag_name: 'v1.0.2', body: '- ميزة جديدة للتجربة\n- إصلاحات', assets: [{ name: 'hesabati-hvac.apk', size: 3145728, browser_download_url: 'https://github.com/AhmedHassanAbdallah/Hesabaty-HAVC/releases/download/v1.0.2/hesabati-hvac.apk' }] }) }));
  const ap = await actx.newPage();
  ap.on('pageerror', e => errors.push('apk: ' + e.message));
  await ap.goto(BASE); await wait(2500);
  check('أندرويد: فقاعة التحديث ظهرت لما نزل إصدار على GitHub', await ap.isVisible('#updBubble'));
  await ap.click('#updBubble'); await wait(500);
  check('أندرويد: تفاصيل التحديث من ملاحظات الإصدار', (await ap.textContent('#appUpdNotes')).includes('ميزة جديدة للتجربة'));
  await ap.click('#appUpdBtn'); await wait(300);
  const apkDl = await ap.evaluate(() => window.__dl);
  check('أندرويد: زرار التحديث بيحمّل ملف APK مباشرة', !!apkDl && /hesabati-hvac\.apk$/.test(apkDl[0]) && apkDl[1] === '1.0.2', apkDl);
  await ap.evaluate(() => window.onAppUpdateProgress(100, 'install')); await wait(200);
  check('أندرويد: بعد التحميل يظهر «تثبيت التحديث»', (await ap.textContent('#appUpdBtn')).includes('تثبيت التحديث'));
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
