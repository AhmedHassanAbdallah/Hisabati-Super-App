/*
 * أرزقي للجبس والديكورات — محرك الكرانيش والبانوهات والروزتات والزخارف
 * © 2026 أحمد حسن عبدالله - جميع الحقوق محفوظة.
 *
 * الكرانيش والبراويز تُحسب بخطة قص حقيقية (أقل عدد أعواد)، ثم تُطبَّق نسبة
 * الهالك الإضافية (كسر/تلف) — العدد النهائي = الأكبر بين خطة القص والطول مع الهالك.
 * كل الأسعار يدخلها المستخدم؛ لا توجد أسعار ثابتة.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./core'));
  else { root.HG = root.HG || {}; root.HG.decor = factory(root.HG.core); }
})(typeof self !== 'undefined' ? self : this, function (C) {
  'use strict';
  const { num, pos, gt0, cnt, ceil, r2, r3, wasteMul, pieces, mat, work, cutPlan } = C;

  const CORNICE_TYPES = {
    ready: 'كرانيش جاهزة (مصبوبة)',
    baladi: 'كرانيش جبس بلدي (سحب يدوي)',
    simple: 'كرانيش بسيطة',
    ornate: 'كرانيش مزخرفة',
    light: 'كرانيش بيت النور',
    multi: 'كرانيش متعددة المستويات'
  };
  const EXEC_TYPES = { ready: 'جاهز للتركيب', handmade: 'تصنيع يدوي في الموقع', custom: 'تصميم خاص حسب الطلب' };
  const PANEL_TYPES = {
    rect: 'بانوه مستطيل', square: 'بانوه مربع', geo: 'بانوه بأشكال هندسية', multi: 'بانوه بإطارات متعددة',
    ready: 'بانوه جاهز', custom: 'بانوه مصنع حسب الطلب', light: 'بانوه مدمج مع الإضاءة'
  };
  const DECOR_TYPES = ['روزتة سقف', 'زخرفة حائط', 'وحدة ديكورية', 'عمود جبسي', 'تاج عمود', 'إطار مرآة', 'إطار لوحة', 'وحدة مصبوبة', 'حلية', 'زاوية جبسية', 'شكل خاص'];

  /* =====================================================
     1) الكرانيش
     ===================================================== */
  function cornice(inp) {
    inp = inp || {};
    const out = { kind: 'cornice', title: 'كرانيش', summary: [], work: [], materials: [], warnings: [], notes: [], detail: [] };
    const pieceLen = gt0(inp.pieceLen, 2);
    const waste = pos(inp.waste == null || inp.waste === '' ? 10 : inp.waste);
    const allowance = pos(inp.allowance);
    let sides = [];
    if (inp.mode === 'room') {
      const L = pos(inp.L), W = pos(inp.W), n = cnt(inp.count);
      for (let i = 0; i < n; i++) if (L > 0 && W > 0) sides.push(L, W, L, W);
    } else {
      (inp.sides || []).forEach(s => { const l = pos(s.len), n = cnt(s.count); for (let i = 0; i < n; i++) if (l > 0) sides.push(l); });
    }
    if (!sides.length) { out.warnings.push('أدخل أطوال الأضلاع أو أبعاد الغرفة.'); return out; }
    const required = sides.reduce((a, b) => a + b, 0);
    const handmade = inp.exec === 'handmade';
    let inner = inp.innerCorners === '' || inp.innerCorners == null ? (inp.mode === 'room' ? 4 * cnt(inp.count) : Math.max(0, sides.length - 1)) : Math.max(0, Math.round(num(inp.innerCorners)));
    const outer = Math.max(0, Math.round(num(inp.outerCorners, 0)));
    out.summary.push({ label: 'عدد الأضلاع', value: sides.length, unit: 'ضلع' });
    out.summary.push({ label: 'إجمالي الأطوال', value: r2(required), unit: 'م.ط' });
    out.summary.push({ label: 'زوايا داخلية / خارجية', value: `${inner} / ${outer}`, unit: '' });
    out.work.push(work(CORNICE_TYPES[inp.type] || 'تركيب كرانيش', required, 'م.ط'));
    if (inner + outer > 0) out.work.push(work('قص وتجميع زوايا', inner + outer, 'زاوية', { optional: true }));

    if (handmade) {
      const kgm = pos(inp.kgPerMeter == null || inp.kgPerMeter === '' ? 1.5 : inp.kgPerMeter);
      const kg = required * kgm * wasteMul(waste);
      const bagKg = gt0(inp.bagKg, 25);
      out.summary.push({ label: 'كمية الجبس', value: r2(kg), unit: 'كجم' });
      out.materials.push(mat('plaster_baladi', 'جبس بلدي للكرانيش', pieces(kg, bagKg), 'شيكارة', { detail: `${r2(kg)} كجم — ${r2(kgm)} كجم/م.ط + هالك ${waste}%` }));
      out.notes.push('كرانيش السحب اليدوي: الاستهلاك يعتمد على قطاع الكورنيش (البروز والارتفاع) — عدّل كجم/م.ط حسب الشغل.');
      return out;
    }
    const plan = cutPlan(sides, pieceLen, allowance);
    const withWaste = pieces(required * wasteMul(waste), pieceLen);
    const bars = Math.max(plan.bars, withWaste);
    const wasteLen = bars * pieceLen - required;
    out.summary.push({ label: 'أقل عدد قطع (خطة القص)', value: plan.bars, unit: 'قطعة' });
    out.summary.push({ label: 'عدد القطع المطلوبة', value: bars, unit: 'قطعة' });
    out.summary.push({ label: 'كمية الهالك', value: r2(wasteLen), unit: 'م.ط' });
    out.materials.push(mat('cornice', `كورنيش ${CORNICE_TYPES[inp.type] ? '— ' + CORNICE_TYPES[inp.type] : ''}`.trim(), bars, 'قطعة', { detail: `القطعة ${r2(pieceLen)} م — مطلوب ${r2(required)} م + هالك ${waste}%`, perMeter: pieceLen }));
    const gl = Math.max(1, ceil(sides.length / 6));
    out.materials.push(mat('decor_adhesive', 'لاصق / جبس تركيب الكرانيش', gl, 'عبوة', { detail: 'تقديري — عدّل حسب الخامة' }));
    out.detail = plan.plan.map((b, i) => ({ name: `قطعة ${i + 1 + plan.fullBars}`, cuts: b.cuts.map(r2).join(' + '), rest: r2(b.rest) }));
    if (plan.fullBars) out.detail.unshift({ name: `${plan.fullBars} قطعة كاملة`, cuts: r2(pieceLen), rest: 0 });
    return out;
  }

  /* =====================================================
     2) البانوهات
     ===================================================== */
  function panels(inp) {
    inp = inp || {};
    const out = { kind: 'panels', title: 'بانوهات جبسية', summary: [], work: [], materials: [], warnings: [], notes: [], detail: [] };
    const pieceLen = gt0(inp.pieceLen, 2);
    const waste = pos(inp.waste == null || inp.waste === '' ? 10 : inp.waste);
    const allowance = pos(inp.allowance);
    const segs = [];
    let totalLen = 0, frames = 0, panelCount = 0, faceArea = 0;
    (inp.panels || []).forEach((pn, idx) => {
      const w = pos(pn.w), h = pos(pn.h), n = cnt(pn.count);
      const innerN = Math.max(0, Math.round(num(pn.inner, 0)));
      const outerN = Math.max(0, Math.round(num(pn.outer, 0)));
      const gap = pos(pn.gap == null || pn.gap === '' ? 0.1 : pn.gap);
      if (!(w > 0 && h > 0 && n > 0)) return;
      const fr = [];
      for (let k = outerN; k >= 1; k--) fr.push([w + 2 * k * gap, h + 2 * k * gap]);
      fr.push([w, h]);
      for (let k = 1; k <= innerN; k++) { const a = w - 2 * k * gap, b = h - 2 * k * gap; if (a > 0 && b > 0) fr.push([a, b]); else out.warnings.push(`البانوه ${idx + 1}: الإطار الداخلي ${k} أصغر من المسافة — اتشال.`); }
      let len = 0;
      for (let c = 0; c < n; c++) fr.forEach(([a, b]) => { segs.push(a, b, a, b); });
      fr.forEach(([a, b]) => { len += 2 * (a + b); });
      totalLen += len * n; frames += fr.length * n; panelCount += n; faceArea += w * h * n;
      out.detail.push({ name: pn.name || `بانوه ${idx + 1}`, size: `${r2(w)}×${r2(h)}`, count: n, frames: fr.length, length: r2(len), total: r2(len * n) });
    });
    if (!panelCount) { out.warnings.push('أدخل مقاس بانوه واحد على الأقل.'); return out; }
    const plan = cutPlan(segs, pieceLen, allowance);
    const bars = Math.max(plan.bars, pieces(totalLen * wasteMul(waste), pieceLen));
    out.summary.push({ label: 'عدد البانوهات', value: panelCount, unit: 'بانوه' });
    out.summary.push({ label: 'عدد الإطارات', value: frames, unit: 'إطار' });
    out.summary.push({ label: 'أطوال الإطارات', value: r2(totalLen), unit: 'م.ط' });
    out.summary.push({ label: 'عدد الزوايا (قص ميتر)', value: frames * 4, unit: 'زاوية' });
    out.summary.push({ label: 'عدد قطع البروفايل', value: bars, unit: 'قطعة' });
    out.summary.push({ label: 'الهالك', value: r2(bars * pieceLen - totalLen), unit: 'م.ط' });
    out.work.push(work(PANEL_TYPES[inp.type] || 'بانوهات جبسية', panelCount, 'بانوه', { altQty: r3(totalLen), altUnit: 'م.ط' }));
    out.materials.push(mat('panel_molding', 'بروفايل / برواز بانوهات', bars, 'قطعة', { detail: `القطعة ${r2(pieceLen)} م — مطلوب ${r2(totalLen)} م + هالك ${waste}%` }));
    out.materials.push(mat('decor_adhesive', 'لاصق / جبس تركيب', Math.max(1, ceil(frames / 4)), 'عبوة', { detail: 'تقديري — عدّل حسب الخامة' }));
    out.faceArea = r2(faceArea);
    out.totalLen = r3(totalLen);
    return out;
  }

  /* =====================================================
     3) الروزتات والزخارف والوحدات
     ===================================================== */
  function pieces_(inp) {
    inp = inp || {};
    const out = { kind: 'decor', title: 'روزتات وزخارف جبسية', summary: [], work: [], materials: [], warnings: [], notes: [], detail: [] };
    let n = 0;
    (inp.items || []).forEach(it => {
      const c = cnt(it.count);
      if (!(c > 0) || !(it.name || it.size)) return;
      n += c;
      const name = [it.name || 'قطعة ديكور', it.size ? `(${it.size})` : ''].join(' ').trim();
      out.work.push(work(name, c, 'قطعة', { exec: it.exec || 'ready' }));
      out.materials.push(mat('decor_piece', name, c, 'قطعة', { detail: EXEC_TYPES[it.exec] || '' }));
    });
    if (!n) { out.warnings.push('أدخل قطعة واحدة على الأقل.'); return out; }
    out.summary.push({ label: 'إجمالي القطع', value: n, unit: 'قطعة' });
    return out;
  }

  return { CORNICE_TYPES, EXEC_TYPES, PANEL_TYPES, DECOR_TYPES, cornice, panels, pieces: pieces_ };
});
