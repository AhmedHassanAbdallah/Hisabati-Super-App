/*
 * أرزقي | Arzoqi — ميكانيكا السيارات والموتوسيكلات والتروسيكلات (Automotive Workshop Management): الواجهة.
 * الحسابات في js/calc.js (AutoCalc) والبيانات المرجعية في js/catalog.js (AutoCatalog).
 * التخزين على الموبايل بس:
 *   hauto_db_v1        العملاء، المركبات، أوامر الشغل (الاستلام والفحص والتشخيص والمصنعية وقطع الغيار والأعمال الخارجية والمصاريف
 *                      والدفعات والتسليم والصيانة الجاية)، قطع الغيار، المشتريات، تسويات المخزن، الموردين ودفعاتهم، المصروفات، الفنيين وشغلهم ودفعاتهم
 *   hauto_settings_v1  المظهر، العملة، بيانات الفاتورة، سعر الساعة، الضريبة، الخدمات وأسعارها، فترات الزيت، طرق الدفع، أنواع المصروفات، كشف الاستلام
 * الفاتورة: ArzaqiInvoice (نفس فاتورة كل الأقسام). نوتة العمال: ArzoqiCrew. طريقة الاستخدام: ArzoqiGuide.
 * © 2026 أحمد حسن عبدالله
 */
