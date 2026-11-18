/* =========================================================
   حساباتي السباكة - docs.js
   محرك المحاسبة: المقايسات والفواتير وعروض الأسعار، البنود بطرق
   الحساب المختلفة (نقطة، حمام، مطبخ، متر، قطعة، يومية، مقاولة، زيارة،
   متر مكعب، مراحل، توريد وتركيب)، منع تكرار البنود، المدفوعات، والمخزون.
   © 2026 أحمد حسن عبدالله - جميع الحقوق محفوظة.
   ========================================================= */

/* ---------------- حساب البنود ---------------- */
function isSupplyKind(kind) { return SUPPLY_KINDS.includes(kind); }
function lineMultOn(l) { return !!METHODS[l.method].mult; }
function lineFromClient(l) { return isSupplyKind(l.kind) && l.source === 'client'; }
// الكمية الفعلية المضروبة في السعر
function lineBaseQty(l) {
  if (l.method === 'lump') return 1;
  if (l.method === 'stage') return n0(l.qty) || 1;
  return n0(l.qty) * (lineMultOn(l) ? (n0(l.mult) || 1) : 1);
}
// قيمة التوريد (سعر البيع) — خامات العميل لا تُحسب
function lineSupplyTotal(l) { return lineFromClient(l) ? 0 : round2(lineBaseQty(l) * n0(l.price)); }
// مصنعية التركيب المنفصلة لبنود التوريد (تُحسب حتى لو الخامة من العميل)
function lineInstallTotal(l) { return isSupplyKind(l.kind) ? round2(lineBaseQty(l) * n0(l.install)) : 0; }
function lineTotal(l) { return round2(lineSupplyTotal(l) + lineInstallTotal(l)); }
// تكلفة الشراء على السباك
function lineCost(l) { return lineFromClient(l) ? 0 : round2(lineBaseQty(l) * n0(l.cost)); }
function lineQtyText(l) {
  if (l.method === 'lump') return 'مقطوعية';
  if (l.method === 'daily') return `${fmtN(l.mult || 1)} عامل × ${fmtN(l.qty)} يوم`;
  if (l.method === 'meter' && (l.mult || 1) > 1) return `${fmtN(l.qty)} م × ${fmtN(l.mult)} خط`;
  if (l.method === 'cubic') return `${fmtN(l.qty)} م³`;
  return `${fmtN(l.qty)} ${l.unit || METHODS[l.method].unit}`;
}
function linePriceText(l) {
  if (isSupplyKind(l.kind) && l.install) return lineFromClient(l) ? `مصنعية ${money(l.install)}` : `${money(l.price)} + مصنعية ${money(l.install)}`;
  return money(l.price);
}
function lineConn(l) { return l.method === 'point' ? (l.conn || connOfName(l.name)) : ''; }
function lineIncText(l) {
  if (l.kind !== 'service' || !['point', 'bath', 'kitchen', 'lump', 'meter'].includes(l.method)) return '';
  if (l.incMat && l.incLabor) return 'شامل الخامات والمصنعية';
  if (l.incMat) return 'خامات فقط';
  return ['point', 'bath', 'kitchen'].includes(l.method) ? 'مصنعية فقط (بدون خامات)' : '';
}
function lineDetails(l) {
  const d = [];
  if (l.space) d.push(l.space);
  if (l.method === 'point' && lineConn(l) !== 'fixture') d.push(POINT_CONN[lineConn(l)]);
  const pipe = [l.pipeType, l.size, l.pressure].filter(Boolean).join(' ');
  if (pipe) d.push(pipe);
  if (l.method === 'cubic' && l.len && l.wid && l.dep) d.push(`${fmtN(l.len)} × ${fmtN(l.wid)} × ${fmtN(l.dep)} م`);
  if (l.waste) d.push(`شامل هالك ${fmtN(l.waste)}%`);
  if (l.visitType) d.push(l.visitType);
  const inc = lineIncText(l);
  if (inc) d.push(inc);
  if (isSupplyKind(l.kind)) d.push(l.source === 'client' ? 'من العميل' : 'توريد السباك');
  if (l.note) d.push(l.note);
  return d;
}

/* ---------------- منع تكرار احتساب البنود ---------------- */
function lineSpaceKey(l) { return String(l.space || '').trim(); }
function sameDevice(a, b) { return !a || !b || a === b || a.includes(b) || b.includes(a); }
// تنبيهات التكرار لبند مقابل بقية بنود المستند (لا تمنع الحفظ، لكن لازم المستخدم يوافق)
function lineDupWarnings(line, others) {
  const w = [];
  const sp = lineSpaceKey(line);
  const where = sp ? `في «${sp}»` : 'في نفس المستند';
  const same = others.filter(x => lineSpaceKey(x) === sp);
  // 1) نفس البند بنفس المكان والمقاس
  if (same.some(x => x.name.trim() === line.name.trim() && x.method === line.method && x.kind === line.kind && (x.size || '') === (line.size || '') && (x.pipeType || '') === (line.pipeType || '') && (x.note || '') === (line.note || '')))
    w.push(`البند «${line.name}» متسجل قبل كده ${where} — كده هيتحسب مرتين.`);
  // 2) تعريف النقطة: نقطة الجهاز شاملة التغذية والصرف
  if (line.method === 'point' && pointDef() === 'combined') {
    const c = lineConn(line), dev = pointDevice(line.name);
    same.filter(x => x.method === 'point').forEach(x => {
      const xc = lineConn(x), xd = pointDevice(x.name);
      if (c === 'fixture' && xc !== 'fixture' && sameDevice(dev, xd)) w.push(`حسب تعريفك للنقطة (نقطة الجهاز شاملة التغذية والصرف): «${x.name}» ممكن تكون محسوبة ضمن «${line.name}» ${where}.`);
      if (c !== 'fixture' && xc === 'fixture' && sameDevice(dev, xd)) w.push(`حسب تعريفك للنقطة (نقطة الجهاز شاملة التغذية والصرف): «${line.name}» ممكن تكون محسوبة ضمن «${x.name}» ${where}.`);
    });
  }
  // 3) حمام/مطبخ متسعر بالكامل ومعاه نقاط لنفس المكان
  const whole = l => l.method === 'bath' || l.method === 'kitchen';
  if (whole(line) && same.some(x => x.method === 'point')) w.push(`«${line.name}» متسعر بالكامل، وفيه نقاط متسعرة بالنقطة ${where} — اتأكد إن التوصيلات مش محسوبة مرتين.`);
  if (line.method === 'point' && same.some(whole)) w.push(`${sp ? '«' + sp + '»' : 'المستند'} فيه حمام/مطبخ متسعر بالكامل — «${line.name}» ممكن تكون محسوبة ضمنه.`);
  // 4) الخامات: سعر شامل الخامات + خامات متسعرة لوحدها
  const matLine = l => (l.kind === 'material' || l.kind === 'fitting') && l.source !== 'client' && lineSupplyTotal(l) > 0;
  const incLine = l => l.kind === 'service' && l.incMat && lineTotal(l) > 0;
  if (incLine(line) && same.some(matLine)) w.push(`سعر «${line.name}» شامل الخامات، وفيه مواسير/وصلات متسعرة لوحدها ${where} — الخامات ممكن تتحسب مرتين.`);
  if (matLine(line) && same.some(incLine)) w.push(`فيه بند سعره شامل الخامات ${where} — «${line.name}» ممكن تكون محسوبة ضمنه.`);
  return [...new Set(w)];
}
// كل تنبيهات المستند (كل بند مقابل اللي قبله فقط علشان التنبيه ما يتكررش)
function docWarnings(d) {
  const out = [];
  d.lines.forEach((l, i) => { lineDupWarnings(l, d.lines.slice(0, i)).forEach(m => { if (!out.includes(m)) out.push(m); }); });
  return out;
}

/* ---------------- حساب المستند ---------------- */
function paymentsOf(docId) { return DB.payments.filter(p => p.docId === docId); }
function workerEntryValue(e, w) {
  if (e.type === 'day') return round2(n0(e.days) * (n0(e.rate) || n0(w && w.dailyWage)));
  if (e.type === 'overtime') return round2(n0(e.amount) || n0(e.hours) * (n0(e.rate) || n0(w && w.hourRate)));
  return round2(n0(e.amount));
}
function computeDoc(d) {
  const t = { byKind: {}, bySection: {}, bySpace: {}, subtotal: 0, cost: 0, add: n0(d.addAmount), discount: n0(d.discountAmount), stagesDone: 0, stagesCount: 0, points: 0 };
  KIND_ORDER.forEach(k => { t.byKind[k] = 0; t.bySection[k] = 0; });
  d.lines.forEach(l => {
    const sup = lineSupplyTotal(l), ins = lineInstallTotal(l), v = round2(sup + ins);
    // الفصل: قيمة التوريد تروح لنوعها، ومصنعية التركيب تروح للمصنعية (ما بتتخلطش بالخامات)
    t.byKind[l.kind] = round2(t.byKind[l.kind] + sup);
    t.byKind.service = round2(t.byKind.service + ins);
    t.bySection[l.kind] = round2(t.bySection[l.kind] + v);
    const sp = lineSpaceKey(l);
    t.bySpace[sp] = round2((t.bySpace[sp] || 0) + v);
    t.subtotal += v;
    t.cost += lineCost(l);
    if (l.method === 'stage') { t.stagesCount++; if (l.done) t.stagesDone++; }
    if (l.method === 'point') t.points += lineBaseQty(l);
  });
  t.subtotal = round2(t.subtotal);
  t.cost = round2(t.cost);
  // إجمالي المقاولة = مجموع البنود + الإضافات - الخصومات
  t.total = round2(t.subtotal + t.add - t.discount);
  t.payments = paymentsOf(d.id).slice().sort((a, b) => (a.date || '').localeCompare(b.date || '') || a.createdAt - b.createdAt);
  t.paid = round2(t.payments.reduce((s, p) => s + n0(p.amount), 0));
  // المتبقي = إجمالي المقاولة - إجمالي المدفوعات
  t.remaining = round2(t.total - t.paid);
  // المصروفات المسجلة على المستند: مصروفات الخامات منفصلة عن الباقي
  t.matExpenses = 0; t.otherExpenses = 0;
  DB.expenses.forEach(x => { if (x.docId !== d.id) return; if (MATERIAL_EXP_CATS.includes(x.cat)) t.matExpenses += n0(x.amount); else t.otherExpenses += n0(x.amount); });
  t.matExpenses = round2(t.matExpenses); t.otherExpenses = round2(t.otherExpenses);
  t.expenses = round2(t.matExpenses + t.otherExpenses);
  // الخامات تتحسب مرة واحدة: الأكبر من (تكلفة الشراء في البنود) و(مصروفات الخامات المسجلة على المستند)
  t.materialsCost = Math.max(t.cost, t.matExpenses);
  t.labor = 0;
  DB.workers.forEach(w => w.entries.forEach(e => { if (e.docId === d.id && (e.type === 'day' || e.type === 'overtime')) t.labor += workerEntryValue(e, w); }));
  t.labor = round2(t.labor);
  t.totalCost = round2(t.materialsCost + t.otherExpenses + t.labor);
  t.profit = round2(t.total - t.totalCost);
  t.billable = docTypeInfo(d.docType).billable;
  return t;
}
function docTitle(d) { return d.clientName || 'بدون اسم'; }
function docSpaces(d) { return [...new Set(d.lines.map(lineSpaceKey).filter(Boolean))]; }

