/*
 * أرزقي | Arzoqi — الرخام والجرانيت والأحجار: أنواع الشغل والحاسبات وخاناتها، والمكتبة المبدئية (أسماء أمثلة من غير أسعار ولا مقاسات).
 * المستخدم بيضيف خامات ومقاسات وتشطيبات وأنواع حواف وفتحات ووحدات وطرق دفع ومراحل بتاعته من غير أي تعديل في الكود.
 * © 2026 أحمد حسن عبدالله
 */
(function (root) {
  'use strict';
  function n(k, l, u, ph) { return { k: k, l: l, t: 'num', u: u || '', ph: ph || '' }; }
  function tx(k, l, ph) { return { k: k, l: l, t: 'text', ph: ph || '' }; }
  function sg(k, l, o) { return { k: k, l: l, t: 'seg', o: o }; }
  function ch(k, l, o, ph) { return { k: k, l: l, t: 'chips', o: o, ph: ph || '' }; }
  function ck(k, l) { return { k: k, l: l, t: 'check' }; }
  function pk(k, l, o) { return { k: k, l: l, t: 'pick', o: o }; }
  function h(l) { return { t: 'h', l: l }; }
  function note(l) { return { t: 'note', l: l }; }
  function rows(k, l, add, f, def) { return { t: 'rows', k: k, l: l, add: add, f: f, def: def || {} }; }
  function W(f, when) { f.when = when; return f; }
  var MAT = { k: 'mat', l: 'الخامة (من المكتبة)', t: 'lib', cat: 'mat' };
  var EDGE = { k: 'edgeType', l: 'نوع الحافة', t: 'edgeT' };
  var UNIT = sg('unit', 'وحدة المقاسات', [['mm', 'مم'], ['cm', 'سم'], ['m', 'متر']]);
  var BASIS = sg('basis', 'حساب الخامة', [['m2', 'بالمتر المربع'], ['slab', 'بالألواح']]);
  var WASTE = n('waste', 'الهالك', '%', '—');
  var SHAPE_O = [['rect', 'مستطيل'], ['square', 'مربع'], ['tri', 'مثلث'], ['trap', 'شبه منحرف'], ['circle', 'دائرة'], ['semi', 'نص دائرة'], ['corner', 'قطع زاوية'], ['L', 'شكل L'], ['U', 'شكل U'], ['curve', 'منحني / غير منتظم'], ['custom', 'مساحة يدوي']];
  // صف «قطعة»: الأبعاد اللي بتظهر حسب الشكل
  var PIECE = [tx('name', 'القطعة', 'مثلاً: عتبة'), tx('place', 'المكان', 'مدخل'), pk('shape', 'الشكل', SHAPE_O),
    W(n('L', 'الطول / القاعدة'), { shape: ['rect', 'square', 'tri', 'trap', 'corner', 'L', 'U'] }), W(n('W', 'العرض / الارتفاع'), { shape: ['rect', 'tri', 'trap', 'corner', 'L', 'U'] }),
    W(n('A', 'الضلع التاني / عرض الجزء الإضافي'), { shape: ['trap', 'corner', 'L', 'U'] }), W(n('B', 'عمق قطع الزاوية / الجزء الإضافي'), { shape: ['corner', 'L', 'U'] }),
    W(n('D', 'القطر'), { shape: ['circle', 'semi'] }), W(n('manual', 'المساحة', 'م²'), { shape: ['curve', 'custom'] }), W(n('L', 'طول الإطار (للقص)'), { shape: ['curve', 'custom'] }), W(n('W', 'عرض الإطار (للقص)'), { shape: ['curve', 'custom'] }),
    n('T', 'السمك', 'سم', 'من الخامة'), n('count', 'العدد', '', '1'), MAT, n('edge', 'طول الحافة للقطعة', 'م', '—'), EDGE, n('holes', 'فتحات/قصات', '', '—'), { k: 'holeType', l: 'نوع الفتحة', t: 'cutT' },
    { k: 'finish', l: 'التشطيب', t: 'finT' }, pk('grain', 'اتجاه العرق', [['', 'حر (ينفع يتلف)'], ['lock', 'مقفول']]), tx('match', 'مجموعة المطابقة', 'A'), tx('seq', 'رقم في التتابع', '1'), tx('note', 'ملاحظة')];
  var PIECE_DEF = { shape: 'rect', count: '1' };
  function piecesForm(names) { return [UNIT, MAT, rows('parts', 'القطع', 'قطعة', PIECE, PIECE_DEF), WASTE, BASIS, n('usable', 'المستغل من اللوح (لحساب الألواح)', '%', '100'), note('عدد الألواح هنا تقديري بالمساحة — التوزيع الفعلي في «تقسيم الألواح» أو خطة الألواح في المشروع.')].concat(names ? [] : []); }
  function piecesDef(names) { return { unit: 'cm', basis: 'm2', parts: (names || ['']).map(function (x) { return { name: x, shape: 'rect', count: '1' }; }) }; }
  var CUT_O = [['sinkTop', 'حوض فوق السطح'], ['sinkUnder', 'حوض تحت السطح'], ['sinkFlush', 'حوض Flush'], ['hob', 'بوتاجاز'], ['oven', 'فرن'], ['appliance', 'أجهزة'], ['mixer', 'خلاط'], ['socket', 'كهرباء'], ['pipe', 'مواسير'], ['corner', 'زاوية'], ['chamfer', 'شطفة'], ['drain', 'مجرى مياه'], ['groove', 'تجويف'], ['custom', 'قصة خاصة']];
  var CUT_ROW = [pk('type', 'الفتحة', CUT_O), n('count', 'العدد', '', '1'), n('w', 'العرض'), n('h', 'الطول'), ch('method', 'طريقة التنفيذ', ['يدوي', 'CNC', 'Waterjet', 'تلميع حواف الفتحة']), n('price', 'السعر', '', 'من الإعدادات'), tx('note', 'ملاحظة')];
  var KINDS = {
    kitchen: { label: 'حاسبة المطابخ', icon: 'kitchen', grp: 'kitchen', labor: [['m2', 'تصنيع وتركيب (م²)'], ['lm', 'تشكيل الحافة (م.ط)']],
      form: [sg('ktype', 'شكل المطبخ', [['straight', 'مستقيم'], ['L', 'L'], ['U', 'U'], ['island', 'جزيرة'], ['bar', 'بار'], ['multi', 'متعدد / حسب الرسم']]), UNIT, MAT,
        W(Object.assign(rows('segs', 'أجزاء السطح (كل جزء بطوله الصافي بعد الأركان)', 'جزء', [tx('name', 'الجزء'), n('L', 'الطول الصافي'), n('D', 'العمق', '', 'زي العام'), n('count', 'العدد', '', '1'), ck('noEdge', 'من غير حافة أمامية')], { count: '1' }), { min1: true }), { ktype: ['multi'] }),
        W(n('L1', 'الطول الأول (على الحيطة من بره)'), { ktype: ['straight', 'L', 'U', 'island', 'bar', '', undefined] }), W(n('L2', 'الطول التاني'), { ktype: ['L', 'U'] }), W(n('L3', 'الطول التالت'), { ktype: ['U'] }), n('D', 'العمق (عرض السطح)'),
        note('L و U: الأطوال على الحيطة من بره، وكل ركن بيتحسب مرة واحدة (الطول − العمق) — النتيجة بتكتب الطريقة.'), EDGE, n('ends', 'أطراف ظاهرة (حافة جنب)', '', '0'),
        h('جزيرة وبار'), ck('island', 'فيه جزيرة'), W(n('IL', 'طول الجزيرة'), { island: [true] }), W(n('IW', 'عرض الجزيرة'), { island: [true] }), ck('bar', 'فيه بار'), W(n('BL', 'طول البار'), { bar: [true] }), W(n('BW', 'عرض البار'), { bar: [true] }),
        h('الظهر والجوانب والوزرة'), ck('back', 'ظهر رخام (Backsplash)'), W(n('backH', 'ارتفاع الظهر'), { back: [true] }), n('sides', 'جوانب رخام (عدد)', '', '0'), n('sideH', 'ارتفاع الجنب', '', 'زي الظهر'), n('skirtH', 'ارتفاع الوزرة', '', '—'),
        h('الفتحات والقصات'), rows('cuts', 'الفتحات', 'فتحة', CUT_ROW, { type: 'sinkTop', count: '1' }), WASTE, BASIS, n('usable', 'المستغل من اللوح', '%', '100'), ck('grainLock', 'اقفل اتجاه العرق في القص')],
      def: { ktype: 'straight', unit: 'cm', basis: 'm2', cuts: [] } },
    backsplash: { label: 'حاسبة ظهر المطبخ', icon: 'wall', grp: 'kitchen', labor: [['m2', 'تركيب ظهر (م²)']],
      form: [UNIT, MAT, sg('full', 'النوع', [['full', 'كامل'], ['part', 'جزئي']]), n('H', 'الارتفاع'), rows('walls', 'الأجزاء', 'جزء', [tx('name', 'الجزء'), n('len', 'الطول'), n('count', 'العدد', '', '1')], { count: '1' }), n('sockets', 'فتحات كهرباء', '', '0'), n('mixers', 'فتحات خلاط', '', '0'), EDGE, WASTE, BASIS],
      def: { unit: 'cm', full: 'full', basis: 'm2', walls: [] } },
    stairs: { label: 'حاسبة السلالم', icon: 'stairs', grp: 'stairs', labor: [['step', 'تركيب (درجة)'], ['lm', 'وزرات (م.ط)']],
      form: [ch('stype', 'نوع السلم', ['مستقيم', 'L', 'U', 'دائري', 'حلزوني', 'مروحة', 'داخلي', 'خارجي', 'رئيسي', 'خدمة', 'مدخل']), UNIT, MAT,
        sg('mode', 'مقاسات الدرجات', [['same', 'كلها زي بعض'], ['rows', 'كل درجة/مجموعة لوحدها']]),
        W(n('n', 'عدد الدرجات'), { mode: ['same', '', undefined] }), W(n('L', 'طول الدرجة'), { mode: ['same', '', undefined] }), W(n('W', 'عرض النايمة'), { mode: ['same', '', undefined] }), W(n('H', 'ارتفاع القايمة'), { mode: ['same', '', undefined] }),
        W(Object.assign(rows('steps', 'الدرجات', 'مجموعة درجات', [tx('name', 'الاسم', 'مروحة'), n('L', 'الطول'), n('W', 'النايمة'), n('H', 'القايمة'), n('count', 'العدد', '', '1')], { count: '1' }), { min1: true }), { mode: ['rows'] }),
        ck('risers', 'قوايم رخام'), rows('landings', 'البسطات', 'بسطة', [n('L', 'الطول'), n('W', 'العرض'), n('count', 'العدد', '', '1')], { count: '1' }),
        h('الوزرات والحواف'), n('skirtSides', 'وزرات على كام جنب', '', '0'), n('skirtH', 'ارتفاع الوزرة'), n('skirtExtra', 'طول وزرة إضافي (بسطات)', 'م', '—'), EDGE, WASTE, BASIS, ck('grainLock', 'اقفل اتجاه العرق في القص'),
        note('مش بنفترض إن كل الدرجات زي بعض: اختار «كل درجة لوحدها» للمراوح والدرجات المختلفة.')],
      def: { mode: 'same', unit: 'cm', risers: true, basis: 'm2', steps: [], landings: [] } },
    entrance: { label: 'حاسبة المداخل واللوبي', icon: 'door', grp: 'entrance', calc: 'pieces', labor: [['m2', 'تركيب (م²)'], ['lm', 'حواف ووزرات (م.ط)']], form: piecesForm(), def: piecesDef(['أرضية المدخل', 'عتبة', 'وزرة', 'كسوة حائط']) },
    facade: { label: 'حاسبة الواجهات', icon: 'facade', grp: 'facade', labor: [['m2', 'تركيب واجهة (م²)']],
      form: [UNIT, MAT, rows('zones', 'مناطق الواجهة (لكل منطقة خامة)', 'منطقة', [tx('name', 'المنطقة', 'الدور الأرضي'), n('W', 'العرض'), n('H', 'الارتفاع'), n('count', 'التكرار', '', '1'), MAT], { count: '1' }),
        rows('openings', 'الفتحات والأجزاء المكشوفة (بتتخصم)', 'فتحة', [tx('name', 'الفتحة', 'شباك'), n('W', 'العرض'), n('H', 'الارتفاع'), n('count', 'العدد', '', '1')], { count: '1' }),
        rows('extras', 'إضافات (بروزات، أعمدة، عتبات…)', 'إضافة', [tx('name', 'البيان'), n('area', 'المساحة', 'م²')], {}),
        n('pL', 'طول البلاطة المقصوصة'), n('pW', 'عرض البلاطة المقصوصة'), ch('fixing', 'نظام التثبيت (بتختاره انت)', ['كانات ستانلس', 'مسامير وخوابير', 'هيكل معدني', 'لاصق', 'مونة', 'تثبيت مخفي']),
        n('fixPerM2', 'وحدات تثبيت لكل م²', '', '—'), n('fixPrice', 'سعر وحدة التثبيت', '', '—'), n('scaffold', 'السقالات (مبلغ)', '', '—'), n('lift', 'النقل والرفع (مبلغ)', '', '—'), WASTE, BASIS],
      def: { unit: 'm', basis: 'm2', zones: [], openings: [], extras: [] } },
    wall: { label: 'حاسبة الحوائط والتجاليد', icon: 'wall', grp: 'walls', calc: 'facade', labor: [['m2', 'تركيب (م²)']],
      form: [UNIT, MAT, rows('zones', 'الحوائط', 'حائط', [tx('name', 'الحائط'), n('W', 'العرض'), n('H', 'الارتفاع'), n('count', 'العدد', '', '1'), MAT], { count: '1' }), rows('openings', 'فتحات (بتتخصم)', 'فتحة', [tx('name', 'الفتحة'), n('W', 'العرض'), n('H', 'الارتفاع'), n('count', 'العدد', '', '1')], { count: '1' }),
        n('pL', 'طول البلاطة'), n('pW', 'عرض البلاطة'), ch('fixing', 'طريقة التركيب', ['لاصق', 'مونة', 'كانات', 'مسامير']), n('fixPerM2', 'وحدات تثبيت لكل م²', '', '—'), n('fixPrice', 'سعر الوحدة', '', '—'), WASTE, BASIS],
      def: { unit: 'm', basis: 'm2', zones: [], openings: [], noEng: true } },
    floor: { label: 'حاسبة الأرضيات', icon: 'floor', grp: 'floor', labor: [['m2', 'تركيب أرضية (م²)'], ['m2', 'جلي وتلميع (م²)']],
      form: [UNIT, MAT, rows('rooms', 'المساحات', 'مساحة', [tx('name', 'المكان', 'صالة'), n('L', 'الطول'), n('W', 'العرض'), n('count', 'العدد', '', '1')], { count: '1' }), rows('ex', 'مستثنى (فتحات، دواليب…)', 'جزء', [tx('name', 'البيان'), n('L', 'الطول'), n('W', 'العرض'), n('count', 'العدد', '', '1')], { count: '1' }),
        n('tL', 'طول البلاطة'), n('tW', 'عرض البلاطة'), ch('method', 'طريقة التركيب', ['مونة', 'لاصق', 'على البارد']), ck('border', 'بوردر (محيط)'), W({ k: 'borderMat', l: 'خامة البوردر', t: 'lib', cat: 'mat' }, { border: [true] }), WASTE, BASIS],
      def: { unit: 'm', basis: 'm2', rooms: [], ex: [] } },
    bath: { label: 'حاسبة الحمامات والوحدات', icon: 'bath', grp: 'bath', calc: 'pieces', labor: [['m2', 'تركيب (م²)'], ['piece', 'قطعة']], form: piecesForm(), def: piecesDef(['سطح وحدة', 'أرضية', 'حائط', 'رف']) },
    gate: { label: 'حاسبة البوابات', icon: 'gate', grp: 'gate', calc: 'pieces', labor: [['m2', 'تركيب (م²)'], ['lm', 'حواف (م.ط)']], form: piecesForm(), def: piecesDef(['كسوة عمود', 'عتب', 'تاج', 'جنب']) },
    decor: { label: 'حاسبة الديكورات', icon: 'decor', grp: 'decor', calc: 'pieces', labor: [['piece', 'تصنيع (قطعة)'], ['m2', 'تركيب (م²)']], form: piecesForm(), def: piecesDef(['تجليد', 'كورنيشة', 'رف', 'مدفأة']) },
    pieces: { label: 'حاسبة القطع والأشكال', icon: 'shapes', grp: 'gen', labor: [['m2', 'مصنعية (م²)'], ['lm', 'حواف (م.ط)']], form: piecesForm(), def: piecesDef() },
    column: { label: 'حاسبة الأعمدة', icon: 'column', grp: 'walls', labor: [['m2', 'تركيب (م²)']],
      form: [UNIT, MAT, rows('cols', 'الأعمدة', 'عمود', [tx('name', 'العمود'), pk('type', 'الشكل', [['square', 'مربع/مستطيل'], ['round', 'دائري']]), n('W', 'العرض / القطر'), W(n('D', 'العمق'), { type: ['square', '', undefined] }), n('H', 'الارتفاع'), n('count', 'العدد', '', '1')], { type: 'square', count: '1' }), EDGE, WASTE, BASIS],
      def: { unit: 'cm', basis: 'm2', cols: [] } },
    lm: { label: 'حاسبة المتر الطولي', icon: 'ruler', grp: 'gen', labor: [['lm', 'مصنعية (م.ط)']],
      form: [UNIT, rows('rows', 'البنود', 'بند', [ch('name', 'البند', ['وزرة', 'كورنيشة', 'سوكلة', 'عتبة', 'برواز', 'حافة', 'شريط']), tx('profile', 'البروفايل/المقاس'), n('len', 'الطول'), n('count', 'العدد', '', '1'), n('price', 'سعر المتر', '', '—'), MAT], { count: '1' })],
      def: { unit: 'cm', rows: [] } },
    edges: { label: 'حاسبة الحواف', icon: 'edge', grp: 'work', labor: [], form: [UNIT, rows('rows', 'الحواف', 'حافة', [{ k: 'type', l: 'نوع الحافة', t: 'edgeT' }, n('len', 'الطول'), n('count', 'العدد', '', '1'), n('price', 'سعر المتر', '', 'من الإعدادات')], { count: '1' }), note('أسعار الحواف الافتراضية من «المصنعية والإعدادات».')], def: { unit: 'cm', rows: [] } },
    cutouts: { label: 'حاسبة الفتحات والقصات', icon: 'cutout', grp: 'work', labor: [], form: [UNIT, rows('rows', 'الفتحات', 'فتحة', CUT_ROW, { type: 'sinkTop', count: '1' })], def: { unit: 'cm', rows: [] } },
    finish: { label: 'حاسبة التشطيب والتلميع', icon: 'shine', grp: 'work', labor: [], form: [rows('rows', 'التشطيبات', 'تشطيب', [{ k: 'type', l: 'التشطيب', t: 'finT' }, tx('name', 'المكان'), n('area', 'المساحة', 'م²'), n('price', 'سعر المتر', '', 'من الإعدادات')], {})], def: { rows: [] } },
    count: { label: 'حاسبة عدد القطع في اللوح', icon: 'grid', grp: 'slab', labor: [],
      form: [UNIT, n('a', 'طول القطعة'), n('b', 'عرض القطعة'), MAT, n('T', 'السمك (لمقاس لوح تاني)', 'سم', '—'), n('sL', 'طول اللوح', '', 'من الخامة'), n('sW', 'عرض اللوح', '', 'من الخامة'), n('kerf', 'السلاح', 'مم', '—'), n('need', 'العدد المطلوب', '', '—'), n('area', 'أو المساحة المطلوبة', 'م²', '—'), WASTE, ck('noRotate', 'ممنوع اللف (اتجاه العرق)')],
      def: { unit: 'cm' } },
    slabs: { label: 'حاسبة الألواح', icon: 'slab', grp: 'slab', labor: [['slab', 'قص (لوح)']],
      form: [MAT, n('T', 'السمك', 'سم', 'من الخامة'), n('area', 'المساحة المطلوبة', 'م²'), WASTE, n('usable', 'المستغل من اللوح', '%', '100'), UNIT, n('sL', 'طول اللوح', '', 'من الخامة'), n('sW', 'عرض اللوح', '', 'من الخامة')],
      def: { unit: 'cm' } },
    nest: { label: 'تقسيم الألواح وتحسين القص', icon: 'nest', grp: 'slab', labor: [['slab', 'قص (لوح)']],
      form: [UNIT, MAT, n('T', 'السمك', 'سم', 'من الخامة'), n('sL', 'طول اللوح', '', 'من الخامة'), n('sW', 'عرض اللوح', '', 'من الخامة'), n('kerf', 'عرض السلاح', 'مم'), n('margin', 'هامش حرف اللوح / مسافة أمان', 'مم', '—'),
        n('keepL', 'أقل طول للباقي يتحفظ'), n('keepW', 'أقل عرض للباقي يتحفظ'),
        rows('parts', 'القطع', 'قطعة', [tx('name', 'القطعة'), n('L', 'الطول'), n('W', 'العرض'), n('count', 'العدد', '', '1'), pk('grain', 'العرق', [['', 'حر'], ['lock', 'مقفول (ممنوع اللف)']]), tx('match', 'مطابقة'), tx('seq', 'الترتيب')], { count: '1' }),
        rows('stock', 'ألواح / بواقي متاحة بمقاسات مختلفة (اختياري)', 'لوح', [n('L', 'الطول'), n('W', 'العرض'), n('count', 'العدد', '', '1'), ck('remnant', 'باقي')], { count: '1' }), ck('useRemnants', 'استخدم بواقي المخزن للخامة دي')],
      def: { unit: 'cm', parts: [], stock: [] } },
    waste: { label: 'حاسبة الهالك', icon: 'waste', grp: 'slab', labor: [],
      form: [sg('mode', 'الطريقة', [['pct', 'نسبة'], ['qty', 'مساحة'], ['piece', 'لكل قطعة'], ['slab', 'لكل لوح'], ['manual', 'مبلغ']]), n('need', 'مساحة القطع المطلوبة', 'م²'), W(n('value', 'القيمة (نسبة / م² / مبلغ)'), { mode: ['pct', 'qty', 'piece', 'manual', '', undefined] }), W(n('pieces', 'عدد القطع'), { mode: ['piece'] }),
        W(n('slabs', 'عدد الألواح'), { mode: ['slab'] }), W(n('slabArea', 'مساحة اللوح', 'م²'), { mode: ['slab'] }), n('reuse', 'بواقي هتتستخدم تاني', 'م²', '—'), n('price', 'سعر المتر', '', '—')], def: { mode: 'pct' } },
    vein: { label: 'مطابقة العروق', icon: 'vein', grp: 'slab', labor: [],
      form: [sg('mode', 'الطريقة', [['none', 'من غير'], ['book', 'Bookmatch'], ['slab', 'Slab Match'], ['waterfall', 'Waterfall'], ['continuous', 'تتابع']]), ch('dir', 'اتجاه العروق', ['طولي', 'عرضي', 'مايل']), n('pieces', 'عدد القطع/الألواح'), note('الترقيم بيظهر تحت؛ اكتب نفس «مجموعة المطابقة» و«الترتيب» في القطع واقفل اللف.')], def: { mode: 'book', dir: 'طولي' } },
    weight: { label: 'حاسبة الوزن والنقل', icon: 'weight', grp: 'money', labor: [], form: [MAT, n('area', 'المساحة', 'م²'), n('T', 'السمك', 'سم', 'من الخامة'), n('density', 'الكثافة', 'كجم/م³', 'من الخامة'), n('pieces', 'عدد القطع', '', '—'), n('cap', 'حمولة النقلة', 'كجم', '—')], def: {} },
    mfg: { label: 'حاسبة تكلفة التصنيع', icon: 'cash', grp: 'money', labor: [], form: [n('qty', 'عدد القطع', '', '1'), n('mat', 'الخامة/الألواح'), n('cut', 'القص'), n('edge', 'تشكيل الحواف'), n('holes', 'الفتحات'), n('finish', 'التلميع/التشطيب'), n('glue', 'لصق ومستهلكات'), n('waste', 'الهالك'), n('other', 'أخرى')], def: {} },
    install: { label: 'حاسبة تكلفة التركيب', icon: 'install', grp: 'money', labor: [], form: [n('techs', 'الفنيين'), n('techRate', 'يومية الفني'), n('helpers', 'المساعدين'), n('helperRate', 'يومية المساعد'), n('days', 'الأيام'), n('transport', 'النقل'), n('site', 'مصاريف الموقع'), n('extra', 'مصاريف إضافية')], def: {} },
    transport: { label: 'حاسبة النقل والرفع', icon: 'truck', grp: 'money', labor: [], form: [n('trips', 'عدد النقلات'), n('tripPrice', 'سعر النقلة'), n('floors', 'أدوار الرفع'), n('floorPrice', 'سعر الدور'), n('loading', 'تحميل وتنزيل'), n('extra', 'إضافي')], def: {} },
    price: { label: 'حاسبة سعر البيع والربح', icon: 'chart', grp: 'money', labor: [], form: [n('cost', 'التكلفة'), sg('mode', 'الطريقة', [['markup', 'نسبة على التكلفة'], ['margin', 'هامش من السعر'], ['target', 'سعر محدد'], ['lump', 'ربح مبلغ']]), n('value', 'النسبة / السعر / المبلغ'), n('qty', 'عدد القطع / الأمتار', '', '1')], def: { mode: 'markup' } },
    payplan: { label: 'حاسبة دفعات العميل', icon: 'cash', grp: 'money', labor: [], form: [n('total', 'إجمالي المشروع'), n('paid', 'المدفوع لحد دلوقتي', '', '—'), rows('parts', 'الدفعات', 'دفعة', [ch('name', 'الدفعة', ['عربون', 'بعد شراء الخامات', 'أثناء التصنيع', 'قبل التركيب', 'عند التسليم']), n('pct', 'النسبة %'), n('amount', 'أو مبلغ')], {})], def: { parts: [] } },
    labor: { label: 'حاسبة المصنعية', icon: 'cash', grp: 'money', labor: [['m2', 'مصنعية (م²)']], form: [n('m2', 'م²'), n('lm', 'م.ط'), n('pieces', 'قطع'), n('steps', 'درجات'), n('slabs', 'ألواح'), n('cutouts', 'فتحات'), n('edges', 'متر حافة'), n('kg', 'كجم')], def: {} },
    custom: { label: 'بند حر / شغل خاص', icon: 'plus', grp: 'gen', labor: [['lump', 'مصنعية']], form: [tx('workName', 'نوع الشغل', 'مثلاً: ترميم، تلميع أرضية قديمة، حوض رخام')], def: {} }
  };
  var GROUPS = [['kitchen', 'المطابخ'], ['stairs', 'السلالم'], ['entrance', 'المداخل'], ['facade', 'الواجهات'], ['floor', 'الأرضيات'], ['bath', 'الحمامات'], ['walls', 'الحوائط والأعمدة'], ['gate', 'البوابات'], ['decor', 'الديكورات'],
    ['gen', 'المقاسات والأشكال'], ['work', 'الحواف والفتحات والتشطيب'], ['slab', 'الألواح والقص والهالك'], ['money', 'التكلفة والسعر والدفعات']];
  // «الحاسبات المستقلة» (35) — بعضها بيفتح نفس الحاسبة بعنوان أو شكل مختلف
  var TOOLS = [['pieces', 'متر مربع'], ['lm', 'متر طولي'], ['count', 'عدد قطع'], ['slabs', 'ألواح'], ['kitchen', 'مطبخ مستقيم', { ktype: 'straight' }], ['kitchen', 'مطبخ L', { ktype: 'L' }], ['kitchen', 'مطبخ U', { ktype: 'U' }],
    ['kitchen', 'جزيرة', { ktype: 'island', island: true }], ['cutouts', 'فتحة حوض', { rows: [{ type: 'sinkTop', count: '1' }] }], ['cutouts', 'فتحة بوتاجاز', { rows: [{ type: 'hob', count: '1' }] }], ['backsplash', 'ظهر مطبخ'],
    ['stairs', 'نوايم السلم', { risers: false }], ['stairs', 'قوايم السلم'], ['stairs', 'البسطات', { n: '', landings: [{ count: '1' }] }], ['stairs', 'وزرات السلالم', { skirtSides: '2' }], ['entrance', 'كسوة المدخل'], ['facade', 'واجهة'], ['column', 'الأعمدة'],
    ['wall', 'تجاليد الحوائط'], ['floor', 'الأرضيات'], ['bath', 'حمام'], ['pieces', 'كاونتر', { parts: [{ name: 'سطح كاونتر', shape: 'rect', count: '1' }, { name: 'جنب', shape: 'rect', count: '2' }] }], ['edges', 'الحواف'], ['lm', 'الكرانيش', { rows: [{ name: 'كورنيشة', count: '1' }] }],
    ['waste', 'الهالك'], ['slabs', 'تكلفة الخامة'], ['labor', 'مصنعية'], ['install', 'تكلفة التركيب'], ['transport', 'تكلفة النقل'], ['project', 'إجمالي المشروع'], ['price', 'سعر البيع'], ['price', 'الربح', { mode: 'markup' }], ['payplan', 'الدفعات'],
    ['nest', 'تقسيم الألواح'], ['nest', 'تحسين القص Cut Optimizer']];

  // ---------------- المكتبة المبدئية (أسماء أمثلة بس — المستخدم بيكتب المقاسات والأسعار وبيضيف ويمسح) ----------------
  function L(cat, fam, unit, names) { return names.map(function (nm) { return { cat: cat, fam: fam, unit: unit, name: nm }; }); }
  var LIB = [].concat(
    L('mat', 'marble', 'م²', ['كرارا Carrara', 'كالاكاتا Calacatta', 'ستاتواريو Statuario', 'إمبيرادور Emperador', 'بوتشينو Botticino', 'تريستا', 'بريشيا', 'أرابيسكاتو', 'أونيكس ماربل', 'رخام أبيض', 'رخام أسود', 'رخام بيج', 'رخام رمادي', 'رخام أخضر', 'رخام أحمر', 'رخام بني', 'رخام أصفر', 'رخام متعدد الألوان', 'رخام سيلفيا', 'رخام جلالة', 'رخام صني']),
    L('mat', 'granite', 'م²', ['أسوان بلاك', 'أسوان ريد', 'جرانيت حلايب', 'جرانيت جندولا', 'جرانيت نيو حلايب', 'جرانيت أحمر', 'جرانيت أسود', 'جرانيت رمادي', 'جرانيت أبيض', 'جرانيت بني', 'جرانيت أخضر', 'جرانيت متعدد الألوان']),
    L('mat', 'travertine', 'م²', ['ترافرتين بيج', 'ترافرتين فضي', 'ترافرتين أبيض', 'ترافرتين بني', 'ترافرتين تركي', 'ترافرتين إيطالي', 'ترافرتين إيراني']),
    L('mat', 'onyx', 'م²', ['أونيكس أبيض', 'أونيكس عسلي', 'أونيكس أخضر', 'أونيكس أحمر', 'أونيكس شفاف (إضاءة خلفية)', 'أونيكس ديكوري']),
    L('mat', 'quartz', 'م²', ['كوارتز أبيض', 'كوارتز رمادي', 'كوارتز أسود', 'كوارتز بعروق رخامية', 'كوارتز متعدد الألوان']),
    L('mat', 'quartzite', 'م²', ['كوارتزيت أبيض', 'كوارتزيت رمادي', 'كوارتزيت ملون']),
    L('mat', 'porcelain', 'م²', ['بورسلين سلاب كبير', 'سلاب بديل الرخام', 'سلاب مطابخ', 'سلاب واجهات وحوائط']),
    L('mat', 'stone', 'م²', ['حجر جيري', 'حجر رملي', 'حجر هاشمي', 'حجر ميكا', 'حجر أردواز Slate', 'حجر واجهات', 'حجر ديكور']),
    L('mat', 'engineered', 'م²', ['رخام صناعي', 'Acrylic Solid Surface', 'Corian', 'أحواض مصنعة']),
    L('acc', '', 'قطعة', ['أدوات تثبيت', 'زوايا', 'حوامل', 'مسامير وخوابير', 'أنظمة تثبيت الواجهات', 'قواعد', 'فواصل']),
    L('cons', '', 'عبوة', ['مواد لصق', 'غراء رخام', 'إيبوكسي', 'سيليكون', 'مواد معالجة', 'مواد تلميع', 'مواد عزل', 'مواد حماية']),
    L('cons', '', 'شيكارة', ['أسمنت', 'رمل']), L('cons', '', 'قطعة', ['أقراص قص', 'أقراص تلميع'])
  );
  var FAMS = { marble: 'رخام', granite: 'جرانيت', travertine: 'ترافرتين', onyx: 'أونيكس', quartz: 'كوارتز', quartzite: 'كوارتزيت', porcelain: 'بورسلين / سلابات', stone: 'أحجار طبيعية', engineered: 'صناعي / كوريان' };
  var CATS = { mat: 'الخامات (ألواح ومتر)', work: 'شغل (حواف، فتحات، تشطيب)', acc: 'إكسسوارات وتثبيت', cons: 'مستهلكات', other: 'أخرى' };
  var FINISHES = ['Polished لامع', 'Honed مطفي', 'Leather', 'Brushed', 'Flamed', 'Bush Hammered', 'Antique', 'Natural', 'شطف', 'تجليخ'];
  var EDGES = ['حافة مستقيمة', 'شطف', 'نص دوران', 'دوران كامل', 'Double Edge', 'Bullnose', 'Waterfall', 'حافة ديكورية', 'Mitre 45°'];
  var GRADES = ['فرز أول', 'فرز تاني', 'تجاري', 'كومرشال'];
  var UNITS = ['م²', 'م.ط', 'لوح', 'قطعة', 'درجة', 'فتحة', 'كيلو', 'طن', 'علبة', 'شيكارة', 'كرتونة', 'عبوة', 'مرة', 'يوم'];
  var LABOR_NAMES = ['تصنيع فقط', 'تركيب فقط', 'توريد وتصنيع وتركيب', 'توريد فقط', 'قص', 'تشكيل حواف', 'فتحات', 'تلميع', 'جلي', 'تركيب مطبخ', 'تركيب سلم', 'تركيب واجهة', 'نقل ورفع'];
  var STAGES = ['تسجيل العميل', 'معاينة الموقع', 'أخذ المقاسات', 'التصميم', 'المقايسة', 'اعتماد السعر', 'شراء الخامات', 'استلام الألواح', 'تجهيز القص', 'التصنيع', 'التشطيب', 'التجهيز للنقل', 'التركيب', 'التسليم', 'التحصيل', 'إغلاق المشروع'];
  var PAY_METHODS = ['نقدي', 'تحويل', 'محفظة'];
  var PAY_TYPES = ['عربون', 'بعد شراء الخامات', 'أثناء التصنيع', 'قبل التركيب', 'عند التسليم', 'دفعة إضافية', 'تسوية حساب'];
  var COST_SUG = { mat: ['ألواح', 'رخام', 'جرانيت', 'مستهلكات'], labor: ['يومية صنايعي', 'يومية مساعد', 'قصاص'], transport: ['نقل ألواح', 'نقل للموقع', 'ونش'], install: ['تركيب', 'سقالة'], expense: ['أقراص', 'مصروفات'], waste: ['هالك ألواح'], other: ['مصاريف أخرى'] };
  var COST_UNITS = { mat: ['لوح', 'م²', 'قطعة'], labor: ['يوم', 'ساعة'], transport: ['نقلة', 'دور'], install: ['يوم', 'مرة'], expense: ['مرة'], waste: ['م²', 'لوح'], other: ['مرة'] };
  var TRADES = ['صنايعي رخام', 'فني تركيب', 'مساعد', 'قصاص', 'فني تلميع', 'فني CNC'];
  root.MarbleCatalog = { KINDS: KINDS, GROUPS: GROUPS, TOOLS: TOOLS, LIB: LIB, FAMS: FAMS, CATS: CATS, FINISHES: FINISHES, EDGES: EDGES, GRADES: GRADES, UNITS: UNITS, LABOR_NAMES: LABOR_NAMES, STAGES: STAGES, PAY_METHODS: PAY_METHODS, PAY_TYPES: PAY_TYPES, COST_SUG: COST_SUG, COST_UNITS: COST_UNITS, TRADES: TRADES, CUT_O: CUT_O, SHAPE_O: SHAPE_O };
})(typeof window !== 'undefined' ? window : this);