(function () {
  'use strict';
  var C = window.AutoCalc, K = window.AutoCatalog;
  var DB_KEY = 'hauto_db_v1', SET_KEY = 'hauto_settings_v1';
  var SECTION = 'automotive', SECTION_NAME = 'ميكانيكا السيارات والموتوسيكلات';
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ic(n) { return '<svg class="ic" aria-hidden="true"><use href="#i-' + n + '"/></svg>'; }
  function uid(p) { return (p || '') + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function loadJSON(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } }
  function arr(x) { return Array.isArray(x) ? x : []; }
  function v0(x) { return x == null ? '' : x; }
  function uniq(a) { return a.filter(function (v, i) { return v && a.indexOf(v) === i; }); }

  // ---------------- البيانات ----------------
  function normJob(j) {
    ['labor', 'parts', 'outside', 'costs', 'payments', 'findings', 'recs'].forEach(function (k) { j[k] = arr(j[k]); });
    j.checkin = j.checkin && typeof j.checkin === 'object' ? j.checkin : {};
    j.next = j.next && typeof j.next === 'object' ? j.next : {};
    j.discount = j.discount && typeof j.discount === 'object' ? j.discount : { type: 'amount', value: 0 };
    return j;
  }
  var COLS = ['customers', 'vehicles', 'jobs', 'parts', 'purchases', 'moves', 'suppliers', 'spay', 'expenses', 'workers', 'wlog', 'wpay'];
  function normDb(d) {
    d = d && typeof d === 'object' ? d : {};
    var o = { v: 1, seq: Number(d.seq) || 0, pseq: Number(d.pseq) || 0 };
    COLS.forEach(function (k) { o[k] = arr(d[k]); });
    o.jobs = o.jobs.map(normJob);
    return o;
  }
  var db = normDb(loadJSON(DB_KEY, null));
  var settings = loadJSON(SET_KEY, {}) || {};
  ['business', 'servicePrices', 'oilKm'].forEach(function (k) { if (!settings[k] || typeof settings[k] !== 'object') settings[k] = {}; });
  ['services', 'payMethods', 'expenseCats', 'checkin'].forEach(function (k) { settings[k] = arr(settings[k]); });
  function saveDb() { try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch (e) { toast('تعذر الحفظ: مساحة التخزين ممتلئة'); } }
  function saveSettings() { try { localStorage.setItem(SET_KEY, JSON.stringify(settings)); } catch (e) { toast('تعذر الحفظ: مساحة التخزين ممتلئة'); } }
  function byId(col, id) { return db[col].find(function (x) { return x.id === id; }) || null; }
  function getJob(id) { return byId('jobs', id); }
  function getCust(id) { return byId('customers', id); }
  function getVeh(id) { return byId('vehicles', id); }
  function getPart(id) { return byId('parts', id); }
  function getSup(id) { return byId('suppliers', id); }
  function jobsOf(cid) { return db.jobs.filter(function (j) { return j.customerId === cid; }); }
  function jobsOfVeh(vid) { return db.jobs.filter(function (j) { return j.vehicleId === vid; }); }
  function vehsOf(cid) { return db.vehicles.filter(function (v) { return v.customerId === cid; }); }
  function custName(j) { var c = j && getCust(j.customerId); return c ? c.name : 'عميل'; }
  function touch(j) { j.updatedAt = new Date().toISOString(); }
  function pad(n) { return String(n).padStart(4, '0'); }
  function ctx() { var tp = {}; db.workers.forEach(function (w) { if (C.num(w.pct)) tp[w.id] = C.num(w.pct); }); return { laborRate: C.num(settings.laborRate), wlog: db.wlog, techPct: tp }; }
  function J(j) { return C.job(j, ctx()); }

  // ---------------- العملة (نفس قايمة العملات العربية في كل أقسام أرزقي) ----------------
  var CURRENCIES = [
    { code: 'EGP', country: 'مصر', name: 'جنيه مصري', sym: 'ج.م', dec: 2 }, { code: 'SAR', country: 'السعودية', name: 'ريال سعودي', sym: 'ر.س', dec: 2 },
    { code: 'AED', country: 'الإمارات', name: 'درهم إماراتي', sym: 'د.إ', dec: 2 }, { code: 'KWD', country: 'الكويت', name: 'دينار كويتي', sym: 'د.ك', dec: 3 },
    { code: 'QAR', country: 'قطر', name: 'ريال قطري', sym: 'ر.ق', dec: 2 }, { code: 'BHD', country: 'البحرين', name: 'دينار بحريني', sym: 'د.ب', dec: 3 },
    { code: 'OMR', country: 'عُمان', name: 'ريال عماني', sym: 'ر.ع', dec: 3 }, { code: 'JOD', country: 'الأردن', name: 'دينار أردني', sym: 'د.أ', dec: 3 },
    { code: 'IQD', country: 'العراق', name: 'دينار عراقي', sym: 'د.ع', dec: 0 }, { code: 'SYP', country: 'سوريا', name: 'ليرة سورية', sym: 'ل.س', dec: 0 },
    { code: 'LBP', country: 'لبنان', name: 'ليرة لبنانية', sym: 'ل.ل', dec: 0 }, { code: 'ILS', country: 'فلسطين', name: 'شيكل', sym: '₪', dec: 2 },
    { code: 'YER', country: 'اليمن', name: 'ريال يمني', sym: 'ر.ي', dec: 0 }, { code: 'LYD', country: 'ليبيا', name: 'دينار ليبي', sym: 'د.ل', dec: 3 },
    { code: 'TND', country: 'تونس', name: 'دينار تونسي', sym: 'د.ت', dec: 3 }, { code: 'DZD', country: 'الجزائر', name: 'دينار جزائري', sym: 'د.ج', dec: 2 },
    { code: 'MAD', country: 'المغرب', name: 'درهم مغربي', sym: 'د.م', dec: 2 }, { code: 'SDG', country: 'السودان', name: 'جنيه سوداني', sym: 'ج.س', dec: 2 },
    { code: 'MRU', country: 'موريتانيا', name: 'أوقية', sym: 'أ.م', dec: 2 }, { code: 'SOS', country: 'الصومال', name: 'شلن صومالي', sym: 'ش.ص', dec: 0 },
    { code: 'DJF', country: 'جيبوتي', name: 'فرنك جيبوتي', sym: 'ف.ج', dec: 0 }, { code: 'KMF', country: 'جزر القمر', name: 'فرنك قمري', sym: 'ف.ق', dec: 0 },
    { code: 'USD', country: 'دولار أمريكي', name: 'دولار', sym: '$', dec: 2 }
  ];
  function cur() { return CURRENCIES.find(function (c) { return c.code === settings.currency; }) || CURRENCIES[0]; }
  function fmt(n, dec) { var d = dec == null ? cur().dec : dec; return (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: d }); }
  function money(n) { return fmt(n) + ' ' + cur().sym; }
  function fq(n) { return (Number(n) || 0).toLocaleString('en-US', { maximumFractionDigits: 3 }); }

  // ---------------- التاريخ والرسائل ----------------
  function today() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function nowLocal() { var d = new Date(); return today() + 'T' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
  function fmtDate(s) { return s ? String(s).slice(0, 10).split('-').join('/') : ''; }
  function fmtDT(s) { if (!s) return ''; var t = String(s).slice(11, 16); return fmtDate(s) + (t ? ' ' + t : ''); }
  var toastT;
  function toast(msg) { var t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('show'); }, 2400); }

  // ---------------- زرار الرجوع: طبقات النوافذ ----------------
  var stack = [], afterPop = [];
  function pushLayer(layer) { stack.push(layer); history.pushState({ cw: stack.length }, ''); }
  function topLayer() { return stack[stack.length - 1]; }
  function closeTop(then) {
    if (!stack.length) { if (then) then(); return; }
    if (then) afterPop.push(then);
    history.back();
  }
  window.addEventListener('popstate', function (e) {
    var depth = (e.state && e.state.cw) || 0;
    while (stack.length > depth) stack.pop().hide();
    var cbs = afterPop; afterPop = [];
    cbs.forEach(function (f) { try { f(); } catch (err) { console.error(err); } });
  });
  var dlgResolve = null;
  function confirmDlg(title, msg, yes) {
    return new Promise(function (resolve) {
      $('dlgTitle').textContent = title; $('dlgMsg').textContent = msg || ''; $('dlgYes').textContent = yes || 'أيوه، امسح';
      $('dialog').classList.add('open'); dlgResolve = resolve;
      pushLayer({ type: 'dialog', hide: function () { $('dialog').classList.remove('open'); if (dlgResolve) { var r = dlgResolve; dlgResolve = null; r(false); } } });
    });
  }
  $('dlgNo').addEventListener('click', function () { closeTop(); });
  $('dlgYes').addEventListener('click', function () { var r = dlgResolve; dlgResolve = null; closeTop(function () { if (r) r(true); }); });

  // ---------------- النافذة المنبثقة ----------------
  var sheet = $('sheet'), backdrop = $('backdrop');
  var S = {};
  function openSheet(title, body, state) {
    S = state || {};
    sheet.innerHTML = '<div class="grab"></div><div class="sheet-head"><h3>' + esc(title) + '</h3><button type="button" class="close-x" data-act="closeTop" aria-label="قفل">' + ic('x') + '</button></div><div id="sheetBody">' + body + '</div>';
    sheet.scrollTop = 0;
    var t = topLayer();
    if (t && t.type === 'sheet') return;
    sheet.classList.add('open'); backdrop.classList.add('open');
    pushLayer({ type: 'sheet', hide: function () { sheet.classList.remove('open'); backdrop.classList.remove('open'); S = {}; } });
  }
  backdrop.addEventListener('click', function () { closeTop(); });
  // آخر صفحة اتفتحت بتبقى فوق (أمر شغل من ملف المركبة، مركبة من صفحة العميل…) — في حدود 150–153 تحت النوافذ (200) والمعاينة
  var pageOrder = [];
  function raise(el) { pageOrder = pageOrder.filter(function (x) { return x !== el; }).concat([el]); pageOrder.forEach(function (x, i) { x.style.zIndex = String(150 + i); }); }
  function afterSheet(fn) { if (topLayer() && topLayer().type === 'sheet') closeTop(fn); else fn(); }

  // ---------------- المظهر ----------------
  var darkQ = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function themeMode() { return settings.theme === 'dark' || settings.theme === 'light' ? settings.theme : 'auto'; }
  function isDark() { var m = themeMode(); return m === 'dark' || (m === 'auto' && !!(darkQ && darkQ.matches)); }
  function applyTheme() {
    var m = themeMode();
    if (m === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', m);
    $('themeBtn').innerHTML = ic(isDark() ? 'sun' : 'moon');
    $('themeBtn').setAttribute('aria-label', isDark() ? 'التبديل للوضع الفاتح' : 'التبديل للوضع الليلي');
    Array.prototype.forEach.call(document.querySelectorAll('[data-theme-set]'), function (b) { b.classList.toggle('on', b.dataset.themeSet === m); });
  }
  if (darkQ && darkQ.addEventListener) darkQ.addEventListener('change', applyTheme);
  $('themeBtn').addEventListener('click', function () { settings.theme = isDark() ? 'light' : 'dark'; saveSettings(); applyTheme(); });

  // ---------------- القوايم القابلة للتعديل ----------------
  function payMethods() { return uniq(K.PAY_METHODS.concat(settings.payMethods)); }
  function expenseCats() { return uniq(K.EXPENSE_CATS.concat(settings.expenseCats)); }
  function checkinItems(cls) { return uniq((K.CHECKIN[cls] || K.CHECKIN.car).concat(settings.checkin)); }
  function oilKm(type) { var o = K.OIL_TYPES.find(function (x) { return x[0] === type; }) || K.OIL_TYPES[0]; var s = settings.oilKm[o[0]]; return s != null && s !== '' ? C.num(s) : o[2]; }
  function services(cls) {
    var base = K.SERVICES.filter(function (s) { return !cls || s[3].split(',').indexOf(cls) >= 0; }).map(function (s) { return { name: s[0], system: s[1], hours: s[2] }; });
    return settings.services.map(function (s) { return { name: s.name, system: s.system || 'other', hours: C.num(s.hours), custom: true }; }).concat(base)
      .filter(function (s, i, a) { return a.findIndex(function (x) { return x.name === s.name; }) === i; });
  }
  function statusOf(k) { return K.STATUSES.find(function (s) { return s[0] === k; }) || K.STATUSES[0]; }
  var STATUS_KEYS = K.STATUSES.map(function (s) { return s[0]; });
  function sysName(k) { return K.SYSTEMS[k] || K.SYSTEMS.other; }

  // ---------------- المركبة: الاسم المختصر ----------------
  function vehTitle(v) { if (!v) return 'من غير مركبة'; return [v.make, v.model, v.year].filter(Boolean).join(' ') || (K.CLASSES[v.cls] || K.CLASSES.car).label; }
  function vehIcon(v) { return (K.CLASSES[(v && v.cls) || 'car'] || K.CLASSES.car).icon; }
  function plateHTML(v) { return v && v.plate ? '<span class="plate">' + esc(v.plate) + '</span>' : ''; }

  // ---------------- التنقل ----------------
  var currentView = 'home', pickInvoice = false, vehTab = 'veh', vehClass = '';
  var jobFilter = { q: '', f: 'all', cust: '', from: '', to: '' };
  var openJobId = null, openVehId = null, openCustId = null, tool = null, toolState = {};
  var VIEWS = ['home', 'jobs', 'vehicles', 'more'];
  function switchView(v) {
    currentView = v;
    VIEWS.forEach(function (n) { $('view-' + n).classList.toggle('active', n === v); $('navBtn-' + n).classList.toggle('active', n === v); });
    if (v !== 'jobs') setPick(false);
    renderView(); window.scrollTo(0, 0);
  }
  function setPick(on) { pickInvoice = on; $('pickBar').classList.toggle('hidden', !on); }
  function renderView() { if (currentView === 'home') renderHome(); else if (currentView === 'jobs') renderJobs(); else if (currentView === 'vehicles') renderVehicles(); else renderMore(); }
  function refresh() {
    renderView();
    if ($('jobPage').classList.contains('open') && openJobId) renderJob(openJobId);
    if ($('vehPage').classList.contains('open') && openVehId) renderVeh(openVehId);
    if ($('custPage').classList.contains('open') && openCustId) renderCust(openCustId);
    if ($('toolPage').classList.contains('open') && tool) renderTool();
  }

  // ---------------- الكروت ----------------
  function row(l, v, cls) { return '<div class="sum-row' + (cls ? ' ' + cls : '') + '"><span>' + esc(l) + '</span><strong>' + esc(v) + '</strong></div>'; }
  function card(title, icon, body, extra) { return '<div class="card"' + (extra || '') + '><div class="card-title"><span class="t-ic">' + ic(icon) + '</span><h2>' + esc(title) + '</h2></div>' + body + '</div>'; }
  function jobCard(j, act) {
    var r = J(j), v = getVeh(j.vehicleId), st = statusOf(j.status);
    var done = j.status === 'delivered' || j.status === 'ready';
    var amt = j.status === 'cancelled' ? '<small>ملغي</small>' : r.remaining > 0.005 && done ? '<small class="due">باقي ' + esc(money(r.remaining)) + '</small>' : (r.total > 0 && done ? '<small class="ok">خالص</small>' : '<small>' + esc(st[1]) + '</small>');
    return '<div class="inv-card" data-act="' + (act || (pickInvoice ? 'pickedInvoice' : 'openJob')) + '" data-id="' + esc(j.id) + '">'
      + '<div class="inv-avatar">' + ic(vehIcon(v)) + '</div>'
      + '<div class="inv-info"><div class="n">' + esc(custName(j)) + '<span class="status-badge ' + st[2] + '">' + esc(st[1]) + '</span></div>'
      + '<div class="m">' + esc([vehTitle(v), v && v.plate, j.number, fmtDate(j.date)].filter(Boolean).join(' · ')) + '</div>'
      + (j.complaint ? '<div class="job-kinds"><span class="kind-tag">' + esc(String(j.complaint).slice(0, 48)) + '</span></div>' : '') + '</div>'
      + '<div class="inv-amount">' + esc(money(r.total)) + amt + '</div></div>';
  }
  function vehCard(v, act) {
    var c = getCust(v.customerId), js = jobsOfVeh(v.id), open = js.filter(C.isOpen).length;
    return '<div class="veh-card" data-act="' + (act || 'openVeh') + '" data-id="' + esc(v.id) + '"><span class="v-ic">' + ic(vehIcon(v)) + '</span>'
      + '<div class="v-info"><div class="v-name">' + esc(vehTitle(v)) + '</div><div class="veh-mini">' + plateHTML(v) + '<span>' + esc([c && c.name, (K.CLASSES[v.cls] || K.CLASSES.car).label + (v.type ? ' · ' + v.type : ''), v.odo ? fq(v.odo) + ' كم' : ''].filter(Boolean).join(' · ')) + '</span></div></div>'
      + '<div class="cust-amt ' + (open ? 'due' : 'ok') + '">' + js.length + '<small>' + (open ? open + ' مفتوح' : 'أمر شغل') + '</small></div></div>';
  }
  function custCard(c) {
    var due = 0; jobsOf(c.id).forEach(function (j) { if (j.status === 'cancelled') return; var r = J(j); if ((j.status === 'delivered' || j.status === 'ready') && r.remaining > 0) due += r.remaining; });
    var nv = vehsOf(c.id).length;
    return '<div class="cust-card" data-act="openCust" data-id="' + esc(c.id) + '"><div class="inv-avatar">' + esc((c.name || '؟').trim().charAt(0)) + '</div>'
      + '<div class="inv-info"><div class="n">' + esc(c.name) + '</div><div class="m">' + esc([c.phone, nv + ' مركبة', jobsOf(c.id).length + ' أمر شغل'].filter(Boolean).join(' · ')) + '</div></div>'
      + '<div class="cust-amt ' + (due > 0.005 ? 'due' : 'ok') + '">' + esc(money(due)) + '<small>' + (due > 0.005 ? 'متبقي' : 'خالص') + '</small></div></div>';
  }
  function sortedJobs() { return db.jobs.slice().sort(function (a, b) { return String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)); }); }

  // ---------------- لوحة الورشة ----------------
  function kpi(label, value, act, cls, sub) {
    return '<button type="button" class="kpi' + (cls ? ' ' + cls : '') + '" ' + act + '><span>' + esc(label) + '</span><b>' + esc(value) + '</b>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</button>';
  }
  function renderHome() {
    var d = C.dashboard(db, ctx(), today()), st = d.byStatus;
    $('homeToday').textContent = fmt(d.collectedToday); $('homeOpen').textContent = d.open; $('homeReady').textContent = st.ready || 0; $('homeDue').textContent = fmt(d.dues, 0);
    Array.prototype.forEach.call(document.querySelectorAll('.cur'), function (el) { el.textContent = cur().sym; });
    var jf = function (f) { return 'data-act="view" data-view="jobs" data-filter="' + f + '"'; };
    var n = function (k) { return st[k] || 0; };
    $('kpis').innerHTML = [
      kpi('تحت الفحص', n('received') + n('diagnosing'), jf('diagnosing'), n('received') + n('diagnosing') ? '' : 'zero'),
      kpi('انتظار موافقة', n('approval'), jf('approval'), n('approval') ? 'warn' : 'zero'),
      kpi('انتظار قطع غيار', n('parts'), jf('parts'), n('parts') ? 'warn' : 'zero'),
      kpi('تحت الإصلاح', n('repair'), jf('repair'), n('repair') ? '' : 'zero'),
      kpi('جاهزة للتسليم', n('ready'), jf('ready'), n('ready') ? 'good' : 'zero'),
      kpi('مواعيد صيانة قريبة', d.reminders, 'data-act="tool" data-tool="reminders"', d.reminders ? 'warn' : 'zero', '30 يوم'),
      kpi('مصنعية الشهر', fmt(d.laborMonth, 0), 'data-act="tool" data-tool="reports"', '', cur().sym),
      kpi('قطع غيار اتباعت', fmt(d.partsMonth, 0), 'data-act="tool" data-tool="reports"', '', 'الشهر ده'),
      kpi('مصروفات الشهر', fmt(d.expensesMonth, 0), 'data-act="tool" data-tool="expenses"', d.expensesMonth ? 'bad' : 'zero', 'النهارده ' + fmt(d.expensesToday, 0)),
      kpi('صافي ربح الشهر', fmt(d.netMonth, 0), 'data-act="tool" data-tool="reports"', d.netMonth < 0 ? 'bad' : 'good', 'بعد المصروفات'),
      kpi('أرصدة الموردين', fmt(d.suppliersDue, 0), 'data-act="tool" data-tool="suppliers"', d.suppliersDue ? 'bad' : 'zero', 'عليك'),
      kpi('قطع ناقصة', d.lowStock, 'data-act="tool" data-tool="inventory" data-low="1"', d.lowStock ? 'warn' : 'zero', 'تحت الحد الأدنى')
    ].join('');
    $('stockBadge').textContent = db.parts.length ? db.parts.length + ' صنف · ' + money(d.stockValue) : 'الأصناف والكميات';
    $('remBadge').textContent = d.reminders ? d.reminders + ' ميعاد قريب' : 'الزيت والرخصة والتأمين';
    var rec = sortedJobs().slice(0, 5);
    $('homeRecent').innerHTML = rec.length ? rec.map(function (j) { return jobCard(j); }).join('') : '<div class="home-empty">لسه مفيش أوامر شغل. ابدأ بـ «استقبال مركبة».</div>';
    var h = new Date().getHours();
    $('greetLine').textContent = (h < 12 ? 'صباح الخير' : 'مساء الخير') + ' — الميكانيكا';
  }

  // ---------------- أوامر الشغل ----------------
  var JOB_FILTERS = [['all', 'الكل'], ['open', 'في الورشة'], ['diagnosing', 'تحت الفحص'], ['approval', 'انتظار موافقة'], ['parts', 'انتظار قطع'], ['repair', 'تحت الإصلاح'], ['ready', 'جاهزة'], ['delivered', 'اتسلمت'], ['due', 'عليها فلوس'], ['cancelled', 'ملغي']];
  $('jobFilters').innerHTML = JOB_FILTERS.map(function (f) { return '<button type="button" class="chip" data-f="' + f[0] + '">' + f[1] + '</button>'; }).join('');
  function matchJob(j) {
    var f = jobFilter.f;
    if (f === 'open' && !C.isOpen(j)) return false;
    if (f === 'diagnosing' && j.status !== 'diagnosing' && j.status !== 'received') return false;
    if (['approval', 'parts', 'repair', 'ready', 'delivered', 'cancelled'].indexOf(f) >= 0 && j.status !== f) return false;
    if (f === 'due' && !((j.status === 'delivered' || j.status === 'ready') && J(j).remaining > 0.005)) return false;
    if (jobFilter.cust && j.customerId !== jobFilter.cust) return false;
    if (jobFilter.from && String(j.date || '') < jobFilter.from) return false;
    if (jobFilter.to && String(j.date || '') > jobFilter.to) return false;
    var q = jobFilter.q.trim();
    if (q) {
      var c = getCust(j.customerId) || {}, v = getVeh(j.vehicleId) || {};
      var hay = [c.name, c.phone, v.plate, v.make, v.model, v.year, v.vin, j.number, j.complaint, j.notes].concat(j.labor.map(function (l) { return l.name; }), j.parts.map(function (p) { return p.name + ' ' + (p.pn || ''); }), j.findings.map(function (f) { return f.code + ' ' + f.desc; })).join(' ');
      if (hay.toLowerCase().indexOf(q.toLowerCase()) < 0) return false;
    }
    return true;
  }
  function renderJobs() {
    var sel = $('jobCust'), keep = jobFilter.cust;
    sel.innerHTML = '<option value="">كل العملاء</option>' + db.customers.slice().sort(function (a, b) { return a.name.localeCompare(b.name, 'ar'); }).map(function (c) { return '<option value="' + esc(c.id) + '">' + esc(c.name) + '</option>'; }).join('');
    sel.value = keep;
    Array.prototype.forEach.call($('jobFilters').children, function (b) { b.classList.toggle('on', b.dataset.f === jobFilter.f); });
    var list = sortedJobs().filter(matchJob), tot = 0, due = 0;
    list.forEach(function (j) { if (j.status === 'cancelled') return; var r = J(j); tot += r.total; if (j.status === 'delivered' || j.status === 'ready') due += Math.max(r.remaining, 0); });
    $('jobSum').innerHTML = list.length ? '<span><b>' + list.length + '</b> أمر شغل</span>·<span>الإجمالي <b>' + esc(money(tot)) + '</b></span>·<span>المتبقي <b>' + esc(money(due)) + '</b></span>' : '';
    $('jobList').innerHTML = list.length ? list.map(function (j) { return jobCard(j); }).join('')
      : (db.jobs.length ? '<div class="home-empty">مفيش أوامر شغل بالفلترة دي</div>' : '<div class="empty"><div class="big">' + ic('clipboard') + '</div><p>لسه مفيش أوامر شغل</p><button type="button" class="btn btn-accent" data-act="receive">' + ic('key') + ' استقبال مركبة</button></div>');
  }
  $('jobSearch').addEventListener('input', function () { jobFilter.q = this.value; renderJobs(); });
  $('jobFilters').addEventListener('click', function (e) { var b = e.target.closest('[data-f]'); if (!b) return; jobFilter.f = b.dataset.f; renderJobs(); });
  $('jobCust').addEventListener('change', function () { jobFilter.cust = this.value; renderJobs(); });
  $('jobFrom').addEventListener('change', function () { jobFilter.from = this.value; renderJobs(); });
  $('jobTo').addEventListener('change', function () { jobFilter.to = this.value; renderJobs(); });

  // ---------------- المركبات والعملاء ----------------
  $('vehFilters').innerHTML = [['', 'الكل'], ['car', 'سيارات'], ['moto', 'موتوسيكلات'], ['tri', 'تروسيكلات']].map(function (f) { return '<button type="button" class="chip" data-c="' + f[0] + '">' + f[1] + '</button>'; }).join('');
  $('vehFilters').addEventListener('click', function (e) { var b = e.target.closest('[data-c]'); if (!b) return; vehClass = b.dataset.c; renderVehicles(); });
  $('vehSearch').addEventListener('input', function () { renderVehicles(); });
  function renderVehicles() {
    Array.prototype.forEach.call($('vehTabs').children, function (b) { b.classList.toggle('on', b.dataset.v === vehTab); });
    Array.prototype.forEach.call($('vehFilters').children, function (b) { b.classList.toggle('on', b.dataset.c === vehClass); });
    $('vehFilters').hidden = vehTab !== 'veh';
    var btn = $('vehAddBtn'); btn.dataset.act = vehTab === 'veh' ? 'newVehicle' : 'newCustomer'; btn.innerHTML = ic('plus') + (vehTab === 'veh' ? ' مركبة جديدة' : ' عميل جديد');
    var q = ($('vehSearch').value || '').trim().toLowerCase();
    if (vehTab === 'veh') {
      var list = db.vehicles.filter(function (v) {
        if (vehClass && (v.cls || 'car') !== vehClass) return false;
        if (!q) return true; var c = getCust(v.customerId) || {};
        return [v.plate, v.make, v.model, v.year, v.vin, v.color, c.name, c.phone].join(' ').toLowerCase().indexOf(q) >= 0;
      }).sort(function (a, b) { return String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)); });
      $('vehList').innerHTML = list.length ? list.map(function (v) { return vehCard(v); }).join('') : '<div class="home-empty">' + (db.vehicles.length ? 'مفيش مركبة بالبحث ده' : 'لسه مفيش مركبات — المركبة بتتسجل لوحدها مع «استقبال مركبة»') + '</div>';
    } else {
      var cl = db.customers.filter(function (c) { return !q || (c.name + ' ' + (c.phone || '')).toLowerCase().indexOf(q) >= 0; }).sort(function (a, b) { return String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)); });
      $('vehList').innerHTML = cl.length ? cl.map(custCard).join('') : '<div class="home-empty">' + (db.customers.length ? 'مفيش عميل بالاسم ده' : 'لسه مفيش عملاء') + '</div>';
    }
  }

  // ---------------- المزيد ----------------
  $('currencySelect').innerHTML = CURRENCIES.map(function (c) { return '<option value="' + c.code + '">' + esc(c.country) + ' — ' + esc(c.name) + ' (' + esc(c.sym) + ')</option>'; }).join('');
  $('currencySelect').addEventListener('change', function () { settings.currency = this.value; saveSettings(); refresh(); toast('العملة: ' + cur().name); });
  [['bizName', 'name'], ['bizPhone', 'phone'], ['bizAddress', 'address']].forEach(function (p) { $(p[0]).addEventListener('input', function () { settings.business[p[1]] = this.value.trim(); saveSettings(); }); });
  $('bizTerms').addEventListener('input', function () { settings.terms = this.value; saveSettings(); });
  // لوجو القسم: بيظهر في فواتير ومستندات القسم ده (ولو مفيش، لوجو «بياناتي» في الصفحة الرئيسية)
  function renderBizLogo() { var l = settings.business.logo || ''; $('bizLogoImg').hidden = !l; if (l) $('bizLogoImg').src = l; $('bizLogoDel').hidden = !l; $('bizLogoBtn').textContent = l ? 'تغيير اللوجو' : 'اختار لوجو'; }
  $('bizLogoBtn').addEventListener('click', function () {
    var inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
    inp.addEventListener('change', function () {
      var f = inp.files && inp.files[0]; if (!f) return;
      var rd = new FileReader();
      rd.onload = function () {
        var img = new Image();
        img.onload = function () {
          var m = 320, sc = Math.min(1, m / Math.max(img.width, img.height)), cv = document.createElement('canvas');
          cv.width = Math.round(img.width * sc); cv.height = Math.round(img.height * sc); cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
          settings.business.logo = cv.toDataURL('image/png'); saveSettings(); renderBizLogo(); toast('اتحفظ اللوجو');
        };
        img.onerror = function () { toast('الملف ده مش صورة'); };
        img.src = rd.result;
      };
      rd.readAsDataURL(f);
    });
    inp.click();
  });
  $('bizLogoDel').addEventListener('click', function () { delete settings.business.logo; saveSettings(); renderBizLogo(); toast('اتشال اللوجو'); });
  renderBizLogo();
  function renderMore() {
    $('currencySelect').value = cur().code; applyTheme();
    $('bizName').value = settings.business.name || ''; $('bizPhone').value = settings.business.phone || '';
    $('bizAddress').value = settings.business.address || ''; $('bizTerms').value = settings.terms || '';
    $('moreSettings').textContent = 'سعر ساعة المصنعية: ' + (C.num(settings.laborRate) ? money(settings.laborRate) : 'مش متحدد') + ' · الضريبة: ' + (C.num(settings.taxPct) ? fq(settings.taxPct) + '%' : 'من غير') + ' · ' + services().length + ' خدمة';
    var tot = 0, cost = 0, due = 0, n = 0;
    db.jobs.forEach(function (j) { if (j.status !== 'delivered') return; var r = J(j); n++; tot += r.total; cost += r.totalCost; due += Math.max(r.remaining, 0); });
    $('moreStats').innerHTML = row('المركبات', String(db.vehicles.length)) + row('أوامر شغل اتسلمت', String(n)) + row('إجمالي الفواتير', money(tot)) + row('التكاليف', money(cost)) + row('المتبقي عند العملاء', money(due));
  }

  // ====================================================================
  // العملاء
  // ====================================================================
  function findCustByName(name) { var n = String(name || '').trim(); return db.customers.find(function (c) { return c.name.trim() === n; }) || null; }
  function ensureCustomer(name, phone) {
    var c = findCustByName(name);
    if (!c) { c = { id: uid('c'), name: String(name).trim(), phone: phone || '', address: '', note: '', createdAt: new Date().toISOString() }; db.customers.push(c); }
    else if (phone && !c.phone) c.phone = phone;
    c.updatedAt = new Date().toISOString();
    return c;
  }
  function openCustomerSheet(id) {
    var c = id ? getCust(id) : {};
    openSheet(id ? 'تعديل بيانات العميل' : 'عميل جديد',
      '<div class="field"><label for="f_cn">اسم العميل</label><input type="text" id="f_cn" value="' + esc(c.name || '') + '" autocomplete="off"></div>'
      + '<div class="row-2"><div class="field"><label for="f_cp">التليفون</label><input type="text" id="f_cp" inputmode="tel" dir="ltr" value="' + esc(c.phone || '') + '"></div><div class="field"><label for="f_cp2">رقم إضافي / واتساب</label><input type="text" id="f_cp2" inputmode="tel" dir="ltr" value="' + esc(c.phone2 || '') + '"></div></div>'
      + '<div class="row-2"><div class="field"><label for="f_ca">العنوان</label><input type="text" id="f_ca" value="' + esc(c.address || '') + '"></div><div class="field"><label for="f_ct">نوع العميل</label><input type="text" id="f_ct" list="ctypes" value="' + esc(c.ctype || '') + '"><datalist id="ctypes">' + K.CUST_TYPES.map(function (t) { return '<option value="' + esc(t) + '">'; }).join('') + '</datalist></div></div>'
      + '<div class="field"><label for="f_cnote">ملاحظات</label><input type="text" id="f_cnote" value="' + esc(c.note || '') + '"></div>'
      + '<button type="button" class="btn btn-primary" data-act="saveCustomer">' + ic('check') + ' حفظ</button>', { custEdit: id || null });
  }
  function saveCustomer() {
    var name = $('f_cn').value.trim();
    if (!name) { toast('اكتب اسم العميل'); return; }
    var other = findCustByName(name);
    if (other && other.id !== S.custEdit) { toast('فيه عميل بنفس الاسم'); return; }
    var c = S.custEdit ? getCust(S.custEdit) : null, isNew = !c;
    if (!c) { c = { id: uid('c'), createdAt: new Date().toISOString() }; db.customers.push(c); }
    c.name = name; c.phone = $('f_cp').value.trim(); c.phone2 = $('f_cp2').value.trim(); c.address = $('f_ca').value.trim(); c.ctype = $('f_ct').value.trim(); c.note = $('f_cnote').value.trim(); c.updatedAt = new Date().toISOString();
    saveDb(); closeTop(function () { refresh(); toast('اتحفظ'); if (isNew) openCust(c.id); });
  }
  // اقتراح العملاء أثناء الكتابة
  function bindCustSuggest(onPick) {
    var inp = $('f_cname'); if (!inp) return;
    inp.addEventListener('input', function () {
      var q = inp.value.trim(), exact = findCustByName(q);
      S.custName = inp.value; S.custId = exact ? exact.id : null;
      var list = q ? db.customers.filter(function (c) { return (c.name + ' ' + (c.phone || '')).indexOf(q) >= 0 && c.name !== q; }).slice(0, 5) : [];
      $('f_csug').innerHTML = list.length ? '<div class="suggest">' + list.map(function (c) {
        return '<button type="button" data-act="pickCust" data-id="' + esc(c.id) + '"><span class="s-av">' + esc(c.name.charAt(0)) + '</span><span>' + esc(c.name) + '<small>' + esc([c.phone, vehsOf(c.id).length + ' مركبة'].filter(Boolean).join(' · ')) + '</small></span></button>';
      }).join('') + '</div>' : '';
      if (onPick) onPick();
    });
  }

  // ====================================================================
  // المركبة: الخانات (مشتركة بين الاستلام والإضافة والتعديل)
  // ====================================================================
  var VK = ['cls', 'type', 'make', 'model', 'year', 'plate', 'color', 'fuel', 'trans', 'stroke', 'feed', 'engine', 'odo', 'vin', 'engineNo', 'oilType', 'tire', 'battery', 'licenseExp', 'insuranceExp', 'notes'];
  function opt(list, sel, blank) { return (blank != null ? '<option value="">' + esc(blank) + '</option>' : '') + list.map(function (x) { var v = Array.isArray(x) ? x[0] : x, l = Array.isArray(x) ? x[1] : x; return '<option value="' + esc(v) + '"' + (String(sel) === String(v) ? ' selected' : '') + '>' + esc(l) + '</option>'; }).join(''); }
  function inp(k, v, ph, o) { o = o || {}; return '<div class="ff' + (o.wide ? ' ff-wide' : '') + '"><span class="mini-lbl">' + esc(o.label) + '</span><input type="' + (o.type || 'text') + '" data-vk="' + k + '"' + (o.num ? ' inputmode="decimal" dir="ltr"' : '') + (o.ltr ? ' dir="ltr"' : '') + (o.list ? ' list="' + o.list + '"' : '') + ' value="' + esc(v0(v)) + '" placeholder="' + esc(ph || '') + '"></div>'; }
  function sel(k, v, list, label, blank) { return '<div class="ff"><span class="mini-lbl">' + esc(label) + '</span><select data-vk="' + k + '">' + opt(list, v, blank) + '</select></div>'; }
  function vehFieldsHTML(v, full) {
    var cls = v.cls || 'car', C1 = K.CLASSES[cls];
    var h = '<div class="segmented seg-3" style="margin-bottom:10px">' + Object.keys(K.CLASSES).map(function (k) { return '<button type="button" class="' + (k === cls ? 'on' : '') + '" data-act="vcls" data-v="' + k + '">' + esc(K.CLASSES[k].label) + '</button>'; }).join('') + '</div>'
      + '<div class="fgrid">' + sel('type', v.type, C1.types, 'النوع', '—')
      + inp('make', v.make, cls === 'car' ? 'تويوتا' : 'باجاج', { label: 'الماركة', list: 'makes_' + cls })
      + inp('model', v.model, cls === 'car' ? 'كورولا' : 'بوكسر', { label: 'الموديل' }) + inp('year', v.year, '2018', { label: 'سنة الصنع', num: true })
      + inp('plate', v.plate, 'أ ب ج 1234', { label: 'رقم اللوحة' }) + inp('color', v.color, '', { label: 'اللون' })
      + sel('fuel', v.fuel, K.FUELS, 'الوقود', '—')
      + (cls === 'car' ? sel('trans', v.trans, K.TRANS, 'ناقل الحركة', '—') : sel('stroke', v.stroke, K.STROKES, 'المحرك', '—'))
      + '</div><datalist id="makes_' + cls + '">' + K.MAKES[cls].map(function (m) { return '<option value="' + esc(m) + '">'; }).join('') + '</datalist>';
    var more = '<div class="fgrid">' + (cls !== 'car' ? sel('feed', v.feed, K.FEED, 'التغذية', '—') : '') + inp('engine', v.engine, cls === 'car' ? '1600' : '150', { label: 'سعة المحرك (سي سي)', num: true })
      + inp('vin', v.vin, '', { label: 'رقم الشاسيه (VIN)', ltr: true }) + inp('engineNo', v.engineNo, '', { label: 'رقم الموتور', ltr: true })
      + sel('oilType', v.oilType, K.OIL_TYPES.map(function (o) { return [o[0], o[1]]; }), 'نوع الزيت', '—') + inp('tire', v.tire, cls === 'car' ? '205/55R16' : '90/90-17', { label: 'مقاس الكاوتش', ltr: true })
      + inp('battery', v.battery, '', { label: 'البطارية' }) + inp('odo', v.odo, '', { label: 'العداد الحالي (كم)', num: true })
      + inp('licenseExp', v.licenseExp, '', { label: 'انتهاء الرخصة', type: 'date' }) + inp('insuranceExp', v.insuranceExp, '', { label: 'انتهاء التأمين', type: 'date' })
      + inp('notes', v.notes, '', { label: 'ملاحظات', wide: true }) + '</div>';
    return h + (full ? more : '<details class="adv"><summary>' + ic('engine') + ' بيانات أكتر (الشاسيه، المحرك، الزيت، الكاوتش، الرخصة…)</summary>' + more + '</details>');
  }
  function readVeh(root) {
    var o = Object.assign({}, S.v || {});
    Array.prototype.forEach.call((root || sheet).querySelectorAll('[data-vk]'), function (el) { o[el.dataset.vk] = el.value.trim(); });
    o.cls = o.cls || 'car';
    return o;
  }
  function openVehicleSheet(id, custId) {
    var v = id ? getVeh(id) : { cls: 'car', customerId: custId || '' };
    var c = getCust(v.customerId) || {};
    openSheet(id ? 'تعديل بيانات المركبة' : 'مركبة جديدة',
      '<div class="field"><label for="f_cname">صاحب المركبة</label><input type="text" id="f_cname" autocomplete="off" value="' + esc(c.name || '') + '" placeholder="اسم العميل"><div id="f_csug"></div></div>'
      + '<div id="f_vblock">' + vehFieldsHTML(v, true) + '</div>'
      + '<button type="button" class="btn btn-primary" data-act="saveVehicle">' + ic('check') + ' حفظ المركبة</button>', { form: 'veh', vehEdit: id || null, v: Object.assign({}, v), custId: c.id || null, custName: c.name || '' });
    bindCustSuggest();
  }
  function applyVeh(v, o) { VK.forEach(function (k) { if (o[k] !== undefined) v[k] = o[k]; }); v.updatedAt = new Date().toISOString(); return v; }
  function saveVehicle() {
    var o = readVeh(), name = $('f_cname').value.trim();
    if (!name) { toast('اكتب اسم صاحب المركبة'); return; }
    if (!o.make && !o.plate && !o.model) { toast('اكتب الماركة أو رقم اللوحة'); return; }
    var c = ensureCustomer(name), v = S.vehEdit ? getVeh(S.vehEdit) : null, isNew = !v;
    if (!v) { v = { id: uid('v'), createdAt: new Date().toISOString() }; db.vehicles.push(v); }
    applyVeh(v, o); v.customerId = c.id;
    saveDb(); closeTop(function () { refresh(); toast('اتحفظت المركبة'); if (isNew) openVeh(v.id); });
  }

  // ====================================================================
  // استقبال مركبة = عميل + مركبة + كشف استلام → أمر شغل
  // ====================================================================
  function vehPickHTML() {
    var c = S.custId ? getCust(S.custId) : null, vs = c ? vehsOf(c.id) : [];
    if (!vs.length) { S.vehId = null; return ''; }
    return '<label class="mini-lbl" style="margin-top:4px">المركبة</label><div class="chips wrap" style="margin-bottom:10px">'
      + vs.map(function (v) { return '<button type="button" class="chip' + (S.vehId === v.id ? ' on' : '') + '" data-act="pickVeh" data-id="' + esc(v.id) + '">' + ic(vehIcon(v)) + ' ' + esc(vehTitle(v) + (v.plate ? ' — ' + v.plate : '')) + '</button>'; }).join('')
      + '<button type="button" class="chip' + (!S.vehId ? ' on' : '') + '" data-act="pickVeh" data-id="">+ مركبة جديدة</button></div>';
  }
  function checkinHTML(cls, ck) {
    ck = ck || {};
    return '<div class="ff-row"><span class="mini-lbl">كشف الاستلام (علّم على الموجود والسليم)</span><div class="check-grid">' + checkinItems(cls).map(function (n) { return '<label><input type="checkbox" data-ck="' + esc(n) + '"' + ((ck.items || {})[n] ? ' checked' : '') + '>' + esc(n) + '</label>'; }).join('') + '</div></div>'
      + '<div class="ff-row"><span class="mini-lbl">خدوش / تلفيات موجودة قبل الاستلام</span><input type="text" id="f_damage" value="' + esc(ck.damage || '') + '" placeholder="مثلاً: خدش في الباب الشمال، كسر في الفانوس"></div>'
      + '<div class="ff-row"><span class="mini-lbl">متعلقات العميل جوه المركبة</span><input type="text" id="f_belong" value="' + esc(ck.belong || '') + '" placeholder="اختياري"></div>';
  }
  function fuelChipsHTML(sel) { return '<div class="chips wrap fuel-chips" id="f_fuel">' + K.FUEL_LEVELS.map(function (f, i) { return '<button type="button" class="chip' + (String(sel) === String(i) ? ' on' : '') + '" data-act="fuelLvl" data-v="' + i + '">' + esc(f) + '</button>'; }).join('') + '</div>'; }
  function openReceive(o) {
    o = o || {};
    var v = o.vehId ? getVeh(o.vehId) : null, c = getCust(o.custId || (v && v.customerId)) || null;
    S = {};
    openSheet('استقبال مركبة',
      '<div class="field"><label for="f_cname">اسم العميل</label><input type="text" id="f_cname" autocomplete="off" placeholder="اكتب الاسم أو اختار عميل موجود" value="' + esc(c ? c.name : '') + '"><div id="f_csug"></div></div>'
      + '<div class="field"><label for="f_cphone">التليفون</label><input type="text" id="f_cphone" inputmode="tel" dir="ltr" value="' + esc(c ? c.phone || '' : '') + '"></div>'
      + '<div id="f_vpick"></div><div id="f_vblock"></div>'
      + '<div class="fgrid"><div class="ff"><span class="mini-lbl">العداد وقت الاستلام (كم)</span><input type="text" id="f_odo" inputmode="decimal" dir="ltr" value="' + esc(v ? v0(v.odo) : '') + '"></div>'
      + '<div class="ff"><span class="mini-lbl">ميعاد التسليم المتوقع</span><input type="date" id="f_promised"></div></div>'
      + '<div class="ff-row"><span class="mini-lbl">البنزين في التانك</span>' + fuelChipsHTML('') + '</div>'
      + '<div class="field"><label for="f_complaint">شكوى العميل / المطلوب</label><textarea id="f_complaint" placeholder="مثلاً: صوت تكتكة في الموتور + تغيير زيت"></textarea></div>'
      + '<div id="f_check"></div>'
      + '<button type="button" class="btn btn-accent" data-act="createJob">' + ic('clipboard') + ' افتح أمر الشغل</button>',
      { form: 'receive', custId: c ? c.id : null, custName: c ? c.name : '', vehId: v ? v.id : null, v: { cls: 'car' }, fuel: '' });
    renderReceiveVeh();
    bindCustSuggest(renderReceiveVeh);
  }
  function renderReceiveVeh() {
    if (S.form !== 'receive') return;
    if ($('f_vblock').innerHTML) S.v = readVeh($('f_vblock'));
    var c = S.custId ? getCust(S.custId) : null;
    if (c && $('f_cphone') && !$('f_cphone').value) $('f_cphone').value = c.phone || '';
    if (S.vehId && (!c || getVeh(S.vehId).customerId !== c.id)) S.vehId = null;
    $('f_vpick').innerHTML = vehPickHTML();
    $('f_vblock').innerHTML = S.vehId ? '' : vehFieldsHTML(S.v || { cls: 'car' }, false);
    var cls = S.vehId ? getVeh(S.vehId).cls : (S.v || {}).cls;
    var keep = readCheck();
    $('f_check').innerHTML = checkinHTML(cls || 'car', keep);
  }
  function readCheck() {
    var o = { items: {} };
    Array.prototype.forEach.call(sheet.querySelectorAll('[data-ck]'), function (b) { o.items[b.dataset.ck] = b.checked; });
    if ($('f_damage')) o.damage = $('f_damage').value.trim();
    if ($('f_belong')) o.belong = $('f_belong').value.trim();
    return o;
  }
  function newJob(c, v, extra) {
    db.seq = (Number(db.seq) || 0) + 1;
    var now = new Date().toISOString();
    var j = normJob(Object.assign({ id: uid('j'), number: (settings.prefix || 'WO') + '-' + pad(db.seq), customerId: c ? c.id : '', vehicleId: v ? v.id : '', date: today(), receivedAt: nowLocal(),
      status: 'received', taxPct: C.num(settings.taxPct) || 0, statusLog: [{ s: 'received', at: now }], createdAt: now, updatedAt: now }, extra || {}));
    db.jobs.push(j);
    return j;
  }
  function createJob() {
    var name = $('f_cname').value.trim();
    if (!name) { toast('اكتب اسم العميل'); return; }
    var c = ensureCustomer(name, $('f_cphone').value.trim()), v = S.vehId ? getVeh(S.vehId) : null;
    if (!v) {
      var o = readVeh($('f_vblock'));
      if (!o.make && !o.plate && !o.model && !o.type) { toast('اكتب بيانات المركبة (الماركة أو رقم اللوحة)'); return; }
      v = applyVeh({ id: uid('v'), createdAt: new Date().toISOString() }, o); v.customerId = c.id; db.vehicles.push(v);
    }
    var odo = C.num($('f_odo').value);
    if (odo && odo > C.num(v.odo)) v.odo = String(odo);
    var j = newJob(c, v, { odoIn: odo ? String(odo) : '', fuelIn: S.fuel, complaint: $('f_complaint').value.trim(), promised: $('f_promised').value, checkin: readCheck() });
    saveDb();
    closeTop(function () { refresh(); openJob(j.id); toast('اتفتح أمر الشغل ' + j.number); });
  }

  // ====================================================================
  // صفحة أمر الشغل
  // ====================================================================
  function openJob(id) {
    if (!getJob(id)) return;
    openJobId = id; renderJob(id);
    var el = $('jobPage'); raise(el); el.classList.add('open'); el.scrollTop = 0; centerPipe();
    pushLayer({ type: 'page', hide: function () { el.classList.remove('open'); openJobId = null; } });
  }
  var NEXT_STEP = {
    received: ['diagnosing', 'ابدأ الفحص', 'search'], diagnosing: ['approval', 'خلص الفحص — ابعت العرض للعميل', 'file'], approval: ['repair', 'العميل وافق — ابدأ الإصلاح', 'wrench'],
    parts: ['repair', 'القطع وصلت — ابدأ الإصلاح', 'box'], repair: ['ready', 'خلصت — جاهزة للتسليم', 'check'], ready: ['delivered', 'تسليم المركبة للعميل', 'key']
  };
  function lineHTML(act, id, name, meta, amt, badge) {
    return '<div class="mat-row" data-act="' + act + '" data-id="' + esc(id) + '"><div class="m-info"><div class="m-name">' + esc(name) + (badge || '') + '</div><div class="m-meta">' + esc(meta) + '</div></div><span class="m-qty">' + esc(amt) + '</span></div>';
  }
  function renderJob(id) {
    var j = getJob(id); if (!j) return;
    var c = getCust(j.customerId), v = getVeh(j.vehicleId), r = J(j), st = statusOf(j.status), nx = NEXT_STEP[j.status];
    var ck = j.checkin || {}, items = ck.items || {}, okItems = Object.keys(items).filter(function (k) { return items[k]; });
    var late = j.promised && j.promised < today() && C.isOpen(j);
    var finds = j.findings.map(function (f) {
      var sv = K.SEVERITY.find(function (s) { return s[0] === f.sev; }) || K.SEVERITY[0];
      return '<div class="mat-row" data-act="editFinding" data-id="' + esc(f.id) + '"><div class="m-info"><div class="m-name">' + esc(f.desc || f.code || 'عطل') + '<span class="sev ' + sv[0] + '">' + esc(sv[1]) + '</span></div><div class="m-meta">' + esc([sysName(f.system), f.code, f.action].filter(Boolean).join(' · ')) + '</div></div>' + (f.fixed ? '<span class="m-qty ok">' + ic('check') + '</span>' : '') + '</div>';
    }).join('');
    var labor = j.labor.map(function (l, i) { var x = r.labor[i], w = byId('workers', l.tech); return lineHTML('editLabor', l.id, (l.done ? '✓ ' : '') + l.name, [sysName(l.system), l.mode === 'hours' ? fq(x.hours) + ' ساعة × ' + fmt(x.rate) : 'مبلغ ثابت', w && w.name].filter(Boolean).join(' · '), money(x.value)); }).join('');
    var parts = j.parts.map(function (p, i) { var x = r.parts[i], src = K.PART_SOURCES.find(function (s) { return s[0] === p.source; }) || K.PART_SOURCES[1]; return lineHTML('editPart', p.id, p.name, [fq(x.qty) + ' × ' + fmt(p.price), p.pn, p.warranty ? 'ضمان ' + p.warranty : ''].filter(Boolean).join(' · '), x.own ? 'من العميل' : money(x.sell), '<span class="src-badge' + (p.source === 'customer' ? ' warn' : '') + '">' + esc(src[1]) + '</span>'); }).join('');
    var outs = j.outside.map(function (o) { return lineHTML('editOutside', o.id, o.name, [o.vendor, 'تكلفة ' + fmt(o.cost)].filter(Boolean).join(' · '), money(C.num(o.price)), '<span class="src-badge">شغل خارجي</span>'); }).join('');
    var costs = j.costs.map(function (k) { return lineHTML('editCost', k.id, k.name || 'مصروف', k.billed ? 'على العميل (في الفاتورة)' : 'عليك (من الربح)', money(C.num(k.amount)), '<span class="src-badge' + (k.billed ? '' : ' warn') + '">' + (k.billed ? 'على العميل' : 'عليك') + '</span>'); }).join('');
    var pays = j.payments.slice().sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); }).map(function (p) {
      return '<div class="entry pay-row" data-act="editPay" data-id="' + esc(p.id) + '"><span class="e-ic">' + ic('cash') + '</span><div class="e-info"><div class="e-title">' + esc(p.kind || p.note || 'دفعة') + '</div><div class="e-meta">' + esc([fmtDate(p.date), p.method, p.ref ? '#' + p.ref : '', p.kind && p.note ? p.note : ''].filter(Boolean).join(' · ')) + '</div></div><span class="e-amt">' + esc(money(p.amount)) + '</span></div>';
    }).join('');
    var recs = j.recs.map(function (x) { return lineHTML('editRec', x.id, x.text, x.due || 'توصية للعميل', '', ''); }).join('');
    var disc = C.num(j.discount && j.discount.value) && j.discount.type === 'percent' ? ' (' + fq(j.discount.value) + '%)' : '';
    var n = j.next || {};
    var html = '<div class="pg-head"><button type="button" class="icon-btn" data-act="closeTop" aria-label="رجوع">' + ic('back') + '</button>'
      + '<div class="titles"><h2>' + esc(c ? c.name : 'عميل') + '</h2><div class="sub">' + esc([vehTitle(v), v && v.plate, j.number, fmtDate(j.date)].filter(Boolean).join(' · ')) + '</div></div>'
      + '<button type="button" class="icon-btn" data-act="jobMenu" aria-label="خيارات">' + ic('more') + '</button></div><div class="container">'
      + '<section class="home-sum"><div class="hs-label">' + (C.isQuote(j) ? 'قيمة العرض لحد دلوقتي' : 'إجمالي أمر الشغل') + ' · ' + esc(st[1]) + '</div><div class="hs-value">' + esc(fmt(r.total)) + ' <small>' + esc(cur().sym) + '</small></div>'
      + '<div class="hs-stats"><button type="button" data-act="addPay"><span>المدفوع</span><strong>' + esc(fmt(r.paid)) + '</strong></button><button type="button" data-act="addPay"><span>المتبقي</span><strong>' + esc(fmt(r.remaining)) + '</strong></button>'
      + '<button type="button" class="mat" data-act="scrollProfit"><span>الربح</span><strong dir="ltr">' + esc(fmt(r.profit)) + '</strong></button></div></section>'
      + '<div class="status-pipe" id="statusPipe">' + K.STATUSES.map(function (s) { return '<button type="button" class="chip' + (j.status === s[0] ? ' on' : '') + '" data-act="setStatus" data-v="' + s[0] + '">' + esc(s[1]) + '</button>'; }).join('') + '</div>'
      + (nx ? '<button type="button" class="btn btn-soft" data-act="setStatus" data-v="' + nx[0] + '" id="nextStep" style="margin-bottom:10px">' + ic(nx[2]) + ' ' + esc(nx[1]) + '</button>' : '')
      + (j.status === 'approval' ? '<button type="button" class="btn btn-ghost" data-act="setStatus" data-v="parts" style="margin:-4px 0 10px">' + ic('box') + ' العميل وافق — مستني قطع غيار</button>' : '')
      // المركبة
      + '<div class="card" id="vehCard"><div class="card-title"><span class="t-ic">' + ic(vehIcon(v)) + '</span><h2>المركبة</h2>' + (v ? '<button type="button" class="btn btn-ghost btn-sm" data-act="openVehOfJob" style="width:auto">الملف</button>' : '') + '</div>'
      + (v ? '<div class="veh-mini" style="margin-bottom:8px">' + plateHTML(v) + '<b>' + esc(vehTitle(v)) + '</b><span>' + esc([(K.CLASSES[v.cls] || K.CLASSES.car).label, v.type, v.fuel, v.color].filter(Boolean).join(' · ')) + '</span></div>' : '<p class="card-empty">مفيش مركبة مربوطة — من «⋮» تقدر تختار مركبة.</p>')
      + '<div class="sum-list">' + row('العداد وقت الاستلام', j.odoIn ? fq(j.odoIn) + ' كم' : '—') + row('البنزين', j.fuelIn !== '' && j.fuelIn != null ? K.FUEL_LEVELS[+j.fuelIn] || '—' : '—') + row('وقت الاستلام', fmtDT(j.receivedAt) || fmtDate(j.date))
      + (j.promised ? row('ميعاد التسليم' + (late ? ' — متأخر' : ''), fmtDate(j.promised), late ? 'minus' : '') : '') + (j.status === 'delivered' ? row('اتسلمت', fmtDT(j.deliveredAt)) + row('العداد وقت التسليم', j.odoOut ? fq(j.odoOut) + ' كم' : '—') : '') + '</div></div>'
      // الشكوى وكشف الاستلام
      + '<div class="card" id="checkCard"><div class="card-title"><span class="t-ic orange">' + ic('clipboard') + '</span><h2>الشكوى وكشف الاستلام</h2><button type="button" class="btn btn-ghost btn-sm" data-act="editCheckin" style="width:auto">تعديل</button></div>'
      + '<div class="note" style="margin-bottom:8px">' + esc(j.complaint || 'مفيش شكوى مكتوبة') + '</div>'
      + '<p class="hint">' + esc(okItems.length ? 'موجود وسليم: ' + okItems.join('، ') : 'كشف الاستلام لسه ما اتعلمش') + (ck.damage ? ' — تلفيات: ' + ck.damage : '') + (ck.belong ? ' — متعلقات: ' + ck.belong : '') + '</p></div>'
      // التشخيص
      + '<div class="card" id="diagCard"><div class="card-title"><span class="t-ic">' + ic('alert') + '</span><h2>الفحص والتشخيص</h2>' + (j.findings.length ? '<span class="tag">' + j.findings.length + '</span>' : '') + '</div>'
      + (finds || '<p class="card-empty">سجّل الأعطال اللي لقيتها وأكواد الكمبيوتر — بتطلع في «تقرير الفحص» للعميل.</p>')
      + '<div class="btn-row"><button type="button" class="btn btn-ghost btn-sm" data-act="addFinding">' + ic('plus') + ' عطل / ملاحظة</button><button type="button" class="btn btn-ghost btn-sm" data-act="symptoms">' + ic('search') + ' من الأعراض</button></div></div>'
      // المصنعية
      + '<div class="card" id="laborCard"><div class="card-title"><span class="t-ic orange">' + ic('wrench') + '</span><h2>المصنعية والخدمات</h2>' + (r.hours ? '<span class="tag">' + fq(r.hours) + ' ساعة</span>' : '') + '</div>'
      + (labor || '<p class="card-empty">ضيف الشغل اللي هيتعمل (تغيير زيت، تيل، عمرة…) بالساعة أو بمبلغ.</p>') + '<button type="button" class="btn btn-soft" data-act="addLabor">' + ic('plus') + ' خدمة / مصنعية</button></div>'
      // قطع الغيار
      + '<div class="card" id="partsCard"><div class="card-title"><span class="t-ic">' + ic('box') + '</span><h2>قطع الغيار</h2>' + (j.parts.length ? '<span class="tag">' + j.parts.length + '</span>' : '') + '</div>'
      + (parts || '<p class="card-empty">من المخزن (بتتخصم لوحدها)، أو اتشرت للعربية، أو جاية من العميل.</p>') + '<button type="button" class="btn btn-soft" data-act="addPart">' + ic('plus') + ' قطعة غيار</button></div>'
      // أعمال خارجية ومصاريف
      + '<div class="card" id="costCard"><div class="card-title"><span class="t-ic">' + ic('truck') + '</span><h2>أعمال خارجية ومصاريف</h2></div>'
      + ((outs + costs) || '<p class="card-empty">خراطة، دوكو، ونش، شحن، مستهلكات… على العميل أو عليك.</p>')
      + '<div class="btn-row"><button type="button" class="btn btn-ghost btn-sm" data-act="addOutside">' + ic('plus') + ' شغل خارجي</button><button type="button" class="btn btn-ghost btn-sm" data-act="addCost">' + ic('plus') + ' مصروف</button></div></div>'
      // حساب العميل
      + '<div class="card" id="accCard"><div class="card-title"><span class="t-ic">' + ic('receipt') + '</span><h2>حساب العميل</h2></div><div class="sum-list">'
      + row('المصنعية', money(r.laborTotal)) + row('قطع الغيار', money(r.partsSell)) + (r.outsideSell ? row('أعمال خارجية', money(r.outsideSell)) : '') + (r.billedCosts ? row('مصاريف على العميل', money(r.billedCosts)) : '')
      + '<div class="sum-row minus"><span>الخصم' + esc(disc) + ' <button type="button" class="edit-link" data-act="editDisc">' + (r.discount ? 'تعديل' : 'إضافة خصم') + '</button></span><strong>' + (r.discount ? '- ' : '') + esc(money(r.discount)) + '</strong></div>'
      + '<div class="sum-row"><span>الضريبة' + (r.taxPct ? ' ' + fq(r.taxPct) + '%' : '') + ' <button type="button" class="edit-link" data-act="editDisc">' + (r.taxPct ? 'تعديل' : 'تفعيل') + '</button></span><strong>' + esc(money(r.tax)) + '</strong></div>'
      + row('الإجمالي', money(r.total), 'bold') + row('المدفوع', money(r.paid)) + '</div>'
      + '<div class="sum-total"><span>' + (r.remaining < -0.005 ? 'زيادة للعميل' : 'المتبقي على العميل') + '</span><strong>' + esc(money(Math.abs(r.remaining))) + '</strong></div>'
      + (pays ? '<div style="margin-top:10px">' + pays + '</div>' : '') + '<button type="button" class="btn btn-ghost" data-act="addPay" style="margin-top:10px">' + ic('cash') + ' تسجيل دفعة</button></div>'
      // التكلفة والربح
      + '<div class="card" id="profitCard"><div class="card-title"><span class="t-ic orange">' + ic('chart') + '</span><h2>تكلفة وربح أمر الشغل</h2></div><div class="sum-list">'
      + row('تكلفة قطع الغيار', money(r.partsCost)) + (r.outsideCost ? row('تكلفة الشغل الخارجي', money(r.outsideCost)) : '') + (r.billedCosts + r.internalCosts ? row('المصاريف', money(r.billedCosts + r.internalCosts)) : '') + (r.workers ? row('أجور الفنيين (من سجل الفنيين)', money(r.workers)) : '')
      + row('إجمالي التكلفة', money(r.totalCost), 'bold') + row('قيمة الشغل' + (r.tax ? ' (من غير الضريبة)' : ''), money(r.total - r.tax))
      + '<div class="sum-row profit' + (r.profit < 0 ? ' neg' : '') + '"><span>الربح</span><strong dir="ltr">' + esc(money(r.profit)) + '</strong></div>' + row('هامش الربح', fq(r.margin) + '%') + '</div>'
      + '<p class="cost-note">مصنعيتك مش تكلفة؛ التكلفة = شراء القطع + الشغل الخارجي + المصاريف + أجور الفنيين. مش بيظهر للعميل.</p></div>'
      // التوصيات والصيانة الجاية والضمان
      + '<div class="card" id="nextCard"><div class="card-title"><span class="t-ic">' + ic('bell') + '</span><h2>التوصيات والصيانة الجاية</h2></div>'
      + (recs || '<p class="card-empty">شغل محتاج يتعمل بعدين (مثلاً: تيل خلفي بعد 5000 كم) — بيطلع في الفاتورة.</p>')
      + '<button type="button" class="btn btn-ghost btn-sm" data-act="addRec" style="margin-bottom:10px">' + ic('plus') + ' توصية</button>'
      + '<div class="fgrid"><div class="ff"><span class="mini-lbl">الصيانة الجاية عند (كم)</span><input type="text" data-nk="km" inputmode="decimal" dir="ltr" value="' + esc(v0(n.km)) + '"></div><div class="ff"><span class="mini-lbl">أو في تاريخ</span><input type="date" data-nk="date" value="' + esc(v0(n.date)) + '"></div>'
      + '<div class="ff ff-wide"><span class="mini-lbl">ملاحظة الصيانة الجاية</span><input type="text" data-nk="note" value="' + esc(v0(n.note)) + '" placeholder="تغيير زيت وفلتر"></div>'
      + '<div class="ff ff-wide"><span class="mini-lbl">الضمان على الشغل</span><input type="text" data-jk="warranty" value="' + esc(v0(j.warranty)) + '" placeholder="مثلاً: 3 شهور أو 5000 كم على المصنعية"></div></div></div>'
      + (c ? '<div data-az-crew="' + SECTION + ':' + esc(j.customerId) + '" data-sec="' + SECTION_NAME + '" data-name="' + esc(c.name || '') + '" data-phone="' + esc(c.phone || '') + '" data-address="' + esc(c.address || '') + '" data-rev="' + esc(custRev(j.customerId)) + '" data-paid="' + esc(custPaid(j.customerId)) + '" data-cur="' + esc(cur().sym) + '"></div>' : '')
      + '<div class="card"><div class="card-title"><span class="t-ic">' + ic('edit') + '</span><h2>ملاحظات</h2></div><textarea id="jobNotes" placeholder="بتظهر في الفاتورة">' + esc(j.notes || '') + '</textarea></div>'
      + '<div class="doc-grid">' + DOCS.map(function (d) { return '<button type="button" class="btn btn-ghost" data-act="preview" data-doc="' + d[0] + '">' + ic(d[2]) + ' ' + d[1] + '</button>'; }).join('') + '</div>'
      + '<div class="btn-row" style="margin-top:10px"><button type="button" class="btn btn-ghost" data-act="againJob">' + ic('copy') + ' أمر شغل جديد لنفس المركبة</button><button type="button" class="btn btn-danger" data-act="delJob">' + ic('trash') + ' حذف</button></div></div>'
      + '<div class="pg-foot"><div class="eb-info"><span>الإجمالي</span><strong>' + esc(money(r.total)) + '</strong></div><button type="button" class="btn btn-accent" data-act="preview" data-doc="' + (C.isQuote(j) ? 'estimate' : 'invoice') + '">' + ic('print') + ' ' + (C.isQuote(j) ? 'عرض السعر' : 'الفاتورة') + ' PDF</button></div>';
    var el = $('jobPage'), stt = el.scrollTop; el.innerHTML = html; el.scrollTop = stt;
    // شريط المراحل: المرحلة الحالية في النص (أفقي بس — من غير ما الصفحة نفسها تتحرك)
    centerPipe();
    $('jobNotes').addEventListener('input', function () { j.notes = this.value; touch(j); saveDb(); });
    Array.prototype.forEach.call(el.querySelectorAll('[data-jk]'), function (inp) { inp.addEventListener('input', function () { j[inp.dataset.jk] = inp.value; touch(j); saveDb(); }); });
    Array.prototype.forEach.call(el.querySelectorAll('[data-nk]'), function (inp) {
      var f = function () { j.next = j.next || {}; j.next[inp.dataset.nk] = inp.value.trim(); touch(j); saveDb(); };
      inp.addEventListener('input', f); if (inp.type === 'date') inp.addEventListener('change', function () { f(); refresh(); });
    });
  }
  function centerPipe() {
    var pipe = $('statusPipe'), on = pipe && pipe.querySelector('.on'); if (!on || !pipe.offsetWidth) return;
    var pr = pipe.getBoundingClientRect(), orr = on.getBoundingClientRect(); pipe.scrollLeft += (orr.left + orr.width / 2) - (pr.left + pr.width / 2);
  }
  var DOCS = [['receipt', 'إيصال استلام', 'key'], ['report', 'تقرير الفحص', 'alert'], ['estimate', 'عرض السعر', 'file'], ['card', 'أمر الشغل للفني', 'wrench'], ['invoice', 'الفاتورة', 'receipt'], ['costs', 'التكاليف (داخلي)', 'chart']];
  function custRev(cid) { return C.money(jobsOf(cid).filter(function (j) { return j.status === 'delivered' || j.status === 'ready'; }).reduce(function (s, j) { return s + J(j).total; }, 0)); }
  function custPaid(cid) { return C.money(jobsOf(cid).reduce(function (s, j) { return s + J(j).paid; }, 0)); }
  function findJob() { return getJob(openJobId); }
  function setStatus(s) {
    var j = findJob(); if (!j || j.status === s) return;
    if (s === 'delivered') { openDeliverySheet(); return; }
    var go = function () { j.status = s; j.statusLog = arr(j.statusLog).concat([{ s: s, at: new Date().toISOString() }]); if (s === 'approval' && !j.quotedAt) j.quotedAt = nowLocal(); if (s === 'repair' && !j.approvedAt) j.approvedAt = nowLocal(); touch(j); saveDb(); refresh(); toast(statusOf(s)[1]); };
    if (s === 'cancelled') confirmDlg('إلغاء أمر الشغل؟', 'أمر الشغل هيفضل محفوظ بس مش هيتحسب في الحسابات، وقطع الغيار اللي من المخزن هترجع للرصيد.', 'أيوه، إلغاء').then(function (ok) { if (ok) go(); });
    else go();
  }

  // ---------------- كشف الاستلام (تعديل) ----------------
  function openCheckinSheet() {
    var j = findJob(); if (!j) return; var v = getVeh(j.vehicleId) || {};
    openSheet('الشكوى وكشف الاستلام',
      '<div class="fgrid"><div class="ff"><span class="mini-lbl">العداد وقت الاستلام (كم)</span><input type="text" id="f_odo" inputmode="decimal" dir="ltr" value="' + esc(v0(j.odoIn)) + '"></div>'
      + '<div class="ff"><span class="mini-lbl">ميعاد التسليم المتوقع</span><input type="date" id="f_promised" value="' + esc(v0(j.promised)) + '"></div></div>'
      + '<div class="ff-row"><span class="mini-lbl">البنزين في التانك</span>' + fuelChipsHTML(j.fuelIn) + '</div>'
      + '<div class="field"><label for="f_complaint">شكوى العميل / المطلوب</label><textarea id="f_complaint">' + esc(j.complaint || '') + '</textarea></div>'
      + checkinHTML(v.cls || 'car', j.checkin)
      + '<button type="button" class="btn btn-primary" data-act="saveCheckin">' + ic('check') + ' حفظ</button>', { form: 'checkin', fuel: v0(j.fuelIn) });
  }
  function saveCheckin() {
    var j = findJob(); if (!j) return; var v = getVeh(j.vehicleId);
    j.odoIn = $('f_odo').value.trim(); j.promised = $('f_promised').value; j.fuelIn = S.fuel; j.complaint = $('f_complaint').value.trim(); j.checkin = readCheck();
    if (v && C.num(j.odoIn) > C.num(v.odo)) v.odo = j.odoIn;
    touch(j); saveDb(); closeTop(function () { refresh(); toast('اتحفظ'); });
  }

  // ---------------- التشخيص ----------------
  function dtcBoxHTML(code) {
    var d = C.dtc(code, K); if (!code) return '';
    if (!d) return '<div class="dtc-box">الكود لازم يبقى حرف (P/B/C/U) و4 أرقام — زي P0300</div>';
    return '<div class="dtc-box"><b>' + esc(d.code) + '</b> — ' + esc(d.family) + (d.sub ? ' · ' + esc(d.sub) : '') + ' · ' + (d.generic ? 'كود عام' : 'كود خاص بالشركة المصنعة (راجع كتالوجها)') + (d.desc ? '<br><b>' + esc(d.desc) + '</b>' : '') + '</div>';
  }
  function openFindingSheet(id, pre) {
    var j = findJob(); if (!j) return;
    var f = id ? j.findings.find(function (x) { return x.id === id; }) || {} : (pre || {});
    openSheet(id ? 'تعديل العطل' : 'عطل / ملاحظة فحص',
      '<div class="fgrid"><div class="ff"><span class="mini-lbl">النظام</span><select id="f_fsys">' + opt(K.SYSTEM_ORDER.map(function (k) { return [k, K.SYSTEMS[k]]; }), f.system || 'engine') + '</select></div>'
      + '<div class="ff"><span class="mini-lbl">كود الكمبيوتر (اختياري)</span><input type="text" id="f_fcode" dir="ltr" value="' + esc(v0(f.code)) + '" placeholder="P0300" autocapitalize="characters"></div></div>'
      + '<div id="f_dtc">' + dtcBoxHTML(f.code) + '</div>'
      + '<div class="field"><label for="f_fdesc">العطل / الملاحظة</label><input type="text" id="f_fdesc" value="' + esc(v0(f.desc)) + '" placeholder="مثلاً: تيل الفرامل الأمامي خلصان"></div>'
      + '<div class="field"><label>الخطورة</label><div class="chips wrap" id="f_fsev">' + K.SEVERITY.map(function (s) { return '<button type="button" class="chip' + ((f.sev || 'mid') === s[0] ? ' on' : '') + '" data-act="sevPick" data-v="' + s[0] + '">' + esc(s[1]) + '</button>'; }).join('') + '</div></div>'
      + '<div class="field"><label for="f_fact">المطلوب / الإصلاح المقترح</label><input type="text" id="f_fact" value="' + esc(v0(f.action)) + '" placeholder="مثلاً: تغيير التيل وخرط الديسكات"></div>'
      + '<label class="bill-toggle"><span>اتصلح</span><input type="checkbox" id="f_ffixed"' + (f.fixed ? ' checked' : '') + '></label>'
      + '<button type="button" class="btn btn-primary" data-act="saveFinding" style="margin-top:12px">' + ic('check') + ' حفظ</button>' + (id ? '<button type="button" class="btn btn-danger" data-act="delFinding" style="margin-top:10px">' + ic('trash') + ' حذف</button>' : ''), { form: 'finding', fid: id || null, sev: f.sev || 'mid' });
    $('f_fcode').addEventListener('input', function () {
      var d = C.dtc(this.value, K); $('f_dtc').innerHTML = dtcBoxHTML(this.value.trim());
      if (d && d.desc && !$('f_fdesc').value.trim()) $('f_fdesc').value = d.desc;
    });
  }
  function saveFinding() {
    var j = findJob(); if (!j) return;
    var o = { id: S.fid || uid('f'), system: $('f_fsys').value, code: $('f_fcode').value.trim().toUpperCase(), desc: $('f_fdesc').value.trim(), sev: S.sev, action: $('f_fact').value.trim(), fixed: $('f_ffixed').checked };
    if (!o.desc && !o.code) { toast('اكتب العطل أو الكود'); return; }
    var i = j.findings.findIndex(function (x) { return x.id === o.id; }); if (i >= 0) j.findings[i] = o; else j.findings.push(o);
    if (j.status === 'received') { j.status = 'diagnosing'; j.statusLog = arr(j.statusLog).concat([{ s: 'diagnosing', at: new Date().toISOString() }]); }
    touch(j); saveDb(); closeTop(function () { refresh(); toast('اتسجل'); });
  }
  function symptomsHTML(q) {
    q = (q || '').trim();
    var list = K.SYMPTOMS.map(function (s, i) { return [s, i]; }).filter(function (p) { return !q || (p[0][0] + ' ' + p[0][2].join(' ')).indexOf(q) >= 0; });
    return list.length ? '<div class="menu-list sym-list">' + list.map(function (p) { return '<button type="button" class="action-item" data-act="symPick" data-i="' + p[1] + '"><span class="a-ic">' + ic('alert') + '</span><span>' + esc(p[0][0]) + '<small>' + esc(sysName(p[0][1])) + '</small></span></button>'; }).join('') + '</div>' : '<p class="card-empty">مفيش عرض بالكلام ده — سجّل العطل يدوي.</p>';
  }
  function openSymptoms(forJob) {
    openSheet('الأعراض: احتمالات للفحص', '<p class="hint" style="margin-top:-4px">دي أماكن تبدأ تفحصها حسب العرض — مش تشخيص نهائي. القرار بعد الفحص الفعلي والقياس.</p><div class="search-box">' + ic('search') + '<input type="search" id="f_symq" placeholder="دوّر: سخونية، رعشة، فرامل، تكييف…" autocomplete="off"></div><div id="f_syml">' + symptomsHTML('') + '</div>', { form: 'sym', forJob: !!forJob });
    $('f_symq').addEventListener('input', function () { $('f_syml').innerHTML = symptomsHTML(this.value); });
  }
  function symPick(i) {
    var s = K.SYMPTOMS[i]; if (!s) return; S.sym = i;
    $('sheetBody').innerHTML = '<div class="note" style="margin-bottom:10px"><b>' + esc(s[0]) + '</b><br>' + esc(sysName(s[1])) + '</div>'
      + s[2].map(function (c, k) { return '<div class="cause-row"><span>' + (k + 1) + '. ' + esc(c) + '</span>' + (S.forJob ? '<button type="button" class="btn btn-ghost btn-sm" data-act="symAdd" data-k="' + k + '">+ للفحص</button>' : '') + '</div>'; }).join('')
      + '<p class="hint" style="margin-top:10px">ابدأ بالأسهل والأرخص في الفحص، وسجّل اللي اتأكدت منه بس كعطل.</p>'
      + '<button type="button" class="btn btn-ghost" data-act="symBack" style="margin-top:8px">' + ic('back') + ' أعراض تانية</button>';
  }
  function symAdd(k) {
    var j = findJob(), s = K.SYMPTOMS[S.sym]; if (!j || !s) return;
    j.findings.push({ id: uid('f'), system: s[1], code: '', desc: 'فحص: ' + s[2][k], sev: 'low', action: '', fixed: false, from: s[0] });
    if (j.status === 'received') j.status = 'diagnosing';
    touch(j); saveDb(); refresh(); toast('اتضاف للفحص');
  }

  // ---------------- المصنعية ----------------
  function servicesHTML(q, cls) {
    q = (q || '').trim();
    var list = services(cls).filter(function (s) { return !q || (s.name + ' ' + sysName(s.system)).indexOf(q) >= 0; }).slice(0, q ? 40 : 14);
    return list.length ? '<div class="chips wrap">' + list.map(function (s) { var p = settings.servicePrices[s.name]; return '<button type="button" class="chip" data-act="svcPick" data-n="' + esc(s.name) + '">' + esc(s.name) + (p && (C.num(p.amount) || C.num(p.hours)) ? ' · ' + esc(p.mode === 'fixed' ? fmt(p.amount) : fq(p.hours) + ' س') : '') + '</button>'; }).join('') + '</div>' : '';
  }
  function openLaborSheet(id) {
    var j = findJob(); if (!j) return; var v = getVeh(j.vehicleId) || {};
    var l = id ? j.labor.find(function (x) { return x.id === id; }) || {} : { mode: 'hours', system: 'engine' };
    openSheet(id ? 'تعديل المصنعية' : 'خدمة / مصنعية',
      (id ? '' : '<div class="search-box">' + ic('search') + '<input type="search" id="f_svcq" placeholder="دوّر في الخدمات: زيت، تيل، عمرة، كهربا…" autocomplete="off"></div><div id="f_svcl" style="margin-bottom:10px">' + servicesHTML('', v.cls) + '</div>')
      + '<div class="field"><label for="f_lname">الخدمة</label><input type="text" id="f_lname" value="' + esc(v0(l.name)) + '"></div>'
      + '<div class="fgrid"><div class="ff"><span class="mini-lbl">النظام</span><select id="f_lsys">' + opt(K.SYSTEM_ORDER.map(function (k) { return [k, K.SYSTEMS[k]]; }), l.system || 'engine') + '</select></div>'
      + '<div class="ff"><span class="mini-lbl">الفني</span><select id="f_ltech">' + opt(db.workers.map(function (w) { return [w.id, w.name]; }), l.tech || '', '—') + '</select></div></div>'
      + '<div class="segmented seg-2" id="f_lmode" style="margin-bottom:10px"><button type="button" class="' + (l.mode !== 'fixed' ? 'on' : '') + '" data-act="lmode" data-v="hours">بالساعة</button><button type="button" class="' + (l.mode === 'fixed' ? 'on' : '') + '" data-act="lmode" data-v="fixed">مبلغ ثابت</button></div>'
      + '<div class="fgrid" id="f_lhours"' + (l.mode === 'fixed' ? ' hidden' : '') + '><div class="ff"><span class="mini-lbl">عدد الساعات</span><input type="text" id="f_lh" inputmode="decimal" dir="ltr" value="' + esc(v0(l.hours)) + '"></div><div class="ff"><span class="mini-lbl">سعر الساعة</span><input type="text" id="f_lr" inputmode="decimal" dir="ltr" value="' + esc(v0(l.rate)) + '" placeholder="' + esc(C.num(settings.laborRate) ? fmt(settings.laborRate) : 'اكتب السعر') + '"></div></div>'
      + '<div class="field" id="f_lfixed"' + (l.mode === 'fixed' ? '' : ' hidden') + '><label for="f_la">المبلغ (' + esc(cur().sym) + ')</label><input type="text" id="f_la" inputmode="decimal" dir="ltr" value="' + esc(v0(l.amount)) + '"></div>'
      + '<label class="bill-toggle"><span>الشغلانة خلصت</span><input type="checkbox" id="f_ldone"' + (l.done ? ' checked' : '') + '></label>'
      + '<div class="line-total" id="f_ltot"></div>'
      + '<button type="button" class="btn btn-primary" data-act="saveLabor" style="margin-top:10px">' + ic('check') + ' حفظ</button>' + (id ? '<button type="button" class="btn btn-danger" data-act="delLabor" style="margin-top:10px">' + ic('trash') + ' حذف</button>' : ''), { form: 'labor', lid: id || null, mode: l.mode === 'fixed' ? 'fixed' : 'hours', cls: v.cls });
    if ($('f_svcq')) $('f_svcq').addEventListener('input', function () { $('f_svcl').innerHTML = servicesHTML(this.value, S.cls); });
    ['f_lh', 'f_lr', 'f_la'].forEach(function (k) { $(k).addEventListener('input', laborLive); }); laborLive();
  }
  function readLabor() { return { id: S.lid || uid('l'), name: $('f_lname').value.trim(), system: $('f_lsys').value, tech: $('f_ltech').value, mode: S.mode, hours: $('f_lh').value.trim(), rate: $('f_lr').value.trim(), amount: $('f_la').value.trim(), done: $('f_ldone').checked }; }
  function laborLive() { var x = C.laborLine(readLabor(), settings.laborRate); $('f_ltot').innerHTML = 'الإجمالي: ' + esc(money(x.value)) + (S.mode === 'hours' && !x.rate ? ' <small>(اكتب سعر الساعة هنا أو في الإعدادات)</small>' : ''); }
  function svcPick(name) {
    var s = services(S.cls).find(function (x) { return x.name === name; }) || { name: name, system: 'other', hours: 0 };
    var p = settings.servicePrices[name] || {};
    $('f_lname').value = s.name; $('f_lsys').value = s.system;
    var mode = p.mode || (s.hours ? 'hours' : 'fixed'); S.mode = mode;
    Array.prototype.forEach.call($('f_lmode').children, function (b) { b.classList.toggle('on', b.dataset.v === mode); });
    $('f_lhours').hidden = mode !== 'hours'; $('f_lfixed').hidden = mode !== 'fixed';
    $('f_lh').value = p.hours || (s.hours ? s.hours : ''); $('f_la').value = p.amount || ''; laborLive();
  }
  function saveLabor() {
    var j = findJob(); if (!j) return; var o = readLabor();
    if (!o.name) { toast('اكتب اسم الخدمة'); return; }
    if (o.mode === 'hours' && !C.num(o.hours)) { toast('اكتب عدد الساعات'); return; }
    if (o.mode === 'fixed' && !C.num(o.amount)) { toast('اكتب المبلغ'); return; }
    settings.servicePrices[o.name] = { mode: o.mode, hours: o.hours, amount: o.amount }; saveSettings();
    var i = j.labor.findIndex(function (x) { return x.id === o.id; }); if (i >= 0) j.labor[i] = o; else j.labor.push(o);
    touch(j); saveDb(); closeTop(function () { refresh(); toast('اتسجلت'); });
  }

  // ---------------- قطع الغيار ----------------
  function stockPickHTML(q) {
    var s = C.stock(db); q = (q || '').trim().toLowerCase();
    var list = db.parts.filter(function (p) { return !q || [p.name, p.pn, p.brand, p.fits, p.cat].join(' ').toLowerCase().indexOf(q) >= 0; }).slice(0, 30);
    if (!db.parts.length) return '<p class="card-empty">المخزن فاضي — ضيف الأصناف من «قطع الغيار والمخزن» أو اختار «اتشرت للعربية».</p>';
    return list.length ? '<div class="pick-list">' + list.map(function (p) { var x = s[p.id]; return '<div class="mat-row' + (S.partId === p.id ? ' on' : '') + '" data-act="stockPick" data-id="' + esc(p.id) + '"><div class="m-info"><div class="m-name">' + esc(p.name) + '</div><div class="m-meta">' + esc([p.pn, p.brand, 'بيع ' + fmt(p.price)].filter(Boolean).join(' · ')) + '</div></div><span class="m-qty stock-qty' + (x.qty <= 0 ? ' low' : '') + '">' + fq(x.qty) + '<small>' + esc(p.unit || 'قطعة') + '</small></span></div>'; }).join('') + '</div>' : '<p class="card-empty">مفيش صنف بالاسم ده</p>';
  }
  function openPartSheet(id) {
    var j = findJob(); if (!j) return;
    var p = id ? j.parts.find(function (x) { return x.id === id; }) || {} : { source: db.parts.length ? 'stock' : 'bought', qty: '1' };
    openSheet(id ? 'تعديل قطعة الغيار' : 'قطعة غيار',
      '<div class="segmented seg-3" id="f_psrc" style="margin-bottom:10px">' + K.PART_SOURCES.map(function (s) { return '<button type="button" class="' + (p.source === s[0] ? 'on' : '') + '" data-act="psrc" data-v="' + s[0] + '">' + esc(s[1]) + '</button>'; }).join('') + '</div>'
      + '<div id="f_pstock"' + (p.source === 'stock' ? '' : ' hidden') + '><div class="search-box">' + ic('search') + '<input type="search" id="f_pq" placeholder="دوّر في المخزن بالاسم أو رقم القطعة" autocomplete="off"></div><div id="f_plist" style="margin-bottom:10px"></div></div>'
      + '<div class="field"><label for="f_pname">القطعة</label><input type="text" id="f_pname" value="' + esc(v0(p.name)) + '"></div>'
      + '<div class="fgrid"><div class="ff"><span class="mini-lbl">رقم القطعة (P/N)</span><input type="text" id="f_ppn" dir="ltr" value="' + esc(v0(p.pn)) + '"></div><div class="ff"><span class="mini-lbl">الكمية</span><input type="text" id="f_pqty" inputmode="decimal" dir="ltr" value="' + esc(v0(p.qty || '1')) + '"></div>'
      + '<div class="ff"><span class="mini-lbl">سعر الشراء (التكلفة)</span><input type="text" id="f_pcost" inputmode="decimal" dir="ltr" value="' + esc(v0(p.cost)) + '"></div><div class="ff"><span class="mini-lbl">سعر البيع للعميل</span><input type="text" id="f_pprice" inputmode="decimal" dir="ltr" value="' + esc(v0(p.price)) + '"></div>'
      + '<div class="ff ff-wide"><span class="mini-lbl">ضمان القطعة (اختياري)</span><input type="text" id="f_pwar" value="' + esc(v0(p.warranty)) + '" placeholder="مثلاً: 6 شهور"></div></div>'
      + '<div class="line-total" id="f_ptot"></div>'
      + '<button type="button" class="btn btn-primary" data-act="savePart" style="margin-top:10px">' + ic('check') + ' حفظ</button>' + (id ? '<button type="button" class="btn btn-danger" data-act="delPart" style="margin-top:10px">' + ic('trash') + ' حذف</button>' : ''),
      { form: 'part', pid: id || null, source: p.source || 'bought', partId: p.partId || null });
    $('f_plist').innerHTML = stockPickHTML('');
    $('f_pq').addEventListener('input', function () { $('f_plist').innerHTML = stockPickHTML(this.value); });
    ['f_pqty', 'f_pcost', 'f_pprice'].forEach(function (k) { $(k).addEventListener('input', partLive); }); partLive();
  }
  function readPartLine() { return { id: S.pid || uid('pp'), source: S.source, partId: S.source === 'stock' ? S.partId : null, name: $('f_pname').value.trim(), pn: $('f_ppn').value.trim(), qty: $('f_pqty').value.trim(), cost: $('f_pcost').value.trim(), price: $('f_pprice').value.trim(), warranty: $('f_pwar').value.trim() }; }
  function partLive() {
    var o = readPartLine(), x = C.partLine(o), extra = '';
    if (o.source === 'stock' && o.partId) { var s = C.stock(db)[o.partId], cur0 = S.pid ? (findJob().parts.find(function (y) { return y.id === S.pid; }) || {}) : {}; var avail = s.qty + (cur0.partId === o.partId ? C.num(cur0.qty) : 0); extra = ' · المتاح في المخزن ' + fq(avail) + (x.qty > avail ? ' ⚠ أقل من المطلوب' : ''); }
    $('f_ptot').innerHTML = (x.own ? 'القطعة من العميل — بتتحسب مصنعية بس' : 'الإجمالي: ' + esc(money(x.sell)) + ' · الربح ' + esc(money(x.sell - x.cost))) + esc(extra);
  }
  function stockPick(id) {
    var p = getPart(id); if (!p) return; S.partId = id;
    $('f_pname').value = p.name; $('f_ppn').value = p.pn || ''; $('f_pcost').value = v0(p.cost); $('f_pprice').value = v0(p.price);
    Array.prototype.forEach.call($('f_plist').querySelectorAll('.mat-row'), function (r) { r.classList.toggle('on', r.dataset.id === id); });
    partLive();
  }
  function savePart() {
    var j = findJob(); if (!j) return; var o = readPartLine();
    if (!o.name) { toast('اكتب اسم القطعة'); return; }
    if (!(C.num(o.qty) > 0)) { toast('اكتب الكمية'); return; }
    if (o.source === 'stock' && !o.partId) { toast('اختار القطعة من المخزن'); return; }
    var i = j.parts.findIndex(function (x) { return x.id === o.id; }); if (i >= 0) j.parts[i] = o; else j.parts.push(o);
    touch(j); saveDb(); closeTop(function () { refresh(); toast('اتسجلت'); });
  }

  // ---------------- شغل خارجي ومصاريف ----------------
  function openOutsideSheet(id) {
    var j = findJob(); if (!j) return; var o = id ? j.outside.find(function (x) { return x.id === id; }) || {} : {};
    openSheet('شغل خارجي', '<div class="field"><label for="f_on">الشغل</label><input type="text" id="f_on" value="' + esc(v0(o.name)) + '" placeholder="مثلاً: خراطة وش سلندر، دوكو، لحام ردياتير"></div>'
      + '<div class="field"><label for="f_ov">عند مين</label><input type="text" id="f_ov" value="' + esc(v0(o.vendor)) + '" placeholder="اختياري"></div>'
      + '<div class="row-2"><div class="field"><label for="f_oc">التكلفة عليك</label><input type="text" id="f_oc" inputmode="decimal" dir="ltr" value="' + esc(v0(o.cost)) + '"></div><div class="field"><label for="f_op">السعر للعميل</label><input type="text" id="f_op" inputmode="decimal" dir="ltr" value="' + esc(v0(o.price)) + '"></div></div>'
      + '<button type="button" class="btn btn-primary" data-act="saveOutside">' + ic('check') + ' حفظ</button>' + (id ? '<button type="button" class="btn btn-danger" data-act="delOutside" style="margin-top:10px">' + ic('trash') + ' حذف</button>' : ''), { form: 'outside', oid: id || null });
  }
  function saveOutside() {
    var j = findJob(); if (!j) return; var o = { id: S.oid || uid('o'), name: $('f_on').value.trim(), vendor: $('f_ov').value.trim(), cost: $('f_oc').value.trim(), price: $('f_op').value.trim() };
    if (!o.name) { toast('اكتب الشغل'); return; }
    var i = j.outside.findIndex(function (x) { return x.id === o.id; }); if (i >= 0) j.outside[i] = o; else j.outside.push(o);
    touch(j); saveDb(); closeTop(function () { refresh(); toast('اتسجل'); });
  }
  function openCostSheet(id) {
    var j = findJob(); if (!j) return; var o = id ? j.costs.find(function (x) { return x.id === id; }) || {} : { billed: false };
    openSheet('مصروف على أمر الشغل', '<div class="field"><label for="f_kn">البيان</label><input type="text" id="f_kn" value="' + esc(v0(o.name)) + '" placeholder="مثلاً: ونش، مستهلكات، مواصلات لشراء قطعة"></div>'
      + '<div class="field"><label for="f_ka">المبلغ</label><input type="text" id="f_ka" inputmode="decimal" dir="ltr" value="' + esc(v0(o.amount)) + '"></div>'
      + '<label class="bill-toggle"><span>على حساب العميل (في الفاتورة)</span><input type="checkbox" id="f_kb"' + (o.billed ? ' checked' : '') + '></label>'
      + '<button type="button" class="btn btn-primary" data-act="saveCost" style="margin-top:12px">' + ic('check') + ' حفظ</button>' + (id ? '<button type="button" class="btn btn-danger" data-act="delCost" style="margin-top:10px">' + ic('trash') + ' حذف</button>' : ''), { form: 'cost', kid: id || null });
  }
  function saveCost() {
    var j = findJob(); if (!j) return; var o = { id: S.kid || uid('k'), name: $('f_kn').value.trim(), amount: $('f_ka').value.trim(), billed: $('f_kb').checked };
    if (!C.num(o.amount)) { toast('اكتب المبلغ'); return; }
    var i = j.costs.findIndex(function (x) { return x.id === o.id; }); if (i >= 0) j.costs[i] = o; else j.costs.push(o);
    touch(j); saveDb(); closeTop(function () { refresh(); toast('اتسجل'); });
  }

  // ---------------- الخصم والضريبة ----------------
  function openDiscSheet() {
    var j = findJob(); if (!j) return; var d = j.discount || {};
    openSheet('الخصم والضريبة', '<div class="segmented seg-2" id="f_dtype" style="margin-bottom:10px"><button type="button" class="' + (d.type !== 'percent' ? 'on' : '') + '" data-act="dtype" data-v="amount">مبلغ</button><button type="button" class="' + (d.type === 'percent' ? 'on' : '') + '" data-act="dtype" data-v="percent">نسبة %</button></div>'
      + '<div class="field"><label for="f_dv">الخصم</label><input type="text" id="f_dv" inputmode="decimal" dir="ltr" value="' + esc(v0(d.value)) + '"></div>'
      + '<div class="field"><label for="f_tax">الضريبة % (سيبها فاضية لو مفيش)</label><input type="text" id="f_tax" inputmode="decimal" dir="ltr" value="' + esc(C.num(j.taxPct) ? j.taxPct : '') + '"></div>'
      + '<button type="button" class="btn btn-primary" data-act="saveDisc">' + ic('check') + ' حفظ</button>', { form: 'disc', dtype: d.type === 'percent' ? 'percent' : 'amount' });
  }

  // ---------------- الدفعات ----------------
  function openPaySheet(jobId, payId) {
    var job = getJob(jobId); if (!job) return;
    var r = J(job), p = payId ? job.payments.find(function (x) { return x.id === payId; }) : null;
    var rem = p ? r.remaining + C.num(p.amount) : r.remaining;
    openSheet(p ? 'تعديل دفعة' : 'تسجيل دفعة من ' + custName(job),
      '<div class="field"><label for="f_pamt">المبلغ (' + esc(cur().sym) + ')</label><input type="text" id="f_pamt" inputmode="decimal" dir="ltr" value="' + esc(p ? v0(p.amount) : '') + '"></div>'
      + (rem > 0.005 ? '<div class="price-hint" style="margin:-6px 0 12px"><button type="button" class="chip" data-act="payAll" data-v="' + esc(C.money(rem)) + '">الباقي كله: ' + esc(money(rem)) + '</button></div>' : '')
      + '<div class="field"><label>نوع الدفعة</label><div class="chips wrap" id="f_pkinds">' + K.PAY_TYPES.map(function (t) { return '<button type="button" class="chip' + (p && p.kind === t ? ' on' : '') + '" data-act="payKind" data-v="' + esc(t) + '">' + esc(t) + '</button>'; }).join('') + '</div></div>'
      + '<div class="row-2"><div class="field"><label for="f_pmethod">طريقة الدفع</label><select id="f_pmethod">' + payMethods().map(function (m) { return '<option' + (p && p.method === m ? ' selected' : '') + '>' + esc(m) + '</option>'; }).join('') + '</select></div><div class="field"><label for="f_pref">رقم مرجعي</label><input type="text" id="f_pref" dir="ltr" value="' + esc(p ? p.ref || '' : '') + '"></div></div>'
      + '<div class="row-2"><div class="field"><label for="f_pdate">التاريخ</label><input type="date" id="f_pdate" value="' + esc(p ? p.date : today()) + '"></div><div class="field"><label for="f_pnote">ملحوظة</label><input type="text" id="f_pnote" value="' + esc(p ? p.note || '' : '') + '"></div></div>'
      + '<button type="button" class="btn btn-accent" data-act="savePay">' + ic('check') + ' حفظ الدفعة</button>'
      + (p ? '<button type="button" class="btn btn-danger" data-act="delPay" style="margin-top:10px">' + ic('trash') + ' حذف الدفعة</button>' : ''), { form: 'pay', jobId: jobId, payId: payId || null, kind: p ? p.kind || '' : '' });
  }
  function savePay() {
    var job = getJob(S.jobId); if (!job) return;
    var amt = C.num($('f_pamt').value);
    if (!(amt > 0)) { toast('اكتب المبلغ'); return; }
    var p = { id: S.payId || uid('p'), amount: amt, date: $('f_pdate').value || today(), note: $('f_pnote').value.trim(), method: $('f_pmethod').value, ref: $('f_pref').value.trim(), kind: S.kind || '' };
    var i = job.payments.findIndex(function (x) { return x.id === p.id; });
    if (i >= 0) job.payments[i] = p; else job.payments.push(p);
    touch(job); saveDb(); closeTop(function () { refresh(); toast('اتسجلت الدفعة'); });
  }
  function openPickJob(purpose) {
    var list = sortedJobs().filter(function (j) { return j.status !== 'cancelled'; });
    if (purpose === 'pay') list = list.filter(function (j) { return J(j).remaining > 0.005 && J(j).total > 0; });
    if (!list.length) { toast(purpose === 'pay' ? 'مفيش أوامر شغل عليها فلوس' : 'مفيش أوامر شغل'); return; }
    openSheet('تسجيل دفعة — اختار أمر الشغل', '<div class="pick-list">' + list.slice(0, 40).map(function (j) { return jobCard(j, 'pickedJob'); }).join('') + '</div>', { pickFor: purpose });
  }

  // ---------------- التسليم والصيانة الجاية ----------------
  function openDeliverySheet() {
    var j = findJob(); if (!j) return; var v = getVeh(j.vehicleId) || {}, r = J(j);
    var oil = v.oilType || (v.cls === 'moto' ? 'moto' : 'mineral'), odoOut = j.odoOut || j.odoIn || v.odo || '';
    var interval = oilKm(oil), ns = C.nextService({ odo: odoOut, interval: interval, date: today(), months: settings.nextMonths || 6 });
    openSheet('تسليم المركبة للعميل',
      (r.remaining > 0.005 ? '<div class="warn-box" style="margin-bottom:10px">لسه على العميل ' + esc(money(r.remaining)) + ' — تقدر تسجّل دفعة بعد التسليم.</div>' : '')
      + '<div class="fgrid"><div class="ff"><span class="mini-lbl">العداد وقت التسليم (كم)</span><input type="text" id="f_odoout" inputmode="decimal" dir="ltr" value="' + esc(v0(odoOut)) + '"></div>'
      + '<div class="ff"><span class="mini-lbl">وقت التسليم</span><input type="datetime-local" id="f_dat" value="' + esc(nowLocal()) + '"></div></div>'
      + '<p class="more-h">الصيانة الجاية (بتطلع في الفاتورة وفي «مواعيد الصيانة»)</p>'
      + '<div class="fgrid"><div class="ff"><span class="mini-lbl">نوع الزيت</span><select id="f_oil">' + opt(K.OIL_TYPES.map(function (o) { return [o[0], o[1] + (oilKm(o[0]) ? ' — كل ' + fq(oilKm(o[0])) + ' كم' : '')]; }), oil) + '</select></div>'
      + '<div class="ff"><span class="mini-lbl">كل (كم)</span><input type="text" id="f_int" inputmode="decimal" dir="ltr" value="' + esc(interval || '') + '"></div>'
      + '<div class="ff"><span class="mini-lbl">الصيانة الجاية عند (كم)</span><input type="text" id="f_nkm" inputmode="decimal" dir="ltr" value="' + esc(j.next.km || ns.km || '') + '"></div>'
      + '<div class="ff"><span class="mini-lbl">أو في تاريخ</span><input type="date" id="f_ndate" value="' + esc(j.next.date || ns.date || '') + '"></div>'
      + '<div class="ff ff-wide"><span class="mini-lbl">ملاحظة</span><input type="text" id="f_nnote" value="' + esc(j.next.note || 'تغيير زيت وفلتر') + '"></div>'
      + '<div class="ff ff-wide"><span class="mini-lbl">الضمان على الشغل</span><input type="text" id="f_war" value="' + esc(v0(j.warranty)) + '" placeholder="مثلاً: 3 شهور على المصنعية"></div></div>'
      + '<p class="hint">فترة الزيت الافتراضية بتتعدل من «الأسعار والإعدادات» — والأصح دايماً حسب كتالوج المركبة ونوع الزيت.</p>'
      + '<button type="button" class="btn btn-accent" data-act="deliver" style="margin-top:10px">' + ic('key') + ' تم التسليم</button>', { form: 'deliver' });
    var upd = function () { var n = C.nextService({ odo: $('f_odoout').value, interval: $('f_int').value, date: today(), months: settings.nextMonths || 6 }); if (n.km) $('f_nkm').value = n.km; };
    $('f_oil').addEventListener('change', function () { $('f_int').value = oilKm(this.value) || ''; upd(); });
    $('f_int').addEventListener('input', upd); $('f_odoout').addEventListener('input', upd);
  }
  function deliver() {
    var j = findJob(); if (!j) return; var v = getVeh(j.vehicleId);
    j.odoOut = $('f_odoout').value.trim(); j.deliveredAt = $('f_dat').value || nowLocal();
    j.next = { km: $('f_nkm').value.trim(), date: $('f_ndate').value, note: $('f_nnote').value.trim(), oil: $('f_oil').value };
    j.warranty = $('f_war').value.trim();
    j.status = 'delivered'; j.statusLog = arr(j.statusLog).concat([{ s: 'delivered', at: new Date().toISOString() }]);
    if (v) { if (C.num(j.odoOut) > C.num(v.odo)) v.odo = j.odoOut; v.oilType = j.next.oil || v.oilType; v.lastService = String(j.deliveredAt).slice(0, 10); v.updatedAt = new Date().toISOString(); }
    touch(j); saveDb(); closeTop(function () { refresh(); toast('اتسلمت ' + vehTitle(v)); });
  }

  // ---------------- التوصيات ----------------
  function openRecSheet(id) {
    var j = findJob(); if (!j) return; var o = id ? j.recs.find(function (x) { return x.id === id; }) || {} : {};
    openSheet('توصية للعميل', '<div class="field"><label for="f_rt">التوصية</label><input type="text" id="f_rt" value="' + esc(v0(o.text)) + '" placeholder="مثلاً: تغيير تيل خلفي قريب"></div>'
      + '<div class="field"><label for="f_rd">إمتى</label><input type="text" id="f_rd" value="' + esc(v0(o.due)) + '" placeholder="بعد 5000 كم / خلال شهر"></div>'
      + '<button type="button" class="btn btn-primary" data-act="saveRec">' + ic('check') + ' حفظ</button>' + (id ? '<button type="button" class="btn btn-danger" data-act="delRec" style="margin-top:10px">' + ic('trash') + ' حذف</button>' : ''), { form: 'rec', rid: id || null });
  }

  // ---------------- خيارات أمر الشغل ----------------
  function openJobMenu() {
    openSheet('خيارات أمر الشغل', '<div class="menu-list">'
      + '<button type="button" class="action-item" data-act="editJobInfo"><span class="a-ic">' + ic('edit') + '</span><span>بيانات أمر الشغل<small>العميل، المركبة، التاريخ، الرقم</small></span></button>'
      + '<button type="button" class="action-item" data-act="openCustOfJob"><span class="a-ic">' + ic('users') + '</span><span>صفحة العميل<small>مركباته وأوامر شغله وكشف الحساب</small></span></button>'
      + '<button type="button" class="action-item" data-act="openVehOfJob"><span class="a-ic">' + ic('car') + '</span><span>ملف المركبة<small>سجل الصيانة والعداد</small></span></button>'
      + '<button type="button" class="action-item" data-act="setStatus" data-v="cancelled"><span class="a-ic orange">' + ic('x') + '</span><span>إلغاء أمر الشغل<small>بيفضل محفوظ ومش بيتحسب</small></span></button>'
      + '<button type="button" class="action-item" data-act="delJob"><span class="a-ic" style="background:var(--danger-soft);color:var(--danger)">' + ic('trash') + '</span><span>حذف أمر الشغل<small>بعد التأكيد</small></span></button></div>', {});
  }
  function openJobInfoSheet() {
    var j = findJob(); if (!j) return; var c = getCust(j.customerId) || {};
    var vs = c.id ? vehsOf(c.id) : [];
    openSheet('بيانات أمر الشغل', '<div class="field"><label for="f_cname">العميل</label><input type="text" id="f_cname" autocomplete="off" value="' + esc(c.name || '') + '"><div id="f_csug"></div></div>'
      + '<div class="field"><label for="f_jveh">المركبة</label><select id="f_jveh">' + opt(vs.map(function (v) { return [v.id, vehTitle(v) + (v.plate ? ' — ' + v.plate : '')]; }), j.vehicleId, '—') + '</select></div>'
      + '<div class="row-2"><div class="field"><label for="f_date">التاريخ</label><input type="date" id="f_date" value="' + esc(j.date || today()) + '"></div><div class="field"><label for="f_num">الرقم</label><input type="text" id="f_num" dir="ltr" value="' + esc(j.number || '') + '"></div></div>'
      + '<button type="button" class="btn btn-primary" data-act="saveJobInfo">' + ic('check') + ' حفظ</button>', { jobId: j.id, custId: c.id || null });
    bindCustSuggest(function () { var cc = S.custId ? getCust(S.custId) : null; $('f_jveh').innerHTML = opt((cc ? vehsOf(cc.id) : []).map(function (v) { return [v.id, vehTitle(v) + (v.plate ? ' — ' + v.plate : '')]; }), '', '—'); });
  }
  function saveJobInfo() {
    var j = getJob(S.jobId); if (!j) return;
    var name = $('f_cname').value.trim(); if (!name) { toast('اكتب اسم العميل'); return; }
    var c = ensureCustomer(name);
    j.customerId = c.id; j.vehicleId = $('f_jveh').value || j.vehicleId; if (j.vehicleId && getVeh(j.vehicleId) && getVeh(j.vehicleId).customerId !== c.id) j.vehicleId = '';
    j.date = $('f_date').value || j.date; j.number = $('f_num').value.trim() || j.number;
    touch(j); saveDb(); closeTop(function () { refresh(); toast('اتحفظ'); });
  }
  function delJob() {
    var j = findJob(); if (!j) return;
    var doIt = function () {
      confirmDlg('حذف أمر الشغل؟', 'هيتمسح أمر الشغل ' + (j.number || '') + ' بكل بنوده ودفعاته، وقطع الغيار اللي من المخزن هترجع للرصيد. مش هينفع ترجّعه.', 'أيوه، امسح').then(function (ok) {
        if (!ok) return;
        db.jobs = db.jobs.filter(function (x) { return x.id !== j.id; }); saveDb();
        closeTop(function () { refresh(); toast('اتمسح أمر الشغل'); });
      });
    };
    if (topLayer() && topLayer().type === 'sheet') closeTop(doIt); else doIt();
  }

  // ====================================================================
  // ملف المركبة
  // ====================================================================
  function openVeh(id) {
    if (!getVeh(id)) return;
    var go = function () { openVehId = id; renderVeh(id); var el = $('vehPage'); raise(el); el.classList.add('open'); el.scrollTop = 0; pushLayer({ type: 'page', hide: function () { el.classList.remove('open'); openVehId = null; } }); };
    if (openVehId) closeTop(go); else go();
  }
  function renderVeh(id) {
    var v = getVeh(id); if (!v) return; var c = getCust(v.customerId);
    var js = jobsOfVeh(id).sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
    var spent = 0; js.forEach(function (j) { if (j.status === 'delivered') spent += J(j).total; });
    var last = js.find(function (j) { return j.status === 'delivered'; }), n = last ? last.next || {} : {};
    var rem = C.reminders(db, today(), 3650).filter(function (x) { return x.vehicleId === id; });
    var info = [['النوع', [(K.CLASSES[v.cls] || K.CLASSES.car).label, v.type].filter(Boolean).join(' · ')], ['الماركة والموديل', [v.make, v.model, v.year].filter(Boolean).join(' ')], ['اللون', v.color], ['الوقود', v.fuel], ['ناقل الحركة', v.trans], ['المحرك', [v.stroke, v.feed, v.engine ? v.engine + ' سي سي' : ''].filter(Boolean).join(' · ')],
      ['رقم الشاسيه', v.vin], ['رقم الموتور', v.engineNo], ['الزيت', (K.OIL_TYPES.find(function (o) { return o[0] === v.oilType; }) || [])[1]], ['الكاوتش', v.tire], ['البطارية', v.battery], ['انتهاء الرخصة', fmtDate(v.licenseExp)], ['انتهاء التأمين', fmtDate(v.insuranceExp)], ['آخر صيانة', fmtDate(v.lastService)]].filter(function (x) { return x[1]; });
    var html = '<div class="pg-head"><button type="button" class="icon-btn" data-act="closeTop" aria-label="رجوع">' + ic('back') + '</button>'
      + '<div class="titles"><h2>' + esc(vehTitle(v)) + '</h2><div class="sub">' + esc([v.plate, c && c.name].filter(Boolean).join(' · ')) + '</div></div>'
      + '<button type="button" class="icon-btn" data-act="editVeh" aria-label="تعديل">' + ic('edit') + '</button></div><div class="container">'
      + '<div class="mini-stats"><div><span>العداد</span><strong>' + esc(v.odo ? fq(v.odo) : '—') + '</strong></div><div><span>أوامر الشغل</span><strong>' + js.length + '</strong></div><div><span>اتصرف عليها</span><strong>' + esc(money(spent)) + '</strong></div></div>'
      + '<button type="button" class="btn btn-accent" data-act="receiveVeh" style="margin:10px 0 12px">' + ic('key') + ' استقبال المركبة دي (أمر شغل جديد)</button>'
      + (n.km || n.date ? '<div class="note" style="margin-bottom:10px">' + ic('bell') + ' الصيانة الجاية: ' + esc([n.km ? fq(n.km) + ' كم' : '', n.date ? fmtDate(n.date) : '', n.note].filter(Boolean).join(' · ')) + '</div>' : '')
      + rem.filter(function (x) { return x.type !== 'service'; }).map(function (x) { return '<div class="warn-box" style="margin-bottom:8px">' + esc(x.note + ': ' + fmtDate(x.date) + (x.overdue ? ' — فات ميعادها' : ' — باقي ' + x.days + ' يوم')) + '</div>'; }).join('')
      + card('بيانات المركبة', vehIcon(v), info.length ? '<div class="sum-list">' + info.map(function (x) { return row(x[0], x[1]); }).join('') + '</div>' : '<p class="card-empty">كمّل البيانات من زرار التعديل</p>') + (v.notes ? '<div class="note" style="margin-bottom:10px">' + esc(v.notes) + '</div>' : '')
      + (c ? '<div class="cust-card" data-act="openCust" data-id="' + esc(c.id) + '"><div class="inv-avatar">' + esc(c.name.charAt(0)) + '</div><div class="inv-info"><div class="n">' + esc(c.name) + '</div><div class="m">' + esc(c.phone || 'صاحب المركبة') + '</div></div><div class="cust-amt ok">' + ic('back') + '</div></div>' : '')
      + '<div class="section-head"><h3>سجل الصيانة <span class="count">' + js.length + '</span></h3></div>'
      + (js.length ? js.map(function (j) { return jobCard(j, 'openJob'); }).join('') : '<div class="home-empty">مفيش أوامر شغل للمركبة دي لسه</div>')
      + '<button type="button" class="btn btn-danger" data-act="delVeh" style="margin-top:14px">' + ic('trash') + ' حذف المركبة</button></div>';
    var el = $('vehPage'), st = el.scrollTop; el.innerHTML = html; el.scrollTop = st;
  }
  function delVeh() {
    var v = getVeh(openVehId); if (!v) return; var n = jobsOfVeh(v.id).length;
    confirmDlg('حذف المركبة؟', n ? 'المركبة ليها ' + n + ' أمر شغل — هيفضلوا محفوظين من غير مركبة.' : 'هتتمسح ' + vehTitle(v) + '.', 'أيوه، امسح').then(function (ok) {
      if (!ok) return;
      db.jobs.forEach(function (j) { if (j.vehicleId === v.id) j.vehicleId = ''; });
      db.vehicles = db.vehicles.filter(function (x) { return x.id !== v.id; }); saveDb();
      closeTop(function () { refresh(); toast('اتمسحت المركبة'); });
    });
  }

  // ====================================================================
  // صفحة العميل
  // ====================================================================
  function openCust(id) {
    if (!getCust(id)) return;
    var go = function () { openCustId = id; renderCust(id); var el = $('custPage'); raise(el); el.classList.add('open'); el.scrollTop = 0; pushLayer({ type: 'page', hide: function () { el.classList.remove('open'); openCustId = null; } }); };
    if (openCustId) closeTop(go); else go();
  }
  function renderCust(id) {
    var c = getCust(id); if (!c) return;
    var js = jobsOf(id).sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
    var tot = 0, paid = 0;
    js.forEach(function (j) { if (j.status === 'cancelled') return; var r = J(j); if (j.status === 'delivered' || j.status === 'ready') tot += r.total; paid += r.paid; });
    var html = '<div class="pg-head"><button type="button" class="icon-btn" data-act="closeTop" aria-label="رجوع">' + ic('back') + '</button>'
      + '<div class="titles"><h2>' + esc(c.name) + '</h2><div class="sub">' + esc([c.ctype, c.phone, c.phone2].filter(Boolean).join(' · ') || 'عميل') + '</div></div>'
      + '<button type="button" class="icon-btn" data-act="editCust" aria-label="تعديل">' + ic('edit') + '</button></div><div class="container">'
      + '<div class="mini-stats"><div><span>الفواتير</span><strong>' + esc(money(tot)) + '</strong></div><div><span>المدفوع</span><strong>' + esc(money(paid)) + '</strong></div><div><span>المستحق</span><strong>' + esc(money(tot - paid)) + '</strong></div></div>'
      + (c.address ? '<div class="note" style="margin:10px 0">' + esc(c.address) + '</div>' : '') + (c.note ? '<div class="note" style="margin-bottom:12px">' + esc(c.note) + '</div>' : '')
      + '<div class="btn-row" style="margin:10px 0">' + (c.phone ? '<a class="btn btn-ghost" href="tel:' + esc(c.phone) + '">' + ic('phone') + ' اتصال</a>' : '') + '<button type="button" class="btn btn-accent" data-act="receiveCust">' + ic('key') + ' استقبال مركبة</button></div>'
      + '<div class="section-head"><h3>المركبات <span class="count">' + vehsOf(id).length + '</span></h3><button type="button" class="link-btn" data-act="newVehicleFor">+ مركبة</button></div>'
      + (vehsOf(id).map(function (v) { return vehCard(v); }).join('') || '<div class="home-empty">مفيش مركبات مسجلة</div>')
      + '<div class="section-head"><h3>أوامر الشغل <span class="count">' + js.length + '</span></h3></div>'
      + (js.map(function (j) { return jobCard(j, 'openJob'); }).join('') || '<div class="home-empty">مفيش أوامر شغل</div>')
      + '<div style="margin-top:14px" data-az-crew="' + SECTION + ':' + esc(c.id) + '" data-sec="' + SECTION_NAME + '" data-name="' + esc(c.name) + '" data-phone="' + esc(c.phone || '') + '" data-address="' + esc(c.address || '') + '" data-rev="' + esc(C.money(tot)) + '" data-paid="' + esc(C.money(paid)) + '" data-cur="' + esc(cur().sym) + '"></div>'
      + '<div class="btn-row" style="margin-top:12px"><button type="button" class="btn btn-primary" data-act="statement">' + ic('receipt') + ' كشف حساب PDF</button><button type="button" class="btn btn-danger" data-act="delCust">' + ic('trash') + ' حذف العميل</button></div></div>';
    var el = $('custPage'), st = el.scrollTop; el.innerHTML = html; el.scrollTop = st;
  }
  function delCust() {
    var c = getCust(openCustId); if (!c) return; var n = jobsOf(c.id).length, nv = vehsOf(c.id).length;
    confirmDlg('حذف العميل؟', 'هيتمسح ' + c.name + (nv ? ' و' + nv + ' مركبة' : '') + (n ? ' و' + n + ' أمر شغل' : '') + '. مش هينفع ترجّعهم.', 'أيوه، امسح').then(function (ok) {
      if (!ok) return;
      db.jobs = db.jobs.filter(function (j) { return j.customerId !== c.id; }); db.vehicles = db.vehicles.filter(function (v) { return v.customerId !== c.id; }); db.customers = db.customers.filter(function (x) { return x.id !== c.id; });
      saveDb(); closeTop(function () { refresh(); toast('اتمسح العميل'); });
    });
  }

  // ====================================================================
  // الأدوات (صفحة واحدة بتتبدل): المخزن، الموردين، المصروفات، الفنيين، التقارير، المواعيد، الحاسبات، كشف الأعطال، الإعدادات
  // ====================================================================
  function openTool(name, o) {
    var prev = tool, prevState = toolState, el = $('toolPage');
    tool = name; toolState = Object.assign({}, o || {});
    renderTool(); if (!prev) raise(el); el.classList.add('open'); el.scrollTop = 0;
    pushLayer({ type: 'page', hide: function () { tool = prev; toolState = prevState; if (!prev) el.classList.remove('open'); else renderTool(); } });
  }
  function toolHead(t, s, extra) { return '<div class="pg-head"><button type="button" class="icon-btn" data-act="closeTop" aria-label="رجوع">' + ic('back') + '</button><div class="titles"><h2>' + esc(t) + '</h2>' + (s ? '<div class="sub">' + esc(s) + '</div>' : '') + '</div>' + (extra || '') + '</div><div class="container">'; }
  function chipsRow(list, cur0, act) { return '<div class="filter-chips">' + list.map(function (x) { return '<button type="button" class="chip' + (cur0 === x[0] ? ' on' : '') + '" data-act="' + act + '" data-v="' + esc(x[0]) + '">' + esc(x[1]) + '</button>'; }).join('') + '</div>'; }
  function renderTool() {
    var el = $('toolPage'), st = el.scrollTop, f = TOOLS[tool]; if (!f) return;
    el.innerHTML = f() + '</div>'; el.scrollTop = st;
    var q = el.querySelector('[data-tq]'); if (q) { q.addEventListener('input', function () { toolState[q.dataset.tq] = q.value; var keep = q.selectionStart; renderTool(); var n = $('toolPage').querySelector('[data-tq]'); if (n) { n.focus(); try { n.setSelectionRange(keep, keep); } catch (e) {} } }); }
    Array.prototype.forEach.call(el.querySelectorAll('[data-cv]'), function (i) { i.addEventListener('input', function () { toolState.vals = toolState.vals || {}; toolState.vals[i.dataset.cv] = i.value; calcLive(); }); });
    Array.prototype.forEach.call(el.querySelectorAll('[data-sk]'), function (i) { i.addEventListener('change', function () { settings[i.dataset.sk] = i.value.trim(); saveSettings(); toast('اتحفظ'); }); });
    Array.prototype.forEach.call(el.querySelectorAll('[data-ok]'), function (i) { i.addEventListener('change', function () { settings.oilKm[i.dataset.ok] = i.value.trim(); saveSettings(); toast('اتحفظ'); }); });
    if (tool === 'calc') calcLive();
  }
  function searchHTML(key, ph) { return '<div class="search-box">' + ic('search') + '<input type="search" data-tq="' + key + '" value="' + esc(toolState[key] || '') + '" placeholder="' + esc(ph) + '" autocomplete="off"></div>'; }

  // ---------------- المخزن ----------------
  function invHTML() {
    var s = C.stock(db), q = (toolState.q || '').trim().toLowerCase(), total = 0, low = 0;
    db.parts.forEach(function (p) { total += s[p.id].value; if (s[p.id].low) low++; });
    var list = db.parts.filter(function (p) {
      if (toolState.low && !s[p.id].low) return false;
      if (toolState.cat && p.cat !== toolState.cat) return false;
      return !q || [p.name, p.pn, p.brand, p.fits, p.cat, p.location].join(' ').toLowerCase().indexOf(q) >= 0;
    }).sort(function (a, b) { return a.name.localeCompare(b.name, 'ar'); });
    var cats = uniq(db.parts.map(function (p) { return p.cat; }));
    return toolHead('قطع الغيار والمخزن', db.parts.length + ' صنف · القيمة ' + money(total))
      + '<div class="btn-row" style="margin-bottom:10px"><button type="button" class="btn btn-accent" data-act="partNew">' + ic('plus') + ' صنف جديد</button><button type="button" class="btn btn-soft" data-act="purchaseNew">' + ic('store') + ' شراء من مورد</button></div>'
      + searchHTML('q', 'دوّر بالاسم أو رقم القطعة أو الماركة أو المركبة')
      + '<div class="filter-chips"><button type="button" class="chip' + (!toolState.low && !toolState.cat ? ' on' : '') + '" data-act="invAll">الكل</button><button type="button" class="chip' + (toolState.low ? ' on' : '') + '" data-act="invLow">ناقص (' + low + ')</button>'
      + cats.map(function (c) { return '<button type="button" class="chip' + (toolState.cat === c ? ' on' : '') + '" data-act="invCat" data-v="' + esc(c) + '">' + esc(c) + '</button>'; }).join('') + '</div>'
      + (list.length ? list.map(function (p) { var x = s[p.id]; return '<div class="mat-row" data-act="partOpen" data-id="' + esc(p.id) + '"><div class="m-info"><div class="m-name">' + esc(p.name) + (x.low ? ' <span class="src-badge warn">ناقص</span>' : '') + '</div><div class="m-meta">' + esc([p.pn, p.brand, p.fits, 'شراء ' + fmt(p.cost), 'بيع ' + fmt(p.price), p.location].filter(Boolean).join(' · ')) + '</div></div><span class="m-qty stock-qty' + (x.qty <= 0 ? ' low' : '') + '">' + fq(x.qty) + '<small>' + esc(p.unit || 'قطعة') + '</small></span></div>'; }).join('')
        : '<div class="home-empty">' + (db.parts.length ? 'مفيش أصناف بالفلترة دي' : 'المخزن فاضي — ضيف أول صنف أو سجّل فاتورة شراء من مورد') + '</div>');
  }
  function partDetailHTML() {
    var p = getPart(toolState.id); if (!p) return toolHead('الصنف') + '<div class="home-empty">الصنف اتمسح</div>';
    var x = C.stock(db)[p.id], ev = [];
    db.purchases.forEach(function (pu) { pu.lines.forEach(function (l) { if (l.partId === p.id) ev.push([pu.date, 'شراء' + (getSup(pu.supplierId) ? ' من ' + getSup(pu.supplierId).name : ''), '+' + fq(l.qty), fmt(l.cost)]); }); });
    db.moves.forEach(function (m) { if (m.partId === p.id) ev.push([m.date, 'تسوية' + (m.note ? ': ' + m.note : ''), (C.num(m.qty) > 0 ? '+' : '') + fq(m.qty), '']); });
    db.jobs.forEach(function (j) { if (j.status === 'cancelled') return; j.parts.forEach(function (l) { if (l.partId === p.id && l.source === 'stock') ev.push([j.date, 'صرف على ' + j.number + ' — ' + custName(j), '-' + fq(l.qty), fmt(l.price)]); }); });
    ev.sort(function (a, b) { return String(b[0]).localeCompare(String(a[0])); });
    return toolHead(p.name, [p.pn, p.brand].filter(Boolean).join(' · '), '<button type="button" class="icon-btn" data-act="partEdit" aria-label="تعديل">' + ic('edit') + '</button>')
      + '<div class="mini-stats"><div><span>الرصيد</span><strong class="stock-qty' + (x.low ? ' low' : '') + '">' + fq(x.qty) + ' ' + esc(p.unit || '') + '</strong></div><div><span>القيمة</span><strong>' + esc(money(x.value)) + '</strong></div><div><span>الحد الأدنى</span><strong>' + esc(p.min ? fq(p.min) : '—') + '</strong></div></div>'
      + '<div class="sum-list" style="margin:10px 0">' + row('رصيد أول المدة', fq(x.open)) + row('مشتريات', '+ ' + fq(x.bought)) + row('تسويات', fq(x.adjust)) + row('اتصرف على أوامر الشغل', '- ' + fq(x.used)) + row('سعر الشراء / البيع', fmt(p.cost) + ' / ' + fmt(p.price))
      + (p.fits ? row('بيركب على', p.fits) : '') + (p.location ? row('مكانه في المخزن', p.location) : '') + (getSup(p.supplierId) ? row('المورد', getSup(p.supplierId).name) : '') + '</div>'
      + '<div class="btn-row"><button type="button" class="btn btn-soft" data-act="partAdjust">' + ic('edit') + ' تسوية الرصيد (جرد / تالف)</button><button type="button" class="btn btn-ghost" data-act="purchaseNew">' + ic('store') + ' شراء</button></div>'
      + card('حركة الصنف', 'history', ev.length ? ev.map(function (e) { return '<div class="tl-row"><span>' + esc(fmtDate(e[0])) + '</span><b>' + esc(e[2] + ' — ' + e[1] + (e[3] ? ' (' + e[3] + ')' : '')) + '</b></div>'; }).join('') : '<p class="card-empty">مفيش حركة لسه</p>')
      + '<button type="button" class="btn btn-danger" data-act="partDel" style="margin-top:10px">' + ic('trash') + ' حذف الصنف</button>';
  }
  function openPartEdit(id) {
    var p = id ? getPart(id) : { unit: 'قطعة' };
    openSheet(id ? 'تعديل الصنف' : 'صنف جديد في المخزن',
      '<div class="field"><label for="f_sn">اسم الصنف</label><input type="text" id="f_sn" value="' + esc(v0(p.name)) + '" placeholder="مثلاً: فلتر زيت تويوتا كورولا"></div>'
      + '<div class="fgrid"><div class="ff"><span class="mini-lbl">رقم القطعة (P/N)</span><input type="text" id="f_spn" dir="ltr" value="' + esc(v0(p.pn)) + '"></div><div class="ff"><span class="mini-lbl">الماركة</span><input type="text" id="f_sb" value="' + esc(v0(p.brand)) + '"></div>'
      + '<div class="ff"><span class="mini-lbl">التصنيف</span><select id="f_sc">' + opt(K.PART_CATS, p.cat || '', '—') + '</select></div><div class="ff"><span class="mini-lbl">الوحدة</span><select id="f_su">' + opt(K.UNITS, p.unit || 'قطعة') + '</select></div>'
      + '<div class="ff ff-wide"><span class="mini-lbl">بيركب على (المركبات المتوافقة)</span><input type="text" id="f_sf" value="' + esc(v0(p.fits)) + '" placeholder="كورولا 2014–2018، يارس"></div>'
      + '<div class="ff"><span class="mini-lbl">رصيد أول المدة</span><input type="text" id="f_so" inputmode="decimal" dir="ltr" value="' + esc(v0(p.open)) + '"></div><div class="ff"><span class="mini-lbl">الحد الأدنى (تنبيه)</span><input type="text" id="f_smin" inputmode="decimal" dir="ltr" value="' + esc(v0(p.min)) + '"></div>'
      + '<div class="ff"><span class="mini-lbl">سعر الشراء</span><input type="text" id="f_scost" inputmode="decimal" dir="ltr" value="' + esc(v0(p.cost)) + '"></div><div class="ff"><span class="mini-lbl">سعر البيع</span><input type="text" id="f_sprice" inputmode="decimal" dir="ltr" value="' + esc(v0(p.price)) + '"></div>'
      + '<div class="ff"><span class="mini-lbl">مكانه (رف / درج)</span><input type="text" id="f_sl" value="' + esc(v0(p.location)) + '"></div><div class="ff"><span class="mini-lbl">المورد</span><select id="f_ssup">' + opt(db.suppliers.map(function (s) { return [s.id, s.name]; }), p.supplierId || '', '—') + '</select></div></div>'
      + '<button type="button" class="btn btn-primary" data-act="partSave">' + ic('check') + ' حفظ</button>', { form: 'stock', partId: id || null });
  }
  function partSave() {
    var name = $('f_sn').value.trim(); if (!name) { toast('اكتب اسم الصنف'); return; }
    var p = S.partId ? getPart(S.partId) : null, isNew = !p;
    if (!p) { p = { id: uid('s'), createdAt: new Date().toISOString() }; db.parts.push(p); }
    Object.assign(p, { name: name, pn: $('f_spn').value.trim(), brand: $('f_sb').value.trim(), cat: $('f_sc').value, unit: $('f_su').value, fits: $('f_sf').value.trim(), open: $('f_so').value.trim(), min: $('f_smin').value.trim(), cost: $('f_scost').value.trim(), price: $('f_sprice').value.trim(), location: $('f_sl').value.trim(), supplierId: $('f_ssup').value, updatedAt: new Date().toISOString() });
    saveDb(); closeTop(function () { refresh(); toast(isNew ? 'اتضاف للمخزن' : 'اتحفظ'); });
  }
  function partInUse(id) { return db.jobs.some(function (j) { return j.parts.some(function (l) { return l.partId === id; }); }) || db.purchases.some(function (pu) { return pu.lines.some(function (l) { return l.partId === id; }); }); }

  // ---------------- الموردين والمشتريات ----------------
  function suppliersHTML() {
    var tot = 0;
    var rows = db.suppliers.map(function (s) { var b = C.supplierBalance(db, s.id); tot += Math.max(b.balance, 0); return '<div class="cust-card" data-act="supOpen" data-id="' + esc(s.id) + '"><div class="inv-avatar">' + esc(s.name.charAt(0)) + '</div><div class="inv-info"><div class="n">' + esc(s.name) + '</div><div class="m">' + esc([s.phone, 'مشتريات ' + money(b.bought)].filter(Boolean).join(' · ')) + '</div></div><div class="cust-amt ' + (b.balance > 0.005 ? 'due' : 'ok') + '">' + esc(money(Math.abs(b.balance))) + '<small>' + (b.balance > 0.005 ? 'عليك' : b.balance < -0.005 ? 'ليك' : 'خالص') + '</small></div></div>'; }).join('');
    return toolHead('الموردين والمشتريات', 'المستحق عليك للموردين: ' + money(tot))
      + '<div class="btn-row" style="margin-bottom:10px"><button type="button" class="btn btn-accent" data-act="purchaseNew">' + ic('receipt') + ' فاتورة شراء</button><button type="button" class="btn btn-soft" data-act="supNew">' + ic('plus') + ' مورد جديد</button></div>'
      + (rows || '<div class="home-empty">لسه مفيش موردين — المورد بيتضاف مع أول فاتورة شراء</div>');
  }
  function supplierHTML() {
    var s = getSup(toolState.id); if (!s) return toolHead('المورد') + '<div class="home-empty">المورد اتمسح</div>';
    var b = C.supplierBalance(db, s.id), ev = [];
    db.purchases.forEach(function (pu) { if (pu.supplierId === s.id) ev.push([pu.date, 'فاتورة شراء ' + (pu.number || '') + ' — ' + pu.lines.length + ' صنف', money(C.purchaseTotal(pu)) + (C.num(pu.paid) ? ' (اتدفع ' + fmt(pu.paid) + ')' : ''), pu.id]); });
    db.spay.forEach(function (p) { if (p.supplierId === s.id) ev.push([p.date, 'دفعة' + (p.note ? ' — ' + p.note : ''), '- ' + money(p.amount), '']); });
    ev.sort(function (a, b2) { return String(b2[0]).localeCompare(String(a[0])); });
    return toolHead(s.name, s.phone || 'مورد', '<button type="button" class="icon-btn" data-act="supEdit" aria-label="تعديل">' + ic('edit') + '</button>')
      + '<div class="mini-stats"><div><span>المشتريات</span><strong>' + esc(money(b.bought)) + '</strong></div><div><span>المدفوع</span><strong>' + esc(money(b.paid)) + '</strong></div><div><span>' + (b.balance < 0 ? 'ليك' : 'عليك') + '</span><strong>' + esc(money(Math.abs(b.balance))) + '</strong></div></div>'
      + '<div class="btn-row" style="margin:10px 0"><button type="button" class="btn btn-accent" data-act="purchaseNew" data-sup="' + esc(s.id) + '">' + ic('receipt') + ' فاتورة شراء</button><button type="button" class="btn btn-soft" data-act="supPay">' + ic('cash') + ' دفعة للمورد</button></div>'
      + card('الحساب', 'history', ev.length ? ev.map(function (e) { return '<div class="tl-row"' + (e[3] ? ' data-act="purchaseEdit" data-id="' + esc(e[3]) + '"' : '') + '><span>' + esc(fmtDate(e[0])) + '</span><b>' + esc(e[1] + ' — ' + e[2]) + '</b></div>'; }).join('') : '<p class="card-empty">مفيش حركة لسه</p>')
      + '<button type="button" class="btn btn-danger" data-act="supDel" style="margin-top:10px">' + ic('trash') + ' حذف المورد</button>';
  }
  function openSupSheet(id) {
    var s = id ? getSup(id) : {};
    openSheet(id ? 'تعديل المورد' : 'مورد جديد', '<div class="field"><label for="f_supn">اسم المورد</label><input type="text" id="f_supn" value="' + esc(v0(s.name)) + '"></div>'
      + '<div class="row-2"><div class="field"><label for="f_supp">التليفون</label><input type="text" id="f_supp" inputmode="tel" dir="ltr" value="' + esc(v0(s.phone)) + '"></div><div class="field"><label for="f_supa">العنوان</label><input type="text" id="f_supa" value="' + esc(v0(s.address)) + '"></div></div>'
      + '<button type="button" class="btn btn-primary" data-act="supSave">' + ic('check') + ' حفظ</button>', { form: 'sup', supId: id || null });
  }
  function ensureSupplier(name) { var n = String(name || '').trim(); if (!n) return null; var s = db.suppliers.find(function (x) { return x.name === n; }); if (!s) { s = { id: uid('sp'), name: n, createdAt: new Date().toISOString() }; db.suppliers.push(s); } return s; }
  function purLinesHTML() {
    return S.lines.map(function (l, i) {
      return '<div class="task-row cols-3"><input type="text" data-li="' + i + '" data-lk="name" list="partNames" value="' + esc(v0(l.name)) + '" placeholder="الصنف"><input type="text" data-li="' + i + '" data-lk="qty" inputmode="decimal" dir="ltr" value="' + esc(v0(l.qty)) + '" placeholder="الكمية"><input type="text" data-li="' + i + '" data-lk="cost" inputmode="decimal" dir="ltr" value="' + esc(v0(l.cost)) + '" placeholder="سعر الوحدة"><button type="button" class="btn btn-ghost btn-icon" data-act="purDelLine" data-i="' + i + '" aria-label="حذف">' + ic('x') + '</button></div>';
    }).join('') + '<datalist id="partNames">' + db.parts.map(function (p) { return '<option value="' + esc(p.name) + '">'; }).join('') + '</datalist>';
  }
  function readPurLines() { Array.prototype.forEach.call(sheet.querySelectorAll('[data-li]'), function (i) { S.lines[+i.dataset.li][i.dataset.lk] = i.value.trim(); }); }
  function purLive() { readPurLines(); var t = C.purchaseTotal({ lines: S.lines.map(function (l) { return { qty: l.qty, cost: l.cost }; }), extra: $('f_pux').value, discount: $('f_pud').value }); $('f_putot').textContent = 'إجمالي الفاتورة: ' + money(t); }
  function openPurchaseSheet(id, supId) {
    var pu = id ? db.purchases.find(function (x) { return x.id === id; }) : null, s = getSup(pu ? pu.supplierId : supId) || {};
    var lines = pu ? pu.lines.map(function (l) { var p = getPart(l.partId); return { name: p ? p.name : l.name || '', qty: l.qty, cost: l.cost }; }) : [{ name: toolState.id && tool === 'part' && getPart(toolState.id) ? getPart(toolState.id).name : '', qty: '', cost: '' }];
    openSheet(id ? 'تعديل فاتورة الشراء' : 'فاتورة شراء من مورد',
      '<div class="field"><label for="f_pus">المورد</label><input type="text" id="f_pus" list="supNames" value="' + esc(v0(s.name)) + '" placeholder="اسم المورد"><datalist id="supNames">' + db.suppliers.map(function (x) { return '<option value="' + esc(x.name) + '">'; }).join('') + '</datalist></div>'
      + '<div class="row-2"><div class="field"><label for="f_pudt">التاريخ</label><input type="date" id="f_pudt" value="' + esc(pu ? pu.date : today()) + '"></div><div class="field"><label for="f_pun">رقم الفاتورة</label><input type="text" id="f_pun" dir="ltr" value="' + esc(pu ? v0(pu.number) : '') + '"></div></div>'
      + '<label class="mini-lbl">الأصناف (الصنف الجديد بيتضاف للمخزن لوحده)</label><div id="f_pul">' + '</div><button type="button" class="btn btn-ghost btn-sm" data-act="purAddLine" style="margin-bottom:10px">' + ic('plus') + ' صنف</button>'
      + '<div class="fgrid"><div class="ff"><span class="mini-lbl">مصاريف (نقل…)</span><input type="text" id="f_pux" inputmode="decimal" dir="ltr" value="' + esc(pu ? v0(pu.extra) : '') + '"></div><div class="ff"><span class="mini-lbl">خصم المورد</span><input type="text" id="f_pud" inputmode="decimal" dir="ltr" value="' + esc(pu ? v0(pu.discount) : '') + '"></div>'
      + '<div class="ff ff-wide"><span class="mini-lbl">المدفوع وقت الشراء (الباقي بيتسجل على حساب المورد)</span><input type="text" id="f_pup" inputmode="decimal" dir="ltr" value="' + esc(pu ? v0(pu.paid) : '') + '"></div></div>'
      + '<div class="line-total" id="f_putot"></div>'
      + '<button type="button" class="btn btn-accent" data-act="purchaseSave" style="margin-top:10px">' + ic('check') + ' حفظ الفاتورة</button>' + (id ? '<button type="button" class="btn btn-danger" data-act="purchaseDel" style="margin-top:10px">' + ic('trash') + ' حذف الفاتورة</button>' : ''),
      { form: 'purchase', purId: id || null, lines: lines });
    $('f_pul').innerHTML = purLinesHTML();
    sheet.addEventListener('input', purInput);
    purLive();
  }
  function purInput(e) { if (S.form !== 'purchase') { sheet.removeEventListener('input', purInput); return; } if (e.target.closest('[data-li]') || e.target.id === 'f_pux' || e.target.id === 'f_pud') purLive(); }
  function purchaseSave() {
    readPurLines();
    var s = ensureSupplier($('f_pus').value); if (!s) { toast('اكتب اسم المورد'); return; }
    var lines = S.lines.filter(function (l) { return l.name && C.num(l.qty) > 0; });
    if (!lines.length) { toast('اكتب صنف واحد على الأقل بالكمية'); return; }
    var out = lines.map(function (l) {
      var p = db.parts.find(function (x) { return x.name === l.name; });
      if (!p) { p = { id: uid('s'), name: l.name, unit: 'قطعة', open: '0', cost: l.cost, price: '', supplierId: s.id, createdAt: new Date().toISOString() }; db.parts.push(p); }
      if (C.num(l.cost)) p.cost = l.cost; if (!p.supplierId) p.supplierId = s.id;
      return { partId: p.id, qty: l.qty, cost: l.cost };
    });
    var pu = S.purId ? db.purchases.find(function (x) { return x.id === S.purId; }) : null;
    if (!pu) { db.pseq = (Number(db.pseq) || 0) + 1; pu = { id: uid('u'), createdAt: new Date().toISOString() }; db.purchases.push(pu); }
    Object.assign(pu, { supplierId: s.id, date: $('f_pudt').value || today(), number: $('f_pun').value.trim() || ('PO-' + pad(db.pseq)), lines: out, extra: $('f_pux').value.trim(), discount: $('f_pud').value.trim(), paid: $('f_pup').value.trim() });
    saveDb(); closeTop(function () { refresh(); toast('اتسجلت فاتورة الشراء — والمخزن زاد'); });
  }

  // ---------------- المصروفات ----------------
  function inPeriod(d, p) {
    var t = today(), s = String(d || '').slice(0, 10); if (p === 'all') return true; if (!s) return false;
    if (p === 'today') return s === t;
    if (p === 'month') return s.slice(0, 7) === t.slice(0, 7);
    if (p === 'last') { var x = new Date(); x.setDate(1); x.setMonth(x.getMonth() - 1); return s.slice(0, 7) === x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0'); }
    if (p === 'year') return s.slice(0, 4) === t.slice(0, 4);
    return true;
  }
  var PERIODS = [['today', 'النهارده'], ['month', 'الشهر ده'], ['last', 'الشهر اللي فات'], ['year', 'السنة دي'], ['all', 'الكل']];
  function expensesHTML() {
    var p = toolState.period || 'month', list = db.expenses.filter(function (e) { return inPeriod(e.date, p); }).sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
    var tot = 0, byCat = {}; list.forEach(function (e) { tot += C.num(e.amount); byCat[e.cat || 'أخرى'] = (byCat[e.cat || 'أخرى'] || 0) + C.num(e.amount); });
    return toolHead('مصروفات الورشة', 'الإجمالي: ' + money(tot))
      + '<button type="button" class="btn btn-accent" data-act="expNew" style="margin-bottom:10px">' + ic('plus') + ' مصروف جديد</button>'
      + chipsRow(PERIODS, p, 'expPeriod')
      + (Object.keys(byCat).length ? '<div class="sum-list" style="margin-bottom:10px">' + Object.keys(byCat).sort(function (a, b) { return byCat[b] - byCat[a]; }).map(function (k) { return row(k, money(byCat[k])); }).join('') + '</div>' : '')
      + (list.length ? list.map(function (e) { return '<div class="mat-row" data-act="expEdit" data-id="' + esc(e.id) + '"><div class="m-info"><div class="m-name">' + esc(e.cat || 'مصروف') + '</div><div class="m-meta">' + esc([fmtDate(e.date), e.note].filter(Boolean).join(' · ')) + '</div></div><span class="m-qty">' + esc(money(e.amount)) + '</span></div>'; }).join('') : '<div class="home-empty">مفيش مصروفات في الفترة دي</div>')
      + '<p class="hint" style="margin-top:10px">مصروفات الورشة العامة (إيجار، كهربا، عدة…) بتتخصم من صافي ربح الشهر. مصاريف أمر شغل معين سجّلها جوه أمر الشغل.</p>';
  }
  function openExpSheet(id) {
    var e = id ? db.expenses.find(function (x) { return x.id === id; }) : { cat: expenseCats()[0] };
    openSheet(id ? 'تعديل مصروف' : 'مصروف جديد', '<div class="field"><label>النوع</label><div class="chips wrap" id="f_ecats">' + expenseCats().map(function (c) { return '<button type="button" class="chip' + (e.cat === c ? ' on' : '') + '" data-act="expCat" data-v="' + esc(c) + '">' + esc(c) + '</button>'; }).join('') + '</div></div>'
      + '<div class="row-2"><div class="field"><label for="f_ea">المبلغ</label><input type="text" id="f_ea" inputmode="decimal" dir="ltr" value="' + esc(v0(e.amount)) + '"></div><div class="field"><label for="f_ed">التاريخ</label><input type="date" id="f_ed" value="' + esc(e.date || today()) + '"></div></div>'
      + '<div class="field"><label for="f_en">ملاحظة</label><input type="text" id="f_en" value="' + esc(v0(e.note)) + '"></div>'
      + '<button type="button" class="btn btn-primary" data-act="expSave">' + ic('check') + ' حفظ</button>' + (id ? '<button type="button" class="btn btn-danger" data-act="expDel" style="margin-top:10px">' + ic('trash') + ' حذف</button>' : ''), { form: 'exp', expId: id || null, cat: e.cat });
  }

  // ---------------- الفنيين ----------------
  function techEarn(w) {
    var e = 0, list = [];
    db.wlog.forEach(function (l) { if (l.workerId === w.id) { e += C.num(l.amount); list.push(['log', l]); } });
    var pct = C.num(w.pct), comm = 0;
    if (pct) db.jobs.forEach(function (j) { if (j.status !== 'delivered') return; var r = J(j); j.labor.forEach(function (l, i) { if (l.tech === w.id) comm += r.labor[i].value * pct / 100; }); });
    var paid = 0, adv = 0; db.wpay.forEach(function (p) { if (p.workerId !== w.id) return; if (p.type === 'advance') adv += C.num(p.amount); else paid += C.num(p.amount); });
    return { logs: C.money(e), comm: C.money(comm), earned: C.money(e + comm), paid: C.money(paid), adv: C.money(adv), balance: C.money(e + comm - paid - adv) };
  }
  function workersHTML() {
    return toolHead('الفنيين', db.workers.length + ' فني')
      + '<button type="button" class="btn btn-accent" data-act="workerNew" style="margin-bottom:10px">' + ic('plus') + ' فني جديد</button>'
      + (db.workers.length ? db.workers.map(function (w) { var x = techEarn(w); return '<div class="cust-card" data-act="workerOpen" data-id="' + esc(w.id) + '"><div class="inv-avatar">' + esc(w.name.charAt(0)) + '</div><div class="inv-info"><div class="n">' + esc(w.name) + '</div><div class="m">' + esc([w.role, C.num(w.daily) ? 'يومية ' + fmt(w.daily) : '', C.num(w.pct) ? fq(w.pct) + '% من المصنعية' : ''].filter(Boolean).join(' · ')) + '</div></div><div class="cust-amt ' + (x.balance > 0.005 ? 'due' : 'ok') + '">' + esc(money(Math.abs(x.balance))) + '<small>' + (x.balance > 0.005 ? 'ليه' : x.balance < -0.005 ? 'عليه' : 'خالص') + '</small></div></div>'; }).join('') : '<div class="home-empty">ضيف الفنيين علشان تحسب يومياتهم أو نسبتهم من المصنعية، وتسجل السلف والقبض</div>');
  }
  function workerHTML() {
    var w = byId('workers', toolState.id); if (!w) return toolHead('الفني') + '<div class="home-empty">اتمسح</div>';
    var x = techEarn(w), ev = [];
    db.wlog.forEach(function (l) { if (l.workerId === w.id) ev.push([l.date, (l.kind || 'شغل') + (l.jobId && getJob(l.jobId) ? ' — ' + getJob(l.jobId).number : '') + (l.note ? ' — ' + l.note : ''), '+ ' + money(l.amount), 'wlogDel', l.id]); });
    db.wpay.forEach(function (p) { if (p.workerId === w.id) ev.push([p.date, (p.type === 'advance' ? 'سلفة' : 'قبض') + (p.note ? ' — ' + p.note : ''), '- ' + money(p.amount), 'wpayDel', p.id]); });
    ev.sort(function (a, b) { return String(b[0]).localeCompare(String(a[0])); });
    return toolHead(w.name, [w.role, w.phone].filter(Boolean).join(' · '), '<button type="button" class="icon-btn" data-act="workerEdit" aria-label="تعديل">' + ic('edit') + '</button>')
      + '<div class="mini-stats"><div><span>اللي ليه</span><strong>' + esc(money(x.earned)) + '</strong></div><div><span>قبض + سلف</span><strong>' + esc(money(x.paid + x.adv)) + '</strong></div><div><span>' + (x.balance < 0 ? 'عليه' : 'الباقي ليه') + '</span><strong>' + esc(money(Math.abs(x.balance))) + '</strong></div></div>'
      + (x.comm ? '<p class="hint" style="margin-top:8px">منهم ' + esc(money(x.comm)) + ' نسبة ' + fq(w.pct) + '% من مصنعية أوامر الشغل اللي اتسلمت وعليها اسمه.</p>' : '')
      + '<div class="btn-row" style="margin:10px 0"><button type="button" class="btn btn-accent" data-act="wlogNew">' + ic('plus') + ' يومية / شغل</button><button type="button" class="btn btn-soft" data-act="wpayNew">' + ic('cash') + ' قبض / سلفة</button></div>'
      + card('الحساب', 'history', ev.length ? ev.map(function (e) { return '<div class="tl-row"><span>' + esc(fmtDate(e[0])) + '</span><b style="flex:1">' + esc(e[2] + ' — ' + e[1]) + '</b><button type="button" class="chip-x" data-act="' + e[3] + '" data-id="' + esc(e[4]) + '" aria-label="حذف">×</button></div>'; }).join('') : '<p class="card-empty">مفيش حركة لسه</p>')
      + '<button type="button" class="btn btn-danger" data-act="workerDel" style="margin-top:10px">' + ic('trash') + ' حذف الفني</button>';
  }
  function openWorkerSheet(id) {
    var w = id ? byId('workers', id) : {};
    openSheet(id ? 'تعديل الفني' : 'فني جديد', '<div class="field"><label for="f_wn">الاسم</label><input type="text" id="f_wn" value="' + esc(v0(w.name)) + '"></div>'
      + '<div class="row-2"><div class="field"><label for="f_wr">التخصص</label><input type="text" id="f_wr" list="roles" value="' + esc(v0(w.role)) + '"><datalist id="roles"><option value="ميكانيكي"><option value="كهربائي"><option value="فني حقن وتشخيص"><option value="سمكري"><option value="دوكو"><option value="كاوتش"><option value="صبي"></datalist></div><div class="field"><label for="f_wp">التليفون</label><input type="text" id="f_wp" inputmode="tel" dir="ltr" value="' + esc(v0(w.phone)) + '"></div></div>'
      + '<div class="row-2"><div class="field"><label for="f_wd">اليومية</label><input type="text" id="f_wd" inputmode="decimal" dir="ltr" value="' + esc(v0(w.daily)) + '"></div><div class="field"><label for="f_wpct">نسبة من المصنعية %</label><input type="text" id="f_wpct" inputmode="decimal" dir="ltr" value="' + esc(v0(w.pct)) + '"></div></div>'
      + '<button type="button" class="btn btn-primary" data-act="workerSave">' + ic('check') + ' حفظ</button>', { form: 'worker', wid: id || null });
  }

  // ---------------- التقارير ----------------
  function reportsHTML() {
    var p = toolState.period || 'month', R = { n: 0, revenue: 0, labor: 0, parts: 0, partsCost: 0, outside: 0, costs: 0, profit: 0, tax: 0 }, svc = {}, sys = {}, prt = {}, cls = {}, mk = {}, tech = {};
    db.jobs.forEach(function (j) {
      if (j.status !== 'delivered' || !inPeriod(j.deliveredAt || j.date, p)) return;
      var r = J(j), v = getVeh(j.vehicleId) || {};
      R.n++; R.revenue += r.total - r.tax; R.labor += r.laborTotal; R.parts += r.partsSell; R.partsCost += r.partsCost; R.outside += r.outsideSell; R.costs += r.totalCost; R.profit += r.profit; R.tax += r.tax;
      j.labor.forEach(function (l, i) { var x = r.labor[i].value; svc[l.name] = svc[l.name] || [0, 0]; svc[l.name][0]++; svc[l.name][1] += x; sys[l.system || 'other'] = (sys[l.system || 'other'] || 0) + x; if (l.tech) tech[l.tech] = (tech[l.tech] || 0) + x; });
      j.parts.forEach(function (l, i) { if (l.source === 'customer') return; prt[l.name] = prt[l.name] || [0, 0]; prt[l.name][0] += C.num(l.qty); prt[l.name][1] += r.parts[i].sell; });
      var k = (K.CLASSES[v.cls] || K.CLASSES.car).label; cls[k] = cls[k] || [0, 0]; cls[k][0]++; cls[k][1] += r.total;
      if (v.make) { mk[v.make] = mk[v.make] || [0, 0]; mk[v.make][0]++; mk[v.make][1] += r.total; }
    });
    var exp = db.expenses.filter(function (e) { return inPeriod(e.date, p); }).reduce(function (s, e) { return s + C.num(e.amount); }, 0);
    var col = 0; db.jobs.forEach(function (j) { j.payments.forEach(function (x) { if (inPeriod(x.date, p)) col += C.num(x.amount); }); });
    var d = C.dashboard(db, ctx(), today());
    var top = function (o, n, f) { return Object.keys(o).map(function (k) { return [k, o[k]]; }).sort(function (a, b) { return (Array.isArray(b[1]) ? b[1][1] : b[1]) - (Array.isArray(a[1]) ? a[1][1] : a[1]); }).slice(0, n || 8).map(f).join(''); };
    return toolHead('تقارير الورشة', 'أوامر الشغل اللي اتسلمت في الفترة') + chipsRow(PERIODS, p, 'repPeriod')
      + card('الملخص', 'chart', '<div class="sum-list">' + row('أوامر شغل اتسلمت', String(R.n)) + row('الإيراد (من غير الضريبة)', money(R.revenue)) + row('المصنعية', money(R.labor)) + row('قطع الغيار (بيع)', money(R.parts)) + row('قطع الغيار (تكلفة)', money(R.partsCost))
        + (R.outside ? row('أعمال خارجية', money(R.outside)) : '') + row('إجمالي التكاليف', money(R.costs)) + '<div class="sum-row profit' + (R.profit < 0 ? ' neg' : '') + '"><span>ربح أوامر الشغل</span><strong dir="ltr">' + esc(money(R.profit)) + '</strong></div>'
        + row('مصروفات الورشة', '- ' + money(exp)) + '<div class="sum-row profit' + (R.profit - exp < 0 ? ' neg' : '') + '"><span>صافي الربح</span><strong dir="ltr">' + esc(money(R.profit - exp)) + '</strong></div>'
        + (R.tax ? row('ضرايب اتحصلت', money(R.tax)) : '') + row('التحصيل في الفترة', money(col)) + row('مستحقات العملاء (دلوقتي)', money(d.dues)) + row('أرصدة الموردين (دلوقتي)', money(d.suppliersDue)) + row('قيمة المخزن (دلوقتي)', money(d.stockValue)) + '</div>')
      + (Object.keys(svc).length ? card('أكتر الخدمات', 'wrench', '<div class="sum-list">' + top(svc, 10, function (x) { return row(x[0] + ' (' + x[1][0] + ')', money(x[1][1])); }) + '</div>') : '')
      + (Object.keys(sys).length ? card('المصنعية حسب النظام', 'engine', '<div class="sum-list">' + top(sys, 12, function (x) { return row(sysName(x[0]), money(x[1])); }) + '</div>') : '')
      + (Object.keys(prt).length ? card('أكتر قطع الغيار مبيعاً', 'box', '<div class="sum-list">' + top(prt, 10, function (x) { return row(x[0] + ' × ' + fq(x[1][0]), money(x[1][1])); }) + '</div>') : '')
      + (Object.keys(cls).length ? card('حسب نوع المركبة', 'car', '<div class="sum-list">' + top(cls, 3, function (x) { return row(x[0] + ' (' + x[1][0] + ')', money(x[1][1])); }) + '</div>') : '')
      + (Object.keys(mk).length ? card('حسب الماركة', 'tag', '<div class="sum-list">' + top(mk, 8, function (x) { return row(x[0] + ' (' + x[1][0] + ')', money(x[1][1])); }) + '</div>') : '')
      + (Object.keys(tech).length ? card('مصنعية كل فني', 'users', '<div class="sum-list">' + top(tech, 10, function (x) { var w = byId('workers', x[0]); return row(w ? w.name : 'فني', money(x[1])); }) + '</div>') : '')
      + (R.n ? '' : '<div class="home-empty">مفيش أوامر شغل اتسلمت في الفترة دي</div>');
  }

  // ---------------- مواعيد الصيانة ----------------
  function waLink(phone, text) { var p = String(phone || '').replace(/[^\d+]/g, ''); if (/^0\d{10}$/.test(p)) p = '2' + p; p = p.replace(/^\+/, ''); return 'https://wa.me/' + p + '?text=' + encodeURIComponent(text); }
  function remindersHTML() {
    var days = toolState.days || 30, list = C.reminders(db, today(), days);
    var biz = (window.ArzaqiInvoice && ArzaqiInvoice.bizInfo ? ArzaqiInvoice.bizInfo(loadJSON('arzaqi_profile_v1', {}), settings.business) : settings.business) || {};
    return toolHead('مواعيد الصيانة', list.length + ' ميعاد في ' + days + ' يوم (والمتأخر)') + chipsRow([[30, '30 يوم'], [60, '60 يوم'], [90, '90 يوم'], [365, 'سنة']].map(function (x) { return [String(x[0]), x[1]]; }), String(days), 'remDays')
      + (list.length ? list.map(function (x) {
        var v = getVeh(x.vehicleId) || {}, c = getCust(v.customerId) || {};
        var what = x.type === 'service' ? 'الصيانة الجاية' + (x.note ? ' (' + x.note + ')' : '') : x.note;
        var when = [x.km ? 'عند ' + fq(x.km) + ' كم' : '', x.date ? 'يوم ' + fmtDate(x.date) : ''].filter(Boolean).join(' أو ');
        var msg = 'أهلاً ' + (c.name || '') + '، بنفكّرك بميعاد ' + what + ' لـ ' + vehTitle(v) + (v.plate ? ' (' + v.plate + ')' : '') + (when ? ' ' + when : '') + '.' + (biz.name ? ' — ' + biz.name : '') + (biz.phone ? ' ' + biz.phone : '');
        return '<div class="card" style="margin-bottom:10px"><div class="veh-mini" style="margin-bottom:6px">' + plateHTML(v) + '<b>' + esc(vehTitle(v)) + '</b><span>' + esc(c.name || '') + '</span></div>'
          + '<div class="m-name" style="font-weight:900">' + esc(what) + '</div><div class="hint" style="margin:2px 0 8px">' + esc(when || 'من غير تاريخ') + (x.days != null ? (x.overdue ? ' — فات ميعادها من ' + Math.abs(x.days) + ' يوم' : ' — باقي ' + x.days + ' يوم') : '') + '</div>'
          + '<div class="btn-row">' + (c.phone ? '<a class="btn btn-ghost btn-sm wa-btn" target="_blank" rel="noopener" href="' + esc(waLink(c.phone2 || c.phone, msg)) + '">' + ic('chat') + ' واتساب</a><a class="btn btn-ghost btn-sm" href="tel:' + esc(c.phone) + '">' + ic('phone') + ' اتصال</a>' : '') + '<button type="button" class="btn btn-ghost btn-sm" data-act="openVeh" data-id="' + esc(v.id) + '">' + ic('car') + ' المركبة</button></div></div>';
      }).join('') : '<div class="home-empty">مفيش مواعيد قريبة. الميعاد بيتسجل لما تسلّم المركبة («الصيانة الجاية»)، والرخصة والتأمين من ملف المركبة.</div>');
  }

  // ---------------- الحاسبات المستقلة ----------------
  var CALCS = {
    tire: { t: 'مقاس الكاوتش', f: [['a', 'المقاس الحالي', '205/55R16'], ['b', 'مقاس تاني للمقارنة (اختياري)', '215/55R17']], run: function (v) {
      var a = C.parseTire(v.a), b = C.parseTire(v.b); if (!a) return [['اكتب المقاس زي', '205/55R16']];
      var x = C.tire(a.w, a.ar, a.rim), out = [['جنب الكاوتش', x.sidewall + ' مم'], ['القطر', x.diameter + ' مم'], ['المحيط', x.circumference + ' مم'], ['لفات في الكيلو', fq(x.revsPerKm)]];
      if (b) { var y = C.tire(b.w, b.ar, b.rim), cmp = C.tireCompare(x, y); out.push(['قطر المقاس التاني', y.diameter + ' مم'], ['الفرق', cmp.diffPct + '%'], ['العداد يقول 100 والسرعة الحقيقية', cmp.at100 + ' كم/س']); if (Math.abs(cmp.diffPct) > 3) out.push(['⚠ تنبيه', 'فرق أكتر من 3% بيأثر على العداد والـ ABS']); }
      return out; } },
    fuel: { t: 'استهلاك البنزين', f: [['km', 'المسافة (كم)', '400'], ['l', 'اللترات', '32'], ['p', 'سعر اللتر (اختياري)', '']], run: function (v) { var x = C.fuel(v.km, v.l, v.p); return x ? [['لتر / 100 كم', x.l100], ['كم / لتر', x.kml]].concat(x.cost ? [['تكلفة الكيلو', x.costKm + ' ' + cur().sym], ['التكلفة', money(x.cost)]] : []) : []; } },
    cc: { t: 'سعة المحرك', f: [['b', 'قطر السلندر (مم)', '86'], ['s', 'المشوار (مم)', '86'], ['n', 'عدد السلندرات', '4']], run: function (v) { var x = C.cc(v.b, v.s, v.n); return x ? [['السعة', fq(x) + ' سي سي'], ['باللتر', fq(C.round(x / 1000, 2)) + ' لتر']] : []; } },
    cr: { t: 'نسبة الانضغاط', f: [['s', 'حجم السلندر الواحد (سي سي)', '500'], ['c', 'حجم غرفة الاحتراق (سي سي)', '50']], run: function (v) { var x = C.cr(v.s, v.c); return x ? [['نسبة الانضغاط', x + ' : 1']] : []; } },
    mix: { t: 'خلط زيت 2T', f: [['l', 'البنزين (لتر)', '5'], ['r', 'النسبة (1 : ؟)', '50']], run: function (v) { var x = C.mix(v.l, v.r); return x ? [['الزيت', fq(x) + ' مل'], ['ملحوظة', 'التزم بنسبة كتالوج الموتوسيكل']] : []; } },
    coolant: { t: 'خلط مياه الردياتير', f: [['c', 'سعة الدورة (لتر)', '6'], ['p', 'نسبة مانع التجمد %', '50']], run: function (v) { var x = C.coolant(v.c, v.p); return x ? [['مانع التجمد', x.antifreeze + ' لتر'], ['مياه مقطرة', x.water + ' لتر']] : []; } },
    oilDue: { t: 'ميعاد تغيير الزيت', f: [['o', 'العداد دلوقتي (كم)', '45000'], ['i', 'كل كام كيلو', '5000'], ['m', 'أو كل كام شهر', '6']], run: function (v) { var x = C.nextService({ odo: v.o, interval: v.i, date: today(), months: v.m }); return [['الزيت الجاي عند', x.km ? fq(x.km) + ' كم' : '—'], ['أو يوم', fmtDate(x.date) || '—']]; } },
    speed: { t: 'السرعة من العزم والتروس', f: [['r', 'لفات الموتور (RPM)', '3000'], ['g', 'نسبة الترس', '1.0'], ['f', 'نسبة الدفرنس', '4.0'], ['t', 'مقاس الكاوتش', '205/55R16']], run: function (v) { var t = C.parseTire(v.t), d = t ? C.tire(t.w, t.ar, t.rim).diameter : 0; var x = C.speed(v.r, v.g, v.f, d); return x ? [['السرعة', x + ' كم/س']] : (t ? [] : [['اكتب مقاس الكاوتش', '205/55R16']]); } },
    ohm: { t: 'قانون أوم والقدرة', f: [['v', 'الجهد (فولت)', '12'], ['i', 'التيار (أمبير)', ''], ['r', 'المقاومة (أوم)', '4']], run: function (v) { var x = C.ohm(v); return x ? [['الجهد', x.v + ' فولت'], ['التيار', x.i + ' أمبير'], ['المقاومة', x.r + ' أوم'], ['القدرة', x.p + ' وات']] : [['اكتب أي اتنين', 'من التلاتة']]; } },
    units: { t: 'تحويل الوحدات', f: [['v', 'القيمة', '32'], ['k', 'التحويل', 'psi_bar', Object.keys(C.UNIT_CONV).map(function (k) { return [k, C.UNIT_CONV[k][1] + ' ← ' + C.UNIT_CONV[k][2]]; }).concat([['c_f', '°م ← °ف'], ['f_c', '°ف ← °م']])]], run: function (v) { var k = v.k || 'psi_bar', u = C.UNIT_CONV[k]; return [['النتيجة', fq(C.convert(k, v.v)) + ' ' + (u ? u[2] : k === 'c_f' ? '°ف' : '°م')]]; } },
    labor: { t: 'تسعير المصنعية', f: [['h', 'عدد الساعات', '2.5'], ['r', 'سعر الساعة', String(C.num(settings.laborRate) || '')], ['m', 'هامش إضافي %', '0']], run: function (v) { var x = C.laborQuote(v.h, v.r || settings.laborRate, v.m); return [['المصنعية', money(x.base)], ['بعد الهامش', money(x.total)]]; } },
    price: { t: 'تسعير قطعة غيار', f: [['c', 'سعر الشراء', '100'], ['p', 'النسبة %', '25'], ['m', 'الطريقة', 'markup', [['markup', 'نسبة على التكلفة'], ['margin', 'هامش من سعر البيع']]]], run: function (v) { var x = C.priceFrom(v.c, v.p, v.m || 'markup'); return x ? [['سعر البيع', money(x.sell)], ['الربح', money(x.profit)], ['هامش من البيع', x.margin + '%'], ['نسبة على التكلفة', x.markup + '%']] : []; } },
    dtc: { t: 'معنى كود العطل', f: [['c', 'الكود', 'P0300']], run: function (v) { var d = C.dtc(v.c, K); if (!v.c) return []; if (!d) return [['الكود غلط', 'حرف + 4 أرقام زي P0420']]; return [['النظام', d.family], ['النوع', d.generic ? 'كود عام' : 'خاص بالشركة المصنعة']].concat(d.sub ? [['الجزء', d.sub]] : []).concat([['المعنى', d.desc || 'مش في القايمة — راجع كتالوج الشركة']]); } }
  };
  function calcsHTML() {
    return toolHead('الحاسبات', K.TOOLS.length + ' حاسبة') + '<div class="type-tiles">' + K.TOOLS.map(function (t) { return '<button type="button" class="t-tile" data-act="calcOpen" data-v="' + t[0] + '"><span class="q-ic">' + ic(t[3]) + '</span><b>' + esc(t[1]) + '</b><small>' + esc(t[2]) + '</small></button>'; }).join('') + '</div>';
  }
  function calcHTML() {
    var c = CALCS[toolState.id]; if (!c) return toolHead('حاسبة');
    var vals = toolState.vals || {};
    return toolHead(c.t) + '<div class="card"><div class="fgrid">' + c.f.map(function (f) {
      var v = vals[f[0]] != null ? vals[f[0]] : (f[3] ? f[2] : '');
      return '<div class="ff' + (c.f.length === 1 || f[3] ? ' ff-wide' : '') + '"><span class="mini-lbl">' + esc(f[1]) + '</span>' + (f[3] ? '<select data-cv="' + f[0] + '">' + opt(f[3], v) + '</select>' : '<input type="text" data-cv="' + f[0] + '" dir="ltr" value="' + esc(v) + '" placeholder="' + esc(f[2]) + '">') + '</div>';
    }).join('') + '</div><div class="sum-list" id="calcOut"></div></div>';
  }
  function calcLive() {
    var c = CALCS[toolState.id], out = $('calcOut'); if (!c || !out) return;
    var v = {}; c.f.forEach(function (f) { v[f[0]] = (toolState.vals || {})[f[0]] != null ? toolState.vals[f[0]] : (f[3] ? f[2] : ''); });
    var rows = c.run(v) || [];
    out.innerHTML = rows.length ? rows.map(function (r) { return row(r[0], String(r[1])); }).join('') : '<p class="card-empty">اكتب الأرقام</p>';
  }

  // ---------------- كشف الأعطال (الأعراض + الأكواد) ----------------
  function diagHTML() {
    var i = toolState.sym, s = K.SYMPTOMS[i];
    if (s) return toolHead(s[0], sysName(s[1])) + '<p class="hint">أماكن تبدأ تفحصها — مش تشخيص نهائي:</p>' + s[2].map(function (c, k) { return '<div class="cause-row"><span>' + (k + 1) + '. ' + esc(c) + '</span></div>'; }).join('')
      + '<button type="button" class="btn btn-ghost" data-act="diagBack" style="margin-top:12px">' + ic('back') + ' كل الأعراض</button>';
    var q = (toolState.q || '').trim(), code = (toolState.code || '').trim();
    return toolHead('كشف أعطال', 'الأعراض وأكواد OBD-II')
      + '<div class="card"><div class="card-title"><span class="t-ic">' + ic('alert') + '</span><h2>معنى كود الكمبيوتر</h2></div><input type="text" id="f_dtcq" dir="ltr" value="' + esc(code) + '" placeholder="P0300" autocapitalize="characters"><div id="f_dtcr" style="margin-top:10px">' + dtcBoxHTML(code) + '</div></div>'
      + searchHTML('q', 'دوّر في الأعراض: سخونية، دخان، رعشة، فرامل…')
      + '<div class="menu-list sym-list">' + K.SYMPTOMS.map(function (x, k) { return [x, k]; }).filter(function (p) { return !q || (p[0][0] + ' ' + p[0][2].join(' ')).indexOf(q) >= 0; }).map(function (p) { return '<button type="button" class="action-item" data-act="diagSym" data-i="' + p[1] + '"><span class="a-ic">' + ic('alert') + '</span><span>' + esc(p[0][0]) + '<small>' + esc(sysName(p[0][1])) + '</small></span></button>'; }).join('') + '</div>';
  }

  // ---------------- الأسعار والإعدادات ----------------
  function customList(key, title, addPh) {
    return '<div class="chips wrap" style="margin-bottom:8px">' + arr(settings[key]).map(function (v) { return '<span class="chip static">' + esc(typeof v === 'string' ? v : v.name) + ' <button type="button" class="chip-x" data-act="delCustom" data-k="' + key + '" data-v="' + esc(typeof v === 'string' ? v : v.name) + '">×</button></span>'; }).join('') + '</div>'
      + '<div class="row-2"><input type="text" id="f_new_' + key + '" placeholder="' + esc(addPh) + '"><button type="button" class="btn btn-soft" data-act="addCustom" data-k="' + key + '">' + ic('plus') + ' إضافة</button></div>';
  }
  function settingsHTML() {
    var sp = Object.keys(settings.servicePrices);
    return toolHead('الأسعار والإعدادات', 'بتتحفظ لوحدها')
      + card('المصنعية والضريبة', 'cash', '<div class="fgrid"><div class="ff"><span class="mini-lbl">سعر ساعة المصنعية</span><input type="text" data-sk="laborRate" inputmode="decimal" dir="ltr" value="' + esc(v0(settings.laborRate)) + '"></div>'
        + '<div class="ff"><span class="mini-lbl">الضريبة الافتراضية %</span><input type="text" data-sk="taxPct" inputmode="decimal" dir="ltr" value="' + esc(v0(settings.taxPct)) + '" placeholder="فاضي = من غير"></div>'
        + '<div class="ff"><span class="mini-lbl">بداية رقم أمر الشغل</span><input type="text" data-sk="prefix" dir="ltr" value="' + esc(v0(settings.prefix)) + '" placeholder="WO"></div>'
        + '<div class="ff"><span class="mini-lbl">الصيانة الجاية بعد (شهور)</span><input type="text" data-sk="nextMonths" inputmode="decimal" dir="ltr" value="' + esc(v0(settings.nextMonths)) + '" placeholder="6"></div></div>')
      + card('فترات تغيير الزيت (كم)', 'oil', '<p class="hint" style="margin-top:-4px">قيم افتراضية — الأصح حسب كتالوج المركبة ونوع الزيت.</p><div class="fgrid">' + K.OIL_TYPES.filter(function (o) { return o[0] !== 'custom'; }).map(function (o) { return '<div class="ff"><span class="mini-lbl">' + esc(o[1]) + '</span><input type="text" data-ok="' + o[0] + '" inputmode="decimal" dir="ltr" value="' + esc(v0(settings.oilKm[o[0]])) + '" placeholder="' + o[2] + '"></div>'; }).join('') + '</div>')
      + card('خدمات خاصة بيك', 'wrench', customList('services', 'الخدمات', 'اسم الخدمة (مثلاً: تركيب شاشة)'))
      + card('أسعار الخدمات المحفوظة', 'tag', sp.length ? sp.map(function (k) { var x = settings.servicePrices[k]; return '<div class="mat-row"><div class="m-info"><div class="m-name">' + esc(k) + '</div><div class="m-meta">' + esc(x.mode === 'fixed' ? 'مبلغ ' + fmt(x.amount) : fq(x.hours) + ' ساعة') + '</div></div><button type="button" class="chip-x" data-act="delSvcPrice" data-v="' + esc(k) + '">×</button></div>'; }).join('') : '<p class="card-empty">السعر بيتحفظ لوحده أول ما تستخدم الخدمة في أمر شغل</p>')
      + card('كشف الاستلام: بنود زيادة', 'clipboard', customList('checkin', '', 'مثلاً: كاميرا خلفية'))
      + card('طرق الدفع', 'cash', customList('payMethods', '', 'مثلاً: فوري'))
      + card('أنواع المصروفات', 'wallet', customList('expenseCats', '', 'مثلاً: إنترنت'));
  }

  var TOOLS = { inventory: invHTML, part: partDetailHTML, suppliers: suppliersHTML, supplier: supplierHTML, expenses: expensesHTML, workers: workersHTML, worker: workerHTML,
    reports: reportsHTML, reminders: remindersHTML, calcs: calcsHTML, calc: calcHTML, diag: diagHTML, settings: settingsHTML };

  // ====================================================================
  // المستندات (نفس فاتورة أرزقي الموحدة)
  // ====================================================================
  function business() { var b = settings.business || {}; return { name: b.name || '', trade: 'ميكانيكا وصيانة المركبات', phone: b.phone || '', address: b.address || '', logo: b.logo || '' }; }
  function clientOf(j) { var c = getCust(j.customerId) || {}; return { name: c.name || '', phone: [c.phone, c.phone2].filter(Boolean).join(' / '), address: c.address || '', note: c.note || '' }; }
  function vehFieldsOf(j, out) {
    var v = getVeh(j.vehicleId) || {};
    return [{ label: 'المركبة', value: vehTitle(v) }, { label: 'اللوحة', value: v.plate || '' }, { label: 'العداد', value: (out && j.odoOut ? fq(j.odoOut) : j.odoIn ? fq(j.odoIn) : '') + (j.odoIn || j.odoOut ? ' كم' : '') }, { label: 'الشاسيه', value: v.vin || '' }];
  }
  function tbl(head, rows, empty) { return '<table class="p-table"><thead><tr>' + head.map(function (h) { return '<th>' + h + '</th>'; }).join('') + '</tr></thead><tbody>' + (rows || '<tr><td colspan="' + head.length + '">' + (empty || '—') + '</td></tr>') + '</tbody></table>'; }
  function sec(n, t) { return '<div class="inv-sec"><span class="n">' + n + '</span> ' + t + '</div>'; }
  function notesBlock(title, list) { list = list.map(function (s) { return String(s || '').trim(); }).filter(Boolean); return list.length ? '<div class="inv-notes"><h4>' + title + '</h4>' + list.map(function (x) { return '<div>' + ArzaqiInvoice.esc(x).replace(/\n/g, '<br>') + '</div>'; }).join('') + '</div>' : ''; }
  function jobDocHTML(j, doc) {
    var r = J(j), A = window.ArzaqiInvoice, cc = cur(), n = 0, body = '', est = doc === 'estimate';
    if (est && j.findings.length) {
      n++; body += sec(n, 'نتيجة الفحص') + tbl(['م', 'العطل', 'النظام', 'الخطورة'], j.findings.map(function (f, i) { var sv = K.SEVERITY.find(function (s) { return s[0] === f.sev; }) || K.SEVERITY[0]; return '<tr><td class="idx">' + (i + 1) + '</td><td class="t">' + A.esc(f.desc || '') + (f.code ? '<span class="sub-note">' + A.esc(f.code) + '</span>' : '') + '</td><td>' + A.esc(sysName(f.system)) + '</td><td>' + A.esc(sv[1]) + '</td></tr>'; }).join(''));
    }
    if (j.labor.length) { n++; body += sec(n, 'المصنعية والخدمات') + tbl(['م', 'الخدمة', 'الساعات', 'السعر', 'الإجمالي'], j.labor.map(function (l, i) { var x = r.labor[i]; return '<tr><td class="idx">' + (i + 1) + '</td><td class="t">' + A.esc(l.name) + '<span class="sub-note">' + A.esc(sysName(l.system)) + '</span></td><td>' + (l.mode === 'hours' ? fq(x.hours) : '—') + '</td><td class="money">' + (l.mode === 'hours' ? money(x.rate) : '—') + '</td><td class="money">' + money(x.value) + '</td></tr>'; }).join('')); }
    if (j.parts.length) { n++; body += sec(n, 'قطع الغيار') + tbl(['م', 'القطعة', 'الكمية', 'سعر الوحدة', 'الإجمالي'], j.parts.map(function (p, i) { var x = r.parts[i]; return '<tr><td class="idx">' + (i + 1) + '</td><td class="t">' + A.esc(p.name) + (p.pn || p.warranty ? '<span class="sub-note">' + A.esc([p.pn, p.warranty ? 'ضمان ' + p.warranty : ''].filter(Boolean).join(' · ')) + '</span>' : '') + '</td><td>' + fq(x.qty) + '</td><td class="money">' + (x.own ? 'من العميل' : money(p.price)) + '</td><td class="money">' + (x.own ? '—' : money(x.sell)) + '</td></tr>'; }).join('')); }
    var ext = j.outside.map(function (o) { return '<tr><td class="t">' + A.esc(o.name) + '</td><td class="money">' + money(C.num(o.price)) + '</td></tr>'; }).concat(j.costs.filter(function (k) { return k.billed; }).map(function (k) { return '<tr><td class="t">' + A.esc(k.name || 'مصروف') + '</td><td class="money">' + money(C.num(k.amount)) + '</td></tr>'; })).join('');
    if (ext) { n++; body += sec(n, 'أعمال خارجية ومصاريف') + tbl(['البيان', 'المبلغ'], ext); }
    if (!body) body = '<p>لسه مفيش بنود</p>';
    var nx = j.next || {}, info = [];
    if (j.complaint) info.push('شكوى العميل: ' + j.complaint);
    if (!est && (nx.km || nx.date)) info.push('الصيانة الجاية: ' + [nx.note, nx.km ? 'عند ' + fq(nx.km) + ' كم' : '', nx.date ? 'أو يوم ' + fmtDate(nx.date) : ''].filter(Boolean).join(' '));
    j.recs.forEach(function (x) { info.push('توصية: ' + x.text + (x.due ? ' (' + x.due + ')' : '')); });
    if (est && j.promised) info.push('ميعاد التسليم المتوقع: ' + fmtDate(j.promised));
    var discLbl = 'الخصم' + (j.discount && j.discount.type === 'percent' && C.num(j.discount.value) ? ' (' + fq(j.discount.value) + '%)' : '');
    var lbl = est ? 'عرض سعر / مقايسة' : 'فاتورة';
    return A.render({ section: SECTION, docKey: doc + ':' + j.id, docLabel: lbl, number: j.number, date: fmtDate(est ? (j.date || today()) : String(j.deliveredAt || today()).slice(0, 10)), billable: !est, currency: cc.name + ' (' + cc.sym + ')', business: business(),
      client: clientOf(j), fields: vehFieldsOf(j, !est), bodyHTML: body, warranty: j.warranty || '',
      notesHTML: notesBlock('ملاحظات', info.concat([j.notes, settings.terms])),
      totals: { lines: [['المصنعية', r.laborTotal], ['قطع الغيار', r.partsSell], ['أعمال خارجية', r.outsideSell], ['مصاريف', r.billedCosts], [discLbl, r.discount, '-'], ['الضريبة' + (r.taxPct ? ' ' + fq(r.taxPct) + '%' : ''), r.tax]], total: r.total, totalLabel: est ? 'إجمالي العرض' : 'الإجمالي', paid: est ? 0 : r.paid, paidLabel: 'المدفوع' },
      netLabel: 'إجمالي العرض', money: money, signLabel: 'توقيع الورشة' });
  }
  function receiptDocHTML(j) {
    var A = window.ArzaqiInvoice, v = getVeh(j.vehicleId) || {}, ck = j.checkin || {}, items = ck.items || {};
    var info = [['النوع', [(K.CLASSES[v.cls] || K.CLASSES.car).label, v.type].filter(Boolean).join(' · ')], ['الماركة والموديل', [v.make, v.model, v.year].filter(Boolean).join(' ')], ['اللون', v.color], ['الوقود', v.fuel], ['رقم الشاسيه', v.vin], ['رقم الموتور', v.engineNo],
      ['العداد وقت الاستلام', j.odoIn ? fq(j.odoIn) + ' كم' : ''], ['البنزين', j.fuelIn !== '' && j.fuelIn != null ? K.FUEL_LEVELS[+j.fuelIn] : ''], ['وقت الاستلام', fmtDT(j.receivedAt)], ['ميعاد التسليم المتوقع', fmtDate(j.promised)]].filter(function (x) { return x[1]; });
    var body = sec(1, 'بيانات المركبة') + tbl(['البيان', 'القيمة'], info.map(function (x) { return '<tr><td class="t">' + x[0] + '</td><td>' + A.esc(x[1]) + '</td></tr>'; }).join(''))
      + sec(2, 'شكوى العميل / المطلوب') + '<p class="wo-spec" style="font-size:12px">' + A.esc(j.complaint || '—') + '</p>'
      + sec(3, 'كشف الاستلام') + '<table class="p-table chk-table"><tbody>' + Object.keys(items).map(function (k) { return '<tr><td class="t">' + A.esc(k) + '</td><td>' + (items[k] ? '✓ موجود' : '✗ مش موجود / مش سليم') + '</td></tr>'; }).join('') + '</tbody></table>'
      + (ck.damage ? '<p class="wo-spec">تلفيات موجودة قبل الاستلام: <b>' + A.esc(ck.damage) + '</b></p>' : '') + (ck.belong ? '<p class="wo-spec">متعلقات العميل: <b>' + A.esc(ck.belong) + '</b></p>' : '');
    return A.render({ section: SECTION, docKey: 'receipt:' + j.id, docLabel: 'إيصال استلام مركبة', number: j.number, date: fmtDate(j.date), billable: false, business: business(), client: clientOf(j), fields: vehFieldsOf(j),
      bodyHTML: body, notesHTML: notesBlock('ملاحظات', ['الكشف ده اتعمل قدام العميل وقت الاستلام.', settings.terms]),
      totals: { lines: [], total: 0, noSum: true }, boxTitle: 'أمر الشغل', netLabel: 'رقم أمر الشغل', money: function () { return j.number; }, noWarranty: true, signs: ['توقيع العميل', 'مستلم المركبة'] });
  }
  function reportDocHTML(j) {
    var A = window.ArzaqiInvoice, r = J(j);
    var body = sec(1, 'شكوى العميل') + '<p class="wo-spec" style="font-size:12px">' + A.esc(j.complaint || '—') + '</p>'
      + sec(2, 'نتيجة الفحص') + tbl(['م', 'النظام', 'الكود', 'العطل / الملاحظة', 'الخطورة', 'المطلوب'], j.findings.map(function (f, i) { var sv = K.SEVERITY.find(function (s) { return s[0] === f.sev; }) || K.SEVERITY[0]; return '<tr><td class="idx">' + (i + 1) + '</td><td>' + A.esc(sysName(f.system)) + '</td><td dir="ltr">' + A.esc(f.code || '') + '</td><td class="t">' + A.esc(f.desc || '') + '</td><td>' + A.esc(sv[1]) + '</td><td class="t">' + A.esc(f.action || '') + (f.fixed ? ' ✓' : '') + '</td></tr>'; }).join(''), 'لسه ما اتسجلش أعطال')
      + (j.recs.length ? sec(3, 'توصيات') + tbl(['التوصية', 'إمتى'], j.recs.map(function (x) { return '<tr><td class="t">' + A.esc(x.text) + '</td><td>' + A.esc(x.due || '') + '</td></tr>'; }).join('')) : '');
    return A.render({ section: SECTION, docKey: 'report:' + j.id, docLabel: 'تقرير الفحص', number: j.number, date: fmtDate(today()), billable: false, currency: cur().name, business: business(), client: clientOf(j), fields: vehFieldsOf(j),
      bodyHTML: body, notesHTML: notesBlock('ملحوظة', ['النتيجة دي حسب الفحص في التاريخ ده، وبعض الأعطال بتبان أكتر بعد الفك.', j.notes]),
      totals: { lines: [], total: r.total, totalLabel: 'التقدير' }, netLabel: 'تقدير الإصلاح', money: money, noWarranty: true, signs: ['الفني', 'توقيع العميل'] });
  }
  function cardDocHTML(j) {
    var A = window.ArzaqiInvoice, r = J(j);
    var body = sec(1, 'المطلوب') + '<p class="wo-spec" style="font-size:12px">' + A.esc(j.complaint || '—') + '</p>'
      + (j.findings.length ? sec(2, 'الأعطال') + tbl(['م', 'العطل', 'المطلوب', 'تم'], j.findings.map(function (f, i) { return '<tr><td class="idx">' + (i + 1) + '</td><td class="t">' + A.esc([f.code, f.desc].filter(Boolean).join(' — ')) + '</td><td class="t">' + A.esc(f.action || '') + '</td><td>' + (f.fixed ? '✓' : '☐') + '</td></tr>'; }).join('')) : '')
      + sec(3, 'الشغل') + tbl(['م', 'الخدمة', 'الفني', 'الساعات', 'تم'], j.labor.map(function (l, i) { var w = byId('workers', l.tech); return '<tr><td class="idx">' + (i + 1) + '</td><td class="t">' + A.esc(l.name) + '<span class="sub-note">' + A.esc(sysName(l.system)) + '</span></td><td>' + A.esc(w ? w.name : '') + '</td><td>' + (l.mode === 'hours' ? fq(l.hours) : '—') + '</td><td>' + (l.done ? '✓' : '☐') + '</td></tr>'; }).join(''), 'لسه مفيش شغل متسجل')
      + (j.parts.length ? sec(4, 'قطع الغيار') + tbl(['القطعة', 'رقم القطعة', 'الكمية', 'المصدر'], j.parts.map(function (p) { var s = K.PART_SOURCES.find(function (x) { return x[0] === p.source; }) || K.PART_SOURCES[1]; return '<tr><td class="t">' + A.esc(p.name) + '</td><td dir="ltr">' + A.esc(p.pn || '') + '</td><td>' + fq(p.qty) + '</td><td>' + A.esc(s[1]) + '</td></tr>'; }).join('')) : '');
    return A.render({ section: SECTION, docKey: 'card:' + j.id, docLabel: 'أمر شغل', number: j.number, date: fmtDate(today()), billable: false, business: business(), client: { name: custName(j) }, fields: vehFieldsOf(j).concat([{ label: 'التسليم', value: fmtDate(j.promised) }]),
      bodyHTML: body, notesHTML: notesBlock('تعليمات', [j.notes]), totals: { lines: [], total: r.hours, noSum: true }, boxTitle: 'الشغل', netLabel: 'إجمالي الساعات', money: function (v) { return fq(v); }, noWarranty: true, signs: ['الفني المسؤول', 'المراجعة'] });
  }
  function costsDocHTML(j) {
    var A = window.ArzaqiInvoice, r = J(j);
    var rows = [['قيمة الشغل (من غير الضريبة)', r.total - r.tax], ['تكلفة قطع الغيار', r.partsCost], ['تكلفة الشغل الخارجي', r.outsideCost], ['المصاريف', r.billedCosts + r.internalCosts], ['أجور الفنيين', r.workers], ['عمولة الفنيين', r.commission], ['إجمالي التكلفة', r.totalCost], ['الربح', r.profit]];
    var body = sec(1, 'التكلفة والربح (داخلي — مش للعميل)') + tbl(['البيان', 'المبلغ'], rows.filter(function (x) { return x[1]; }).map(function (x) { return '<tr><td class="t">' + x[0] + '</td><td class="money">' + money(x[1]) + '</td></tr>'; }).join(''))
      + (j.parts.length ? sec(2, 'قطع الغيار: شراء وبيع') + tbl(['القطعة', 'الكمية', 'شراء', 'بيع', 'الربح'], j.parts.map(function (p, i) { var x = r.parts[i]; return '<tr><td class="t">' + A.esc(p.name) + '</td><td>' + fq(x.qty) + '</td><td class="money">' + money(x.cost) + '</td><td class="money">' + money(x.sell) + '</td><td class="money">' + money(x.sell - x.cost) + '</td></tr>'; }).join('')) : '');
    return A.render({ section: SECTION, docKey: 'costs:' + j.id, docLabel: 'كشف تكاليف داخلي', number: j.number, date: fmtDate(today()), billable: false, currency: cur().name, business: business(), client: { name: custName(j) }, fields: vehFieldsOf(j),
      bodyHTML: body, totals: { lines: [['التكلفة', r.totalCost]], total: r.profit, totalLabel: 'الربح' }, netLabel: 'الربح · هامش ' + fq(r.margin) + '%', money: money, noWarranty: true, signs: [] });
  }
  function statementHTML(cid) {
    var c = getCust(cid) || {}, A = window.ArzaqiInvoice, cc = cur();
    var js = jobsOf(cid).filter(function (j) { return j.status === 'delivered' || j.status === 'ready'; }).sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); });
    var tot = 0, paid = 0, pays = [];
    var rows = js.map(function (j, i) {
      var r = J(j), v = getVeh(j.vehicleId); tot += r.total; paid += r.paid;
      j.payments.forEach(function (p) { pays.push({ date: p.date, job: j, amount: C.num(p.amount), note: p.note }); });
      return '<tr><td class="idx">' + (i + 1) + '</td><td class="t">' + A.esc(vehTitle(v)) + '<span class="sub-note">' + A.esc([j.number, v && v.plate].filter(Boolean).join(' · ')) + '</span></td><td>' + fmtDate(j.date) + '</td><td class="money">' + money(r.total) + '</td><td class="money">' + money(r.paid) + '</td><td class="money">' + money(r.remaining) + '</td></tr>';
    }).join('');
    pays.sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); });
    var body = sec(1, 'أوامر الشغل') + '<table class="p-table"><thead><tr><th>م</th><th>المركبة</th><th>التاريخ</th><th>الإجمالي</th><th>المدفوع</th><th>المتبقي</th></tr></thead><tbody>' + (rows || '<tr><td colspan="6">مفيش أوامر شغل</td></tr>')
      + '</tbody><tfoot><tr><td colspan="3">الإجمالي</td><td>' + money(tot) + '</td><td>' + money(paid) + '</td><td>' + money(tot - paid) + '</td></tr></tfoot></table>';
    if (pays.length) body += sec(2, 'الدفعات') + tbl(['م', 'التاريخ', 'أمر الشغل', 'ملحوظة', 'المبلغ'], pays.map(function (p, i) { return '<tr><td class="idx">' + (i + 1) + '</td><td>' + fmtDate(p.date) + '</td><td>' + A.esc(p.job.number || '') + '</td><td class="t">' + A.esc(p.note || '') + '</td><td class="money">' + money(p.amount) + '</td></tr>'; }).join(''));
    return A.render({ section: SECTION, docKey: 'statement:' + cid, docLabel: 'كشف حساب', date: fmtDate(today()), billable: true, currency: cc.name + ' (' + cc.sym + ')', business: business(),
      client: { name: c.name || '', phone: c.phone || '', address: c.address || '', note: c.note || '' }, bodyHTML: body, totals: { lines: [['إجمالي الفواتير', tot]], total: tot, totalLabel: 'الإجمالي المستحق', paid: paid, paidLabel: 'المدفوع' },
      money: money, noWarranty: true, signs: [], boxTitle: 'ملخص الحساب' });
  }
  var pv = null;
  var DOC_LBL = { receipt: 'إيصال استلام', report: 'تقرير فحص', estimate: 'عرض سعر', card: 'أمر شغل', invoice: 'فاتورة', costs: 'كشف تكاليف' };
  function docTitle() {
    if (!pv) return document.title;
    if (pv.custId) return 'كشف حساب — ' + ((getCust(pv.custId) || {}).name || '');
    var j = getJob(pv.jobId) || {}, v = getVeh(j.vehicleId);
    return (DOC_LBL[pv.doc] || 'فاتورة') + ' ' + (j.number || '') + ' — ' + custName(j) + (v && v.plate ? ' — ' + v.plate : '');
  }
  function openPreview(o) {
    pv = o; renderPreview();
    var m = $('printPreviewModal'); m.style.display = 'block'; m.scrollTop = 0;
    pushLayer({ type: 'preview', hide: function () { m.style.display = 'none'; pv = null; } });
    fitPreview(); if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitPreview); setTimeout(fitPreview, 300);
  }
  function renderPreview() {
    if (!pv) return;
    $('pvDocs').innerHTML = pv.jobId ? DOCS.map(function (d) { return '<button type="button" data-act="pvDoc" data-doc="' + d[0] + '" class="' + (pv.doc === d[0] ? 'on' : '') + '">' + esc(DOC_LBL[d[0]]) + '</button>'; }).join('') : '';
    var on = $('pvDocs').querySelector('.on'); if (on) { try { on.scrollIntoView({ inline: 'center', block: 'nearest' }); } catch (e) {} }
    var j = getJob(pv.jobId);
    $('printSheet').innerHTML = pv.custId ? statementHTML(pv.custId) : pv.doc === 'receipt' ? receiptDocHTML(j) : pv.doc === 'report' ? reportDocHTML(j) : pv.doc === 'card' ? cardDocHTML(j) : pv.doc === 'costs' ? costsDocHTML(j) : jobDocHTML(j, pv.doc === 'estimate' ? 'estimate' : 'invoice');
    fitPreview();
  }
  function fitPreview() {
    var sh = $('printSheet'), vp = $('printViewport');
    if (!sh || $('printPreviewModal').style.display !== 'block') return;
    var w = sh.offsetWidth || 794, s = Math.min(1, (window.innerWidth - 16) / w);
    sh.style.transform = 'scale(' + s + ')'; vp.style.width = (w * s) + 'px'; vp.style.height = (sh.offsetHeight * s) + 'px';
  }
  window.addEventListener('resize', fitPreview);
  var BRIDGES = ['HesabatyApp', 'HesabatiPlumbingApp', 'HesabatiHvacApp', 'HFloorApp', 'PlasterApp'];
  $('pvPrint').addEventListener('click', function () {
    var title = docTitle(), prev = document.title;
    document.title = title;
    var restore = function () { document.title = prev; window.removeEventListener('afterprint', restore); };
    window.addEventListener('afterprint', restore);
    for (var i = 0; i < BRIDGES.length; i++) { var b = window[BRIDGES[i]]; if (b && typeof b.print === 'function') { try { b.print(title); setTimeout(restore, 4000); return; } catch (e) {} } }
    setTimeout(function () { window.print(); }, 60);
  });

  // ====================================================================
  // نوافذ صغيرة: تسوية المخزن، دفعة مورد، يومية فني، قبض/سلفة
  // ====================================================================
  function openAdjustSheet() {
    var p = getPart(toolState.id); if (!p) return;
    openSheet('تسوية رصيد ' + p.name, '<p class="hint" style="margin-top:-4px">الرصيد الحالي ' + fq(C.stock(db)[p.id].qty) + ' — اكتب بالموجب للزيادة وبالسالب للنقص (تالف، فاقد، جرد).</p>'
      + '<div class="row-2"><div class="field"><label for="f_aq">الكمية (+ أو −)</label><input type="text" id="f_aq" inputmode="decimal" dir="ltr" placeholder="-1"></div><div class="field"><label for="f_ad">التاريخ</label><input type="date" id="f_ad" value="' + today() + '"></div></div>'
      + '<div class="field"><label for="f_an">السبب</label><input type="text" id="f_an" placeholder="جرد / تالف / مرتجع للمورد"></div>'
      + '<button type="button" class="btn btn-primary" data-act="adjustSave">' + ic('check') + ' حفظ</button>', { form: 'adjust', partId: p.id });
  }
  function openSupPaySheet() {
    var s = getSup(toolState.id); if (!s) return; var b = C.supplierBalance(db, s.id);
    openSheet('دفعة لـ ' + s.name, '<div class="field"><label for="f_spa">المبلغ</label><input type="text" id="f_spa" inputmode="decimal" dir="ltr"></div>'
      + (b.balance > 0.005 ? '<div class="price-hint" style="margin:-6px 0 12px"><button type="button" class="chip" data-act="supPayAll" data-v="' + esc(b.balance) + '">الرصيد كله: ' + esc(money(b.balance)) + '</button></div>' : '')
      + '<div class="row-2"><div class="field"><label for="f_spd">التاريخ</label><input type="date" id="f_spd" value="' + today() + '"></div><div class="field"><label for="f_spn">ملاحظة</label><input type="text" id="f_spn"></div></div>'
      + '<button type="button" class="btn btn-accent" data-act="supPaySave">' + ic('check') + ' حفظ</button>', { form: 'spay', supId: s.id });
  }
  function openWlogSheet() {
    var w = byId('workers', toolState.id); if (!w) return;
    var js = sortedJobs().filter(function (j) { return j.status !== 'cancelled'; }).slice(0, 30);
    openSheet('يومية / شغل لـ ' + w.name, '<div class="chips wrap" id="f_lk" style="margin-bottom:10px">' + ['يومية', 'بالقطعة', 'حافز'].map(function (k, i) { return '<button type="button" class="chip' + (i === 0 ? ' on' : '') + '" data-act="wlogKind" data-v="' + k + '">' + k + '</button>'; }).join('') + '</div>'
      + '<div class="row-2"><div class="field"><label for="f_lq">العدد</label><input type="text" id="f_lq" inputmode="decimal" dir="ltr" value="1"></div><div class="field"><label for="f_lr">السعر</label><input type="text" id="f_lr" inputmode="decimal" dir="ltr" value="' + esc(v0(w.daily)) + '"></div></div>'
      + '<div class="field"><label for="f_lj">على أمر شغل (اختياري — بيدخل في تكلفته)</label><select id="f_lj">' + opt(js.map(function (j) { return [j.id, j.number + ' — ' + custName(j)]; }), '', '—') + '</select></div>'
      + '<div class="row-2"><div class="field"><label for="f_ld">التاريخ</label><input type="date" id="f_ld" value="' + today() + '"></div><div class="field"><label for="f_ln">ملاحظة</label><input type="text" id="f_ln"></div></div>'
      + '<button type="button" class="btn btn-accent" data-act="wlogSave">' + ic('check') + ' حفظ</button>', { form: 'wlog', kind: 'يومية' });
  }
  function openWpaySheet() {
    openSheet('قبض / سلفة', '<div class="segmented seg-2" id="f_wpt" style="margin-bottom:12px"><button type="button" class="on" data-act="wpayType" data-v="pay">قبض</button><button type="button" data-act="wpayType" data-v="advance">سلفة</button></div>'
      + '<div class="row-2"><div class="field"><label for="f_wpa">المبلغ</label><input type="text" id="f_wpa" inputmode="decimal" dir="ltr"></div><div class="field"><label for="f_wpd">التاريخ</label><input type="date" id="f_wpd" value="' + today() + '"></div></div>'
      + '<div class="field"><label for="f_wpn">ملاحظة</label><input type="text" id="f_wpn"></div><button type="button" class="btn btn-accent" data-act="wpaySave">' + ic('check') + ' حفظ</button>', { form: 'wpay', type: 'pay' });
  }
  function segOn(id, b) { Array.prototype.forEach.call($(id).children, function (x) { x.classList.toggle('on', x === b); }); }

  // ====================================================================
  // الأزرار
  // ====================================================================
  function upsert(list, o) { var i = list.findIndex(function (x) { return x.id === o.id; }); if (i >= 0) list[i] = o; else list.push(o); }
  function removeFrom(j, key, id, msg) { j[key] = j[key].filter(function (x) { return x.id !== id; }); touch(j); saveDb(); closeTop(function () { refresh(); toast(msg || 'اتمسح'); }); }
  var ACT = {
    closeTop: function () { closeTop(); },
    view: function (b) { var go = function () { if (b.dataset.filter) jobFilter.f = b.dataset.filter; switchView(b.dataset.view); }; if (stack.length) closeTop(go); else go(); },
    create: function () {
      openSheet('إنشاء جديد', '<div class="create-list"><button type="button" class="create-opt dark" data-act="receive"><span class="q-ic orange">' + ic('key') + '</span><span><b>استقبال مركبة</b><small>عميل + مركبة + كشف استلام + أمر شغل</small></span></button>'
        + '<div class="create-row"><button type="button" class="create-opt" data-act="newCustomer"><span class="q-ic">' + ic('users') + '</span><span><b>عميل جديد</b><small>اسم وتليفون</small></span></button>'
        + '<button type="button" class="create-opt" data-act="newVehicle"><span class="q-ic">' + ic('car') + '</span><span><b>مركبة جديدة</b><small>بصاحبها</small></span></button></div>'
        + '<div class="create-row"><button type="button" class="create-opt" data-act="quickPay"><span class="q-ic green">' + ic('cash') + '</span><span><b>تسجيل دفعة</b><small>من عميل</small></span></button>'
        + '<button type="button" class="create-opt" data-act="expNew"><span class="q-ic">' + ic('wallet') + '</span><span><b>مصروف</b><small>على الورشة</small></span></button></div>'
        + '<div class="create-row"><button type="button" class="create-opt" data-act="partNew"><span class="q-ic">' + ic('box') + '</span><span><b>صنف في المخزن</b><small>قطعة غيار</small></span></button>'
        + '<button type="button" class="create-opt" data-act="purchaseNew"><span class="q-ic">' + ic('store') + '</span><span><b>شراء من مورد</b><small>فاتورة شراء</small></span></button></div></div>', {});
    },
    receive: function () { afterSheet(function () { openReceive({}); }); },
    receiveVeh: function () { var id = openVehId; openReceive({ vehId: id }); },
    receiveCust: function () { var id = openCustId; openReceive({ custId: id }); },
    againJob: function () { var j = findJob(); if (!j) return; openReceive({ vehId: j.vehicleId, custId: j.customerId }); },
    newCustomer: function () { afterSheet(function () { openCustomerSheet(null); }); },
    newVehicle: function () { afterSheet(function () { openVehicleSheet(null, null); }); },
    newVehicleFor: function () { openVehicleSheet(null, openCustId); },
    saveCustomer: saveCustomer, saveVehicle: saveVehicle, createJob: createJob,
    pickCust: function (b) {
      var c = getCust(b.dataset.id); if (!c) return; S.custId = c.id; S.custName = c.name; $('f_cname').value = c.name; $('f_csug').innerHTML = '';
      if ($('f_cphone') && !$('f_cphone').value) $('f_cphone').value = c.phone || '';
      if (S.form === 'receive') { S.vehId = (vehsOf(c.id)[0] || {}).id || null; renderReceiveVeh(); }
      if ($('f_jveh')) $('f_jveh').innerHTML = opt(vehsOf(c.id).map(function (v) { return [v.id, vehTitle(v) + (v.plate ? ' — ' + v.plate : '')]; }), '', '—');
    },
    pickVeh: function (b) { S.vehId = b.dataset.id || null; renderReceiveVeh(); },
    vcls: function (b) { S.v = readVeh($('f_vblock')); S.v.cls = b.dataset.v; S.v.type = ''; $('f_vblock').innerHTML = vehFieldsHTML(S.v, S.form === 'veh'); if (S.form === 'receive') { var keep = readCheck(); $('f_check').innerHTML = checkinHTML(S.v.cls, keep); } },
    fuelLvl: function (b) { S.fuel = b.dataset.v; segOn('f_fuel', b); },
    openJob: function (b) { var go = function () { openJob(b.dataset.id); }; if (openJobId) closeTop(go); else if (topLayer() && topLayer().type === 'sheet') closeTop(go); else go(); },
    openVeh: function (b) { var id = b.dataset.id; if (tool === 'reminders') { openVeh(id); return; } openVeh(id); },
    openCust: function (b) { openCust(b.dataset.id); },
    vehTab: function (b) { vehTab = b.dataset.v; $('vehSearch').value = ''; renderVehicles(); },
    tool: function (b) { var go = function () { openTool(b.dataset.tool, b.dataset.low ? { low: 1 } : {}); }; if (topLayer() && topLayer().type === 'sheet') closeTop(go); else go(); },
    pickInvoice: function () { switchView('jobs'); jobFilter.f = 'all'; setPick(true); renderJobs(); toast('اختار أمر الشغل'); },
    cancelPick: function () { setPick(false); },
    pickedInvoice: function (b) { setPick(false); var j = getJob(b.dataset.id); if (!j) return; openPreview({ jobId: j.id, doc: C.isQuote(j) ? 'estimate' : 'invoice' }); },
    clearJobFilter: function () { jobFilter.cust = ''; jobFilter.from = ''; jobFilter.to = ''; $('jobFrom').value = ''; $('jobTo').value = ''; renderJobs(); },
    quickPay: function () { afterSheet(function () { openPickJob('pay'); }); },
    pickedJob: function (b) { var id = b.dataset.id; closeTop(function () { openPaySheet(id, null); }); },
    // أمر الشغل
    jobMenu: openJobMenu, editJobInfo: function () { closeTop(openJobInfoSheet); }, saveJobInfo: saveJobInfo, delJob: delJob,
    openCustOfJob: function () { var j = findJob(); if (!j) return; afterSheet(function () { openCust(j.customerId); }); },
    openVehOfJob: function () { var j = findJob(); if (!j || !j.vehicleId) return; afterSheet(function () { openVeh(j.vehicleId); }); },
    setStatus: function (b) { var v = b.dataset.v; afterSheet(function () { setStatus(v); }); },
    editCheckin: openCheckinSheet, saveCheckin: saveCheckin,
    addFinding: function () { openFindingSheet(null); }, editFinding: function (b) { openFindingSheet(b.dataset.id); }, saveFinding: saveFinding,
    delFinding: function () { removeFrom(findJob(), 'findings', S.fid); },
    sevPick: function (b) { S.sev = b.dataset.v; segOn('f_fsev', b); },
    symptoms: function () { openSymptoms(true); }, symPick: function (b) { symPick(+b.dataset.i); }, symAdd: function (b) { symAdd(+b.dataset.k); b.disabled = true; b.textContent = '✓ اتضاف'; },
    symBack: function () { $('sheetBody').innerHTML = '<div class="search-box">' + ic('search') + '<input type="search" id="f_symq" placeholder="دوّر: سخونية، رعشة، فرامل، تكييف…" autocomplete="off"></div><div id="f_syml">' + symptomsHTML('') + '</div>'; $('f_symq').addEventListener('input', function () { $('f_syml').innerHTML = symptomsHTML(this.value); }); },
    addLabor: function () { openLaborSheet(null); }, editLabor: function (b) { openLaborSheet(b.dataset.id); }, saveLabor: saveLabor, delLabor: function () { removeFrom(findJob(), 'labor', S.lid); },
    svcPick: function (b) { svcPick(b.dataset.n); },
    lmode: function (b) { S.mode = b.dataset.v; segOn('f_lmode', b); $('f_lhours').hidden = S.mode !== 'hours'; $('f_lfixed').hidden = S.mode !== 'fixed'; laborLive(); },
    addPart: function () { openPartSheet(null); }, editPart: function (b) { openPartSheet(b.dataset.id); }, savePart: savePart, delPart: function () { removeFrom(findJob(), 'parts', S.pid); },
    psrc: function (b) { S.source = b.dataset.v; segOn('f_psrc', b); $('f_pstock').hidden = S.source !== 'stock'; partLive(); },
    stockPick: function (b) { stockPick(b.dataset.id); },
    addOutside: function () { openOutsideSheet(null); }, editOutside: function (b) { openOutsideSheet(b.dataset.id); }, saveOutside: saveOutside, delOutside: function () { removeFrom(findJob(), 'outside', S.oid); },
    addCost: function () { openCostSheet(null); }, editCost: function (b) { openCostSheet(b.dataset.id); }, saveCost: saveCost, delCost: function () { removeFrom(findJob(), 'costs', S.kid); },
    editDisc: openDiscSheet, dtype: function (b) { S.dtype = b.dataset.v; segOn('f_dtype', b); },
    saveDisc: function () { var j = findJob(); if (!j) return; j.discount = { type: S.dtype, value: $('f_dv').value.trim() }; j.taxPct = $('f_tax').value.trim(); touch(j); saveDb(); closeTop(function () { refresh(); toast('اتحفظ'); }); },
    addPay: function () { openPaySheet(openJobId, null); }, editPay: function (b) { openPaySheet(openJobId, b.dataset.id); }, savePay: savePay,
    delPay: function () { var j = getJob(S.jobId); if (j) removeFrom(j, 'payments', S.payId, 'اتمسحت الدفعة'); },
    payAll: function (b) { $('f_pamt').value = b.dataset.v; }, payKind: function (b) { S.kind = S.kind === b.dataset.v ? '' : b.dataset.v; Array.prototype.forEach.call($('f_pkinds').children, function (x) { x.classList.toggle('on', x.dataset.v === S.kind); }); },
    addRec: function () { openRecSheet(null); }, editRec: function (b) { openRecSheet(b.dataset.id); },
    saveRec: function () { var j = findJob(); if (!j) return; var t = $('f_rt').value.trim(); if (!t) { toast('اكتب التوصية'); return; } upsert(j.recs, { id: S.rid || uid('r'), text: t, due: $('f_rd').value.trim() }); touch(j); saveDb(); closeTop(function () { refresh(); toast('اتسجلت'); }); },
    delRec: function () { removeFrom(findJob(), 'recs', S.rid); },
    deliver: deliver,
    scrollProfit: function () { var c = $('profitCard'); if (c) c.scrollIntoView({ behavior: 'smooth', block: 'center' }); },
    preview: function (b) { var j = findJob(); if (j) openPreview({ jobId: j.id, doc: b.dataset.doc }); },
    pvDoc: function (b) { if (!pv) return; pv.doc = b.dataset.doc; renderPreview(); $('printPreviewModal').scrollTop = 0; },
    // المركبة والعميل
    editVeh: function () { openVehicleSheet(openVehId); }, delVeh: delVeh,
    editCust: function () { openCustomerSheet(openCustId); }, delCust: delCust,
    statement: function () { openPreview({ custId: openCustId }); },
    // المخزن
    invAll: function () { toolState.low = 0; toolState.cat = ''; renderTool(); }, invLow: function () { toolState.low = toolState.low ? 0 : 1; renderTool(); }, invCat: function (b) { toolState.cat = toolState.cat === b.dataset.v ? '' : b.dataset.v; renderTool(); },
    partNew: function () { afterSheet(function () { openPartEdit(null); }); }, partEdit: function () { openPartEdit(toolState.id); }, partSave: partSave,
    partOpen: function (b) { openTool('part', { id: b.dataset.id }); },
    partAdjust: openAdjustSheet,
    adjustSave: function () { var q = C.num($('f_aq').value); if (!q) { toast('اكتب الكمية بالموجب أو بالسالب'); return; } db.moves.push({ id: uid('m'), partId: S.partId, qty: String(q), date: $('f_ad').value || today(), note: $('f_an').value.trim() }); saveDb(); closeTop(function () { refresh(); toast('اتسجلت التسوية'); }); },
    partDel: function () { var p = getPart(toolState.id); if (!p) return; if (partInUse(p.id)) { toast('الصنف ده عليه حركة (شراء أو صرف) — مش هينفع يتمسح'); return; } confirmDlg('حذف الصنف؟', p.name, 'أيوه، امسح').then(function (ok) { if (!ok) return; db.parts = db.parts.filter(function (x) { return x.id !== p.id; }); db.moves = db.moves.filter(function (m) { return m.partId !== p.id; }); saveDb(); closeTop(function () { refresh(); toast('اتمسح'); }); }); },
    // الموردين
    supNew: function () { openSupSheet(null); }, supEdit: function () { openSupSheet(toolState.id); }, supOpen: function (b) { openTool('supplier', { id: b.dataset.id }); },
    supSave: function () { var n = $('f_supn').value.trim(); if (!n) { toast('اكتب اسم المورد'); return; } var s = S.supId ? getSup(S.supId) : null; if (!s) { s = { id: uid('sp'), createdAt: new Date().toISOString() }; db.suppliers.push(s); } s.name = n; s.phone = $('f_supp').value.trim(); s.address = $('f_supa').value.trim(); saveDb(); closeTop(function () { refresh(); toast('اتحفظ'); }); },
    supDel: function () { var s = getSup(toolState.id); if (!s) return; if (db.purchases.some(function (p) { return p.supplierId === s.id; })) { toast('المورد ده عليه فواتير شراء — امسحها الأول'); return; } confirmDlg('حذف المورد؟', s.name, 'أيوه، امسح').then(function (ok) { if (!ok) return; db.suppliers = db.suppliers.filter(function (x) { return x.id !== s.id; }); db.spay = db.spay.filter(function (x) { return x.supplierId !== s.id; }); saveDb(); closeTop(function () { refresh(); toast('اتمسح'); }); }); },
    supPay: openSupPaySheet, supPayAll: function (b) { $('f_spa').value = b.dataset.v; },
    supPaySave: function () { var a = C.num($('f_spa').value); if (!a) { toast('اكتب المبلغ'); return; } db.spay.push({ id: uid('sq'), supplierId: S.supId, amount: String(a), date: $('f_spd').value || today(), note: $('f_spn').value.trim() }); saveDb(); closeTop(function () { refresh(); toast('اتسجلت الدفعة'); }); },
    purchaseNew: function (b) { var sid = b.dataset.sup || (tool === 'supplier' ? toolState.id : null); afterSheet(function () { openPurchaseSheet(null, sid); }); },
    purchaseEdit: function (b) { openPurchaseSheet(b.dataset.id); },
    purAddLine: function () { readPurLines(); S.lines.push({ name: '', qty: '', cost: '' }); $('f_pul').innerHTML = purLinesHTML(); purLive(); },
    purDelLine: function (b) { readPurLines(); S.lines.splice(+b.dataset.i, 1); if (!S.lines.length) S.lines.push({ name: '', qty: '', cost: '' }); $('f_pul').innerHTML = purLinesHTML(); purLive(); },
    purchaseSave: purchaseSave,
    purchaseDel: function () { var id = S.purId; confirmDlg('حذف فاتورة الشراء؟', 'الكميات هتتخصم من المخزن.', 'أيوه، امسح').then(function (ok) { if (!ok) return; db.purchases = db.purchases.filter(function (x) { return x.id !== id; }); saveDb(); closeTop(function () { refresh(); toast('اتمسحت'); }); }); },
    // المصروفات
    expNew: function () { afterSheet(function () { openExpSheet(null); }); }, expEdit: function (b) { openExpSheet(b.dataset.id); },
    expPeriod: function (b) { toolState.period = b.dataset.v; renderTool(); }, expCat: function (b) { S.cat = b.dataset.v; segOn('f_ecats', b); },
    expSave: function () { var a = C.num($('f_ea').value); if (!a) { toast('اكتب المبلغ'); return; } upsert(db.expenses, { id: S.expId || uid('e'), cat: S.cat || 'أخرى', amount: String(a), date: $('f_ed').value || today(), note: $('f_en').value.trim() }); saveDb(); closeTop(function () { refresh(); toast('اتسجل المصروف'); }); },
    expDel: function () { var id = S.expId; db.expenses = db.expenses.filter(function (x) { return x.id !== id; }); saveDb(); closeTop(function () { refresh(); toast('اتمسح'); }); },
    // الفنيين
    workerNew: function () { openWorkerSheet(null); }, workerEdit: function () { openWorkerSheet(toolState.id); }, workerOpen: function (b) { openTool('worker', { id: b.dataset.id }); },
    workerSave: function () { var n = $('f_wn').value.trim(); if (!n) { toast('اكتب الاسم'); return; } var w = S.wid ? byId('workers', S.wid) : null; if (!w) { w = { id: uid('w'), createdAt: new Date().toISOString() }; db.workers.push(w); } Object.assign(w, { name: n, role: $('f_wr').value.trim(), phone: $('f_wp').value.trim(), daily: $('f_wd').value.trim(), pct: $('f_wpct').value.trim() }); saveDb(); closeTop(function () { refresh(); toast('اتحفظ'); }); },
    workerDel: function () { var w = byId('workers', toolState.id); if (!w) return; confirmDlg('حذف الفني؟', w.name + ' — حسابه هيتمسح ومش هيظهر على الشغل.', 'أيوه، امسح').then(function (ok) { if (!ok) return; db.workers = db.workers.filter(function (x) { return x.id !== w.id; }); db.wlog = db.wlog.filter(function (x) { return x.workerId !== w.id; }); db.wpay = db.wpay.filter(function (x) { return x.workerId !== w.id; }); db.jobs.forEach(function (j) { j.labor.forEach(function (l) { if (l.tech === w.id) l.tech = ''; }); }); saveDb(); closeTop(function () { refresh(); toast('اتمسح'); }); }); },
    wlogNew: openWlogSheet, wlogKind: function (b) { S.kind = b.dataset.v; segOn('f_lk', b); },
    wlogSave: function () { var q = C.num($('f_lq').value), r = C.num($('f_lr').value); if (!q || !r) { toast('اكتب العدد والسعر'); return; } db.wlog.push({ id: uid('wl'), workerId: toolState.id, kind: S.kind, qty: String(q), rate: String(r), amount: String(C.money(q * r)), date: $('f_ld').value || today(), jobId: $('f_lj').value, note: $('f_ln').value.trim() }); saveDb(); closeTop(function () { refresh(); toast('اتسجل'); }); },
    wlogDel: function (b) { confirmDlg('حذف الحركة دي؟', '', 'أيوه، امسح').then(function (ok) { if (!ok) return; db.wlog = db.wlog.filter(function (x) { return x.id !== b.dataset.id; }); saveDb(); refresh(); }); },
    wpayNew: openWpaySheet, wpayType: function (b) { S.type = b.dataset.v; segOn('f_wpt', b); },
    wpaySave: function () { var a = C.num($('f_wpa').value); if (!a) { toast('اكتب المبلغ'); return; } db.wpay.push({ id: uid('wp'), workerId: toolState.id, type: S.type, amount: String(a), date: $('f_wpd').value || today(), note: $('f_wpn').value.trim() }); saveDb(); closeTop(function () { refresh(); toast('اتسجل'); }); },
    wpayDel: function (b) { confirmDlg('حذف الحركة دي؟', '', 'أيوه، امسح').then(function (ok) { if (!ok) return; db.wpay = db.wpay.filter(function (x) { return x.id !== b.dataset.id; }); saveDb(); refresh(); }); },
    // التقارير والمواعيد والحاسبات وكشف الأعطال والإعدادات
    repPeriod: function (b) { toolState.period = b.dataset.v; renderTool(); },
    remDays: function (b) { toolState.days = +b.dataset.v; renderTool(); },
    calcOpen: function (b) { openTool('calc', { id: b.dataset.v, vals: {} }); },
    diagSym: function (b) { toolState.sym = +b.dataset.i; renderTool(); $('toolPage').scrollTop = 0; }, diagBack: function () { delete toolState.sym; renderTool(); },
    addCustom: function (b) {
      var k = b.dataset.k, v = $('f_new_' + k).value.trim(); if (!v) return;
      settings[k] = arr(settings[k]).concat([k === 'services' ? { name: v, system: 'other', hours: 0 } : v]); saveSettings(); renderTool(); toast('اتضاف');
    },
    delCustom: function (b) { var k = b.dataset.k, v = b.dataset.v; settings[k] = arr(settings[k]).filter(function (x) { return (typeof x === 'string' ? x : x.name) !== v; }); saveSettings(); renderTool(); },
    delSvcPrice: function (b) { delete settings.servicePrices[b.dataset.v]; saveSettings(); renderTool(); }
  };
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]');
    if (!b || b.disabled) return;
    var f = ACT[b.dataset.act]; if (!f) return;
    if (b.tagName !== 'INPUT' && b.tagName !== 'A') e.preventDefault();
    f(b, e);
  });
  document.addEventListener('click', function (e) { var t = e.target.closest('[data-theme-set]'); if (t) { settings.theme = t.dataset.themeSet; saveSettings(); applyTheme(); } });
  // كشف الأعطال: البحث بالكود من غير ما الصفحة تترسم من جديد
  document.addEventListener('input', function (e) { if (e.target && e.target.id === 'f_dtcq') { toolState.code = e.target.value; $('f_dtcr').innerHTML = dtcBoxHTML(e.target.value.trim()); } });

  // ---------------- البداية ----------------
  if (history.state && history.state.cw) history.replaceState(null, '');
  applyTheme();
  renderHome();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', function () { navigator.serviceWorker.register('./service-worker.js').catch(function () {}); });
  }
  // للاختبارات: نفس الدوال اللي الواجهة بتستخدمها
  window.AutoApp = { get db() { return db; }, settings: settings, openJob: openJob, openVeh: openVeh, openCust: openCust, openPreview: openPreview, openTool: openTool, openReceive: openReceive, calc: C, catalog: K, J: J, ctx: ctx };
})();