/* ---------------- المخزون: خصم تلقائي للخامات المربوطة ---------------- */
function invById(id) { return DB.inventory.find(i => i.id === id) || null; }
// يطابق المخصوم من المخزن مع المطلوب حالياً (يدعم التعديل والحذف بدون تكرار الخصم)
function reconcileStock(owner, desired, ref) {
  const applied = owner.stockApplied || {};
  const ids = new Set([...Object.keys(applied), ...Object.keys(desired)]);
  let changed = false;
  const next = {};
  ids.forEach(id => {
    const it = invById(id);
    if (!it) return;
    const want = round3(desired[id] || 0);
    const diff = round3(want - (applied[id] || 0));
    if (want) next[id] = want;
    if (!diff) return;
    it.qty = round3(it.qty - diff);
    it.moves.unshift({ id: uid('mv'), date: todayISO(), qty: -diff, reason: ref, ref: owner.id });
    if (it.moves.length > 300) it.moves.length = 300;
    changed = true;
  });
  owner.stockApplied = next;
  if (changed) saveCol('inventory');
}
function docStockDesired(d) {
  const want = {};
  if (!docTypeInfo(d.docType).billable) return want;
  d.lines.forEach(l => {
    if (!l.invId || l.source === 'client' || !invById(l.invId)) return;
    want[l.invId] = round3((want[l.invId] || 0) + lineBaseQty(l));
  });
  return want;
}
function saveDoc(d) {
  d.updatedAt = Date.now();
  reconcileStock(d, docStockDesired(d), `${docTypeInfo(d.docType).short} ${d.number}`);
  saveCol('docs');
}

/* ---------------- المستند الحالي ---------------- */
function getDoc(id) { return DB.docs.find(d => d.id === id) || null; }
function getCurrentDoc() {
  let d = getDoc(settings.currentDocId);
  if (!d && DB.docs.length) { d = DB.docs[0]; settings.currentDocId = d.id; }
  return d;
}
function createDoc(type, opts = {}) {
  const info = docTypeInfo(type);
  const pr = opts.projectId ? getProject(opts.projectId) : null;
  const c = opts.customerId ? getCustomer(opts.customerId) : (pr && pr.customerId ? getCustomer(pr.customerId) : null);
  const d = NORMALIZERS.docs({
    id: uid('d_'), number: nextNumber(info.prefix), docType: type, date: todayISO(),
    clientName: c ? c.name : '', clientPhone: c ? c.phone : '', clientAddress: pr && pr.address ? pr.address : (c ? c.address : ''), customerId: c ? c.id : null,
    projectId: pr ? pr.id : null, lines: opts.lines || [], visitId: opts.visitId || null,
    validUntil: info.billable ? '' : addDaysISO(todayISO(), 15)
  });
  DB.docs.unshift(d);
  settings.currentDocId = d.id;
  settings.lastDocType = type;
  saveSettings();
  saveDoc(d);
  return d;
}
function startNewDoc(type, opts = {}) {
  const go = () => {
    const d = createDoc(type, opts);
    openEditor(opts.step || 'info');
    renderEditor();
    showAppToast(`✔️ ${docTypeInfo(d.docType).label} ${d.number}`);
  };
  closeEverythingThen(go);
}
function openDoc(id, step) {
  if (!getDoc(id)) return;
  settings.currentDocId = id;
  saveSettings();
  closeEverythingThen(() => { openEditor(step || 'summary'); renderEditor(); });
}
let pendingDocOpts = null;
function pickDocType(customerId = null, projectId = null) {
  pendingDocOpts = { customerId, projectId };
  const box = document.getElementById('docTypeList');
  box.innerHTML = DOC_TYPE_ORDER.map(t => {
    const i = DOC_TYPES[t];
    return `<button type="button" class="mode-opt${settings.lastDocType === t ? ' on' : ''}" data-t="${t}">
      <span class="m-ic${i.billable ? '' : ' orange'}">${icon(i.icon)}</span>
      <span style="flex:1;min-width:0"><b>${i.label}</b><small>${i.billable ? 'تتسجل على حساب العميل' : 'للعرض على العميل — لا تُحسب مديونية لحد ما تحولها لفاتورة'}</small></span>
    </button>`;
  }).join('');
  box.onclick = e => {
    const b = e.target.closest('[data-t]');
    if (!b) return;
    const o = pendingDocOpts || {};
    pendingDocOpts = null;
    startNewDoc(b.dataset.t, o);
  };
  openOverlay('docType');
}

function deleteCurrentDoc() {
  const d = getCurrentDoc();
  if (!d) return;
  const pays = paymentsOf(d.id);
  showAppConfirm(`حذف ${docTypeInfo(d.docType).label} ${d.number} (${docTitle(d)}) نهائياً؟${pays.length ? ` وهتتحذف معاها ${pays.length} دفعة مسجلة عليها.` : ''}`, () => {
    reconcileStock(d, {}, `حذف ${d.number}`);
    DB.payments = DB.payments.filter(p => p.docId !== d.id);
    DB.expenses.forEach(x => { if (x.docId === d.id) x.docId = null; });
    DB.workers.forEach(w => w.entries.forEach(e => { if (e.docId === d.id) e.docId = null; }));
    DB.visits.forEach(v => { if (v.docId === d.id) v.docId = null; });
    DB.contracts.forEach(c => { c.docIds = c.docIds.filter(x => x !== d.id); });
    DB.docs = DB.docs.filter(x => x.id !== d.id);
    settings.currentDocId = DB.docs.length ? DB.docs[0].id : null;
    saveAll();
    closeEverythingThen(() => { refreshAll(); showAppToast('تم حذف المستند'); });
  });
}
function duplicateCurrentDoc() {
  const d = getCurrentDoc();
  if (!d) return;
  const copy = NORMALIZERS.docs(JSON.parse(JSON.stringify(d)));
  copy.id = uid('d_');
  copy.number = nextNumber(docTypeInfo(d.docType).prefix);
  copy.date = todayISO();
  copy.stockApplied = {};
  copy.lines.forEach(l => { l.id = uid('l'); l.done = false; });
  copy.createdAt = copy.updatedAt = Date.now();
  DB.docs.unshift(copy);
  settings.currentDocId = copy.id;
  saveSettings();
  saveDoc(copy);
  refreshAll();
  showAppToast(`✔️ تم عمل نسخة ${copy.number} (بدون المدفوعات)`);
}
// تحويل مقايسة/عرض سعر لفاتورة فعلية بنفس البنود
function convertCurrentDoc(type) {
  const d = getCurrentDoc();
  if (!d || !DOC_TYPES[type]) return;
  const from = d.number;
  d.docType = type;
  d.number = nextNumber(docTypeInfo(type).prefix);
  d.convertedFrom = from;
  d.validUntil = '';
  saveDoc(d);
  closeAllThen(() => { refreshAll(); showAppToast(`✔️ اتحولت لـ ${docTypeInfo(type).label} ${d.number}`); });
}
function setDocField(field, value) {
  const d = getCurrentDoc();
  if (!d) return;
  if (['addAmount', 'discountAmount', 'warrantyMonths'].includes(field)) d[field] = pos(parseFloat(value) || 0);
  else d[field] = value;
  if (field === 'docType') {
    if (!DOC_TYPES[value]) return;
    if (!docTypeInfo(value).billable && !d.validUntil) d.validUntil = addDaysISO(todayISO(), 15);
    saveDoc(d); renderEditor(); return;
  }
  saveDoc(d);
  if (['clientName'].includes(field)) renderClientSuggestions();
  renderEditorSummaryOnly();
}

/* ---------------- ربط المستند بالعميل والمشروع ---------------- */
function linkDocToCustomer(d, c, fill = true) {
  d.customerId = c.id;
  if (fill) {
    d.clientName = c.name;
    if (c.phone) d.clientPhone = c.phone;
    if (c.address) d.clientAddress = c.address;
  }
  const pr = d.projectId ? getProject(d.projectId) : null;
  if (!pr || pr.customerId !== c.id) d.projectId = null;
  saveDoc(d);
  syncPaymentsToCustomers();
  saveCol('payments');
  hideClientSuggestions();
  refreshAll();
  showAppToast(`✔️ تم ربط المستند بالعميل "${c.name}"`);
}
function unlinkCurrentDoc() {
  const d = getCurrentDoc();
  if (!d) return;
  d.customerId = null;
  d.projectId = null;
  saveDoc(d);
  syncPaymentsToCustomers();
  saveCol('payments');
  refreshAll();
  showAppToast('تم فك الربط بالعميل');
}
function saveClientAsCustomer() {
  const d = getCurrentDoc();
  const name = (d.clientName || '').trim();
  if (!name) { showAppToast('⚠️ اكتب اسم العميل أولاً'); return; }
  let c = DB.customers.find(x => x.name.trim() === name);
  if (!c) {
    c = NORMALIZERS.customers({ id: uid('c_'), name, phone: d.clientPhone, address: d.clientAddress });
    DB.customers.unshift(c);
    saveCol('customers');
  }
  linkDocToCustomer(d, c, false);
}
// كل دفعة مربوطة بفاتورة تتبع عميل الفاتورة
function syncPaymentsToCustomers() {
  const ids = new Set(DB.customers.map(c => c.id));
  const pids = new Set(DB.projects.map(p => p.id));
  DB.payments.forEach(p => {
    if (p.docId) { const d = getDoc(p.docId); if (d) p.customerId = d.customerId || null; }
    if (p.customerId && !ids.has(p.customerId)) p.customerId = null;
  });
  DB.docs.forEach(d => {
    if (d.customerId && !ids.has(d.customerId)) d.customerId = null;
    if (d.projectId && !pids.has(d.projectId)) d.projectId = null;
  });
}
function hideClientSuggestions() { const b = document.getElementById('clientSuggest'); if (b) b.classList.add('hidden'); }
function renderClientSuggestions() {
  const d = getCurrentDoc();
  const input = document.getElementById('clientName');
  const box = document.getElementById('clientSuggest');
  if (!d || !input || d.customerId || document.activeElement !== input) { hideClientSuggestions(); return; }
  const q = input.value.trim();
  const matches = DB.customers.filter(c => !q || c.name.includes(q) || c.phone.includes(q)).slice(0, 5);
  let html = matches.map(c => {
    const st = customerStats(c);
    return `<button type="button" data-id="${esc(c.id)}"><span class="s-av">${initialOf(c.name)}</span><span>${esc(c.name)}<small>${c.phone ? esc(c.phone) + ' · ' : ''}${st.projects.length} مشروع · متبقي ${money(Math.max(0, st.remaining))}</small></span></button>`;
  }).join('');
  if (q && !DB.customers.some(c => c.name.trim() === q)) html += `<button type="button" data-new="1"><span class="s-av add">${icon('plus')}</span><span>حفظ «${esc(q)}» كعميل جديد<small>لتسجيل مشروعاته ودفعاته وربطها بالمستند</small></span></button>`;
  if (!html) { hideClientSuggestions(); return; }
  box.innerHTML = html;
  box.classList.remove('hidden');
}

