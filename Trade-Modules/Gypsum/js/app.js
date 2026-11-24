/*
 * أرزقي للجبس والديكورات — تشغيل التطبيق: التنقل، الرئيسية، الإعدادات، النسخ الاحتياطي، التحديثات
 * © 2026 أحمد حسن عبدالله - جميع الحقوق محفوظة.
 */
'use strict';
const APP_VERSION = '1.0.3';
const VIEW_TITLES = { home: 'أرزقي | Arzoqi', projects: 'المشروعات', calc: 'الحاسبات', more: 'المزيد' };
let currentView = 'home';

/* ---------------- التنقل ---------------- */
function switchView(v) {
  closeAll();
  currentView = v;
  document.querySelectorAll('.view').forEach(el => el.classList.toggle('active', el.id === 'view-' + v));
  document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.id === 'navBtn-' + v));
  $('tabTitle').textContent = VIEW_TITLES[v] || 'أرزقي | Arzoqi';
  renderView(v);
  window.scrollTo(0, 0);
}
function renderView(v) {
  if (v === 'home') renderHome();
  else if (v === 'projects') renderProjects();
  else if (v === 'calc') renderCalcHub();
  else if (v === 'more') renderMore();
}
function renderAll() { renderView(currentView); }

/* ---------------- الرئيسية (Dashboard) ---------------- */
function greet() {
  const h = new Date().getHours();
  const n = DB().settings.ownerName || DB().settings.bizName;
  return (h < 12 ? 'صباح الخير' : 'مساء الخير') + (n ? `، ${n}` : '');
}
function renderHome() {
  const d = DB();
  let revenue = 0, cost = 0, paid = 0, due = 0, running = 0;
  d.projects.forEach(p => {
    if (p.status === 'cancelled') return;
    const t = projTotals(p);
    revenue += t.revenue; cost += t.cost; paid += t.paid; due += t.due;
    if (p.status === 'active') running++;
  });
  const general = d.expenses.filter(e => !e.projectId).reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const low = HGf.stockSummary(d.stock).low.length;
  $('greetLine').textContent = greet();
  $('homeSum').innerHTML = `<div class="hs-label">صافي الأرباح</div><div class="hs-value">${fmt(revenue - cost - general)} <small>${esc(cur().sym)}</small></div>
    <div class="hs-stats">
      <button type="button" onclick="switchView('projects')"><span>مشروعات جارية</span><strong>${running}</strong></button>
      <button type="button" onclick="openCustomersPage()"><span>مستحق لك</span><strong>${fmt(due)}</strong></button>
      <button type="button" class="mat" onclick="openStockPage()"><span>خامات ناقصة</span><strong>${low}</strong></button>
    </div>`;
  $('homeKpis').innerHTML = `
    <button type="button" class="kpi" onclick="switchView('projects')"><span>إجمالي المشروعات</span><strong>${d.projects.length}</strong></button>
    <button type="button" class="kpi acc" onclick="openReportsPage()"><span>إجمالي الإيرادات</span><strong>${fmt(revenue)} <small>${esc(cur().sym)}</small></strong></button>
    <button type="button" class="kpi bad" onclick="openReportsPage()"><span>المصروفات والتكاليف</span><strong>${fmt(cost + general)} <small>${esc(cur().sym)}</small></strong></button>
    <button type="button" class="kpi good" onclick="openReportsPage()"><span>المستلم فعلياً</span><strong>${fmt(paid)} <small>${esc(cur().sym)}</small></strong></button>`;
  $('homeCalcs').innerHTML = ['ceiling', 'partition', 'bulkhead', 'plaster', 'cornice', 'panels'].map((id, i) =>
    `<button type="button" class="calc-tile${i === 0 ? ' dark' : ''}" onclick="openCalc('${id}')"><span class="q-ic ${i === 0 ? 'orange' : 'orange-soft'}">${icon(CALCS[id].icon)}</span><b>${esc(CALCS[id].title.replace('حاسبة ', ''))}</b><small>${esc(CALCS[id].sub)}</small></button>`).join('');
  const docs = d.docs.slice().reverse().slice(0, 4);
  $('homeDocs').innerHTML = docs.length ? docs.map(docCardHTML).join('') : '<div class="home-empty">الفواتير والمقايسات اللي هتعملها هتظهر هنا</div>';
  const custs = d.customers.slice().reverse().slice(0, 4);
  $('homeCust').innerHTML = custs.length ? custs.map(c => { const s = customerStats(c); return `<div class="cust-card" onclick="openCustomer('${c.id}')"><div class="inv-avatar">${initial(c.name)}</div><div class="inv-info"><div class="n">${esc(c.name)}</div><div class="m">${esc(c.phone || s.projects.length + ' مشروع')}</div></div><div class="cust-amt ${s.due > 0 ? 'due' : 'ok'}">${fmt(s.due)}<small>متبقي</small></div></div>`; }).join('') : '<div class="home-empty">العملاء بيتضافوا مع أول مشروع</div>';
  const up = d.notes.filter(n => n.due && !n.done && n.due >= todayISO()).sort((a, b) => a.due.localeCompare(b.due)).slice(0, 2);
  $('homeNotes').innerHTML = up.map(noteCardHTML).join('');
  hydrateIcons($('view-home'));
}

