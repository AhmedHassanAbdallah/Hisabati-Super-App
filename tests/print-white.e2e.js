/*
 * الطباعة و"حفظ PDF" في الوضع الغامق: الورقة لازم تطلع بيضا من غير إطار أسود حواليها (في الأقسام الـ 13).
 * وكمان: هوامش الصفحة (@page) لازم تفضل صفر حتى بعد ما نوتة العمال تتحمّل (crew.css كانت بتفرض 8 مم على أي طباعة:
 * الفاتورة تصغر عن المعاينة، وحوالين الورقة يتلوّن بلون خلفية تطبيق أندرويد).
 * usage: node tests/print-white.e2e.js http://127.0.0.1:8790/
 */
const { chromium } = require('playwright');
const BASE = (process.argv[2] || 'http://127.0.0.1:8790/').replace(/\/?$/, '/');
const C = {
  Electrical: () => { quickNewInvoice('items'); openSinglePagePreview(false); },
  Plumbing: () => { DB.docs.push(NORMALIZERS.docs({ id: 'd1', docType: 'invoice', number: 'INV-1', clientName: 'م. خالد', lines: [] })); settings.currentDocId = 'd1'; openDocPreview(false); },
  HVAC: () => { DB.docs.push(NORMALIZERS.docs({ id: 'd1', docType: 'invoice', number: 'INV-1', clientName: 'م. خالد', lines: [] })); settings.currentDocId = 'd1'; openDocPreview(false); },
  Painting: () => { quickNewInvoice('measure'); openProjectDoc('invoice'); },
  Flooring: () => { Store.db.customers.push({ id: 'c1', name: 'م. خالد' }); Docs.printStatement(Store.db.customers[Store.db.customers.length - 1]); },
  Gypsum: () => { DB().customers.push({ id: 'c1', name: 'م. خالد' }); makeStatement('c1'); },
  Plastering: () => { UI.S.db().clients.push({ id: 'c1', name: 'م. خالد' }); Docs.openDoc('statement', { cid: 'c1' }); },
  Metalwork: () => { const A = window.MetalApp; A.db.customers.push({ id: 'c1', name: 'م. خالد', phone: '010' }); A.db.jobs.push({ id: 'j1', number: 'MTL-0001', customerId: 'c1', title: '', date: '2026-11-22', items: [], materials: [], consumables: [], payments: [], discount: {} }); A.openPreview({ doc: 'invoice', jobId: 'j1' }); },
  Carpentry: () => { const A = window.CarpApp; A.db.customers.push({ id: 'c1', name: 'م. خالد', phone: '010' }); A.db.jobs.push({ id: 'j1', number: 'CRP-0001', customerId: 'c1', title: '', date: '2026-11-22', status: 'active', items: [], costs: [], payments: [], discount: {} }); A.openPreview({ doc: 'invoice', jobId: 'j1' }); },
  Masonry: () => { const A = window.MasonApp; A.db.customers.push({ id: 'c1', name: 'م. خالد', phone: '010' }); A.db.jobs.push({ id: 'j1', number: 'BLD-0001', customerId: 'c1', title: '', date: '2026-11-22', status: 'active', items: [], costs: [], payments: [], discount: {} }); A.openPreview({ doc: 'invoice', jobId: 'j1' }); },
  LowCurrent: () => { const A = window.LowApp; A.db.customers.push({ id: 'c1', name: 'م. خالد', phone: '010' }); A.db.jobs.push({ id: 'j1', number: 'LC-0001', customerId: 'c1', title: '', date: '2026-11-22', status: 'active', items: [], costs: [], payments: [], discount: {} }); A.openPreview({ doc: 'invoice', jobId: 'j1' }); },
  Aluminium: () => { const A = window.AluApp; A.db.customers.push({ id: 'c1', name: 'م. خالد', phone: '010' }); A.db.jobs.push({ id: 'j1', number: 'ALU-0001', customerId: 'c1', title: '', date: '2026-11-22', status: 'active', items: [], costs: [], payments: [], discount: {} }); A.openPreview({ doc: 'invoice', jobId: 'j1' }); },
  Marble: () => { const A = window.MarbleApp; A.db.customers.push({ id: 'c1', name: 'م. خالد', phone: '010' }); A.db.jobs.push({ id: 'j1', number: 'MRB-0001', customerId: 'c1', title: '', date: '2026-11-22', status: 'active', items: [], costs: [], payments: [], discount: {} }); A.openPreview({ doc: 'invoice', jobId: 'j1' }); },
  Automotive: () => { const A = window.AutoApp; A.db.customers.push({ id: 'c1', name: 'م. خالد', phone: '010' }); A.db.vehicles.push({ id: 'v1', customerId: 'c1', cls: 'car', make: 'تويوتا', model: 'كورولا', plate: 'أ ب ج 123' }); A.db.jobs.push({ id: 'j1', number: 'WO-0001', customerId: 'c1', vehicleId: 'v1', date: '2026-11-25', status: 'repair', labor: [], parts: [], outside: [], costs: [], payments: [], findings: [], recs: [], checkin: {}, next: {}, discount: {} }); A.openPreview({ doc: 'invoice', jobId: 'j1' }); },
};
(async () => {
  const b = await chromium.launch(); let ok = 0, bad = 0;
  for (const [sec, fn] of Object.entries(C)) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' });
    const p = await ctx.newPage();
    await p.goto(`${BASE}Trade-Modules/${sec}/`); await p.waitForTimeout(1200);
    await p.addStyleTag({ url: BASE + 'Shared-Assets/brand/crew.css' }); // زي ما نوتة العمال بتعمل لما تتفتح صفحة عميل
    await p.evaluate(fn); await p.waitForTimeout(800);
    await p.emulateMedia({ media: 'print', colorScheme: 'dark' });
    const r = await p.evaluate(() => {
      const bg = el => getComputedStyle(el).backgroundColor;
      const white = c => /rgb\(255, 255, 255\)|rgba\(0, 0, 0, 0\)|transparent/.test(c);
      const els = [document.documentElement, document.body].concat([...document.querySelectorAll('#printPreviewModal, #printModal, #printViewport, #printSheet, .page-overlay.open')]);
      const dark = els.filter(e => !white(bg(e))).map(e => (e.id || e.tagName) + ' ' + bg(e));
      // الوضع الغامق (color-scheme: dark) بيخلّي كروم يلوّن حوالين الورقة في الطباعة غامق حتى لو الخلفية بيضا
      const scheme = getComputedStyle(document.documentElement).colorScheme;
      const margins = [];
      const walk = rules => { for (const r of rules) { if (r.type === CSSRule.PAGE_RULE) ['marginTop', 'marginRight', 'marginBottom', 'marginLeft'].forEach(k => { if (r.style[k] && !/^0(px|mm)?$/.test(r.style[k])) margins.push(k + '=' + r.style[k]); }); else if (r.cssRules) walk(r.cssRules); } };
      for (const s of document.styleSheets) { try { walk(s.cssRules); } catch (e) {} }
      return { htmlWhite: bg(document.documentElement) === 'rgb(255, 255, 255)' && !/dark/.test(scheme), scheme, dark, margins };
    });
    const pass = r.htmlWhite && !r.dark.length && !r.margins.length;
    pass ? ok++ : bad++;
    console.log(`  ${pass ? '✔' : '✘'} ${sec}: الورقة بيضا في الطباعة (الوضع الغامق) ومن غير هوامش زيادة` + (pass ? '' : '  →  ' + JSON.stringify(r)));
    await ctx.close();
  }
  await b.close();
  console.log(`\nالنتيجة: ${ok} نجح · ${bad} فشل`); process.exit(bad ? 1 : 0);
})();
