/*
 * أرزقي | Arzoqi — النجارة: محرك الحسابات.
 * دوال صافية (من غير واجهة ولا تخزين) — نفس الملف بيشتغل في المتصفح (window.CarpCalc) وفي اختبارات Node.
 *
 * الحساب الداخلي دايماً بوحدات موحدة: الأطوال بالمتر (والألواح بالمليمتر)، والمساحة م²، والحجم م³.
 *
 * طرق حساب المصنعية (method):
 *   piece   بالقطعة/الباب/الوحدة   العدد × سعر الوحدة
 *   lm      بالمتر الطولي          الطول (م) × العدد × سعر المتر
 *   sqm     بالمتر المربع          العرض × الارتفاع (م²) × العدد × سعر المتر
 *   board   باللوح                عدد الألواح × سعر اللوح
 *   parts   بالأجزاء (دواليب)      وحدات × سعر + ضلف × سعر + أدراج × سعر + أرفف × سعر
 *   zones   مطبخ بالمتر الطولي     أرضي (م) × سعر + علوي (م) × سعر + طويل (م) × سعر
 *   list    قطع/وحدات/مهام         مجموع (العدد × السعر) لكل سطر
 *   lump    مقطوعية               مبلغ يحدده النجار
 *   daily   يومية                 الأيام × اليومية × (عدد العمال لو اليومية لكل عامل)
 *   hour    بالساعة (CNC)          الساعات × سعر الساعة
 * وكل بند ممكن يبقى عليه تركيب (مبلغ) وإضافات (نقل، فك، تصميم، تجهيز ملف…).
 * مفيش أي أسعار افتراضية: كل الأسعار بيكتبها النجار.
 * © 2026 أحمد حسن عبدالله
 */
