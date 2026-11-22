/*
 * أرزقي | Arzoqi — البناء وأعمال المباني: محرك الحسابات.
 * دوال صافية (من غير واجهة ولا تخزين) — نفس الملف بيشتغل في المتصفح (window.MasonCalc) وفي اختبارات Node.
 *
 * أداة حصر وتقدير تكاليف — مش بديل عن المهندس. مفيش أي توصيات إنشائية (سمك حائط حامل، أحمال، أساسات، تسليح…).
 * مفيش أرقام ثابتة: مقاسات الطوب ونسب الخلط ومعامل الحجم الجاف وكثافة الأسمنت ووزن الشيكارة والأسعار كلها من المستخدم،
 * ولو حاجة ناقصة للحساب بنقول إيه الناقص بدل ما نخترع رقم.
 *
 * عدد الطوب في المتر المربع = 1 ÷ ((ضلع الوش الأول + العراميس الرأسية) × (ضلع الوش التاني + العراميس الأفقية))
 * والوش اللي بيبان بيتحدد من طريقة البناء:
 *   نص طوبة: الطول × الارتفاع (السمك = عرض الطوبة)   طوبة: العرض × الارتفاع (السمك = طول الطوبة)
 *   طوبة ونص: طوبة + نص طوبة                          طوبتين: طوبة + طوبة
 *   سكينة (على الحرف): الطول × العرض (السمك = ارتفاع الطوبة)
 * © 2026 أحمد حسن عبدالله
 */
