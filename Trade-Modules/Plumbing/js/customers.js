/* =========================================================
   أرزقي السباكة - customers.js
   العملاء وحساباتهم، مشروعات كل عميل (حصر ومصروفات وأرباح)،
   وسجل الصيانة والإصلاح والزيارات.
   © 2026 أحمد حسن عبدالله - جميع الحقوق محفوظة.
   ========================================================= */

/* ---------------- العملاء ---------------- */
function getCustomer(id) { return DB.customers.find(c => c.id === id) || null; }
function customerStats(c) {
  const docs = DB.docs.filter(d => d.customerId === c.id);
  const billDocs = docs.filter(d => docTypeInfo(d.docType).billable);
  let billed = 0;
  billDocs.forEach(d => { billed += computeDoc(d).total; });
  const mats = DB.matlists.filter(l => l.customerId === c.id && l.buyer === 'me');
  let matCharges = 0;
  mats.forEach(l => { matCharges += matListStats(l).total; });
  const pays = DB.payments.filter(p => p.customerId === c.id);
  const paid = pays.reduce((s, p) => s + n0(p.amount), 0);
  return {
    docs, billDocs, billed: round2(billed), matCharges: round2(matCharges), mats, pays,
    paid: round2(paid), remaining: round2(billed + matCharges - paid),
    projects: projectsOf(c.id), visits: DB.visits.filter(v => v.customerId === c.id), contracts: DB.contracts.filter(k => k.customerId === c.id),
    notes: DB.notes.filter(n => n.customerId === c.id)
  };
}
function ledgerTotals() {
  let due = 0, received = 0;
  DB.customers.forEach(c => { const st = customerStats(c); due += Math.max(0, st.remaining); received += st.paid; });
  // فواتير بدون عميل مسجل
  DB.docs.forEach(d => { if (!d.customerId && docTypeInfo(d.docType).billable) { const t = computeDoc(d); due += Math.max(0, t.remaining); received += t.paid; } });
  return { due: round2(due), received: round2(received) };
}
function renderLedger() {
  const tot = ledgerTotals();
  document.getElementById('ledgerTotalDue').textContent = fmt(tot.due);
  document.getElementById('ledgerCount').textContent = DB.customers.length;
  document.getElementById('ledgerReceived').textContent = money(tot.received);
  document.getElementById('ledgerProjects').textContent = DB.projects.length;
  const q = val('customerSearch').trim();
  const box = document.getElementById('customerList');
  const list = DB.customers.map(c => ({ c, st: customerStats(c) })).filter(x => !q || x.c.name.includes(q) || x.c.phone.includes(q) || x.c.address.includes(q));
  if (!DB.customers.length) {
    box.innerHTML = `<div class="card empty"><div class="big">${icon('users')}</div><p>لا يوجد عملاء بعد.<br>سجّل عملاءك ومشروعاتهم وكل دفعة بتوصلك.</p><button type="button" class="btn btn-accent" onclick="openCustomerForm(null)">${icon('plus')} إضافة أول عميل</button></div>`;
  } else if (!list.length) {
    box.innerHTML = `<div class="card empty"><div class="big">${icon('search')}</div><p>لا يوجد عميل مطابق للبحث.</p></div>`;
  } else {
    box.innerHTML = list.map(({ c, st }) => {
      let amt;
      if (st.remaining > 0) amt = `<div class="cust-amt due">${fmt(st.remaining)}<small>${CUR} متبقي عليه</small></div>`;
      else if (st.billDocs.length && round2(st.remaining) === 0) amt = `<div class="cust-amt ok">خالص ✓<small>لا يوجد متبقي</small></div>`;
      else if (st.remaining < 0) amt = `<div class="cust-amt ok">${fmt(-st.remaining)}<small>${CUR} زيادة له</small></div>`;
      else amt = `<div class="cust-amt">0<small>لا توجد حركة</small></div>`;
      const meta = [c.phone ? `<span dir="ltr">${esc(c.phone)}</span>` : '', `${st.projects.length} مشروع`, `${st.billDocs.length} فاتورة`].filter(Boolean).join(' · ');
      return `
        <div class="cust-card" data-id="${esc(c.id)}">
          <div class="inv-avatar">${initialOf(c.name)}</div>
          <div class="inv-info"><div class="n"><span class="nm">${esc(c.name)}</span></div><div class="m">${meta}</div></div>
          ${amt}
          <button type="button" class="btn btn-soft btn-icon q-pay" data-pay="${esc(c.id)}" aria-label="تسجيل دفعة من ${esc(c.name)}" style="background:var(--success-soft);color:var(--success)">${icon('cash')}</button>
        </div>`;
    }).join('');
    box.querySelectorAll('.cust-card').forEach(el => { el.onclick = () => openPage('customer', el.dataset.id); });
    box.querySelectorAll('.q-pay').forEach(b => { b.onclick = e => { e.stopPropagation(); openPaymentForm(null, { customerId: b.dataset.pay }); }; });
  }
  renderBackupLine();
}
function openCustomerForm(id, then) {
  const c = id ? getCustomer(id) : null;
  openForm({
    title: c ? 'تعديل بيانات العميل' : 'عميل جديد',
    html: `
      <div class="field"><label for="cfName">اسم العميل</label><input type="text" id="cfName" value="${esc(c ? c.name : '')}" placeholder="مثال: أ. محمد فيصل"></div>
      <div class="field"><label for="cfPhone">رقم الهاتف</label><input type="text" inputmode="tel" dir="ltr" style="text-align:right" id="cfPhone" value="${esc(c ? c.phone : '')}" placeholder="01xxxxxxxxx"></div>
      <div class="field"><label for="cfAddress">العنوان</label><input type="text" id="cfAddress" value="${esc(c ? c.address : '')}" placeholder="عنوان العميل"></div>
      <div class="field"><label for="cfNote">ملاحظات</label><textarea id="cfNote" placeholder="أي ملاحظات عن العميل أو الاتفاق (اختياري)">${esc(c ? c.note : '')}</textarea></div>`,
    onSave: body => {
      const name = body.querySelector('#cfName').value.trim();
      if (!name) { showAppToast('⚠️ اكتب اسم العميل أولاً'); return false; }
      if (!c && DB.customers.some(x => x.name.trim() === name)) { showAppToast('⚠️ يوجد عميل بنفس الاسم'); return false; }
      const data = { name, phone: body.querySelector('#cfPhone').value.trim(), address: body.querySelector('#cfAddress').value.trim(), note: body.querySelector('#cfNote').value.trim() };
      let target = c;
      if (c) {
        DB.docs.forEach(d => { if (d.customerId === c.id && d.clientName === c.name) d.clientName = name; });
        Object.assign(c, data);
        saveCol('docs');
      } else {
        target = NORMALIZERS.customers(Object.assign({ id: uid('c_') }, data));
        DB.customers.unshift(target);
      }
      saveCol('customers');
      showAppToast(c ? '✔️ تم تحديث بيانات العميل' : `✔️ تمت إضافة "${name}"`);
      if (!c) setTimeout(() => { if (then) then(target); else openPage('customer', target.id); }, 80);
    }
  });
}
function deleteCustomer(id) {
  const c = getCustomer(id);
  if (!c) return;
  const st = customerStats(c);
  showAppConfirm(`حذف العميل "${c.name}" مع مشروعاته (${st.projects.length}) وسجل صيانته (${st.visits.length})؟ الفواتير والدفعات نفسها لن تُحذف لكن هتتفك من العميل.`, () => {
    st.visits.forEach(v => removeVisitData(v));
    const pids = new Set(st.projects.map(p => p.id));
    DB.visits = DB.visits.filter(v => v.customerId !== id);
    DB.projects = DB.projects.filter(p => p.customerId !== id);
    DB.docs.forEach(d => { if (d.customerId === id) { d.customerId = null; d.projectId = null; } });
    DB.payments.forEach(p => { if (p.customerId === id) p.customerId = null; });
    DB.contracts.forEach(k => { if (k.customerId === id) { k.customerId = null; k.projectId = null; } });
    DB.matlists.forEach(l => { if (l.customerId === id) { l.customerId = null; l.projectId = null; } });
    DB.notes.forEach(n => { if (n.customerId === id) n.customerId = null; if (pids.has(n.projectId)) n.projectId = null; });
    DB.expenses.forEach(x => { if (pids.has(x.projectId)) x.projectId = null; });
    DB.workers.forEach(w => w.entries.forEach(e => { if (pids.has(e.projectId)) e.projectId = null; }));
    DB.customers = DB.customers.filter(x => x.id !== id);
    saveAll();
    closeEverythingThen(() => { switchView('ledger'); showAppToast('تم حذف العميل'); });
  });
}
let custTab = 'acc';
PAGES.customer = function (id) {
  const c = getCustomer(id);
  if (!c) return { title: 'العميل', html: '<p class="hint">العميل غير موجود.</p>' };
  const st = customerStats(c);
  const row = (label, value, cls = '') => `<div class="sum-row ${cls}"><span>${label}</span><strong>${value}</strong></div>`;
  let html = `
    <section class="hero">
      <div class="hero-label">${st.remaining >= 0 ? 'المتبقي على العميل' : 'زيادة للعميل'}</div>
      <div class="hero-value"><span>${fmt(Math.abs(st.remaining))}</span><small>${CUR}</small></div>
      <div class="hero-stats">
        <div class="hero-stat"><span>إجمالي الفواتير</span><strong>${money(st.billed + st.matCharges)}</strong></div>
        <div class="hero-stat"><span>المدفوع</span><strong>${money(st.paid)}</strong></div>
        <div class="hero-stat"><span>المشروعات</span><strong>${st.projects.length}</strong></div>
      </div>
    </section>
    ${c.note ? `<div class="note" style="margin-bottom:14px"><strong>ملاحظات:</strong> ${esc(c.note)}</div>` : ''}
    <div class="segmented seg-5" style="grid-template-columns:repeat(5,minmax(0,1fr));margin-bottom:12px" id="custTabs">
      <button type="button" data-t="acc" class="${custTab === 'acc' ? 'on' : ''}">الحساب</button>
      <button type="button" data-t="proj" class="${custTab === 'proj' ? 'on' : ''}">مشاريع ${st.projects.length || ''}</button>
      <button type="button" data-t="vis" class="${custTab === 'vis' ? 'on' : ''}">صيانة ${st.visits.length || ''}</button>
      <button type="button" data-t="ctr" class="${custTab === 'ctr' ? 'on' : ''}">عقود ${st.contracts.length || ''}</button>
      <button type="button" data-t="note" class="${custTab === 'note' ? 'on' : ''}">نوتة ${st.notes.length || ''}</button>
    </div>`;
  if (custTab === 'acc') {
    html += `<div class="card"><div class="card-title"><div class="t-ic">${icon('file')}</div><h2>المقايسات والفواتير</h2><span class="tag">${st.docs.length}</span></div>
      <div id="custDocs">${st.docs.length ? st.docs.map(docCardHTML).join('') : '<p class="hint" style="margin:-4px 0 12px">لا توجد مستندات لهذا العميل بعد.</p>'}</div>
      <button type="button" class="btn btn-primary" onclick="closeEverythingThen(() => pickDocType('${esc(c.id)}'))">${icon('plus')} مقايسة / فاتورة جديدة</button></div>`;
    html += `<div class="card"><div class="card-title"><div class="t-ic">${icon('cash')}</div><h2>المدفوعات</h2><span class="tag">${money(st.paid)}</span></div>
      <button type="button" class="btn btn-accent" onclick="openPaymentForm(null, {customerId: '${esc(c.id)}'})">${icon('plus')} تسجيل دفعة من العميل</button>
      <div style="margin-top:8px" id="custPays">${st.pays.length ? st.pays.slice().sort(byNewest).map(paymentRowHTML).join('') : '<p class="hint" style="margin:10px 0 0;text-align:center">لم تسجل أي دفعة بعد.</p>'}</div></div>`;
    if (st.mats.length) html += `<div class="card"><div class="card-title"><div class="t-ic orange">${icon('box')}</div><h2>كشوفات خامات على حسابه</h2><span class="tag">${money(st.matCharges)}</span></div>
      ${st.mats.map(l => `<div class="entry mat" data-ml="${esc(l.id)}"><div class="e-ic">${icon('box')}</div><div class="e-info"><div class="e-title">${esc(l.title || 'كشف خامات')}</div><div class="e-meta">${esc(fmtDate(l.date))} · ${l.items.length} صنف</div></div><div class="e-amt">${fmt(matListStats(l).total)}</div></div>`).join('')}</div>`;
    html += `<div class="card"><div class="card-title"><div class="t-ic orange">${icon('calc')}</div><h2>ملخص الحساب</h2></div><div class="sum-list">
      ${row(`إجمالي الفواتير (${st.billDocs.length})`, money(st.billed))}
      ${st.matCharges ? row('خامات على حسابه', '+ ' + money(st.matCharges)) : ''}
      ${row('إجمالي المدفوع', '- ' + money(st.paid), 'minus')}
      </div><div class="sum-total"><span>${st.remaining >= 0 ? 'المتبقي على العميل' : 'زيادة للعميل'}</span><strong>${money(Math.abs(st.remaining))}</strong></div></div>
      <div class="stack">
        <button type="button" class="btn btn-soft" onclick="openStatementPreview('${esc(c.id)}')">${icon('printer')} كشف حساب العميل PDF</button>
        <div class="btn-row">
          <button type="button" class="btn btn-wa" onclick="sendWhatsApp(getCustomer('${esc(c.id)}').phone, buildStatementText(getCustomer('${esc(c.id)}')))">${icon('send')} كشف واتساب</button>
          <button type="button" class="btn btn-ghost" onclick="copyText(buildStatementText(getCustomer('${esc(c.id)}')), '✔️ تم نسخ كشف الحساب')">${icon('copy')} نسخ الكشف</button>
        </div>
      </div>`;
  } else if (custTab === 'proj') {
    html += `<button type="button" class="btn btn-accent" style="margin-bottom:12px" onclick="openProjectForm(null, '${esc(c.id)}')">${icon('plus')} مشروع جديد للعميل</button>`;
    html += st.projects.length ? st.projects.map(projectCardHTML).join('') : `<div class="card empty"><div class="big">${icon('folder')}</div><p>لا توجد مشروعات لهذا العميل.<br>العميل الواحد يقدر يكون عنده أي عدد من المشروعات (شقة، فيلا، مبنى...)، وكل مشروع له مقايساته ومصروفاته ودفعاته.</p></div>`;
  } else if (custTab === 'vis') {
    html += `<button type="button" class="btn btn-accent" style="margin-bottom:12px" onclick="openVisitForm(null, {customerId: '${esc(c.id)}'})">${icon('plus')} تسجيل زيارة صيانة / إصلاح</button>`;
    html += st.visits.length ? st.visits.slice().sort(byNewest).map(visitCardHTML).join('') + `<button type="button" class="btn btn-soft" style="margin-top:4px" onclick="openMaintHistoryPreview('${esc(c.id)}')">${icon('printer')} تقرير سجل الصيانة والإصلاح PDF</button>`
      : `<div class="card empty"><div class="big">${icon('history')}</div><p>لا توجد أعمال صيانة مسجلة لهذا العميل.</p></div>`;
  } else if (custTab === 'ctr') {
    html += `<button type="button" class="btn btn-accent" style="margin-bottom:12px" onclick="openContractForm(null, '${esc(c.id)}')">${icon('plus')} عقد صيانة جديد</button>`;
    html += st.contracts.length ? st.contracts.map(contractCardHTML).join('') : `<div class="card empty"><div class="big">${icon('file')}</div><p>لا توجد عقود صيانة لهذا العميل.</p></div>`;
  } else {
    html += `<button type="button" class="btn btn-accent" style="margin-bottom:12px" onclick="openNoteForm(null, {customerId: '${esc(c.id)}'})">${icon('plus')} ملاحظة جديدة للعميل</button>`;
    html += st.notes.length ? st.notes.slice().sort((a, b) => b.updatedAt - a.updatedAt).map(noteCardHTML).join('') : `<div class="card empty"><div class="big">${icon('book')}</div><p>لا توجد ملاحظات مربوطة بالعميل.<br>سجّل تفاصيل الاتفاق ومواقع المحابس ومقاسات المواسير.</p></div>`;
  }
  html += `<button type="button" class="btn btn-danger" style="margin-top:14px" onclick="deleteCustomer('${esc(c.id)}')">${icon('trash')} حذف العميل</button>`;
  return {
    title: c.name, sub: [c.phone, c.address].filter(Boolean).join(' · ') || 'صفحة العميل',
    actions: [
      ...(c.phone ? [{ icon: 'phone', label: 'اتصال', onClick: () => { window.open('tel:' + c.phone.replace(/[^\d+]/g, ''), '_self'); } }] : []),
      { icon: 'edit', label: 'تعديل العميل', onClick: () => openCustomerForm(c.id) }
    ],
    html,
    after: body => {
      body.querySelector('#custTabs').onclick = e => { const b = e.target.closest('[data-t]'); if (b) { custTab = b.dataset.t; refreshPages(); } };
      bindDocCards(body);
      body.querySelectorAll('.entry[data-pay]').forEach(el => { el.onclick = () => openPaymentForm(el.dataset.pay); });
      body.querySelectorAll('[data-ml]').forEach(el => { el.onclick = () => openMatList(el.dataset.ml); });
      bindProjectCards(body); bindVisitCards(body); bindContractCards(body); bindNoteCards(body);
    }
  };
};

