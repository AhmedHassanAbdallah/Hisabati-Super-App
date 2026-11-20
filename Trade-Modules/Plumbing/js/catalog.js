/* =========================================================
   أرزقي السباكة - catalog.js
   تصنيفات أعمال السباكة والصحي، طرق المحاسبة، تعريف النقطة،
   أنواع المستندات والخامات، وتنظيف البيانات المحفوظة والمستوردة.
   © 2026 أحمد حسن عبدالله - جميع الحقوق محفوظة.
   ========================================================= */

/* ---------- أنواع المستندات ---------- */
const DOC_TYPES = {
  invoice: { label: 'فاتورة أعمال سباكة', short: 'فاتورة أعمال', prefix: 'INV', billable: true, icon: 'file' },
  supply: { label: 'فاتورة توريد وتركيب', short: 'توريد وتركيب', prefix: 'SUP', billable: true, icon: 'box' },
  maint: { label: 'فاتورة صيانة وإصلاح', short: 'صيانة', prefix: 'MNT', billable: true, icon: 'wrench' },
  final: { label: 'فاتورة ختامية', short: 'ختامية', prefix: 'FIN', billable: true, icon: 'check' },
  est_rough: { label: 'مقايسة تأسيس سباكة', short: 'مقايسة تأسيس', prefix: 'EST', billable: false, icon: 'pipe' },
  est_finish: { label: 'مقايسة تشطيب سباكة', short: 'مقايسة تشطيب', prefix: 'ESF', billable: false, icon: 'faucet' },
  est_supply: { label: 'مقايسة شبكة تغذية', short: 'مقايسة تغذية', prefix: 'ESW', billable: false, icon: 'droplet' },
  est_drain: { label: 'مقايسة شبكة صرف', short: 'مقايسة صرف', prefix: 'ESD', billable: false, icon: 'drain' },
  est_bath: { label: 'مقايسة حمام', short: 'مقايسة حمام', prefix: 'ESB', billable: false, icon: 'bath' },
  est_kitchen: { label: 'مقايسة مطبخ', short: 'مقايسة مطبخ', prefix: 'ESK', billable: false, icon: 'sink' },
  quote: { label: 'عرض سعر', short: 'عرض سعر', prefix: 'QUO', billable: false, icon: 'tag' }
};
const DOC_TYPE_ORDER = ['invoice', 'supply', 'maint', 'final', 'est_rough', 'est_finish', 'est_supply', 'est_drain', 'est_bath', 'est_kitchen', 'quote'];
function docTypeInfo(t) { return DOC_TYPES[t] || DOC_TYPES.invoice; }

/* ---------- طرق المحاسبة لكل بند ---------- */
// mult: مضاعف إضافي (عدد الخطوط للمواسير / عدد العمال لليومية)
const METHODS = {
  point: { label: 'بالنقطة', unit: 'نقطة', qty: 'عدد النقاط', price: 'سعر النقطة' },
  bath: { label: 'بالحمام', unit: 'حمام', qty: 'عدد الحمامات', price: 'سعر الحمام' },
  kitchen: { label: 'بالمطبخ', unit: 'مطبخ', qty: 'عدد المطابخ', price: 'سعر المطبخ' },
  meter: { label: 'بالمتر الطولي', unit: 'م.ط', qty: 'الطول (متر)', price: 'سعر المتر', mult: 'عدد الخطوط' },
  piece: { label: 'بالقطعة', unit: 'قطعة', qty: 'العدد', price: 'سعر القطعة' },
  supply: { label: 'توريد وتركيب', unit: 'قطعة', qty: 'العدد', price: 'سعر البيع للوحدة' },
  daily: { label: 'باليومية', unit: 'يوم', qty: 'عدد الأيام', price: 'اليومية', mult: 'عدد العمال' },
  hour: { label: 'بالساعة', unit: 'ساعة', qty: 'عدد الساعات', price: 'سعر الساعة' },
  visit: { label: 'بالزيارة', unit: 'زيارة', qty: 'عدد الزيارات', price: 'رسوم الزيارة' },
  job: { label: 'بالعملية', unit: 'عملية', qty: 'العدد', price: 'سعر العملية' },
  cubic: { label: 'بالمتر المكعب', unit: 'م³', qty: 'الحجم (م³)', price: 'سعر المتر المكعب' },
  lump: { label: 'مقاولة (مبلغ إجمالي)', unit: 'مقطوعية', qty: null, price: 'قيمة المقاولة' },
  stage: { label: 'مرحلة تنفيذ', unit: 'مرحلة', qty: 'الكمية', price: 'سعر المرحلة' }
};
const METHOD_ORDER = ['point', 'bath', 'kitchen', 'meter', 'piece', 'supply', 'daily', 'hour', 'visit', 'job', 'cubic', 'lump', 'stage'];

/* ---------- نوع البند (للفصل في الحساب والفاتورة) ---------- */
const LINE_KINDS = {
  service: 'المصنعية والخدمات',
  diag: 'الكشف ورسوم الزيارات',
  material: 'المواسير والخامات',
  fitting: 'القطع والوصلات',
  fixture: 'الأدوات الصحية',
  equipment: 'المعدات (طلمبات / خزانات / سخانات / فلاتر)',
  part: 'قطع الغيار',
  labor: 'أجور العمال',
  excavation: 'الحفر والردم',
  transport: 'النقل والانتقالات',
  other: 'أخرى'
};
const KIND_ORDER = ['service', 'diag', 'material', 'fitting', 'fixture', 'equipment', 'part', 'labor', 'excavation', 'transport', 'other'];
// أنواع لها مصدر توريد (السباك أو العميل)، سعر شراء، سعر بيع، ومصنعية تركيب منفصلة
const SUPPLY_KINDS = ['material', 'fitting', 'fixture', 'equipment', 'part'];