/* =========================================================
   صفحة عمل المستند (3 خطوات)
   ========================================================= */
function renderEditor() {
  const d = getCurrentDoc();
  if (!d) return;
  const info = docTypeInfo(d.docType);
  document.getElementById('headerSub').textContent = `${info.short} ${d.number} · ${docTitle(d)}`;
  if (currentView === 'info') renderEditorInfo(d);
  if (currentView === 'lines') renderEditorLines(d);
  if (currentView === 'summary') renderEditorSummary(d);
  renderEditorBar();
}
function renderEditorSummaryOnly() {
  const d = getCurrentDoc();
  if (!d) return;
  document.getElementById('headerSub').textContent = `${docTypeInfo(d.docType).short} ${d.number} · ${docTitle(d)}`;
  if (currentView === 'summary') renderEditorSummary(d, true);
  renderEditorBar();
}
function renderEditorBar() {
  if (!EDITOR_VIEWS.includes(currentView)) return;
  const d = getCurrentDoc();
  if (!d) return;
  const t = computeDoc(d);
  const lbl = document.getElementById('ebLabel'), v = document.getElementById('ebValue'), sub = document.getElementById('ebSub'), next = document.getElementById('ebNextText');
  if (currentView === 'summary' && t.billable) { lbl.textContent = 'المتبقي على العميل'; v.textContent = money(t.remaining); }
  else { lbl.textContent = t.billable ? 'إجمالي الفاتورة' : 'إجمالي المقايسة'; v.textContent = money(t.total); }
  sub.textContent = `${d.lines.length} بند · المدفوع ${money(t.paid)}`;
  next.textContent = currentView === 'info' ? 'التالي: البنود' : currentView === 'lines' ? 'التالي: الحساب' : 'تم ✓ حفظ';
}
function editorNext() {
  if (currentView === 'info') showView('lines');
  else if (currentView === 'lines') showView('summary');
  else { const d = getCurrentDoc(); if (d) saveDoc(d); exitEditor(); showAppToast('✔️ تم حفظ المستند'); }
}

/* ---------- الخطوة 1: البيانات ---------- */
function renderEditorInfo(d) {
  const info = docTypeInfo(d.docType);
  const c = d.customerId ? getCustomer(d.customerId) : null;
  const projs = c ? projectsOf(c.id) : [];
  const box = document.getElementById('infoBody');
  const typeOpts = DOC_TYPE_ORDER.map(t => opt(t, DOC_TYPES[t].label, d.docType)).join('');
  let projHtml;
  if (c) {
    projHtml = projs.length
      ? `<div class="unit-chips" id="docProjChips">${projs.map(p => `<button type="button" class="chip${d.projectId === p.id ? ' on' : ''}" data-proj="${esc(p.id)}">${esc(projectLabel(p))}</button>`).join('')}</div>`
      : `<p class="hint" style="margin:0 0 8px">العميل ده ملوش مشروعات مسجلة لسه.</p>`;
    projHtml += `<div class="btn-row" style="margin-top:10px"><button type="button" class="btn btn-soft btn-sm" style="width:100%" onclick="openProjectForm(null, '${esc(c.id)}', true)">${icon('plus')} مشروع جديد للعميل</button>
      ${d.projectId && getProject(d.projectId) ? `<button type="button" class="btn btn-ghost btn-sm" style="width:100%" onclick="openPage('project','${esc(d.projectId)}')">${icon('folder')} فتح المشروع</button>` : ''}</div>`;
  } else {
    projHtml = `<div class="field" style="margin-bottom:0"><label for="docSiteText">وصف المشروع / موقع العمل</label><input type="text" id="docSiteText" value="${esc(d.siteText || '')}" placeholder="مثال: شقة 120 م - 2 حمام ومطبخ" oninput="setDocField('siteText', this.value)"></div>
      <p class="hint">اربط المستند بعميل علشان تختار من مشروعاته، وتتجمع كل مقايسات ومصروفات ودفعات المشروع في مكان واحد.</p>`;
  }
  const workers = DB.workers.filter(w => w.active || d.workerIds.includes(w.id));
  box.innerHTML = `
    <div class="card">
      <div class="card-title"><div class="t-ic orange">${icon(info.icon)}</div><h2>نوع المستند</h2><span class="tag">${esc(d.number)}</span></div>
      <div class="field"><label for="docType">النوع</label><select id="docType" onchange="setDocField('docType', this.value)">${typeOpts}</select></div>
      <div class="row-2 stack-sm">
        <div class="field"><label for="docNumber">رقم المستند</label><input type="text" id="docNumber" dir="ltr" style="text-align:right" value="${esc(d.number)}" oninput="setDocField('number', this.value)"></div>
        <div class="field"><label for="docDate">التاريخ</label><input type="date" id="docDate" value="${esc(d.date)}" oninput="setDocField('date', this.value || todayISO())"></div>
      </div>
      ${info.billable ? '' : `<div class="field" style="margin-bottom:0"><label for="docValid">العرض سارٍ حتى</label><input type="date" id="docValid" value="${esc(d.validUntil)}" oninput="setDocField('validUntil', this.value)"></div>`}
      ${d.convertedFrom ? `<div class="hint">محولة من ${esc(d.convertedFrom)}</div>` : ''}
    </div>

    <div class="card">
      <div class="card-title"><div class="t-ic">${icon('user')}</div><h2>بيانات العميل</h2></div>
      <div class="field"><label for="clientName">اسم العميل</label><input type="text" id="clientName" autocomplete="off" value="${esc(d.clientName)}" placeholder="اكتب الاسم وسيقترح التطبيق من العملاء" oninput="setDocField('clientName', this.value)" onfocus="renderClientSuggestions()" onblur="setTimeout(hideClientSuggestions, 250)">
        <div class="suggest hidden" id="clientSuggest"></div></div>
      <div class="row-2 stack-sm">
        <div class="field"><label for="clientPhone">رقم الهاتف</label><input type="text" inputmode="tel" dir="ltr" style="text-align:right" id="clientPhone" value="${esc(d.clientPhone)}" placeholder="01xxxxxxxxx" oninput="setDocField('clientPhone', this.value)"></div>
        <div class="field"><label for="clientAddress">عنوان العمل</label><input type="text" id="clientAddress" value="${esc(d.clientAddress)}" placeholder="عنوان الشغل" oninput="setDocField('clientAddress', this.value)"></div>
      </div>
      <div id="clientLinkBox">${c ? `
        <div class="link-box"><span class="l-ic">${icon('link')}</span>
          <div class="l-txt"><b>مرتبط بالعميل: ${esc(c.name)}</b><span>الدفعات بتتسجل في حسابه تلقائياً</span></div>
          <button type="button" class="btn btn-soft btn-sm" onclick="openPage('customer','${esc(c.id)}')">فتح</button>
          <button type="button" class="btn btn-ghost btn-sm" onclick="unlinkCurrentDoc()">فك</button></div>`
        : (d.clientName.trim() ? `<button type="button" class="btn btn-soft btn-sm" style="margin-top:4px;width:100%" onclick="saveClientAsCustomer()">${icon('book')} ${DB.customers.some(x => x.name.trim() === d.clientName.trim()) ? 'ربط المستند بهذا العميل' : 'حفظ العميل وربط المستند'}</button>` : '')}</div>
    </div>

    <div class="card">
      <div class="card-title"><div class="t-ic">${icon('folder')}</div><h2>المشروع</h2></div>
      ${projHtml}
    </div>

    <div class="card">
      <div class="card-title"><div class="t-ic orange">${icon('briefcase')}</div><h2>نطاق العمل وشروط الاتفاق</h2><span class="tag">للمقاولات</span></div>
      <div class="field"><label for="docScope">نطاق العمل</label><textarea id="docScope" placeholder="مثال: تأسيس سباكة شقة 3 حمامات ومطبخ تغذية وصرف" oninput="setDocField('scope', this.value)">${esc(d.scope)}</textarea></div>
      <div class="field"><label for="docIncl">الأعمال المشمولة</label><textarea id="docIncl" placeholder="مثال: المصنعية والاختبارات وتركيب الأدوات الصحية" oninput="setDocField('included', this.value)">${esc(d.included)}</textarea></div>
      <div class="field"><label for="docExcl">الأعمال غير المشمولة</label><textarea id="docExcl" placeholder="مثال: توريد الأدوات الصحية، التكسير، أعمال المحارة" oninput="setDocField('excluded', this.value)">${esc(d.excluded)}</textarea></div>
      <div class="row-2">
        <div class="field"><label for="docStart">تاريخ البداية</label><input type="date" id="docStart" value="${esc(d.startDate)}" oninput="setDocField('startDate', this.value)"></div>
        <div class="field"><label for="docEnd">تاريخ التسليم</label><input type="date" id="docEnd" value="${esc(d.endDate)}" oninput="setDocField('endDate', this.value)"></div>
      </div>
      <div class="field" style="margin-bottom:0"><label for="docTerms">شروط الاتفاق والدفع</label><textarea id="docTerms" placeholder="مثال: 30% عربون، 40% بعد التأسيس، 30% عند التسليم" oninput="setDocField('terms', this.value)">${esc(d.terms)}</textarea></div>
    </div>

    <div class="card">
      <div class="card-title"><div class="t-ic orange">${icon('hard')}</div><h2>السباكين والعمال المنفذين</h2></div>
      ${workers.length ? `<div class="unit-chips" id="docWorkerChips">${workers.map(w => `<button type="button" class="chip${d.workerIds.includes(w.id) ? ' on' : ''}" data-w="${esc(w.id)}">${esc(w.name)}</button>`).join('')}</div>`
        : `<p class="hint" style="margin:0">ضيف السباكين والمساعدين من «المزيد ← العمال والفريق» علشان تختارهم هنا.</p>`}
    </div>

    <div class="card">
      <div class="card-title"><div class="t-ic">${icon('shield')}</div><h2>الضمان والملاحظات</h2></div>
      <div class="row-2">
        <div class="field"><label for="docWarranty">مدة الضمان (شهور)</label><input type="number" inputmode="decimal" min="0" step="any" id="docWarranty" value="${d.warrantyMonths || ''}" placeholder="0" oninput="setDocField('warrantyMonths', this.value)"></div>
        <div class="field"><label>ينتهي في</label><input type="text" disabled value="${d.warrantyMonths ? esc(fmtDate(addMonthsISO(d.date, d.warrantyMonths))) : '—'}"></div>
      </div>
      <div class="field"><label for="docWTerms">شروط الضمان</label><input type="text" id="docWTerms" value="${esc(d.warrantyTerms)}" placeholder="مثال: الضمان على المصنعية والتسريبات ولا يشمل سوء الاستخدام" oninput="setDocField('warrantyTerms', this.value)"></div>
      <div class="field" style="margin-bottom:0"><label for="docNotes">ملاحظات تظهر في المستند</label><textarea id="docNotes" placeholder="اختياري" oninput="setDocField('notes', this.value)">${esc(d.notes)}</textarea></div>
    </div>`;
  const sb = document.getElementById('clientSuggest');
  sb.addEventListener('pointerdown', e => e.preventDefault());
  sb.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.id) linkDocToCustomer(getCurrentDoc(), getCustomer(b.dataset.id), true);
    else saveClientAsCustomer();
  });
  const pc = document.getElementById('docProjChips');
  if (pc) pc.onclick = e => {
    const b = e.target.closest('[data-proj]');
    if (!b) return;
    const doc = getCurrentDoc();
    const id = b.dataset.proj;
    doc.projectId = doc.projectId === id ? null : id;
    const pr = getProject(doc.projectId);
    if (pr && pr.address && !doc.clientAddress) doc.clientAddress = pr.address;
    saveDoc(doc);
    renderEditor();
  };
  const wc = document.getElementById('docWorkerChips');
  if (wc) wc.onclick = e => {
    const b = e.target.closest('[data-w]');
    if (!b) return;
    const doc = getCurrentDoc();
    const id = b.dataset.w;
    doc.workerIds = doc.workerIds.includes(id) ? doc.workerIds.filter(x => x !== id) : doc.workerIds.concat(id);
    saveDoc(doc);
    renderEditor();
  };
}

