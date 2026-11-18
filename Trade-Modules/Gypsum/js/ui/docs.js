/*
 * حساباتي للجبس والديكورات — الفواتير والمقايسات وعروض الأسعار والمستخلصات والتقارير
 * المعاينة ورقة A4 حقيقية، والحفظ PDF عن طريق الطباعة (من المتصفح أو من تطبيق أندرويد)
 * © 2026 أحمد حسن عبدالله - جميع الحقوق محفوظة.
 */
'use strict';
const DT = HGf.DOC_TYPES;
const PROJECT_DOCS = ['si_inv', 'labor_inv', 'supply_inv', 'quote', 'boq_board', 'boq_plaster', 'boq_decor', 'progress', 'cost_report'];
const DOC_ICONS = { labor_inv: 'hammer', supply_inv: 'box', si_inv: 'file', boq_board: 'layers', boq_plaster: 'trowel', boq_decor: 'frame', quote: 'tag', progress: 'chart', receipt: 'cash', statement: 'book', cost_report: 'calc', profit_report: 'chart' };

/* ---------------- اختيار نوع المستند ---------------- */
function openDocBuilder(pid) {
  const p = byId('projects', pid);
  const has = s => p.items.some(it => (it.section || 'other') === s);
  const avail = PROJECT_DOCS.filter(t => !DT[t].section || has(DT[t].section));
  openSheet('إنشاء مستند للمشروع', `<div class="create-list">${avail.map(t => `<button type="button" class="create-opt${t === 'si_inv' ? ' dark' : ''}" onclick="docOptions('${pid}','${t}')"><span class="q-ic ${t === 'si_inv' ? 'orange' : 'orange-soft'}">${icon(DOC_ICONS[t])}</span><span><b>${esc(DT[t].name)}</b><small>${esc(docHint(t))}</small></span></button>`).join('')}</div>`);
}
function docHint(t) {
  return {
    si_inv: 'كل البنود: خامات + مصنعية بدون تكرار', labor_inv: 'أجر التنفيذ فقط', supply_inv: 'الخامات بسعر البيع', quote: 'قبل التنفيذ — بدون مدفوعات',
    boq_board: 'كميات وأسعار أعمال الجبسون بورد + الخامات', boq_plaster: 'كميات أعمال الجبس البلدي', boq_decor: 'الكرانيش والبانوهات والروزتات',
    progress: 'المنفذ فعلياً لحد دلوقتي', cost_report: 'التكلفة والربح (داخلي ليك)'
  }[t] || '';
}
function docOptions(pid, type) {
  const p = byId('projects', pid), t = projTotals(p);
  const partial = type === 'labor_inv' || type === 'supply_inv';
  const noMoney = type === 'cost_report';
  openSheet(DT[type].name, `<div id="docForm"><div class="f-grid">
    ${fText('date', 'تاريخ المستند', todayISO(), { type: 'date' })}
    ${type === 'quote' ? fNum('validity', 'صلاحية العرض (أيام)', 15) : ''}
    ${!noMoney && type !== 'progress' && !DT[type].section ? `${fNum('discount', 'الخصم', partial ? '' : t.discount, { unit: cur().sym, ph: '0' })}${fNum('additions', 'إضافات (نقل...)', partial ? '' : t.additions, { unit: cur().sym, ph: '0' })}` : ''}
    ${!noMoney && type !== 'quote' && !DT[type].section ? fNum('paid', 'المدفوع', partial ? '' : t.paid, { unit: cur().sym, ph: '0', hint: partial ? 'فاتورة جزئية: اكتب المدفوع عليها لو فيه' : 'من دفعات المشروع' }) : ''}
    ${fArea('notes', 'ملاحظات على المستند', type === 'quote' ? 'الأسعار شاملة حسب البنود الموضحة. أي أعمال إضافية تُحسب بنفس الفئات.' : '', { rows: 2 })}
  </div><button type="button" class="btn btn-accent" onclick="createDoc('${pid}','${type}')">${icon('eye')} معاينة وحفظ</button></div>`);
}
function docClient(p) { const c = projCustomer(p) || {}; return { name: c.name || '', phone: c.phone || '', address: p.address || c.address || '', project: projName(p) }; }
function saveSnapshot(type, data, meta) {
  const d = DB();
  const number = HG.store.nextNumber(type);
  const snap = Object.assign({ id: uid('d'), type, number, created: new Date().toISOString(), doc: data }, meta);
  d.docs.push(snap); persist();
  return snap;
}
function createDoc(pid, type) {
  const p = byId('projects', pid), v = readForm($('docForm'));
  const opts = { discount: v.discount, additions: v.additions, paid: v.paid, validity: v.validity };
  const data = HGf.buildDoc(type, { project: p, ctx: projCtx(p), opts });
  if (!data.rows.length && type !== 'cost_report') { toast('مفيش بنود تنفع للمستند ده'); return; }
  const snap = saveSnapshot(type, data, { projectId: pid, customerId: p.customerId, date: v.date, notes: v.notes, client: docClient(p) });
  closeSheet(); refreshPages(); renderAll();
  openPrint(snap);
}
function makeReceipt(payId) {
  const x = byId('payments', payId); if (!x) return;
  const d = DB();
  let snap = d.docs.find(s => s.type === 'receipt' && s.paymentId === payId);
  const p = x.projectId ? byId('projects', x.projectId) : { items: [], id: null };
  const data = HGf.buildDoc('receipt', { project: p, ctx: p.id ? projCtx(p) : {}, payment: x });
  const c = x.customerId ? byId('customers', x.customerId) : (p.id ? projCustomer(p) : null);
  if (snap) { snap.doc = data; persist(); }
  else snap = saveSnapshot('receipt', data, { projectId: p.id || null, customerId: c ? c.id : null, paymentId: payId, date: x.date, notes: '', client: p.id ? docClient(p) : { name: c ? c.name : '', phone: c ? c.phone : '', address: c ? c.address : '', project: '' } });
  closeSheet(); openPrint(snap);
}
function makeStatement(cid) {
  const c = byId('customers', cid), d = DB();
  const projects = d.projects.filter(p => p.customerId === cid);
  const data = HGf.buildDoc('statement', { projects, ctxOf: projCtx, loosePayments: d.payments.filter(x => x.customerId === cid && !x.projectId) });
  const snap = saveSnapshot('statement', data, { customerId: cid, date: todayISO(), client: { name: c.name, phone: c.phone, address: c.address, project: `${projects.length} مشروع` } });
  openPrint(snap);
}
function makeProfitReport(projects, label) {
  const d = DB();
  const general = d.expenses.filter(e => !e.projectId).reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const data = HGf.buildDoc('profit_report', { projects, ctxOf: projCtx, generalExpenses: general, customerName: p => (projCustomer(p) || {}).name || '' });
  const snap = saveSnapshot('profit_report', data, { date: todayISO(), client: { name: label || 'كل المشروعات', phone: '', address: '', project: `${projects.length} مشروع` } });
  openPrint(snap);
}

