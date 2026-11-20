/*
 * أرزقي للأرضيات — محرك الحسابات
 * HESABATI FLOORING — Calculation engine
 * © 2026 أحمد حسن عبدالله - جميع الحقوق محفوظة.
 *
 * هذا الملف مستقل تماماً عن الواجهة: دوال حسابية نقية (مدخلات ← مخرجات)
 * بدون أي تعامل مع الصفحة أو التخزين، علشان تتختبر لوحدها (tests/calc.test.js).
 *
 * الوحدات المستخدمة داخل الحسابات:
 *   الأطوال الكبيرة بالمتر (م)، مقاسات البلاط والقطع بالسنتيمتر (سم)،
 *   السُمك بالسنتيمتر، الحلول/الفواصل بالمليمتر، المساحة م²، الحجم م³.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Calc = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ================= أدوات رقمية ================= */
  // رقم آمن: أي قيمة غير رقمية = 0
  function n(v) {
    if (typeof v === 'string') v = v.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[٫,]/g, '.');
    const x = parseFloat(v);
    return isFinite(x) ? x : 0;
  }
  // رقم غير سالب (المقاسات والكميات والأسعار لا تكون سالبة)
  function nn(v) { return Math.max(0, n(v)); }
  // تقريب عشري دقيق يتخلص من أخطاء الكسور العشرية (0.1 + 0.2)
  function round(v, d) {
    const f = Math.pow(10, d == null ? 2 : d);
    return Math.round((n(v) + Number.EPSILON) * f) / f;
  }
  // تقريب لأعلى بعد إزالة الضوضاء العشرية: 10.0000000001 ← 10 وليس 11
  function ceilSafe(v) { return Math.ceil(round(v, 6)); }
  function sum(arr, fn) { return round((arr || []).reduce((s, x) => s + n(fn ? fn(x) : x), 0), 6); }
  function pct(v) { return nn(v) / 100; }

  /* ================= أشكال المساحات ================= */
  const SHAPES = {
    rect: { label: 'مستطيل / مربع', fields: [['l', 'الطول (م)'], ['w', 'العرض (م)']] },
    triangle: { label: 'مثلث', fields: [['b', 'القاعدة (م)'], ['h', 'الارتفاع (م)']] },
    trapezoid: { label: 'شبه منحرف', fields: [['a', 'الضلع الأول (م)'], ['b', 'الضلع الموازي (م)'], ['h', 'المسافة بينهم (م)']] },
    circle: { label: 'دائرة', fields: [['d', 'القطر (م)']] },
    semicircle: { label: 'نصف دائرة', fields: [['d', 'القطر (م)']] },
    walls: { label: 'حوائط غرفة كاملة', fields: [['l', 'طول الغرفة (م)'], ['w', 'عرض الغرفة (م)'], ['h', 'ارتفاع الحائط (م)']] },
    wall: { label: 'حائط واحد', fields: [['l', 'طول الحائط (م)'], ['h', 'الارتفاع (م)']] },
    manual: { label: 'مساحة معروفة', fields: [['area', 'المساحة (م²)']] }
  };
  const AREA_KINDS = { floor: 'أرضيات', wall: 'حوائط', ceiling: 'أسقف', other: 'أخرى' };

  function shapeArea(shape, d) {
    d = d || {};
    switch (shape) {
      case 'rect': return nn(d.l) * nn(d.w);
      case 'triangle': return 0.5 * nn(d.b) * nn(d.h);
      case 'trapezoid': return (nn(d.a) + nn(d.b)) / 2 * nn(d.h);
      case 'circle': return Math.PI * Math.pow(nn(d.d), 2) / 4;
      case 'semicircle': return Math.PI * Math.pow(nn(d.d), 2) / 8;
      case 'walls': return 2 * (nn(d.l) + nn(d.w)) * nn(d.h);
      case 'wall': return nn(d.l) * nn(d.h);
      case 'manual': return nn(d.area);
      default: return 0;
    }
  }
  // المحيط (يفيد في حساب الوزرات)
  function shapePerimeter(shape, d) {
    d = d || {};
    switch (shape) {
      case 'rect': return 2 * (nn(d.l) + nn(d.w));
      case 'circle': return Math.PI * nn(d.d);
      case 'semicircle': return Math.PI * nn(d.d) / 2 + nn(d.d);
      case 'walls': return 2 * (nn(d.l) + nn(d.w));
      default: return 0;
    }
  }

  /**
   * مساحة جزء واحد (غرفة / حائط / سقف) مع الخصومات
   * entry = { name, kind, shape, dims:{...}, count, deductions:[{name, w, h, count}] }
   */
  function areaEntry(entry) {
    const e = entry || {};
    const count = e.count == null || e.count === '' ? 1 : nn(e.count);
    const gross = round(shapeArea(e.shape || 'rect', e.dims) * count, 6);
    const deductions = (e.deductions || []).map(x => {
      const c = x.count == null || x.count === '' ? 1 : nn(x.count);
      return { name: x.name || 'خصم', area: round(nn(x.w) * nn(x.h) * c, 6), width: round(nn(x.w) * c, 6) };
    });
    const deduct = sum(deductions, x => x.area);
    const rawNet = round(gross - deduct, 6);
    const perimeter = round(shapePerimeter(e.shape || 'rect', e.dims) * count, 6);
    return {
      gross: round(gross, 4), deduct: round(deduct, 4), net: round(Math.max(0, rawNet), 4),
      perimeter: round(perimeter, 4), deductions,
      overDeducted: rawNet < 0 // الخصومات أكبر من المساحة = خطأ في الإدخال
    };
  }
  function areaTotals(entries) {
    const rows = (entries || []).map(e => Object.assign({ entry: e }, areaEntry(e)));
    const byKind = {};
    Object.keys(AREA_KINDS).forEach(k => { byKind[k] = 0; });
    rows.forEach(r => { const k = r.entry.kind && byKind[r.entry.kind] != null ? r.entry.kind : 'floor'; byKind[k] = round(byKind[k] + r.net, 4); });
    return {
      rows, byKind,
      gross: round(sum(rows, r => r.gross), 4),
      deduct: round(sum(rows, r => r.deduct), 4),
      total: round(sum(rows, r => r.net), 4),
      perimeter: round(sum(rows, r => r.perimeter), 4)
    };
  }

  /* ================= السلالم ================= */
  /**
   * i = { steps, width(م), tread(سم), riser(سم), includeRisers, skirtSides(0/1/2),
   *       skirtType:'stepped'|'sloped', landingL, landingW, landings }
   */
  function stairs(i) {
    i = i || {};
    const steps = Math.floor(nn(i.steps));
    const w = nn(i.width), d = nn(i.tread) / 100, h = nn(i.riser) / 100;
    const treadArea = steps * w * d;
    const riserArea = i.includeRisers === false ? 0 : steps * w * h;
    const landings = i.landings == null || i.landings === '' ? (nn(i.landingL) && nn(i.landingW) ? 1 : 0) : nn(i.landings);
    const landingArea = nn(i.landingL) * nn(i.landingW) * landings;
    const sides = Math.min(2, Math.floor(nn(i.skirtSides)));
    const perStepSkirt = i.skirtType === 'sloped' ? Math.sqrt(d * d + h * h) : (d + h);
    const skirting = sides * steps * perStepSkirt;
    const nosing = steps * w; // حلية / ناصية مقدمة كل نائمة
    return {
      steps, treadArea: round(treadArea, 4), riserArea: round(riserArea, 4), landingArea: round(landingArea, 4),
      totalArea: round(treadArea + riserArea + landingArea, 4),
      skirtingLm: round(skirting, 3), nosingLm: round(nosing, 3),
      treadPieces: steps, riserPieces: i.includeRisers === false ? 0 : steps,
      totalRise: round(steps * h, 3), totalRun: round(steps * d, 3)
    };
  }

  /* ================= البلاط / السيراميك / البورسلين ================= */
  /**
   * i = { tileL, tileW (سم), pcsPerBox, boxArea(م² اختياري), area(م²), waste(%),
   *       priceMode:'box'|'sqm'|'piece', price, laborPrice(للمتر) }
   */
  function tiles(i) {
    i = i || {};
    const errors = [];
    const area = nn(i.area);
    const tileArea = nn(i.tileL) * nn(i.tileW) / 10000;
    if (!(tileArea > 0)) errors.push('اكتب مقاس البلاطة');
    if (!(area > 0)) errors.push('اكتب المساحة المطلوبة');
    const pcs = Math.floor(nn(i.pcsPerBox));
    const boxArea = nn(i.boxArea) > 0 ? nn(i.boxArea) : (pcs > 0 ? pcs * tileArea : 0);
    const needed = area * (1 + pct(i.waste));
    const tilesNeeded = tileArea > 0 ? ceilSafe(needed / tileArea) : 0;
    const boxes = boxArea > 0 ? ceilSafe(needed / boxArea) : 0;
    const tilesBought = boxes && pcs ? boxes * pcs : tilesNeeded;
    const purchasedArea = boxes ? boxes * boxArea : tilesNeeded * tileArea;
    const price = nn(i.price);
    let material = 0;
    if (i.priceMode === 'sqm') material = purchasedArea * price;
    else if (i.priceMode === 'piece') material = tilesBought * price;
    else material = (boxes || 0) * price;
    const labor = area * nn(i.laborPrice);
    return {
      errors, ok: !errors.length,
      tileArea: round(tileArea, 6), boxArea: round(boxArea, 4),
      neededArea: round(needed, 4), wasteArea: round(needed - area, 4),
      tilesNeeded, boxes, tilesBought,
      purchasedArea: round(purchasedArea, 4), extraArea: round(purchasedArea - area, 4),
      material: round(material, 4), labor: round(labor, 4), total: round(material + labor, 4)
    };
  }

  /* ================= الباركيه والأرضيات الخشبية ================= */
  const PARQUET_PATTERNS = {
    straight: { label: 'مستقيم', waste: 7 },
    diagonal: { label: 'مائل (دياجونال)', waste: 12 },
    herringbone: { label: 'Herringbone (سنبلة)', waste: 15 },
    chevron: { label: 'Chevron (شيفرون)', waste: 15 }
  };
  /**
   * i = { area, waste, plankL, plankW (سم), perPack, packArea, priceMode:'pack'|'sqm', price,
   *   foamRoll(م² للفة), foamPrice, barrierRoll, barrierPrice, overlap(%),
   *   perimeter(م.ط), doors(م.ط تُخصم), skirtLen(م للقطعة), skirtWaste(%), skirtPrice(للقطعة),
   *   laborPrice(للمتر), skirtLabor(للمتر الطولي), accessories:[{name, qty, price}] }
   */
  function parquet(i) {
    i = i || {};
    const errors = [];
    const area = nn(i.area);
    if (!(area > 0)) errors.push('اكتب مساحة الأرضية');
    const plankArea = nn(i.plankL) * nn(i.plankW) / 10000;
    const perPack = Math.floor(nn(i.perPack));
    const packArea = nn(i.packArea) > 0 ? nn(i.packArea) : (perPack && plankArea ? perPack * plankArea : 0);
    if (!(packArea > 0) && !(plankArea > 0)) errors.push('اكتب مساحة العبوة أو مقاس اللوح');
    const needed = area * (1 + pct(i.waste));
    const packs = packArea > 0 ? ceilSafe(needed / packArea) : 0;
    const planks = packs && perPack ? packs * perPack : (plankArea > 0 ? ceilSafe(needed / plankArea) : 0);
    const purchasedArea = packs ? packs * packArea : planks * plankArea;
    const coverArea = area * (1 + pct(i.overlap));
    const foamRolls = nn(i.foamRoll) > 0 ? ceilSafe(coverArea / nn(i.foamRoll)) : 0;
    const barrierRolls = nn(i.barrierRoll) > 0 ? ceilSafe(coverArea / nn(i.barrierRoll)) : 0;
    const skirtLm = Math.max(0, nn(i.perimeter) - nn(i.doors));
    const skirtPieces = nn(i.skirtLen) > 0 ? ceilSafe(skirtLm * (1 + pct(i.skirtWaste)) / nn(i.skirtLen)) : 0;
    const flooring = i.priceMode === 'sqm' ? purchasedArea * nn(i.price) : packs * nn(i.price);
    const foam = foamRolls * nn(i.foamPrice);
    const barrier = barrierRolls * nn(i.barrierPrice);
    const skirting = skirtPieces * nn(i.skirtPrice);
    const accessories = sum(i.accessories || [], a => nn(a.qty) * nn(a.price));
    const labor = area * nn(i.laborPrice) + skirtLm * nn(i.skirtLabor);
    const material = flooring + foam + barrier + skirting + accessories;
    return {
      errors, ok: !errors.length,
      plankArea: round(plankArea, 6), packArea: round(packArea, 4), neededArea: round(needed, 4),
      packs, planks, purchasedArea: round(purchasedArea, 4), extraArea: round(purchasedArea - area, 4),
      foamRolls, barrierRolls, skirtLm: round(skirtLm, 3), skirtPieces,
      cost: { flooring: round(flooring, 4), foam: round(foam, 4), barrier: round(barrier, 4), skirting: round(skirting, 4), accessories: round(accessories, 4) },
      material: round(material, 4), labor: round(labor, 4), total: round(material + labor, 4)
    };
  }

  /* ================= الإنترلوك ================= */
  /**
   * i = { area, perSqm (قطعة/م² — يُكتب حسب التصميم) أو pieceL,pieceW (سم), waste, priceMode:'piece'|'sqm', price,
   *   excArea (افتراضي = المساحة), excDepth(سم), excPrice(للمتر المكعب),
   *   fillThk(سم), fillPrice, baseThk(سم) طبقة السن, basePrice, sandThk(سم), sandPrice, factor (معامل الانتفاش/الدمك),
   *   curbLen(م.ط), curbPiece(سم طول البردورة), curbPrice(للقطعة), curbLabor(للمتر الطولي),
   *   laborPrice(للمتر), compaction(مقطوعية), transport(مقطوعية) }
   */
  function interlock(i) {
    i = i || {};
    const errors = [];
    const area = nn(i.area);
    if (!(area > 0)) errors.push('اكتب المساحة');
    let perSqm = nn(i.perSqm);
    const fromSize = nn(i.pieceL) * nn(i.pieceW) > 0 ? 10000 / (nn(i.pieceL) * nn(i.pieceW)) : 0;
    if (!(perSqm > 0)) perSqm = fromSize;
    if (!(perSqm > 0)) errors.push('اكتب عدد القطع في المتر أو مقاس القطعة');
    const pieces = perSqm > 0 ? ceilSafe(area * perSqm * (1 + pct(i.waste))) : 0;
    const purchasedArea = perSqm > 0 ? pieces / perSqm : 0;
    const factor = nn(i.factor) > 0 ? nn(i.factor) : 1;
    const excArea = nn(i.excArea) > 0 ? nn(i.excArea) : area;
    const excVol = excArea * nn(i.excDepth) / 100;
    const fillVol = area * nn(i.fillThk) / 100 * factor;
    const baseVol = area * nn(i.baseThk) / 100 * factor;
    const sandVol = area * nn(i.sandThk) / 100 * factor;
    const curbLen = nn(i.curbLen);
    const curbPieces = nn(i.curbPiece) > 0 ? ceilSafe(curbLen / (nn(i.curbPiece) / 100)) : 0;
    const tilesCost = i.priceMode === 'sqm' ? purchasedArea * nn(i.price) : pieces * nn(i.price);
    const cost = {
      pavers: tilesCost,
      excavation: excVol * nn(i.excPrice),
      fill: fillVol * nn(i.fillPrice),
      base: baseVol * nn(i.basePrice),
      sand: sandVol * nn(i.sandPrice),
      curbs: curbPieces * nn(i.curbPrice)
    };
    const material = cost.pavers + cost.fill + cost.base + cost.sand + cost.curbs;
    const labor = area * nn(i.laborPrice) + curbLen * nn(i.curbLabor) + cost.excavation;
    const extras = nn(i.compaction) + nn(i.transport);
    Object.keys(cost).forEach(k => { cost[k] = round(cost[k], 4); });
    return {
      errors, ok: !errors.length,
      perSqm: round(perSqm, 3), perSqmFromSize: round(fromSize, 3), pieces, purchasedArea: round(purchasedArea, 4),
      excVol: round(excVol, 4), fillVol: round(fillVol, 4), baseVol: round(baseVol, 4), sandVol: round(sandVol, 4),
      curbLen: round(curbLen, 3), curbPieces, cost,
      material: round(material, 4), labor: round(labor, 4), extras: round(extras, 4),
      total: round(material + labor + extras, 4)
    };
  }

  /* ================= الرخام والجرانيت ================= */
  /**
   * i = { pieces:[{name, l, w (سم), count}], extraArea(م² مباشرة), thickness(سم), density(طن/م³), waste,
   *   price(للمتر المسطح), cutLm, cutPrice, polishArea, polishPrice, edgeLm, edgePrice,
   *   laborPrice(للمتر), transport, lifting }
   */
  function marble(i) {
    i = i || {};
    const rows = (i.pieces || []).map(p => {
      const c = p.count == null || p.count === '' ? 1 : Math.floor(nn(p.count));
      return { name: p.name || '', l: nn(p.l), w: nn(p.w), count: c, area: round(nn(p.l) * nn(p.w) / 10000 * c, 6) };
    });
    const netArea = sum(rows, r => r.area) + nn(i.extraArea);
    const errors = netArea > 0 ? [] : ['أضف مقاسات القطع أو اكتب المساحة'];
    const purchaseArea = netArea * (1 + pct(i.waste));
    const density = nn(i.density) > 0 ? nn(i.density) : 2.7;
    const weight = purchaseArea * nn(i.thickness) / 100 * density;
    const polishArea = i.polishArea === '' || i.polishArea == null ? 0 : nn(i.polishArea);
    const cost = {
      stone: purchaseArea * nn(i.price),
      cutting: nn(i.cutLm) * nn(i.cutPrice),
      polishing: polishArea * nn(i.polishPrice),
      edges: nn(i.edgeLm) * nn(i.edgePrice),
      labor: netArea * nn(i.laborPrice),
      transport: nn(i.transport), lifting: nn(i.lifting)
    };
    const material = cost.stone;
    const labor = cost.cutting + cost.polishing + cost.edges + cost.labor;
    const extras = cost.transport + cost.lifting;
    Object.keys(cost).forEach(k => { cost[k] = round(cost[k], 4); });
    return {
      errors, ok: !errors.length, rows,
      pieceCount: rows.reduce((s, r) => s + r.count, 0),
      netArea: round(netArea, 4), purchaseArea: round(purchaseArea, 4), wasteArea: round(purchaseArea - netArea, 4),
      weightTon: round(weight, 3), cost,
      material: round(material, 4), labor: round(labor, 4), extras: round(extras, 4), total: round(material + labor + extras, 4)
    };
  }

  /* ================= المواد اللاصقة والترويبة ================= */
  /**
   * معادلة الترويبة المعتمدة عند الشركات المصنعة:
   *   كجم/م² = ((أ + ب) ÷ (أ × ب)) × عرض الفاصل × عمق الفاصل × الكثافة
   *   (أ، ب: ضلعا البلاطة بالمليمتر — العرض والعمق بالمليمتر — الكثافة ≈ 1.6)
   */
  function groutRate(tileLcm, tileWcm, jointMm, depthMm, density) {
    const a = nn(tileLcm) * 10, b = nn(tileWcm) * 10;
    if (!(a > 0 && b > 0)) return 0;
    return ((a + b) / (a * b)) * nn(jointMm) * nn(depthMm) * (nn(density) > 0 ? nn(density) : 1.6);
  }
  /**
   * i = { area, mode:'rate'|'grout', rate (كجم أو لتر لكل م²), tileL, tileW (سم), joint(مم), depth(مم), density,
   *       packSize (كجم أو لتر), waste, packPrice }
   */
  function adhesive(i) {
    i = i || {};
    const errors = [];
    const area = nn(i.area);
    if (!(area > 0)) errors.push('اكتب مساحة التنفيذ');
    const rate = i.mode === 'grout' ? groutRate(i.tileL, i.tileW, i.joint, i.depth, i.density) : nn(i.rate);
    if (!(rate > 0)) errors.push(i.mode === 'grout' ? 'اكتب مقاس البلاطة وعرض وعمق الفاصل' : 'اكتب معدل الاستهلاك لكل متر (من تعليمات المنتج)');
    const qty = area * rate * (1 + pct(i.waste));
    const packs = nn(i.packSize) > 0 ? ceilSafe(qty / nn(i.packSize)) : 0;
    const cost = packs * nn(i.packPrice);
    return { errors, ok: !errors.length, rate: round(rate, 4), qty: round(qty, 3), packs, cost: round(cost, 4) };
  }

  /* ================= محرك المحاسبة: بنود المشروع ================= */
  // أساس الحساب (إزاي بيتحسب البند)
  const BASIS = {
    measure: 'بالكمية × سعر الوحدة',
    daily: 'باليومية',
    lump: 'مقطوعية / مقاولة (مبلغ ثابت)',
    stage: 'بالمرحلة (نسبة إنجاز)'
  };
  // نطاق العمل
  const SCOPES = { labor: 'تركيب فقط (مصنعية)', supply: 'توريد فقط (خامات)', both: 'توريد وتركيب' };
  const UNITS = ['م²', 'م.ط', 'قطعة', 'درجة', 'عدد', 'كرتونة', 'عبوة', 'شيكارة', 'كجم', 'طن', 'م³', 'لتر', 'وحدة', 'يوم', 'مقطوعية'];
  // طرق المحاسبة الجاهزة (14 طريقة) — كل طريقة = أساس + وحدة + نطاق، وكلها قابلة للتعديل في البند
  const METHODS = [
    { id: 'sqm', label: 'بالمتر المربع', basis: 'measure', unit: 'م²' },
    { id: 'lm', label: 'بالمتر الطولي', basis: 'measure', unit: 'م.ط' },
    { id: 'piece', label: 'بالقطعة', basis: 'measure', unit: 'قطعة' },
    { id: 'step', label: 'بالدرجة (قائمة ونائمة)', basis: 'measure', unit: 'درجة' },
    { id: 'daily', label: 'باليومية', basis: 'daily', unit: 'يوم' },
    { id: 'contract', label: 'بالمقاولة الكاملة', basis: 'lump', unit: 'مقطوعية' },
    { id: 'lump', label: 'بالمقطوعية', basis: 'lump', unit: 'مقطوعية' },
    { id: 'stage', label: 'بالمرحلة', basis: 'stage', unit: 'مرحلة' },
    { id: 'supply', label: 'توريد فقط', basis: 'measure', unit: 'م²', scope: 'supply' },
    { id: 'install', label: 'تركيب فقط', basis: 'measure', unit: 'م²', scope: 'labor' },
    { id: 'both', label: 'توريد وتركيب', basis: 'measure', unit: 'م²', scope: 'both' },
    { id: 'count', label: 'بالكمية أو العدد', basis: 'measure', unit: 'عدد' },
    { id: 'ton', label: 'بالطن / الوزن', basis: 'measure', unit: 'طن' },
    { id: 'm3', label: 'بالمتر المكعب', basis: 'measure', unit: 'م³' }
  ];

  /**
   * حساب بند واحد.
   * item = { basis, scope, unit, qty, laborPrice, materialPrice,     (measure)
   *          workers, days, wage, materialAmount,                     (daily)
   *          amount, materialAmount,                                  (lump)
   *          amount, progress }                                       (stage)
   * يُرجع: labor (مصنعية)، material (خامات)، total (قيمة البند على العميل)، executed (المنفذ فعلياً)
   */
  function item(it) {
    it = it || {};
    const scope = SCOPES[it.scope] ? it.scope : 'labor';
    const hasLabor = scope !== 'supply', hasMat = scope !== 'labor';
    let labor = 0, material = 0, executed = null;
    switch (it.basis) {
      case 'daily':
        labor = hasLabor ? (it.workers == null || it.workers === '' ? 1 : nn(it.workers)) * nn(it.days) * nn(it.wage) : 0;
        material = hasMat ? nn(it.materialAmount) : 0;
        break;
      case 'lump':
        if (scope === 'supply') material = nn(it.amount);
        else { labor = nn(it.amount); material = hasMat ? nn(it.materialAmount) : 0; }
        break;
      case 'stage': {
        const v = nn(it.amount);
        if (scope === 'supply') material = v; else labor = v;
        executed = v * Math.min(100, nn(it.progress)) / 100;
        break;
      }
      default: // measure
        labor = hasLabor ? nn(it.qty) * nn(it.laborPrice) : 0;
        material = hasMat ? nn(it.qty) * nn(it.materialPrice) : 0;
    }
    const total = labor + material;
    return {
      labor: round(labor, 4), material: round(material, 4), total: round(total, 4),
      executed: round(executed == null ? total : executed, 4),
      unitPrice: it.basis === 'measure' || !it.basis ? round((hasLabor ? nn(it.laborPrice) : 0) + (hasMat ? nn(it.materialPrice) : 0), 4) : null
    };
  }
  function itemQtyText(it, fmtNum) {
    const f = fmtNum || (v => String(round(v, 3)));
    switch (it.basis) {
      case 'daily': return `${f(it.workers == null || it.workers === '' ? 1 : nn(it.workers))} عامل × ${f(nn(it.days))} يوم`;
      case 'lump': return 'مقطوعية';
      case 'stage': return `مرحلة (${f(Math.min(100, nn(it.progress)))}% منفذ)`;
      default: return `${f(nn(it.qty))} ${it.unit || ''}`.trim();
    }
  }

  /* ================= المستندات (فواتير / عروض أسعار / مستخلصات) ================= */
  /**
   * doc = { rows:[{qty, price}], discount, additions:[{name, amount}], paid, previous, deductions }
   * للمستخلص: previous = ما تم صرفه سابقاً، deductions = استقطاعات (تأمين / ضمان ...)
   */
  function docTotals(doc) {
    doc = doc || {};
    const rows = (doc.rows || []).map(r => round(nn(r.qty) * nn(r.price), 4));
    const subtotal = sum(rows);
    const additions = sum(doc.additions || [], a => nn(a.amount));
    const discount = Math.min(nn(doc.discount), subtotal + additions);
    const total = round(subtotal + additions - discount, 4);
    const previous = nn(doc.previous), deductions = nn(doc.deductions);
    const due = round(Math.max(0, total - previous - deductions), 4); // صافي المستحق (للمستخلص)
    const paid = nn(doc.paid);
    const base = doc.type === 'extract' ? due : total;
    return { rows, subtotal: round(subtotal, 4), additions: round(additions, 4), discount: round(discount, 4), total, previous, deductions, due, paid, remaining: round(base - paid, 4) };
  }

  return {
    n, nn, round, ceilSafe, sum,
    SHAPES, AREA_KINDS, shapeArea, shapePerimeter, areaEntry, areaTotals,
    stairs, tiles, PARQUET_PATTERNS, parquet, interlock, marble, groutRate, adhesive,
    BASIS, SCOPES, UNITS, METHODS, item, itemQtyText, docTotals
  };
});
