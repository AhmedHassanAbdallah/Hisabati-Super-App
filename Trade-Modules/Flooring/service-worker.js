/*
 * أرزقي للأرضيات — Service Worker (العمل بدون إنترنت)
 * © 2026 أحمد حسن عبدالله - جميع الحقوق محفوظة.
 *
 * حماية التطبيقات التانية على نفس الدومين:
 *  - كل الكاش هنا اسمه بيبدأ بـ "hflooring-" ومش بيلمس أي كاش تاني
 *    (تطبيق أرزقي للكهرباء بيستخدم "hesabaty-..." — مستحيل يتمسح من هنا).
 *  - الـ Service Worker ده نطاقه مجلد التطبيق بس، وبيتعامل مع الطلبات اللي جوه المجلد ده بس.
 *
 * عند إصدار تحديث: غيّر VERSION هنا + APP_VERSION في index.html + version.json
 * (أو شغّل: node tools/bump-version.js 1.0.1 "ملاحظة")
 */
const VERSION = '1.0.2';
const PREFIX = 'hflooring-';
const CACHE = PREFIX + 'app-' + VERSION;
const SCOPE_PATH = new URL('./', self.location).pathname;
const FILES = [
  './', './index.html', './manifest.json', './privacy.html', './version.json',
  './css/app.css', './css/flooring.css',
  './js/calc.js', './js/finance.js', './js/store.js', './js/ui.js', './js/app.js', './js/modules.js', './js/calculators.js', './js/docs.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-192.png', './icons/icon-maskable-512.png'
];

/* ── أرزقي: الهوية الموحّدة والفاتورة الموحّدة ملفات مشتركة خارج فولدر القسم
   (../../Shared-Assets/brand). بتتخزن هنا علشان القسم يفضل شغال من غير نت.
   الـ listener ده متسجّل قبل listener القسم، فبيرد على طلبات Shared-Assets بس. */
const AZ_SHARED_CACHE = CACHE; // باسم القسم، علشان كاش كل قسم يفضل منفصل
const AZ_SHARED_PATH = new URL("../../Shared-Assets/", self.location).pathname;
const AZ_SHARED_FILES = ["section-theme.css", "invoice.js", "invoice.css", "crew.js", "crew.css", "arzoqi-wordmark-light.png",
  "../fonts/arzoqi-fonts.css", "../fonts/cairo.css", "../images/developer.jpg", "../fonts/cairo-arabic.woff2", "../fonts/cairo-latin.woff2", "../fonts/cairo-latin-ext.woff2", "../fonts/inter-latin-wght-normal.woff2", "../fonts/inter-latin-ext-wght-normal.woff2",
  "../fonts/ibm-plex-sans-arabic-arabic-400-normal.woff2", "../fonts/ibm-plex-sans-arabic-arabic-500-normal.woff2",
  "../fonts/ibm-plex-sans-arabic-arabic-600-normal.woff2", "../fonts/ibm-plex-sans-arabic-arabic-700-normal.woff2"]
  .map(f => new URL("../../Shared-Assets/brand/" + f, self.location).href);
self.addEventListener("install", event => {
  event.waitUntil(caches.open(AZ_SHARED_CACHE)
    .then(c => c.addAll(AZ_SHARED_FILES.map(u => new Request(u, { cache: "reload" }))))
    .catch(() => {}));
});
self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(AZ_SHARED_PATH)) return;
  event.respondWith(caches.open(AZ_SHARED_CACHE).then(async cache => {
    const fresh = fetch(req).then(res => { if (res && res.ok) cache.put(req, res.clone()); return res; });
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) { event.waitUntil(fresh.catch(() => {})); return hit; }
    return fresh;
  }));
});

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    // يمسح النسخ القديمة من كاش تطبيق الأرضيات فقط
    await Promise.all(keys.filter(k => k.startsWith(PREFIX) && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(SCOPE_PATH)) return;
  // version.json من الشبكة الأول (علشان نعرف التحديثات)
  if (url.pathname.endsWith('/version.json')) {
    event.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }
  // الصفحة الرئيسية: من الكاش فوراً (بدون إنترنت)، وفي الخلفية بيتحدث الـ SW نفسه
  if (req.mode === 'navigate') {
    event.respondWith(caches.match('./index.html', { ignoreSearch: true }).then(r => r || fetch(req)));
    return;
  }
  event.respondWith(caches.match(req, { ignoreSearch: true }).then(r => r || fetch(req).then(res => {
    if (res && res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  })));
});
