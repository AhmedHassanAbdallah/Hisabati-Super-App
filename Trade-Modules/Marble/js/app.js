/*
 * أرزقي | Arzoqi — الرخام والجرانيت والأحجار (Marble, Granite & Stone): الواجهة.
 * الحسابات في js/calc.js (MarbleCalc): المطابخ والسلالم والمداخل والواجهات والأرضيات والحوائط والأشكال، الحواف والفتحات،
 * الألواح والهالك وتقسيم الألواح (مع البواقي واتجاه العروق) ومطابقة العروق، والتكلفة والربح.
 * أنواع الشغل والحاسبات وخاناتها والمكتبة المبدئية في js/catalog.js (MarbleCatalog).
 * التخزين على الموبايل بس:
 *   hmar_db_v1        العملاء والمشاريع (المعاينات والمقايسات وعروض الأسعار والفواتير، البنود والقطع، الدفعات، الإضافات والمرتجعات، أوامر الشغل)،
 *                     البواقي والألواح الجزئية، العمال وشغلهم ومدفوعاتهم، والنوتة
 *   hmar_settings_v1  المظهر، العملة، بيانات الفاتورة، مكتبة الخامات ومقاساتها، أسعار الحواف والفتحات والتشطيب، الوحدات، المصنعية، الدفع، المراحل، إعدادات القص
 *   hmar_media        (IndexedDB) صور الخامات والموقع والكروكي والبواقي — مضغوطة
 * الفاتورة: ArzaqiInvoice (نفس فاتورة كل الأقسام). نوتة العمال: ArzoqiCrew.
 * © 2026 أحمد حسن عبدالله
 */
