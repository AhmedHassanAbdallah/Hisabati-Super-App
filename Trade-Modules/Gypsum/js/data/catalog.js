/*
 * أرزقي للجبس والديكورات — البيانات الثابتة: العملات، الوحدات، التصنيفات، الخامات المبدئية
 * © 2026 أحمد حسن عبدالله - جميع الحقوق محفوظة.
 * ملاحظة: لا توجد أسعار ثابتة — كل الأسعار يدخلها المستخدم.
 */
(function (root) {
  'use strict';
  const HG = root.HG = root.HG || {};

  // العملة الأساسية: تغيّر الرمز فقط ولا تحوّل المبالغ (لا توجد أسعار صرف ثابتة)
  HG.CURRENCIES = [
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
    { code: 'USD', country: 'دولار أمريكي', name: 'دولار', sym: '$', dec: 2 }
  ];

  HG.UNITS = ['لوح', 'قطعة', 'متر مربع', 'متر طولي', 'كرتونة', 'عبوة', 'شيكارة', 'كيلوجرام', 'طن', 'لفة', 'وحدة', 'عود'];

  HG.STOCK_CATS = {
    boards: 'ألواح جبسون بورد',
    profiles: 'قطاعات معدنية',
    accessories: 'إكسسوارات',
    compound: 'معجون',
    tape: 'شرائط',
    insulation: 'عوازل',
    plaster: 'جبس بلدي',
    cornice: 'كرانيش',
    panels: 'بانوهات',
    rosettes: 'روزتات',
    fab: 'خامات تصنيع',
    tools: 'أدوات ومستلزمات'
  };

  HG.NOTE_TYPES = {
    general: 'ملاحظة عامة', customer: 'ملاحظات العميل', measure: 'مقاسات الأماكن', design: 'تفاصيل التصميم',
    price: 'اتفاق أسعار', exec: 'ملاحظات التنفيذ', appointment: 'موعد', debt: 'ديون', change: 'تعديلات مطلوبة', delivery: 'ملاحظات التسليم'
  };

  HG.WORK_TYPES = ['أسقف جبسون بورد', 'قواطيع وفواصل', 'تكسية حوائط', 'جبس بلدي ومحارة', 'كرانيش', 'بانوهات', 'ديكورات جبسية', 'تشطيب شقة كاملة', 'ترميم وإصلاح', 'توريد خامات'];

  // الخامات المبدئية (بدون أسعار) — المفتاح key بيربط الخامة بنتائج الحاسبات
  const S = (key, name, cat, unit, extra) => Object.assign({ key, name, cat, unit, buy: '', sell: '', qty: 0, min: '' }, extra || {});
  HG.DEFAULT_STOCK = [
    S('board_std_12.5', 'لوح جبس عادي', 'boards', 'لوح', { thickness: '12.5', size: '120×240 سم', color: 'أبيض' }),
    S('board_std_9.5', 'لوح جبس عادي', 'boards', 'لوح', { thickness: '9.5', size: '120×240 سم', color: 'أبيض' }),
    S('board_mr_12.5', 'لوح مقاوم للرطوبة', 'boards', 'لوح', { thickness: '12.5', size: '120×240 سم', color: 'أخضر' }),
    S('board_fr_12.5', 'لوح مقاوم للحريق', 'boards', 'لوح', { thickness: '12.5', size: '120×240 سم', color: 'أحمر' }),
    S('board_ac_12.5', 'لوح عزل صوتي', 'boards', 'لوح', { thickness: '12.5', size: '120×240 سم', color: 'أزرق' }),
    S('board_cem_12.5', 'لوح أسمنتي', 'boards', 'لوح', { thickness: '12.5', size: '120×240 سم' }),
    S('main_channel', 'قطاع رئيسي Main Channel', 'profiles', 'عود', { size: '3 م' }),
    S('furring', 'قطاع ثانوي Furring Channel', 'profiles', 'عود', { size: '3 م' }),
    S('omega', 'قطاع أوميجا Omega', 'profiles', 'عود', { size: '3 م' }),
    S('wall_angle', 'زاوية حائط Wall Angle', 'profiles', 'عود', { size: '3 م' }),
    S('u_track', 'مجرى U Track', 'profiles', 'عود', { size: '3 م' }),
    S('c_stud', 'قائم C Stud', 'profiles', 'عود', { size: '3 م' }),
    S('corner_bead', 'زاوية حماية كورنر بيد', 'profiles', 'عود', { size: '3 م' }),
    S('tee_main', 'تي رئيسي Main Tee', 'profiles', 'عود', { size: '3.6 م' }),
    S('tee_cross_1200', 'تي ثانوي 120 سم', 'profiles', 'قطعة'),
    S('tee_cross_600', 'تي ثانوي 60 سم', 'profiles', 'قطعة'),
    S('hanger', 'علاقة تعليق', 'accessories', 'قطعة'),
    S('cross_clip', 'مشبك رئيسي × ثانوي', 'accessories', 'قطعة'),
    S('main_joiner', 'وصلة قطاع رئيسي', 'accessories', 'قطعة'),
    S('furring_joiner', 'وصلة قطاع ثانوي', 'accessories', 'قطعة'),
    S('direct_bracket', 'كانة تثبيت مباشر', 'accessories', 'قطعة'),
    S('anchor', 'خابور / مسمار تثبيت', 'accessories', 'قطعة'),
    S('screw_board', 'براغي ألواح', 'accessories', 'قطعة'),
    S('screw_metal', 'براغي معدن', 'accessories', 'قطعة'),
    S('compound', 'معجون فواصل', 'compound', 'عبوة', { size: '20 كجم' }),
    S('tape', 'شريط فواصل', 'tape', 'لفة', { size: '75 م' }),
    S('ins_rockwool', 'صوف صخري', 'insulation', 'عبوة'),
    S('ins_glasswool', 'صوف زجاجي', 'insulation', 'عبوة'),
    S('ins_eps', 'فوم بوليسترين', 'insulation', 'عبوة'),
    S('adhesive', 'مادة لاصقة للألواح', 'compound', 'شيكارة'),
    S('ceiling_tile', 'بلاطة سقف معلق 60×60', 'boards', 'قطعة'),
    S('plaster_baladi', 'جبس بلدي', 'plaster', 'شيكارة', { size: '25 كجم' }),
    S('plaster_machine', 'جبس محارة جاهز', 'plaster', 'شيكارة'),
    S('plaster_finish', 'جبس تشطيب', 'plaster', 'شيكارة'),
    S('plaster_bead', 'زاوية محارة', 'plaster', 'عود'),
    S('cornice', 'كورنيش جبس', 'cornice', 'قطعة', { size: '2 م' }),
    S('panel_molding', 'برواز بانوهات', 'panels', 'قطعة', { size: '2 م' }),
    S('decor_piece', 'روزتة / قطعة ديكور', 'rosettes', 'قطعة'),
    S('decor_adhesive', 'لاصق كرانيش وديكور', 'fab', 'عبوة')
  ];
})(typeof self !== 'undefined' ? self : this);
