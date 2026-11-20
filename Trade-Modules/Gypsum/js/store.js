/*
 * أرزقي للجبس والديكورات — التخزين المحلي (Offline First)
 * كل البيانات محفوظة على الجهاز فقط، بمفاتيح مستقلة تماماً عن تطبيق أرزقي للكهرباء.
 * © 2026 أحمد حسن عبدالله - جميع الحقوق محفوظة.
 */
(function (root) {
  'use strict';
  const HG = root.HG = root.HG || {};
  const PREFIX = 'hgyp_';                 // بادئة خاصة بتطبيق الجبس فقط
  const DB_KEY = PREFIX + 'db_v1';
  const SETTINGS_KEY = PREFIX + 'settings_v1'; // نسخة صغيرة للمظهر قبل تحميل الصفحة

  const LISTS = ['customers', 'projects', 'payments', 'stock', 'moves', 'workers', 'attendance', 'advances', 'workerPays', 'expenses', 'notes', 'docs'];

  function blank() {
    const db = {
      v: 1,
      settings: {
        bizName: '', ownerName: '', phone: '', phone2: '', address: '', logo: '', showLogo: true,
        currency: 'EGP', theme: 'auto', defaultWaste: 10, defaultScope: 'labor',
        docFooter: 'شكراً لثقتكم — الأسعار حسب الاتفاق والمعاينة.', seq: {}, seeded: false
      },
      lastBackup: 0
    };
    LISTS.forEach(k => { db[k] = []; });
    return db;
  }

  function uid(p) { return (p || 'x') + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  function normalize(raw) {
    const db = blank();
    if (!raw || typeof raw !== 'object') return db;
    Object.assign(db.settings, raw.settings || {});
    db.settings.seq = Object.assign({}, (raw.settings || {}).seq || {});
    LISTS.forEach(k => { db[k] = Array.isArray(raw[k]) ? raw[k].filter(x => x && typeof x === 'object') : []; });
    db.projects.forEach(p => { p.items = Array.isArray(p.items) ? p.items : []; p.additions = Array.isArray(p.additions) ? p.additions : []; });
    db.lastBackup = Number(raw.lastBackup) || 0;
    return db;
  }

  let db = blank();
  let saveTimer = null;
  let storageOk = true;

  function load() {
    try {
      const s = localStorage.getItem(DB_KEY);
      db = normalize(s ? JSON.parse(s) : null);
    } catch (e) { db = blank(); storageOk = false; }
    if (!db.settings.seeded) {
      db.stock = HG.DEFAULT_STOCK.map(s => Object.assign({ id: uid('m') }, s));
      db.settings.seeded = true;
      saveNow();
    }
    return db;
  }
  function saveNow() {
    clearTimeout(saveTimer); saveTimer = null;
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(db));
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({ theme: db.settings.theme }));
      storageOk = true;
      return true;
    } catch (e) { storageOk = false; return false; }
  }
  function save() { clearTimeout(saveTimer); saveTimer = setTimeout(saveNow, 250); }
  // حفظ فوري عند إغلاق التطبيق أو الخروج منه
  if (root.addEventListener) {
    root.addEventListener('pagehide', () => { if (saveTimer) saveNow(); });
    root.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && saveTimer) saveNow(); });
  }

  function nextNumber(type) {
    const seq = db.settings.seq;
    seq[type] = (Number(seq[type]) || 0) + 1;
    save();
    return seq[type];
  }

  function exportData() { return JSON.stringify(Object.assign({ app: 'hesabati-gypsum', exported: new Date().toISOString() }, db), null, 1); }
  function importData(text, mode) {
    const raw = JSON.parse(text);
    if (!raw || (raw.app && raw.app !== 'hesabati-gypsum')) throw new Error('الملف مش نسخة من أرزقي للجبس');
    const inc = normalize(raw);
    if (mode === 'merge') {
      LISTS.forEach(k => {
        const ids = new Set(db[k].map(x => x.id));
        inc[k].forEach(x => { if (!ids.has(x.id)) db[k].push(x); });
      });
    } else {
      const keepLogo = db.settings.logo;
      db = inc;
      if (!db.settings.logo && keepLogo) db.settings.logo = keepLogo;
      db.settings.seeded = true;
    }
    saveNow();
    return db;
  }
  function wipe() { db = blank(); db.settings.seeded = false; saveNow(); return load(); }

  HG.store = {
    DB_KEY, LISTS, uid, load, save, saveNow, nextNumber, exportData, importData, wipe,
    get db() { return db; },
    get ok() { return storageOk; }
  };
})(typeof self !== 'undefined' ? self : this);
