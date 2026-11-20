/* =========================================================
   أرزقي HVAC - app.js
   الصور (IndexedDB محلي)، النسخ الاحتياطي والاستعادة، نظام التحديثات،
   وتشغيل التطبيق.
   © 2026 أحمد حسن عبدالله - جميع الحقوق محفوظة.
   ========================================================= */

/* ---------------- الصور: تخزين محلي مستقل ---------------- */
const MEDIA_DB = NS + 'media';
let _mediaDbP = null;
const _mediaMem = {};
function mediaDb() {
  if (_mediaDbP) return _mediaDbP;
  _mediaDbP = new Promise((resolve, reject) => {
    try {
      if (!window.indexedDB) { reject(new Error('no-idb')); return; }
      const req = indexedDB.open(MEDIA_DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore('media');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    } catch (e) { reject(e); }
  });
  _mediaDbP.catch(() => {});
  return _mediaDbP;
}
function mediaTx(mode, fn) {
  return mediaDb().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction('media', mode);
    const store = tx.objectStore('media');
    const r = fn(store);
    tx.oncomplete = () => resolve(r && 'result' in r ? r.result : undefined);
    tx.onerror = () => reject(tx.error);
  }));
}
function mediaPut(id, data) {
  return mediaTx('readwrite', s => s.put(data, id)).catch(() => {
    if (lsSet(NS + 'media_' + id, data)) return;
    _mediaMem[id] = data;
  });
}
function mediaGet(id) {
  return mediaTx('readonly', s => s.get(id)).then(v => v || lsGet(NS + 'media_' + id) || _mediaMem[id] || '').catch(() => lsGet(NS + 'media_' + id) || _mediaMem[id] || '');
}
function mediaDelete(id) {
  if (!id) return;
  try { localStorage.removeItem(NS + 'media_' + id); } catch (e) {}
  delete _mediaMem[id];
  mediaTx('readwrite', s => s.delete(id)).catch(() => {});
}
function mediaKeys() { return mediaTx('readonly', s => s.getAllKeys()).then(k => k || []).catch(() => []); }
function hydrateMedia(root, cb) {
  const imgs = root ? root.querySelectorAll('img[data-media]') : [];
  if (!imgs.length) return;
  Promise.all(Array.from(imgs).map(img => mediaGet(img.dataset.media).then(src => { if (src) img.src = src; else img.alt = 'الصورة غير متاحة'; }))).then(() => { if (cb) setTimeout(cb, 50); });
}
function compressImage(file, maxW, quality, type = 'image/jpeg') {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = e => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, maxW / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (type === 'image/jpeg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL(type, quality || undefined));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}
// يمسح الصور اللي مالهاش زيارة (مثلاً زيارة اتلغت قبل الحفظ)
function cleanupMedia() {
  const used = new Set();
  DB.visits.forEach(v => v.photos.forEach(p => used.add(p.id)));
  if (vDraft) vDraft.photos.forEach(p => used.add(p.id));
  mediaKeys().then(keys => keys.forEach(k => { if (!used.has(k)) mediaDelete(k); }));
}

/* ---------------- تنزيل الملفات ---------------- */
function downloadText(text, filename, mime) {
  if (IN_APP) {
    try { window.HesabatiHvacApp.saveFile(filename, mime || 'application/json', text); return true; } catch (e) { showAppToast('⚠️ تعذر حفظ الملف'); return false; }
  }
  const blob = new Blob([text], { type: (mime || 'application/json') + ';charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  return true;
}

/* ---------------- النسخ الاحتياطي ---------------- */
const BACKUP_APP_ID = 'hesabati-hvac';
async function buildBackup(withMedia = true) {
  syncPaymentsToCustomers();
  const data = {};
  COLLECTIONS.forEach(c => { data[c] = DB[c]; });
  const media = {};
  if (withMedia) {
    const ids = new Set();
    DB.visits.forEach(v => v.photos.forEach(p => ids.add(p.id)));
    for (const id of ids) { const d = await mediaGet(id); if (d) media[id] = d; }
  }
  return { app: BACKUP_APP_ID, appName: APP_NAME, backupVersion: 1, appVersion: APP_VERSION, exportedAt: new Date().toISOString(), settings, business, data, media };
}
async function exportBackupJSON() {
  const b = await buildBackup(true);
  const ok = downloadText(JSON.stringify(b), `أرزقي_HVAC_نسخة_كاملة_${todayISO()}.json`, 'application/json');
  if (!ok) return;
  lsSet(KEYS.backup, String(Date.now()));
  renderBackupLine();
  const counts = `${DB.docs.length} فاتورة · ${DB.customers.length} عميل · ${DB.devices.length} جهاز · ${DB.visits.length} زيارة`;
  showAppToast(`✔️ تم تنزيل النسخة الكاملة (${counts})`);
}
function renderBackupLine() {
  const el = document.getElementById('backupLine');
  if (!el) return;
  const last = Number(lsGet(KEYS.backup)) || 0;
  const days = last ? Math.floor((Date.now() - last) / 86400000) : null;
  const any = DB.docs.length || DB.customers.length;
  if (!any) { el.textContent = ''; return; }
  if (days === null) { el.textContent = '⚠️ لم تأخذ نسخة احتياطية بعد — نزّل نسخة للحفاظ على بياناتك.'; el.className = 'backup-line warn'; }
  else if (days >= 7) { el.textContent = `⚠️ آخر نسخة احتياطية منذ ${days} يوم — يفضّل تنزيل نسخة جديدة.`; el.className = 'backup-line warn'; }
  else { el.textContent = days === 0 ? 'آخر نسخة احتياطية: اليوم ✓' : `آخر نسخة احتياطية منذ ${days} يوم ✓`; el.className = 'backup-line'; }
}
function backupKind(obj) {
  if (!obj || typeof obj !== 'object') return 'invalid';
  if (obj.app === BACKUP_APP_ID && obj.data && typeof obj.data === 'object') return 'ok';
  // نسخ تطبيقات أرزقي الأخرى (الكهرباء / النقاشة) لا تُستورد هنا
  if (obj.app === 'hesabaty' || Array.isArray(obj.invoices) || obj.type === 'hesabaty-ledger') return 'other-app';
  return 'invalid';
}
async function restoreBackup(obj) {
  // نسخة أمان من البيانات الحالية قبل الاستبدال
  try { const cur = await buildBackup(false); await mediaPut('__pre_restore__', JSON.stringify(cur)); } catch (e) {}
  COLLECTIONS.forEach(c => { DB[c] = normalizeCol(c, obj.data[c]); });
  if (obj.settings && typeof obj.settings === 'object') settings = Object.assign(settings, obj.settings);
  if (obj.business && typeof obj.business === 'object') business = Object.assign(business, obj.business);
  if (!settings.seq || typeof settings.seq !== 'object') settings.seq = {};
  if (!settings.rates || typeof settings.rates !== 'object') settings.rates = {};
  const media = obj.media && typeof obj.media === 'object' ? obj.media : {};
  for (const id of Object.keys(media)) { if (typeof media[id] === 'string' && media[id].startsWith('data:image/')) await mediaPut(id, media[id]); }
  ensureDefaultPriceList();
  if (!getDoc(settings.currentDocId)) settings.currentDocId = DB.docs.length ? DB.docs[0].id : null;
  saveAll();
  applyCurrency();
  applyTheme();
}
function importBackupJSON(event) {
  const file = event.target.files[0];
  event.target.value = '';
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    let obj;
    try { obj = JSON.parse(e.target.result); } catch (err) { showAppToast('⚠️ ملف النسخة الاحتياطية غير صالح.'); return; }
    const kind = backupKind(obj);
    if (kind === 'other-app') { showAppToast('⚠️ الملف ده نسخة من تطبيق أرزقي تاني (الكهرباء أو النقاشة) — مش هيتستورد هنا علشان البيانات ما تتخلطش.'); return; }
    if (kind !== 'ok') { showAppToast('⚠️ ملف النسخة الاحتياطية غير صالح.'); return; }
    const d = obj.data;
    const n = k => (Array.isArray(d[k]) ? d[k].length : 0);
    showAppConfirm(`استعادة النسخة (${fmtDate((obj.exportedAt || '').slice(0, 10))})؟ هتستبدل بياناتك الحالية بـ: ${n('docs')} فاتورة، ${n('customers')} عميل، ${n('devices')} جهاز، ${n('visits')} زيارة، ${n('inventory')} صنف.`, () => {
      restoreBackup(obj).then(() => { closeEverythingThen(() => { refreshAll(); showView('home'); showAppToast('✔️ تم استعادة النسخة الاحتياطية بنجاح.'); }); })
        .catch(() => showAppToast('⚠️ حصلت مشكلة أثناء الاستعادة — بياناتك القديمة لسه موجودة.'));
    });
  };
  reader.readAsText(file);
}
function exportCSVReport() {
  const rows = [['رقم المستند', 'النوع', 'التاريخ', 'العميل', 'الهاتف', 'الإجمالي', 'المدفوع', 'المتبقي', 'العملة']];
  DB.docs.forEach(d => { const t = computeDoc(d); rows.push([d.number, docTypeInfo(d.docType).label, d.date, docTitle(d), d.clientPhone, t.total, t.paid, t.remaining, currentCurrency().code]); });
  const csv = '﻿' + rows.map(r => r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  downloadText(csv, `فواتير_أرزقي_HVAC_${todayISO()}.csv`, 'text/csv');
  showAppToast('✔️ تم تنزيل تقرير الفواتير (Excel / CSV)');
}

/* =========================================================
   نظام التحديثات: فقاعة «تحديث جديد» على الشاشة + تحديث مباشر
   - نسخة الويب/المثبتة من المتصفح: الإصدار الجديد بيتنزل في الخلفية،
     وتظهر الفقاعة، وزرار «تحديث الآن» بينقلك له فوراً.
   - تطبيق أندرويد: الفقاعة بتحمّل ملف التحديث وتفتح شاشة التثبيت مباشرة.
   ========================================================= */
let swInfo = null;
let appUpdate = null; // { kind: 'web' | 'apk', version, url, size, notes }
let lastAppCheck = 0;
function cmpVer(a, b) {
  const pa = String(a || '0').split('.').map(n => parseInt(n, 10) || 0), pb = String(b || '0').split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) { const d = (pa[i] || 0) - (pb[i] || 0); if (d !== 0) return d > 0 ? 1 : -1; }
  return 0;
}
function swMessage(msg, timeout = 5000) {
  return new Promise((resolve, reject) => {
    if (!('serviceWorker' in navigator)) return reject(new Error('no-sw'));
    const timer = setTimeout(() => reject(new Error('timeout')), timeout);
    navigator.serviceWorker.ready.then(reg => {
      const target = navigator.serviceWorker.controller || reg.active;
      if (!target) { clearTimeout(timer); return reject(new Error('no-controller')); }
      const ch = new MessageChannel();
      ch.port1.onmessage = e => { clearTimeout(timer); resolve(e.data); };
      target.postMessage(msg, [ch.port2]);
    });
  });
}
async function refreshVersionInfo() { try { swInfo = await swMessage({ type: 'GET_VERSION_INFO' }); } catch (e) { swInfo = null; } renderUpdateUI(); return swInfo; }
function renderUpdateUI() {
  const status = document.getElementById('updateStatus');
  if (!status) return;
  const applyBtn = document.getElementById('btnApplyUpdate'), rollBtn = document.getElementById('btnRollback'), dot = document.getElementById('verDot');
  document.getElementById('verCurrent').textContent = appVersion();
  applyBtn.classList.toggle('hidden', !appUpdate);
  dot.classList.toggle('warn', !!appUpdate);
  applyBtn.onclick = openAppUpdateSheet;
  if (appUpdate) {
    document.getElementById('btnApplyUpdateText').textContent = appUpdate.kind === 'apk' ? `تحميل الإصدار ${appUpdate.version}` : `تحديث إلى الإصدار ${appUpdate.version}`;
    status.innerHTML = `يوجد إصدار جديد <strong>${esc(appUpdate.version)}</strong> — اضغط على فقاعة <strong>«تحديث جديد»</strong> أو الزرار اللي تحت.`;
  } else if (IN_APP || swInfo) status.innerHTML = 'التطبيق بيدوّر على التحديثات كل ما تفتحه، ولما ينزل إصدار جديد هتظهرلك فقاعة <strong>«تحديث جديد»</strong> فيها كل الجديد وزرار التحديث المباشر.';
  else if (IS_BETA) { status.textContent = 'هذه نسخة تجريبية للمعاينة فقط.'; document.getElementById('btnCheckUpdate').classList.add('hidden'); }
  else if (!('serviceWorker' in navigator)) status.textContent = 'التحديثات التلقائية غير متاحة في هذا الوضع.';
  const prev = !IN_APP && swInfo && swInfo.previous && swInfo.previous !== APP_VERSION ? swInfo.previous : null;
  rollBtn.classList.toggle('hidden', !prev);
  if (prev) document.getElementById('btnRollbackText').textContent = cmpVer(prev, APP_VERSION) < 0 ? `الرجوع للإصدار السابق ${prev}` : `العودة للإصدار ${prev}`;
}
async function fetchReleaseNotes(version) {
  try { const res = await fetch('./version.json?t=' + Date.now(), { cache: 'no-store' }); const data = await res.json(); if (data && data.version === version && Array.isArray(data.notes)) return data.notes; } catch (e) {}
  return [];
}
// نسخة الويب: الـ Service Worker نزّل إصدار أحدث في الخلفية؟ اظهر الفقاعة
async function evaluateUpdate(fromUser) {
  const info = await refreshVersionInfo();
  if (!info) { if (fromUser) showAppToast('⚠️ تعذر التحقق من التحديثات الآن'); return; }
  if (cmpVer(info.latest, APP_VERSION) > 0) {
    if (!appUpdate || appUpdate.version !== info.latest) appUpdate = { kind: 'web', version: info.latest, size: 0, notes: await fetchReleaseNotes(info.latest) };
    renderAppUpdate();
    if (fromUser) openAppUpdateSheet();
  } else {
    if (appUpdate && appUpdate.kind === 'web') appUpdate = null;
    renderAppUpdate();
    if (fromUser) showAppToast('✔️ أنت تستخدم أحدث إصدار');
  }
}
function waitForInstall(reg, ms = 20000) {
  const sw = reg.installing || reg.waiting;
  if (!sw) return Promise.resolve();
  return new Promise(resolve => { const t = setTimeout(resolve, ms); const check = () => { if (sw.state === 'activated' || sw.state === 'redundant') { clearTimeout(t); resolve(); } }; sw.addEventListener('statechange', check); check(); });
}
async function checkForUpdatesManual() {
  if (IN_APP) { checkAppUpdate(true); return; }
  if (!('serviceWorker' in navigator)) { showAppToast('التحديثات غير متاحة في هذا الوضع'); return; }
  const btn = document.getElementById('btnCheckUpdate');
  btn.disabled = true; btn.style.opacity = '.6';
  try { const reg = await navigator.serviceWorker.getRegistration(); if (reg) { await reg.update().catch(() => {}); await waitForInstall(reg); } await evaluateUpdate(true); }
  finally { btn.disabled = false; btn.style.opacity = ''; }
}
async function switchToVersion(version) {
  try { const res = await swMessage({ type: 'SET_VERSION', version }); if (res && res.ok) { location.reload(); return true; } } catch (e) {}
  showAppToast('⚠️ تعذر التحديث، حاول مرة أخرى');
  return false;
}
function rollbackVersion() {
  if (!swInfo || !swInfo.previous) return;
  const v = swInfo.previous;
  showAppConfirm(`التبديل إلى الإصدار ${v}؟ بياناتك لن تتأثر.`, () => switchToVersion(v));
}

/* ---------------- تحديثات تطبيق أندرويد (من إصدارات GitHub) ---------------- */
function appVersion() { try { return IN_APP ? String(window.HesabatiHvacApp.versionName()) : APP_VERSION; } catch (e) { return APP_VERSION; } }
function parseReleaseNotes(body) { return String(body || '').split(/\r?\n/).map(l => l.trim()).filter(l => /^[-*•]\s+/.test(l)).map(l => l.replace(/^[-*•]\s+/, '')).filter(Boolean).slice(0, 10); }
async function checkAppUpdate(fromUser) {
  lastAppCheck = Date.now();
  try {
    const res = await fetch(RELEASES_API, { cache: 'no-store', headers: { Accept: 'application/vnd.github+json' } });
    if (!res.ok) throw new Error('http ' + res.status);
    const rel = await res.json();
    const version = String(rel.tag_name || '').replace(/^v/i, '');
    const assets = Array.isArray(rel.assets) ? rel.assets : [];
    const apk = assets.find(a => a.name === 'hesabati-hvac.apk') || assets.find(a => /\.apk$/i.test(a.name || ''));
    const cur = appVersion(), base = cur.replace(/-test.*$/, '');
    const newer = cmpVer(version, base) > 0 || (base !== cur && cmpVer(version, base) === 0);
    if (!apk || !version || !newer) { appUpdate = null; renderAppUpdate(); if (fromUser) showAppToast('✔️ أنت تستخدم أحدث إصدار'); return; }
    appUpdate = { kind: 'apk', version, url: apk.browser_download_url, size: apk.size || 0, notes: parseReleaseNotes(rel.body) };
    renderAppUpdate();
    if (fromUser) openAppUpdateSheet();
  } catch (e) { if (fromUser) showAppToast('⚠️ تعذر التحقق من التحديثات — تأكد من الإنترنت'); }
}
// فقاعة «تحديث جديد» على الشاشة
function renderAppUpdate() {
  const b = document.getElementById('updBubble');
  b.classList.toggle('hidden', !appUpdate);
  if (appUpdate) document.getElementById('updBubbleVer').textContent = `الإصدار ${appUpdate.version} · اضغط للتحديث`;
  renderUpdateUI();
}
function openAppUpdateSheet() {
  if (!appUpdate) return;
  const web = appUpdate.kind === 'web';
  document.getElementById('appUpdTitle').textContent = `الإصدار ${appUpdate.version} جاهز`;
  const mb = appUpdate.size ? ` · حجمه ${(appUpdate.size / 1048576).toFixed(1)} ميجا` : '';
  document.getElementById('appUpdSub').textContent = `إنت دلوقتي على الإصدار ${appVersion()}${mb}${web ? ' · التحديث متنزّل وجاهز' : ''}`;
  document.getElementById('appUpdNotes').innerHTML = (appUpdate.notes.length ? appUpdate.notes : ['تحسينات وإصلاحات عامة']).map(n => `<li>${esc(n)}</li>`).join('');
  const btn = document.getElementById('appUpdBtn');
  btn.disabled = false;
  btn.innerHTML = `${icon('download')} ${web ? 'تحديث الآن' : 'تحميل وتثبيت التحديث'}`;
  document.getElementById('appUpdProgressBox').classList.add('hidden');
  openOverlay('appUpd');
}
function startAppUpdate() {
  if (!appUpdate) return;
  if (appUpdate.kind === 'web') {
    document.getElementById('appUpdBtn').disabled = true;
    window.onAppUpdateProgress(100, 'applying');
    switchToVersion(appUpdate.version).then(ok => { if (!ok) document.getElementById('appUpdBtn').disabled = false; });
    return;
  }
  if (!IN_APP) { window.location.href = appUpdate.url; return; }
  document.getElementById('appUpdProgressBox').classList.remove('hidden');
  document.getElementById('appUpdBtn').disabled = true;
  window.onAppUpdateProgress(0, 'start');
  try { window.HesabatiHvacApp.downloadUpdate(appUpdate.url, appUpdate.version); } catch (e) { window.HesabatiHvacApp.openExternal(appUpdate.url); }
}
window.onAppUpdateProgress = function (pct, state) {
  const bar = document.getElementById('appUpdBar'), txt = document.getElementById('appUpdState'), btn = document.getElementById('appUpdBtn');
  document.getElementById('appUpdProgressBox').classList.remove('hidden');
  bar.style.width = Math.max(0, Math.min(100, Number(pct) || 0)) + '%';
  if (state === 'start') txt.textContent = 'بيبدأ التحميل...';
  else if (state === 'progress') txt.textContent = `جاري التحميل ${Math.round(pct)}%`;
  else if (state === 'install') { txt.textContent = 'تم التحميل ✓ — اضغط «تثبيت» في الشاشة اللي ظهرت'; btn.disabled = false; btn.innerHTML = `${icon('download')} تثبيت التحديث`; }
  else if (state === 'permission') { txt.textContent = 'فعّل «السماح من هذا المصدر» لتطبيق أرزقي HVAC، وارجع للتطبيق والتحميل هيكمل لوحده'; btn.disabled = false; }
  else if (state === 'failed') { txt.textContent = 'التحميل وقف — تأكد من الإنترنت وجرب تاني'; btn.disabled = false; }
  else if (state === 'applying') txt.textContent = 'جاري التحديث... التطبيق هيفتح تاني بالإصدار الجديد';
};
window.onAppResume = function () { if (Date.now() - lastAppCheck > 20 * 60 * 1000) checkAppUpdate(false); };
function initServiceWorker() {
  if (IN_APP) { console.info('HESABATI_HVAC_READY ' + APP_VERSION + ' app=' + appVersion()); setTimeout(() => checkAppUpdate(false), 1500); renderUpdateUI(); return; }
  document.getElementById('apkCard').classList.remove('hidden');
  if (IS_BETA || !('serviceWorker' in navigator) || location.protocol === 'file:') { renderUpdateUI(); return; }
  navigator.serviceWorker.addEventListener('message', e => { if (e.data && e.data.type === 'VERSION_AVAILABLE') evaluateUpdate(false); });
  navigator.serviceWorker.addEventListener('controllerchange', () => evaluateUpdate(false));
  const reg0 = () => navigator.serviceWorker.register('./service-worker.js', { updateViaCache: 'none' })
    .then(reg => {
      evaluateUpdate(false);
      setTimeout(notifyDueReminders, 1500);
      setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
      document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); });
    })
    .catch(err => { console.error('SW Error:', err); renderUpdateUI(); });
  if (document.readyState === 'complete') reg0(); else window.addEventListener('load', reg0);
}

