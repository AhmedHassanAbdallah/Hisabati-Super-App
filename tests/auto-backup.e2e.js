/*
 * أرزقي | Arzoqi — النسخ الاحتياطي التلقائي على جوجل درايف.
 *   node tests/auto-backup.e2e.js [http://127.0.0.1:8790/]
 * جوجل ودرايف وهميين (زي tests/cloud-backup.e2e.js)، وجسر تطبيق الأندرويد متحاكي (التوكن بيتطلب في الخلفية).
 * بيتأكد إن:
 *  - أول فتحة بعد تسجيل الدخول: نسخة تلقائية في الخلفية من غير أي رسالة أو نافذة.
 *  - مرة واحدة في اليوم بس، ومفيش نسخة لو البيانات ما اتغيرتش.
 *  - بيحتفظ بآخر 10 نسخ تلقائية من الجهاز ده بس: النسخ اليدوية ونسخ الأجهزة التانية ما بتتمسحش.
 *  - المفتاح بيقفله، ومن غير نت أو لو جوجل محتاجة موافقة: ولا رسالة ولا نسخة.
 *  - في المتصفح من غير توكن: ما بيفتحش نافذة جوجل لوحده.
 *  - من غير تسجيل دخول: ولا حاجة بتتكتب.
 */
const { chromium } = require('playwright');
const BASE = (process.argv[2] || 'http://127.0.0.1:8790/').replace(/\/?$/, '/');
const LAUNCHER = BASE + 'Main-App/';
let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) { passed++; console.log('  ✔ ' + n); } else { failed++; console.log('  ✘ ' + n + (x !== undefined ? '  → ' + JSON.stringify(x).slice(0, 400) : '')); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));