/* ---------------- زرار (+) ---------------- */
function openCreate() {
  openSheet('إنشاء جديد', `<div class="create-list">
    <button type="button" class="create-opt dark" onclick="openProjectEdit(null)"><span class="q-ic orange">${icon('briefcase')}</span><span><b>مشروع جديد</b><small>عميل + بنود + حسابات</small></span></button>
    <button type="button" class="create-opt" onclick="closeSheet();switchView('calc')"><span class="q-ic orange-soft">${icon('calc')}</span><span><b>حساب كميات</b><small>سقف، قاطع، بيت نور، جبس بلدي، كرانيش، بانوهات</small></span></button>
    <div class="create-row">
      <button type="button" class="create-opt" onclick="quickInvoice()"><span class="q-ic">${icon('file')}</span><span><b>فاتورة</b><small>من مشروع</small></span></button>
      <button type="button" class="create-opt" onclick="openPaymentSheet(null)"><span class="q-ic green">${icon('cash')}</span><span><b>دفعة</b><small>من عميل</small></span></button>
      <button type="button" class="create-opt" onclick="openStockEdit(null)"><span class="q-ic orange-soft">${icon('box')}</span><span><b>خامة</b><small>للمخزون</small></span></button>
      <button type="button" class="create-opt" onclick="openExpenseSheet(null)"><span class="q-ic">${icon('truck')}</span><span><b>مصروف</b><small>نقل، تحميل...</small></span></button>
      <button type="button" class="create-opt" onclick="openAttendanceSheet(null)"><span class="q-ic">${icon('hardhat')}</span><span><b>يومية عامل</b><small>أيام الشغل</small></span></button>
      <button type="button" class="create-opt" onclick="openNoteSheet(null)"><span class="q-ic">${icon('note')}</span><span><b>ملاحظة</b><small>مقاسات، مواعيد</small></span></button>
    </div></div>`);
}
function quickInvoice() {
  if (!DB().projects.length) { toast('اعمل مشروع الأول وضيف بنوده'); openProjectEdit(null); return; }
  pickProject(pid => openDocBuilder(pid));
}

