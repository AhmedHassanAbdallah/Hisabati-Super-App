/*
 * أرزقي | Arzoqi — الحدادة: محرك الحسابات.
 * دوال صافية (من غير واجهة ولا تخزين) — نفس الملف بيشتغل في المتصفح (window.MetalCalc) وفي اختبارات Node.
 *
 * أنواع الأعمال وطريقة حساب كل نوع:
 *   laser  بوابة حديد ليزر        بالمتر المربع: الارتفاع × العرض × العدد × سعر المتر
 *   hand   بوابة مشغولة يدوي     بالكيلو:        وزن البوابة × العدد × سعر الكيلو
 *   door   باب صاج               بالمتر المربع: الارتفاع × العرض × العدد × سعر المتر
 *   roof   سقف صاج               بالمتر المربع: الطول × العرض × عدد المساحات × سعر المتر
 *   piece  منتج بالقطعة          بالقطعة:        العدد × سعر القطعة
 *   lump   شغل بالمقطوعية        مبلغ إجمالي:   مجموع مهام الشغلانة (كل مهمة بمبلغها)
 * المقاسات بالمتر أو بالسنتيمتر (بتتحول للمتر قبل الحساب). مفيش أسعار افتراضية: الصنايعي بيكتب السعر.
 * © 2026 أحمد حسن عبدالله
 */