/* ---------- تعريف النقطة ---------- */
// نوع الخدمة لكل نقطة: نقطة جهاز كاملة، أو توصيلة منفردة (بارد / ساخن / صرف)
const POINT_CONN = { fixture: 'نقطة جهاز', cold: 'تغذية باردة', hot: 'تغذية ساخنة', drain: 'صرف' };
const POINT_DEFS = {
  combined: { label: 'نقطة الجهاز شاملة', desc: 'نقطة الجهاز تشمل التغذية الباردة والساخنة والصرف — أي توصيلة منفردة لنفس الجهاز في نفس المكان تعتبر تكرار.' },
  separate: { label: 'كل توصيلة لوحدها', desc: 'كل توصيلة (بارد / ساخن / صرف) بتتحسب نقطة مستقلة.' }
};
const DEFAULT_POINT_TYPES = [
  ['نقطة حوض', 'fixture'], ['نقطة قاعدة حمام', 'fixture'], ['نقطة شطاف', 'fixture'], ['نقطة دش', 'fixture'], ['نقطة خلاط', 'fixture'],
  ['نقطة سخان', 'fixture'], ['نقطة غسالة', 'fixture'], ['نقطة غسالة أطباق', 'fixture'], ['نقطة حوض مطبخ', 'fixture'], ['نقطة فلتر', 'fixture'],
  ['نقطة تغذية باردة', 'cold'], ['نقطة تغذية ساخنة', 'hot'],
  ['نقطة صرف أرضي', 'drain'], ['نقطة صرف حوض', 'drain'], ['نقطة صرف غسالة', 'drain'], ['نقطة صرف قاعدة حمام', 'drain']
];
// استنتاج نوع التوصيلة من اسم النقطة لو مش محدد
function connOfName(name) {
  const n = String(name || '');
  if (/صرف/.test(n)) return 'drain';
  if (/ساخن/.test(n)) return 'hot';
  if (/بارد|تغذية/.test(n)) return 'cold';
  return 'fixture';
}
// اسم الجهاز داخل النقطة: «نقطة صرف حوض» ← «حوض»
function pointDevice(name) {
  return String(name || '').replace(/نقطة|صرف|تغذية|باردة|ساخنة|بارد|ساخن/g, ' ').replace(/\s+/g, ' ').trim();
}
function normPointType(p) {
  if (Array.isArray(p)) p = { name: p[0], conn: p[1] };
  if (!p || typeof p !== 'object' || !String(p.name || '').trim()) return null;
  return { id: String(p.id || '') || uid('pt'), name: String(p.name).trim(), conn: POINT_CONN[p.conn] ? p.conn : connOfName(p.name) };
}
function pointTypes() {
  if (!Array.isArray(settings.pointTypes)) settings.pointTypes = DEFAULT_POINT_TYPES.map(normPointType);
  return settings.pointTypes;
}
function pointDef() { return POINT_DEFS[settings.pointDef] ? settings.pointDef : 'combined'; }

/* ---------- مراحل العمل (قابلة للتعديل) ---------- */
const DEFAULT_STAGES = ['المعاينة', 'تحديد المسارات', 'التكسير', 'تجهيز المسارات', 'تأسيس شبكة التغذية', 'تأسيس شبكة الصرف', 'تركيب المحابس',
  'تمديد الصواعد', 'الاختبارات', 'إغلاق المسارات', 'تركيب الأدوات الصحية', 'التشغيل', 'التسليم'];
function stagesList() {
  if (!Array.isArray(settings.stages)) settings.stages = DEFAULT_STAGES.slice();
  return settings.stages;
}