/* =========================================================
   المشروعات
   ========================================================= */
function getProject(id) { return DB.projects.find(p => p.id === id) || null; }
function projectsOf(cid) { return DB.projects.filter(p => p.customerId === cid); }
function projectLabel(p) { return p.name + (p.propType ? ` (${p.propType})` : ''); }
function projStatusPill(st) { const s = PROJECT_STATUS[st] || PROJECT_STATUS.new; return `<span class="pill-st" style="--c:${s.color}">${esc(s.label)}</span>`; }
// كل حسابات المشروع: المقاولة، المدفوع، المصروفات، الأجور، والحصر — كل بند مرة واحدة
function projectStats(p) {
  const docs = DB.docs.filter(d => d.projectId === p.id);
  const billDocs = docs.filter(d => docTypeInfo(d.docType).billable);
  const docIds = new Set(docs.map(d => d.id));
  const s = { docs, billDocs, billed: 0, paid: 0, lineCost: 0, byKind: {}, estimates: 0 };
  KIND_ORDER.forEach(k => { s.byKind[k] = 0; });
  billDocs.forEach(d => { const t = computeDoc(d); s.billed += t.total; s.paid += t.paid; s.lineCost += t.cost; KIND_ORDER.forEach(k => { s.byKind[k] += t.byKind[k]; }); });
  docs.forEach(d => { if (!docTypeInfo(d.docType).billable) s.estimates += computeDoc(d).total; });
  s.expenses = DB.expenses.filter(x => x.projectId === p.id || (x.docId && docIds.has(x.docId)));
  s.expByCat = {}; s.matExpenses = 0; s.otherExpenses = 0;
  s.expenses.forEach(x => { s.expByCat[x.cat] = round2((s.expByCat[x.cat] || 0) + x.amount); if (MATERIAL_EXP_CATS.includes(x.cat)) s.matExpenses += x.amount; else s.otherExpenses += x.amount; });
  s.wages = [];
  DB.workers.forEach(w => w.entries.forEach(e => {
    if ((e.type === 'day' || e.type === 'overtime') && (e.projectId === p.id || (e.docId && docIds.has(e.docId)))) s.wages.push({ w, e, value: workerEntryValue(e, w) });
  }));
  s.labor = s.wages.reduce((a, x) => a + x.value, 0);
  ['billed', 'paid', 'lineCost', 'matExpenses', 'otherExpenses', 'labor', 'estimates'].forEach(k => { s[k] = round2(s[k]); });
  KIND_ORDER.forEach(k => { s.byKind[k] = round2(s.byKind[k]); });
  s.remaining = round2(s.billed - s.paid);
  s.expTotal = round2(s.matExpenses + s.otherExpenses);
  // الخامات مرة واحدة: الأكبر من تكلفة الشراء في البنود ومصروفات الخامات المسجلة
  s.materialsCost = Math.max(s.lineCost, s.matExpenses);
  s.totalCost = round2(s.materialsCost + s.otherExpenses + s.labor);
  s.profit = round2(s.billed - s.totalCost);
  s.visits = DB.visits.filter(v => v.projectId === p.id);
  s.notes = DB.notes.filter(n => n.projectId === p.id);
  return s;
}
// حصر كميات المشروع من بنود مستنداته (الفواتير لو موجودة، وإلا المقايسات)
function projectTakeoff(p) {
  const docs = DB.docs.filter(d => d.projectId === p.id);
  const bills = docs.filter(d => docTypeInfo(d.docType).billable);
  const src = bills.length ? bills : docs;
  const t = { fromBills: bills.length > 0, points: {}, baths: 0, kitchens: 0, pipes: {}, netMeters: 0, fittings: {}, fixtures: {}, equipment: {}, parts: {}, cubic: 0, clientMaterials: [] };
  const add = (o, k, v) => { o[k] = round3((o[k] || 0) + v); };
  src.forEach(d => d.lines.forEach(l => {
    const q = lineBaseQty(l);
    if (l.method === 'point') add(t.points, l.name, q);
    else if (l.method === 'bath') t.baths += q;
    else if (l.method === 'kitchen') t.kitchens += q;
    else if (l.method === 'cubic') t.cubic = round3(t.cubic + q);
    if (l.kind === 'material') add(t.pipes, [l.name, l.size].filter(Boolean).join(' ') + (l.method === 'meter' ? ' (م)' : ` (${l.unit})`), q);
    else if (l.kind === 'fitting') add(t.fittings, [l.name, l.size].filter(Boolean).join(' '), q);
    else if (l.kind === 'fixture') add(t.fixtures, l.name, q);
    else if (l.kind === 'equipment') add(t.equipment, l.name, q);
    else if (l.kind === 'part') add(t.parts, l.name, q);
    else if (l.kind === 'service' && l.method === 'meter') t.netMeters = round3(t.netMeters + q);
    if (lineFromClient(l)) t.clientMaterials.push(l.name);
  }));
  t.pointsTotal = round3(Object.keys(t.points).reduce((s, k) => s + t.points[k], 0));
  return t;
}
function projectCardHTML(p) {
  const st = projectStats(p);
  const c = getCustomer(p.customerId);
  return `
    <div class="inv-card" data-proj="${esc(p.id)}">
      <div class="inv-avatar">${icon('folder')}</div>
      <div class="inv-info"><div class="n"><span class="nm">${esc(p.name)}</span>${projStatusPill(p.status)}</div>
        <div class="m">${[c ? esc(c.name) : '', esc(p.propType), p.address ? esc(p.address) : '', `${st.docs.length} مستند`].filter(Boolean).join(' · ')}</div></div>
      <div class="inv-amount"${st.remaining > 0 ? '' : ' style="color:var(--muted)"'}>${fmt(st.billDocs.length ? st.remaining : st.estimates)}<small>${CUR} ${st.billDocs.length ? 'متبقي' : 'مقايسات'}</small></div>
    </div>`;
}
function bindProjectCards(box) { box.querySelectorAll('.inv-card[data-proj]').forEach(el => { el.onclick = () => openPage('project', el.dataset.proj); }); }
function openProjectForm(id, customerId, addToDoc) {
  const ex = id ? getProject(id) : null;
  const p = ex ? Object.assign({}, ex) : NORMALIZERS.projects({ id: uid('pr_'), customerId: customerId || null, name: '', startDate: todayISO(), status: 'new' });
  const custOpts = opt('', '— اختار العميل —', p.customerId || '') + DB.customers.map(c => opt(c.id, c.name, p.customerId)).join('');
  openForm({
    title: ex ? 'تعديل بيانات المشروع' : 'مشروع جديد',
    html: `
      <div class="field"><label for="pfCust">العميل</label><select id="pfCust">${custOpts}</select></div>
      <div class="field"><label for="pfName">اسم المشروع</label><input type="text" id="pfName" value="${esc(ex ? p.name : '')}" placeholder="مثال: شقة التجمع - الدور الثالث"></div>
      <div class="field"><label for="pfAddress">عنوان العمل</label><input type="text" id="pfAddress" value="${esc(p.address)}" placeholder="عنوان الموقع"></div>
      <div class="field"><label>نوع العقار</label><div class="unit-chips" id="pfType">${PROP_TYPES.map(t => `<button type="button" class="chip${p.propType === t ? ' on' : ''}" data-t="${esc(t)}">${esc(t)}</button>`).join('')}</div></div>
      <div class="row-2">
        <div class="field"><label for="pfStart">تاريخ البداية</label><input type="date" id="pfStart" value="${esc(p.startDate)}"></div>
        <div class="field"><label for="pfEnd">تاريخ التسليم</label><input type="date" id="pfEnd" value="${esc(p.endDate)}"></div>
      </div>
      <div class="field"><label>حالة المشروع</label><div class="unit-chips" id="pfStatus">${Object.keys(PROJECT_STATUS).map(k => `<button type="button" class="chip${p.status === k ? ' on' : ''}" data-s="${k}">${PROJECT_STATUS[k].label}</button>`).join('')}</div></div>
      <div class="field"><label for="pfDesc">وصف الأعمال</label><textarea id="pfDesc" placeholder="مثال: تأسيس وتشطيب سباكة 3 حمامات ومطبخ + خزان وطلمبة">${esc(p.description)}</textarea></div>
      <div class="field"><label for="pfNotes">ملاحظات</label><textarea id="pfNotes" placeholder="اختياري">${esc(p.notes)}</textarea></div>`,
    after: body => {
      body.querySelector('#pfType').onclick = e => { const b = e.target.closest('[data-t]'); if (!b) return; p.propType = p.propType === b.dataset.t ? '' : b.dataset.t; body.querySelectorAll('#pfType .chip').forEach(x => x.classList.toggle('on', x.dataset.t === p.propType)); };
      body.querySelector('#pfStatus').onclick = e => { const b = e.target.closest('[data-s]'); if (!b) return; p.status = b.dataset.s; body.querySelectorAll('#pfStatus .chip').forEach(x => x.classList.toggle('on', x === b)); };
    },
    saveText: ex ? 'تحديث المشروع' : 'حفظ المشروع',
    onSave: body => {
      const g = s => body.querySelector(s).value;
      const cust = g('#pfCust'), name = g('#pfName').trim();
      if (!cust) { showAppToast('⚠️ اختار العميل صاحب المشروع'); return false; }
      if (!name) { showAppToast('⚠️ اكتب اسم المشروع'); return false; }
      Object.assign(p, { customerId: cust, name, address: g('#pfAddress').trim(), startDate: g('#pfStart'), endDate: g('#pfEnd'), description: g('#pfDesc').trim(), notes: g('#pfNotes').trim() });
      const clean = NORMALIZERS.projects(p);
      if (ex) {
        DB.projects = DB.projects.map(x => x.id === clean.id ? clean : x);
        // لو المشروع اتنقل لعميل تاني، مستنداته تتبعه
        if (ex.customerId !== clean.customerId) { const c = getCustomer(clean.customerId); DB.docs.forEach(d => { if (d.projectId === clean.id) { d.customerId = clean.customerId; if (c) d.clientName = c.name; } }); saveCol('docs'); syncPaymentsToCustomers(); saveCol('payments'); }
      } else DB.projects.unshift(clean);
      saveCol('projects');
      if (!ex && addToDoc) { const doc = getCurrentDoc(); if (doc && doc.customerId === clean.customerId) { doc.projectId = clean.id; if (clean.address && !doc.clientAddress) doc.clientAddress = clean.address; saveDoc(doc); } }
      showAppToast(ex ? '✔️ تم تحديث المشروع' : `✔️ تم حفظ المشروع "${name}"`);
      if (!ex && !addToDoc) setTimeout(() => openPage('project', clean.id), 80);
    },
    onDelete: ex ? () => deleteProject(ex.id) : null,
    deleteText: 'حذف المشروع'
  });
}
function deleteProject(id) {
  const p = getProject(id);
  if (!p) return;
  const st = projectStats(p);
  showAppConfirm(`حذف المشروع "${p.name}"؟ مستنداته (${st.docs.length}) ومصروفاته وزياراته مش هتتحذف، لكن هتتفك من المشروع.`, () => {
    DB.projects = DB.projects.filter(x => x.id !== id);
    DB.docs.forEach(d => { if (d.projectId === id) d.projectId = null; });
    DB.visits.forEach(v => { if (v.projectId === id) v.projectId = null; });
    DB.expenses.forEach(x => { if (x.projectId === id) x.projectId = null; });
    DB.notes.forEach(n => { if (n.projectId === id) n.projectId = null; });
    DB.contracts.forEach(k => { if (k.projectId === id) k.projectId = null; });
    DB.matlists.forEach(l => { if (l.projectId === id) l.projectId = null; });
    DB.workers.forEach(w => w.entries.forEach(e => { if (e.projectId === id) e.projectId = null; }));
    saveAll();
    closeSheetsThen(() => {
      const top = topPage();
      if (top && top.key === 'project' && top.args[0] === id) closeOverlay();
      refreshAll();
      showAppToast('تم حذف المشروع');
    });
  });
}
let projTab = 'acc';
PAGES.project = function (id) {
  const p = getProject(id);
  if (!p) return { title: 'المشروع', html: '<p class="hint">المشروع غير موجود.</p>' };
  const c = getCustomer(p.customerId);
  const st = projectStats(p);
  const row = (label, value, cls = '') => value === '' ? '' : `<div class="sum-row ${cls}"><span>${label}</span><strong>${value}</strong></div>`;
  const rowT = (label, value) => value ? `<div class="sum-row txt"><span>${label}</span><strong>${value}</strong></div>` : '';
  let html = `
    <section class="hero">
      <div class="hero-label">${st.billDocs.length ? 'المتبقي على المشروع' : 'إجمالي المقايسات (لسه مفيش فواتير)'}</div>
      <div class="hero-value"><span>${fmt(st.billDocs.length ? st.remaining : st.estimates)}</span><small>${CUR}</small></div>
      <div class="hero-stats">
        <div class="hero-stat"><span>إجمالي المقاولة</span><strong>${money(st.billed)}</strong></div>
        <div class="hero-stat"><span>المدفوع</span><strong>${money(st.paid)}</strong></div>
        <div class="hero-stat"><span>التكاليف</span><strong>${money(st.totalCost)}</strong></div>
      </div>
    </section>
    <div class="segmented seg-5" style="grid-template-columns:repeat(5,minmax(0,1fr));margin-bottom:12px" id="projTabs">
      <button type="button" data-t="acc" class="${projTab === 'acc' ? 'on' : ''}">الحساب</button>
      <button type="button" data-t="qty" class="${projTab === 'qty' ? 'on' : ''}">الحصر</button>
      <button type="button" data-t="cost" class="${projTab === 'cost' ? 'on' : ''}">التكاليف</button>
      <button type="button" data-t="vis" class="${projTab === 'vis' ? 'on' : ''}">صيانة ${st.visits.length || ''}</button>
      <button type="button" data-t="note" class="${projTab === 'note' ? 'on' : ''}">نوتة ${st.notes.length || ''}</button>
    </div>`;
  if (projTab === 'acc') {
    html += `<div class="card"><div class="card-title"><div class="t-ic">${icon('folder')}</div><h2>بيانات المشروع</h2>${projStatusPill(p.status)}</div><div class="sum-list">
      ${rowT('العميل', c ? esc(c.name) : '-')}${rowT('عنوان العمل', esc(p.address))}${rowT('نوع العقار', esc(p.propType))}
      ${rowT('تاريخ البداية', esc(fmtDate(p.startDate)))}${rowT('تاريخ التسليم', esc(fmtDate(p.endDate)))}
      </div>${p.description ? `<div class="note" style="margin-top:10px"><strong>وصف الأعمال:</strong> ${esc(p.description)}</div>` : ''}${p.notes ? `<div class="note" style="margin-top:10px"><strong>ملاحظات:</strong> ${esc(p.notes)}</div>` : ''}</div>
      <div class="card"><div class="card-title"><div class="t-ic">${icon('file')}</div><h2>المقايسات والفواتير</h2><span class="tag">${st.docs.length}</span></div>
      ${st.docs.length ? st.docs.map(docCardHTML).join('') : '<p class="hint" style="margin:-4px 0 12px">لا توجد مستندات على المشروع بعد.</p>'}
      <button type="button" class="btn btn-primary" onclick="closeEverythingThen(() => pickDocType(null, '${esc(p.id)}'))">${icon('plus')} مقايسة / فاتورة للمشروع</button></div>
      <div class="card"><div class="card-title"><div class="t-ic orange">${icon('calc')}</div><h2>حساب المشروع</h2></div><div class="sum-list">
      ${KIND_ORDER.filter(k => st.byKind[k]).map(k => row(LINE_KINDS[k], money(st.byKind[k]))).join('')}
      ${row(`إجمالي المقاولة (${st.billDocs.length} فاتورة)`, money(st.billed), 'bold')}
      ${row('إجمالي المدفوعات', '- ' + money(st.paid), 'minus')}
      </div><div class="sum-total"><span>${st.remaining >= 0 ? 'المتبقي على العميل' : 'زيادة للعميل'}</span><strong>${money(Math.abs(st.remaining))}</strong></div>
      <div class="sum-list" style="margin-top:10px">
      ${row('تكلفة الخامات المحتسبة (مرة واحدة)', '- ' + money(st.materialsCost), 'minus')}
      ${row('مصروفات أخرى (نقل / حفر / ...)', '- ' + money(st.otherExpenses), 'minus')}
      ${row('أجور العمال', '- ' + money(st.labor), 'minus')}
      ${row('صافي الربح المتوقع للمشروع', money(st.profit), 'bold')}
      </div></div>`;
  } else if (projTab === 'qty') {
    const tk = projectTakeoff(p);
    const list = (title, ic, obj, unit) => { const keys = Object.keys(obj); return keys.length ? `<div class="card"><div class="card-title"><div class="t-ic">${icon(ic)}</div><h2>${title}</h2><span class="tag">${keys.length}</span></div><div class="sum-list">${keys.map(k => row(esc(k), fmtN(obj[k]) + (unit ? ' ' + unit : ''))).join('')}</div></div>` : ''; };
    const any = tk.pointsTotal || tk.baths || tk.kitchens || Object.keys(tk.pipes).length || Object.keys(tk.fittings).length || Object.keys(tk.fixtures).length || Object.keys(tk.equipment).length || tk.netMeters || tk.cubic;
    html += any ? `<div class="note" style="margin-bottom:12px">الحصر متجمع تلقائياً من بنود ${tk.fromBills ? 'فواتير' : 'مقايسات'} المشروع — كل بند مرة واحدة.</div>
      <div class="card"><div class="card-title"><div class="t-ic orange">${icon('droplet')}</div><h2>ملخص الحصر</h2></div><div class="sum-list">
        ${tk.pointsTotal ? row('إجمالي النقاط', fmtN(tk.pointsTotal) + ' نقطة') : ''}${tk.baths ? row('الحمامات', fmtN(tk.baths)) : ''}${tk.kitchens ? row('المطابخ', fmtN(tk.kitchens)) : ''}
        ${tk.netMeters ? row('تمديدات بالمتر (مصنعية)', fmtN(tk.netMeters) + ' م') : ''}${tk.cubic ? row('حفر وردم', fmtN(tk.cubic) + ' م³') : ''}
      </div></div>
      ${list('النقاط', 'droplet', tk.points, 'نقطة')}${list('المواسير والخامات', 'pipe', tk.pipes, '')}${list('القطع والوصلات', 'valve', tk.fittings, '')}
      ${list('الأدوات الصحية', 'bath', tk.fixtures, '')}${list('المعدات', 'pump', tk.equipment, '')}${list('قطع الغيار', 'wrench', tk.parts, '')}
      ${tk.clientMaterials.length ? `<div class="note">خامات من العميل: ${[...new Set(tk.clientMaterials)].map(esc).join('، ')}</div>` : ''}`
      : `<div class="card empty"><div class="big">${icon('ruler')}</div><p>لسه مفيش بنود على المشروع.<br>اعمل مقايسة للمشروع والحصر هيتجمع هنا لوحده.</p></div>`;
  } else if (projTab === 'cost') {
    html += `<div class="btn-row" style="margin-bottom:12px">
        <button type="button" class="btn btn-accent" onclick="openExpenseForm(null, {projectId: '${esc(p.id)}'})">${icon('plus')} مصروف على المشروع</button>
        <button type="button" class="btn btn-soft" onclick="openProjectReportPreview('${esc(p.id)}')">${icon('printer')} تقرير المصروفات PDF</button>
      </div>
      <div class="card"><div class="card-title"><div class="t-ic">${icon('receipt')}</div><h2>مصروفات المشروع</h2><span class="tag">${money(st.expTotal)}</span></div>
      ${Object.keys(st.expByCat).length ? `<div class="sum-list" style="margin-bottom:8px">${Object.keys(st.expByCat).map(k => row(esc(k), money(st.expByCat[k]))).join('')}</div>` : ''}
      ${st.expenses.length ? st.expenses.slice().sort(byNewest).map(expenseRowHTML).join('') : '<p class="hint" style="margin:0">لا توجد مصروفات مسجلة على المشروع.</p>'}</div>
      <div class="card"><div class="card-title"><div class="t-ic orange">${icon('hard')}</div><h2>أجور العمال على المشروع</h2><span class="tag">${money(st.labor)}</span></div>
      ${st.wages.length ? st.wages.sort((a, b) => byNewest(a.e, b.e)).map(x => `<div class="entry" data-wopen="${esc(x.w.id)}"><div class="e-ic">${icon('hard')}</div><div class="e-info"><div class="e-title">${esc(x.w.name)} · ${WORKER_ENTRY[x.e.type].label}${x.e.type === 'day' ? ` (${fmtN(x.e.days)} يوم)` : ''}</div><div class="e-meta">${esc(fmtDate(x.e.date))}${x.e.task ? ' · ' + esc(x.e.task) : ''}${x.e.note ? ' · ' + esc(x.e.note) : ''}</div></div><div class="e-amt">${fmt(x.value)}</div></div>`).join('')
        : '<p class="hint" style="margin:0">سجّل يوميات العمال على المشروع من «العمال والفريق».</p>'}</div>`;
  } else if (projTab === 'vis') {
    html += `<button type="button" class="btn btn-accent" style="margin-bottom:12px" onclick="openVisitForm(null, {customerId: '${esc(p.customerId || '')}', projectId: '${esc(p.id)}'})">${icon('plus')} زيارة صيانة / إصلاح للمشروع</button>`;
    html += st.visits.length ? st.visits.slice().sort(byNewest).map(visitCardHTML).join('') : `<div class="card empty"><div class="big">${icon('history')}</div><p>لا توجد زيارات صيانة على المشروع.</p></div>`;
  } else {
    html += `<button type="button" class="btn btn-accent" style="margin-bottom:12px" onclick="openNoteForm(null, {customerId: '${esc(p.customerId || '')}', projectId: '${esc(p.id)}'})">${icon('plus')} ملاحظة جديدة للمشروع</button>`;
    html += st.notes.length ? st.notes.slice().sort((a, b) => b.updatedAt - a.updatedAt).map(noteCardHTML).join('') : `<div class="card empty"><div class="big">${icon('book')}</div><p>لا توجد ملاحظات على المشروع.<br>سجّل مقاسات المواسير ومواقع المحابس وتفاصيل المسارات.</p></div>`;
  }
  html += `<button type="button" class="btn btn-danger" style="margin-top:14px" onclick="deleteProject('${esc(p.id)}')">${icon('trash')} حذف المشروع</button>`;
  return {
    title: p.name, sub: [c ? c.name : '', p.propType, PROJECT_STATUS[p.status].label].filter(Boolean).join(' · '),
    actions: [{ icon: 'edit', label: 'تعديل المشروع', onClick: () => openProjectForm(p.id) }],
    html,
    after: body => {
      body.querySelector('#projTabs').onclick = e => { const b = e.target.closest('[data-t]'); if (b) { projTab = b.dataset.t; refreshPages(); } };
      bindDocCards(body); bindVisitCards(body); bindNoteCards(body); bindExpenseRows(body);
      body.querySelectorAll('[data-wopen]').forEach(el => { el.onclick = () => openPage('worker', el.dataset.wopen); });
    }
  };
};
let projFilter = 'all';
PAGES.projects = function () {
  const q = ((document.getElementById('projSearch') || {}).value || '').trim();
  const list = DB.projects.filter(p => {
    if (projFilter !== 'all' && p.status !== projFilter) return false;
    const c = getCustomer(p.customerId);
    return !q || [p.name, p.address, p.propType, p.description, c ? c.name : ''].join(' ').includes(q);
  });
  const html = `
    <button type="button" class="btn btn-accent" style="margin-bottom:12px" onclick="newProjectWithCustomer()">${icon('plus')} مشروع جديد</button>
    <div class="field"><input type="search" id="projSearch" value="${esc(q)}" placeholder="ابحث باسم المشروع أو العميل أو العنوان..."></div>
    <div class="filter-chips" id="projFilter">${[['all', 'الكل'], ...Object.keys(PROJECT_STATUS).map(k => [k, PROJECT_STATUS[k].label])].map(([k, l]) => `<button type="button" class="chip${projFilter === k ? ' on' : ''}" data-f="${k}">${esc(l)}</button>`).join('')}</div>
    <div id="projList">${list.length ? list.map(projectCardHTML).join('') : `<div class="card empty"><div class="big">${icon('folder')}</div><p>${DB.projects.length ? 'لا يوجد مشروع مطابق.' : 'لا توجد مشروعات بعد.<br>كل مشروع بيجمع مقايساته وخاماته وعماله ومصروفاته ودفعاته.'}</p></div>`}</div>`;
  return {
    title: 'المشروعات', sub: `${DB.projects.length} مشروع`, html,
    after: body => {
      bindProjectCards(body);
      const s = body.querySelector('#projSearch');
      s.oninput = () => { const pos0 = s.selectionStart; refreshPages(); const n = document.getElementById('projSearch'); if (n) { n.focus(); try { n.setSelectionRange(pos0, pos0); } catch (e) {} } };
      body.querySelector('#projFilter').onclick = e => { const b = e.target.closest('[data-f]'); if (b) { projFilter = b.dataset.f; refreshPages(); } };
    }
  };
};
function newProjectWithCustomer() {
  if (!DB.customers.length) { openCustomerForm(null, c => openProjectForm(null, c.id)); return; }
  openPicker({
    title: 'المشروع لأي عميل؟',
    items: DB.customers.map(c => ({ id: c.id, title: c.name, sub: `${projectsOf(c.id).length} مشروع${c.phone ? ' · ' + esc(c.phone) : ''}`, avatar: initialOf(c.name) })),
    addNew: { label: q => q ? `إضافة «${q}» كعميل جديد` : 'عميل جديد', fn: q => openCustomerForm(null, c => openProjectForm(null, c.id)) },
    onPick: x => openProjectForm(null, x.id)
  });
}