/* ---------- الخطوة 2: البنود ---------- */
function lineCardHTML(l, idx) {
  const det = lineDetails(l);
  const total = lineTotal(l);
  const stage = l.method === 'stage';
  const clientOnly = lineFromClient(l) && !total;
  return `
    <div class="item-card" data-line="${esc(l.id)}">
      ${stage ? `<button type="button" class="stage-check${l.done ? ' on' : ''}" data-done="${esc(l.id)}" aria-label="تم تنفيذ المرحلة">${icon('check')}</button>` : `<span class="room-num">${idx + 1}</span>`}
      <div class="i-info"><div class="i-name">${esc(l.name)}</div>
        <div class="i-meta">${l.method === 'lump' ? esc(METHODS[l.method].label) : `${esc(lineQtyText(l))} × ${esc(linePriceText(l))}`}${det.length ? ' · ' + det.map(esc).join(' · ') : ''}</div></div>
      <div class="i-amt">${clientOnly ? '—' : fmt(total)}<small>${clientOnly ? 'من العميل' : CUR}</small></div>
    </div>`;
}
function setLinesGroup(g) { settings.linesGroup = g === 'space' ? 'space' : 'kind'; saveSettings(); renderEditor(); }
function renderEditorLines(d) {
  const box = document.getElementById('linesBody');
  const t = computeDoc(d);
  const cats = WORK_CAT_ORDER.map(k => `<button type="button" class="chip" data-cat="${k}">${esc(WORK_CATS[k].name)}</button>`).join('');
  const warns = docWarnings(d);
  const bySpace = settings.linesGroup === 'space';
  let html = `
    <div class="card">
      <div class="card-title"><div class="t-ic orange">${icon('layers')}</div><h2>إضافة بند من تصنيف</h2></div>
      <div class="chips" style="flex-wrap:wrap;overflow:visible" id="lineCatChips">${cats}</div>
      <div class="create-row" style="margin-top:4px">
        <button type="button" class="btn btn-soft btn-sm" style="width:100%" onclick="pickInventoryForDoc()">${icon('box')} من المخزن</button>
        <button type="button" class="btn btn-soft btn-sm" style="width:100%" onclick="pickPriceListForDoc()">${icon('tag')} من قائمة الأسعار</button>
      </div>
      <div class="create-row" style="margin-top:8px">
        <button type="button" class="btn btn-ghost btn-sm" style="width:100%" onclick="addWorkStages()">${icon('list')} مراحل العمل</button>
        <button type="button" class="btn btn-ghost btn-sm" style="width:100%" onclick="openPage('calc')">${icon('calc')} الحاسبات</button>
      </div>
      <div class="link-box" style="margin-top:10px"><span class="l-ic">${icon('droplet')}</span>
        <div class="l-txt"><b>تعريف النقطة: ${esc(POINT_DEFS[pointDef()].label)}</b><span>${pointDef() === 'combined' ? 'تغذية بارد وساخن + صرف في نقطة واحدة' : 'كل توصيلة نقطة مستقلة'}</span></div>
        <button type="button" class="btn btn-soft btn-sm" onclick="openPage('pointsCfg')">تغيير</button></div>
    </div>`;
  if (warns.length) html += `<div class="warn-box" id="dupWarnBox" style="margin:0 0 12px"><b>⚠️ تنبيه تكرار (${warns.length}):</b><br>${warns.map(esc).join('<br>')}</div>`;
  if (!d.lines.length) {
    html += `<div class="card empty"><div class="big">${icon('list')}</div><p>لم تضف أي بند بعد.<br>اختار تصنيف من فوق: نقاط، حمامات ومطابخ، مواسير، أدوات صحية، صيانة...</p><button type="button" class="btn btn-accent" onclick="openLineForm(null)">${icon('plus')} إضافة أول بند</button></div>`;
  } else {
    html += `<div class="segmented" style="margin-bottom:10px" id="linesGroupSeg"><button type="button" data-g="kind" class="${bySpace ? '' : 'on'}">حسب نوع البند</button><button type="button" data-g="space" class="${bySpace ? 'on' : ''}">حسب المكان</button></div>`;
    let idx = 0;
    if (bySpace) {
      const spaces = docSpaces(d);
      if (d.lines.some(l => !lineSpaceKey(l))) spaces.push('');
      spaces.forEach(sp => {
        const ls = d.lines.filter(l => lineSpaceKey(l) === sp);
        html += `<div class="section-head"><h3>${esc(sp || 'بنود عامة (بدون مكان)')}<span class="count">${ls.length}</span></h3><strong style="color:var(--primary);white-space:nowrap">${money(t.bySpace[sp] || 0)}</strong></div>`;
        html += ls.map(l => lineCardHTML(l, idx++)).join('');
      });
    } else {
      KIND_ORDER.forEach(k => {
        const ls = d.lines.filter(l => l.kind === k);
        if (!ls.length) return;
        html += `<div class="section-head"><h3>${esc(LINE_KINDS[k])}<span class="count">${ls.length}</span></h3><strong style="color:var(--primary);white-space:nowrap">${money(t.bySection[k])}</strong></div>`;
        html += ls.map(l => lineCardHTML(l, idx++)).join('');
      });
    }
    if (t.stagesCount) html += `<div class="note" style="margin-bottom:12px"><strong>مراحل العمل:</strong> اتنفذ ${t.stagesDone} من ${t.stagesCount}<div class="progress"><i style="width:${Math.round(t.stagesDone / t.stagesCount * 100)}%"></i></div></div>`;
    html += `<div class="sum-total" style="margin-bottom:14px"><span>مجموع البنود (${d.lines.length})${t.points ? ` · ${fmtN(t.points)} نقطة` : ''}</span><strong>${money(t.subtotal)}</strong></div>`;
    html += `<button type="button" class="btn btn-accent" onclick="openLineForm(null)">${icon('plus')} إضافة بند</button>`;
  }
  box.innerHTML = html;
  document.getElementById('lineCatChips').onclick = e => { const b = e.target.closest('[data-cat]'); if (b) openLineForm(null, { cat: b.dataset.cat }); };
  const seg = document.getElementById('linesGroupSeg');
  if (seg) seg.onclick = e => { const b = e.target.closest('[data-g]'); if (b) setLinesGroup(b.dataset.g); };
  box.querySelectorAll('.item-card[data-line]').forEach(el => {
    el.onclick = e => {
      const done = e.target.closest('[data-done]');
      if (done) { e.stopPropagation(); toggleStageDone(done.dataset.done); return; }
      openLineForm(el.dataset.line);
    };
  });
}
function toggleStageDone(lineId) {
  const d = getCurrentDoc();
  const l = d && d.lines.find(x => x.id === lineId);
  if (!l) return;
  l.done = !l.done;
  saveDoc(d);
  renderEditor();
}
function addWorkStages() {
  const d = getCurrentDoc();
  if (!d) return;
  const have = new Set(d.lines.filter(l => l.method === 'stage').map(l => l.name));
  const add = stagesList().filter(s => !have.has(s));
  if (!add.length) { showAppToast('مراحل العمل موجودة بالفعل — تقدر تعدّل القائمة من «المزيد ← مراحل العمل»'); return; }
  add.forEach(s => d.lines.push(normalizeLine({ id: uid('l'), cat: 'residential', kind: 'service', name: s, method: 'stage', qty: 1, price: 0 })));
  saveDoc(d);
  renderEditor();
  showAppToast(`✔️ اتضافت ${add.length} مرحلة — اكتب سعر كل مرحلة (أو سيبها صفر لو الحساب مقاولة)`);
}

