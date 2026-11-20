/*
 * HESABATI PLASTER — طبقة التخزين المحلي (Offline First)
 *
 * عزل البيانات: كل مفاتيح التخزين تبدأ بـ "hplaster_" فقط.
 * التطبيق لا يقرأ ولا يكتب ولا يمسح أي مفتاح يخص تطبيقات حساباتي الأخرى
 * (الكهرباء وغيرها) حتى لو كانوا على نفس النطاق ahmedhassanabdallah.github.io.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./catalog.js'));
  else root.PlasterStore = factory(root.PlasterCatalog);
})(typeof self !== 'undefined' ? self : this, function (Cat) {
  'use strict';

  const PREFIX = 'hplaster_';
  const DB_KEY = PREFIX + 'db_v1';
  const THEME_KEY = PREFIX + 'theme';
  const BACKUP_KEY = PREFIX + 'last_backup';
  const DB_VERSION = 1;
  const SCRATCH = 'scratch';

  function clone(o) { return o == null ? o : JSON.parse(JSON.stringify(o)); }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function today() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function storage() {
    try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { return null; }
  }

  function defaultSettings() {
    return {
      currency: 'EGP', theme: 'auto', dialCode: '20',
      bizName: '', bizTitle: 'أعمال المحارة والجرافيت وتشطيبات الواجهات', bizPhone: '', bizAddress: '',
      logo: '', showLogo: true,
      terms: 'الأسعار حسب المقاسات الفعلية على الطبيعة.\nالكميات تقديرية وقابلة للتعديل حسب حالة الموقع.',
      quoteValidity: 15,
      defaults: clone(Cat.DEFAULTS)
    };
  }

  function seedMaterials() {
    return Cat.SEED_MATERIALS.map(m => Object.assign({
      id: uid(), brand: '', color: '', grain: '', supplier: '', buyPrice: '', sellPrice: '', openQty: 0, minQty: '',
      rateMode: '', rate: '', kgPerMm: '', seed: true
    }, clone(m)));
  }

  function emptyDB() {
    return {
      version: DB_VERSION, created: new Date().toISOString(),
      settings: defaultSettings(),
      counters: { project: 0, receipt: 0, doc: 0 },
      clients: [], workers: [], workerPays: [],
      materials: seedMaterials(), movements: [],
      projects: [newProjectRaw({ id: SCRATCH, name: 'حسابات سريعة', scratch: true })]
    };
  }

  function newProjectRaw(over) {
    return Object.assign({
      id: uid(), no: 0, name: '', clientId: '', address: '', buildingType: '', floors: '', facades: '',
      status: 'quote', createdAt: today(), startDate: '', notes: '',
      pricing: 'items', lumpPrice: '', discount: '', retentionPct: '', matCostMode: 'estimate',
      zones: [], items: [],
      phases: Cat.PHASES.map(p => ({ key: p.key, name: p.name, status: 'pending', price: '' })),
      payments: [], expenses: [], labor: []
    }, over || {});
  }

  /* ---------- الترقية والإصلاح عند التحميل ---------- */
  function normalize(db) {
    const base = emptyDB();
    if (!db || typeof db !== 'object') return base;
    db.version = DB_VERSION;
    db.settings = Object.assign(defaultSettings(), db.settings || {});
    db.settings.defaults = Object.assign(clone(Cat.DEFAULTS), db.settings.defaults || {});
    Object.keys(Cat.DEFAULTS).forEach(k => {
      if (typeof Cat.DEFAULTS[k] === 'object') db.settings.defaults[k] = Object.assign(clone(Cat.DEFAULTS[k]), db.settings.defaults[k] || {});
    });
    db.counters = Object.assign({ project: 0, receipt: 0, doc: 0 }, db.counters || {});
    ['clients', 'workers', 'workerPays', 'materials', 'movements', 'projects'].forEach(k => { if (!Array.isArray(db[k])) db[k] = []; });
    db.projects = db.projects.map(p => {
      const q = newProjectRaw(p);
      ['zones', 'items', 'payments', 'expenses', 'labor'].forEach(k => { if (!Array.isArray(q[k])) q[k] = []; });
      if (!Array.isArray(q.phases) || !q.phases.length) q.phases = Cat.PHASES.map(x => ({ key: x.key, name: x.name, status: 'pending', price: '' }));
      return q;
    });
    if (!db.projects.find(p => p.id === SCRATCH)) db.projects.unshift(newProjectRaw({ id: SCRATCH, name: 'حسابات سريعة', scratch: true }));
    return db;
  }

  let DB = null;
  let saveTimer = null;
  let lastError = null;

  function load() {
    const ls = storage();
    let raw = null;
    try { raw = ls ? ls.getItem(DB_KEY) : null; } catch (e) { raw = null; }
    try { DB = normalize(raw ? JSON.parse(raw) : null); } catch (e) { DB = emptyDB(); }
    return DB;
  }
  function db() { return DB || load(); }
  function saveNow() {
    clearTimeout(saveTimer); saveTimer = null;
    const ls = storage();
    if (!ls || !DB) return false;
    try { ls.setItem(DB_KEY, JSON.stringify(DB)); lastError = null; return true; }
    catch (e) { lastError = e; return false; }
  }
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, 250);
  }
  function flush() { if (saveTimer) saveNow(); }

  /* ---------- النسخ الاحتياطي ---------- */
  function exportJSON() {
    flush();
    return JSON.stringify({ app: 'HESABATI_PLASTER', exported: new Date().toISOString(), data: DB }, null, 1);
  }
  function importJSON(text) {
    const parsed = JSON.parse(text);
    const data = parsed && parsed.app === 'HESABATI_PLASTER' ? parsed.data : null;
    if (!data || !Array.isArray(data.projects)) throw new Error('الملف ليس نسخة احتياطية من حساباتي للمحارة');
    DB = normalize(data);
    saveNow();
    return DB;
  }
  // مسح بيانات هذا التطبيق فقط (مفاتيح hplaster_) — لا يلمس أي تطبيق آخر
  function resetAll() {
    const ls = storage();
    if (ls) {
      const keys = [];
      for (let i = 0; i < ls.length; i++) { const k = ls.key(i); if (k && k.indexOf(PREFIX) === 0) keys.push(k); }
      keys.forEach(k => ls.removeItem(k));
    }
    DB = emptyDB();
    saveNow();
    return DB;
  }
  function markBackup() { try { const ls = storage(); if (ls) ls.setItem(BACKUP_KEY, String(Date.now())); } catch (e) {} }
  function lastBackup() { try { const ls = storage(); return ls ? Number(ls.getItem(BACKUP_KEY)) || 0 : 0; } catch (e) { return 0; } }

  /* ---------- المصانع (إنشاء العناصر الجديدة) ---------- */
  function newMeasure(mode) {
    return {
      mode: mode || 'room', unit: 'm',
      room: { l: '', w: '', h: '', count: 1, walls: true, ceiling: false },
      shapes: [{ type: 'rect', name: '', a: '', b: '', h: '', count: 1, sign: 1 }],
      facade: { width: '', floors: '', floorH: 3, floorList: [], extraH: '', count: 1 },
      linear: [{ name: '', len: '', count: 1 }], girth: '',
      manual: { area: '', linear: '' },
      openings: [], rules: clone(db().settings.defaults.rules), additions: []
    };
  }

  function findMaterial(pred) { return db().materials.find(pred) || null; }

  // ربط الخامة الافتراضية بخامة المخزن المطابقة (سعر، عبوة، معدل)
  function linkCoverage(params, name) {
    const m = findMaterial(x => x.name === (name || params.name));
    if (!m) return params;
    params.materialId = m.id;
    if (m.buyPrice !== '' && m.buyPrice != null) params.price = m.buyPrice;
    if (m.sellPrice !== '' && m.sellPrice != null) params.sell = m.sellPrice;
    if (m.packSize) params.packSize = m.packSize;
    if (m.rateMode && m.rate !== '' && m.rate != null) { params.rateMode = m.rateMode; params.rate = m.rate; }
    return params;
  }

  function newCalc(wt) {
    const D = db().settings.defaults;
    const calc = { type: wt.calc, extras: [] };
    const preset = wt.preset ? Object.assign(clone(D[wt.preset] || {}), clone(wt.over || {})) : {};
    if (wt.calc === 'cement') {
      const c = findMaterial(m => m.kind === 'cement');
      const s = findMaterial(m => m.kind === 'sand');
      calc.cement = Object.assign(preset, {
        cementPrice: c ? c.buyPrice : '', cementSell: c && c.sellPrice !== '' ? c.sellPrice : '', cementId: c ? c.id : null, cementName: c ? c.name : 'أسمنت',
        sandPrice: s ? s.buyPrice : '', sandSell: s && s.sellPrice !== '' ? s.sellPrice : '', sandId: s ? s.id : null, sandName: s ? s.name : 'رمل'
      });
      if (c && c.packSize) calc.cement.bagKg = c.packSize;
    } else if (wt.calc === 'premix') {
      const m = findMaterial(x => x.kind === 'premix' && (wt.preset === 'gypsum' ? /جبس/.test(x.name) : !/جبس/.test(x.name)));
      calc.premix = Object.assign(preset, { price: '', sell: '' });
      if (m) {
        calc.premix.materialId = m.id; calc.premix.name = m.name;
        if (m.buyPrice !== '') calc.premix.price = m.buyPrice;
        if (m.sellPrice !== '') calc.premix.sell = m.sellPrice;
        if (m.packSize) calc.premix.bagKg = m.packSize;
        if (m.kgPerMm !== '' && m.kgPerMm != null) calc.premix.kgPerMm = m.kgPerMm;
      }
    } else if (wt.calc === 'coverage') {
      calc.main = linkCoverage(Object.assign(preset, { price: preset.price || '', sell: '' }));
    } else if (wt.calc === 'graffiato') {
      calc.main = linkCoverage(Object.assign(preset, { price: '', sell: '' }));
      calc.primerOn = true;
      calc.primer = linkCoverage(Object.assign(clone(D.graffitoPrimer), { price: '', sell: '' }), 'برايمر');
      calc.grain = (wt.over && wt.over.name) || '';
      calc.color = '';
    } else if (wt.calc === 'mesh') {
      calc.mesh = Object.assign(preset, { price: '', sell: '' });
      const m = findMaterial(x => x.kind === 'mesh');
      if (m) { calc.mesh.materialId = m.id; if (m.buyPrice !== '') calc.mesh.price = m.buyPrice; if (m.packSize) calc.mesh.rollArea = m.packSize; }
    }
    if (wt.meshOn) {
      calc.meshOn = true;
      calc.mesh = Object.assign(clone(D.mesh), { price: '', sell: '' });
      const m = findMaterial(x => x.kind === 'mesh');
      if (m) { calc.mesh.materialId = m.id; if (m.buyPrice !== '') calc.mesh.price = m.buyPrice; }
    }
    calc.second = Object.assign(clone(D.primer), { price: '', sell: '' });
    calc.secondOn = false;
    return calc;
  }

  function newItem(wtKey, opts) {
    const wt = Cat.workType(wtKey);
    opts = opts || {};
    const mm = wt.measureMode || (wt.unit === 'lump' || wt.unit === 'day' || wt.unit === 'piece' ? 'manual' : 'room');
    return Object.assign({
      id: uid(), workType: wt.key, section: wt.section, title: wt.name, location: '', phase: wt.phase,
      unit: wt.unit, supply: 'labor', laborRate: '', matMarkup: '', qtySource: wt.qtySource || 'area', areaPct: '',
      qtyManual: '', useManual: false, zoneId: '', measure: newMeasure(mm), calc: newCalc(wt),
      progress: '', notes: '', createdAt: today()
    }, opts);
  }

  function newZone(kind, opts) {
    const zk = Cat.ZONE_KINDS[kind] || Cat.ZONE_KINDS.other;
    const p = opts && opts.project;
    const color = Cat.ZONE_COLORS[(p ? p.zones.length : 0) % Cat.ZONE_COLORS.length];
    const SHORT = { room: 'غرفة', wall: 'حوائط', other: 'منطقة' };
    const z = { id: uid(), kind, name: SHORT[kind] || zk.name, color, finish: '', notes: '', measure: newMeasure(zk.mode) };
    if (zk.mode === 'facade') z.measure.rules = Object.assign(clone(db().settings.defaults.rules), {});
    return z;
  }

  function newProject(over) {
    const d = db();
    d.counters.project += 1;
    const p = newProjectRaw(Object.assign({ no: d.counters.project, name: 'مشروع ' + d.counters.project }, over || {}));
    d.projects.push(p);
    save();
    return p;
  }

  function project(id) { return db().projects.find(p => p.id === id) || null; }
  function client(id) { return db().clients.find(c => c.id === id) || null; }
  function worker(id) { return db().workers.find(w => w.id === id) || null; }
  function material(id) { return db().materials.find(m => m.id === id) || null; }

  return {
    PREFIX, DB_KEY, THEME_KEY, SCRATCH,
    clone, uid, today, load, db, save, saveNow, flush, normalize, emptyDB,
    exportJSON, importJSON, resetAll, markBackup, lastBackup,
    newMeasure, newCalc, newItem, newZone, newProject, newProjectRaw,
    project, client, worker, material, lastError: () => lastError
  };
});
