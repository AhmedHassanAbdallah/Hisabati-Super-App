/*
 * أرزقي HVAC - Service Worker
 * ذاكرة مستقلة تماماً بأسماء hesabati-hvac-* حتى لا تتداخل مع أرزقي الكهرباء أو النقاشة
 * (التطبيقات على نفس النطاق github.io بتتشارك نفس مساحة الكاش).
 * © 2026 أحمد حسن عبدالله - جميع الحقوق محفوظة.
 *
 * نظام الإصدارات:
 *  - كل إصدار من التطبيق يُحفظ في ذاكرة مستقلة (hesabati-hvac-app-<الإصدار>).
 *  - الـ Service Worker يعرض دائماً الإصدار الذي اختاره المستخدم (active)،
 *    حتى لو تم نشر إصدار أحدث على الخادم.
 *  - عند نزول إصدار جديد يتم تنزيله في الخلفية، ويسأل التطبيقُ المستخدمَ:
 *    "تحديث الآن" أو "البقاء على الإصدار الحالي".
 *  - يتم الاحتفاظ بالإصدار السابق لإمكانية الرجوع إليه.
 *
 * عند إصدار تحديث جديد: غيّر SW_VERSION هنا + APP_VERSION في index.html + version.json
 * (أو شغّل: node tools/bump-version.js 2.1.0 "ملاحظة 1" "ملاحظة 2").
 */
const SW_VERSION = "1.0.3";

const APP_PREFIX = "hesabati-hvac-app-";
const META_CACHE = "hesabati-hvac-meta";
const RUNTIME_CACHE = "hesabati-hvac-runtime";
// لا يوجد كاش قديم لهذا التطبيق — ممنوع حذف أي كاش لا يبدأ بـ hesabati-hvac-
const LEGACY_CACHES = [];
const META_KEY = new URL("./__version-meta__", self.location).href;
const SCOPE_PATH = new URL("./", self.location).pathname;
const INDEX_URL = new URL("./index.html", self.location).href;

const APP_FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./privacy.html",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-192.png",
  "./icons/icon-maskable-512.png",
  "./js/core.js",
  "./js/catalog.js",
  "./js/docs.js",
  "./js/customers.js",
  "./js/modules.js",
  "./js/calc.js",
  "./js/print.js",
  "./js/app.js"
];

/* ---------- أدوات مساعدة ---------- */
function cmpVer(a, b) {
  const pa = String(a || "0").split(".").map(n => parseInt(n, 10) || 0);
  const pb = String(b || "0").split(".").map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d > 0 ? 1 : -1;
  }
  return 0;
}

async function readMeta() {
  const cache = await caches.open(META_CACHE);
  const res = await cache.match(META_KEY);
  if (!res) return {};
  try { return await res.json(); } catch (e) { return {}; }
}

async function writeMeta(meta) {
  const cache = await caches.open(META_CACHE);
  await cache.put(META_KEY, new Response(JSON.stringify(meta), {
    headers: { "Content-Type": "application/json" }
  }));
}

async function cachedVersions() {
  const keys = await caches.keys();
  return keys.filter(k => k.startsWith(APP_PREFIX)).map(k => k.slice(APP_PREFIX.length));
}

async function cleanupCaches(meta) {
  const keep = new Set([meta.active, meta.previous, SW_VERSION].filter(Boolean).map(v => APP_PREFIX + v));
  const keys = await caches.keys();
  await Promise.all(keys.map(k => {
    if (LEGACY_CACHES.includes(k)) return caches.delete(k);
    if (k.startsWith(APP_PREFIX) && !keep.has(k)) return caches.delete(k);
    return null;
  }));
}

/* يُرجع الإصدار الذي يجب عرضه حالياً */
async function resolveActiveVersion() {
  const meta = await readMeta();
  const versions = await cachedVersions();
  if (meta.active && versions.includes(meta.active)) return meta.active;
  return SW_VERSION;
}

async function versionInfo() {
  const meta = await readMeta();
  const versions = await cachedVersions();
  const active = (meta.active && versions.includes(meta.active)) ? meta.active : SW_VERSION;
  const previous = (meta.previous && meta.previous !== active && versions.includes(meta.previous)) ? meta.previous : null;
  return {
    type: "VERSION_INFO",
    active,
    latest: SW_VERSION,
    previous,
    cached: versions.sort(cmpVer)
  };
}

