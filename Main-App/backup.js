/*
 * أرزقي — محرك النسخ الاحتياطي (محلي، من غير أي شبكة).
 *
 * بيجمع بيانات الأقسام الـ 12 بس، عن طريق بادئات مفاتيح التخزين بتاعة كل قسم
 * (اتحصرت من كود كل قسم)، ومن غير ما يلمس كود الأقسام نفسها:
 *   الكهرباء  ahmed_elec_* , hesabaty_*
 *   السباكة   hesabati_plumbing_*   + IndexedDB hesabati_plumbing_media (الصور)
 *   التكييف   hesabati_hvac_*       + IndexedDB hesabati_hvac_media     (الصور)
 *   النقاشة   hpaint_*
 *   الأرضيات  hflooring_*
 *   الجبس     hgyp_*
 *   المحارة   hplaster_*
 * أي مفاتيح تانية على نفس الموقع ما بتتنسخش ولا بتتمسح.
 */
(function () {
  'use strict';

  const FORMAT = 'hisabati-super-backup';
  const FORMAT_VERSION = 1;
  const SECTIONS = [
    { id: 'electrical', prefixes: ['ahmed_elec_', 'hesabaty_'], idb: [] },
    { id: 'plumbing', prefixes: ['hesabati_plumbing_'], idb: ['hesabati_plumbing_media'] },
    { id: 'hvac', prefixes: ['hesabati_hvac_'], idb: ['hesabati_hvac_media'] },
    { id: 'painting', prefixes: ['hpaint_'], idb: [] },
    { id: 'flooring', prefixes: ['hflooring_'], idb: [] },
    { id: 'gypsum', prefixes: ['hgyp_'], idb: [] },
    { id: 'plastering', prefixes: ['hplaster_'], idb: [] },
    { id: 'metalwork', prefixes: ['hmetal_'], idb: [] },
    { id: 'carpentry', prefixes: ['hcarp_'], idb: [] },
    { id: 'masonry', prefixes: ['hmas_'], idb: [] },
    { id: 'lowcurrent', prefixes: ['hlow_'], idb: [] },
    { id: 'aluminium', prefixes: ['halu_'], idb: [] },
    // بيانات أرزقي المشتركة: بياناتي في الفاتورة + إضافات الفواتير (الضمان)
    { id: 'arzaqi', prefixes: ['arzaqi_'], idb: [] }
  ];
  // مفاتيح مؤقتة/تقنية ما لهاش لازمة في النسخة
  const SKIP = k => /__probe$/.test(k);
  const sectionOf = key => SECTIONS.find(s => s.prefixes.some(p => key.startsWith(p)));

  /* ---------- IndexedDB (صور الأقسام: مخزن واحد اسمه media بنسخة 1، زي كود الأقسام بالظبط) ---------- */
  function idbOpen(name, create) {
    return new Promise((resolve) => {
      if (!window.indexedDB) return resolve(null);
      let created = false;
      const req = indexedDB.open(name, 1);
      req.onupgradeneeded = () => {
        created = true;
        if (create) req.result.createObjectStore('media');
        else { try { req.transaction.abort(); } catch (e) {} }
      };
      req.onsuccess = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('media')) { db.close(); if (created && !create) indexedDB.deleteDatabase(name); return resolve(null); }
        resolve(db);
      };
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    });
  }
  async function idbDump(name) {
    const db = await idbOpen(name, false);
    if (!db) return [];
    try {
      return await new Promise((resolve, reject) => {
        const tx = db.transaction('media', 'readonly');
        const st = tx.objectStore('media');
        const out = [];
        const cur = st.openCursor();
        cur.onsuccess = () => { const c = cur.result; if (c) { out.push([c.key, c.value]); c.continue(); } };
        tx.oncomplete = () => resolve(out);
        tx.onerror = () => reject(tx.error);
      });
    } finally { db.close(); }
  }
  async function idbReplace(name, entries) {
    const db = await idbOpen(name, true);
    if (!db) throw new Error('idb-unavailable');
    try {
      await new Promise((resolve, reject) => {
        const tx = db.transaction('media', 'readwrite');
        const st = tx.objectStore('media');
        st.clear();
        (entries || []).forEach(([k, v]) => st.put(v, k));
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
    } finally { db.close(); }
  }

  /* ---------- تجميع النسخة ---------- */
  async function collect() {
    const ls = {};
    const counts = {};
    SECTIONS.forEach(s => { counts[s.id] = 0; });
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (SKIP(k)) continue;
      const s = sectionOf(k);
      if (!s) continue;
      ls[k] = localStorage.getItem(k);
      counts[s.id]++;
    }
    const idb = {};
    for (const s of SECTIONS) {
      for (const name of s.idb) {
        const entries = await idbDump(name);
        if (entries.length) { idb[name] = entries; counts[s.id] += entries.length; }
      }
    }
    return {
      format: FORMAT, formatVersion: FORMAT_VERSION,
      createdAt: new Date().toISOString(),
      sections: counts,
      localStorage: ls,
      indexedDB: idb
    };
  }

  function validate(snap) {
    if (!snap || snap.format !== FORMAT || typeof snap.localStorage !== 'object') throw new Error('not-a-hisabati-backup');
    if (snap.formatVersion > FORMAT_VERSION) throw new Error('newer-format');
    for (const k of Object.keys(snap.localStorage)) {
      if (!sectionOf(k)) throw new Error('foreign-key:' + k); // نسخة سليمة ما فيهاش غير مفاتيح الأقسام
      if (typeof snap.localStorage[k] !== 'string') throw new Error('bad-value:' + k);
    }
    const allowedDbs = SECTIONS.flatMap(s => s.idb);
    for (const name of Object.keys(snap.indexedDB || {})) if (!allowedDbs.includes(name)) throw new Error('foreign-db:' + name);
    return true;
  }

  function hasLocalData() {
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (!SKIP(k) && sectionOf(k)) return true; }
    return false;
  }

  /* ---------- الاسترجاع: بيستبدل بيانات الأقسام بس ---------- */
  async function restore(snap) {
    validate(snap);
    // 1) نسخة أمان من الوضع الحالي قبل أي تغيير (للتراجع)
    await saveSafety(await collect());
    // 2) امسح مفاتيح الأقسام الحالية واكتب مفاتيح النسخة
    const remove = [];
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (sectionOf(k)) remove.push(k); }
    remove.forEach(k => localStorage.removeItem(k));
    for (const [k, v] of Object.entries(snap.localStorage)) localStorage.setItem(k, v);
    // 3) الصور
    for (const s of SECTIONS) for (const name of s.idb) {
      const entries = (snap.indexedDB || {})[name] || [];
      const existing = await idbOpen(name, false);
      if (existing) existing.close();
      if (entries.length || existing) await idbReplace(name, entries);
    }
    return true;
  }

  /* ---------- نسخة الأمان (قبل آخر استرجاع) في قاعدة خاصة باللانشر ---------- */
  const SAFE_DB = 'hisabati_super_v1';
  function safeDb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(SAFE_DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore('kv');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async function kv(mode, fn) {
    const db = await safeDb();
    try {
      return await new Promise((resolve, reject) => {
        const tx = db.transaction('kv', mode); const r = fn(tx.objectStore('kv'));
        tx.oncomplete = () => resolve(r && 'result' in r ? r.result : undefined);
        tx.onerror = () => reject(tx.error);
      });
    } finally { db.close(); }
  }
  const saveSafety = snap => kv('readwrite', s => s.put(snap, 'safety'));
  const loadSafety = () => kv('readonly', s => s.get('safety'));
  const clearSafety = () => kv('readwrite', s => s.delete('safety'));

  async function undoLastRestore() {
    const snap = await loadSafety();
    if (!snap) return false;
    validate(snap);
    const remove = [];
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (sectionOf(k)) remove.push(k); }
    remove.forEach(k => localStorage.removeItem(k));
    for (const [k, v] of Object.entries(snap.localStorage)) localStorage.setItem(k, v);
    for (const s of SECTIONS) for (const name of s.idb) {
      const entries = (snap.indexedDB || {})[name] || [];
      const existing = await idbOpen(name, false);
      if (existing) existing.close();
      if (entries.length || existing) await idbReplace(name, entries);
    }
    await clearSafety();
    return true;
  }

  window.HisabatiBackup = {
    SECTIONS, collect, validate, restore, hasLocalData,
    loadSafety, undoLastRestore,
    totalItems: snap => Object.values(snap.sections || {}).reduce((a, b) => a + b, 0)
  };
})();
