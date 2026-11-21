/* =========================================================
   أرزقي HVAC - print.js
   نفس نظام الطباعة وPDF في أرزقي: ورقة A4 حقيقية قابلة للتعديل
   قبل الطباعة، بهوامش مطابقة للمعاينة، ومتعددة الصفحات.
   المستندات: فواتير التركيب/الصيانة/الإصلاح/قطع الغيار/الختامية،
   المقايسة، عرض السعر، إيصال الدفعة، كشف حساب العميل، عقد الصيانة،
   التقرير الفني للزيارة، سجل صيانة الجهاز، كشف الخامات.
   © 2026 أحمد حسن عبدالله - جميع الحقوق محفوظة.
   ========================================================= */
let currentPrintFontSize = 13;
let currentCellPadV = 5;
const CE = 'contenteditable="true"';
function autoFitTypography(count) {
  if (count <= 10) { currentPrintFontSize = 13.5; currentCellPadV = 5; }
  else if (count <= 18) { currentPrintFontSize = 12.5; currentCellPadV = 3.5; }
  else if (count <= 25) { currentPrintFontSize = 11.5; currentCellPadV = 2.5; }
  else { currentPrintFontSize = 10.5; currentCellPadV = 1.8; }
  applyPrintVariables();
}
function applyPrintVariables() {
  document.documentElement.style.setProperty('--p-font-size', currentPrintFontSize + 'px');
  document.documentElement.style.setProperty('--p-cell-pad-v', currentCellPadV + 'px');
}
function adjustPrintSize(delta) {
  currentPrintFontSize = Math.min(16, Math.max(9, currentPrintFontSize + delta * 0.6));
  currentCellPadV = Math.min(10, Math.max(1.5, currentCellPadV + delta * 0.5));
  applyPrintVariables();
  fitPreview();
}
function toggleLogoFromPreview() {
  if (!business.logoData) { document.getElementById('logoInputFile').click(); return; }
  business.showLogo = !business.showLogo;
  saveBusiness();
  const el = document.getElementById('previewLogoContainer');
  if (el) el.style.display = business.showLogo ? 'grid' : 'none';
  fitPreview();
}
function toggleEditHighlights() {
  const on = document.getElementById('printSheet').classList.toggle('show-edit-borders');
  document.getElementById('editHlBtn').classList.toggle('on', on);
}
function fitPreview() {
  const modal = document.getElementById('printPreviewModal');
  if (modal.style.display !== 'block') return;
  const vp = document.getElementById('printViewport');
  const sheet = document.getElementById('printSheet');
  const avail = Math.min(modal.clientWidth - 16, 900);
  const w = sheet.offsetWidth;
  const scale = Math.min(1, avail / w);
  sheet.style.transform = `scale(${scale})`;
  vp.style.width = (w * scale) + 'px';
  vp.style.height = (sheet.offsetHeight * scale) + 'px';
}
window.addEventListener('resize', fitPreview);
function openPreview(html, jobName, autoPrint) {
// أرزقي: كل المستندات اللي بتتطبع بنفس شكل الفواتير الموحدة (هيدر بياناتك + سطر العميل + فوتر أرزقي | Arzoqi)
  if (window.ArzaqiInvoice) html = ArzaqiInvoice.skinHTML(html, { titleFrom: 'h1', business: { name: business.techName || business.title, trade: business.techName ? business.title : '', phone: business.techPhone, address: business.techAddress, logo: business.showLogo ? business.logoData : '' } });
  document.getElementById('printSheet').innerHTML = html;
  printJobName = jobName || APP_NAME;
  openOverlay('preview');
  const modal = document.getElementById('printPreviewModal');
  modal.scrollTop = 0;
  fitPreview();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitPreview);
  hydrateMedia(document.getElementById('printSheet'), fitPreview);
  if (autoPrint) setTimeout(() => window.print(), 400);
}
function triggerSystemPrint() { window.print(); }

