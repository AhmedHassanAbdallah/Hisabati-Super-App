/* =========================================================
   حساباتي السباكة - calc.js
   الحاسبات: النقاط، الحمام، المطبخ، المواسير والشبكات (مع الهالك
   وطول العود والوصلات)، القطع والأدوات الصحية، الطلمبات والخزانات،
   الحفر بالمتر المكعب، اليومية، الصيانة، وتحويل العملات (مرجعي).
   كل حاسبة تقدر تضيف نتيجتها كبنود في مقايسة أو فاتورة.
   © 2026 أحمد حسن عبدالله - جميع الحقوق محفوظة.
   ========================================================= */
const CALC_TABS = { points: 'النقاط', bath: 'الحمام', kitchen: 'المطبخ', pipes: 'المواسير والشبكات', items: 'القطع والأدوات', tanks: 'الطلمبات والخزانات', dig: 'الحفر', daily: 'اليومية', maint: 'الصيانة', fx: 'العملات' };
let calcTab = 'points';
const CALC_ROWS = {
  'points.rows': () => ({ name: '', conn: 'fixture', qty: 1, price: 0 }),
  'pipes.segs': () => ({ part: 'خط رئيسي', pipeType: 'PPR', size: '', len: 0, lines: 1, waste: 0, price: 0, labor: 0, bar: 0 }),
  'pipes.fits': () => ({ name: 'كوع', size: '', qty: 0, price: 0 }),
  'items.rows': () => ({ name: '', qty: 1, buy: 0, sell: 0, install: 0, client: false }),
  'tanks.rows': () => ({ type: 'طلمبة رفع مياه', brand: '', model: '', power: '', qty: 1, buy: 0, sell: 0, install: 0 }),
  'maint.parts': () => ({ name: '', qty: 1, buy: 0, sell: 0 })
};
const calcState = {
  points: { space: '', pipeType: '', size: '', incMat: false, incLabor: true, rows: [CALC_ROWS['points.rows']()] },
  bath: { name: 'حمام 1', basins: 1, toilets: 1, shattafs: 1, showers: 1, heaters: 0, drains: 1, valves: 0, washers: 0, extra: 0, mode: 'whole', whole: 0, feed: 0, drain: 0, finish: 0, fixtures: 0, test: 0, incMat: false },
  kitchen: { name: 'المطبخ', sink: 1, mixer: 1, dishwasher: 0, washer: 0, filter: 0, feedPts: 0, drainPts: 0, valves: 0, mode: 'whole', whole: 0, pSink: 0, pMixer: 0, pDish: 0, pWasher: 0, pFilter: 0, pFeed: 0, pDrain: 0, pValve: 0, incMat: false },
  pipes: { netName: '', netType: NET_TYPES[0], space: '', segs: [CALC_ROWS['pipes.segs']()], fits: [] },
  items: { rows: [CALC_ROWS['items.rows']()] },
  tanks: { rows: [CALC_ROWS['tanks.rows']()], people: 0, lpd: 150, days: 1 },
  dig: { len: 0, wid: 0, dep: 0, price: 0, fill: 0, dewater: 0, haul: 0 },
  daily: { plumbers: 1, wage: 0, helpers: 0, helperWage: 0, days: 1, overtime: 0, advances: 0, deductions: 0 },
  maint: { visitType: 'زيارة كشف', fee: 0, labor: 0, parts: [] },
  fx: { amount: 0, code: 'USD', dir: 'toBase' }
};
const BATH_COUNTS = [['basins', 'أحواض'], ['toilets', 'قواعد'], ['shattafs', 'شطافات'], ['showers', 'دش'], ['heaters', 'سخانات'], ['drains', 'صفايات'], ['valves', 'محابس'], ['washers', 'نقاط غسالة'], ['extra', 'نقاط إضافية']];
const BATH_STAGES = [['feed', 'تأسيس التغذية'], ['drain', 'تأسيس الصرف'], ['finish', 'التشطيب'], ['fixtures', 'تركيب الأدوات الصحية'], ['test', 'الاختبارات']];
// عناصر المطبخ: [مفتاح العدد، الاسم، مفتاح السعر، طريقة الحساب، نوع التوصيلة]
const KITCHEN_ITEMS = [
  ['sink', 'تركيب حوض مطبخ', 'pSink', 'piece', ''], ['mixer', 'تركيب خلاط مطبخ', 'pMixer', 'piece', ''], ['dishwasher', 'نقطة غسالة أطباق', 'pDish', 'point', 'fixture'],
  ['washer', 'نقطة غسالة ملابس', 'pWasher', 'point', 'fixture'], ['filter', 'نقطة فلتر مياه', 'pFilter', 'point', 'fixture'], ['feedPts', 'نقطة تغذية', 'pFeed', 'point', 'cold'],
  ['drainPts', 'نقطة صرف', 'pDrain', 'point', 'drain'], ['valves', 'تركيب محبس تغذية', 'pValve', 'piece', '']
];

