/*
 * HESABATI PLASTER — محررات القياس والحساب (البند، المنطقة / الواجهة)
 */
(function () {
  'use strict';
  const U = window.UI, E = U.E, C = U.C, S = U.S;
  const { esc, icon, fq, money, seg, inp, mini, sel, sw, bv } = U;

  let CUR_P = null, CUR_IT = null, CUR_Z = null;
  U.BIND_ROOTS.it = () => CUR_IT;
  U.BIND_ROOTS.zn = () => CUR_Z;
  U.BIND_ROOTS.pj = () => CUR_P;

  const UNIT_OPTS = Object.keys(E.BILLING_UNITS).map(k => [k, E.BILLING_UNITS[k].name]);
  const SUPPLY_OPTS = Object.keys(E.SUPPLY_MODES).map(k => [k, E.SUPPLY_MODES[k]]);
  const CALC_TYPES = [
    ['none', 'بدون خامات (مصنعية / بند حر)'],
    ['cement', 'محارة أسمنتية (أسمنت + رمل)'],
    ['premix', 'محارة جاهزة / جبسية (Dry Mix)'],
    ['coverage', 'خامة بالتغطية (معجون، دهارة، برايمر، دهان، عزل)'],
    ['graffiato', 'جرافيت + برايمر'],
    ['mesh', 'شبك فايبر / ممدد']
  ];
  const CALC_PRESET = { cement: 'cementInt', premix: 'drymix', coverage: 'putty', graffiato: 'graffiato', mesh: 'mesh' };

  function ensureCalc(item) {
    const c = item.calc || (item.calc = { type: 'none', extras: [] });
    if (!Array.isArray(c.extras)) c.extras = [];
    const fresh = S.newCalc({ calc: c.type, preset: CALC_PRESET[c.type] });
    ['cement', 'premix', 'main', 'primer', 'mesh', 'second'].forEach(k => { if (!c[k] && fresh[k]) c[k] = fresh[k]; });
    if (c.type === 'graffiato' && c.primerOn == null) c.primerOn = true;
    if (!c.mesh) c.mesh = S.newCalc({ calc: 'mesh', preset: 'mesh' }).mesh;
    if (!c.second) c.second = S.newCalc({ calc: 'none' }).second;
  }

  function zoneMeasures(p) { const out = {}; (p.zones || []).forEach(z => { out[z.id] = E.measureCalc(z.measure); }); return out; }
  function itemRes(p, it) {
    const z = it.zoneId && p ? (p.zones || []).find(x => x.id === it.zoneId) : null;
    return E.itemCalc(it, { zoneMeasure: z ? E.measureCalc(z.measure) : null });
  }

  /* ================= محرر القياس ================= */
  const MODES = [['room', 'غرفة'], ['shapes', 'حوائط وأشكال'], ['facade', 'واجهة'], ['linear', 'أطوال'], ['manual', 'يدوي']];
  const DEDUCT_OPTS = Object.keys(E.DEDUCT_MODES).map(k => [k, E.DEDUCT_MODES[k]]);

  function shapeRows(R, list, U2, label) {
    return (list || []).map((s, i) => {
      const def = E.SHAPES[s.type] || E.SHAPES.rect;
      const base = `${R}.${i}`;
      const one = E.shapeArea(s, U2 === 'سم' ? 'cm' : 'm') * (s.count === '' || s.count == null ? 1 : E.n(s.count));
      return `<div class="sub-card">
        <div class="sub-head">
          <select data-bind="${base}.type" data-re="1" style="flex:1.2">${Object.keys(E.SHAPES).map(k => `<option value="${k}"${k === s.type ? ' selected' : ''}>${esc(E.SHAPES[k].name)}</option>`).join('')}</select>
          <select data-bind="${base}.sign" data-t="int" data-re="1" style="flex:.8"><option value="1"${s.sign != -1 ? ' selected' : ''}>+ إضافة</option><option value="-1"${s.sign == -1 ? ' selected' : ''}>− خصم</option></select>
          <span class="val">${s.sign == -1 ? '−' : ''}${fq(one)} م²</span>
          <button type="button" class="x-btn" data-act="delRow" data-spec="${R}" data-i="${i}" aria-label="حذف">${icon('trash')}</button>
        </div>
        <div class="row-4">
          ${def.f.map((f, j) => mini(`${base}.${f}`, def.labels[j] + (def.raw ? '' : ' (' + U2 + ')'))).join('')}
          ${mini(`${base}.count`, 'العدد')}
          ${def.f.length < 3 ? `<div class="${def.f.length === 1 ? 'span-2' : ''}">${mini(`${base}.name`, 'الوصف', { text: true, ph: label || 'اختياري' })}</div>` : ''}
        </div>
      </div>`;
    }).join('');
  }

  function measureEditor(R, m, opts) {
    opts = opts || {};
    const U2 = m.unit === 'cm' ? 'سم' : 'م';
    let h = seg(R + '.mode', MODES, m.mode) + seg(R + '.unit', [['m', 'الأبعاد بالمتر'], ['cm', 'الأبعاد بالسنتيمتر']], m.unit);
    if (m.mode === 'room') {
      h += `<div class="row-4">${mini(R + '.room.l', 'الطول ' + U2)}${mini(R + '.room.w', 'العرض ' + U2)}${mini(R + '.room.h', 'الارتفاع ' + U2)}${mini(R + '.room.count', 'عدد الغرف')}</div>
        <div class="row-2">${sw(R + '.room.walls', 'حساب الحوائط', false)}${sw(R + '.room.ceiling', 'حساب السقف', false)}</div>`;
    } else if (m.mode === 'shapes') {
      h += `<div class="hint mb">قسّم المساحات غير المنتظمة لأشكال هندسية (مستطيل، مثلث، شبه منحرف، دائرة، أعمدة، كمرات...) والتطبيق يجمعها.</div>`
        + shapeRows(R + '.shapes', m.shapes, U2)
        + `<button type="button" class="add-line" data-act="addRow" data-spec="${R}.shapes" data-tpl="shape">${icon('plus')} إضافة شكل / حائط</button>`;
    } else if (m.mode === 'facade') {
      const f = m.facade || {};
      const custom = Array.isArray(f.floorList) && f.floorList.length;
      h += `<div class="row-2">${inp(R + '.facade.width', 'عرض الواجهة (' + U2 + ')')}${inp(R + '.facade.count', 'عدد الواجهات المتماثلة', { ph: '1' })}</div>`;
      if (custom) {
        h += f.floorList.map((fl, i) => `<div class="sub-card"><div class="row-3" style="align-items:end">
            ${mini(`${R}.facade.floorList.${i}.name`, 'الدور', { text: true, ph: 'الدور ' + (i + 1) })}${mini(`${R}.facade.floorList.${i}.h`, 'الارتفاع ' + U2)}
            <div style="display:flex;justify-content:flex-end"><button type="button" class="x-btn" data-act="delRow" data-spec="${R}.facade.floorList" data-i="${i}">${icon('trash')}</button></div></div></div>`).join('')
          + `<button type="button" class="add-line" data-act="addRow" data-spec="${R}.facade.floorList" data-tpl="floor">${icon('plus')} إضافة دور</button>
             <button type="button" class="add-line" data-act="facadeUniform" data-spec="${R}.facade">كل الأدوار بنفس الارتفاع</button>`;
      } else {
        h += `<div class="row-2">${inp(R + '.facade.floors', 'عدد الأدوار')}${inp(R + '.facade.floorH', 'ارتفاع الدور (' + U2 + ')')}</div>
          <button type="button" class="add-line" data-act="facadeCustom" data-spec="${R}.facade">${icon('list')} ارتفاع مختلف لكل دور</button>`;
      }
      h += `<div class="mt">${inp(R + '.facade.extraH', 'ارتفاع إضافي: دروة / روف / أرضي مرتفع (' + U2 + ')', { ph: '0' })}</div>`;
    } else if (m.mode === 'linear') {
      h += `<div class="hint mb">للكرانيش والبراويز والفواصل والشروخ: اكتب الأطوال، ولو عايز تحسب الخامات بالمسطح اكتب «التنمية» (العرض المفرود للكرنيشة).</div>`
        + (m.linear || []).map((l, i) => `<div class="sub-card"><div class="row-4" style="align-items:end">
            <div class="span-2">${mini(`${R}.linear.${i}.name`, 'الوصف', { text: true, ph: 'كرنيشة الدور ' + (i + 1) })}</div>${mini(`${R}.linear.${i}.len`, 'الطول ' + U2)}${mini(`${R}.linear.${i}.count`, 'العدد')}
          </div><div style="text-align:left;margin-top:6px"><button type="button" class="x-btn" style="display:inline-grid" data-act="delRow" data-spec="${R}.linear" data-i="${i}">${icon('trash')}</button></div></div>`).join('')
        + `<button type="button" class="add-line" data-act="addRow" data-spec="${R}.linear" data-tpl="linear">${icon('plus')} إضافة طول</button>
           <div class="mt">${inp(R + '.girth', 'التنمية / العرض المفرود (سم) — اختياري', { hint: 'مثال: كرنيشة تنميتها 45 سم × 52 م.ط = 23.4 م²' })}</div>`;
    } else {
      h += `<div class="row-2">${inp(R + '.manual.area', 'المساحة (م²)')}${inp(R + '.manual.linear', 'الطول (م.ط) — اختياري')}</div>`;
    }

    if (m.mode !== 'linear' && m.mode !== 'manual' && opts.openings !== false) {
      const rules = m.rules || {};
      h += `<div class="group-h"><b>الفتحات (أبواب وشبابيك)</b></div>
        <div class="row-2">${sel(R + '.rules.mode', 'قاعدة خصم الفتحات (حسب الاتفاق)', DEDUCT_OPTS, { re: true, cls: rules.mode === 'above' || rules.mode === 'excess' || rules.mode === 'percent' ? '' : 'span-all' })}
        ${rules.mode === 'above' || rules.mode === 'excess' ? inp(R + '.rules.threshold', 'الحد (م²)') : rules.mode === 'percent' ? inp(R + '.rules.percent', 'نسبة الخصم %') : ''}</div>`
        + (m.openings || []).map((o, i) => {
          const b = `${R}.openings.${i}`;
          return `<div class="sub-card"><div class="sub-head"><input type="text" data-bind="${b}.name" value="${esc(o.name || '')}" placeholder="اسم الفتحة"><button type="button" class="x-btn" data-act="delRow" data-spec="${R}.openings" data-i="${i}">${icon('trash')}</button></div>
            <div class="row-3">${mini(b + '.w', 'العرض ' + U2)}${mini(b + '.h', 'الارتفاع ' + U2)}${mini(b + '.count', 'العدد')}</div>
            <div class="row-3" style="margin-top:6px">
              <div><span class="mini-label">الخصم</span><select data-bind="${b}.deduct"><option value="auto"${(o.deduct || 'auto') === 'auto' ? ' selected' : ''}>حسب القاعدة</option><option value="yes"${o.deduct === 'yes' ? ' selected' : ''}>يُخصم</option><option value="no"${o.deduct === 'no' ? ' selected' : ''}>لا يُخصم</option></select></div>
              <div><span class="mini-label">الأكتاف المنفذة</span><select data-bind="${b}.reveal" data-re="1"><option value="none"${(o.reveal || 'none') === 'none' ? ' selected' : ''}>بدون</option><option value="door"${o.reveal === 'door' ? ' selected' : ''}>جانبين + أعلى</option><option value="window"${o.reveal === 'window' ? ' selected' : ''}>4 جوانب</option><option value="sides"${o.reveal === 'sides' ? ' selected' : ''}>جانبين فقط</option></select></div>
              ${o.reveal && o.reveal !== 'none' ? mini(b + '.depth', 'عمق الكتف سم') : '<div></div>'}
            </div></div>`;
        }).join('')
        + `<div class="btn-row three mt" style="margin-bottom:6px">
            <button type="button" class="btn btn-ghost btn-sm" style="width:100%" data-act="addRow" data-spec="${R}.openings" data-tpl="opening" data-k="door">+ باب</button>
            <button type="button" class="btn btn-ghost btn-sm" style="width:100%" data-act="addRow" data-spec="${R}.openings" data-tpl="opening" data-k="window">+ شباك</button>
            <button type="button" class="btn btn-ghost btn-sm" style="width:100%" data-act="addRow" data-spec="${R}.openings" data-tpl="opening" data-k="other">+ فتحة</button></div>`;
      h += `<div class="group-h"><b>إضافات وخصومات (أكتاف، جوانب، بروزات، أجزاء غائرة)</b></div>`
        + shapeRows(R + '.additions', m.additions, U2, 'مثال: جوانب البلكونة')
        + `<button type="button" class="add-line" data-act="addRow" data-spec="${R}.additions" data-tpl="addition">${icon('plus')} إضافة / خصم مساحة</button>`;
    }
    h += `<div id="${opts.outId || 'measureOut'}" class="mt"></div>`;
    return h;
  }

  function measureSummary(r) {
    const rows = r.lines.map(l => `<div class="kv-row${l.v < 0 ? ' minus' : ''}"><span>${esc(l.k)}</span><strong class="num">${fq(l.v)} ${esc(l.u)}</strong></div>`).join('');
    return `<div class="kv">${rows}</div><div class="total-bar"><span>صافي المساحة</span><strong class="num">${fq(r.area)} م²${r.linear ? ` · ${fq(r.linear)} م.ط` : ''}</strong></div>`;
  }

  /* ================= محررات الخامات ================= */
  function matOptions(filter, curId) {
    const mats = S.db().materials.filter(filter || (() => true));
    return `<option value="">— بدون ربط بالمخزن —</option>` + mats.map(m => `<option value="${m.id}"${m.id === curId ? ' selected' : ''}>${esc(m.name)}${m.brand ? ' - ' + esc(m.brand) : ''}${m.buyPrice !== '' && m.buyPrice != null ? ' (' + U.fmt(m.buyPrice) + ')' : ''}</option>`).join('');
  }
  function linkSel(spec, kind, curId, filter, label) {
    return `<div class="field"><label>${esc(label || 'الخامة من المخزن (يملأ السعر والعبوة تلقائياً)')}</label><select data-link="${esc(spec)}" data-kind="${kind}">${matOptions(filter, curId)}</select></div>`;
  }
  // نسخ بيانات خامة المخزن لمعاملات الحساب
  function applyLink(spec, kind, matId) {
    const r = { obj: U.BIND_ROOTS[spec.split(':')[0]](), path: spec.split(':')[1] };
    const p = U.getPath(r.obj, r.path);
    if (!p) return;
    const m = S.material(matId);
    const has = v => v !== '' && v != null;
    if (kind === 'cement') { p.cementId = m ? m.id : null; if (m) { p.cementName = m.name; if (has(m.buyPrice)) p.cementPrice = m.buyPrice; p.cementSell = has(m.sellPrice) ? m.sellPrice : ''; if (m.packSize) p.bagKg = m.packSize; } }
    else if (kind === 'sand') { p.sandId = m ? m.id : null; if (m) { p.sandName = m.name; if (has(m.buyPrice)) p.sandPrice = m.buyPrice; p.sandSell = has(m.sellPrice) ? m.sellPrice : ''; } }
    else {
      p.materialId = m ? m.id : null;
      if (!m) return;
      p.name = m.name + (m.brand ? ' - ' + m.brand : '');
      if (has(m.buyPrice)) p.price = m.buyPrice;
      p.sell = has(m.sellPrice) ? m.sellPrice : '';
      if (kind === 'premix') { if (m.packSize) p.bagKg = m.packSize; if (has(m.kgPerMm)) p.kgPerMm = m.kgPerMm; }
      if (kind === 'coverage') {
        if (m.packSize) p.packSize = m.packSize;
        if (m.packUnit === 'لتر' || m.packUnit === 'كجم') p.unit = m.packUnit;
        p.packName = m.unit || p.packName;
        if (m.rateMode && has(m.rate)) { p.rateMode = m.rateMode; p.rate = m.rate; }
      }
      if (kind === 'mesh' && m.packSize) p.rollArea = m.packSize;
      if (kind === 'extra') p.unit = m.unit || p.unit;
    }
  }
  document.addEventListener('change', ev => {
    const el = ev.target.closest('[data-link]');
    if (!el) return;
    applyLink(el.dataset.link, el.dataset.kind, el.value);
    S.save();
    U.rerender();
  });

  function factorSel(spec, label, list) {
    const v = bv(spec);
    const opts = list.map(f => [f.v, f.name + ' (×' + f.v + ')']);
    if (!list.some(f => String(f.v) === String(v)) && v !== '' && v != null) opts.push([v, 'معامل مخصص ×' + v]);
    return sel(spec, label, opts);
  }

  function cementForm(R, c) {
    return seg(R + '.method', [['ratio', 'نسبة خلط حجمية 1 : ن'], ['content', 'كجم أسمنت لكل م³ رمل']], c.method || 'ratio')
      + `<div class="row-3">${mini(R + '.thickness', 'سمك الطبقة مم')}${mini(R + '.layers', 'عدد الطبقات')}${mini(R + '.waste', 'الهالك %')}</div>`
      + (c.method === 'content'
        ? `<div class="row-3" style="margin-top:8px">${mini(R + '.content', 'كجم أسمنت/م³ رمل')}${mini(R + '.sandPerM3', 'م³ رمل لكل م³ مونة')}${mini(R + '.bagKg', 'وزن الشيكارة كجم')}</div>`
        : `<div class="row-4" style="margin-top:8px">${mini(R + '.ratio', 'رمل لكل 1 أسمنت')}${mini(R + '.dryFactor', 'معامل الجاف')}${mini(R + '.density', 'كثافة الأسمنت')}${mini(R + '.bagKg', 'وزن الشيكارة')}</div>`)
      + `<div class="hint">معامل الجاف = تحويل حجم المونة الرطبة لحجم المواد الجافة (قيمة استرشادية شائعة 1.27 — عدّلها حسب خبرتك).</div>`
      + `<div class="group-h"><b>الأسعار</b></div>`
      + linkSel(R, 'cement', c.cementId, m => m.category === 'أسمنت' || m.kind === 'cement', 'الأسمنت من المخزن')
      + linkSel(R, 'sand', c.sandId, m => m.category === 'رمل' || m.kind === 'sand', 'الرمل من المخزن')
      + `<div class="row-2">${inp(R + '.cementPrice', 'سعر شيكارة الأسمنت (شراء)')}${inp(R + '.sandPrice', 'سعر م³ الرمل (شراء)')}${inp(R + '.cementSell', 'سعر البيع للعميل — اختياري')}${inp(R + '.sandSell', 'سعر بيع الرمل — اختياري')}</div>`;
  }
  function premixForm(R, p) {
    return linkSel(R, 'premix', p.materialId, m => m.kind === 'premix' || m.category === 'محارة جاهزة' || m.category === 'جبس')
      + `<div class="field"><label>اسم المنتج</label><input type="text" data-bind="${R}.name" value="${esc(p.name || '')}"></div>`
      + `<div class="row-3">${mini(R + '.thickness', 'السمك مم')}${mini(R + '.layers', 'الطبقات')}${mini(R + '.kgPerMm', 'كجم/م²/مم')}</div>
         <div class="hint">الاستهلاك (كجم لكل م² لكل 1 مم) مكتوب على الشيكارة أو في نشرة الشركة المصنعة.</div>
         <div class="row-3" style="margin-top:8px">${mini(R + '.bagKg', 'وزن الشيكارة')}${mini(R + '.waste', 'الهالك %')}${mini(R + '.price', 'سعر الشيكارة')}</div>
         <div class="mt">${inp(R + '.sell', 'سعر البيع للعميل — اختياري')}</div>`;
  }
  function coverageForm(R, p, opts) {
    opts = opts || {};
    const rm = p.rateMode || 'perM2';
    const uu = p.unit || 'كجم';
    const rateLbl = rm === 'perM2' ? uu + ' لكل م²/طبقة' : rm === 'm2PerUnit' ? 'م² لكل 1 ' + uu : 'م² لكل عبوة';
    return linkSel(R, 'coverage', p.materialId, opts.filter)
      + `<div class="field"><label>اسم الخامة / المنتج</label><input type="text" data-bind="${R}.name" value="${esc(p.name || '')}"></div>`
      + seg(R + '.rateMode', [['perM2', 'استهلاك لكل م²'], ['m2PerUnit', 'تغطية م² لكل وحدة'], ['m2PerPack', 'تغطية م² لكل عبوة']], rm)
      + `<div class="row-3">${mini(R + '.rate', rateLbl)}${mini(R + '.coats', 'عدد الطبقات')}${mini(R + '.waste', 'الهالك %')}</div>
         <div class="row-3" style="margin-top:8px">${mini(R + '.packSize', 'حجم العبوة')}
           <div><span class="mini-label">الوحدة</span><select data-bind="${R}.unit" data-re="1"><option${uu === 'كجم' ? ' selected' : ''}>كجم</option><option${uu === 'لتر' ? ' selected' : ''}>لتر</option></select></div>
           ${mini(R + '.packName', 'اسم العبوة', { text: true })}</div>
         <div class="row-2" style="margin-top:8px">${factorSel(R + '.surface', 'حالة السطح', C.SURFACE_FACTORS)}${factorSel(R + '.level', 'درجة التسوية', C.LEVEL_FACTORS)}</div>
         <div class="row-2">${inp(R + '.price', 'سعر العبوة (شراء)')}${inp(R + '.sell', 'سعر البيع للعميل — اختياري')}</div>`;
  }
  function meshForm(R, p) {
    return linkSel(R, 'mesh', p.materialId, m => m.kind === 'mesh' || m.category === 'شبك فايبر')
      + seg(R + '.mode', [['area', 'على المساحة'], ['strip', 'شرائط على الأطوال']], p.mode || 'area')
      + `<div class="row-4">${p.mode === 'strip' ? mini(R + '.stripWidth', 'عرض الشريحة سم') : mini(R + '.coverPct', '% من المساحة')}${mini(R + '.overlap', 'تراكب %')}${mini(R + '.rollArea', 'م² في اللفة')}${mini(R + '.price', 'سعر اللفة')}</div>`;
  }
  function extrasForm(R, list) {
    return (list || []).map((x, i) => {
      const b = `${R}.${i}`;
      return `<div class="sub-card"><div class="sub-head"><input type="text" data-bind="${b}.name" value="${esc(x.name || '')}" placeholder="اسم الخامة (مثلاً: زاوية محارة)"><button type="button" class="x-btn" data-act="delRow" data-spec="${R}" data-i="${i}">${icon('trash')}</button></div>
        <div class="row-4">
          <div><span class="mini-label">طريقة الكمية</span><select data-bind="${b}.mode"><option value="fixed"${(x.mode || 'fixed') === 'fixed' ? ' selected' : ''}>كمية ثابتة</option><option value="perM2"${x.mode === 'perM2' ? ' selected' : ''}>لكل م²</option><option value="perLm"${x.mode === 'perLm' ? ' selected' : ''}>لكل م.ط</option></select></div>
          ${mini(b + '.qty', 'الكمية')}${mini(b + '.unit', 'الوحدة', { text: true })}${mini(b + '.price', 'سعر الوحدة')}
        </div></div>`;
    }).join('') + `<button type="button" class="add-line" data-act="addRow" data-spec="${R}" data-tpl="extra">${icon('plus')} خامة تكميلية</button>`;
  }

  function calcEditor(R, calc) {
    let h = sel(R + '.type', 'طريقة حساب الخامات', CALC_TYPES, { re: true });
    if (calc.type === 'cement') h += cementForm(R + '.cement', calc.cement || {});
    else if (calc.type === 'premix') h += premixForm(R + '.premix', calc.premix || {});
    else if (calc.type === 'coverage') h += coverageForm(R + '.main', calc.main || {});
    else if (calc.type === 'graffiato') {
      const g = calc.main || {};
      h += `<div class="field"><label>مقاس الحبيبات</label><div class="chips wrap">${['خشن', 'متوسط', 'ناعم', 'أخرى'].map(x => `<button type="button" class="chip${calc.grain === x ? ' on' : ''}" data-act="setv" data-spec="${R}.grain" data-v="${x}">${x}</button>`).join('')}</div></div>
        <div class="row-2">${inp(R + '.color', 'اللون / الكود', { text: true, ph: 'مثال: بيج 102' })}${inp(R + '.brand', 'الشركة المصنعة', { text: true })}</div>
        <div class="group-h"><b>طبقة الجرافيت</b></div>` + coverageForm(R + '.main', g, { filter: m => m.category === 'جرافيت' })
        + `<div class="group-h"><b>البرايمر / الطبقة التأسيسية</b></div>` + sw(R + '.primerOn', 'حساب البرايمر')
        + (calc.primerOn !== false ? coverageForm(R + '.primer', calc.primer || {}, { filter: m => m.category === 'برايمر' || m.category === 'مواد التأسيس' }) : '')
        + `<div class="hint">لا يوجد معدل استهلاك موحد للجرافيت: يختلف حسب الشركة ومقاس الحبيبات وطريقة التنفيذ. اكتب المعدل من نشرة المنتج.</div>`;
    } else if (calc.type === 'mesh') h += meshForm(R + '.mesh', calc.mesh || {});
    if (calc.type !== 'graffiato' && calc.type !== 'none') {
      h += `<div class="group-h"><b>طبقات إضافية</b></div>` + sw(R + '.secondOn', 'طبقة إضافية (برايمر / أساس / سيلر)');
      if (calc.secondOn) h += coverageForm(R + '.second', calc.second || {});
      if (calc.type !== 'mesh') { h += sw(R + '.meshOn', 'إضافة شبك'); if (calc.meshOn) h += meshForm(R + '.mesh', calc.mesh || {}); }
    }
    h += `<div class="group-h"><b>خامات تكميلية (زوايا، شرائط، مواد شروخ...)</b></div>` + extrasForm(R + '.extras', calc.extras);
    h += `<div id="matOut" class="mt"></div>`;
    return h;
  }

  function materialsList(res, withPrices) {
    if (!res.materials.length) return `<div class="note">لا توجد خامات محسوبة لهذا البند${res.withMat === false ? '' : ''}.</div>`;
    const rows = res.materials.map(m => `<div class="mat-line"><div class="ml-info"><div class="ml-name">${esc(m.name)}</div>
        <div class="ml-meta">الكمية الصافية ${fq(m.qty)} ${esc(m.unit)}${withPrices !== false && m.price ? ` · ${U.fmt(m.price)} للوحدة · تكلفة ${U.fmt(m.cost)}` : ''}</div></div>
        <div class="ml-qty num">${fq(m.packs)}<small>${esc(m.packUnit)}</small></div></div>`).join('');
    const notes = (res.notes || []).concat(res.raw && res.raw.main ? [`المساحة القابلة للتنفيذ بالعبوات المحسوبة ≈ ${fq(res.raw.main.executable, 1)} م² (${fq(res.raw.main.perPackArea, 1)} م² للعبوة)`] : [])
      .concat(res.raw && res.raw.executable && !res.raw.main ? [`المساحة القابلة للتنفيذ بالعبوات المحسوبة ≈ ${fq(res.raw.executable, 1)} م²`] : []);
    return `<div>${rows}</div>${notes.length ? `<div class="assume"><b>الافتراضات:</b> ${notes.map(esc).join(' · ')}</div>` : ''}`;
  }

  /* ================= صفحة البند ================= */
  function workTypeOptions(curKey) {
    return Object.keys(C.SECTIONS).map(sk => `<optgroup label="${esc(C.SECTIONS[sk].name)}">${C.WORK_TYPES.filter(w => w.section === sk).map(w => `<option value="${w.key}"${w.key === curKey ? ' selected' : ''}>${esc(w.name)}</option>`).join('')}</optgroup>`).join('');
  }

  U.VIEWS.item = {
    parent: (pid) => pid === S.SCRATCH ? ['calc'] : ['project', pid, 'items'],
    render(pid, iid) {
      const p = S.project(pid);
      const it = p && p.items.find(x => x.id === iid);
      if (!it) return { redirect: ['home'] };
      CUR_P = p; CUR_IT = it;
      ensureCalc(it);
      const secName = (C.SECTIONS[it.section] || C.SECTIONS.other).name;
      const locs = C.LOCATIONS[it.section] || [];
      const zoneOpts = [['', '— قياس خاص بالبند —']].concat((p.zones || []).map(z => [z.id, z.name]));
      const zone = it.zoneId ? p.zones.find(z => z.id === it.zoneId) : null;
      const needsMeasure = !['day', 'piece', 'lump'].includes(it.unit) || it.calc.type !== 'none';
      let html = `
      <div class="card">
        <div class="card-title"><div class="t-ic orange">${icon((C.SECTIONS[it.section] || {}).icon || 'list')}</div><h2>نوع العمل</h2><span class="tag">${esc(secName)}</span></div>
        <div class="field"><label>نوع البند</label><select id="wtSel">${workTypeOptions(it.workType)}</select></div>
        <div class="field"><label>اسم البند (يظهر في المقايسة والفاتورة)</label><input type="text" data-bind="it:title" value="${esc(it.title)}"></div>
        ${locs.length ? `<div class="chips">${locs.map(l => `<button type="button" class="chip${it.location === l ? ' on' : ''}" data-act="setv" data-spec="it:location" data-v="${esc(l)}">${esc(l)}</button>`).join('')}</div>` : ''}
        <div class="row-2">${inp('it:location', 'المكان / الموقع', { text: true, ph: 'مثال: حوائط الصالة' })}${sel('it:phase', 'المرحلة', C.PHASES.map(x => [x.key, x.name]))}</div>
      </div>`;
      if (needsMeasure) {
        html += `<div class="card">
          <div class="card-title"><div class="t-ic">${icon('ruler')}</div><h2>القياس والمساحة</h2></div>
          ${(p.zones || []).length ? sel('it:zoneId', 'المنطقة / المكان من المشروع', zoneOpts, { re: true }) : ''}
          ${zone ? `<div class="note mb">البند بيستخدم قياس «<b>${esc(zone.name)}</b>». أي تعديل في قياس المنطقة يتطبق على كل بنودها.</div>
              <div class="row-2">${sel('it:qtySource', 'الكمية من', [['area', 'صافي المساحة'], ['walls', 'الحوائط فقط'], ['ceiling', 'السقف فقط']], {})}${inp('it:areaPct', 'نسبة من المساحة %', { ph: '100' })}</div>
              <button type="button" class="btn btn-soft" data-act="openZone" data-pid="${p.id}" data-zid="${zone.id}">${icon('edit')} تعديل قياس المنطقة</button><div id="measureOut" class="mt"></div>`
            : measureEditor('it:measure', it.measure)}
        </div>`;
      }
      html += `<div class="card">
          <div class="card-title"><div class="t-ic violet">${icon('box')}</div><h2>الخامات والكميات</h2></div>
          ${calcEditor('it:calc', it.calc)}
        </div>
        <div class="card">
          <div class="card-title"><div class="t-ic green">${icon('cash')}</div><h2>طريقة المحاسبة والمصنعية</h2></div>
          ${sel('it:unit', 'طريقة المحاسبة', UNIT_OPTS, { re: true })}
          <div class="field"><label>نوع التعاقد على البند</label>${seg('it:supply', SUPPLY_OPTS, it.supply || 'labor')}</div>
          <div class="row-2">
            ${it.supply !== 'supply' ? inp('it:laborRate', 'سعر المصنعية لكل ' + (E.BILLING_UNITS[it.unit] || {}).short) : ''}
            ${['day', 'piece', 'lump'].includes(it.unit) || it.useManual ? inp('it:qtyManual', it.unit === 'day' ? 'عدد الأيام' : it.unit === 'lump' ? 'الكمية (مقطوعية = 1)' : 'الكمية', { ph: it.unit === 'lump' ? '1' : '' }) : ''}
            ${it.supply !== 'labor' ? inp('it:matMarkup', 'هامش ربح الخامات %', { hint: 'يُستخدم فقط لو سعر البيع فاضي' }) : ''}
            ${inp('it:progress', 'نسبة التنفيذ % (للمستخلص)', { ph: '0' })}
          </div>
          ${['day', 'piece', 'lump'].includes(it.unit) ? '' : sw('it:useManual', 'كتابة الكمية يدوياً بدل القياس')}
          <div class="field"><label>ملاحظات البند</label><textarea data-bind="it:notes" placeholder="تظهر في المقايسة">${esc(it.notes || '')}</textarea></div>
        </div>
        <div class="card result"><div class="card-title"><div class="t-ic orange">${icon('calc')}</div><h2>نتيجة البند</h2></div><div id="itemRes"></div></div>
        <div class="btn-row"><button type="button" class="btn btn-ghost" data-act="dupItem">${icon('copy')} تكرار البند</button><button type="button" class="btn btn-danger" data-act="delItem">${icon('trash')} حذف البند</button></div>`;
      const actions = [];
      if (p.scratch) actions.push({ icon: 'save', act: 'moveToProject', accent: true, label: 'حفظ في مشروع' });
      return {
        title: it.title || 'بند', sub: p.scratch ? 'حاسبة سريعة' : p.name, html, actions,
        bar: `<div class="eb-info"><span>إجمالي البند</span><strong id="ebTotal">0</strong><small id="ebSub"></small></div><button type="button" class="btn btn-accent" data-act="back">${icon('check')} تم</button>`,
        after(root) {
          const w = root.querySelector('#wtSel');
          w.onchange = () => changeWorkType(it, w.value);
        }
      };
    },
    live() {
      if (!CUR_IT) return;
      const r = itemRes(CUR_P, CUR_IT);
      const mo = document.getElementById('measureOut');
      if (mo) mo.innerHTML = measureSummary(r.measure);
      const mat = document.getElementById('matOut');
      if (mat) mat.innerHTML = materialsList(r);
      const box = document.getElementById('itemRes');
      if (box) box.innerHTML = itemResultHtml(r);
      const t = document.getElementById('ebTotal');
      if (t) { t.innerHTML = money(r.total); document.getElementById('ebSub').textContent = `${fq(r.qty)} ${r.unitShort}${r.qty ? ' × ' + U.fmt(r.unitPrice) : ''}`; }
    }
  };

  function itemResultHtml(r) {
    const rows = [
      ['الكمية المحاسب عليها', `${fq(r.qty)} ${r.unitShort}`],
      r.area !== r.qty || r.unit !== 'm2' ? ['مساحة حساب الخامات', `${fq(r.matArea)} م²`] : null,
      r.raw && r.raw.wetVolume ? ['حجم المحارة', `${fq(r.raw.wetVolume, 3)} م³`] : null,
      r.raw && r.raw.bags != null && r.raw.cementKg != null ? ['الأسمنت', `${fq(r.raw.cementKg, 1)} كجم = ${r.raw.bags} شيكارة`] : null,
      r.raw && r.raw.sandM3 != null ? ['الرمل', `${fq(r.raw.sandM3, 2)} م³`] : null,
      ['قيمة المصنعية', U.moneyT(r.labor)],
      r.withMat ? ['قيمة الخامات (للعميل)', U.moneyT(r.matSell)] : null,
      r.withMat ? ['تكلفة الخامات عليك', U.moneyT(r.matCost)] : null,
      !r.withMat && r.matCostClient ? ['خامات على العميل (تقديري)', U.moneyT(r.matCostClient)] : null,
      r.qty ? ['سعر الوحدة شامل', U.moneyT(r.unitPrice)] : null,
      r.progress ? ['قيمة المنفذ (' + fq(r.progress, 0) + '%)', U.moneyT(r.doneValue)] : null
    ].filter(Boolean);
    const noPrice = r.materials.filter(m => !m.price && m.packs > 0).map(m => m.name);
    return `<div class="kv">${rows.map(x => `<div class="kv-row"><span>${esc(x[0])}</span><strong class="num">${esc(x[1])}</strong></div>`).join('')}</div>
      ${noPrice.length ? `<div class="note orange mt"><b>تنبيه:</b> خامات بدون سعر (محسوبة بصفر): ${noPrice.map(esc).join('، ')}. اكتب السعر هنا أو في المخزن.</div>` : ''}
      ${!r.qty && r.unit !== 'lump' ? `<div class="note orange mt"><b>تنبيه:</b> الكمية صفر — راجع القياس أو اكتب الكمية يدوياً.</div>` : ''}
      <div class="total-bar"><span>إجمالي البند</span><strong>${money(r.total)}</strong></div>`;
  }

  function changeWorkType(it, key) {
    const wt = C.workType(key);
    const oldWt = C.workType(it.workType);
    if (!it.title || it.title === oldWt.name) it.title = wt.name;
    it.workType = wt.key; it.section = wt.section; it.phase = wt.phase; it.unit = wt.unit;
    it.qtySource = wt.qtySource || 'area';
    it.calc = S.newCalc(wt);
    if (!it.zoneId && wt.measureMode && it.measure.mode !== wt.measureMode && isMeasureEmpty(it.measure)) it.measure.mode = wt.measureMode;
    S.save(); U.rerender();
  }
  function isMeasureEmpty(m) { return E.measureCalc(m).area === 0 && E.measureCalc(m).linear === 0; }

  /* ================= صفحة المنطقة / الواجهة ================= */
  U.VIEWS.zone = {
    parent: (pid) => pid === S.SCRATCH ? ['calc'] : ['project', pid, 'zones'],
    render(pid, zid) {
      const p = S.project(pid);
      const z = p && p.zones.find(x => x.id === zid);
      if (!z) return { redirect: ['home'] };
      CUR_P = p; CUR_Z = z;
      const items = p.items.filter(i => i.zoneId === z.id);
      const zm = E.measureCalc(z.measure);
      const kinds = Object.keys(C.ZONE_KINDS).map(k => [k, C.ZONE_KINDS[k].name]);
      let html = `<div class="card">
        <div class="card-title"><div class="t-ic orange">${icon('map')}</div><h2>بيانات المنطقة</h2></div>
        <div class="row-2">${inp('zn:name', 'اسم المنطقة', { text: true })}${sel('zn:kind', 'النوع', kinds)}</div>
        <div class="field"><label>اللون المميز (للواجهات متعددة الألوان)</label><div class="chips wrap">${C.ZONE_COLORS.map(c => `<button type="button" class="chip" data-act="setv" data-spec="zn:color" data-v="${c}" style="${z.color === c ? 'outline:3px solid ' + c + ';' : ''}"><span class="dot-c" style="background:${c}"></span></button>`).join('')}</div></div>
        ${inp('zn:finish', 'نوع التشطيب / اللون المطلوب', { text: true, ph: 'مثال: جرافيت بيج خشن' })}
      </div>
      <div class="card"><div class="card-title"><div class="t-ic">${icon('ruler')}</div><h2>القياس</h2></div>${measureEditor('zn:measure', z.measure, { outId: 'zoneOut' })}</div>
      <div class="section-head"><h3>بنود هذه المنطقة<span class="count">${items.length}</span></h3></div>
      <div id="zoneItems">${items.map((it, i) => itemCard(p, it, itemRes(p, it), i)).join('') || '<div class="empty"><p>لسه مفيش بنود على المنطقة دي. أضف بند أو اختار نظام تشطيب جاهز.</p></div>'}</div>
      <div class="btn-row"><button type="button" class="btn btn-accent" data-act="addItem" data-pid="${p.id}" data-zid="${z.id}">${icon('plus')} إضافة بند</button>
      <button type="button" class="btn btn-soft" data-act="applySystem" data-pid="${p.id}" data-zid="${z.id}">${icon('layers')} نظام تشطيب جاهز</button></div>
      <button type="button" class="btn btn-danger mt" data-act="delZone" data-pid="${p.id}" data-zid="${z.id}">${icon('trash')} حذف المنطقة</button>`;
      const actions = p.scratch && items.length ? [{ icon: 'save', act: 'moveZoneToProject', accent: true, label: 'حفظ في مشروع' }] : [];
      return {
        title: z.name || 'منطقة', sub: p.scratch ? 'حاسبة سريعة' : p.name, html, actions,
        bar: `<div class="eb-info"><span>صافي مساحة المنطقة</span><strong id="ebTotal">${fq(zm.area)} م²</strong><small id="ebSub"></small></div><button type="button" class="btn btn-accent" data-act="back">${icon('check')} تم</button>`
      };
    },
    live() {
      if (!CUR_Z) return;
      const r = E.measureCalc(CUR_Z.measure);
      const o = document.getElementById('zoneOut');
      if (o) o.innerHTML = measureSummary(r);
      const t = document.getElementById('ebTotal');
      if (t) t.textContent = `${fq(r.area)} م²`;
      const items = CUR_P.items.filter(i => i.zoneId === CUR_Z.id);
      const tot = items.reduce((s, it) => s + itemRes(CUR_P, it).total, 0);
      const sub = document.getElementById('ebSub');
      if (sub) sub.innerHTML = items.length ? `${items.length} بند · ${U.moneyT(tot)}` : (r.linear ? fq(r.linear) + ' م.ط' : '');
    }
  };

  function itemCard(p, it, r, i) {
    const z = it.zoneId ? (p.zones || []).find(x => x.id === it.zoneId) : null;
    return `<button type="button" class="item-card" data-act="openItem" data-pid="${p.id}" data-iid="${it.id}">
      <span class="i-num"${z ? ` style="background:${z.color}22;color:${z.color}"` : ''}>${i + 1}</span>
      <span class="i-info"><span class="i-name">${esc(it.title)}</span>
        <span class="i-meta">${[z ? z.name : '', it.location, `${fq(r.qty)} ${r.unitShort}`, E.SUPPLY_MODES[it.supply] || ''].filter(Boolean).map(esc).join(' · ')}${E.n(it.progress) ? ` · <b>${fq(it.progress, 0)}%</b>` : ''}</span></span>
      <span class="i-amt">${money(r.total)}<small>${r.qty ? U.fmt(r.unitPrice) + ' / ' + esc(r.unitShort) : ''}</small></span></button>`;
  }

  /* ================= إجراءات المحررات ================= */
  function addItemTo(p, wtKey, zoneId) {
    const wt = C.workType(wtKey);
    const it = S.newItem(wtKey, zoneId ? { zoneId } : {});
    if (zoneId) {
      const z = p.zones.find(x => x.id === zoneId);
      if (z) it.location = z.name;
      if (wt.measureMode === 'linear' && z && z.measure.mode !== 'linear') { it.zoneId = ''; it.measure = S.newMeasure('linear'); }
    }
    p.items.push(it);
    S.save();
    return it;
  }
  function pickWorkType(onPick, sectionFirst) {
    const secs = Object.keys(C.SECTIONS);
    const showSection = sk => U.optionSheet(C.SECTIONS[sk].name, C.WORK_TYPES.filter(w => w.section === sk).map(w => ({ v: w.key, label: w.name, sub: (E.BILLING_UNITS[w.unit] || {}).name, icon: C.SECTIONS[sk].icon, cls: 'orange' })), onPick);
    if (sectionFirst) return showSection(sectionFirst);
    U.optionSheet('اختار نوع العمل', secs.map(sk => ({ v: sk, label: C.SECTIONS[sk].name, sub: C.WORK_TYPES.filter(w => w.section === sk).slice(0, 4).map(w => w.name).join('، ') + '...', icon: C.SECTIONS[sk].icon, cls: sk === 'site' ? '' : 'orange' })), sk => setTimeout(() => showSection(sk), 260));
  }

  function moveItemsToProject(items, zones, done) {
    const projects = S.db().projects.filter(p => !p.scratch);
    const opts = [{ v: '__new', label: 'مشروع جديد', sub: 'إنشاء مشروع بالبنود دي', icon: 'plus', cls: 'orange' }]
      .concat(projects.slice().reverse().map(p => ({ v: p.id, label: p.name, sub: (S.client(p.clientId) || {}).name || '', icon: 'folder' })));
    U.optionSheet('حفظ في مشروع', opts, v => {
      const target = v === '__new' ? S.newProject() : S.project(v);
      const scratch = S.project(S.SCRATCH);
      (zones || []).forEach(z => { if (!target.zones.find(x => x.id === z.id)) target.zones.push(z); scratch.zones = scratch.zones.filter(x => x.id !== z.id); });
      items.forEach(it => {
        if (it.zoneId && !target.zones.find(x => x.id === it.zoneId)) {
          const z = scratch.zones.find(x => x.id === it.zoneId);
          if (z) { target.zones.push(z); scratch.zones = scratch.zones.filter(x => x.id !== z.id); }
        }
        target.items.push(it);
        scratch.items = scratch.items.filter(x => x.id !== it.id);
      });
      S.save();
      U.toast('تم الحفظ في «' + target.name + '»');
      done(target);
    });
  }

  Object.assign(U.ACTIONS, {
    openItem(el) { U.go('item', el.dataset.pid, el.dataset.iid); },
    openZone(el) { U.go('zone', el.dataset.pid, el.dataset.zid); },
    addItem(el) {
      const p = S.project(el.dataset.pid);
      pickWorkType(key => { const it = addItemTo(p, key, el.dataset.zid); U.go('item', p.id, it.id); }, el.dataset.sec);
    },
    applySystem(el) {
      const p = S.project(el.dataset.pid);
      U.optionSheet('نظام تشطيب جاهز', C.FACADE_SYSTEMS.map(s => ({ v: s.key, label: s.name, sub: s.items.map(k => C.workType(k).name).join(' ← '), icon: 'layers', cls: 'orange' })), key => {
        const sys = C.FACADE_SYSTEMS.find(s => s.key === key);
        sys.items.forEach(k => addItemTo(p, k, el.dataset.zid));
        U.toast(`تمت إضافة ${sys.items.length} بنود — اكتب سعر المصنعية لكل بند`);
        U.rerender();
      });
    },
    delItem() {
      U.confirmBox('حذف البند «' + CUR_IT.title + '»؟', () => {
        CUR_P.items = CUR_P.items.filter(x => x.id !== CUR_IT.id);
        S.save(); U.toast('تم حذف البند'); U.back();
      }, { yes: 'حذف' });
    },
    dupItem() {
      const c = S.clone(CUR_IT); c.id = S.uid(); c.title = CUR_IT.title + ' (نسخة)';
      CUR_P.items.push(c); S.save(); U.toast('تم تكرار البند'); U.replace('item', CUR_P.id, c.id);
    },
    delZone(el) {
      const p = S.project(el.dataset.pid);
      const z = p.zones.find(x => x.id === el.dataset.zid);
      const n = p.items.filter(i => i.zoneId === z.id).length;
      U.confirmBox(`حذف المنطقة «${z.name}»؟` + (n ? `\nالبنود المرتبطة بها (${n}) هتتحذف كمان.` : ''), () => {
        p.zones = p.zones.filter(x => x.id !== z.id);
        p.items = p.items.filter(i => i.zoneId !== z.id);
        S.save(); U.back();
      }, { yes: 'حذف' });
    },
    facadeCustom(el) {
      const f = U.bv(el.dataset.spec);
      const n = Math.max(1, Math.round(E.n(f.floors)) || 1);
      f.floorList = Array.from({ length: n }, (_, i) => ({ name: i === 0 ? 'الأرضي' : 'الدور ' + i, h: f.floorH || 3 }));
      S.save(); U.rerender();
    },
    facadeUniform(el) {
      const f = U.bv(el.dataset.spec);
      if (f.floorList && f.floorList.length) { f.floors = f.floorList.length; f.floorH = f.floorList[0].h; }
      f.floorList = [];
      S.save(); U.rerender();
    },
    moveToProject() {
      const it = CUR_IT;
      moveItemsToProject([it], [], target => U.replace('item', target.id, it.id));
    },
    moveZoneToProject() {
      const z = CUR_Z, p = CUR_P;
      moveItemsToProject(p.items.filter(i => i.zoneId === z.id), [z], target => U.replace('project', target.id, 'zones'));
    }
  });

  window.Editors = { itemRes, itemCard, measureSummary, materialsList, addItemTo, pickWorkType, moveItemsToProject, zoneMeasures, ensureCalc };
})();
