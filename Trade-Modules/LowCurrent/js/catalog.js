/*
 * أرزقي | Arzoqi — التيار الخفيف: الأنظمة، الحاسبات وخاناتها، ومكتبة الخامات المبدئية.
 * أسماء وتصنيفات بس — من غير أسعار (المستخدم بيكتب أسعاره وماركاته ومورديه). كل حاجة هنا بتتعدّل:
 * المكتبة بتتنسخ لمكتبة المستخدم ويقدر يضيف ويعدّل ويمسح، ويضيف أنظمة ووحدات وطرق مصنعية بتاعته.
 * © 2026 أحمد حسن عبدالله
 */
(function (root) {
  'use strict';
  // ---------------- مساعدات تعريف الخانات ----------------
  function n(k, l, u, ph) { return { k: k, l: l, t: 'num', u: u || '', ph: ph || '' }; }
  function tx(k, l, ph) { return { k: k, l: l, t: 'text', ph: ph || '' }; }
  function sg(k, l, o) { return { k: k, l: l, t: 'seg', o: o }; }
  function ch(k, l, o, ph) { return { k: k, l: l, t: 'chips', o: o, ph: ph || '' }; }
  function ck(k, l) { return { k: k, l: l, t: 'check' }; }
  function h(l) { return { t: 'h', l: l }; }
  function note(l) { return { t: 'note', l: l }; }
  function rows(k, l, add, f, def) { return { t: 'rows', k: k, l: l, add: add, f: f, def: def || {} }; }
  var CABLE = [n('waste', 'هالك الكابل', '%', '—'), n('reel', 'طول البكرة', 'م', 'حسب المورد')];

  // ---------------- الأنظمة (التخصصات) ----------------
  var SYSTEMS = [
    { id: 'cctv', label: 'كاميرات المراقبة', en: 'CCTV', icon: 'cam', kinds: ['cctv', 'storage', 'poe'], desc: 'Analog/AHD/TVI/CVI/IP/Wi-Fi/PTZ و DVR/NVR/XVR والتخزين' },
    { id: 'net', label: 'الشبكات والداتا', en: 'Networking', icon: 'net', kinds: ['netpoints', 'cables', 'poe', 'rack'], desc: 'CAT5e/6/6A/7/8، راكات، سويتشات، Wi-Fi' },
    { id: 'fiber', label: 'الفايبر', en: 'Fiber Optic', icon: 'fiber', kinds: ['fiber', 'splice'], desc: 'Single/Multi Mode، FTTH، لحامات ونهايات' },
    { id: 'fire', label: 'إنذار الحريق', en: 'Fire Alarm', icon: 'fire', kinds: ['fire'], desc: 'Conventional و Addressable — حصر كميات' },
    { id: 'access', label: 'التحكم في الدخول', en: 'Access Control', icon: 'door', kinds: ['access'], desc: 'كروت وبصمة ووجه وأقفال وكنترولرات — كل باب لوحده' },
    { id: 'intercom', label: 'الإنتركم', en: 'Intercom', icon: 'intercom', kinds: ['intercom'], desc: 'صوت وفيديو وIP — فيلا وعمارات' },
    { id: 'pa', label: 'الصوتيات', en: 'PA & Sound', icon: 'speaker', kinds: ['pa'], desc: 'سماعات وأمبليفايرات 100V/70V ومناطق' },
    { id: 'pbx', label: 'السنترالات', en: 'PBX & Telephony', icon: 'phone', kinds: ['pbx'], desc: 'Analog/IP PBX، VoIP، Gateways' },
    { id: 'sat', label: 'الدش والتلفزيون', en: 'Satellite & TV', icon: 'dish', kinds: ['dish', 'central', 'matv', 'lnb', 'tvout', 'dishcable', 'tvpoint'], desc: 'دش فردي ومتحرك ومركزي، LNB، Multiswitch، MATV/SMATV' },
    { id: 'alarm', label: 'إنذار السرقة', en: 'Intrusion Alarm', icon: 'bell', kinds: ['alarm'], desc: 'سلكي ولاسلكي، حساسات وسارينات ولوحات' },
    { id: 'gates', label: 'البوابات', en: 'Gates & Barriers', icon: 'gate', kinds: ['gates'], desc: 'بارير وبوابات منزلقة وTurnstiles وقراءة UHF' },
    { id: 'smart', label: 'سمارت هوم', en: 'Smart Home', icon: 'home2', kinds: ['smart'], desc: 'Zigbee/Z-Wave/Wi-Fi/KNX' },
    { id: 'bms', label: 'BMS', en: 'Building Automation', icon: 'chip', kinds: ['bms'], desc: 'نقاط DDC وكنترولرات — حصر' },
    { id: 'attendance', label: 'الحضور والانصراف', en: 'Attendance', icon: 'finger', kinds: ['attendance'], desc: 'بصمة ووجه وكروت' },
    { id: 'nurse', label: 'نداء التمريض', en: 'Nurse Call', icon: 'nurse', kinds: ['nurse'], desc: 'غرف وأسرة وحمامات' },
    { id: 'iptv', label: 'IPTV', en: 'IPTV', icon: 'tv', kinds: ['iptv'], desc: 'Headend وEncoders وSTB وباندويث' }
  ];

  // ---------------- الحاسبات ----------------
  var TECH = ['Analog', 'HD Analog', 'AHD', 'TVI', 'CVI', 'IP', 'Wi-Fi'];
  var CAMT = ['Bullet', 'Dome', 'Turret', 'PTZ', 'Fisheye', 'Thermal', 'كاميرا صوت', 'Solar'];
  var KINDS = {
    cctv: { label: 'حاسبة كاميرات', sys: 'cctv', icon: 'cam', labor: [['camera', 'تركيب كاميرا'], ['m', 'تأسيس (متر)'], ['lump', 'برمجة'], ['lump', 'تشغيل وتسليم']],
      form: [
        rows('cams', 'الكاميرات', 'مجموعة كاميرات', [n('count', 'العدد'), ch('type', 'النوع', CAMT), ch('tech', 'النظام', TECH), n('res', 'الدقة', 'MP'), tx('lens', 'العدسة', '2.8mm'), sg('place', 'المكان', [['in', 'داخلي'], ['out', 'خارجي']]),
          sg('power', 'التغذية', [['adapter', 'أدابتر'], ['psu', 'باور مركزي'], ['poe', 'PoE'], ['solar', 'طاقة شمسية']]), n('watts', 'الاستهلاك', 'وات', '—'), tx('brand', 'الماركة'), tx('model', 'الموديل'), n('len', 'متوسط الكابل للكاميرا', 'م')],
          { count: '', type: 'Bullet', tech: 'AHD', place: 'out', power: 'adapter' }),
        h('جهاز التسجيل والتخزين'), sg('rec.type', 'النوع', [['DVR', 'DVR'], ['NVR', 'NVR'], ['XVR', 'XVR'], ['Hybrid', 'Hybrid']]),
        n('rec.channels', 'عدد القنوات'), n('rec.count', 'عدد الأجهزة', '', 'محسوب'), n('rec.hdd', 'عدد الهاردات', '', '—'), n('rec.hddTB', 'سعة الهارد', 'تيرا', '—'), n('rec.monitors', 'شاشات', '', '—'),
        h('الكابلات والمستلزمات'), sg('cable', 'نوع الكابل', [['coax', 'كواكس'], ['coaxp', 'كواكس + باور'], ['utp', 'شبكة UTP']]), n('psuCh', 'مخارج الباور المركزي', '', '—'),
        ck('boxes', 'علبة توصيل لكل كاميرا خارجي'), ck('mounts', 'قاعدة تثبيت لكل كاميرا')].concat(CABLE),
      def: { cams: [], rec: { type: 'DVR' }, cable: 'coax' } },
    storage: { label: 'حاسبة تخزين CCTV', sys: 'cctv', icon: 'disk', labor: [['lump', 'تركيب الهاردات وضبط التسجيل']],
      form: [rows('groups', 'مجموعات الكاميرات', 'مجموعة', [tx('name', 'الاسم'), n('count', 'العدد'), n('bitrate', 'Bitrate', 'Mbps', 'من الكاميرا'), n('res', 'الدقة (لو مش عارف الـ Bitrate)', 'MP'), sg('codec', 'Codec', [['H.264', 'H.264'], ['H.265', 'H.265']]), n('fps', 'FPS', '', '25')], { count: '', codec: 'H.265' }),
        sg('mode', 'التسجيل', [['cont', 'مستمر'], ['motion', 'بالحركة']]), n('activity', 'نسبة وقت الحركة', '%'), n('hours', 'ساعات التسجيل في اليوم'), n('days', 'أيام الاحتفاظ'), n('margin', 'هامش أمان', '%', '—'),
        n('diskTB', 'سعة الهارد الواحد', 'تيرا'), n('bays', 'أماكن الهارد في الجهاز', '', '—'),
        note('الحساب: الـ Bitrate (ميجابت/ث) × 3600 × الساعات × نسبة الحركة ÷ 8 ÷ 1000 = جيجا في اليوم لكل كاميرا.')],
      def: { groups: [], mode: 'cont', hours: '24' } },
    netpoints: { label: 'حاسبة نقاط الشبكة', sys: 'net', icon: 'net', labor: [['netpoint', 'تأسيس وتركيب نقطة'], ['lump', 'تركيب الراك والتوصيل'], ['lump', 'اختبار وتشغيل']],
      form: [rows('points', 'النقاط', 'نقطة / مجموعة نقاط', [tx('name', 'اسم النقطة'), tx('place', 'المكان'), n('count', 'عدد النقاط المتطابقة'), ch('type', 'النوع', ['داتا', 'تليفون', 'Access Point', 'كاميرا', 'طابعة']), ch('cat', 'الكابل', ['CAT5e', 'CAT6', 'CAT6A', 'CAT7', 'CAT8']),
        n('len', 'طول المسار', 'م'), n('cables', 'كابلات في النقطة'), tx('found', 'التأسيس', 'ماسورة/ترنك'), n('faceplates', 'Faceplate', '', '1'), n('keystones', 'Keystone', '', '= الكابلات'), n('patch', 'Patch Cords', '', '2 لكل كابل')],
        { count: '1', type: 'داتا', cat: 'CAT6', cables: '1' }),
        n('extra', 'زيادة لكل كابل للتوصيل', 'م', '—'), n('ppPorts', 'منافذ الـ Patch Panel', '', '24 أو 48')].concat(CABLE),
      def: { points: [] } },
    cables: { label: 'حاسبة الكابلات بالمسارات', sys: 'net', icon: 'cable', labor: [['m', 'سحب كابل (متر)'], ['route', 'مسار']], form: [note('ضيف المسارات تحت (كل مسار ليه طوله وعدد الكابلات والزيادات)، وأنواع الكابلات بطول البكرة والهالك والسعر.')], def: {}, routesOnly: true },
    poe: { label: 'حاسبة PoE', sys: 'net', icon: 'bolt', labor: [['device', 'توصيل وتشغيل جهاز']],
      form: [rows('devs', 'الأجهزة', 'جهاز', [tx('name', 'الجهاز', 'كاميرا IP'), n('count', 'العدد'), n('watts', 'الاستهلاك', 'وات'), sg('std', 'المعيار', [['', 'مش معروف'], ['af', 'af'], ['at', 'at'], ['bt3', 'bt3'], ['bt4', 'bt4']])], { count: '', std: '' }),
        n('reserve', 'احتياطي الطاقة', '%', '—'), sg('basis', 'أساس الحساب', [['device', 'استهلاك الأجهزة'], ['class', 'أقصى قدرة المنفذ']]),
        h('السويتش'), n('sw.ports', 'منافذ PoE في السويتش'), n('sw.budget', 'PoE Budget للسويتش', 'وات'), sg('sw.std', 'معيار السويتش', [['', 'مش معروف'], ['af', 'af'], ['at', 'at'], ['bt3', 'bt3'], ['bt4', 'bt4']]), n('sw.count', 'السويتشات المتاحة', '', '—'),
        note('حدود المعايير عند الجهاز: af 12.95 وات · at 25.5 · bt Type 3 51 · bt Type 4 71.3 (وعند المنفذ 15.4/30/60/90).')],
      def: { devs: [], basis: 'device', sw: { std: '' } } },
    fiber: { label: 'حاسبة الفايبر', sys: 'fiber', icon: 'fiber', labor: [['m', 'سحب فايبر (متر)'], ['splice', 'لحام'], ['lump', 'اختبار وتسليم']],
      form: [rows('routes', 'المسارات', 'مسار', [tx('name', 'المسار'), n('len', 'الطول', 'م'), n('cores', 'الكور المستخدمة'), n('spare', 'كور احتياطي', '', '—'), sg('type', 'النوع', [['SM', 'Single Mode'], ['MM', 'Multi Mode']]), sg('env', 'المكان', [['in', 'داخلي'], ['out', 'خارجي']]),
        n('ends', 'نهايات متلحّمة', '', '2'), n('joints', 'وصلات في النص', '', '—'), n('patch', 'Patch cords لكل نهاية', '', '= الكور')], { type: 'SM', env: 'out' }),
        n('slack', 'احتياطي لفة عند كل نهاية', 'م', '—'), n('waste', 'هالك', '%', '—'), n('drum', 'طول البكرة', 'م', '—'), n('odfPorts', 'منافذ الـ ODF', '', '12/24/48'),
        rows('spl', 'Splitters', 'Splitter', [ch('ratio', 'النسبة', ['1:2', '1:4', '1:8', '1:16', '1:32']), n('count', 'العدد')], { ratio: '1:8' }),
        n('closure', 'Joint Closure', '', '—'), n('fat', 'FAT', '', '—'), n('fdb', 'FDB', '', '—'), n('mc', 'Media Converters', '', '—')],
      def: { routes: [], spl: [] } },
    splice: { label: 'حاسبة لحامات الفايبر', sys: 'fiber', icon: 'spark', labor: [['splice', 'لحام'], ['point', 'تجهيز نهاية']],
      form: [n('ends', 'عدد النهايات'), n('cores', 'الكور في كل نهاية'), n('joints', 'وصلات (Joints)', '', '—'), n('jointCores', 'الكور في الوصلة', '', '= الكور'), ck('test', 'هتعمل اختبار لكل كور')], def: {} },
    rack: { label: 'حاسبة الراك', sys: 'net', icon: 'rack', labor: [['lump', 'تركيب وترتيب الراك']],
      form: [rows('devs', 'الأجهزة في الراك', 'جهاز', [ch('name', 'الجهاز', ['Patch Panel', 'Switch', 'Cable Manager', 'NVR', 'Router', 'UPS', 'Shelf', 'PDU']), n('u', 'الارتفاع', 'U'), n('count', 'العدد')], { name: 'Patch Panel', u: '1', count: '1' }),
        n('reserve', 'مساحة احتياطية', '%', '—'), n('size', 'مقاس الراك (لو عايز تحدده)', 'U', 'محسوب'), n('managers', 'Cable Managers', '', '—')], def: { devs: [] } },
    fire: { label: 'حاسبة إنذار الحريق', sys: 'fire', icon: 'fire', labor: [['device', 'تركيب جهاز'], ['m', 'تأسيس (متر)'], ['lump', 'برمجة واختبار']],
      form: [sg('sys', 'النظام', [['conv', 'Conventional'], ['addr', 'Addressable']]),
        rows('zones', 'المناطق / الأدوار', 'منطقة', [tx('name', 'المنطقة'), tx('floor', 'الدور'), n('smoke', 'دخان'), n('heat', 'حرارة'), n('mcp', 'MCP'), n('sounder', 'Sounder/Bell'), n('strobe', 'Strobe'), n('ss', 'Sounder Strobe'), n('io', 'I/O Module'), n('relay', 'Relay'), n('iso', 'Isolator')], {}),
        n('panelZones', 'زونات اللوحة (Conventional)'), n('loopCap', 'سعة الـ Loop (Addressable)', 'جهاز'), n('loops', 'عدد الـ Loops', '', '—'), n('panels', 'عدد اللوحات', '', '—'),
        ck('boxes', 'علب (Back boxes) للـ MCP والسارينات'), n('len', 'متوسط الكابل لكل جهاز', 'م')].concat(CABLE), def: { sys: 'conv', zones: [] }, warnFixed: 'fire' },
    access: { label: 'حاسبة Access Control', sys: 'access', icon: 'door', labor: [['door', 'تركيب باب'], ['lump', 'برمجة']],
      form: [rows('doors', 'الأبواب', 'باب', [tx('name', 'الباب'), n('count', 'أبواب متطابقة'), ch('type', 'نوع الباب', ['خشب', 'حديد', 'زجاج', 'ألومنيوم']), sg('sys', 'الدخول', [['card', 'كارت'], ['finger', 'بصمة'], ['face', 'وجه'], ['keypad', 'كيباد']]),
        n('rin', 'قراء دخول'), n('rout', 'قراء خروج', '', '—'), sg('lock', 'القفل', [['mag', 'مغناطيسي'], ['strike', 'Strike'], ['bolt', 'Bolt']]), n('locks', 'عدد الأقفال', '', '1'),
        ck('exit', 'زر خروج'), ck('contact', 'Door Contact'), ck('psu', 'باور سبلاي'), ck('battery', 'بطارية'), ck('breakglass', 'Emergency Release'), ck('closer', 'Door Closer'), n('len', 'الكابل للباب', 'م')],
        { count: '1', sys: 'card', rin: '1', lock: 'mag', exit: true, contact: true, psu: true }),
        n('ctrlDoors', 'أبواب لكل كنترولر'), ck('standalone', 'أجهزة Standalone (من غير كنترولر)')].concat(CABLE), def: { doors: [] } },
    intercom: { label: 'حاسبة الإنتركم', sys: 'intercom', icon: 'intercom', labor: [['device', 'تركيب جهاز'], ['m', 'تأسيس (متر)'], ['lump', 'برمجة وتشغيل']],
      form: [sg('layout', 'المكان', [['villa', 'فيلا'], ['building', 'عمارات']]), ch('type', 'النظام', ['صوت', 'فيديو', 'أنالوج', 'ديجيتال', 'IP']),
        h('فيلا'), n('ds', 'وحدات خارجية'), n('monitors', 'شاشات/سماعات داخلية'), n('psu', 'باور سبلاي', '', '—'), n('len', 'إجمالي الكابل', 'م'),
        h('عمارات'), n('bld', 'عدد العمارات', '', '1'), n('floors', 'الأدوار'), n('apts', 'شقق في الدور'), n('monPerApt', 'أجهزة في الشقة', '', '1'), n('entrances', 'مداخل لكل عمارة', '', '1'),
        n('distCap', 'شقق لكل وحدة توزيع', '', '—'), n('psuCap', 'شقق لكل باور سبلاي'), n('riserH', 'ارتفاع الدور', 'م'), n('horiz', 'كابل أفقي للشقة', 'م'), n('masters', 'Master Stations (أمن)', '', '—'), n('locks', 'أقفال لكل عمارة', '', '= المداخل')].concat(CABLE),
      def: { layout: 'building', type: 'فيديو' } },
    pa: { label: 'حاسبة الصوتيات', sys: 'pa', icon: 'speaker', labor: [['speaker', 'تركيب سماعة'], ['m', 'تأسيس (متر)'], ['lump', 'برمجة وتشغيل']],
      form: [sg('volt', 'النظام', [['100', '100V'], ['70', '70V'], ['lowz', 'Low Impedance']]),
        rows('groups', 'السماعات حسب المنطقة', 'مجموعة سماعات', [tx('zone', 'المنطقة'), ch('type', 'النوع', ['سقف', 'حائط', 'Horn', 'خارجي']), n('count', 'العدد'), n('tap', 'الـ Tap / القدرة', 'وات')], { type: 'سقف' }),
        n('headroom', 'هامش للأمبليفاير', '%', 'حسب المصنع'), n('ampW', 'قدرة الأمبليفاير', 'وات'), n('ampCount', 'الأمبليفايرات المتاحة', '', '—'),
        h('Low Impedance'), n('spkZ', 'معاوقة السماعة', 'أوم'), n('perCh', 'سماعات على القناة'), n('ampMinZ', 'أقل معاوقة للأمبليفاير', 'أوم'),
        n('mics', 'ميكروفونات', '', '—'), n('mixers', 'ميكسر', '', '—'), n('volctl', 'Volume Controls', '', '—'), n('len', 'متوسط الكابل لكل سماعة', 'م')].concat(CABLE), def: { volt: '100', groups: [] } },
    pbx: { label: 'حاسبة السنترال', sys: 'pbx', icon: 'phone', labor: [['device', 'تركيب جهاز'], ['point', 'نقطة تليفون'], ['lump', 'برمجة']],
      form: [ch('type', 'نوع السنترال', ['Analog PBX', 'IP PBX', 'Hybrid']), n('users', 'المستخدمين'), n('co', 'خطوط خارجية'), n('analog', 'تليفونات أنالوج'), n('ip', 'تليفونات IP'),
        n('pbxCount', 'عدد السنترالات', '', '1'), n('pbxCo', 'سعة الخطوط الخارجية', '', '—'), n('pbxExt', 'سعة الداخلي', '', '—'), n('fxo', 'منافذ FXO Gateway', '', '—'), n('fxs', 'منافذ FXS Gateway', '', '—'), n('gsm', 'GSM Gateways', '', '—'), n('len', 'متوسط الكابل للتليفون', 'م')].concat(CABLE),
      def: { type: 'Hybrid' } },
    dish: { label: 'حاسبة الدش الفردي', sys: 'sat', icon: 'dish', labor: [['lump', 'تركيب طبق وضبط'], ['tvpoint', 'نقطة تلفزيون'], ['device', 'برمجة رسيفر']],
      form: [n('dishes', 'عدد الأطباق', '', '1'), n('size', 'قطر الطبق', 'سم'), ch('dtype', 'نوع الطبق', ['Offset', 'Prime Focus']), sg('band', 'الباند', [['Ku', 'Ku'], ['C', 'C-Band']]),
        n('sats', 'عدد الأقمار', '', '1'), ck('motor', 'طبق متحرك (موتور DiSEqC)'), ck('positioner', 'Positioner'), n('receivers', 'الرسيفرات / الشاشات'), n('tuners', 'تيونر لكل رسيفر', '', '1'), ch('rcvType', 'نوع الرسيفر', ['HD', 'Full HD', '4K', 'DVB-S2', 'DVB-S2X', 'Hybrid']),
        n('len', 'كابل لكل رسيفر', 'م'), n('jumper', 'وصلة LNB ← DiSEqC', 'م', '—'), ck('outlets', 'مخرج حائط لكل شاشة')].concat(CABLE), def: { band: 'Ku', dtype: 'Offset' } },
    central: { label: 'حاسبة الدش المركزي', sys: 'sat', icon: 'building', labor: [['tvpoint', 'نقطة تلفزيون'], ['device', 'تركيب ملتي سويتش/مكبر'], ['lump', 'تركيب الأطباق وضبطها']],
      form: [n('floors', 'الأدوار'), n('apts', 'شقق في الدور'), n('ppa', 'نقاط في الشقة', '', '1'), rows('extra', 'نقاط إضافية (بدروم، أمن…)', 'مكان', [tx('name', 'المكان'), n('points', 'النقاط')], {}),
        n('sats', 'عدد الأقمار', '', '1'), ck('terr', 'دخل أرضي في الملتي سويتش'), n('dishes', 'عدد الأطباق', '', '= الأقمار'), n('size', 'قطر الطبق', 'سم', '—'),
        sg('topo', 'التوزيع', [['floor', 'ملتي سويتش في كل دور'], ['central', 'ملتي سويتش في مكان واحد']]), n('msOut', 'مخارج الملتي سويتش'),
        n('riserH', 'ارتفاع الدور', 'م'), n('riserExtra', 'زيادة للـ Trunk', 'م', '—'), n('horiz', 'كابل أفقي للنقطة', 'م'), n('jumper', 'وصلة كاسكيد', 'م', '—'), sg('trunkCable', 'كابل الـ Trunk', [['RG6', 'RG6'], ['RG11', 'RG11']]),
        n('ampEvery', 'مكبر كل كام دور', '', '—'), n('amps', 'أو عدد المكبرات', '', '—'), n('psu', 'باور سبلاي', '', '—'), n('waste', 'هالك الكابل', '%', '—'), n('reel', 'بكرة RG6', 'م', '—'), n('reel11', 'بكرة RG11', 'م', '—')],
      def: { topo: 'floor', trunkCable: 'RG6', extra: [] } },
    matv: { label: 'حاسبة MATV / SMATV', sys: 'sat', icon: 'antenna', labor: [['lump', 'تركيب وضبط الهيد إند'], ['tvpoint', 'نقطة تلفزيون']],
      form: [sg('sys', 'النظام', [['smatv', 'SMATV (أقمار)'], ['matv', 'MATV (أرضي)']]), n('channels', 'القنوات'), n('perMod', 'قنوات لكل Modulator', '', '1'), ck('rcvPerCh', 'رسيفر لكل قناة'), n('amps', 'مكبرات الهيد إند', '', '1'),
        n('outlets', 'المخارج'), n('tapOut', 'مخارج الـ Tap'), n('branches', 'فروع التوزيع', '', '—'), n('splWays', 'Splitter كام طريق', '', '—'), n('trunk', 'كابل الخط الرئيسي', 'م'), n('drop', 'كابل لكل مخرج', 'م'),
        h('فقد الإشارة (اختياري — من بيانات المصنع)'), n('loss.out', 'خرج الهيد إند', 'dBµV'), n('loss.spl', 'فقد الـ Splitter', 'dB', '—'), n('loss.cable', 'فقد الكابل لكل 100 م', 'dB'), n('loss.run', 'طول أبعد مسار', 'م'),
        n('loss.taps', 'Taps على المسار'), n('loss.tapIns', 'Insertion loss للـ Tap', 'dB'), n('loss.tapOff', 'Tap-off loss', 'dB'), n('loss.min', 'أقل مستوى مقبول للمخرج', 'dBµV')].concat(CABLE), def: { sys: 'smatv', loss: {} } },
    lnb: { label: 'حاسبة LNB', sys: 'sat', icon: 'lnb', labor: [['lump', 'تركيب وضبط']],
      form: [n('receivers', 'الرسيفرات'), n('tuners', 'تيونر لكل رسيفر', '', '1'), n('sats', 'الأقمار', '', '1'), sg('band', 'الباند', [['Ku', 'Ku'], ['C', 'C-Band']]), ck('motor', 'طبق متحرك')], def: { band: 'Ku' } },
    tvout: { label: 'حاسبة مخارج التلفزيون', sys: 'sat', icon: 'outlet', labor: [['tvpoint', 'تركيب مخرج']],
      form: [rows('rooms', 'الغرف', 'غرفة', [tx('name', 'الغرفة'), n('outlets', 'المخارج'), sg('type', 'النوع', [['end', 'نهاية'], ['through', 'عبور']])], { type: 'end' }),
        ck('star', 'توزيع بـ Splitter'), n('ways', 'Splitter كام طريق', '', '—'), ck('boxes', 'علبة لكل مخرج'), n('len', 'كابل لكل مخرج', 'م')].concat(CABLE), def: { rooms: [] } },
    dishcable: { label: 'حاسبة كابلات الدش', sys: 'sat', icon: 'cable', labor: [['m', 'سحب كابل (متر)'], ['tvpoint', 'نقطة']],
      form: [n('points', 'النقاط'), n('horiz', 'كابل أفقي للنقطة', 'م'), n('extra', 'زيادة عند كل طرف', 'م', '—'), n('risers', 'خطوط رأسية'), n('riserLen', 'طول الخط الرأسي', 'م'), sg('riserType', 'الرأسي', [['RG6', 'RG6'], ['RG11', 'RG11']]),
        n('jumpers', 'وصلات'), n('jumperLen', 'طول الوصلة', 'م'), ck('useSpl', 'توزيع بـ Splitters'), n('ways', 'Splitter كام طريق', '', '—'), n('joints', 'وصلات كابل (Couplers)', '', '—'),
        n('waste', 'الهالك', '%', '—'), n('reel', 'بكرة RG6', 'م', '—'), n('reel11', 'بكرة RG11', 'م', '—')], def: { riserType: 'RG6' } },
    tvpoint: { label: 'حاسبة تكلفة نقطة التلفزيون', sys: 'sat', icon: 'outlet', labor: [['tvpoint', 'مصنعية تأسيس'], ['tvpoint', 'مصنعية تركيب'], ['tvpoint', 'مصنعية ضبط']],
      form: [sg('ptype', 'نوع النقطة', [['single', 'دش فردي'], ['central', 'دش مركزي'], ['extra', 'نقطة إضافية'], ['found', 'تأسيس فقط'], ['install', 'تركيب وتشغيل'], ['maint', 'صيانة']]), n('points', 'عدد النقاط'),
        h('الكميات لكل نقطة'), n('pp.cable', 'كابل', 'م'), n('pp.pipe', 'ماسورة', 'م'), n('pp.box', 'علبة'), n('pp.outlet', 'مخرج'), n('pp.conn', 'F Connector'), n('pp.fix', 'مستلزمات تثبيت', 'طقم'),
        note('أسعار الخامات بتتحط في «الأجهزة والخامات» بعد «تطبيق الكميات»، والمصنعية تحت — وتكلفة وسعر النقطة بيطلعوا لوحدهم.')], def: { ptype: 'single', pp: {} } },
    alarm: { label: 'حاسبة أنظمة الإنذار', sys: 'alarm', icon: 'bell', labor: [['device', 'تركيب جهاز'], ['m', 'تأسيس (متر)'], ['lump', 'برمجة']],
      form: [sg('type', 'النظام', [['wired', 'سلكي'], ['wireless', 'لاسلكي'], ['hybrid', 'هايبرد']]),
        rows('zones', 'المناطق', 'منطقة', [tx('name', 'المنطقة'), n('pir', 'PIR'), n('mc', 'Magnetic'), n('glass', 'Glass Break'), n('outdoor', 'خارجي'), n('panic', 'طوارئ')], {}),
        sg('zoneMode', 'الزونات', [['sensor', 'زون لكل حساس'], ['row', 'زون لكل منطقة']]), n('panelZones', 'زونات اللوحة'), n('keypads', 'كيباد'), n('sirenIn', 'سارينة داخلية'), n('sirenOut', 'سارينة خارجية'),
        n('remotes', 'ريموت', '', '—'), n('gsm', 'GSM Module', '', '—'), n('ipm', 'IP Module', '', '—'), n('batteries', 'بطاريات', '', '= اللوحات'), n('len', 'متوسط الكابل للجهاز', 'م')].concat(CABLE), def: { type: 'wired', zoneMode: 'sensor', zones: [] } },
    gates: { label: 'حاسبة البوابات', sys: 'gates', icon: 'gate', labor: [['door', 'تركيب بوابة'], ['lump', 'برمجة'], ['lump', 'صيانة']],
      form: [rows('gates', 'البوابات', 'بوابة', [tx('name', 'الاسم'), ch('type', 'النوع', ['Barrier', 'بوابة منزلقة', 'بوابة مفصلية', 'Tripod Turnstile', 'Full Height Turnstile', 'Speed Gate']), n('count', 'العدد'), n('motor', 'موتور'), n('ctrl', 'وحدة تحكم'),
        n('readers', 'قراء'), ch('reader', 'نوع القارئ', ['RFID', 'UHF', 'كارت', 'بصمة', 'ريموت']), n('loops', 'Loop Detectors'), n('photo', 'حساسات'), n('remotes', 'ريموت'), n('len', 'كابل للبوابة', 'م')], { type: 'Barrier', count: '1', motor: '1', ctrl: '1' })].concat(CABLE), def: { gates: [] } },
    smart: { label: 'حاسبة Smart Home', sys: 'smart', icon: 'home2', labor: [['device', 'تركيب جهاز'], ['lump', 'برمجة وربط']],
      form: [ch('protocol', 'البروتوكول', ['Zigbee', 'Z-Wave', 'Wi-Fi', 'Bluetooth', 'KNX']), ck('wired', 'أجهزة سلكية (محتاجة كابل)'),
        rows('rooms', 'الغرف', 'غرفة', [tx('name', 'الغرفة'), n('switches', 'مفاتيح'), n('lights', 'إضاءة'), n('plugs', 'بريز'), n('sensors', 'حساسات'), n('curtains', 'ستائر'), n('locks', 'أقفال'), n('ir', 'IR'), n('thermo', 'ثرموستات')], {}),
        n('hubCap', 'أجهزة لكل Hub', '', 'من الكتالوج'), n('hubs', 'عدد الـ Hubs', '', 'محسوب'), n('lineCap', 'أجهزة في خط KNX', '', 'من المواصفات'), n('len', 'كابل لكل جهاز', 'م', '—')].concat(CABLE), def: { protocol: 'Zigbee', rooms: [] } },
    bms: { label: 'حاسبة BMS', sys: 'bms', icon: 'chip', labor: [['point', 'نقطة'], ['lump', 'برمجة وتكامل']],
      form: [rows('pts', 'النقاط', 'مجموعة نقاط', [tx('name', 'الوصف', 'تكييف الدور الأول'), sg('type', 'النوع', [['DI', 'DI'], ['DO', 'DO'], ['AI', 'AI'], ['AO', 'AO']]), n('count', 'العدد')], { type: 'DI' }),
        n('ctrlCap', 'نقاط لكل Controller'), n('sensors', 'حساسات', '', '—'), n('gateways', 'Gateways', '', '—'), n('panels', 'لوحات تحكم', '', '—'), n('modules', 'Modules', '', '—'), n('len', 'كابل لكل نقطة', 'م', '—')].concat(CABLE), def: { pts: [] } },
    attendance: { label: 'حاسبة الحضور والانصراف', sys: 'attendance', icon: 'finger', labor: [['device', 'تركيب جهاز'], ['lump', 'إعداد النظام']],
      form: [ch('tech', 'النوع', ['بصمة', 'وجه', 'كارت RFID']), n('devices', 'الأجهزة'), n('users', 'المستخدمين (تقديري)'), n('cap', 'سعة الجهاز (مستخدمين)', '', '—'), n('doors', 'أبواب مربوطة', '', '—'),
        ck('psu', 'باور سبلاي لكل جهاز'), n('licenses', 'رخص برنامج', '', '—'), n('len', 'كابل شبكة للجهاز', 'م')].concat(CABLE), def: { tech: 'بصمة' } },
    nurse: { label: 'حاسبة نداء التمريض', sys: 'nurse', icon: 'nurse', labor: [['device', 'تركيب جهاز'], ['lump', 'برمجة وتشغيل']],
      form: [n('rooms', 'الغرف'), n('beds', 'أسرة في الغرفة', '', '1'), n('baths', 'حمامات في الغرفة', '', '—'), n('masters', 'Master Stations', '', '—'), n('displays', 'Display Units', '', '—'), n('ctrlCap', 'أجهزة لكل Controller', '', '—'), n('len', 'كابل لكل غرفة', 'م')].concat(CABLE), def: {} },
    iptv: { label: 'حاسبة IPTV', sys: 'iptv', icon: 'tv', labor: [['device', 'تركيب جهاز'], ['lump', 'برمجة القنوات والسيرفر']],
      form: [n('screens', 'الشاشات'), n('channels', 'القنوات'), n('br', 'Bitrate القناة', 'Mbps'), n('perEnc', 'قنوات لكل Encoder'), ck('stb', 'STB لكل شاشة'), n('servers', 'سيرفرات', '', '—'), n('licenses', 'رخص', '', '—'), n('len', 'كابل شبكة للشاشة', 'م', '—')].concat(CABLE),
      def: { stb: true } },
    custom: { label: 'نظام مخصص', sys: '', icon: 'plus', labor: [['lump', 'مصنعية']], form: [tx('sysName', 'اسم النظام', 'مثلاً: ستائر كهربا')], def: {} }
  };

  // قايمة «الحاسبات والأدوات» بالترتيب
  var TOOLS = ['cctv', 'storage', 'netpoints', 'cables', 'poe', 'fiber', 'splice', 'rack', 'fire', 'access', 'intercom', 'pa', 'pbx', 'dish', 'central', 'matv', 'lnb', 'tvout', 'dishcable', 'tvpoint', 'alarm', 'gates', 'smart', 'bms', 'attendance', 'nurse', 'iptv'];

  // ---------------- مكتبة الخامات المبدئية (أسماء بس، من غير أسعار) ----------------
  function L(sys, cat, unit, names) { return names.map(function (nm) { return { sys: sys, cat: cat, unit: unit, name: nm }; }); }
  var LIB = [].concat(
    L('cctv', 'device', 'قطعة', ['كاميرا Bullet', 'كاميرا Dome', 'كاميرا Turret', 'كاميرا PTZ', 'كاميرا Fisheye', 'كاميرا Thermal', 'كاميرا IP', 'كاميرا Wi-Fi', 'كاميرا Solar', 'DVR', 'NVR', 'XVR', 'Hybrid NVR', 'هارد ديسك', 'شاشة', 'باور سبلاي مركزي', 'أدابتر كاميرا', 'Joystick / وحدة تحكم']),
    L('cctv', 'acc', 'قطعة', ['وصلة BNC', 'وصلة DC', 'بالون (Video Balun)', 'علبة توصيل كاميرا', 'قاعدة تثبيت كاميرا']),
    L('cctv', 'cable', 'متر', ['كابل كواكس', 'كابل كواكس + باور']),
    L('net', 'cable', 'متر', ['كابل UTP CAT5e', 'كابل UTP CAT6', 'كابل FTP CAT6', 'كابل STP CAT6A', 'كابل CAT7', 'كابل CAT8']),
    L('net', 'acc', 'قطعة', ['RJ45', 'Keystone Jack', 'Faceplate', 'Patch Cord', 'Cable Manager', 'PDU']),
    L('net', 'device', 'قطعة', ['Patch Panel', 'Network Rack', 'Network Cabinet', 'Network Switch', 'PoE Switch', 'Router', 'Access Point', 'Repeater', 'SFP', 'SFP+', 'Media Converter']),
    L('fiber', 'cable', 'متر', ['كابل فايبر Single Mode', 'كابل فايبر Multi Mode', 'Drop Cable FTTH']),
    L('fiber', 'acc', 'قطعة', ['Pigtail', 'Adapter فايبر', 'Fiber Patch Cord', 'جراب لحام (Sleeve)']),
    L('fiber', 'device', 'قطعة', ['ODF', 'Fiber Patch Panel', 'Splitter فايبر', 'Joint Closure', 'FAT', 'FDB']),
    L('fire', 'device', 'قطعة', ['Fire Alarm Panel', 'Addressable Panel', 'كاشف دخان', 'كاشف حرارة', 'Manual Call Point', 'Sounder / Bell', 'Strobe', 'Sounder Strobe', 'Input/Output Module', 'Relay Module', 'Isolator', 'بطارية لوحة حريق']),
    L('fire', 'acc', 'قطعة', ['قاعدة كاشف', 'علبة (Back box)']), L('fire', 'cable', 'متر', ['كابل حريق']),
    L('access', 'device', 'قطعة', ['قارئ كارت RFID', 'قارئ بصمة', 'قارئ وجه', 'قارئ كيباد', 'قفل مغناطيسي', 'Electric Strike', 'Electric Bolt', 'زر خروج', 'Door Contact', 'Access Controller', 'باور سبلاي', 'بطارية احتياطي', 'Emergency Release', 'Door Closer', 'كارت RFID']),
    L('access', 'cable', 'متر', ['كابل تحكم']),
    L('intercom', 'device', 'قطعة', ['Door Station', 'Indoor Monitor', 'سماعة إنتركم', 'Master Station', 'وحدة توزيع إنتركم', 'باور سبلاي إنتركم', 'قفل كهربا']), L('intercom', 'cable', 'متر', ['كابل إنتركم']),
    L('pa', 'device', 'قطعة', ['سماعة سقف', 'سماعة حائط', 'سماعة Horn', 'سماعة خارجي', 'Amplifier', 'ميكسر', 'ميكروفون', 'Volume Control', 'Audio Controller']), L('pa', 'cable', 'متر', ['كابل سماعات']),
    L('pbx', 'device', 'قطعة', ['سنترال', 'تليفون أنالوج', 'تليفون IP', 'FXO Gateway', 'FXS Gateway', 'GSM Gateway']), L('pbx', 'cable', 'متر', ['كابل تليفون']),
    L('sat', 'device', 'قطعة', ['طبق دش', 'طبق C-Band', 'Single LNB', 'Twin LNB', 'Quad LNB', 'Octo LNB', 'Quattro LNB', 'Monoblock LNB', 'C-Band LNB', 'DiSEqC Switch', 'DiSEqC Motor', 'Positioner', 'Actuator', 'رسيفر',
      'Multiswitch', 'Splitter', 'Tap', 'Amplifier', 'Booster', 'Modulator', 'Transmodulator', 'Multiplexer', 'Filter', 'باور سبلاي ملتي سويتش', 'Distribution Cabinet']),
    L('sat', 'acc', 'قطعة', ['F Connector', 'Compression Connector', 'مخرج تلفزيون (TV Outlet)', 'Faceplate تلفزيون', 'Terminator 75 أوم', 'وصلة كابل (Coupler)', 'Dish Mount', 'عمود طبق (Pole)', 'Bracket', 'Clamp', 'حامل شاشة', 'كابل HDMI']),
    L('sat', 'cable', 'متر', ['كابل RG6', 'كابل RG11']),
    L('alarm', 'device', 'قطعة', ['Alarm Panel', 'حساس حركة PIR', 'Magnetic Contact', 'Glass Break', 'حساس خارجي', 'زر طوارئ', 'كيباد', 'سارينة داخلية', 'سارينة خارجية', 'ريموت', 'GSM Module', 'IP Module', 'بطارية']), L('alarm', 'cable', 'متر', ['كابل إنذار']),
    L('gates', 'device', 'قطعة', ['Barrier', 'بوابة منزلقة', 'Tripod Turnstile', 'Full Height Turnstile', 'Speed Gate', 'موتور', 'وحدة تحكم', 'قارئ UHF', 'قارئ RFID', 'Loop Detector', 'حساس (فوتوسل)', 'ريموت', 'UHF Tag']),
    L('smart', 'device', 'قطعة', ['مفتاح ذكي', 'وحدة إضاءة', 'بريزة ذكية', 'حساس', 'موتور ستارة', 'قفل ذكي', 'IR Controller', 'ثرموستات', 'Smart Hub', 'KNX Power Supply', 'KNX IP Interface']), L('smart', 'cable', 'متر', ['كابل KNX Bus']),
    L('bms', 'device', 'قطعة', ['DDC Controller', 'حساس', 'Gateway', 'لوحة تحكم', 'Module']), L('bms', 'cable', 'متر', ['كابل اتصالات/تحكم']),
    L('attendance', 'device', 'قطعة', ['Attendance Device', 'رخصة برنامج']),
    L('nurse', 'device', 'قطعة', ['Patient Station', 'Bathroom Pull Cord', 'Corridor Light', 'Master Station', 'Display Unit', 'Controller نداء تمريض']), L('nurse', 'cable', 'متر', ['كابل نداء تمريض']),
    L('iptv', 'device', 'قطعة', ['IPTV Server / Middleware', 'Encoder', 'Decoder', 'رسيفر IPTV', 'رخصة IPTV']),
    L('', 'mat', 'متر', ['ماسورة PVC', 'ترنك', 'تراي كابلات', 'خرطوم']), L('', 'acc', 'قطعة', ['علبة', 'مستلزمات تثبيت', 'رباط كابلات', 'مسامير وخوابير'])
  );
  var UNITS = ['قطعة', 'جهاز', 'نقطة', 'متر', 'متر طولي', 'بكرة', 'علبة', 'كرتونة', 'مجموعة', 'طقم', 'رخصة', 'ساعة', 'يومية', 'مقطوعية'];
  var CATS = { device: 'أجهزة', mat: 'خامات', cable: 'كابلات', acc: 'مستلزمات وإكسسوارات' };
  var LABOR_NAMES = ['توريد وتركيب', 'تأسيس فقط', 'تركيب فقط', 'برمجة فقط', 'اختبار وتشغيل', 'صيانة', 'تأسيس', 'تركيب', 'برمجة', 'تشغيل وتسليم', 'سحب كابلات', 'ضبط'];
  var COST_SUG = { mat: ['أجهزة', 'كابلات', 'مستلزمات'], labor: ['يومية فني', 'يومية مساعد', 'يومية عامل'], transport: ['نقل', 'مواصلات'], expense: ['مصروفات', 'إيجار معدات', 'سلم/سقالة'], waste: ['هالك كابل', 'هالك مستلزمات'], other: ['مصاريف أخرى'] };
  var COST_UNITS = { mat: ['قطعة', 'متر', 'بكرة'], labor: ['يوم', 'ساعة'], transport: ['مشوار'], expense: ['مرة', 'يوم'], waste: ['متر', 'قطعة'], other: ['مرة'] };
  var MAINT_TYPES = ['صيانة وقائية', 'إصلاح عطل', 'استبدال جهاز', 'برمجة', 'زيارة ضمان', 'تركيب إضافي'];
  root.LowCatalog = { SYSTEMS: SYSTEMS, KINDS: KINDS, TOOLS: TOOLS, LIB: LIB, UNITS: UNITS, CATS: CATS, LABOR_NAMES: LABOR_NAMES, COST_SUG: COST_SUG, COST_UNITS: COST_UNITS, MAINT_TYPES: MAINT_TYPES, TECH: TECH,
    sys: function (id) { return SYSTEMS.find(function (s) { return s.id === id; }) || null; } };
})(typeof window !== 'undefined' ? window : this);
