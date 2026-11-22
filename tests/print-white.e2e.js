/*
 * الطباعة و"حفظ PDF" في الوضع الغامق: الورقة لازم تطلع بيضا من غير إطار أسود حواليها (في الأقسام السبعة).
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
};
(async () => {
  const b = await chromium.launch(); let ok = 0, bad = 0;
  for (const [sec, fn] of Object.entries(C)) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' });
    const p = await ctx.newPage();
    await p.goto(`${BASE}Trade-Modules/${sec}/`); await p.waitForTimeout(1200);
    await p.evaluate(fn); await p.waitForTimeout(800);
    await p.emulateMedia({ media: 'print', colorScheme: 'dark' });
    const r = await p.evaluate(() => {
      const bg = el => getComputedStyle(el).backgroundColor;
      const white = c => /rgb\(255, 255, 255\)|rgba\(0, 0, 0, 0\)|transparent/.test(c);
      const els = [document.documentElement, document.body].concat([...document.querySelectorAll('#printPreviewModal, #printModal, #printViewport, #printSheet, .page-overlay.open')]);
      const dark = els.filter(e => !white(bg(e))).map(e => (e.id || e.tagName) + ' ' + bg(e));
      // الوضع الغامق (color-scheme: dark) بيخلّي كروم يلوّن حوالين الورقة في الطباعة غامق حتى لو الخلفية بيضا
      const scheme = getComputedStyle(document.documentElement).colorScheme;
      return { htmlWhite: bg(document.documentElement) === 'rgb(255, 255, 255)' && !/dark/.test(scheme), scheme, dark };
    });
    const pass = r.htmlWhite && !r.dark.length;
    pass ? ok++ : bad++;
    console.log(`  ${pass ? '✔' : '✘'} ${sec}: الورقة بيضا في الطباعة (الوضع الغامق)` + (pass ? '' : '  →  ' + JSON.stringify(r)));
    await ctx.close();
  }
  await b.close();
  console.log(`\nالنتيجة: ${ok} نجح · ${bad} فشل`); process.exit(bad ? 1 : 0);
})();
