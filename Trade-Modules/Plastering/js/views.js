/*
 * HESABATI PLASTER — الشاشات الرئيسية: الرئيسية، المشروعات، المشروع، الحاسبات، زرار (+)
 */
(function () {
  'use strict';
  const U = window.UI, E = U.E, C = U.C, S = U.S, ED = window.Editors;
  const { esc, icon, fq, money, fmtDate } = U;

  const STATUS = { quote: ['عرض سعر', 'violet'], active: ['جاري التنفيذ', 'orange'], paused: ['متوقف', 'red'], done: ['تم التسليم', 'green'] };
  const PRICING = [['items', 'بالبنود (مجموع البنود)'], ['lump', 'مقاولة كاملة (مبلغ إجمالي ثابت)'], ['phase', 'حسب المراحل (سعر لكل مرحلة)']];
  const PH_STATUS = [['pending', 'لم تبدأ'], ['active', 'جارية'], ['done', 'تمت']];

  function ctx() { const d = S.db(); return { movements: d.movements, materials: d.materials, workerPays: d.workerPays }; }
  function pcalc(p) { return E.projectCalc(p, ctx()); }
  function realProjects() { return S.db().projects.filter(p => !p.scratch); }
  function clientName(p) { const c = S.client(p.clientId); return c ? c.name : ''; }
  function statusBadge(s) { const x = STATUS[s] || STATUS.quote; return `<span class="badge ${x[1]}">${x[0]}</span>`; }
  function monthKey(d) { return String(d || '').slice(0, 7); }

  function projectRow(p) {
    const r = pcalc(p);
    return `<button type="button" class="row-card" data-act="openProject" data-pid="${p.id}">
      <span class="av">${esc(U.initials(p.name))}</span>
      <span class="rc-info"><span class="n">${esc(p.name)} ${statusBadge(p.status)}</span><span class="m">${[clientName(p), p.address, p.items.length + ' بند'].filter(Boolean).map(esc).join(' · ')}</span></span>
      <span class="rc-amt ${r.remaining > 0.009 ? 'due' : 'ok'}">${money(r.remaining)}<small>${r.remaining > 0.009 ? 'متبقي من ' + U.fmt(r.net) : 'خالص · ' + U.fmt(r.net)}</small></span>
    </button>`;
  }

  /* ================= الرئيسية ================= */
  U.VIEWS.home = {
    tab: true,
    render() {
      const d = S.db();
      const ps = realProjects();
      const calcs = ps.map(p => ({ p, r: pcalc(p) }));
      const due = calcs.reduce((s, x) => s + Math.max(0, x.r.remaining), 0);
      const active = ps.filter(p => p.status === 'active').length;
      const mk = monthKey(S.today());
      const monthIn = ps.reduce((s, p) => s + p.payments.filter(x => monthKey(x.date) === mk).reduce((a, x) => a + E.n(x.amount), 0), 0);
      const profit = calcs.reduce((s, x) => s + x.r.profit, 0);
      const low = d.materials.filter(m => E.stockFor(m, d.movements).low).length;
      const wDue = d.workers.reduce((s, w) => s + Math.max(0, E.workerCalc(w, d.projects, d.workerPays).due), 0);
      const lb = S.lastBackup();
      const needBackup = ps.length > 0 && (!lb || Date.now() - lb > 7 * 864e5);
      const greet = d.settings.bizName ? 'أهلاً ' + d.settings.bizName : 'أهلاً بيك';
      const html = `
      <section class="hero">
        <div class="hero-label">المتبقي لك عند العملاء</div>
        <div class="hero-value">${U.fmt(due)} <small>${esc(U.cur().sym)}</small></div>
        <div class="hero-stats">
          <button type="button" class="hero-stat" data-act="go" data-view="projects"><span>مشروعات جارية</span><strong>${active} / ${ps.length}</strong></button>
          <button type="button" class="hero-stat" data-act="go" data-view="reports"><span>مقبوضات الشهر</span><strong>${U.fmt(monthIn)}</strong></button>
          <button type="button" class="hero-stat${profit < 0 ? ' warn' : ''}" data-act="go" data-view="reports"><span>صافي الربح</span><strong>${U.fmt(profit)}</strong></button>
        </div>
      </section>
      ${low ? `<button type="button" class="alert-line" data-act="go" data-view="stock" data-args="low">${icon('alert')}<span><b>${low} خامة</b> وصلت للحد الأدنى في المخزن</span></button>` : ''}
      ${wDue > 0.009 ? `<button type="button" class="alert-line" data-act="go" data-view="workers">${icon('worker')}<span>مستحقات العمال: <b>${U.moneyT(wDue)}</b></span></button>` : ''}
      ${needBackup ? `<button type="button" class="alert-line" data-act="backupNow">${icon('save')}<span>بقالك فترة من غير نسخة احتياطية — <b>اعمل نسخة دلوقتي</b></span></button>` : ''}
      <h2 class="home-h">ابدأ بسرعة</h2>
      <div class="quick">
        <button type="button" class="q-tile dark" data-act="newProject"><span class="q-ic orange">${icon('folder')}</span><b>مشروع جديد</b><small>عميل + مساحات + بنود</small></button>
        <button type="button" class="q-tile" data-act="go" data-view="calc"><span class="q-ic orange-soft">${icon('calc')}</span><b>حاسبة سريعة</b><small>محارة، جرافيت، معجون، واجهات</small></button>
        <button type="button" class="q-tile" data-act="quickPayment"><span class="q-ic green">${icon('cash')}</span><b>تسجيل دفعة</b><small>من عميل على مشروع</small></button>
        <button type="button" class="q-tile" data-act="quickMove"><span class="q-ic violet">${icon('store')}</span><b>حركة مخزن</b><small>شراء، بيع، صرف خامات</small></button>
      </div>
      <div class="quick three mt">
        <button type="button" class="q-tile" data-act="go" data-view="workers"><span class="q-ic">${icon('worker')}</span><b>العمال</b><small>${d.workers.length} عامل</small></button>
        <button type="button" class="q-tile" data-act="go" data-view="clients"><span class="q-ic">${icon('users')}</span><b>العملاء</b><small>${d.clients.length} عميل</small></button>
        <button type="button" class="q-tile" data-act="go" data-view="reports"><span class="q-ic">${icon('chart')}</span><b>التقارير</b><small>الأرباح والتكاليف</small></button>
      </div>
      <div class="home-row"><h2 class="home-h" style="margin:0">آخر المشروعات</h2><button type="button" class="link-btn" data-act="go" data-view="projects">عرض الكل</button></div>
      ${ps.length ? ps.slice(-5).reverse().map(projectRow).join('') : `<div class="empty"><div class="big">${icon('trowel')}</div><p>ابدأ أول مشروع: سجّل العميل، احسب المساحات، واختار البنود (محارة، جرافيت، معجون، واجهات).</p><button type="button" class="btn btn-accent" data-act="newProject">${icon('plus')} مشروع جديد</button></div>`}`;
      return { title: 'حساباتي للمحارة', sub: greet, html };
    }
  };

  /* ================= المشروعات ================= */
  let projFilter = 'all', projSearch = '';
  U.VIEWS.projects = {
    tab: true,
    render() {
      const ps = realProjects().slice().reverse();
      const html = `
        <div class="field"><input type="search" id="projSearch" placeholder="ابحث باسم المشروع أو العميل أو العنوان..." value="${esc(projSearch)}"></div>
        <div class="chips">${[['all', 'الكل']].concat(Object.keys(STATUS).map(k => [k, STATUS[k][0]])).concat([['due', 'عليها متبقي']]).map(f => `<button type="button" class="chip${projFilter === f[0] ? ' on' : ''}" data-act="projFilter" data-v="${f[0]}">${f[1]}</button>`).join('')}</div>
        <div id="projList"></div>
        <button type="button" class="btn btn-accent mt" data-act="newProject">${icon('plus')} مشروع جديد</button>`;
      return {
        title: 'المشروعات', sub: ps.length + ' مشروع', html,
        after(root) {
          const s = root.querySelector('#projSearch');
          s.oninput = () => { projSearch = s.value; U.live(); };
        }
      };
    },
    live() {
      const q = projSearch.trim();
      const list = realProjects().slice().reverse().filter(p => {
        if (projFilter === 'due') { if (pcalc(p).remaining <= 0.009) return false; }
        else if (projFilter !== 'all' && p.status !== projFilter) return false;
        if (!q) return true;
        const c = S.client(p.clientId) || {};
        return [p.name, p.address, c.name, c.phone].some(x => String(x || '').includes(q));
      });
      const box = document.getElementById('projList');
      if (box) box.innerHTML = list.map(projectRow).join('') || `<div class="empty"><p>مفيش مشروعات ${q || projFilter !== 'all' ? 'مطابقة' : 'لسه'}</p></div>`;
    }
  };

  /* ================= المشروع ================= */
  const TABS = [['sum', 'ملخص'], ['zones', 'المساحات'], ['items', 'البنود'], ['phases', 'المراحل'], ['money', 'الحسابات'], ['docs', 'المستندات']];

  U.VIEWS.project = {
    parent: () => ['projects'],
    render(pid, tab) {
      const p = S.project(pid);
      if (!p || p.scratch) return { redirect: ['projects'] };
      tab = tab || 'sum';
      const r = pcalc(p);
      const c = S.client(p.clientId);
      let body = '';
      if (tab === 'sum') body = tabSummary(p, r, c);
      else if (tab === 'zones') body = tabZones(p, r);
      else if (tab === 'items') body = tabItems(p, r);
      else if (tab === 'phases') body = tabPhases(p, r);
      else if (tab === 'money') body = tabMoney(p, r);
      else if (tab === 'docs') body = tabDocs(p, r);
      const html = `<nav class="tabs">${TABS.map(t => `<button type="button" class="tab${t[0] === tab ? ' on' : ''}" data-act="projTab" data-pid="${p.id}" data-tab="${t[0]}">${t[1]}</button>`).join('')}</nav>${body}`;
      return {
        title: p.name, sub: [c ? c.name : 'بدون عميل', STATUS[p.status] ? STATUS[p.status][0] : ''].filter(Boolean).join(' · '), html,
        actions: [{ icon: 'edit', act: 'editProject', data: { pid: p.id }, label: 'بيانات المشروع' }, { icon: 'printer', act: 'projDocs', data: { pid: p.id }, accent: true, label: 'المستندات' }]
      };
    }
  };

  function tabSummary(p, r, c) {
    const pct = r.itemsTotal > 0 ? Math.round(r.doneValue / (r.net || 1) * 100) : 0;
    return `
      <section class="hero">
        <div class="hero-label">قيمة الأعمال بعد الخصم ${p.pricing === 'lump' ? '(مقاولة كاملة)' : p.pricing === 'phase' ? '(حسب المراحل)' : ''}</div>
        <div class="hero-value">${U.fmt(r.net)} <small>${esc(U.cur().sym)}</small></div>
        <div class="hero-stats">
          <div class="hero-stat"><span>المدفوع</span><strong>${U.fmt(r.received)}</strong></div>
          <div class="hero-stat${r.remaining > 0.009 ? ' warn' : ''}"><span>المتبقي على العميل</span><strong>${U.fmt(r.remaining)}</strong></div>
          <div class="hero-stat"><span>صافي الربح</span><strong>${U.fmt(r.profit)}</strong></div>
        </div>
      </section>
      <div class="quick three">
        <button type="button" class="q-tile" data-act="addPayment" data-pid="${p.id}"><span class="q-ic green">${icon('cash')}</span><b>دفعة</b><small>من العميل</small></button>
        <button type="button" class="q-tile" data-act="addExpense" data-pid="${p.id}"><span class="q-ic orange-soft">${icon('receipt')}</span><b>مصروف</b><small>سقالات، نقل...</small></button>
        <button type="button" class="q-tile" data-act="addLabor" data-pid="${p.id}"><span class="q-ic">${icon('worker')}</span><b>يومية</b><small>عامل / معلم</small></button>
      </div>
      <div class="card mt">
        <div class="card-title"><div class="t-ic">${icon('chart')}</div><h2>الموقف المالي</h2><span class="tag">${fq(r.margin, 1)}% هامش</span></div>
        <div class="kv">
          ${p.pricing === 'items' ? `<div class="kv-row"><span>المصنعية</span><strong>${U.moneyT(r.labor)}</strong></div><div class="kv-row"><span>الخامات الموردة (سعر البيع)</span><strong>${U.moneyT(r.matSell)}</strong></div>` : `<div class="kv-row"><span>مجموع البنود (للمقارنة)</span><strong>${U.moneyT(r.itemsTotal)}</strong></div>`}
          ${r.discount ? `<div class="kv-row minus"><span>الخصم</span><strong>− ${U.moneyT(r.discount)}</strong></div>` : ''}
          <div class="kv-row bold"><span>قيمة الأعمال</span><strong>${U.moneyT(r.net)}</strong></div>
          <div class="kv-row minus"><span>تكلفة الخامات ${r.matMode === 'actual' ? '(فعلي: مصروف من المخزن + مشتريات)' : '(تقديري من المقايسة)'}</span><strong>− ${U.moneyT(r.matCost)}</strong></div>
          <div class="kv-row minus"><span>يوميات وأجور العمال</span><strong>− ${U.moneyT(r.wages)}</strong></div>
          <div class="kv-row minus"><span>مصروفات أخرى</span><strong>− ${U.moneyT(r.expOther)}</strong></div>
        </div>
        <div class="total-bar ${r.profit >= 0 ? 'green' : 'red'}"><span>صافي الربح</span><strong>${U.moneyT(r.profit)}</strong></div>
        <div class="mini-stats mt">
          <div><span>المقبوض فعلاً</span><strong>${U.fmt(r.cashIn)}</strong></div>
          <div><span>المدفوع فعلاً</span><strong>${U.fmt(r.cashOut)}</strong></div>
          <div><span>الرصيد النقدي</span><strong>${U.fmt(r.cashBalance)}</strong></div>
        </div>
        ${r.wagesDue > 0.009 ? `<div class="note orange">مستحق للعمال على المشروع ولم يُدفع: <b>${U.moneyT(r.wagesDue)}</b></div>` : ''}
      </div>
      <div class="card">
        <div class="card-title"><div class="t-ic orange">${icon('flag')}</div><h2>نسبة التنفيذ</h2><span class="tag">${pct}%</span></div>
        <div class="progress"><i style="width:${Math.min(100, pct)}%"></i></div>
        <div class="hint">قيمة الأعمال المنفذة ${U.moneyT(r.doneValue)} — حدّث «نسبة التنفيذ» في كل بند لعمل المستخلص.</div>
      </div>
      <div class="card">
        <div class="card-title"><div class="t-ic">${icon('user')}</div><h2>بيانات المشروع</h2></div>
        <div class="kv">
          <div class="kv-row"><span>العميل</span><strong>${esc(c ? c.name : '—')}</strong></div>
          ${c && c.phone ? `<div class="kv-row"><span>الهاتف</span><strong dir="ltr">${esc(c.phone)}</strong></div>` : ''}
          ${p.address ? `<div class="kv-row"><span>العنوان</span><strong style="white-space:normal">${esc(p.address)}</strong></div>` : ''}
          ${p.buildingType ? `<div class="kv-row"><span>نوع المبنى</span><strong>${esc(p.buildingType)}${p.floors ? ' · ' + esc(p.floors) + ' أدوار' : ''}</strong></div>` : ''}
          ${p.facades ? `<div class="kv-row"><span>الواجهات المطلوبة</span><strong style="white-space:normal">${esc(p.facades)}</strong></div>` : ''}
          <div class="kv-row"><span>طريقة التسعير</span><strong>${esc((PRICING.find(x => x[0] === p.pricing) || PRICING[0])[1])}</strong></div>
        </div>
        <button type="button" class="btn btn-soft mt" data-act="editProject" data-pid="${p.id}">${icon('edit')} تعديل بيانات المشروع</button>
      </div>`;
  }

  function tabZones(p, r) {
    const zs = p.zones || [];
    const total = zs.reduce((s, z) => s + r.zones[z.id].area, 0);
    return `<div class="note mb">قسّم المشروع لأماكن: غرف، واجهة رئيسية، خلفية، جانبية، سور، بلكونات، أعمدة، كرانيش... كل منطقة لها قياسها، وتقدر تحط عليها أكثر من بند بتشطيب وسعر مختلف.</div>
      <div class="section-head"><h3>المناطق والمساحات<span class="count">${zs.length}</span></h3><span class="badge">${fq(total)} م²</span></div>
      ${zs.map(z => {
        const m = r.zones[z.id];
        const n = p.items.filter(i => i.zoneId === z.id);
        const tot = r.items.filter(x => x.item.zoneId === z.id).reduce((s, x) => s + x.res.total, 0);
        return `<button type="button" class="row-card" data-act="openZone" data-pid="${p.id}" data-zid="${z.id}">
          <span class="av" style="background:${z.color}">${icon(C.ZONE_KINDS[z.kind] && C.ZONE_KINDS[z.kind].mode === 'facade' ? 'facade' : z.kind === 'room' ? 'home' : 'map')}</span>
          <span class="rc-info"><span class="n">${esc(z.name)}</span><span class="m">${fq(m.area)} م²${m.linear ? ' · ' + fq(m.linear) + ' م.ط' : ''} · ${n.length} بند${z.finish ? ' · ' + esc(z.finish) : ''}</span></span>
          <span class="rc-amt">${money(tot)}</span></button>`;
      }).join('') || `<div class="empty"><div class="big">${icon('map')}</div><p>لسه مفيش مناطق. أضف غرفة أو واجهة وابدأ القياس.</p></div>`}
      <button type="button" class="btn btn-accent" data-act="addZone" data-pid="${p.id}">${icon('plus')} إضافة منطقة / مكان</button>`;
  }

  function tabItems(p, r) {
    const groups = {};
    r.items.forEach((x, i) => { (groups[x.item.section] = groups[x.item.section] || []).push(Object.assign({ i }, x)); });
    const mats = E.projectMaterials(r);
    const linked = mats.filter(m => m.materialId && m.packs > 0 && m.onClient < m.packs);
    let h = Object.keys(C.SECTIONS).filter(sk => groups[sk]).map(sk => {
      const tot = groups[sk].reduce((s, x) => s + x.res.total, 0);
      return `<div class="group-h"><b>${esc(C.SECTIONS[sk].name)}</b> ${U.moneyT(tot)}</div>` + groups[sk].map(x => ED.itemCard(p, x.item, x.res, x.i)).join('');
    }).join('');
    if (!h) h = `<div class="empty"><div class="big">${icon('list')}</div><p>أضف بنود الأعمال: محارة داخلية وخارجية، جرافيت، دهارة ومعجون، تشطيبات واجهات، وتكاليف الموقع (سقالات، ونش، نقل...).</p></div>`;
    h += `<div class="btn-row mt"><button type="button" class="btn btn-accent" data-act="addItem" data-pid="${p.id}">${icon('plus')} إضافة بند</button>
      <button type="button" class="btn btn-soft" data-act="addItem" data-pid="${p.id}" data-sec="site">${icon('truck')} تكاليف الموقع</button></div>`;
    if (r.items.length) {
      h += `<div class="total-bar"><span>مجموع البنود</span><strong>${U.moneyT(r.itemsTotal)}</strong></div>`;
      h += `<div class="card mt"><div class="card-title"><div class="t-ic violet">${icon('box')}</div><h2>الخامات المطلوبة للمشروع</h2></div>
        ${mats.length ? mats.map(m => `<div class="mat-line"><div class="ml-info"><div class="ml-name">${esc(m.name)}${m.onClient >= m.packs ? ' <span class="badge">على العميل</span>' : m.onClient ? ' <span class="badge">جزء على العميل</span>' : ''}</div><div class="ml-meta">${fq(m.qty)} ${esc(m.unit)}${m.cost ? ' · تكلفة ' + U.fmt(m.cost) : ''}</div></div><div class="ml-qty">${fq(m.packs)}<small>${esc(m.packUnit)}</small></div></div>`).join('') : '<div class="hint">لا توجد خامات محسوبة.</div>'}
        <div class="btn-row mt"><button type="button" class="btn btn-ghost" data-act="openDoc" data-type="materials" data-pid="${p.id}">${icon('file')} كشف الخامات</button>
        <button type="button" class="btn btn-soft" data-act="issueMaterials" data-pid="${p.id}"${linked.length ? '' : ' disabled'}>${icon('move')} صرف من المخزن</button></div>
        ${linked.length ? '' : '<div class="hint">الصرف من المخزن متاح للخامات المربوطة بالمخزن والموردة منك.</div>'}
      </div>`;
    }
    return h;
  }

  function tabPhases(p, r) {
    return `<div class="note mb">كل مرحلة لها بنودها وتكلفتها وحالتها ودفعاتها. اختار مرحلة كل بند من صفحة البند. ${p.pricing === 'phase' ? '<b>التسعير حسب المراحل مفعّل:</b> اكتب سعر كل مرحلة.' : ''}</div>` +
      r.phases.map((ph, i) => {
        const pct = ph.total > 0 ? Math.round(ph.done / ph.total * 100) : 0;
        const st = p.phases[i];
        return `<div class="card">
          <div class="card-title"><div class="t-ic ${ph.status === 'done' ? 'green' : ph.status === 'active' ? 'orange' : ''}">${i + 1}</div><h2>${esc(ph.name)}</h2><span class="tag">${ph.items} بند</span></div>
          <div class="segmented">${PH_STATUS.map(s => `<button type="button" class="${(st.status || 'pending') === s[0] ? 'on' : ''}" data-act="phaseStatus" data-pid="${p.id}" data-i="${i}" data-v="${s[0]}">${s[1]}</button>`).join('')}</div>
          ${p.pricing === 'phase' ? `<div class="field"><label>سعر المرحلة</label><input type="text" inputmode="decimal" data-t="num" data-bind="pj:phases.${i}.price" value="${esc(st.price || '')}" placeholder="${U.fmt(ph.done ? ph.total : r.items.filter(x => x.item.phase === ph.key).reduce((s, x) => s + x.res.total, 0))}"></div>` : ''}
          <div class="mini-stats"><div><span>القيمة</span><strong>${U.fmt(ph.total)}</strong></div><div><span>المدفوع</span><strong>${U.fmt(ph.paid)}</strong></div><div><span>المتبقي</span><strong>${U.fmt(ph.remaining)}</strong></div></div>
          <div class="progress"><i style="width:${pct}%"></i></div><div class="hint">المنفذ ${pct}%</div>
        </div>`;
      }).join('');
  }

  function tabMoney(p, r) {
    const d = S.db();
    const pays = p.payments.slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
    const exps = p.expenses.slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
    const labor = p.labor.slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
    const wp = d.workerPays.filter(x => x.projectId === p.id);
    const phName = k => (p.phases.find(x => x.key === k) || {}).name || '';
    return `
      <div class="mini-stats">
        <div><span>المدفوع من العميل</span><strong>${U.fmt(r.received)}</strong></div>
        <div><span>المصروفات</span><strong>${U.fmt(r.expenses)}</strong></div>
        <div><span>أجور العمال</span><strong>${U.fmt(r.wages)}</strong></div>
      </div>
      <div class="section-head"><h3>دفعات العميل<span class="count">${pays.length}</span></h3><button type="button" class="btn btn-soft btn-sm" data-act="addPayment" data-pid="${p.id}">${icon('plus')} دفعة</button></div>
      ${pays.map(x => `<button type="button" class="row-card" data-act="editPayment" data-pid="${p.id}" data-id="${x.id}"><span class="av green sm">${icon('cash')}</span><span class="rc-info"><span class="n">${U.fmt(x.amount)} ${esc(U.cur().sym)}</span><span class="m">${[fmtDate(x.date), x.method, phName(x.phase), x.note, 'إيصال ' + (x.receiptNo || '')].filter(Boolean).map(esc).join(' · ')}</span></span><span class="btn btn-ghost btn-icon" data-act="openDoc" data-type="receipt" data-pid="${p.id}" data-id="${x.id}">${icon('receipt')}</span></button>`).join('') || '<div class="hint mb">لا توجد دفعات بعد.</div>'}
      <div class="section-head"><h3>المصروفات<span class="count">${exps.length}</span></h3><button type="button" class="btn btn-soft btn-sm" data-act="addExpense" data-pid="${p.id}">${icon('plus')} مصروف</button></div>
      ${exps.map(x => `<button type="button" class="row-card" data-act="editExpense" data-pid="${p.id}" data-id="${x.id}"><span class="av soft sm">${icon('receipt')}</span><span class="rc-info"><span class="n">${esc(x.desc || x.category)}</span><span class="m">${[x.category, fmtDate(x.date), x.paid === false ? 'غير مدفوع' : ''].filter(Boolean).map(esc).join(' · ')}</span></span><span class="rc-amt due">${money(x.amount)}</span></button>`).join('') || '<div class="hint mb">لا توجد مصروفات.</div>'}
      <div class="section-head"><h3>اليوميات والعمالة<span class="count">${labor.length}</span></h3><button type="button" class="btn btn-soft btn-sm" data-act="addLabor" data-pid="${p.id}">${icon('plus')} يومية</button></div>
      ${labor.map(x => { const w = S.worker(x.workerId) || {}; const amt = x.fixed ? E.n(x.amount) : E.n(x.days) * E.n(x.rate) + E.n(x.extra); return `<button type="button" class="row-card" data-act="editLabor" data-pid="${p.id}" data-id="${x.id}"><span class="av sm">${esc(U.initials(w.name))}</span><span class="rc-info"><span class="n">${esc(w.name || 'عامل')}</span><span class="m">${x.fixed ? 'مقطوعية' : fq(x.days) + ' يوم × ' + U.fmt(x.rate)}${x.extra ? ' + ' + U.fmt(x.extra) : ''} · ${esc(fmtDate(x.date))}${x.note ? ' · ' + esc(x.note) : ''}</span></span><span class="rc-amt">${money(amt)}</span></button>`; }).join('') || '<div class="hint mb">لا توجد يوميات.</div>'}
      ${wp.length ? `<div class="group-h"><b>المدفوع للعمال على المشروع</b> ${U.moneyT(r.wagesPaid)}</div>` + wp.map(x => `<div class="kv-row"><span>${esc((S.worker(x.workerId) || {}).name || '')} · ${esc(fmtDate(x.date))} ${x.type === 'advance' ? '(سلفة)' : ''}</span><strong>${U.moneyT(x.amount)}</strong></div>`).join('') : ''}
      <button type="button" class="btn btn-ghost mt" data-act="payWorker" data-pid="${p.id}">${icon('wallet')} صرف فلوس / سلفة لعامل</button>`;
  }

  const PROJECT_DOCS = ['boq', 'boq_plaster', 'boq_graffiato', 'boq_putty', 'boq_facade', 'quote', 'inv_labor', 'inv_supply', 'inv_full', 'certificate', 'statement', 'cost', 'materials'];
  function tabDocs(p) {
    return `<div class="note mb">كل المستندات بتتعمل من بيانات المشروع تلقائياً. افتح المعاينة واطبع أو احفظ <b>PDF</b> أو ابعت على <b>واتساب</b>.</div>
      <div class="opt-list">${PROJECT_DOCS.map(k => `<button type="button" class="opt" data-act="openDoc" data-type="${k}" data-pid="${p.id}"><span class="o-ic ${k.indexOf('inv') === 0 ? 'green' : k.indexOf('boq') === 0 || k === 'quote' ? 'orange' : ''}">${icon(k.indexOf('inv') === 0 ? 'receipt' : k === 'certificate' ? 'clipboard' : k === 'cost' ? 'chart' : 'file')}</span><span style="flex:1">${esc(C.DOC_TYPES[k].name)}</span></button>`).join('')}</div>
      ${p.payments.length ? `<div class="hint mt">إيصالات الاستلام موجودة جنب كل دفعة في تبويب «الحسابات».</div>` : ''}`;
  }

  /* ================= الحاسبات ================= */
  U.VIEWS.calc = {
    tab: true,
    render() {
      const sp = S.project(S.SCRATCH);
      const r = pcalc(sp);
      const tiles = [
        ['areas', 'حاسبة المساحات', 'غرف، حوائط، أسقف، أشكال، فتحات', 'ruler', 'dark'],
        ['interior', 'المحارة الداخلية', 'أسمنتية، جاهزة، جبسية', 'trowel', ''],
        ['exterior', 'المحارة الخارجية', 'واجهات، أسوار، كرانيش', 'building', ''],
        ['graffiato', 'الجرافيت', 'عبوات + برايمر حسب المنتج', 'texture', ''],
        ['putty', 'الدهارة والمعجون', 'طبقات، صنفرة، برايمر', 'roller', ''],
        ['facade', 'حاسبة الواجهات', 'تقسيم لمناطق وأنظمة تشطيب', 'facade', ''],
        ['site', 'تكاليف الموقع', 'سقالات، ونش، نقل، حماية', 'truck', '']
      ];
      const html = `<div class="quick">${tiles.map(t => `<button type="button" class="q-tile ${t[4]}" data-act="calcStart" data-k="${t[0]}"><span class="q-ic ${t[4] ? 'orange' : 'orange-soft'}">${icon(t[3])}</span><b>${t[1]}</b><small>${t[2]}</small></button>`).join('')}</div>
        <div class="note mt">الحاسبات بتحفظ حساباتك هنا تلقائياً (بدون إنترنت). من أي حساب تقدر تضغط <b>حفظ في مشروع</b> لنقله لمشروع عميل.</div>
        <div class="home-row"><h2 class="home-h" style="margin:0">حساباتك السريعة</h2>${sp.items.length || sp.zones.length ? `<button type="button" class="link-btn" data-act="clearScratch">مسح الكل</button>` : ''}</div>
        ${sp.zones.map(z => { const m = r.zones[z.id]; return `<button type="button" class="row-card" data-act="openZone" data-pid="${sp.id}" data-zid="${z.id}"><span class="av" style="background:${z.color}">${icon('map')}</span><span class="rc-info"><span class="n">${esc(z.name)}</span><span class="m">${fq(m.area)} م² · ${sp.items.filter(i => i.zoneId === z.id).length} بند</span></span><span class="rc-amt">${fq(m.area)}<small>م²</small></span></button>`; }).join('')}
        ${r.items.filter(x => !x.item.zoneId).map((x, i) => ED.itemCard(sp, x.item, x.res, i)).join('')}
        ${!sp.items.length && !sp.zones.length ? '<div class="empty"><p>اختار حاسبة من فوق وابدأ.</p></div>' : ''}`;
      return { title: 'الحاسبات', sub: 'حساب المساحات والخامات والمصنعية', html };
    }
  };

  /* ================= المزيد ================= */
  U.VIEWS.more = {
    tab: true,
    render() {
      const items = [
        ['clients', 'العملاء', 'كشف حساب كل عميل ومشروعاته', 'users', ''],
        ['workers', 'العمال والمعلمين', 'اليوميات والسلف والمستحقات', 'worker', ''],
        ['stock', 'المخزن والخامات', 'الأسعار، المعدلات، المشتريات، المبيعات', 'store', 'violet'],
        ['reports', 'التقارير والأرباح', 'إيرادات، تكاليف، أرباح كل المشروعات', 'chart', 'green'],
        ['settings', 'الإعدادات وبيانات المستندات', 'اسمك، اللوجو، العملة، المظهر', 'gear', 'orange'],
        ['defaults', 'الافتراضات الحسابية', 'السمك، نسب الخلط، معدلات الاستهلاك', 'percent', 'orange'],
        ['backup', 'النسخ الاحتياطي والاستعادة', 'حفظ بياناتك في ملف', 'save', ''],
        ['about', 'عن التطبيق', 'الإصدار والعمل بدون إنترنت', 'info', '']
      ];
      return { title: 'المزيد', html: `<div class="menu-list">${items.map(x => `<button type="button" class="opt" data-act="go" data-view="${x[0]}"><span class="o-ic ${x[4]}">${icon(x[3])}</span><span style="flex:1">${x[1]}<small>${x[2]}</small></span></button>`).join('')}</div>` };
    }
  };

  /* ================= الإجراءات ================= */
  function projectForm(p, isNew) {
    const d = S.db();
    const clientOpts = [['', '— بدون عميل —'], ['__new', '+ عميل جديد']].concat(d.clients.map(c => [c.id, c.name + (c.phone ? ' · ' + c.phone : '')]));
    U.formSheet({
      title: isNew ? 'مشروع جديد' : 'بيانات المشروع',
      values: Object.assign({}, p, { newClientName: '', newClientPhone: '' }),
      fields: [
        { k: 'name', label: 'اسم المشروع', ph: 'مثال: فيلا أ/ محمد - التجمع', autofocus: isNew },
        { k: 'clientId', label: 'العميل', type: 'select', options: clientOpts },
        { k: 'newClientName', label: 'اسم العميل الجديد', half: true },
        { k: 'newClientPhone', label: 'رقم الهاتف', type: 'tel', half: true },
        { k: 'address', label: 'العنوان', ph: 'المدينة - الحي - الشارع' },
        { k: 'buildingType', label: 'نوع المبنى', type: 'select', options: [['', '—']].concat(C.BUILDING_TYPES.map(x => [x, x])), half: true },
        { k: 'floors', label: 'عدد الأدوار', type: 'num', half: true },
        { k: 'facades', label: 'الواجهات المطلوبة', ph: 'مثال: رئيسية + جانبية + السور' },
        { k: 'status', label: 'حالة المشروع', type: 'select', options: Object.keys(STATUS).map(k => [k, STATUS[k][0]]), half: true },
        { k: 'startDate', label: 'تاريخ البدء', type: 'date', half: true },
        { k: 'pricing', label: 'طريقة التسعير', type: 'select', options: PRICING },
        { k: 'lumpPrice', label: 'مبلغ المقاولة الكاملة', type: 'num', half: true, hint: 'لو التسعير مقاولة كاملة' },
        { k: 'discount', label: 'خصم للعميل', type: 'num', half: true },
        { k: 'retentionPct', label: 'نسبة استقطاع المستخلص %', type: 'num', half: true, hint: 'تأمين أعمال (اختياري)' },
        { k: 'matCostMode', label: 'تكلفة الخامات في الربح', type: 'select', half: true, options: [['estimate', 'تقديري من المقايسة'], ['actual', 'فعلي (المخزن + المشتريات)']] },
        { k: 'notes', label: 'ملاحظات', type: 'textarea' }
      ],
      onDelete: isNew ? null : () => {
        const d2 = S.db();
        d2.projects = d2.projects.filter(x => x.id !== p.id);
        d2.movements = d2.movements.filter(m => m.projectId !== p.id);
        d2.workerPays.forEach(w => { if (w.projectId === p.id) w.projectId = ''; });
        S.save(); U.toast('تم حذف المشروع'); U.go('projects');
      },
      deleteConfirm: 'حذف المشروع نهائياً بكل بنوده ودفعاته ومصروفاته؟',
      onOpen(sh) {
        const cs = sh.querySelector('#f_clientId');
        const toggle = () => { ['newClientName', 'newClientPhone'].forEach(k => { sh.querySelector('#f_' + k).closest('.field').classList.toggle('hidden', cs.value !== '__new'); }); };
        cs.onchange = toggle; toggle();
      },
      onSave(v) {
        if (v.clientId === '__new') {
          if (v.newClientName) {
            const c = { id: S.uid(), name: v.newClientName, phone: v.newClientPhone, address: v.address, notes: '' };
            S.db().clients.push(c); v.clientId = c.id;
          } else v.clientId = '';
        }
        delete v.newClientName; delete v.newClientPhone;
        if (!v.name) v.name = p.name || 'مشروع';
        let target = p;
        if (isNew) target = S.newProject();
        Object.assign(target, v);
        S.save();
        if (isNew) U.go('project', target.id, 'zones'); else U.rerender();
      }
    });
  }

  function paymentForm(p, pay) {
    const isNew = !pay;
    pay = pay || { date: S.today(), amount: '', method: 'كاش', phase: '', note: '' };
    const r = pcalc(p);
    U.formSheet({
      title: isNew ? 'تسجيل دفعة من العميل' : 'تعديل الدفعة', values: pay,
      fields: [
        { k: 'amount', label: 'المبلغ', type: 'num', autofocus: true, hint: 'المتبقي على العميل: ' + U.moneyT(r.remaining), half: true },
        { k: 'date', label: 'التاريخ', type: 'date', half: true },
        { k: 'method', label: 'طريقة الدفع', type: 'select', options: C.PAY_METHODS.map(x => [x, x]), half: true },
        { k: 'phase', label: 'عن مرحلة', type: 'select', options: [['', 'دفعة عامة']].concat(p.phases.map(x => [x.key, x.name])), half: true },
        { k: 'note', label: 'ملاحظة' }
      ],
      validate: v => E.n(v.amount) > 0 ? null : 'اكتب مبلغ الدفعة',
      onDelete: isNew ? null : () => { p.payments = p.payments.filter(x => x.id !== pay.id); S.save(); U.rerender(); },
      onSave(v) {
        v.amount = E.n(v.amount);
        if (isNew) { const d = S.db(); d.counters.receipt += 1; p.payments.push(Object.assign({ id: S.uid(), receiptNo: d.counters.receipt }, v)); }
        else Object.assign(pay, v);
        S.save(); U.toast('تم تسجيل الدفعة'); U.rerender();
      }
    });
  }

  function expenseForm(p, ex) {
    const isNew = !ex;
    ex = ex || { date: S.today(), amount: '', category: 'نقل', desc: '', paid: true, phase: '' };
    U.formSheet({
      title: isNew ? 'إضافة مصروف' : 'تعديل المصروف', values: ex,
      fields: [
        { k: 'category', label: 'النوع', type: 'select', options: C.EXPENSE_CATS.map(x => [x, x]), half: true },
        { k: 'amount', label: 'المبلغ', type: 'num', half: true, autofocus: true },
        { k: 'desc', label: 'الوصف', ph: 'مثال: إيجار سقالة أسبوع' },
        { k: 'date', label: 'التاريخ', type: 'date', half: true },
        { k: 'phase', label: 'المرحلة', type: 'select', options: [['', '—']].concat(p.phases.map(x => [x.key, x.name])), half: true },
        { k: 'paid', label: 'تم الدفع فعلاً', type: 'check' }
      ],
      validate: v => E.n(v.amount) > 0 ? null : 'اكتب المبلغ',
      onDelete: isNew ? null : () => { p.expenses = p.expenses.filter(x => x.id !== ex.id); S.save(); U.rerender(); },
      onSave(v) {
        v.amount = E.n(v.amount);
        if (isNew) p.expenses.push(Object.assign({ id: S.uid() }, v)); else Object.assign(ex, v);
        S.save(); U.rerender();
      }
    });
  }

  function laborForm(p, lb) {
    const d = S.db();
    const isNew = !lb;
    lb = lb || { workerId: d.workers[0] ? d.workers[0].id : '', date: S.today(), days: 1, rate: d.workers[0] ? d.workers[0].dailyRate : '', extra: '', fixed: false, amount: '', note: '' };
    U.formSheet({
      title: isNew ? 'تسجيل يومية / أجر' : 'تعديل اليومية', values: Object.assign({ newWorker: '' }, lb),
      fields: [
        { k: 'workerId', label: 'العامل', type: 'select', options: [['__new', '+ عامل جديد']].concat(d.workers.map(w => [w.id, w.name + ' (' + (w.role || '') + ')'])) },
        { k: 'newWorker', label: 'اسم العامل الجديد' },
        { k: 'date', label: 'التاريخ', type: 'date', half: true },
        { k: 'fixed', label: 'مقطوعية (مبلغ ثابت)', type: 'check', half: true },
        { k: 'days', label: 'عدد الأيام', type: 'num', half: true },
        { k: 'rate', label: 'اليومية', type: 'num', half: true },
        { k: 'extra', label: 'إضافي / ساعات زيادة', type: 'num', half: true },
        { k: 'amount', label: 'المبلغ (للمقطوعية)', type: 'num', half: true },
        { k: 'note', label: 'ملاحظة', ph: 'مثال: محارة الواجهة الخلفية' }
      ],
      onOpen(sh) {
        const ws = sh.querySelector('#f_workerId');
        const t = () => sh.querySelector('#f_newWorker').closest('.field').classList.toggle('hidden', ws.value !== '__new');
        ws.onchange = () => { t(); const w = S.worker(ws.value); if (w && w.dailyRate) sh.querySelector('#f_rate').value = w.dailyRate; };
        if (!d.workers.length) ws.value = '__new';
        t();
      },
      onDelete: isNew ? null : () => { p.labor = p.labor.filter(x => x.id !== lb.id); S.save(); U.rerender(); },
      validate: v => (v.workerId === '__new' && !v.newWorker) ? 'اكتب اسم العامل' : null,
      onSave(v) {
        if (v.workerId === '__new') { const w = { id: S.uid(), name: v.newWorker, role: 'صنايعي', dailyRate: v.rate, phone: '' }; d.workers.push(w); v.workerId = w.id; }
        delete v.newWorker;
        if (isNew) p.labor.push(Object.assign({ id: S.uid() }, v)); else Object.assign(lb, v);
        S.save(); U.rerender();
      }
    });
  }
  function workerPayForm(opts) {
    const d = S.db();
    opts = opts || {};
    if (!d.workers.length) { U.toast('أضف عامل الأول'); return; }
    U.formSheet({
      title: 'صرف فلوس لعامل', values: { workerId: opts.workerId || d.workers[0].id, projectId: opts.projectId || '', date: S.today(), amount: '', type: 'payment', note: '' },
      fields: [
        { k: 'workerId', label: 'العامل', type: 'select', options: d.workers.map(w => [w.id, w.name]) },
        { k: 'type', label: 'النوع', type: 'select', options: [['payment', 'صرف مستحقات'], ['advance', 'سلفة']], half: true },
        { k: 'amount', label: 'المبلغ', type: 'num', half: true, autofocus: true },
        { k: 'projectId', label: 'على مشروع', type: 'select', options: [['', '— عام —']].concat(realProjects().map(p => [p.id, p.name])), half: true },
        { k: 'date', label: 'التاريخ', type: 'date', half: true },
        { k: 'note', label: 'ملاحظة' }
      ],
      validate: v => E.n(v.amount) > 0 ? null : 'اكتب المبلغ',
      onSave(v) { v.amount = E.n(v.amount); d.workerPays.push(Object.assign({ id: S.uid() }, v)); S.save(); U.toast('تم التسجيل'); U.rerender(); }
    });
  }

  function addZoneSheet(p) {
    U.optionSheet('نوع المنطقة', Object.keys(C.ZONE_KINDS).map(k => ({ v: k, label: C.ZONE_KINDS[k].name, sub: { room: 'طول × عرض × ارتفاع', shapes: 'أشكال هندسية', facade: 'عرض × أدوار × ارتفاع', linear: 'أطوال بالمتر الطولي', manual: 'مساحة جاهزة' }[C.ZONE_KINDS[k].mode], icon: C.ZONE_KINDS[k].mode === 'facade' ? 'facade' : k === 'room' ? 'home' : 'map', cls: C.ZONE_KINDS[k].mode === 'facade' ? 'orange' : '' })), k => {
      const z = S.newZone(k, { project: p });
      const same = p.zones.filter(x => x.kind === k).length;
      if (same || k === 'room') z.name += ' ' + (same + 1);
      p.zones.push(z); S.save();
      U.go('zone', p.id, z.id);
    });
  }

  Object.assign(U.ACTIONS, {
    openProject(el) { U.go('project', el.dataset.pid); },
    projTab(el) { U.replace('project', el.dataset.pid, el.dataset.tab); },
    projFilter(el) { projFilter = el.dataset.v; U.rerender(); },
    newProject() { projectForm(S.newProjectRaw({ name: '' }), true); },
    editProject(el) { projectForm(S.project(el.dataset.pid), false); },
    projDocs(el) { U.replace('project', el.dataset.pid, 'docs'); },
    addZone(el) { addZoneSheet(S.project(el.dataset.pid)); },
    addPayment(el) { paymentForm(S.project(el.dataset.pid)); },
    editPayment(el, ev) { if (ev.target.closest('[data-type="receipt"]')) return; const p = S.project(el.dataset.pid); paymentForm(p, p.payments.find(x => x.id === el.dataset.id)); },
    addExpense(el) { expenseForm(S.project(el.dataset.pid)); },
    editExpense(el) { const p = S.project(el.dataset.pid); expenseForm(p, p.expenses.find(x => x.id === el.dataset.id)); },
    addLabor(el) { laborForm(S.project(el.dataset.pid)); },
    editLabor(el) { const p = S.project(el.dataset.pid); laborForm(p, p.labor.find(x => x.id === el.dataset.id)); },
    payWorker(el) { workerPayForm({ projectId: el.dataset.pid, workerId: el.dataset.wid }); },
    phaseStatus(el) { const p = S.project(el.dataset.pid); p.phases[Number(el.dataset.i)].status = el.dataset.v; S.save(); U.rerender(); },
    quickPayment() {
      const ps = realProjects();
      if (!ps.length) { U.toast('أنشئ مشروع الأول'); return; }
      U.optionSheet('الدفعة على أي مشروع؟', ps.slice().reverse().map(p => { const r = pcalc(p); return { v: p.id, label: p.name, sub: (clientName(p) || '') + ' · متبقي ' + U.moneyT(r.remaining), icon: 'folder' }; }), pid => setTimeout(() => paymentForm(S.project(pid)), 260));
    },
    issueMaterials(el) {
      const p = S.project(el.dataset.pid);
      const mats = E.projectMaterials(pcalc(p)).filter(m => m.materialId && m.packs - m.onClient > 0);
      const d = S.db();
      const lines = mats.map(m => `${m.name}: ${fq(m.packs - m.onClient)} ${m.packUnit}`).join('\n');
      U.confirmBox('صرف الخامات دي من المخزن على المشروع؟\n' + lines, () => {
        mats.forEach(m => { const mt = S.material(m.materialId); d.movements.push({ id: S.uid(), materialId: m.materialId, type: 'issue', qty: E.round(m.packs - m.onClient, 3), price: mt ? mt.buyPrice : '', date: S.today(), projectId: p.id, note: 'صرف لمشروع ' + p.name }); });
        S.save(); U.toast('تم صرف الخامات من المخزن'); U.rerender();
      }, { yes: 'صرف', safe: true });
    },
    calcStart(el) {
      const sp = S.project(S.SCRATCH);
      const k = el.dataset.k;
      if (k === 'areas' || k === 'facade') {
        const z = S.newZone(k === 'facade' ? 'facade_main' : 'room', { project: sp });
        z.name = (k === 'facade' ? 'واجهة ' : 'مساحة ') + (sp.zones.length + 1);
        sp.zones.push(z); S.save();
        U.go('zone', sp.id, z.id);
        return;
      }
      ED.pickWorkType(key => { const it = ED.addItemTo(sp, key); U.go('item', sp.id, it.id); }, k);
    },
    clearScratch() {
      U.confirmBox('مسح كل الحسابات السريعة؟', () => { const sp = S.project(S.SCRATCH); sp.items = []; sp.zones = []; S.save(); U.rerender(); }, { yes: 'مسح' });
    },
    plusMenu() {
      U.optionSheet('إضافة جديد', [
        { v: 'project', label: 'مشروع جديد', sub: 'عميل + مساحات + بنود', icon: 'folder', cls: 'orange' },
        { v: 'calc', label: 'حاسبة سريعة', sub: 'محارة، جرافيت، معجون، واجهات', icon: 'calc', cls: 'orange' },
        { v: 'pay', label: 'دفعة من عميل', icon: 'cash', cls: 'green' },
        { v: 'move', label: 'حركة مخزن', sub: 'شراء، بيع، هالك، تسوية', icon: 'store', cls: 'violet' },
        { v: 'wpay', label: 'صرف لعامل / سلفة', icon: 'worker' },
        { v: 'client', label: 'عميل جديد', icon: 'user' }
      ], v => setTimeout(() => {
        if (v === 'project') U.ACTIONS.newProject();
        else if (v === 'calc') U.go('calc');
        else if (v === 'pay') U.ACTIONS.quickPayment();
        else if (v === 'move') U.ACTIONS.quickMove();
        else if (v === 'wpay') workerPayForm({});
        else if (v === 'client') U.ACTIONS.newClient();
      }, 260));
    }
  });

  window.Views = { pcalc, ctx, realProjects, statusBadge, STATUS, projectRow, workerPayForm, PROJECT_DOCS };
})();
