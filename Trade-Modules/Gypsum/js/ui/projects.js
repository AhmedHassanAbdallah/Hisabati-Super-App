/*
 * حساباتي للجبس والديكورات — العملاء والمشروعات والبنود والمدفوعات
 * © 2026 أحمد حسن عبدالله - جميع الحقوق محفوظة.
 */
'use strict';
const PAY_METHODS = ['نقدي', 'تحويل بنكي', 'محفظة إلكترونية', 'شيك', 'أخرى'];

function projCtx(p) {
  const d = DB();
  return {
    payments: d.payments.filter(x => x.projectId === p.id),
    expenses: d.expenses.filter(x => x.projectId === p.id),
    attendance: d.attendance.filter(x => x.projectId === p.id),
    workers: d.workers
  };
}
function projTotals(p) { return HGf.projectTotals(p, projCtx(p)); }
function projCustomer(p) { return p && p.customerId ? byId('customers', p.customerId) : null; }
function projName(p) { return (p && (p.name || (projCustomer(p) || {}).name)) || 'مشروع بدون اسم'; }
function statusBadge(s) { return `<span class="status-b ${esc(s || 'active')}">${esc(HGf.PROJECT_STATUS[s] || HGf.PROJECT_STATUS.active)}</span>`; }

/* ---------------- قائمة المشروعات ---------------- */
let projFilter = 'open';
function projectCardHTML(p) {
  const t = projTotals(p), c = projCustomer(p);
  return `<div class="list-card" onclick="openProject('${p.id}')">
    <div class="inv-avatar">${initial(projName(p))}</div>
    <div class="inv-info"><div class="n">${esc(projName(p))}${statusBadge(p.status)}</div>
      <div class="m">${esc([c && c.name !== projName(p) ? c.name : '', p.workType, fmtDate(p.startDate)].filter(Boolean).join(' · ') || `${p.items.length} بند`)}</div></div>
    <div class="inv-amount">${fmt(t.revenue)}<small>${t.due > 0 ? 'متبقي ' + fmt(t.due) : t.revenue > 0 ? 'خالص' : cur().sym}</small></div>
  </div>`;
}
function renderProjects() {
  const q = ($('projSearch') || {}).value ? $('projSearch').value.trim().toLowerCase() : '';
  let list = DB().projects.slice().reverse();
  if (projFilter === 'open') list = list.filter(p => !['done', 'cancelled'].includes(p.status));
  else if (projFilter !== 'all') list = list.filter(p => p.status === projFilter);
  if (q) list = list.filter(p => [projName(p), (projCustomer(p) || {}).name, (projCustomer(p) || {}).phone, p.address, p.workType].join(' ').toLowerCase().includes(q));
  $('projFilter').innerHTML = [['open', 'الجارية'], ['all', 'الكل'], ['quote', 'عروض أسعار'], ['done', 'تم التسليم'], ['cancelled', 'ملغي']]
    .map(([k, t]) => `<button type="button" class="chip${projFilter === k ? ' on' : ''}" onclick="projFilter='${k}';renderProjects()">${t}</button>`).join('');
  $('projList').innerHTML = list.length ? list.map(projectCardHTML).join('')
    : `<div class="empty"><div class="big">${icon('briefcase')}</div><p>${DB().projects.length ? 'مفيش مشروعات بالفلتر ده' : 'لسه مفيش مشروعات — ابدأ بمشروع جديد أو احسب من الحاسبات وضيف للمشروع'}</p></div>`;
}

