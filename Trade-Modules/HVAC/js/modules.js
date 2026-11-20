/* =========================================================
   أرزقي HVAC - modules.js
   الرئيسية، المخزن (الخامات وقطع الغيار)، الفنيين والعمال، الحسابات
   والمصروفات، قوائم الأسعار، عقود الصيانة، الضمان والمواعيد،
   النوتة الفنية، وكشوفات الخامات.
   © 2026 أحمد حسن عبدالله - جميع الحقوق محفوظة.
   ========================================================= */
const rowHTML = (label, value, cls = '') => `<div class="sum-row ${cls}"><span>${label}</span><strong>${value}</strong></div>`;
// صف بيانات نصية (اسم، تاريخ، قائمة خدمات...) — النص الطويل بيلف جوه الإطار
const rowTxt = (label, value) => rowHTML(label, value, 'txt');
function liveSearch(body, id) {
  const s = body.querySelector('#' + id);
  if (!s) return;
  s.oninput = () => { refreshPages(); const n = document.getElementById(id); if (n) { n.focus(); try { n.setSelectionRange(n.value.length, n.value.length); } catch (e) {} } };
}
function searchVal(id) { return ((document.getElementById(id) || {}).value || '').trim(); }

/* =========================================================
   الرئيسية
   ========================================================= */
function inMonth(iso, offset = 0) {
  const now = new Date(); const d = new Date((iso || '') + 'T00:00:00');
  const ref = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
}
function renderHome() {
  const tot = ledgerTotals();
  document.getElementById('homeDue').textContent = fmt(tot.due);
  document.getElementById('homeMonth').textContent = DB.docs.filter(d => docTypeInfo(d.docType).billable && inMonth(d.date)).length;
  document.getElementById('homeCollected').textContent = fmt(DB.payments.filter(p => inMonth(p.date)).reduce((s, p) => s + p.amount, 0));
  const rem = collectReminders();
  const soon = rem.filter(r => r.days <= 7);
  document.getElementById('homeUpcoming').textContent = soon.length;
  const name = String(business.techName || '').split(' - ')[0].trim();
  document.getElementById('greetLine').textContent = name ? `أهلاً، ${name}` : 'أهلاً بيك';
  const rb = document.getElementById('homeReminders');
  const low = DB.inventory.filter(i => i.minQty > 0 && i.qty <= i.minQty);
  let rh = '';
  if (soon.length || low.length) {
    rh = `<div class="card" style="margin-top:14px"><div class="card-title"><div class="t-ic orange">${icon('bell')}</div><h2>مواعيد وتنبيهات</h2><button type="button" class="link-btn" onclick="openPage('reminders')">عرض الكل</button></div>
      ${soon.slice(0, 4).map(reminderRowHTML).join('')}
      ${low.length ? `<div class="entry" onclick="openPage('inventory')"><div class="e-ic" style="background:var(--danger-soft);color:var(--danger)">${icon('box')}</div><div class="e-info"><div class="e-title">${low.length} صنف وصل للحد الأدنى في المخزن</div><div class="e-meta">${low.slice(0, 3).map(i => esc(i.name)).join('، ')}</div></div></div>` : ''}
    </div>`;
  }
  rb.innerHTML = rh;
  bindReminderRows(rb);
  const box = document.getElementById('homeRecent');
  const recent = DB.docs.slice(0, 4);
  if (!recent.length) { box.innerHTML = `<div class="home-empty">لسه مفيش فواتير. ابدأ بزرار <b>(+)</b> اللي تحت.</div>`; return; }
  box.innerHTML = recent.map(docCardHTML).join('');
  bindDocCards(box);
}

/* ---------------- زرار (+) ---------------- */
function openCreate() { openOverlay('create'); }
function createAction(kind) {
  closeEverythingThen(() => {
    if (DOC_TYPES[kind]) startNewDoc(kind);
    else if (kind === 'pickdoc') pickDocType();
    else if (kind === 'visit') openVisitForm(null);
    else if (kind === 'pay') quickPayment();
    else if (kind === 'cust') openCustomerForm(null);
    else if (kind === 'device') newDeviceWithCustomer();
    else if (kind === 'expense') openExpenseForm(null);
    else if (kind === 'mat') createMatList(null);
    else if (kind === 'calc') openPage('calc');
  });
}
function quickPayment() {
  const due = DB.docs.filter(d => docTypeInfo(d.docType).billable && computeDoc(d).remaining > 0);
  if (!DB.customers.length && !due.length) { showAppToast('مفيش فواتير عليها متبقي — ابدأ بفاتورة أو عميل'); return; }
  const items = DB.customers.map(c => ({ id: 'c:' + c.id, title: c.name, sub: `متبقي ${money(Math.max(0, customerStats(c).remaining))}`, avatar: initialOf(c.name) }))
    .concat(due.filter(d => !d.customerId).map(d => ({ id: 'd:' + d.id, title: `${docTitle(d)} (${d.number})`, sub: `فاتورة بدون عميل · متبقي ${money(computeDoc(d).remaining)}`, icon: 'file' })));
  openPicker({
    title: 'تسجيل دفعة: من مين؟', items,
    onPick: x => { const [k, id] = x.id.split(':'); if (k === 'c') openPaymentForm(null, { customerId: id }); else openPaymentForm(null, { docId: id }); }
  });
}

/* =========================================================
   الضمان والمواعيد والتذكير
   ========================================================= */
function getContract(id) { return DB.contracts.find(k => k.id === id) || null; }
function collectWarranties() {
  const out = [];
  DB.docs.forEach(d => {
    if (!docTypeInfo(d.docType).billable || !d.warrantyMonths) return;
    out.push({ title: `${docTypeInfo(d.docType).short} ${d.number}`, client: docTitle(d), start: d.date, end: addMonthsISO(d.date, d.warrantyMonths), terms: d.warrantyTerms, deviceIds: d.deviceIds, open: () => openDoc(d.id) });
  });
  DB.visits.forEach(v => {
    if (!v.warrantyMonths) return;
    const c = getCustomer(v.customerId);
    out.push({ title: `${v.serviceType || 'زيارة'} ${v.number}`, client: c ? c.name : '', start: v.date, end: addMonthsISO(v.date, v.warrantyMonths), terms: v.warrantyTerms, deviceIds: v.deviceId ? [v.deviceId] : [], open: () => openPage('visit', v.id) });
  });
  const today = todayISO();
  out.forEach(w => { w.days = daysBetween(today, w.end); w.active = w.days >= 0; });
  return out.sort((a, b) => a.end.localeCompare(b.end));
}
function activeWarrantiesForDevice(id) { return collectWarranties().filter(w => w.active && w.deviceIds.includes(id)); }
function contractStats(k) {
  const visits = DB.visits.filter(v => v.contractId === k.id);
  const months = CONTRACT_PERIODS[k.period].months;
  const end = k.end || addMonthsISO(k.start, months);
  const included = k.visitsIncluded || 0;
  const span = Math.max(1, daysBetween(k.start, end));
  const step = included ? span / included : 0;
  const nextDue = included && visits.length < included ? addDaysISO(k.start, Math.round(step * visits.length)) : '';
  const today = todayISO();
  return { visits, done: visits.length, included, remaining: Math.max(0, included - visits.length), end, nextDue, active: today >= k.start && today <= end, expired: today > end, daysLeft: daysBetween(today, end) };
}
function reminderFromVisit(v) {
  const c = getCustomer(v.customerId), dv = getDevice(v.deviceId);
  return { date: v.nextDate, title: `زيارة متابعة: ${c ? c.name : ''}`, sub: [dv ? dv.type : '', v.nextNote].filter(Boolean).join(' · '), kind: 'visit', ref: v.id, open: () => openPage('visit', v.id) };
}
function collectReminders() {
  const out = [];
  DB.visits.forEach(v => { if (v.nextDate && !v.nextDone) out.push(reminderFromVisit(v)); });
  DB.devices.forEach(dv => {
    const next = deviceNextMaint(dv);
    if (!next) return;
    const c = getCustomer(dv.customerId);
    out.push({ date: next, title: `صيانة دورية: ${c ? c.name : ''}`, sub: deviceLabel(dv), kind: 'device', ref: dv.id, open: () => openPage('device', dv.id) });
  });
  DB.contracts.forEach(k => {
    const st = contractStats(k);
    if (st.nextDue && !st.expired) out.push({ date: st.nextDue, title: `زيارة عقد ${k.number}: ${contractClient(k)}`, sub: `زيارة ${st.done + 1} من ${st.included}`, kind: 'contract', ref: k.id, open: () => openPage('contract', k.id) });
    if (st.daysLeft >= 0 && st.daysLeft <= 30) out.push({ date: st.end, title: `انتهاء عقد ${k.number}: ${contractClient(k)}`, sub: 'جدّد العقد مع العميل', kind: 'contractEnd', ref: k.id, open: () => openPage('contract', k.id) });
  });
  DB.docs.forEach(d => {
    if (!docTypeInfo(d.docType).billable && d.validUntil) {
      const days = daysBetween(todayISO(), d.validUntil);
      if (days >= 0 && days <= 7) out.push({ date: d.validUntil, title: `انتهاء ${docTypeInfo(d.docType).short} ${d.number}`, sub: docTitle(d), kind: 'quote', ref: d.id, open: () => openDoc(d.id) });
    }
  });
  collectWarranties().forEach(w => { if (w.days >= 0 && w.days <= 30) out.push({ date: w.end, title: `انتهاء ضمان: ${w.client}`, sub: w.title, kind: 'warranty', open: w.open }); });
  const today = todayISO();
  out.forEach(r => { r.days = daysBetween(today, r.date); });
  return out.sort((a, b) => a.date.localeCompare(b.date));
}
let _remList = [];
function reminderRowHTML(r) {
  _remList.push(r);
  const over = r.days < 0, today = r.days === 0;
  const when = over ? `متأخر ${-r.days} يوم` : today ? 'النهارده' : r.days === 1 ? 'بكرة' : `بعد ${r.days} يوم`;
  const ic = { visit: 'wrench', device: 'ac', contract: 'file', contractEnd: 'file', quote: 'tag', warranty: 'shield' }[r.kind] || 'bell';
  return `<div class="entry" data-rem="${_remList.length - 1}">
    <div class="e-ic" style="${over ? 'background:var(--danger-soft);color:var(--danger)' : today ? 'background:var(--accent-soft);color:var(--accent)' : 'background:var(--primary-soft);color:var(--primary)'}">${icon(ic)}</div>
    <div class="e-info"><div class="e-title">${esc(r.title)}</div><div class="e-meta">${esc(fmtDate(r.date))}${r.sub ? ' · ' + esc(r.sub) : ''}</div></div>
    <div class="e-amt" style="color:${over ? 'var(--danger)' : 'var(--primary)'};font-size:.78rem">${when}</div></div>`;
}
function bindReminderRows(box) { box.querySelectorAll('[data-rem]').forEach(el => { const r = _remList[+el.dataset.rem]; el.onclick = () => r && r.open(); }); }
let remTab = 'up';
PAGES.reminders = function () {
  _remList = [];
  const rem = collectReminders();
  const war = collectWarranties();
  let html = `<div class="segmented" id="remTabs" style="margin-bottom:12px"><button type="button" data-t="up" class="${remTab === 'up' ? 'on' : ''}">المواعيد (${rem.length})</button><button type="button" data-t="war" class="${remTab === 'war' ? 'on' : ''}">الضمانات (${war.filter(w => w.active).length})</button></div>`;
  if (remTab === 'up') {
    html += `<div class="note" style="margin-bottom:12px">التذكير شغال على الموبايل بدون إنترنت ومن غير سيرفر: المواعيد بتظهر هنا وفي الرئيسية، وتقدر تضيفها لتقويم الموبايل علشان ينبهك في ميعادها.</div>
      <div class="btn-row" style="margin-bottom:12px">
        <button type="button" class="btn btn-soft" onclick="exportICS(collectReminders().filter(r => r.days >= 0))">${icon('calendar')} أضف الكل للتقويم</button>
        <button type="button" class="btn btn-ghost" onclick="enableNotifications()">${icon('bell')} تنبيهات الجهاز</button>
      </div>`;
    html += rem.length ? `<div class="card">${rem.map(reminderRowHTML).join('')}</div>` : `<div class="card empty"><div class="big">${icon('bell')}</div><p>مفيش مواعيد قادمة.<br>حدّد «موعد الزيارة القادمة» في الزيارات، أو «الصيانة الدورية» للأجهزة، أو عقود الصيانة.</p></div>`;
  } else {
    html += war.length ? war.map((w, i) => `
      <div class="inv-card" data-war="${i}">
        <div class="inv-avatar" style="background:${w.active ? 'linear-gradient(135deg,var(--success),#0b7a55)' : 'linear-gradient(135deg,#94a3b8,#64748b)'}">${icon('shield')}</div>
        <div class="inv-info"><div class="n"><span class="nm">${esc(w.client || '-')}</span></div><div class="m">${esc(w.title)} · من ${esc(fmtDate(w.start))} إلى ${esc(fmtDate(w.end))}${w.terms ? ' · ' + esc(w.terms) : ''}</div></div>
        <div class="inv-amount" style="color:${w.active ? 'var(--success)' : 'var(--muted)'}">${w.active ? w.days : 'منتهي'}<small>${w.active ? 'يوم متبقي' : ''}</small></div>
      </div>`).join('') : `<div class="card empty"><div class="big">${icon('shield')}</div><p>لا توجد ضمانات مسجلة.<br>حدّد «مدة الضمان» في الفاتورة أو الزيارة.</p></div>`;
  }
  return {
    title: 'الضمان والمتابعة', sub: 'مواعيد الصيانة والزيارات القادمة', html,
    after: body => {
      body.querySelector('#remTabs').onclick = e => { const b = e.target.closest('[data-t]'); if (b) { remTab = b.dataset.t; refreshPages(); } };
      bindReminderRows(body);
      body.querySelectorAll('[data-war]').forEach(el => { el.onclick = () => war[+el.dataset.war].open(); });
    }
  };
};
// تصدير المواعيد لملف تقويم (ics) — يفتح في تقويم الموبايل وينبه في الميعاد
function exportICS(list) {
  list = (list || []).filter(r => r && r.date);
  if (!list.length) { showAppToast('مفيش مواعيد للتصدير'); return; }
  const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const escI = s => String(s || '').replace(/[\\;,]/g, m => '\\' + m).replace(/\n/g, '\\n');
  let ics = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Hesabati HVAC//AR\r\nCALSCALE:GREGORIAN\r\n';
  list.forEach((r, i) => {
    const d = r.date.replace(/-/g, '');
    const next = addDaysISO(r.date, 1).replace(/-/g, '');
    ics += `BEGIN:VEVENT\r\nUID:${(r.ref || 'r') + '-' + i + '-' + d}@hesabati-hvac\r\nDTSTAMP:${stamp}\r\nDTSTART;VALUE=DATE:${d}\r\nDTEND;VALUE=DATE:${next}\r\nSUMMARY:${escI(r.title)}\r\nDESCRIPTION:${escI(r.sub)}\r\nBEGIN:VALARM\r\nTRIGGER:-PT15H\r\nACTION:DISPLAY\r\nDESCRIPTION:${escI(r.title)}\r\nEND:VALARM\r\nEND:VEVENT\r\n`;
  });
  ics += 'END:VCALENDAR\r\n';
  downloadText(ics, `مواعيد_أرزقي_HVAC_${todayISO()}.ics`, 'text/calendar');
  showAppToast(`✔️ تم تجهيز ${list.length} موعد — افتح الملف علشان يتضاف للتقويم`);
}
function enableNotifications() {
  if (!('Notification' in window)) { showAppToast('تنبيهات الجهاز مش مدعومة هنا — استخدم «أضف الكل للتقويم»'); return; }
  Notification.requestPermission().then(p => {
    if (p === 'granted') { settings.lastNotify = ''; saveSettings(); notifyDueReminders(); showAppToast('✔️ هيظهرلك تنبيه بمواعيد اليوم كل ما تفتح التطبيق'); }
    else showAppToast('التنبيهات مقفولة — استخدم «أضف الكل للتقويم»');
  });
}
// تنبيه محلي (بدون سيرفر) بمواعيد اليوم والمتأخرة، مرة واحدة في اليوم
function notifyDueReminders() {
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    if (settings.lastNotify === todayISO()) return;
    const due = collectReminders().filter(r => r.days <= 0);
    if (!due.length) return;
    settings.lastNotify = todayISO(); saveSettings();
    const body = due.slice(0, 4).map(r => '• ' + r.title).join('\n');
    const title = `أرزقي HVAC: ${due.length} موعد النهارده`;
    if (navigator.serviceWorker && navigator.serviceWorker.ready) navigator.serviceWorker.ready.then(reg => reg.showNotification(title, { body, icon: './icons/icon-192.png', lang: 'ar', dir: 'rtl', tag: 'hvac-due' })).catch(() => {});
    else new Notification(title, { body });
  } catch (e) {}
}