async function setVersion(version) {
  const versions = await cachedVersions();
  if (!versions.includes(version)) return { ok: false, reason: "not-cached" };
  const meta = await readMeta();
  if (meta.active !== version) {
    meta.previous = meta.active || null;
    meta.active = version;
  }
  await writeMeta(meta);
  await cleanupCaches(meta);
  return Object.assign({ ok: true }, await versionInfo());
}

/* ---------- دورة حياة الـ Service Worker ---------- */
/* ── أرزقي: الهوية الموحّدة والفاتورة الموحّدة ملفات مشتركة خارج فولدر القسم
   (../../Shared-Assets/brand). بتتخزن هنا علشان القسم يفضل شغال من غير نت.
   الـ listener ده متسجّل قبل listener القسم، فبيرد على طلبات Shared-Assets بس. */
const AZ_SHARED_CACHE = "hesabati-hvac-arzaqi-shared"; // باسم القسم، علشان كاش كل قسم يفضل منفصل
const AZ_SHARED_PATH = new URL("../../Shared-Assets/", self.location).pathname;
const AZ_SHARED_FILES = ["section-theme.css", "invoice.js", "invoice.css", "crew.js", "crew.css", "arzoqi-wordmark-light.png",
  "../fonts/arzoqi-fonts.css", "../images/developer.jpg", "../fonts/cairo-arabic.woff2", "../fonts/cairo-latin.woff2", "../fonts/cairo-latin-ext.woff2", "../fonts/inter-latin-wght-normal.woff2", "../fonts/inter-latin-ext-wght-normal.woff2",
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
  event.waitUntil((async () => {
    const cache = await caches.open(APP_PREFIX + SW_VERSION);
    await cache.addAll(APP_FILES.map(u => new Request(u, { cache: "reload" })));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const meta = await readMeta();
    const versions = await cachedVersions();
    // أول تثبيت (أو ضاع الإصدار المختار): ابدأ بالإصدار الحالي
    if (!meta.active || !versions.includes(meta.active)) meta.active = SW_VERSION;
    meta.latest = SW_VERSION;
    await writeMeta(meta);
    await cleanupCaches(meta);
    await self.clients.claim();
    const info = await versionInfo();
    const clients = await self.clients.matchAll({ type: "window" });
    clients.forEach(c => c.postMessage(Object.assign({}, info, { type: "VERSION_AVAILABLE" })));
  })());
});

self.addEventListener("message", event => {
  const data = event.data || {};
  const port = event.ports && event.ports[0];
  const reply = payload => {
    if (port) port.postMessage(payload);
    else if (event.source) event.source.postMessage(payload);
  };
  if (data.type === "GET_VERSION_INFO") {
    event.waitUntil(versionInfo().then(reply));
  } else if (data.type === "SET_VERSION") {
    event.waitUntil(setVersion(String(data.version)).then(reply));
  }
});

/* ---------- تقديم الملفات ---------- */
async function serveApp(request) {
  const version = await resolveActiveVersion();
  const cache = await caches.open(APP_PREFIX + version);
  const url = new URL(request.url);
  // الصفحة الرئيسية فقط (وليس أي مسار فرعي مثل /beta/)
  const isIndex = request.mode === "navigate" && (url.pathname === SCOPE_PATH || url.pathname === SCOPE_PATH + "index.html");
  const hit = await cache.match(isIndex ? INDEX_URL : request, { ignoreSearch: true });
  if (hit) return hit;
  try {
    return await fetch(request);
  } catch (e) {
    if (request.mode === "navigate") {
      const fallback = await cache.match(INDEX_URL);
      if (fallback) return fallback;
    }
    throw e;
  }
}

async function serveFont(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const hit = await cache.match(request);
  const network = fetch(request).then(res => {
    if (res && (res.ok || res.type === "opaque")) cache.put(request, res.clone());
    return res;
  }).catch(() => hit || Response.error());
  return hit || network;
}

// فتح التطبيق عند الضغط على تنبيه المواعيد
self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    if (all.length) return all[0].focus();
    return self.clients.openWindow(SCOPE_PATH);
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (url.origin === self.location.origin) {
    if (!url.pathname.startsWith(SCOPE_PATH)) return;
    // ملفات يجب أن تأتي دائماً من الشبكة لاكتشاف التحديثات
    if (url.pathname.endsWith("/version.json") || url.pathname.endsWith("/service-worker.js")) return;
    event.respondWith(serveApp(request));
    return;
  }

});
