/*
 * حساباتي — اختبار تسجيل الدخول بجوجل والنسخ الاحتياطي/الاسترجاع على درايف.
 *   node tests/cloud-backup.e2e.js [http://127.0.0.1:8790/]
 *
 * جوجل نفسها مش متاحة في الاختبار الآلي، فالاختبار بيشغّل نسخة وهمية:
 *  - مكتبة Google Identity Services (gsi/client) بتدّي توكن.
 *  - Google Drive v3 + userinfo في الذاكرة (بنفس شكل الطلبات والردود الحقيقية + CORS).
 * والباقي حقيقي: بيانات الأقسام بتتعمل من واجهاتها، والنسخ والاسترجاع بيمشوا بالكود الحقيقي.
 */
const { chromium } = require('playwright');

const BASE = (process.argv[2] || 'http://127.0.0.1:8790/').replace(/\/?$/, '/');
const LAUNCHER = BASE + 'Main-App/';
const TRADES = [['electrical', 'Electrical'], ['plumbing', 'Plumbing'], ['hvac', 'HVAC'], ['painting', 'Painting'], ['flooring', 'Flooring'], ['gypsum', 'Gypsum'], ['plastering', 'Plastering'], ['metalwork', 'Metalwork'], ['carpentry', 'Carpentry'], ['masonry', 'Masonry'], ['lowcurrent', 'LowCurrent'], ['aluminium', 'Aluminium'], ['marble', 'Marble'], ['automotive', 'Automotive']];
let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) { passed++; console.log('  ✔ ' + n); } else { failed++; console.log('  ✘ ' + n + (x !== undefined ? '  → ' + JSON.stringify(x).slice(0, 400) : '')); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
// زرار الثيم جوه كل قسم (المحارة بتستخدم data-act بدل id)
const themeSel = '#themeBtn, [data-act="toggleTheme"]';

/* ---------------- جوجل الوهمية ---------------- */
const USER = { sub: '1001', name: 'محمد التجربة', given_name: 'محمد', email: 'test.user@example.com', picture: '' };
const drive = { files: new Map(), seq: 0, tokens: new Set(), requests: [] };
const GSI_STUB = `window.google = { accounts: { oauth2: {
  initTokenClient(cfg) { return { requestAccessToken(o) {
    window.__gsi = (window.__gsi || []).concat([o || {}]);
    setTimeout(() => { const t = 'tok-' + Math.random().toString(36).slice(2); fetch('https://www.googleapis.com/__mint/' + t, { method: 'POST' }).then(() => cfg.callback({ access_token: t, expires_in: 3600, scope: cfg.scope })); }, 30);
  } }; },
  hasGrantedAllScopes(r, s) { return String(r.scope).split(' ').includes(s); },
  revoke(t, cb) { cb && cb(); }
} } };`;
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS' };
const json = (route, status, body) => route.fulfill({ status, headers: { ...CORS, 'Content-Type': 'application/json' }, body: body === undefined ? '' : JSON.stringify(body) });

async function googleApis(route) {
  const req = route.request();
  const url = new URL(req.url());
  const m = req.method();
  if (m === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
  if (url.pathname.startsWith('/__mint/')) { drive.tokens.add(url.pathname.slice(8)); return json(route, 200, {}); }
  const auth = (req.headers()['authorization'] || '').replace('Bearer ', '');
  if (!drive.tokens.has(auth)) return json(route, 401, { error: 'invalid token' });
  drive.requests.push(m + ' ' + url.pathname);
  if (url.pathname === '/oauth2/v3/userinfo') return json(route, 200, USER);
  if (url.pathname === '/drive/v3/files' && m === 'GET') {
    const q = url.searchParams.get('q') || '';
    let list = [...drive.files.values()].filter(f => !f.trashed);
    const fm = q.match(/mimeType='([^']+)' and name='([^']+)'/);
    if (fm) list = list.filter(f => f.mimeType === fm[1] && f.name === fm[2]);
    const pm = q.match(/'([^']+)' in parents/);
    if (pm) list = list.filter(f => (f.parents || []).includes(pm[1]));
    // كل شروط appProperties زي درايف الحقيقي
    for (const [, k, v] of q.matchAll(/appProperties has \{ key='([^']+)' and value='([^']*)' \}/g)) list = list.filter(f => (f.appProperties || {})[k] === v);
    list.sort((a, b) => b.createdTime.localeCompare(a.createdTime));
    return json(route, 200, { files: list.map(f => ({ id: f.id, name: f.name, createdTime: f.createdTime, size: String(f.content ? Buffer.byteLength(f.content) : 0), appProperties: f.appProperties })) });
  }
  if (url.pathname === '/drive/v3/files' && m === 'POST') {
    const meta = JSON.parse(req.postData());
    const f = { id: 'f' + (++drive.seq), createdTime: new Date(Date.now() + drive.seq).toISOString(), ...meta };
    drive.files.set(f.id, f); return json(route, 200, { id: f.id });
  }
  if (url.pathname === '/upload/drive/v3/files' && m === 'POST') {
    const ct = req.headers()['content-type'];
    const boundary = ct.split('boundary=')[1];
    const parts = req.postData().split('--' + boundary).filter(p => p.trim() && p.trim() !== '--');
    const body = p => p.slice(p.indexOf('\r\n\r\n') + 4).replace(/\r\n$/, '');
    const meta = JSON.parse(body(parts[0]));
    const f = { id: 'f' + (++drive.seq), createdTime: new Date(Date.now() + drive.seq).toISOString(), ...meta, content: body(parts[1]) };
    drive.files.set(f.id, f);
    return json(route, 200, { id: f.id, name: f.name, createdTime: f.createdTime, size: String(Buffer.byteLength(f.content)) });
  }
  const fm = url.pathname.match(/^\/drive\/v3\/files\/([^/]+)$/);
  if (fm && m === 'GET' && url.searchParams.get('alt') === 'media') {
    const f = drive.files.get(decodeURIComponent(fm[1]));
    if (!f) return json(route, 404, {});
    return route.fulfill({ status: 200, headers: { ...CORS, 'Content-Type': 'application/json' }, body: f.content });
  }
  if (fm && m === 'DELETE') { drive.files.delete(decodeURIComponent(fm[1])); return route.fulfill({ status: 204, headers: CORS }); }
  return json(route, 400, { error: 'unhandled ' + m + ' ' + url.pathname });
}

async function device(browser, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  await ctx.route('https://accounts.google.com/gsi/client', r => r.fulfill({ status: 200, contentType: 'text/javascript', body: GSI_STUB }));
  await ctx.route('https://www.googleapis.com/**', googleApis);
  // الاختبار بيستخدم معرّف وهمي (أو فاضي لاختبار "قبل الإعداد") بدل المعرّف الحقيقي
  await ctx.route(LAUNCHER + 'config.js', async r => {
    const res = await r.fetch();
    const id = opts.configured === false ? '' : 'test-client.apps.googleusercontent.com';
    const body = (await res.text()).replace(/googleClientId: '[^']*'/, `googleClientId: '${id}'`);
    r.fulfill({ response: res, body });
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) errors.push('console: ' + m.text()); });
  return { ctx, page, errors };
}
async function frameOf(page) {
  const h = await page.waitForSelector('#frameHost iframe', { timeout: 15000 });
  const f = await h.contentFrame(); await f.waitForLoadState('load');
  await page.waitForFunction(() => document.getElementById('frameLoading').hidden, null, { timeout: 15000 });
  await sleep(700); return f;
}
const toastText = page => page.textContent('#toast');
const waitToast = (page, re, ms = 10000) => page.waitForFunction(r => new RegExp(r).test(document.getElementById('toast').textContent), re.source, { timeout: ms });
const sectionData = page => page.evaluate(() => {
  const pre = ['ahmed_elec_', 'hesabaty_', 'hesabati_plumbing_', 'hesabati_hvac_', 'hpaint_', 'hflooring_', 'hgyp_', 'hplaster_', 'hmetal_', 'hcarp_', 'hmas_', 'hlow_', 'halu_', 'hmar_', 'hauto_'];
  return Object.fromEntries(Object.keys(localStorage).filter(k => pre.some(p => k.startsWith(p))).sort().map(k => [k, localStorage.getItem(k)]));
});
const idbMedia = (page, name) => page.evaluate(n => new Promise(res => {
  const r = indexedDB.open(n, 1);
  r.onupgradeneeded = () => r.result.createObjectStore('media');
  r.onsuccess = () => { const db = r.result; const tx = db.transaction('media', 'readonly'); const out = []; const c = tx.objectStore('media').openCursor(); c.onsuccess = () => { if (c.result) { out.push([c.result.key, c.result.value]); c.result.continue(); } }; tx.oncomplete = () => { db.close(); res(out); }; };
}), name);

