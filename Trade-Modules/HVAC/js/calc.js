/* =========================================================
   حساباتي HVAC - calc.js
   الحاسبات المتخصصة: التركيب، الصيانة، الفريون، النحاس، قطع الغيار،
   اليومية، مرجع قدرات الأجهزة، وتحويل العملات (مرجعي فقط).
   كل حاسبة تقدر تضيف نتيجتها كبنود في فاتورة.
   © 2026 أحمد حسن عبدالله - جميع الحقوق محفوظة.
   ========================================================= */
const CALC_TABS = { install: 'التركيب', maint: 'الصيانة', refrig: 'الفريون', copper: 'النحاس', parts: 'قطع الغيار', daily: 'اليومية', capacity: 'قدرة الجهاز', fx: 'العملات' };
let calcTab = 'install';
const calcState = {
  install: { type: 'تركيب تكييف سبليت', capacity: '', count: 1, price: 0, copperLen: 0, copperLines: 1, copperPrice: 0, insPrice: 0, drainLen: 0, drainPrice: 0, cableLen: 0, cablePrice: 0, brackets: 0, bracketPrice: 0, extraMat: 0, transport: 0, workers: 0, days: 0, wage: 0 },
  maint: { type: 'صيانة دورية', count: 1, price: 0, visits: 1, parts: 0, extra: 0 },
  refrig: { gas: 'R410A', qty: 0, qUnit: 'كجم', price: 0, pUnit: 'كجم', labor: 0, cost: 0 },
  copper: { size: '3/8"', len: 0, lines: 1, price: 0, ins: 0, labor: 0 },
  parts: { rows: [{ name: '', qty: 1, buy: 0, sell: 0, labor: 0 }] },
  daily: { workers: 1, wage: 0, days: 1, overtime: 0, deductions: 0, advances: 0 },
  capacity: { value: 12000, unit: 'BTU/h', area: 0, height: 3, insul: 'avg', sun: 'med', people: 2, kitchen: false },
  fx: { amount: 0, code: 'USD', dir: 'toBase' }
};
// حسابات نقية (مستخدمة في الاختبارات أيضاً)
const CALC = {
  install(s) {
    const r = {};
    r.install = round2(s.count * s.price);
    r.copper = round2(s.copperLen * (s.copperLines || 1) * s.copperPrice);
    r.insulation = round2(s.copperLen * (s.copperLines || 1) * s.insPrice);
    r.drain = round2(s.drainLen * s.drainPrice);
    r.cable = round2(s.cableLen * s.cablePrice);
    r.brackets = round2(s.brackets * s.bracketPrice);
    r.extra = round2(s.extraMat);
    r.transport = round2(s.transport);
    r.labor = round2(s.workers * s.days * s.wage);
    r.total = round2(r.install + r.copper + r.insulation + r.drain + r.cable + r.brackets + r.extra + r.transport + r.labor);
    return r;
  },
  maint(s) { const r = { service: round2(s.count * s.price * (s.visits || 1)), parts: round2(s.parts), extra: round2(s.extra) }; r.total = round2(r.service + r.parts + r.extra); return r; },
  refrig(s) {
    const qKg = s.qUnit === 'جم' ? s.qty / 1000 : s.qty;
    const pKg = s.pUnit === 'جم' ? s.price * 1000 : s.price;
    const r = { gas: round2(qKg * pKg), labor: round2(s.labor), qtyKg: qKg, cost: round2(qKg * (s.pUnit === 'جم' ? s.cost * 1000 : s.cost)) };
    r.total = round2(r.gas + r.labor);
    return r;
  },
  copper(s) {
    const meters = s.len * (s.lines || 1);
    const r = { meters, pipe: round2(meters * s.price), insulation: round2(meters * s.ins), labor: round2(s.len * s.labor) };
    r.total = round2(r.pipe + r.insulation + r.labor);
    return r;
  },
  parts(s) {
    const r = { sales: 0, cost: 0, labor: 0 };
    s.rows.forEach(x => { r.sales += x.qty * x.sell; r.cost += x.qty * x.buy; r.labor += x.labor; });
    r.sales = round2(r.sales); r.cost = round2(r.cost); r.labor = round2(r.labor);
    r.profit = round2(r.sales - r.cost);
    r.total = round2(r.sales + r.labor);
    return r;
  },
  // الإجمالي = اليومية × عدد الأيام (× عدد الفنيين) + الإضافي - الخصومات والسلف
  daily(s) { const r = { gross: round2(s.workers * s.wage * s.days) }; r.total = round2(r.gross + s.overtime - s.deductions - s.advances); return r; },
  capacity(value, unit) {
    const v = Number(value) || 0;
    const btu = unit === 'BTU/h' ? v : unit === 'طن تبريد (TR)' ? v * 12000 : unit === 'kW' ? v / 0.00029307107 : v * 9000; // الحصان التجاري المرجعي ≈ 9000 BTU/h
    return { btu, tr: btu / 12000, kw: btu * 0.00029307107, hpMarket: btu / 9000, hpMech: btu / 2544.43 };
  },
  estimate(s) {
    if (!(s.area > 0)) return null;
    const vol = s.area * (s.height || 3);
    let btu = vol * 230;
    btu *= { good: 0.9, avg: 1, poor: 1.15 }[s.insul] || 1;
    btu *= { low: 0.95, med: 1, high: 1.15 }[s.sun] || 1;
    btu += Math.max(0, (s.people || 0) - 2) * 600;
    if (s.kitchen) btu += 4000;
    return { low: btu * 0.85, mid: btu, high: btu * 1.15 };
  }
};
const STD_SIZES = [9000, 12000, 18000, 24000, 30000, 36000, 48000, 60000];
const MARKET_TABLE = [['1 حصان', 9000], ['1.5 حصان', 12000], ['2.25 حصان', 18000], ['3 حصان', 24000], ['4 حصان', 30000], ['5 حصان', 36000]];

