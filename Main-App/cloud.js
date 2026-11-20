/*
 * أرزقي — تسجيل الدخول بجوجل والنسخ الاحتياطي على Google Drive.
 *
 * - Google Identity Services (token client) — من غير أي سيرفر: البيانات بتروح من الجهاز
 *   لدرايف المستخدم على طول.
 * - الصلاحيات: openid email profile (الاسم والصورة والإيميل للعرض)
 *   + drive.file = التطبيق يشوف ويعدل الملفات اللي هو عملها بس، مش باقي ملفات الدرايف.
 * - التوكن في الذاكرة بس. المحفوظ على الجهاز: الاسم والإيميل والصورة علشان نعرضهم.
 */
(function () {
  'use strict';

  const CFG = window.HISABATI_CONFIG || {};
  const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
  const SCOPES = 'openid email profile ' + DRIVE_SCOPE;
  const GSI_SRC = 'https://accounts.google.com/gsi/client';
  const ACCOUNT_KEY = 'hisabati_super_account_v1';
  const API = 'https://www.googleapis.com/drive/v3';
  const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';
  const FOLDER_MIME = 'application/vnd.google-apps.folder';
  const FOLDER_NAME = CFG.driveFolderName || 'أرزقي — نسخ احتياطية';

  let token = null;          // { access_token, expires_at }
  let tokenClient = null;
  let gsiPromise = null;
  let pending = null;        // { resolve, reject }
  let folderId = null;

  const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const lsDel = k => { try { localStorage.removeItem(k); } catch (e) {} };

  function account() { try { return JSON.parse(lsGet(ACCOUNT_KEY) || 'null'); } catch (e) { return null; } }

  /* تطبيق الأندرويد المستقل: جوجل بتمنع تسجيل الدخول جوه WebView، فالتطبيق بيعمله بشكل أصلي
     (Google Identity AuthorizationClient) ويرجّع التوكن للصفحة. في المتصفح NATIVE = null. */
  const NATIVE = (window.HisabatiNative && typeof window.HisabatiNative.googleAuthorize === 'function') ? window.HisabatiNative : null;
  const nativePending = {};
  window.__hisabatiAuthResult = function (id, accessToken, grantedScopes, error) {
    const p = nativePending[id]; delete nativePending[id];
    if (!p) return;
    if (error || !accessToken) { p.reject(new Error(error || 'access_denied')); return; }
    if (String(grantedScopes || '').split(' ').indexOf(DRIVE_SCOPE) < 0) { p.reject(new Error('drive-not-granted')); return; }
    token = { access_token: accessToken, expires_at: Date.now() + 50 * 60 * 1000 };
    p.resolve(token);
  };
  function nativeToken(interactive) {
    return new Promise((resolve, reject) => {
      const id = 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2);
      nativePending[id] = { resolve, reject };
      try { NATIVE.googleAuthorize(id, SCOPES, !!interactive); }
      catch (e) { delete nativePending[id]; reject(new Error('native-failed')); }
    });
  }

  const isConfigured = () => !!NATIVE || !!CFG.googleClientId;

  function loadGsi() {
    if (window.google && window.google.accounts && window.google.accounts.oauth2) return Promise.resolve();
    if (gsiPromise) return gsiPromise;
    gsiPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = GSI_SRC; s.async = true; s.defer = true;
      s.onload = () => resolve();
      s.onerror = () => { gsiPromise = null; reject(new Error('offline')); };
      document.head.appendChild(s);
    });
    return gsiPromise;
  }
  // نحمّل مكتبة جوجل بدري (من غير أي طلب صلاحيات) علشان طلب التوكن يحصل جوه ضغطة المستخدم
  function preload() { if (!NATIVE && isConfigured()) loadGsi().then(initClient).catch(() => {}); }

  function initClient() {
    if (tokenClient) return tokenClient;
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CFG.googleClientId,
      scope: SCOPES,
      callback: resp => {
        const p = pending; pending = null;
        if (!p) return;
        if (resp.error) { p.reject(new Error(resp.error)); return; }
        if (!google.accounts.oauth2.hasGrantedAllScopes(resp, DRIVE_SCOPE)) { p.reject(new Error('drive-not-granted')); return; }
        token = { access_token: resp.access_token, expires_at: Date.now() + (Number(resp.expires_in) || 3600) * 1000 };
        p.resolve(token);
      },
      error_callback: err => {
        const p = pending; pending = null;
        if (p) p.reject(new Error((err && err.type) || 'popup_failed'));
      }
    });
    return tokenClient;
  }

  // لازم تتنادي مباشرة من ضغطة المستخدم (علشان نافذة جوجل ما تتمنعش)
  function requestToken(forceConsent) {
    if (!isConfigured()) return Promise.reject(new Error('not-configured'));
    if (token && token.expires_at - Date.now() > 60000) return Promise.resolve(token);
    if (NATIVE) return nativeToken(true);
    const go = () => new Promise((resolve, reject) => {
      pending = { resolve, reject };
      const acc = account();
      initClient().requestAccessToken({ prompt: forceConsent || !acc ? 'consent' : '', hint: acc ? acc.email : undefined });
    });
    if (tokenClient) return go();               // متزامن جوه الضغطة
    return loadGsi().then(() => go());          // أول مرة: المكتبة لسه بتتحمل
  }

  async function api(url, opts) {
    const o = Object.assign({}, opts || {});
    o.headers = Object.assign({ Authorization: 'Bearer ' + token.access_token }, o.headers || {});
    const res = await fetch(url, o);
    if (res.status === 401) { token = null; throw new Error('auth-expired'); }
    if (!res.ok) throw new Error('http-' + res.status);
    return res;
  }

  async function signIn() {
    await requestToken(true);
    const res = await api('https://www.googleapis.com/oauth2/v3/userinfo');
    const u = await res.json();
    const acc = { sub: u.sub, name: u.name || u.email, given: u.given_name || '', email: u.email, picture: u.picture || '' };
    lsSet(ACCOUNT_KEY, JSON.stringify(acc));
    return acc;
  }

  function signOut() {
    const t = token;
    token = null; folderId = null;
    lsDel(ACCOUNT_KEY);
    try {
      if (t && NATIVE) fetch('https://oauth2.googleapis.com/revoke?token=' + encodeURIComponent(t.access_token), { method: 'POST' }).catch(() => {});
      else if (t && window.google) google.accounts.oauth2.revoke(t.access_token, () => {});
    } catch (e) {}
  }

  /* ---------------- Drive ---------------- */
  const q = s => encodeURIComponent(s);
  async function ensureFolder() {
    if (folderId) return folderId;
    const query = `mimeType='${FOLDER_MIME}' and name='${FOLDER_NAME.replace(/'/g, "\\'")}' and trashed=false`;
    const r = await (await api(`${API}/files?q=${q(query)}&fields=files(id,name)&spaces=drive`)).json();
    if (r.files && r.files.length) { folderId = r.files[0].id; return folderId; }
    const c = await (await api(`${API}/files?fields=id`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: FOLDER_NAME, mimeType: FOLDER_MIME, appProperties: { hisabati: 'folder' } })
    })).json();
    folderId = c.id; return folderId;
  }

  async function listBackups() {
    // كل النسخ اللي التطبيق عملها (حتى اللي في فولدر "حساباتي" القديم قبل تغيير الاسم)
    const query = `trashed=false and appProperties has { key='hisabati' and value='backup' }`;
    const r = await (await api(`${API}/files?q=${q(query)}&orderBy=createdTime desc&pageSize=50&fields=files(id,name,createdTime,size,appProperties)&spaces=drive`)).json();
    return (r.files || []).map(f => ({
      id: f.id, name: f.name, createdTime: f.createdTime, size: Number(f.size) || 0,
      items: Number((f.appProperties || {}).items) || 0,
      device: (f.appProperties || {}).device || ''
    }));
  }

  function deviceLabel() {
    const ua = navigator.userAgent || '';
    if (/Android/i.test(ua)) return 'أندرويد';
    if (/iPhone|iPad/i.test(ua)) return 'آيفون';
    if (/Windows/i.test(ua)) return 'ويندوز';
    if (/Mac OS/i.test(ua)) return 'ماك';
    return 'جهاز';
  }

  async function uploadBackup(snap) {
    const fid = await ensureFolder();
    const d = new Date(snap.createdAt);
    const pad = n => String(n).padStart(2, '0');
    const name = `hisabati-backup-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}.json`;
    const items = window.HisabatiBackup.totalItems(snap);
    const meta = { name, parents: [fid], mimeType: 'application/json', appProperties: { hisabati: 'backup', items: String(items), device: deviceLabel() } };
    const body = JSON.stringify(snap);
    const boundary = 'hisabati' + Math.random().toString(36).slice(2);
    const multipart = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${body}\r\n--${boundary}--`;
    const r = await (await api(`${UPLOAD}?uploadType=multipart&fields=id,name,createdTime,size`, {
      method: 'POST', headers: { 'Content-Type': 'multipart/related; boundary=' + boundary }, body: multipart
    })).json();
    lsSet('hisabati_super_last_backup_v1', snap.createdAt);
    return r;
  }

  async function downloadBackup(id) {
    const res = await api(`${API}/files/${encodeURIComponent(id)}?alt=media`);
    const snap = await res.json();
    window.HisabatiBackup.validate(snap);
    return snap;
  }

  async function deleteBackup(id) {
    await api(`${API}/files/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }

  window.HisabatiCloud = {
    isConfigured, account, preload, requestToken, signIn, signOut, isNative: () => !!NATIVE,
    listBackups, uploadBackup, downloadBackup, deleteBackup,
    lastBackupAt: () => lsGet('hisabati_super_last_backup_v1'),
    hasToken: () => !!(token && token.expires_at - Date.now() > 60000)
  };
})();
