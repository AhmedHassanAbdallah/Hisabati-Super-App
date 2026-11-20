/*
 * HESABATI PLASTER — Service Worker (العمل بدون إنترنت)
 *
 * عزل تام عن تطبيقات حساباتي الأخرى على نفس النطاق:
 *  - أسماء الكاش تبدأ بـ "hplaster-" فقط.
 *  - التنظيف يمسح كاش "hplaster-" القديم فقط ولا يلمس أي كاش آخر
 *    (مثل hesabaty-app-* الخاص بتطبيق الكهرباء).
 *  - نطاق العمل هو مجلد هذا التطبيق فقط.
 *
 * عند إصدار تحديث: غيّر VERSION هنا + APP_VERSION في js/app.js + version.json
 */
const VERSION = '1.0.0';
const PREFIX = 'hplaster-';
const APP_CACHE = PREFIX + 'app-' + VERSION;
const RUNTIME_CACHE = PREFIX + 'runtime';

const APP_FILES = [
  './',
  './index.html',
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

  // خط Cairo: من الكاش أولاً ثم الشبكة
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(caches.open(RUNTIME_CACHE).then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      try { const res = await fetch(req); if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone()); return res; }
      catch (e) { return new Response('', { status: 504 }); }
    }));
    return;
  }
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