/* ---------- أجزاء مشتركة ---------- */
function printField(ic, label, value, wide = false) {
  return `<div class="inv-field${wide ? ' wide' : ''}"><span class="ic">${icon(ic)}</span><div style="min-width:0"><div class="lbl">${label}</div><div class="val" ${CE}>${value}</div></div></div>`;
}
function printClientFields(name, phone, address, extra) {
  return [
    printField('user', 'العميل', esc(name || '-')),
    printField('phone', 'هاتف العميل', phone ? `<span dir="ltr">${esc(phone)}</span>` : '-'),
    address ? printField('pin', 'العنوان', esc(address), true) : '',
    extra || ''
  ].join('');
}
function printHeaderHTML(title, tag, date, line2) {
  const showLogo = business.showLogo && business.logoData;
  const sub = business.techName || business.title || '';
  const contact = [business.techPhone ? `هاتف: <b dir="ltr">${esc(business.techPhone)}</b>` : '', business.techAddress ? esc(business.techAddress) : ''].filter(Boolean).join(' · ');
  return `
    <header class="inv-head">
      <div class="inv-brand">
        <div class="inv-logo" id="previewLogoContainer" style="display:${showLogo ? 'grid' : 'none'};"><img src="${business.logoData || ''}" alt="Logo"></div>
        <div style="min-width:0">
          <h1 ${CE}>${esc(title)}</h1>
          ${sub ? `<p ${CE}>${esc(sub)}</p>` : ''}
          ${contact ? `<p ${CE}>${contact}</p>` : ''}
        </div>
      </div>
      <div class="inv-doc">
        <span class="tag" ${CE}>${esc(tag)}</span>
        <span class="d" ${CE}>التاريخ: <b>${esc(date || '-')}</b></span>
        ${line2 ? `<span class="d" ${CE}>${line2}</span>` : ''}
      </div>
    </header>
    <div class="inv-stripe"></div>`;
}
function printFooterHTML() {
  return `<footer class="inv-foot"><span ${CE}>شكراً لثقتكم — <b>${esc(business.techName || '')}</b>${business.techPhone ? ` · <span dir="ltr">${esc(business.techPhone)}</span>` : ''}</span><span>صدرت بواسطة تطبيق <b>أرزقي | Arzoqi</b> — HVAC</span></footer>`;
}
const signHTML = (a = 'توقيع الفني / القائم بالأعمال', b = 'اعتماد العميل') => `<div class="inv-sign"><div ${CE}>${a}</div><div ${CE}>${b}</div></div>`;
function notesHTML(title, items) {
  items = items.filter(Boolean);
  if (!items.length) return '';
  return `<div class="inv-notes" ${CE}><h4>${esc(title)}</h4><ul>${items.map(i => `<li>${i}</li>`).join('')}</ul></div>`;
}
function secHTML(n, title) { return `<h2 class="inv-sec"><span class="n">${n}</span><span ${CE}>${esc(title)}</span></h2>`; }
function devicesPrintField(ids, text) {
  const devs = (ids || []).map(getDevice).filter(Boolean);
  if (devs.length) return printField('snow', devs.length > 1 ? 'الأجهزة' : 'الجهاز', devs.map(d => esc([d.type, d.brand, d.model ? 'موديل ' + d.model : '', capText(d), d.serial ? 'S/N ' + d.serial : ''].filter(Boolean).join(' · '))).join('<br>'), true);
  if (text) return printField('snow', 'الجهاز', esc(text), true);
  return '';
}