/* ---------------- قائمة المستندات ---------------- */
function docCardHTML(s) {
  const T = DT[s.type] || { name: 'مستند' };
  const amt = s.doc && s.doc.totals ? (s.type === 'receipt' ? s.doc.totals.amount : s.type === 'profit_report' ? s.doc.totals.profit : s.doc.totals.final) : 0;
  return `<div class="inv-card" onclick="openPrint(byId('docs','${s.id}'))"><div class="av-ic orange">${icon(DOC_ICONS[s.type] || 'file')}</div>
    <div class="inv-info"><div class="n">${esc(T.name)} <span class="status-b">#${esc(docNo(s))}</span></div><div class="m">${esc([s.client && s.client.name, s.client && s.client.project, fmtDate(s.date)].filter(Boolean).join(' · '))}</div></div>
    <div class="inv-amount">${fmt(amt)}<small>${esc(cur().sym)}</small></div>
    <button type="button" class="card-del" onclick="event.stopPropagation();deleteDoc('${s.id}')" aria-label="حذف">${icon('trash')}</button></div>`;
}
function docNo(s) { return `${String(s.date || s.created || '').slice(0, 4)}-${String(s.number).padStart(4, '0')}`; }
function deleteDoc(id) { ask('حذف المستند المحفوظ ده؟', () => { DB().docs = DB().docs.filter(x => x.id !== id); persist(); refreshPages(); renderAll(); }, 'حذف'); }
let docsFilter = 'all';
function openDocsPage() { const el = openPage('', { name: 'docs', render: renderDocsPage }); renderDocsPage(el); hydrateIcons(el); }
function renderDocsPage(el) {
  const d = DB();
  const q = ((el.querySelector('#docSearch') || {}).value || '').trim().toLowerCase();
  let list = d.docs.slice().reverse();
  if (docsFilter !== 'all') list = list.filter(s => s.type === docsFilter || (docsFilter === 'inv' && /_inv$/.test(s.type)) || (docsFilter === 'boq' && /^boq_/.test(s.type)));
  if (q) list = list.filter(s => [s.client && s.client.name, s.client && s.client.project, docNo(s), (DT[s.type] || {}).name].join(' ').toLowerCase().includes(q));
  el.innerHTML = `${pageHead('الفواتير والمستندات', `${d.docs.length} مستند محفوظ`)}
  <main class="container" style="padding-bottom:40px">
    <div class="field"><input type="search" id="docSearch" placeholder="ابحث باسم العميل أو رقم المستند..." value="${esc(q)}" oninput="refreshPages()"></div>
    <div class="filter-chips">${[['all', 'الكل'], ['inv', 'فواتير'], ['quote', 'عروض أسعار'], ['boq', 'مقايسات'], ['progress', 'مستخلصات'], ['receipt', 'إيصالات'], ['statement', 'كشوف حساب'], ['cost_report', 'تقارير تكلفة'], ['profit_report', 'تقارير أرباح']].map(([k, t]) => `<button type="button" class="chip${docsFilter === k ? ' on' : ''}" onclick="docsFilter='${k}';refreshPages()">${t}</button>`).join('')}</div>
    ${list.map(docCardHTML).join('') || `<div class="empty"><div class="big">${icon('file')}</div><p>المستندات بتتعمل من صفحة المشروع (زرار الطابعة)، وبتتحفظ هنا عشان تفتحها وتطبعها تاني.</p></div>`}
  </main>`;
  const s = el.querySelector('#docSearch'); if (s && q) { s.focus(); s.setSelectionRange(q.length, q.length); }
}

