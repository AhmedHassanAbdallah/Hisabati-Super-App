/*
 * حساباتي للجبس والديكورات - Service Worker (العمل بدون إنترنت)
 * © 2026 أحمد حسن عبدالله - جميع الحقوق محفوظة.
 *
 * - كل ملفات التطبيق بتتحفظ في ذاكرة مستقلة باسم hgyp-app-<الإصدار>
 *   (مستقلة تماماً عن ذاكرة تطبيق حساباتي للكهرباء).
 * - الإصدار الجديد بيتنزل في الخلفية، والتطبيق بيسأل المستخدم قبل التحديث.
 * عند إصدار تحديث: غيّر SW_VERSION هنا + APP_VERSION في js/app.js + version.json
 */
const SW_VERSION = "1.0.0";
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
  // الخطوط: من الذاكرة أولاً ثم الشبكة
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(caches.open(RUNTIME_CACHE).then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      try { const res = await fetch(req); if (res.ok || res.type === "opaque") c.put(req, res.clone()); return res; }
      catch (e) { return hit || Response.error(); }
    }));
    return;
  }
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
