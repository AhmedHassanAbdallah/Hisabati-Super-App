/*
 * حساباتي — اختبار وضع "تطبيق الأندرويد المستقل" في المتصفح.
 *   node tests/native-mode.e2e.js [http://127.0.0.1:8790/]
 * بيحاكي الجسر الأصلي window.HisabatiNative (اللي التطبيق المستقل بيضيفه) ويتأكد إن:
 *  - الأقسام بتتفتح كصفحة كاملة (مش iframe) علشان طباعة أندرويد تطبع القسم نفسه.
 *  - الرجوع من القسم بيرجّع للرئيسية.
 *  - تسجيل الدخول بجوجل بيمشي عن طريق الجسر الأصلي (مش مكتبة جوجل للويب)، والنسخ على درايف شغال.
 *  - مفيش Service Worker للانشر جوه التطبيق (الملفات جوه الـ APK).
 */
const { chromium } = require('playwright');
const BASE = (process.argv[2] || 'http://127.0.0.1:8790/').replace(/\/?$/, '/');
const LAUNCHER = BASE + 'Main-App/';
let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) { passed++; console.log('  ✔ ' + n); } else { failed++; console.log('  ✘ ' + n + (x !== undefined ? '  → ' + JSON.stringify(x).slice(0, 300) : '')); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));

const NATIVE = `window.HisabatiNative = {
  isNative: function () { return true; },
  googleAuthorize: function (id, scopes, interactive) {
    window.__nativeCalls = (window.__nativeCalls || 0) + 1;
    setTimeout(function () { window.__hisabatiAuthResult(id, 'native-token', scopes, ''); }, 30);
  }
};`;
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS' };
const files = [];
async function drive(route) {
  const req = route.request(); const url = new URL(req.url()); const m = req.method();
  const j = (status, body) => route.fulfill({ status, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (m === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
  if ((req.headers()['authorization'] || '') !== 'Bearer native-token') return j(401, {});
  if (url.pathname === '/oauth2/v3/userinfo') return j(200, { sub: '7', name: 'مستخدم أندرويد', given_name: 'مستخدم', email: 'android.user@example.com' });
  if (url.pathname === '/drive/v3/files' && m === 'GET') {
    const q = url.searchParams.get('q') || '';
    const list = /in parents/.test(q) ? files.filter(f => f.parents) : files.filter(f => !f.parents);
    return j(200, { files: list.map(f => ({ id: f.id, name: f.name, createdTime: f.t, size: '10', appProperties: f.appProperties })) });
  }
  if (url.pathname === '/drive/v3/files' && m === 'POST') { const f = { id: 'd' + files.length, t: new Date().toISOString(), ...JSON.parse(req.postData()) }; files.push(f); return j(200, { id: f.id }); }
  if (url.pathname === '/upload/drive/v3/files') {
    const body = req.postData(); const meta = JSON.parse(body.split('\r\n\r\n')[1].split('\r\n')[0]);
    const f = { id: 'd' + files.length, t: new Date().toISOString(), ...meta }; files.push(f); return j(200, { id: f.id, name: f.name });
  }
  return j(400, {});
}

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(NATIVE);
  let gsiLoaded = false;
  await ctx.route('https://accounts.google.com/**', r => { gsiLoaded = true; r.abort(); });
  await ctx.route('https://www.googleapis.com/**', drive);
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('dialog', d => d.accept());

  console.log('\n[1] فتح الأقسام كصفحات كاملة');
  await p.goto(LAUNCHER); await sleep(700);
  check('الواجهة عارفة إنها جوه التطبيق المستقل', await p.evaluate(() => window.__hisabatiLauncher.nativeApp === true));
  for (const [id, dir] of [['electrical', 'Electrical'], ['plastering', 'Plastering'], ['hvac', 'HVAC']]) {
    await Promise.all([p.waitForNavigation(), p.click(`[data-trade="${id}"]`)]);
    await sleep(900);
    check(`${id}: اتفتح كصفحة كاملة من فولدره (مش iframe)`, p.url().split('#')[0] === BASE + 'Trade-Modules/' + dir + '/', p.url());
    await Promise.all([p.waitForNavigation(), p.goBack()]);
    await sleep(700);
    check(`${id}: الرجوع رجّع للرئيسية`, p.url().startsWith(LAUNCHER) && (await p.$$('.trade[data-trade]')).length === 9, p.url());
  }
  check('آخر قسم اتفتح ظاهر في "كمّل شغلك"', (await p.textContent('#resumeCard')).includes('التكييف'));
  check('مفيش Service Worker للانشر جوه التطبيق', (await p.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).filter(r => r.scope.endsWith('/Main-App/')).length)) === 0);

  console.log('\n[2] تسجيل الدخول والنسخ عن طريق الجسر الأصلي');
  await p.click('#cloudCard [data-act="signin"]');
  await p.waitForFunction(() => /اتسجل دخولك/.test(document.getElementById('toast').textContent), null, { timeout: 8000 });
  check('تسجيل الدخول مشي عن طريق الجسر الأصلي', (await p.evaluate(() => window.__nativeCalls)) >= 1);
  check('مكتبة جوجل للويب ما اتحملتش خالص', gsiLoaded === false);
  check('الحساب ظاهر', (await p.textContent('#cloudCard')).includes('مستخدم أندرويد'));
  await p.evaluate(() => localStorage.setItem('hpaint_notes_v1', '[{"t":"تجربة"}]'));
  await p.click('#cloudCard [data-act="backup"]');
  await p.waitForFunction(() => /اتحفظت نسخة/.test(document.getElementById('toast').textContent), null, { timeout: 10000 });
  check('النسخة اترفعت على درايف بتوكن التطبيق', files.some(f => (f.appProperties || {}).hisabati === 'backup'));
  check('مفيش أخطاء JavaScript', errors.length === 0, errors);

  await b.close();
  console.log(`\nالنتيجة: ${passed} نجح · ${failed} فشل`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
