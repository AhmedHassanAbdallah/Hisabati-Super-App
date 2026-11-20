/* =========================================================
   أرزقي HVAC - catalog.js
   تصنيفات أعمال التكييف والتبريد، طرق المحاسبة، أنواع الأجهزة
   والفريون والمستندات، وتنظيف البيانات المحفوظة والمستوردة.
   © 2026 أحمد حسن عبدالله - جميع الحقوق محفوظة.
   ========================================================= */

/* ---------- أنواع المستندات ---------- */
const DOC_TYPES = {
  install: { label: 'فاتورة تركيب تكييف', short: 'تركيب', prefix: 'INS', billable: true, icon: 'ac', tag: 'فاتورة تركيب' },
  maint: { label: 'فاتورة صيانة', short: 'صيانة', prefix: 'MNT', billable: true, icon: 'fan', tag: 'فاتورة صيانة' },
  repair: { label: 'فاتورة إصلاح', short: 'إصلاح', prefix: 'REP', billable: true, icon: 'wrench', tag: 'فاتورة إصلاح' },
  parts: { label: 'فاتورة قطع غيار', short: 'قطع غيار', prefix: 'PRT', billable: true, icon: 'box', tag: 'فاتورة قطع غيار' },
  final: { label: 'فاتورة ختامية', short: 'ختامية', prefix: 'FIN', billable: true, icon: 'file', tag: 'فاتورة ختامية' },
  estimate: { label: 'مقايسة تركيب', short: 'مقايسة', prefix: 'EST', billable: false, icon: 'list', tag: 'مقايسة' },
  quote: { label: 'عرض سعر', short: 'عرض سعر', prefix: 'QUO', billable: false, icon: 'tag', tag: 'عرض سعر' }
};
const DOC_TYPE_ORDER = ['install', 'maint', 'repair', 'parts', 'final', 'estimate', 'quote'];
function docTypeInfo(t) { return DOC_TYPES[t] || DOC_TYPES.install; }

/* ---------- طرق المحاسبة لكل بند ---------- */
// mult: مضاعف إضافي (عدد الخطوط للنحاس / عدد الفنيين لليومية)
const METHODS = {
  device: { label: 'بالجهاز', unit: 'جهاز', qty: 'عدد الأجهزة', price: 'السعر لكل جهاز' },
  visit: { label: 'بالزيارة', unit: 'زيارة', qty: 'عدد الزيارات', price: 'سعر الزيارة' },
  job: { label: 'بالعملية', unit: 'عملية', qty: 'العدد', price: 'سعر العملية' },
  unit: { label: 'بالوحدة', unit: 'وحدة', qty: 'عدد الوحدات', price: 'سعر الوحدة' },
  meter: { label: 'بالمتر الطولي', unit: 'م.ط', qty: 'الطول (متر)', price: 'سعر المتر', mult: 'عدد الخطوط' },
  piece: { label: 'بالقطعة', unit: 'قطعة', qty: 'العدد', price: 'سعر القطعة' },
  weight: { label: 'بالوزن', unit: 'كجم', qty: 'الكمية', price: 'السعر' },
  daily: { label: 'باليومية', unit: 'يوم', qty: 'عدد الأيام', price: 'اليومية', mult: 'عدد الفنيين' },
  hour: { label: 'بالساعة', unit: 'ساعة', qty: 'عدد الساعات', price: 'سعر الساعة' },
  lump: { label: 'مقاولة (مبلغ إجمالي)', unit: 'مقطوعية', qty: null, price: 'القيمة الإجمالية' },
  stage: { label: 'مرحلة تنفيذ', unit: 'مرحلة', qty: null, price: 'قيمة المرحلة' }
};
const METHOD_ORDER = ['device', 'visit', 'job', 'unit', 'meter', 'piece', 'weight', 'daily', 'hour', 'lump', 'stage'];

/* ---------- نوع البند (للفصل في الحساب والفاتورة) ---------- */
const LINE_KINDS = {
  service: 'الخدمات والمصنعية',
  diag: 'الكشف والتشخيص',
  part: 'قطع الغيار',
  material: 'الخامات',
  refrigerant: 'الفريون',
  equipment: 'الأجهزة (توريد)',
  labor: 'أجور الفنيين',
  transport: 'النقل والانتقالات',
  other: 'أخرى'
};
const KIND_ORDER = ['service', 'diag', 'equipment', 'part', 'material', 'refrigerant', 'labor', 'transport', 'other'];
// أنواع لها مصدر توريد (من الفني أو من العميل) وتكلفة شراء
const SUPPLY_KINDS = ['part', 'material', 'refrigerant', 'equipment'];

