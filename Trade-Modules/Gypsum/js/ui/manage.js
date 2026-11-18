/*
 * حساباتي للجبس والديكورات — الخامات والمخزون / العمال / المصروفات / النوتة
 * © 2026 أحمد حسن عبدالله - جميع الحقوق محفوظة.
 */
'use strict';
const MOVE_TYPES = { purchase: 'شراء (وارد)', sale: 'بيع (صادر)', use: 'استخدام في مشروع', waste: 'هالك / تالف', adjust: 'تعديل جرد' };

/* =================== الخامات والمخزون =================== */
let stockCat = 'all';
function openStockPage() {
  const el = openPage('', { name: 'stock', render: renderStockPage });
  renderStockPage(el); hydrateIcons(el);
}
function renderStockPage(el) {
  const d = DB(), sum = HGf.stockSummary(d.stock);
  const q = (el.querySelector('#stockSearch') || {}).value || '';
  let list = d.stock.slice();
  if (stockCat === 'low') list = sum.low.slice();
  else if (stockCat !== 'all') list = list.filter(s => s.cat === stockCat);
  if (q.trim()) list = list.filter(s => [s.name, s.brand, s.size, s.supplier, s.color].join(' ').toLowerCase().includes(q.trim().toLowerCase()));
  el.innerHTML = `${pageHead('الخامات والمخزون', `${d.stock.length} خامة`, `<button type="button" class="icon-btn accent" onclick="openStockEdit(null)" aria-label="خامة جديدة">${icon('plus')}</button>`)}
  <main class="container" style="padding-bottom:40px">
    <section class="hero"><div class="hero-label">قيمة المخزون (بسعر الشراء)</div><div class="hero-value">${fmt(sum.value)}<small>${esc(cur().sym)}</small></div>
      <div class="hero-stats"><div class="hero-stat"><span>بسعر البيع</span><strong>${fmt(sum.sellValue)}</strong></div><div class="hero-stat"><span>عدد الخامات</span><strong>${sum.count}</strong></div><div class="hero-stat"><span>تحت الحد الأدنى</span><strong>${sum.low.length}</strong></div></div></section>
    ${sum.low.length ? `<div class="warn-box" style="margin:0 0 12px"><b>تنبيه انخفاض المخزون:</b> ${sum.low.slice(0, 6).map(s => esc(s.name)).join('، ')}${sum.low.length > 6 ? '...' : ''}</div>` : ''}
    <div class="btn-row" style="margin-bottom:12px">
      <button type="button" class="btn btn-accent" onclick="openMoveSheet(null,'purchase')">${icon('download')} تسجيل مشتريات</button>
      <button type="button" class="btn btn-soft" onclick="openMoveSheet(null,'sale')">${icon('upload')} تسجيل مبيعات</button>
    </div>
    <div class="field"><input type="search" id="stockSearch" placeholder="ابحث باسم الخامة أو المورد..." value="${esc(q)}" oninput="refreshPages()"></div>
    <div class="filter-chips">${[['all', 'الكل'], ['low', 'ناقص']].concat(Object.keys(HG.STOCK_CATS).map(k => [k, HG.STOCK_CATS[k]])).map(([k, t]) => `<button type="button" class="chip${stockCat === k ? ' on' : ''}" onclick="stockCat='${k}';refreshPages()">${esc(t)}</button>`).join('')}</div>
    ${list.length ? list.map(stockCardHTML).join('') : `<div class="empty"><div class="big">${icon('box')}</div><p>مفيش خامات هنا</p></div>`}
    <button type="button" class="btn btn-ghost" style="margin-top:6px" onclick="openMovesLog()">${icon('list')} سجل الحركات (وارد/صادر/هالك)</button>
  </main>`;
  const s = el.querySelector('#stockSearch');
  if (s && q) { s.focus(); s.setSelectionRange(q.length, q.length); }
}
function stockIsLow(s) { return s.min !== '' && s.min != null && Number(s.qty) <= Number(s.min); }
function stockCardHTML(s) {
  const spec = [s.thickness ? s.thickness + ' مم' : '', s.size, s.color, s.brand].filter(Boolean).join(' · ');
  return `<div class="list-card" onclick="openStockEdit('${s.id}')">
    <div class="av-ic ${stockIsLow(s) ? 'red' : 'orange'}">${icon('box')}</div>
    <div class="inv-info"><div class="n">${esc(s.name)}${stockIsLow(s) ? '<span class="status-b low">ناقص</span>' : ''}</div>
      <div class="m">${esc(spec || HG.STOCK_CATS[s.cat] || '')}</div>
      <div class="m">شراء ${s.buy === '' ? '—' : fmt(s.buy)} · بيع ${s.sell === '' ? '—' : fmt(s.sell)}${s.supplier ? ' · ' + esc(s.supplier) : ''}</div></div>
    <div class="inv-amount">${fq(s.qty)}<small>${esc(s.unit)}</small></div></div>`;
}
function openStockEdit(id) {
  const s = id ? byId('stock', id) : null;
  openSheet(s ? 'تعديل خامة' : 'خامة جديدة', `<div id="stockForm"><div class="f-grid">
    ${fText('name', 'اسم الخامة', s ? s.name : '', { wide: true, ph: 'لوح جبس عادي' })}
    ${fSel('cat', 'التصنيف', s ? s.cat : 'boards', HG.STOCK_CATS)}
    ${fText('brand', 'الشركة المصنعة', s ? s.brand : '')}
    ${fText('size', 'المقاس', s ? s.size : '', { ph: '120×240 سم' })}
    ${fText('thickness', 'السمك (مم)', s ? s.thickness : '')}
    ${fText('color', 'اللون', s ? s.color : '')}
    ${fSel('unit', 'الوحدة', s ? s.unit : 'لوح', HG.UNITS)}
    ${fNum('buy', 'سعر الشراء', s ? s.buy : '', { unit: cur().sym })}
    ${fNum('sell', 'سعر البيع', s ? s.sell : '', { unit: cur().sym })}
    ${fNum('qty', 'الكمية الحالية', s ? s.qty : 0, { min: null })}
    ${fNum('min', 'الحد الأدنى للتنبيه', s ? s.min : '')}
    ${fText('supplier', 'المورد', s ? s.supplier : '', { wide: true })}
    ${fArea('notes', 'ملاحظات', s ? s.notes : '', { rows: 2 })}
  </div>
  ${s && s.key ? `<div class="hint" style="margin-bottom:10px">الخامة دي مربوطة بنتائج الحاسبات — أسعارها بتظهر تلقائي في التسعير.</div>` : ''}
  <div class="stack">
    <button type="button" class="btn btn-accent" onclick="saveStock('${id || ''}')">${icon('check')} حفظ</button>
    ${s ? `<div class="btn-row"><button type="button" class="btn btn-soft" onclick="openMoveSheet('${s.id}','purchase')">${icon('download')} وارد</button><button type="button" class="btn btn-soft" onclick="openMoveSheet('${s.id}','waste')">${icon('alert')} هالك</button></div>
      <button type="button" class="btn btn-danger" onclick="deleteStock('${s.id}')">${icon('trash')} حذف الخامة</button>` : ''}
  </div></div>`, { focus: s ? null : '[data-k=name]' });
}
function saveStock(id) {
  const v = readForm($('stockForm'));
  if (!v.name.trim()) { toast('اكتب اسم الخامة'); return; }
  let s = id ? byId('stock', id) : null;
  if (!s) { s = { id: uid('m'), key: '' }; DB().stock.push(s); }
  Object.assign(s, v, { name: v.name.trim(), qty: Number(v.qty) || 0 });
  persist(); closeSheet(); refreshPages(); renderAll(); toast('✔️ اتحفظت الخامة');
}
function deleteStock(id) { ask('حذف الخامة من المخزون؟', () => { DB().stock = DB().stock.filter(x => x.id !== id); persist(); closeSheet(); refreshPages(); renderAll(); }, 'حذف'); }
function openMoveSheet(stockId, type) {
  const d = DB();
  openSheet(MOVE_TYPES[type] || 'حركة مخزون', `<div id="moveForm"><div class="f-grid">
    ${fSel('type', 'نوع الحركة', type, MOVE_TYPES, { wide: true })}
    ${fSel('stockId', 'الخامة', stockId || (d.stock[0] || {}).id, d.stock.map(s => ({ v: s.id, t: `${s.name}${s.thickness ? ' ' + s.thickness + ' مم' : ''} (${fq(s.qty)} ${s.unit})` })), { wide: true })}
    ${fNum('qty', 'الكمية', '', { min: null, hint: 'في «تعديل جرد» اكتب الكمية الفعلية الموجودة' })}
    ${fNum('price', 'سعر الوحدة', '', { unit: cur().sym, hint: 'فاضي = السعر المسجل' })}
    ${fSel('projectId', 'المشروع (اختياري)', '', [{ v: '', t: '— بدون —' }].concat(d.projects.map(p => ({ v: p.id, t: projName(p) }))), { wide: true })}
    ${fText('date', 'التاريخ', todayISO(), { type: 'date' })}
    ${fText('note', 'ملاحظة / المورد', '')}
  </div><label class="chk"><input type="checkbox" data-k="asExpense"> <span>سجّل قيمة المشتريات كمصروف على المشروع</span></label>
  <button type="button" class="btn btn-accent" onclick="saveMove()">${icon('check')} حفظ الحركة</button></div>`, { focus: '[data-k=qty]' });
}
function saveMove() {
  const v = readForm($('moveForm')), d = DB(), s = byId('stock', v.stockId);
  if (!s) { toast('اختار الخامة'); return; }
  const q = Number(v.qty);
  if (!(q >= 0) || (v.type !== 'adjust' && !(q > 0))) { toast('اكتب الكمية'); return; }
  const price = v.price === '' ? Number(v.type === 'sale' ? s.sell : s.buy) || 0 : Number(v.price);
  let delta = q;
  if (v.type === 'sale' || v.type === 'use' || v.type === 'waste') delta = -q;
  if (v.type === 'adjust') delta = q - (Number(s.qty) || 0);
  s.qty = HGc.round((Number(s.qty) || 0) + delta, 3);
  if (v.type === 'purchase' && v.price !== '') s.buy = price;
  d.moves.push({ id: uid('mv'), stockId: s.id, type: v.type, qty: v.type === 'adjust' ? delta : q, price, date: v.date, projectId: v.projectId || null, note: v.note });
  if (v.asExpense && v.type === 'purchase') d.expenses.push({ id: uid('e'), projectId: v.projectId || null, cat: 'purchase', amount: HGc.r2(q * price), date: v.date, note: `شراء ${s.name}` });
  persist(); closeSheet(); refreshPages(); renderAll();
  toast(stockIsLow(s) ? `⚠️ ${s.name} تحت الحد الأدنى` : '✔️ اتسجلت الحركة');
}
function openMovesLog() {
  const d = DB();
  const rows = d.moves.slice().reverse().slice(0, 300);
  let inV = 0, outV = 0, wasteV = 0;
  d.moves.forEach(m => { const v = Math.abs(Number(m.qty) || 0) * (Number(m.price) || 0); if (m.type === 'purchase') inV += v; else if (m.type === 'sale') outV += v; else if (m.type === 'waste') wasteV += v; });
  openPage(`${pageHead('سجل حركات المخزون', `${d.moves.length} حركة`)}<main class="container" style="padding-bottom:40px">
    <div class="kpis"><div class="kpi"><span>المشتريات</span><strong>${money(inV)}</strong></div><div class="kpi good"><span>المبيعات</span><strong>${money(outV)}</strong></div><div class="kpi bad"><span>قيمة الهالك</span><strong>${money(wasteV)}</strong></div><div class="kpi"><span>استخدام في مشروعات</span><strong>${d.moves.filter(m => m.type === 'use').length}</strong></div></div>
    <div class="card">${rows.map(m => { const s = byId('stock', m.stockId) || { name: 'خامة محذوفة', unit: '' }; const p = m.projectId ? byId('projects', m.projectId) : null; const neg = ['sale', 'use', 'waste'].includes(m.type) || (m.type === 'adjust' && m.qty < 0); return `<div class="entry"><div class="e-ic" style="${neg ? 'background:var(--danger-soft);color:var(--danger)' : ''}">${icon(neg ? 'upload' : 'download')}</div><div class="e-info"><div class="e-title">${esc(s.name)}</div><div class="e-meta">${esc([MOVE_TYPES[m.type], fmtDate(m.date), p ? projName(p) : '', m.note].filter(Boolean).join(' · '))}</div></div><div class="e-amt" style="color:${neg ? 'var(--danger)' : 'var(--success)'}">${neg ? '−' : '+'}${fq(Math.abs(m.qty))} <small>${esc(s.unit)}</small></div></div>`; }).join('') || '<div class="hint">مفيش حركات لسه.</div>'}</div>
  </main>`, { name: 'moves' });
}