/* ---------------- إنشاء / تعديل مشروع ---------------- */
function customerDatalist() { return `<datalist id="custNames">${DB().customers.map(c => `<option value="${esc(c.name)}">`).join('')}</datalist>`; }
function openProjectEdit(id, cb, preCustomerId) {
  const p = id ? byId('projects', id) : null;
  const c = p ? projCustomer(p) : (preCustomerId ? byId('customers', preCustomerId) : null);
  openSheet(p ? 'تعديل بيانات المشروع' : 'مشروع جديد', `<div id="projForm">
    <div class="f-grid">
      ${fText('custName', 'اسم العميل', c ? c.name : '', { list: 'custNames', ph: 'اكتب أو اختار من العملاء', wide: true })}
      ${fText('custPhone', 'رقم الهاتف', c ? c.phone : '', { inputmode: 'tel', dir: 'ltr', ph: '01xxxxxxxxx' })}
      ${fText('name', 'اسم المشروع', p ? p.name : '', { ph: 'مثال: شقة المعادي' })}
      ${fText('address', 'عنوان المشروع', p ? p.address : (c ? c.address : ''), { wide: true, ph: 'المنطقة - الشارع - العمارة - الدور' })}
      ${fText('workType', 'نوع العمل', p ? p.workType : '', { list: 'workTypes', ph: 'أسقف جبسون بورد' })}
      ${fSel('status', 'حالة المشروع', p ? p.status : 'active', HGf.PROJECT_STATUS)}
      ${fText('startDate', 'تاريخ بداية التنفيذ', p ? p.startDate : todayISO(), { type: 'date' })}
      ${fText('endDate', 'تاريخ التسليم', p ? p.endDate : '', { type: 'date' })}
      ${fSel('scope', 'نوع الاتفاق الافتراضي', p ? p.scope : DB().settings.defaultScope, HGf.SCOPES, { wide: true })}
      ${fArea('notes', 'ملاحظات', p ? p.notes : '', { ph: 'اتفاقات، مواعيد، تفاصيل...' })}
    </div>
    ${customerDatalist()}<datalist id="workTypes">${HG.WORK_TYPES.map(w => `<option value="${esc(w)}">`).join('')}</datalist>
    <div class="stack">
      <button type="button" class="btn btn-accent" onclick="saveProjectEdit('${p ? p.id : ''}')">${icon('check')} حفظ</button>
      ${p ? `<button type="button" class="btn btn-danger" onclick="deleteProject('${p.id}')">${icon('trash')} حذف المشروع</button>` : ''}
    </div></div>`, { focus: p ? null : '[data-k=custName]' });
  projEditCb = cb || null;
}
let projEditCb = null;
function findOrCreateCustomer(name, phone, address) {
  name = (name || '').trim(); phone = (phone || '').trim();
  if (!name && !phone) return null;
  const d = DB();
  let c = d.customers.find(x => name && x.name.trim() === name) || d.customers.find(x => phone && x.phone && x.phone.trim() === phone);
  if (!c) { c = { id: uid('c'), name: name || phone, phone, address: address || '', notes: '', created: todayISO() }; d.customers.push(c); }
  else { if (phone && !c.phone) c.phone = phone; if (address && !c.address) c.address = address; }
  return c;
}
function saveProjectEdit(id) {
  const v = readForm($('projForm'));
  const c = findOrCreateCustomer(v.custName, v.custPhone, v.address);
  let p = id ? byId('projects', id) : null;
  if (!p) {
    p = { id: uid('p'), items: [], additions: [], discount: 0, created: todayISO() };
    DB().projects.push(p);
  }
  Object.assign(p, { customerId: c ? c.id : null, name: v.name.trim(), address: v.address.trim(), workType: v.workType.trim(), status: v.status, startDate: v.startDate, endDate: v.endDate, scope: v.scope, notes: v.notes, updated: todayISO() });
  persist(); closeSheet();
  toast('✔️ اتحفظ المشروع');
  const cb = projEditCb; projEditCb = null;
  renderAll(); refreshPages();
  if (cb) cb(p.id); else if (!id) openProject(p.id);
}
function deleteProject(id) {
  const p = byId('projects', id); if (!p) return;
  const d = DB();
  const pays = d.payments.filter(x => x.projectId === id).length;
  ask(`حذف مشروع «${projName(p)}» بكل بنوده${pays ? ` و${pays} دفعة` : ''} ومصروفاته؟\nالحذف نهائي.`, () => {
    d.projects = d.projects.filter(x => x.id !== id);
    ['payments', 'expenses', 'attendance'].forEach(k => { d[k] = d[k].filter(x => x.projectId !== id); });
    d.notes.forEach(n => { if (n.projectId === id) n.projectId = null; });
    d.docs.forEach(n => { if (n.projectId === id) n.projectId = null; });
    persist(); closeSheet(true); closeAll(); renderAll(); toast('اتحذف المشروع');
  }, 'حذف');
}
/** اختيار مشروع (من الحاسبة) */
function pickProject(cb) {
  const list = DB().projects.filter(p => p.status !== 'cancelled').slice().reverse();
  openSheet('اختار المشروع', `
    <button type="button" class="create-opt dark" style="margin-bottom:10px" onclick="openProjectEdit(null, pickedNew)"><span class="q-ic orange">${icon('plus')}</span><span><b>مشروع جديد</b><small>اكتب اسم العميل والعنوان</small></span></button>
    <div class="pick-list">${list.map(p => `<button type="button" class="action-item" style="margin-bottom:8px" onclick="closeSheet();pickedProject('${p.id}')"><span class="a-ic">${initial(projName(p))}</span><span style="flex:1;min-width:0">${esc(projName(p))}<small>${esc([(projCustomer(p) || {}).name, p.items.length + ' بند'].filter(Boolean).join(' · '))}</small></span></button>`).join('') || '<div class="hint">مفيش مشروعات لسه.</div>'}</div>`);
  pickCb = cb;
}
let pickCb = null;
function pickedProject(id) { const cb = pickCb; pickCb = null; if (cb) cb(id); }
function pickedNew(id) { pickedProject(id); }

