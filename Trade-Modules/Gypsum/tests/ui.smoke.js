/*
 * اختبار تشغيل الواجهة من أولها لآخرها في متصفح حقيقي (Playwright)
 * التشغيل: node tests/ui.smoke.js [مجلد_لقطات_الشاشة]
 * يشغّل خادم محلي، ويجرب: الحاسبات → إضافة لمشروع → دفعة → فاتورة → المخزون → العمال → المصروفات → النوتة → التقارير → إعادة التحميل
 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const SHOTS = process.argv[2] || '';
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  let f = decodeURIComponent(req.url.split('?')[0]);
  if (f.endsWith('/')) f += 'index.html';
  const file = path.join(ROOT, f);
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

let failures = 0;
function check(cond, msg) { if (cond) console.log('  ✔ ' + msg); else { failures++; console.log('  ✘ ' + msg); } }

(async () => {
  await new Promise(r => server.listen(0, r));
  const url = `http://localhost:${server.address().port}/index.html`;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/fonts|ERR_FAILED|Failed to load resource/.test(m.text())) errors.push(m.text()); });
  const shot = async n => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, n + '.png') }); };
  const fill = async (sel, v) => { await page.fill(sel, String(v)); };
  const top = () => page.locator('.page-overlay').last();
  const dbg = async l => { if (process.env.DBG) console.log('DBG', l, page.url(), await page.evaluate(() => typeof guard === "undefined" ? "NA" : JSON.stringify({ L: history.length, g: guard, s: stack.length, sk: skipPop }))); };

  await page.goto(url);
  await page.waitForTimeout(400);
  console.log('الرئيسية');
  check(await page.locator('#homeSum').isVisible(), 'لوحة التحكم ظاهرة');

  console.log('حاسبة السقف 5×4');
  await page.click('#navBtn-calc');
  await page.click('#calcHub .calc-tile:has-text("الأسقف المعلقة")');
  const calc = top();
  await calc.locator('[data-rows=rooms] [data-k=L]').first().fill('5');
  await calc.locator('[data-rows=rooms] [data-k=W]').first().fill('4');
  await page.waitForTimeout(150);
  const chips = await calc.locator('#calcResult .res-chip').allInnerTexts();
  check(chips.some(t => t.includes('إجمالي المساحة') && t.includes('20')), 'المساحة = 20 م²');
  check(chips.some(t => t.includes('عدد الألواح') && /\b8\b/.test(t)), 'عدد الألواح = 8');
  await calc.locator('#calcPrice .segmented button:has-text("توريد وتركيب")').click();
  await calc.locator('#calcPrice [data-k=rate]').first().fill('80');
  await calc.locator('#calcPrice input[data-mk^="board_std_12.5"][data-f=buy]').fill('300');
  await calc.locator('#calcPrice input[data-mk^="board_std_12.5"][data-f=sell]').fill('350');
  await page.waitForTimeout(100);
  const tot = await calc.locator('#calcTotals .sum-total strong').innerText();
  check(tot.replace(/[^\d,]/g, '') === '4,400', `الإجمالي على العميل = 4,400 (${tot})`);
  await shot('01-ceiling');

  console.log('إضافة لمشروع جديد');
  await dbg('إضافة لمشروع جد');
  await calc.locator('button:has-text("إضافة إلى مشروع")').click();
  await page.click('#sheet .create-opt:has-text("مشروع جديد")');
  await fill('#projForm [data-k=custName]', 'أ. محمود السيد');
  await fill('#projForm [data-k=custPhone]', '01000000000');
  await fill('#projForm [data-k=name]', 'شقة المعادي');
  await page.click('#projForm button:has-text("حفظ")');
  await page.waitForTimeout(250);
  const proj = top();
  check((await proj.locator('h1').innerText()).includes('شقة المعادي'), 'صفحة المشروع اتفتحت');
  check(await proj.locator('.item-card').count() === 1, 'البند اتضاف للمشروع');
  check((await proj.locator('.hero-value').innerText()).includes('4,400'), 'قيمة المشروع 4,400');
  await shot('02-project');

  console.log('بند كرانيش يدوي بالمتر الطولي + دفعة');
  await dbg('بند كرانيش يدوي');
  await proj.locator('button:has-text("بند يدوي")').click();
  await fill('#itemForm [data-k=name]', 'كرانيش جبس');
  await page.selectOption('#itemForm [data-k=section]', 'decor');
  await page.selectOption('#itemForm [data-k=method]', 'lm');
  await page.selectOption('#itemForm [data-k=scope]', 'labor');
  await fill('#itemForm [data-k=qty]', '18');
  await fill('#itemForm [data-k=laborRate]', '50');
  await page.waitForTimeout(100);
  check((await page.locator('#itemLive').innerText()).includes('900'), 'إجمالي البند 900');
  await page.click('#itemForm button:has-text("حفظ البند")');
  await page.waitForTimeout(200);
  check((await top().locator('.hero-value').innerText()).includes('5,300'), 'قيمة المشروع بعد الكرانيش 5,300');
  await top().locator('.tabs button:has-text("المدفوعات")').click();
  await top().locator('button:has-text("تسجيل دفعة")').click();
  await fill('#payForm [data-k=amount]', '3000');
  await page.click('#payForm button:has-text("حفظ الدفعة")');
  await page.waitForTimeout(200);
  const stats = await top().locator('.hero-stat strong').allInnerTexts();
  check(stats[0].includes('3,000') && stats[1].includes('2,300'), `المستلم 3,000 والمتبقي 2,300 (${stats.join(' | ')})`);

  console.log('المستندات');
  await dbg("المستندات');");
  await top().locator('.app-header .icon-btn.accent').click();
  await page.click('#sheet .create-opt:has-text("فاتورة توريد وتركيب")');
  await page.click('#docForm button:has-text("معاينة")');
  await page.waitForTimeout(300);
  check(await page.locator('#printPreviewModal').isVisible(), 'معاينة A4 ظاهرة');
  const sheetTxt = await page.locator('#printSheet').innerText();
  check(sheetTxt.includes('5,300') && sheetTxt.includes('2,300'), 'الفاتورة فيها الإجمالي والمتبقي');
  check(sheetTxt.includes('الكرانيش والبانوهات'), 'الفاتورة مقسمة حسب التخصص');
  check(/كرانيش جبس\s+18\s+م\.ط/.test(sheetTxt), 'وحدة الكرانيش في الفاتورة م.ط');
  await shot('03-invoice');
  await page.click('.preview-toolbar .tb-btn.close');
  await page.waitForTimeout(150);
  await top().locator('.app-header .icon-btn.accent').click();
  await page.click('#sheet .create-opt:has-text("مقايسة أعمال جبسون بورد")');
  await page.click('#docForm button:has-text("معاينة")');
  await page.waitForTimeout(200);
  check((await page.locator('#printSheet').innerText()).includes('حصر الخامات'), 'المقايسة فيها حصر الخامات');
  await page.click('.preview-toolbar .tb-btn.close');

  console.log('الرجوع (زر الموبايل)');
  await dbg('الرجوع (زر المو');
  await page.goBack();
  await page.waitForTimeout(250);
  check(await page.locator('.page-overlay').count() === 0, 'زر الرجوع قفل صفحة المشروع');

  console.log('باقي الحاسبات بدون أخطاء');
  await dbg('باقي الحاسبات ب');
  for (const [t, fillFn] of [
    ['القواطيع', async o => { await o.locator('[data-rows=walls] [data-k=L]').first().fill('4'); await o.locator('[data-rows=walls] [data-k=H]').first().fill('3'); }],
    ['بيت النور', async o => { await o.locator('#calcForm [data-k=L]').first().fill('5'); await o.locator('#calcForm [data-k=W]').first().fill('4'); await o.locator('[data-rows=levels] [data-k=w]').first().fill('0.6'); await o.locator('[data-rows=levels] [data-k=d]').first().fill('0.3'); }],
    ['تكسية الحوائط', async o => { await o.locator('[data-rows=walls] [data-k=L]').first().fill('4'); await o.locator('[data-rows=walls] [data-k=H]').first().fill('3'); }],
    ['تكسية الأعمدة', async o => { await o.locator('[data-rows=columns] [data-k=a]').first().fill('0.5'); await o.locator('[data-rows=columns] [data-k=H]').first().fill('3'); }],
    ['الجبس البلدي', async o => { await o.locator('[data-rows=rooms] [data-k=L]').first().fill('4'); await o.locator('[data-rows=rooms] [data-k=W]').first().fill('3'); await o.locator('[data-rows=rooms] [data-k=H]').first().fill('3'); }],
    ['الكرانيش', async o => { await o.locator('#calcForm [data-k=L]').first().fill('5'); await o.locator('#calcForm [data-k=W]').first().fill('4'); }],
    ['البانوهات', async o => { await o.locator('[data-rows=panels] [data-k=w]').first().fill('1.2'); await o.locator('[data-rows=panels] [data-k=h]').first().fill('0.8'); }],
    ['الروزتات', async o => { await o.locator('[data-rows=items] [data-k=count]').first().fill('2'); }]
  ]) {
    await page.click('#navBtn-calc');
    await page.click(`#calcHub .calc-tile:has-text("${t}")`);
    const o = top();
    await fillFn(o);
    await page.waitForTimeout(120);
    const n = await o.locator('#calcResult .res-chip').count();
    const warn = await o.locator('#calcResult .warn-box').count();
    check(n > 0 && warn === 0, `حاسبة ${t}: ${n} نتيجة`);
    if (t === 'الجبس البلدي') await shot('04-plaster');
    if (t === 'البانوهات') { check((await o.locator('#calcResult').innerText()).match(/عدد قطع البروفايل\s+3/), 'البانوهات: قطع البروفايل = 3 (قطعة 2 م افتراضي + هالك 10%)'); await o.locator('#calcPrice .segmented button:has-text("تصنيع وتركيب")').click(); await shot('05-panels'); }
    await page.goBack(); await page.waitForTimeout(150);
  }
  check(await page.locator('.page-overlay').count() === 0, 'كل صفحات الحاسبات اتقفلت');

  console.log('المخزون والعمال والمصروفات والنوتة والتقارير');
  await page.click('#navBtn-more');
  await page.click('.more-tile:has-text("الخامات")');
  await page.waitForTimeout(150);
  check(await top().locator('.list-card').count() > 20, 'الخامات المبدئية موجودة');
  await top().locator('button:has-text("تسجيل مشتريات")').click();
  await fill('#moveForm [data-k=qty]', '50');
  await fill('#moveForm [data-k=price]', '300');
  await page.click('#moveForm button:has-text("حفظ")');
  await page.waitForTimeout(150);
  check((await top().locator('.hero-value').innerText()).includes('15,000'), 'قيمة المخزون 15,000 بعد شراء 50 لوح × 300');
  await shot('06-stock');
  await page.goBack(); await page.waitForTimeout(150);
  await page.click('.more-tile:has-text("العمال")');
  await top().locator('button:has-text("عامل جديد")').click();
  await fill('#workerForm [data-k=name]', 'حسن');
  await fill('#workerForm [data-k=wage]', '250');
  await page.click('#workerForm button:has-text("حفظ")');
  await top().locator('button:has-text("تسجيل يومية")').click();
  await page.selectOption('#attForm [data-k=projectId]', { index: 1 });
  await fill('#attForm [data-k=days]', '2');
  await page.click('#attForm button:has-text("حفظ")');
  await page.waitForTimeout(150);
  check((await top().locator('.hero-value').innerText()).includes('500'), 'مستحقات العمال 500');
  await page.goBack(); await page.waitForTimeout(150);
  await page.click('.more-tile:has-text("المصروفات")');
  await top().locator('.container button:has-text("مصروف جديد")').click();
  await fill('#expForm [data-k=amount]', '150');
  await page.selectOption('#expForm [data-k=projectId]', { index: 1 });
  await page.click('#expForm button:has-text("حفظ")');
  await page.waitForTimeout(150);
  await page.goBack(); await page.waitForTimeout(150);
  await page.click('.more-tile:has-text("النوتة")');
  await top().locator('.app-header .icon-btn.accent').click();
  await fill('#noteForm [data-k=title]', 'مقاسات الريسبشن');
  await fill('#noteForm [data-k=body]', '5.20 × 4.10');
  await page.click('#noteForm button:has-text("حفظ")');
  await page.waitForTimeout(150);
  check(await top().locator('.note-card').count() === 1, 'الملاحظة اتحفظت');
  await page.goBack(); await page.waitForTimeout(150);
  await page.click('.more-tile:has-text("التقارير")');
  await page.waitForTimeout(150);
  const kp = await top().locator('.hero-value').innerText();
  // إيراد 5,300 − (خامات 8×300=2,400 + أجور 500 + مصروفات 150) = 2,250
  check(kp.includes('2,250'), `صافي الأرباح 2,250 (${kp.trim()})`);
  await shot('07-reports');
  await top().locator('button:has-text("طباعة تقرير الأرباح")').click();
  await page.waitForTimeout(200);
  check((await page.locator('#printSheet').innerText()).includes('شقة المعادي'), 'تقرير الأرباح فيه المشروع');
  await page.click('.preview-toolbar .tb-btn.close');
  await page.goBack(); await page.waitForTimeout(150);

  console.log('العملة والوضع الليلي وإعادة التحميل');
  await page.selectOption('#currencySelect', 'SAR');
  await page.click('#theme-dark');
  await page.reload(); await page.waitForTimeout(400);
  check((await page.locator('#homeSum').innerText()).includes('ر.س'), 'العملة اتغيرت واتحفظت');
  check(await page.evaluate(() => document.documentElement.getAttribute('data-theme')) === 'dark', 'الوضع الليلي اتحفظ');
  await page.click('#navBtn-projects');
  check(await page.locator('#projList .list-card').count() === 1, 'المشروع موجود بعد إعادة التحميل (Offline/Local)');
  await shot('08-dark-projects');
  check(await page.evaluate(() => Object.keys(localStorage).every(k => k.startsWith('hgyp_'))), 'كل مفاتيح التخزين خاصة بتطبيق الجبس (hgyp_)');

  console.log('أخطاء JavaScript');
  check(errors.length === 0, errors.length ? errors.join('\n') : 'مفيش أخطاء');
  await browser.close(); server.close();
  console.log(failures ? `\n✘ ${failures} فشل` : '\n✔ كل اختبارات الواجهة نجحت');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); server.close(); process.exit(1); });