/* =========================================================
   سجل الصيانة والإصلاح والزيارات
   ========================================================= */
function getVisit(id) { return DB.visits.find(v => v.id === id) || null; }
function visitPartsTotal(v) { return round2(v.parts.reduce((s, p) => s + n0(p.qty) * n0(p.price), 0)); }
function visitPartsCost(v) { return round2(v.parts.reduce((s, p) => s + n0(p.qty) * n0(p.cost), 0)); }
// التكلفة على العميل = أجرة الزيارة + مصنعية الإصلاح + القطع والخامات (كل واحدة منفصلة)
function visitTotal(v) { return round2(n0(v.visitFee) + n0(v.laborValue) + visitPartsTotal(v)); }
function visitTechNames(v) {
  const names = v.techIds.map(id => { const w = DB.workers.find(x => x.id === id); return w ? w.name : ''; }).filter(Boolean);
  if (v.techName) names.push(v.techName);
  return names.join('، ');
}
function statusPill(st) { const s = VISIT_STATUS[st] || VISIT_STATUS.done; return `<span class="pill-st" style="--c:${s.color}">${esc(s.label)}</span>`; }
function visitTitle(v) { return v.problemType || v.visitType || 'زيارة صيانة'; }
function visitCardHTML(v) {
  const c = getCustomer(v.customerId);
  return `
    <div class="inv-card" data-visit="${esc(v.id)}">
      <div class="inv-avatar" style="background:linear-gradient(135deg,var(--success),#0b7a55)">${icon('wrench')}</div>
      <div class="inv-info"><div class="n"><span class="nm">${esc(visitTitle(v))}</span>${statusPill(v.status)}</div>
        <div class="m">${esc(fmtDate(v.date))}${c ? ' · ' + esc(c.name) : ''}${v.location ? ' · ' + esc(v.location) : ''}${v.repairType ? ' · ' + esc(v.repairType) : ''}</div></div>
      <div class="inv-amount">${fmt(visitTotal(v))}<small>${CUR}</small></div>
    </div>`;
}
function bindVisitCards(box) { box.querySelectorAll('[data-visit]').forEach(el => { el.onclick = () => openPage('visit', el.dataset.visit); }); }
// يمسح بيانات الزيارة المرتبطة (رجوع القطع للمخزن والصور)
function removeVisitData(v) {
  reconcileStock(v, {}, `حذف زيارة ${v.number}`);
  v.photos.forEach(p => mediaDelete(p.id));
}
function visitStockDesired(v) {
  const want = {};
  v.parts.forEach(p => { if (p.invId && invById(p.invId)) want[p.invId] = round3((want[p.invId] || 0) + n0(p.qty)); });
  return want;
}