/* ---------- تصنيفات الأعمال (A - I وغيرها) ---------- */
// كل عنصر: [الاسم، طريقة الحساب الافتراضية، نوع البند]
const FIXTURE_NAMES = ['قاعدة حمام', 'حوض', 'بيديه', 'شطاف', 'خلاط', 'خلاط دش', 'رأس دش', 'طقم صحي', 'سيفون', 'صندوق طرد', 'محبس زاوية', 'صفاية', 'حوض مطبخ', 'إكسسوارات حمام', 'وصلات أدوات صحية'];
const WORK_CATS = {
  points: { name: 'النقاط', icon: 'droplet', items: [] }, // بتتقرا من تعريف النقاط (قابلة للتعديل)
  residential: { name: 'السباكة المنزلية', icon: 'home', items: [
    ['تأسيس حمام', 'bath', 'service'], ['تأسيس مطبخ', 'kitchen', 'service'], ['تأسيس شقة', 'lump', 'service'], ['تأسيس فيلا', 'lump', 'service'],
    ['تأسيس حمام ضيوف', 'bath', 'service'], ['تأسيس غرفة غسيل', 'lump', 'service'], ['تمديدات المياه الساخنة والباردة', 'meter', 'service'],
    ['تمديدات الصرف الداخلي', 'meter', 'service'], ['تغيير شبكة سباكة قديمة', 'lump', 'service'], ['أعمال سباكة التشطيبات', 'lump', 'service'],
    ['تشطيب حمام', 'bath', 'service'], ['تشطيب مطبخ', 'kitchen', 'service'], ['تأسيس مبنى', 'lump', 'service']
  ] },
  supplynet: { name: 'شبكات تغذية المياه', icon: 'pipe', items: [
    ['خط مياه باردة', 'meter', 'service'], ['خط مياه ساخنة', 'meter', 'service'], ['خط رئيسي', 'meter', 'service'], ['خط فرعي', 'meter', 'service'],
    ['صاعد مياه', 'meter', 'service'], ['تمديدات أفقية', 'meter', 'service'], ['توصيلة مياه', 'piece', 'service'], ['تركيب محبس', 'piece', 'service'],
    ['وصلة ربط', 'piece', 'service'], ['خط خزان', 'meter', 'service'], ['خط مضخة', 'meter', 'service'], ['تنفيذ شبكة مياه', 'lump', 'service']
  ] },
  drain: { name: 'الصرف', icon: 'drain', items: [
    ['صرف حمام', 'lump', 'service'], ['صرف مطبخ', 'lump', 'service'], ['صرف غسالة', 'point', 'service'], ['صرف حوض', 'point', 'service'],
    ['صرف قاعدة', 'point', 'service'], ['صرف دش', 'point', 'service'], ['صفاية أرضية', 'piece', 'service'], ['عمود صرف', 'meter', 'service'],
    ['خط تهوية', 'meter', 'service'], ['خط صرف رئيسي', 'meter', 'service'], ['غرفة تفتيش', 'piece', 'service'], ['خط صرف خارجي', 'meter', 'service'],
    ['إصلاح انسداد صرف', 'job', 'service'], ['تغيير مواسير صرف', 'meter', 'service'], ['تنفيذ شبكة صرف', 'lump', 'service']
  ] },
  fixtures: { name: 'تركيب الأدوات الصحية', icon: 'faucet', items: FIXTURE_NAMES.map(n => ['تركيب ' + n, 'piece', 'service']) },
  sanitary: { name: 'توريد أدوات صحية', icon: 'bath', items: FIXTURE_NAMES.map(n => [n, 'supply', 'fixture']) },
  heaters: { name: 'السخانات', icon: 'heater', items: [
    ['تركيب سخان كهرباء', 'piece', 'service'], ['تركيب سخان غاز', 'piece', 'service'], ['تركيب سخان مركزي', 'piece', 'service'], ['تركيب سخان فوري', 'piece', 'service'],
    ['فك وتركيب سخان', 'piece', 'service'], ['تمديد مياه للسخان', 'meter', 'service'], ['تركيب محابس ووصلات السخان', 'job', 'service'],
    ['صيانة توصيلات السخان', 'job', 'service'], ['تغيير قطعة سخان', 'piece', 'part'], ['توريد سخان', 'supply', 'equipment']
  ] },
  pumps: { name: 'الطلمبات والخزانات', icon: 'pump', items: [
    ['تركيب طلمبة رفع مياه', 'piece', 'service'], ['تركيب طلمبة تقوية ضغط', 'piece', 'service'], ['تركيب طلمبة غاطسة', 'piece', 'service'], ['تركيب طلمبة صرف', 'piece', 'service'],
    ['تركيب خزان أرضي', 'piece', 'service'], ['تركيب خزان علوي', 'piece', 'service'], ['تركيب عوامة خزان', 'piece', 'service'], ['تركيب مفتاح ضغط', 'piece', 'service'],
    ['تركيب محبس عدم رجوع', 'piece', 'service'], ['تركيب نظام تحكم', 'job', 'service'], ['توصيلات السحب والطرد', 'job', 'service'],
    ['توريد طلمبة', 'supply', 'equipment'], ['توريد خزان', 'supply', 'equipment']
  ] },
  filters: { name: 'الفلاتر ومعالجة المياه', icon: 'filter', items: [
    ['تركيب فلتر منزلي', 'piece', 'service'], ['تركيب فلتر متعدد المراحل', 'piece', 'service'], ['تركيب فلتر مركزي', 'piece', 'service'], ['تركيب محطة معالجة صغيرة', 'lump', 'service'],
    ['تغيير شمعات الفلتر', 'job', 'service'], ['صيانة فلتر', 'job', 'service'], ['تركيب وصلات مياه الفلتر', 'job', 'service'], ['تركيب خط صرف الفلتر', 'job', 'service'],
    ['توريد فلتر', 'supply', 'equipment'], ['شمعة فلتر', 'piece', 'part']
  ] },
  external: { name: 'الشبكات الخارجية', icon: 'shovel', items: [
    ['تمديد خط مياه خارجي', 'meter', 'service'], ['تمديد خط صرف خارجي', 'meter', 'service'], ['حفر', 'cubic', 'excavation'], ['ردم', 'cubic', 'excavation'],
    ['نزح مياه', 'cubic', 'excavation'], ['نقل مخلفات', 'cubic', 'excavation'], ['غرفة تفتيش خارجية', 'piece', 'service'], ['توصيل بالشبكة العمومية', 'job', 'service'],
    ['خط طرد', 'meter', 'service'], ['محبس رئيسي', 'piece', 'service'], ['إصلاح خارجي', 'job', 'service']
  ] },
  maint: { name: 'الصيانة والإصلاح', icon: 'wrench', items: [
    ['كشف تسريب', 'job', 'diag'], ['إصلاح تسريب ماسورة', 'job', 'service'], ['إصلاح خلاط', 'job', 'service'], ['تغيير محبس', 'job', 'service'],
    ['إصلاح سيفون', 'job', 'service'], ['تسليك حوض', 'job', 'service'], ['تسليك حمام', 'job', 'service'], ['تسليك صرف', 'job', 'service'],
    ['إصلاح طلمبة', 'job', 'service'], ['إصلاح عوامة خزان', 'job', 'service'], ['إصلاح توصيلات سخان', 'job', 'service'],
    ['تغيير قطعة تالفة', 'job', 'service'], ['صيانة دورية', 'job', 'service']
  ] },
  visits: { name: 'الزيارات', icon: 'calendar', items: [
    ['زيارة كشف', 'visit', 'diag'], ['زيارة إصلاح', 'visit', 'diag'], ['زيارة متابعة', 'visit', 'diag'], ['زيارة طوارئ', 'visit', 'diag'], ['زيارة صيانة دورية', 'visit', 'diag']
  ] },
  pipes: { name: 'المواسير', icon: 'pipe', items: [
    ['ماسورة PPR', 'meter', 'material'], ['ماسورة PVC', 'meter', 'material'], ['ماسورة UPVC', 'meter', 'material'], ['ماسورة CPVC', 'meter', 'material'],
    ['ماسورة PEX', 'meter', 'material'], ['ماسورة HDPE', 'meter', 'material'], ['ماسورة نحاس', 'meter', 'material'], ['ماسورة حديد مجلفن', 'meter', 'material']
  ] },
  fittings: { name: 'القطع والوصلات', icon: 'valve', items: [
    ['كوع', 'piece', 'fitting'], ['تيه', 'piece', 'fitting'], ['جلبة', 'piece', 'fitting'], ['مخفض', 'piece', 'fitting'], ['وصلة', 'piece', 'fitting'],
    ['محبس', 'piece', 'fitting'], ['وصلة نحاسية', 'piece', 'fitting'], ['وصلة ملولبة', 'piece', 'fitting'], ['كلبس', 'piece', 'fitting'],
    ['حامل', 'piece', 'fitting'], ['أدوات ربط', 'piece', 'fitting']
  ] },
  labor: { name: 'الأجور والنقل', icon: 'hard', items: [
    ['يومية سباك', 'daily', 'labor'], ['يومية مساعد', 'daily', 'labor'], ['يومية معلم سباكة', 'daily', 'labor'], ['ساعات عمل إضافية', 'hour', 'labor'],
    ['تكسير وفتح مسارات', 'meter', 'service'], ['إغلاق المسارات', 'meter', 'service'], ['اختبار ضغط الشبكة', 'job', 'service'],
    ['نقل خامات', 'lump', 'transport'], ['انتقالات', 'lump', 'transport']
  ] }
};
const WORK_CAT_ORDER = ['points', 'residential', 'supplynet', 'drain', 'fixtures', 'sanitary', 'heaters', 'pumps', 'filters', 'external', 'maint', 'visits', 'pipes', 'fittings', 'labor'];
// بنود التصنيف (النقاط بتيجي من تعريف المستخدم)
function catItems(cat) {
  if (cat === 'points') return pointTypes().map(p => [p.name, 'point', 'service', p.conn]);
  return (WORK_CATS[cat] || { items: [] }).items;
}
// التصنيف المقترح أول ما تفتح البنود حسب نوع المستند
const DOC_DEFAULT_CAT = { invoice: 'points', supply: 'sanitary', maint: 'maint', final: 'points', est_rough: 'points', est_finish: 'fixtures', est_supply: 'supplynet', est_drain: 'drain', est_bath: 'residential', est_kitchen: 'residential', quote: 'points' };

