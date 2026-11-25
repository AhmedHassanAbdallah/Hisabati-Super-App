/*
 * أرزقي | Arzoqi — ميكانيكا السيارات والموتوسيكلات والتروسيكلات: الحسابات (AutoCalc).
 * أمر الشغل: المصنعية (بالساعة أو مبلغ) + قطع الغيار (من المخزن / اتشرت / من العميل) + أعمال خارجية + مصاريف، الخصم والضريبة،
 * المدفوع والمتبقي، التكلفة والربح. المخزن (رصيد كل قطعة من الافتتاحي + المشتريات + التسويات − اللي اتصرف على أوامر الشغل)،
 * أرصدة الموردين، مؤشرات لوحة الورشة، مواعيد الصيانة، والحاسبات المستقلة (كاوتش، بنزين، سعة، انضغاط، خلط 2T، ردياتير، سرعة، أوم، وحدات، تسعير، أكواد OBD).
 * كل الدوال «نقية» (من غير DOM) علشان تتختبر لوحدها.
 * © 2026 أحمد حسن عبدالله
 */
(function (root) {
  'use strict';
  var AR = '٠١٢٣٤٥٦٧٨٩', FA = '۰۱۲۳۴۵۶۷۸۹';
  function num(v) {
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    var s = String(v == null ? '' : v).trim().replace(/[٠-٩]/g, function (d) { return AR.indexOf(d); }).replace(/[۰-۹]/g, function (d) { return FA.indexOf(d); })
      .replace(/٫/g, '.').replace(/[,٬\s]/g, '');
    var n = parseFloat(s); return isFinite(n) ? n : 0;
  }
  function round(n, d) { var p = Math.pow(10, d == null ? 2 : d); return Math.round((num(n) + Number.EPSILON) * p) / p; }
  function money(n) { return round(n, 2); }
  function arr(x) { return Array.isArray(x) ? x : []; }
  var CLOSED = { delivered: 1, cancelled: 1 };
  function isOpen(j) { return !CLOSED[j.status]; }
  function isQuote(j) { return j.status === 'received' || j.status === 'diagnosing' || j.status === 'approval'; }

  // ---------------- سطر مصنعية ----------------
  function laborLine(l, rate) {
    var hours = num(l.hours), r = l.rate !== undefined && l.rate !== '' ? num(l.rate) : num(rate);
    var value = l.mode === 'hours' ? hours * r : num(l.amount);
    return { hours: l.mode === 'hours' ? hours : num(l.hours), rate: r, value: money(value) };
  }
  // ---------------- سطر قطعة غيار ----------------
  function partLine(p) {
    var q = num(p.qty) || 0, own = p.source === 'customer';
    return { qty: q, sell: own ? 0 : money(q * num(p.price)), cost: own ? 0 : money(q * num(p.cost)), own: own };
  }

  // ---------------- أمر الشغل ----------------
  // ctx: { laborRate, wlog: [{jobId, amount}] }
  function job(j, ctx) {
    ctx = ctx || {};
    var labor = arr(j.labor).map(function (l) { return laborLine(l, ctx.laborRate); });
    var parts = arr(j.parts).map(partLine);
    var outside = arr(j.outside).map(function (o) { return { sell: money(num(o.price)), cost: money(num(o.cost)) }; });
    var costs = arr(j.costs).map(function (c) { return { amount: money(num(c.amount)), billed: !!c.billed }; });
    var sum = function (a, k) { return money(a.reduce(function (s, x) { return s + x[k]; }, 0)); };
    var laborTotal = sum(labor, 'value'), hours = round(labor.reduce(function (s, l) { return s + (l.hours || 0); }, 0), 2);
    var partsSell = sum(parts, 'sell'), partsCost = sum(parts, 'cost'), outsideSell = sum(outside, 'sell'), outsideCost = sum(outside, 'cost');
    var billedCosts = money(costs.filter(function (c) { return c.billed; }).reduce(function (s, c) { return s + c.amount; }, 0));
    var allCosts = sum(costs, 'amount');
    var subtotal = money(laborTotal + partsSell + outsideSell + billedCosts);
    var d = j.discount || {}, dv = num(d.value);
    var discount = money(Math.min(subtotal, Math.max(0, d.type === 'percent' ? subtotal * dv / 100 : dv)));
    var taxPct = num(j.taxPct), tax = money((subtotal - discount) * taxPct / 100);
    var total = money(subtotal - discount + tax);
    var paid = money(arr(j.payments).reduce(function (s, p) { return s + num(p.amount); }, 0));
    var workers = money(arr(ctx.wlog).filter(function (w) { return w.jobId && w.jobId === j.id; }).reduce(function (s, w) { return s + num(w.amount); }, 0));
    // عمولة الفني: نسبة من قيمة المصنعية اللي اتعملت على إيده (ctx.techPct = {workerId: نسبة})
    var tp = ctx.techPct || {}, commission = money(arr(j.labor).reduce(function (s, l, i) { return s + (l.tech && num(tp[l.tech]) ? labor[i].value * num(tp[l.tech]) / 100 : 0); }, 0));
    var totalCost = money(partsCost + outsideCost + allCosts + workers + commission);
    var net = money(total - tax), profit = money(net - totalCost);
    return { labor: labor, parts: parts, outside: outside, costs: costs, laborTotal: laborTotal, hours: hours, partsSell: partsSell, partsCost: partsCost,
      outsideSell: outsideSell, outsideCost: outsideCost, billedCosts: billedCosts, internalCosts: money(allCosts - billedCosts), workers: workers, commission: commission,
      subtotal: subtotal, discount: discount, taxPct: taxPct, tax: tax, total: total, paid: paid, remaining: money(total - paid),
      totalCost: totalCost, profit: profit, margin: net > 0 ? round(profit / net * 100, 1) : 0 };
  }

  // ---------------- المخزن ----------------
  // الرصيد = الافتتاحي + المشتريات + التسويات (±) − اللي اتصرف من المخزن على أوامر الشغل (غير الملغية)
  function stock(db) {
    var out = {};
    arr(db.parts).forEach(function (p) { out[p.id] = { open: num(p.open), bought: 0, adjust: 0, used: 0, qty: 0, value: 0, cost: num(p.cost), low: false }; });
    arr(db.purchases).forEach(function (pu) { arr(pu.lines).forEach(function (l) { if (out[l.partId]) out[l.partId].bought += num(l.qty); }); });
    arr(db.moves).forEach(function (m) { if (out[m.partId]) out[m.partId].adjust += num(m.qty); });
    arr(db.jobs).forEach(function (j) { if (j.status === 'cancelled') return; arr(j.parts).forEach(function (l) { if (l.source === 'stock' && out[l.partId]) out[l.partId].used += num(l.qty); }); });
    arr(db.parts).forEach(function (p) {
      var s = out[p.id]; s.qty = round(s.open + s.bought + s.adjust - s.used, 3); s.value = money(Math.max(s.qty, 0) * s.cost);
      s.low = num(p.min) > 0 && s.qty <= num(p.min);
    });
    return out;
  }
  function purchaseTotal(pu) { return money(arr(pu.lines).reduce(function (s, l) { return s + num(l.qty) * num(l.cost); }, 0) + num(pu.extra) - num(pu.discount)); }
  // رصيد المورد = إجمالي المشتريات − المدفوع وقت الشراء − الدفعات بعد كده
  function supplierBalance(db, sid) {
    var bought = 0, paid = 0;
    arr(db.purchases).forEach(function (pu) { if (pu.supplierId !== sid) return; bought += purchaseTotal(pu); paid += num(pu.paid); });
    arr(db.spay).forEach(function (p) { if (p.supplierId === sid) paid += num(p.amount); });
    return { bought: money(bought), paid: money(paid), balance: money(bought - paid) };
  }

  // ---------------- التواريخ ----------------
  function addMonths(iso, m) {
    if (!iso || !num(m)) return '';
    var p = String(iso).slice(0, 10).split('-').map(Number); if (p.length < 3 || !p[0]) return '';
    var d = new Date(Date.UTC(p[0], p[1] - 1 + num(m), 1)), last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
    d.setUTCDate(Math.min(p[2], last));
    return d.toISOString().slice(0, 10);
  }
  function daysBetween(a, b) { if (!a || !b) return null; return Math.round((Date.parse(String(b).slice(0, 10)) - Date.parse(String(a).slice(0, 10))) / 864e5); }
  // الصيانة الجاية: العداد + الفترة بالكيلو، و/أو التاريخ + عدد الشهور
  function nextService(o) {
    var km = num(o.odo) && num(o.interval) ? num(o.odo) + num(o.interval) : 0;
    return { km: km, date: addMonths(o.date, o.months) };
  }

  // ---------------- التذكيرات: الصيانة الجاية والرخصة والتأمين ----------------
  function reminders(db, today, within) {
    within = within == null ? 30 : within;
    var out = [], lastByVeh = {};
    arr(db.jobs).forEach(function (j) { if (j.status !== 'delivered' || !j.vehicleId) return; var p = lastByVeh[j.vehicleId]; if (!p || String(j.deliveredAt || j.date) > String(p.deliveredAt || p.date)) lastByVeh[j.vehicleId] = j; });
    Object.keys(lastByVeh).forEach(function (vid) {
      var j = lastByVeh[vid], n = j.next || {};
      if (!n.date && !num(n.km)) return;
      var d = n.date ? daysBetween(today, n.date) : null;
      if (d === null || d <= within) out.push({ type: 'service', vehicleId: vid, jobId: j.id, date: n.date || '', km: num(n.km), note: n.note || '', days: d, overdue: d !== null && d < 0 });
    });
    arr(db.vehicles).forEach(function (v) {
      [['license', 'licenseExp', 'تجديد الرخصة'], ['insurance', 'insuranceExp', 'تجديد التأمين']].forEach(function (k) {
        if (!v[k[1]]) return; var d = daysBetween(today, v[k[1]]);
        if (d !== null && d <= within) out.push({ type: k[0], vehicleId: v.id, date: v[k[1]], note: k[2], days: d, overdue: d < 0 });
      });
    });
    return out.sort(function (a, b) { return (a.days == null ? 1e9 : a.days) - (b.days == null ? 1e9 : b.days); });
  }

  // ---------------- لوحة الورشة (كل الأرقام من البيانات الفعلية) ----------------
  function dashboard(db, ctx, today) {
    var month = String(today).slice(0, 7), st = {}, r = { open: 0, inShop: 0, byStatus: st, collectedToday: 0, deliveredToday: 0, collectedMonth: 0,
      laborMonth: 0, partsMonth: 0, profitMonth: 0, revenueMonth: 0, expensesMonth: 0, expensesToday: 0, netMonth: 0, dues: 0, suppliersDue: 0, lowStock: 0, stockValue: 0, reminders: 0 };
    arr(db.jobs).forEach(function (j) {
      st[j.status] = (st[j.status] || 0) + 1;
      if (isOpen(j)) { r.open++; r.inShop++; }
      var x = job(j, ctx);
      arr(j.payments).forEach(function (p) { var d = String(p.date || '').slice(0, 10); if (d === today) r.collectedToday += num(p.amount); if (d.slice(0, 7) === month) r.collectedMonth += num(p.amount); });
      if (j.status === 'cancelled') return;
      if ((j.status === 'delivered' || j.status === 'ready') && x.remaining > 0.005) r.dues += x.remaining;
      var dd = String(j.deliveredAt || '').slice(0, 10);
      if (j.status === 'delivered' && dd === today) r.deliveredToday += x.total;
      if (j.status === 'delivered' && dd.slice(0, 7) === month) { r.laborMonth += x.laborTotal; r.partsMonth += x.partsSell; r.profitMonth += x.profit; r.revenueMonth += x.total - x.tax; }
    });
    arr(db.expenses).forEach(function (e) { var d = String(e.date || '').slice(0, 10); if (d.slice(0, 7) === month) r.expensesMonth += num(e.amount); if (d === today) r.expensesToday += num(e.amount); });
    var s = stock(db); Object.keys(s).forEach(function (k) { if (s[k].low) r.lowStock++; r.stockValue += s[k].value; });
    arr(db.suppliers).forEach(function (sp) { var b = supplierBalance(db, sp.id).balance; if (b > 0.005) r.suppliersDue += b; });
    r.reminders = reminders(db, today, 30).length;
    ['collectedToday', 'deliveredToday', 'collectedMonth', 'laborMonth', 'partsMonth', 'profitMonth', 'revenueMonth', 'expensesMonth', 'expensesToday', 'dues', 'suppliersDue', 'stockValue'].forEach(function (k) { r[k] = money(r[k]); });
    r.netMonth = money(r.profitMonth - r.expensesMonth);
    return r;
  }

  // ---------------- الحاسبات المستقلة ----------------
  // مقاس الكاوتش: 205/55R16 → جنب الكاوتش، القطر، المحيط، لفات الكيلو
  function parseTire(s) {
    var m = String(s || '').replace(/\s/g, '').toUpperCase().match(/^(\d{2,3})\/(\d{2,3})[A-Z]*?(\d{2}(?:\.\d)?)$/);
    return m ? { w: +m[1], ar: +m[2], rim: +m[3] } : null;
  }
  function tire(w, ar, rim) {
    w = num(w); ar = num(ar); rim = num(rim); if (!w || !ar || !rim) return null;
    var side = w * ar / 100, dia = rim * 25.4 + 2 * side, circ = Math.PI * dia;
    return { sidewall: round(side, 1), diameter: round(dia, 1), circumference: round(circ, 0), revsPerKm: round(1e6 / circ, 0) };
  }
  function tireCompare(a, b) {
    if (!a || !b) return null;
    var diff = (b.diameter - a.diameter) / a.diameter * 100;
    return { diffPct: round(diff, 2), at100: round(100 * b.diameter / a.diameter, 1) };
  }
  function fuel(km, liters, price) {
    km = num(km); liters = num(liters); if (!km || !liters) return null;
    return { l100: round(liters / km * 100, 2), kml: round(km / liters, 2), costKm: num(price) ? round(liters * num(price) / km, 3) : 0, cost: money(liters * num(price)) };
  }
  function cc(bore, stroke, cyl) { bore = num(bore); stroke = num(stroke); cyl = num(cyl) || 1; if (!bore || !stroke) return 0; return round(Math.PI / 4 * bore * bore * stroke * cyl / 1000, 1); }
  function cr(swept, clearance) { swept = num(swept); clearance = num(clearance); if (!swept || !clearance) return 0; return round((swept + clearance) / clearance, 2); }
  function mix(fuelL, ratio) { fuelL = num(fuelL); ratio = num(ratio); if (!fuelL || !ratio) return 0; return round(fuelL * 1000 / ratio, 0); }
  function coolant(cap, pct) { cap = num(cap); pct = Math.min(100, Math.max(0, num(pct))); if (!cap) return null; return { antifreeze: round(cap * pct / 100, 2), water: round(cap * (100 - pct) / 100, 2) }; }
  // السرعة كم/س = (لفات الموتور ÷ (نسبة الترس × نسبة الدفرنس)) × محيط العجلة بالمتر × 60 ÷ 1000
  function speed(rpm, gear, final, diaMm) { rpm = num(rpm); gear = num(gear); final = num(final) || 1; diaMm = num(diaMm); if (!rpm || !gear || !diaMm) return 0; return round(rpm / (gear * final) * Math.PI * diaMm / 1000 * 60 / 1000, 1); }
  // قانون أوم: اكتب أي اتنين من (الجهد، التيار، المقاومة)
  function ohm(o) {
    var v = num(o.v), i = num(o.i), r = num(o.r);
    if (v && i && !r) r = v / i; else if (v && r && !i) i = v / r; else if (i && r && !v) v = i * r;
    if (!(v && i)) return null;
    return { v: round(v, 3), i: round(i, 3), r: round(r || v / i, 3), p: round(v * i, 2) };
  }
  var UNIT_CONV = {
    psi_bar: [0.0689476, 'psi', 'bar'], bar_psi: [14.5038, 'bar', 'psi'], nm_lbft: [0.737562, 'نيوتن متر', 'رطل قدم'], lbft_nm: [1.35582, 'رطل قدم', 'نيوتن متر'],
    km_mi: [0.621371, 'كم', 'ميل'], mi_km: [1.609344, 'ميل', 'كم'], l_gal: [0.264172, 'لتر', 'جالون أمريكي'], gal_l: [3.785411, 'جالون أمريكي', 'لتر'], hp_kw: [0.7457, 'حصان', 'كيلووات'], kw_hp: [1.34102, 'كيلووات', 'حصان']
  };
  function convert(kind, v) {
    if (kind === 'c_f') return round(num(v) * 9 / 5 + 32, 2);
    if (kind === 'f_c') return round((num(v) - 32) * 5 / 9, 2);
    var u = UNIT_CONV[kind]; return u ? round(num(v) * u[0], 4) : 0;
  }
  function laborQuote(hours, rate, markup) { var b = num(hours) * num(rate); return { base: money(b), total: money(b * (1 + num(markup) / 100)) }; }
  // سعر البيع: بنسبة إضافة على التكلفة (markup) أو بهامش من سعر البيع (margin)
  function priceFrom(cost, pct, mode) {
    cost = num(cost); pct = num(pct); if (!cost) return null;
    var sell = mode === 'margin' ? (pct < 100 ? cost / (1 - pct / 100) : 0) : cost * (1 + pct / 100);
    return { sell: money(sell), profit: money(sell - cost), margin: sell ? round((sell - cost) / sell * 100, 1) : 0, markup: round((sell - cost) / cost * 100, 1) };
  }
  // كود OBD-II: الحرف = النظام، الرقم التاني = عام/خاص بالشركة، التالت = الجزء من النظام
  function dtc(code, K) {
    var c = String(code || '').trim().toUpperCase().replace(/\s/g, '');
    if (!/^[PBCU][0-3][0-9A-F]{3}$/.test(c)) return null;
    var d2 = c.charAt(1), generic = c.charAt(0) === 'P' ? (d2 === '0' || d2 === '2' || (d2 === '3' && /[4-9]/.test(c.charAt(2)))) : (d2 === '0' || d2 === '3');
    K = K || {};
    return { code: c, family: (K.DTC_FAM || {})[c.charAt(0)] || '', generic: generic, sub: c.charAt(0) === 'P' ? ((K.DTC_SUB || {})[c.charAt(2)] || '') : '', desc: (K.DTC || {})[c] || '' };
  }

  root.AutoCalc = { num: num, round: round, money: money, isOpen: isOpen, isQuote: isQuote, laborLine: laborLine, partLine: partLine, job: job, stock: stock, purchaseTotal: purchaseTotal,
    supplierBalance: supplierBalance, addMonths: addMonths, daysBetween: daysBetween, nextService: nextService, reminders: reminders, dashboard: dashboard,
    parseTire: parseTire, tire: tire, tireCompare: tireCompare, fuel: fuel, cc: cc, cr: cr, mix: mix, coolant: coolant, speed: speed, ohm: ohm, UNIT_CONV: UNIT_CONV, convert: convert,
    laborQuote: laborQuote, priceFrom: priceFrom, dtc: dtc };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.AutoCalc;
})(typeof window !== 'undefined' ? window : globalThis);