/* ---------------- صفحة المشروع ---------------- */
function openProject(id) {
  const p = byId('projects', id); if (!p) return;
  const el = openPage('', { name: 'project', render: e => renderProjectPage(e, id) });
  el.dataset.tab = 'items';
  renderProjectPage(el, id);
  hydrateIcons(el);
}
function projTab(btn, tab) { const el = btn.closest('.page-overlay'); el.dataset.tab = tab; refreshPages(); }
function renderProjectPage(el, id) {
  const p = byId('projects', id);
  if (!p) { el.innerHTML = pageHead('المشروع اتحذف'); return; }
  const t = projTotals(p), c = projCustomer(p), tab = el.dataset.tab || 'items';
  const tabs = [['items', `البنود (${p.items.length})`], ['acc', 'الحسابات'], ['pay', 'المدفوعات'], ['cost', 'التكاليف والعمال'], ['docs', 'المستندات'], ['notes', 'ملاحظات']];
  let body = '';
  if (tab === 'items') body = projItemsHTML(p);
  else if (tab === 'acc') body = projAccHTML(p, t);
  else if (tab === 'pay') body = projPayHTML(p, t);
  else if (tab === 'cost') body = projCostHTML(p, t);
  else if (tab === 'docs') body = projDocsHTML(p);
  else body = projNotesHTML(p);
  el.innerHTML = `<div class="page-head"><header class="app-header">
      <button type="button" class="icon-btn" onclick="closePage()" aria-label="رجوع">${icon('back')}</button>
      <div class="titles"><h1>${esc(projName(p))}</h1><div class="sub">${esc([c ? c.name : '', p.address].filter(Boolean).join(' — ') || 'اضغط ✎ لإضافة بيانات العميل')}</div></div>
      <button type="button" class="icon-btn" onclick="openProjectEdit('${p.id}')" aria-label="تعديل">${icon('edit')}</button>
      <button type="button" class="icon-btn accent" onclick="openDocBuilder('${p.id}')" aria-label="المستندات">${icon('printer')}</button>
    </header>
    <nav class="tabs">${tabs.map(([k, l]) => `<button type="button" class="${tab === k ? 'on' : ''}" onclick="projTab(this,'${k}')">${l}</button>`).join('')}</nav></div>
    <main class="container" style="padding-bottom:40px">
      <section class="hero">
        <div class="hero-label">إجمالي قيمة المشروع ${statusBadge(p.status)}</div>
        <div class="hero-value">${fmt(t.revenue)}<small>${esc(cur().sym)}</small></div>
        <div class="hero-stats">
          <div class="hero-stat"><span>المستلم فعلياً</span><strong>${fmt(t.paid)}</strong></div>
          <div class="hero-stat"><span>المتبقي</span><strong>${fmt(t.due)}</strong></div>
          <div class="hero-stat"><span>صافي الربح</span><strong>${fmt(t.profit)}</strong></div>
        </div>
      </section>
      ${body}
    </main>`;
}
function itemCardHTML(p, it) {
  const a = HGf.itemAmounts(it);
  const m = HGf.METHODS[it.method] || {};
  const meta = [a.lump ? m.name : `${fq(it.qty)} ${HGf.unitOf(it)} × ${fmt(a.unitPrice)}`, HGf.SCOPES[a.scope].short];
  if (it.materials && it.materials.length) meta.push(`${it.materials.length} خامة`);
  return `<div class="item-card" onclick="openItemSheet('${p.id}','${it.id}')">
    <div class="room-num">${icon(it.section === 'plaster' ? 'trowel' : it.section === 'decor' ? 'frame' : it.section === 'board' ? 'layers' : 'hammer')}</div>
    <div class="i-info"><div class="i-name">${esc(it.name || 'بند')}${it.deducted ? '<span class="src-badge">مخصوم من المخزون</span>' : ''}</div><div class="i-meta">${esc(meta.join(' · '))}</div>${it.notes ? `<div class="i-meta">${esc(it.notes)}</div>` : ''}</div>
    <div class="i-amt">${fmt(a.client)}<small>${a.cost ? 'تكلفة ' + fmt(a.cost) : cur().sym}</small></div></div>`;
}
function projItemsHTML(p) {
  const secs = Object.keys(HGf.SECTIONS).filter(s => p.items.some(it => (it.section || 'other') === s));
  return `<div class="btn-row" style="margin-bottom:12px">
      <button type="button" class="btn btn-accent" onclick="addFromCalc('${p.id}')">${icon('calc')} من الحاسبات</button>
      <button type="button" class="btn btn-soft" onclick="openItemSheet('${p.id}',null)">${icon('plus')} بند يدوي</button>
    </div>
    ${secs.length ? secs.map(s => {
      const its = p.items.filter(it => (it.section || 'other') === s);
      const sum = its.reduce((x, it) => x + HGf.itemAmounts(it).client, 0);
      return `<div class="sec-title">${esc(HGf.SECTIONS[s])}<span class="sp"></span><span class="amt">${money(sum)}</span></div>${its.map(it => itemCardHTML(p, it)).join('')}`;
    }).join('') : `<div class="empty"><div class="big">${icon('list')}</div><p>ضيف بنود المشروع: سقف بالمتر المربع، بيت نور بالمتر الطولي، بانوهات بالقطعة، أو أي شغل بالمقطوعية.</p></div>`}`;
}
function projAccHTML(p, t) {
  const row = (l, v, cls) => `<div class="sum-row ${cls || ''}"><span>${l}</span><strong>${money(v)}</strong></div>`;
  return `<div class="card"><div class="card-title"><div class="t-ic orange">${icon('calc')}</div><h2>حساب العميل</h2></div>
    <div class="sum-list">
      ${t.labor ? row('المصنعية / التركيب', t.labor) : ''}${t.fab ? row('التصنيع', t.fab) : ''}${t.materials ? row('الخامات (سعر البيع)', t.materials) : ''}
      ${row('إجمالي البنود', t.subtotal, 'bold')}
      ${t.discount ? row('الخصم', -t.discount, 'minus') : ''}
      ${(p.additions || []).map(a => row(esc(a.name || 'إضافة'), a.amount)).join('')}
    </div>
    <div class="sum-total"><span>الإجمالي النهائي على العميل</span><strong>${money(t.revenue)}</strong></div>
    <div class="sum-list" style="margin-top:8px">${row('المستلم فعلياً', t.paid)}${row('المتبقي (ديون مستحقة)', t.due, t.due > 0 ? 'minus' : '')}</div>
    <button type="button" class="btn btn-soft" style="margin-top:12px" onclick="openAdjustSheet('${p.id}')">${icon('edit')} الخصم والإضافات (نقل، تحميل...)</button>
  </div>
  <div class="card"><div class="card-title"><div class="t-ic">${icon('chart')}</div><h2>التكلفة والربح</h2><span class="tag">${fmt(t.margin)}%</span></div>
    <div class="sum-list">
      ${row('تكلفة الخامات (شراء)', t.matCost)}${t.fabCost ? row('تكلفة التصنيع', t.fabCost) : ''}${t.extraCost ? row('تكاليف إضافية على البنود', t.extraCost) : ''}
      ${row('أجور العمال', t.wages)}${row('المصروفات', t.expenses)}
      ${row('إجمالي التكاليف', t.cost, 'bold')}
    </div>
    <div class="sum-total"><span>صافي الربح</span><strong>${money(t.profit)}</strong></div>
    <div class="hint" style="margin-top:8px">صافي الربح = إجمالي الإيرادات − إجمالي تكاليف المشروع. الإيراد غير المبلغ المستلم فعلياً.</div>
  </div>`;
}
function projPayHTML(p, t) {
  const pays = DB().payments.filter(x => x.projectId === p.id).slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return `<button type="button" class="btn btn-accent" style="margin-bottom:12px" onclick="openPaymentSheet(null,'${p.id}')">${icon('cash')} تسجيل دفعة من العميل</button>
    <div class="card">${pays.length ? pays.map(x => `<div class="entry" onclick="openPaymentSheet('${x.id}')"><div class="e-ic">${icon('cash')}</div><div class="e-info"><div class="e-title">${money(x.amount)}</div><div class="e-meta">${esc([fmtDate(x.date), x.method, x.note].filter(Boolean).join(' · '))}</div></div>
      <button type="button" class="btn btn-ghost btn-sm" onclick="event.stopPropagation();makeReceipt('${x.id}')">${icon('printer')} إيصال</button></div>`).join('') : '<div class="hint">لسه مفيش دفعات.</div>'}</div>
    <div class="sum-list">${[['إجمالي المشروع', t.revenue], ['المستلم', t.paid], ['المتبقي', t.due]].map(([l, v]) => `<div class="sum-row"><span>${l}</span><strong>${money(v)}</strong></div>`).join('')}</div>`;
}
function projCostHTML(p, t) {
  const d = DB();
  const exps = d.expenses.filter(x => x.projectId === p.id);
  const att = d.attendance.filter(x => x.projectId === p.id);
  const supplied = p.items.filter(it => it.scope !== 'labor' && (it.materials || []).length && !it.deducted).length;
  return `<div class="btn-row" style="margin-bottom:10px">
      <button type="button" class="btn btn-soft" onclick="openExpenseSheet(null,'${p.id}')">${icon('truck')} مصروف</button>
      <button type="button" class="btn btn-soft" onclick="openAttendanceSheet(null,'${p.id}')">${icon('hardhat')} يومية عامل</button>
    </div>
    ${supplied ? `<button type="button" class="btn btn-ghost" style="margin-bottom:12px" onclick="deductProjectStock('${p.id}')">${icon('box')} خصم خامات المشروع من المخزون (${supplied} بند)</button>` : ''}
    <div class="sec-title">العمال والمساعدين<span class="sp"></span><span class="amt">${money(t.wages)}</span></div>
    <div class="card">${att.length ? att.slice().reverse().map(a => { const w = byId('workers', a.workerId) || {}; const wage = a.wage !== '' && a.wage != null ? a.wage : w.wage; return `<div class="entry" onclick="openAttendanceSheet('${a.id}')"><div class="e-ic" style="background:var(--primary-soft);color:var(--primary)">${icon('hardhat')}</div><div class="e-info"><div class="e-title">${esc(w.name || 'عامل')}</div><div class="e-meta">${esc(fmtDate(a.date))} · ${fq(a.days)} يوم × ${fmt(wage)}</div></div><div class="e-amt" style="color:var(--text)">${money((Number(a.days) || 0) * (Number(wage) || 0))}</div></div>`; }).join('') : '<div class="hint">مفيش يوميات مسجلة على المشروع.</div>'}</div>
    <div class="sec-title">المصروفات<span class="sp"></span><span class="amt">${money(t.expenses)}</span></div>
    <div class="card">${exps.length ? exps.slice().reverse().map(expenseRowHTML).join('') : '<div class="hint">مفيش مصروفات (نقل، تحميل وتنزيل، إيجار...).</div>'}</div>
    <div class="note">مشتريات الخامات اللي في البنود بتتحسب تكلفتها من «سعر الشراء» تلقائياً — سجّل هنا بس المصروفات اللي مش داخلة في البنود عشان متتحسبش مرتين.</div>`;
}
function projDocsHTML(p) {
  const docs = DB().docs.filter(d => d.projectId === p.id).slice().reverse();
  return `<button type="button" class="btn btn-accent" style="margin-bottom:12px" onclick="openDocBuilder('${p.id}')">${icon('file')} إنشاء فاتورة / مقايسة / عرض سعر</button>
    ${docs.length ? docs.map(docCardHTML).join('') : '<div class="hint" style="text-align:center">لسه مفيش مستندات محفوظة للمشروع ده.</div>'}`;
}
function projNotesHTML(p) {
  const ns = DB().notes.filter(n => n.projectId === p.id).slice().reverse();
  return `<button type="button" class="btn btn-soft" style="margin-bottom:12px" onclick="openNoteSheet(null,{projectId:'${p.id}',customerId:'${p.customerId || ''}'})">${icon('plus')} ملاحظة / مقاسات / اتفاق</button>
    ${p.notes ? `<div class="note-card"><div class="nt">ملاحظات المشروع</div><div class="nb">${esc(p.notes)}</div></div>` : ''}
    ${ns.map(noteCardHTML).join('') || (p.notes ? '' : '<div class="hint" style="text-align:center">مفيش ملاحظات.</div>')}`;
}
function addFromCalc(pid) {
  openSheet('اختار الحاسبة', `<div class="calc-grid">${CALC_ORDER.map(id => `<button type="button" class="calc-tile" onclick="closeSheet(true);openCalc('${id}',null,'${pid}')"><span class="q-ic orange-soft">${icon(CALCS[id].icon)}</span><b>${esc(CALCS[id].title.replace('حاسبة ', ''))}</b><small>${esc(CALCS[id].sub)}</small></button>`).join('')}</div>`);
}