/* ---------- تصنيفات الأعمال (A - G وغيرها) ---------- */
// كل عنصر: [الاسم، طريقة الحساب الافتراضية، نوع البند]
const WORK_CATS = {
  install: { name: 'تركيب التكييف', icon: 'ac', items: [
    ['تركيب تكييف سبليت', 'device', 'service'], ['تركيب تكييف شباك', 'device', 'service'], ['تركيب تكييف مخفي (كونسيلد)', 'device', 'service'],
    ['تركيب تكييف كاسيت', 'device', 'service'], ['تركيب تكييف دكت', 'device', 'service'], ['تركيب نظام VRF / VRV', 'unit', 'service'],
    ['تركيب وحدة مركزية', 'unit', 'service'], ['تركيب وحدة باكدج', 'unit', 'service'], ['تركيب وحدة تبريد أخرى', 'unit', 'service'],
    ['توريد جهاز تكييف', 'device', 'equipment'],
    ['تمديد مواسير النحاس', 'meter', 'service'], ['تمديد صرف المياه', 'meter', 'service'], ['تمديد الكابلات', 'meter', 'service'],
    ['تركيب الحوامل', 'piece', 'service'], ['تركيب الوحدة الداخلية', 'device', 'service'], ['تركيب الوحدة الخارجية', 'device', 'service'],
    ['اختبار التشغيل', 'job', 'service'], ['التفريغ باستخدام Vacuum Pump', 'device', 'service'], ['التسليم والتشغيل', 'job', 'service']
  ] },
  maint: { name: 'الصيانة والتنظيف', icon: 'fan', items: [
    ['تنظيف الوحدة الداخلية', 'device', 'service'], ['تنظيف الوحدة الخارجية', 'device', 'service'], ['غسيل الوحدة بالكامل', 'device', 'service'],
    ['تنظيف الفلاتر', 'device', 'service'], ['تنظيف المبخر', 'device', 'service'], ['تنظيف المكثف', 'device', 'service'],
    ['تنظيف صرف المياه', 'device', 'service'], ['تسليك خرطوم الصرف', 'job', 'service'], ['تنظيف التوربين', 'device', 'service'],
    ['صيانة المراوح', 'device', 'service'], ['صيانة دورية', 'device', 'service'], ['فحص أداء التكييف', 'device', 'service'],
    ['صيانة وقائية', 'device', 'service'], ['صيانة شاملة', 'device', 'service']
  ] },
  visit: { name: 'الزيارات', icon: 'calendar', items: [
    ['زيارة كشف فقط', 'visit', 'diag'], ['زيارة كشف وإصلاح', 'visit', 'service'], ['زيارة متابعة', 'visit', 'service'], ['زيارة طوارئ', 'visit', 'service']
  ] },
  repair: { name: 'الإصلاح والأعطال', icon: 'wrench', items: [
    ['كشف وتشخيص الأعطال', 'visit', 'diag'], ['إصلاح تسريب الفريون', 'job', 'service'], ['إصلاح الدائرة الكهربائية', 'job', 'service'],
    ['إصلاح لوحة التحكم', 'job', 'service'], ['تغيير الكابستور', 'job', 'service'], ['تغيير الكونتاكتور', 'job', 'service'],
    ['تغيير الحساسات', 'job', 'service'], ['تغيير المراوح', 'job', 'service'], ['إصلاح الضاغط', 'job', 'service'],
    ['تغيير الضاغط', 'job', 'service'], ['إصلاح دائرة الصرف', 'job', 'service'], ['إصلاح الوحدة الداخلية', 'job', 'service'],
    ['إصلاح الوحدة الخارجية', 'job', 'service'], ['إصلاح أعطال التبريد', 'job', 'service']
  ] },
  refrig: { name: 'خدمات الفريون', icon: 'droplet', items: [
    ['شحن فريون', 'weight', 'refrigerant'], ['استكمال شحنة فريون', 'weight', 'refrigerant'], ['إعادة الشحن بعد الإصلاح', 'weight', 'refrigerant'],
    ['مصنعية شحن الفريون', 'job', 'service'], ['تفريغ دائرة التبريد', 'job', 'service'], ['استرجاع الفريون', 'job', 'service'],
    ['كشف تسريب', 'job', 'diag'], ['إصلاح تسريب', 'job', 'service'], ['اختبار ضغط الدائرة', 'job', 'service'],
    ['اختبار إحكام الدائرة', 'job', 'service'], ['تغيير نوع الفريون (حسب توافق الجهاز)', 'job', 'service']
  ] },
  copper: { name: 'النحاس والعزل', icon: 'pipe', items: [
    ['ماسورة نحاس', 'meter', 'material'], ['ماسورة خط السحب', 'meter', 'material'], ['ماسورة خط السائل', 'meter', 'material'],
    ['عزل حراري', 'meter', 'material'], ['شريط عزل', 'piece', 'material'], ['كابل كهرباء', 'meter', 'material'],
    ['خرطوم صرف', 'meter', 'material'], ['ماسورة صرف', 'meter', 'material'], ['لحام', 'job', 'service'],
    ['وصلات', 'piece', 'material'], ['أكواع', 'piece', 'material'], ['حوامل', 'piece', 'material']
  ] },
  fridge: { name: 'معدات التبريد', icon: 'snow', items: [
    ['إصلاح ثلاجة منزلية', 'job', 'service'], ['إصلاح فريزر', 'job', 'service'], ['إصلاح ديب فريزر', 'job', 'service'],
    ['صيانة ثلاجة تجارية', 'job', 'service'], ['صيانة ثلاجة عرض', 'job', 'service'], ['صيانة ثلاجات سوبر ماركت', 'job', 'service'],
    ['صيانة غرفة تبريد', 'job', 'service'], ['صيانة غرفة تجميد', 'job', 'service'], ['صيانة وحدة تبريد تجارية', 'job', 'service'],
    ['صيانة وحدة تكثيف', 'job', 'service'], ['صيانة وحدة تبخير', 'job', 'service'], ['إصلاح معدة تبريد أخرى', 'job', 'service']
  ] },
  relocate: { name: 'الفك والنقل', icon: 'truck', items: [
    ['فك التكييف', 'device', 'service'], ['نقل التكييف', 'device', 'transport'], ['إعادة التركيب', 'device', 'service'],
    ['تغيير مكان الوحدة الداخلية', 'job', 'service'], ['تغيير مكان الوحدة الخارجية', 'job', 'service'], ['تمديد مواسير إضافية', 'meter', 'service'],
    ['فك الحوامل', 'piece', 'service'], ['تركيب حوامل جديدة', 'piece', 'service'], ['أعمال النقل والرفع', 'lump', 'transport']
  ] },
  parts: { name: 'قطع الغيار', icon: 'box', items: [
    ['كابستور', 'piece', 'part'], ['كونتاكتور', 'piece', 'part'], ['حساس', 'piece', 'part'], ['موتور مروحة', 'piece', 'part'],
    ['ريموت', 'piece', 'part'], ['لوحة إلكترونية', 'piece', 'part'], ['فلتر', 'piece', 'part'], ['ضاغط', 'piece', 'part'],
    ['ترموستات', 'piece', 'part'], ['ريلاي', 'piece', 'part'], ['قطعة غيار أخرى', 'piece', 'part']
  ] },
  labor: { name: 'الأجور والنقل', icon: 'hard', items: [
    ['يومية فني', 'daily', 'labor'], ['يومية مساعد', 'daily', 'labor'], ['ساعات عمل إضافية', 'hour', 'labor'],
    ['نقل وانتقالات', 'lump', 'transport'], ['مصاريف انتقال طوارئ', 'visit', 'transport']
  ] }
};
const WORK_CAT_ORDER = ['install', 'maint', 'visit', 'repair', 'refrig', 'copper', 'fridge', 'relocate', 'parts', 'labor'];
// التصنيف المقترح أول ما تفتح البنود حسب نوع الفاتورة
const DOC_DEFAULT_CAT = { install: 'install', maint: 'maint', repair: 'repair', parts: 'parts', final: 'install', estimate: 'install', quote: 'install' };

