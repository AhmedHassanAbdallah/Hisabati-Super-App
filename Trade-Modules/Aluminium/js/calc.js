/*
 * أرزقي | Arzoqi — الألوميتال وUPVC: محرك الحسابات.
 * دوال صافية (من غير واجهة ولا تخزين) — نفس الملف بيشتغل في المتصفح (window.AluCalc) وفي اختبارات Node.
 *
 * مفيش معادلة قص واحدة لكل الأنظمة: كل «نظام» (شركة/قطاع) ليه قواعده: لكل نوع شغل (جرار، مفصلي، Tilt & Turn، ثابت، باب، فولدنج)
 * قايمة قواعد — قطعة قطاع بطول = معادلة، زجاج بعرض وارتفاع = معادلة، إكسسوار بكمية = معادلة — والمعادلات بيكتبها المستخدم
 * من كتالوج قطاعه بالمتغيرات: W العرض و H الارتفاع (بالمليمتر)، N عدد الضلف/الأجزاء، M المتحرك، F الثابت، V القوائم، T العرضيات.
 * القوالب الجاهزة «تقديرية»: هيكل القطع بس والخصومات صفر — والنتيجة بتقول كده لحد ما المستخدم يكتب خصومات قطاعه.
 * Cut List Optimizer: Best Fit Decreasing بعرض السلاح والتهذيب، وبيستخدم البواقي والأعواد بأطوال مختلفة قبل العود الجديد.
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
  var TO_MM = { mm: 1, cm: 10, m: 1000 };
  function toMM(v, u) { return num(v) * (TO_MM[u] || 10); }
  function out(o) { o = o || {}; o.rows = o.rows || []; o.warn = o.warn || []; o.sug = (o.sug || []).filter(function (s) { return s.qty > 0; }); o.metrics = o.metrics || {}; return o; }
  function S(key, name, qty, unit, cat, libId, per) { var s = { key: key, name: name, qty: round(qty, 3), unit: unit || 'قطعة', cat: cat || 'acc', lib: name }; if (libId) s.libId = libId; if (per) s.per = per; return s; }

  // ====================================================================
  // المعادلات: + − × ÷ وأقواس وأرقام ومتغيرات — من غير eval
  // ====================================================================
  function expr(src, vars) {
    var s = String(src == null ? '' : src).replace(/[٠-٩]/g, function (c) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(c); }).replace(/\s+/g, '').replace(/×/g, '*').replace(/÷/g, '/').replace(/[٫,]/g, '.');
    if (!s) return { ok: false, value: 0, error: 'المعادلة فاضية' };
    var i = 0; vars = vars || {};
    function atom() {
      var rest = s.slice(i), m = /^\d+(\.\d+)?/.exec(rest);
      if (m) { i += m[0].length; return parseFloat(m[0]); }
      m = /^[A-Za-z]+/.exec(rest);
      if (m) { i += m[0].length; var k = m[0].toUpperCase(); if (!(k in vars)) throw 'متغير مش معروف: ' + m[0]; return vars[k]; }
      if (s[i] === '(') { i++; var x = add(); if (s[i] !== ')') throw 'قوس ناقص'; i++; return x; }
      if (s[i] === '-') { i++; return -atom(); }
      if (s[i] === '+') { i++; return atom(); }
      throw 'رمز مش مفهوم عند الحرف ' + (i + 1);
    }
    function mul() { var x = atom(); while (s[i] === '*' || s[i] === '/') { var o = s[i++], y = atom(); if (o === '/') { if (!y) throw 'قسمة على صفر'; x /= y; } else x *= y; } return x; }
    function add() { var x = mul(); while (s[i] === '+' || s[i] === '-') { var o = s[i++], y = mul(); x = o === '+' ? x + y : x - y; } return x; }
    try { var v = add(); if (i < s.length) throw 'رمز زيادة عند الحرف ' + (i + 1); if (!isFinite(v)) throw 'النتيجة مش رقم'; return { ok: true, value: v }; }
    catch (e) { return { ok: false, value: 0, error: String(e) }; }
  }

  // ====================================================================
  // الأنظمة والقوالب التقديرية (هيكل القطع بس — الخصومات صفر)
  // rule: { kind: profile|steel|glass|mesh|acc|gasket, role, name, len, w, h, count, qty, unit, angle, ifMesh }
  // ====================================================================
  var ROLES = { frame: 'فريم', sash: 'ضلفة', mullion: 'قائم (Mullion)', transom: 'عرضي (Transom)', interlock: 'إنترلوك', track: 'مسار', bead: 'باكتة', threshold: 'عتب', mesh: 'قطاع سلك', steel: 'حديد داخلي', coupler: 'وصلة (Coupler)', other: 'قطاع آخر' };
  var TYPES = { sliding: 'جرار Sliding', casement: 'مفصلي Casement', tilt: 'Tilt & Turn', fixed: 'ثابت Fixed', door: 'باب مفصلي', folding: 'فولدنج Folding' };
  function P(role, name, len, count, angle, extra) { var r = { kind: 'profile', role: role, name: name, len: len, count: count, angle: angle || 45 }; return Object.assign(r, extra || {}); }
  function G(name, w, h, count) { return { kind: 'glass', name: name, w: w, h: h, count: count }; }
  function A(name, qty, unit, extra) { return Object.assign({ kind: 'acc', name: name, qty: qty, unit: unit || 'قطعة' }, extra || {}); }
  function K(name, qty) { return { kind: 'gasket', name: name, qty: qty, unit: 'متر' }; }
  var TPL = {
    sliding: [P('frame', 'فريم أفقي', 'W', '2'), P('frame', 'فريم رأسي', 'H', '2'), P('sash', 'ضلفة أفقي', 'W/N', '2*N'), P('sash', 'ضلفة رأسي', 'H', '2*N'), P('interlock', 'إنترلوك', 'H', '2*(N-1)', 90),
      G('زجاج الضلفة', 'W/N', 'H', 'N'), K('جوان زجاج', '2*(W+N*H)/1000'), K('فرشة', '2*(W+2*H)/1000'), A('رولر', '2*M'), A('قفل جرار', 'M'), A('مقبض', 'M'),
      P('mesh', 'قطاع سلك', 'W/N', '2', 45, { ifMesh: true }), P('mesh', 'قطاع سلك رأسي', 'H', '2', 45, { ifMesh: true }), { kind: 'mesh', name: 'سلك', w: 'W/N', h: 'H', count: '1', ifMesh: true }],
    casement: [P('frame', 'فريم أفقي', 'W', '2'), P('frame', 'فريم رأسي', 'H', '2'), P('mullion', 'قائم', 'H', 'V', 90), P('transom', 'عرضي', 'W/N', 'T*N', 90),
      P('sash', 'ضلفة أفقي', 'W/N', '2*M'), P('sash', 'ضلفة رأسي', 'H/(T+1)', '2*M'), P('bead', 'باكتة أفقي', 'W/N', '2*N*(T+1)'), P('bead', 'باكتة رأسي', 'H/(T+1)', '2*N*(T+1)'),
      G('زجاج', 'W/N', 'H/(T+1)', 'N*(T+1)'), K('جوان زجاج', '2*(W/N+H/(T+1))*N*(T+1)/1000'), A('مفصلات', '2*M'), A('مقبض', 'M'), A('ونش / Stay', '2*M'), A('كرمون / قفل', 'M'),
      { kind: 'mesh', name: 'سلك', w: 'W/N', h: 'H/(T+1)', count: 'M', ifMesh: true }],
    tilt: [P('frame', 'فريم أفقي', 'W', '2'), P('frame', 'فريم رأسي', 'H', '2'), P('mullion', 'قائم', 'H', 'V', 90), P('sash', 'ضلفة أفقي', 'W/N', '2*M'), P('sash', 'ضلفة رأسي', 'H', '2*M'),
      P('bead', 'باكتة أفقي', 'W/N', '2*N'), P('bead', 'باكتة رأسي', 'H', '2*N'), G('زجاج', 'W/N', 'H', 'N'), K('جوان', '2*(W/N+H)*N/1000'), A('طقم Tilt & Turn', 'M', 'طقم'), A('مقبض', 'M'), A('نقاط قفل', '0', 'قطعة')],
    fixed: [P('frame', 'فريم أفقي', 'W', '2'), P('frame', 'فريم رأسي', 'H', '2'), P('mullion', 'قائم', 'H', 'V', 90), P('transom', 'عرضي', 'W/N', 'T*N', 90),
      P('bead', 'باكتة أفقي', 'W/N', '2*N*(T+1)'), P('bead', 'باكتة رأسي', 'H/(T+1)', '2*N*(T+1)'), G('زجاج', 'W/N', 'H/(T+1)', 'N*(T+1)'), K('جوان زجاج', '2*(W/N+H/(T+1))*N*(T+1)/1000')],
    door: [P('frame', 'فريم علوي', 'W', '1'), P('frame', 'فريم جانبي', 'H', '2'), P('threshold', 'عتب', 'W', '1', 90), P('sash', 'ضلفة أفقي', 'W/N', '2*N'), P('sash', 'ضلفة رأسي', 'H', '2*N'),
      P('transom', 'عرضي ضلفة', 'W/N', 'T*N', 90), G('زجاج', 'W/N', 'H/(T+1)', 'N*(T+1)'), K('جوان', '2*(W/N+H/(T+1))*N*(T+1)/1000'), A('مفصلات', '3*N'), A('كالون', '1'), A('مقبض', 'N'), A('ترباس', 'N-1')],
    folding: [P('frame', 'فريم أفقي (مسار علوي/سفلي)', 'W', '2'), P('frame', 'فريم رأسي', 'H', '2'), P('sash', 'ضلفة أفقي', 'W/N', '2*N'), P('sash', 'ضلفة رأسي', 'H', '2*N'),
      G('زجاج', 'W/N', 'H', 'N'), K('جوان', '2*(W/N+H)*N/1000'), A('مفصلات فولدنج', '3*(N-1)'), A('رولر / عربة', 'N'), A('قفل', '1'), A('مقبض', '1')]
  };
  function ST(name, len, count) { return P('steel', name, len, count, 90, { kind: 'steel' }); }
  var STEEL = { sliding: [ST('حديد فريم', '2*(W+H)', '1'), ST('حديد ضلفة', '2*(W/N+H)', 'N')], casement: [ST('حديد فريم', '2*(W+H)', '1'), ST('حديد ضلفة', '2*(W/N+H/(T+1))', 'M')],
    tilt: [ST('حديد فريم', '2*(W+H)', '1'), ST('حديد ضلفة', '2*(W/N+H)', 'M')], fixed: [ST('حديد فريم', '2*(W+H)', '1')], door: [ST('حديد فريم', 'W+2*H', '1'), ST('حديد ضلفة', '2*(W/N+H)', 'N')],
    folding: [ST('حديد فريم', '2*(W+H)', '1'), ST('حديد ضلفة', '2*(W/N+H)', 'N')] };
  function template(type, material) { var t = JSON.parse(JSON.stringify(TPL[type] || [])); if (material === 'upvc') t = t.concat(JSON.parse(JSON.stringify(STEEL[type] || []))); return t; }

  // ====================================================================
  // Cut List Optimizer — Best Fit Decreasing
  // pieces: [{ len (mm), count, label }] — stock: [{ len, count, remnant, id }] (محدودة العدد) + bar (العود القياسي، من غير حد)
  // ====================================================================
  function optimize(pieces, o) {
    o = o || {};
    var kerf = num(o.kerf), trim = num(o.trim), minKeep = num(o.minKeep), bar = num(o.bar);
    var list = [], tooLong = [];
    arr(pieces).forEach(function (p, pi) { var L = round(num(p.len), 2), c = Math.round(num(p.count)); for (var k = 0; k < c; k++) list.push({ len: L, label: p.label || '', pi: pi }); });
    list.sort(function (a, b) { return b.len - a.len; });
    var stock = arr(o.stock).map(function (s, i) { return { len: num(s.len), left: Math.round(num(s.count)), remnant: !!s.remnant, id: s.id || ('s' + i), label: s.label || '' }; }).filter(function (s) { return s.len > 0 && s.left > 0; });
    var bars = [];
    list.forEach(function (p) {
      var best = null, bestRest = Infinity;
      bars.forEach(function (b) { var rest = b.len - b.used - p.len; if (rest >= -1e-6 && rest < bestRest) { best = b; bestRest = rest; } });
      if (!best) {
        var cand = stock.filter(function (s) { return s.left > 0 && s.len - trim >= p.len - 1e-6; }).sort(function (a, b) { return a.len - b.len; })[0];
        if (cand) { cand.left--; best = { len: cand.len, used: trim, items: [], src: cand.remnant ? 'remnant' : 'stock', stockId: cand.id }; bars.push(best); }
        else if (bar && bar - trim >= p.len - 1e-6) { best = { len: bar, used: trim, items: [], src: 'new' }; bars.push(best); }
        else { tooLong.push(p); return; }
      }
      best.items.push(p); best.used = Math.min(best.len, best.used + p.len + kerf);
    });
    var res = bars.map(function (b, i) {
      var pl = round(sum(b.items, function (x) { return x.len; }), 2), kf = round(kerf * b.items.length, 2), tr = round(Math.min(trim, b.len), 2);
      var rest = round(Math.max(b.len - pl - kf - tr, 0), 2), keep = minKeep > 0 && rest >= minKeep;
      return { no: i + 1, len: b.len, src: b.src, stockId: b.stockId, items: b.items, count: b.items.length, pieces: pl, kerf: kf, trim: tr, rest: rest, keep: keep, waste: keep ? round(kf + tr, 2) : round(rest + kf + tr, 2) };
    });
    var newBars = res.filter(function (b) { return b.src === 'new'; }).length;
    var total = sum(res, function (b) { return b.len; }), used = sum(res, function (b) { return b.pieces; }), waste = sum(res, function (b) { return b.waste; });
    return { bars: res, count: res.length, newBars: newBars, fromStock: res.length - newBars, total: round(total, 2), used: round(used, 2), waste: round(waste, 2),
      keep: res.filter(function (b) { return b.keep; }).map(function (b) { return b.rest; }), wastePct: total ? round(waste / total * 100, 1) : 0, tooLong: tooLong, pieces: list.length - tooLong.length,
      minBars: bar ? ceil(sum(list, function (p) { return p.len + kerf; }) / bar) : 0 };
  }

  // ====================================================================
  // الفتحة (شباك / باب / ثابت / فولدنج) بقواعد النظام
  // ====================================================================
  function vars(inp) {
    var u = inp.unit || 'cm', W = toMM(inp.W, u), H = toMM(inp.H, u), N = Math.max(1, Math.round(cnt(inp.N)));
    var M = has(inp.M) ? Math.min(Math.round(num(inp.M)), N) : N, V = has(inp.V) ? Math.round(num(inp.V)) : N - 1, T = Math.round(num(inp.T));
    return { W: W, H: H, N: N, M: M, F: N - M, V: V, T: T };
  }
  function opening(inp, ctx) {
    inp = inp || {}; ctx = ctx || {};
    var o = out({}), type = inp.otype || 'sliding', sys = arr(ctx.systems).find(function (s) { return s.id === inp.sys; }), lib = arr(ctx.lib);
    var v = vars(inp), Q = Math.max(1, Math.round(cnt(inp.qty))), libBy = function (id) { return lib.find(function (x) { return x.id === id; }) || null; };
    if (!v.W || !v.H) { o.warn.push('اكتب عرض وارتفاع الفتحة.'); return o; }
    if (!sys) { o.warn.push('اختار النظام (القطاع) — أو اعمل نظام من «الأنظمة والقطاعات».'); }
    var rules = sys ? arr((sys.rules || {})[type]) : [];
    if (sys && !rules.length) o.warn.push('النظام «' + sys.name + '» مفيهوش قواعد لنوع «' + TYPES[type] + '» — ضيفها من الأنظمة.');
    var area = v.W * v.H / 1e6, per = 2 * (v.W + v.H) / 1000;
    o.rows.push(['المقاس', fq(v.W) + ' × ' + fq(v.H) + ' مم', inp.unit && inp.unit !== 'mm' ? 'من ' + fq(num(inp.W)) + ' × ' + fq(num(inp.H)) + ' ' + ({ cm: 'سم', m: 'م' }[inp.unit] || '') : ''],
      ['المساحة', fq(round(area * Q, 4)) + ' م²', fq(round(area, 4)) + (Q > 1 ? ' × ' + Q : '')], ['المحيط', fq(round(per * Q, 3)) + ' م.ط', '']);
    if (sys) o.rows.push(['النظام', sys.name + (sys.material === 'upvc' ? ' (UPVC)' : ' (ألوميتال)'), 'N = ' + v.N + ' · M = ' + v.M + ' · F = ' + v.F + ' · V = ' + v.V + ' · T = ' + v.T]);
    if (sys && sys.estimate) o.warn.push('نظام تقديري: الخصومات صفر (أطوال على المقاس الخارجي). اكتب خصومات قطاعك في «الأنظمة والقطاعات» قبل القص.');
    var pieces = [], glass = [], acc = [], gaskets = [], mesh = [], bad = [];
    rules.forEach(function (r) {
      if (r.ifMesh && !inp.mesh) return;
      var failed = false, ev = function (e, d) { var x = expr(has(e) ? e : d, v); if (!x.ok) { bad.push((r.name || r.kind) + ': ' + x.error); failed = true; } return x.value; };
      if (r.kind === 'profile' || r.kind === 'steel') {
        var len = round(ev(r.len), 1), c = Math.round(ev(r.count, '1'));
        if (failed || c <= 0) return; if (len <= 0) { bad.push((r.name || '') + ': الطول طلع ' + fq(len)); return; }
        var pid = (sys.roles || {})[r.role] || '', p = libBy(pid);
        pieces.push({ role: r.role, kind: r.kind, name: r.name || ROLES[r.role], len: len, count: c * Q, angle: r.angle || 90, libId: pid, profile: p ? p.name : '', bar: p ? num(p.bar) : 0, weight: p ? num(p.weight) : 0 });
      } else if (r.kind === 'glass' || r.kind === 'mesh') {
        var w = round(ev(r.w), 1), h = round(ev(r.h), 1), n = Math.round(ev(r.count, '1'));
        if (failed || n <= 0) return; if (w <= 0 || h <= 0) { bad.push((r.name || '') + ': المقاس طلع سالب أو صفر'); return; }
        (r.kind === 'glass' ? glass : mesh).push({ name: r.name, w: w, h: h, count: n * Q, area: round(w * h / 1e6 * n * Q, 4) });
      } else if (r.kind === 'acc' || r.kind === 'gasket') {
        var q = ev(r.qty, '0'); if (failed || q <= 0) return;
        (r.kind === 'acc' ? acc : gaskets).push({ name: r.name, qty: round(q * Q, 3), unit: r.unit || (r.kind === 'gasket' ? 'متر' : 'قطعة'), libId: r.lib || '' });
      }
    });
    bad.forEach(function (b) { o.warn.push('معادلة: ' + b); });
    o.pieces = pieces; o.glass = glass; o.acc = acc; o.gaskets = gaskets; o.mesh = mesh;
    // تجميع القطاعات: لكل قطاع خطة قص بطول عوده
    var byProf = {};
    pieces.forEach(function (p) { var k = p.libId || ('role:' + p.role); var g = byProf[k] || (byProf[k] = { key: k, libId: p.libId, name: p.profile || (ROLES[p.role] || p.role) + ' (مش مربوط بقطاع)', bar: p.bar, weight: p.weight, pieces: [], len: 0 }); g.pieces.push({ len: p.len, count: p.count, label: p.name }); g.len += p.len * p.count; });
    var kerf = num(sys && sys.kerf), kg = 0;
    o.profiles = Object.keys(byProf).map(function (k) {
      var g = byProf[k], m = round(g.len / 1000, 3);
      if (g.bar) { var plan = optimize(g.pieces, { bar: g.bar, kerf: kerf, trim: num(sys && sys.trim), minKeep: num(ctx.minKeep) }); g.plan = plan; g.bars = plan.count; g.waste = plan.waste; }
      if (g.weight) kg += m * g.weight;
      g.m = m;
      o.rows.push([g.name, fq(m) + ' م' + (g.bars ? ' = ' + g.bars + ' عود' : ''), g.bar ? 'عود ' + fq(g.bar) + ' مم · هالك ' + fq(round(g.waste / 1000, 3)) + ' م (' + g.plan.wastePct + '%)' : 'اكتب طول العود في المكتبة']);
      if (!g.libId) o.warn.push('دور «' + g.name.replace(' (مش مربوط بقطاع)', '') + '» مش مربوط بقطاع من المكتبة — مفيش طول عود ولا سعر.');
      if (g.bar) o.sug.push(S('p:' + k, g.name, g.bars, 'عود', 'profile', g.libId, g.bar / 1000));
      else o.sug.push(S('p:' + k, g.name, m, 'متر', 'profile', g.libId));
      return g;
    });
    var gid = inp.glass || '', gl = libBy(gid), minA = gl ? num(gl.minArea) : 0;
    var gArea = sum(glass, function (g) { return g.area; }), gBill = sum(glass, function (g) { var a = g.w * g.h / 1e6; return Math.max(a, minA) * g.count; });
    if (glass.length) {
      o.rows.push(['الزجاج', glass.reduce(function (s, g) { return s + g.count; }, 0) + ' قطعة · ' + fq(round(gArea, 3)) + ' م²', glass.map(function (g) { return g.count + ' × ' + fq(g.w) + '×' + fq(g.h); }).join(' + ') + (minA ? ' — أقل مساحة للقطعة ' + fq(minA) + ' م² → ' + fq(round(gBill, 3)) + ' م²' : '')]);
      o.sug.push(S('g:' + (gid || 'x'), gl ? gl.name : 'زجاج (اختار النوع)', gBill, 'م²', 'glass', gid));
      if (!gl) o.warn.push('اختار نوع الزجاج علشان السعر.');
    }
    var mArea = sum(mesh, function (g) { return g.area; }); if (mArea) o.sug.push(S('mesh', 'سلك ناموسية', mArea, 'م²', 'mesh'));
    acc.forEach(function (a) { o.sug.push(S('a:' + a.name, a.name, a.qty, a.unit, 'acc', a.libId)); });
    gaskets.forEach(function (a) { o.sug.push(S('k:' + a.name, a.name, a.qty, 'متر', 'gasket', a.libId)); });
    if (kg) o.rows.push(['وزن القطاعات', fq(round(kg, 2)) + ' كجم', 'الأمتار × الوزن لكل متر']);
    var door = type === 'door' || /باب/.test(inp.variant || '');
    o.area = round(area * Q, 4); o.kg = round(kg, 3);
    o.metrics = { m2: round(area * Q, 4), lm: round(per * Q, 3), piece: Q, window: door ? 0 : Q, door: door ? Q : 0, sash: v.N * Q, profile: sum(pieces, function (p) { return p.count; }), bar: sum(o.profiles, function (g) { return g.bars || 0; }), kg: round(kg, 3), facade: 0 };
    return o;
  }

  // ====================================================================
  // حاسبات تانية
  // ====================================================================
  function areaCalc(inp) {
    inp = inp || {}; var o = out({}), u = inp.unit || 'cm', tot = 0, n = 0, pr = num(inp.price);
    arr(inp.rows).forEach(function (r, i) { var w = toMM(r.w, u), h = toMM(r.h, u), c = cnt(r.count), a = w * h / 1e6 * c; if (!a) return; tot += a; n += c; o.rows.push([(r.name || 'قطعة ' + (i + 1)), fq(round(a, 4)) + ' م²', fq(w) + ' × ' + fq(h) + ' مم' + (c > 1 ? ' × ' + c : '')]); });
    o.rows.push(['إجمالي المساحة', fq(round(tot, 4)) + ' م²', n + ' قطعة']);
    if (pr) o.rows.push(['بسعر المتر', fq(money(tot * pr)), fq(round(tot, 4)) + ' × ' + fq(pr)]);
    o.area = round(tot, 4); o.metrics = { m2: round(tot, 4), piece: n };
    return o;
  }
  function profilesCalc(inp, ctx) {
    inp = inp || {}; var o = out({}), u = inp.unit || 'mm', m = 0, kg = 0, lib = arr((ctx || {}).lib);
    arr(inp.rows).forEach(function (r, i) {
      var p = lib.find(function (x) { return x.id === r.prof; }), L = toMM(r.len, u), c = cnt(r.count), mm = L * c, w = num(r.weight) || (p ? num(p.weight) : 0);
      if (!mm) return; m += mm / 1000; kg += mm / 1000 * w;
      o.rows.push([(p ? p.name : r.name || 'قطاع ' + (i + 1)), fq(round(mm / 1000, 3)) + ' م' + (w ? ' · ' + fq(round(mm / 1000 * w, 2)) + ' كجم' : ''), fq(L) + ' مم × ' + c]);
      o.sug.push(S('pr:' + i, p ? p.name : (r.name || 'قطاع'), round(mm / 1000, 3), 'متر', 'profile', p ? p.id : ''));
    });
    o.rows.push(['الإجمالي', fq(round(m, 3)) + ' م' + (kg ? ' · ' + fq(round(kg, 2)) + ' كجم' : ''), '']);
    o.metrics = { lm: round(m, 3), kg: round(kg, 3) };
    return o;
  }
  function cutCalc(inp, ctx) {
    inp = inp || {}; ctx = ctx || {}; var o = out({}), u = inp.unit || 'mm', spare = num(inp.spare);
    var pieces = arr(inp.pieces).map(function (p, i) { return { len: toMM(p.len, u), count: cnt(p.count) + (spare ? Math.ceil(cnt(p.count) * spare / 100) : 0), label: p.label || ('قطعة ' + (i + 1)) }; }).filter(function (p) { return p.len > 0 && p.count > 0; });
    var stock = arr(inp.stocks).map(function (s) { return { len: toMM(s.len, u), count: cnt(s.count), remnant: !!s.remnant }; });
    if (inp.useRemnants) arr(ctx.remnants).filter(function (r) { return !inp.prof || r.profId === inp.prof; }).forEach(function (r) { stock.push({ len: num(r.len), count: cnt(r.count), remnant: true, id: r.id, label: 'باقي ' + fq(num(r.len)) }); });
    var bar = toMM(inp.bar, u);
    if (!bar && !stock.length) { o.warn.push('اكتب طول العود القياسي (أو ضيف أعواد/بواقي بأطوالها).'); return o; }
    var r = optimize(pieces, { bar: bar, stock: stock, kerf: inp.kerf, trim: inp.trim, minKeep: toMM(inp.minKeep, u) });
    o.plan = r;
    o.rows.push(['القطع', String(r.pieces), spare ? 'شامل احتياطي ' + fq(spare) + '%' : ''], ['الأعواد', r.count + (r.fromStock ? ' (منها ' + r.fromStock + ' من البواقي/المخزون)' : ''), bar ? 'الحد الأدنى النظري ⌈(القطع + السلاح) ÷ العود⌉ = ' + r.minBars : ''],
      ['المستخدم في القطع', fq(round(r.used / 1000, 3)) + ' م', ''], ['الهالك', fq(round(r.waste / 1000, 3)) + ' م (' + r.wastePct + '%)', 'سلاح ' + fq(num(inp.kerf)) + ' مم لكل قطعة + تهذيب + بواقي أقل من ' + fq(toMM(inp.minKeep, u)) + ' مم']);
    if (r.keep.length) o.rows.push(['بواقي تتحفظ', r.keep.length + ' باقي', r.keep.map(function (x) { return fq(x); }).join('، ') + ' مم']);
    if (r.tooLong.length) o.warn.push(r.tooLong.length + ' قطعة أطول من العود — مش داخلة في الخطة.');
    if (r.newBars) o.sug.push(S('bar', 'عود ' + (inp.profName || 'قطاع') + ' ' + fq(bar) + ' مم', r.newBars, 'عود', 'profile', inp.prof || '', bar / 1000));
    o.metrics = { bar: r.count, piece: r.pieces, lm: round(r.used / 1000, 3) };
    return o;
  }
  function barsCalc(inp) {
    inp = inp || {}; var o = out({}), u = inp.unit || 'mm', bar = toMM(inp.bar, u), kerf = num(inp.kerf), tot = 0, n = 0, long = 0;
    arr(inp.pieces).forEach(function (p) { var L = toMM(p.len, u), c = cnt(p.count); if (!L) return; tot += (L + kerf) * c; n += c; if (bar && L > bar) long += c; });
    o.rows.push(['إجمالي الأطوال بالسلاح', fq(round(tot / 1000, 3)) + ' م', n + ' قطعة × (الطول + ' + fq(kerf) + ' مم)']);
    if (bar) { var b = ceil(tot / bar); o.rows.push(['عدد الأعواد (حد أدنى)', String(b), '⌈' + fq(round(tot, 1)) + ' ÷ ' + fq(bar) + '⌉ — التوزيع الفعلي في Cut Optimizer']); o.sug.push(S('bar', 'عود ' + fq(bar) + ' مم', b, 'عود', 'profile', '', bar / 1000)); }
    else o.warn.push('اكتب طول العود.');
    if (long) o.warn.push(long + ' قطعة أطول من العود.');
    o.metrics = { bar: bar ? ceil(tot / bar) : 0, piece: n };
    return o;
  }
  var WASTE_MODES = { pct: 'نسبة %', qty: 'كمية', piece: 'لكل قطعة', bar: 'لكل عود', area: 'م² زجاج', manual: 'مبلغ يدوي' };
  function wasteCalc(inp) {
    inp = inp || {}; var o = out({}), tot = 0;
    arr(inp.rows).forEach(function (r, i) {
      var b = num(r.base), v = num(r.value), pr = num(r.price), m = r.mode || 'pct', q = 0, c = 0;
      if (m === 'pct') q = b * Math.min(v, 100) / 100; else if (m === 'manual') c = v; else q = m === 'qty' ? v : b * v;
      if (m !== 'manual') c = q * pr; tot += c;
      if (!b && !v) return;
      o.rows.push([(r.name || 'خامة ' + (i + 1)) + ' — ' + WASTE_MODES[m], m === 'manual' ? fq(money(c)) : fq(round(q, 3)) + ' ' + (r.unit || '') + (pr ? ' = ' + fq(money(c)) : ''), m === 'pct' ? fq(b) + ' × ' + fq(v) + '%' : m === 'qty' ? 'كمية يدوي' : m === 'manual' ? '' : fq(b) + ' × ' + fq(v)]);
    });
    o.rows.push(['تكلفة الهالك', fq(money(tot)), 'ظاهرة لوحدها — مش مخفية في السعر']);
    o.waste = money(tot); return o;
  }
  function sashesCalc(inp) {
    inp = inp || {}; var o = out({}), u = inp.unit || 'cm', W = toMM(inp.W, u), mx = toMM(inp.maxSash, u), mn = toMM(inp.minSash, u), ov = num(inp.overlap);
    if (!W || !mx) { o.warn.push('اكتب العرض وأقصى عرض للضلفة (من كتالوج النظام).'); return o; }
    var N = Math.max(1, ceil(W / mx)), sw = (W + ov * (N - 1)) / N;
    o.rows.push(['عدد الضلف', String(N), '⌈' + fq(W) + ' ÷ ' + fq(mx) + '⌉'], ['عرض الضلفة', fq(round(sw, 1)) + ' مم', ov ? '(' + fq(W) + ' + ' + fq(ov) + ' × ' + (N - 1) + ' تراكب) ÷ ' + N : fq(W) + ' ÷ ' + N]);
    if (mn && sw < mn) o.warn.push('عرض الضلفة أقل من الحد الأدنى (' + fq(mn) + ' مم).');
    o.N = N; o.sw = round(sw, 1); o.metrics = { sash: N };
    return o;
  }
  function glassCalc(inp, ctx) {
    inp = inp || {}; var o = out({}), u = inp.unit || 'cm', lib = arr((ctx || {}).lib), area = 0, bill = 0, n = 0, by = {};
    var dw = num(inp.dw), dh = num(inp.dh);
    arr(inp.rows).forEach(function (r, i) {
      var gl = lib.find(function (x) { return x.id === (r.glass || inp.glass); }), w = toMM(r.w, u) - dw, h = toMM(r.h, u) - dh, c = cnt(r.count);
      if (w <= 0 || h <= 0) { if (num(r.w)) o.warn.push((r.name || 'قطعة ' + (i + 1)) + ': المقاس بعد الخصم صفر أو سالب'); return; }
      var a = w * h / 1e6, minA = gl ? num(gl.minArea) : num(inp.minArea), b = Math.max(a, minA) * c;
      area += a * c; bill += b; n += c;
      var k = gl ? gl.id : 'x'; by[k] = by[k] || { gl: gl, area: 0 }; by[k].area += b;
      o.rows.push([(r.name || 'قطعة ' + (i + 1)) + (gl ? ' — ' + gl.name : ''), fq(round(a * c, 4)) + ' م²', fq(w) + ' × ' + fq(h) + ' مم' + (c > 1 ? ' × ' + c : '') + (b > a * c + 1e-9 ? ' (بيتحسب ' + fq(round(b, 4)) + ' م² بالحد الأدنى)' : '')]);
    });
    if (dw || dh) o.rows.unshift(['خصم المقاس', fq(dw) + ' / ' + fq(dh) + ' مم', 'من العرض / الارتفاع حسب النظام']);
    var wp = num(inp.waste); o.rows.push(['إجمالي المساحة', fq(round(area, 4)) + ' م²', n + ' قطعة'], ['المساحة المحسوبة' + (wp ? ' + هالك ' + fq(wp) + '%' : ''), fq(round(bill * (1 + wp / 100), 4)) + ' م²', '']);
    Object.keys(by).forEach(function (k) { var g = by[k]; o.sug.push(S('g:' + k, g.gl ? g.gl.name : 'زجاج', g.area * (1 + wp / 100), 'م²', 'glass', g.gl ? g.gl.id : '')); });
    if (!Object.keys(by).some(function (k) { return k !== 'x'; }) && n) o.warn.push('اختار نوع الزجاج من المكتبة علشان السعر.');
    if (num(inp.transport)) o.sug.push(S('transport', 'نقل الزجاج', 1, 'مرة', 'other'));
    o.area = round(area, 4); o.bill = round(bill * (1 + wp / 100), 4);
    o.metrics = { m2: round(area, 4), piece: n };
    return o;
  }
  function shutter(inp) {
    inp = inp || {}; var o = out({}), u = inp.unit || 'cm', W = toMM(inp.W, u), H = toMM(inp.H, u), sh = num(inp.slatH), q = cnt(inp.qty);
    if (!W || !H) { o.warn.push('اكتب العرض والارتفاع.'); return o; }
    var area = W * H / 1e6;
    o.rows.push(['المساحة', fq(round(area * q, 4)) + ' م²', fq(W) + ' × ' + fq(H) + (q > 1 ? ' × ' + q : '')]);
    if (sh) {
      var slats = ceil(H / sh) + Math.round(num(inp.extraSlats)), sl = W - num(inp.slatDeduct);
      o.rows.push(['الشرائح', slats * q + ' شريحة × ' + fq(sl) + ' مم', '⌈' + fq(H) + ' ÷ ' + fq(sh) + '⌉' + (num(inp.extraSlats) ? ' + ' + fq(num(inp.extraSlats)) + ' للف' : '') + (num(inp.slatDeduct) ? ' — الطول ' + fq(W) + ' − ' + fq(num(inp.slatDeduct)) : '')]);
      o.sug.push(S('sl', 'شريحة شتر ' + (inp.slat || ''), round(slats * sl / 1000 * q, 3), 'متر', 'profile'));
    } else o.warn.push('اكتب ارتفاع الشريحة (من الكتالوج) علشان نحسب عدد الشرائح.');
    var gl = 2 * (H + num(inp.guideExtra));
    o.rows.push(['الجوانب (الجايد)', fq(round(gl * q / 1000, 3)) + ' م', '2 × (' + fq(H) + (num(inp.guideExtra) ? ' + ' + fq(num(inp.guideExtra)) : '') + ')']);
    o.sug.push(S('gd', 'جايد شتر', round(gl * q / 1000, 3), 'متر', 'profile'), S('box', 'صندوق شتر ' + (num(inp.box) ? fq(num(inp.box)) + ' مم' : ''), round(W * q / 1000, 3), 'متر', 'profile'), S('br', 'Bottom Rail', round((W - num(inp.slatDeduct)) * q / 1000, 3), 'متر', 'profile'));
    if (inp.type === 'motor') {
      o.sug.push(S('motor', 'موتور شتر', q, 'قطعة', 'acc'), S('rc', 'ريموت / كنترول', cnt(inp.remotes) * q, 'قطعة', 'acc'));
      var cap = num(inp.motorCap), kg = num(inp.kgm2) * area;
      if (cap && kg) { o.rows.push(['وزن الستارة', fq(round(kg, 2)) + ' كجم', fq(round(area, 3)) + ' م² × ' + fq(num(inp.kgm2)) + ' كجم/م²']); if (kg > cap) o.warn.push('الوزن (' + fq(round(kg, 1)) + ' كجم) أكبر من قدرة الموتور (' + fq(cap) + ' كجم).'); }
      else o.warn.push('للتأكد من الموتور: اكتب وزن المتر المربع من الشرائح وقدرة الموتور بالكيلو (من الكتالوج).');
    } else o.sug.push(S('belt', 'طقم يدوي (شريط/ونش)', q, 'طقم', 'acc'));
    o.metrics = { m2: round(area * q, 4), piece: q };
    return o;
  }
  function mosquito(inp) {
    inp = inp || {}; var o = out({}), u = inp.unit || 'cm', q = cnt(inp.qty), W = toMM(inp.W, u) - num(inp.dw), H = toMM(inp.H, u) - num(inp.dh), ov = num(inp.overlap), t = inp.type || 'sliding';
    if (W <= 0 || H <= 0) { o.warn.push('اكتب العرض والارتفاع (بعد الخصم).'); return o; }
    var per = 2 * (W + H) * q, mesh = (W + 2 * ov) * (H + 2 * ov) / 1e6 * q;
    o.rows.push(['مقاس الناموسية', fq(W) + ' × ' + fq(H) + ' مم', (num(inp.dw) || num(inp.dh)) ? 'بعد خصم ' + fq(num(inp.dw)) + ' / ' + fq(num(inp.dh)) : ''], ['القطاع', fq(round(per / 1000, 3)) + ' م', '2 × (' + fq(W) + ' + ' + fq(H) + ')' + (q > 1 ? ' × ' + q : '')], ['الشبك', fq(round(mesh, 4)) + ' م²', ov ? 'بزيادة ' + fq(ov) + ' مم من كل جنب' : '']);
    o.sug.push(S('mp', 'قطاع ناموسية ' + (inp.profile || ''), round(per / 1000, 3), 'متر', 'profile'), S('mesh', 'شبك ' + (inp.mesh || ''), round(mesh, 4), 'م²', 'mesh'), S('cor', 'زوايا', 4 * q, 'قطعة', 'acc'));
    if (t === 'sliding') o.sug.push(S('rol', 'رولر ناموسية', 2 * q, 'قطعة', 'acc'), S('brush', 'فرشة', round(2 * H * q / 1000, 3), 'متر', 'gasket'));
    if (t === 'roller' || t === 'pleated') o.sug.push(S('kit', 'طقم ' + (t === 'roller' ? 'رول' : 'Pleated'), q, 'طقم', 'acc'));
    if (t === 'hinged') o.sug.push(S('hin', 'مفصلات', 2 * q, 'قطعة', 'acc'));
    if (t !== 'fixed') o.sug.push(S('hdl', 'مقبض', q, 'قطعة', 'acc'));
    o.metrics = { m2: round(W * H / 1e6 * q, 4), lm: round(per / 1000, 3), piece: q };
    return o;
  }
  function shower(inp, ctx) {
    inp = inp || {}; var o = out({}), u = inp.unit || 'cm', lib = arr((ctx || {}).lib), gl = lib.find(function (x) { return x.id === inp.glass; }), area = 0, doors = 0, sliding = 0, n = 0, width = 0;
    arr(inp.panels).forEach(function (p, i) {
      var w = toMM(p.w, u), h = toMM(p.h, u), c = cnt(p.count); if (!w || !h) return;
      area += w * h / 1e6 * c; n += c; width += w * c;
      if (p.type === 'door') doors += c; if (p.type === 'sliding') sliding += c;
      o.rows.push([(p.name || 'لوح ' + (i + 1)) + ' — ' + ({ fixed: 'ثابت', door: 'باب مفصلي', sliding: 'باب جرار' }[p.type] || ''), fq(round(w * h / 1e6 * c, 4)) + ' م²', fq(w) + ' × ' + fq(h) + (c > 1 ? ' × ' + c : '')]);
    });
    o.rows.push(['الزجاج', n + ' لوح · ' + fq(round(area, 4)) + ' م²', (gl ? gl.name : '') + (num(inp.thick) ? ' ' + fq(num(inp.thick)) + ' مم' : '')]);
    if (area) o.sug.push(S('g:' + (gl ? gl.id : 'x'), gl ? gl.name : 'زجاج سيكوريت', area, 'م²', 'glass', gl ? gl.id : ''));
    if (doors) o.sug.push(S('hin', 'مفصلات شاور', doors * cnt(inp.hinges), 'قطعة', 'acc'), S('hdl', 'مقبض', doors, 'قطعة', 'acc'));
    if (sliding) o.sug.push(S('rol', 'رولر / عربة شاور', sliding * cnt(inp.rollers), 'قطعة', 'acc'), S('hdl2', 'مقبض', sliding, 'قطعة', 'acc'), S('rail', 'ماسورة / مسار علوي', round(width / 1000, 3), 'متر', 'profile'));
    if (inp.frame !== 'frameless' && width) o.sug.push(S('chn', 'قطاع / U Channel', round((width + 2 * toMM(arr(inp.panels)[0] && arr(inp.panels)[0].h, u)) / 1000, 3), 'متر', 'profile'));
    var sil = num(inp.silicone); if (sil) o.sug.push(S('sil', 'سيليكون', sil, 'متر', 'gasket'));
    if (num(inp.fix)) o.sug.push(S('fix', 'مستلزمات تثبيت', num(inp.fix), 'طقم', 'acc'));
    if (!inp.glass) o.warn.push('اختار نوع الزجاج من المكتبة علشان السعر.');
    o.metrics = { m2: round(area, 4), piece: n, door: doors + sliding };
    return o;
  }
  function splitList(txt, total, n) {
    var l = String(txt || '').split(/[,،+\s]+/).map(num).filter(Boolean);
    if (l.length) return l;
    n = Math.max(1, Math.round(n || 1)); var a = []; for (var i = 0; i < n; i++) a.push(total / n); return a;
  }
  function facade(inp) {
    inp = inp || {}; var o = out({}), u = inp.unit || 'mm', W = toMM(inp.W, u), H = toMM(inp.H, u), q = cnt(inp.qty);
    if (!W || !H) { o.warn.push('اكتب عرض وارتفاع الواجهة.'); return o; }
    var cols = splitList(inp.cols, W, cnt(inp.ncols)).map(function (x) { return has(inp.cols) ? toMM(x, u) : x; }), rows = splitList(inp.rows, H, cnt(inp.nrows)).map(function (x) { return has(inp.rows) ? toMM(x, u) : x; });
    var sw = sum(cols), sh = sum(rows);
    if (Math.abs(sw - W) > 1) o.warn.push('مجموع عروض التقسيمات (' + fq(sw) + ') مش مساوي للعرض (' + fq(W) + ').');
    if (Math.abs(sh - H) > 1) o.warn.push('مجموع ارتفاعات التقسيمات (' + fq(sh) + ') مش مساوي للارتفاع (' + fq(H) + ').');
    var nm = cols.length + 1, nt = (rows.length + 1) * cols.length, mull = nm * H, tran = (rows.length + 1) * W;
    var dg = num(inp.glassDeduct), acpRows = Math.min(Math.round(num(inp.acpRows)), rows.length), panels = [], gArea = 0, aArea = 0, sil = 0;
    rows.forEach(function (rh, ri) { cols.forEach(function (cw) { var w = cw - dg, h = rh - dg; if (w <= 0 || h <= 0) return; var a = w * h / 1e6; if (ri < acpRows) aArea += a; else { gArea += a; panels.push([w, h]); } sil += 2 * (w + h) / 1000; }); });
    o.rows.push(['المساحة', fq(round(W * H / 1e6 * q, 4)) + ' م²', fq(W) + ' × ' + fq(H) + ' مم'], ['التقسيمات', cols.length + ' عمود × ' + rows.length + ' صف', 'عروض: ' + cols.map(function (x) { return fq(round(x, 1)); }).join('، ') + ' — ارتفاعات: ' + rows.map(function (x) { return fq(round(x, 1)); }).join('، ')],
      ['Mullions', nm + ' × ' + fq(H) + ' = ' + fq(round(mull * q / 1000, 3)) + ' م', ''], ['Transoms', fq(round(tran * q / 1000, 3)) + ' م', (rows.length + 1) + ' خط × ' + fq(W)],
      ['ألواح الزجاج', panels.length * q + ' لوح · ' + fq(round(gArea * q, 4)) + ' م²', dg ? 'بخصم ' + fq(dg) + ' مم' : '']);
    if (aArea) o.rows.push(['ACP', fq(round(aArea * q, 4)) + ' م²', acpRows + ' صف']);
    o.sug.push(S('mul', 'قطاع Mullion', round(mull * q / 1000, 3), 'متر', 'profile'), S('tr', 'قطاع Transom', round(tran * q / 1000, 3), 'متر', 'profile'), S('g:x', 'زجاج واجهات', round(gArea * q, 4), 'م²', 'glass'));
    if (aArea) o.sug.push(S('acp', 'ألواح ACP', round(aArea * q, 4), 'م²', 'other'));
    o.sug.push(S('sil', 'سيليكون', round(sil * q, 3), 'متر', 'gasket'), S('gas', 'جوانات', round(sil * q * cnt(inp.gasketFactor), 3), 'متر', 'gasket'));
    if (num(inp.anchors)) o.sug.push(S('anc', 'براكيت / تثبيت', nm * num(inp.anchors) * q, 'قطعة', 'acc'));
    o.warn.push('حصر كميات للواجهة — الأحمال والتثبيت والتصميم الإنشائي للـ Curtain Wall مسؤولية مهندس/مورد النظام.');
    o.metrics = { m2: round(W * H / 1e6 * q, 4), facade: q, piece: panels.length * q, lm: round((mull + tran) * q / 1000, 3) };
    return o;
  }
  function acp(inp) {
    inp = inp || {}; var o = out({}), u = inp.unit || 'mm', W = toMM(inp.W, u), H = toMM(inp.H, u), mw = toMM(inp.mw, u), mh = toMM(inp.mh, u), ret = num(inp.ret), sw = toMM(inp.sw, u), shh = toMM(inp.sh, u), wp = num(inp.waste);
    if (!W || !H) { o.warn.push('اكتب العرض والارتفاع.'); return o; }
    var area = W * H / 1e6;
    o.rows.push(['المساحة', fq(round(area, 4)) + ' م²', '']);
    var need = area;
    if (mw && mh) { var nx = ceil(W / mw), ny = ceil(H / mh), mod = nx * ny, ma = (mw + 2 * ret) * (mh + 2 * ret) / 1e6; need = mod * ma; o.rows.push(['الموديولات', mod + ' (' + nx + ' × ' + ny + ')', 'كل موديول ' + fq(mw) + '×' + fq(mh) + (ret ? ' + طي ' + fq(ret) + ' مم' : '') + ' = ' + fq(round(ma, 4)) + ' م²']); }
    need *= 1 + wp / 100;
    o.rows.push(['المطلوب' + (wp ? ' بهالك ' + fq(wp) + '%' : ''), fq(round(need, 4)) + ' م²', '']);
    if (sw && shh) { var sheets = ceil(need / (sw * shh / 1e6)); o.rows.push(['الألواح', String(sheets), '⌈' + fq(round(need, 3)) + ' ÷ ' + fq(round(sw * shh / 1e6, 4)) + '⌉ — بالمساحة (التوزيع الفعلي حسب التقطيع)']); o.sug.push(S('acp', 'لوح ACP ' + fq(sw) + '×' + fq(shh), sheets, 'لوح', 'other')); }
    else { o.warn.push('اكتب مقاس اللوح من المورد علشان نحسب عدد الألواح.'); o.sug.push(S('acpm', 'ACP', need, 'م²', 'other')); }
    o.metrics = { m2: round(area, 4), facade: 1 };
    return o;
  }
  function mfg(inp) {
    inp = inp || {}; var o = out({}), q = cnt(inp.qty), F = [['profiles', 'القطاعات'], ['glass', 'الزجاج'], ['acc', 'الإكسسوارات'], ['cons', 'المستهلكات'], ['waste', 'الهالك'], ['cut', 'أجرة القص'], ['assembly', 'أجرة التجميع'], ['glazing', 'تركيب الزجاج'], ['hardware', 'تركيب الإكسسوارات'], ['finish', 'التشطيب']];
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
  function laborOnly(inp) { inp = inp || {}; return out({ metrics: { m2: num(inp.m2), lm: num(inp.lm), piece: num(inp.pieces), window: num(inp.windows), sash: num(inp.sashes), door: num(inp.doors), facade: num(inp.facades), profile: num(inp.profiles), bar: num(inp.bars), kg: num(inp.kg) } }); }
  function custom() { return out({}); }
  var KIND_CALC = { opening: opening, area: areaCalc, profiles: profilesCalc, cut: cutCalc, bars: barsCalc, waste: wasteCalc, sashes: sashesCalc, glass: glassCalc, shutter: shutter, mosquito: mosquito, shower: shower,
    facade: facade, acp: acp, mfg: mfg, install: install, price: priceCalc, payplan: payplan, labor: laborOnly, custom: custom };

  // ====================================================================
  // البند والمشروع
  // ====================================================================
  var LABOR = { m2: 'بالمتر المربع', lm: 'بالمتر الطولي', piece: 'بالقطعة', window: 'بالشباك', sash: 'بالضلفة', door: 'بالباب', facade: 'بالواجهة', profile: 'بالقطاع', bar: 'بالعود', kg: 'بالوزن (كجم)', daily: 'باليومية', hour: 'بالساعة', lump: 'مقطوعية' };
  var METRIC = { m2: 'm2', lm: 'lm', piece: 'piece', window: 'window', sash: 'sash', door: 'door', facade: 'facade', profile: 'profile', bar: 'bar', kg: 'kg' };
  var COUNTABLE = /^(قطعة|طقم|عود|لوح|كرتونة|عبوة|رول|مرة)$/;
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
    var kind = it.kind, f = KIND_CALC[kind] ? kind : (TYPES[kind] ? 'opening' : 'custom');
    var inp = Object.assign({}, it['in'] || {}); if (TYPES[kind]) inp.otype = inp.otype || kind;
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
    var area = round(sum(items, function (x) { return x.metrics.m2 || 0; }), 4), windows = sum(items, function (x) { return x.metrics.window || 0; }), doors = sum(items, function (x) { return x.metrics.door || 0; });
    return { items: items, costs: costs, workers: wl, matSell: matSell, labor: laborT, extras: extras, billedCosts: billedCosts, adds: adds, returns: rets, subtotal: subtotal, discount: discount, taxPct: taxPct, tax: tax, total: total, paid: paid,
      remaining: money(total - paid), byType: byType, catCost: catCost, totalCost: totalCost, profit: money(revenue - totalCost), margin: revenue > 0 ? round((revenue - totalCost) / revenue * 100, 1) : 0, matBase: money(matBase),
      area: area, windows: windows, doors: doors, wasteCost: money(sum(items, function (x) { return x.wasteCost; }) + byType.waste) };
  }
  // خطة قص للمشروع كله: كل قطاع لوحده، ومع البواقي لو متاحة
  function jobCut(j, ctx) {
    ctx = ctx || {}; var by = {};
    arr(j.items).forEach(function (it) {
      var x = item(it, ctx); arr(x.calc.profiles).forEach(function (g) {
        var b = by[g.key] || (by[g.key] = { key: g.key, libId: g.libId, name: g.name, bar: g.bar, pieces: [] });
        g.pieces.forEach(function (p) { b.pieces.push({ len: p.len, count: p.count, label: (it.title || '') + ' ' + p.label }); });
      });
    });
    return Object.keys(by).map(function (k) {
      var b = by[k], stock = ctx.useRemnants ? arr(ctx.remnants).filter(function (r) { return r.profId && r.profId === b.libId; }).map(function (r) { return { len: num(r.len), count: cnt(r.count), remnant: true, id: r.id }; }) : [];
      b.plan = (b.bar || stock.length) ? optimize(b.pieces, { bar: b.bar, stock: stock, kerf: ctx.kerf, trim: ctx.trim, minKeep: ctx.minKeep }) : null;
      return b;
    });
  }
  function worker(w, log, pays) {
    var L = arr(log).filter(function (x) { return x.workerId === w.id; }), Pp = arr(pays).filter(function (x) { return x.workerId === w.id; });
    var earned = money(sum(L, function (x) { return num(x.amount) || num(x.qty) * num(x.rate); })), paid = money(sum(Pp, function (x) { return num(x.amount); }));
    var adv = money(sum(Pp.filter(function (x) { return x.type === 'advance'; }), function (x) { return num(x.amount); }));
    return { earned: earned, paid: paid, advances: adv, due: money(earned - paid), entries: L.length };
  }

  var api = { ROLES: ROLES, TYPES: TYPES, TPL: TPL, LABOR: LABOR, METRIC: METRIC, SCOPES: SCOPES, COST_TYPES: COST_TYPES, COST_ORDER: COST_ORDER, WASTE_MODES: WASTE_MODES,
    num: num, round: round, money: money, ceil: ceil, toMM: toMM, expr: expr, template: template, optimize: optimize, vars: vars,
    opening: opening, area: areaCalc, profiles: profilesCalc, cut: cutCalc, bars: barsCalc, waste: wasteCalc, sashes: sashesCalc, glass: glassCalc, shutter: shutter, mosquito: mosquito, shower: shower,
    facade: facade, acp: acp, mfg: mfg, install: install, price: priceCalc, payplan: payplan, KIND_CALC: KIND_CALC, line: line, laborLine: laborLine, item: item, cost: cost, job: job, jobCut: jobCut, worker: worker };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AluCalc = api;
})(typeof window !== 'undefined' ? window : this);