/* ---------------- تصميم المستند (A4) ---------------- */
function pField(ic, label, value, wide) { return `<div class="inv-field${wide ? ' wide' : ''}"><span class="ic">${icon(ic)}</span><div><div class="lbl">${esc(label)}</div><div class="val" contenteditable="true">${esc(value || '—')}</div></div></div>`; }
function docHTML(s) {
  const st = DB().settings, d = s.doc, T = DT[s.type] || { name: 'مستند', tag: 'مستند' }, c = s.client || {};
  const C = cur().sym;
  const head = `<header class="inv-head"><div class="inv-brand">
      ${st.showLogo && st.logo ? `<div class="inv-logo"><img src="${st.logo}" alt=""></div>` : ''}
      <div><h1 contenteditable="true">${esc(st.bizName || 'حساباتي للجبس والديكورات')}</h1>
      <p contenteditable="true">${esc([st.ownerName, st.address].filter(Boolean).join(' — ') || 'أعمال الجبسون بورد والجبس البلدي والديكورات')}</p>
      ${st.phone || st.phone2 ? `<p>هاتف: <b>${esc([st.phone, st.phone2].filter(Boolean).join(' / '))}</b></p>` : ''}</div></div>
    <div class="inv-doc"><span class="tag">${esc(T.name)}</span><span class="d">رقم: <b>${esc(docNo(s))}</b></span><span class="d">التاريخ: <b>${esc(fmtDate(s.date))}</b></span>
    ${d.validity ? `<span class="d">صالح لمدة: <b>${d.validity} يوم</b></span>` : ''}</div></header><div class="inv-stripe"></div>`;
  const client = s.type === 'profit_report' ? `<section class="inv-client">${pField('chart', 'التقرير', c.name, false)}${pField('calendar', 'عدد المشروعات', c.project, false)}</section>`
    : `<section class="inv-client">${pField('user', 'العميل', c.name)}${pField('phone', 'الهاتف', c.phone)}${pField('pin', 'العنوان', c.address, !c.project)}${c.project ? pField('briefcase', 'المشروع', c.project) : ''}</section>`;
  let body = '';
  const tr = (cells) => `<tr>${cells.join('')}</tr>`;
  if (d.columns === 'progress') {
    body = `<table class="p-table"><thead><tr><th>#</th><th>البند</th><th>الوحدة</th><th>كمية التعاقد</th><th>المنفذ</th><th>سعر الوحدة</th><th>قيمة المنفذ</th></tr></thead><tbody>
      ${d.rows.map((r, i) => tr([`<td class="idx">${i + 1}</td>`, `<td class="room-col" contenteditable="true">${esc(r.name)}</td>`, `<td>${esc(r.unit)}</td>`, `<td>${fq(r.qty)}</td>`, `<td>${esc(typeof r.done === 'number' ? fq(r.done) : r.done)}</td>`, `<td class="money">${fmt(r.price)}</td>`, `<td class="money">${fmt(r.total)}</td>`])).join('')}
      </tbody><tfoot><tr><td colspan="6">إجمالي قيمة الأعمال المنفذة (من إجمالي تعاقد ${fmt(d.totals.contract)} ${esc(C)})</td><td class="money">${fmt(d.totals.final)}</td></tr></tfoot></table>`;
  } else if (d.columns === 'receipt') {
    const r = d.receipt;
    body = `<div class="inv-receipt">استلمت أنا / <b contenteditable="true">${esc(st.ownerName || st.bizName || '..................')}</b> من السيد / <b>${esc(c.name || '..................')}</b><br>
      مبلغ وقدره: <span class="big">${fmt(r.amount)} ${esc(C)}</span><br>
      وذلك ${esc(r.note || 'دفعة تحت الحساب')}${c.project ? ` عن مشروع: <b>${esc(c.project)}</b>` : ''} — طريقة الدفع: ${esc(r.method)} — بتاريخ ${esc(fmtDate(r.date))}</div>`;
  } else if (d.columns === 'statement') {
    body = `<table class="p-table"><thead><tr><th>التاريخ</th><th>البيان</th><th>عليه (مدين)</th><th>دفع (دائن)</th><th>الرصيد</th></tr></thead><tbody>
      ${d.rows.map(r => tr([`<td>${esc(fmtDate(r.date))}</td>`, `<td class="txt">${esc(r.name)}</td>`, `<td class="money">${r.debit ? fmt(r.debit) : ''}</td>`, `<td class="money">${r.credit ? fmt(r.credit) : ''}</td>`, `<td class="money">${fmt(r.balance)}</td>`])).join('')}</tbody></table>`;
  } else if (d.columns === 'report') {
    body = `<table class="p-table"><thead><tr><th>البند</th><th>القيمة</th></tr></thead><tbody>
      ${d.rows.map(r => `<tr class="${r.kind}"><td class="txt">${esc(r.name)}</td><td class="money">${r.kind === 'pct' ? fmt(r.total) + '%' : fmt(r.total) + ' ' + esc(C)}</td></tr>`).join('')}</tbody></table>`;
  } else if (d.columns === 'profit') {
    body = `<table class="p-table"><thead><tr><th>#</th><th>المشروع</th><th>الإيراد</th><th>التكلفة</th><th>الربح</th><th>المستلم</th><th>المتبقي</th></tr></thead><tbody>
      ${d.rows.map((r, i) => tr([`<td class="idx">${i + 1}</td>`, `<td class="room-col">${esc(r.name)}${r.detail ? `<span class="sub-note">${esc(r.detail)}</span>` : ''}</td>`, `<td class="money">${fmt(r.revenue)}</td>`, `<td class="money">${fmt(r.cost)}</td>`, `<td class="money">${fmt(r.profit)}</td>`, `<td class="money">${fmt(r.paid)}</td>`, `<td class="money">${fmt(r.due)}</td>`])).join('')}
      </tbody><tfoot><tr><td colspan="2">الإجمالي</td><td class="money">${fmt(d.totals.revenue)}</td><td class="money">${fmt(d.totals.cost)}</td><td class="money">${fmt(d.totals.revenue - d.totals.cost)}</td><td class="money">${fmt(d.totals.paid)}</td><td class="money">${fmt(d.totals.due)}</td></tr></tfoot></table>`;
  } else {
    // جدول البنود القياسي — مقسم حسب التخصص لو فيه أكتر من قسم
    const secs = Array.from(new Set(d.rows.map(r => r.section || '')));
    const multi = secs.length > 1 && secs.every(Boolean);
    let n = 0;
    const rowsHTML = rs => rs.map(r => tr([`<td class="idx">${++n}</td>`, `<td class="room-col"><span contenteditable="true">${esc(r.name)}</span>${r.detail ? `<span class="sub-note">${esc(r.detail)}</span>` : ''}</td>`, `<td>${fq(r.qty)}</td>`, `<td>${esc(r.unit)}</td>`, `<td class="money">${fmt(r.price)}</td>`, `<td class="money">${fmt(r.total)}</td>`])).join('');
    const tbl = (rs, title, i) => `${title ? `<div class="inv-sec"><span class="n">${i}</span>${esc(title)}</div>` : ''}<table class="p-table"><thead><tr><th>#</th><th>البيان</th><th>الكمية</th><th>الوحدة</th><th>سعر الوحدة</th><th>الإجمالي</th></tr></thead><tbody>${rowsHTML(rs)}</tbody>
      <tfoot><tr><td colspan="5">${title ? 'إجمالي ' + esc(title) : 'الإجمالي'}</td><td class="money">${fmt(rs.reduce((a, r) => a + r.total, 0))}</td></tr></tfoot></table>`;
    body = multi ? secs.map((sc, i) => tbl(d.rows.filter(r => r.section === sc), HGf.SECTIONS[sc], i + 1)).join('') : tbl(d.rows, '', 0);
    if (d.materials && d.materials.length) body += `<div class="inv-sec"><span class="n">${multi ? secs.length + 1 : 2}</span>حصر الخامات المطلوبة</div><table class="p-table"><thead><tr><th>#</th><th>الخامة</th><th>الكمية</th><th>الوحدة</th></tr></thead><tbody>
      ${d.materials.map((m, i) => tr([`<td class="idx">${i + 1}</td>`, `<td class="room-col">${esc(m.name)}${m.detail ? `<span class="sub-note">${esc(m.detail)}</span>` : ''}</td>`, `<td>${fq(m.qty)}</td>`, `<td>${esc(m.unit)}</td>`])).join('')}</tbody></table>`;
  }
  const t = d.totals || {};
  let totals = '';
  if (d.columns === 'report') totals = `<div class="inv-totals"><div class="inv-net"><span>صافي الربح</span><strong>${fmt(t.profit)} ${esc(C)}</strong></div></div>`;
  else if (d.columns === 'profit') totals = `<div class="inv-totals"><table class="p-totals-table"><tr><td>إجمالي الإيرادات</td><td>${fmt(t.revenue)}</td></tr><tr class="minus"><td>تكاليف المشروعات</td><td>${fmt(t.cost)}</td></tr><tr class="minus"><td>مصروفات عامة</td><td>${fmt(t.general)}</td></tr><tr class="paid"><td>المستلم فعلياً</td><td>${fmt(t.paid)}</td></tr><tr class="minus"><td>ديون مستحقة</td><td>${fmt(t.due)}</td></tr></table><div class="inv-net"><span>صافي الربح</span><strong>${fmt(t.profit)} ${esc(C)}</strong></div></div>`;
  else if (d.columns === 'receipt') totals = `<div class="inv-totals"><table class="p-totals-table">${t.final ? `<tr><td>إجمالي المشروع</td><td>${fmt(t.final)}</td></tr><tr class="paid"><td>إجمالي المدفوع</td><td>${fmt(t.paid)}</td></tr>` : ''}</table><div class="inv-net"><span>${t.final ? 'المتبقي' : 'المبلغ المستلم'}</span><strong>${fmt(t.final ? t.due : t.amount)} ${esc(C)}</strong></div></div>`;
  else if (d.columns === 'statement') totals = `<div class="inv-totals"><table class="p-totals-table"><tr><td>إجمالي الأعمال</td><td>${fmt(t.final)}</td></tr><tr class="paid"><td>إجمالي المدفوع</td><td>${fmt(t.paid)}</td></tr></table><div class="inv-net"><span>الرصيد المتبقي</span><strong>${fmt(t.due)} ${esc(C)}</strong></div></div>`;
  else totals = `<div class="inv-totals"><table class="p-totals-table">
      <tr class="sub"><td>الإجمالي</td><td>${fmt(t.subtotal)}</td></tr>
      ${t.discount ? `<tr class="minus"><td>الخصم</td><td>− ${fmt(t.discount)}</td></tr>` : ''}
      ${t.additions ? `<tr><td>إضافات</td><td>+ ${fmt(t.additions)}</td></tr>` : ''}
      ${!d.noPaid && (t.discount || t.additions) ? `<tr class="sub"><td>الإجمالي النهائي</td><td>${fmt(t.final)}</td></tr>` : ''}
      ${!d.noPaid ? `<tr class="paid"><td>المدفوع</td><td>${fmt(t.paid)}</td></tr>` : ''}
    </table><div class="inv-net"><span>${d.noPaid ? 'الإجمالي النهائي' : 'المتبقي'}</span><strong>${fmt(d.noPaid ? t.final : t.due)} ${esc(C)}</strong></div></div>`;
  const notes = [s.notes, st.docFooter].filter(Boolean);
  const sign = ['receipt', 'si_inv', 'labor_inv', 'supply_inv', 'quote', 'progress'].includes(s.type)
    ? `<div class="inv-sign" style="margin-top:14px"><div>توقيع ${s.type === 'receipt' ? 'المستلم' : 'المنفذ'}</div><div>توقيع العميل</div></div>` : '';
  return `${head}${client}${body}
    <div class="inv-bottom"><div class="inv-notes"><h4>ملاحظات</h4><div contenteditable="true">${notes.length ? notes.map(n => esc(n)).join('<br>') : '—'}</div></div><div class="inv-side">${totals}</div></div>
    ${sign}
    <footer class="inv-foot"><span>${esc(st.bizName || 'حساباتي للجبس والديكورات')}</span><span>صدر من تطبيق <b>حساباتي للجبس</b></span></footer>`;
}

