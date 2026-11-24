/*
 * أرزقي للجبس والديكورات - Service Worker (العمل بدون إنترنت)
 * © 2026 أحمد حسن عبدالله - جميع الحقوق محفوظة.
 *
 * - كل ملفات التطبيق بتتحفظ في ذاكرة مستقلة باسم hgyp-app-<الإصدار>
 *   (مستقلة تماماً عن ذاكرة تطبيق أرزقي للكهرباء).
 * - الإصدار الجديد بيتنزل في الخلفية، والتطبيق بيسأل المستخدم قبل التحديث.
 * عند إصدار تحديث: غيّر SW_VERSION هنا + APP_VERSION في js/app.js + version.json
 */
const SW_VERSION = "1.0.1";
const APP_CACHE = "hgyp-app-" + SW_VERSION;
const RUNTIME_CACHE = "hgyp-runtime";
const APP_FILES = [
  "./", "./index.html", "./manifest.json", "./privacy.html", "./version.json",
  "./css/app.css",
  "./js/engine/core.js", "./js/engine/board.js", "./js/engine/plaster.js", "./js/engine/decor.js", "./js/engine/finance.js",
  "./js/data/catalog.js", "./js/store.js",
  "./js/ui/base.js", "./js/ui/calc.js", "./js/ui/projects.js", "./js/ui/manage.js", "./js/ui/docs.js", "./js/app.js",
  "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-maskable-192.png", "./icons/icon-maskable-512.png"
];

/* ── أرزقي: الهوية الموحّدة والفاتورة الموحّدة ملفات مشتركة خارج فولدر القسم
   (../../Shared-Assets/brand). بتتخزن هنا علشان القسم يفضل شغال من غير نت.
   الـ listener ده متسجّل قبل listener القسم، فبيرد على طلبات Shared-Assets بس. */
const AZ_SHARED_CACHE = "hgyp-arzaqi-shared"; // باسم القسم، علشان كاش كل قسم يفضل منفصل
const AZ_SHARED_PATH = new URL("../../Shared-Assets/", self.location).pathname;
const AZ_SHARED_FILES = ["section-theme.css", "invoice.js", "invoice.css", "crew.js", "crew.css", "arzoqi-wordmark-light.png",
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

self.addEventListener("install", event => {
  event.waitUntil(caches.open(APP_CACHE).then(c => c.addAll(APP_FILES.map(u => new Request(u, { cache: "reload" })))));
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith("hgyp-app-") && k !== APP_CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", event => { if (event.data === "skipWaiting") self.skipWaiting(); });

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith("/version.json")) {
    event.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }
  event.respondWith((async () => {
    const cache = await caches.open(APP_CACHE);
    const hit = await cache.match(req, { ignoreSearch: true }) || (req.mode === "navigate" ? await cache.match("./index.html") : null);
    if (hit) return hit;
    try { return await fetch(req); }
    catch (e) { return req.mode === "navigate" ? cache.match("./index.html") : Response.error(); }
  })());
});