/* ---------------- الخصم والإضافات ---------------- */
function openAdjustSheet(pid) {
  const p = byId('projects', pid);
  openSheet('الخصم والإضافات', `<div id="adjForm">
    ${fNum('discount', 'خصم للعميل', p.discount, { unit: cur().sym })}
    <div class="sec-title">إضافات على العميل</div>
    ${rowsField('additions', [{ k: 'name', label: 'البند', type: 'text', ph: 'نقل خامات' }, { k: 'amount', label: 'المبلغ', ph: '0' }], p.additions, { label: 'إضافة', add: 'إضافة بند', colsN: 2 })}
    <button type="button" class="btn btn-accent" onclick="saveAdjust('${pid}')">${icon('check')} حفظ</button></div>`);
}
function saveAdjust(pid) {
  const p = byId('projects', pid), v = readForm($('adjForm'));
  p.discount = Number(v.discount) || 0;
  p.additions = (v.additions || []).filter(a => a.name || Number(a.amount)).map(a => ({ name: a.name || 'إضافة', amount: Number(a.amount) || 0 }));
  persist(); closeSheet(); refreshPages(); renderAll(); toast('✔️ اتحفظ');
}

/* ---------------- البنود ---------------- */
function itemFormHTML(it, pid) {
  const lump = HGf.isLump(it.method), sc = it.scope || 'labor';
  const stockOpts = DB().stock.map(s => ({ v: s.id, t: `${s.name}${s.thickness ? ' ' + s.thickness + ' مم' : ''}${s.size ? ' — ' + s.size : ''}` }));
  return `<div id="itemForm">
    <div class="f-grid">
      ${fText('name', 'اسم البند', it.name, { wide: true, ph: 'سقف جبسون بورد الصالة' })}
      ${fSel('section', 'القسم', it.section || 'board', HGf.SECTIONS)}
      ${fSel('scope', 'نوع الاتفاق', sc, Object.keys(HGf.SCOPES).map(k => ({ v: k, t: HGf.SCOPES[k].short })), { onchange: 'itemRebuild()' })}
      ${fSel('method', 'طريقة المحاسبة', it.method || 'm2', HGf.METHODS, { onchange: 'itemMethod(this)', wide: true })}
      ${lump ? fNum('lumpSum', 'المبلغ الشامل', it.lumpSum, { unit: cur().sym }) : `
        ${fNum('qty', 'الكمية', it.qty)}
        ${fText('unit', 'الوحدة', it.unit || (HGf.METHODS[it.method] || {}).unit, { list: 'unitList' })}
        ${sc !== 'supply' ? fNum('laborRate', sc === 'fab_install' ? 'سعر التركيب للوحدة' : 'سعر المصنعية للوحدة', it.laborRate, { unit: cur().sym }) : ''}
        ${sc === 'fab_install' ? fNum('fabRate', 'سعر التصنيع للوحدة (للعميل)', it.fabRate, { unit: cur().sym }) : ''}`}
      ${sc === 'fab_install' ? fNum('fabCost', lump ? 'تكلفة التصنيع الإجمالية عليك' : 'تكلفة التصنيع للوحدة (عليك)', it.fabCost, { unit: cur().sym }) : ''}
      ${fNum('extraCost', 'تكلفة إضافية على البند (عليك)', it.extraCost, { unit: cur().sym, hint: 'مثلاً مقاول باطن أو خدمة' })}
      ${lump ? fNum('donePct', 'نسبة المنفذ للمستخلص', it.donePct, { unit: '%' }) : fNum('doneQty', 'الكمية المنفذة (للمستخلص)', it.doneQty)}
      ${fArea('notes', 'وصف / ملاحظات', it.notes, { rows: 2 })}
    </div>
    <datalist id="unitList">${['م²', 'م.ط', 'قطعة', 'عدد', 'يوم', 'مرحلة', 'كجم', 'طن', 'شيكارة', 'لوح'].map(u => `<option value="${u}">`).join('')}</datalist>
    <div class="sec-title">${icon('box')} الخامات<span class="sp"></span><small class="hint" style="margin:0">${sc === 'labor' ? 'للعلم — العميل بيوفرها' : sc === 'fab_install' || lump ? 'تكلفة داخلية فقط' : 'شراء / بيع'}</small></div>
    ${rowsField('materials', [{ k: 'name', label: 'الخامة', type: 'text', wide: true }, { k: 'qty', label: 'الكمية' }, { k: 'unit', label: 'الوحدة', type: 'text' }, { k: 'buy', label: 'سعر الشراء' }, { k: 'sell', label: 'سعر البيع' }, { k: 'key', type: 'hidden' }, { k: 'stockId', type: 'hidden' }, { k: 'spec', type: 'hidden' }], it.materials, { label: 'خامة', add: 'خامة يدوي', colsN: 4 })}
    ${stockOpts.length ? fSel('_pick', 'أو ضيف من المخزون', '', [{ v: '', t: '— اختار خامة —' }].concat(stockOpts), { onchange: 'itemPickStock(this)', wide: true }) : ''}
    <div class="live-total"><span>إجمالي البند على العميل</span><strong id="itemLive">—</strong></div>
    <div class="stack">
      <button type="button" class="btn btn-accent" onclick="saveItem('${pid}','${it.id || ''}')">${icon('check')} حفظ البند</button>
      ${it.calc ? `<button type="button" class="btn btn-soft" onclick="closeSheet(true);editItemCalc('${pid}','${it.id}')">${icon('calc')} فتح الحاسبة وتعديل المقاسات</button>` : ''}
      ${it.id ? `<button type="button" class="btn btn-danger" onclick="deleteItem('${pid}','${it.id}')">${icon('trash')} حذف البند</button>` : ''}
    </div></div>`;
}
let itemDraft = null;
function openItemSheet(pid, iid) {
  const p = byId('projects', pid);
  const it = iid ? JSON.parse(JSON.stringify(p.items.find(x => x.id === iid) || {})) : { section: 'board', method: 'm2', unit: 'م²', scope: p.scope || DB().settings.defaultScope || 'labor', materials: [] };
  itemDraft = { pid, it };
  openSheet(iid ? 'تعديل بند' : 'بند جديد', itemFormHTML(it, pid), { focus: iid ? null : '[data-k=name]' });
  bindItemLive();
}
function bindItemLive() { $('itemForm').addEventListener('input', itemLive); itemLive(); }
function itemRead() {
  const v = readForm($('itemForm'));
  const it = Object.assign({}, itemDraft.it, v);
  delete it._pick;
  it.materials = (v.materials || []).filter(m => m.name || Number(m.qty)).map(m => ({ name: m.name, qty: Number(m.qty) || 0, unit: m.unit, buy: Number(m.buy) || 0, sell: Number(m.sell) || 0, key: m.key || '', stockId: m.stockId || null, spec: m.spec || '' }));
  ['qty', 'laborRate', 'fabRate', 'fabCost', 'lumpSum', 'extraCost', 'doneQty', 'donePct'].forEach(k => { if (k in it) it[k] = Number(it[k]) || 0; });
  return it;
}
function itemLive() { const a = HGf.itemAmounts(itemRead()); $('itemLive').textContent = money(a.client) + (a.cost ? ` (تكلفة ${fmt(a.cost)})` : ''); }
function itemRebuild(keep) { if (!keep) itemDraft.it = itemRead(); $('sheetBody').innerHTML = itemFormHTML(itemDraft.it, itemDraft.pid); hydrateIcons($('sheetBody')); bindItemLive(); }
function itemMethod(sel) { const it = itemRead(); it.unit = (HGf.METHODS[sel.value] || {}).unit || it.unit; itemDraft.it = it; itemRebuild(true); }
function itemPickStock(sel) {
  const s = byId('stock', sel.value); if (!s) return;
  const it = itemRead();
  it.materials.push({ name: [s.name, s.thickness ? s.thickness + ' مم' : '', s.size].filter(Boolean).join(' '), qty: 1, unit: s.unit, buy: Number(s.buy) || 0, sell: Number(s.sell) || 0, key: s.key || '', stockId: s.id });
  itemDraft.it = it; itemRebuild(true);
}
function saveItem(pid, iid) {
  const p = byId('projects', pid), it = itemRead();
  if (!it.name) it.name = (HGf.METHODS[it.method] || {}).name ? `بند ${HGf.METHODS[it.method].name}` : 'بند';
  if (iid) { const i = p.items.findIndex(x => x.id === iid); if (i >= 0) p.items[i] = it; }
  else { it.id = uid('i'); it.created = todayISO(); p.items.push(it); }
  p.updated = todayISO(); persist(); closeSheet(); refreshPages(); renderAll(); toast('✔️ اتحفظ البند');
}
function deleteItem(pid, iid) {
  ask('حذف البند ده من المشروع؟', () => { const p = byId('projects', pid); p.items = p.items.filter(x => x.id !== iid); persist(); closeSheet(); refreshPages(); renderAll(); toast('اتحذف البند'); }, 'حذف');
}