(function (root) {
  'use strict';

  var METHODS = {
    piece: { label: 'بالقطعة', unit: 'قطعة' },
    lm: { label: 'بالمتر الطولي', unit: 'م.ط' },
    sqm: { label: 'بالمتر المربع', unit: 'م²' },
    board: { label: 'باللوح', unit: 'لوح' },
    parts: { label: 'بالوحدة والضلفة والدرج', unit: 'تفصيلي' },
    zones: { label: 'مطبخ بالمتر الطولي', unit: 'م.ط' },
    list: { label: 'قطعة قطعة', unit: 'قطع' },
    lump: { label: 'مقطوعية', unit: 'مقطوعية' },
    daily: { label: 'باليومية', unit: 'يوم' },
    hour: { label: 'بالساعة', unit: 'ساعة' }
  };
  var METHOD_ORDER = ['piece', 'lm', 'sqm', 'board', 'parts', 'zones', 'list', 'lump', 'daily', 'hour'];

  // أنواع التكاليف والخامات على المشروع
  var COST_TYPES = {
    mat: 'خامات', acc: 'إكسسوارات', cons: 'مستهلكات', waste: 'هالك', labor: 'عمالة',
    transport: 'نقل', install: 'تركيب', run: 'تشغيل', other: 'مصاريف أخرى'
  };
  var COST_ORDER = ['mat', 'acc', 'cons', 'waste', 'labor', 'transport', 'install', 'run', 'other'];

  // رقم آمن: الأرقام العربية، «2,000» فاصل آلاف و«2,5» كسر — ومفيش NaN ولا Infinity ولا سالب
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
  // العدد: الخانة الفاضية = 1، والصفر صفر
  function count(v) { return (v == null || String(v).trim() === '') ? 1 : num(v); }
  // تحويل الأطوال
  var TO_M = { mm: 0.001, cm: 0.01, m: 1 };
  function toM(v, unit) { return num(v) * (TO_M[unit] || 1); }
  function toMM(v, unit) { return num(v) * (TO_M[unit] || 1) * 1000; }

  // حساب بند واحد
  function item(it) {
    it = it || {};
    var m = METHODS[it.method] ? it.method : 'piece';
    var u = it.dimUnit || 'cm';
    var r = { method: m, unit: it.unitLabel || METHODS[m].unit, price: num(it.price), qty: 0, labor: 0, rows: [] };
    var c = count(it.qty);
    if (m === 'piece') { r.qty = c; r.labor = c * r.price; }
    else if (m === 'lm') { r.len = round(toM(it.w, u), 4); r.qty = round(r.len * c, 4); r.labor = r.qty * r.price; }
    else if (m === 'sqm') {
      r.w = round(toM(it.w, u), 4); r.h = round(toM(it.h, u), 4);
      r.areaEach = round(r.w * r.h, 4); r.qty = round(r.areaEach * c, 4); r.labor = r.qty * r.price;
    }
    else if (m === 'board') { r.qty = num(it.boards); r.labor = r.qty * r.price; }
    else if (m === 'parts') {
      var p = it.parts || {};
      r.parts = ['units', 'doors', 'drawers', 'shelves'].map(function (k) {
        var q = num(p[k]), pr = num(p[k + 'Price']); return { key: k, qty: q, price: pr, total: money(q * pr) };
      });
      r.qty = 1; r.labor = r.parts.reduce(function (s, x) { return s + x.total; }, 0);
    }
    else if (m === 'zones') {
      var z = it.zones || {};
      r.zones = ['base', 'wall', 'tall'].map(function (k) {
        var len = round(toM(z[k], z.unit || 'm'), 4), pr = num(z[k + 'Price']); return { key: k, len: len, price: pr, total: money(len * pr) };
      });
      r.qty = round(r.zones.reduce(function (s, x) { return s + x.len; }, 0), 4);
      r.labor = r.zones.reduce(function (s, x) { return s + x.total; }, 0);
    }
    else if (m === 'list') {
      r.rows = (Array.isArray(it.rows) ? it.rows : []).map(function (x) {
        x = x || {}; var q = count(x.qty), pr = num(x.price); return { name: x.name || '', qty: q, price: pr, total: money(q * pr) };
      });
      r.qty = r.rows.reduce(function (s, x) { return s + x.qty; }, 0);
      r.labor = r.rows.reduce(function (s, x) { return s + x.total; }, 0);
    }
    else if (m === 'lump') { r.qty = 1; r.labor = num(it.amount); r.price = r.labor; }
    else if (m === 'daily') {
      r.days = num(it.days); r.workers = Math.max(num(it.workers), 0) || 1; r.perWorker = it.perWorker !== false;
      r.qty = r.days; r.labor = r.days * r.price * (r.perWorker ? r.workers : 1);
    }
    else if (m === 'hour') { r.qty = num(it.hours); r.labor = r.qty * r.price; }
    r.labor = money(r.labor);
    r.install = money(num(it.install));
    r.extras = (Array.isArray(it.extras) ? it.extras : []).map(function (x) { return { name: (x && x.name) || '', amount: money(num(x && x.amount)) }; });
    r.extrasTotal = money(r.extras.reduce(function (s, x) { return s + x.amount; }, 0));
    r.total = money(r.labor + r.install + r.extrasTotal);
    return r;
  }

  // سطر تكلفة / خامة: الكمية × السعر، وهالك اختياري بالنسبة (مش بيتطبق إلا لو النجار كتبه)
  function cost(c, matBase) {
    c = c || {};
    var type = COST_TYPES[c.type] ? c.type : 'other';
    var r = { type: type, billed: !!c.billed, qty: num(c.qty), price: num(c.price), wastePct: Math.min(num(c.wastePct), 100) };
    if (type === 'waste' && c.mode === 'pct') { r.pct = Math.min(num(c.pct), 100); r.base = money(matBase || 0); r.amount = money(r.base * r.pct / 100); }
    else r.amount = money(r.qty * r.price);
    r.wasteQty = round(r.qty * r.wastePct / 100, 4);
    r.wasteCost = money(r.wasteQty * r.price);
    r.total = money(r.amount + r.wasteCost);
    return r;
  }

  // المشروع كله
  function job(j) {
    j = j || {};
    var items = (Array.isArray(j.items) ? j.items : []).map(item);
    var raw = Array.isArray(j.costs) ? j.costs : [];
    // أساس نسبة الهالك العامة = تكلفة الخامات المسجلة
    var matBase = raw.reduce(function (s, c) { return s + (c && c.type === 'mat' ? money(num(c.qty) * num(c.price)) : 0); }, 0);
    var costs = raw.map(function (c) { return cost(c, matBase); });
    var sum = function (a, f) { return money(a.reduce(function (s, x) { return s + f(x); }, 0)); };
    var labor = sum(items, function (x) { return x.labor; });
    var install = sum(items, function (x) { return x.install; });
    var extras = sum(items, function (x) { return x.extrasTotal; });
    var byType = {}, billedByType = {};
    COST_ORDER.forEach(function (t) { byType[t] = 0; billedByType[t] = 0; });
    costs.forEach(function (c) {
      byType[c.type] = money(byType[c.type] + c.total);
      // الهالك المحسوب على خامة بيتعد في بند الهالك
      if (c.wasteCost && c.type !== 'waste') { byType[c.type] = money(byType[c.type] - c.wasteCost); byType.waste = money(byType.waste + c.wasteCost); }
      if (c.billed) billedByType[c.type] = money(billedByType[c.type] + c.total);
    });
    var billed = sum(costs, function (c) { return c.billed ? c.total : 0; });
    var subtotal = money(labor + install + extras + billed);
    var d = j.discount || {};
    var discount = d.type === 'percent' ? money(subtotal * Math.min(num(d.value), 100) / 100) : money(Math.min(num(d.value), subtotal));
    var total = money(subtotal - discount);
    var paid = sum(Array.isArray(j.payments) ? j.payments : [], function (p) { return num(p && p.amount); });
    var totalCost = sum(costs, function (c) { return c.total; });
    var profit = money(total - totalCost);
    return {
      items: items, costs: costs, labor: labor, install: install, extras: extras,
      billed: billed, billedByType: billedByType, byType: byType, matBase: money(matBase),
      subtotal: subtotal, discount: discount, total: total, paid: paid, remaining: money(total - paid),
      totalCost: totalCost, profit: profit, margin: total > 0 ? round(profit / total * 100, 1) : 0,
      hasCosts: totalCost > 0, complete: !!j.costsComplete
    };
  }

  // ---------------- الخشب الطبيعي ----------------
  // المقاسات بالسنتيمتر: حجم القطعة م³ = الطول × العرض × السمك ÷ 1,000,000
  var FT3_PER_M3 = 35.3147;
  var WOOD_UNITS = { m3: 'م³', ft3: 'قدم مكعب', piece: 'قطعة', lm: 'م.ط' };
  function woodRow(r) {
    r = r || {};
    var n = count(r.count), L = num(r.L), W = num(r.W), T = num(r.T);
    var volEach = L * W * T / 1e6;
    var o = { count: n, volEach: round(volEach, 6), vol: round(volEach * n, 6), ft3: round(volEach * n * FT3_PER_M3, 4), lm: round(L / 100 * n, 4), unit: WOOD_UNITS[r.unit] ? r.unit : 'm3', price: num(r.price) };
    var q = o.unit === 'm3' ? volEach * n : o.unit === 'ft3' ? volEach * n * FT3_PER_M3 : o.unit === 'lm' ? L / 100 * n : n;
    o.qty = round(q, 6); o.cost = money(q * o.price);
    return o;
  }
  function wood(rows) {
    var rs = (Array.isArray(rows) ? rows : []).map(woodRow);
    return { rows: rs, vol: round(rs.reduce(function (s, x) { return s + x.vol; }, 0), 6), ft3: round(rs.reduce(function (s, x) { return s + x.ft3; }, 0), 4), pieces: rs.reduce(function (s, x) { return s + x.count; }, 0), cost: money(rs.reduce(function (s, x) { return s + x.cost; }, 0)) };
  }

  // ---------------- توزيع القطع على الألواح (Guillotine) ----------------
  // كل القطعات مستقيمة من طرف لطرف (تتقص على منشار الألواح). مش بالضرورة أوفر توزيع ممكن، بس توزيع حقيقي.
  // board: { id, name, L, W (مم), price, grain (العروق مع طول اللوح), qty (المتاح) }
  // part:  { name, L, W (مم), count, boardId, grain (لازم الطول مع العروق) }
  // opts:  { kerf (سمك سلاح المنشار مم), trim (تهذيب الأطراف مم) }
  function nest(boards, parts, opts) {
    opts = opts || {};
    var kerf = num(opts.kerf), trim = num(opts.trim);
    var out = { boards: [], tooBig: [], limited: false };
    (boards || []).forEach(function (b, bi) {
      var bid = b.id || String(bi);
      var BL = num(b.L), BW = num(b.W);
      var res = { id: bid, name: b.name || ('لوح ' + (bi + 1)), L: BL, W: BW, price: num(b.price), available: num(b.qty), sheets: [], partsArea: 0, partsCount: 0 };
      // مساحة الشغل في اللوح بعد التهذيب (+ سلاح منشار واحد علشان آخر قطعة ما تحتاجش قطع بعدها)
      var UL = BL - 2 * trim + kerf, UW = BW - 2 * trim + kerf;
      var list = [];
      (parts || []).forEach(function (p) {
        if ((p.boardId || (boards[0] && (boards[0].id || '0'))) !== bid) return;
        var n = Math.min(count(p.count), 5000), L = num(p.L), W = num(p.W);
        if (!(L > 0 && W > 0)) return;
        for (var i = 0; i < n; i++) list.push({ name: p.name || 'قطعة', L: L, W: W, grainLock: !!(b.grain && p.grain) });
      });
      if (list.length > 3000) { list = list.slice(0, 3000); out.limited = true; }
      // الأكبر الأول
      list.sort(function (a, c) { return Math.max(c.L, c.W) - Math.max(a.L, a.W) || (c.L * c.W) - (a.L * a.W); });
      list.forEach(function (p) {
        // بالمقاس + سلاح المنشار
        var opt = [{ l: p.L + kerf, w: p.W + kerf, rot: false }];
        if (!p.grainLock && p.L !== p.W) opt.push({ l: p.W + kerf, w: p.L + kerf, rot: true });
        var fitsAny = opt.some(function (o) { return o.l <= UL + 1e-9 && o.w <= UW + 1e-9; });
        if (!(BL > 0 && BW > 0) || !fitsAny) { out.tooBig.push({ board: res.name, name: p.name, L: p.L, W: p.W }); return; }
        var best = null;
        res.sheets.forEach(function (s, si) {
          s.free.forEach(function (f, fi) {
            opt.forEach(function (o) {
              if (o.l <= f.l + 1e-9 && o.w <= f.w + 1e-9) {
                var score = f.l * f.w - o.l * o.w; // أقل مساحة فاضية متبقية (Best Area Fit)
                if (!best || score < best.score - 1e-9) best = { si: si, fi: fi, o: o, score: score };
              }
            });
          });
        });
        if (!best) {
          res.sheets.push({ free: [{ x: 0, y: 0, l: UL, w: UW }], placed: [] });
          var o0 = opt.filter(function (o) { return o.l <= UL + 1e-9 && o.w <= UW + 1e-9; })[0];
          best = { si: res.sheets.length - 1, fi: 0, o: o0 };
        }
        var sh = res.sheets[best.si], fr = sh.free[best.fi], o = best.o;
        sh.placed.push({ name: p.name, x: fr.x + trim, y: fr.y + trim, l: o.l - kerf, w: o.w - kerf, rot: o.rot, L: p.L, W: p.W });
        res.partsArea += p.L * p.W; res.partsCount++;
        // تقسيم مستقيم (Guillotine): القطعة الأقصر تبقى في الاتجاه اللي بيسيب أكبر حتة فاضية
        sh.free.splice(best.fi, 1);
        var restL = fr.l - o.l, restW = fr.w - o.w;
        var a, c;
        if (restL * fr.w >= restW * fr.l) { // قطع بعرض اللوح الأول
          a = { x: fr.x + o.l, y: fr.y, l: restL, w: fr.w };
          c = { x: fr.x, y: fr.y + o.w, l: o.l, w: restW };
        } else {
          a = { x: fr.x, y: fr.y + o.w, l: fr.l, w: restW };
          c = { x: fr.x + o.l, y: fr.y, l: restL, w: o.w };
        }
        [a, c].forEach(function (r) { if (r.l > 1e-6 && r.w > 1e-6) sh.free.push(r); });
      });
      var sheetArea = BL * BW;
      res.count = res.sheets.length;
      res.sheetsArea = res.count * sheetArea;
      res.partsArea = round(res.partsArea, 2);
      res.minSheets = sheetArea > 0 ? Math.ceil(res.partsArea / sheetArea - 1e-9) : 0; // الحد الأدنى النظري (المساحة بس)
      res.wasteArea = round(res.sheetsArea - res.partsArea, 2);
      res.wastePct = res.sheetsArea > 0 ? round(res.wasteArea / res.sheetsArea * 100, 1) : 0;
      res.cost = money(res.count * res.price);
      res.short = res.available > 0 && res.count > res.available ? res.count - res.available : 0;
      res.sheets = res.sheets.map(function (s) {
        var used = s.placed.reduce(function (t, p) { return t + p.l * p.w; }, 0);
        return { placed: s.placed, usedPct: sheetArea > 0 ? round(used / sheetArea * 100, 1) : 0 };
      });
      out.boards.push(res);
    });
    out.sheets = out.boards.reduce(function (s, b) { return s + b.count; }, 0);
    out.cost = money(out.boards.reduce(function (s, b) { return s + b.cost; }, 0));
    return out;
  }

  var api = { METHODS: METHODS, METHOD_ORDER: METHOD_ORDER, COST_TYPES: COST_TYPES, COST_ORDER: COST_ORDER, WOOD_UNITS: WOOD_UNITS, FT3_PER_M3: FT3_PER_M3,
    num: num, round: round, money: money, toM: toM, toMM: toMM, item: item, cost: cost, job: job, woodRow: woodRow, wood: wood, nest: nest };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CarpCalc = api;
})(typeof window !== 'undefined' ? window : this);
