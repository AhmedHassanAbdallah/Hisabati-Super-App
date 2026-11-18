#!/usr/bin/env node
/*
 * فحص التخطيط: يفتح كل شاشات ونماذج حساباتي السباكة بعرض موبايل وببيانات طويلة،
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
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg' };
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
  const L = 'مؤسسة النور الحديثة لأعمال السباكة والصحي وشبكات المياه والصرف';
  const c = NORMALIZERS.customers({ id: 'cA', name: 'م/ عبدالرحمن محمد عبدالعزيز السيد الشرقاوي', phone: '+20 101 234 5678', address: 'التجمع الخامس - الحي الثالث - شارع التسعين الجنوبي - عمارة 125 - الدور السابع - شقة 14', note: L + ' ' + L });
  DB.customers.push(c);
  DB.customers.push(NORMALIZERS.customers({ id: 'cB', name: 'شركة الأهرام للمقاولات والاستثمار العقاري', phone: '0100000000' }));
  DB.projects.push(NORMALIZERS.projects({ id: 'pr1', customerId: 'cA', name: 'فيلا الشيخ زايد الدور الأرضي والأول والروف مع الحديقة وغرفة المضخات', address: c.address, propType: 'عمارة / مبنى', startDate: '2026-11-01', endDate: '2026-11-20', status: 'progress', description: L + ' ' + L, notes: L }));
  DB.projects.push(NORMALIZERS.projects({ id: 'pr2', customerId: 'cA', name: 'شقة', status: 'delivered' }));
  DB.inventory.push(NORMALIZERS.inventory({ id: 'i1', name: 'ماسورة PPR ألماني مستوردة عالية الجودة للمياه الساخنة', cat: 'مواسير PPR', brand: 'أكواثيرم الألمانية الأصلية', model: 'Fusiotherm-SDR7.4-MF', spec: '1 1/4" × 32 مم', unit: 'متر', qty: 1234.567, minQty: 2000, buyPrice: 98765.43, sellPrice: 123456.78, supplier: L, purchaseDate: '2026-11-01', notes: L, moves: [{ date: '2026-11-01', qty: 1234.567, reason: 'شراء من ' + L }] }));
  DB.inventory.push(NORMALIZERS.inventory({ id: 'i2', name: 'محبس زاوية', cat: 'محابس', unit: 'قطعة', qty: 5, buyPrice: 60, sellPrice: 150 }));
  DB.workers.push(NORMALIZERS.workers({ id: 'w1', name: 'محمد عبدالفتاح إبراهيم الشناوي', phone: '01011112222', specialty: 'معلم سباكة وفني لحام مواسير حراري', dailyWage: 1250000, hourRate: 150000, entries: [{ type: 'day', days: 26.5, rate: 1250000, docId: 'docA', projectId: 'pr1', task: L, note: L }, { type: 'advance', amount: 9876543.21, note: 'سلفة' }, { type: 'overtime', hours: 12, rate: 150000 }, { type: 'payout', amount: 1000000 }] }));
  DB.workers.push(NORMALIZERS.workers({ id: 'w2', name: 'أحمد', dailyWage: 500 }));
  const lines = [
    { cat: 'points', kind: 'service', name: 'نقطة حوض', method: 'point', qty: 120, price: 1234567.89, space: 'الحمام الرئيسي بالدور الأول بجوار غرفة النوم الرئيسية', pipeType: 'PPR', size: '1 1/4"', incMat: true, note: L },
    { cat: 'points', kind: 'service', name: 'نقطة صرف حوض', method: 'point', qty: 12, price: 500, space: 'الحمام الرئيسي بالدور الأول بجوار غرفة النوم الرئيسية' },
    { cat: 'pipes', kind: 'material', name: 'ماسورة PPR', method: 'meter', qty: 123.5, mult: 2, price: 98765.43, cost: 80000, size: '1 1/4"', pipeType: 'PPR', pressure: 'PN20', waste: 7.5, invId: 'i1', space: 'الحمام الرئيسي بالدور الأول بجوار غرفة النوم الرئيسية' },
    { cat: 'sanitary', kind: 'fixture', name: 'طقم صحي كامل (قاعدة + حوض + خلاطات + إكسسوارات) مستورد', method: 'supply', qty: 12, price: 4567890.12, cost: 4000000, install: 123456.78 },
    { cat: 'sanitary', kind: 'fixture', name: 'خلاط من العميل', method: 'supply', qty: 5, price: 900, install: 100, source: 'client' },
    { cat: 'labor', kind: 'labor', name: 'يومية سباك', method: 'daily', qty: 30, mult: 4, price: 1250000 },
    { cat: 'external', kind: 'excavation', name: 'حفر', method: 'cubic', len: 125.5, wid: 0.75, dep: 1.25, price: 98765.4 },
    { cat: 'residential', kind: 'service', name: 'المعاينة', method: 'stage', price: 5000, done: true },
    { cat: 'residential', kind: 'service', name: 'أعمال مقاولة كاملة لتأسيس وتشطيب سباكة المبنى الإداري', method: 'lump', price: 98765432.1 }
  ];
  const doc = NORMALIZERS.docs({ id: 'docA', number: 'INV-0001', docType: 'invoice', customerId: 'cA', projectId: 'pr1', clientName: c.name, clientPhone: c.phone, clientAddress: c.address, workerIds: ['w1', 'w2'], warrantyMonths: 24, warrantyTerms: 'الضمان على المصنعية والتسريبات فقط ولا يشمل سوء الاستخدام أو كسر الأدوات الصحية',
    scope: L + ' ' + L, included: L, excluded: L, startDate: '2026-11-01', endDate: '2026-12-15', terms: '30% عربون، 40% بعد التأسيس والاختبار، 30% عند التسليم ' + L, notes: L + ' ' + L, addAmount: 1234567.5, addNote: 'أعمال إضافية خارج المقايسة ' + L, discountAmount: 765432.1, date: '2026-11-15', lines });
  DB.docs.push(doc);
  DB.docs.push(NORMALIZERS.docs({ id: 'docQ', number: 'EST-0001', docType: 'est_rough', clientName: 'عميل بدون حساب باسم طويل جداً جداً للتجربة', siteText: 'شقة 180 متر 3 حمامات ومطبخ وغرفة غسيل بالتجمع', validUntil: '2026-11-30', date: '2026-11-15', lines: lines.slice(0, 3) }));
  settings.currentDocId = 'docA';
  DB.payments.push(NORMALIZERS.payments({ id: 'p1', number: 'RCPT-0001', docId: 'docA', customerId: 'cA', amount: 12345678.9, kind: 'deposit', method: 'محفظة إلكترونية', note: L }));
  DB.payments.push(NORMALIZERS.payments({ id: 'p2', number: 'RCPT-0002', customerId: 'cA', amount: 5000, kind: 'payment', method: 'تحويل بنكي' }));
  DB.visits.push(NORMALIZERS.visits({ id: 'v1', number: 'VST-0001', customerId: 'cA', projectId: 'pr1', contractId: 'ct1', date: '2026-11-10', techIds: ['w1', 'w2'], techName: 'سباك من شركة خارجية', visitType: 'زيارة طوارئ', problemType: 'تسريب مياه شديد من خط التغذية الرئيسي داخل الحائط',
    problem: L + ' ' + L, location: 'الحمام الرئيسي بالدور الأول خلف الحوض', repairType: 'وصلة جديدة / لحام', workDone: L + ' ' + L, recommendations: L, notes: L,
    parts: [{ name: 'محبس زاوية نحاس مستورد إيطالي أصلي نصف بوصة', qty: 12, unit: 'قطعة', price: 1234567.5, cost: 1000000, invId: 'i2' }, { name: 'ماسورة', qty: 3, unit: 'متر', price: 90, kind: 'material' }],
    visitFee: 1234567.5, laborValue: 7654321.5, status: 'followup', warrantyMonths: 6, warrantyTerms: L, nextDate: '2026-11-17', nextNote: L }));
  DB.contracts.push(NORMALIZERS.contracts({ id: 'ct1', number: 'CNT-0001', customerId: 'cA', projectId: 'pr1', clientName: c.name, period: 'annual', start: '2026-11-15', end: '2027-11-14', visitsIncluded: 4, sites: L + ' ' + L, services: CONTRACT_SERVICES.slice(), extraServices: L, extraPricing: L, value: 123456789.5, notes: L }));
  DB.expenses.push(NORMALIZERS.expenses({ id: 'x1', cat: 'إيجار ومصاريف ثابتة', amount: 7654321, docId: 'docA', projectId: 'pr1', method: 'تحويل بنكي', note: L }));
  DB.expenses.push(NORMALIZERS.expenses({ id: 'x2', cat: 'خامات ومواسير', amount: 1234567.89, docId: 'docA', projectId: 'pr1', note: L }));
  DB.notes.push(NORMALIZERS.notes({ id: 'n1', cat: 'مواقع المحابس', title: 'المحبس العمومي ومحابس الحمامات والمطبخ ' + L, body: 'المحبس العمومي: خلف باب المطبخ\nمحبس الحمام: فوق السخان\nhttps://example.com/very/long/url/without/spaces/to/test/wrapping/in/the/notes/card', pinned: true, customerId: 'cA', projectId: 'pr1', date: '2026-11-18' }));
  DB.matlists.push(NORMALIZERS.matlists({ id: 'm1', customerId: 'cA', clientName: c.name, clientPhone: c.phone, clientAddress: c.address, title: 'خامات تأسيس 12 حمام للمبنى الإداري ' + L, buyer: 'me', items: [{ name: 'ماسورة PPR ألماني مستوردة للمياه الساخنة والباردة', qty: 1234.5, unit: 'متر', brand: 'أكواثيرم الألمانية', spec: '1 1/4" × 32 مم', note: L, price: 98765.43 }, { name: 'كوع', qty: 3, unit: 'قطعة', price: 60 }] }));
  settings.pointTypes = null; pointTypes().push({ id: 'ptL', name: 'نقطة جاكوزي وبانيو هيدروماساج مع خلاط حراري مدفون', conn: 'fixture' });
  stagesList().push('اختبار ضغط الشبكة لمدة 24 ساعة وتوثيق القراءات قبل إغلاق المسارات');
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
    const pages = [['customer', 'cA'], ['project', 'pr1'], ['projects'], ['visits'], ['visit', 'v1'], ['inventory'], ['invItem', 'i1'], ['workers'], ['worker', 'w1'], ['finance'], ['payments'], ['pricelists'], ['contracts'], ['contract', 'ct1'], ['reminders'], ['notes'], ['matlist', 'm1'], ['pointsCfg'], ['stagesCfg']];
    for (const p of pages) { await reset(); await step('page-' + p.join('-'), p => openPage(...p), p); }
    for (const t of ['proj', 'vis', 'ctr', 'note', 'acc']) { await reset(); await step('customer-tab-' + t, t => { custTab = t; openPage('customer', 'cA'); }, t); }
    for (const t of ['qty', 'cost', 'vis', 'note', 'acc']) { await reset(); await step('project-tab-' + t, t => { projTab = t; openPage('project', 'pr1'); }, t); }
    await reset(); await step('reminders-war', () => { remTab = 'war'; openPage('reminders'); });
    await ev(() => { calcState.pipes.fits.push(CALC_ROWS['pipes.fits']()); calcState.maint.parts.push(CALC_ROWS['maint.parts']()); calcState.bath.mode = 'stages'; calcState.kitchen.mode = 'detail'; calcState.tanks.people = 12; calcState.pipes.segs[0] = { part: 'خطوط تغذية', pipeType: 'حديد مجلفن', size: '1 1/4"', len: 12345.5, lines: 12, waste: 12.5, price: 98765.4, labor: 12345.6, bar: 5.8 }; });
    for (const t of ['points', 'bath', 'kitchen', 'pipes', 'items', 'tanks', 'dig', 'daily', 'maint', 'fx']) { await reset(); await step('calc-' + t, t => { calcTab = t; openPage('calc'); }, t); }
    await reset(); await step('visit-form', () => openVisitForm('v1'), null, 700);
    // النماذج
    const forms = [
      ['customer-form', () => openCustomerForm('cA')], ['project-form', () => openProjectForm('pr1')], ['point-type-form', () => openPointTypeForm('ptL')], ['stage-form', () => openStageForm(13)], ['price-item-form', () => openPriceItemForm(activePriceList().items[0].id)],
      ['payment-form', () => openPaymentForm('p1')], ['expense-form', () => openExpenseForm('x1')],
      ['inv-form', () => openInvForm('i1')], ['stock-move', () => openStockMove('i1', 'in')],
      ['worker-form', () => openWorkerForm('w1')], ['contract-form', () => openContractForm('ct1')],
      ['note-form', () => openNoteForm('n1')], ['mat-item', () => openMatItem('m1', getMatList('m1').items[0].id)]
    ];
    for (const [n, f] of forms) { await reset(); await step(n, f); }
    for (const t of ['day', 'overtime', 'advance']) { await reset(); await step('worker-entry-' + t, t => openWorkerEntry('w1', null, t), t); }
    for (let i = 0; i < 9; i++) { await reset(); await step('line-form-' + i, i => { settings.currentDocId = 'docA'; openEditor('lines'); renderEditor(); openLineForm(getCurrentDoc().lines[i].id); }, i); }
    for (const [n, f] of [['pdf-doc', () => { settings.currentDocId = 'docA'; openDocPreview(false); }], ['pdf-receipt', () => openReceiptPreview('p1')], ['pdf-statement', () => openStatementPreview('cA')], ['pdf-project', () => openProjectReportPreview('pr1')], ['pdf-visit', () => openVisitReportPreview('v1')], ['pdf-history', () => openMaintHistoryPreview('cA')], ['pdf-contract', () => openContractPreview('ct1')], ['pdf-matlist', () => openMatPreview('m1')]]) { await reset(); await step(n, f, null, 600); }
    await reset(); await step('sheet-create', () => openCreate());
    await reset(); await step('sheet-doctype', () => pickDocType());
    await reset(); await step('sheet-actions', () => { settings.currentDocId = 'docA'; openEditor('summary'); openDocActions(); });
    await reset(); await step('sheet-pick', () => quickPayment());
    await reset(); await step('update-sheet', () => { appUpdate = { kind: 'web', version: '1.0.1', notes: ['ملاحظة تحديث طويلة جداً للتجربة ' + 'x'.repeat(5)], size: 0 }; renderAppUpdate(); openAppUpdateSheet(); });
    if (errs.length) all.push(`${W}px أخطاء JavaScript: ${errs.join(' | ')}`);
    await ctx.close();
  }
  await browser.close();
  server.close();
  console.log(all.length ? all.join('\n') : '✔ لا توجد عناصر خارج إطارها');
  console.log(`\n${all.length} مشكلة`);
  process.exit(all.length ? 1 : 0);
})();