/* ---------------- خصم خامات المشروع من المخزون ---------------- */
function deductProjectStock(pid) {
  const p = byId('projects', pid), d = DB();
  const lines = [];
  p.items.forEach(it => {
    if (it.scope === 'labor' || it.deducted) return;
    (it.materials || []).forEach(m => {
      const s = (m.stockId && byId('stock', m.stockId)) || (m.key && d.stock.find(x => x.key === m.key));
      if (s && Number(m.qty) > 0) lines.push({ it, m, s });
    });
  });
  if (!lines.length) { toast('مفيش خامات مربوطة بالمخزون في البنود'); return; }
  ask(`هيتخصم من المخزون:\n${lines.map(l => `• ${l.s.name}: ${fq(l.m.qty)} ${l.s.unit}`).join('\n')}`, () => {
    lines.forEach(l => {
      l.s.qty = HGc.round((Number(l.s.qty) || 0) - Number(l.m.qty), 3);
      d.moves.push({ id: uid('mv'), stockId: l.s.id, type: 'use', qty: Number(l.m.qty), price: Number(l.s.buy) || 0, date: todayISO(), projectId: pid, note: l.it.name });
    });
    new Set(lines.map(l => l.it)).forEach(it => { it.deducted = true; });
    persist(); refreshPages(); renderAll(); toast('✔️ اتخصمت الخامات من المخزون');
  }, 'خصم', false);
}