/* ---------- المواسير والشبكات والأماكن ---------- */
const PIPE_TYPES = ['PPR', 'PVC', 'UPVC', 'CPVC', 'PEX', 'HDPE', 'نحاس', 'حديد مجلفن'];
const PIPE_SIZES = ['16 مم', '20 مم', '25 مم', '32 مم', '40 مم', '50 مم', '63 مم', '75 مم', '90 مم', '110 مم', '160 مم', '1/2"', '3/4"', '1"', '1 1/4"', '1 1/2"', '2"', '3"', '4"', '6"'];
const PIPE_PRESSURES = ['PN10', 'PN16', 'PN20', 'PN25', 'SDR11', 'SDR17', 'ضغط 4 بار', 'ضغط 6 بار', 'ضغط 10 بار'];
const NET_TYPES = ['شبكة تغذية مياه', 'شبكة مياه ساخنة', 'شبكة صرف', 'شبكة خارجية', 'خط خزان / مضخة'];
const NET_PARTS = ['خط رئيسي', 'خط فرعي', 'خطوط تغذية', 'خطوط ساخن', 'خطوط بارد', 'خطوط صرف', 'صواعد', 'خطوط طرد'];
const FITTING_NAMES = ['كوع', 'تيه', 'جلبة', 'مخفض', 'وصلة', 'محبس', 'وصلة نحاسية', 'وصلة ملولبة', 'كلبس', 'حامل', 'أدوات ربط'];
const SPACE_TYPES = ['شقة', 'فيلا', 'دور', 'حمام', 'مطبخ', 'غرفة غسيل', 'حديقة', 'غرفة مضخات', 'خزان', 'شبكة خارجية'];
const PROP_TYPES = ['شقة', 'فيلا', 'عمارة / مبنى', 'محل تجاري', 'مكتب', 'مصنع / ورشة', 'مسجد', 'مدرسة', 'موقع خارجي', 'أخرى'];
const PROJECT_STATUS = {
  new: { label: 'لم يبدأ', color: 'var(--muted)' },
  progress: { label: 'جاري التنفيذ', color: 'var(--primary)' },
  paused: { label: 'متوقف', color: 'var(--orange-600)' },
  done: { label: 'تم التنفيذ', color: 'var(--success)' },
  delivered: { label: 'تم التسليم', color: 'var(--success)' }
};
const TANK_PUMP_TYPES = ['طلمبة رفع مياه', 'طلمبة تقوية ضغط', 'طلمبة غاطسة', 'طلمبة صرف', 'خزان أرضي', 'خزان علوي', 'عوامة خزان', 'مفتاح ضغط', 'محبس عدم رجوع',
  'نظام تحكم', 'خط سحب', 'خط طرد', 'محبس', 'وصلة ربط', 'قاعدة / حامل', 'أعمال توصيل'];