function cNum(tab, key, label, opts = {}) {
  const v = calcState[tab][key];
  return `<div class="field"><label for="c_${tab}_${key}">${label}</label><input type="number" inputmode="decimal" min="0" step="any" id="c_${tab}_${key}" data-ck="${tab}.${key}" value="${v || v === 0 && opts.zero ? v : (v || '')}" placeholder="${opts.ph || '0'}"></div>`;
}
function cSel(tab, key, label, options) {
  return `<div class="field"><label for="c_${tab}_${key}">${label}</label><select id="c_${tab}_${key}" data-cks="${tab}.${key}">${options.map(o => Array.isArray(o) ? opt(o[0], o[1], calcState[tab][key]) : opt(o, o, calcState[tab][key])).join('')}</select></div>`;
}
function cSeg(tab, key, options) {
  return `<div class="segmented" style="margin:0 0 12px" data-cseg="${tab}.${key}">${options.map(([v, l]) => `<button type="button" data-v="${esc(v)}" class="${calcState[tab][key] === v ? 'on' : ''}">${esc(l)}</button>`).join('')}</div>`;
}
const resRow = (label, v) => rowHTML(label, money(v));

function calcBody(tab) {
  const s = calcState[tab];
  if (tab === 'install') return `
    ${cSel('install', 'type', 'نوع الجهاز / التركيب', WORK_CATS.install.items.filter(i => i[2] === 'service' && i[1] !== 'meter').slice(0, 9).map(i => i[0]))}
    <div class="row-2"><div class="field"><label for="c_install_capacity">قدرة الجهاز</label><input type="text" id="c_install_capacity" data-ckt="install.capacity" value="${esc(s.capacity)}" placeholder="مثال: 1.5 حصان"></div>${cNum('install', 'count', 'عدد الأجهزة', { ph: '1' })}</div>
    ${cNum('install', 'price', 'سعر تركيب الجهاز الواحد')}
    <h4 class="more-h">مواسير النحاس والعزل</h4>
    <div class="row-2">${cNum('install', 'copperLen', 'طول النحاس (متر)')}${cNum('install', 'copperLines', 'عدد الخطوط', { ph: '1' })}</div>
    <div class="row-2">${cNum('install', 'copperPrice', 'سعر متر النحاس')}${cNum('install', 'insPrice', 'سعر متر العزل')}</div>
    <h4 class="more-h">الصرف والكابلات والحوامل</h4>
    <div class="row-2">${cNum('install', 'drainLen', 'طول الصرف (متر)')}${cNum('install', 'drainPrice', 'سعر متر الصرف')}</div>
    <div class="row-2">${cNum('install', 'cableLen', 'طول الكابل (متر)')}${cNum('install', 'cablePrice', 'سعر متر الكابل')}</div>
    <div class="row-2">${cNum('install', 'brackets', 'عدد الحوامل')}${cNum('install', 'bracketPrice', 'سعر الحامل')}</div>
    <h4 class="more-h">خامات إضافية ونقل وعمالة</h4>
    <div class="row-2">${cNum('install', 'extraMat', 'خامات إضافية (مبلغ)')}${cNum('install', 'transport', 'النقل')}</div>
    <div class="row-2">${cNum('install', 'workers', 'عدد العمال')}${cNum('install', 'days', 'عدد الأيام')}</div>
    ${cNum('install', 'wage', 'اليومية')}`;
  if (tab === 'maint') return `
    ${cSel('maint', 'type', 'نوع الصيانة', WORK_CATS.maint.items.map(i => i[0]))}
    <div class="row-2">${cNum('maint', 'count', 'عدد الأجهزة', { ph: '1' })}${cNum('maint', 'price', 'سعر الصيانة لكل جهاز')}</div>
    <div class="row-2">${cNum('maint', 'visits', 'عدد الزيارات', { ph: '1' })}${cNum('maint', 'parts', 'تكلفة قطع الغيار')}</div>
    ${cNum('maint', 'extra', 'مصروفات إضافية')}`;
  if (tab === 'refrig') return `
    ${cSel('refrig', 'gas', 'نوع الغاز', REFRIGERANTS)}
    <div class="row-2">${cNum('refrig', 'qty', 'الكمية')}<div class="field"><label>وحدة الكمية</label>${cSeg('refrig', 'qUnit', [['كجم', 'كجم'], ['جم', 'جرام']])}</div></div>
    <div class="row-2">${cNum('refrig', 'price', 'السعر')}<div class="field"><label>السعر لكل</label>${cSeg('refrig', 'pUnit', [['كجم', 'كيلو'], ['جم', 'جرام']])}</div></div>
    <div class="row-2">${cNum('refrig', 'labor', 'تكلفة الخدمة / المصنعية')}${cNum('refrig', 'cost', 'تكلفة الغاز عليك (للربح)')}</div>
    <div class="warn-box" style="margin:0 0 12px">⚠️ لا تفترض كمية شحن ثابتة حسب حجم الجهاز. الشحنة الصحيحة حسب بيانات الشركة المصنعة ولوحة بيانات الجهاز والإجراء الفني المناسب (وزن/ضغوط/Superheat/Subcooling).</div>`;
  if (tab === 'copper') return `
    <div class="field"><label for="c_copper_size">مقاس الماسورة</label><input type="text" id="c_copper_size" list="pipeSizes" data-ckt="copper.size" value="${esc(s.size)}"></div>
    <div class="row-2">${cNum('copper', 'len', 'طول الماسورة (متر)')}${cNum('copper', 'lines', 'عدد الخطوط', { ph: '1' })}</div>
    <div class="row-2">${cNum('copper', 'price', 'سعر المتر')}${cNum('copper', 'ins', 'تكلفة عزل المتر')}</div>
    ${cNum('copper', 'labor', 'تكلفة تركيب المتر (مصنعية)')}
    <p class="hint" style="margin:-6px 0 12px">النحاس والعزل = الطول × عدد الخطوط × السعر · المصنعية = الطول × سعر التركيب.</p>`;
  if (tab === 'parts') return `
    <div id="cpRows">${s.rows.map((r, i) => `
      <div class="card" style="padding:12px;margin-bottom:10px">
        <div class="extra-row" style="grid-template-columns:1fr 40px"><input type="text" data-cp="${i}.name" value="${esc(r.name)}" placeholder="اسم القطعة"><button type="button" class="btn btn-danger btn-icon" data-cpdel="${i}" aria-label="حذف">${icon('x')}</button></div>
        <div class="row-2"><div class="field"><label>العدد</label><input type="number" inputmode="decimal" min="0" step="any" data-cp="${i}.qty" value="${r.qty || ''}"></div><div class="field"><label>مصنعية التركيب</label><input type="number" inputmode="decimal" min="0" step="any" data-cp="${i}.labor" value="${r.labor || ''}"></div></div>
        <div class="row-2"><div class="field" style="margin:0"><label>سعر الشراء</label><input type="number" inputmode="decimal" min="0" step="any" data-cp="${i}.buy" value="${r.buy || ''}"></div><div class="field" style="margin:0"><label>سعر البيع</label><input type="number" inputmode="decimal" min="0" step="any" data-cp="${i}.sell" value="${r.sell || ''}"></div></div>
      </div>`).join('')}</div>
    <button type="button" class="btn btn-soft btn-sm" style="width:100%;margin-bottom:12px" id="cpAdd">${icon('plus')} قطعة أخرى</button>`;
  if (tab === 'daily') return `
    <div class="row-2">${cNum('daily', 'workers', 'عدد الفنيين', { ph: '1' })}${cNum('daily', 'wage', 'اليومية')}</div>
    <div class="row-2">${cNum('daily', 'days', 'عدد الأيام', { ph: '1' })}${cNum('daily', 'overtime', 'الإضافي')}</div>
    <div class="row-2">${cNum('daily', 'deductions', 'الخصومات')}${cNum('daily', 'advances', 'السلف')}</div>
    <p class="hint" style="margin:-6px 0 12px">الإجمالي = عدد الفنيين × اليومية × عدد الأيام + الإضافي − الخصومات والسلف.</p>`;
  if (tab === 'capacity') return `
    <div class="row-2">${cNum('capacity', 'value', 'القدرة')}${cSel('capacity', 'unit', 'الوحدة', ['BTU/h', 'حصان', 'طن تبريد (TR)', 'kW'])}</div>
    <div id="capOut"></div>
    <div class="card" style="margin-top:12px"><div class="card-title"><div class="t-ic">${icon('list')}</div><h2>مقاسات السوق الشائعة (مرجعية)</h2></div>
      ${MARKET_TABLE.map(([l, b]) => rowHTML(l, `≈ ${b.toLocaleString('en-US')} BTU/h · ${fmtN(b / 12000, 2)} TR · ${fmtN(b * 0.00029307107, 2)} kW`)).join('')}
      <p class="hint">«الحصان» في السوق مسمى تجاري تقريبي (غالباً 1.5 حصان ≈ 12,000 BTU/h) وبيختلف حسب الشركة — راجع لوحة بيانات الجهاز. 1 طن تبريد = 12,000 BTU/h بالضبط.</p></div>
    <div class="card"><div class="card-title"><div class="t-ic orange">${icon('thermo')}</div><h2>تقدير مرجعي أولي لحمل التبريد</h2></div>
      <div class="row-2">${cNum('capacity', 'area', 'المساحة (م²)')}${cNum('capacity', 'height', 'ارتفاع السقف (م)', { ph: '3' })}</div>
      ${cSel('capacity', 'insul', 'العزل', [['good', 'عزل جيد'], ['avg', 'متوسط'], ['poor', 'ضعيف / سطح أخير']])}
      ${cSel('capacity', 'sun', 'التعرض للشمس', [['low', 'قليل'], ['med', 'متوسط'], ['high', 'شمس مباشرة / زجاج كثير']])}
      ${cNum('capacity', 'people', 'عدد الأشخاص', { ph: '2' })}
      <label class="switch" style="padding-top:0;margin-bottom:12px"><span>مطبخ أو أحمال حرارية عالية (أجهزة/إضاءة)</span><input type="checkbox" data-ckb="capacity.kitchen"${s.kitchen ? ' checked' : ''}></label>
      <div id="estOut"></div>
    </div>`;
  if (tab === 'fx') {
    const base = currentCurrency();
    const others = CURRENCIES.filter(c => c.code !== base.code);
    const rate = n0(settings.rates[s.code]);
    return `
      <div class="note" style="margin-bottom:12px">أسعار الصرف هنا <strong>مرجعية ومنفصلة</strong> عن عملتك الأساسية (${esc(base.name)}). التحويل للعرض فقط ولا يغيّر أي مبلغ مسجل في التطبيق.</div>
      ${cSel('fx', 'code', 'العملة الأخرى', others.map(c => [c.code, `${c.name} (${c.sym})`]))}
      <div class="field"><label for="fxRate">سعر 1 ${esc((currencyByCode(s.code) || {}).name || '')} بـ ${esc(base.sym)}</label><input type="number" inputmode="decimal" min="0" step="any" id="fxRate" value="${rate || ''}" placeholder="اكتب سعر الصرف"></div>
      ${cSeg('fx', 'dir', [['toBase', `إلى ${base.sym}`], ['fromBase', `من ${base.sym}`]])}
      ${cNum('fx', 'amount', 'المبلغ')}`;
  }
  return '';
}
function calcResultHTML(tab) {
  const s = calcState[tab];
  if (tab === 'install') {
    const r = CALC.install(s);
    return `<div class="sum-list">${resRow(`التركيب (${fmtN(s.count)} × ${money(s.price)})`, r.install)}${r.copper ? resRow(`النحاس (${fmtN(s.copperLen)} م × ${fmtN(s.copperLines || 1)} خط)`, r.copper) : ''}${r.insulation ? resRow('العزل', r.insulation) : ''}${r.drain ? resRow('الصرف', r.drain) : ''}${r.cable ? resRow('الكابلات', r.cable) : ''}${r.brackets ? resRow('الحوامل', r.brackets) : ''}${r.extra ? resRow('خامات إضافية', r.extra) : ''}${r.transport ? resRow('النقل', r.transport) : ''}${r.labor ? resRow('العمالة', r.labor) : ''}</div><div class="sum-total"><span>إجمالي التركيب</span><strong id="calcTotal">${money(r.total)}</strong></div>`;
  }
  if (tab === 'maint') { const r = CALC.maint(s); return `<div class="sum-list">${resRow(`الصيانة (${fmtN(s.count)} جهاز × ${money(s.price)} × ${fmtN(s.visits || 1)} زيارة)`, r.service)}${r.parts ? resRow('قطع الغيار', r.parts) : ''}${r.extra ? resRow('مصروفات إضافية', r.extra) : ''}</div><div class="sum-total"><span>إجمالي الصيانة</span><strong id="calcTotal">${money(r.total)}</strong></div>`; }
  if (tab === 'refrig') { const r = CALC.refrig(s); return `<div class="sum-list">${resRow(`${esc(s.gas)}: ${fmtN(s.qty)} ${s.qUnit} (= ${fmtN(r.qtyKg)} كجم)`, r.gas)}${r.labor ? resRow('الخدمة', r.labor) : ''}${r.cost ? rowHTML('ربح الغاز', money(r.gas - r.cost)) : ''}</div><div class="sum-total"><span>إجمالي الشحن</span><strong id="calcTotal">${money(r.total)}</strong></div>`; }
  if (tab === 'copper') { const r = CALC.copper(s); return `<div class="sum-list">${resRow(`نحاس ${esc(s.size)} (${fmtN(r.meters)} م)`, r.pipe)}${r.insulation ? resRow('العزل', r.insulation) : ''}${r.labor ? resRow('التركيب', r.labor) : ''}</div><div class="sum-total"><span>إجمالي النحاس</span><strong id="calcTotal">${money(r.total)}</strong></div>`; }
  if (tab === 'parts') { const r = CALC.parts(s); return `<div class="sum-list">${resRow('سعر البيع', r.sales)}${resRow('مصنعية التركيب', r.labor)}${rowHTML('تكلفة الشراء', money(r.cost))}${rowHTML('ربح القطع', money(r.profit), 'bold')}</div><div class="sum-total"><span>إجمالي على العميل</span><strong id="calcTotal">${money(r.total)}</strong></div>`; }
  if (tab === 'daily') { const r = CALC.daily(s); return `<div class="sum-list">${resRow(`${fmtN(s.workers)} فني × ${money(s.wage)} × ${fmtN(s.days)} يوم`, r.gross)}${s.overtime ? resRow('الإضافي', s.overtime) : ''}${s.deductions ? rowHTML('الخصومات', '- ' + money(s.deductions), 'minus') : ''}${s.advances ? rowHTML('السلف', '- ' + money(s.advances), 'minus') : ''}</div><div class="sum-total"><span>صافي اليومية</span><strong id="calcTotal">${money(r.total)}</strong></div>`; }
  if (tab === 'fx') {
    const rate = n0(settings.rates[s.code]); const c = currencyByCode(s.code) || {};
    if (!rate) return '<p class="hint">اكتب سعر الصرف الأول.</p>';
    const res = s.dir === 'toBase' ? s.amount * rate : s.amount / rate;
    return `<div class="sum-total"><span>${fmtN(s.amount, 3)} ${esc(s.dir === 'toBase' ? c.sym : CUR)} =</span><strong id="calcTotal">${fmtN(res, 3)} ${esc(s.dir === 'toBase' ? CUR : c.sym)}</strong></div>`;
  }
  return '';
}
function capOutHTML() {
  const s = calcState.capacity;
  const r = CALC.capacity(s.value, s.unit);
  let html = `<div class="sum-list">${rowHTML('BTU/h', fmtN(r.btu, 0))}${rowHTML('طن تبريد (TR)', fmtN(r.tr, 2))}${rowHTML('kW (قدرة تبريد)', fmtN(r.kw, 2))}${rowHTML('حصان تجاري (مرجعي ≈ 9000 BTU/h)', fmtN(r.hpMarket, 2))}${rowHTML('حصان ميكانيكي (2544 BTU/h)', fmtN(r.hpMech, 2))}</div>`;
  return html;
}
function estOutHTML() {
  const e = CALC.estimate(calcState.capacity);
  if (!e) return '<p class="hint" style="margin:0">اكتب المساحة لعرض تقدير أولي.</p>';
  const near = STD_SIZES.filter(x => x >= e.low * 0.95 && x <= e.high * 1.05);
  return `<div class="sum-total" style="margin-top:0"><span>نطاق تقريبي</span><strong id="estRange">${fmtN(e.low, 0)} – ${fmtN(e.high, 0)} BTU/h</strong></div>
    <div class="hint" style="margin-top:6px">مقاسات قياسية قريبة: ${near.length ? near.map(x => x.toLocaleString('en-US')).join(' / ') : 'خارج المقاسات المنزلية الشائعة — يحتاج دراسة أحمال'}</div>
    <div class="warn-box">⚠️ <b>تقدير مرجعي أولي فقط — ليس قراراً نهائياً.</b> اختيار سعة الجهاز الفعلية يتطلب حساب حمل التبريد مع مراعاة المساحة وارتفاع السقف والعزل والتوجيه والأحمال الحرارية وعدد الأشخاص والأجهزة. التطبيق لا يحدد سعة نهائية اعتماداً على المساحة وحدها.</div>`;
}
function calcLines(tab) {
  const s = calcState[tab];
  const L = [];
  if (tab === 'install') {
    if (s.count && s.price) L.push({ cat: 'install', kind: 'service', name: s.type, method: 'device', qty: s.count, price: s.price, note: s.capacity ? 'قدرة ' + s.capacity : '' });
    if (s.copperLen && s.copperPrice) L.push({ cat: 'copper', kind: 'material', name: 'ماسورة نحاس', method: 'meter', qty: s.copperLen, mult: s.copperLines || 1, price: s.copperPrice });
    if (s.copperLen && s.insPrice) L.push({ cat: 'copper', kind: 'material', name: 'عزل حراري', method: 'meter', qty: s.copperLen, mult: s.copperLines || 1, price: s.insPrice });
    if (s.drainLen && s.drainPrice) L.push({ cat: 'copper', kind: 'material', name: 'خرطوم صرف', method: 'meter', qty: s.drainLen, price: s.drainPrice });
    if (s.cableLen && s.cablePrice) L.push({ cat: 'copper', kind: 'material', name: 'كابل كهرباء', method: 'meter', qty: s.cableLen, price: s.cablePrice });
    if (s.brackets && s.bracketPrice) L.push({ cat: 'copper', kind: 'material', name: 'حوامل', method: 'piece', qty: s.brackets, price: s.bracketPrice });
    if (s.extraMat) L.push({ cat: 'copper', kind: 'material', name: 'خامات إضافية', method: 'lump', price: s.extraMat });
    if (s.transport) L.push({ cat: 'labor', kind: 'transport', name: 'نقل وانتقالات', method: 'lump', price: s.transport });
    if (s.workers && s.days && s.wage) L.push({ cat: 'labor', kind: 'labor', name: 'يومية فني', method: 'daily', qty: s.days, mult: s.workers, price: s.wage });
  } else if (tab === 'maint') {
    if (s.count && s.price) L.push({ cat: 'maint', kind: 'service', name: s.type, method: 'device', qty: s.count * (s.visits || 1), price: s.price, note: (s.visits || 1) > 1 ? `${fmtN(s.count)} جهاز × ${fmtN(s.visits)} زيارة` : '' });
    if (s.parts) L.push({ cat: 'parts', kind: 'part', name: 'قطع غيار', method: 'lump', price: s.parts });
    if (s.extra) L.push({ cat: 'labor', kind: 'other', name: 'مصروفات إضافية', method: 'lump', price: s.extra });
  } else if (tab === 'refrig') {
    if (s.qty && s.price) L.push({ cat: 'refrig', kind: 'refrigerant', name: 'شحن فريون', method: 'weight', qty: s.qty, wUnit: s.qUnit, pUnit: s.pUnit, price: s.price, cost: s.cost, refType: s.gas });
    if (s.labor) L.push({ cat: 'refrig', kind: 'service', name: 'مصنعية شحن الفريون', method: 'job', qty: 1, price: s.labor });
  } else if (tab === 'copper') {
    if (s.len && s.price) L.push({ cat: 'copper', kind: 'material', name: 'ماسورة نحاس', method: 'meter', qty: s.len, mult: s.lines || 1, price: s.price, size: s.size });
    if (s.len && s.ins) L.push({ cat: 'copper', kind: 'material', name: 'عزل حراري', method: 'meter', qty: s.len, mult: s.lines || 1, price: s.ins, size: s.size });
    if (s.len && s.labor) L.push({ cat: 'install', kind: 'service', name: 'تمديد مواسير النحاس', method: 'meter', qty: s.len, price: s.labor });
  } else if (tab === 'parts') {
    s.rows.forEach(r => { if (r.name && r.qty) L.push({ cat: 'parts', kind: 'part', name: r.name, method: 'piece', qty: r.qty, price: r.sell, cost: r.buy }); if (r.name && r.labor) L.push({ cat: 'repair', kind: 'service', name: 'تركيب ' + r.name, method: 'job', qty: 1, price: r.labor }); });
  } else if (tab === 'daily') {
    if (s.workers && s.days && s.wage) L.push({ cat: 'labor', kind: 'labor', name: 'يومية فني', method: 'daily', qty: s.days, mult: s.workers, price: s.wage });
    if (s.overtime) L.push({ cat: 'labor', kind: 'labor', name: 'إضافي', method: 'lump', price: s.overtime });
  }
  return L;
}
const CALC_DOC_TYPE = { install: 'install', maint: 'maint', refrig: 'repair', copper: 'install', parts: 'parts', daily: 'install' };
function calcToDoc(mode) {
  const lines = calcLines(calcTab);
  if (!lines.length) { showAppToast('⚠️ اكتب الأرقام الأول'); return; }
  if (mode === 'current') {
    const d = getCurrentDoc();
    if (!d) return;
    addLinesToCurrentDoc(lines);
    closeEverythingThen(() => { settings.currentDocId = d.id; openEditor('lines'); renderEditor(); showAppToast(`✔️ اتضاف ${lines.length} بند للفاتورة ${d.number}`); });
  } else {
    const type = CALC_DOC_TYPE[calcTab] || 'install';
    closeEverythingThen(() => { createDoc(type, { lines }); openEditor('lines'); renderEditor(); showAppToast(`✔️ ${docTypeInfo(type).label} جديدة بـ ${lines.length} بند`); });
  }
}
PAGES.calc = function () {
  const tab = calcTab;
  const cur = getCurrentDoc();
  const canAdd = !['capacity', 'fx'].includes(tab);
  const html = `
    <div class="chips" id="calcTabs">${Object.keys(CALC_TABS).map(k => `<button type="button" class="chip${tab === k ? ' on' : ''}" data-t="${k}">${CALC_TABS[k]}</button>`).join('')}</div>
    <div class="card" id="calcCard">${calcBody(tab)}<div id="calcRes">${tab === 'capacity' ? '' : calcResultHTML(tab)}</div></div>
    ${canAdd ? `<div class="stack">
      <button type="button" class="btn btn-accent" onclick="calcToDoc('new')">${icon('plus')} ${docTypeInfo(CALC_DOC_TYPE[tab]).label} جديدة بالحساب ده</button>
      ${cur ? `<button type="button" class="btn btn-soft" onclick="calcToDoc('current')">${icon('list')} إضافة للفاتورة ${esc(cur.number)} (${esc(docTitle(cur))})</button>` : ''}
    </div>` : ''}`;
  return {
    title: 'الحاسبات', sub: CALC_TABS[tab], html,
    after: body => {
      body.querySelector('#calcTabs').onclick = e => { const b = e.target.closest('[data-t]'); if (b) { calcTab = b.dataset.t; refreshPages(); } };
      const res = () => {
        const r = body.querySelector('#calcRes');
        if (r && tab !== 'capacity') r.innerHTML = calcResultHTML(tab);
        const co = body.querySelector('#capOut'); if (co) co.innerHTML = capOutHTML();
        const eo = body.querySelector('#estOut'); if (eo) eo.innerHTML = estOutHTML();
      };
      body.querySelectorAll('[data-ck]').forEach(inp => { inp.oninput = () => { const [t, k] = inp.dataset.ck.split('.'); calcState[t][k] = pos(parseFloat(inp.value) || 0); res(); }; });
      body.querySelectorAll('[data-ckt]').forEach(inp => { inp.oninput = () => { const [t, k] = inp.dataset.ckt.split('.'); calcState[t][k] = inp.value; res(); }; });
      body.querySelectorAll('[data-cks]').forEach(sel => { sel.onchange = () => { const [t, k] = sel.dataset.cks.split('.'); calcState[t][k] = sel.value; if (t === 'fx') refreshPages(); else res(); }; });
      body.querySelectorAll('[data-ckb]').forEach(cb => { cb.onchange = () => { const [t, k] = cb.dataset.ckb.split('.'); calcState[t][k] = cb.checked; res(); }; });
      body.querySelectorAll('[data-cseg]').forEach(seg => { seg.onclick = e => { const b = e.target.closest('[data-v]'); if (!b) return; const [t, k] = seg.dataset.cseg.split('.'); calcState[t][k] = b.dataset.v; seg.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); res(); }; });
      body.querySelectorAll('[data-cp]').forEach(inp => { inp.oninput = () => { const [i, k] = inp.dataset.cp.split('.'); calcState.parts.rows[+i][k] = k === 'name' ? inp.value : pos(parseFloat(inp.value) || 0); res(); }; });
      body.querySelectorAll('[data-cpdel]').forEach(b => { b.onclick = () => { calcState.parts.rows.splice(+b.dataset.cpdel, 1); if (!calcState.parts.rows.length) calcState.parts.rows.push({ name: '', qty: 1, buy: 0, sell: 0, labor: 0 }); refreshPages(); }; });
      const add = body.querySelector('#cpAdd'); if (add) add.onclick = () => { calcState.parts.rows.push({ name: '', qty: 1, buy: 0, sell: 0, labor: 0 }); refreshPages(); };
      const fx = body.querySelector('#fxRate'); if (fx) fx.oninput = () => { settings.rates[calcState.fx.code] = pos(parseFloat(fx.value) || 0); saveSettings(); res(); };
      res();
    }
  };
};
