/*
 * أرزقي للأرضيات — التطبيق الرئيسي: الرئيسية، المشروعات، صفحة المشروع، العملاء
 * تصميم وتطوير: أحمد حسن عبدالله
 * © 2026 أحمد حسن عبدالله - جميع الحقوق محفوظة.
 */
(function (root) {
  'use strict';
  const { esc, icon, money, fmt, fmtQ, fmtDate } = UI;
  const { nn, round } = Calc;
  const db = () => Store.db;
  const today = () => Store.todayISO();
  const by = (col, id) => Store.get(col, id);

  /* ================= أساسيات ================= */
  function commit(msg) {
    if (!Store.save()) {
      UI.alert('ما قدرناش نحفظ على الموبايل (المساحة ممتلئة أو التخزين مقفول). خد نسخة احتياطية فوراً، وجرّب تشيل اللوجو لو حجمه كبير.', 'لم يتم الحفظ');
      return false;
    }
    if (msg) UI.toast(msg);
    return true;
  }
  const cat = k => (db().settings.categories || {})[k] || k || '';
  const statusBadge = s => `<span class="st-badge st-${esc(s || 'new')}">${esc(Fin.STATUSES[s || 'new'] || '')}</span>`;
  const initial = s => esc(String(s || '؟').trim().charAt(0) || '؟');
  const customerName = id => { const c = id && by('customers', id); return c ? c.name : ''; };
  const projectName = id => { const p = id && by('projects', id); return p ? p.name : ''; };
  const sortByDateDesc = (a, b) => String(b.date || b.createdAt || '').localeCompare(String(a.date || a.createdAt || ''));
  function emptyHTML(ic, text, btn) { return `<div class="empty"><div class="big">${icon(ic)}</div><p>${text}</p>${btn || ''}</div>`; }
  function statsHTML(list) { return `<div class="mini-stats">${list.map(([l, v, cls]) => `<div${cls ? ` class="${cls}"` : ''}><span>${l}</span><strong>${v}</strong></div>`).join('')}</div>`; }
  function rowLine(label, value, cls) { return `<div class="sum-row${cls ? ' ' + cls : ''}"><span>${label}</span><strong>${value}</strong></div>`; }
  function bindActions(rootEl, map) {
    rootEl.querySelectorAll('[data-act]').forEach(el => {
      const fn = map[el.dataset.act];
      if (fn) el.addEventListener('click', ev => { ev.stopPropagation(); fn(el.dataset.id, el, ev); });
    });
  }

  /* ================= الأقسام الرئيسية ================= */
  const VIEW_TITLES = { home: 'أرزقي | Arzoqi', projects: 'المشروعات', calc: 'الحاسبات', more: 'المزيد' };
  let currentView = 'home';
  function switchView(key) {
    if (UI.depth()) { UI.closeAllThen(() => switchView(key)); return; }
    currentView = key;
    document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + key));
    document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.id === 'navBtn-' + key));
    document.getElementById('tabTitle').textContent = VIEW_TITLES[key];
    refreshView();
    window.scrollTo({ top: 0 });
  }
  function refreshView() {
    const el = document.getElementById('view-' + currentView);
    if (!el) return;
    ({ home: renderHome, projects: renderProjects, calc: () => Calcs.renderTab(el), more: renderMore })[currentView](el);
    UI.hydrateIcons(el);
    document.getElementById('greetLine').textContent = db().settings.bizName || 'أهلاً بيك';
  }

  /* ================= الرئيسية ================= */
  function renderHome(el) {
    const d = Fin.dashboard(db());
    const inv = Fin.inventory(db());
    const docs = db().docs.slice().sort(sortByDateDesc).slice(0, 4);
    const custs = db().customers.slice().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 4);
    const upcoming = db().notes.filter(n => n.date && !n.done && (n.kind === 'appointment' || n.kind === 'debt')).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);
    el.innerHTML = `
      <section class="home-sum">
        <div class="hs-label">المستحق لك عند العملاء</div>
        <div class="hs-value">${fmt(d.due)} <small>${UI.curSym()}</small></div>
        <div class="hs-stats">
          <button type="button" data-act="projects"><span>كل المشروعات</span><strong>${d.projects}</strong></button>
          <button type="button" data-act="projects"><span>مشروعات جارية</span><strong>${d.active}</strong></button>
          <button type="button" class="mat" data-act="profit"><span>صافي الربح</span><strong>${fmt(d.profit)}</strong></button>
        </div>
      </section>
      <div class="kpis">
        <div class="kpi"><span>إجمالي الإيرادات</span><strong>${money(d.revenue)}</strong><small>قيمة الأعمال والفواتير</small></div>
        <div class="kpi"><span>إجمالي المصروفات</span><strong class="neg">${money(d.costs)}</strong><small>خامات + أجور + مصروفات</small></div>
        <div class="kpi"><span>المحصّل فعلاً</span><strong class="pos">${money(d.collected)}</strong><small>دفعات العملاء</small></div>
        <div class="kpi"><span>صافي الربح</span><strong class="${d.profit < 0 ? 'neg' : 'pos'}">${money(d.profit)}</strong><small>الإيرادات − المصروفات</small></div>
      </div>
      ${inv.lowCount ? `<button type="button" class="alert-strip" data-act="inventory">${icon('alert')}<span><b>${inv.lowCount} خامة</b> قربت تخلص من المخزن — اضغط للمراجعة</span></button>` : ''}
      ${upcoming.map(n => `<button type="button" class="alert-strip info" data-act="note" data-id="${n.id}">${icon(n.kind === 'debt' ? 'cash' : 'calendar')}<span><b>${esc(fmtDate(n.date))}</b> — ${esc(n.title || n.body || '')}</span></button>`).join('')}
      <h2 class="home-h">ابدأ بسرعة</h2>
      <div class="quick">
        <button type="button" class="q-tile dark" data-act="newProject"><span class="q-ic orange">${icon('briefcase')}</span><b>مشروع جديد</b><small>عميل + بنود + حساب المصنعية</small></button>
        <button type="button" class="q-tile" data-act="newDoc"><span class="q-ic">${icon('file')}</span><b>فاتورة / عرض سعر</b><small>فاتورة، مقايسة، مستخلص...</small></button>
        <button type="button" class="q-tile" data-act="newMaterial"><span class="q-ic orange-soft">${icon('box')}</span><b>إضافة خامة</b><small>للمخزن وأسعار الشراء والبيع</small></button>
        <button type="button" class="q-tile" data-act="newPayment"><span class="q-ic green">${icon('cash')}</span><b>تسجيل دفعة</b><small>مبلغ وصلك من عميل</small></button>
      </div>
      <div class="home-row"><h2 class="home-h" style="margin:0">الحاسبات</h2><button type="button" class="link-btn" data-act="calcs">كل الحاسبات</button></div>
      <div class="calc-strip">${Calcs.LIST.map(c => `<button type="button" class="calc-chip" data-act="calc" data-id="${c.id}"><span class="q-ic ${c.tone || ''}">${icon(c.icon)}</span><b>${c.short}</b></button>`).join('')}</div>
      <div class="home-row"><h2 class="home-h" style="margin:0">آخر الفواتير والمستندات</h2><button type="button" class="link-btn" data-act="docs">عرض الكل</button></div>
      <div>${docs.length ? docs.map(Docs.cardHTML).join('') : '<div class="home-empty">لسه مفيش فواتير. اعمل أول فاتورة من زرار (+)</div>'}</div>
      <div class="home-row"><h2 class="home-h" style="margin:0">آخر العملاء</h2><button type="button" class="link-btn" data-act="customers">عرض الكل</button></div>
      <div>${custs.length ? custs.map(customerCardHTML).join('') : '<div class="home-empty">لسه مفيش عملاء.</div>'}</div>`;
    bindActions(el, {
      projects: () => switchView('projects'), calcs: () => switchView('calc'),
      profit: () => Mods.openReports(), inventory: () => Mods.openInventory(),
      note: id => Mods.openNoteSheet(by('notes', id)),
      newProject: () => openProjectEdit(null), newDoc: () => Docs.openNewDoc({}), newMaterial: () => Mods.openMaterialEdit(null),
      newPayment: () => openPaymentSheet({}), calc: id => Calcs.open(id), docs: () => Docs.openList(), customers: () => openCustomers()
    });
    Docs.bindCards(el);
    bindCustomerCards(el);
  }

  /* ================= زرار (+) ================= */
  function openCreate() {
    UI.openSheet({
      title: 'عايز تعمل إيه؟',
      render(body) {
        body.innerHTML = `<div class="create-list">
          <button type="button" class="create-opt dark" data-act="project"><span class="q-ic orange">${icon('briefcase')}</span><span><b>مشروع جديد</b><small>عميل، بنود أرضيات، خامات، دفعات وأرباح</small></span></button>
          <button type="button" class="create-opt" data-act="doc"><span class="q-ic">${icon('file')}</span><span><b>فاتورة أو مستند</b><small>مصنعية، توريد، مقايسة، عرض سعر، مستخلص، مشتريات</small></span></button>
          <button type="button" class="create-opt" data-act="calc"><span class="q-ic orange-soft">${icon('calc')}</span><span><b>حاسبة</b><small>مساحات، بلاط، باركيه، إنترلوك، رخام، سلالم، لاصق</small></span></button>
          <div class="create-row">
            <button type="button" class="create-opt" data-act="pay"><span class="q-ic green">${icon('cash')}</span><span><b>تسجيل دفعة</b></span></button>
            <button type="button" class="create-opt" data-act="exp"><span class="q-ic orange-soft">${icon('receipt')}</span><span><b>مصروف</b></span></button>
            <button type="button" class="create-opt" data-act="cust"><span class="q-ic">${icon('user')}</span><span><b>عميل جديد</b></span></button>
            <button type="button" class="create-opt" data-act="mat"><span class="q-ic orange-soft">${icon('box')}</span><span><b>خامة</b></span></button>
            <button type="button" class="create-opt" data-act="day"><span class="q-ic">${icon('hardhat')}</span><span><b>يومية عمال</b></span></button>
            <button type="button" class="create-opt" data-act="note"><span class="q-ic">${icon('note')}</span><span><b>ملاحظة</b></span></button>
          </div></div>`;
        const go = fn => UI.closeThen(1, fn);
        bindActions(body, {
          project: () => go(() => openProjectEdit(null)), doc: () => go(() => Docs.openNewDoc({})), calc: () => go(() => switchView('calc')),
          pay: () => go(() => openPaymentSheet({})), exp: () => go(() => Mods.openExpenseSheet({})), cust: () => go(() => openCustomerEdit(null)),
          mat: () => go(() => Mods.openMaterialEdit(null)), day: () => go(() => Mods.openDailyLog({})), note: () => go(() => Mods.openNoteSheet(null))
        });
      }
    });
  }

  /* ================= المشروعات ================= */
  let projFilter = 'active', projSearch = '';
  function projectCardHTML(p) {
    const f = Fin.projectFinance(db(), p);
    const cn = customerName(p.customerId);
    return `<div class="inv-card proj-card" data-project="${p.id}">
      <div class="inv-avatar">${initial(p.name)}</div>
      <div class="inv-info"><div class="n">${esc(p.name || 'مشروع')}</div>
        <div class="m">${cn ? esc(cn) + ' · ' : ''}${statusBadge(p.status)}${p.dueDate ? ' · تسليم ' + esc(fmtDate(p.dueDate)) : ''}</div></div>
      <div class="inv-amount">${money(f.value)}<small class="${f.remaining > 0 ? 'due' : ''}">${f.remaining > 0 ? 'متبقي ' + fmt(f.remaining) : (f.value ? 'خالص' : '')}</small></div>
    </div>`;
  }
  function bindProjectCards(el) { el.querySelectorAll('[data-project]').forEach(c => { c.onclick = () => openProject(c.dataset.project); }); }
  function renderProjects(el) {
    const q = projSearch.trim();
    let list = db().projects.slice().sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
    const counts = { all: list.length, active: list.filter(p => Fin.ACTIVE_STATUSES.includes(p.status || 'new')).length };
    if (projFilter === 'active') list = list.filter(p => Fin.ACTIVE_STATUSES.includes(p.status || 'new'));
    else if (projFilter === 'due') list = list.filter(p => Fin.projectFinance(db(), p).remaining > 0);
    else if (projFilter !== 'all') list = list.filter(p => (p.status || 'new') === projFilter);
    if (q) list = list.filter(p => [p.name, p.address, customerName(p.customerId), (by('customers', p.customerId) || {}).phone].join(' ').includes(q));
    const chips = [['active', `الجارية (${counts.active})`], ['all', `الكل (${counts.all})`], ['due', 'عليها متبقي']].concat(Object.entries(Fin.STATUSES));
    el.innerHTML = `
      <button type="button" class="btn btn-accent" style="margin-bottom:12px" data-act="new">${icon('plus')} مشروع جديد</button>
      <div class="field" style="margin-bottom:10px"><input type="search" id="projSearch" placeholder="ابحث باسم المشروع أو العميل أو العنوان..." value="${esc(projSearch)}"></div>
      <div class="filter-chips">${chips.map(([k, l]) => `<button type="button" class="chip${projFilter === k ? ' on' : ''}" data-f="${k}">${esc(l)}</button>`).join('')}</div>
      <div id="projList">${list.length ? list.map(projectCardHTML).join('') : emptyHTML('briefcase', db().projects.length ? 'مفيش مشروعات بالفلتر ده' : 'لسه مفيش مشروعات. ابدأ أول مشروع وسجّل بنوده ومصنعيته في دقايق.')}</div>`;
    el.querySelector('[data-act=new]').onclick = () => openProjectEdit(null);
    const s = el.querySelector('#projSearch');
    s.oninput = () => { projSearch = s.value; const pos = s.selectionStart; renderProjects(el); UI.hydrateIcons(el); const n = el.querySelector('#projSearch'); n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) {} };
    el.querySelectorAll('[data-f]').forEach(b => { b.onclick = () => { projFilter = b.dataset.f; renderProjects(el); UI.hydrateIcons(el); }; });
    bindProjectCards(el);
  }

  /* ---------- إضافة / تعديل مشروع ---------- */
  function openProjectEdit(p, opts) {
    opts = opts || {};
    const isNew = !p;
    const st = p ? JSON.parse(JSON.stringify(p)) : { id: null, name: '', customerId: opts.customerId || null, address: '', type: '', status: 'new', startDate: today(), dueDate: '', note: '', items: [], areas: [], additions: [], discount: 0 };
    let newCust = { name: '', phone: '' };
    UI.openSheet({
      title: isNew ? 'مشروع جديد' : 'تعديل بيانات المشروع', autofocus: isNew,
      render(body, sheet) {
        const c = st.customerId && by('customers', st.customerId);
        const catOpts = [['', 'بدون تحديد']].concat(Object.entries(db().settings.categories));
        body.innerHTML = UI.formHTML([
          { k: 'name', label: 'اسم المشروع', placeholder: 'مثال: شقة أ. محمد - التجمع', value: st.name },
          { html: `<div class="field"><label>العميل</label>${c ? `<div class="link-box"><span class="l-ic">${icon('user')}</span><span class="l-txt"><b>${esc(c.name)}</b><span>${esc(c.phone || '')}</span></span><button type="button" class="btn btn-ghost btn-sm" data-act="pick">تغيير</button></div>` : `
            <div class="row-2"><input type="text" data-nc="name" placeholder="اسم العميل" value="${esc(newCust.name)}"><input type="text" inputmode="tel" dir="ltr" style="text-align:right" data-nc="phone" placeholder="رقم الهاتف" value="${esc(newCust.phone)}"></div>
            <button type="button" class="chip" style="margin-top:8px" data-act="pick">${icon('users')} اختيار عميل مسجل</button>`}</div>` },
          { k: 'address', label: 'عنوان المشروع', placeholder: 'المنطقة - الشارع - رقم العمارة - الدور', value: st.address },
          { k: 'type', label: 'نوع المشروع', type: 'select', options: catOpts, value: st.type },
          { k: 'status', label: 'حالة المشروع', type: 'chips', options: Object.entries(Fin.STATUSES), value: st.status },
          { k: 'startDate', label: 'تاريخ البداية', type: 'date', value: st.startDate, half: true },
          { k: 'dueDate', label: 'التسليم المتوقع', type: 'date', value: st.dueDate, half: true },
          { k: 'note', label: 'ملاحظات واتفاقات', type: 'textarea', optional: true, value: st.note },
          { html: `<div class="btn-row"><button type="button" class="btn btn-primary" data-act="save">${icon('check')} حفظ</button><button type="button" class="btn btn-ghost" data-act="cancel">إلغاء</button></div>
            ${isNew ? '' : `<button type="button" class="btn btn-danger" style="margin-top:10px" data-act="del">${icon('trash')} حذف المشروع</button>`}` }
        ]);
        UI.bindChips(body, (k, v) => { st[k] = v; });
        const sync = () => { Object.assign(st, UI.readForm(body)); body.querySelectorAll('[data-nc]').forEach(i => { newCust[i.dataset.nc] = i.value.trim(); }); };
        body.querySelectorAll('input,select,textarea').forEach(i => i.addEventListener('input', sync));
        bindActions(body, {
          pick: () => { sync(); pickCustomer(id => { st.customerId = id; sheet.refresh(); }); },
          cancel: () => UI.back(),
          del: () => confirmDeleteProject(st.id, () => UI.closeThen(UI.topPage() && UI.topPage().opts.projectId === st.id ? 2 : 1)),
          save: () => {
            sync();
            if (!st.name) { if (newCust.name) st.name = 'مشروع ' + newCust.name; else if (st.customerId) st.name = 'مشروع ' + customerName(st.customerId); }
            if (!st.name) { UI.toast('⚠️ اكتب اسم المشروع أو اسم العميل', 'err'); return; }
            if (!st.customerId && newCust.name) {
              const ex = db().customers.find(x => x.name.trim() === newCust.name && (!newCust.phone || x.phone === newCust.phone));
              st.customerId = ex ? ex.id : Store.upsert('customers', { name: newCust.name, phone: newCust.phone, address: st.address, note: '' }).id;
            }
            if (st.dueDate && st.startDate && st.dueDate < st.startDate) { UI.toast('⚠️ تاريخ التسليم قبل تاريخ البداية', 'err'); return; }
            const saved = Store.upsert('projects', isNew ? st : Object.assign(by('projects', st.id), st));
            if (!commit(isNew ? '✔️ تم إنشاء المشروع' : '✔️ تم حفظ بيانات المشروع')) return;
            UI.closeThen(1, () => { if (isNew) { if (opts.onCreated) opts.onCreated(saved); else openProject(saved.id, 'items'); } });
          }
        });
      }
    });
  }
  function confirmDeleteProject(id, after) {
    const p = by('projects', id); if (!p) return;
    const L = Store.projectLinks(id);
    const parts = [`${(p.items || []).length} بند`, `${L.payments.length} دفعة`, `${L.materials.length} خامة`, `${L.expenses.length} مصروف`, `${L.logs.length} يومية عمال`, `${L.docs.length} فاتورة/مستند`];
    UI.confirm(`حذف مشروع «${p.name}» نهائياً؟\nهيتم حذف كل اللي مربوط بيه: ${parts.join('، ')}.\nالملاحظات المربوطة بيه هتفضل موجودة.\nخد نسخة احتياطية الأول لو مش متأكد.`, () => {
      Store.deleteProject(id); commit('🗑️ تم حذف المشروع'); if (after) after();
    }, { yes: 'حذف نهائي' });
  }

  /* ---------- صفحة المشروع ---------- */
  const PROJECT_TABS = [['items', 'البنود'], ['areas', 'المساحات'], ['materials', 'الخامات'], ['expenses', 'المصروفات'], ['payments', 'الدفعات'], ['workers', 'العمال'], ['summary', 'الملخص والأرباح']];
  function openProject(id, tab) {
    let curTab = tab || 'items';
    UI.openPage({
      projectId: id,
      render(body, page) {
        const p = by('projects', id);
        if (!p) { body.innerHTML = emptyHTML('alert', 'المشروع ده اتحذف'); return; }
        const f = Fin.projectFinance(db(), p);
        const c = by('customers', p.customerId);
        page.setTitle(p.name, [c && c.name, Fin.STATUSES[p.status || 'new']].filter(Boolean).join(' · '));
        page.setActions([{ icon: 'edit', label: 'تعديل بيانات المشروع', onClick: () => openProjectEdit(p) }, { icon: 'file', label: 'فاتورة من المشروع', accent: true, onClick: () => openProjectDocs(p) }]);
        body.innerHTML = `
          <section class="hero">
            <div class="hero-label">قيمة المشروع على العميل</div>
            <div class="hero-value">${fmt(f.value)}<small>${UI.curSym()}</small></div>
            <div class="hero-stats">
              <div class="hero-stat"><span>المدفوع</span><strong>${fmt(f.paid)}</strong></div>
              <div class="hero-stat"><span>المتبقي</span><strong>${fmt(f.remaining)}</strong></div>
              <div class="hero-stat"><span>صافي الربح</span><strong>${fmt(f.profit)}</strong></div>
            </div>
          </section>
          <div class="tabs-scroll">${PROJECT_TABS.map(([k, l]) => `<button type="button" class="chip${curTab === k ? ' on' : ''}" data-tab="${k}">${l}</button>`).join('')}</div>
          <div id="ptab"></div>`;
        body.querySelectorAll('[data-tab]').forEach(b => { b.onclick = () => { curTab = b.dataset.tab; page.refresh(); }; });
        const box = body.querySelector('#ptab');
        ({ items: tabItems, areas: tabAreas, materials: tabMaterials, expenses: tabExpenses, payments: tabPayments, workers: tabWorkers, summary: tabSummary })[curTab](box, p, f, page);
      }
    });
  }

  // تبويب البنود
  function tabItems(box, p, f) {
    const rows = f.items.rows;
    box.innerHTML = `
      <div class="section-head"><h3>بنود الأعمال<span class="count">${rows.length}</span></h3>
        <button type="button" class="btn btn-soft btn-sm" data-act="add">${icon('plus')} إضافة بند</button></div>
      ${rows.length ? rows.map((r, i) => `<div class="item-card" data-item="${r.item.id}">
          <div class="room-num">${i + 1}</div>
          <div class="i-info"><div class="i-name">${esc(r.item.name || 'بند')}</div>
            <div class="i-meta">${esc(Calc.itemQtyText(r.item, fmtQ))} · ${esc(Calc.SCOPES[r.item.scope] || Calc.SCOPES.labor)}${r.item.basis === 'stage' ? ' · منفذ ' + fmt(r.executed) : ''}</div>
            <div class="i-split">${r.labor ? `<span>مصنعية ${fmt(r.labor)}</span>` : ''}${r.material ? `<span class="m">خامات ${fmt(r.material)}</span>` : ''}</div></div>
          <div class="i-amt">${money(r.total)}</div></div>`).join('') : emptyHTML('layers', 'أضف بنود المشروع: أرضيات بالمتر، وزرات بالمتر الطولي، سلالم بالدرجة، نقل بالمقطوعية...', `<button type="button" class="btn btn-accent" data-act="add">${icon('plus')} أول بند</button>`)}
      ${rows.length ? `<div class="card"><div class="sum-list">
        ${rowLine('إجمالي المصنعية', money(f.items.labor))}${rowLine('إجمالي الخامات (توريد)', money(f.items.material))}
        ${f.additions ? rowLine('إضافات', '+ ' + money(f.additions)) : ''}${f.discount ? rowLine('خصم', '- ' + money(f.discount), 'minus') : ''}
      </div><div class="sum-total"><span>قيمة المشروع</span><strong>${money(f.grossValue)}</strong></div>
      <button type="button" class="btn btn-ghost" style="margin-top:10px" data-act="adj">${icon('tag')} الخصم والإضافات</button></div>` : ''}`;
    box.querySelectorAll('[data-item]').forEach(el => { el.onclick = () => openItemSheet(p.id, el.dataset.item); });
    bindActions(box, { add: () => openItemSheet(p.id, null), adj: () => openAdjustSheet(p) });
  }

  /* ---------- إضافة / تعديل بند (محرك طرق المحاسبة) ---------- */
  function openItemSheet(projectId, itemId, preset) {
    const p = by('projects', projectId);
    const orig = itemId ? (p.items || []).find(x => x.id === itemId) : null;
    const st = orig ? JSON.parse(JSON.stringify(orig)) : Object.assign({ id: null, name: '', method: 'sqm', basis: 'measure', unit: 'م²', scope: 'labor', qty: '', laborPrice: '', materialPrice: '', workers: 1, days: '', wage: '', amount: '', materialAmount: '', progress: '', note: '' }, preset || {});
    const live = sheetBody => {
      const r = Calc.item(st);
      const el = sheetBody.querySelector('#itemLive');
      if (el) el.innerHTML = `<span>${r.labor ? 'مصنعية ' + fmt(r.labor) : ''}${r.labor && r.material ? ' + ' : ''}${r.material ? 'خامات ' + fmt(r.material) : ''}${st.basis === 'stage' ? ' · المنفذ ' + fmt(r.executed) : ''}</span><strong>${money(r.total)}</strong>`;
    };
    UI.openSheet({
      title: orig ? 'تعديل البند' : 'إضافة بند',
      render(body, sheet) {
        const b = st.basis || 'measure', sc = st.scope || 'labor';
        const priceLbl = `(${UI.curSym()})`;
        const fields = [
          { html: `<button type="button" class="chip" style="margin-bottom:10px" data-act="catalog">${icon('list')} اختيار من أنواع الأعمال</button>` },
          { k: 'name', label: 'اسم البند / الشغلانة', placeholder: 'مثال: تركيب بورسلين أرضيات 60×60', value: st.name },
          { k: 'method', label: 'طريقة المحاسبة', type: 'chips', options: Calc.METHODS.map(m => [m.id, m.label]), value: st.method },
          { k: 'scope', label: 'نطاق العمل', type: 'chips', options: Object.entries(Calc.SCOPES), value: sc }
        ];
        if (b === 'measure') {
          fields.push({ k: 'qty', label: `الكمية (${st.unit || ''})`, type: 'number', placeholder: '0', value: st.qty });
          fields.push({ k: 'unit', label: 'الوحدة', type: 'chips', options: Calc.UNITS.map(u => [u, u]), value: st.unit });
          if ((p.areas || []).length) fields.push({ html: `<button type="button" class="chip" style="margin:-4px 0 12px" data-act="fromArea">${icon('ruler')} خد الكمية من مساحات المشروع</button>` });
          if (sc !== 'supply') fields.push({ k: 'laborPrice', label: `سعر مصنعية الوحدة ${priceLbl}`, type: 'number', placeholder: '0', value: st.laborPrice, half: true });
          if (sc !== 'labor') fields.push({ k: 'materialPrice', label: `سعر خامة الوحدة ${priceLbl}`, type: 'number', placeholder: '0', value: st.materialPrice, half: true });
        } else if (b === 'daily') {
          fields.push({ k: 'workers', label: 'عدد العمال', type: 'number', value: st.workers, half: true });
          fields.push({ k: 'days', label: 'عدد الأيام', type: 'number', placeholder: '0', value: st.days, half: true });
          fields.push({ k: 'wage', label: `يومية العامل ${priceLbl}`, type: 'number', placeholder: '0', value: st.wage, half: true });
          if (sc !== 'labor') fields.push({ k: 'materialAmount', label: `قيمة الخامات ${priceLbl}`, type: 'number', placeholder: '0', value: st.materialAmount, half: true });
        } else if (b === 'lump') {
          fields.push({ k: 'amount', label: sc === 'supply' ? `قيمة التوريد المتفق عليها ${priceLbl}` : `قيمة المقطوعية / المقاولة ${priceLbl}`, type: 'number', placeholder: '0', value: st.amount, half: sc === 'both' });
          if (sc === 'both') fields.push({ k: 'materialAmount', label: `قيمة الخامات ${priceLbl}`, type: 'number', placeholder: '0', value: st.materialAmount, half: true });
        } else if (b === 'stage') {
          fields.push({ k: 'amount', label: `قيمة المرحلة ${priceLbl}`, type: 'number', placeholder: '0', value: st.amount, half: true });
          fields.push({ k: 'progress', label: 'نسبة الإنجاز %', type: 'number', placeholder: '0', value: st.progress, half: true, hint: 'بتستخدم في المستخلص' });
        }
        fields.push({ k: 'note', label: 'ملاحظة تظهر تحت البند', optional: true, placeholder: 'مثال: شامل التسوية والترويبة', value: st.note });
        fields.push({ html: `<div class="live-total" id="itemLive"></div>
          <div class="btn-row"><button type="button" class="btn btn-primary" data-act="save">${icon('check')} حفظ البند</button><button type="button" class="btn btn-ghost" data-act="cancel">إلغاء</button></div>
          ${orig ? `<div class="btn-row" style="margin-top:10px"><button type="button" class="btn btn-soft" data-act="dup">${icon('copy')} تكرار</button><button type="button" class="btn btn-danger" data-act="del">${icon('trash')} حذف</button></div>` : ''}` });
        body.innerHTML = UI.formHTML(fields);
        UI.bindChips(body, (k, v) => {
          Object.assign(st, readNums());
          if (k === 'method') {
            const m = Calc.METHODS.find(x => x.id === v);
            st.method = v; st.basis = m.basis; if (m.basis === 'measure' || !st.unit) st.unit = m.unit; if (m.scope) st.scope = m.scope;
          } else st[k] = v;
          sheet.refresh();
        });
        function readNums() { const o = UI.readForm(body); delete o.method; delete o.scope; delete o.unit; return o; }
        body.querySelectorAll('input,textarea').forEach(i => i.addEventListener('input', () => { Object.assign(st, readNums()); live(body); }));
        live(body);
        bindActions(body, {
          cancel: () => UI.back(),
          catalog: () => { Object.assign(st, readNums()); pickFloorType(ft => {
            st.name = ft.name; st.unit = ft.unit || st.unit; st.basis = ft.basis || 'measure'; st.scope = ft.scope || st.scope;
            const m = Calc.METHODS.find(x => x.basis === st.basis && (st.basis !== 'measure' || x.unit === st.unit)); st.method = m ? m.id : st.method;
            if (ft.laborPrice !== '' && ft.laborPrice != null) st.laborPrice = ft.laborPrice;
            if (ft.materialPrice !== '' && ft.materialPrice != null) st.materialPrice = ft.materialPrice;
            sheet.refresh();
          }); },
          fromArea: () => { Object.assign(st, readNums()); pickArea(p, v => { st.qty = round(v, 3); sheet.refresh(); }); },
          dup: () => { const pr = by('projects', projectId); const c = JSON.parse(JSON.stringify(orig)); c.id = Store.uid('it'); c.name = (c.name || '') + ' (نسخة)'; pr.items.splice(pr.items.indexOf(orig) + 1, 0, c); Store.upsert('projects', pr); commit('✔️ تم تكرار البند'); UI.back(); },
          del: () => UI.confirm(`حذف البند «${orig.name || ''}»؟`, () => { const pr = by('projects', projectId); pr.items = pr.items.filter(x => x.id !== orig.id); Store.upsert('projects', pr); commit('🗑️ تم حذف البند'); UI.back(); }, { yes: 'حذف' }),
          save: () => {
            Object.assign(st, readNums());
            if (!st.name) { UI.toast('⚠️ اكتب اسم البند', 'err'); return; }
            const r = Calc.item(st);
            if (!(r.total > 0)) { UI.toast('⚠️ البند قيمته صفر — اكتب الكمية والسعر', 'err'); return; }
            if (st.basis === 'stage' && nn(st.progress) > 100) { UI.toast('⚠️ نسبة الإنجاز أكبر من 100%', 'err'); return; }
            const pr = by('projects', projectId);
            if (orig) { const i = pr.items.findIndex(x => x.id === orig.id); pr.items[i] = Object.assign({}, st, { id: orig.id }); }
            else pr.items.push(Object.assign({}, st, { id: Store.uid('it') }));
            Store.upsert('projects', pr);
            if (commit(orig ? '✔️ تم تعديل البند' : '✔️ تم إضافة البند')) UI.back();
          }
        });
      }
    });
  }
  function openAdjustSheet(p) {
    const st = { discount: p.discount || '', additions: JSON.parse(JSON.stringify(p.additions || [])) };
    UI.openSheet({
      title: 'الخصم والإضافات',
      render(body, sheet) {
        body.innerHTML = `<p class="hint" style="margin:-6px 0 12px">الإضافات: أي مبالغ زيادة على البنود (مثلاً تشطيب إضافي). الخصم: خصم خاص للعميل.</p>
          ${st.additions.map((a, i) => `<div class="extra-row" style="grid-template-columns:1.6fr 1fr 40px"><input type="text" data-a="${i}" data-f="name" placeholder="البيان" value="${esc(a.name)}"><input type="number" inputmode="decimal" min="0" step="any" data-a="${i}" data-f="amount" placeholder="المبلغ" value="${esc(a.amount)}"><button type="button" class="card-del" data-act="rm" data-id="${i}">${icon('x')}</button></div>`).join('')}
          <button type="button" class="chip" style="margin-bottom:12px" data-act="addA">${icon('plus')} إضافة مبلغ</button>
          ${UI.formHTML([{ k: 'discount', label: `الخصم (${UI.curSym()})`, type: 'number', placeholder: '0', value: st.discount }])}
          <div class="btn-row"><button type="button" class="btn btn-primary" data-act="save">حفظ</button><button type="button" class="btn btn-ghost" data-act="cancel">إلغاء</button></div>`;
        const sync = () => { body.querySelectorAll('[data-a]').forEach(i => { st.additions[+i.dataset.a][i.dataset.f] = i.value.trim(); }); st.discount = UI.readForm(body).discount; };
        body.querySelectorAll('input').forEach(i => i.addEventListener('input', sync));
        bindActions(body, {
          addA: () => { sync(); st.additions.push({ name: '', amount: '' }); sheet.refresh(); },
          rm: i => { sync(); st.additions.splice(+i, 1); sheet.refresh(); },
          cancel: () => UI.back(),
          save: () => { sync(); const pr = by('projects', p.id); pr.additions = st.additions.filter(a => a.name || nn(a.amount)); pr.discount = nn(st.discount); Store.upsert('projects', pr); if (commit('✔️ تم الحفظ')) UI.back(); }
        });
      }
    });
  }

  // تبويب المساحات (محفوظة داخل المشروع)
  function tabAreas(box, p) {
    const t = Calc.areaTotals(p.areas || []);
    box.innerHTML = `
      <div class="note" style="margin-bottom:12px">سجّل مقاسات الغرف والحوائط والأسقف هنا مع خصم الأبواب والشبابيك، وبعدين خد الكمية منها مباشرة وأنت بتضيف البند.</div>
      ${statsHTML([['أرضيات', fmtQ(t.byKind.floor) + ' م²'], ['حوائط', fmtQ(t.byKind.wall) + ' م²'], ['الإجمالي', fmtQ(t.total) + ' م²']])}
      <div class="section-head"><h3>المساحات<span class="count">${t.rows.length}</span></h3><button type="button" class="btn btn-soft btn-sm" data-act="add">${icon('plus')} إضافة مساحة</button></div>
      ${t.rows.length ? t.rows.map((r, i) => `<div class="item-card" data-area="${i}"><div class="room-num">${i + 1}</div>
        <div class="i-info"><div class="i-name">${esc(r.entry.name || 'مساحة')}</div><div class="i-meta">${esc(Calc.AREA_KINDS[r.entry.kind] || '')} · ${esc((Calc.SHAPES[r.entry.shape] || {}).label || '')}${r.deduct ? ' · خصم ' + fmtQ(r.deduct) + ' م²' : ''}${r.perimeter ? ' · محيط ' + fmtQ(r.perimeter) + ' م' : ''}</div></div>
        <div class="i-amt">${fmtQ(r.net)}<small>م²</small></div></div>`).join('') : emptyHTML('ruler', 'لسه مفيش مساحات مسجلة للمشروع ده')}`;
    box.querySelectorAll('[data-area]').forEach(el => { el.onclick = () => Calcs.openAreaEntry(p.areas[+el.dataset.area], saved => saveArea(p.id, +el.dataset.area, saved)); });
    bindActions(box, { add: () => Calcs.openAreaEntry(null, saved => saveArea(p.id, null, saved)) });
  }
  function saveArea(pid, index, entry) {
    const pr = by('projects', pid);
    if (entry === null) pr.areas.splice(index, 1);
    else if (index == null) pr.areas.push(entry); else pr.areas[index] = entry;
    Store.upsert('projects', pr);
    return commit(entry === null ? '🗑️ تم حذف المساحة' : '✔️ تم حفظ المساحة');
  }
  function pickArea(p, cb) {
    const t = Calc.areaTotals(p.areas || []);
    UI.openSheet({
      title: 'اختيار مساحة', refreshBelow: false,
      render(body) {
        const opts = [['all', 'إجمالي كل المساحات', t.total]].concat(Object.keys(Calc.AREA_KINDS).filter(k => t.byKind[k]).map(k => ['k:' + k, 'إجمالي ' + Calc.AREA_KINDS[k], t.byKind[k]]))
          .concat(t.rows.map((r, i) => ['r:' + i, r.entry.name || 'مساحة ' + (i + 1), r.net]))
          .concat(t.perimeter ? [['per', 'إجمالي المحيط (للوزرات) م.ط', t.perimeter]] : []);
        body.innerHTML = `<div class="suggest pick-list" style="margin-top:0">${opts.map(o => `<button type="button" data-v="${o[2]}"><span class="s-av">${icon('ruler')}</span><span style="flex:1">${esc(o[1])}</span><b>${fmtQ(o[2])}</b></button>`).join('')}</div>`;
        body.querySelectorAll('[data-v]').forEach(b => { b.onclick = () => { const v = +b.dataset.v; UI.closeThen(1, () => cb(v)); }; });
      }
    });
  }

  // تبويب الخامات
  function tabMaterials(box, p, f) {
    const list = db().projectMaterials.filter(m => m.projectId === p.id).sort(sortByDateDesc);
    box.innerHTML = `
      <div class="note" style="margin-bottom:12px"><strong>الخامات هنا = تكلفتك أنت</strong> (اللي اشتريتها أو صرفتها من المخزن)، وبتنزل من الربح. خامات العميل بتتسجل للكمية بس وتكلفتها صفر. سعر بيع الخامات للعميل بيتحسب من البنود (توريد).</div>
      ${statsHTML([['تكلفة خاماتي', money(f.materialsCost)], ['منها هالك', money(f.wastedCost)], ['خامات العميل', f.clientMaterials.length + ' صنف']])}
      <div class="btn-row" style="margin-bottom:12px"><button type="button" class="btn btn-soft" data-act="stock">${icon('store')} صرف من المخزن</button><button type="button" class="btn btn-soft" data-act="manual">${icon('plus')} خامة يدوي</button></div>
      ${list.length ? `<div class="card">${list.map(m => `<div class="entry${m.ownership === 'client' ? ' matpay' : ' mat'}" data-pm="${m.id}"><span class="e-ic">${icon(m.ownership === 'client' ? 'user' : 'box')}</span>
        <div class="e-info"><div class="e-title">${esc(m.name)}${m.waste ? ' <span class="src-badge warn">هالك</span>' : ''}${m.materialId ? ' <span class="src-badge">من المخزن</span>' : ''}</div>
        <div class="e-meta">${fmtQ(m.qty)} ${esc(m.unit || '')} · ${m.ownership === 'client' ? 'ملك العميل' : 'تكلفة الوحدة ' + fmt(m.unitCost)} · ${esc(fmtDate(m.date))}</div></div>
        <div class="e-amt">${m.ownership === 'client' ? '—' : fmt(nn(m.qty) * nn(m.unitCost))}</div></div>`).join('')}</div>` : emptyHTML('box', 'لسه مفيش خامات مسجلة على المشروع')}`;
    box.querySelectorAll('[data-pm]').forEach(el => { el.onclick = () => openProjectMaterialSheet(p, by('projectMaterials', el.dataset.pm)); });
    bindActions(box, {
      stock: () => Mods.pickMaterial(m => openProjectMaterialSheet(p, null, m)),
      manual: () => openProjectMaterialSheet(p, null, null)
    });
  }
  function openProjectMaterialSheet(p, pm, fromStock) {
    const st = pm ? Object.assign({}, pm) : { projectId: p.id, materialId: fromStock ? fromStock.id : null, name: fromStock ? Mods.materialLabel(fromStock) : '', qty: '', unit: fromStock ? fromStock.unit : 'م²', unitCost: fromStock ? fromStock.buyPrice : '', ownership: 'mine', waste: false, date: today(), note: '' };
    const mat = st.materialId && by('materials', st.materialId);
    UI.openSheet({
      title: pm ? 'تعديل خامة المشروع' : (mat ? 'صرف خامة من المخزن' : 'خامة للمشروع'), autofocus: true,
      render(body, sheet) {
        const stock = mat ? Fin.stockOf(db(), mat.id) + (pm ? nn(pm.qty) : 0) : null;
        body.innerHTML = (mat ? `<div class="ok-box" style="margin:0 0 12px">المتاح في المخزن: <b>${fmtQ(stock)} ${esc(mat.unit || '')}</b> — هيتخصم تلقائياً.</div>` : '') + UI.formHTML([
          { k: 'name', label: 'اسم الخامة', placeholder: 'مثال: سيراميك 60×60 / لاصق / ترويبة', value: st.name },
          { k: 'qty', label: 'الكمية', type: 'number', placeholder: '0', value: st.qty, half: true },
          { k: 'unit', label: 'الوحدة', type: 'select', options: Mods.MAT_UNITS.map(u => [u, u]), value: st.unit, half: true },
          { k: 'ownership', label: 'الخامة دي ملك مين؟', type: 'chips', options: [['mine', 'أنا اشتريتها (تكلفة عليّ)'], ['client', 'ملك العميل']], value: st.ownership },
          st.ownership === 'client' ? null : { k: 'unitCost', label: `تكلفة الوحدة عليك (${UI.curSym()})`, type: 'number', placeholder: '0', value: st.unitCost, half: true },
          { k: 'date', label: 'التاريخ', type: 'date', value: st.date, half: true },
          { k: 'waste', label: 'دي كمية هالك / فاقد', type: 'switch', value: st.waste },
          { k: 'note', label: 'ملاحظة', optional: true, value: st.note },
          { html: `<div class="live-total" id="pmLive"></div><div class="btn-row"><button type="button" class="btn btn-primary" data-act="save">حفظ</button><button type="button" class="btn btn-ghost" data-act="cancel">إلغاء</button></div>${pm ? `<button type="button" class="btn btn-danger" style="margin-top:10px" data-act="del">${icon('trash')} حذف</button>` : ''}` }
        ]);
        const live = () => { const o = UI.readForm(body); body.querySelector('#pmLive').innerHTML = `<span>${fmtQ(o.qty)} × ${fmt(o.unitCost || 0)}</span><strong>${st.ownership === 'client' ? 'ملك العميل' : money(nn(o.qty) * nn(o.unitCost))}</strong>`; };
        UI.bindChips(body, (k, v) => { Object.assign(st, UI.readForm(body)); st[k] = v; sheet.refresh(); });
        body.querySelectorAll('input,select').forEach(i => i.addEventListener('input', live));
        live();
        bindActions(body, {
          cancel: () => UI.back(),
          del: () => UI.confirm('حذف الخامة من المشروع؟' + (mat ? ' الكمية هترجع للمخزن.' : ''), () => { Store.remove('projectMaterials', pm.id); commit('🗑️ تم الحذف'); UI.back(); }, { yes: 'حذف' }),
          save: () => {
            Object.assign(st, UI.readForm(body));
            if (!st.name || !(nn(st.qty) > 0)) { UI.toast('⚠️ اكتب اسم الخامة والكمية', 'err'); return; }
            if (mat && nn(st.qty) > stock) { UI.confirm(`الكمية (${fmtQ(st.qty)}) أكبر من المتاح في المخزن (${fmtQ(stock)}). تسجلها برضه؟ المخزن هيبقى بالسالب لحد ما تسجل مشتريات.`, doSave, { yes: 'تسجيل', safe: true }); return; }
            doSave();
          }
        });
        function doSave() {
          if (st.ownership === 'client') st.unitCost = 0;
          st.qty = nn(st.qty); st.unitCost = nn(st.unitCost);
          Store.upsert('projectMaterials', pm ? Object.assign(by('projectMaterials', pm.id), st) : st);
          if (commit('✔️ تم الحفظ')) UI.back();
        }
      }
    });
  }

  // تبويب المصروفات
  function tabExpenses(box, p, f) {
    const list = db().expenses.filter(e => e.projectId === p.id).sort(sortByDateDesc);
    box.innerHTML = `
      ${statsHTML([['مصروفات المشروع', money(f.expenses)], ['أجور العمال', money(f.wages)], ['مشتريات مربوطة', money(f.purchasesCost)]])}
      <button type="button" class="btn btn-soft" style="margin-bottom:12px" data-act="add">${icon('plus')} تسجيل مصروف (نقل، رفع وتنزيل، إيجار...)</button>
      ${list.length ? `<div class="card">${list.map(Mods.expenseEntryHTML).join('')}</div>` : emptyHTML('receipt', 'مفيش مصروفات مسجلة على المشروع')}`;
    box.querySelectorAll('[data-exp]').forEach(el => { el.onclick = () => Mods.openExpenseSheet(by('expenses', el.dataset.exp)); });
    bindActions(box, { add: () => Mods.openExpenseSheet({ projectId: p.id }) });
  }

  // تبويب الدفعات
  function tabPayments(box, p, f) {
    const list = db().payments.filter(x => x.projectId === p.id).sort(sortByDateDesc);
    box.innerHTML = `
      ${statsHTML([['قيمة المشروع', money(f.value)], ['المدفوع', money(f.paid), 'ok'], ['المتبقي', money(f.remaining), f.remaining > 0 ? 'due' : '']])}
      <button type="button" class="btn btn-accent" style="margin-bottom:12px" data-act="add">${icon('cash')} تسجيل دفعة / مقدم / مستخلص</button>
      ${list.length ? `<div class="card">${list.map(paymentEntryHTML).join('')}</div>` : emptyHTML('cash', 'مفيش دفعات مسجلة لسه')}`;
    bindPaymentEntries(box);
    bindActions(box, { add: () => openPaymentSheet({ projectId: p.id, customerId: p.customerId }) });
  }

  // تبويب العمال
  function tabWorkers(box, p, f) {
    const logs = db().workLogs.filter(l => l.projectId === p.id).sort(sortByDateDesc);
    const perWorker = {};
    logs.forEach(l => { const k = l.workerId; perWorker[k] = perWorker[k] || { days: 0, total: 0 }; perWorker[k].days += nn(l.days); perWorker[k].total += nn(l.days) * nn(l.wage); });
    box.innerHTML = `
      ${statsHTML([['أيام العمل', fmtQ(Calc.sum(logs, l => l.days))], ['عدد العمال', Object.keys(perWorker).length], ['إجمالي الأجور', money(f.wages)]])}
      <button type="button" class="btn btn-soft" style="margin-bottom:12px" data-act="add">${icon('hardhat')} تسجيل يومية على المشروع</button>
      ${Object.keys(perWorker).length ? `<div class="card"><div class="sum-list">${Object.entries(perWorker).map(([wid, v]) => rowLine(esc((by('workers', wid) || {}).name || 'عامل محذوف') + ` — ${fmtQ(v.days)} يوم`, money(v.total))).join('')}</div></div>` : ''}
      ${logs.length ? `<div class="card">${logs.map(Mods.logEntryHTML).join('')}</div>` : emptyHTML('hardhat', 'مفيش يوميات عمال مسجلة على المشروع')}`;
    box.querySelectorAll('[data-log]').forEach(el => { el.onclick = () => Mods.openLogSheet(by('workLogs', el.dataset.log)); });
    bindActions(box, { add: () => Mods.openDailyLog({ projectId: p.id }) });
  }

  // تبويب الملخص والأرباح
  function tabSummary(box, p, f) {
    const cats = Object.entries(f.expensesByCat);
    box.innerHTML = `
      <div class="card"><div class="card-title"><div class="t-ic orange">${icon('layers')}</div><h2>قيمة المشروع (الإيرادات)</h2></div><div class="sum-list">
        ${rowLine('المصنعية', money(f.items.labor))}${rowLine('الخامات (توريد للعميل)', money(f.items.material))}
        ${f.additions ? rowLine('إضافات', '+ ' + money(f.additions)) : ''}${f.discount ? rowLine('خصم', '- ' + money(f.discount), 'minus') : ''}
        ${p.status === 'cancelled' ? rowLine('المشروع ملغي — قيمته مش محسوبة', '0', 'minus') : ''}
      </div><div class="sum-total"><span>إجمالي الإيرادات</span><strong>${money(f.value)}</strong></div></div>
      <div class="card"><div class="card-title"><div class="t-ic">${icon('receipt')}</div><h2>التكاليف</h2></div><div class="sum-list">
        ${rowLine('خامات اشتريتها / صرفتها', money(f.materialsCost))}${rowLine('أجور العمال', money(f.wages))}
        ${cats.map(([k, v]) => rowLine(Fin.EXPENSE_CATS[k], money(v))).join('')}
        ${f.purchasesCost ? rowLine('فواتير مشتريات للمشروع', money(f.purchasesCost)) : ''}
        ${rowLine('إجمالي التكاليف', money(f.cost), 'bold')}
      </div></div>
      <div class="card"><div class="sum-list">
        ${rowLine('إجمالي الإيرادات', money(f.value))}${rowLine('إجمالي التكاليف', '- ' + money(f.cost), 'minus')}
      </div><div class="sum-total"><span>صافي الربح${f.value ? ` (${f.margin}%)` : ''}</span><strong>${money(f.profit)}</strong></div>
      <div class="sum-list" style="margin-top:10px">${rowLine('المدفوع من العميل', money(f.paid))}${rowLine('المتبقي على العميل', money(f.remaining), 'bold')}</div></div>
      <div class="stack">
        <button type="button" class="btn btn-accent" data-act="docs">${icon('file')} إصدار فاتورة / مقايسة / عرض سعر / مستخلص</button>
        <div class="btn-row"><button type="button" class="btn btn-ghost" data-act="report">${icon('chart')} تقرير الأرباح PDF</button><button type="button" class="btn btn-wa" data-act="wa">${icon('send')} ملخص واتساب</button></div>
        <button type="button" class="btn btn-ghost" data-act="adj">${icon('tag')} الخصم والإضافات</button>
        <button type="button" class="btn btn-ghost" data-act="note">${icon('note')} ملاحظة على المشروع</button>
      </div>`;
    bindActions(box, {
      docs: () => openProjectDocs(p), report: () => Docs.printProfitReport(p), adj: () => openAdjustSheet(p),
      wa: () => { const c = by('customers', p.customerId); UI.openWhatsApp(Docs.projectWhatsAppText(p), c && c.phone); },
      note: () => Mods.openNoteSheet(null, { projectId: p.id, customerId: p.customerId, kind: 'project' })
    });
  }
  function openProjectDocs(p) {
    const existing = db().docs.filter(d => d.projectId === p.id).sort(sortByDateDesc);
    UI.openSheet({
      title: 'مستندات المشروع',
      render(body) {
        body.innerHTML = `<p class="hint" style="margin:-6px 0 10px">المستند بياخد البنود من المشروع وتقدر تعدّل فيه قبل الطباعة. المستندات المربوطة بالمشروع مش بتتحسب إيراد مرة تانية.</p>
          <div class="create-list">${['labor', 'supply', 'both', 'estimate', 'quote', 'extract'].map(t => `<button type="button" class="create-opt" data-act="new" data-id="${t}"><span class="q-ic">${icon(Docs.TYPE_ICONS[t])}</span><span><b>${Fin.DOC_TYPES[t].label}</b></span></button>`).join('')}</div>
          ${existing.length ? `<h4 class="more-h" style="margin-top:14px">مستندات سابقة</h4>${existing.map(Docs.cardHTML).join('')}` : ''}`;
        bindActions(body, { new: t => UI.closeThen(1, () => Docs.createFromProject(p, t)) });
        Docs.bindCards(body, true);
      }
    });
  }

  /* ================= الدفعات ================= */
  function paymentEntryHTML(x) {
    const pn = projectName(x.projectId), cn = customerName(x.customerId);
    return `<div class="entry" data-pay="${x.id}"><span class="e-ic">${icon('cash')}</span>
      <div class="e-info"><div class="e-title">${esc(Fin.PAY_KINDS[x.kind] || 'دفعة')} ${x.number ? '<span class="src-badge">' + esc(x.number) + '</span>' : ''}</div>
      <div class="e-meta">${esc(fmtDate(x.date))}${pn ? ' · ' + esc(pn) : (cn ? ' · ' + esc(cn) : '')}${x.method ? ' · ' + esc(x.method) : ''}${x.note ? ' · ' + esc(x.note) : ''}</div></div>
      <button type="button" class="card-del soft" data-receipt="${x.id}" aria-label="إيصال استلام">${icon('printer')}</button>
      <div class="e-amt">${fmt(x.amount)}</div></div>`;
  }
  function bindPaymentEntries(el) {
    el.querySelectorAll('[data-pay]').forEach(e => { e.onclick = () => openPaymentSheet(by('payments', e.dataset.pay)); });
    el.querySelectorAll('[data-receipt]').forEach(b => { b.onclick = ev => { ev.stopPropagation(); Docs.printReceipt(by('payments', b.dataset.receipt)); }; });
  }
  function openPaymentSheet(init) {
    const orig = init && init.id ? init : null;
    const st = orig ? Object.assign({}, orig) : Object.assign({ projectId: null, customerId: null, amount: '', kind: 'payment', date: today(), method: 'كاش', note: '' }, init || {});
    UI.openSheet({
      title: orig ? 'تعديل الدفعة' : 'تسجيل دفعة من عميل',
      render(body, sheet) {
        const p = st.projectId && by('projects', st.projectId);
        if (p && !st.customerId) st.customerId = p.customerId;
        const c = st.customerId && by('customers', st.customerId);
        const f = p ? Fin.projectFinance(db(), p) : null;
        const remain = f ? round(f.remaining + (orig ? nn(orig.amount) : 0), 4) : null;
        body.innerHTML = `
          <div class="field"><label>الدفعة دي على</label>
            <div class="link-box" style="margin-top:0"><span class="l-ic">${icon(p ? 'briefcase' : 'user')}</span><span class="l-txt"><b>${p ? esc(p.name) : (c ? esc(c.name) : 'اختار مشروع أو عميل')}</b><span>${p && c ? esc(c.name) : (p ? '' : (c ? 'حساب عام للعميل' : ''))}</span></span></div>
            <div class="btn-row" style="margin-top:8px"><button type="button" class="chip" data-act="proj">${icon('briefcase')} اختيار مشروع</button><button type="button" class="chip" data-act="cust">${icon('user')} عميل بدون مشروع</button></div></div>
          ${UI.formHTML([
            { k: 'amount', label: `المبلغ (${UI.curSym()})`, type: 'number', placeholder: '0', value: st.amount, half: true },
            { k: 'date', label: 'التاريخ', type: 'date', value: st.date, half: true },
            { html: remain > 0 ? `<button type="button" class="chip" style="margin:-4px 0 12px" data-act="fill">ادفع المتبقي كله: ${money(remain)}</button>` : '' },
            { k: 'kind', label: 'نوع الدفعة', type: 'chips', options: Object.entries(Fin.PAY_KINDS), value: st.kind },
            { k: 'method', label: 'طريقة الدفع', type: 'chips', options: [['كاش', 'كاش'], ['تحويل', 'تحويل'], ['محفظة', 'محفظة'], ['شيك', 'شيك']], value: st.method },
            { k: 'note', label: 'ملاحظة / أمارة', type: 'textarea', optional: true, placeholder: 'مثال: استلمتها في الموقع بحضور فلان', value: st.note },
            { html: `<div class="btn-row"><button type="button" class="btn btn-primary" data-act="save">حفظ</button><button type="button" class="btn btn-ghost" data-act="cancel">إلغاء</button></div>
              <div class="btn-row" style="margin-top:10px">${orig ? `<button type="button" class="btn btn-soft" data-act="receipt">${icon('printer')} إيصال استلام</button><button type="button" class="btn btn-danger" data-act="del">${icon('trash')} حذف</button>` : `<button type="button" class="btn btn-soft" data-act="saveReceipt" style="grid-column:1/-1">${icon('printer')} حفظ وطباعة إيصال</button>`}</div>` }
          ])}`;
        const sync = () => Object.assign(st, UI.readForm(body));
        UI.bindChips(body, (k, v) => { st[k] = v; });
        body.querySelectorAll('input,textarea').forEach(i => i.addEventListener('input', sync));
        const save = then => {
          sync();
          if (!(nn(st.amount) > 0)) { UI.toast('⚠️ اكتب المبلغ', 'err'); return; }
          if (!st.projectId && !st.customerId) { UI.toast('⚠️ اختار المشروع أو العميل', 'err'); return; }
          st.amount = nn(st.amount);
          if (!st.number) st.number = Store.nextNumber('receipt', 'R');
          const saved = Store.upsert('payments', orig ? Object.assign(by('payments', orig.id), st) : st);
          if (!commit('✔️ تم تسجيل الدفعة')) return;
          UI.closeThen(1, () => then && then(saved));
        };
        bindActions(body, {
          proj: () => { sync(); pickProject(id => { st.projectId = id; st.customerId = (by('projects', id) || {}).customerId || null; sheet.refresh(); }); },
          cust: () => { sync(); pickCustomer(id => { st.customerId = id; st.projectId = null; sheet.refresh(); }); },
          fill: () => { UI.setVal(body, 'amount', round(remain, 2)); sync(); },
          cancel: () => UI.back(), save: () => save(), saveReceipt: () => save(x => Docs.printReceipt(x)),
          receipt: () => { sync(); Docs.printReceipt(Object.assign({}, orig, st)); },
          del: () => UI.confirm(`حذف دفعة ${money(orig.amount)}؟`, () => { Store.remove('payments', orig.id); commit('🗑️ تم حذف الدفعة'); UI.back(); }, { yes: 'حذف' })
        });
      }
    });
  }

  /* ================= اختيار (عميل / مشروع / نوع عمل) ================= */
  function pickerSheet(title, getItems, onPick, extra) {
    let q = '';
    UI.openSheet({
      title, refreshBelow: false,
      render(body) {
        body.innerHTML = `<div class="field"><input type="search" data-q placeholder="ابحث..." value="${esc(q)}"></div><div class="suggest pick-list" style="margin-top:0" data-list></div>`;
        const list = body.querySelector('[data-list]');
        const draw = () => {
          const items = getItems(q);
          list.innerHTML = (extra ? extra(q) : '') + (items.length ? items.map(it => `<button type="button" data-id="${esc(it.id)}"><span class="s-av">${it.av || initial(it.title)}</span><span style="flex:1;min-width:0">${esc(it.title)}<small>${esc(it.sub || '')}</small></span>${it.side ? `<b>${esc(it.side)}</b>` : ''}</button>`).join('') : '<div class="home-empty" style="border:0">مفيش نتائج</div>');
          UI.hydrateIcons(list);
          list.querySelectorAll('[data-id]').forEach(b => { b.onclick = () => { const id = b.dataset.id; UI.closeThen(1, () => onPick(id)); }; });
        };
        const inp = body.querySelector('[data-q]');
        inp.oninput = () => { q = inp.value.trim(); draw(); };
        draw();
      }
    });
  }
  function pickCustomer(cb) {
    pickerSheet('اختيار عميل', q => db().customers.filter(c => !q || (c.name + ' ' + (c.phone || '')).includes(q)).map(c => ({ id: c.id, title: c.name, sub: c.phone || c.address || '' })),
      id => {
        if (id.startsWith('new:')) { const name = id.slice(4); const c = Store.upsert('customers', { name, phone: '', address: '', note: '' }); commit(); cb(c.id); }
        else cb(id);
      },
      q => q ? `<button type="button" data-id="new:${esc(q)}"><span class="s-av add">${icon('plus')}</span><span style="flex:1">إضافة عميل جديد: «${esc(q)}»</span></button>` : '');
  }
  function pickProject(cb, filter) {
    pickerSheet('اختيار مشروع', q => db().projects.filter(p => (!filter || filter(p)) && (!q || (p.name + ' ' + customerName(p.customerId)).includes(q))).map(p => ({ id: p.id, title: p.name, sub: [customerName(p.customerId), Fin.STATUSES[p.status || 'new']].filter(Boolean).join(' · ') })),
      id => { if (id === 'new') openProjectEdit(null, { onCreated: pr => cb(pr.id) }); else cb(id); },
      () => `<button type="button" data-id="new"><span class="s-av add">${icon('plus')}</span><span style="flex:1">مشروع جديد</span></button>`);
  }
  function pickFloorType(cb) {
    let catKey = 'all';
    UI.openSheet({
      title: 'أنواع الأعمال', refreshBelow: false,
      render(body, sheet) {
        const cats = db().settings.categories;
        const list = db().floorTypes.filter(f => catKey === 'all' || f.cat === catKey);
        body.innerHTML = `<div class="filter-chips"><button type="button" class="chip${catKey === 'all' ? ' on' : ''}" data-c="all">الكل</button>${Object.entries(cats).map(([k, l]) => `<button type="button" class="chip${catKey === k ? ' on' : ''}" data-c="${esc(k)}">${esc(l)}</button>`).join('')}</div>
          <div class="suggest pick-list" style="margin-top:0">${list.map(f => `<button type="button" data-id="${f.id}"><span class="s-av">${icon('tiles')}</span><span style="flex:1;min-width:0">${esc(f.name)}<small>${esc(cats[f.cat] || '')} · ${esc(f.unit)}${nn(f.laborPrice) ? ' · مصنعية ' + fmt(f.laborPrice) : ''}</small></span></button>`).join('') || '<div class="home-empty" style="border:0">مفيش أنواع هنا — ضيفها من «المزيد ← أنواع الأرضيات والأعمال»</div>'}</div>`;
        body.querySelectorAll('[data-c]').forEach(b => { b.onclick = () => { catKey = b.dataset.c; sheet.refresh(); }; });
        body.querySelectorAll('[data-id]').forEach(b => { b.onclick = () => { const ft = by('floorTypes', b.dataset.id); UI.closeThen(1, () => cb(ft)); }; });
      }
    });
  }

  /* ================= العملاء ================= */
  function customerCardHTML(c) {
    const a = Fin.customerAccount(db(), c);
    return `<div class="cust-card" data-cust="${c.id}"><div class="inv-avatar">${initial(c.name)}</div>
      <div class="inv-info"><div class="n">${esc(c.name)}</div><div class="m">${esc(c.phone || 'بدون رقم')} · ${a.projects.length} مشروع</div></div>
      <div class="cust-amt ${a.balance > 0 ? 'due' : 'ok'}">${fmt(Math.abs(a.balance))}<small>${a.balance > 0 ? 'متبقي عليه' : (a.balance < 0 ? 'له عندك' : 'خالص')}</small></div></div>`;
  }
  function bindCustomerCards(el) { el.querySelectorAll('[data-cust]').forEach(c => { c.onclick = () => openCustomer(c.dataset.cust); }); }
  function openCustomers() {
    let q = '';
    UI.openPage({
      title: 'العملاء', sub: 'حسابات العملاء والمديونيات',
      actions: [{ icon: 'plus', label: 'عميل جديد', accent: true, onClick: () => openCustomerEdit(null) }],
      render(body) {
        const all = db().customers.map(c => ({ c, a: Fin.customerAccount(db(), c) }));
        const due = Calc.sum(all, x => Math.max(0, x.a.balance));
        const list = all.filter(x => !q || (x.c.name + ' ' + (x.c.phone || '')).includes(q)).sort((x, y) => y.a.balance - x.a.balance);
        body.innerHTML = `<section class="hero"><div class="hero-label">إجمالي المتبقي عند العملاء</div><div class="hero-value">${fmt(due)}<small>${UI.curSym()}</small></div>
          <div class="hero-stats"><div class="hero-stat"><span>عدد العملاء</span><strong>${all.length}</strong></div><div class="hero-stat"><span>عليهم متبقي</span><strong>${all.filter(x => x.a.balance > 0).length}</strong></div><div class="hero-stat"><span>إجمالي ما وصلك</span><strong>${fmt(Calc.sum(all, x => x.a.paid))}</strong></div></div></section>
          <div class="field"><input type="search" data-q placeholder="ابحث باسم العميل أو رقمه..." value="${esc(q)}"></div>
          <div data-list>${list.length ? list.map(x => customerCardHTML(x.c)).join('') : emptyHTML('users', 'لسه مفيش عملاء', `<button type="button" class="btn btn-accent" data-act="new">${icon('plus')} عميل جديد</button>`)}</div>`;
        const inp = body.querySelector('[data-q]');
        inp.oninput = () => { q = inp.value.trim(); const l = body.querySelector('[data-list]'); l.innerHTML = all.filter(x => !q || (x.c.name + ' ' + (x.c.phone || '')).includes(q)).map(x => customerCardHTML(x.c)).join(''); bindCustomerCards(l); };
        bindCustomerCards(body);
        bindActions(body, { new: () => openCustomerEdit(null) });
      }
    });
  }
  function openCustomerEdit(c) {
    const st = c ? Object.assign({}, c) : { name: '', phone: '', address: '', note: '' };
    UI.openSheet({
      title: c ? 'تعديل بيانات العميل' : 'عميل جديد', autofocus: !c,
      render(body) {
        body.innerHTML = UI.formHTML([
          { k: 'name', label: 'اسم العميل', placeholder: 'مثال: أ. محمد فيصل', value: st.name },
          { k: 'phone', label: 'رقم الهاتف', type: 'tel', placeholder: '01xxxxxxxxx', value: st.phone },
          { k: 'address', label: 'العنوان', value: st.address },
          { k: 'note', label: 'ملاحظات', type: 'textarea', optional: true, value: st.note },
          { html: `<div class="btn-row"><button type="button" class="btn btn-primary" data-act="save">حفظ</button><button type="button" class="btn btn-ghost" data-act="cancel">إلغاء</button></div>${c ? `<button type="button" class="btn btn-danger" style="margin-top:10px" data-act="del">${icon('trash')} حذف العميل</button>` : ''}` }
        ]);
        bindActions(body, {
          cancel: () => UI.back(),
          del: () => {
            const L = Store.customerLinks(c.id);
            if (L.projects.length || L.docs.length || L.payments.length) { UI.alert(`العميل ده مربوط بـ ${L.projects.length} مشروع و${L.docs.length} مستند و${L.payments.length} دفعة.\nعلشان بياناتك ما تضيعش، احذف أو انقل الحاجات دي الأول.`, 'مينفعش الحذف'); return; }
            UI.confirm(`حذف العميل «${c.name}»؟`, () => { Store.remove('customers', c.id); db().notes.forEach(n => { if (n.customerId === c.id) n.customerId = null; }); commit('🗑️ تم حذف العميل'); UI.closeThen(UI.topPage() && UI.topPage().opts.customerId === c.id ? 2 : 1); }, { yes: 'حذف' });
          },
          save: () => {
            Object.assign(st, UI.readForm(body));
            if (!st.name) { UI.toast('⚠️ اكتب اسم العميل', 'err'); return; }
            const saved = Store.upsert('customers', c ? Object.assign(by('customers', c.id), st) : st);
            if (commit('✔️ تم حفظ العميل')) UI.closeThen(1, () => { if (!c) openCustomer(saved.id); });
          }
        });
      }
    });
  }
  function openCustomer(id) {
    UI.openPage({
      customerId: id,
      render(body, page) {
        const c = by('customers', id);
        if (!c) { body.innerHTML = emptyHTML('alert', 'العميل ده اتحذف'); return; }
        const a = Fin.customerAccount(db(), c);
        const notes = db().notes.filter(n => n.customerId === id).sort(sortByDateDesc);
        page.setTitle(c.name, c.phone || '');
        page.setActions([{ icon: 'edit', label: 'تعديل', onClick: () => openCustomerEdit(c) }]);
        body.innerHTML = `<section class="hero"><div class="hero-label">${a.balance >= 0 ? 'المتبقي على العميل' : 'رصيد للعميل عندك'}</div><div class="hero-value">${fmt(Math.abs(a.balance))}<small>${UI.curSym()}</small></div>
          <div class="hero-stats"><div class="hero-stat"><span>قيمة الأعمال</span><strong>${fmt(a.value)}</strong></div><div class="hero-stat"><span>المدفوع</span><strong>${fmt(a.paid)}</strong></div><div class="hero-stat"><span>المشروعات</span><strong>${a.projects.length}</strong></div></div></section>
          ${c.address || c.note ? `<div class="note" style="margin-bottom:12px">${c.address ? `<strong>العنوان:</strong> ${esc(c.address)}<br>` : ''}${c.note ? esc(c.note) : ''}</div>` : ''}
          <div class="btn-row" style="margin-bottom:10px"><button type="button" class="btn btn-accent" data-act="pay">${icon('cash')} تسجيل دفعة</button><button type="button" class="btn btn-soft" data-act="proj">${icon('briefcase')} مشروع جديد</button></div>
          <div class="btn-row" style="margin-bottom:14px"><button type="button" class="btn btn-ghost" data-act="stmt">${icon('printer')} كشف حساب PDF</button><button type="button" class="btn btn-wa" data-act="wa">${icon('send')} كشف واتساب</button></div>
          ${c.phone ? `<a class="btn btn-ghost" style="margin-bottom:14px" href="tel:${esc(c.phone)}">${icon('phone')} اتصال بالعميل</a>` : ''}
          <div data-az-crew="flooring:${esc(c.id)}" data-sec="الأرضيات" data-name="${esc(c.name)}" data-phone="${esc(c.phone || '')}" data-address="${esc(c.address || '')}" data-rev="${a.value}" data-paid="${a.paid}" data-cur="${esc(UI.curSym())}"></div>
          <div class="section-head"><h3>المشروعات<span class="count">${a.projects.length}</span></h3></div>
          ${a.projects.length ? a.projects.map(x => projectCardHTML(x.project)).join('') : '<div class="home-empty" style="margin-bottom:12px">مفيش مشروعات للعميل ده</div>'}
          ${a.docs.length ? `<div class="section-head"><h3>فواتير منفصلة<span class="count">${a.docs.length}</span></h3></div>${a.docs.map(Docs.cardHTML).join('')}` : ''}
          <div class="section-head"><h3>الدفعات<span class="count">${a.payments.length}</span></h3></div>
          ${a.payments.length ? `<div class="card">${a.payments.slice().sort(sortByDateDesc).map(paymentEntryHTML).join('')}</div>` : '<div class="home-empty" style="margin-bottom:12px">مفيش دفعات</div>'}
          <div class="section-head"><h3>ملاحظات العميل<span class="count">${notes.length}</span></h3><button type="button" class="btn btn-soft btn-sm" data-act="note">${icon('plus')} ملاحظة</button></div>
          ${notes.map(Mods.noteCardHTML).join('')}`;
        bindProjectCards(body); bindPaymentEntries(body); Docs.bindCards(body); Mods.bindNoteCards(body);
        bindActions(body, {
          pay: () => openPaymentSheet({ customerId: id }), proj: () => openProjectEdit(null, { customerId: id }),
          stmt: () => Docs.printStatement(c), wa: () => UI.openWhatsApp(Docs.statementText(c), c.phone),
          note: () => Mods.openNoteSheet(null, { customerId: id, kind: 'customer' })
        });
      }
    });
  }

  /* ================= المزيد ================= */
  function renderMore(el) {
    const tile = (act, ic, title, sub, tone) => `<button type="button" class="q-tile" data-act="${act}"><span class="q-ic ${tone || ''}">${icon(ic)}</span><b>${title}</b><small>${sub}</small></button>`;
    el.innerHTML = `
      <h3 class="more-h">الإدارة</h3>
      <div class="quick">
        ${tile('customers', 'users', 'العملاء', 'الحسابات والمديونيات')}
        ${tile('docs', 'file', 'الفواتير والمستندات', 'فواتير، مقايسات، مستخلصات', 'orange-soft')}
        ${tile('inventory', 'store', 'الخامات والمخزون', 'أسعار، كميات، تنبيهات', 'orange-soft')}
        ${tile('workers', 'hardhat', 'العمال والصنايعية', 'يوميات، سلف، مستحقات')}
        ${tile('expenses', 'receipt', 'المصروفات', 'نقل، إيجار، إدارية')}
        ${tile('notes', 'note', 'النوتة', 'ملاحظات، مواعيد، مقاسات', 'green')}
        ${tile('reports', 'chart', 'الأرباح والتقارير', 'أرباح كل مشروع', 'green')}
        ${tile('types', 'tiles', 'أنواع الأرضيات والأعمال', 'الكتالوج والأسعار الافتراضية')}
      </div>
      <h3 class="more-h" style="margin-top:16px">الإعدادات</h3>
      <div class="menu-list">
        <button type="button" class="action-item" data-act="biz"><span class="a-ic orange">${icon('briefcase')}</span><span>بيانات النشاط على الفواتير<small>الاسم، التليفون، العنوان، اللوجو</small></span></button>
        <button type="button" class="action-item" data-act="settings"><span class="a-ic">${icon('gear')}</span><span>العملة والمظهر<small>${esc(UI.currency().name)} · ${({ auto: 'مظهر تلقائي', light: 'فاتح', dark: 'ليلي' })[db().settings.theme || 'auto']}</small></span></button>
        <button type="button" class="action-item" data-act="backup"><span class="a-ic green">${icon('save')}</span><span>النسخ الاحتياطي والاستعادة<small>${Mods.backupLine()}</small></span></button>
        <button type="button" class="action-item" data-act="about"><span class="a-ic">${icon('info')}</span><span>عن التطبيق والتحديثات<small>الإصدار ${esc(root.APP_VERSION)}</small></span></button>
      </div>`;
    bindActions(el, {
      customers: openCustomers, docs: () => Docs.openList(), inventory: () => Mods.openInventory(), workers: () => Mods.openWorkers(),
      expenses: () => Mods.openExpenses(), notes: () => Mods.openNotes(), reports: () => Mods.openReports(), types: () => Mods.openFloorTypes(),
      biz: () => Mods.openBizSettings(), settings: () => Mods.openSettings(), backup: () => Mods.openBackup(), about: () => Mods.openAbout()
    });
  }

  /* ================= المظهر ================= */
  const darkQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function isDark() { const m = db().settings.theme; return m === 'dark' || (m !== 'light' && !!(darkQuery && darkQuery.matches)); }
  function applyTheme() {
    const m = db().settings.theme;
    if (m === 'dark' || m === 'light') document.documentElement.setAttribute('data-theme', m); else document.documentElement.removeAttribute('data-theme');
    const b = document.getElementById('themeBtn');
    if (b) b.innerHTML = icon(isDark() ? 'sun' : 'moon');
  }
  function setTheme(m) { db().settings.theme = m; commit(); applyTheme(); }
  function toggleTheme() { setTheme(isDark() ? 'light' : 'dark'); UI.toast(isDark() ? '🌙 الوضع الليلي' : '☀️ الوضع الفاتح'); }
  if (darkQuery) { try { darkQuery.addEventListener('change', applyTheme); } catch (e) { try { darkQuery.addListener(applyTheme); } catch (e2) {} } }

  /* ================= التشغيل ================= */
  function init() {
    Store.load();
    if (Store.lastError) UI.toast('⚠️ في مشكلة في قراءة البيانات المحفوظة', 'err');
    UI.setCurrency(db().settings.currency);
    applyTheme();
    UI.hydrateIcons(document);
    document.getElementById('themeBtn').onclick = toggleTheme;
    document.querySelectorAll('[data-nav]').forEach(b => { b.onclick = () => switchView(b.dataset.nav); });
    document.getElementById('navPlus').onclick = openCreate;
    switchView('home');
    // حفظ احتياطي عند الخروج من التطبيق
    document.addEventListener('visibilitychange', () => { if (document.hidden) Store.save(); });
    window.addEventListener('pagehide', () => Store.save());
  }

  root.App = {
    init, commit, switchView, refreshView, setTheme, applyTheme, openCreate,
    openProject, openProjectEdit, openItemSheet, openPaymentSheet, openCustomers, openCustomer, openCustomerEdit,
    pickCustomer, pickProject, pickFloorType, projectCardHTML, bindProjectCards, paymentEntryHTML, bindPaymentEntries,
    customerCardHTML, bindCustomerCards, emptyHTML, statsHTML, rowLine, bindActions, customerName, projectName, sortByDateDesc, statusBadge, initial
  };
})(typeof self !== 'undefined' ? self : this);