/* ---------- الفواتير والمقايسات وعروض الأسعار ---------- */
function buildDocHTML(d) {
  const info = docTypeInfo(d.docType);
  const t = computeDoc(d);
  autoFitTypography(Math.round(d.lines.length * 0.85) + (t.payments.length > 2 ? 3 : 0));
  let sec = 0;
  let tables = '';
  KIND_ORDER.forEach(k => {
    const ls = d.lines.filter(l => l.kind === k);
    if (!ls.length) return;
    const rows = ls.map((l, i) => {
      const client = isSupplyKind(l.kind) && l.source === 'client';
      const det = lineDetails(l).filter(x => x !== l.note);
      return `<tr>
        <td class="idx" ${CE}>${i + 1}</td>
        <td class="room-col" ${CE}>${esc(l.name)}${l.method === 'stage' ? (l.done ? ' <span class="pts">✓ تم</span>' : '') : ''}${l.note ? `<span class="sub-note">${esc(l.note)}</span>` : ''}</td>
        <td class="extras-col" ${CE}>${det.length ? det.map(esc).join(' · ') : '-'}</td>
        <td ${CE}>${esc(lineQtyText(l))}</td>
        <td ${CE}>${client ? '-' : (l.method === 'lump' || l.method === 'stage' ? '-' : esc(linePriceText(l)))}</td>
        <td class="money" ${CE}>${client ? 'من العميل' : money(lineTotal(l))}</td>
      </tr>`;
    }).join('');
    tables += secHTML(++sec, LINE_KINDS[k]) + `
      <table class="p-table"><thead><tr><th ${CE}>م</th><th ${CE}>البند</th><th ${CE}>التفاصيل</th><th ${CE}>الكمية</th><th ${CE}>سعر الوحدة</th><th ${CE}>الإجمالي</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr><td colspan="5" style="text-align:right" ${CE}>إجمالي ${esc(LINE_KINDS[k])}</td><td class="money" ${CE}>${money(t.byKind[k])}</td></tr></tfoot></table>`;
  });
  if (!d.lines.length) tables = secHTML(1, 'تفصيل الأعمال') + `<table class="p-table"><tbody><tr><td>لا توجد بنود مضافة</td></tr></tbody></table>`;
  if (t.billable && t.payments.length) {
    tables += secHTML(++sec, 'المدفوعات') + `<table class="p-table"><thead><tr><th ${CE}>م</th><th ${CE}>التاريخ</th><th ${CE}>النوع</th><th ${CE}>طريقة الدفع</th><th ${CE}>رقم الإيصال</th><th ${CE}>المبلغ</th></tr></thead><tbody>
      ${t.payments.map((p, i) => `<tr><td class="idx">${i + 1}</td><td ${CE}>${esc(fmtDate(p.date))}</td><td ${CE}>${esc(PAY_KINDS[p.kind])}</td><td ${CE}>${esc(p.method)}</td><td ${CE} dir="ltr">${esc(p.number)}</td><td class="money" ${CE}>${money(p.amount)}</td></tr>`).join('')}
      </tbody></table>`;
  }
  const chips = [];
  if (d.convertedFrom) chips.push(`<span class="inv-chip navy" ${CE}>بناءً على ${esc(d.convertedFrom)}</span>`);
  if (!t.billable && d.validUntil) chips.push(`<span class="inv-chip" ${CE}>العرض سارٍ حتى: <b>${esc(fmtDate(d.validUntil))}</b></span>`);
  if (d.warrantyMonths) chips.push(`<span class="inv-chip" ${CE}>الضمان: <b>${fmtN(d.warrantyMonths)} شهر حتى ${esc(fmtDate(addMonthsISO(d.date, d.warrantyMonths)))}</b></span>`);
  const workers = d.workerIds.map(getWorker).filter(Boolean);
  if (workers.length) chips.push(`<span class="inv-chip navy" ${CE}>الفنيين: <b>${workers.map(w => esc(w.name)).join('، ')}</b></span>`);
  if (t.stagesCount) chips.push(`<span class="inv-chip navy" ${CE}>المراحل المنفذة: <b>${t.stagesDone} من ${t.stagesCount}</b></span>`);
  const notes = notesHTML('ملاحظات', [
    d.notes ? esc(d.notes) : '',
    d.warrantyTerms ? 'شروط الضمان: ' + esc(d.warrantyTerms) : '',
    !t.billable ? 'الأسعار المذكورة عرض سعر/مقايسة ولا تعتبر فاتورة نهائية.' : '',
    d.lines.some(l => l.kind === 'refrigerant') ? 'كمية الفريون حسب بيانات الشركة المصنعة ولوحة بيانات الجهاز.' : '',
    business.terms ? esc(business.terms) : ''
  ]);
  // أرزقي: الفاتورة الموحدة (نفس الأرقام اللي القسم حسبها)
  if (window.ArzaqiInvoice) {
    const cust = d.customerId ? getCustomer(d.customerId) : null;
    const lines = ArzaqiInvoice.kindLines(t.byKind, LINE_KINDS, KIND_ORDER, { materials: ['part', 'material', 'refrigerant', 'equipment'], workers: ['labor'] },
      { materialsLabel: 'الخامات والأجهزة (على العميل)', workersLabel: 'أجور الفنيين (على العميل)' });
    if (t.add) lines.push(['إضافات' + (d.addNote ? ' (' + esc(d.addNote) + ')' : ''), t.add, '+']);
    if (t.discount) lines.push(['الخصم', t.discount, '-']);
    const warranty = (d.warrantyMonths ? 'ضمان ' + fmtN(d.warrantyMonths) + ' شهر حتى ' + fmtDate(addMonthsISO(d.date, d.warrantyMonths)) : '')
      + (d.warrantyTerms ? (d.warrantyMonths ? ' — ' : '') + d.warrantyTerms : '');
    return ArzaqiInvoice.render({
      section: 'hvac', docKey: d.id, docLabel: info.label, number: d.number, date: fmtDate(d.date), billable: t.billable,
      business: { name: business.techName || business.title, trade: business.techName ? business.title : '', phone: business.techPhone, address: business.techAddress, logo: business.showLogo ? business.logoData : '' },
      currency: currentCurrency().name + ' (' + CUR + ')', fields: ArzaqiInvoice.fieldsFromHTML(devicesPrintField(d.deviceIds, d.deviceText)),
      client: { name: d.clientName, phone: d.clientPhone, address: d.clientAddress, note: cust ? cust.note : '' },
      chips: chips.filter(c => c.indexOf('الضمان:') < 0), bodyHTML: tables, notesHTML: notes, money,
      totals: { lines, total: t.total, paid: t.paid, paidLabel: 'الواصل من العميل' + (t.payments.length ? ' (' + t.payments.length + ' دفعة)' : '') },
      warranty, signLabel: 'توقيع الفني', netLabel: 'إجمالي ' + info.label
    });
  }
  const kindRows = KIND_ORDER.filter(k => t.byKind[k]).map(k => `<tr><td ${CE}>${esc(LINE_KINDS[k])}</td><td ${CE}>${money(t.byKind[k])}</td></tr>`).join('');
  return `
    ${printHeaderHTML(info.label, d.number, fmtDate(d.date), `عدد البنود: <b>${d.lines.length}</b>`)}
    <section class="inv-client">${printClientFields(d.clientName, d.clientPhone, d.clientAddress, devicesPrintField(d.deviceIds, d.deviceText))}</section>
    ${chips.length ? `<div class="inv-pricing">${chips.join('')}</div>` : ''}
    ${tables}
    <div class="inv-bottom">
      <div class="inv-side">${notes}${signHTML()}</div>
      <div class="inv-totals">
        <table class="p-totals-table">
          ${kindRows}
          <tr class="sub"><td ${CE}>مجموع البنود</td><td ${CE}>${money(t.subtotal)}</td></tr>
          ${t.add ? `<tr><td ${CE}>إضافات${d.addNote ? ' (' + esc(d.addNote) + ')' : ''}</td><td ${CE}>+ ${money(t.add)}</td></tr>` : ''}
          ${t.discount ? `<tr class="minus"><td ${CE}>الخصم</td><td ${CE}>- ${money(t.discount)}</td></tr>` : ''}
          <tr class="sub"><td ${CE}>إجمالي ${t.billable ? 'الفاتورة' : esc(info.short)}</td><td ${CE}>${money(t.total)}</td></tr>
          ${t.billable && t.paid ? `<tr class="paid"><td ${CE}>المدفوع (${t.payments.length} دفعة)</td><td ${CE}>- ${money(t.paid)}</td></tr>` : ''}
        </table>
        <div class="inv-net"><span ${CE}>${t.billable ? (t.remaining >= 0 ? 'المتبقي المطلوب سداده' : 'زيادة للعميل') : 'الإجمالي'}</span><strong ${CE}>${money(t.billable ? Math.abs(t.remaining) : t.total)}</strong></div>
      </div>
    </div>
    ${printFooterHTML()}`;
}
function openDocPreview(autoPrint) {
  const d = getCurrentDoc();
  if (!d) return;
  openPreview(buildDocHTML(d), `${docTypeInfo(d.docType).label} ${d.number} ${docTitle(d)}`, autoPrint);
}

