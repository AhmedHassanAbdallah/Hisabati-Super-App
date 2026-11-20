/*
 * HESABATI PLASTER — الكتالوج والقيم الافتراضية
 * كل القيم هنا "استرشادية" وقابلة للتعديل من داخل التطبيق.
 * لا تعتبر أي قيمة هنا حقيقة ثابتة: راجع نشرة المنتج والشركة المصنعة دائماً.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PlasterCatalog = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const CURRENCIES = [
    { code: 'EGP', country: 'مصر', name: 'جنيه مصري', sym: 'ج.م', dec: 2 },
    { code: 'SAR', country: 'السعودية', name: 'ريال سعودي', sym: 'ر.س', dec: 2 },
    { code: 'AED', country: 'الإمارات', name: 'درهم إماراتي', sym: 'د.إ', dec: 2 },
    { code: 'KWD', country: 'الكويت', name: 'دينار كويتي', sym: 'د.ك', dec: 3 },
    { code: 'BHD', country: 'البحرين', name: 'دينار بحريني', sym: 'د.ب', dec: 3 },
    { code: 'QAR', country: 'قطر', name: 'ريال قطري', sym: 'ر.ق', dec: 2 },
    { code: 'OMR', country: 'عُمان', name: 'ريال عماني', sym: 'ر.ع', dec: 3 },
    { code: 'JOD', country: 'الأردن', name: 'دينار أردني', sym: 'د.أ', dec: 3 },
    { code: 'IQD', country: 'العراق', name: 'دينار عراقي', sym: 'د.ع', dec: 0 },
    { code: 'LYD', country: 'ليبيا', name: 'دينار ليبي', sym: 'د.ل', dec: 3 },
    { code: 'TND', country: 'تونس', name: 'دينار تونسي', sym: 'د.ت', dec: 3 },
    { code: 'MAD', country: 'المغرب', name: 'درهم مغربي', sym: 'د.م', dec: 2 },
    { code: 'DZD', country: 'الجزائر', name: 'دينار جزائري', sym: 'د.ج', dec: 2 },
    { code: 'LBP', country: 'لبنان', name: 'ليرة لبنانية', sym: 'ل.ل', dec: 0 },
    { code: 'SYP', country: 'سوريا', name: 'ليرة سورية', sym: 'ل.س', dec: 0 },
    { code: 'YER', country: 'اليمن', name: 'ريال يمني', sym: 'ر.ي', dec: 0 },
    { code: 'SDG', country: 'السودان', name: 'جنيه سوداني', sym: 'ج.س', dec: 2 },
    { code: 'MRU', country: 'موريتانيا', name: 'أوقية موريتانية', sym: 'أ.م', dec: 2 },
    { code: 'ILS', country: 'فلسطين', name: 'شيكل', sym: '₪', dec: 2 },
    { code: 'SOS', country: 'الصومال', name: 'شلن صومالي', sym: 'ش.ص', dec: 0 },
    { code: 'DJF', country: 'جيبوتي', name: 'فرنك جيبوتي', sym: 'ف.ج', dec: 0 },
    { code: 'KMF', country: 'جزر القمر', name: 'فرنك قمري', sym: 'ف.ق', dec: 0 },
    { code: 'USD', country: 'دولار أمريكي', name: 'دولار', sym: '$', dec: 2 }
  ];

  const SECTIONS = {
    interior: { name: 'المحارة الداخلية', icon: 'trowel', color: '#24508a' },
    exterior: { name: 'المحارة الخارجية', icon: 'building', color: '#0f766e' },
    graffiato: { name: 'الجرافيت', icon: 'texture', color: '#b45309' },
    putty: { name: 'الدهارة والمعجون والتجهيز', icon: 'roller', color: '#7c3aed' },
    facade: { name: 'تشطيبات الواجهات', icon: 'facade', color: '#c2410c' },
    site: { name: 'تكاليف الموقع والتجهيزات', icon: 'truck', color: '#475569' },
    other: { name: 'أعمال أخرى', icon: 'list', color: '#64748b' }
  };

  const PHASES = [
    { key: 'prep', name: 'تجهيز السطح' },
    { key: 'plaster', name: 'أعمال المحارة' },
    { key: 'treat', name: 'المعالجة' },
    { key: 'dahara', name: 'الدهارة' },
    { key: 'putty', name: 'المعجون' },
    { key: 'primer', name: 'البرايمر' },
    { key: 'finish', name: 'الجرافيت / التشطيب النهائي' },
    { key: 'handover', name: 'التسليم' }
  ];

  const LOCATIONS = {
    interior: ['حوائط', 'أسقف', 'أعمدة', 'كمرات', 'سلالم', 'مناور', 'حمامات', 'مطابخ', 'طرقات ومداخل'],
    exterior: ['واجهة', 'سور', 'بلكونات', 'أعمدة خارجية', 'كرانيش', 'مناور', 'أسطح وجدران معرضة', 'دروة السطح'],
    graffiato: ['واجهة رئيسية', 'واجهة خلفية', 'واجهة جانبية', 'سور', 'حوائط داخلية', 'بلكونات'],
    putty: ['حوائط داخلية', 'أسقف', 'واجهات', 'أعمدة', 'كمرات'],
    facade: ['الواجهة الرئيسية', 'الواجهة الخلفية', 'الواجهة الجانبية', 'السور', 'البلكونات', 'الأعمدة', 'الكرانيش'],
    site: [],
    other: []
  };

  const ZONE_KINDS = {
    room: { name: 'غرفة / مكان داخلي', mode: 'room' },
    wall: { name: 'حوائط / أسقف بأشكال', mode: 'shapes' },
    facade_main: { name: 'الواجهة الرئيسية', mode: 'facade' },
    facade_back: { name: 'الواجهة الخلفية', mode: 'facade' },
    facade_side: { name: 'الواجهة الجانبية', mode: 'facade' },
    fence: { name: 'السور', mode: 'shapes' },
    balcony: { name: 'البلكونات', mode: 'shapes' },
    columns: { name: 'الأعمدة', mode: 'shapes' },
    cornice: { name: 'الكرانيش', mode: 'linear' },
    lightwell: { name: 'المنور', mode: 'shapes' },
    stairs: { name: 'السلالم', mode: 'shapes' },
    other: { name: 'منطقة أخرى', mode: 'manual' }
  };

  const ZONE_COLORS = ['#f97316', '#24508a', '#0f9f6e', '#b45309', '#7c3aed', '#e11d48', '#0891b2', '#64748b'];

  /* القيم الافتراضية للحسابات (تتعدل من الإعدادات ← الافتراضات) */
  const DEFAULTS = {
    waste: 5,
    cementInt: { method: 'ratio', thickness: 20, layers: 1, ratio: 4, dryFactor: 1.27, density: 1440, bagKg: 50, content: 300, sandPerM3: 1, waste: 5 },
    cementExt: { method: 'ratio', thickness: 25, layers: 1, ratio: 3, dryFactor: 1.27, density: 1440, bagKg: 50, content: 350, sandPerM3: 1, waste: 7 },
    drymix: { thickness: 15, layers: 1, kgPerMm: 1.5, bagKg: 25, waste: 5, name: 'محارة جاهزة' },
    gypsum: { thickness: 10, layers: 1, kgPerMm: 1.0, bagKg: 25, waste: 5, name: 'محارة جبسية' },
    putty: { rateMode: 'perM2', rate: 0.7, coats: 2, packSize: 15, unit: 'كجم', packName: 'بستلة', surface: 1, level: 1, waste: 5, name: 'معجون جاهز' },
    cementPutty: { rateMode: 'perM2', rate: 1.0, coats: 2, packSize: 20, unit: 'كجم', packName: 'شيكارة', surface: 1, level: 1, waste: 5, name: 'معجون أسمنتي' },
    dahara: { rateMode: 'perM2', rate: 0.5, coats: 1, packSize: 20, unit: 'كجم', packName: 'عبوة', surface: 1, level: 1, waste: 5, name: 'خامة الدهارة' },
    primer: { rateMode: 'm2PerUnit', rate: 10, coats: 1, packSize: 4, unit: 'لتر', packName: 'جالون', surface: 1, level: 1, waste: 5, name: 'برايمر' },
    graffiato: { rateMode: 'perM2', rate: 2.0, coats: 1, packSize: 25, unit: 'كجم', packName: 'بستلة', surface: 1, level: 1, waste: 7, name: 'جرافيت متوسط' },
    graffitoPrimer: { rateMode: 'm2PerUnit', rate: 8, coats: 1, packSize: 4, unit: 'لتر', packName: 'جالون', surface: 1, level: 1, waste: 5, name: 'برايمر جرافيت' },
    acrylic: { rateMode: 'm2PerUnit', rate: 8, coats: 2, packSize: 9, unit: 'لتر', packName: 'بستلة', surface: 1, level: 1, waste: 5, name: 'دهان أكريليك خارجي' },
    elastomeric: { rateMode: 'm2PerUnit', rate: 4, coats: 2, packSize: 18, unit: 'لتر', packName: 'بستلة', surface: 1, level: 1, waste: 5, name: 'طلاء مرن للواجهات' },
    texture: { rateMode: 'perM2', rate: 1.5, coats: 1, packSize: 25, unit: 'كجم', packName: 'بستلة', surface: 1, level: 1, waste: 7, name: 'تشطيب رملي / ملمسي' },
    waterproof: { rateMode: 'perM2', rate: 1.5, coats: 2, packSize: 20, unit: 'كجم', packName: 'عبوة', surface: 1, level: 1, waste: 5, name: 'مادة عزل مائي' },
    paint: { rateMode: 'm2PerUnit', rate: 10, coats: 2, packSize: 4, unit: 'لتر', packName: 'جالون', surface: 1, level: 1, waste: 5, name: 'دهان نهائي' },
    mesh: { mode: 'area', coverPct: 100, stripWidth: 30, overlap: 10, rollArea: 50, name: 'شبك فايبر' },
    meshStrip: { mode: 'strip', coverPct: 100, stripWidth: 30, overlap: 10, rollArea: 50, name: 'شبك فايبر (شرائط)' },
    rules: { mode: 'all', threshold: 1, percent: 50 }
  };

  // معاملات حالة السطح ودرجة التسوية (قابلة للتعديل يدوياً في كل بند)
  const SURFACE_FACTORS = [
    { v: 1, name: 'سطح جيد ومستوي' },
    { v: 1.15, name: 'سطح متوسط' },
    { v: 1.3, name: 'سطح سيء / به عيوب كثيرة' }
  ];
  const LEVEL_FACTORS = [
    { v: 1, name: 'تسوية عادية' },
    { v: 1.1, name: 'تسوية جيدة' },
    { v: 1.25, name: 'تسوية ممتازة (إضاءة جانبية)' }
  ];

  /* أنواع الأعمال
   * calc: none | cement | premix | coverage | graffiato | mesh
   * preset: اسم مجموعة القيم الافتراضية من DEFAULTS
   */
  const WORK_TYPES = [
    // المحارة الداخلية
    { key: 'int_cement', section: 'interior', name: 'محارة أسمنتية تقليدية', calc: 'cement', preset: 'cementInt', unit: 'm2', phase: 'plaster' },
    { key: 'int_cement_sand', section: 'interior', name: 'محارة أسمنت ورمل', calc: 'cement', preset: 'cementInt', unit: 'm2', phase: 'plaster' },
    { key: 'int_drymix', section: 'interior', name: 'محارة جاهزة مخلوطة (Dry Mix)', calc: 'premix', preset: 'drymix', unit: 'm2', phase: 'plaster' },
    { key: 'int_gypsum', section: 'interior', name: 'محارة جبسية', calc: 'premix', preset: 'gypsum', unit: 'm2', phase: 'plaster' },
    { key: 'int_fine', section: 'interior', name: 'محارة ناعمة', calc: 'cement', preset: 'cementInt', over: { thickness: 15 }, unit: 'm2', phase: 'plaster' },
    { key: 'int_rough', section: 'interior', name: 'محارة خشنة', calc: 'cement', preset: 'cementInt', over: { thickness: 20, ratio: 3 }, unit: 'm2', phase: 'plaster' },
    { key: 'int_mesh', section: 'interior', name: 'شبك عند اختلاف الخامات', calc: 'mesh', preset: 'meshStrip', unit: 'lm', phase: 'prep', measureMode: 'linear' },
    { key: 'int_cracks', section: 'interior', name: 'معالجة الشروخ والتعشيش', calc: 'none', unit: 'lm', phase: 'treat', measureMode: 'linear' },
    { key: 'int_restore', section: 'interior', name: 'ترميم وإعادة المحارة', calc: 'cement', preset: 'cementInt', unit: 'm2', phase: 'plaster' },
    { key: 'int_bouj', section: 'interior', name: 'بؤج وأوتار وتسوية الحوائط', calc: 'none', unit: 'm2', phase: 'prep' },
    // المحارة الخارجية
    { key: 'ext_facade', section: 'exterior', name: 'محارة واجهات أسمنتية', calc: 'cement', preset: 'cementExt', unit: 'm2', phase: 'plaster', measureMode: 'facade' },
    { key: 'ext_fence', section: 'exterior', name: 'محارة أسوار', calc: 'cement', preset: 'cementExt', unit: 'm2', phase: 'plaster', measureMode: 'shapes' },
    { key: 'ext_balcony', section: 'exterior', name: 'محارة بلكونات', calc: 'cement', preset: 'cementExt', unit: 'm2', phase: 'plaster', measureMode: 'shapes' },
    { key: 'ext_columns', section: 'exterior', name: 'محارة أعمدة خارجية', calc: 'cement', preset: 'cementExt', unit: 'm2', phase: 'plaster', measureMode: 'shapes' },
    { key: 'ext_cornice', section: 'exterior', name: 'محارة كرانيش', calc: 'cement', preset: 'cementExt', unit: 'lm', phase: 'plaster', measureMode: 'linear' },
    { key: 'ext_lightwell', section: 'exterior', name: 'محارة مناور', calc: 'cement', preset: 'cementExt', unit: 'm2', phase: 'plaster', measureMode: 'shapes' },
    { key: 'ext_exposed', section: 'exterior', name: 'محارة أسطح وجدران معرضة للعوامل الجوية', calc: 'cement', preset: 'cementExt', unit: 'm2', phase: 'plaster', measureMode: 'shapes' },
    { key: 'ext_mesh', section: 'exterior', name: 'محارة باستخدام الشبك', calc: 'cement', preset: 'cementExt', meshOn: true, unit: 'm2', phase: 'plaster' },
    { key: 'ext_prep', section: 'exterior', name: 'تجهيز الأسطح قبل التشطيب', calc: 'none', unit: 'm2', phase: 'prep' },
    { key: 'ext_joints', section: 'exterior', name: 'معالجة الفواصل والشروخ', calc: 'none', unit: 'lm', phase: 'treat', measureMode: 'linear' },
    // الجرافيت
    { key: 'gr_coarse', section: 'graffiato', name: 'جرافيت خشن', calc: 'graffiato', preset: 'graffiato', over: { rate: 2.5, name: 'جرافيت خشن' }, unit: 'm2', phase: 'finish' },
    { key: 'gr_medium', section: 'graffiato', name: 'جرافيت متوسط', calc: 'graffiato', preset: 'graffiato', over: { rate: 2.0, name: 'جرافيت متوسط' }, unit: 'm2', phase: 'finish' },
    { key: 'gr_fine', section: 'graffiato', name: 'جرافيت ناعم', calc: 'graffiato', preset: 'graffiato', over: { rate: 1.5, name: 'جرافيت ناعم' }, unit: 'm2', phase: 'finish' },
    { key: 'gr_color', section: 'graffiato', name: 'جرافيت ملون', calc: 'graffiato', preset: 'graffiato', over: { name: 'جرافيت ملون' }, unit: 'm2', phase: 'finish' },
    { key: 'gr_facade', section: 'graffiato', name: 'جرافيت واجهات', calc: 'graffiato', preset: 'graffiato', over: { name: 'جرافيت واجهات' }, unit: 'm2', phase: 'finish', measureMode: 'facade' },
    { key: 'gr_deco', section: 'graffiato', name: 'جرافيت ديكوري (نقوش واتجاهات)', calc: 'graffiato', preset: 'graffiato', over: { name: 'جرافيت ديكوري' }, unit: 'm2', phase: 'finish' },
    { key: 'gr_prep', section: 'graffiato', name: 'تجهيز السطح قبل الجرافيت', calc: 'none', unit: 'm2', phase: 'prep' },
    { key: 'gr_primer', section: 'graffiato', name: 'برايمر / طبقة تأسيسية للجرافيت', calc: 'coverage', preset: 'graffitoPrimer', unit: 'm2', phase: 'primer' },
    { key: 'gr_restore', section: 'graffiato', name: 'ترميم وتجديد الجرافيت', calc: 'graffiato', preset: 'graffiato', unit: 'm2', phase: 'finish' },
    // الدهارة والمعجون
    { key: 'pu_dahara', section: 'putty', name: 'دهارة الحوائط الداخلية', calc: 'coverage', preset: 'dahara', unit: 'm2', phase: 'dahara' },
    { key: 'pu_dahara_ceil', section: 'putty', name: 'دهارة الأسقف', calc: 'coverage', preset: 'dahara', unit: 'm2', phase: 'dahara', qtySource: 'ceiling' },
    { key: 'pu_cement', section: 'putty', name: 'معجون أسمنتي', calc: 'coverage', preset: 'cementPutty', unit: 'm2', phase: 'putty' },
    { key: 'pu_ready', section: 'putty', name: 'معجون جاهز', calc: 'coverage', preset: 'putty', unit: 'm2', phase: 'putty' },
    { key: 'pu_wall', section: 'putty', name: 'معجون حوائط', calc: 'coverage', preset: 'putty', over: { name: 'معجون حوائط' }, unit: 'm2', phase: 'putty' },
    { key: 'pu_facade', section: 'putty', name: 'معجون واجهات (حسب المنتج)', calc: 'coverage', preset: 'putty', over: { name: 'معجون واجهات' }, unit: 'm2', phase: 'putty' },
    { key: 'pu_cracks', section: 'putty', name: 'معالجة الشروخ', calc: 'none', unit: 'lm', phase: 'treat', measureMode: 'linear' },
    { key: 'pu_sanding', section: 'putty', name: 'صنفرة الحوائط', calc: 'none', unit: 'm2', phase: 'putty' },
    { key: 'pu_level', section: 'putty', name: 'تسوية الأسطح', calc: 'coverage', preset: 'putty', over: { coats: 1, name: 'خامة التسوية' }, unit: 'm2', phase: 'putty' },
    { key: 'pu_primer', section: 'putty', name: 'برايمر', calc: 'coverage', preset: 'primer', unit: 'm2', phase: 'primer' },
    { key: 'pu_prep', section: 'putty', name: 'تجهيز الأسطح قبل الدهانات', calc: 'none', unit: 'm2', phase: 'prep' },
    { key: 'pu_finish', section: 'putty', name: 'طبقات التشطيب (دهان نهائي)', calc: 'coverage', preset: 'paint', unit: 'm2', phase: 'finish' },
    { key: 'pu_restore', section: 'putty', name: 'أعمال ترميم', calc: 'none', unit: 'm2', phase: 'treat' },
    // تشطيبات الواجهات
    { key: 'fa_cement', section: 'facade', name: 'واجهة أسمنتية (محارة)', calc: 'cement', preset: 'cementExt', unit: 'm2', phase: 'plaster', measureMode: 'facade' },
    { key: 'fa_graffiato', section: 'facade', name: 'واجهة بالجرافيت', calc: 'graffiato', preset: 'graffiato', unit: 'm2', phase: 'finish', measureMode: 'facade' },
    { key: 'fa_acrylic', section: 'facade', name: 'دهانات أكريليك خارجية', calc: 'coverage', preset: 'acrylic', unit: 'm2', phase: 'finish', measureMode: 'facade' },
    { key: 'fa_elastic', section: 'facade', name: 'طلاء مرن للواجهات', calc: 'coverage', preset: 'elastomeric', unit: 'm2', phase: 'finish', measureMode: 'facade' },
    { key: 'fa_texture', section: 'facade', name: 'تشطيب رملي / ملمسي', calc: 'coverage', preset: 'texture', unit: 'm2', phase: 'finish', measureMode: 'facade' },
    { key: 'fa_scrape', section: 'facade', name: 'كشط وإزالة الطبقات القديمة', calc: 'none', unit: 'm2', phase: 'prep', measureMode: 'facade' },
    { key: 'fa_waterproof', section: 'facade', name: 'عزل مائي للواجهة (حسب النظام)', calc: 'coverage', preset: 'waterproof', unit: 'm2', phase: 'treat', measureMode: 'facade' },
    { key: 'fa_cracks', section: 'facade', name: 'معالجة شروخ الواجهة', calc: 'none', unit: 'lm', phase: 'treat', measureMode: 'linear' },
    { key: 'fa_mesh', section: 'facade', name: 'شبك فايبر', calc: 'mesh', preset: 'mesh', unit: 'm2', phase: 'treat' },
    { key: 'fa_base', section: 'facade', name: 'طبقة تأسيس', calc: 'coverage', preset: 'primer', unit: 'm2', phase: 'primer', measureMode: 'facade' },
    { key: 'fa_final', section: 'facade', name: 'طبقة نهائية', calc: 'coverage', preset: 'acrylic', over: { name: 'الطبقة النهائية' }, unit: 'm2', phase: 'finish', measureMode: 'facade' },
    // تكاليف الموقع
    { key: 'st_scaffold', section: 'site', name: 'سقالات', calc: 'none', unit: 'lump', phase: 'prep' },
    { key: 'st_scaffold_day', section: 'site', name: 'إيجار سقالات باليوم', calc: 'none', unit: 'day', phase: 'prep' },
    { key: 'st_crane', section: 'site', name: 'ونش', calc: 'none', unit: 'day', phase: 'prep' },
    { key: 'st_lift', section: 'site', name: 'رفع وتنزيل الخامات', calc: 'none', unit: 'lump', phase: 'prep' },
    { key: 'st_transport', section: 'site', name: 'نقل', calc: 'none', unit: 'lump', phase: 'prep' },
    { key: 'st_prep', section: 'site', name: 'تجهيز الموقع', calc: 'none', unit: 'lump', phase: 'prep' },
    { key: 'st_protect', section: 'site', name: 'حماية الشبابيك والأرضيات', calc: 'none', unit: 'lump', phase: 'prep' },
    { key: 'st_clean', section: 'site', name: 'تنظيف الموقع بعد التنفيذ', calc: 'none', unit: 'lump', phase: 'handover' },
    // أخرى
    { key: 'custom', section: 'other', name: 'بند حر', calc: 'none', unit: 'm2', phase: 'plaster' }
  ];

  /* أنظمة تشطيب جاهزة للواجهات: كل نظام = مجموعة بنود تُضاف للمنطقة */
  const FACADE_SYSTEMS = [
    { key: 'sys_plaster', name: 'محارة واجهة فقط', items: ['ext_facade'] },
    { key: 'sys_graff', name: 'برايمر + جرافيت', items: ['gr_primer', 'gr_medium'] },
    { key: 'sys_plaster_graff', name: 'محارة + برايمر + جرافيت', items: ['ext_facade', 'gr_primer', 'gr_medium'] },
    { key: 'sys_acrylic', name: 'معجون واجهات + تأسيس + أكريليك', items: ['pu_facade', 'fa_base', 'fa_acrylic'] },
    { key: 'sys_elastic', name: 'تأسيس + طلاء مرن', items: ['fa_base', 'fa_elastic'] },
    { key: 'sys_waterproof', name: 'عزل مائي + دهان أكريليك', items: ['fa_waterproof', 'fa_acrylic'] },
    { key: 'sys_texture', name: 'تأسيس + تشطيب رملي', items: ['fa_base', 'fa_texture'] },
    { key: 'sys_renovate', name: 'ترميم واجهة قديمة', items: ['fa_scrape', 'fa_cracks', 'fa_mesh', 'ext_facade', 'fa_acrylic'] }
  ];

  const EXPENSE_CATS = ['خامات', 'سقالات', 'إيجارات', 'نقل', 'ونش ورفع', 'إكراميات ومصروفات صغيرة', 'مصروفات طارئة', 'أخرى'];
  const WORKER_ROLES = ['معلم', 'صنايعي', 'مساعد', 'فني جرافيت', 'فني دهارة', 'عامل'];
  const PAY_METHODS = ['كاش', 'تحويل بنكي', 'محفظة إلكترونية', 'شيك', 'إنستاباي'];
  const BUILDING_TYPES = ['شقة', 'فيلا', 'عمارة سكنية', 'محل تجاري', 'مكاتب', 'مصنع / مخزن', 'مبنى حكومي', 'أخرى'];
  const MAT_CATEGORIES = ['أسمنت', 'رمل', 'جبس', 'محارة جاهزة', 'معجون', 'جرافيت', 'برايمر', 'دهانات خارجية', 'مواد عزل', 'شبك فايبر', 'زوايا محارة', 'مواد معالجة الشروخ', 'مواد التأسيس', 'مواد التشطيب', 'أخرى'];
  const STOCK_UNITS = ['شيكارة', 'م³', 'كجم', 'بستلة', 'جالون', 'لتر', 'عبوة', 'لفة', 'عود', 'عدد', 'متر'];

  /* خامات المخزن الافتراضية — الأسعار فارغة (أدخلها حسب سوقك) والمعدلات استرشادية */
  const SEED_MATERIALS = [
    { name: 'أسمنت بورتلاندي', category: 'أسمنت', unit: 'شيكارة', packSize: 50, packUnit: 'كجم', kind: 'cement' },
    { name: 'رمل محارة', category: 'رمل', unit: 'م³', packSize: 1, packUnit: 'م³', kind: 'sand' },
    { name: 'جبس', category: 'جبس', unit: 'شيكارة', packSize: 25, packUnit: 'كجم', kind: 'other' },
    { name: 'محارة جاهزة Dry Mix', category: 'محارة جاهزة', unit: 'شيكارة', packSize: 25, packUnit: 'كجم', kind: 'premix', kgPerMm: 1.5 },
    { name: 'محارة جبسية', category: 'محارة جاهزة', unit: 'شيكارة', packSize: 25, packUnit: 'كجم', kind: 'premix', kgPerMm: 1.0 },
    { name: 'معجون جاهز', category: 'معجون', unit: 'بستلة', packSize: 15, packUnit: 'كجم', kind: 'coverage', rateMode: 'perM2', rate: 0.7 },
    { name: 'معجون أسمنتي', category: 'معجون', unit: 'شيكارة', packSize: 20, packUnit: 'كجم', kind: 'coverage', rateMode: 'perM2', rate: 1.0 },
    { name: 'جرافيت خشن', category: 'جرافيت', unit: 'بستلة', packSize: 25, packUnit: 'كجم', kind: 'coverage', rateMode: 'perM2', rate: 2.5, grain: 'خشن' },
    { name: 'جرافيت متوسط', category: 'جرافيت', unit: 'بستلة', packSize: 25, packUnit: 'كجم', kind: 'coverage', rateMode: 'perM2', rate: 2.0, grain: 'متوسط' },
    { name: 'جرافيت ناعم', category: 'جرافيت', unit: 'بستلة', packSize: 25, packUnit: 'كجم', kind: 'coverage', rateMode: 'perM2', rate: 1.5, grain: 'ناعم' },
    { name: 'برايمر', category: 'برايمر', unit: 'جالون', packSize: 4, packUnit: 'لتر', kind: 'coverage', rateMode: 'm2PerUnit', rate: 10 },
    { name: 'دهان أكريليك خارجي', category: 'دهانات خارجية', unit: 'بستلة', packSize: 9, packUnit: 'لتر', kind: 'coverage', rateMode: 'm2PerUnit', rate: 8 },
    { name: 'طلاء مرن للواجهات', category: 'دهانات خارجية', unit: 'بستلة', packSize: 18, packUnit: 'لتر', kind: 'coverage', rateMode: 'm2PerUnit', rate: 4 },
    { name: 'مادة عزل مائي', category: 'مواد عزل', unit: 'عبوة', packSize: 20, packUnit: 'كجم', kind: 'coverage', rateMode: 'perM2', rate: 1.5 },
    { name: 'شبك فايبر', category: 'شبك فايبر', unit: 'لفة', packSize: 50, packUnit: 'م²', kind: 'mesh' },
    { name: 'زاوية محارة', category: 'زوايا محارة', unit: 'عود', packSize: 3, packUnit: 'م', kind: 'other' },
    { name: 'معجون مرن للشروخ', category: 'مواد معالجة الشروخ', unit: 'عبوة', packSize: 5, packUnit: 'كجم', kind: 'other' },
    { name: 'مادة تأسيس (سيلر)', category: 'مواد التأسيس', unit: 'جالون', packSize: 4, packUnit: 'لتر', kind: 'coverage', rateMode: 'm2PerUnit', rate: 10 }
  ];

  const DOC_TYPES = {
    boq: { name: 'مقايسة أعمال', short: 'مقايسة', prefix: 'BOQ' },
    boq_plaster: { name: 'مقايسة محارة', short: 'مقايسة محارة', prefix: 'BOQ', sections: ['interior', 'exterior'] },
    boq_graffiato: { name: 'مقايسة جرافيت', short: 'مقايسة جرافيت', prefix: 'BOQ', sections: ['graffiato'] },
    boq_putty: { name: 'مقايسة دهارة ومعجون', short: 'مقايسة دهارة', prefix: 'BOQ', sections: ['putty'] },
    boq_facade: { name: 'مقايسة واجهات', short: 'مقايسة واجهات', prefix: 'BOQ', sections: ['facade', 'exterior', 'graffiato'] },
    quote: { name: 'عرض سعر', short: 'عرض سعر', prefix: 'QT' },
    inv_labor: { name: 'فاتورة مصنعية', short: 'فاتورة مصنعية', prefix: 'INV' },
    inv_supply: { name: 'فاتورة توريد خامات', short: 'فاتورة توريد', prefix: 'INV' },
    inv_full: { name: 'فاتورة توريد وتنفيذ', short: 'فاتورة توريد وتنفيذ', prefix: 'INV' },
    certificate: { name: 'مستخلص أعمال', short: 'مستخلص', prefix: 'CRT' },
    receipt: { name: 'إيصال استلام نقدية', short: 'إيصال', prefix: 'RC' },
    statement: { name: 'كشف حساب عميل', short: 'كشف حساب', prefix: 'ST' },
    cost: { name: 'تقرير تكلفة المشروع', short: 'تقرير تكلفة', prefix: 'RP' },
    materials: { name: 'كشف الخامات المطلوبة', short: 'كشف خامات', prefix: 'MT' },
    profit: { name: 'تقرير الأرباح', short: 'تقرير أرباح', prefix: 'RP' }
  };

  function workType(key) { return WORK_TYPES.find(w => w.key === key) || WORK_TYPES[WORK_TYPES.length - 1]; }

  return {
    CURRENCIES, SECTIONS, PHASES, LOCATIONS, ZONE_KINDS, ZONE_COLORS, DEFAULTS, SURFACE_FACTORS, LEVEL_FACTORS,
    WORK_TYPES, FACADE_SYSTEMS, EXPENSE_CATS, WORKER_ROLES, PAY_METHODS, BUILDING_TYPES, MAT_CATEGORIES, STOCK_UNITS,
    SEED_MATERIALS, DOC_TYPES, workType
  };
});