/* ---------------- المزيد ---------------- */
function renderMore() {
  const d = DB(), low = HGf.stockSummary(d.stock).low.length;
  const tile = (fn, ic, label, cnt, bad, cls) => `<button type="button" class="more-tile" onclick="${fn}"><span class="q-ic ${cls || ''}">${icon(ic)}</span>${esc(label)}${cnt != null ? `<span class="cnt${bad ? ' bad' : ''}">${cnt}</span>` : ''}</button>`;
  $('moreGrid').innerHTML = [
    tile('openCustomersPage()', 'users', 'العملاء', d.customers.length),
    tile('openStockPage()', 'store', 'الخامات والمخزون', low || d.stock.length, !!low, 'orange-soft'),
    tile('openDocsPage()', 'file', 'الفواتير والمستندات', d.docs.length),
    tile('openWorkersPage()', 'hardhat', 'العمال', d.workers.length),
    tile('openExpensesPage()', 'truck', 'المصروفات', d.expenses.length),
    tile('openNotesPage()', 'note', 'النوتة', d.notes.filter(n => !n.done).length),
    tile('openReportsPage()', 'chart', 'التقارير والأرباح', null, false, 'green'),
    tile("switchView('calc')", 'calc', 'الحاسبات', null, false, 'orange-soft'),
    tile('openSettingsPage()', 'briefcase', 'بيانات النشاط', null)
  ].join('');
  renderSettingsInline();
}
function openCustomersPage() {
  const el = openPage(`${pageHead('العملاء', 'كشف حساب كل عميل', `<button type="button" class="icon-btn accent" onclick="openCustomerEdit(null)" aria-label="عميل جديد">${icon('plus')}</button>`)}
    <main class="container" style="padding-bottom:40px"><section class="hero" id="custHero"></section>
    <div class="field"><input type="search" id="custSearch" placeholder="ابحث بالاسم أو الرقم..." oninput="renderCustomers()"></div><div id="custList"></div></main>`, { name: 'customers', render: () => renderCustomers() });
  renderCustomers(); hydrateIcons(el);
}

