/*
 * حساباتي للأرضيات — التخزين المحلي (Offline First)
 * © 2026 أحمد حسن عبدالله - جميع الحقوق محفوظة.
 *
 * مهم: التطبيق ده ممكن يتنشر على نفس الدومين بتاع تطبيق «حساباتي» للكهرباء
 * (ahmedhassanabdallah.github.io). علشان كده كل مفاتيح التخزين هنا تبدأ بـ hflooring_
 * ومستحيل تقرا أو تكتب أو تمسح أي بيانات خاصة بتطبيق الكهرباء.
 */
(function (root) {
  'use strict';
  const DB_KEY = 'hflooring_db_v1';
  const BACKUP_KEY = 'hflooring_last_backup';
  const THEME_KEY = 'hflooring_theme';
  const APP_ID = 'hesabati-flooring';
  const COLLECTIONS = ['customers', 'projects', 'payments', 'expenses', 'projectMaterials', 'materials', 'stockMoves', 'workers', 'workLogs', 'workerTxns', 'docs', 'notes', 'floorTypes'];

  // كتالوج أنواع الأعمال (أسماء ووحدات فقط — الأسعار يحددها المستخدم). قابل للتعديل والحذف والإضافة.
  const CATEGORIES = { ceramic: 'سيراميك', porcelain: 'بورسلين', marble: 'رخام وجرانيت', parquet: 'باركيه وأرضيات خشبية', interlock: 'إنترلوك', other: 'أرضيات وأعمال أخرى' };
  const SEED = [
    ['ceramic', 'تركيب سيراميك أرضيات', 'م²'], ['ceramic', 'تركيب سيراميك حوائط', 'م²'], ['ceramic', 'سيراميك مطابخ وحمامات', 'م²'],
    ['ceramic', 'تركيب وزرات سيراميك', 'م.ط'], ['ceramic', 'تركيب سيراميك درج وسلالم', 'درجة'], ['ceramic', 'تركيب مقاسات كبيرة', 'م²'],
    ['ceramic', 'قص وتقطيع', 'م.ط'], ['ceramic', 'إزالة سيراميك قديم', 'م²'], ['ceramic', 'تسوية أرضيات', 'م²'], ['ceramic', 'ترويبة وتشطيب', 'م²'],
    ['porcelain', 'تركيب بورسلين أرضيات', 'م²'], ['porcelain', 'تركيب بورسلين حوائط', 'م²'], ['porcelain', 'بورسلين كبير الحجم / الألواح', 'م²'],
    ['porcelain', 'بورسلين مصقول / مطفي', 'م²'], ['porcelain', 'تركيب بنظام تسوية البلاط (Leveling)', 'م²'], ['porcelain', 'قص بزاوية 45 درجة', 'م.ط'],
    ['porcelain', 'حليات ونواصي بورسلين', 'م.ط'], ['porcelain', 'تركيب بورسلين خارجي', 'م²'],
    ['marble', 'تركيب أرضيات رخام', 'م²'], ['marble', 'تركيب أرضيات جرانيت', 'م²'], ['marble', 'تركيب سلالم رخام / جرانيت', 'درجة'],
    ['marble', 'نواصي وحليات', 'م.ط'], ['marble', 'وزرات رخام', 'م.ط'], ['marble', 'عتب', 'قطعة'], ['marble', 'تقطيع وتجليخ', 'م.ط'],
    ['marble', 'جلي وتلميع', 'م²'], ['marble', 'تركيب ألواح وقطع خاصة', 'قطعة'],
    ['parquet', 'تركيب HDF', 'م²'], ['parquet', 'تركيب MDF Flooring', 'م²'], ['parquet', 'تركيب SPC', 'م²'], ['parquet', 'تركيب LVT', 'م²'],
    ['parquet', 'تركيب WPC', 'م²'], ['parquet', 'تركيب باركيه طبيعي', 'م²'], ['parquet', 'تركيب Herringbone', 'م²'], ['parquet', 'تركيب Chevron', 'م²'],
    ['parquet', 'فرش فوم وعوازل', 'م²'], ['parquet', 'تركيب وزرات وإكسسوارات', 'م.ط'], ['parquet', 'معالجة وتجهيز الأرضية', 'م²'],
    ['interlock', 'إنترلوك أرصفة', 'م²'], ['interlock', 'إنترلوك مداخل', 'م²'], ['interlock', 'إنترلوك جراجات', 'م²'], ['interlock', 'إنترلوك حدائق', 'م²'],
    ['interlock', 'إنترلوك طرق وساحات', 'م²'], ['interlock', 'حفر', 'م³'], ['interlock', 'ردم', 'م³'], ['interlock', 'طبقة سن', 'م³'],
    ['interlock', 'طبقة رمل', 'م³'], ['interlock', 'دمك وتسوية', 'م²'], ['interlock', 'تركيب بردورات', 'م.ط'], ['interlock', 'قص وتشكيل قطع', 'م.ط'],
    ['other', 'بلاط أسمنتي', 'م²'], ['other', 'موزايكو', 'م²'], ['other', 'بلاط عادي', 'م²'], ['other', 'حجر طبيعي', 'م²'], ['other', 'حجر صناعي', 'م²'],
    ['other', 'بدائل الرخام', 'م²'], ['other', 'أرضيات PVC', 'م²'], ['other', 'أرضيات فينيل', 'م²'], ['other', 'أرضيات إيبوكسي', 'م²'],
    ['other', 'أرضيات صناعية', 'م²'], ['other', 'أرضيات تيرازو', 'م²']
  ];

  function uid(prefix) { return (prefix || 'id') + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function nowISO() { return new Date().toISOString(); }
  function todayISO() { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); }

  function seedFloorTypes() {
    return SEED.map(([cat, name, unit], i) => ({ id: 'ft' + i.toString(36) + Math.random().toString(36).slice(2, 6), cat, name, unit, basis: 'measure', scope: 'labor', laborPrice: '', materialPrice: '', waste: '' }));
  }
  function emptyDB() {
    const db = { app: APP_ID, schema: 1, createdAt: nowISO(), settings: defaultSettings(), counters: {} };
    COLLECTIONS.forEach(k => { db[k] = []; });
    db.floorTypes = seedFloorTypes();
    return db;
  }
  function defaultSettings() {
    return {
      currency: 'EGP', theme: 'auto', bizName: '', ownerName: '', phone: '', phone2: '', address: '',
      logo: '', showLogo: true, invoiceNotes: '', quoteTerms: 'العرض ساري لمدة 15 يوماً من تاريخه.', defaultWaste: 10,
      categories: Object.assign({}, CATEGORIES), calc: {}
    };
  }
  // تصحيح أي بيانات ناقصة أو تالفة بدون حذف أي سجل
  function normalize(db) {
    if (!db || typeof db !== 'object') return emptyDB();
    db.app = APP_ID;
    db.settings = Object.assign(defaultSettings(), db.settings || {});
    if (!db.settings.categories || typeof db.settings.categories !== 'object') db.settings.categories = Object.assign({}, CATEGORIES);
    if (!db.settings.calc || typeof db.settings.calc !== 'object') db.settings.calc = {};
    db.counters = db.counters && typeof db.counters === 'object' ? db.counters : {};
    COLLECTIONS.forEach(k => { if (!Array.isArray(db[k])) db[k] = []; db[k] = db[k].filter(x => x && typeof x === 'object'); db[k].forEach(x => { if (!x.id) x.id = uid(k.slice(0, 2)); }); });
    db.projects.forEach(p => { if (!Array.isArray(p.items)) p.items = []; if (!Array.isArray(p.areas)) p.areas = []; if (!Array.isArray(p.additions)) p.additions = []; p.items.forEach(it => { if (!it.id) it.id = uid('it'); }); });
    db.docs.forEach(d => { if (!Array.isArray(d.rows)) d.rows = []; if (!Array.isArray(d.additions)) d.additions = []; d.rows.forEach(r => { if (!r.id) r.id = uid('r'); }); });
    return db;
  }

  const Store = {
    DB_KEY, BACKUP_KEY, THEME_KEY, APP_ID, COLLECTIONS, CATEGORIES,
    db: null, uid, todayISO, nowISO, lastError: null,
    load() {
      let parsed = null;
      try { const raw = localStorage.getItem(DB_KEY); if (raw) parsed = JSON.parse(raw); } catch (e) { this.lastError = e; }
      this.db = parsed ? normalize(parsed) : emptyDB();
      if (!parsed) this.save();
      // طلب تخزين دائم من المتصفح علشان البيانات ما تتمسحش تلقائياً
      try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); } catch (e) {}
      return this.db;
    },
    save() {
      try {
        this.db.updatedAt = nowISO();
        localStorage.setItem(DB_KEY, JSON.stringify(this.db));
        try { localStorage.setItem(THEME_KEY, this.db.settings.theme || 'auto'); } catch (e) {}
        this.lastError = null;
        return true;
      } catch (e) { this.lastError = e; return false; }
    },
    sizeKB() { try { return Math.round((localStorage.getItem(DB_KEY) || '').length * 2 / 1024); } catch (e) { return 0; } },
    get(col, id) { return (this.db[col] || []).find(x => x.id === id) || null; },
    upsert(col, obj) {
      const list = this.db[col];
      if (!obj.id) obj.id = uid(col.slice(0, 2));
      const i = list.findIndex(x => x.id === obj.id);
      obj.updatedAt = nowISO();
      if (i >= 0) list[i] = obj; else { obj.createdAt = obj.createdAt || nowISO(); list.push(obj); }
      return obj;
    },
    remove(col, id) { const list = this.db[col]; const i = list.findIndex(x => x.id === id); if (i >= 0) list.splice(i, 1); },
    nextNumber(type, prefix) {
      const c = this.db.counters;
      c[type] = (parseInt(c[type], 10) || 0) + 1;
      return `${prefix || type.toUpperCase()}-${String(c[type]).padStart(4, '0')}`;
    },
    // كل ما هو مرتبط بالمشروع (لعرضه قبل الحذف)
    projectLinks(id) {
      const d = this.db;
      return {
        payments: d.payments.filter(x => x.projectId === id), expenses: d.expenses.filter(x => x.projectId === id),
        materials: d.projectMaterials.filter(x => x.projectId === id), logs: d.workLogs.filter(x => x.projectId === id),
        docs: d.docs.filter(x => x.projectId === id), notes: d.notes.filter(x => x.projectId === id)
      };
    },
    deleteProject(id) {
      const d = this.db;
      ['payments', 'expenses', 'projectMaterials', 'workLogs', 'docs'].forEach(k => { d[k] = d[k].filter(x => x.projectId !== id); });
      d.notes.forEach(n => { if (n.projectId === id) n.projectId = null; });
      this.remove('projects', id);
    },
    customerLinks(id) {
      const d = this.db;
      return { projects: d.projects.filter(x => x.customerId === id), docs: d.docs.filter(x => x.customerId === id), payments: d.payments.filter(x => x.customerId === id) };
    },
    materialInUse(id) {
      const d = this.db;
      return d.projectMaterials.some(x => x.materialId === id) || d.stockMoves.some(x => x.materialId === id) || d.docs.some(x => (x.rows || []).some(r => r.materialId === id));
    },
    exportObject() { return Object.assign({}, this.db, { exportedAt: nowISO(), backupOf: APP_ID }); },
    markBackup() { try { localStorage.setItem(BACKUP_KEY, String(Date.now())); } catch (e) {} },
    lastBackup() { try { return parseInt(localStorage.getItem(BACKUP_KEY), 10) || 0; } catch (e) { return 0; } },
    // يقبل نسخ «حساباتي للأرضيات» فقط (مش نسخ تطبيق الكهرباء) — علشان ما يحصلش خلط بين التطبيقات
    validateBackup(obj) {
      if (!obj || typeof obj !== 'object') return 'الملف غير صالح';
      if (obj.app !== APP_ID) return obj.app === 'hesabaty' || Array.isArray(obj.invoices) ? 'ده ملف نسخة من تطبيق «حساباتي» للكهرباء، مش من تطبيق الأرضيات' : 'الملف ده مش نسخة احتياطية من «حساباتي للأرضيات»';
      return null;
    },
    restore(obj) {
      const db = normalize(JSON.parse(JSON.stringify(obj)));
      delete db.exportedAt; delete db.backupOf;
      this.db = db;
      return this.save();
    },
    wipe() { this.db = emptyDB(); return this.save(); }
  };
  root.Store = Store;
})(typeof self !== 'undefined' ? self : this);
