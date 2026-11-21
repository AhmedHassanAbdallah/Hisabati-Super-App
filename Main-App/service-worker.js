/*
 * أرزقي | Arzoqi — التطبيق الموحد: Service Worker خاص باللانشر بس.
 * نطاقه Main-App/ — صفحات التطبيقات (Trade-Modules/*) خارج النطاق ده،
 * فكل تطبيق بيفضل متحكم فيه الـ Service Worker الأصلي بتاعه زي ما هو.
 * أسماء الكاش كلها بتبدأ بـ hisabati-super- (مختلفة عن كل التطبيقات).
 */
const VERSION = '2.1.0';
const CACHE = 'hisabati-super-' + VERSION;
const PREFIX = 'hisabati-super-';
const TRADE_DIRS = ['Electrical', 'Plumbing', 'HVAC', 'Painting', 'Flooring', 'Gypsum', 'Plastering'];
const FILES = [
  './', './index.html', './launcher.css', './launcher.js', './trades.js', './manifest.json',
  './config.js', './backup.js', './cloud.js', './privacy.html', '../Shared-Assets/images/developer.jpg',
  '../Shared-Assets/brand/arzaqi.css', '../Shared-Assets/brand/splash.js',
  '../Shared-Assets/brand/arzoqi-wordmark-light.png', '../Shared-Assets/brand/arzoqi-wordmark-dark.png',
  '../Shared-Assets/brand/arzoqi-splash-light.mp4', '../Shared-Assets/brand/arzoqi-splash-dark.mp4',
  '../Shared-Assets/brand/arzoqi-splash-light.jpg', '../Shared-Assets/brand/arzoqi-splash-dark.jpg',
  '../Shared-Assets/fonts/arzoqi-fonts.css', '../Shared-Assets/fonts/inter-latin-wght-normal.woff2', '../Shared-Assets/fonts/inter-latin-ext-wght-normal.woff2',
  '../Shared-Assets/fonts/ibm-plex-sans-arabic-arabic-400-normal.woff2', '../Shared-Assets/fonts/ibm-plex-sans-arabic-arabic-500-normal.woff2',
  '../Shared-Assets/fonts/ibm-plex-sans-arabic-arabic-600-normal.woff2', '../Shared-Assets/fonts/ibm-plex-sans-arabic-arabic-700-normal.woff2',
  '../Shared-Assets/icons/icon-192.png', '../Shared-Assets/icons/icon-512.png',
  '../Shared-Assets/icons/icon-maskable-192.png', '../Shared-Assets/icons/icon-maskable-512.png'
].concat(TRADE_DIRS.map(d => '../Trade-Modules/' + d + '/icons/icon-192.png'));

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await Promise.all(FILES.map(f => c.add(new Request(f, { cache: 'reload' })).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    // بيمسح بس الكاش القديم بتاع اللانشر — ما بيلمسش كاش أي تطبيق
    await Promise.all(keys.filter(k => k.startsWith(PREFIX) && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // ملفات version.json بتاعة التطبيقات: من الشبكة الأول (علشان رقم الإصدار يبقى مظبوط)
  if (url.pathname.endsWith('/version.json')) {
    event.respondWith(fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req)));
    return;
  }
  // باقي ملفات اللانشر: من الكاش مع تحديث في الخلفية
  event.respondWith((async () => {
    const cached = await caches.match(req, { ignoreSearch: req.mode === 'navigate' });
    const net = fetch(req).then(res => {
      if (res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => null);
    if (cached) { event.waitUntil(net); return cached; }
    const res = await net;
    if (res) return res;
    if (req.mode === 'navigate') { const shell = await caches.match('./index.html'); if (shell) return shell; }
    return Response.error();
  })());
});
