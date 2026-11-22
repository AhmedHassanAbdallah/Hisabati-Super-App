/*
 * أرزقي | Arzoqi — الحدادة: اختبار الواجهة الحقيقي (بالضغط والكتابة زي المستخدم).
 *   node tests/e2e.js [http://127.0.0.1:8790/Trade-Modules/Metalwork/]
 * بيجرب: كل أنواع الحساب (متر مربع، كيلو، قطعة، مقطوعية، سنتيمتر)، أمثلة المواصفات بالأرقام،
 * عدة بنود في حساب واحد، تكاليف التشغيل والهالك (بسعر ومن غير سعر)، الخامات، الخصم، الدفعات،
 * الفاتورة وعرض السعر وكشف الحساب (PDF حقيقي)، التعديل والتكرار والحذف، الحفظ بعد إعادة الفتح،
 * البحث والفلترة، زرار الرجوع، الوضع الليلي والفاتح، العملات، ومفيش NaN ولا Infinity في أي شاشة.
 */
const { chromium } = require('playwright');
const URL = process.argv[2] || 'http://127.0.0.1:8790/Trade-Modules/Metalwork/';
let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) { passed++; console.log('  ✔ ' + n); } else { failed++; console.log('  ✘ ' + n + (x !== undefined ? '  → ' + JSON.stringify(x).slice(0, 400) : '')); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const digits = s => { const m = String(s || '').replace(/,/g, '').match(/-?\d+(\.\d+)?/); return m ? String(Number(m[0])) : ''; };

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', colorScheme: 'light' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.goto(URL); await sleep(700);

  const act = async (a, extra = '') => { await page.click(`[data-act="${a}"]${extra}:visible`); await sleep(260); };
  const sheetOpen = () => page.evaluate(() => document.getElementById('sheet').classList.contains('open'));
  const liveTotal = () => page.textContent('#f_total');
  const jobText = () => page.textContent('#jobPage');
  const noBad = async label => { const t = await page.evaluate(() => document.body.innerText); check(label + ': مفيش NaN ولا Infinity ولا undefined', !/NaN|Infinity|undefined/.test(t)); };
  const calc = () => page.evaluate(() => { const A = window.MetalApp; const j = A.db.jobs[0]; return A.calc.job(j); });

  console.log('\n[1] الرئيسية');
  check('عنوان القسم', (await page.title()).includes('الحدادة'));
  for (const k of ['laser', 'hand', 'door', 'roof', 'piece', 'lump']) check('زرار نوع الشغل ' + k, !!(await page.$(`[data-act="quickKind"][data-kind="${k}"]`)));
  check('زرار تكاليف التشغيل والهالك', !!(await page.$('[data-act="quickCosts"]')));
  check('زرار الحسابات السابقة والفواتير', !!(await page.$('[data-act="pickInvoice"]')) && !!(await page.$('[data-view="jobs"]')));
  check('ما اتكتبش أي حاجة في التخزين لمجرد الفتح', (await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('hmetal_')).length)) === 0);

  console.log('\n[2] بوابة ليزر بالمتر المربع: 2 × 3 × 500 = 3,000');
  await act('quickKind', '[data-kind="laser"]');
  check('نموذج البوابة الليزر اتفتح', await sheetOpen());
  check('حقول الليزر بس (مفيش وزن ولا مهام)', !(await page.$('#sheet #f_weight')) && !(await page.$('#sheet #f_tasks')) && !!(await page.$('#sheet #f_h')));
  await page.fill('#f_cname', 'أبو محمد الحداد');
  await page.fill('#f_desc', 'بوابة الفيلا');
  await page.fill('#f_h', '2'); await page.fill('#f_w', '3'); await page.fill('#f_price', '500');
  check('الإجمالي بيتحدث لحظياً = 3,000', digits(await liveTotal()) === '3000', await liveTotal());
  check('المساحة 6 م² ظاهرة', (await page.textContent('#f_break')).includes('6 م²'));
  await page.fill('#f_count', '');
  check('العدد الفاضي بيتحسب 1 من غير NaN', digits(await liveTotal()) === '3000');
  await page.fill('#f_count', '1');
  await act('saveItem'); await sleep(300);
  check('اتفتحت صفحة الحساب', await page.evaluate(() => document.getElementById('jobPage').classList.contains('open')));
  check('الحساب فيه 3,000', (await jobText()).includes('3,000'));
  check('العميل اتسجل', await page.evaluate(() => window.MetalApp.db.customers.length === 1));

  console.log('\n[3] بوابة مشغولة بالكيلو: 120 × 35 = 4,200');
  await act('addItem'); await act('chooseKind', '[data-kind="hand"]');
  check('حقول المشغولة: وزن وسعر الكيلو (مفيش ارتفاع وعرض)', !!(await page.$('#sheet #f_weight')) && !(await page.$('#sheet #f_h')));
  await page.fill('#f_desc', 'بوابة الجنينة مشغولة'); await page.fill('#f_weight', '120'); await page.fill('#f_price', '35');
  check('الإجمالي = 4,200', digits(await liveTotal()) === '4200', await liveTotal());
  await act('saveItem'); await sleep(300);

  console.log('\n[4] باب صاج: 2 × 1 × عدد 2 × 300 = 1,200');
  await act('addItem'); await act('chooseKind', '[data-kind="door"]');
  await page.fill('#f_h', '2'); await page.fill('#f_w', '1'); await page.fill('#f_price', '300');
  await page.click('#sheet [data-act="step"][data-d="1"]'); await sleep(100);
  check('زرار + خلّى العدد 2', (await page.inputValue('#f_count')) === '2');
  check('الإجمالي = 1,200', digits(await liveTotal()) === '1200', await liveTotal());
  await act('saveItem'); await sleep(300);

  console.log('\n[5] كرسي حديد بالقطعة: 5 × 250 = 1,250');
  await act('addItem'); await act('chooseKind', '[data-kind="piece"]');
  await page.click('#sheet [data-act="setName"][data-v="كرسي حديد"]');
  await page.fill('#f_specs', '45×45 سم'); await page.fill('#f_count', '5'); await page.fill('#f_price', '250');
  check('الإجمالي = 1,250', digits(await liveTotal()) === '1250', await liveTotal());
  await act('saveItem'); await sleep(300);

  console.log('\n[6] مقطوعية: تصنيع وتعديل معدة زراعية = 3,500');
  await act('addItem'); await act('chooseKind', '[data-kind="lump"]');
  check('المقطوعية من غير معادلة (مفيش سعر وحدة)', !(await page.$('#sheet #f_price')));
  await page.fill('#f_title2', 'مقطورة جرار');
  await page.fill('#f_tasks .t-desc', 'تصنيع وتعديل معدة زراعية'); await page.fill('#f_tasks .t-amt', '3500');
  check('الإجمالي = 3,500', digits(await liveTotal()) === '3500', await liveTotal());
  await act('addTask'); await page.fill('#f_tasks .task-row:nth-child(2) .t-desc', 'لحام الشاسيه'); await page.fill('#f_tasks .task-row:nth-child(2) .t-amt', '1,000');
  check('مهمة تانية: الإجمالي 4,500', digits(await liveTotal()) === '4500', await liveTotal());
  await page.click('#f_tasks .task-row:nth-child(2) [data-act="delTask"]'); await sleep(100);
  check('حذف المهمة رجّع 3,500', digits(await liveTotal()) === '3500', await liveTotal());
  await act('saveItem'); await sleep(300);

  console.log('\n[7] سقف صاج بالسنتيمتر: 600 × 450 سم × 100 = 27 م² = 2,700');
  await act('addItem'); await act('chooseKind', '[data-kind="roof"]');
  await page.click('#f_unit [data-u="cm"]'); await sleep(80);
  await page.fill('#f_h', '600'); await page.fill('#f_w', '450'); await page.fill('#f_price', '100');
  check('27 م² و 2,700', (await page.textContent('#f_break')).includes('27 م²') && digits(await liveTotal()) === '2700', [await page.textContent('#f_break'), await liveTotal()]);
  await page.click('#f_unit [data-u="m"]'); await sleep(80);
  check('التحويل للمتر خلّى المقاس 6 × 4.5 بنفس النتيجة', (await page.inputValue('#f_h')) === '6' && (await page.inputValue('#f_w')) === '4.5' && digits(await liveTotal()) === '2700');
  await page.click('#f_unit [data-u="cm"]'); await sleep(80);
  await act('saveItem'); await sleep(300);

  let r = await calc();
  check('6 بنود في حساب واحد بأنواع مختلفة', r.items.length === 6, r.items.length);
  check('إجمالي المصنعية = 15,850', r.labor === 15850, r.labor);
  check('صفحة الحساب بتعرض 15,850', (await jobText()).includes('15,850'));
  await noBad('صفحة الحساب');

  console.log('\n[8] تكاليف التشغيل والهالك');
  await act('addCons');
  await page.click('#sheet [data-act="setSName"][data-v="سلك لحام"]');
  check('الوحدة اتكتبت لوحدها (كيلو)', (await page.inputValue('#f_sunit')) === 'كيلو');
  await page.fill('#f_sqty', '2'); await page.fill('#f_sprice', '90');
  check('إجمالي المستهلك = 180', digits(await page.textContent('#f_stotal')) === '180');
  await act('saveSimple'); await sleep(300);
  await act('addCons'); await page.click('#sheet [data-act="setSName"][data-v="أقراص قطع"]'); await page.fill('#f_sqty', '3'); await page.fill('#f_sprice', '25'); await act('saveSimple'); await sleep(300);
  await act('addCons'); await page.click('#sheet [data-act="setSName"][data-v="هالك حديد"]'); await page.fill('#f_sqty', '4');
  check('من غير سعر: «من غير سعر»', (await page.textContent('#f_stotal')).includes('من غير سعر'));
  await act('saveSimple'); await sleep(300);
  await act('addCons'); await page.fill('#f_sname', 'شريط لحام خاص'); await page.click('#sheet [data-act="setSUnit"][data-v="متر"]'); await page.fill('#f_sqty', '1.5'); await page.fill('#f_sprice', '10'); await act('saveSimple'); await sleep(300);
  r = await calc();
  check('إجمالي تكاليف المستهلكات = 270', r.consCost === 270, r.consCost);
  check('مستهلك من غير سعر متسجل ومعلَّم', r.consUnpriced === 1);
  check('المستهلك الجديد (اسم مخصص) اتحفظ للمرة الجاية', await page.evaluate(() => window.MetalApp.settings.consNames.includes('شريط لحام خاص')));
  check('التكاليف مش على العميل: الإجمالي لسه 15,850', r.total === 15850, r.total);
  check('صافي الربح التقديري = 15,580', r.profit === 15580, r.profit);
  check('الصفحة بتعرض صافي الربح', (await jobText()).includes('15,580'));

  console.log('\n[9] الخامات والخصم والدفعات');
  await act('addMat'); await page.click('#sheet [data-act="setSName"][data-v="ألواح صاج"]'); await page.fill('#f_sqty', '2'); await page.fill('#f_sprice', '400'); await act('saveSimple'); await sleep(300);
  await act('addMat'); await page.fill('#f_sname', 'زوايا'); await page.fill('#f_sqty', '1'); await page.fill('#f_sprice', '150'); await page.click('#f_sbilled'); await act('saveSimple'); await sleep(300);
  r = await calc();
  check('خامات على العميل 800 + على حسابي 150', r.matBilled === 800 && r.matCost === 950, [r.matBilled, r.matCost]);
  check('الإجمالي = 15,850 + 800 = 16,650', r.total === 16650, r.total);
  await act('editDisc'); await page.click('#sheet [data-act="discType"][data-v="percent"]'); await page.fill('#f_dval', '10');
  check('معاينة الخصم 10%', (await page.textContent('#f_dtotal')).includes('14,985'));
  await act('saveDisc'); await sleep(300);
  r = await calc();
  check('بعد خصم 10% = 14,985', r.discount === 1665 && r.total === 14985, [r.discount, r.total]);
  await act('addPay', '.btn'); await page.fill('#f_pamt', '5000'); await page.fill('#f_pnote', 'عربون'); await act('savePay'); await sleep(300);
  r = await calc();
  check('المدفوع 5,000 والمتبقي 9,985', r.paid === 5000 && r.remaining === 9985, [r.paid, r.remaining]);
  await page.click('#jobPage .bill-toggle input'); await sleep(250);
  r = await calc();
  check('تكاليف التشغيل على الفاتورة لما تختار: الإجمالي زاد 270 قبل الخصم', r.consBilled === 270 && r.total === 15228, [r.consBilled, r.total]);
  await page.click('#jobPage .bill-toggle input'); await sleep(250);
  await noBad('بعد الخصم والدفعات');

  console.log('\n[10] الفاتورة');
  await act('preview', '[data-doc="invoice"].btn-accent'); await sleep(500);
  const inv = await page.textContent('#printSheet');
  check('معاينة الفاتورة اتفتحت', await page.evaluate(() => document.getElementById('printPreviewModal').style.display === 'block'));
  for (const s of ['فاتورة', 'MTL-0001', 'أبو محمد الحداد', 'بوابة حديد ليزر', 'م²', 'كجم', 'قطعة', 'مقطوعية', '6 م²', '120 كجم', 'كرسي حديد', 'مقطورة جرار',
    'إجمالي المصنعية', '15,850', 'ألواح صاج', 'الخصم (10%)', '1,665', '14,985', '5,000', '9,985', 'المتبقي', 'وحدة الحساب', 'سعر الوحدة', 'أرزقي', 'جنيه مصري'])
    check('الفاتورة فيها: ' + s, inv.includes(s));
  check('الخامات على حسابي مش في الفاتورة', !inv.includes('زوايا'));
  check('تكاليف التشغيل مش في الفاتورة (مش على العميل)', !inv.includes('سلك لحام'));
  check('مفيش NaN في الفاتورة', !/NaN|Infinity|undefined/.test(inv));
  await page.click('[data-act="pvDoc"][data-doc="quote"]'); await sleep(200);
  const quote = await page.textContent('#printSheet');
  check('عرض السعر: عنوانه «عرض سعر» ومن غير المتبقي', quote.includes('عرض سعر') && !quote.includes('المتبقي المطلوب'));
  await page.emulateMedia({ media: 'print' });
  const pdf = await page.pdf({ format: 'A4', printBackground: true });
  await page.emulateMedia({ media: 'screen' });
  check('PDF حقيقي A4 اتولد', pdf.slice(0, 5).toString() === '%PDF-' && pdf.length > 15000, pdf.length);
  const printOnly = await page.evaluate(() => { const m = document.createElement('style'); return [...document.querySelectorAll('#editorApp, .bottom-nav, #jobPage')].length; });
  check('عناصر الشاشة موجودة (الطباعة بتخفيها بالـ CSS)', printOnly >= 2);
  await page.evaluate(() => history.back()); await sleep(400);
  check('الرجوع قفل المعاينة وفضلنا في الحساب', await page.evaluate(() => document.getElementById('printPreviewModal').style.display === 'none' && document.getElementById('jobPage').classList.contains('open')));

  console.log('\n[11] تعديل وتكرار وحذف');
  await page.click('#jobPage .item-card[data-act="editItem"]'); await sleep(300);
  check('تعديل البند فتح نفس البيانات', (await page.inputValue('#f_h')) === '2' && (await page.inputValue('#f_price')) === '500');
  await page.fill('#f_price', '550'); await act('saveItem'); await sleep(300);
  r = await calc();
  check('تعديل سعر البوابة: المصنعية 16,150', r.labor === 16150, r.labor);
  check('آخر سعر اتحفظ كاقتراح (مش إلزامي)', await page.evaluate(() => window.MetalApp.settings.lastPrice.laser === 550));
  await act('jobMenu'); await page.click('#sheet [data-act="dupJob"]'); await sleep(500);
  const dup = await page.evaluate(() => { const A = window.MetalApp; const j = A.db.jobs[1]; return j && { n: j.number, items: j.items.length, pays: j.payments.length, cons: j.consumables.length }; });
  check('التكرار: حساب جديد MTL-0002 بنفس البنود ومن غير دفعات', dup && dup.n === 'MTL-0002' && dup.items === 6 && dup.pays === 0 && dup.cons === 4, dup);
  check('النسخة اتفتحت', (await page.textContent('#jobPage .pg-head')).includes('MTL-0002'));
  await act('delJob', '.btn-danger'); await sleep(250);
  check('الحذف بيسأل الأول', await page.evaluate(() => document.getElementById('dialog').classList.contains('open')));
  await page.click('#dlgNo'); await sleep(300);
  check('«لأ» ما مسحش', await page.evaluate(() => window.MetalApp.db.jobs.length === 2));
  await act('delJob', '.btn-danger'); await page.click('#dlgYes'); await sleep(500);
  check('«أيوه» مسح النسخة بس', await page.evaluate(() => window.MetalApp.db.jobs.length === 1 && window.MetalApp.db.jobs[0].number === 'MTL-0001'));
  check('بعد الحذف رجعنا برّه صفحة الحساب', await page.evaluate(() => !document.getElementById('jobPage').classList.contains('open')));

  console.log('\n[12] الحفظ وإعادة الفتح');
  await page.reload(); await sleep(700);
  r = await calc();
  check('كل البيانات موجودة بعد إعادة الفتح', r.items.length === 6 && r.labor === 16150 && r.paid === 5000 && r.consumables.length === 4 && r.materials.length === 2, [r.items.length, r.labor, r.paid]);
  check('الرئيسية: المتبقي عند العملاء', (await page.textContent('#homeDue')).includes(',') && Number(digits(await page.textContent('#homeDue'))) === r.remaining, [await page.textContent('#homeDue'), r.remaining]);

  console.log('\n[13] الحسابات السابقة: بحث وفلترة');
  await page.click('#navBtn-jobs'); await sleep(300);
  check('الحساب ظاهر في القايمة', (await page.$$('#jobList .inv-card')).length === 1);
  await page.fill('#jobSearch', 'مقطورة'); await sleep(200);
  check('البحث باسم بند لقاه', (await page.$$('#jobList .inv-card')).length === 1);
  await page.fill('#jobSearch', 'مش موجود'); await sleep(200);
  check('بحث مالوش نتيجة', (await page.$$('#jobList .inv-card')).length === 0);
  await page.fill('#jobSearch', ''); await sleep(150);
  await page.click('#jobFilters [data-f="done"]'); await sleep(150);
  check('فلتر «خلصانة» فاضي', (await page.$$('#jobList .inv-card')).length === 0);
  await page.click('#jobFilters [data-f="due"]'); await sleep(150);
  check('فلتر «عليها فلوس» فيه الحساب', (await page.$$('#jobList .inv-card')).length === 1);
  await page.click('#jobFilters [data-f="all"]'); await sleep(150);
  await page.click('#jobAdv summary'); await sleep(150);
  await page.fill('#jobFrom', '2000-01-01'); await page.fill('#jobTo', '2000-12-31'); await page.dispatchEvent('#jobTo', 'change'); await sleep(150);
  check('فلتر التاريخ (سنة 2000) فاضي', (await page.$$('#jobList .inv-card')).length === 0);
  await page.click('[data-act="clearJobFilter"]'); await sleep(150);
  const cid = await page.evaluate(() => window.MetalApp.db.customers[0].id);
  await page.selectOption('#jobCust', cid); await sleep(150);
  check('فلتر العميل', (await page.$$('#jobList .inv-card')).length === 1);

  console.log('\n[14] العميل: كشف حساب ونوتة العمال');
  await page.click('#navBtn-customers'); await sleep(300);
  await page.click('#custList .cust-card'); await sleep(400);
  check('صفحة العميل فيها نوتة العمال المشتركة', !!(await page.$('#custPage [data-az-crew^="metalwork:"]')));
  await page.waitForSelector('#custPage [data-az-crew] *', { timeout: 5000 }).catch(() => {});
  check('كارت النوتة اتملى', await page.evaluate(() => (document.querySelector('#custPage [data-az-crew]') || {}).innerText.length > 5));
  await act('statement'); await sleep(400);
  const st = await page.textContent('#printSheet');
  check('كشف الحساب فيه الحساب والدفعة والمتبقي', st.includes('كشف حساب') && st.includes('MTL-0001') && st.includes('عربون') && st.includes('5,000'));
  await page.evaluate(() => history.back()); await sleep(300);
  await page.evaluate(() => history.back()); await sleep(300);

  console.log('\n[15] الفواتير من الرئيسية + زرار الرجوع');
  await page.click('#navBtn-home'); await sleep(200);
  await act('pickInvoice');
  check('شريط «اختار الحساب»', await page.isVisible('#pickBar'));
  await page.click('#jobList .inv-card'); await sleep(400);
  check('الضغط على الحساب فتح فاتورته', await page.evaluate(() => document.getElementById('printPreviewModal').style.display === 'block'));
  await page.evaluate(() => history.back()); await sleep(300);
  await page.click('#navPlus'); await sleep(250);
  check('زرار + فتح نافذة', await sheetOpen());
  await page.evaluate(() => history.back()); await sleep(300);
  check('الرجوع قفل النافذة', !(await sheetOpen()));
  await page.click('#navBtn-home'); await sleep(200);
  await act('quickCosts'); await sleep(200);
  await page.click('#sheet [data-act="pickedJob"]'); await sleep(500);
  check('تكاليف التشغيل من الرئيسية: فتحت الحساب ونموذج المستهلك', await page.evaluate(() => document.getElementById('jobPage').classList.contains('open')) && !!(await page.$('#sheet #f_sname')));
  await page.evaluate(() => history.back()); await sleep(250);
  await page.evaluate(() => history.back()); await sleep(250);

  console.log('\n[16] إضافة بند لعميل موجود من الرئيسية');
  await page.click('#navBtn-home'); await sleep(200);
  await act('quickKind', '[data-kind="piece"]');
  await page.fill('#f_cname', 'أبو محمد'); await sleep(150);
  await page.click('#f_csug [data-act="pickCust"]'); await sleep(150);
  check('اقتراح العميل الموجود وحساباته الجارية', !!(await page.$('#f_target [data-act="target"]')));
  await page.click('#f_target [data-act="target"]:not([data-id=""])'); await sleep(100);
  await page.fill('#f_name', 'ترابيزة حديد'); await page.fill('#f_count', '2'); await page.fill('#f_price', '400');
  await act('saveItem'); await sleep(500);
  r = await calc();
  check('البند اتضاف على نفس الحساب (مش حساب جديد)', r.items.length === 7 && (await page.evaluate(() => window.MetalApp.db.jobs.length)) === 1, r.items.length);
  check('المنتج الجديد اتحفظ في اختيارات المنتجات', await page.evaluate(() => window.MetalApp.settings.products[0] === 'ترابيزة حديد'));
  await page.evaluate(() => history.back()); await sleep(300);

  console.log('\n[17] الوضع الليلي والفاتح والعملات');
  const th0 = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  await page.click('#themeBtn'); await sleep(200);
  const th1 = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  check('زرار الثيم غيّر الوضع', th1 && th1 !== th0, [th0, th1]);
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  check('الوضع الليلي خلفيته غامقة', th1 !== 'dark' || /rgb\(0, 18, 16\)/.test(bg), bg);
  await page.reload(); await sleep(500);
  check('الوضع اتحفظ', (await page.evaluate(() => document.documentElement.getAttribute('data-theme'))) === th1);
  await page.click('#navBtn-jobs'); await sleep(150);
  await page.click('#jobList .inv-card'); await sleep(400);
  await page.screenshot({ path: require('path').join(__dirname, 'job-' + th1 + '.png') }).catch(() => {});
  await page.evaluate(() => history.back()); await sleep(300);
  await page.click('#themeBtn'); await sleep(150);
  await page.click('#navBtn-more'); await sleep(200);
  await page.selectOption('#currencySelect', 'SAR'); await sleep(200);
  await page.click('#navBtn-home'); await sleep(200);
  check('العملة اتغيرت في الرئيسية (ر.س)', (await page.textContent('.home-sum')).includes('ر.س'));
  await page.click('#navBtn-jobs'); await sleep(150); await page.click('#jobList .inv-card'); await sleep(400);
  check('العملة اتغيرت في الحساب', (await jobText()).includes('ر.س') && !(await jobText()).includes('ج.م'));
  await act('preview', '[data-doc="invoice"].btn-accent'); await sleep(400);
  check('الفاتورة بالريال السعودي', (await page.textContent('#printSheet')).includes('ريال سعودي'));
  await page.evaluate(() => history.back()); await sleep(250); await page.evaluate(() => history.back()); await sleep(250);
  await page.click('#navBtn-more'); await sleep(150); await page.selectOption('#currencySelect', 'KWD'); await sleep(150);
  const kwd = await page.evaluate(() => { const A = window.MetalApp; return document.getElementById('moreStats').innerText; });
  check('الدينار الكويتي (3 أرقام عشرية) من غير مشاكل', kwd.includes('د.ك') && !/NaN/.test(kwd));
  await page.selectOption('#currencySelect', 'EGP');
  await noBad('المزيد');

  console.log('\n[18] حذف بند وحذف العميل');
  await page.click('#navBtn-jobs'); await sleep(150); await page.click('#jobList .inv-card'); await sleep(400);
  await page.locator('#jobPage .item-card').last().click(); await sleep(300);
  await act('delItem'); await sleep(300); await page.click('#dlgYes'); await sleep(400);
  check('حذف البند بعد التأكيد', (await calc()).items.length === 6);
  await page.evaluate(() => history.back()); await sleep(300);
  await page.click('#navBtn-customers'); await sleep(200); await page.click('#custList .cust-card'); await sleep(300);
  await act('delCust'); await page.click('#dlgYes'); await sleep(500);
  check('حذف العميل مسح حساباته', await page.evaluate(() => window.MetalApp.db.customers.length === 0 && window.MetalApp.db.jobs.length === 0));
  check('مفاتيح التخزين كلها hmetal_ أو arzaqi_ (مش بتلمس أقسام تانية)', await page.evaluate(() => Object.keys(localStorage).every(k => /^(hmetal_|arzaqi_)/.test(k))));

  check('مفيش أخطاء JavaScript', errors.length === 0, errors);
  await browser.close();
  console.log(`\nالنتيجة: ${passed} نجح · ${failed} فشل`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
