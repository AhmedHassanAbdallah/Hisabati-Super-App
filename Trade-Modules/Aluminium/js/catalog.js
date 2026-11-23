/*
 * أرزقي | Arzoqi — الألوميتال وUPVC: أنواع الشغل والحاسبات وخاناتها، والمكتبة المبدئية (أسماء من غير أسعار ولا مقاسات شركات).
 * المستخدم بيضيف أنواع شغل وأنظمة وقطاعات وإكسسوارات ووحدات وطرق دفع ومراحل بتاعته من غير أي تعديل في الكود.
 * © 2026 أحمد حسن عبدالله
 */
(function (root) {
  'use strict';
  function n(k, l, u, ph) { return { k: k, l: l, t: 'num', u: u || '', ph: ph || '' }; }
  function tx(k, l, ph) { return { k: k, l: l, t: 'text', ph: ph || '' }; }
  function sg(k, l, o) { return { k: k, l: l, t: 'seg', o: o }; }
  function ch(k, l, o, ph) { return { k: k, l: l, t: 'chips', o: o, ph: ph || '' }; }
  function ck(k, l) { return { k: k, l: l, t: 'check' }; }
  function h(l) { return { t: 'h', l: l }; }
  function note(l) { return { t: 'note', l: l }; }
  function rows(k, l, add, f, def) { return { t: 'rows', k: k, l: l, add: add, f: f, def: def || {} }; }
  function sel(k, l, src) { return { k: k, l: l, t: 'sel', src: src }; }
  var UNIT = sg('unit', 'وحدة المقاسات', [['mm', 'مم'], ['cm', 'سم'], ['m', 'متر']]);

  // ---------------- أنواع الشغل (التخصصات) ----------------
  var ALU = ['شباك جرار', 'شباك مفصلي', 'شباك قلاب', 'Tilt & Turn', 'شباك ثابت', 'شباك متعدد التقسيم', 'شباك منور', 'شباك حمام', 'شباك مطبخ', 'باب ألوميتال', 'باب مفصلي', 'باب جرار', 'باب مزدوج', 'باب محل',
    'واجهة محل', 'Storefront', 'Curtain Wall', 'Structural Glazing', 'Frameless', 'قاطع زجاج', 'قاطع مكاتب', 'Folding', 'Bi-Fold', 'Lift & Slide', 'شتر رول', 'شتر ألوميتال', 'ناموسية', 'Screen', 'برجولة', 'مظلة', 'درابزين', 'حواجز',
    'كابينة شاور', 'فريم مراية', 'شغل خاص', 'تصنيع حسب الطلب'];
  var UPVC = ['Sliding Window', 'Sliding Door', 'Casement Window', 'Casement Door', 'Tilt & Turn', 'Fixed Window', 'French Window', 'French Door', 'Folding', 'Lift Sliding', 'Multi-Sash', 'Mosquito Screen', 'قاطع UPVC',
    'نظام تجاري UPVC', 'شتر UPVC', 'قطاع خشبي (Wood Effect)', 'قطاع ملون', 'زجاج مزدوج', 'زجاج ثلاثي', 'عزل حراري', 'عزل صوت', 'تصنيع حسب الطلب'];

  // ---------------- الفتحة ----------------
  function openForm(type, extra) {
    return [tx('room', 'الغرفة / المكان', 'صالة'), tx('no', 'رقم الفتحة', 'ش1'), tx('floor', 'الدور'), UNIT, n('W', 'العرض'), n('H', 'الارتفاع'), n('qty', 'العدد (فتحات متطابقة)', '', '1'),
      ch('work', 'نوع الشغل', type === 'door' ? ['باب مفصلي', 'باب مزدوج', 'باب محل', 'باب بزجاج كامل', 'باب بتقسيمات', 'باب بعتب', 'French Door', 'Casement Door'] : type === 'sliding' ? ['شباك جرار', 'باب جرار', 'Lift & Slide', 'Sliding Door', 'شباك حمام', 'شباك مطبخ'] : type === 'folding' ? ['Folding', 'Bi-Fold', 'باب فولدنج'] : type === 'fixed' ? ['شباك ثابت', 'شباك منور', 'قاطع زجاج', 'قاطع مكاتب', 'Fixed Window'] : ['شباك مفصلي', 'شباك قلاب', 'Casement Window', 'French Window', 'Tilt & Turn']),
      { k: 'sys', l: 'النظام (القطاع)', t: 'sys', otype: type },
      n('N', type === 'casement' || type === 'fixed' || type === 'tilt' ? 'عدد الأجزاء الرأسية' : 'عدد الدرف / الضلف', '', '1'), n('M', 'المتحرك منها', '', 'كلها'), n('V', 'القوائم (Mullions)', '', 'N − 1'), n('T', 'العرضيات (Transoms)', '', '0'),
      ch('dir', 'اتجاه الفتح', type === 'sliding' ? ['يمين', 'شمال', 'الاتنين'] : ['داخلي', 'خارجي', 'يمين', 'شمال', 'قلاب']),
      { k: 'glass', l: 'الزجاج', t: 'lib', cat: 'glass' }, ck('mesh', 'سلك ناموسية'), tx('color', 'اللون'), tx('accNote', 'الإكسسوارات (ملاحظة)', 'مثلاً: كالون 3 نقط'),
      note('المعادلات من النظام اللي اخترته: W العرض و H الارتفاع بالمليمتر، N الأجزاء، M المتحرك، V القوائم، T العرضيات.')].concat(extra || []);
  }
  var KINDS = {
    sliding: { label: 'حاسبة Sliding (جرار)', icon: 'sliding', grp: 'open', labor: [['window', 'تصنيع شباك'], ['m2', 'تركيب (م²)', 'install']], form: openForm('sliding'), def: { unit: 'cm', N: '2', work: 'شباك جرار' } },
    casement: { label: 'حاسبة Casement (مفصلي)', icon: 'casement', grp: 'open', labor: [['window', 'تصنيع شباك'], ['m2', 'تركيب (م²)', 'install']], form: openForm('casement'), def: { unit: 'cm', N: '2', work: 'شباك مفصلي' } },
    tilt: { label: 'حاسبة Tilt & Turn', icon: 'tilt', grp: 'open', labor: [['window', 'تصنيع شباك'], ['m2', 'تركيب (م²)', 'install']], form: openForm('tilt'), def: { unit: 'cm', N: '1', work: 'Tilt & Turn' } },
    fixed: { label: 'حاسبة ثابت / قاطع', icon: 'fixed', grp: 'open', labor: [['m2', 'تصنيع (م²)'], ['m2', 'تركيب (م²)', 'install']], form: openForm('fixed'), def: { unit: 'cm', N: '1', M: '0', work: 'شباك ثابت' } },
    door: { label: 'حاسبة الأبواب', icon: 'door', grp: 'open', labor: [['door', 'تصنيع باب'], ['door', 'تركيب باب', 'install']], form: openForm('door'), def: { unit: 'cm', N: '1', work: 'باب مفصلي' } },
    folding: { label: 'حاسبة Folding', icon: 'folding', grp: 'open', labor: [['sash', 'تصنيع (ضلفة)'], ['m2', 'تركيب (م²)', 'install']], form: openForm('folding'), def: { unit: 'cm', N: '4', work: 'Folding' } },
    facade: { label: 'حاسبة Curtain Wall / واجهات', icon: 'facade', grp: 'facade', labor: [['m2', 'تصنيع وتركيب واجهة (م²)']],
      form: [UNIT, n('W', 'عرض الواجهة'), n('H', 'ارتفاع الواجهة'), n('qty', 'العدد', '', '1'), ch('ftype', 'النظام', ['Storefront', 'Curtain Wall', 'Stick System', 'Structural Glazing', 'Semi-Structural', 'واجهة زجاج', 'واجهة محل']),
        n('ncols', 'أعمدة متساوية', '', '1'), tx('cols', 'أو عروض الأعمدة (بالترتيب)', 'مثلاً: 1200، 1500، 1200'), n('nrows', 'صفوف متساوية', '', '1'), tx('rows', 'أو ارتفاعات الصفوف', 'مثلاً: 900، 2100'),
        n('glassDeduct', 'خصم مقاس الزجاج', 'مم', 'من النظام'), n('acpRows', 'صفوف ACP (من فوق)', '', '0'), n('gasketFactor', 'معامل الجوان على السيليكون', '', '1'), n('anchors', 'تثبيت لكل Mullion', '', '—'), { k: 'glass', l: 'الزجاج', t: 'lib', cat: 'glass' }],
      def: { unit: 'mm', ftype: 'Curtain Wall' } },
    acp: { label: 'حاسبة ACP', icon: 'acp', grp: 'facade', labor: [['m2', 'تركيب ACP (م²)', 'install']],
      form: [UNIT, n('W', 'العرض'), n('H', 'الارتفاع'), n('mw', 'عرض الموديول'), n('mh', 'ارتفاع الموديول'), n('ret', 'طي (Return) من كل جنب', 'مم', '—'), n('sw', 'عرض اللوح'), n('sh', 'ارتفاع اللوح'), n('waste', 'الهالك', '%', '—')], def: { unit: 'mm' } },
    shutter: { label: 'حاسبة الشتر والرول', icon: 'shutter', grp: 'extra', labor: [['m2', 'تركيب شتر (م²)', 'install']],
      form: [sg('type', 'النوع', [['manual', 'يدوي'], ['motor', 'موتور']]), UNIT, n('W', 'العرض'), n('H', 'الارتفاع'), n('qty', 'العدد', '', '1'), tx('slat', 'نوع الشريحة'), n('slatH', 'ارتفاع الشريحة', 'مم', 'من الكتالوج'),
        n('slatDeduct', 'خصم طول الشريحة', 'مم', '—'), n('extraSlats', 'شرائح زيادة للف', '', '—'), n('guideExtra', 'زيادة الجايد', 'مم', '—'), n('box', 'مقاس الصندوق', 'مم', '—'),
        n('kgm2', 'وزن الشرائح كجم/م²', '', '—'), n('motorCap', 'قدرة الموتور كجم', '', '—'), n('remotes', 'ريموت لكل شتر', '', '1')], def: { type: 'manual', unit: 'cm' } },
    mosquito: { label: 'حاسبة الناموسية', icon: 'mesh', grp: 'extra', labor: [['piece', 'تصنيع وتركيب ناموسية']],
      form: [sg('type', 'النوع', [['sliding', 'جرار'], ['fixed', 'ثابت'], ['roller', 'رول'], ['pleated', 'Pleated'], ['hinged', 'مفصلي']]), UNIT, n('W', 'العرض'), n('H', 'الارتفاع'), n('qty', 'العدد', '', '1'),
        n('dw', 'خصم العرض', 'مم', '—'), n('dh', 'خصم الارتفاع', 'مم', '—'), n('overlap', 'زيادة الشبك من كل جنب', 'مم', '—'), tx('profile', 'القطاع'), ch('mesh', 'الشبك', ['فايبر', 'ألومنيوم', 'Pleated', 'ضد الحشرات'])], def: { type: 'sliding', unit: 'cm' } },
    shower: { label: 'حاسبة كبائن الشاور', icon: 'shower', grp: 'extra', labor: [['piece', 'تركيب كابينة']],
      form: [sg('frame', 'النوع', [['frameless', 'Frameless'], ['semi', 'Semi-Frameless'], ['framed', 'Framed']]), ch('layout', 'الشكل', ['ثابت', 'جرار', 'مفصلي', 'كورنر', 'Walk-In', 'مخصوص']), UNIT,
        rows('panels', 'الألواح', 'لوح', [tx('name', 'اللوح'), n('w', 'العرض'), n('h', 'الارتفاع'), n('count', 'العدد'), sg('type', 'النوع', [['fixed', 'ثابت'], ['door', 'باب مفصلي'], ['sliding', 'باب جرار']])], { type: 'fixed', count: '1' }),
        { k: 'glass', l: 'الزجاج', t: 'lib', cat: 'glass' }, n('thick', 'سمك الزجاج', 'مم'), n('hinges', 'مفصلات لكل باب'), n('rollers', 'رولرات لكل باب جرار'), n('silicone', 'سيليكون', 'متر', '—'), n('fix', 'أطقم تثبيت', '', '—')],
      def: { frame: 'frameless', unit: 'cm', panels: [], hinges: '2', rollers: '2' } },
    glass: { label: 'حاسبة الزجاج', icon: 'glass', grp: 'mat', labor: [['m2', 'تركيب زجاج (م²)']],
      form: [UNIT, { k: 'glass', l: 'نوع الزجاج (لكل القطع)', t: 'lib', cat: 'glass' }, rows('rows', 'القطع', 'قطعة', [tx('name', 'القطعة'), n('w', 'العرض'), n('h', 'الارتفاع'), n('count', 'العدد'), { k: 'glass', l: 'نوع مختلف', t: 'lib', cat: 'glass' }], { count: '1' }),
        n('dw', 'خصم العرض', 'مم', '—'), n('dh', 'خصم الارتفاع', 'مم', '—'), n('minArea', 'أقل مساحة للقطعة', 'م²', 'من المورد'), n('waste', 'الهالك', '%', '—'), ck('transport', 'نقل الزجاج (سطر)')], def: { unit: 'cm', rows: [] } },
    cut: { label: 'Cut List Optimizer', icon: 'cut', grp: 'mat', labor: [['bar', 'قص (عود)']],
      form: [{ k: 'prof', l: 'القطاع (من المكتبة)', t: 'lib', cat: 'profile' }, UNIT, n('bar', 'طول العود القياسي'), n('kerf', 'عرض السلاح (Kerf)', 'مم'), n('trim', 'تهذيب العود', 'مم', '—'), n('minKeep', 'أقل باقي يتحفظ'), n('spare', 'احتياطي قطع', '%', '—'),
        rows('pieces', 'القطع المطلوبة', 'قطعة', [tx('label', 'الاسم'), n('len', 'الطول'), n('count', 'العدد')], { count: '1' }),
        rows('stocks', 'أعواد / بواقي بأطوال مختلفة (اختياري)', 'عود', [n('len', 'الطول'), n('count', 'العدد'), ck('remnant', 'باقي')], { count: '1' }), ck('useRemnants', 'استخدم بواقي المخزن للقطاع ده')],
      def: { unit: 'mm', pieces: [], stocks: [] } },
    bars: { label: 'حاسبة عدد الأعواد', icon: 'bars', grp: 'mat', labor: [], form: [UNIT, n('bar', 'طول العود'), n('kerf', 'السلاح', 'مم', '—'), rows('pieces', 'القطع', 'قطعة', [tx('label', 'الاسم'), n('len', 'الطول'), n('count', 'العدد')], { count: '1' })], def: { unit: 'mm', pieces: [] } },
    profiles: { label: 'حاسبة القطاعات', icon: 'profile', grp: 'mat', labor: [['lm', 'تصنيع (م.ط)']], form: [UNIT, rows('rows', 'القطاعات', 'قطاع', [{ k: 'prof', l: 'القطاع', t: 'lib', cat: 'profile' }, tx('name', 'أو الاسم'), n('len', 'الطول'), n('count', 'العدد'), n('weight', 'الوزن كجم/م', '', 'من المكتبة')], { count: '1' })], def: { unit: 'mm', rows: [] } },
    waste: { label: 'حاسبة الهالك', icon: 'waste', grp: 'mat', labor: [],
      form: [rows('rows', 'الخامات', 'خامة', [ch('name', 'الخامة', ['قطاعات', 'زجاج', 'UPVC', 'ألوميتال', 'إكسسوارات', 'شبك', 'سيليكون', 'مستهلكات']), sg('mode', 'الطريقة', [['pct', 'نسبة'], ['qty', 'كمية'], ['piece', 'لكل قطعة'], ['bar', 'لكل عود'], ['area', 'م² زجاج'], ['manual', 'مبلغ']]),
        n('base', 'الكمية الأساسية'), tx('unit', 'الوحدة'), n('value', 'القيمة'), n('price', 'سعر الوحدة')], { mode: 'pct' })], def: { rows: [] } },
    sashes: { label: 'حاسبة عدد الضلف', icon: 'sliding', grp: 'calc', labor: [], form: [UNIT, n('W', 'عرض الفتحة'), n('maxSash', 'أقصى عرض للضلفة'), n('minSash', 'أقل عرض للضلفة', '', '—'), n('overlap', 'التراكب عند كل إنترلوك', 'مم', '—')], def: { unit: 'cm' } },
    area: { label: 'حاسبة المساحات', icon: 'area', grp: 'calc', labor: [['m2', 'مصنعية (م²)']], form: [UNIT, rows('rows', 'القطع', 'قطعة', [tx('name', 'الاسم', 'شباك 1'), n('w', 'العرض'), n('h', 'الارتفاع'), n('count', 'العدد')], { count: '1' }), n('price', 'سعر المتر المربع (اختياري)')], def: { unit: 'cm', rows: [] } },
    mfg: { label: 'حاسبة تكلفة التصنيع', icon: 'cash', grp: 'money', labor: [], form: [n('qty', 'عدد القطع', '', '1'), h('الخامات'), n('profiles', 'القطاعات'), n('glass', 'الزجاج'), n('acc', 'الإكسسوارات'), n('cons', 'المستهلكات'), n('waste', 'الهالك'),
      h('الأجور'), n('cut', 'القص'), n('assembly', 'التجميع'), n('glazing', 'تركيب الزجاج'), n('hardware', 'تركيب الإكسسوارات'), n('finish', 'التشطيب')], def: {} },
    install: { label: 'حاسبة تكلفة التركيب', icon: 'install', grp: 'money', labor: [], form: [n('techs', 'الفنيين'), n('techRate', 'يومية الفني'), n('helpers', 'المساعدين'), n('helperRate', 'يومية المساعد'), n('days', 'الأيام'), n('transport', 'النقل'), n('site', 'مصاريف الموقع'), n('extra', 'مصاريف إضافية')], def: {} },
    price: { label: 'حاسبة سعر البيع والربح', icon: 'chart', grp: 'money', labor: [], form: [n('cost', 'التكلفة'), sg('mode', 'الطريقة', [['markup', 'نسبة على التكلفة'], ['margin', 'هامش من السعر'], ['target', 'سعر محدد'], ['lump', 'ربح مبلغ']]), n('value', 'النسبة / السعر / المبلغ'), n('qty', 'عدد القطع', '', '1')], def: { mode: 'markup' } },
    payplan: { label: 'حاسبة دفعات العميل', icon: 'cash', grp: 'money', labor: [], form: [n('total', 'إجمالي المشروع'), n('paid', 'المدفوع لحد دلوقتي', '', '—'), rows('parts', 'الدفعات', 'دفعة', [ch('name', 'الدفعة', ['مقدم', 'بدء التصنيع', 'التوريد', 'التركيب', 'التسليم']), n('pct', 'النسبة %'), n('amount', 'أو مبلغ')], {})], def: { parts: [] } },
    labor: { label: 'حاسبة المصنعية', icon: 'cash', grp: 'money', labor: [['m2', 'مصنعية (م²)']], form: [n('m2', 'م²'), n('lm', 'م.ط'), n('pieces', 'قطع'), n('windows', 'شبابيك'), n('sashes', 'ضلف'), n('doors', 'أبواب'), n('facades', 'واجهات'), n('profiles', 'قطاعات'), n('bars', 'أعواد'), n('kg', 'كجم')], def: {} },
    custom: { label: 'بند حر / شغل خاص', icon: 'plus', grp: 'calc', labor: [['lump', 'مصنعية']], form: [tx('workName', 'نوع الشغل', 'مثلاً: درابزين، برجولة، فريم مراية')], def: {} }
  };
  var GROUPS = [['open', 'الشبابيك والأبواب'], ['facade', 'الواجهات'], ['extra', 'الشتر والناموسيات والشاور'], ['mat', 'القطاعات والزجاج والقص'], ['calc', 'حاسبات سريعة'], ['money', 'التكلفة والسعر والدفعات']];
  // قايمة «الحاسبات المستقلة» (30) — بعضها بيفتح نفس الحاسبة بعنوان مختلف
  var TOOLS = [['area', 'مساحة الشباك'], ['area', 'مساحة الباب'], ['glass', 'مساحة الزجاج'], ['profiles', 'القطاعات'], ['bars', 'الأعواد'], ['cut', 'قص القطاعات'], ['waste', 'الهالك'], ['sashes', 'عدد الضلف'],
    ['sliding', 'Sliding'], ['casement', 'Casement'], ['tilt', 'Tilt & Turn'], ['folding', 'Folding'], ['facade', 'Curtain Wall'], ['facade', 'واجهات المحلات'], ['acp', 'ACP'], ['shutter', 'الشتر'], ['mosquito', 'الناموسية'], ['shower', 'كبائن الشاور'],
    ['glass', 'الزجاج'], ['custom', 'الإكسسوارات'], ['labor', 'المصنعية'], ['mfg', 'تكلفة التصنيع'], ['install', 'تكلفة التركيب'], ['price', 'سعر البيع والربح'], ['bars', 'عدد الأعواد'], ['cut', 'Cut Optimization'], ['area', 'مساحة المشروع'],
    ['survey', 'مقايسة عميل'], ['payplan', 'دفعات العميل'], ['project', 'إجمالي مشروع'], ['door', 'الأبواب'], ['fixed', 'ثابت / قواطيع']];

  // ---------------- المكتبة المبدئية (أسماء بس) ----------------
  function L(cat, mat, unit, names, extra) { return names.map(function (nm) { return Object.assign({ cat: cat, mat: mat, unit: unit, name: nm }, extra || {}); }); }
  var LIB = [].concat(
    L('profile', 'alu', 'عود', ['قطاع فريم جرار', 'قطاع ضلفة جرار', 'قطاع إنترلوك', 'قطاع مسار', 'قطاع فريم مفصلي', 'قطاع ضلفة مفصلي', 'قطاع Mullion', 'قطاع Transom', 'باكتة زجاج', 'قطاع سلك', 'قطاع عتب', 'قطاع باب', 'قطاع واجهات', 'قطاع شتر', 'قطاع حليات'], { role: '' }),
    L('profile', 'upvc', 'عود', ['UPVC Frame', 'UPVC Sash', 'UPVC Mullion', 'UPVC Transom', 'UPVC Sliding Frame', 'UPVC Sliding Sash', 'UPVC Coupler', 'UPVC Extension', 'UPVC Glazing Bead', 'UPVC Mosquito', 'حديد داخلي (Reinforcement)']),
    L('glass', '', 'م²', ['زجاج شفاف (Clear)', 'زجاج ملون (Tinted)', 'زجاج عاكس (Reflective)', 'زجاج مصنفر (Frosted)', 'زجاج سيكوريت (Tempered)', 'زجاج سيكوريت شاور', 'زجاج Laminated', 'زجاج مزدوج (Double)', 'زجاج ثلاثي (Triple)', 'زجاج Low-E', 'زجاج ديكور', 'مراية']),
    L('acc', 'alu', 'قطعة', ['رولر', 'مفصلات', 'قفل جرار', 'كالون', 'مقبض', 'Cremone', 'ونش / Stay', 'Friction Stay', 'زاوية تجميع (Corner Cleat)', 'مسامير', 'Door Closer', 'Pivot', 'هاردوير فولدنج', 'هاردوير Lift & Slide', 'رولر ناموسية', 'زوايا', 'ترباس']),
    L('acc', 'upvc', 'قطعة', ['Multipoint Lock', 'UPVC Handle', 'UPVC Hinges', 'UPVC Roller', 'طقم Tilt & Turn', 'Espagnolette', 'Packers', 'UPVC Corner']),
    L('gasket', '', 'متر', ['جوان زجاج', 'جوان EPDM', 'فرشة', 'كاوتش']),
    L('cons', '', 'قطعة', ['سيليكون', 'ريش', 'شريط', 'مواد تنظيف', 'مواد تركيب', 'فوم']),
    L('mesh', '', 'م²', ['سلك ناموسية فايبر', 'سلك ألومنيوم'])
  );
  var CATS = { profile: 'قطاعات', glass: 'زجاج', acc: 'إكسسوارات', gasket: 'جوانات وفرش', cons: 'مستهلكات', mesh: 'شبك', other: 'أخرى' };
  var UNITS = ['عود', 'متر', 'م²', 'قطعة', 'طقم', 'كرتونة', 'عبوة', 'كيلو', 'رول', 'لوح', 'مرة'];
  var LABOR_NAMES = ['تصنيع فقط', 'تركيب فقط', 'تصنيع وتركيب', 'توريد وتركيب', 'قص', 'تجميع', 'تركيب زجاج', 'تركيب إكسسوارات', 'تشطيب', 'نقل'];
  var STAGES = ['تسجيل العميل', 'معاينة الموقع', 'أخذ المقاسات', 'المقايسة', 'عرض السعر', 'موافقة العميل', 'شراء الخامات', 'أمر التصنيع', 'القص', 'التجميع', 'تركيب الزجاج', 'التشطيب', 'التسليم', 'التحصيل'];
  var PAY_METHODS = ['نقدي', 'تحويل', 'محفظة'];
  var PAY_TYPES = ['مقدم', 'بدء التصنيع', 'التوريد', 'التركيب', 'التسليم', 'دفعة إضافية'];
  var COST_SUG = { mat: ['قطاعات', 'زجاج', 'إكسسوارات'], labor: ['يومية صنايعي', 'يومية مساعد'], transport: ['نقل', 'عربية'], install: ['تركيب', 'سقالة'], expense: ['مصروفات', 'أدوات'], waste: ['هالك قطاعات', 'هالك زجاج'], other: ['مصاريف أخرى'] };
  var COST_UNITS = { mat: ['عود', 'م²', 'قطعة'], labor: ['يوم', 'ساعة'], transport: ['مشوار'], install: ['يوم', 'مرة'], expense: ['مرة'], waste: ['عود', 'م²'], other: ['مرة'] };
  var TRADES = ['صنايعي ألوميتال', 'صنايعي UPVC', 'فني تركيب', 'مساعد', 'زجاج', 'قص'];
  root.AluCatalog = { KINDS: KINDS, GROUPS: GROUPS, TOOLS: TOOLS, LIB: LIB, CATS: CATS, UNITS: UNITS, LABOR_NAMES: LABOR_NAMES, STAGES: STAGES, PAY_METHODS: PAY_METHODS, PAY_TYPES: PAY_TYPES, COST_SUG: COST_SUG, COST_UNITS: COST_UNITS, ALU: ALU, UPVC: UPVC, TRADES: TRADES };
})(typeof window !== 'undefined' ? window : this);