/* =================== العمال =================== */
function openWorkersPage() { const el = openPage('', { name: 'workers', render: renderWorkersPage }); renderWorkersPage(el); hydrateIcons(el); }
function renderWorkersPage(el) {
  const d = DB();
  let due = 0;
  const cards = d.workers.map(w => { const b = HGf.workerBalance(w, d.attendance, d.advances, d.workerPays); due += b.due; return `<div class="list-card" onclick="openWorker('${w.id}')"><div class="av-ic">${icon('hardhat')}</div><div class="inv-info"><div class="n">${esc(w.name)}<span class="status-b">${w.role === 'helper' ? 'مساعد' : 'عامل / صنايعي'}</span></div><div class="m">يومية ${fmt(w.wage)} · ${fq(b.days)} يوم</div></div><div class="cust-amt ${b.due > 0 ? 'due' : 'ok'}">${fmt(b.due)}<small>مستحق له</small></div></div>`; }).join('');
  el.innerHTML = `${pageHead('العمال والمساعدين', `${d.workers.length} عامل`, `<button type="button" class="icon-btn accent" onclick="openWorkerEdit(null)" aria-label="عامل جديد">${icon('plus')}</button>`)}
  <main class="container" style="padding-bottom:40px">
    <section class="hero"><div class="hero-label">إجمالي المستحق للعمال</div><div class="hero-value">${fmt(due)}<small>${esc(cur().sym)}</small></div>
    <div class="hero-stats"><div class="hero-stat"><span>العمال</span><strong>${d.workers.length}</strong></div><div class="hero-stat"><span>اليوميات</span><strong>${d.attendance.length}</strong></div><div class="hero-stat"><span>السلف</span><strong>${fmt(d.advances.reduce((s, a) => s + (Number(a.amount) || 0), 0))}</strong></div></div></section>
    <div class="btn-row" style="margin-bottom:12px"><button type="button" class="btn btn-accent" onclick="openAttendanceSheet(null)">${icon('calendar')} تسجيل يومية</button><button type="button" class="btn btn-soft" onclick="openWorkerEdit(null)">${icon('plus')} عامل جديد</button></div>
    ${cards || `<div class="empty"><div class="big">${icon('hardhat')}</div><p>ضيف العمال والمساعدين بيومية كل واحد، وبعدها سجل أيام الشغل على كل مشروع.</p></div>`}
  </main>`;
}
function openWorkerEdit(id) {
  const w = id ? byId('workers', id) : null;
  openSheet(w ? 'تعديل بيانات العامل' : 'عامل جديد', `<div id="workerForm"><div class="f-grid">
    ${fText('name', 'الاسم', w ? w.name : '', { wide: true })}
    ${fSel('role', 'الصفة', w ? w.role : 'worker', { worker: 'عامل / صنايعي', helper: 'مساعد' })}
    ${fNum('wage', 'الأجر اليومي', w ? w.wage : '', { unit: cur().sym })}
    ${fText('phone', 'الهاتف', w ? w.phone : '', { inputmode: 'tel', dir: 'ltr', wide: true })}
  </div><div class="stack"><button type="button" class="btn btn-accent" onclick="saveWorker('${id || ''}')">${icon('check')} حفظ</button>
  ${w ? `<button type="button" class="btn btn-danger" onclick="deleteWorker('${w.id}')">${icon('trash')} حذف العامل</button>` : ''}</div></div>`, { focus: w ? null : '[data-k=name]' });
}
function saveWorker(id) {
  const v = readForm($('workerForm'));
  if (!v.name.trim()) { toast('اكتب الاسم'); return; }
  let w = id ? byId('workers', id) : null;
  if (!w) { w = { id: uid('w') }; DB().workers.push(w); }
  Object.assign(w, { name: v.name.trim(), role: v.role, wage: Number(v.wage) || 0, phone: v.phone });
  persist(); closeSheet(); refreshPages(); renderAll(); toast('✔️ اتحفظ');
}
function deleteWorker(id) {
  ask('حذف العامل وكل يومياته وسلفه؟', () => { const d = DB(); d.workers = d.workers.filter(x => x.id !== id); ['attendance', 'advances', 'workerPays'].forEach(k => { d[k] = d[k].filter(x => x.workerId !== id); }); persist(); closeSheet(); closeAll(); openWorkersPage(); renderAll(); }, 'حذف');
}
function openWorker(id) { const el = openPage('', { name: 'worker', render: e => renderWorkerPage(e, id) }); renderWorkerPage(el, id); hydrateIcons(el); }
function renderWorkerPage(el, id) {
  const d = DB(), w = byId('workers', id);
  if (!w) { el.innerHTML = pageHead('العامل اتحذف'); return; }
  const b = HGf.workerBalance(w, d.attendance, d.advances, d.workerPays);
  const ent = [];
  d.attendance.filter(a => a.workerId === id).forEach(a => { const p = byId('projects', a.projectId); const wage = a.wage !== '' && a.wage != null ? a.wage : w.wage; ent.push({ date: a.date, html: `<div class="entry" onclick="openAttendanceSheet('${a.id}')"><div class="e-ic" style="background:var(--primary-soft);color:var(--primary)">${icon('calendar')}</div><div class="e-info"><div class="e-title">${fq(a.days)} يوم × ${fmt(wage)}</div><div class="e-meta">${esc([fmtDate(a.date), p ? projName(p) : 'بدون مشروع'].join(' · '))}</div></div><div class="e-amt" style="color:var(--text)">${money((Number(a.days) || 0) * (Number(wage) || 0))}</div></div>` }); });
  d.advances.filter(a => a.workerId === id).forEach(a => ent.push({ date: a.date, html: `<div class="entry mat" onclick="openWorkerMoney('${a.id}','advances')"><div class="e-ic">${icon('cash')}</div><div class="e-info"><div class="e-title">سلفة</div><div class="e-meta">${esc([fmtDate(a.date), a.note].filter(Boolean).join(' · '))}</div></div><div class="e-amt">−${money(a.amount)}</div></div>` }));
  d.workerPays.filter(a => a.workerId === id).forEach(a => ent.push({ date: a.date, html: `<div class="entry" onclick="openWorkerMoney('${a.id}','workerPays')"><div class="e-ic">${icon('wallet')}</div><div class="e-info"><div class="e-title">قبض مستحقات</div><div class="e-meta">${esc([fmtDate(a.date), a.note].filter(Boolean).join(' · '))}</div></div><div class="e-amt">−${money(a.amount)}</div></div>` }));
  ent.sort((a, b2) => String(b2.date).localeCompare(String(a.date)));
  el.innerHTML = `${pageHead(w.name, `${w.role === 'helper' ? 'مساعد' : 'عامل / صنايعي'} · يومية ${fmt(w.wage)}`, `<button type="button" class="icon-btn" onclick="openWorkerEdit('${id}')" aria-label="تعديل">${icon('edit')}</button>`)}
  <main class="container" style="padding-bottom:40px">
    <section class="hero"><div class="hero-label">المستحق له</div><div class="hero-value">${fmt(b.due)}<small>${esc(cur().sym)}</small></div>
    <div class="hero-stats"><div class="hero-stat"><span>أيام العمل</span><strong>${fq(b.days)}</strong></div><div class="hero-stat"><span>إجمالي الأجور</span><strong>${fmt(b.wages)}</strong></div><div class="hero-stat"><span>سلف + مقبوض</span><strong>${fmt(b.advances + b.paid)}</strong></div></div></section>
    <div class="btn-row" style="margin-bottom:10px"><button type="button" class="btn btn-accent" onclick="openAttendanceSheet(null,null,'${id}')">${icon('calendar')} يومية</button><button type="button" class="btn btn-soft" onclick="openWorkerMoney(null,'advances','${id}')">${icon('cash')} سلفة</button></div>
    <button type="button" class="btn btn-ghost" style="margin-bottom:12px" onclick="openWorkerMoney(null,'workerPays','${id}')">${icon('wallet')} تسجيل قبض مستحقات</button>
    <div class="card">${ent.map(e => e.html).join('') || '<div class="hint">مفيش حركات.</div>'}</div>
  </main>`;
}
function openAttendanceSheet(id, pid, wid) {
  const d = DB(), a = id ? byId('attendance', id) : null;
  if (!d.workers.length) { toast('ضيف عامل الأول'); openWorkerEdit(null); return; }
  openSheet(a ? 'تعديل يومية' : 'تسجيل يومية عمل', `<div id="attForm"><div class="f-grid">
    ${fSel('workerId', 'العامل', a ? a.workerId : (wid || d.workers[0].id), d.workers.map(w => ({ v: w.id, t: `${w.name} (${fmt(w.wage)})` })), { wide: true })}
    ${fSel('projectId', 'المشروع', a ? a.projectId : (pid || ''), [{ v: '', t: '— بدون مشروع —' }].concat(d.projects.filter(p => !['done', 'cancelled'].includes(p.status) || (a && a.projectId === p.id) || p.id === pid).map(p => ({ v: p.id, t: projName(p) }))), { wide: true })}
    ${fText('date', 'التاريخ', a ? a.date : todayISO(), { type: 'date' })}
    ${fNum('days', 'عدد الأيام', a ? a.days : 1, { hint: 'نص يوم = 0.5' })}
    ${fNum('wage', 'اليومية (فاضي = يومية العامل)', a ? a.wage : '', { unit: cur().sym, wide: true })}
  </div><div class="stack"><button type="button" class="btn btn-accent" onclick="saveAttendance('${id || ''}')">${icon('check')} حفظ</button>
  ${a ? `<button type="button" class="btn btn-danger" onclick="delRecord('attendance','${a.id}')">${icon('trash')} حذف</button>` : ''}</div></div>`);
}
function saveAttendance(id) {
  const v = readForm($('attForm'));
  if (!(Number(v.days) > 0)) { toast('اكتب عدد الأيام'); return; }
  let a = id ? byId('attendance', id) : null;
  if (!a) { a = { id: uid('at') }; DB().attendance.push(a); }
  Object.assign(a, { workerId: v.workerId, projectId: v.projectId || null, date: v.date, days: Number(v.days), wage: v.wage === '' ? '' : Number(v.wage) });
  persist(); closeSheet(); refreshPages(); renderAll(); toast('✔️ اتسجلت اليومية');
}
function openWorkerMoney(id, list, wid) {
  const a = id ? byId(list, id) : null, d = DB();
  const title = list === 'advances' ? 'سلفة' : 'قبض مستحقات';
  openSheet(a ? 'تعديل ' + title : title, `<div id="wmForm"><div class="f-grid">
    ${fSel('workerId', 'العامل', a ? a.workerId : wid, d.workers.map(w => ({ v: w.id, t: w.name })), { wide: true })}
    ${fNum('amount', 'المبلغ', a ? a.amount : '', { unit: cur().sym })}
    ${fText('date', 'التاريخ', a ? a.date : todayISO(), { type: 'date' })}
    ${fText('note', 'ملاحظة', a ? a.note : '', { wide: true })}
  </div><div class="stack"><button type="button" class="btn btn-accent" onclick="saveWorkerMoney('${id || ''}','${list}')">${icon('check')} حفظ</button>
  ${a ? `<button type="button" class="btn btn-danger" onclick="delRecord('${list}','${a.id}')">${icon('trash')} حذف</button>` : ''}</div></div>`, { focus: '[data-k=amount]' });
}
function saveWorkerMoney(id, list) {
  const v = readForm($('wmForm'));
  if (!(Number(v.amount) > 0)) { toast('اكتب المبلغ'); return; }
  let a = id ? byId(list, id) : null;
  if (!a) { a = { id: uid('wm') }; DB()[list].push(a); }
  Object.assign(a, { workerId: v.workerId, amount: Number(v.amount), date: v.date, note: v.note });
  persist(); closeSheet(); refreshPages(); renderAll(); toast('✔️ اتحفظ');
}
function delRecord(list, id) { ask('حذف السجل ده؟', () => { DB()[list] = DB()[list].filter(x => x.id !== id); persist(); closeSheet(); refreshPages(); renderAll(); }, 'حذف'); }

