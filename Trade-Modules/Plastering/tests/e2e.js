/*
 * اختبار تشغيل كامل في المتصفح (Playwright):
 * مشروع جديد ← غرفة 5×4×3 بباب وشباك ← بند محارة ← دفعة ← إعادة تحميل ← بدون إنترنت ← مستند
 * التشغيل: node tests/e2e.js
 */
const { chromium } = require('playwright');
const assert = require('assert');
const start = require('./serve.js');
const SHOTS = process.env.SHOTS || '';

(async () => {
  const PORT = 8093;
  const srv = await start(PORT);
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const pg = await ctx.newPage();
  const errors = [];
  pg.on('pageerror', e => errors.push(e.message));
  pg.on('console', m => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)/.test(m.text())) errors.push(m.text()); });
  const URL = `http://localhost:${PORT}/Hesabaty-plaster/`;
  const shot = async n => { if (SHOTS) await pg.screenshot({ path: SHOTS + '/' + n + '.png', fullPage: false }); };
  const num = s => parseFloat(String(s).replace(/[^\d.\-]/g, ''));
  const step = (m) => console.log('✔ ' + m);

  // تأكيد العزل: مفاتيح تطبيق آخر على نفس النطاق لا تتأثر
  await pg.goto(URL);
  await pg.evaluate(() => { localStorage.setItem('hesabaty_settings_v1', '{"theme":"dark"}'); localStorage.setItem('ahmed_elec_invoices_v7', '{"x":1}'); });
  await pg.reload();
  await pg.waitForSelector('.hero');

  // 1) مشروع جديد مع عميل جديد
  await pg.click('[data-act="newProject"]');
  await pg.fill('#f_name', 'فيلا اختبار');
  await pg.selectOption('#f_clientId', '__new');
  await pg.fill('#f_newClientName', 'أ/ محمد');
  await pg.fill('#f_newClientPhone', '01000000000');
  await pg.click('#formSave');
  await pg.waitForURL(/#\/project\/.+\/zones/);
  step('إنشاء مشروع وعميل');

  // 2) منطقة: غرفة 5×4×3 + باب + شباك
  await pg.click('[data-act="addZone"]');
  await pg.click('.opt >> text=غرفة / مكان داخلي');
  await pg.waitForURL(/#\/zone\//);
  await pg.fill('[data-bind="zn:measure.room.l"]', '5');
  await pg.fill('[data-bind="zn:measure.room.w"]', '4');
  await pg.fill('[data-bind="zn:measure.room.h"]', '3');
  await pg.click('[data-tpl="opening"][data-k="door"]');
  await pg.click('[data-tpl="opening"][data-k="window"]');
  await pg.waitForTimeout(150);
  let area = num(await pg.textContent('#ebTotal'));
  assert.ok(Math.abs(area - 50.67) < 0.001, 'مساحة الغرفة الصافية ' + area);
  step('مساحة الغرفة بعد خصم الفتحات = 50.67 م² (54 − 3.33)');
  // أكتاف الباب بعمق 25 سم = 1.275 م²
  await pg.selectOption('[data-bind="zn:measure.openings.0.reveal"]', 'door');
  await pg.fill('[data-bind="zn:measure.openings.0.depth"]', '25');
  await pg.waitForTimeout(100);
  area = num(await pg.textContent('#ebTotal'));
  assert.ok(Math.abs(area - 51.945) < 0.01, 'مع الأكتاف ' + area);
  step('إضافة أكتاف الباب = 51.95 م²');
  await shot('e2e-zone');

  // 3) بند محارة أسمنتية على المنطقة
  await pg.click('[data-act="addItem"]');
  await pg.click('.opt >> text=المحارة الداخلية');
  await pg.waitForTimeout(400);
  await pg.click('.opt >> text=محارة أسمنتية تقليدية');
  await pg.waitForURL(/#\/item\//);
  await pg.fill('[data-bind="it:laborRate"]', '50');
  await pg.waitForTimeout(150);
  const total = num(await pg.textContent('#ebTotal'));
  assert.ok(Math.abs(total - 51.945 * 50) < 0.02, 'إجمالي البند ' + total);
  const matText = await pg.textContent('#matOut');
  assert.ok(/أسمنت/.test(matText) && /رمل/.test(matText), 'الخامات محسوبة');
  step('بند المحارة: 51.945 م² × 50 = ' + total);
  await shot('e2e-item');
  await pg.click('#editorBar [data-act="back"]');
  await pg.waitForURL(/#\/zone\//);
  await pg.click('#editorBar [data-act="back"]');
  await pg.waitForURL(/#\/project\//);

  // 4) دفعة 1000
  const pid = pg.url().split('/project/')[1].split('/')[0];
  await pg.goto(URL + '#/project/' + pid + '/sum');
  await pg.click('.q-tile[data-act="addPayment"]');
  await pg.fill('#f_amount', '1000');
  await pg.click('#formSave');
  await pg.waitForTimeout(200);
  const remain = num(await pg.textContent('.hero-stat.warn strong'));
  assert.ok(Math.abs(remain - (51.945 * 50 - 1000)) < 0.02, 'المتبقي ' + remain);
  step('الدفعة والمتبقي = ' + remain);
  await shot('e2e-project');

  // 5) الحفظ بعد إعادة التحميل
  await pg.waitForTimeout(400);
  await pg.reload();
  await pg.waitForSelector('.hero');
  const remain2 = num(await pg.textContent('.hero-stat.warn strong'));
  assert.strictEqual(remain2, remain);
  step('البيانات محفوظة بعد إعادة التحميل');

  // 6) بدون إنترنت
  await pg.evaluate(() => navigator.serviceWorker.ready);
  await pg.reload(); // علشان الـ SW يتحكم في الصفحة
  await pg.waitForFunction(() => !!navigator.serviceWorker.controller);
  await ctx.setOffline(true);
  await pg.reload();
  await pg.waitForSelector('.hero');
  const remain3 = num(await pg.textContent('.hero-stat.warn strong'));
  assert.strictEqual(remain3, remain);
  await pg.goto(URL + '#/calc');
  await pg.waitForSelector('[data-act="calcStart"]');
  step('التطبيق يفتح ويعرض البيانات بدون إنترنت');
  await ctx.setOffline(false);

  // 7) المستندات
  await pg.goto(URL + '#/project/' + pid + '/docs');
  await pg.click('[data-type="boq"]');
  await pg.waitForSelector('#printModal.open');
  const doc = await pg.textContent('#printSheet');
  assert.ok(/مقايسة أعمال/.test(doc) && /محارة أسمنتية تقليدية/.test(doc) && /أ\/ محمد/.test(doc));
  await shot('e2e-doc');
  await pg.click('[data-act="closeDoc"]');
  for (const t of ['quote', 'inv_labor', 'inv_supply', 'inv_full', 'certificate', 'statement', 'cost', 'materials']) {
    await pg.click(`[data-type="${t}"]`);
    await pg.waitForSelector('#printModal.open');
    await pg.click('[data-act="closeDoc"]');
  }
  step('كل مستندات المشروع تُنشأ (مقايسة، عرض سعر، فواتير، مستخلص، كشف حساب، تقرير تكلفة، كشف خامات)');

  // 8) العزل
  const other = await pg.evaluate(() => [localStorage.getItem('hesabaty_settings_v1'), localStorage.getItem('ahmed_elec_invoices_v7')]);
  assert.deepStrictEqual(other, ['{"theme":"dark"}', '{"x":1}']);
  const keys = await pg.evaluate(() => Object.keys(localStorage).filter(k => !k.startsWith('hplaster_')));
  assert.deepStrictEqual(keys.sort(), ['ahmed_elec_invoices_v7', 'hesabaty_settings_v1']);
  const cacheNames = await pg.evaluate(() => caches.keys());
  assert.ok(cacheNames.every(k => k.startsWith('hplaster-')), 'أسماء الكاش ' + cacheNames);
  step('العزل: لم يتم لمس بيانات تطبيق الكهرباء، وكل المفاتيح والكاش بادئة hplaster');

  // مسح بيانات التطبيق لا يمسح بيانات الآخرين
  await pg.evaluate(() => window.PlasterStore.resetAll());
  const other2 = await pg.evaluate(() => localStorage.getItem('ahmed_elec_invoices_v7'));
  assert.strictEqual(other2, '{"x":1}');
  step('«مسح كل البيانات» يمسح بيانات المحارة فقط');

  assert.deepStrictEqual(errors, [], 'أخطاء في الصفحة: ' + errors.join(' | '));
  step('لا توجد أخطاء JavaScript');
  await browser.close();
  srv.close();
  console.log('E2E PASSED');
})().catch(e => { console.error('E2E FAILED:', e.message); process.exit(1); });
