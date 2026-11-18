// اختبار شامل للواجهة في متصفح حقيقي — التشغيل: node tests/e2e.js [http://localhost:8765/Hesabaty-Flooring/]
const { chromium } = require('playwright');
const assert = require('assert');
const BASE = process.argv[2] || 'http://localhost:8765/Hesabaty-Flooring/';
const SHOTS = process.env.SHOTS || '';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  p.on('dialog', d => d.accept());
  const sheet = () => p.locator('.sheet.open').last();
  const page = () => p.locator('.page-overlay.open').last();
  const wait = (ms = 380) => p.waitForTimeout(ms);
  const shot = async n => { if (SHOTS) await p.screenshot({ path: SHOTS + n + '.png' }); };
  const fill = async (k, v, root) => { await (root || sheet()).locator(`[data-k="${k}"]`).first().fill(String(v)); };
  const chip = async (k, v, root) => { await (root || sheet()).locator(`[data-k="${k}"] .chip[data-v="${v}"]`).click(); await wait(150); };
  const act = async (a, root) => { await (root || sheet()).locator(`[data-act="${a}"]`).first().click(); await wait(); };
  const confirmYes = async () => { await p.locator('#appConfirmYesBtn').click(); await wait(); };
  const step = m => console.log('✔', m);

  // تطبيق الكهرباء الأصلي: نسجل بياناته قبل أي حاجة علشان نتأكد إنها ما اتلمستش
  await p.goto(BASE.replace('Hesabaty-Flooring', 'Ezaza'));
  await p.evaluate(() => localStorage.setItem('ahmed_elec_invoices_v7', JSON.stringify({ marker: 'ELECTRIC-DATA' })));
  await wait(1500);
  const elecBefore = await p.evaluate(() => JSON.stringify(Object.keys(localStorage).filter(k => !k.startsWith('hflooring_')).sort().map(k => [k, localStorage.getItem(k)])));

  await p.goto(BASE);
  await wait(800);

  // 1) مشروع جديد من زرار (+)
  await p.click('#navPlus'); await wait();
  await act('project');
  await fill('name', 'شقة التجمع');
  await sheet().locator('[data-nc=name]').fill('أ. محمد فيصل');
  await sheet().locator('[data-nc=phone]').fill('01012345678');
  await fill('address', 'التجمع الخامس');
  await chip('status', 'progress');
  await act('save'); await wait(600);
  assert.ok(await page().locator('.pg-title').innerText() === 'شقة التجمع');
  step('إنشاء مشروع + عميل جديد');

  // 2) بنود بطرق محاسبة مختلفة
  const addItem = async (name, method, scope, vals, unit) => {
    await page().locator('[data-act=add]').first().click(); await wait();
    await fill('name', name);
    await chip('method', method);
    if (scope) await chip('scope', scope);
    if (unit) await chip('unit', unit);
    for (const [k, v] of Object.entries(vals)) await fill(k, v);
    await act('save'); await wait(450);
  };
  await addItem('تركيب بورسلين أرضيات', 'sqm', 'labor', { qty: 80, laborPrice: 120 });
  await addItem('وزرات', 'lm', null, { qty: 60, laborPrice: 25 });
  await addItem('سلم رخام', 'step', 'both', { qty: 14, laborPrice: 200, materialPrice: 650 });
  await addItem('نقل', 'lump', null, { amount: 500 });
  await addItem('تكسير قديم', 'daily', null, { workers: 2, days: 1, wage: 400 });
  const cards = await page().locator('.item-card').count();
  assert.strictEqual(cards, 5);
  const hero = (await page().locator('.hero-value').innerText()).replace(/[^\d]/g, '');
  assert.strictEqual(hero, '24300');
  await shot('project-items');
  step('5 بنود (م² / م.ط / درجة توريد وتركيب / مقطوعية / يومية) = 24,300');

  // تعديل سعر بند بعد تسجيله
  await page().locator('.item-card').first().click(); await wait();
  await fill('laborPrice', 125); await act('save'); await wait(450);
  assert.strictEqual((await page().locator('.hero-value').innerText()).replace(/[^\d]/g, ''), '24700');
  await page().locator('.item-card').first().click(); await wait();
  await fill('laborPrice', 120); await act('save'); await wait(450);
  step('تعديل سعر بند بعد تسجيله');

  // 3) الدفعات
  await page().locator('[data-tab=payments]').click(); await wait(200);
  await page().locator('[data-act=add]').click(); await wait();
  await fill('amount', 10000); await chip('kind', 'advance');
  await act('save'); await wait(500);
  assert.ok((await page().locator('.mini-stats').innerText()).includes('14,300'));
  step('دفعة مقدم 10,000 — المتبقي 14,300');

  // 4) خامات المشروع (مني + من العميل)
  await page().locator('[data-tab=materials]').click(); await wait(200);
  await page().locator('[data-act=manual]').click(); await wait();
  await fill('name', 'لاصق'); await fill('qty', 10); await fill('unitCost', 120);
  await act('save'); await wait(450);
  await page().locator('[data-act=manual]').click(); await wait();
  await fill('name', 'بورسلين العميل'); await fill('qty', 85); await chip('ownership', 'client');
  await act('save'); await wait(450);
  step('خامات: لاصق (تكلفة 1,200) + بورسلين ملك العميل (تكلفة صفر)');

  // 5) مصروف نقل
  await page().locator('[data-tab=expenses]').click(); await wait(200);
  await page().locator('[data-act=add]').click(); await wait();
  await chip('category', 'transport'); await fill('amount', 350);
  await act('save'); await wait(450);
  step('مصروف نقل 350');

  // 6) عامل + يومية
  await page().locator('[data-tab=workers]').click(); await wait(200);
  await page().locator('[data-act=add]').click(); await wait();
  await confirmYes(); // مفيش عمال → إضافة عامل
  await fill('name', 'حسن الصنايعي'); await fill('dailyWage', 400);
  await act('save'); await wait(450);
  await page().locator('[data-act=add]').click(); await wait();
  await sheet().locator('input[type=checkbox][data-w]').first().check();
  await fill('days', 5);
  await act('save'); await wait(450);
  assert.ok((await page().locator('.mini-stats').innerText()).includes('2,000'));
  step('يومية 5 أيام × 400 = 2,000');

  // 7) الملخص والأرباح
  await page().locator('[data-tab=summary]').click(); await wait(200);
  const sum = await page().locator('#ptab').innerText();
  assert.ok(sum.includes('24,300'), 'value');
  assert.ok(sum.includes('3,550'), 'cost 1200+2000+350');
  assert.ok(sum.includes('20,750'), 'profit');
  await shot('project-summary');
  step('الربح = 24,300 − 3,550 = 20,750 (خامات العميل ما اتحسبتش)');

  // 8) فاتورة مصنعية من المشروع + المعاينة
  await page().locator('[data-act=docs]').click(); await wait();
  await sheet().locator('[data-act=new][data-id=labor]').click(); await wait(700);
  const edTxt = await page().innerText();
  assert.ok(edTxt.includes('فاتورة مصنعية'));
  await page().locator('[data-act=print]').click(); await wait(800);
  const sheetTxt = await p.locator('#printSheet').innerText();
  assert.ok(sheetTxt.includes('تركيب بورسلين أرضيات') && sheetTxt.includes('أ. محمد فيصل'));
  assert.ok(sheetTxt.includes('9,600') && sheetTxt.includes('15,200'), 'labor total 15,200');
  await shot('print-preview');
  step('فاتورة مصنعية من بنود المشروع + معاينة A4 بالعربي (إجمالي المصنعية 15,200)');
  await p.goBack(); await wait(); await p.goBack(); await wait(); await p.goBack(); await wait();

  // 9) لوحة التحكم: الفاتورة المربوطة ما اتحسبتش إيراد مرتين
  await p.click('#navBtn-home'); await wait(400);
  const home = await p.locator('#view-home').innerText();
  assert.ok(home.includes('24,300'), 'revenue not doubled');
  assert.ok(home.includes('14,300'), 'due');
  step('الرئيسية: الإيراد 24,300 (من غير احتساب الفاتورة مرة تانية) والمستحق 14,300');

  // 10) حاسبة البلاط + إضافة للمشروع
  await p.click('#navBtn-calc'); await wait(300);
  await p.locator('[data-calc=tiles]').click(); await wait(500);
  const cf = page().locator('.calc-form');
  await fill('tileL', 60, cf); await fill('tileW', 60, cf); await fill('pcsPerBox', 4, cf);
  await fill('area', 25, cf); await fill('waste', 10, cf); await fill('price', 400, cf); await fill('laborPrice', 120, cf);
  await wait(300);
  const res = await page().locator('[data-res]').innerText();
  assert.ok(res.includes('77') && res.includes('20') && res.includes('28.8') && res.includes('11,000'), res);
  await page().locator('[data-act=toProject]').click(); await wait();
  await sheet().locator('[data-id]').filter({ hasText: 'شقة التجمع' }).click(); await wait(500);
  await confirmYes(); await wait(600);
  assert.ok((await page().locator('.hero-value').innerText()).replace(/[^\d]/g, '') === '35300');
  step('حاسبة البلاط: 77 بلاطة / 20 كرتونة / 28.8 م² — واتضافت للمشروع (24,300 + 11,000)');
  while (await p.locator('.page-overlay.open').count()) { await p.goBack(); await wait(); }

  // 11) باقي الحاسبات تفتح وتحسب من غير أخطاء
  for (const [id, fields] of [
    ['parquet', { area: 40, packArea: 2.4, price: 900 }], ['interlock', { area: 100, perSqm: 50 }],
    ['stairs', { steps: 15, width: 1.2 }], ['adhesive', { area: 50, rate: 5, packSize: 25 }]]) {
    await p.click('#navBtn-calc'); await wait(200);
    await p.locator(`[data-calc=${id}]`).click(); await wait(400);
    for (const [k, v] of Object.entries(fields)) await fill(k, v, page().locator('.calc-form'));
    await wait(200);
    const t = await page().locator('[data-res]').innerText();
    assert.ok(t.includes('النتيجة'), id + ' no result');
    await p.goBack(); await wait();
  }
  step('حاسبات الباركيه والإنترلوك والسلالم واللاصق شغالة');

  // 12) البيانات محفوظة بعد إعادة التحميل
  await p.reload(); await wait(800);
  await p.click('#navBtn-projects'); await wait(300);
  assert.ok((await p.locator('#view-projects').innerText()).includes('شقة التجمع'));
  step('البيانات محفوظة بعد قفل وفتح التطبيق');

  // 13) العمل بدون إنترنت
  await p.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, null, { timeout: 15000 }).catch(() => {});
  await p.reload(); await wait(800);
  await ctx.setOffline(true);
  await p.reload(); await wait(1000);
  assert.ok((await p.locator('#tabTitle').innerText()).length > 0);
  await p.click('#navBtn-calc'); await wait(300);
  assert.ok(await p.locator('[data-calc=tiles]').count() === 1);
  const font = await p.evaluate(() => document.fonts.check('16px Cairo', 'مرحبا'));
  await ctx.setOffline(false);
  step('التطبيق بيفتح ويشتغل بدون إنترنت' + (font ? ' (والخط العربي متحمل)' : ''));

  // 14) تطبيق الكهرباء ما اتأثرش
  const elecAfter = await p.evaluate(() => JSON.stringify(Object.keys(localStorage).filter(k => !k.startsWith('hflooring_')).sort().map(k => [k, localStorage.getItem(k)])));
  assert.strictEqual(elecAfter, elecBefore);
  const ownKeys = await p.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('hflooring_')));
  const cacheNames = await p.evaluate(() => caches.keys());
  assert.ok(cacheNames.every(k => k.startsWith('hflooring-') || k.startsWith('hesabaty-')), cacheNames.join());
  step('بيانات تطبيق الكهرباء ما اتلمستش — مفاتيح الأرضيات: ' + ownKeys.join(', ') + ' — الكاش: ' + cacheNames.join(', '));

  if (errs.length) { console.log('ERRORS:\n' + errs.join('\n')); process.exitCode = 1; }
  else console.log('\nكل الاختبارات نجحت بدون أخطاء JavaScript');
  await b.close();
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