/* ---------- إيصال استلام دفعة ---------- */
function buildReceiptHTML(p) {
  autoFitTypography(6);
  const d = p.docId ? getDoc(p.docId) : null;
  const c = p.customerId ? getCustomer(p.customerId) : null;
  const name = d ? docTitle(d) : (c ? c.name : '-');
  let rows = '';
  if (d) {
    const t = computeDoc(d);
    const before = round2(t.payments.filter(x => (x.date || '') < (p.date || '') || (x.date === p.date && x.createdAt < p.createdAt)).reduce((s, x) => s + x.amount, 0));
    rows = `<tr><td ${CE}>إجمالي ${esc(docTypeInfo(d.docType).label)} ${esc(d.number)}</td><td ${CE}>${money(t.total)}</td></tr>
      <tr><td ${CE}>المدفوع قبل هذه الدفعة</td><td ${CE}>${money(before)}</td></tr>
      <tr class="paid"><td ${CE}>هذه الدفعة</td><td ${CE}>${money(p.amount)}</td></tr>
      <tr class="sub"><td ${CE}>المتبقي بعد هذه الدفعة</td><td ${CE}>${money(round2(t.total - before - p.amount))}</td></tr>`;
  } else if (c) {
    rows = `<tr class="paid"><td ${CE}>دفعة على الحساب العام</td><td ${CE}>${money(p.amount)}</td></tr><tr class="sub"><td ${CE}>المتبقي على العميل حالياً</td><td ${CE}>${money(customerStats(c).remaining)}</td></tr>`;
  }
  return `
    ${printHeaderHTML('إيصال استلام دفعة', p.number || 'إيصال', fmtDate(p.date), d ? `الفاتورة: <b dir="ltr">${esc(d.number)}</b>` : '')}
    <section class="inv-client">${printClientFields(name, d ? d.clientPhone : (c ? c.phone : ''), d ? d.clientAddress : (c ? c.address : ''))}</section>
    <div class="receipt-amount" ${CE}>استلمنا من السيد/ة <b>${esc(name)}</b> مبلغ وقدره <b class="big">${money(p.amount)}</b> (${esc(PAY_KINDS[p.kind])} — ${esc(p.method)})${p.note ? `<br>البيان: ${esc(p.note)}` : ''}</div>
    <div class="inv-bottom">
      <div class="inv-side">${signHTML('توقيع المستلم', 'توقيع العميل')}</div>
      <div class="inv-totals"><table class="p-totals-table">${rows}</table><div class="inv-net"><span ${CE}>المبلغ المستلم</span><strong ${CE}>${money(p.amount)}</strong></div></div>
    </div>
    ${printFooterHTML()}`;
}
function openReceiptPreview(payId) {
  const p = DB.payments.find(x => x.id === payId);
  if (!p) return;
  if (!p.number) { p.number = nextNumber('RCPT'); saveCol('payments'); }
  openPreview(buildReceiptHTML(p), 'إيصال ' + p.number);
}

/* ---------- كشف حساب العميل ---------- */
function buildStatementHTML(c) {
  const st = customerStats(c);
  autoFitTypography(Math.round((st.billDocs.length + st.pays.length) * 0.7));
  const docRows = st.billDocs.slice().reverse().map((d, i) => { const t = computeDoc(d); return `<tr><td class="idx">${i + 1}</td><td ${CE} dir="ltr">${esc(d.number)}</td><td ${CE}>${esc(docTypeInfo(d.docType).short)}</td><td ${CE}>${esc(fmtDate(d.date))}</td><td ${CE}>${money(t.total)}</td><td ${CE}>${money(t.paid)}</td><td class="money" ${CE}>${money(t.remaining)}</td></tr>`; }).join('');
  const payRows = st.pays.slice().sort((a, b) => (a.date || '').localeCompare(b.date || '')).map((p, i) => { const d = getDoc(p.docId); return `<tr><td class="idx">${i + 1}</td><td ${CE}>${esc(fmtDate(p.date))}</td><td ${CE}>${esc(PAY_KINDS[p.kind])}</td><td ${CE}>${esc(p.method)}</td><td ${CE} dir="ltr">${d ? esc(d.number) : 'على الحساب'}</td><td class="money" ${CE}>${money(p.amount)}</td></tr>`; }).join('');
  return `
    ${printHeaderHTML('كشف حساب العميل', 'كشف حساب', fmtDate(todayISO()), `عدد الفواتير: <b>${st.billDocs.length}</b>`)}
    <section class="inv-client">${printClientFields(c.name, c.phone, c.address)}</section>
    ${secHTML(1, 'الفواتير')}
    <table class="p-table"><thead><tr><th>م</th><th ${CE}>رقم الفاتورة</th><th ${CE}>النوع</th><th ${CE}>التاريخ</th><th ${CE}>الإجمالي</th><th ${CE}>المدفوع</th><th ${CE}>المتبقي</th></tr></thead>
      <tbody>${docRows || '<tr><td colspan="7">لا توجد فواتير</td></tr>'}</tbody>
      <tfoot><tr><td colspan="4" style="text-align:right" ${CE}>الإجمالي</td><td ${CE}>${money(st.billed)}</td><td></td><td></td></tr></tfoot></table>
    ${st.matCharges ? secHTML(2, 'خامات على حساب العميل') + `<table class="p-table"><tbody>${st.mats.map((l, i) => `<tr><td class="idx">${i + 1}</td><td class="room-col" ${CE}>${esc(l.title || 'كشف خامات')} (${l.items.length} صنف)</td><td ${CE}>${esc(fmtDate(l.date))}</td><td class="money" ${CE}>${money(matListStats(l).total)}</td></tr>`).join('')}</tbody></table>` : ''}
    ${secHTML(st.matCharges ? 3 : 2, 'المدفوعات')}
    <table class="p-table"><thead><tr><th>م</th><th ${CE}>التاريخ</th><th ${CE}>النوع</th><th ${CE}>طريقة الدفع</th><th ${CE}>الفاتورة</th><th ${CE}>المبلغ</th></tr></thead>
      <tbody>${payRows || '<tr><td colspan="6">لا توجد مدفوعات</td></tr>'}</tbody></table>
    <div class="inv-bottom">
      <div class="inv-side">${signHTML()}</div>
      <div class="inv-totals"><table class="p-totals-table">
        <tr><td ${CE}>إجمالي الفواتير</td><td ${CE}>${money(st.billed)}</td></tr>
        ${st.matCharges ? `<tr><td ${CE}>خامات على حسابه</td><td ${CE}>+ ${money(st.matCharges)}</td></tr>` : ''}
        <tr class="paid"><td ${CE}>إجمالي المدفوع</td><td ${CE}>- ${money(st.paid)}</td></tr>
      </table><div class="inv-net"><span ${CE}>${st.remaining >= 0 ? 'المتبقي على العميل' : 'زيادة للعميل'}</span><strong ${CE}>${money(Math.abs(st.remaining))}</strong></div></div>
    </div>
    ${printFooterHTML()}`;
}
function openStatementPreview(cid) { const c = getCustomer(cid); if (c) openPreview(buildStatementHTML(c), 'كشف حساب ' + c.name); }