/* ---------- نموذج الزيارة (صفحة كاملة) ---------- */
let vDraft = null;
function openVisitForm(id, preset = {}) {
  const v = id ? getVisit(id) : null;
  vDraft = v ? JSON.parse(JSON.stringify(v)) : NORMALIZERS.visits(Object.assign({ id: uid('v_'), date: todayISO(), status: 'done', visitType: 'زيارة إصلاح' }, preset));
  if (!v && vDraft.contractId) vDraft.visitType = 'زيارة ضمن عقد';
  vDraft._new = !v;
  vDraft._origPhotos = v ? v.photos.map(p => p.id) : [];
  openPage('visitForm', vDraft.id);
}
function vdSet(field, value) { if (vDraft) { vDraft[field] = value; updateVisitLive(); } }
function updateVisitLive() {
  const el = document.getElementById('vfLive');
  if (el && vDraft) el.textContent = money(visitTotal(NORMALIZERS.visits(vDraft)));
}
PAGES.visitForm = function () {
  const v = vDraft;
  if (!v) return { title: 'زيارة', html: '' };
  const c = getCustomer(v.customerId);
  const projs = c ? projectsOf(c.id) : [];
  const ctrs = c ? DB.contracts.filter(k => k.customerId === c.id) : [];
  const ta = (id, field, label, ph) => `<div class="field"><label for="${id}">${label}</label><textarea id="${id}" placeholder="${ph || ''}" oninput="vdSet('${field}', this.value)">${esc(v[field])}</textarea></div>`;
  const chips = (id, list, cur, attr) => `<div class="unit-chips" id="${id}">${list.map(s => `<button type="button" class="chip${cur === s ? ' on' : ''}" data-${attr}="${esc(s)}">${esc(s)}</button>`).join('')}</div>`;
  const workers = DB.workers.filter(w => w.active || v.techIds.includes(w.id));
  const html = `
    <div class="card">
      <div class="card-title"><div class="t-ic">${icon('user')}</div><h2>العميل والموقع</h2></div>
      <div class="field"><label>العميل</label><button type="button" class="btn btn-ghost" style="justify-content:flex-start" id="vfCust">${icon('user')} ${c ? esc(c.name) : 'اختار العميل'}</button></div>
      ${projs.length ? `<div class="field"><label for="vfProj">المشروع <span class="hint">(اختياري)</span></label><select id="vfProj" onchange="vdSet('projectId', this.value || null)">${opt('', '— بدون مشروع —', v.projectId || '')}${projs.map(p => opt(p.id, projectLabel(p), v.projectId)).join('')}</select></div>` : ''}
      ${ctrs.length ? `<div class="field"><label for="vfCtr">ضمن عقد صيانة؟</label><select id="vfCtr" onchange="vdSet('contractId', this.value || null)">${opt('', '— لا —', v.contractId || '')}${ctrs.map(k => opt(k.id, `${k.number} · ${CONTRACT_PERIODS[k.period].label}`, v.contractId)).join('')}</select></div>` : ''}
      <div class="field" style="margin-bottom:0"><label for="vfDate">تاريخ الزيارة</label><input type="date" id="vfDate" value="${esc(v.date)}" oninput="vdSet('date', this.value || todayISO())"></div>
    </div>

    <div class="card">
      <div class="card-title"><div class="t-ic orange">${icon('wrench')}</div><h2>المشكلة والإصلاح</h2></div>
      <div class="field"><label>نوع الزيارة</label>${chips('vfTypeChips', VISIT_TYPES, v.visitType, 's')}</div>
      <div class="field"><label for="vfPType">نوع المشكلة</label><input type="text" id="vfPType" value="${esc(v.problemType)}" placeholder="اختار من تحت أو اكتب" oninput="vdSet('problemType', this.value)">
        ${chips('vfProbChips', PROBLEM_TYPES, v.problemType, 'p')}</div>
      ${ta('vfProblem', 'problem', 'وصف العطل', 'مثال: تسريب من وصلة السخان في الحمام')}
      <div class="field"><label for="vfLoc">مكان العطل</label><input type="text" id="vfLoc" list="locList" value="${esc(v.location)}" placeholder="مثال: حمام رئيسي" oninput="vdSet('location', this.value)"></div>
      <div class="field"><label>نوع الإصلاح</label>${chips('vfRepChips', REPAIR_TYPES, v.repairType, 'r')}</div>
      ${ta('vfWork', 'workDone', 'الأعمال المنفذة', 'مثال: تغيير محبس الزاوية وإعادة ربط الوصلة واختبار التسريب')}
      <div class="field" style="margin-bottom:0"><label>السباك / الفني</label>
        ${workers.length ? `<div class="unit-chips" id="vfTechs">${workers.map(w => `<button type="button" class="chip${v.techIds.includes(w.id) ? ' on' : ''}" data-w="${esc(w.id)}">${esc(w.name)}</button>`).join('')}</div>` : ''}
        <input type="text" id="vfTechName" style="margin-top:8px" value="${esc(v.techName)}" placeholder="${workers.length ? 'اسم آخر (اختياري)' : 'اسم السباك'}" oninput="vdSet('techName', this.value)"></div>
    </div>

    <div class="card">
      <div class="card-title"><div class="t-ic">${icon('box')}</div><h2>القطع المستبدلة والخامات المستخدمة</h2><span class="tag" id="vfPartsTot">${money(visitPartsTotal(v))}</span></div>
      <div id="vfParts">${v.parts.length ? v.parts.map((p, i) => `
        <div class="mat-row"><div class="m-info" data-pi="${i}"><div class="m-name">${esc(p.name)}<span class="src-badge">${p.kind === 'material' ? 'خامة' : 'قطعة غيار'}</span>${p.invId ? '<span class="src-badge">من المخزن</span>' : ''}</div><div class="m-meta">${fmtN(p.qty)} ${esc(p.unit)} × ${money(p.price)}</div></div>
        <span class="m-qty">${fmt(p.qty * p.price)}</span>
        <button type="button" class="btn btn-danger btn-icon" data-pdel="${i}" aria-label="حذف">${icon('x')}</button></div>`).join('') : '<p class="hint" style="margin:0 0 8px">لم تضف قطع غيار أو خامات.</p>'}</div>
      <div class="btn-row" style="margin-top:8px">
        <button type="button" class="btn btn-soft btn-sm" style="width:100%" id="vfAddInv">${icon('box')} من المخزن</button>
        <button type="button" class="btn btn-ghost btn-sm" style="width:100%" id="vfAddPart">${icon('plus')} إضافة يدوي</button>
      </div>
    </div>

    <div class="card">
      <div class="card-title"><div class="t-ic">${icon('camera')}</div><h2>صور قبل وبعد</h2></div>
      <div class="photo-grid" id="vfPhotos">${v.photos.map((p, i) => `<div class="photo"><img data-media="${esc(p.id)}" alt=""><span>${p.stage === 'after' ? 'بعد' : 'قبل'}</span><button type="button" data-phdel="${i}" aria-label="حذف الصورة">${icon('x')}</button></div>`).join('')}</div>
      <div class="btn-row" style="margin-top:8px">
        <button type="button" class="btn btn-soft btn-sm" style="width:100%" onclick="pickVisitPhoto('before')">${icon('camera')} صورة قبل</button>
        <button type="button" class="btn btn-soft btn-sm" style="width:100%" onclick="pickVisitPhoto('after')">${icon('camera')} صورة بعد</button>
      </div>
      <p class="hint">الصور بتتحفظ على الموبايل بس (مضغوطة)، وبتدخل في النسخة الاحتياطية.</p>
    </div>

    <div class="card">
      <div class="card-title"><div class="t-ic orange">${icon('cash')}</div><h2>التكلفة والحالة</h2></div>
      <div class="row-2">
        <div class="field"><label for="vfFee">أجرة الزيارة / الكشف (<span class="cur">${CUR}</span>)</label><input type="number" inputmode="decimal" min="0" step="any" id="vfFee" value="${v.visitFee || ''}" placeholder="0" oninput="vdSet('visitFee', pos(parseFloat(this.value)||0))"></div>
        <div class="field"><label for="vfLabor">مصنعية الإصلاح (<span class="cur">${CUR}</span>)</label><input type="number" inputmode="decimal" min="0" step="any" id="vfLabor" value="${v.laborValue || ''}" placeholder="0" oninput="vdSet('laborValue', pos(parseFloat(this.value)||0))"></div>
      </div>
      <div class="hint" style="margin:-6px 0 12px">أجرة الزيارة بتتسجل منفصلة عن مصنعية الإصلاح وعن ثمن قطع الغيار.</div>
      <div class="field"><label>حالة الإصلاح</label><div class="unit-chips" id="vfStatus">${Object.keys(VISIT_STATUS).map(k => `<button type="button" class="chip${v.status === k ? ' on' : ''}" data-st="${k}">${VISIT_STATUS[k].label}</button>`).join('')}</div></div>
      ${ta('vfRec', 'recommendations', 'التوصيات', 'مثال: تغيير خراطيم التوصيل القديمة')}
      <div class="row-2">
        <div class="field"><label for="vfWar">ضمان على الإصلاح (شهور)</label><input type="number" inputmode="decimal" min="0" step="any" id="vfWar" value="${v.warrantyMonths || ''}" placeholder="0" oninput="vdSet('warrantyMonths', pos(parseFloat(this.value)||0))"></div>
        <div class="field"><label for="vfNext">موعد الزيارة القادمة</label><input type="date" id="vfNext" value="${esc(v.nextDate)}" oninput="vdSet('nextDate', this.value)"></div>
      </div>
      <div class="field"><label for="vfWTerms">شروط الضمان</label><input type="text" id="vfWTerms" value="${esc(v.warrantyTerms)}" placeholder="اختياري" oninput="vdSet('warrantyTerms', this.value)"></div>
      <div class="field"><label for="vfNextNote">ملاحظة الموعد القادم</label><input type="text" id="vfNextNote" value="${esc(v.nextNote)}" placeholder="مثال: متابعة التسريب بعد أسبوع" oninput="vdSet('nextNote', this.value)"></div>
      ${ta('vfNotes', 'notes', 'ملاحظات', 'اختياري')}
      <div class="live-total" style="margin-top:12px"><span>إجمالي التكلفة (زيارة + مصنعية + قطع)</span><strong id="vfLive">${money(visitTotal(v))}</strong></div>
    </div>

    <div class="stack">
      <button type="button" class="btn btn-primary" onclick="saveVisitDraft()">${icon('check')} حفظ الزيارة</button>
      ${v._new ? '' : `<button type="button" class="btn btn-danger" onclick="deleteVisit('${esc(v.id)}')">${icon('trash')} حذف الزيارة</button>`}
    </div>`;
  return {
    title: v._new ? 'زيارة صيانة جديدة' : 'تعديل الزيارة', sub: c ? c.name : 'سجل الصيانة والإصلاح',
    actions: [{ icon: 'check', label: 'حفظ', accent: true, onClick: saveVisitDraft }],
    html, after: bindVisitForm
  };
};
function bindVisitForm(body) {
  const v = vDraft;
  body.querySelector('#vfCust').onclick = () => openPicker({
    title: 'اختيار العميل',
    items: DB.customers.map(c => ({ id: c.id, title: c.name, sub: `${projectsOf(c.id).length} مشروع`, avatar: initialOf(c.name) })),
    addNew: { label: q => q ? `إضافة «${q}» كعميل جديد` : 'عميل جديد', fn: () => openCustomerForm(null, c => { vDraft.customerId = c.id; vDraft.projectId = null; refreshPages(); }) },
    onPick: x => { vDraft.customerId = x.id; vDraft.projectId = null; vDraft.contractId = null; refreshPages(); }
  });
  const pick = (id, attr, field, inputId) => {
    const el = body.querySelector('#' + id);
    if (el) el.onclick = e => {
      const b = e.target.closest('.chip'); if (!b) return;
      v[field] = v[field] === b.dataset[attr] && !inputId ? '' : b.dataset[attr];
      if (inputId) body.querySelector('#' + inputId).value = v[field];
      el.querySelectorAll('.chip').forEach(x => x.classList.toggle('on', x.dataset[attr] === v[field]));
    };
  };
  pick('vfTypeChips', 's', 'visitType'); pick('vfProbChips', 'p', 'problemType', 'vfPType'); pick('vfRepChips', 'r', 'repairType');
  const techs = body.querySelector('#vfTechs');
  if (techs) techs.onclick = e => { const b = e.target.closest('[data-w]'); if (!b) return; const id = b.dataset.w; v.techIds = v.techIds.includes(id) ? v.techIds.filter(x => x !== id) : v.techIds.concat(id); b.classList.toggle('on'); };
  body.querySelector('#vfStatus').onclick = e => { const b = e.target.closest('[data-st]'); if (!b) return; v.status = b.dataset.st; body.querySelectorAll('#vfStatus .chip').forEach(x => x.classList.toggle('on', x === b)); };
  // القطع
  body.querySelectorAll('[data-pdel]').forEach(b => { b.onclick = () => { v.parts.splice(+b.dataset.pdel, 1); refreshPages(); }; });
  body.querySelectorAll('[data-pi]').forEach(el => { el.onclick = () => openVisitPartForm(+el.dataset.pi); });
  body.querySelector('#vfAddPart').onclick = () => openVisitPartForm(-1);
  body.querySelector('#vfAddInv').onclick = () => {
    if (!DB.inventory.length) { showAppToast('المخزن فاضي — ضيف القطع من «الخامات والأدوات الصحية»'); return; }
    openPicker({
      title: 'قطعة / خامة من المخزن',
      items: DB.inventory.map(it => ({ id: it.id, title: it.name + (it.spec ? ' ' + it.spec : ''), sub: `الرصيد ${fmtN(it.qty)} ${esc(it.unit)} · ${money(it.sellPrice)}`, icon: 'box' })),
      onPick: x => { const it = invById(x.id); openVisitPartForm(-1, { invId: it.id, name: it.name + (it.spec ? ' ' + it.spec : ''), unit: it.unit, qty: 1, price: it.sellPrice, cost: it.buyPrice, kind: invCatKind(it.cat) === 'material' ? 'material' : 'part' }); }
    });
  };
  // الصور
  body.querySelectorAll('[data-phdel]').forEach(b => { b.onclick = () => { v.photos.splice(+b.dataset.phdel, 1); refreshPages(); }; });
  hydrateMedia(body);
}
function openVisitPartForm(idx, preset) {
  const p = idx >= 0 ? vDraft.parts[idx] : Object.assign({ id: uid('vp'), invId: null, name: '', qty: 1, unit: 'قطعة', price: 0, cost: 0, kind: 'part' }, preset || {});
  openForm({
    title: idx >= 0 ? 'تعديل القطعة' : 'قطعة غيار / خامة',
    html: `
      <div class="chips" id="vpChips" style="flex-wrap:wrap;overflow:visible">${SPARE_PARTS.map(n => `<button type="button" class="chip" data-n="${esc(n)}">${esc(n)}</button>`).join('')}</div>
      <div class="field"><label for="vpName">الاسم</label><input type="text" id="vpName" value="${esc(p.name)}"></div>
      <div class="row-2">
        <div class="field"><label for="vpQty">العدد</label><input type="number" inputmode="decimal" min="0" step="any" id="vpQty" value="${p.qty || ''}"></div>
        <div class="field"><label for="vpUnit">الوحدة</label><input type="text" id="vpUnit" value="${esc(p.unit)}"></div>
      </div>
      <div class="row-2">
        <div class="field"><label for="vpPrice">سعر البيع (<span class="cur">${CUR}</span>)</label><input type="number" inputmode="decimal" min="0" step="any" id="vpPrice" value="${p.price || ''}"></div>
        <div class="field"><label for="vpCost">سعر الشراء</label><input type="number" inputmode="decimal" min="0" step="any" id="vpCost" value="${p.cost || ''}"></div>
      </div>
      <div class="segmented" id="vpKind"><button type="button" data-k="part" class="${p.kind !== 'material' ? 'on' : ''}">قطعة مستبدلة</button><button type="button" data-k="material" class="${p.kind === 'material' ? 'on' : ''}">خامة مستخدمة</button></div>
      ${p.invId ? `<div class="ok-box" style="margin-top:0">مربوطة بالمخزن — بتتخصم من الرصيد لما تحفظ الزيارة.</div>` : ''}`,
    after: body => {
      body.querySelector('#vpChips').onclick = e => { const b = e.target.closest('[data-n]'); if (b) body.querySelector('#vpName').value = b.dataset.n; };
      body.querySelector('#vpKind').onclick = e => { const b = e.target.closest('[data-k]'); if (!b) return; p.kind = b.dataset.k; body.querySelectorAll('#vpKind button').forEach(x => x.classList.toggle('on', x === b)); };
    },
    onSave: body => {
      const name = body.querySelector('#vpName').value.trim();
      if (!name) { showAppToast('⚠️ اكتب اسم القطعة'); return false; }
      Object.assign(p, { name, qty: pos(parseFloat(body.querySelector('#vpQty').value) || 1), unit: body.querySelector('#vpUnit').value.trim() || 'قطعة', price: pos(parseFloat(body.querySelector('#vpPrice').value) || 0), cost: pos(parseFloat(body.querySelector('#vpCost').value) || 0) });
      if (idx < 0) vDraft.parts.push(p);
    }
  });
}
function pickVisitPhoto(stage) {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = 'image/*';
  inp.onchange = () => {
    const file = inp.files && inp.files[0];
    if (!file) return;
    compressImage(file, 1024, 0.72).then(dataUrl => {
      const id = uid('ph');
      return mediaPut(id, dataUrl).then(() => { vDraft.photos.push({ id, stage }); refreshPages(); showAppToast('✔️ تم إضافة الصورة'); });
    }).catch(() => showAppToast('⚠️ تعذر حفظ الصورة على هذا الجهاز'));
  };
  inp.click();
}
function saveVisitDraft() {
  const v = vDraft;
  if (!v) return;
  if (!v.customerId) { showAppToast('⚠️ اختار العميل الأول'); return; }
  const isNew = v._new;
  const orig = v._origPhotos || [];
  delete v._new; delete v._origPhotos;
  if (!v.number) v.number = nextNumber('VST');
  const clean = NORMALIZERS.visits(v);
  clean.stockApplied = isNew ? {} : ((getVisit(v.id) || {}).stockApplied || {});
  reconcileStock(clean, visitStockDesired(clean), `زيارة ${clean.number}`);
  orig.filter(id => !clean.photos.some(p => p.id === id)).forEach(mediaDelete);
  if (isNew) DB.visits.push(clean); else DB.visits = DB.visits.map(x => x.id === clean.id ? clean : x);
  saveCol('visits');
  vDraft = null;
  showAppToast(isNew ? `✔️ تم حفظ الزيارة ${clean.number} في سجل الصيانة` : '✔️ تم تحديث الزيارة');
  closeTopThen(() => { if (isNew) openPage('visit', clean.id); else refreshAll(); });
}
function deleteVisit(id) {
  const v = getVisit(id);
  if (!v) return;
  showAppConfirm('حذف هذه الزيارة من سجل الصيانة؟ (القطع المخصومة من المخزن هترجع)', () => {
    removeVisitData(v);
    DB.visits = DB.visits.filter(x => x.id !== id);
    DB.workers.forEach(w => w.entries.forEach(e => { if (e.visitId === id) e.visitId = null; }));
    saveCol('visits'); saveCol('workers');
    vDraft = null;
    // اقفل نموذج/صفحة الزيارة
    let n = 0;
    for (let i = pageStack.length - 1; i >= 0; i--) { const p = pageStack[i]; if ((p.key === 'visit' && p.args[0] === id) || p.key === 'visitForm') n++; else break; }
    closeSheetsThen(() => goBackThen(n, () => { refreshAll(); showAppToast('تم حذف الزيارة'); }));
  });
}
PAGES.visit = function (id) {
  const v = getVisit(id);
  if (!v) return { title: 'زيارة', html: '<p class="hint">الزيارة غير موجودة.</p>' };
  const c = getCustomer(v.customerId), pr = getProject(v.projectId);
  const row = (label, value) => value ? `<div class="sum-row txt"><span>${label}</span><strong>${value}</strong></div>` : '';
  const block = (title, text) => text ? `<div class="note" style="margin-bottom:10px"><strong>${title}:</strong> ${esc(text)}</div>` : '';
  const doc = v.docId ? getDoc(v.docId) : null;
  const ctr = v.contractId ? getContract(v.contractId) : null;
  const html = `
    <section class="hero">
      <div class="hero-label">${esc(visitTitle(v))} · ${esc(fmtDate(v.date))}</div>
      <div class="hero-value"><span>${fmt(visitTotal(v))}</span><small>${CUR}</small></div>
      <div class="hero-stats">
        <div class="hero-stat"><span>أجرة الزيارة</span><strong>${money(v.visitFee)}</strong></div>
        <div class="hero-stat"><span>مصنعية الإصلاح</span><strong>${money(v.laborValue)}</strong></div>
        <div class="hero-stat"><span>القطع والخامات</span><strong>${money(visitPartsTotal(v))}</strong></div>
      </div>
    </section>
    <div class="card">
      <div class="card-title"><div class="t-ic">${icon('report')}</div><h2>بيانات الزيارة</h2>${statusPill(v.status)}</div>
      <div class="sum-list">
        ${row('رقم الزيارة', `<span dir="ltr">${esc(v.number)}</span>`)}${row('العميل', c ? esc(c.name) : '')}${row('المشروع', pr ? esc(pr.name) : '')}
        ${row('نوع الزيارة', esc(v.visitType))}${row('نوع المشكلة', esc(v.problemType))}${row('مكان العطل', esc(v.location))}${row('نوع الإصلاح', esc(v.repairType))}
        ${row('السباك / الفني', esc(visitTechNames(v)))}${row('عقد الصيانة', ctr ? esc(ctr.number) : '')}
        ${v.warrantyMonths ? row('الضمان', `${fmtN(v.warrantyMonths)} شهر حتى ${esc(fmtDate(addMonthsISO(v.date, v.warrantyMonths)))}`) : ''}
        ${v.nextDate ? row('الزيارة القادمة', `${esc(fmtDate(v.nextDate))}${v.nextDone ? ' ✓' : ''}`) : ''}
      </div>
    </div>
    ${block('وصف العطل', v.problem)}${block('الأعمال المنفذة', v.workDone)}
    ${v.parts.length ? `<div class="card"><div class="card-title"><div class="t-ic">${icon('box')}</div><h2>القطع المستبدلة والخامات</h2></div>${v.parts.map(p => `<div class="sum-row"><span>${esc(p.name)} (${fmtN(p.qty)} ${esc(p.unit)} × ${money(p.price)}) · ${p.kind === 'material' ? 'خامة' : 'قطعة غيار'}</span><strong>${money(p.qty * p.price)}</strong></div>`).join('')}</div>` : ''}
    ${block('التوصيات', v.recommendations)}${block('ملاحظات', v.notes)}
    ${v.photos.length ? `<div class="card"><div class="card-title"><div class="t-ic">${icon('camera')}</div><h2>الصور</h2></div><div class="photo-grid">${v.photos.map(p => `<div class="photo"><img data-media="${esc(p.id)}" alt=""><span>${p.stage === 'after' ? 'بعد' : 'قبل'}</span></div>`).join('')}</div></div>` : ''}
    <div class="stack">
      <button type="button" class="btn btn-accent" onclick="openVisitReportPreview('${esc(v.id)}')">${icon('printer')} تقرير الصيانة والإصلاح PDF</button>
      ${doc ? `<button type="button" class="btn btn-primary" onclick="openDoc('${esc(doc.id)}')">${icon('file')} فتح الفاتورة ${esc(doc.number)}</button>`
        : `<button type="button" class="btn btn-primary" onclick="createDocFromVisit('${esc(v.id)}')">${icon('file')} إنشاء فاتورة من الزيارة</button>`}
      <div class="btn-row">
        <button type="button" class="btn btn-wa" onclick="sendWhatsApp((getCustomer(getVisit('${esc(v.id)}').customerId)||{}).phone, buildVisitText(getVisit('${esc(v.id)}')))">${icon('send')} التقرير واتساب</button>
        <button type="button" class="btn btn-ghost" onclick="copyText(buildVisitText(getVisit('${esc(v.id)}')), '✔️ تم نسخ التقرير')">${icon('copy')} نسخ</button>
      </div>
      ${v.nextDate && !v.nextDone ? `<button type="button" class="btn btn-soft" onclick="markFollowDone('${esc(v.id)}')">${icon('check')} تم تنفيذ الزيارة القادمة</button>` : ''}
      ${v.nextDate ? `<button type="button" class="btn btn-ghost" onclick="exportICS([reminderFromVisit(getVisit('${esc(v.id)}'))])">${icon('calendar')} إضافة الموعد لتقويم الموبايل</button>` : ''}
    </div>`;
  return {
    title: 'زيارة ' + (v.number || ''), sub: [c ? c.name : '', v.location].filter(Boolean).join(' · '),
    actions: [{ icon: 'edit', label: 'تعديل', onClick: () => openVisitForm(v.id) }],
    html, after: body => hydrateMedia(body)
  };
};
function markFollowDone(id) { const v = getVisit(id); if (!v) return; v.nextDone = true; saveCol('visits'); refreshAll(); showAppToast('✔️ تم'); }
// فاتورة صيانة من الزيارة: رسوم الزيارة، مصنعية الإصلاح، وقطع الغيار — كل واحدة بند منفصل
function visitDocLines(v) {
  const lines = [];
  if (v.visitFee) lines.push({ cat: 'visits', kind: 'diag', name: v.visitType || 'زيارة كشف', method: 'visit', qty: 1, price: v.visitFee, visitType: v.visitType, space: v.location });
  if (v.laborValue) lines.push({ cat: 'maint', kind: 'service', name: [v.repairType, v.problemType].filter(Boolean).join(' - ') || 'مصنعية إصلاح', method: 'job', qty: 1, price: v.laborValue, space: v.location, note: v.workDone.slice(0, 120) });
  // القطع اتخصمت من المخزن مع الزيارة، فمش مربوطة بالمخزن تاني في الفاتورة
  v.parts.forEach(p => lines.push({ cat: p.kind === 'material' ? 'pipes' : 'maint', kind: p.kind === 'material' ? 'material' : 'part', name: p.name, method: 'piece', qty: p.qty, unit: p.unit, price: p.price, cost: p.cost, space: v.location }));
  return lines;
}
function createDocFromVisit(id) {
  const v = getVisit(id);
  if (!v) return;
  const d = createDoc('maint', { customerId: v.customerId, projectId: v.projectId, lines: visitDocLines(v), visitId: v.id });
  d.warrantyMonths = v.warrantyMonths; d.warrantyTerms = v.warrantyTerms; d.date = v.date;
  d.workerIds = v.techIds.slice();
  saveDoc(d);
  v.docId = d.id;
  saveCol('visits');
  closeEverythingThen(() => { openEditor('summary'); renderEditor(); showAppToast(`✔️ اتعملت ${docTypeInfo(d.docType).label} ${d.number} من الزيارة`); });
}
function visitSearchText(v) {
  const c = getCustomer(v.customerId), pr = getProject(v.projectId);
  return [v.number, v.visitType, v.problemType, v.problem, v.location, v.repairType, v.workDone, v.recommendations, v.notes, visitTechNames(v), c ? c.name + ' ' + c.phone : '', pr ? pr.name : '', v.parts.map(p => p.name).join(' ')].join(' ');
}
let visFilter = 'all';
PAGES.visits = function () {
  const q = ((document.getElementById('visSearch') || {}).value || '').trim();
  const list = DB.visits.slice().sort(byNewest).filter(v => (visFilter === 'all' || v.status === visFilter) && (!q || visitSearchText(v).includes(q)));
  const total = round2(list.reduce((s, v) => s + visitTotal(v), 0));
  return {
    title: 'سجل الصيانة والإصلاح', sub: `${DB.visits.length} زيارة`,
    html: `
      <button type="button" class="btn btn-accent" style="margin-bottom:12px" onclick="openVisitForm(null)">${icon('plus')} زيارة صيانة / إصلاح جديدة</button>
      <div class="field"><input type="search" id="visSearch" value="${esc(q)}" placeholder="ابحث بالعميل أو المشكلة أو مكان العطل أو القطعة..."></div>
      <div class="filter-chips" id="visFilter">${[['all', 'الكل'], ...Object.keys(VISIT_STATUS).map(k => [k, VISIT_STATUS[k].label])].map(([k, l]) => `<button type="button" class="chip${visFilter === k ? ' on' : ''}" data-f="${k}">${esc(l)}</button>`).join('')}</div>
      ${list.length ? `<div class="hint" style="margin:0 2px 8px">${list.length} زيارة · إجمالي ${money(total)}</div>` + list.map(visitCardHTML).join('') : `<div class="card empty"><div class="big">${icon('history')}</div><p>لا توجد زيارات${q || visFilter !== 'all' ? ' مطابقة' : ' بعد'}.</p></div>`}`,
    after: body => {
      bindVisitCards(body);
      const s = body.querySelector('#visSearch');
      s.oninput = () => { refreshPages(); const n = document.getElementById('visSearch'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } };
      body.querySelector('#visFilter').onclick = e => { const b = e.target.closest('[data-f]'); if (b) { visFilter = b.dataset.f; refreshPages(); } };
    }
  };
};
