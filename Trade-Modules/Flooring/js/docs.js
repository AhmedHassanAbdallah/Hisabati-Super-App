/*
 * أرزقي للأرضيات — الفواتير والمستندات والطباعة (PDF بالعربي من نظام الطباعة)
 * © 2026 أحمد حسن عبدالله - جميع الحقوق محفوظة.
 */
(function (root) {
  'use strict';
  const { esc, icon, money, fmt, fmtQ, fmtDate } = UI;
  const { nn, round } = Calc;
  const db = () => Store.db;
  const by = (col, id) => Store.get(col, id);
  const T = Fin.DOC_TYPES;
  const TYPE_ICONS = { labor: 'hammer', supply: 'box', both: 'layers', estimate: 'ruler', quote: 'tag', extract: 'chart', purchase: 'store' };

  /* ================= أساسيات المستند ================= */
  function newDoc(type, init) {
    return Object.assign({
      id: null, type, number: '', date: Store.todayISO(), projectId: null, customerId: null,
      client: { name: '', phone: '', address: '' }, supplier: { name: '', phone: '' },
      rows: [], discount: '', additions: [], paid: '', previous: '', deductions: '', notes: '', validUntil: '', showProjectPaid: true
    }, init || {});
  }
  function clientOf(d) {
    const c = d.customerId && by('customers', d.customerId);
    return { name: (c && c.name) || (d.client && d.client.name) || '', phone: (c && c.phone) || (d.client && d.client.phone) || '', address: (d.client && d.client.address) || (c && c.address) || '' };
  }
  function totalsOf(d) {
    const t = Calc.docTotals(d);
    const p = d.projectId && by('projects', d.projectId);
    if (p && d.type !== 'purchase' && d.showProjectPaid !== false && T[d.type] && (T[d.type].revenue || d.type === 'extract')) {
      const f = Fin.projectFinance(db(), p);
      if (d.type === 'extract') return Object.assign(t, { paid: 0, remaining: t.due, projectPaid: f.paid });
      return Object.assign(t, { paid: f.paid, remaining: round(t.total - f.paid, 4), projectPaid: f.paid, linkedPaid: true });
    }
    return t;
  }
  function saveDoc(d) {
    if (!d.number) d.number = Store.nextNumber(d.type, T[d.type].prefix);
    ['discount', 'paid', 'previous', 'deductions'].forEach(k => { d[k] = d[k] === '' ? '' : nn(d[k]); });
    const ex = d.id && by('docs', d.id);
    Store.upsert('docs', ex ? Object.assign(ex, d) : d);
    return App.commit();
  }
  function docTitle(d) { return (T[d.type] || {}).label || 'مستند'; }

  function cardHTML(d) {
    const t = totalsOf(d);
    const cl = d.type === 'purchase' ? (d.supplier && d.supplier.name) || 'مورد' : clientOf(d).name || 'بدون اسم';
    return `<div class="inv-card" data-doc="${d.id}"><div class="inv-avatar doc-${d.type}">${icon(TYPE_ICONS[d.type] || 'file')}</div>
      <div class="inv-info"><div class="n">${esc(cl)}</div><div class="m">${esc(docTitle(d))} · ${esc(d.number || '')} · ${esc(fmtDate(d.date))}${d.projectId ? ' · مشروع' : ''}</div></div>
      <div class="inv-amount">${money(d.type === 'extract' ? t.due : t.total)}${T[d.type].revenue || d.type === 'purchase' ? `<small class="${t.remaining > 0 ? 'due' : ''}">${t.remaining > 0 ? 'متبقي ' + fmt(t.remaining) : 'خالص'}</small>` : `<small>${d.type === 'quote' ? 'عرض سعر' : ''}</small>`}</div>
      <button type="button" class="card-del" data-deldoc="${d.id}" aria-label="حذف">${icon('trash')}</button></div>`;
  }
  function bindCards(el, closeFirst) {
    el.querySelectorAll('[data-doc]').forEach(c => { c.onclick = () => { const d = by('docs', c.dataset.doc); if (closeFirst) UI.closeThen(1, () => openEditor(d)); else openEditor(d); }; });
    el.querySelectorAll('[data-deldoc]').forEach(b => { b.onclick = ev => { ev.stopPropagation(); confirmDelete(by('docs', b.dataset.deldoc), () => { const top = UI.topPage(); if (top) top.refresh(); else App.refreshView(); }); }; });
  }
  function confirmDelete(d, after) {
    if (!d) return;
    UI.confirm(`حذف ${docTitle(d)} رقم ${d.number || ''}؟${T[d.type].sells && !d.projectId && d.rows.some(r => r.materialId) ? '\nالخامات المرتبطة بالمخزن هترجع للمخزن.' : ''}${d.type === 'purchase' && !d.projectId && d.rows.some(r => r.materialId) ? '\nالكميات اللي دخلت المخزن من الفاتورة دي هتتشال.' : ''}`, () => {
      Store.remove('docs', d.id); App.commit('🗑️ تم حذف المستند'); if (after) after();
    }, { yes: 'حذف' });
  }

  /* ================= قائمة المستندات ================= */
  function openList() {
    let f = 'all', q = '';
    UI.openPage({
      title: 'الفواتير والمستندات', sub: 'فواتير، مقايسات، عروض أسعار، مستخلصات، مشتريات، إيصالات',
      actions: [{ icon: 'plus', label: 'مستند جديد', accent: true, onClick: () => openNewDoc({}) }],
      render(body, page) {
        const all = db().docs.slice().sort(App.sortByDateDesc);
        const standalone = all.filter(Fin.docIsStandaloneRevenue);
        const match = d => !q || [clientOf(d).name, d.number, d.supplier && d.supplier.name, App.projectName(d.projectId)].join(' ').includes(q);
        const pays = db().payments.slice().sort(App.sortByDateDesc);
        const list = f === 'receipts' ? [] : all.filter(d => (f === 'all' || d.type === f) && match(d));
        const chips = [['all', `الكل (${all.length})`]].concat(Object.keys(T).map(k => [k, T[k].label])).concat([['receipts', `إيصالات الاستلام (${pays.length})`]]);
        body.innerHTML = `<section class="hero"><div class="hero-label">متبقي على الفواتير المنفصلة</div><div class="hero-value">${fmt(Calc.sum(standalone, d => Math.max(0, Calc.docTotals(d).remaining)))}<small>${UI.curSym()}</small></div>
          <div class="hero-stats"><div class="hero-stat"><span>كل المستندات</span><strong>${all.length}</strong></div><div class="hero-stat"><span>عروض أسعار</span><strong>${all.filter(d => d.type === 'quote').length}</strong></div><div class="hero-stat"><span>مستخلصات</span><strong>${all.filter(d => d.type === 'extract').length}</strong></div></div></section>
          <button type="button" class="btn btn-accent" style="margin-bottom:12px" data-act="new">${icon('plus')} مستند جديد</button>
          <div class="field" style="margin-bottom:10px"><input type="search" data-q placeholder="ابحث باسم العميل أو رقم الفاتورة..." value="${esc(q)}"></div>
          <div class="filter-chips">${chips.map(([k, l]) => `<button type="button" class="chip${f === k ? ' on' : ''}" data-f="${k}">${esc(l)}</button>`).join('')}</div>
          ${f === 'receipts' ? (pays.length ? `<div class="note" style="margin-bottom:10px">إيصال الاستلام بيطلع من الدفعة نفسها — اضغط على أيقونة الطابعة.</div><div class="card">${pays.map(App.paymentEntryHTML).join('')}</div>` : App.emptyHTML('receipt', 'مفيش دفعات مسجلة'))
            : (list.length ? list.map(cardHTML).join('') : App.emptyHTML('file', all.length ? 'مفيش نتائج' : 'لسه مفيش مستندات'))}`;
        const inp = body.querySelector('[data-q]');
        inp.oninput = () => { q = inp.value.trim(); const pos = inp.selectionStart; page.refresh(); const x = page.body.querySelector('[data-q]'); x.focus(); try { x.setSelectionRange(pos, pos); } catch (e) {} };
        body.querySelectorAll('[data-f]').forEach(b => { b.onclick = () => { f = b.dataset.f; page.refresh(); }; });
        bindCards(body); App.bindPaymentEntries(body);
        App.bindActions(body, { new: () => openNewDoc({}) });
      }
    });
  }
  function openNewDoc(init) {
    UI.openSheet({
      title: 'مستند جديد: نوعه إيه؟',
      render(body) {
        body.innerHTML = `<div class="create-list">${Object.keys(T).map(t => `<button type="button" class="create-opt" data-t="${t}"><span class="q-ic${t === 'purchase' ? ' orange-soft' : ''}">${icon(TYPE_ICONS[t])}</span><span><b>${T[t].label}</b><small>${({ labor: 'مصنعية التركيب فقط', supply: 'بيع وتوريد خامات (بيخصم من المخزن)', both: 'الخامات والتركيب مع بعض', estimate: 'تقدير كميات وأسعار المشروع', quote: 'عرض سعر للعميل قبل الاتفاق', extract: 'حساب الأعمال المنفذة حتى تاريخه', purchase: 'خامات اشتريتها من مورد (بتزود المخزن)' })[t]}</small></span></button>`).join('')}
          <button type="button" class="create-opt" data-t="receipt"><span class="q-ic green">${icon('receipt')}</span><span><b>إيصال استلام مبلغ</b><small>بيتسجل كدفعة ويتطبع إيصال</small></span></button></div>
          <p class="hint" style="text-align:center;margin-top:10px">كشف حساب العميل من صفحة العميل، وتقرير الأرباح من ملخص المشروع.</p>`;
        body.querySelectorAll('[data-t]').forEach(b => {
          b.onclick = () => {
            const t = b.dataset.t;
            UI.closeThen(1, () => {
              if (t === 'receipt') { App.openPaymentSheet({ projectId: init.projectId || null, customerId: init.customerId || null }); return; }
              if (t !== 'purchase' && db().projects.length) {
                UI.confirm('تاخد البنود من مشروع مسجل؟', () => App.pickProject(pid => createFromProject(by('projects', pid), t)),
                  { yes: 'من مشروع', no: 'مستند منفصل', safe: true, title: T[t].label, onNo: () => openEditor(newDoc(t, { customerId: init.customerId || null })) });
                return;
              }
              openEditor(newDoc(t, { customerId: init.customerId || null }));
            });
          };
        });
      }
    });
  }
  function createFromProject(p, type) {
    if (!p) return;
    const d = newDoc(type, { projectId: p.id, customerId: p.customerId || null });
    const c = by('customers', p.customerId);
    d.client = { name: c ? c.name : '', phone: c ? c.phone : '', address: p.address || (c && c.address) || '' };
    d.rows = Fin.rowsFromProject(p, type).map(r => Object.assign({ id: Store.uid('r') }, r));
    if (['both', 'estimate', 'quote'].includes(type)) { d.additions = JSON.parse(JSON.stringify(p.additions || [])); d.discount = nn(p.discount) || ''; }
    if (type === 'extract') d.previous = Fin.projectFinance(db(), p).paid || '';
    if (type === 'quote') d.notes = db().settings.quoteTerms || '';
    // دفعات المشروع تظهر كمدفوع في الفاتورة لو الفاتورة بتغطي المشروع كله بس (مش فاتورة مصنعية لجزء منه)
    d.showProjectPaid = Math.abs(Calc.docTotals(d).total - Fin.projectFinance(db(), p).value) < 0.01;
    if (!d.rows.length) UI.toast(`⚠️ مفيش بنود ${type === 'supply' ? 'توريد' : (type === 'labor' ? 'مصنعية' : '')} في المشروع — ضيف البنود يدوي`, 'err');
    openEditor(d);
  }

  /* ================= محرر المستند ================= */
  function openEditor(doc) {
    const st = JSON.parse(JSON.stringify(doc));
    if (!st.client) st.client = { name: '', phone: '', address: '' };
    if (!st.supplier) st.supplier = { name: '', phone: '' };
    let timer = null;
    const worth = () => st.rows.length || st.client.name || st.customerId || (st.supplier && st.supplier.name);
    // حفظ تلقائي: أي تعديل بيتحفظ لوحده (مفيش بيانات بتضيع)
    const autosave = (now) => {
      clearTimeout(timer);
      const go = () => { if (worth() && saveDoc(st)) { const s = document.querySelector('[data-saved]'); if (s) s.textContent = '✓ محفوظ تلقائياً · رقم ' + st.number; } };
      if (now) go(); else timer = setTimeout(go, 500);
    };
    // المستند اللي اتعمل من مشروع (فيه بنود) بيتحفظ فوراً برقمه
    if (!st.id && st.projectId && st.rows.length) autosave(true);
    UI.openPage({
      title: docTitle(st),
      onClose: () => { clearTimeout(timer); if (worth()) saveDoc(st); },
      render(body, page) {
        const isP = st.type === 'purchase';
        const p = st.projectId && by('projects', st.projectId);
        const c = st.customerId && by('customers', st.customerId);
        const t = totalsOf(st);
        page.setTitle(docTitle(st), st.number ? 'رقم ' + st.number : 'جديد');
        page.setActions([{ icon: 'printer', label: 'معاينة وطباعة PDF', accent: true, onClick: () => { autosave(true); printDoc(st); } }]);
        const sellsStock = T[st.type].sells && !st.projectId;
        body.innerHTML = `
          <div class="card"><div class="card-title"><div class="t-ic orange">${icon(TYPE_ICONS[st.type])}</div><h2>نوع المستند</h2><span class="tag" data-saved>${st.number ? '✓ محفوظ · رقم ' + esc(st.number) : 'هيتحفظ تلقائياً'}</span></div>
            ${UI.formHTML([{ k: 'type', type: 'chips', options: Object.keys(T).map(k => [k, T[k].label]), value: st.type },
              { k: 'date', label: 'التاريخ', type: 'date', value: st.date, half: true },
              st.type === 'quote' ? { k: 'validUntil', label: 'ساري حتى', type: 'date', value: st.validUntil, half: true } : { k: 'number', label: 'الرقم', value: st.number, placeholder: 'تلقائي', half: true }])}</div>
          <div class="card"><div class="card-title"><div class="t-ic">${icon(isP ? 'store' : 'user')}</div><h2>${isP ? 'المورد' : 'العميل'}</h2>${!isP ? `<button type="button" class="btn btn-ghost btn-sm" data-act="pickC">${icon('users')} ${c ? 'تغيير' : 'من العملاء'}</button>` : ''}</div>
            ${isP ? UI.formHTML([{ k: 's_name', label: 'اسم المورد', value: st.supplier.name, half: true }, { k: 's_phone', label: 'هاتف المورد', type: 'tel', value: st.supplier.phone, half: true }])
              : (c ? `<div class="link-box" style="margin-top:0"><span class="l-ic">${icon('user')}</span><span class="l-txt"><b>${esc(c.name)}</b><span>${esc(c.phone || '')}</span></span><button type="button" class="btn btn-ghost btn-sm" data-act="unC">فك</button></div>${UI.formHTML([{ k: 'c_address', label: 'العنوان على الفاتورة', value: st.client.address || c.address || '' }])}`
                : UI.formHTML([{ k: 'c_name', label: 'اسم العميل', value: st.client.name, half: true }, { k: 'c_phone', label: 'الهاتف', type: 'tel', value: st.client.phone, half: true }, { k: 'c_address', label: 'العنوان', value: st.client.address }]))}
            <div class="field" style="margin:4px 0 0"><label>المشروع</label>${p ? `<div class="link-box" style="margin-top:0"><span class="l-ic">${icon('briefcase')}</span><span class="l-txt"><b>${esc(p.name)}</b><span>${isP ? 'تكلفتها هتتحسب على المشروع (ومش هتدخل المخزن)' : 'المستند مربوط بالمشروع ومش بيتحسب إيراد مرتين'}</span></span></div>
              <div class="btn-row" style="margin-top:8px">${isP ? '' : `<button type="button" class="chip" data-act="reload">${icon('refresh')} تحديث البنود من المشروع</button>`}<button type="button" class="chip" data-act="unP">فك الربط بالمشروع</button></div>`
              : `<button type="button" class="chip" data-act="pickP">${icon('briefcase')} ربط بمشروع${isP ? ' (مشتريات لمشروع معين)' : ''}</button><div class="hint">${isP ? 'من غير مشروع: الخامات المربوطة بالمخزن هتزود رصيده.' : 'من غير مشروع: الفاتورة بتتحسب إيراد لوحدها' + (sellsStock ? '، والخامات المربوطة بالمخزن بتتخصم منه.' : '.')}</div>`}</div></div>
          <div class="section-head"><h3>${st.type === 'extract' ? 'الأعمال المنفذة حتى تاريخه' : 'البنود'}<span class="count">${st.rows.length}</span></h3><button type="button" class="btn btn-soft btn-sm" data-act="addRow">${icon('plus')} بند</button></div>
          ${st.rows.length ? st.rows.map((r, i) => `<div class="item-card" data-row="${i}"><div class="room-num">${i + 1}</div><div class="i-info"><div class="i-name">${esc(r.name || 'بند')}${r.materialId ? ' <span class="src-badge">مخزن</span>' : ''}</div><div class="i-meta">${fmtQ(r.qty)} ${esc(r.unit || '')} × ${fmt(r.price)}${r.note ? ' · ' + esc(r.note) : ''}</div></div><div class="i-amt">${money(nn(r.qty) * nn(r.price))}</div></div>`).join('') : App.emptyHTML('list', 'ضيف البنود: اسم الشغلانة أو الخامة والكمية والسعر')}
          <div class="btn-row" style="margin-bottom:14px"><button type="button" class="btn btn-ghost" data-act="fromStock">${icon('store')} من المخزن</button><button type="button" class="btn btn-ghost" data-act="fromCat">${icon('tiles')} من أنواع الأعمال</button></div>
          <div class="card"><div class="card-title"><div class="t-ic">${icon('wallet')}</div><h2>الإجماليات</h2></div>
            ${st.additions.map((a, i) => `<div class="extra-row" style="grid-template-columns:1.6fr 1fr 40px"><input type="text" data-add="${i}" data-f="name" placeholder="إضافة (نقل، تشطيب...)" value="${esc(a.name)}"><input type="number" inputmode="decimal" min="0" step="any" data-add="${i}" data-f="amount" placeholder="المبلغ" value="${esc(a.amount)}"><button type="button" class="card-del" data-act="rmAdd" data-id="${i}">${icon('x')}</button></div>`).join('')}
            <button type="button" class="chip" style="margin-bottom:12px" data-act="addAdd">${icon('plus')} إضافة مبلغ</button>
            ${UI.formHTML([
              { k: 'discount', label: `الخصم (${UI.curSym()})`, type: 'number', value: st.discount, half: true },
              st.type === 'extract' ? { k: 'deductions', label: 'استقطاعات (تأمين / ضمان)', type: 'number', value: st.deductions, half: true }
                : (t.linkedPaid ? { html: `<div class="field"><label>المدفوع</label><div class="note" style="padding:12px">${money(t.projectPaid)}<br><small>من دفعات المشروع</small></div></div>` } : { k: 'paid', label: isP ? 'المدفوع للمورد' : `المدفوع (${UI.curSym()})`, type: 'number', value: st.paid, half: true }),
              st.type === 'extract' ? { k: 'previous', label: 'ما تم صرفه سابقاً', type: 'number', value: st.previous, hint: p ? 'اتحط تلقائياً من دفعات المشروع — تقدر تعدله' : '' } : null,
              p && T[st.type].revenue ? { k: 'showProjectPaid', label: 'اعرض دفعات المشروع كمدفوع في الفاتورة', type: 'switch', value: st.showProjectPaid !== false } : null
            ])}
            <div class="sum-list">${App.rowLine('إجمالي البنود', money(t.subtotal))}${t.additions ? App.rowLine('الإضافات', '+ ' + money(t.additions)) : ''}${t.discount ? App.rowLine('الخصم', '- ' + money(t.discount), 'minus') : ''}${App.rowLine('الإجمالي', money(t.total), 'bold')}
              ${st.type === 'extract' ? App.rowLine('ما تم صرفه سابقاً', '- ' + money(t.previous), 'minus') + (t.deductions ? App.rowLine('استقطاعات', '- ' + money(t.deductions), 'minus') : '') : (t.paid ? App.rowLine('المدفوع', '- ' + money(t.paid), 'minus') : '')}</div>
            <div class="sum-total"><span>${st.type === 'extract' ? 'صافي المستحق بالمستخلص' : (T[st.type].revenue || isP ? 'المتبقي' : 'الإجمالي')}</span><strong>${money(st.type === 'extract' ? t.due : (T[st.type].revenue || isP ? t.remaining : t.total))}</strong></div></div>
          ${UI.formHTML([{ k: 'notes', label: 'ملاحظات تظهر في المستند', type: 'textarea', optional: true, value: st.notes, placeholder: db().settings.invoiceNotes || 'مثال: شامل التسوية والترويبة' }])}
          <div class="stack">
            <button type="button" class="btn btn-accent" data-act="print">${icon('printer')} معاينة وطباعة / حفظ PDF</button>
            <div class="btn-row"><button type="button" class="btn btn-wa" data-act="wa">${icon('send')} إرسال واتساب</button><button type="button" class="btn btn-ghost" data-act="copy">${icon('copy')} نسخ كنص</button></div>
            <div class="btn-row"><button type="button" class="btn btn-soft" data-act="dup">${icon('copy')} نسخة جديدة منه</button>${st.id ? `<button type="button" class="btn btn-danger" data-act="del">${icon('trash')} حذف</button>` : '<span></span>'}</div>
          </div>`;
        const sync = () => {
          const o = UI.readForm(body);
          ['date', 'validUntil', 'number', 'discount', 'paid', 'previous', 'deductions', 'notes'].forEach(k => { if (k in o) st[k] = o[k]; });
          if ('showProjectPaid' in o) st.showProjectPaid = o.showProjectPaid;
          if ('s_name' in o) { st.supplier.name = o.s_name; st.supplier.phone = o.s_phone; }
          if ('c_name' in o) { st.client.name = o.c_name; st.client.phone = o.c_phone; }
          if ('c_address' in o) st.client.address = o.c_address;
          body.querySelectorAll('[data-add]').forEach(i => { st.additions[+i.dataset.add][i.dataset.f] = i.value.trim(); });
          if (!st.number && st.id) st.number = Store.nextNumber(st.type, T[st.type].prefix);
        };
        body.querySelectorAll('input,textarea,select').forEach(i => i.addEventListener(i.type === 'checkbox' ? 'change' : 'input', () => { sync(); autosave(); if (i.type === 'checkbox' || /discount|paid|previous|deductions/.test(i.dataset.k || '') || i.dataset.add) refreshTotals(); }));
        let rt = null;
        const refreshTotals = () => { clearTimeout(rt); rt = setTimeout(() => { if (document.activeElement && body.contains(document.activeElement) && document.activeElement.tagName === 'INPUT') { const k = document.activeElement.dataset.k, a = document.activeElement.dataset.add, f = document.activeElement.dataset.f; page.refresh(); const sel = k ? `[data-k="${k}"]` : `[data-add="${a}"][data-f="${f}"]`; const n = body.querySelector(sel); if (n) { n.focus(); const L = n.value.length; try { n.setSelectionRange(L, L); } catch (e) {} } } else page.refresh(); }, 700); };
        UI.bindChips(body, (k, v) => { sync(); if (k === 'type') { st.type = v; if (st.number) { st.number = Store.nextNumber(v, T[v].prefix); } } autosave(true); page.refresh(); });
        body.querySelectorAll('[data-row]').forEach(el => { el.onclick = () => { sync(); openRowSheet(st, +el.dataset.row, () => { autosave(true); page.refresh(); }); }; });
        App.bindActions(body, {
          pickC: () => { sync(); App.pickCustomer(id => { st.customerId = id; const cc = by('customers', id); st.client = { name: cc.name, phone: cc.phone || '', address: st.client.address || cc.address || '' }; autosave(true); page.refresh(); }); },
          unC: () => { sync(); const cc = by('customers', st.customerId); st.client = { name: cc ? cc.name : '', phone: cc ? cc.phone : '', address: st.client.address }; st.customerId = null; autosave(true); page.refresh(); },
          pickP: () => { sync(); App.pickProject(pid => { const pr = by('projects', pid); st.projectId = pid; if (!st.customerId && pr.customerId && st.type !== 'purchase') { st.customerId = pr.customerId; } if (!st.client.address) st.client.address = pr.address || ''; autosave(true); page.refresh(); }); },
          unP: () => { sync(); UI.confirm(T[st.type].revenue ? 'فك الربط؟ الفاتورة هتتحسب إيراد منفصل لوحدها (زيادة على قيمة المشروع).' : 'فك ربط المستند بالمشروع؟', () => { st.projectId = null; autosave(true); page.refresh(); }, { yes: 'فك الربط', safe: true }); },
          reload: () => { sync(); UI.confirm('استبدال البنود الحالية ببنود المشروع؟', () => { const pr = by('projects', st.projectId); st.rows = Fin.rowsFromProject(pr, st.type).map(r => Object.assign({ id: Store.uid('r') }, r)); autosave(true); page.refresh(); }, { yes: 'استبدال', safe: true }); },
          addRow: () => { sync(); openRowSheet(st, null, () => { autosave(true); page.refresh(); }); },
          fromStock: () => { sync(); Mods.pickMaterial(m => { openRowSheet(st, null, () => { autosave(true); page.refresh(); }, { name: Mods.materialLabel(m), unit: m.unit, price: st.type === 'purchase' ? m.buyPrice : m.sellPrice, materialId: m.id, qty: '' }); }); },
          fromCat: () => { sync(); App.pickFloorType(ft => openRowSheet(st, null, () => { autosave(true); page.refresh(); }, { name: ft.name, unit: ft.unit, price: st.type === 'supply' ? (ft.materialPrice || '') : (st.type === 'labor' ? (ft.laborPrice || '') : (nn(ft.laborPrice) + nn(ft.materialPrice) || '')), qty: '' })); },
          addAdd: () => { sync(); st.additions.push({ name: '', amount: '' }); page.refresh(); },
          rmAdd: i => { sync(); st.additions.splice(+i, 1); autosave(true); page.refresh(); },
          print: () => { sync(); autosave(true); printDoc(st); },
          wa: () => { sync(); autosave(true); UI.openWhatsApp(docText(st), clientOf(st).phone); },
          copy: () => { sync(); UI.copyText(docText(st), '✔️ تم نسخ الفاتورة كنص'); },
          dup: () => { sync(); autosave(true); const cp = JSON.parse(JSON.stringify(st)); cp.id = null; cp.number = ''; cp.date = Store.todayISO(); cp.rows.forEach(r => { r.id = Store.uid('r'); }); UI.closeThen(1, () => { openEditor(cp); UI.toast('نسخة جديدة — هتتحفظ برقم جديد'); }); },
          del: () => confirmDelete(by('docs', st.id), () => { st.rows = []; st.client = { name: '' }; st.customerId = null; st.supplier = { name: '' }; st.id = null; UI.back(); })
        });
      }
    });
  }
  function openRowSheet(st, index, done, preset) {
    const orig = index != null ? st.rows[index] : null;
    const r = orig ? Object.assign({}, orig) : Object.assign({ id: Store.uid('r'), name: '', note: '', qty: '', unit: 'م²', price: '', materialId: null }, preset || {});
    UI.openSheet({
      title: orig ? 'تعديل البند' : 'إضافة بند', autofocus: !preset,
      refreshBelow: false,
      render(body, sheet) {
        const mat = r.materialId && by('materials', r.materialId);
        body.innerHTML = UI.formHTML([
          { k: 'name', label: 'البيان', placeholder: 'مثال: تركيب بورسلين 60×60', value: r.name },
          { k: 'qty', label: st.type === 'extract' ? 'الكمية المنفذة' : 'الكمية', type: 'number', value: r.qty, half: true },
          { k: 'price', label: `سعر الوحدة (${UI.curSym()})`, type: 'number', value: r.price, half: true },
          { k: 'unit', label: 'الوحدة', type: 'chips', options: Calc.UNITS.map(u => [u, u]), value: r.unit },
          { k: 'note', label: 'ملاحظة تحت البند', optional: true, value: r.note },
          { html: mat ? `<div class="ok-box" style="margin:0 0 12px">مربوط بالمخزن: <b>${esc(Mods.materialLabel(mat))}</b> — المتاح ${fmtQ(Fin.stockOf(db(), mat.id))} ${esc(mat.unit || '')} <button type="button" class="link-btn" data-act="unlink">فك الربط</button></div>` : '' },
          { html: `<div class="live-total" data-live></div><div class="btn-row"><button type="button" class="btn btn-primary" data-act="save">${icon('check')} حفظ البند</button><button type="button" class="btn btn-ghost" data-act="cancel">إلغاء</button></div>${orig ? `<div class="btn-row" style="margin-top:10px"><button type="button" class="btn btn-soft" data-act="up">${icon('arrowUp')} لفوق</button><button type="button" class="btn btn-danger" data-act="del">${icon('trash')} حذف</button></div>` : ''}` }
        ]);
        const live = () => { Object.assign(r, UI.readForm(body), { unit: r.unit }); body.querySelector('[data-live]').innerHTML = `<span>${fmtQ(r.qty)} × ${fmt(r.price)}</span><strong>${money(nn(r.qty) * nn(r.price))}</strong>`; };
        body.querySelectorAll('input').forEach(i => i.addEventListener('input', live));
        UI.bindChips(body, (k, v) => { r[k] = v; });
        live();
        App.bindActions(body, {
          cancel: () => UI.back(),
          unlink: () => { live(); r.materialId = null; sheet.refresh(); },
          up: () => { if (index > 0) { st.rows.splice(index, 1); st.rows.splice(index - 1, 0, orig); } UI.closeThen(1, done); },
          del: () => { st.rows.splice(index, 1); UI.closeThen(1, done); },
          save: () => {
            live();
            if (!r.name) { UI.toast('⚠️ اكتب البيان', 'err'); return; }
            if (!(nn(r.qty) > 0)) { UI.toast('⚠️ اكتب الكمية', 'err'); return; }
            r.qty = nn(r.qty); r.price = nn(r.price);
            if (orig) st.rows[index] = r; else st.rows.push(r);
            UI.closeThen(1, done);
          }
        });
      }
    });
  }

  /* ================= الطباعة (ورقة A4 بنفس مقاس الطباعة) ================= */
  const CE = 'contenteditable="true"';
  let printFont = 13, printPad = 5;
  function applyPrintVars() { document.documentElement.style.setProperty('--p-font-size', printFont + 'px'); document.documentElement.style.setProperty('--p-cell-pad-v', printPad + 'px'); }
  function autoFit(rows) {
    if (rows <= 10) { printFont = 13.5; printPad = 5; } else if (rows <= 18) { printFont = 12.5; printPad = 3.5; } else if (rows <= 26) { printFont = 11.5; printPad = 2.5; } else { printFont = 10.5; printPad = 1.8; }
    applyPrintVars();
  }
  function pField(ic, label, value, wide) { return `<div class="inv-field${wide ? ' wide' : ''}"><span class="ic">${icon(ic)}</span><div style="min-width:0"><div class="lbl">${label}</div><div class="val" ${CE}>${value}</div></div></div>`; }
  function headerHTML(tag, number, date, extra) {
    const s = db().settings;
    const showLogo = s.showLogo && s.logo;
    return `<header class="inv-head"><div class="inv-brand">${showLogo ? `<div class="inv-logo"><img src="${s.logo}" alt=""></div>` : ''}<div style="min-width:0">
        <h1 ${CE}>${esc(s.bizName || 'أعمال الأرضيات والتشطيبات')}</h1>
        ${s.ownerName ? `<p ${CE}>${esc(s.ownerName)}</p>` : ''}
        ${s.phone || s.phone2 ? `<p ${CE}>هاتف: <b dir="ltr">${esc([s.phone, s.phone2].filter(Boolean).join(' - '))}</b></p>` : ''}
        ${s.address ? `<p ${CE}>${esc(s.address)}</p>` : ''}</div></div>
      <div class="inv-doc"><span class="tag" ${CE}>${esc(tag)}</span>${number ? `<span class="d" ${CE}>رقم: <b dir="ltr">${esc(number)}</b></span>` : ''}<span class="d" ${CE}>التاريخ: <b>${esc(fmtDate(date) || '-')}</b></span>${extra || ''}</div></header><div class="inv-stripe"></div>`;
  }
  function footerHTML() {
    const s = db().settings;
    return `<footer class="inv-foot"><span ${CE}>شكراً لثقتكم — <b>${esc(s.bizName || s.ownerName || '')}</b>${s.phone ? ` · <span dir="ltr">${esc(s.phone)}</span>` : ''}</span><span>صدرت بواسطة تطبيق <b>أرزقي للأرضيات</b></span></footer>`;
  }
  function signHTML(a, b) { return `<div class="inv-sign"><div ${CE}>${a || 'توقيع القائم بالأعمال'}</div><div ${CE}>${b || 'اعتماد العميل'}</div></div>`; }
  function notesHTML(list) { list = list.filter(Boolean); return list.length ? `<div class="inv-notes" ${CE}><h4>ملاحظات</h4><ul>${list.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''; }

  function openPrint(html, jobName) {
    let pageRef = null;
    UI.openPage({
      title: 'معاينة قبل الطباعة', sub: 'A4 · اضغط على أي نص لتعديله قبل الطباعة',
      actions: [
        { icon: 'minus', label: 'تصغير الخط', onClick: () => { printFont = Math.max(9, printFont - 0.6); printPad = Math.max(1.5, printPad - 0.5); applyPrintVars(); fit(); } },
        { icon: 'plus', label: 'تكبير الخط', onClick: () => { printFont = Math.min(16, printFont + 0.6); printPad = Math.min(10, printPad + 0.5); applyPrintVars(); fit(); } },
        { icon: 'printer', label: 'طباعة / حفظ PDF', accent: true, onClick: () => doPrint(jobName) }
      ],
      onClose: () => window.removeEventListener('resize', fit),
      render(body, page) {
        pageRef = page;
        page.el.classList.add('print-page');
        body.innerHTML = `<button type="button" class="btn btn-accent" style="margin-bottom:10px" data-print>${icon('printer')} طباعة / حفظ PDF</button>
          <div class="page-label">في نافذة الطباعة اختار «حفظ كـ PDF» علشان تحفظ الملف أو تبعته واتساب</div>
          <div id="printViewport"><div id="printSheet" class="show-edit-borders">${html}</div></div>`;
        body.querySelector('[data-print]').onclick = () => doPrint(jobName);
        setTimeout(fit, 30);
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
      }
    });
    function fit() {
      if (!pageRef) return;
      const vp = pageRef.el.querySelector('#printViewport'), sh = pageRef.el.querySelector('#printSheet');
      if (!vp || !sh) return;
      const cs = getComputedStyle(pageRef.body);
      const avail = Math.min(pageRef.body.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight), 900);
      const w = sh.offsetWidth, scale = Math.min(1, avail / w);
      sh.style.transform = `scale(${scale})`;
      vp.style.width = (w * scale) + 'px'; vp.style.height = (sh.offsetHeight * scale) + 'px';
    }
    window.addEventListener('resize', fit);
  }
  function doPrint(jobName) {
    const old = document.title;
    document.title = jobName || 'أرزقي للأرضيات';
    if (root.HFloorApp && typeof root.HFloorApp.print === 'function') { try { root.HFloorApp.print(document.title); } catch (e) { UI.toast('⚠️ تعذرت الطباعة', 'err'); } }
    else { try { window.print(); } catch (e) { UI.toast('⚠️ الطباعة مش متاحة في المتصفح ده', 'err'); } }
    setTimeout(() => { document.title = old; }, 1500);
  }

  function printDoc(d) {
    const t = totalsOf(d);
    const cl = clientOf(d);
    const isP = d.type === 'purchase', isX = d.type === 'extract';
    autoFit(d.rows.length);
    const rows = d.rows.map((r, i) => `<tr><td class="idx" ${CE}>${i + 1}</td><td class="room-col" ${CE}>${esc(r.name)}${r.note ? `<span class="sub-note">${esc(r.note)}</span>` : ''}</td><td ${CE}>${fmtQ(r.qty)}</td><td ${CE}>${esc(r.unit || '')}</td><td ${CE}>${fmt(r.price)}</td><td class="money" ${CE}>${fmt(nn(r.qty) * nn(r.price))}</td></tr>`).join('');
    const p = d.projectId && by('projects', d.projectId);
    const fields = isP
      ? [pField('store', 'المورد', esc(d.supplier.name || '-')), pField('phone', 'هاتف المورد', `<span dir="ltr">${esc(d.supplier.phone || '-')}</span>`)]
      : [pField('user', 'العميل', esc(cl.name || '-')), pField('phone', 'الهاتف', `<span dir="ltr">${esc(cl.phone || '-')}</span>`)];
    if (p) fields.push(pField('briefcase', 'المشروع', esc(p.name), !cl.address));
    if (cl.address && !isP) fields.push(pField('pin', 'العنوان', esc(cl.address), !p));
    const totals = [
      ['إجمالي البنود', fmt(t.subtotal)],
      t.additions ? ['إضافات', '+ ' + fmt(t.additions)] : null,
      t.discount ? ['الخصم', '- ' + fmt(t.discount), 'minus'] : null,
      (t.additions || t.discount) ? ['الإجمالي', fmt(t.total), 'sub'] : null,
      isX ? ['ما تم صرفه سابقاً', '- ' + fmt(t.previous), 'minus'] : null,
      isX && t.deductions ? ['استقطاعات', '- ' + fmt(t.deductions), 'minus'] : null,
      !isX && t.paid ? ['المدفوع', '- ' + fmt(t.paid), 'paid'] : null
    ].filter(Boolean);
    const netLabel = isX ? 'صافي المستحق بالمستخلص' : (T[d.type].revenue || isP ? (t.paid ? 'المتبقي المطلوب' : 'الإجمالي المطلوب') : 'إجمالي القيمة');
    const netVal = isX ? t.due : (T[d.type].revenue || isP ? t.remaining : t.total);
    const notes = [d.notes, d.type === 'quote' && d.validUntil ? `العرض ساري حتى ${fmtDate(d.validUntil)}` : '', db().settings.invoiceNotes && !isP ? db().settings.invoiceNotes : ''];
    const html = `${headerHTML(docTitle(d), d.number, d.date, `<span class="d">العملة: <b>${esc(UI.curSym())}</b></span>`)}
      <section class="inv-client">${fields.join('')}</section>
      <h2 class="inv-sec"><span class="n">1</span><span ${CE}>${isX ? 'الأعمال المنفذة حتى تاريخه' : (isP ? 'الأصناف المشتراة' : 'تفاصيل البنود')}</span></h2>
      <table class="p-table"><thead><tr><th ${CE}>م</th><th ${CE}>البيان</th><th ${CE}>${isX ? 'الكمية المنفذة' : 'الكمية'}</th><th ${CE}>الوحدة</th><th ${CE}>سعر الوحدة</th><th ${CE}>الإجمالي</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="6">لا توجد بنود</td></tr>'}</tbody>
        <tfoot><tr><td colspan="5" style="text-align:right" ${CE}>إجمالي البنود (${d.rows.length} بند)</td><td class="money" ${CE}>${fmt(t.subtotal)}</td></tr></tfoot></table>
      <div class="inv-bottom"><div class="inv-side">${notesHTML(notes)}${signHTML(isP ? 'توقيع المستلم' : null, isP ? 'توقيع المورد' : null)}</div>
        <div class="inv-totals"><table class="p-totals-table">${totals.map(([l, v, c]) => `<tr${c ? ` class="${c}"` : ''}><td ${CE}>${l}</td><td ${CE}>${v} ${esc(UI.curSym())}</td></tr>`).join('')}</table>
        <div class="inv-net"><span ${CE}>${netLabel}</span><strong ${CE}>${money(netVal)}</strong></div></div></div>
      ${footerHTML()}`;
    // أرزقي: الفاتورة الموحدة لكل مستندات العميل (فاتورة المشتريات من المورد بتفضل زي ما هي)
    if (root.ArzaqiInvoice && !isP) {
      const tmp = document.createElement('div'); tmp.innerHTML = html;
      const h = root.ArzaqiInvoice.harvest(tmp);
      const s = db().settings;
      const c = d.customerId && by('customers', d.customerId);
      const billable = !!T[d.type].revenue;
      const lines = [[d.type === 'supply' ? 'الخامات (على العميل)' : (isX ? 'إجمالي الأعمال المنفذة' : 'إجمالي البنود'), t.subtotal]];
      if (t.additions) lines.push(['إضافات', t.additions, '+']);
      if (t.discount) lines.push(['الخصم', t.discount, '-']);
      if (isX && t.previous) lines.push(['ما تم صرفه سابقاً', t.previous, '-']);
      if (isX && t.deductions) lines.push(['استقطاعات', t.deductions, '-']);
      const azHtml = root.ArzaqiInvoice.render({
        section: 'flooring', docKey: d.id || d.number, docLabel: docTitle(d), number: d.number, date: fmtDate(d.date), billable,
        business: { name: s.bizName || s.ownerName, trade: s.bizName ? s.ownerName : '', phone: [s.phone, s.phone2].filter(Boolean).join(' - '), logo: s.showLogo ? s.logo : '' },
        client: { name: cl.name, phone: cl.phone, address: cl.address, note: c ? c.note : '' },
        chips: p ? [`<span class="inv-chip navy" ${CE}>المشروع: <b>${esc(p.name)}</b></span>`] : [],
        bodyHTML: h.bodyHTML, notesHTML: notesHTML(notes), money,
        totals: { lines, total: isX ? t.due : t.total, paid: t.paid, paidLabel: t.linkedPaid ? 'الواصل من العميل (على المشروع)' : 'الواصل من العميل' },
        netLabel: isX ? 'صافي المستحق بالمستخلص' : 'إجمالي ' + docTitle(d)
      });
      openPrint(azHtml, `${docTitle(d)} ${d.number || ''} ${cl.name || ''}`.trim());
      return;
    }
    openPrint(html, `${docTitle(d)} ${d.number || ''} ${cl.name || ''}`.trim());
  }

  function printReceipt(x) {
    if (!x) return;
    const p = x.projectId && by('projects', x.projectId);
    const c = by('customers', x.customerId || (p && p.customerId));
    const f = p ? Fin.projectFinance(db(), p) : null;
    const a = !p && c ? Fin.customerAccount(db(), c) : null;
    autoFit(4);
    const html = `${headerHTML('إيصال استلام نقدية', x.number, x.date)}
      <section class="inv-client">${pField('user', 'استلمنا من السيد / السادة', esc(c ? c.name : '-'), true)}${p ? pField('briefcase', 'عن مشروع', esc(p.name), true) : ''}</section>
      <div class="receipt-amount"><span ${CE}>مبلغ وقدره</span><strong ${CE}>${money(x.amount)}</strong><small ${CE}>${esc(Fin.PAY_KINDS[x.kind] || 'دفعة')}${x.method ? ' — ' + esc(x.method) : ''}</small></div>
      ${x.note ? `<div class="inv-notes" ${CE} style="margin-bottom:12px"><h4>البيان</h4>${esc(x.note)}</div>` : ''}
      ${f ? `<div class="inv-totals" style="margin-bottom:14px"><table class="p-totals-table"><tr><td>قيمة المشروع</td><td>${money(f.value)}</td></tr><tr class="paid"><td>إجمالي المدفوع حتى تاريخه</td><td>${money(f.paid)}</td></tr></table><div class="inv-net"><span>المتبقي</span><strong>${money(f.remaining)}</strong></div></div>`
        : (a ? `<div class="inv-totals" style="margin-bottom:14px"><table class="p-totals-table"><tr><td>إجمالي حساب العميل</td><td>${money(a.value)}</td></tr><tr class="paid"><td>إجمالي المدفوع</td><td>${money(a.paid)}</td></tr></table><div class="inv-net"><span>الرصيد المتبقي</span><strong>${money(a.balance)}</strong></div></div>` : '')}
      ${signHTML('توقيع المستلم', 'توقيع الدافع')}${footerHTML()}`;
    openPrint(html, `إيصال ${x.number || ''} ${c ? c.name : ''}`);
  }

  function printStatement(c) {
    const s = Fin.customerStatement(db(), c);
    autoFit(s.lines.length);
    const html = `${headerHTML('كشف حساب عميل', '', Store.todayISO())}
      <section class="inv-client">${pField('user', 'العميل', esc(c.name))}${pField('phone', 'الهاتف', `<span dir="ltr">${esc(c.phone || '-')}</span>`)}${c.address ? pField('pin', 'العنوان', esc(c.address), true) : ''}</section>
      <h2 class="inv-sec"><span class="n">1</span><span ${CE}>حركة الحساب</span></h2>
      <table class="p-table"><thead><tr><th>م</th><th>التاريخ</th><th>البيان</th><th>عليه</th><th>دفع</th><th>الرصيد</th></tr></thead>
        <tbody>${s.lines.map((l, i) => `<tr><td class="idx">${i + 1}</td><td ${CE}>${esc(fmtDate(l.date))}</td><td class="room-col" ${CE}>${esc(l.text)}</td><td ${CE}>${l.debit ? fmt(l.debit) : '-'}</td><td ${CE}>${l.credit ? fmt(l.credit) : '-'}</td><td class="money" ${CE}>${fmt(l.balance)}</td></tr>`).join('') || '<tr><td colspan="6">لا توجد حركات</td></tr>'}</tbody></table>
      <div class="inv-bottom"><div class="inv-side">${signHTML()}</div><div class="inv-totals"><table class="p-totals-table"><tr><td>إجمالي قيمة الأعمال</td><td>${money(s.account.value)}</td></tr><tr class="paid"><td>إجمالي المدفوع</td><td>${money(s.account.paid)}</td></tr></table>
        <div class="inv-net"><span>${s.account.balance >= 0 ? 'الرصيد المستحق' : 'رصيد للعميل'}</span><strong>${money(Math.abs(s.account.balance))}</strong></div></div></div>${footerHTML()}`;
    openPrint(html, `كشف حساب ${c.name}`);
  }

  function printProfitReport(p) {
    const f = Fin.projectFinance(db(), p);
    const c = by('customers', p.customerId);
    autoFit(f.items.rows.length + 8);
    const items = f.items.rows.map((r, i) => `<tr><td class="idx">${i + 1}</td><td class="room-col" ${CE}>${esc(r.item.name)}</td><td ${CE}>${esc(Calc.itemQtyText(r.item, fmtQ))}</td><td ${CE}>${fmt(r.labor)}</td><td ${CE}>${fmt(r.material)}</td><td class="money" ${CE}>${fmt(r.total)}</td></tr>`).join('');
    const costs = [['خامات (تكلفتك)', f.materialsCost], ['أجور العمال', f.wages]].concat(Object.entries(f.expensesByCat).map(([k, v]) => [Fin.EXPENSE_CATS[k], v])).concat(f.purchasesCost ? [['فواتير مشتريات للمشروع', f.purchasesCost]] : []);
    const html = `${headerHTML('تقرير أرباح مشروع', '', Store.todayISO())}
      <section class="inv-client">${pField('briefcase', 'المشروع', esc(p.name))}${pField('user', 'العميل', esc(c ? c.name : '-'))}${pField('calendar', 'الحالة', esc(Fin.STATUSES[p.status || 'new']))}${pField('calendar', 'البداية / التسليم', esc([fmtDate(p.startDate), fmtDate(p.dueDate)].filter(Boolean).join(' ← ') || '-'))}</section>
      <h2 class="inv-sec"><span class="n">1</span><span>الإيرادات (بنود المشروع)</span></h2>
      <table class="p-table"><thead><tr><th>م</th><th>البند</th><th>الكمية</th><th>مصنعية</th><th>خامات</th><th>الإجمالي</th></tr></thead><tbody>${items || '<tr><td colspan="6">لا توجد بنود</td></tr>'}</tbody>
        <tfoot><tr><td colspan="5" style="text-align:right">قيمة المشروع${f.additions ? ' + إضافات ' + fmt(f.additions) : ''}${f.discount ? ' − خصم ' + fmt(f.discount) : ''}</td><td class="money">${fmt(f.value)}</td></tr></tfoot></table>
      <h2 class="inv-sec"><span class="n">2</span><span>التكاليف</span></h2>
      <table class="p-table"><thead><tr><th>م</th><th>البند</th><th>المبلغ</th></tr></thead><tbody>${costs.map(([l, v], i) => `<tr><td class="idx">${i + 1}</td><td class="room-col">${esc(l)}</td><td class="money">${fmt(v)}</td></tr>`).join('')}</tbody>
        <tfoot><tr><td colspan="2" style="text-align:right">إجمالي التكاليف</td><td class="money">${fmt(f.cost)}</td></tr></tfoot></table>
      <div class="inv-bottom"><div class="inv-side">${notesHTML(['صافي الربح = إجمالي الإيرادات − إجمالي التكاليف', 'خامات العميل غير محسوبة ضمن التكاليف', f.clientMaterials.length ? `خامات مملوكة للعميل: ${f.clientMaterials.map(m => m.name + ' ' + fmtQ(m.qty) + ' ' + (m.unit || '')).join('، ')}` : ''])}</div>
        <div class="inv-totals"><table class="p-totals-table"><tr><td>إجمالي الإيرادات</td><td>${money(f.value)}</td></tr><tr class="minus"><td>إجمالي التكاليف</td><td>- ${money(f.cost)}</td></tr><tr class="paid"><td>المحصّل من العميل</td><td>${money(f.paid)}</td></tr><tr><td>المتبقي على العميل</td><td>${money(f.remaining)}</td></tr></table>
        <div class="inv-net"><span>صافي الربح${f.value ? ` (${f.margin}%)` : ''}</span><strong>${money(f.profit)}</strong></div></div></div>${footerHTML()}`;
    openPrint(html, `تقرير أرباح ${p.name}`);
  }

  /* ================= نصوص واتساب ================= */
  function bizLine() { const s = db().settings; return [s.bizName, s.ownerName, s.phone].filter(Boolean).join(' — '); }
  function docText(d) {
    const t = totalsOf(d), cl = clientOf(d);
    const L = [`*${docTitle(d)}*${d.number ? ' رقم ' + d.number : ''}`, `التاريخ: ${fmtDate(d.date)}`];
    if (d.type === 'purchase') L.push(`المورد: ${d.supplier.name || '-'}`); else if (cl.name) L.push(`العميل: ${cl.name}`);
    const p = d.projectId && by('projects', d.projectId); if (p) L.push(`المشروع: ${p.name}`);
    L.push('', '*البنود:*');
    d.rows.forEach((r, i) => L.push(`${i + 1}. ${r.name}: ${fmtQ(r.qty)} ${r.unit || ''} × ${fmt(r.price)} = ${money(nn(r.qty) * nn(r.price))}`));
    L.push('', `إجمالي البنود: ${money(t.subtotal)}`);
    if (t.additions) L.push(`إضافات: ${money(t.additions)}`);
    if (t.discount) L.push(`خصم: ${money(t.discount)}`);
    L.push(`*الإجمالي: ${money(t.total)}*`);
    if (d.type === 'extract') { L.push(`ما تم صرفه سابقاً: ${money(t.previous)}`); if (t.deductions) L.push(`استقطاعات: ${money(t.deductions)}`); L.push(`*صافي المستحق: ${money(t.due)}*`); }
    else if (t.paid) { L.push(`المدفوع: ${money(t.paid)}`, `*المتبقي: ${money(t.remaining)}*`); }
    if (d.notes) L.push('', d.notes);
    const b = bizLine(); if (b) L.push('', b);
    return L.join('\n');
  }
  function projectWhatsAppText(p) {
    const f = Fin.projectFinance(db(), p);
    const L = [`*ملخص حساب مشروع: ${p.name}*`, ''];
    f.items.rows.forEach((r, i) => L.push(`${i + 1}. ${r.item.name}: ${Calc.itemQtyText(r.item, fmtQ)} = ${money(r.total)}`));
    L.push('');
    if (f.additions) L.push(`إضافات: ${money(f.additions)}`);
    if (f.discount) L.push(`خصم: ${money(f.discount)}`);
    L.push(`*قيمة المشروع: ${money(f.value)}*`, `المدفوع: ${money(f.paid)}`, `*المتبقي: ${money(f.remaining)}*`);
    const b = bizLine(); if (b) L.push('', b);
    return L.join('\n');
  }
  function statementText(c) {
    const s = Fin.customerStatement(db(), c);
    const L = [`*كشف حساب: ${c.name}*`, ''];
    s.lines.forEach(l => L.push(`${fmtDate(l.date)} — ${l.text}: ${l.debit ? '+' + fmt(l.debit) : '-' + fmt(l.credit)}`));
    L.push('', `إجمالي الأعمال: ${money(s.account.value)}`, `المدفوع: ${money(s.account.paid)}`, `*${s.account.balance >= 0 ? 'المتبقي' : 'رصيد لك'}: ${money(Math.abs(s.account.balance))}*`);
    const b = bizLine(); if (b) L.push('', b);
    return L.join('\n');
  }

  root.Docs = { TYPE_ICONS, newDoc, cardHTML, bindCards, openList, openNewDoc, createFromProject, openEditor, printDoc, printReceipt, printStatement, printProfitReport, docText, projectWhatsAppText, statementText };
})(typeof self !== 'undefined' ? self : this);