(async () => {
  const browser = await chromium.launch();

  /* ---------- 0) من غير إعداد معرّف جوجل ---------- */
  console.log('\n[0] قبل إعداد معرّف جوجل');
  {
    const { ctx, page, errors } = await device(browser, { configured: false });
    await page.goto(LAUNCHER); await sleep(600);
    await page.click('#cloudCard [data-act="signin"]'); await sleep(300);
    check('زرار جوجل بيقول إن الخدمة هتتفعل قريباً (من غير أخطاء)', /قريباً/.test(await toastText(page)) && errors.length === 0, { toast: await toastText(page), errors });
    await ctx.close();
  }

  /* ---------- 1) الجهاز الأول: بيانات حقيقية + تسجيل دخول + نسخة ---------- */
  console.log('\n[1] الجهاز الأول: بيانات + تسجيل دخول + نسخة احتياطية');
  const A = await device(browser);
  await A.page.goto(LAUNCHER); await sleep(500);
  // بيانات من واجهة كل قسم: تغيير الثيم جوه القسم (بيتحفظ في إعدادات القسم نفسه)
  const themes = {};
  for (const [id] of TRADES) {
    await A.page.goto(LAUNCHER + '#' + id);
    const f = await frameOf(A.page);
    await f.click(themeSel); await sleep(350);
    themes[id] = await f.evaluate(() => document.documentElement.getAttribute('data-theme'));
  }
  await A.page.goto(LAUNCHER); await sleep(500);
  // بيانات أعمال تجريبية بمفاتيح الأقسام + صورة في قاعدة صور التكييف + مفتاح غريب ما يخصش الأقسام
  await A.page.evaluate(() => new Promise(res => {
    localStorage.setItem('hpaint_notes_v1', JSON.stringify([{ id: 'n1', text: 'لون الصالة: 7042 رمادي' }]));
    localStorage.setItem('hgyp_db_v1_probe_extra', JSON.stringify({ projects: [{ name: 'فيلا التجمع', total: 125000 }] }));
    localStorage.setItem('someone_else_key', 'لا تلمسني');
    const r = indexedDB.open('hesabati_hvac_media', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('media');
    r.onsuccess = () => { const db = r.result; const tx = db.transaction('media', 'readwrite'); tx.objectStore('media').put('data:image/jpeg;base64,/9j/AAAA', 'img-1'); tx.objectStore('media').put('data:image/png;base64,iVBORw0', 'img-2'); tx.oncomplete = () => { db.close(); res(); }; };
  }));
  const dataA = await sectionData(A.page);
  const mediaA = await idbMedia(A.page, 'hesabati_hvac_media');
  check('الجهاز الأول فيه بيانات من الأقسام الـ 14', ['ahmed_elec_', 'hesabaty_', 'hesabati_plumbing_', 'hesabati_hvac_', 'hpaint_', 'hflooring_', 'hgyp_', 'hplaster_', 'hmetal_', 'hcarp_', 'hmas_', 'hlow_', 'halu_', 'hmar_', 'hauto_'].filter(p => Object.keys(dataA).some(k => k.startsWith(p))).length >= 14, Object.keys(dataA));

  await A.page.click('#cloudCard [data-act="signin"]');
  await waitToast(A.page, /اتسجل دخولك/);
  await sleep(600);
  check('تسجيل الدخول: الترحيب باسم المستخدم', (await A.page.textContent('#greet')).includes('محمد'));
  check('كارت الحساب بيعرض الاسم وزرار النسخ', (await A.page.textContent('#cloudCard')).includes('محمد التجربة') && !!(await A.page.$('#cloudCard [data-act="backup"]')));
  check('بيانات الحساب المحفوظة: الاسم والإيميل بس (من غير توكن)', await A.page.evaluate(() => { const a = JSON.parse(localStorage.getItem('hisabati_super_account_v1')); return a.email === 'test.user@example.com' && !JSON.stringify(a).includes('tok-'); }));
  check('أول طلب بيطلب الموافقة (consent)', (await A.page.evaluate(() => window.__gsi[0].prompt)) === 'consent');

  await A.page.click('#cloudCard [data-act="backup"]');
  await waitToast(A.page, /اتحفظت نسخة/, 15000);
  const files = [...drive.files.values()];
  const folder = files.find(f => f.mimeType === 'application/vnd.google-apps.folder');
  const bk = files.find(f => (f.appProperties || {}).hisabati === 'backup');
  check('اتعمل فولدر "أرزقي | Arzoqi — نسخ احتياطية" على درايف', !!folder && folder.name === 'أرزقي | Arzoqi — نسخ احتياطية');
  check('ملف النسخة جوه الفولدر باسم واضح', !!bk && bk.parents[0] === folder.id && /^hisabati-backup-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}\.json$/.test(bk.name), bk && bk.name);
  const snap = JSON.parse(bk.content);
  check('النسخة فيها كل مفاتيح الأقسام بنفس القيم بالظبط', JSON.stringify(Object.fromEntries(Object.entries(snap.localStorage).sort())) === JSON.stringify(dataA));
  check('النسخة فيها صور التكييف', JSON.stringify(snap.indexedDB.hesabati_hvac_media) === JSON.stringify(mediaA));
  check('النسخة ما فيهاش مفاتيح غريبة ولا مفاتيح الواجهة/الحساب', !('someone_else_key' in snap.localStorage) && !Object.keys(snap.localStorage).some(k => k.startsWith('hisabati_super_')));
  check('كارت الحساب: "آخر نسخة احتياطية دلوقتي"', (await A.page.textContent('#cloudCard')).includes('آخر نسخة احتياطية'));

  await A.page.click('#cloudCard [data-act="open-account"]'); await sleep(900);
  check('شاشة الحساب بتعرض النسخة المحفوظة', (await A.page.$$('#accountBody .bk')).length === 1);
  check('مفيش أخطاء على الجهاز الأول', A.errors.length === 0, A.errors);
  await A.ctx.close();

  /* ---------- 2) جهاز جديد فاضي: تسجيل دخول ← استرجاع ---------- */
  console.log('\n[2] جهاز جديد: تسجيل دخول واسترجاع');
  const B = await device(browser);
  await B.page.goto(LAUNCHER); await sleep(500);
  await B.page.evaluate(() => localStorage.setItem('someone_else_key', 'بتاع الجهاز التاني'));
  check('الجهاز الجديد فاضي', Object.keys(await sectionData(B.page)).length === 0);
  await B.page.click('#cloudCard [data-act="signin"]');
  await B.page.waitForSelector('#confirm:not([hidden])', { timeout: 10000 });
  check('بعد الدخول على جهاز فاضي: بيعرض استرجاع آخر نسخة', (await B.page.textContent('#confirmTitle')).includes('لقينا نسخة'));
  await Promise.all([B.page.waitForNavigation({ timeout: 20000 }), B.page.click('#confirmYes')]);
  await sleep(1000);
  const dataB = await sectionData(B.page);
  check('كل بيانات الأقسام رجعت بنفس القيم بالظبط', JSON.stringify(dataB) === JSON.stringify(dataA), { a: Object.keys(dataA).length, b: Object.keys(dataB).length });
  check('صور التكييف رجعت', JSON.stringify(await idbMedia(B.page, 'hesabati_hvac_media')) === JSON.stringify(mediaA));
  check('المفتاح الغريب على الجهاز الجديد ما اتلمسش', (await B.page.evaluate(() => localStorage.getItem('someone_else_key'))) === 'بتاع الجهاز التاني');
  for (const [id] of TRADES) {
    await B.page.goto(LAUNCHER + '#' + id);
    const f = await frameOf(B.page);
    const th = await f.evaluate(() => document.documentElement.getAttribute('data-theme'));
    check(`${id}: القسم بيفتح بإعداداته المسترجعة`, th === themes[id], { th, expected: themes[id] });
  }

  /* ---------- 3) التراجع عن الاسترجاع ---------- */
  console.log('\n[3] التراجع عن آخر استرجاع');
  await B.page.goto(LAUNCHER); await sleep(600);
  await B.page.click('#accountBtn'); await sleep(700);
  check('شاشة الحساب بتعرض "تراجع"', !!(await B.page.$('#accountBody [data-act="undo"]')));
  await B.page.click('#accountBody [data-act="undo"]');
  await B.page.waitForSelector('#confirm:not([hidden])');
  await Promise.all([B.page.waitForNavigation({ timeout: 20000 }), B.page.click('#confirmYes')]);
  await sleep(900);
  check('التراجع رجّع الجهاز زي ما كان (فاضي)', Object.keys(await sectionData(B.page)).length === 0);
  check('صور التكييف اتشالت بالتراجع', (await idbMedia(B.page, 'hesabati_hvac_media')).length === 0);
  check('المفتاح الغريب لسه زي ما هو', (await B.page.evaluate(() => localStorage.getItem('someone_else_key'))) === 'بتاع الجهاز التاني');

  /* ---------- 4) استرجاع يدوي من القائمة + حذف + خروج ---------- */
  console.log('\n[4] استرجاع من القائمة، حذف، وتسجيل خروج');
  await B.page.click('#accountBtn'); await sleep(500);
  await B.page.click('#accountBody [data-act="load"]');
  await B.page.waitForSelector('#accountBody .bk', { timeout: 10000 });
  await B.page.click('#accountBody [data-restore]');
  await B.page.waitForSelector('#confirm:not([hidden])');
  await Promise.all([B.page.waitForNavigation({ timeout: 20000 }), B.page.click('#confirmYes')]);
  await sleep(900);
  check('الاسترجاع اليدوي من القائمة شغال', JSON.stringify(await sectionData(B.page)) === JSON.stringify(dataA));
  await B.page.click('#accountBtn'); await sleep(500);
  await B.page.click('#accountBody [data-act="load"]');
  await B.page.waitForSelector('#accountBody .bk', { timeout: 10000 });
  await B.page.click('#accountBody [data-delete]');
  await B.page.waitForSelector('#confirm:not([hidden])');
  await B.page.click('#confirmYes'); await sleep(900);
  check('حذف النسخة من درايف', ![...drive.files.values()].some(f => (f.appProperties || {}).hisabati === 'backup') && /مفيش نسخ/.test(await B.page.textContent('#accountBody')));
  await B.page.click('#accountBody [data-act="signout"]');
  await B.page.waitForSelector('#confirm:not([hidden])');
  await B.page.click('#confirmYes'); await sleep(500);
  check('تسجيل الخروج: الحساب اتشال وبيانات الجهاز فضلت', !(await B.page.evaluate(() => localStorage.getItem('hisabati_super_account_v1'))) && Object.keys(await sectionData(B.page)).length === Object.keys(dataA).length);
  await B.page.keyboard.press('Escape'); await sleep(400);
  check('بعد الخروج: زرار تسجيل الدخول رجع', !!(await B.page.$('#cloudCard [data-act="signin"]')));

  /* ---------- 5) حماية: ملف مش نسخة حساباتي ---------- */
  console.log('\n[5] حماية من ملف غلط');
  const bad = await B.page.evaluate(async () => {
    const out = [];
    for (const s of [{ format: 'x' }, { format: 'hisabati-super-backup', formatVersion: 1, localStorage: { someone_else_key: 'x' } }, { format: 'hisabati-super-backup', formatVersion: 1, localStorage: {}, indexedDB: { evil_db: [] } }]) {
      try { await window.HisabatiBackup.restore(s); out.push('accepted'); } catch (e) { out.push(e.message); }
    }
    return out;
  });
  check('الاسترجاع بيرفض الملفات اللي مش نسخة حساباتي أو فيها مفاتيح غريبة', bad.every(x => x !== 'accepted'), bad);
  check('مفيش أخطاء على الجهاز الجديد', B.errors.length === 0, B.errors);
  await B.ctx.close();

  await browser.close();
  console.log(`\nالنتيجة: ${passed} نجح · ${failed} فشل`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