// حسابات نقية (مستخدمة في الاختبارات أيضاً)
const CALC = {
  // إجمالي النقاط = عدد النقاط × سعر النقطة
  points(s) { const r = { count: 0, total: 0 }; s.rows.forEach(x => { r.count += n0(x.qty); r.total += n0(x.qty) * n0(x.price); }); r.total = round2(r.total); return r; },
  bath(s) {
    const r = { count: BATH_COUNTS.reduce((a, [k]) => a + n0(s[k]), 0) };
    r.rough = round2(n0(s.feed) + n0(s.drain));
    r.staged = round2(BATH_STAGES.reduce((a, [k]) => a + n0(s[k]), 0));
    r.total = s.mode === 'stages' ? r.staged : round2(s.whole);
    return r;
  },
  kitchen(s) {
    const r = { detail: 0 };
    KITCHEN_ITEMS.forEach(([c, , p]) => { r.detail += n0(s[c]) * n0(s[p]); });
    r.detail = round2(r.detail);
    r.total = s.mode === 'detail' ? r.detail : round2(s.whole);
    return r;
  },
  // الكمية المطلوبة = الطول الصافي + نسبة الهالك — التكلفة = الكمية المطلوبة × سعر المتر
  pipeSeg(g) {
    const net = round3(n0(g.len) * (n0(g.lines) || 1));
    const required = round3(net * (1 + n0(g.waste) / 100));
    const bars = n0(g.bar) > 0 ? Math.ceil(required / g.bar - 1e-9) : 0;
    const r = { net, required, bars, buyLen: bars ? round3(bars * g.bar) : required, material: round2(required * n0(g.price)), labor: round2(net * n0(g.labor)) };
    r.buyCost = round2(r.buyLen * n0(g.price));
    r.total = round2(r.material + r.labor);
    return r;
  },
  pipes(s) {
    const r = { net: 0, required: 0, material: 0, labor: 0, fittings: 0, fitCount: 0 };
    s.segs.forEach(g => { const x = CALC.pipeSeg(g); r.net += x.net; r.required += x.required; r.material += x.material; r.labor += x.labor; });
    // الوصلات بتتحصر يدوي من المخطط — مش بتتستنتج من طول الماسورة
    s.fits.forEach(f => { r.fittings += n0(f.qty) * n0(f.price); r.fitCount += n0(f.qty); });
    ['net', 'required'].forEach(k => { r[k] = round3(r[k]); });
    ['material', 'labor', 'fittings'].forEach(k => { r[k] = round2(r[k]); });
    r.total = round2(r.material + r.labor + r.fittings);
    return r;
  },
  // توريد وتركيب: سعر الشراء منفصل عن سعر البيع وعن مصنعية التركيب
  items(s) {
    const r = { sales: 0, cost: 0, install: 0 };
    s.rows.forEach(x => { const q = n0(x.qty); if (!x.client) { r.sales += q * n0(x.sell); r.cost += q * n0(x.buy); } r.install += q * n0(x.install); });
    r.sales = round2(r.sales); r.cost = round2(r.cost); r.install = round2(r.install);
    r.profit = round2(r.sales - r.cost);
    r.total = round2(r.sales + r.install);
    return r;
  },
  // الحفر: الطول × العرض × العمق = الحجم بالمتر المكعب
  dig(s) {
    const r = { volume: round3(n0(s.len) * n0(s.wid) * n0(s.dep)) };
    r.excavation = round2(r.volume * n0(s.price));
    r.backfill = round2(r.volume * n0(s.fill));
    r.total = round2(r.excavation + r.backfill + n0(s.dewater) + n0(s.haul));
    return r;
  },
  // الإجمالي = اليومية × أيام العمل (× عدد العمال) + الإضافي - السلف - الخصومات
  daily(s) {
    const r = { plumbers: round2(n0(s.plumbers) * n0(s.wage) * n0(s.days)), helpers: round2(n0(s.helpers) * n0(s.helperWage) * n0(s.days)) };
    r.gross = round2(r.plumbers + r.helpers);
    r.total = round2(r.gross + n0(s.overtime) - n0(s.advances) - n0(s.deductions));
    return r;
  },
  // رسوم الزيارة منفصلة عن مصنعية الإصلاح وعن قطع الغيار
  maint(s) {
    const r = { fee: round2(s.fee), labor: round2(s.labor), parts: 0, cost: 0 };
    s.parts.forEach(x => { r.parts += n0(x.qty) * n0(x.sell); r.cost += n0(x.qty) * n0(x.buy); });
    r.parts = round2(r.parts); r.cost = round2(r.cost);
    r.total = round2(r.fee + r.labor + r.parts);
    return r;
  },
  // مرجع فقط: احتياج المياه التقريبي للخزان
  tankRef(people, lpd, days) { return Math.round(n0(people) * n0(lpd) * (n0(days) || 1)); }
};

