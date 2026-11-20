/*
 * أرزقي للجبس والديكورات — واجهة الحاسبات
 * كل حاسبة: إدخال → نتيجة فورية (كميات + خامات) → تسعير حسب نوع الاتفاق → إضافة لمشروع
 * © 2026 أحمد حسن عبدالله - جميع الحقوق محفوظة.
 */
'use strict';
const BT = HG.board.BOARD_TYPES, INS = HG.board.INSULATION;
const THICKNESS = [{ v: 6.5, t: '6.5 مم (مرن)' }, { v: 9.5, t: '9.5 مم' }, { v: 12.5, t: '12.5 مم' }, { v: 15, t: '15 مم' }, { v: 18, t: '18 مم' }];
const OI = 'calcLive()';
const DESIGNS = { flat: 'سقف مسطح', multi: 'متعدد المستويات', drop: 'سقف ساقط', floating: 'سقف عائم', hidden: 'بإضاءة مخفية', grid: 'مقسم مربعات / أشكال', geo: 'تصميم هندسي', moisture: 'مقاوم للرطوبة', fire: 'مقاوم للحريق' };

function boardFields(v, opts) {
  opts = opts || {};
  return `${fSel('boardType', 'نوع اللوح', v.boardType || 'standard', BT, { onchange: OI })}
    ${fSel('thickness', 'سمك اللوح', v.thickness || 12.5, THICKNESS, { onchange: OI })}
    ${fNum('boardW', 'عرض اللوح', v.boardW, { ph: '1.2', unit: 'م', oninput: OI })}
    ${fNum('boardL', 'طول اللوح', v.boardL, { ph: '2.4', unit: 'م', oninput: OI })}
    ${opts.noLayers ? '' : fNum('layers', opts.layersLabel || 'عدد طبقات الألواح', v.layers, { ph: '1', oninput: OI })}
    ${fNum('waste', 'نسبة الهالك', v.waste, { ph: String(DB().settings.defaultWaste || 10), unit: '%', oninput: OI })}`;
}
function finishAdv(v) {
  return `${fNum('profileWaste', 'هالك القطاعات', v.profileWaste, { ph: '5', unit: '%', oninput: OI })}
    ${fNum('compoundRate', 'معجون لكل م²', v.compoundRate, { ph: '0.4', unit: 'كجم', oninput: OI })}
    ${fNum('compoundBag', 'وزن عبوة المعجون', v.compoundBag, { ph: '20', unit: 'كجم', oninput: OI })}
    ${fNum('tapeRoll', 'طول لفة الشريط', v.tapeRoll, { ph: '75', unit: 'م', oninput: OI })}
    ${fNum('beadLen', 'طول عود الزاوية', v.beadLen, { ph: '3', unit: 'م', oninput: OI })}
    ${fNum('insPack', 'تغطية عبوة العزل', v.insPack, { ph: '10', unit: 'م²', oninput: OI })}`;
}
const OPEN_COLS = [
  { k: 'type', label: 'النوع', type: 'sel', opts: [{ v: 'door', t: 'باب' }, { v: 'window', t: 'شباك' }], def: 'door' },
  { k: 'w', label: 'العرض م', ph: '0.9' }, { k: 'h', label: 'الارتفاع م', ph: '2.1' }, { k: 'count', label: 'العدد', ph: '1' }
];
const WALL_COLS = [{ k: 'name', label: 'الاسم (اختياري)', type: 'text', wide: true, ph: 'مثال: قاطع الصالة' }, { k: 'L', label: 'الطول م', ph: '4' }, { k: 'H', label: 'الارتفاع م', ph: '3' }, { k: 'count', label: 'العدد', ph: '1' }];
const adv = (inner, title) => `<details class="adv"><summary>${icon('layers')} ${esc(title || 'إعدادات النظام والمسافات (حسب الشركة المصنّعة)')}</summary><div class="f-grid">${inner}</div></details>`;

