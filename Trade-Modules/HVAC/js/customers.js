/* =========================================================
   أرزقي HVAC - customers.js
   العملاء وحساباتهم، أجهزة كل عميل، وسجل الزيارات والتقارير الفنية.
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
    devices: devicesOf(c.id), visits: DB.visits.filter(v => v.customerId === c.id), contracts: DB.contracts.filter(k => k.customerId === c.id)
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
  document.getElementById('ledgerDevices').textContent = DB.devices.length;
  const q = val('customerSearch').trim();
  const box = document.getElementById('customerList');
  const list = DB.customers.map(c => ({ c, st: customerStats(c) })).filter(x => !q || x.c.name.includes(q) || x.c.phone.includes(q) || x.c.address.includes(q));
  if (!DB.customers.length) {
    box.innerHTML = `<div class="card empty"><div class="big">${icon('users')}</div><p>لا يوجد عملاء بعد.<br>سجّل عملاءك وأجهزتهم وكل دفعة بتوصلك.</p><button type="button" class="btn btn-accent" onclick="openCustomerForm(null)">${icon('plus')} إضافة أول عميل</button></div>`;
  } else if (!list.length) {
    box.innerHTML = `<div class="card empty"><div class="big">${icon('search')}</div><p>لا يوجد عميل مطابق للبحث.</p></div>`;
  } else {
    box.innerHTML = list.map(({ c, st }) => {
      let amt;
      if (st.remaining > 0) amt = `<div class="cust-amt due">${fmt(st.remaining)}<small>${CUR} متبقي عليه</small></div>`;
      else if (st.billDocs.length && round2(st.remaining) === 0) amt = `<div class="cust-amt ok">خالص ✓<small>لا يوجد متبقي</small></div>`;
      else if (st.remaining < 0) amt = `<div class="cust-amt ok">${fmt(-st.remaining)}<small>${CUR} زيادة له</small></div>`;
      else amt = `<div class="cust-amt">0<small>لا توجد حركة</small></div>`;
      const meta = [c.phone ? `<span dir="ltr">${esc(c.phone)}</span>` : '', `${st.devices.length} جهاز`, `${st.billDocs.length} فاتورة`].filter(Boolean).join(' · ');
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
  showAppConfirm(`حذف العميل "${c.name}" مع أجهزته (${st.devices.length}) وسجل زياراتها (${st.visits.length})؟ الفواتير والدفعات نفسها لن تُحذف لكن هتتفك من العميل.`, () => {
    st.visits.forEach(v => removeVisitData(v));
    DB.visits = DB.visits.filter(v => v.customerId !== id);
    DB.devices = DB.devices.filter(d => d.customerId !== id);
    DB.docs.forEach(d => { if (d.customerId === id) { d.customerId = null; d.deviceIds = []; } });
    DB.payments.forEach(p => { if (p.customerId === id) p.customerId = null; });
    DB.contracts.forEach(k => { if (k.customerId === id) { k.customerId = null; k.deviceIds = []; } });
    DB.matlists.forEach(l => { if (l.customerId === id) l.customerId = null; });
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
        <div class="hero-stat"><span>الأجهزة</span><strong>${st.devices.length}</strong></div>
      </div>
    </section>
    ${c.note ? `<div class="note" style="margin-bottom:14px"><strong>ملاحظات:</strong> ${esc(c.note)}</div>` : ''}
    <div class="segmented" style="grid-template-columns:repeat(4,minmax(0,1fr));margin-bottom:12px" id="custTabs">
      <button type="button" data-t="acc" class="${custTab === 'acc' ? 'on' : ''}">الحساب</button>
      <button type="button" data-t="dev" class="${custTab === 'dev' ? 'on' : ''}">الأجهزة (${st.devices.length})</button>
      <button type="button" data-t="vis" class="${custTab === 'vis' ? 'on' : ''}">الزيارات (${st.visits.length})</button>
      <button type="button" data-t="ctr" class="${custTab === 'ctr' ? 'on' : ''}">العقود (${st.contracts.length})</button>
    </div>`;
  if (custTab === 'acc') {
    html += `<div class="card"><div class="card-title"><div class="t-ic">${icon('file')}</div><h2>الفواتير والمستندات</h2><span class="tag">${st.docs.length}</span></div>
      <div id="custDocs">${st.docs.length ? st.docs.map(docCardHTML).join('') : '<p class="hint" style="margin:-4px 0 12px">لا توجد فواتير لهذا العميل بعد.</p>'}</div>
      <button type="button" class="btn btn-primary" onclick="closeEverythingThen(() => pickDocType('${esc(c.id)}'))">${icon('plus')} فاتورة / عرض سعر جديد</button></div>`;
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
  } else if (custTab === 'dev') {
    html += `<button type="button" class="btn btn-accent" style="margin-bottom:12px" onclick="openDeviceForm(null, '${esc(c.id)}')">${icon('plus')} إضافة جهاز للعميل</button>`;
    html += st.devices.length ? st.devices.map(deviceCardHTML).join('') : `<div class="card empty"><div class="big">${icon('ac')}</div><p>لا توجد أجهزة مسجلة لهذا العميل.<br>العميل يقدر يكون عنده أي عدد من الأجهزة، ولكل جهاز سجل صيانة كامل.</p></div>`;
  } else if (custTab === 'vis') {
    html += `<button type="button" class="btn btn-accent" style="margin-bottom:12px" onclick="openVisitForm(null, {customerId: '${esc(c.id)}'})">${icon('plus')} تسجيل زيارة جديدة</button>`;
    html += st.visits.length ? st.visits.slice().sort(byNewest).map(visitCardHTML).join('') : `<div class="card empty"><div class="big">${icon('calendar')}</div><p>لا توجد زيارات مسجلة.</p></div>`;
  } else {
    html += `<button type="button" class="btn btn-accent" style="margin-bottom:12px" onclick="openContractForm(null, '${esc(c.id)}')">${icon('plus')} عقد صيانة جديد</button>`;
    html += st.contracts.length ? st.contracts.map(contractCardHTML).join('') : `<div class="card empty"><div class="big">${icon('file')}</div><p>لا توجد عقود صيانة لهذا العميل.</p></div>`;
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
      bindDeviceCards(body); bindVisitCards(body); bindContractCards(body);
    }
  };
};

/* =========================================================
   أجهزة العملاء
   ========================================================= */
