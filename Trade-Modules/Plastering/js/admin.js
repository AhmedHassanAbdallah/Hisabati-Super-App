/*
 * HESABATI PLASTER — العملاء، العمال، المخزن، التقارير، الإعدادات، النسخ الاحتياطي
 */
(function () {
  'use strict';
  const U = window.UI, E = U.E, C = U.C, S = U.S, V = window.Views;
  const { esc, icon, fq, money, fmtDate } = U;
  U.BIND_ROOTS.st = () => S.db().settings;
  U.BIND_ROOTS.df = () => S.db().settings.defaults;

  /* ================= العملاء ================= */
  function clientStats(c) {
    const ps = V.realProjects().filter(p => p.clientId === c.id);
    let net = 0, rec = 0;
    ps.forEach(p => { const r = V.pcalc(p); net += r.net; rec += r.received; });
    return { ps, net, rec, due: net - rec };
  }
  let clientSearch = '';
  U.VIEWS.clients = {
    parent: () => ['more'],
    render() {
      const d = S.db();
      const all = d.clients.map(c => ({ c, s: clientStats(c) }));
      const due = all.reduce((s, x) => s + Math.max(0, x.s.due), 0);
      const html = `<section class="hero"><div class="hero-label">إجمالي المتبقي عند العملاء</div><div class="hero-value">${U.fmt(due)} <small>${esc(U.cur().sym)}</small></div>
        <div class="hero-stats"><div class="hero-stat"><span>العملاء</span><strong>${d.clients.length}</strong></div><div class="hero-stat"><span>قيمة الأعمال</span><strong>${U.fmt(all.reduce((s, x) => s + x.s.net, 0))}</strong></div><div class="hero-stat"><span>المقبوض</span><strong>${U.fmt(all.reduce((s, x) => s + x.s.rec, 0))}</strong></div></div></section>
        <button type="button" class="btn btn-accent mb" data-act="newClient">${icon('plus')} عميل جديد</button>
        <div class="field"><input type="search" id="cSearch" placeholder="ابحث بالاسم أو الرقم..." value="${esc(clientSearch)}"></div><div id="cList"></div>`;
      return { title: 'العملاء', html, after(root) { const s = root.querySelector('#cSearch'); s.oninput = () => { clientSearch = s.value; U.live(); }; } };
    },
    live() {
      const q = clientSearch.trim();
      const list = S.db().clients.filter(c => !q || [c.name, c.phone, c.address].some(x => String(x || '').includes(q))).map(c => ({ c, s: clientStats(c) }));
      const box = document.getElementById('cList');
      if (box) box.innerHTML = list.map(x => `<button type="button" class="row-card" data-act="go" data-view="client" data-args="${x.c.id}"><span class="av">${esc(U.initials(x.c.name))}</span><span class="rc-info"><span class="n">${esc(x.c.name)}</span><span class="m">${[x.c.phone, x.s.ps.length + ' مشروع'].filter(Boolean).map(esc).join(' · ')}</span></span><span class="rc-amt ${x.s.due > 0.009 ? 'due' : 'ok'}">${money(x.s.due)}<small>${x.s.due > 0.009 ? 'متبقي' : 'خالص'}</small></span></button>`).join('') || '<div class="empty"><p>لا يوجد عملاء</p></div>';
    }
  };
  U.VIEWS.client = {
    parent: () => ['clients'],
    render(cid) {
      const c = S.client(cid);
      if (!c) return { redirect: ['clients'] };
      const s = clientStats(c);
      const html = `<section class="hero"><div class="hero-label">المتبقي على العميل</div><div class="hero-value">${U.fmt(s.due)} <small>${esc(U.cur().sym)}</small></div>
        <div class="hero-stats"><div class="hero-stat"><span>المشروعات</span><strong>${s.ps.length}</strong></div><div class="hero-stat"><span>قيمة الأعمال</span><strong>${U.fmt(s.net)}</strong></div><div class="hero-stat"><span>المقبوض</span><strong>${U.fmt(s.rec)}</strong></div></div></section>
        <div class="card"><div class="kv">${c.phone ? `<div class="kv-row"><span>الهاتف</span><strong dir="ltr">${esc(c.phone)}</strong></div>` : ''}${c.address ? `<div class="kv-row"><span>العنوان</span><strong style="white-space:normal">${esc(c.address)}</strong></div>` : ''}${c.notes ? `<div class="kv-row"><span>ملاحظات</span><strong style="white-space:normal">${esc(c.notes)}</strong></div>` : ''}</div>
        <div class="btn-row mt">${c.phone ? `<a class="btn btn-wa" href="https://wa.me/${esc(waPhone(c.phone))}" target="_blank" rel="noopener">${icon('chat')} واتساب</a>` : ''}<button type="button" class="btn btn-ghost" data-act="openDoc" data-type="statement" data-cid="${c.id}">${icon('file')} كشف حساب</button></div></div>
        <div class="section-head"><h3>المشروعات<span class="count">${s.ps.length}</span></h3><button type="button" class="btn btn-soft btn-sm" data-act="newProjectFor" data-cid="${c.id}">${icon('plus')} مشروع</button></div>
        ${s.ps.map(V.projectRow).join('') || '<div class="hint">لا توجد مشروعات لهذا العميل.</div>'}`;
      return { title: c.name, sub: 'حساب العميل', html, actions: [{ icon: 'edit', act: 'editClient', data: { cid: c.id } }] };
    }
  };
  function waPhone(ph) {
    let p = String(ph || '').replace(/[^\d+]/g, '');
    if (p.startsWith('+')) return p.slice(1);
    if (p.startsWith('00')) return p.slice(2);
    const dc = String(S.db().settings.dialCode || '').replace(/\D/g, '');
    if (p.startsWith('0') && dc) return dc + p.slice(1);
    return p;
  }
  function clientForm(c) {
    const isNew = !c;
    c = c || { name: '', phone: '', address: '', notes: '' };
    U.formSheet({
      title: isNew ? 'عميل جديد' : 'بيانات العميل', values: c,
      fields: [{ k: 'name', label: 'الاسم', autofocus: true }, { k: 'phone', label: 'الهاتف', type: 'tel' }, { k: 'address', label: 'العنوان' }, { k: 'notes', label: 'ملاحظات', type: 'textarea' }],
      validate: v => v.name ? null : 'اكتب اسم العميل',
      onDelete: isNew ? null : () => { const d = S.db(); d.clients = d.clients.filter(x => x.id !== c.id); d.projects.forEach(p => { if (p.clientId === c.id) p.clientId = ''; }); S.save(); U.go('clients'); },
      deleteConfirm: 'حذف العميل؟ (مشروعاته هتفضل موجودة بدون عميل)',
      onSave(v) { if (isNew) S.db().clients.push(Object.assign({ id: S.uid() }, v)); else Object.assign(c, v); S.save(); U.rerender(); }
    });
  }

  /* ================= العمال ================= */
  U.VIEWS.workers = {
    parent: () => ['more'],
    render() {
      const d = S.db();
      const list = d.workers.map(w => ({ w, r: E.workerCalc(w, d.projects, d.workerPays) }));
      const due = list.reduce((s, x) => s + Math.max(0, x.r.due), 0);
      const html = `<section class="hero"><div class="hero-label">مستحقات العمال غير المدفوعة</div><div class="hero-value">${U.fmt(due)} <small>${esc(U.cur().sym)}</small></div>
        <div class="hero-stats"><div class="hero-stat"><span>العمال</span><strong>${d.workers.length}</strong></div><div class="hero-stat"><span>إجمالي الأجور</span><strong>${U.fmt(list.reduce((s, x) => s + x.r.earned, 0))}</strong></div><div class="hero-stat"><span>المدفوع والسلف</span><strong>${U.fmt(list.reduce((s, x) => s + x.r.paid, 0))}</strong></div></div></section>
        <div class="btn-row mb"><button type="button" class="btn btn-accent" data-act="newWorker">${icon('plus')} عامل جديد</button><button type="button" class="btn btn-ghost" data-act="payWorker">${icon('wallet')} صرف / سلفة</button></div>
        ${list.map(x => `<button type="button" class="row-card" data-act="go" data-view="worker" data-args="${x.w.id}"><span class="av">${esc(U.initials(x.w.name))}</span><span class="rc-info"><span class="n">${esc(x.w.name)} <span class="badge">${esc(x.w.role || '')}</span></span><span class="m">يومية ${U.fmt(x.w.dailyRate)} · ${fq(x.r.days)} يوم</span></span><span class="rc-amt ${x.r.due > 0.009 ? 'due' : 'ok'}">${money(x.r.due)}<small>${x.r.due >= 0 ? 'مستحق له' : 'عليه (سلف زيادة)'}</small></span></button>`).join('') || `<div class="empty"><div class="big">${icon('worker')}</div><p>سجّل المعلمين والصنايعية والمساعدين ويومياتهم.</p></div>`}`;
      return { title: 'العمال والمعلمين', html };
    }
  };
  U.VIEWS.worker = {
    parent: () => ['workers'],
    render(wid) {
      const d = S.db();
      const w = S.worker(wid);
      if (!w) return { redirect: ['workers'] };
      const r = E.workerCalc(w, d.projects, d.workerPays);
      const entries = [];
      d.projects.forEach(p => p.labor.filter(l => l.workerId === w.id).forEach(l => entries.push({ p, l })));
      entries.sort((a, b) => String(b.l.date).localeCompare(String(a.l.date)));
      const pays = d.workerPays.filter(x => x.workerId === w.id).sort((a, b) => String(b.date).localeCompare(String(a.date)));
      const html = `<section class="hero"><div class="hero-label">${r.due >= 0 ? 'المستحق له' : 'عليه (سلف زيادة)'}</div><div class="hero-value">${U.fmt(Math.abs(r.due))} <small>${esc(U.cur().sym)}</small></div>
        <div class="hero-stats"><div class="hero-stat"><span>أيام العمل</span><strong>${fq(r.days)}</strong></div><div class="hero-stat"><span>إجمالي الأجر</span><strong>${U.fmt(r.earned)}</strong></div><div class="hero-stat"><span>المدفوع (منه سلف ${U.fmt(r.advances)})</span><strong>${U.fmt(r.paid)}</strong></div></div></section>
        <div class="btn-row mb"><button type="button" class="btn btn-accent" data-act="payWorker" data-wid="${w.id}">${icon('wallet')} صرف / سلفة</button>${w.phone ? `<a class="btn btn-wa" href="https://wa.me/${esc(waPhone(w.phone))}" target="_blank" rel="noopener">${icon('chat')} واتساب</a>` : `<button type="button" class="btn btn-ghost" data-act="editWorker" data-wid="${w.id}">${icon('edit')} تعديل</button>`}</div>
        <div class="section-head"><h3>اليوميات<span class="count">${entries.length}</span></h3></div>
        ${entries.map(x => `<div class="kv-row"><span>${esc(fmtDate(x.l.date))} · ${esc(x.p.scratch ? '' : x.p.name)} · ${x.l.fixed ? 'مقطوعية' : fq(x.l.days) + ' يوم × ' + U.fmt(x.l.rate)}${x.l.note ? ' · ' + esc(x.l.note) : ''}</span><strong>${U.moneyT(x.l.fixed ? x.l.amount : E.n(x.l.days) * E.n(x.l.rate) + E.n(x.l.extra))}</strong></div>`).join('') || '<div class="hint">تتسجل اليوميات من تبويب «الحسابات» في المشروع.</div>'}
        <div class="section-head"><h3>المدفوعات والسلف<span class="count">${pays.length}</span></h3></div>
        ${pays.map(x => `<div class="kv-row"><span>${esc(fmtDate(x.date))} · ${x.type === 'advance' ? 'سلفة' : 'صرف'}${x.projectId ? ' · ' + esc((S.project(x.projectId) || {}).name || '') : ''}${x.note ? ' · ' + esc(x.note) : ''} <button type="button" class="link-btn" data-act="delWorkerPay" data-id="${x.id}">حذف</button></span><strong>${U.moneyT(x.amount)}</strong></div>`).join('') || '<div class="hint">لا توجد مدفوعات.</div>'}`;
      return { title: w.name, sub: (w.role || '') + (w.phone ? ' · ' + w.phone : ''), html, actions: [{ icon: 'edit', act: 'editWorker', data: { wid: w.id } }] };
    }
  };
  function workerForm(w) {
    const isNew = !w;
    w = w || { name: '', role: 'صنايعي', dailyRate: '', phone: '' };
    U.formSheet({
      title: isNew ? 'عامل جديد' : 'بيانات العامل', values: w,
      fields: [{ k: 'name', label: 'الاسم', autofocus: true }, { k: 'role', label: 'الوظيفة', type: 'select', options: C.WORKER_ROLES.map(x => [x, x]), half: true }, { k: 'dailyRate', label: 'اليومية', type: 'num', half: true }, { k: 'phone', label: 'الهاتف', type: 'tel' }],
      validate: v => v.name ? null : 'اكتب الاسم',
      onDelete: isNew ? null : () => { const d = S.db(); d.workers = d.workers.filter(x => x.id !== w.id); S.save(); U.go('workers'); },
      deleteConfirm: 'حذف العامل؟ (يومياته في المشروعات تفضل محسوبة)',
      onSave(v) { if (isNew) S.db().workers.push(Object.assign({ id: S.uid() }, v)); else Object.assign(w, v); S.save(); U.rerender(); }
    });
  }

  /* ================= المخزن ================= */
  let stockCat = 'all', stockQ = '';
  U.VIEWS.stock = {
    parent: () => ['more'],
    render(filter) {
      const d = S.db();
      if (filter === 'low') stockCat = 'low';
      const stats = d.materials.map(m => ({ m, s: E.stockFor(m, d.movements) }));
      const value = stats.reduce((a, x) => a + x.s.value, 0);
      const low = stats.filter(x => x.s.low).length;
      const sales = stats.reduce((a, x) => a + x.s.salesProfit, 0);
      const cats = ['all', 'low'].concat(C.MAT_CATEGORIES.filter(c => d.materials.some(m => m.category === c)));
      const html = `<section class="hero"><div class="hero-label">قيمة المخزون الحالي (بسعر الشراء)</div><div class="hero-value">${U.fmt(value)} <small>${esc(U.cur().sym)}</small></div>
        <div class="hero-stats"><div class="hero-stat"><span>الأصناف</span><strong>${d.materials.length}</strong></div><div class="hero-stat${low ? ' warn' : ''}"><span>تحت الحد الأدنى</span><strong>${low}</strong></div><div class="hero-stat"><span>ربح المبيعات</span><strong>${U.fmt(sales)}</strong></div></div></section>
        <div class="btn-row mb"><button type="button" class="btn btn-accent" data-act="quickMove">${icon('move')} حركة (شراء/بيع/صرف)</button><button type="button" class="btn btn-ghost" data-act="newMaterial">${icon('plus')} خامة جديدة</button></div>
        <div class="note mb">الأسعار ومعدلات التغطية <b>استرشادية</b> — عدّلها حسب منتجك وسوقك. أي خامة مربوطة هنا بتملأ أسعارها تلقائياً في الحاسبات.</div>
        <div class="field"><input type="search" id="sSearch" placeholder="ابحث عن خامة أو شركة..." value="${esc(stockQ)}"></div>
        <div class="chips">${cats.map(c => `<button type="button" class="chip${stockCat === c ? ' on' : ''}" data-act="stockCat" data-v="${esc(c)}">${c === 'all' ? 'الكل' : c === 'low' ? 'ناقص' : esc(c)}</button>`).join('')}</div>
        <div id="sList"></div>
        <div class="group-h"><b>آخر الحركات</b></div>
        ${d.movements.slice(-12).reverse().map(moveRow).join('') || '<div class="hint">لا توجد حركات.</div>'}`;
      return { title: 'المخزن والخامات', html, after(root) { const s = root.querySelector('#sSearch'); s.oninput = () => { stockQ = s.value; U.live(); }; } };
    },
    live() {
      const d = S.db();
      const q = stockQ.trim();
      const list = d.materials.map(m => ({ m, s: E.stockFor(m, d.movements) })).filter(x => (stockCat === 'all' || (stockCat === 'low' ? x.s.low : x.m.category === stockCat)) && (!q || [x.m.name, x.m.brand, x.m.category, x.m.supplier].some(v => String(v || '').includes(q))));
      const box = document.getElementById('sList');
      if (box) box.innerHTML = list.map(x => `<button type="button" class="row-card" data-act="go" data-view="material" data-args="${x.m.id}"><span class="av ${x.s.low ? 'orange' : 'soft'} sm">${icon('box')}</span><span class="rc-info"><span class="n">${esc(x.m.name)}${x.m.brand ? ' · ' + esc(x.m.brand) : ''} ${x.s.low ? '<span class="badge red">ناقص</span>' : ''}</span><span class="m">${esc(x.m.category)} · ${esc(x.m.unit)}${x.m.packSize ? ' ' + esc(x.m.packSize) + ' ' + esc(x.m.packUnit) : ''}${x.m.buyPrice !== '' ? ' · شراء ' + U.fmt(x.m.buyPrice) : ' · <b>بدون سعر</b>'}</span></span><span class="rc-amt">${fq(x.s.qty)}<small>${esc(x.m.unit)}</small></span></button>`).join('') || '<div class="empty"><p>لا توجد خامات</p></div>';
    }
  };
  function moveRow(mv) {
    const m = S.material(mv.materialId) || { name: 'خامة محذوفة', unit: '' };
    const t = E.MOVE_TYPES[mv.type] || { name: mv.type };
    const sign = E.MOVE_TYPES[mv.type] && E.MOVE_TYPES[mv.type].sign === 1 ? '+' : mv.type === 'adjust' ? '' : '−';
    return `<button type="button" class="row-card" data-act="editMove" data-id="${mv.id}"><span class="av sm ${sign === '+' ? 'green' : 'soft'}">${icon('move')}</span><span class="rc-info"><span class="n">${esc(m.name)}</span><span class="m">${[t.name, fmtDate(mv.date), mv.projectId ? (S.project(mv.projectId) || {}).name : '', mv.note].filter(Boolean).map(esc).join(' · ')}</span></span><span class="rc-amt">${sign}${fq(mv.qty)}<small>${esc(m.unit)}${mv.price ? ' × ' + U.fmt(mv.price) : ''}</small></span></button>`;
  }
  U.VIEWS.material = {
    parent: () => ['stock'],
    render(mid) {
      const d = S.db();
      const m = S.material(mid);
      if (!m) return { redirect: ['stock'] };
      const s = E.stockFor(m, d.movements);
      const mv = d.movements.filter(x => x.materialId === m.id).slice().reverse();
      const html = `<section class="hero"><div class="hero-label">الرصيد الحالي</div><div class="hero-value">${fq(s.qty)} <small>${esc(m.unit)}</small></div>
        <div class="hero-stats"><div class="hero-stat"><span>القيمة</span><strong>${U.fmt(s.value)}</strong></div><div class="hero-stat"><span>المصروف للمشروعات</span><strong>${fq(s.issued)}</strong></div><div class="hero-stat"><span>الهالك</span><strong>${fq(s.wasted)}</strong></div></div></section>
        ${s.low ? `<div class="alert-line">${icon('alert')}<span>الرصيد وصل للحد الأدنى (${esc(m.minQty)}) — <b>محتاج تشتري</b></span></div>` : ''}
        <div class="card"><div class="kv">
          ${[['الشركة المصنعة', m.brand], ['النوع', m.category], ['اللون', m.color], ['الحبيبات', m.grain], ['العبوة', m.packSize ? m.unit + ' ' + m.packSize + ' ' + m.packUnit : m.unit], ['معدل الاستهلاك/التغطية', m.rate !== '' && m.rate != null ? m.rate + ' ' + ({ perM2: (m.packUnit || '') + '/م²', m2PerUnit: 'م² لكل ' + (m.packUnit || 'وحدة'), m2PerPack: 'م² لكل عبوة' }[m.rateMode] || '') : ''], ['استهلاك المحارة الجاهزة', m.kgPerMm ? m.kgPerMm + ' كجم/م²/مم' : ''], ['سعر الشراء', m.buyPrice !== '' ? U.moneyT(m.buyPrice) : 'غير محدد'], ['سعر البيع', m.sellPrice !== '' ? U.moneyT(m.sellPrice) : ''], ['المورد', m.supplier], ['الحد الأدنى', m.minQty]].filter(x => x[1] !== '' && x[1] != null).map(x => `<div class="kv-row"><span>${x[0]}</span><strong>${esc(x[1])}</strong></div>`).join('')}
        </div><button type="button" class="btn btn-soft mt" data-act="editMaterial" data-mid="${m.id}">${icon('edit')} تعديل بيانات الخامة</button></div>
        <div class="btn-row three mb">
          <button type="button" class="btn btn-success btn-sm" style="width:100%" data-act="newMove" data-mid="${m.id}" data-t="purchase">+ شراء</button>
          <button type="button" class="btn btn-soft btn-sm" style="width:100%" data-act="newMove" data-mid="${m.id}" data-t="sale">− بيع</button>
          <button type="button" class="btn btn-ghost btn-sm" style="width:100%" data-act="newMove" data-mid="${m.id}" data-t="issue">صرف لمشروع</button>
          <button type="button" class="btn btn-danger btn-sm" style="width:100%" data-act="newMove" data-mid="${m.id}" data-t="waste">هالك</button>
          <button type="button" class="btn btn-ghost btn-sm" style="width:100%" data-act="newMove" data-mid="${m.id}" data-t="return">مرتجع</button>
          <button type="button" class="btn btn-ghost btn-sm" style="width:100%" data-act="newMove" data-mid="${m.id}" data-t="adjust">تسوية جرد</button>
        </div>
        <div class="group-h"><b>الحركات</b></div>${mv.map(moveRow).join('') || '<div class="hint">لا توجد حركات.</div>'}`;
      return { title: m.name, sub: m.category, html };
    }
  };
  function materialForm(m) {
    const isNew = !m;
    m = m || { name: '', brand: '', category: 'أخرى', color: '', grain: '', unit: 'عبوة', packSize: '', packUnit: 'كجم', kind: 'coverage', rateMode: 'perM2', rate: '', kgPerMm: '', buyPrice: '', sellPrice: '', supplier: '', openQty: 0, minQty: '' };
    U.formSheet({
      title: isNew ? 'خامة جديدة' : 'تعديل الخامة', values: m,
      fields: [
        { k: 'name', label: 'اسم الخامة', autofocus: isNew },
        { k: 'brand', label: 'الشركة المصنعة', half: true },
        { k: 'category', label: 'النوع', type: 'select', options: C.MAT_CATEGORIES.map(x => [x, x]), half: true },
        { k: 'color', label: 'اللون', half: true },
        { k: 'grain', label: 'الحبيبات / المقاس', half: true },
        { k: 'unit', label: 'وحدة المخزن (العبوة)', type: 'select', options: C.STOCK_UNITS.map(x => [x, x]), half: true },
        { k: 'packSize', label: 'محتوى العبوة', type: 'num', half: true },
        { k: 'packUnit', label: 'وحدة المحتوى', type: 'select', options: [['كجم', 'كجم'], ['لتر', 'لتر'], ['م²', 'م²'], ['م³', 'م³'], ['م', 'متر'], ['عدد', 'عدد']], half: true },
        { k: 'kind', label: 'تستخدم في حساب', type: 'select', half: true, options: [['coverage', 'تغطية / استهلاك'], ['premix', 'محارة جاهزة (كجم/م²/مم)'], ['cement', 'أسمنت'], ['sand', 'رمل'], ['mesh', 'شبك'], ['other', 'أخرى']] },
        { k: 'rateMode', label: 'طريقة المعدل', type: 'select', half: true, options: [['perM2', 'استهلاك لكل م²'], ['m2PerUnit', 'تغطية م² لكل كجم/لتر'], ['m2PerPack', 'تغطية م² لكل عبوة']] },
        { k: 'rate', label: 'معدل التغطية / الاستهلاك', type: 'num', half: true, hint: 'من نشرة المنتج' },
        { k: 'kgPerMm', label: 'كجم/م²/مم (للمحارة الجاهزة)', type: 'num', half: true },
        { k: 'buyPrice', label: 'سعر الشراء للعبوة', type: 'num', half: true },
        { k: 'sellPrice', label: 'سعر البيع للعبوة', type: 'num', half: true },
        { k: 'openQty', label: 'رصيد أول المدة', type: 'num', half: true },
        { k: 'minQty', label: 'الحد الأدنى للتنبيه', type: 'num', half: true },
        { k: 'supplier', label: 'المورد' }
      ],
      validate: v => v.name ? null : 'اكتب اسم الخامة',
      onDelete: isNew ? null : () => { const d = S.db(); d.materials = d.materials.filter(x => x.id !== m.id); d.movements = d.movements.filter(x => x.materialId !== m.id); S.save(); U.go('stock'); },
      deleteConfirm: 'حذف الخامة وكل حركاتها؟',
      onSave(v) {
        ['packSize', 'openQty'].forEach(k => { v[k] = v[k] === '' ? '' : E.n(v[k]); });
        if (isNew) S.db().materials.push(Object.assign({ id: S.uid() }, v)); else Object.assign(m, v);
        delete m.seed;
        S.save(); U.rerender();
      }
    });
  }
  function moveForm(mv, preset) {
    const d = S.db();
    const isNew = !mv;
    const mat0 = preset && preset.materialId ? S.material(preset.materialId) : d.materials[0];
    mv = mv || Object.assign({ materialId: mat0 ? mat0.id : '', type: 'purchase', qty: '', price: mat0 ? mat0.buyPrice : '', date: S.today(), projectId: '', note: '' }, preset || {});
    if (isNew && mv.type === 'sale' && mat0) mv.price = mat0.sellPrice;
    U.formSheet({
      title: isNew ? 'حركة مخزن' : 'تعديل الحركة', values: mv,
      fields: [
        { k: 'materialId', label: 'الخامة', type: 'select', options: d.materials.map(m => [m.id, m.name + (m.brand ? ' - ' + m.brand : '')]) },
        { k: 'type', label: 'نوع الحركة', type: 'select', options: Object.keys(E.MOVE_TYPES).map(k => [k, E.MOVE_TYPES[k].name]), half: true },
        { k: 'qty', label: 'الكمية (بوحدة المخزن)', type: 'num', half: true, autofocus: true, hint: 'التسوية: اكتب + للزيادة و − للنقص' },
        { k: 'price', label: 'السعر للوحدة', type: 'num', half: true },
        { k: 'date', label: 'التاريخ', type: 'date', half: true },
        { k: 'projectId', label: 'المشروع (للصرف/المرتجع)', type: 'select', options: [['', '—']].concat(V.realProjects().map(p => [p.id, p.name])) },
        { k: 'note', label: 'ملاحظة / المورد / العميل' }
      ],
      validate: v => E.n(v.qty) !== 0 ? null : 'اكتب الكمية',
      onOpen(sh) {
        const ms = sh.querySelector('#f_materialId'), ts = sh.querySelector('#f_type'), pr = sh.querySelector('#f_price');
        const upd = () => { const m = S.material(ms.value); if (m && isNew) pr.value = ts.value === 'sale' ? (m.sellPrice || '') : (m.buyPrice || ''); };
        ms.onchange = upd; ts.onchange = upd;
      },
      onDelete: isNew ? null : () => { d.movements = d.movements.filter(x => x.id !== mv.id); S.save(); U.rerender(); },
      onSave(v) {
        if (isNew) d.movements.push(Object.assign({ id: S.uid() }, v)); else Object.assign(mv, v);
        if (v.type === 'purchase' && E.n(v.price) > 0) { const m = S.material(v.materialId); if (m && (m.buyPrice === '' || m.buyPrice == null)) m.buyPrice = v.price; }
        S.save(); U.toast('تم تسجيل الحركة'); U.rerender();
      }
    });
  }

  /* ================= التقارير ================= */
  U.VIEWS.reports = {
    parent: () => ['more'],
    render() {
      const d = S.db();
      const rows = V.realProjects().map(p => ({ p, r: V.pcalc(p) }));
      const T = k => rows.reduce((s, x) => s + (x.r[k] || 0), 0);
      const stock = d.materials.map(m => E.stockFor(m, d.movements));
      const salesProfit = stock.reduce((s, x) => s + x.salesProfit, 0);
      const salesValue = stock.reduce((s, x) => s + x.salesValue, 0);
      const wasteValue = stock.reduce((s, x) => s + x.wasteValue, 0);
      const wDue = d.workers.reduce((s, w) => s + Math.max(0, E.workerCalc(w, d.projects, d.workerPays).due), 0);
      const exp = {};
      rows.forEach(x => Object.keys(x.r.expByCat).forEach(k => { exp[k] = (exp[k] || 0) + x.r.expByCat[k]; }));
      const html = `<section class="hero"><div class="hero-label">صافي ربح المشروعات</div><div class="hero-value">${U.fmt(T('profit'))} <small>${esc(U.cur().sym)}</small></div>
        <div class="hero-stats"><div class="hero-stat"><span>قيمة الأعمال</span><strong>${U.fmt(T('net'))}</strong></div><div class="hero-stat"><span>المقبوض</span><strong>${U.fmt(T('received'))}</strong></div><div class="hero-stat warn"><span>المتبقي</span><strong>${U.fmt(T('remaining'))}</strong></div></div></section>
        <div class="card"><div class="card-title"><div class="t-ic">${icon('chart')}</div><h2>الإيرادات والتكاليف</h2></div><div class="kv">
          <div class="kv-row bold"><span>إيرادات الأعمال (المتعاقد عليها)</span><strong>${U.moneyT(T('net'))}</strong></div>
          <div class="kv-row sub"><span>منها مصنعية</span><strong>${U.moneyT(T('labor'))}</strong></div>
          <div class="kv-row sub"><span>منها خامات موردة</span><strong>${U.moneyT(T('matSell'))}</strong></div>
          <div class="kv-row minus"><span>تكلفة الخامات</span><strong>− ${U.moneyT(T('matCost'))}</strong></div>
          <div class="kv-row minus"><span>أجور العمال</span><strong>− ${U.moneyT(T('wages'))}</strong></div>
          <div class="kv-row minus"><span>المصروفات الأخرى</span><strong>− ${U.moneyT(T('expOther'))}</strong></div>
          ${Object.keys(exp).map(k => `<div class="kv-row sub"><span>${esc(k)}</span><strong>${U.moneyT(exp[k])}</strong></div>`).join('')}
        </div><div class="total-bar green"><span>صافي ربح المشروعات</span><strong>${U.moneyT(T('profit'))}</strong></div></div>
        <div class="card"><div class="card-title"><div class="t-ic green">${icon('cash')}</div><h2>التدفق النقدي (الفعلي)</h2></div><div class="kv">
          <div class="kv-row plus"><span>المقبوض من العملاء</span><strong>${U.moneyT(T('cashIn'))}</strong></div>
          <div class="kv-row minus"><span>المدفوع (مصروفات + عمال)</span><strong>− ${U.moneyT(T('cashOut'))}</strong></div>
          <div class="kv-row bold"><span>الرصيد النقدي</span><strong>${U.moneyT(T('cashBalance'))}</strong></div>
          <div class="kv-row"><span>مستحق لك عند العملاء</span><strong>${U.moneyT(T('remaining'))}</strong></div>
          <div class="kv-row"><span>مستحق عليك للعمال</span><strong>${U.moneyT(wDue)}</strong></div>
        </div></div>
        <div class="card"><div class="card-title"><div class="t-ic violet">${icon('store')}</div><h2>تجارة الخامات</h2></div><div class="kv">
          <div class="kv-row"><span>المبيعات</span><strong>${U.moneyT(salesValue)}</strong></div>
          <div class="kv-row plus"><span>ربح المبيعات</span><strong>${U.moneyT(salesProfit)}</strong></div>
          <div class="kv-row minus"><span>قيمة الهالك</span><strong>${U.moneyT(wasteValue)}</strong></div>
          <div class="kv-row"><span>قيمة المخزون الحالي</span><strong>${U.moneyT(stock.reduce((s, x) => s + x.value, 0))}</strong></div>
        </div></div>
        <div class="section-head"><h3>المشروعات</h3><button type="button" class="btn btn-soft btn-sm" data-act="openDoc" data-type="profit">${icon('printer')} تقرير الأرباح</button></div>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>المشروع</th><th>القيمة</th><th>المقبوض</th><th>التكاليف</th><th>الربح</th></tr></thead><tbody>
        ${rows.map(x => `<tr data-act="openProject" data-pid="${x.p.id}" style="cursor:pointer"><td>${esc(x.p.name)}</td><td class="n">${U.fmt(x.r.net)}</td><td class="n">${U.fmt(x.r.received)}</td><td class="n">${U.fmt(x.r.costs)}</td><td class="n" style="color:${x.r.profit >= 0 ? 'var(--success)' : 'var(--danger)'}">${U.fmt(x.r.profit)}</td></tr>`).join('') || '<tr><td colspan="5">لا توجد مشروعات</td></tr>'}
        </tbody></table></div>`;
      return { title: 'التقارير والأرباح', html };
    }
  };

  /* ================= الإعدادات ================= */
  U.VIEWS.settings = {
    parent: () => ['more'],
    render() {
      const st = S.db().settings;
      const html = `
      <div class="card"><div class="card-title"><div class="t-ic orange">${icon('briefcase') || icon('user')}</div><h2>بياناتك على المستندات</h2></div>
        <div class="row-2">${U.inp('st:bizName', 'الاسم / اسم الشركة', { text: true, ph: 'المعلم ... للمحارة والجرافيت' })}${U.inp('st:bizPhone', 'رقم الهاتف', { text: true })}</div>
        ${U.inp('st:bizTitle', 'النشاط (يظهر تحت الاسم)', { text: true })}
        ${U.inp('st:bizAddress', 'العنوان', { text: true })}
        <div class="logo-box">${st.logo ? `<img src="${esc(st.logo)}" alt="اللوجو">` : `<div class="ph">${icon('image')}</div>`}<div style="flex:1;min-width:0"><b>لوجو المستندات</b><div class="hint" style="margin:0">${st.logo ? 'تم اختيار لوجو' : 'لم يتم اختيار لوجو'}</div></div>
          <button type="button" class="btn btn-soft btn-sm" data-act="pickLogo">اختيار</button>${st.logo ? `<button type="button" class="btn btn-danger btn-icon" data-act="removeLogo">${icon('trash')}</button>` : ''}</div>
        <input type="file" id="logoFile" accept="image/*" class="hidden">
        ${U.sw('st:showLogo', 'إظهار اللوجو على المستندات', false)}
        <div class="field"><label>شروط وملاحظات ثابتة في المقايسات والعروض</label><textarea data-bind="st:terms">${esc(st.terms || '')}</textarea></div>
        ${U.inp('st:quoteValidity', 'صلاحية عرض السعر (يوم)')}
      </div>
      <div class="card"><div class="card-title"><div class="t-ic">${icon('cash')}</div><h2>العملة والدولة</h2></div>
        ${U.sel('st:currency', 'العملة الأساسية', C.CURRENCIES.map(c => [c.code, c.country + ' — ' + c.name + ' (' + c.sym + ')']), { re: true, hint: 'بتغيّر رمز العملة والكسور العشرية فقط ولا تحوّل المبالغ — مفيش أسعار صرف ثابتة.' })}
        ${U.inp('st:dialCode', 'كود الدولة للواتساب', { text: true, ph: '20', hint: 'مصر 20 · السعودية 966 · الإمارات 971 · الكويت 965 ...' })}
      </div>
      <div class="card"><div class="card-title"><div class="t-ic">${icon('moon')}</div><h2>المظهر</h2></div>
        <div class="segmented">${[['auto', 'تلقائي'], ['light', 'فاتح'], ['dark', 'ليلي']].map(x => `<button type="button" class="${U.themeMode() === x[0] ? 'on' : ''}" data-act="setTheme" data-v="${x[0]}">${x[1]}</button>`).join('')}</div>
      </div>`;
      return {
        title: 'الإعدادات', html,
        after(root) {
          const f = root.querySelector('#logoFile');
          f.onchange = () => {
            const file = f.files && f.files[0];
            if (!file) return;
            const rd = new FileReader();
            rd.onload = () => {
              const img = new Image();
              img.onload = () => {
                const max = 360, sc = Math.min(1, max / Math.max(img.width, img.height));
                const cv = document.createElement('canvas'); cv.width = Math.round(img.width * sc); cv.height = Math.round(img.height * sc);
                cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
                S.db().settings.logo = cv.toDataURL('image/png'); S.save(); U.rerender();
              };
              img.src = rd.result;
            };
            rd.readAsDataURL(file);
          };
        }
      };
    }
  };

  U.VIEWS.defaults = {
    parent: () => ['more'],
    render() {
      const sec = (title, R, kind) => `<div class="card"><div class="card-title"><div class="t-ic orange">${icon('percent')}</div><h2>${title}</h2></div>${kind === 'cement' ? `<div class="row-3">${U.mini(R + '.thickness', 'السمك مم')}${U.mini(R + '.ratio', 'رمل لكل 1 أسمنت')}${U.mini(R + '.dryFactor', 'معامل الجاف')}</div><div class="row-3" style="margin-top:8px">${U.mini(R + '.density', 'كثافة الأسمنت')}${U.mini(R + '.bagKg', 'وزن الشيكارة')}${U.mini(R + '.waste', 'الهالك %')}</div><div class="row-2" style="margin-top:8px">${U.mini(R + '.content', 'كجم أسمنت/م³ رمل')}${U.mini(R + '.sandPerM3', 'م³ رمل/م³ مونة')}</div>`
        : kind === 'premix' ? `<div class="row-4">${U.mini(R + '.thickness', 'السمك مم')}${U.mini(R + '.kgPerMm', 'كجم/م²/مم')}${U.mini(R + '.bagKg', 'الشيكارة')}${U.mini(R + '.waste', 'الهالك %')}</div>`
          : kind === 'mesh' ? `<div class="row-3">${U.mini(R + '.rollArea', 'م² في اللفة')}${U.mini(R + '.overlap', 'تراكب %')}${U.mini(R + '.stripWidth', 'عرض الشريحة سم')}</div>`
            : `<div class="row-4">${U.mini(R + '.rate', U.bv(R + '.rateMode') === 'perM2' ? (U.bv(R + '.unit') || '') + '/م²' : 'م² لكل وحدة')}${U.mini(R + '.coats', 'الطبقات')}${U.mini(R + '.packSize', 'العبوة')}${U.mini(R + '.waste', 'الهالك %')}</div>`}</div>`;
      const html = `<div class="note orange mb"><b>مهم:</b> القيم دي <b>استرشادية</b> وبتستخدم كبداية لأي بند جديد بس — مش حقائق ثابتة. كل بند تقدر تعدّل قيمه لوحده حسب المنتج والموقع. البنود القديمة مش بتتغير.</div>
        ${sec('محارة أسمنتية داخلية', 'df:cementInt', 'cement')}${sec('محارة أسمنتية خارجية', 'df:cementExt', 'cement')}
        ${sec('محارة جاهزة Dry Mix', 'df:drymix', 'premix')}${sec('محارة جبسية', 'df:gypsum', 'premix')}
        ${sec('معجون جاهز', 'df:putty', 'cov')}${sec('معجون أسمنتي', 'df:cementPutty', 'cov')}${sec('دهارة', 'df:dahara', 'cov')}
        ${sec('برايمر', 'df:primer', 'cov')}${sec('جرافيت', 'df:graffiato', 'cov')}${sec('برايمر الجرافيت', 'df:graffitoPrimer', 'cov')}
        ${sec('دهان أكريليك خارجي', 'df:acrylic', 'cov')}${sec('طلاء مرن', 'df:elastomeric', 'cov')}${sec('تشطيب رملي', 'df:texture', 'cov')}${sec('عزل مائي', 'df:waterproof', 'cov')}${sec('شبك فايبر', 'df:mesh', 'mesh')}
        <div class="card"><div class="card-title"><div class="t-ic">${icon('ruler')}</div><h2>قاعدة خصم الفتحات الافتراضية</h2></div>
          ${U.sel('df:rules.mode', 'القاعدة', Object.keys(E.DEDUCT_MODES).map(k => [k, E.DEDUCT_MODES[k]]))}<div class="row-2">${U.inp('df:rules.threshold', 'الحد (م²)')}${U.inp('df:rules.percent', 'نسبة الخصم %')}</div></div>
        <button type="button" class="btn btn-ghost" data-act="resetDefaults">${icon('refresh')} رجوع للقيم الاسترشادية الأصلية</button>`;
      return { title: 'الافتراضات الحسابية', sub: 'قيم البداية للبنود الجديدة', html };
    }
  };

  U.VIEWS.backup = {
    parent: () => ['more'],
    render() {
      const lb = S.lastBackup();
      const html = `<div class="card"><div class="card-title"><div class="t-ic">${icon('save')}</div><h2>النسخ الاحتياطي</h2></div>
        <div class="note mb">كل بياناتك محفوظة على الموبايل ده بس (بدون إنترنت). اعمل نسخة احتياطية كل فترة واحفظها على جوجل درايف أو ابعتها لنفسك على واتساب، علشان لو الموبايل اتغير.</div>
        <div class="stack"><button type="button" class="btn btn-accent" data-act="backupNow">${icon('download')} تنزيل نسخة احتياطية كاملة</button>
        <button type="button" class="btn btn-ghost" data-act="restoreBackup">${icon('upload')} استعادة من ملف</button></div>
        <input type="file" id="restoreFile" accept=".json,application/json" class="hidden">
        <div class="hint mt" style="text-align:center">${lb ? 'آخر نسخة: ' + new Date(lb).toLocaleString('ar-EG') : 'لم يتم عمل نسخة احتياطية بعد'}</div></div>
        <div class="card"><div class="card-title"><div class="t-ic orange">${icon('shield')}</div><h2>خصوصية وعزل البيانات</h2></div>
          <div class="note">بيانات «حساباتي للمحارة» منفصلة تماماً عن باقي تطبيقات حساباتي (الكهرباء وغيرها): مخزنة بمفاتيح خاصة بيها، ومسحها أو استعادتها لا يؤثر على أي تطبيق تاني. لا يتم رفع أي بيانات على الإنترنت.</div>
          <button type="button" class="btn btn-danger mt" data-act="resetAll">${icon('trash')} مسح كل بيانات هذا التطبيق</button></div>`;
      return {
        title: 'النسخ الاحتياطي', html,
        after(root) {
          const f = root.querySelector('#restoreFile');
          f.onchange = () => {
            const file = f.files && f.files[0];
            if (!file) return;
            const rd = new FileReader();
            rd.onload = () => {
              U.confirmBox('استعادة النسخة هتستبدل كل البيانات الحالية في التطبيق ده. متأكد؟', () => {
                try { S.importJSON(String(rd.result)); U.applyTheme(); U.toast('تمت الاستعادة بنجاح'); U.go('home'); }
                catch (e) { U.toast(e.message || 'الملف غير صالح'); }
              }, { yes: 'استعادة' });
            };
            rd.readAsText(file);
            f.value = '';
          };
        }
      };
    }
  };

  U.VIEWS.about = {
    parent: () => ['more'],
    render() {
      const html = `<div class="dev-card"><img src="./icons/icon-192.png" alt=""><h2>HESABATI PLASTER</h2><p>حساباتي للمحارة وتشطيبات الواجهات<br>الإصدار ${esc(window.APP_VERSION || '')}</p></div>
        <div class="card"><div class="kv">
          <div class="kv-row"><span>العمل بدون إنترنت</span><strong>${'serviceWorker' in navigator ? 'مفعّل' : 'غير مدعوم في المتصفح ده'}</strong></div>
          <div class="kv-row"><span>حالة الاتصال الآن</span><strong>${navigator.onLine ? 'متصل' : 'بدون إنترنت'}</strong></div>
          <div class="kv-row"><span>مكان البيانات</span><strong>على الجهاز فقط</strong></div>
        </div></div>
        <div class="card"><div class="card-title"><div class="t-ic orange">${icon('info')}</div><h2>عن الحسابات</h2></div>
          <div class="note">كل المعادلات <b>تقديرية</b> ومبنية على المدخلات اللي بتكتبها: السمك، نسب الخلط، معدل الاستهلاك من نشرة المنتج، الهالك، وقواعد خصم الفتحات حسب اتفاقك مع العميل. التطبيق بيوضح الافتراضات تحت كل نتيجة. راجع دائماً بيانات الشركة المصنعة.</div></div>
        <div class="copyright">مبني على فلسفة تصميم تطبيق «حساباتي» — نسخة مستقلة لأعمال المحارة والجرافيت والواجهات.</div>`;
      return { title: 'عن التطبيق', html };
    }
  };

  /* ================= الإجراءات ================= */
  function downloadText(name, text, mime) {
    if (window.PlasterApp && typeof window.PlasterApp.saveFile === 'function') { window.PlasterApp.saveFile(name, mime || 'application/json', text); return; }
    const blob = new Blob([text], { type: mime || 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  Object.assign(U.ACTIONS, {
    newClient() { clientForm(null); },
    editClient(el) { clientForm(S.client(el.dataset.cid)); },
    newProjectFor(el) { const p = S.newProject({ clientId: el.dataset.cid }); U.go('project', p.id, 'zones'); },
    newWorker() { workerForm(null); },
    editWorker(el) { workerForm(S.worker(el.dataset.wid)); },
    delWorkerPay(el) { U.confirmBox('حذف الدفعة؟', () => { const d = S.db(); d.workerPays = d.workerPays.filter(x => x.id !== el.dataset.id); S.save(); U.rerender(); }, { yes: 'حذف' }); },
    newMaterial() { materialForm(null); },
    editMaterial(el) { materialForm(S.material(el.dataset.mid)); },
    stockCat(el) { stockCat = el.dataset.v; U.rerender(); },
    quickMove() { if (!S.db().materials.length) { materialForm(null); return; } moveForm(null); },
    newMove(el) { moveForm(null, { materialId: el.dataset.mid, type: el.dataset.t }); },
    editMove(el) { moveForm(S.db().movements.find(x => x.id === el.dataset.id)); },
    pickLogo() { document.getElementById('logoFile').click(); },
    removeLogo() { S.db().settings.logo = ''; S.save(); U.rerender(); },
    resetDefaults() { U.confirmBox('رجوع كل الافتراضات للقيم الاسترشادية الأصلية؟', () => { S.db().settings.defaults = S.clone(C.DEFAULTS); S.save(); U.rerender(); }, { yes: 'رجوع', safe: true }); },
    backupNow() {
      const name = 'hesabati-plaster-backup-' + S.today() + '.json';
      downloadText(name, S.exportJSON());
      S.markBackup(); U.toast('تم تجهيز النسخة الاحتياطية'); setTimeout(U.rerender, 400);
    },
    restoreBackup() { document.getElementById('restoreFile').click(); },
    resetAll() {
      U.confirmBox('مسح كل بيانات «حساباتي للمحارة» نهائياً؟\n(باقي تطبيقات حساباتي مش هتتأثر)', () => {
        U.confirmBox('تأكيد أخير: كل المشروعات والعملاء والمخزن هيتمسحوا.', () => { S.resetAll(); U.applyTheme(); U.toast('تم المسح'); U.go('home'); }, { yes: 'امسح' });
      }, { yes: 'متابعة' });
    }
  });

  window.Admin = { waPhone, downloadText };
})();