const BRANDS = ['ليسيكو', 'ديورافيت', 'إيديال ستاندرد', 'جروهي', 'كليوباترا', 'بي آر', 'الشريف', 'أكواثيرم', 'بانينجر', 'كالبيدا', 'بيدرولو', 'جراندفوس', 'أوليمبيك', 'فريش', 'تورنيدو'];

/* ---------- الزيارات وسجل الصيانة ---------- */
const VISIT_STATUS = {
  progress: { label: 'قيد التنفيذ', color: 'var(--primary)' },
  done: { label: 'تم الإصلاح', color: 'var(--success)' },
  parts: { label: 'بانتظار قطع غيار', color: 'var(--orange-600)' },
  followup: { label: 'تحت المتابعة', color: 'var(--primary)' },
  notfixed: { label: 'لم يتم الإصلاح', color: 'var(--danger)' }
};
const VISIT_TYPES = ['زيارة كشف', 'زيارة إصلاح', 'زيارة متابعة', 'زيارة طوارئ', 'زيارة صيانة دورية', 'زيارة ضمن عقد'];
const PROBLEM_TYPES = ['تسريب مياه', 'انسداد صرف', 'ضعف ضغط المياه', 'عطل خلاط', 'عطل سيفون / طرد', 'عطل محبس', 'عطل طلمبة', 'عطل سخان', 'عطل عوامة خزان', 'رشح / رطوبة', 'روائح صرف', 'تغيير قطعة', 'صيانة دورية', 'أخرى'];
const REPAIR_TYPES = ['إصلاح', 'تغيير قطعة', 'تسليك', 'وصلة جديدة / لحام', 'تغيير ماسورة', 'كشف فقط', 'صيانة دورية'];
const FAULT_LOCATIONS = ['حمام رئيسي', 'حمام ضيوف', 'مطبخ', 'غرفة غسيل', 'السطح', 'الخزان', 'غرفة المضخات', 'المنور', 'الحديقة', 'خط خارجي'];
const SPARE_PARTS = ['محبس زاوية', 'قلب خلاط', 'خرطوم شطاف', 'خرطوم توصيل', 'عوامة', 'طقم سيفون', 'جلدة', 'كوع', 'وصلة', 'شمعة فلتر', 'مفتاح ضغط', 'محبس عدم رجوع', 'قطعة غيار أخرى'];

/* ---------- الخامات والأدوات الصحية (المخزن) ---------- */
const INV_GROUPS = {
  'المواسير': ['مواسير PPR', 'مواسير PVC', 'مواسير UPVC', 'مواسير CPVC', 'مواسير PEX', 'مواسير HDPE', 'مواسير نحاس', 'مواسير حديد مجلفن'],
  'القطع والوصلات': ['أكواع', 'تيهات', 'جلب', 'مخفضات', 'وصلات', 'محابس', 'كلبسات', 'حوامل'],
  'الأدوات الصحية': ['قواعد', 'أحواض', 'خلاطات', 'شطافات', 'دش', 'سيفونات', 'صفايات', 'أطقم صحية'],
  'معدات أخرى': ['طلمبات', 'خزانات', 'سخانات', 'فلاتر', 'عوامات', 'إكسسوارات', 'أدوات تركيب', 'قطع غيار', 'خامات أخرى']
};
const INV_CATS = [].concat(...Object.keys(INV_GROUPS).map(g => INV_GROUPS[g]));
const INV_UNITS = ['قطعة', 'متر', 'عود', 'لفة', 'كجم', 'علبة', 'كرتونة', 'طقم'];
// نوع البند في الفاتورة حسب تصنيف المخزن
function invCatKind(cat) {
  if (INV_GROUPS['المواسير'].includes(cat)) return 'material';
  if (INV_GROUPS['القطع والوصلات'].includes(cat)) return 'fitting';
  if (INV_GROUPS['الأدوات الصحية'].includes(cat)) return 'fixture';
  if (['طلمبات', 'خزانات', 'سخانات', 'فلاتر'].includes(cat)) return 'equipment';
  if (['قطع غيار', 'عوامات'].includes(cat)) return 'part';
  return 'material';
}
const KIND_CAT = { material: 'pipes', fitting: 'fittings', fixture: 'sanitary', equipment: 'pumps', part: 'maint' };