/* ---------------- المعاينة والطباعة ---------------- */
let printSnap = null;
function openPrint(s) {
  if (!s) return;
  printSnap = s;
  const m = $('printPreviewModal');
  $('printSheet').innerHTML = docHTML(s);
  hydrateIcons($('printSheet'));
  printJobName = `${(DT[s.type] || {}).name || 'مستند'} ${docNo(s)}${s.client && s.client.name ? ' - ' + s.client.name : ''}`;
  m.style.display = 'block'; m.scrollTop = 0;
  document.body.style.overflow = 'hidden';
  pushHist();
  requestAnimationFrame(fitPreview);
}
function closePrint(fromPop) {
  $('printPreviewModal').style.display = 'none';
  printSnap = null;
  lockScroll();
  syncHist();
}
function fitPreview() {
  const vp = $('printViewport'), sh = $('printSheet');
  if (!vp || !sh) return;
  const avail = Math.min(window.innerWidth - 16, 820);
  const w = sh.offsetWidth || 794;
  const scale = Math.min(1, avail / w);
  sh.style.transform = `scale(${scale})`;
  vp.style.width = (w * scale) + 'px';
  vp.style.height = (sh.offsetHeight * scale) + 'px';
}
window.addEventListener('resize', () => { if ($('printPreviewModal').style.display === 'block') fitPreview(); });
function doPrint() { window.print(); }
function docText(s) {
  const d = s.doc, T = DT[s.type] || { name: 'مستند' }, c = s.client || {}, st = DB().settings;
  const L = [`*${T.name}* رقم ${docNo(s)}`, `التاريخ: ${fmtDate(s.date)}`];
  if (c.name) L.push(`العميل: ${c.name}`);
  if (c.project) L.push(`المشروع: ${c.project}`);
  L.push('');
  if (d.columns === 'receipt') L.push(`استلام مبلغ: *${money(d.receipt.amount)}*`, d.receipt.note || '');
  else if (d.columns === 'statement') d.rows.forEach(r => L.push(`- ${fmtDate(r.date)} ${r.name}: ${r.debit ? '+' + fmt(r.debit) : '−' + fmt(r.credit)} (الرصيد ${fmt(r.balance)})`));
  else if (d.columns === 'report' || d.columns === 'profit') (d.rows || []).forEach(r => L.push(`- ${r.name}: ${fmt(r.total != null ? r.total : r.profit)}`));
  else d.rows.forEach((r, i) => L.push(`${i + 1}. ${r.name}: ${fq(r.qty)} ${r.unit} × ${fmt(r.price)} = ${fmt(r.total)}`));
  const t = d.totals || {};
  L.push('');
  if (d.columns === 'std' || d.columns === 'progress') {
    L.push(`الإجمالي: ${money(t.subtotal != null ? t.subtotal : t.final)}`);
    if (t.discount) L.push(`الخصم: ${money(t.discount)}`);
    if (t.additions) L.push(`إضافات: ${money(t.additions)}`);
    if (!d.noPaid) { L.push(`المدفوع: ${money(t.paid)}`, `*المتبقي: ${money(t.due)}*`); } else L.push(`*الإجمالي النهائي: ${money(t.final)}*`);
  } else if (t.due != null) L.push(`*المتبقي: ${money(t.due)}*`);
  if (s.notes) L.push('', s.notes);
  if (st.bizName || st.phone) L.push('', [st.bizName, st.phone].filter(Boolean).join(' — '));
  return L.join('\n');
}
function printWhatsApp() { if (printSnap) sendWhatsApp(docText(printSnap), (printSnap.client || {}).phone); }
function printCopy() { if (printSnap) copyText(docText(printSnap), '✔️ اتنسخ نص المستند'); }

