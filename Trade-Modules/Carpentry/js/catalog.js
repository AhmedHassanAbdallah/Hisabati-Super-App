/*
 * أرزقي | Arzoqi — النجارة: التخصصات وأنواع الشغل والتفاصيل.
 * أسماء بس (اقتراحات بتتملى بضغطة) — مفيش أي أسعار. النجار يقدر يكتب أي نوع أو يضيف أنواع شغل بتاعته.
 * © 2026 أحمد حسن عبدالله
 */
(function (root) {
  'use strict';
  // خانات التفاصيل (الخطوة 3) — كل خانة نص حر + اقتراحات
  var FIELDS = {
    wood: { label: 'نوع الخشب', sug: ['زان', 'موسكي', 'سويدي', 'أرو', 'ماهوجني', 'بلوط', 'جوز', 'تك'] },
    board: { label: 'نوع الألواح', sug: ['MDF', 'HDF', 'كونتر', 'أبلكاش', 'خشب طبيعي', 'لاميكا', 'PVC', 'أكريليك', 'HPL'] },
    thick: { label: 'السمك', sug: ['3 مم', '8 مم', '16 مم', '18 مم', '25 مم'] },
    finish: { label: 'التشطيب', sug: ['دوكو', 'لاكيه', 'استر', 'بوليستر', 'قشرة طبيعي', 'ورنيش', 'زيت', 'لاميكا', 'PVC', 'أكريليك', 'HPL'] },
    doorType: { label: 'نوع الأبواب', sug: ['مفصلي', 'جرار', 'قلاب', 'مفتوح من غير أبواب'] },
    hinges: { label: 'المفصلات', sug: ['عادي', 'هيدروليك', 'Soft close', 'بوكس'] },
    slides: { label: 'السحّابات / المجاري', sug: ['بلي', 'تلسكوبي', 'Soft close', 'مخفي'] },
    handles: { label: 'المقابض', sug: ['ظاهر', 'مخفي', 'Push open', 'جولا'] },
    back: { label: 'نوع الظهر', sug: ['HDF 3 مم', 'MDF 8 مم', 'كونتر'] },
    inside: { label: 'التقسيم الداخلي وأماكن التعليق', sug: [] },
    infill: { label: 'الحشو', sug: ['كبس', 'حشو خشب', 'حشو زجاج', 'شرائح'] },
    veneer: { label: 'القشرة', sug: ['قشرة زان', 'قشرة أرو', 'قشرة جوز', 'من غير قشرة'] },
    frame: { label: 'الحلق / الإطار', sug: ['حلق خشب', 'حلق MDF', 'من غير حلق'] },
    lock: { label: 'الكالون', sug: [] },
    sashes: { label: 'عدد الضلف', sug: ['1', '2', '3', '4'] },
    glass: { label: 'الزجاج', sug: ['سادة', 'سيكوريت', 'مضلع', 'ملون', 'من غير زجاج'] },
    treat: { label: 'معالجة الخشب', sug: ['ضد الرطوبة', 'ضد السوس', 'معالجة حرارية'] },
    outFinish: { label: 'تشطيب خارجي', sug: ['زيت خارجي', 'ورنيش بحري', 'دهان خارجي'] },
    mount: { label: 'طريقة التركيب', sug: ['على شاسيه', 'لصق', 'براغي', 'تثبيت مخفي'] },
    acc: { label: 'الإكسسوارات', sug: [] },
    problem: { label: 'وصف المشكلة', sug: [], long: true }
  };
  var DIMS = { w: 'العرض', h: 'الارتفاع', d: 'العمق' };
  var DIMS_DOOR = { w: 'العرض', h: 'الارتفاع', d: 'السمك' };
  var DIMS_FLAT = { w: 'الطول', h: 'العرض / الارتفاع', d: 'السمك' };
  var ALL = ['piece', 'lm', 'sqm', 'board', 'parts', 'zones', 'list', 'lump', 'daily', 'hour'];

  var CATS = [
    { id: 'furniture', label: 'أثاث وموبيليا', icon: 'sofa', desc: 'سفرة وصالون ونيش وقطع موبيليا',
      types: ['سفرة', 'صالون', 'أنتريه', 'نيش', 'بوفيه', 'ترابيزة سفرة', 'كرسي', 'كنبة خشب', 'قطعة موبيليا'],
      methods: ['piece', 'list', 'lump', 'lm', 'sqm'], method: 'piece', dims: DIMS, fields: ['wood', 'board', 'finish', 'handles', 'acc'], cut: true },
    { id: 'bedroom', label: 'غرف النوم', icon: 'bed', desc: 'غرفة كاملة أو قطعة قطعة',
      types: ['غرفة نوم كاملة', 'سرير', 'ظهر سرير', 'كومود', 'تسريحة', 'دولاب', 'وحدة تلفزيون', 'مكتبة', 'جزامة', 'وحدة تخزين'],
      rows: ['سرير', 'ظهر سرير', 'دولاب', 'كومود', 'تسريحة', 'وحدة تلفزيون', 'مكتبة', 'جزامة', 'وحدة تخزين', 'قطعة إضافية'],
      methods: ['list', 'piece', 'lump'], method: 'list', dims: DIMS, fields: ['wood', 'board', 'finish', 'hinges', 'slides', 'handles', 'inside', 'acc'], cut: true },
    { id: 'wardrobe', label: 'دواليب وخزائن', icon: 'wardrobe', desc: 'مفصلي وجرار وحائط ومدمج',
      types: ['دولاب مفصلي', 'دولاب جرار', 'دولاب حائط', 'دولاب غرفة نوم', 'دولاب مدمج في الحائط', 'Walk-in Closet', 'خزانة تخزين', 'خزانة تحت السلم', 'وحدة تخزين حسب الطلب'],
      methods: ['lm', 'sqm', 'parts', 'piece', 'board', 'list', 'lump'], method: 'lm', dims: DIMS, counts: true,
      fields: ['doorType', 'board', 'thick', 'finish', 'hinges', 'slides', 'handles', 'inside', 'acc'], cut: true,
      partNames: ['جنب', 'ظهر', 'قاعدة', 'سقف', 'رف', 'قاطوع', 'ضلفة', 'وش درج', 'جنب درج', 'قاع درج'] },
    { id: 'kitchen', label: 'مطابخ', icon: 'kitchen', desc: 'بالمتر أو بالوحدة أو مقطوعية',
      types: ['مطبخ MDF', 'مطبخ HDF', 'مطبخ كونتر', 'مطبخ أبلكاش', 'مطبخ خشب طبيعي', 'مطبخ لاميكا', 'مطبخ PVC', 'مطبخ أكريليك', 'مطبخ HPL', 'مطبخ خامات متنوعة'],
      rows: ['وحدة أرضية', 'وحدة علوية', 'وحدة طويلة', 'وحدة فرن', 'وحدة ثلاجة', 'وحدة حوض', 'وحدة أدراج', 'وحدة زاوية', 'وحدة تخزين', 'وحدة مفتوحة', 'وحدة خاصة'],
      methods: ['zones', 'list', 'lump', 'piece'], method: 'zones', dims: DIMS, fields: ['board', 'thick', 'back', 'finish', 'hinges', 'slides', 'handles', 'acc'], cut: true },
    { id: 'door', label: 'أبواب خشب', icon: 'door', desc: 'غرف وشقق ورئيسية وجرار',
      types: ['باب غرفة', 'باب شقة', 'باب رئيسي', 'باب داخلي', 'باب خشب طبيعي', 'باب حشو', 'باب كبس', 'باب MDF', 'باب قشرة', 'باب تصميم خاص', 'باب جرار'],
      methods: ['piece', 'sqm', 'lump'], method: 'piece', dims: DIMS_DOOR, includes: true, fields: ['wood', 'infill', 'veneer', 'finish', 'frame', 'hinges', 'lock', 'handles', 'acc'] },
    { id: 'window', label: 'شبابيك خشب', icon: 'window', desc: 'مفصلي وجرار وبزجاج',
      types: ['شباك مفصلي', 'شباك جرار', 'شباك تقليدي', 'شباك خشب طبيعي', 'شباك بزجاج', 'شباك حسب الطلب'],
      methods: ['piece', 'sqm', 'lump'], method: 'piece', dims: DIMS_DOOR, includes: true, fields: ['wood', 'sashes', 'glass', 'hinges', 'finish', 'acc'] },
    { id: 'home', label: 'أثاث منزلي', icon: 'table', desc: 'ترابيزات ومكاتب ومكتبات ورفوف',
      types: ['ترابيزة', 'طاولة', 'مكتب', 'كرسي', 'وحدة تلفزيون', 'مكتبة', 'رفوف', 'جزامة', 'وحدة تخزين'],
      methods: ['piece', 'lump', 'lm', 'sqm', 'list'], method: 'piece', dims: DIMS, fields: ['wood', 'board', 'finish', 'acc'], cut: true },
    { id: 'office', label: 'أثاث مكتبي وتجاري', icon: 'desk', desc: 'مكاتب وكاونترات ومحلات ومطاعم',
      types: ['مكتب', 'وحدة استقبال', 'كاونتر', 'أثاث محلات', 'وحدة عرض', 'أثاث مطاعم وكافيهات', 'أثاث مدارس', 'دولاب ملفات'],
      methods: ['piece', 'lump', 'lm', 'sqm', 'list'], method: 'piece', dims: DIMS, fields: ['wood', 'board', 'finish', 'acc'], cut: true },
    { id: 'decor', label: 'ديكور خشبي', icon: 'decor', desc: 'خلف التلفزيون والسرير وفواصل وبانوهات',
      types: ['ديكور خلف التلفزيون', 'ديكور خلف السرير', 'فاصل خشبي', 'قاطوع', 'بانوه', 'كرانيش خشب', 'وزرة', 'تغطية عمود', 'ديكور محل', 'ديكور مكتب', 'ديكور مطعم'],
      methods: ['sqm', 'lm', 'piece', 'lump', 'board'], method: 'sqm', dims: DIMS_FLAT, fields: ['board', 'thick', 'finish', 'mount'] },
    { id: 'cladding', label: 'كسوات حوائط وأسقف', icon: 'wall', desc: 'كسوة وبديل خشب وشرائح وأسقف',
      types: ['كسوة حائط خشب', 'بديل خشب', 'شرائح خشبية', 'سقف خشبي', 'تجليد عمود'],
      methods: ['sqm', 'lm', 'piece', 'lump'], method: 'sqm', dims: DIMS_FLAT, fields: ['board', 'thick', 'finish', 'mount'] },
    { id: 'pergola', label: 'برجولات وخارجي', icon: 'pergola', desc: 'برجولات ومظلات وأسوار وحدائق',
      types: ['برجولة', 'مظلة خشبية', 'جلسة خارجية', 'مقعد حديقة', 'سور خشبي', 'فاصل خارجي', 'صندوق زراعة'],
      methods: ['sqm', 'lm', 'piece', 'lump'], method: 'sqm', dims: DIMS_FLAT, fields: ['wood', 'treat', 'outFinish'] },
    { id: 'custom', label: 'حسب الطلب', icon: 'star', desc: 'أي قطعة بالمقاس اللي العميل عايزه',
      types: [], methods: ALL, method: 'piece', dims: DIMS, fields: ['wood', 'board', 'thick', 'finish', 'acc'], cut: true },
    { id: 'cnc', label: 'CNC وحفر وتشكيل', icon: 'cnc', desc: 'قص وحفر ونقش وتفريغ',
      types: ['قص ألواح', 'حفر زخارف', 'نقش', 'تشكيل حواف', 'تصميم أبواب', 'تصميم ديكور', 'تفريغ أشكال', 'أجزاء مخصصة', 'شغل بملف تصميم'],
      methods: ['piece', 'board', 'lm', 'sqm', 'hour', 'lump'], method: 'piece', dims: DIMS_FLAT, fields: ['board', 'thick'],
      extras: ['تصميم', 'تجهيز الملف', 'تقطيع', 'حفر', 'تشطيب'] },
    { id: 'repair', label: 'صيانة وتجديد', icon: 'wrench', desc: 'إصلاح وتغيير وضبط وتجديد',
      types: ['إصلاح باب', 'إصلاح دولاب', 'إصلاح أدراج', 'تغيير مفصلات', 'تغيير سحّابات', 'تغيير مقابض', 'ضبط أبواب', 'صيانة مطبخ', 'تغيير أجزاء تالفة', 'تعديل مقاسات', 'تجديد موبيليا', 'فك وتركيب', 'إعادة تشطيب'],
      rows: ['تغيير مفصلة', 'تغيير سحّاب', 'تغيير مقبض', 'ضبط ضلفة', 'إصلاح درج', 'تغيير جزء تالف', 'إعادة دهان'],
      methods: ['list', 'piece', 'lump', 'daily'], method: 'list', dims: DIMS, fields: ['problem'], extras: ['انتقال', 'قطع غيار'] },
    { id: 'install', label: 'تركيب وفك ونقل', icon: 'truck', desc: 'تركيب وفك ونقل وإعادة تركيب',
      types: ['تركيب أثاث', 'تركيب غرفة نوم', 'تركيب مطبخ', 'تركيب دولاب', 'فك أثاث', 'نقل وإعادة تركيب', 'تعديل أثناء التركيب', 'تركيب وحدات جاهزة', 'تركيب إكسسوارات'],
      rows: ['دولاب', 'سرير', 'كومود', 'تسريحة', 'وحدة مطبخ', 'وحدة تلفزيون', 'مكتبة'],
      methods: ['piece', 'list', 'daily', 'lump'], method: 'piece', dims: DIMS, fields: [], extras: ['فك', 'نقل', 'عمالة إضافية'] }
  ];

  // أسماء جاهزة للخامات والمستلزمات (من غير أسعار)
  var COST_SUG = {
    mat: ['لوح MDF', 'لوح HDF', 'كونتر', 'أبلكاش', 'خشب موسكي', 'خشب زان', 'خشب سويدي', 'خشب أرو', 'لاميكا', 'قشرة خشب', 'ألواح PVC', 'أكريليك', 'HPL', 'زجاج', 'مرايا'],
    acc: ['مفصلات', 'سحّابات', 'مجاري أدراج', 'مقابض', 'كالون', 'أرجل', 'قواعد', 'علاقات', 'زوايا', 'وصلات', 'وحدات رفع', 'سلال', 'إكسسوار زاوية', 'إضاءة'],
    cons: ['مسامير', 'براغي', 'غراء', 'كولا', 'شريط حواف', 'شريط PVC', 'صنفرة', 'مواد دهان', 'مواد تلميع', 'سلاح منشار', 'أدوات CNC'],
    waste: ['هالك ألواح', 'هالك خشب طبيعي', 'هالك القص', 'بواقي ألواح'],
    labor: ['يومية صنايعي', 'يومية مساعد', 'يومية عامل'],
    transport: ['نقل', 'عربية', 'تحميل وتنزيل'],
    install: ['تركيب', 'فك'],
    run: ['كهربا الورشة', 'تشغيل ماكينة', 'تشغيل CNC'],
    other: ['مصاريف أخرى']
  };
  var COST_UNITS = { mat: ['لوح', 'م²', 'م³', 'م.ط', 'قطعة'], acc: ['قطعة', 'طقم', 'عبوة'], cons: ['عبوة', 'كيلو', 'متر', 'لفة', 'قطعة'], waste: ['لوح', 'م²', 'م³'],
    labor: ['يوم', 'ساعة'], transport: ['نقلة', 'مشوار'], install: ['مرة', 'قطعة'], run: ['ساعة', 'يوم'], other: ['مرة'] };
  var BOARD_SIZES = [[2440, 1220], [2750, 1830], [2800, 2070], [2440, 1830]];

  root.CarpCatalog = { FIELDS: FIELDS, CATS: CATS, COST_SUG: COST_SUG, COST_UNITS: COST_UNITS, BOARD_SIZES: BOARD_SIZES, cat: function (id) { return CATS.find(function (c) { return c.id === id; }) || CATS[11]; } };
})(typeof window !== 'undefined' ? window : this);