/* =========================================================
   الخامات وقطع الغيار (المخزن)
   ========================================================= */
let invCatFilter = '';
function invMargin(it) { return { unit: round2(it.sellPrice - it.buyPrice), pct: it.buyPrice ? Math.round((it.sellPrice - it.buyPrice) / it.buyPrice * 100) : 0 }; }
PAGES.inventory = function () {
  const q = searchVal('invSearch');
  let value = 0, potential = 0, low = 0;
  DB.inventory.forEach(it => { value += Math.max(0, it.qty) * it.buyPrice; potential += Math.max(0, it.qty) * (it.sellPrice - it.buyPrice); if (it.minQty > 0 && it.qty <= it.minQty) low++; });
  const cats = INV_CATS.filter(c => DB.inventory.some(i => i.cat === c));
  const list = DB.inventory.filter(it => (!invCatFilter || it.cat === invCatFilter) && (!q || [it.name, it.brand, it.spec, it.supplier, it.cat].join(' ').includes(q)));
  const html = `
    <section class="hero">
      <div class="hero-label">قيمة المخزن (بسعر الشراء)</div>
      <div class="hero-value"><span>${fmt(value)}</span><small>${CUR}</small></div>
      <div class="hero-stats">
        <div class="hero-stat"><span>الأصناف</span><strong>${DB.inventory.length}</strong></div>
        <div class="hero-stat"><span>ربح متوقع</span><strong>${money(potential)}</strong></div>
        <div class="hero-stat"><span>تحت الحد الأدنى</span><strong>${low}</strong></div>
      </div>
    </section>
    <button type="button" class="btn btn-accent" style="margin-bottom:12px" onclick="openInvForm(null)">${icon('plus')} صنف جديد</button>
    <div class="field"><input type="search" id="invSearch" value="${esc(q)}" placeholder="ابحث بالاسم أو الماركة أو المقاس أو المورد..."></div>
    ${cats.length > 1 ? `<div class="filter-chips" id="invCats"><button type="button" class="chip${!invCatFilter ? ' on' : ''}" data-c="">الكل</button>${cats.map(c => `<button type="button" class="chip${invCatFilter === c ? ' on' : ''}" data-c="${esc(c)}">${esc(c)}</button>`).join('')}</div>` : ''}
    ${list.length ? list.map(it => {
      const m = invMargin(it);
      const isLow = it.minQty > 0 && it.qty <= it.minQty;
      return `<div class="item-card" data-inv="${esc(it.id)}">
        <span class="room-num"${isLow ? ' style="background:var(--danger-soft);color:var(--danger)"' : ''}>${icon('box')}</span>
        <div class="i-info"><div class="i-name">${esc(it.name)}${it.spec ? ' ' + esc(it.spec) : ''}</div>
          <div class="i-meta">${esc(it.cat)}${it.brand ? ' · ' + esc(it.brand) : ''} · شراء ${money(it.buyPrice)} · بيع ${money(it.sellPrice)} · ربح ${money(m.unit)}${m.pct ? ` (${m.pct}%)` : ''}</div></div>
        <div class="i-amt"${isLow ? ' style="color:var(--danger)"' : ''}>${fmtN(it.qty)}<small>${esc(it.unit)}</small></div>
      </div>`;
    }).join('') : `<div class="card empty"><div class="big">${icon('box')}</div><p>${DB.inventory.length ? 'لا يوجد صنف مطابق.' : 'المخزن فاضي.<br>سجّل مواسير النحاس والعزل والفريون وقطع الغيار بأسعار الشراء والبيع، وهتتخصم تلقائياً لما تستخدمها في الفواتير والزيارات.'}</p></div>`}`;
  return {
    title: 'الخامات وقطع الغيار', sub: 'المخزن والأسعار وهامش الربح', html,
    after: body => {
      liveSearch(body, 'invSearch');
      const c = body.querySelector('#invCats'); if (c) c.onclick = e => { const b = e.target.closest('[data-c]'); if (b) { invCatFilter = b.dataset.c; refreshPages(); } };
      body.querySelectorAll('[data-inv]').forEach(el => { el.onclick = () => openPage('invItem', el.dataset.inv); });
    }
  };
};
PAGES.invItem = function (id) {
  const it = invById(id);
  if (!it) return { title: 'صنف', html: '<p class="hint">الصنف غير موجود.</p>' };
  const m = invMargin(it);
  const html = `
    <section class="hero">
      <div class="hero-label">الرصيد الحالي</div>
      <div class="hero-value"><span>${fmtN(it.qty)}</span><small>${esc(it.unit)}</small></div>
      <div class="hero-stats">
        <div class="hero-stat"><span>سعر الشراء</span><strong>${money(it.buyPrice)}</strong></div>
        <div class="hero-stat"><span>سعر البيع</span><strong>${money(it.sellPrice)}</strong></div>
        <div class="hero-stat"><span>هامش الربح</span><strong>${money(m.unit)}${m.pct ? ` · ${m.pct}%` : ''}</strong></div>
      </div>
    </section>
    <div class="card"><div class="sum-list">
      ${rowTxt('التصنيف', esc(it.cat))}${it.brand ? rowTxt('الماركة', esc(it.brand)) : ''}${it.spec ? rowTxt('الموديل / المقاس', esc(it.spec)) : ''}
      ${rowTxt('إجمالي القيمة (شراء)', money(Math.max(0, it.qty) * it.buyPrice))}${it.minQty ? rowTxt('الحد الأدنى للتنبيه', `${fmtN(it.minQty)} ${esc(it.unit)}`) : ''}
      ${it.supplier ? rowTxt('المورد', esc(it.supplier)) : ''}${it.purchaseDate ? rowTxt('تاريخ الشراء', esc(fmtDate(it.purchaseDate))) : ''}
    </div>${it.notes ? `<div class="note" style="margin-top:10px">${esc(it.notes)}</div>` : ''}</div>
    <div class="btn-row" style="margin-bottom:14px">
      <button type="button" class="btn btn-accent" onclick="openStockMove('${esc(it.id)}', 'in')">${icon('plus')} إضافة رصيد</button>
      <button type="button" class="btn btn-soft" onclick="openStockMove('${esc(it.id)}', 'out')">${icon('minus')} صرف / تسوية</button>
    </div>
    <div class="card"><div class="card-title"><div class="t-ic">${icon('history')}</div><h2>حركة الصنف</h2><span class="tag">${it.moves.length}</span></div>
      ${it.moves.length ? it.moves.slice(0, 60).map(mv => `<div class="sum-row"><span>${esc(fmtDate(mv.date))} · ${esc(mv.reason || '')}</span><strong style="color:${mv.qty >= 0 ? 'var(--success)' : 'var(--danger)'}">${mv.qty >= 0 ? '+' : ''}${fmtN(mv.qty)}</strong></div>`).join('') : '<p class="hint" style="margin:0">لا توجد حركة بعد.</p>'}
    </div>
    <button type="button" class="btn btn-danger" onclick="deleteInvItem('${esc(it.id)}')">${icon('trash')} حذف الصنف</button>`;
  return { title: it.name, sub: [it.cat, it.spec].filter(Boolean).join(' · '), actions: [{ icon: 'edit', label: 'تعديل', onClick: () => openInvForm(it.id) }], html };
};
function openInvForm(id) {
  const ex = id ? invById(id) : null;
  const it = ex ? Object.assign({}, ex) : NORMALIZERS.inventory({ id: uid('it_'), purchaseDate: todayISO(), cat: invCatFilter || 'مواسير النحاس', unit: 'قطعة' });
  openForm({
    title: ex ? 'تعديل الصنف' : 'صنف جديد في المخزن',
    html: `
      <div class="field"><label for="ivName">اسم الخامة / القطعة</label><input type="text" id="ivName" value="${esc(it.name === 'صنف' ? '' : it.name)}" placeholder="مثال: ماسورة نحاس، كابستور 35 ميكرو، فريون R410A"></div>
      <div class="field"><label for="ivCat">التصنيف</label><select id="ivCat">${INV_CATS.map(c => opt(c, c, it.cat)).join('')}</select></div>
      <div class="row-2">
        <div class="field"><label for="ivBrand">الماركة</label><input type="text" id="ivBrand" value="${esc(it.brand)}"></div>
        <div class="field"><label for="ivSpec">الموديل أو المقاس</label><input type="text" id="ivSpec" list="pipeSizes" value="${esc(it.spec)}" placeholder='مثال: 3/8"'></div>
      </div>
      <div class="field"><label>الوحدة</label><div class="unit-chips" id="ivUnits">${INV_UNITS.map(u => `<button type="button" class="chip${it.unit === u ? ' on' : ''}" data-u="${esc(u)}">${esc(u)}</button>`).join('')}</div></div>
      <div class="row-2">
        ${ex ? `<div class="field"><label>الكمية الحالية</label><input type="text" disabled value="${fmtN(it.qty)} ${esc(it.unit)}"></div>` : `<div class="field"><label for="ivQty">الكمية</label><input type="number" inputmode="decimal" min="0" step="any" id="ivQty" placeholder="0"></div>`}
        <div class="field"><label for="ivMin">حد أدنى للتنبيه</label><input type="number" inputmode="decimal" min="0" step="any" id="ivMin" value="${it.minQty || ''}" placeholder="0"></div>
      </div>
      <div class="row-2">
        <div class="field"><label for="ivBuy">سعر الشراء (<span class="cur">${CUR}</span>)</label><input type="number" inputmode="decimal" min="0" step="any" id="ivBuy" value="${it.buyPrice || ''}" placeholder="0"></div>
        <div class="field"><label for="ivSell">سعر البيع (<span class="cur">${CUR}</span>)</label><input type="number" inputmode="decimal" min="0" step="any" id="ivSell" value="${it.sellPrice || ''}" placeholder="0"></div>
      </div>
      <div class="row-2">
        <div class="field"><label for="ivSup">المورد</label><input type="text" id="ivSup" value="${esc(it.supplier)}"></div>
        <div class="field"><label for="ivDate">تاريخ الشراء</label><input type="date" id="ivDate" value="${esc(it.purchaseDate)}"></div>
      </div>
      <div class="field"><label for="ivNotes">ملاحظات</label><input type="text" id="ivNotes" value="${esc(it.notes)}"></div>
      ${ex ? '' : `<label class="switch" style="padding-top:0;margin-bottom:12px"><span>سجّل ثمن الشراء كمصروف</span><input type="checkbox" id="ivExp"></label>`}
      <div class="live-total"><span id="ivLiveT">الإجمالي (الكمية × سعر الشراء) · الربح للوحدة</span><strong id="ivLive">0</strong></div>`,
    after: body => {
      body.querySelector('#ivUnits').onclick = e => { const b = e.target.closest('[data-u]'); if (!b) return; it.unit = b.dataset.u; body.querySelectorAll('#ivUnits .chip').forEach(x => x.classList.toggle('on', x === b)); };
      const upd = () => {
        const q = ex ? it.qty : (parseFloat(body.querySelector('#ivQty').value) || 0), b = parseFloat(body.querySelector('#ivBuy').value) || 0, s = parseFloat(body.querySelector('#ivSell').value) || 0;
        body.querySelector('#ivLive').textContent = `${money(q * b)} · ربح ${money(s - b)}`;
      };
      body.oninput = upd; upd();
    },
    onSave: body => {
      const g = s => body.querySelector(s);
      const name = g('#ivName').value.trim();
      if (!name) { showAppToast('⚠️ اكتب اسم الصنف'); return false; }
      Object.assign(it, { name, cat: g('#ivCat').value, brand: g('#ivBrand').value.trim(), spec: g('#ivSpec').value.trim(), minQty: pos(parseFloat(g('#ivMin').value) || 0),
        buyPrice: pos(parseFloat(g('#ivBuy').value) || 0), sellPrice: pos(parseFloat(g('#ivSell').value) || 0), supplier: g('#ivSup').value.trim(), purchaseDate: g('#ivDate').value, notes: g('#ivNotes').value.trim() });
      if (!ex) {
        const q = pos(parseFloat(g('#ivQty').value) || 0);
        it.qty = q;
        if (q) it.moves = [{ id: uid('mv'), date: it.purchaseDate || todayISO(), qty: q, reason: 'رصيد أول المدة / شراء' }];
        if (q && it.buyPrice && g('#ivExp').checked) { DB.expenses.push(NORMALIZERS.expenses({ id: uid('x_'), date: it.purchaseDate || todayISO(), cat: invCatKind(it.cat) === 'refrigerant' ? 'فريون' : invCatKind(it.cat) === 'part' ? 'قطع غيار' : 'خامات', amount: round2(q * it.buyPrice), note: `شراء ${name}${it.supplier ? ' من ' + it.supplier : ''}` })); saveCol('expenses'); }
      }
      const clean = NORMALIZERS.inventory(it);
      if (ex) DB.inventory = DB.inventory.map(x => x.id === clean.id ? clean : x); else DB.inventory.unshift(clean);
      saveCol('inventory');
      showAppToast(ex ? '✔️ تم تحديث الصنف' : `✔️ تمت إضافة "${name}" للمخزن`);
    }
  });
}
function openStockMove(id, dir) {
  const it = invById(id);
  if (!it) return;
  openForm({
    title: dir === 'in' ? `إضافة رصيد: ${it.name}` : `صرف / تسوية: ${it.name}`,
    html: `
      <div class="row-2">
        <div class="field"><label for="smQty">الكمية (${esc(it.unit)})</label><input type="number" inputmode="decimal" min="0" step="any" id="smQty" placeholder="0"></div>
        <div class="field"><label for="smDate">التاريخ</label><input type="date" id="smDate" value="${todayISO()}"></div>
      </div>
      ${dir === 'in' ? `<div class="field"><label for="smBuy">سعر الشراء للوحدة</label><input type="number" inputmode="decimal" min="0" step="any" id="smBuy" value="${it.buyPrice || ''}"></div>
        <label class="switch" style="padding-top:0;margin-bottom:12px"><span>سجّل ثمن الشراء كمصروف</span><input type="checkbox" id="smExp" checked></label>` : ''}
      <div class="field"><label for="smNote">البيان</label><input type="text" id="smNote" placeholder="${dir === 'in' ? 'مثال: شراء من المورد' : 'مثال: تالف / جرد / استخدام شخصي'}"></div>`,
    onSave: body => {
      const q = pos(parseFloat(body.querySelector('#smQty').value) || 0);
      if (!q) { showAppToast('⚠️ اكتب الكمية'); return false; }
      const date = body.querySelector('#smDate').value || todayISO();
      const note = body.querySelector('#smNote').value.trim();
      const sign = dir === 'in' ? 1 : -1;
      it.qty = round2(it.qty + sign * q);
      it.moves.unshift({ id: uid('mv'), date, qty: sign * q, reason: note || (dir === 'in' ? 'إضافة رصيد' : 'صرف / تسوية') });
      if (dir === 'in') {
        const bp = parseFloat(body.querySelector('#smBuy').value);
        if (isFinite(bp) && bp >= 0) it.buyPrice = bp;
        it.purchaseDate = date;
        if (body.querySelector('#smExp').checked && it.buyPrice) { DB.expenses.push(NORMALIZERS.expenses({ id: uid('x_'), date, cat: invCatKind(it.cat) === 'refrigerant' ? 'فريون' : invCatKind(it.cat) === 'part' ? 'قطع غيار' : 'خامات', amount: round2(q * it.buyPrice), note: `شراء ${it.name}` })); saveCol('expenses'); }
      }
      saveCol('inventory');
      showAppToast(`✔️ الرصيد الحالي ${fmtN(it.qty)} ${it.unit}`);
    }
  });
}
function deleteInvItem(id) {
  const it = invById(id);
  if (!it) return;
  showAppConfirm(`حذف "${it.name}" من المخزن؟ البنود اللي استخدمته في الفواتير هتفضل زي ما هي.`, () => {
    DB.inventory = DB.inventory.filter(x => x.id !== id);
    DB.docs.forEach(d => { d.lines.forEach(l => { if (l.invId === id) l.invId = null; }); delete d.stockApplied[id]; });
    DB.visits.forEach(v => { v.parts.forEach(p => { if (p.invId === id) p.invId = null; }); delete v.stockApplied[id]; });
    saveAll();
    closeTopThen(() => { refreshAll(); showAppToast('تم حذف الصنف'); });
  });
}