const INSTALL_STAGES = ['المعاينة', 'تمديد النحاس', 'تمديد الصرف', 'تمديد الكابلات', 'تركيب الوحدة', 'التفريغ', 'الاختبار', 'التشغيل'];

/* ---------- الأجهزة ---------- */
const DEVICE_TYPES = {
  'تكييف': ['تكييف سبليت', 'تكييف شباك', 'تكييف مخفي (كونسيلد)', 'تكييف كاسيت', 'تكييف دكت', 'تكييف دولابي', 'نظام VRF / VRV', 'وحدة مركزية', 'وحدة باكدج', 'تكييف آخر'],
  'تبريد': ['ثلاجة منزلية', 'فريزر', 'ديب فريزر', 'ثلاجة تجارية', 'ثلاجة عرض', 'ثلاجة سوبر ماركت', 'غرفة تبريد', 'غرفة تجميد', 'وحدة تبريد تجارية', 'وحدة تكثيف', 'وحدة تبخير', 'معدة تبريد أخرى']
};
function deviceCategoryOf(type) { return DEVICE_TYPES['تبريد'].includes(type) ? 'تبريد' : 'تكييف'; }
const CAP_UNITS = ['BTU/h', 'حصان', 'طن تبريد (TR)', 'kW'];
const REFRIGERANTS = ['R22', 'R410A', 'R32', 'R134a', 'R404A', 'R407C', 'R600a', 'R290', 'R507A', 'R417A', 'R422D', 'R1234yf', 'أخرى'];
const BRANDS = ['شارب', 'كاريير', 'يونيون إير', 'فريش', 'إل جي', 'سامسونج', 'جري', 'ميديا', 'تورنيدو', 'دايكن', 'ميتسوبيشي', 'توشيبا', 'هاير', 'كريازي'];

