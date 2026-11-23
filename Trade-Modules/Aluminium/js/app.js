/*
 * أرزقي | Arzoqi — الألوميتال وUPVC (Aluminium & UPVC Workshop): الواجهة.
 * الحسابات في js/calc.js (AluCalc): معادلات قص بيكتبها المستخدم لكل نظام، Cut List Optimizer، الزجاج، الشتر، الواجهات…
 * أنواع الشغل والحاسبات وخاناتها والمكتبة المبدئية في js/catalog.js (AluCatalog).
 * التخزين على الموبايل بس:
 *   halu_db_v1        العملاء والطلبات (المقايسات، عروض الأسعار، الفواتير، الفتحات، الدفعات، الإضافات والمرتجعات، أوامر التشغيل)،
 *                     بواقي القطاعات، العمال وشغلهم ومدفوعاتهم، والنوتة
 *   halu_settings_v1  المظهر، العملة، بيانات الفاتورة، الأنظمة ومعادلاتها، مكتبة الخامات، الوحدات، طرق المصنعية والدفع، المراحل
 * الفاتورة: ArzaqiInvoice (نفس فاتورة كل الأقسام). نوتة العمال: ArzoqiCrew.
 * © 2026 أحمد حسن عبدالله
 */
(function () {
  'use strict';
  var C = window.AluCalc, K = window.AluCatalog;
  var DB_KEY = 'halu_db_v1', SET_KEY = 'halu_settings_v1';
  var SECTION = 'aluminium', SECTION_NAME = 'الألوميتال وUPVC';
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
    j.items.forEach(function (it) { var l = (it['in'] || {}).work || kindLabel(it.kind); if (l && cats.indexOf(l) < 0) cats.push(l); });
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
        return [itemTitle(it), it.notes, kindLabel(it.kind), (it['in'] || {}).room, (it['in'] || {}).color].concat(arr(it.lines).map(function (l) { return l.name; })).join(' ');
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
    var j = normJob({ id: uid('j'), number: 'ALU-' + pad(db.seq), customerId: cust ? cust.id : '', title: title || '', date: date || today(), status: status || 'active', notes: '', costsComplete: false, createdAt: now, updatedAt: now });
    db.jobs.push(j);
    return j;
  }
  function custPickHTML(withTarget) {
    return '<div class="field"><label for="f_cname">اسم العميل</label><input type="text" id="f_cname" autocomplete="off" placeholder="اكتب الاسم أو اختار عميل موجود" value="' + esc(S.custName || '') + '"><div id="f_csug"></div></div>'
      + '<div class="field" style="margin-bottom:' + (withTarget ? '0' : '12px') + '"><label for="f_jtitle">اسم المشروع (اختياري)</label><input type="text" id="f_jtitle" placeholder="مثلاً: تجهيز شقة المعادي" value="' + esc(S.jobTitle || '') + '"></div>'
      + (withTarget ? '<div id="f_target"></div>' : '');
  }
  function openNewJobSheet(cid, status) {
    var c = cid ? getCust(cid) : null;
    openSheet(status === 'active' ? 'طلب جديد' : 'مقايسة جديدة', custPickHTML(false)
      + '<div class="row-2"><div class="field"><label for="f_cphone">التليفون (اختياري)</label><input type="text" id="f_cphone" inputmode="tel" dir="ltr" value="' + esc(c ? c.phone || '' : '') + '"></div>'
      + '<div class="field"><label for="f_date">التاريخ</label><input type="date" id="f_date" value="' + today() + '"></div></div>'
      + '<div class="field"><label>الحالة</label><div class="segmented seg-3" id="f_jst">' + [['survey', 'مقايسة'], ['quote', 'عرض سعر'], ['active', 'طلب معتمد']].map(function (o) { return '<button type="button" class="' + ((status || 'survey') === o[0] ? 'on' : '') + '" data-act="jobStatus" data-v="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div></div>'
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
  // الأنظمة والقطاعات والمكتبة
  // ====================================================================
  var KINDS = K.KINDS, TYPES = C.TYPES;
  var ROW_KEYS = ['rows', 'pieces', 'panels', 'parts'];
  function isOpen(k) { return !!TYPES[k]; }
  function kindLabel(k) { return KINDS[k] ? KINDS[k].label.replace(/^حاسبة /, '') : 'بند'; }
  function itemTitle(it) {
    var i = it['in'] || {};
    if (it.title) return it.title;
    if (isOpen(it.kind)) return [i.work || kindLabel(it.kind), i.no].filter(Boolean).join(' ') + (i.room ? ' — ' + i.room : '');
    if (it.kind === 'custom') return i.workName || 'بند حر';
    return kindLabel(it.kind);
  }
  function lib() {
    if (!Array.isArray(settings.lib)) settings.lib = K.LIB.map(function (x, i) { return { id: 'L' + i, name: x.name, cat: x.cat, mat: x.mat || '', unit: x.unit, code: '', maker: '', system: '', bar: '', weight: '', color: '', thick: '', minArea: '', brand: '', model: '', cost: '', price: '', supplier: '', stock: '', wastePct: '', notes: '' }; });
    return settings.lib;
  }
  function libById(id) { return lib().find(function (x) { return x.id === id; }) || null; }
  function libByName(n) { return lib().find(function (x) { return x.name === n; }) || null; }
  var SEED_ROLES = { alu: { frame: 'قطاع فريم جرار', sash: 'قطاع ضلفة جرار', interlock: 'قطاع إنترلوك', mullion: 'قطاع Mullion', transom: 'قطاع Transom', bead: 'باكتة زجاج', mesh: 'قطاع سلك', threshold: 'قطاع عتب' },
    upvc: { frame: 'UPVC Frame', sash: 'UPVC Sash', mullion: 'UPVC Mullion', transom: 'UPVC Transom', bead: 'UPVC Glazing Bead', mesh: 'UPVC Mosquito', steel: 'حديد داخلي (Reinforcement)', interlock: 'UPVC Sliding Sash' } };
  function newSystem(material, name, estimate) {
    var s = { id: uid('S'), name: name, material: material, maker: '', kerf: '', trim: '', estimate: !!estimate, notes: '', roles: {}, rules: {} };
    Object.keys(TYPES).forEach(function (t) { s.rules[t] = C.template(t, material); });
    if (estimate) Object.keys(SEED_ROLES[material]).forEach(function (r) { var p = libByName(SEED_ROLES[material][r]); if (p) s.roles[r] = p.id; });
    return s;
  }
  function systems() {
    if (!Array.isArray(settings.systems)) settings.systems = [newSystem('alu', 'نظام ألوميتال تقديري', true), newSystem('upvc', 'نظام UPVC تقديري', true)];
    return settings.systems;
  }
  function sysById(id) { return systems().find(function (s) { return s.id === id; }) || null; }
  function ctx() { return { systems: systems(), lib: lib(), remnants: db.remnants, minKeep: settings.minKeep, wlog: db.wlog, kerf: settings.kerf, useRemnants: true }; }
  function J(j) { return C.job(j, ctx()); }
  function units() { return K.UNITS.concat(arr(settings.units)).filter(function (v, i, a) { return v && a.indexOf(v) === i; }); }
  function laborMethods() { return Object.keys(C.LABOR).map(function (k) { return [k, C.LABOR[k]]; }).concat(arr(settings.laborMethods).map(function (m) { return ['x:' + m, m]; })); }
  function lpKey(name, method) { return String(name || '').trim() + '|' + method; }
  function laborPrice(name, method) { var p = (settings.laborPrices || {})[lpKey(name, method)]; return p == null ? '' : p; }
  function payMethods() { return K.PAY_METHODS.concat(arr(settings.payMethods)).filter(function (v, i, a) { return a.indexOf(v) === i; }); }
  function stages() { return arr(settings.stages).length ? settings.stages : K.STAGES; }

  function blankItem(kind, o) {
    o = o || {};
    var d = KINDS[kind] || KINDS.custom;
    var it = { kind: KINDS[kind] ? kind : 'custom', title: o.title || '', notes: '', 'in': clone(d.def || {}), lines: [], labor: [], extras: [], icosts: [], scope: 'full' };
    (d.form || []).forEach(function (f) { if (f.t === 'rows' && ROW_KEYS.indexOf(f.k) >= 0 && !arr(it['in'][f.k]).length) it['in'][f.k] = [clone(f.def || {})]; });
    if (isOpen(kind)) { var mat = o.mat || settings.lastMat || 'alu', s = systems().find(function (x) { return x.id === settings.lastSys && x.material === mat; }) || systems().find(function (x) { return x.material === mat; }); if (s) it['in'].sys = s.id; if (settings.lastUnit) it['in'].unit = settings.lastUnit; }
    it.labor = (d.labor || []).map(function (p) { return { name: p[1], method: p[0], grp: p[2] || 'mfg', qty: '', price: laborPrice(p[1], p[0]) }; });
    return it;
  }

  // ---------------- صفحة الحاسبة / الفتحة ----------------
  var E = null, ROWDEF = {};
  function openItem(opts) {
    var job = opts.jobId ? getJob(opts.jobId) : null;
    var src = job && opts.itemId ? job.items.find(function (x) { return x.id === opts.itemId; }) : null;
    E = { jobId: job ? job.id : null, itemId: src ? src.id : null, it: src ? clone(src) : (opts.it ? clone(opts.it) : blankItem(opts.kind || 'custom', opts)), custName: '', jobTitle: '', custId: null, targetJob: null };
    renderItemPage();
    var el = $('itemPage'); el.classList.add('open'); el.scrollTop = 0;
    pushLayer({ type: 'page', hide: function () { el.classList.remove('open'); E = null; } });
  }
  function SEGP(path, opts) {
    var cur = getPath(E.it, path);
    return '<div class="segmented seg-' + Math.min(opts.length, 4) + ' seg-sm' + (opts.length > 4 ? ' seg-wrap' : '') + '">' + opts.map(function (o) { return '<button type="button" class="' + (String(v0(cur)) === String(o[0]) ? 'on' : '') + '" data-act="setK" data-k="' + path + '" data-v="' + esc(o[0]) + '">' + esc(o[1]) + '</button>'; }).join('') + '</div>';
  }
  function CHIPS(list, path) { return list && list.length ? '<div class="unit-chips">' + list.map(function (v) { return '<button type="button" class="chip" data-act="setK" data-k="' + path + '" data-v="' + esc(v) + '">' + esc(v) + '</button>'; }).join('') + '</div>' : ''; }
  function chipsHTML(list, act, extra) { return list.length ? '<div class="unit-chips">' + list.map(function (v) { return '<button type="button" class="chip" data-act="' + act + '" data-v="' + esc(v) + '"' + (extra || '') + '>' + esc(v) + '</button>'; }).join('') + '</div>' : ''; }
  function card(title, icon, body, extra) { return '<div class="card"' + (extra || '') + '><div class="card-title"><span class="t-ic">' + ic(icon) + '</span><h2>' + esc(title) + '</h2></div>' + body + '</div>'; }
  function inputHTML(p, f, v) { return '<input type="text" data-k="' + p + '"' + (f.t === 'num' ? ' inputmode="decimal" dir="ltr"' : '') + ' placeholder="' + esc(f.ph || '') + '" value="' + esc(v0(v)) + '" autocomplete="off">'; }
  function sysSelect(p, v, otype) {
    var list = systems().filter(function (s) { return !otype || arr((s.rules || {})[otype]).length; });
    return '<select data-k="' + p + '"><option value="">— اختار النظام —</option>' + ['alu', 'upvc'].map(function (m) {
      var l = list.filter(function (s) { return s.material === m; }); return l.length ? '<optgroup label="' + (m === 'alu' ? 'ألوميتال' : 'UPVC') + '">' + l.map(function (s) { return '<option value="' + esc(s.id) + '"' + (s.id === v ? ' selected' : '') + '>' + esc(s.name) + (s.estimate ? ' (تقديري)' : '') + '</option>'; }).join('') + '</optgroup>' : '';
    }).join('') + '</select>';
  }
  function libSelect(p, v, cat) { return '<select data-k="' + p + '"><option value="">—</option>' + lib().filter(function (x) { return x.cat === cat; }).map(function (x) { return '<option value="' + esc(x.id) + '"' + (x.id === v ? ' selected' : '') + '>' + esc(x.name + (x.thick ? ' ' + x.thick + ' مم' : '') + (x.code ? ' · ' + x.code : '')) + '</option>'; }).join('') + '</select>'; }
  function formHTML(fields, base, mini) {
    var out = '', buf = [];
    function flush() { if (buf.length) { out += '<div class="fgrid' + (mini ? ' mini' : '') + '">' + buf.join('') + '</div>'; buf = []; } }
    fields.forEach(function (f) {
      var p = f.k ? base + '.' + f.k : '', v = p ? getPath(E.it, p) : '';
      if (f.t === 'num' || f.t === 'text') { buf.push('<div class="ff"><span class="mini-lbl">' + esc(f.l) + (f.u ? ' <small class="u-lbl">(' + esc(f.u) + ')</small>' : '') + '</span>' + inputHTML(p, f, v) + '</div>'); return; }
      if (f.t === 'lib') { buf.push('<div class="ff"><span class="mini-lbl">' + esc(f.l) + '</span>' + libSelect(p, v, f.cat) + '</div>'); return; }
      flush();
      if (f.t === 'h') out += '<p class="more-h">' + esc(f.l) + '</p>';
      else if (f.t === 'note') out += '<p class="hint">' + esc(f.l) + '</p>';
      else if (f.t === 'check') out += '<label class="check-row"><input type="checkbox" data-k="' + p + '"' + (v ? ' checked' : '') + '> ' + esc(f.l) + '</label>';
      else if (f.t === 'seg') out += '<div class="ff-row"><span class="mini-lbl">' + esc(f.l) + '</span>' + SEGP(p, f.o) + '</div>';
      else if (f.t === 'chips') out += '<div class="ff-row"><span class="mini-lbl">' + esc(f.l) + '</span>' + inputHTML(p, f, v) + CHIPS(f.o, p) + '</div>';
      else if (f.t === 'sys') out += '<div class="ff-row"><span class="mini-lbl">' + esc(f.l) + '</span><div class="row-sys">' + sysSelect(p, v, f.otype) + '<button type="button" class="btn btn-ghost btn-sm" data-act="editSysOf">' + ic('edit') + ' القواعد</button></div></div>';
      else if (f.t === 'rows') {
        ROWDEF[p] = f.def || {};
        var list = arr(v);
        out += '<p class="more-h">' + esc(f.l) + '</p>' + list.map(function (r, i) {
          return '<div class="sub-card"><div class="sc-head"><span class="room-num">' + (i + 1) + '</span><b class="grow">' + esc(r.name || r.label || '') + '</b>'
            + '<button type="button" class="btn btn-ghost btn-icon" data-act="dupAt" data-path="' + p + '" data-i="' + i + '" aria-label="تكرار">' + ic('copy') + '</button>'
            + '<button type="button" class="btn btn-danger btn-icon" data-act="delAt" data-path="' + p + '" data-i="' + i + '" aria-label="حذف">' + ic('x') + '</button></div>'
            + formHTML(f.f, p + '.' + i, true) + '</div>';
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
      return '<div class="sub-card line-card"><div class="sc-head"><input type="text" class="grow" data-k="' + p + '.name" value="' + esc(v0(l.name)) + '" placeholder="القطاع / الزجاج / الإكسسوار">'
        + (l.auto ? '<span class="src-badge' + (l.locked ? ' warn' : '') + '">' + (l.locked ? 'متعدل' : 'محسوب') + '</span>' : '')
        + '<button type="button" class="btn btn-ghost btn-icon" data-act="pickLib" data-i="' + i + '" aria-label="من المكتبة">' + ic('book') + '</button>'
        + '<button type="button" class="btn btn-danger btn-icon" data-act="delAt" data-path="lines" data-i="' + i + '" aria-label="حذف">' + ic('x') + '</button></div>'
        + '<div class="fgrid mini"><div class="ff"><span class="mini-lbl">التصنيف</span><select data-k="' + p + '.cat">' + Object.keys(K.CATS).map(function (c) { return '<option value="' + c + '"' + ((l.cat || 'acc') === c ? ' selected' : '') + '>' + esc(K.CATS[c]) + '</option>'; }).join('') + '</select></div>'
        + '<div class="ff"><span class="mini-lbl">الكمية</span><input type="text" inputmode="decimal" dir="ltr" data-k="' + p + '.qty" value="' + esc(v0(l.qty)) + '"></div><div class="ff"><span class="mini-lbl">الوحدة</span><select data-k="' + p + '.unit">' + unitOptions(l.unit || 'قطعة') + '</select></div>'
        + '<div class="ff"><span class="mini-lbl">سعر الشراء</span><input type="text" inputmode="decimal" dir="ltr" data-k="' + p + '.cost" value="' + esc(v0(l.cost)) + '"></div><div class="ff"><span class="mini-lbl">سعر البيع</span><input type="text" inputmode="decimal" dir="ltr" data-k="' + p + '.price" value="' + esc(v0(l.price)) + '"></div>'
        + '<div class="ff"><span class="mini-lbl">هالك %</span><input type="text" inputmode="decimal" dir="ltr" data-k="' + p + '.wastePct" value="' + esc(v0(l.wastePct)) + '" placeholder="—"></div></div>'
        + '<div class="line-total" data-lt="' + i + '"></div></div>';
    }).join('');
    return card('الخامات (قطاعات، زجاج، إكسسوارات…)', 'box', b + '<div class="btn-row"><button type="button" class="btn btn-ghost btn-sm" data-act="addLine">' + ic('plus') + ' سطر</button><button type="button" class="btn btn-ghost btn-sm" data-act="pickLib" data-i="-1">' + ic('book') + ' من المكتبة</button></div>', ' id="linesCard"');
  }
  function laborHTML() {
    var it = E.it, saved = Object.keys(settings.laborPrices || {}).map(function (k) { return k.split('|')[0]; }).filter(function (v, i, a) { return v && a.indexOf(v) === i; });
    var names = K.LABOR_NAMES.concat(saved).filter(function (v, i, a) { return a.indexOf(v) === i; });
    var b = it.labor.map(function (l, i) {
      var p = 'labor.' + i;
      return '<div class="sub-card"><div class="sc-head"><input type="text" class="grow" data-k="' + p + '.name" list="laborNames" value="' + esc(v0(l.name)) + '" placeholder="تصنيع / تركيب / قص…"><button type="button" class="btn btn-danger btn-icon" data-act="delAt" data-path="labor" data-i="' + i + '">' + ic('x') + '</button></div>'
        + '<div class="fgrid mini"><div class="ff"><span class="mini-lbl">الطريقة</span><select data-k="' + p + '.method">' + laborMethods().map(function (m) { return '<option value="' + esc(m[0]) + '"' + (m[0] === l.method ? ' selected' : '') + '>' + esc(m[1]) + '</option>'; }).join('') + '</select></div>'
        + '<div class="ff"><span class="mini-lbl">النوع</span><select data-k="' + p + '.grp"><option value="mfg"' + (l.grp !== 'install' ? ' selected' : '') + '>تصنيع</option><option value="install"' + (l.grp === 'install' ? ' selected' : '') + '>تركيب</option></select></div>'
        + (l.method === 'lump' ? '' : '<div class="ff"><span class="mini-lbl">' + (l.method === 'daily' ? 'الأيام' : 'الكمية') + '</span><input type="text" inputmode="decimal" dir="ltr" data-k="' + p + '.qty" value="' + esc(v0(l.qty)) + '" placeholder="' + (C.METRIC[l.method] ? 'تلقائي' : '') + '"></div>')
        + (l.method === 'daily' ? '<div class="ff"><span class="mini-lbl">العمال</span><input type="text" inputmode="decimal" dir="ltr" data-k="' + p + '.workers" value="' + esc(v0(l.workers)) + '" placeholder="1"></div>' : '')
        + '<div class="ff"><span class="mini-lbl">' + (l.method === 'lump' ? 'المبلغ' : 'السعر') + '</span><input type="text" inputmode="decimal" dir="ltr" data-k="' + p + '.price" value="' + esc(v0(l.price)) + '"></div></div>'
        + '<div class="line-total" data-la="' + i + '"></div></div>';
    }).join('');
    return card('المصنعية (على العميل)', 'cash', b + '<datalist id="laborNames">' + names.map(function (n) { return '<option value="' + esc(n) + '">'; }).join('') + '</datalist>'
      + '<button type="button" class="btn btn-ghost btn-sm" data-act="addLabor">' + ic('plus') + ' بند مصنعية</button><p class="hint">الكمية لو فاضية بتتحسب لوحدها (م²، م.ط، الشبابيك، الضلف، الأبواب، الأعواد، الكيلو…).</p>');
  }
  function icostsHTML() {
    return card('تكاليف داخلية على البند (مش للعميل)', 'chart', '<div class="rows-ed">' + E.it.icosts.map(function (x, i) {
      return '<div class="task-row cols-3"><input type="text" data-k="icosts.' + i + '.name" value="' + esc(v0(x.name)) + '" placeholder="أجرة قص / تجميع / تركيب"><select data-k="icosts.' + i + '.grp"><option value="mfg"' + (x.grp !== 'install' ? ' selected' : '') + '>تصنيع</option><option value="install"' + (x.grp === 'install' ? ' selected' : '') + '>تركيب</option></select><input type="text" inputmode="decimal" dir="ltr" data-k="icosts.' + i + '.amount" value="' + esc(v0(x.amount)) + '" placeholder="المبلغ"><button type="button" class="btn btn-danger btn-icon" data-act="delAt" data-path="icosts" data-i="' + i + '">' + ic('x') + '</button></div>';
    }).join('') + '</div>' + chipsHTML(['أجرة القص', 'أجرة التجميع', 'تركيب الزجاج', 'تركيب الإكسسوارات', 'التشطيب', 'أجرة التركيب'], 'addIcost') + '<p class="hint">بتتحسب في التكلفة والربح بس.</p>');
  }
  function extrasHTML() {
    return card('إضافات على البند (للعميل)', 'plus', '<div class="rows-ed">' + E.it.extras.map(function (x, i) {
      return '<div class="task-row cols-2"><input type="text" data-k="extras.' + i + '.name" value="' + esc(v0(x.name)) + '" placeholder="الإضافة"><input type="text" inputmode="decimal" dir="ltr" data-k="extras.' + i + '.amount" value="' + esc(v0(x.amount)) + '" placeholder="المبلغ"><button type="button" class="btn btn-danger btn-icon" data-act="delAt" data-path="extras" data-i="' + i + '">' + ic('x') + '</button></div>';
    }).join('') + '</div>' + chipsHTML(['نقل', 'فك القديم', 'سقالة', 'تشطيب إضافي'], 'addExtra'));
  }
  function renderItemPage() {
    var it = E.it, el = $('itemPage'), st = el.scrollTop, d = KINDS[it.kind] || KINDS.custom, job = E.jobId ? getJob(E.jobId) : null;
    ROWDEF = {};
    var head = '<div class="pg-head"><button type="button" class="icon-btn" data-act="closeTop" aria-label="رجوع">' + ic('back') + '</button><div class="titles"><h2>' + esc((E.itemId ? 'تعديل: ' : '') + itemTitle(it)) + '</h2><div class="sub">'
      + esc(job ? custName(job) + ' — ' + (job.title || job.number) : kindLabel(it.kind)) + '</div></div></div>';
    var pick = job ? '' : '<div class="card cust-pick"><div class="field"><label for="f_cname">اسم العميل (اختياري — سيبه فاضي لحساب سريع)</label><input type="text" id="f_cname" autocomplete="off" value="' + esc(E.custName) + '"><div id="f_csug"></div></div>'
      + '<div class="field" style="margin-bottom:0"><label for="f_jtitle">اسم المشروع (اختياري)</label><input type="text" id="f_jtitle" value="' + esc(E.jobTitle) + '" placeholder="مثلاً: شقة المهندسين"></div><div id="f_target"></div></div>';
    var body = card(isOpen(it.kind) ? 'بيانات الفتحة' : 'المدخلات', d.icon || 'grid', '<div class="ff-row"><span class="mini-lbl">اسم البند (اختياري)</span><input type="text" data-k="title" value="' + esc(v0(it.title)) + '" placeholder="' + esc(itemTitle(Object.assign({}, it, { title: '' }))) + '"></div>' + formHTML(d.form || [], 'in'))
      + '<div class="card" id="calcRes"></div><div class="card" id="sugCard"></div>' + linesHTML() + laborHTML() + icostsHTML() + extrasHTML()
      + card('ملاحظات', 'edit', '<textarea data-k="notes" placeholder="بتظهر في المقايسة والفاتورة">' + esc(v0(it.notes)) + '</textarea>') + '<div class="card" id="itRes"></div>'
      + '<div class="btn-row"><button type="button" class="btn btn-ghost" data-act="resetItem">' + ic('history') + ' إعادة ضبط</button><button type="button" class="btn btn-ghost" data-act="toNote">' + ic('note') + ' للنوتة</button></div>'
      + '<div class="btn-row" style="margin-top:10px"><button type="button" class="btn btn-ghost" data-act="shareItem">' + ic('share') + ' مشاركة</button><button type="button" class="btn btn-ghost" data-act="saveInvoice">' + ic('receipt') + ' حفظ وفاتورة</button></div>';
    el.innerHTML = head + '<div class="container">' + pick + body + '</div>'
      + '<div class="pg-foot"><div class="eb-info"><span>الإجمالي للعميل</span><strong id="itTotal">0</strong></div>'
      + (E.itemId ? '<button type="button" class="btn btn-danger btn-icon" data-act="delItem" aria-label="حذف">' + ic('trash') + '</button><button type="button" class="btn btn-ghost btn-icon" data-act="dupItem" aria-label="تكرار">' + ic('copy') + '</button>' : '')
      + '<button type="button" class="btn btn-accent" data-act="saveItem">' + ic('check') + ' حفظ</button></div>';
    el.scrollTop = st;
    if (!job) { bindCustSuggest(); renderTargetJobs(); }
    updateItemLive();
  }
  function resRows(rows) { return rows.map(function (r) { return '<div class="sum-row how"><span>' + esc(r[0]) + (r[2] ? '<small>' + esc(r[2]) + '</small>' : '') + '</span><strong>' + esc(r[1]) + '</strong></div>'; }).join(''); }
  // رسم العود: القطع والسلاح والباقي
  function barSVG(b) {
    var W = 600, H = 26, sc = W / b.len, x = b.trim * sc, g = '';
    b.items.forEach(function (p) { var w = p.len * sc; g += '<rect x="' + x.toFixed(1) + '" y="2" width="' + Math.max(w - 0.5, 0.5).toFixed(1) + '" height="' + (H - 4) + '" class="cut-p"/>' + (w > 34 ? '<text x="' + (x + w / 2).toFixed(1) + '" y="' + (H / 2 + 4) + '" text-anchor="middle">' + fq(p.len) + '</text>' : ''); x += w + (b.kerf / Math.max(b.count, 1)) * sc; });
    if (b.rest > 0) g += '<rect x="' + (W - b.rest * sc).toFixed(1) + '" y="2" width="' + (b.rest * sc).toFixed(1) + '" height="' + (H - 4) + '" class="' + (b.keep ? 'cut-keep' : 'cut-waste') + '"/>';
    return '<svg class="bar-svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none"><rect x="0" y="1" width="' + W + '" height="' + (H - 2) + '" class="cut-bar"/>' + g + '</svg>';
  }
  function planHTML(plan, title) {
    if (!plan || !plan.bars.length) return '';
    return '<p class="more-h">' + esc(title || 'خطة القص') + '</p>' + plan.bars.map(function (b) {
      return '<div class="bar-row"><div class="bar-cap"><b>عود ' + b.no + '</b> · ' + fq(b.len) + ' مم' + (b.src !== 'new' ? ' <span class="src-badge">' + (b.src === 'remnant' ? 'باقي' : 'مخزن') + '</span>' : '') + ' · ' + b.count + ' قطعة: ' + esc(b.items.map(function (p) { return fq(p.len); }).join(' + '))
        + ' · سلاح ' + fq(b.kerf) + ' · ' + (b.keep ? 'باقي يتحفظ ' : 'هالك ') + fq(b.rest) + ' مم</div>' + barSVG(b) + '</div>';
    }).join('');
  }
  function piecesHTML(c) {
    var h = '';
    if (c.pieces && c.pieces.length) h += '<p class="more-h">قايمة القطع (Cut List)</p><table class="mini-table"><thead><tr><th>القطعة</th><th>الطول مم</th><th>العدد</th><th>الزاوية</th></tr></thead><tbody>' + c.pieces.map(function (p) { return '<tr><td>' + esc(p.name) + (p.profile ? '<small>' + esc(p.profile) + '</small>' : '') + '</td><td dir="ltr">' + fq(p.len) + '</td><td>' + p.count + '</td><td>' + p.angle + '°</td></tr>'; }).join('') + '</tbody></table>';
    if (c.glass && c.glass.length) h += '<p class="more-h">الزجاج</p><table class="mini-table"><thead><tr><th>القطعة</th><th>العرض × الارتفاع مم</th><th>العدد</th><th>م²</th></tr></thead><tbody>' + c.glass.map(function (g) { return '<tr><td>' + esc(g.name) + '</td><td dir="ltr">' + fq(g.w) + ' × ' + fq(g.h) + '</td><td>' + g.count + '</td><td>' + fq(g.area) + '</td></tr>'; }).join('') + '</tbody></table>';
    if (c.acc && (c.acc.length || c.gaskets.length)) h += '<p class="more-h">الإكسسوارات والجوانات</p><div class="sum-list">' + c.acc.concat(c.gaskets).map(function (a) { return row(a.name, fq(a.qty) + ' ' + a.unit); }).join('') + '</div>';
    if (c.profiles) c.profiles.forEach(function (g) { if (g.plan) h += planHTML(g.plan, 'خطة قص ' + g.name); });
    if (c.plan) h += planHTML(c.plan) + (c.plan.keep.length || c.plan.fromStock ? '<button type="button" class="btn btn-soft" data-act="cutRemnants" style="margin-top:10px">' + ic('box') + ' سجّل البواقي في المخزن (' + c.plan.keep.length + ')</button>' : '');
    return h;
  }
  function updateItemLive() {
    if (!E || !$('itRes')) return;
    var it = E.it, r = C.item(it, ctx()), c = r.calc;
    $('calcRes').innerHTML = '<div class="card-title"><span class="t-ic orange">' + ic('chart') + '</span><h2>النتيجة وطريقة الحساب</h2></div>'
      + (c.rows.length ? '<div class="sum-list">' + resRows(c.rows) + '</div>' : '<p class="hint">' + (it.kind === 'custom' ? 'ضيف الخامات والمصنعية تحت.' : 'اكتب المدخلات والنتيجة هتظهر هنا.') + '</p>')
      + (c.warn.length ? '<div class="warn-box">' + c.warn.map(esc).join('<br>') + '</div>' : '') + piecesHTML(c);
    var sg = c.sug;
    $('sugCard').innerHTML = '<div class="card-title"><span class="t-ic">' + ic('box') + '</span><h2>الكميات المحسوبة</h2>' + (sg.length ? '<span class="tag">' + sg.length + '</span>' : '') + '</div>'
      + (sg.length ? '<div class="sum-list">' + sg.map(function (s) { var l = it.lines.find(function (x) { return x.auto === s.key; }); return row(s.name + (l ? (l.locked ? ' — متعدل يدوي' : ' ✓') : ''), fq(s.qty) + ' ' + s.unit); }).join('') + '</div>'
        + '<button type="button" class="btn btn-soft" data-act="applySug" style="margin-top:10px">' + ic('check') + ' تطبيق على الخامات</button><p class="hint">الأسعار بتتاخد من المكتبة. الكمية اللي تعدلها بإيدك مش بتتغير تاني.</p>'
        : '<p class="hint">مفيش كميات محسوبة لسه.</p>');
    r.lines.forEach(function (x, i) { var el = document.querySelector('[data-lt="' + i + '"]'); if (el) el.innerHTML = (x.waste ? fq(x.qty) + ' + هالك ' + fq(x.waste) + ' = ' : '') + '<b>' + fq(x.final) + ' ' + esc(x.unit) + '</b>' + (r.supply ? ' · شراء ' + esc(money(x.costT)) + ' · بيع ' + esc(money(x.sellT)) : ''); });
    r.labor.forEach(function (x, i) { var el = document.querySelector('[data-la="' + i + '"]'); if (el) el.innerHTML = x.method === 'lump' ? 'مقطوعية <b>' + esc(money(x.amount)) + '</b>' : fq(x.qty) + (x.auto ? ' (تلقائي)' : '') + (x.method === 'daily' ? ' يوم × ' + fq(x.workers) + ' عامل' : '') + ' × ' + esc(fmt(x.price)) + ' = <b>' + esc(money(x.amount)) + '</b>'; });
    var by = r.costBy, h = '<div class="card-title"><span class="t-ic orange">' + ic('receipt') + '</span><h2>التكلفة والسعر والربح</h2></div><div class="sum-list">';
    if (r.supply) Object.keys(K.CATS).forEach(function (k) { if (by[k]) h += row('تكلفة ' + K.CATS[k], money(by[k])); });
    else h += row('الخامات', 'من العميل (تركيب فقط)');
    if (r.wasteCost) h += row('منها الهالك', money(r.wasteCost));
    if (r.internal) h += row('تكاليف داخلية (تصنيع/تركيب)', money(r.internal));
    h += row('إجمالي التكلفة', money(r.cost), 'bold') + row('الخامات (بيع)', money(r.matSell)) + row('المصنعية', money(r.laborT)) + (r.extrasT ? row('الإضافات', money(r.extrasT)) : '') + row('سعر البيع للعميل', money(r.total), 'bold')
      + '<div class="sum-row profit' + (r.profit < 0 ? ' neg' : '') + '"><span>الربح</span><strong dir="ltr">' + esc(money(r.profit)) + '</strong></div>' + row('هامش الربح', fq(r.margin) + '%')
      + (r.qty > 1 ? row('للقطعة: السعر / الربح', money(r.unitPrice) + ' / ' + money(r.unitProfit)) : '') + '</div>'
      + '<p class="cost-note">الحسابات من قواعد النظام اللي اخترته — راجع خصومات القطاع من كتالوج المورد قبل القص.</p>';
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
  function libPrice(m, unit, per, k) {
    var v = C.num(m[k]); if (!v) return '';
    var bar = C.num(m.bar) / 1000;
    if (unit === 'متر' && m.unit === 'عود' && bar) return String(C.round(v / bar, 2));
    if (unit === 'عود' && m.unit === 'متر' && (per || bar)) return String(C.round(v * (per || bar), 2));
    return String(v);
  }
  function applySug() {
    var it = E.it, c = C.item(it, ctx()).calc, n = 0;
    c.sug.forEach(function (s) {
      var l = it.lines.find(function (x) { return x.auto === s.key; });
      if (l) { if (!l.locked) { l.qty = String(s.qty); l.unit = s.unit; l.per = s.per || ''; } }
      else {
        var m = libMatch(s);
        it.lines.push({ id: uid('l'), auto: s.key, name: m ? m.name : s.name, unit: s.unit, qty: String(s.qty), per: s.per || '', cat: (m && m.cat) || s.cat,
          cost: m ? libPrice(m, s.unit, s.per, 'cost') : '', price: m ? libPrice(m, s.unit, s.per, 'price') : '', wastePct: m ? m.wastePct || '' : '', libId: m ? m.id : '' });
      }
      n++;
    });
    it.lines = it.lines.filter(function (l) { return !l.auto || l.locked || c.sug.some(function (s) { return s.key === l.auto; }); });
    renderItemPage(); toast('اتطبقت ' + n + ' كمية — عدّل براحتك');
  }
  function itemText(it) {
    var r = C.item(it, ctx()), c = r.calc, t = ['أرزقي | Arzoqi — ' + itemTitle(it), ''];
    c.rows.forEach(function (x) { t.push('• ' + x[0] + ': ' + x[1]); });
    if (c.pieces && c.pieces.length) { t.push('', 'قايمة القطع:'); c.pieces.forEach(function (p) { t.push('- ' + p.name + ': ' + fq(p.len) + ' مم × ' + p.count + ' (' + p.angle + '°)'); }); }
    if (c.glass && c.glass.length) { t.push('', 'الزجاج:'); c.glass.forEach(function (g) { t.push('- ' + fq(g.w) + ' × ' + fq(g.h) + ' مم × ' + g.count); }); }
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
    if (isOpen(it.kind)) { var s = sysById((it['in'] || {}).sys); if (s) { settings.lastSys = s.id; settings.lastMat = s.material; } if ((it['in'] || {}).unit) settings.lastUnit = it['in'].unit; }
    touch(job); saveDb(); saveSettings();
    var jid = job.id, edit = !!E.itemId;
    closeTop(function () { refresh(); toast(edit ? 'اتعدل' : 'اتحفظ'); if (then) then(jid); else if (fromHome) openJob(jid); });
  }

  // ---------------- اختيار من المكتبة ----------------
  function openLibPick(lineIdx) {
    openSheet('اختار من المكتبة', '<div class="search-box">' + ic('search') + '<input type="search" id="f_lq" placeholder="دوّر بالاسم أو الكود أو الماركة" autocomplete="off"></div>'
      + '<div class="chips wrap" id="f_lsys"><button type="button" class="chip on" data-act="libPickCat" data-v="">الكل</button>' + Object.keys(K.CATS).map(function (c) { return '<button type="button" class="chip" data-act="libPickCat" data-v="' + c + '">' + esc(K.CATS[c]) + '</button>'; }).join('') + '</div><div id="f_llist"></div>', { form: 'libpick', line: lineIdx, cat: '' });
    renderLibPick(); $('f_lq').addEventListener('input', renderLibPick);
  }
  function renderLibPick() {
    var q = ($('f_lq') ? $('f_lq').value : '').trim(), cat = S.cat;
    var list = lib().filter(function (x) { return (!cat || x.cat === cat) && (!q || [x.name, x.code, x.brand, x.model, x.maker, x.system].join(' ').indexOf(q) >= 0); });
    $('f_llist').innerHTML = list.slice(0, 80).map(function (x) { return '<div class="mat-row" data-act="libPicked" data-id="' + esc(x.id) + '"><div class="m-info"><div class="m-name">' + esc(x.name) + '</div><div class="m-meta">' + esc([x.code, x.maker, K.CATS[x.cat], x.unit, x.bar ? 'عود ' + x.bar + ' مم' : ''].filter(Boolean).join(' · ')) + '</div></div><span class="m-qty">' + (C.num(x.price) ? esc(money(C.num(x.price))) : '—') + '</span></div>'; }).join('') || '<div class="home-empty">مفيش نتايج</div>';
  }
  function libPicked(id) {
    var m = libById(id); if (!m || !E) return;
    var i = S.line, l = i >= 0 ? E.it.lines[i] : null;
    if (!l) { l = { id: uid('l'), qty: '1' }; E.it.lines.push(l); }
    var unit = l.unit && l.auto ? l.unit : m.unit;
    Object.assign(l, { name: m.name, unit: unit, cost: libPrice(m, unit, C.num(l.per), 'cost'), price: libPrice(m, unit, C.num(l.per), 'price'), wastePct: m.wastePct || l.wastePct || '', cat: m.cat, libId: m.id });
    closeTop(function () { renderItemPage(); toast('اتاخد من المكتبة: ' + m.name); });
  }

  // ====================================================================
  // الأدوات: الحاسبات — الأنظمة — المكتبة — المخزن والبواقي — العمال — المصنعية — التقارير — النوتة
  // ====================================================================
  var tool = null, toolState = { libCat: '', libQ: '', sysId: null, sysType: 'sliding', invTab: 'stock', repPeriod: 'all', workerId: null, test: { W: '1500', H: '1200', N: '2', unit: 'mm' } };
  function openTool(name, o) {
    tool = name; if (o) Object.assign(toolState, o); renderTool();
    var el = $('toolPage'); el.classList.add('open'); el.scrollTop = 0;
    pushLayer({ type: 'page', hide: function () { el.classList.remove('open'); tool = null; } });
  }
  // صفحة فرعية جوه الأداة (نظام من قايمة الأنظمة، عامل من قايمة العمال): زرار الرجوع بيرجّع للقايمة
  function subTool(name) {
    var prev = tool; tool = name; renderTool(); $('toolPage').scrollTop = 0;
    pushLayer({ type: 'sub', hide: function () { if (tool === name && $('toolPage').classList.contains('open')) { tool = prev; renderTool(); } } });
  }
  function toolHead(t, s, extra) { return '<div class="pg-head"><button type="button" class="icon-btn" data-act="closeTop" aria-label="رجوع">' + ic('back') + '</button><div class="titles"><h2>' + esc(t) + '</h2><div class="sub">' + esc(s || '') + '</div></div>' + (extra || '') + '</div>'; }
  function renderTool() {
    var el = $('toolPage'), st = el.scrollTop;
    el.innerHTML = tool === 'library' ? libraryHTML() : tool === 'systems' ? systemsHTML() : tool === 'system' ? systemHTML() : tool === 'inventory' ? inventoryHTML() : tool === 'workers' ? workersHTML() : tool === 'worker' ? workerHTML()
      : tool === 'labor' ? laborToolHTML() : tool === 'reports' ? reportsHTML() : tool === 'notes' ? notesHTML() : calcsHTML();
    el.scrollTop = st;
    if (tool === 'library') bindLibSearch();
    if (tool === 'system') updateSysTest();
  }
  function kindTile(k, act, title) { var d = KINDS[k]; return '<button type="button" class="t-tile" data-act="' + (act || 'quickKind') + '" data-kind="' + k + '"' + (title ? ' data-title="' + esc(title) + '"' : '') + '><span class="q-ic orange-soft">' + ic(d.icon) + '</span><b>' + esc(title || kindLabel(k)) + '</b></button>'; }
  function toolTile(t) {
    if (t[0] === 'survey') return '<button type="button" class="t-tile" data-act="newSurvey"><span class="q-ic orange-soft">' + ic('file') + '</span><b>' + esc(t[1]) + '</b></button>';
    if (t[0] === 'project') return '<button type="button" class="t-tile" data-act="newJob"><span class="q-ic orange-soft">' + ic('plus') + '</span><b>' + esc(t[1]) + '</b></button>';
    return kindTile(t[0], 'quickKind', t[1]);
  }
  function calcsHTML() {
    return toolHead('الحاسبات المستقلة', K.TOOLS.length + ' حاسبة — من غير مشروع') + '<div class="container"><div class="type-tiles compact">' + K.TOOLS.map(toolTile).join('') + '</div>'
      + K.GROUPS.map(function (g) { var ks = Object.keys(KINDS).filter(function (k) { return KINDS[k].grp === g[0]; }); return '<p class="more-h">' + esc(g[1]) + '</p><div class="type-tiles compact">' + ks.map(function (k) { return kindTile(k); }).join('') + '</div>'; }).join('') + '</div>';
  }
  // ---- الأنظمة ----
  function systemsHTML() {
    return toolHead('الأنظمة والقطاعات', 'كل نظام بقطاعاته ومعادلات القص بتاعته') + '<div class="container">'
      + '<div class="btn-row" style="margin-bottom:12px"><button type="button" class="btn btn-accent" data-act="sysNew" data-mat="alu">' + ic('plus') + ' نظام ألوميتال</button><button type="button" class="btn btn-soft" data-act="sysNew" data-mat="upvc">' + ic('plus') + ' نظام UPVC</button></div>'
      + '<p class="hint">النظام الجديد بيبدأ بقالب «تقديري» (هيكل القطع والخصومات صفر). عدّل المعادلات من كتالوج القطاع بتاعك — مفيش معادلة بتنفع لكل الشركات.</p>'
      + systems().map(function (s) {
        var n = Object.keys(s.rules || {}).reduce(function (a, t) { return a + arr(s.rules[t]).length; }, 0), mapped = Object.keys(s.roles || {}).filter(function (r) { return s.roles[r]; }).length;
        return '<div class="mat-row" data-act="sysOpen" data-id="' + esc(s.id) + '"><div class="m-info"><div class="m-name">' + esc(s.name) + ' <span class="src-badge">' + (s.material === 'upvc' ? 'UPVC' : 'ألوميتال') + '</span>' + (s.estimate ? ' <span class="src-badge warn">تقديري</span>' : '') + '</div>'
          + '<div class="m-meta">' + esc([s.maker, n + ' قاعدة', mapped + ' قطاع مربوط', s.kerf ? 'سلاح ' + s.kerf + ' مم' : ''].filter(Boolean).join(' · ')) + '</div></div></div>';
      }).join('') + '</div>';
  }
  function sysRuleRow(r, i, p) {
    var kinds = [['profile', 'قطاع'], ['steel', 'حديد'], ['glass', 'زجاج'], ['mesh', 'سلك'], ['acc', 'إكسسوار'], ['gasket', 'جوان/فرشة']];
    var f = function (k, l, ph, ltr) { return '<div class="ff"><span class="mini-lbl">' + l + '</span><input type="text" data-sk="' + p + '.' + k + '"' + (ltr ? ' dir="ltr"' : '') + ' value="' + esc(v0(r[k])) + '" placeholder="' + esc(ph || '') + '"></div>'; };
    var body = '<div class="fgrid mini"><div class="ff"><span class="mini-lbl">النوع</span><select data-sk="' + p + '.kind">' + kinds.map(function (k) { return '<option value="' + k[0] + '"' + (r.kind === k[0] ? ' selected' : '') + '>' + k[1] + '</option>'; }).join('') + '</select></div>' + f('name', 'الاسم');
    if (r.kind === 'profile' || r.kind === 'steel') body += '<div class="ff"><span class="mini-lbl">الدور</span><select data-sk="' + p + '.role">' + Object.keys(C.ROLES).map(function (k) { return '<option value="' + k + '"' + (r.role === k ? ' selected' : '') + '>' + esc(C.ROLES[k]) + '</option>'; }).join('') + '</select></div>' + f('len', 'الطول (مم)', 'W-45', 1) + f('count', 'العدد', '2', 1) + f('angle', 'الزاوية', '45', 1);
    else if (r.kind === 'glass' || r.kind === 'mesh') body += f('w', 'العرض (مم)', 'W/N-70', 1) + f('h', 'الارتفاع (مم)', 'H-90', 1) + f('count', 'العدد', 'N', 1);
    else body += f('qty', 'الكمية' + (r.kind === 'gasket' ? ' (متر)' : ''), r.kind === 'gasket' ? '2*(W+H)/1000' : '2*M', 1) + f('unit', 'الوحدة', 'قطعة');
    body += '</div><label class="check-row"><input type="checkbox" data-sk="' + p + '.ifMesh"' + (r.ifMesh ? ' checked' : '') + '> بس لو الفتحة فيها سلك</label>';
    return '<div class="sub-card rule-card"><div class="sc-head"><span class="room-num">' + (i + 1) + '</span><b class="grow">' + esc(r.name || '') + '</b><button type="button" class="btn btn-ghost btn-icon" data-act="ruleDup" data-i="' + i + '">' + ic('copy') + '</button><button type="button" class="btn btn-danger btn-icon" data-act="ruleDel" data-i="' + i + '">' + ic('x') + '</button></div>' + body + '<div class="line-total" data-rule="' + i + '"></div></div>';
  }
  function systemHTML() {
    var s = sysById(toolState.sysId); if (!s) return toolHead('النظام') + '<div class="container"><div class="home-empty">النظام مش موجود</div></div>';
    var t = toolState.sysType, rules = arr(s.rules[t]), tt = toolState.test;
    var roleRows = Object.keys(C.ROLES).map(function (r) {
      return '<div class="ff"><span class="mini-lbl">' + esc(C.ROLES[r]) + '</span><select data-sk="roles.' + r + '"><option value="">— مش مربوط —</option>' + lib().filter(function (x) { return x.cat === 'profile'; }).map(function (x) { return '<option value="' + esc(x.id) + '"' + ((s.roles || {})[r] === x.id ? ' selected' : '') + '>' + esc(x.name + (x.code ? ' · ' + x.code : '') + (x.bar ? ' · ' + x.bar + ' مم' : '')) + '</option>'; }).join('') + '</select></div>';
    }).join('');
    return toolHead(s.name, (s.material === 'upvc' ? 'UPVC' : 'ألوميتال') + ' — القطاعات ومعادلات القص', '<button type="button" class="icon-btn" data-act="sysMenu" aria-label="خيارات">' + ic('more') + '</button>') + '<div class="container">'
      + card('بيانات النظام', 'profile', '<div class="fgrid"><div class="ff"><span class="mini-lbl">الاسم</span><input type="text" data-sk="name" value="' + esc(s.name) + '"></div><div class="ff"><span class="mini-lbl">الشركة المصنعة</span><input type="text" data-sk="maker" value="' + esc(v0(s.maker)) + '"></div>'
        + '<div class="ff"><span class="mini-lbl">عرض السلاح Kerf (مم)</span><input type="text" inputmode="decimal" dir="ltr" data-sk="kerf" value="' + esc(v0(s.kerf)) + '"></div><div class="ff"><span class="mini-lbl">تهذيب العود (مم)</span><input type="text" inputmode="decimal" dir="ltr" data-sk="trim" value="' + esc(v0(s.trim)) + '"></div></div>'
        + '<label class="check-row"><input type="checkbox" data-sk="estimate"' + (s.estimate ? ' checked' : '') + '> نظام تقديري (الخصومات مش من كتالوج)</label><div class="ff-row"><span class="mini-lbl">ملاحظات</span><input type="text" data-sk="notes" value="' + esc(v0(s.notes)) + '"></div>')
      + card('ربط الأدوار بالقطاعات', 'link', '<p class="hint">كل دور في المعادلات (فريم، ضلفة…) بيتربط بقطاع من المكتبة علشان طول العود والسعر والوزن.</p><div class="fgrid mini">' + roleRows + '</div>')
      + '<div class="card"><div class="card-title"><span class="t-ic orange">' + ic('formula') + '</span><h2>معادلات القص</h2></div>'
      + '<div class="chips wrap" style="margin-bottom:8px">' + Object.keys(TYPES).map(function (k) { return '<button type="button" class="chip' + (k === t ? ' on' : '') + '" data-act="sysType" data-v="' + k + '">' + esc(TYPES[k]) + ' <small>' + arr(s.rules[k]).length + '</small></button>'; }).join('') + '</div>'
      + '<p class="hint">المتغيرات: <b dir="ltr">W</b> العرض و <b dir="ltr">H</b> الارتفاع بالمليمتر، <b dir="ltr">N</b> الأجزاء، <b dir="ltr">M</b> المتحرك، <b dir="ltr">F</b> الثابت، <b dir="ltr">V</b> القوائم، <b dir="ltr">T</b> العرضيات. والعمليات: + − × ÷ وأقواس. مثال: <b dir="ltr">(W-40)/N+25</b></p>'
      + '<div class="sys-test fgrid mini"><div class="ff"><span class="mini-lbl">تجربة: W (مم)</span><input type="text" inputmode="decimal" dir="ltr" data-tk="W" value="' + esc(tt.W) + '"></div><div class="ff"><span class="mini-lbl">H (مم)</span><input type="text" inputmode="decimal" dir="ltr" data-tk="H" value="' + esc(tt.H) + '"></div><div class="ff"><span class="mini-lbl">N</span><input type="text" inputmode="decimal" dir="ltr" data-tk="N" value="' + esc(tt.N) + '"></div></div>'
      + rules.map(function (r, i) { return sysRuleRow(r, i, 'rules.' + t + '.' + i); }).join('')
      + '<div class="btn-row"><button type="button" class="btn btn-ghost btn-sm" data-act="ruleAdd" data-v="profile">' + ic('plus') + ' قطاع</button><button type="button" class="btn btn-ghost btn-sm" data-act="ruleAdd" data-v="glass">' + ic('plus') + ' زجاج</button></div>'
      + '<div class="btn-row" style="margin-top:8px"><button type="button" class="btn btn-ghost btn-sm" data-act="ruleAdd" data-v="acc">' + ic('plus') + ' إكسسوار</button><button type="button" class="btn btn-ghost btn-sm" data-act="ruleAdd" data-v="gasket">' + ic('plus') + ' جوان</button></div>'
      + '<button type="button" class="btn btn-ghost btn-sm" data-act="ruleTpl" style="margin-top:8px">' + ic('history') + ' رجّع القالب التقديري للنوع ده</button></div></div>';
  }
  function updateSysTest() {
    var s = sysById(toolState.sysId); if (!s) return;
    var tt = toolState.test, vars = C.vars({ W: tt.W, H: tt.H, N: tt.N, unit: 'mm' });
    arr(s.rules[toolState.sysType]).forEach(function (r, i) {
      var el = document.querySelector('[data-rule="' + i + '"]'); if (!el) return;
      var ex = function (e, d) { var x = C.expr(e == null || String(e).trim() === '' ? d : e, vars); return x.ok ? fq(C.round(x.value, 1)) : '<span class="neg">' + esc(x.error) + '</span>'; };
      el.innerHTML = r.kind === 'profile' || r.kind === 'steel' ? 'طول ' + ex(r.len) + ' مم × ' + ex(r.count, '1') : r.kind === 'glass' || r.kind === 'mesh' ? ex(r.w) + ' × ' + ex(r.h) + ' مم × ' + ex(r.count, '1') : ex(r.qty, '0') + ' ' + esc(r.unit || '');
    });
  }
  $('toolPage').addEventListener('input', function (e) {
    var el = e.target;
    if (el.dataset.lp != null) { settings.laborPrices[el.dataset.lp] = el.value; saveSettings(); return; }
    if (el.dataset.tk) { toolState.test[el.dataset.tk] = el.value; updateSysTest(); return; }
    if (el.dataset.sk && tool === 'system') { var s = sysById(toolState.sysId); if (!s) return; setPath(s, el.dataset.sk, el.type === 'checkbox' ? el.checked : el.value); saveSettings(); if (el.tagName === 'SELECT' && /\.kind$/.test(el.dataset.sk)) renderTool(); else updateSysTest(); }
  });
  $('toolPage').addEventListener('change', function (e) { var el = e.target; if (el.dataset.sk && tool === 'system' && el.type === 'checkbox') { var s = sysById(toolState.sysId); setPath(s, el.dataset.sk, el.checked); saveSettings(); } });
  // ---- المكتبة ----
  function libraryHTML() {
    var cat = toolState.libCat;
    return toolHead('مكتبة الخامات', lib().length + ' صنف — قطاعات وزجاج وإكسسوارات ومستهلكات') + '<div class="container">'
      + '<button type="button" class="btn btn-accent" data-act="libNew" style="margin-bottom:12px">' + ic('plus') + ' إضافة صنف</button>'
      + '<div class="search-box">' + ic('search') + '<input type="search" id="libQ" placeholder="دوّر بالاسم أو الكود أو الماركة أو المورد" value="' + esc(toolState.libQ) + '" autocomplete="off"></div>'
      + '<div class="filter-chips"><button type="button" class="chip' + (!cat ? ' on' : '') + '" data-act="libCat" data-v="">الكل</button>' + Object.keys(K.CATS).map(function (c) { return '<button type="button" class="chip' + (cat === c ? ' on' : '') + '" data-act="libCat" data-v="' + c + '">' + esc(K.CATS[c]) + '</button>'; }).join('') + '</div><div id="libList"></div></div>';
  }
  function bindLibSearch() { var q = $('libQ'); if (q) q.addEventListener('input', function () { toolState.libQ = q.value; renderLibList(); }); renderLibList(); }
  function renderLibList() {
    var cat = toolState.libCat, q = toolState.libQ.trim();
    var list = lib().filter(function (x) { return (!cat || x.cat === cat) && (!q || [x.name, x.code, x.brand, x.model, x.maker, x.system, x.supplier].join(' ').indexOf(q) >= 0); });
    var by = {}; list.forEach(function (x) { (by[x.cat] = by[x.cat] || []).push(x); });
    $('libList').innerHTML = Object.keys(K.CATS).filter(function (c) { return by[c]; }).map(function (c) {
      return '<p class="more-h">' + esc(K.CATS[c]) + ' <small>' + by[c].length + '</small></p>' + by[c].map(function (x) {
        return '<div class="mat-row" data-act="libEdit" data-id="' + esc(x.id) + '"><div class="m-info"><div class="m-name">' + esc(x.name) + (x.mat ? ' <span class="src-badge">' + (x.mat === 'upvc' ? 'UPVC' : 'ألوميتال') + '</span>' : '') + '</div><div class="m-meta">' + esc([x.code, x.maker || x.brand, x.thick ? x.thick + ' مم' : '', x.bar ? 'عود ' + x.bar + ' مم' : '', x.color, x.unit, C.num(x.stock) ? 'المخزن ' + x.stock : ''].filter(Boolean).join(' · ')) + '</div></div>'
          + '<span class="m-qty">' + (C.num(x.price) ? esc(money(C.num(x.price))) : '—') + (C.num(x.cost) ? '<small>شراء ' + esc(fmt(C.num(x.cost))) + '</small>' : '') + '</span></div>';
      }).join('');
    }).join('') || '<div class="home-empty">مفيش أصناف بالبحث ده</div>';
  }
  var LIB_FIELDS = { all: [['name', 'الاسم'], ['code', 'الكود'], ['brand', 'الماركة'], ['model', 'الموديل'], ['supplier', 'المورد'], ['cost', 'سعر الشراء', 1], ['price', 'سعر البيع', 1], ['stock', 'الكمية في المخزن', 1], ['wastePct', 'هالك %', 1], ['notes', 'ملاحظات']],
    profile: [['maker', 'الشركة المصنعة'], ['system', 'النظام'], ['bar', 'طول العود (مم)', 1], ['weight', 'الوزن كجم/م', 1], ['color', 'اللون'], ['mPrice', 'سعر المتر (اختياري)', 1], ['chambers', 'عدد الغرف (UPVC)', 1], ['spec', 'المواصفات']],
    glass: [['thick', 'السمك (مم)', 1], ['color', 'اللون'], ['minArea', 'أقل مساحة للقطعة (م²)', 1], ['piecePrice', 'سعر القطعة (اختياري)', 1], ['spec', 'المواصفات']], acc: [['spec', 'المواصفات']], gasket: [], cons: [], mesh: [['color', 'اللون']], other: [] };
  function openLibSheet(id, copy) {
    var x = id ? clone(libById(id) || {}) : { cat: toolState.libCat || 'profile', unit: (toolState.libCat || 'profile') === 'profile' ? 'عود' : 'قطعة' };
    if (copy) x.name = (x.name || '') + ' (نسخة)';
    var fields = LIB_FIELDS.all.slice(0, 1).concat(LIB_FIELDS[x.cat] || [], LIB_FIELDS.all.slice(1));
    var f = function (p) { return '<div class="field"><label for="f_l' + p[0] + '">' + p[1] + '</label><input type="text" id="f_l' + p[0] + '"' + (p[2] ? ' inputmode="decimal" dir="ltr"' : '') + ' value="' + esc(v0(x[p[0]])) + '"></div>'; };
    openSheet(id && !copy ? 'تعديل صنف' : 'إضافة صنف', '<div class="row-2"><div class="field"><label for="f_lcat">التصنيف</label><select id="f_lcat">' + Object.keys(K.CATS).map(function (c) { return '<option value="' + c + '"' + (x.cat === c ? ' selected' : '') + '>' + esc(K.CATS[c]) + '</option>'; }).join('') + '</select></div>'
      + '<div class="field"><label for="f_lmat">الخامة</label><select id="f_lmat"><option value="">عام</option><option value="alu"' + (x.mat === 'alu' ? ' selected' : '') + '>ألوميتال</option><option value="upvc"' + (x.mat === 'upvc' ? ' selected' : '') + '>UPVC</option></select></div></div>'
      + '<div class="field"><label for="f_lunit">الوحدة</label><select id="f_lunit">' + unitOptions(x.unit || 'قطعة') + '</select></div>'
      + '<div class="grid-2">' + fields.map(f).join('') + '</div>'
      + '<button type="button" class="btn btn-accent" data-act="libSave">' + ic('check') + ' حفظ</button>'
      + (id && !copy ? '<div class="btn-row" style="margin-top:10px"><button type="button" class="btn btn-ghost" data-act="libCopy">' + ic('copy') + ' نسخ</button><button type="button" class="btn btn-danger" data-act="libDel">' + ic('trash') + ' حذف</button></div>' : ''),
      { form: 'lib', libId: copy ? null : id || null, srcId: id || null, fields: fields.map(function (p) { return p[0]; }) });
    $('f_lcat').addEventListener('change', function () { var cur = S.libId ? libById(S.libId) : null; var d = { cat: this.value }; S.fields.forEach(function (k) { d[k] = $('f_l' + k).value; }); toolState.libCat = this.value; var keepId = S.libId; closeTop(function () { openLibSheet(keepId); if (!keepId) { S.fields.forEach(function (k) { if ($('f_l' + k) && d[k]) $('f_l' + k).value = d[k]; }); } }); });
  }
  function libSave() {
    var name = $('f_lname').value.trim(); if (!name) { toast('اكتب الاسم'); return; }
    var x = S.libId ? libById(S.libId) : null;
    if (!x) { x = { id: uid('L') }; lib().push(x); }
    S.fields.forEach(function (k) { x[k] = $('f_l' + k).value.trim(); });
    x.cat = $('f_lcat').value; x.mat = $('f_lmat').value; x.unit = $('f_lunit').value;
    saveSettings(); closeTop(function () { refresh(); toast('اتحفظ «' + x.name + '»'); });
  }
  // ---- المخزن والبواقي ----
  function inventoryHTML() {
    var tab = toolState.invTab;
    var h = toolHead('المخزن والبواقي', 'الكميات اللي عندك وبواقي القطاعات') + '<div class="container"><div class="segmented seg-2" style="margin-bottom:12px"><button type="button" class="' + (tab === 'stock' ? 'on' : '') + '" data-act="invTab" data-v="stock">المخزن</button><button type="button" class="' + (tab === 'rem' ? 'on' : '') + '" data-act="invTab" data-v="rem">البواقي (' + db.remnants.length + ')</button></div>';
    if (tab === 'rem') {
      h += '<button type="button" class="btn btn-accent" data-act="remNew" style="margin-bottom:12px">' + ic('plus') + ' تسجيل باقي</button><p class="hint">البواقي مش هالك: بتتستخدم في Cut Optimizer وخطط قص المشاريع قبل العود الجديد.</p>'
        + (db.remnants.length ? db.remnants.slice().sort(function (a, b) { return C.num(b.len) - C.num(a.len); }).map(function (r) { var p = libById(r.profId); return '<div class="mat-row" data-act="remEdit" data-id="' + esc(r.id) + '"><div class="m-info"><div class="m-name">' + esc(p ? p.name : r.name || 'قطاع') + ' — ' + fq(C.num(r.len)) + ' مم</div><div class="m-meta">' + esc([r.color, r.place, fmtDate(r.date), r.src].filter(Boolean).join(' · ')) + '</div></div><span class="m-qty">× ' + esc(v0(r.count || 1)) + '</span></div>'; }).join('') : '<div class="home-empty">مفيش بواقي متسجلة</div>');
    } else {
      var list = lib().filter(function (x) { return C.num(x.stock); });
      h += '<p class="hint">الكمية في المخزن بتتكتب من «مكتبة الخامات» لكل صنف (عود، م²، قطعة…).</p>' + (list.length ? list.map(function (x) { return '<div class="mat-row" data-act="libEdit" data-id="' + esc(x.id) + '"><div class="m-info"><div class="m-name">' + esc(x.name) + '</div><div class="m-meta">' + esc(K.CATS[x.cat] || '') + '</div></div><span class="m-qty">' + esc(x.stock + ' ' + x.unit) + '</span></div>'; }).join('') : '<div class="home-empty">مفيش كميات متسجلة — افتح أي صنف في المكتبة واكتب كميته</div>')
        + '<button type="button" class="btn btn-soft" data-act="tool" data-tool="library" style="margin-top:12px">' + ic('book') + ' المكتبة</button>';
    }
    return h + '</div>';
  }
  function openRemSheet(id, pre) {
    var r = id ? clone(db.remnants.find(function (x) { return x.id === id; }) || {}) : (pre || { count: '1', date: today() });
    openSheet(id ? 'تعديل باقي' : 'تسجيل باقي', '<div class="field"><label for="f_rprof">القطاع</label><select id="f_rprof"><option value="">—</option>' + lib().filter(function (x) { return x.cat === 'profile'; }).map(function (x) { return '<option value="' + esc(x.id) + '"' + (r.profId === x.id ? ' selected' : '') + '>' + esc(x.name) + '</option>'; }).join('') + '</select></div>'
      + '<div class="row-2"><div class="field"><label for="f_rlen">الطول (مم)</label><input type="text" id="f_rlen" inputmode="decimal" dir="ltr" value="' + esc(v0(r.len)) + '"></div><div class="field"><label for="f_rcount">العدد</label><input type="text" id="f_rcount" inputmode="decimal" dir="ltr" value="' + esc(v0(r.count)) + '"></div></div>'
      + '<div class="row-2"><div class="field"><label for="f_rcolor">اللون</label><input type="text" id="f_rcolor" value="' + esc(v0(r.color)) + '"></div><div class="field"><label for="f_rplace">مكان التخزين</label><input type="text" id="f_rplace" value="' + esc(v0(r.place)) + '"></div></div>'
      + '<button type="button" class="btn btn-accent" data-act="remSave">' + ic('check') + ' حفظ</button>' + (id ? '<button type="button" class="btn btn-danger" data-act="remDel" style="margin-top:10px">' + ic('trash') + ' استخدمته / حذف</button>' : ''), { form: 'rem', remId: id || null, pre: pre || null });
  }
  function remSave() {
    var len = C.num($('f_rlen').value); if (!len) { toast('اكتب الطول'); return; }
    var r = S.remId ? db.remnants.find(function (x) { return x.id === S.remId; }) : null;
    if (!r) { r = { id: uid('r'), date: today() }; db.remnants.push(r); }
    r.profId = $('f_rprof').value; r.len = String(len); r.count = $('f_rcount').value || '1'; r.color = $('f_rcolor').value.trim(); r.place = $('f_rplace').value.trim();
    saveDb(); closeTop(function () { refresh(); toast('اتسجل الباقي'); });
  }
  function addRemnants(plan, profId, src) {
    var n = 0; plan.bars.forEach(function (b) { if (b.keep) { db.remnants.push({ id: uid('r'), profId: profId || '', len: String(b.rest), count: '1', date: today(), src: src || '' }); n++; } });
    var used = plan.bars.filter(function (b) { return b.src === 'remnant' && b.stockId; }).map(function (b) { return b.stockId; });
    used.forEach(function (id) { var r = db.remnants.find(function (x) { return x.id === id; }); if (!r) return; var c = C.num(r.count) || 1; if (c > 1) r.count = String(c - 1); else db.remnants = db.remnants.filter(function (x) { return x !== r; }); });
    saveDb(); return { added: n, used: used.length };
  }
  // ---- العمال ----
  function workersHTML() {
    return toolHead('العمال والمصنعية', 'الأجور والسلف والمستحقات') + '<div class="container"><button type="button" class="btn btn-accent" data-act="workerNew" style="margin-bottom:12px">' + ic('plus') + ' عامل جديد</button>'
      + (db.workers.length ? db.workers.map(function (w) { var r = C.worker(w, db.wlog, db.wpay); return '<div class="mat-row" data-act="workerOpen" data-id="' + esc(w.id) + '"><div class="m-info"><div class="m-name">' + esc(w.name) + '</div><div class="m-meta">' + esc([w.trade, w.daily ? 'يومية ' + w.daily : '', r.entries + ' شغلانة'].filter(Boolean).join(' · ')) + '</div></div><span class="m-qty">' + esc(money(r.due)) + '<small>مستحق</small></span></div>'; }).join('') : '<div class="home-empty">مفيش عمال لسه</div>') + '</div>';
  }
  var WK = { day: 'يومية', piece: 'بالقطعة', window: 'بالشباك', door: 'بالباب', sash: 'بالضلفة', m: 'بالمتر', m2: 'بالمتر المربع', hour: 'بالساعة', lump: 'مقطوعية' };
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
      + '<div class="grid-2">' + [['daily', 'اليومية'], ['piece', 'سعر القطعة'], ['m', 'سعر المتر'], ['m2', 'سعر المتر المربع'], ['window', 'سعر الشباك'], ['door', 'سعر الباب']].map(function (p) { return '<div class="field"><label for="f_w' + p[0] + '">' + p[1] + '</label><input type="text" id="f_w' + p[0] + '" inputmode="decimal" dir="ltr" value="' + esc(v0(w[p[0]])) + '"></div>'; }).join('') + '</div>'
      + '<div class="field"><label for="f_wph">التليفون</label><input type="text" id="f_wph" dir="ltr" value="' + esc(v0(w.phone)) + '"></div><button type="button" class="btn btn-accent" data-act="workerSave">' + ic('check') + ' حفظ</button>', { form: 'worker', wId: id || null });
  }
  function workerSave() {
    var n = $('f_wn').value.trim(); if (!n) { toast('اكتب الاسم'); return; }
    var w = S.wId ? db.workers.find(function (x) { return x.id === S.wId; }) : null;
    if (!w) { w = { id: uid('w') }; db.workers.push(w); }
    w.name = n; w.trade = $('f_wt').value.trim(); w.phone = $('f_wph').value.trim(); ['daily', 'piece', 'm', 'm2', 'window', 'door'].forEach(function (k) { w[k] = $('f_w' + k).value; });
    saveDb(); var id = w.id, wasList = tool === 'workers'; closeTop(function () { toolState.workerId = id; if (wasList) subTool('worker'); else refresh(); toast('اتحفظ'); });
  }
  function openWlogSheet() {
    var w = db.workers.find(function (x) { return x.id === toolState.workerId; }) || {};
    openSheet('شغل / يومية — ' + (w.name || ''), '<div class="field"><label>الحساب</label><div class="chips wrap" id="f_lkinds">' + Object.keys(WK).map(function (k, i) { return '<button type="button" class="chip' + (i === 0 ? ' on' : '') + '" data-act="wlogKind" data-v="' + k + '">' + WK[k] + '</button>'; }).join('') + '</div></div>'
      + '<div class="row-2"><div class="field"><label for="f_lq">الكمية</label><input type="text" id="f_lq" inputmode="decimal" dir="ltr" value="1"></div><div class="field"><label for="f_lr">السعر</label><input type="text" id="f_lr" inputmode="decimal" dir="ltr" value="' + esc(v0(w.daily)) + '"></div></div>'
      + '<div class="row-2"><div class="field"><label for="f_ld">التاريخ</label><input type="date" id="f_ld" value="' + today() + '"></div><div class="field"><label for="f_lj">المشروع</label><select id="f_lj"><option value="">—</option>' + sortedJobs().filter(function (j) { return j.status !== 'done'; }).map(function (j) { return '<option value="' + esc(j.id) + '">' + esc(custName(j) + ' ' + j.number) + '</option>'; }).join('') + '</select></div></div>'
      + '<div class="field"><label for="f_ln">ملاحظة</label><input type="text" id="f_ln"></div><button type="button" class="btn btn-accent" data-act="wlogSave">' + ic('check') + ' حفظ</button>', { form: 'wlog', kind: 'day', w: w });
  }
  // ---- المصنعية وطرق الدفع والمراحل ----
  function laborToolHTML() {
    var lp = settings.laborPrices || {}, keys = Object.keys(lp);
    var chipList = function (list, custom, del) { return '<div class="chips wrap">' + list.map(function (m) { return '<span class="chip static">' + esc(m) + (custom.indexOf(m) >= 0 ? ' <button type="button" class="chip-x" data-act="' + del + '" data-v="' + esc(m) + '">×</button>' : '') + '</span>'; }).join('') + '</div>'; };
    return toolHead('المصنعية والإعدادات', 'طرق التسعير وطرق الدفع ومراحل الطلب') + '<div class="container">'
      + card('طرق حساب المصنعية', 'cash', chipList(laborMethods().map(function (m) { return m[1]; }), arr(settings.laborMethods), 'delMethod') + '<div class="row-2" style="margin-top:10px"><input type="text" id="f_newMethod" placeholder="طريقة جديدة (مثلاً: بالدور)"><button type="button" class="btn btn-soft" data-act="addMethod">' + ic('plus') + ' إضافة</button></div>')
      + card('أسعار المصنعية المحفوظة', 'book', (keys.length ? keys.map(function (k) { var p = k.split('|'); return '<div class="task-row cols-2"><span class="lp-name">' + esc(p[0]) + '<small>' + esc(C.LABOR[p[1]] || p[1].replace(/^x:/, '')) + '</small></span><input type="text" inputmode="decimal" dir="ltr" data-lp="' + esc(k) + '" value="' + esc(v0(lp[k])) + '"><button type="button" class="btn btn-danger btn-icon" data-act="delLp" data-v="' + esc(k) + '">' + ic('x') + '</button></div>'; }).join('') : '<p class="hint">بيتحفظ هنا أول ما تحفظ بند فيه مصنعية.</p>'))
      + card('طرق الدفع', 'cash', chipList(payMethods(), arr(settings.payMethods), 'delPayMethod') + '<div class="row-2" style="margin-top:10px"><input type="text" id="f_newPm" placeholder="مثلاً: شيك، إنستاباي"><button type="button" class="btn btn-soft" data-act="addPayMethod">' + ic('plus') + ' إضافة</button></div>')
      + card('مراحل الطلب', 'list', '<div class="rows-ed">' + stages().map(function (s, i) { return '<div class="task-row cols-1"><input type="text" data-stage="' + i + '" value="' + esc(s) + '"><button type="button" class="btn btn-danger btn-icon" data-act="stageDel" data-i="' + i + '">' + ic('x') + '</button></div>'; }).join('') + '</div><button type="button" class="btn btn-ghost btn-sm" data-act="stageAdd">' + ic('plus') + ' مرحلة</button>')
      + card('القص', 'cut', '<div class="fgrid"><div class="ff"><span class="mini-lbl">أقل باقي يتحفظ (مم)</span><input type="text" inputmode="decimal" dir="ltr" data-set="minKeep" value="' + esc(v0(settings.minKeep)) + '"></div><div class="ff"><span class="mini-lbl">السلاح الافتراضي (مم)</span><input type="text" inputmode="decimal" dir="ltr" data-set="kerf" value="' + esc(v0(settings.kerf)) + '"></div></div><p class="hint">بيستخدموا في خطط قص المشاريع (والسلاح في النظام نفسه بياخد الأولوية).</p>') + '</div>';
  }
  // ---- التقارير ----
  function inPeriod(d) { var p = toolState.repPeriod, t = today(); if (p === 'all') return true; if (!d) return false; return p === 'month' ? String(d).slice(0, 7) === t.slice(0, 7) : String(d).slice(0, 4) === t.slice(0, 4); }
  function reportsHTML() {
    var t = today(), js = db.jobs.filter(function (j) { return inPeriod(j.date); }), real = js.filter(function (j) { return !isOffer(j); });
    var S1 = { tot: 0, cost: 0, profit: 0, paid: 0, area: 0, win: 0, door: 0, profM: 0, glass: 0, acc: 0, waste: 0, mfg: 0, inst: 0, exp: 0 }, byKind = {}, byCust = {}, due = [], late = [], done = 0, open = 0;
    real.forEach(function (j) {
      var r = J(j); S1.tot += r.total; S1.cost += r.totalCost; S1.profit += r.profit; S1.paid += r.paid; S1.area += r.area; S1.win += r.windows; S1.door += r.doors; S1.waste += r.wasteCost;
      S1.glass += r.catCost.glass || 0; S1.acc += (r.catCost.acc || 0) + (r.catCost.gasket || 0) + (r.catCost.cons || 0); S1.exp += r.byType.expense + r.byType.transport + r.byType.other;
      if (r.remaining > 0.005) due.push([j, r.remaining]);
      if (j.status === 'done') done++; else { open++; if (j.due && j.due < t) late.push(j); }
      var c = byCust[j.customerId || '-'] || (byCust[j.customerId || '-'] = { name: custName(j), total: 0 }); c.total += r.total;
      j.items.forEach(function (it, i) { var x = r.items[i]; S1.profM += C.round((x.calc.profiles || []).reduce(function (s, g) { return s + g.m; }, 0), 3); x.labor.forEach(function (l) { if (l.grp === 'install') S1.inst += l.amount; else S1.mfg += l.amount; }); var k = it.kind === 'custom' ? ((it['in'] || {}).workName || 'بند حر') : ((it['in'] || {}).work || kindLabel(it.kind)); var b = byKind[k] || (byKind[k] = { n: 0, total: 0 }); b.n += x.qty; b.total += x.total; });
    });
    var top = Object.keys(byCust).map(function (k) { return byCust[k]; }).sort(function (a, b) { return b.total - a.total; }).slice(0, 5), kinds = Object.keys(byKind).map(function (k) { return [k, byKind[k]]; }).sort(function (a, b) { return b[1].n - a[1].n; });
    return toolHead('تقارير الورشة', 'الألوميتال وUPVC') + '<div class="container"><div class="segmented seg-3" style="margin-bottom:12px">' + [['month', 'الشهر ده'], ['year', 'السنة دي'], ['all', 'الكل']].map(function (o) { return '<button type="button" class="' + (toolState.repPeriod === o[0] ? 'on' : '') + '" data-act="repPeriod" data-v="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div>'
      + card('الأعمال', 'chart', '<div class="sum-list">' + row('الطلبات', js.length + ' (مقايسات وعروض ' + (js.length - real.length) + ')') + row('مفتوحة / مسلّمة', open + ' / ' + done) + row('الشبابيك / الأبواب', S1.win + ' / ' + S1.door) + row('مساحة التصنيع', fq(C.round(S1.area, 3)) + ' م²')
        + row('القطاعات المستخدمة', fq(C.round(S1.profM, 3)) + ' م') + row('تكلفة الزجاج', money(S1.glass)) + row('تكلفة الإكسسوارات والمستهلكات', money(S1.acc)) + row('الهالك', money(S1.waste)) + '</div>')
      + card('الفلوس', 'cash', '<div class="sum-list">' + row('إجمالي المبيعات', money(S1.tot), 'bold') + row('مصنعية التصنيع', money(S1.mfg)) + row('مصنعية التركيب', money(S1.inst)) + row('المصروفات والنقل', money(S1.exp)) + row('إجمالي التكاليف', money(S1.cost))
        + '<div class="sum-row profit' + (S1.profit < 0 ? ' neg' : '') + '"><span>إجمالي الربح</span><strong dir="ltr">' + esc(money(S1.profit)) + '</strong></div>' + row('المدفوعات', money(S1.paid)) + row('المستحقات', money(S1.tot - S1.paid)) + row('العملاء', String(db.customers.length)) + '</div>')
      + card('أفضل العملاء', 'users', top.length ? '<div class="sum-list">' + top.map(function (c) { return row(c.name, money(c.total)); }).join('') + '</div>' : '<p class="hint">مفيش بيانات</p>')
      + card('أكتر أنواع الشغل', 'grid', kinds.length ? '<div class="sum-list">' + kinds.slice(0, 10).map(function (k) { return row(k[0] + ' (' + k[1].n + ')', money(k[1].total)); }).join('') + '</div>' : '<p class="hint">مفيش بيانات</p>')
      + card('المستحقات (الفواتير)', 'receipt', due.length ? due.sort(function (a, b) { return b[1] - a[1]; }).map(function (d) { return '<div class="mat-row" data-act="openJob" data-id="' + esc(d[0].id) + '"><div class="m-info"><div class="m-name">' + esc(custName(d[0])) + '</div><div class="m-meta">' + esc([d[0].title, d[0].number].filter(Boolean).join(' · ')) + '</div></div><span class="m-qty">' + esc(money(d[1])) + '</span></div>'; }).join('') : '<p class="hint">مفيش فلوس متأخرة</p>')
      + card('الطلبات المتأخرة', 'calendar', late.length ? late.map(function (j) { return '<div class="mat-row" data-act="openJob" data-id="' + esc(j.id) + '"><div class="m-info"><div class="m-name">' + esc(custName(j)) + '</div><div class="m-meta">التسليم ' + esc(fmtDate(j.due)) + ' · ' + esc(stages()[j.stage || 0] || '') + '</div></div></div>'; }).join('') : '<p class="hint">مفيش طلبات متأخرة (حدد موعد التسليم من بيانات المشروع).</p>') + '</div>';
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
  // صفحة المشروع / الطلب
  // ====================================================================
  function itemMeta(it, x) {
    var i = it['in'] || {}, s = sysById(i.sys), b = [];
    if (isOpen(it.kind)) { var v = C.vars(i); b.push(fq(v.W) + '×' + fq(v.H) + ' مم'); if (x.qty > 1) b.push('× ' + x.qty); if (s) b.push(s.name); b.push(v.N + ' ضلفة'); }
    else b.push(kindLabel(it.kind));
    if (x.scope === 'install' || it.scope === 'install') b.push('تركيب فقط');
    if (x.calc.warn.length) b.push('⚠ ' + x.calc.warn.length);
    return b.join(' · ');
  }
  function costRowHTML(c, x) {
    var meta = c.mode === 'pct' ? fq(x.pct) + '% من الخامات ' + fmt(x.base) : c.mode === 'amount' ? 'مبلغ' : fq(x.qty) + ' ' + (c.unit || '') + ' × ' + fmt(x.price);
    return '<div class="mat-row" data-act="editCost" data-id="' + esc(c.id) + '"><div class="m-info"><div class="m-name">' + esc(c.name || C.COST_TYPES[c.type]) + ' <span class="src-badge">' + (c.billed ? 'على العميل' : 'عليك') + '</span></div><div class="m-meta">' + esc(meta) + '</div></div><span class="m-qty">' + esc(money(x.total)) + '</span></div>';
  }
  function renderJob(id) {
    var j = getJob(id); if (!j) return;
    var c = getCust(j.customerId) || null, r = J(j), st = stages(), si = Math.min(j.stage || 0, st.length - 1);
    var items = j.items.map(function (it, i) {
      var x = r.items[i];
      return '<div class="item-card" data-act="editItem" data-id="' + esc(it.id) + '"><span class="room-num">' + (i + 1) + '</span><div class="i-info"><div class="i-name">' + esc(itemTitle(it)) + '</div><div class="i-meta">' + esc(itemMeta(it, x)) + '</div></div>'
        + '<div class="i-amt">' + esc(money(x.total)) + '<small>ربح ' + esc(fmt(x.profit)) + '</small></div></div>';
    }).join('');
    var costs = C.COST_ORDER.map(function (t) { var list = j.costs.map(function (k, i) { return [k, r.costs[i]]; }).filter(function (p) { return p[1].type === t; }); return list.length ? '<p class="more-h">' + esc(C.COST_TYPES[t]) + '</p>' + list.map(function (p) { return costRowHTML(p[0], p[1]); }).join('') : ''; }).join('');
    var pays = j.payments.slice().sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); }).map(function (p) {
      return '<div class="entry pay-row" data-act="editPay" data-id="' + esc(p.id) + '"><span class="e-ic">' + ic('cash') + '</span><div class="e-info"><div class="e-title">' + esc(p.kind || p.note || 'دفعة') + '</div><div class="e-meta">' + esc([fmtDate(p.date), p.method, p.ref ? '#' + p.ref : '', p.kind && p.note ? p.note : ''].filter(Boolean).join(' · ')) + '</div></div><span class="e-amt">' + esc(money(p.amount)) + '</span></div>';
    }).join('');
    var adj = arr(j.adjust).map(function (a) { return '<div class="mat-row" data-act="editAdj" data-id="' + esc(a.id) + '"><div class="m-info"><div class="m-name">' + esc(a.name || (a.type === 'return' ? 'مرتجع' : 'إضافة')) + ' <span class="src-badge' + (a.type === 'return' ? ' warn' : '') + '">' + (a.type === 'return' ? 'مرتجع' : 'إضافة') + '</span></div><div class="m-meta">' + esc(fmtDate(a.date)) + '</div></div><span class="m-qty">' + (a.type === 'return' ? '- ' : '+ ') + esc(money(C.num(a.amount))) + '</span></div>'; }).join('');
    var late = j.due && j.due < today() && j.status !== 'done';
    var plan = C.jobCut(j, ctx()), planBars = plan.reduce(function (s, p) { return s + (p.plan ? p.plan.count : 0); }, 0);
    var disc = C.num(j.discount && j.discount.value) && j.discount.type === 'percent' ? ' (' + fq(j.discount.value) + '%)' : '';
    var html = '<div class="pg-head"><button type="button" class="icon-btn" data-act="closeTop" aria-label="رجوع">' + ic('back') + '</button>'
      + '<div class="titles"><h2>' + esc(c ? c.name : 'حساب سريع') + '</h2><div class="sub">' + esc([j.title, j.number, fmtDate(j.date), j.site].filter(Boolean).join(' · ')) + '</div></div>'
      + '<button type="button" class="icon-btn" data-act="jobMenu" aria-label="خيارات">' + ic('more') + '</button></div><div class="container">'
      + '<section class="home-sum"><div class="hs-label">' + (isOffer(j) ? 'قيمة ' + STATUS[j.status][0] : 'إجمالي الطلب') + '</div><div class="hs-value">' + esc(fmt(r.total)) + ' <small>' + esc(cur().sym) + '</small></div>'
      + '<div class="hs-stats"><button type="button" data-act="addPay"><span>المدفوع</span><strong>' + esc(fmt(r.paid)) + '</strong></button><button type="button" data-act="addPay"><span>المتبقي</span><strong>' + esc(fmt(r.remaining)) + '</strong></button>'
      + '<button type="button" class="mat" data-act="scrollProfit"><span>الربح</span><strong dir="ltr">' + esc(fmt(r.profit)) + '</strong></button></div></section>'
      + '<div class="status-row" style="margin:-4px 2px 10px">' + ['survey', 'quote', 'active', 'done'].map(function (s) { return '<button type="button" class="chip' + ((j.status || 'active') === s ? ' on' : '') + '" data-act="setStatus" data-v="' + s + '">' + STATUS[s][0] + '</button>'; }).join('')
      + (j.due ? '<span class="src-badge' + (late ? ' warn' : '') + '">التسليم ' + esc(fmtDate(j.due)) + (late ? ' — متأخر' : '') + '</span>' : '') + '</div>'
      + (j.status === 'survey' ? '<button type="button" class="btn btn-soft" data-act="toQuote" style="margin-bottom:10px">' + ic('file') + ' اعتمد المقايسة وحوّلها لعرض سعر</button>' : isOffer(j) ? '<button type="button" class="btn btn-soft" data-act="toInvoice" style="margin-bottom:10px">' + ic('receipt') + ' العميل وافق — حوّل لفاتورة</button>' : '')
      + '<div class="card"><div class="card-title"><span class="t-ic">' + ic('list') + '</span><h2>مرحلة الطلب</h2><span class="tag">' + (si + 1) + '/' + st.length + '</span></div><div class="stages">' + st.map(function (s, i) { return '<button type="button" class="stage' + (i < si ? ' done' : i === si ? ' on' : '') + '" data-act="setStage" data-i="' + i + '">' + esc(s) + '</button>'; }).join('') + '</div></div>'
      + '<div class="card"><div class="card-title"><span class="t-ic orange">' + ic('sliding') + '</span><h2>الفتحات والبنود</h2>' + (j.items.length ? '<span class="tag">' + j.items.length + '</span>' : '') + '</div>'
      + (r.area ? '<p class="hint" style="margin-top:-4px">المساحة ' + fq(r.area) + ' م² · ' + r.windows + ' شباك · ' + r.doors + ' باب</p>' : '')
      + (items || '<p class="card-empty">سجّل أول فتحة (شباك، باب، واجهة…):</p>') + '<button type="button" class="btn btn-soft" data-act="addSystem">' + ic('plus') + ' فتحة / بند</button></div>'
      + '<div class="card"><div class="card-title"><span class="t-ic">' + ic('cut') + '</span><h2>خطة القص للطلب</h2></div>' + (plan.length ? '<div class="sum-list">' + plan.map(function (p) { return row(p.name, p.plan ? p.plan.count + ' عود · هالك ' + p.plan.wastePct + '%' + (p.plan.fromStock ? ' · ' + p.plan.fromStock + ' من البواقي' : '') : 'محتاج طول العود'); }).join('') + '</div>'
        + '<div class="btn-row" style="margin-top:10px"><button type="button" class="btn btn-ghost btn-sm" data-act="preview" data-doc="work">' + ic('cut') + ' أمر التشغيل وخطة القص</button><button type="button" class="btn btn-ghost btn-sm" data-act="jobRemnants"' + (planBars ? '' : ' disabled') + '>' + ic('box') + ' سجّل البواقي في المخزن</button></div>' : '<p class="card-empty">الخطة بتطلع من الفتحات المحسوبة.</p>') + '</div>'
      + '<div class="card" id="costCard"><div class="card-title"><span class="t-ic">' + ic('box') + '</span><h2>النقل والتركيب والمصروفات</h2></div>'
      + '<div class="chips wrap" style="margin-bottom:6px">' + C.COST_ORDER.map(function (t) { return '<button type="button" class="chip" data-act="addCost" data-type="' + t + '">+ ' + esc(C.COST_TYPES[t]) + '</button>'; }).join('') + '</div>'
      + (costs || '<p class="card-empty">اختياري — نقل، تركيب، يوميات، مصروفات موقع، هالك… على العميل أو تكلفة عليك.</p>') + (r.workers ? row('أجور العمال (من سجل العمال)', money(r.workers)) : '') + '</div>'
      + '<div class="card"><div class="card-title"><span class="t-ic">' + ic('history') + '</span><h2>إضافات ومرتجعات</h2></div>' + (adj || '<p class="card-empty">أي إضافة على الطلب أو مرتجع للعميل.</p>') + '<div class="btn-row"><button type="button" class="btn btn-ghost btn-sm" data-act="addAdj" data-v="add">' + ic('plus') + ' إضافة</button><button type="button" class="btn btn-ghost btn-sm" data-act="addAdj" data-v="return">' + ic('history') + ' مرتجع</button></div></div>'
      + '<div class="card"><div class="card-title"><span class="t-ic">' + ic('receipt') + '</span><h2>حساب العميل</h2></div><div class="sum-list">'
      + row('الخامات', money(r.matSell)) + row('المصنعية', money(r.labor)) + (r.extras ? row('إضافات على البنود', money(r.extras)) : '') + (r.billedCosts ? row('مصاريف على العميل', money(r.billedCosts)) : '') + (r.adds ? row('إضافات', money(r.adds)) : '') + (r.returns ? row('مرتجعات', '- ' + money(r.returns)) : '')
      + '<div class="sum-row minus"><span>الخصم' + esc(disc) + ' <button type="button" class="edit-link" data-act="editDisc">' + (r.discount ? 'تعديل' : 'إضافة خصم') + '</button></span><strong>' + (r.discount ? '- ' : '') + esc(money(r.discount)) + '</strong></div>'
      + '<div class="sum-row"><span>الضريبة' + (r.taxPct ? ' ' + fq(r.taxPct) + '%' : '') + ' <button type="button" class="edit-link" data-act="editTax">' + (r.taxPct ? 'تعديل' : 'تفعيل') + '</button></span><strong>' + esc(money(r.tax)) + '</strong></div>'
      + row('الإجمالي', money(r.total), 'bold') + row('المدفوع', money(r.paid)) + '</div>'
      + '<div class="sum-total"><span>' + (r.remaining < -0.005 ? 'زيادة للعميل' : 'المتبقي على العميل') + '</span><strong>' + esc(money(Math.abs(r.remaining))) + '</strong></div>'
      + (pays ? '<div style="margin-top:10px">' + pays + '</div>' : '') + '<button type="button" class="btn btn-ghost" data-act="addPay" style="margin-top:10px">' + ic('cash') + ' تسجيل دفعة</button></div>'
      + '<div class="card" id="profitCard"><div class="card-title"><span class="t-ic orange">' + ic('chart') + '</span><h2>تكلفة وربح الطلب</h2></div><div class="sum-list">'
      + Object.keys(K.CATS).filter(function (k) { return r.catCost[k]; }).map(function (k) { return row('تكلفة ' + K.CATS[k], money(r.catCost[k])); }).join('')
      + C.COST_ORDER.filter(function (t) { return t !== 'mat' && r.byType[t]; }).map(function (t) { return row(C.COST_TYPES[t], money(r.byType[t])); }).join('')
      + (r.wasteCost ? row('منها هالك', money(r.wasteCost)) : '') + row('إجمالي التكلفة', money(r.totalCost), 'bold') + row('قيمة الطلب' + (r.tax ? ' (من غير الضريبة)' : ''), money(r.total - r.tax))
      + '<div class="sum-row profit' + (r.profit < 0 ? ' neg' : '') + '"><span>الربح</span><strong dir="ltr">' + esc(money(r.profit)) + '</strong></div>' + row('هامش الربح', fq(r.margin) + '%') + '</div>'
      + '<p class="cost-note">سعر شراء الخامات والتكاليف الداخلية وأجور العمال بتتحسب تكلفة، ومصنعيتك مش تكلفة. مش بيظهر للعميل.</p></div>'
      + '<div class="card"><div class="card-title"><span class="t-ic">' + ic('cut') + '</span><h2>أمر التشغيل</h2></div><div class="fgrid">'
      + '<div class="ff"><span class="mini-lbl">بدء التصنيع</span><input type="date" data-jk="woStart" value="' + esc(v0(j.woStart)) + '"></div><div class="ff"><span class="mini-lbl">موعد التسليم</span><input type="date" data-jk="due" value="' + esc(v0(j.due)) + '"></div>'
      + '<div class="ff"><span class="mini-lbl">الفني المسؤول</span><input type="text" data-jk="tech" list="techList" value="' + esc(v0(j.tech)) + '"><datalist id="techList">' + db.workers.map(function (w) { return '<option value="' + esc(w.name) + '">'; }).join('') + '</datalist></div><div class="ff"><span class="mini-lbl">مدة التنفيذ</span><input type="text" data-jk="duration" value="' + esc(v0(j.duration)) + '" placeholder="15 يوم"></div></div>'
      + '<div class="ff-row"><span class="mini-lbl">تعليمات التصنيع والتركيب</span><textarea data-jk="woNotes">' + esc(v0(j.woNotes)) + '</textarea></div>'
      + '<div class="ff-row"><span class="mini-lbl">شروط الدفع (في المقايسة وعرض السعر)</span><input type="text" data-jk="payTerms" value="' + esc(v0(j.payTerms)) + '" placeholder="50% مقدم والباقي عند التسليم"></div><div class="ff-row"><span class="mini-lbl">صلاحية عرض السعر</span><input type="text" data-jk="validity" value="' + esc(v0(j.validity)) + '" placeholder="15 يوم"></div></div>'
      + (c ? '<div data-az-crew="' + SECTION + ':' + esc(j.customerId) + '" data-sec="' + SECTION_NAME + '" data-name="' + esc(c.name || '') + '" data-phone="' + esc(c.phone || '') + '" data-address="' + esc(c.address || '') + '" data-rev="' + esc(custRev(j.customerId)) + '" data-paid="' + esc(custPaid(j.customerId)) + '" data-cur="' + esc(cur().sym) + '"></div>' : '')
      + '<div class="card"><div class="card-title"><span class="t-ic">' + ic('edit') + '</span><h2>ملاحظات</h2></div><textarea id="jobNotes" placeholder="بتظهر في المقايسة والفاتورة">' + esc(j.notes || '') + '</textarea></div>'
      + '<div class="doc-grid">' + [['survey', 'file', 'المقايسة'], ['quote', 'file', 'عرض السعر'], ['invoice', 'receipt', 'الفاتورة'], ['work', 'cut', 'أمر التشغيل'], ['measure', 'area', 'كشف المقاسات'], ['materials', 'box', 'قايمة الخامات'], ['costs', 'chart', 'التكاليف (داخلي)']].map(function (d) { return '<button type="button" class="btn btn-ghost" data-act="preview" data-doc="' + d[0] + '">' + ic(d[1]) + ' ' + d[2] + '</button>'; }).join('') + '</div>'
      + '<div class="btn-row" style="margin-top:10px"><button type="button" class="btn btn-ghost" data-act="dupJob">' + ic('copy') + ' نسخ الطلب</button><button type="button" class="btn btn-danger" data-act="delJob">' + ic('trash') + ' حذف</button></div></div>'
      + '<div class="pg-foot"><div class="eb-info"><span>الإجمالي</span><strong>' + esc(money(r.total)) + '</strong></div><button type="button" class="btn btn-accent" data-act="preview" data-doc="' + ({ survey: 'survey', quote: 'quote' }[j.status] || 'invoice') + '">' + ic('print') + ' ' + ({ survey: 'المقايسة', quote: 'عرض السعر' }[j.status] || 'الفاتورة') + ' PDF</button></div>';
    var el = $('jobPage'), stt = el.scrollTop; el.innerHTML = html; el.scrollTop = stt;
    $('jobNotes').addEventListener('input', function () { j.notes = this.value; touch(j); saveDb(); });
    Array.prototype.forEach.call(el.querySelectorAll('[data-jk]'), function (inp) { inp.addEventListener('input', function () { j[inp.dataset.jk] = inp.value; touch(j); saveDb(); }); if (inp.type === 'date') inp.addEventListener('change', function () { refresh(); }); });
  }
  function openSystemPicker(jobId) {
    openSheet('فتحة / بند جديد', '<div class="search-box">' + ic('search') + '<input type="search" id="f_kq" placeholder="دوّر: جرار، باب، شتر، شاور…" autocomplete="off"></div><div id="f_klist"></div>', { form: 'syspick', jobId: jobId });
    var draw = function () {
      var q = $('f_kq').value.trim();
      $('f_klist').innerHTML = K.GROUPS.map(function (g) { var ks = Object.keys(KINDS).filter(function (k) { return KINDS[k].grp === g[0] && (!q || KINDS[k].label.indexOf(q) >= 0); }); return ks.length ? '<p class="more-h">' + esc(g[1]) + '</p><div class="type-tiles compact">' + ks.map(function (k) { return kindTile(k, 'pickKind'); }).join('') + '</div>' : ''; }).join('');
    };
    draw(); $('f_kq').addEventListener('input', draw);
  }

  // ====================================================================
  // المستندات: مقايسة — عرض سعر — فاتورة — أمر تشغيل — كشف مقاسات — قايمة خامات — تكاليف (داخلي) — كشف حساب
  // ====================================================================
  var pv = null;
  function business() { var b = settings.business || {}; return { name: b.name || '', trade: 'ألوميتال و UPVC', phone: b.phone || '', address: b.address || '' }; }
  function specOf(it) {
    var i = it['in'] || {}, s = sysById(i.sys), g = libById(i.glass), b = [];
    if (isOpen(it.kind)) { var v = C.vars(i); b.push(fq(v.W) + ' × ' + fq(v.H) + ' مم'); b.push(v.N + ' ضلفة' + (v.M < v.N ? ' (' + v.M + ' متحرك)' : '')); if (s) b.push(s.name); if (g) b.push(g.name + (g.thick ? ' ' + g.thick + ' مم' : '')); if (i.mesh) b.push('بسلك'); if (i.color) b.push(i.color); if (i.dir) b.push('فتح ' + i.dir); if (i.floor) b.push('دور ' + i.floor); }
    if (it.scope && it.scope !== 'full') b.push(C.SCOPES[it.scope]);
    return b.join(' · ');
  }
  function jobDocHTML(j, doc) {
    var r = J(j), c = getCust(j.customerId) || {}, A = window.ArzaqiInvoice, rows = '';
    j.items.forEach(function (it, i) {
      var x = r.items[i];
      rows += '<tr><td class="idx">' + (i + 1) + '</td><td class="t">' + A.esc(itemTitle(it)) + '<span class="sub-note">' + A.esc(specOf(it)) + '</span>' + (it.notes ? '<span class="sub-note">' + A.esc(it.notes) + '</span>' : '') + '</td><td>' + x.qty + '</td><td class="money">' + money(x.unitPrice) + '</td><td class="money">' + money(x.total) + '</td></tr>';
    });
    j.costs.forEach(function (k, i) { var x = r.costs[i]; if (!x.billed) return; rows += '<tr><td class="idx">—</td><td class="t">' + A.esc(k.name || C.COST_TYPES[x.type]) + '</td><td>' + (k.mode ? '—' : fq(x.qty)) + '</td><td class="money">' + (k.mode ? '—' : fmt(x.price)) + '</td><td class="money">' + money(x.total) + '</td></tr>'; });
    arr(j.adjust).forEach(function (a) { rows += '<tr><td class="idx">—</td><td class="t">' + A.esc((a.type === 'return' ? 'مرتجع: ' : 'إضافة: ') + (a.name || '')) + '</td><td>—</td><td>—</td><td class="money">' + (a.type === 'return' ? '- ' : '') + money(C.num(a.amount)) + '</td></tr>'; });
    var body = '<div class="inv-sec"><span class="n">1</span> الأعمال</div><table class="p-table"><thead><tr><th>م</th><th>البند والمواصفات</th><th>العدد</th><th>سعر الوحدة</th><th>الإجمالي</th></tr></thead><tbody>' + (rows || '<tr><td colspan="5">لسه مفيش بنود</td></tr>') + '</tbody></table>';
    var info = [];
    if (doc !== 'invoice') { if (j.duration) info.push('مدة التنفيذ: ' + j.duration); if (j.payTerms) info.push('شروط الدفع: ' + j.payTerms); if (doc === 'quote' && j.validity) info.push('صلاحية العرض: ' + j.validity); }
    var notes = info.concat([j.notes, settings.terms]).map(function (s) { return String(s || '').trim(); }).filter(Boolean), cc = cur();
    var discLbl = 'الخصم' + (j.discount && j.discount.type === 'percent' && C.num(j.discount.value) ? ' (' + fq(j.discount.value) + '%)' : '');
    var lbl = { survey: 'مقايسة', quote: 'عرض سعر', invoice: 'فاتورة' }[doc];
    return A.render({ section: SECTION, docKey: doc + ':' + j.id, docLabel: lbl, number: j.number, date: fmtDate(doc === 'invoice' ? today() : (j.date || today())), billable: doc === 'invoice', currency: cc.name + ' (' + cc.sym + ')', business: business(),
      client: { name: c.name || '', phone: [c.phone, c.phone2].filter(Boolean).join(' / '), address: [c.address, c.area].filter(Boolean).join(' — '), note: c.note || '' }, fields: [{ label: 'المشروع', value: j.title || '' }, { label: 'الموقع', value: j.site || '' }], bodyHTML: body,
      notesHTML: notes.length ? '<div class="inv-notes"><h4>ملاحظات وشروط</h4>' + notes.map(function (x) { return '<div>' + A.esc(x).replace(/\n/g, '<br>') + '</div>'; }).join('') + '</div>' : '',
      totals: { lines: [['الأعمال', C.money(r.matSell + r.labor + r.extras)], ['مصاريف', r.billedCosts], ['إضافات', r.adds], ['مرتجعات', r.returns, '-'], [discLbl, r.discount, '-'], ['الضريبة' + (r.taxPct ? ' ' + fq(r.taxPct) + '%' : ''), r.tax]], total: r.total, totalLabel: doc === 'invoice' ? 'الإجمالي' : 'إجمالي ' + lbl, paid: doc === 'invoice' ? r.paid : 0, paidLabel: 'المدفوع' },
      netLabel: 'إجمالي ' + lbl, money: money, signLabel: 'توقيع الورشة' });
  }
  function measureDocHTML(j) {
    var c = getCust(j.customerId) || {}, A = window.ArzaqiInvoice, cc = cur();
    var rows = j.items.filter(function (it) { return isOpen(it.kind); }).map(function (it, i) { var v = C.vars(it['in'] || {}), x = it['in'] || {}; return '<tr><td class="idx">' + (i + 1) + '</td><td class="t">' + A.esc([x.no, x.room].filter(Boolean).join(' — ') || itemTitle(it)) + '<span class="sub-note">' + A.esc([x.work || kindLabel(it.kind), x.floor ? 'دور ' + x.floor : '', x.dir].filter(Boolean).join(' · ')) + '</span></td><td>' + fq(v.W) + ' × ' + fq(v.H) + '</td><td>' + cnt1(x.qty) + '</td><td>' + v.N + (v.M < v.N ? ' (' + v.M + ' متحرك)' : '') + '</td><td>' + A.esc(((sysById(x.sys) || {}).name || '')) + '</td></tr>'; }).join('');
    var body = '<div class="inv-sec"><span class="n">1</span> مقاسات الفتحات (مم)</div><table class="p-table"><thead><tr><th>م</th><th>الفتحة</th><th>العرض × الارتفاع</th><th>العدد</th><th>الضلف</th><th>النظام</th></tr></thead><tbody>' + (rows || '<tr><td colspan="6">مفيش فتحات</td></tr>') + '</tbody></table>';
    return A.render({ section: SECTION, docKey: 'measure:' + j.id, docLabel: 'كشف المقاسات', number: j.number, date: fmtDate(j.date || today()), billable: false, currency: cc.name, business: business(), client: { name: c.name || '', phone: c.phone || '', address: c.address || '' }, fields: [{ label: 'الموقع', value: j.site || '' }], bodyHTML: body,
      totals: { lines: [], total: j.items.length, totalLabel: 'عدد البنود', noSum: true }, netLabel: 'عدد البنود', boxTitle: 'الفتحات', money: function (v) { return fq(v); }, noWarranty: true, signs: [] });
  }
  function cnt1(q) { return Math.max(1, Math.round(C.num(q) || 1)); }
  function workDocHTML(j) {
    var r = J(j), c = getCust(j.customerId) || {}, A = window.ArzaqiInvoice, cc = cur(), body = '', n = 0;
    j.items.forEach(function (it, i) {
      var x = r.items[i].calc; if (!x.pieces && !x.glass) return; n++;
      body += '<div class="inv-sec"><span class="n">' + n + '</span> ' + A.esc(itemTitle(it)) + '</div><p class="wo-spec">' + A.esc(specOf(it)) + (r.items[i].qty > 1 ? ' — العدد ' + r.items[i].qty : '') + '</p>';
      if (x.pieces && x.pieces.length) body += '<table class="p-table"><thead><tr><th>القطعة</th><th>القطاع</th><th>الطول مم</th><th>العدد</th><th>الزاوية</th></tr></thead><tbody>' + x.pieces.map(function (p) { return '<tr><td class="t">' + A.esc(p.name) + '</td><td>' + A.esc(p.profile || C.ROLES[p.role] || '') + '</td><td class="money">' + fq(p.len) + '</td><td>' + p.count + '</td><td>' + p.angle + '°</td></tr>'; }).join('') + '</tbody></table>';
      if (x.glass && x.glass.length) body += '<table class="p-table"><thead><tr><th>الزجاج</th><th>العرض × الارتفاع مم</th><th>العدد</th><th>م²</th></tr></thead><tbody>' + x.glass.map(function (g) { return '<tr><td class="t">' + A.esc(g.name + ' ' + (((libById((it['in'] || {}).glass) || {}).name) || '')) + '</td><td>' + fq(g.w) + ' × ' + fq(g.h) + '</td><td>' + g.count + '</td><td>' + fq(g.area) + '</td></tr>'; }).join('') + '</tbody></table>';
      var ac = (x.acc || []).concat(x.gaskets || []); if (ac.length) body += '<p class="wo-spec">' + A.esc(ac.map(function (a) { return a.name + ': ' + fq(a.qty) + ' ' + a.unit; }).join(' · ')) + '</p>';
    });
    var plan = C.jobCut(j, ctx());
    if (plan.length) {
      n++; body += '<div class="inv-sec"><span class="n">' + n + '</span> خطة القص</div>';
      plan.forEach(function (p) { if (!p.plan) { body += '<p class="wo-spec">' + A.esc(p.name) + ': محتاج طول العود في المكتبة.</p>'; return; } body += '<p class="wo-spec"><b>' + A.esc(p.name) + '</b> — ' + p.plan.count + ' عود · هالك ' + p.plan.wastePct + '%</p>' + p.plan.bars.map(function (b) { return '<div class="wo-bar"><span>عود ' + b.no + ' (' + fq(b.len) + (b.src === 'remnant' ? ' باقي' : '') + '): ' + b.items.map(function (x) { return fq(x.len); }).join(' + ') + ' — ' + (b.keep ? 'باقي ' : 'هالك ') + fq(b.rest) + '</span>' + barSVG(b) + '</div>'; }).join(''); });
    }
    var info = '<div class="inv-notes"><h4>أمر التشغيل</h4>' + [['بدء التصنيع', fmtDate(j.woStart)], ['موعد التسليم', fmtDate(j.due)], ['الفني المسؤول', j.tech], ['المرحلة', stages()[j.stage || 0]], ['التعليمات', j.woNotes]].filter(function (x) { return x[1]; }).map(function (x) { return '<div>' + x[0] + ': <b>' + A.esc(x[1]) + '</b></div>'; }).join('') + '</div>';
    return A.render({ section: SECTION, docKey: 'work:' + j.id, docLabel: 'أمر تشغيل', number: j.number, date: fmtDate(today()), billable: false, currency: cc.name, business: business(), client: { name: c.name || '', phone: c.phone || '' }, fields: [{ label: 'المشروع', value: j.title || '' }, { label: 'الموقع', value: j.site || '' }],
      bodyHTML: body || '<p>مفيش فتحات محسوبة</p>', notesHTML: info, totals: { lines: [], total: j.items.length, totalLabel: 'البنود', noSum: true }, netLabel: 'البنود', boxTitle: 'الطلب', money: function (v) { return fq(v); }, noWarranty: true, signs: [] });
  }
  function materialsDocHTML(j) {
    var r = J(j), c = getCust(j.customerId) || {}, A = window.ArzaqiInvoice, cc = cur(), agg = {}, order = [];
    j.items.forEach(function (it, i) { r.items[i].lines.forEach(function (l) { if (!l.final) return; var k = l.name + '|' + l.unit; if (!agg[k]) { agg[k] = { name: l.name, unit: l.unit, cat: l.cat, qty: 0, cost: 0 }; order.push(k); } agg[k].qty += l.final; agg[k].cost += l.costT; }); });
    order.sort(function (a, b) { return Object.keys(K.CATS).indexOf(agg[a].cat) - Object.keys(K.CATS).indexOf(agg[b].cat); });
    var body = '<div class="inv-sec"><span class="n">1</span> قايمة الخامات (للشراء)</div><table class="p-table"><thead><tr><th>م</th><th>الصنف</th><th>التصنيف</th><th>الكمية</th><th>تكلفة الشراء</th></tr></thead><tbody>'
      + (order.map(function (k, i) { var a = agg[k]; return '<tr><td class="idx">' + (i + 1) + '</td><td class="t">' + A.esc(a.name) + '</td><td>' + A.esc(K.CATS[a.cat] || '') + '</td><td>' + fq(a.qty) + ' ' + A.esc(a.unit) + '</td><td class="money">' + (a.cost ? money(a.cost) : '—') + '</td></tr>'; }).join('') || '<tr><td colspan="5">مفيش خامات — اضغط «تطبيق على الخامات» في الفتحات</td></tr>') + '</tbody></table>';
    var tc = C.money(order.reduce(function (s, k) { return s + agg[k].cost; }, 0));
    return A.render({ section: SECTION, docKey: 'materials:' + j.id, docLabel: 'قايمة الخامات', number: j.number, date: fmtDate(today()), billable: false, currency: cc.name + ' (' + cc.sym + ')', business: business(), client: { name: c.name || '', phone: c.phone || '' }, fields: [{ label: 'المشروع', value: j.title || '' }], bodyHTML: body,
      totals: { lines: [], total: tc, totalLabel: 'تكلفة الخامات', noSum: true }, netLabel: 'تكلفة الخامات', boxTitle: 'الخامات', money: money, noWarranty: true, signs: [] });
  }
  function costsDocHTML(j) {
    var r = J(j), c = getCust(j.customerId) || {}, A = window.ArzaqiInvoice, cc = cur();
    var rows = j.items.map(function (it, i) { var x = r.items[i]; return '<tr><td class="idx">' + (i + 1) + '</td><td class="t">' + A.esc(itemTitle(it)) + '<span class="sub-note">' + A.esc(Object.keys(K.CATS).filter(function (k) { return x.costBy[k]; }).map(function (k) { return K.CATS[k] + ' ' + fmt(x.costBy[k]); }).join(' · ') + (x.internal ? ' · داخلي ' + fmt(x.internal) : '')) + '</span></td><td class="money">' + money(x.total) + '</td><td class="money">' + money(x.cost) + '</td><td class="money">' + money(x.profit) + '<span class="sub-note">' + fq(x.margin) + '% · للقطعة ' + fmt(x.unitProfit) + '</span></td></tr>'; }).join('');
    var body = '<div class="inv-sec"><span class="n">1</span> تكلفة وربح كل بند (داخلي)</div><table class="p-table"><thead><tr><th>م</th><th>البند</th><th>البيع</th><th>التكلفة</th><th>الربح</th></tr></thead><tbody>' + (rows || '<tr><td colspan="5">—</td></tr>') + '</tbody></table>'
      + '<div class="inv-sec"><span class="n">2</span> تكاليف الطلب</div><table class="p-table"><tbody>' + Object.keys(K.CATS).filter(function (k) { return r.catCost[k]; }).map(function (k) { return '<tr><td class="t">' + A.esc(K.CATS[k]) + '</td><td class="money">' + money(r.catCost[k]) + '</td></tr>'; }).join('')
      + C.COST_ORDER.filter(function (t) { return t !== 'mat' && r.byType[t]; }).map(function (t) { return '<tr><td class="t">' + A.esc(C.COST_TYPES[t]) + '</td><td class="money">' + money(r.byType[t]) + '</td></tr>'; }).join('') + (r.wasteCost ? '<tr><td class="t">منها الهالك</td><td class="money">' + money(r.wasteCost) + '</td></tr>' : '') + '</tbody></table>';
    var summary = '<div class="inv-notes"><h4>الربح</h4><div>قيمة الطلب (من غير الضريبة): <b>' + money(r.total - r.tax) + '</b></div><div>إجمالي التكاليف: <b>' + money(r.totalCost) + '</b></div><div>الربح: <b>' + money(r.profit) + '</b> (هامش ' + fq(r.margin) + '%)</div></div>';
    return A.render({ section: SECTION, docKey: 'costs:' + j.id, docLabel: 'كشف التكاليف والربح', number: j.number, date: fmtDate(today()), billable: false, currency: cc.name + ' (' + cc.sym + ')', business: business(), client: { name: c.name || '', phone: c.phone || '' }, fields: [{ label: 'مستند', value: 'داخلي' }], bodyHTML: body, notesHTML: summary,
      totals: { lines: [], total: r.totalCost, totalLabel: 'إجمالي التكاليف', noSum: true }, netLabel: 'إجمالي التكاليف', boxTitle: 'التكاليف', money: money, noWarranty: true, signs: [] });
  }

  // ---------------- الرئيسية والمزيد ----------------
  function renderHome() {
    var due = 0, active = 0, month = 0, ym = today().slice(0, 7);
    db.jobs.forEach(function (j) { if (isOffer(j)) return; var r = J(j); if (r.remaining > 0) due += r.remaining; if (j.status !== 'done') active++; if (String(j.date || '').slice(0, 7) === ym) month += r.total; });
    $('homeDue').textContent = fmt(due); $('homeActive').textContent = active; $('homeCust').textContent = db.customers.length; $('homeMonth').textContent = fmt(month, 0);
    Array.prototype.forEach.call(document.querySelectorAll('.cur'), function (el) { el.textContent = cur().sym; });
    $('catTiles').innerHTML = ['sliding', 'casement', 'tilt', 'fixed', 'door', 'folding', 'facade', 'shutter', 'shower'].map(function (k) { return kindTile(k); }).join('');
    $('remBadge').textContent = db.remnants.length ? db.remnants.length + ' باقي' : 'كميات وبواقي';
    $('sysBadge').textContent = systems().length + ' نظام';
    var rec = sortedJobs().slice(0, 4);
    $('homeRecent').innerHTML = rec.length ? rec.map(function (j) { return jobCard(j); }).join('') : '<div class="home-empty">لسه مفيش طلبات. ابدأ بـ «مقايسة جديدة» أو افتح أي حاسبة.</div>';
    var h = new Date().getHours();
    $('greetLine').textContent = (h < 12 ? 'صباح الخير' : 'مساء الخير') + ' — الألوميتال وUPVC';
  }
  function renderMore() {
    $('currencySelect').value = cur().code; applyTheme();
    $('bizName').value = settings.business.name || ''; $('bizPhone').value = settings.business.phone || '';
    $('bizAddress').value = settings.business.address || ''; $('bizTerms').value = settings.terms || '';
    $('moreLib').textContent = lib().length + ' صنف في المكتبة · ' + systems().length + ' نظام';
    $('moreUnits').innerHTML = units().map(function (u) { var custom = arr(settings.units).indexOf(u) >= 0; return '<span class="chip static">' + esc(u) + (custom ? ' <button type="button" class="chip-x" data-act="delUnit" data-v="' + esc(u) + '">×</button>' : '') + '</span>'; }).join('');
    var tot = 0, cost = 0, due = 0;
    db.jobs.forEach(function (j) { if (isOffer(j)) return; var r = J(j); tot += r.total; cost += r.totalCost; due += Math.max(r.remaining, 0); });
    $('moreStats').innerHTML = row('عدد الطلبات', String(db.jobs.length)) + row('إجمالي المبيعات', money(tot)) + row('التكاليف', money(cost)) + row('المتبقي عند العملاء', money(due));
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
    return ({ survey: 'مقايسة', quote: 'عرض سعر', costs: 'كشف التكاليف', materials: 'قايمة الخامات', work: 'أمر تشغيل', measure: 'كشف المقاسات', invoice: 'فاتورة' }[pv.doc] || 'فاتورة') + ' ' + (j.number || '') + ' — ' + custName(j);
  }
  function openPreview(o) {
    pv = o; renderPreview();
    var m = $('printPreviewModal'); m.style.display = 'block'; m.scrollTop = 0;
    pushLayer({ type: 'preview', hide: function () { m.style.display = 'none'; pv = null; } });
    fitPreview(); if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitPreview); setTimeout(fitPreview, 300);
  }
  function renderPreview() {
    if (!pv) return;
    $('pvDocs').innerHTML = pv.jobId ? [['survey', 'مقايسة'], ['quote', 'عرض سعر'], ['invoice', 'فاتورة'], ['work', 'أمر تشغيل'], ['measure', 'المقاسات'], ['materials', 'الخامات'], ['costs', 'التكاليف']].map(function (d) { return '<button type="button" data-act="pvDoc" data-doc="' + d[0] + '" class="' + (pv.doc === d[0] ? 'on' : '') + '">' + d[1] + '</button>'; }).join('') : '';
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
  function curSys() { return sysById(toolState.sysId); }
  var ACT = {
    closeTop: function () { closeTop(); },
    view: function (b) { var go = function () { if (b.dataset.filter) jobFilter.f = b.dataset.filter; switchView(b.dataset.view); }; if (stack.length) closeTop(go); else go(); },
    create: function () {
      openSheet('إنشاء جديد', '<div class="create-list"><button type="button" class="create-opt dark" data-act="newSurvey"><span class="q-ic orange">' + ic('file') + '</span><span><b>مقايسة جديدة</b><small>عميل + مقاسات الفتحات + سعر</small></span></button>'
        + '<button type="button" class="create-opt" data-act="tool" data-tool="calcs"><span class="q-ic">' + ic('grid') + '</span><span><b>الحاسبات المستقلة</b><small>' + K.TOOLS.length + ' حاسبة من غير مشروع</small></span></button>'
        + '<div class="create-row"><button type="button" class="create-opt" data-act="quickPay"><span class="q-ic green">' + ic('cash') + '</span><span><b>تسجيل دفعة</b><small>من عميل</small></span></button>'
        + '<button type="button" class="create-opt" data-act="tool" data-tool="inventory"><span class="q-ic">' + ic('box') + '</span><span><b>باقي قطاع</b><small>المخزن</small></span></button></div>'
        + '<button type="button" class="create-opt" data-act="newCustomer"><span class="q-ic">' + ic('users') + '</span><span><b>عميل جديد</b><small>اسم وتليفون وعنوان</small></span></button></div>', {});
    },
    newJob: function () { afterSheet(function () { var go = function () { openNewJobSheet(null, 'active'); }; if (tool) closeTop(go); else go(); }); },
    newSurvey: function () { afterSheet(function () { var go = function () { openNewJobSheet(null, 'survey'); }; if (tool) closeTop(go); else go(); }); },
    newJobFor: function () { openNewJobSheet(openCustId, 'survey'); },
    jobStatus: function (b) { S.status = b.dataset.v; Array.prototype.forEach.call($('f_jst').children, function (x) { x.classList.toggle('on', x === b); }); },
    createJob: createJob,
    quickKind: function (b) { var o = { kind: b.dataset.kind }; openItem(o); if (b.dataset.kind === 'custom' && b.dataset.title) { E.it['in'].workName = b.dataset.title; renderItemPage(); } },
    pickKind: function (b) { var id = S.jobId, k = b.dataset.kind; closeTop(function () { openItem({ jobId: id, kind: k }); }); },
    addSystem: function () { openSystemPicker(openJobId); },
    editSysOf: function () { var id = (E.it['in'] || {}).sys; if (!id) { toast('اختار النظام الأول'); return; } openTool('system', { sysId: id, sysType: TYPES[E.it.kind] ? E.it.kind : 'sliding' }); },
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
    // ---- البند / الفتحة ----
    editItem: function (b) { openItem({ jobId: openJobId, itemId: b.dataset.id }); },
    setK: function (b) { setPath(E.it, b.dataset.k, b.dataset.v); renderItemPage(); },
    addRow: function (b) { listAt(b.dataset.path).push(clone(ROWDEF[b.dataset.path] || {})); renderItemPage(); },
    delAt: function (b) { listAt(b.dataset.path).splice(+b.dataset.i, 1); renderItemPage(); },
    dupAt: function (b) { var l = listAt(b.dataset.path), x = clone(l[+b.dataset.i]); if (x && x.name) x.name += ' (نسخة)'; l.splice(+b.dataset.i + 1, 0, x); renderItemPage(); },
    addLine: function () { E.it.lines.push({ id: uid('l'), name: '', qty: '1', unit: 'قطعة', cat: 'acc', cost: '', price: '' }); renderItemPage(); },
    pickLib: function (b) { openLibPick(+b.dataset.i); },
    libPickCat: function (b) { S.cat = b.dataset.v; Array.prototype.forEach.call($('f_lsys').children, function (x) { x.classList.toggle('on', x === b); }); renderLibPick(); },
    libPicked: function (b) { libPicked(b.dataset.id); },
    addLabor: function () { E.it.labor.push({ name: '', method: 'lump', grp: 'mfg', qty: '', price: '' }); renderItemPage(); },
    addIcost: function (b) { E.it.icosts.push({ name: b.dataset.v, grp: /تركيب/.test(b.dataset.v) && !/زجاج|إكسسوار/.test(b.dataset.v) ? 'install' : 'mfg', amount: '' }); renderItemPage(); },
    addExtra: function (b) { E.it.extras.push({ name: b.dataset.v, amount: '' }); renderItemPage(); },
    applySug: applySug,
    resetItem: function () { confirmDlg('إعادة ضبط الحاسبة؟', 'هتتمسح المدخلات والخامات والمصنعية في الحاسبة دي (المحفوظ قبل كده مش هيتأثر لحد ما تحفظ).', 'أيوه، ابدأ من جديد').then(function (ok) { if (!ok) return; E.it = blankItem(E.it.kind); renderItemPage(); toast('اتعملت إعادة ضبط'); }); },
    toNote: toNote,
    shareItem: function () { shareText(itemTitle(E.it), itemText(E.it)); },
    saveItem: function () { saveItem(); },
    saveInvoice: function () { saveItem(function (jid) { openJob(jid); var j = getJob(jid) || {}; openPreview({ doc: ({ survey: 'survey', quote: 'quote' }[j.status]) || 'invoice', jobId: jid }); }); },
    cutRemnants: function () { var r = C.item(E.it, ctx()).calc; if (!r.plan) return; var x = addRemnants(r.plan, (E.it['in'] || {}).prof, 'Cut Optimizer'); toast('اتسجل ' + x.added + ' باقي في المخزن' + (x.used ? ' واتشال ' + x.used + ' مستخدم' : '')); renderItemPage(); },
    dupItem: function () { var j = getJob(E.jobId); if (!j) return; var src = j.items.find(function (x) { return x.id === E.itemId; }); if (!src) return; var c = clone(src); c.id = uid('i'); j.items.splice(j.items.indexOf(src) + 1, 0, c); touch(j); saveDb(); closeTop(function () { refresh(); toast('اتكرر'); }); },
    delItem: function () {
      var j = getJob(E.jobId), id = E.itemId; if (!j) return;
      confirmDlg('حذف البند؟', 'هيتمسح «' + itemTitle(E.it) + '» من الطلب.', 'أيوه، امسح').then(function (ok) { if (!ok) return; j.items = j.items.filter(function (x) { return x.id !== id; }); touch(j); saveDb(); closeTop(function () { refresh(); toast('اتمسح'); }); });
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
    setStage: function (b) { var j = findJob(); if (!j) return; j.stage = +b.dataset.i; if (j.stage === stages().length - 1 || /التسليم/.test(stages()[j.stage])) { if (j.status !== 'done' && /التسليم|التحصيل/.test(stages()[j.stage])) j.status = 'done'; } touch(j); saveDb(); refresh(); toast(stages()[j.stage]); },
    toQuote: function () { var j = findJob(); if (!j) return; j.status = 'quote'; j.stage = Math.max(j.stage || 0, stages().indexOf('عرض السعر')); touch(j); saveDb(); refresh(); openPreview({ doc: 'quote', jobId: j.id }); toast('بقت عرض سعر'); },
    toInvoice: function () { var j = findJob(); if (!j) return; j.status = 'active'; j.stage = Math.max(j.stage || 0, stages().indexOf('موافقة العميل')); touch(j); saveDb(); refresh(); openPreview({ doc: 'invoice', jobId: j.id }); toast('بقت فاتورة'); },
    jobRemnants: function () { var j = findJob(); if (!j) return; var a = 0, u = 0; C.jobCut(j, ctx()).forEach(function (p) { if (p.plan) { var x = addRemnants(p.plan, p.libId, j.number); a += x.added; u += x.used; } }); refresh(); toast('اتسجل ' + a + ' باقي' + (u ? ' واتشال ' + u + ' مستخدم' : '')); },
    scrollProfit: function () { var el = $('profitCard'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); },
    jobMenu: openJobMenu, editJobInfo: openJobInfoSheet, saveJobInfo: saveJobInfo, dupJob: dupJob, delJob: delJob,
    openCustOfJob: function () { var j = findJob(); if (!j || !j.customerId) { toast('الطلب ده من غير عميل — عدّل البيانات وضيف اسم العميل'); return; } closeTop(function () { openCust(j.customerId); }); },
    preview: function (b) { openPreview({ doc: b.dataset.doc, jobId: openJobId }); },
    pvDoc: function (b) { if (!pv) return; pv.doc = b.dataset.doc; renderPreview(); fitPreview(); },
    clearJobFilter: function () { jobFilter.cust = ''; jobFilter.from = ''; jobFilter.to = ''; $('jobFrom').value = ''; $('jobTo').value = ''; renderJobs(); },
    // ---- الأدوات ----
    tool: function (b) { var t = b.dataset.tool; afterSheet(function () { if (tool) { tool = t; renderTool(); } else openTool(t); }); },
    sysNew: function (b) { var s = newSystem(b.dataset.mat, b.dataset.mat === 'upvc' ? 'نظام UPVC جديد' : 'نظام ألوميتال جديد', true); systems().push(s); saveSettings(); toolState.sysId = s.id; subTool('system'); toast('اتعمل نظام — عدّل اسمه وخصوماته'); },
    sysOpen: function (b) { toolState.sysId = b.dataset.id; subTool('system'); },
    sysType: function (b) { toolState.sysType = b.dataset.v; renderTool(); },
    sysMenu: function () { openSheet('النظام', '<div class="menu-list"><button type="button" class="action-item" data-act="sysCopy"><span class="a-ic">' + ic('copy') + '</span><span>نسخ النظام<small>نظام جديد بنفس القطاعات والمعادلات</small></span></button><button type="button" class="action-item" data-act="sysDel"><span class="a-ic" style="background:var(--danger-soft);color:var(--danger)">' + ic('trash') + '</span><span>حذف النظام<small>الفتحات القديمة هتحتاج نظام تاني</small></span></button></div>', {}); },
    sysCopy: function () { var s = curSys(); if (!s) return; var c = clone(s); c.id = uid('S'); c.name = s.name + ' (نسخة)'; systems().push(c); saveSettings(); closeTop(function () { toolState.sysId = c.id; renderTool(); toast('اتنسخ'); }); },
    sysDel: function () { var s = curSys(); if (!s) return; closeTop(function () { confirmDlg('حذف النظام؟', '«' + s.name + '» بكل معادلاته.', 'أيوه، امسح').then(function (ok) { if (!ok) return; settings.systems = systems().filter(function (x) { return x !== s; }); saveSettings(); closeTop(function () { toast('اتمسح'); }); }); }); },
    ruleAdd: function (b) { var s = curSys(), k = b.dataset.v, t = toolState.sysType; s.rules[t] = arr(s.rules[t]); s.rules[t].push(k === 'glass' ? { kind: 'glass', name: 'زجاج', w: 'W/N', h: 'H', count: 'N' } : k === 'acc' ? { kind: 'acc', name: 'إكسسوار', qty: '1', unit: 'قطعة' } : k === 'gasket' ? { kind: 'gasket', name: 'جوان', qty: '2*(W+H)/1000', unit: 'متر' } : { kind: 'profile', role: 'frame', name: 'قطعة', len: 'W', count: '1', angle: 45 }); saveSettings(); renderTool(); },
    ruleDel: function (b) { var s = curSys(); s.rules[toolState.sysType].splice(+b.dataset.i, 1); saveSettings(); renderTool(); },
    ruleDup: function (b) { var s = curSys(), l = s.rules[toolState.sysType], x = clone(l[+b.dataset.i]); l.splice(+b.dataset.i + 1, 0, x); saveSettings(); renderTool(); },
    ruleTpl: function () { var s = curSys(), t = toolState.sysType; confirmDlg('ترجيع القالب التقديري؟', 'معادلات «' + TYPES[t] + '» في النظام ده هتتبدل بالقالب (الخصومات صفر).', 'أيوه، رجّع').then(function (ok) { if (!ok) return; s.rules[t] = C.template(t, s.material); saveSettings(); renderTool(); }); },
    libCat: function (b) { toolState.libCat = b.dataset.v; renderTool(); },
    libNew: function () { openLibSheet(null); },
    libEdit: function (b) { openLibSheet(b.dataset.id); },
    libSave: libSave,
    libCopy: function () { var id = S.srcId; closeTop(function () { openLibSheet(id, true); }); },
    libDel: function () { var id = S.libId; settings.lib = lib().filter(function (x) { return x.id !== id; }); saveSettings(); closeTop(function () { refresh(); toast('اتمسح من المكتبة'); }); },
    invTab: function (b) { toolState.invTab = b.dataset.v; renderTool(); },
    remNew: function () { openRemSheet(null); },
    remEdit: function (b) { openRemSheet(b.dataset.id); },
    remSave: remSave,
    remDel: function () { var id = S.remId; db.remnants = db.remnants.filter(function (x) { return x.id !== id; }); saveDb(); closeTop(function () { refresh(); toast('اتشال من البواقي'); }); },
    workerNew: function () { openWorkerSheet(null); },
    workerOpen: function (b) { toolState.workerId = b.dataset.id; subTool('worker'); },
    workerEdit: function () { openWorkerSheet(toolState.workerId); },
    workerSave: workerSave,
    wlogNew: openWlogSheet,
    wlogKind: function (b) { S.kind = b.dataset.v; Array.prototype.forEach.call($('f_lkinds').children, function (x) { x.classList.toggle('on', x === b); }); var map = { day: 'daily', piece: 'piece', window: 'window', door: 'door', m: 'm', m2: 'm2' }; if (map[S.kind] && S.w[map[S.kind]]) $('f_lr').value = S.w[map[S.kind]]; },
    wlogSave: function () { var q = C.num($('f_lq').value), r = C.num($('f_lr').value); if (!q || !r) { toast('اكتب الكمية والسعر'); return; } db.wlog.push({ id: uid('wl'), workerId: toolState.workerId, kind: S.kind, qty: String(q), rate: String(r), amount: String(C.money(q * r)), date: $('f_ld').value || today(), jobId: $('f_lj').value, note: $('f_ln').value.trim() }); saveDb(); closeTop(function () { refresh(); toast('اتسجل'); }); },
    wlogDel: function (b) { confirmDlg('حذف الشغلانة دي؟', '', 'أيوه، امسح').then(function (ok) { if (!ok) return; db.wlog = db.wlog.filter(function (x) { return x.id !== b.dataset.id; }); saveDb(); refresh(); }); },
    wpayNew: function () { openSheet('دفع / سلفة', '<div class="segmented seg-2" id="f_wpt" style="margin-bottom:12px"><button type="button" class="on" data-act="wpayType" data-v="pay">دفع</button><button type="button" data-act="wpayType" data-v="advance">سلفة</button></div><div class="row-2"><div class="field"><label for="f_wpa">المبلغ</label><input type="text" id="f_wpa" inputmode="decimal" dir="ltr"></div><div class="field"><label for="f_wpd">التاريخ</label><input type="date" id="f_wpd" value="' + today() + '"></div></div><div class="field"><label for="f_wpn">ملاحظة</label><input type="text" id="f_wpn"></div><button type="button" class="btn btn-accent" data-act="wpaySave">' + ic('check') + ' حفظ</button>', { type: 'pay' }); },
    wpayType: function (b) { S.type = b.dataset.v; Array.prototype.forEach.call($('f_wpt').children, function (x) { x.classList.toggle('on', x === b); }); },
    wpaySave: function () { var a = C.num($('f_wpa').value); if (!a) { toast('اكتب المبلغ'); return; } db.wpay.push({ id: uid('wp'), workerId: toolState.workerId, type: S.type, amount: String(a), date: $('f_wpd').value || today(), note: $('f_wpn').value.trim() }); saveDb(); closeTop(function () { refresh(); toast('اتسجل'); }); },
    wpayDel: function (b) { confirmDlg('حذف الدفعة دي؟', '', 'أيوه، امسح').then(function (ok) { if (!ok) return; db.wpay = db.wpay.filter(function (x) { return x.id !== b.dataset.id; }); saveDb(); refresh(); }); },
    addMethod: function () { var m = $('f_newMethod').value.trim(); if (!m) return; settings.laborMethods = arr(settings.laborMethods).concat([m]); saveSettings(); renderTool(); toast('اتضافت'); },
    delMethod: function (b) { settings.laborMethods = arr(settings.laborMethods).filter(function (m) { return m !== b.dataset.v; }); saveSettings(); renderTool(); },
    delLp: function (b) { delete settings.laborPrices[b.dataset.v]; saveSettings(); renderTool(); },
    addPayMethod: function () { var m = $('f_newPm').value.trim(); if (!m) return; settings.payMethods = arr(settings.payMethods).concat([m]); saveSettings(); renderTool(); toast('اتضافت'); },
    delPayMethod: function (b) { settings.payMethods = arr(settings.payMethods).filter(function (m) { return m !== b.dataset.v; }); saveSettings(); renderTool(); },
    stageAdd: function () { settings.stages = stages().concat(['مرحلة جديدة']); saveSettings(); renderTool(); },
    stageDel: function (b) { var s = stages().slice(); s.splice(+b.dataset.i, 1); settings.stages = s; saveSettings(); renderTool(); },
    repPeriod: function (b) { toolState.repPeriod = b.dataset.v; renderTool(); },
    noteOpen: function (b) { var n = db.notes.find(function (x) { return x.id === b.dataset.id; }); if (!n) return; closeTop(function () { openItem({ it: n.it, kind: n.kind }); }); },
    noteShare: function (b) { var n = db.notes.find(function (x) { return x.id === b.dataset.id; }); if (n) shareText(n.title, n.text); },
    noteDel: function (b) { db.notes = db.notes.filter(function (x) { return x.id !== b.dataset.id; }); saveDb(); renderTool(); toast('اتمسح من النوتة'); }
  };
  function openAdjSheet(type, id) {
    var j = findJob(); if (!j) return; var a = id ? arr(j.adjust).find(function (x) { return x.id === id; }) || {} : {};
    openSheet(type === 'return' ? 'مرتجع للعميل' : 'إضافة على الطلب', '<div class="field"><label for="f_aname">البيان</label><input type="text" id="f_aname" value="' + esc(v0(a.name)) + '" placeholder="' + (type === 'return' ? 'مثلاً: شباك اتلغى' : 'مثلاً: ناموسية زيادة') + '"></div><div class="row-2"><div class="field"><label for="f_aamt">المبلغ</label><input type="text" id="f_aamt" inputmode="decimal" dir="ltr" value="' + esc(v0(a.amount)) + '"></div><div class="field"><label for="f_adate">التاريخ</label><input type="date" id="f_adate" value="' + esc(a.date || today()) + '"></div></div>'
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
  window.AluApp = { get db() { return db; }, settings: settings, openJob: openJob, openItem: openItem, openPreview: openPreview, openTool: openTool, calc: C, catalog: K, editor: function () { return E; }, lib: lib, systems: systems, ctx: ctx };

})();