(function () {
  'use strict';
  var C = window.MarbleCalc, K = window.MarbleCatalog;
  var DB_KEY = 'hmar_db_v1', SET_KEY = 'hmar_settings_v1';
  var SECTION = 'marble', SECTION_NAME = 'الرخام والجرانيت';
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
    j.items = arr(j.items); j.costs = arr(j.costs); j.payments = arr(j.payments); j.photos = arr(j.photos);
    j.discount = j.discount && typeof j.discount === 'object' ? j.discount : { type: 'amount', value: 0 };
    return j;
  }
  function normDb(d) {
    d = d && typeof d === 'object' ? d : {};
    return { v: 1, seq: Number(d.seq) || 0, customers: arr(d.customers), jobs: arr(d.jobs).map(normJob), remnants: arr(d.remnants), workers: arr(d.workers), wlog: arr(d.wlog), wpay: arr(d.wpay), notes: arr(d.notes) };
  }
  var db = normDb(loadJSON(DB_KEY, null));
  var settings = loadJSON(SET_KEY, {}) || {};
  ['business', 'lastPrice'].forEach(function (k) { if (!settings[k] || typeof settings[k] !== 'object') settings[k] = {}; });
  ['units', 'laborMethods', 'payMethods'].forEach(function (k) { settings[k] = arr(settings[k]); });
  if (!settings.laborPrices || typeof settings.laborPrices !== 'object') settings.laborPrices = {};
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
  var STATUS = { survey: ['مقايسة', 'paused'], quote: ['عرض سعر', 'paused'], active: ['جاري / فاتورة', 'active'], done: ['مسلّم', 'done'] };
  function isOffer(j) { return j.status === 'quote' || j.status === 'survey'; }
  function jobCard(j, act) {
    var r = J(j);
    var cats = [];
    j.items.forEach(function (it) { var l = kindLabel(it.kind); if (l && cats.indexOf(l) < 0) cats.push(l); });
    var st = STATUS[j.status] || STATUS.active;
    var amt = r.remaining > 0.005 && !isOffer(j) ? '<small class="due">باقي ' + esc(money(r.remaining)) + '</small>' : (r.total > 0 && !isOffer(j) ? '<small class="ok">خالص</small>' : '<small>—</small>');
    return '<div class="inv-card" data-act="' + (act || (pickInvoice ? 'pickedInvoice' : 'openJob')) + '" data-id="' + esc(j.id) + '">'
      + '<div class="inv-avatar">' + esc((custName(j) || '؟').trim().charAt(0)) + '</div>'
      + '<div class="inv-info"><div class="n">' + esc(custName(j)) + '<span class="status-badge ' + st[1] + '">' + st[0] + '</span></div>'
      + '<div class="m">' + esc([j.title, j.number, fmtDate(j.date), j.items.length + ' بند'].filter(Boolean).join(' · ')) + '</div>'
      + (cats.length ? '<div class="job-kinds">' + cats.slice(0, 4).map(function (c) { return '<span class="kind-tag">' + esc(c) + '</span>'; }).join('') + '</div>' : '') + '</div>'
      + '<div class="inv-amount">' + esc(money(r.total)) + amt + '</div></div>';
  }
  function custCard(c) {
    var js = jobsOf(c.id), due = 0, tot = 0;
    js.forEach(function (j) { if (isOffer(j)) return; var r = J(j); due += r.remaining; tot += r.total; });
    return '<div class="cust-card" data-act="openCust" data-id="' + esc(c.id) + '"><div class="inv-avatar">' + esc((c.name || '؟').trim().charAt(0)) + '</div>'
      + '<div class="inv-info"><div class="n">' + esc(c.name) + '</div><div class="m">' + esc([c.phone, js.length + ' مشروع'].filter(Boolean).join(' · ')) + '</div></div>'
      + '<div class="cust-amt ' + (due > 0.005 ? 'due' : 'ok') + '">' + esc(money(Math.max(due, 0))) + '<small>' + (due > 0.005 ? 'متبقي' : (tot ? 'خالص' : '—')) + '</small></div></div>';
  }
  function sortedJobs() { return db.jobs.slice().sort(function (a, b) { return String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)); }); }
  function row(l, v, cls) { return '<div class="sum-row' + (cls ? ' ' + cls : '') + '"><span>' + esc(l) + '</span><strong>' + esc(v) + '</strong></div>'; }

  // ---------------- المشاريع ----------------
  function matchJob(j) {
    var r = J(j);
    if (jobFilter.f === 'active' && (j.status === 'done' || isOffer(j))) return false;
    if (jobFilter.f === 'done' && j.status !== 'done') return false;
    if (jobFilter.f === 'quote' && !isOffer(j)) return false;
    if (jobFilter.f === 'due' && !(r.remaining > 0.005 && !isOffer(j))) return false;
    if (jobFilter.cust && j.customerId !== jobFilter.cust) return false;
    if (jobFilter.from && String(j.date || '') < jobFilter.from) return false;
    if (jobFilter.to && String(j.date || '') > jobFilter.to) return false;
    var q = jobFilter.q.trim();
    if (q) {
      var c = getCust(j.customerId) || {};
      var hay = [c.name, c.phone, c.phone2, c.area, j.title, j.number, j.notes, j.site].concat(j.items.map(function (it) {
        return [itemTitle(it), it.notes, kindLabel(it.kind), it.place].concat(arr(it.lines).map(function (l) { return l.name; })).join(' ');
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
    list.forEach(function (j) { if (isOffer(j)) return; var r = J(j); tot += r.total; due += Math.max(r.remaining, 0); });
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
  $('currencySelect').innerHTML = CURRENCIES.map(function (c) { return '<option value="' + c.code + '">' + esc(c.country) + ' — ' + esc(c.name) + ' (' + esc(c.sym) + ')</option>'; }).join('');
  $('currencySelect').addEventListener('change', function () { settings.currency = this.value; saveSettings(); refresh(); toast('العملة: ' + cur().name); });
  [['bizName', 'name'], ['bizPhone', 'phone'], ['bizAddress', 'address']].forEach(function (p) { $(p[0]).addEventListener('input', function () { settings.business[p[1]] = this.value.trim(); saveSettings(); }); });
  $('bizTerms').addEventListener('input', function () { settings.terms = this.value; saveSettings(); });

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
  // ---------------- مشروع جديد ----------------
  function newJobRecord(cust, title, date, status) {
    db.seq = (Number(db.seq) || 0) + 1;
    var now = new Date().toISOString();
    var j = normJob({ id: uid('j'), number: 'MRB-' + pad(db.seq), customerId: cust ? cust.id : '', title: title || '', date: date || today(), status: status || 'active', notes: '', costsComplete: false, createdAt: now, updatedAt: now });
    db.jobs.push(j);
    return j;
  }
  function custPickHTML(withTarget) {
    return '<div class="field"><label for="f_cname">اسم العميل</label><input type="text" id="f_cname" autocomplete="off" placeholder="اكتب الاسم أو اختار عميل موجود" value="' + esc(S.custName || '') + '"><div id="f_csug"></div></div>'
      + '<div class="field" style="margin-bottom:' + (withTarget ? '0' : '12px') + '"><label for="f_jtitle">اسم المشروع (اختياري)</label><input type="text" id="f_jtitle" placeholder="مثلاً: مطبخ وسلم فيلا التجمع" value="' + esc(S.jobTitle || '') + '"></div>'
      + (withTarget ? '<div id="f_target"></div>' : '');
  }
  function openNewJobSheet(cid, status) {
    var c = cid ? getCust(cid) : null;
    openSheet(status === 'active' ? 'مشروع جديد' : 'معاينة ومقاسات جديدة', custPickHTML(false)
      + '<div class="row-2"><div class="field"><label for="f_cphone">التليفون (اختياري)</label><input type="text" id="f_cphone" inputmode="tel" dir="ltr" value="' + esc(c ? c.phone || '' : '') + '"></div>'
      + '<div class="field"><label for="f_date">التاريخ</label><input type="date" id="f_date" value="' + today() + '"></div></div>'
      + '<div class="field"><label>الحالة</label><div class="segmented seg-3" id="f_jst">' + [['survey', 'معاينة / مقايسة'], ['quote', 'عرض سعر'], ['active', 'مشروع معتمد']].map(function (o) { return '<button type="button" class="' + ((status || 'survey') === o[0] ? 'on' : '') + '" data-act="jobStatus" data-v="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div></div>'
      + '<div class="field"><label for="f_site">الموقع / العنوان</label><input type="text" id="f_site"></div>'
      + '<button type="button" class="btn btn-accent" data-act="createJob">' + ic('check') + ' ابدأ</button>', { custId: c ? c.id : null, status: status || 'survey' });
    if (c) $('f_cname').value = c.name;
    bindCustSuggest();
  }
  function createJob() {
    var name = $('f_cname').value.trim();
    if (!name) { toast('اكتب اسم العميل'); $('f_cname').focus(); return; }
    var c = ensureCustomer(name, $('f_cphone').value.trim());
    var j = newJobRecord(c, $('f_jtitle').value.trim(), $('f_date').value || today(), S.status || 'survey'); j.site = $('f_site').value.trim(); j.stage = S.status === 'active' ? 5 : 2;
    saveDb();
    closeTop(function () { refresh(); openJob(j.id); });
  }

  // ====================================================================
  // المكتبة والإعدادات والصور
  // ====================================================================
  var KINDS = K.KINDS;
  var ROW_KEYS = ['parts', 'rows', 'zones', 'rooms', 'cols', 'walls'];
  var KT = { straight: 'مستقيم', L: 'L', U: 'U', island: 'جزيرة', bar: 'بار' };
  function kindLabel(k) { return KINDS[k] ? KINDS[k].label.replace(/^حاسبة /, '') : 'بند'; }
  function itemTitle(it) {
    var i = it['in'] || {};
    if (it.title) return it.title;
    if (it.kind === 'custom') return i.workName || 'بند حر';
    if (it.kind === 'kitchen') return 'مطبخ ' + (KT[i.ktype] || '') + (it.place ? ' — ' + it.place : '');
    if (it.kind === 'stairs') return 'سلم' + (i.stype ? ' ' + i.stype : '') + (it.place ? ' — ' + it.place : '');
    return kindLabel(it.kind) + (it.place ? ' — ' + it.place : '');
  }
  var LIB_KEYS = ['trade', 'fam', 'type', 'origin', 'supplier', 'color', 'shade', 'vein', 'veinDir', 'finish', 'thick', 'slabL', 'slabW', 'cost', 'price', 'slabCost', 'slabPrice', 'lmPrice', 'piecePrice', 'stock', 'batch', 'grade', 'density', 'wastePct', 'notes', 'photo'];
  function lib() {
    if (!Array.isArray(settings.lib)) settings.lib = K.LIB.map(function (x, i) { var o = { id: 'L' + i, name: x.name, cat: x.cat, unit: x.unit, sizes: [] }; LIB_KEYS.forEach(function (k) { o[k] = ''; }); o.fam = x.fam || ''; return o; });
    return settings.lib;
  }
  function libById(id) { return lib().find(function (x) { return x.id === id; }) || null; }
  function libByName(n) { return lib().find(function (x) { return x.name === n; }) || null; }
  function uniq(a) { return a.filter(function (v, i) { return v && a.indexOf(v) === i; }); }
  function edgeTypes() { return uniq(K.EDGES.concat(arr(settings.edges))); }
  function finishes() { return uniq(K.FINISHES.concat(arr(settings.finishes))); }
  function cutNames() { return K.CUT_O.map(function (c) { return C.CUTS[c[0]]; }).concat(arr(settings.cutNames)); }
  function priceMap(k) { var m = settings[k] || {}, o = {}; Object.keys(m).forEach(function (x) { if (C.num(m[x])) o[x] = C.num(m[x]); }); return o; }
  function ctx() { return { lib: lib(), remnants: db.remnants, wlog: db.wlog, kerf: settings.kerf, margin: settings.margin, keepL: settings.keepL, keepW: settings.keepW, edgePrices: priceMap('edgePrices'), cutPrices: priceMap('cutPrices'), finishPrices: priceMap('finishPrices'), useRemnants: true }; }
  function J(j) { return C.job(j, ctx()); }
  function units() { return K.UNITS.concat(arr(settings.units)).filter(function (v, i, a) { return v && a.indexOf(v) === i; }); }
  function laborMethods() { return Object.keys(C.LABOR).map(function (k) { return [k, C.LABOR[k]]; }).concat(arr(settings.laborMethods).map(function (m) { return ['x:' + m, m]; })); }
  function lpKey(name, method) { return String(name || '').trim() + '|' + method; }
  function laborPrice(name, method) { var p = (settings.laborPrices || {})[lpKey(name, method)]; return p == null ? '' : p; }
  function payMethods() { return K.PAY_METHODS.concat(arr(settings.payMethods)).filter(function (v, i, a) { return a.indexOf(v) === i; }); }
  function stages() { return arr(settings.stages).length ? settings.stages : K.STAGES; }
  function matLabel(x) { return x ? x.name + (C.num(x.thick) ? ' ' + x.thick + ' سم' : '') + (x.finish ? ' · ' + x.finish : '') : ''; }

  // ---- الصور (IndexedDB «hmar_media» مضغوطة؛ ولو مش متاح: localStorage) ----
  var MEDIA_DB = 'hmar_media', _mdb = null, _mmem = {};
  function mediaDb() {
    if (_mdb) return _mdb;
    _mdb = new Promise(function (res, rej) { try { if (!window.indexedDB) return rej(new Error('no-idb')); var r = indexedDB.open(MEDIA_DB, 1); r.onupgradeneeded = function () { r.result.createObjectStore('media'); }; r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); }; } catch (e) { rej(e); } });
    _mdb.catch(function () {}); return _mdb;
  }
  function mediaTx(mode, fn) { return mediaDb().then(function (d) { return new Promise(function (res, rej) { var tx = d.transaction('media', mode), q = fn(tx.objectStore('media')); tx.oncomplete = function () { res(q && q.result); }; tx.onerror = function () { rej(tx.error); }; }); }); }
  function mediaPut(id, data) { return mediaTx('readwrite', function (s) { return s.put(data, id); }).catch(function () { try { localStorage.setItem('hmar_media_' + id, data); } catch (e) { _mmem[id] = data; } }); }
  function mediaGet(id) { return mediaTx('readonly', function (s) { return s.get(id); }).then(function (v) { return v || localStorage.getItem('hmar_media_' + id) || _mmem[id] || ''; }).catch(function () { return localStorage.getItem('hmar_media_' + id) || _mmem[id] || ''; }); }
  function mediaDel(id) { if (!id) return; try { localStorage.removeItem('hmar_media_' + id); } catch (e) {} delete _mmem[id]; mediaTx('readwrite', function (s) { return s.delete(id); }).catch(function () {}); }
  function loadImgs(root) { Array.prototype.forEach.call((root || document).querySelectorAll('img[data-media]'), function (img) { mediaGet(img.dataset.media).then(function (src) { if (src) img.src = src; else img.alt = 'الصورة مش متاحة'; }); }); }
  // بيضغط الصورة (أقصى ضلع 1280 بكسل JPEG) وبيرجع رقمها
  function pickPhoto(cb) {
    var inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
    inp.addEventListener('change', function () {
      var f = inp.files && inp.files[0]; if (!f) return;
      var rd = new FileReader();
      rd.onload = function () {
        var img = new Image();
        img.onload = function () {
          var m = 1280, sc = Math.min(1, m / Math.max(img.width, img.height)), cv = document.createElement('canvas');
          cv.width = Math.round(img.width * sc); cv.height = Math.round(img.height * sc); cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
          var data = cv.toDataURL('image/jpeg', 0.72), id = uid('m');
          mediaPut(id, data).then(function () { cb(id); });
        };
        img.onerror = function () { toast('الملف ده مش صورة'); };
        img.src = rd.result;
      };
      rd.readAsDataURL(f);
    });
    inp.click();
  }
  function thumb(id, act, extra) { return id ? '<button type="button" class="ph-thumb" data-act="' + (act || 'viewPhoto') + '" data-media="' + esc(id) + '"' + (extra || '') + '><img data-media="' + esc(id) + '" alt=""></button>' : ''; }

  function blankItem(kind, o) {
    o = o || {};
    var d = KINDS[kind] || KINDS.custom;
    var it = { kind: KINDS[kind] ? kind : 'custom', title: o.title || '', place: '', notes: '', 'in': clone(d.def || {}), lines: [], labor: [], extras: [], icosts: [], scope: 'full' };
    if (o.preset) Object.keys(o.preset).forEach(function (k) { it['in'][k] = clone(o.preset[k]); });
    (d.form || []).forEach(function (f) { if (f.t === 'rows' && ROW_KEYS.indexOf(f.k) >= 0 && !arr(it['in'][f.k]).length) it['in'][f.k] = [clone(f.def || {})]; });
    var lu = (settings.lastUnits || {})[kind]; if (lu && it['in'].unit && !(o.preset && o.preset.unit)) it['in'].unit = lu;
    if (settings.lastMat && libById(settings.lastMat) && !it['in'].mat && (d.form || []).some(function (f) { return f.k === 'mat'; })) it['in'].mat = settings.lastMat;
    if (o.place) it.place = o.place;
    it.labor = (d.labor || []).map(function (p) { return { name: p[1], method: p[0], grp: p[2] || 'mfg', qty: '', price: laborPrice(p[1], p[0]) }; });
    return it;
  }

  // ---------------- صفحة الحاسبة / البند ----------------
  var E = null, ROWDEF = {};
  function openItem(opts) {
    var job = opts.jobId ? getJob(opts.jobId) : null;
    var src = job && opts.itemId ? job.items.find(function (x) { return x.id === opts.itemId; }) : null;
    E = { jobId: job ? job.id : null, itemId: src ? src.id : null, it: src ? clone(src) : (opts.it ? clone(opts.it) : blankItem(opts.kind || 'custom', opts)), custName: '', jobTitle: '', custId: null, targetJob: null };
    renderItemPage();
    var el = $('itemPage'); el.classList.add('open'); el.scrollTop = 0;
    pushLayer({ type: 'page', hide: function () { el.classList.remove('open'); E = null; setTimeout(function () { if (!E) el.innerHTML = ''; }, 350); } });
  }
  function SEGP(path, opts) {
    var cur = getPath(E.it, path);
    return '<div class="segmented seg-' + Math.min(opts.length, 4) + ' seg-sm' + (opts.length > 4 ? ' seg-wrap' : '') + '">' + opts.map(function (o) { return '<button type="button" class="' + (String(v0(cur)) === String(o[0]) ? 'on' : '') + '" data-act="setK" data-k="' + path + '" data-v="' + esc(o[0]) + '">' + esc(o[1]) + '</button>'; }).join('') + '</div>';
  }
  function CHIPS(list, path) { return list && list.length ? '<div class="unit-chips">' + list.map(function (v) { return '<button type="button" class="chip" data-act="setK" data-k="' + path + '" data-v="' + esc(v) + '">' + esc(v) + '</button>'; }).join('') + '</div>' : ''; }
  function chipsHTML(list, act, extra) { return list.length ? '<div class="unit-chips">' + list.map(function (v) { return '<button type="button" class="chip" data-act="' + act + '" data-v="' + esc(v) + '"' + (extra || '') + '>' + esc(v) + '</button>'; }).join('') + '</div>' : ''; }
  function card(title, icon, body, extra) { return '<div class="card"' + (extra || '') + '><div class="card-title"><span class="t-ic">' + ic(icon) + '</span><h2>' + esc(title) + '</h2></div>' + body + '</div>'; }
  function inputHTML(p, f, v) { return '<input type="text" data-k="' + p + '"' + (f.t === 'num' ? ' inputmode="decimal" dir="ltr"' : '') + ' placeholder="' + esc(f.ph || '') + '" value="' + esc(v0(v)) + '" autocomplete="off">'; }
  function selHTML(p, v, opts, blank) { return '<select data-k="' + p + '">' + (blank != null ? '<option value="">' + esc(blank) + '</option>' : '') + opts.map(function (o) { var k = Array.isArray(o) ? o[0] : o, l = Array.isArray(o) ? o[1] : o; return '<option value="' + esc(k) + '"' + (String(v0(v)) === String(k) ? ' selected' : '') + '>' + esc(l) + '</option>'; }).join('') + '</select>'; }
  function libSelect(p, v, cat) {
    var list = lib().filter(function (x) { return x.cat === cat; });
    if (cat !== 'mat') return selHTML(p, v, list.map(function (x) { return [x.id, x.name]; }), '—');
    return '<select data-k="' + p + '"><option value="">— اختار الخامة —</option>' + Object.keys(K.FAMS).concat(['']).map(function (fm) {
      var l = list.filter(function (x) { return (x.fam || '') === fm || (!fm && !K.FAMS[x.fam]); }); return l.length ? '<optgroup label="' + esc(K.FAMS[fm] || 'أخرى') + '">' + l.map(function (x) { return '<option value="' + esc(x.id) + '"' + (x.id === v ? ' selected' : '') + '>' + esc(matLabel(x)) + '</option>'; }).join('') + '</optgroup>' : '';
    }).join('') + '</select>';
  }
  function whenOk(f, base) { if (!f.when) return true; return Object.keys(f.when).every(function (k) { var v = getPath(E.it, base + '.' + k); return f.when[k].some(function (x) { return x === v || (x === '' && v == null) || (x === true && v === true) || String(x) === String(v); }); }); }
  // رسم بسيط للقطعة بأبعادها (للمراجعة مع العميل والورشة)
  function shapeSVG(r, u) {
    var s = C.shape(r, u || 'cm'), sh = r.shape || 'rect', L = C.toM(r.L, u), Wd = C.toM(r.W, u), A = C.toM(r.A, u), B = C.toM(r.B, u), D = C.toM(r.D, u);
    var bw = s.box[0] || 1, bh = s.box[1] || 1, k = Math.min(150 / bw, 80 / bh), X = function (v) { return (10 + v * k).toFixed(1); }, Y = function (v) { return (10 + v * k).toFixed(1); }, pts = '';
    if (!s.ok || !s.area) return '';
    if (sh === 'tri') pts = [[0, Wd], [L, Wd], [0, 0]];
    else if (sh === 'trap') { var M = Math.max(L, A); pts = [[(M - L) / 2, Wd], [(M + L) / 2, Wd], [(M + A) / 2, 0], [(M - A) / 2, 0]]; }
    else if (sh === 'corner') pts = [[0, 0], [L - A, 0], [L, B], [L, Wd], [0, Wd]];
    else if (sh === 'L') pts = [[0, 0], [L, 0], [L, Wd], [A, Wd], [A, Wd + B], [0, Wd + B]];
    else if (sh === 'U') pts = [[0, 0], [L, 0], [L, Wd + B], [L - A, Wd + B], [L - A, Wd], [A, Wd], [A, Wd + B], [0, Wd + B]];
    var body;
    if (sh === 'circle') body = '<circle cx="' + X(D / 2) + '" cy="' + Y(D / 2) + '" r="' + (D / 2 * k).toFixed(1) + '"/>';
    else if (sh === 'semi') body = '<path d="M' + X(0) + ' ' + Y(D / 2) + ' A' + (D / 2 * k).toFixed(1) + ' ' + (D / 2 * k).toFixed(1) + ' 0 0 1 ' + X(D) + ' ' + Y(D / 2) + ' Z"/>';
    else if (pts) body = '<polygon points="' + pts.map(function (p) { return X(p[0]) + ',' + Y(p[1]); }).join(' ') + '"/>';
    else body = '<rect x="10" y="10" width="' + (bw * k).toFixed(1) + '" height="' + (bh * k).toFixed(1) + '"/>';
    return '<div class="shape-prev"><svg viewBox="0 0 ' + (20 + bw * k).toFixed(0) + ' ' + (20 + bh * k).toFixed(0) + '" class="shape-svg">' + body + '</svg><span dir="ltr">' + esc(fq(C.round(s.box[0] * 100, 1)) + ' × ' + fq(C.round(s.box[1] * 100, 1))) + ' cm · ' + esc(fq(s.area)) + ' m²</span></div>';
  }
  function formHTML(fields, base, mini) {
    var out = '', buf = [];
    function flush() { if (buf.length) { out += '<div class="fgrid' + (mini ? ' mini' : '') + '">' + buf.join('') + '</div>'; buf = []; } }
    fields.forEach(function (f) {
      if (!whenOk(f, base)) return;
      var p = f.k ? base + '.' + f.k : '', v = p ? getPath(E.it, p) : '';
      if (f.t === 'num' || f.t === 'text') { buf.push('<div class="ff"><span class="mini-lbl">' + esc(f.l) + (f.u ? ' <small class="u-lbl">(' + esc(f.u) + ')</small>' : '') + '</span>' + inputHTML(p, f, v) + '</div>'); return; }
      if (f.t === 'lib') { buf.push('<div class="ff' + (f.cat === 'mat' && !mini ? ' ff-wide' : '') + '"><span class="mini-lbl">' + esc(f.l) + '</span>' + libSelect(p, v, f.cat) + '</div>'); return; }
      if (f.t === 'pick') { buf.push('<div class="ff"><span class="mini-lbl">' + esc(f.l) + '</span>' + selHTML(p, v, f.o) + '</div>'); return; }
      if (f.t === 'edgeT') { buf.push('<div class="ff"><span class="mini-lbl">' + esc(f.l) + '</span>' + selHTML(p, v, edgeTypes(), '—') + '</div>'); return; }
      if (f.t === 'cutT') { buf.push('<div class="ff"><span class="mini-lbl">' + esc(f.l) + '</span>' + selHTML(p, v, cutNames(), '—') + '</div>'); return; }
      if (f.t === 'finT') { buf.push('<div class="ff"><span class="mini-lbl">' + esc(f.l) + '</span>' + selHTML(p, v, finishes(), '—') + '</div>'); return; }
      flush();
      if (f.t === 'h') out += '<p class="more-h">' + esc(f.l) + '</p>';
      else if (f.t === 'note') out += '<p class="hint">' + esc(f.l) + '</p>';
      else if (f.t === 'check') out += '<label class="check-row"><input type="checkbox" data-k="' + p + '"' + (v ? ' checked' : '') + '> ' + esc(f.l) + '</label>';
      else if (f.t === 'seg') out += '<div class="ff-row"><span class="mini-lbl">' + esc(f.l) + '</span>' + SEGP(p, f.o) + '</div>';
      else if (f.t === 'chips') out += '<div class="ff-row"><span class="mini-lbl">' + esc(f.l) + '</span>' + inputHTML(p, f, v) + CHIPS(f.o, p) + '</div>';
      else if (f.t === 'rows') {
        ROWDEF[p] = f.def || {};
        var list = arr(v), u = getPath(E.it, base + '.unit') || 'cm';
        if (f.min1 && !list.length) { list = [clone(f.def || {})]; setPath(E.it, p, list); }
        out += '<p class="more-h">' + esc(f.l) + '</p>' + list.map(function (r, i) {
          var withPh = f.k === 'parts' || f.k === 'zones' || f.k === 'rooms';
          return '<div class="sub-card"><div class="sc-head"><span class="room-num">' + (i + 1) + '</span><b class="grow">' + esc(r.name || r.label || '') + '</b>'
            + (withPh ? (r.photo ? thumb(r.photo, 'rowPhotoView', ' data-path="' + p + '.' + i + '"') : '<button type="button" class="btn btn-ghost btn-icon" data-act="rowPhoto" data-path="' + p + '.' + i + '" aria-label="صورة">' + ic('camera') + '</button>') : '')
            + '<button type="button" class="btn btn-ghost btn-icon" data-act="dupAt" data-path="' + p + '" data-i="' + i + '" aria-label="تكرار">' + ic('copy') + '</button>'
            + '<button type="button" class="btn btn-danger btn-icon" data-act="delAt" data-path="' + p + '" data-i="' + i + '" aria-label="حذف">' + ic('x') + '</button></div>'
            + formHTML(f.f, p + '.' + i, true) + (f.k === 'parts' && r.shape ? shapeSVG(r, u) : '') + '</div>';
        }).join('') + '<button type="button" class="btn btn-ghost btn-sm" data-act="addRow" data-path="' + p + '">' + ic('plus') + ' ' + esc(f.add) + '</button>';
      }
    });
    flush();
    return out;
  }
  function unitOptions(sel) { var u = units(); if (sel && u.indexOf(sel) < 0) u.push(sel); return u.map(function (x) { return '<option' + (x === sel ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join(''); }
  function linesHTML() {
    var it = E.it;
    var b = '<div class="ff-row"><span class="mini-lbl">نطاق السعر</span><select data-k="scope">' + Object.keys(C.SCOPES).map(function (k) { return '<option value="' + k + '"' + ((it.scope || 'full') === k ? ' selected' : '') + '>' + esc(C.SCOPES[k]) + '</option>'; }).join('') + '</select></div>'
      + (it.scope === 'install' ? '<p class="hint">تركيب فقط: الخامات من العميل — القايمة للحصر بس ومش بتتحسب في السعر.</p>' : '');
    b += it.lines.map(function (l, i) {
      var p = 'lines.' + i;
      return '<div class="sub-card line-card"><div class="sc-head"><input type="text" class="grow" data-k="' + p + '.name" value="' + esc(v0(l.name)) + '" placeholder="الخامة / الحافة / الفتحة / المستهلك">'
        + (l.auto ? '<span class="src-badge' + (l.locked ? ' warn' : '') + '">' + (l.locked ? 'متعدل' : 'محسوب') + '</span>' : '')
        + '<button type="button" class="btn btn-ghost btn-icon" data-act="pickLib" data-i="' + i + '" aria-label="من المكتبة">' + ic('book') + '</button>'
        + '<button type="button" class="btn btn-danger btn-icon" data-act="delAt" data-path="lines" data-i="' + i + '" aria-label="حذف">' + ic('x') + '</button></div>'
        + '<div class="fgrid mini"><div class="ff"><span class="mini-lbl">التصنيف</span><select data-k="' + p + '.cat">' + Object.keys(K.CATS).map(function (c) { return '<option value="' + c + '"' + ((l.cat || 'acc') === c ? ' selected' : '') + '>' + esc(K.CATS[c]) + '</option>'; }).join('') + '</select></div>'
        + '<div class="ff"><span class="mini-lbl">الكمية</span><input type="text" inputmode="decimal" dir="ltr" data-k="' + p + '.qty" value="' + esc(v0(l.qty)) + '"></div><div class="ff"><span class="mini-lbl">الوحدة</span><select data-k="' + p + '.unit">' + unitOptions(l.unit || 'قطعة') + '</select></div>'
        + '<div class="ff"><span class="mini-lbl">سعر الشراء</span><input type="text" inputmode="decimal" dir="ltr" data-k="' + p + '.cost" value="' + esc(v0(l.cost)) + '"></div><div class="ff"><span class="mini-lbl">سعر البيع</span><input type="text" inputmode="decimal" dir="ltr" data-k="' + p + '.price" value="' + esc(v0(l.price)) + '"></div>'
        + '<div class="ff"><span class="mini-lbl">هالك %</span><input type="text" inputmode="decimal" dir="ltr" data-k="' + p + '.wastePct" value="' + esc(v0(l.wastePct)) + '" placeholder="—"></div></div>'
        + '<div class="line-total" data-lt="' + i + '"></div></div>';
    }).join('');
    return card('الخامات والشغل (ألواح، حواف، فتحات، مستهلكات…)', 'box', b + '<div class="btn-row"><button type="button" class="btn btn-ghost btn-sm" data-act="addLine">' + ic('plus') + ' سطر</button><button type="button" class="btn btn-ghost btn-sm" data-act="pickLib" data-i="-1">' + ic('book') + ' من المكتبة</button></div>', ' id="linesCard"');
  }
  function laborHTML() {
    var it = E.it, saved = Object.keys(settings.laborPrices || {}).map(function (k) { return k.split('|')[0]; }).filter(function (v, i, a) { return v && a.indexOf(v) === i; });
    var names = K.LABOR_NAMES.concat(saved).filter(function (v, i, a) { return a.indexOf(v) === i; });
    var b = it.labor.map(function (l, i) {
      var p = 'labor.' + i;
      return '<div class="sub-card"><div class="sc-head"><input type="text" class="grow" data-k="' + p + '.name" list="laborNames" value="' + esc(v0(l.name)) + '" placeholder="تصنيع / تركيب / تلميع…"><button type="button" class="btn btn-danger btn-icon" data-act="delAt" data-path="labor" data-i="' + i + '">' + ic('x') + '</button></div>'
        + '<div class="fgrid mini"><div class="ff"><span class="mini-lbl">الطريقة</span><select data-k="' + p + '.method">' + laborMethods().map(function (m) { return '<option value="' + esc(m[0]) + '"' + (m[0] === l.method ? ' selected' : '') + '>' + esc(m[1]) + '</option>'; }).join('') + '</select></div>'
        + '<div class="ff"><span class="mini-lbl">النوع</span><select data-k="' + p + '.grp"><option value="mfg"' + (l.grp !== 'install' ? ' selected' : '') + '>تصنيع</option><option value="install"' + (l.grp === 'install' ? ' selected' : '') + '>تركيب</option></select></div>'
        + (l.method === 'lump' ? '' : '<div class="ff"><span class="mini-lbl">' + (l.method === 'daily' ? 'الأيام' : 'الكمية') + '</span><input type="text" inputmode="decimal" dir="ltr" data-k="' + p + '.qty" value="' + esc(v0(l.qty)) + '" placeholder="' + (C.METRIC[l.method] ? 'تلقائي' : '') + '"></div>')
        + (l.method === 'daily' ? '<div class="ff"><span class="mini-lbl">العمال</span><input type="text" inputmode="decimal" dir="ltr" data-k="' + p + '.workers" value="' + esc(v0(l.workers)) + '" placeholder="1"></div>' : '')
        + '<div class="ff"><span class="mini-lbl">' + (l.method === 'lump' ? 'المبلغ' : 'السعر') + '</span><input type="text" inputmode="decimal" dir="ltr" data-k="' + p + '.price" value="' + esc(v0(l.price)) + '"></div></div>'
        + '<div class="line-total" data-la="' + i + '"></div></div>';
    }).join('');
    return card('المصنعية (على العميل)', 'cash', b + '<datalist id="laborNames">' + names.map(function (n) { return '<option value="' + esc(n) + '">'; }).join('') + '</datalist>'
      + '<button type="button" class="btn btn-ghost btn-sm" data-act="addLabor">' + ic('plus') + ' بند مصنعية</button><p class="hint">الكمية لو فاضية بتتحسب لوحدها (م²، م.ط، القطع، الدرجات، الألواح، الفتحات، متر الحافة، الكيلو).</p>');
  }
  function icostsHTML() {
    return card('تكاليف داخلية على البند (مش للعميل)', 'chart', '<div class="rows-ed">' + E.it.icosts.map(function (x, i) {
      return '<div class="task-row cols-3"><input type="text" data-k="icosts.' + i + '.name" value="' + esc(v0(x.name)) + '" placeholder="أجرة قص / تلميع / تركيب"><select data-k="icosts.' + i + '.grp"><option value="mfg"' + (x.grp !== 'install' ? ' selected' : '') + '>تصنيع</option><option value="install"' + (x.grp === 'install' ? ' selected' : '') + '>تركيب</option></select><input type="text" inputmode="decimal" dir="ltr" data-k="icosts.' + i + '.amount" value="' + esc(v0(x.amount)) + '" placeholder="المبلغ"><button type="button" class="btn btn-danger btn-icon" data-act="delAt" data-path="icosts" data-i="' + i + '">' + ic('x') + '</button></div>';
    }).join('') + '</div>' + chipsHTML(['أجرة القص', 'أجرة الحواف', 'أجرة الفتحات', 'أجرة التلميع', 'أجرة التركيب', 'أقراص ومستهلكات'], 'addIcost') + '<p class="hint">بتتحسب في التكلفة والربح بس.</p>');
  }
  function extrasHTML() {
    return card('إضافات على البند (للعميل)', 'plus', '<div class="rows-ed">' + E.it.extras.map(function (x, i) {
      return '<div class="task-row cols-2"><input type="text" data-k="extras.' + i + '.name" value="' + esc(v0(x.name)) + '" placeholder="الإضافة"><input type="text" inputmode="decimal" dir="ltr" data-k="extras.' + i + '.amount" value="' + esc(v0(x.amount)) + '" placeholder="المبلغ"><button type="button" class="btn btn-danger btn-icon" data-act="delAt" data-path="extras" data-i="' + i + '">' + ic('x') + '</button></div>';
    }).join('') + '</div>' + chipsHTML(['نقل', 'رفع أدوار', 'فك القديم', 'سقالة', 'تلميع إضافي'], 'addExtra'));
  }
  function renderItemPage() {
    var it = E.it, el = $('itemPage'), st = el.scrollTop, d = KINDS[it.kind] || KINDS.custom, job = E.jobId ? getJob(E.jobId) : null;
    ROWDEF = {};
    var head = '<div class="pg-head"><button type="button" class="icon-btn" data-act="closeTop" aria-label="رجوع">' + ic('back') + '</button><div class="titles"><h2>' + esc((E.itemId ? 'تعديل: ' : '') + itemTitle(it)) + '</h2><div class="sub">'
      + esc(job ? custName(job) + ' — ' + (job.title || job.number) : kindLabel(it.kind)) + '</div></div></div>';
    var pick = job ? '' : '<div class="card cust-pick"><div class="field"><label for="f_cname">اسم العميل (اختياري — سيبه فاضي لحساب سريع)</label><input type="text" id="f_cname" autocomplete="off" value="' + esc(E.custName) + '"><div id="f_csug"></div></div>'
      + '<div class="field" style="margin-bottom:0"><label for="f_jtitle">اسم المشروع (اختياري)</label><input type="text" id="f_jtitle" value="' + esc(E.jobTitle) + '" placeholder="مثلاً: فيلا التجمع"></div><div id="f_target"></div></div>';
    var places = job ? uniq(job.items.map(function (x) { return x.place; })) : [];
    var body = card('المدخلات', d.icon || 'grid', '<div class="fgrid"><div class="ff"><span class="mini-lbl">اسم البند (اختياري)</span><input type="text" data-k="title" value="' + esc(v0(it.title)) + '" placeholder="' + esc(itemTitle(Object.assign({}, it, { title: '' }))) + '"></div>'
      + '<div class="ff"><span class="mini-lbl">المكان</span><input type="text" data-k="place" list="placeList" value="' + esc(v0(it.place)) + '" placeholder="مطبخ / سلم / مدخل / حمام 1"><datalist id="placeList">' + uniq(places.concat(['مطبخ', 'سلم', 'مدخل', 'حمام', 'صالة', 'واجهة', 'بلكونة', 'جراج'])).map(function (x) { return '<option value="' + esc(x) + '">'; }).join('') + '</datalist></div></div>'
      + formHTML(d.form || [], 'in'))
      + '<div class="card" id="calcRes"></div><div class="card" id="sugCard"></div>' + linesHTML() + laborHTML() + icostsHTML() + extrasHTML()
      + card('ملاحظات', 'edit', '<textarea data-k="notes" placeholder="بتظهر في المقايسة والفاتورة وأمر الشغل">' + esc(v0(it.notes)) + '</textarea>') + '<div class="card" id="itRes"></div>'
      + '<div class="btn-row"><button type="button" class="btn btn-ghost" data-act="resetItem">' + ic('history') + ' إعادة ضبط</button><button type="button" class="btn btn-ghost" data-act="toNote">' + ic('note') + ' للنوتة</button></div>'
      + '<div class="btn-row" style="margin-top:10px"><button type="button" class="btn btn-ghost" data-act="shareItem">' + ic('share') + ' مشاركة</button><button type="button" class="btn btn-ghost" data-act="saveInvoice">' + ic('receipt') + ' حفظ وفاتورة</button></div>';
    el.innerHTML = head + '<div class="container">' + pick + body + '</div>'
      + '<div class="pg-foot"><div class="eb-info"><span>الإجمالي للعميل</span><strong id="itTotal">0</strong></div>'
      + (E.itemId ? '<button type="button" class="btn btn-danger btn-icon" data-act="delItem" aria-label="حذف">' + ic('trash') + '</button><button type="button" class="btn btn-ghost btn-icon" data-act="dupItem" aria-label="تكرار">' + ic('copy') + '</button>' : '')
      + '<button type="button" class="btn btn-accent" data-act="saveItem">' + ic('check') + ' حفظ</button></div>';
    el.scrollTop = st;
    if (!job) { bindCustSuggest(); renderTargetJobs(); }
    loadImgs(el);
    updateItemLive();
  }
  function resRows(rows) { return rows.map(function (r) { return '<div class="sum-row how"><span>' + esc(r[0]) + (r[2] ? '<small>' + esc(r[2]) + '</small>' : '') + '</span><strong>' + esc(r[1]) + '</strong></div>'; }).join(''); }
  // رسم اللوح: القطع بأرقامها والبواقي اللي هتتحفظ والهالك
  function slabSVG(s) {
    var Wv = 600, k = Wv / s.L, Hv = Math.max(s.W * k, 20), g = '';
    s.placed.forEach(function (p) { var w = p.l * k, h = p.w * k; g += '<rect x="' + (p.x * k).toFixed(1) + '" y="' + (p.y * k).toFixed(1) + '" width="' + Math.max(w, 0.5).toFixed(1) + '" height="' + Math.max(h, 0.5).toFixed(1) + '" class="cut-p' + (p.lock ? ' lock' : '') + '"/>' + (w > 26 && h > 14 ? '<text x="' + (p.x * k + w / 2).toFixed(1) + '" y="' + (p.y * k + h / 2 + 4).toFixed(1) + '" text-anchor="middle">' + p.no + (p.match ? ' ' + esc(p.match) + (p.seq ? p.seq : '') : '') + '</text>' : ''); });
    arr(s.remnants).forEach(function (r) { g += '<rect x="' + (r.x * k).toFixed(1) + '" y="' + (r.y * k).toFixed(1) + '" width="' + (r.L * k).toFixed(1) + '" height="' + (r.W * k).toFixed(1) + '" class="cut-keep"/>'; });
    return '<svg class="slab-svg" viewBox="0 0 ' + Wv + ' ' + Hv.toFixed(0) + '"><rect x="0" y="0" width="' + Wv + '" height="' + Hv.toFixed(1) + '" class="cut-waste"/>' + g + '</svg>';
  }
  function nestHTML(plan, title) {
    if (!plan || !plan.sheets.length) return '';
    return '<p class="more-h">' + esc(title || 'توزيع القطع على الألواح') + '</p>' + plan.sheets.map(function (s) {
      return '<div class="bar-row"><div class="bar-cap"><b>لوح ' + s.no + '</b> · ' + fq(s.L / 10) + '×' + fq(s.W / 10) + ' سم' + (s.src !== 'new' ? ' <span class="src-badge">' + (s.src === 'remnant' ? 'باقي' : 'متاح') + '</span>' : '') + ' · ' + s.placed.length + ' قطعة · مستغل ' + s.usedPct + '%'
        + ' · بواقي ' + fq(s.remArea) + ' م² · هالك ' + fq(s.waste) + ' م²</div>' + slabSVG(s)
        + '<div class="slab-legend">' + s.placed.map(function (p) { return '<span><b>' + p.no + '</b> ' + esc(p.name) + ' ' + fq(p.l / 10) + '×' + fq(p.w / 10) + (p.rot ? ' ↻' : '') + '</span>'; }).join('') + '</div></div>';
    }).join('') + '<p class="hint">↻ = القطعة اتلفّت. الأخضر = باقي هيتحفظ في المخزن، والرمادي هالك. القطع المقفولة (العرق) مش بتتلف.</p>';
  }
  function piecesHTML(c) {
    var h = '';
    if (c.plan) h += nestHTML(c.plan) + (c.plan.remArea || c.plan.fromStock ? '<button type="button" class="btn btn-soft" data-act="cutRemnants" style="margin-top:10px">' + ic('box') + ' سجّل البواقي في المخزن</button>' : '');
    if (c.seq && c.seq.length) h += '<p class="more-h">ترقيم المطابقة</p><table class="mini-table"><thead><tr><th>القطعة</th><th>اللوح</th><th>الوش</th><th>الزوج</th></tr></thead><tbody>' + c.seq.map(function (s) { return '<tr><td>' + s.no + '</td><td>' + esc(v0(s.slab)) + '</td><td>' + esc(s.face) + '</td><td>' + esc(v0(s.pair)) + '</td></tr>'; }).join('') + '</tbody></table>';
    if (c.parts && c.parts.length && !c.plan) h += '<p class="more-h">القطع للقص</p><table class="mini-table"><thead><tr><th>القطعة</th><th>الطول × العرض سم</th><th>العدد</th></tr></thead><tbody>' + c.parts.map(function (p) { return '<tr><td>' + esc(p.name) + (p.grain ? ' <small>عرق مقفول</small>' : '') + '</td><td dir="ltr">' + fq(p.L / 10) + ' × ' + fq(p.W / 10) + '</td><td>' + p.count + '</td></tr>'; }).join('') + '</tbody></table>';
    return h;
  }
  function updateItemLive() {
    if (!E || !$('itRes')) return;
    var it = E.it, r = C.item(it, ctx()), c = r.calc;
    $('calcRes').innerHTML = '<div class="card-title"><span class="t-ic orange">' + ic('chart') + '</span><h2>النتيجة وطريقة الحساب</h2></div>'
      + (c.rows.length ? '<div class="sum-list">' + resRows(c.rows) + '</div>' : '<p class="hint">' + (it.kind === 'custom' ? 'ضيف الخامات والمصنعية تحت.' : 'اكتب المقاسات والنتيجة هتظهر هنا.') + '</p>')
      + (c.warn.length ? '<div class="warn-box">' + c.warn.map(esc).join('<br>') + '</div>' : '') + piecesHTML(c);
    var sg = c.sug;
    $('sugCard').innerHTML = '<div class="card-title"><span class="t-ic">' + ic('box') + '</span><h2>الكميات المحسوبة</h2>' + (sg.length ? '<span class="tag">' + sg.length + '</span>' : '') + '</div>'
      + (sg.length ? '<div class="sum-list">' + sg.map(function (s) { var l = it.lines.find(function (x) { return x.auto === s.key; }); return row(s.name + (l ? (l.locked ? ' — متعدل يدوي' : ' ✓') : ''), fq(s.qty) + ' ' + s.unit); }).join('') + '</div>'
        + '<button type="button" class="btn btn-soft" data-act="applySug" style="margin-top:10px">' + ic('check') + ' تطبيق على الخامات</button><p class="hint">أسعار الخامات من المكتبة، وأسعار الحواف والفتحات من الإعدادات. الكمية اللي تعدلها بإيدك مش بتتغير تاني.</p>'
        : '<p class="hint">مفيش كميات محسوبة لسه.</p>');
    r.lines.forEach(function (x, i) { var el = document.querySelector('[data-lt="' + i + '"]'); if (el) el.innerHTML = (x.waste ? fq(x.qty) + ' + هالك ' + fq(x.waste) + ' = ' : '') + '<b>' + fq(x.final) + ' ' + esc(x.unit) + '</b>' + (r.supply ? ' · شراء ' + esc(money(x.costT)) + ' · بيع ' + esc(money(x.sellT)) : ''); });
    r.labor.forEach(function (x, i) { var el = document.querySelector('[data-la="' + i + '"]'); if (el) el.innerHTML = x.method === 'lump' ? 'مقطوعية <b>' + esc(money(x.amount)) + '</b>' : fq(x.qty) + (x.auto ? ' (تلقائي)' : '') + (x.method === 'daily' ? ' يوم × ' + fq(x.workers) + ' عامل' : '') + ' × ' + esc(fmt(x.price)) + ' = <b>' + esc(money(x.amount)) + '</b>'; });
    var by = r.costBy, h = '<div class="card-title"><span class="t-ic orange">' + ic('receipt') + '</span><h2>التكلفة والسعر والربح</h2></div><div class="sum-list">';
    if (r.supply) Object.keys(K.CATS).forEach(function (k) { if (by[k]) h += row('تكلفة ' + K.CATS[k], money(by[k])); });
    else h += row('الخامات', 'من العميل (تركيب فقط)');
    if (r.wasteCost) h += row('منها الهالك', money(r.wasteCost));
    if (r.internal) h += row('تكاليف داخلية (تصنيع/تركيب)', money(r.internal));
    h += row('إجمالي التكلفة', money(r.cost), 'bold') + row('الخامات والشغل (بيع)', money(r.matSell)) + row('المصنعية', money(r.laborT)) + (r.extrasT ? row('الإضافات', money(r.extrasT)) : '') + row('سعر البيع للعميل', money(r.total), 'bold')
      + '<div class="sum-row profit' + (r.profit < 0 ? ' neg' : '') + '"><span>الربح</span><strong dir="ltr">' + esc(money(r.profit)) + '</strong></div>' + row('هامش الربح', fq(r.margin) + '%') + '</div>'
      + '<p class="cost-note">الأسعار والكثافة ونسب الهالك من المكتبة والإعدادات بتاعتك — مفيش أرقام ثابتة مفترضة.</p>';
    $('itRes').innerHTML = h;
    $('itTotal').textContent = money(r.total);
  }
  function itemInput(e) {
    var el = e.target, v = el.type === 'checkbox' ? el.checked : el.value;
    if (!E) return;
    if (el.id === 'f_cname') { E.custName = el.value; return; }
    if (el.id === 'f_jtitle') { E.jobTitle = el.value; return; }
    var k = el.dataset.k; if (!k) return;
    setPath(E.it, k, v);
    var m = k.match(/^lines\.(\d+)\.qty$/); if (m && E.it.lines[+m[1]] && E.it.lines[+m[1]].auto) E.it.lines[+m[1]].locked = true;
    if (el.tagName === 'SELECT' || el.type === 'checkbox') { if (e.type === 'change') renderItemPage(); else updateItemLive(); }
    else updateItemLive();
  }
  $('itemPage').addEventListener('input', itemInput);
  $('itemPage').addEventListener('change', function (e) { if (e.target.type === 'checkbox' || e.target.tagName === 'SELECT') itemInput(e); });
  function libMatch(s) { return (s.libId && libById(s.libId)) || libByName(s.name) || libByName(s.lib) || null; }
  // سعر الصنف بوحدة السطر: لوح ← سعر اللوح (أو سعر المتر × مساحة اللوح)، م.ط ← سعر المتر الطولي، قطعة ← سعر القطعة
  function libPrice(m, unit, k) {
    var sl = C.slabOf(m), area = sl ? sl.area : 0, v;
    if (unit === 'لوح') v = k === 'cost' ? (C.num(m.slabCost) || C.num(m.cost) * area) : (C.num(m.slabPrice) || C.num(m.price) * area);
    else if (unit === 'م.ط') v = k === 'cost' ? 0 : C.num(m.lmPrice);
    else if (unit === 'قطعة' && m.cat === 'mat') v = k === 'cost' ? 0 : C.num(m.piecePrice);
    else v = C.num(m[k]);
    return v ? String(C.round(v, 2)) : '';
  }
  function applySug() {
    var it = E.it, c = C.item(it, ctx()).calc, n = 0;
    c.sug.forEach(function (s) {
      var l = it.lines.find(function (x) { return x.auto === s.key; });
      if (l) { if (!l.locked) { l.qty = String(s.qty); l.unit = s.unit; } }
      else {
        var m = s.cat === 'work' ? null : libMatch(s), sale = m ? libPrice(m, s.unit, 'price') : '';
        if (s.price != null && (!m || !sale)) sale = String(s.price);
        it.lines.push({ id: uid('l'), auto: s.key, name: m ? matLabel(m) + (s.unit === 'لوح' ? ' (لوح)' : '') : s.name, unit: s.unit, qty: String(s.qty), cat: (m && m.cat) || s.cat,
          cost: m ? libPrice(m, s.unit, 'cost') : '', price: sale, wastePct: m && s.unit !== 'لوح' ? m.wastePct || '' : '', libId: m ? m.id : '' });
      }
      n++;
    });
    it.lines = it.lines.filter(function (l) { return !l.auto || l.locked || c.sug.some(function (s) { return s.key === l.auto; }); });
    renderItemPage(); toast('اتطبقت ' + n + ' كمية — عدّل براحتك');
  }
  function itemText(it) {
    var r = C.item(it, ctx()), c = r.calc, t = ['أرزقي | Arzoqi — ' + itemTitle(it), ''];
    c.rows.forEach(function (x) { t.push('• ' + x[0] + ': ' + x[1]); });
    if (c.parts && c.parts.length) { t.push('', 'القطع:'); c.parts.forEach(function (p) { t.push('- ' + p.name + ': ' + fq(p.L / 10) + ' × ' + fq(p.W / 10) + ' سم × ' + p.count); }); }
    if (c.plan) t.push('', 'الألواح: ' + c.plan.count + ' — مستغل ' + c.plan.usedPct + '% — هالك ' + c.plan.wastePct + '%');
    if (r.lines.length) { t.push('', 'الخامات:'); r.lines.forEach(function (l) { t.push('- ' + l.name + ': ' + fq(l.final) + ' ' + l.unit); }); }
    t.push('', 'الإجمالي: ' + money(r.total));
    if (c.warn.length) t.push('', 'ملاحظات: ' + c.warn.join(' — '));
    return t.join('\n');
  }
  function shareText(title, text) {
    if (navigator.share) { navigator.share({ title: title, text: text }).catch(function () {}); return; }
    var done = function () { toast('اتنسخت النتايج — الصقها في واتساب أو أي مكان'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); done(); });
    else { fallbackCopy(text); done(); }
  }
  function fallbackCopy(text) { var ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) {} ta.remove(); }
  function toNote() { var it = E.it; db.notes.unshift({ id: uid('n'), date: new Date().toISOString(), title: itemTitle(it), kind: it.kind, total: C.item(it, ctx()).total, text: itemText(it), it: clone(it) }); saveDb(); toast('اتحفظ في النوتة'); }
  function saveItem(then) {
    var it = E.it, job = E.jobId ? getJob(E.jobId) : null, fromHome = !job;
    if (!job) {
      var name = String(E.custName || '').trim(), c = name ? ensureCustomer(name) : null;
      job = E.targetJob ? getJob(E.targetJob) : null;
      if (!job) job = newJobRecord(c, String(E.jobTitle || '').trim() || (c ? itemTitle(it) : 'حساب سريع — ' + itemTitle(it)), today(), c ? 'survey' : 'active');
    }
    var id = E.itemId || uid('i'); it.id = id;
    var i = job.items.findIndex(function (x) { return x.id === id; });
    if (i >= 0) job.items[i] = it; else job.items.push(it);
    settings.laborPrices = settings.laborPrices || {};
    it.labor.forEach(function (l) { if (l.name && C.num(l.price)) settings.laborPrices[lpKey(l.name, l.method)] = l.price; });
    var inn = it['in'] || {}; if (inn.unit) { settings.lastUnits = settings.lastUnits || {}; settings.lastUnits[it.kind] = inn.unit; } if (inn.mat) settings.lastMat = inn.mat;
    touch(job); saveDb(); saveSettings();
    var jid = job.id, edit = !!E.itemId;
    closeTop(function () { refresh(); toast(edit ? 'اتعدل' : 'اتحفظ'); if (then) then(jid); else if (fromHome) openJob(jid); });
  }

  // ---------------- اختيار من المكتبة ----------------
  function openLibPick(lineIdx) {
    openSheet('اختار من المكتبة', '<div class="search-box">' + ic('search') + '<input type="search" id="f_lq" placeholder="دوّر بالاسم أو اللون أو المورد أو رقم الدفعة" autocomplete="off"></div>'
      + '<div class="chips wrap" id="f_lsys"><button type="button" class="chip on" data-act="libPickCat" data-v="">الكل</button>' + Object.keys(K.CATS).map(function (c) { return '<button type="button" class="chip" data-act="libPickCat" data-v="' + c + '">' + esc(K.CATS[c]) + '</button>'; }).join('') + '</div><div id="f_llist"></div>', { form: 'libpick', line: lineIdx, cat: '' });
    renderLibPick(); $('f_lq').addEventListener('input', renderLibPick);
  }
  function libHay(x) { return [x.name, x.trade, x.color, x.shade, x.supplier, x.origin, x.batch, x.finish, K.FAMS[x.fam]].join(' '); }
  function renderLibPick() {
    var q = ($('f_lq') ? $('f_lq').value : '').trim(), cat = S.cat;
    var list = lib().filter(function (x) { return (!cat || x.cat === cat) && (!q || libHay(x).indexOf(q) >= 0); });
    $('f_llist').innerHTML = list.slice(0, 80).map(function (x) { return '<div class="mat-row" data-act="libPicked" data-id="' + esc(x.id) + '"><div class="m-info"><div class="m-name">' + esc(matLabel(x) || x.name) + '</div><div class="m-meta">' + esc([K.FAMS[x.fam] || K.CATS[x.cat], x.color, x.unit, C.num(x.slabL) ? 'لوح ' + x.slabL + '×' + x.slabW : ''].filter(Boolean).join(' · ')) + '</div></div><span class="m-qty">' + (C.num(x.price) ? esc(money(C.num(x.price))) : '—') + '</span></div>'; }).join('') || '<div class="home-empty">مفيش نتايج</div>';
  }
  function libPicked(id) {
    var m = libById(id); if (!m || !E) return;
    var i = S.line, l = i >= 0 ? E.it.lines[i] : null;
    if (!l) { l = { id: uid('l'), qty: '1' }; E.it.lines.push(l); }
    var unit = l.unit && l.auto ? l.unit : m.unit;
    Object.assign(l, { name: matLabel(m) || m.name, unit: unit, cost: libPrice(m, unit, 'cost'), price: libPrice(m, unit, 'price'), wastePct: m.wastePct || l.wastePct || '', cat: m.cat, libId: m.id });
    closeTop(function () { renderItemPage(); toast('اتاخد من المكتبة: ' + m.name); });
  }
  // ====================================================================
  // الأدوات: الحاسبات — المكتبة — المخزن والبواقي — العمال — الأسعار والإعدادات — التقارير — النوتة
  // ====================================================================
  var tool = null, toolState = { libCat: '', libFam: '', libQ: '', invTab: 'rem', repPeriod: 'all', repCust: '', repKind: '', workerId: null };
  function openTool(name, o) {
    tool = name; if (o) Object.assign(toolState, o); renderTool();
    var el = $('toolPage'); el.classList.add('open'); el.scrollTop = 0;
    pushLayer({ type: 'page', hide: function () { el.classList.remove('open'); tool = null; } });
  }
  // صفحة فرعية جوه الأداة (عامل من قايمة العمال): زرار الرجوع بيرجّع للقايمة
  function subTool(name) {
    var prev = tool; tool = name; renderTool(); $('toolPage').scrollTop = 0;
    pushLayer({ type: 'sub', hide: function () { if (tool === name && $('toolPage').classList.contains('open')) { tool = prev; renderTool(); } } });
  }
  function toolHead(t, s, extra) { return '<div class="pg-head"><button type="button" class="icon-btn" data-act="closeTop" aria-label="رجوع">' + ic('back') + '</button><div class="titles"><h2>' + esc(t) + '</h2><div class="sub">' + esc(s || '') + '</div></div>' + (extra || '') + '</div>'; }
  function renderTool() {
    var el = $('toolPage'), st = el.scrollTop;
    el.innerHTML = tool === 'library' ? libraryHTML() : tool === 'inventory' ? inventoryHTML() : tool === 'workers' ? workersHTML() : tool === 'worker' ? workerHTML()
      : tool === 'labor' ? laborToolHTML() : tool === 'reports' ? reportsHTML() : tool === 'notes' ? notesHTML() : calcsHTML();
    el.scrollTop = st;
    if (tool === 'library') bindLibSearch();
    if (tool === 'reports') ['repCust', 'repKind'].forEach(function (id) { $(id).addEventListener('change', function () { toolState[id] = this.value; renderTool(); }); });
    loadImgs(el);
  }
  function kindTile(k, act, title, ti) { var d = KINDS[k]; return '<button type="button" class="t-tile" data-act="' + (act || 'quickKind') + '" data-kind="' + k + '"' + (title ? ' data-title="' + esc(title) + '"' : '') + (ti != null ? ' data-ti="' + ti + '"' : '') + '><span class="q-ic orange-soft">' + ic(d.icon) + '</span><b>' + esc(title || kindLabel(k)) + '</b></button>'; }
  function toolTile(t, i) { if (t[0] === 'project') return '<button type="button" class="t-tile" data-act="newJob" data-ti="' + i + '"><span class="q-ic orange-soft">' + ic('plus') + '</span><b>' + esc(t[1]) + '</b></button>'; return kindTile(t[0], 'quickKind', t[1], i); }
  function calcsHTML() {
    return toolHead('الحاسبات المستقلة', K.TOOLS.length + ' حاسبة — من غير مشروع') + '<div class="container"><div class="type-tiles compact">' + K.TOOLS.map(toolTile).join('') + '</div>'
      + K.GROUPS.map(function (g) { var ks = Object.keys(KINDS).filter(function (k) { return KINDS[k].grp === g[0]; }); return ks.length ? '<p class="more-h">' + esc(g[1]) + '</p><div class="type-tiles compact">' + ks.map(function (k) { return kindTile(k); }).join('') + '</div>' : ''; }).join('') + '</div>';
  }
  // ---- المكتبة ----
  function libraryHTML() {
    var cat = toolState.libCat, fam = toolState.libFam;
    return toolHead('مكتبة الخامات', lib().length + ' صنف — رخام وجرانيت وأحجار وإكسسوارات ومستهلكات') + '<div class="container">'
      + '<button type="button" class="btn btn-accent" data-act="libNew" style="margin-bottom:12px">' + ic('plus') + ' إضافة خامة / صنف</button>'
      + '<div class="search-box">' + ic('search') + '<input type="search" id="libQ" placeholder="دوّر بالاسم أو اللون أو المورد أو المنشأ أو رقم الدفعة" value="' + esc(toolState.libQ) + '" autocomplete="off"></div>'
      + '<div class="filter-chips"><button type="button" class="chip' + (!cat ? ' on' : '') + '" data-act="libCat" data-v="">الكل</button>' + Object.keys(K.CATS).map(function (c) { return '<button type="button" class="chip' + (cat === c ? ' on' : '') + '" data-act="libCat" data-v="' + c + '">' + esc(K.CATS[c]) + '</button>'; }).join('') + '</div>'
      + (cat === 'mat' || !cat ? '<div class="filter-chips"><button type="button" class="chip' + (!fam ? ' on' : '') + '" data-act="libFam" data-v="">كل الأنواع</button>' + Object.keys(K.FAMS).map(function (f) { return '<button type="button" class="chip' + (fam === f ? ' on' : '') + '" data-act="libFam" data-v="' + f + '">' + esc(K.FAMS[f]) + '</button>'; }).join('') + '</div>' : '')
      + '<div id="libList"></div></div>';
  }
  function bindLibSearch() { var q = $('libQ'); if (q) q.addEventListener('input', function () { toolState.libQ = q.value; renderLibList(); }); renderLibList(); }
  function renderLibList() {
    var cat = toolState.libCat, fam = toolState.libFam, q = toolState.libQ.trim();
    var list = lib().filter(function (x) { return (!cat || x.cat === cat) && (!fam || x.fam === fam) && (!q || libHay(x).indexOf(q) >= 0); });
    var by = {}; list.forEach(function (x) { var k = x.cat === 'mat' ? 'f:' + (K.FAMS[x.fam] ? x.fam : '') : x.cat; (by[k] = by[k] || []).push(x); });
    var order = Object.keys(K.FAMS).concat(['']).map(function (f) { return 'f:' + f; }).concat(Object.keys(K.CATS).filter(function (c) { return c !== 'mat'; }));
    $('libList').innerHTML = order.filter(function (k) { return by[k]; }).map(function (k) {
      var t = k.indexOf('f:') === 0 ? (K.FAMS[k.slice(2)] || 'خامات أخرى') : K.CATS[k];
      return '<p class="more-h">' + esc(t) + ' <small>' + by[k].length + '</small></p>' + by[k].map(function (x) {
        var sl = C.slabOf(x);
        return '<div class="mat-row" data-act="libEdit" data-id="' + esc(x.id) + '">' + (x.photo ? '<img class="m-ph" data-media="' + esc(x.photo) + '" alt="">' : '') + '<div class="m-info"><div class="m-name">' + esc(matLabel(x) || x.name) + '</div><div class="m-meta">' + esc([x.color, x.origin, sl ? 'لوح ' + x.slabL + '×' + x.slabW + ' سم (' + fq(C.round(sl.area, 3)) + ' م²)' : '', arr(x.sizes).length ? arr(x.sizes).length + ' مقاس' : '', x.unit, C.num(x.stock) ? 'المخزن ' + x.stock : '', x.batch ? 'دفعة ' + x.batch : ''].filter(Boolean).join(' · ')) + '</div></div>'
          + '<span class="m-qty">' + (C.num(x.price) ? esc(money(C.num(x.price))) : '—') + (C.num(x.cost) ? '<small>شراء ' + esc(fmt(C.num(x.cost))) + '</small>' : '') + '</span></div>';
      }).join('');
    }).join('') || '<div class="home-empty">مفيش أصناف بالبحث ده</div>';
    loadImgs($('libList'));
  }
  var MAT_FIELDS = [['trade', 'الاسم التجاري'], ['type', 'التصنيف (أرضيات، مطابخ، واجهات…)'], ['origin', 'المنشأ'], ['supplier', 'المورد'], ['color', 'اللون'], ['shade', 'درجة اللون'], ['vein', 'شكل العروق'], ['veinDir', 'اتجاه العروق'],
    ['thick', 'السمك (سم)', 1], ['slabL', 'طول اللوح (سم)', 1], ['slabW', 'عرض اللوح (سم)', 1], ['cost', 'سعر شراء المتر المربع', 1], ['price', 'سعر بيع المتر المربع', 1], ['slabCost', 'سعر شراء اللوح', 1], ['slabPrice', 'سعر بيع اللوح', 1],
    ['lmPrice', 'سعر بيع المتر الطولي', 1], ['piecePrice', 'سعر بيع القطعة', 1], ['stock', 'المخزن (ألواح/م²)', 1], ['batch', 'رقم الدفعة / اللوح'], ['density', 'الكثافة كجم/م³ (للوزن)', 1], ['wastePct', 'هالك افتراضي %', 1], ['notes', 'ملاحظات']];
  var OTHER_FIELDS = [['supplier', 'المورد'], ['cost', 'سعر الشراء', 1], ['price', 'سعر البيع', 1], ['stock', 'الكمية في المخزن', 1], ['wastePct', 'هالك %', 1], ['notes', 'ملاحظات']];
  function openLibSheet(id, copy, pre) {
    var x = id ? clone(libById(id) || {}) : Object.assign({ cat: toolState.libCat || 'mat', fam: toolState.libFam || '', unit: (toolState.libCat || 'mat') === 'mat' ? 'م²' : 'قطعة', sizes: [] }, pre || {});
    if (copy) { x.name = (x.name || '') + ' (نسخة)'; x.photo = ''; }
    var isMat = x.cat === 'mat', fields = isMat ? MAT_FIELDS : OTHER_FIELDS;
    var f = function (p) { return '<div class="field"><label for="f_l' + p[0] + '">' + p[1] + '</label><input type="text" id="f_l' + p[0] + '"' + (p[2] ? ' inputmode="decimal" dir="ltr"' : '') + ' value="' + esc(v0(x[p[0]])) + '"></div>'; };
    var sizes = arr(x.sizes).map(function (z, i) { return '<div class="task-row cols-5" data-size="' + i + '">' + ['t', 'L', 'W', 'cost', 'price'].map(function (k) { return '<input type="text" inputmode="decimal" dir="ltr" data-zk="' + k + '" value="' + esc(v0(z[k])) + '" placeholder="' + { t: 'سمك', L: 'طول', W: 'عرض', cost: 'شراء لوح', price: 'بيع لوح' }[k] + '">'; }).join('') + '<button type="button" class="btn btn-danger btn-icon" data-act="sizeDel" data-i="' + i + '">' + ic('x') + '</button></div>'; }).join('');
    openSheet(id && !copy ? 'تعديل صنف' : 'إضافة صنف', '<div class="field"><label for="f_lname">الاسم</label><input type="text" id="f_lname" value="' + esc(v0(x.name)) + '"></div>'
      + '<div class="row-2"><div class="field"><label for="f_lcat">التصنيف</label><select id="f_lcat">' + Object.keys(K.CATS).map(function (c) { return '<option value="' + c + '"' + (x.cat === c ? ' selected' : '') + '>' + esc(K.CATS[c]) + '</option>'; }).join('') + '</select></div>'
      + (isMat ? '<div class="field"><label for="f_lfam">نوع الخامة</label><select id="f_lfam"><option value="">أخرى</option>' + Object.keys(K.FAMS).map(function (k) { return '<option value="' + k + '"' + (x.fam === k ? ' selected' : '') + '>' + esc(K.FAMS[k]) + '</option>'; }).join('') + '</select></div>' : '<div class="field"><label for="f_lunit">الوحدة</label><select id="f_lunit">' + unitOptions(x.unit || 'قطعة') + '</select></div>') + '</div>'
      + (isMat ? '<div class="row-2"><div class="field"><label for="f_lfinish">التشطيب</label><select id="f_lfinish"><option value="">—</option>' + finishes().map(function (t) { return '<option' + (x.finish === t ? ' selected' : '') + '>' + esc(t) + '</option>'; }).join('') + '</select></div><div class="field"><label for="f_lgrade">الدرجة / الفرز</label><input type="text" id="f_lgrade" list="grades" value="' + esc(v0(x.grade)) + '"><datalist id="grades">' + K.GRADES.map(function (g) { return '<option value="' + esc(g) + '">'; }).join('') + '</datalist></div></div>' : '')
      + '<div class="grid-2">' + fields.map(f).join('') + '</div>'
      + (isMat ? '<p class="more-h">مقاسات وسمكات تانية لنفس الخامة</p><div class="rows-ed" id="f_lsizes">' + sizes + '</div><button type="button" class="btn btn-ghost btn-sm" data-act="sizeAdd">' + ic('plus') + ' مقاس</button><p class="hint">لكل سمك: طول وعرض اللوح بالسنتيمتر وسعره — الحاسبات بتختار المقاس حسب السمك المكتوب.</p>' : '')
      + '<div class="ph-row" id="f_lphoto">' + (x.photo ? thumb(x.photo) + '<button type="button" class="btn btn-ghost btn-sm" data-act="libPhotoDel">' + ic('x') + ' شيل الصورة</button>' : '') + '<button type="button" class="btn btn-ghost btn-sm" data-act="libPhoto">' + ic('camera') + ' ' + (x.photo ? 'تغيير الصورة' : 'صورة الخامة') + '</button></div>'
      + '<button type="button" class="btn btn-accent" data-act="libSave">' + ic('check') + ' حفظ</button>'
      + (id && !copy ? '<div class="btn-row" style="margin-top:10px"><button type="button" class="btn btn-ghost" data-act="libCopy">' + ic('copy') + ' نسخ</button><button type="button" class="btn btn-danger" data-act="libDel">' + ic('trash') + ' حذف</button></div>' : ''),
      { form: 'lib', libId: copy ? null : id || null, srcId: id || null, fields: fields.map(function (p) { return p[0]; }), x: x });
    loadImgs($('sheetBody'));
    $('f_lcat').addEventListener('change', function () { var d = readLib(); d.cat = this.value; d.unit = this.value === 'mat' ? 'م²' : (d.unit === 'م²' ? 'قطعة' : d.unit); var keep = S.libId, src = S.srcId; closeTop(function () { openLibSheet(null, false, d); S.libId = keep; S.srcId = src; }); });
  }
  function readLib() {
    var x = S.x || {}; x.name = $('f_lname').value.trim();
    S.fields.forEach(function (k) { if ($('f_l' + k)) x[k] = $('f_l' + k).value.trim(); });
    if ($('f_lfam')) x.fam = $('f_lfam').value; if ($('f_lfinish')) x.finish = $('f_lfinish').value; if ($('f_lgrade')) x.grade = $('f_lgrade').value.trim(); if ($('f_lunit')) x.unit = $('f_lunit').value;
    x.cat = $('f_lcat').value;
    if ($('f_lsizes')) x.sizes = Array.prototype.map.call($('f_lsizes').querySelectorAll('[data-size]'), function (r) { var z = {}; Array.prototype.forEach.call(r.querySelectorAll('[data-zk]'), function (i) { z[i.dataset.zk] = i.value.trim(); }); return z; });
    return x;
  }
  function libSave() {
    var d = readLib(); if (!d.name) { toast('اكتب الاسم'); return; }
    var x = S.libId ? libById(S.libId) : null;
    if (!x) { x = { id: uid('L') }; lib().push(x); }
    Object.keys(d).forEach(function (k) { if (k !== 'id') x[k] = d[k]; });
    if (x.cat === 'mat') { x.unit = 'م²'; x.sizes = arr(x.sizes).filter(function (z) { return C.num(z.L) && C.num(z.W); }); }
    saveSettings(); closeTop(function () { refresh(); toast('اتحفظ «' + x.name + '»'); });
  }
  // ---- المخزن والبواقي (ألواح كاملة وجزئية وبواقي بمقاساتها) ----
  function remArea(r) { return C.round(C.num(r.L) * C.num(r.W) / 1e4 * (C.num(r.count) || 1), 4); }
  function inventoryHTML() {
    var tab = toolState.invTab;
    var h = toolHead('المخزن والبواقي', 'ألواح وبواقي بمقاساتها — البواقي مش هالك') + '<div class="container"><div class="segmented seg-2" style="margin-bottom:12px"><button type="button" class="' + (tab === 'rem' ? 'on' : '') + '" data-act="invTab" data-v="rem">البواقي والألواح الجزئية (' + db.remnants.length + ')</button><button type="button" class="' + (tab === 'stock' ? 'on' : '') + '" data-act="invTab" data-v="stock">مخزن الخامات</button></div>';
    if (tab === 'rem') {
      var tot = db.remnants.reduce(function (s, r) { return s + remArea(r); }, 0);
      h += '<button type="button" class="btn btn-accent" data-act="remNew" style="margin-bottom:12px">' + ic('plus') + ' تسجيل باقي / لوح جزئي</button><p class="hint">بتتستخدم في «تقسيم الألواح» وخطة ألواح المشروع قبل اللوح الجديد (لنفس الخامة). الإجمالي ' + esc(fq(C.round(tot, 3))) + ' م².</p>'
        + (db.remnants.length ? db.remnants.slice().sort(function (a, b) { return remArea(b) - remArea(a); }).map(function (r) { var m = libById(r.matId); return '<div class="mat-row" data-act="remEdit" data-id="' + esc(r.id) + '">' + (r.photo ? '<img class="m-ph" data-media="' + esc(r.photo) + '" alt="">' : '') + '<div class="m-info"><div class="m-name">' + esc(m ? matLabel(m) : r.name || 'خامة') + ' — ' + fq(C.num(r.L)) + '×' + fq(C.num(r.W)) + ' سم</div><div class="m-meta">' + esc([r.kind === 'partial' ? 'لوح جزئي' : 'باقي', fq(remArea(r)) + ' م²', r.T ? r.T + ' سم' : '', r.slabNo ? 'من لوح ' + r.slabNo : '', r.place, fmtDate(r.date), r.src].filter(Boolean).join(' · ')) + '</div></div><span class="m-qty">× ' + esc(v0(r.count || 1)) + '</span></div>'; }).join('') : '<div class="home-empty">مفيش بواقي متسجلة</div>');
    } else {
      var list = lib().filter(function (x) { return C.num(x.stock); });
      h += '<p class="hint">الكمية في المخزن بتتكتب من «مكتبة الخامات» لكل صنف (ألواح، م²، علب…).</p>' + (list.length ? list.map(function (x) { return '<div class="mat-row" data-act="libEdit" data-id="' + esc(x.id) + '"><div class="m-info"><div class="m-name">' + esc(matLabel(x) || x.name) + '</div><div class="m-meta">' + esc(K.FAMS[x.fam] || K.CATS[x.cat] || '') + '</div></div><span class="m-qty">' + esc(x.stock + ' ' + (x.cat === 'mat' ? 'لوح/م²' : x.unit)) + '</span></div>'; }).join('') : '<div class="home-empty">مفيش كميات متسجلة — افتح أي صنف في المكتبة واكتب كميته</div>')
        + '<button type="button" class="btn btn-soft" data-act="tool" data-tool="library" style="margin-top:12px">' + ic('book') + ' المكتبة</button>';
    }
    return h + '</div>';
  }
  function openRemSheet(id, pre) {
    var r = id ? clone(db.remnants.find(function (x) { return x.id === id; }) || {}) : (pre || { count: '1', date: today(), kind: 'rem' });
    var fi = function (k, l, ltr, t) { return '<div class="field"><label for="f_r' + k + '">' + l + '</label><input type="' + (t || 'text') + '" id="f_r' + k + '"' + (ltr ? ' inputmode="decimal" dir="ltr"' : '') + ' value="' + esc(v0(r[k])) + '"></div>'; };
    openSheet(id ? 'تعديل باقي' : 'تسجيل باقي', '<div class="field"><label for="f_rmat">الخامة</label><select id="f_rmat"><option value="">—</option>' + lib().filter(function (x) { return x.cat === 'mat'; }).map(function (x) { return '<option value="' + esc(x.id) + '"' + (r.matId === x.id ? ' selected' : '') + '>' + esc(matLabel(x)) + '</option>'; }).join('') + '</select></div>'
      + '<div class="segmented seg-2" id="f_rkind" style="margin-bottom:12px"><button type="button" class="' + (r.kind !== 'partial' ? 'on' : '') + '" data-act="remKind" data-v="rem">باقي</button><button type="button" class="' + (r.kind === 'partial' ? 'on' : '') + '" data-act="remKind" data-v="partial">لوح جزئي</button></div>'
      + '<div class="grid-2">' + fi('L', 'الطول (سم)', 1) + fi('W', 'العرض (سم)', 1) + fi('T', 'السمك (سم)', 1) + fi('count', 'العدد', 1) + fi('slabNo', 'رقم اللوح الأصلي') + fi('place', 'مكان التخزين') + fi('date', 'التاريخ', 0, 'date') + fi('note', 'ملاحظة') + '</div>'
      + '<div class="ph-row" id="f_rphoto">' + (r.photo ? thumb(r.photo) : '') + '<button type="button" class="btn btn-ghost btn-sm" data-act="remPhoto">' + ic('camera') + ' ' + (r.photo ? 'تغيير الصورة' : 'صورة الباقي') + '</button></div>'
      + '<button type="button" class="btn btn-accent" data-act="remSave">' + ic('check') + ' حفظ</button>' + (id ? '<button type="button" class="btn btn-danger" data-act="remDel" style="margin-top:10px">' + ic('trash') + ' استخدمته / حذف</button>' : ''), { form: 'rem', remId: id || null, kind: r.kind || 'rem', photo: r.photo || '' });
    loadImgs($('sheetBody'));
  }
  function remSave() {
    var L = C.num($('f_rL').value), Wd = C.num($('f_rW').value); if (!L || !Wd) { toast('اكتب الطول والعرض'); return; }
    var r = S.remId ? db.remnants.find(function (x) { return x.id === S.remId; }) : null;
    if (!r) { r = { id: uid('r') }; db.remnants.push(r); }
    r.matId = $('f_rmat').value; r.L = String(L); r.W = String(Wd); r.T = $('f_rT').value.trim(); r.count = $('f_rcount').value || '1'; r.slabNo = $('f_rslabNo').value.trim(); r.place = $('f_rplace').value.trim(); r.date = $('f_rdate').value || today(); r.note = $('f_rnote').value.trim(); r.kind = S.kind; r.photo = S.photo || '';
    saveDb(); closeTop(function () { refresh(); toast('اتسجل الباقي'); });
  }
  // بعد التقسيم: البواقي الكبيرة بتتسجل، والبواقي/الألواح المتاحة اللي اتستخدمت بتتشال
  function addRemnants(plan, matId, src) {
    var n = 0;
    plan.sheets.forEach(function (s) { arr(s.remnants).forEach(function (r) { db.remnants.push({ id: uid('r'), matId: matId || '', L: String(C.round(r.L / 10, 1)), W: String(C.round(r.W / 10, 1)), count: '1', date: today(), slabNo: String(s.no), src: src || '', kind: 'rem' }); n++; }); });
    var used = plan.sheets.filter(function (s) { return s.src === 'remnant' && s.stockId; }).map(function (s) { return s.stockId; });
    used.forEach(function (id) { var r = db.remnants.find(function (x) { return x.id === id; }); if (!r) return; var c = C.num(r.count) || 1; if (c > 1) r.count = String(c - 1); else db.remnants = db.remnants.filter(function (x) { return x !== r; }); });
    saveDb(); return { added: n, used: used.length };
  }
  // ---- العمال ----
  function workersHTML() {
    return toolHead('العمال والمصنعية', 'الأجور والسلف والمستحقات') + '<div class="container"><button type="button" class="btn btn-accent" data-act="workerNew" style="margin-bottom:12px">' + ic('plus') + ' عامل جديد</button>'
      + (db.workers.length ? db.workers.map(function (w) { var r = C.worker(w, db.wlog, db.wpay); return '<div class="mat-row" data-act="workerOpen" data-id="' + esc(w.id) + '"><div class="m-info"><div class="m-name">' + esc(w.name) + '</div><div class="m-meta">' + esc([w.trade, w.daily ? 'يومية ' + w.daily : '', r.entries + ' شغلانة'].filter(Boolean).join(' · ')) + '</div></div><span class="m-qty">' + esc(money(r.due)) + '<small>مستحق</small></span></div>'; }).join('') : '<div class="home-empty">مفيش عمال لسه</div>') + '</div>';
  }
  var WK = { day: 'يومية', hour: 'بالساعة', piece: 'بالقطعة', m: 'بالمتر الطولي', m2: 'بالمتر المربع', step: 'بالدرجة', slab: 'باللوح', lump: 'مقطوعية' };
  var WK_RATE = { day: 'daily', hour: 'hour', piece: 'piece', m: 'm', m2: 'm2', step: 'step', slab: 'slab' };
  function workerHTML() {
    var w = db.workers.find(function (x) { return x.id === toolState.workerId; }); if (!w) return toolHead('عامل') + '<div class="container"></div>';
    var r = C.worker(w, db.wlog, db.wpay), log = db.wlog.filter(function (x) { return x.workerId === w.id; }).sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); }), pays = db.wpay.filter(function (x) { return x.workerId === w.id; });
    return toolHead(w.name, w.trade || 'عامل', '<button type="button" class="icon-btn" data-act="workerEdit" aria-label="تعديل">' + ic('edit') + '</button>') + '<div class="container">'
      + '<div class="mini-stats"><div><span>الشغل</span><strong>' + esc(money(r.earned)) + '</strong></div><div><span>المدفوع (منه سلف ' + esc(fmt(r.advances)) + ')</span><strong>' + esc(money(r.paid)) + '</strong></div><div><span>المستحق</span><strong>' + esc(money(r.due)) + '</strong></div></div>'
      + '<div class="btn-row" style="margin-bottom:12px"><button type="button" class="btn btn-accent" data-act="wlogNew">' + ic('plus') + ' شغل / يومية</button><button type="button" class="btn btn-soft" data-act="wpayNew">' + ic('cash') + ' دفع / سلفة</button></div>'
      + card('الشغل', 'list', log.length ? log.map(function (x) { var j = getJob(x.jobId); return '<div class="mat-row" data-act="wlogDel" data-id="' + esc(x.id) + '"><div class="m-info"><div class="m-name">' + esc(WK[x.kind] || x.kind) + ' — ' + fq(C.num(x.qty)) + ' × ' + esc(fmt(C.num(x.rate))) + '</div><div class="m-meta">' + esc([fmtDate(x.date), j ? custName(j) + ' ' + (j.number || '') : '', x.note].filter(Boolean).join(' · ')) + '</div></div><span class="m-qty">' + esc(money(C.num(x.amount) || C.num(x.qty) * C.num(x.rate))) + '</span></div>'; }).join('') : '<p class="hint">مفيش شغل متسجل</p>')
      + card('المدفوعات والسلف', 'cash', pays.length ? pays.map(function (x) { return '<div class="mat-row" data-act="wpayDel" data-id="' + esc(x.id) + '"><div class="m-info"><div class="m-name">' + (x.type === 'advance' ? 'سلفة' : 'دفع') + '</div><div class="m-meta">' + esc([fmtDate(x.date), x.note].filter(Boolean).join(' · ')) + '</div></div><span class="m-qty">' + esc(money(C.num(x.amount))) + '</span></div>'; }).join('') : '<p class="hint">مفيش مدفوعات</p>')
      + '<p class="hint">الشغل المربوط بمشروع بيتحسب تكلفة عمالة في المشروع ده.</p></div>';
  }
  function openWorkerSheet(id) {
    var w = id ? db.workers.find(function (x) { return x.id === id; }) || {} : {};
    openSheet(id ? 'تعديل عامل' : 'عامل جديد', '<div class="field"><label for="f_wn">الاسم</label><input type="text" id="f_wn" value="' + esc(v0(w.name)) + '"></div><div class="field"><label for="f_wt">التخصص</label><input type="text" id="f_wt" list="wtrades" value="' + esc(v0(w.trade)) + '"><datalist id="wtrades">' + K.TRADES.map(function (t) { return '<option value="' + esc(t) + '">'; }).join('') + '</datalist></div>'
      + '<div class="grid-2">' + [['daily', 'اليومية'], ['hour', 'سعر الساعة'], ['piece', 'سعر القطعة'], ['m', 'سعر المتر الطولي'], ['m2', 'سعر المتر المربع'], ['step', 'سعر الدرجة'], ['slab', 'سعر اللوح']].map(function (p) { return '<div class="field"><label for="f_w' + p[0] + '">' + p[1] + '</label><input type="text" id="f_w' + p[0] + '" inputmode="decimal" dir="ltr" value="' + esc(v0(w[p[0]])) + '"></div>'; }).join('') + '</div>'
      + '<div class="field"><label for="f_wph">التليفون</label><input type="text" id="f_wph" dir="ltr" value="' + esc(v0(w.phone)) + '"></div><button type="button" class="btn btn-accent" data-act="workerSave">' + ic('check') + ' حفظ</button>', { form: 'worker', wId: id || null });
  }
  function workerSave() {
    var n = $('f_wn').value.trim(); if (!n) { toast('اكتب الاسم'); return; }
    var w = S.wId ? db.workers.find(function (x) { return x.id === S.wId; }) : null;
    if (!w) { w = { id: uid('w') }; db.workers.push(w); }
    w.name = n; w.trade = $('f_wt').value.trim(); w.phone = $('f_wph').value.trim(); ['daily', 'hour', 'piece', 'm', 'm2', 'step', 'slab'].forEach(function (k) { w[k] = $('f_w' + k).value; });
    saveDb(); var id = w.id, wasList = tool === 'workers'; closeTop(function () { toolState.workerId = id; if (wasList) subTool('worker'); else refresh(); toast('اتحفظ'); });
  }
  function openWlogSheet() {
    var w = db.workers.find(function (x) { return x.id === toolState.workerId; }) || {};
    openSheet('شغل / يومية — ' + (w.name || ''), '<div class="field"><label>الحساب</label><div class="chips wrap" id="f_lkinds">' + Object.keys(WK).map(function (k, i) { return '<button type="button" class="chip' + (i === 0 ? ' on' : '') + '" data-act="wlogKind" data-v="' + k + '">' + WK[k] + '</button>'; }).join('') + '</div></div>'
      + '<div class="row-2"><div class="field"><label for="f_lq">الكمية</label><input type="text" id="f_lq" inputmode="decimal" dir="ltr" value="1"></div><div class="field"><label for="f_lr">السعر</label><input type="text" id="f_lr" inputmode="decimal" dir="ltr" value="' + esc(v0(w.daily)) + '"></div></div>'
      + '<div class="row-2"><div class="field"><label for="f_ld">التاريخ</label><input type="date" id="f_ld" value="' + today() + '"></div><div class="field"><label for="f_lj">المشروع</label><select id="f_lj"><option value="">—</option>' + sortedJobs().filter(function (j) { return j.status !== 'done'; }).map(function (j) { return '<option value="' + esc(j.id) + '">' + esc(custName(j) + ' ' + j.number) + '</option>'; }).join('') + '</select></div></div>'
      + '<div class="field"><label for="f_ln">ملاحظة</label><input type="text" id="f_ln"></div><button type="button" class="btn btn-accent" data-act="wlogSave">' + ic('check') + ' حفظ</button>', { form: 'wlog', kind: 'day', w: w });
  }
  // ---- الأسعار والإعدادات ----
  function priceTable(title, icon, key, names, delAct, addId, addAct, custom) {
    var pm = settings[key] || {};
    return card(title, icon, '<div class="rows-ed">' + names.map(function (nm) { return '<div class="task-row cols-2"><span class="lp-name">' + esc(nm) + '</span><input type="text" inputmode="decimal" dir="ltr" data-pt="' + key + '" data-pn="' + esc(nm) + '" value="' + esc(v0(pm[nm])) + '" placeholder="السعر">' + (custom.indexOf(nm) >= 0 ? '<button type="button" class="btn btn-danger btn-icon" data-act="' + delAct + '" data-v="' + esc(nm) + '">' + ic('x') + '</button>' : '<span></span>') + '</div>'; }).join('') + '</div>'
      + '<div class="row-2" style="margin-top:10px"><input type="text" id="' + addId + '" placeholder="إضافة نوع جديد"><button type="button" class="btn btn-soft" data-act="' + addAct + '">' + ic('plus') + ' إضافة</button></div>');
  }
  function laborToolHTML() {
    var lp = settings.laborPrices || {}, keys = Object.keys(lp);
    var chipList = function (list, custom, del) { return '<div class="chips wrap">' + list.map(function (m) { return '<span class="chip static">' + esc(m) + (custom.indexOf(m) >= 0 ? ' <button type="button" class="chip-x" data-act="' + del + '" data-v="' + esc(m) + '">×</button>' : '') + '</span>'; }).join('') + '</div>'; };
    var setF = function (k, l) { return '<div class="ff"><span class="mini-lbl">' + l + '</span><input type="text" inputmode="decimal" dir="ltr" data-set="' + k + '" value="' + esc(v0(settings[k])) + '"></div>'; };
    return toolHead('الأسعار والإعدادات', 'الحواف والفتحات والتشطيب والمصنعية والدفع والمراحل والقص') + '<div class="container">'
      + priceTable('أسعار الحواف (للمتر الطولي)', 'edge', 'edgePrices', edgeTypes(), 'delEdge', 'f_newEdge', 'addEdge', arr(settings.edges))
      + priceTable('أسعار الفتحات والقصات (للفتحة)', 'cutout', 'cutPrices', cutNames(), 'delCutName', 'f_newCut', 'addCutName', arr(settings.cutNames))
      + priceTable('أسعار التشطيب (للمتر المربع)', 'shine', 'finishPrices', finishes(), 'delFinish', 'f_newFin', 'addFinish', arr(settings.finishes))
      + card('طرق حساب المصنعية', 'cash', chipList(laborMethods().map(function (m) { return m[1]; }), arr(settings.laborMethods), 'delMethod') + '<div class="row-2" style="margin-top:10px"><input type="text" id="f_newMethod" placeholder="طريقة جديدة (مثلاً: بالعمود)"><button type="button" class="btn btn-soft" data-act="addMethod">' + ic('plus') + ' إضافة</button></div>')
      + card('أسعار المصنعية المحفوظة', 'book', (keys.length ? keys.map(function (k) { var p = k.split('|'); return '<div class="task-row cols-2"><span class="lp-name">' + esc(p[0]) + '<small>' + esc(C.LABOR[p[1]] || p[1].replace(/^x:/, '')) + '</small></span><input type="text" inputmode="decimal" dir="ltr" data-lp="' + esc(k) + '" value="' + esc(v0(lp[k])) + '"><button type="button" class="btn btn-danger btn-icon" data-act="delLp" data-v="' + esc(k) + '">' + ic('x') + '</button></div>'; }).join('') : '<p class="hint">بيتحفظ هنا أول ما تحفظ بند فيه مصنعية.</p>'))
      + card('طرق الدفع', 'cash', chipList(payMethods(), arr(settings.payMethods), 'delPayMethod') + '<div class="row-2" style="margin-top:10px"><input type="text" id="f_newPm" placeholder="مثلاً: شيك، إنستاباي"><button type="button" class="btn btn-soft" data-act="addPayMethod">' + ic('plus') + ' إضافة</button></div>')
      + card('مراحل المشروع', 'list', '<div class="rows-ed">' + stages().map(function (s, i) { return '<div class="task-row cols-1"><input type="text" data-stage="' + i + '" value="' + esc(s) + '"><button type="button" class="btn btn-danger btn-icon" data-act="stageDel" data-i="' + i + '">' + ic('x') + '</button></div>'; }).join('') + '</div><button type="button" class="btn btn-ghost btn-sm" data-act="stageAdd">' + ic('plus') + ' مرحلة</button>')
      + card('القص وتقسيم الألواح (افتراضي للمشاريع)', 'nest', '<div class="fgrid">' + setF('kerf', 'السلاح (مم)') + setF('margin', 'هامش حرف اللوح (مم)') + setF('keepL', 'أقل طول باقي يتحفظ (سم)') + setF('keepW', 'أقل عرض باقي يتحفظ (سم)') + '</div><p class="hint">قواعد ورشتك: بتتعدل هنا ومفيش قيم مفروضة.</p>') + '</div>';
  }
  // ---- التقارير ----
  function inPeriod(d) { var p = toolState.repPeriod, t = today(); if (p === 'all') return true; if (!d) return false; return p === 'month' ? String(d).slice(0, 7) === t.slice(0, 7) : String(d).slice(0, 4) === t.slice(0, 4); }
  function reportsHTML() {
    var t = today(), rk = toolState.repKind, js = db.jobs.filter(function (j) { return inPeriod(j.date) && (!toolState.repCust || j.customerId === toolState.repCust) && (!rk || j.items.some(function (it) { return it.kind === rk; })); }), real = js.filter(function (j) { return !isOffer(j); });
    var S1 = { tot: 0, cost: 0, profit: 0, paid: 0, area: 0, lm: 0, slabs: 0, kitchens: 0, steps: 0, facades: 0, waste: 0, mfg: 0, inst: 0, exp: 0 }, byKind = {}, byCust = {}, byMat = {}, due = [], late = [], done = 0, open = 0;
    real.forEach(function (j) {
      var r = J(j); S1.tot += r.total; S1.cost += r.totalCost; S1.profit += r.profit; S1.paid += r.paid; S1.waste += r.wasteCost;
      S1.exp += r.byType.expense + r.byType.transport + r.byType.other;
      if (r.remaining > 0.005) due.push([j, r.remaining]);
      if (j.status === 'done') done++; else { open++; if (j.due && j.due < t) late.push(j); }
      var c = byCust[j.customerId || '-'] || (byCust[j.customerId || '-'] = { name: custName(j), total: 0 }); c.total += r.total;
      j.items.forEach(function (it, i) {
        if (rk && it.kind !== rk) return;
        var x = r.items[i]; if (it.kind === 'facade') S1.facades++;
        var mt = x.metrics; S1.area += (mt.m2 || 0) * x.qty; S1.lm += (mt.lm || 0) * x.qty; S1.slabs += (mt.slab || 0) * x.qty; S1.kitchens += (mt.kitchen || 0) * x.qty; S1.steps += (mt.step || 0) * x.qty;
        x.labor.forEach(function (l) { if (l.grp === 'install') S1.inst += l.amount; else S1.mfg += l.amount; });
        x.lines.forEach(function (l) { if (l.cat !== 'mat') return; var b = byMat[l.name] || (byMat[l.name] = { qty: {}, cost: 0 }); b.qty[l.unit] = C.round((b.qty[l.unit] || 0) + l.final, 3); b.cost += l.costT; });
        var k = it.kind === 'custom' ? ((it['in'] || {}).workName || 'بند حر') : kindLabel(it.kind); var b = byKind[k] || (byKind[k] = { n: 0, total: 0 }); b.n += 1; b.total += x.total;
      });
    });
    var remA = db.remnants.reduce(function (s, r) { return s + remArea(r); }, 0);
    var top = Object.keys(byCust).map(function (k) { return byCust[k]; }).sort(function (a, b) { return b.total - a.total; }).slice(0, 5), kinds = Object.keys(byKind).map(function (k) { return [k, byKind[k]]; }).sort(function (a, b) { return b[1].n - a[1].n; });
    var mats = Object.keys(byMat).map(function (k) { return [k, byMat[k]]; }).sort(function (a, b) { return b[1].cost - a[1].cost; });
    return toolHead('تقارير الورشة', 'الرخام والجرانيت') + '<div class="container"><div class="segmented seg-3" style="margin-bottom:12px">' + [['month', 'الشهر ده'], ['year', 'السنة دي'], ['all', 'الكل']].map(function (o) { return '<button type="button" class="' + (toolState.repPeriod === o[0] ? 'on' : '') + '" data-act="repPeriod" data-v="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div>'
      + '<div class="fgrid"><div class="ff"><span class="mini-lbl">العميل</span><select id="repCust"><option value="">كل العملاء</option>' + db.customers.map(function (c) { return '<option value="' + esc(c.id) + '"' + (toolState.repCust === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '</select></div>'
      + '<div class="ff"><span class="mini-lbl">نوع الشغل</span><select id="repKind"><option value="">كل الأنواع</option>' + Object.keys(KINDS).filter(function (k) { return KINDS[k].grp !== 'money'; }).map(function (k) { return '<option value="' + k + '"' + (rk === k ? ' selected' : '') + '>' + esc(kindLabel(k)) + '</option>'; }).join('') + '</select></div></div>'
      + (toolState.repCust || rk ? '<p class="hint">' + (rk ? 'الكميات للنوع ده بس، والفلوس للمشاريع اللي فيها النوع ده.' : '') + '</p>' : '')
      + card('الأعمال', 'chart', '<div class="sum-list">' + row('المشاريع', js.length + ' (مقايسات وعروض ' + (js.length - real.length) + ')') + row('مفتوحة / مسلّمة', open + ' / ' + done) + row('المطابخ', String(S1.kitchens)) + row('درجات السلالم', String(S1.steps)) + row('بنود الواجهات', String(S1.facades))
        + row('المساحة', fq(C.round(S1.area, 3)) + ' م²') + row('الأمتار الطولية', fq(C.round(S1.lm, 3)) + ' م.ط') + row('الألواح (المحسوبة)', fq(S1.slabs)) + row('الهالك', money(S1.waste)) + row('البواقي في المخزن', db.remnants.length + ' (' + fq(C.round(remA, 3)) + ' م²)') + '</div>')
      + card('الفلوس', 'cash', '<div class="sum-list">' + row('إجمالي المبيعات', money(S1.tot), 'bold') + row('مصنعية التصنيع', money(S1.mfg)) + row('مصنعية التركيب', money(S1.inst)) + row('المصروفات والنقل', money(S1.exp)) + row('إجمالي التكاليف', money(S1.cost))
        + '<div class="sum-row profit' + (S1.profit < 0 ? ' neg' : '') + '"><span>إجمالي الربح</span><strong dir="ltr">' + esc(money(S1.profit)) + '</strong></div>' + row('المدفوعات', money(S1.paid)) + row('المستحقات', money(S1.tot - S1.paid)) + row('العملاء', String(db.customers.length)) + '</div>')
      + card('الخامات المستخدمة', 'slab', mats.length ? '<div class="sum-list">' + mats.slice(0, 12).map(function (m) { return row(m[0] + ' — ' + Object.keys(m[1].qty).map(function (u) { return fq(m[1].qty[u]) + ' ' + u; }).join(' + '), money(m[1].cost)); }).join('') + '</div>' : '<p class="hint">مفيش بيانات (طبّق الكميات على الخامات في البنود)</p>')
      + card('أفضل العملاء', 'users', top.length ? '<div class="sum-list">' + top.map(function (c) { return row(c.name, money(c.total)); }).join('') + '</div>' : '<p class="hint">مفيش بيانات</p>')
      + card('أكتر أنواع الشغل', 'grid', kinds.length ? '<div class="sum-list">' + kinds.slice(0, 10).map(function (k) { return row(k[0] + ' (' + k[1].n + ')', money(k[1].total)); }).join('') + '</div>' : '<p class="hint">مفيش بيانات</p>')
      + card('المستحقات (الفواتير)', 'receipt', due.length ? due.sort(function (a, b) { return b[1] - a[1]; }).map(function (d) { return '<div class="mat-row" data-act="openJob" data-id="' + esc(d[0].id) + '"><div class="m-info"><div class="m-name">' + esc(custName(d[0])) + '</div><div class="m-meta">' + esc([d[0].title, d[0].number].filter(Boolean).join(' · ')) + '</div></div><span class="m-qty">' + esc(money(d[1])) + '</span></div>'; }).join('') : '<p class="hint">مفيش فلوس متأخرة</p>')
      + card('المشاريع المتأخرة', 'calendar', late.length ? late.map(function (j) { return '<div class="mat-row" data-act="openJob" data-id="' + esc(j.id) + '"><div class="m-info"><div class="m-name">' + esc(custName(j)) + '</div><div class="m-meta">التسليم ' + esc(fmtDate(j.due)) + ' · ' + esc(stages()[j.stage || 0] || '') + '</div></div></div>'; }).join('') : '<p class="hint">مفيش مشاريع متأخرة (حدد موعد التسليم من بيانات المشروع).</p>') + '</div>';
  }
  // ---- النوتة ----
  function notesHTML() {
    return toolHead('النوتة', 'حسابات محفوظة') + '<div class="container">' + (db.notes.length ? db.notes.map(function (n) {
      return '<div class="sub-card"><div class="sc-head"><b class="grow">' + esc(n.title) + '</b><span class="src-badge">' + esc(fmtDate(n.date)) + '</span></div><div class="sum-list">' + row('الإجمالي', money(n.total)) + '</div>'
        + '<div class="btn-row" style="margin-top:8px"><button type="button" class="btn btn-ghost btn-sm" data-act="noteOpen" data-id="' + esc(n.id) + '">' + ic('edit') + ' افتح</button><button type="button" class="btn btn-ghost btn-sm" data-act="noteShare" data-id="' + esc(n.id) + '">' + ic('share') + ' مشاركة</button><button type="button" class="btn btn-danger btn-sm" data-act="noteDel" data-id="' + esc(n.id) + '">' + ic('trash') + '</button></div></div>';
    }).join('') : '<div class="home-empty">النوتة فاضية — من أي حاسبة اضغط «للنوتة»</div>') + '</div>';
  }
  $('toolPage').addEventListener('input', function (e) {
    var el = e.target;
    if (el.dataset.lp != null) { settings.laborPrices[el.dataset.lp] = el.value; saveSettings(); return; }
    if (el.dataset.pt) { settings[el.dataset.pt] = settings[el.dataset.pt] || {}; settings[el.dataset.pt][el.dataset.pn] = el.value; saveSettings(); return; }
    if (el.dataset.stage != null) { var st = stages().slice(); st[+el.dataset.stage] = el.value; settings.stages = st; saveSettings(); }
    if (el.dataset.set) { settings[el.dataset.set] = el.value; saveSettings(); }
  });
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
        + '<p class="hint" style="margin:-6px 0 12px">من تكلفة الخامات المسجلة في المشروع: ' + esc(money(J(job).matBase)) + '</p>';
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
    var r = C.cost(d, J(job).matBase);
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
    var r = J(Object.assign({}, job, { discount: { type: S.dtype, value: C.num($('f_dval').value) } }));
    $('f_dtotal').textContent = money(r.total); $('f_dlbl').textContent = 'الخصم ' + money(r.discount) + ' — الإجمالي بعده';
  }

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
    var i = it['in'] || {}, m = libById(i.mat), b = [], mt = x.metrics;
    if (mt.m2) b.push(fq(mt.m2) + ' م²'); if (mt.lm) b.push(fq(mt.lm) + ' م.ط'); if (mt.step) b.push(mt.step + ' درجة'); if (mt.slab) b.push(mt.slab + ' لوح');
    if (m) b.push(m.name); if (!b.length) b.push(kindLabel(it.kind));
    if (x.scope === 'install' || it.scope === 'install') b.push('تركيب فقط');
    if (x.calc.warn.length) b.push('⚠ ' + x.calc.warn.length);
    return b.join(' · ');
  }
  function costRowHTML(c, x) {
    var meta = c.mode === 'pct' ? fq(x.pct) + '% من الخامات ' + fmt(x.base) : c.mode === 'amount' ? 'مبلغ' : fq(x.qty) + ' ' + (c.unit || '') + ' × ' + fmt(x.price);
    return '<div class="mat-row" data-act="editCost" data-id="' + esc(c.id) + '"><div class="m-info"><div class="m-name">' + esc(c.name || C.COST_TYPES[c.type]) + ' <span class="src-badge">' + (c.billed ? 'على العميل' : 'عليك') + '</span></div><div class="m-meta">' + esc(meta) + '</div></div><span class="m-qty">' + esc(money(x.total)) + '</span></div>';
  }
  function jobNest(j) { return C.jobNest(j, Object.assign(ctx(), { useRemnants: true })); }
  var WO_ST = ['لسه مبدأش', 'جاري', 'متوقف', 'مكتمل'];
  function renderJob(id) {
    var j = getJob(id); if (!j) return;
    var c = getCust(j.customerId) || null, r = J(j), st = stages(), si = Math.min(j.stage || 0, st.length - 1);
    var places = uniq(j.items.map(function (it) { return it.place || ''; }).concat([''])), items = '', n = 0;
    places.forEach(function (pl) {
      var list = j.items.map(function (it, i) { return [it, i]; }).filter(function (p) { return (p[0].place || '') === pl; }); if (!list.length) return;
      if (places.length > 2 || pl) items += '<p class="more-h">' + esc(pl || 'من غير مكان') + '</p>';
      items += list.map(function (p) {
        var it = p[0], x = r.items[p[1]]; n++;
        return '<div class="item-card" data-act="editItem" data-id="' + esc(it.id) + '"><span class="room-num">' + n + '</span><div class="i-info"><div class="i-name">' + esc(itemTitle(it)) + '</div><div class="i-meta">' + esc(itemMeta(it, x)) + '</div></div>'
          + '<div class="i-amt">' + esc(money(x.total)) + '<small>ربح ' + esc(fmt(x.profit)) + '</small></div></div>';
      }).join('');
    });
    var costs = C.COST_ORDER.map(function (t) { var list = j.costs.map(function (k, i) { return [k, r.costs[i]]; }).filter(function (p) { return p[1].type === t; }); return list.length ? '<p class="more-h">' + esc(C.COST_TYPES[t]) + '</p>' + list.map(function (p) { return costRowHTML(p[0], p[1]); }).join('') : ''; }).join('');
    var pays = j.payments.slice().sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); }).map(function (p) {
      return '<div class="entry pay-row" data-act="editPay" data-id="' + esc(p.id) + '"><span class="e-ic">' + ic('cash') + '</span><div class="e-info"><div class="e-title">' + esc(p.kind || p.note || 'دفعة') + '</div><div class="e-meta">' + esc([fmtDate(p.date), p.method, p.ref ? '#' + p.ref : '', p.kind && p.note ? p.note : ''].filter(Boolean).join(' · ')) + '</div></div><span class="e-amt">' + esc(money(p.amount)) + '</span></div>';
    }).join('');
    var adj = arr(j.adjust).map(function (a) { return '<div class="mat-row" data-act="editAdj" data-id="' + esc(a.id) + '"><div class="m-info"><div class="m-name">' + esc(a.name || (a.type === 'return' ? 'مرتجع' : 'إضافة')) + ' <span class="src-badge' + (a.type === 'return' ? ' warn' : '') + '">' + (a.type === 'return' ? 'مرتجع' : 'إضافة') + '</span></div><div class="m-meta">' + esc(fmtDate(a.date)) + '</div></div><span class="m-qty">' + (a.type === 'return' ? '- ' : '+ ') + esc(money(C.num(a.amount))) + '</span></div>'; }).join('');
    var late = j.due && j.due < today() && j.status !== 'done';
    var plan = jobNest(j), planN = plan.reduce(function (s, p) { return s + (p.plan ? p.plan.count : 0); }, 0);
    var disc = C.num(j.discount && j.discount.value) && j.discount.type === 'percent' ? ' (' + fq(j.discount.value) + '%)' : '';
    var photos = arr(j.photos);
    var sumBits = [r.area ? fq(r.area) + ' م²' : '', r.lm ? fq(r.lm) + ' م.ط' : '', r.kitchens ? r.kitchens + ' مطبخ' : '', r.steps ? r.steps + ' درجة' : '', r.kg ? '≈ ' + fq(r.kg) + ' كجم' : ''].filter(Boolean).join(' · ');
    var html = '<div class="pg-head"><button type="button" class="icon-btn" data-act="closeTop" aria-label="رجوع">' + ic('back') + '</button>'
      + '<div class="titles"><h2>' + esc(c ? c.name : 'حساب سريع') + '</h2><div class="sub">' + esc([j.title, j.number, fmtDate(j.date), j.site].filter(Boolean).join(' · ')) + '</div></div>'
      + '<button type="button" class="icon-btn" data-act="jobMenu" aria-label="خيارات">' + ic('more') + '</button></div><div class="container">'
      + '<section class="home-sum"><div class="hs-label">' + (isOffer(j) ? 'قيمة ' + STATUS[j.status][0] : 'إجمالي المشروع') + '</div><div class="hs-value">' + esc(fmt(r.total)) + ' <small>' + esc(cur().sym) + '</small></div>'
      + '<div class="hs-stats"><button type="button" data-act="addPay"><span>المدفوع</span><strong>' + esc(fmt(r.paid)) + '</strong></button><button type="button" data-act="addPay"><span>المتبقي</span><strong>' + esc(fmt(r.remaining)) + '</strong></button>'
      + '<button type="button" class="mat" data-act="scrollProfit"><span>الربح</span><strong dir="ltr">' + esc(fmt(r.profit)) + '</strong></button></div></section>'
      + '<div class="status-row" style="margin:-4px 2px 10px">' + ['survey', 'quote', 'active', 'done'].map(function (s) { return '<button type="button" class="chip' + ((j.status || 'active') === s ? ' on' : '') + '" data-act="setStatus" data-v="' + s + '">' + STATUS[s][0] + '</button>'; }).join('')
      + (j.due ? '<span class="src-badge' + (late ? ' warn' : '') + '">التسليم ' + esc(fmtDate(j.due)) + (late ? ' — متأخر' : '') + '</span>' : '') + '</div>'
      + (j.status === 'survey' ? '<button type="button" class="btn btn-soft" data-act="toQuote" style="margin-bottom:10px">' + ic('file') + ' اعتمد المقايسة وحوّلها لعرض سعر</button>' : j.status === 'quote' ? '<button type="button" class="btn btn-soft" data-act="toInvoice" style="margin-bottom:10px">' + ic('receipt') + ' العميل وافق — حوّل لفاتورة</button>' : '')
      + '<div class="card"><div class="card-title"><span class="t-ic">' + ic('list') + '</span><h2>مرحلة المشروع</h2><span class="tag">' + (si + 1) + '/' + st.length + '</span></div><div class="stages">' + st.map(function (s, i) { return '<button type="button" class="stage' + (i < si ? ' done' : i === si ? ' on' : '') + '" data-act="setStage" data-i="' + i + '">' + esc(s) + '</button>'; }).join('') + '</div></div>'
      + '<div class="card"><div class="card-title"><span class="t-ic orange">' + ic('slab') + '</span><h2>الأماكن والقطع والبنود</h2>' + (j.items.length ? '<span class="tag">' + j.items.length + '</span>' : '') + '</div>'
      + (sumBits ? '<p class="hint" style="margin-top:-4px">' + esc(sumBits) + '</p>' : '')
      + (items || '<p class="card-empty">سجّل أول بند (مطبخ، سلم، مدخل، واجهة، أرضية…):</p>') + '<button type="button" class="btn btn-soft" data-act="addKindPick">' + ic('plus') + ' بند / مكان</button></div>'
      + '<div class="card"><div class="card-title"><span class="t-ic">' + ic('nest') + '</span><h2>خطة الألواح للمشروع</h2></div>' + (plan.length ? '<div class="sum-list">' + plan.map(function (p) { return '<div class="sum-row how"><span>' + esc(p.name) + '<small>' + esc(p.plan ? 'مستغل ' + p.plan.usedPct + '% · هالك ' + p.plan.wastePct + '%' + (p.plan.fromStock ? ' · ' + p.plan.fromStock + ' من البواقي' : '') + (p.plan.tooBig.length ? ' · ⚠ ' + p.plan.tooBig.length + ' قطعة أكبر من اللوح (قسّمها)' : '') : 'محتاج مقاس اللوح في المكتبة') + '</small></span><strong>' + esc(p.plan ? p.plan.count + ' لوح' : '—') + '</strong></div>'; }).join('') + '</div>'
        + '<div class="btn-row" style="margin-top:10px"><button type="button" class="btn btn-ghost btn-sm" data-act="preview" data-doc="work">' + ic('nest') + ' أمر الشغل وتوزيع الألواح</button><button type="button" class="btn btn-ghost btn-sm" data-act="jobRemnants"' + (planN ? '' : ' disabled') + '>' + ic('box') + ' سجّل البواقي في المخزن</button></div>' : '<p class="card-empty">الخطة بتطلع من قطع البنود (لكل خامة بمقاس لوحها).</p>') + '</div>'
      + '<div class="card"><div class="card-title"><span class="t-ic">' + ic('camera') + '</span><h2>صور الموقع والكروكي</h2>' + (photos.length ? '<span class="tag">' + photos.length + '</span>' : '') + '</div>'
        + (photos.length ? '<div class="ph-grid">' + photos.map(function (p) { return '<div class="ph-cell">' + thumb(p.media, 'jobPhotoOpen', ' data-id="' + esc(p.id) + '"') + '<small>' + esc((p.kind === 'sketch' ? 'كروكي' : 'موقع') + (p.note ? ' — ' + p.note : '')) + '</small></div>'; }).join('') + '</div>' : '<p class="card-empty">صور المعاينة والكروكي بتتحفظ على الموبايل.</p>')
        + '<div class="btn-row"><button type="button" class="btn btn-ghost btn-sm" data-act="jobPhoto" data-v="site">' + ic('camera') + ' صورة موقع</button><button type="button" class="btn btn-ghost btn-sm" data-act="jobPhoto" data-v="sketch">' + ic('edit') + ' صورة كروكي</button></div></div>'
      + '<div class="card" id="costCard"><div class="card-title"><span class="t-ic">' + ic('box') + '</span><h2>النقل والتركيب والمصروفات</h2></div>'
      + '<div class="chips wrap" style="margin-bottom:6px">' + C.COST_ORDER.map(function (t) { return '<button type="button" class="chip" data-act="addCost" data-type="' + t + '">+ ' + esc(C.COST_TYPES[t]) + '</button>'; }).join('') + '</div>'
      + (costs || '<p class="card-empty">اختياري — نقل، رفع، تركيب، يوميات، مصروفات موقع، هالك… على العميل أو تكلفة عليك.</p>') + (r.workers ? row('أجور العمال (من سجل العمال)', money(r.workers)) : '') + '</div>'
      + '<div class="card"><div class="card-title"><span class="t-ic">' + ic('history') + '</span><h2>إضافات ومرتجعات</h2></div>' + (adj || '<p class="card-empty">أي إضافة على المشروع أو مرتجع/استرداد للعميل.</p>') + '<div class="btn-row"><button type="button" class="btn btn-ghost btn-sm" data-act="addAdj" data-v="add">' + ic('plus') + ' إضافة</button><button type="button" class="btn btn-ghost btn-sm" data-act="addAdj" data-v="return">' + ic('history') + ' مرتجع / استرداد</button></div></div>'
      + '<div class="card"><div class="card-title"><span class="t-ic">' + ic('receipt') + '</span><h2>حساب العميل</h2></div><div class="sum-list">'
      + row('الخامات والشغل', money(r.matSell)) + row('المصنعية', money(r.labor)) + (r.extras ? row('إضافات على البنود', money(r.extras)) : '') + (r.billedCosts ? row('مصاريف على العميل', money(r.billedCosts)) : '') + (r.adds ? row('إضافات', money(r.adds)) : '') + (r.returns ? row('مرتجعات', '- ' + money(r.returns)) : '')
      + '<div class="sum-row minus"><span>الخصم' + esc(disc) + ' <button type="button" class="edit-link" data-act="editDisc">' + (r.discount ? 'تعديل' : 'إضافة خصم') + '</button></span><strong>' + (r.discount ? '- ' : '') + esc(money(r.discount)) + '</strong></div>'
      + '<div class="sum-row"><span>الضريبة' + (r.taxPct ? ' ' + fq(r.taxPct) + '%' : '') + ' <button type="button" class="edit-link" data-act="editTax">' + (r.taxPct ? 'تعديل' : 'تفعيل') + '</button></span><strong>' + esc(money(r.tax)) + '</strong></div>'
      + row('الإجمالي', money(r.total), 'bold') + row('المدفوع', money(r.paid)) + '</div>'
      + '<div class="sum-total"><span>' + (r.remaining < -0.005 ? 'زيادة للعميل' : 'المتبقي على العميل') + '</span><strong>' + esc(money(Math.abs(r.remaining))) + '</strong></div>'
      + (pays ? '<div style="margin-top:10px">' + pays + '</div>' : '') + '<button type="button" class="btn btn-ghost" data-act="addPay" style="margin-top:10px">' + ic('cash') + ' تسجيل دفعة</button></div>'
      + '<div class="card" id="profitCard"><div class="card-title"><span class="t-ic orange">' + ic('chart') + '</span><h2>تكلفة وربح المشروع</h2></div><div class="sum-list">'
      + Object.keys(K.CATS).filter(function (k) { return r.catCost[k]; }).map(function (k) { return row('تكلفة ' + K.CATS[k], money(r.catCost[k])); }).join('')
      + C.COST_ORDER.filter(function (t) { return t !== 'mat' && r.byType[t]; }).map(function (t) { return row(C.COST_TYPES[t], money(r.byType[t])); }).join('')
      + (r.wasteCost ? row('منها هالك', money(r.wasteCost)) : '') + row('إجمالي التكلفة', money(r.totalCost), 'bold') + row('قيمة المشروع' + (r.tax ? ' (من غير الضريبة)' : ''), money(r.total - r.tax))
      + '<div class="sum-row profit' + (r.profit < 0 ? ' neg' : '') + '"><span>الربح</span><strong dir="ltr">' + esc(money(r.profit)) + '</strong></div>' + row('هامش الربح', fq(r.margin) + '%') + '</div>'
      + '<p class="cost-note">سعر شراء الخامات والتكاليف الداخلية وأجور العمال بتتحسب تكلفة، ومصنعيتك مش تكلفة. مش بيظهر للعميل.</p></div>'
      + '<div class="card"><div class="card-title"><span class="t-ic">' + ic('nest') + '</span><h2>المعاينة وأمر الشغل</h2></div><div class="fgrid">'
      + '<div class="ff"><span class="mini-lbl">أخد المقاسات</span><input type="text" data-jk="measuredBy" list="techList" value="' + esc(v0(j.measuredBy)) + '"></div><div class="ff"><span class="mini-lbl">تاريخ المعاينة</span><input type="date" data-jk="measureDate" value="' + esc(v0(j.measureDate)) + '"></div>'
      + '<div class="ff"><span class="mini-lbl">بدء التصنيع</span><input type="date" data-jk="woStart" value="' + esc(v0(j.woStart)) + '"></div><div class="ff"><span class="mini-lbl">موعد التسليم</span><input type="date" data-jk="due" value="' + esc(v0(j.due)) + '"></div>'
      + '<div class="ff"><span class="mini-lbl">العامل المسؤول</span><input type="text" data-jk="tech" list="techList" value="' + esc(v0(j.tech)) + '"><datalist id="techList">' + db.workers.map(function (w) { return '<option value="' + esc(w.name) + '">'; }).join('') + '</datalist></div>'
      + '<div class="ff"><span class="mini-lbl">حالة أمر الشغل</span><select data-jk="woStatus">' + WO_ST.map(function (s) { return '<option' + (j.woStatus === s ? ' selected' : '') + '>' + esc(s) + '</option>'; }).join('') + '</select></div>'
      + '<div class="ff"><span class="mini-lbl">مدة التصنيع</span><input type="text" data-jk="duration" value="' + esc(v0(j.duration)) + '" placeholder="10 أيام"></div><div class="ff"><span class="mini-lbl">صلاحية عرض السعر</span><input type="text" data-jk="validity" value="' + esc(v0(j.validity)) + '" placeholder="15 يوم"></div></div>'
      + '<div class="ff-row"><span class="mini-lbl">تعليمات التصنيع والتركيب</span><textarea data-jk="woNotes">' + esc(v0(j.woNotes)) + '</textarea></div>'
      + '<div class="ff-row"><span class="mini-lbl">شروط الدفع (في المقايسة وعرض السعر)</span><input type="text" data-jk="payTerms" value="' + esc(v0(j.payTerms)) + '" placeholder="50% مقدم، 30% بعد شراء الخامات، والباقي عند التسليم"></div>'
      + '<div class="ff-row"><span class="mini-lbl">ترتيب بنود المقايسة وعرض السعر</span><select data-jk="groupBy"><option value="">بالترتيب</option><option value="place"' + (j.groupBy === 'place' ? ' selected' : '') + '>حسب المكان</option><option value="mat"' + (j.groupBy === 'mat' ? ' selected' : '') + '>حسب الخامة</option></select></div></div>'
      + (c ? '<div data-az-crew="' + SECTION + ':' + esc(j.customerId) + '" data-sec="' + SECTION_NAME + '" data-name="' + esc(c.name || '') + '" data-phone="' + esc(c.phone || '') + '" data-address="' + esc(c.address || '') + '" data-rev="' + esc(custRev(j.customerId)) + '" data-paid="' + esc(custPaid(j.customerId)) + '" data-cur="' + esc(cur().sym) + '"></div>' : '')
      + '<div class="card"><div class="card-title"><span class="t-ic">' + ic('edit') + '</span><h2>ملاحظات</h2></div><textarea id="jobNotes" placeholder="بتظهر في المقايسة والفاتورة">' + esc(j.notes || '') + '</textarea></div>'
      + '<div class="doc-grid">' + [['survey', 'file', 'المقايسة'], ['quote', 'file', 'عرض السعر'], ['invoice', 'receipt', 'الفاتورة'], ['work', 'nest', 'أمر الشغل'], ['measure', 'ruler', 'كشف المقاسات'], ['materials', 'box', 'قايمة الخامات'], ['costs', 'chart', 'التكاليف (داخلي)']].map(function (d) { return '<button type="button" class="btn btn-ghost" data-act="preview" data-doc="' + d[0] + '">' + ic(d[1]) + ' ' + d[2] + '</button>'; }).join('') + '</div>'
      + '<div class="btn-row" style="margin-top:10px"><button type="button" class="btn btn-ghost" data-act="dupJob">' + ic('copy') + ' نسخ المشروع</button><button type="button" class="btn btn-danger" data-act="delJob">' + ic('trash') + ' حذف</button></div></div>'
      + '<div class="pg-foot"><div class="eb-info"><span>الإجمالي</span><strong>' + esc(money(r.total)) + '</strong></div><button type="button" class="btn btn-accent" data-act="preview" data-doc="' + ({ survey: 'survey', quote: 'quote' }[j.status] || 'invoice') + '">' + ic('print') + ' ' + ({ survey: 'المقايسة', quote: 'عرض السعر' }[j.status] || 'الفاتورة') + ' PDF</button></div>';
    var el = $('jobPage'), stt = el.scrollTop; el.innerHTML = html; el.scrollTop = stt;
    loadImgs(el);
    $('jobNotes').addEventListener('input', function () { j.notes = this.value; touch(j); saveDb(); });
    Array.prototype.forEach.call(el.querySelectorAll('[data-jk]'), function (inp) {
      inp.addEventListener('input', function () { j[inp.dataset.jk] = inp.value; touch(j); saveDb(); });
      if (inp.type === 'date' || inp.tagName === 'SELECT') inp.addEventListener('change', function () { j[inp.dataset.jk] = inp.value; touch(j); saveDb(); refresh(); });
    });
  }
  function openKindPicker(jobId) {
    openSheet('بند / مكان جديد', '<div class="search-box">' + ic('search') + '<input type="search" id="f_kq" placeholder="دوّر: مطبخ، سلم، واجهة، أرضية، حمام…" autocomplete="off"></div><div id="f_klist"></div>', { form: 'kindpick', jobId: jobId });
    var draw = function () {
      var q = $('f_kq').value.trim();
      $('f_klist').innerHTML = K.GROUPS.map(function (g) { var ks = Object.keys(KINDS).filter(function (k) { return KINDS[k].grp === g[0] && (!q || KINDS[k].label.indexOf(q) >= 0); }); return ks.length ? '<p class="more-h">' + esc(g[1]) + '</p><div class="type-tiles compact">' + ks.map(function (k) { return kindTile(k, 'pickKind'); }).join('') + '</div>' : ''; }).join('');
    };
    draw(); $('f_kq').addEventListener('input', draw);
  }

  // ====================================================================
  // المستندات: مقايسة — عرض سعر — فاتورة — أمر شغل — كشف مقاسات — قايمة خامات — تكاليف (داخلي) — كشف حساب
  // ====================================================================
  var pv = null;
  function business() { var b = settings.business || {}; return { name: b.name || '', trade: 'رخام وجرانيت', phone: b.phone || '', address: b.address || '' }; }
  function specOf(it) {
    var i = it['in'] || {}, m = libById(i.mat), b = [], u = UNIT_LBL[i.unit] || '';
    if (it.kind === 'kitchen') { b.push('مطبخ ' + (KT[i.ktype] || '')); b.push([i.L1, i.L2, i.L3].filter(function (v) { return C.num(v); }).join(' + ') + ' × عمق ' + v0(i.D) + ' ' + u); }
    if (it.kind === 'stairs') b.push(i.mode === 'rows' ? arr(i.steps).length + ' مقاس درجات' : v0(i.n) + ' درجة ' + v0(i.L) + '×' + v0(i.W) + ' ' + u);
    if (m) b.push(matLabel(m));
    var c = C.item(it, ctx()), mt = c.metrics; if (mt.m2) b.push(fq(mt.m2) + ' م²'); if (mt.lm) b.push(fq(mt.lm) + ' م.ط');
    if (it.scope && it.scope !== 'full') b.push(C.SCOPES[it.scope]);
    return b.join(' · ');
  }
  function jobDocHTML(j, doc) {
    var r = J(j), c = getCust(j.customerId) || {}, A = window.ArzaqiInvoice, rows = '', idx = 0;
    var keyOf = function (it) { return j.groupBy === 'place' ? (it.place || 'أخرى') : j.groupBy === 'mat' ? ((libById((it['in'] || {}).mat) || {}).name || 'خامات متنوعة') : ''; };
    var groups = []; j.items.forEach(function (it, i) { var k = keyOf(it), g = groups.find(function (x) { return x.k === k; }); if (!g) { g = { k: k, list: [] }; groups.push(g); } g.list.push(i); });
    groups.forEach(function (g) {
      if (g.k) rows += '<tr><td class="idx">—</td><td class="t" colspan="4"><b>' + A.esc(g.k) + '</b></td></tr>';
      g.list.forEach(function (i) { var it = j.items[i], x = r.items[i]; idx++; rows += '<tr><td class="idx">' + idx + '</td><td class="t">' + A.esc(itemTitle(it)) + '<span class="sub-note">' + A.esc(specOf(it)) + '</span>' + (it.notes ? '<span class="sub-note">' + A.esc(it.notes) + '</span>' : '') + '</td><td>' + x.qty + '</td><td class="money">' + money(x.unitPrice) + '</td><td class="money">' + money(x.total) + '</td></tr>'; });
    });
    j.costs.forEach(function (k, i) { var x = r.costs[i]; if (!x.billed) return; rows += '<tr><td class="idx">—</td><td class="t">' + A.esc(k.name || C.COST_TYPES[x.type]) + '</td><td>' + (k.mode ? '—' : fq(x.qty)) + '</td><td class="money">' + (k.mode ? '—' : fmt(x.price)) + '</td><td class="money">' + money(x.total) + '</td></tr>'; });
    arr(j.adjust).forEach(function (a) { rows += '<tr><td class="idx">—</td><td class="t">' + A.esc((a.type === 'return' ? 'مرتجع: ' : 'إضافة: ') + (a.name || '')) + '</td><td>—</td><td>—</td><td class="money">' + (a.type === 'return' ? '- ' : '') + money(C.num(a.amount)) + '</td></tr>'; });
    var body = '<div class="inv-sec"><span class="n">1</span> الأعمال</div><table class="p-table"><thead><tr><th>م</th><th>البند والمواصفات</th><th>العدد</th><th>سعر الوحدة</th><th>الإجمالي</th></tr></thead><tbody>' + (rows || '<tr><td colspan="5">لسه مفيش بنود</td></tr>') + '</tbody></table>';
    var info = [];
    if (doc !== 'invoice') { if (j.duration) info.push('مدة التصنيع: ' + j.duration); if (j.due) info.push('موعد التسليم: ' + fmtDate(j.due)); if (j.payTerms) info.push('شروط الدفع: ' + j.payTerms); if (doc === 'quote' && j.validity) info.push('صلاحية العرض: ' + j.validity); }
    var notes = info.concat([j.notes, settings.terms]).map(function (s) { return String(s || '').trim(); }).filter(Boolean), cc = cur();
    var discLbl = 'الخصم' + (j.discount && j.discount.type === 'percent' && C.num(j.discount.value) ? ' (' + fq(j.discount.value) + '%)' : '');
    var lbl = { survey: 'مقايسة', quote: 'عرض سعر', invoice: 'فاتورة' }[doc];
    return A.render({ section: SECTION, docKey: doc + ':' + j.id, docLabel: lbl, number: j.number, date: fmtDate(doc === 'invoice' ? today() : (j.date || today())), billable: doc === 'invoice', currency: cc.name + ' (' + cc.sym + ')', business: business(),
      client: { name: c.name || '', phone: [c.phone, c.phone2].filter(Boolean).join(' / '), address: [c.address, c.area].filter(Boolean).join(' — '), note: c.note || '' }, fields: [{ label: 'المشروع', value: j.title || '' }, { label: 'الموقع', value: j.site || '' }], bodyHTML: body,
      notesHTML: notes.length ? '<div class="inv-notes"><h4>ملاحظات وشروط</h4>' + notes.map(function (x) { return '<div>' + A.esc(x).replace(/\n/g, '<br>') + '</div>'; }).join('') + '</div>' : '',
      totals: { lines: [['الأعمال', C.money(r.matSell + r.labor + r.extras)], ['مصاريف', r.billedCosts], ['إضافات', r.adds], ['مرتجعات', r.returns, '-'], [discLbl, r.discount, '-'], ['الضريبة' + (r.taxPct ? ' ' + fq(r.taxPct) + '%' : ''), r.tax]], total: r.total, totalLabel: doc === 'invoice' ? 'الإجمالي' : 'إجمالي ' + lbl, paid: doc === 'invoice' ? r.paid : 0, paidLabel: 'المدفوع' },
      netLabel: 'إجمالي ' + lbl, money: money, signLabel: 'توقيع الورشة' });
  }
  function allParts(j) {
    var out = [];
    j.items.forEach(function (it) { var x = C.item(it, ctx()), def = (it['in'] || {}).mat || ''; arr(x.calc.parts).forEach(function (p) { out.push({ it: it, p: p, m: libById(p.matId || def) }); }); });
    return out;
  }
  function measureDocHTML(j) {
    var c = getCust(j.customerId) || {}, A = window.ArzaqiInvoice, cc = cur(), ps = allParts(j);
    var rows = ps.map(function (x, i) { return '<tr><td class="idx">' + (i + 1) + '</td><td class="t">' + A.esc(x.p.name) + '<span class="sub-note">' + A.esc([x.it.place, itemTitle(x.it)].filter(Boolean).join(' — ')) + '</span></td><td>' + fq(x.p.L / 10) + ' × ' + fq(x.p.W / 10) + '</td><td>' + x.p.count + '</td><td>' + A.esc(x.m ? matLabel(x.m) : '') + '</td><td>' + A.esc([x.p.grain ? 'عرق مقفول' : '', x.p.match ? 'مطابقة ' + x.p.match + (x.p.seq || '') : ''].filter(Boolean).join(' · ')) + '</td></tr>'; }).join('');
    var body = '<div class="inv-sec"><span class="n">1</span> مقاسات القطع (سم — الإطار المستطيل للقص)</div><table class="p-table"><thead><tr><th>م</th><th>القطعة والمكان</th><th>الطول × العرض</th><th>العدد</th><th>الخامة</th><th>ملاحظات</th></tr></thead><tbody>' + (rows || '<tr><td colspan="6">مفيش قطع محسوبة</td></tr>') + '</tbody></table>';
    var info = [['أخد المقاسات', j.measuredBy], ['تاريخ المعاينة', fmtDate(j.measureDate)]].filter(function (x) { return x[1]; });
    return A.render({ section: SECTION, docKey: 'measure:' + j.id, docLabel: 'كشف المقاسات', number: j.number, date: fmtDate(j.date || today()), billable: false, currency: cc.name, business: business(), client: { name: c.name || '', phone: c.phone || '', address: c.address || '' }, fields: [{ label: 'الموقع', value: j.site || '' }], bodyHTML: body,
      notesHTML: info.length ? '<div class="inv-notes"><h4>المعاينة</h4>' + info.map(function (x) { return '<div>' + x[0] + ': <b>' + A.esc(x[1]) + '</b></div>'; }).join('') + '</div>' : '',
      totals: { lines: [], total: ps.length, totalLabel: 'عدد القطع', noSum: true }, netLabel: 'عدد القطع', boxTitle: 'القطع', money: function (v) { return fq(v); }, noWarranty: true, signs: [] });
  }
  function workDocHTML(j) {
    var r = J(j), c = getCust(j.customerId) || {}, A = window.ArzaqiInvoice, cc = cur(), body = '', n = 0;
    j.items.forEach(function (it, i) {
      var x = r.items[i], cl = x.calc; n++;
      body += '<div class="inv-sec"><span class="n">' + n + '</span> ' + A.esc(itemTitle(it)) + '</div><p class="wo-spec">' + A.esc(specOf(it)) + '</p>';
      if (cl.parts && cl.parts.length) body += '<table class="p-table"><thead><tr><th>القطعة</th><th>الطول × العرض سم</th><th>العدد</th><th>العرق / المطابقة</th></tr></thead><tbody>' + cl.parts.map(function (p) { return '<tr><td class="t">' + A.esc(p.name) + '</td><td>' + fq(p.L / 10) + ' × ' + fq(p.W / 10) + '</td><td>' + p.count + '</td><td>' + A.esc([p.grain ? 'مقفول' : 'حر', p.match ? p.match + (p.seq || '') : ''].filter(Boolean).join(' · ')) + '</td></tr>'; }).join('') + '</tbody></table>';
      var work = x.lines.filter(function (l) { return l.cat === 'work' && l.final; });
      if (work.length) body += '<p class="wo-spec">الحواف والفتحات والتشطيب: ' + A.esc(work.map(function (l) { return l.name + ' ' + fq(l.final) + ' ' + l.unit; }).join(' · ')) + '</p>';
      var fin = arr((it['in'] || {}).parts).map(function (p) { return p.finish; }).filter(Boolean); if (fin.length) body += '<p class="wo-spec">التشطيب: ' + A.esc(uniq(fin).join('، ')) + '</p>';
      if (it.notes) body += '<p class="wo-spec">' + A.esc(it.notes) + '</p>';
    });
    var plan = jobNest(j);
    if (plan.length) {
      n++; body += '<div class="inv-sec"><span class="n">' + n + '</span> توزيع القطع على الألواح</div>';
      plan.forEach(function (p) {
        if (!p.plan) { body += '<p class="wo-spec">' + A.esc(p.name) + ': محتاج مقاس اللوح في المكتبة.</p>'; return; }
        body += '<p class="wo-spec"><b>' + A.esc(p.name) + '</b> — ' + p.plan.count + ' لوح · مستغل ' + p.plan.usedPct + '% · بواقي ' + fq(p.plan.remArea) + ' م² · هالك ' + p.plan.wastePct + '%</p>'
          + p.plan.sheets.map(function (s) { return '<div class="wo-bar"><span>لوح ' + s.no + ' (' + fq(s.L / 10) + '×' + fq(s.W / 10) + (s.src === 'remnant' ? ' باقي' : '') + '): ' + s.placed.map(function (q) { return q.no + '- ' + A.esc(q.name) + ' ' + fq(q.l / 10) + '×' + fq(q.w / 10) + (q.rot ? '↻' : ''); }).join(' · ') + '</span>' + slabSVG(s) + '</div>'; }).join('');
      });
    }
    var info = '<div class="inv-notes"><h4>أمر الشغل</h4>' + [['بدء التصنيع', fmtDate(j.woStart)], ['موعد التسليم', fmtDate(j.due)], ['العامل المسؤول', j.tech], ['الحالة', j.woStatus], ['المرحلة', stages()[j.stage || 0]], ['التعليمات', j.woNotes]].filter(function (x) { return x[1]; }).map(function (x) { return '<div>' + x[0] + ': <b>' + A.esc(x[1]) + '</b></div>'; }).join('') + '</div>';
    return A.render({ section: SECTION, docKey: 'work:' + j.id, docLabel: 'أمر شغل', number: j.number, date: fmtDate(today()), billable: false, currency: cc.name, business: business(), client: { name: c.name || '', phone: c.phone || '' }, fields: [{ label: 'المشروع', value: j.title || '' }, { label: 'الموقع', value: j.site || '' }],
      bodyHTML: body || '<p>مفيش بنود</p>', notesHTML: info, totals: { lines: [], total: j.items.length, totalLabel: 'البنود', noSum: true }, netLabel: 'البنود', boxTitle: 'المشروع', money: function (v) { return fq(v); }, noWarranty: true, signs: [] });
  }
  function materialsDocHTML(j) {
    var r = J(j), c = getCust(j.customerId) || {}, A = window.ArzaqiInvoice, cc = cur(), agg = {}, order = [];
    j.items.forEach(function (it, i) { r.items[i].lines.forEach(function (l) { if (!l.final || l.cat === 'work') return; var k = l.name + '|' + l.unit; if (!agg[k]) { agg[k] = { name: l.name, unit: l.unit, cat: l.cat, qty: 0, cost: 0 }; order.push(k); } agg[k].qty += l.final; agg[k].cost += l.costT; }); });
    order.sort(function (a, b) { return Object.keys(K.CATS).indexOf(agg[a].cat) - Object.keys(K.CATS).indexOf(agg[b].cat); });
    var body = '<div class="inv-sec"><span class="n">1</span> قايمة الخامات (للشراء)</div><table class="p-table"><thead><tr><th>م</th><th>الصنف</th><th>التصنيف</th><th>الكمية</th><th>تكلفة الشراء</th></tr></thead><tbody>'
      + (order.map(function (k, i) { var a = agg[k]; return '<tr><td class="idx">' + (i + 1) + '</td><td class="t">' + A.esc(a.name) + '</td><td>' + A.esc(K.CATS[a.cat] || '') + '</td><td>' + fq(C.round(a.qty, 3)) + ' ' + A.esc(a.unit) + '</td><td class="money">' + (a.cost ? money(a.cost) : '—') + '</td></tr>'; }).join('') || '<tr><td colspan="5">مفيش خامات — اضغط «تطبيق على الخامات» في البنود</td></tr>') + '</tbody></table>';
    var tc = C.money(order.reduce(function (s, k) { return s + agg[k].cost; }, 0));
    return A.render({ section: SECTION, docKey: 'materials:' + j.id, docLabel: 'قايمة الخامات', number: j.number, date: fmtDate(today()), billable: false, currency: cc.name + ' (' + cc.sym + ')', business: business(), client: { name: c.name || '', phone: c.phone || '' }, fields: [{ label: 'المشروع', value: j.title || '' }], bodyHTML: body,
      totals: { lines: [], total: tc, totalLabel: 'تكلفة الخامات', noSum: true }, netLabel: 'تكلفة الخامات', boxTitle: 'الخامات', money: money, noWarranty: true, signs: [] });
  }
  function costsDocHTML(j) {
    var r = J(j), c = getCust(j.customerId) || {}, A = window.ArzaqiInvoice, cc = cur();
    var rows = j.items.map(function (it, i) { var x = r.items[i]; return '<tr><td class="idx">' + (i + 1) + '</td><td class="t">' + A.esc(itemTitle(it)) + '<span class="sub-note">' + A.esc(Object.keys(K.CATS).filter(function (k) { return x.costBy[k]; }).map(function (k) { return K.CATS[k] + ' ' + fmt(x.costBy[k]); }).join(' · ') + (x.internal ? ' · داخلي ' + fmt(x.internal) : '')) + '</span></td><td class="money">' + money(x.total) + '</td><td class="money">' + money(x.cost) + '</td><td class="money">' + money(x.profit) + '<span class="sub-note">' + fq(x.margin) + '%</span></td></tr>'; }).join('');
    var body = '<div class="inv-sec"><span class="n">1</span> تكلفة وربح كل بند (داخلي)</div><table class="p-table"><thead><tr><th>م</th><th>البند</th><th>البيع</th><th>التكلفة</th><th>الربح</th></tr></thead><tbody>' + (rows || '<tr><td colspan="5">—</td></tr>') + '</tbody></table>'
      + '<div class="inv-sec"><span class="n">2</span> تكاليف المشروع</div><table class="p-table"><tbody>' + Object.keys(K.CATS).filter(function (k) { return r.catCost[k]; }).map(function (k) { return '<tr><td class="t">' + A.esc(K.CATS[k]) + '</td><td class="money">' + money(r.catCost[k]) + '</td></tr>'; }).join('')
      + C.COST_ORDER.filter(function (t) { return t !== 'mat' && r.byType[t]; }).map(function (t) { return '<tr><td class="t">' + A.esc(C.COST_TYPES[t]) + '</td><td class="money">' + money(r.byType[t]) + '</td></tr>'; }).join('') + (r.wasteCost ? '<tr><td class="t">منها الهالك</td><td class="money">' + money(r.wasteCost) + '</td></tr>' : '') + '</tbody></table>';
    var summary = '<div class="inv-notes"><h4>الربح</h4><div>قيمة المشروع (من غير الضريبة): <b>' + money(r.total - r.tax) + '</b></div><div>إجمالي التكاليف: <b>' + money(r.totalCost) + '</b></div><div>الربح: <b>' + money(r.profit) + '</b> (هامش ' + fq(r.margin) + '%)</div></div>';
    return A.render({ section: SECTION, docKey: 'costs:' + j.id, docLabel: 'كشف التكاليف والربح', number: j.number, date: fmtDate(today()), billable: false, currency: cc.name + ' (' + cc.sym + ')', business: business(), client: { name: c.name || '', phone: c.phone || '' }, fields: [{ label: 'مستند', value: 'داخلي' }], bodyHTML: body, notesHTML: summary,
      totals: { lines: [], total: r.totalCost, totalLabel: 'إجمالي التكاليف', noSum: true }, netLabel: 'إجمالي التكاليف', boxTitle: 'التكاليف', money: money, noWarranty: true, signs: [] });
  }

  // ---------------- الرئيسية والمزيد ----------------
  function renderHome() {
    var due = 0, active = 0, month = 0, ym = today().slice(0, 7);
    db.jobs.forEach(function (j) { if (isOffer(j)) return; var r = J(j); if (r.remaining > 0) due += r.remaining; if (j.status !== 'done') active++; if (String(j.date || '').slice(0, 7) === ym) month += r.total; });
    $('homeDue').textContent = fmt(due); $('homeActive').textContent = active; $('homeCust').textContent = db.customers.length; $('homeMonth').textContent = fmt(month, 0);
    Array.prototype.forEach.call(document.querySelectorAll('.cur'), function (el) { el.textContent = cur().sym; });
    $('catTiles').innerHTML = ['kitchen', 'stairs', 'entrance', 'facade', 'floor', 'bath', 'wall', 'gate', 'decor'].map(function (k) { return kindTile(k); }).join('');
    $('remBadge').textContent = db.remnants.length ? db.remnants.length + ' باقي' : 'ألواح وبواقي';
    $('libBadge').textContent = lib().filter(function (x) { return x.cat === 'mat'; }).length + ' خامة';
    var rec = sortedJobs().slice(0, 4);
    $('homeRecent').innerHTML = rec.length ? rec.map(function (j) { return jobCard(j); }).join('') : '<div class="home-empty">لسه مفيش مشاريع. ابدأ بـ «معاينة ومقاسات» أو افتح أي حاسبة.</div>';
    var h = new Date().getHours();
    $('greetLine').textContent = (h < 12 ? 'صباح الخير' : 'مساء الخير') + ' — الرخام والجرانيت';
  }
  function renderMore() {
    $('currencySelect').value = cur().code; applyTheme();
    $('bizName').value = settings.business.name || ''; $('bizPhone').value = settings.business.phone || '';
    $('bizAddress').value = settings.business.address || ''; $('bizTerms').value = settings.terms || '';
    $('moreLib').textContent = lib().length + ' صنف في المكتبة · ' + edgeTypes().length + ' نوع حافة · ' + finishes().length + ' تشطيب';
    $('moreUnits').innerHTML = units().map(function (u) { var custom = arr(settings.units).indexOf(u) >= 0; return '<span class="chip static">' + esc(u) + (custom ? ' <button type="button" class="chip-x" data-act="delUnit" data-v="' + esc(u) + '">×</button>' : '') + '</span>'; }).join('');
    var tot = 0, cost = 0, due = 0;
    db.jobs.forEach(function (j) { if (isOffer(j)) return; var r = J(j); tot += r.total; cost += r.totalCost; due += Math.max(r.remaining, 0); });
    $('moreStats').innerHTML = row('عدد المشاريع', String(db.jobs.length)) + row('إجمالي المبيعات', money(tot)) + row('التكاليف', money(cost)) + row('المتبقي عند العملاء', money(due));
  }
  // ---------------- العميل: بيانات زيادة وملف كامل ----------------
  function openCustomerSheet(id) {
    var c = id ? getCust(id) : {};
    openSheet(id ? 'تعديل بيانات العميل' : 'عميل جديد',
      '<div class="field"><label for="f_cn">اسم العميل</label><input type="text" id="f_cn" value="' + esc(c.name || '') + '" autocomplete="off"></div>'
      + '<div class="row-2"><div class="field"><label for="f_cp">التليفون</label><input type="text" id="f_cp" inputmode="tel" dir="ltr" value="' + esc(c.phone || '') + '"></div><div class="field"><label for="f_cp2">رقم إضافي</label><input type="text" id="f_cp2" inputmode="tel" dir="ltr" value="' + esc(c.phone2 || '') + '"></div></div>'
      + '<div class="row-2"><div class="field"><label for="f_ca">العنوان</label><input type="text" id="f_ca" value="' + esc(c.address || '') + '"></div><div class="field"><label for="f_car">المنطقة</label><input type="text" id="f_car" value="' + esc(c.area || '') + '"></div></div>'
      + '<div class="field"><label for="f_ct">نوع العميل</label><input type="text" id="f_ct" list="ctypes" value="' + esc(c.ctype || '') + '"><datalist id="ctypes"><option value="فرد"><option value="مقاول"><option value="شركة"><option value="محل"></datalist></div>'
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
    c.name = name; c.phone = $('f_cp').value.trim(); c.phone2 = $('f_cp2').value.trim(); c.address = $('f_ca').value.trim(); c.area = $('f_car').value.trim(); c.ctype = $('f_ct').value.trim(); c.note = $('f_cnote').value.trim(); c.updatedAt = new Date().toISOString();
    saveDb(); closeTop(function () { refresh(); toast('اتحفظ'); if (isNew) openCust(c.id); });
  }
  function renderCust(id) {
    var c = getCust(id); if (!c) return;
    var js = jobsOf(id).sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
    var tot = 0, paid = 0, disc = 0, adds = 0, rets = 0, ev = [];
    js.forEach(function (j) {
      var r = J(j); if (!isOffer(j)) { tot += r.total; disc += r.discount; adds += r.adds; rets += r.returns; } paid += r.paid;
      ev.push([j.createdAt || j.date, (STATUS[j.status] || STATUS.active)[0] + ' ' + (j.number || '') + ' — ' + money(r.total)]);
      j.payments.forEach(function (p) { ev.push([p.date, 'دفعة ' + money(C.num(p.amount)) + (p.method ? ' (' + p.method + ')' : '') + ' — ' + j.number]); });
      arr(j.adjust).forEach(function (a) { ev.push([a.date, (a.type === 'return' ? 'مرتجع ' : 'إضافة ') + money(C.num(a.amount)) + ' — ' + j.number]); });
    });
    ev.sort(function (a, b) { return String(b[0]).localeCompare(String(a[0])); });
    var groups = [['survey', 'المقايسات'], ['quote', 'عروض الأسعار'], ['active', 'الطلبات الجارية (فواتير)'], ['done', 'المسلّمة']];
    var html = '<div class="pg-head"><button type="button" class="icon-btn" data-act="closeTop" aria-label="رجوع">' + ic('back') + '</button>'
      + '<div class="titles"><h2>' + esc(c.name) + '</h2><div class="sub">' + esc([c.ctype, c.phone, c.phone2, c.area].filter(Boolean).join(' · ') || 'عميل') + '</div></div>'
      + '<button type="button" class="icon-btn" data-act="editCust" aria-label="تعديل">' + ic('edit') + '</button></div><div class="container">'
      + '<div class="mini-stats"><div><span>الإجمالي</span><strong>' + esc(money(tot)) + '</strong></div><div><span>المدفوع</span><strong>' + esc(money(paid)) + '</strong></div><div><span>المستحق</span><strong>' + esc(money(tot - paid)) + '</strong></div></div>'
      + ((disc || adds || rets) ? '<p class="hint">خصومات ' + esc(money(disc)) + ' · إضافات ' + esc(money(adds)) + ' · مرتجعات ' + esc(money(rets)) + '</p>' : '')
      + (c.address ? '<div class="note" style="margin-bottom:10px">' + esc(c.address) + '</div>' : '') + (c.note ? '<div class="note" style="margin-bottom:12px">' + esc(c.note) + '</div>' : '')
      + (c.phone ? '<a class="btn btn-ghost" href="tel:' + esc(c.phone) + '" style="margin-bottom:10px">' + ic('phone') + ' اتصال</a>' : '')
      + '<button type="button" class="btn btn-accent" data-act="newJobFor" style="margin-bottom:14px">' + ic('plus') + ' مقايسة / طلب جديد لـ ' + esc(c.name) + '</button>'
      + groups.map(function (g) { var l = js.filter(function (j) { return (j.status || 'active') === g[0]; }); return l.length ? '<div class="section-head"><h3>' + g[1] + ' <span class="count">' + l.length + '</span></h3></div>' + l.map(function (j) { return jobCard(j, 'openJob'); }).join('') : ''; }).join('')
      + (js.length ? '' : '<div class="home-empty">مفيش طلبات للعميل ده</div>')
      + (ev.length ? card('سجل التعاملات', 'history', ev.slice(0, 40).map(function (e) { return '<div class="tl-row"><span>' + esc(fmtDate(e[0])) + '</span><b>' + esc(e[1]) + '</b></div>'; }).join('')) : '')
      + '<div style="margin-top:14px" data-az-crew="' + SECTION + ':' + esc(c.id) + '" data-sec="' + SECTION_NAME + '" data-name="' + esc(c.name) + '" data-phone="' + esc(c.phone || '') + '" data-address="' + esc(c.address || '') + '" data-rev="' + esc(C.money(tot)) + '" data-paid="' + esc(C.money(paid)) + '" data-cur="' + esc(cur().sym) + '"></div>'
      + '<div class="btn-row" style="margin-top:12px"><button type="button" class="btn btn-primary" data-act="statement">' + ic('receipt') + ' كشف حساب PDF</button><button type="button" class="btn btn-danger" data-act="delCust">' + ic('trash') + ' حذف العميل</button></div></div>';
    var el = $('custPage'), st = el.scrollTop; el.innerHTML = html; el.scrollTop = st;
  }
  // ---------------- الدفعات: طريقة الدفع ونوعها والرقم المرجعي ----------------
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
    if (isOffer(job)) job.status = 'active';
    touch(job); saveDb(); closeTop(function () { refresh(); toast('اتسجلت الدفعة'); });
  }

  function custRev(cid) { return C.money(jobsOf(cid).filter(function (j) { return !isOffer(j); }).reduce(function (s, j) { return s + J(j).total; }, 0)); }
  function custPaid(cid) { return C.money(jobsOf(cid).reduce(function (s, j) { return s + J(j).paid; }, 0)); }
  function openJobMenu() {
    openSheet('خيارات المشروع', '<div class="menu-list">'
      + '<button type="button" class="action-item" data-act="editJobInfo"><span class="a-ic">' + ic('edit') + '</span><span>تعديل بيانات المشروع<small>العميل، الاسم، الموقع، التاريخ، التسليم</small></span></button>'
      + '<button type="button" class="action-item" data-act="openCustOfJob"><span class="a-ic">' + ic('users') + '</span><span>صفحة العميل<small>كل مشاريعه وكشف الحساب</small></span></button>'
      + '<button type="button" class="action-item" data-act="dupJob"><span class="a-ic orange">' + ic('copy') + '</span><span>تكرار المشروع<small>مشروع مشابه بنفس البنود والخامات (من غير الدفعات)</small></span></button>'
      + '<button type="button" class="action-item" data-act="delJob"><span class="a-ic" style="background:var(--danger-soft);color:var(--danger)">' + ic('trash') + '</span><span>حذف المشروع<small>بعد التأكيد</small></span></button></div>', {});
  }
  function openJobInfoSheet() {
    var j = getJob(openJobId); if (!j) return;
    var c = getCust(j.customerId) || {};
    openSheet('بيانات المشروع', '<div class="field"><label for="f_cname">العميل</label><input type="text" id="f_cname" autocomplete="off" value="' + esc(c.name || '') + '"><div id="f_csug"></div></div>'
      + '<div class="field"><label for="f_jtitle">اسم المشروع</label><input type="text" id="f_jtitle" value="' + esc(j.title || '') + '"></div>'
      + '<div class="row-2"><div class="field"><label for="f_site">الموقع</label><input type="text" id="f_site" value="' + esc(j.site || '') + '"></div><div class="field"><label for="f_due">موعد التسليم</label><input type="date" id="f_due" value="' + esc(j.due || '') + '"></div></div>'
      + '<div class="row-2"><div class="field"><label for="f_date">التاريخ</label><input type="date" id="f_date" value="' + esc(j.date || today()) + '"></div>'
      + '<div class="field"><label for="f_num">الرقم</label><input type="text" id="f_num" dir="ltr" value="' + esc(j.number || '') + '"></div></div>'
      + '<button type="button" class="btn btn-primary" data-act="saveJobInfo">' + ic('check') + ' حفظ</button>', { jobId: j.id, custId: c.id || null });
    bindCustSuggest();
  }
  function saveJobInfo() {
    var j = getJob(S.jobId); if (!j) return;
    var name = $('f_cname').value.trim(); if (!name) { toast('اكتب اسم العميل'); return; }
    var c = ensureCustomer(name);
    j.customerId = c.id; j.title = $('f_jtitle').value.trim(); j.date = $('f_date').value || j.date; j.number = $('f_num').value.trim() || j.number; j.site = $('f_site').value.trim(); j.due = $('f_due').value;
    touch(j); saveDb(); closeTop(function () { refresh(); toast('اتحفظ'); });
  }
  function dupJob() {
    var j = getJob(openJobId); if (!j) return;
    var c = getCust(j.customerId) || ensureCustomer('عميل');
    var n = newJobRecord(c, (j.title || 'مشروع') + ' (نسخة)', today(), isOffer(j) ? 'quote' : 'active');
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
  function delCust() {
    var c = getCust(openCustId); if (!c) return;
    var n = jobsOf(c.id).length;
    confirmDlg('حذف العميل؟', n ? 'هيتمسح ' + c.name + ' ومعاه ' + n + ' مشروع. مش هينفع ترجّعهم.' : 'هيتمسح ' + c.name + '.', 'أيوه، امسح').then(function (ok) {
      if (!ok) return;
      db.jobs = db.jobs.filter(function (j) { return j.customerId !== c.id; }); db.customers = db.customers.filter(function (x) { return x.id !== c.id; });
      saveDb(); closeTop(function () { refresh(); toast('اتمسح العميل'); });
    });
  }

  // ---------------- اختيار طلب (للدفعة) ----------------
  function openPickJob(purpose, payload) {
    var list = sortedJobs().sort(function (a, b) { return (a.status === 'done') - (b.status === 'done'); });
    if (purpose === 'pay') list = list.filter(function (j) { return J(j).remaining > 0.005; });
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
    var js = jobsOf(cid).filter(function (j) { return !isOffer(j); }).sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); });
    var tot = 0, paid = 0, pays = [];
    var rows = js.map(function (j, i) {
      var r = J(j); tot += r.total; paid += r.paid;
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
    return ({ survey: 'مقايسة', quote: 'عرض سعر', costs: 'كشف التكاليف', materials: 'قايمة الخامات', work: 'أمر شغل', measure: 'كشف المقاسات', invoice: 'فاتورة' }[pv.doc] || 'فاتورة') + ' ' + (j.number || '') + ' — ' + custName(j);
  }
  function openPreview(o) {
    pv = o; renderPreview();
    var m = $('printPreviewModal'); m.style.display = 'block'; m.scrollTop = 0;
    pushLayer({ type: 'preview', hide: function () { m.style.display = 'none'; pv = null; } });
    fitPreview(); if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitPreview); setTimeout(fitPreview, 300);
  }
  function renderPreview() {
    if (!pv) return;
    $('pvDocs').innerHTML = pv.jobId ? [['survey', 'مقايسة'], ['quote', 'عرض سعر'], ['invoice', 'فاتورة'], ['work', 'أمر شغل'], ['measure', 'المقاسات'], ['materials', 'الخامات'], ['costs', 'التكاليف']].map(function (d) { return '<button type="button" data-act="pvDoc" data-doc="' + d[0] + '" class="' + (pv.doc === d[0] ? 'on' : '') + '">' + d[1] + '</button>'; }).join('') : '';
    var pj = getJob(pv.jobId);
    $('printSheet').innerHTML = pv.custId ? statementHTML(pv.custId) : pv.doc === 'costs' ? costsDocHTML(pj) : pv.doc === 'materials' ? materialsDocHTML(pj) : pv.doc === 'work' ? workDocHTML(pj) : pv.doc === 'measure' ? measureDocHTML(pj) : jobDocHTML(pj, pv.doc);
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
  function findJob() { return getJob(openJobId); }
  function addCustom(key, input) { var v = $(input).value.trim(); if (!v) return; settings[key] = arr(settings[key]).concat([v]); saveSettings(); renderTool(); toast('اتضاف'); }
  function delCustom(key, v) { settings[key] = arr(settings[key]).filter(function (x) { return x !== v; }); saveSettings(); renderTool(); }
  function viewPhoto(id, onDel) {
    openSheet('الصورة', '<img class="ph-big" data-media="' + esc(id) + '" alt="">' + (onDel ? '<button type="button" class="btn btn-danger" data-act="photoDel" style="margin-top:12px">' + ic('trash') + ' حذف الصورة</button>' : ''), { photoDel: onDel || null });
    loadImgs($('sheetBody'));
  }
  var ACT = {
    closeTop: function () { closeTop(); },
    view: function (b) { var go = function () { if (b.dataset.filter) jobFilter.f = b.dataset.filter; switchView(b.dataset.view); }; if (stack.length) closeTop(go); else go(); },
    create: function () {
      openSheet('إنشاء جديد', '<div class="create-list"><button type="button" class="create-opt dark" data-act="newSurvey"><span class="q-ic orange">' + ic('ruler') + '</span><span><b>معاينة ومقاسات جديدة</b><small>عميل + الأماكن والقطع + مقايسة</small></span></button>'
        + '<button type="button" class="create-opt" data-act="tool" data-tool="calcs"><span class="q-ic">' + ic('grid') + '</span><span><b>الحاسبات المستقلة</b><small>' + K.TOOLS.length + ' حاسبة من غير مشروع</small></span></button>'
        + '<div class="create-row"><button type="button" class="create-opt" data-act="quickPay"><span class="q-ic green">' + ic('cash') + '</span><span><b>تسجيل دفعة</b><small>من عميل</small></span></button>'
        + '<button type="button" class="create-opt" data-act="tool" data-tool="inventory"><span class="q-ic">' + ic('box') + '</span><span><b>باقي / لوح جزئي</b><small>المخزن</small></span></button></div>'
        + '<button type="button" class="create-opt" data-act="newCustomer"><span class="q-ic">' + ic('users') + '</span><span><b>عميل جديد</b><small>اسم وتليفون وعنوان</small></span></button></div>', {});
    },
    newJob: function () { afterSheet(function () { var go = function () { openNewJobSheet(null, 'active'); }; if (tool) closeTop(go); else go(); }); },
    newSurvey: function () { afterSheet(function () { var go = function () { openNewJobSheet(null, 'survey'); }; if (tool) closeTop(go); else go(); }); },
    newJobFor: function () { openNewJobSheet(openCustId, 'survey'); },
    jobStatus: function (b) { S.status = b.dataset.v; Array.prototype.forEach.call($('f_jst').children, function (x) { x.classList.toggle('on', x === b); }); },
    createJob: createJob,
    quickKind: function (b) { var t = b.dataset.ti != null ? K.TOOLS[+b.dataset.ti] : null; openItem({ kind: b.dataset.kind, preset: t && t[2] ? t[2] : null }); if (b.dataset.kind === 'custom' && b.dataset.title) { E.it['in'].workName = b.dataset.title; renderItemPage(); } },
    pickKind: function (b) { var id = S.jobId, k = b.dataset.kind; closeTop(function () { openItem({ jobId: id, kind: k }); }); },
    addKindPick: function () { openKindPicker(openJobId); },
    addUnit: function () { var u = $('f_newUnit').value.trim(); if (!u) return; settings.units = arr(settings.units).concat([u]); saveSettings(); $('f_newUnit').value = ''; refresh(); toast('اتضافت الوحدة'); },
    delUnit: function (b) { settings.units = arr(settings.units).filter(function (u) { return u !== b.dataset.v; }); saveSettings(); refresh(); },
    quickPay: function () { openPickJob('pay'); },
    pickedJob: function (b) { var id = b.dataset.id, purpose = S.pickFor; closeTop(function () { openJob(id); if (purpose === 'pay') openPaySheet(id); }); },
    pickInvoice: function () { switchView('jobs'); setPick(true); renderJobs(); },
    cancelPick: function () { setPick(false); renderJobs(); },
    pickedInvoice: function (b) { setPick(false); renderJobs(); var j = getJob(b.dataset.id); openPreview({ doc: ({ survey: 'survey', quote: 'quote' }[j && j.status]) || 'invoice', jobId: b.dataset.id }); },
    openJob: function (b) { var id = b.dataset.id; if (tool) closeTop(function () { openJob(id); }); else openJob(id); },
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
    addRow: function (b) { listAt(b.dataset.path).push(clone(ROWDEF[b.dataset.path] || {})); renderItemPage(); },
    delAt: function (b) { listAt(b.dataset.path).splice(+b.dataset.i, 1); renderItemPage(); },
    dupAt: function (b) { var l = listAt(b.dataset.path), x = clone(l[+b.dataset.i]); if (x && x.name) x.name += ' (نسخة)'; if (x) delete x.photo; l.splice(+b.dataset.i + 1, 0, x); renderItemPage(); },
    rowPhoto: function (b) { var p = b.dataset.path; pickPhoto(function (id) { if (!E) return; setPath(E.it, p + '.photo', id); renderItemPage(); toast('اتحفظت الصورة'); }); },
    rowPhotoView: function (b) { var p = b.dataset.path; viewPhoto(b.dataset.media, function () { if (E) { setPath(E.it, p + '.photo', ''); renderItemPage(); } }); },
    addLine: function () { E.it.lines.push({ id: uid('l'), name: '', qty: '1', unit: 'م²', cat: 'mat', cost: '', price: '' }); renderItemPage(); },
    pickLib: function (b) { openLibPick(+b.dataset.i); },
    libPickCat: function (b) { S.cat = b.dataset.v; Array.prototype.forEach.call($('f_lsys').children, function (x) { x.classList.toggle('on', x === b); }); renderLibPick(); },
    libPicked: function (b) { libPicked(b.dataset.id); },
    addLabor: function () { E.it.labor.push({ name: '', method: 'lump', grp: 'mfg', qty: '', price: '' }); renderItemPage(); },
    addIcost: function (b) { E.it.icosts.push({ name: b.dataset.v, grp: /تركيب/.test(b.dataset.v) ? 'install' : 'mfg', amount: '' }); renderItemPage(); },
    addExtra: function (b) { E.it.extras.push({ name: b.dataset.v, amount: '' }); renderItemPage(); },
    applySug: applySug,
    resetItem: function () { confirmDlg('إعادة ضبط الحاسبة؟', 'هتتمسح المدخلات والخامات والمصنعية في الحاسبة دي (المحفوظ قبل كده مش هيتأثر لحد ما تحفظ).', 'أيوه، ابدأ من جديد').then(function (ok) { if (!ok) return; E.it = blankItem(E.it.kind); renderItemPage(); toast('اتعملت إعادة ضبط'); }); },
    toNote: toNote,
    shareItem: function () { shareText(itemTitle(E.it), itemText(E.it)); },
    saveItem: function () { saveItem(); },
    saveInvoice: function () { saveItem(function (jid) { openJob(jid); var j = getJob(jid) || {}; openPreview({ doc: ({ survey: 'survey', quote: 'quote' }[j.status]) || 'invoice', jobId: jid }); }); },
    cutRemnants: function () { var r = C.item(E.it, ctx()).calc; if (!r.plan) return; var x = addRemnants(r.plan, (E.it['in'] || {}).mat, 'تقسيم الألواح'); toast('اتسجل ' + x.added + ' باقي في المخزن' + (x.used ? ' واتشال ' + x.used + ' مستخدم' : '')); renderItemPage(); },
    dupItem: function () { var j = getJob(E.jobId); if (!j) return; var src = j.items.find(function (x) { return x.id === E.itemId; }); if (!src) return; var c = clone(src); c.id = uid('i'); j.items.splice(j.items.indexOf(src) + 1, 0, c); touch(j); saveDb(); closeTop(function () { refresh(); toast('اتكرر'); }); },
    delItem: function () {
      var j = getJob(E.jobId), id = E.itemId; if (!j) return;
      confirmDlg('حذف البند؟', 'هيتمسح «' + itemTitle(E.it) + '» من المشروع.', 'أيوه، امسح').then(function (ok) { if (!ok) return; j.items = j.items.filter(function (x) { return x.id !== id; }); touch(j); saveDb(); closeTop(function () { refresh(); toast('اتمسح'); }); });
    },
    // ---- التكاليف والإضافات ----
    addCost: function (b) { openCostSheet(openJobId, null, b.dataset.type); },
    editCost: function (b) { openCostSheet(openJobId, b.dataset.id); },
    costType: function (b) { readCost(); S.d.type = b.dataset.v; renderCostSheet(); },
    wasteMode: function (b) { readCost(); S.d.mode = b.dataset.v === 'qty' ? '' : b.dataset.v; renderCostSheet(); },
    costName: function (b) { $('f_kname').value = b.dataset.v; },
    costUnit: function (b) { $('f_kunit').value = b.dataset.v; },
    saveCost: saveCost,
    delCost: function () { var j = getJob(S.jobId), id = S.costId; if (!j) return; j.costs = j.costs.filter(function (x) { return x.id !== id; }); touch(j); saveDb(); closeTop(function () { refresh(); toast('اتمسح'); }); },
    addAdj: function (b) { openAdjSheet(b.dataset.v, null); },
    editAdj: function (b) { var j = findJob(), a = j && arr(j.adjust).find(function (x) { return x.id === b.dataset.id; }); if (a) openAdjSheet(a.type, a.id); },
    saveAdj: function () { var j = getJob(S.jobId); if (!j) return; var amt = C.num($('f_aamt').value); if (!amt) { toast('اكتب المبلغ'); return; } j.adjust = arr(j.adjust); var a = S.adjId ? j.adjust.find(function (x) { return x.id === S.adjId; }) : null; if (!a) { a = { id: uid('a'), type: S.adjType }; j.adjust.push(a); } a.name = $('f_aname').value.trim(); a.amount = String(amt); a.date = $('f_adate').value || today(); touch(j); saveDb(); closeTop(function () { refresh(); toast('اتسجل'); }); },
    delAdj: function () { var j = getJob(S.jobId); if (!j) return; j.adjust = arr(j.adjust).filter(function (x) { return x.id !== S.adjId; }); touch(j); saveDb(); closeTop(function () { refresh(); toast('اتمسح'); }); },
    // ---- الحساب ----
    addPay: function () { openPaySheet(openJobId); },
    editPay: function (b) { openPaySheet(openJobId, b.dataset.id); },
    payAll: function (b) { $('f_pamt').value = b.dataset.v; },
    payKind: function (b) { S.kind = S.kind === b.dataset.v ? '' : b.dataset.v; Array.prototype.forEach.call($('f_pkinds').children, function (x) { x.classList.toggle('on', x.dataset.v === S.kind); }); },
    savePay: savePay,
    delPay: function () { var j = getJob(S.jobId), id = S.payId; if (!j) return; j.payments = j.payments.filter(function (x) { return x.id !== id; }); touch(j); saveDb(); closeTop(function () { refresh(); toast('اتمسحت الدفعة'); }); },
    editDisc: function () { openDiscSheet(openJobId); },
    discType: function (b) { S.dtype = b.dataset.v; updateDiscLive(); },
    saveDisc: function () { var j = getJob(S.jobId); if (!j) return; j.discount = { type: S.dtype, value: C.num($('f_dval').value) }; touch(j); saveDb(); closeTop(function () { refresh(); toast('اتحفظ الخصم'); }); },
    editTax: function () { var j = findJob(); if (!j) return; openSheet('الضريبة', '<div class="field"><label for="f_tax">نسبة الضريبة %</label><input type="text" id="f_tax" inputmode="decimal" dir="ltr" value="' + esc(v0(j.tax && j.tax.pct)) + '" placeholder="0 = من غير ضريبة"></div><button type="button" class="btn btn-accent" data-act="saveTax">' + ic('check') + ' حفظ</button>', { jobId: j.id }); },
    saveTax: function () { var j = getJob(S.jobId); if (!j) return; j.tax = { pct: C.num($('f_tax').value) }; touch(j); saveDb(); closeTop(function () { refresh(); toast(j.tax.pct ? 'الضريبة ' + j.tax.pct + '%' : 'من غير ضريبة'); }); },
    setStatus: function (b) { var j = findJob(); if (!j) return; j.status = b.dataset.v; touch(j); saveDb(); refresh(); toast(STATUS[j.status][0]); },
    setStage: function (b) { var j = findJob(); if (!j) return; j.stage = +b.dataset.i; if (/التسليم|التحصيل|إغلاق/.test(stages()[j.stage]) && j.status !== 'done') j.status = 'done'; touch(j); saveDb(); refresh(); toast(stages()[j.stage]); },
    toQuote: function () { var j = findJob(); if (!j) return; j.status = 'quote'; j.stage = Math.max(j.stage || 0, stages().indexOf('المقايسة')); touch(j); saveDb(); refresh(); openPreview({ doc: 'quote', jobId: j.id }); toast('بقت عرض سعر'); },
    toInvoice: function () { var j = findJob(); if (!j) return; j.status = 'active'; j.stage = Math.max(j.stage || 0, stages().indexOf('اعتماد السعر')); touch(j); saveDb(); refresh(); openPreview({ doc: 'invoice', jobId: j.id }); toast('بقت فاتورة'); },
    jobRemnants: function () { var j = findJob(); if (!j) return; var a = 0, u = 0; jobNest(j).forEach(function (p) { if (p.plan) { var x = addRemnants(p.plan, p.matId, j.number); a += x.added; u += x.used; } }); refresh(); toast('اتسجل ' + a + ' باقي' + (u ? ' واتشال ' + u + ' مستخدم' : '')); },
    jobPhoto: function (b) { var j = findJob(); if (!j) return; var kind = b.dataset.v; pickPhoto(function (id) { j.photos = arr(j.photos); j.photos.push({ id: uid('p'), media: id, kind: kind, note: '', date: today() }); touch(j); saveDb(); refresh(); toast('اتحفظت الصورة'); }); },
    jobPhotoOpen: function (b) { var j = findJob(); if (!j) return; var pid = b.dataset.id; viewPhoto(b.dataset.media, function () { var p = arr(j.photos).find(function (x) { return x.id === pid; }); if (p) mediaDel(p.media); j.photos = arr(j.photos).filter(function (x) { return x.id !== pid; }); touch(j); saveDb(); refresh(); }); },
    viewPhoto: function (b) { viewPhoto(b.dataset.media); },
    photoDel: function () { var f = S.photoDel; closeTop(function () { if (f) { f(); toast('اتمسحت الصورة'); } }); },
    scrollProfit: function () { var el = $('profitCard'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); },
    jobMenu: openJobMenu, editJobInfo: openJobInfoSheet, saveJobInfo: saveJobInfo, dupJob: dupJob, delJob: delJob,
    openCustOfJob: function () { var j = findJob(); if (!j || !j.customerId) { toast('المشروع ده من غير عميل — عدّل البيانات وضيف اسم العميل'); return; } closeTop(function () { openCust(j.customerId); }); },
    preview: function (b) { openPreview({ doc: b.dataset.doc, jobId: openJobId }); },
    pvDoc: function (b) { if (!pv) return; pv.doc = b.dataset.doc; renderPreview(); fitPreview(); },
    clearJobFilter: function () { jobFilter.cust = ''; jobFilter.from = ''; jobFilter.to = ''; $('jobFrom').value = ''; $('jobTo').value = ''; renderJobs(); },
    // ---- الأدوات ----
    tool: function (b) { var t = b.dataset.tool; afterSheet(function () { if (tool) { tool = t; renderTool(); } else openTool(t); }); },
    libCat: function (b) { toolState.libCat = b.dataset.v; if (b.dataset.v && b.dataset.v !== 'mat') toolState.libFam = ''; renderTool(); },
    libFam: function (b) { toolState.libFam = b.dataset.v; renderTool(); },
    libNew: function () { openLibSheet(null); },
    libEdit: function (b) { openLibSheet(b.dataset.id); },
    libSave: libSave,
    libCopy: function () { var id = S.srcId; closeTop(function () { openLibSheet(id, true); }); },
    libDel: function () { var id = S.libId; settings.lib = lib().filter(function (x) { return x.id !== id; }); saveSettings(); closeTop(function () { refresh(); toast('اتمسح من المكتبة'); }); },
    sizeAdd: function () { var d = readLib(); d.sizes = arr(d.sizes).concat([{ t: '', L: '', W: '', cost: '', price: '' }]); var keep = S.libId, src = S.srcId; closeTop(function () { openLibSheet(null, false, d); S.libId = keep; S.srcId = src; }); },
    sizeDel: function (b) { var d = readLib(); d.sizes.splice(+b.dataset.i, 1); var keep = S.libId, src = S.srcId; closeTop(function () { openLibSheet(null, false, d); S.libId = keep; S.srcId = src; }); },
    libPhoto: function () { pickPhoto(function (id) { if (S.form !== 'lib') return; var d = readLib(); d.photo = id; var keep = S.libId, src = S.srcId; closeTop(function () { openLibSheet(null, false, d); S.libId = keep; S.srcId = src; toast('اتحفظت الصورة'); }); }); },
    libPhotoDel: function () { var d = readLib(); d.photo = ''; var keep = S.libId, src = S.srcId; closeTop(function () { openLibSheet(null, false, d); S.libId = keep; S.srcId = src; }); },
    invTab: function (b) { toolState.invTab = b.dataset.v; renderTool(); },
    remNew: function () { openRemSheet(null); },
    remEdit: function (b) { openRemSheet(b.dataset.id); },
    remKind: function (b) { S.kind = b.dataset.v; Array.prototype.forEach.call($('f_rkind').children, function (x) { x.classList.toggle('on', x === b); }); },
    remPhoto: function () { pickPhoto(function (id) { if (S.form !== 'rem') return; S.photo = id; $('f_rphoto').innerHTML = thumb(id) + '<span class="hint">اتحفظت — اضغط «حفظ»</span>'; loadImgs($('f_rphoto')); }); },
    remSave: remSave,
    remDel: function () { var id = S.remId; db.remnants = db.remnants.filter(function (x) { return x.id !== id; }); saveDb(); closeTop(function () { refresh(); toast('اتشال من البواقي'); }); },
    workerNew: function () { openWorkerSheet(null); },
    workerOpen: function (b) { toolState.workerId = b.dataset.id; subTool('worker'); },
    workerEdit: function () { openWorkerSheet(toolState.workerId); },
    workerSave: workerSave,
    wlogNew: openWlogSheet,
    wlogKind: function (b) { S.kind = b.dataset.v; Array.prototype.forEach.call($('f_lkinds').children, function (x) { x.classList.toggle('on', x === b); }); var k = WK_RATE[S.kind]; if (k && S.w[k]) $('f_lr').value = S.w[k]; },
    wlogSave: function () { var q = C.num($('f_lq').value), r = C.num($('f_lr').value); if (!q || !r) { toast('اكتب الكمية والسعر'); return; } db.wlog.push({ id: uid('wl'), workerId: toolState.workerId, kind: S.kind, qty: String(q), rate: String(r), amount: String(C.money(q * r)), date: $('f_ld').value || today(), jobId: $('f_lj').value, note: $('f_ln').value.trim() }); saveDb(); closeTop(function () { refresh(); toast('اتسجل'); }); },
    wlogDel: function (b) { confirmDlg('حذف الشغلانة دي؟', '', 'أيوه، امسح').then(function (ok) { if (!ok) return; db.wlog = db.wlog.filter(function (x) { return x.id !== b.dataset.id; }); saveDb(); refresh(); }); },
    wpayNew: function () { openSheet('دفع / سلفة', '<div class="segmented seg-2" id="f_wpt" style="margin-bottom:12px"><button type="button" class="on" data-act="wpayType" data-v="pay">دفع</button><button type="button" data-act="wpayType" data-v="advance">سلفة</button></div><div class="row-2"><div class="field"><label for="f_wpa">المبلغ</label><input type="text" id="f_wpa" inputmode="decimal" dir="ltr"></div><div class="field"><label for="f_wpd">التاريخ</label><input type="date" id="f_wpd" value="' + today() + '"></div></div><div class="field"><label for="f_wpn">ملاحظة</label><input type="text" id="f_wpn"></div><button type="button" class="btn btn-accent" data-act="wpaySave">' + ic('check') + ' حفظ</button>', { type: 'pay' }); },
    wpayType: function (b) { S.type = b.dataset.v; Array.prototype.forEach.call($('f_wpt').children, function (x) { x.classList.toggle('on', x === b); }); },
    wpaySave: function () { var a = C.num($('f_wpa').value); if (!a) { toast('اكتب المبلغ'); return; } db.wpay.push({ id: uid('wp'), workerId: toolState.workerId, type: S.type, amount: String(a), date: $('f_wpd').value || today(), note: $('f_wpn').value.trim() }); saveDb(); closeTop(function () { refresh(); toast('اتسجل'); }); },
    wpayDel: function (b) { confirmDlg('حذف الدفعة دي؟', '', 'أيوه، امسح').then(function (ok) { if (!ok) return; db.wpay = db.wpay.filter(function (x) { return x.id !== b.dataset.id; }); saveDb(); refresh(); }); },
    addMethod: function () { addCustom('laborMethods', 'f_newMethod'); },
    delMethod: function (b) { delCustom('laborMethods', b.dataset.v); },
    delLp: function (b) { delete settings.laborPrices[b.dataset.v]; saveSettings(); renderTool(); },
    addPayMethod: function () { addCustom('payMethods', 'f_newPm'); },
    delPayMethod: function (b) { delCustom('payMethods', b.dataset.v); },
    addEdge: function () { addCustom('edges', 'f_newEdge'); }, delEdge: function (b) { delCustom('edges', b.dataset.v); },
    addCutName: function () { addCustom('cutNames', 'f_newCut'); }, delCutName: function (b) { delCustom('cutNames', b.dataset.v); },
    addFinish: function () { addCustom('finishes', 'f_newFin'); }, delFinish: function (b) { delCustom('finishes', b.dataset.v); },
    stageAdd: function () { settings.stages = stages().concat(['مرحلة جديدة']); saveSettings(); renderTool(); },
    stageDel: function (b) { var s = stages().slice(); s.splice(+b.dataset.i, 1); settings.stages = s; saveSettings(); renderTool(); },
    repPeriod: function (b) { toolState.repPeriod = b.dataset.v; renderTool(); },
    noteOpen: function (b) { var n = db.notes.find(function (x) { return x.id === b.dataset.id; }); if (!n) return; closeTop(function () { openItem({ it: n.it, kind: n.kind }); }); },
    noteShare: function (b) { var n = db.notes.find(function (x) { return x.id === b.dataset.id; }); if (n) shareText(n.title, n.text); },
    noteDel: function (b) { db.notes = db.notes.filter(function (x) { return x.id !== b.dataset.id; }); saveDb(); renderTool(); toast('اتمسح من النوتة'); }
  };
  function openAdjSheet(type, id) {
    var j = findJob(); if (!j) return; var a = id ? arr(j.adjust).find(function (x) { return x.id === id; }) || {} : {};
    openSheet(type === 'return' ? 'استرداد / مرتجع للعميل' : 'إضافة على المشروع', '<div class="field"><label for="f_aname">البيان</label><input type="text" id="f_aname" value="' + esc(v0(a.name)) + '" placeholder="' + (type === 'return' ? 'مثلاً: قطعة اتلغت' : 'مثلاً: عتبة زيادة') + '"></div><div class="row-2"><div class="field"><label for="f_aamt">المبلغ</label><input type="text" id="f_aamt" inputmode="decimal" dir="ltr" value="' + esc(v0(a.amount)) + '"></div><div class="field"><label for="f_adate">التاريخ</label><input type="date" id="f_adate" value="' + esc(a.date || today()) + '"></div></div>'
      + '<button type="button" class="btn btn-accent" data-act="saveAdj">' + ic('check') + ' حفظ</button>' + (id ? '<button type="button" class="btn btn-danger" data-act="delAdj" style="margin-top:10px">' + ic('trash') + ' حذف</button>' : ''), { jobId: j.id, adjType: type, adjId: id || null });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]');
    if (!b || b.disabled) return;
    var f = ACT[b.dataset.act]; if (!f) return;
    if (b.tagName !== 'INPUT') e.preventDefault();
    f(b, e);
  });
  document.addEventListener('click', function (e) { var t = e.target.closest('[data-theme-set]'); if (t) { settings.theme = t.dataset.themeSet; saveSettings(); applyTheme(); } });

  // ---------------- البداية ----------------
  if (history.state && history.state.cw) history.replaceState(null, '');
  applyTheme();
  renderHome();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', function () { navigator.serviceWorker.register('./service-worker.js').catch(function () {}); });
  }
  // للاختبارات: نفس الدوال اللي الواجهة بتستخدمها
  window.MarbleApp = { get db() { return db; }, settings: settings, openJob: openJob, openItem: openItem, openPreview: openPreview, openTool: openTool, calc: C, catalog: K, editor: function () { return E; }, lib: lib, ctx: ctx, mediaGet: mediaGet };

})();