/* ---------- عناصر الإدخال ---------- */
function cNum(tab, key, label, opts = {}) {
  const v = calcState[tab][key];
  return `<div class="field"><label for="c_${tab}_${key}">${label}</label><input type="number" inputmode="decimal" min="0" step="any" id="c_${tab}_${key}" data-ck="${tab}.${key}" value="${v || ''}" placeholder="${opts.ph || '0'}"></div>`;
}
function cTxt(tab, key, label, ph = '', list = '') {
  return `<div class="field"><label for="c_${tab}_${key}">${label}</label><input type="text" id="c_${tab}_${key}" data-ckt="${tab}.${key}" value="${esc(calcState[tab][key])}" placeholder="${ph}"${list ? ` list="${list}"` : ''}></div>`;
}
function cSel(tab, key, label, options) {
  return `<div class="field"><label for="c_${tab}_${key}">${label}</label><select id="c_${tab}_${key}" data-cks="${tab}.${key}">${options.map(o => Array.isArray(o) ? opt(o[0], o[1], calcState[tab][key]) : opt(o, o, calcState[tab][key])).join('')}</select></div>`;
}
function cSeg(tab, key, options) {
  return `<div class="segmented" style="margin:0 0 12px" data-cseg="${tab}.${key}">${options.map(([v, l]) => `<button type="button" data-v="${esc(v)}" class="${calcState[tab][key] === v ? 'on' : ''}">${esc(l)}</button>`).join('')}</div>`;
}
function cChk(tab, key, label) { return `<label class="switch" style="padding-top:0;margin-bottom:12px"><span>${label}</span><input type="checkbox" data-ckb="${tab}.${key}"${calcState[tab][key] ? ' checked' : ''}></label>`; }
// خانات صفوف القوائم (نقاط، خطوط، وصلات، قطع...)
function rIn(path, i, field, ph, text, list) {
  const [tab, key] = path.split('.');
  const v = calcState[tab][key][i][field];
  // كل خانة فوقها اسمها (علشان الأرقام تفضل مفهومة بعد الكتابة)
  return `<label class="mini-f"><span>${ph}</span><input type="${text ? 'text' : 'number'}"${text ? '' : ' inputmode="decimal" min="0" step="any"'} data-cr="${path}.${i}.${field}"${text ? ' data-t="1"' : ''} value="${text ? esc(v) : (v || '')}" placeholder="${text ? '' : '0'}"${list ? ` list="${list}"` : ''}></label>`;
}
function rSel(path, i, field, options, label) {
  const [tab, key] = path.split('.');
  return `<label class="mini-f"><span>${label}</span><select data-crs="${path}.${i}.${field}">${options.map(o => Array.isArray(o) ? opt(o[0], o[1], calcState[tab][key][i][field]) : opt(o, o, calcState[tab][key][i][field])).join('')}</select></label>`;
}
const rDel = (path, i) => `<button type="button" class="btn btn-danger btn-icon" data-crdel="${path}.${i}" aria-label="حذف">${icon('x')}</button>`;
const rAdd = (path, label) => `<button type="button" class="btn btn-soft btn-sm" style="width:100%;margin-bottom:12px" data-cradd="${path}">${icon('plus')} ${label}</button>`;
const rowBox = inner => `<div class="calc-row">${inner}</div>`;
const g2 = (a, b) => `<div class="row-2" style="margin-bottom:8px">${a}${b}</div>`;
const g3 = (a, b, c) => `<div class="row-2" style="grid-template-columns:repeat(3,minmax(0,1fr));margin-bottom:8px">${a}${b}${c}</div>`;
const resRow = (label, v) => rowHTML(label, money(v));

