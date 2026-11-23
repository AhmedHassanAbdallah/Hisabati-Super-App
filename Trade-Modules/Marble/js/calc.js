/*
 * أرزقي | Arzoqi — الرخام والجرانيت والأحجار: محرك الحسابات.
 * دوال صافية (من غير واجهة ولا تخزين) — نفس الملف بيشتغل في المتصفح (window.MarbleCalc) وفي اختبارات Node.
 *
 * المقاسات بتتكتب بوحدة البند (مم/سم/م) وبتتحول لمتر في الحساب؛ مقاسات اللوح في المكتبة بالسنتيمتر؛ السمك بالسنتيمتر.
 * المطابخ: الأطوال على الحيطة من بره، وكل ركن بيتحسب مرة واحدة (الطول − العمق) — ودي طريقة حصر مكتوبة في النتيجة.
 * السلالم: كل درجة ممكن يبقى ليها مقاس لوحدها. الأشكال اللي مالهاش معادلة مضبوطة مساحتها بتتكتب يدوي.
 * عدد الألواح بالمساحة «تقديري» ومكتوب كده؛ العدد الفعلي من «تقسيم الألواح» (Guillotine أفضل مساحة) بالسلاح والهامش
 * واتجاه العروق، وبيستخدم البواقي والألواح المتاحة قبل اللوح الجديد، والبواقي اللي تنفع بتتسجل في المخزون مش هالك.
 * مفيش قواعد ثابتة مفترضة: الأسعار والكثافة وطريقة التثبيت ونسب الهالك بيكتبها المستخدم.
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
  function ceil(n) { return n > 0 ? Math.ceil(n - 1e-7) : 0; }
  function cnt(v) { return (v == null || String(v).trim() === '') ? 1 : num(v); }
  function has(v) { return v != null && String(v).trim() !== ''; }
  function arr(x) { return Array.isArray(x) ? x : []; }
  function sum(a, f) { return a.reduce(function (s, x) { return s + (f ? f(x) : x); }, 0); }
  function fq(n) { return (Number(n) || 0).toLocaleString('en-US', { maximumFractionDigits: 3 }); }

  var TO_M = { mm: 0.001, cm: 0.01, m: 1 };
  function toM(v, u) { return num(v) * (TO_M[u] || 0.01); }
  function toMM(v, u) { return toM(v, u) * 1000; }
  function out(o) { o = o || {}; o.rows = o.rows || []; o.warn = o.warn || []; o.sug = (o.sug || []).filter(function (s) { return s.qty > 0; }); o.metrics = o.metrics || {}; return o; }
  function S(key, name, qty, unit, cat, libId, price) { var s = { key: key, name: name, qty: round(qty, 3), unit: unit || 'قطعة', cat: cat || 'acc', lib: name }; if (libId) s.libId = libId; if (price != null && price !== '') s.price = num(price); return s; }
  function matOf(ctx, id) { return arr((ctx || {}).lib).find(function (x) { return x.id === id; }) || null; }
  function matName(m) { return m ? m.name + (num(m.thick) ? ' ' + fq(num(m.thick)) + ' سم' : '') : 'خامة (اختار من المكتبة)'; }
  // مقاس اللوح من الخامة (أو من مقاس بنفس السمك لو الخامة ليها أكتر من مقاس) — بالمتر
  function slabOf(m, thick) {
    if (!m) return null;
    var sz = arr(m.sizes).find(function (z) { return thick && num(z.t) === num(thick) && num(z.L) && num(z.W); }) || { L: m.slabL, W: m.slabW, price: m.slabPrice, cost: m.slabCost, t: m.thick };
    var L = num(sz.L) / 100, W = num(sz.W) / 100;   // مقاسات اللوح في المكتبة بالسنتيمتر
    return L && W ? { L: L, W: W, area: L * W, price: num(sz.price), cost: num(sz.cost), t: num(sz.t) } : null;
  }

  // ====================================================================
  // الأشكال: المساحة ومحيط الحواف المحتمل والإطار المستطيل (للقص)
  // ====================================================================
  var SHAPES = { rect: 'مستطيل', square: 'مربع', tri: 'مثلث', trap: 'شبه منحرف', circle: 'دائرة', semi: 'نص دائرة', corner: 'قطع زاوية', L: 'شكل L', U: 'شكل U', curve: 'منحني / غير منتظم', custom: 'مساحة يدوي' };
  function shape(p, u) {
    var sh = p.shape || 'rect', L = toM(p.L, u), W = toM(p.W, u), A = toM(p.A, u), B = toM(p.B, u), D = toM(p.D, u), r = { area: 0, box: [L, W], how: '', ok: true };
    if (sh === 'rect') { r.area = L * W; r.how = fq(L) + ' × ' + fq(W); }
    else if (sh === 'square') { r.area = L * L; r.box = [L, L]; r.how = fq(L) + '²'; }
    else if (sh === 'tri') { r.area = L * W / 2; r.how = fq(L) + ' × ' + fq(W) + ' ÷ 2'; }
    else if (sh === 'trap') { r.area = (L + A) / 2 * W; r.box = [Math.max(L, A), W]; r.how = '(' + fq(L) + ' + ' + fq(A) + ') ÷ 2 × ' + fq(W); }
    else if (sh === 'circle') { r.area = Math.PI * D * D / 4; r.box = [D, D]; r.how = 'π × ' + fq(D) + '² ÷ 4'; }
    else if (sh === 'semi') { r.area = Math.PI * D * D / 8; r.box = [D, D / 2]; r.how = 'π × ' + fq(D) + '² ÷ 8'; }
    else if (sh === 'corner') { r.area = Math.max(L * W - A * B / 2, 0); r.how = fq(L) + ' × ' + fq(W) + ' − ' + fq(A) + ' × ' + fq(B) + ' ÷ 2'; }
    else if (sh === 'L') { r.area = L * W + A * B; r.box = [Math.max(L, A), W + B]; r.how = fq(L) + '×' + fq(W) + ' + ' + fq(A) + '×' + fq(B); }
    else if (sh === 'U') { r.area = L * W + 2 * A * B; r.box = [L, W + B]; r.how = fq(L) + '×' + fq(W) + ' + 2 × ' + fq(A) + '×' + fq(B); }
    else { r.area = num(p.manual); r.ok = r.area > 0; r.how = 'مساحة مكتوبة يدوي'; if (!L || !W) r.box = [Math.sqrt(r.area), Math.sqrt(r.area)]; }
    if (sh === 'curve' && !num(p.manual)) { r.ok = false; r.how = 'اكتب المساحة يدوي للشكل المنحني'; }
    r.area = round(r.area, 4);
    return r;
  }
  function thickOf(p, u) { return num(p.T) ? num(p.T) : 0; } // السمك بالسنتيمتر دايماً

  // ====================================================================
  // القطع (حاسبة عامة + مداخل وحمامات وحوائط وديكورات وبوابات وكاونترات)
  // ====================================================================
  function piecesCore(rows, inp, ctx, o, label) {
    var u = inp.unit || 'cm', byMat = {}, area = 0, edge = 0, cuts = 0, n = 0, kg = 0, parts = [];
    arr(rows).forEach(function (p, i) {
      var c = cnt(p.count), s = shape(p, u); if (!c) return;
      if (!s.ok) { o.warn.push((p.name || 'قطعة ' + (i + 1)) + ': ' + s.how); return; }
      if (!s.area) return;
      var mid = p.mat || inp.mat || '', m = matOf(ctx, mid), a = s.area * c, e = num(p.edge) * c, h = num(p.holes) * c;
      area += a; edge += e; cuts += h; n += c;
      var t = num(p.T) || (m ? num(m.thick) : 0), dens = m ? num(m.density) : 0;
      if (t && dens) kg += a * t / 100 * dens;
      var g = byMat[mid] || (byMat[mid] = { m: m, area: 0, t: t }); g.area += a;
      if (p.edgeType && e) { var k = 'e:' + p.edgeType; o._edges[k] = (o._edges[k] || 0) + e; }
      if (h) { var hk = 'h:' + (p.holeType || 'فتحة'); o._holes[hk] = (o._holes[hk] || 0) + h; }
      parts.push({ name: (p.name || 'قطعة ' + (i + 1)), L: round(s.box[0] * 1000, 1), W: round(s.box[1] * 1000, 1), count: c, grain: p.grain === 'lock' || p.grain === 'طولي', matId: mid, match: p.match || '', seq: p.seq || '' });
      o.rows.push([(p.name || label + ' ' + (i + 1)) + (p.place ? ' — ' + p.place : '') + (SHAPES[p.shape] && p.shape !== 'rect' ? ' (' + SHAPES[p.shape] + ')' : ''), fq(round(a, 4)) + ' م²' + (e ? ' · حافة ' + fq(round(e, 3)) + ' م' : ''), s.how + (c > 1 ? ' × ' + c : '') + (m ? ' — ' + m.name : '')]);
    });
    return { area: area, edge: edge, cuts: cuts, n: n, kg: kg, byMat: byMat, parts: parts };
  }
  // الخامة: المساحة + الهالك ← الألواح (لو مقاس اللوح معروف) أو م²
  function matSug(o, byMat, inp, ctx) {
    var wp = num(inp.waste), slabs = 0, req = 0;
    Object.keys(byMat).forEach(function (k) {
      var g = byMat[k], m = g.m, need = g.area * (1 + wp / 100), sl = slabOf(m, g.t), use = Math.min(num(inp.usable) || 100, 100) / 100;
      req += need;
      if (wp) o.rows.push(['الهالك ' + fq(wp) + '% — ' + matName(m), fq(round(g.area * wp / 100, 4)) + ' م²', fq(round(g.area, 4)) + ' × ' + fq(wp) + '%']);
      if (sl && inp.basis === 'slab') {
        var ns = ceil(need / (sl.area * use)); slabs += ns;
        o.rows.push(['ألواح ' + matName(m), ns + ' لوح ' + fq(round(sl.L * 100, 1)) + '×' + fq(round(sl.W * 100, 1)) + ' سم', '⌈' + fq(round(need, 3)) + ' ÷ (' + fq(round(sl.area, 4)) + (use < 1 ? ' × ' + fq(use * 100) + '% مستغل' : '') + ')⌉ — تقديري بالمساحة؛ التوزيع الفعلي في «تقسيم الألواح»']);
        o.sug.push(S('m:' + k, matName(m) + ' (لوح)', ns, 'لوح', 'mat', k, sl.price || ''));
      } else {
        o.sug.push(S('m:' + k, matName(m), need, 'م²', 'mat', k));
        if (inp.basis === 'slab' && !sl) o.warn.push('مقاس اللوح مش متسجل لـ «' + matName(m) + '» — اكتبه في المكتبة علشان نحسب الألواح (اتحسب بالمتر المربع).');
      }
      if (!m) o.warn.push('اختار الخامة من المكتبة علشان السعر.');
    });
    o.slabs = slabs; o.required = round(req, 4);
    return slabs;
  }
  function workSug(o, ctx) {
    var ep = (ctx && ctx.edgePrices) || {}, hp = (ctx && ctx.cutPrices) || {};
    Object.keys(o._edges).forEach(function (k) { var t = k.slice(2); o.sug.push(S(k, 'تشكيل حافة ' + t, o._edges[k], 'م.ط', 'work', '', ep[t])); });
    Object.keys(o._holes).forEach(function (k) { var t = k.slice(2); o.sug.push(S(k, t, o._holes[k], 'فتحة', 'work', '', hp[t])); });
  }
  function pieces(inp, ctx) {
    inp = inp || {}; var o = out({}); o._edges = {}; o._holes = {};
    var r = piecesCore(inp.parts, inp, ctx, o, 'قطعة');
    o.rows.push(['إجمالي المساحة', fq(round(r.area, 4)) + ' م²', r.n + ' قطعة']);
    var sl = matSug(o, r.byMat, inp, ctx);
    if (o.required && num(inp.waste)) o.rows.push(['المساحة المطلوبة بالهالك', fq(o.required) + ' م²', '']);
    if (r.edge) o.rows.push(['الحواف', fq(round(r.edge, 3)) + ' م.ط', '']);
    if (r.kg) o.rows.push(['الوزن التقريبي', fq(round(r.kg, 1)) + ' كجم', 'المساحة × السمك × الكثافة من المكتبة']);
    workSug(o, ctx);
    o.parts = r.parts; o.area = round(r.area, 4);
    o.metrics = { m2: round(r.area, 4), lm: round(r.edge, 3), edge: round(r.edge, 3), piece: r.n, cutout: r.cuts, slab: sl, kg: round(r.kg, 2) };
    return o;
  }

  // ====================================================================
  // المطابخ: مستقيم / L / U / جزيرة / بار
  // ====================================================================
  var CUTS = { sinkTop: 'فتحة حوض فوق السطح', sinkUnder: 'فتحة حوض تحت السطح', sinkFlush: 'فتحة حوض Flush', hob: 'فتحة بوتاجاز', oven: 'فتحة فرن', appliance: 'فتحة أجهزة', mixer: 'فتحة خلاط', socket: 'فتحة كهرباء', pipe: 'فتحة مواسير', corner: 'قص زاوية', chamfer: 'شطفة', drain: 'مجرى مياه', groove: 'تجويف', custom: 'قصة خاصة' };
  function kitchen(inp, ctx) {
    inp = inp || {}; var o = out({}), u = inp.unit || 'cm', D = toM(inp.D, u), t = inp.ktype || 'straight';
    o._edges = {}; o._holes = {};
    var L1 = toM(inp.L1, u), L2 = toM(inp.L2, u), L3 = toM(inp.L3, u), segs = [], front = 0, back = 0;
    if (!D && t !== 'multi') { o.warn.push('اكتب عرض (عمق) السطح.'); }
    if (t === 'straight' || t === 'island' || t === 'bar') { if (L1) { segs.push(['السطح', L1, D]); front = L1; back = L1; } }
    if (t === 'L') { if (L1) segs.push(['الجزء الأول', L1, D]); if (L2) segs.push(['الجزء التاني (بعد الركن)', Math.max(L2 - D, 0), D]); front = Math.max(L1 + L2 - 2 * D, 0); back = Math.max(L1 + L2 - D, 0); }
    if (t === 'multi') arr(inp.segs).forEach(function (sg, i) { var l = toM(sg.L, u), d = toM(sg.D, u) || D, c = cnt(sg.count); if (!l || !d) return; for (var q = 0; q < c; q++) segs.push([(sg.name || 'جزء ' + (i + 1)) + (c > 1 ? ' ' + (q + 1) : ''), l, d]); back += l * c; if (!sg.noEdge) front += l * c; });
    if (t === 'U') { if (L2) segs.push(['الجزء الأوسط', L2, D]); if (L1) segs.push(['الجنب الأول (بعد الركن)', Math.max(L1 - D, 0), D]); if (L3) segs.push(['الجنب التاني (بعد الركن)', Math.max(L3 - D, 0), D]); front = Math.max(L1 + L2 + L3 - 4 * D, 0); back = Math.max(L1 + L2 + L3 - 2 * D, 0); }
    var area = 0;
    segs.forEach(function (s) { var a = s[1] * s[2]; area += a; o.rows.push([s[0], fq(round(a, 4)) + ' م²', fq(round(s[1], 3)) + ' × ' + fq(round(s[2], 3))]); });
    if (t === 'multi') o.rows.push(['متعدد / حسب الرسم', segs.length + ' جزء', 'كل جزء بطوله الصافي (الأركان متخصومة) — الحافة الأمامية للأجزاء المعلّمة بس']);
    if (t === 'L' || t === 'U') o.rows.push(['طريقة الأركان', (t === 'L' ? 1 : 2) + ' ركن', 'الأطوال على الحيطة من بره؛ كل ركن بيتحسب مرة واحدة (الطول − العمق)']);
    var IL = toM(inp.IL, u), IW = toM(inp.IW, u);
    if ((t === 'island' || inp.island) && IL && IW) { area += IL * IW; segs.push(['الجزيرة', IL, IW]); o.rows.push(['الجزيرة', fq(round(IL * IW, 4)) + ' م²', fq(IL) + ' × ' + fq(IW)]); front += 2 * (IL + IW); }
    var BL = toM(inp.BL, u), BW = toM(inp.BW, u);
    if ((t === 'bar' || inp.bar) && BL && BW) { area += BL * BW; segs.push(['البار', BL, BW]); o.rows.push(['البار', fq(round(BL * BW, 4)) + ' م²', fq(BL) + ' × ' + fq(BW)]); front += BL; }
    var ends = num(inp.ends) * D; front += ends;
    var bh = toM(inp.backH, u), sideN = num(inp.sides), sideH = toM(inp.sideH, u) || bh, skirt = toM(inp.skirtH, u);
    var backA = inp.back ? back * bh : 0, sideA = sideN * D * sideH;
    if (backA) o.rows.push(['ظهر المطبخ', fq(round(backA, 4)) + ' م²', fq(round(back, 3)) + ' م × ' + fq(bh) + ' م']);
    if (sideA) o.rows.push(['الجوانب', fq(round(sideA, 4)) + ' م²', sideN + ' × ' + fq(D) + ' × ' + fq(sideH)]);
    var skA = skirt ? back * skirt : 0; if (skA) o.rows.push(['وزرة', fq(round(back, 3)) + ' م.ط', 'بارتفاع ' + fq(skirt) + ' م']);
    var tot = area + backA + sideA + skA;
    o.rows.push(['مساحة الأسطح', fq(round(area, 4)) + ' م²', ''], ['إجمالي المساحة', fq(round(tot, 4)) + ' م²', 'أسطح + ظهر + جوانب + وزرة'], ['الحافة الأمامية', fq(round(front, 3)) + ' م.ط', (t === 'L' ? 'L1 + L2 − 2 × العمق' : t === 'U' ? 'L1 + L2 + L3 − 4 × العمق' : t === 'multi' ? 'مجموع أطوال الأجزاء' : 'الطول') + (ends ? ' + ' + num(inp.ends) + ' طرف' : '') + (inp.island ? ' + محيط الجزيرة' : '')]);
    if (front && inp.edgeType) o._edges['e:' + inp.edgeType] = front;
    var cuts = 0;
    arr(inp.cuts).forEach(function (c) { var n = cnt(c.count); if (!c.type || !n) return; cuts += n; var nm = CUTS[c.type] || c.type; o._holes['h:' + nm] = (o._holes['h:' + nm] || 0) + n; o.rows.push([nm + ' × ' + n, (num(c.w) ? fq(num(c.w)) + '×' + fq(num(c.h)) + ' ' + ({ cm: 'سم', mm: 'مم', m: 'م' }[u]) : ''), c.note || '']); });
    var m = matOf(ctx, inp.mat), byMat = {}; byMat[inp.mat || ''] = { m: m, area: tot, t: m ? num(m.thick) : 0 };
    var sl = matSug(o, byMat, inp, ctx); workSug(o, ctx);
    var dens = m ? num(m.density) : 0, th = m ? num(m.thick) : 0, kg = dens && th ? tot * th / 100 * dens : 0;
    o.parts = segs.filter(function (s) { return s[1] > 0 && s[2] > 0; }).map(function (s) { return { name: s[0], L: round(s[1] * 1000, 1), W: round(s[2] * 1000, 1), count: 1, grain: !!inp.grainLock, matId: inp.mat || '' }; });
    if (backA && bh) o.parts.push({ name: 'ظهر', L: round(back * 1000, 1), W: round(bh * 1000, 1), count: 1, grain: !!inp.grainLock, matId: inp.mat || '' });
    o.area = round(tot, 4);
    o.metrics = { m2: round(tot, 4), lm: round(front, 3), edge: round(front, 3), cutout: cuts, piece: o.parts.length, slab: sl, kitchen: 1, kg: round(kg, 2) };
    return o;
  }
  function backsplash(inp, ctx) {
    inp = inp || {}; var o = out({}), u = inp.unit || 'cm', H = toM(inp.H, u), len = 0;
    o._edges = {}; o._holes = {};
    arr(inp.walls).forEach(function (w, i) { var l = toM(w.len, u), c = cnt(w.count); if (!l) return; len += l * c; o.rows.push([w.name || 'جزء ' + (i + 1), fq(round(l * c, 3)) + ' م', fq(l) + (c > 1 ? ' × ' + c : '')]); });
    var area = len * H; o.rows.push(['مساحة الظهر', fq(round(area, 4)) + ' م²', fq(round(len, 3)) + ' × ' + fq(H)]);
    [['sockets', 'فتحة كهرباء'], ['mixers', 'فتحة خلاط']].forEach(function (p) { if (num(inp[p[0]])) o._holes['h:' + p[1]] = num(inp[p[0]]); });
    if (inp.edgeType) o._edges['e:' + inp.edgeType] = len;
    var m = matOf(ctx, inp.mat), byMat = {}; byMat[inp.mat || ''] = { m: m, area: area, t: m ? num(m.thick) : 0 };
    var sl = matSug(o, byMat, inp, ctx); workSug(o, ctx);
    o.area = round(area, 4); o.parts = len && H ? [{ name: 'ظهر', L: round(len * 1000, 1), W: round(H * 1000, 1), count: 1, matId: inp.mat || '' }] : [];
    o.metrics = { m2: round(area, 4), lm: round(len, 3), edge: inp.edgeType ? round(len, 3) : 0, cutout: num(inp.sockets) + num(inp.mixers), slab: sl };
    return o;
  }

  // ====================================================================
  // السلالم: درجات متساوية أو كل درجة لوحدها + بسطات + وزرات + حواف
  // ====================================================================
  function stairs(inp, ctx) {
    inp = inp || {}; var o = out({}), u = inp.unit || 'cm'; o._edges = {}; o._holes = {};
    var steps = [];
    if (inp.mode === 'rows') arr(inp.steps).forEach(function (s) { var c = cnt(s.count); if (!toM(s.L, u)) return; steps.push({ L: toM(s.L, u), W: toM(s.W, u), H: toM(s.H, u), c: c, name: s.name }); });
    else if (num(inp.n)) steps.push({ L: toM(inp.L, u), W: toM(inp.W, u), H: toM(inp.H, u), c: num(inp.n) });
    var n = 0, tread = 0, riser = 0, nos = 0, parts = [], risersOn = inp.risers !== false;
    steps.forEach(function (s, i) { n += s.c; tread += s.L * s.W * s.c; if (risersOn) riser += s.L * s.H * s.c; nos += s.L * s.c; parts.push({ name: 'نايمة' + (s.name ? ' ' + s.name : ''), L: round(s.L * 1000, 1), W: round(s.W * 1000, 1), count: s.c, grain: !!inp.grainLock }); if (risersOn && s.H) parts.push({ name: 'قايمة', L: round(s.L * 1000, 1), W: round(s.H * 1000, 1), count: s.c, grain: !!inp.grainLock }); });
    var land = 0, nl = 0; arr(inp.landings).forEach(function (b) { var a = toM(b.L, u) * toM(b.W, u), c = cnt(b.count); if (!a) return; land += a * c; nl += c; parts.push({ name: 'بسطة', L: round(toM(b.L, u) * 1000, 1), W: round(toM(b.W, u) * 1000, 1), count: c }); });
    var sides = num(inp.skirtSides), skH = toM(inp.skirtH, u), skLen = steps.reduce(function (t, s) { return t + Math.sqrt(s.W * s.W + s.H * s.H) * s.c; }, 0) + num(inp.skirtExtra), skLm = sides * skLen, skA = skLm * skH;
    o.rows.push(['الدرجات', n + ' درجة', steps.length > 1 ? steps.length + ' مقاس مختلف' : ''], ['النوايم', fq(round(tread, 4)) + ' م²', steps.map(function (s) { return s.c + ' × ' + fq(s.L) + '×' + fq(s.W); }).join(' + ')]);
    if (risersOn) o.rows.push(['القوايم', fq(round(riser, 4)) + ' م²', steps.map(function (s) { return s.c + ' × ' + fq(s.L) + '×' + fq(s.H); }).join(' + ')]);
    if (land) o.rows.push(['البسطات', fq(round(land, 4)) + ' م²', nl + ' بسطة']);
    if (skLm) o.rows.push(['الوزرات', fq(round(skLm, 3)) + ' م.ط · ' + fq(round(skA, 4)) + ' م²', sides + ' جنب × طول الميل لكل درجة √(نايمة² + قايمة²)' + (num(inp.skirtExtra) ? ' + ' + fq(num(inp.skirtExtra)) : '')]);
    var tot = tread + riser + land + skA;
    o.rows.push(['المساحة الكلية', fq(round(tot, 4)) + ' م²', ''], ['حافة مقدمة النوايم', fq(round(nos, 3)) + ' م.ط', 'طول النايمة × عدد الدرجات']);
    if (inp.edgeType && nos) o._edges['e:' + inp.edgeType] = nos;
    var m = matOf(ctx, inp.mat), byMat = {}; byMat[inp.mat || ''] = { m: m, area: tot, t: m ? num(m.thick) : 0 };
    var sl = matSug(o, byMat, inp, ctx); workSug(o, ctx);
    o.n = n; o.area = round(tot, 4); o.parts = parts; o.tread = round(tread, 4); o.riser = round(riser, 4); o.land = round(land, 4); o.skirt = round(skLm, 3);
    o.metrics = { m2: round(tot, 4), lm: round(nos + skLm, 3), edge: round(nos, 3), step: n, piece: n * (risersOn ? 2 : 1) + nl, slab: sl, stairs: 1 };
    return o;
  }

  // ====================================================================
  // الواجهات والتجاليد: مناطق − فتحات + إضافات، ونظام التثبيت
  // ====================================================================
  function facade(inp, ctx) {
    inp = inp || {}; var o = out({}), u = inp.unit || 'm'; o._edges = {}; o._holes = {};
    var gross = 0, open = 0, add = 0, byMat = {};
    arr(inp.zones).forEach(function (z, i) { var a = toM(z.W, u) * toM(z.H, u) * cnt(z.count); if (!a) return; gross += a; var mid = z.mat || inp.mat || '', m = matOf(ctx, mid); (byMat[mid] = byMat[mid] || { m: m, area: 0, t: m ? num(m.thick) : 0 }).area += a; o.rows.push([z.name || 'منطقة ' + (i + 1), fq(round(a, 4)) + ' م²', fq(toM(z.W, u)) + ' × ' + fq(toM(z.H, u)) + (cnt(z.count) > 1 ? ' × ' + cnt(z.count) : '') + (m ? ' — ' + m.name : '')]); });
    arr(inp.openings).forEach(function (z) { open += toM(z.W, u) * toM(z.H, u) * cnt(z.count); });
    arr(inp.extras).forEach(function (z) { add += num(z.area); });
    var net = Math.max(gross - open + add, 0);
    if (open > gross + 1e-9) o.warn.push('الفتحات (' + fq(round(open, 3)) + ' م²) أكبر من المساحة.');
    // الفتحات بتتخصم من الخامة الأساسية (أول خامة) والإضافات بتتضاف عليها
    var first = Object.keys(byMat)[0]; if (first != null) byMat[first].area = Math.max(byMat[first].area - open + add, 0);
    o.rows.push(['المساحة الإجمالية', fq(round(gross, 4)) + ' م²', ''], ['الفتحات', fq(round(open, 4)) + ' م²', arr(inp.openings).length + ' فتحة'], ['إضافات (بروزات/أعمدة…)', fq(round(add, 4)) + ' م²', ''], ['المساحة الصافية', fq(round(net, 4)) + ' م²', 'الإجمالي − الفتحات + الإضافات']);
    var pl = toM(inp.pL, u), pw = toM(inp.pW, u), panels = pl && pw ? ceil(net * (1 + num(inp.waste) / 100) / (pl * pw)) : 0;
    if (panels) o.rows.push(['عدد البلاطات / الألواح المقصوصة', String(panels), '⌈المساحة بالهالك ÷ (' + fq(pl) + ' × ' + fq(pw) + ')⌉']);
    var sl = matSug(o, byMat, inp, ctx);
    if (num(inp.fixPerM2)) o.sug.push(S('fix', 'تثبيت ' + (inp.fixing || ''), net * num(inp.fixPerM2), 'قطعة', 'acc', '', inp.fixPrice));
    if (num(inp.fixPerM2) && !num(inp.fixPrice)) o.warn.push('اكتب سعر وحدة التثبيت.');
    if (inp.fixing) o.rows.push(['نظام التثبيت', inp.fixing, num(inp.fixPerM2) ? fq(num(inp.fixPerM2)) + ' وحدة لكل م²' : 'مكوناته وتكلفته بتكتبها انت']);
    [['scaffold', 'سقالات'], ['lift', 'نقل ورفع']].forEach(function (p) { if (num(inp[p[0]])) o.sug.push(S(p[0], p[1], 1, 'مرة', 'other', '', inp[p[0]])); });
    workSug(o, ctx);
    o.area = round(net, 4); o.metrics = { m2: round(net, 4), piece: panels, slab: sl, facade: 1 };
    if (!inp.noEng) o.warn.push('حصر كميات وتكاليف — تصميم تثبيت الواجهة والأحمال مسؤولية مهندس/مورد نظام التثبيت.');
    return o;
  }
  function floor(inp, ctx) {
    inp = inp || {}; var o = out({}), u = inp.unit || 'm'; o._edges = {}; o._holes = {};
    var a = 0, per = 0, ex = 0;
    arr(inp.rooms).forEach(function (r, i) { var L = toM(r.L, u), W = toM(r.W, u), c = cnt(r.count); if (!L || !W) return; a += L * W * c; per += 2 * (L + W) * c; o.rows.push([r.name || 'مساحة ' + (i + 1), fq(round(L * W * c, 4)) + ' م²', fq(L) + ' × ' + fq(W) + (c > 1 ? ' × ' + c : '')]); });
    arr(inp.ex).forEach(function (r) { ex += toM(r.L, u) * toM(r.W, u) * cnt(r.count); });
    var net = Math.max(a - ex, 0), tl = toM(inp.tL, u), tw = toM(inp.tW, u), wp = num(inp.waste);
    o.rows.push(['المساحة الصافية', fq(round(net, 4)) + ' م²', ex ? fq(round(a, 3)) + ' − ' + fq(round(ex, 3)) + ' مستثنى' : '']);
    var tiles = tl && tw ? ceil(net * (1 + wp / 100) / (tl * tw)) : 0;
    if (tiles) { o.rows.push(['عدد البلاطات', String(tiles), '⌈' + fq(round(net, 3)) + (wp ? ' × (1 + ' + fq(wp) + '%)' : '') + ' ÷ (' + fq(tl) + ' × ' + fq(tw) + ')⌉']); }
    var border = inp.border ? per : 0; if (border) o.rows.push(['البوردر (محيط)', fq(round(border, 3)) + ' م.ط', 'مجموع محيطات المساحات']);
    var m = matOf(ctx, inp.mat), byMat = {}; byMat[inp.mat || ''] = { m: m, area: net, t: m ? num(m.thick) : 0 };
    var sl = matSug(o, byMat, inp, ctx);
    if (border && inp.borderMat) { var bm = matOf(ctx, inp.borderMat); o.sug.push(S('border', 'بوردر ' + matName(bm), border, 'م.ط', 'mat', inp.borderMat)); }
    workSug(o, ctx);
    o.area = round(net, 4); o.metrics = { m2: round(net, 4), lm: round(border, 3), piece: tiles, slab: sl };
    return o;
  }
  function column(inp, ctx) {
    inp = inp || {}; var o = out({}), u = inp.unit || 'cm', a = 0, corners = 0, n = 0; o._edges = {}; o._holes = {};
    arr(inp.cols).forEach(function (c, i) { var W = toM(c.W, u), D = toM(c.D, u), H = toM(c.H, u), k = cnt(c.count), round_ = c.type === 'round'; if (!H || !W) return; var p = round_ ? Math.PI * W : 2 * (W + D); a += p * H * k; n += k; if (!round_) corners += 4 * H * k; o.rows.push([c.name || 'عمود ' + (i + 1), fq(round(p * H * k, 4)) + ' م²', (round_ ? 'π × ' + fq(W) : '2 × (' + fq(W) + ' + ' + fq(D) + ')') + ' × ' + fq(H) + (k > 1 ? ' × ' + k : '')]); });
    o.rows.push(['مساحة الكسوة', fq(round(a, 4)) + ' م²', n + ' عمود']);
    if (corners) o.rows.push(['زوايا (أركان)', fq(round(corners, 3)) + ' م.ط', '4 × الارتفاع لكل عمود مربع/مستطيل']);
    if (corners && inp.edgeType) o._edges['e:' + inp.edgeType] = corners;
    var m = matOf(ctx, inp.mat), byMat = {}; byMat[inp.mat || ''] = { m: m, area: a, t: m ? num(m.thick) : 0 };
    var sl = matSug(o, byMat, inp, ctx); workSug(o, ctx);
    o.area = round(a, 4); o.metrics = { m2: round(a, 4), lm: round(corners, 3), edge: round(corners, 3), piece: n, slab: sl };
    return o;
  }
  function lm(inp, ctx) {
    inp = inp || {}; var o = out({}), u = inp.unit || 'cm', tot = 0;
    arr(inp.rows).forEach(function (r, i) { var L = toM(r.len, u), c = cnt(r.count); if (!L) return; tot += L * c; o.rows.push([(r.name || 'بند ' + (i + 1)) + (r.profile ? ' — ' + r.profile : ''), fq(round(L * c, 3)) + ' م.ط', fq(L) + (c > 1 ? ' × ' + c : '')]); o.sug.push(S('lm:' + i, (r.name || 'متر طولي') + (r.profile ? ' ' + r.profile : ''), L * c, 'م.ط', r.mat ? 'mat' : 'work', r.mat || '', r.price)); });
    o.rows.push(['إجمالي الأمتار', fq(round(tot, 3)) + ' م.ط', '']);
    o.metrics = { lm: round(tot, 3), edge: round(tot, 3) };
    return o;
  }
  function edges(inp, ctx) {
    inp = inp || {}; var o = out({}), u = inp.unit || 'cm', tot = 0, ep = (ctx && ctx.edgePrices) || {}, by = {};
    arr(inp.rows).forEach(function (r) { var L = toM(r.len, u) * cnt(r.count); if (!L || !r.type) return; tot += L; by[r.type] = (by[r.type] || 0) + L; });
    Object.keys(by).forEach(function (t) { var pr = arr(inp.rows).find(function (r) { return r.type === t && num(r.price); }); o.rows.push([t, fq(round(by[t], 3)) + ' م.ط', '']); o.sug.push(S('e:' + t, 'تشكيل حافة ' + t, by[t], 'م.ط', 'work', '', pr ? pr.price : ep[t])); });
    o.rows.push(['إجمالي الحواف', fq(round(tot, 3)) + ' م.ط', '']);
    o.metrics = { lm: round(tot, 3), edge: round(tot, 3) };
    return o;
  }
  function cutouts(inp, ctx) {
    inp = inp || {}; var o = out({}), hp = (ctx && ctx.cutPrices) || {}, n = 0;
    arr(inp.rows).forEach(function (r, i) { var c = cnt(r.count); if (!r.type || !c) return; n += c; var nm = CUTS[r.type] || r.type; o.rows.push([nm + ' × ' + c, (num(r.w) ? fq(num(r.w)) + ' × ' + fq(num(r.h)) : '') + (r.method ? ' — ' + r.method : ''), r.note || '']); o.sug.push(S('h:' + nm + ':' + i, nm + (r.method ? ' (' + r.method + ')' : ''), c, 'فتحة', 'work', '', has(r.price) ? r.price : hp[nm])); });
    o.rows.push(['إجمالي الفتحات والقصات', String(n), '']);
    o.metrics = { cutout: n, piece: n };
    return o;
  }
  function countCalc(inp, ctx) {
    inp = inp || {}; var o = out({}), u = inp.unit || 'cm', a = toM(inp.a, u), b = toM(inp.b, u), k = num(inp.kerf) / 1000, m = matOf(ctx, inp.mat), sl = slabOf(m, num(inp.T));
    var SL = toM(inp.sL, u) || (sl ? sl.L : 0), SW = toM(inp.sW, u) || (sl ? sl.W : 0), need = num(inp.need), area = num(inp.area);
    if (!a || !b) { o.warn.push('اكتب مقاس القطعة.'); return o; }
    if (area) { var nA = ceil(area * (1 + num(inp.waste) / 100) / (a * b)); o.rows.push(['عدد القطع للمساحة', String(nA), '⌈' + fq(area) + (num(inp.waste) ? ' × (1 + ' + fq(num(inp.waste)) + '%)' : '') + ' ÷ (' + fq(a) + ' × ' + fq(b) + ')⌉']); need = need || nA; o.metrics.piece = nA; }
    if (SL && SW) {
      var f = function (x, y) { return Math.floor((SL + k) / (x + k) + 1e-9) * Math.floor((SW + k) / (y + k) + 1e-9); }, p1 = f(a, b), p2 = inp.noRotate ? 0 : f(b, a), per = Math.max(p1, p2);
      o.rows.push(['القطع في اللوح', String(per), 'اللوح ' + fq(SL) + '×' + fq(SW) + ' م' + (k ? ' بسلاح ' + fq(num(inp.kerf)) + ' مم' : '') + ' — ' + p1 + (inp.noRotate ? '' : ' أو ' + p2 + ' لو اتلفّت')]);
      if (per && need) { var ns = ceil(need / per); o.rows.push(['الألواح', String(ns), '⌈' + need + ' ÷ ' + per + '⌉']); o.sug.push(S('m:' + (inp.mat || ''), matName(m) + ' (لوح)', ns, 'لوح', 'mat', inp.mat, sl ? sl.price : '')); o.metrics.slab = ns; }
      if (!per) o.warn.push('القطعة أكبر من اللوح.');
    } else if (need) o.warn.push('اكتب مقاس اللوح (أو اختار خامة مقاس لوحها متسجل).');
    o.metrics.piece = o.metrics.piece || need;
    return o;
  }
  function slabs(inp, ctx) {
    inp = inp || {}; var o = out({}), m = matOf(ctx, inp.mat), sl = slabOf(m, num(inp.T)), u = inp.unit || 'cm';
    var SL = toM(inp.sL, u) || (sl ? sl.L : 0), SW = toM(inp.sW, u) || (sl ? sl.W : 0), need = num(inp.area), wp = num(inp.waste), use = Math.min(num(inp.usable) || 100, 100) / 100;
    if (!need) { o.warn.push('اكتب المساحة المطلوبة.'); return o; }
    var req = need * (1 + wp / 100);
    o.rows.push(['المطلوب بالهالك', fq(round(req, 4)) + ' م²', fq(need) + (wp ? ' × (1 + ' + fq(wp) + '%)' : '')]);
    if (SL && SW) {
      var ua = SL * SW * use, ns = ceil(req / ua);
      o.rows.push(['مساحة اللوح', fq(round(SL * SW, 4)) + ' م²' + (use < 1 ? ' (المستغل ' + fq(round(ua, 4)) + ')' : ''), fq(SL) + ' × ' + fq(SW)], ['عدد الألواح (تقديري)', String(ns), '⌈' + fq(round(req, 3)) + ' ÷ ' + fq(round(ua, 4)) + '⌉ — بالمساحة بس؛ التوزيع الفعلي في «تقسيم الألواح»']);
      var price = sl ? sl.price : 0, sc = sl ? sl.cost : 0, costM = m ? num(m.cost) : 0;
      o.sug.push(S('m:' + (inp.mat || ''), matName(m) + ' (لوح)', ns, 'لوح', 'mat', inp.mat, price || ''));
      o.slabs = ns; o.metrics = { slab: ns, m2: need };
      if (sc) o.rows.push(['تكلفة شراء الألواح', fq(money(ns * sc)), ns + ' × ' + fq(sc)]);
      if (!sc && costM) o.rows.push(['تكلفة الخامة بالمتر', fq(money(req * costM)), fq(round(req, 3)) + ' م² × ' + fq(costM)]);
    } else { o.warn.push('اكتب مقاس اللوح أو اختار خامة مقاس لوحها متسجل.'); o.sug.push(S('m:' + (inp.mat || ''), matName(m), req, 'م²', 'mat', inp.mat)); o.metrics = { m2: need }; }
    return o;
  }

  // ====================================================================
  // تقسيم الألواح وتحسين القص (Guillotine — أفضل مساحة) بالسلاح والهامش واتجاه العروق والبواقي
  // slabs: [{ name, L, W, count, remnant, id }] (مم، العدد محدود) + slab قياسي من غير حد
  // parts: [{ name, L, W, count, rotate, grain, match, seq }] (مم)
  // ====================================================================
  function nest(parts, o2) {
    o2 = o2 || {};
    var kerf = num(o2.kerf), mg = num(o2.margin), keepL = num(o2.keepL), keepW = num(o2.keepW);
    var stock = arr(o2.slabs).map(function (s, i) { return { L: num(s.L), W: num(s.W), left: Math.round(cnt(s.count)), remnant: !!s.remnant, id: s.id || ('s' + i), name: s.name || '' }; }).filter(function (s) { return s.L > 0 && s.W > 0 && s.left > 0; });
    var std = o2.std && num(o2.std.L) && num(o2.std.W) ? { L: num(o2.std.L), W: num(o2.std.W) } : null;
    var list = [], tooBig = [];
    arr(parts).forEach(function (p, pi) { var L = num(p.L), W = num(p.W), n = Math.min(Math.round(cnt(p.count)), 2000); if (!L || !W) return; for (var k = 0; k < n; k++) list.push({ name: p.name || ('قطعة ' + (pi + 1)), L: L, W: W, lock: p.rotate === false || !!p.grain, match: p.match || '', seq: p.seq || '', no: 0 }); });
    list.sort(function (a, b) { return Math.max(b.L, b.W) - Math.max(a.L, a.W) || b.L * b.W - a.L * a.W; });
    list.forEach(function (p, i) { p.no = i + 1; });
    var sheets = [];
    function newSheet(L, W, src, id, name) { var s = { L: L, W: W, src: src, id: id, name: name, free: [{ x: mg, y: mg, l: L - 2 * mg + kerf, w: W - 2 * mg + kerf }], placed: [] }; sheets.push(s); return s; }
    function opts(p) { var a = [{ l: p.L + kerf, w: p.W + kerf, rot: false }]; if (!p.lock && p.L !== p.W) a.push({ l: p.W + kerf, w: p.L + kerf, rot: true }); return a; }
    list.forEach(function (p) {
      var op = opts(p), best = null;
      sheets.forEach(function (s, si) { s.free.forEach(function (f, fi) { op.forEach(function (o) { if (o.l <= f.l + 1e-9 && o.w <= f.w + 1e-9) { var sc = f.l * f.w - o.l * o.w; if (!best || sc < best.sc - 1e-9) best = { si: si, fi: fi, o: o, sc: sc }; } }); }); });
      if (!best) {
        var fits = function (L, W) { return op.some(function (o) { return o.l <= L - 2 * mg + kerf + 1e-9 && o.w <= W - 2 * mg + kerf + 1e-9; }); };
        var c = stock.filter(function (s) { return s.left > 0 && fits(s.L, s.W); }).sort(function (a, b) { return a.L * a.W - b.L * b.W; })[0], sh = null;
        if (c) { c.left--; sh = newSheet(c.L, c.W, c.remnant ? 'remnant' : 'stock', c.id, c.name); }
        else if (std && fits(std.L, std.W)) sh = newSheet(std.L, std.W, 'new', '', '');
        if (!sh) { tooBig.push(p); return; }
        var o0 = op.filter(function (o) { return o.l <= sh.free[0].l + 1e-9 && o.w <= sh.free[0].w + 1e-9; })[0];
        best = { si: sheets.length - 1, fi: 0, o: o0 };
      }
      var s = sheets[best.si], f = s.free[best.fi], o = best.o;
      s.placed.push({ name: p.name, no: p.no, match: p.match, seq: p.seq, x: f.x, y: f.y, l: o.l - kerf, w: o.w - kerf, rot: o.rot, lock: p.lock });
      s.free.splice(best.fi, 1);
      var rl = f.l - o.l, rw = f.w - o.w, a, b;
      if (rl * f.w >= rw * f.l) { a = { x: f.x + o.l, y: f.y, l: rl, w: f.w }; b = { x: f.x, y: f.y + o.w, l: o.l, w: rw }; }
      else { a = { x: f.x, y: f.y + o.w, l: f.l, w: rw }; b = { x: f.x + o.l, y: f.y, l: rl, w: o.w }; }
      [a, b].forEach(function (r) { if (r.l > 1 && r.w > 1) s.free.push(r); });
    });
    var res = sheets.map(function (s, i) {
      var area = s.L * s.W, used = sum(s.placed, function (p) { return p.l * p.w; });
      var rem = (keepL && keepW) ? s.free.map(function (f) { return { x: f.x, y: f.y, L: round(Math.min(f.l, s.L - f.x - mg), 1), W: round(Math.min(f.w, s.W - f.y - mg), 1) }; }).filter(function (r) { return Math.max(r.L, r.W) >= Math.max(keepL, keepW) && Math.min(r.L, r.W) >= Math.min(keepL, keepW); }) : [];
      var remA = sum(rem, function (r) { return r.L * r.W; });
      return { no: i + 1, L: s.L, W: s.W, src: s.src, stockId: s.id, name: s.name, placed: s.placed, area: round(area / 1e6, 4), used: round(used / 1e6, 4), usedPct: area ? round(used / area * 100, 1) : 0,
        remnants: rem, remArea: round(remA / 1e6, 4), waste: round((area - used - remA) / 1e6, 4) };
    });
    var tot = sum(res, function (r) { return r.area; }), used = sum(res, function (r) { return r.used; }), waste = sum(res, function (r) { return r.waste; });
    return { sheets: res, count: res.length, newSlabs: res.filter(function (r) { return r.src === 'new'; }).length, fromStock: res.filter(function (r) { return r.src !== 'new'; }).length,
      area: round(tot, 4), used: round(used, 4), waste: round(waste, 4), remArea: round(sum(res, function (r) { return r.remArea; }), 4), usedPct: tot ? round(used / tot * 100, 1) : 0, wastePct: tot ? round(waste / tot * 100, 1) : 0,
      pieces: list.length - tooBig.length, tooBig: tooBig, minSlabs: std ? ceil(sum(list, function (p) { return p.L * p.W; }) / (std.L * std.W)) : 0 };
  }
  function nestCalc(inp, ctx) {
    inp = inp || {}; ctx = ctx || {}; var o = out({}), u = inp.unit || 'cm', m = matOf(ctx, inp.mat), sl = slabOf(m, num(inp.T));
    var mm = function (v) { return toMM(v, u); };
    var std = { L: mm(inp.sL) || (sl ? sl.L * 1000 : 0), W: mm(inp.sW) || (sl ? sl.W * 1000 : 0) };
    var stock = arr(inp.stock).map(function (s) { return { L: mm(s.L), W: mm(s.W), count: s.count, remnant: !!s.remnant }; });
    if (inp.useRemnants) arr(ctx.remnants).filter(function (r) { return !inp.mat || r.matId === inp.mat; }).forEach(function (r) { stock.push({ L: num(r.L) * 10, W: num(r.W) * 10, count: r.count || 1, remnant: true, id: r.id }); });
    var parts = arr(inp.parts).map(function (p) { return { name: p.name, L: mm(p.L), W: mm(p.W), count: p.count, rotate: !p.noRotate, grain: p.grain === 'lock', match: p.match, seq: p.seq }; });
    if (!std.L && !stock.length) { o.warn.push('اكتب مقاس اللوح (أو اختار خامة مقاس لوحها متسجل، أو ضيف ألواح متاحة).'); return o; }
    var r = nest(parts, { std: std.L ? std : null, slabs: stock, kerf: inp.kerf, margin: inp.margin, keepL: mm(inp.keepL), keepW: mm(inp.keepW) });
    o.plan = r;
    o.rows.push(['القطع', String(r.pieces), ''], ['الألواح', r.count + (r.fromStock ? ' (منها ' + r.fromStock + ' من المتاح/البواقي)' : ''), std.L ? 'الحد الأدنى بالمساحة ' + r.minSlabs : ''],
      ['المستخدم', fq(r.used) + ' م² (' + r.usedPct + '%)', 'من ' + fq(r.area) + ' م²'], ['بواقي تتحفظ', fq(r.remArea) + ' م²', num(inp.keepL) ? 'أكبر من ' + fq(num(inp.keepL)) + ' × ' + fq(num(inp.keepW)) : 'اكتب أقل مقاس للباقي علشان نفصل البواقي عن الهالك'], ['الهالك', fq(r.waste) + ' م² (' + r.wastePct + '%)', 'سلاح ' + fq(num(inp.kerf)) + ' مم + هامش ' + fq(num(inp.margin)) + ' مم']);
    if (r.tooBig.length) o.warn.push(r.tooBig.length + ' قطعة أكبر من اللوح — مش داخلة في الخطة.');
    if (parts.some(function (p) { return p.grain; })) o.rows.push(['اتجاه العروق', 'القطع المقفولة مش بتتلف', 'علشان العروق تفضل في نفس الاتجاه']);
    if (r.newSlabs) o.sug.push(S('m:' + (inp.mat || ''), matName(m) + ' (لوح)', r.newSlabs, 'لوح', 'mat', inp.mat, sl ? sl.price : ''));
    o.metrics = { slab: r.count, piece: r.pieces, m2: r.used };
    return o;
  }
  var WASTE_MODES = { pct: 'نسبة %', qty: 'مساحة يدوي', piece: 'لكل قطعة', slab: 'لكل لوح', manual: 'مبلغ يدوي' };
  function wasteCalc(inp) {
    inp = inp || {}; var o = out({}), need = num(inp.need), used = num(inp.used), slabA = num(inp.slabArea), ns = num(inp.slabs), rem = num(inp.reuse), pr = num(inp.price), w = 0, m = inp.mode || 'pct', v = num(inp.value);
    if (m === 'pct') w = need * Math.min(v, 100) / 100; else if (m === 'qty') w = v; else if (m === 'piece') w = v * num(inp.pieces); else if (m === 'slab') w = Math.max(ns * slabA - need - rem, 0);
    var cost = m === 'manual' ? v : w * pr;
    o.rows.push(['المساحة المطلوبة (القطع)', fq(need) + ' م²', '']);
    if (used || (ns && slabA)) o.rows.push(['المساحة المشتراة', fq(round(used || ns * slabA, 4)) + ' م²', ns ? ns + ' لوح × ' + fq(slabA) : '']);
    if (rem) o.rows.push(['بواقي تتستخدم تاني', fq(rem) + ' م²', 'مش هالك']);
    o.rows.push(['الهالك (' + WASTE_MODES[m] + ')', m === 'manual' ? '—' : fq(round(w, 4)) + ' م²', m === 'pct' ? fq(need) + ' × ' + fq(v) + '%' : m === 'slab' ? 'الألواح − المطلوب − البواقي' : m === 'piece' ? fq(v) + ' × ' + fq(num(inp.pieces)) + ' قطعة' : '']);
    o.rows.push(['قيمة الهالك', fq(money(cost)), m === 'manual' ? 'مبلغ يدوي' : pr ? fq(round(w, 4)) + ' × ' + fq(pr) : 'اكتب سعر المتر']);
    o.waste = money(cost); o.wasteArea = round(w, 4);
    return o;
  }
  function transport(inp) {
    inp = inp || {}; var o = out({}), t = num(inp.trips) * num(inp.tripPrice), l = num(inp.floors) * num(inp.floorPrice), x = num(inp.loading) + num(inp.extra);
    o.rows.push(['النقل', fq(money(t)), fq(num(inp.trips)) + ' نقلة × ' + fq(num(inp.tripPrice))], ['الرفع', fq(money(l)), fq(num(inp.floors)) + ' دور × ' + fq(num(inp.floorPrice))], ['تحميل وتنزيل وإضافي', fq(money(x)), ''], ['تكلفة النقل', fq(money(t + l + x)), '']);
    o.cost = money(t + l + x); return o;
  }
  // ====================================================================
  // مطابقة العروق: ترقيم الألواح والقطع حسب طريقة المطابقة (من غير ما نفترض شكل العرق)
  // ====================================================================
  var MATCH = { none: 'من غير مطابقة', book: 'Bookmatch (مرايا)', slab: 'Slab Match (تتابع)', waterfall: 'Waterfall (شلال)', continuous: 'تتابع العرق (Continuous)' };
  function vein(inp) {
    inp = inp || {}; var o = out({}), m = inp.mode || 'none', n = Math.round(num(inp.pieces)), dir = inp.dir || 'طولي', seq = [];
    if (!n) { o.warn.push('اكتب عدد القطع/الأجزاء اللي محتاجة مطابقة.'); return o; }
    if (m === 'book') { var pairs = ceil(n / 2); for (var i = 0; i < n; i++) seq.push({ no: i + 1, slab: i + 1, face: i % 2 ? 'مقلوب (وش التاني)' : 'وش', pair: Math.floor(i / 2) + 1 }); o.rows.push(['الألواح المتتالية المطلوبة', String(n), 'كل زوج من نفس البلوك ومتتاليين في الترقيم'], ['الأزواج', String(pairs), n % 2 ? 'عدد فردي — آخر لوح من غير زوج' : '']); if (n % 2) o.warn.push('Bookmatch محتاج عدد زوجي من الألواح المتتالية.'); }
    else if (m === 'slab' || m === 'continuous') { for (var k = 0; k < n; k++) seq.push({ no: k + 1, slab: k + 1, face: 'وش', pair: '' }); o.rows.push(['الألواح المتتالية المطلوبة', String(n), 'نفس الاتجاه وبالترتيب']); }
    else if (m === 'waterfall') { for (var w = 0; w < n; w++) seq.push({ no: w + 1, slab: 1, face: w ? 'جنب ' + w + ' (مكمل للسطح)' : 'السطح', pair: '' }); o.rows.push(['القطع من نفس اللوح', String(n), 'السطح والجنب من لوح واحد متجاورين علشان العرق ينزل مكمل']); }
    else { for (var z = 0; z < n; z++) seq.push({ no: z + 1, slab: '', face: '', pair: '' }); }
    o.rows.unshift(['طريقة المطابقة', MATCH[m] || m, 'اتجاه العروق: ' + dir]);
    if (m !== 'none') o.rows.push(['تنبيه', 'لازم الألواح تبقى من نفس البلوك ومترقمة', 'اقفل لف القطع في «تقسيم الألواح» علشان العرق يفضل في اتجاهه']);
    o.seq = seq; o.metrics = { piece: n, slab: m === 'waterfall' ? 1 : n };
    return o;
  }
  function weight(inp, ctx) {
    inp = inp || {}; var o = out({}), m = matOf(ctx, inp.mat), a = num(inp.area), t = num(inp.T) || (m ? num(m.thick) : 0), d = num(inp.density) || (m ? num(m.density) : 0);
    if (!a || !t) { o.warn.push('اكتب المساحة والسمك.'); return o; }
    if (!d) { o.warn.push('اكتب الكثافة (كجم/م³) من كتالوج المورد أو من بيانات الخامة — مش بنفترض قيمة ثابتة.'); return o; }
    var kg = a * t / 100 * d, per = num(inp.pieces) ? kg / num(inp.pieces) : 0;
    o.rows.push(['الحجم', fq(round(a * t / 100, 4)) + ' م³', fq(a) + ' م² × ' + fq(t) + ' سم ÷ 100'], ['الوزن', fq(round(kg, 1)) + ' كجم', '× ' + fq(d) + ' كجم/م³']);
    if (per) o.rows.push(['للقطعة', fq(round(per, 1)) + ' كجم', '÷ ' + num(inp.pieces)]);
    if (num(inp.cap)) o.rows.push(['عدد النقلات', String(ceil(kg / num(inp.cap))), '⌈' + fq(round(kg, 1)) + ' ÷ ' + fq(num(inp.cap)) + ' كجم للنقلة⌉']);
    o.kg = round(kg, 2); o.metrics = { kg: round(kg, 2), m2: a };
    return o;
  }
  function finish(inp, ctx) {
    inp = inp || {}; var o = out({}), fp = (ctx && ctx.finishPrices) || {}, t = 0;
    arr(inp.rows).forEach(function (r, i) { var a = num(r.area), pr = has(r.price) ? num(r.price) : num(fp[r.type]); if (!a || !r.type) return; t += a; o.rows.push([r.type + (r.name ? ' — ' + r.name : ''), fq(a) + ' م²', pr ? '× ' + fq(pr) : 'اكتب السعر']); o.sug.push(S('f:' + r.type + ':' + i, 'تشطيب ' + r.type, a, 'م²', 'work', '', pr || '')); });
    o.rows.push(['إجمالي مساحة التشطيب', fq(round(t, 4)) + ' م²', '']);
    o.metrics = { m2: round(t, 4) };
    return o;
  }
  function mfg(inp) {
    inp = inp || {}; var o = out({}), q = cnt(inp.qty), F = [['mat', 'الخامة/الألواح'], ['cut', 'القص'], ['edge', 'تشكيل الحواف'], ['holes', 'الفتحات'], ['finish', 'التلميع/التشطيب'], ['glue', 'لصق ومستهلكات'], ['waste', 'الهالك'], ['other', 'أخرى']];
    var t = 0; F.forEach(function (f) { var v = num(inp[f[0]]); if (v) { t += v; o.rows.push([f[1], fq(money(v)), '']); } });
    o.rows.push(['تكلفة التصنيع', fq(money(t)), ''], ['للقطعة', fq(money(t / q)), q > 1 ? '÷ ' + q : '']);
    o.cost = money(t); return o;
  }
  function install(inp) {
    inp = inp || {}; var o = out({}), d = num(inp.days), t = num(inp.techs) * num(inp.techRate) * d, h = num(inp.helpers) * num(inp.helperRate) * d, x = num(inp.transport) + num(inp.site) + num(inp.extra);
    o.rows.push(['الفنيين', fq(money(t)), fq(num(inp.techs)) + ' × ' + fq(num(inp.techRate)) + ' × ' + fq(d) + ' يوم'], ['المساعدين', fq(money(h)), fq(num(inp.helpers)) + ' × ' + fq(num(inp.helperRate)) + ' × ' + fq(d) + ' يوم'],
      ['نقل ومصاريف موقع وإضافي', fq(money(x)), ''], ['تكلفة التركيب', fq(money(t + h + x)), '']);
    o.cost = money(t + h + x); return o;
  }
  function priceCalc(inp) {
    inp = inp || {}; var o = out({}), c = num(inp.cost), v = num(inp.value), q = cnt(inp.qty), m = inp.mode || 'markup', sell = c;
    if (m === 'markup') sell = c * (1 + v / 100); else if (m === 'margin') { if (v >= 100) { o.warn.push('هامش الربح لازم يبقى أقل من 100%.'); return o; } sell = c / (1 - v / 100); } else if (m === 'target') sell = v; else if (m === 'lump') sell = c + v;
    var p = sell - c;
    o.rows.push(['التكلفة', fq(money(c)), ''], ['سعر البيع', fq(money(sell)), { markup: 'التكلفة × (1 + ' + fq(v) + '%)', margin: 'التكلفة ÷ (1 − ' + fq(v) + '%)', target: 'سعر محدد', lump: 'التكلفة + ' + fq(v) }[m]],
      ['الربح', fq(money(p)), ''], ['هامش الربح', (sell ? fq(round(p / sell * 100, 1)) : '0') + '%', 'الربح ÷ سعر البيع'], ['نسبة على التكلفة', (c ? fq(round(p / c * 100, 1)) : '0') + '%', 'الربح ÷ التكلفة']);
    if (q > 1) o.rows.push(['للقطعة', fq(money(sell / q)) + ' (ربح ' + fq(money(p / q)) + ')', '÷ ' + q]);
    if (p < 0) o.warn.push('سعر البيع أقل من التكلفة.');
    o.sell = money(sell); o.profit = money(p); return o;
  }
  function payplan(inp) {
    inp = inp || {}; var o = out({}), T = num(inp.total), pc = 0, fixed = 0, paid = num(inp.paid);
    arr(inp.parts).forEach(function (p, i) { var a = num(p.amount) || T * num(p.pct) / 100; pc += num(p.pct); fixed += a; if (a) o.rows.push([p.name || 'دفعة ' + (i + 1), fq(money(a)), num(p.pct) ? fq(num(p.pct)) + '% من ' + fq(T) : 'مبلغ']); });
    o.rows.push(['مجموع الدفعات', fq(money(fixed)), ''], ['المدفوع', fq(money(paid)), ''], ['المتبقي', fq(money(T - paid)), '']);
    if (T && Math.abs(fixed - T) > 0.01) o.warn.push('مجموع الدفعات (' + fq(money(fixed)) + ') مش مساوي لإجمالي المشروع (' + fq(T) + ').');
    return o;
  }
  function laborOnly(inp) { inp = inp || {}; return out({ metrics: { m2: num(inp.m2), lm: num(inp.lm), piece: num(inp.pieces), step: num(inp.steps), slab: num(inp.slabs), cutout: num(inp.cutouts), edge: num(inp.edges), kg: num(inp.kg) } }); }
  function custom() { return out({}); }
  var KIND_CALC = { pieces: pieces, kitchen: kitchen, backsplash: backsplash, stairs: stairs, facade: facade, floor: floor, column: column, lm: lm, edges: edges, cutouts: cutouts, count: countCalc, slabs: slabs, nest: nestCalc,
    waste: wasteCalc, vein: vein, weight: weight, finish: finish, mfg: mfg, install: install, transport: transport, price: priceCalc, payplan: payplan, labor: laborOnly, custom: custom };

  // أنواع شغل بتستخدم نفس الحاسبة بخانات مختلفة (المداخل والحمامات والبوابات والديكورات = قطع، الحوائط = مناطق − فتحات)
  var ALIAS = { entrance: 'pieces', bath: 'pieces', gate: 'pieces', decor: 'pieces', wall: 'facade' };
  // ====================================================================
  // البند والمشروع
  // ====================================================================
  var LABOR = { m2: 'بالمتر المربع', lm: 'بالمتر الطولي', piece: 'بالقطعة', step: 'بالدرجة', slab: 'باللوح', cutout: 'بالفتحة', edge: 'بمتر الحافة', finish: 'بمتر التشطيب', kg: 'بالوزن (كجم)', daily: 'باليومية', hour: 'بالساعة', lump: 'مقطوعية' };
  var METRIC = { m2: 'm2', lm: 'lm', piece: 'piece', step: 'step', slab: 'slab', cutout: 'cutout', edge: 'edge', finish: 'm2', kg: 'kg' };
  var COUNTABLE = /^(قطعة|طقم|لوح|كرتونة|عبوة|علبة|شيكارة|مرة|فتحة|درجة)$/;
  var SCOPES = { full: 'توريد وتصنيع وتركيب', make: 'تصنيع فقط', supply: 'توريد فقط', install: 'تركيب فقط', supplyInstall: 'توريد وتركيب' };
  function line(l, supply) {
    l = l || {};
    var q = num(l.qty), w = Math.min(num(l.wastePct), 100), fin = q + q * w / 100;
    if (w && COUNTABLE.test(l.unit || 'قطعة')) fin = ceil(fin);
    var r = { name: l.name || '', unit: l.unit || 'قطعة', qty: round(q, 4), waste: round(fin - q, 4), final: round(fin, 4), cost: num(l.cost), price: num(l.price), cat: l.cat || 'acc', key: l.auto || '', per: num(l.per) || 1 };
    r.costT = supply ? money(r.final * r.cost) : 0; r.sellT = supply ? money(r.final * r.price) : 0; r.wasteCost = supply ? money((r.final - r.qty) * r.cost) : 0;
    return r;
  }
  function laborLine(l, m) {
    l = l || {}; m = m || {};
    var meth = l.method || 'lump', price = num(l.price), r = { name: l.name || '', method: meth, label: LABOR[meth] || String(meth).replace(/^x:/, ''), price: price, auto: false, grp: l.grp || 'mfg' };
    if (meth === 'lump') { r.qty = 1; r.amount = money(price); }
    else if (meth === 'daily') { r.qty = num(l.qty); r.workers = cnt(l.workers); r.amount = money(r.qty * r.workers * price); }
    else { if (has(l.qty)) r.qty = num(l.qty); else { r.qty = round(m[METRIC[meth]] || 0, 3); r.auto = !!METRIC[meth]; } r.amount = money(r.qty * price); }
    return r;
  }
  function item(it, ctx) {
    it = it || {}; ctx = ctx || {};
    var kind = it.kind, f = KIND_CALC[kind] ? kind : (ALIAS[kind] || 'custom');
    var inp = Object.assign({}, it['in'] || {});
    var c = KIND_CALC[f](inp, ctx), supply = it.scope !== 'install' && it.supply !== false;
    var lines = arr(it.lines).map(function (l) { return line(l, supply); });
    var labor = arr(it.labor).map(function (l) { return laborLine(l, c.metrics); });
    var extras = arr(it.extras).map(function (e) { return { name: (e && e.name) || '', amount: money(num(e && e.amount)) }; });
    var icost = arr(it.icosts).map(function (e) { return { name: (e && e.name) || '', grp: (e && e.grp) || 'mfg', amount: money(num(e && e.amount)) }; });
    var r = { kind: kind, calc: c, metrics: c.metrics, lines: lines, labor: labor, extras: extras, icosts: icost, supply: supply, qty: Math.max(1, Math.round(cnt(inp.qty))) };
    r.matSell = money(sum(lines, function (x) { return x.sellT; })); r.matCost = money(sum(lines, function (x) { return x.costT; }));
    r.laborT = money(sum(labor, function (x) { return x.amount; })); r.extrasT = money(sum(extras, function (x) { return x.amount; }));
    r.internal = money(sum(icost, function (x) { return x.amount; }));
    r.total = money(r.matSell + r.laborT + r.extrasT); r.cost = money(r.matCost + r.internal); r.profit = money(r.total - r.cost);
    r.margin = r.total > 0 ? round(r.profit / r.total * 100, 1) : 0;
    var by = {}; lines.forEach(function (x) { by[x.cat] = money((by[x.cat] || 0) + x.costT); }); r.costBy = by;
    r.wasteCost = money(sum(lines, function (x) { return x.wasteCost; })) + (c.waste || 0);
    r.unitPrice = money(r.total / r.qty); r.unitProfit = money(r.profit / r.qty);
    return r;
  }
  var COST_TYPES = { mat: 'خامات', labor: 'عمالة ويوميات', transport: 'نقل', install: 'تركيب', expense: 'مصروفات', waste: 'هالك', other: 'مصاريف أخرى' };
  var COST_ORDER = ['mat', 'labor', 'transport', 'install', 'expense', 'waste', 'other'];
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
  function job(j, ctx) {
    j = j || {}; ctx = ctx || {};
    var items = arr(j.items).map(function (it) { return item(it, ctx); });
    var itemCost = sum(items, function (x) { return x.cost; });
    var raw = arr(j.costs), matBase = sum(items, function (x) { return x.matCost; });
    var costs = raw.map(function (c) { return cost(c, matBase); });
    var wl = money(sum(arr(ctx.wlog).filter(function (w) { return w.jobId && w.jobId === j.id; }), function (w) { return num(w.amount) || num(w.qty) * num(w.rate); }));
    var matSell = money(sum(items, function (x) { return x.matSell; })), laborT = money(sum(items, function (x) { return x.laborT; })), extras = money(sum(items, function (x) { return x.extrasT; }));
    var billedCosts = money(sum(costs, function (c) { return c.billed ? c.total : 0; }));
    var adds = money(sum(arr(j.adjust).filter(function (a) { return a.type === 'add'; }), function (a) { return num(a.amount); })), rets = money(sum(arr(j.adjust).filter(function (a) { return a.type === 'return'; }), function (a) { return num(a.amount); }));
    var subtotal = money(matSell + laborT + extras + billedCosts + adds - rets);
    var d = j.discount || {};
    var discount = d.type === 'percent' ? money(Math.max(subtotal, 0) * Math.min(num(d.value), 100) / 100) : money(Math.min(num(d.value), Math.max(subtotal, 0)));
    var taxPct = Math.min(num(j.tax && j.tax.pct), 100), tax = money(Math.max(subtotal - discount, 0) * taxPct / 100);
    var total = money(subtotal - discount + tax), paid = money(sum(arr(j.payments), function (p) { return num(p && p.amount); }));
    var byType = { mat: money(sum(items, function (x) { return x.matCost; })) };
    COST_ORDER.forEach(function (t) { if (byType[t] == null) byType[t] = 0; });
    byType.labor = money(byType.labor + sum(items, function (x) { return x.internal; }) + wl);
    costs.forEach(function (c) { byType[c.type] = money(byType[c.type] + c.amount); if (c.wasteCost) byType.waste = money(byType.waste + c.wasteCost); });
    var totalCost = money(itemCost + sum(costs, function (c) { return c.total; }) + wl), revenue = money(total - tax);
    var catCost = {}; items.forEach(function (x) { Object.keys(x.costBy).forEach(function (k) { catCost[k] = money((catCost[k] || 0) + x.costBy[k]); }); });
    var area = round(sum(items, function (x) { return (x.metrics.m2 || 0) * x.qty; }), 4), lmT = round(sum(items, function (x) { return (x.metrics.lm || 0) * x.qty; }), 3), slabsT = sum(items, function (x) { return (x.metrics.slab || 0) * x.qty; }), kitchens = sum(items, function (x) { return (x.metrics.kitchen || 0) * x.qty; }), stairsN = sum(items, function (x) { return (x.metrics.step || 0) * x.qty; }), kg = round(sum(items, function (x) { return (x.metrics.kg || 0) * x.qty; }), 1);
    return { items: items, costs: costs, workers: wl, matSell: matSell, labor: laborT, extras: extras, billedCosts: billedCosts, adds: adds, returns: rets, subtotal: subtotal, discount: discount, taxPct: taxPct, tax: tax, total: total, paid: paid,
      remaining: money(total - paid), byType: byType, catCost: catCost, totalCost: totalCost, profit: money(revenue - totalCost), margin: revenue > 0 ? round((revenue - totalCost) / revenue * 100, 1) : 0, matBase: money(matBase),
      area: area, lm: lmT, slabs: slabsT, kitchens: kitchens, steps: stairsN, kg: kg, wasteCost: money(sum(items, function (x) { return x.wasteCost; }) + byType.waste) };
  }
  // خطة تقسيم ألواح للمشروع كله: كل خامة لوحدها (بمقاس لوحها) ومع البواقي لو متاحة
  function jobNest(j, ctx) {
    ctx = ctx || {}; var by = {};
    arr(j.items).forEach(function (it) {
      var x = item(it, ctx), def = (it['in'] || {}).mat || '';
      arr(x.calc.parts).forEach(function (p) { var k = p.matId || def; (by[k] = by[k] || { matId: k, parts: [] }).parts.push({ name: (it.title || '') + ' — ' + p.name, L: p.L, W: p.W, count: p.count * x.qty, rotate: true, grain: p.grain, match: p.match, seq: p.seq }); });
    });
    return Object.keys(by).map(function (k) {
      var b = by[k], m = matOf(ctx, k), sl = slabOf(m), stock = ctx.useRemnants ? arr(ctx.remnants).filter(function (r) { return r.matId && r.matId === k; }).map(function (r) { return { L: num(r.L) * 10, W: num(r.W) * 10, count: cnt(r.count), remnant: true, id: r.id }; }) : [];
      b.mat = m; b.name = matName(m);
      b.plan = (sl || stock.length) ? nest(b.parts, { std: sl ? { L: sl.L * 1000, W: sl.W * 1000 } : null, slabs: stock, kerf: ctx.kerf, margin: ctx.margin, keepL: num(ctx.keepL) * 10, keepW: num(ctx.keepW) * 10 }) : null;
      return b;
    });
  }
  function worker(w, log, pays) {
    var L = arr(log).filter(function (x) { return x.workerId === w.id; }), Pp = arr(pays).filter(function (x) { return x.workerId === w.id; });
    var earned = money(sum(L, function (x) { return num(x.amount) || num(x.qty) * num(x.rate); })), paid = money(sum(Pp, function (x) { return num(x.amount); }));
    var adv = money(sum(Pp.filter(function (x) { return x.type === 'advance'; }), function (x) { return num(x.amount); }));
    return { earned: earned, paid: paid, advances: adv, due: money(earned - paid), entries: L.length };
  }

  var api = { SHAPES: SHAPES, CUTS: CUTS, MATCH: MATCH, LABOR: LABOR, METRIC: METRIC, SCOPES: SCOPES, COST_TYPES: COST_TYPES, COST_ORDER: COST_ORDER, WASTE_MODES: WASTE_MODES,
    num: num, round: round, money: money, ceil: ceil, toM: toM, toMM: toMM, shape: shape, slabOf: slabOf, nest: nest,
    pieces: pieces, kitchen: kitchen, backsplash: backsplash, stairs: stairs, facade: facade, floor: floor, column: column, lm: lm, edges: edges, cutouts: cutouts, count: countCalc, slabs: slabs, nestCalc: nestCalc,
    waste: wasteCalc, vein: vein, weight: weight, finish: finish, mfg: mfg, install: install, transport: transport, price: priceCalc, payplan: payplan,
    KIND_CALC: KIND_CALC, ALIAS: ALIAS, line: line, laborLine: laborLine, item: item, cost: cost, job: job, jobNest: jobNest, worker: worker };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MarbleCalc = api;
})(typeof window !== 'undefined' ? window : this);