/* ---------- نموذج البند ---------- */
let lf = null; // البند تحت التعديل
function priceListItems() { const l = activePriceList(); return l ? l.items : []; }
function priceFor(name) { const it = priceListItems().find(i => i.name.trim() === String(name || '').trim()); return it || null; }
function openLineForm(lineId, preset = {}) {
  const d = getCurrentDoc();
  if (!d) return;
  const ex = lineId ? d.lines.find(l => l.id === lineId) : null;
  lf = ex ? JSON.parse(JSON.stringify(ex)) : normalizeLine(Object.assign({ id: uid('l'), cat: preset.cat || DOC_DEFAULT_CAT[d.docType] || 'points', kind: 'service', name: '', method: 'point', qty: 1 }, preset));
  if (!ex && !preset.method) { lf.method = (catItems(lf.cat)[0] || [])[1] || 'piece'; lf.kind = (catItems(lf.cat)[0] || [])[2] || 'service'; lf.unit = METHODS[lf.method].unit; }
  lf._savePrice = false;
  openForm({
    title: ex ? 'تعديل البند' : 'إضافة بند',
    html: '<div id="lfBody"></div>',
    saveText: ex ? 'تحديث البند' : 'حفظ البند',
    after: () => renderLineForm(),
    onSave: () => saveLineForm(!!ex, false),
    onDelete: ex ? () => showAppConfirm('حذف هذا البند من المستند؟', () => {
      const doc = getCurrentDoc();
      doc.lines = doc.lines.filter(l => l.id !== lineId);
      saveDoc(doc); closeOverlay(); refreshAll();
    }) : null,
    deleteText: 'حذف البند'
  });
}
function renderLineForm() {
  const body = document.getElementById('lfBody');
  if (!body || !lf) return;
  const d = getCurrentDoc();
  const m = METHODS[lf.method];
  const items = catItems(lf.cat);
  const supply = isSupplyKind(lf.kind);
  const pl = priceFor(lf.name);
  const isPoint = lf.method === 'point';
  const pipeLike = lf.method === 'meter' || isPoint || lf.cat === 'pipes' || lf.cat === 'fittings' || lf.kind === 'material' || lf.kind === 'fitting';
  const incOn = lf.kind === 'service' && ['point', 'bath', 'kitchen', 'lump', 'meter'].includes(lf.method);
  const cubic = lf.method === 'cubic';
  const dimsOn = cubic && lf.len && lf.wid && lf.dep;
  const numF = (id, label, v, ph = '0') => `<div class="field"><label for="${id}">${label}</label><input type="number" inputmode="decimal" min="0" step="any" id="${id}" value="${v || ''}" placeholder="${ph}"></div>`;
  const spaces = [...new Set([...(d ? docSpaces(d) : []), ...SPACE_TYPES])];
  const sl = document.getElementById('spaceList');
  if (sl) sl.innerHTML = spaces.map(s => `<option value="${esc(s)}">`).join('');
  body.innerHTML = `
    <div class="field"><label>التصنيف</label><div class="chips" id="lfCats">${WORK_CAT_ORDER.map(k => `<button type="button" class="chip${lf.cat === k ? ' on' : ''}" data-cat="${k}">${esc(WORK_CATS[k].name)}</button>`).join('')}</div></div>
    ${items.length ? `<div class="chips" id="lfItems" style="flex-wrap:wrap;overflow:visible">${items.map((it, i) => `<button type="button" class="chip${lf.name === it[0] ? ' on' : ''}" data-i="${i}">${esc(it[0])}</button>`).join('')}</div>` : ''}
    ${lf.cat === 'points' ? `<button type="button" class="link-btn" style="margin:-4px 0 10px" onclick="openPage('pointsCfg')">تعديل أسماء النقاط وتعريف النقطة</button>` : ''}
    <div class="field"><label for="lfName">اسم البند</label><input type="text" id="lfName" value="${esc(lf.name)}" placeholder="اكتب اسم البند أو اختار من فوق"></div>
    <div id="lfPl">${pl ? `<button type="button" class="chip" id="lfUsePl" style="margin:-4px 0 12px">سعر القائمة: ${money(pl.price)} — استخدمه</button>` : ''}</div>
    <div class="row-2">
      <div class="field"><label for="lfKind">نوع البند</label><select id="lfKind">${KIND_ORDER.map(k => opt(k, LINE_KINDS[k], lf.kind)).join('')}</select></div>
      <div class="field"><label for="lfMethod">طريقة الحساب</label><select id="lfMethod">${METHOD_ORDER.map(k => opt(k, METHODS[k].label, lf.method)).join('')}</select></div>
    </div>
    <div class="field"><label for="lfSpace">المكان <span class="hint">(حمام / مطبخ / دور... اختياري)</span></label><input type="text" id="lfSpace" list="spaceList" value="${esc(lf.space)}" placeholder="مثال: حمام رئيسي"></div>
    ${cubic ? `<div class="field"><label>أبعاد الحفر (متر)</label><div class="row-2" style="grid-template-columns:repeat(3,minmax(0,1fr))">
        <input type="number" inputmode="decimal" min="0" step="any" id="lfLen" value="${lf.len || ''}" placeholder="الطول" aria-label="الطول">
        <input type="number" inputmode="decimal" min="0" step="any" id="lfWid" value="${lf.wid || ''}" placeholder="العرض" aria-label="العرض">
        <input type="number" inputmode="decimal" min="0" step="any" id="lfDep" value="${lf.dep || ''}" placeholder="العمق" aria-label="العمق"></div>
      <div class="hint">الطول × العرض × العمق = الحجم بالمتر المكعب (أو اكتب الحجم مباشرة تحت).</div></div>` : ''}
    ${m.qty ? `<div class="row-2">
      <div class="field"><label for="lfQty">${m.qty}</label><div class="stepper"><button type="button" data-step="1">+</button><input type="number" inputmode="decimal" min="0" step="any" id="lfQty" value="${lf.qty || ''}" placeholder="1"${dimsOn ? ' readonly' : ''}><button type="button" data-step="-1">−</button></div></div>
      ${m.mult ? `<div class="field"><label for="lfMult">${m.mult}</label><div class="stepper"><button type="button" data-step="1">+</button><input type="number" inputmode="decimal" min="0" step="any" id="lfMult" value="${lf.mult || 1}"><button type="button" data-step="-1">−</button></div></div>`
        : `<div class="field"><label for="lfUnit">الوحدة</label><input type="text" id="lfUnit" value="${esc(lf.unit)}"></div>`}
    </div>` : ''}
    <div class="row-2">
      <div class="field"><label for="lfPrice">${supply ? 'سعر البيع للوحدة' : m.price} (<span class="cur">${CUR}</span>)</label><input type="number" inputmode="decimal" min="0" step="any" id="lfPrice" value="${lf.price || ''}" placeholder="0"></div>
      <div class="field"><label for="lfCost">${supply ? 'سعر الشراء للوحدة' : 'تكلفة عليك'} <span class="hint">(للربح)</span></label><input type="number" inputmode="decimal" min="0" step="any" id="lfCost" value="${lf.cost || ''}" placeholder="0"></div>
    </div>
    ${supply ? `${numF('lfInstall', `مصنعية التركيب للوحدة (<span class="cur">${CUR}</span>) <span class="hint">تتحسب منفصلة عن ثمن الخامة</span>`, lf.install)}
      <div class="field"><label>مين بيورّد؟</label><div class="segmented" style="margin:0" id="lfSource"><button type="button" class="${lf.source === 'tech' ? 'on' : ''}" data-s="tech">توريد السباك (بتتحسب)</button><button type="button" class="${lf.source === 'client' ? 'on' : ''}" data-s="client">خامات العميل</button></div>
      ${lf.source === 'client' ? '<div class="hint">خامات العميل ثمنها ما بيتحسبش — بتتحسب مصنعية التركيب بس.</div>' : ''}</div>` : ''}
    ${isPoint ? `<div class="field"><label for="lfConn">نوع الخدمة</label><select id="lfConn">${Object.keys(POINT_CONN).map(k => opt(k, POINT_CONN[k], lineConn(lf))).join('')}</select>
      <div class="hint">${esc(POINT_DEFS[pointDef()].desc)}</div></div>` : ''}
    ${pipeLike ? `<div class="row-2">
      <div class="field"><label for="lfPipe">نوع المواسير</label><select id="lfPipe">${opt('', '— غير محدد —', lf.pipeType)}${PIPE_TYPES.map(p => opt(p, p, lf.pipeType)).join('')}</select></div>
      <div class="field"><label for="lfSize">المقاس / القطر</label><input type="text" id="lfSize" list="pipeSizes" value="${esc(lf.size)}" placeholder='مثال: 20 مم أو 3/4"'></div>
    </div>` : ''}
    ${lf.method === 'meter' ? `<div class="row-2">
      <div class="field"><label for="lfPress">الضغط <span class="hint">(اختياري)</span></label><input type="text" id="lfPress" list="pressList" value="${esc(lf.pressure)}" placeholder="مثال: PN20"></div>
      ${numF('lfWaste', 'نسبة الهالك % <span class="hint">(للبيان)</span>', lf.waste)}
    </div>` : ''}
    ${incOn ? `<label class="switch" style="padding-top:0;margin-bottom:8px"><span>السعر يشمل الخامات</span><input type="checkbox" id="lfIncMat"${lf.incMat ? ' checked' : ''}></label>
      <label class="switch" style="padding-top:0;margin-bottom:12px"><span>السعر يشمل المصنعية</span><input type="checkbox" id="lfIncLabor"${lf.incLabor ? ' checked' : ''}></label>` : ''}
    ${lf.method === 'visit' ? `<div class="field"><label for="lfVisit">نوع الزيارة</label><select id="lfVisit">${[''].concat(VISIT_TYPES).map(v => opt(v, v || '— اختار —', lf.visitType)).join('')}</select>
      <div class="hint">رسوم الزيارة بتتحسب منفصلة عن مصنعية الإصلاح وقطع الغيار.</div></div>` : ''}
    <div class="field"><label for="lfNote">ملاحظة تظهر تحت البند <span class="hint">(اختياري)</span></label><input type="text" id="lfNote" value="${esc(lf.note)}" placeholder="مثال: ماسورة ألماني / شامل الاختبار"></div>
    <label class="switch" style="padding-top:0;margin-bottom:12px"><span>حفظ السعر ده في قائمة الأسعار «${esc((activePriceList() || {}).name || 'الأساسية')}»</span><input type="checkbox" id="lfSavePl"${lf._savePrice ? ' checked' : ''}></label>
    ${lf.invId && invById(lf.invId) ? `<div class="ok-box" style="margin:-4px 0 12px">مربوط بالمخزن: <b>${esc(invById(lf.invId).name)}</b> — الرصيد ${fmtN(invById(lf.invId).qty)} ${esc(invById(lf.invId).unit)} (بيتخصم تلقائياً في الفواتير)</div>` : ''}
    <div id="lfWarn"></div>
    <div class="live-total"><span id="lfLiveTxt"></span><strong id="lfLive"></strong></div>`;
  bindLineForm(body);
  updateLineLive();
}
function readLineInputs() {
  const g = id => document.getElementById(id);
  const numv = id => pos(parseFloat(g(id).value) || 0);
  if (g('lfName')) lf.name = g('lfName').value;
  if (g('lfSpace')) lf.space = g('lfSpace').value.trim();
  if (g('lfLen')) { lf.len = numv('lfLen'); lf.wid = numv('lfWid'); lf.dep = numv('lfDep'); }
  if (g('lfQty')) lf.qty = numv('lfQty');
  if (lf.method === 'cubic' && lf.len && lf.wid && lf.dep) lf.qty = round3(lf.len * lf.wid * lf.dep);
  if (g('lfMult')) lf.mult = numv('lfMult') || 1;
  if (g('lfUnit')) lf.unit = g('lfUnit').value.trim();
  if (g('lfPrice')) lf.price = numv('lfPrice');
  if (g('lfCost')) lf.cost = numv('lfCost');
  if (g('lfInstall')) lf.install = numv('lfInstall');
  if (g('lfConn')) lf.conn = g('lfConn').value;
  if (g('lfPipe')) lf.pipeType = g('lfPipe').value;
  if (g('lfSize')) lf.size = g('lfSize').value.trim();
  if (g('lfPress')) lf.pressure = g('lfPress').value.trim();
  if (g('lfWaste')) lf.waste = numv('lfWaste');
  if (g('lfIncMat')) lf.incMat = g('lfIncMat').checked;
  if (g('lfIncLabor')) lf.incLabor = g('lfIncLabor').checked;
  if (g('lfVisit')) lf.visitType = g('lfVisit').value;
  if (g('lfNote')) lf.note = g('lfNote').value.trim();
  if (g('lfSavePl')) lf._savePrice = g('lfSavePl').checked;
}
function bindLineForm(body) {
  body.querySelector('#lfCats').onclick = e => { const b = e.target.closest('[data-cat]'); if (!b) return; readLineInputs(); lf.cat = b.dataset.cat; renderLineForm(); };
  const items = body.querySelector('#lfItems');
  if (items) items.onclick = e => {
    const b = e.target.closest('[data-i]');
    if (!b) return;
    readLineInputs();
    const it = catItems(lf.cat)[+b.dataset.i];
    lf.name = it[0]; lf.method = it[1]; lf.kind = it[2]; lf.unit = METHODS[it[1]].unit; lf.conn = it[3] || '';
    if (lf.cat === 'pipes') lf.pipeType = PIPE_TYPES.find(p => it[0].includes(p)) || lf.pipeType;
    if (lf.method === 'lump') lf.qty = 1;
    if (!lf.qty) lf.qty = 1;
    const p = priceFor(lf.name);
    if (p && !lf.price) lf.price = p.price;
    renderLineForm();
  };
  body.querySelector('#lfKind').onchange = e => { readLineInputs(); lf.kind = e.target.value; renderLineForm(); };
  body.querySelector('#lfMethod').onchange = e => { readLineInputs(); lf.method = e.target.value; lf.unit = METHODS[lf.method].unit; if (!lf.qty) lf.qty = 1; if (lf.method === 'supply' && !isSupplyKind(lf.kind)) lf.kind = 'fixture'; renderLineForm(); };
  const src = body.querySelector('#lfSource');
  if (src) src.onclick = e => { const b = e.target.closest('button'); if (!b) return; readLineInputs(); lf.source = b.dataset.s; renderLineForm(); };
  // سعر القائمة بيتحدث في مكانه من غير إعادة رسم النموذج (علشان الكيبورد والتركيز ما يضيعوش)
  const plBox = () => {
    const box = document.getElementById('lfPl'); if (!box) return;
    const p = priceFor(lf.name);
    box.innerHTML = p ? `<button type="button" class="chip" id="lfUsePl" style="margin:-4px 0 12px">سعر القائمة: ${money(p.price)} — استخدمه</button>` : '';
    const b = box.querySelector('#lfUsePl');
    if (b) b.onclick = () => { readLineInputs(); const x = priceFor(lf.name); if (x) { lf.price = x.price; renderLineForm(); } };
  };
  plBox();
  body.oninput = () => {
    readLineInputs();
    // الحفر: الحجم بيتحسب في مكانه من الأبعاد
    const q = document.getElementById('lfQty');
    if (q && lf.method === 'cubic') { const dims = !!(lf.len && lf.wid && lf.dep); q.readOnly = dims; if (dims) q.value = lf.qty; }
    updateLineLive();
  };
  body.onchange = e => { readLineInputs(); if (e.target && e.target.id === 'lfName') plBox(); updateLineLive(); };
}
function updateLineLive() {
  const t = document.getElementById('lfLive'), s = document.getElementById('lfLiveTxt');
  if (!t || !lf) return;
  const d = getCurrentDoc();
  const clean = normalizeLine(lf);
  s.textContent = lineFromClient(clean) && !clean.install ? 'خامات العميل — لا تُحسب في المستند' : (clean.method === 'lump' ? METHODS.lump.label : `${lineQtyText(clean)} × ${linePriceText(clean)}`);
  t.textContent = money(lineTotal(clean));
  const wb = document.getElementById('lfWarn');
  if (wb && d) {
    const w = clean.name.trim() && clean.name !== 'بند' ? lineDupWarnings(clean, d.lines.filter(x => x.id !== clean.id)) : [];
    wb.innerHTML = w.length ? `<div class="warn-box" style="margin:0 0 12px">⚠️ ${w.map(esc).join('<br>')}</div>` : '';
  }
}
function saveLineForm(isEdit, force) {
  readLineInputs();
  if (!lf.name.trim()) { showAppToast('⚠️ اكتب اسم البند أولاً'); return false; }
  if (METHODS[lf.method].qty && !(lf.qty > 0)) lf.qty = 1;
  const d = getCurrentDoc();
  const clean = normalizeLine(lf);
  if (!force) {
    // لا يتحسب نفس البند / نفس التوصيلة مرتين من غير ما المستخدم يعرف ويوافق
    const w = lineDupWarnings(clean, d.lines.filter(x => x.id !== clean.id));
    if (w.length) {
      showAppConfirm('⚠️ ' + w.join('\n') + '\n\nتحفظ البند برضه؟', () => { if (saveLineForm(isEdit, true) !== false) { closeOverlay(); refreshAll(); } });
      return false;
    }
  }
  if (lf._savePrice) savePriceToList(clean.name, clean.cat, clean.method, clean.price);
  if (isEdit) d.lines = d.lines.map(l => l.id === clean.id ? clean : l);
  else d.lines.push(clean);
  saveDoc(d);
  showAppToast(isEdit ? '✔️ تم تحديث البند' : `✔️ تمت إضافة "${clean.name}" = ${money(lineTotal(clean))}`);
  lf = null;
  return true;
}
function addLinesToCurrentDoc(lines, msg) {
  const d = getCurrentDoc();
  if (!d) return;
  lines.forEach(l => d.lines.push(normalizeLine(Object.assign({ id: uid('l') }, l))));
  saveDoc(d);
  refreshAll();
  if (msg) showAppToast(msg);
}
// بند فاتورة من صنف في المخزن
function invLinePreset(it) {
  const kind = invCatKind(it.cat);
  const method = it.unit === 'متر' ? 'meter' : (kind === 'fixture' || kind === 'equipment') ? 'supply' : 'piece';
  return { cat: KIND_CAT[kind] || 'pipes', name: it.name, kind, method, unit: method === 'meter' ? 'م.ط' : it.unit, qty: 1, price: it.sellPrice, cost: it.buyPrice, invId: it.id,
    size: it.spec, pipeType: PIPE_TYPES.find(p => it.cat.includes(p)) || '', note: [it.brand, it.model].filter(Boolean).join(' ') };
}
function pickInventoryForDoc() {
  if (!DB.inventory.length) { showAppToast('المخزن فاضي — ضيف الخامات والأدوات الصحية من «المزيد ← الخامات والأدوات الصحية»'); return; }
  openPicker({
    title: 'إضافة من المخزن',
    items: DB.inventory.map(it => ({ id: it.id, title: it.name + (it.spec ? ' ' + it.spec : ''), sub: `${esc(it.cat)} · الرصيد ${fmtN(it.qty)} ${esc(it.unit)} · بيع ${money(it.sellPrice)}`, icon: 'box', keys: it.brand + ' ' + it.model })),
    onPick: x => openLineForm(null, invLinePreset(invById(x.id)))
  });
}
function pickPriceListForDoc() {
  const items = priceListItems();
  if (!items.length) { showAppToast('قائمة الأسعار فاضية — جهّزها من «المزيد ← قوائم الأسعار»'); return; }
  openPicker({
    title: 'إضافة من قائمة الأسعار',
    items: items.map(i => ({ id: i.id, title: i.name + (i.size ? ' ' + i.size : ''), sub: `${METHODS[i.method].label} · ${i.price ? money(i.price) : 'بدون سعر'}`, icon: 'tag' })),
    onPick: x => {
      const i = items.find(y => y.id === x.id);
      const catItem = catItems(i.cat).find(y => y[0] === i.name) || null;
      const kind = catItem ? catItem[2] : (i.method === 'daily' || i.method === 'hour' ? 'labor' : i.method === 'cubic' ? 'excavation' : i.method === 'visit' ? 'diag' : i.method === 'supply' ? 'fixture' : 'service');
      openLineForm(null, { cat: i.cat || 'points', name: i.name, method: i.method, kind, qty: 1, price: i.price, size: i.size, conn: catItem ? catItem[3] || '' : '',
        pipeType: i.cat === 'pipes' ? (PIPE_TYPES.find(p => i.name.includes(p)) || '') : '' });
    }
  });
}