function calcBody(tab) {
  const s = calcState[tab];
  if (tab === 'points') return `
    <div class="link-box" style="margin-bottom:12px"><span class="l-ic">${icon('droplet')}</span><div class="l-txt"><b>تعريف النقطة: ${esc(POINT_DEFS[pointDef()].label)}</b><span>${esc(POINT_DEFS[pointDef()].desc)}</span></div>
      <button type="button" class="btn btn-soft btn-sm" onclick="openPage('pointsCfg')">تغيير</button></div>
    ${cTxt('points', 'space', 'المكان (اختياري)', 'مثال: حمام رئيسي', 'spaceList')}
    <div class="row-2">${cSel('points', 'pipeType', 'نوع المواسير', [['', '— غير محدد —']].concat(PIPE_TYPES.map(p => [p, p])))}${cTxt('points', 'size', 'المقاس', 'مثال: 20 مم', 'pipeSizes')}</div>
    ${cChk('points', 'incMat', 'السعر يشمل الخامات')}${cChk('points', 'incLabor', 'السعر يشمل المصنعية')}
    <h4 class="more-h">النقاط</h4>
    ${s.rows.map((x, i) => rowBox(`<div class="row-2" style="grid-template-columns:1fr 40px;margin-bottom:8px">${rIn('points.rows', i, 'name', 'اسم النقطة', true, 'pointNames')}${rDel('points.rows', i)}</div>
      ${g3(rSel('points.rows', i, 'conn', Object.keys(POINT_CONN).map(k => [k, POINT_CONN[k]]), 'نوع الخدمة'), rIn('points.rows', i, 'qty', 'العدد'), rIn('points.rows', i, 'price', 'سعر النقطة'))}`)).join('')}
    ${rAdd('points.rows', 'نقطة تانية')}`;
  if (tab === 'bath') return `
    ${cTxt('bath', 'name', 'اسم الحمام', 'مثال: حمام رئيسي', 'spaceList')}
    <h4 class="more-h">محتويات الحمام</h4>
    <div class="row-2" style="grid-template-columns:repeat(3,minmax(0,1fr))">${BATH_COUNTS.map(([k, l]) => cNum('bath', k, l)).join('')}</div>
    <h4 class="more-h">طريقة التسعير</h4>
    ${cSeg('bath', 'mode', [['whole', 'سعر للحمام بالكامل'], ['stages', 'تسعير كل مرحلة']])}
    ${s.mode === 'whole' ? cNum('bath', 'whole', 'سعر الحمام بالكامل (تأسيس تغذية وصرف + تشطيب + تركيب + اختبار)')
      : `<div class="row-2">${BATH_STAGES.map(([k, l]) => cNum('bath', k, l)).join('')}</div>`}
    ${cChk('bath', 'incMat', 'السعر يشمل الخامات')}`;
  if (tab === 'kitchen') return `
    ${cTxt('kitchen', 'name', 'اسم المطبخ', 'مثال: المطبخ', 'spaceList')}
    ${cSeg('kitchen', 'mode', [['whole', 'مقاولة شاملة'], ['detail', 'حساب تفصيلي']])}
    ${s.mode === 'whole' ? `<div class="row-2" style="grid-template-columns:repeat(3,minmax(0,1fr))">${[['sink', 'حوض'], ['mixer', 'خلاط'], ['dishwasher', 'غسالة أطباق'], ['washer', 'غسالة ملابس'], ['filter', 'فلتر مياه'], ['feedPts', 'نقاط تغذية'], ['drainPts', 'نقاط صرف'], ['valves', 'محابس']].map(([k, l]) => cNum('kitchen', k, l)).join('')}</div>
      ${cNum('kitchen', 'whole', 'سعر المطبخ بالكامل')}`
      : KITCHEN_ITEMS.map(([c, name, p]) => `<div class="row-2">${cNum('kitchen', c, name + ' (العدد)')}${cNum('kitchen', p, 'السعر')}</div>`).join('')}
    ${cChk('kitchen', 'incMat', 'السعر يشمل الخامات')}`;
  if (tab === 'pipes') return `
    <div class="row-2">${cTxt('pipes', 'netName', 'اسم الشبكة', 'مثال: تغذية الدور الأول')}${cSel('pipes', 'netType', 'نوع الشبكة', NET_TYPES)}</div>
    ${cTxt('pipes', 'space', 'المكان (اختياري)', 'مثال: الدور الأول', 'spaceList')}
    <h4 class="more-h">خطوط الشبكة</h4>
    ${s.segs.map((x, i) => { const r = CALC.pipeSeg(x); return rowBox(`
      <div class="row-2" style="grid-template-columns:1fr 1fr 40px;margin-bottom:8px">${rSel('pipes.segs', i, 'part', NET_PARTS, 'جزء الشبكة')}${rSel('pipes.segs', i, 'pipeType', PIPE_TYPES, 'نوع الماسورة')}${rDel('pipes.segs', i)}</div>
      ${g3(rIn('pipes.segs', i, 'size', 'القطر', true, 'pipeSizes'), rIn('pipes.segs', i, 'len', 'الطول (م)'), rIn('pipes.segs', i, 'lines', 'عدد الخطوط'))}
      ${g3(rIn('pipes.segs', i, 'waste', 'هالك %'), rIn('pipes.segs', i, 'price', 'سعر المتر'), rIn('pipes.segs', i, 'labor', 'مصنعية المتر'))}
      ${g2(rIn('pipes.segs', i, 'bar', 'طول العود عند المورد (م)'), `<div class="hint" style="margin:0;align-self:center" data-segres="${i}">${segResText(r)}</div>`)}`); }).join('')}
    ${rAdd('pipes.segs', 'خط / قطر تاني')}
    <h4 class="more-h">القطع والوصلات (حصر يدوي)</h4>
    <div class="note" style="margin-bottom:10px">عدد الوصلات ما ينفعش يتحسب بدقة من طول الماسورة بس — اكتبه من مخطط الشبكة أو من حصر الموقع.</div>
    ${s.fits.map((x, i) => rowBox(`<div class="row-2" style="grid-template-columns:1fr 1fr 40px;margin-bottom:8px">${rIn('pipes.fits', i, 'name', 'القطعة', true, 'fitList')}${rIn('pipes.fits', i, 'size', 'المقاس', true, 'pipeSizes')}${rDel('pipes.fits', i)}</div>
      ${g2(rIn('pipes.fits', i, 'qty', 'العدد'), rIn('pipes.fits', i, 'price', 'سعر الوحدة'))}`)).join('')}
    ${rAdd('pipes.fits', 'قطعة / وصلة')}`;
  if (tab === 'items') return `
    <div class="note" style="margin-bottom:10px">قواعد، أحواض، خلاطات، شطافات، محابس، صفايات، سخانات، سيفونات... سعر الشراء منفصل عن سعر البيع وعن مصنعية التركيب.</div>
    ${s.rows.map((x, i) => rowBox(`<div class="row-2" style="grid-template-columns:1fr 90px 40px;margin-bottom:8px">${rIn('items.rows', i, 'name', 'اسم القطعة', true, 'fixList')}${rIn('items.rows', i, 'qty', 'العدد')}${rDel('items.rows', i)}</div>
      ${g3(rIn('items.rows', i, 'buy', 'سعر الشراء'), rIn('items.rows', i, 'sell', 'سعر البيع'), rIn('items.rows', i, 'install', 'مصنعية التركيب'))}
      <label class="switch" style="padding:0;margin:0"><span>مشتراة من العميل (تركيب فقط)</span><input type="checkbox" data-crb="items.rows.${i}.client"${x.client ? ' checked' : ''}></label>`)).join('')}
    ${rAdd('items.rows', 'قطعة تانية')}`;
  if (tab === 'tanks') return `
    ${s.rows.map((x, i) => rowBox(`<div class="row-2" style="grid-template-columns:1fr 40px;margin-bottom:8px">${rSel('tanks.rows', i, 'type', TANK_PUMP_TYPES, 'النوع')}${rDel('tanks.rows', i)}</div>
      ${g3(rIn('tanks.rows', i, 'brand', 'الماركة', true, 'brandList'), rIn('tanks.rows', i, 'model', 'الموديل', true), rIn('tanks.rows', i, 'power', 'القدرة / السعة', true))}
      ${g2(rIn('tanks.rows', i, 'qty', 'العدد'), rIn('tanks.rows', i, 'buy', 'سعر الشراء'))}
      ${g2(rIn('tanks.rows', i, 'sell', 'سعر البيع'), rIn('tanks.rows', i, 'install', 'مصنعية التركيب'))}`)).join('')}
    ${rAdd('tanks.rows', 'بند تاني (خزان / طلمبة / عوامة / محبس...)')}
    <h4 class="more-h">مرجع تقريبي لسعة الخزان</h4>
    <div class="row-2" style="grid-template-columns:repeat(3,minmax(0,1fr))">${cNum('tanks', 'people', 'عدد الأفراد')}${cNum('tanks', 'lpd', 'لتر/فرد/يوم')}${cNum('tanks', 'days', 'أيام الاحتياطي')}</div>
    <div id="tankRefOut"></div>`;
  if (tab === 'dig') return `
    <div class="row-2" style="grid-template-columns:repeat(3,minmax(0,1fr))">${cNum('dig', 'len', 'الطول (م)')}${cNum('dig', 'wid', 'العرض (م)')}${cNum('dig', 'dep', 'العمق (م)')}</div>
    <div class="row-2">${cNum('dig', 'price', 'سعر متر الحفر المكعب')}${cNum('dig', 'fill', 'سعر متر الردم المكعب')}</div>
    <div class="row-2">${cNum('dig', 'dewater', 'نزح المياه (مبلغ)')}${cNum('dig', 'haul', 'نقل المخلفات (مبلغ)')}</div>`;
  if (tab === 'daily') return `
    <div class="row-2">${cNum('daily', 'plumbers', 'عدد السباكين', { ph: '1' })}${cNum('daily', 'wage', 'يومية السباك')}</div>
    <div class="row-2">${cNum('daily', 'helpers', 'عدد المساعدين')}${cNum('daily', 'helperWage', 'يومية المساعد')}</div>
    <div class="row-2">${cNum('daily', 'days', 'عدد الأيام', { ph: '1' })}${cNum('daily', 'overtime', 'الساعات الإضافية (مبلغ)')}</div>
    <div class="row-2">${cNum('daily', 'advances', 'السلف')}${cNum('daily', 'deductions', 'الخصومات')}</div>`;
  if (tab === 'maint') return `
    ${cSel('maint', 'visitType', 'نوع الزيارة', VISIT_TYPES)}
    <div class="row-2">${cNum('maint', 'fee', 'رسوم الزيارة / الكشف')}${cNum('maint', 'labor', 'مصنعية الإصلاح')}</div>
    <h4 class="more-h">قطع الغيار</h4>
    ${s.parts.map((x, i) => rowBox(`<div class="row-2" style="grid-template-columns:1fr 40px;margin-bottom:8px">${rIn('maint.parts', i, 'name', 'القطعة', true, 'partList')}${rDel('maint.parts', i)}</div>
      ${g3(rIn('maint.parts', i, 'qty', 'العدد'), rIn('maint.parts', i, 'buy', 'سعر الشراء'), rIn('maint.parts', i, 'sell', 'سعر البيع'))}`)).join('')}
    ${rAdd('maint.parts', 'قطعة غيار')}`;
  if (tab === 'fx') {
    const base = currentCurrency();
    const cur = currencyByCode(s.code) || CURRENCIES[0];
    return `
      <div class="warn-box" style="margin:0 0 12px">⚠️ التحويل مرجعي فقط: اكتب سعر الصرف بنفسك (التطبيق شغال بدون إنترنت ومش بيجيب أسعار). تغيير عملة التطبيق ما بيحوّلش المبالغ المسجلة.</div>
      ${cSel('fx', 'code', 'العملة الأجنبية', CURRENCIES.filter(c => c.code !== base.code).map(c => [c.code, `${c.name} (${c.sym})`]))}
      <div class="field"><label for="fxRate">سعر الصرف: 1 ${esc(cur.sym)} = كام ${esc(base.sym)}؟</label><input type="number" inputmode="decimal" min="0" step="any" id="fxRate" value="${settings.rates[s.code] || ''}" placeholder="0"></div>
      ${cSeg('fx', 'dir', [['toBase', `إلى ${base.sym}`], ['fromBase', `من ${base.sym}`]])}
      ${cNum('fx', 'amount', 'المبلغ')}`;
  }
  return '';
}
function segResText(r) {
  return `صافي ${fmtN(r.net)} م · مطلوب ${fmtN(r.required)} م${r.bars ? ` · ${r.bars} عود (${fmtN(r.buyLen)} م)` : ''}`;
}
function calcResultHTML(tab) {
  const s = calcState[tab];
  const total = (label, v) => `<div class="sum-total"><span>${label}</span><strong id="calcTotal">${money(v)}</strong></div>`;
  if (tab === 'points') { const r = CALC.points(s); return `<div class="sum-list">${rowHTML('عدد النقاط', fmtN(r.count) + ' نقطة')}</div>${total('إجمالي النقاط', r.total)}`; }
  if (tab === 'bath') {
    const r = CALC.bath(s);
    return `<div class="sum-list">${rowHTML('عدد الأجهزة والنقاط في الحمام', fmtN(r.count))}${s.mode === 'stages' ? BATH_STAGES.filter(([k]) => s[k]).map(([k, l]) => resRow(l, s[k])).join('') + (r.rough ? rowHTML('قيمة التأسيس (تغذية + صرف)', money(r.rough), 'bold') : '') : ''}</div>${total('إجمالي ' + esc(s.name || 'الحمام'), r.total)}`;
  }
  if (tab === 'kitchen') {
    const r = CALC.kitchen(s);
    return `<div class="sum-list">${s.mode === 'detail' ? KITCHEN_ITEMS.filter(([c, , p]) => s[c] && s[p]).map(([c, name, p]) => resRow(`${name} (${fmtN(s[c])} × ${money(s[p])})`, s[c] * s[p])).join('') : ''}</div>${total('إجمالي ' + esc(s.name || 'المطبخ'), r.total)}`;
  }
  if (tab === 'pipes') {
    const r = CALC.pipes(s);
    return `<div class="sum-list">${rowHTML('الطول الصافي', fmtN(r.net) + ' م')}${rowHTML('الكمية المطلوبة بالهالك', fmtN(r.required) + ' م')}${resRow('تكلفة المواسير', r.material)}${r.labor ? resRow('مصنعية التمديد', r.labor) : ''}${r.fittings ? resRow(`القطع والوصلات (${fmtN(r.fitCount)} قطعة)`, r.fittings) : ''}</div>${total('إجمالي الشبكة', r.total)}`;
  }
  if (tab === 'items' || tab === 'tanks') {
    const r = CALC.items(s);
    return `<div class="sum-list">${resRow('قيمة التوريد (سعر البيع)', r.sales)}${resRow('مصنعية التركيب', r.install)}${rowHTML('تكلفة الشراء', money(r.cost))}${rowHTML('ربح التوريد', money(r.profit), 'bold')}</div>${total('الإجمالي على العميل', r.total)}`;
  }
  if (tab === 'dig') {
    const r = CALC.dig(s);
    return `<div class="sum-list">${rowHTML(`حجم الحفر (${fmtN(s.len)} × ${fmtN(s.wid)} × ${fmtN(s.dep)})`, `<span id="digVol">${fmtN(r.volume)}</span> م³`)}${resRow('الحفر', r.excavation)}${r.backfill ? resRow('الردم', r.backfill) : ''}${s.dewater ? resRow('نزح المياه', s.dewater) : ''}${s.haul ? resRow('نقل المخلفات', s.haul) : ''}</div>${total('إجمالي أعمال الحفر', r.total)}`;
  }
  if (tab === 'daily') {
    const r = CALC.daily(s);
    return `<div class="sum-list">${resRow(`${fmtN(s.plumbers)} سباك × ${money(s.wage)} × ${fmtN(s.days)} يوم`, r.plumbers)}${r.helpers ? resRow(`${fmtN(s.helpers)} مساعد × ${money(s.helperWage)} × ${fmtN(s.days)} يوم`, r.helpers) : ''}${s.overtime ? resRow('الإضافي', s.overtime) : ''}${s.advances ? rowHTML('السلف', '- ' + money(s.advances), 'minus') : ''}${s.deductions ? rowHTML('الخصومات', '- ' + money(s.deductions), 'minus') : ''}</div>${total('صافي اليومية', r.total)}`;
  }
  if (tab === 'maint') {
    const r = CALC.maint(s);
    return `<div class="sum-list">${resRow('رسوم الزيارة', r.fee)}${resRow('مصنعية الإصلاح', r.labor)}${resRow('قطع الغيار', r.parts)}${r.cost ? rowHTML('ربح قطع الغيار', money(r.parts - r.cost)) : ''}</div>${total('إجمالي الصيانة', r.total)}`;
  }
  if (tab === 'fx') {
    const rate = n0(settings.rates[s.code]); const c = currencyByCode(s.code) || {};
    if (!rate) return '<p class="hint">اكتب سعر الصرف الأول.</p>';
    const res = s.dir === 'toBase' ? s.amount * rate : s.amount / rate;
    return `<div class="sum-total"><span>${fmtN(s.amount, 3)} ${esc(s.dir === 'toBase' ? c.sym : CUR)} =</span><strong id="calcTotal">${fmtN(res, 3)} ${esc(s.dir === 'toBase' ? CUR : c.sym)}</strong></div>`;
  }
  return '';
}
function tankRefHTML() {
  const s = calcState.tanks;
  if (!(s.people > 0)) return '<p class="hint" style="margin:0 0 12px">اكتب عدد الأفراد لعرض تقدير مرجعي.</p>';
  const l = CALC.tankRef(s.people, s.lpd, s.days);
  return `<div class="sum-total" style="margin-top:0"><span>احتياج تقريبي</span><strong id="tankRefVal">${l.toLocaleString('en-US')} لتر (${fmtN(l / 1000, 2)} م³)</strong></div>
    <div class="warn-box">⚠️ <b>رقم مرجعي فقط.</b> اختيار سعة الخزان وقدرة الطلمبة (التصرف والرفع) محتاج حسابات هندسية حسب عدد الأدوار والوحدات وأطوال وأقطار المواسير والضغط المطلوب — التطبيق ما بيحددش قدرة طلمبة.</div>`;
}