/* ---------- عقد الصيانة ---------- */
function buildContractHTML(k) {
  autoFitTypography(8);
  const st = contractStats(k);
  const devs = k.deviceIds.map(getDevice).filter(Boolean);
  const per = CONTRACT_PERIODS[k.period];
  const clauses = [
    `مدة العقد ${esc(per.label)} تبدأ من ${esc(fmtDate(k.start))} وتنتهي في ${esc(fmtDate(st.end))}.`,
    `يشمل العقد عدد (${fmtN(k.visitsIncluded)}) زيارة صيانة دورية خلال مدة العقد.`,
    k.services.length ? `الخدمات المشمولة: ${k.services.map(esc).join('، ')}.` : '',
    k.extraServices ? `الخدمات غير المشمولة / الإضافية: ${esc(k.extraServices)}.` : 'قطع الغيار والفريون والخدمات غير المذكورة تُحسب بشكل منفصل.',
    k.extraPricing ? `تسعير الخدمات الإضافية: ${esc(k.extraPricing)}.` : '',
    `قيمة العقد ${money(k.value)}.`,
    k.notes ? esc(k.notes) : ''
  ].filter(Boolean);
  return `
    ${printHeaderHTML('عقد صيانة أجهزة تكييف وتبريد', k.number, fmtDate(k.start), `النوع: <b>${esc(per.label)}</b>`)}
    <section class="inv-client">${printClientFields(contractClient(k), k.clientPhone, k.clientAddress)}</section>
    ${secHTML(1, 'الأجهزة المشمولة')}
    <table class="p-table"><thead><tr><th>م</th><th ${CE}>الجهاز</th><th ${CE}>الماركة / الموديل</th><th ${CE}>القدرة</th><th ${CE}>الموقع</th></tr></thead><tbody>
      ${devs.length ? devs.map((d, i) => `<tr><td class="idx">${i + 1}</td><td class="room-col" ${CE}>${esc(d.type)}</td><td ${CE}>${esc([d.brand, d.model].filter(Boolean).join(' / ') || '-')}</td><td ${CE}>${esc(capText(d) || '-')}</td><td ${CE}>${esc(d.location || '-')}</td></tr>`).join('')
        : `<tr><td colspan="5" ${CE}>${k.devicesCount ? fmtN(k.devicesCount) + ' جهاز' : 'حسب المتفق عليه'}</td></tr>`}
    </tbody></table>
    ${secHTML(2, 'بنود العقد')}
    <div class="inv-notes" ${CE} style="margin-bottom:12px"><ol style="padding-right:18px">${clauses.map(c => `<li>${c}</li>`).join('')}</ol></div>
    <div class="inv-bottom">
      <div class="inv-side">${signHTML('الطرف الأول (مقدم الخدمة)', 'الطرف الثاني (العميل)')}</div>
      <div class="inv-totals"><table class="p-totals-table">
        <tr><td ${CE}>نوع العقد</td><td ${CE}>${esc(per.label)}</td></tr>
        <tr><td ${CE}>عدد الزيارات</td><td ${CE}>${fmtN(k.visitsIncluded)}</td></tr>
        <tr><td ${CE}>عدد الأجهزة</td><td ${CE}>${fmtN(devs.length || k.devicesCount)}</td></tr>
      </table><div class="inv-net"><span ${CE}>قيمة العقد</span><strong ${CE}>${money(k.value)}</strong></div></div>
    </div>
    ${printFooterHTML()}`;
}
function openContractPreview(id) { const k = getContract(id); if (k) openPreview(buildContractHTML(k), 'عقد صيانة ' + k.number); }

