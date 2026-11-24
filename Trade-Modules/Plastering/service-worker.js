/*
 * HESABATI PLASTER — Service Worker (العمل بدون إنترنت)
 *
 * عزل تام عن تطبيقات أرزقي الأخرى على نفس النطاق:
 *  - أسماء الكاش تبدأ بـ "hplaster-" فقط.
 *  - التنظيف يمسح كاش "hplaster-" القديم فقط ولا يلمس أي كاش آخر
 *    (مثل hesabaty-app-* الخاص بتطبيق الكهرباء).
 *  - نطاق العمل هو مجلد هذا التطبيق فقط.
 *
 * عند إصدار تحديث: غيّر VERSION هنا + APP_VERSION في js/app.js + version.json
 */
const VERSION = '1.0.3';
const PREFIX = 'hplaster-';
const APP_CACHE = PREFIX + 'app-' + VERSION;
const RUNTIME_CACHE = PREFIX + 'runtime';

const APP_FILES = [
  './',
  './index.html', './guide-steps.js',
  './manifest.json',
  './privacy.html',
  './css/app.css',
  './js/engine.js',
  './js/catalog.js',
  './js/store.js',
  './js/ui.js',
  './js/editors.js',
  './js/views.js',
  './js/admin.js',
  './js/docs.js',
  './js/app.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png'
];

/* ── أرزقي: الهوية الموحّدة والفاتورة الموحّدة ملفات مشتركة خارج فولدر القسم
   (../../Shared-Assets/brand). بتتخزن هنا علشان القسم يفضل شغال من غير نت.
   الـ listener ده متسجّل قبل listener القسم، فبيرد على طلبات Shared-Assets بس. */
const AZ_SHARED_CACHE = RUNTIME_CACHE; // باسم القسم، علشان كاش كل قسم يفضل منفصل
const AZ_SHARED_PATH = new URL("../../Shared-Assets/", self.location).pathname;
const AZ_SHARED_FILES = ["section-theme.css", "invoice.js", "invoice.css", "crew.js", "crew.css", "guide.js", "guide.css", "arzoqi-wordmark-light.png",
  "../fonts/arzoqi-fonts.css", "../fonts/cairo-arabic.woff2", "../fonts/cairo-latin.woff2", "../fonts/cairo-latin-ext.woff2", "../fonts/inter-latin-wght-normal.woff2", "../fonts/inter-latin-ext-wght-normal.woff2",
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
  event.waitUntil(caches.open(APP_CACHE).then(c => c.addAll(APP_FILES.map(u => new Request(u, { cache: 'reload' })))));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith(PREFIX) && k !== APP_CACHE && k !== RUNTIME_CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin !== self.location.origin) return;
  // داخل نطاق التطبيق فقط
  const scope = new URL('./', self.location).pathname;
  if (!url.pathname.startsWith(scope)) return;

  // صفحة التطبيق: من الكاش (تعمل بدون إنترنت)
  if (req.mode === 'navigate') {
    event.respondWith(caches.match('./index.html').then(hit => hit || fetch(req)).catch(() => caches.match('./index.html')));
    return;
  }
  // version.json: الشبكة أولاً
  if (url.pathname.endsWith('/version.json')) {
    event.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }
  event.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(res => {
    if (res && res.ok) { const copy = res.clone(); caches.open(RUNTIME_CACHE).then(c => c.put(req, copy)); }
    return res;
  })));
});