/* ---------------- تعريف الحاسبات ---------------- */
const CALCS = {
  ceiling: {
    section: 'board', title: 'حاسبة الأسقف المعلقة', sub: 'مسطح، مستويات، أوميجا، بلاطات', icon: 'ceiling',
    run: v => HG.board.ceiling(v),
    form: v => `
      <div class="card-title"><div class="t-ic orange">${icon('ceiling')}</div><h2>الغرف</h2></div>
      ${rowsField('rooms', [{ k: 'name', label: 'اسم الغرفة (اختياري)', type: 'text', wide: true, ph: 'الصالة' }, { k: 'L', label: 'الطول م', ph: '5' }, { k: 'W', label: 'العرض م', ph: '4' }, { k: 'count', label: 'عدد الغرف', ph: '1' }, { k: 'area', label: 'أو المساحة م²', ph: '' }, { k: 'perimeter', label: 'والمحيط م', ph: '' }], v.rooms, { label: 'غرفة', add: 'إضافة غرفة', oninput: OI })}
      <div class="f-grid">
        ${fSel('system', 'نظام التركيب', v.system || 'mf', { mf: 'قطاع رئيسي + ثانوي (معلق)', omega: 'أوميجا مباشر في السقف', tgrid: 'سقف معلق بلاطات (T-Grid)' }, { onchange: 'calcRebuild()' })}
        ${fSel('design', 'نوع التصميم', v.design || 'flat', DESIGNS, { onchange: OI })}
        ${fNum('slabHeight', 'ارتفاع السقف الأصلي', v.slabHeight, { ph: '3.00', unit: 'م', oninput: OI })}
        ${fNum('newLevel', 'منسوب السقف الجديد', v.newLevel, { ph: '2.70', unit: 'م', oninput: OI })}
        ${v.system === 'tgrid' ? fNum('waste', 'نسبة الهالك', v.waste, { ph: '5', unit: '%', oninput: OI }) : boardFields(v)}
        ${v.system === 'tgrid' ? '' : fSel('insulation', 'عزل فوق السقف', v.insulation || 'none', INS, { onchange: OI })}
      </div>
      ${v.system === 'tgrid' ? '' : `<div class="f-grid">
        ${fNum('levels', 'عدد المستويات', v.levels, { ph: '1', oninput: OI })}
        ${fNum('levelEdge', 'طول حافة المستوى', v.levelEdge, { ph: '0', unit: 'م', oninput: OI, hint: 'طول خط تغيير المنسوب' })}
        ${fNum('levelDrop', 'ارتفاع النزول بين المستويات', v.levelDrop, { ph: '0.15', unit: 'م', oninput: OI, wide: true })}
      </div>`}
      ${adv(v.system === 'tgrid'
        ? `${fNum('tileW', 'عرض البلاطة', v.tileW, { ph: '0.6', unit: 'م', oninput: OI })}${fNum('tileL', 'طول البلاطة', v.tileL, { ph: '0.6', unit: 'م', oninput: OI })}
           ${fNum('teeSpacing', 'مسافة التي الرئيسي', v.teeSpacing, { ph: '1.2', unit: 'م', oninput: OI })}${fNum('teeMainLen', 'طول التي الرئيسي', v.teeMainLen, { ph: '3.6', unit: 'م', oninput: OI })}
           ${fNum('hangerSpacing', 'مسافة العلاقات', v.hangerSpacing, { ph: '1.2', unit: 'م', oninput: OI })}${fNum('angleLen', 'طول عود الزاوية', v.angleLen, { ph: '3', unit: 'م', oninput: OI })}
           ${fNum('profileWaste', 'هالك القطاعات', v.profileWaste, { ph: '5', unit: '%', oninput: OI })}`
        : `${v.system === 'mf' ? fNum('mainSpacing', 'مسافة القطاع الرئيسي', v.mainSpacing, { ph: '1.0', unit: 'م', oninput: OI }) : ''}
           ${fNum('furSpacing', v.system === 'omega' ? 'مسافة الأوميجا' : 'مسافة القطاع الثانوي', v.furSpacing, { ph: '0.4', unit: 'م', oninput: OI })}
           ${v.system === 'mf' ? fNum('hangerSpacing', 'مسافة العلاقات', v.hangerSpacing, { ph: '1.0', unit: 'م', oninput: OI }) : fNum('omegaFix', 'مسافة تثبيت الأوميجا', v.omegaFix, { ph: '0.6', unit: 'م', oninput: OI })}
           ${v.system === 'mf' ? fNum('mainLen', 'طول عود الرئيسي', v.mainLen, { ph: '3', unit: 'م', oninput: OI }) : ''}
           ${fNum('furLen', v.system === 'omega' ? 'طول عود الأوميجا' : 'طول عود الثانوي', v.furLen, { ph: '3', unit: 'م', oninput: OI })}
           ${fNum('angleLen', 'طول عود زاوية الحائط', v.angleLen, { ph: '3', unit: 'م', oninput: OI })}
           ${fNum('angleFix', 'مسافة تثبيت الزاوية', v.angleFix, { ph: '0.5', unit: 'م', oninput: OI })}
           ${fNum('screwSpacing', 'مسافة البراغي', v.screwSpacing, { ph: '0.17', unit: 'م', oninput: OI })}
           ${finishAdv(v)}${fChk('tapePerimeter', 'شريط فواصل عند الحوائط كمان', v.tapePerimeter, { onchange: OI })}`)}`
  },
  partition: {
    section: 'board', title: 'حاسبة القواطيع والفواصل', sub: 'وجه أو وجهين، طبقات، عزل، فتحات', icon: 'partition',
    run: v => HG.board.partition(v),
    form: v => `
      <div class="card-title"><div class="t-ic orange">${icon('partition')}</div><h2>القواطيع</h2></div>
      ${rowsField('walls', WALL_COLS, v.walls, { label: 'قاطع', add: 'إضافة قاطع', oninput: OI })}
      <div class="sec-title">فتحات الأبواب والشبابيك</div>
      ${rowsField('openings', OPEN_COLS, v.openings, { label: 'فتحة', add: 'إضافة فتحة', oninput: OI, colsN: 4 })}
      <div class="f-grid">
        ${fSel('faces', 'عدد الأوجه', v.faces || 2, [{ v: 2, t: 'وجهين' }, { v: 1, t: 'وجه واحد' }], { onchange: OI })}
        ${fSel('studSize', 'عرض الهيكل المعدني', v.studSize || 75, [{ v: 50, t: '50 مم' }, { v: 70, t: '70 مم' }, { v: 75, t: '75 مم' }, { v: 100, t: '100 مم' }], { onchange: OI })}
        ${fNum('studSpacing', 'المسافة بين القوائم', v.studSpacing, { ph: '0.6', unit: 'م', oninput: OI })}
        ${fSel('insulation', 'العزل', v.insulation || 'none', INS, { onchange: OI })}
        ${boardFields(v, { layersLabel: 'طبقات الألواح لكل وجه' })}
      </div>
      ${adv(`${fNum('studLen', 'طول عود القائم', v.studLen, { ph: '3', unit: 'م', oninput: OI })}
        ${fNum('trackLen', 'طول عود المجرى', v.trackLen, { ph: '3', unit: 'م', oninput: OI })}
        ${fNum('anchorSpacing', 'مسافة الخوابير', v.anchorSpacing, { ph: '0.6', unit: 'م', oninput: OI })}
        ${fNum('screwSpacing', 'مسافة البراغي', v.screwSpacing, { ph: '0.25', unit: 'م', oninput: OI })}
        ${fNum('headerReturn', 'زيادة المجرى فوق الفتحة', v.headerReturn, { ph: '0.15', unit: 'م', oninput: OI, hint: 'من كل ناحية' })}
        ${finishAdv(v)}${fChk('openingBead', 'زوايا حماية حول الفتحات', v.openingBead !== false, { onchange: OI })}`)}`
  },
  bulkhead: {
    section: 'board', title: 'حاسبة بيت النور', sub: 'نزول وكرانيش جبسون بورد وإضاءة مخفية', icon: 'bulb',
    run: v => HG.board.bulkhead(v),
    form: v => `
      <div class="card-title"><div class="t-ic orange">${icon('bulb')}</div><h2>شكل بيت النور</h2></div>
      <div class="f-grid">
        ${fSel('mode', 'طريقة الإدخال', v.mode || 'room', { room: 'حول الغرفة (طول × عرض)', straight: 'أطوال مستقيمة' }, { onchange: 'calcRebuild()', wide: true })}
        ${(v.mode || 'room') === 'room'
          ? `${fNum('L', 'طول الغرفة', v.L, { ph: '5', unit: 'م', oninput: OI })}${fNum('W', 'عرض الغرفة', v.W, { ph: '4', unit: 'م', oninput: OI })}
             ${fSel('sides', 'عدد الجوانب', v.sides || 4, [{ v: 4, t: '4 جوانب (حول الغرفة)' }, { v: 3, t: '3 جوانب' }, { v: 2, t: 'جانبين' }, { v: 1, t: 'جانب واحد' }], { onchange: OI })}
             ${fNum('count', 'عدد الغرف بنفس المقاس', v.count, { ph: '1', oninput: OI })}`
          : `<div class="field wide">${rowsField('segments', [{ k: 'len', label: 'الطول م', ph: '3' }, { k: 'count', label: 'العدد', ph: '1' }], v.segments, { label: 'جزء', add: 'إضافة جزء', oninput: OI, colsN: 2 })}</div>
             ${fNum('ends', 'عدد النهايات المقفولة', v.ends, { ph: '0', oninput: OI })}`}
      </div>
      <div class="sec-title">المستويات (العرض والنزول)</div>
      ${rowsField('levels', [{ k: 'w', label: 'عرض النزول م', ph: '0.6' }, { k: 'd', label: 'ارتفاع النزول م', ph: '0.3' }], v.levels, { label: 'مستوى', add: 'إضافة مستوى', oninput: OI, colsN: 2 })}
      <div class="f-grid">
        ${fNum('lip', 'شفة الإضاءة المخفية', v.lip, { ph: '0', unit: 'م', oninput: OI, hint: 'الحافة المرفوعة اللي بتخبي الليد' })}
        ${fSel('measure', 'المصنعية تتحسب على', v.measure || 'outer', { outer: 'الطول على الحائط (م.ط)', inner: 'الحافة الداخلية (م.ط)', area: 'مساحة الألواح (م²)' }, { onchange: OI })}
        ${fChk('hiddenLight', 'فيه إضاءة مخفية', v.hiddenLight, { onchange: OI })}
        ${boardFields(v)}
      </div>
      ${adv(`${fNum('memberSpacing', 'مسافة القطاعات العرضية', v.memberSpacing, { ph: '0.6', unit: 'م', oninput: OI })}
        ${fNum('studLen', 'طول عود القطاع', v.studLen, { ph: '3', unit: 'م', oninput: OI })}
        ${fNum('trackLen', 'طول عود المجرى', v.trackLen, { ph: '3', unit: 'م', oninput: OI })}
        ${fNum('screwSpacing', 'مسافة البراغي', v.screwSpacing, { ph: '0.2', unit: 'م', oninput: OI })}
        ${fNum('hangerAbove', 'علاقات لو العرض أكبر من', v.hangerAbove, { ph: '0.6', unit: 'م', oninput: OI })}
        ${fNum('hangerSpacing', 'مسافة العلاقات', v.hangerSpacing, { ph: '1.0', unit: 'م', oninput: OI })}
        ${finishAdv(v)}`)}`
  },
  cladding: {
    section: 'board', title: 'حاسبة تكسية الحوائط', sub: 'تغطية حوائط، خلفيات تلفزيون، ديكورات', icon: 'wall',
    run: v => HG.board.cladding(v),
    form: v => `
      <div class="card-title"><div class="t-ic orange">${icon('wall')}</div><h2>الحوائط</h2></div>
      ${rowsField('walls', WALL_COLS.map(c => c.k === 'name' ? Object.assign({}, c, { ph: 'خلفية التلفزيون' }) : c), v.walls, { label: 'حائط', add: 'إضافة حائط', oninput: OI })}
      <div class="sec-title">الفتحات</div>
      ${rowsField('openings', OPEN_COLS, v.openings, { label: 'فتحة', add: 'إضافة فتحة', oninput: OI, colsN: 4 })}
      <div class="f-grid">
        ${fSel('frame', 'نوع الهيكل', v.frame || 'direct', { direct: 'قطاعات على كانات (تثبيت مباشر)', stud: 'هيكل مستقل (قوائم ومجاري)', adhesive: 'لصق مباشر بدون هيكل' }, { onchange: OI, wide: true })}
        ${fNum('studSpacing', 'المسافة بين القطاعات', v.studSpacing, { ph: '0.6', unit: 'م', oninput: OI })}
        ${fSel('insulation', 'العزل', v.insulation || 'none', INS, { onchange: OI })}
        ${boardFields(v)}
      </div>
      ${adv(`${fNum('studLen', 'طول عود القطاع', v.studLen, { ph: '3', unit: 'م', oninput: OI })}
        ${fNum('trackLen', 'طول عود المجرى', v.trackLen, { ph: '3', unit: 'م', oninput: OI })}
        ${fNum('bracketSpacing', 'مسافة الكانات', v.bracketSpacing, { ph: '1.0', unit: 'م', oninput: OI })}
        ${fNum('anchorSpacing', 'مسافة الخوابير', v.anchorSpacing, { ph: '0.6', unit: 'م', oninput: OI })}
        ${fNum('screwSpacing', 'مسافة البراغي', v.screwSpacing, { ph: '0.25', unit: 'م', oninput: OI })}
        ${fNum('adhesiveRate', 'لاصق لكل م²', v.adhesiveRate, { ph: '4', unit: 'كجم', oninput: OI })}
        ${fNum('adhesiveBag', 'وزن شيكارة اللاصق', v.adhesiveBag, { ph: '25', unit: 'كجم', oninput: OI })}
        ${finishAdv(v)}${fChk('openingBead', 'زوايا حماية حول الفتحات', v.openingBead !== false, { onchange: OI })}`)}`
  },
  columns: {
    section: 'board', title: 'تكسية الأعمدة والكمرات', sub: 'أعمدة حرة أو ملاصقة، كمرات', icon: 'column',
    run: v => HG.board.columns(v),
    form: v => `
      <div class="card-title"><div class="t-ic orange">${icon('column')}</div><h2>الأعمدة</h2></div>
      ${rowsField('columns', [{ k: 'a', label: 'العرض م', ph: '0.5' }, { k: 'b', label: 'العمق م', ph: '0.5' }, { k: 'H', label: 'الارتفاع م', ph: '3' }, { k: 'count', label: 'العدد', ph: '1' }, { k: 'sides', label: 'الأوجه الظاهرة', type: 'sel', def: 4, wide: true, opts: [{ v: 4, t: '4 أوجه (عمود حر)' }, { v: 3, t: '3 أوجه (ملاصق لحائط)' }, { v: 2, t: 'وجهين (في ركن)' }, { v: 1, t: 'وجه واحد' }] }], v.columns, { label: 'عمود', add: 'إضافة عمود', oninput: OI })}
      <div class="sec-title">الكمرات</div>
      ${rowsField('beams', [{ k: 'L', label: 'الطول م', ph: '4' }, { k: 'w', label: 'عرض القاع م', ph: '0.25' }, { k: 'd', label: 'النزول م', ph: '0.5' }, { k: 'count', label: 'العدد', ph: '1' }, { k: 'sides', label: 'الجوانب الظاهرة', type: 'sel', def: 2, wide: true, opts: [{ v: 2, t: 'جانبين + القاع' }, { v: 1, t: 'جانب + القاع' }] }], v.beams, { label: 'كمرة', add: 'إضافة كمرة', oninput: OI })}
      <div class="f-grid">${boardFields(v)}</div>
      ${adv(`${fNum('studLen', 'طول عود القطاع', v.studLen, { ph: '3', unit: 'م', oninput: OI })}
        ${fNum('trackLen', 'طول عود المجرى', v.trackLen, { ph: '3', unit: 'م', oninput: OI })}
        ${fNum('studSpacing', 'مسافة القطاعات', v.studSpacing, { ph: '0.6', unit: 'م', oninput: OI })}
        ${fNum('screwSpacing', 'مسافة البراغي', v.screwSpacing, { ph: '0.25', unit: 'م', oninput: OI })}
        ${finishAdv(v)}`)}`
  },
  plaster: {
    section: 'plaster', title: 'حاسبة الجبس البلدي والمحارة', sub: 'حوائط وأسقف، تسوية، ترميم وشروخ', icon: 'trowel',
    run: v => HG.plaster.plaster(v),
    form: v => {
      const T = HG.plaster.PLASTER_TYPES[v.plasterType || 'baladi'] || HG.plaster.PLASTER_TYPES.baladi;
      return `
      <div class="card-title"><div class="t-ic orange">${icon('trowel')}</div><h2>الأماكن</h2></div>
      ${rowsField('rooms', [{ k: 'name', label: 'المكان (اختياري)', type: 'text', wide: true, ph: 'غرفة النوم' }, { k: 'L', label: 'الطول م', ph: '4' }, { k: 'W', label: 'العرض م', ph: '3' }, { k: 'H', label: 'الارتفاع م', ph: '3' }, { k: 'count', label: 'العدد', ph: '1' }, { k: 'walls', label: 'الحوائط', type: 'chk', def: true }, { k: 'ceiling', label: 'السقف', type: 'chk', def: false }], v.rooms, { label: 'مكان', add: 'إضافة مكان', oninput: OI, colsN: 4 })}
      <div class="f-grid">${fNum('area', 'أو مساحة مباشرة', v.area, { ph: '0', unit: 'م²', oninput: OI, wide: true, hint: 'تتجمع مع مساحة الأماكن' })}</div>
      <div class="sec-title">خصم الفتحات</div>
      ${rowsField('openings', OPEN_COLS.slice(1), v.openings, { label: 'فتحة', add: 'إضافة فتحة', oninput: OI })}
      <div class="f-grid">
        ${fSel('plasterType', 'نوع الجبس', v.plasterType || 'baladi', HG.plaster.PLASTER_TYPES, { onchange: 'calcRebuild()' })}
        ${fSel('finish', 'نوع التشطيب', v.finish || 'smooth', HG.plaster.FINISH_TYPES, { onchange: OI })}
        ${fNum('thickness', 'سمك الطبقة', v.thickness, { ph: '10', unit: 'مم', oninput: OI })}
        ${fNum('layers', 'عدد الطبقات', v.layers, { ph: '1', oninput: OI })}
        ${fNum('rate', 'معدل الاستهلاك', v.rate, { ph: String(T.rate), unit: 'كجم/م²/مم', oninput: OI, hint: 'عدّله حسب الخامة وتجربتك' })}
        ${fNum('waste', 'نسبة الهالك', v.waste, { ph: '10', unit: '%', oninput: OI })}
        ${fNum('bagKg', 'وزن الشيكارة', v.bagKg, { ph: '25', unit: 'كجم', oninput: OI })}
        ${fNum('cornerBead', 'زوايا محارة', v.cornerBead, { ph: '0', unit: 'م.ط', oninput: OI })}
      </div>
      ${adv(`${fNum('crackLength', 'طول الشروخ المطلوب معالجتها', v.crackLength, { ph: '0', unit: 'م.ط', oninput: OI })}
        ${fNum('crackRate', 'جبس لكل متر شرخ', v.crackRate, { ph: '0.5', unit: 'كجم', oninput: OI })}`, 'ترميم ومعالجة الشروخ')}`;
    }
  },
  cornice: {
    section: 'decor', title: 'حاسبة الكرانيش', sub: 'أطوال، قطع، زوايا، هالك', icon: 'cornice',
    run: v => HG.decor.cornice(v),
    form: v => `
      <div class="card-title"><div class="t-ic orange">${icon('cornice')}</div><h2>الأطوال</h2></div>
      <div class="f-grid">
        ${fSel('mode', 'طريقة الإدخال', v.mode || 'room', { room: 'حول غرفة (طول × عرض)', sides: 'أضلاع بأطوال مختلفة' }, { onchange: 'calcRebuild()', wide: true })}
        ${(v.mode || 'room') === 'room'
          ? `${fNum('L', 'طول الغرفة', v.L, { ph: '5', unit: 'م', oninput: OI })}${fNum('W', 'عرض الغرفة', v.W, { ph: '4', unit: 'م', oninput: OI })}${fNum('count', 'عدد الغرف', v.count, { ph: '1', oninput: OI, wide: true })}`
          : `<div class="field wide">${rowsField('sides', [{ k: 'len', label: 'طول الضلع م', ph: '3' }, { k: 'count', label: 'العدد', ph: '1' }], v.sides, { label: 'ضلع', add: 'إضافة ضلع', oninput: OI, colsN: 2 })}</div>`}
        ${fSel('type', 'نوع الكورنيش', v.type || 'ready', HG.decor.CORNICE_TYPES, { onchange: OI })}
        ${fSel('exec', 'طريقة التنفيذ', v.exec || 'ready', HG.decor.EXEC_TYPES, { onchange: 'calcRebuild()' })}
        ${v.exec === 'handmade'
          ? `${fNum('kgPerMeter', 'جبس لكل متر طولي', v.kgPerMeter, { ph: '1.5', unit: 'كجم', oninput: OI })}${fNum('bagKg', 'وزن الشيكارة', v.bagKg, { ph: '25', unit: 'كجم', oninput: OI })}`
          : `${fNum('pieceLen', 'طول القطعة الواحدة', v.pieceLen, { ph: '2', unit: 'م', oninput: OI })}${fNum('allowance', 'زيادة قص لكل ضلع', v.allowance, { ph: '0', unit: 'م', oninput: OI })}`}
        ${fNum('waste', 'نسبة الهالك', v.waste, { ph: '10', unit: '%', oninput: OI })}
        ${fNum('innerCorners', 'زوايا داخلية', v.innerCorners, { ph: 'تلقائي', oninput: OI })}
        ${fNum('outerCorners', 'زوايا خارجية', v.outerCorners, { ph: '0', oninput: OI })}
      </div>`
  },
  panels: {
    section: 'decor', title: 'حاسبة البانوهات', sub: 'إطارات داخلية وخارجية، تصنيع وتركيب', icon: 'frame',
    run: v => HG.decor.panels(v),
    form: v => `
      <div class="card-title"><div class="t-ic orange">${icon('frame')}</div><h2>البانوهات</h2></div>
      ${rowsField('panels', [{ k: 'name', label: 'الاسم (اختياري)', type: 'text', wide: true, ph: 'بانوه الصالة' }, { k: 'w', label: 'الطول م', ph: '1.2' }, { k: 'h', label: 'العرض م', ph: '0.8' }, { k: 'count', label: 'العدد', ph: '1' }, { k: 'inner', label: 'إطارات داخلية', ph: '0' }, { k: 'outer', label: 'إطارات خارجية', ph: '0' }, { k: 'gap', label: 'المسافة بين الإطارات م', ph: '0.1' }], v.panels, { label: 'بانوه', add: 'إضافة بانوه', oninput: OI })}
      <div class="f-grid">
        ${fSel('type', 'نوع البانوه', v.type || 'rect', HG.decor.PANEL_TYPES, { onchange: OI })}
        ${fSel('exec', 'طريقة التنفيذ', v.exec || 'ready', HG.decor.EXEC_TYPES, { onchange: OI })}
        ${fNum('pieceLen', 'طول قطعة البرواز', v.pieceLen, { ph: '2', unit: 'م', oninput: OI })}
        ${fNum('waste', 'نسبة الهالك', v.waste, { ph: '10', unit: '%', oninput: OI })}
        ${fNum('allowance', 'زيادة قص لكل ضلع', v.allowance, { ph: '0', unit: 'م', oninput: OI, wide: true })}
      </div>`
  },
  decor: {
    section: 'decor', title: 'الروزتات والزخارف والوحدات', sub: 'روزتات، أعمدة، تيجان، إطارات، حليات', icon: 'flower',
    run: v => HG.decor.pieces(v),
    form: v => `
      <div class="card-title"><div class="t-ic orange">${icon('flower')}</div><h2>القطع</h2></div>
      ${rowsField('items', [{ k: 'name', label: 'نوع القطعة', type: 'sel', wide: true, opts: HG.decor.DECOR_TYPES, def: 'روزتة سقف' }, { k: 'size', label: 'المقاس', type: 'text', ph: '60 سم' }, { k: 'count', label: 'العدد', ph: '1' }, { k: 'exec', label: 'التنفيذ', type: 'sel', opts: Object.keys(HG.decor.EXEC_TYPES).map(k => ({ v: k, t: HG.decor.EXEC_TYPES[k] })), def: 'ready' }], v.items, { label: 'قطعة', add: 'إضافة قطعة', oninput: OI })}
      <div class="note">كل قطعة ليها سعر تركيب، وتقدر تختار «تصنيع وتركيب» تحت عشان تضيف سعر التصنيع وتكلفته.</div>`
  }
};
const CALC_ORDER = ['ceiling', 'partition', 'bulkhead', 'cladding', 'columns', 'plaster', 'cornice', 'panels', 'decor'];
const SECTION_DEFAULT_SCOPE = { decor: 'supply_install' };

