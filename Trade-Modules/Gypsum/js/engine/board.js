/*
 * أرزقي للجبس والديكورات — محرك حسابات الجبسون بورد
 * أسقف معلقة / قواطيع / بيت نور / تكسية حوائط / تكسية أعمدة وكمرات
 * © 2026 أحمد حسن عبدالله - جميع الحقوق محفوظة.
 *
 * مبدأ مهم: لا يوجد "معامل استهلاك" ثابت لكل الأنظمة.
 * كل الكميات تُحسب هندسياً من الأبعاد + مقاس اللوح + المسافات بين القطاعات
 * + عدد الطبقات + أطوال القطاعات — وكل هذه القيم قابلة للتعديل حسب
 * النظام المستخدم وتعليمات الشركة المصنّعة. القيم الافتراضية مجرد بداية.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./core'));
  else { root.HG = root.HG || {}; root.HG.board = factory(root.HG.core); }
})(typeof self !== 'undefined' ? self : this, function (C) {
  'use strict';
  const { num, pos, gt0, cnt, ceil, r2, r3, wasteMul, pieces, mat, work, openingsArea } = C;

  /* ---------------- أنواع الألواح ---------------- */
  const BOARD_TYPES = {
    standard: { name: 'لوح جبس عادي', short: 'عادي' },
    moisture: { name: 'لوح مقاوم للرطوبة', short: 'مقاوم رطوبة' },
    fire: { name: 'لوح مقاوم للحريق', short: 'مقاوم حريق' },
    acoustic: { name: 'لوح عزل صوتي / أداء خاص', short: 'عزل صوتي' },
    cement: { name: 'لوح أسمنتي', short: 'أسمنتي' }
  };
  const BOARD_KEY = { standard: 'board_std', moisture: 'board_mr', fire: 'board_fr', acoustic: 'board_ac', cement: 'board_cem' };
  const INSULATION = {
    none: { name: 'بدون عزل' },
    rockwool: { name: 'صوف صخري', key: 'ins_rockwool' },
    glasswool: { name: 'صوف زجاجي', key: 'ins_glasswool' },
    eps: { name: 'فوم / بوليسترين', key: 'ins_eps' }
  };

  /* القيم الافتراضية (قابلة للتعديل بالكامل من الواجهة) */
  const COMMON = {
    boardType: 'standard', thickness: 12.5, boardW: 1.2, boardL: 2.4, layers: 1,
    waste: 10,          // هالك الألواح والمعجون والشريط %
    profileWaste: 5,    // هالك القطاعات %
    compoundRate: 0.4,  // كجم معجون فواصل لكل م² وجه نهائي
    compoundBag: 20,    // وزن عبوة المعجون (كجم)
    tapeRoll: 75,       // طول لفة الشريط (متر)
    beadLen: 3,         // طول عود الزاوية (كورنر بيد)
    insulation: 'none', insPack: 10 // مساحة تغطية العبوة م²
  };
  const CEILING_DEFAULTS = Object.assign({}, COMMON, {
    system: 'mf',        // mf: رئيسي + ثانوي | omega: أوميجا مباشر | tgrid: بلاطات معلقة
    design: 'flat',
    mainSpacing: 1.0, furSpacing: 0.4, hangerSpacing: 1.0,
    mainLen: 3, furLen: 3, angleLen: 3, angleFix: 0.5, omegaFix: 0.6,
    screwSpacing: 0.17,  // مسافة البراغي على القطاع في الأسقف (م)
    slabHeight: 0, newLevel: 0, tapePerimeter: false,
    levels: 1, levelEdge: 0, levelDrop: 0, levelStudSpacing: 0.6, trackLen: 3,
    teeSpacing: 1.2, tileW: 0.6, tileL: 0.6, teeMainLen: 3.6
  });
  const PARTITION_DEFAULTS = Object.assign({}, COMMON, {
    faces: 2, studSpacing: 0.6, studLen: 3, trackLen: 3, studSize: 75,
    anchorSpacing: 0.6, screwSpacing: 0.25, headerReturn: 0.15, openingBead: true
  });
  const CLADDING_DEFAULTS = Object.assign({}, COMMON, {
    frame: 'direct',     // direct: قطاعات على كانات | stud: هيكل مستقل | adhesive: لصق مباشر
    studSpacing: 0.6, studLen: 3, trackLen: 3, bracketSpacing: 1.0,
    anchorSpacing: 0.6, screwSpacing: 0.25, adhesiveRate: 4, adhesiveBag: 25, openingBead: true
  });
  const COLUMN_DEFAULTS = Object.assign({}, COMMON, {
    studLen: 3, trackLen: 3, screwSpacing: 0.25, studSpacing: 0.6, anchorSpacing: 0.6
  });
  const BULKHEAD_DEFAULTS = Object.assign({}, COMMON, {
    mode: 'room',        // room: حول الغرفة | straight: أطوال مستقيمة
    memberSpacing: 0.6, studLen: 3, trackLen: 3, screwSpacing: 0.2,
    lip: 0, hiddenLight: false, measure: 'outer', ends: 0, hangerSpacing: 1.0, hangerAbove: 0.6
  });

  function withDefaults(def, inp) {
    const p = Object.assign({}, def);
    Object.keys(inp || {}).forEach(k => { if (inp[k] !== '' && inp[k] !== undefined && inp[k] !== null) p[k] = inp[k]; });
    // ضمان أرقام صالحة
    Object.keys(def).forEach(k => { if (typeof def[k] === 'number') p[k] = num(p[k], def[k]); });
    ['boardW', 'boardL', 'mainSpacing', 'furSpacing', 'hangerSpacing', 'mainLen', 'furLen', 'angleLen', 'angleFix', 'omegaFix',
      'screwSpacing', 'studSpacing', 'studLen', 'trackLen', 'anchorSpacing', 'compoundBag', 'tapeRoll', 'beadLen', 'insPack',
      'teeSpacing', 'tileW', 'tileL', 'teeMainLen', 'bracketSpacing', 'adhesiveBag', 'memberSpacing', 'levelStudSpacing', 'hangerSpacing']
      .forEach(k => { if (k in def && !(p[k] > 0)) p[k] = def[k]; });
    p.layers = Math.max(1, Math.round(p.layers || 1));
    return p;
  }

  /** تحويل غرفة (طول×عرض أو مساحة+محيط) إلى أبعاد */
  function roomDims(r) {
    let L = pos(r.L), W = pos(r.W);
    if (!(L > 0 && W > 0)) {
      const A = pos(r.area), P = pos(r.perimeter);
      L = W = 0;
      if (A > 0) {
        const s = P / 2, d = s * s - 4 * A;
        if (P > 0 && d >= 0) { L = (s + Math.sqrt(d)) / 2; W = (s - Math.sqrt(d)) / 2; }
        else { L = W = Math.sqrt(A); }
      }
    }
    return { name: r.name || '', L: Math.max(L, W), S: Math.min(L, W), count: cnt(r.count) };
  }

  function boardLabel(p) { return `${(BOARD_TYPES[p.boardType] || BOARD_TYPES.standard).name} ${r2(p.thickness)} مم (${r2(p.boardW)}×${r2(p.boardL)} م)`; }
  function boardKey(p) { return `${BOARD_KEY[p.boardType] || 'board_std'}_${r2(p.thickness)}`; }

  /** الألواح + البراغي + الشريط + المعجون + العزل */
  function finishing(out, p, o) {
    const wm = wasteMul(p.waste);
    const boardArea = o.boardArea;
    const boardPieceArea = p.boardW * p.boardL;
    const boards = pieces(boardArea * wm, boardPieceArea);
    out.materials.push(mat(boardKey(p), boardLabel(p), boards, 'لوح', { detail: `مساحة ألواح ${r2(boardArea)} م² + هالك ${pos(p.waste)}%` }));
    const screws = ceil(o.screwBase || 0);
    if (screws > 0) out.materials.push(mat('screw_board', 'براغي ألواح (جبس/خشب)', ceil(screws * wasteMul(p.profileWaste)), 'قطعة', { detail: `مسافة البراغي ${r2(p.screwSpacing * 100)} سم على كل قطاع` }));
    const faceArea = o.faceArea;
    const tapeM = (faceArea * (1 / p.boardW + 1 / p.boardL) + (o.tapeExtra || 0)) * wm;
    if (tapeM > 0) out.materials.push(mat('tape', 'شريط فواصل', pieces(tapeM, p.tapeRoll), 'لفة', { detail: `${r2(tapeM)} م طولي (لفة ${r2(p.tapeRoll)} م)` }));
    const kg = faceArea * pos(p.compoundRate) * wm;
    if (kg > 0) out.materials.push(mat('compound', 'معجون فواصل', pieces(kg, p.compoundBag), 'عبوة', { detail: `${r2(kg)} كجم (عبوة ${r2(p.compoundBag)} كجم) — ${r2(p.compoundRate)} كجم/م²` }));
    if (o.insArea > 0 && p.insulation && p.insulation !== 'none' && INSULATION[p.insulation]) {
      const ins = INSULATION[p.insulation];
      out.materials.push(mat(ins.key, `عزل ${ins.name}`, pieces(o.insArea * wasteMul(p.profileWaste), p.insPack), 'عبوة', { detail: `${r2(o.insArea)} م² (العبوة ${r2(p.insPack)} م²)` }));
    }
    out.summary.push({ label: 'مساحة الألواح الفعلية', value: r2(boardArea), unit: 'م²' });
    out.summary.push({ label: 'عدد الألواح', value: boards, unit: 'لوح' });
  }

  function profile(out, key, name, len, stock, p, extra) {
    if (!(len > 0)) return;
    out.materials.push(mat(key, name, pieces(len * wasteMul(p.profileWaste), stock), 'عود', Object.assign({ detail: `${r2(len)} م طولي (العود ${r2(stock)} م)` }, extra || {})));
  }
  function countLine(out, key, name, qty, unit, detail) { if (qty > 0) out.materials.push(mat(key, name, qty, unit || 'قطعة', detail ? { detail } : undefined)); }
  function newOut(kind, title) { return { kind, title, summary: [], work: [], materials: [], warnings: [], notes: [], detail: [] }; }

  /* =====================================================
     1) الأسقف المعلقة
     ===================================================== */
  function ceiling(inp) {
    const p = withDefaults(CEILING_DEFAULTS, inp);
    const out = newOut('ceiling', 'سقف جبسون بورد');
    const rooms = (inp && inp.rooms || []).map(roomDims).filter(r => r.L > 0 && r.S > 0 && r.count > 0);
    const t = { area: 0, perim: 0, mainLen: 0, mainJoin: 0, furLen: 0, furJoin: 0, hangers: 0, clips: 0, metal: 0, omegaAnch: 0, teeMain: 0, tee1200: 0, tee600: 0, tiles: 0 };
    rooms.forEach(r => {
      const A = r.L * r.S, P = 2 * (r.L + r.S), n = r.count;
      t.area += A * n; t.perim += P * n;
      const d = { name: r.name, L: r3(r.L), W: r3(r.S), count: n, area: r2(A), perimeter: r2(P) };
      if (p.system === 'mf') {
        const mainRows = ceil(r.S / p.mainSpacing);
        const furRows = ceil(r.L / p.furSpacing) + 1;
        const hangersRow = ceil(r.L / p.hangerSpacing);
        t.mainLen += mainRows * r.L * n;
        t.mainJoin += mainRows * Math.max(0, ceil(r.L / p.mainLen) - 1) * n;
        t.furLen += furRows * r.S * n;
        t.furJoin += furRows * Math.max(0, ceil(r.S / p.furLen) - 1) * n;
        t.hangers += mainRows * hangersRow * n;
        t.clips += mainRows * furRows * n;
        t.metal += (2 * furRows + 2 * mainRows) * n;
        Object.assign(d, { mainRows, furRows, hangers: mainRows * hangersRow });
      } else if (p.system === 'omega') {
        const rows = ceil(r.L / p.furSpacing) + 1;
        t.furLen += rows * r.S * n;
        t.furJoin += rows * Math.max(0, ceil(r.S / p.furLen) - 1) * n;
        t.omegaAnch += rows * (ceil(r.S / p.omegaFix) + 1) * n;
        t.metal += 2 * rows * n;
        Object.assign(d, { furRows: rows });
      } else {
        const mainRows = ceil(r.S / p.teeSpacing);
        t.teeMain += mainRows * r.L * n;
        t.hangers += mainRows * ceil(r.L / p.hangerSpacing) * n;
        t.tee1200 += (A / (p.teeSpacing * p.tileL)) * n;
        t.tee600 += (p.tileW < p.teeSpacing ? A / (p.teeSpacing * p.tileL) : 0) * n;
        t.tiles += (A / (p.tileW * p.tileL)) * n;
        Object.assign(d, { mainRows });
      }
      out.detail.push(d);
    });
    if (!rooms.length) { out.warnings.push('أدخل أبعاد غرفة واحدة على الأقل.'); return out; }

    const drop = p.slabHeight > 0 && p.newLevel > 0 ? p.slabHeight - p.newLevel : 0;
    if (p.slabHeight > 0 && p.newLevel > 0 && drop <= 0) out.warnings.push('منسوب السقف الجديد لازم يكون أقل من ارتفاع السقف الأصلي.');
    if (drop > 1.5) out.warnings.push('النزول أكبر من 1.5 م: راجع تعليمات الشركة لتدعيم العلاقات أو استخدام قوائم تدعيم.');
    if (p.layers > 1 && p.system !== 'tgrid' && p.hangerSpacing >= 1 && p.furSpacing >= 0.4) out.notes.push('مع أكثر من طبقة عادةً تُقلَّل مسافات العلاقات والقطاعات — راجع جدول الشركة المصنّعة.');

    // نزول المستويات (سقف متعدد المستويات)
    const lv = Math.max(1, Math.round(p.levels || 1));
    const extraLv = lv - 1;
    const lvEdge = pos(p.levelEdge) * extraLv, lvDrop = pos(p.levelDrop);
    const levelArea = lvEdge * lvDrop;
    if (extraLv > 0 && !(lvEdge > 0 && lvDrop > 0)) out.warnings.push('للسقف متعدد المستويات: أدخل طول حافة المستوى وارتفاع النزول.');

    out.summary.push({ label: 'إجمالي المساحة', value: r2(t.area), unit: 'م²' });
    out.summary.push({ label: 'إجمالي أطوال المحيط', value: r2(t.perim), unit: 'م.ط' });
    if (drop > 0) out.summary.push({ label: 'مسافة النزول', value: r2(drop * 100), unit: 'سم' });

    out.work.push(work(p.system === 'tgrid' ? 'سقف معلق بلاطات' : 'سقف جبسون بورد', t.area, 'م²'));
    if (levelArea > 0) out.work.push(work('نزول وتغيير مستويات', lvEdge, 'م.ط'));

    if (p.system === 'tgrid') {
      out.materials.push(mat('ceiling_tile', `بلاطات سقف ${r2(p.tileW * 100)}×${r2(p.tileL * 100)} سم`, pieces(t.tiles * wasteMul(p.waste), 1), 'بلاطة', { detail: `${r2(t.area)} م² + هالك ${pos(p.waste)}%` }));
      profile(out, 'tee_main', 'تي رئيسي (Main Tee)', t.teeMain, p.teeMainLen, p);
      countLine(out, 'tee_cross_1200', `تي ثانوي ${r2(p.teeSpacing * 100)} سم`, ceil(t.tee1200 * wasteMul(p.profileWaste)), 'قطعة');
      countLine(out, 'tee_cross_600', `تي ثانوي ${r2(p.tileW * 100)} سم`, ceil(t.tee600 * wasteMul(p.profileWaste)), 'قطعة');
      profile(out, 'wall_angle', 'زاوية حائط (Wall Angle)', t.perim, p.angleLen, p);
      countLine(out, 'hanger', 'علاقات تعليق', t.hangers, 'قطعة', drop > 0 ? `طول العلاقة ≈ ${r2(drop * 100 + 10)} سم` : '');
      countLine(out, 'anchor', 'خوابير / مسامير تثبيت', t.hangers + ceil(t.perim / p.angleFix), 'قطعة');
      out.summary.push({ label: 'عدد البلاطات', value: out.materials[0].qty, unit: 'بلاطة' });
      return out;
    }

    if (p.system === 'mf') {
      profile(out, 'main_channel', 'قطاع رئيسي (Main Channel)', t.mainLen, p.mainLen, p, { detail: `${r2(t.mainLen)} م طولي — كل ${r2(p.mainSpacing * 100)} سم` });
      profile(out, 'furring', 'قطاع ثانوي (Furring Channel)', t.furLen, p.furLen, p, { detail: `${r2(t.furLen)} م طولي — كل ${r2(p.furSpacing * 100)} سم` });
      countLine(out, 'hanger', 'علاقات تعليق', t.hangers, 'قطعة', `كل ${r2(p.hangerSpacing * 100)} سم على الرئيسي` + (drop > 0 ? ` — طول العلاقة ≈ ${r2(drop * 100 + 10)} سم` : ''));
      countLine(out, 'cross_clip', 'مشابك (رئيسي × ثانوي)', t.clips, 'قطعة');
      countLine(out, 'main_joiner', 'وصلات قطاع رئيسي', t.mainJoin, 'قطعة');
      countLine(out, 'furring_joiner', 'وصلات قطاع ثانوي', t.furJoin, 'قطعة');
    } else {
      profile(out, 'omega', 'قطاع أوميجا', t.furLen, p.furLen, p, { detail: `${r2(t.furLen)} م طولي — كل ${r2(p.furSpacing * 100)} سم` });
      countLine(out, 'furring_joiner', 'وصلات أوميجا', t.furJoin, 'قطعة');
    }
    profile(out, 'wall_angle', 'زاوية حائط / U Track محيط', t.perim, p.angleLen, p);
    // مستويات إضافية
    const lvTrack = 2 * lvEdge, lvStudLen = levelArea > 0 ? (ceil(pos(p.levelEdge) / p.levelStudSpacing) + 1) * extraLv * lvDrop : 0;
    if (levelArea > 0) {
      profile(out, 'u_track', 'مجرى U Track (نزول المستويات)', lvTrack, p.trackLen, p);
      profile(out, 'c_stud', 'قائم C Stud (نزول المستويات)', lvStudLen, p.trackLen, p);
      profile(out, 'corner_bead', 'زاوية حماية (كورنر بيد)', lvEdge, p.beadLen, p);
    }
    const anchors = t.hangers + ceil(t.perim / p.angleFix) + t.omegaAnch + (lvTrack > 0 ? ceil(lvTrack / 2 / 0.6) : 0);
    countLine(out, 'anchor', 'خوابير / مسامير تثبيت', anchors, 'قطعة');
    countLine(out, 'screw_metal', 'براغي معدن (قطاع مع قطاع)', ceil(t.metal * wasteMul(p.profileWaste)), 'قطعة');

    const boardArea = (t.area + levelArea) * p.layers;
    finishing(out, p, {
      boardArea,
      screwBase: t.area * p.layers / (p.furSpacing * p.screwSpacing) + levelArea * p.layers / (p.levelStudSpacing * 0.25),
      faceArea: t.area + levelArea,
      tapeExtra: p.tapePerimeter ? t.perim : 0,
      insArea: t.area
    });
    return out;
  }

  /* ---------- فتحات الأبواب والشبابيك (مشتركة بين القواطيع والتكسية) ---------- */
  function openingsInfo(list, p, faces) {
    const o = { area: 0, doorsW: 0, header: 0, studs: 0, bead: 0, count: 0 };
    (list || []).forEach(x => {
      const w = pos(x.w), h = pos(x.h), n = cnt(x.count);
      if (!(w > 0 && h > 0 && n > 0)) return;
      const isDoor = (x.type || 'door') === 'door';
      o.area += w * h * n; o.count += n;
      o.studs += 2 * n;
      o.header += (w + 2 * p.headerReturn) * (isDoor ? 1 : 2) * n; // باب: علوي | شباك: علوي + سفلي
      if (isDoor) o.doorsW += w * n;
      o.bead += (isDoor ? w + 2 * h : 2 * (w + h)) * n * faces;
    });
    return o;
  }

  /* =====================================================
     2) القواطيع والفواصل
     ===================================================== */
  function partition(inp) {
    const p = withDefaults(PARTITION_DEFAULTS, inp);
    p.faces = Math.min(2, Math.max(1, Math.round(p.faces || 2)));
    p.headerReturn = pos(p.headerReturn);
    const out = newOut('partition', 'قاطع جبسون بورد');
    const walls = (inp && inp.walls || []).map(w => ({ name: w.name || '', L: pos(w.L), H: pos(w.H), count: cnt(w.count) })).filter(w => w.L > 0 && w.H > 0 && w.count > 0);
    if (!walls.length) { out.warnings.push('أدخل طول وارتفاع قاطع واحد على الأقل.'); return out; }
    let gross = 0, studs = 0, studPieces = 0, studLen = 0, top = 0, sideFix = 0, maxH = 0;
    walls.forEach(w => {
      const n = w.count;
      gross += w.L * w.H * n;
      const s = ceil(w.L / p.studSpacing) + 1;
      studs += s * n; studLen += s * w.H * n;
      studPieces += s * ceil(w.H / p.studLen) * n;
      top += w.L * n;
      sideFix += 2 * w.H * n;
      maxH = Math.max(maxH, w.H);
      out.detail.push({ name: w.name, L: r3(w.L), H: r3(w.H), count: n, area: r2(w.L * w.H), studs: s });
    });
    const op = openingsInfo(inp && inp.openings, p, p.faces);
    const net = Math.max(0, gross - op.area);
    if (op.area >= gross) out.warnings.push('مساحة الفتحات أكبر من مساحة القاطع — راجع المقاسات.');
    const bottom = Math.max(0, top - op.doorsW);
    studs += op.studs;
    studPieces += op.studs * ceil(maxH / p.studLen);
    studLen += op.studs * maxH;
    const trackTotal = top + bottom + op.header;

    out.summary.push({ label: 'المساحة الهندسية للقاطع', value: r2(gross), unit: 'م²' });
    if (op.area > 0) out.summary.push({ label: 'خصم الفتحات', value: r2(op.area), unit: 'م²' });
    out.summary.push({ label: 'صافي مساحة القاطع', value: r2(net), unit: 'م²' });
    out.summary.push({ label: 'عدد القوائم الرأسية', value: studs, unit: 'قائم' });
    out.summary.push({ label: 'أطوال المسارات الأفقية', value: r2(trackTotal), unit: 'م.ط' });
    if (maxH > p.studLen) out.warnings.push(`الارتفاع أكبر من طول القائم (${r2(p.studLen)} م): القوائم هتتوصل — راجع طول الركوب (Overlap) وتعليمات الشركة.`);

    out.work.push(work(`قاطع جبسون بورد ${p.faces === 2 ? 'وجهين' : 'وجه واحد'}`, net, 'م²'));
    out.materials.push(mat('c_stud', `قائم C Stud ${p.studSize} مم`, ceil(studPieces * wasteMul(p.profileWaste)), 'عود', { detail: `${studs} قائم × ${r2(maxH)} م — كل ${r2(p.studSpacing * 100)} سم (العود ${r2(p.studLen)} م)` }));
    profile(out, 'u_track', `مجرى U Track ${p.studSize} مم`, trackTotal, p.trackLen, p, { detail: `علوي ${r2(top)} + سفلي ${r2(bottom)} + فتحات ${r2(op.header)} م` });
    if (p.openingBead && op.bead > 0) profile(out, 'corner_bead', 'زاوية حماية للفتحات (كورنر بيد)', op.bead, p.beadLen, p);
    countLine(out, 'anchor', 'خوابير / مسامير تثبيت', ceil((top + bottom + sideFix) / p.anchorSpacing), 'قطعة', `كل ${r2(p.anchorSpacing * 100)} سم على المجاري والقوائم الطرفية`);
    countLine(out, 'screw_metal', 'براغي معدن (قائم مع مجرى)', ceil(studs * 4 * wasteMul(p.profileWaste)), 'قطعة');
    const boardArea = net * p.faces * p.layers;
    out.summary.push({ label: 'عدد الأوجه × الطبقات', value: `${p.faces} × ${p.layers}`, unit: '' });
    finishing(out, p, {
      boardArea,
      screwBase: boardArea / (p.studSpacing * p.screwSpacing),
      faceArea: net * p.faces,
      insArea: net
    });
    return out;
  }

  /* =====================================================
     3) تكسية الحوائط
     ===================================================== */
  function cladding(inp) {
    const p = withDefaults(CLADDING_DEFAULTS, inp);
    p.headerReturn = 0.15;
    const out = newOut('cladding', 'تكسية حوائط جبسون بورد');
    const walls = (inp && inp.walls || []).map(w => ({ name: w.name || '', L: pos(w.L), H: pos(w.H), count: cnt(w.count) })).filter(w => w.L > 0 && w.H > 0 && w.count > 0);
    if (!walls.length) { out.warnings.push('أدخل طول وارتفاع حائط واحد على الأقل.'); return out; }
    let gross = 0, rows = 0, rowLen = 0, rowPieces = 0, brackets = 0, tracks = 0, maxH = 0;
    walls.forEach(w => {
      const n = w.count;
      gross += w.L * w.H * n;
      const s = ceil(w.L / p.studSpacing) + 1;
      rows += s * n; rowLen += s * w.H * n; rowPieces += s * ceil(w.H / p.studLen) * n;
      brackets += s * ceil(w.H / p.bracketSpacing) * n;
      tracks += 2 * w.L * n;
      maxH = Math.max(maxH, w.H);
      out.detail.push({ name: w.name, L: r3(w.L), H: r3(w.H), count: n, area: r2(w.L * w.H) });
    });
    const op = openingsInfo(inp && inp.openings, p, 1);
    const net = Math.max(0, gross - op.area);
    out.summary.push({ label: 'مساحة الحوائط', value: r2(gross), unit: 'م²' });
    if (op.area > 0) out.summary.push({ label: 'خصم الفتحات', value: r2(op.area), unit: 'م²' });
    out.summary.push({ label: 'صافي المساحة', value: r2(net), unit: 'م²' });
    out.work.push(work('تكسية حوائط جبسون بورد', net, 'م²'));

    let screwBase = 0;
    if (p.frame === 'adhesive') {
      const kg = net * pos(p.adhesiveRate) * wasteMul(p.waste);
      out.materials.push(mat('adhesive', 'مادة لاصقة للألواح', pieces(kg, p.adhesiveBag), 'شيكارة', { detail: `${r2(kg)} كجم — ${r2(p.adhesiveRate)} كجم/م²` }));
    } else {
      const extraRows = op.studs;
      if (p.frame === 'direct') {
        out.materials.push(mat('furring', 'قطاع ثانوي / أوميجا رأسي', ceil((rowPieces + extraRows * ceil(maxH / p.studLen)) * wasteMul(p.profileWaste)), 'عود', { detail: `${rows + extraRows} صف × ${r2(maxH)} م — كل ${r2(p.studSpacing * 100)} سم` }));
        countLine(out, 'direct_bracket', 'كانات تثبيت مباشر', brackets, 'قطعة', `كل ${r2(p.bracketSpacing * 100)} سم على القطاع`);
        profile(out, 'wall_angle', 'زاوية / مجرى علوي وسفلي', Math.max(0, tracks - op.doorsW), p.trackLen, p);
        countLine(out, 'anchor', 'خوابير / مسامير تثبيت', brackets + ceil(tracks / p.anchorSpacing), 'قطعة');
      } else {
        out.materials.push(mat('c_stud', 'قائم C Stud', ceil((rowPieces + extraRows * ceil(maxH / p.studLen)) * wasteMul(p.profileWaste)), 'عود', { detail: `${rows + extraRows} قائم × ${r2(maxH)} م` }));
        profile(out, 'u_track', 'مجرى U Track', Math.max(0, tracks - op.doorsW) + op.header, p.trackLen, p);
        countLine(out, 'anchor', 'خوابير / مسامير تثبيت', ceil(tracks / p.anchorSpacing), 'قطعة');
        countLine(out, 'screw_metal', 'براغي معدن', ceil((rows + extraRows) * 4 * wasteMul(p.profileWaste)), 'قطعة');
      }
      screwBase = net * p.layers / (p.studSpacing * p.screwSpacing);
    }
    if (p.openingBead && op.bead > 0) profile(out, 'corner_bead', 'زاوية حماية للفتحات (كورنر بيد)', op.bead, p.beadLen, p);
    finishing(out, p, { boardArea: net * p.layers, screwBase, faceArea: net, insArea: p.frame === 'adhesive' ? 0 : net });
    return out;
  }

  /* =====================================================
     4) تكسية الأعمدة والكمرات
     ===================================================== */
  function columns(inp) {
    const p = withDefaults(COLUMN_DEFAULTS, inp);
    const out = newOut('columns', 'تكسية أعمدة وكمرات');
    let area = 0, bead = 0, vert = 0, ring = 0, lm = 0, colCount = 0;
    (inp && inp.columns || []).forEach(c => {
      const a = pos(c.a), b = pos(c.b), H = pos(c.H), n = cnt(c.count);
      const sides = Math.min(4, Math.max(1, Math.round(num(c.sides, 4))));
      if (!(a > 0 && H > 0 && n > 0)) return;
      // الأوجه الظاهرة: 4 = عمود حر | 3 = ملاصق لحائط | 2 = في ركن | 1 = وجه واحد
      const exposed = sides === 4 ? 2 * (a + b) : sides === 3 ? a + 2 * b : sides === 2 ? a + b : a;
      const corners = sides === 4 ? 4 : sides === 3 ? 2 : sides === 2 ? 1 : 0;
      const verticals = corners + (sides < 4 ? 2 : 0);
      area += exposed * H * n; bead += corners * H * n; vert += verticals * H * n; ring += 2 * exposed * n;
      colCount += n;
      out.detail.push({ name: c.name || 'عمود', a: r3(a), b: r3(b), H: r3(H), count: n, area: r2(exposed * H) });
    });
    (inp && inp.beams || []).forEach(c => {
      const L = pos(c.L), w = pos(c.w), d = pos(c.d), n = cnt(c.count);
      const sides = Math.min(2, Math.max(1, Math.round(num(c.sides, 2)))); // جانبين أو جانب واحد ظاهر
      if (!(L > 0 && n > 0)) return;
      const per = w + sides * d;
      area += L * per * n; bead += L * sides * n; vert += L * (sides + 1) * n; lm += L * n;
      out.detail.push({ name: c.name || 'كمرة', L: r3(L), w: r3(w), d: r3(d), count: n, area: r2(L * per) });
    });
    if (!(area > 0)) { out.warnings.push('أدخل مقاسات عمود أو كمرة واحدة على الأقل.'); return out; }
    out.summary.push({ label: 'مساحة التكسية', value: r2(area), unit: 'م²' });
    out.summary.push({ label: 'أطوال الزوايا الخارجية', value: r2(bead), unit: 'م.ط' });
    out.work.push(work('تكسية أعمدة وكمرات', area, 'م²'));
    profile(out, 'u_track', 'مجرى U Track (حلقات علوية وسفلية)', ring, p.trackLen, p);
    profile(out, 'c_stud', 'قطاع رأسي / زاوية هيكل', vert, p.studLen, p);
    profile(out, 'corner_bead', 'زاوية حماية (كورنر بيد)', bead, p.beadLen, p);
    countLine(out, 'anchor', 'خوابير / مسامير تثبيت', ceil((ring / 2 + vert / 2) / p.anchorSpacing), 'قطعة');
    finishing(out, p, { boardArea: area * p.layers, screwBase: area * p.layers / (p.studSpacing * p.screwSpacing), faceArea: area, tapeExtra: 0 });
    return out;
  }

  /* =====================================================
     5) بيت النور / الكرانيش الجبسون بورد (Bulkhead)
     ===================================================== */
  function bulkhead(inp) {
    const p = withDefaults(BULKHEAD_DEFAULTS, inp);
    p.lip = pos(p.lip);
    const out = newOut('bulkhead', 'بيت نور جبسون بورد');
    const levels = (inp && inp.levels || []).map(l => ({ w: pos(l.w), d: pos(l.d) })).filter(l => l.w > 0 || l.d > 0);
    if (!levels.length) { out.warnings.push('أدخل عرض النزول وارتفاعه.'); return out; }
    const count = cnt(inp && inp.count);
    let bottom = 0, vertical = 0, lipA = 0, ends = 0, wallTrack = 0, edgeTrack = 0, members = 0, memberCount = 0, bead = 0, hangers = 0;
    let measureOuter = 0, measureInner = 0, led = 0;
    if (p.mode === 'room') {
      let L = pos(inp && inp.L), W = pos(inp && inp.W);
      if (!(L > 0 && W > 0)) { out.warnings.push('أدخل طول وعرض الغرفة.'); return out; }
      const sides = Math.min(4, Math.max(1, Math.round(num(inp && inp.sides, 4))));
      // جوانب أقل من 4: نحسبها كأطوال مستقيمة على أطول الأضلاع
      if (sides < 4) {
        const segs = [L, W, L].slice(0, sides);
        return bulkhead(Object.assign({}, inp, { mode: 'straight', segments: segs.map(x => ({ len: x })), ends: 2 }));
      }
      let oL = L, oW = W;
      levels.forEach((lv, i) => {
        const iL = oL - 2 * lv.w, iW = oW - 2 * lv.w;
        if (iL <= 0 || iW <= 0) { out.warnings.push(`عرض المستوى ${i + 1} كبير على مقاس الغرفة.`); return; }
        const outerP = 2 * (oL + oW), innerP = 2 * (iL + iW);
        bottom += (oL * oW - iL * iW); vertical += innerP * lv.d;
        wallTrack += outerP; edgeTrack += 2 * innerP; memberCount += ceil(innerP / p.memberSpacing); members += ceil(innerP / p.memberSpacing) * (lv.w + lv.d);
        bead += innerP;
        if (lv.w > p.hangerAbove) hangers += ceil(innerP / p.hangerSpacing);
        measureOuter += outerP; measureInner += innerP;
        out.detail.push({ name: `مستوى ${i + 1}`, w: r3(lv.w), d: r3(lv.d), outer: r2(outerP), inner: r2(innerP) });
        oL = iL; oW = iW;
        if (i === levels.length - 1) { led = innerP; if (p.lip > 0) { lipA += innerP * p.lip; edgeTrack += innerP; bead += innerP; } }
      });
    } else {
      const segs = (inp && inp.segments || []).map(s => pos(s.len) * cnt(s.count)).filter(x => x > 0);
      const Ls = segs.reduce((a, b) => a + b, 0);
      if (!(Ls > 0)) { out.warnings.push('أدخل أطوال بيت النور.'); return out; }
      const nEnds = Math.max(0, Math.round(num(p.ends, 0)));
      levels.forEach((lv, i) => {
        bottom += Ls * lv.w; vertical += Ls * lv.d; wallTrack += Ls; edgeTrack += 2 * Ls;
        memberCount += ceil(Ls / p.memberSpacing); members += ceil(Ls / p.memberSpacing) * (lv.w + lv.d); bead += Ls;
        ends += nEnds * lv.w * lv.d; bead += nEnds * (lv.w + lv.d);
        if (lv.w > p.hangerAbove) hangers += ceil(Ls / p.hangerSpacing);
        measureOuter += Ls; measureInner += Ls;
        out.detail.push({ name: `مستوى ${i + 1}`, w: r3(lv.w), d: r3(lv.d), length: r2(Ls) });
      });
      led = Ls;
      if (p.lip > 0) { lipA += Ls * p.lip; edgeTrack += Ls; bead += Ls; }
    }
    const k = count;
    const boardFace = (bottom + vertical + lipA + ends) * k;
    out.summary.push({ label: 'الطول على الحائط', value: r2(measureOuter * k), unit: 'م.ط' });
    out.summary.push({ label: 'الطول عند الحافة الداخلية', value: r2(measureInner * k), unit: 'م.ط' });
    out.summary.push({ label: 'مساحة الجوانب (نزول + شفة)', value: r2((vertical + lipA + ends) * k), unit: 'م²' });
    out.summary.push({ label: 'مساحة القاع (الأرضية)', value: r2(bottom * k), unit: 'م²' });
    const wq = p.measure === 'inner' ? measureInner * k : p.measure === 'area' ? boardFace : measureOuter * k;
    out.work.push(work(p.hiddenLight || p.lip > 0 ? 'بيت نور بإضاءة مخفية' : 'بيت نور / نزول جبسون بورد', wq, p.measure === 'area' ? 'م²' : 'م.ط'));
    profile(out, 'u_track', 'مجرى U Track (حائط + حواف)', (wallTrack + edgeTrack) * k, p.trackLen, p, { detail: `على الحائط ${r2(wallTrack * k)} + الحواف ${r2(edgeTrack * k)} م` });
    profile(out, 'c_stud', 'قطاع عرضي ورأسي (C Stud / ثانوي)', members * k, p.studLen, p, { detail: `${r2(members * k)} م — كل ${r2(p.memberSpacing * 100)} سم` });
    profile(out, 'corner_bead', 'زاوية حماية (كورنر بيد)', bead * k, p.beadLen, p);
    countLine(out, 'hanger', 'علاقات تعليق (للعروض الكبيرة)', hangers * k, 'قطعة');
    countLine(out, 'anchor', 'خوابير / مسامير تثبيت', ceil(wallTrack * k / 0.5) + ceil(edgeTrack * k / 2 / 0.6) + hangers * k, 'قطعة');
    countLine(out, 'screw_metal', 'براغي معدن', ceil(memberCount * k * 4 * wasteMul(p.profileWaste)), 'قطعة');
    if ((p.hiddenLight || p.lip > 0) && led > 0) out.notes.push(`طول الإضاءة المخفية التقريبي: ${r2(led * k)} م (شريط ليد / بروفايل — خارج حساب الجبس).`);
    finishing(out, p, { boardArea: boardFace * p.layers, screwBase: boardFace * p.layers / (p.memberSpacing * p.screwSpacing), faceArea: boardFace });
    return out;
  }

  return {
    BOARD_TYPES, INSULATION, CEILING_DEFAULTS, PARTITION_DEFAULTS, CLADDING_DEFAULTS, COLUMN_DEFAULTS, BULKHEAD_DEFAULTS,
    ceiling, partition, cladding, columns, bulkhead, roomDims, boardKey
  };
});