/* ---------- الخطوة 3: الحساب والمدفوعات ---------- */
function paymentRowHTML(p) {
  const d = p.docId ? getDoc(p.docId) : null;
  return `
    <div class="entry" data-pay="${esc(p.id)}">
      <div class="e-ic">${icon('cash')}</div>
      <div class="e-info"><div class="e-title">${esc(PAY_KINDS[p.kind])} · ${esc(p.method)}${p.number ? ` <span class="src-badge">${esc(p.number)}</span>` : ''}</div>
        <div class="e-meta">${esc(fmtDate(p.date))}${d ? ' · ' + esc(d.number) : (p.docId ? '' : ' · على الحساب')}${p.note ? ' · ' + esc(p.note) : ''}</div></div>
      <div class="e-amt">+ ${fmt(p.amount)}</div>
    </div>`;
}
function renderEditorSummary(d, inputsUnchanged) {
  const t = computeDoc(d);
  const row = (label, value, cls = '') => `<div class="sum-row ${cls}"><span>${label}</span><strong>${value}</strong></div>`;
  let sum = '<div class="sum-list">';
  KIND_ORDER.forEach(k => { if (t.byKind[k]) sum += row(LINE_KINDS[k], money(t.byKind[k])); });
  if (!d.lines.length) sum += row('لا توجد بنود بعد', money(0));
  sum += row('مجموع البنود', money(t.subtotal), 'bold');
  if (t.add) sum += row('إضافات' + (d.addNote ? ` (${esc(d.addNote)})` : ''), '+ ' + money(t.add));
  if (t.discount) sum += row('الخصم', '- ' + money(t.discount), 'minus');
  sum += row(t.billable ? 'إجمالي المقاولة / الفاتورة' : 'إجمالي المقايسة', money(t.total), 'bold');
  if (t.billable) {
    if (t.paid) sum += row(`المدفوع (${t.payments.length} دفعة)`, '- ' + money(t.paid), 'minus');
    sum += `</div><div class="sum-total"><span>${t.remaining >= 0 ? 'المتبقي على العميل' : 'زيادة للعميل'}</span><strong>${money(Math.abs(t.remaining))}</strong></div>`;
  } else sum += `</div><div class="sum-total"><span>إجمالي ${esc(docTypeInfo(d.docType).short)}</span><strong>${money(t.total)}</strong></div>`;
  const box = document.getElementById('summaryBody');
  if (inputsUnchanged && document.getElementById('docSumBox')) {
    document.getElementById('docSumBox').innerHTML = sum;
    const pb = document.getElementById('docProfitBox'); if (pb) pb.innerHTML = profitHTML(t);
    return;
  }
  const info = docTypeInfo(d.docType);
  const spaces = Object.keys(t.bySpace).filter(Boolean);
  const warns = docWarnings(d);
  box.innerHTML = `
    ${warns.length ? `<div class="warn-box" style="margin:0 0 12px"><b>⚠️ راجع البنود — احتمال تكرار (${warns.length}):</b><br>${warns.map(esc).join('<br>')}</div>` : ''}
    <div class="card">
      <div class="card-title"><div class="t-ic">${icon('wallet')}</div><h2>الإضافات والخصم</h2></div>
      <div class="row-2">
        <div class="field"><label for="docAdd">إضافات (<span class="cur">${CUR}</span>)</label><input type="number" inputmode="decimal" min="0" step="any" id="docAdd" value="${d.addAmount || ''}" placeholder="0" oninput="setDocField('addAmount', this.value)"></div>
        <div class="field"><label for="docDisc">خصم للعميل (<span class="cur">${CUR}</span>)</label><input type="number" inputmode="decimal" min="0" step="any" id="docDisc" value="${d.discountAmount || ''}" placeholder="0" oninput="setDocField('discountAmount', this.value)"></div>
      </div>
      <div class="field" style="margin-bottom:0"><label for="docAddNote">بيان الإضافات <span class="hint">(اختياري)</span></label><input type="text" id="docAddNote" value="${esc(d.addNote)}" placeholder="مثال: أعمال إضافية خارج المقايسة" oninput="setDocField('addNote', this.value)"></div>
    </div>

    ${info.billable ? `
    <div class="card">
      <div class="card-title"><div class="t-ic">${icon('cash')}</div><h2>المدفوعات</h2><span class="tag">${money(t.paid)}</span></div>
      <div class="btn-row">
        <button type="button" class="btn btn-accent" onclick="openPaymentForm(null, {docId: getCurrentDoc().id, kind: '${t.payments.length ? 'payment' : 'deposit'}'})">${icon('plus')} ${t.payments.length ? 'تسجيل دفعة' : 'تسجيل عربون'}</button>
        <button type="button" class="btn btn-soft" onclick="openPaymentForm(null, {docId: getCurrentDoc().id, kind: 'final', fill: true})">${icon('check')} سداد المتبقي</button>
      </div>
      <div style="margin-top:8px" id="docPayList">${t.payments.length ? t.payments.map(paymentRowHTML).join('') : '<p class="hint" style="margin:10px 0 0;text-align:center">لم تسجل أي دفعة بعد.</p>'}</div>
    </div>` : `
    <div class="card">
      <div class="card-title"><div class="t-ic orange">${icon('swap')}</div><h2>العميل وافق؟</h2></div>
      <p class="hint" style="margin:-6px 0 12px">حوّل ${esc(info.label)} لفاتورة فعلية بنفس البنود، وبعدها تقدر تسجل العربون والدفعات.</p>
      <div class="btn-row">
        <button type="button" class="btn btn-primary" id="convInvoice" onclick="convertCurrentDoc('invoice')">فاتورة أعمال</button>
        <button type="button" class="btn btn-ghost" onclick="convertCurrentDoc('supply')">توريد وتركيب</button>
      </div>
    </div>`}

    <div class="card">
      <div class="card-title"><div class="t-ic orange">${icon('calc')}</div><h2>كشف الحساب: ${esc(docTitle(d))}</h2></div>
      <div id="docSumBox">${sum}</div>
    </div>

    ${spaces.length ? `<div class="card">
      <div class="card-title"><div class="t-ic">${icon('home')}</div><h2>التجميع حسب المكان</h2><span class="tag">${spaces.length}</span></div>
      <div class="sum-list">${spaces.map(sp => row(esc(sp), money(t.bySpace[sp]))).join('')}${t.bySpace[''] ? row('بنود عامة', money(t.bySpace[''])) : ''}</div>
      <div class="hint">كل بند بيتحسب مرة واحدة في مكانه — المجموع = مجموع البنود ${money(t.subtotal)}.</div>
    </div>` : ''}

    <div class="card">
      <div class="card-title"><div class="t-ic">${icon('chart')}</div><h2>التكلفة والربح</h2><span class="tag">لك فقط</span></div>
      <div id="docProfitBox">${profitHTML(t)}</div>
      <button type="button" class="btn btn-ghost btn-sm" style="width:100%;margin-top:10px" onclick="openExpenseForm(null, {docId: getCurrentDoc().id})">${icon('receipt')} تسجيل مصروف على المستند ده</button>
    </div>

    <div class="stack">
      <button type="button" class="btn btn-accent" onclick="openDocPreview(false)">${icon('eye')} معاينة ${esc(info.label)} وطباعتها PDF</button>
      <div class="btn-row">
        <button type="button" class="btn btn-wa" onclick="sendDocWhatsApp()">${icon('send')} إرسال واتساب</button>
        <button type="button" class="btn btn-ghost" onclick="copyDocText()">${icon('copy')} نسخ النص</button>
      </div>
      ${t.payments.length ? `<button type="button" class="btn btn-soft" onclick="openReceiptPreview('${esc(t.payments[t.payments.length - 1].id)}')">${icon('receipt')} إيصال آخر دفعة</button>` : ''}
    </div>`;
  box.querySelectorAll('.entry[data-pay]').forEach(el => { el.onclick = () => openPaymentForm(el.dataset.pay); });
}
function profitHTML(t) {
  const row = (label, value, cls = '') => `<div class="sum-row ${cls}"><span>${label}</span><strong>${value}</strong></div>`;
  return `<div class="sum-list">
    ${row('تكلفة شراء الخامات والأدوات (من البنود)', money(t.cost))}
    ${row('مصروفات خامات مسجلة على المستند', money(t.matExpenses))}
    ${row('تكلفة الخامات المحتسبة (الأكبر منهم — مرة واحدة)', '- ' + money(t.materialsCost), 'minus')}
    ${row('مصروفات أخرى (نقل / حفر / ...)', '- ' + money(t.otherExpenses), 'minus')}
    ${row('أجور العمال على المستند', '- ' + money(t.labor), 'minus')}
    ${row('صافي الربح المتوقع', money(t.profit), 'bold')}
    ${t.billable ? row('المحصل فعلاً حتى الآن', money(t.paid)) : ''}
  </div>`;
}

