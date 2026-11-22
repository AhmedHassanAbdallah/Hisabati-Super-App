/*
 * أرزقي | Arzoqi — النجارة: اختبار الواجهة الحقيقي (بالضغط والكتابة زي المستخدم).
 *   node tests/e2e.js [http://127.0.0.1:8790/Trade-Modules/Carpentry/]
 * أمثلة المواصفات بالأرقام (دولاب بالمتر، أبواب بالقطعة، مطبخ أرضي وعلوي، ترابيزات، ألواح، هالك 5%، مشروع وربح)،
 * الخطوات الست، غرفة نوم قطعة قطعة، طرق الحساب والوحدات، الخامات على العميل أو عليك، التكاليف والربح والهامش،
 * تقطيع الألواح بالرسم، الخشب الطبيعي، مكتبة الخامات، نوع شغل جديد، الفاتورة وعرض السعر وكشف التكاليف (PDF)،
 * التعديل والتكرار والحذف، الحفظ، البحث والفلترة، الرجوع، الليلي والفاتح، العملات، ومفيش NaN.
 */
const { chromium } = require('playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8790/Trade-Modules/Carpentry/';
let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) { passed++; console.log('  ✔ ' + n); } else { failed++; console.log('  ✘ ' + n + (x !== undefined ? '  → ' + JSON.stringify(x).slice(0, 400) : '')); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const n = s => { const m = String(s || '').replace(/,/g, '').match(/-?\d+(\.\d+)?/); return m ? Number(m[0]) : NaN; };

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.goto(URL); await sleep(700);
  const A = (a, extra = '') => page.click(`[data-act="${a}"]${extra}:visible`).then(() => sleep(220));
  const sh = sel => page.click('#sheet ' + sel).then(() => sleep(200));
  const fillK = (k, v) => page.fill(`#sheet [data-k="${k}"]`, String(v));
  const step = i => sh(`[data-act="goStep"][data-i="${i}"]`);
  const total = async () => n(await page.textContent('#itTotal'));
  const job = () => page.evaluate(() => { const A = window.CarpApp; const j = A.db.jobs[0]; return j ? A.calc.job(j) : null; });
  const noBad = async l => check(l + ': مفيش NaN ولا Infinity ولا undefined', !/NaN|Infinity|undefined/.test(await page.evaluate(() => document.body.innerText)));

  console.log('\n[1] الرئيسية');
  check('العنوان', (await page.title()).includes('النجارة'));
  check('15 تخصص + نوع شغل جديد', (await page.$$('#catTiles [data-act="quickCat"]')).length === 15 && !!(await page.$('#catTiles [data-act="newType"]')));
  for (const t of ['cut', 'wood', 'library']) check('أداة ' + t, !!(await page.$(`[data-act="tool"][data-tool="${t}"]`)));
  check('مفيش حاجة اتكتبت في التخزين لمجرد الفتح', await page.evaluate(() => !Object.keys(localStorage).some(k => k.startsWith('hcarp_'))));

  console.log('\n[2] اختبار 1 — دولاب 3 متر × 1,500 = 4,500 (بالخطوات)');
  await A('quickCat', '[data-cat="wardrobe"]');
  check('الخطوة 1 مفتوحة (النوع)', await page.isVisible('#sheet .step-chip.on >> text=النوع'));
  await page.fill('#f_cname', 'م. سامح'); await page.fill('#f_jtitle', 'تجهيز شقة المعادي');
  await sh('[data-act="setType"][data-v="دولاب مفصلي"]');
  check('نوع الشغل اتكتب', (await page.inputValue('#sheet [data-k="type"]')) === 'دولاب مفصلي');
  await step(1);
  await sh('[data-act="dimUnit"][data-u="m"]');
  await fillK('w', 3); await fillK('h', 2.4); await fillK('d', 0.6);
  await step(3);
  check('الطريقة الافتراضية للدولاب: بالمتر الطولي', await page.isVisible('#sheet .chip.on[data-v="lm"]'));
  await fillK('price', 1500);
  check('الإجمالي بيتحدث لحظياً = 4,500', (await total()) === 4500, await page.textContent('#itTotal'));
  await step(1); await sh('[data-act="dimUnit"][data-u="cm"]');
  check('التحويل لسنتيمتر: 300 سم بنفس النتيجة', (await page.inputValue('#sheet [data-k="w"]')) === '300' && (await total()) === 4500);
  await step(2);
  await fillK('details.board', 'MDF'); await sh('[data-act="setField"][data-v="Soft close"]');
  await A('addLine', '[data-type="mat"][data-v="لوح MDF"]');
  await page.fill('#sheet [data-line="0"][data-f="qty"]', '10'); await page.fill('#sheet [data-line="0"][data-f="price"]', '500');
  await page.fill('#sheet [data-line="0"][data-f="wastePct"]', '5');
  check('اختبار 5+6 — 10 ألواح × 500 + هالك 5% = 5,250 على السطر', n(await page.textContent('#sheet [data-lt="0"]')) === 5250, await page.textContent('#sheet [data-lt="0"]'));
  check('الخامة مش على العميل: إجمالي البند لسه 4,500', (await total()) === 4500);
  await step(5);
  check('الملخص فيه المصنعية وتكلفة الخامات', /4,500/.test(await page.textContent('#itSum')) && /5,250/.test(await page.textContent('#itSum')));
  await A('saveItem'); await sleep(400);
  check('اتفتحت صفحة المشروع', await page.evaluate(() => document.getElementById('jobPage').classList.contains('open')));
  let r = await job();
  check('المشروع: مصنعية 4,500 وخامات 5,000 وهالك 250', r.labor === 4500 && r.byType.mat === 5000 && r.byType.waste === 250, [r.labor, r.byType]);

  console.log('\n[3] اختبار 2 — 3 أبواب × 1,200 = 3,600 + تركيب منفصل');
  await A('addItem'); await sh('[data-act="chooseCat"][data-cat="door"]');
  await sh('[data-act="setType"][data-v="باب غرفة"]');
  await step(3); await page.fill('#sheet [data-k="qty"]', '3'); await fillK('unitLabel', 'باب'); await fillK('price', 1200);
  check('3 × 1,200 = 3,600', (await total()) === 3600);
  await step(4); await fillK('install', 450);
  await page.check('#sheet [data-k="inc.frame"]');
  check('التركيب المنفصل بيتجمع: 4,050', (await total()) === 4050);
  await A('saveItem'); await sleep(300);

  console.log('\n[4] اختبار 3 — مطبخ: أرضي 4 م × 1,000 + علوي 3 م × 800 = 6,400');
  await A('addItem'); await sh('[data-act="chooseCat"][data-cat="kitchen"]');
  await sh('[data-act="setType"][data-v="مطبخ أكريليك"]');
  await step(3);
  check('الطريقة الافتراضية للمطبخ: بالمتر الطولي للأرضي والعلوي والطويل', await page.isVisible('#sheet .chip.on[data-v="zones"]'));
  await fillK('zones.base', 4); await fillK('zones.basePrice', 1000); await fillK('zones.wall', 3); await fillK('zones.wallPrice', 800);
  check('6,400', (await total()) === 6400, await page.textContent('#itTotal'));
  await step(4); await A('addLine', '[data-type="acc"][data-v="مفصلات"]');
  await page.fill('#sheet [data-line="0"][data-f="qty"]', '20'); await page.fill('#sheet [data-line="0"][data-f="price"]', '35'); await page.check('#sheet [data-line="0"][data-f="billed"]');
  check('إكسسوارات على العميل بتدخل إجمالي البند: 6,400 + 700', (await total()) === 7100);
  await A('saveItem'); await sleep(300);

  console.log('\n[5] اختبار 4 — 5 ترابيزات × 700 = 3,500');
  await A('addItem'); await sh('[data-act="chooseCat"][data-cat="home"]');
  await sh('[data-act="setType"][data-v="ترابيزة"]'); await step(3);
  await page.fill('#sheet [data-k="qty"]', '5'); await fillK('price', 700);
  check('3,500', (await total()) === 3500); await A('saveItem'); await sleep(300);

  console.log('\n[6] غرفة نوم قطعة قطعة');
  await A('addItem'); await sh('[data-act="chooseCat"][data-cat="bedroom"]');
  await sh('[data-act="setType"][data-v="غرفة نوم كاملة"]'); await step(3);
  check('الطريقة الافتراضية: قطعة قطعة', await page.isVisible('#sheet .chip.on[data-v="list"]'));
  for (const p of ['سرير', 'دولاب', 'كومود', 'تسريحة']) await sh(`[data-act="addRow"][data-key="rows"][data-v="${p}"]`);
  const rows = await page.$$('#sheet [data-row="rows"][data-f="price"]');
  check('كل اختيار بيضيف سطر للقطعة', rows.length === 4, rows.length);
  const set = async (i, f, v) => page.fill(`#sheet [data-row="rows"][data-i="${i}"][data-f="${f}"]`, String(v));
  await set(0, 'price', 3000); await set(1, 'price', 6000); await set(2, 'qty', 2); await set(2, 'price', 800); await set(3, 'price', 1500);
  check('سرير 3,000 + دولاب 6,000 + 2 كومود × 800 + تسريحة 1,500 = 12,100', (await total()) === 12100, await page.textContent('#itTotal'));
  await A('saveItem'); await sleep(300);

  r = await job();
  check('مشروع بخمس بنود من تخصصات مختلفة', r.items.length === 5);
  check('إجمالي البنود = 4,500 + 4,050 + 6,400 + 3,500 + 12,100', r.labor + r.install + r.extras === 30550, r.labor + r.install + r.extras);
  check('الإجمالي = البنود + الإكسسوارات على العميل (700)', r.total === 31250, r.total);
  await noBad('صفحة المشروع');

  console.log('\n[7] الخامات والتكاليف والربح (اختبار 7)');
  await A('addCost', '[data-type="transport"]');
  await page.fill('#f_kname', 'نقل وتركيب'); await page.fill('#f_kqty', '1'); await page.fill('#f_kprice', '1000');
  check('معاينة التكلفة 1,000', n(await page.textContent('#f_ktotal')) === 1000);
  await A('saveCost'); await sleep(300);
  await A('addCost', '[data-type="waste"]'); await sh('[data-act="wasteMode"][data-v="pct"]'); await page.fill('#f_kpct', '5');
  check('هالك 5% من الخامات المسجلة (5,000) = 250', n(await page.textContent('#f_ktotal')) === 250, await page.textContent('#f_ktotal'));
  await sh('[data-act="closeTop"]'); await sleep(250);
  r = await job();
  check('التكاليف: خامات 5,000 + هالك 250 + إكسسوارات 700 + نقل 1,000', r.totalCost === 6950, [r.totalCost, r.byType]);
  check('الربح التقديري = 31,250 − 6,950 = 24,300', r.profit === 24300);
  check('الهامش 77.8%', r.margin === 77.8, r.margin);
  check('الصفحة بتقول «الربح التقديري» وإن المصنعية مش هي الربح', /الربح التقديري/.test(await page.textContent('#profitCard')) && /المصنعية مش هي الربح/.test(await page.textContent('#profitCard')));
  await page.check('#profitCard [data-act="costsComplete"]'); await sleep(250);
  check('«سجلت كل التكاليف» بيشيل كلمة تقديري', /<span>الربح<\/span>/.test(await page.innerHTML('#profitCard')));

  console.log('\n[8] الخصم والدفعات');
  await A('editDisc'); await sh('[data-act="discType"][data-v="amount"]'); await page.fill('#f_dval', '250'); await A('saveDisc'); await sleep(300);
  await A('addPay', '.btn'); await page.fill('#f_pamt', '10000'); await page.fill('#f_pnote', 'عربون'); await A('savePay'); await sleep(300);
  r = await job();
  check('خصم 250 → 31,000 ومدفوع 10,000 ومتبقي 21,000', r.total === 31000 && r.paid === 10000 && r.remaining === 21000, [r.total, r.paid, r.remaining]);

  console.log('\n[9] الفاتورة وعرض السعر وكشف التكاليف');
  await page.click('#jobPage .pg-foot [data-act="preview"]'); await sleep(500);
  const inv = await page.textContent('#printSheet');
  for (const s of ['فاتورة', 'CRP-0001', 'م. سامح', 'تجهيز شقة المعادي', 'دولاب مفصلي', 'بالمتر الطولي', '3 م', 'باب غرفة', 'شامل الحلق', 'مصنعية التركيب', 'مطبخ أكريليك', 'وحدات أرضية', 'وحدات علوية', 'مفصلات', 'غرفة نوم كاملة', 'كومود', '31,000', '10,000', '21,000', 'المتبقي', 'سعر الوحدة', 'أرزقي'])
    check('الفاتورة فيها: ' + s, inv.includes(s));
  check('التكاليف الداخلية مش في الفاتورة (لوح MDF والنقل)', !inv.includes('لوح MDF') && !inv.includes('نقل وتركيب'));
  check('مفيش NaN في الفاتورة', !/NaN|Infinity|undefined/.test(inv));
  await page.click('[data-act="pvDoc"][data-doc="quote"]'); await sleep(200);
  check('عرض السعر', (await page.textContent('#printSheet')).includes('عرض سعر') && !(await page.textContent('#printSheet')).includes('المتبقي المطلوب'));
  await page.click('[data-act="pvDoc"][data-doc="costs"]'); await sleep(200);
  const cs = await page.textContent('#printSheet');
  check('كشف التكاليف (داخلي) فيه الخامات والهالك والربح', cs.includes('كشف التكاليف') && cs.includes('لوح MDF') && cs.includes('هالك') && cs.includes('الربح'));
  await page.click('[data-act="pvDoc"][data-doc="invoice"]'); await sleep(200);
  await page.emulateMedia({ media: 'print' }); const pdf = await page.pdf({ format: 'A4', printBackground: true }); await page.emulateMedia({ media: 'screen' });
  check('PDF حقيقي A4', pdf.slice(0, 5).toString() === '%PDF-' && pdf.length > 15000, pdf.length);
  await page.evaluate(() => history.back()); await sleep(350);
  check('الرجوع قفل المعاينة', await page.evaluate(() => document.getElementById('printPreviewModal').style.display === 'none' && document.getElementById('jobPage').classList.contains('open')));

  console.log('\n[10] تعديل وتكرار وحذف');
  await page.click('#jobPage .item-card[data-act="editItem"]'); await sleep(300);
  check('تعديل البند بيفتح على الإجمالي ومعاه خاماته', await page.isVisible('#sheet .step-chip.on >> text=الإجمالي') && /5,250/.test(await page.textContent('#itSum')));
  await step(3); await fillK('price', 1600); await A('saveItem'); await sleep(300);
  r = await job();
  check('تعديل سعر المتر → مصنعية الدولاب 4,800', r.items[0].labor === 4800, r.items[0].labor);
  check('خامات البند ما اتكررتش بعد التعديل', r.costs.filter(c => c.type === 'mat').length === 1);
  await page.click('#jobPage .item-card[data-act="editItem"]'); await sleep(300); await A('dupItem'); await sleep(300);
  r = await job();
  check('تكرار البند بخاماته', r.items.length === 6 && r.costs.filter(c => c.type === 'mat').length === 2);
  await page.locator('#jobPage .item-card').nth(1).click(); await sleep(300);
  await A('delItem'); await sleep(250); await page.click('#dlgYes'); await sleep(400);
  r = await job();
  check('حذف البند بخاماته بعد التأكيد', r.items.length === 5 && r.costs.filter(c => c.type === 'mat').length === 1);
  await A('jobMenu'); await page.click('#sheet [data-act="dupJob"]'); await sleep(500);
  const dup = await page.evaluate(() => { const j = window.CarpApp.db.jobs[1]; return j && { n: j.number, items: j.items.length, pays: j.payments.length, costs: j.costs.length, linked: j.costs.filter(c => c.itemId).every(c => j.items.some(i => i.id === c.itemId)) }; });
  check('تكرار المشروع (مشروع مشابه) CRP-0002 بنفس البنود والخامات ومن غير دفعات', dup && dup.n === 'CRP-0002' && dup.items === 5 && dup.pays === 0 && dup.costs > 0 && dup.linked, dup);
  await A('setStatus', '[data-v="quote"]');
  await A('delJob', '.btn-danger'); await page.click('#dlgNo'); await sleep(300);
  check('«لأ» ما مسحش', await page.evaluate(() => window.CarpApp.db.jobs.length === 2));
  await A('delJob', '.btn-danger'); await page.click('#dlgYes'); await sleep(500);
  check('«أيوه» مسح النسخة', await page.evaluate(() => window.CarpApp.db.jobs.length === 1));

  console.log('\n[11] تقطيع الألواح');
  await page.click('#jobList .inv-card, #homeRecent .inv-card'); await sleep(400);
  await A('cutForJob'); await sleep(300);
  check('أداة التقطيع اتفتحت ومربوطة بالمشروع', await page.evaluate(() => document.getElementById('toolPage').classList.contains('open')) && !!(await page.$('#toolPage [data-act="importParts"]')));
  const addPart = async (name, L, W, c) => { await page.click(`#toolPage [data-act="addPart"][data-v="${name}"]`); await sleep(150); const i = (await page.$$('#toolPage [data-part][data-f="L"]')).length - 1; await page.fill(`#toolPage [data-part="${i}"][data-f="L"]`, String(L)); await page.fill(`#toolPage [data-part="${i}"][data-f="W"]`, String(W)); await page.fill(`#toolPage [data-part="${i}"][data-f="count"]`, String(c)); };
  await page.fill('#toolPage [data-board="0"][data-f="price"]', '900');
  await addPart('جنب', 2200, 580, 4); await addPart('رف', 1144, 560, 8); await addPart('ضلفة', 2190, 445, 6);
  await sleep(500);
  const res = await page.textContent('#cutRes');
  check('النتيجة بعدد الألواح والهالك والتكلفة', /لوح/.test(res) && /الهالك/.test(res) && /الحد الأدنى النظري/.test(res));
  check('رسم التوزيع (SVG) لكل لوح', (await page.$$('#cutRes svg.cut-svg')).length >= 3);
  check('توضيح إن التوزيع حقيقي ومش بالضرورة الأوفر', /مش بالضرورة أوفر توزيع/.test(res));
  const sheets = n(res.match(/النتيجة: (\d+) لوح/)[1]);
  await page.fill('#toolPage [data-cut="kerf"]', '0'); await sleep(500);
  check('تغيير سلاح المنشار بيحدّث النتيجة', !!(await page.textContent('#cutRes')));
  await page.fill('#toolPage [data-cut="kerf"]', '4'); await sleep(400);
  await page.click('#toolPage [data-act="cutToJob"]'); await sleep(300);
  await page.click('#sheet [data-act="cutToLinked"]'); await sleep(500);
  r = await job();
  check('الألواح اتضافت لخامات المشروع بعددها وسعرها', r.costs.some(c => c.type === 'mat' && c.qty === sheets && c.price === 900), r.costs.map(c => [c.type, c.qty, c.price]));
  await page.click('#toolPage [data-act="cutPrint"]'); await sleep(500);
  check('طباعة خطة التقطيع', (await page.textContent('#printSheet')).includes('خطة تقطيع الألواح') && (await page.$$('#printSheet svg.cut-svg')).length >= 3);
  await page.evaluate(() => history.back()); await sleep(300);
  await page.evaluate(() => history.back()); await sleep(300);

  console.log('\n[12] الخشب الطبيعي');
  await page.evaluate(() => history.back()); await sleep(300);
  await A('tool', '[data-tool="wood"]'); await sleep(300);
  await page.fill('#toolPage [data-wood="0"][data-f="type"]', 'موسكي');
  for (const [f, v] of [['L', 400], ['W', 10], ['T', 5], ['count', 20], ['price', 30000]]) await page.fill(`#toolPage [data-wood="0"][data-f="${f}"]`, String(v));
  await sleep(200);
  const ws = await page.textContent('#woodSum');
  check('400 × 10 × 5 سم × 20 = 0.4 م³ × 30,000 = 12,000', /0\.4 م³/.test(ws) && /12,000/.test(ws), ws);
  await page.selectOption('#toolPage [data-wood="0"][data-f="unit"]', 'piece'); await page.fill('#toolPage [data-wood="0"][data-f="price"]', '650'); await sleep(200);
  check('تغيير وحدة التسعير للقطعة: 20 × 650 = 13,000', /13,000/.test(await page.textContent('#woodSum')));
  await A('woodToJob'); await page.click('#sheet [data-act="pickedJob"]'); await sleep(400);
  r = await job();
  check('الخشب اتضاف لخامات المشروع', r.costs.some(c => c.type === 'mat' && c.total === 13000));
  await page.evaluate(() => history.back()); await sleep(300);

  console.log('\n[13] مكتبة الخامات ونوع شغل جديد');
  await A('tool', '[data-tool="library"]'); await sleep(300);
  await A('libNew'); await page.fill('#f_lname', 'MDF 18 مم مستورد'); await page.fill('#f_lbuy', 'لوح'); await page.fill('#f_lprice', '1000'); await page.fill('#f_luse', 'م²'); await page.fill('#f_lfactor', '2.977');
  await A('libSave'); await sleep(300);
  check('الخامة في المكتبة بسعر وحدة الاستخدام', /335\.91|335\.9/.test(await page.textContent('#toolPage')), await page.textContent('#toolPage .mat-row'));
  await page.evaluate(() => history.back()); await sleep(300);
  await page.click('#navBtn-more'); await sleep(250);
  await A('newType'); await page.fill('#f_tname', 'وحدة حوض 80 سم'); await page.selectOption('#f_tcat', 'kitchen'); await sh('[data-act="tplMethod"][data-v="piece"]');
  await page.fill('#f_tunit', 'وحدة'); await page.fill('#f_tprice', '2200');
  await A('tplAddLine'); await page.fill('#sheet [data-trow="0"][data-f="name"]', 'مفصلات هيدروليك'); await page.selectOption('#sheet [data-trow="0"][data-f="type"]', 'acc'); await page.fill('#sheet [data-trow="0"][data-f="qty"]', '4'); await page.fill('#sheet [data-trow="0"][data-f="price"]', '60');
  await A('tplSave'); await sleep(300);
  check('النوع الجديد اتحفظ', await page.evaluate(() => window.CarpApp.settings.types.some(t => t.name === 'وحدة حوض 80 سم' && t.lines.length === 1)));
  await page.click('#navBtn-home'); await sleep(250);
  await page.click('[data-act="quickType"]'); await sleep(350);
  check('استخدام النوع: اتملى الاسم والطريقة والسعر', (await page.inputValue('#sheet [data-k="type"]')) === 'وحدة حوض 80 سم' && (await total()) === 2200);
  await page.fill('#f_cname', 'م. سامح'); await sleep(150);
  await page.click('#f_csug [data-act="pickCust"]').catch(() => {}); await sleep(150);
  await page.click('#f_target [data-act="target"]:not([data-id=""])').catch(() => {}); await sleep(100);
  await A('saveItem'); await sleep(400);
  r = await job();
  check('اتضاف على نفس المشروع ومعاه إكسسواراته', r.items.length === 6 && r.costs.some(c => c.type === 'acc' && c.total === 240), r.items.length);
  await page.evaluate(() => history.back()); await sleep(300);

  console.log('\n[14] طرق الحساب التانية من الواجهة');
  const tryMethod = async (cat, m, fill, expect) => {
    await page.click('#navBtn-home'); await sleep(200);
    await A('quickCat', `[data-cat="${cat}"]`); await step(3);
    await sh(`[data-act="setMethod"][data-v="${m}"]`);
    for (const [k, v] of fill) await fillK(k, v);
    const t = await total(); check(`${cat} ${m} = ${expect}`, t === expect, t);
    await page.evaluate(() => history.back()); await sleep(250);
  };
  await tryMethod('decor', 'sqm', [['w', 300], ['h', 250], ['price', 400]], 3000);
  await tryMethod('wardrobe', 'parts', [['parts.units', 3], ['parts.unitsPrice', 800], ['parts.doors', 6], ['parts.doorsPrice', 250]], 3900);
  await tryMethod('install', 'daily', [['days', 2], ['workers', 3], ['price', 350]], 2100);
  await tryMethod('cnc', 'hour', [['hours', 2.5], ['price', 300]], 750);
  await tryMethod('repair', 'lump', [['amount', 1800]], 1800);
  await tryMethod('wardrobe', 'board', [['boards', 6], ['price', 350]], 2100);

  console.log('\n[15] الحفظ والبحث والفلترة');
  await page.reload(); await sleep(600);
  r = await job();
  check('كل حاجة موجودة بعد إعادة الفتح', r.items.length === 6 && r.paid === 10000 && r.costs.length >= 6);
  await page.click('#navBtn-jobs'); await sleep(250);
  await page.fill('#jobSearch', 'كومود'); await sleep(200);
  check('البحث باسم قطعة', (await page.$$('#jobList .inv-card')).length === 1);
  await page.fill('#jobSearch', 'المعادي'); await sleep(200);
  check('البحث باسم المشروع', (await page.$$('#jobList .inv-card')).length === 1);
  await page.fill('#jobSearch', ''); await page.click('#jobFilters [data-f="quote"]'); await sleep(200);
  check('فلتر عروض الأسعار فاضي', (await page.$$('#jobList .inv-card')).length === 0);
  await page.click('#jobFilters [data-f="due"]'); await sleep(200);
  check('فلتر «عليها فلوس»', (await page.$$('#jobList .inv-card')).length === 1);
  await page.click('#jobFilters [data-f="all"]'); await page.click('#jobAdv summary'); await page.fill('#jobFrom', '2000-01-01'); await page.fill('#jobTo', '2000-12-31'); await page.dispatchEvent('#jobTo', 'change'); await sleep(200);
  check('فلتر التاريخ', (await page.$$('#jobList .inv-card')).length === 0);
  await A('clearJobFilter');

  console.log('\n[16] الليلي والفاتح والعملات');
  const th0 = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  await page.click('#themeBtn'); await sleep(200);
  const th1 = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  check('زرار الثيم', th1 && th1 !== th0);
  await page.reload(); await sleep(400);
  check('الثيم اتحفظ', (await page.evaluate(() => document.documentElement.getAttribute('data-theme'))) === th1);
  await page.click('#navBtn-more'); await sleep(200); await page.selectOption('#currencySelect', 'SAR'); await sleep(200);
  await page.click('#navBtn-jobs'); await sleep(200); await page.click('#jobList .inv-card'); await sleep(400);
  check('العملة في المشروع ر.س', (await page.textContent('#jobPage')).includes('ر.س') && !(await page.textContent('#jobPage')).includes('ج.م'));
  await page.click('#jobPage .pg-foot [data-act="preview"]'); await sleep(400);
  check('الفاتورة بالريال', (await page.textContent('#printSheet')).includes('ريال سعودي'));
  await page.evaluate(() => history.back()); await sleep(250); await page.evaluate(() => history.back()); await sleep(250);
  await page.click('#navBtn-more'); await page.selectOption('#currencySelect', 'EGP');
  await noBad('المزيد');
  check('مفاتيح التخزين hcarp_ / arzaqi_ بس', await page.evaluate(() => Object.keys(localStorage).every(k => /^(hcarp_|arzaqi_)/.test(k))));
  check('مفيش أخطاء JavaScript', errors.length === 0, errors);
  await browser.close();
  console.log(`\nالنتيجة: ${passed} نجح · ${failed} فشل`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
