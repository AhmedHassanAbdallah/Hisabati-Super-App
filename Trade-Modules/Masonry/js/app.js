/*
 * أرزقي | Arzoqi — البناء وأعمال المباني وحساب الطوب: الواجهة.
 * الحسابات في js/calc.js (MasonCalc)، ومكتبة أنواع الطوب والأسماء في js/catalog.js (MasonCatalog).
 * التخزين على الموبايل بس:
 *   hmas_db_v1        العملاء والمشاريع (الحوائط، المونة، المحارة، المصنعية، التكاليف، الخصم، الدفعات)
 *   hmas_settings_v1  المظهر، العملة، بيانات الفاتورة، مكتبة الطوب بتاعتك، آخر خلطة وأسعار، العمال واليومية
 * الفاتورة: ArzaqiInvoice (نفس فاتورة كل الأقسام). نوتة العمال: ArzoqiCrew (نفس النوتة في كل الأقسام).
 * تنبيه: القسم بيحسب كميات وتكاليف بس — من غير أي توصية إنشائية (سُمك حوائط حاملة، أحمال، أساسات، تسليح).
 * © 2026 أحمد حسن عبدالله
 */
(function () {
  'use strict';
  var C = window.MasonCalc, K = window.MasonCatalog;
  var DB_KEY = 'hmas_db_v1', SET_KEY = 'hmas_settings_v1';
  var SECTION = 'masonry', SECTION_NAME = 'البناء';
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ic(n) { return '<svg class="ic" aria-hidden="true"><use href="#i-' + n + '"/></svg>'; }
  function uid(p) { return (p || '') + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function loadJSON(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } }
  function arr(x) { return Array.isArray(x) ? x : []; }
  function clone(x) { return JSON.parse(JSON.stringify(x == null ? null : x)); }
  function v0(x) { return x == null ? '' : x; }
  function getPath(o, p) { return p.split('.').reduce(function (a, k) { return a == null ? undefined : a[k]; }, o); }
  function setPath(o, p, v) { var ks = p.split('.'), last = ks.pop(); ks.forEach(function (k) { if (!o[k] || typeof o[k] !== 'object') o[k] = {}; o = o[k]; }); o[last] = v; }

  // ---------------- البيانات ----------------
  function normJob(j) {
    j.items = arr(j.items); j.costs = arr(j.costs); j.payments = arr(j.payments);
    j.discount = j.discount && typeof j.discount === 'object' ? j.discount : { type: 'amount', value: 0 };
    return j;
  }
  function normDb(d) {
    d = d && typeof d === 'object' ? d : {};
    return { v: 1, seq: Number(d.seq) || 0, customers: arr(d.customers), jobs: arr(d.jobs).map(normJob) };
  }
  var db = normDb(loadJSON(DB_KEY, null));
  var settings = loadJSON(SET_KEY, {}) || {};
  ['business', 'lastPrice'].forEach(function (k) { if (!settings[k] || typeof settings[k] !== 'object') settings[k] = {}; });
  ['workers'].forEach(function (k) { settings[k] = arr(settings[k]); });
  if (!settings.costNames || typeof settings.costNames !== 'object') settings.costNames = {};
  function saveDb() { try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch (e) { toast('تعذر الحفظ: مساحة التخزين ممتلئة'); } }
  function saveSettings() { try { localStorage.setItem(SET_KEY, JSON.stringify(settings)); } catch (e) { toast('تعذر الحفظ: مساحة التخزين ممتلئة'); } }
  function getJob(id) { return db.jobs.find(function (j) { return j.id === id; }) || null; }
  function getCust(id) { return db.customers.find(function (c) { return c.id === id; }) || null; }
  function jobsOf(cid) { return db.jobs.filter(function (j) { return j.customerId === cid; }); }
  function custName(j) { var c = j && getCust(j.customerId); return c ? c.name : 'حساب سريع'; }
  function touch(j) { j.updatedAt = new Date().toISOString(); }
  function pad(n) { return String(n).padStart(4, '0'); }

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
  var UNIT_LBL = { mm: 'مم', cm: 'سم', m: 'م' };

  // ---------------- التاريخ والرسائل ----------------
  function today() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function fmtDate(s) { return s ? String(s).slice(0, 10).split('-').join('/') : ''; }
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

  // ---------------- التنقل ----------------
  var currentView = 'home', pickInvoice = false;
  var jobFilter = { q: '', f: 'all', cust: '', from: '', to: '' };
  function switchView(v) {
    currentView = v;
    ['home', 'jobs', 'customers', 'more'].forEach(function (n) { $('view-' + n).classList.toggle('active', n === v); $('navBtn-' + n).classList.toggle('active', n === v); });
    if (v !== 'jobs') setPick(false);
    renderView(); window.scrollTo(0, 0);
  }
  function setPick(on) { pickInvoice = on; $('pickBar').classList.toggle('hidden', !on); }
  function renderView() { if (currentView === 'home') renderHome(); else if (currentView === 'jobs') renderJobs(); else if (currentView === 'customers') renderCustomers(); else renderMore(); }
  function refresh() {
    renderView();
    if ($('jobPage').classList.contains('open') && openJobId) renderJob(openJobId);
    if ($('custPage').classList.contains('open') && openCustId) renderCust(openCustId);
    if ($('toolPage').classList.contains('open') && tool) renderTool();
    if ($('itemPage').classList.contains('open') && E) updateItemLive();
  }

  // ---------------- الكروت ----------------
  var STATUS = { quote: ['عرض سعر', 'paused'], active: ['جاري', 'active'], done: ['خلصان', 'done'] };
  function jobCard(j, act) {
    var r = C.job(j);
    var cats = [];
    j.items.forEach(function (it) { var l = KINDS[it.kind] ? KINDS[it.kind].label : ''; if (l && cats.indexOf(l) < 0) cats.push(l); });
    var st = STATUS[j.status] || STATUS.active;
    var amt = r.remaining > 0.005 && j.status !== 'quote' ? '<small class="due">باقي ' + esc(money(r.remaining)) + '</small>' : (r.total > 0 && j.status !== 'quote' ? '<small class="ok">خالص</small>' : '<small>—</small>');
    return '<div class="inv-card" data-act="' + (act || (pickInvoice ? 'pickedInvoice' : 'openJob')) + '" data-id="' + esc(j.id) + '">'
      + '<div class="inv-avatar">' + esc((custName(j) || '؟').trim().charAt(0)) + '</div>'
      + '<div class="inv-info"><div class="n">' + esc(custName(j)) + '<span class="status-badge ' + st[1] + '">' + st[0] + '</span></div>'
      + '<div class="m">' + esc([j.title, j.number, fmtDate(j.date), j.items.length + ' بند'].filter(Boolean).join(' · ')) + '</div>'
      + (cats.length ? '<div class="job-kinds">' + cats.slice(0, 4).map(function (c) { return '<span class="kind-tag">' + esc(c) + '</span>'; }).join('') + '</div>' : '') + '</div>'
      + '<div class="inv-amount">' + esc(money(r.total)) + amt + '</div></div>';
  }
  function custCard(c) {
    var js = jobsOf(c.id), due = 0, tot = 0;
    js.forEach(function (j) { if (j.status === 'quote') return; var r = C.job(j); due += r.remaining; tot += r.total; });
    return '<div class="cust-card" data-act="openCust" data-id="' + esc(c.id) + '"><div class="inv-avatar">' + esc((c.name || '؟').trim().charAt(0)) + '</div>'
      + '<div class="inv-info"><div class="n">' + esc(c.name) + '</div><div class="m">' + esc([c.phone, js.length + ' مشروع'].filter(Boolean).join(' · ')) + '</div></div>'
      + '<div class="cust-amt ' + (due > 0.005 ? 'due' : 'ok') + '">' + esc(money(Math.max(due, 0))) + '<small>' + (due > 0.005 ? 'متبقي' : (tot ? 'خالص' : '—')) + '</small></div></div>';
  }
  function sortedJobs() { return db.jobs.slice().sort(function (a, b) { return String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)); }); }
  function row(l, v, cls) { return '<div class="sum-row' + (cls ? ' ' + cls : '') + '"><span>' + esc(l) + '</span><strong>' + esc(v) + '</strong></div>'; }

  // ---------------- الرئيسية ----------------
  function renderHome() {
    var due = 0, active = 0, month = 0, ym = today().slice(0, 7);
    db.jobs.forEach(function (j) {
      if (j.status === 'quote') return;
      var r = C.job(j);
      if (r.remaining > 0) due += r.remaining;
      if (j.status !== 'done') active++;
      if (String(j.date || '').slice(0, 7) === ym) month += r.total;
    });
    $('homeDue').textContent = fmt(due); $('homeActive').textContent = active; $('homeCust').textContent = db.customers.length; $('homeMonth').textContent = fmt(month, 0);
    Array.prototype.forEach.call(document.querySelectorAll('.cur'), function (el) { el.textContent = cur().sym; });
    $('catTiles').innerHTML = TOOLS.map(function (t) {
      return '<button type="button" class="t-tile" data-act="quickKind" data-kind="' + t[0] + '"><span class="q-ic orange-soft">' + ic(t[2]) + '</span><b>' + esc(t[1]) + '</b><small>' + esc(t[3]) + '</small></button>';
    }).join('');
    var rec = sortedJobs().slice(0, 4);
    $('homeRecent').innerHTML = rec.length ? rec.map(function (j) { return jobCard(j); }).join('') : '<div class="home-empty">لسه مفيش مشاريع. ابدأ بـ «مشروع جديد» أو اختار نوع الشغل من فوق.</div>';
    var h = new Date().getHours();
    $('greetLine').textContent = (h < 12 ? 'صباح الخير' : 'مساء الخير') + ' — البناء';
  }

  // ---------------- المشاريع ----------------
  function matchJob(j) {
    var r = C.job(j);
    if (jobFilter.f === 'active' && (j.status === 'done' || j.status === 'quote')) return false;
    if (jobFilter.f === 'done' && j.status !== 'done') return false;
    if (jobFilter.f === 'quote' && j.status !== 'quote') return false;
    if (jobFilter.f === 'due' && !(r.remaining > 0.005 && j.status !== 'quote')) return false;
    if (jobFilter.cust && j.customerId !== jobFilter.cust) return false;
    if (jobFilter.from && String(j.date || '') < jobFilter.from) return false;
    if (jobFilter.to && String(j.date || '') > jobFilter.to) return false;
    var q = jobFilter.q.trim();
    if (q) {
      var c = getCust(j.customerId) || {};
      var hay = [c.name, c.phone, j.title, j.number, j.notes].concat(j.items.map(function (it) {
        return [itemTitle(it), it.notes, it.stoneName, KINDS[it.kind] ? KINDS[it.kind].label : ''].concat(arr(it.walls).map(function (w) { return w.name + ' ' + (w.brick && w.brick.name); }), arr(it.surfaces).map(function (s) { return s.name; })).join(' ');
      }), j.costs.map(function (k) { return k.name; })).join(' ');
      if (hay.indexOf(q) < 0) return false;
    }
    return true;
  }
  function renderJobs() {
    var sel = $('jobCust'), keep = jobFilter.cust;
    sel.innerHTML = '<option value="">كل العملاء</option>' + db.customers.slice().sort(function (a, b) { return a.name.localeCompare(b.name, 'ar'); }).map(function (c) { return '<option value="' + esc(c.id) + '">' + esc(c.name) + '</option>'; }).join('');
    sel.value = keep;
    Array.prototype.forEach.call($('jobFilters').children, function (b) { b.classList.toggle('on', b.dataset.f === jobFilter.f); });
    var list = sortedJobs().filter(matchJob), tot = 0, due = 0;
    list.forEach(function (j) { if (j.status === 'quote') return; var r = C.job(j); tot += r.total; due += Math.max(r.remaining, 0); });
    $('jobSum').innerHTML = list.length ? '<span><b>' + list.length + '</b> مشروع</span>·<span>الإجمالي <b>' + esc(money(tot)) + '</b></span>·<span>المتبقي <b>' + esc(money(due)) + '</b></span>' : '';
    $('jobList').innerHTML = list.length ? list.map(function (j) { return jobCard(j); }).join('')
      : (db.jobs.length ? '<div class="home-empty">مفيش مشاريع بالفلترة دي</div>' : '<div class="empty"><div class="big">' + ic('file') + '</div><p>لسه مفيش مشاريع</p><button type="button" class="btn btn-accent" data-act="newJob">' + ic('plus') + ' مشروع جديد</button></div>');
  }
  $('jobSearch').addEventListener('input', function () { jobFilter.q = this.value; renderJobs(); });
  $('jobFilters').addEventListener('click', function (e) { var b = e.target.closest('[data-f]'); if (!b) return; jobFilter.f = b.dataset.f; renderJobs(); });
  $('jobCust').addEventListener('change', function () { jobFilter.cust = this.value; renderJobs(); });
  $('jobFrom').addEventListener('change', function () { jobFilter.from = this.value; renderJobs(); });
  $('jobTo').addEventListener('change', function () { jobFilter.to = this.value; renderJobs(); });

  // ---------------- العملاء ----------------
  function renderCustomers() {
    var q = ($('custSearch').value || '').trim();
    var list = db.customers.filter(function (c) { return !q || (c.name + ' ' + (c.phone || '')).indexOf(q) >= 0; }).sort(function (a, b) { return String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)); });
    $('custList').innerHTML = list.length ? list.map(custCard).join('') : '<div class="home-empty">' + (db.customers.length ? 'مفيش عميل بالاسم ده' : 'لسه مفيش عملاء — العميل بيتضاف لوحده أول ما تعمله مشروع') + '</div>';
  }
  $('custSearch').addEventListener('input', renderCustomers);

  // ---------------- المزيد ----------------
  function renderMore() {
    $('currencySelect').value = cur().code; applyTheme();
    $('bizName').value = settings.business.name || ''; $('bizPhone').value = settings.business.phone || '';
    $('bizAddress').value = settings.business.address || ''; $('bizTerms').value = settings.terms || '';
    $('moreLib').textContent = bricks().length + ' نوع طوب في مكتبتك';
    var tot = 0, cost = 0, labor = 0, due = 0;
    db.jobs.forEach(function (j) { if (j.status === 'quote') return; var r = C.job(j); tot += r.total; cost += r.totalCost; labor += r.labor; due += Math.max(r.remaining, 0); });
    $('moreStats').innerHTML = row('عدد المشاريع', String(db.jobs.length)) + row('إجمالي المصنعية', money(labor)) + row('إجمالي قيمة المشاريع', money(tot))
      + row('التكاليف المسجلة', money(cost)) + '<div class="sum-row profit' + (tot - cost < 0 ? ' neg' : '') + '"><span>الربح التقديري</span><strong>' + esc(money(tot - cost)) + '</strong></div>' + row('المتبقي عند العملاء', money(due));
  }
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

  // ---------------- العملاء: إضافة وتعديل ----------------
  function findCustByName(name) { var n = String(name || '').trim(); return db.customers.find(function (c) { return c.name.trim() === n; }) || null; }
  function ensureCustomer(name, phone) {
    var c = findCustByName(name);
    if (!c) { c = { id: uid('c'), name: String(name).trim(), phone: phone || '', address: '', note: '', createdAt: new Date().toISOString() }; db.customers.push(c); }
    else if (phone && !c.phone) c.phone = phone;
    c.updatedAt = new Date().toISOString();
    return c;
  }
  function bindCustSuggest() {
    var inp = $('f_cname'); if (!inp) return;
    inp.addEventListener('input', function () {
      var q = inp.value.trim();
      P().custName = inp.value;
      P().custId = (findCustByName(q) || {}).id || null;
      var list = q ? db.customers.filter(function (c) { return c.name.indexOf(q) >= 0 && c.name !== q; }).slice(0, 5) : [];
      $('f_csug').innerHTML = list.length ? '<div class="suggest">' + list.map(function (c) {
        return '<button type="button" data-act="pickCust" data-id="' + esc(c.id) + '"><span class="s-av">' + esc(c.name.charAt(0)) + '</span><span>' + esc(c.name) + '<small>' + esc(c.phone || '') + '</small></span></button>';
      }).join('') + '</div>' : '';
      renderTargetJobs();
    });
  }
  function renderTargetJobs() {
    var box = $('f_target'); if (!box) return;
    var ps = P(), c = ps.custId ? getCust(ps.custId) : null;
    var act = c ? jobsOf(c.id).filter(function (j) { return j.status !== 'done'; }) : [];
    if (!act.length) { ps.targetJob = null; box.innerHTML = ''; return; }
    if (ps.targetJob && !act.some(function (j) { return j.id === ps.targetJob; })) ps.targetJob = null;
    box.innerHTML = '<label class="mini-lbl" style="margin-top:8px">ضيف البند على</label><div class="chips wrap">'
      + '<button type="button" class="chip' + (!ps.targetJob ? ' on' : '') + '" data-act="target" data-id="">مشروع جديد</button>'
      + act.map(function (j) { return '<button type="button" class="chip' + (ps.targetJob === j.id ? ' on' : '') + '" data-act="target" data-id="' + esc(j.id) + '">' + esc((j.title || 'مشروع') + ' ' + j.number) + '</button>'; }).join('') + '</div>';
  }
  function openCustomerSheet(id) {
    var c = id ? getCust(id) : {};
    openSheet(id ? 'تعديل بيانات العميل' : 'عميل جديد',
      '<div class="field"><label for="f_cn">اسم العميل</label><input type="text" id="f_cn" value="' + esc(c.name || '') + '" autocomplete="off"></div>'
      + '<div class="row-2"><div class="field"><label for="f_cp">التليفون</label><input type="text" id="f_cp" inputmode="tel" dir="ltr" value="' + esc(c.phone || '') + '"></div>'
      + '<div class="field"><label for="f_ca">العنوان</label><input type="text" id="f_ca" value="' + esc(c.address || '') + '"></div></div>'
      + '<div class="field"><label for="f_cnote">ملحوظة</label><input type="text" id="f_cnote" value="' + esc(c.note || '') + '"></div>'
      + '<button type="button" class="btn btn-primary" data-act="saveCustomer">' + ic('check') + ' حفظ</button>', { custEdit: id || null });
  }
  function saveCustomer() {
    var name = $('f_cn').value.trim();
    if (!name) { toast('اكتب اسم العميل'); return; }
    var other = findCustByName(name);
    if (other && other.id !== S.custEdit) { toast('فيه عميل بنفس الاسم'); return; }
    var c = S.custEdit ? getCust(S.custEdit) : null, isNew = !c;
    if (!c) { c = { id: uid('c'), createdAt: new Date().toISOString() }; db.customers.push(c); }
    c.name = name; c.phone = $('f_cp').value.trim(); c.address = $('f_ca').value.trim(); c.note = $('f_cnote').value.trim(); c.updatedAt = new Date().toISOString();
    saveDb();
    closeTop(function () { refresh(); toast('اتحفظ'); if (isNew) openCust(c.id); });
  }

  // ---------------- مشروع جديد ----------------
  function newJobRecord(cust, title, date, status) {
    db.seq = (Number(db.seq) || 0) + 1;
    var now = new Date().toISOString();
    var j = normJob({ id: uid('j'), number: 'BLD-' + pad(db.seq), customerId: cust ? cust.id : '', title: title || '', date: date || today(), status: status || 'active', notes: '', costsComplete: false, createdAt: now, updatedAt: now });
    db.jobs.push(j);
    return j;
  }
  function custPickHTML(withTarget) {
    return '<div class="field"><label for="f_cname">اسم العميل</label><input type="text" id="f_cname" autocomplete="off" placeholder="اكتب الاسم أو اختار عميل موجود" value="' + esc(S.custName || '') + '"><div id="f_csug"></div></div>'
      + '<div class="field" style="margin-bottom:' + (withTarget ? '0' : '12px') + '"><label for="f_jtitle">اسم المشروع (اختياري)</label><input type="text" id="f_jtitle" placeholder="مثلاً: تجهيز شقة المعادي" value="' + esc(S.jobTitle || '') + '"></div>'
      + (withTarget ? '<div id="f_target"></div>' : '');
  }
  function openNewJobSheet(cid) {
    var c = cid ? getCust(cid) : null;
    openSheet('مشروع جديد', custPickHTML(false)
      + '<div class="row-2"><div class="field"><label for="f_cphone">التليفون (اختياري)</label><input type="text" id="f_cphone" inputmode="tel" dir="ltr" value="' + esc(c ? c.phone || '' : '') + '"></div>'
      + '<div class="field"><label for="f_date">التاريخ</label><input type="date" id="f_date" value="' + today() + '"></div></div>'
      + '<label class="bill-toggle" style="margin:0 0 12px"><span>لسه عرض سعر (مش متأكد)</span><input type="checkbox" id="f_quote"></label>'
      + '<button type="button" class="btn btn-accent" data-act="createJob">' + ic('check') + ' ابدأ المشروع</button>', { custId: c ? c.id : null });
    if (c) $('f_cname').value = c.name;
    bindCustSuggest();
  }
  function createJob() {
    var name = $('f_cname').value.trim();
    if (!name) { toast('اكتب اسم العميل'); $('f_cname').focus(); return; }
    var c = ensureCustomer(name, $('f_cphone').value.trim());
    var j = newJobRecord(c, $('f_jtitle').value.trim(), $('f_date').value || today(), $('f_quote').checked ? 'quote' : 'active');
    saveDb();
    closeTop(function () { refresh(); openJob(j.id); });
  }

  // ====================================================================
  // الأدوات والبنود: حوائط (طوب/بلوك/غرف) — مونة — محارة — أرضيات — حجر — تكسير — مصنعية
  // كل أداة بتظهر خاناتها بس، والنتيجة بتتحدث مع كل رقم، وبتتحفظ في مشروع (أو «حساب سريع» من غير عميل)
  // ====================================================================
  var KINDS = {
    walls: { label: 'بناء حوائط', icon: 'brick', labor: ['sqm', 'm3', 'brick', 'lm', 'lump', 'daily', 'stages'] },
    mortar: { label: 'مونة وأسمنت ورمل', icon: 'bucket', labor: ['lump', 'daily', 'm3'] },
    plaster: { label: 'محارة وتلييس', icon: 'trowel', labor: ['sqm', 'lump', 'daily', 'stages'] },
    floor: { label: 'أرضيات وتسوية', icon: 'layers', labor: ['sqm', 'm3', 'lump', 'daily'] },
    stone: { label: 'حجر وواجهات', icon: 'stone', labor: ['sqm', 'lm', 'piece', 'lump', 'daily'] },
    demo: { label: 'تكسير وترميم', icon: 'hammer', labor: ['sqm', 'm3', 'piece', 'lump', 'daily'] },
    labor: { label: 'مصنعية', icon: 'cash', labor: ['sqm', 'm3', 'brick', 'lm', 'piece', 'lump', 'daily', 'stages'] }
  };
  var TOOLS = [
    ['walls', 'حاسبة الطوب', 'brick', 'عدد الطوب والمونة'], ['block', 'حاسبة البلوك', 'block', 'أسمنتي وأبيض وخفيف'], ['rooms', 'حصر غرفة أو شقة', 'room', 'حوائط وفتحات'],
    ['mortar', 'المونة والأسمنت والرمل', 'bucket', 'خلطة وشكاير ورمل'], ['plaster', 'المحارة والتلييس', 'trowel', 'حوائط وأسقف وواجهات'], ['stone', 'الحجر والواجهات', 'stone', 'م² وم.ط وقطعة'],
    ['floor', 'الأرضيات والتسوية', 'layers', 'طبقات بسمكها'], ['demo', 'التكسير والترميم', 'hammer', 'م² وم³ ويومية'], ['labor', 'المصنعية', 'cash', 'كل طرق الحساب']
  ];
  function bricks() { if (!Array.isArray(settings.bricks)) settings.bricks = clone(K.SEEDS); return settings.bricks; }
  function brickById(id) { return bricks().find(function (b) { return b.id === id; }) || null; }
  function isBlock(b) { return /بلوك|AAC|أبيض/.test(b.name || '') || b.group === 'light'; }
  function defaultBrick(block) {
    var list = bricks(), last = brickById(block ? settings.lastBlockId : settings.lastBrickId);
    if (last) return clone(last);
    var b = list.find(function (x) { return block ? isBlock(x) : !isBlock(x); }) || list[0];
    return b ? clone(b) : { id: '', name: 'طوب', L: '', W: '', H: '', unit: 'cm' };
  }
  function newWall(it, n) { var b = it.block ? defaultBrick(true) : defaultBrick(false); return { name: 'حائط ' + n, kind: '', L: '', H: '', count: '1', brick: b, layout: 'half', openings: [] }; }
  function blankMix() { return clone(settings.lastMix || { c: '', l: '', s: '', dryFactor: '', density: '', bagKg: '', wc: '' }); }
  function blankPrices() { return clone(settings.prices || { cement: '', cementUnit: 'bag', sand: '', sandUnit: 'm3', loadM3: '', lime: '', extra: '' }); }
  function blankKind(kind, opts) {
    opts = opts || {};
    var it = { kind: kind, title: '', dimUnit: 'm', extras: [], matBilled: false, notes: '', mixSpec: blankMix(), prices: blankPrices() };
    if (kind === 'walls') {
      it.block = !!opts.block; it.jh = settings.lastJoint || ''; it.jv = settings.lastJoint || ''; it.countMethod = 'area';
      it.walls = [newWall(it, 1)]; it.waste = { mode: 'none', pct: '', qty: {} };
      it.mortar = { method: it.block ? 'rate' : 'auto', type: it.block ? 'لاصق بلوك' : 'مونة أسمنت ورمل', basis: 'm2', rate: '', manual: '', wastePct: '' };
      it.labor = { method: 'sqm', price: '' };
    } else if (kind === 'mortar') { it.mortar = { method: 'manual', type: 'مونة أسمنت ورمل', manual: '', area: '', rate: '', volume: '', pctOfVolume: '', wastePct: '' }; it.labor = { method: 'lump' }; }
    else if (kind === 'plaster') { it.surfaces = [{ name: 'حائط 1', kind: 'حائط', L: '', H: '', count: '1', openings: [] }]; it.thickness = ''; it.matMethod = 'mix'; it.rates = { cement: '', sand: '' }; it.wastePct = ''; it.labor = { method: 'sqm', price: '' }; }
    else if (kind === 'floor') { it.zones = [{ name: 'منطقة 1', L: '', W: '', count: '1' }]; it.layers = [{ name: 'طبقة 1', material: '', thickness: '', method: 'm3', price: '', c: '', s: '', rate: '', rateUnit: '', wastePct: '' }]; it.labor = { method: 'sqm', price: '' }; }
    else if (kind === 'stone') { it.stoneName = ''; it.unit = 'sqm'; it.pieces = ''; it.surfaces = [{ name: 'واجهة 1', kind: 'واجهة', L: '', H: '', count: '1', openings: [] }]; it.wastePct = ''; it.stonePrice = ''; it.mortarCost = ''; it.labor = { method: 'sqm', price: '' }; }
    else if (kind === 'demo') { it.title = ''; it.L = ''; it.H = ''; it.T = ''; it.count = '1'; it.repairCost = ''; it.labor = { method: 'sqm', price: '' }; }
    else { it.sqm = ''; it.m3 = ''; it.bricks = ''; it.lm = ''; it.pieces = ''; it.labor = { method: 'stages', stages: STAGES_INIT() }; }
    return it;
  }
  function STAGES_INIT() { return [{ name: '', amount: '' }]; }
  function itemTitle(it) {
    if (it.title) return it.title;
    if (it.kind === 'walls') return it.block ? 'حوائط بلوك' : 'بناء حوائط';
    if (it.kind === 'stone') return it.stoneName || 'حجر وواجهات';
    return KINDS[it.kind] ? KINDS[it.kind].label : 'بند';
  }

  // ---------------- صفحة الأداة / البند ----------------
  var E = null; // حالة البند المفتوح
  function openItem(opts) {
    var job = opts.jobId ? getJob(opts.jobId) : null;
    var src = job && opts.itemId ? job.items.find(function (x) { return x.id === opts.itemId; }) : null;
    var kind = opts.kind === 'block' || opts.kind === 'rooms' ? 'walls' : opts.kind;
    E = { jobId: job ? job.id : null, itemId: src ? src.id : null, it: src ? clone(src) : blankKind(kind || 'walls', { block: opts.kind === 'block' }), custName: '', jobTitle: '', custId: null, targetJob: null };
    renderItemPage();
    var el = $('itemPage'); el.classList.add('open'); el.scrollTop = 0;
    pushLayer({ type: 'page', hide: function () { el.classList.remove('open'); E = null; } });
    if (opts.kind === 'rooms') openRoomSheet();
  }
  function F(path, label, o) {
    o = o || {};
    var v = getPath(E.it, path);
    return '<div class="field' + (o.cls ? ' ' + o.cls : '') + '"><label>' + esc(label) + (o.unit ? ' <small class="u-lbl">(' + esc(o.unit) + ')</small>' : '') + '</label>'
      + (o.long ? '<textarea data-k="' + path + '" placeholder="' + esc(o.ph || '') + '">' + esc(v0(v)) + '</textarea>'
        : '<input type="text" data-k="' + path + '"' + (o.num ? ' inputmode="decimal" dir="ltr" placeholder="' + esc(o.ph || '0') + '"' : ' placeholder="' + esc(o.ph || '') + '"') + ' value="' + esc(v0(v)) + '" autocomplete="off">') + (o.after || '') + '</div>';
  }
  function SEG(path, opts, cls) {
    var cur = getPath(E.it, path);
    return '<div class="segmented ' + (cls || ('seg-' + Math.min(opts.length, 4))) + ' seg-sm">' + opts.map(function (o) { return '<button type="button" class="' + (String(cur) === String(o[0]) ? 'on' : '') + '" data-act="setK" data-k="' + path + '" data-v="' + esc(o[0]) + '">' + esc(o[1]) + '</button>'; }).join('') + '</div>';
  }
  function CHIPS(list, path, cls) { return list.length ? '<div class="unit-chips">' + list.map(function (v) { var val = Array.isArray(v) ? v[0] : v, lbl = Array.isArray(v) ? v[1] : v; return '<button type="button" class="chip' + (cls ? ' ' + cls : '') + '" data-act="setK" data-k="' + path + '" data-v="' + esc(val) + '">' + esc(lbl) + '</button>'; }).join('') + '</div>' : ''; }
  function chipsHTML(list, act, extra) { return list.length ? '<div class="unit-chips">' + list.map(function (v) { return '<button type="button" class="chip" data-act="' + act + '" data-v="' + esc(v) + '"' + (extra || '') + '>' + esc(v) + '</button>'; }).join('') + '</div>' : ''; }
  function card(title, icon, body, extra) { return '<div class="card"' + (extra || '') + '><div class="card-title"><span class="t-ic">' + ic(icon) + '</span><h2>' + esc(title) + '</h2></div>' + body + '</div>'; }
  function brickOptions(sel) {
    return K.GROUPS.map(function (g) {
      var l = bricks().filter(function (b) { return (b.group || 'clay') === g.id; }); if (!l.length) return '';
      return '<optgroup label="' + esc(g.label) + '">' + l.map(function (b) { return '<option value="' + esc(b.id) + '"' + (b.id === sel ? ' selected' : '') + '>' + esc(b.name + ' ' + fq(C.num(b.L)) + '×' + fq(C.num(b.W)) + '×' + fq(C.num(b.H)) + ' ' + (b.unit === 'mm' ? 'مم' : 'سم')) + '</option>'; }).join('') + '</optgroup>';
    }).join('');
  }
  function openingsHTML(base, list) {
    return '<div class="open-rows">' + list.map(function (o, j) {
      var p = base + '.' + j;
      return '<div class="task-row cols-4"><input type="text" data-k="' + p + '.name" value="' + esc(v0(o.name)) + '" placeholder="الفتحة">'
        + '<input type="text" inputmode="decimal" dir="ltr" data-k="' + p + '.w" value="' + esc(v0(o.w)) + '" placeholder="عرض">'
        + '<input type="text" inputmode="decimal" dir="ltr" data-k="' + p + '.h" value="' + esc(v0(o.h)) + '" placeholder="ارتفاع">'
        + '<input type="text" inputmode="decimal" dir="ltr" data-k="' + p + '.count" value="' + esc(v0(o.count)) + '" placeholder="عدد">'
        + '<button type="button" class="btn btn-danger btn-icon" data-act="delAt" data-path="' + base + '" data-i="' + j + '" aria-label="حذف">' + ic('x') + '</button></div>';
    }).join('') + '</div><div class="unit-chips">' + K.OPENINGS.map(function (n) { return '<button type="button" class="chip" data-act="addOpening" data-path="' + base + '" data-v="' + esc(n) + '">+ ' + esc(n) + '</button>'; }).join('') + '</div>';
  }
  function wallCard(w, i) {
    var p = 'walls.' + i, u = UNIT_LBL[E.it.dimUnit];
    return '<div class="sub-card wall-card"><div class="sc-head"><span class="room-num">' + (i + 1) + '</span><input type="text" class="grow" data-k="' + p + '.name" value="' + esc(v0(w.name)) + '">'
      + '<button type="button" class="btn btn-ghost btn-icon" data-act="dupAt" data-path="walls" data-i="' + i + '" aria-label="تكرار">' + ic('copy') + '</button>'
      + (E.it.walls.length > 1 ? '<button type="button" class="btn btn-danger btn-icon" data-act="delAt" data-path="walls" data-i="' + i + '" aria-label="حذف">' + ic('x') + '</button>' : '') + '</div>'
      + CHIPS(K.WALL_KINDS, p + '.kind')
      + '<div class="grid-3 mini"><div><span class="mini-lbl">الطول (' + u + ')</span><input type="text" inputmode="decimal" dir="ltr" data-k="' + p + '.L" value="' + esc(v0(w.L)) + '"></div>'
      + '<div><span class="mini-lbl">الارتفاع (' + u + ')</span><input type="text" inputmode="decimal" dir="ltr" data-k="' + p + '.H" value="' + esc(v0(w.H)) + '"></div>'
      + '<div><span class="mini-lbl">حوائط متطابقة</span><input type="text" inputmode="decimal" dir="ltr" data-k="' + p + '.count" value="' + esc(v0(w.count)) + '"></div></div>'
      + '<div class="mini" style="margin-top:8px"><span class="mini-lbl">نوع الطوب</span><select data-brick="' + i + '">' + brickOptions(w.brick && w.brick.id) + '<option value="__new">+ إضافة نوع طوب…</option></select></div>'
      + '<div class="grid-4 mini" style="margin-top:6px"><div><span class="mini-lbl">طول الطوبة</span><input type="text" inputmode="decimal" dir="ltr" data-k="' + p + '.brick.L" value="' + esc(v0(w.brick && w.brick.L)) + '"></div>'
      + '<div><span class="mini-lbl">عرضها</span><input type="text" inputmode="decimal" dir="ltr" data-k="' + p + '.brick.W" value="' + esc(v0(w.brick && w.brick.W)) + '"></div>'
      + '<div><span class="mini-lbl">ارتفاعها</span><input type="text" inputmode="decimal" dir="ltr" data-k="' + p + '.brick.H" value="' + esc(v0(w.brick && w.brick.H)) + '"></div>'
      + '<div><span class="mini-lbl">الوحدة</span><select data-k="' + p + '.brick.unit"><option value="cm"' + ((w.brick && w.brick.unit) !== 'mm' ? ' selected' : '') + '>سم</option><option value="mm"' + ((w.brick && w.brick.unit) === 'mm' ? ' selected' : '') + '>مم</option></select></div></div>'
      + '<div class="mini" style="margin-top:8px"><span class="mini-lbl">طريقة البناء (الوش اللي بيبان والسمك)</span><div class="chips wrap">' + C.LAYOUT_ORDER.map(function (l) { return '<button type="button" class="chip' + ((w.layout || 'half') === l ? ' on' : '') + '" data-act="setK" data-k="' + p + '.layout" data-v="' + l + '">' + esc(C.LAYOUTS[l].label) + '</button>'; }).join('') + '</div></div>'
      + '<p class="more-h">الفتحات (العرض × الارتفاع بالـ' + u + ')</p>' + openingsHTML(p + '.openings', w.openings || [])
      + '<div class="w-res" data-wres="' + i + '"></div></div>';
  }
  function surfaceCard(s, i, path, kinds) {
    var p = path + '.' + i, u = UNIT_LBL[E.it.dimUnit];
    return '<div class="sub-card"><div class="sc-head"><span class="room-num">' + (i + 1) + '</span><input type="text" class="grow" data-k="' + p + '.name" value="' + esc(v0(s.name)) + '">'
      + (E.it[path].length > 1 ? '<button type="button" class="btn btn-danger btn-icon" data-act="delAt" data-path="' + path + '" data-i="' + i + '" aria-label="حذف">' + ic('x') + '</button>' : '') + '</div>'
      + (kinds ? CHIPS(kinds, p + '.kind') : '')
      + '<div class="grid-3 mini"><div><span class="mini-lbl">الطول (' + u + ')</span><input type="text" inputmode="decimal" dir="ltr" data-k="' + p + '.L" value="' + esc(v0(s.L)) + '"></div>'
      + '<div><span class="mini-lbl">الارتفاع / العرض (' + u + ')</span><input type="text" inputmode="decimal" dir="ltr" data-k="' + p + '.H" value="' + esc(v0(s.H)) + '"></div>'
      + '<div><span class="mini-lbl">العدد</span><input type="text" inputmode="decimal" dir="ltr" data-k="' + p + '.count" value="' + esc(v0(s.count)) + '"></div></div>'
      + '<p class="more-h">الفتحات</p>' + openingsHTML(p + '.openings', s.openings || []) + '<div class="w-res" data-sres="' + i + '"></div></div>';
  }
  var MIX_SUG = { dryFactor: [['1.25', '1.25'], ['1.27', '1.27'], ['1.33', '1.33']], density: [['1440', '1440']], bagKg: [['50', '50 كجم'], ['25', '25 كجم']] };
  function mixHTML() {
    return card('الخلطة (بتكتبها إنت)', 'bucket',
      '<div class="grid-3">' + F('mixSpec.c', 'أسمنت', { num: true }) + F('mixSpec.l', 'جير', { num: true, ph: '—' }) + F('mixSpec.s', 'رمل', { num: true }) + '</div>'
      + '<p class="hint" style="margin:-6px 0 10px">نسبة الخلط بالحجم (مثلاً 1 أسمنت : 4 رمل). مفيش نسبة بتصلح لكل الشغل — حسب المواصفات أو المهندس.</p>'
      + '<div class="grid-3">' + F('mixSpec.dryFactor', 'معامل الحجم الجاف', { num: true, after: CHIPS(MIX_SUG.dryFactor, 'mixSpec.dryFactor') }) + F('mixSpec.density', 'كثافة الأسمنت (كجم/م³)', { num: true, after: CHIPS(MIX_SUG.density, 'mixSpec.density') }) + F('mixSpec.bagKg', 'وزن الشيكارة (كجم)', { num: true, after: CHIPS(MIX_SUG.bagKg, 'mixSpec.bagKg') }) + '</div>'
      + F('mixSpec.wc', 'نسبة المية للأسمنت بالوزن (اختياري)', { num: true, ph: '—' }));
  }
  function pricesHTML(withBricks) {
    var b = '';
    if (withBricks) {
      var seen = {};
      (E.it.walls || []).forEach(function (w) {
        var br = w.brick || {}, id = br.id || ('w' + br.name); if (seen[id]) return; seen[id] = 1;
        var i = E.it.walls.indexOf(w);
        b += '<div class="sub-card"><div class="sc-head"><b class="grow">' + esc(br.name || 'طوب') + '</b></div>'
          + '<div class="grid-3 mini"><div><span class="mini-lbl">السعر</span><input type="text" inputmode="decimal" dir="ltr" data-bp="' + i + '" data-f="price" value="' + esc(v0(br.price)) + '"></div>'
          + '<div><span class="mini-lbl">السعر لكل</span><select data-bp="' + i + '" data-f="priceUnit"><option value="piece"' + ((br.priceUnit || 'piece') === 'piece' ? ' selected' : '') + '>طوبة</option><option value="thousand"' + (br.priceUnit === 'thousand' ? ' selected' : '') + '>ألف طوبة</option><option value="pack"' + (br.priceUnit === 'pack' ? ' selected' : '') + '>بالتة / عبوة</option></select></div>'
          + '<div><span class="mini-lbl">عدد البالتة (اختياري)</span><input type="text" inputmode="decimal" dir="ltr" data-bp="' + i + '" data-f="perPack" value="' + esc(v0(br.perPack)) + '" placeholder="—"></div></div></div>';
      });
    }
    var hasMix = E.it.kind !== 'stone' && E.it.kind !== 'demo' && E.it.kind !== 'labor';
    return card('الأسعار', 'cash', b + (hasMix ? '<div class="row-2">' + F('prices.cement', 'سعر الأسمنت', { num: true, unit: cur().sym }) + '<div class="field"><label>لكل</label>' + SEG('prices.cementUnit', [['bag', 'شيكارة'], ['ton', 'طن']]) + '</div></div>'
      + '<div class="row-2">' + F('prices.sand', 'سعر الرمل', { num: true, unit: cur().sym }) + '<div class="field"><label>لكل</label>' + SEG('prices.sandUnit', [['m3', 'م³'], ['load', 'نقلة']]) + '</div></div>'
      + (E.it.prices && E.it.prices.sandUnit === 'load' ? F('prices.loadM3', 'النقلة فيها كام م³ (عندك)', { num: true }) : '')
      + '<div class="row-2">' + F('prices.lime', 'سعر الجير (م³)', { num: true, ph: '—' }) + F('prices.extra', 'مية وإضافات (مبلغ)', { num: true, ph: '—' }) + '</div>' : '')
      + '<label class="bill-toggle"><span>الخامات على حساب العميل (بتظهر في الفاتورة)</span><input type="checkbox" data-k="matBilled"' + (E.it.matBilled ? ' checked' : '') + '></label>');
  }
  function laborHTML() {
    var l = E.it.labor || {}, m = l.method, methods = KINDS[E.it.kind].labor, b = '<div class="chips wrap">' + methods.map(function (x) { return '<button type="button" class="chip' + (x === m ? ' on' : '') + '" data-act="setK" data-k="labor.method" data-v="' + x + '">' + esc(C.LABOR[x]) + '</button>'; }).join('') + '</div>';
    if (m === 'lump') b += F('labor.amount', 'قيمة المصنعية كلها', { num: true, unit: cur().sym });
    else if (m === 'daily') b += '<div class="grid-3">' + F('labor.days', 'الأيام', { num: true }) + F('labor.workers', 'العمال', { num: true }) + F('labor.price', 'اليومية', { num: true, unit: cur().sym }) + '</div><label class="check-row"><input type="checkbox" data-k="labor.perWorker"' + (l.perWorker !== false ? ' checked' : '') + '> اليومية لكل عامل (مش للفريق كله)</label>';
    else if (m === 'stages') b += '<div class="rows-ed">' + (l.stages || []).map(function (s, i) { return '<div class="task-row cols-2"><input type="text" data-k="labor.stages.' + i + '.name" value="' + esc(v0(s.name)) + '" placeholder="المرحلة"><input type="text" inputmode="decimal" dir="ltr" data-k="labor.stages.' + i + '.amount" value="' + esc(v0(s.amount)) + '" placeholder="المبلغ"><button type="button" class="btn btn-danger btn-icon" data-act="delAt" data-path="labor.stages" data-i="' + i + '">' + ic('x') + '</button></div>'; }).join('') + '</div>'
      + '<div class="unit-chips">' + K.STAGES.map(function (s) { return '<button type="button" class="chip" data-act="addStage" data-v="' + esc(s) + '">+ ' + esc(s) + '</button>'; }).join('') + '</div>';
    else if (m === 'piece' && E.it.kind !== 'labor' && E.it.kind !== 'stone') b += '<div class="row-2">' + F('labor.qty', 'العدد', { num: true }) + F('labor.price', 'سعر الوحدة', { num: true, unit: cur().sym }) + '</div>';
    else b += F('labor.price', { sqm: 'سعر المتر المربع', m3: 'سعر المتر المكعب', brick: 'سعر الطوبة', lm: 'سعر المتر الطولي', piece: 'سعر القطعة' }[m] || 'السعر', { num: true, unit: cur().sym });
    return card('المصنعية', 'cash', b + '<div class="calc-break" id="labBreak"></div>');
  }
  function extrasHTML() {
    return card('إضافات على البند (نقل، تحميل، معدات…)', 'plus', '<div class="rows-ed">' + (E.it.extras || []).map(function (x, i) {
      return '<div class="task-row cols-2"><input type="text" data-k="extras.' + i + '.name" value="' + esc(v0(x.name)) + '" placeholder="الإضافة"><input type="text" inputmode="decimal" dir="ltr" data-k="extras.' + i + '.amount" value="' + esc(v0(x.amount)) + '" placeholder="المبلغ"><button type="button" class="btn btn-danger btn-icon" data-act="delAt" data-path="extras" data-i="' + i + '">' + ic('x') + '</button></div>';
    }).join('') + '</div><div class="unit-chips">' + ['نقل', 'تحميل وتنزيل', 'نقل مخلفات', 'معدات'].map(function (n) { return '<button type="button" class="chip" data-act="addExtra" data-v="' + n + '">+ ' + n + '</button>'; }).join('') + '</div>'
      + '<p class="hint">الإضافات بتظهر للعميل في الفاتورة.</p>');
  }
  function kindBody() {
    var it = E.it, k = it.kind, u = it.dimUnit, b = '';
    var unitSeg = '<div class="field"><label>وحدة المقاسات</label>' + SEG('dimUnit', [['mm', 'مليمتر'], ['cm', 'سنتيمتر'], ['m', 'متر']], 'seg-3') + '</div>';
    if (k === 'walls') {
      b += card(it.block ? 'حوائط البلوك' : 'الحوائط', it.block ? 'block' : 'brick', unitSeg
        + '<div class="row-2">' + F('jh', 'العرموس الأفقي', { num: true, unit: 'سم' }) + F('jv', 'العرموس الرأسي', { num: true, unit: 'سم' }) + '</div>'
        + '<div class="field"><label>طريقة حساب العدد</label>' + SEG('countMethod', [['area', 'بالمساحة'], ['volume', 'بالحجم (تقديري)']]) + '</div>'
        + it.walls.map(wallCard).join('')
        + '<div class="btn-row"><button type="button" class="btn btn-ghost btn-sm" data-act="addWall">' + ic('plus') + ' حائط</button><button type="button" class="btn btn-ghost btn-sm" data-act="addRoom">' + ic('room') + ' غرفة (4 حوائط)</button></div>');
      b += card('الهالك', 'box', SEG('waste.mode', [['none', 'من غير هالك'], ['pct', 'نسبة %'], ['qty', 'كمية يدوي']], 'seg-3') + '<div id="wasteFields"></div>');
      b += card('المونة', 'bucket', CHIPS(K.MORTAR_TYPES, 'mortar.type', 'small') + '<div class="field"><label>طريقة تقدير المونة</label>' + SEG('mortar.method', [['auto', 'من الحوائط'], ['rate', 'معدل استهلاك'], ['manual', 'حجم يدوي']], 'seg-3') + '</div>'
        + (it.mortar.method === 'rate' ? '<div class="row-2">' + F('mortar.rate', 'المعدل (م³)', { num: true }) + '<div class="field"><label>لكل</label>' + SEG('mortar.basis', [['m2', 'م² حائط'], ['thousand', '1000 طوبة']]) + '</div></div>' : '')
        + (it.mortar.method === 'manual' ? F('mortar.manual', 'حجم المونة', { num: true, unit: 'م³' }) : '')
        + F('mortar.wastePct', 'هالك المونة % (اختياري)', { num: true, ph: '—' }));
      b += mixHTML() + pricesHTML(true);
    } else if (k === 'mortar') {
      b += card('حجم المونة', 'bucket', CHIPS(K.MORTAR_TYPES, 'mortar.type', 'small') + SEG('mortar.method', [['manual', 'حجم يدوي'], ['rate', 'مساحة × معدل'], ['volume', 'نسبة من حجم البناء']], 'seg-3')
        + (it.mortar.method === 'manual' ? F('mortar.manual', 'حجم المونة', { num: true, unit: 'م³' }) : it.mortar.method === 'rate' ? '<div class="row-2">' + F('mortar.area', 'المساحة', { num: true, unit: 'م²' }) + F('mortar.rate', 'المعدل لكل م²', { num: true, unit: 'م³' }) + '</div>'
          : '<div class="row-2">' + F('mortar.volume', 'حجم البناء', { num: true, unit: 'م³' }) + F('mortar.pctOfVolume', 'المونة كام % منه', { num: true }) + '</div>')
        + F('mortar.wastePct', 'هالك المونة % (اختياري)', { num: true, ph: '—' }));
      b += mixHTML() + pricesHTML(false);
    } else if (k === 'plaster') {
      b += card('المساحات', 'trowel', unitSeg + it.surfaces.map(function (s, i) { return surfaceCard(s, i, 'surfaces', K.SURFACE_KINDS); }).join('') + '<button type="button" class="btn btn-ghost btn-sm" data-act="addSurface">' + ic('plus') + ' مساحة</button>');
      b += card('السمك والخامات', 'bucket', '<div class="row-2">' + F('thickness', 'سمك المحارة', { num: true, unit: 'سم' }) + F('wastePct', 'الهالك %', { num: true, ph: '—' }) + '</div>'
        + SEG('matMethod', [['mix', 'بالخلطة'], ['rate', 'معدل استهلاك لكل م²']])
        + (it.matMethod === 'rate' ? '<div class="row-2" style="margin-top:10px">' + F('rates.cement', 'شكاير أسمنت لكل م²', { num: true }) + F('rates.sand', 'رمل م³ لكل م²', { num: true }) + '</div>' : ''));
      if (it.matMethod !== 'rate') b += mixHTML();
      b += pricesHTML(false);
    } else if (k === 'floor') {
      b += card('المناطق', 'layers', unitSeg + '<div class="rows-ed">' + it.zones.map(function (z, i) {
        return '<div class="task-row cols-4"><input type="text" data-k="zones.' + i + '.name" value="' + esc(v0(z.name)) + '"><input type="text" inputmode="decimal" dir="ltr" data-k="zones.' + i + '.L" value="' + esc(v0(z.L)) + '" placeholder="طول"><input type="text" inputmode="decimal" dir="ltr" data-k="zones.' + i + '.W" value="' + esc(v0(z.W)) + '" placeholder="عرض"><input type="text" inputmode="decimal" dir="ltr" data-k="zones.' + i + '.count" value="' + esc(v0(z.count)) + '" placeholder="عدد">'
          + '<button type="button" class="btn btn-danger btn-icon" data-act="delAt" data-path="zones" data-i="' + i + '">' + ic('x') + '</button></div>';
      }).join('') + '</div><button type="button" class="btn btn-ghost btn-sm" data-act="addZone">' + ic('plus') + ' منطقة</button>');
      b += card('الطبقات', 'layers', it.layers.map(function (l, i) {
        var p = 'layers.' + i;
        return '<div class="sub-card"><div class="sc-head"><input type="text" class="grow" data-k="' + p + '.name" value="' + esc(v0(l.name)) + '"><button type="button" class="btn btn-danger btn-icon" data-act="delAt" data-path="layers" data-i="' + i + '">' + ic('x') + '</button></div>'
          + CHIPS(K.LAYER_MATS, p + '.material', 'small') + '<div class="grid-2 mini"><div><span class="mini-lbl">السمك (سم)</span><input type="text" inputmode="decimal" dir="ltr" data-k="' + p + '.thickness" value="' + esc(v0(l.thickness)) + '"></div><div><span class="mini-lbl">الهالك %</span><input type="text" inputmode="decimal" dir="ltr" data-k="' + p + '.wastePct" value="' + esc(v0(l.wastePct)) + '" placeholder="—"></div></div>'
          + '<div class="chips wrap" style="margin-top:6px">' + [['m3', 'سعر المتر المكعب'], ['mix', 'خلطة أسمنت ورمل'], ['rate', 'معدل لكل م²']].map(function (o) { return '<button type="button" class="chip' + ((l.method || 'm3') === o[0] ? ' on' : '') + '" data-act="setK" data-k="' + p + '.method" data-v="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div>'
          + ((l.method || 'm3') === 'm3' ? '<div class="mini"><span class="mini-lbl">سعر المتر المكعب</span><input type="text" inputmode="decimal" dir="ltr" data-k="' + p + '.price" value="' + esc(v0(l.price)) + '"></div>'
            : l.method === 'mix' ? '<div class="grid-2 mini"><div><span class="mini-lbl">أسمنت</span><input type="text" inputmode="decimal" dir="ltr" data-k="' + p + '.c" value="' + esc(v0(l.c)) + '"></div><div><span class="mini-lbl">رمل</span><input type="text" inputmode="decimal" dir="ltr" data-k="' + p + '.s" value="' + esc(v0(l.s)) + '"></div></div>'
              : '<div class="grid-3 mini"><div><span class="mini-lbl">الكمية لكل م²</span><input type="text" inputmode="decimal" dir="ltr" data-k="' + p + '.rate" value="' + esc(v0(l.rate)) + '"></div><div><span class="mini-lbl">الوحدة</span><input type="text" data-k="' + p + '.rateUnit" value="' + esc(v0(l.rateUnit)) + '" placeholder="شيكارة"></div><div><span class="mini-lbl">سعر الوحدة</span><input type="text" inputmode="decimal" dir="ltr" data-k="' + p + '.price" value="' + esc(v0(l.price)) + '"></div></div>')
          + '<div class="w-res" data-lres="' + i + '"></div></div>';
      }).join('') + '<button type="button" class="btn btn-ghost btn-sm" data-act="addLayer">' + ic('plus') + ' طبقة</button><p class="hint">طبقات التسوية مش عناصر إنشائية، والتطبيق مش بيقترح تصميم أرضيات.</p>');
      if (it.layers.some(function (l) { return l.method === 'mix'; })) b += card('الخلطة', 'bucket', '<div class="grid-3">' + F('mixSpec.dryFactor', 'معامل الحجم الجاف', { num: true, after: CHIPS(MIX_SUG.dryFactor, 'mixSpec.dryFactor') }) + F('mixSpec.density', 'كثافة الأسمنت', { num: true, after: CHIPS(MIX_SUG.density, 'mixSpec.density') }) + F('mixSpec.bagKg', 'وزن الشيكارة', { num: true, after: CHIPS(MIX_SUG.bagKg, 'mixSpec.bagKg') }) + '</div>') + pricesHTML(false);
    } else if (k === 'stone') {
      b += card('الحجر', 'stone', F('stoneName', 'نوع الحجر', { after: CHIPS(K.STONE_TYPES, 'stoneName') }) + '<div class="field"><label>الحساب</label>' + SEG('unit', [['sqm', 'بالمتر المربع'], ['lm', 'بالمتر الطولي'], ['piece', 'بالقطعة']], 'seg-3') + '</div>'
        + (it.unit === 'piece' ? F('pieces', 'عدد القطع', { num: true }) : '') + unitSeg
        + (it.unit !== 'piece' ? it.surfaces.map(function (s, i) { return surfaceCard(s, i, 'surfaces', ['واجهة', 'حائط', 'عمود', 'سور']); }).join('') + '<button type="button" class="btn btn-ghost btn-sm" data-act="addSurface">' + ic('plus') + ' واجهة / مساحة</button>' : ''));
      b += card('الأسعار', 'cash', '<div class="row-2">' + F('stonePrice', 'سعر الحجر', { num: true, unit: cur().sym + ' / ' + ({ sqm: 'م²', lm: 'م.ط', piece: 'قطعة' }[it.unit] || 'م²') }) + F('wastePct', 'الهالك %', { num: true, ph: '—' }) + '</div>'
        + F('mortarCost', 'مونة ولصق (مبلغ)', { num: true, ph: '—' }) + '<label class="bill-toggle"><span>الحجر والمونة على حساب العميل</span><input type="checkbox" data-k="matBilled"' + (it.matBilled ? ' checked' : '') + '></label>');
    } else if (k === 'demo') {
      b += card('الشغل', 'hammer', F('title', 'وصف العمل', { after: CHIPS(K.DEMO_TYPES, 'title') }) + unitSeg
        + '<div class="grid-4">' + F('L', 'الطول', { num: true, unit: UNIT_LBL[u] }) + F('H', 'الارتفاع', { num: true, unit: UNIT_LBL[u] }) + F('T', 'السمك', { num: true, unit: 'سم' }) + F('count', 'العدد', { num: true }) + '</div>'
        + F('repairCost', 'مواد الإصلاح (مبلغ)', { num: true, ph: '—' }) + '<label class="bill-toggle"><span>مواد الإصلاح على حساب العميل</span><input type="checkbox" data-k="matBilled"' + (it.matBilled ? ' checked' : '') + '></label>'
        + '<p class="hint">قبل تكسير أو فتح أي حائط أو عنصر حامل: لازم مراجعة مهندس. التطبيق بيحسب التكلفة بس.</p>');
    } else {
      b += card('الشغل والكميات', 'cash', F('title', 'وصف الشغل', { ph: 'مثلاً: مصنعية بناء الدور الأول' }) + '<p class="hint" style="margin-bottom:8px">اكتب الكمية اللي هتحسب بيها (حسب الطريقة اللي تحت).</p>'
        + '<div class="grid-3">' + F('sqm', 'م²', { num: true }) + F('m3', 'م³', { num: true }) + F('bricks', 'عدد الطوب', { num: true }) + F('lm', 'م.ط', { num: true }) + F('pieces', 'قطع', { num: true }) + '</div>');
    }
    return b + laborHTML() + extrasHTML()
      + card('ملاحظات', 'edit', F('notes', 'ملاحظات البند', { ph: 'بتظهر في الفاتورة' }) + (k === 'walls' || k === 'mortar' || k === 'plaster' ? '' : ''))
      + '<div class="card" id="itRes"></div>';
  }
  function renderItemPage() {
    var it = E.it, el = $('itemPage'), st = el.scrollTop;
    var head = '<div class="pg-head"><button type="button" class="icon-btn" data-act="closeTop" aria-label="رجوع">' + ic('back') + '</button><div class="titles"><h2>' + esc((E.itemId ? 'تعديل: ' : '') + itemTitle(it)) + '</h2><div class="sub">'
      + esc(E.jobId ? custName(getJob(E.jobId)) + ' — ' + (getJob(E.jobId).title || getJob(E.jobId).number) : 'حساب جديد') + '</div></div></div>';
    var pick = E.jobId ? '' : '<div class="card cust-pick"><div class="field"><label for="f_cname">اسم العميل (اختياري — سيبه فاضي لحساب سريع)</label><input type="text" id="f_cname" autocomplete="off" value="' + esc(E.custName) + '"><div id="f_csug"></div></div>'
      + '<div class="field" style="margin-bottom:0"><label for="f_jtitle">اسم المشروع (اختياري)</label><input type="text" id="f_jtitle" value="' + esc(E.jobTitle) + '" placeholder="مثلاً: مباني الدور الأرضي"></div><div id="f_target"></div></div>';
    el.innerHTML = head + '<div class="container">' + pick + kindBody() + '</div>'
      + '<div class="pg-foot"><div class="eb-info"><span>الإجمالي للعميل</span><strong id="itTotal">0</strong></div>'
      + (E.itemId ? '<button type="button" class="btn btn-danger btn-icon" data-act="delItem" aria-label="حذف البند">' + ic('trash') + '</button><button type="button" class="btn btn-ghost btn-icon" data-act="dupItem" aria-label="تكرار البند">' + ic('copy') + '</button>' : '')
      + '<button type="button" class="btn btn-accent" data-act="saveItem">' + ic('check') + ' حفظ</button></div>';
    el.scrollTop = st;
    if (!E.jobId) { bindCustSuggest(); renderTargetJobs(); }
    updateItemLive();
  }
  function mixText(m) {
    if (!m) return '';
    if (m.missing && m.missing.length && !(m.bags || m.sandM3)) return '<div class="warn-box">علشان نحسب الأسمنت والرمل اكتب: <b>' + esc(m.missing.join('، ')) + '</b>. (مش هنحط أرقام من عندنا.)</div>';
    return row('حجم المونة' + (m.wastePct ? ' (شامل هالك ' + fq(m.wastePct) + '%)' : ''), fq(m.wet) + ' م³')
      + (m.dry ? row('الحجم الجاف', fq(m.dry) + ' م³') : '')
      + (m.bags != null ? row('الأسمنت', (m.cementKg ? fq(m.cementKg) + ' كجم = ' : '') + fq(m.bags) + ' شيكارة', 'bold') : '')
      + (m.limeM3 ? row('الجير', fq(m.limeM3) + ' م³') : '') + (m.sandM3 ? row('الرمل', fq(m.sandM3) + ' م³', 'bold') : '') + (m.waterL ? row('المية التقديرية', fq(m.waterL) + ' لتر') : '')
      + (m.missing && m.missing.length ? '<div class="warn-box">ناقص: ' + esc(m.missing.join('، ')) + '</div>' : '') + (m.how ? '<p class="cost-note">' + esc(m.how) + '</p>' : '');
  }
  function updateItemLive() {
    if (!E || !$('itRes')) return;
    var it = E.it, r = C.item(it), h = '';
    var u = UNIT_LBL[it.dimUnit];
    if (it.kind === 'walls') {
      r.walls.forEach(function (w, i) {
        var el = document.querySelector('[data-wres="' + i + '"]'); if (!el) return;
        el.innerHTML = w.error ? '<span class="neg">الفتحات (' + fq(w.open) + ' م²) أكبر من الحائط (' + fq(w.gross) + ' م²)</span>'
          : fq(w.gross) + ' − ' + fq(w.open) + ' = <b>' + fq(w.net) + ' م²</b> · ' + fq(w.perM2) + ' طوبة/م² · السمك ' + fq(w.thickness * 100) + ' سم · <b>' + fq(Math.round(w.exact)) + '</b> طوبة';
      });
      var wf = $('wasteFields');
      if (wf) {
        var mode = (it.waste || {}).mode;
        var want = mode === 'pct' ? 'pct' : mode === 'qty' ? 'qty:' + r.groups.map(function (g) { return g.key; }).join(',') : 'none';
        if (wf.dataset.v !== want) {
          wf.dataset.v = want;
          wf.innerHTML = mode === 'pct' ? F('waste.pct', 'نسبة الهالك', { num: true, unit: '%' }) : mode === 'qty' ? r.groups.map(function (g) { return F('waste.qty.' + g.key, 'كمية زيادة — ' + g.name + ' (' + g.layoutLabel + ')', { num: true }); }).join('') : '<p class="hint">مفيش هالك بيتحط لوحده — اختار نسبة أو كمية لو عايز.</p>';
        }
      }
      h += '<div class="card-title"><span class="t-ic orange">' + ic('chart') + '</span><h2>النتيجة</h2></div><div class="sum-list">'
        + row('مساحة الحوائط', fq(r.gross) + ' م²') + row('مساحة الفتحات', fq(r.open) + ' م²') + row('المساحة الصافية', fq(r.q.sqm) + ' م²', 'bold') + row('حجم البناء', fq(r.q.m3) + ' م³') + '</div>'
        + r.groups.map(function (g) {
          var b = g.brick || {}, du = b.unit === 'mm' ? 'مم' : 'سم';
          return '<div class="group-res"><b>' + esc(g.name) + '</b> <span class="src-badge">' + esc(g.layoutLabel) + ' · ' + fq(g.thickness * 100) + ' سم</span><div class="sum-list">'
            + row('مقاس الطوبة', fq(C.num(b.L)) + '×' + fq(C.num(b.W)) + '×' + fq(C.num(b.H)) + ' ' + du) + row('العراميس', fq(C.num(it.jh)) + ' / ' + fq(C.num(it.jv)) + ' سم')
            + row('الطوب في المتر المربع', fq(g.perM2)) + row('المساحة', fq(g.net) + ' م²') + row('العدد الأساسي' + (it.countMethod === 'volume' ? ' (تقديري بالحجم)' : ''), fq(g.base))
            + row('الهالك', fq(g.waste)) + row('العدد المطلوب', fq(g.final), 'bold')
            + (g.packs ? row('البالتات / العبوات', fq(g.packs) + ' (= ' + fq(g.purchased) + ' طوبة)') : '') + (g.cost ? row('تكلفة الطوب', money(g.cost)) : '') + (g.priceMissing ? '<div class="warn-box">السعر بالبالتة: اكتب عدد البالتة.</div>' : '') + '</div></div>';
        }).join('') + '<p class="more-h">المونة</p><div class="sum-list">' + mixText(r.mortar) + '</div>';
    } else if (it.kind === 'mortar') {
      h += '<div class="card-title"><span class="t-ic orange">' + ic('chart') + '</span><h2>النتيجة</h2></div><div class="sum-list">' + mixText(r.mortar) + '</div>';
    } else if (it.kind === 'plaster' || it.kind === 'stone') {
      (r.surfaces || []).forEach(function (s, i) { var el = document.querySelector('[data-sres="' + i + '"]'); if (el) el.innerHTML = s.error ? '<span class="neg">الفتحات أكبر من المساحة</span>' : fq(s.gross) + ' − ' + fq(s.open) + ' = <b>' + fq(s.net) + ' م²</b>'; });
      h += '<div class="card-title"><span class="t-ic orange">' + ic('chart') + '</span><h2>النتيجة</h2></div><div class="sum-list">' + row('المساحة الصافية', fq(r.area) + ' م²', 'bold')
        + (it.kind === 'plaster' ? row('حجم المحارة التقديري', fq(r.volume) + ' م³') + mixText(r.mortar) : row('كمية الحجر' + (C.num(it.wastePct) ? ' (شامل الهالك)' : ''), fq(r.qty) + ' ' + r.unitLbl, 'bold')) + '</div>';
    } else if (it.kind === 'floor') {
      r.layers.forEach(function (l, i) { var el = document.querySelector('[data-lres="' + i + '"]'); if (el) el.innerHTML = fq(r.area) + ' م² × ' + fq(l.thickness * 100) + ' سم = <b>' + fq(l.volume) + ' م³</b>' + (l.mix && l.mix.bags ? ' · ' + fq(l.mix.bags) + ' شيكارة + ' + fq(l.mix.sandM3) + ' م³ رمل' : ''); });
      h += '<div class="card-title"><span class="t-ic orange">' + ic('chart') + '</span><h2>النتيجة</h2></div><div class="sum-list">' + row('المساحة', fq(r.area) + ' م²', 'bold') + r.layers.map(function (l) { return row(l.name + (l.material ? ' — ' + l.material : ''), fq(l.volume) + ' م³'); }).join('') + '</div>';
    } else if (it.kind === 'demo') {
      h += '<div class="card-title"><span class="t-ic orange">' + ic('chart') + '</span><h2>النتيجة</h2></div><div class="sum-list">' + row('المساحة', fq(r.area) + ' م²') + row('الحجم', fq(r.volume) + ' م³') + '</div>';
    } else h += '<div class="card-title"><span class="t-ic orange">' + ic('chart') + '</span><h2>النتيجة</h2></div>';
    h += '<div class="sum-list" style="margin-top:8px">' + (r.materials.length ? r.materials.map(function (m) { return row(m.name + ' — ' + fq(m.qty) + ' ' + m.unit + (m.price ? ' × ' + fmt(m.price) : ''), m.cost ? money(m.cost) : '—'); }).join('') + row('تكلفة الخامات' + (it.matBilled ? ' (على العميل)' : ' (عليك)'), money(r.matCost), 'bold') : '')
      + row('المصنعية (' + r.labor.label + ')', money(r.labor.amount), 'bold') + (r.extrasTotal ? row('الإضافات', money(r.extrasTotal)) : '') + row('الإجمالي للعميل', money(r.total), 'bold') + '</div>'
      + (r.warnings.length ? '<div class="warn-box">' + r.warnings.map(esc).join('<br>') + '</div>' : '')
      + '<p class="cost-note">أداة حصر وتقدير تكاليف — مش بديل عن المهندس، ومفيش فيها أي توصية إنشائية.</p>';
    $('itRes').innerHTML = h;
    var lb = $('labBreak'); if (lb) lb.innerHTML = r.labor.method === 'lump' ? 'مقطوعية' : r.labor.method === 'stages' ? r.labor.stages.length + ' مرحلة' : r.labor.method === 'daily' ? fq(r.labor.days) + ' يوم × ' + fmt(r.labor.price) + (r.labor.perWorker ? ' × ' + fq(r.labor.workers) + ' عامل' : '') : fq(r.labor.qty) + ' × ' + fmt(r.labor.price) + ' = <b>' + esc(money(r.labor.amount)) + '</b>';
    $('itTotal').textContent = money(r.total);
  }
  function itemInput(e) {
    var el = e.target, v = el.type === 'checkbox' ? el.checked : el.value;
    if (!E) return;
    if (el.id === 'f_cname') { E.custName = el.value; return; }
    if (el.id === 'f_jtitle') { E.jobTitle = el.value; return; }
    if (el.dataset.brick != null) {
      var w = E.it.walls[+el.dataset.brick];
      if (el.value === '__new') { el.value = w.brick && w.brick.id || ''; openBrickSheet(null, function (b) { w.brick = clone(b); renderItemPage(); }); return; }
      var b = brickById(el.value); if (b && w) { w.brick = clone(b); if (isBlock(b)) settings.lastBlockId = b.id; else settings.lastBrickId = b.id; }
      renderItemPage(); return;
    }
    if (el.dataset.bp != null) {
      var src = E.it.walls[+el.dataset.bp].brick || {}, id = src.id || ('w' + src.name);
      E.it.walls.forEach(function (x) { var br = x.brick || {}; if ((br.id || ('w' + br.name)) === id) br[el.dataset.f] = v; });
      updateItemLive(); return;
    }
    if (el.dataset.k) { setPath(E.it, el.dataset.k, v); if (el.tagName === 'SELECT') renderItemPage(); else updateItemLive(); }
  }
  $('itemPage').addEventListener('input', itemInput);
  $('itemPage').addEventListener('change', function (e) { if (e.target.type === 'checkbox' || e.target.tagName === 'SELECT') itemInput(e); });
  function saveItem() {
    var it = E.it, job = E.jobId ? getJob(E.jobId) : null, fromHome = !job;
    if (!job) {
      var name = String(E.custName || '').trim(), c = name ? ensureCustomer(name) : null;
      job = E.targetJob ? getJob(E.targetJob) : null;
      if (!job) job = newJobRecord(c, String(E.jobTitle || '').trim() || (c ? itemTitle(it) : 'حساب سريع — ' + itemTitle(it)), today());
    }
    var id = E.itemId || uid('i'); it.id = id;
    var i = job.items.findIndex(function (x) { return x.id === id; });
    if (i >= 0) job.items[i] = it; else job.items.push(it);
    if (it.mixSpec && (C.num(it.mixSpec.c) || C.num(it.mixSpec.dryFactor))) settings.lastMix = clone(it.mixSpec);
    if (it.prices) settings.prices = clone(it.prices);
    if (it.kind === 'walls' && C.num(it.jh)) settings.lastJoint = it.jh;
    touch(job); saveDb(); saveSettings();
    var jid = job.id, edit = !!E.itemId;
    closeTop(function () { refresh(); toast(edit ? 'اتعدل' : 'اتحفظ'); if (fromHome) openJob(jid); });
  }
  // غرفة: 4 حوائط (2 بالطول و2 بالعرض) كل حائط يتعدّل لوحده
  function openRoomSheet() {
    openSheet('غرفة — 4 حوائط', '<div class="field"><label for="f_rn">اسم الغرفة</label><input type="text" id="f_rn" value="غرفة ' + ((E.it.walls.length / 4 | 0) + 1) + '"></div>'
      + '<div class="grid-3"><div class="field"><label for="f_rl">الطول (' + UNIT_LBL[E.it.dimUnit] + ')</label><input type="text" id="f_rl" inputmode="decimal" dir="ltr"></div><div class="field"><label for="f_rw">العرض</label><input type="text" id="f_rw" inputmode="decimal" dir="ltr"></div><div class="field"><label for="f_rh">الارتفاع</label><input type="text" id="f_rh" inputmode="decimal" dir="ltr"></div></div>'
      + '<p class="hint" style="margin-bottom:12px">بيتعمل 4 حوائط بنفس نوع الطوب — بعدها تقدر تغيّر نوع أي حائط وتضيف أبوابه وشبابيكه.</p>'
      + '<button type="button" class="btn btn-accent" data-act="saveRoom">' + ic('check') + ' أضف الغرفة</button>', { form: 'room' });
  }
  function saveRoom() {
    var n = $('f_rn').value.trim() || 'غرفة', L = $('f_rl').value, W = $('f_rw').value, H = $('f_rh').value;
    if (!(C.num(L) && C.num(W) && C.num(H))) { toast('اكتب الطول والعرض والارتفاع'); return; }
    var it = E.it, tpl = it.walls[it.walls.length - 1] || newWall(it, 1);
    // لو أول حائط لسه فاضي نشيله
    if (it.walls.length === 1 && !C.num(it.walls[0].L) && !C.num(it.walls[0].H)) it.walls = [];
    [[L, 'طول'], [W, 'عرض'], [L, 'طول'], [W, 'عرض']].forEach(function (p, i) { it.walls.push({ name: n + ' — حائط ' + (i + 1) + ' (' + p[1] + ')', kind: 'داخلي', L: p[0], H: H, count: '1', brick: clone(tpl.brick), layout: tpl.layout || 'half', openings: [] }); });
    closeTop(function () { renderItemPage(); toast('اتضافت ' + n); });
  }

  // ====================================================================
  // الخامات والإكسسوارات والتكاليف (على المشروع) — والهالك بالكمية أو بالنسبة
  // ====================================================================
  function openCostSheet(jobId, costId, type) {
    var job = getJob(jobId); if (!job) return;
    var c = costId ? job.costs.find(function (x) { return x.id === costId; }) : null;
    var d = c ? clone(c) : { type: type || 'mat', billed: false, mode: '' };
    if (d.mode === 'qty') d.mode = '';
    openSheet(c ? 'تعديل تكلفة' : 'خامات وتكاليف', '', { form: 'cost', jobId: jobId, costId: costId || null, d: d });
    renderCostSheet();
  }
  function renderCostSheet() {
    var d = S.d, t = d.type;
    var sug = K.COST_SUG[t].concat(arr(settings.costNames[t])).filter(function (v, i, a) { return a.indexOf(v) === i; });
    var job = getJob(S.jobId);
    var b = '<div class="chips wrap">' + C.COST_ORDER.map(function (k) { return '<button type="button" class="chip' + (k === t ? ' on' : '') + '" data-act="costType" data-v="' + k + '">' + esc(C.COST_TYPES[k]) + '</button>'; }).join('') + '</div>';
    b += '<div class="field"><label for="f_kname">الاسم</label><input type="text" id="f_kname" value="' + esc(d.name || '') + '" autocomplete="off">'
      + chipsHTML(sug, 'costName') + '</div>';
    b += '<div class="segmented seg-3" style="margin-bottom:12px"><button type="button" class="' + (!d.mode ? 'on' : '') + '" data-act="wasteMode" data-v="qty">كمية × سعر</button><button type="button" class="' + (d.mode === 'amount' ? 'on' : '') + '" data-act="wasteMode" data-v="amount">مبلغ مباشر</button><button type="button" class="' + (d.mode === 'pct' ? 'on' : '') + '" data-act="wasteMode" data-v="pct">نسبة من الخامات</button></div>';
    if (d.mode === 'amount') b += '<div class="field"><label for="f_kamt">المبلغ</label><input type="text" id="f_kamt" inputmode="decimal" dir="ltr" value="' + esc(v0(d.amount)) + '"></div>';
    else if (d.mode === 'pct') {
      b += '<div class="field"><label for="f_kpct">' + (t === 'waste' ? 'نسبة الهالك %' : 'النسبة %') + '</label><input type="text" id="f_kpct" inputmode="decimal" dir="ltr" value="' + esc(v0(d.pct)) + '"></div>'
        + '<p class="hint" style="margin:-6px 0 12px">من تكلفة الخامات المسجلة في المشروع: ' + esc(money(C.job(job).matBase)) + '</p>';
    } else {
      b += '<div class="grid-3"><div class="field"><label for="f_kqty">الكمية</label><input type="text" id="f_kqty" inputmode="decimal" dir="ltr" value="' + esc(v0(d.qty)) + '"></div>'
        + '<div class="field"><label for="f_kunit">الوحدة</label><input type="text" id="f_kunit" value="' + esc(d.unit || '') + '"></div>'
        + '<div class="field"><label for="f_kprice">سعر الوحدة</label><input type="text" id="f_kprice" inputmode="decimal" dir="ltr" value="' + esc(v0(d.price)) + '"></div></div>'
        + chipsHTML(K.COST_UNITS[t] || [], 'costUnit');
      if (t === 'mat') b += '<div class="field" style="margin-top:10px"><label for="f_kwaste">نسبة هالك على الخامة دي % (اختياري — مش بتتحط لوحدها)</label><input type="text" id="f_kwaste" inputmode="decimal" dir="ltr" value="' + esc(v0(d.wastePct)) + '" placeholder="—"></div>';
    }
    var items = job ? job.items : [];
    b += '<label class="bill-toggle"><span>على حساب العميل (بتظهر في الفاتورة)</span><input type="checkbox" id="f_kbilled"' + (d.billed ? ' checked' : '') + '></label>'
      + '<p class="hint" style="margin:4px 0 12px">مقفول = تكلفة عليك بس (بتتحسب في الربح ومش بتظهر للعميل).</p>'
      + (items.length ? '<div class="field"><label for="f_kitem">خاصة ببند (اختياري)</label><select id="f_kitem"><option value="">المشروع كله</option>' + items.map(function (it) { return '<option value="' + esc(it.id) + '"' + (d.itemId === it.id ? ' selected' : '') + '>' + esc(itemTitle(it)) + '</option>'; }).join('') + '</select></div>' : '')
      + '<div class="row-2"><div class="field"><label for="f_ksup">المورد (اختياري)</label><input type="text" id="f_ksup" value="' + esc(d.supplier || '') + '"></div>'
      + '<div class="field"><label for="f_knote">ملاحظات</label><input type="text" id="f_knote" value="' + esc(d.note || '') + '"></div></div>'
      + '<div class="live-total"><span id="f_klbl">الإجمالي</span><strong id="f_ktotal">0</strong></div>'
      + '<button type="button" class="btn btn-accent" data-act="saveCost">' + ic('check') + (S.costId ? ' حفظ التعديل' : ' إضافة') + '</button>'
      + (S.costId ? '<button type="button" class="btn btn-danger" data-act="delCost" style="margin-top:10px">' + ic('trash') + ' حذف</button>' : '');
    $('sheetBody').innerHTML = b;
    updateCostLive();
  }
  function readCost() {
    var d = S.d, g = function (id) { var el = $(id); return el ? el.value : undefined; };
    if ($('f_kname')) d.name = g('f_kname').trim();
    if ($('f_kqty')) { d.qty = g('f_kqty'); d.unit = g('f_kunit').trim(); d.price = g('f_kprice'); }
    if ($('f_kpct')) d.pct = g('f_kpct');
    if ($('f_kamt')) d.amount = g('f_kamt');
    if ($('f_kwaste')) d.wastePct = g('f_kwaste');
    if ($('f_kbilled')) d.billed = $('f_kbilled').checked;
    if ($('f_kitem')) d.itemId = g('f_kitem') || undefined;
    if ($('f_ksup')) { d.supplier = g('f_ksup').trim(); d.note = g('f_knote').trim(); }
    return d;
  }
  function updateCostLive() {
    if (S.form !== 'cost' || !$('f_ktotal')) return;
    var job = getJob(S.jobId), d = readCost();
    var r = C.cost(d, C.job(job).matBase);
    $('f_ktotal').textContent = money(r.total);
    $('f_klbl').textContent = r.wasteCost ? 'الإجمالي (منه هالك ' + money(r.wasteCost) + ')' : 'الإجمالي';
  }
  function saveCost() {
    var job = getJob(S.jobId); if (!job) return;
    var d = readCost();
    if (!d.name) d.name = C.COST_TYPES[d.type];
    if (!d.mode && !(C.num(d.qty) > 0)) { toast('اكتب الكمية'); return; }
    if (d.mode === 'pct' && !(C.num(d.pct) > 0)) { toast('اكتب النسبة'); return; }
    if (d.mode === 'amount' && !(C.num(d.amount) > 0)) { toast('اكتب المبلغ'); return; }
    d.id = S.costId || uid('k');
    var i = job.costs.findIndex(function (x) { return x.id === d.id; });
    if (i >= 0) job.costs[i] = d; else job.costs.push(d);
    var sugs = K.COST_SUG[d.type] || [];
    if (sugs.indexOf(d.name) < 0) settings.costNames[d.type] = [d.name].concat(arr(settings.costNames[d.type]).filter(function (n) { return n !== d.name; })).slice(0, 10);
    saveSettings(); touch(job); saveDb();
    closeTop(function () { refresh(); toast('اتسجل'); });
  }

  // ---------------- الدفعات والخصم ----------------
  function openPaySheet(jobId, payId) {
    var job = getJob(jobId); if (!job) return;
    var r = C.job(job), p = payId ? job.payments.find(function (x) { return x.id === payId; }) : null;
    var rem = p ? r.remaining + C.num(p.amount) : r.remaining;
    openSheet(p ? 'تعديل دفعة' : 'تسجيل دفعة من ' + custName(job),
      '<div class="field"><label for="f_pamt">المبلغ (' + esc(cur().sym) + ')</label><input type="text" id="f_pamt" inputmode="decimal" dir="ltr" value="' + esc(p ? v0(p.amount) : '') + '"></div>'
      + (rem > 0.005 ? '<div class="price-hint" style="margin:-6px 0 12px"><button type="button" class="chip" data-act="payAll" data-v="' + esc(C.money(rem)) + '">الباقي كله: ' + esc(money(rem)) + '</button></div>' : '')
      + '<div class="row-2"><div class="field"><label for="f_pdate">التاريخ</label><input type="date" id="f_pdate" value="' + esc(p ? p.date : today()) + '"></div>'
      + '<div class="field"><label for="f_pnote">ملحوظة</label><input type="text" id="f_pnote" value="' + esc(p ? p.note || '' : '') + '" placeholder="عربون، دفعة…"></div></div>'
      + '<button type="button" class="btn btn-accent" data-act="savePay">' + ic('check') + ' حفظ الدفعة</button>'
      + (p ? '<button type="button" class="btn btn-danger" data-act="delPay" style="margin-top:10px">' + ic('trash') + ' حذف الدفعة</button>' : ''), { form: 'pay', jobId: jobId, payId: payId || null });
  }
  function savePay() {
    var job = getJob(S.jobId); if (!job) return;
    var amt = C.num($('f_pamt').value);
    if (!(amt > 0)) { toast('اكتب المبلغ'); return; }
    var p = { id: S.payId || uid('p'), amount: amt, date: $('f_pdate').value || today(), note: $('f_pnote').value.trim() };
    var i = job.payments.findIndex(function (x) { return x.id === p.id; });
    if (i >= 0) job.payments[i] = p; else job.payments.push(p);
    if (job.status === 'quote') job.status = 'active';
    touch(job); saveDb(); closeTop(function () { refresh(); toast('اتسجلت الدفعة'); });
  }
  function openDiscSheet(jobId) {
    var job = getJob(jobId); if (!job) return;
    var d = job.discount || {};
    openSheet('خصم على المشروع',
      '<div class="segmented" id="f_dtype"><button type="button" data-act="discType" data-v="amount">مبلغ</button><button type="button" data-act="discType" data-v="percent">نسبة %</button></div>'
      + '<div class="field"><label for="f_dval">قيمة الخصم</label><input type="text" id="f_dval" inputmode="decimal" dir="ltr" value="' + esc(C.num(d.value) ? d.value : '') + '"></div>'
      + '<div class="live-total"><span id="f_dlbl">الإجمالي بعد الخصم</span><strong id="f_dtotal">0</strong></div>'
      + '<button type="button" class="btn btn-accent" data-act="saveDisc">' + ic('check') + ' حفظ</button>', { form: 'disc', jobId: jobId, dtype: d.type === 'percent' ? 'percent' : 'amount' });
    updateDiscLive();
  }
  function updateDiscLive() {
    var job = getJob(S.jobId); if (!job || !$('f_dtype')) return;
    Array.prototype.forEach.call($('f_dtype').children, function (b) { b.classList.toggle('on', b.dataset.v === S.dtype); });
    var r = C.job(Object.assign({}, job, { discount: { type: S.dtype, value: C.num($('f_dval').value) } }));
    $('f_dtotal').textContent = money(r.total); $('f_dlbl').textContent = 'الخصم ' + money(r.discount) + ' — الإجمالي بعده';
  }

  // ====================================================================
  // صفحة المشروع
  // ====================================================================
  var openJobId = null, openCustId = null;
  function openJob(id) {
    if (!getJob(id)) return;
    openJobId = id; renderJob(id);
    var el = $('jobPage'); el.classList.add('open'); el.scrollTop = 0;
    pushLayer({ type: 'page', hide: function () { el.classList.remove('open'); openJobId = null; } });
  }
  // ====================================================================
  // صفحة المشروع
  // ====================================================================
  function itemMeta(it, x) {
    var b = [];
    if (it.kind === 'walls') { b.push(x.walls.length + ' حائط', fq(x.q.sqm) + ' م² صافي'); x.groups.forEach(function (g) { b.push(g.name + ' ' + g.layoutLabel + ': ' + fmt(g.final, 0)); }); }
    else if (it.kind === 'mortar') b.push(fq(x.mortar.wet) + ' م³ مونة' + (x.mortar.bags ? ' · ' + fq(x.mortar.bags) + ' شيكارة' : ''));
    else if (it.kind === 'plaster') b.push(fq(x.area) + ' م² · سمك ' + fq(C.num(it.thickness)) + ' سم');
    else if (it.kind === 'floor') b.push(fq(x.area) + ' م² · ' + x.layers.length + ' طبقة');
    else if (it.kind === 'stone') b.push(fq(x.qty) + ' ' + x.unitLbl);
    else if (it.kind === 'demo') b.push(fq(x.area) + ' م² · ' + fq(x.volume) + ' م³');
    b.push(x.labor.label);
    return b.join(' · ');
  }
  function costRowHTML(c, x) {
    var meta = c.mode === 'pct' ? fq(x.pct) + '% من الخامات ' + fmt(x.base) : c.mode === 'amount' ? 'مبلغ' : fq(x.qty) + ' ' + (c.unit || '') + ' × ' + fmt(x.price) + (x.wasteCost ? ' + هالك ' + fq(x.wastePct) + '%' : '');
    return '<div class="mat-row" data-act="editCost" data-id="' + esc(c.id) + '"><div class="m-info"><div class="m-name">' + esc(c.name || C.COST_TYPES[c.type]) + ' <span class="src-badge">' + (c.billed ? 'على العميل' : 'عليك') + '</span></div><div class="m-meta">' + esc(meta + (c.supplier ? ' · ' + c.supplier : '')) + '</div></div><span class="m-qty">' + esc(money(x.total)) + '</span></div>';
  }
  function qtyCardHTML(r) {
    if (!r.bricks.length && !r.cementBags && !r.sandM3) return '';
    return '<div class="card"><div class="card-title"><span class="t-ic orange">' + ic('brick') + '</span><h2>الكميات على المشروع</h2></div>'
      + r.bricks.map(function (b) { return '<div class="group-res"><b>' + esc(b.name) + '</b> <span class="src-badge">' + esc(b.layoutLabel) + ' · ' + fq(b.thickness * 100) + ' سم</span><div class="sum-list">' + row('المساحة', fq(b.net) + ' م²') + row('العدد الأساسي', fmt(b.base, 0)) + row('الهالك', fmt(b.waste, 0)) + row('المطلوب', fmt(b.final, 0), 'bold') + (b.packs ? row('البالتات', fmt(b.packs, 0) + ' (= ' + fmt(b.purchased, 0) + ')') : '') + '</div></div>'; }).join('')
      + '<div class="sum-list">' + (r.cementBags ? row('الأسمنت (كل البنود)', fmt(r.cementBags, 0) + ' شيكارة', 'bold') : '') + (r.sandM3 ? row('الرمل', fq(r.sandM3) + ' م³', 'bold') : '') + (r.limeM3 ? row('الجير', fq(r.limeM3) + ' م³') : '') + '</div>'
      + '<p class="cost-note">كل نوع طوب وسمك لوحده — مش رقم واحد لكل الأنواع.</p></div>';
  }
  function renderJob(id) {
    var j = getJob(id); if (!j) return;
    var c = getCust(j.customerId) || null, r = C.job(j);
    var items = j.items.map(function (it, i) {
      var x = r.items[i];
      return '<div class="item-card" data-act="editItem" data-id="' + esc(it.id) + '"><span class="room-num">' + (i + 1) + '</span><div class="i-info"><div class="i-name">' + esc(itemTitle(it)) + '</div><div class="i-meta">' + esc(itemMeta(it, x)) + '</div></div>'
        + '<div class="i-amt">' + esc(money(x.total)) + '<small>' + esc(KINDS[it.kind] ? KINDS[it.kind].label : '') + '</small></div></div>';
    }).join('');
    var costs = C.COST_ORDER.map(function (t) {
      var list = j.costs.map(function (k, i) { return [k, r.costs[i]]; }).filter(function (p) { return p[1].type === t; });
      return list.length ? '<p class="more-h">' + esc(C.COST_TYPES[t]) + '</p>' + list.map(function (p) { return costRowHTML(p[0], p[1]); }).join('') : '';
    }).join('');
    var pays = j.payments.slice().sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); }).map(function (p) {
      return '<div class="entry pay-row" data-act="editPay" data-id="' + esc(p.id) + '"><span class="e-ic">' + ic('cash') + '</span><div class="e-info"><div class="e-title">' + esc(p.note || 'دفعة') + '</div><div class="e-meta">' + esc(fmtDate(p.date)) + '</div></div><span class="e-amt">' + esc(money(p.amount)) + '</span></div>';
    }).join('');
    var disc = C.num(j.discount && j.discount.value) && j.discount.type === 'percent' ? ' (' + fq(j.discount.value) + '%)' : '';
    var html = '<div class="pg-head"><button type="button" class="icon-btn" data-act="closeTop" aria-label="رجوع">' + ic('back') + '</button>'
      + '<div class="titles"><h2>' + esc(c ? c.name : 'حساب سريع') + '</h2><div class="sub">' + esc([j.title, j.number, fmtDate(j.date)].filter(Boolean).join(' · ')) + '</div></div>'
      + '<button type="button" class="icon-btn" data-act="jobMenu" aria-label="خيارات المشروع">' + ic('more') + '</button></div><div class="container">'
      + '<section class="home-sum"><div class="hs-label">' + (j.status === 'quote' ? 'قيمة عرض السعر' : 'إجمالي المشروع') + '</div><div class="hs-value">' + esc(fmt(r.total)) + ' <small>' + esc(cur().sym) + '</small></div>'
      + '<div class="hs-stats"><button type="button" data-act="addPay"><span>المدفوع</span><strong>' + esc(fmt(r.paid)) + '</strong></button><button type="button" data-act="addPay"><span>المتبقي</span><strong>' + esc(fmt(r.remaining)) + '</strong></button>'
      + '<button type="button" class="mat" data-act="scrollProfit"><span>الربح التقديري</span><strong dir="ltr">' + esc(fmt(r.profit)) + '</strong></button></div></section>'
      + '<div class="status-row" style="margin:-4px 2px 12px">' + ['quote', 'active', 'done'].map(function (s) { return '<button type="button" class="chip' + ((j.status || 'active') === s ? ' on' : '') + '" data-act="setStatus" data-v="' + s + '">' + STATUS[s][0] + '</button>'; }).join('') + '</div>'
      + '<div class="card"><div class="card-title"><span class="t-ic orange">' + ic('brick') + '</span><h2>البنود</h2>' + (j.items.length ? '<span class="tag">' + j.items.length + '</span>' : '') + '</div>'
      + (items || '<p class="card-empty">ضيف أول بند:</p>') + kindGridHTML('addKind') + '</div>'
      + qtyCardHTML(r)
      + '<div class="card" id="costCard"><div class="card-title"><span class="t-ic">' + ic('box') + '</span><h2>الهالك ومصاريف البناء</h2></div>'
      + '<div class="chips wrap" style="margin-bottom:6px">' + C.COST_ORDER.map(function (t) { return '<button type="button" class="chip" data-act="addCost" data-type="' + t + '">+ ' + esc(C.COST_TYPES[t]) + '</button>'; }).join('') + '</div>'
      + (costs || '<p class="card-empty">اختياري — هالك، نقل وتحميل، معدات، مية، يوميات… على العميل أو تكلفة عليك. مفيش هالك بيتحط لوحده.</p>')
      + '<button type="button" class="btn btn-ghost btn-sm" data-act="workersForJob">' + ic('users') + ' العمال واليومية</button></div>'
      + '<div class="card"><div class="card-title"><span class="t-ic">' + ic('receipt') + '</span><h2>حساب العميل</h2></div><div class="sum-list">'
      + row('إجمالي المصنعية', money(r.labor)) + (r.extras ? row('إضافات', money(r.extras)) : '') + (r.matBilled ? row('خامات على العميل', money(r.matBilled)) : '') + (r.billedCosts ? row('مصاريف على العميل', money(r.billedCosts)) : '')
      + '<div class="sum-row minus"><span>الخصم' + esc(disc) + ' <button type="button" class="edit-link" data-act="editDisc">' + (r.discount ? 'تعديل' : 'إضافة خصم') + '</button></span><strong>' + (r.discount ? '- ' : '') + esc(money(r.discount)) + '</strong></div>'
      + row('الإجمالي', money(r.total), 'bold') + row('المدفوع', money(r.paid)) + '</div>'
      + '<div class="sum-total"><span>' + (r.remaining < -0.005 ? 'زيادة للعميل' : 'المتبقي على العميل') + '</span><strong>' + esc(money(Math.abs(r.remaining))) + '</strong></div>'
      + (pays ? '<div style="margin-top:10px">' + pays + '</div>' : '') + '<button type="button" class="btn btn-ghost" data-act="addPay" style="margin-top:10px">' + ic('cash') + ' تسجيل دفعة</button></div>'
      + '<div class="card" id="profitCard"><div class="card-title"><span class="t-ic orange">' + ic('chart') + '</span><h2>التكاليف والربح</h2></div><div class="sum-list">'
      + C.COST_ORDER.filter(function (t) { return r.byType[t]; }).map(function (t) { return row('تكلفة ' + C.COST_TYPES[t], money(r.byType[t])); }).join('')
      + row('إجمالي التكاليف المسجلة', money(r.totalCost), 'bold') + row('قيمة المشروع', money(r.total))
      + '<div class="sum-row profit' + (r.profit < 0 ? ' neg' : '') + '"><span>' + (j.costsComplete ? 'الربح' : 'الربح التقديري') + '</span><strong>' + esc(money(r.profit)) + '</strong></div>' + row('هامش الربح', fq(r.margin) + '%') + '</div>'
      + '<p class="cost-note">' + (j.costsComplete ? 'من كل التكاليف اللي سجلتها.' : 'تقديري حسب التكاليف اللي اتسجلت بس.') + ' الخامات اللي في البنود بتتحسب تكلفة حتى لو مش على العميل. مش بيظهر للعميل.</p>'
      + '<label class="bill-toggle"><span>سجلت كل تكاليف المشروع</span><input type="checkbox" data-act="costsComplete"' + (j.costsComplete ? ' checked' : '') + '></label></div>'
      + (c ? '<div data-az-crew="' + SECTION + ':' + esc(j.customerId) + '" data-sec="' + SECTION_NAME + '" data-name="' + esc(c.name || '') + '" data-phone="' + esc(c.phone || '') + '" data-address="' + esc(c.address || '') + '" data-rev="' + esc(custRev(j.customerId)) + '" data-paid="' + esc(custPaid(j.customerId)) + '" data-cur="' + esc(cur().sym) + '"></div>' : '')
      + '<div class="card"><div class="card-title"><span class="t-ic">' + ic('edit') + '</span><h2>ملاحظات المشروع</h2></div><textarea id="jobNotes" placeholder="بتظهر في الفاتورة">' + esc(j.notes || '') + '</textarea></div>'
      + '<div class="btn-row"><button type="button" class="btn btn-primary" data-act="preview" data-doc="invoice">' + ic('receipt') + ' الفاتورة</button><button type="button" class="btn btn-ghost" data-act="preview" data-doc="quote">' + ic('file') + ' عرض سعر</button></div>'
      + '<div class="btn-row" style="margin-top:10px"><button type="button" class="btn btn-ghost" data-act="preview" data-doc="materials">' + ic('box') + ' كشف الخامات</button><button type="button" class="btn btn-ghost" data-act="preview" data-doc="costs">' + ic('chart') + ' التكاليف (داخلي)</button></div>'
      + '<div class="btn-row" style="margin-top:10px"><button type="button" class="btn btn-ghost" data-act="dupJob">' + ic('copy') + ' تكرار المشروع</button><button type="button" class="btn btn-danger" data-act="delJob">' + ic('trash') + ' حذف المشروع</button></div></div>'
      + '<div class="pg-foot"><div class="eb-info"><span>الإجمالي</span><strong>' + esc(money(r.total)) + '</strong></div><button type="button" class="btn btn-accent" data-act="preview" data-doc="' + (j.status === 'quote' ? 'quote' : 'invoice') + '">' + ic('print') + (j.status === 'quote' ? ' عرض السعر PDF' : ' الفاتورة PDF') + '</button></div>';
    var el = $('jobPage'), st = el.scrollTop; el.innerHTML = html; el.scrollTop = st;
    $('jobNotes').addEventListener('input', function () { j.notes = this.value; touch(j); saveDb(); });
  }
  function kindGridHTML(act) {
    return '<div class="type-tiles compact">' + TOOLS.map(function (t) { return '<button type="button" class="t-tile" data-act="' + act + '" data-kind="' + t[0] + '"><span class="q-ic orange-soft">' + ic(t[2]) + '</span><b>' + esc(t[1]) + '</b></button>'; }).join('') + '</div>';
  }

  // ====================================================================
  // الأدوات: مكتبة الطوب — العمال واليومية
  // ====================================================================
  var tool = null;
  function openTool(name) {
    tool = name; renderTool();
    var el = $('toolPage'); el.classList.add('open'); el.scrollTop = 0;
    pushLayer({ type: 'page', hide: function () { el.classList.remove('open'); tool = null; } });
  }
  function toolHead(t, s) { return '<div class="pg-head"><button type="button" class="icon-btn" data-act="closeTop" aria-label="رجوع">' + ic('back') + '</button><div class="titles"><h2>' + esc(t) + '</h2><div class="sub">' + esc(s || '') + '</div></div></div>'; }
  function renderTool() {
    var el = $('toolPage'), st = el.scrollTop;
    el.innerHTML = tool === 'library' ? libraryHTML() : workersHTML();
    el.scrollTop = st;
    if (tool === 'workers') renderWorkersRes();
  }
  function libraryHTML() {
    return toolHead('مكتبة الطوب ووحدات البناء', 'المقاسات بتختلف حسب المصنع — عدّلها على مقاس اللي بتشتغل بيه') + '<div class="container">'
      + '<button type="button" class="btn btn-accent" data-act="brickNew" style="margin-bottom:14px">' + ic('plus') + ' إضافة نوع طوب</button>'
      + K.GROUPS.map(function (g) {
        var l = bricks().filter(function (b) { return (b.group || 'clay') === g.id; });
        return l.length ? '<p class="more-h">' + esc(g.label) + '</p>' + l.map(function (b) {
          return '<div class="mat-row" data-act="brickEdit" data-id="' + esc(b.id) + '"><div class="m-info"><div class="m-name">' + esc(b.name) + (b.solid === 'hollow' ? ' <span class="src-badge">مفرغ' + (C.num(b.voidPct) ? ' ' + fq(C.num(b.voidPct)) + '%' : '') + '</span>' : '') + '</div>'
            + '<div class="m-meta">' + esc(fq(C.num(b.L)) + ' × ' + fq(C.num(b.W)) + ' × ' + fq(C.num(b.H)) + ' ' + (b.unit === 'mm' ? 'مم' : 'سم') + (b.supplier ? ' · ' + b.supplier : '') + (b.use ? ' · ' + b.use : '')) + '</div></div>'
            + '<span class="m-qty">' + (C.num(b.price) ? esc(money(C.num(b.price))) + ' / ' + ({ piece: 'طوبة', thousand: 'ألف', pack: 'بالتة' }[b.priceUnit || 'piece']) : '—') + '</span></div>';
        }).join('') : '';
      }).join('') + '</div>';
  }
  var brickDone = null;
  function openBrickSheet(id, onSave) {
    var b = id ? brickById(id) : null, d = b ? clone(b) : { group: 'clay', unit: 'cm', solid: 'solid', priceUnit: 'piece' };
    brickDone = onSave || null;
    var gsel = '<select id="f_bgroup">' + K.GROUPS.map(function (g) { return '<option value="' + g.id + '"' + (g.id === d.group ? ' selected' : '') + '>' + esc(g.label) + '</option>'; }).join('') + '</select>';
    openSheet(b ? 'تعديل نوع طوب' : 'إضافة نوع طوب',
      '<div class="field"><label>التصنيف</label>' + gsel + '</div>'
      + '<div class="field"><label for="f_bname">اسم الطوبة</label><input type="text" id="f_bname" value="' + esc(d.name || '') + '"><div class="unit-chips" id="f_bsug">' + K.group(d.group).types.map(function (t) { return '<button type="button" class="chip" data-act="bName" data-v="' + esc(t) + '">' + esc(t) + '</button>'; }).join('') + '</div></div>'
      + '<div class="grid-4">' + [['L', 'الطول'], ['W', 'العرض'], ['H', 'الارتفاع']].map(function (p) { return '<div class="field"><label>' + p[1] + '</label><input type="text" id="f_b' + p[0] + '" inputmode="decimal" dir="ltr" value="' + esc(v0(d[p[0]])) + '"></div>'; }).join('')
      + '<div class="field"><label>الوحدة</label><select id="f_bunit"><option value="cm"' + (d.unit !== 'mm' ? ' selected' : '') + '>سم</option><option value="mm"' + (d.unit === 'mm' ? ' selected' : '') + '>مم</option></select></div></div>'
      + '<div class="row-2"><div class="field"><label>النوع</label><select id="f_bsolid"><option value="solid"' + (d.solid !== 'hollow' ? ' selected' : '') + '>مصمت</option><option value="hollow"' + (d.solid === 'hollow' ? ' selected' : '') + '>مفرغ</option></select></div>'
      + '<div class="field"><label>نسبة الفراغ % (لو معروفة)</label><input type="text" id="f_bvoid" inputmode="decimal" dir="ltr" value="' + esc(v0(d.voidPct)) + '" placeholder="—"></div></div>'
      + '<div class="field"><label>المادة / طريقة الاستخدام</label><input type="text" id="f_buse" value="' + esc(d.use || '') + '" placeholder="مثلاً: حوائط داخلية، واجهات، قواطيع"></div>'
      + '<div class="grid-3"><div class="field"><label>السعر</label><input type="text" id="f_bprice" inputmode="decimal" dir="ltr" value="' + esc(v0(d.price)) + '"></div>'
      + '<div class="field"><label>لكل</label><select id="f_bpu"><option value="piece"' + ((d.priceUnit || 'piece') === 'piece' ? ' selected' : '') + '>طوبة</option><option value="thousand"' + (d.priceUnit === 'thousand' ? ' selected' : '') + '>ألف طوبة</option><option value="pack"' + (d.priceUnit === 'pack' ? ' selected' : '') + '>بالتة</option></select></div>'
      + '<div class="field"><label>عدد البالتة</label><input type="text" id="f_bpack" inputmode="decimal" dir="ltr" value="' + esc(v0(d.perPack)) + '" placeholder="—"></div></div>'
      + '<div class="row-2"><div class="field"><label>المورد (اختياري)</label><input type="text" id="f_bsup" value="' + esc(d.supplier || '') + '"></div><div class="field"><label>ملاحظات</label><input type="text" id="f_bnote" value="' + esc(d.notes || '') + '"></div></div>'
      + '<button type="button" class="btn btn-accent" data-act="brickSave">' + ic('check') + ' حفظ</button>' + (b ? '<button type="button" class="btn btn-danger" data-act="brickDel" style="margin-top:10px">' + ic('trash') + ' حذف من المكتبة</button>' : ''),
      { form: 'brick', brickId: id || null });
  }
  function saveBrick() {
    var name = $('f_bname').value.trim(); if (!name) { toast('اكتب اسم الطوبة'); return; }
    if (!(C.num($('f_bL').value) && C.num($('f_bW').value) && C.num($('f_bH').value))) { toast('اكتب الطول والعرض والارتفاع'); return; }
    var b = S.brickId ? brickById(S.brickId) : null;
    if (!b) { b = { id: uid('br') }; bricks().push(b); }
    Object.assign(b, { name: name, group: $('f_bgroup').value, material: K.group($('f_bgroup').value).material, L: $('f_bL').value, W: $('f_bW').value, H: $('f_bH').value, unit: $('f_bunit').value, solid: $('f_bsolid').value, voidPct: $('f_bvoid').value,
      use: $('f_buse').value.trim(), price: $('f_bprice').value, priceUnit: $('f_bpu').value, perPack: $('f_bpack').value, supplier: $('f_bsup').value.trim(), notes: $('f_bnote').value.trim() });
    saveSettings();
    var done = brickDone; brickDone = null;
    closeTop(function () { if (done) done(b); refresh(); toast('اتحفظ «' + b.name + '» في المكتبة'); });
  }
  // ---- العمال واليومية ----
  function workersHTML() {
    if (!Array.isArray(settings.workers) || !settings.workers.length) settings.workers = [{ name: '', kind: 'بنّا', mode: 'each', count: '1', days: '', rate: '', hours: '', hourRate: '', amount: '', advance: '' }];
    return toolHead('العمال واليومية', 'الأجور تكلفة عليك — والسلف بتتخصم من المستحق') + '<div class="container"><div class="card">'
      + settings.workers.map(function (w, i) {
        var p = function (f) { return 'data-wk="' + i + '" data-f="' + f + '"'; };
        return '<div class="sub-card"><div class="sc-head"><input type="text" class="grow" ' + p('name') + ' value="' + esc(w.name || '') + '" placeholder="اسم العامل أو الفريق"><button type="button" class="btn btn-danger btn-icon" data-act="delWorker" data-i="' + i + '">' + ic('x') + '</button></div>'
          + '<div class="unit-chips">' + K.WORKER_KINDS.map(function (k) { return '<button type="button" class="chip' + (w.kind === k ? ' on' : '') + '" data-act="wkKind" data-i="' + i + '" data-v="' + esc(k) + '">' + esc(k) + '</button>'; }).join('') + '</div>'
          + '<div class="segmented seg-3 seg-sm" style="margin:6px 0">' + [['each', 'لكل عامل'], ['team', 'للفريق'], ['lump', 'مبلغ ثابت']].map(function (o) { return '<button type="button" class="' + ((w.mode || 'each') === o[0] ? 'on' : '') + '" data-act="wkMode" data-i="' + i + '" data-v="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div>'
          + (w.mode === 'lump' ? '<div class="grid-2 mini"><div><span class="mini-lbl">المبلغ</span><input type="text" inputmode="decimal" dir="ltr" ' + p('amount') + ' value="' + esc(v0(w.amount)) + '"></div><div><span class="mini-lbl">سلف</span><input type="text" inputmode="decimal" dir="ltr" ' + p('advance') + ' value="' + esc(v0(w.advance)) + '"></div></div>'
            : '<div class="grid-3 mini">' + (w.mode !== 'team' ? '<div><span class="mini-lbl">عدد العمال</span><input type="text" inputmode="decimal" dir="ltr" ' + p('count') + ' value="' + esc(v0(w.count)) + '"></div>' : '')
              + '<div><span class="mini-lbl">الأيام</span><input type="text" inputmode="decimal" dir="ltr" ' + p('days') + ' value="' + esc(v0(w.days)) + '"></div><div><span class="mini-lbl">اليومية</span><input type="text" inputmode="decimal" dir="ltr" ' + p('rate') + ' value="' + esc(v0(w.rate)) + '"></div></div>'
              + '<div class="grid-3 mini" style="margin-top:6px"><div><span class="mini-lbl">ساعات إضافية</span><input type="text" inputmode="decimal" dir="ltr" ' + p('hours') + ' value="' + esc(v0(w.hours)) + '" placeholder="—"></div><div><span class="mini-lbl">سعر الساعة</span><input type="text" inputmode="decimal" dir="ltr" ' + p('hourRate') + ' value="' + esc(v0(w.hourRate)) + '" placeholder="—"></div><div><span class="mini-lbl">سلف</span><input type="text" inputmode="decimal" dir="ltr" ' + p('advance') + ' value="' + esc(v0(w.advance)) + '" placeholder="—"></div></div>')
          + '<div class="line-total" data-wkr="' + i + '"></div></div>';
      }).join('') + '<button type="button" class="btn btn-ghost btn-sm" data-act="addWorker">' + ic('plus') + ' عامل / فريق</button></div>'
      + '<div class="card"><div class="sum-list" id="wkSum"></div><div class="btn-row" style="margin-top:10px"><button type="button" class="btn btn-primary" data-act="workersToJob">' + ic('box') + ' أضف الأجور لمشروع</button><button type="button" class="btn btn-ghost" data-act="workersClear">مسح الكل</button></div>'
      + '<p class="cost-note">لمتابعة يوميات كل عامل والفلوس اللي اتدفعتله على مدار الشغل استخدم «نوتة العمال» في صفحة المشروع.</p></div></div>';
  }
  function renderWorkersRes() {
    var w = C.workers(settings.workers);
    w.rows.forEach(function (r, i) { var el = document.querySelector('[data-wkr="' + i + '"]'); if (el) el.innerHTML = 'الأجر ' + esc(money(r.gross)) + (r.advance ? ' − سلف ' + esc(money(r.advance)) + ' = <b>المستحق ' + esc(money(r.due)) + '</b>' : ''); });
    var s = $('wkSum'); if (s) s.innerHTML = row('إجمالي الأجور', money(w.gross), 'bold') + row('السلف', money(w.advance)) + row('المستحق للعمال', money(w.due), 'bold');
  }
  $('toolPage').addEventListener('input', function (e) {
    var el = e.target; if (el.dataset.wk == null) return;
    var w = settings.workers[+el.dataset.wk]; if (w) { w[el.dataset.f] = el.value; saveSettings(); renderWorkersRes(); }
  });

  // ====================================================================
  // المستندات: فاتورة — عرض سعر — كشف الخامات — كشف التكاليف (داخلي) — كشف حساب
  // ====================================================================
  var pv = null;
  function business() { var b = settings.business || {}; return { name: b.name || '', trade: 'أعمال البناء والمباني', phone: b.phone || '', address: b.address || '', logo: b.logo || '' }; }
  function laborQtyText(x) {
    var l = x.labor, u = { sqm: 'م²', m3: 'م³', brick: 'طوبة', lm: 'م.ط', piece: 'قطعة' }[l.method];
    if (l.method === 'lump') return 'مقطوعية';
    if (l.method === 'stages') return l.stages.length + ' مرحلة';
    if (l.method === 'daily') return fq(l.days) + ' يوم' + (l.perWorker ? ' × ' + fq(l.workers) + ' عامل' : '');
    return '<b>' + fq(l.qty) + '</b> ' + u;
  }
  function quantitiesHTML(r, A, n) {
    var h = '';
    if (r.bricks.length) h += '<table class="p-table"><thead><tr><th>م</th><th>نوع الطوب</th><th>طريقة البناء والسمك</th><th>المساحة</th><th>الأساسي</th><th>الهالك</th><th>المطلوب</th></tr></thead><tbody>'
      + r.bricks.map(function (b, i) { return '<tr><td class="idx">' + (i + 1) + '</td><td class="t">' + A.esc(b.name) + '</td><td>' + A.esc(b.layoutLabel) + ' · ' + fq(b.thickness * 100) + ' سم</td><td>' + fq(b.net) + ' م²</td><td>' + fmt(b.base, 0) + '</td><td>' + fmt(b.waste, 0) + '</td><td class="money">' + fmt(b.final, 0) + (b.packs ? '<span class="sub-note">' + fmt(b.packs, 0) + ' بالتة</span>' : '') + '</td></tr>'; }).join('') + '</tbody></table>';
    if (r.cementBags || r.sandM3) h += '<div class="inv-chips-row">' + (r.cementBags ? '<span class="inv-chip navy">الأسمنت: <b>' + fmt(r.cementBags, 0) + ' شيكارة</b></span>' : '') + (r.sandM3 ? '<span class="inv-chip navy">الرمل: <b>' + fq(r.sandM3) + ' م³</b></span>' : '') + (r.limeM3 ? '<span class="inv-chip navy">الجير: <b>' + fq(r.limeM3) + ' م³</b></span>' : '') + '</div>';
    return h ? '<div class="inv-sec"><span class="n">' + n + '</span> الكميات</div>' + h : '';
  }
  function jobDocHTML(j, doc) {
    var r = C.job(j), c = getCust(j.customerId) || {}, A = window.ArzaqiInvoice, rows = '';
    j.items.forEach(function (it, i) {
      var x = r.items[i], sub = [];
      if (it.kind === 'walls') x.walls.forEach(function (w) { sub.push(w.name + ': ' + fq(w.net) + ' م² — ' + (w.brickName || '') + ' ' + C.LAYOUTS[w.layout].label + (w.open ? ' (خصم فتحات ' + fq(w.open) + ' م²)' : '')); });
      else if (it.kind === 'plaster') sub.push('سمك ' + fq(C.num(it.thickness)) + ' سم');
      else if (it.kind === 'floor') x.layers.forEach(function (l) { sub.push(l.name + (l.material ? ' — ' + l.material : '') + ' ' + fq(l.thickness * 100) + ' سم'); });
      if (it.notes) sub.push(it.notes);
      rows += '<tr><td class="idx">' + (i + 1) + '</td><td class="t">' + A.esc(itemTitle(it)) + sub.map(function (s) { return '<span class="sub-note">' + A.esc(s) + '</span>'; }).join('') + '</td><td>' + A.esc(x.labor.label) + '</td><td>' + laborQtyText(x) + '</td>'
        + '<td class="money">' + (['lump', 'stages', 'daily'].indexOf(x.labor.method) < 0 ? fmt(x.labor.price) : x.labor.method === 'daily' ? fmt(x.labor.price) : '—') + '</td><td class="money">' + money(x.labor.amount) + '</td></tr>';
      (x.labor.stages || []).forEach(function (s) { rows += '<tr class="task"><td></td><td class="t" colspan="3">— ' + A.esc(s.name || 'مرحلة') + '</td><td class="money">' + money(s.amount) + '</td><td></td></tr>'; });
      x.extras.filter(function (e) { return e.amount; }).forEach(function (e) { rows += '<tr class="task"><td></td><td class="t" colspan="4">+ ' + A.esc(e.name || 'إضافة') + '</td><td class="money">' + money(e.amount) + '</td></tr>'; });
    });
    var body = '<div class="inv-sec"><span class="n">1</span> الأعمال والمصنعية</div><table class="p-table"><thead><tr><th>م</th><th>البند والتفاصيل</th><th>طريقة الحساب</th><th>الكمية</th><th>سعر الوحدة</th><th>المصنعية</th></tr></thead><tbody>'
      + (rows || '<tr><td colspan="6">لسه مفيش بنود</td></tr>') + '</tbody><tfoot><tr><td colspan="5">إجمالي المصنعية والإضافات</td><td>' + money(r.labor + r.extras) + '</td></tr></tfoot></table>';
    var n = 1, billed = [];
    j.items.forEach(function (it, i) { if (it.matBilled) r.items[i].materials.forEach(function (m) { billed.push([itemTitle(it), m]); }); });
    j.costs.forEach(function (k, i) { if (r.costs[i].billed) billed.push(['', { name: k.name || C.COST_TYPES[k.type], qty: r.costs[i].qty, unit: k.unit || '', price: r.costs[i].price, cost: r.costs[i].total, pct: k.mode === 'pct' }]); });
    if (billed.length) { n++; body += '<div class="inv-sec"><span class="n">' + n + '</span> الخامات والمصاريف</div><table class="p-table"><thead><tr><th>م</th><th>البيان</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th></tr></thead><tbody>'
      + billed.map(function (p, i) { var m = p[1]; return '<tr><td class="idx">' + (i + 1) + '</td><td class="t">' + A.esc(m.name) + (p[0] ? '<span class="sub-note">' + A.esc(p[0]) + '</span>' : '') + '</td><td>' + (m.pct ? '—' : fq(m.qty) + ' ' + A.esc(m.unit)) + '</td><td class="money">' + (m.price ? fmt(m.price) : '—') + '</td><td class="money">' + money(m.cost) + '</td></tr>'; }).join('') + '</tbody></table>'; }
    n++; body += quantitiesHTML(r, A, n);
    var notes = [j.notes, settings.terms].map(function (s) { return String(s || '').trim(); }).filter(Boolean), cc = cur();
    var discLbl = 'الخصم' + (j.discount && j.discount.type === 'percent' && C.num(j.discount.value) ? ' (' + fq(j.discount.value) + '%)' : '');
    return A.render({ section: SECTION, docKey: doc + ':' + j.id, docLabel: doc === 'quote' ? 'عرض سعر' : 'فاتورة', number: j.number, date: fmtDate(j.date || today()), billable: doc !== 'quote', currency: cc.name + ' (' + cc.sym + ')', business: business(),
      client: { name: c.name || '', phone: c.phone || '', address: c.address || '', note: c.note || '' }, fields: [{ label: 'المشروع', value: j.title || '' }], bodyHTML: body,
      notesHTML: notes.length ? '<div class="inv-notes"><h4>ملاحظات</h4>' + notes.map(function (x) { return '<div>' + A.esc(x).replace(/\n/g, '<br>') + '</div>'; }).join('') + '</div>' : '',
      totals: { lines: [['إجمالي المصنعية', r.labor], ['إضافات', r.extras], ['الخامات', r.matBilled], ['مصاريف', r.billedCosts], [discLbl, r.discount, '-']], total: r.total, totalLabel: doc === 'quote' ? 'إجمالي العرض' : 'الإجمالي', paid: r.paid, paidLabel: 'المدفوع' },
      netLabel: 'إجمالي عرض السعر', money: money, signLabel: 'توقيع المقاول' });
  }
  function materialsDocHTML(j) {
    var r = C.job(j), c = getCust(j.customerId) || {}, A = window.ArzaqiInvoice, list = [], cc = cur();
    j.items.forEach(function (it, i) { r.items[i].materials.forEach(function (m) { list.push([itemTitle(it), m]); }); });
    var body = '<div class="inv-sec"><span class="n">1</span> الخامات المطلوبة</div><table class="p-table"><thead><tr><th>م</th><th>الخامة</th><th>البند</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th></tr></thead><tbody>'
      + (list.map(function (p, i) { var m = p[1]; return '<tr><td class="idx">' + (i + 1) + '</td><td class="t">' + A.esc(m.name) + '</td><td>' + A.esc(p[0]) + '</td><td>' + fq(m.qty) + ' ' + A.esc(m.unit) + '</td><td class="money">' + (m.price ? fmt(m.price) : '—') + '</td><td class="money">' + (m.cost ? money(m.cost) : '—') + '</td></tr>'; }).join('') || '<tr><td colspan="6">مفيش خامات محسوبة</td></tr>')
      + '</tbody></table>' + quantitiesHTML(r, A, 2);
    var mt = C.money(r.items.reduce(function (s, x) { return s + x.matCost; }, 0));
    return A.render({ section: SECTION, docKey: 'materials:' + j.id, docLabel: 'كشف الخامات', number: j.number, date: fmtDate(today()), billable: false, currency: cc.name + ' (' + cc.sym + ')', business: business(),
      client: { name: c.name || '', phone: c.phone || '' }, fields: [{ label: 'المشروع', value: j.title || '' }], bodyHTML: body,
      totals: { lines: [], total: mt, totalLabel: 'تكلفة الخامات', noSum: true }, netLabel: 'تكلفة الخامات', boxTitle: 'الخامات', money: money, noWarranty: true, signs: [] });
  }
  function costsDocHTML(j) {
    var r = C.job(j), c = getCust(j.customerId) || {}, A = window.ArzaqiInvoice, cc = cur(), lines = [];
    j.items.forEach(function (it, i) { r.items[i].materials.forEach(function (m) { lines.push([m.name, itemTitle(it), fq(m.qty) + ' ' + m.unit, m.cost]); }); });
    j.costs.forEach(function (k, i) { var x = r.costs[i]; lines.push([k.name || C.COST_TYPES[x.type], C.COST_TYPES[x.type] + (k.billed ? ' · على العميل' : ''), k.mode === 'pct' ? fq(x.pct) + '%' : k.mode === 'amount' ? 'مبلغ' : fq(x.qty) + ' ' + (k.unit || ''), x.total]); });
    var body = '<div class="inv-sec"><span class="n">1</span> التكاليف (داخلي — مش للعميل)</div><table class="p-table"><thead><tr><th>م</th><th>البيان</th><th>النوع / البند</th><th>الكمية</th><th>الإجمالي</th></tr></thead><tbody>'
      + (lines.map(function (l, i) { return '<tr><td class="idx">' + (i + 1) + '</td><td class="t">' + A.esc(l[0]) + '</td><td>' + A.esc(l[1]) + '</td><td>' + A.esc(l[2]) + '</td><td class="money">' + money(l[3]) + '</td></tr>'; }).join('') || '<tr><td colspan="5">مفيش تكاليف</td></tr>')
      + '</tbody><tfoot><tr><td colspan="4">إجمالي التكاليف</td><td>' + money(r.totalCost) + '</td></tr></tfoot></table>';
    var summary = '<div class="inv-notes"><h4>الربح</h4><div>قيمة المشروع: <b>' + money(r.total) + '</b></div><div>إجمالي التكاليف: <b>' + money(r.totalCost) + '</b></div><div>' + (j.costsComplete ? 'الربح' : 'الربح التقديري') + ': <b>' + money(r.profit) + '</b> (هامش ' + fq(r.margin) + '%)</div></div>';
    return A.render({ section: SECTION, docKey: 'costs:' + j.id, docLabel: 'كشف التكاليف والربح', number: j.number, date: fmtDate(today()), billable: false, currency: cc.name + ' (' + cc.sym + ')', business: business(),
      client: { name: c.name || '', phone: c.phone || '' }, fields: [{ label: 'المشروع', value: j.title || '' }, { label: 'مستند', value: 'داخلي' }], bodyHTML: body, notesHTML: summary,
      totals: { lines: C.COST_ORDER.filter(function (t) { return r.byType[t]; }).map(function (t) { return [C.COST_TYPES[t], r.byType[t]]; }), total: r.totalCost, totalLabel: 'إجمالي التكاليف', noSum: true }, netLabel: 'إجمالي التكاليف', boxTitle: 'التكاليف', money: money, noWarranty: true, signs: [] });
  }

  function custRev(cid) { return C.money(jobsOf(cid).filter(function (j) { return j.status !== 'quote'; }).reduce(function (s, j) { return s + C.job(j).total; }, 0)); }
  function custPaid(cid) { return C.money(jobsOf(cid).reduce(function (s, j) { return s + C.job(j).paid; }, 0)); }
  function openJobMenu() {
    openSheet('خيارات المشروع', '<div class="menu-list">'
      + '<button type="button" class="action-item" data-act="editJobInfo"><span class="a-ic">' + ic('edit') + '</span><span>تعديل بيانات المشروع<small>العميل، الاسم، التاريخ، الرقم</small></span></button>'
      + '<button type="button" class="action-item" data-act="openCustOfJob"><span class="a-ic">' + ic('users') + '</span><span>صفحة العميل<small>كل مشاريعه وكشف الحساب</small></span></button>'
      + '<button type="button" class="action-item" data-act="dupJob"><span class="a-ic orange">' + ic('copy') + '</span><span>تكرار المشروع<small>مشروع مشابه بنفس البنود والخامات (من غير الدفعات)</small></span></button>'
      + '<button type="button" class="action-item" data-act="delJob"><span class="a-ic" style="background:var(--danger-soft);color:var(--danger)">' + ic('trash') + '</span><span>حذف المشروع<small>بعد التأكيد</small></span></button></div>', {});
  }
  function openJobInfoSheet() {
    var j = getJob(openJobId); if (!j) return;
    var c = getCust(j.customerId) || {};
    openSheet('بيانات المشروع', '<div class="field"><label for="f_cname">العميل</label><input type="text" id="f_cname" autocomplete="off" value="' + esc(c.name || '') + '"><div id="f_csug"></div></div>'
      + '<div class="field"><label for="f_jtitle">اسم المشروع</label><input type="text" id="f_jtitle" value="' + esc(j.title || '') + '"></div>'
      + '<div class="row-2"><div class="field"><label for="f_date">التاريخ</label><input type="date" id="f_date" value="' + esc(j.date || today()) + '"></div>'
      + '<div class="field"><label for="f_num">الرقم</label><input type="text" id="f_num" dir="ltr" value="' + esc(j.number || '') + '"></div></div>'
      + '<button type="button" class="btn btn-primary" data-act="saveJobInfo">' + ic('check') + ' حفظ</button>', { jobId: j.id, custId: c.id || null });
    bindCustSuggest();
  }
  function saveJobInfo() {
    var j = getJob(S.jobId); if (!j) return;
    var name = $('f_cname').value.trim(); if (!name) { toast('اكتب اسم العميل'); return; }
    var c = ensureCustomer(name);
    j.customerId = c.id; j.title = $('f_jtitle').value.trim(); j.date = $('f_date').value || j.date; j.number = $('f_num').value.trim() || j.number;
    touch(j); saveDb(); closeTop(function () { refresh(); toast('اتحفظ'); });
  }
  function dupJob() {
    var j = getJob(openJobId); if (!j) return;
    var c = getCust(j.customerId) || ensureCustomer('عميل');
    var n = newJobRecord(c, (j.title || 'مشروع') + ' (نسخة)', today(), j.status === 'quote' ? 'quote' : 'active');
    var copy = clone(j), map = {};
    n.items = copy.items.map(function (x) { var id = uid('i'); map[x.id] = id; x.id = id; return x; });
    n.costs = copy.costs.map(function (x) { x.id = uid('k'); if (x.itemId) x.itemId = map[x.itemId]; return x; });
    n.discount = copy.discount; n.notes = copy.notes;
    saveDb();
    var go = function () { refresh(); openJob(n.id); toast('اتعمل مشروع مشابه: ' + n.number); };
    if (topLayer() && topLayer().type === 'sheet') closeTop(function () { closeTop(go); }); else closeTop(go);
  }
  function delJob() {
    var j = getJob(openJobId); if (!j) return;
    var doIt = function () {
      confirmDlg('حذف المشروع؟', 'هيتمسح مشروع ' + custName(j) + ' ' + (j.number || '') + ' بكل بنوده وخاماته ودفعاته. مش هينفع ترجّعه.', 'أيوه، امسح').then(function (ok) {
        if (!ok) return;
        db.jobs = db.jobs.filter(function (x) { return x.id !== j.id; }); saveDb();
        closeTop(function () { refresh(); toast('اتمسح المشروع'); });
      });
    };
    if (topLayer() && topLayer().type === 'sheet') closeTop(doIt); else doIt();
  }

  // ---------------- صفحة العميل ----------------
  function openCust(id) {
    if (!getCust(id)) return;
    openCustId = id; renderCust(id);
    var el = $('custPage'); el.classList.add('open'); el.scrollTop = 0;
    pushLayer({ type: 'page', hide: function () { el.classList.remove('open'); openCustId = null; } });
  }
  function renderCust(id) {
    var c = getCust(id); if (!c) return;
    var js = jobsOf(id).sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
    var tot = custRev(id), paid = custPaid(id);
    var html = '<div class="pg-head"><button type="button" class="icon-btn" data-act="closeTop" aria-label="رجوع">' + ic('back') + '</button>'
      + '<div class="titles"><h2>' + esc(c.name) + '</h2><div class="sub">' + esc([c.phone, c.address].filter(Boolean).join(' · ') || 'عميل') + '</div></div>'
      + '<button type="button" class="icon-btn" data-act="editCust" aria-label="تعديل">' + ic('edit') + '</button></div><div class="container">'
      + '<div class="mini-stats"><div><span>إجمالي المشاريع</span><strong>' + esc(money(tot)) + '</strong></div><div><span>المدفوع</span><strong>' + esc(money(paid)) + '</strong></div><div><span>المتبقي</span><strong>' + esc(money(tot - paid)) + '</strong></div></div>'
      + (c.note ? '<div class="note" style="margin-bottom:12px">' + esc(c.note) + '</div>' : '')
      + (c.phone ? '<a class="btn btn-ghost" href="tel:' + esc(c.phone) + '" style="margin-bottom:10px">' + ic('phone') + ' اتصال</a>' : '')
      + '<button type="button" class="btn btn-accent" data-act="newJobFor" style="margin-bottom:14px">' + ic('plus') + ' مشروع جديد لـ ' + esc(c.name) + '</button>'
      + '<div class="section-head"><h3>المشاريع <span class="count">' + js.length + '</span></h3></div>'
      + (js.length ? js.map(function (j) { return jobCard(j, 'openJob'); }).join('') : '<div class="home-empty">مفيش مشاريع للعميل ده</div>')
      + '<div style="margin-top:14px" data-az-crew="' + SECTION + ':' + esc(c.id) + '" data-sec="' + SECTION_NAME + '" data-name="' + esc(c.name) + '" data-phone="' + esc(c.phone || '') + '" data-address="' + esc(c.address || '') + '" data-rev="' + esc(tot) + '" data-paid="' + esc(paid) + '" data-cur="' + esc(cur().sym) + '"></div>'
      + '<div class="btn-row" style="margin-top:12px"><button type="button" class="btn btn-primary" data-act="statement">' + ic('receipt') + ' كشف حساب PDF</button><button type="button" class="btn btn-danger" data-act="delCust">' + ic('trash') + ' حذف العميل</button></div></div>';
    var el = $('custPage'), st = el.scrollTop; el.innerHTML = html; el.scrollTop = st;
  }
  function delCust() {
    var c = getCust(openCustId); if (!c) return;
    var n = jobsOf(c.id).length;
    confirmDlg('حذف العميل؟', n ? 'هيتمسح ' + c.name + ' ومعاه ' + n + ' مشروع. مش هينفع ترجّعهم.' : 'هيتمسح ' + c.name + '.', 'أيوه، امسح').then(function (ok) {
      if (!ok) return;
      db.jobs = db.jobs.filter(function (j) { return j.customerId !== c.id; }); db.customers = db.customers.filter(function (x) { return x.id !== c.id; });
      saveDb(); closeTop(function () { refresh(); toast('اتمسح العميل'); });
    });
  }

  // ---------------- اختيار مشروع (للتكاليف، الدفعة، أو إضافة ألواح/خشب) ----------------
  function openPickJob(purpose, payload) {
    var list = sortedJobs().sort(function (a, b) { return (a.status === 'done') - (b.status === 'done'); });
    if (purpose === 'pay') list = list.filter(function (j) { return C.job(j).remaining > 0.005; });
    if (!list.length) {
      if (purpose === 'pay') { toast('مفيش مشاريع عليها فلوس'); return; }
      openSheet('اختار المشروع', '<div class="empty"><div class="big">' + ic('file') + '</div><p>اعمل مشروع الأول.</p><button type="button" class="btn btn-accent" data-act="newJob">' + ic('plus') + ' مشروع جديد</button></div>', {});
      return;
    }
    var add = purpose === 'addCosts';
    openSheet(purpose === 'pay' ? 'تسجيل دفعة — اختار المشروع' : add ? 'إضافة التكلفة لمشروع' : 'اختار المشروع',
      (add ? '<label class="bill-toggle" style="margin:0 0 12px"><span>على حساب العميل (في الفاتورة)</span><input type="checkbox" id="f_pbilled"></label>' : '')
      + '<div class="pick-list">' + list.slice(0, 40).map(function (j) { return jobCard(j, 'pickedJob'); }).join('') + '</div>', { pickFor: purpose, payload: payload });
  }

  function statementHTML(cid) {
    var c = getCust(cid) || {}, A = window.ArzaqiInvoice, cc = cur();
    var js = jobsOf(cid).filter(function (j) { return j.status !== 'quote'; }).sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); });
    var tot = 0, paid = 0, pays = [];
    var rows = js.map(function (j, i) {
      var r = C.job(j); tot += r.total; paid += r.paid;
      j.payments.forEach(function (p) { pays.push({ date: p.date, job: j, amount: C.num(p.amount), note: p.note }); });
      return '<tr><td class="idx">' + (i + 1) + '</td><td class="t">' + A.esc(j.title || 'مشروع') + '<span class="sub-note">' + A.esc(j.number || '') + '</span></td><td>' + fmtDate(j.date) + '</td><td class="money">' + money(r.total) + '</td><td class="money">' + money(r.paid) + '</td><td class="money">' + money(r.remaining) + '</td></tr>';
    }).join('');
    pays.sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); });
    var body = '<div class="inv-sec"><span class="n">1</span> المشاريع</div><table class="p-table"><thead><tr><th>م</th><th>المشروع</th><th>التاريخ</th><th>الإجمالي</th><th>المدفوع</th><th>المتبقي</th></tr></thead><tbody>' + (rows || '<tr><td colspan="6">مفيش مشاريع</td></tr>')
      + '</tbody><tfoot><tr><td colspan="3">الإجمالي</td><td>' + money(tot) + '</td><td>' + money(paid) + '</td><td>' + money(tot - paid) + '</td></tr></tfoot></table>';
    if (pays.length) body += '<div class="inv-sec"><span class="n">2</span> الدفعات</div><table class="p-table"><thead><tr><th>م</th><th>التاريخ</th><th>المشروع</th><th>ملحوظة</th><th>المبلغ</th></tr></thead><tbody>'
      + pays.map(function (p, i) { return '<tr><td class="idx">' + (i + 1) + '</td><td>' + fmtDate(p.date) + '</td><td>' + A.esc(p.job.number || '') + '</td><td class="t">' + A.esc(p.note || '') + '</td><td class="money">' + money(p.amount) + '</td></tr>'; }).join('') + '</tbody></table>';
    return A.render({ section: SECTION, docKey: 'statement:' + cid, docLabel: 'كشف حساب', date: fmtDate(today()), billable: true, currency: cc.name + ' (' + cc.sym + ')', business: business(),
      client: { name: c.name || '', phone: c.phone || '', address: c.address || '', note: c.note || '' }, bodyHTML: body, totals: { lines: [['إجمالي المشاريع', tot]], total: tot, totalLabel: 'الإجمالي المستحق', paid: paid, paidLabel: 'المدفوع' },
      money: money, noWarranty: true, signs: [], boxTitle: 'ملخص الحساب' });
  }
  function docTitle() {
    if (!pv) return document.title;
    if (pv.custId) return 'كشف حساب — ' + ((getCust(pv.custId) || {}).name || '');
    var j = getJob(pv.jobId) || {};
    return ({ quote: 'عرض سعر', costs: 'كشف التكاليف', materials: 'كشف الخامات', invoice: 'فاتورة' }[pv.doc] || 'فاتورة') + ' ' + (j.number || '') + ' — ' + custName(j);
  }
  function openPreview(o) {
    pv = o; renderPreview();
    var m = $('printPreviewModal'); m.style.display = 'block'; m.scrollTop = 0;
    pushLayer({ type: 'preview', hide: function () { m.style.display = 'none'; pv = null; } });
    fitPreview(); if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitPreview); setTimeout(fitPreview, 300);
  }
  function renderPreview() {
    if (!pv) return;
    $('pvDocs').innerHTML = pv.jobId ? [['invoice', 'فاتورة'], ['quote', 'عرض سعر'], ['materials', 'الخامات'], ['costs', 'التكاليف']].map(function (d) { return '<button type="button" data-act="pvDoc" data-doc="' + d[0] + '" class="' + (pv.doc === d[0] ? 'on' : '') + '">' + d[1] + '</button>'; }).join('') : '';
    $('printSheet').innerHTML = pv.custId ? statementHTML(pv.custId) : pv.doc === 'costs' ? costsDocHTML(getJob(pv.jobId)) : pv.doc === 'materials' ? materialsDocHTML(getJob(pv.jobId)) : jobDocHTML(getJob(pv.jobId), pv.doc);
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
  // الأزرار
  // ====================================================================
  function afterSheet(fn) { if (topLayer() && topLayer().type === 'sheet') closeTop(fn); else fn(); }
  function P() { return (E && !E.jobId && !sheet.classList.contains('open')) ? E : S; }
  function listAt(path) { var l = getPath(E.it, path); if (!Array.isArray(l)) { l = []; setPath(E.it, path, l); } return l; }
  var ACT = {
    closeTop: function () { closeTop(); },
    view: function (b) { var go = function () { if (b.dataset.filter) jobFilter.f = b.dataset.filter; switchView(b.dataset.view); }; if (stack.length) closeTop(go); else go(); },
    create: function () {
      openSheet('إنشاء جديد', '<div class="create-list"><button type="button" class="create-opt dark" data-act="newJob"><span class="q-ic orange">' + ic('plus') + '</span><span><b>مشروع جديد</b><small>عميل + حوائط ومونة ومحارة ومصنعية + فاتورة</small></span></button>'
        + '<p class="more-h">أو افتح حاسبة على طول</p>' + kindGridHTML('quickKindSheet')
        + '<div class="create-row"><button type="button" class="create-opt" data-act="tool" data-tool="workers"><span class="q-ic">' + ic('users') + '</span><span><b>العمال واليومية</b><small>أجور وسلف</small></span></button>'
        + '<button type="button" class="create-opt" data-act="quickPay"><span class="q-ic green">' + ic('cash') + '</span><span><b>تسجيل دفعة</b><small>من عميل</small></span></button></div>'
        + '<button type="button" class="create-opt" data-act="newCustomer"><span class="q-ic">' + ic('users') + '</span><span><b>عميل جديد</b><small>اسم وتليفون</small></span></button></div>', {});
    },
    newJob: function () { openNewJobSheet(null); },
    newJobFor: function () { openNewJobSheet(openCustId); },
    createJob: createJob,
    quickKind: function (b) { openItem({ kind: b.dataset.kind }); },
    quickKindSheet: function (b) { var k = b.dataset.kind; afterSheet(function () { openItem({ kind: k }); }); },
    addKind: function (b) { openItem({ jobId: openJobId, kind: b.dataset.kind }); },
    pickKind: function (b) { var id = S.jobId, k = b.dataset.kind; closeTop(function () { openItem({ jobId: id, kind: k }); }); },
    quickPay: function () { openPickJob('pay'); },
    quickCosts: function () { openPickJob('costs'); },
    pickedJob: function (b) {
      var id = b.dataset.id, purpose = S.pickFor, payload = S.payload, billed = $('f_pbilled') ? $('f_pbilled').checked : false;
      if (purpose === 'addCosts') { closeTop(function () { var n = payload(id, billed); refresh(); toast(n ? 'اتضاف للمشروع' : 'مفيش حاجة تتضاف'); }); return; }
      closeTop(function () { openJob(id); if (purpose === 'pay') openPaySheet(id); else openCostSheet(id, null, 'waste'); });
    },
    pickInvoice: function () { switchView('jobs'); setPick(true); renderJobs(); },
    cancelPick: function () { setPick(false); renderJobs(); },
    pickedInvoice: function (b) { setPick(false); renderJobs(); var j = getJob(b.dataset.id); openPreview({ doc: j && j.status === 'quote' ? 'quote' : 'invoice', jobId: b.dataset.id }); },
    openJob: function (b) { openJob(b.dataset.id); },
    openCust: function (b) { openCust(b.dataset.id); },
    newCustomer: function () { afterSheet(function () { openCustomerSheet(null); }); },
    saveCustomer: saveCustomer,
    editCust: function () { openCustomerSheet(openCustId); },
    delCust: delCust,
    statement: function () { openPreview({ doc: 'statement', custId: openCustId }); },
    pickCust: function (b) { var c = getCust(b.dataset.id); if (!c) return; $('f_cname').value = c.name; P().custName = c.name; P().custId = c.id; $('f_csug').innerHTML = ''; if ($('f_cphone') && !$('f_cphone').value) $('f_cphone').value = c.phone || ''; renderTargetJobs(); },
    target: function (b) { P().targetJob = b.dataset.id || null; renderTargetJobs(); },
    // ---- البند ----
    editItem: function (b) { openItem({ jobId: openJobId, itemId: b.dataset.id }); },
    setK: function (b) { setPath(E.it, b.dataset.k, b.dataset.v); renderItemPage(); },
    addWall: function () { E.it.walls.push(newWall(E.it, E.it.walls.length + 1)); var last = E.it.walls[E.it.walls.length - 2]; if (last) { E.it.walls[E.it.walls.length - 1].brick = clone(last.brick); E.it.walls[E.it.walls.length - 1].layout = last.layout; } renderItemPage(); },
    addRoom: function () { openRoomSheet(); },
    saveRoom: saveRoom,
    addOpening: function (b) { listAt(b.dataset.path).push({ name: b.dataset.v, w: '', h: '', count: '1' }); renderItemPage(); },
    addSurface: function () { var l = listAt('surfaces'); l.push({ name: (E.it.kind === 'stone' ? 'واجهة ' : 'مساحة ') + (l.length + 1), kind: E.it.kind === 'stone' ? 'واجهة' : 'حائط', L: '', H: '', count: '1', openings: [] }); renderItemPage(); },
    addZone: function () { var l = listAt('zones'); l.push({ name: 'منطقة ' + (l.length + 1), L: '', W: '', count: '1' }); renderItemPage(); },
    addLayer: function () { var l = listAt('layers'); l.push({ name: 'طبقة ' + (l.length + 1), material: '', thickness: '', method: 'm3', price: '', c: '', s: '', rate: '', rateUnit: '', wastePct: '' }); renderItemPage(); },
    addStage: function (b) { var l = listAt('labor.stages'); if (l.length === 1 && !l[0].name && !C.num(l[0].amount)) l.pop(); l.push({ name: b.dataset.v, amount: '' }); renderItemPage(); },
    addExtra: function (b) { listAt('extras').push({ name: b.dataset.v, amount: '' }); renderItemPage(); },
    delAt: function (b) { listAt(b.dataset.path).splice(+b.dataset.i, 1); renderItemPage(); },
    dupAt: function (b) { var l = listAt(b.dataset.path), x = clone(l[+b.dataset.i]); x.name = (x.name || '') + ' (نسخة)'; l.splice(+b.dataset.i + 1, 0, x); renderItemPage(); },
    saveItem: saveItem,
    dupItem: function () { var j = getJob(E.jobId); if (!j) return; var src = j.items.find(function (x) { return x.id === E.itemId; }); if (!src) return; var c = clone(src); c.id = uid('i'); j.items.splice(j.items.indexOf(src) + 1, 0, c); touch(j); saveDb(); closeTop(function () { refresh(); toast('اتكرر البند'); }); },
    delItem: function () {
      var j = getJob(E.jobId), id = E.itemId; if (!j) return;
      confirmDlg('حذف البند؟', 'هيتمسح «' + itemTitle(E.it) + '» من المشروع.', 'أيوه، امسح').then(function (ok) { if (!ok) return; j.items = j.items.filter(function (x) { return x.id !== id; }); touch(j); saveDb(); closeTop(function () { refresh(); toast('اتمسح البند'); }); });
    },
    // ---- التكاليف ----
    addCost: function (b) { openCostSheet(openJobId, null, b.dataset.type); },
    editCost: function (b) { openCostSheet(openJobId, b.dataset.id); },
    costType: function (b) { readCost(); S.d.type = b.dataset.v; renderCostSheet(); },
    wasteMode: function (b) { readCost(); S.d.mode = b.dataset.v === 'qty' ? '' : b.dataset.v; renderCostSheet(); },
    costName: function (b) { $('f_kname').value = b.dataset.v; },
    costUnit: function (b) { $('f_kunit').value = b.dataset.v; },
    saveCost: saveCost,
    delCost: function () { var j = getJob(S.jobId), id = S.costId; if (!j) return; j.costs = j.costs.filter(function (x) { return x.id !== id; }); touch(j); saveDb(); closeTop(function () { refresh(); toast('اتمسح'); }); },
    costsComplete: function (b) { var j = getJob(openJobId); if (!j) return; j.costsComplete = !!b.checked; touch(j); saveDb(); refresh(); },
    // ---- الحساب ----
    addPay: function () { openPaySheet(openJobId); },
    editPay: function (b) { openPaySheet(openJobId, b.dataset.id); },
    payAll: function (b) { $('f_pamt').value = b.dataset.v; },
    savePay: savePay,
    delPay: function () { var j = getJob(S.jobId), id = S.payId; if (!j) return; j.payments = j.payments.filter(function (x) { return x.id !== id; }); touch(j); saveDb(); closeTop(function () { refresh(); toast('اتمسحت الدفعة'); }); },
    editDisc: function () { openDiscSheet(openJobId); },
    discType: function (b) { S.dtype = b.dataset.v; updateDiscLive(); },
    saveDisc: function () { var j = getJob(S.jobId); if (!j) return; j.discount = { type: S.dtype, value: C.num($('f_dval').value) }; touch(j); saveDb(); closeTop(function () { refresh(); toast('اتحفظ الخصم'); }); },
    setStatus: function (b) { var j = getJob(openJobId); if (!j) return; j.status = b.dataset.v; touch(j); saveDb(); refresh(); toast(STATUS[j.status][0]); },
    scrollProfit: function () { var el = $('profitCard'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); },
    jobMenu: openJobMenu, editJobInfo: openJobInfoSheet, saveJobInfo: saveJobInfo, dupJob: dupJob, delJob: delJob,
    openCustOfJob: function () { var j = getJob(openJobId); if (!j || !j.customerId) { toast('الحساب ده من غير عميل — عدّل بيانات المشروع وضيف اسم العميل'); return; } closeTop(function () { openCust(j.customerId); }); },
    preview: function (b) { openPreview({ doc: b.dataset.doc, jobId: openJobId }); },
    pvDoc: function (b) { if (!pv) return; pv.doc = b.dataset.doc; renderPreview(); fitPreview(); },
    clearJobFilter: function () { jobFilter.cust = ''; jobFilter.from = ''; jobFilter.to = ''; $('jobFrom').value = ''; $('jobTo').value = ''; renderJobs(); },
    // ---- الأدوات ----
    tool: function (b) { var t = b.dataset.tool; afterSheet(function () { openTool(t); }); },
    workersForJob: function () { openTool('workers'); },
    brickNew: function () { openBrickSheet(null); },
    brickEdit: function (b) { openBrickSheet(b.dataset.id); },
    bName: function (b) { $('f_bname').value = b.dataset.v; },
    brickSave: saveBrick,
    brickDel: function () { var id = S.brickId; settings.bricks = bricks().filter(function (x) { return x.id !== id; }); saveSettings(); closeTop(function () { refresh(); toast('اتمسح من المكتبة (الحسابات القديمة محتفظة بمقاساتها)'); }); },
    addWorker: function () { settings.workers.push({ name: '', kind: 'عامل', mode: 'each', count: '1', days: '', rate: '', hours: '', hourRate: '', amount: '', advance: '' }); saveSettings(); renderTool(); },
    delWorker: function (b) { settings.workers.splice(+b.dataset.i, 1); saveSettings(); renderTool(); },
    wkKind: function (b) { settings.workers[+b.dataset.i].kind = b.dataset.v; saveSettings(); renderTool(); },
    wkMode: function (b) { settings.workers[+b.dataset.i].mode = b.dataset.v; saveSettings(); renderTool(); },
    workersClear: function () { settings.workers = []; saveSettings(); renderTool(); },
    workersToJob: function () {
      openPickJob('addCosts', function (jobId) {
        var job = getJob(jobId), w = C.workers(settings.workers), n = 0;
        w.rows.forEach(function (r, i) { if (!r.gross) return; var src = settings.workers[i]; job.costs.push({ id: uid('k'), type: 'labor', mode: 'amount', amount: String(r.gross), name: (src.name || src.kind || 'عمال') + (src.kind && src.name ? ' (' + src.kind + ')' : '') + (r.days ? ' — ' + fq(r.days) + ' يوم' : ''), billed: false, note: r.advance ? 'سلف ' + r.advance : '' }); n++; });
        touch(job); saveDb(); return n;
      });
    }
  };
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]');
    if (!b || b.disabled) return;
    var f = ACT[b.dataset.act]; if (!f) return;
    if (b.tagName !== 'INPUT') e.preventDefault();
    f(b, e);
  });
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-theme-set]'); if (t) { settings.theme = t.dataset.themeSet; saveSettings(); applyTheme(); return; }
  });
  document.addEventListener('change', function (e) {
    if (e.target.id === 'f_bgroup') { var g = K.group(e.target.value); $('f_bsug').innerHTML = g.types.map(function (t) { return '<button type="button" class="chip" data-act="bName" data-v="' + esc(t) + '">' + esc(t) + '</button>'; }).join(''); }
  });

  // ---------------- البداية ----------------
  if (history.state && history.state.cw) history.replaceState(null, '');
  applyTheme();
  renderHome();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', function () { navigator.serviceWorker.register('./service-worker.js').catch(function () {}); });
  }
  // للاختبارات: نفس الدوال اللي الواجهة بتستخدمها
  window.MasonApp = { get db() { return db; }, settings: settings, openJob: openJob, openItem: openItem, openPreview: openPreview, openTool: openTool, calc: C, catalog: K, editor: function () { return E; } };

})();