/* ---------- التقرير الفني للزيارة (منفصل عن الفاتورة) ---------- */
function buildVisitReportHTML(v) {
  autoFitTypography(v.parts.length + v.readings.length);
  const c = getCustomer(v.customerId), dv = getDevice(v.deviceId);
  const blk = (t, x) => x ? `<tr><td class="room-col" style="width:28%" ${CE}>${t}</td><td class="extras-col" ${CE}>${esc(x).replace(/\n/g, '<br>')}</td></tr>` : '';
  let sec = 0;
  const findings = [blk('وصف المشكلة', v.problem), blk('العطل المكتشف', v.fault), blk('سبب العطل', v.cause), blk('الأعمال المنفذة', v.workDone)].join('');
  return `
    ${printHeaderHTML('تقرير فني للزيارة', v.number || 'تقرير', fmtDate(v.date), `الحالة: <b>${esc(VISIT_STATUS[v.status].label)}</b>`)}
    <section class="inv-client">${printClientFields(c ? c.name : '-', c ? c.phone : '', c ? c.address : '', dv ? devicesPrintField([dv.id]) : '')}</section>
    <div class="inv-pricing">
      <span class="inv-chip navy" ${CE}>نوع الخدمة: <b>${esc(v.serviceType || '-')}</b></span>
      ${visitTechNames(v) ? `<span class="inv-chip navy" ${CE}>الفني: <b>${esc(visitTechNames(v))}</b></span>` : ''}
      ${v.contractId && getContract(v.contractId) ? `<span class="inv-chip" ${CE}>ضمن عقد: <b>${esc(getContract(v.contractId).number)}</b></span>` : ''}
    </div>
    ${findings ? secHTML(++sec, 'التشخيص والأعمال') + `<table class="p-table"><tbody>${findings}</tbody></table>` : ''}
    ${v.parts.length ? secHTML(++sec, 'قطع الغيار والخامات المستخدمة') + `<table class="p-table"><thead><tr><th>م</th><th ${CE}>القطعة</th><th ${CE}>النوع</th><th ${CE}>الكمية</th></tr></thead><tbody>${v.parts.map((p, i) => `<tr><td class="idx">${i + 1}</td><td class="room-col" ${CE}>${esc(p.name)}</td><td ${CE}>${p.kind === 'material' ? 'خامة' : 'قطعة غيار'}</td><td ${CE}>${fmtN(p.qty)} ${esc(p.unit)}</td></tr>`).join('')}</tbody></table>` : ''}
    ${v.refType ? secHTML(++sec, 'الفريون') + `<table class="p-table"><tbody><tr><td class="room-col" ${CE}>نوع الفريون</td><td ${CE}>${esc(v.refType)}</td><td class="room-col" ${CE}>الكمية المستخدمة</td><td ${CE}>${fmtN(v.refQty)} ${esc(v.refUnit)}</td></tr></tbody></table>` : ''}
    ${v.readings.length ? secHTML(++sec, 'القراءات الفنية المسجلة') + `<table class="p-table"><thead><tr><th>م</th><th ${CE}>القراءة</th><th ${CE}>القيمة</th></tr></thead><tbody>${v.readings.map((r, i) => `<tr><td class="idx">${i + 1}</td><td class="room-col" ${CE}>${esc(r.label)}</td><td ${CE} dir="ltr">${esc(r.value)}</td></tr>`).join('')}</tbody></table>` : ''}
    ${v.photos.length ? secHTML(++sec, 'صور قبل وبعد') + `<div class="print-photos">${v.photos.map(p => `<figure><img data-media="${esc(p.id)}" alt=""><figcaption>${p.stage === 'after' ? 'بعد' : 'قبل'}</figcaption></figure>`).join('')}</div>` : ''}
    <div class="inv-bottom">
      <div class="inv-side">${notesHTML('التوصيات والمتابعة', [v.recommendations ? esc(v.recommendations) : '', v.nextDate ? `موعد الزيارة القادمة: ${esc(fmtDate(v.nextDate))}${v.nextNote ? ' — ' + esc(v.nextNote) : ''}` : '', v.warrantyMonths ? `الضمان على العمل: ${fmtN(v.warrantyMonths)} شهر حتى ${esc(fmtDate(addMonthsISO(v.date, v.warrantyMonths)))}${v.warrantyTerms ? ' — ' + esc(v.warrantyTerms) : ''}` : ''])}</div>
      <div class="inv-side">${signHTML('توقيع الفني', 'توقيع العميل')}</div>
    </div>
    ${printFooterHTML()}`;
}
function openVisitReportPreview(id) { const v = getVisit(id); if (v) openPreview(buildVisitReportHTML(v), 'تقرير فني ' + (v.number || '')); }