/* =========================================================
   الفنيين والعمال
   ========================================================= */
function getWorker(id) { return DB.workers.find(w => w.id === id) || null; }
function workerStats(w) {
  const s = { days: 0, hours: 0, earned: 0, overtime: 0, advances: 0, deductions: 0, payouts: 0 };
  w.entries.forEach(e => {
    const v = workerEntryValue(e, w);
    if (e.type === 'day') { s.days += n0(e.days); s.earned += v; }
    else if (e.type === 'overtime') { s.hours += n0(e.hours); s.overtime += v; }
    else if (e.type === 'advance') s.advances += v;
    else if (e.type === 'deduction') s.deductions += v;
    else if (e.type === 'payout') s.payouts += v;
  });
  Object.keys(s).forEach(k => { s[k] = round2(s[k]); });
  // المستحق = اليومية × الأيام + الإضافي - الخصومات - السلف - ما تم صرفه
  s.gross = round2(s.earned + s.overtime);
  s.due = round2(s.gross - s.deductions - s.advances - s.payouts);
  s.tasks = DB.visits.filter(v => v.techIds.includes(w.id)).length + DB.docs.filter(d => d.workerIds.includes(w.id)).length;
  return s;
}
PAGES.workers = function () {
  let due = 0;
  DB.workers.forEach(w => { due += Math.max(0, workerStats(w).due); });
  const html = `
    <section class="hero">
      <div class="hero-label">إجمالي مستحقات الفنيين</div>
      <div class="hero-value"><span>${fmt(due)}</span><small>${CUR}</small></div>
      <div class="hero-stats">
        <div class="hero-stat"><span>عدد الفنيين</span><strong>${DB.workers.length}</strong></div>
        <div class="hero-stat"><span>شغالين</span><strong>${DB.workers.filter(w => w.active).length}</strong></div>
        <div class="hero-stat"><span>يوميات الشهر</span><strong>${fmtN(DB.workers.reduce((s, w) => s + w.entries.filter(e => e.type === 'day' && inMonth(e.date)).reduce((a, e) => a + e.days, 0), 0))}</strong></div>
      </div>
    </section>
    <button type="button" class="btn btn-accent" style="margin-bottom:12px" onclick="openWorkerForm(null)">${icon('plus')} فني / مساعد جديد</button>
    ${DB.workers.length ? DB.workers.map(w => {
      const st = workerStats(w);
      return `<div class="cust-card" data-w="${esc(w.id)}"${w.active ? '' : ' style="opacity:.6"'}>
        <div class="inv-avatar">${icon('hard')}</div>
        <div class="inv-info"><div class="n"><span class="nm">${esc(w.name)}</span></div><div class="m">${esc(w.specialty || 'فني')} · يومية ${money(w.dailyWage)} · ${fmtN(st.days)} يوم · ${st.tasks} مهمة</div></div>
        <div class="cust-amt ${st.due > 0 ? 'due' : 'ok'}">${fmt(st.due)}<small>${CUR} مستحق</small></div>
      </div>`;
    }).join('') : `<div class="card empty"><div class="big">${icon('hard')}</div><p>سجّل الفنيين والمساعدين بيومياتهم، وتابع الحضور والسلف والخصومات والمستحقات.</p></div>`}`;
  return { title: 'الفنيين والعمال', sub: 'اليوميات والسلف والمستحقات', html, after: body => { body.querySelectorAll('[data-w]').forEach(el => { el.onclick = () => openPage('worker', el.dataset.w); }); } };
};
PAGES.worker = function (id) {
  const w = getWorker(id);
  if (!w) return { title: 'فني', html: '<p class="hint">غير موجود.</p>' };
  const st = workerStats(w);
  const entries = w.entries.slice().sort(byNewest);
  const tasks = DB.visits.filter(v => v.techIds.includes(w.id)).sort(byNewest);
  const docs = DB.docs.filter(d => d.workerIds.includes(w.id));
  const html = `
    <section class="hero">
      <div class="hero-label">${st.due >= 0 ? 'المستحق له' : 'عليه (سلف زيادة)'}</div>
      <div class="hero-value"><span>${fmt(Math.abs(st.due))}</span><small>${CUR}</small></div>
      <div class="hero-stats">
        <div class="hero-stat"><span>أيام العمل</span><strong>${fmtN(st.days)}</strong></div>
        <div class="hero-stat"><span>السلف</span><strong>${money(st.advances)}</strong></div>
        <div class="hero-stat"><span>اتصرف له</span><strong>${money(st.payouts)}</strong></div>
      </div>
    </section>
    <div class="create-row" style="margin-bottom:12px">
      ${Object.keys(WORKER_ENTRY).map(k => `<button type="button" class="create-opt" onclick="openWorkerEntry('${esc(w.id)}', null, '${k}')"><span class="q-ic${k === 'advance' || k === 'deduction' ? ' orange-soft' : k === 'payout' ? ' green' : ''}">${icon(WORKER_ENTRY[k].icon)}</span><span><b style="font-size:.88rem">${WORKER_ENTRY[k].label}</b></span></button>`).join('')}
    </div>
    <div class="card"><div class="card-title"><div class="t-ic orange">${icon('calc')}</div><h2>حساب المستحقات</h2></div><div class="sum-list">
      ${rowHTML(`اليوميات (${fmtN(st.days)} يوم)`, money(st.earned))}
      ${rowHTML(`الإضافي (${fmtN(st.hours)} ساعة)`, '+ ' + money(st.overtime))}
      ${rowHTML('الخصومات', '- ' + money(st.deductions), 'minus')}
      ${rowHTML('السلف', '- ' + money(st.advances), 'minus')}
      ${rowHTML('ما تم صرفه', '- ' + money(st.payouts), 'minus')}
    </div><div class="sum-total"><span>صافي المستحق</span><strong>${money(st.due)}</strong></div></div>
    <div class="card"><div class="card-title"><div class="t-ic">${icon('history')}</div><h2>السجل</h2><span class="tag">${entries.length}</span></div>
      ${entries.length ? entries.map(e => `<div class="entry" data-we="${esc(e.id)}"><div class="e-ic"${e.type === 'advance' || e.type === 'deduction' ? ' style="background:var(--accent-soft);color:var(--accent)"' : ''}>${icon(WORKER_ENTRY[e.type].icon)}</div>
        <div class="e-info"><div class="e-title">${WORKER_ENTRY[e.type].label}${e.type === 'day' ? ` (${fmtN(e.days)} يوم)` : e.type === 'overtime' && e.hours ? ` (${fmtN(e.hours)} ساعة)` : ''}</div>
        <div class="e-meta">${esc(fmtDate(e.date))}${e.docId && getDoc(e.docId) ? ' · ' + esc(getDoc(e.docId).number) : ''}${e.note ? ' · ' + esc(e.note) : ''}</div></div>
        <div class="e-amt"${['advance', 'deduction', 'payout'].includes(e.type) ? ' style="color:var(--orange-600)"' : ''}>${['advance', 'deduction', 'payout'].includes(e.type) ? '- ' : '+ '}${fmt(workerEntryValue(e, w))}</div></div>`).join('') : '<p class="hint" style="margin:0">لا يوجد سجل بعد.</p>'}
    </div>
    ${tasks.length || docs.length ? `<div class="card"><div class="card-title"><div class="t-ic">${icon('wrench')}</div><h2>المهام المنفذة</h2><span class="tag">${tasks.length + docs.length}</span></div>${tasks.slice(0, 20).map(visitCardHTML).join('')}${docs.slice(0, 20).map(docCardHTML).join('')}</div>` : ''}
    <div class="stack">
      ${w.phone ? `<button type="button" class="btn btn-wa" onclick="sendWhatsApp('${esc(w.phone)}', buildWorkerText(getWorker('${esc(w.id)}')))">${icon('send')} كشف المستحقات واتساب</button>` : ''}
      <button type="button" class="btn btn-danger" onclick="deleteWorker('${esc(w.id)}')">${icon('trash')} حذف الفني</button>
    </div>`;
  return {
    title: w.name, sub: `${w.specialty || 'فني'} · يومية ${money(w.dailyWage)}`, actions: [{ icon: 'edit', label: 'تعديل', onClick: () => openWorkerForm(w.id) }], html,
    after: body => { body.querySelectorAll('[data-we]').forEach(el => { el.onclick = () => openWorkerEntry(w.id, el.dataset.we); }); bindVisitCards(body); bindDocCards(body); }
  };
};
function buildWorkerText(w) {
  const st = workerStats(w);
  return `*كشف مستحقات: ${w.name}*\n${business.techName ? '*' + business.techName + '*\n' : ''}--------------------------------\nاليوميات: ${fmtN(st.days)} يوم = ${money(st.earned)}\nالإضافي: ${money(st.overtime)}\nالخصومات: ${money(st.deductions)}\nالسلف: ${money(st.advances)}\nما تم صرفه: ${money(st.payouts)}\n--------------------------------\n*صافي المستحق:* *${money(st.due)}*`;
}
function openWorkerForm(id) {
  const w = id ? getWorker(id) : null;
  openForm({
    title: w ? 'تعديل بيانات الفني' : 'فني / مساعد جديد',
    html: `
      <div class="field"><label for="wfName">الاسم</label><input type="text" id="wfName" value="${esc(w ? w.name : '')}"></div>
      <div class="field"><label for="wfPhone">رقم الهاتف</label><input type="text" inputmode="tel" dir="ltr" style="text-align:right" id="wfPhone" value="${esc(w ? w.phone : '')}"></div>
      <div class="field"><label for="wfSpec">التخصص</label><input type="text" id="wfSpec" list="specList" value="${esc(w ? w.specialty : '')}" placeholder="فني تكييف / مساعد"></div>
      <div class="row-2">
        <div class="field"><label for="wfWage">اليومية (<span class="cur">${CUR}</span>)</label><input type="number" inputmode="decimal" min="0" step="any" id="wfWage" value="${w && w.dailyWage ? w.dailyWage : ''}" placeholder="0"></div>
        <div class="field"><label for="wfHour">سعر ساعة الإضافي</label><input type="number" inputmode="decimal" min="0" step="any" id="wfHour" value="${w && w.hourRate ? w.hourRate : ''}" placeholder="0"></div>
      </div>
      <label class="switch" style="padding-top:0;margin-bottom:12px"><span>شغال حالياً</span><input type="checkbox" id="wfActive"${!w || w.active ? ' checked' : ''}></label>
      <div class="field"><label for="wfNote">ملاحظات</label><input type="text" id="wfNote" value="${esc(w ? w.note : '')}"></div>`,
    onSave: body => {
      const g = s => body.querySelector(s);
      const name = g('#wfName').value.trim();
      if (!name) { showAppToast('⚠️ اكتب الاسم'); return false; }
      const data = { name, phone: g('#wfPhone').value.trim(), specialty: g('#wfSpec').value.trim(), dailyWage: pos(parseFloat(g('#wfWage').value) || 0), hourRate: pos(parseFloat(g('#wfHour').value) || 0), active: g('#wfActive').checked, note: g('#wfNote').value.trim() };
      if (w) Object.assign(w, data); else DB.workers.push(NORMALIZERS.workers(Object.assign({ id: uid('w_') }, data)));
      saveCol('workers');
      showAppToast(w ? '✔️ تم التحديث' : `✔️ تمت إضافة ${name}`);
    }
  });
}
function openWorkerEntry(wid, eid, type) {
  const w = getWorker(wid);
  if (!w) return;
  const ex = eid ? w.entries.find(e => e.id === eid) : null;
  const e = ex ? Object.assign({}, ex) : { id: uid('we'), type: type || 'day', date: todayISO(), days: 1, hours: 0, rate: w.dailyWage, amount: 0, docId: null, note: '' };
  const docs = DB.docs.filter(d => d.workerIds.includes(w.id) || d.id === e.docId).concat(DB.docs.filter(d => !d.workerIds.includes(w.id) && d.id !== e.docId).slice(0, 15));
  const render = () => {
    const t = e.type;
    return `
      <div class="unit-chips" id="weType" style="margin-bottom:12px">${Object.keys(WORKER_ENTRY).map(k => `<button type="button" class="chip${t === k ? ' on' : ''}" data-t="${k}">${WORKER_ENTRY[k].label}</button>`).join('')}</div>
      <div class="field"><label for="weDate">التاريخ</label><input type="date" id="weDate" value="${esc(e.date)}"></div>
      ${t === 'day' ? `<div class="row-2"><div class="field"><label for="weDays">عدد الأيام</label><div class="stepper"><button type="button" data-step="1">+</button><input type="number" inputmode="decimal" min="0" step="any" id="weDays" value="${e.days || ''}"><button type="button" data-step="-1">−</button></div></div>
        <div class="field"><label for="weRate">اليومية</label><input type="number" inputmode="decimal" min="0" step="any" id="weRate" value="${e.rate || ''}"></div></div>` : ''}
      ${t === 'overtime' ? `<div class="row-2"><div class="field"><label for="weHours">عدد الساعات</label><input type="number" inputmode="decimal" min="0" step="any" id="weHours" value="${e.hours || ''}"></div>
        <div class="field"><label for="weRate">سعر الساعة</label><input type="number" inputmode="decimal" min="0" step="any" id="weRate" value="${e.rate || w.hourRate || ''}"></div></div>
        <div class="field"><label for="weAmount">أو مبلغ الإضافي مباشرة</label><input type="number" inputmode="decimal" min="0" step="any" id="weAmount" value="${e.amount || ''}"></div>` : ''}
      ${['advance', 'deduction', 'payout'].includes(t) ? `<div class="field"><label for="weAmount">المبلغ (<span class="cur">${CUR}</span>)</label><input type="number" inputmode="decimal" min="0" step="any" id="weAmount" value="${e.amount || ''}"></div>` : ''}
      ${t === 'day' || t === 'overtime' ? `<div class="field"><label for="weDoc">على فاتورة / مشروع <span class="hint">(اختياري — للربح)</span></label><select id="weDoc">${opt('', '— بدون —', e.docId || '')}${docs.map(d => opt(d.id, `${d.number} · ${docTitle(d)}`, e.docId)).join('')}</select></div>` : ''}
      <div class="field"><label for="weNote">ملاحظة</label><input type="text" id="weNote" value="${esc(e.note)}"></div>
      <div class="live-total"><span>القيمة</span><strong id="weLive"></strong></div>`;
  };
  const read = body => {
    const g = s => body.querySelector(s);
    e.date = g('#weDate').value || todayISO();
    if (g('#weDays')) e.days = pos(parseFloat(g('#weDays').value) || 0);
    if (g('#weHours')) e.hours = pos(parseFloat(g('#weHours').value) || 0);
    if (g('#weRate')) e.rate = pos(parseFloat(g('#weRate').value) || 0);
    if (g('#weAmount')) e.amount = pos(parseFloat(g('#weAmount').value) || 0);
    if (g('#weDoc')) e.docId = g('#weDoc').value || null;
    e.note = g('#weNote').value.trim();
  };
  const bind = body => {
    body.querySelector('#weType').onclick = ev => { const b = ev.target.closest('[data-t]'); if (!b) return; read(body); e.type = b.dataset.t; if (e.type === 'overtime' && !ex) e.rate = w.hourRate; if (e.type === 'day' && !ex) e.rate = w.dailyWage; body.innerHTML = render(); bind(body); };
    const upd = () => { read(body); body.querySelector('#weLive').textContent = money(workerEntryValue(e, w)); };
    body.oninput = upd; upd();
  };
  openForm({
    title: `${w.name}: ${ex ? 'تعديل السجل' : 'تسجيل جديد'}`, html: render(), after: bind,
    onSave: body => {
      read(body);
      if (!(workerEntryValue(e, w) > 0)) { showAppToast('⚠️ اكتب القيمة'); return false; }
      const clean = NORMALIZERS.workers({ entries: [e] }).entries[0];
      if (ex) w.entries = w.entries.map(x => x.id === clean.id ? clean : x); else w.entries.push(clean);
      // صرف المستحقات يتسجل في المصروفات كأجور مدفوعة
      saveCol('workers');
      showAppToast(`✔️ ${WORKER_ENTRY[clean.type].label}: ${money(workerEntryValue(clean, w))}`);
    },
    onDelete: ex ? () => showAppConfirm('حذف هذا السجل؟', () => { w.entries = w.entries.filter(x => x.id !== ex.id); saveCol('workers'); closeOverlay(); refreshAll(); }) : null
  });
}
function deleteWorker(id) {
  const w = getWorker(id);
  if (!w) return;
  showAppConfirm(`حذف "${w.name}" وكل سجلاته؟`, () => {
    DB.workers = DB.workers.filter(x => x.id !== id);
    DB.docs.forEach(d => { d.workerIds = d.workerIds.filter(x => x !== id); });
    DB.visits.forEach(v => { v.techIds = v.techIds.filter(x => x !== id); });
    saveAll();
    closeTopThen(() => { refreshAll(); showAppToast('تم الحذف'); });
  });
}