/* ---------- الحسابات ---------- */
const PAY_METHODS = ['كاش', 'تحويل بنكي', 'محفظة إلكترونية', 'إنستاباي', 'شيك', 'أخرى'];
const PAY_KINDS = { deposit: 'عربون', payment: 'دفعة', final: 'دفعة أخيرة' };
const EXPENSE_CATS = ['خامات ومواسير', 'أدوات صحية', 'قطع غيار', 'أجور عمال', 'نقل ومواصلات', 'حفر وردم', 'أدوات ومعدات', 'وقود', 'إيجار ومصاريف ثابتة', 'اتصالات', 'أخرى'];
// مصروفات هي في حقيقتها تكلفة شراء الخامات (علشان ما تتحسبش مرتين مع تكلفة الشراء المسجلة في البنود)
const MATERIAL_EXP_CATS = ['خامات ومواسير', 'أدوات صحية', 'قطع غيار'];
function kindExpenseCat(kind) { return kind === 'fixture' || kind === 'equipment' ? 'أدوات صحية' : kind === 'part' ? 'قطع غيار' : 'خامات ومواسير'; }
const WORKER_ENTRY = {
  day: { label: 'يومية / حضور', icon: 'calendar' },
  overtime: { label: 'إضافي', icon: 'clock' },
  advance: { label: 'سلفة', icon: 'cash' },
  deduction: { label: 'خصم', icon: 'minus' },
  payout: { label: 'صرف مستحقات', icon: 'wallet' }
};
const SPECIALTIES = ['معلم سباكة', 'سباك', 'فني سباكة وصحي', 'مساعد سباك', 'فني صيانة', 'فني لحام', 'عامل حفر', 'سائق / نقل'];

/* ---------- العقود والنوتة ---------- */
const CONTRACT_PERIODS = { monthly: { label: 'شهري', months: 1 }, quarterly: { label: 'ربع سنوي', months: 3 }, semi: { label: 'نصف سنوي', months: 6 }, annual: { label: 'سنوي', months: 12 } };
const CONTRACT_SERVICES = ['كشف دوري على التسريبات', 'تسليك الصرف', 'صيانة الخلاطات والمحابس', 'صيانة السيفونات', 'صيانة الطلمبات', 'تنظيف الخزانات', 'صيانة السخانات', 'تغيير شمعات الفلاتر', 'زيارات الطوارئ'];
const NOTE_CATS = ['مقاسات المواسير', 'أنواع الخامات', 'مواقع المحابس', 'تفاصيل المسارات', 'بيانات الخزانات', 'بيانات الطلمبات', 'تفاصيل الاتفاق', 'ملاحظات العميل', 'الأعمال الإضافية', 'الملاحظات اليومية', 'مواعيد الزيارات'];

/* ---------- قوائم الأسعار (أسماء فقط، الأسعار يحددها المستخدم) ---------- */
const PRICE_PRESETS = [
  ['نقطة تغذية باردة', 'points', 'point'], ['نقطة تغذية ساخنة', 'points', 'point'], ['نقطة صرف أرضي', 'points', 'point'], ['نقطة حوض', 'points', 'point'],
  ['تأسيس حمام', 'residential', 'bath'], ['تأسيس مطبخ', 'residential', 'kitchen'],
  ['ماسورة PPR', 'pipes', 'meter'], ['ماسورة PVC', 'pipes', 'meter'], ['تمديدات المياه الساخنة والباردة', 'residential', 'meter'],
  ['تركيب محبس', 'supplynet', 'piece'], ['تركيب قاعدة حمام', 'fixtures', 'piece'], ['تركيب حوض', 'fixtures', 'piece'], ['تركيب خلاط', 'fixtures', 'piece'],
  ['تركيب سخان كهرباء', 'heaters', 'piece'], ['تركيب طلمبة رفع مياه', 'pumps', 'piece'], ['تسليك صرف', 'maint', 'job'], ['كشف تسريب', 'maint', 'job'],
  ['زيارة كشف', 'visits', 'visit'], ['يومية سباك', 'labor', 'daily'], ['يومية مساعد', 'labor', 'daily'], ['حفر', 'external', 'cubic']
];

/* =========================================================
   تنظيف البيانات (عند التحميل والاستيراد)
   ========================================================= */
