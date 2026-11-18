// اختبار الوحدات الإدارية: المخزون، الفواتير المنفصلة، المشتريات، المستخلص، الإيصال، النوتة، العملة، النسخ الاحتياطي
const { chromium } = require('playwright');
const assert = require('assert');
const fs = require('fs');
const BASE = process.argv[2] || 'http://localhost:8765/Hesabaty-Flooring/';
const SHOTS = process.env.SHOTS || '';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  const sheet = () => p.locator('.sheet.open').last();
  const page = () => p.locator('.page-overlay.open').last();
  const wait = (ms = 380) => p.waitForTimeout(ms);
  const shot = async n => { if (SHOTS) await p.screenshot({ path: SHOTS + n + '.png', fullPage: false }); };
  const fill = async (k, v, root) => { await (root || sheet()).locator(`[data-k="${k}"]`).first().fill(String(v)); };
  const chip = async (k, v, root) => { await (root || sheet()).locator(`[data-k="${k}"] .chip[data-v="${v}"]`).click(); await wait(150); };
  const act = async (a, root) => { await (root || sheet()).locator(`[data-act="${a}"]`).first().click(); await wait(); };
  const yes = async () => { await p.locator('#appConfirmYesBtn').click(); await wait(); };
  const no = async () => { await p.locator('#appConfirmNoBtn').click(); await wait(); };
  const back = async () => { while (await p.locator('.page-overlay.open, .sheet.open').count()) { await p.goBack(); await wait(); } };
  const step = m => console.log('✔', m);
  const stock = () => p.evaluate(() => Fin.stockOf(Store.db, Store.db.materials[0].id));

  await p.goto(BASE); await p.evaluate(() => localStorage.removeItem('hflooring_db_v1')); await p.reload(); await wait(700);

  // المخزون: خامة جديدة برصيد 50
  await p.click('#navBtn-more'); await wait(200);
  await p.locator('#view-more [data-act=inventory]').click(); await wait(400);
  await page().locator('.pg-actions .icon-btn').click(); await wait();
  await fill('name', 'لاصق سيراميك'); await chip('category', 'لاصق'); await chip('unit', 'شيكارة');
  await fill('buyPrice', 120); await fill('sellPrice', 160); await fill('openingStock', 50); await fill('minStock', 40);
  await act('save'); await wait(500);
  assert.strictEqual(await stock(), 50);
  await page().locator('[data-mat]').first().click(); await wait(400);
  await page().locator('[data-act=buy]').click(); await wait();
  await fill('qty', 20); await fill('price', 125); await act('save'); await wait(450);
  assert.strictEqual(await stock(), 70);
  assert.strictEqual(await p.evaluate(() => Store.db.materials[0].buyPrice), 125);
  await page().locator('[data-act=waste]').click(); await wait();
  await fill('qty', 2); await act('save'); await wait(450);
  await page().locator('[data-act=count]').click(); await wait();
  await fill('actual', 65); await act('save'); await wait(450);
  assert.strictEqual(await stock(), 65);
  step('خامة: رصيد 50 + شراء 20 (وتحديث سعر الشراء) − هالك 2 + جرد ← 65');

  // فاتورة بيع خامات منفصلة من صفحة الخامة ← بتخصم من المخزن
  await page().locator('[data-act=sell]').click(); await wait(600);
  await page().locator('[data-row]').first().click(); await wait();
  await fill('qty', 30); await act('save'); await wait(400);
  await page().locator('[data-k=c_name]').fill('محل الأمانة'); await wait(800);
  await page().locator('[data-k=paid]').fill('2000'); await wait(1400);
  assert.strictEqual(await stock(), 35);
  const sale = await p.evaluate(() => { const d = Store.db.docs[0]; return { n: d.number, t: Calc.docTotals(d) }; });
  assert.strictEqual(sale.t.total, 4800); assert.strictEqual(sale.t.remaining, 2800);
  assert.ok(sale.n.startsWith('S-'));
  await shot('doc-editor');
  step('فاتورة توريد خامات منفصلة ' + sale.n + ': 30 × 160 = 4,800 ومدفوع 2,000 ← المخزن 35');
  await back();

  // تنبيه انخفاض المخزون في الرئيسية
  await p.click('#navBtn-home'); await wait(300);
  assert.ok((await p.locator('#view-home').innerText()).includes('قربت تخلص'));
  const dash = await p.evaluate(() => Fin.dashboard(Store.db));
  assert.strictEqual(dash.revenue, 4800); assert.strictEqual(dash.costs, 30 * 125); assert.strictEqual(dash.due, 2800);
  step('تنبيه المخزون + الإيراد 4,800 والتكلفة 3,750 (30 × سعر الشراء) والمستحق 2,800');

  // فاتورة مشتريات من مورد بتزود المخزن
  await p.click('#navPlus'); await wait(); await act('doc'); await wait();
  await sheet().locator('[data-t=purchase]').click(); await wait(700);
  await page().locator('[data-k=s_name]').fill('مصنع الجوهرة'); await wait(700);
  await page().locator('[data-act=fromStock]').click(); await wait();
  await sheet().locator('[data-id]').first().click(); await wait(600);
  await fill('qty', 40); await act('save'); await wait(1200);
  assert.strictEqual(await stock(), 75);
  step('فاتورة مشتريات 40 شيكارة ← المخزن 75');
  await back();

  // مشروع + مستخلص + عرض سعر + إيصال
  await p.evaluate(() => {
    const c = Store.upsert('customers', { name: 'م. سامي', phone: '01100000000' });
    Store.upsert('projects', { name: 'فيلا الشيخ زايد', customerId: c.id, status: 'progress', areas: [], additions: [], items: [
      { id: 'a', name: 'تركيب رخام', basis: 'measure', scope: 'labor', unit: 'م²', qty: 100, laborPrice: 150 },
      { id: 'b', name: 'مرحلة التسوية', basis: 'stage', scope: 'labor', amount: 20000, progress: 50 }] });
    Store.save();
  });
  await p.reload(); await wait(600);
  await p.click('#navBtn-projects'); await wait(200);
  await p.locator('[data-project]').first().click(); await wait(500);
  await page().locator('[data-tab=payments]').click(); await wait(200);
  await page().locator('[data-act=add]').click(); await wait();
  await fill('amount', 5000); await act('saveReceipt'); await wait(1000);
  const rec = await p.locator('#printSheet').innerText();
  assert.ok(rec.includes('إيصال استلام') && rec.includes('5,000') && rec.includes('م. سامي'));
  await shot('receipt');
  step('إيصال استلام 5,000 برقم تلقائي');
  await p.goBack(); await wait();
  await page().locator('[data-tab=summary]').click(); await wait(200);
  await page().locator('[data-act=docs]').click(); await wait();
  await sheet().locator('[data-act=new][data-id=extract]').click(); await wait(800);
  const x = await p.evaluate(() => { const d = Store.db.docs.find(d => d.type === 'extract'); return d ? Calc.docTotals(d) : null; });
  assert.ok(x && x.total === 25000 && x.previous === 5000 && x.due === 20000, JSON.stringify(x));
  step('مستخلص: منفذ 15,000 + 50% من مرحلة 20,000 = 25,000 − سابق 5,000 = 20,000');
  await p.goBack(); await wait();
  await page().locator('[data-act=docs]').click(); await wait();
  await sheet().locator('[data-act=new][data-id=quote]').click(); await wait(800);
  await page().locator('[data-act=print]').click(); await wait(800);
  assert.ok((await p.locator('#printSheet').innerText()).includes('عرض سعر'));
  step('عرض سعر من المشروع');
  await back();
  const d2 = await p.evaluate(() => Fin.dashboard(Store.db));
  assert.strictEqual(d2.revenue, 4800 + 35000);
  step('المستخلص وعرض السعر ما اتحسبوش إيراد زيادة (الإيراد = 39,800)');

  // كشف حساب العميل
  await p.click('#navBtn-more'); await wait(200);
  await p.locator('#view-more [data-act=customers]').click(); await wait(400);
  await page().locator('[data-cust]').filter({ hasText: 'م. سامي' }).click(); await wait(400);
  assert.ok((await page().locator('.hero-value').innerText()).includes('30,000'));
  await page().locator('[data-act=stmt]').click(); await wait(800);
  const st = await p.locator('#printSheet').innerText();
  assert.ok(st.includes('كشف حساب') && st.includes('30,000'));
  step('كشف حساب العميل: 35,000 − 5,000 = 30,000');
  await back();

  // النوتة: موعد مربوط بعميل
  await p.click('#navPlus'); await wait(); await act('note'); await wait();
  await chip('kind', 'appointment'); await fill('title', 'معاينة فيلا'); await fill('body', 'قياس الصالة والسلم');
  await fill('date', '2030-01-05'); await act('save'); await wait(500);
  await p.click('#navBtn-home'); await wait(300);
  assert.ok((await p.locator('#view-home').innerText()).includes('معاينة فيلا'));
  step('النوتة: موعد بيظهر في الرئيسية');

  // حاسبة المساحات + حفظ في المشروع
  await p.click('#navBtn-calc'); await wait(200);
  await p.locator('[data-calc=areas]').click(); await wait(400);
  await page().locator('[data-act=add]').first().click(); await wait();
  await fill('name', 'الصالة'); await sheet().locator('[data-dim=l]').fill('5'); await sheet().locator('[data-dim=w]').fill('4');
  await act('save'); await wait(500);
  await page().locator('[data-act=add]').first().click(); await wait();
  await chip('kind', 'wall'); await chip('shape', 'walls');
  await sheet().locator('[data-dim=l]').fill('5'); await sheet().locator('[data-dim=w]').fill('4'); await sheet().locator('[data-dim=h]').fill('3');
  await act('addD'); await sheet().locator('[data-d="0"][data-f=w]').fill('0.9'); await sheet().locator('[data-d="0"][data-f=h]').fill('2.1');
  await act('save'); await wait(500);
  const at = await page().innerText();
  assert.ok(at.includes('20') && at.includes('52.11') && at.includes('72.11'), at);
  step('حاسبة المساحات: أرضية 20 + حوائط 54 − باب 1.89 = 72.11 م²');
  await back();

  // تغيير العملة
  await p.click('#navBtn-more'); await wait(200);
  await p.locator('#view-more [data-act=settings]').click(); await wait();
  await sheet().locator('[data-k=currency]').selectOption('KWD'); await wait(300);
  await back(); await p.click('#navBtn-home'); await wait(300);
  assert.ok((await p.locator('#view-home').innerText()).includes('د.ك'));
  step('تغيير العملة للدينار الكويتي (3 كسور)');

  // الوضع الليلي
  await p.click('#themeBtn'); await wait(300);
  assert.strictEqual(await p.evaluate(() => document.documentElement.getAttribute('data-theme')), 'dark');
  await shot('home-dark');
  step('الوضع الليلي');

  // النسخ الاحتياطي: تنزيل + مسح + استعادة
  await p.click('#navBtn-more'); await wait(200);
  await p.locator('#view-more [data-act=backup]').click(); await wait(400);
  const [dl] = await Promise.all([p.waitForEvent('download'), page().locator('[data-act=export]').click()]);
  const file = await dl.path();
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.strictEqual(json.app, 'hesabati-flooring');
  const before = await p.evaluate(() => JSON.stringify(Fin.dashboard(Store.db)));
  await page().locator('[data-act=wipe]').click(); await wait(); await yes(); await yes(); await wait(400);
  assert.strictEqual(await p.evaluate(() => Store.db.projects.length), 0);
  await page().locator('[data-file]').setInputFiles(file); await wait(500); await yes(); await wait(500);
  assert.strictEqual(await p.evaluate(() => JSON.stringify(Fin.dashboard(Store.db))), before);
  // رفض نسخة تطبيق الكهرباء
  const elec = file + '.elec.json'; fs.writeFileSync(elec, JSON.stringify({ app: 'hesabaty', invoices: [{}] }));
  await page().locator('[data-file]').setInputFiles(elec); await wait(500);
  assert.ok((await p.locator('#appConfirmText').innerText()).includes('للكهرباء'));
  await yes();
  step('نسخة احتياطية: تنزيل ← مسح ← استعادة بنفس الأرقام، ورفض ملف تطبيق الكهرباء');
  await back();

  // حذف عميل مربوط بمشروع ممنوع (حماية البيانات)
  await p.locator('#view-more [data-act=customers]').click(); await wait(400);
  await page().locator('[data-cust]').filter({ hasText: 'م. سامي' }).click(); await wait(400);
  await page().locator('.pg-actions .icon-btn').click(); await wait();
  await act('del'); await wait();
  assert.ok((await p.locator('#appConfirmText').innerText()).includes('مربوط'));
  await yes();
  step('منع حذف عميل عليه مشروعات (حماية البيانات)');

  if (errs.length) { console.log('ERRORS:\n' + errs.join('\n')); process.exitCode = 1; } else console.log('\nكل اختبارات الوحدات نجحت بدون أخطاء JavaScript');
  await b.close();
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