/* =========================================================
   الحسابات والمصروفات والأرباح
   ========================================================= */
let finPeriod = 'month';
const FIN_PERIODS = { month: 'الشهر ده', last: 'الشهر اللي فات', year: 'السنة دي', all: 'الكل' };
function inPeriod(iso) {
  if (finPeriod === 'all') return true;
  if (finPeriod === 'month') return inMonth(iso);
  if (finPeriod === 'last') return inMonth(iso, -1);
  return String(iso || '').slice(0, 4) === String(new Date().getFullYear());
}
function financeTotals() {
  const docs = DB.docs.filter(d => docTypeInfo(d.docType).billable && inPeriod(d.date));
  const t = { billed: 0, lineCost: 0, expectedProfit: 0, collected: 0, expenses: 0, wagesPaid: 0, wagesAccrued: 0, byExpCat: {}, byMethod: {}, byKind: {} };
  docs.forEach(d => { const c = computeDoc(d); t.billed += c.total; t.lineCost += c.cost; t.expectedProfit += c.profit; KIND_ORDER.forEach(k => { t.byKind[k] = (t.byKind[k] || 0) + c.byKind[k]; }); });
  DB.payments.filter(p => inPeriod(p.date)).forEach(p => { t.collected += p.amount; t.byMethod[p.method] = (t.byMethod[p.method] || 0) + p.amount; });
  DB.expenses.filter(x => inPeriod(x.date)).forEach(x => { t.expenses += x.amount; t.byExpCat[x.cat] = (t.byExpCat[x.cat] || 0) + x.amount; });
  DB.workers.forEach(w => w.entries.forEach(e => {
    if (!inPeriod(e.date)) return;
    if (e.type === 'advance' || e.type === 'payout') t.wagesPaid += workerEntryValue(e, w);
    if (e.type === 'day' || e.type === 'overtime') t.wagesAccrued += workerEntryValue(e, w);
  }));
  Object.keys(t).forEach(k => { if (typeof t[k] === 'number') t[k] = round2(t[k]); });
  t.docsCount = docs.length;
  t.costsPaid = round2(t.expenses + t.wagesPaid);
  // صافي الربح = الإيرادات المحصلة - التكاليف الفعلية المدفوعة
  t.netProfit = round2(t.collected - t.costsPaid);
  t.outstanding = ledgerTotals().due;
  return t;
}
PAGES.finance = function () {
  const t = financeTotals();
  const exps = DB.expenses.filter(x => inPeriod(x.date)).sort(byNewest);
  const html = `
    <div class="filter-chips" id="finPer">${Object.keys(FIN_PERIODS).map(k => `<button type="button" class="chip${finPeriod === k ? ' on' : ''}" data-p="${k}">${FIN_PERIODS[k]}</button>`).join('')}</div>
    <section class="hero">
      <div class="hero-label">صافي الربح الفعلي (${FIN_PERIODS[finPeriod]})</div>
      <div class="hero-value"><span>${fmt(t.netProfit)}</span><small>${CUR}</small></div>
      <div class="hero-stats">
        <div class="hero-stat"><span>المحصل</span><strong>${money(t.collected)}</strong></div>
        <div class="hero-stat"><span>التكاليف المدفوعة</span><strong>${money(t.costsPaid)}</strong></div>
        <div class="hero-stat"><span>عند العملاء</span><strong>${money(t.outstanding)}</strong></div>
      </div>
    </section>
    <div class="card"><div class="card-title"><div class="t-ic orange">${icon('calc')}</div><h2>تفصيل الحساب</h2></div><div class="sum-list">
      ${rowHTML(`إجمالي الفواتير (${t.docsCount})`, money(t.billed), 'bold')}
      ${KIND_ORDER.filter(k => t.byKind[k]).map(k => rowHTML('&nbsp;&nbsp;• ' + LINE_KINDS[k], money(t.byKind[k]))).join('')}
      ${rowHTML('الإيرادات المحصلة', money(t.collected), 'bold')}
      ${Object.keys(t.byMethod).map(m => rowHTML('&nbsp;&nbsp;• ' + esc(m), money(t.byMethod[m]))).join('')}
      ${rowHTML('المصروفات المدفوعة', '- ' + money(t.expenses), 'minus')}
      ${Object.keys(t.byExpCat).map(c => rowHTML('&nbsp;&nbsp;• ' + esc(c), money(t.byExpCat[c]))).join('')}
      ${rowHTML('أجور مدفوعة (سلف + صرف)', '- ' + money(t.wagesPaid), 'minus')}
    </div><div class="sum-total"><span>صافي الربح = المحصل − التكاليف المدفوعة</span><strong>${money(t.netProfit)}</strong></div>
    <div class="sum-list" style="margin-top:10px">
      ${rowHTML('تكلفة القطع والخامات في الفواتير', money(t.lineCost))}
      ${rowHTML('أجور مستحقة على الفترة', money(t.wagesAccrued))}
      ${rowHTML('الربح المتوقع من فواتير الفترة', money(t.expectedProfit), 'bold')}
    </div></div>
    <div class="btn-row" style="margin-bottom:12px">
      <button type="button" class="btn btn-accent" onclick="openExpenseForm(null)">${icon('plus')} مصروف جديد</button>
      <button type="button" class="btn btn-soft" onclick="openPage('payments')">${icon('cash')} سجل المدفوعات</button>
    </div>
    <div class="card"><div class="card-title"><div class="t-ic">${icon('receipt')}</div><h2>المصروفات</h2><span class="tag">${money(t.expenses)}</span></div>
      ${exps.length ? exps.map(x => `<div class="entry mat" data-x="${esc(x.id)}"><div class="e-ic">${icon('receipt')}</div><div class="e-info"><div class="e-title">${esc(x.cat)}${x.docId && getDoc(x.docId) ? `<span class="src-badge">${esc(getDoc(x.docId).number)}</span>` : ''}</div><div class="e-meta">${esc(fmtDate(x.date))} · ${esc(x.method)}${x.note ? ' · ' + esc(x.note) : ''}</div></div><div class="e-amt">- ${fmt(x.amount)}</div></div>`).join('') : '<p class="hint" style="margin:0">لا توجد مصروفات في الفترة دي.</p>'}
    </div>`;
  return {
    title: 'الحسابات والأرباح', sub: 'الإيرادات والمصروفات وصافي الربح', html,
    after: body => {
      body.querySelector('#finPer').onclick = e => { const b = e.target.closest('[data-p]'); if (b) { finPeriod = b.dataset.p; refreshPages(); } };
      body.querySelectorAll('[data-x]').forEach(el => { el.onclick = () => openExpenseForm(el.dataset.x); });
    }
  };
};
function openExpenseForm(id, opts = {}) {
  const ex = id ? DB.expenses.find(x => x.id === id) : null;
  const x = ex ? Object.assign({}, ex) : { id: uid('x_'), date: todayISO(), cat: opts.cat || 'خامات', amount: 0, method: 'كاش', note: '', docId: opts.docId || null };
  openForm({
    title: ex ? 'تعديل المصروف' : 'مصروف جديد',
    html: `
      <div class="field"><label>البند</label><div class="unit-chips" id="xCat">${EXPENSE_CATS.map(c => `<button type="button" class="chip${x.cat === c ? ' on' : ''}" data-c="${esc(c)}">${esc(c)}</button>`).join('')}</div></div>
      <div class="row-2">
        <div class="field"><label for="xAmount">المبلغ (<span class="cur">${CUR}</span>)</label><input type="number" inputmode="decimal" min="0" step="any" id="xAmount" value="${x.amount || ''}" placeholder="0"></div>
        <div class="field"><label for="xDate">التاريخ</label><input type="date" id="xDate" value="${esc(x.date)}"></div>
      </div>
      <div class="field"><label for="xMethod">طريقة الدفع</label><select id="xMethod">${PAY_METHODS.map(m => opt(m, m, x.method)).join('')}</select></div>
      <div class="field"><label for="xDoc">على فاتورة <span class="hint">(اختياري — لحساب ربحها)</span></label><select id="xDoc">${opt('', '— مصروف عام —', x.docId || '')}${DB.docs.slice(0, 60).map(d => opt(d.id, `${d.number} · ${docTitle(d)}`, x.docId)).join('')}</select></div>
      <div class="field"><label for="xNote">البيان</label><input type="text" id="xNote" value="${esc(x.note)}" placeholder="مثال: مواصلات للموقع"></div>`,
    after: body => { body.querySelector('#xCat').onclick = e => { const b = e.target.closest('[data-c]'); if (!b) return; x.cat = b.dataset.c; body.querySelectorAll('#xCat .chip').forEach(y => y.classList.toggle('on', y === b)); }; },
    onSave: body => {
      const amount = pos(parseFloat(body.querySelector('#xAmount').value) || 0);
      if (!amount) { showAppToast('⚠️ اكتب المبلغ'); return false; }
      Object.assign(x, { amount, date: body.querySelector('#xDate').value || todayISO(), method: body.querySelector('#xMethod').value, docId: body.querySelector('#xDoc').value || null, note: body.querySelector('#xNote').value.trim() });
      const clean = NORMALIZERS.expenses(x);
      if (ex) DB.expenses = DB.expenses.map(y => y.id === clean.id ? clean : y); else DB.expenses.push(clean);
      saveCol('expenses');
      showAppToast(`✔️ تم تسجيل مصروف ${money(amount)}`);
    },
    onDelete: ex ? () => showAppConfirm('حذف هذا المصروف؟', () => { DB.expenses = DB.expenses.filter(y => y.id !== ex.id); saveCol('expenses'); closeOverlay(); refreshAll(); }) : null
  });
}
PAGES.payments = function () {
  const q = searchVal('paySearch');
  const list = DB.payments.slice().sort(byNewest).filter(p => {
    if (!q) return true;
    const d = getDoc(p.docId), c = getCustomer(p.customerId);
    return [p.number, p.method, p.note, d ? d.number + ' ' + docTitle(d) : '', c ? c.name : ''].join(' ').includes(q);
  });
  const total = list.reduce((s, p) => s + p.amount, 0);
  return {
    title: 'سجل المدفوعات', sub: `${DB.payments.length} دفعة · ${money(total)}`,
    html: `<div class="field"><input type="search" id="paySearch" value="${esc(q)}" placeholder="ابحث بالعميل أو رقم الفاتورة أو الإيصال..."></div>
      <div class="card">${list.length ? list.map(p => { const c = getCustomer(p.customerId); const d = getDoc(p.docId); return paymentRowHTML(p).replace('<div class="e-meta">', `<div class="e-meta">${esc(c ? c.name : d ? docTitle(d) : '')} · `); }).join('') : '<p class="hint" style="margin:0">لا توجد مدفوعات.</p>'}</div>`,
    after: body => { liveSearch(body, 'paySearch'); body.querySelectorAll('.entry[data-pay]').forEach(el => { el.onclick = () => openPaymentForm(el.dataset.pay); }); }
  };
};