/* ---------------- تسجيل دفعة / عربون ---------------- */
// opts: {docId, customerId, kind, fill}
function openPaymentForm(payId, opts = {}) {
  const ex = payId ? DB.payments.find(p => p.id === payId) : null;
  const p = ex ? Object.assign({}, ex) : { id: uid('p_'), docId: opts.docId || null, customerId: opts.customerId || null, amount: 0, date: todayISO(), method: 'كاش', kind: opts.kind || 'payment', note: '' };
  if (!ex && p.docId) { const d = getDoc(p.docId); if (d) p.customerId = d.customerId; }
  const custId = p.customerId || (p.docId && getDoc(p.docId) ? getDoc(p.docId).customerId : null);
  // الفواتير المتاحة للاختيار
  const docsList = DB.docs.filter(d => docTypeInfo(d.docType).billable && (custId ? d.customerId === custId : d.id === p.docId));
  const remOf = id => { const d = getDoc(id); return d ? computeDoc(d).remaining + (ex && ex.docId === id ? ex.amount : 0) : 0; };
  if (!ex && opts.fill && p.docId) p.amount = Math.max(0, round2(remOf(p.docId)));
  if (!ex && !p.docId && custId && !opts.general) {
    const firstDue = docsList.slice().reverse().find(d => computeDoc(d).remaining > 0);
    if (firstDue) p.docId = firstDue.id;
  }
  const docOpts = (custId ? opt('', '— على الحساب العام للعميل —', p.docId || '') : '') + docsList.map(d => opt(d.id, `${d.number} · ${docTypeInfo(d.docType).short} · متبقي ${fmt(remOf(d.id))}`, p.docId)).join('');
  openForm({
    title: ex ? 'تعديل الدفعة' : (p.kind === 'deposit' ? 'تسجيل عربون' : 'تسجيل دفعة'),
    html: `
      <div class="field"><label for="payDoc">الفاتورة</label><select id="payDoc">${docOpts || opt('', '— بدون فاتورة —', '')}</select></div>
      <div class="row-2">
        <div class="field"><label for="payAmount">المبلغ (<span class="cur">${CUR}</span>)</label><input type="number" inputmode="decimal" min="0" step="any" id="payAmount" value="${p.amount || ''}" placeholder="0"></div>
        <div class="field"><label for="payDate">التاريخ</label><input type="date" id="payDate" value="${esc(p.date)}"></div>
      </div>
      <button type="button" class="chip" id="payFill" style="margin:-4px 0 12px"></button>
      <div class="field"><label>نوع الدفعة</label><div class="unit-chips" id="payKind">${Object.keys(PAY_KINDS).map(k => `<button type="button" class="chip${p.kind === k ? ' on' : ''}" data-k="${k}">${PAY_KINDS[k]}</button>`).join('')}</div></div>
      <div class="field"><label>طريقة الدفع</label><div class="unit-chips" id="payMethod">${PAY_METHODS.map(m => `<button type="button" class="chip${p.method === m ? ' on' : ''}" data-m="${esc(m)}">${esc(m)}</button>`).join('')}</div></div>
      <div class="field"><label for="payNote">ملاحظة / أمارة</label><textarea id="payNote" placeholder="مثال: استلمتها كاش في الموقع (اختياري)">${esc(p.note)}</textarea></div>`,
    after: body => {
      const fill = body.querySelector('#payFill');
      const upd = () => {
        const id = body.querySelector('#payDoc').value;
        const r = id ? Math.max(0, round2(remOf(id))) : 0;
        fill.classList.toggle('hidden', !(r > 0));
        fill.textContent = `سداد كل المتبقي (${money(r)})`;
        fill.onclick = () => { body.querySelector('#payAmount').value = r; };
      };
      body.querySelector('#payDoc').onchange = upd;
      upd();
      body.querySelector('#payKind').onclick = e => { const b = e.target.closest('[data-k]'); if (!b) return; p.kind = b.dataset.k; body.querySelectorAll('#payKind .chip').forEach(x => x.classList.toggle('on', x === b)); };
      body.querySelector('#payMethod').onclick = e => { const b = e.target.closest('[data-m]'); if (!b) return; p.method = b.dataset.m; body.querySelectorAll('#payMethod .chip').forEach(x => x.classList.toggle('on', x === b)); };
    },
    saveText: ex ? 'تحديث الدفعة' : 'حفظ الدفعة',
    onSave: body => {
      const amount = round2(parseFloat(body.querySelector('#payAmount').value) || 0);
      if (!(amount > 0)) { showAppToast('⚠️ اكتب المبلغ أولاً'); return false; }
      p.amount = amount;
      p.date = body.querySelector('#payDate').value || todayISO();
      p.note = body.querySelector('#payNote').value.trim();
      p.docId = body.querySelector('#payDoc').value || null;
      if (p.docId) { const d = getDoc(p.docId); p.customerId = d ? d.customerId : p.customerId; }
      else p.customerId = custId;
      if (!p.number) p.number = nextNumber('RCPT');
      const clean = NORMALIZERS.payments(p);
      if (ex) DB.payments = DB.payments.map(x => x.id === clean.id ? clean : x);
      else DB.payments.push(clean);
      saveCol('payments');
      showAppToast(ex ? '✔️ تم تعديل الدفعة' : `✔️ تم تسجيل ${money(amount)} (${PAY_KINDS[clean.kind]}) — إيصال ${clean.number}`);
    },
    onDelete: ex ? () => showAppConfirm('حذف هذه الدفعة نهائياً؟', () => {
      DB.payments = DB.payments.filter(x => x.id !== ex.id);
      saveCol('payments'); closeOverlay(); refreshAll();
    }) : null,
    deleteText: 'حذف الدفعة'
  });
  if (ex) {
    const foot = document.getElementById((formCtx.form2 ? 'form2' : 'form') + 'Foot');
    foot.insertAdjacentHTML('beforeend', `<button type="button" class="btn btn-soft" onclick="openReceiptPreview('${esc(ex.id)}')">${icon('receipt')} إيصال استلام الدفعة PDF</button>`);
  }
}