/* =================== المصروفات =================== */
function expenseRowHTML(e) {
  const p = e.projectId ? byId('projects', e.projectId) : null;
  return `<div class="entry mat" onclick="openExpenseSheet('${e.id}')"><div class="e-ic">${icon(e.cat === 'transport' ? 'truck' : 'wallet')}</div><div class="e-info"><div class="e-title">${esc(HGf.EXPENSE_CATS[e.cat] || 'مصروف')}${e.note ? ' — ' + esc(e.note) : ''}</div><div class="e-meta">${esc([fmtDate(e.date), p ? projName(p) : 'مصروف عام'].join(' · '))}</div></div><div class="e-amt">${money(e.amount)}</div></div>`;
}
function openExpensesPage() { const el = openPage('', { name: 'expenses', render: renderExpensesPage }); renderExpensesPage(el); hydrateIcons(el); }
function renderExpensesPage(el) {
  const d = DB();
  const total = d.expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const general = d.expenses.filter(e => !e.projectId).reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const byCat = {}; d.expenses.forEach(e => { byCat[e.cat] = (byCat[e.cat] || 0) + (Number(e.amount) || 0); });
  el.innerHTML = `${pageHead('المصروفات', `${d.expenses.length} مصروف`, `<button type="button" class="icon-btn accent" onclick="openExpenseSheet(null)" aria-label="مصروف جديد">${icon('plus')}</button>`)}
  <main class="container" style="padding-bottom:40px">
    <section class="hero"><div class="hero-label">إجمالي المصروفات</div><div class="hero-value">${fmt(total)}<small>${esc(cur().sym)}</small></div>
    <div class="hero-stats"><div class="hero-stat"><span>على المشروعات</span><strong>${fmt(total - general)}</strong></div><div class="hero-stat"><span>مصروفات عامة</span><strong>${fmt(general)}</strong></div><div class="hero-stat"><span>العدد</span><strong>${d.expenses.length}</strong></div></div></section>
    <div class="filter-chips">${Object.keys(byCat).map(k => `<span class="chip">${esc(HGf.EXPENSE_CATS[k] || k)}: ${fmt(byCat[k])}</span>`).join('')}</div>
    <button type="button" class="btn btn-accent" style="margin-bottom:12px" onclick="openExpenseSheet(null)">${icon('plus')} مصروف جديد</button>
    <div class="card">${d.expenses.slice().reverse().map(expenseRowHTML).join('') || '<div class="hint">مفيش مصروفات.</div>'}</div>
  </main>`;
}
function openExpenseSheet(id, pid) {
  const e = id ? byId('expenses', id) : null, d = DB();
  openSheet(e ? 'تعديل مصروف' : 'مصروف جديد', `<div id="expForm"><div class="f-grid">
    ${fSel('cat', 'نوع المصروف', e ? e.cat : 'transport', HGf.EXPENSE_CATS)}
    ${fNum('amount', 'المبلغ', e ? e.amount : '', { unit: cur().sym })}
    ${fSel('projectId', 'المشروع', e ? e.projectId : (pid || ''), [{ v: '', t: '— مصروف عام —' }].concat(d.projects.map(p => ({ v: p.id, t: projName(p) }))), { wide: true })}
    ${fText('date', 'التاريخ', e ? e.date : todayISO(), { type: 'date' })}
    ${fText('note', 'البيان', e ? e.note : '', { ph: 'نقل ألواح من المخزن' })}
  </div><div class="stack"><button type="button" class="btn btn-accent" onclick="saveExpense('${id || ''}')">${icon('check')} حفظ</button>
  ${e ? `<button type="button" class="btn btn-danger" onclick="delRecord('expenses','${e.id}')">${icon('trash')} حذف</button>` : ''}</div></div>`, { focus: '[data-k=amount]' });
}
function saveExpense(id) {
  const v = readForm($('expForm'));
  if (!(Number(v.amount) > 0)) { toast('اكتب المبلغ'); return; }
  let e = id ? byId('expenses', id) : null;
  if (!e) { e = { id: uid('e') }; DB().expenses.push(e); }
  Object.assign(e, { cat: v.cat, amount: Number(v.amount), projectId: v.projectId || null, date: v.date, note: v.note });
  persist(); closeSheet(); refreshPages(); renderAll(); toast('✔️ اتسجل المصروف');
}