/* ---------------- الإعدادات ---------------- */
function renderSettingsInline() {
  const s = DB().settings;
  $('currencySelect').innerHTML = HG.CURRENCIES.map(c => `<option value="${c.code}"${c.code === s.currency ? ' selected' : ''}>${esc(c.country)} — ${esc(c.name)} (${esc(c.sym)})</option>`).join('');
  ['auto', 'light', 'dark'].forEach(m => $('theme-' + m).classList.toggle('on', (s.theme || 'auto') === m));
  $('defWaste').value = s.defaultWaste;
  $('defScope').innerHTML = Object.keys(HGf.SCOPES).map(k => `<option value="${k}"${k === s.defaultScope ? ' selected' : ''}>${esc(HGf.SCOPES[k].name)}</option>`).join('');
  $('aboutVersion').textContent = appVersion();
  $('verCurrent').textContent = appVersion();
  renderBackupLine();
}
function openSettingsPage() {
  const s = DB().settings;
  openPage(`${pageHead('بيانات النشاط', 'تظهر على الفواتير والمستندات')}
    <main class="container" style="padding-bottom:40px"><div class="card" id="bizForm"><div class="f-grid">
      ${fText('bizName', 'اسم النشاط', s.bizName, { wide: true, ph: 'مؤسسة ... للجبس والديكور' })}
      ${fText('ownerName', 'اسم المسؤول / الصنايعي', s.ownerName, { ph: 'م/ ...' })}
      ${fText('phone', 'رقم الهاتف', s.phone, { inputmode: 'tel', dir: 'ltr' })}
      ${fText('phone2', 'رقم آخر', s.phone2, { inputmode: 'tel', dir: 'ltr' })}
      ${fText('address', 'العنوان', s.address)}
      ${fArea('docFooter', 'ملاحظة ثابتة أسفل المستندات', s.docFooter, { rows: 2 })}
    </div>
    <div class="logo-box">
      ${s.logo ? `<img src="${s.logo}" alt="اللوجو">` : `<div class="ph">${icon('image')}</div>`}
      <div style="flex:1;min-width:0"><div style="font-weight:800;font-size:.9rem">لوجو المستندات</div><div class="hint" style="margin:0">${s.logo ? 'تم اختيار لوجو' : 'لم يتم اختيار لوجو'}</div></div>
      <button type="button" class="btn btn-soft btn-sm" onclick="$('logoFile').click()">اختيار</button>
      ${s.logo ? `<button type="button" class="btn btn-danger btn-icon" onclick="removeLogo()" aria-label="حذف اللوجو">${icon('trash')}</button>` : ''}
    </div>
    ${fChk('showLogo', 'إظهار اللوجو على المستندات', s.showLogo, { wide: false })}
    <button type="button" class="btn btn-accent" style="margin-top:12px" onclick="saveBiz()">${icon('check')} حفظ</button></div></main>`, { name: 'biz' });
}
function saveBiz() {
  const v = readForm($('bizForm'));
  Object.assign(DB().settings, v);
  persist(); closePage(); renderAll(); toast('✔️ اتحفظت بيانات النشاط');
}
function uploadLogo(ev) {
  const f = ev.target.files && ev.target.files[0];
  ev.target.value = '';
  if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    const img = new Image();
    img.onload = () => {
      const max = 360, k = Math.min(1, max / Math.max(img.width, img.height));
      const cv = document.createElement('canvas'); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      DB().settings.logo = cv.toDataURL('image/png'); DB().settings.showLogo = true;
      persist(); closePage(); openSettingsPage(); toast('✔️ اتحفظ اللوجو');
    };
    img.src = r.result;
  };
  r.readAsDataURL(f);
}
function removeLogo() { DB().settings.logo = ''; persist(); closePage(); openSettingsPage(); }
function setCurrency(code) { DB().settings.currency = code; persist(); renderAll(); const c = cur(); toast(`✔️ العملة: ${c.name} (${c.sym}) — بتغيّر الرمز بس ومش بتحوّل المبالغ`); }
function setDefault(k, v) { DB().settings[k] = k === 'defaultWaste' ? (Number(v) || 0) : v; persist(); }
function themeMode() { const t = DB().settings.theme; return t === 'dark' || t === 'light' ? t : 'auto'; }
const darkQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
function isDarkNow() { const m = themeMode(); return m === 'dark' || (m === 'auto' && !!(darkQuery && darkQuery.matches)); }
function applyTheme() {
  const m = themeMode();
  if (m === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', m);
  const meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.setAttribute('content', isDarkNow() ? '#071226' : '#0b1b33');
  const b = $('themeBtn'); if (b) b.innerHTML = icon(isDarkNow() ? 'sun' : 'moon');
}
function setTheme(m) { DB().settings.theme = m; HG.store.saveNow(); applyTheme(); renderSettingsInline(); }
function toggleTheme() { setTheme(isDarkNow() ? 'light' : 'dark'); }
if (darkQuery && darkQuery.addEventListener) darkQuery.addEventListener('change', applyTheme);

/* ---------------- النسخ الاحتياطي ---------------- */
function renderBackupLine() {
  const last = DB().lastBackup;
  const el = $('backupLine'); if (!el) return;
  if (!last) { el.textContent = 'لسه ماعملتش نسخة احتياطية — يُنصح بعملها كل أسبوع'; el.className = 'backup-line warn'; return; }
  const days = Math.floor((Date.now() - last) / 86400000);
  el.textContent = `آخر نسخة احتياطية: ${days === 0 ? 'النهارده' : `من ${days} يوم`}`;
  el.className = 'backup-line' + (days > 7 ? ' warn' : '');
}
function exportBackup() {
  DB().lastBackup = Date.now(); HG.store.saveNow();
  downloadText(`hesabati-gypsum-backup-${todayISO()}.json`, 'application/json', HG.store.exportData());
  renderBackupLine(); toast('✔️ اتعملت نسخة احتياطية');
}
function importBackup(ev) {
  const f = ev.target.files && ev.target.files[0];
  ev.target.value = '';
  if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    let text = String(r.result || '');
    try { JSON.parse(text); } catch (e) { toast('الملف تالف أو مش نسخة احتياطية'); return; }
    openSheet('استعادة نسخة احتياطية', `<p class="hint" style="margin-bottom:12px">اختار طريقة الاستعادة:</p><div class="stack">
      <button type="button" class="btn btn-accent" id="impMerge">${icon('layers')} دمج مع البيانات الحالية</button>
      <button type="button" class="btn btn-danger" id="impReplace">${icon('refresh')} استبدال كل البيانات بالنسخة</button></div>`);
    const run = mode => { try { HG.store.importData(text, mode); closeSheet(); applyTheme(); renderAll(); toast('✔️ اتعملت الاستعادة'); } catch (e) { toast(e.message || 'فشلت الاستعادة'); } };
    $('impMerge').onclick = () => run('merge');
    $('impReplace').onclick = () => ask('هيتم استبدال كل بياناتك الحالية بالنسخة دي. متأكد؟', () => run('replace'), 'استبدال');
  };
  r.readAsText(f);
}