(function (root) {
  'use strict';

  function num(v) {
    if (typeof v === 'number') return isFinite(v) && v > 0 ? v : 0;
    var s = String(v == null ? '' : v).trim()
      .replace(/[٠-٩]/g, function (c) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(c); })
      .replace(/[۰-۹]/g, function (c) { return '۰۱۲۳۴۵۶۷۸۹'.indexOf(c); })
      .replace(/[٬\s]/g, '');
    if (s.charAt(0) === '-') return 0;
    s = /^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s) ? s.replace(/,/g, '') : s.replace(/[٫,]/g, '.');
    s = s.replace(/[^\d.]/g, '');
    var n = parseFloat(s);
    return isFinite(n) && n > 0 ? n : 0;
  }
  function round(n, d) { var p = Math.pow(10, d == null ? 4 : d); n = Number(n) || 0; return Math.round(n * p + (n >= 0 ? 1e-9 : -1e-9)) / p; }
  function money(n) { return round(n, 2); }
  function count(v) { return (v == null || String(v).trim() === '') ? 1 : num(v); }
  function ceil(n) { return n > 0 ? Math.ceil(n - 1e-7) : 0; }
  var TO_M = { mm: 0.001, cm: 0.01, m: 1 };
  function toM(v, u) { return num(v) * (TO_M[u] || 1); }
  function arr(x) { return Array.isArray(x) ? x : []; }
  function sum(a, f) { return a.reduce(function (s, x) { return s + (f ? f(x) : x); }, 0); }

  // ---------------- هندسة الطوبة ----------------
  var LAYOUTS = {
    half: { label: 'نص طوبة', w: ['s'] },
    one: { label: 'طوبة', w: ['h'] },
    oneHalf: { label: 'طوبة ونص', w: ['h', 's'] },
    two: { label: 'طوبتين', w: ['h', 'h'] },
    edge: { label: 'سكينة (على الحرف)', w: ['e'] }
  };
  var LAYOUT_ORDER = ['half', 'one', 'oneHalf', 'two', 'edge'];
  function brickM(b) { b = b || {}; var u = b.unit || 'cm'; return { L: toM(b.L, u), W: toM(b.W, u), H: toM(b.H, u) }; }
  // jh = العرموس الأفقي، jv = العرموس الرأسي (بالمتر)
  function geom(b, layout, jh, jv) {
    var d = brickM(b), lay = LAYOUTS[layout] ? layout : 'half';
    var faces = LAYOUTS[lay].w.map(function (k) {
      if (k === 's') return { a: d.L, b: d.H, t: d.W };
      if (k === 'h') return { a: d.W, b: d.H, t: d.L };
      return { a: d.L, b: d.W, t: d.H };
    });
    var ok = d.L > 0 && d.W > 0 && d.H > 0;
    var perM2 = ok ? sum(faces, function (f) { return 1 / ((f.a + jv) * (f.b + jh)); }) : 0;
    var thickness = sum(faces, function (f) { return f.t; }) + Math.max(faces.length - 1, 0) * jv;
    return { ok: ok, layout: lay, perM2: perM2, thickness: thickness, unitVol: d.L * d.W * d.H, nominalVol: (d.L + jv) * (d.W + jv) * (d.H + jh), dims: d };
  }

  // ---------------- خلطة المونة: أسمنت / جير / رمل ----------------
  // m: { c, l, s (نسبة الخلط), dryFactor (معامل الحجم الجاف), density (كجم/م³ للأسمنت), bagKg, wc (نسبة المية للأسمنت بالوزن) }
  function mix(wet, m) {
    m = m || {};
    var c = num(m.c), l = num(m.l), s = num(m.s), df = num(m.dryFactor), dens = num(m.density), bag = num(m.bagKg), wc = num(m.wc);
    var r = { wet: round(wet, 4), missing: [] };
    if (!(c + l + s > 0)) r.missing.push('نسبة الخلط');
    if (!df) r.missing.push('معامل الحجم الجاف');
    if (r.missing.length) return r;
    var dry = wet * df, t = c + l + s;
    r.dry = round(dry, 4);
    r.cementM3 = round(dry * c / t, 4); r.limeM3 = round(dry * l / t, 4); r.sandM3 = round(dry * s / t, 4);
    if (c > 0) {
      if (dens) { r.cementKg = round(r.cementM3 * dens, 2); if (bag) r.bags = ceil(r.cementKg / bag); else r.missing.push('وزن الشيكارة'); if (wc) r.waterL = round(r.cementKg * wc, 1); }
      else r.missing.push('كثافة الأسمنت (كجم/م³)');
    }
    return r;
  }
  // أسعار الخامات للمونة/المحارة/الأرضيات: p { cement (سعر), cementUnit 'bag'|'ton', sand, sandUnit 'm3'|'load', loadM3, lime (م³), extra (مية وإضافات — مبلغ) }
  function mixCost(x, p) {
    p = p || {}; var lines = [];
    if (x.bags || x.cementKg) {
      var cu = p.cementUnit === 'ton' ? 'ton' : 'bag';
      var q = cu === 'ton' ? round((x.cementKg || 0) / 1000, 3) : (x.bags || 0);
      lines.push({ key: 'cement', name: 'أسمنت', qty: q, unit: cu === 'ton' ? 'طن' : 'شيكارة', price: num(p.cement), cost: money(q * num(p.cement)) });
    }
    if (x.sandM3) {
      var load = p.sandUnit === 'load' && num(p.loadM3) ? num(p.loadM3) : 0;
      var sq = load ? round(x.sandM3 / load, 3) : x.sandM3;
      lines.push({ key: 'sand', name: 'رمل', qty: sq, unit: load ? 'نقلة' : 'م³', price: num(p.sand), cost: money(sq * num(p.sand)) });
    }
    if (x.limeM3) lines.push({ key: 'lime', name: 'جير', qty: x.limeM3, unit: 'م³', price: num(p.lime), cost: money(x.limeM3 * num(p.lime)) });
    if (num(p.extra)) lines.push({ key: 'extra', name: 'مية وإضافات', qty: 1, unit: 'مبلغ', price: num(p.extra), cost: money(num(p.extra)) });
    return lines;
  }

  // ---------------- المصنعية ----------------
  var LABOR = { sqm: 'بالمتر المربع', m3: 'بالمتر المكعب', brick: 'بعدد الطوب', lm: 'بالمتر الطولي', piece: 'بالقطعة', lump: 'مقطوعية', daily: 'باليومية', stages: 'حسب المراحل' };
  // q: الكميات المتاحة { sqm, m3, brick, lm, piece }
  function labor(l, q) {
    l = l || {}; q = q || {};
    var m = LABOR[l.method] ? l.method : 'sqm', r = { method: m, label: LABOR[m], qty: 0, price: num(l.price), amount: 0 };
    if (m === 'lump') { r.amount = num(l.amount); r.qty = 1; }
    else if (m === 'daily') { r.days = num(l.days); r.workers = num(l.workers) || 1; r.perWorker = l.perWorker !== false; r.qty = r.days; r.amount = r.days * r.price * (r.perWorker ? r.workers : 1); }
    else if (m === 'stages') { r.stages = arr(l.stages).map(function (s) { return { name: (s && s.name) || '', amount: money(num(s && s.amount)) }; }); r.amount = sum(r.stages, function (s) { return s.amount; }); r.qty = r.stages.length; }
    else if (m === 'piece') { r.qty = l.qty != null && String(l.qty).trim() !== '' ? num(l.qty) : (q.piece || 0); r.amount = r.qty * r.price; }
    else { r.qty = round(q[m] || 0, 4); r.amount = r.qty * r.price; }
    r.amount = money(r.amount);
    return r;
  }

  // ---------------- الطوب: سعر وعبوات ----------------
  // b.priceUnit: piece | thousand | pack ، b.perPack (عدد الطوب في البالتة/العبوة)
  function brickBuy(b, final) {
    var per = num(b.perPack), price = num(b.price), pu = b.priceUnit || 'piece';
    var r = { final: final, packs: per ? ceil(final / per) : 0 };
    r.purchased = per ? r.packs * per : final;
    r.cost = pu === 'thousand' ? money(r.purchased / 1000 * price) : pu === 'pack' ? (per ? money(r.packs * price) : 0) : money(r.purchased * price);
    r.priceMissing = pu === 'pack' && !per;
    return r;
  }

  // ---------------- البند: بناء حوائط (طوب / بلوك / أي وحدة) ----------------
  function walls(it) {
    var u = it.dimUnit || 'm', warnings = [];
    var jhD = it.jh, jvD = it.jv;
    var list = arr(it.walls).map(function (w, i) {
      var b = w.brick || {}, jh = toM(w.jh != null && String(w.jh).trim() !== '' ? w.jh : jhD, 'cm'), jv = toM(w.jv != null && String(w.jv).trim() !== '' ? w.jv : jvD, 'cm');
      var g = geom(b, w.layout || 'half', jh, jv);
      var L = toM(w.L, u), H = toM(w.H, u), n = count(w.count);
      var openings = arr(w.openings).map(function (o) { var a = toM(o.w, u) * toM(o.h, u) * count(o.count); return { name: (o && o.name) || 'فتحة', area: round(a, 4) }; });
      var gross = L * H * n, openOne = sum(openings, function (o) { return o.area; }), open = openOne * n;
      var r = { i: i, name: w.name || ('حائط ' + (i + 1)), kind: w.kind || '', brickKey: (b.id || b.name || '—') + '|' + g.layout, brickName: b.name || 'طوب', layout: g.layout,
        L: L, H: H, count: n, gross: round(gross, 4), open: round(open, 4), openings: openings, geomOk: g.ok, perM2: round(g.perM2, 4), thickness: round(g.thickness, 4), jh: jh, jv: jv };
      r.error = open > gross + 1e-9;
      if (r.error) warnings.push('مساحة الفتحات في «' + r.name + '» أكبر من مساحة الحائط');
      if (!g.ok) warnings.push('مقاسات الطوبة في «' + r.name + '» ناقصة');
      r.net = r.error ? 0 : round(gross - open, 4);
      r.volume = round(r.net * g.thickness, 5);
      var exact = it.countMethod === 'volume' ? (g.nominalVol ? r.volume / g.nominalVol : 0) : r.net * g.perM2;
      r.exact = round(exact, 4);
      r.brickVol = round(exact * g.unitVol, 5);
      r.lm = round(L * n, 4);
      r.brick = b;
      return r;
    });
    // التجميع حسب نوع الطوب وطريقة البناء (السمك) — مش رقم واحد لكل الأنواع
    var groups = [], gmap = {};
    list.forEach(function (w) {
      var g = gmap[w.brickKey];
      if (!g) { g = gmap[w.brickKey] = { key: w.brickKey, name: w.brickName, layout: w.layout, layoutLabel: LAYOUTS[w.layout].label, thickness: w.thickness, perM2: w.perM2, brick: w.brick, net: 0, exact: 0, walls: 0 }; groups.push(g); }
      g.net = round(g.net + w.net, 4); g.exact = round(g.exact + w.exact, 4); g.walls++;
    });
    var wst = it.waste || {};
    groups.forEach(function (g) {
      g.base = ceil(g.exact);
      g.waste = wst.mode === 'pct' ? ceil(g.base * Math.min(num(wst.pct), 100) / 100) : wst.mode === 'qty' ? Math.round(num((wst.qty || {})[g.key])) : 0;
      g.final = g.base + g.waste;
      var buy = brickBuy(g.brick, g.final);
      g.packs = buy.packs; g.purchased = buy.purchased; g.cost = buy.cost; g.priceMissing = buy.priceMissing;
    });
    var q = { sqm: round(sum(list, function (w) { return w.net; }), 4), m3: round(sum(list, function (w) { return w.volume; }), 5), brick: sum(groups, function (g) { return g.base; }), lm: round(sum(list, function (w) { return w.lm; }), 4), piece: sum(groups, function (g) { return g.final; }) };
    // المونة
    var mo = it.mortar || {}, wet = 0, how = '';
    if (mo.method === 'manual') { wet = num(mo.manual); how = 'حجم مكتوب يدوي'; }
    else if (mo.method === 'rate') {
      var rate = num(mo.rate);
      if (mo.basis === 'thousand') { wet = q.brick / 1000 * rate; how = 'معدل ' + rate + ' م³ لكل 1000 طوبة'; } else { wet = q.sqm * rate; how = 'معدل ' + rate + ' م³ لكل م²'; }
    } else {
      wet = sum(list, function (w) { return Math.max(0, w.volume - w.brickVol); });
      how = 'تقدير: حجم الحائط − الحجم الخارجي للطوب (الفراغات اللي جوه الطوب المفرغ مش محسوبة مونة)';
    }
    var mw = Math.min(num(mo.wastePct), 100);
    var wetT = wet * (1 + mw / 100);
    var mx = mix(wetT, it.mixSpec);
    mx.how = how; mx.wetBase = round(wet, 4); mx.wastePct = mw;
    var materials = groups.map(function (g) { return { key: 'brick:' + g.key, name: g.name + ' (' + g.layoutLabel + ')', qty: g.purchased, unit: 'طوبة', price: num(g.brick.price), cost: g.cost }; })
      .concat(mixCost(mx, it.prices));
    return { kind: 'walls', walls: list, groups: groups, q: q, gross: round(sum(list, function (w) { return w.gross; }), 4), open: round(sum(list, function (w) { return w.open; }), 4), mortar: mx, materials: materials, warnings: warnings };
  }

  // ---------------- المونة لوحدها ----------------
  function mortarItem(it) {
    var mo = it.mortar || {}, wet = 0, how;
    if (mo.method === 'rate') { wet = num(mo.area) * num(mo.rate); how = 'المساحة × معدل الاستهلاك'; }
    else if (mo.method === 'volume') { wet = num(mo.volume); how = 'حجم البناء (المونة كنسبة منه)'; wet = wet * Math.min(num(mo.pctOfVolume), 100) / 100; }
    else { wet = num(mo.manual); how = 'حجم مكتوب يدوي'; }
    var mw = Math.min(num(mo.wastePct), 100), mx = mix(wet * (1 + mw / 100), it.mixSpec);
    mx.how = how; mx.wetBase = round(wet, 4); mx.wastePct = mw;
    return { kind: 'mortar', mortar: mx, materials: mixCost(mx, it.prices), q: { m3: round(wet, 4) }, warnings: [] };
  }

  // ---------------- المحارة والتلييس ----------------
  function surfaces(it, u) {
    return arr(it.surfaces).map(function (s, i) {
      var n = count(s.count), gross = toM(s.L, u) * toM(s.H, u) * n, open = sum(arr(s.openings), function (o) { return toM(o.w, u) * toM(o.h, u) * count(o.count); }) * n;
      return { name: s.name || ('مساحة ' + (i + 1)), kind: s.kind || '', gross: round(gross, 4), open: round(open, 4), error: open > gross + 1e-9, net: open > gross + 1e-9 ? 0 : round(gross - open, 4), lm: round(toM(s.L, u) * n, 4) };
    });
  }
  function plaster(it) {
    var u = it.dimUnit || 'm', list = surfaces(it, u), warnings = [];
    list.forEach(function (s) { if (s.error) warnings.push('مساحة الفتحات في «' + s.name + '» أكبر من المساحة'); });
    var area = round(sum(list, function (s) { return s.net; }), 4), t = toM(it.thickness, 'cm'), w = Math.min(num(it.wastePct), 100);
    var vol = area * t, materials = [], mx = null;
    if (it.matMethod === 'rate') {
      var rc = num(it.rates && it.rates.cement), rs = num(it.rates && it.rates.sand);
      var bags = ceil(area * rc * (1 + w / 100)), sand = round(area * rs * (1 + w / 100), 4);
      mx = { how: 'معدل استهلاك لكل م²', bags: bags, sandM3: sand, missing: rc || rs ? [] : ['معدل الاستهلاك'] };
      if (bags) mx.cementKg = 0;
      materials = mixCost({ bags: bags, sandM3: sand }, Object.assign({}, it.prices, { cementUnit: 'bag' }));
    } else {
      mx = mix(vol * (1 + w / 100), it.mixSpec); mx.how = 'المساحة × السمك'; mx.wetBase = round(vol, 4);
      materials = mixCost(mx, it.prices);
    }
    return { kind: 'plaster', surfaces: list, mortar: mx, area: area, volume: round(vol, 4), materials: materials, q: { sqm: area, m3: round(vol, 4), lm: round(sum(list, function (s) { return s.lm; }), 4) }, warnings: warnings };
  }

  // ---------------- الأرضيات وطبقات التسوية ----------------
  function floor(it) {
    var u = it.dimUnit || 'm';
    var zones = arr(it.zones).map(function (z, i) { var a = toM(z.L, u) * toM(z.W, u) * count(z.count); return { name: z.name || ('منطقة ' + (i + 1)), area: round(a, 4) }; });
    var area = round(sum(zones, function (z) { return z.area; }), 4), materials = [], warnings = [], vol = 0;
    var layers = arr(it.layers).map(function (l, i) {
      var t = toM(l.thickness, 'cm'), w = Math.min(num(l.wastePct), 100), v = area * t, r = { name: l.name || ('طبقة ' + (i + 1)), material: l.material || '', thickness: t, volume: round(v, 4), method: l.method || 'm3' };
      vol += v;
      if (r.method === 'mix') { r.mix = mix(v * (1 + w / 100), Object.assign({}, it.mixSpec, { c: l.c, l: 0, s: l.s })); r.lines = mixCost(r.mix, it.prices); if (r.mix.missing.length) warnings.push(r.name + ': ناقص ' + r.mix.missing.join('، ')); }
      else if (r.method === 'rate') { var q = round(area * num(l.rate) * (1 + w / 100), 4); r.lines = [{ key: 'layer' + i, name: r.name + (r.material ? ' — ' + r.material : ''), qty: q, unit: l.rateUnit || 'وحدة', price: num(l.price), cost: money(q * num(l.price)) }]; }
      else { var vq = round(v * (1 + w / 100), 4); r.lines = [{ key: 'layer' + i, name: r.name + (r.material ? ' — ' + r.material : ''), qty: vq, unit: 'م³', price: num(l.price), cost: money(vq * num(l.price)) }]; }
      materials = materials.concat(r.lines);
      return r;
    });
    return { kind: 'floor', zones: zones, layers: layers, area: area, materials: materials, q: { sqm: area, m3: round(vol, 4) }, warnings: warnings };
  }

  // ---------------- الحجر والواجهات ----------------
  function stone(it) {
    var u = it.dimUnit || 'm', list = surfaces(it, u), warnings = [];
    list.forEach(function (s) { if (s.error) warnings.push('مساحة الفتحات في «' + s.name + '» أكبر من المساحة'); });
    var area = round(sum(list, function (s) { return s.net; }), 4), lm = round(sum(list, function (s) { return s.lm; }), 4);
    var m = it.unit === 'lm' ? 'lm' : it.unit === 'piece' ? 'piece' : 'sqm';
    var base = m === 'sqm' ? area : m === 'lm' ? lm : num(it.pieces);
    var w = Math.min(num(it.wastePct), 100), qty = m === 'piece' ? ceil(base * (1 + w / 100)) : round(base * (1 + w / 100), 4);
    var unitLbl = m === 'sqm' ? 'م²' : m === 'lm' ? 'م.ط' : 'قطعة';
    var materials = [{ key: 'stone', name: it.stoneName || 'حجر', qty: qty, unit: unitLbl, price: num(it.stonePrice), cost: money(qty * num(it.stonePrice)) }];
    if (num(it.mortarCost)) materials.push({ key: 'mortar', name: 'مونة ولصق', qty: 1, unit: 'مبلغ', price: num(it.mortarCost), cost: money(num(it.mortarCost)) });
    return { kind: 'stone', surfaces: list, area: area, base: round(base, 4), qty: qty, unitLbl: unitLbl, materials: materials, q: { sqm: area, lm: lm, piece: m === 'piece' ? num(it.pieces) : 0 }, warnings: warnings };
  }

  // ---------------- التكسير والترميم ----------------
  function demo(it) {
    var u = it.dimUnit || 'm', n = count(it.count);
    var L = toM(it.L, u), H = toM(it.H, u), T = toM(it.T, 'cm');
    var area = round(L * H * n, 4), vol = round(area * T, 5), materials = [];
    if (num(it.repairCost)) materials.push({ key: 'repair', name: 'مواد الإصلاح', qty: 1, unit: 'مبلغ', price: num(it.repairCost), cost: money(num(it.repairCost)) });
    return { kind: 'demo', area: area, volume: vol, materials: materials, q: { sqm: area, m3: vol, lm: round(L * n, 4), piece: n }, warnings: [] };
  }

  // ---------------- العمال واليومية (تكلفة عليك) ----------------
  function workers(rows) {
    var list = arr(rows).map(function (w) {
      w = w || {}; var mode = w.mode === 'team' || w.mode === 'lump' ? w.mode : 'each', n = num(w.count) || 1;
      var days = num(w.days), rate = num(w.rate), hrs = num(w.hours), hr = num(w.hourRate);
      var gross = mode === 'lump' ? num(w.amount) : (mode === 'each' ? n * days * rate + n * hrs * hr : days * rate + hrs * hr);
      gross = money(gross); var adv = money(num(w.advance));
      return { name: w.name || '', kind: w.kind || '', mode: mode, count: n, days: days, gross: gross, advance: adv, due: money(gross - adv) };
    });
    return { rows: list, gross: money(sum(list, function (r) { return r.gross; })), advance: money(sum(list, function (r) { return r.advance; })), due: money(sum(list, function (r) { return r.due; })) };
  }

  // ---------------- مصنعية لوحدها (كميات بيكتبها المستخدم) ----------------
  function laborOnly(it) {
    return { kind: 'labor', materials: [], q: { sqm: num(it.sqm), m3: num(it.m3), brick: num(it.bricks), lm: num(it.lm), piece: num(it.pieces) }, warnings: [] };
  }

  // ---------------- أي بند ----------------
  var KINDS = { walls: walls, mortar: mortarItem, plaster: plaster, floor: floor, stone: stone, demo: demo, labor: laborOnly };
  function item(it) {
    it = it || {};
    var f = KINDS[it.kind] || walls, r = f(it);
    r.labor = labor(it.labor, r.q);
    r.extras = arr(it.extras).map(function (e) { return { name: (e && e.name) || '', amount: money(num(e && e.amount)) }; });
    r.extrasTotal = money(sum(r.extras, function (e) { return e.amount; }));
    r.matCost = money(sum(r.materials, function (m) { return m.cost; }));
    r.matBilled = it.matBilled ? r.matCost : 0;
    r.total = money(r.labor.amount + r.extrasTotal + r.matBilled);
    return r;
  }

  // ---------------- المشروع ----------------
  var COST_TYPES = { mat: 'خامات', waste: 'هالك', labor: 'عمالة', transport: 'نقل وتحميل', equip: 'معدات', cons: 'مياه ومستهلكات', other: 'مصاريف أخرى' };
  var COST_ORDER = ['mat', 'waste', 'labor', 'transport', 'equip', 'cons', 'other'];
  function cost(c, matBase) {
    c = c || {};
    var type = COST_TYPES[c.type] ? c.type : 'other', r = { type: type, billed: !!c.billed, qty: num(c.qty), price: num(c.price), wastePct: Math.min(num(c.wastePct), 100) };
    if (c.mode === 'pct') { r.pct = Math.min(num(c.pct), 100); r.base = money(matBase || 0); r.amount = money(r.base * r.pct / 100); }
    else if (c.mode === 'amount') r.amount = money(num(c.amount));
    else r.amount = money(r.qty * r.price);
    r.wasteQty = round(r.qty * r.wastePct / 100, 4); r.wasteCost = money(r.wasteQty * r.price);
    r.total = money(r.amount + r.wasteCost);
    return r;
  }
  function job(j) {
    j = j || {};
    var items = arr(j.items).map(item);
    var itemMat = sum(items, function (x) { return x.matCost; });
    var raw = arr(j.costs);
    var matBase = itemMat + sum(raw, function (c) { return c && c.type === 'mat' && c.mode !== 'pct' && c.mode !== 'amount' ? num(c.qty) * num(c.price) : 0; });
    var costs = raw.map(function (c) { return cost(c, matBase); });
    var laborT = money(sum(items, function (x) { return x.labor.amount; })), extras = money(sum(items, function (x) { return x.extrasTotal; }));
    var matBilled = money(sum(items, function (x) { return x.matBilled; }));
    var billedCosts = money(sum(costs, function (c) { return c.billed ? c.total : 0; }));
    var subtotal = money(laborT + extras + matBilled + billedCosts);
    var d = j.discount || {};
    var discount = d.type === 'percent' ? money(subtotal * Math.min(num(d.value), 100) / 100) : money(Math.min(num(d.value), subtotal));
    var total = money(subtotal - discount), paid = money(sum(arr(j.payments), function (p) { return num(p && p.amount); }));
    var byType = { mat: money(itemMat) };
    COST_ORDER.forEach(function (t) { if (byType[t] == null) byType[t] = 0; });
    costs.forEach(function (c) { byType[c.type] = money(byType[c.type] + c.amount); if (c.wasteCost) byType.waste = money(byType.waste + c.wasteCost); });
    var totalCost = money(itemMat + sum(costs, function (c) { return c.total; }));
    // الكميات على المشروع كله: الطوب حسب النوع والسمك، والأسمنت والرمل
    var bricks = {}, cement = 0, sand = 0, lime = 0;
    items.forEach(function (x) {
      (x.groups || []).forEach(function (g) { var b = bricks[g.key] || (bricks[g.key] = { name: g.name, layoutLabel: g.layoutLabel, thickness: g.thickness, net: 0, base: 0, waste: 0, final: 0, purchased: 0, packs: 0 }); ['net', 'base', 'waste', 'final', 'purchased', 'packs'].forEach(function (k) { b[k] = round(b[k] + (g[k] || 0), 4); }); });
      var mxs = [x.mortar].concat((x.layers || []).map(function (l) { return l.mix; }));
      mxs.forEach(function (m) { if (!m) return; cement += m.bags || 0; sand += m.sandM3 || 0; lime += m.limeM3 || 0; });
    });
    return { items: items, costs: costs, labor: laborT, extras: extras, matBilled: matBilled, billedCosts: billedCosts, subtotal: subtotal, discount: discount, total: total, paid: paid, remaining: money(total - paid),
      byType: byType, totalCost: totalCost, profit: money(total - totalCost), margin: total > 0 ? round((total - totalCost) / total * 100, 1) : 0, matBase: money(matBase),
      bricks: Object.keys(bricks).map(function (k) { return bricks[k]; }), cementBags: cement, sandM3: round(sand, 4), limeM3: round(lime, 4) };
  }

  var api = { LAYOUTS: LAYOUTS, LAYOUT_ORDER: LAYOUT_ORDER, LABOR: LABOR, COST_TYPES: COST_TYPES, COST_ORDER: COST_ORDER,
    num: num, round: round, money: money, toM: toM, ceil: ceil, geom: geom, mix: mix, mixCost: mixCost, labor: labor, brickBuy: brickBuy,
    walls: walls, mortarItem: mortarItem, plaster: plaster, floor: floor, stone: stone, demo: demo, workers: workers, item: item, cost: cost, job: job };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MasonCalc = api;
})(typeof window !== 'undefined' ? window : this);
