/*
 * حساباتي للجبس والديكورات — HESABATI GYPSUM
 * محرك الحسابات: أدوات مشتركة (بدون أي اعتماد على الواجهة)
 * © 2026 أحمد حسن عبدالله - جميع الحقوق محفوظة.
 *
 * كل الأطوال بالمتر، والمساحات بالمتر المربع، والسمك بالمليمتر.
 * الملف يعمل في المتصفح (window.HG.core) وفي Node للاختبارات (require).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.HG = root.HG || {}; root.HG.core = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const EPS = 1e-9;

  /** رقم آمن: أي قيمة غير صالحة ترجع للقيمة الافتراضية */
  function num(v, def) {
    const n = typeof v === 'number' ? v : parseFloat(String(v == null ? '' : v).replace(',', '.'));
    return isFinite(n) ? n : (def === undefined ? 0 : def);
  }
  /** رقم موجب أو صفر */
  function pos(v, def) { return Math.max(0, num(v, def)); }
  /** رقم موجب أكبر من صفر، وإلا القيمة الافتراضية */
  function gt0(v, def) { const n = num(v, def); return n > 0 ? n : def; }
  /** تقريب لأعلى بدون أخطاء الكسور العشرية (مثلاً 20 / 0.4 = 50.000000001) */
  function ceil(x) { return Math.ceil(x - EPS); }
  function round(x, d) { const f = Math.pow(10, d == null ? 2 : d); return Math.round((Number(x) || 0) * f + (x >= 0 ? EPS : -EPS)) / f; }
  const r2 = x => round(x, 2);
  const r3 = x => round(x, 3);
  /** معامل الهالك: 10% ← 1.10 */
  function wasteMul(pct) { return 1 + pos(pct) / 100; }
  /** عدد القطع (أعواد، ألواح، لفات...) المطلوبة لتغطية كمية معينة */
  function pieces(total, perPiece) { return perPiece > 0 && total > 0 ? ceil(total / perPiece) : 0; }

  /** سطر خامة موحّد بين كل الحاسبات */
  function mat(key, name, qty, unit, extra) {
    return Object.assign({ key, name, qty: r3(qty), unit }, extra || {});
  }
  /** سطر كمية عمل (مصنعية) */
  function work(name, qty, unit, extra) {
    return Object.assign({ name, qty: r3(qty), unit }, extra || {});
  }

  /**
   * خطة القص (First-Fit Decreasing): توزيع أطوال مطلوبة على أعواد بطول ثابت
   * لمعرفة أقل عدد من الأعواد (كرانيش، براويز بانوهات، قطاعات).
   * الحسابات داخلياً بالمليمتر لتفادي أخطاء الكسور.
   * @param {number[]} lengths أطوال القطع المطلوبة (متر)
   * @param {number} stock طول العود الواحد (متر)
   * @param {number} allowance زيادة لكل قطعة للقص/الميتر (متر)
   */
  function cutPlan(lengths, stock, allowance) {
    const S = Math.round(gt0(stock, 0) * 1000);
    const A = Math.round(pos(allowance) * 1000);
    if (!S) return { bars: 0, used: 0, offcut: 0, segments: 0, plan: [] };
    const segs = [];
    let fullBars = 0;
    (lengths || []).forEach(l => {
      let L = Math.round(pos(l) * 1000);
      if (!L) return;
      L += A;
      while (L > S) { fullBars++; L -= S; }  // الضلع الأطول من العود: أعواد كاملة + الباقي
      if (L > 0) segs.push(L);
    });
    segs.sort((a, b) => b - a);
    const bins = [];
    segs.forEach(s => {
      let placed = false;
      for (const b of bins) { if (b.free >= s) { b.free -= s; b.cuts.push(s / 1000); placed = true; break; } }
      if (!placed) bins.push({ free: S - s, cuts: [s / 1000] });
    });
    const bars = fullBars + bins.length;
    const usedMm = (lengths || []).reduce((t, l) => t + Math.round(pos(l) * 1000) + (pos(l) > 0 ? A : 0), 0);
    return {
      bars,
      fullBars,
      used: usedMm / 1000,
      offcut: (bars * S - usedMm) / 1000,
      segments: segs.length,
      plan: bins.map(b => ({ cuts: b.cuts, rest: b.free / 1000 }))
    };
  }

  /** العدد: لو الخانة فاضية يبقى 1، ولو مكتوب صفر يبقى صفر */
  function cnt(v) { return v === '' || v == null ? 1 : Math.max(0, Math.round(num(v, 1))); }

  /** مساحة الفتحات: [{w, h, count}] */
  function openingsArea(list) {
    return (list || []).reduce((t, o) => t + pos(o.w) * pos(o.h) * cnt(o.count), 0);
  }

  return { EPS, num, pos, gt0, cnt, ceil, round, r2, r3, wasteMul, pieces, mat, work, cutPlan, openingsArea };
});