/* ---------- تحويل نتيجة الحاسبة لبنود ---------- */
function bathNote(s) { return BATH_COUNTS.filter(([k]) => s[k]).map(([k, l]) => `${fmtN(s[k])} ${l}`).join('، '); }
function calcLines(tab) {
  const s = calcState[tab];
  const L = [];
  if (tab === 'points') {
    s.rows.forEach(x => { if (x.name.trim() && x.qty) L.push({ cat: 'points', kind: 'service', name: x.name.trim(), method: 'point', qty: x.qty, price: x.price, conn: x.conn, space: s.space, pipeType: s.pipeType, size: s.size, incMat: s.incMat, incLabor: s.incLabor }); });
  } else if (tab === 'bath') {
    const space = (s.name || '').trim() || 'حمام';
    if (s.mode === 'whole') { if (s.whole) L.push({ cat: 'residential', kind: 'service', name: 'سباكة حمام كاملة (تأسيس وتشطيب)', method: 'bath', qty: 1, price: s.whole, space, note: bathNote(s), incMat: s.incMat }); }
    else BATH_STAGES.forEach(([k, l], i) => { if (s[k]) L.push({ cat: 'residential', kind: 'service', name: l, method: 'lump', price: s[k], space, note: L.length ? '' : bathNote(s), incMat: s.incMat && (k === 'feed' || k === 'drain') }); });
  } else if (tab === 'kitchen') {
    const space = (s.name || '').trim() || 'المطبخ';
    if (s.mode === 'whole') { if (s.whole) L.push({ cat: 'residential', kind: 'service', name: 'سباكة مطبخ كاملة', method: 'kitchen', qty: 1, price: s.whole, space, incMat: s.incMat, note: [['sink', 'حوض'], ['mixer', 'خلاط'], ['dishwasher', 'غسالة أطباق'], ['washer', 'غسالة ملابس'], ['filter', 'فلتر'], ['feedPts', 'نقطة تغذية'], ['drainPts', 'نقطة صرف'], ['valves', 'محبس']].filter(([k]) => s[k]).map(([k, l]) => `${fmtN(s[k])} ${l}`).join('، ') }); }
    else KITCHEN_ITEMS.forEach(([c, name, p, method, conn]) => { if (s[c] && s[p]) L.push({ cat: method === 'point' ? 'points' : 'fixtures', kind: 'service', name, method, qty: s[c], price: s[p], conn, space, incMat: s.incMat && method === 'point' }); });
  } else if (tab === 'pipes') {
    const drain = /صرف/.test(s.netType);
    s.segs.forEach(g => {
      const r = CALC.pipeSeg(g);
      if (!r.net) return;
      const note = [s.netName, g.part, r.bars ? `${r.bars} عود × ${fmtN(g.bar)} م` : ''].filter(Boolean).join(' - ');
      if (g.price) L.push({ cat: 'pipes', kind: 'material', name: 'ماسورة ' + g.pipeType, method: 'meter', qty: r.required, price: g.price, pipeType: g.pipeType, size: g.size, waste: g.waste, space: s.space, note });
      if (g.labor) L.push({ cat: drain ? 'drain' : 'supplynet', kind: 'service', name: 'تمديد ' + g.part, method: 'meter', qty: g.len, mult: g.lines || 1, price: g.labor, pipeType: g.pipeType, size: g.size, space: s.space, note: s.netName });
    });
    s.fits.forEach(f => { if (f.name.trim() && f.qty) L.push({ cat: 'fittings', kind: 'fitting', name: f.name.trim(), method: 'piece', qty: f.qty, price: f.price, size: f.size, space: s.space, note: s.netName }); });
  } else if (tab === 'items') {
    s.rows.forEach(x => { if (x.name.trim() && x.qty) L.push({ cat: 'sanitary', kind: 'fixture', name: x.name.trim(), method: 'supply', qty: x.qty, price: x.sell, cost: x.buy, install: x.install, source: x.client ? 'client' : 'tech' }); });
  } else if (tab === 'tanks') {
    s.rows.forEach(x => { if (x.qty && (x.sell || x.install)) L.push({ cat: 'pumps', kind: 'equipment', name: [x.type, x.brand, x.model].filter(Boolean).join(' '), method: 'supply', qty: x.qty, price: x.sell, cost: x.buy, install: x.install, note: x.power ? 'القدرة / السعة: ' + x.power : '' }); });
  } else if (tab === 'dig') {
    const r = CALC.dig(s);
    if (r.volume && s.price) L.push({ cat: 'external', kind: 'excavation', name: 'حفر', method: 'cubic', len: s.len, wid: s.wid, dep: s.dep, qty: r.volume, price: s.price });
    if (r.volume && s.fill) L.push({ cat: 'external', kind: 'excavation', name: 'ردم', method: 'cubic', len: s.len, wid: s.wid, dep: s.dep, qty: r.volume, price: s.fill });
    if (s.dewater) L.push({ cat: 'external', kind: 'excavation', name: 'نزح مياه', method: 'lump', price: s.dewater });
    if (s.haul) L.push({ cat: 'external', kind: 'excavation', name: 'نقل مخلفات', method: 'lump', price: s.haul });
  } else if (tab === 'daily') {
    if (s.plumbers && s.days && s.wage) L.push({ cat: 'labor', kind: 'labor', name: 'يومية سباك', method: 'daily', qty: s.days, mult: s.plumbers, price: s.wage });
    if (s.helpers && s.days && s.helperWage) L.push({ cat: 'labor', kind: 'labor', name: 'يومية مساعد', method: 'daily', qty: s.days, mult: s.helpers, price: s.helperWage });
    if (s.overtime) L.push({ cat: 'labor', kind: 'labor', name: 'ساعات عمل إضافية', method: 'lump', price: s.overtime });
  } else if (tab === 'maint') {
    if (s.fee) L.push({ cat: 'visits', kind: 'diag', name: s.visitType, method: 'visit', qty: 1, price: s.fee, visitType: s.visitType });
    if (s.labor) L.push({ cat: 'maint', kind: 'service', name: 'مصنعية إصلاح', method: 'job', qty: 1, price: s.labor });
    s.parts.forEach(x => { if (x.name.trim() && x.qty) L.push({ cat: 'maint', kind: 'part', name: x.name.trim(), method: 'piece', qty: x.qty, price: x.sell, cost: x.buy }); });
  }
  return L;
}
const CALC_DOC_TYPE = { points: 'est_rough', bath: 'est_bath', kitchen: 'est_kitchen', pipes: 'est_supply', items: 'supply', tanks: 'supply', dig: 'est_rough', daily: 'invoice', maint: 'maint' };
function calcDocType(tab) { return tab === 'pipes' && /صرف/.test(calcState.pipes.netType) ? 'est_drain' : (CALC_DOC_TYPE[tab] || 'invoice'); }
function calcToDoc(mode) {
  const lines = calcLines(calcTab);
  if (!lines.length) { showAppToast('⚠️ اكتب الأرقام الأول'); return; }
  if (mode === 'current') {
    const d = getCurrentDoc();
    if (!d) return;
    // تنبيه قبل الإضافة لو فيه بنود هتتحسب مرتين
    const warns = [];
    const acc = d.lines.slice();
    lines.forEach(l => { const n = normalizeLine(l); lineDupWarnings(n, acc).forEach(m => { if (!warns.includes(m)) warns.push(m); }); acc.push(n); });
    const go = () => {
      addLinesToCurrentDoc(lines);
      closeEverythingThen(() => { settings.currentDocId = d.id; openEditor('lines'); renderEditor(); showAppToast(`✔️ اتضاف ${lines.length} بند للمستند ${d.number}`); });
    };
    if (warns.length) showAppConfirm('⚠️ ' + warns.slice(0, 4).join('\n') + '\n\nتضيف البنود برضه؟', go); else go();
  } else {
    const type = calcDocType(calcTab);
    closeEverythingThen(() => { createDoc(type, { lines }); openEditor('lines'); renderEditor(); showAppToast(`✔️ ${docTypeInfo(type).label} جديدة بـ ${lines.length} بند`); });
  }
}
PAGES.calc = function () {
  const tab = calcTab;
  const cur = getCurrentDoc();
  const canAdd = tab !== 'fx';
  const dl = (id, list) => `<datalist id="${id}">${list.map(x => `<option value="${esc(x)}">`).join('')}</datalist>`;
  const html = `
    <div class="chips" id="calcTabs">${Object.keys(CALC_TABS).map(k => `<button type="button" class="chip${tab === k ? ' on' : ''}" data-t="${k}">${CALC_TABS[k]}</button>`).join('')}</div>
    <div class="card" id="calcCard">${calcBody(tab)}<div id="calcRes">${calcResultHTML(tab)}</div></div>
    ${dl('pointNames', pointTypes().map(p => p.name))}${dl('fitList', FITTING_NAMES)}${dl('fixList', FIXTURE_NAMES)}${dl('partList', SPARE_PARTS)}
    ${canAdd ? `<div class="stack">
      <button type="button" class="btn btn-accent" onclick="calcToDoc('new')">${icon('plus')} ${docTypeInfo(calcDocType(tab)).label} جديدة بالحساب ده</button>
      ${cur ? `<button type="button" class="btn btn-soft" onclick="calcToDoc('current')">${icon('list')} إضافة للمستند ${esc(cur.number)} (${esc(docTitle(cur))})</button>` : ''}
    </div>` : ''}`;
  return {
    title: 'الحاسبات', sub: CALC_TABS[tab], html,
    after: body => {
      body.querySelector('#calcTabs').onclick = e => { const b = e.target.closest('[data-t]'); if (b) { calcTab = b.dataset.t; refreshPages(); } };
      const res = () => {
        const r = body.querySelector('#calcRes');
        if (r) r.innerHTML = calcResultHTML(tab);
        const tr = body.querySelector('#tankRefOut'); if (tr) tr.innerHTML = tankRefHTML();
        body.querySelectorAll('[data-segres]').forEach(el => { const g = calcState.pipes.segs[+el.dataset.segres]; if (g) el.textContent = segResText(CALC.pipeSeg(g)); });
      };
      const rowRef = path => { const [t, k, i, f] = path.split('.'); return { list: calcState[t][k], i: +i, f, key: t + '.' + k }; };
      body.querySelectorAll('[data-ck]').forEach(inp => { inp.oninput = () => { const [t, k] = inp.dataset.ck.split('.'); calcState[t][k] = pos(parseFloat(inp.value) || 0); res(); }; });
      body.querySelectorAll('[data-ckt]').forEach(inp => { inp.oninput = () => { const [t, k] = inp.dataset.ckt.split('.'); calcState[t][k] = inp.value; res(); }; });
      body.querySelectorAll('[data-cks]').forEach(sel => { sel.onchange = () => { const [t, k] = sel.dataset.cks.split('.'); calcState[t][k] = sel.value; if (t === 'fx' || t === 'pipes') refreshPages(); else res(); }; });
      body.querySelectorAll('[data-ckb]').forEach(cb => { cb.onchange = () => { const [t, k] = cb.dataset.ckb.split('.'); calcState[t][k] = cb.checked; res(); }; });
      body.querySelectorAll('[data-cseg]').forEach(seg => { seg.onclick = e => { const b = e.target.closest('[data-v]'); if (!b) return; const [t, k] = seg.dataset.cseg.split('.'); calcState[t][k] = b.dataset.v; if (t === 'fx') { seg.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); res(); } else refreshPages(); }; });
      body.querySelectorAll('[data-cr]').forEach(inp => {
        inp.oninput = () => { const r = rowRef(inp.dataset.cr); r.list[r.i][r.f] = inp.dataset.t ? inp.value : pos(parseFloat(inp.value) || 0); res(); };
        // اختيار اسم نقطة معروفة يحدد نوع خدمتها تلقائياً
        if (inp.dataset.cr.startsWith('points.rows') && inp.dataset.cr.endsWith('.name')) inp.onchange = () => { const r = rowRef(inp.dataset.cr); const pt = pointTypes().find(p => p.name === inp.value.trim()); r.list[r.i].conn = pt ? pt.conn : connOfName(inp.value); const sel = body.querySelector(`[data-crs="points.rows.${r.i}.conn"]`); if (sel) sel.value = r.list[r.i].conn; };
      });
      body.querySelectorAll('[data-crs]').forEach(sel => { sel.onchange = () => { const r = rowRef(sel.dataset.crs); r.list[r.i][r.f] = sel.value; res(); }; });
      body.querySelectorAll('[data-crb]').forEach(cb => { cb.onchange = () => { const r = rowRef(cb.dataset.crb); r.list[r.i][r.f] = cb.checked; res(); }; });
      body.querySelectorAll('[data-crdel]').forEach(b => { b.onclick = () => { const [t, k, i] = b.dataset.crdel.split('.'); calcState[t][k].splice(+i, 1); if (!calcState[t][k].length && ['points.rows', 'pipes.segs', 'items.rows', 'tanks.rows'].includes(t + '.' + k)) calcState[t][k].push(CALC_ROWS[t + '.' + k]()); refreshPages(); }; });
      body.querySelectorAll('[data-cradd]').forEach(b => { b.onclick = () => { const [t, k] = b.dataset.cradd.split('.'); calcState[t][k].push(CALC_ROWS[b.dataset.cradd]()); refreshPages(); }; });
      const fx = body.querySelector('#fxRate'); if (fx) fx.oninput = () => { settings.rates[calcState.fx.code] = pos(parseFloat(fx.value) || 0); saveSettings(); res(); };
      res();
    }
  };
};