function getDevice(id) { return DB.devices.find(d => d.id === id) || null; }
function devicesOf(cid) { return DB.devices.filter(d => d.customerId === cid); }
// عزل اتجاه النص (LTR) علشان «12000 BTU/h» ما تتقلبش جوه الكلام العربي
function capText(dv) { return dv.capacity ? `\u2066${dv.capacity} ${dv.capUnit}\u2069` : ''; }
function deviceLabel(dv) { return [dv.type, dv.brand, capText(dv)].filter(Boolean).join(' · ') + (dv.location ? ` (${dv.location})` : ''); }
function deviceVisits(id) { return DB.visits.filter(v => v.deviceId === id).sort(byNewest); }
function deviceNextMaint(dv) {
  if (!dv.maintEveryMonths) return '';
  const last = deviceVisits(dv.id)[0];
  return addMonthsISO(last ? last.date : (dv.installDate || todayISO()), dv.maintEveryMonths);
}
function deviceCardHTML(dv) {
  const vs = deviceVisits(dv.id);
  const c = getCustomer(dv.customerId);
  const next = deviceNextMaint(dv);
  return `
    <div class="inv-card" data-dev="${esc(dv.id)}">
      <div class="inv-avatar"${deviceCategoryOf(dv.type) === 'تبريد' ? ' style="background:linear-gradient(135deg,#0ea5e9,#0369a1)"' : ''}>${icon(deviceCategoryOf(dv.type) === 'تبريد' ? 'snow' : 'ac')}</div>
      <div class="inv-info"><div class="n"><span class="nm">${esc(dv.type)}${dv.brand ? ' ' + esc(dv.brand) : ''}</span></div>
        <div class="m">${[c ? esc(c.name) : '', capText(dv) ? esc(capText(dv)) : '', dv.model ? 'موديل ' + esc(dv.model) : '', dv.location ? esc(dv.location) : ''].filter(Boolean).join(' · ')}</div></div>
      <div class="inv-amount" style="color:var(--muted)">${vs.length}<small>${next ? 'صيانة ' + esc(fmtDate(next)) : 'زيارة'}</small></div>
    </div>`;
}
function bindDeviceCards(box) { box.querySelectorAll('[data-dev]').forEach(el => { if (el.classList.contains('inv-card')) el.onclick = () => openPage('device', el.dataset.dev); }); }
function openDeviceForm(id, customerId, addToDoc) {
  const dv = id ? getDevice(id) : null;
  const d = dv ? Object.assign({}, dv) : NORMALIZERS.devices({ id: uid('dv_'), customerId: customerId || null });
  let cat = deviceCategoryOf(d.type);
  const typesHTML = () => DEVICE_TYPES[cat].map(t => opt(t, t, d.type)).join('');
  const custOpts = opt('', '— اختار العميل —', d.customerId || '') + DB.customers.map(c => opt(c.id, c.name, d.customerId)).join('');
  openForm({
    title: dv ? 'تعديل بيانات الجهاز' : 'جهاز جديد',
    html: `
      <div class="field"><label for="dvCust">العميل</label><select id="dvCust">${custOpts}</select></div>
      <div class="segmented" id="dvCat"><button type="button" data-c="تكييف" class="${cat === 'تكييف' ? 'on' : ''}">تكييف</button><button type="button" data-c="تبريد" class="${cat === 'تبريد' ? 'on' : ''}">تبريد</button></div>
      <div class="field"><label for="dvType">نوع الجهاز</label><select id="dvType">${typesHTML()}</select></div>
      <div class="row-2">
        <div class="field"><label for="dvBrand">الشركة المصنعة</label><input type="text" id="dvBrand" list="brandList" value="${esc(d.brand)}" placeholder="مثال: شارب"></div>
        <div class="field"><label for="dvModel">الموديل</label><input type="text" id="dvModel" dir="ltr" style="text-align:right" value="${esc(d.model)}"></div>
      </div>
      <div class="field"><label for="dvSerial">الرقم التسلسلي</label><input type="text" id="dvSerial" dir="ltr" style="text-align:right" value="${esc(d.serial)}"></div>
      <div class="row-2">
        <div class="field"><label for="dvCap">القدرة</label><input type="text" inputmode="decimal" id="dvCap" value="${esc(d.capacity)}" placeholder="مثال: 12000"></div>
        <div class="field"><label for="dvCapU">وحدة القدرة</label><select id="dvCapU">${CAP_UNITS.map(u => opt(u, u, d.capUnit)).join('')}</select></div>
      </div>
      <div class="field"><label for="dvRef">نوع الفريون</label><select id="dvRef">${opt('', '— غير محدد —', d.refrigerant)}${REFRIGERANTS.map(r => opt(r, r, d.refrigerant)).join('')}</select></div>
      <div class="row-2">
        <div class="field"><label for="dvBuy">تاريخ الشراء</label><input type="date" id="dvBuy" value="${esc(d.purchaseDate)}"></div>
        <div class="field"><label for="dvInst">تاريخ التركيب</label><input type="date" id="dvInst" value="${esc(d.installDate)}"></div>
      </div>
      <div class="row-2">
        <div class="field"><label for="dvLoc">موقع الجهاز</label><input type="text" id="dvLoc" value="${esc(d.location)}" placeholder="مثال: غرفة النوم"></div>
        <div class="field"><label for="dvEvery">صيانة دورية كل (شهر)</label><input type="number" inputmode="decimal" min="0" step="1" id="dvEvery" value="${d.maintEveryMonths || ''}" placeholder="مثلاً 6"></div>
      </div>
      <div class="field"><label for="dvNotes">ملاحظات فنية</label><textarea id="dvNotes" placeholder="اختياري">${esc(d.notes)}</textarea></div>`,
    after: body => {
      body.querySelector('#dvCat').onclick = e => {
        const b = e.target.closest('[data-c]'); if (!b) return;
        cat = b.dataset.c;
        body.querySelectorAll('#dvCat button').forEach(x => x.classList.toggle('on', x === b));
        body.querySelector('#dvType').innerHTML = typesHTML();
      };
    },
    saveText: dv ? 'تحديث الجهاز' : 'حفظ الجهاز',
    onSave: body => {
      const g = s => body.querySelector(s).value;
      const cust = g('#dvCust');
      if (!cust) { showAppToast('⚠️ اختار العميل صاحب الجهاز'); return false; }
      Object.assign(d, { customerId: cust, type: g('#dvType'), brand: g('#dvBrand').trim(), model: g('#dvModel').trim(), serial: g('#dvSerial').trim(), capacity: g('#dvCap').trim(), capUnit: g('#dvCapU'),
        refrigerant: g('#dvRef'), purchaseDate: g('#dvBuy'), installDate: g('#dvInst'), location: g('#dvLoc').trim(), maintEveryMonths: pos(parseFloat(g('#dvEvery')) || 0), notes: g('#dvNotes').trim() });
      const clean = NORMALIZERS.devices(d);
      if (dv) DB.devices = DB.devices.map(x => x.id === clean.id ? clean : x);
      else DB.devices.push(clean);
      saveCol('devices');
      if (!dv && addToDoc) { const doc = getCurrentDoc(); if (doc && doc.customerId === clean.customerId) { doc.deviceIds.push(clean.id); saveDoc(doc); } }
      showAppToast(dv ? '✔️ تم تحديث الجهاز' : '✔️ تم حفظ الجهاز');
    },
    onDelete: dv ? () => deleteDevice(dv.id) : null,
    deleteText: 'حذف الجهاز'
  });
}
function deleteDevice(id) {
  const dv = getDevice(id);
  if (!dv) return;
  const vs = deviceVisits(id);
  showAppConfirm(`حذف الجهاز "${deviceLabel(dv)}"${vs.length ? ` مع سجل صيانته (${vs.length} زيارة)` : ''}؟`, () => {
    vs.forEach(removeVisitData);
    DB.visits = DB.visits.filter(v => v.deviceId !== id);
    DB.devices = DB.devices.filter(d => d.id !== id);
    DB.docs.forEach(d => { d.deviceIds = d.deviceIds.filter(x => x !== id); });
    DB.contracts.forEach(k => { k.deviceIds = k.deviceIds.filter(x => x !== id); });
    saveAll();
    closeSheetsThen(() => {
      const top = topPage();
      if (top && top.key === 'device' && top.args[0] === id) closeOverlay();
      refreshAll();
      showAppToast('تم حذف الجهاز');
    });
  });
}
PAGES.device = function (id) {
  const dv = getDevice(id);
  if (!dv) return { title: 'الجهاز', html: '<p class="hint">الجهاز غير موجود.</p>' };
  const c = getCustomer(dv.customerId);
  const vs = deviceVisits(id);
  const next = deviceNextMaint(dv);
  const row = (label, value) => value ? `<div class="sum-row txt"><span>${label}</span><strong>${value}</strong></div>` : '';
  const warr = activeWarrantiesForDevice(id);
  const html = `
    <div class="card">
      <div class="card-title"><div class="t-ic">${icon('ac')}</div><h2>بيانات الجهاز</h2><span class="tag">${esc(deviceCategoryOf(dv.type))}</span></div>
      <div class="sum-list">
        ${row('العميل', c ? esc(c.name) : '-')}
        ${row('النوع', esc(dv.type))}${row('الشركة المصنعة', esc(dv.brand))}${row('الموديل', `<span dir="ltr">${esc(dv.model)}</span>`.replace('<span dir="ltr"></span>', ''))}
        ${row('الرقم التسلسلي', dv.serial ? `<span dir="ltr">${esc(dv.serial)}</span>` : '')}${row('القدرة', esc(capText(dv)))}${row('نوع الفريون', esc(dv.refrigerant))}
        ${row('تاريخ الشراء', esc(fmtDate(dv.purchaseDate)))}${row('تاريخ التركيب', esc(fmtDate(dv.installDate)))}${row('الموقع', esc(dv.location))}
        ${row('الصيانة الدورية', dv.maintEveryMonths ? `كل ${fmtN(dv.maintEveryMonths)} شهر · القادمة ${esc(fmtDate(next))}` : '')}
      </div>
      ${dv.notes ? `<div class="note" style="margin-top:10px"><strong>ملاحظات فنية:</strong> ${esc(dv.notes)}</div>` : ''}
      ${warr.length ? `<div class="ok-box">${icon('shield')} ضمان سارٍ: ${warr.map(w => `${esc(w.title)} حتى <b>${esc(fmtDate(w.end))}</b>`).join(' · ')}</div>` : ''}
    </div>
    <div class="section-head"><h3>سجل الصيانة<span class="count">${vs.length}</span></h3>
      <button type="button" class="btn btn-soft btn-sm" onclick="openVisitForm(null, {customerId: '${esc(dv.customerId || '')}', deviceId: '${esc(dv.id)}'})">${icon('plus')} زيارة</button></div>
    ${vs.length ? vs.map(visitCardHTML).join('') : `<div class="card empty"><div class="big">${icon('history')}</div><p>لا توجد زيارات لهذا الجهاز بعد.</p></div>`}
    <div class="stack" style="margin-top:6px">
      <button type="button" class="btn btn-accent" onclick="openDeviceHistoryPreview('${esc(dv.id)}')">${icon('printer')} سجل صيانة الجهاز PDF</button>
      <button type="button" class="btn btn-danger" onclick="deleteDevice('${esc(dv.id)}')">${icon('trash')} حذف الجهاز</button>
    </div>`;
  return {
    title: dv.type + (dv.brand ? ' ' + dv.brand : ''), sub: [c ? c.name : '', capText(dv), dv.location].filter(Boolean).join(' · '),
    actions: [{ icon: 'edit', label: 'تعديل الجهاز', onClick: () => openDeviceForm(dv.id) }],
    html, after: body => bindVisitCards(body)
  };
};
let devFilter = 'all';
PAGES.devices = function () {
  const q = (document.getElementById('devSearch') || {}).value || '';
  const list = DB.devices.filter(dv => {
    if (devFilter !== 'all' && deviceCategoryOf(dv.type) !== devFilter) return false;
    const c = getCustomer(dv.customerId);
    return !q.trim() || [dv.type, dv.brand, dv.model, dv.serial, dv.location, c ? c.name : ''].join(' ').includes(q.trim());
  });
  const html = `
    <button type="button" class="btn btn-accent" style="margin-bottom:12px" onclick="newDeviceWithCustomer()">${icon('plus')} جهاز جديد</button>
    <div class="field"><input type="search" id="devSearch" value="${esc(q)}" placeholder="ابحث بالنوع أو الماركة أو الموديل أو السيريال أو العميل..."></div>
    <div class="filter-chips" id="devFilter">${[['all', 'الكل'], ['تكييف', 'تكييف'], ['تبريد', 'تبريد']].map(([k, l]) => `<button type="button" class="chip${devFilter === k ? ' on' : ''}" data-f="${k}">${l}</button>`).join('')}</div>
    <div id="devList">${list.length ? list.map(deviceCardHTML).join('') : `<div class="card empty"><div class="big">${icon('ac')}</div><p>${DB.devices.length ? 'لا يوجد جهاز مطابق.' : 'لا توجد أجهزة مسجلة بعد.'}</p></div>`}</div>`;
  return {
    title: 'أجهزة العملاء', sub: `${DB.devices.length} جهاز`, html,
    after: body => {
      bindDeviceCards(body);
      const s = body.querySelector('#devSearch');
      s.oninput = () => { const pos0 = s.selectionStart; refreshPages(); const n = document.getElementById('devSearch'); if (n) { n.focus(); try { n.setSelectionRange(pos0, pos0); } catch (e) {} } };
      body.querySelector('#devFilter').onclick = e => { const b = e.target.closest('[data-f]'); if (b) { devFilter = b.dataset.f; refreshPages(); } };
    }
  };
};
function newDeviceWithCustomer() {
  if (!DB.customers.length) { openCustomerForm(null, c => openDeviceForm(null, c.id)); return; }
  openPicker({
    title: 'الجهاز لأي عميل؟',
    items: DB.customers.map(c => ({ id: c.id, title: c.name, sub: `${devicesOf(c.id).length} جهاز${c.phone ? ' · ' + esc(c.phone) : ''}`, avatar: initialOf(c.name) })),
    addNew: { label: q => q ? `إضافة «${q}» كعميل جديد` : 'عميل جديد', fn: q => openCustomerForm(null, c => openDeviceForm(null, c.id)) },
    onPick: x => openDeviceForm(null, x.id)
  });
}