/* =========================================================
   قوائم الأسعار
   ========================================================= */
function activePriceList() { return DB.pricelists.find(l => l.id === settings.activePriceList) || DB.pricelists[0] || null; }
function ensureDefaultPriceList() {
  if (DB.pricelists.length) return;
  DB.pricelists.push(NORMALIZERS.pricelists({ id: uid('pl_'), name: 'قائمة الأسعار الأساسية', items: PRICE_PRESETS.map(([name, cat, method]) => ({ id: uid('pi'), name, cat, method, price: 0 })) }));
  settings.activePriceList = DB.pricelists[0].id;
  saveCol('pricelists'); saveSettings();
}
// السعر المرجعي لا يتغير إلا بموافقة المستخدم (اختيار صريح)
function savePriceToList(name, cat, method, price) {
  const l = activePriceList();
  if (!l) return;
  const ex = l.items.find(i => i.name.trim() === name.trim());
  if (ex) { ex.price = price; ex.method = method; }
  else l.items.push({ id: uid('pi'), name, cat, method, price });
  saveCol('pricelists');
  showAppToast(`✔️ اتحفظ السعر في «${l.name}»`);
}
PAGES.pricelists = function () {
  const l = activePriceList();
  let html = `<div class="note" style="margin-bottom:12px">أسعارك المرجعية — مفيش أي سعر إجباري. السعر هنا ما بيتغيرش غير لما تعدله بنفسك أو تختار «حفظ السعر في قائمة الأسعار» من الفاتورة.</div>
    <div class="filter-chips" id="plTabs">${DB.pricelists.map(x => `<button type="button" class="chip${l && x.id === l.id ? ' on' : ''}" data-l="${esc(x.id)}">${esc(x.name)}</button>`).join('')}</div>
    <div class="create-row" style="margin-bottom:12px">
      <button type="button" class="btn btn-soft btn-sm" style="width:100%" onclick="newPriceList(false)">${icon('plus')} قائمة جديدة</button>
      <button type="button" class="btn btn-ghost btn-sm" style="width:100%" onclick="newPriceList(true)">${icon('copy')} نسخ القائمة</button>
    </div>`;
  if (l) {
    const cats = [...new Set(l.items.map(i => i.cat))];
    html += `<div class="card"><div class="card-title"><div class="t-ic orange">${icon('tag')}</div><h2>${esc(l.name)}</h2><span class="tag">${l.items.length} بند</span></div>
      ${cats.map(c => `<h4 class="more-h" style="margin:10px 2px 4px">${esc((WORK_CATS[c] || {}).name || 'أخرى')}</h4>` + l.items.filter(i => i.cat === c).map(i => `
        <div class="mat-row"><div class="m-info" data-pi="${esc(i.id)}"><div class="m-name">${esc(i.name)}</div><div class="m-meta">${esc(METHODS[i.method].label)}</div></div>
        <div class="m-price"><input type="number" inputmode="decimal" min="0" step="any" placeholder="السعر" data-pp="${esc(i.id)}" value="${i.price || ''}"><small>${esc(CUR)}</small></div></div>`).join('')).join('')}
      <button type="button" class="btn btn-accent" style="margin-top:10px" onclick="openPriceItemForm(null)">${icon('plus')} بند جديد</button></div>
      <div class="btn-row"><button type="button" class="btn btn-ghost" onclick="renamePriceList()">${icon('edit')} تغيير الاسم</button>
      <button type="button" class="btn btn-danger" onclick="deletePriceList()">${icon('trash')} حذف القائمة</button></div>`;
  }
  return {
    title: 'قوائم الأسعار', sub: l ? `المستخدمة: ${l.name}` : '', html,
    after: body => {
      body.querySelector('#plTabs').onclick = e => { const b = e.target.closest('[data-l]'); if (b) { settings.activePriceList = b.dataset.l; saveSettings(); refreshPages(); showAppToast('✔️ القائمة دي هي المستخدمة في الفواتير'); } };
      body.querySelectorAll('[data-pp]').forEach(inp => { inp.onchange = () => { const it = l.items.find(i => i.id === inp.dataset.pp); if (it) { it.price = pos(parseFloat(inp.value) || 0); saveCol('pricelists'); showAppToast(`✔️ ${it.name}: ${money(it.price)}`); } }; });
      body.querySelectorAll('[data-pi]').forEach(el => { el.onclick = () => openPriceItemForm(el.dataset.pi); });
    }
  };
};
function openPriceItemForm(id) {
  const l = activePriceList();
  if (!l) return;
  const ex = id ? l.items.find(i => i.id === id) : null;
  openForm({
    title: ex ? 'تعديل بند السعر' : 'بند جديد في القائمة',
    html: `
      <div class="field"><label for="piName">اسم البند</label><input type="text" id="piName" value="${esc(ex ? ex.name : '')}"></div>
      <div class="row-2">
        <div class="field"><label for="piCat">التصنيف</label><select id="piCat">${WORK_CAT_ORDER.map(k => opt(k, WORK_CATS[k].name, ex ? ex.cat : 'install')).join('')}</select></div>
        <div class="field"><label for="piMethod">طريقة الحساب</label><select id="piMethod">${METHOD_ORDER.map(k => opt(k, METHODS[k].label, ex ? ex.method : 'device')).join('')}</select></div>
      </div>
      <div class="field"><label for="piPrice">السعر (<span class="cur">${CUR}</span>)</label><input type="number" inputmode="decimal" min="0" step="any" id="piPrice" value="${ex && ex.price ? ex.price : ''}"></div>`,
    onSave: body => {
      const name = body.querySelector('#piName').value.trim();
      if (!name) { showAppToast('⚠️ اكتب اسم البند'); return false; }
      const data = { name, cat: body.querySelector('#piCat').value, method: body.querySelector('#piMethod').value, price: pos(parseFloat(body.querySelector('#piPrice').value) || 0) };
      if (ex) Object.assign(ex, data); else l.items.push(Object.assign({ id: uid('pi') }, data));
      saveCol('pricelists');
    },
    onDelete: ex ? () => { l.items = l.items.filter(i => i.id !== ex.id); saveCol('pricelists'); closeOverlay(); refreshAll(); } : null
  });
}
function newPriceList(copy) {
  const src = activePriceList();
  openForm({
    title: copy ? 'نسخ القائمة' : 'قائمة أسعار جديدة',
    html: `<div class="field"><label for="plName">اسم القائمة</label><input type="text" id="plName" placeholder="مثال: أسعار الشركات / أسعار الصيف" value="${copy && src ? esc(src.name + ' (نسخة)') : ''}"></div>`,
    onSave: body => {
      const name = body.querySelector('#plName').value.trim();
      if (!name) { showAppToast('⚠️ اكتب اسم القائمة'); return false; }
      const items = copy && src ? src.items.map(i => Object.assign({}, i, { id: uid('pi') })) : PRICE_PRESETS.map(([n, cat, method]) => ({ id: uid('pi'), name: n, cat, method, price: 0 }));
      const l = NORMALIZERS.pricelists({ id: uid('pl_'), name, items });
      DB.pricelists.push(l);
      settings.activePriceList = l.id;
      saveCol('pricelists'); saveSettings();
    }
  });
}
function renamePriceList() {
  const l = activePriceList(); if (!l) return;
  openForm({ title: 'اسم القائمة', html: `<div class="field"><input type="text" id="plName" value="${esc(l.name)}"></div>`, onSave: body => { const n = body.querySelector('#plName').value.trim(); if (!n) return false; l.name = n; saveCol('pricelists'); } });
}
function deletePriceList() {
  const l = activePriceList(); if (!l) return;
  if (DB.pricelists.length <= 1) { showAppToast('لازم تفضل قائمة واحدة على الأقل'); return; }
  showAppConfirm(`حذف قائمة "${l.name}"؟ الفواتير القديمة مش هتتأثر.`, () => { DB.pricelists = DB.pricelists.filter(x => x.id !== l.id); settings.activePriceList = DB.pricelists[0].id; saveCol('pricelists'); saveSettings(); refreshAll(); });
}

