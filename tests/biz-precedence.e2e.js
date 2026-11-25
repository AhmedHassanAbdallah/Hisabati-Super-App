/*
 * بيانات الصنايعي في رأس الفاتورة (في الأقسام الـ 13):
 *   1) القسم مفيهوش بيانات (أو لسه بالقيمة الافتراضية) → بتظهر «بياناتي» من الصفحة الرئيسية (الأساس).
 *   2) القسم فيه اسم/تليفون من «المزيد» جوه القسم → بيانات القسم هي اللي بتظهر في فواتيره (ليها الأولوية).
 * usage: node tests/biz-precedence.e2e.js http://127.0.0.1:8790/
 */
const { chromium } = require('playwright');
const BASE = (process.argv[2] || 'http://127.0.0.1:8790/').replace(/\/?$/, '/');
// فتح فاتورة/مستند في كل قسم (نفس طريقة اختبار الطباعة)
const OPEN = {
  Electrical: () => { quickNewInvoice('items'); openSinglePagePreview(false); },
  Plumbing: () => { DB.docs.push(NORMALIZERS.docs({ id: 'd1', docType: 'invoice', number: 'INV-1', clientName: 'م. خالد', lines: [] })); settings.currentDocId = 'd1'; openDocPreview(false); },
  HVAC: () => { DB.docs.push(NORMALIZERS.docs({ id: 'd1', docType: 'invoice', number: 'INV-1', clientName: 'م. خالد', lines: [] })); settings.currentDocId = 'd1'; openDocPreview(false); },
  Painting: () => { quickNewInvoice('measure'); openProjectDoc('invoice'); },
  Flooring: () => { Store.db.customers.push({ id: 'c1', name: 'م. خالد' }); Docs.printStatement(Store.db.customers[Store.db.customers.length - 1]); },
  Gypsum: () => { DB().customers.push({ id: 'c1', name: 'م. خالد' }); makeStatement('c1'); },
  Plastering: () => { UI.S.db().clients.push({ id: 'c1', name: 'م. خالد' }); Docs.openDoc('statement', { cid: 'c1' }); },
  Metalwork: 'MetalApp', Carpentry: 'CarpApp', Masonry: 'MasonApp', LowCurrent: 'LowApp', Aluminium: 'AluApp', Marble: 'MarbleApp', Automotive: 'AutoApp'
};
// كتابة اسم وتليفون الصنايعي من إعدادات القسم نفسه
const SET = {
  Electrical: (n, ph) => { appData.techName = n; appData.techPhone = ph; },
  Painting: (n, ph) => { appData.techName = n; appData.techPhone = ph; },
  Plumbing: (n, ph) => { business.techName = n; business.techPhone = ph; },
  HVAC: (n, ph) => { business.techName = n; business.techPhone = ph; },
  Flooring: (n, ph) => { Store.db.settings.bizName = n; Store.db.settings.phone = ph; },
  Gypsum: (n, ph) => { DB().settings.bizName = n; DB().settings.phone = ph; },
  Plastering: (n, ph) => { UI.S.db().settings.bizName = n; UI.S.db().settings.bizPhone = ph; }
};
const PROFILE = { name: 'م. الصفحة الرئيسية', trade: 'صنايعي', phone: '01000000001' };
let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) { passed++; console.log('  ✔ ' + n); } else { failed++; console.log('  ✘ ' + n + (x !== undefined ? '  → ' + JSON.stringify(x).slice(0, 300) : '')); } };

(async () => {
  const b = await chromium.launch();
  for (const sec of Object.keys(OPEN)) {
    for (const own of [false, true]) {
      const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
      await ctx.addInitScript(p => { try { localStorage.setItem('arzaqi_profile_v1', JSON.stringify(p)); } catch (e) {} }, PROFILE);
      const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
      await p.goto(`${BASE}Trade-Modules/${sec}/`); await p.waitForTimeout(1100);
      const o = OPEN[sec];
      await p.evaluate(([o, own, set, nat]) => {
        const n = 'ورشة القسم', ph = '01099999999';
        if (nat) { const A = window[o]; if (own) { A.settings.business.name = n; A.settings.business.phone = ph; } const num = { MetalApp: 'MTL-0001', CarpApp: 'CRP-0001', MasonApp: 'BLD-0001', LowApp: 'LC-0001', AluApp: 'ALU-0001', MarbleApp: 'MRB-0001', AutoApp: 'WO-0001' }[o];
          A.db.customers.push({ id: 'c1', name: 'م. خالد', phone: '010' }); A.db.jobs.push({ id: 'j1', number: num, customerId: 'c1', title: '', date: '2026-11-24', status: 'active', items: [], costs: [], materials: [], consumables: [], payments: [], discount: {}, labor: [], parts: [], outside: [], findings: [], recs: [], checkin: {}, next: {} }); A.openPreview({ doc: 'invoice', jobId: 'j1' });
        } else { if (own) (0, eval)('(' + set + ')')(n, ph); (0, eval)('(' + o + ')')(); }
      }, [typeof o === 'string' ? o : o.toString(), own, SET[sec] ? SET[sec].toString() : '', typeof o === 'string']);
      await p.waitForTimeout(900);
      const head = await p.evaluate(() => { const h = document.querySelector('.az-head'); return h ? h.innerText : ''; });
      if (!own) check(`${sec}: من غير بيانات في القسم → «بياناتي»`, head.includes(PROFILE.name) && head.includes(PROFILE.phone), head);
      else check(`${sec}: بيانات القسم → هي اللي في الفاتورة`, head.includes('ورشة القسم') && head.includes('01099999999') && !head.includes(PROFILE.name), head);
      if (errs.length) check(`${sec}: مفيش أخطاء`, false, errs);
      await ctx.close();
    }
  }
  await b.close();
  console.log(`\nالنتيجة: ${passed} نجح · ${failed} فشل`);
  process.exit(failed ? 1 : 0);
})();