/* =========================================================
   الزيارات وسجل الصيانة والتقارير الفنية
   ========================================================= */
function getVisit(id) { return DB.visits.find(v => v.id === id) || null; }
function visitPartsTotal(v) { return round2(v.parts.reduce((s, p) => s + n0(p.qty) * n0(p.price), 0)); }
function visitRefTotal(v) { const kg = v.refUnit === 'جم' ? v.refQty / 1000 : v.refQty; return round2(kg * n0(v.refPrice)); }
function visitTotal(v) { return round2(n0(v.serviceValue) + visitPartsTotal(v) + visitRefTotal(v)); }
function visitTechNames(v) {
  const names = v.techIds.map(id => { const w = DB.workers.find(x => x.id === id); return w ? w.name : ''; }).filter(Boolean);
  if (v.techName) names.push(v.techName);
  return names.join('، ');
}
function statusPill(st) { const s = VISIT_STATUS[st] || VISIT_STATUS.done; return `<span class="pill-st" style="--c:${s.color}">${esc(s.label)}</span>`; }
function visitCardHTML(v) {
  const dv = getDevice(v.deviceId);
  const c = getCustomer(v.customerId);
  return `
    <div class="inv-card" data-visit="${esc(v.id)}">
      <div class="inv-avatar" style="background:linear-gradient(135deg,var(--success),#0b7a55)">${icon('wrench')}</div>
      <div class="inv-info"><div class="n"><span class="nm">${esc(v.serviceType || 'زيارة')}</span>${statusPill(v.status)}</div>
        <div class="m">${esc(fmtDate(v.date))}${c ? ' · ' + esc(c.name) : ''}${dv ? ' · ' + esc(dv.type) : ''}${v.fault ? ' · ' + esc(v.fault) : ''}</div></div>
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
  v.parts.forEach(p => { if (p.invId && invById(p.invId)) want[p.invId] = round2((want[p.invId] || 0) + n0(p.qty)); });
  return want;
}

/* ---------- نموذج الزيارة (صفحة كاملة) ---------- */
let vDraft = null;
function openVisitForm(id, preset = {}) {
  const v = id ? getVisit(id) : null;
  vDraft = v ? JSON.parse(JSON.stringify(v)) : NORMALIZERS.visits(Object.assign({ id: uid('v_'), date: todayISO(), status: 'done', serviceType: '' }, preset));
  if (!v && vDraft.contractId) vDraft.serviceType = 'زيارة ضمن عقد';
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
  const devs = c ? devicesOf(c.id) : [];
  const ctrs = c ? DB.contracts.filter(k => k.customerId === c.id) : [];
  const ta = (id, field, label, ph) => `<div class="field"><label for="${id}">${label}</label><textarea id="${id}" placeholder="${ph || ''}" oninput="vdSet('${field}', this.value)">${esc(v[field])}</textarea></div>`;
  const workers = DB.workers.filter(w => w.active || v.techIds.includes(w.id));
  const html = `
    <div class="card">
      <div class="card-title"><div class="t-ic">${icon('user')}</div><h2>العميل والجهاز</h2></div>
      <div class="field"><label>العميل</label><button type="button" class="btn btn-ghost" style="justify-content:flex-start" id="vfCust">${icon('user')} ${c ? esc(c.name) : 'اختار العميل'}</button></div>
      ${c ? `<div class="field"><label for="vfDev">الجهاز</label><select id="vfDev" onchange="vdSet('deviceId', this.value || null)">${opt('', devs.length ? '— اختار الجهاز —' : 'لا توجد أجهزة', v.deviceId || '')}${devs.map(d => opt(d.id, deviceLabel(d), v.deviceId)).join('')}</select>
        <button type="button" class="btn btn-soft btn-sm" style="margin-top:8px" onclick="openDeviceForm(null, '${esc(c.id)}')">${icon('plus')} جهاز جديد</button></div>` : ''}
      ${ctrs.length ? `<div class="field"><label for="vfCtr">ضمن عقد صيانة؟</label><select id="vfCtr" onchange="vdSet('contractId', this.value || null)">${opt('', '— لا —', v.contractId || '')}${ctrs.map(k => opt(k.id, `${k.number} · ${CONTRACT_PERIODS[k.period].label}`, v.contractId)).join('')}</select></div>` : ''}
      <div class="field" style="margin-bottom:0"><label for="vfDate">تاريخ الزيارة</label><input type="date" id="vfDate" value="${esc(v.date)}" oninput="vdSet('date', this.value || todayISO())"></div>
    </div>

    <div class="card">
      <div class="card-title"><div class="t-ic orange">${icon('wrench')}</div><h2>الخدمة والعطل</h2></div>
      <div class="field"><label for="vfType">نوع الخدمة</label><input type="text" id="vfType" value="${esc(v.serviceType)}" placeholder="اختار من تحت أو اكتب" oninput="vdSet('serviceType', this.value)">
        <div class="unit-chips" id="vfTypeChips">${SERVICE_TYPES.map(s => `<button type="button" class="chip${v.serviceType === s ? ' on' : ''}" data-s="${esc(s)}">${esc(s)}</button>`).join('')}</div></div>
      <div class="field"><label>الفني</label>
        ${workers.length ? `<div class="unit-chips" id="vfTechs">${workers.map(w => `<button type="button" class="chip${v.techIds.includes(w.id) ? ' on' : ''}" data-w="${esc(w.id)}">${esc(w.name)}</button>`).join('')}</div>` : ''}
        <input type="text" id="vfTechName" style="margin-top:8px" value="${esc(v.techName)}" placeholder="${workers.length ? 'فني آخر (اختياري)' : 'اسم الفني'}" oninput="vdSet('techName', this.value)"></div>
      ${ta('vfProblem', 'problem', 'وصف المشكلة (كما ذكرها العميل)', 'مثال: التكييف بيفصل ومش بيبرد')}
      ${ta('vfFault', 'fault', 'العطل المكتشف', 'مثال: كابستور الضاغط ضعيف')}
      ${ta('vfCause', 'cause', 'سبب العطل (إن تم تحديده)', 'اختياري')}
      ${ta('vfWork', 'workDone', 'الأعمال المنفذة', 'مثال: تغيير الكابستور وتنظيف المكثف')}
    </div>

    <div class="card">
      <div class="card-title"><div class="t-ic">${icon('box')}</div><h2>قطع الغيار والخامات المستخدمة</h2><span class="tag" id="vfPartsTot">${money(visitPartsTotal(v))}</span></div>
      <div id="vfParts">${v.parts.length ? v.parts.map((p, i) => `
        <div class="mat-row"><div class="m-info" data-pi="${i}"><div class="m-name">${esc(p.name)}${p.invId ? '<span class="src-badge">من المخزن</span>' : ''}</div><div class="m-meta">${fmtN(p.qty)} ${esc(p.unit)} × ${money(p.price)}</div></div>
        <span class="m-qty">${fmt(p.qty * p.price)}</span>
        <button type="button" class="btn btn-danger btn-icon" data-pdel="${i}" aria-label="حذف">${icon('x')}</button></div>`).join('') : '<p class="hint" style="margin:0 0 8px">لم تضف قطع غيار.</p>'}</div>
      <div class="btn-row" style="margin-top:8px">
        <button type="button" class="btn btn-soft btn-sm" style="width:100%" id="vfAddInv">${icon('box')} من المخزن</button>
        <button type="button" class="btn btn-ghost btn-sm" style="width:100%" id="vfAddPart">${icon('plus')} قطعة يدوي</button>
      </div>
    </div>

    <div class="card">
      <div class="card-title"><div class="t-ic orange">${icon('droplet')}</div><h2>الفريون</h2><span class="tag" id="vfRefTot">${money(visitRefTotal(v))}</span></div>
      <div class="row-2">
        <div class="field"><label for="vfRefType">نوع الفريون</label><select id="vfRefType" onchange="vdSet('refType', this.value)">${opt('', '— لم يتم شحن —', v.refType)}${REFRIGERANTS.map(r => opt(r, r, v.refType)).join('')}</select></div>
        <div class="field"><label for="vfRefQty">الكمية</label><input type="number" inputmode="decimal" min="0" step="any" id="vfRefQty" value="${v.refQty || ''}" placeholder="0" oninput="vdSet('refQty', pos(parseFloat(this.value)||0))"></div>
      </div>
      <div class="row-2">
        <div class="field"><label>الوحدة</label><div class="segmented" style="margin:0" id="vfRefUnit"><button type="button" data-u="كجم" class="${v.refUnit === 'كجم' ? 'on' : ''}">كجم</button><button type="button" data-u="جم" class="${v.refUnit === 'جم' ? 'on' : ''}">جرام</button></div></div>
        <div class="field"><label for="vfRefPrice">سعر الكيلو (<span class="cur">${CUR}</span>)</label><input type="number" inputmode="decimal" min="0" step="any" id="vfRefPrice" value="${v.refPrice || ''}" placeholder="0" oninput="vdSet('refPrice', pos(parseFloat(this.value)||0))"></div>
      </div>
      <div class="field" style="margin-bottom:0"><label for="vfRefCost">تكلفة الكيلو عليك <span class="hint">(للربح)</span></label><input type="number" inputmode="decimal" min="0" step="any" id="vfRefCost" value="${v.refCost || ''}" placeholder="0" oninput="vdSet('refCost', pos(parseFloat(this.value)||0))"></div>
      <div class="warn-box">⚠️ الشحنة حسب بيانات الشركة المصنعة ولوحة بيانات الجهاز والإجراء الفني المناسب — لا تعتمد على حجم الجهاز فقط.</div>
    </div>

    <div class="card">
      <div class="card-title"><div class="t-ic">${icon('gauge')}</div><h2>القراءات الفنية</h2></div>
      <div id="vfReadings">${v.readings.map((r, i) => `
        <div class="extra-row" style="grid-template-columns:1.4fr 1fr 40px"><input type="text" data-rl="${i}" value="${esc(r.label)}" placeholder="القراءة"><input type="text" data-rv="${i}" value="${esc(r.value)}" placeholder="القيمة" dir="ltr"><button type="button" class="btn btn-danger btn-icon" data-rdel="${i}" aria-label="حذف">${icon('x')}</button></div>`).join('')}</div>
      <div class="chips" id="vfReadChips" style="flex-wrap:wrap;overflow:visible">${READING_PRESETS.map(r => `<button type="button" class="chip" data-r="${esc(r)}">+ ${esc(r)}</button>`).join('')}<button type="button" class="chip" data-r="">+ قراءة أخرى</button></div>
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
      <div class="card-title"><div class="t-ic orange">${icon('cash')}</div><h2>القيمة والحالة</h2></div>
      <div class="field"><label for="vfValue">قيمة الخدمة / المصنعية (<span class="cur">${CUR}</span>)</label><input type="number" inputmode="decimal" min="0" step="any" id="vfValue" value="${v.serviceValue || ''}" placeholder="0" oninput="vdSet('serviceValue', pos(parseFloat(this.value)||0))"></div>
      <div class="field"><label>حالة الإصلاح</label><div class="unit-chips" id="vfStatus">${Object.keys(VISIT_STATUS).map(k => `<button type="button" class="chip${v.status === k ? ' on' : ''}" data-st="${k}">${VISIT_STATUS[k].label}</button>`).join('')}</div></div>
      ${ta('vfRec', 'recommendations', 'التوصيات', 'مثال: تنظيف الفلاتر كل أسبوعين')}
      <div class="row-2">
        <div class="field"><label for="vfWar">ضمان على العمل (شهور)</label><input type="number" inputmode="decimal" min="0" step="any" id="vfWar" value="${v.warrantyMonths || ''}" placeholder="0" oninput="vdSet('warrantyMonths', pos(parseFloat(this.value)||0))"></div>
        <div class="field"><label for="vfNext">موعد الزيارة القادمة</label><input type="date" id="vfNext" value="${esc(v.nextDate)}" oninput="vdSet('nextDate', this.value)"></div>
      </div>
      <div class="field"><label for="vfWTerms">شروط الضمان</label><input type="text" id="vfWTerms" value="${esc(v.warrantyTerms)}" placeholder="اختياري" oninput="vdSet('warrantyTerms', this.value)"></div>
      <div class="field" style="margin-bottom:0"><label for="vfNextNote">ملاحظة الموعد القادم</label><input type="text" id="vfNextNote" value="${esc(v.nextNote)}" placeholder="مثال: متابعة بعد تغيير الضاغط" oninput="vdSet('nextNote', this.value)"></div>
      <div class="live-total" style="margin-top:12px"><span>إجمالي الزيارة (خدمة + قطع + فريون)</span><strong id="vfLive">${money(visitTotal(v))}</strong></div>
    </div>

    <div class="stack">
      <button type="button" class="btn btn-primary" onclick="saveVisitDraft()">${icon('check')} حفظ الزيارة</button>
      ${v._new ? '' : `<button type="button" class="btn btn-danger" onclick="deleteVisit('${esc(v.id)}')">${icon('trash')} حذف الزيارة</button>`}
    </div>`;
  return {
    title: v._new ? 'زيارة جديدة' : 'تعديل الزيارة', sub: c ? c.name : 'سجل الصيانة',
    actions: [{ icon: 'check', label: 'حفظ', accent: true, onClick: saveVisitDraft }],
    html, after: bindVisitForm
  };
};
function bindVisitForm(body) {
  const v = vDraft;
  body.querySelector('#vfCust').onclick = () => openPicker({
    title: 'اختيار العميل',
    items: DB.customers.map(c => ({ id: c.id, title: c.name, sub: `${devicesOf(c.id).length} جهاز`, avatar: initialOf(c.name) })),
    addNew: { label: q => q ? `إضافة «${q}» كعميل جديد` : 'عميل جديد', fn: () => openCustomerForm(null, c => { vDraft.customerId = c.id; vDraft.deviceId = null; refreshPages(); }) },
    onPick: x => { vDraft.customerId = x.id; vDraft.deviceId = null; vDraft.contractId = null; refreshPages(); }
  });
  body.querySelector('#vfTypeChips').onclick = e => { const b = e.target.closest('[data-s]'); if (!b) return; v.serviceType = b.dataset.s; body.querySelector('#vfType').value = v.serviceType; body.querySelectorAll('#vfTypeChips .chip').forEach(x => x.classList.toggle('on', x === b)); };
  const techs = body.querySelector('#vfTechs');
  if (techs) techs.onclick = e => { const b = e.target.closest('[data-w]'); if (!b) return; const id = b.dataset.w; v.techIds = v.techIds.includes(id) ? v.techIds.filter(x => x !== id) : v.techIds.concat(id); b.classList.toggle('on'); };
  body.querySelector('#vfStatus').onclick = e => { const b = e.target.closest('[data-st]'); if (!b) return; v.status = b.dataset.st; body.querySelectorAll('#vfStatus .chip').forEach(x => x.classList.toggle('on', x === b)); };
  body.querySelector('#vfRefUnit').onclick = e => { const b = e.target.closest('[data-u]'); if (!b) return; v.refUnit = b.dataset.u; body.querySelectorAll('#vfRefUnit button').forEach(x => x.classList.toggle('on', x === b)); body.querySelector('#vfRefTot').textContent = money(visitRefTotal(NORMALIZERS.visits(v))); updateVisitLive(); };
  body.oninput = () => {
    const el = body.querySelector('#vfRefTot');
    if (el) el.textContent = money(visitRefTotal(NORMALIZERS.visits(v)));
  };
  // القراءات
  body.querySelector('#vfReadChips').onclick = e => { const b = e.target.closest('[data-r]'); if (!b) return; v.readings.push({ label: b.dataset.r, value: '' }); refreshPages(); };
  body.querySelectorAll('[data-rl]').forEach(inp => { inp.oninput = () => { v.readings[+inp.dataset.rl].label = inp.value; }; });
  body.querySelectorAll('[data-rv]').forEach(inp => { inp.oninput = () => { v.readings[+inp.dataset.rv].value = inp.value; }; });
  body.querySelectorAll('[data-rdel]').forEach(b => { b.onclick = () => { v.readings.splice(+b.dataset.rdel, 1); refreshPages(); }; });
  // القطع
  body.querySelectorAll('[data-pdel]').forEach(b => { b.onclick = () => { v.parts.splice(+b.dataset.pdel, 1); refreshPages(); }; });
  body.querySelectorAll('[data-pi]').forEach(el => { el.onclick = () => openVisitPartForm(+el.dataset.pi); });
  body.querySelector('#vfAddPart').onclick = () => openVisitPartForm(-1);
  body.querySelector('#vfAddInv').onclick = () => {
    if (!DB.inventory.length) { showAppToast('المخزن فاضي — ضيف القطع من «الخامات وقطع الغيار»'); return; }
    openPicker({
      title: 'قطعة من المخزن',
      items: DB.inventory.map(it => ({ id: it.id, title: it.name + (it.spec ? ' ' + it.spec : ''), sub: `الرصيد ${fmtN(it.qty)} ${esc(it.unit)} · ${money(it.sellPrice)}`, icon: 'box' })),
      onPick: x => { const it = invById(x.id); openVisitPartForm(-1, { invId: it.id, name: it.name + (it.spec ? ' ' + it.spec : ''), unit: it.unit, qty: 1, price: it.sellPrice, cost: it.buyPrice, kind: invCatKind(it.cat) === 'part' ? 'part' : 'material' }); }
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
      <div class="chips" id="vpChips" style="flex-wrap:wrap;overflow:visible">${WORK_CATS.parts.items.map(i => `<button type="button" class="chip" data-n="${esc(i[0])}">${esc(i[0])}</button>`).join('')}</div>
      <div class="field"><label for="vpName">الاسم</label><input type="text" id="vpName" value="${esc(p.name)}"></div>
      <div class="row-2">
        <div class="field"><label for="vpQty">العدد</label><input type="number" inputmode="decimal" min="0" step="any" id="vpQty" value="${p.qty || ''}"></div>
        <div class="field"><label for="vpUnit">الوحدة</label><input type="text" id="vpUnit" value="${esc(p.unit)}"></div>
      </div>
      <div class="row-2">
        <div class="field"><label for="vpPrice">سعر البيع (<span class="cur">${CUR}</span>)</label><input type="number" inputmode="decimal" min="0" step="any" id="vpPrice" value="${p.price || ''}"></div>
        <div class="field"><label for="vpCost">تكلفة الشراء</label><input type="number" inputmode="decimal" min="0" step="any" id="vpCost" value="${p.cost || ''}"></div>
      </div>
      <div class="segmented" id="vpKind"><button type="button" data-k="part" class="${p.kind !== 'material' ? 'on' : ''}">قطعة غيار</button><button type="button" data-k="material" class="${p.kind === 'material' ? 'on' : ''}">خامة</button></div>
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
  const c = getCustomer(v.customerId), dv = getDevice(v.deviceId);
  const row = (label, value) => value ? `<div class="sum-row txt"><span>${label}</span><strong>${value}</strong></div>` : '';
  const block = (title, text) => text ? `<div class="note" style="margin-bottom:10px"><strong>${title}:</strong> ${esc(text)}</div>` : '';
  const doc = v.docId ? getDoc(v.docId) : null;
  const ctr = v.contractId ? getContract(v.contractId) : null;
  const html = `
    <section class="hero">
      <div class="hero-label">${esc(v.serviceType || 'زيارة')} · ${esc(fmtDate(v.date))}</div>
      <div class="hero-value"><span>${fmt(visitTotal(v))}</span><small>${CUR}</small></div>
      <div class="hero-stats">
        <div class="hero-stat"><span>الخدمة</span><strong>${money(v.serviceValue)}</strong></div>
        <div class="hero-stat"><span>القطع</span><strong>${money(visitPartsTotal(v))}</strong></div>
        <div class="hero-stat"><span>الفريون</span><strong>${money(visitRefTotal(v))}</strong></div>
      </div>
    </section>
    <div class="card">
      <div class="card-title"><div class="t-ic">${icon('report')}</div><h2>بيانات الزيارة</h2>${statusPill(v.status)}</div>
      <div class="sum-list">
        ${row('رقم الزيارة', `<span dir="ltr">${esc(v.number)}</span>`)}${row('العميل', c ? esc(c.name) : '')}${row('الجهاز', dv ? esc(deviceLabel(dv)) : '')}
        ${row('الفني', esc(visitTechNames(v)))}${row('عقد الصيانة', ctr ? esc(ctr.number) : '')}
        ${v.refType ? row('الفريون', `${esc(v.refType)} · ${fmtN(v.refQty)} ${esc(v.refUnit)}`) : ''}
        ${v.warrantyMonths ? row('الضمان', `${fmtN(v.warrantyMonths)} شهر حتى ${esc(fmtDate(addMonthsISO(v.date, v.warrantyMonths)))}`) : ''}
        ${v.nextDate ? row('الزيارة القادمة', `${esc(fmtDate(v.nextDate))}${v.nextDone ? ' ✓' : ''}`) : ''}
      </div>
    </div>
    ${block('وصف المشكلة', v.problem)}${block('العطل المكتشف', v.fault)}${block('سبب العطل', v.cause)}${block('الأعمال المنفذة', v.workDone)}
    ${v.parts.length ? `<div class="card"><div class="card-title"><div class="t-ic">${icon('box')}</div><h2>القطع المستخدمة</h2></div>${v.parts.map(p => `<div class="sum-row"><span>${esc(p.name)} (${fmtN(p.qty)} ${esc(p.unit)} × ${money(p.price)})</span><strong>${money(p.qty * p.price)}</strong></div>`).join('')}</div>` : ''}
    ${v.readings.length ? `<div class="card"><div class="card-title"><div class="t-ic">${icon('gauge')}</div><h2>القراءات الفنية</h2></div>${v.readings.map(r => `<div class="sum-row"><span>${esc(r.label)}</span><strong dir="ltr">${esc(r.value)}</strong></div>`).join('')}</div>` : ''}
    ${block('التوصيات', v.recommendations)}
    ${v.photos.length ? `<div class="card"><div class="card-title"><div class="t-ic">${icon('camera')}</div><h2>الصور</h2></div><div class="photo-grid">${v.photos.map(p => `<div class="photo"><img data-media="${esc(p.id)}" alt=""><span>${p.stage === 'after' ? 'بعد' : 'قبل'}</span></div>`).join('')}</div></div>` : ''}
    <div class="stack">
      <button type="button" class="btn btn-accent" onclick="openVisitReportPreview('${esc(v.id)}')">${icon('printer')} التقرير الفني PDF</button>
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
    title: 'زيارة ' + (v.number || ''), sub: [c ? c.name : '', dv ? dv.type : ''].filter(Boolean).join(' · '),
    actions: [{ icon: 'edit', label: 'تعديل', onClick: () => openVisitForm(v.id) }],
    html, after: body => hydrateMedia(body)
  };
};
function markFollowDone(id) { const v = getVisit(id); if (!v) return; v.nextDone = true; saveCol('visits'); refreshAll(); showAppToast('✔️ تم'); }
function createDocFromVisit(id) {
  const v = getVisit(id);
  if (!v) return;
  const repair = /إصلاح|كشف|طوارئ|عطل/.test(v.serviceType + v.fault);
  const lines = [];
  if (v.serviceValue) lines.push({ cat: repair ? 'repair' : 'maint', kind: /كشف/.test(v.serviceType) ? 'diag' : 'service', name: v.serviceType || (repair ? 'إصلاح عطل' : 'خدمة صيانة'), method: 'job', qty: 1, price: v.serviceValue, note: v.workDone.slice(0, 120) });
  // القطع اتخصمت من المخزن مع الزيارة، فمش مربوطة بالمخزن تاني في الفاتورة
  v.parts.forEach(p => lines.push({ cat: 'parts', kind: p.kind === 'material' ? 'material' : 'part', name: p.name, method: 'piece', qty: p.qty, unit: p.unit, price: p.price, cost: p.cost }));
  if (v.refType && v.refQty) lines.push({ cat: 'refrig', kind: 'refrigerant', name: 'شحن فريون', method: 'weight', qty: v.refQty, wUnit: v.refUnit, pUnit: 'كجم', price: v.refPrice, cost: v.refCost, refType: v.refType });
  const d = createDoc(repair ? 'repair' : 'maint', { customerId: v.customerId, deviceIds: v.deviceId ? [v.deviceId] : [], lines, visitId: v.id });
  d.warrantyMonths = v.warrantyMonths; d.warrantyTerms = v.warrantyTerms; d.date = v.date;
  d.workerIds = v.techIds.slice();
  saveDoc(d);
  v.docId = d.id;
  saveCol('visits');
  closeEverythingThen(() => { openEditor('summary'); renderEditor(); showAppToast(`✔️ اتعملت ${docTypeInfo(d.docType).label} ${d.number} من الزيارة`); });
}
let visFilter = 'all';
PAGES.visits = function () {
  const q = ((document.getElementById('visSearch') || {}).value || '').trim();
  const list = DB.visits.slice().sort(byNewest).filter(v => {
    if (visFilter !== 'all' && v.status !== visFilter) return false;
    if (!q) return true;
    const c = getCustomer(v.customerId), dv = getDevice(v.deviceId);
    return [v.number, v.serviceType, v.fault, v.problem, c ? c.name : '', dv ? deviceLabel(dv) : ''].join(' ').includes(q);
  });
  return {
    title: 'سجل الزيارات والصيانة', sub: `${DB.visits.length} زيارة`,
    html: `
      <button type="button" class="btn btn-accent" style="margin-bottom:12px" onclick="openVisitForm(null)">${icon('plus')} زيارة جديدة</button>
      <div class="field"><input type="search" id="visSearch" value="${esc(q)}" placeholder="ابحث بالعميل أو العطل أو الجهاز..."></div>
      <div class="filter-chips" id="visFilter">${[['all', 'الكل'], ...Object.keys(VISIT_STATUS).map(k => [k, VISIT_STATUS[k].label])].map(([k, l]) => `<button type="button" class="chip${visFilter === k ? ' on' : ''}" data-f="${k}">${esc(l)}</button>`).join('')}</div>
      ${list.length ? list.map(visitCardHTML).join('') : `<div class="card empty"><div class="big">${icon('history')}</div><p>لا توجد زيارات${q || visFilter !== 'all' ? ' مطابقة' : ' بعد'}.</p></div>`}`,
    after: body => {
      bindVisitCards(body);
      const s = body.querySelector('#visSearch');
      s.oninput = () => { refreshPages(); const n = document.getElementById('visSearch'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } };
      body.querySelector('#visFilter').onclick = e => { const b = e.target.closest('[data-f]'); if (b) { visFilter = b.dataset.f; refreshPages(); } };
    }
  };
};