/* =========================================================
   عقود الصيانة
   ========================================================= */
function contractClient(k) { const c = getCustomer(k.customerId); return c ? c.name : (k.clientName || 'بدون عميل'); }
function contractCardHTML(k) {
  const st = contractStats(k);
  return `<div class="inv-card" data-ctr="${esc(k.id)}">
    <div class="inv-avatar" style="background:${st.active ? 'linear-gradient(135deg,var(--navy-600),var(--navy-900))' : 'linear-gradient(135deg,#94a3b8,#64748b)'}">${icon('file')}</div>
    <div class="inv-info"><div class="n"><span class="nm">${esc(contractClient(k))}</span><span class="mode-badge">${esc(CONTRACT_PERIODS[k.period].label)}</span></div>
      <div class="m"><span dir="ltr">${esc(k.number)}</span> · ${esc(fmtDate(k.start))} ← ${esc(fmtDate(st.end))} · زيارات ${st.done}/${st.included}${st.expired ? ' · منتهي' : ''}</div></div>
    <div class="inv-amount">${fmt(k.value)}<small>${CUR}</small></div></div>`;
}
function bindContractCards(box) { box.querySelectorAll('[data-ctr]').forEach(el => { el.onclick = () => openPage('contract', el.dataset.ctr); }); }
PAGES.contracts = function () {
  const active = DB.contracts.filter(k => contractStats(k).active);
  return {
    title: 'عقود الصيانة', sub: `${active.length} عقد ساري`,
    html: `<button type="button" class="btn btn-accent" style="margin-bottom:12px" onclick="openContractForm(null)">${icon('plus')} عقد صيانة جديد</button>
      ${DB.contracts.length ? DB.contracts.map(contractCardHTML).join('') : `<div class="card empty"><div class="big">${icon('file')}</div><p>سجّل عقود الصيانة الشهرية والربع سنوية والنصف سنوية والسنوية، بعدد الزيارات والخدمات المشمولة وقيمة العقد.</p></div>`}`,
    after: bindContractCards
  };
};
function openContractForm(id, customerId) {
  const ex = id ? getContract(id) : null;
  const k = ex ? JSON.parse(JSON.stringify(ex)) : NORMALIZERS.contracts({ id: uid('ct_'), customerId: customerId || null, period: 'annual', start: todayISO(), visitsIncluded: 4, services: CONTRACT_SERVICES.slice(0, 4) });
  const render = () => {
    const c = getCustomer(k.customerId);
    const devs = c ? devicesOf(c.id) : [];
    return `
      <div class="field"><label for="ktCust">العميل</label><select id="ktCust">${opt('', '— اختار —', k.customerId || '')}${DB.customers.map(x => opt(x.id, x.name, k.customerId)).join('')}</select></div>
      <div class="field"><label>نوع العقد</label><div class="unit-chips" id="ktPer">${Object.keys(CONTRACT_PERIODS).map(p => `<button type="button" class="chip${k.period === p ? ' on' : ''}" data-p="${p}">${CONTRACT_PERIODS[p].label}</button>`).join('')}</div></div>
      <div class="row-2">
        <div class="field"><label for="ktStart">تاريخ البداية</label><input type="date" id="ktStart" value="${esc(k.start)}"></div>
        <div class="field"><label for="ktEnd">تاريخ النهاية</label><input type="date" id="ktEnd" value="${esc(k.end || addMonthsISO(k.start, CONTRACT_PERIODS[k.period].months))}"></div>
      </div>
      <div class="row-2">
        <div class="field"><label for="ktVisits">عدد الزيارات المشمولة</label><div class="stepper"><button type="button" data-step="1">+</button><input type="number" inputmode="decimal" min="0" step="1" id="ktVisits" value="${k.visitsIncluded || ''}"><button type="button" data-step="-1">−</button></div></div>
        <div class="field"><label for="ktValue">قيمة العقد (<span class="cur">${CUR}</span>)</label><input type="number" inputmode="decimal" min="0" step="any" id="ktValue" value="${k.value || ''}"></div>
      </div>
      <div class="field"><label>الأجهزة المشمولة</label>${devs.length ? `<div class="unit-chips" id="ktDevs">${devs.map(d => `<button type="button" class="chip${k.deviceIds.includes(d.id) ? ' on' : ''}" data-d="${esc(d.id)}">${esc(deviceLabel(d))}</button>`).join('')}</div>` : ''}
        <input type="number" inputmode="decimal" min="0" step="1" id="ktDevCount" style="margin-top:8px" value="${k.devicesCount || ''}" placeholder="${devs.length ? 'أو عدد الأجهزة' : 'عدد الأجهزة'}"></div>
      <div class="field"><label>الخدمات المشمولة</label><div class="unit-chips" id="ktSvc">${CONTRACT_SERVICES.map(s => `<button type="button" class="chip${k.services.includes(s) ? ' on' : ''}" data-s="${esc(s)}">${esc(s)}</button>`).join('')}</div></div>
      <div class="field"><label for="ktExtra">خدمات إضافية (خارج العقد)</label><input type="text" id="ktExtra" value="${esc(k.extraServices)}" placeholder="مثال: شحن الفريون وقطع الغيار"></div>
      <div class="field"><label for="ktExtraP">تسعير الخدمات الإضافية</label><input type="text" id="ktExtraP" value="${esc(k.extraPricing)}" placeholder="مثال: حسب قائمة الأسعار بخصم 10%"></div>
      <div class="field"><label for="ktNotes">شروط وملاحظات</label><textarea id="ktNotes">${esc(k.notes)}</textarea></div>`;
  };
  const read = body => {
    const g = s => body.querySelector(s);
    k.customerId = g('#ktCust').value || null;
    k.start = g('#ktStart').value || todayISO();
    k.end = g('#ktEnd').value;
    k.visitsIncluded = pos(parseFloat(g('#ktVisits').value) || 0);
    k.value = pos(parseFloat(g('#ktValue').value) || 0);
    k.devicesCount = pos(parseFloat(g('#ktDevCount').value) || 0);
    k.extraServices = g('#ktExtra').value.trim(); k.extraPricing = g('#ktExtraP').value.trim(); k.notes = g('#ktNotes').value.trim();
  };
  const bind = body => {
    const rer = () => { read(body); body.innerHTML = render(); bind(body); };
    body.querySelector('#ktCust').onchange = () => { k.deviceIds = []; rer(); };
    body.querySelector('#ktPer').onclick = e => { const b = e.target.closest('[data-p]'); if (!b) return; read(body); k.period = b.dataset.p; k.end = addMonthsISO(k.start, CONTRACT_PERIODS[k.period].months); body.innerHTML = render(); bind(body); };
    body.querySelector('#ktStart').onchange = () => { read(body); k.end = addMonthsISO(k.start, CONTRACT_PERIODS[k.period].months); body.innerHTML = render(); bind(body); };
    const dv = body.querySelector('#ktDevs'); if (dv) dv.onclick = e => { const b = e.target.closest('[data-d]'); if (!b) return; const id2 = b.dataset.d; k.deviceIds = k.deviceIds.includes(id2) ? k.deviceIds.filter(x => x !== id2) : k.deviceIds.concat(id2); b.classList.toggle('on'); };
    body.querySelector('#ktSvc').onclick = e => { const b = e.target.closest('[data-s]'); if (!b) return; const s = b.dataset.s; k.services = k.services.includes(s) ? k.services.filter(x => x !== s) : k.services.concat(s); b.classList.toggle('on'); };
  };
  openForm({
    title: ex ? 'تعديل عقد الصيانة' : 'عقد صيانة جديد', html: render(), after: bind,
    onSave: body => {
      read(body);
      if (!k.customerId) { showAppToast('⚠️ اختار العميل'); return false; }
      const c = getCustomer(k.customerId);
      k.clientName = c.name; k.clientPhone = c.phone; k.clientAddress = c.address;
      if (!k.end) k.end = addMonthsISO(k.start, CONTRACT_PERIODS[k.period].months);
      if (!k.number) k.number = nextNumber('CNT');
      const clean = NORMALIZERS.contracts(k);
      if (ex) DB.contracts = DB.contracts.map(x => x.id === clean.id ? clean : x); else DB.contracts.unshift(clean);
      saveCol('contracts');
      showAppToast(ex ? '✔️ تم تحديث العقد' : `✔️ تم حفظ العقد ${clean.number}`);
      if (!ex) setTimeout(() => openPage('contract', clean.id), 80);
    }
  });
}
PAGES.contract = function (id) {
  const k = getContract(id);
  if (!k) return { title: 'عقد', html: '<p class="hint">غير موجود.</p>' };
  const st = contractStats(k);
  const devs = k.deviceIds.map(getDevice).filter(Boolean);
  const html = `
    <section class="hero">
      <div class="hero-label">${st.active ? 'عقد ساري' : st.expired ? 'عقد منتهي' : 'لم يبدأ بعد'} · ${esc(CONTRACT_PERIODS[k.period].label)}</div>
      <div class="hero-value"><span>${fmt(k.value)}</span><small>${CUR}</small></div>
      <div class="hero-stats">
        <div class="hero-stat"><span>الزيارات</span><strong>${st.done} من ${st.included}</strong></div>
        <div class="hero-stat"><span>الزيارة القادمة</span><strong>${st.nextDue ? esc(fmtDate(st.nextDue)) : '—'}</strong></div>
        <div class="hero-stat"><span>ينتهي</span><strong>${esc(fmtDate(st.end))}</strong></div>
      </div>
    </section>
    <div class="card"><div class="sum-list">
      ${rowTxt('العميل', esc(contractClient(k)))}${rowTxt('الفترة', `${esc(fmtDate(k.start))} ← ${esc(fmtDate(st.end))}`)}
      ${rowTxt('الأجهزة', devs.length ? devs.map(d => esc(d.type)).join('، ') : (k.devicesCount ? fmtN(k.devicesCount) + ' جهاز' : '-'))}
      ${rowTxt('الخدمات المشمولة', esc(k.services.join('، ') || '-'))}
      ${k.extraServices ? rowTxt('خدمات إضافية', esc(k.extraServices)) : ''}${k.extraPricing ? rowTxt('تسعير الإضافي', esc(k.extraPricing)) : ''}
    </div>${k.notes ? `<div class="note" style="margin-top:10px">${esc(k.notes)}</div>` : ''}</div>
    <div class="section-head"><h3>زيارات العقد<span class="count">${st.done}</span></h3>
      <button type="button" class="btn btn-soft btn-sm" onclick="openVisitForm(null, {customerId: '${esc(k.customerId || '')}', contractId: '${esc(k.id)}', deviceId: '${esc(k.deviceIds[0] || '')}' || null})">${icon('plus')} زيارة</button></div>
    ${st.visits.length ? st.visits.sort(byNewest).map(visitCardHTML).join('') : '<p class="hint" style="margin:0 0 12px">لا توجد زيارات تحت العقد بعد.</p>'}
    <div class="stack" style="margin-top:8px">
      <button type="button" class="btn btn-accent" onclick="openContractPreview('${esc(k.id)}')">${icon('printer')} عقد الصيانة PDF</button>
      <button type="button" class="btn btn-primary" onclick="invoiceContract('${esc(k.id)}')">${icon('file')} إصدار فاتورة بقيمة العقد</button>
      ${k.docIds.length ? `<div class="hint" style="text-align:center">فواتير العقد: ${k.docIds.map(x => getDoc(x)).filter(Boolean).map(d => esc(d.number)).join('، ')}</div>` : ''}
      <button type="button" class="btn btn-soft" onclick="renewContract('${esc(k.id)}')">${icon('refresh')} تجديد العقد</button>
      <button type="button" class="btn btn-danger" onclick="deleteContract('${esc(k.id)}')">${icon('trash')} حذف العقد</button>
    </div>`;
  return { title: 'عقد ' + k.number, sub: contractClient(k), actions: [{ icon: 'edit', label: 'تعديل', onClick: () => openContractForm(k.id) }], html, after: bindVisitCards };
};
function invoiceContract(id) {
  const k = getContract(id);
  if (!k) return;
  const d = createDoc('maint', { customerId: k.customerId, deviceIds: k.deviceIds.slice(),
    lines: [{ cat: 'maint', kind: 'service', name: `عقد صيانة ${CONTRACT_PERIODS[k.period].label} ${k.number}`, method: 'lump', qty: 1, price: k.value, note: `من ${fmtDate(k.start)} إلى ${fmtDate(k.end)} · ${k.visitsIncluded} زيارة` }] });
  k.docIds.push(d.id);
  saveCol('contracts');
  closeEverythingThen(() => { openEditor('summary'); renderEditor(); showAppToast(`✔️ فاتورة العقد ${d.number}`); });
}
function renewContract(id) {
  const k = getContract(id);
  if (!k) return;
  const start = addDaysISO(contractStats(k).end, 1);
  const n = NORMALIZERS.contracts(Object.assign(JSON.parse(JSON.stringify(k)), { id: uid('ct_'), number: nextNumber('CNT'), start, end: addMonthsISO(start, CONTRACT_PERIODS[k.period].months), docIds: [], createdAt: Date.now() }));
  DB.contracts.unshift(n);
  saveCol('contracts');
  closeTopThen(() => { openPage('contract', n.id); showAppToast(`✔️ تم تجديد العقد ${n.number} من ${fmtDate(start)}`); });
}
function deleteContract(id) {
  showAppConfirm('حذف عقد الصيانة؟ الزيارات والفواتير نفسها مش هتتحذف.', () => {
    DB.contracts = DB.contracts.filter(k => k.id !== id);
    DB.visits.forEach(v => { if (v.contractId === id) v.contractId = null; });
    saveCol('contracts'); saveCol('visits');
    closeTopThen(() => { refreshAll(); showAppToast('تم حذف العقد'); });
  });
}