/* =========================================================
   تشغيل التطبيق
   ========================================================= */
function buildPagesDOM() {
  const host = document.getElementById('pagesHost');
  let html = '';
  for (let i = 1; i <= PAGE_MAX; i++) {
    html += `<div class="page-overlay" id="page${i}">
      <header class="app-header">
        <button type="button" class="icon-btn" onclick="closeOverlay()" aria-label="رجوع">${icon('back')}</button>
        <div class="titles"><h1></h1><div class="sub"></div></div>
        <div class="pg-actions"></div>
      </header>
      <div class="container" id="page${i}Body"></div>
    </div>`;
  }
  host.innerHTML = html;
}
function initApp() {
  hydrateIcons();
  try { history.replaceState({ ovDepth: 0 }, ''); } catch (e) {}
  try { localStorage.setItem(NS + '__probe', '1'); localStorage.removeItem(NS + '__probe'); } catch (e) { storageOK = false; }
  if (!storageOK) document.getElementById('storageWarn').classList.remove('hidden');
  if (IS_BETA) document.getElementById('betaBar').classList.remove('hidden');
  loadAll();
  ensureDefaultPriceList();
  buildPagesDOM();
  document.getElementById('currencySelect').innerHTML = CURRENCIES.map(c => `<option value="${c.code}">${esc(c.country)} — ${esc(c.name)} (${esc(c.sym)})</option>`).join('');
  document.getElementById('pipeSizes').innerHTML = PIPE_SIZES.map(s => `<option value="${esc(s)}">`).join('');
  document.getElementById('brandList').innerHTML = BRANDS.map(s => `<option value="${esc(s)}">`).join('');
  document.getElementById('specList').innerHTML = SPECIALTIES.map(s => `<option value="${esc(s)}">`).join('');
  applyCurrency();
  applyTheme();
  // أزرار + / − في كل الخانات
  document.addEventListener('click', e => {
    const b = e.target.closest('.stepper button[data-step]');
    if (!b) return;
    const input = b.parentElement.querySelector('input');
    const v = Math.max(0, (parseFloat(input.value) || 0) + parseFloat(b.dataset.step));
    input.value = v === 0 ? '' : v;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  document.getElementById('invFilter').addEventListener('click', e => { const b = e.target.closest('.chip'); if (b) { docFilter = b.dataset.f; renderDocsView(); } });
  document.getElementById('printSheet').addEventListener('input', () => requestAnimationFrame(fitPreview));
  document.getElementById('aboutVersion').textContent = APP_VERSION;
  document.getElementById('verCurrent').textContent = IN_APP ? appVersion() : APP_VERSION;
  document.getElementById('copyYear').textContent = Math.max(2026, new Date().getFullYear());
  document.getElementById('apkLink').href = APK_URL;
  syncPaymentsToCustomers();
  showView('home');
  setTimeout(cleanupMedia, 4000);
}
initApp();
initServiceWorker();