/* ---------------- التقارير ---------------- */
let reportPeriod = 'all';
function periodFilter(p) {
  if (reportPeriod === 'all') return true;
  const dt = p.startDate || p.created || '';
  const now = todayISO();
  if (reportPeriod === 'year') return dt.slice(0, 4) === now.slice(0, 4);
  return dt.slice(0, 7) === now.slice(0, 7);
}
function openReportsPage() { const el = openPage('', { name: 'reports', render: renderReportsPage }); renderReportsPage(el); hydrateIcons(el); }
function renderReportsPage(el) {
  const d = DB();
  const projects = d.projects.filter(p => p.status !== 'cancelled' && periodFilter(p));
  const T = { revenue: 0, cost: 0, profit: 0, paid: 0, due: 0, wages: 0, matCost: 0, expenses: 0 };
  const rows = projects.map(p => { const t = projTotals(p); Object.keys(T).forEach(k => { T[k] += t[k] || 0; }); return { p, t }; }).sort((a, b) => b.t.profit - a.t.profit);
  const general = d.expenses.filter(e => !e.projectId && (reportPeriod === 'all' || (reportPeriod === 'year' ? String(e.date).slice(0, 4) === todayISO().slice(0, 4) : String(e.date).slice(0, 7) === todayISO().slice(0, 7)))).reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const stock = HGf.stockSummary(d.stock);
  el.innerHTML = `${pageHead('التقارير المالية', 'الإيرادات والتكاليف والأرباح')}
  <main class="container" style="padding-bottom:40px">
    <div class="segmented" style="grid-template-columns:repeat(3,1fr)">${[['all', 'الكل'], ['year', 'السنة دي'], ['month', 'الشهر ده']].map(([k, t]) => `<button type="button" class="${reportPeriod === k ? 'on' : ''}" onclick="reportPeriod='${k}';refreshPages()">${t}</button>`).join('')}</div>
    <section class="hero"><div class="hero-label">صافي الأرباح (بعد المصروفات العامة)</div><div class="hero-value">${fmt(T.profit - general)}<small>${esc(cur().sym)}</small></div>
      <div class="hero-stats"><div class="hero-stat"><span>الإيرادات</span><strong>${fmt(T.revenue)}</strong></div><div class="hero-stat"><span>التكاليف</span><strong>${fmt(T.cost + general)}</strong></div><div class="hero-stat"><span>المشروعات</span><strong>${projects.length}</strong></div></div></section>
    <div class="kpis">
      <div class="kpi good"><span>المستلم فعلياً</span><strong>${money(T.paid)}</strong></div>
      <div class="kpi bad"><span>ديون مستحقة على العملاء</span><strong>${money(T.due)}</strong></div>
      <div class="kpi"><span>تكلفة الخامات</span><strong>${money(T.matCost)}</strong></div>
      <div class="kpi"><span>أجور العمال</span><strong>${money(T.wages)}</strong></div>
      <div class="kpi"><span>مصروفات المشروعات</span><strong>${money(T.expenses)}</strong></div>
      <div class="kpi"><span>مصروفات عامة</span><strong>${money(general)}</strong></div>
      <div class="kpi acc"><span>قيمة المخزون</span><strong>${money(stock.value)}</strong></div>
      <div class="kpi"><span>هامش الربح</span><strong>${T.revenue ? fmt((T.profit - general) / T.revenue * 100, 1) : 0}%</strong></div>
    </div>
    <button type="button" class="btn btn-accent" style="margin-bottom:12px" onclick="makeProfitReport(DB().projects.filter(p=>p.status!=='cancelled'&&periodFilter(p)),'${reportPeriod === 'all' ? 'كل المشروعات' : reportPeriod === 'year' ? 'تقرير السنة' : 'تقرير الشهر'}')">${icon('printer')} طباعة تقرير الأرباح</button>
    <div class="sec-title">الأرباح حسب المشروع</div>
    ${rows.map(({ p, t }) => `<div class="list-card" onclick="openProject('${p.id}')"><div class="av-ic ${t.profit >= 0 ? 'green' : 'red'}">${icon('chart')}</div><div class="inv-info"><div class="n">${esc(projName(p))}</div><div class="m">إيراد ${fmt(t.revenue)} · تكلفة ${fmt(t.cost)} · متبقي ${fmt(t.due)}</div></div><div class="cust-amt ${t.profit >= 0 ? 'ok' : 'due'}">${fmt(t.profit)}<small>ربح</small></div></div>`).join('') || '<div class="hint">مفيش مشروعات في الفترة دي.</div>'}
  </main>`;
}