/* =========================================================
   النوتة الفنية
   ========================================================= */
let noteCat = '';
PAGES.notes = function () {
  const q = searchVal('noteSearch');
  const list = DB.notes.filter(n => (!noteCat || n.cat === noteCat) && (!q || (n.title + ' ' + n.body).includes(q)))
    .sort((a, b) => (b.pinned - a.pinned) || (b.updatedAt - a.updatedAt));
  return {
    title: 'النوتة الفنية', sub: `${DB.notes.length} ملاحظة`,
    html: `
      <button type="button" class="btn btn-accent" style="margin-bottom:12px" onclick="openNoteForm(null)">${icon('plus')} ملاحظة جديدة</button>
      <div class="field"><input type="search" id="noteSearch" value="${esc(q)}" placeholder="ابحث في الأكواد والموديلات والملاحظات..."></div>
      <div class="filter-chips" id="noteCats"><button type="button" class="chip${!noteCat ? ' on' : ''}" data-c="">الكل</button>${NOTE_CATS.map(c => `<button type="button" class="chip${noteCat === c ? ' on' : ''}" data-c="${esc(c)}">${esc(c)}</button>`).join('')}</div>
      ${list.length ? list.map(n => `<div class="card note-card" data-n="${esc(n.id)}"><div class="card-title" style="margin-bottom:6px"><div class="t-ic${n.pinned ? ' orange' : ''}">${icon(n.pinned ? 'star' : 'book')}</div><h2>${esc(n.title || n.cat)}</h2><span class="tag">${esc(n.cat)}</span></div>
        <div class="note-body">${esc(n.body)}</div><div class="hint">${esc(fmtDate(new Date(n.updatedAt).toISOString().slice(0, 10)))}</div></div>`).join('')
        : `<div class="card empty"><div class="big">${icon('book')}</div><p>${DB.notes.length ? 'لا توجد ملاحظة مطابقة.' : 'دوّن أكواد الأعطال وموديلات الأجهزة وأنواع الفريون وبيانات الموردين وأي ملاحظة فنية.'}</p></div>`}`,
    after: body => {
      liveSearch(body, 'noteSearch');
      body.querySelector('#noteCats').onclick = e => { const b = e.target.closest('[data-c]'); if (b) { noteCat = b.dataset.c; refreshPages(); } };
      body.querySelectorAll('[data-n]').forEach(el => { el.onclick = () => openNoteForm(el.dataset.n); });
    }
  };
};
function openNoteForm(id) {
  const ex = id ? DB.notes.find(n => n.id === id) : null;
  let cat = ex ? ex.cat : (noteCat || 'أكواد الأعطال');
  openForm({
    title: ex ? 'تعديل الملاحظة' : 'ملاحظة جديدة',
    html: `
      <div class="field"><label>التصنيف</label><div class="unit-chips" id="nfCat">${NOTE_CATS.map(c => `<button type="button" class="chip${cat === c ? ' on' : ''}" data-c="${esc(c)}">${esc(c)}</button>`).join('')}</div></div>
      <div class="field"><label for="nfTitle">العنوان</label><input type="text" id="nfTitle" value="${esc(ex ? ex.title : '')}" placeholder="مثال: كود E1 شارب"></div>
      <div class="field"><label for="nfBody">التفاصيل</label><textarea id="nfBody" style="min-height:160px">${esc(ex ? ex.body : '')}</textarea></div>
      <label class="switch" style="padding-top:0;margin-bottom:12px"><span>تثبيت في الأول ⭐</span><input type="checkbox" id="nfPin"${ex && ex.pinned ? ' checked' : ''}></label>`,
    after: body => { body.querySelector('#nfCat').onclick = e => { const b = e.target.closest('[data-c]'); if (!b) return; cat = b.dataset.c; body.querySelectorAll('#nfCat .chip').forEach(x => x.classList.toggle('on', x === b)); }; },
    onSave: body => {
      const title = body.querySelector('#nfTitle').value.trim(), text = body.querySelector('#nfBody').value.trim();
      if (!title && !text) { showAppToast('⚠️ اكتب الملاحظة'); return false; }
      const data = { cat, title, body: text, pinned: body.querySelector('#nfPin').checked, updatedAt: Date.now() };
      if (ex) Object.assign(ex, data); else DB.notes.unshift(NORMALIZERS.notes(Object.assign({ id: uid('n_') }, data)));
      saveCol('notes');
    },
    onDelete: ex ? () => showAppConfirm('حذف الملاحظة؟', () => { DB.notes = DB.notes.filter(n => n.id !== ex.id); saveCol('notes'); closeOverlay(); refreshAll(); }) : null
  });
}

/* =========================================================
   كشوفات الخامات (نفس نظام أرزقي الأصلي)
   ========================================================= */
