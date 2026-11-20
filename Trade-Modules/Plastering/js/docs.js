/*
 * HESABATI PLASTER — المستندات: مقايسات، عروض أسعار، فواتير، مستخلصات، إيصالات، كشوف حساب، تقارير
 * المعاينة ورقة A4 حقيقية، والطباعة / حفظ PDF من نظام الجهاز، والمشاركة نصاً على واتساب.
 */
(function () {
  'use strict';
  const U = window.UI, E = U.E, C = U.C, S = U.S, V = window.Views;
  const { esc, fq, fmtDate } = U;
  const M = n => U.fmt(n);
  const sym = () => U.cur().sym;

  function header(docName, no, date) {
    const st = S.db().settings;
    const logo = st.logo && st.showLogo !== false ? `<div class="d-logo"><img src="${esc(st.logo)}" alt=""></div>` : '';
    return `<div class="d-head"><div class="d-brand">${logo}<div><h1 contenteditable="true">${esc(st.bizName || 'حساباتي للمحارة والواجهات')}</h1>
      <p contenteditable="true">${esc(st.bizTitle || '')}${st.bizPhone ? ' · <b>' + esc(st.bizPhone) + '</b>' : ''}${st.bizAddress ? '<br>' + esc(st.bizAddress) : ''}</p></div></div>
      <div class="d-doc"><span class="tag" contenteditable="true">${esc(docName)}</span>${no ? `<span class="d">رقم: <b>${esc(no)}</b></span>` : ''}<span class="d">التاريخ: <b>${esc(fmtDate(date || S.today()))}</b></span></div></div><div class="d-stripe"></div>`;
  }
  function clientBox(p, extra) {
    const c = p ? S.client(p.clientId) : null;
    const f = (l, v, wide) => v ? `<div class="d-field${wide ? ' wide' : ''}"><div class="lbl">${l}</div><div class="val" contenteditable="true">${esc(v)}</div></div>` : '';
    return `<div class="d-client">${f('العميل', c ? c.name : '')}${f('الهاتف', c ? c.phone : '')}${f('المشروع', p ? p.name : '')}${f('العنوان', p ? (p.address || (c && c.address)) : '', true)}${p && p.buildingType ? f('نوع المبنى', p.buildingType + (p.floors ? ' · ' + p.floors + ' أدوار' : '')) : ''}${p && p.facades ? f('الواجهات المطلوبة', p.facades) : ''}${extra || ''}</div>`;
  }
  function footer() {
    const st = S.db().settings;
    return `<div class="d-foot"><span>${esc(st.bizName || '')} ${st.bizPhone ? '· ' + esc(st.bizPhone) : ''}</span><span>تم الإعداد بـ <b>HESABATI PLASTER</b></span></div>`;
  }
  function signs(a, b) { return `<div class="d-sign"><div>${esc(a || 'توقيع المقاول')}</div><div>${esc(b || 'توقيع العميل')}</div></div>`; }
  function totalsBox(rows, netLabel, net) {
    return `<div class="d-totals"><table>${rows.filter(Boolean).map(r => `<tr class="${r[2] || ''}"><td>${esc(r[0])}</td><td>${r[1]}</td></tr>`).join('')}</table>
      <div class="d-net"><span>${esc(netLabel)}</span><strong>${M(net)} ${esc(sym())}</strong></div></div>`;
  }
  function notesBox(title, text) { return text ? `<div class="d-notes" contenteditable="true"><h4>${esc(title)}</h4>${esc(text)}</div>` : '<div></div>'; }
  const docNo = (type, p) => (C.DOC_TYPES[type].prefix || 'DOC') + '-' + String(p ? p.no : 0).padStart(4, '0');

  function waLine(label, val) { return `${label}: ${val}`; }
  function waHead(title, p) {
    const st = S.db().settings;
    const c = p ? S.client(p.clientId) : null;
    return [`*${title}*`, st.bizName ? st.bizName : '', p ? waLine('المشروع', p.name) : '', c ? waLine('العميل', c.name) : '', waLine('التاريخ', fmtDate(S.today())), '—————'].filter(Boolean);
  }

  /* ---------- مقايسة / عرض سعر / فواتير ---------- */
  function boqDoc(type, p) {
    const dt = C.DOC_TYPES[type];
    const r = V.pcalc(p);
    const secs = dt.sections;
    let items = r.items.filter(x => !secs || secs.includes(x.item.section));
    const mode = type === 'inv_labor' ? 'labor' : type === 'inv_supply' ? 'supply' : 'full';
    if (mode === 'labor') items = items.filter(x => x.res.labor > 0);
    let body = '', n = 0, sub = 0;
    const wa = waHead(dt.name, p);
    if (mode === 'supply') {
      const mats = {};
      items.filter(x => x.res.withMat).forEach(x => x.res.materials.forEach(m => {
        const k = m.name + '|' + m.packUnit + '|' + m.sellUnit;
        if (!mats[k]) mats[k] = { name: m.name, packUnit: m.packUnit, sellUnit: m.sellUnit, packs: 0, value: 0 };
        mats[k].packs += m.packs; mats[k].value += m.sellValue;
      }));
      const list = Object.values(mats);
      sub = list.reduce((s, m) => s + m.value, 0);
      body = `<table class="p-table"><thead><tr><th>م</th><th>الخامة</th><th>الكمية</th><th>الوحدة</th><th>السعر</th><th>الإجمالي</th></tr></thead><tbody>
        ${list.map((m, i) => `<tr><td class="idx">${i + 1}</td><td class="t">${esc(m.name)}</td><td>${fq(m.packs)}</td><td>${esc(m.packUnit)}</td><td>${M(m.sellUnit)}</td><td class="m">${M(m.value)}</td></tr>`).join('') || '<tr><td colspan="6">لا توجد خامات موردة (البنود كلها مصنعية فقط)</td></tr>'}
        </tbody><tfoot><tr><td colspan="5">إجمالي الخامات</td><td>${M(sub)}</td></tr></tfoot></table>`;
      list.forEach(m => wa.push(`• ${m.name}: ${fq(m.packs)} ${m.packUnit} = ${M(m.value)}`));
    } else {
      Object.keys(C.SECTIONS).forEach(sk => {
        const g = items.filter(x => x.item.section === sk);
        if (!g.length) return;
        n++;
        const gt = g.reduce((s, x) => s + (mode === 'labor' ? x.res.labor : x.res.total), 0);
        sub += gt;
        wa.push(`*${C.SECTIONS[sk].name}*`);
        body += `<div class="d-sec"><span class="n">${n}</span>${esc(C.SECTIONS[sk].name)}</div>
          <table class="p-table"><thead><tr><th>م</th><th>البند</th><th>الكمية</th><th>الوحدة</th><th>سعر الوحدة</th><th>الإجمالي</th></tr></thead><tbody>
          ${g.map((x, i) => {
            const z = x.item.zoneId ? p.zones.find(zz => zz.id === x.item.zoneId) : null;
            const tot = mode === 'labor' ? x.res.labor : x.res.total;
            const up = x.res.qty ? tot / x.res.qty : 0;
            const meta = [z ? z.name : '', x.item.location && (!z || x.item.location !== z.name) ? x.item.location : '', mode === 'full' ? E.SUPPLY_MODES[x.item.supply] : '', x.item.notes].filter(Boolean).join(' · ');
            wa.push(`• ${x.item.title}${z ? ' (' + z.name + ')' : ''}: ${fq(x.res.qty)} ${x.res.unitShort} × ${M(up)} = ${M(tot)}`);
            return `<tr><td class="idx">${i + 1}</td><td class="t" contenteditable="true">${esc(x.item.title)}${meta ? `<small>${esc(meta)}</small>` : ''}</td><td>${fq(x.res.qty)}</td><td>${esc(x.res.unitShort)}</td><td>${M(up)}</td><td class="m">${M(tot)}</td></tr>`;
          }).join('')}</tbody><tfoot><tr><td colspan="5">إجمالي ${esc(C.SECTIONS[sk].name)}</td><td>${M(gt)}</td></tr></tfoot></table>`;
      });
      if (!body) body = '<div class="d-notes">لا توجد بنود في هذا المستند.</div>';
    }
    const isAll = !secs && mode === 'full';
    const useContract = isAll && p.pricing !== 'items';
    const gross = useContract ? r.contract : sub;
    const disc = isAll ? r.discount : 0;
    const net = Math.max(0, gross - disc);
    const isInv = type.indexOf('inv') === 0;
    const rows = [
      [useContract ? (p.pricing === 'lump' ? 'قيمة المقاولة الكاملة' : 'إجمالي المراحل') : 'الإجمالي', `${M(gross)} ${esc(sym())}`, 'sub'],
      useContract ? ['مجموع البنود (للعلم)', M(sub)] : null,
      disc ? ['الخصم', '− ' + M(disc), 'minus'] : null,
      isInv && isAll ? ['المدفوع', M(r.received), 'paid'] : null
    ];
    const netVal = isInv && isAll ? net - r.received : net;
    const st = S.db().settings;
    const terms = [type === 'quote' ? `صلاحية العرض ${st.quoteValidity || 15} يوم من تاريخه.` : '', st.terms, p.notes].filter(Boolean).join('\n');
    const html = header(dt.name, docNo(type, p), S.today()) + clientBox(p) + body +
      `<div class="d-bottom">${notesBox(type === 'quote' || type.indexOf('boq') === 0 ? 'الشروط والملاحظات' : 'ملاحظات', terms)}${totalsBox(rows, isInv && isAll ? 'المتبقي المطلوب' : 'الإجمالي النهائي', netVal)}</div>` +
      (type.indexOf('boq') === 0 || type === 'quote' ? `<div class="d-assume">الكميات محسوبة من المقاسات المدخلة وقواعد خصم الفتحات المتفق عليها، وتعتبر تقديرية لحين القياس الفعلي على الطبيعة.</div>` : '') +
      signs() + footer();
    wa.push('—————', `الإجمالي: ${M(gross)} ${sym()}`);
    if (disc) wa.push(`الخصم: ${M(disc)}`);
    if (isInv && isAll) wa.push(`المدفوع: ${M(r.received)}`, `*المتبقي: ${M(netVal)} ${sym()}*`);
    else wa.push(`*الصافي: ${M(net)} ${sym()}*`);
    return { title: dt.name + ' - ' + p.name, html, text: wa.join('\n'), phone: (S.client(p.clientId) || {}).phone };
  }

  function certificateDoc(p) {
    const r = V.pcalc(p);
    const wa = waHead('مستخلص أعمال', p);
    const body = `<table class="p-table"><thead><tr><th>م</th><th>البند</th><th>الكمية</th><th>القيمة الكلية</th><th>نسبة التنفيذ</th><th>قيمة المنفذ</th></tr></thead><tbody>
      ${r.items.map((x, i) => `<tr><td class="idx">${i + 1}</td><td class="t">${esc(x.item.title)}<small>${esc(x.item.location || '')}</small></td><td>${fq(x.res.qty)} ${esc(x.res.unitShort)}</td><td>${M(x.res.total)}</td><td>${fq(x.res.progress, 0)}%</td><td class="m">${M(x.res.doneValue)}</td></tr>`).join('')}
      </tbody><tfoot><tr><td colspan="5">إجمالي الأعمال المنفذة (قبل الخصم)</td><td>${M(r.items.reduce((s, x) => s + x.res.doneValue, 0))}</td></tr></tfoot></table>`;
    const rows = [
      ['قيمة التعاقد', M(r.net), 'sub'],
      ['قيمة الأعمال المنفذة', M(r.doneValue)],
      r.retained ? [`استقطاع ${fq(p.retentionPct)}%`, '− ' + M(r.retained), 'minus'] : null,
      ['المدفوع سابقاً', '− ' + M(r.received), 'paid']
    ];
    wa.push(`قيمة المنفذ: ${M(r.doneValue)}`, r.retained ? `الاستقطاع: ${M(r.retained)}` : '', `المدفوع: ${M(r.received)}`, `*المستحق: ${M(r.certificateDue)} ${sym()}*`);
    const html = header('مستخلص أعمال', docNo('certificate', p)) + clientBox(p) + body +
      `<div class="d-bottom">${notesBox('ملاحظات', 'نسب التنفيذ حسب الحصر الفعلي بالموقع حتى تاريخه.')}${totalsBox(rows, r.certificateDue >= 0 ? 'المستحق صرفه' : 'مدفوع بالزيادة', Math.abs(r.certificateDue))}</div>` + signs('المقاول', 'المالك / الاستشاري') + footer();
    return { title: 'مستخلص - ' + p.name, html, text: wa.filter(Boolean).join('\n'), phone: (S.client(p.clientId) || {}).phone };
  }

  function receiptDoc(p, payId) {
    const pay = p.payments.find(x => x.id === payId);
    if (!pay) return null;
    const c = S.client(p.clientId);
    const r = V.pcalc(p);
    const ph = p.phases.find(x => x.key === pay.phase);
    const html = header('إيصال استلام نقدية', 'RC-' + String(pay.receiptNo || 0).padStart(5, '0'), pay.date) +
      `<div class="d-receipt" contenteditable="true">استلمت أنا / <b>${esc(S.db().settings.bizName || '................')}</b><br>
       من السيد / <b>${esc(c ? c.name : '................')}</b><br>
       مبلغاً وقدره: <span class="amt">${M(pay.amount)} ${esc(sym())}</span><br>
       وذلك ${ph ? 'عن مرحلة «' + esc(ph.name) + '» ' : ''}تحت حساب أعمال مشروع: <b>${esc(p.name)}</b>${p.address ? ' — ' + esc(p.address) : ''}<br>
       طريقة الدفع: ${esc(pay.method || 'كاش')}${pay.note ? ' — ' + esc(pay.note) : ''}</div>` +
      `<div class="d-bottom"><div></div>${totalsBox([['قيمة الأعمال', M(r.net), 'sub'], ['إجمالي المدفوع حتى الآن', M(r.received), 'paid']], 'المتبقي على العميل', r.remaining)}</div>` + signs('المستلم', 'الدافع') + footer();
    const text = [`*إيصال استلام*`, waLine('المبلغ', M(pay.amount) + ' ' + sym()), waLine('المشروع', p.name), waLine('التاريخ', fmtDate(pay.date)), waLine('إجمالي المدفوع', M(r.received)), `*المتبقي: ${M(r.remaining)} ${sym()}*`].join('\n');
    return { title: 'إيصال ' + (pay.receiptNo || ''), html, text, phone: c && c.phone };
  }

  function statementDoc(c) {
    const ps = V.realProjects().filter(p => p.clientId === c.id);
    const lines = [];
    ps.forEach(p => {
      const r = V.pcalc(p);
      lines.push({ date: p.startDate || p.createdAt, desc: 'قيمة أعمال: ' + p.name, debit: r.net, credit: 0 });
      p.payments.forEach(x => lines.push({ date: x.date, desc: 'دفعة' + (x.method ? ' (' + x.method + ')' : '') + ' — ' + p.name, debit: 0, credit: E.n(x.amount) }));
    });
    lines.sort((a, b) => String(a.date).localeCompare(String(b.date)));
    let bal = 0;
    const rowsH = lines.map((l, i) => { bal += l.debit - l.credit; return `<tr><td class="idx">${i + 1}</td><td>${esc(fmtDate(l.date))}</td><td class="t">${esc(l.desc)}</td><td>${l.debit ? M(l.debit) : ''}</td><td>${l.credit ? M(l.credit) : ''}</td><td class="m">${M(bal)}</td></tr>`; }).join('');
    const deb = lines.reduce((s, l) => s + l.debit, 0), cr = lines.reduce((s, l) => s + l.credit, 0);
    const html = header('كشف حساب عميل', 'ST-' + c.id.slice(-5).toUpperCase()) +
      `<div class="d-client"><div class="d-field"><div class="lbl">العميل</div><div class="val">${esc(c.name)}</div></div><div class="d-field"><div class="lbl">الهاتف</div><div class="val">${esc(c.phone || '')}</div></div></div>
      <table class="p-table"><thead><tr><th>م</th><th>التاريخ</th><th>البيان</th><th>مدين (أعمال)</th><th>دائن (مدفوع)</th><th>الرصيد</th></tr></thead><tbody>${rowsH || '<tr><td colspan="6">لا توجد حركات</td></tr>'}</tbody>
      <tfoot><tr><td colspan="3">الإجمالي</td><td>${M(deb)}</td><td>${M(cr)}</td><td>${M(deb - cr)}</td></tr></tfoot></table>
      <div class="d-bottom"><div></div>${totalsBox([['إجمالي الأعمال', M(deb), 'sub'], ['إجمالي المدفوع', M(cr), 'paid']], 'الرصيد المستحق', deb - cr)}</div>` + signs() + footer();
    const text = [`*كشف حساب: ${c.name}*`].concat(ps.map(p => { const r = V.pcalc(p); return `• ${p.name}: ${M(r.net)} — مدفوع ${M(r.received)} — متبقي ${M(r.remaining)}`; }), [`*الرصيد المستحق: ${M(deb - cr)} ${sym()}*`]).join('\n');
    return { title: 'كشف حساب ' + c.name, html, text, phone: c.phone };
  }

  function costDoc(p) {
    const r = V.pcalc(p);
    const row = (k, v, cls) => `<tr class="${cls || ''}"><td>${esc(k)}</td><td>${M(v)}</td></tr>`;
    const body = `<div class="d-sec"><span class="n">1</span>الإيرادات</div>
      <div class="d-totals"><table>${row('المصنعية', r.labor)}${row('الخامات الموردة (بيع)', r.matSell)}${r.discount ? row('الخصم', -r.discount, 'minus') : ''}${row('قيمة الأعمال', r.net, 'sub')}${row('المقبوض فعلاً', r.received, 'paid')}${row('المتبقي على العميل', r.remaining)}</table></div>
      <div class="d-sec"><span class="n">2</span>التكاليف</div>
      <div class="d-totals"><table>${row('تكلفة الخامات ' + (r.matMode === 'actual' ? '(فعلي)' : '(تقديري من المقايسة)'), r.matCost)}${r.matMode === 'actual' ? row('منها مصروف من المخزن', r.issuedValue) : ''}${row('أجور العمال', r.wages)}${row('منها مدفوع للعمال', r.wagesPaid, 'paid')}${Object.keys(r.expByCat).filter(k => r.matMode === 'actual' || k !== 'خامات').map(k => row(k, r.expByCat[k])).join('')}${row('إجمالي التكاليف', r.costs, 'sub')}</table></div>
      <div class="d-sec"><span class="n">3</span>المراحل</div>
      <table class="p-table"><thead><tr><th>المرحلة</th><th>الحالة</th><th>القيمة</th><th>المنفذ</th><th>المدفوع</th></tr></thead><tbody>${r.phases.filter(x => x.total || x.paid).map(x => `<tr><td class="t">${esc(x.name)}</td><td>${{ pending: 'لم تبدأ', active: 'جارية', done: 'تمت' }[x.status]}</td><td>${M(x.total)}</td><td>${M(x.done)}</td><td>${M(x.paid)}</td></tr>`).join('') || '<tr><td colspan="5">—</td></tr>'}</tbody></table>`;
    const html = header('تقرير تكلفة المشروع', docNo('cost', p)) + clientBox(p) + body +
      `<div class="d-bottom">${notesBox('الرصيد النقدي', 'المقبوض ' + M(r.cashIn) + ' − المدفوع ' + M(r.cashOut) + ' = ' + M(r.cashBalance) + '\nهامش الربح ' + fq(r.margin, 1) + '%')}${totalsBox([['قيمة الأعمال', M(r.net), 'sub'], ['التكاليف', '− ' + M(r.costs), 'minus']], 'صافي الربح', r.profit)}</div>` + footer();
    const text = waHead('تقرير تكلفة', p).concat([`قيمة الأعمال: ${M(r.net)}`, `التكاليف: ${M(r.costs)}`, `*صافي الربح: ${M(r.profit)} ${sym()}*`]).join('\n');
    return { title: 'تقرير تكلفة - ' + p.name, html, text };
  }

  function materialsDoc(p) {
    const r = V.pcalc(p);
    const mats = E.projectMaterials(r);
    const wa = waHead('كشف الخامات المطلوبة', p);
    const body = `<table class="p-table"><thead><tr><th>م</th><th>الخامة</th><th>الكمية الصافية</th><th>المطلوب شراؤه</th><th>على</th><th>القيمة التقديرية</th></tr></thead><tbody>
      ${mats.map((m, i) => { wa.push(`• ${m.name}: ${fq(m.packs)} ${m.packUnit}`); return `<tr><td class="idx">${i + 1}</td><td class="t">${esc(m.name)}</td><td>${fq(m.qty)} ${esc(m.unit)}</td><td class="m">${fq(m.packs)} ${esc(m.packUnit)}</td><td>${m.onClient >= m.packs ? 'العميل' : m.onClient ? 'مشترك' : 'المقاول'}</td><td>${M(m.cost)}</td></tr>`; }).join('') || '<tr><td colspan="6">لا توجد خامات</td></tr>'}
      </tbody><tfoot><tr><td colspan="5">الإجمالي التقديري (بسعر الشراء)</td><td>${M(mats.reduce((s, m) => s + m.cost, 0))}</td></tr></tfoot></table>
      <div class="d-assume">الكميات شاملة نسبة الهالك المحددة لكل بند، ومقربة لأقرب عبوة كاملة. معدلات الاستهلاك حسب بيانات المنتج المدخلة.</div>`;
    return { title: 'كشف خامات - ' + p.name, html: header('كشف الخامات المطلوبة', docNo('materials', p)) + clientBox(p) + body + footer(), text: wa.join('\n'), phone: (S.client(p.clientId) || {}).phone };
  }

  function profitDoc() {
    const rows = V.realProjects().map(p => ({ p, r: V.pcalc(p) }));
    const T = k => rows.reduce((s, x) => s + x.r[k], 0);
    const html = header('تقرير الأرباح', '') +
      `<table class="p-table"><thead><tr><th>م</th><th>المشروع</th><th>القيمة</th><th>المقبوض</th><th>المتبقي</th><th>التكاليف</th><th>الربح</th></tr></thead><tbody>
      ${rows.map((x, i) => `<tr><td class="idx">${i + 1}</td><td class="t">${esc(x.p.name)}<small>${esc((S.client(x.p.clientId) || {}).name || '')}</small></td><td>${M(x.r.net)}</td><td>${M(x.r.received)}</td><td>${M(x.r.remaining)}</td><td>${M(x.r.costs)}</td><td class="m">${M(x.r.profit)}</td></tr>`).join('')}
      </tbody><tfoot><tr><td colspan="2">الإجمالي</td><td>${M(T('net'))}</td><td>${M(T('received'))}</td><td>${M(T('remaining'))}</td><td>${M(T('costs'))}</td><td>${M(T('profit'))}</td></tr></tfoot></table>
      <div class="d-bottom"><div></div>${totalsBox([['إجمالي الإيرادات', M(T('net')), 'sub'], ['إجمالي التكاليف', '− ' + M(T('costs')), 'minus']], 'صافي الربح', T('profit'))}</div>` + footer();
    return { title: 'تقرير الأرباح', html, text: [`*تقرير الأرباح*`, `الإيرادات: ${M(T('net'))}`, `التكاليف: ${M(T('costs'))}`, `*صافي الربح: ${M(T('profit'))} ${sym()}*`].join('\n') };
  }

  function buildDoc(type, opts) {
    const p = opts.pid ? S.project(opts.pid) : null;
    if (type === 'receipt') return receiptDoc(p, opts.id);
    if (type === 'statement') { const c = S.client(opts.cid || (p && p.clientId)); return c ? statementDoc(c) : null; }
    if (type === 'profit') return profitDoc();
    if (!p) return null;
    if (type === 'certificate') return certificateDoc(p);
    if (type === 'cost') return costDoc(p);
    if (type === 'materials') return materialsDoc(p);
    return boqDoc(type, p);
  }

  /* ---------- المعاينة ---------- */
  let CUR_DOC = null;
  function fitPreview() {
    const modal = document.getElementById('printModal');
    if (!modal.classList.contains('open')) return;
    const sheet = document.getElementById('printSheet');
    const vp = document.getElementById('printViewport');
    sheet.style.transform = 'none';
    const w = sheet.offsetWidth, h = sheet.offsetHeight;
    const avail = Math.min(window.innerWidth - 16, 820);
    const sc = Math.min(1, avail / w);
    sheet.style.transform = `scale(${sc})`;
    vp.style.width = (w * sc) + 'px';
    vp.style.height = (h * sc) + 'px';
  }
  function openDoc(type, opts) {
    const d = buildDoc(type, opts || {});
    if (!d) { U.toast('المستند غير متاح — تأكد من وجود عميل/بيانات'); return; }
    CUR_DOC = d;
    document.getElementById('printSheet').innerHTML = d.html;
    document.getElementById('printModal').classList.add('open');
    document.getElementById('printModal').scrollTop = 0;
    document.title = d.title;
    setTimeout(fitPreview, 30);
    const imgs = document.querySelectorAll('#printSheet img');
    imgs.forEach(im => { im.onload = fitPreview; });
  }
  function closeDoc() {
    document.getElementById('printModal').classList.remove('open');
    document.title = 'HESABATI PLASTER — حساباتي للمحارة والواجهات';
    CUR_DOC = null;
  }
  window.addEventListener('resize', fitPreview);

  Object.assign(U.ACTIONS, {
    openDoc(el) { openDoc(el.dataset.type, { pid: el.dataset.pid, id: el.dataset.id, cid: el.dataset.cid }); },
    closeDoc() { closeDoc(); },
    printDoc() {
      if (window.PlasterApp && typeof window.PlasterApp.print === 'function') { window.PlasterApp.print(CUR_DOC ? CUR_DOC.title : 'HESABATI PLASTER'); return; }
      window.print();
    },
    waDoc() {
      if (!CUR_DOC) return;
      const ph = CUR_DOC.phone ? window.Admin.waPhone(CUR_DOC.phone) : '';
      const url = 'https://wa.me/' + ph + '?text=' + encodeURIComponent(CUR_DOC.text);
      if (window.PlasterApp && typeof window.PlasterApp.openExternal === 'function') window.PlasterApp.openExternal(url);
      else window.open(url, '_blank', 'noopener');
    },
    shareDoc() {
      if (!CUR_DOC) return;
      if (navigator.share) navigator.share({ title: CUR_DOC.title, text: CUR_DOC.text }).catch(() => {});
      else if (navigator.clipboard) navigator.clipboard.writeText(CUR_DOC.text).then(() => U.toast('تم نسخ النص'), () => U.toast('تعذر النسخ'));
    }
  });

  window.Docs = { buildDoc, openDoc, closeDoc };
})();
