/*
 * أرزقي | Arzoqi — النجارة والأثاث: الواجهة.
 * الحسابات في js/calc.js (CarpCalc)، والتخصصات وأنواع الشغل في js/catalog.js (CarpCatalog).
 * التخزين على الموبايل بس:
 *   hcarp_db_v1        العملاء والمشاريع (البنود، الخامات والتكاليف، الخصم، الدفعات) وخطط تقطيع الألواح
 *   hcarp_settings_v1  المظهر، العملة، وحدة المقاسات، بيانات الفاتورة، أنواع الشغل بتاعتك، مكتبة الخامات، حاسبة الخشب
 * الفاتورة: ArzaqiInvoice (نفس فاتورة كل الأقسام). نوتة العمال: ArzoqiCrew (نفس النوتة في كل الأقسام).
 * زرار الرجوع: كل نافذة أو صفحة بتتفتح بخطوة في سجل الرجوع، فالرجوع بيقفلها.
 * © 2026 أحمد حسن عبدالله
 */
(function () {
  'use strict';
  var C = window.CarpCalc, K = window.CarpCatalog;
  var DB_KEY = 'hcarp_db_v1', SET_KEY = 'hcarp_settings_v1';
  var SECTION = 'carpentry', SECTION_NAME = 'النجارة';
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
    return { v: 1, seq: Number(d.seq) || 0, customers: arr(d.customers), jobs: arr(d.jobs).map(normJob), cuts: arr(d.cuts) };
  }
  var db = normDb(loadJSON(DB_KEY, null));
  var settings = loadJSON(SET_KEY, {}) || {};
  ['business', 'lastPrice'].forEach(function (k) { if (!settings[k] || typeof settings[k] !== 'object') settings[k] = {}; });
  ['types', 'library', 'wood'].forEach(function (k) { settings[k] = arr(settings[k]); });
  if (!settings.costNames || typeof settings.costNames !== 'object') settings.costNames = {};
  function saveDb() { try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch (e) { toast('تعذر الحفظ: مساحة التخزين ممتلئة'); } }
  function saveSettings() { try { localStorage.setItem(SET_KEY, JSON.stringify(settings)); } catch (e) { toast('تعذر الحفظ: مساحة التخزين ممتلئة'); } }
  function getJob(id) { return db.jobs.find(function (j) { return j.id === id; }) || null; }
  function getCust(id) { return db.customers.find(function (c) { return c.id === id; }) || null; }
  function jobsOf(cid) { return db.jobs.filter(function (j) { return j.customerId === cid; }); }
  function custName(j) { var c = j && getCust(j.customerId); return c ? c.name : 'عميل'; }
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
  }

  // ---------------- الكروت ----------------
  var STATUS = { quote: ['عرض سعر', 'paused'], active: ['جاري', 'active'], done: ['خلصان', 'done'] };
  function jobCard(j, act) {
    var r = C.job(j);
    var cats = [];
    j.items.forEach(function (it) { var l = K.cat(it.cat).label; if (cats.indexOf(l) < 0) cats.push(l); });
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
    $('catTiles').innerHTML = K.CATS.map(function (c) {
      return '<button type="button" class="t-tile" data-act="quickCat" data-cat="' + c.id + '"><span class="q-ic orange-soft">' + ic(c.icon) + '</span><b>' + esc(c.label) + '</b><small>' + esc(c.desc) + '</small></button>';
    }).join('') + '<button type="button" class="t-tile add" data-act="newType"><span class="q-ic">' + ic('plus') + '</span><b>نوع شغل جديد</b><small>اعمله مرة واستخدمه على طول</small></button>';
    $('myTypes').innerHTML = settings.types.length ? '<h2 class="home-h" style="margin-top:16px">أنواع شغلك</h2><div class="chips wrap">'
      + settings.types.map(function (t) { return '<button type="button" class="chip" data-act="quickType" data-id="' + esc(t.id) + '">' + ic('star') + ' ' + esc(t.name) + '</button>'; }).join('') + '</div>' : '';
    var rec = sortedJobs().slice(0, 4);
    $('homeRecent').innerHTML = rec.length ? rec.map(function (j) { return jobCard(j); }).join('') : '<div class="home-empty">لسه مفيش مشاريع. ابدأ بـ «مشروع جديد» أو اختار نوع الشغل من فوق.</div>';
    var h = new Date().getHours();
    $('greetLine').textContent = (h < 12 ? 'صباح الخير' : 'مساء الخير') + ' — النجارة';
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
        return [it.type, it.desc, it.notes, K.cat(it.cat).label].concat(arr(it.rows).map(function (r) { return r.name; }), Object.keys(it.details || {}).map(function (k) { return it.details[k]; })).join(' ');
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
    Array.prototype.forEach.call(document.querySelectorAll('[data-unit-set]'), function (b) { b.classList.toggle('on', b.dataset.unitSet === (settings.dimUnit || 'cm')); });
    $('bizName').value = settings.business.name || ''; $('bizPhone').value = settings.business.phone || '';
    $('bizAddress').value = settings.business.address || ''; $('bizTerms').value = settings.terms || '';
    $('moreTypes').innerHTML = settings.types.length ? settings.types.map(function (t) {
      return '<div class="mat-row" data-act="editType" data-id="' + esc(t.id) + '"><div class="m-info"><div class="m-name">' + esc(t.name) + '</div><div class="m-meta">' + esc(K.cat(t.cat).label + ' · ' + C.METHODS[t.method].label + (C.num(t.price) ? ' · ' + money(C.num(t.price)) : '')) + '</div></div><span class="m-qty">' + ic('edit') + '</span></div>';
    }).join('') : '<p class="card-empty">لسه ما ضفتش أنواع شغل. أي شغل مش في القايمة تقدر تعرّفه مرة وتستخدمه على طول.</p>';
    var tot = 0, cost = 0, labor = 0, due = 0;
    db.jobs.forEach(function (j) { if (j.status === 'quote') return; var r = C.job(j); tot += r.total; cost += r.totalCost; labor += r.labor; due += Math.max(r.remaining, 0); });
    $('moreStats').innerHTML = row('عدد المشاريع', String(db.jobs.length)) + row('إجمالي المصنعية', money(labor)) + row('إجمالي قيمة المشاريع', money(tot))
      + row('التكاليف المسجلة', money(cost)) + '<div class="sum-row profit' + (tot - cost < 0 ? ' neg' : '') + '"><span>الربح التقديري</span><strong>' + esc(money(tot - cost)) + '</strong></div>' + row('المتبقي عند العملاء', money(due));
  }
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
      S.custName = inp.value;
      S.custId = (findCustByName(q) || {}).id || null;
      var list = q ? db.customers.filter(function (c) { return c.name.indexOf(q) >= 0 && c.name !== q; }).slice(0, 5) : [];
      $('f_csug').innerHTML = list.length ? '<div class="suggest">' + list.map(function (c) {
        return '<button type="button" data-act="pickCust" data-id="' + esc(c.id) + '"><span class="s-av">' + esc(c.name.charAt(0)) + '</span><span>' + esc(c.name) + '<small>' + esc(c.phone || '') + '</small></span></button>';
      }).join('') + '</div>' : '';
      renderTargetJobs();
    });
  }
  function renderTargetJobs() {
    var box = $('f_target'); if (!box) return;
    var c = S.custId ? getCust(S.custId) : null;
    var act = c ? jobsOf(c.id).filter(function (j) { return j.status !== 'done'; }) : [];
    if (!act.length) { S.targetJob = null; box.innerHTML = ''; return; }
    if (S.targetJob && !act.some(function (j) { return j.id === S.targetJob; })) S.targetJob = null;
    box.innerHTML = '<label class="mini-lbl" style="margin-top:8px">ضيف البند على</label><div class="chips wrap">'
      + '<button type="button" class="chip' + (!S.targetJob ? ' on' : '') + '" data-act="target" data-id="">مشروع جديد</button>'
      + act.map(function (j) { return '<button type="button" class="chip' + (S.targetJob === j.id ? ' on' : '') + '" data-act="target" data-id="' + esc(j.id) + '">' + esc((j.title || 'مشروع') + ' ' + j.number) + '</button>'; }).join('') + '</div>';
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
    var j = normJob({ id: uid('j'), number: 'CRP-' + pad(db.seq), customerId: cust.id, title: title || '', date: date || today(), status: status || 'active', notes: '', costsComplete: false, createdAt: now, updatedAt: now });
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
    closeTop(function () { refresh(); openJob(j.id); openCatSheet(j.id); });
  }
  function catGridHTML(act) {
    return '<div class="type-tiles compact">' + K.CATS.map(function (c) {
      return '<button type="button" class="t-tile" data-act="' + act + '" data-cat="' + c.id + '"><span class="q-ic orange-soft">' + ic(c.icon) + '</span><b>' + esc(c.label) + '</b></button>';
    }).join('') + '</div>' + (settings.types.length ? '<p class="more-h">أنواع شغلك</p><div class="chips wrap">' + settings.types.map(function (t) {
      return '<button type="button" class="chip" data-act="' + act + 'Type" data-id="' + esc(t.id) + '">' + ic('star') + ' ' + esc(t.name) + '</button>';
    }).join('') + '</div>' : '');
  }
  function openCatSheet(jobId) { openSheet('إضافة بند — اختار نوع الشغل', catGridHTML('chooseCat'), { jobId: jobId }); }

  // ====================================================================
  // البند: 6 خطوات — النوع ← المقاسات ← الخامات ← المصنعية ← الإضافات ← الإجمالي
  // (الحفظ متاح من أي خطوة: لو عايز تحسب المصنعية بس مش لازم تعدّي على الخامات)
  // ====================================================================
  var STEPS = ['النوع', 'المقاسات', 'الخامات', 'المصنعية', 'الإضافات', 'الإجمالي'];
  function blankItem(catId) {
    var cat = K.cat(catId);
    return { cat: cat.id, type: '', desc: '', method: cat.method, unitLabel: '', dimUnit: settings.dimUnit || 'cm', w: '', h: '', d: '', qty: '1', price: '',
      parts: {}, zones: { unit: 'm' }, rows: [], amount: '', boards: '', days: '', workers: '1', perWorker: true, hours: '',
      install: '', inc: {}, extras: [], cutParts: [], details: {}, notes: '' };
  }
  function applyTemplate(it, t) {
    it.cat = K.CATS.some(function (c) { return c.id === t.cat; }) ? t.cat : 'custom';
    it.type = t.name; it.desc = t.desc || ''; it.method = C.METHODS[t.method] ? t.method : 'piece'; it.unitLabel = t.unitLabel || '';
    it.price = v0(t.price); it.details = clone(t.details || {}); it.tplDims = t.dims || null;
    if (t.parts) it.parts = clone(t.parts); if (t.zones) it.zones = clone(t.zones);
    return arr(t.lines).map(function (l) { var x = clone(l); x.id = uid('k'); return x; });
  }
  function openItem(opts) {
    var job = opts.jobId ? getJob(opts.jobId) : null;
    var src = job && opts.itemId ? job.items.find(function (x) { return x.id === opts.itemId; }) : null;
    var it, lines = [];
    if (src) {
      it = clone(src);
      lines = clone(job.costs.filter(function (c) { return c.itemId === src.id; }));
    } else {
      it = blankItem(opts.cat || 'custom');
      if (opts.typeId) { var t = settings.types.find(function (x) { return x.id === opts.typeId; }); if (t) lines = applyTemplate(it, t); }
    }
    openSheet((src ? 'تعديل بند — ' : '') + K.cat(it.cat).label, '', { form: 'item', step: src ? 5 : 0, jobId: job ? job.id : null, itemId: src ? src.id : null, it: it, lines: lines, custId: null, targetJob: null });
    renderItem();
  }
  function stepBar() {
    return '<div class="step-bar">' + STEPS.map(function (s, i) { return '<button type="button" class="step-chip' + (i === S.step ? ' on' : '') + (i < S.step ? ' done' : '') + '" data-act="goStep" data-i="' + i + '"><b>' + (i + 1) + '</b>' + s + '</button>'; }).join('') + '</div>';
  }
  function inp(k, label, opts) {
    opts = opts || {};
    var val = getPath(S.it, k);
    return '<div class="field' + (opts.cls ? ' ' + opts.cls : '') + '"><label>' + esc(label) + (opts.unit ? ' <small class="u-lbl">(' + esc(opts.unit) + ')</small>' : '') + '</label>'
      + (opts.long ? '<textarea data-k="' + k + '" placeholder="' + esc(opts.ph || '') + '">' + esc(v0(val)) + '</textarea>'
        : '<input type="text" data-k="' + k + '"' + (opts.num ? ' inputmode="decimal" dir="ltr" placeholder="0"' : ' placeholder="' + esc(opts.ph || '') + '"') + ' value="' + esc(v0(val)) + '" autocomplete="off">') + '</div>';
  }
  function stepperHTML(k, label) {
    return '<div class="field"><label>' + esc(label) + '</label><div class="stepper"><button type="button" data-act="stepK" data-sk="' + k + '" data-d="-1" aria-label="أقل">−</button>'
      + '<input type="text" inputmode="decimal" dir="ltr" data-k="' + k + '" value="' + esc(v0(getPath(S.it, k))) + '"><button type="button" data-act="stepK" data-sk="' + k + '" data-d="1" aria-label="أكتر">+</button></div></div>';
  }
  function chipsHTML(list, act, extra) { return list.length ? '<div class="unit-chips">' + list.map(function (v) { return '<button type="button" class="chip" data-act="' + act + '" data-v="' + esc(v) + '"' + (extra || '') + '>' + esc(v) + '</button>'; }).join('') + '</div>' : ''; }
  function unitSeg(act, cur, units) {
    return '<div class="segmented seg-' + units.length + ' seg-sm">' + units.map(function (u) { return '<button type="button" class="' + (u === cur ? 'on' : '') + '" data-act="' + act + '" data-u="' + u + '">' + ({ mm: 'مليمتر', cm: 'سنتيمتر', m: 'متر' }[u]) + '</button>'; }).join('') + '</div>';
  }
  function dimLabels() {
    var cat = K.cat(S.it.cat), d = cat.dims;
    var show = S.it.tplDims && S.it.tplDims.length ? S.it.tplDims : ['w', 'h', 'd'];
    return ['w', 'h', 'd'].filter(function (k) { return show.indexOf(k) >= 0; }).map(function (k) { return [k, d[k]]; });
  }
  // سطور خامات/إكسسوارات البند (بتتسجل في تكاليف المشروع ومربوطة بالبند)
  function lineCards(type) {
    var list = S.lines.map(function (l, i) { return [l, i]; }).filter(function (p) { return p[0].type === type; });
    var sug = K.COST_SUG[type].concat(arr(settings.costNames[type])).filter(function (v, i, a) { return a.indexOf(v) === i; });
    var lib = settings.library.filter(function (m) { return (m.type || 'mat') === type; });
    return list.map(function (p) {
      var l = p[0], i = p[1], r = C.cost(l);
      return '<div class="sub-card"><div class="sc-head"><input type="text" class="grow" data-line="' + i + '" data-f="name" value="' + esc(l.name || '') + '" placeholder="' + (type === 'mat' ? 'الخامة' : 'الإكسسوار') + '">'
        + '<button type="button" class="btn btn-danger btn-icon" data-act="delLine" data-i="' + i + '" aria-label="حذف">' + ic('x') + '</button></div>'
        + '<div class="grid-4 mini"><div><span class="mini-lbl">الكمية</span><input type="text" inputmode="decimal" dir="ltr" data-line="' + i + '" data-f="qty" value="' + esc(v0(l.qty)) + '"></div>'
        + '<div><span class="mini-lbl">الوحدة</span><input type="text" data-line="' + i + '" data-f="unit" value="' + esc(l.unit || '') + '"></div>'
        + '<div><span class="mini-lbl">سعر الوحدة</span><input type="text" inputmode="decimal" dir="ltr" data-line="' + i + '" data-f="price" value="' + esc(v0(l.price)) + '"></div>'
        + '<div><span class="mini-lbl">هالك %</span><input type="text" inputmode="decimal" dir="ltr" data-line="' + i + '" data-f="wastePct" value="' + esc(v0(l.wastePct)) + '" placeholder="—"></div></div>'
        + '<label class="check-row"><input type="checkbox" data-line="' + i + '" data-f="billed"' + (l.billed ? ' checked' : '') + '> على حساب العميل (في الفاتورة)</label>'
        + '<div class="line-total" data-lt="' + i + '">' + esc(money(r.total)) + (r.wasteCost ? ' <small>شامل هالك ' + esc(money(r.wasteCost)) + '</small>' : '') + '</div></div>';
    }).join('')
      + '<div class="unit-chips">' + lib.map(function (m) { return '<button type="button" class="chip lib" data-act="addLineLib" data-id="' + esc(m.id) + '">' + ic('book') + ' ' + esc(m.name) + '</button>'; }).join('')
      + sug.slice(0, 12).map(function (n) { return '<button type="button" class="chip" data-act="addLine" data-type="' + type + '" data-v="' + esc(n) + '">+ ' + esc(n) + '</button>'; }).join('') + '</div>'
      + '<button type="button" class="btn btn-ghost btn-sm" data-act="addLine" data-type="' + type + '" data-v="">' + ic('plus') + (type === 'mat' ? ' خامة' : ' إكسسوار') + '</button>';
  }
  function rowsEditor(key, cols, presets) {
    var list = arr(getPath(S.it, key));
    return '<div class="rows-ed">' + list.map(function (r, i) {
      return '<div class="task-row cols-' + cols.length + '">' + cols.map(function (c) {
        return '<input type="text"' + (c.num ? ' inputmode="decimal" dir="ltr"' : '') + ' data-row="' + key + '" data-i="' + i + '" data-f="' + c.k + '" value="' + esc(v0(r[c.k])) + '" placeholder="' + esc(c.ph) + '">';
      }).join('') + '<button type="button" class="btn btn-danger btn-icon" data-act="delRow" data-key="' + key + '" data-i="' + i + '" aria-label="حذف">' + ic('x') + '</button></div>';
    }).join('') + '</div>'
      + (presets && presets.length ? '<div class="unit-chips">' + presets.map(function (p) { return '<button type="button" class="chip" data-act="addRow" data-key="' + key + '" data-v="' + esc(p) + '">+ ' + esc(p) + '</button>'; }).join('') + '</div>' : '')
      + '<button type="button" class="btn btn-ghost btn-sm" data-act="addRow" data-key="' + key + '" data-v="">' + ic('plus') + ' سطر</button>';
  }
  function itemHTML() {
    var it = S.it, cat = K.cat(it.cat), step = S.step, b = '';
    if (step === 0) {
      if (!S.jobId) b += '<div class="cust-pick">' + custPickHTML(true) + '</div>';
      b += '<div class="field"><label>التخصص</label><div class="chips wrap">' + K.CATS.map(function (c) { return '<button type="button" class="chip' + (c.id === it.cat ? ' on' : '') + '" data-act="setCat" data-cat="' + c.id + '">' + esc(c.label) + '</button>'; }).join('') + '</div></div>';
      var mine = settings.types.filter(function (t) { return t.cat === it.cat; });
      b += '<div class="field"><label>نوع الشغل</label><input type="text" data-k="type" value="' + esc(it.type) + '" placeholder="اكتب أي نوع — أو اختار">'
        + chipsHTML(cat.types, 'setType') + (mine.length ? '<div class="unit-chips">' + mine.map(function (t) { return '<button type="button" class="chip lib" data-act="useTpl" data-id="' + esc(t.id) + '">' + ic('star') + ' ' + esc(t.name) + '</button>'; }).join('') + '</div>' : '') + '</div>'
        + inp('desc', 'الوصف (اختياري)', { long: true, ph: 'تفاصيل اللي العميل عايزه' });
    } else if (step === 1) {
      b += '<div class="field"><label>وحدة المقاسات</label>' + unitSeg('dimUnit', it.dimUnit, ['mm', 'cm', 'm']) + '</div>';
      var dl = dimLabels();
      b += '<div class="grid-' + Math.max(dl.length, 2) + ' dims">' + dl.map(function (p) { return inp(p[0], p[1], { num: true, unit: UNIT_LBL[it.dimUnit] }); }).join('') + '</div>';
      b += stepperHTML('qty', it.method === 'lm' ? 'العدد (كام قطعة بالطول ده)' : 'العدد');
      if (cat.counts) b += '<div class="grid-4 counts">' + [['units', 'الوحدات'], ['doors', 'الضلف'], ['drawers', 'الأدراج'], ['shelves', 'الأرفف']].map(function (p) { return inp('parts.' + p[0], p[1], { num: true }); }).join('') + '</div>';
      if (cat.cut) b += '<details class="adv"' + (it.cutParts.length ? ' open' : '') + '><summary>' + ic('saw') + ' أجزاء البند للتقطيع (اختياري)</summary>'
        + '<p class="hint" style="margin-bottom:8px">الطول × العرض بالـ' + UNIT_LBL[it.dimUnit] + ' — بتتبعت لأداة «تقطيع الألواح» من صفحة المشروع.</p>'
        + rowsEditor('cutParts', [{ k: 'name', ph: 'الجزء' }, { k: 'L', ph: 'الطول', num: true }, { k: 'W', ph: 'العرض', num: true }, { k: 'count', ph: 'العدد', num: true }], cat.partNames || ['جنب', 'رف', 'ظهر', 'باب']) + '</details>';
    } else if (step === 2) {
      b += cat.fields.map(function (f) {
        var F = K.FIELDS[f]; return '<div class="field"><label>' + esc(F.label) + '</label>' + (F.long ? '<textarea data-k="details.' + f + '">' + esc(v0(it.details[f])) + '</textarea>' : '<input type="text" data-k="details.' + f + '" value="' + esc(v0(it.details[f])) + '">') + chipsHTML(F.sug, 'setField', ' data-k="details.' + f + '"') + '</div>';
      }).join('');
      b += '<p class="more-h">خامات البند (اختياري)</p>' + lineCards('mat');
    } else if (step === 3) {
      b += '<div class="field"><label>طريقة حساب المصنعية</label><div class="chips wrap">' + cat.methods.map(function (m) { return '<button type="button" class="chip' + (m === it.method ? ' on' : '') + '" data-act="setMethod" data-v="' + m + '">' + esc(C.METHODS[m].label) + '</button>'; }).join('') + '</div></div>';
      b += methodHTML();
    } else if (step === 4) {
      b += inp('install', 'مصنعية التركيب (لو منفصلة)', { num: true, unit: cur().sym });
      if (cat.includes) b += '<div class="field"><label>السعر شامل</label>' + [['frame', 'الحلق'], ['install', 'التركيب'], ['acc', 'الإكسسوارات']].map(function (p) {
        return '<label class="check-row"><input type="checkbox" data-k="inc.' + p[0] + '"' + (it.inc && it.inc[p[0]] ? ' checked' : '') + '> ' + p[1] + '</label>';
      }).join('') + '</div>';
      b += '<p class="more-h">إضافات على البند (نقل، فك، تصميم…)</p>' + rowsEditor('extras', [{ k: 'name', ph: 'الإضافة' }, { k: 'amount', ph: 'المبلغ', num: true }], (cat.extras || []).concat(['نقل', 'فك']).filter(function (v, i, a) { return a.indexOf(v) === i; }));
      b += '<p class="more-h">إكسسوارات البند (اختياري)</p>' + lineCards('acc');
    } else {
      b += '<div class="sum-list" id="itSum"></div>' + inp('notes', 'ملاحظات البند', { ph: 'بتظهر في الفاتورة' })
        + '<button type="button" class="btn btn-ghost btn-sm" data-act="saveAsType">' + ic('star') + ' احفظه كنوع شغل بتاعي</button>';
    }
    b += '<div class="calc-break" id="itBreak"></div><div class="live-total"><span>إجمالي البند للعميل</span><strong id="itTotal">0</strong></div>'
      + '<div class="step-nav">' + (step > 0 ? '<button type="button" class="btn btn-ghost" data-act="goStep" data-i="' + (step - 1) + '">السابق</button>' : '<span></span>')
      + (step < 5 ? '<button type="button" class="btn btn-soft" data-act="goStep" data-i="' + (step + 1) + '">التالي: ' + STEPS[step + 1] + '</button>' : '<span></span>') + '</div>'
      + '<button type="button" class="btn btn-accent" data-act="saveItem">' + ic('check') + (S.itemId ? ' حفظ التعديل' : ' حفظ البند') + '</button>'
      + (S.itemId ? '<div class="btn-row" style="margin-top:10px"><button type="button" class="btn btn-ghost" data-act="dupItem">' + ic('copy') + ' تكرار</button><button type="button" class="btn btn-danger" data-act="delItem">' + ic('trash') + ' حذف</button></div>' : '');
    return stepBar() + b;
  }
  function methodHTML() {
    var it = S.it, m = it.method, u = UNIT_LBL[it.dimUnit], b = '', key = it.cat + ':' + m;
    var lp = settings.lastPrice[key];
    var hint = lp ? '<div class="price-hint"><button type="button" class="chip" data-act="usePrice" data-v="' + esc(lp) + '">آخر سعر كتبته: ' + esc(fmt(lp)) + '</button></div>' : '';
    if (m === 'piece') b += '<div class="row-2">' + stepperHTML('qty', 'العدد') + inp('unitLabel', 'الوحدة', { ph: 'قطعة / باب / شباك…' }) + '</div>' + inp('price', 'سعر مصنعية الوحدة', { num: true, unit: cur().sym }) + hint;
    else if (m === 'lm') b += '<div class="row-2">' + inp('w', 'الطول (للمتر الطولي)', { num: true, unit: u }) + stepperHTML('qty', 'العدد') + '</div>' + inp('price', 'سعر مصنعية المتر الطولي', { num: true, unit: cur().sym }) + hint;
    else if (m === 'sqm') b += '<div class="row-2">' + inp('w', K.cat(it.cat).dims.w, { num: true, unit: u }) + inp('h', K.cat(it.cat).dims.h, { num: true, unit: u }) + '</div><div class="row-2">' + stepperHTML('qty', 'العدد') + inp('price', 'سعر المتر المربع', { num: true, unit: cur().sym }) + '</div>' + hint;
    else if (m === 'board') b += '<div class="row-2">' + inp('boards', 'عدد الألواح', { num: true }) + inp('price', 'سعر تصنيع اللوح', { num: true, unit: cur().sym }) + '</div>' + hint;
    else if (m === 'parts') b += [['units', 'الوحدات'], ['doors', 'الضلف'], ['drawers', 'الأدراج'], ['shelves', 'الأرفف']].map(function (p) {
      return '<div class="row-2">' + inp('parts.' + p[0], 'عدد ' + p[1], { num: true }) + inp('parts.' + p[0] + 'Price', 'السعر لكل واحدة', { num: true, unit: cur().sym }) + '</div>';
    }).join('');
    else if (m === 'zones') b += '<div class="field"><label>وحدة الأطوال</label>' + unitSeg('zoneUnit', it.zones.unit || 'm', ['cm', 'm']) + '</div>' + [['base', 'الوحدات الأرضية'], ['wall', 'الوحدات العلوية'], ['tall', 'الوحدات الطويلة']].map(function (p) {
      return '<div class="row-2">' + inp('zones.' + p[0], 'طول ' + p[1], { num: true, unit: UNIT_LBL[it.zones.unit || 'm'] }) + inp('zones.' + p[0] + 'Price', 'سعر المتر', { num: true, unit: cur().sym }) + '</div>';
    }).join('');
    else if (m === 'list') b += '<p class="hint" style="margin-bottom:8px">كل قطعة / وحدة / مهمة بسعرها، والإجمالي بيتجمع لوحده.</p>' + rowsEditor('rows', [{ k: 'name', ph: 'القطعة' }, { k: 'qty', ph: 'العدد', num: true }, { k: 'price', ph: 'السعر', num: true }], K.cat(it.cat).rows || K.cat(it.cat).types);
    else if (m === 'lump') b += inp('amount', 'قيمة المصنعية كلها', { num: true, unit: cur().sym });
    else if (m === 'daily') b += '<div class="row-2">' + inp('days', 'عدد الأيام', { num: true }) + inp('workers', 'عدد العمال', { num: true }) + '</div>' + inp('price', 'اليومية', { num: true, unit: cur().sym })
      + '<label class="check-row"><input type="checkbox" data-k="perWorker"' + (it.perWorker !== false ? ' checked' : '') + '> اليومية لكل عامل (مش للفريق كله)</label>' + hint;
    else if (m === 'hour') b += '<div class="row-2">' + inp('hours', 'ساعات التشغيل', { num: true }) + inp('price', 'سعر الساعة', { num: true, unit: cur().sym }) + '</div>' + hint;
    return b;
  }
  function itemCalc() {
    var r = C.item(S.it);
    var lines = S.lines.map(function (l) { return C.cost(l); });
    r.linesBilled = C.money(lines.reduce(function (s, x) { return s + (x.billed ? x.total : 0); }, 0));
    r.linesCost = C.money(lines.reduce(function (s, x) { return s + x.total; }, 0));
    r.customer = C.money(r.total + r.linesBilled);
    return r;
  }
  function breakText(r) {
    var it = S.it, m = it.method, u = UNIT_LBL[it.dimUnit];
    if (m === 'piece') return fq(r.qty) + ' ' + esc(r.unit) + ' × ' + fmt(r.price) + ' = <b>' + esc(money(r.labor)) + '</b>';
    if (m === 'lm') return fq(r.len) + ' م.ط' + (C.num(it.qty) !== 1 ? ' × ' + fq(C.num(it.qty) || 1) : '') + ' × ' + fmt(r.price) + ' = <b>' + esc(money(r.labor)) + '</b>';
    if (m === 'sqm') return fq(C.num(it.w)) + ' × ' + fq(C.num(it.h)) + ' ' + u + ' = ' + fq(r.areaEach) + ' م²' + (r.qty !== r.areaEach ? ' × ' + fq(r.qty / (r.areaEach || 1)) + ' = ' + fq(r.qty) + ' م²' : '') + ' × ' + fmt(r.price) + ' = <b>' + esc(money(r.labor)) + '</b>';
    if (m === 'board') return fq(r.qty) + ' لوح × ' + fmt(r.price) + ' = <b>' + esc(money(r.labor)) + '</b>';
    if (m === 'parts') return r.parts.filter(function (p) { return p.qty; }).map(function (p) { return fq(p.qty) + ' × ' + fmt(p.price); }).join(' + ') + ' = <b>' + esc(money(r.labor)) + '</b>';
    if (m === 'zones') return r.zones.filter(function (z) { return z.len; }).map(function (z) { return { base: 'أرضي', wall: 'علوي', tall: 'طويل' }[z.key] + ' ' + fq(z.len) + ' م × ' + fmt(z.price); }).join(' + ') + ' = <b>' + esc(money(r.labor)) + '</b>';
    if (m === 'list') return r.rows.length + ' سطر = <b>' + esc(money(r.labor)) + '</b>';
    if (m === 'daily') return fq(r.days) + ' يوم × ' + fmt(r.price) + (r.perWorker ? ' × ' + fq(r.workers) + ' عامل' : ' (للفريق)') + ' = <b>' + esc(money(r.labor)) + '</b>';
    if (m === 'hour') return fq(r.qty) + ' ساعة × ' + fmt(r.price) + ' = <b>' + esc(money(r.labor)) + '</b>';
    return 'مقطوعية = <b>' + esc(money(r.labor)) + '</b>';
  }
  function updateItemLive() {
    if (S.form !== 'item' || !$('itTotal')) return;
    var r = itemCalc();
    $('itTotal').textContent = money(r.customer);
    $('itBreak').innerHTML = 'المصنعية: ' + breakText(r) + (r.install ? '<br>التركيب: <b>' + esc(money(r.install)) + '</b>' : '') + (r.extrasTotal ? '<br>الإضافات: <b>' + esc(money(r.extrasTotal)) + '</b>' : '')
      + (r.linesBilled ? '<br>خامات وإكسسوارات على العميل: <b>' + esc(money(r.linesBilled)) + '</b>' : '');
    S.lines.forEach(function (l, i) { var el = sheet.querySelector('[data-lt="' + i + '"]'); if (el) { var x = C.cost(l); el.innerHTML = esc(money(x.total)) + (x.wasteCost ? ' <small>شامل هالك ' + esc(money(x.wasteCost)) + '</small>' : ''); } });
    var sum = $('itSum');
    if (sum) sum.innerHTML = row('المصنعية (' + C.METHODS[S.it.method].label + ')', money(r.labor)) + (r.install ? row('التركيب', money(r.install)) : '') + (r.extrasTotal ? row('الإضافات', money(r.extrasTotal)) : '')
      + (r.linesBilled ? row('خامات وإكسسوارات على العميل', money(r.linesBilled)) : '') + row('إجمالي البند للعميل', money(r.customer), 'bold')
      + (r.linesCost ? row('تكلفة خامات وإكسسوارات البند (عليك)', money(r.linesCost)) : '');
  }
  function renderItem() {
    var y = sheet.scrollTop;
    $('sheetBody').innerHTML = itemHTML();
    if (S.step === 0 && !S.jobId) bindCustSuggest();
    updateItemLive();
    sheet.scrollTop = S.keepScroll ? y : 0; S.keepScroll = false;
  }
  function saveItem() {
    var it = S.it;
    if (!String(it.type || '').trim()) it.type = K.cat(it.cat).label;
    var job = S.jobId ? getJob(S.jobId) : null, fromHome = !job;
    if (!job) {
      var name = String(($('f_cname') ? $('f_cname').value : S.custName) || '').trim();
      if (!name) { S.step = 0; renderItem(); toast('اكتب اسم العميل'); $('f_cname') && $('f_cname').focus(); return; }
      var c = ensureCustomer(name);
      job = S.targetJob ? getJob(S.targetJob) : null;
      if (!job) job = newJobRecord(c, String(S.jobTitle || '').trim() || it.type, today());
    }
    var r = C.item(it);
    var id = S.itemId || uid('i');
    it.id = id; delete it.tplDims;
    var i = job.items.findIndex(function (x) { return x.id === id; });
    if (i >= 0) job.items[i] = it; else job.items.push(it);
    job.costs = job.costs.filter(function (c) { return c.itemId !== id; }).concat(S.lines.filter(function (l) { return String(l.name || '').trim() || C.num(l.qty) || C.num(l.price); }).map(function (l) { l.itemId = id; l.id = l.id || uid('k'); return l; }));
    if (r.price > 0 && ['piece', 'lm', 'sqm', 'board', 'daily', 'hour'].indexOf(it.method) >= 0) settings.lastPrice[it.cat + ':' + it.method] = r.price;
    settings.dimUnit = it.dimUnit;
    touch(job); saveDb(); saveSettings();
    var jid = job.id, edit = !!S.itemId;
    closeTop(function () { refresh(); toast(edit ? 'اتعدل البند' : 'اتضاف البند'); if (fromHome) openJob(jid); });
  }
  function convertDims(from, to) {
    var f = (C.toM(1, from)) / (C.toM(1, to));
    ['w', 'h', 'd'].forEach(function (k) { var n = C.num(S.it[k]); if (n) S.it[k] = String(C.round(n * f, 4)); });
    S.it.cutParts.forEach(function (p) { ['L', 'W'].forEach(function (k) { var n = C.num(p[k]); if (n) p[k] = String(C.round(n * f, 4)); }); });
  }

  // كتابة في أي خانة → البيانات + الإجمالي على طول (من غير ما نعيد رسم النافذة علشان الكيبورد ما يقفلش)
  function onSheetInput(e) {
    var el = e.target, v = el.type === 'checkbox' ? el.checked : el.value;
    if (el.id === 'f_jtitle') S.jobTitle = v;
    if (S.form === 'item') {
      if (el.dataset.k) setPath(S.it, el.dataset.k, v);
      else if (el.dataset.row) { var list = getPath(S.it, el.dataset.row); if (list && list[+el.dataset.i]) list[+el.dataset.i][el.dataset.f] = v; }
      else if (el.dataset.line) { var l = S.lines[+el.dataset.line]; if (l) l[el.dataset.f] = v; }
      updateItemLive();
    } else if (S.form === 'cost') updateCostLive();
    else if (S.form === 'disc') updateDiscLive();
    else if (S.form === 'type' && el.dataset.trow) { var t = S.tpl.lines[+el.dataset.trow]; if (t) t[el.dataset.f] = v; }
  }
  sheet.addEventListener('input', onSheetInput);
  sheet.addEventListener('change', function (e) { if (e.target.type === 'checkbox' || e.target.tagName === 'SELECT') onSheetInput(e); });

  // ====================================================================
  // الخامات والإكسسوارات والتكاليف (على المشروع) — والهالك بالكمية أو بالنسبة
  // ====================================================================
  function openCostSheet(jobId, costId, type) {
    var job = getJob(jobId); if (!job) return;
    var c = costId ? job.costs.find(function (x) { return x.id === costId; }) : null;
    var d = c ? clone(c) : { type: type || 'mat', billed: false, mode: 'qty' };
    openSheet(c ? 'تعديل تكلفة' : 'خامات وتكاليف', '', { form: 'cost', jobId: jobId, costId: costId || null, d: d });
    renderCostSheet();
  }
  function renderCostSheet() {
    var d = S.d, t = d.type;
    var sug = K.COST_SUG[t].concat(arr(settings.costNames[t])).filter(function (v, i, a) { return a.indexOf(v) === i; });
    var lib = settings.library.filter(function (m) { return (m.type || 'mat') === t; });
    var job = getJob(S.jobId);
    var b = '<div class="chips wrap">' + C.COST_ORDER.map(function (k) { return '<button type="button" class="chip' + (k === t ? ' on' : '') + '" data-act="costType" data-v="' + k + '">' + esc(C.COST_TYPES[k]) + '</button>'; }).join('') + '</div>';
    b += '<div class="field"><label for="f_kname">الاسم</label><input type="text" id="f_kname" value="' + esc(d.name || '') + '" autocomplete="off">'
      + (lib.length ? '<div class="unit-chips">' + lib.map(function (m) { return '<button type="button" class="chip lib" data-act="costLib" data-id="' + esc(m.id) + '">' + ic('book') + ' ' + esc(m.name) + '</button>'; }).join('') + '</div>' : '')
      + chipsHTML(sug, 'costName') + '</div>';
    if (t === 'waste') b += '<div class="segmented" style="margin-bottom:12px"><button type="button" class="' + (d.mode !== 'pct' ? 'on' : '') + '" data-act="wasteMode" data-v="qty">كمية × سعر</button><button type="button" class="' + (d.mode === 'pct' ? 'on' : '') + '" data-act="wasteMode" data-v="pct">نسبة من الخامات</button></div>';
    if (t === 'waste' && d.mode === 'pct') {
      b += '<div class="field"><label for="f_kpct">نسبة الهالك %</label><input type="text" id="f_kpct" inputmode="decimal" dir="ltr" value="' + esc(v0(d.pct)) + '"></div>'
        + '<p class="hint" style="margin:-6px 0 12px">من تكلفة الخامات المسجلة في المشروع: ' + esc(money(C.job(job).matBase)) + '</p>';
    } else {
      b += '<div class="grid-3"><div class="field"><label for="f_kqty">الكمية</label><input type="text" id="f_kqty" inputmode="decimal" dir="ltr" value="' + esc(v0(d.qty)) + '"></div>'
        + '<div class="field"><label for="f_kunit">الوحدة</label><input type="text" id="f_kunit" value="' + esc(d.unit || '') + '"></div>'
        + '<div class="field"><label for="f_kprice">سعر الوحدة</label><input type="text" id="f_kprice" inputmode="decimal" dir="ltr" value="' + esc(v0(d.price)) + '"></div></div>'
        + chipsHTML(K.COST_UNITS[t] || [], 'costUnit');
      if (t === 'mat' || t === 'acc') b += '<div class="field" style="margin-top:10px"><label for="f_kwaste">نسبة هالك على الخامة دي % (اختياري — مش بتتحط لوحدها)</label><input type="text" id="f_kwaste" inputmode="decimal" dir="ltr" value="' + esc(v0(d.wastePct)) + '" placeholder="—"></div>';
    }
    var items = job.items;
    b += '<label class="bill-toggle"><span>على حساب العميل (بتظهر في الفاتورة)</span><input type="checkbox" id="f_kbilled"' + (d.billed ? ' checked' : '') + '></label>'
      + '<p class="hint" style="margin:4px 0 12px">مقفول = تكلفة عليك بس (بتتحسب في الربح ومش بتظهر للعميل).</p>'
      + (items.length ? '<div class="field"><label for="f_kitem">خاصة ببند (اختياري)</label><select id="f_kitem"><option value="">المشروع كله</option>' + items.map(function (it) { return '<option value="' + esc(it.id) + '"' + (d.itemId === it.id ? ' selected' : '') + '>' + esc(it.type || K.cat(it.cat).label) + '</option>'; }).join('') + '</select></div>' : '')
      + '<div class="row-2"><div class="field"><label for="f_ksup">المورد (اختياري)</label><input type="text" id="f_ksup" value="' + esc(d.supplier || '') + '"></div>'
      + '<div class="field"><label for="f_knote">ملاحظات</label><input type="text" id="f_knote" value="' + esc(d.note || '') + '"></div></div>'
      + ((t === 'mat' || t === 'acc' || t === 'cons') && !S.costId ? '<label class="check-row"><input type="checkbox" id="f_klib"> احفظها في مكتبة الخامات بسعرها</label>' : '')
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
    $('f_klbl').textContent = r.wasteCost ? 'الإجمالي (منه هالك ' + money(r.wasteCost) + ')' : (d.type === 'waste' && d.mode === 'pct' ? 'تكلفة الهالك' : 'الإجمالي');
  }
  function saveCost() {
    var job = getJob(S.jobId); if (!job) return;
    var d = readCost();
    if (!d.name) d.name = C.COST_TYPES[d.type];
    if (!(d.type === 'waste' && d.mode === 'pct') && !(C.num(d.qty) > 0)) { toast('اكتب الكمية'); return; }
    if (d.type === 'waste' && d.mode === 'pct' && !(C.num(d.pct) > 0)) { toast('اكتب نسبة الهالك'); return; }
    d.id = S.costId || uid('k');
    var i = job.costs.findIndex(function (x) { return x.id === d.id; });
    if (i >= 0) job.costs[i] = d; else job.costs.push(d);
    var sugs = K.COST_SUG[d.type] || [];
    if (sugs.indexOf(d.name) < 0) settings.costNames[d.type] = [d.name].concat(arr(settings.costNames[d.type]).filter(function (n) { return n !== d.name; })).slice(0, 10);
    if ($('f_klib') && $('f_klib').checked) settings.library.push({ id: uid('L'), name: d.name, type: d.type, buyUnit: d.unit || '', useUnit: d.unit || '', factor: 1, price: d.price, supplier: d.supplier || '' });
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
  var openJobId = null, openCustId = null, tool = null;
  function openJob(id) {
    if (!getJob(id)) return;
    openJobId = id; renderJob(id);
    var el = $('jobPage'); el.classList.add('open'); el.scrollTop = 0;
    pushLayer({ type: 'page', hide: function () { el.classList.remove('open'); openJobId = null; } });
  }
  function dimsText(it) {
    var u = UNIT_LBL[it.dimUnit] || 'سم';
    var ds = ['w', 'h', 'd'].map(function (k) { return C.num(it[k]); }).filter(function (n) { return n; });
    return ds.length ? ds.map(fq).join(' × ') + ' ' + u : '';
  }
  function itemMeta(it, r) {
    var m = it.method, bits = [C.METHODS[m].label];
    if (m === 'piece') bits.push(fq(r.qty) + ' ' + r.unit + ' × ' + fmt(r.price));
    else if (m === 'lm') bits.push(fq(r.qty) + ' م.ط × ' + fmt(r.price));
    else if (m === 'sqm') bits.push(fq(r.qty) + ' م² × ' + fmt(r.price));
    else if (m === 'board') bits.push(fq(r.qty) + ' لوح × ' + fmt(r.price));
    else if (m === 'zones') bits.push(fq(r.qty) + ' م.ط');
    else if (m === 'list') bits.push(r.rows.length + ' سطر');
    else if (m === 'daily') bits.push(fq(r.days) + ' يوم');
    else if (m === 'hour') bits.push(fq(r.qty) + ' ساعة');
    var dt = dimsText(it); if (dt && m !== 'sqm' && m !== 'lm') bits.push(dt);
    if (r.install) bits.push('تركيب ' + fmt(r.install));
    return bits.join(' · ');
  }
  function costRowHTML(c, x, job) {
    var it = c.itemId ? job.items.find(function (i) { return i.id === c.itemId; }) : null;
    var meta = c.type === 'waste' && c.mode === 'pct' ? fq(x.pct) + '% من خامات ' + fmt(x.base) : fq(x.qty) + ' ' + (c.unit || '') + ' × ' + fmt(x.price) + (x.wasteCost ? ' + هالك ' + fq(x.wastePct) + '%' : '');
    return '<div class="mat-row" data-act="editCost" data-id="' + esc(c.id) + '"><div class="m-info"><div class="m-name">' + esc(c.name || C.COST_TYPES[c.type])
      + ' <span class="src-badge">' + (c.billed ? 'على العميل' : 'عليك') + '</span></div><div class="m-meta">' + esc(meta + (it ? ' · لبند: ' + (it.type || '') : '') + (c.supplier ? ' · ' + c.supplier : '')) + '</div></div>'
      + '<span class="m-qty">' + esc(money(x.total)) + '</span></div>';
  }
  function renderJob(id) {
    var j = getJob(id); if (!j) return;
    var c = getCust(j.customerId) || {}, r = C.job(j);
    var items = j.items.map(function (it, i) {
      var x = r.items[i];
      return '<div class="item-card" data-act="editItem" data-id="' + esc(it.id) + '"><span class="room-num">' + (i + 1) + '</span>'
        + '<div class="i-info"><div class="i-name">' + esc(it.type || K.cat(it.cat).label) + '</div><div class="i-meta">' + esc(K.cat(it.cat).label + ' · ' + itemMeta(it, x)) + '</div>' + (it.desc ? '<div class="i-meta">' + esc(it.desc) + '</div>' : '') + '</div>'
        + '<div class="i-amt">' + esc(money(x.total)) + '<small>' + esc(C.METHODS[it.method].label) + '</small></div></div>';
    }).join('');
    var costsByType = C.COST_ORDER.map(function (t) {
      var list = j.costs.map(function (k, i) { return [k, r.costs[i]]; }).filter(function (p) { return p[1].type === t; });
      if (!list.length) return '';
      return '<p class="more-h">' + esc(C.COST_TYPES[t]) + '</p>' + list.map(function (p) { return costRowHTML(p[0], p[1], j); }).join('');
    }).join('');
    var pays = j.payments.slice().sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); }).map(function (p) {
      return '<div class="entry pay-row" data-act="editPay" data-id="' + esc(p.id) + '"><span class="e-ic">' + ic('cash') + '</span><div class="e-info"><div class="e-title">' + esc(p.note || 'دفعة') + '</div><div class="e-meta">' + esc(fmtDate(p.date)) + '</div></div><span class="e-amt">' + esc(money(p.amount)) + '</span></div>';
    }).join('');
    var disc = C.num(j.discount && j.discount.value) && j.discount.type === 'percent' ? ' (' + fq(j.discount.value) + '%)' : '';
    var bt = r.billedByType, otherBilled = C.money(r.billed - bt.mat - bt.acc);
    var html = '<div class="pg-head"><button type="button" class="icon-btn" data-act="closeTop" aria-label="رجوع">' + ic('back') + '</button>'
      + '<div class="titles"><h2>' + esc(c.name || 'عميل') + '</h2><div class="sub">' + esc([j.title, j.number, fmtDate(j.date)].filter(Boolean).join(' · ')) + '</div></div>'
      + '<button type="button" class="icon-btn" data-act="jobMenu" aria-label="خيارات المشروع">' + ic('more') + '</button></div><div class="container">'
      + '<section class="home-sum"><div class="hs-label">' + (j.status === 'quote' ? 'قيمة عرض السعر' : 'إجمالي المشروع') + '</div><div class="hs-value">' + esc(fmt(r.total)) + ' <small>' + esc(cur().sym) + '</small></div>'
      + '<div class="hs-stats"><button type="button" data-act="addPay"><span>المدفوع</span><strong>' + esc(fmt(r.paid)) + '</strong></button>'
      + '<button type="button" data-act="addPay"><span>المتبقي</span><strong>' + esc(fmt(r.remaining)) + '</strong></button>'
      + '<button type="button" class="mat" data-act="scrollProfit"><span>الربح التقديري</span><strong>' + esc(fmt(r.profit)) + '</strong></button></div></section>'
      + '<div class="status-row" style="margin:-4px 2px 12px">' + ['quote', 'active', 'done'].map(function (s) { return '<button type="button" class="chip' + ((j.status || 'active') === s ? ' on' : '') + '" data-act="setStatus" data-v="' + s + '">' + STATUS[s][0] + '</button>'; }).join('') + '</div>'
      // البنود
      + '<div class="card"><div class="card-title"><span class="t-ic orange">' + ic('layers') + '</span><h2>بنود الشغل</h2>' + (j.items.length ? '<span class="tag">' + j.items.length + ' بند</span>' : '') + '</div>'
      + (items || '<p class="card-empty">اختار نوع الشغل وضيف أول بند:</p>' + catGridHTML('chooseCatJob'))
      + (items ? '<button type="button" class="btn btn-soft" data-act="addItem">' + ic('plus') + ' إضافة بند</button><div class="sum-total"><span>إجمالي البنود (مصنعية + تركيب + إضافات)</span><strong>' + esc(money(r.labor + r.install + r.extras)) + '</strong></div>' : '') + '</div>'
      // الخامات والتكاليف
      + '<div class="card" id="costCard"><div class="card-title"><span class="t-ic">' + ic('box') + '</span><h2>الخامات والإكسسوارات والتكاليف</h2></div>'
      + '<div class="chips wrap" style="margin-bottom:6px">' + [['mat', 'خامة'], ['acc', 'إكسسوار'], ['cons', 'مستهلكات'], ['waste', 'هالك'], ['labor', 'عمالة'], ['transport', 'نقل'], ['install', 'تركيب'], ['other', 'مصاريف']].map(function (p) { return '<button type="button" class="chip" data-act="addCost" data-type="' + p[0] + '">+ ' + p[1] + '</button>'; }).join('') + '</div>'
      + (costsByType || '<p class="card-empty">اختياري — خشب وألواح ومفصلات ومقابض وغرا وهالك ونقل… كل حاجة بسعرها، على العميل أو تكلفة عليك.</p>')
      + '<div class="btn-row" style="margin-top:8px"><button type="button" class="btn btn-ghost btn-sm" data-act="cutForJob">' + ic('saw') + ' تقطيع الألواح</button><button type="button" class="btn btn-ghost btn-sm" data-act="woodForJob">' + ic('log') + ' الخشب الطبيعي</button></div></div>'
      // الحساب
      + '<div class="card"><div class="card-title"><span class="t-ic">' + ic('receipt') + '</span><h2>حساب العميل</h2></div><div class="sum-list">'
      + row('إجمالي المصنعية', money(r.labor)) + (r.install ? row('التركيب', money(r.install)) : '') + (r.extras ? row('إضافات (نقل، فك، تصميم…)', money(r.extras)) : '')
      + (bt.mat ? row('الخامات على العميل', money(bt.mat)) : '') + (bt.acc ? row('الإكسسوارات على العميل', money(bt.acc)) : '') + (otherBilled ? row('تكاليف أخرى على العميل', money(otherBilled)) : '')
      + '<div class="sum-row minus"><span>الخصم' + esc(disc) + ' <button type="button" class="edit-link" data-act="editDisc">' + (r.discount ? 'تعديل' : 'إضافة خصم') + '</button></span><strong>' + (r.discount ? '- ' : '') + esc(money(r.discount)) + '</strong></div>'
      + row('الإجمالي النهائي', money(r.total), 'bold') + row('المدفوع', money(r.paid)) + '</div>'
      + '<div class="sum-total"><span>' + (r.remaining < -0.005 ? 'زيادة للعميل' : 'المتبقي على العميل') + '</span><strong>' + esc(money(Math.abs(r.remaining))) + '</strong></div>'
      + (pays ? '<div style="margin-top:10px">' + pays + '</div>' : '') + '<button type="button" class="btn btn-ghost" data-act="addPay" style="margin-top:10px">' + ic('cash') + ' تسجيل دفعة</button></div>'
      // التكاليف والربح
      + '<div class="card" id="profitCard"><div class="card-title"><span class="t-ic orange">' + ic('chart') + '</span><h2>التكاليف والربح</h2></div><div class="sum-list">'
      + C.COST_ORDER.filter(function (t) { return r.byType[t]; }).map(function (t) { return row('تكلفة ' + C.COST_TYPES[t], money(r.byType[t])); }).join('')
      + row('إجمالي التكاليف المسجلة', money(r.totalCost), 'bold') + row('قيمة المشروع', money(r.total))
      + '<div class="sum-row profit' + (r.profit < 0 ? ' neg' : '') + '"><span>' + (j.costsComplete ? 'الربح' : 'الربح التقديري') + '</span><strong>' + esc(money(r.profit)) + '</strong></div>'
      + row('هامش الربح', fq(r.margin) + '%') + '</div>'
      + '<p class="cost-note">' + (j.costsComplete ? 'محسوب من كل التكاليف اللي سجلتها.' : 'ربح تقديري حسب التكاليف اللي سجلتها بس' + (r.hasCosts ? '' : ' (لسه مفيش تكاليف متسجلة)') + '.') + ' المصنعية مش هي الربح: الربح = قيمة المشروع − التكاليف. يوميات العمال في النوتة تحت.</p>'
      + '<label class="bill-toggle"><span>سجلت كل تكاليف المشروع</span><input type="checkbox" data-act="costsComplete"' + (j.costsComplete ? ' checked' : '') + '></label></div>'
      + '<div data-az-crew="' + SECTION + ':' + esc(j.customerId) + '" data-sec="' + SECTION_NAME + '" data-name="' + esc(c.name || '') + '" data-phone="' + esc(c.phone || '') + '" data-address="' + esc(c.address || '') + '" data-rev="' + esc(custRev(j.customerId)) + '" data-paid="' + esc(custPaid(j.customerId)) + '" data-cur="' + esc(cur().sym) + '"></div>'
      + '<div class="card"><div class="card-title"><span class="t-ic">' + ic('edit') + '</span><h2>ملاحظات المشروع</h2></div><textarea id="jobNotes" placeholder="بتظهر في الفاتورة">' + esc(j.notes || '') + '</textarea></div>'
      + '<div class="btn-row"><button type="button" class="btn btn-primary" data-act="preview" data-doc="invoice">' + ic('receipt') + ' الفاتورة</button><button type="button" class="btn btn-ghost" data-act="preview" data-doc="quote">' + ic('file') + ' عرض سعر</button></div>'
      + '<div class="btn-row" style="margin-top:10px"><button type="button" class="btn btn-ghost" data-act="preview" data-doc="costs">' + ic('chart') + ' كشف التكاليف (داخلي)</button><button type="button" class="btn btn-ghost" data-act="dupJob">' + ic('copy') + ' تكرار المشروع</button></div>'
      + '<button type="button" class="btn btn-danger" data-act="delJob" style="margin-top:10px">' + ic('trash') + ' حذف المشروع</button></div>'
      + '<div class="pg-foot"><div class="eb-info"><span>الإجمالي النهائي</span><strong>' + esc(money(r.total)) + '</strong></div><button type="button" class="btn btn-accent" data-act="preview" data-doc="' + (j.status === 'quote' ? 'quote' : 'invoice') + '">' + ic('print') + (j.status === 'quote' ? ' عرض السعر PDF' : ' الفاتورة PDF') + '</button></div>';
    var el = $('jobPage'), st = el.scrollTop; el.innerHTML = html; el.scrollTop = st;
    $('jobNotes').addEventListener('input', function () { j.notes = this.value; touch(j); saveDb(); });
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

  // ====================================================================
  // الأدوات: تقطيع الألواح — الخشب الطبيعي — مكتبة الخامات
  // ====================================================================
  var cutId = null;
  function openTool(name, opts) {
    tool = name; cutId = (opts && opts.cutId) || null;
    renderTool();
    var el = $('toolPage'); el.classList.add('open'); el.scrollTop = 0;
    pushLayer({ type: 'page', hide: function () { el.classList.remove('open'); tool = null; } });
  }
  function toolHead(title, sub) {
    return '<div class="pg-head"><button type="button" class="icon-btn" data-act="toolBack" aria-label="رجوع">' + ic('back') + '</button><div class="titles"><h2>' + esc(title) + '</h2><div class="sub">' + esc(sub || '') + '</div></div></div>';
  }
  function renderTool() {
    var el = $('toolPage'), st = el.scrollTop, h = '';
    if (tool === 'cut') h = cutId ? cutHTML() : cutListHTML();
    else if (tool === 'wood') h = woodHTML();
    else if (tool === 'library') h = libraryHTML();
    el.innerHTML = h; el.scrollTop = st;
    if (tool === 'cut' && cutId) renderCutResults();
    if (tool === 'wood') renderWoodResults();
  }
  // ---- تقطيع الألواح ----
  function getCut() { return db.cuts.find(function (c) { return c.id === cutId; }) || null; }
  function newCut(jobId) {
    var plan = { id: uid('x'), name: 'خطة تقطيع ' + (db.cuts.length + 1), jobId: jobId || '', kerf: '4', trim: '10', createdAt: new Date().toISOString(),
      boards: [{ id: uid('b'), name: 'MDF 18 مم', L: '2440', W: '1220', price: '', qty: '', grain: false }], parts: [] };
    db.cuts.push(plan); saveDb(); return plan;
  }
  function cutListHTML() {
    var list = db.cuts.slice().reverse();
    return toolHead('تقطيع الألواح', 'توزيع القطع على الألواح وعدد الألواح والهالك') + '<div class="container">'
      + '<button type="button" class="btn btn-accent" data-act="newCut" style="margin-bottom:14px">' + ic('plus') + ' خطة تقطيع جديدة</button>'
      + (list.length ? list.map(function (p) {
        var r = C.nest(p.boards, p.parts, { kerf: p.kerf, trim: p.trim }), j = p.jobId ? getJob(p.jobId) : null;
        return '<div class="inv-card" data-act="openCut" data-id="' + esc(p.id) + '"><div class="inv-avatar">' + ic('saw') + '</div><div class="inv-info"><div class="n">' + esc(p.name) + '</div><div class="m">' + esc([p.parts.length + ' جزء', j ? custName(j) + ' ' + j.number : ''].filter(Boolean).join(' · ')) + '</div></div><div class="inv-amount">' + r.sheets + ' لوح<small>' + esc(money(r.cost)) + '</small></div></div>';
      }).join('') : '<div class="home-empty">اكتب مقاس اللوح والقطع اللي محتاجها، والتطبيق يوزعها على الألواح ويقولك محتاج كام لوح والهالك قد إيه.</div>') + '</div>';
  }
  function cutHTML() {
    var p = getCut(); if (!p) { cutId = null; return cutListHTML(); }
    var jobs = sortedJobs();
    var boardOpts = function (sel) { return p.boards.map(function (b) { return '<option value="' + esc(b.id) + '"' + (b.id === sel ? ' selected' : '') + '>' + esc(b.name || 'لوح') + '</option>'; }).join(''); };
    return toolHead(p.name, 'المقاسات بالمليمتر') + '<div class="container">'
      + '<div class="card"><div class="field"><label>اسم الخطة</label><input type="text" data-cut="name" value="' + esc(p.name) + '"></div>'
      + '<div class="field"><label>مربوطة بمشروع (اختياري)</label><select data-cut="jobId"><option value="">من غير مشروع</option>' + jobs.map(function (j) { return '<option value="' + esc(j.id) + '"' + (j.id === p.jobId ? ' selected' : '') + '>' + esc(custName(j) + ' — ' + (j.title || j.number)) + '</option>'; }).join('') + '</select></div>'
      + '<div class="row-2"><div class="field"><label>سمك سلاح المنشار (مم)</label><input type="text" inputmode="decimal" dir="ltr" data-cut="kerf" value="' + esc(v0(p.kerf)) + '"></div>'
      + '<div class="field"><label>تهذيب أطراف اللوح (مم)</label><input type="text" inputmode="decimal" dir="ltr" data-cut="trim" value="' + esc(v0(p.trim)) + '"></div></div></div>'
      + '<div class="card"><div class="card-title"><span class="t-ic">' + ic('layers') + '</span><h2>الألواح</h2></div>'
      + p.boards.map(function (b, i) {
        return '<div class="sub-card"><div class="sc-head"><input type="text" class="grow" data-board="' + i + '" data-f="name" value="' + esc(b.name || '') + '" placeholder="الخامة والسمك">'
          + (p.boards.length > 1 ? '<button type="button" class="btn btn-danger btn-icon" data-act="delBoard" data-i="' + i + '" aria-label="حذف">' + ic('x') + '</button>' : '') + '</div>'
          + '<div class="grid-4 mini"><div><span class="mini-lbl">الطول</span><input type="text" inputmode="decimal" dir="ltr" data-board="' + i + '" data-f="L" value="' + esc(v0(b.L)) + '"></div>'
          + '<div><span class="mini-lbl">العرض</span><input type="text" inputmode="decimal" dir="ltr" data-board="' + i + '" data-f="W" value="' + esc(v0(b.W)) + '"></div>'
          + '<div><span class="mini-lbl">سعر اللوح</span><input type="text" inputmode="decimal" dir="ltr" data-board="' + i + '" data-f="price" value="' + esc(v0(b.price)) + '"></div>'
          + '<div><span class="mini-lbl">المتاح عندك</span><input type="text" inputmode="decimal" dir="ltr" data-board="' + i + '" data-f="qty" value="' + esc(v0(b.qty)) + '" placeholder="—"></div></div>'
          + '<div class="unit-chips">' + K.BOARD_SIZES.map(function (s) { return '<button type="button" class="chip" data-act="boardSize" data-i="' + i + '" data-v="' + s.join('x') + '">' + s[0] + ' × ' + s[1] + '</button>'; }).join('') + '</div>'
          + '<label class="check-row"><input type="checkbox" data-board="' + i + '" data-f="grain"' + (b.grain ? ' checked' : '') + '> اتجاه العروق مهم (العروق مع طول اللوح)</label></div>';
      }).join('') + '<button type="button" class="btn btn-ghost btn-sm" data-act="addBoard">' + ic('plus') + ' نوع لوح تاني</button></div>'
      + '<div class="card"><div class="card-title"><span class="t-ic orange">' + ic('saw') + '</span><h2>القطع المطلوبة</h2>' + (p.parts.length ? '<span class="tag">' + p.parts.length + '</span>' : '') + '</div>'
      + p.parts.map(function (q, i) {
        return '<div class="sub-card"><div class="sc-head"><input type="text" class="grow" data-part="' + i + '" data-f="name" value="' + esc(q.name || '') + '" placeholder="اسم الجزء"><button type="button" class="btn btn-danger btn-icon" data-act="delPart" data-i="' + i + '" aria-label="حذف">' + ic('x') + '</button></div>'
          + '<div class="grid-3 mini"><div><span class="mini-lbl">الطول</span><input type="text" inputmode="decimal" dir="ltr" data-part="' + i + '" data-f="L" value="' + esc(v0(q.L)) + '"></div>'
          + '<div><span class="mini-lbl">العرض</span><input type="text" inputmode="decimal" dir="ltr" data-part="' + i + '" data-f="W" value="' + esc(v0(q.W)) + '"></div>'
          + '<div><span class="mini-lbl">العدد</span><input type="text" inputmode="decimal" dir="ltr" data-part="' + i + '" data-f="count" value="' + esc(v0(q.count)) + '"></div></div>'
          + (p.boards.length > 1 ? '<div class="mini" style="margin-top:6px"><select data-part="' + i + '" data-f="boardId">' + boardOpts(q.boardId) + '</select></div>' : '')
          + '<label class="check-row"><input type="checkbox" data-part="' + i + '" data-f="grain"' + (q.grain ? ' checked' : '') + '> الطول مع العروق (ما تتلفش)</label></div>';
      }).join('')
      + '<div class="unit-chips">' + ['جنب', 'رف', 'سقف', 'قاعدة', 'ضلفة', 'ظهر', 'وش درج', 'قاطوع'].map(function (n) { return '<button type="button" class="chip" data-act="addPart" data-v="' + n + '">+ ' + n + '</button>'; }).join('') + '</div>'
      + '<div class="btn-row"><button type="button" class="btn btn-ghost btn-sm" data-act="addPart" data-v="">' + ic('plus') + ' جزء</button>'
      + (p.jobId ? '<button type="button" class="btn btn-ghost btn-sm" data-act="importParts">' + ic('layers') + ' من بنود المشروع</button>' : '') + '</div></div>'
      + '<div id="cutRes"></div>'
      + '<button type="button" class="btn btn-danger" data-act="delCut" style="margin-top:10px">' + ic('trash') + ' حذف الخطة</button></div>';
  }
  var COLORS = ['#f5b041', '#5dade2', '#58d68d', '#eb984e', '#af7ac5', '#f1948a', '#48c9b0', '#f7dc6f', '#85929e', '#dc7633'];
  function sheetSVG(b, s) {
    var names = [];
    return '<svg class="cut-svg" viewBox="0 0 ' + b.L + ' ' + b.W + '" preserveAspectRatio="xMidYMid meet" role="img" aria-label="توزيع القطع على اللوح">'
      + '<rect x="0" y="0" width="' + b.L + '" height="' + b.W + '" class="cut-board"/>'
      + s.placed.map(function (p) {
        var k = names.indexOf(p.name); if (k < 0) { names.push(p.name); k = names.length - 1; }
        var fs = Math.max(Math.min(p.l, p.w) / 5, 22), big = p.l > fs * 3 && p.w > fs * 1.4;
        return '<g><rect x="' + p.x + '" y="' + p.y + '" width="' + p.l + '" height="' + p.w + '" fill="' + COLORS[k % COLORS.length] + '" class="cut-part"/>'
          + (big ? '<text x="' + (p.x + p.l / 2) + '" y="' + (p.y + p.w / 2) + '" font-size="' + Math.min(fs, 90) + '" text-anchor="middle" dominant-baseline="middle">' + esc(p.name) + ' ' + p.L + '×' + p.W + '</text>' : '') + '</g>';
      }).join('') + '</svg>';
  }
  function cutResultsHTML(p, forDoc) {
    var r = C.nest(p.boards, p.parts, { kerf: p.kerf, trim: p.trim });
    var h = r.boards.map(function (b) {
      if (!b.partsCount) return '';
      return '<div class="cut-board-res"><div class="sum-list">' + row(b.name + ' — ' + b.L + ' × ' + b.W, b.count + ' لوح', 'bold') + row('الحد الأدنى النظري (بالمساحة بس)', b.minSheets + ' لوح') + row('عدد القطع', String(b.partsCount))
        + row('مساحة القطع', fq(b.partsArea / 1e6) + ' م²') + row('الهالك والبواقي', fq(b.wasteArea / 1e6) + ' م² (' + fq(b.wastePct) + '%)') + (b.price ? row('تكلفة الألواح', money(b.cost)) : '') + '</div>'
        + (b.short ? '<div class="warn-box">محتاج <b>' + b.short + '</b> لوح زيادة عن المتاح عندك (' + b.available + ').</div>' : '')
        + b.sheets.map(function (s, i) { return '<div class="cut-sheet"><div class="cut-cap">لوح ' + (i + 1) + ' — ' + s.placed.length + ' قطعة · مستغل ' + fq(s.usedPct) + '%</div>' + sheetSVG(b, s) + '</div>'; }).join('') + '</div>';
    }).join('');
    if (r.tooBig.length) h += '<div class="warn-box"><b>قطع أكبر من اللوح</b> (مش محسوبة): ' + r.tooBig.map(function (t) { return esc(t.name + ' ' + t.L + '×' + t.W); }).join('، ') + '</div>';
    if (r.limited) h += '<div class="warn-box">العدد كبير جداً — اتحسب أول 3000 قطعة بس.</div>';
    if (!h) return forDoc ? '' : '<div class="home-empty">ضيف القطع المطلوبة (الطول × العرض بالمليمتر والعدد).</div>';
    return (forDoc ? '' : '<div class="card"><div class="card-title"><span class="t-ic orange">' + ic('chart') + '</span><h2>النتيجة: ' + r.sheets + ' لوح' + (r.cost ? ' · ' + esc(money(r.cost)) : '') + '</h2></div>')
      + h + '<p class="cost-note">توزيع حقيقي بقطعات مستقيمة من طرف لطرف (تتقص على منشار الألواح)، شامل سمك السلاح وتهذيب الأطراف واتجاه العروق. مش بالضرورة أوفر توزيع ممكن — ممكن نجار شاطر يوفّر أكتر بإيده.</p>'
      + (forDoc ? '' : '<div class="btn-row"><button type="button" class="btn btn-primary" data-act="cutToJob">' + ic('box') + ' أضف الألواح لمشروع</button><button type="button" class="btn btn-ghost" data-act="cutPrint">' + ic('print') + ' طباعة الخطة</button></div></div>');
  }
  function renderCutResults() { var p = getCut(), el = $('cutRes'); if (p && el) el.innerHTML = cutResultsHTML(p); }
  var cutT;
  function onToolInput(e) {
    var el = e.target, v = el.type === 'checkbox' ? el.checked : el.value;
    if (tool === 'cut') {
      var p = getCut(); if (!p) return;
      if (el.dataset.cut) { p[el.dataset.cut] = v; if (el.dataset.cut === 'jobId') { saveDb(); renderTool(); return; } }
      else if (el.dataset.board) { var b = p.boards[+el.dataset.board]; if (b) b[el.dataset.f] = v; if (el.dataset.f === 'name') { saveDb(); } }
      else if (el.dataset.part) { var q = p.parts[+el.dataset.part]; if (q) q[el.dataset.f] = v; }
      else return;
      clearTimeout(cutT); cutT = setTimeout(function () { saveDb(); renderCutResults(); }, 250);
    } else if (tool === 'wood' && el.dataset.wood) {
      var w = settings.wood[+el.dataset.wood]; if (w) { w[el.dataset.f] = v; saveSettings(); renderWoodResults(); }
    }
  }
  $('toolPage').addEventListener('input', onToolInput);
  $('toolPage').addEventListener('change', function (e) { if (e.target.type === 'checkbox' || e.target.tagName === 'SELECT') onToolInput(e); });
  function importParts() {
    var p = getCut(), j = p && getJob(p.jobId); if (!j) return;
    var n = 0;
    j.items.forEach(function (it) {
      arr(it.cutParts).forEach(function (q) {
        if (!(C.num(q.L) && C.num(q.W))) return;
        p.parts.push({ id: uid('q'), name: (q.name || 'جزء') + ' — ' + (it.type || ''), L: String(C.round(C.toMM(q.L, it.dimUnit), 1)), W: String(C.round(C.toMM(q.W, it.dimUnit), 1)), count: v0(q.count) || '1', boardId: p.boards[0].id, grain: false });
        n++;
      });
    });
    saveDb(); renderTool();
    toast(n ? 'اتضاف ' + n + ' جزء من بنود المشروع' : 'مفيش أجزاء للتقطيع في بنود المشروع (الخطوة 2 في البند)');
  }
  function addCutCostsTo(jobId, billed) {
    var p = getCut(), job = getJob(jobId); if (!p || !job) return 0;
    var r = C.nest(p.boards, p.parts, { kerf: p.kerf, trim: p.trim }), n = 0;
    r.boards.forEach(function (b) { if (!b.count) return; job.costs.push({ id: uid('k'), type: 'mat', name: b.name + ' (' + b.L + '×' + b.W + ')', qty: String(b.count), unit: 'لوح', price: String(b.price || ''), billed: billed, note: 'من ' + p.name }); n++; });
    touch(job); saveDb(); return n;
  }
  // ---- الخشب الطبيعي ----
  function woodHTML() {
    if (!settings.wood.length) settings.wood.push({ type: '', L: '', W: '', T: '', count: '1', unit: 'm3', price: '' });
    return toolHead('الخشب الطبيعي', 'المقاسات بالسنتيمتر — الحجم = ط × ع × س ÷ 1,000,000') + '<div class="container"><div class="card">'
      + settings.wood.map(function (w, i) {
        return '<div class="sub-card"><div class="sc-head"><input type="text" class="grow" data-wood="' + i + '" data-f="type" value="' + esc(w.type || '') + '" placeholder="نوع الخشب"><button type="button" class="btn btn-danger btn-icon" data-act="delWood" data-i="' + i + '" aria-label="حذف">' + ic('x') + '</button></div>'
          + '<div class="grid-4 mini">' + [['L', 'الطول'], ['W', 'العرض'], ['T', 'السمك'], ['count', 'العدد']].map(function (f) { return '<div><span class="mini-lbl">' + f[1] + '</span><input type="text" inputmode="decimal" dir="ltr" data-wood="' + i + '" data-f="' + f[0] + '" value="' + esc(v0(w[f[0]])) + '"></div>'; }).join('') + '</div>'
          + '<div class="grid-2 mini" style="margin-top:6px"><div><span class="mini-lbl">التسعير</span><select data-wood="' + i + '" data-f="unit">' + Object.keys(C.WOOD_UNITS).map(function (u) { return '<option value="' + u + '"' + (w.unit === u ? ' selected' : '') + '>بالـ' + C.WOOD_UNITS[u] + '</option>'; }).join('') + '</select></div>'
          + '<div><span class="mini-lbl">السعر</span><input type="text" inputmode="decimal" dir="ltr" data-wood="' + i + '" data-f="price" value="' + esc(v0(w.price)) + '"></div></div>'
          + '<div class="line-total" data-wr="' + i + '"></div>' + chipsHTML(K.FIELDS.wood.sug, 'woodType', ' data-i="' + i + '"') + '</div>';
      }).join('') + '<button type="button" class="btn btn-ghost btn-sm" data-act="addWood">' + ic('plus') + ' قطعة بمقاس تاني</button></div>'
      + '<div class="card"><div class="sum-list" id="woodSum"></div><div class="btn-row" style="margin-top:10px"><button type="button" class="btn btn-primary" data-act="woodToJob">' + ic('box') + ' أضفه لمشروع</button><button type="button" class="btn btn-ghost" data-act="woodClear">مسح الكل</button></div></div></div>';
  }
  function renderWoodResults() {
    var w = C.wood(settings.wood);
    w.rows.forEach(function (r, i) { var el = document.querySelector('[data-wr="' + i + '"]'); if (el) el.textContent = fq(r.vol) + ' م³ (' + fq(r.ft3) + ' قدم) · ' + fq(r.lm) + ' م.ط · ' + money(r.cost); });
    var s = $('woodSum'); if (s) s.innerHTML = row('إجمالي الحجم', fq(w.vol) + ' م³') + row('بالقدم المكعب', fq(w.ft3) + ' قدم³') + row('عدد القطع', fq(w.pieces)) + row('تكلفة الخشب', money(w.cost), 'bold');
  }
  // ---- مكتبة الخامات ----
  function libraryHTML() {
    return toolHead('مكتبة الخامات', 'أسعارك ووحداتك ومورّدينك — بتتملى في أي مشروع بضغطة') + '<div class="container">'
      + '<button type="button" class="btn btn-accent" data-act="libNew" style="margin-bottom:14px">' + ic('plus') + ' خامة أو مستلزم جديد</button>'
      + (settings.library.length ? C.COST_ORDER.map(function (t) {
        var l = settings.library.filter(function (m) { return (m.type || 'mat') === t; }); if (!l.length) return '';
        return '<p class="more-h">' + esc(C.COST_TYPES[t]) + '</p>' + l.map(function (m) {
          var up = C.num(m.price) / (C.num(m.factor) || 1);
          return '<div class="mat-row" data-act="libEdit" data-id="' + esc(m.id) + '"><div class="m-info"><div class="m-name">' + esc(m.name) + '</div><div class="m-meta">' + esc([m.thick, m.size, (m.buyUnit ? 'شراء بالـ' + m.buyUnit : ''), m.supplier].filter(Boolean).join(' · ')) + '</div></div><span class="m-qty">' + esc(money(up)) + (m.useUnit ? ' / ' + esc(m.useUnit) : '') + '</span></div>';
        }).join('');
      }).join('') : '<div class="home-empty">سجّل الخامات اللي بتشتغل بيها بأسعارها (MDF، كونتر، مفصلات، غرا…) علشان تتملى في الحسابات على طول.</div>') + '</div>';
  }
  function openLibSheet(id) {
    var m = id ? settings.library.find(function (x) { return x.id === id; }) : null, d = m || { type: 'mat', factor: 1 };
    openSheet(m ? 'تعديل خامة' : 'خامة جديدة',
      '<div class="chips wrap">' + ['mat', 'acc', 'cons'].map(function (k) { return '<button type="button" class="chip' + ((d.type || 'mat') === k ? ' on' : '') + '" data-act="libType" data-v="' + k + '">' + C.COST_TYPES[k] + '</button>'; }).join('') + '</div>'
      + '<div class="field"><label for="f_lname">الاسم</label><input type="text" id="f_lname" value="' + esc(d.name || '') + '">' + chipsHTML(K.COST_SUG.mat.slice(0, 9), 'libName') + '</div>'
      + '<div class="row-2"><div class="field"><label for="f_lthick">السمك</label><input type="text" id="f_lthick" value="' + esc(d.thick || '') + '" placeholder="18 مم"></div><div class="field"><label for="f_lsize">المقاس</label><input type="text" id="f_lsize" value="' + esc(d.size || '') + '" placeholder="244 × 122"></div></div>'
      + '<div class="row-2"><div class="field"><label for="f_lbuy">وحدة الشراء</label><input type="text" id="f_lbuy" value="' + esc(d.buyUnit || '') + '" placeholder="لوح / علبة"></div><div class="field"><label for="f_lprice">سعر وحدة الشراء</label><input type="text" id="f_lprice" inputmode="decimal" dir="ltr" value="' + esc(v0(d.price)) + '"></div></div>'
      + '<div class="row-2"><div class="field"><label for="f_luse">وحدة الاستخدام</label><input type="text" id="f_luse" value="' + esc(d.useUnit || '') + '" placeholder="م² / قطعة"></div><div class="field"><label for="f_lfactor">وحدة الشراء فيها كام وحدة استخدام</label><input type="text" id="f_lfactor" inputmode="decimal" dir="ltr" value="' + esc(v0(d.factor)) + '"></div></div>'
      + '<div class="field"><label for="f_lsup">المورد (اختياري)</label><input type="text" id="f_lsup" value="' + esc(d.supplier || '') + '"></div>'
      + '<button type="button" class="btn btn-accent" data-act="libSave">' + ic('check') + ' حفظ</button>' + (m ? '<button type="button" class="btn btn-danger" data-act="libDel" style="margin-top:10px">' + ic('trash') + ' حذف</button>' : ''),
      { form: 'lib', libId: id || null, ltype: d.type || 'mat' });
  }
  // ---- أنواع الشغل بتاعتك ----
  function openTypeSheet(id, fromItem) {
    var t = id ? settings.types.find(function (x) { return x.id === id; }) : null;
    var d = t ? clone(t) : (fromItem || { name: '', cat: 'custom', method: 'piece', unitLabel: '', price: '', desc: '', dims: ['w', 'h', 'd'], lines: [] });
    d.lines = arr(d.lines); d.dims = arr(d.dims).length ? d.dims : ['w', 'h', 'd'];
    openSheet(t ? 'تعديل نوع شغل' : 'نوع شغل جديد', '', { form: 'type', typeId: id || null, tpl: d });
    renderTypeSheet();
  }
  function renderTypeSheet() {
    var d = S.tpl;
    $('sheetBody').innerHTML = '<div class="field"><label for="f_tname">اسم الشغل</label><input type="text" id="f_tname" value="' + esc(d.name || '') + '" placeholder="مثلاً: وحدة حوض، صندوق خشب، مكتب 120"></div>'
      + '<div class="field"><label for="f_tdesc">الوصف (اختياري)</label><input type="text" id="f_tdesc" value="' + esc(d.desc || '') + '"></div>'
      + '<div class="field"><label for="f_tcat">التخصص</label><select id="f_tcat">' + K.CATS.map(function (c) { return '<option value="' + c.id + '"' + (c.id === d.cat ? ' selected' : '') + '>' + esc(c.label) + '</option>'; }).join('') + '</select></div>'
      + '<div class="field"><label>طريقة حساب المصنعية</label><div class="chips wrap">' + C.METHOD_ORDER.map(function (m) { return '<button type="button" class="chip' + (m === d.method ? ' on' : '') + '" data-act="tplMethod" data-v="' + m + '">' + esc(C.METHODS[m].label) + '</button>'; }).join('') + '</div></div>'
      + '<div class="row-2"><div class="field"><label for="f_tunit">وحدة الحساب</label><input type="text" id="f_tunit" value="' + esc(d.unitLabel || '') + '" placeholder="' + esc(C.METHODS[d.method].unit) + '"></div>'
      + '<div class="field"><label for="f_tprice">سعرك (اختياري)</label><input type="text" id="f_tprice" inputmode="decimal" dir="ltr" value="' + esc(v0(d.price)) + '"></div></div>'
      + '<div class="field"><label>خانات المقاسات</label>' + [['w', 'العرض / الطول'], ['h', 'الارتفاع'], ['d', 'العمق / السمك']].map(function (p) { return '<label class="check-row"><input type="checkbox" data-tdim="' + p[0] + '"' + (d.dims.indexOf(p[0]) >= 0 ? ' checked' : '') + '> ' + p[1] + '</label>'; }).join('') + '</div>'
      + '<p class="more-h">خامات ومستهلكات بتتضاف تلقائي (اختياري)</p>'
      + d.lines.map(function (l, i) {
        return '<div class="sub-card"><div class="sc-head"><select data-trow="' + i + '" data-f="type">' + ['mat', 'acc', 'cons'].map(function (k) { return '<option value="' + k + '"' + (l.type === k ? ' selected' : '') + '>' + C.COST_TYPES[k] + '</option>'; }).join('') + '</select>'
          + '<input type="text" class="grow" data-trow="' + i + '" data-f="name" value="' + esc(l.name || '') + '" placeholder="الاسم"><button type="button" class="btn btn-danger btn-icon" data-act="tplDelLine" data-i="' + i + '" aria-label="حذف">' + ic('x') + '</button></div>'
          + '<div class="grid-3 mini"><div><span class="mini-lbl">الكمية</span><input type="text" inputmode="decimal" dir="ltr" data-trow="' + i + '" data-f="qty" value="' + esc(v0(l.qty)) + '"></div><div><span class="mini-lbl">الوحدة</span><input type="text" data-trow="' + i + '" data-f="unit" value="' + esc(l.unit || '') + '"></div><div><span class="mini-lbl">السعر</span><input type="text" inputmode="decimal" dir="ltr" data-trow="' + i + '" data-f="price" value="' + esc(v0(l.price)) + '"></div></div></div>';
      }).join('') + '<button type="button" class="btn btn-ghost btn-sm" data-act="tplAddLine">' + ic('plus') + ' خامة / مستهلك</button>'
      + '<button type="button" class="btn btn-accent" data-act="tplSave" style="margin-top:14px">' + ic('check') + ' حفظ نوع الشغل</button>'
      + (S.typeId ? '<button type="button" class="btn btn-danger" data-act="tplDel" style="margin-top:10px">' + ic('trash') + ' حذف</button>' : '');
  }
  function readTpl() {
    var d = S.tpl;
    if ($('f_tname')) { d.name = $('f_tname').value.trim(); d.desc = $('f_tdesc').value.trim(); d.cat = $('f_tcat').value; d.unitLabel = $('f_tunit').value.trim(); d.price = $('f_tprice').value; }
    var dims = Array.prototype.filter.call(sheet.querySelectorAll('[data-tdim]'), function (x) { return x.checked; }).map(function (x) { return x.dataset.tdim; });
    if (sheet.querySelector('[data-tdim]')) d.dims = dims;
    return d;
  }

  // ====================================================================
  // المستندات: فاتورة — عرض سعر — كشف حساب — كشف التكاليف (داخلي) — خطة التقطيع
  // ====================================================================
  var pv = null;
  function business() { var b = settings.business || {}; return { name: b.name || '', trade: 'أعمال النجارة والأثاث', phone: b.phone || '', address: b.address || '' }; }
  function detailsText(it) {
    var cat = K.cat(it.cat), bits = [];
    var dt = dimsText(it); if (dt) bits.push(dt);
    cat.fields.forEach(function (f) { var v = it.details && it.details[f]; if (v && String(v).trim() && f !== 'problem') bits.push(K.FIELDS[f].label + ': ' + v); });
    if (it.inc) { var inc = [['frame', 'الحلق'], ['install', 'التركيب'], ['acc', 'الإكسسوارات']].filter(function (p) { return it.inc[p[0]]; }).map(function (p) { return p[1]; }); if (inc.length) bits.push('شامل ' + inc.join(' و')); }
    return bits;
  }
  function qtyText(it, x) {
    var m = it.method;
    if (m === 'piece') return '<b>' + fq(x.qty) + '</b> ' + esc(x.unit);
    if (m === 'lm') return fq(x.len) + ' م' + (x.qty !== x.len ? ' × ' + fq(C.num(it.qty)) : '') + ' = <b>' + fq(x.qty) + ' م.ط</b>';
    if (m === 'sqm') return fq(x.w) + ' × ' + fq(x.h) + ' م' + (x.qty !== x.areaEach ? ' × ' + fq(x.qty / (x.areaEach || 1)) : '') + ' = <b>' + fq(x.qty) + ' م²</b>';
    if (m === 'board') return '<b>' + fq(x.qty) + '</b> لوح';
    if (m === 'zones') return '<b>' + fq(x.qty) + ' م.ط</b>';
    if (m === 'daily') return fq(x.days) + ' يوم' + (x.perWorker ? ' × ' + fq(x.workers) + ' عامل' : '');
    if (m === 'hour') return '<b>' + fq(x.qty) + '</b> ساعة';
    if (m === 'list') return '<b>' + fq(x.qty) + '</b> قطعة';
    return '—';
  }
  function priceText(it, x) { return ['piece', 'lm', 'sqm', 'board', 'daily', 'hour'].indexOf(it.method) >= 0 ? fmt(x.price) : '—'; }
  function jobDocHTML(j, doc) {
    var r = C.job(j), c = getCust(j.customerId) || {}, A = window.ArzaqiInvoice, rows = '';
    j.items.forEach(function (it, i) {
      var x = r.items[i], sub = detailsText(it).concat(it.desc ? [it.desc] : []).concat(it.notes ? [it.notes] : []);
      rows += '<tr><td class="idx">' + (i + 1) + '</td><td class="t">' + A.esc(it.type || K.cat(it.cat).label) + sub.map(function (s) { return '<span class="sub-note">' + A.esc(s) + '</span>'; }).join('') + '</td>'
        + '<td>' + A.esc(K.cat(it.cat).label) + '</td><td>' + A.esc(C.METHODS[it.method].label) + '</td><td>' + qtyText(it, x) + '</td><td class="money">' + priceText(it, x) + '</td><td class="money">' + money(x.total) + '</td></tr>';
      var subs = [];
      if (it.method === 'list') x.rows.forEach(function (q) { subs.push([q.name + (q.qty !== 1 ? ' × ' + fq(q.qty) : ''), q.total]); });
      if (it.method === 'zones') x.zones.forEach(function (z) { if (z.len) subs.push([{ base: 'وحدات أرضية', wall: 'وحدات علوية', tall: 'وحدات طويلة' }[z.key] + ' ' + fq(z.len) + ' م × ' + fmt(z.price), z.total]); });
      if (it.method === 'parts') x.parts.forEach(function (p) { if (p.qty) subs.push([{ units: 'وحدات', doors: 'ضلف', drawers: 'أدراج', shelves: 'أرفف' }[p.key] + ' ' + fq(p.qty) + ' × ' + fmt(p.price), p.total]); });
      if (x.install && (x.labor || x.extrasTotal)) subs.push(['مصنعية التركيب', x.install]);
      x.extras.forEach(function (e) { if (e.amount) subs.push([e.name || 'إضافة', e.amount]); });
      if (subs.length > 1 || (subs.length && it.method !== 'list')) subs.forEach(function (s) { rows += '<tr class="task"><td></td><td class="t" colspan="4">— ' + A.esc(s[0]) + '</td><td class="money">' + money(s[1]) + '</td><td></td></tr>'; });
    });
    var body = '<div class="inv-sec"><span class="n">1</span> بنود الشغل</div><table class="p-table"><thead><tr><th>م</th><th>البند والتفاصيل</th><th>النوع</th><th>طريقة الحساب</th><th>الكمية / المقاسات</th><th>سعر الوحدة</th><th>الإجمالي</th></tr></thead><tbody>'
      + (rows || '<tr><td colspan="7">لسه مفيش بنود</td></tr>') + '</tbody><tfoot><tr><td colspan="6">إجمالي البنود</td><td>' + money(r.labor + r.install + r.extras) + '</td></tr></tfoot></table>';
    var sec = 1;
    [['mat', 'الخامات'], ['acc', 'الإكسسوارات'], ['other', 'تكاليف أخرى']].forEach(function (g) {
      var list = j.costs.map(function (k, i) { return [k, r.costs[i]]; }).filter(function (p) { return p[1].billed && (g[0] === 'other' ? (p[1].type !== 'mat' && p[1].type !== 'acc') : p[1].type === g[0]); });
      if (!list.length) return;
      sec++;
      body += '<div class="inv-sec"><span class="n">' + sec + '</span> ' + g[1] + '</div><table class="p-table"><thead><tr><th>م</th><th>البيان</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th></tr></thead><tbody>'
        + list.map(function (p, i) { var it = p[0].itemId ? j.items.find(function (q) { return q.id === p[0].itemId; }) : null; return '<tr><td class="idx">' + (i + 1) + '</td><td class="t">' + A.esc(p[0].name || C.COST_TYPES[p[1].type]) + (it ? '<span class="sub-note">' + A.esc('لبند: ' + (it.type || '')) + '</span>' : '') + (p[1].wasteCost ? '<span class="sub-note">شامل هالك ' + fq(p[1].wastePct) + '%</span>' : '') + '</td><td>' + (p[1].type === 'waste' && p[0].mode === 'pct' ? fq(p[1].pct) + '%' : fq(p[1].qty) + ' ' + A.esc(p[0].unit || '')) + '</td><td class="money">' + (p[1].price ? fmt(p[1].price) : '—') + '</td><td class="money">' + money(p[1].total) + '</td></tr>'; }).join('')
        + '</tbody></table>';
    });
    var bt = r.billedByType, notes = [j.notes, settings.terms].map(function (s) { return String(s || '').trim(); }).filter(Boolean), cc = cur();
    var discLbl = 'الخصم' + (j.discount && j.discount.type === 'percent' && C.num(j.discount.value) ? ' (' + fq(j.discount.value) + '%)' : '');
    return A.render({
      section: SECTION, docKey: doc + ':' + j.id, docLabel: doc === 'quote' ? 'عرض سعر' : 'فاتورة', number: j.number, date: fmtDate(j.date || today()),
      billable: doc !== 'quote', currency: cc.name + ' (' + cc.sym + ')', business: business(),
      client: { name: c.name || '', phone: c.phone || '', address: c.address || '', note: c.note || '' }, fields: [{ label: 'المشروع', value: j.title || '' }],
      bodyHTML: body, notesHTML: notes.length ? '<div class="inv-notes"><h4>ملاحظات</h4>' + notes.map(function (n) { return '<div>' + A.esc(n).replace(/\n/g, '<br>') + '</div>'; }).join('') + '</div>' : '',
      totals: { lines: [['إجمالي المصنعية', r.labor], ['التركيب', r.install], ['إضافات', r.extras], ['الخامات', bt.mat], ['الإكسسوارات', bt.acc], ['تكاليف أخرى', C.money(r.billed - bt.mat - bt.acc)], [discLbl, r.discount, '-']],
        total: r.total, totalLabel: doc === 'quote' ? 'إجمالي العرض' : 'الإجمالي النهائي', paid: r.paid, paidLabel: 'المدفوع' },
      netLabel: 'إجمالي عرض السعر', money: money, signLabel: 'توقيع النجار'
    });
  }
  function costsDocHTML(j) {
    var r = C.job(j), c = getCust(j.customerId) || {}, A = window.ArzaqiInvoice, cc = cur();
    var body = '<div class="inv-sec"><span class="n">1</span> التكاليف (داخلي — مش للعميل)</div><table class="p-table"><thead><tr><th>م</th><th>البيان</th><th>النوع</th><th>الكمية</th><th>سعر الوحدة</th><th>هالك</th><th>الإجمالي</th></tr></thead><tbody>'
      + (j.costs.map(function (k, i) { var x = r.costs[i]; return '<tr><td class="idx">' + (i + 1) + '</td><td class="t">' + A.esc(k.name || '') + (k.supplier ? '<span class="sub-note">' + A.esc(k.supplier) + '</span>' : '') + (k.billed ? '<span class="sub-note">على العميل</span>' : '') + '</td><td>' + A.esc(C.COST_TYPES[x.type]) + '</td><td>' + (x.type === 'waste' && k.mode === 'pct' ? fq(x.pct) + '%' : fq(x.qty) + ' ' + A.esc(k.unit || '')) + '</td><td class="money">' + (x.price ? fmt(x.price) : '—') + '</td><td class="money">' + (x.wasteCost ? money(x.wasteCost) : '—') + '</td><td class="money">' + money(x.total) + '</td></tr>'; }).join('') || '<tr><td colspan="7">لسه مفيش تكاليف متسجلة</td></tr>')
      + '</tbody><tfoot><tr><td colspan="6">إجمالي التكاليف</td><td>' + money(r.totalCost) + '</td></tr></tfoot></table>';
    var summary = '<div class="inv-notes"><h4>الربح</h4><div>قيمة المشروع: <b>' + money(r.total) + '</b></div><div>إجمالي التكاليف: <b>' + money(r.totalCost) + '</b></div><div>' + (j.costsComplete ? 'الربح' : 'الربح التقديري') + ': <b>' + money(r.profit) + '</b> (هامش ' + fq(r.margin) + '%)</div>'
      + (j.costsComplete ? '' : '<div>تقديري حسب التكاليف اللي اتسجلت بس.</div>') + '</div>';
    return A.render({
      section: SECTION, docKey: 'costs:' + j.id, docLabel: 'كشف التكاليف والربح', number: j.number, date: fmtDate(today()), billable: false, currency: cc.name + ' (' + cc.sym + ')', business: business(),
      client: { name: c.name || '', phone: c.phone || '' }, fields: [{ label: 'المشروع', value: j.title || '' }, { label: 'مستند', value: 'داخلي' }], bodyHTML: body, notesHTML: summary,
      totals: { lines: C.COST_ORDER.filter(function (t) { return r.byType[t]; }).map(function (t) { return [C.COST_TYPES[t], r.byType[t]]; }), total: r.totalCost, totalLabel: 'إجمالي التكاليف' },
      netLabel: 'إجمالي التكاليف', boxTitle: 'التكاليف', money: money, noWarranty: true, signs: []
    });
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
  function cutDocHTML(p) {
    var A = window.ArzaqiInvoice, r = C.nest(p.boards, p.parts, { kerf: p.kerf, trim: p.trim }), j = p.jobId ? getJob(p.jobId) : null, c = j ? getCust(j.customerId) || {} : {};
    var parts = '<div class="inv-sec"><span class="n">1</span> القطع (مم)</div><table class="p-table"><thead><tr><th>م</th><th>الجزء</th><th>الطول</th><th>العرض</th><th>العدد</th><th>اللوح</th></tr></thead><tbody>'
      + p.parts.map(function (q, i) { var b = p.boards.find(function (x) { return x.id === q.boardId; }) || p.boards[0]; return '<tr><td class="idx">' + (i + 1) + '</td><td class="t">' + A.esc(q.name || '') + '</td><td>' + fq(C.num(q.L)) + '</td><td>' + fq(C.num(q.W)) + '</td><td>' + fq(C.num(q.count) || 1) + '</td><td>' + A.esc(b ? b.name : '') + '</td></tr>'; }).join('') + '</tbody></table>';
    return A.render({ section: SECTION, docKey: 'cut:' + p.id, docLabel: 'خطة تقطيع الألواح', date: fmtDate(today()), billable: false, business: business(),
      client: { name: c.name || p.name, phone: c.phone || '' }, fields: [{ label: 'الخطة', value: p.name }, { label: 'سلاح المنشار', value: fq(C.num(p.kerf)) + ' مم' }, { label: 'تهذيب الأطراف', value: fq(C.num(p.trim)) + ' مم' }],
      bodyHTML: parts + '<div class="inv-sec"><span class="n">2</span> توزيع القطع على الألواح — ' + r.sheets + ' لوح</div><div class="cut-doc">' + cutResultsHTML(p, true) + '</div>',
      totals: { lines: r.boards.filter(function (b) { return b.count; }).map(function (b) { return [b.name + ' × ' + b.count, b.cost]; }), total: r.cost, totalLabel: 'تكلفة الألواح' },
      netLabel: 'تكلفة الألواح', boxTitle: 'الألواح', money: money, noWarranty: true, signs: [] });
  }
  function docTitle() {
    if (!pv) return document.title;
    if (pv.custId) return 'كشف حساب — ' + ((getCust(pv.custId) || {}).name || '');
    if (pv.cutId) { var p = db.cuts.find(function (x) { return x.id === pv.cutId; }); return 'خطة تقطيع — ' + (p ? p.name : ''); }
    var j = getJob(pv.jobId) || {};
    return ({ quote: 'عرض سعر', costs: 'كشف التكاليف', invoice: 'فاتورة' }[pv.doc] || 'فاتورة') + ' ' + (j.number || '') + ' — ' + custName(j);
  }
  function openPreview(o) {
    pv = o; renderPreview();
    var m = $('printPreviewModal'); m.style.display = 'block'; m.scrollTop = 0;
    pushLayer({ type: 'preview', hide: function () { m.style.display = 'none'; pv = null; } });
    fitPreview(); if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitPreview); setTimeout(fitPreview, 300);
  }
  function renderPreview() {
    if (!pv) return;
    $('pvDocs').innerHTML = pv.jobId ? [['invoice', 'فاتورة'], ['quote', 'عرض سعر'], ['costs', 'التكاليف']].map(function (d) { return '<button type="button" data-act="pvDoc" data-doc="' + d[0] + '" class="' + (pv.doc === d[0] ? 'on' : '') + '">' + d[1] + '</button>'; }).join('') : '';
    var p = pv.cutId ? db.cuts.find(function (x) { return x.id === pv.cutId; }) : null;
    $('printSheet').innerHTML = pv.custId ? statementHTML(pv.custId) : p ? cutDocHTML(p) : pv.doc === 'costs' ? costsDocHTML(getJob(pv.jobId)) : jobDocHTML(getJob(pv.jobId), pv.doc);
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
  var ACT = {
    closeTop: function () { closeTop(); },
    toolBack: function () { if (tool === 'cut' && cutId) { cutId = null; renderTool(); } else closeTop(); },
    view: function (b) { var go = function () { if (b.dataset.filter) jobFilter.f = b.dataset.filter; switchView(b.dataset.view); }; if (stack.length) closeTop(go); else go(); },
    create: function () {
      openSheet('إنشاء جديد', '<div class="create-list"><button type="button" class="create-opt dark" data-act="newJob"><span class="q-ic orange">' + ic('plus') + '</span><span><b>مشروع جديد</b><small>عميل + بنود من أي نوع + فاتورة</small></span></button>'
        + '<p class="more-h">أو ابدأ بنوع الشغل على طول</p>' + catGridHTML('quickCatSheet')
        + '<div class="create-row"><button type="button" class="create-opt" data-act="tool" data-tool="cut"><span class="q-ic orange-soft">' + ic('saw') + '</span><span><b>تقطيع الألواح</b><small>عدد الألواح والهالك</small></span></button>'
        + '<button type="button" class="create-opt" data-act="quickPay"><span class="q-ic green">' + ic('cash') + '</span><span><b>تسجيل دفعة</b><small>من عميل</small></span></button></div>'
        + '<div class="create-row"><button type="button" class="create-opt" data-act="quickCosts"><span class="q-ic">' + ic('box') + '</span><span><b>خامات وهالك</b><small>على مشروع</small></span></button>'
        + '<button type="button" class="create-opt" data-act="newCustomer"><span class="q-ic">' + ic('users') + '</span><span><b>عميل جديد</b><small>اسم وتليفون</small></span></button></div></div>', {});
    },
    newJob: function () { openNewJobSheet(null); },
    newJobFor: function () { openNewJobSheet(openCustId); },
    createJob: createJob,
    quickCat: function (b) { openItem({ cat: b.dataset.cat }); },
    quickCatSheet: function (b) { openItem({ cat: b.dataset.cat }); },
    quickCatSheetType: function (b) { openItem({ typeId: b.dataset.id }); },
    quickType: function (b) { openItem({ typeId: b.dataset.id }); },
    chooseCat: function (b) { openItem({ jobId: S.jobId, cat: b.dataset.cat }); },
    chooseCatType: function (b) { openItem({ jobId: S.jobId, typeId: b.dataset.id }); },
    chooseCatJob: function (b) { openItem({ jobId: openJobId, cat: b.dataset.cat }); },
    chooseCatJobType: function (b) { openItem({ jobId: openJobId, typeId: b.dataset.id }); },
    quickPay: function () { openPickJob('pay'); },
    quickCosts: function () { openPickJob('costs'); },
    pickedJob: function (b) {
      var id = b.dataset.id, purpose = S.pickFor, payload = S.payload, billed = $('f_pbilled') ? $('f_pbilled').checked : false;
      if (purpose === 'addCosts') { closeTop(function () { var n = payload(id, billed); refresh(); toast(n ? 'اتضاف للمشروع' : 'مفيش حاجة تتضاف'); }); return; }
      closeTop(function () { openJob(id); if (purpose === 'pay') openPaySheet(id); else openCostSheet(id, null, 'mat'); });
    },
    pickInvoice: function () { switchView('jobs'); setPick(true); renderJobs(); },
    cancelPick: function () { setPick(false); renderJobs(); },
    pickedInvoice: function (b) { setPick(false); renderJobs(); var j = getJob(b.dataset.id); openPreview({ doc: j && j.status === 'quote' ? 'quote' : 'invoice', jobId: b.dataset.id }); },
    openJob: function (b) { openJob(b.dataset.id); },
    openCust: function (b) { openCust(b.dataset.id); },
    newCustomer: function () { openCustomerSheet(null); },
    saveCustomer: saveCustomer,
    editCust: function () { openCustomerSheet(openCustId); },
    delCust: delCust,
    statement: function () { openPreview({ doc: 'statement', custId: openCustId }); },
    pickCust: function (b) { var c = getCust(b.dataset.id); if (!c) return; $('f_cname').value = c.name; S.custName = c.name; S.custId = c.id; $('f_csug').innerHTML = ''; if ($('f_cphone') && !$('f_cphone').value) $('f_cphone').value = c.phone || ''; renderTargetJobs(); },
    target: function (b) { S.targetJob = b.dataset.id || null; renderTargetJobs(); },
    // ---- البند ----
    addItem: function () { openCatSheet(openJobId); },
    editItem: function (b) { openItem({ jobId: openJobId, itemId: b.dataset.id }); },
    goStep: function (b) { S.step = +b.dataset.i; renderItem(); },
    setCat: function (b) { var cat = K.cat(b.dataset.cat); S.it.cat = cat.id; if (cat.methods.indexOf(S.it.method) < 0) S.it.method = cat.method; S.keepScroll = true; renderItem(); },
    setType: function (b) { S.it.type = b.dataset.v; var el = sheet.querySelector('[data-k="type"]'); if (el) el.value = b.dataset.v; },
    useTpl: function (b) { var t = settings.types.find(function (x) { return x.id === b.dataset.id; }); if (!t) return; S.lines = S.lines.concat(applyTemplate(S.it, t)); S.keepScroll = true; renderItem(); toast('اتملى من «' + t.name + '»'); },
    setField: function (b) { setPath(S.it, b.dataset.k, b.dataset.v); var el = sheet.querySelector('[data-k="' + b.dataset.k + '"]'); if (el) el.value = b.dataset.v; },
    setMethod: function (b) { S.it.method = b.dataset.v; if (b.dataset.v === 'list' && !S.it.rows.length) S.it.rows.push({ name: '', qty: '1', price: '' }); S.keepScroll = true; renderItem(); },
    dimUnit: function (b) { if (S.it.dimUnit === b.dataset.u) return; convertDims(S.it.dimUnit, b.dataset.u); S.it.dimUnit = b.dataset.u; S.keepScroll = true; renderItem(); },
    zoneUnit: function (b) {
      var z = S.it.zones, from = z.unit || 'm', to = b.dataset.u; if (from === to) return;
      var f = C.toM(1, from) / C.toM(1, to); ['base', 'wall', 'tall'].forEach(function (k) { var n = C.num(z[k]); if (n) z[k] = String(C.round(n * f, 4)); });
      z.unit = to; S.keepScroll = true; renderItem();
    },
    stepK: function (b) { var k = b.dataset.sk, n = Math.max(0, (C.num(getPath(S.it, k)) || 0) + Number(b.dataset.d)); setPath(S.it, k, String(C.round(n, 3))); Array.prototype.forEach.call(sheet.querySelectorAll('[data-k="' + k + '"]'), function (el) { el.value = getPath(S.it, k); }); updateItemLive(); },
    usePrice: function (b) { S.it.price = b.dataset.v; var el = sheet.querySelector('[data-k="price"]'); if (el) el.value = b.dataset.v; updateItemLive(); },
    addRow: function (b) { var key = b.dataset.key, list = getPath(S.it, key); if (!Array.isArray(list)) { list = []; setPath(S.it, key, list); } list.push(key === 'extras' ? { name: b.dataset.v, amount: '' } : key === 'cutParts' ? { name: b.dataset.v, L: '', W: '', count: '1' } : { name: b.dataset.v, qty: '1', price: '' }); S.keepScroll = true; renderItem(); },
    delRow: function (b) { var list = getPath(S.it, b.dataset.key); list.splice(+b.dataset.i, 1); S.keepScroll = true; renderItem(); },
    addLine: function (b) { S.lines.push({ id: uid('k'), type: b.dataset.type, name: b.dataset.v, qty: '1', unit: (K.COST_UNITS[b.dataset.type] || [''])[0], price: '', billed: false }); S.keepScroll = true; renderItem(); },
    addLineLib: function (b) { var m = settings.library.find(function (x) { return x.id === b.dataset.id; }); if (!m) return; S.lines.push({ id: uid('k'), type: m.type || 'mat', name: m.name, qty: '1', unit: m.useUnit || m.buyUnit || '', price: String(C.round(C.num(m.price) / (C.num(m.factor) || 1), 4)), supplier: m.supplier || '', billed: false }); S.keepScroll = true; renderItem(); },
    delLine: function (b) { S.lines.splice(+b.dataset.i, 1); S.keepScroll = true; renderItem(); },
    saveItem: saveItem,
    saveAsType: function () {
      var it = S.it, tpl = { name: it.type || K.cat(it.cat).label, desc: it.desc, cat: it.cat, method: it.method, unitLabel: it.unitLabel, price: it.price, dims: ['w', 'h', 'd'], details: clone(it.details), parts: clone(it.parts), zones: clone(it.zones),
        lines: S.lines.map(function (l) { return { type: l.type, name: l.name, qty: l.qty, unit: l.unit, price: l.price, billed: l.billed, wastePct: l.wastePct }; }) };
      var ex = settings.types.find(function (t) { return t.name === tpl.name; });
      if (ex) { Object.assign(ex, tpl); } else { tpl.id = uid('t'); settings.types.push(tpl); }
      saveSettings(); toast('اتحفظ «' + tpl.name + '» في أنواع شغلك');
    },
    dupItem: function () {
      var j = getJob(S.jobId); if (!j) return; var src = j.items.find(function (x) { return x.id === S.itemId; }); if (!src) return;
      var c = clone(src); c.id = uid('i'); j.items.splice(j.items.indexOf(src) + 1, 0, c);
      j.costs.filter(function (k) { return k.itemId === src.id; }).forEach(function (k) { var n = clone(k); n.id = uid('k'); n.itemId = c.id; j.costs.push(n); });
      touch(j); saveDb(); closeTop(function () { refresh(); toast('اتكرر البند'); });
    },
    delItem: function () {
      var j = getJob(S.jobId), id = S.itemId; if (!j) return;
      closeTop(function () {
        confirmDlg('حذف البند؟', 'هيتمسح البند وخاماته وإكسسواراته من المشروع.', 'أيوه، امسح').then(function (ok) {
          if (!ok) return; j.items = j.items.filter(function (x) { return x.id !== id; }); j.costs = j.costs.filter(function (k) { return k.itemId !== id; }); touch(j); saveDb(); refresh(); toast('اتمسح البند');
        });
      });
    },
    // ---- التكاليف ----
    addCost: function (b) { openCostSheet(openJobId, null, b.dataset.type); },
    editCost: function (b) { openCostSheet(openJobId, b.dataset.id); },
    costType: function (b) { readCost(); S.d.type = b.dataset.v; renderCostSheet(); },
    wasteMode: function (b) { readCost(); S.d.mode = b.dataset.v; renderCostSheet(); },
    costName: function (b) { $('f_kname').value = b.dataset.v; },
    costUnit: function (b) { $('f_kunit').value = b.dataset.v; },
    costLib: function (b) { var m = settings.library.find(function (x) { return x.id === b.dataset.id; }); if (!m) return; readCost(); S.d.name = m.name; S.d.unit = m.useUnit || m.buyUnit || ''; S.d.price = String(C.round(C.num(m.price) / (C.num(m.factor) || 1), 4)); S.d.supplier = m.supplier || ''; renderCostSheet(); },
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
    openCustOfJob: function () { var j = getJob(openJobId); if (!j) return; closeTop(function () { openCust(j.customerId); }); },
    preview: function (b) { openPreview({ doc: b.dataset.doc, jobId: openJobId }); },
    pvDoc: function (b) { if (!pv) return; pv.doc = b.dataset.doc; renderPreview(); fitPreview(); },
    clearJobFilter: function () { jobFilter.cust = ''; jobFilter.from = ''; jobFilter.to = ''; $('jobFrom').value = ''; $('jobTo').value = ''; renderJobs(); },
    // ---- الأدوات ----
    tool: function (b) { var go = function () { openTool(b.dataset.tool); }; afterSheet(go); },
    cutForJob: function () { var plan = db.cuts.filter(function (c) { return c.jobId === openJobId; }).pop() || newCut(openJobId); openTool('cut', { cutId: plan.id }); },
    woodForJob: function () { openTool('wood'); },
    newCut: function () { var p = newCut(''); cutId = p.id; renderTool(); },
    openCut: function (b) { cutId = b.dataset.id; renderTool(); },
    delCut: function () { var p = getCut(); if (!p) return; confirmDlg('حذف الخطة؟', 'هتتمسح «' + p.name + '».', 'أيوه، امسح').then(function (ok) { if (!ok) return; db.cuts = db.cuts.filter(function (c) { return c.id !== p.id; }); saveDb(); cutId = null; renderTool(); }); },
    addBoard: function () { var p = getCut(); p.boards.push({ id: uid('b'), name: '', L: '2440', W: '1220', price: '', qty: '', grain: false }); saveDb(); renderTool(); },
    delBoard: function (b) { var p = getCut(), bd = p.boards[+b.dataset.i]; p.boards.splice(+b.dataset.i, 1); p.parts.forEach(function (q) { if (q.boardId === bd.id) q.boardId = p.boards[0].id; }); saveDb(); renderTool(); },
    boardSize: function (b) { var p = getCut(), bd = p.boards[+b.dataset.i], s = b.dataset.v.split('x'); bd.L = s[0]; bd.W = s[1]; saveDb(); renderTool(); },
    addPart: function (b) { var p = getCut(); p.parts.push({ id: uid('q'), name: b.dataset.v, L: '', W: '', count: '1', boardId: p.boards[0].id, grain: false }); saveDb(); renderTool(); var ins = $('toolPage').querySelectorAll('[data-part="' + (p.parts.length - 1) + '"][data-f="L"]'); if (ins[0]) ins[0].focus(); },
    delPart: function (b) { var p = getCut(); p.parts.splice(+b.dataset.i, 1); saveDb(); renderTool(); },
    importParts: importParts,
    cutToJob: function () {
      var p = getCut(); if (!p) return;
      if (p.jobId && getJob(p.jobId)) {
        openSheet('أضف الألواح لمشروع', '<p class="hint" style="margin-bottom:10px">' + esc(custName(getJob(p.jobId)) + ' — ' + (getJob(p.jobId).title || getJob(p.jobId).number)) + '</p><label class="bill-toggle" style="margin:0 0 12px"><span>على حساب العميل (في الفاتورة)</span><input type="checkbox" id="f_pbilled"></label>'
          + '<button type="button" class="btn btn-accent" data-act="cutToLinked">' + ic('check') + ' أضف</button><button type="button" class="btn btn-ghost" data-act="cutToOther" style="margin-top:10px">مشروع تاني</button>', {});
      } else openPickJob('addCosts', addCutCostsTo);
    },
    cutToLinked: function () { var p = getCut(), billed = $('f_pbilled').checked; closeTop(function () { var n = addCutCostsTo(p.jobId, billed); refresh(); toast(n ? 'اتضافت الألواح لخامات المشروع' : 'مفيش ألواح'); }); },
    cutToOther: function () { closeTop(function () { openPickJob('addCosts', addCutCostsTo); }); },
    cutPrint: function () { var p = getCut(); if (p) openPreview({ doc: 'cut', cutId: p.id }); },
    addWood: function () { var l = settings.wood[settings.wood.length - 1] || {}; settings.wood.push({ type: l.type || '', L: '', W: '', T: '', count: '1', unit: l.unit || 'm3', price: l.price || '' }); saveSettings(); renderTool(); },
    delWood: function (b) { settings.wood.splice(+b.dataset.i, 1); saveSettings(); renderTool(); },
    woodType: function (b) { var w = settings.wood[+b.dataset.i]; w.type = b.dataset.v; saveSettings(); renderTool(); },
    woodClear: function () { settings.wood.length = 0; saveSettings(); renderTool(); },
    woodToJob: function () {
      openPickJob('addCosts', function (jobId, billed) {
        var job = getJob(jobId), w = C.wood(settings.wood), n = 0;
        settings.wood.forEach(function (row, i) { var r = w.rows[i]; if (!r.qty) return; job.costs.push({ id: uid('k'), type: 'mat', name: (row.type || 'خشب طبيعي') + ' ' + fq(C.num(row.L)) + '×' + fq(C.num(row.W)) + '×' + fq(C.num(row.T)) + ' سم × ' + fq(r.count), qty: String(r.qty), unit: C.WOOD_UNITS[r.unit], price: String(r.price), billed: billed }); n++; });
        touch(job); saveDb(); return n;
      });
    },
    libNew: function () { openLibSheet(null); },
    libEdit: function (b) { openLibSheet(b.dataset.id); },
    libType: function (b) { S.ltype = b.dataset.v; Array.prototype.forEach.call(sheet.querySelectorAll('[data-act="libType"]'), function (x) { x.classList.toggle('on', x.dataset.v === S.ltype); }); },
    libName: function (b) { $('f_lname').value = b.dataset.v; },
    libSave: function () {
      var name = $('f_lname').value.trim(); if (!name) { toast('اكتب اسم الخامة'); return; }
      var m = S.libId ? settings.library.find(function (x) { return x.id === S.libId; }) : null;
      if (!m) { m = { id: uid('L') }; settings.library.push(m); }
      Object.assign(m, { name: name, type: S.ltype, thick: $('f_lthick').value.trim(), size: $('f_lsize').value.trim(), buyUnit: $('f_lbuy').value.trim(), price: $('f_lprice').value, useUnit: $('f_luse').value.trim(), factor: $('f_lfactor').value || '1', supplier: $('f_lsup').value.trim() });
      saveSettings(); closeTop(function () { refresh(); toast('اتحفظت في المكتبة'); });
    },
    libDel: function () { var id = S.libId; settings.library = settings.library.filter(function (x) { return x.id !== id; }); saveSettings(); closeTop(function () { refresh(); }); },
    newType: function () { afterSheet(function () { openTypeSheet(null); }); },
    editType: function (b) { openTypeSheet(b.dataset.id); },
    tplMethod: function (b) { readTpl(); S.tpl.method = b.dataset.v; renderTypeSheet(); },
    tplAddLine: function () { readTpl(); S.tpl.lines.push({ type: 'mat', name: '', qty: '1', unit: '', price: '' }); renderTypeSheet(); },
    tplDelLine: function (b) { readTpl(); S.tpl.lines.splice(+b.dataset.i, 1); renderTypeSheet(); },
    tplSave: function () {
      var d = readTpl(); if (!d.name) { toast('اكتب اسم الشغل'); return; }
      if (S.typeId) { var t = settings.types.find(function (x) { return x.id === S.typeId; }); Object.assign(t, d); } else { d.id = uid('t'); settings.types.push(d); }
      saveSettings(); closeTop(function () { refresh(); toast('اتحفظ «' + d.name + '» — تلاقيه في «أنواع شغلك»'); });
    },
    tplDel: function () { var id = S.typeId; settings.types = settings.types.filter(function (x) { return x.id !== id; }); saveSettings(); closeTop(function () { refresh(); toast('اتمسح'); }); }
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
    var u = e.target.closest('[data-unit-set]'); if (u) { settings.dimUnit = u.dataset.unitSet; saveSettings(); renderMore(); }
  });

  // ---------------- البداية ----------------
  if (history.state && history.state.cw) history.replaceState(null, '');
  applyTheme();
  renderHome();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', function () { navigator.serviceWorker.register('./service-worker.js').catch(function () {}); });
  }
  // للاختبارات: نفس الدوال اللي الواجهة بتستخدمها
  window.CarpApp = { get db() { return db; }, settings: settings, openJob: openJob, openPreview: openPreview, openTool: openTool, calc: C, catalog: K, state: function () { return S; } };
})();