/* ---------- الزيارات والتقارير ---------- */
const VISIT_STATUS = {
  progress: { label: 'قيد التنفيذ', color: 'var(--primary)' },
  done: { label: 'تم الإصلاح', color: 'var(--success)' },
  parts: { label: 'بانتظار قطع غيار', color: 'var(--orange-600)' },
  followup: { label: 'تحت المتابعة', color: 'var(--primary)' },
  notfixed: { label: 'لم يتم الإصلاح', color: 'var(--danger)' }
};
const SERVICE_TYPES = ['صيانة دورية', 'تنظيف وغسيل', 'كشف وتشخيص', 'إصلاح عطل', 'شحن فريون', 'تركيب', 'فك ونقل', 'صيانة وقائية', 'زيارة متابعة', 'زيارة طوارئ', 'زيارة ضمن عقد'];
const READING_PRESETS = ['ضغط السحب (psi)', 'ضغط الطرد (psi)', 'أمبير الضاغط (A)', 'الجهد (V)', 'حرارة هواء الخروج (°C)', 'حرارة الغرفة (°C)', 'حرارة الهواء الخارجي (°C)', 'حرارة خط السحب (°C)', 'Superheat (K)', 'Subcooling (K)'];

/* ---------- الخامات وقطع الغيار ---------- */
const INV_CATS = ['مواسير النحاس', 'العزل الحراري', 'كابلات الكهرباء', 'خراطيم الصرف', 'الفريون', 'الوصلات', 'الأكواع', 'الحوامل', 'الكابستور', 'الكونتاكتور',
  'الحساسات', 'المراوح', 'الموتورات', 'الفلاتر', 'لوحات التحكم', 'الضواغط', 'قطع غيار الثلاجات', 'أدوات التركيب', 'مستلزمات الصيانة', 'خامات أخرى'];
const INV_UNITS = ['قطعة', 'متر', 'لفة', 'كجم', 'جرام', 'أسطوانة', 'علبة', 'كرتونة', 'طقم'];
// نوع البند في الفاتورة حسب تصنيف المخزن
function invCatKind(cat) {
  if (cat === 'الفريون') return 'refrigerant';
  if (['مواسير النحاس', 'العزل الحراري', 'كابلات الكهرباء', 'خراطيم الصرف', 'الوصلات', 'الأكواع', 'الحوامل', 'مستلزمات الصيانة', 'خامات أخرى'].includes(cat)) return 'material';
  return 'part';
}
const PIPE_SIZES = ['1/4"', '3/8"', '1/2"', '5/8"', '3/4"', '7/8"', '1 1/8"'];