const S = v => String(v == null ? '' : v);
const arr = v => (Array.isArray(v) ? v.filter(x => x && typeof x === 'object') : []);
function round3(n) { return Math.round((Number(n) || 0) * 1000) / 1000; }
const NORMALIZERS = {
  docs: d => ({
    id: S(d.id) || uid('d_'), number: S(d.number), docType: DOC_TYPES[d.docType] ? d.docType : 'invoice',
    clientName: S(d.clientName), clientPhone: S(d.clientPhone), clientAddress: S(d.clientAddress),
    customerId: d.customerId ? S(d.customerId) : null, projectId: d.projectId ? S(d.projectId) : null, siteText: S(d.siteText),
    date: S(d.date) || todayISO(), validUntil: S(d.validUntil), notes: S(d.notes),
    // تفاصيل المقاولة / الاتفاق
    scope: S(d.scope), included: S(d.included), excluded: S(d.excluded), startDate: S(d.startDate), endDate: S(d.endDate), terms: S(d.terms),
    warrantyMonths: pos(d.warrantyMonths), warrantyTerms: S(d.warrantyTerms),
    addAmount: pos(d.addAmount), addNote: S(d.addNote), discountAmount: pos(d.discountAmount),
    workerIds: Array.isArray(d.workerIds) ? d.workerIds.map(S) : [], visitId: d.visitId ? S(d.visitId) : null,
    convertedFrom: S(d.convertedFrom), stockApplied: d.stockApplied && typeof d.stockApplied === 'object' ? d.stockApplied : {},
    createdAt: n0(d.createdAt) || Date.now(), updatedAt: n0(d.updatedAt) || Date.now(),
    lines: arr(d.lines).map(normalizeLine)
  }),
  customers: c => ({ id: S(c.id) || uid('c_'), name: S(c.name) || 'بدون اسم', phone: S(c.phone), address: S(c.address), note: S(c.note), createdAt: n0(c.createdAt) || Date.now() }),
  projects: p => ({
    id: S(p.id) || uid('pr_'), customerId: p.customerId ? S(p.customerId) : null, name: S(p.name) || 'مشروع', address: S(p.address), propType: S(p.propType),
    startDate: S(p.startDate), endDate: S(p.endDate), status: PROJECT_STATUS[p.status] ? p.status : 'new', description: S(p.description), notes: S(p.notes),
    createdAt: n0(p.createdAt) || Date.now()
  }),
  visits: v => ({
    id: S(v.id) || uid('v_'), number: S(v.number), customerId: v.customerId ? S(v.customerId) : null, projectId: v.projectId ? S(v.projectId) : null,
    contractId: v.contractId ? S(v.contractId) : null, docId: v.docId ? S(v.docId) : null, date: S(v.date) || todayISO(),
    techIds: Array.isArray(v.techIds) ? v.techIds.map(S) : [], techName: S(v.techName), visitType: S(v.visitType),
    problemType: S(v.problemType), problem: S(v.problem), location: S(v.location), repairType: S(v.repairType), workDone: S(v.workDone), recommendations: S(v.recommendations), notes: S(v.notes),
    parts: arr(v.parts).map(p => ({ id: S(p.id) || uid('vp'), invId: p.invId ? S(p.invId) : null, name: S(p.name), qty: pos(p.qty), unit: S(p.unit) || 'قطعة', price: pos(p.price), cost: pos(p.cost), kind: p.kind === 'material' ? 'material' : 'part' })),
    photos: arr(v.photos).map(p => ({ id: S(p.id), stage: p.stage === 'after' ? 'after' : 'before' })),
    // رسوم الزيارة منفصلة عن مصنعية الإصلاح وعن قطع الغيار
    visitFee: pos(v.visitFee), laborValue: pos(v.laborValue), status: VISIT_STATUS[v.status] ? v.status : 'done',
    warrantyMonths: pos(v.warrantyMonths), warrantyTerms: S(v.warrantyTerms), nextDate: S(v.nextDate), nextNote: S(v.nextNote), nextDone: !!v.nextDone,
    stockApplied: v.stockApplied && typeof v.stockApplied === 'object' ? v.stockApplied : {},
    createdAt: n0(v.createdAt) || Date.now()
  }),
  payments: p => ({ id: S(p.id) || uid('p_'), number: S(p.number), docId: p.docId ? S(p.docId) : null, customerId: p.customerId ? S(p.customerId) : null,
    amount: pos(p.amount), date: S(p.date) || todayISO(), method: S(p.method) || 'كاش', kind: PAY_KINDS[p.kind] ? p.kind : 'payment', note: S(p.note), createdAt: n0(p.createdAt) || Date.now() }),
  inventory: it => ({
    id: S(it.id) || uid('it_'), name: S(it.name) || 'صنف', cat: INV_CATS.includes(it.cat) ? it.cat : 'خامات أخرى', brand: S(it.brand), model: S(it.model), spec: S(it.spec), unit: S(it.unit) || 'قطعة',
    qty: n0(it.qty), minQty: pos(it.minQty), buyPrice: pos(it.buyPrice), sellPrice: pos(it.sellPrice), supplier: S(it.supplier), purchaseDate: S(it.purchaseDate), notes: S(it.notes),
    moves: arr(it.moves).map(m => ({ id: S(m.id) || uid('mv'), date: S(m.date) || todayISO(), qty: n0(m.qty), reason: S(m.reason), ref: S(m.ref) })),
    createdAt: n0(it.createdAt) || Date.now()
  }),
  workers: w => ({
    id: S(w.id) || uid('w_'), name: S(w.name) || 'عامل', phone: S(w.phone), specialty: S(w.specialty), dailyWage: pos(w.dailyWage), hourRate: pos(w.hourRate), active: w.active !== false, note: S(w.note),
    entries: arr(w.entries).filter(e => WORKER_ENTRY[e.type]).map(e => ({ id: S(e.id) || uid('we'), type: e.type, date: S(e.date) || todayISO(), days: pos(e.days), hours: pos(e.hours), rate: pos(e.rate), amount: pos(e.amount),
      docId: e.docId ? S(e.docId) : null, projectId: e.projectId ? S(e.projectId) : null, visitId: e.visitId ? S(e.visitId) : null, task: S(e.task), note: S(e.note), createdAt: n0(e.createdAt) || Date.now() })),
    createdAt: n0(w.createdAt) || Date.now()
  }),
  expenses: e => ({ id: S(e.id) || uid('x_'), date: S(e.date) || todayISO(), cat: S(e.cat) || 'أخرى', amount: pos(e.amount), method: S(e.method) || 'كاش', note: S(e.note),
    docId: e.docId ? S(e.docId) : null, projectId: e.projectId ? S(e.projectId) : null, createdAt: n0(e.createdAt) || Date.now() }),
  pricelists: l => ({ id: S(l.id) || uid('pl_'), name: S(l.name) || 'قائمة أسعار', items: arr(l.items).map(i => ({ id: S(i.id) || uid('pi'), name: S(i.name), cat: S(i.cat), method: METHODS[i.method] ? i.method : 'piece', price: pos(i.price), size: S(i.size) })), createdAt: n0(l.createdAt) || Date.now() }),
  contracts: c => ({
    id: S(c.id) || uid('ct_'), number: S(c.number), customerId: c.customerId ? S(c.customerId) : null, projectId: c.projectId ? S(c.projectId) : null,
    clientName: S(c.clientName), clientPhone: S(c.clientPhone), clientAddress: S(c.clientAddress),
    period: CONTRACT_PERIODS[c.period] ? c.period : 'annual', start: S(c.start) || todayISO(), end: S(c.end), visitsIncluded: pos(c.visitsIncluded),
    sites: S(c.sites), services: Array.isArray(c.services) ? c.services.map(S) : [],
    extraServices: S(c.extraServices), value: pos(c.value), extraPricing: S(c.extraPricing), notes: S(c.notes), docIds: Array.isArray(c.docIds) ? c.docIds.map(S) : [],
    createdAt: n0(c.createdAt) || Date.now()
  }),
  notes: n => ({ id: S(n.id) || uid('n_'), cat: NOTE_CATS.includes(n.cat) ? n.cat : 'الملاحظات اليومية', title: S(n.title), body: S(n.body), pinned: !!n.pinned,
    customerId: n.customerId ? S(n.customerId) : null, projectId: n.projectId ? S(n.projectId) : null, date: S(n.date), done: !!n.done,
    createdAt: n0(n.createdAt) || Date.now(), updatedAt: n0(n.updatedAt) || Date.now() }),
  matlists: l => ({
    id: S(l.id) || uid('L'), title: S(l.title), customerId: l.customerId ? S(l.customerId) : null, projectId: l.projectId ? S(l.projectId) : null,
    clientName: S(l.clientName), clientPhone: S(l.clientPhone), clientAddress: S(l.clientAddress),
    date: S(l.date) || todayISO(), buyer: l.buyer === 'me' || l.buyer === 'customer' ? l.buyer : null, createdAt: n0(l.createdAt) || Date.now(),
    items: arr(l.items).filter(it => it.name).map(it => ({ id: S(it.id) || uid('i'), name: S(it.name), qty: pos(it.qty), unit: S(it.unit) || 'قطعة', brand: S(it.brand), spec: S(it.spec), note: S(it.note), price: pos(it.price) }))
  })
};
function normalizeLine(l) {
  const method = METHODS[l.method] ? l.method : 'piece';
  const len = pos(l.len), wid = pos(l.wid), dep = pos(l.dep);
  let qty = method === 'lump' ? 1 : pos(l.qty);
  // الحفر: الطول × العرض × العمق = الحجم بالمتر المكعب
  if (method === 'cubic' && len && wid && dep) qty = round3(len * wid * dep);
  if (method === 'stage' && !qty) qty = 1;
  return {
    id: S(l.id) || uid('l'), cat: S(l.cat), kind: LINE_KINDS[l.kind] ? l.kind : 'service', name: S(l.name) || 'بند', method,
    qty, mult: pos(l.mult) || 1, unit: S(l.unit) || METHODS[method].unit,
    // price: سعر البيع / المصنعية — cost: سعر الشراء — install: مصنعية تركيب الوحدة (لبنود التوريد)
    price: pos(l.price), cost: pos(l.cost), install: pos(l.install), source: l.source === 'client' ? 'client' : 'tech', invId: l.invId ? S(l.invId) : null,
    space: S(l.space).trim(), conn: POINT_CONN[l.conn] ? l.conn : '', incMat: !!l.incMat, incLabor: l.incLabor !== false,
    pipeType: S(l.pipeType), size: S(l.size), pressure: S(l.pressure), waste: pos(l.waste), len, wid, dep,
    note: S(l.note), done: !!l.done, visitType: S(l.visitType)
  };
}
function normalizeCol(col, list) { return arr(list).map(x => { try { return NORMALIZERS[col](x); } catch (e) { return null; } }).filter(Boolean); }
// الإعدادات القابلة للتعديل (تعريف النقطة، أنواع النقاط، مراحل العمل) بعد التحميل أو الاستعادة
function normalizeSettings() {
  if (!settings.seq || typeof settings.seq !== 'object') settings.seq = {};
  if (!settings.rates || typeof settings.rates !== 'object') settings.rates = {};
  if (!POINT_DEFS[settings.pointDef]) settings.pointDef = 'combined';
  if (Array.isArray(settings.pointTypes)) settings.pointTypes = settings.pointTypes.map(normPointType).filter(Boolean);
  else settings.pointTypes = null;
  if (Array.isArray(settings.stages)) settings.stages = settings.stages.map(s => String(s || '').trim()).filter(Boolean);
  else settings.stages = null;
}