/* ---------------- شاشة الحاسبات ---------------- */
function renderCalcHub() {
  const groups = [['board', 'الجبسون بورد'], ['plaster', 'الجبس البلدي واللياسة'], ['decor', 'الكرانيش والبانوهات والديكورات']];
  $('calcHub').innerHTML = groups.map(([sec, t]) => `<div class="calc-sec">${esc(t)}</div><div class="calc-grid">${CALC_ORDER.filter(id => CALCS[id].section === sec).map((id, i) =>
    `<button type="button" class="calc-tile${i === 0 && sec === 'board' ? ' dark' : ''}" onclick="openCalc('${id}')"><span class="q-ic ${i === 0 && sec === 'board' ? 'orange' : 'orange-soft'}">${icon(CALCS[id].icon)}</span><b>${esc(CALCS[id].title.replace('حاسبة ', ''))}</b><small>${esc(CALCS[id].sub)}</small></button>`).join('')}</div>`).join('');
}

/* ---------------- صفحة الحاسبة ---------------- */
let CS = null; // حالة الحاسبة المفتوحة
function priceFromStock(key) {
  const st = DB().stock;
  let s = st.find(x => x.key === key);
  if (!s && /^board_/.test(key)) s = st.find(x => x.key && x.key.split('_').slice(0, 2).join('_') === key.split('_').slice(0, 2).join('_'));
  return s ? { buy: s.buy === '' ? '' : Number(s.buy), sell: s.sell === '' ? '' : Number(s.sell), stockId: s.id } : { buy: '', sell: '', stockId: null };
}
function openCalc(id, edit, targetPid) {
  const C = CALCS[id];
  CS = {
    id, input: edit ? JSON.parse(JSON.stringify(edit.input || {})) : {},
    scope: edit ? edit.scope : (SECTION_DEFAULT_SCOPE[C.section] || DB().settings.defaultScope || 'labor'),
    work: edit ? JSON.parse(JSON.stringify(edit.work || [])) : [], mats: edit ? JSON.parse(JSON.stringify(edit.mats || {})) : {},
    edit: edit ? { projectId: edit.projectId, itemId: edit.itemId } : null, target: targetPid || null, result: null
  };
  const el = openPage(`${pageHead(C.title, edit ? 'تعديل بند في مشروع' : targetPid ? 'إضافة لمشروع: ' + projName(byId('projects', targetPid)) : C.sub, `<button type="button" class="icon-btn" onclick="calcShare()" aria-label="مشاركة">${icon('share')}</button>`)}
    <main class="container" style="padding-bottom:40px">
      <div class="card" id="calcForm"></div>
      <div id="calcResult"></div>
      <div class="card" id="calcPrice"></div>
      <div class="stack">
        <button type="button" class="btn btn-accent" onclick="calcToProject()">${icon('plus')} ${edit ? 'حفظ التعديل في المشروع' : targetPid ? 'إضافة للمشروع' : 'إضافة إلى مشروع'}</button>
        <div class="btn-row">
          <button type="button" class="btn btn-wa" onclick="calcShare(true)">${icon('send')} واتساب</button>
          <button type="button" class="btn btn-ghost" onclick="calcReset()">${icon('refresh')} مسح الإدخال</button>
        </div>
      </div>
    </main>`, { name: 'calc', onClose: () => { CS = null; } });
  calcRebuild(true);
  return el;
}
function calcFormEl() { return $('calcForm'); }
function calcRebuild(first) {
  if (!CS) return;
  if (!first) CS.input = readForm(calcFormEl());
  $('calcForm').innerHTML = CALCS[CS.id].form(CS.input);
  hydrateIcons($('calcForm'));
  calcLive();
}
function calcReset() { ask('مسح كل الأرقام المكتوبة في الحاسبة؟', () => { CS.input = {}; CS.work = []; calcRebuild(true); }, 'مسح'); }
function calcLive() {
  if (!CS) return;
  CS.input = readForm(calcFormEl());
  const inp = Object.assign({}, CS.input);
  if (inp.waste === '' || inp.waste == null) inp.waste = DB().settings.defaultWaste;
  let res;
  try { res = CALCS[CS.id].run(inp); } catch (e) { res = { summary: [], work: [], materials: [], warnings: ['خطأ في الحساب: ' + e.message], notes: [] }; }
  CS.result = res;
  // أسعار الخامات: من المخزون أول مرة، وبعدها اللي المستخدم كتبه
  res.materials.forEach(m => { if (!CS.mats[m.key + '|' + m.name]) CS.mats[m.key + '|' + m.name] = priceFromStock(m.key); });
  res.work.forEach((w, i) => { if (!CS.work[i]) CS.work[i] = { rate: '', method: '', lump: '', days: '' }; });
  renderCalcResult();
  renderCalcPrice();
}
function renderCalcResult() {
  const r = CS.result;
  const hl = ['إجمالي المساحة', 'صافي مساحة القاطع', 'صافي المساحة', 'مساحة التكسية', 'المساحة الإجمالية', 'إجمالي الأطوال', 'أطوال الإطارات', 'الطول على الحائط', 'عدد الألواح', 'عدد الشكاير', 'عدد القطع المطلوبة', 'عدد قطع البروفايل', 'إجمالي القطع'];
  $('calcResult').innerHTML = `<div class="card">
    <div class="card-title"><div class="t-ic">${icon('calc')}</div><h2>النتيجة</h2><span class="tag">فوري</span></div>
    ${r.warnings.length ? `<div class="warn-list">${r.warnings.map(w => `<div class="warn-box" style="margin:0"><b>تنبيه:</b> ${esc(w)}</div>`).join('')}</div>` : ''}
    ${r.summary.length ? `<div class="res-chips">${r.summary.map(s => `<div class="res-chip${hl.includes(s.label) ? ' hl' : ''}"><span>${esc(s.label)}</span><strong>${typeof s.value === 'number' ? fq(s.value) : esc(s.value)} <small>${esc(s.unit)}</small></strong></div>`).join('')}</div>` : ''}
    ${r.materials.length ? `<div class="sec-title">${icon('box')} الخامات المطلوبة</div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>الخامة</th><th style="text-align:center">الكمية</th></tr></thead><tbody>
      ${r.materials.map(m => `<tr><td>${esc(m.name)}${m.detail ? `<small>${esc(m.detail)}</small>` : ''}</td><td class="n">${fq(m.qty)} <small>${esc(m.unit)}</small></td></tr>`).join('')}</tbody></table></div>` : ''}
    ${(r.notes || []).map(n => `<div class="note" style="margin-top:8px">${esc(n)}</div>`).join('')}
  </div>`;
}
const UNIT_METHOD = { 'م²': 'm2', 'م.ط': 'lm', 'قطعة': 'piece', 'بانوه': 'piece', 'زاوية': 'count' };
function workMethod(w, i) { const s = CS.work[i] || {}; return s.method || UNIT_METHOD[w.unit] || 'count'; }
function calcAmounts() {
  // نحوّل الحاسبة لبنود مؤقتة ونحسبها بنفس المحرك المالي للمشروع (بدون أي حساب مكرر)
  const items = calcItems(true);
  const t = items.reduce((a, it) => { const x = HGf.itemAmounts(it); a.labor += x.labor + x.fab; a.materials += x.materials; a.client += x.client; a.cost += x.cost; return a; }, { labor: 0, materials: 0, client: 0, cost: 0 });
  t.profit = t.client - t.cost;
  return t;
}
function renderCalcPrice() {
  const r = CS.result, sc = CS.scope;
  if (!r.work.length) { $('calcPrice').innerHTML = '<div class="hint">اكتب المقاسات عشان يظهر التسعير.</div>'; return; }
  const showLabor = sc !== 'supply', showSell = sc === 'supply' || sc === 'supply_install', showBuy = sc !== 'labor';
  $('calcPrice').innerHTML = `
    <div class="card-title"><div class="t-ic orange">${icon('wallet')}</div><h2>التسعير ونوع الاتفاق</h2></div>
    <div class="segmented" style="grid-template-columns:repeat(2,1fr)">${Object.keys(HGf.SCOPES).map(k => `<button type="button" class="${sc === k ? 'on' : ''}" onclick="calcScope('${k}')">${esc(HGf.SCOPES[k].short)}</button>`).join('')}</div>
    <div class="hint" style="margin:-4px 0 12px">${esc(HGf.SCOPES[sc].hint)}</div>
    ${showLabor ? `<div class="sec-title">${icon('hammer')} ${sc === 'fab_install' ? 'التصنيع والتركيب' : 'المصنعية'}</div>
    ${r.work.map((w, i) => {
      const s = CS.work[i], m = workMethod(w, i), lump = HGf.isLump(m);
      return `<div class="row-item" style="padding-bottom:6px;margin-bottom:8px"><div class="row-head"><span class="n">${i + 1}</span><span style="color:var(--text)">${esc(w.name)}</span><span class="sp"></span><b>${m === 'day' ? '' : fq(w.qty) + ' ' + esc(w.unit)}</b></div>
        <div class="row-cols" style="--cols:2">
          ${fSel('method', 'طريقة المحاسبة', m, [{ v: UNIT_METHOD[w.unit] || 'count', t: (HGf.METHODS[UNIT_METHOD[w.unit] || 'count'] || {}).name || 'بالكمية' }, { v: 'day', t: 'باليومية' }, { v: 'lump', t: 'بالمقطوعية' }, { v: 'contract', t: 'بالمقاولة الكاملة' }, { v: 'design', t: 'حسب التصميم' }], { onchange: `calcWork(${i},'method',this.value,true)` })}
          ${lump ? fNum('lump', 'المبلغ الشامل', s.lump, { unit: cur().sym, oninput: `calcWork(${i},'lump',this.value)` })
            : m === 'day' ? `${fNum('days', 'عدد الأيام', s.days, { oninput: `calcWork(${i},'days',this.value)` })}${fNum('rate', 'اليومية', s.rate, { unit: cur().sym, oninput: `calcWork(${i},'rate',this.value)` })}`
            : fNum('rate', sc === 'fab_install' ? 'سعر التركيب للوحدة' : 'سعر المصنعية للوحدة', s.rate, { unit: cur().sym, oninput: `calcWork(${i},'rate',this.value)` })}
          ${sc === 'fab_install' && !lump ? `${fNum('fabRate', 'سعر التصنيع للعميل/وحدة', s.fabRate, { unit: cur().sym, oninput: `calcWork(${i},'fabRate',this.value)` })}${fNum('fabCost', 'تكلفة التصنيع عليك/وحدة', s.fabCost, { unit: cur().sym, oninput: `calcWork(${i},'fabCost',this.value)` })}` : ''}
        </div></div>`;
    }).join('')}` : ''}
    ${r.materials.length ? `<div class="sec-title">${icon('box')} أسعار الخامات<span class="sp"></span><small class="hint" style="margin:0">${sc === 'labor' ? 'العميل بيوفرها — للعلم فقط' : sc === 'fab_install' ? 'تكلفة داخلية (سعر التصنيع شاملها)' : 'من المخزون أو اكتبها'}</small></div>
    ${showBuy ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>الخامة</th><th style="text-align:center">الكمية</th>${showBuy ? '<th style="text-align:center">سعر الشراء</th>' : ''}${showSell ? '<th style="text-align:center">سعر البيع</th>' : ''}</tr></thead><tbody>
      ${r.materials.map(m => { const p = CS.mats[m.key + '|' + m.name] || {}; const k = esc(m.key + '|' + m.name); return `<tr><td>${esc(m.name)}</td><td class="n">${fq(m.qty)} <small>${esc(m.unit)}</small></td>
        ${showBuy ? `<td><input type="number" inputmode="decimal" step="any" min="0" value="${p.buy === '' || p.buy == null ? '' : p.buy}" data-mk="${k}" data-f="buy" oninput="calcMat(this)"></td>` : ''}
        ${showSell ? `<td><input type="number" inputmode="decimal" step="any" min="0" value="${p.sell === '' || p.sell == null ? '' : p.sell}" data-mk="${k}" data-f="sell" oninput="calcMat(this)"></td>` : ''}</tr>`; }).join('')}
      </tbody></table></div>` : `<div class="hint">${r.materials.length} خامة — هتظهر في المقايسة عشان العميل يشتريها.</div>`}` : ''}
    <div id="calcTotals"></div>`;
  hydrateIcons($('calcPrice'));
  renderCalcTotals();
}
function renderCalcTotals() {
  const t = calcAmounts(), sc = CS.scope;
  $('calcTotals').innerHTML = `<div class="sum-list" style="margin-top:8px">
    ${sc !== 'supply' ? `<div class="sum-row"><span>${sc === 'fab_install' ? 'التصنيع والتركيب' : 'المصنعية'}</span><strong>${money(t.labor)}</strong></div>` : ''}
    ${sc === 'supply' || sc === 'supply_install' ? `<div class="sum-row"><span>الخامات (سعر البيع)</span><strong>${money(t.materials)}</strong></div>` : ''}
    ${sc !== 'labor' ? `<div class="sum-row minus"><span>التكلفة عليك</span><strong>${money(t.cost)}</strong></div><div class="sum-row bold"><span>الربح المتوقع</span><strong>${money(t.profit)}</strong></div>` : ''}
  </div><div class="sum-total"><span>إجمالي على العميل</span><strong>${money(t.client)}</strong></div>`;
}
function calcScope(s) { CS.scope = s; renderCalcPrice(); }
function calcWork(i, f, v, rerender) { CS.work[i] = CS.work[i] || {}; CS.work[i][f] = v; if (rerender) renderCalcPrice(); else renderCalcTotals(); }
function calcMat(el) { const k = el.dataset.mk; CS.mats[k] = CS.mats[k] || {}; CS.mats[k][el.dataset.f] = el.value === '' ? '' : parseFloat(el.value); renderCalcTotals(); }

/** تحويل نتيجة الحاسبة لبنود مشروع */
function calcItems(preview) {
  const r = CS.result, C = CALCS[CS.id];
  const items = [];
  const group = (CS.edit && CS.edit.group) || uid('g');
  const mats = r.materials.map(m => { const p = CS.mats[m.key + '|' + m.name] || {}; return { key: m.key, name: m.name, spec: m.detail || '', qty: m.qty, unit: m.unit, buy: p.buy === '' || p.buy == null ? 0 : Number(p.buy), sell: p.sell === '' || p.sell == null ? 0 : Number(p.sell), stockId: p.stockId || null }; });
  r.work.forEach((w, i) => {
    const s = CS.work[i] || {}, method = workMethod(w, i), lump = HGf.isLump(method);
    if (w.optional && !(Number(s.rate) > 0) && !lump) return;
    const isDay = method === 'day';
    items.push({
      id: preview ? 'tmp' + i : uid('i'), section: C.section, name: w.name, method,
      unit: isDay ? 'يوم' : lump ? HGf.METHODS[method].unit : w.unit,
      qty: isDay ? (Number(s.days) || 0) : w.qty, scope: CS.scope,
      laborRate: Number(s.rate) || 0, fabRate: Number(s.fabRate) || 0, fabCost: Number(s.fabCost) || 0, lumpSum: Number(s.lump) || 0,
      measuredQty: w.qty, measuredUnit: w.unit,
      materials: items.length === 0 ? mats : [],
      notes: i === 0 ? r.summary.slice(0, 4).map(x => `${x.label}: ${typeof x.value === 'number' ? fq(x.value) : x.value} ${x.unit}`).join(' · ') : '',
      calc: i === 0 ? { id: CS.id, input: CS.input, work: CS.work, mats: CS.mats, scope: CS.scope } : null,
      doneQty: 0, donePct: 0, created: todayISO(), group
    });
  });
  return items;
}
function calcToProject() {
  if (!CS || !CS.result || !CS.result.work.length) { toast('اكتب المقاسات الأول'); return; }
  if (CS.edit) {
    const p = byId('projects', CS.edit.projectId);
    if (!p) { toast('المشروع مش موجود'); return; }
    const idx = p.items.findIndex(x => x.id === CS.edit.itemId);
    const old = idx >= 0 ? p.items[idx] : null;
    CS.edit.group = old && old.group;
    const items = calcItems();
    if (old) {
      // بنود نفس الحاسبة (مثلاً سقف + نزول مستويات) بتتحدث مع بعض
      const prev = p.items.filter(x => x.id === old.id || (old.group && x.group === old.group));
      items.forEach((it, i) => { const o = prev[i]; if (o) { it.id = o.id; it.doneQty = o.doneQty; it.donePct = o.donePct; it.extraCost = o.extraCost; } });
      p.items = p.items.filter(x => !prev.includes(x));
      p.items.splice(Math.min(idx, p.items.length), 0, ...items);
    } else p.items.push(...items);
    p.updated = todayISO(); persist();
    closePage(); toast('✔️ اتحدث البند في المشروع');
    refreshPages(); renderAll();
    return;
  }
  const addTo = pid => {
    const p = byId('projects', pid);
    const items = calcItems();
    p.items.push(...items); p.updated = todayISO(); persist();
    toast(`✔️ اتضاف ${items.length} بند لمشروع «${p.name || 'بدون اسم'}»`);
    const fromProject = !!CS.target;
    closePage();
    renderAll();
    if (fromProject) { refreshPages(); const tp = topPage(); if (tp && tp.el) tp.el.dataset.tab = 'items'; refreshPages(); }
    else openProject(pid);
  };
  if (CS.target && byId('projects', CS.target)) addTo(CS.target); else pickProject(addTo);
}
function calcText() {
  const r = CS.result, C = CALCS[CS.id];
  const lines = [`*${C.title}*`, ''];
  r.summary.forEach(s => lines.push(`• ${s.label}: ${typeof s.value === 'number' ? fq(s.value) : s.value} ${s.unit}`));
  if (r.materials.length) { lines.push('', '*الخامات:*'); r.materials.forEach(m => lines.push(`- ${m.name}: ${fq(m.qty)} ${m.unit}`)); }
  const t = calcAmounts();
  if (t.client > 0) lines.push('', `*الإجمالي: ${money(t.client)}*`);
  const b = DB().settings;
  if (b.bizName || b.phone) lines.push('', [b.bizName, b.phone].filter(Boolean).join(' — '));
  return lines.join('\n');
}
function calcShare(wa) { if (!CS || !CS.result) return; const t = calcText(); if (wa) sendWhatsApp(t); else copyText(t, '✔️ اتنسخت النتيجة'); }
function editItemCalc(projectId, itemId) {
  const p = byId('projects', projectId); const it = p && p.items.find(x => x.id === itemId);
  if (!it || !it.calc || !CALCS[it.calc.id]) return;
  openCalc(it.calc.id, Object.assign({ projectId, itemId }, it.calc));
}
