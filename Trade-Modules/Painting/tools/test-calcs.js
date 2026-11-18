#!/usr/bin/env node
/*
 * حساباتي نقاشة — اختبار الحسابات والوظائف في متصفح حقيقي (Chromium عن طريق Playwright)
 *   node tools/test-calcs.js            (أو مع مجلد للصور: node tools/test-calcs.js /tmp/shots)
 * بيشغّل خادم محلي للمجلد، ويفتح التطبيق، ويتحقق من:
 *   الحائط 454.40 · الغرفة 54 م² · اليومية 6,000 · المقاولة المتبقي 10,000 · العملات
 *   المستندات PDF · النسخ الاحتياطي · رفض نسخ تطبيق الكهرباء · استقلال التخزين · العمل بدون إنترنت
 * © 2026 أحمد حسن عبدالله - جميع الحقوق محفوظة.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const SHOTS = process.argv[2] || '';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg' };
let failures = 0, passes = 0;
function check(name, cond, extra) {
  if (cond) { passes++; console.log('  ✔ ' + name); }
  else { failures++; console.log('  ✘ ' + name + (extra !== undefined ? '  →  ' + JSON.stringify(extra) : '')); }
}
const near = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;

function serve() {
  return new Promise(resolve => {
    const srv = http.createServer((req, res) => {
      const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      let f = path.join(ROOT, p === '/' ? 'index.html' : p);
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      fs.createReadStream(f).pipe(res);
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}

(async () => {
  const srv = await serve();
  const URL0 = `http://127.0.0.1:${srv.address().port}/`;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, acceptDownloads: true });
  // بيانات «حساباتي للكهرباء» على نفس النطاق: لازم ما تتقريش ولا تتغير
  const ELEC = { ahmed_elec_invoices_v7: JSON.stringify({ invoices: [{ id: 'inv_1', clientName: 'عميل كهرباء', rooms: [{ name: 'صالة', sockets: 9 }] }] }), hesabaty_customers_v1: '{"customers":[{"id":"c_e","name":"عميل كهرباء","entries":[]}]}', hesabaty_settings_v1: '{"currency":"EGP"}' };
  await ctx.addInitScript(e => { if (!sessionStorage.getItem('__seeded')) { Object.keys(e).forEach(k => localStorage.setItem(k, e[k])); sessionStorage.setItem('__seeded', '1'); } }, ELEC);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/favicon|fonts\.g/.test(m.text())) errors.push(m.text()); });
  page.on('dialog', d => d.dismiss());
  await page.goto(URL0 + 'index.html', { waitUntil: 'load' });
  await page.waitForFunction(() => typeof computeWork === 'function' && document.querySelector('#view-home.active'));
  const shot = async n => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, n + '.png') }); };
  const yes = async () => { await page.waitForSelector('#appConfirmModal.open'); await page.click('#appConfirmYesBtn'); await page.waitForTimeout(150); };
  await page.evaluate(() => { const u = document.getElementById('updateDialog'); u && u.classList.remove('open'); });
  await shot('01-home');

  console.log('\nاستقلال التطبيق عن «حساباتي» للكهرباء');
  const iso = await page.evaluate(() => ({ count: appData.invoices.length, names: appData.invoices.map(i => i.clientName), cust: customers.length }));
  check('مفيش أي مشروع أو عميل اتقرا من بيانات الكهرباء', iso.count === 1 && !iso.names.includes('عميل كهرباء') && iso.cust === 0, iso);

  console.log('\nاختبار الحائط: 5 × 3 − باب 1×2.2 − شباك 1.2×1.2 بسعر 40');
  const wall = await page.evaluate(() => computeWork(normWork({ type: 'wall', length: 5, height: 3, price: 40, openings: [{ kind: 'door', w: 1, h: 2.2 }, { kind: 'window', w: 1.2, h: 1.2 }] })));
  check('المساحة الإجمالية = 15 م²', near(wall.gross, 15), wall.gross);
  check('خصم الباب والشباك = 3.64 م²', near(wall.deduct, 3.64), wall.deduct);
  check('صافي المساحة = 11.36 م²', near(wall.net, 11.36), wall.net);
  check('الإجمالي = 454.40', near(wall.total, 454.4), wall.total);

  console.log('\nسياسات الخصم وخصائص الحائط');
  const pol = await page.evaluate(() => {
    const w = o => computeWork(normWork(Object.assign({ type: 'wall', length: 5, height: 3, price: 1 }, o)));
    return {
      none: w({ openings: [{ kind: 'door', w: 1, h: 2.2, policy: 'none' }] }).net,
      pct: w({ openings: [{ kind: 'door', w: 1, h: 2.2, policy: 'percent', value: 50 }] }).deduct,
      fixed: w({ openings: [{ kind: 'door', w: 1, h: 2.2, count: 2, policy: 'fixed', value: 1.5 }] }).deduct,
      minArea: w({ minArea: 2, openings: [{ kind: 'door', w: 1, h: 2.2 }, { kind: 'window', w: 1.2, h: 1.2 }] }).deduct,
      faces: w({ faces: 2, openings: [{ kind: 'door', w: 1, h: 2.2 }] }),
      parts: w({ parts: 3 }).gross,
      segs: w({ segments: [{ length: 4, height: 3, on: true }, { length: 2, height: 3, on: false }, { length: 1, height: 2, on: true }] }).gross,
      neg: w({ length: -5, height: 3 }).total,
      over: w({ length: 1, height: 1, openings: [{ kind: 'door', w: 1, h: 2.2 }] }).net,
      reveal: w({ reveals: true, price: 10, openings: [{ kind: 'door', w: 1, h: 2, depth: 0.2 }] })
    };
  });
  check('عدم الخصم: الصافي 15', near(pol.none, 15), pol.none);
  check('خصم نسبة 50%: 1.1 م²', near(pol.pct, 1.1), pol.pct);
  check('خصم مساحة محددة 1.5 × 2 باب = 3 م²', near(pol.fixed, 3), pol.fixed);
  check('تجاهل الفتحات الأصغر من 2 م²: يخصم الباب بس 2.2', near(pol.minArea, 2.2), pol.minArea);
  check('الوشين: 30 م² − 4.4 = 25.6', near(pol.faces.gross, 30) && near(pol.faces.net, 25.6), [pol.faces.gross, pol.faces.net]);
  check('عدد الأجزاء 3: 45 م²', near(pol.parts, 45), pol.parts);
  check('حساب أجزاء محددة فقط: 12 + 2 = 14 م²', near(pol.segs, 14), pol.segs);
  check('منع القيم السالبة: الإجمالي 0', pol.neg === 0, pol.neg);
  check('خصومات أكبر من الحائط: الصافي 0 مش بالسالب', pol.over === 0, pol.over);
  check('جوانب الفتحات بند مستقل: (2×2 + 1) × 0.2 = 1 م² × 10', near(pol.reveal.revealArea, 1) && near(pol.reveal.revealTotal, 10) && pol.reveal.lines.length === 2, [pol.reveal.revealArea, pol.reveal.lines.length]);

  console.log('\nاختبار الغرفة: 4 × 3 × 3');
  const room = await page.evaluate(() => {
    const r = o => computeWork(normWork(Object.assign({ type: 'room', length: 4, width: 3, height: 3, price: 1 }, o)));
    return { full: r({}), noCeil: r({ ceiling: false }), wall2off: r({ ceiling: false, walls: [{}, { on: false }, {}, {}] }), custom: r({ ceiling: false, walls: [{ length: 5 }, {}, {}, {}] }), sepCeil: r({ price: 10, ceilingPrice: 6 }) };
  });
  check('مساحة الحوائط = 42 م²', near(room.full.gross, 42), room.full.gross);
  check('مساحة السقف = 12 م²', near(room.full.ceilingArea, 12), room.full.ceilingArea);
  check('الإجمالي قبل الخصم = 54 م²', near(room.full.mainQty, 54), room.full.mainQty);
  check('بدون السقف = 42 م²', near(room.noCeil.mainQty, 42), room.noCeil.mainQty);
  check('استبعاد حائط (العرض): 33 م²', near(room.wall2off.mainQty, 33), room.wall2off.mainQty);
  check('تعديل طول حائط واحد لـ 5: 45 م²', near(room.custom.mainQty, 45), room.custom.mainQty);
  check('سعر سقف مختلف: 42×10 + 12×6 = 492', near(room.sepCeil.total, 492), room.sepCeil.total);

  console.log('\nالسقف والمتر الطولي والقطعة والمراحل');
  const misc = await page.evaluate(() => ({
    ceil: computeWork(normWork({ type: 'ceiling', price: 1, cparts: [{ length: 4, width: 3 }, { length: 2, width: 1.5 }] })).total,
    lin: computeWork(normWork({ type: 'linear', qty: 12.5, price: 30 })).total,
    piece: computeWork(normWork({ type: 'piece', qty: 4, price: 250 })).total,
    sqm: computeWork(normWork({ type: 'sqm', qty: 20, price: 35 })).total,
    stages: computeWork(normWork({ type: 'sqm', qty: 10, stages: [{ name: 'المعجون الأول', price: 15 }, { name: 'الصنفرة', price: 5 }] })),
    dup: (() => { const inv = { works: [normWork({ type: 'sqm', qty: 10, name: 'المعجون الأول' })] }; return findStageConflicts(normWork({ type: 'sqm', qty: 10, name: 'المعجون الأول' }), inv, -1).length; })(),
    noDup: (() => { const inv = { works: [normWork({ type: 'sqm', qty: 10, name: 'المعجون الأول' })] }; return findStageConflicts(normWork({ type: 'sqm', qty: 7, name: 'الصنفرة' }), inv, -1).length; })()
  }));
  check('سقف بجزأين: 12 + 3 = 15 م²', near(misc.ceil, 15), misc.ceil);
  check('المتر الطولي: 12.5 × 30 = 375', near(misc.lin, 375), misc.lin);
  check('بالقطعة: 4 × 250 = 1000', near(misc.piece, 1000), misc.piece);
  check('المتر المربع: 20 × 35 = 700', near(misc.sqm, 700), misc.sqm);
  check('تسعير بالمراحل: سعر المتر 20 × 10 = 200', near(misc.stages.unitPrice, 20) && near(misc.stages.total, 200), [misc.stages.unitPrice, misc.stages.total]);
  check('تنبيه نفس المرحلة على نفس المساحة', misc.dup === 1, misc.dup);
  check('مفيش تنبيه لمرحلة مختلفة', misc.noDup === 0, misc.noDup);

  console.log('\nدهان الأبواب والشبابيك والإضافات بالمقطوعية داخل الغرفة');
  const extra = await page.evaluate(() => computeWork(normWork({ type: 'room', length: 4, width: 3, height: 3, price: 10,
    openings: [{ kind: 'door', w: 1, h: 2.2, paint: 'duco', paintPrice: 500 }, { kind: 'door', w: 1.5, h: 2.4, paint: 'duco', lump: true, lumpPrice: 1500 }, { kind: 'window', w: 1.2, h: 1.2, count: 2, paint: 'lacquer', paintPrice: 300 }],
    extras: [{ name: 'جنب ديكوري', price: 800 }, { name: 'سقف ديكوري (جبس بورد)', price: 2500 }] })));
  check('خصم الفتحات من الحوائط: 42 − 8.68 + سقف 12 = 45.32 م² × 10', near(extra.mainQty, 45.32) && near(extra.mainTotal, 453.2), [extra.mainQty, extra.mainTotal]);
  check('دهان الأبواب والشبابيك: 500 + مقطوعية 1500 + 2 × 300 = 2,600', near(extra.paintTotal, 2600), extra.paintTotal);
  check('إضافات بالمقطوعية: جنب 800 + سقف ديكوري 2500 = 3,300', near(extra.extrasTotal, 3300), extra.extrasTotal);
  check('إجمالي الغرفة = 453.2 + 2600 + 3300 = 6,353.2 في 6 سطور', near(extra.total, 6353.2) && extra.lines.length === 6, [extra.total, extra.lines.length]);
  const keyed = await page.evaluate(() => settings.priceLists[0].items.filter(i => /^(door|window):/.test(i.key || '')).map(i => i.name));
  check('قائمة الأسعار فيها باب/شباك لاكيه ودوكو وأوستور', keyed.length === 6 && keyed.includes('باب أوستور'), keyed);

  console.log('\nالسقف الديكوري والجبسون بورد والديكور بالمتر الطولي');
  const deco = await page.evaluate(() => {
    const R = o => computeWork(normWork(Object.assign({ type: 'room', length: 4, width: 3, height: 3, price: 40 }, o)));
    return {
      decor: R({ ceilingType: 'decor', ceilingPrice: 150 }),
      same: R({ ceilingType: 'normal' }),
      own: R({ ceilingType: 'normal', ceilingOwn: true, ceilingPrice: 60 }),
      none: R({ ceilingType: 'none' }),
      size: R({ ceilingType: 'normal', ceilCustom: true, ceilL: 3.4, ceilW: 2.6 }),
      gypWall: R({ ceilingType: 'none', gypsum: [{ name: 'جبسون بورد', width: 0.7, length: 12, factor: 2 }] }),
      gypOwn: R({ ceilingType: 'none', gypsum: [{ name: 'جبسون بورد', width: 0.7, length: 12, factor: 1.5, own: true, price: 100 }] }),
      lin: R({ ceilingType: 'none', linears: [{ name: 'كورنيشة', length: 14, price: 35 }] }),
      old: computeWork(normWork({ type: 'room', length: 4, width: 3, height: 3, price: 10, ceilingPrice: 6 })).total,
      keys: settings.priceLists[0].items.filter(i => i.key).map(i => i.key)
    };
  });
  check('سقف ديكوري: الحوائط 42 × 40 = 1,680 + السقف 12 × 150 = 1,800 → 3,480', near(deco.decor.mainTotal, 1680) && near(deco.decor.ceilingTotal, 1800) && near(deco.decor.total, 3480) && deco.decor.lines.length === 2, [deco.decor.mainTotal, deco.decor.ceilingTotal, deco.decor.total]);
  check('سقف عادي بنفس سعر الحوائط: 54 م² × 40 = 2,160 في سطر واحد', near(deco.same.total, 2160) && deco.same.lines.length === 1, deco.same.total);
  check('سقف عادي بسعر خاص 60: 1,680 + 720 = 2,400', near(deco.own.total, 2400), deco.own.total);
  check('بدون سقف: 42 × 40 = 1,680', near(deco.none.total, 1680), deco.none.total);
  check('مقاس سقف مختلف 3.4 × 2.6 = 8.84 → 50.84 م²', near(deco.size.mainQty, 50.84), deco.size.mainQty);
  check('جبسون 0.7 × 12 = 8.4 م² × مضاعفة 2 = 16.8 م² × سعر الحوائط 40 = 672', near(deco.gypWall.gypsumTotal, 672) && near(deco.gypWall.total, 1680 + 672), [deco.gypWall.gypsumTotal]);
  check('جبسون بسعر خاص: 8.4 × 1.5 = 12.6 م² × 100 = 1,260', near(deco.gypOwn.gypsumTotal, 1260), deco.gypOwn.gypsumTotal);
  check('كورنيشة 14 م.ط × 35 = 490', near(deco.lin.linearTotal, 490) && near(deco.lin.total, 1680 + 490), deco.lin.linearTotal);
  check('المشاريع القديمة (سعر سقف مختلف) حسابها زي ما هو: 492', near(deco.old, 492), deco.old);
  check('قائمة الأسعار فيها السقف الديكوري والديكور الطولي والجبسون', ['ceiling:decor', 'linear:decor', 'gypsum'].every(k => deco.keys.includes(k)), deco.keys);

  console.log('\nاختبار اليومية: 3 عمال × 400 × 5 أيام');
  const day = await page.evaluate(() => ({
    work: computeWork(normWork({ type: 'day', count: 3, qty: 5, price: 400 })).total,
    worker: workerCalc({ count: 3, wage: 400, days: 5, otHours: 0, otRate: 0, advances: 0, deductions: 0, paidOut: 0 }),
    worker2: workerCalc({ count: 1, wage: 400, days: 5, otHours: 4, otRate: 50, advances: 300, deductions: 100, paidOut: 0 })
  }));
  check('بند يومية = 6,000', near(day.work, 6000), day.work);
  check('أجر العمال = 6,000', near(day.worker.net, 6000), day.worker);
  check('اليومية × الأيام + الإضافي − السلف − الخصومات = 2000 + 200 − 300 − 100 = 1800', near(day.worker2.net, 1800), day.worker2.net);

  console.log('\nواجهة المستخدم: إضافة حائط من نافذة البند');
  await page.click('#navPlus'); await page.click('#cMeasure');
  await page.waitForSelector('body.in-editor');
  await page.click('#stepBtn-rooms');
  await page.click('#worksAddBtn');
  await page.waitForSelector('#workSheet.open');
  await page.selectOption('#wType', 'wall');
  await page.selectOption('#wNameSel', '__other');
  await page.fill('#wName', 'حائط الصالة');
  await page.fill('#wGeo input[data-k="length"]', '5');
  await page.fill('#wGeo input[data-k="height"]', '3');
  await page.click('[data-act="addOpening"][data-kind="door"]');
  await page.click('[data-act="addOpening"][data-kind="window"]');
  await page.fill('#wPrice', '40');
  const live = await page.textContent('#wLiveTotal');
  check('الحاسبة المباشرة بتعرض 454.4', live.includes('454.4'), live);
  await page.selectOption('#wOpenings select[data-i="0"][data-k="paint"]', 'duco');
  await page.fill('#wOpenings input[data-i="0"][data-k="paintPrice"]', '500');
  const live2 = await page.textContent('#wLiveTotal');
  check('باب دوكو بـ 500: الإجمالي 954.4', live2.includes('954.4'), live2);
  await page.click('[data-act="addExtra"]');
  await page.selectOption('#wExtras select[data-i="0"][data-k="name"]', 'جنب ديكوري');
  await page.fill('#wExtras input[data-i="0"][data-k="price"]', '700');
  const live3 = await page.textContent('#wLiveTotal');
  check('جنب ديكوري مقطوعية 700: الإجمالي 1,654.4', live3.includes('1,654.4'), live3);
  await shot('02-wall-sheet');
  await page.click('#saveWorkBtn');
  await page.waitForTimeout(400);
  const ui = await page.evaluate(() => ({ n: getCurrentInvoice().works.length, total: computeInvoice(getCurrentInvoice()).worksTotal, duco: settings.priceLists[0].items.find(i => i.key === 'door:duco').price }));
  check('البند اتحفظ في المشروع بإجمالي 1,654.4', ui.n === 1 && near(ui.total, 1654.4), ui);
  check('سعر باب الدوكو (500) اتسجل في قائمة الأسعار من أول مرة', ui.duco === 500, ui.duco);
  await page.evaluate(() => openWorkSheet(null, 'room'));
  await page.waitForTimeout(200);
  await page.click('[data-act="addOpening"][data-kind="door"]');
  await page.selectOption('#wOpenings select[data-i="0"][data-k="paint"]', 'duco');
  const auto = await page.inputValue('#wOpenings input[data-i="0"][data-k="paintPrice"]');
  check('باب دوكو جديد: السعر بيتملى من القائمة (500)', auto === '500', auto);
  await page.selectOption('#wOpenings select[data-i="0"][data-k="lump"]', '1');
  await page.fill('#wOpenings input[data-i="0"][data-k="lumpPrice"]', '1800');
  const lumpLive = await page.textContent('#wBreak');
  check('باب كبير مقطوعية بسعر خاص 1,800', lumpLive.includes('باب دوكو (مقطوعية)') && lumpLive.includes('1,800'), lumpLive.slice(0, 120));
  await page.selectOption('#wGeo select[data-k="ceilingType"]', 'decor');
  await page.fill('#wGeo input[data-k="ceilingPrice"]', '150');
  await page.click('[data-act="addLin"]');
  await page.fill('#wExtras input[data-arr="linears"][data-k="length"]', '14');
  await page.fill('#wExtras input[data-arr="linears"][data-k="price"]', '35');
  await page.click('[data-act="addGyp"]');
  await page.fill('#wExtras input[data-arr="gypsum"][data-k="width"]', '0.7');
  await page.fill('#wExtras input[data-arr="gypsum"][data-k="length"]', '12');
  const brk = await page.textContent('#wBreak');
  check('نافذة الغرفة: سقف ديكوري + كورنيشة + جبسون بتظهر في الحساب', brk.includes('سقف ديكوري') && brk.includes('كورنيشة') && brk.includes('جبسون بورد'), brk.slice(0, 160));
  await page.click('#saveWorkBtn'); await page.waitForTimeout(400);
  const learned = await page.evaluate(() => { const l = settings.priceLists[0].items; return { decor: l.find(i => i.key === 'ceiling:decor').price, lin: (l.find(i => i.unit === 'م.ط' && i.name === 'كورنيشة') || {}).price }; });
  check('سعر السقف الديكوري (150) والكورنيشة (35) اتسجلوا في قائمة الأسعار', learned.decor === 150 && learned.lin === 35, learned);
  await shot('03-works');

  console.log('\nاختبار المقاولة: 25,000 − عربون 5,000 − دفعة 10,000');
  const contract = await page.evaluate(() => {
    createNewInvoice(false, 'contract');
    const inv = getCurrentInvoice();
    inv.clientName = 'أ. محمود'; inv.contractValue = 25000;
    const c = { id: uid('c_'), name: 'أ. محمود', phone: '01000000000', address: '', note: '', createdAt: Date.now(), entries: [] };
    customers.unshift(c);
    inv.customerId = c.id;
    c.entries.push({ id: uid('e_'), kind: 'payment', amount: 5000, isDeposit: true, date: '2026-11-01', title: '', note: '', createdAt: 1, projectId: inv.id, receiptNo: 1 });
    c.entries.push({ id: uid('e_'), kind: 'payment', amount: 10000, date: '2026-11-10', title: '', note: '', createdAt: 2, projectId: inv.id, receiptNo: 2 });
    saveCustomers(); saveToStorage(); renderAll();
    const t = computeInvoice(inv);
    inv.workers.push({ id: 'k1', name: 'نقاش', trade: 'نقاش', count: 3, wage: 400, days: 5, otHours: 0, otRate: 0, advances: 2000, deductions: 0, paidOut: 1000, note: '' });
    inv.expenses.push({ id: 'x1', title: 'نقل', amount: 500, date: '2026-11-02', note: '' });
    const p = projectProfit(inv);
    return { paid: t.paid, remaining: t.netRemaining, net: t.netContract, p };
  });
  check('المدفوع = 15,000', near(contract.paid, 15000), contract.paid);
  check('المتبقي = 10,000', near(contract.remaining, 10000), contract.remaining);
  check('الإيرادات المحصلة 15,000 والمستحقات 10,000 منفصلة', near(contract.p.collected, 15000) && near(contract.p.receivable, 10000), contract.p);
  check('التكاليف المدفوعة = 2000 + 1000 + 500 = 3,500', near(contract.p.costPaid, 3500), contract.p.costPaid);
  check('صافي الربح النقدي = 15,000 − 3,500 = 11,500 (المستحقات مش ربح)', near(contract.p.cashProfit, 11500), contract.p.cashProfit);
  check('الربح المتوقع = 25,000 − 6,500 = 18,500', near(contract.p.expectedProfit, 18500), contract.p.expectedProfit);

  console.log('\nدرجة اللون وكودها');
  await page.evaluate(() => openNote(null, { projectId: getCurrentInvoice().id }));
  await page.waitForSelector('#noteSheet.open');
  const dirs = await page.evaluate(() => getComputedStyle(document.getElementById('nHex')).direction);
  check('اختيار اللون اتجاهه من الشمال لليمين (الأسهم مش معكوسة)', dirs === 'ltr', dirs);
  await page.fill('#nTitle', 'حوائط الصالة');
  await page.fill('#nHexText', 'efe6d2');
  const pick = await page.inputValue('#nHex');
  check('كتابة الكود بتغيّر اللون', pick === '#efe6d2', pick);
  await page.evaluate(() => { const p = document.getElementById('nHex'); p.value = '#1a3a66'; p.dispatchEvent(new Event('input', { bubbles: true })); });
  const code = await page.inputValue('#nHexText');
  check('اختيار اللون بيكتب الكود', code === '#1A3A66', code);
  await page.evaluate(() => saveNote()); await page.waitForTimeout(300);
  const card = await page.evaluate(() => document.getElementById('projNotesBox').textContent);
  check('الكود ظاهر في كارت الملاحظة', card.includes('#1A3A66'), card.slice(0, 80));
  await page.evaluate(() => openProjectDoc('invoice')); await page.waitForTimeout(200);
  const chip = await page.textContent('#printSheet .inv-pricing');
  check('الكود ظاهر في الفاتورة المطبوعة', chip.includes('#1A3A66'), chip);
  await page.evaluate(() => closeOverlay()); await page.waitForTimeout(150);

  console.log('\nالمستندات PDF');
  for (const type of ['estimate', 'quote', 'invoice', 'final', 'report']) {
    await page.evaluate(t => openProjectDoc(t), type);
    await page.waitForTimeout(250);
    const txt = await page.textContent('#printSheet');
    check(`${type}: فيه رقم المستند ورمز العملة`, /(EST|QT|INV|FIN|RPT)-\d{4}/.test(txt) && txt.includes('ج.م'), txt.slice(0, 80));
    if (type === 'final') check('الختامية فيها سجل الدفعات (عربون)', txt.includes('سجل الدفعات') && txt.includes('عربون'));
    await shot('04-doc-' + type);
    await page.evaluate(() => closeOverlay()); await page.waitForTimeout(150);
  }
  await page.evaluate(() => { const c = customers[0]; openReceiptDoc(c.id, c.entries[0].id); });
  await page.waitForTimeout(250);
  const rc = await page.textContent('#printSheet');
  check('إيصال الاستلام: RC-0001 بمبلغ 5,000', rc.includes('RC-0001') && rc.includes('5,000'), rc.slice(0, 80));
  await shot('05-receipt');
  await page.evaluate(() => closeOverlay()); await page.waitForTimeout(150);
  await page.evaluate(() => openStatementDoc(customers[0].id));
  await page.waitForTimeout(250);
  const stt = await page.textContent('#printSheet');
  check('كشف الحساب: الرصيد 10,000', stt.includes('كشف حساب') && stt.includes('10,000'));
  await page.evaluate(() => closeOverlay()); await page.waitForTimeout(150);

  console.log('\nالعملات: تغيير العملة بدون تحويل المبالغ');
  const before = await page.evaluate(() => getCurrentInvoice().contractValue);
  const curCases = [['SAR', 'ر.س', '25,000'], ['AED', 'د.إ', '25,000'], ['KWD', 'د.ك', '0.333'], ['IQD', 'د.ع', '454'], ['JOD', 'د.أ', '0.333'], ['MAD', 'د.م', '454.4'], ['EGP', 'ج.م', '454.4']];
  for (const [code, sym, sample] of curCases) {
    await page.evaluate(c => setCurrency(c), code);
    await yes();
    const r = await page.evaluate(() => ({ cur: CUR, val: getCurrentInvoice().contractValue, a: fmt(1 / 3), b: fmt(454.4), c: fmt(25000), area: fmtQ(11.36) }));
    const shown = code === 'KWD' || code === 'JOD' ? r.a : code === 'SAR' || code === 'AED' ? r.c : r.b;
    check(`${code}: الرمز ${sym} والقيمة ما اتحولتش والمنازل العشرية صح (${sample})`, r.cur === sym && r.val === before && shown === sample && r.area === '11.36', r);
    await page.evaluate(() => openProjectDoc('invoice'));
    await page.waitForTimeout(120);
    const doc = await page.textContent('#printSheet');
    check(`${code}: العملة ظاهرة في الفاتورة`, doc.includes(sym));
    await page.evaluate(() => closeOverlay()); await page.waitForTimeout(120);
  }
  await page.evaluate(() => { setCurrency('SAR'); });
  await yes();
  const warn = await page.evaluate(() => { const inv = getCurrentInvoice(); renderAll(); return document.getElementById('curWarnBox').textContent; });
  check('تنبيه إن عملة المشروع اتغيرت والمبالغ محتاجة مراجعة', warn.includes('ما اتحولتش'), warn.slice(0, 60));
  await page.evaluate(() => setCurrency('EGP')); await yes();

  console.log('\nالنسخ الاحتياطي والاستعادة');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.evaluate(() => exportBackupJSON())]);
  const backup = JSON.parse(fs.readFileSync(await dl.path(), 'utf8'));
  check('النسخة الكاملة باسم التطبيق المستقل', backup.app === 'hesabaty-painting' && backup.invoices.length === 3 && backup.customers.length === 1, { app: backup.app, n: backup.invoices.length });
  const tmp = path.join(require('os').tmpdir(), 'hpaint-backup-test.json');
  fs.writeFileSync(tmp, JSON.stringify(backup));
  await page.evaluate(() => { appData.invoices = []; customers = []; createNewInvoice(false); saveCustomers(); saveToStorage(); });
  await page.setInputFiles('#importFile', tmp);
  await yes();
  const restored = await page.evaluate(() => ({ n: appData.invoices.length, c: customers.length, rem: computeInvoice(appData.invoices.find(i => i.contractValue === 25000)).netRemaining }));
  check('الاستعادة رجّعت المشاريع والنوتة والمتبقي 10,000', restored.n === 3 && restored.c === 1 && near(restored.rem, 10000), restored);
  const elecFile = path.join(require('os').tmpdir(), 'hesabaty-elec.json');
  fs.writeFileSync(elecFile, JSON.stringify({ app: 'hesabaty', backupVersion: 3, invoices: [{ id: 'inv_9', clientName: 'X', rooms: [] }], customers: [] }));
  await page.setInputFiles('#importFile', elecFile);
  await page.waitForTimeout(250);
  const toast = await page.textContent('#appToast');
  const after = await page.evaluate(() => appData.invoices.length);
  check('رفض استيراد نسخة تطبيق الكهرباء', toast.includes('للكهرباء') && after === 3, toast);

  console.log('\nاستقلال التخزين');
  const keys = await page.evaluate(() => Object.keys(localStorage));
  const elecNow = await page.evaluate(k => Object.keys(k).every(x => localStorage.getItem(x) === k[x]), ELEC);
  check('بيانات الكهرباء على نفس النطاق ما اتغيرتش', elecNow);
  check('كل مفاتيح التطبيق تبدأ بـ hpaint_', keys.filter(k => !(k in ELEC)).every(k => k.startsWith('hpaint_')), keys);
  const caches = await page.evaluate(async () => { try { return await caches.keys(); } catch (e) { return []; } });
  check('أسماء الكاش مستقلة (hpaint-)', caches.every(k => k.startsWith('hpaint-')), caches);

  console.log('\nالعمل بدون إنترنت');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 15000 }).catch(() => {});
  await ctx.setOffline(true);
  await page.reload({ waitUntil: 'load' });
  const off = await page.evaluate(() => ({ ok: typeof computeWork === 'function', n: appData.invoices.length, ctrl: !!navigator.serviceWorker.controller }));
  check('التطبيق بيفتح ويقرا البيانات بدون إنترنت', off.ok && off.n === 3 && off.ctrl, off);
  await ctx.setOffline(false);

  check('مفيش أخطاء JavaScript', errors.length === 0, errors);
  await browser.close();
  srv.close();
  console.log(`\n${passes} نجح · ${failures} فشل`);
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