/* ---------------- قائمة المستند والمشاركة ---------------- */
function openDocActions() {
  const d = getCurrentDoc();
  if (!d) return;
  const info = docTypeInfo(d.docType);
  const t = computeDoc(d);
  const item = (ic, cls, title, sub, fn) => `<button type="button" class="action-item" data-fn="${fn}"><span class="a-ic ${cls}">${icon(ic)}</span><span>${title}${sub ? `<small>${sub}</small>` : ''}</span></button>`;
  const acts = {
    prev: () => openDocPreview(false), print: () => openDocPreview(true), wa: sendDocWhatsApp, copy: copyDocText,
    pay: () => openPaymentForm(null, { docId: d.id, kind: t.payments.length ? 'payment' : 'deposit' }),
    rcpt: () => t.payments.length && openReceiptPreview(t.payments[t.payments.length - 1].id),
    conv: () => convertCurrentDoc('invoice'), fin: () => convertCurrentDoc('final'), dup: duplicateCurrentDoc,
    cust: () => d.customerId && openPage('customer', d.customerId), proj: () => d.projectId && openPage('project', d.projectId),
    newd: () => pickDocType(), del: deleteCurrentDoc
  };
  const box = document.getElementById('actionsList');
  box.innerHTML = [
    item('eye', 'orange', `معاينة ${esc(info.label)}`, 'عدّل أي كلمة أو رقم قبل الطباعة', 'prev'),
    item('printer', '', 'طباعة / حفظ PDF فوري', '', 'print'),
    item('send', 'green', 'إرسال عبر واتساب', '', 'wa'),
    item('copy', '', 'نسخ كنص', '', 'copy'),
    info.billable ? item('cash', 'green', t.payments.length ? 'تسجيل دفعة' : 'تسجيل عربون', `المتبقي ${money(t.remaining)}`, 'pay') : item('swap', 'orange', 'تحويل لفاتورة أعمال', 'بنفس البنود', 'conv'),
    info.billable && d.docType !== 'final' ? item('check', 'orange', 'تحويل لفاتورة ختامية', 'عند تسليم الشغل', 'fin') : '',
    t.payments.length ? item('receipt', '', 'إيصال آخر دفعة PDF', '', 'rcpt') : '',
    d.customerId ? item('user', '', 'صفحة العميل', '', 'cust') : '',
    d.projectId && getProject(d.projectId) ? item('folder', '', 'صفحة المشروع', '', 'proj') : '',
    item('copy', 'orange', 'عمل نسخة من المستند', 'نفس البنود بدون المدفوعات', 'dup'),
    item('plus', 'orange', 'مستند جديد', '', 'newd'),
    `<button type="button" class="action-item" data-fn="del"><span class="a-ic" style="background:var(--danger-soft);color:var(--danger)">${icon('trash')}</span><span>حذف هذا المستند</span></button>`
  ].join('');
  box.onclick = e => { const b = e.target.closest('[data-fn]'); if (b) runAction(acts[b.dataset.fn]); };
  openOverlay('actions');
}

/* ---------------- قائمة المستندات ---------------- */
let docsTab = 'docs';
let docFilter = 'all';
function docCardHTML(d) {
  const t = computeDoc(d);
  const info = docTypeInfo(d.docType);
  let amt;
  if (!t.billable) amt = `<div class="inv-amount" style="color:var(--muted)">${fmt(t.total)}<small>${CUR} ${esc(info.billable ? '' : 'مقايسة')}</small></div>`;
  else if (round2(t.remaining) <= 0 && t.total > 0) amt = `<div class="inv-amount" style="color:var(--success)">خالص<small>${t.remaining < 0 ? fmt(-t.remaining) + ' زيادة' : 'مدفوعة'}</small></div>`;
  else amt = `<div class="inv-amount">${fmt(t.remaining)}<small>${CUR} متبقي</small></div>`;
  return `
    <div class="inv-card" data-doc="${esc(d.id)}">
      <div class="inv-avatar"${t.billable ? '' : ' style="background:linear-gradient(135deg,var(--orange-400),var(--orange-600))"'}>${icon(info.icon)}</div>
      <div class="inv-info">
        <div class="n"><span class="nm">${esc(docTitle(d))}</span><span class="mode-badge${t.billable ? '' : ' items'}">${esc(info.short)}</span></div>
        <div class="m"><span dir="ltr">${esc(d.number)}</span> · ${esc(fmtDate(d.date))} · ${d.lines.length} بند · ${money(t.total)}</div>
      </div>
      ${amt}
    </div>`;
}
function bindDocCards(box) { box.querySelectorAll('.inv-card[data-doc]').forEach(el => { el.onclick = () => openDoc(el.dataset.doc); }); }
function setDocsTab(tab) { docsTab = tab === 'mat' ? 'mat' : 'docs'; renderDocsView(); fitStats(document.getElementById('view-docs')); }
function renderDocsView() {
  document.getElementById('docsTabInv').classList.toggle('on', docsTab === 'docs');
  document.getElementById('docsTabMat').classList.toggle('on', docsTab === 'mat');
  document.getElementById('docsInv').classList.toggle('hidden', docsTab !== 'docs');
  document.getElementById('docsMat').classList.toggle('hidden', docsTab !== 'mat');
  document.getElementById('docsInvCount').textContent = DB.docs.length;
  document.getElementById('docsMatCount').textContent = DB.matlists.length;
  const chips = [['all', 'الكل'], ['bills', 'الفواتير'], ['ests', 'المقايسات والعروض'], ['due', 'عليها متبقي'], ...DOC_TYPE_ORDER.map(k => [k, DOC_TYPES[k].short])];
  document.getElementById('invFilter').innerHTML = chips.map(([k, l]) => `<button type="button" class="chip${docFilter === k ? ' on' : ''}" data-f="${k}">${esc(l)}</button>`).join('');
  if (docsTab === 'mat') { renderMatLists(); return; }
  const q = val('invoiceSearch').trim();
  const list = DB.docs.filter(d => {
    const pr = d.projectId ? getProject(d.projectId) : null;
    if (q && !((d.clientName + ' ' + d.clientPhone + ' ' + d.clientAddress + ' ' + d.number + ' ' + (pr ? pr.name : d.siteText)).includes(q))) return false;
    const bill = docTypeInfo(d.docType).billable;
    if (docFilter === 'due') return bill && round2(computeDoc(d).remaining) > 0;
    if (docFilter === 'bills') return bill;
    if (docFilter === 'ests') return !bill;
    if (docFilter !== 'all') return d.docType === docFilter;
    return true;
  });
  const box = document.getElementById('invoiceList');
  if (!list.length) { box.innerHTML = `<div class="card empty"><div class="big">${icon('folder')}</div><p>${q || docFilter !== 'all' ? 'لا توجد مستندات مطابقة.' : 'لا توجد مقايسات أو فواتير بعد. ابدأ بزرار (+).'}</p></div>`; return; }
  box.innerHTML = list.map(docCardHTML).join('');
  bindDocCards(box);
}