/* ---------- الحسابات ---------- */
const PAY_METHODS = ['كاش', 'تحويل بنكي', 'محفظة إلكترونية', 'إنستاباي', 'شيك', 'أخرى'];
const PAY_KINDS = { deposit: 'عربون', payment: 'دفعة', final: 'دفعة أخيرة' };
const EXPENSE_CATS = ['خامات', 'قطع غيار', 'فريون', 'نقل ومواصلات', 'أجور فنيين', 'أدوات ومعدات', 'وقود', 'إيجار ومصاريف ثابتة', 'اتصالات', 'أخرى'];
const WORKER_ENTRY = {
  day: { label: 'يومية / حضور', icon: 'calendar' },
  overtime: { label: 'إضافي', icon: 'clock' },
  advance: { label: 'سلفة', icon: 'cash' },
  deduction: { label: 'خصم', icon: 'minus' },
  payout: { label: 'صرف مستحقات', icon: 'wallet' }
};
const SPECIALTIES = ['فني تكييف', 'فني تبريد', 'مساعد فني', 'فني لحام نحاس', 'كهربائي', 'سائق / نقل'];

/* ---------- العقود والنوتة ---------- */
const CONTRACT_PERIODS = { monthly: { label: 'شهري', months: 1 }, quarterly: { label: 'ربع سنوي', months: 3 }, semi: { label: 'نصف سنوي', months: 6 }, annual: { label: 'سنوي', months: 12 } };
const CONTRACT_SERVICES = ['تنظيف الفلاتر', 'غسيل الوحدات', 'فحص الأداء', 'فحص ضغط الفريون', 'تنظيف صرف المياه', 'فحص الدائرة الكهربائية', 'صيانة المراوح', 'زيارات الطوارئ'];
const NOTE_CATS = ['أكواد الأعطال', 'موديلات الأجهزة', 'أنواع الفريون', 'بيانات الصيانة', 'ملاحظات الفني', 'تعليمات العميل', 'مواعيد الصيانة', 'قطع الغيار المطلوبة', 'ملاحظات التشخيص', 'بيانات الموردين'];

/* ---------- قوائم الأسعار (أسماء فقط، الأسعار يحددها المستخدم) ---------- */
const PRICE_PRESETS = [
  ['تركيب جهاز تكييف سبليت', 'install', 'device'], ['تركيب جهاز تكييف شباك', 'install', 'device'], ['صيانة جهاز', 'maint', 'device'],
  ['غسيل الوحدة بالكامل', 'maint', 'device'], ['زيارة كشف فقط', 'visit', 'visit'], ['شحن فريون (للكيلو)', 'refrig', 'weight'],
  ['ماسورة نحاس (للمتر)', 'copper', 'meter'], ['عزل حراري (للمتر)', 'copper', 'meter'], ['كابل كهرباء (للمتر)', 'copper', 'meter'],
  ['تركيب حوامل', 'install', 'piece'], ['فك وتركيب جهاز', 'relocate', 'device'], ['يومية فني', 'labor', 'daily'], ['زيارة طوارئ', 'visit', 'visit']
];

/* =========================================================
   تنظيف البيانات (عند التحميل والاستيراد)
   ========================================================= */