/* ---------- سجل صيانة الجهاز ---------- */
function buildDeviceHistoryHTML(dv) {
  const vs = deviceVisits(dv.id).slice().reverse();
  autoFitTypography(vs.length);
  const c = getCustomer(dv.customerId);
  return `
    ${printHeaderHTML('سجل صيانة الجهاز', dv.type, fmtDate(todayISO()), `عدد الزيارات: <b>${vs.length}</b>`)}
    <section class="inv-client">${printClientFields(c ? c.name : '-', c ? c.phone : '', c ? c.address : '')}</section>
    <section class="inv-client">
      ${printField('snow', 'الجهاز', esc([dv.type, dv.brand].filter(Boolean).join(' · ')))}
      ${printField('tag', 'الموديل / السيريال', `<span dir="ltr">${esc([dv.model, dv.serial].filter(Boolean).join(' / ') || '-')}</span>`)}
      ${printField('gauge', 'القدرة / الفريون', esc([capText(dv), dv.refrigerant].filter(Boolean).join(' · ') || '-'))}
      ${printField('calendar', 'الشراء / التركيب', esc([fmtDate(dv.purchaseDate), fmtDate(dv.installDate)].filter(Boolean).join(' / ') || '-'))}
      ${dv.location ? printField('pin', 'الموقع', esc(dv.location), true) : ''}
    </section>
    ${secHTML(1, 'سجل الزيارات والصيانة')}
    <table class="p-table"><thead><tr><th>م</th><th ${CE}>التاريخ</th><th ${CE}>الخدمة</th><th ${CE}>العطل / الأعمال</th><th ${CE}>الفني</th><th ${CE}>الحالة</th></tr></thead><tbody>
      ${vs.length ? vs.map((v, i) => `<tr><td class="idx">${i + 1}</td><td ${CE}>${esc(fmtDate(v.date))}</td><td ${CE}>${esc(v.serviceType || '-')}</td><td class="extras-col" ${CE}>${esc([v.fault, v.workDone].filter(Boolean).join(' — ') || '-')}${v.refType ? `<span class="sub-note">فريون ${esc(v.refType)} ${fmtN(v.refQty)} ${esc(v.refUnit)}</span>` : ''}${v.parts.length ? `<span class="sub-note">قطع: ${v.parts.map(p => esc(p.name)).join('، ')}</span>` : ''}</td><td ${CE}>${esc(visitTechNames(v) || '-')}</td><td ${CE}>${esc(VISIT_STATUS[v.status].label)}</td></tr>`).join('') : '<tr><td colspan="6">لا توجد زيارات مسجلة</td></tr>'}
    </tbody></table>
    ${dv.notes ? `<div class="inv-notes" ${CE} style="margin-bottom:12px"><h4>ملاحظات فنية</h4>${esc(dv.notes)}</div>` : ''}
    ${printFooterHTML()}`;
}
function openDeviceHistoryPreview(id) { const dv = getDevice(id); if (dv) openPreview(buildDeviceHistoryHTML(dv), 'سجل صيانة ' + dv.type); }

/* ---------- كشف الخامات ---------- */
function buildMatListHTML(l) {
  autoFitTypography(Math.round(l.items.length * 0.75));
  const me = l.buyer === 'me', st = matListStats(l);
  const rows = l.items.map((it, i) => `<tr><td class="idx">${i + 1}</td><td class="room-col" ${CE}>${esc(it.name)}${it.note ? `<span class="sub-note">${esc(it.note)}</span>` : ''}</td><td ${CE}>${esc(it.spec) || '-'}</td><td ${CE}>${esc(it.brand) || '-'}</td><td ${CE}><b>${esc(matQtyText(it))}</b></td>${me ? `<td ${CE}>${it.price ? money(it.price) : '-'}</td><td class="money" ${CE}>${matItemTotal(it) ? money(matItemTotal(it)) : '-'}</td>` : ''}</tr>`).join('');
  const chips = [];
  if (l.buyer === 'me') chips.push(`<span class="inv-chip" ${CE}>الخامات يوفّرها: <b>الفني (على حساب العميل)</b></span>`);
  else if (l.buyer === 'customer') chips.push(`<span class="inv-chip navy" ${CE}>الخامات يشتريها: <b>العميل</b></span>`);
  if (l.title) chips.push(`<span class="inv-chip navy" ${CE}>${esc(l.title)}</span>`);
  const notes = notesHTML('ملاحظات', ['يرجى الالتزام بالمقاسات والماركات المذكورة لضمان جودة التركيب.', 'أي تغيير في الخامات يتم بالتنسيق مع الفني.']);
  return `
    ${printHeaderHTML('كشف الخامات المطلوبة', 'كشف خامات', fmtDate(l.date), `عدد الأصناف: <b>${st.count}</b>`)}
    <section class="inv-client">${printClientFields(matListName(l), l.clientPhone, l.clientAddress)}</section>
    ${chips.length ? `<div class="inv-pricing">${chips.join('')}</div>` : ''}
    ${secHTML(1, 'الخامات المطلوبة')}
    <table class="p-table"><thead><tr><th>م</th><th ${CE}>الخامة</th><th ${CE}>المقاس</th><th ${CE}>الماركة</th><th ${CE}>الكمية</th>${me ? `<th ${CE}>سعر الوحدة</th><th ${CE}>الإجمالي</th>` : ''}</tr></thead>
      <tbody>${rows || `<tr><td colspan="${me ? 7 : 5}">لا توجد خامات</td></tr>`}</tbody>
      ${me ? `<tfoot><tr><td colspan="6" style="text-align:right" ${CE}>إجمالي ثمن الخامات</td><td class="money" ${CE}>${money(st.total)}</td></tr></tfoot>` : ''}</table>
    ${me ? `<div class="inv-bottom"><div class="inv-side">${notes}${signHTML()}</div><div class="inv-totals"><table class="p-totals-table"><tr><td ${CE}>عدد الأصناف</td><td ${CE}>${st.count}</td></tr></table><div class="inv-net"><span ${CE}>إجمالي الخامات</span><strong ${CE}>${money(st.total)}</strong></div></div></div>`
      : `<div class="inv-bottom" style="grid-template-columns:1fr 1fr">${notes}${signHTML()}</div>`}
    ${printFooterHTML()}`;
}
function openMatPreview(id) {
  const l = getMatList(id);
  if (!l) return;
  if (!l.items.length) { showAppToast('⚠️ ضيف الخامات الأول قبل الطباعة'); return; }
  openPreview(buildMatListHTML(l), 'كشف خامات ' + matListName(l));
}

/* =========================================================
   نصوص واتساب
   ========================================================= */
