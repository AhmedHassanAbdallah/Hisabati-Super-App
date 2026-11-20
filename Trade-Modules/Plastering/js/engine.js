/*
 * HESABATI PLASTER — محرك الحسابات
 * حساباتي للمحارة وتشطيبات الواجهات
 *
 * هذا الملف مستقل تماماً عن الواجهة: لا يلمس DOM ولا التخزين.
 * يعمل في المتصفح (window.PlasterEngine) وفي Node للاختبارات (require).
 *
 * مهم: كل المعاملات (السمك، نسب الخلط، معدلات الاستهلاك، معاملات التحويل...)
 * قيم يُدخلها المستخدم أو قيم استرشادية قابلة للتعديل، وليست حقائق ثابتة.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PlasterEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------------- أدوات رقمية ---------------- */
  function n(v) {
    if (typeof v === 'string') v = v.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(',', '.');
    const x = parseFloat(v);
    return isFinite(x) ? x : 0;
  }
  function round(v, d) {
    const f = Math.pow(10, d == null ? 2 : d);
    return Math.round((n(v) + Number.EPSILON) * f) / f;
  }
  function sum(arr, fn) { return (arr || []).reduce((s, x) => s + n(fn ? fn(x) : x), 0); }
  // تقريب لأعلى مع تجاهل كسور الحساب الصغيرة جداً (مثلاً 3.0000000001 ← 3)
  function ceilSafe(v) { return Math.ceil(round(v, 6)); }

  /* ---------------- الوحدات ---------------- */
  const LEN_FACTORS = { m: 1, cm: 0.01, mm: 0.001 };
  function toM(v, unit) { return n(v) * (LEN_FACTORS[unit] || 1); }
  function convertLen(v, from, to) { return n(v) * (LEN_FACTORS[from] || 1) / (LEN_FACTORS[to] || 1); }

  /* ---------------- الأشكال الهندسية ----------------
   * الأبعاد a, b, h بوحدة القياس المختارة (م أو سم).
   * rect: مستطيل a×b | tri: مثلث قاعدة a وارتفاع h | trap: شبه منحرف (a+b)/2×h
   * circle: دائرة قطرها a | semi: نصف دائرة قطرها a | arch: قوس (نصف دائرة) أعلى فتحة/حائط عرضه a
   * column: عمود مستطيل مقاسه a×b وارتفاعه h → المسطح الجانبي 2(a+b)h
   * columnR: عمود دائري قطره a وارتفاعه h → πah
   * beam: كمرة عرضها a وسقوطها b وطولها h → (a + 2b) × h (الوش السفلي + الجانبين)
   * area: مساحة مباشرة بالمتر المربع في a
   */
  const SHAPES = {
    rect: { name: 'مستطيل / حائط', f: ['a', 'b'], labels: ['الطول', 'العرض/الارتفاع'] },
    tri: { name: 'مثلث', f: ['a', 'h'], labels: ['القاعدة', 'الارتفاع'] },
    trap: { name: 'شبه منحرف', f: ['a', 'b', 'h'], labels: ['الضلع الأول', 'الضلع الموازي', 'الارتفاع'] },
    circle: { name: 'دائرة', f: ['a'], labels: ['القطر'] },
    semi: { name: 'نصف دائرة / قوس', f: ['a'], labels: ['القطر'] },
    column: { name: 'عمود مستطيل', f: ['a', 'b', 'h'], labels: ['الضلع الأول', 'الضلع الثاني', 'الارتفاع'] },
    columnR: { name: 'عمود دائري', f: ['a', 'h'], labels: ['القطر', 'الارتفاع'] },
    beam: { name: 'كمرة (وش + جانبين)', f: ['a', 'b', 'h'], labels: ['عرض الكمرة', 'السقوط', 'الطول'] },
    area: { name: 'مساحة جاهزة م²', f: ['a'], labels: ['المساحة م²'], raw: true }
  };
  function shapeArea(s, unit) {
    if (!s) return 0;
    if (s.type === 'area') return n(s.a);
    const a = toM(s.a, unit), b = toM(s.b, unit), h = toM(s.h, unit);
    switch (s.type) {
      case 'rect': return a * b;
      case 'tri': return a * h / 2;
      case 'trap': return (a + b) / 2 * h;
      case 'circle': return Math.PI * Math.pow(a / 2, 2);
      case 'semi': return Math.PI * Math.pow(a / 2, 2) / 2;
      case 'column': return 2 * (a + b) * h;
      case 'columnR': return Math.PI * a * h;
      case 'beam': return (a + 2 * b) * h;
      default: return 0;
    }
  }
  function shapesTotal(list, unit) {
    let plus = 0, minus = 0;
    const lines = [];
    (list || []).forEach(s => {
      const cnt = s.count === '' || s.count == null ? 1 : n(s.count);
      const one = shapeArea(s, unit);
      const tot = one * cnt;
      if (s.sign === -1 || s.sign === '-1') minus += tot; else plus += tot;
      lines.push({ name: s.name || (SHAPES[s.type] || {}).name || '', one, count: cnt, total: tot, sign: s.sign === -1 || s.sign === '-1' ? -1 : 1 });
    });
    return { plus, minus, net: plus - minus, lines };
  }

  /* ---------------- قواعد خصم الفتحات ----------------
   * mode:
   *  all     خصم كامل مساحة كل الفتحات
   *  none    لا يتم خصم أي فتحة (حسب اتفاق المقاولة)
   *  above   خصم الفتحة كاملة فقط إذا كانت مساحتها أكبر من threshold م²
   *  excess  خصم الجزء الزائد عن threshold م² فقط من كل فتحة
   *  percent خصم نسبة percent% من مساحة كل فتحة
   * كل فتحة يمكن أن تتجاوز القاعدة: deduct = 'yes' | 'no' | 'auto'
   * الأكتاف (الجوانب الداخلية للفتحة) تُضاف فقط عند تنفيذها:
   *  reveal = 'door'   (جانبين + أعلى) = (2h + w) × العمق
   *  reveal = 'window' (4 جوانب)       = 2(w + h) × العمق
   *  reveal = 'sides'  (جانبين فقط)    = 2h × العمق
   * عمق الكتف بالسنتيمتر دائماً.
   */
  const DEDUCT_MODES = {
    all: 'خصم كامل للفتحات',
    none: 'بدون خصم الفتحات',
    above: 'خصم الفتحات الأكبر من حد معين فقط',
    excess: 'خصم الزيادة عن حد معين فقط',
    percent: 'خصم نسبة من الفتحات'
  };
  function openingDeductOne(area1, o, rules) {
    const r = rules || {};
    const d = o.deduct || 'auto';
    if (d === 'yes') return area1;
    if (d === 'no') return 0;
    const th = n(r.threshold);
    switch (r.mode || 'all') {
      case 'none': return 0;
      case 'above': return area1 > th ? area1 : 0;
      case 'excess': return Math.max(0, area1 - th);
      case 'percent': return area1 * n(r.percent) / 100;
      default: return area1;
    }
  }
  function openingsCalc(openings, rules, unit) {
    let total = 0, deducted = 0, reveals = 0;
    const lines = [];
    (openings || []).forEach(o => {
      const w = toM(o.w, unit), h = toM(o.h, unit);
      const cnt = o.count === '' || o.count == null ? 1 : n(o.count);
      const area1 = w * h;
      const ded1 = openingDeductOne(area1, o, rules);
      const depth = n(o.depth) / 100;
      let rev1 = 0;
      if (o.reveal === 'door') rev1 = (2 * h + w) * depth;
      else if (o.reveal === 'window') rev1 = 2 * (w + h) * depth;
      else if (o.reveal === 'sides') rev1 = 2 * h * depth;
      total += area1 * cnt; deducted += ded1 * cnt; reveals += rev1 * cnt;
      lines.push({ name: o.name || 'فتحة', area: area1 * cnt, deducted: ded1 * cnt, reveal: rev1 * cnt, count: cnt });
    });
    return { total, deducted, reveals, lines };
  }

  /* ---------------- محرك المساحات ----------------
   * measure = {
   *   mode: 'room' | 'shapes' | 'facade' | 'linear' | 'manual',
   *   unit: 'm' | 'cm',
   *   room:   { l, w, h, count, walls: true, ceiling: false },
   *   shapes: [ {type, name, a, b, h, count, sign} ],
   *   facade: { width, floors, floorH, floorList: [{name, h}], extraH, count },
   *   linear: [ {name, len, count} ], girth (سم: عرض الفرد/التنمية لتحويل الطولي لمسطح)
   *   manual: { area, linear },
   *   openings: [...], rules: {mode, threshold, percent}, additions: [shapes...]
   * }
   * يرجع: walls, ceiling, gross, openings, deducted, reveals, additions, area (الصافي), linear
   */
  function measureCalc(m) {
    m = m || {};
    const unit = m.unit || 'm';
    const out = { walls: 0, ceiling: 0, gross: 0, openings: 0, deducted: 0, reveals: 0, additions: 0, area: 0, linear: 0, height: 0, lines: [] };
    const mode = m.mode || 'manual';

    if (mode === 'room') {
      const r = m.room || {};
      const L = toM(r.l, unit), W = toM(r.w, unit), H = toM(r.h, unit);
      const cnt = r.count === '' || r.count == null ? 1 : n(r.count);
      const perim = 2 * (L + W);
      out.walls = r.walls === false ? 0 : perim * H * cnt;
      out.ceiling = r.ceiling ? L * W * cnt : 0;
      out.linear = perim * cnt;
      out.height = H;
      out.lines.push({ k: 'محيط الغرفة', v: perim, u: 'م.ط' });
      if (r.walls !== false) out.lines.push({ k: 'مسطح الحوائط', v: out.walls, u: 'م²' });
      if (r.ceiling) out.lines.push({ k: 'مسطح السقف', v: out.ceiling, u: 'م²' });
    } else if (mode === 'shapes') {
      const st = shapesTotal(m.shapes, unit);
      out.walls = st.net;
      st.lines.forEach(l => out.lines.push({ k: l.name + (l.count !== 1 ? ' ×' + l.count : ''), v: l.sign * l.total, u: 'م²' }));
    } else if (mode === 'facade') {
      const f = m.facade || {};
      const W = toM(f.width, unit);
      let H;
      if (Array.isArray(f.floorList) && f.floorList.length) H = sum(f.floorList, x => toM(x.h, unit));
      else H = n(f.floors) * toM(f.floorH, unit);
      H += toM(f.extraH, unit);
      const cnt = f.count === '' || f.count == null ? 1 : n(f.count);
      out.walls = W * H * cnt;
      out.height = H;
      out.linear = W * cnt;
      out.lines.push({ k: 'الارتفاع الكلي للواجهة', v: H, u: 'م' });
      out.lines.push({ k: 'المسطح الإجمالي للواجهة', v: out.walls, u: 'م²' });
    } else if (mode === 'linear') {
      out.linear = sum(m.linear, x => toM(x.len, unit) * (x.count === '' || x.count == null ? 1 : n(x.count)));
      const g = n(m.girth) / 100;
      out.walls = out.linear * g;
      out.lines.push({ k: 'إجمالي الأطوال', v: out.linear, u: 'م.ط' });
      if (g > 0) out.lines.push({ k: 'المسطح (الطول × التنمية ' + n(m.girth) + ' سم)', v: out.walls, u: 'م²' });
    } else {
      const mm = m.manual || {};
      out.walls = n(mm.area);
      out.linear = n(mm.linear);
    }

    out.gross = out.walls + out.ceiling;
    const op = openingsCalc(m.openings, m.rules, unit);
    out.openings = op.total; out.deducted = op.deducted; out.reveals = op.reveals;
    out.openingLines = op.lines;
    const add = shapesTotal(m.additions, unit);
    out.additions = add.net;
    out.additionLines = add.lines;
    // الخصم من الحوائط (الفتحات في الحوائط)، الأكتاف والإضافات تضاف للصافي
    const wallsNet = Math.max(0, out.walls - out.deducted) + out.reveals + out.additions;
    out.wallsNet = wallsNet;
    out.area = wallsNet + out.ceiling;
    if (op.total > 0) out.lines.push({ k: 'مساحة الفتحات', v: op.total, u: 'م²' }, { k: 'المخصوم من الفتحات', v: -op.deducted, u: 'م²' });
    if (op.reveals > 0) out.lines.push({ k: 'الأكتاف والجوانب المنفذة', v: op.reveals, u: 'م²' });
    if (add.lines.length) out.lines.push({ k: 'إضافات / خصومات أخرى', v: add.net, u: 'م²' });
    return out;
  }

  /* ---------------- حاسبة المحارة الأسمنتية ----------------
   * p = {
   *   thickness (مم لكل طبقة), layers, method: 'ratio' | 'content',
   *   ratio: n (أسمنت 1 : رمل n حجماً), dryFactor (معامل تحويل المونة الرطبة لحجم جاف),
   *   density (كثافة الأسمنت كجم/م³), bagKg (وزن الشيكارة),
   *   content (كجم أسمنت لكل م³ رمل), sandPerM3 (م³ رمل لكل م³ مونة) — طريقة المواصفات المصرية الشائعة
   *   waste (%), cementPrice (للشيكارة), sandPrice (للمتر المكعب),
   *   cementSell, sandSell (سعر البيع للعميل عند التوريد)
   * }
   */
  function cementPlaster(p, area) {
    p = p || {};
    const t = n(p.thickness) / 1000 * Math.max(1, n(p.layers) || 1);
    const wet = n(area) * t;
    const waste = 1 + n(p.waste) / 100;
    let cementKg, sandM3, dry = 0;
    const notes = [];
    if (p.method === 'content') {
      sandM3 = wet * (n(p.sandPerM3) || 1);
      cementKg = sandM3 * n(p.content);
      notes.push('طريقة المحتوى: ' + n(p.content) + ' كجم أسمنت لكل 1 م³ رمل، و' + (n(p.sandPerM3) || 1) + ' م³ رمل لكل 1 م³ مونة');
    } else {
      const r = n(p.ratio) || 0;
      dry = wet * (n(p.dryFactor) || 1);
      const cementVol = dry / (1 + r);
      sandM3 = dry * r / (1 + r);
      cementKg = cementVol * (n(p.density) || 1440);
      notes.push('نسبة خلط حجمية 1 : ' + r + '، ومعامل الحجم الجاف ' + (n(p.dryFactor) || 1) + '، وكثافة الأسمنت ' + (n(p.density) || 1440) + ' كجم/م³');
    }
    cementKg *= waste; sandM3 *= waste;
    const bagKg = n(p.bagKg) || 50;
    const bags = ceilSafe(cementKg / bagKg);
    const sandOrder = Math.ceil(round(sandM3, 6) * 100) / 100; // لأقرب 0.01 م³
    const materials = [
      { key: 'cement', name: p.cementName || 'أسمنت', qty: cementKg, unit: 'كجم', packs: bags, packUnit: 'شيكارة ' + bagKg + ' كجم', price: n(p.cementPrice), sell: p.cementSell === '' || p.cementSell == null ? null : n(p.cementSell), materialId: p.cementId || null },
      { key: 'sand', name: p.sandName || 'رمل', qty: sandM3, unit: 'م³', packs: sandOrder, packUnit: 'م³', price: n(p.sandPrice), sell: p.sandSell === '' || p.sandSell == null ? null : n(p.sandSell), materialId: p.sandId || null }
    ];
    return { wetVolume: wet, dryVolume: dry, thicknessTotal: t * 1000, cementKg, bags, sandM3, materials, notes };
  }

  /* ---------------- المحارة الجاهزة / الجبسية (Dry Mix) ----------------
   * الاستهلاك من بيانات الشركة المصنعة: كجم لكل م² لكل 1 مم سمك.
   * p = { thickness, layers, kgPerMm, bagKg, waste, price (للشيكارة), sell, name, materialId }
   */
  function premixPlaster(p, area) {
    p = p || {};
    const tmm = n(p.thickness) * Math.max(1, n(p.layers) || 1);
    const kg = n(area) * tmm * n(p.kgPerMm) * (1 + n(p.waste) / 100);
    const bagKg = n(p.bagKg) || 25;
    const bags = ceilSafe(kg / bagKg);
    return {
      kg, bags, thicknessTotal: tmm, wetVolume: n(area) * tmm / 1000,
      materials: [{ key: 'premix', name: p.name || 'محارة جاهزة', qty: kg, unit: 'كجم', packs: bags, packUnit: 'شيكارة ' + bagKg + ' كجم', price: n(p.price), sell: p.sell === '' || p.sell == null ? null : n(p.sell), materialId: p.materialId || null }],
      notes: ['استهلاك ' + n(p.kgPerMm) + ' كجم/م²/مم حسب بيانات المنتج، لسمك إجمالي ' + round(tmm, 1) + ' مم']
    };
  }

  /* ---------------- حاسبة التغطية العامة ----------------
   * تستخدم للمعجون والدهارة والبرايمر والدهانات والعزل والجرافيت.
   * p = {
   *   rateMode: 'perM2'  (كمية لكل م² لكل طبقة: كجم/م² أو لتر/م²)
   *           | 'm2PerUnit' (م² لكل 1 كجم/لتر لكل طبقة)
   *           | 'm2PerPack' (م² لكل عبوة لكل طبقة)
   *   rate, coats, packSize, unit ('كجم' | 'لتر'), packName,
   *   surface (معامل حالة السطح ≥ 1), level (معامل درجة التسوية ≥ 1),
   *   waste (%), price (للعبوة), sell, name, materialId
   * }
   */
  function coverageCalc(p, area) {
    p = p || {};
    const coats = p.coats === '' || p.coats == null ? 1 : n(p.coats);
    const factor = (n(p.surface) || 1) * (n(p.level) || 1) * (1 + n(p.waste) / 100);
    const A = n(area);
    const packSize = n(p.packSize);
    let qty = 0, packs = 0, perPackArea = 0;
    const rate = n(p.rate);
    if (p.rateMode === 'm2PerPack') {
      packs = rate > 0 ? A * coats * factor / rate : 0;
      qty = packs * packSize;
      perPackArea = coats > 0 ? rate / coats : 0;
      packs = ceilSafe(packs);
    } else {
      const perM2 = p.rateMode === 'm2PerUnit' ? (rate > 0 ? 1 / rate : 0) : rate;
      qty = A * coats * perM2 * factor;
      packs = packSize > 0 ? ceilSafe(qty / packSize) : 0;
      perPackArea = perM2 * coats > 0 && packSize > 0 ? packSize / (perM2 * coats) : 0;
    }
    const unit = p.unit || 'كجم';
    // المساحة القابلة للتنفيذ بالعبوات المشتراة (بدون هالك)
    const executable = perPackArea * packs / ((n(p.surface) || 1) * (n(p.level) || 1));
    return {
      qty, packs, perPackArea, executable, coats, factor,
      materials: [{ key: p.key || 'cov', name: p.name || 'خامة', qty, unit, packs, packUnit: (p.packName || 'عبوة') + (packSize ? ' ' + packSize + ' ' + unit : ''), price: n(p.price), sell: p.sell === '' || p.sell == null ? null : n(p.sell), materialId: p.materialId || null }]
    };
  }

  /* ---------------- الشبك (فايبر / ممدد) ----------------
   * p = { mode: 'area' | 'strip', coverPct (% من المساحة يحتاج شبك), stripWidth (سم), overlap (%), rollArea (م² للفة), price, name }
   */
  function meshCalc(p, area, linear) {
    p = p || {};
    let meshArea;
    if (p.mode === 'strip') meshArea = n(linear) * n(p.stripWidth) / 100;
    else meshArea = n(area) * (p.coverPct === '' || p.coverPct == null ? 100 : n(p.coverPct)) / 100;
    meshArea *= 1 + n(p.overlap) / 100;
    const rollArea = n(p.rollArea);
    const rolls = rollArea > 0 ? ceilSafe(meshArea / rollArea) : 0;
    return {
      meshArea, rolls,
      materials: [{ key: 'mesh', name: p.name || 'شبك', qty: meshArea, unit: 'م²', packs: rolls, packUnit: 'لفة ' + rollArea + ' م²', price: n(p.price), sell: p.sell === '' || p.sell == null ? null : n(p.sell), materialId: p.materialId || null }]
    };
  }

  /* ---------------- خامات إضافية يدوية ----------------
   * x = { name, mode: 'fixed' | 'perM2' | 'perLm', qty, unit, price, sell, materialId }
   */
  function extrasCalc(list, area, linear) {
    return (list || []).filter(x => x && (x.name || n(x.qty))).map(x => {
      let q = n(x.qty);
      if (x.mode === 'perM2') q = q * n(area);
      else if (x.mode === 'perLm') q = q * n(linear);
      const packs = x.mode === 'fixed' || !x.mode ? q : ceilSafe(q);
      return { key: 'extra', name: x.name || 'خامة', qty: q, unit: x.unit || 'عدد', packs, packUnit: x.unit || 'عدد', price: n(x.price), sell: x.sell === '' || x.sell == null ? null : n(x.sell), materialId: x.materialId || null };
    });
  }

  /* ---------------- حساب خامات البند حسب نوع الحساب ---------------- */
  function materialsFor(calc, area, linear) {
    calc = calc || {};
    const type = calc.type || 'none';
    let res = { materials: [], notes: [] };
    if (type === 'cement') res = cementPlaster(calc.cement, area);
    else if (type === 'premix') res = premixPlaster(calc.premix, area);
    else if (type === 'coverage') res = coverageCalc(Object.assign({ key: 'main' }, calc.main), area);
    else if (type === 'graffiato') {
      const g = coverageCalc(Object.assign({ key: 'graffiato', name: 'جرافيت', packName: 'بستلة' }, calc.main), area);
      res = { materials: g.materials.slice(), notes: [], main: g };
      if (calc.primerOn !== false && calc.primer) {
        const pr = coverageCalc(Object.assign({ key: 'primer', name: 'برايمر', unit: 'لتر', packName: 'جالون' }, calc.primer), area);
        res.primer = pr;
        res.materials = res.materials.concat(pr.materials);
      }
      res.notes.push('معدل الاستهلاك حسب بيانات المنتج ومقاس الحبيبات — لا يوجد معدل موحد لكل أنواع الجرافيت');
    } else if (type === 'mesh') res = meshCalc(calc.mesh, area, linear);
    if (!res.notes) res.notes = [];
    // طبقة إضافية (مثلاً برايمر قبل المعجون) لأي نوع
    if (calc.secondOn && calc.second && type !== 'graffiato') {
      const s2 = coverageCalc(Object.assign({ key: 'second' }, calc.second), area);
      res.materials = res.materials.concat(s2.materials);
      res.second = s2;
    }
    if (calc.meshOn && calc.mesh && type !== 'mesh') {
      const ms = meshCalc(calc.mesh, area, linear);
      res.materials = res.materials.concat(ms.materials);
      res.meshRes = ms;
    }
    res.materials = res.materials.concat(extrasCalc(calc.extras, area, linear));
    return res;
  }

  /* ---------------- طرق المحاسبة ---------------- */
  const BILLING_UNITS = {
    m2: { name: 'بالمتر المربع', short: 'م²' },
    lm: { name: 'بالمتر الطولي', short: 'م.ط' },
    m3: { name: 'بالمتر المكعب', short: 'م³' },
    day: { name: 'باليومية', short: 'يوم' },
    piece: { name: 'بالقطعة / العدد', short: 'قطعة' },
    lump: { name: 'مقطوعية', short: 'مقطوعية' }
  };
  const SUPPLY_MODES = {
    labor: 'مصنعية فقط',
    supply: 'توريد خامات فقط',
    supply_install: 'توريد وتنفيذ',
    manufacture: 'تصنيع وتنفيذ'
  };

  /* ---------------- حساب البند ----------------
   * item = {
   *   measure | (zone measure عبر ctx.zoneMeasure), qtySource: 'area'|'walls'|'ceiling'|'linear',
   *   unit (طريقة المحاسبة), qtyManual, useManual,
   *   supply, laborRate, matMarkup (%), calc, progress (% منفذ)
   * }
   */
  function itemCalc(item, ctx) {
    item = item || {};
    ctx = ctx || {};
    const m = ctx.zoneMeasure || measureCalc(item.measure);
    let area;
    switch (item.qtySource) {
      case 'walls': area = m.wallsNet; break;
      case 'ceiling': area = m.ceiling; break;
      default: area = m.area;
    }
    if (item.areaPct !== '' && item.areaPct != null && n(item.areaPct) !== 100) area = area * n(item.areaPct) / 100;
    const linear = m.linear;
    const unit = item.unit || 'm2';
    let qty;
    if (item.useManual || unit === 'day' || unit === 'piece' || unit === 'lump') {
      qty = item.qtyManual === '' || item.qtyManual == null ? (unit === 'lump' ? 1 : 0) : n(item.qtyManual);
    } else if (unit === 'lm') qty = linear;
    else if (unit === 'm3') {
      const t = item.calc && item.calc.type === 'cement' ? n(item.calc.cement && item.calc.cement.thickness) * Math.max(1, n(item.calc.cement && item.calc.cement.layers) || 1)
        : item.calc && item.calc.type === 'premix' ? n(item.calc.premix && item.calc.premix.thickness) * Math.max(1, n(item.calc.premix && item.calc.premix.layers) || 1)
          : n(item.thicknessMm);
      qty = area * t / 1000;
    } else qty = area;

    // مساحة حساب الخامات: لو البند بالطولي والقياس طولي بدون تنمية، نستخدم المساحة المحسوبة إن وجدت
    const matArea = item.matAreaManual !== '' && item.matAreaManual != null && item.useMatArea ? n(item.matAreaManual) : area;
    const mres = materialsFor(item.calc, matArea, linear);
    const supply = item.supply || 'labor';
    const withMat = supply !== 'labor';
    const markup = n(item.matMarkup);
    let matCost = 0, matSell = 0;
    const materials = mres.materials.map(x => {
      const sell = x.sell != null ? x.sell : x.price * (1 + markup / 100);
      const cost = x.packs * x.price;
      const sv = x.packs * sell;
      matCost += cost; matSell += sv;
      return Object.assign({}, x, { sellUnit: sell, cost, sellValue: sv });
    });
    const laborRate = n(item.laborRate);
    const labor = supply === 'supply' ? 0 : qty * laborRate;
    const total = labor + (withMat ? matSell : 0);
    const progress = Math.min(100, Math.max(0, item.progress === '' || item.progress == null ? 0 : n(item.progress)));
    return {
      measure: m, area, matArea, linear, qty, unit, unitShort: (BILLING_UNITS[unit] || {}).short || '',
      materials, notes: mres.notes || [], raw: mres,
      labor, matCost: withMat ? matCost : 0, matSell: withMat ? matSell : 0,
      matCostClient: withMat ? 0 : matCost, // خامات على العميل (تقدير للعرض فقط)
      withMat, total, progress, doneValue: total * progress / 100,
      unitPrice: qty > 0 ? total / qty : 0
    };
  }

  /* ---------------- المخزن ----------------
   * movement = { materialId, type, qty, price, date, projectId }
   * purchase/return: + | sale/issue/waste: − | adjust: بإشارة الكمية
   */
  const MOVE_TYPES = {
    purchase: { name: 'شراء / وارد', sign: 1 },
    return: { name: 'مرتجع من مشروع', sign: 1 },
    sale: { name: 'بيع', sign: -1 },
    issue: { name: 'صرف لمشروع', sign: -1 },
    waste: { name: 'هالك / تالف', sign: -1 },
    adjust: { name: 'تسوية جرد', sign: 0 }
  };
  function moveSign(mv) { const t = MOVE_TYPES[mv.type]; return !t ? 0 : t.sign === 0 ? 1 : t.sign; }
  function stockFor(material, movements) {
    const mv = (movements || []).filter(x => x.materialId === material.id);
    let qty = n(material.openQty);
    let inQty = 0, inVal = 0, sold = 0, salesValue = 0, issued = 0, wasted = 0;
    mv.forEach(x => {
      const q = n(x.qty) * moveSign(x);
      qty += q;
      if (x.type === 'purchase') { inQty += n(x.qty); inVal += n(x.qty) * n(x.price); }
      if (x.type === 'sale') { sold += n(x.qty); salesValue += n(x.qty) * n(x.price); }
      if (x.type === 'issue') issued += n(x.qty);
      if (x.type === 'waste') wasted += n(x.qty);
    });
    const avgCost = inQty > 0 ? inVal / inQty : n(material.buyPrice);
    const unitCost = n(material.buyPrice) || avgCost;
    return {
      qty, avgCost, unitCost, value: Math.max(0, qty) * unitCost,
      sold, salesValue, cogs: sold * unitCost, salesProfit: salesValue - sold * unitCost,
      issued, wasted, wasteValue: wasted * unitCost,
      low: material.minQty !== '' && material.minQty != null && qty <= n(material.minQty)
    };
  }

  /* ---------------- حساب المشروع ----------------
   * ctx = { movements, materials, workerPays }
   */
  function projectCalc(p, ctx) {
    p = p || {};
    ctx = ctx || {};
    const zones = {};
    (p.zones || []).forEach(z => { zones[z.id] = measureCalc(z.measure); });
    const items = (p.items || []).map(it => ({ item: it, res: itemCalc(it, { zoneMeasure: it.zoneId && zones[it.zoneId] ? zones[it.zoneId] : null }) }));
    const itemsTotal = sum(items, x => x.res.total);
    const labor = sum(items, x => x.res.labor);
    const matSell = sum(items, x => x.res.matSell);
    const matCostEst = sum(items, x => x.res.matCost);
    const doneValue = sum(items, x => x.res.doneValue);
    const contract = p.pricing === 'lump' ? n(p.lumpPrice) : itemsTotal;
    const discount = n(p.discount);
    const net = Math.max(0, contract - discount);
    const received = sum(p.payments, x => x.amount);
    const remaining = net - received;

    // المصروفات
    const expenses = p.expenses || [];
    const expByCat = {};
    expenses.forEach(e => { expByCat[e.category || 'أخرى'] = (expByCat[e.category || 'أخرى'] || 0) + n(e.amount); });
    const expMaterials = sum(expenses.filter(e => e.category === 'خامات'), e => e.amount);
    const expOther = sum(expenses.filter(e => e.category !== 'خامات'), e => e.amount);
    const expPaid = sum(expenses.filter(e => e.paid !== false), e => e.amount);

    // العمالة
    const wages = sum(p.labor, l => l.fixed ? n(l.amount) : n(l.days) * n(l.rate) + n(l.extra));
    const wagesPaid = sum((ctx.workerPays || []).filter(w => w.projectId === p.id), w => w.amount);

    // الخامات المصروفة من المخزن
    const matsById = {};
    (ctx.materials || []).forEach(mt => { matsById[mt.id] = mt; });
    let issuedValue = 0;
    (ctx.movements || []).filter(mv => mv.projectId === p.id && (mv.type === 'issue' || mv.type === 'return')).forEach(mv => {
      const mt = matsById[mv.materialId];
      const unitCost = n(mv.price) || (mt ? n(mt.buyPrice) : 0);
      issuedValue += (mv.type === 'issue' ? 1 : -1) * n(mv.qty) * unitCost;
    });

    const matMode = p.matCostMode || 'estimate';
    const matCost = matMode === 'actual' ? issuedValue + expMaterials : matCostEst;
    // في الوضع التقديري: مشتريات الخامات المسجلة كمصروف لا تُحسب مرتين (تكلفة الخامات من المقايسة)
    const costs = matCost + wages + expOther;
    // التدفق النقدي للمشروع: المقبوض من العميل − المدفوع فعلاً (مصروفات مدفوعة + المدفوع للعمال)
    const cashOut = expPaid + wagesPaid;
    // المراحل
    const phases = (p.phases || []).map(ph => {
      const its = items.filter(x => (x.item.phase || '') === ph.key);
      const tot = sum(its, x => x.res.total);
      const done = sum(its, x => x.res.doneValue);
      const paid = sum((p.payments || []).filter(x => x.phase === ph.key), x => x.amount);
      const price = ph.price !== '' && ph.price != null && p.pricing === 'phase' ? n(ph.price) : tot;
      return { key: ph.key, name: ph.name, status: ph.status || 'pending', items: its.length, total: price, done, paid, remaining: price - paid };
    });
    const contractFinal = p.pricing === 'phase' ? sum(phases, x => x.total) : contract;
    const netFinal = p.pricing === 'phase' ? Math.max(0, contractFinal - discount) : net;
    const profitFinal = netFinal - costs;
    // المستخلص
    const retention = n(p.retentionPct);
    const doneNet = p.pricing !== 'items' && p.pricing && itemsTotal > 0 ? doneValue / itemsTotal * netFinal : doneValue - (itemsTotal > 0 ? doneValue / itemsTotal * discount : 0);
    const retained = doneNet * retention / 100;
    return {
      zones, items, itemsTotal, labor, matSell, matCostEst, matCost, issuedValue,
      contract: contractFinal, discount, net: netFinal, received, remaining: netFinal - received,
      expenses: sum(expenses, e => e.amount), expByCat, expMaterials, expOther,
      wages, wagesPaid, wagesDue: wages - wagesPaid,
      costs, profit: profitFinal, margin: netFinal > 0 ? profitFinal / netFinal * 100 : 0,
      cashIn: received, cashOut, cashBalance: received - cashOut,
      phases, doneValue: doneNet, retained, certificateDue: doneNet - retained - received,
      matMode
    };
  }

  /* ---------------- تجميع الخامات المطلوبة لمشروع ---------------- */
  function projectMaterials(pc) {
    const map = {};
    pc.items.forEach(x => {
      x.res.materials.forEach(mt => {
        const k = (mt.materialId || '') + '|' + mt.name + '|' + mt.packUnit;
        if (!map[k]) map[k] = { name: mt.name, materialId: mt.materialId, unit: mt.unit, packUnit: mt.packUnit, qty: 0, packs: 0, cost: 0, sellValue: 0, onClient: 0 };
        map[k].qty += mt.qty;
        map[k].packs += mt.packs;
        map[k].cost += mt.cost;
        map[k].sellValue += mt.sellValue;
        if (!x.res.withMat) map[k].onClient += mt.packs;
      });
    });
    return Object.values(map);
  }

  /* ---------------- العمال ---------------- */
  function workerCalc(worker, projects, workerPays) {
    let days = 0, earned = 0;
    (projects || []).forEach(p => (p.labor || []).forEach(l => {
      if (l.workerId !== worker.id) return;
      days += n(l.days);
      earned += l.fixed ? n(l.amount) : n(l.days) * n(l.rate) + n(l.extra);
    }));
    const pays = (workerPays || []).filter(w => w.workerId === worker.id);
    const paid = sum(pays, w => w.amount);
    const advances = sum(pays.filter(w => w.type === 'advance'), w => w.amount);
    return { days, earned, paid, advances, due: earned - paid };
  }

  return {
    n, round, sum, ceilSafe, toM, convertLen,
    SHAPES, shapeArea, shapesTotal,
    DEDUCT_MODES, openingsCalc,
    measureCalc,
    cementPlaster, premixPlaster, coverageCalc, meshCalc, extrasCalc, materialsFor,
    BILLING_UNITS, SUPPLY_MODES, itemCalc,
    MOVE_TYPES, stockFor,
    projectCalc, projectMaterials, workerCalc
  };
});