/* =================== النوتة =================== */
let noteFilter = 'all';
function noteCardHTML(n) {
  const c = n.customerId ? byId('customers', n.customerId) : null, p = n.projectId ? byId('projects', n.projectId) : null;
  return `<div class="note-card${n.done ? ' done' : ''}" onclick="openNoteSheet('${n.id}')"><div class="nt">${esc(n.title || HG.NOTE_TYPES[n.type] || 'ملاحظة')}<span class="status-b">${esc(HG.NOTE_TYPES[n.type] || '')}</span></div>${n.body ? `<div class="nb">${esc(n.body)}</div>` : ''}
    <div class="nm">${esc([fmtDate(n.date), n.due ? '⏰ ' + fmtDate(n.due) : '', c ? c.name : '', p ? projName(p) : ''].filter(Boolean).join(' · '))}</div></div>`;
}
function openNotesPage() { const el = openPage('', { name: 'notes', render: renderNotesPage }); renderNotesPage(el); hydrateIcons(el); }
function renderNotesPage(el) {
  const d = DB();
  const q = ((el.querySelector('#noteSearch') || {}).value || '').trim().toLowerCase();
  let list = d.notes.slice().reverse();
  if (noteFilter === 'open') list = list.filter(n => !n.done);
  else if (noteFilter !== 'all') list = list.filter(n => n.type === noteFilter);
  if (q) list = list.filter(n => [n.title, n.body].join(' ').toLowerCase().includes(q));
  const upcoming = d.notes.filter(n => n.due && !n.done && n.due >= todayISO()).sort((a, b) => a.due.localeCompare(b.due)).slice(0, 3);
  el.innerHTML = `${pageHead('النوتة', 'مقاسات، اتفاقات، مواعيد، ديون، تعديلات', `<button type="button" class="icon-btn accent" onclick="openNoteSheet(null)" aria-label="ملاحظة جديدة">${icon('plus')}</button>`)}
  <main class="container" style="padding-bottom:40px">
    ${upcoming.length ? `<div class="ok-box" style="margin:0 0 12px"><b>مواعيد جاية:</b> ${upcoming.map(n => `${esc(n.title || 'موعد')} (${fmtDate(n.due)})`).join('، ')}</div>` : ''}
    <div class="field"><input type="search" id="noteSearch" placeholder="ابحث في النوتة..." value="${esc(q)}" oninput="refreshPages()"></div>
    <div class="filter-chips">${[['all', 'الكل'], ['open', 'مفتوحة']].concat(Object.keys(HG.NOTE_TYPES).map(k => [k, HG.NOTE_TYPES[k]])).map(([k, t]) => `<button type="button" class="chip${noteFilter === k ? ' on' : ''}" onclick="noteFilter='${k}';refreshPages()">${esc(t)}</button>`).join('')}</div>
    ${list.map(noteCardHTML).join('') || `<div class="empty"><div class="big">${icon('note')}</div><p>اكتب مقاسات الأماكن، اتفاقات الأسعار، المواعيد والتعديلات — واربط كل ملاحظة بعميل أو مشروع.</p></div>`}
  </main>`;
  const s = el.querySelector('#noteSearch'); if (s && q) { s.focus(); s.setSelectionRange(q.length, q.length); }
}
function openNoteSheet(id, pre) {
  const n = id ? byId('notes', id) : null, d = DB();
  pre = pre || {};
  openSheet(n ? 'تعديل ملاحظة' : 'ملاحظة جديدة', `<div id="noteForm"><div class="f-grid">
    ${fSel('type', 'النوع', n ? n.type : (pre.type || 'general'), HG.NOTE_TYPES)}
    ${fText('date', 'التاريخ', n ? n.date : todayISO(), { type: 'date' })}
    ${fText('title', 'العنوان', n ? n.title : '', { wide: true, ph: 'مقاسات سقف الريسبشن' })}
    ${fArea('body', 'التفاصيل', n ? n.body : '', { rows: 5, ph: 'الطول 5.20 × العرض 4.10 ...' })}
    ${fSel('customerId', 'العميل', n ? n.customerId : (pre.customerId || ''), [{ v: '', t: '— بدون —' }].concat(d.customers.map(c => ({ v: c.id, t: c.name }))))}
    ${fSel('projectId', 'المشروع', n ? n.projectId : (pre.projectId || ''), [{ v: '', t: '— بدون —' }].concat(d.projects.map(p => ({ v: p.id, t: projName(p) }))))}
    ${fText('due', 'موعد / تذكير', n ? n.due : '', { type: 'date' })}
    ${fChk('done', 'تمت', n ? n.done : false)}
  </div><div class="stack"><button type="button" class="btn btn-accent" onclick="saveNote('${id || ''}')">${icon('check')} حفظ</button>
  ${n ? `<button type="button" class="btn btn-danger" onclick="delRecord('notes','${n.id}')">${icon('trash')} حذف</button>` : ''}</div></div>`, { focus: n ? null : '[data-k=title]' });
}
function saveNote(id) {
  const v = readForm($('noteForm'));
  if (!v.title.trim() && !v.body.trim()) { toast('اكتب الملاحظة'); return; }
  let n = id ? byId('notes', id) : null;
  if (!n) { n = { id: uid('n') }; DB().notes.push(n); }
  Object.assign(n, { type: v.type, date: v.date, title: v.title.trim(), body: v.body, customerId: v.customerId || null, projectId: v.projectId || null, due: v.due, done: !!v.done });
  persist(); closeSheet(); refreshPages(); renderAll(); toast('✔️ اتحفظت');
}
