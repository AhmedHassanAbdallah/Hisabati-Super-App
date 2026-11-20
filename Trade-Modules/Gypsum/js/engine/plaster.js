/*
 * أرزقي للجبس والديكورات — محرك حسابات الجبس البلدي واللياسة الجبسية
 * © 2026 أحمد حسن عبدالله - جميع الحقوق محفوظة.
 *
 * الكمية (كجم) = المساحة × السمك (مم) × عدد الطبقات × معدل الاستهلاك (كجم/م²/مم) × (1 + الهالك)
 * معدل الاستهلاك يختلف حسب نوع الجبس وطريقة التنفيذ — القيم الافتراضية للبداية فقط
 * ويجب تعديلها حسب الخامة المستخدمة وتعليمات المصنع وخبرة الصنايعي.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./core'));
  else { root.HG = root.HG || {}; root.HG.plaster = factory(root.HG.core); }
})(typeof self !== 'undefined' ? self : this, function (C) {
  'use strict';
  const { num, pos, gt0, cnt, ceil, r2, r3, wasteMul, pieces, mat, work, openingsArea } = C;

  /* أنواع الجبس ومعدلات الاستهلاك المبدئية (كجم لكل م² لكل 1 مم سمك) */
  const PLASTER_TYPES = {
    baladi: { name: 'جبس بلدي', rate: 1.1, key: 'plaster_baladi' },
    machine: { name: 'جبس محارة جاهز (ماكينة/يدوي)', rate: 0.9, key: 'plaster_machine' },
    finish: { name: 'جبس تشطيب / بطانة', rate: 1.0, key: 'plaster_finish' },
    other: { name: 'خامة أخرى', rate: 1.0, key: 'plaster_other' }
  };
  const FINISH_TYPES = {
    smooth: 'تشطيب ناعم (ممسوح)',
    leveled: 'تسوية وقدة',
    base: 'طبقة تأسيس فقط',
    repair: 'ترميم وإصلاح',
    decor: 'جبس مزخرف / تشكيل'
  };
  const PLASTER_DEFAULTS = {
    plasterType: 'baladi', rate: 0, thickness: 10, layers: 1, waste: 10, bagKg: 25,
    finish: 'smooth', beadLen: 3, crackRate: 0.5
  };

  function plaster(inp) {
    inp = inp || {};
    const p = Object.assign({}, PLASTER_DEFAULTS);
    Object.keys(inp).forEach(k => { if (inp[k] !== '' && inp[k] != null) p[k] = inp[k]; });
    const type = PLASTER_TYPES[p.plasterType] || PLASTER_TYPES.baladi;
    const rate = gt0(p.rate, type.rate);
    const thickness = pos(p.thickness), layers = Math.max(1, Math.round(num(p.layers, 1)));
    const bagKg = gt0(p.bagKg, 25);
    const out = { kind: 'plaster', title: 'محارة وأعمال جبس بلدي', summary: [], work: [], materials: [], warnings: [], notes: [], detail: [] };

    let wallArea = 0, ceilArea = 0;
    (inp.rooms || []).forEach(r => {
      const L = pos(r.L), W = pos(r.W), H = pos(r.H), n = cnt(r.count);
      if (!(n > 0)) return;
      const walls = r.walls !== false && H > 0 ? 2 * (L + W) * H : 0;
      const ceil_ = r.ceiling ? L * W : 0;
      wallArea += walls * n; ceilArea += ceil_ * n;
      if (walls || ceil_) out.detail.push({ name: r.name || 'مكان', L: r3(L), W: r3(W), H: r3(H), count: n, walls: r2(walls), ceiling: r2(ceil_) });
    });
    const direct = pos(inp.area);
    const openings = openingsArea(inp.openings);
    const gross = wallArea + ceilArea + direct;
    const area = Math.max(0, gross - openings);
    const crackLen = pos(inp.crackLength);

    if (!(area > 0) && !(crackLen > 0)) { out.warnings.push('أدخل المساحة أو أبعاد المكان.'); return out; }
    if (thickness > 40) out.warnings.push('سمك أكبر من 4 سم: غالباً تحتاج طبقات متعددة أو معالجة مختلفة — راجع تعليمات الخامة.');

    const kg = area * thickness * layers * rate * wasteMul(p.waste);
    const crackKg = crackLen * pos(p.crackRate) * wasteMul(p.waste);
    const totalKg = kg + crackKg;
    const bags = pieces(totalKg, bagKg);

    if (wallArea) out.summary.push({ label: 'مساحة الحوائط', value: r2(wallArea), unit: 'م²' });
    if (ceilArea) out.summary.push({ label: 'مساحة الأسقف', value: r2(ceilArea), unit: 'م²' });
    if (openings) out.summary.push({ label: 'خصم الفتحات', value: r2(openings), unit: 'م²' });
    out.summary.push({ label: 'المساحة الإجمالية', value: r2(area), unit: 'م²' });
    out.summary.push({ label: 'كمية الجبس', value: r2(totalKg), unit: 'كجم' });
    out.summary.push({ label: 'عدد الشكاير', value: bags, unit: 'شيكارة' });
    if (totalKg >= 1000) out.summary.push({ label: 'بالطن', value: r3(totalKg / 1000), unit: 'طن' });

    if (area > 0) out.work.push(work(`${FINISH_TYPES[p.finish] || 'محارة جبس'} — ${type.name}`, area, 'م²'));
    if (crackLen > 0) out.work.push(work('معالجة شروخ وتلفيات', crackLen, 'م.ط'));
    out.materials.push(mat(type.key, type.name, bags, 'شيكارة', {
      detail: `${r2(totalKg)} كجم = ${r2(area)} م² × ${r2(thickness)} مم × ${layers} طبقة × ${r2(rate)} كجم/م²/مم + هالك ${pos(p.waste)}%` + (crackKg ? ` + شروخ ${r2(crackKg)} كجم` : '') + ` — شيكارة ${r2(bagKg)} كجم`
    }));
    const bead = pos(inp.cornerBead);
    if (bead > 0) out.materials.push(mat('plaster_bead', 'زوايا محارة معدنية', pieces(bead * 1.05, gt0(p.beadLen, 3)), 'عود', { detail: `${r2(bead)} م طولي` }));
    out.notes.push('معدل الاستهلاك قابل للتعديل: يختلف حسب نوع الجبس والسمك واستواء الحائط وطريقة التنفيذ.');
    return out;
  }

  return { PLASTER_TYPES, FINISH_TYPES, PLASTER_DEFAULTS, plaster };
});