const MAT_PRESETS = ['ماسورة نحاس', 'عزل حراري', 'كابل كهرباء', 'خرطوم صرف', 'حوامل', 'شريط عزل', 'وصلات', 'أكواع', 'فريون', 'كابستور', 'مسامير وخوابير', 'سيليكون', 'جلبة حائط'];
const MAT_UNITS = ['قطعة', 'متر', 'لفة', 'كجم', 'علبة', 'طقم'];
const BUYER_LABEL = { me: 'أنا هجيبها', customer: 'العميل هيشتريها' };
function getMatList(id) { return DB.matlists.find(l => l.id === id) || null; }
function matItemTotal(it) { return round2(n0(it.qty) * n0(it.price)); }
function matListStats(l) { let total = 0, unpriced = 0; l.items.forEach(it => { const v = matItemTotal(it); total += v; if (!(v > 0)) unpriced++; }); return { total: round2(total), unpriced, count: l.items.length }; }
function matListName(l) { const c = l.customerId ? getCustomer(l.customerId) : null; return l.clientName || (c ? c.name : '') || 'كشف بدون اسم'; }
function matQtyText(it) { return `${fmtN(it.qty)} ${it.unit || ''}`.trim(); }
function renderMatLists() {
  let mineTotal = 0, mine = 0, cust = 0;
  DB.matlists.forEach(l => { if (l.buyer === 'me') { mine++; mineTotal += matListStats(l).total; } else if (l.buyer === 'customer') cust++; });
  document.getElementById('matHeroTotal').textContent = fmt(mineTotal);
  document.getElementById('matHeroCount').textContent = DB.matlists.length;
  document.getElementById('matHeroMine').textContent = mine;
  document.getElementById('matHeroCust').textContent = cust;
  const q = val('matSearch').trim();
  const items = DB.matlists.filter(l => !q || matListName(l).includes(q) || l.clientPhone.includes(q));
  const box = document.getElementById('matListBox');
  if (!DB.matlists.length) { box.innerHTML = `<div class="card empty"><div class="big">${icon('box')}</div><p>لا توجد كشوفات خامات بعد.<br>اكتب الخامات المطلوبة (نحاس، عزل، كابلات، حوامل...) واطبعها أو ابعتها للعميل.</p></div>`; return; }
  if (!items.length) { box.innerHTML = `<div class="card empty"><div class="big">${icon('box')}</div><p>لا يوجد كشف مطابق.</p></div>`; return; }
  box.innerHTML = items.map(l => {
    const st = matListStats(l);
    const amt = l.buyer === 'me' ? `<div class="inv-amount">${fmt(st.total)}<small>${CUR} على حسابه</small></div>` : `<div class="inv-amount" style="color:var(--muted)">${st.count}<small>صنف</small></div>`;
    return `<div class="inv-card" data-ml="${esc(l.id)}"><div class="inv-avatar" style="background:linear-gradient(135deg,var(--orange-400),var(--orange-600))">${icon('box')}</div>
      <div class="inv-info"><div class="n"><span class="nm">${esc(matListName(l))}</span></div><div class="m">${esc(fmtDate(l.date))} · ${st.count} صنف · ${l.buyer ? BUYER_LABEL[l.buyer] : 'لم يحدد مين هيشتري'}</div></div>${amt}</div>`;
  }).join('');
  box.querySelectorAll('[data-ml]').forEach(el => { el.onclick = () => openMatList(el.dataset.ml); });
}
function createMatList(customerId) {
  const c = customerId ? getCustomer(customerId) : null;
  const l = NORMALIZERS.matlists({ id: uid('L'), customerId: c ? c.id : null, clientName: c ? c.name : '', clientPhone: c ? c.phone : '', clientAddress: c ? c.address : '' });
  DB.matlists.unshift(l);
  saveCol('matlists');
  openMatList(l.id);
}
function openMatList(id) { if (getMatList(id)) openPage('matlist', id); }
function matField(id, field, value) { const l = getMatList(id); if (!l) return; l[field] = field === 'date' ? (value || todayISO()) : value; saveCol('matlists'); }
PAGES.matlist = function (id) {
  const l = getMatList(id);
  if (!l) return { title: 'كشف خامات', html: '' };
  const me = l.buyer === 'me';
  const st = matListStats(l);
  const c = l.customerId ? getCustomer(l.customerId) : null;
  const optB = (b, ic, title, sub) => `<button type="button" class="mode-opt${l.buyer === b ? ' on' : ''}" data-buyer="${b}"><span class="m-ic${b === 'me' ? ' orange' : ''}">${icon(ic)}</span><span style="flex:1;min-width:0"><b>${title}</b><small>${sub}</small></span><span class="m-check">${icon('check')}</span></button>`;
  const html = `
    <div class="card">
      <div class="card-title"><div class="t-ic">${icon('user')}</div><h2>بيانات العميل</h2></div>
      <div class="field"><label for="mlName">اسم العميل</label><input type="text" id="mlName" value="${esc(l.clientName)}" oninput="matField('${esc(l.id)}','clientName',this.value)"></div>
      <div class="row-2 stack-sm">
        <div class="field"><label for="mlPhone">رقم الهاتف</label><input type="text" inputmode="tel" dir="ltr" style="text-align:right" id="mlPhone" value="${esc(l.clientPhone)}" oninput="matField('${esc(l.id)}','clientPhone',this.value)"></div>
        <div class="field"><label for="mlDate">التاريخ</label><input type="date" id="mlDate" value="${esc(l.date)}" oninput="matField('${esc(l.id)}','date',this.value)"></div>
      </div>
      <div class="field"><label for="mlAddress">العنوان</label><input type="text" id="mlAddress" value="${esc(l.clientAddress)}" oninput="matField('${esc(l.id)}','clientAddress',this.value)"></div>
      <div class="field" style="margin-bottom:0"><label for="mlTitle">ملاحظة على الكشف</label><input type="text" id="mlTitle" value="${esc(l.title)}" placeholder="مثال: خامات تركيب 3 أجهزة" oninput="matField('${esc(l.id)}','title',this.value)"></div>
      ${c ? `<div class="link-box"><span class="l-ic">${icon('link')}</span><div class="l-txt"><b>مرتبط بالعميل: ${esc(c.name)}</b><span>${me ? 'إجمالي الخامات بيتحسب على حسابه' : 'لو اخترت «أنا هجيبها» هتتحسب على حسابه'}</span></div><button type="button" class="btn btn-ghost btn-sm" id="mlUnlink">فك</button></div>`
        : `<button type="button" class="btn btn-soft btn-sm" style="margin-top:10px;width:100%" id="mlLink">${icon('book')} ربط الكشف بعميل</button>`}
    </div>
    <div class="card"><div class="card-title"><div class="t-ic orange">${icon('cash')}</div><h2>مين هيشتري الخامات؟</h2></div>
      <div class="mode-opts" id="mlBuyer">${optB('me', 'wallet', 'أنا هجيبها للعميل', 'تكتب سعر كل خامة، وإجماليها يتحسب على حساب العميل')}${optB('customer', 'user', 'العميل هيشتريها بنفسه', 'الكشف للطباعة والإرسال فقط، من غير أسعار')}</div></div>
    <div class="card"><div class="card-title"><div class="t-ic">${icon('list')}</div><h2>الخامات المطلوبة</h2><span class="tag">${st.count} صنف</span></div>
      ${l.items.length ? l.items.map((it, i) => `<div class="mat-row"><div class="m-info" data-mi="${esc(it.id)}"><div class="m-name">${i + 1}. ${esc(it.name)}</div><div class="m-meta">${[it.spec ? 'مقاس ' + it.spec : '', it.brand ? 'ماركة ' + it.brand : '', it.note].filter(Boolean).map(esc).join(' · ')}</div></div>
        <span class="m-qty">${esc(matQtyText(it))}</span>${me ? `<div class="m-price"><input type="number" inputmode="decimal" min="0" step="any" placeholder="السعر" data-mp="${esc(it.id)}" value="${it.price || ''}"><small>= ${fmt(matItemTotal(it))}</small></div>` : ''}</div>`).join('') : '<p class="hint" style="text-align:center;margin:4px 0 0">لم تضف أي خامة بعد.</p>'}
      <button type="button" class="btn btn-accent" style="margin-top:10px" onclick="openMatItem('${esc(l.id)}', null)">${icon('plus')} إضافة خامة</button></div>
    ${me ? `<div class="sum-total" style="margin:0 0 14px"><span>إجمالي ثمن الخامات</span><strong>${money(st.total)}</strong></div>${st.unpriced ? `<div class="warn-box" style="margin:-6px 0 14px"><b>${st.unpriced} صنف</b> من غير سعر.</div>` : ''}` : ''}
    <div class="stack">
      <button type="button" class="btn btn-primary" onclick="openMatPreview('${esc(l.id)}')">${icon('eye')} معاينة الكشف وطباعته PDF</button>
      <div class="btn-row"><button type="button" class="btn btn-wa" onclick="sendWhatsApp(getMatList('${esc(l.id)}').clientPhone, buildMatListText(getMatList('${esc(l.id)}')))">${icon('send')} إرسال للعميل</button>
        <button type="button" class="btn btn-ghost" onclick="copyText(buildMatListText(getMatList('${esc(l.id)}')), '✔️ تم نسخ الكشف')">${icon('copy')} نسخ النص</button></div>
      <button type="button" class="btn btn-danger" onclick="deleteMatList('${esc(l.id)}')">${icon('trash')} حذف الكشف</button>
    </div>`;
  return {
    title: 'كشف خامات: ' + matListName(l), sub: [fmtDate(l.date), l.buyer ? BUYER_LABEL[l.buyer] : ''].filter(Boolean).join(' · '),
    actions: [{ icon: 'printer', label: 'طباعة', accent: true, onClick: () => openMatPreview(l.id) }], html,
    after: body => {
      body.querySelector('#mlBuyer').onclick = e => { const b = e.target.closest('[data-buyer]'); if (!b) return; l.buyer = b.dataset.buyer; saveCol('matlists'); refreshAll(); };
      body.querySelectorAll('[data-mi]').forEach(el => { el.onclick = () => openMatItem(l.id, el.dataset.mi); });
      body.querySelectorAll('[data-mp]').forEach(inp => { inp.onchange = () => { const it = l.items.find(x => x.id === inp.dataset.mp); if (it) { it.price = pos(parseFloat(inp.value) || 0); saveCol('matlists'); refreshAll(); } }; });
      const un = body.querySelector('#mlUnlink'); if (un) un.onclick = () => { l.customerId = null; saveCol('matlists'); refreshAll(); };
      const ln = body.querySelector('#mlLink'); if (ln) ln.onclick = () => openPicker({
        title: 'ربط الكشف بعميل',
        items: DB.customers.map(c2 => ({ id: c2.id, title: c2.name, sub: esc(c2.phone), avatar: initialOf(c2.name) })),
        addNew: { label: q => `إضافة «${q || l.clientName || 'عميل'}» كعميل جديد`, fn: q => { const nc = NORMALIZERS.customers({ id: uid('c_'), name: q || l.clientName || 'عميل', phone: l.clientPhone, address: l.clientAddress }); DB.customers.unshift(nc); saveCol('customers'); l.customerId = nc.id; l.clientName = nc.name; saveCol('matlists'); refreshAll(); } },
        onPick: x => { const c2 = getCustomer(x.id); l.customerId = c2.id; l.clientName = c2.name; l.clientPhone = c2.phone || l.clientPhone; l.clientAddress = c2.address || l.clientAddress; saveCol('matlists'); refreshAll(); showAppToast(`✔️ تم ربط الكشف بـ ${c2.name}`); }
      });
    }
  };
};
function openMatItem(listId, itemId) {
  const l = getMatList(listId);
  if (!l) return;
  const ex = itemId ? l.items.find(x => x.id === itemId) : null;
  const it = ex ? Object.assign({}, ex) : { id: uid('i'), name: '', qty: 1, unit: 'قطعة', brand: '', spec: '', note: '', price: 0 };
  openForm({
    title: ex ? 'تعديل الخامة' : 'إضافة خامة',
    html: `
      <div class="chips" id="miChips" style="flex-wrap:wrap;overflow:visible">${MAT_PRESETS.map(n => `<button type="button" class="chip" data-n="${esc(n)}">${esc(n)}</button>`).join('')}</div>
      <div class="field"><label for="miName">اسم الخامة</label><input type="text" id="miName" value="${esc(it.name)}"></div>
      <div class="row-2">
        <div class="field"><label for="miQty">الكمية</label><input type="number" inputmode="decimal" min="0" step="any" id="miQty" value="${it.qty || ''}"></div>
        <div class="field"><label for="miBrand">الماركة</label><input type="text" id="miBrand" value="${esc(it.brand)}"></div>
      </div>
      <div class="field"><label>الوحدة</label><div class="unit-chips" id="miUnits">${MAT_UNITS.map(u => `<button type="button" class="chip${it.unit === u ? ' on' : ''}" data-u="${esc(u)}">${esc(u)}</button>`).join('')}</div></div>
      <div class="field"><label for="miSpec">المقاس / المواصفات</label><input type="text" id="miSpec" list="pipeSizes" value="${esc(it.spec)}" placeholder='مثال: 1/4" أو 3/8"'></div>
      <div class="field"><label for="miNote">ملاحظة</label><input type="text" id="miNote" value="${esc(it.note)}"></div>
      ${l.buyer === 'me' ? `<div class="field"><label for="miPrice">سعر الوحدة (<span class="cur">${CUR}</span>)</label><input type="number" inputmode="decimal" min="0" step="any" id="miPrice" value="${it.price || ''}"></div>` : ''}`,
    after: body => {
      body.querySelector('#miChips').onclick = e => { const b = e.target.closest('[data-n]'); if (!b) return; body.querySelector('#miName').value = b.dataset.n; if (/نحاس|عزل|كابل|خرطوم/.test(b.dataset.n)) { it.unit = 'متر'; body.querySelectorAll('#miUnits .chip').forEach(x => x.classList.toggle('on', x.dataset.u === 'متر')); } if (b.dataset.n === 'فريون') { it.unit = 'كجم'; body.querySelectorAll('#miUnits .chip').forEach(x => x.classList.toggle('on', x.dataset.u === 'كجم')); } };
      body.querySelector('#miUnits').onclick = e => { const b = e.target.closest('[data-u]'); if (!b) return; it.unit = b.dataset.u; body.querySelectorAll('#miUnits .chip').forEach(x => x.classList.toggle('on', x === b)); };
    },
    onSave: body => {
      const g = s => body.querySelector(s);
      const name = g('#miName').value.trim();
      if (!name) { showAppToast('⚠️ اكتب اسم الخامة'); return false; }
      Object.assign(it, { name, qty: pos(parseFloat(g('#miQty').value) || 1), brand: g('#miBrand').value.trim(), spec: g('#miSpec').value.trim(), note: g('#miNote').value.trim() });
      if (g('#miPrice')) it.price = pos(parseFloat(g('#miPrice').value) || 0);
      if (ex) l.items = l.items.map(x => x.id === it.id ? it : x); else l.items.push(it);
      saveCol('matlists');
    },
    onDelete: ex ? () => { l.items = l.items.filter(x => x.id !== ex.id); saveCol('matlists'); closeOverlay(); refreshAll(); } : null
  });
}
function deleteMatList(id) {
  const l = getMatList(id);
  if (!l) return;
  showAppConfirm(`حذف كشف خامات "${matListName(l)}" نهائياً؟`, () => { DB.matlists = DB.matlists.filter(x => x.id !== id); saveCol('matlists'); closeTopThen(() => { refreshAll(); showAppToast('تم حذف الكشف'); }); });
}
function buildMatListText(l) {
  const me = l.buyer === 'me', st = matListStats(l);
  const line = '--------------------------------\n';
  let text = `*📋 كشف الخامات المطلوبة*\n${business.techName ? '*' + business.techName + '*\n' : ''}*العميل:* ${matListName(l)} | *التاريخ:* ${fmtDate(l.date)}\n`;
  if (l.clientAddress) text += `*العنوان:* ${l.clientAddress}\n`;
  if (l.title) text += `*ملاحظة:* ${l.title}\n`;
  text += line;
  l.items.forEach((it, i) => {
    const det = [it.spec ? 'مقاس ' + it.spec : '', it.brand ? 'ماركة ' + it.brand : ''].filter(Boolean).join(' - ');
    text += `${i + 1}) *${it.name}*${det ? ' (' + det + ')' : ''} — *${matQtyText(it)}*${me && it.price ? ` × ${fmt(it.price)} = ${fmt(matItemTotal(it))} ${CUR}` : ''}\n`;
    if (it.note) text += `   _${it.note}_\n`;
  });
  text += line + `*عدد الأصناف:* ${st.count}\n`;
  if (me) text += `*إجمالي ثمن الخامات:* *${money(st.total)}*`;
  else if (l.buyer === 'customer') text += '*الخامات يشتريها العميل* — يرجى الالتزام بالمقاسات والماركات المذكورة.';
  return text.trim();
}

/* =========================================================
   المزيد: الإعدادات وبيانات النشاط
   ========================================================= */
function renderMore() {
  const set = (id, v) => { const el = document.getElementById(id); if (el && document.activeElement !== el) el.value = v; };
  set('bizTitle', business.title || DEFAULT_TITLE);
  set('bizName', business.techName || '');
  set('bizPhone', business.techPhone || '');
  set('bizAddress', business.techAddress || '');
  set('bizTerms', business.terms || '');
  renderLogoUI();
  const counts = { devices: DB.devices.length, visits: DB.visits.length, inventory: DB.inventory.length, workers: DB.workers.length, contracts: DB.contracts.length, notes: DB.notes.length, reminders: collectReminders().filter(r => r.days <= 7).length };
  document.querySelectorAll('[data-count]').forEach(el => { const n = counts[el.dataset.count]; el.textContent = n ? n : ''; el.classList.toggle('hidden', !n); });
  renderUpdateUI();
  renderBackupLine();
}
function saveBusinessFields() {
  business.title = val('bizTitle').trim() || DEFAULT_TITLE;
  business.techName = val('bizName');
  business.techPhone = val('bizPhone');
  business.techAddress = val('bizAddress');
  business.terms = val('bizTerms');
  business.showLogo = document.getElementById('showLogoCheck').checked;
  saveBusiness();
}
function uploadLogoFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  compressImage(file, 300, 0, 'image/png').then(d => { business.logoData = d; business.showLogo = true; saveBusiness(); renderLogoUI(); showAppToast('✔️ تم حفظ اللوجو'); }).catch(() => showAppToast('⚠️ تعذر قراءة الصورة'));
  event.target.value = '';
}
function removeLogo() { business.logoData = ''; business.showLogo = false; saveBusiness(); renderLogoUI(); }
function renderLogoUI() {
  const img = document.getElementById('logoThumbImg');
  if (!img) return;
  document.getElementById('showLogoCheck').checked = !!business.showLogo;
  const has = !!business.logoData;
  img.classList.toggle('hidden', !has);
  document.getElementById('logoPlaceholder').classList.toggle('hidden', has);
  document.getElementById('removeLogoBtn').classList.toggle('hidden', !has);
  document.getElementById('logoStatus').textContent = has ? 'اللوجو جاهز للطباعة' : 'لم يتم اختيار لوجو';
  if (has) img.src = business.logoData;
}