/* ---------------- الإصدار والتحديثات (Service Worker) ---------------- */
function appVersion() { try { return IN_APP ? String(window.HesabatyApp.versionName()) : APP_VERSION; } catch (e) { return APP_VERSION; } }
let swReg = null;
function initServiceWorker() {
  if (!('serviceWorker' in navigator) || IN_APP || location.protocol === 'file:') return;
  navigator.serviceWorker.register('./service-worker.js').then(reg => {
    swReg = reg;
    const check = () => { if (reg.waiting && navigator.serviceWorker.controller) showUpdate(); };
    check();
    reg.addEventListener('updatefound', () => { const w = reg.installing; if (w) w.addEventListener('statechange', () => { if (w.state === 'installed') check(); }); });
  }).catch(() => {});
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (reloaded) return; reloaded = true; location.reload(); });
}
function showUpdate() { $('updBubble').classList.remove('hidden'); $('updateStatus').textContent = 'فيه تحديث جديد جاهز — بياناتك محفوظة ومش هتتأثر.'; $('btnApplyUpdate').classList.remove('hidden'); }
function applyUpdate() {
  HG.store.saveNow();
  if (IN_APP && apkUpdate) { try { window.HesabatyApp.downloadUpdate(apkUpdate.url, apkUpdate.version); toast('بيتم تنزيل التحديث...'); } catch (e) {} return; }
  if (swReg && swReg.waiting) swReg.waiting.postMessage('skipWaiting'); else location.reload(); }
function checkUpdates() {
  if (IN_APP) { checkAppUpdate(true); return; }
  if (!swReg) { toast('التحديثات التلقائية مش متاحة هنا'); return; }
  $('updateStatus').textContent = 'بندور على تحديث...';
  swReg.update().then(() => setTimeout(() => { if (!(swReg.waiting)) $('updateStatus').textContent = 'انت على آخر إصدار ✔️'; }, 1500)).catch(() => { $('updateStatus').textContent = 'مفيش اتصال بالإنترنت — جرب تاني بعدين'; });
}

/* تحديث تطبيق أندرويد (APK) من صفحة الإصدارات على GitHub */
const RELEASES_API = 'https://api.github.com/repos/AhmedHassanAbdallah/Hesabaty-Gebsum/releases/latest';
function cmpVer(a, b) {
  const pa = String(a || '0').split('.').map(n => parseInt(n, 10) || 0), pb = String(b || '0').split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) { const d = (pa[i] || 0) - (pb[i] || 0); if (d) return d > 0 ? 1 : -1; }
  return 0;
}
let apkUpdate = null;
async function checkAppUpdate(fromUser) {
  if (!IN_APP) return;
  try {
    const r = await fetch(RELEASES_API, { cache: 'no-store' });
    const j = await r.json();
    const v = String(j.tag_name || '').replace(/^v/, '');
    const asset = (j.assets || []).find(a => /\.apk$/i.test(a.name));
    if (asset && cmpVer(v, appVersion()) > 0) {
      apkUpdate = { url: asset.browser_download_url, version: v };
      $('updBubble').classList.remove('hidden');
      $('updateStatus').textContent = `فيه إصدار جديد ${v} — اضغط «تحديث الآن» وبياناتك هتفضل زي ما هي.`;
      $('btnApplyUpdate').classList.remove('hidden');
    } else if (fromUser) toast('انت على آخر إصدار ✔️');
  } catch (e) { if (fromUser) toast('مفيش اتصال بالإنترنت — جرب تاني بعدين'); }
}

/* ---------------- التشغيل ---------------- */
function initApp() {
  HG.store.load();
  applyTheme();
  hydrateIcons(document);
  $('copyYear').textContent = new Date().getFullYear();
  if (!HG.store.ok) toast('⚠️ التخزين المحلي مقفول في المتصفح ده — البيانات مش هتتحفظ');
  switchView('home');
  initServiceWorker();
  if (IN_APP) { console.info('HESABATY_READY ' + APP_VERSION + ' app=' + appVersion()); setTimeout(() => checkAppUpdate(false), 1500); }
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
}
document.addEventListener('DOMContentLoaded', initApp);