const S = v => String(v == null ? '' : v);
const arr = v => (Array.isArray(v) ? v.filter(x => x && typeof x === 'object') : []);
const NORMALIZERS = {
  docs: d => ({
    id: S(d.id) || uid('d_'), number: S(d.number), docType: DOC_TYPES[d.docType] ? d.docType : 'install',
    clientName: S(d.clientName), clientPhone: S(d.clientPhone), clientAddress: S(d.clientAddress),
    customerId: d.customerId ? S(d.customerId) : null, deviceIds: Array.isArray(d.deviceIds) ? d.deviceIds.map(S) : [], deviceText: S(d.deviceText),
    date: S(d.date) || todayISO(), validUntil: S(d.validUntil), notes: S(d.notes),
    warrantyMonths: pos(d.warrantyMonths), warrantyTerms: S(d.warrantyTerms),
    addAmount: pos(d.addAmount), addNote: S(d.addNote), discountAmount: pos(d.discountAmount),
    workerIds: Array.isArray(d.workerIds) ? d.workerIds.map(S) : [], visitId: d.visitId ? S(d.visitId) : null,
    convertedFrom: S(d.convertedFrom), stockApplied: d.stockApplied && typeof d.stockApplied === 'object' ? d.stockApplied : {},
    createdAt: n0(d.createdAt) || Date.now(), updatedAt: n0(d.updatedAt) || Date.now(),
    lines: arr(d.lines).map(normalizeLine)
  }),
  customers: c => ({ id: S(c.id) || uid('c_'), name: S(c.name) || 'بدون اسم', phone: S(c.phone), address: S(c.address), note: S(c.note), createdAt: n0(c.createdAt) || Date.now() }),
  devices: d => ({
    id: S(d.id) || uid('dv_'), customerId: d.customerId ? S(d.customerId) : null, type: S(d.type) || 'تكييف سبليت', brand: S(d.brand), model: S(d.model), serial: S(d.serial),
    capacity: S(d.capacity), capUnit: CAP_UNITS.includes(d.capUnit) ? d.capUnit : 'BTU/h', refrigerant: S(d.refrigerant), purchaseDate: S(d.purchaseDate), installDate: S(d.installDate),
    location: S(d.location), notes: S(d.notes), maintEveryMonths: pos(d.maintEveryMonths), createdAt: n0(d.createdAt) || Date.now()
  }),
  visits: v => ({
    id: S(v.id) || uid('v_'), number: S(v.number), customerId: v.customerId ? S(v.customerId) : null, deviceId: v.deviceId ? S(v.deviceId) : null,
    contractId: v.contractId ? S(v.contractId) : null, docId: v.docId ? S(v.docId) : null, date: S(v.date) || todayISO(),
    techIds: Array.isArray(v.techIds) ? v.techIds.map(S) : [], techName: S(v.techName), serviceType: S(v.serviceType),
    problem: S(v.problem), fault: S(v.fault), cause: S(v.cause), workDone: S(v.workDone), recommendations: S(v.recommendations),
    parts: arr(v.parts).map(p => ({ id: S(p.id) || uid('vp'), invId: p.invId ? S(p.invId) : null, name: S(p.name), qty: pos(p.qty), unit: S(p.unit) || 'قطعة', price: pos(p.price), cost: pos(p.cost), kind: p.kind === 'material' ? 'material' : 'part' })),
    refType: S(v.refType), refQty: pos(v.refQty), refUnit: v.refUnit === 'جم' ? 'جم' : 'كجم', refPrice: pos(v.refPrice), refCost: pos(v.refCost),
    readings: arr(v.readings).map(r => ({ label: S(r.label), value: S(r.value) })),
    photos: arr(v.photos).map(p => ({ id: S(p.id), stage: p.stage === 'after' ? 'after' : 'before' })),
    serviceValue: pos(v.serviceValue), status: VISIT_STATUS[v.status] ? v.status : 'done',
    warrantyMonths: pos(v.warrantyMonths), warrantyTerms: S(v.warrantyTerms), nextDate: S(v.nextDate), nextNote: S(v.nextNote), nextDone: !!v.nextDone,
    stockApplied: v.stockApplied && typeof v.stockApplied === 'object' ? v.stockApplied : {},
    createdAt: n0(v.createdAt) || Date.now()
  }),
  payments: p => ({ id: S(p.id) || uid('p_'), number: S(p.number), docId: p.docId ? S(p.docId) : null, customerId: p.customerId ? S(p.customerId) : null,
    amount: pos(p.amount), date: S(p.date) || todayISO(), method: S(p.method) || 'كاش', kind: PAY_KINDS[p.kind] ? p.kind : 'payment', note: S(p.note), createdAt: n0(p.createdAt) || Date.now() }),
  inventory: it => ({
    id: S(it.id) || uid('it_'), name: S(it.name) || 'صنف', cat: INV_CATS.includes(it.cat) ? it.cat : 'خامات أخرى', brand: S(it.brand), spec: S(it.spec), unit: S(it.unit) || 'قطعة',
    qty: n0(it.qty), minQty: pos(it.minQty), buyPrice: pos(it.buyPrice), sellPrice: pos(it.sellPrice), supplier: S(it.supplier), purchaseDate: S(it.purchaseDate), notes: S(it.notes),
    moves: arr(it.moves).map(m => ({ id: S(m.id) || uid('mv'), date: S(m.date) || todayISO(), qty: n0(m.qty), reason: S(m.reason), ref: S(m.ref) })),
    createdAt: n0(it.createdAt) || Date.now()
  }),
  workers: w => ({
    id: S(w.id) || uid('w_'), name: S(w.name) || 'فني', phone: S(w.phone), specialty: S(w.specialty), dailyWage: pos(w.dailyWage), hourRate: pos(w.hourRate), active: w.active !== false, note: S(w.note),
    entries: arr(w.entries).filter(e => WORKER_ENTRY[e.type]).map(e => ({ id: S(e.id) || uid('we'), type: e.type, date: S(e.date) || todayISO(), days: pos(e.days), hours: pos(e.hours), rate: pos(e.rate), amount: pos(e.amount), docId: e.docId ? S(e.docId) : null, visitId: e.visitId ? S(e.visitId) : null, note: S(e.note), createdAt: n0(e.createdAt) || Date.now() })),
    createdAt: n0(w.createdAt) || Date.now()
  }),
  expenses: e => ({ id: S(e.id) || uid('x_'), date: S(e.date) || todayISO(), cat: S(e.cat) || 'أخرى', amount: pos(e.amount), method: S(e.method) || 'كاش', note: S(e.note), docId: e.docId ? S(e.docId) : null, createdAt: n0(e.createdAt) || Date.now() }),
  pricelists: l => ({ id: S(l.id) || uid('pl_'), name: S(l.name) || 'قائمة أسعار', items: arr(l.items).map(i => ({ id: S(i.id) || uid('pi'), name: S(i.name), cat: S(i.cat), method: METHODS[i.method] ? i.method : 'unit', price: pos(i.price) })), createdAt: n0(l.createdAt) || Date.now() }),
  contracts: c => ({
    id: S(c.id) || uid('ct_'), number: S(c.number), customerId: c.customerId ? S(c.customerId) : null, clientName: S(c.clientName), clientPhone: S(c.clientPhone), clientAddress: S(c.clientAddress),
    period: CONTRACT_PERIODS[c.period] ? c.period : 'annual', start: S(c.start) || todayISO(), end: S(c.end), visitsIncluded: pos(c.visitsIncluded),
    deviceIds: Array.isArray(c.deviceIds) ? c.deviceIds.map(S) : [], devicesCount: pos(c.devicesCount), services: Array.isArray(c.services) ? c.services.map(S) : [],
    extraServices: S(c.extraServices), value: pos(c.value), extraPricing: S(c.extraPricing), notes: S(c.notes), docIds: Array.isArray(c.docIds) ? c.docIds.map(S) : [],
    createdAt: n0(c.createdAt) || Date.now()
  }),
  notes: n => ({ id: S(n.id) || uid('n_'), cat: NOTE_CATS.includes(n.cat) ? n.cat : 'ملاحظات الفني', title: S(n.title), body: S(n.body), pinned: !!n.pinned, createdAt: n0(n.createdAt) || Date.now(), updatedAt: n0(n.updatedAt) || Date.now() }),
  matlists: l => ({
    id: S(l.id) || uid('L'), title: S(l.title), customerId: l.customerId ? S(l.customerId) : null, clientName: S(l.clientName), clientPhone: S(l.clientPhone), clientAddress: S(l.clientAddress),
    date: S(l.date) || todayISO(), buyer: l.buyer === 'me' || l.buyer === 'customer' ? l.buyer : null, createdAt: n0(l.createdAt) || Date.now(),
    items: arr(l.items).filter(it => it.name).map(it => ({ id: S(it.id) || uid('i'), name: S(it.name), qty: pos(it.qty), unit: S(it.unit) || 'قطعة', brand: S(it.brand), spec: S(it.spec), note: S(it.note), price: pos(it.price) }))
  })
};
function normalizeLine(l) {
  const method = METHODS[l.method] ? l.method : 'unit';
  return {
    id: S(l.id) || uid('l'), cat: S(l.cat), kind: LINE_KINDS[l.kind] ? l.kind : 'service', name: S(l.name) || 'بند', method,
    qty: method === 'lump' || method === 'stage' ? 1 : pos(l.qty), mult: pos(l.mult) || 1, unit: S(l.unit) || METHODS[method].unit,
    wUnit: l.wUnit === 'جم' ? 'جم' : 'كجم', pUnit: l.pUnit === 'جم' ? 'جم' : 'كجم',
    price: pos(l.price), cost: pos(l.cost), source: l.source === 'client' ? 'client' : 'tech', invId: l.invId ? S(l.invId) : null,
    refType: S(l.refType), size: S(l.size), note: S(l.note), done: !!l.done, visitType: S(l.visitType)
  };
}
function normalizeCol(col, list) { return arr(list).map(x => { try { return NORMALIZERS[col](x); } catch (e) { return null; } }).filter(Boolean); }