const USER = { sub: '1001', name: 'محمد التجربة', given_name: 'محمد', email: 'test.user@example.com', picture: '' };
const ACCOUNT = JSON.stringify({ sub: '1001', name: 'محمد التجربة', given: 'محمد', email: 'test.user@example.com', picture: '' });
const drive = { files: new Map(), seq: 0, tokens: new Set(['native-token']), uploads: 0 };
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS' };
const json = (route, status, body) => route.fulfill({ status, headers: { ...CORS, 'Content-Type': 'application/json' }, body: body === undefined ? '' : JSON.stringify(body) });
async function googleApis(route) {
  const req = route.request(); const url = new URL(req.url()); const m = req.method();
  if (m === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
  const auth = (req.headers()['authorization'] || '').replace('Bearer ', '');
  if (!drive.tokens.has(auth)) return json(route, 401, {});
  if (url.pathname === '/oauth2/v3/userinfo') return json(route, 200, USER);
  if (url.pathname === '/drive/v3/files' && m === 'GET') {
    const q = url.searchParams.get('q') || '';
    let list = [...drive.files.values()].filter(f => !f.trashed);
    const fm = q.match(/mimeType='([^']+)' and name='([^']+)'/);
    if (fm) list = list.filter(f => f.mimeType === fm[1] && f.name === fm[2]);
    for (const [, k, v] of q.matchAll(/appProperties has \{ key='([^']+)' and value='([^']*)' \}/g)) list = list.filter(f => (f.appProperties || {})[k] === v);
    list.sort((a, b) => b.createdTime.localeCompare(a.createdTime));
    return json(route, 200, { files: list.map(f => ({ id: f.id, name: f.name, createdTime: f.createdTime, size: '10', appProperties: f.appProperties })) });
  }
  if (url.pathname === '/drive/v3/files' && m === 'POST') {
    const f = { id: 'f' + (++drive.seq), createdTime: new Date(Date.now() + drive.seq).toISOString(), ...JSON.parse(req.postData()) };
    drive.files.set(f.id, f); return json(route, 200, { id: f.id });
  }
  if (url.pathname === '/upload/drive/v3/files' && m === 'POST') {
    const boundary = req.headers()['content-type'].split('boundary=')[1];
    const parts = req.postData().split('--' + boundary).filter(p => p.trim() && p.trim() !== '--');
    const body = p => p.slice(p.indexOf('\r\n\r\n') + 4).replace(/\r\n$/, '');
    const f = { id: 'f' + (++drive.seq), createdTime: new Date(Date.now() + drive.seq).toISOString(), ...JSON.parse(body(parts[0])), content: body(parts[1]) };
    drive.files.set(f.id, f); drive.uploads++;
    return json(route, 200, { id: f.id, name: f.name, createdTime: f.createdTime, size: '10' });
  }
  const fm = url.pathname.match(/^\/drive\/v3\/files\/([^/]+)$/);
  if (fm && m === 'DELETE') { drive.files.delete(decodeURIComponent(fm[1])); return route.fulfill({ status: 204, headers: CORS }); }
  return json(route, 400, {});
}
// جسر تطبيق الأندرويد: التوكن بيرجع من غير أي نافذة، إلا لو الاختبار طلب "محتاج موافقة"
const NATIVE = `window.HisabatiNative = {
  isNative: function () { return true; },
  googleAuthorize: function (id, scopes, interactive) {
    window.__nativeCalls = (window.__nativeCalls || []).concat([interactive]);
    var needConsent = localStorage.getItem('__test_need_consent') === '1';
    setTimeout(function () {
      if (needConsent && !interactive) window.__hisabatiAuthResult(id, null, null, 'consent-required');
      else window.__hisabatiAuthResult(id, 'native-token', scopes, '');
    }, 30);
  }
};`;
const GSI_STUB = `window.google = { accounts: { oauth2: { initTokenClient(cfg) { return { requestAccessToken() { window.__gsiPopups = (window.__gsiPopups || 0) + 1; } }; }, hasGrantedAllScopes() { return true; }, revoke() {} } } };`;

async function device(browser, { native = true } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  if (native) await ctx.addInitScript(NATIVE);
  await ctx.route('https://accounts.google.com/gsi/client', r => r.fulfill({ status: 200, contentType: 'text/javascript', body: GSI_STUB }));
  await ctx.route('https://www.googleapis.com/**', googleApis);
  await ctx.route(LAUNCHER + 'config.js', async r => { const res = await r.fetch(); r.fulfill({ response: res, body: (await res.text()).replace(/googleClientId: '[^']*'/, "googleClientId: 'test-client.apps.googleusercontent.com'") }); });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) errors.push(m.text()); });
  return { ctx, page, errors };
}
const autoFiles = dev => [...drive.files.values()].filter(f => (f.appProperties || {}).auto === '1' && (!dev || f.appProperties.dev === dev));
const yesterday = () => new Date(Date.now() - 26 * 3600000).toISOString();
// "اليوم اللي بعده": آخر نسخة وآخر فحص بقوا امبارح
const nextDay = page => page.evaluate(y => {
  localStorage.setItem('hisabati_super_last_backup_v1', y);
  const s = JSON.parse(localStorage.getItem('hisabati_super_auto_v1') || '{}'); if (s.checkedAt) s.checkedAt = y;
  localStorage.setItem('hisabati_super_auto_v1', JSON.stringify(s));
}, yesterday());
const open = async page => { await page.goto(LAUNCHER); await sleep(5600); };

(async () => {
  const browser = await chromium.launch();

  console.log('\n[1] من غير تسجيل دخول');
  {
    const { ctx, page, errors } = await device(browser);
    await page.goto(LAUNCHER); await page.evaluate(() => localStorage.setItem('hpaint_notes_v1', '[{"t":"تجربة"}]'));
    await open(page);
    check('ولا نسخة اترفعت', drive.uploads === 0);
    check('ما اتكتبش أي مفتاح للنسخ التلقائي', await page.evaluate(() => !localStorage.getItem('hisabati_super_auto_v1') && !localStorage.getItem('hisabati_super_device_v1')));
    check('مفيش طلب توكن', !(await page.evaluate(() => window.__nativeCalls)));
    check('مفيش أخطاء', errors.length === 0, errors);
    await ctx.close();
  }

  console.log('\n[2] مسجل دخول (تطبيق الأندرويد): أول فتحة');
  const { ctx, page, errors } = await device(browser);
  await page.goto(LAUNCHER);
  await page.evaluate(a => { localStorage.setItem('hisabati_super_account_v1', a); localStorage.setItem('hpaint_notes_v1', '[{"t":"لون الصالة"}]'); localStorage.setItem('hgyp_db_v1', '{"projects":[1]}'); }, ACCOUNT);
  await open(page);
  check('نسخة تلقائية اترفعت في الخلفية', drive.uploads === 1 && autoFiles().length === 1, drive.uploads);
  const dev = await page.evaluate(() => localStorage.getItem('hisabati_super_device_v1'));
  check('النسخة متعلّمة «تلقائية» وبرقم الجهاز', !!dev && autoFiles(dev).length === 1);
  check('التوكن اتطلب من غير نافذة (interactive = false)', JSON.stringify(await page.evaluate(() => window.__nativeCalls)) === '[false]', await page.evaluate(() => window.__nativeCalls));
  const snap = JSON.parse(autoFiles()[0].content);
  check('النسخة فيها بيانات الأقسام', snap.localStorage.hpaint_notes_v1 && snap.localStorage.hgyp_db_v1);
  check('ولا رسالة ظهرت', !(await page.evaluate(() => document.getElementById('toast').classList.contains('show'))));
  check('الكارت فيه مفتاح النسخ التلقائي شغال', await page.evaluate(() => { const i = document.querySelector('#cloudCard [data-act="auto-toggle"]'); return !!i && i.checked; }));
  check('الكارت بيقول آخر نسخة', /آخر نسخة احتياطية/.test(await page.textContent('#cloudCard')));

  console.log('\n[3] مرة واحدة في اليوم');
  await open(page);
  check('فتحة تانية نفس اليوم: مفيش نسخة جديدة', drive.uploads === 1, drive.uploads);
  await page.evaluate(() => localStorage.setItem('hpaint_notes_v1', '[{"t":"اتغيرت"}]'));
  await open(page);
  check('حتى لو اتغيرت البيانات: نفس اليوم مفيش تاني', drive.uploads === 1, drive.uploads);

  console.log('\n[4] اليوم اللي بعده');
  await nextDay(page);
  await open(page);
  check('اتغيرت البيانات + يوم جديد: نسخة جديدة', drive.uploads === 2, drive.uploads);
  await nextDay(page);
  await open(page);
  check('يوم جديد من غير أي تغيير: مفيش نسخة', drive.uploads === 2, drive.uploads);
  check('الكارت بيقول «مفيش تغيير من بعدها» ومش بيحذّر', await page.evaluate(() => { const t = document.getElementById('cloudCard'); return /مفيش تغيير من بعدها/.test(t.textContent) && !t.querySelector('.cloud-text .warn'); }), await page.textContent('#cloudCard'));

  console.log('\n[5] آخر 10 نسخ تلقائية من الجهاز ده بس');
  const add = (props, i) => { const f = { id: 'old' + i + Math.random(), name: 'x.json', parents: ['p'], mimeType: 'application/json', createdTime: new Date(Date.now() - (100 - i) * 86400000).toISOString(), appProperties: { hisabati: 'backup', items: '3', device: 'أندرويد', ...props }, content: '{}' }; drive.files.set(f.id, f); };
  for (let i = 0; i < 12; i++) add({ auto: '1', dev }, i);
  add({}, 50);                                  // نسخة يدوية قديمة
  for (let i = 0; i < 3; i++) add({ auto: '1', dev: 'other-phone' }, 60 + i); // موبايل تاني
  await page.evaluate(() => localStorage.setItem('hgyp_db_v1', '{"projects":[1,2]}'));
  await nextDay(page);
  await open(page);
  check('اترفعت نسخة جديدة', drive.uploads === 3, drive.uploads);
  check('فضل 10 نسخ تلقائية بس من الجهاز ده', autoFiles(dev).length === 10, autoFiles(dev).length);
  check('النسخة الجديدة من ضمن العشرة', autoFiles(dev).some(f => (JSON.parse(f.content).localStorage || {}).hgyp_db_v1 === '{"projects":[1,2]}'));
  check('النسخة اليدوية ما اتمسحتش', [...drive.files.values()].some(f => f.appProperties.hisabati === 'backup' && !f.appProperties.auto));
  check('نسخ الموبايل التاني ما اتمسحتش', autoFiles('other-phone').length === 3);

  console.log('\n[6] قائمة النسخ');
  await page.click('#accountBtn'); await sleep(400);
  if (await page.$('#accountBody [data-act="load"]')) await page.click('#accountBody [data-act="load"]'); // لو مفيش توكن لسه
  await page.waitForSelector('#accountBody .bk', { timeout: 10000 });
  check('النسخ التلقائية عليها علامة «تلقائية»', (await page.$$('#accountBody .bk-auto')).length >= 10);
  await page.keyboard.press('Escape'); await sleep(300);

  console.log('\n[7] النسخة اليدوية بتتحسب');
  await nextDay(page);
  await page.evaluate(() => localStorage.setItem('hpaint_notes_v1', '[{"t":"يدوي"}]'));
  await page.goto(LAUNCHER); await sleep(300);
  await page.click('#cloudCard [data-act="backup"]');
  await page.waitForFunction(() => /اتحفظت نسخة/.test(document.getElementById('toast').textContent), null, { timeout: 8000 });
  const afterManual = drive.uploads;
  await sleep(5000);
  check('بعد نسخة يدوية النهارده: التلقائي ما كررش', drive.uploads === afterManual, [afterManual, drive.uploads]);

  console.log('\n[8] قفل المفتاح');
  await page.click('#cloudCard .auto-row'); await sleep(300);
  check('المفتاح اتقفل واتحفظ', await page.evaluate(() => JSON.parse(localStorage.getItem('hisabati_super_auto_v1')).on === false));
  check('الكارت بيقول إنه مقفول', /مقفول/.test(await page.textContent('#cloudCard')));
  await page.evaluate(() => localStorage.setItem('hpaint_notes_v1', '[{"t":"بعد القفل"}]'));
  await nextDay(page); const u8 = drive.uploads;
  await open(page);
  check('مقفول: مفيش نسخة حتى مع تغيير ويوم جديد', drive.uploads === u8);
  await page.click('#cloudCard .auto-row'); await sleep(4000);
  check('فتحه تاني: النسخة اتعملت على طول', drive.uploads === u8 + 1, [u8, drive.uploads]);

  console.log('\n[9] جوجل محتاجة موافقة / من غير نت');
  await page.evaluate(() => { localStorage.setItem('__test_need_consent', '1'); localStorage.setItem('hpaint_notes_v1', '[{"t":"موافقة"}]'); });
  await nextDay(page); const u9 = drive.uploads;
  await open(page);
  check('محتاج موافقة: مفيش نسخة ولا رسالة ولا نافذة', drive.uploads === u9 && !(await page.evaluate(() => document.getElementById('toast').classList.contains('show'))) && (await page.evaluate(() => window.__nativeCalls)).every(x => x === false));
  await page.evaluate(() => localStorage.removeItem('__test_need_consent'));
  await ctx.setOffline(true);
  await page.evaluate(() => window.dispatchEvent(new Event('offline')));
  await page.evaluate(() => { document.dispatchEvent(new Event('visibilitychange')); }); await sleep(2500);
  check('من غير نت: مفيش محاولة', drive.uploads === u9);
  await ctx.setOffline(false);
  await open(page);
  check('النت رجع والفتحة الجاية: النسخة اتعملت', drive.uploads === u9 + 1, [u9, drive.uploads]);
  check('مفيش أخطاء JavaScript', errors.length === 0, errors);
  await ctx.close();

  console.log('\n[10] المتصفح (مش تطبيق الأندرويد) من غير توكن');
  {
    const W = await device(browser, { native: false });
    await W.page.goto(LAUNCHER);
    await W.page.evaluate(a => { localStorage.setItem('hisabati_super_account_v1', a); localStorage.setItem('hpaint_notes_v1', '[{"t":"ويب"}]'); }, ACCOUNT);
    const u10 = drive.uploads;
    await open(W.page);
    check('ما فتحش نافذة جوجل لوحده', !(await W.page.evaluate(() => window.__gsiPopups)));
    check('مفيش نسخة', drive.uploads === u10);
    check('الكارت بيوضح إنه بيشتغل لوحده في تطبيق الموبايل', /تطبيق أرزقي على الموبايل/.test(await W.page.textContent('#cloudCard')));
    check('مفيش أخطاء', W.errors.length === 0, W.errors);
    await W.ctx.close();
  }

  await browser.close();
  console.log(`\nالنتيجة: ${passed} نجح · ${failed} فشل`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