/* ---------------- المدفوعات ---------------- */
function openPaymentSheet(id, pid, cid) {
  const x = id ? byId('payments', id) : null;
  const projects = DB().projects.filter(p => p.status !== 'cancelled' || (x && x.projectId === p.id));
  const sel = x ? x.projectId : pid;
  openSheet(x ? 'تعديل دفعة' : 'تسجيل دفعة', `<div id="payForm"><div class="f-grid">
    ${fNum('amount', 'المبلغ', x ? x.amount : '', { unit: cur().sym, wide: true })}
    ${fSel('projectId', 'المشروع', sel || '', [{ v: '', t: '— بدون مشروع —' }].concat(projects.map(p => ({ v: p.id, t: projName(p) }))), { wide: true })}
    ${fText('date', 'التاريخ', x ? x.date : todayISO(), { type: 'date' })}
    ${fSel('method', 'طريقة الدفع', x ? x.method : 'نقدي', PAY_METHODS)}
    ${fText('note', 'ملاحظة', x ? x.note : '', { wide: true, ph: 'دفعة مقدمة / تحت الحساب...' })}
  </div><div class="stack">
    <button type="button" class="btn btn-accent" onclick="savePayment('${id || ''}','${cid || ''}')">${icon('check')} حفظ الدفعة</button>
    ${x ? `<button type="button" class="btn btn-ghost" onclick="makeReceipt('${x.id}')">${icon('printer')} طباعة إيصال استلام</button><button type="button" class="btn btn-danger" onclick="deletePayment('${x.id}')">${icon('trash')} حذف</button>` : ''}
  </div></div>`, { focus: x ? null : '[data-k=amount]' });
}
function savePayment(id, cid) {
  const v = readForm($('payForm'));
  if (!(Number(v.amount) > 0)) { toast('اكتب المبلغ'); return; }
  const p = v.projectId ? byId('projects', v.projectId) : null;
  let x = id ? byId('payments', id) : null;
  if (!x) { x = { id: uid('pay') }; DB().payments.push(x); }
  Object.assign(x, { amount: Number(v.amount), projectId: v.projectId || null, customerId: p ? p.customerId : (cid || x.customerId || null), date: v.date, method: v.method, note: v.note });
  persist(); closeSheet(); refreshPages(); renderAll(); toast('✔️ اتسجلت الدفعة');
}
function deletePayment(id) { ask('حذف الدفعة دي؟', () => { DB().payments = DB().payments.filter(x => x.id !== id); persist(); closeSheet(); refreshPages(); renderAll(); }, 'حذف'); }

