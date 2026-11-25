/*
 * أرزقي | Arzoqi — ميكانيكا السيارات والموتوسيكلات والتروسيكلات: اختبار الواجهة الحقيقي (بالضغط والكتابة زي المستخدم).
 *   node tests/e2e.js [http://127.0.0.1:8790/Trade-Modules/Automotive/]
 * الإعدادات (سعر الساعة)، فاتورة شراء من مورد (الصنف بيتضاف للمخزن ورصيد المورد)، استقبال عربية بكشف الاستلام، التشخيص بكود OBD والأعراض،
 * المصنعية بالساعة وبالمبلغ، قطعة من المخزن (الرصيد بيقل) واتشرت ومن العميل، شغل خارجي ومصروف، المراحل، الدفعات، التسليم والصيانة الجاية،
 * المستندات الستة وكشف الحساب، الإلغاء بيرجّع المخزن، موتوسيكل، كل الأدوات والحاسبات، الحفظ بعد إعادة الفتح، الليلي والفاتح، شاشة الموبايل.
 */
const { chromium } = require('playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8790/Trade-Modules/Automotive/';
let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) { passed++; console.log('  ✔ ' + n); } else { failed++; console.log('  ✘ ' + n + (x !== undefined ? '  → ' + JSON.stringify(x).slice(0, 400) : '')); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  const click = async (sel) => { try { await p.click(sel, { timeout: 8000 }); } catch (e) { throw new Error('مش لاقي: ' + sel); } await sleep(300); };
  const fill = (sel, v) => p.fill(sel, String(v));
  const st = () => p.evaluate(() => { const d = window.AutoApp.db; return JSON.parse(JSON.stringify(d)); });
  await p.goto(URL); await sleep(800);
  check('لوحة الورشة فاضية من غير أرقام وهمية', await p.evaluate(() => [...document.querySelectorAll('#kpis .kpi b')].every(b => /^0$/.test(b.textContent.trim()))));

  // ---------- الإعدادات ----------
  await click('#view-home .create-opt[data-tool="settings"]');
  await fill('[data-sk="laborRate"]', 200); await p.press('[data-sk="laborRate"]', 'Tab'); await sleep(200);
  check('سعر الساعة اتحفظ', await p.evaluate(() => window.AutoApp.settings.laborRate === '200'));
  await click('#toolPage [data-act="closeTop"]');

  // ---------- شراء من مورد ----------
  await click('#view-home .create-opt[data-tool="suppliers"]'); await click('#toolPage [data-act="purchaseNew"]');
  await fill('#f_pus', 'مورد الشرق'); await fill('[data-li="0"][data-lk="name"]', 'زيت 5W30 4 لتر'); await fill('[data-li="0"][data-lk="qty"]', 10); await fill('[data-li="0"][data-lk="cost"]', 700);
  await click('[data-act="purAddLine"]'); await fill('[data-li="1"][data-lk="name"]', 'فلتر هواء'); await fill('[data-li="1"][data-lk="qty"]', 2); await fill('[data-li="1"][data-lk="cost"]', 150);
  await fill('#f_pux', 50); await fill('#f_pup', 3000); await sleep(150);
  check('إجمالي فاتورة الشراء لايف', (await p.textContent('#f_putot')).includes('7,350')); // 7000 + 300 + 50
  await click('[data-act="purchaseSave"]'); await sleep(300);
  let d = await st();
  check('الأصناف اتضافت للمخزن', d.parts.length === 2 && d.parts[0].name === 'زيت 5W30 4 لتر');
  check('رصيد المورد = 7350 − 3000', await p.evaluate(() => window.AutoApp.calc.supplierBalance(window.AutoApp.db, window.AutoApp.db.suppliers[0].id).balance === 4350));
  await click('#toolPage [data-act="supOpen"]'); await click('#toolPage [data-act="supPay"]'); await fill('#f_spa', 1350); await click('[data-act="supPaySave"]');
  check('دفعة للمورد → الرصيد 3000', await p.evaluate(() => window.AutoApp.calc.supplierBalance(window.AutoApp.db, window.AutoApp.db.suppliers[0].id).balance === 3000));
  await click('#toolPage [data-act="closeTop"]'); await click('#toolPage [data-act="closeTop"]');

  // سعر البيع والحد الأدنى
  await click('#view-home .create-opt[data-tool="inventory"]'); await click('#toolPage [data-act="partOpen"]:has-text("زيت")');
  await click('[data-act="partEdit"]'); await fill('#f_sprice', 900); await fill('#f_smin', 3); await click('[data-act="partSave"]');
  await click('#toolPage [data-act="closeTop"]'); await click('#toolPage [data-act="closeTop"]');

  // ---------- استقبال عربية ----------
  await click('#view-home [data-act="receive"]');
  await fill('#f_cname', 'أ. محمد علي'); await fill('#f_cphone', '01012345678');
  await fill('#f_vblock [data-vk="make"]', 'تويوتا'); await fill('#f_vblock [data-vk="model"]', 'كورولا'); await fill('#f_vblock [data-vk="year"]', 2018); await fill('#f_vblock [data-vk="plate"]', 'ن ص ر 1234');
  await fill('#f_odo', 85000); await click('[data-act="fuelLvl"][data-v="2"]'); await fill('#f_complaint', 'صوت تكتكة + لمبة المحرك + تغيير زيت');
  await p.check('[data-ck="الاستبن (الإطار الاحتياطي)"]'); await fill('#f_damage', 'خدش في الباب الشمال');
  await click('[data-act="createJob"]'); await sleep(300);
  d = await st();
  const j0 = d.jobs[0];
  check('أمر الشغل اتفتح برقم WO-0001 وحالة استلام', j0 && j0.number === 'WO-0001' && j0.status === 'received');
  check('المركبة والعميل اتسجلوا ومربوطين', d.vehicles.length === 1 && d.vehicles[0].customerId === d.customers[0].id && j0.vehicleId === d.vehicles[0].id);
  check('كشف الاستلام: العداد والبنزين والتلفيات', j0.odoIn === '85000' && j0.fuelIn === '2' && j0.checkin.damage === 'خدش في الباب الشمال' && j0.checkin.items['الاستبن (الإطار الاحتياطي)'] === true);

  // ---------- التشخيص ----------
  await click('#jobPage [data-act="addFinding"]'); await fill('#f_fcode', 'p0300'); await p.dispatchEvent('#f_fcode', 'input'); await sleep(150);
  check('كود OBD بيتفسر لوحده', (await p.textContent('#f_dtc')).includes('احتراق') && (await p.inputValue('#f_fdesc')).includes('احتراق'));
  await click('[data-act="sevPick"][data-v="high"]'); await click('[data-act="saveFinding"]');
  await click('#jobPage [data-act="symptoms"]'); await click('#sheet [data-act="symPick"][data-i="3"]'); await click('#sheet [data-act="symAdd"][data-k="0"]'); await click('#sheet [data-act="closeTop"]');
  d = await st();
  check('التشخيص: الكود + احتمال فحص من الأعراض، والحالة بقت «تحت الفحص»', d.jobs[0].findings.length === 2 && d.jobs[0].findings[0].code === 'P0300' && d.jobs[0].findings[0].sev === 'high' && d.jobs[0].status === 'diagnosing');

  // ---------- المصنعية ----------
  await click('#jobPage [data-act="addLabor"]'); await click('#sheet [data-act="svcPick"]'); // تغيير زيت: 0.5 ساعة
  check('المصنعية بالساعة بسعر الإعدادات', (await p.textContent('#f_ltot')).includes('100'));
  await click('[data-act="saveLabor"]');
  await click('#jobPage [data-act="addLabor"]'); await fill('#f_lname', 'كشف ماس كهربا'); await click('[data-act="lmode"][data-v="fixed"]'); await fill('#f_la', 350); await click('[data-act="saveLabor"]');
  check('سعر الخدمة اتحفظ للمرة الجاية', await p.evaluate(() => window.AutoApp.settings.servicePrices['كشف ماس كهربا'].amount === '350'));

  // ---------- قطع الغيار ----------
  await click('#jobPage [data-act="addPart"]'); await click('#sheet [data-act="stockPick"]:has-text("زيت")'); await fill('#f_pqty', 1); await p.dispatchEvent('#f_pqty', 'input');
  check('المتاح في المخزن بيظهر', (await p.textContent('#f_ptot')).includes('المتاح في المخزن 10'));
  await click('[data-act="savePart"]');
  await click('#jobPage [data-act="addPart"]'); await click('[data-act="psrc"][data-v="bought"]'); await fill('#f_pname', 'فلتر زيت'); await fill('#f_pcost', 90); await fill('#f_pprice', 130); await click('[data-act="savePart"]');
  await click('#jobPage [data-act="addPart"]'); await click('[data-act="psrc"][data-v="customer"]'); await fill('#f_pname', 'بوجيهات'); await fill('#f_pqty', 4); await click('[data-act="savePart"]');
  check('الصرف من المخزن قلّل الرصيد 10 → 9', await p.evaluate(() => { const A = window.AutoApp; return A.calc.stock(A.db)[A.db.parts.find(x => x.name.startsWith('زيت')).id].qty === 9; }));

  // ---------- شغل خارجي ومصروف وخصم ----------
  await click('#jobPage [data-act="addOutside"]'); await fill('#f_on', 'خراطة طنابير'); await fill('#f_oc', 150); await fill('#f_op', 200); await click('[data-act="saveOutside"]');
  await click('#jobPage [data-act="addCost"]'); await fill('#f_kn', 'مستهلكات'); await fill('#f_ka', 40); await click('[data-act="saveCost"]');
  await click('#jobPage #accCard [data-act="editDisc"] >> nth=0'); await fill('#f_dv', 80); await click('[data-act="saveDisc"]');
  const r1 = await p.evaluate(() => { const A = window.AutoApp; return A.J(A.db.jobs[0]); });
  // مصنعية 100 + 350 = 450 ، قطع 900 + 130 = 1030 ، خارجي 200 → 1680 − 80 = 1600 ؛ التكلفة 700 + 90 + 150 + 40 = 980 ؛ الربح 620
  check('حساب أمر الشغل', r1.laborTotal === 450 && r1.partsSell === 1030 && r1.subtotal === 1680 && r1.total === 1600 && r1.totalCost === 980 && r1.profit === 620, r1);
  check('الإجمالي في الصفحة', (await p.textContent('#jobPage .home-sum .hs-value')).includes('1,600'));

  // ---------- المراحل والدفعات والتسليم ----------
  await click('#nextStep'); check('المرحلة: انتظار موافقة', (await st()).jobs[0].status === 'approval');
  await click('#jobPage [data-act="setStatus"][data-v="parts"]'); await click('#nextStep'); await click('#nextStep');
  check('المراحل: قطع ← إصلاح ← جاهزة', (await st()).jobs[0].status === 'ready');
  await click('#jobPage .hs-stats [data-act="addPay"]'); await fill('#f_pamt', 1000); await click('[data-act="payKind"][data-v="مقدم"]'); await click('[data-act="savePay"]');
  await click('#nextStep'); await fill('#f_odoout', 85020); await p.dispatchEvent('#f_odoout', 'input'); await sleep(150);
  check('الصيانة الجاية = العداد + فترة الزيت', (await p.inputValue('#f_nkm')) === '90020');
  await click('[data-act="deliver"]'); await sleep(200);
  d = await st();
  check('اتسلمت: الحالة والعداد والصيانة الجاية', d.jobs[0].status === 'delivered' && d.vehicles[0].odo === '85020' && d.jobs[0].next.km === '90020' && !!d.jobs[0].next.date);
  const r2 = await p.evaluate(() => { const A = window.AutoApp; return A.J(A.db.jobs[0]); });
  check('المدفوع والمتبقي', r2.paid === 1000 && r2.remaining === 600);

  // ---------- المستندات ----------
  for (const [doc, word] of [['receipt', 'إيصال استلام'], ['report', 'تقرير الفحص'], ['estimate', 'عرض سعر'], ['card', 'أمر شغل'], ['invoice', 'فاتورة'], ['costs', 'كشف تكاليف']]) {
    await click('#jobPage .doc-grid [data-doc="' + doc + '"]'); await sleep(300);
    const t = await p.textContent('#printSheet');
    check('المستند: ' + word, t.includes(word) && t.includes('ن ص ر 1234') && !/NaN|undefined/.test(t));
    await click('#printPreviewModal [data-act="closeTop"]');
  }
  await click('#jobPage .doc-grid [data-doc="invoice"]');
  const inv = await p.textContent('#printSheet');
  check('الفاتورة: المتبقي 600 والصيانة الجاية والقطعة اللي من العميل', inv.includes('600') && inv.includes('90,020') && inv.includes('من العميل'));
  await click('#printPreviewModal [data-act="closeTop"]'); await click('#jobPage [data-act="closeTop"]');

  // ---------- لوحة الورشة من البيانات ----------
  const kp = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll('#kpis .kpi')].map(k => [k.querySelector('span').textContent, k.querySelector('b').textContent])));
  check('لوحة الورشة: مصنعية وقطع الشهر وأرصدة الموردين', kp['مصنعية الشهر'] === '450' && kp['قطع غيار اتباعت'] === '1,030' && kp['أرصدة الموردين'] === '3,000', kp);
  check('تحصيل النهارده', (await p.textContent('#homeToday')) === '1,000');

  // ---------- أمر شغل تاني لنفس العربية ثم إلغاؤه (المخزن يرجع) ----------
  await click('#navBtn-vehicles'); await click('#vehList [data-act="openVeh"]'); await click('[data-act="receiveVeh"]');
  check('الاستقبال لنفس المركبة: العميل والمركبة مختارين', (await p.inputValue('#f_cname')) === 'أ. محمد علي' && await p.isVisible('[data-act="pickVeh"].on'));
  await click('[data-act="createJob"]');
  await click('#jobPage [data-act="addPart"]'); await click('#sheet [data-act="stockPick"]:has-text("زيت")'); await fill('#f_pqty', 2); await click('[data-act="savePart"]');
  check('المخزن 9 → 7', await p.evaluate(() => { const A = window.AutoApp; return A.calc.stock(A.db)[A.db.parts.find(x => x.name.startsWith('زيت')).id].qty === 7; }));
  await click('#jobPage [data-act="jobMenu"]'); await click('#sheet [data-act="setStatus"][data-v="cancelled"]'); await click('#dlgYes'); await sleep(300);
  check('الإلغاء رجّع المخزن 9', await p.evaluate(() => { const A = window.AutoApp; return A.calc.stock(A.db)[A.db.parts.find(x => x.name.startsWith('زيت')).id].qty === 9; }));
  await click('#jobPage [data-act="closeTop"]'); await click('#vehPage [data-act="closeTop"]');

  // ---------- موتوسيكل ----------
  await click('#navPlus'); await click('#sheet [data-act="receive"]');
  await fill('#f_cname', 'كابتن أحمد'); await click('[data-act="vcls"][data-v="moto"]');
  check('الموتوسيكل: خانة المحرك 2T/4T بدل ناقل الحركة', await p.isVisible('#f_vblock [data-vk="stroke"]') && !(await p.isVisible('#f_vblock [data-vk="trans"]')));
  check('كشف استلام الموتوسيكل', await p.isVisible('[data-ck="الخوذة"]'));
  await fill('#f_vblock [data-vk="make"]', 'باجاج'); await fill('#f_vblock [data-vk="model"]', 'بوكسر'); await click('[data-act="createJob"]');
  await click('#jobPage [data-act="addLabor"]'); await fill('#f_svcq', 'جنزير'); await p.dispatchEvent('#f_svcq', 'input'); await sleep(150);
  check('خدمات الموتوسيكل (الجنزير والتروس)', await p.isVisible('#sheet [data-act="svcPick"][data-n="تغيير الجنزير والتروس"]'));
  await click('#sheet [data-act="closeTop"]'); await click('#jobPage [data-act="closeTop"]');
  d = await st();
  check('مركبتين: عربية وموتوسيكل', d.vehicles.length === 2 && d.vehicles[1].cls === 'moto');

  // ---------- المصروفات والفنيين ----------
  await click('#navBtn-home');
  await click('#view-home .create-opt[data-tool="expenses"]'); await click('#toolPage [data-act="expNew"]'); await click('[data-act="expCat"] >> nth=0'); await fill('#f_ea', 500); await click('[data-act="expSave"]');
  check('المصروف اتسجل', (await st()).expenses.length === 1); await click('#toolPage [data-act="closeTop"]');
  await click('#view-home .create-opt[data-tool="workers"]'); await click('#toolPage [data-act="workerNew"]'); await fill('#f_wn', 'حسن'); await fill('#f_wd', 250); await fill('#f_wpct', 10); await click('[data-act="workerSave"]');
  await click('#toolPage [data-act="workerOpen"]'); await click('#toolPage [data-act="wlogNew"]'); await click('[data-act="wlogSave"]');
  check('يومية الفني اتسجلت', (await st()).wlog.length === 1 && (await st()).wlog[0].amount === '250');
  await click('#toolPage [data-act="closeTop"]'); await click('#toolPage [data-act="closeTop"]');

  // ---------- كل الأدوات والحاسبات ----------
  for (const t of ['inventory', 'suppliers', 'expenses', 'workers', 'reports', 'reminders', 'settings']) {
    await click('#view-home .create-opt[data-tool="' + t + '"]');
    const txt = await p.textContent('#toolPage'); check('الأداة: ' + t, txt.length > 50 && !/NaN|undefined/.test(txt));
    await click('#toolPage [data-act="closeTop"]');
  }
  await click('#view-home .q-tile[data-tool="diag"]'); await fill('#f_dtcq', 'P0420'); await p.dispatchEvent('#f_dtcq', 'input'); await sleep(150);
  check('كشف الأعطال: معنى P0420', (await p.textContent('#f_dtcr')).includes('الكتلايزر')); await click('#toolPage [data-act="closeTop"]');
  await click('#view-home .create-opt[data-tool="calcs"]');
  const ids = await p.evaluate(() => window.AutoApp.catalog.TOOLS.map(t => t[0]));
  let calcOk = 0;
  for (const id of ids) { await click('#toolPage [data-act="calcOpen"][data-v="' + id + '"]'); const out = await p.textContent('#calcOut'); if (out && !/NaN|undefined/.test(out)) calcOk++; await click('#toolPage [data-act="closeTop"]'); }
  check('كل الحاسبات (' + ids.length + ') شغالة', calcOk === ids.length, calcOk);
  await click('#toolPage [data-act="calcOpen"][data-v="tire"]'); await fill('[data-cv="a"]', '205/55R16'); await p.dispatchEvent('[data-cv="a"]', 'input'); await sleep(100);
  check('حاسبة الكاوتش: القطر 631.9 مم', (await p.textContent('#calcOut')).includes('631.9'));
  await click('#toolPage [data-act="closeTop"]'); await click('#toolPage [data-act="closeTop"]');

  // ---------- كشف الحساب ----------
  await click('#navBtn-vehicles'); await click('[data-act="vehTab"][data-v="cust"]'); await click('#vehList [data-act="openCust"] >> nth=1'); await click('#custPage [data-act="statement"]');
  const stmt = await p.textContent('#printSheet');
  check('كشف حساب العميل', stmt.includes('كشف حساب') && stmt.includes('أ. محمد علي') && stmt.includes('600'));
  await click('#printPreviewModal [data-act="closeTop"]'); await click('#custPage [data-act="closeTop"]');

  // ---------- الحفظ بعد إعادة الفتح ----------
  const before = await p.evaluate(() => localStorage.getItem('hauto_db_v1'));
  await p.reload(); await sleep(700);
  check('البيانات لسه موجودة بعد إعادة الفتح', await p.evaluate(b => localStorage.getItem('hauto_db_v1') === b && window.AutoApp.db.jobs.length === 3, before));

  // ---------- المظهر والموبايل ----------
  await click('#navBtn-more');
  await p.click('[data-theme-set="dark"]'); await sleep(150); check('الوضع الليلي', (await p.getAttribute('html', 'data-theme')) === 'dark');
  await p.click('[data-theme-set="light"]'); await sleep(150); check('الوضع الفاتح', (await p.getAttribute('html', 'data-theme')) === 'light');
  check('الموبايل: مفيش سكرول عرضي', await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  await click('#navBtn-jobs'); await click('#jobList [data-act="openJob"] >> nth=0');
  check('صفحة أمر الشغل من غير سكرول عرضي', await p.evaluate(() => { const el = document.getElementById('jobPage'); return el.scrollWidth <= el.clientWidth + 1; }));
  const keys = await p.evaluate(() => Object.keys(localStorage));
  check('التخزين hauto_ (وبيانات أرزقي المشتركة) بس', keys.every(k => k.startsWith('hauto_') || k.startsWith('arzaqi_')), keys);
  check('مفيش أخطاء في الكونسول', errors.length === 0, errors);
  console.log(`\n${passed} نجح، ${failed} فشل`);
  await browser.close();
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