function buildDocText(d) {
  const info = docTypeInfo(d.docType);
  const t = computeDoc(d);
  const line = '--------------------------------\n';
  let text = `*❄️ ${info.label} ${d.number}*\n`;
  if (business.techName) text += `*${business.techName}*\n`;
  text += `*العميل:* ${docTitle(d)} | *التاريخ:* ${fmtDate(d.date)}\n`;
  if (d.clientPhone) text += `*الهاتف:* ${d.clientPhone}\n`;
  if (d.clientAddress) text += `*العنوان:* ${d.clientAddress}\n`;
  const devs = d.deviceIds.map(getDevice).filter(Boolean);
  if (devs.length) text += `*الأجهزة:* ${devs.map(deviceLabel).join(' / ')}\n`;
  else if (d.deviceText) text += `*الجهاز:* ${d.deviceText}\n`;
  KIND_ORDER.forEach(k => {
    const ls = d.lines.filter(l => l.kind === k);
    if (!ls.length) return;
    text += line + `*${LINE_KINDS[k]}:*\n`;
    ls.forEach((l, i) => {
      const client = isSupplyKind(l.kind) && l.source === 'client';
      text += `${i + 1}. ${l.name}${l.size ? ' ' + l.size : ''}${l.refType ? ' (' + l.refType + ')' : ''}: ${client ? 'من العميل' : (l.method === 'lump' || l.method === 'stage' ? '' : `${lineQtyText(l)} × ${linePriceText(l)} = `) + `*${money(lineTotal(l))}*`}\n`;
    });
  });
  text += line + `*مجموع البنود:* ${money(t.subtotal)}\n`;
  if (t.add) text += `*إضافات:* ${money(t.add)}\n`;
  if (t.discount) text += `*الخصم:* ${money(t.discount)}\n`;
  text += `*الإجمالي:* *${money(t.total)}*\n`;
  if (t.billable) {
    if (t.paid) text += `*المدفوع:* ${money(t.paid)}\n`;
    text += `*المتبقي:* *${money(t.remaining)}*`;
  } else if (d.validUntil) text += `_العرض سارٍ حتى ${fmtDate(d.validUntil)}_`;
  if (d.warrantyMonths) text += `\n*الضمان:* ${fmtN(d.warrantyMonths)} شهر`;
  return text.trim();
}
function sendDocWhatsApp() { const d = getCurrentDoc(); if (d) sendWhatsApp(d.clientPhone, buildDocText(d)); }
function copyDocText() { const d = getCurrentDoc(); if (d) copyText(buildDocText(d), '✔️ تم نسخ الفاتورة — الصقها في واتساب'); }
function buildStatementText(c) {
  const st = customerStats(c);
  const line = '--------------------------------\n';
  let text = `*📒 كشف حساب العميل: ${c.name}*\n${business.techName ? '*' + business.techName + '*\n' : ''}*تاريخ الكشف:* ${fmtDate(todayISO())}\n` + line;
  text += '*الفواتير:*\n';
  if (st.billDocs.length) st.billDocs.slice().reverse().forEach((d, i) => { const t = computeDoc(d); text += `${i + 1}) ${d.number} ${docTypeInfo(d.docType).short} — ${fmtDate(d.date)} — *${money(t.total)}*\n`; });
  else text += 'لا توجد فواتير.\n';
  if (st.matCharges) text += `*خامات على حسابه:* ${money(st.matCharges)}\n`;
  text += line + '*المدفوعات:*\n';
  if (st.pays.length) st.pays.slice().sort((a, b) => (a.date || '').localeCompare(b.date || '')).forEach((p, i) => { text += `${i + 1}) ${fmtDate(p.date)} — ${PAY_KINDS[p.kind]} (${p.method}) — *${money(p.amount)}*\n`; });
  else text += 'لا توجد مدفوعات.\n';
  text += line + `*الإجمالي:* ${money(st.billed + st.matCharges)} | *المدفوع:* ${money(st.paid)}\n`;
  text += st.remaining >= 0 ? `*المتبقي:* *${money(st.remaining)}*` : `*زيادة للعميل:* *${money(-st.remaining)}*`;
  return text;
}
function buildVisitText(v) {
  const c = getCustomer(v.customerId), dv = getDevice(v.deviceId);
  let text = `*🛠️ تقرير زيارة ${v.number || ''}*\n${business.techName ? '*' + business.techName + '*\n' : ''}*التاريخ:* ${fmtDate(v.date)}\n`;
  if (c) text += `*العميل:* ${c.name}\n`;
  if (dv) text += `*الجهاز:* ${deviceLabel(dv)}\n`;
  text += `*الخدمة:* ${v.serviceType || '-'} | *الحالة:* ${VISIT_STATUS[v.status].label}\n--------------------------------\n`;
  if (v.problem) text += `*المشكلة:* ${v.problem}\n`;
  if (v.fault) text += `*العطل:* ${v.fault}\n`;
  if (v.cause) text += `*السبب:* ${v.cause}\n`;
  if (v.workDone) text += `*الأعمال المنفذة:* ${v.workDone}\n`;
  if (v.parts.length) text += `*القطع:* ${v.parts.map(p => `${p.name} (${fmtN(p.qty)})`).join('، ')}\n`;
  if (v.refType) text += `*الفريون:* ${v.refType} ${fmtN(v.refQty)} ${v.refUnit}\n`;
  if (v.readings.length) text += `*القراءات:* ${v.readings.map(r => `${r.label}: ${r.value}`).join(' | ')}\n`;
  if (v.recommendations) text += `*التوصيات:* ${v.recommendations}\n`;
  if (v.nextDate) text += `*الزيارة القادمة:* ${fmtDate(v.nextDate)}\n`;
  if (v.warrantyMonths) text += `*الضمان:* ${fmtN(v.warrantyMonths)} شهر\n`;
  text += `--------------------------------\n*قيمة الزيارة:* *${money(visitTotal(v))}*`;
  return text;
}
