/*
 * أرزقي | Arzoqi — الحدادة: Service Worker (الشغل من غير إنترنت).
 * - ملفات القسم في كاش مستقل باسم hmetal-app-<الإصدار> (منفصل عن كل الأقسام التانية واللانشر).
 * - ملفات أرزقي المشتركة (الفاتورة الموحدة، النوتة، الخطوط، الألوان) في hmetal-arzaqi-shared.
 * عند إصدار تحديث: غيّر SW_VERSION هنا + version.json
 * © 2026 أحمد حسن عبدالله
 */
const SW_VERSION = "1.0.4";
const APP_CACHE = "hmetal-app-" + SW_VERSION;
const APP_FILES = [
  "./", "./index.html", "./guide-steps.js", "./privacy.html", "./manifest.json", "./version.json",
  "./css/app.css", "./css/metal.css", "./js/calc.js", "./js/app.js",
  "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-maskable-192.png", "./icons/icon-maskable-512.png"
];
const AZ_SHARED_CACHE = "hmetal-arzaqi-shared";
const AZ_SHARED_PATH = new URL("../../Shared-Assets/", self.location).pathname;
const AZ_SHARED_FILES = ["section-theme.css", "invoice.js", "invoice.css", "crew.js", "crew.css", "guide.js", "guide.css", "arzoqi-wordmark-light.png",
  "../fonts/arzoqi-fonts.css", "../fonts/cairo-arabic.woff2", "../fonts/cairo-latin.woff2", "../fonts/cairo-latin-ext.woff2", "../fonts/inter-latin-wght-normal.woff2", "../fonts/inter-latin-ext-wght-normal.woff2",
  "../fonts/ibm-plex-sans-arabic-arabic-400-normal.woff2", "../fonts/ibm-plex-sans-arabic-arabic-500-normal.woff2",
  "../fonts/ibm-plex-sans-arabic-arabic-600-normal.woff2", "../fonts/ibm-plex-sans-arabic-arabic-700-normal.woff2"]
  .map(f => new URL("../../Shared-Assets/brand/" + f, self.location).href);

self.addEventListener("install", event => {
  event.waitUntil(Promise.all([
    caches.open(APP_CACHE).then(c => c.addAll(APP_FILES.map(u => new Request(u, { cache: "reload" })))),
    caches.open(AZ_SHARED_CACHE).then(c => c.addAll(AZ_SHARED_FILES.map(u => new Request(u, { cache: "reload" })))).catch(() => {})
  ]).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith("hmetal-app-") && k !== APP_CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // ملفات أرزقي المشتركة: من الكاش مع تحديث في الخلفية
  if (url.pathname.startsWith(AZ_SHARED_PATH)) {
    event.respondWith(caches.open(AZ_SHARED_CACHE).then(async cache => {
      const fresh = fetch(req).then(res => { if (res && res.ok) cache.put(req, res.clone()); return res; });
      const hit = await cache.match(req, { ignoreSearch: true });
      if (hit) { event.waitUntil(fresh.catch(() => {})); return hit; }
      return fresh;
    }));
    return;
  }
  if (url.pathname.endsWith("/version.json")) {
    event.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }
  // ملفات القسم: من الكاش مع تحديث في الخلفية (علشان أي تعديل يوصل في الفتحة الجاية)
  event.respondWith((async () => {
    const cache = await caches.open(APP_CACHE);
    const hit = await cache.match(req, { ignoreSearch: true }) || (req.mode === "navigate" ? await cache.match("./index.html") : null);
    const net = fetch(req).then(res => { if (res && res.ok && res.type === "basic") cache.put(req, res.clone()); return res; }).catch(() => null);
    if (hit) { event.waitUntil(net); return hit; }
    const res = await net;
    if (res) return res;
    return req.mode === "navigate" ? (await cache.match("./index.html")) || Response.error() : Response.error();
  })());
});
