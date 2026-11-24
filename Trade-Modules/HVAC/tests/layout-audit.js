#!/usr/bin/env node
/*
 * فحص التخطيط: يفتح كل شاشات ونماذج حساباتي HVAC بعرض موبايل وببيانات طويلة،
 * ويكشف أي نص أو عنصر خارج إطار الصفحة أو مقصوص.
 *   node tests/layout-audit.js [عرض الشاشة، افتراضي 360]
 * © 2026 أحمد حسن عبدالله - جميع الحقوق محفوظة.
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const ROOT = path.join(__dirname, '..');
const OUT = process.env.TEST_OUT || path.join(ROOT, 'tests', 'output');
const WIDTHS = process.argv[2] ? [Number(process.argv[2])] : [360, 412];

function serve(port) {
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.css': 'text/css', '.woff2': 'font/woff2' };
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/') p = '/index.html';
    const f = path.join(ROOT, path.normalize(p));
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  return new Promise(r => server.listen(port, () => r(server)));
}
const wait = ms => new Promise(r => setTimeout(r, ms));

// بيانات طويلة وواقعية
function seed() {
  const L = 'مؤسسة النور الحديثة لأعمال التكييف المركزي والتبريد التجاري';
  const c = NORMALIZERS.customers({ id: 'cA', name: 'م/ عبدالرحمن محمد عبدالعزيز السيد الشرقاوي', phone: '+20 101 234 5678', address: 'التجمع الخامس - الحي الثالث - شارع التسعين الجنوبي - عمارة 125 - الدور السابع - شقة 74', note: 'العميل يفضل التواصل مساءً بعد الساعة السابعة، والمفتاح مع حارس العقار ' + L });
  DB.customers.push(c);
  DB.customers.push(NORMALIZERS.customers({ id: 'cB', name: 'شركة الأهرام للمقاولات والاستثمار العقاري', phone: '0100000000' }));
  const d1 = NORMALIZERS.devices({ id: 'dv1', customerId: 'cA', type: 'تكييف مخفي (كونسيلد)', brand: 'ميتسوبيشي إلكتريك', model: 'PEAD-RP125JAA-SUPER-INVERTER', serial: 'SN-2026-AX9981234567890', capacity: '48000', capUnit: 'BTU/h', refrigerant: 'R410A', installDate: '2025-05-01', purchaseDate: '2025-04-20', location: 'صالة الاستقبال الرئيسية بالدور الأرضي', maintEveryMonths: 6, notes: 'يحتاج تنظيف دوري للصرف بسبب الأتربة ' + L });
  const d2 = NORMALIZERS.devices({ id: 'dv2', customerId: 'cA', type: 'غرفة تجميد', brand: 'كريازي', capacity: '5', capUnit: 'طن تبريد (TR)', location: 'المخزن' });
  DB.devices.push(d1, d2);
  DB.inventory.push(NORMALIZERS.inventory({ id: 'i1', name: 'ماسورة نحاس معزولة مستوردة عالية الجودة', cat: 'مواسير النحاس', brand: 'مولر الأمريكية', spec: '1 1/8" × 5/8"', unit: 'متر', qty: 1234.5, minQty: 2000, buyPrice: 123456.78, sellPrice: 234567.89, supplier: 'الشركة المصرية لتوريد خامات التكييف والتبريد', notes: L }));
  DB.inventory.push(NORMALIZERS.inventory({ id: 'i2', name: 'كابستور', cat: 'الكابستور', unit: 'قطعة', qty: 5, buyPrice: 60, sellPrice: 150 }));
  DB.workers.push(NORMALIZERS.workers({ id: 'w1', name: 'محمد عبدالفتاح إبراهيم الشناوي', phone: '01011112222', specialty: 'فني تكييف مركزي ولحام نحاس', dailyWage: 1250000, hourRate: 150000, entries: [{ type: 'day', days: 26, rate: 1250000, note: L }, { type: 'advance', amount: 9876543.21 }, { type: 'overtime', hours: 12, amount: 0, rate: 150000 }] }));
  DB.workers.push(NORMALIZERS.workers({ id: 'w2', name: 'أحمد', dailyWage: 500 }));
  const lines = [
    { cat: 'install', kind: 'service', name: 'تركيب تكييف مخفي (كونسيلد) شامل التعليق والتوصيل والتشغيل', method: 'device', qty: 12, price: 1234567.89, note: L },
    { cat: 'copper', kind: 'material', name: 'ماسورة نحاس', method: 'meter', qty: 123.5, mult: 2, price: 98765.43, size: '1 1/8"', invId: 'i1' },
    { cat: 'refrig', kind: 'refrigerant', name: 'شحن فريون', method: 'weight', qty: 12500, wUnit: 'جم', pUnit: 'كجم', price: 4500, refType: 'R410A' },
    { cat: 'labor', kind: 'labor', name: 'يومية فني', method: 'daily', qty: 30, mult: 4, price: 1250000 },
    { cat: 'copper', kind: 'material', name: 'عزل حراري من العميل', method: 'meter', qty: 50, price: 40, source: 'client' },
    { cat: 'install', kind: 'service', name: 'المعاينة', method: 'stage', price: 5000, done: true },
    { cat: 'install', kind: 'service', name: 'أعمال مقاولة كاملة لمشروع التكييف المركزي بالمبنى الإداري', method: 'lump', price: 98765432.1 }
  ];
  const doc = NORMALIZERS.docs({ id: 'docA', number: 'INS-0001', docType: 'install', customerId: 'cA', clientName: c.name, clientPhone: c.phone, clientAddress: c.address, deviceIds: ['dv1', 'dv2'], workerIds: ['w1', 'w2'], warrantyMonths: 24, warrantyTerms: 'الضمان على المصنعية فقط ولا يشمل سوء الاستخدام أو انقطاع الكهرباء أو تذبذب الجهد ' + L, notes: L + ' ' + L, addAmount: 123456, addNote: 'رسوم سقالة ونقل ومعدات رفع للدور السابع', discountAmount: 654321, lines });
  DB.docs.push(doc);
  DB.docs.push(NORMALIZERS.docs({ id: 'docQ', number: 'QUO-0001', docType: 'quote', clientName: 'عميل بدون حساب باسم طويل جداً جداً للتجربة', deviceText: 'سبليت شارب 1.5 حصان بلازما إنفرتر', validUntil: '2026-11-20', lines: lines.slice(0, 2) }));
  settings.currentDocId = 'docA';
  DB.payments.push(NORMALIZERS.payments({ id: 'p1', number: 'RCPT-0001', docId: 'docA', customerId: 'cA', amount: 12345678.9, kind: 'deposit', method: 'محفظة إلكترونية', note: L }));
  DB.payments.push(NORMALIZERS.payments({ id: 'p2', number: 'RCPT-0002', customerId: 'cA', amount: 5000, kind: 'payment', method: 'تحويل بنكي' }));
  DB.visits.push(NORMALIZERS.visits({ id: 'v1', number: 'VST-0001', customerId: 'cA', deviceId: 'dv1', contractId: 'ct1', date: '2026-11-10', techIds: ['w1', 'w2'], techName: 'فني من شركة خارجية', serviceType: 'إصلاح عطل وتغيير قطع وشحن فريون كامل', problem: L, fault: 'ضعف في كابستور الضاغط وتسريب في وصلة خط السحب ' + L, cause: L, workDone: L + ' ' + L, recommendations: L, parts: [{ name: 'كابستور 45+5 ميكرو فاراد ثلاثي الأطراف', qty: 2, unit: 'قطعة', price: 123456.5, invId: 'i2' }], refType: 'R410A', refQty: 2.5, refUnit: 'كجم', refPrice: 4500, readings: [{ label: 'ضغط السحب (psi)', value: '118.5 psi at 35°C ambient' }, { label: 'Superheat (K)', value: '6.5' }], serviceValue: 9876543.21, status: 'parts', warrantyMonths: 3, warrantyTerms: L, nextDate: '2026-11-16', nextNote: L }));
  DB.contracts.push(NORMALIZERS.contracts({ id: 'ct1', number: 'CNT-0001', customerId: 'cA', clientName: c.name, period: 'annual', start: '2026-11-15', end: '2027-11-14', visitsIncluded: 4, deviceIds: ['dv1', 'dv2'], devicesCount: 5, services: CONTRACT_SERVICES.slice(), extraServices: 'شحن الفريون وقطع الغيار والكابستور والكونتاكتور واللوحات الإلكترونية ' + L, extraPricing: 'حسب قائمة الأسعار المعتمدة بخصم 10% على المصنعية فقط', value: 987654321, notes: L + ' ' + L }));
  DB.expenses.push(NORMALIZERS.expenses({ id: 'x1', cat: 'إيجار ومصاريف ثابتة', amount: 7654321, docId: 'docA', method: 'تحويل بنكي', note: L }));
  DB.notes.push(NORMALIZERS.notes({ id: 'n1', cat: 'أكواد الأعطال', title: 'كود E1-E9 لأجهزة شارب إنفرتر بلازما ' + L, body: 'E1: حساس الغرفة\nE2: حساس المبخر\nhttps://example.com/very/long/url/without/spaces/that/should/wrap/correctly/in/the/note/body ' + L, pinned: true }));
  DB.matlists.push(NORMALIZERS.matlists({ id: 'm1', customerId: 'cA', clientName: c.name, clientPhone: c.phone, clientAddress: c.address, title: 'خامات تركيب 12 جهاز كونسيلد للمبنى الإداري ' + L, buyer: 'me', items: [{ name: 'ماسورة نحاس معزولة مستوردة عالية الجودة', qty: 1234.5, unit: 'متر', brand: 'مولر الأمريكية', spec: '1 1/8"', note: L, price: 98765.43 }] }));
  saveAll();
}

async function audit(page, label) {
  return page.evaluate(label => {
    const vw = document.documentElement.clientWidth;
    const issues = [];
    const isVisible = el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && s.opacity !== '0'; };
    // الحاوية الظاهرة حالياً (صفحة أو نافذة أو المحتوى الرئيسي)
    const scopes = [];
    document.querySelectorAll('.page-overlay.open, .sheet.open, #printPreviewModal').forEach(el => { if (isVisible(el)) scopes.push(el); });
    if (!scopes.length) scopes.push(document.getElementById('editorApp'));
    const top = scopes.sort((a, b) => (+getComputedStyle(b).zIndex || 0) - (+getComputedStyle(a).zIndex || 0))[0];
    if (document.documentElement.scrollWidth > vw + 1) issues.push(`[الصفحة كلها أعرض من الشاشة] ${document.documentElement.scrollWidth} > ${vw}`);
    if (top.classList.contains('page-overlay') || top.classList.contains('sheet')) {
      if (top.scrollWidth > top.clientWidth + 1) issues.push(`[الحاوية أعرض من الشاشة] ${top.id} ${top.scrollWidth} > ${top.clientWidth}`);
    }
    // العناوين الفرعية في الرأس الثابت وشريط الفاتورة سطر واحد عن قصد (زي التطبيق الأصلي)
    const skipScroll = el => el.closest('.chips, .filter-chips, #printViewport, .pick-list, .app-header .sub, #ebSub');
    const desc = el => `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : ''} «${(el.textContent || el.value || '').trim().slice(0, 50)}»`;
    top.querySelectorAll('*').forEach(el => {
      if (!isVisible(el) || skipScroll(el) || el.closest('svg')) return;
      const r = el.getBoundingClientRect();
      if (r.right > vw + 1.5 || r.left < -1.5) issues.push(`[خارج الشاشة] ${desc(el)} (${Math.round(r.left)}→${Math.round(r.right)})`);
      // عنصر أعرض من الأب (نص طالع برا الإطار)
      const s = getComputedStyle(el);
      if (el.children.length === 0 && el.scrollWidth > el.clientWidth + 1 && s.overflow !== 'visible' && s.textOverflow === 'ellipsis') issues.push(`[مقصوص بـ ...] ${desc(el)}`);
      if (el.children.length === 0 && el.textContent.trim()) {
        const p = el.parentElement;
        const pr = p.getBoundingClientRect();
        if (r.right > pr.right + 2 || r.left < pr.left - 2) {
          const ps = getComputedStyle(p);
          if (ps.overflow === 'visible' || ps.overflowX === 'visible') issues.push(`[خارج إطاره] ${desc(el)} داخل ${desc(p).slice(0, 40)}`);
        }
      }
    });
    return [...new Set(issues)].map(i => label + ' :: ' + i);
  }, label);
}

(async () => {
  const { chromium } = require('playwright');
  fs.mkdirSync(OUT, { recursive: true });
  const server = await serve(8791);
  const browser = await chromium.launch();
  const all = [];
  for (const W of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width: W, height: 780 }, serviceWorkers: 'block' });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    await page.goto('http://localhost:8791/');
    await page.evaluate(() => localStorage.clear());
    await page.reload(); await wait(800);
    await page.evaluate(seed); await page.reload(); await wait(900);
    const ev = (fn, a) => page.evaluate(fn, a);
    const step = async (label, fn, arg, ms = 450) => {
      await ev(fn, arg); await wait(ms);
      const iss = await audit(page, `${W}px ${label}`);
      all.push(...iss);
      if (iss.length) await page.screenshot({ path: path.join(OUT, `audit-${W}-${label.replace(/[^\w؀-ۿ-]+/g, '_')}.png`) });
    };
    const reset = () => ev(() => new Promise(r => closeEverythingThen(r))).then(() => wait(300));
    // الأقسام الرئيسية
    for (const v of ['home', 'docs', 'ledger', 'more']) { await reset(); await step('view-' + v, v => switchView(v), v); }
    await reset(); await step('docs-mat', () => { switchView('docs'); setDocsTab('mat'); });
    // صفحة الفاتورة
    for (const v of ['info', 'lines', 'summary']) { await reset(); await step('editor-' + v, v => { settings.currentDocId = 'docA'; openEditor(v); renderEditor(); }, v); }
    await reset(); await step('editor-quote-summary', () => { settings.currentDocId = 'docQ'; openEditor('summary'); renderEditor(); });
    // الصفحات
    const pages = [['customer', 'cA'], ['device', 'dv1'], ['devices'], ['visits'], ['visit', 'v1'], ['inventory'], ['invItem', 'i1'], ['workers'], ['worker', 'w1'], ['finance'], ['payments'], ['pricelists'], ['contracts'], ['contract', 'ct1'], ['reminders'], ['notes'], ['matlist', 'm1']];
    for (const p of pages) { await reset(); await step('page-' + p.join('-'), p => openPage(...p), p); }
    for (const t of ['dev', 'vis', 'ctr']) { await reset(); await step('customer-tab-' + t, t => { custTab = t; openPage('customer', 'cA'); }, t); }
    await reset(); await step('reminders-war', () => { remTab = 'war'; openPage('reminders'); });
    for (const t of ['install', 'maint', 'refrig', 'copper', 'parts', 'daily', 'capacity', 'fx']) { await reset(); await step('calc-' + t, t => { calcTab = t; openPage('calc'); }, t); }
    await reset(); await step('visit-form', () => openVisitForm('v1'), null, 700);
    // النماذج
    const forms = [
      ['customer-form', () => openCustomerForm('cA')], ['device-form', () => openDeviceForm('dv1')],
      ['payment-form', () => openPaymentForm('p1')], ['expense-form', () => openExpenseForm('x1')],
      ['inv-form', () => openInvForm('i1')], ['stock-move', () => openStockMove('i1', 'in')],
      ['worker-form', () => openWorkerForm('w1')], ['contract-form', () => openContractForm('ct1')],
      ['note-form', () => openNoteForm('n1')], ['mat-item', () => openMatItem('m1', getMatList('m1').items[0].id)]
    ];
    for (const [n, f] of forms) { await reset(); await step(n, f); }
    for (const t of ['day', 'overtime', 'advance']) { await reset(); await step('worker-entry-' + t, t => openWorkerEntry('w1', null, t), t); }
    for (let i = 0; i < 7; i++) { await reset(); await step('line-form-' + i, i => { settings.currentDocId = 'docA'; openEditor('lines'); renderEditor(); openLineForm(getCurrentDoc().lines[i].id); }, i); }
    await reset(); await step('sheet-create', () => openCreate());
    await reset(); await step('sheet-doctype', () => pickDocType());
    await reset(); await step('sheet-actions', () => { settings.currentDocId = 'docA'; openEditor('summary'); openDocActions(); });
    await reset(); await step('sheet-pick', () => quickPayment());
    await reset(); await step('update-sheet', () => { appUpdate = { kind: 'web', version: '1.0.2', notes: ['ملاحظة تحديث طويلة جداً للتجربة ' + 'x'.repeat(5)], size: 0 }; renderAppUpdate(); openAppUpdateSheet(); });
    if (errs.length) all.push(`${W}px أخطاء JavaScript: ${errs.join(' | ')}`);
    await ctx.close();
  }
  await browser.close();
  server.close();
  console.log(all.length ? all.join('\n') : '✔ لا توجد عناصر خارج إطارها');
  console.log(`\n${all.length} مشكلة`);
  process.exit(all.length ? 1 : 0);
})();