(function (root) {
  'use strict';

  var KINDS = {
    laser: { label: 'بوابة حديد ليزر', short: 'بوابة ليزر', basis: 'area', unit: 'م²', priceLabel: 'سعر مصنعية المتر المربع', countLabel: 'عدد البوابات', hLabel: 'ارتفاع البوابة', wLabel: 'عرض البوابة' },
    hand: { label: 'بوابة حديد مشغولة يدوي', short: 'بوابة مشغولة', basis: 'weight', unit: 'كجم', priceLabel: 'سعر مصنعية الكيلو', countLabel: 'عدد البوابات' },
    door: { label: 'باب صاج', short: 'باب صاج', basis: 'area', unit: 'م²', priceLabel: 'سعر مصنعية المتر المربع', countLabel: 'عدد الأبواب', hLabel: 'ارتفاع الباب', wLabel: 'عرض الباب' },
    roof: { label: 'سقف صاج', short: 'سقف صاج', basis: 'area', unit: 'م²', priceLabel: 'سعر مصنعية المتر المربع', countLabel: 'عدد المساحات', hLabel: 'طول السقف', wLabel: 'عرض السقف' },
    piece: { label: 'منتج بالقطعة', short: 'منتج', basis: 'piece', unit: 'قطعة', priceLabel: 'سعر مصنعية القطعة', countLabel: 'عدد القطع' },
    lump: { label: 'شغل بالمقطوعية', short: 'مقطوعية', basis: 'lump', unit: 'مقطوعية', priceLabel: 'قيمة المصنعية' }
  };
  var KIND_ORDER = ['laser', 'hand', 'door', 'roof', 'piece', 'lump'];

  // رقم آمن: بيقبل الأرقام العربية والفاصلة، ومفيش NaN ولا Infinity ولا سالب
  function num(v) {
    if (typeof v === 'number') return isFinite(v) && v > 0 ? v : 0;
    var s = String(v == null ? '' : v).trim()
      .replace(/[٠-٩]/g, function (c) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(c); })
      .replace(/[۰-۹]/g, function (c) { return '۰۱۲۳۴۵۶۷۸۹'.indexOf(c); })
      .replace(/[٬\s]/g, '');
    if (s.charAt(0) === '-') return 0;
    // «2,000» فاصل آلاف — «2,5» أو «2٫5» كسر عشري
    s = /^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s) ? s.replace(/,/g, '') : s.replace(/[٫,]/g, '.');
    s = s.replace(/[^\d.]/g, '');
    var n = parseFloat(s);
    return isFinite(n) && n > 0 ? n : 0;
  }
  // تقريب لتفادي أخطاء الكسور العشرية (0.1 + 0.2)
  function round(n, d) { var p = Math.pow(10, d == null ? 4 : d); return Math.round((Number(n) || 0) * p + (n >= 0 ? 1e-9 : -1e-9)) / p; }
  function money(n) { return round(n, 2); }
  // المقاس بالمتر
  function toMeters(v, unit) { var n = num(v); return unit === 'cm' ? n / 100 : n; }
  // العدد: لو الخانة فاضية يتحسب 1 (بند من غير عدد = قطعة واحدة)، ولو مكتوب صفر يفضل صفر
  function count(v) { return (v == null || String(v).trim() === '') ? 1 : num(v); }

  // حساب بند واحد → { qty: الكمية اللي بيتضرب فيها السعر, qtyUnit, total, area?, weight?, ... }
  function item(it) {
    it = it || {};
    var k = KINDS[it.kind] ? it.kind : 'piece';
    var info = KINDS[k];
    var r = { kind: k, unit: info.unit, price: num(it.price), count: count(it.count), qty: 0, total: 0 };
    if (info.basis === 'area') {
      var h = toMeters(it.h, it.dimUnit), w = toMeters(it.w, it.dimUnit);
      r.h = round(h, 4); r.w = round(w, 4);
      r.areaEach = round(h * w, 4);
      r.qty = r.area = round(h * w * r.count, 4);
      r.total = money(r.area * r.price);
    } else if (info.basis === 'weight') {
      r.weightEach = round(num(it.weight), 4);
      r.qty = r.weight = round(r.weightEach * r.count, 4);
      r.total = money(r.weight * r.price);
    } else if (info.basis === 'piece') {
      r.qty = r.count;
      r.total = money(r.count * r.price);
    } else { // lump: مجموع المهام
      var tasks = Array.isArray(it.tasks) ? it.tasks : [];
      r.tasks = tasks.map(function (t) { return { desc: (t && t.desc) || '', amount: money(num(t && t.amount)) }; });
      r.qty = 1; r.count = 1;
      r.total = money(r.tasks.reduce(function (s, t) { return s + t.amount; }, 0));
      r.price = r.total;
    }
    return r;
  }

  // مستهلك (سلك لحام، أقراص…): السعر اختياري — من غير سعر بيتسجل الاستهلاك بس
  function consumable(c) {
    c = c || {};
    var qty = num(c.qty), price = num(c.price);
    return { qty: qty, price: price, priced: price > 0, total: money(qty * price) };
  }
  // خامة (حديد، صاج، مواسير…): على حساب العميل (بتدخل الفاتورة) أو تكلفة عليك بس
  function material(m) {
    m = m || {};
    var qty = num(m.qty), price = num(m.price);
    return { qty: qty, price: price, billed: m.billed !== false, total: money(qty * price) };
  }

  // حساب الشغلانة كلها
  function job(j) {
    j = j || {};
    var items = (Array.isArray(j.items) ? j.items : []).map(item);
    var cons = (Array.isArray(j.consumables) ? j.consumables : []).map(consumable);
    var mats = (Array.isArray(j.materials) ? j.materials : []).map(material);
    var labor = money(items.reduce(function (s, x) { return s + x.total; }, 0));
    var byKind = {};
    items.forEach(function (x) {
      var b = byKind[x.kind] || (byKind[x.kind] = { count: 0, qty: 0, total: 0 });
      b.count += 1; b.qty = round(b.qty + x.qty, 4); b.total = money(b.total + x.total);
    });
    var consCost = money(cons.reduce(function (s, x) { return s + x.total; }, 0));
    var consUnpriced = cons.filter(function (x) { return !x.priced && x.qty > 0; }).length;
    var matBilled = money(mats.reduce(function (s, x) { return s + (x.billed ? x.total : 0); }, 0));
    var matCost = money(mats.reduce(function (s, x) { return s + x.total; }, 0));
    var consBilled = j.billConsumables ? consCost : 0;
    var subtotal = money(labor + matBilled + consBilled);
    var d = j.discount || {};
    var discount = d.type === 'percent' ? money(subtotal * Math.min(num(d.value), 100) / 100) : money(Math.min(num(d.value), subtotal));
    var total = money(subtotal - discount);
    var paid = money((Array.isArray(j.payments) ? j.payments : []).reduce(function (s, p) { return s + num(p && p.amount); }, 0));
    var remaining = money(total - paid);
    var costs = money(matCost + consCost);
    return {
      items: items, consumables: cons, materials: mats, byKind: byKind,
      labor: labor, matBilled: matBilled, matCost: matCost, consCost: consCost, consBilled: consBilled, consUnpriced: consUnpriced,
      subtotal: subtotal, discount: discount, total: total, paid: paid, remaining: remaining,
      costs: costs, profit: money(total - costs), hasCosts: costs > 0
    };
  }

  var api = { KINDS: KINDS, KIND_ORDER: KIND_ORDER, num: num, round: round, money: money, toMeters: toMeters, item: item, consumable: consumable, material: material, job: job };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MetalCalc = api;
})(typeof window !== 'undefined' ? window : this);