/* ---------------- العملاء ---------------- */
function customerStats(c) {
  const d = DB();
  const projects = d.projects.filter(p => p.customerId === c.id);
  let revenue = 0; projects.forEach(p => { revenue += projTotals(p).revenue; });
  const loose = d.payments.filter(x => x.customerId === c.id && !x.projectId);
  const paid = d.payments.filter(x => x.customerId === c.id || projects.some(p => p.id === x.projectId)).reduce((s, x) => s + (Number(x.amount) || 0), 0);
  return { projects, revenue, paid, due: revenue - paid, loose };
}
function renderCustomers() {
  const q = ($('custSearch') || {}).value ? $('custSearch').value.trim().toLowerCase() : '';
  const list = DB().customers.slice().reverse().filter(c => !q || [c.name, c.phone, c.address].join(' ').toLowerCase().includes(q));
  let due = 0; DB().customers.forEach(c => { due += customerStats(c).due; });
  $('custHero').innerHTML = `<div class="hero-label">إجمالي المتبقي عند العملاء</div><div class="hero-value">${fmt(due)}<small>${esc(cur().sym)}</small></div>
    <div class="hero-stats"><div class="hero-stat"><span>عدد العملاء</span><strong>${DB().customers.length}</strong></div><div class="hero-stat"><span>المشروعات</span><strong>${DB().projects.length}</strong></div><div class="hero-stat"><span>الدفعات</span><strong>${DB().payments.length}</strong></div></div>`;
  $('custList').innerHTML = list.length ? list.map(c => { const s = customerStats(c); return `<div class="cust-card" onclick="openCustomer('${c.id}')"><div class="inv-avatar">${initial(c.name)}</div><div class="inv-info"><div class="n">${esc(c.name)}</div><div class="m">${esc([c.phone, s.projects.length + ' مشروع'].filter(Boolean).join(' · '))}</div></div><div class="cust-amt ${s.due > 0 ? 'due' : 'ok'}">${fmt(Math.abs(s.due))}<small>${s.due > 0 ? 'متبقي' : s.due < 0 ? 'دفع زيادة' : 'خالص'}</small></div></div>`; }).join('')
    : `<div class="empty"><div class="big">${icon('users')}</div><p>${DB().customers.length ? 'مفيش نتيجة' : 'العملاء بيتضافوا تلقائي مع المشروعات، أو ضيف عميل جديد'}</p></div>`;
}
function openCustomerEdit(id) {
  const c = id ? byId('customers', id) : null;
  openSheet(c ? 'تعديل بيانات العميل' : 'عميل جديد', `<div id="custForm"><div class="f-grid">
    ${fText('name', 'الاسم', c ? c.name : '', { wide: true })}
    ${fText('phone', 'رقم الهاتف', c ? c.phone : '', { inputmode: 'tel', dir: 'ltr', ph: '01xxxxxxxxx' })}
    ${fText('address', 'العنوان', c ? c.address : '')}
    ${fArea('notes', 'ملاحظات العميل', c ? c.notes : '')}
  </div><div class="stack"><button type="button" class="btn btn-accent" onclick="saveCustomer('${id || ''}')">${icon('check')} حفظ</button>
  ${c ? `<button type="button" class="btn btn-danger" onclick="deleteCustomer('${c.id}')">${icon('trash')} حذف العميل</button>` : ''}</div></div>`, { focus: c ? null : '[data-k=name]' });
}
function saveCustomer(id) {
  const v = readForm($('custForm'));
  if (!v.name.trim()) { toast('اكتب اسم العميل'); return; }
  let c = id ? byId('customers', id) : null;
  if (!c) { c = { id: uid('c'), created: todayISO() }; DB().customers.push(c); }
  Object.assign(c, { name: v.name.trim(), phone: v.phone.trim(), address: v.address.trim(), notes: v.notes });
  persist(); closeSheet(); refreshPages(); renderAll(); toast('✔️ اتحفظ');
  if (!id) openCustomer(c.id);
}
function deleteCustomer(id) {
  const c = byId('customers', id), n = DB().projects.filter(p => p.customerId === id).length;
  ask(`حذف العميل «${c.name}»؟${n ? `\nمشروعاته (${n}) هتفضل موجودة من غير عميل.` : ''}`, () => {
    const d = DB();
    d.customers = d.customers.filter(x => x.id !== id);
    d.projects.forEach(p => { if (p.customerId === id) p.customerId = null; });
    d.payments.forEach(p => { if (p.customerId === id) p.customerId = null; });
    persist(); closeSheet(true); closeAll(); renderAll();
  }, 'حذف');
}
function openCustomer(id) {
  const el = openPage('', { name: 'customer', render: e => renderCustomerPage(e, id) });
  renderCustomerPage(el, id); hydrateIcons(el);
}
function renderCustomerPage(el, id) {
  const c = byId('customers', id);
  if (!c) { el.innerHTML = pageHead('العميل اتحذف'); return; }
  const s = customerStats(c);
  const ns = DB().notes.filter(n => n.customerId === id).slice().reverse();
  const pays = DB().payments.filter(x => x.customerId === id || s.projects.some(p => p.id === x.projectId)).slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
  el.innerHTML = `${pageHead(c.name, [c.phone, c.address].filter(Boolean).join(' — '), `<button type="button" class="icon-btn" onclick="openCustomerEdit('${id}')" aria-label="تعديل">${icon('edit')}</button>`)}
  <main class="container" style="padding-bottom:40px">
    <section class="hero"><div class="hero-label">المتبقي على العميل</div><div class="hero-value">${fmt(s.due)}<small>${esc(cur().sym)}</small></div>
      <div class="hero-stats"><div class="hero-stat"><span>قيمة الأعمال</span><strong>${fmt(s.revenue)}</strong></div><div class="hero-stat"><span>المدفوع</span><strong>${fmt(s.paid)}</strong></div><div class="hero-stat"><span>المشروعات</span><strong>${s.projects.length}</strong></div></div></section>
    <div class="btn-row" style="margin-bottom:10px">
      <button type="button" class="btn btn-accent" onclick="openProjectEdit(null,null,'${id}')">${icon('plus')} مشروع جديد</button>
      <button type="button" class="btn btn-soft" onclick="openPaymentSheet(null,null,'${id}')">${icon('cash')} دفعة</button>
    </div>
    <div class="btn-row" style="margin-bottom:14px">
      <button type="button" class="btn btn-ghost" onclick="makeStatement('${id}')">${icon('printer')} كشف حساب</button>
      <button type="button" class="btn btn-wa" onclick="sendCustomerStatement('${id}')">${icon('send')} واتساب</button>
    </div>
    ${c.notes ? `<div class="note-card"><div class="nt">ملاحظات العميل</div><div class="nb">${esc(c.notes)}</div></div>` : ''}
    <div class="sec-title">المشروعات</div>${s.projects.slice().reverse().map(projectCardHTML).join('') || '<div class="hint">مفيش مشروعات.</div>'}
    <div class="sec-title">الدفعات</div><div class="card">${pays.map(x => `<div class="entry" onclick="openPaymentSheet('${x.id}')"><div class="e-ic">${icon('cash')}</div><div class="e-info"><div class="e-title">${money(x.amount)}</div><div class="e-meta">${esc([fmtDate(x.date), x.projectId ? projName(byId('projects', x.projectId)) : 'بدون مشروع', x.note].filter(Boolean).join(' · '))}</div></div></div>`).join('') || '<div class="hint">مفيش دفعات.</div>'}</div>
    <div class="sec-title">النوتة<span class="sp"></span><button type="button" class="link-btn" onclick="openNoteSheet(null,{customerId:'${id}'})">+ ملاحظة</button></div>
    ${ns.map(noteCardHTML).join('') || '<div class="hint">مفيش ملاحظات.</div>'}
  </main>`;
}
function customerStatementText(id) {
  const c = byId('customers', id), s = customerStats(c), b = DB().settings;
  const lines = [`*كشف حساب: ${c.name}*`, ''];
  s.projects.forEach(p => { const t = projTotals(p); lines.push(`• ${projName(p)}: ${money(t.revenue)} (مدفوع ${fmt(t.paid)})`); });
  lines.push('', `إجمالي الأعمال: ${money(s.revenue)}`, `المدفوع: ${money(s.paid)}`, `*المتبقي: ${money(s.due)}*`);
  if (b.bizName || b.phone) lines.push('', [b.bizName, b.phone].filter(Boolean).join(' — '));
  return lines.join('\n');
}
function sendCustomerStatement(id) { const c = byId('customers', id); sendWhatsApp(customerStatementText(id), c.phone); }
