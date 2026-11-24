/*
 * أرزقي | Arzoqi — التيار الخفيف وأنظمة الدش (Low Current & Satellite): الواجهة.
 * الحسابات في js/calc.js (LowCalc)، والأنظمة والحاسبات ومكتبة الخامات في js/catalog.js (LowCatalog).
 * التخزين على الموبايل بس:
 *   hlow_db_v1        العملاء والمشاريع (الأنظمة، الأجهزة والخامات، المسارات، المصنعية، المصروفات، الخصم، الضريبة، الدفعات)،
 *                     سجل الصيانة والضمان، عقود الصيانة، والنوتة
 *   hlow_settings_v1  المظهر، العملة، بيانات الفاتورة، مكتبة الخامات، الوحدات، طرق وأسعار المصنعية، الأنظمة المخصصة
 * الفاتورة: ArzaqiInvoice (نفس فاتورة كل الأقسام). نوتة العمال: ArzoqiCrew (نفس النوتة في كل الأقسام).
 * حصر كميات وتقدير تكاليف — مش تصميم هندسي معتمد (خصوصاً أنظمة الحريق والسلامة).
 * © 2026 أحمد حسن عبدالله
 */
(function () {
  'use strict';
  var C = window.LowCalc, K = window.LowCatalog;
  var DB_KEY = 'hlow_db_v1', SET_KEY = 'hlow_settings_v1';
  var SECTION = 'lowcurrent', SECTION_NAME = 'التيار الخفيف';
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
    return { v: 1, seq: Number(d.seq) || 0, customers: arr(d.customers), jobs: arr(d.jobs).map(normJob), maint: arr(d.maint), contracts: arr(d.contracts), notes: arr(d.notes) };
  }
  var db = normDb(loadJSON(DB_KEY, null));
  var settings = loadJSON(SET_KEY, {}) || {};
  ['business', 'lastPrice'].forEach(function (k) { if (!settings[k] || typeof settings[k] !== 'object') settings[k] = {}; });
  ['units', 'systems', 'laborMethods'].forEach(function (k) { settings[k] = arr(settings[k]); });
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
  var STATUS = { quote: ['عرض سعر', 'paused'], active: ['جاري', 'active'], done: ['خلصان', 'done'] };
  function jobCard(j, act) {
    var r = C.job(j);
    var cats = [];
    j.items.forEach(function (it) { var l = sysLabel(it) || itemTitle(it); if (l && cats.indexOf(l) < 0) cats.push(l); });
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
      var hay = [c.name, c.phone, j.title, j.number, j.notes, j.site].concat(j.items.map(function (it) {
        return [itemTitle(it), it.notes, sysLabel(it)].concat(arr(it.lines).map(function (l) { return [l.name, l.brand, l.model].join(' '); })).join(' ');
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
    var j = normJob({ id: uid('j'), number: 'LC-' + pad(db.seq), customerId: cust ? cust.id : '', title: title || '', date: date || today(), status: status || 'active', notes: '', costsComplete: false, createdAt: now, updatedAt: now });
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
  // الأنظمة والحاسبات والمكتبة
  // ====================================================================
  var KINDS = K.KINDS;
  var ROW_KEYS = ['cams', 'groups', 'points', 'devs', 'routes', 'zones', 'doors', 'rooms', 'gates', 'pts'];
  function kindLabel(k) { return KINDS[k] ? KINDS[k].label : 'بند'; }
  function customName(it) { return ((it && it['in']) || {}).sysName || 'نظام مخصص'; }
  function sysLabel(it) { if (it.kind === 'custom') return customName(it); var d = KINDS[it.kind], s = d && K.sys(d.sys); return s ? s.label : ''; }
  function itemTitle(it) { return it.title || (it.kind === 'custom' ? customName(it) : kindLabel(it.kind).replace(/^حاسبة /, '')); }
  function lib() {
    if (!Array.isArray(settings.lib)) settings.lib = K.LIB.map(function (x, i) { return { id: 'L' + i, name: x.name, sys: x.sys, cat: x.cat, unit: x.unit, brand: '', model: '', spec: '', cost: '', price: '', supplier: '', stock: '', wastePct: '', notes: '' }; });
    return settings.lib;
  }
  function libById(id) { return lib().find(function (x) { return x.id === id; }) || null; }
  function units() { return K.UNITS.concat(arr(settings.units)).filter(function (v, i, a) { return v && a.indexOf(v) === i; }); }
  function laborMethods() { return Object.keys(C.LABOR).map(function (k) { return [k, C.LABOR[k]]; }).concat(arr(settings.laborMethods).map(function (m) { return ['x:' + m, m]; })); }
  function lpKey(name, method) { return String(name || '').trim() + '|' + method; }
  function laborPrice(name, method) { var p = (settings.laborPrices || {})[lpKey(name, method)]; return p == null ? '' : p; }
  function customSystems() { return arr(settings.systems); }

  function blankItem(kind, o) {
    o = o || {};
    var d = KINDS[kind] || KINDS.custom;
    var it = { kind: KINDS[kind] ? kind : 'custom', title: '', notes: '', 'in': clone(d.def || {}), lines: [], routes: [], ctypes: [], labor: [], extras: [], supply: true };
    if (o.sysName) it['in'].sysName = o.sysName;
    (d.form || []).forEach(function (f) { if (f.t === 'rows' && ROW_KEYS.indexOf(f.k) >= 0 && !arr(it['in'][f.k]).length) it['in'][f.k] = [clone(f.def || {})]; });
    if (d.routesOnly) { it.ctypes = [{ type: 'CAT6', reel: '', wastePct: '', cost: '', price: '' }]; it.routes = [{ name: 'مسار 1', from: '', to: '', len: '', count: '1', type: 'CAT6' }]; }
    it.labor = (d.labor || []).map(function (p) { return { name: p[1], method: p[0], qty: '', price: laborPrice(p[1], p[0]) }; });
    return it;
  }

  // ---------------- صفحة الحاسبة / النظام ----------------
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
  function formHTML(fields, base, mini) {
    var out = '', buf = [];
    function flush() { if (buf.length) { out += '<div class="fgrid' + (mini ? ' mini' : '') + '">' + buf.join('') + '</div>'; buf = []; } }
    fields.forEach(function (f) {
      var p = f.k ? base + '.' + f.k : '', v = p ? getPath(E.it, p) : '';
      if (f.t === 'num' || f.t === 'text') { buf.push('<div class="ff"><span class="mini-lbl">' + esc(f.l) + (f.u ? ' <small class="u-lbl">(' + esc(f.u) + ')</small>' : '') + '</span>' + inputHTML(p, f, v) + '</div>'); return; }
      flush();
      if (f.t === 'h') out += '<p class="more-h">' + esc(f.l) + '</p>';
      else if (f.t === 'note') out += '<p class="hint">' + esc(f.l) + '</p>';
      else if (f.t === 'check') out += '<label class="check-row"><input type="checkbox" data-k="' + p + '"' + (v ? ' checked' : '') + '> ' + esc(f.l) + '</label>';
      else if (f.t === 'seg') out += '<div class="ff-row"><span class="mini-lbl">' + esc(f.l) + '</span>' + SEGP(p, f.o) + '</div>';
      else if (f.t === 'chips') out += '<div class="ff-row"><span class="mini-lbl">' + esc(f.l) + '</span>' + inputHTML(p, f, v) + CHIPS(f.o, p) + '</div>';
      else if (f.t === 'rows') {
        ROWDEF[p] = f.def || {};
        var list = arr(v);
        out += '<p class="more-h">' + esc(f.l) + '</p>' + list.map(function (r, i) {
          return '<div class="sub-card"><div class="sc-head"><span class="room-num">' + (i + 1) + '</span><b class="grow">' + esc(r.name || r.zone || r.type || '') + '</b>'
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
    var b = '<label class="bill-toggle"><span>توريد مني (الأجهزة والخامات في السعر والتكلفة)</span><input type="checkbox" data-k="supply"' + (it.supply !== false ? ' checked' : '') + '></label>'
      + (it.supply === false ? '<p class="hint">تركيب فقط: الأجهزة من العميل — القايمة للحصر بس ومش بتتحسب في السعر.</p>' : '');
    b += it.lines.map(function (l, i) {
      var p = 'lines.' + i;
      return '<div class="sub-card line-card"><div class="sc-head"><input type="text" class="grow" data-k="' + p + '.name" value="' + esc(v0(l.name)) + '" placeholder="اسم الجهاز / الخامة">'
        + (l.auto ? '<span class="src-badge' + (l.locked ? ' warn' : '') + '">' + (l.locked ? 'متعدل' : 'مقترح') + '</span>' : '')
        + '<button type="button" class="btn btn-ghost btn-icon" data-act="pickLib" data-i="' + i + '" aria-label="من المكتبة">' + ic('book') + '</button>'
        + '<button type="button" class="btn btn-danger btn-icon" data-act="delAt" data-path="lines" data-i="' + i + '" aria-label="حذف">' + ic('x') + '</button></div>'
        + '<div class="fgrid mini"><div class="ff"><span class="mini-lbl">الماركة</span><input type="text" data-k="' + p + '.brand" value="' + esc(v0(l.brand)) + '"></div><div class="ff"><span class="mini-lbl">الموديل</span><input type="text" data-k="' + p + '.model" value="' + esc(v0(l.model)) + '"></div>'
        + '<div class="ff"><span class="mini-lbl">الكمية</span><input type="text" inputmode="decimal" dir="ltr" data-k="' + p + '.qty" value="' + esc(v0(l.qty)) + '"></div><div class="ff"><span class="mini-lbl">الوحدة</span><select data-k="' + p + '.unit">' + unitOptions(l.unit || 'قطعة') + '</select></div>'
        + '<div class="ff"><span class="mini-lbl">سعر الشراء</span><input type="text" inputmode="decimal" dir="ltr" data-k="' + p + '.cost" value="' + esc(v0(l.cost)) + '"></div><div class="ff"><span class="mini-lbl">سعر البيع</span><input type="text" inputmode="decimal" dir="ltr" data-k="' + p + '.price" value="' + esc(v0(l.price)) + '"></div>'
        + '<div class="ff"><span class="mini-lbl">هالك %</span><input type="text" inputmode="decimal" dir="ltr" data-k="' + p + '.wastePct" value="' + esc(v0(l.wastePct)) + '" placeholder="—"></div></div>'
        + '<div class="line-total" data-lt="' + i + '"></div></div>';
    }).join('');
    return card('الأجهزة والخامات', 'box', b + '<div class="btn-row"><button type="button" class="btn btn-ghost btn-sm" data-act="addLine">' + ic('plus') + ' سطر</button><button type="button" class="btn btn-ghost btn-sm" data-act="pickLib" data-i="-1">' + ic('book') + ' من المكتبة</button></div>', ' id="linesCard"');
  }
  function routesHTML() {
    var it = E.it, d = KINDS[it.kind] || {}, open = d.routesOnly || it.routes.length;
    if (!open) return card('مسارات الكابلات (اختياري)', 'cable', '<p class="hint">لو عايز تحسب الكابل مسار مسار (طول + ارتفاع + زيادات × عدد الكابلات) بالبكرة والهالك.</p><button type="button" class="btn btn-ghost btn-sm" data-act="addRoute">' + ic('plus') + ' مسار</button>');
    var types = it.ctypes.map(function (t) { return t.type; });
    var b = '<p class="more-h">أنواع الكابلات</p>' + it.ctypes.map(function (t, i) {
      var p = 'ctypes.' + i;
      return '<div class="sub-card"><div class="sc-head"><input type="text" class="grow" data-k="' + p + '.type" value="' + esc(v0(t.type)) + '" placeholder="CAT6 / RG6 / فايبر"><button type="button" class="btn btn-danger btn-icon" data-act="delAt" data-path="ctypes" data-i="' + i + '">' + ic('x') + '</button></div>'
        + '<div class="fgrid mini"><div class="ff"><span class="mini-lbl">طول البكرة (م)</span><input type="text" inputmode="decimal" dir="ltr" data-k="' + p + '.reel" value="' + esc(v0(t.reel)) + '"></div><div class="ff"><span class="mini-lbl">هالك %</span><input type="text" inputmode="decimal" dir="ltr" data-k="' + p + '.wastePct" value="' + esc(v0(t.wastePct)) + '" placeholder="—"></div>'
        + '<div class="ff"><span class="mini-lbl">شراء المتر</span><input type="text" inputmode="decimal" dir="ltr" data-k="' + p + '.cost" value="' + esc(v0(t.cost)) + '"></div><div class="ff"><span class="mini-lbl">بيع المتر</span><input type="text" inputmode="decimal" dir="ltr" data-k="' + p + '.price" value="' + esc(v0(t.price)) + '"></div></div></div>';
    }).join('') + '<button type="button" class="btn btn-ghost btn-sm" data-act="addCtype">' + ic('plus') + ' نوع كابل</button>';
    b += '<p class="more-h">المسارات</p>' + it.routes.map(function (r, i) {
      var p = 'routes.' + i;
      return '<div class="sub-card"><div class="sc-head"><span class="room-num">' + (i + 1) + '</span><input type="text" class="grow" data-k="' + p + '.name" value="' + esc(v0(r.name)) + '">'
        + '<button type="button" class="btn btn-ghost btn-icon" data-act="dupAt" data-path="routes" data-i="' + i + '">' + ic('copy') + '</button><button type="button" class="btn btn-danger btn-icon" data-act="delAt" data-path="routes" data-i="' + i + '">' + ic('x') + '</button></div>'
        + '<div class="fgrid mini">' + [['from', 'من', 0], ['to', 'إلى', 0], ['len', 'الطول (م)', 1], ['count', 'عدد الكابلات', 1], ['rise', 'ارتفاعات (م)', 1], ['extraStart', 'زيادة البداية', 1], ['extraEnd', 'زيادة النهاية', 1], ['spare', 'احتياطي صيانة', 1]].map(function (q) {
          return '<div class="ff"><span class="mini-lbl">' + q[1] + '</span><input type="text" data-k="' + p + '.' + q[0] + '"' + (q[2] ? ' inputmode="decimal" dir="ltr"' : '') + ' value="' + esc(v0(r[q[0]])) + '"></div>';
        }).join('') + '<div class="ff"><span class="mini-lbl">الكابل</span><select data-k="' + p + '.type">' + types.map(function (t) { return '<option' + (t === r.type ? ' selected' : '') + '>' + esc(t) + '</option>'; }).join('') + '</select></div></div>'
        + '<div class="line-total" data-rt="' + i + '"></div></div>';
    }).join('') + '<button type="button" class="btn btn-ghost btn-sm" data-act="addRoute">' + ic('plus') + ' مسار</button><div id="routeRes" class="sum-list" style="margin-top:10px"></div>';
    return card('مسارات الكابلات', 'cable', b);
  }
  function laborHTML() {
    var it = E.it, saved = Object.keys(settings.laborPrices || {}).map(function (k) { return k.split('|')[0]; }).filter(function (v, i, a) { return v && a.indexOf(v) === i; });
    var names = K.LABOR_NAMES.concat(saved).filter(function (v, i, a) { return a.indexOf(v) === i; });
    var b = it.labor.map(function (l, i) {
      var p = 'labor.' + i;
      return '<div class="sub-card"><div class="sc-head"><input type="text" class="grow" data-k="' + p + '.name" list="laborNames" value="' + esc(v0(l.name)) + '" placeholder="تأسيس / تركيب / برمجة…"><button type="button" class="btn btn-danger btn-icon" data-act="delAt" data-path="labor" data-i="' + i + '">' + ic('x') + '</button></div>'
        + '<div class="fgrid mini"><div class="ff"><span class="mini-lbl">طريقة الحساب</span><select data-k="' + p + '.method">' + laborMethods().map(function (m) { return '<option value="' + esc(m[0]) + '"' + (m[0] === l.method ? ' selected' : '') + '>' + esc(m[1]) + '</option>'; }).join('') + '</select></div>'
        + (l.method === 'lump' ? '' : '<div class="ff"><span class="mini-lbl">' + (l.method === 'daily' ? 'الأيام' : 'الكمية') + '</span><input type="text" inputmode="decimal" dir="ltr" data-k="' + p + '.qty" value="' + esc(v0(l.qty)) + '" placeholder="' + (C.METRIC[l.method] ? 'تلقائي' : '') + '"></div>')
        + (l.method === 'daily' ? '<div class="ff"><span class="mini-lbl">العمال</span><input type="text" inputmode="decimal" dir="ltr" data-k="' + p + '.workers" value="' + esc(v0(l.workers)) + '" placeholder="1"></div>' : '')
        + '<div class="ff"><span class="mini-lbl">' + (l.method === 'lump' ? 'المبلغ' : 'السعر') + '</span><input type="text" inputmode="decimal" dir="ltr" data-k="' + p + '.price" value="' + esc(v0(l.price)) + '"></div></div>'
        + '<div class="line-total" data-la="' + i + '"></div></div>';
    }).join('');
    return card('المصنعية', 'cash', b + '<datalist id="laborNames">' + names.map(function (n) { return '<option value="' + esc(n) + '">'; }).join('') + '</datalist>'
      + '<button type="button" class="btn btn-ghost btn-sm" data-act="addLabor">' + ic('plus') + ' بند مصنعية</button><p class="hint">الكمية لو سبتها فاضية بتتحسب لوحدها من الحاسبة (عدد الكاميرات/النقاط/الأبواب/الأمتار…).</p>');
  }
  function extrasHTML() {
    return card('إضافات على النظام (نقل، تركيب سقالة…)', 'plus', '<div class="rows-ed">' + E.it.extras.map(function (x, i) {
      return '<div class="task-row cols-2"><input type="text" data-k="extras.' + i + '.name" value="' + esc(v0(x.name)) + '" placeholder="الإضافة"><input type="text" inputmode="decimal" dir="ltr" data-k="extras.' + i + '.amount" value="' + esc(v0(x.amount)) + '" placeholder="المبلغ"><button type="button" class="btn btn-danger btn-icon" data-act="delAt" data-path="extras" data-i="' + i + '">' + ic('x') + '</button></div>';
    }).join('') + '</div>' + chipsHTML(['نقل', 'برمجة إضافية', 'سقالة / سلم', 'تكسير وترميم'], 'addExtra'));
  }
  function renderItemPage() {
    var it = E.it, el = $('itemPage'), st = el.scrollTop, d = KINDS[it.kind] || KINDS.custom, job = E.jobId ? getJob(E.jobId) : null;
    ROWDEF = {};
    var head = '<div class="pg-head"><button type="button" class="icon-btn" data-act="closeTop" aria-label="رجوع">' + ic('back') + '</button><div class="titles"><h2>' + esc((E.itemId ? 'تعديل: ' : '') + itemTitle(it)) + '</h2><div class="sub">'
      + esc(job ? custName(job) + ' — ' + (job.title || job.number) : (sysLabel(it) || 'حساب جديد')) + '</div></div></div>';
    var pick = job ? '' : '<div class="card cust-pick"><div class="field"><label for="f_cname">اسم العميل (اختياري — سيبه فاضي لحساب سريع)</label><input type="text" id="f_cname" autocomplete="off" value="' + esc(E.custName) + '"><div id="f_csug"></div></div>'
      + '<div class="field" style="margin-bottom:0"><label for="f_jtitle">اسم المشروع (اختياري)</label><input type="text" id="f_jtitle" value="' + esc(E.jobTitle) + '" placeholder="مثلاً: كاميرات فيلا التجمع"></div><div id="f_target"></div></div>';
    var body = card('المدخلات', d.icon || 'grid', '<div class="ff-row"><span class="mini-lbl">اسم البند (اختياري)</span><input type="text" data-k="title" value="' + esc(v0(it.title)) + '" placeholder="' + esc(itemTitle(Object.assign({}, it, { title: '' }))) + '"></div>' + formHTML(d.form || [], 'in'))
      + '<div class="card" id="calcRes"></div><div class="card" id="sugCard"></div>' + linesHTML() + routesHTML() + laborHTML() + extrasHTML()
      + card('ملاحظات', 'edit', '<textarea data-k="notes" placeholder="بتظهر في الفاتورة">' + esc(v0(it.notes)) + '</textarea>') + '<div class="card" id="itRes"></div>'
      + '<div class="btn-row"><button type="button" class="btn btn-ghost" data-act="resetItem">' + ic('history') + ' إعادة ضبط</button><button type="button" class="btn btn-ghost" data-act="toNote">' + ic('note') + ' للنوتة</button></div>'
      + '<div class="btn-row" style="margin-top:10px"><button type="button" class="btn btn-ghost" data-act="shareItem">' + ic('share') + ' مشاركة النتايج</button><button type="button" class="btn btn-ghost" data-act="saveInvoice">' + ic('receipt') + ' حفظ وفاتورة</button></div>';
    el.innerHTML = head + '<div class="container">' + pick + body + '</div>'
      + '<div class="pg-foot"><div class="eb-info"><span>الإجمالي للعميل</span><strong id="itTotal">0</strong></div>'
      + (E.itemId ? '<button type="button" class="btn btn-danger btn-icon" data-act="delItem" aria-label="حذف البند">' + ic('trash') + '</button><button type="button" class="btn btn-ghost btn-icon" data-act="dupItem" aria-label="تكرار البند">' + ic('copy') + '</button>' : '')
      + '<button type="button" class="btn btn-accent" data-act="saveItem">' + ic('check') + ' حفظ</button></div>';
    el.scrollTop = st;
    if (!job) { bindCustSuggest(); renderTargetJobs(); }
    updateItemLive();
  }
  function resRows(rows) { return rows.map(function (r) { return '<div class="sum-row how"><span>' + esc(r[0]) + (r[2] ? '<small>' + esc(r[2]) + '</small>' : '') + '</span><strong>' + esc(r[1]) + '</strong></div>'; }).join(''); }
  function updateItemLive() {
    if (!E || !$('itRes')) return;
    var it = E.it, r = C.item(it), c = r.calc;
    $('calcRes').innerHTML = '<div class="card-title"><span class="t-ic orange">' + ic('chart') + '</span><h2>النتيجة وطريقة الحساب</h2></div>'
      + (c.rows.length ? '<div class="sum-list">' + resRows(c.rows) + '</div>' : '<p class="hint">' + (it.kind === 'custom' ? 'نظام مخصص: ضيف الأجهزة والمصنعية تحت.' : 'اكتب المدخلات والنتيجة هتظهر هنا.') + '</p>')
      + (c.warn.length ? '<div class="warn-box">' + c.warn.map(esc).join('<br>') + '</div>' : '');
    var sg = c.sug;
    $('sugCard').innerHTML = '<div class="card-title"><span class="t-ic">' + ic('box') + '</span><h2>الكميات المقترحة</h2>' + (sg.length ? '<span class="tag">' + sg.length + '</span>' : '') + '</div>'
      + (sg.length ? '<div class="sum-list">' + sg.map(function (s) { var l = it.lines.find(function (x) { return x.auto === s.key; }); return row(s.name + (l ? (l.locked ? ' — متعدل يدوي' : ' ✓') : ''), fq(s.qty) + ' ' + s.unit); }).join('') + '</div>'
        + '<button type="button" class="btn btn-soft" data-act="applySug" style="margin-top:10px">' + ic('check') + ' تطبيق على الأجهزة والخامات</button><p class="hint">بعد التطبيق تقدر تعدّل أي كمية — الكمية اللي بتعدلها بإيدك مش بتتغير تاني.</p>'
        : '<p class="hint">مفيش كميات مقترحة لسه.</p>');
    r.lines.forEach(function (x, i) { var el = document.querySelector('[data-lt="' + i + '"]'); if (el) el.innerHTML = (x.waste ? fq(x.qty) + ' + هالك ' + fq(x.waste) + ' = ' : '') + '<b>' + fq(x.final) + ' ' + esc(x.unit) + '</b>' + (r.supply ? ' · شراء ' + esc(money(x.costT)) + ' · بيع ' + esc(money(x.sellT)) : ''); });
    r.labor.forEach(function (x, i) { var el = document.querySelector('[data-la="' + i + '"]'); if (el) el.innerHTML = x.method === 'lump' ? 'مقطوعية <b>' + esc(money(x.amount)) + '</b>' : fq(x.qty) + (x.auto ? ' (تلقائي)' : '') + (x.method === 'daily' ? ' يوم × ' + fq(x.workers) + ' عامل' : '') + ' × ' + esc(fmt(x.price)) + ' = <b>' + esc(money(x.amount)) + '</b>'; });
    if (r.routes) {
      r.routes.routes.forEach(function (x, i) { var el = document.querySelector('[data-rt="' + i + '"]'); if (el) el.innerHTML = fq(x.per) + ' م × ' + x.count + ' = <b>' + fq(x.total) + ' م</b> (' + esc(x.type) + ')'; });
      var rr = $('routeRes'); if (rr) rr.innerHTML = r.routes.groups.map(function (g) { return '<div class="group-res"><b>' + esc(g.type) + '</b><div class="sum-list">' + row('قبل الهالك', fq(g.len) + ' م') + (g.wastePct ? row('بعد هالك ' + fq(g.wastePct) + '%', fq(g.after) + ' م') : '') + (g.reel ? row('البكر', g.reels + ' × ' + fq(g.reel) + ' م (المتبقي ' + fq(g.left) + ' م)', 'bold') : '<div class="warn-box">اكتب طول البكرة</div>') + row('التكلفة / البيع', money(g.cost) + ' / ' + money(g.sell)) + '</div></div>'; }).join('');
    }
    var h = '<div class="card-title"><span class="t-ic orange">' + ic('receipt') + '</span><h2>التكلفة والسعر</h2></div><div class="sum-list">'
      + (r.supply ? row('الأجهزة والخامات (بيع)', money(r.matSell)) + row('الأجهزة والخامات (شراء)', money(r.matCost)) : row('الأجهزة', 'من العميل (تركيب فقط)'))
      + row('المصنعية', money(r.laborT)) + (r.extrasT ? row('الإضافات', money(r.extrasT)) : '') + row('سعر البيع للعميل', money(r.total), 'bold')
      + '<div class="sum-row profit' + (r.profit < 0 ? ' neg' : '') + '"><span>الربح التقديري</span><strong dir="ltr">' + esc(money(r.profit)) + '</strong></div></div>';
    if (r.units) h += '<p class="more-h">تكلفة كل ' + (it.kind === 'netpoints' ? 'نقطة' : it.kind === 'gates' ? 'بوابة' : 'باب') + '</p><div class="sum-list">' + r.units.map(function (u) { return row(u.name + (u.count > 1 ? ' × ' + u.count : ''), 'شراء ' + money(u.cost) + ' · بيع ' + money(u.sell)); }).join('') + '</div>';
    if (r.perPoint) h += '<div class="sum-list" style="margin-top:6px">' + row('تكلفة النقطة', money(r.perPoint.cost)) + row('سعر بيع النقطة', money(r.perPoint.sell), 'bold') + '</div>';
    h += '<p class="cost-note">حصر كميات وتقدير تكاليف — مش تصميم هندسي معتمد. الأسعار والمواصفات من عندك ومن كتالوج المصنع.</p>';
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
    if (el.tagName === 'SELECT' || el.type === 'checkbox' || /^ctypes\.\d+\.type$/.test(k)) { if (e.type === 'change') renderItemPage(); else updateItemLive(); }
    else updateItemLive();
  }
  $('itemPage').addEventListener('input', itemInput);
  $('itemPage').addEventListener('change', function (e) { if (e.target.type === 'checkbox' || e.target.tagName === 'SELECT' || (e.target.dataset.k && /^ctypes\.\d+\.type$/.test(e.target.dataset.k))) itemInput(e); });
  function libMatch(s) { var L = lib(); return L.find(function (x) { return x.name === s.name; }) || L.find(function (x) { return x.name === s.lib; }) || null; }
  function libPrice(m, unit, per, k) { var v = C.num(m[k]); if (!v) return ''; return String(unit === 'بكرة' && m.unit === 'متر' && per ? C.round(v * per, 2) : v); }
  function applySug() {
    var it = E.it, c = C.item(it).calc, n = 0;
    c.sug.forEach(function (s) {
      var l = it.lines.find(function (x) { return x.auto === s.key; });
      if (l) { if (!l.locked) { l.qty = String(s.qty); l.unit = s.unit; l.per = s.per || ''; } }
      else {
        var m = libMatch(s);
        it.lines.push({ id: uid('l'), auto: s.key, name: s.name, brand: m ? m.brand : '', model: m ? m.model : '', unit: s.unit, qty: String(s.qty), per: s.per || '', cat: s.cat,
          cost: m ? libPrice(m, s.unit, s.per, 'cost') : '', price: m ? libPrice(m, s.unit, s.per, 'price') : '', wastePct: m ? m.wastePct || '' : '', libId: m ? m.id : '' });
      }
      n++;
    });
    it.lines = it.lines.filter(function (l) { return !l.auto || l.locked || c.sug.some(function (s) { return s.key === l.auto; }); });
    renderItemPage(); toast('اتطبقت ' + n + ' كمية — عدّل براحتك');
  }
  function itemText(it) {
    var r = C.item(it), c = r.calc, t = ['أرزقي | Arzoqi — ' + itemTitle(it), sysLabel(it), ''];
    c.rows.forEach(function (x) { t.push('• ' + x[0] + ': ' + x[1]); });
    if (r.lines.length) { t.push('', 'الأجهزة والخامات:'); r.lines.forEach(function (l) { t.push('- ' + l.name + ': ' + fq(l.final) + ' ' + l.unit + (r.supply && l.price ? ' × ' + fmt(l.price) + ' = ' + money(l.sellT) : '')); }); }
    if (r.labor.length) { t.push('', 'المصنعية:'); r.labor.forEach(function (l) { if (l.amount) t.push('- ' + (l.name || l.label) + ': ' + money(l.amount)); }); }
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
  function toNote() {
    var it = E.it;
    db.notes.unshift({ id: uid('n'), date: new Date().toISOString(), title: itemTitle(it), sys: sysLabel(it), kind: it.kind, total: C.item(it).total, text: itemText(it), it: clone(it) });
    saveDb(); toast('اتحفظ في النوتة');
  }
  function saveItem(then) {
    var it = E.it, job = E.jobId ? getJob(E.jobId) : null, fromHome = !job;
    if (!job) {
      var name = String(E.custName || '').trim(), c = name ? ensureCustomer(name) : null;
      job = E.targetJob ? getJob(E.targetJob) : null;
      if (!job) job = newJobRecord(c, String(E.jobTitle || '').trim() || (c ? itemTitle(it) : 'حساب سريع — ' + itemTitle(it)), today());
    }
    var id = E.itemId || uid('i'); it.id = id;
    var i = job.items.findIndex(function (x) { return x.id === id; });
    if (i >= 0) job.items[i] = it; else job.items.push(it);
    settings.laborPrices = settings.laborPrices || {};
    it.labor.forEach(function (l) { if (l.name && C.num(l.price)) settings.laborPrices[lpKey(l.name, l.method)] = l.price; });
    touch(job); saveDb(); saveSettings();
    var jid = job.id, edit = !!E.itemId;
    closeTop(function () { refresh(); toast(edit ? 'اتعدل' : 'اتحفظ'); if (then) then(jid); else if (fromHome) openJob(jid); });
  }

  // ---------------- اختيار من المكتبة ----------------
  function openLibPick(lineIdx) {
    var sys = (KINDS[E.it.kind] || {}).sys || '';
    openSheet('اختار من المكتبة', '<div class="search-box">' + ic('search') + '<input type="search" id="f_lq" placeholder="دوّر بالاسم أو الماركة أو الموديل" autocomplete="off"></div>'
      + '<div class="chips wrap" id="f_lsys"><button type="button" class="chip on" data-act="libPickSys" data-v="' + sys + '">' + esc(sys ? (K.sys(sys) || {}).label || 'النظام' : 'الكل') + '</button>' + (sys ? '<button type="button" class="chip" data-act="libPickSys" data-v="*">الكل</button>' : '') + '</div><div id="f_llist"></div>', { form: 'libpick', line: lineIdx, sys: sys });
    renderLibPick();
    $('f_lq').addEventListener('input', renderLibPick);
  }
  function renderLibPick() {
    var q = ($('f_lq') ? $('f_lq').value : '').trim(), sys = S.sys;
    var list = lib().filter(function (x) { return (sys === '*' || !sys || x.sys === sys || !x.sys) && (!q || [x.name, x.brand, x.model, x.spec].join(' ').indexOf(q) >= 0); });
    $('f_llist').innerHTML = list.slice(0, 80).map(function (x) { return '<div class="mat-row" data-act="libPicked" data-id="' + esc(x.id) + '"><div class="m-info"><div class="m-name">' + esc(x.name) + '</div><div class="m-meta">' + esc([x.brand, x.model, K.CATS[x.cat], x.unit].filter(Boolean).join(' · ')) + '</div></div><span class="m-qty">' + (C.num(x.price) ? esc(money(C.num(x.price))) : '—') + '</span></div>'; }).join('') || '<div class="home-empty">مفيش نتايج — ضيفها من «مكتبة الخامات»</div>';
  }
  function libPicked(id) {
    var m = libById(id); if (!m || !E) return;
    var i = S.line, l = i >= 0 ? E.it.lines[i] : null;
    if (!l) { l = { id: uid('l'), qty: '1' }; E.it.lines.push(l); }
    var unit = l.unit && l.auto ? l.unit : m.unit;
    Object.assign(l, { name: m.name, brand: m.brand, model: m.model, unit: unit, cost: libPrice(m, unit, C.num(l.per), 'cost'), price: libPrice(m, unit, C.num(l.per), 'price'), wastePct: m.wastePct || l.wastePct || '', cat: m.cat, libId: m.id });
    closeTop(function () { renderItemPage(); toast('اتاخد من المكتبة: ' + m.name); });
  }

  // ====================================================================
  // الأدوات: الحاسبات — المكتبة — المصنعية — الصيانة — التقارير — النوتة
  // ====================================================================
  var tool = null, toolState = { libSys: '', libQ: '', maintTab: 'visits', repPeriod: 'all' };
  function openTool(name, o) {
    tool = name; if (o) Object.assign(toolState, o); renderTool();
    var el = $('toolPage'); el.classList.add('open'); el.scrollTop = 0;
    pushLayer({ type: 'page', hide: function () { el.classList.remove('open'); tool = null; } });
  }
  function toolHead(t, s) { return '<div class="pg-head"><button type="button" class="icon-btn" data-act="closeTop" aria-label="رجوع">' + ic('back') + '</button><div class="titles"><h2>' + esc(t) + '</h2><div class="sub">' + esc(s || '') + '</div></div></div>'; }
  function renderTool() {
    var el = $('toolPage'), st = el.scrollTop;
    el.innerHTML = tool === 'library' ? libraryHTML() : tool === 'labor' ? laborToolHTML() : tool === 'maint' ? maintHTML() : tool === 'reports' ? reportsHTML() : tool === 'notes' ? notesHTML() : calcsHTML();
    el.scrollTop = st;
    if (tool === 'library') bindLibSearch();
  }
  function kindTile(k, act) { var d = KINDS[k]; return '<button type="button" class="t-tile" data-act="' + (act || 'quickKind') + '" data-kind="' + k + '"><span class="q-ic orange-soft">' + ic(d.icon) + '</span><b>' + esc(d.label.replace(/^حاسبة /, '')) + '</b></button>'; }
  function calcsHTML() {
    return toolHead('الحاسبات والأدوات', 'كل حاسبة تشتغل لوحدها من غير مشروع') + '<div class="container">'
      + K.SYSTEMS.map(function (s) { return '<p class="more-h">' + esc(s.label) + ' <small>' + esc(s.en) + '</small></p><div class="type-tiles compact">' + s.kinds.map(function (k) { return kindTile(k); }).join('') + '</div>'; }).join('')
      + '<p class="more-h">المشروع</p><div class="create-row"><button type="button" class="create-opt dark" data-act="newJob"><span class="q-ic orange">' + ic('plus') + '</span><span><b>حاسبة تكلفة مشروع التيار الخفيف</b><small>مشروع بأكتر من نظام + الربح + الفاتورة</small></span></button></div></div>';
  }
  // ---- المكتبة ----
  function libraryHTML() {
    var sys = toolState.libSys;
    return toolHead('مكتبة الخامات والأجهزة', lib().length + ' صنف — أسعارك وماركاتك ومورّدينك') + '<div class="container">'
      + '<button type="button" class="btn btn-accent" data-act="libNew" style="margin-bottom:12px">' + ic('plus') + ' إضافة خامة / جهاز</button>'
      + '<div class="search-box">' + ic('search') + '<input type="search" id="libQ" placeholder="دوّر بالاسم أو الماركة أو الموديل" value="' + esc(toolState.libQ) + '" autocomplete="off"></div>'
      + '<div class="filter-chips"><button type="button" class="chip' + (!sys ? ' on' : '') + '" data-act="libSys" data-v="">الكل</button>' + K.SYSTEMS.map(function (s) { return '<button type="button" class="chip' + (sys === s.id ? ' on' : '') + '" data-act="libSys" data-v="' + s.id + '">' + esc(s.label) + '</button>'; }).join('') + '<button type="button" class="chip' + (sys === '-' ? ' on' : '') + '" data-act="libSys" data-v="-">عامة</button></div>'
      + '<div id="libList"></div></div>';
  }
  function bindLibSearch() { var q = $('libQ'); if (q) q.addEventListener('input', function () { toolState.libQ = q.value; renderLibList(); }); renderLibList(); }
  function renderLibList() {
    var sys = toolState.libSys, q = toolState.libQ.trim();
    var list = lib().filter(function (x) { return (!sys || (sys === '-' ? !x.sys : x.sys === sys)) && (!q || [x.name, x.brand, x.model, x.spec, x.supplier].join(' ').indexOf(q) >= 0); });
    var by = {}; list.forEach(function (x) { (by[x.cat] = by[x.cat] || []).push(x); });
    $('libList').innerHTML = Object.keys(K.CATS).filter(function (c) { return by[c]; }).map(function (c) {
      return '<p class="more-h">' + esc(K.CATS[c]) + ' <small>' + by[c].length + '</small></p>' + by[c].map(function (x) {
        return '<div class="mat-row" data-act="libEdit" data-id="' + esc(x.id) + '"><div class="m-info"><div class="m-name">' + esc(x.name) + '</div><div class="m-meta">' + esc([x.brand, x.model, x.unit, x.supplier, C.num(x.stock) ? 'المخزون ' + x.stock : ''].filter(Boolean).join(' · ')) + '</div></div>'
          + '<span class="m-qty">' + (C.num(x.price) ? esc(money(C.num(x.price))) : '—') + (C.num(x.cost) ? '<small>شراء ' + esc(fmt(C.num(x.cost))) + '</small>' : '') + '</span></div>';
      }).join('');
    }).join('') || '<div class="home-empty">مفيش أصناف بالبحث ده</div>';
  }
  function openLibSheet(id, copy) {
    var x = id ? clone(libById(id) || {}) : { sys: toolState.libSys && toolState.libSys !== '-' ? toolState.libSys : '', cat: 'device', unit: 'قطعة' };
    if (copy) { x.name = (x.name || '') + ' (نسخة)'; }
    var f = function (k, l, o) { o = o || {}; return '<div class="field"><label for="f_l' + k + '">' + l + '</label><input type="text" id="f_l' + k + '"' + (o.num ? ' inputmode="decimal" dir="ltr"' : '') + ' value="' + esc(v0(x[k])) + '" placeholder="' + esc(o.ph || '') + '"></div>'; };
    openSheet(id && !copy ? 'تعديل صنف' : 'إضافة صنف', f('name', 'الاسم')
      + '<div class="row-2"><div class="field"><label for="f_lsys2">النظام</label><select id="f_lsys2"><option value="">عام</option>' + K.SYSTEMS.map(function (s) { return '<option value="' + s.id + '"' + (x.sys === s.id ? ' selected' : '') + '>' + esc(s.label) + '</option>'; }).join('') + '</select></div>'
      + '<div class="field"><label for="f_lcat">التصنيف</label><select id="f_lcat">' + Object.keys(K.CATS).map(function (c) { return '<option value="' + c + '"' + (x.cat === c ? ' selected' : '') + '>' + esc(K.CATS[c]) + '</option>'; }).join('') + '</select></div></div>'
      + '<div class="row-2">' + f('brand', 'الماركة') + f('model', 'الموديل') + '</div>' + f('spec', 'المواصفات', { ph: 'مثلاً: 4MP، 8 منفذ، 305 م' })
      + '<div class="row-2"><div class="field"><label for="f_lunit">الوحدة</label><select id="f_lunit">' + unitOptions(x.unit || 'قطعة') + '</select></div>' + f('wastePct', 'هالك %', { num: true, ph: '—' }) + '</div>'
      + '<div class="row-2">' + f('cost', 'سعر الشراء', { num: true }) + f('price', 'سعر البيع', { num: true }) + '</div>'
      + '<div class="row-2">' + f('supplier', 'المورد') + f('stock', 'الكمية عندك', { num: true, ph: '—' }) + '</div>' + f('notes', 'ملاحظات')
      + '<button type="button" class="btn btn-accent" data-act="libSave">' + ic('check') + ' حفظ</button>'
      + (id && !copy ? '<div class="btn-row" style="margin-top:10px"><button type="button" class="btn btn-ghost" data-act="libCopy">' + ic('copy') + ' نسخ</button><button type="button" class="btn btn-danger" data-act="libDel">' + ic('trash') + ' حذف</button></div>' : ''),
      { form: 'lib', libId: copy ? null : id || null, srcId: id || null });
  }
  function libSave() {
    var name = $('f_lname').value.trim(); if (!name) { toast('اكتب الاسم'); return; }
    var x = S.libId ? libById(S.libId) : null;
    if (!x) { x = { id: uid('L') }; lib().push(x); }
    ['name', 'brand', 'model', 'spec', 'wastePct', 'cost', 'price', 'supplier', 'stock', 'notes'].forEach(function (k) { x[k] = $('f_l' + k).value.trim(); });
    x.sys = $('f_lsys2').value; x.cat = $('f_lcat').value; x.unit = $('f_lunit').value;
    saveSettings(); closeTop(function () { refresh(); toast('اتحفظ «' + x.name + '»'); });
  }
  // ---- المصنعية ----
  function laborToolHTML() {
    var lp = settings.laborPrices || {}, keys = Object.keys(lp);
    return toolHead('المصنعية', 'طرق التسعير وأسعارك المحفوظة') + '<div class="container">'
      + card('طرق الحساب', 'cash', '<div class="chips wrap">' + laborMethods().map(function (m) { return '<span class="chip static">' + esc(m[1]) + (m[0].indexOf('x:') === 0 ? ' <button type="button" class="chip-x" data-act="delMethod" data-v="' + esc(m[1]) + '">×</button>' : '') + '</span>'; }).join('') + '</div>'
        + '<div class="row-2" style="margin-top:10px"><input type="text" id="f_newMethod" placeholder="طريقة جديدة (مثلاً: بالدور)"><button type="button" class="btn btn-soft" data-act="addMethod">' + ic('plus') + ' إضافة</button></div>'
        + '<p class="hint">أنواع الشغل: ' + esc(K.LABOR_NAMES.join('، ')) + ' — أو أي اسم تكتبه.</p>')
      + card('أسعار المصنعية المحفوظة', 'book', (keys.length ? keys.map(function (k) { var p = k.split('|'); return '<div class="task-row cols-2"><span class="lp-name">' + esc(p[0]) + '<small>' + esc(C.LABOR[p[1]] || p[1].replace(/^x:/, '')) + '</small></span><input type="text" inputmode="decimal" dir="ltr" data-lp="' + esc(k) + '" value="' + esc(v0(lp[k])) + '"><button type="button" class="btn btn-danger btn-icon" data-act="delLp" data-v="' + esc(k) + '">' + ic('x') + '</button></div>'; }).join('')
        : '<p class="hint">السعر بيتحفظ هنا أول ما تحفظ بند فيه مصنعية — وبيتكتب لوحده المرة الجاية.</p>')
        + '<p class="more-h">إضافة سعر</p><div class="row-2"><input type="text" id="f_lpName" list="laborNames2" placeholder="اسم المصنعية"><select id="f_lpMethod">' + laborMethods().map(function (m) { return '<option value="' + esc(m[0]) + '">' + esc(m[1]) + '</option>'; }).join('') + '</select></div>'
        + '<datalist id="laborNames2">' + K.LABOR_NAMES.map(function (n) { return '<option value="' + esc(n) + '">'; }).join('') + '</datalist>'
        + '<div class="row-2" style="margin-top:8px"><input type="text" id="f_lpPrice" inputmode="decimal" dir="ltr" placeholder="السعر"><button type="button" class="btn btn-soft" data-act="addLp">' + ic('plus') + ' حفظ السعر</button></div>') + '</div>';
  }
  // ---- الصيانة والضمان ----
  function custOptions() { return '<datalist id="custNames">' + db.customers.map(function (c) { return '<option value="' + esc(c.name) + '">'; }).join('') + '</datalist>'; }
  function maintHTML() {
    var tab = toolState.maintTab, t = today();
    var h = toolHead('الصيانة والضمان', 'سجل الأجهزة والزيارات وعقود الصيانة') + '<div class="container"><div class="segmented seg-3" style="margin-bottom:12px">'
      + [['visits', 'سجل الصيانة'], ['due', 'الزيارات الجاية'], ['contracts', 'العقود']].map(function (o) { return '<button type="button" class="' + (tab === o[0] ? 'on' : '') + '" data-act="maintTab" data-v="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div>';
    if (tab === 'contracts') {
      h += '<button type="button" class="btn btn-accent" data-act="contractNew" style="margin-bottom:12px">' + ic('plus') + ' عقد صيانة</button>'
        + (db.contracts.length ? db.contracts.map(function (k) {
          var r = C.contract(k), c = getCust(k.custId) || {};
          return '<div class="sub-card"><div class="sc-head"><b class="grow">' + esc(k.title || 'عقد صيانة') + '<small class="muted"> — ' + esc(c.name || '') + '</small></b><button type="button" class="btn btn-ghost btn-icon" data-act="contractEdit" data-id="' + esc(k.id) + '">' + ic('edit') + '</button></div>'
            + '<div class="sum-list">' + row('النوع', r.label + (k.start ? ' · من ' + fmtDate(k.start) : '')) + row('الزيارات', r.done + ' من ' + r.visits + ' (باقي ' + r.left + ')') + row('قيمة العقد', money(r.value)) + row('المدفوع', money(r.paid)) + row('المتبقي', money(r.remaining), 'bold') + '</div>'
            + '<div class="btn-row" style="margin-top:8px"><button type="button" class="btn btn-ghost btn-sm" data-act="contractVisit" data-id="' + esc(k.id) + '">' + ic('check') + ' زيارة اتعملت</button><button type="button" class="btn btn-ghost btn-sm" data-act="contractPay" data-id="' + esc(k.id) + '">' + ic('cash') + ' دفعة</button></div></div>';
        }).join('') : '<div class="home-empty">مفيش عقود صيانة لسه</div>');
    } else {
      var list = db.maint.slice().sort(function (a, b) { return String(b.visitDate || b.installDate || '').localeCompare(String(a.visitDate || a.installDate || '')); });
      if (tab === 'due') list = list.filter(function (m) { return m.nextVisit; }).sort(function (a, b) { return String(a.nextVisit).localeCompare(String(b.nextVisit)); });
      h += '<button type="button" class="btn btn-accent" data-act="maintNew" style="margin-bottom:12px">' + ic('plus') + ' تسجيل جهاز / زيارة</button>'
        + (list.length ? list.map(function (m) {
          var w = C.warranty(m, t), c = getCust(m.custId) || {}, v = C.visit(m), late = m.nextVisit && m.nextVisit < t;
          return '<div class="mat-row" data-act="maintEdit" data-id="' + esc(m.id) + '"><div class="m-info"><div class="m-name">' + esc([m.device || m.sys || 'جهاز', m.brand, m.model].filter(Boolean).join(' ')) + '</div>'
            + '<div class="m-meta">' + esc([c.name, m.type, m.visitDate ? 'زيارة ' + fmtDate(m.visitDate) : '', m.serial ? 'S/N ' + m.serial : ''].filter(Boolean).join(' · ')) + '</div>'
            + '<div class="m-meta">' + (w.state !== 'none' ? '<span class="src-badge' + (w.state === 'expired' ? ' warn' : '') + '">' + esc(w.label) + '</span> ' : '') + (m.nextVisit ? '<span class="src-badge' + (late ? ' warn' : '') + '">الجاية ' + esc(fmtDate(m.nextVisit)) + (late ? ' (فات ميعادها)' : '') + '</span>' : '') + '</div></div>'
            + '<span class="m-qty">' + (v.total ? esc(money(v.total)) : '—') + '</span></div>';
        }).join('') : '<div class="home-empty">' + (tab === 'due' ? 'مفيش زيارات متسجل ليها ميعاد' : 'مفيش سجلات صيانة لسه') + '</div>');
    }
    return h + '</div>';
  }
  function openMaintSheet(id, pre) {
    var m = id ? clone(db.maint.find(function (x) { return x.id === id; }) || {}) : (pre || {});
    var c = getCust(m.custId) || {};
    var f = function (k, l, t, ph) { return '<div class="field"><label for="f_m' + k + '">' + l + '</label><input type="' + (t || 'text') + '" id="f_m' + k + '"' + (t === 'num' ? ' inputmode="decimal" dir="ltr"' : '') + ' value="' + esc(v0(m[k])) + '" placeholder="' + esc(ph || '') + '"></div>'; };
    openSheet(id ? 'تعديل سجل صيانة' : 'تسجيل جهاز / زيارة', custOptions()
      + '<div class="field"><label for="f_mcust">العميل</label><input type="text" id="f_mcust" list="custNames" value="' + esc(c.name || '') + '" autocomplete="off"></div>'
      + '<div class="row-2"><div class="field"><label for="f_mjob">المشروع</label><select id="f_mjob"><option value="">—</option>' + sortedJobs().map(function (j) { return '<option value="' + esc(j.id) + '"' + (m.jobId === j.id ? ' selected' : '') + '>' + esc(custName(j) + ' ' + (j.title || '') + ' ' + j.number) + '</option>'; }).join('') + '</select></div>'
      + '<div class="field"><label for="f_msys">النظام</label><select id="f_msys"><option value="">—</option>' + K.SYSTEMS.concat(customSystems().map(function (s) { return { id: s.label, label: s.label }; })).map(function (s) { return '<option value="' + esc(s.label) + '"' + (m.sys === s.label ? ' selected' : '') + '>' + esc(s.label) + '</option>'; }).join('') + '</select></div></div>'
      + '<div class="row-2">' + f('device', 'الجهاز') + f('serial', 'الرقم التسلسلي') + '</div><div class="row-2">' + f('brand', 'الماركة') + f('model', 'الموديل') + '</div>'
      + '<div class="row-2">' + f('installDate', 'تاريخ التركيب', 'date') + f('wStart', 'بداية الضمان', 'date') + '</div><div class="row-2">' + f('wEnd', 'نهاية الضمان', 'date') + '<div class="field"><label for="f_mtype">نوع الصيانة</label><input type="text" id="f_mtype" list="maintTypes" value="' + esc(v0(m.type)) + '"><datalist id="maintTypes">' + K.MAINT_TYPES.map(function (x) { return '<option value="' + esc(x) + '">'; }).join('') + '</datalist></div></div>'
      + f('fault', 'وصف العطل') + f('action', 'الإجراء') + f('parts', 'قطع الغيار')
      + '<div class="row-2">' + f('partsCost', 'تكلفة القطع (عليك)', 'num') + f('partsPrice', 'سعر القطع للعميل', 'num') + '</div><div class="row-2">' + f('labor', 'المصنعية', 'num') + f('paid', 'المدفوع', 'num') + '</div>'
      + '<div class="row-2">' + f('visitDate', 'تاريخ الزيارة', 'date') + f('nextVisit', 'الزيارة الجاية', 'date') + '</div>' + f('notes', 'ملاحظات')
      + '<button type="button" class="btn btn-accent" data-act="maintSave">' + ic('check') + ' حفظ</button>' + (id ? '<button type="button" class="btn btn-danger" data-act="maintDel" style="margin-top:10px">' + ic('trash') + ' حذف</button>' : ''), { form: 'maint', maintId: id || null });
  }
  function maintSave() {
    var m = S.maintId ? db.maint.find(function (x) { return x.id === S.maintId; }) : null;
    var cname = $('f_mcust').value.trim(); if (!cname) { toast('اكتب اسم العميل'); return; }
    if (!m) { m = { id: uid('m'), createdAt: new Date().toISOString() }; db.maint.push(m); }
    m.custId = ensureCustomer(cname).id; m.jobId = $('f_mjob').value; m.sys = $('f_msys').value;
    ['device', 'serial', 'brand', 'model', 'installDate', 'wStart', 'wEnd', 'type', 'fault', 'action', 'parts', 'partsCost', 'partsPrice', 'labor', 'paid', 'visitDate', 'nextVisit', 'notes'].forEach(function (k) { m[k] = $('f_m' + k).value.trim(); });
    saveDb(); closeTop(function () { refresh(); toast('اتحفظ سجل الصيانة'); });
  }
  function openContractSheet(id) {
    var k = id ? clone(db.contracts.find(function (x) { return x.id === id; }) || {}) : { period: 'monthly' };
    var c = getCust(k.custId) || {};
    openSheet(id ? 'تعديل عقد صيانة' : 'عقد صيانة', custOptions()
      + '<div class="field"><label for="f_kcust">العميل</label><input type="text" id="f_kcust" list="custNames" value="' + esc(c.name || '') + '"></div>'
      + '<div class="field"><label for="f_ktitle">العقد</label><input type="text" id="f_ktitle" value="' + esc(v0(k.title)) + '" placeholder="مثلاً: صيانة كاميرات المصنع"></div>'
      + '<div class="field"><label>النوع</label><div class="segmented seg-wrap seg-sm" id="f_kper">' + Object.keys(C.PERIOD).map(function (p) { return '<button type="button" class="' + (k.period === p ? 'on' : '') + '" data-act="kPeriod" data-v="' + p + '">' + C.PERIOD[p][0] + '</button>'; }).join('') + '</div></div>'
      + '<div class="row-2"><div class="field"><label for="f_kmonths">مدة العقد (شهور)</label><input type="text" id="f_kmonths" inputmode="decimal" dir="ltr" value="' + esc(v0(k.months)) + '"></div><div class="field"><label for="f_kvisits">عدد الزيارات (لو بالعدد)</label><input type="text" id="f_kvisits" inputmode="decimal" dir="ltr" value="' + esc(v0(k.visits)) + '"></div></div>'
      + '<div class="row-2"><div class="field"><label for="f_kstart">البداية</label><input type="date" id="f_kstart" value="' + esc(v0(k.start)) + '"></div><div class="field"><label for="f_kvalue">قيمة العقد</label><input type="text" id="f_kvalue" inputmode="decimal" dir="ltr" value="' + esc(v0(k.value)) + '"></div></div>'
      + '<div class="field"><label for="f_knotes">ملاحظات</label><input type="text" id="f_knotes" value="' + esc(v0(k.notes)) + '"></div>'
      + '<button type="button" class="btn btn-accent" data-act="contractSave">' + ic('check') + ' حفظ</button>' + (id ? '<button type="button" class="btn btn-danger" data-act="contractDel" style="margin-top:10px">' + ic('trash') + ' حذف العقد</button>' : ''), { form: 'contract', kId: id || null, period: k.period });
  }
  function contractSave() {
    var cname = $('f_kcust').value.trim(); if (!cname) { toast('اكتب اسم العميل'); return; }
    var k = S.kId ? db.contracts.find(function (x) { return x.id === S.kId; }) : null;
    if (!k) { k = { id: uid('k'), payments: [], done: [] }; db.contracts.push(k); }
    k.custId = ensureCustomer(cname).id; k.title = $('f_ktitle').value.trim(); k.period = S.period || 'monthly'; k.months = $('f_kmonths').value; k.visits = $('f_kvisits').value;
    k.start = $('f_kstart').value; k.value = $('f_kvalue').value; k.notes = $('f_knotes').value.trim();
    saveDb(); closeTop(function () { refresh(); toast('اتحفظ العقد'); });
  }
  // ---- التقارير ----
  function inPeriod(d) { var p = toolState.repPeriod, t = today(); if (p === 'all' || !d) return p === 'all'; return p === 'month' ? String(d).slice(0, 7) === t.slice(0, 7) : String(d).slice(0, 4) === t.slice(0, 4); }
  function reportsHTML() {
    var t = today(), js = db.jobs.filter(function (j) { return inPeriod(j.date); }), real = js.filter(function (j) { return j.status !== 'quote'; });
    var tot = 0, lab = 0, mat = 0, matCost = 0, exp = 0, cost = 0, profit = 0, paid = 0, due = [], late = [], bySys = {}, byMat = {};
    real.forEach(function (j) {
      var r = C.job(j); tot += r.total; lab += r.labor; mat += r.matSell; matCost += r.byType.mat; exp += r.totalCost - r.byType.mat; cost += r.totalCost; profit += r.profit; paid += r.paid;
      if (r.remaining > 0.005) due.push([j, r.remaining]);
      if (j.due && j.due < t && j.status !== 'done') late.push(j);
      j.items.forEach(function (it, i) {
        var x = r.items[i], key = it.kind === 'custom' ? 'custom:' + customName(it) : it.kind, lbl = it.kind === 'custom' ? customName(it) : kindLabel(it.kind).replace(/^حاسبة /, '');
        var b = bySys[key] || (bySys[key] = { label: lbl, count: 0, total: 0, cost: 0 }); b.count++; b.total += x.total; b.cost += x.cost;
        x.lines.forEach(function (l) { if (!l.name) return; var m = byMat[l.name + '|' + l.unit] || (byMat[l.name + '|' + l.unit] = { name: l.name, unit: l.unit, qty: 0, cost: 0 }); m.qty += l.final; m.cost += l.costT; });
      });
    });
    var mv = db.maint.filter(function (m) { return inPeriod(m.visitDate || m.installDate); }), mRev = 0, mProfit = 0;
    mv.forEach(function (m) { var v = C.visit(m); mRev += v.total; mProfit += v.profit; });
    var kVal = 0, kRem = 0; db.contracts.forEach(function (k) { var r = C.contract(k); kVal += r.value; kRem += r.remaining; });
    var sysList = Object.keys(bySys).map(function (k) { return bySys[k]; }).sort(function (a, b) { return b.count - a.count; });
    var matList = Object.keys(byMat).map(function (k) { return byMat[k]; }).sort(function (a, b) { return b.qty - a.qty; }).slice(0, 10);
    return toolHead('التقارير', 'التيار الخفيف') + '<div class="container"><div class="segmented seg-3" style="margin-bottom:12px">'
      + [['month', 'الشهر ده'], ['year', 'السنة دي'], ['all', 'الكل']].map(function (o) { return '<button type="button" class="' + (toolState.repPeriod === o[0] ? 'on' : '') + '" data-act="repPeriod" data-v="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div>'
      + card('المشاريع', 'file', '<div class="sum-list" id="repMain">' + row('عدد المشاريع', js.length + ' (عروض أسعار ' + (js.length - real.length) + ')') + row('العملاء', String(db.customers.length)) + row('إجمالي قيمة المشاريع', money(tot), 'bold')
        + row('إجمالي المصنعية', money(lab)) + row('الأجهزة والخامات (بيع)', money(mat)) + row('الأجهزة والخامات (شراء)', money(matCost)) + row('المصروفات والعمالة', money(exp))
        + row('إجمالي التكاليف', money(cost)) + '<div class="sum-row profit' + (profit < 0 ? ' neg' : '') + '"><span>الأرباح</span><strong dir="ltr">' + esc(money(profit)) + '</strong></div>' + row('المدفوعات', money(paid)) + row('المتبقي عند العملاء', money(tot - paid)) + '</div>')
      + card('أكتر الأنظمة استخداماً وتكلفة كل تخصص', 'chart', sysList.length ? '<div class="sum-list">' + sysList.map(function (s) { return row(s.label + ' (' + s.count + ')', money(s.total) + ' · تكلفة ' + money(s.cost)); }).join('') + '</div>' : '<p class="hint">مفيش بيانات</p>')
      + card('أكتر الخامات استهلاكاً', 'box', matList.length ? '<div class="sum-list">' + matList.map(function (m) { return row(m.name, fq(m.qty) + ' ' + m.unit + (m.cost ? ' · ' + money(m.cost) : '')); }).join('') + '</div>' : '<p class="hint">مفيش بيانات</p>')
      + card('الفواتير المستحقة', 'receipt', due.length ? due.sort(function (a, b) { return b[1] - a[1]; }).map(function (d) { return '<div class="mat-row" data-act="openJob" data-id="' + esc(d[0].id) + '"><div class="m-info"><div class="m-name">' + esc(custName(d[0])) + '</div><div class="m-meta">' + esc([d[0].title, d[0].number].filter(Boolean).join(' · ')) + '</div></div><span class="m-qty">' + esc(money(d[1])) + '</span></div>'; }).join('') : '<p class="hint">مفيش فلوس متأخرة</p>')
      + card('المشاريع المتأخرة', 'calendar', late.length ? late.map(function (j) { return '<div class="mat-row" data-act="openJob" data-id="' + esc(j.id) + '"><div class="m-info"><div class="m-name">' + esc(custName(j)) + '</div><div class="m-meta">التسليم ' + esc(fmtDate(j.due)) + '</div></div></div>'; }).join('') : '<p class="hint">مفيش مشاريع فاتت ميعاد تسليمها (حدد «موعد التسليم» من بيانات المشروع).</p>')
      + card('الصيانة', 'wrench', '<div class="sum-list">' + row('زيارات / أجهزة', String(mv.length)) + row('إيراد الصيانة', money(mRev)) + row('ربح الصيانة', money(mProfit)) + row('قيمة العقود', money(kVal)) + row('المتبقي في العقود', money(kRem)) + '</div>') + '</div>';
  }
  // ---- النوتة ----
  function notesHTML() {
    return toolHead('النوتة', 'حسابات محفوظة ترجعلها في أي وقت') + '<div class="container">'
      + (db.notes.length ? db.notes.map(function (n) {
        return '<div class="sub-card"><div class="sc-head"><b class="grow">' + esc(n.title) + '<small class="muted"> — ' + esc(n.sys || '') + '</small></b><span class="src-badge">' + esc(fmtDate(n.date)) + '</span></div>'
          + '<div class="sum-list">' + row('الإجمالي', money(n.total)) + '</div>'
          + '<div class="btn-row" style="margin-top:8px"><button type="button" class="btn btn-ghost btn-sm" data-act="noteOpen" data-id="' + esc(n.id) + '">' + ic('edit') + ' افتح الحاسبة</button><button type="button" class="btn btn-ghost btn-sm" data-act="noteShare" data-id="' + esc(n.id) + '">' + ic('share') + ' مشاركة</button><button type="button" class="btn btn-danger btn-sm" data-act="noteDel" data-id="' + esc(n.id) + '">' + ic('trash') + '</button></div></div>';
      }).join('') : '<div class="home-empty">النوتة فاضية — من أي حاسبة اضغط «للنوتة»</div>') + '</div>';
  }
  $('toolPage').addEventListener('input', function (e) {
    var el = e.target;
    if (el.dataset.lp != null) { settings.laborPrices[el.dataset.lp] = el.value; saveSettings(); }
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
    var c = x.calc, m = x.metrics, bits = [sysLabel(it)];
    if (m.camera) bits.push(m.camera + ' كاميرا'); else if (m.netpoint) bits.push(m.netpoint + ' نقطة شبكة'); else if (m.door) bits.push(m.door + ' باب'); else if (m.tvpoint) bits.push(m.tvpoint + ' نقطة تلفزيون'); else if (m.speaker) bits.push(m.speaker + ' سماعة'); else if (m.device) bits.push(m.device + ' جهاز');
    if (x.lines.length) bits.push(x.lines.length + ' صنف');
    if (!x.supply) bits.push('تركيب فقط');
    if (c.warn.length) bits.push('⚠ ' + c.warn.length);
    return bits.filter(Boolean).join(' · ');
  }
  function costRowHTML(c, x) {
    var meta = c.mode === 'pct' ? fq(x.pct) + '% من الخامات ' + fmt(x.base) : c.mode === 'amount' ? 'مبلغ' : fq(x.qty) + ' ' + (c.unit || '') + ' × ' + fmt(x.price) + (x.wasteCost ? ' + هالك ' + fq(x.wastePct) + '%' : '');
    return '<div class="mat-row" data-act="editCost" data-id="' + esc(c.id) + '"><div class="m-info"><div class="m-name">' + esc(c.name || C.COST_TYPES[c.type]) + ' <span class="src-badge">' + (c.billed ? 'على العميل' : 'عليك') + '</span></div><div class="m-meta">' + esc(meta + (c.supplier ? ' · ' + c.supplier : '')) + '</div></div><span class="m-qty">' + esc(money(x.total)) + '</span></div>';
  }
  function renderJob(id) {
    var j = getJob(id); if (!j) return;
    var c = getCust(j.customerId) || null, r = C.job(j);
    var items = j.items.map(function (it, i) {
      var x = r.items[i];
      return '<div class="item-card" data-act="editItem" data-id="' + esc(it.id) + '"><span class="room-num">' + (i + 1) + '</span><div class="i-info"><div class="i-name">' + esc(itemTitle(it)) + '</div><div class="i-meta">' + esc(itemMeta(it, x)) + '</div></div>'
        + '<div class="i-amt">' + esc(money(x.total)) + '<small>ربح ' + esc(fmt(x.profit)) + '</small></div></div>';
    }).join('');
    var costs = C.COST_ORDER.map(function (t) {
      var list = j.costs.map(function (k, i) { return [k, r.costs[i]]; }).filter(function (p) { return p[1].type === t; });
      return list.length ? '<p class="more-h">' + esc(C.COST_TYPES[t]) + '</p>' + list.map(function (p) { return costRowHTML(p[0], p[1]); }).join('') : '';
    }).join('');
    var pays = j.payments.slice().sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); }).map(function (p) {
      return '<div class="entry pay-row" data-act="editPay" data-id="' + esc(p.id) + '"><span class="e-ic">' + ic('cash') + '</span><div class="e-info"><div class="e-title">' + esc(p.note || 'دفعة') + '</div><div class="e-meta">' + esc(fmtDate(p.date)) + '</div></div><span class="e-amt">' + esc(money(p.amount)) + '</span></div>';
    }).join('');
    var disc = C.num(j.discount && j.discount.value) && j.discount.type === 'percent' ? ' (' + fq(j.discount.value) + '%)' : '';
    var late = j.due && j.due < today() && j.status !== 'done';
    var html = '<div class="pg-head"><button type="button" class="icon-btn" data-act="closeTop" aria-label="رجوع">' + ic('back') + '</button>'
      + '<div class="titles"><h2>' + esc(c ? c.name : 'حساب سريع') + '</h2><div class="sub">' + esc([j.title, j.number, fmtDate(j.date), j.site].filter(Boolean).join(' · ')) + '</div></div>'
      + '<button type="button" class="icon-btn" data-act="jobMenu" aria-label="خيارات المشروع">' + ic('more') + '</button></div><div class="container">'
      + '<section class="home-sum"><div class="hs-label">' + (j.status === 'quote' ? 'قيمة عرض السعر' : 'إجمالي المشروع') + '</div><div class="hs-value">' + esc(fmt(r.total)) + ' <small>' + esc(cur().sym) + '</small></div>'
      + '<div class="hs-stats"><button type="button" data-act="addPay"><span>المدفوع</span><strong>' + esc(fmt(r.paid)) + '</strong></button><button type="button" data-act="addPay"><span>المتبقي</span><strong>' + esc(fmt(r.remaining)) + '</strong></button>'
      + '<button type="button" class="mat" data-act="scrollProfit"><span>الربح التقديري</span><strong dir="ltr">' + esc(fmt(r.profit)) + '</strong></button></div></section>'
      + '<div class="status-row" style="margin:-4px 2px 12px">' + ['quote', 'active', 'done'].map(function (s) { return '<button type="button" class="chip' + ((j.status || 'active') === s ? ' on' : '') + '" data-act="setStatus" data-v="' + s + '">' + STATUS[s][0] + '</button>'; }).join('')
      + (j.due ? '<span class="src-badge' + (late ? ' warn' : '') + '">التسليم ' + esc(fmtDate(j.due)) + (late ? ' — متأخر' : '') + '</span>' : '') + '</div>'
      + (j.status === 'quote' ? '<button type="button" class="btn btn-soft" data-act="quoteToInvoice" style="margin-bottom:12px">' + ic('receipt') + ' حوّل عرض السعر لفاتورة</button>' : '')
      + '<div class="card"><div class="card-title"><span class="t-ic orange">' + ic('grid') + '</span><h2>الأنظمة في المشروع</h2>' + (j.items.length ? '<span class="tag">' + j.items.length + '</span>' : '') + '</div>'
      + (items || '<p class="card-empty">ضيف أول نظام:</p>') + '<button type="button" class="btn btn-soft" data-act="addSystem">' + ic('plus') + ' إضافة نظام / حاسبة</button></div>'
      + '<div class="card" id="costCard"><div class="card-title"><span class="t-ic">' + ic('box') + '</span><h2>العمال والمصروفات والهالك</h2></div>'
      + '<div class="chips wrap" style="margin-bottom:6px">' + C.COST_ORDER.map(function (t) { return '<button type="button" class="chip" data-act="addCost" data-type="' + t + '">+ ' + esc(C.COST_TYPES[t]) + '</button>'; }).join('') + '</div>'
      + (costs || '<p class="card-empty">اختياري — يوميات العمال والسلف، النقل، المصروفات، الهالك… على العميل أو تكلفة عليك. مفيش حاجة بتتحط لوحدها.</p>')
      + '<p class="hint">يوميات وسلف كل عامل بالتفصيل في «نوتة العمال» تحت.</p></div>'
      + '<div class="card"><div class="card-title"><span class="t-ic">' + ic('receipt') + '</span><h2>حساب العميل</h2></div><div class="sum-list">'
      + row('الأجهزة والخامات', money(r.matSell)) + row('المصنعية', money(r.labor)) + (r.extras ? row('إضافات', money(r.extras)) : '') + (r.billedCosts ? row('مصاريف على العميل', money(r.billedCosts)) : '')
      + '<div class="sum-row minus"><span>الخصم' + esc(disc) + ' <button type="button" class="edit-link" data-act="editDisc">' + (r.discount ? 'تعديل' : 'إضافة خصم') + '</button></span><strong>' + (r.discount ? '- ' : '') + esc(money(r.discount)) + '</strong></div>'
      + '<div class="sum-row"><span>الضريبة' + (r.taxPct ? ' ' + fq(r.taxPct) + '%' : '') + ' <button type="button" class="edit-link" data-act="editTax">' + (r.taxPct ? 'تعديل' : 'تفعيل') + '</button></span><strong>' + esc(money(r.tax)) + '</strong></div>'
      + row('الإجمالي', money(r.total), 'bold') + row('المدفوع', money(r.paid)) + '</div>'
      + '<div class="sum-total"><span>' + (r.remaining < -0.005 ? 'زيادة للعميل' : 'المتبقي على العميل') + '</span><strong>' + esc(money(Math.abs(r.remaining))) + '</strong></div>'
      + (pays ? '<div style="margin-top:10px">' + pays + '</div>' : '') + '<button type="button" class="btn btn-ghost" data-act="addPay" style="margin-top:10px">' + ic('cash') + ' تسجيل دفعة</button></div>'
      + '<div class="card" id="profitCard"><div class="card-title"><span class="t-ic orange">' + ic('chart') + '</span><h2>التكاليف والربح</h2></div><div class="sum-list">'
      + C.COST_ORDER.filter(function (t) { return r.byType[t]; }).map(function (t) { return row('تكلفة ' + C.COST_TYPES[t], money(r.byType[t])); }).join('')
      + row('إجمالي التكاليف', money(r.totalCost), 'bold') + row('قيمة المشروع' + (r.tax ? ' (من غير الضريبة)' : ''), money(r.total - r.tax))
      + '<div class="sum-row profit' + (r.profit < 0 ? ' neg' : '') + '"><span>' + (j.costsComplete ? 'الربح' : 'الربح التقديري') + '</span><strong dir="ltr">' + esc(money(r.profit)) + '</strong></div>' + row('هامش الربح', fq(r.margin) + '%') + '</div>'
      + '<p class="cost-note">' + (j.costsComplete ? 'من كل التكاليف اللي سجلتها.' : 'تقديري حسب التكاليف اللي اتسجلت بس.') + ' سعر شراء الأجهزة بيتحسب تكلفة، ومصنعيتك مش تكلفة. مش بيظهر للعميل.</p>'
      + '<label class="bill-toggle"><span>سجلت كل تكاليف المشروع</span><input type="checkbox" data-act="costsComplete"' + (j.costsComplete ? ' checked' : '') + '></label></div>'
      + (c ? '<div data-az-crew="' + SECTION + ':' + esc(j.customerId) + '" data-sec="' + SECTION_NAME + '" data-name="' + esc(c.name || '') + '" data-phone="' + esc(c.phone || '') + '" data-address="' + esc(c.address || '') + '" data-rev="' + esc(custRev(j.customerId)) + '" data-paid="' + esc(custPaid(j.customerId)) + '" data-cur="' + esc(cur().sym) + '"></div>' : '')
      + '<div class="card"><div class="card-title"><span class="t-ic">' + ic('wrench') + '</span><h2>الصيانة والضمان</h2></div>' + maintForJob(j) + '<button type="button" class="btn btn-ghost btn-sm" data-act="maintForJob">' + ic('plus') + ' تسجيل جهاز / ضمان / زيارة</button></div>'
      + '<div class="card"><div class="card-title"><span class="t-ic">' + ic('edit') + '</span><h2>ملاحظات المشروع</h2></div><textarea id="jobNotes" placeholder="بتظهر في الفاتورة">' + esc(j.notes || '') + '</textarea></div>'
      + '<div class="btn-row"><button type="button" class="btn btn-primary" data-act="preview" data-doc="invoice">' + ic('receipt') + ' الفاتورة</button><button type="button" class="btn btn-ghost" data-act="preview" data-doc="quote">' + ic('file') + ' عرض سعر</button></div>'
      + '<div class="btn-row" style="margin-top:10px"><button type="button" class="btn btn-ghost" data-act="preview" data-doc="materials">' + ic('box') + ' قايمة الخامات</button><button type="button" class="btn btn-ghost" data-act="preview" data-doc="costs">' + ic('chart') + ' التكاليف (داخلي)</button></div>'
      + '<div class="btn-row" style="margin-top:10px"><button type="button" class="btn btn-ghost" data-act="dupJob">' + ic('copy') + ' تكرار المشروع</button><button type="button" class="btn btn-danger" data-act="delJob">' + ic('trash') + ' حذف المشروع</button></div></div>'
      + '<div class="pg-foot"><div class="eb-info"><span>الإجمالي</span><strong>' + esc(money(r.total)) + '</strong></div><button type="button" class="btn btn-accent" data-act="preview" data-doc="' + (j.status === 'quote' ? 'quote' : 'invoice') + '">' + ic('print') + (j.status === 'quote' ? ' عرض السعر PDF' : ' الفاتورة PDF') + '</button></div>';
    var el = $('jobPage'), st = el.scrollTop; el.innerHTML = html; el.scrollTop = st;
    $('jobNotes').addEventListener('input', function () { j.notes = this.value; touch(j); saveDb(); });
  }
  function maintForJob(j) {
    var list = db.maint.filter(function (m) { return m.jobId === j.id; }), t = today();
    return list.length ? list.map(function (m) { var w = C.warranty(m, t); return '<div class="mat-row" data-act="maintEdit" data-id="' + esc(m.id) + '"><div class="m-info"><div class="m-name">' + esc([m.device, m.brand, m.model].filter(Boolean).join(' ') || 'جهاز') + '</div><div class="m-meta">' + esc(w.label || '') + (m.nextVisit ? ' · الجاية ' + esc(fmtDate(m.nextVisit)) : '') + '</div></div></div>'; }).join('') : '<p class="card-empty">سجّل الأجهزة اللي ركبتها بالرقم التسلسلي ومدة الضمان.</p>';
  }
  function openSystemPicker(jobId) {
    openSheet('إضافة نظام', '<div class="search-box">' + ic('search') + '<input type="search" id="f_kq" placeholder="دوّر: كاميرات، دش، فايبر…" autocomplete="off"></div><div id="f_klist"></div>', { form: 'syspick', jobId: jobId });
    var draw = function () {
      var q = $('f_kq').value.trim();
      $('f_klist').innerHTML = K.SYSTEMS.map(function (s) {
        var ks = s.kinds.filter(function (k) { return !q || (s.label + ' ' + s.en + ' ' + KINDS[k].label).toLowerCase().indexOf(q.toLowerCase()) >= 0; });
        return ks.length ? '<p class="more-h">' + esc(s.label) + '</p><div class="type-tiles compact">' + ks.map(function (k) { return kindTile(k, 'pickKind'); }).join('') + '</div>' : '';
      }).join('') + '<p class="more-h">أنظمة مخصصة</p><div class="type-tiles compact">' + customSystems().map(function (s) { return '<button type="button" class="t-tile" data-act="pickKind" data-kind="custom" data-sys="' + esc(s.label) + '"><span class="q-ic orange-soft">' + ic('plus') + '</span><b>' + esc(s.label) + '</b></button>'; }).join('')
        + '<button type="button" class="t-tile add" data-act="pickKind" data-kind="custom"><span class="q-ic">' + ic('plus') + '</span><b>بند حر / نظام جديد</b></button></div>';
    };
    draw(); $('f_kq').addEventListener('input', draw);
  }

  // ====================================================================
  // المستندات: فاتورة — عرض سعر — قايمة الخامات — التكاليف (داخلي) — كشف حساب
  // ====================================================================
  var pv = null;
  function business() { var b = settings.business || {}; return { name: b.name || '', trade: 'أعمال التيار الخفيف', phone: b.phone || '', address: b.address || '', logo: b.logo || '' }; }
  function jobDocHTML(j, doc) {
    var r = C.job(j), c = getCust(j.customerId) || {}, A = window.ArzaqiInvoice, rows = '', n = 0;
    j.items.forEach(function (it, i) {
      var x = r.items[i];
      rows += '<tr class="sys-row"><td colspan="5">' + A.esc(itemTitle(it)) + (sysLabel(it) && sysLabel(it) !== itemTitle(it) ? ' — ' + A.esc(sysLabel(it)) : '') + (!x.supply ? ' (تركيب فقط — الأجهزة من العميل)' : '') + '</td></tr>';
      if (x.supply) x.lines.forEach(function (l, k) {
        var src = it.lines[k] || {}; if (!l.final) return; n++;
        rows += '<tr><td class="idx">' + n + '</td><td class="t">' + A.esc(l.name) + ((src.brand || src.model) ? '<span class="sub-note">' + A.esc([src.brand, src.model].filter(Boolean).join(' — ')) + '</span>' : '') + '</td><td>' + fq(l.final) + ' ' + A.esc(l.unit) + '</td><td class="money">' + (l.price ? fmt(l.price) : '—') + '</td><td class="money">' + money(l.sellT) + '</td></tr>';
      });
      if (x.routes && x.supply) x.routes.groups.forEach(function (g) { if (!g.sell) return; n++; rows += '<tr><td class="idx">' + n + '</td><td class="t">كابل ' + A.esc(g.type) + '</td><td>' + fq(g.after) + ' م</td><td class="money">' + fmt(g.pricePer) + '</td><td class="money">' + money(g.sell) + '</td></tr>'; });
      x.labor.forEach(function (l) { if (!l.amount) return; n++; rows += '<tr><td class="idx">' + n + '</td><td class="t">مصنعية: ' + A.esc(l.name || l.label) + '<span class="sub-note">' + A.esc(l.label) + '</span></td><td>' + (l.method === 'lump' ? '—' : fq(l.qty) + (l.method === 'daily' ? ' يوم' : '')) + '</td><td class="money">' + (l.method === 'lump' ? '—' : fmt(l.price)) + '</td><td class="money">' + money(l.amount) + '</td></tr>'; });
      x.extras.forEach(function (e) { if (!e.amount) return; n++; rows += '<tr><td class="idx">' + n + '</td><td class="t">' + A.esc(e.name || 'إضافة') + '</td><td>—</td><td>—</td><td class="money">' + money(e.amount) + '</td></tr>'; });
      if (it.notes) rows += '<tr class="task"><td></td><td class="t" colspan="4"><span class="sub-note">' + A.esc(it.notes) + '</span></td></tr>';
    });
    j.costs.forEach(function (k, i) { var x = r.costs[i]; if (!x.billed) return; n++; rows += '<tr><td class="idx">' + n + '</td><td class="t">' + A.esc(k.name || C.COST_TYPES[x.type]) + '</td><td>' + (k.mode ? '—' : fq(x.qty) + ' ' + A.esc(k.unit || '')) + '</td><td class="money">' + (k.mode ? '—' : fmt(x.price)) + '</td><td class="money">' + money(x.total) + '</td></tr>'; });
    var body = '<div class="inv-sec"><span class="n">1</span> الأنظمة والبنود</div><table class="p-table lc-table"><thead><tr><th>م</th><th>البند والموديل</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th></tr></thead><tbody>'
      + (rows || '<tr><td colspan="5">لسه مفيش بنود</td></tr>') + '</tbody></table>';
    var notes = [j.notes, settings.terms].map(function (s) { return String(s || '').trim(); }).filter(Boolean), cc = cur();
    var discLbl = 'الخصم' + (j.discount && j.discount.type === 'percent' && C.num(j.discount.value) ? ' (' + fq(j.discount.value) + '%)' : '');
    return A.render({ section: SECTION, docKey: doc + ':' + j.id, docLabel: doc === 'quote' ? 'عرض سعر' : 'فاتورة', number: j.number, date: fmtDate(j.date || today()), billable: doc !== 'quote', currency: cc.name + ' (' + cc.sym + ')', business: business(),
      client: { name: c.name || '', phone: c.phone || '', address: c.address || '', note: c.note || '' }, fields: [{ label: 'المشروع', value: j.title || '' }, { label: 'الموقع', value: j.site || '' }], bodyHTML: body,
      notesHTML: notes.length ? '<div class="inv-notes"><h4>ملاحظات</h4>' + notes.map(function (x) { return '<div>' + A.esc(x).replace(/\n/g, '<br>') + '</div>'; }).join('') + '</div>' : '',
      totals: { lines: [['الأجهزة والخامات', r.matSell], ['المصنعية', r.labor], ['إضافات', r.extras], ['مصاريف', r.billedCosts], [discLbl, r.discount, '-'], ['الضريبة' + (r.taxPct ? ' ' + fq(r.taxPct) + '%' : ''), r.tax]], total: r.total, totalLabel: doc === 'quote' ? 'إجمالي العرض' : 'الإجمالي', paid: r.paid, paidLabel: 'المدفوع' },
      netLabel: 'إجمالي عرض السعر', money: money, signLabel: 'توقيع الفني / المقاول' });
  }
  function materialsDocHTML(j) {
    var r = C.job(j), c = getCust(j.customerId) || {}, A = window.ArzaqiInvoice, cc = cur(), agg = {}, order = [];
    j.items.forEach(function (it, i) {
      r.items[i].lines.forEach(function (l, k) { if (!l.final) return; var src = it.lines[k] || {}, key = [l.name, src.brand, src.model, l.unit].join('|'); if (!agg[key]) { agg[key] = { name: l.name, bm: [src.brand, src.model].filter(Boolean).join(' — '), unit: l.unit, qty: 0, sys: [] }; order.push(key); } agg[key].qty += l.final; if (agg[key].sys.indexOf(itemTitle(it)) < 0) agg[key].sys.push(itemTitle(it)); });
      if (r.items[i].routes) r.items[i].routes.groups.forEach(function (g) { var key = 'كابل ' + g.type + '||' + 'م'; if (!agg[key]) { agg[key] = { name: 'كابل ' + g.type, bm: g.reel ? g.reels + ' بكرة × ' + fq(g.reel) + ' م' : '', unit: 'م', qty: 0, sys: [] }; order.push(key); } agg[key].qty += g.after; });
    });
    var body = '<div class="inv-sec"><span class="n">1</span> قايمة الأجهزة والخامات</div><table class="p-table"><thead><tr><th>م</th><th>الصنف</th><th>الماركة / الموديل</th><th>الكمية</th><th>النظام</th></tr></thead><tbody>'
      + (order.map(function (k, i) { var a = agg[k]; return '<tr><td class="idx">' + (i + 1) + '</td><td class="t">' + A.esc(a.name) + '</td><td>' + A.esc(a.bm) + '</td><td class="money">' + fq(a.qty) + ' ' + A.esc(a.unit) + '</td><td>' + A.esc(a.sys.join('، ')) + '</td></tr>'; }).join('') || '<tr><td colspan="5">مفيش خامات</td></tr>') + '</tbody></table>';
    return A.render({ section: SECTION, docKey: 'materials:' + j.id, docLabel: 'قايمة الخامات', number: j.number, date: fmtDate(today()), billable: false, currency: cc.name + ' (' + cc.sym + ')', business: business(),
      client: { name: c.name || '', phone: c.phone || '' }, fields: [{ label: 'المشروع', value: j.title || '' }], bodyHTML: body,
      totals: { lines: [], total: order.length, totalLabel: 'عدد الأصناف', noSum: true }, netLabel: 'عدد الأصناف', boxTitle: 'الأصناف', money: function (v) { return fq(v); }, noWarranty: true, signs: [] });
  }
  function costsDocHTML(j) {
    var r = C.job(j), c = getCust(j.customerId) || {}, A = window.ArzaqiInvoice, cc = cur(), lines = [];
    j.items.forEach(function (it, i) { var x = r.items[i]; if (x.cost) lines.push([itemTitle(it), 'أجهزة وخامات (شراء)', x.lines.length + ' صنف', x.cost]); });
    j.costs.forEach(function (k, i) { var x = r.costs[i]; lines.push([k.name || C.COST_TYPES[x.type], C.COST_TYPES[x.type] + (k.billed ? ' · على العميل' : ''), k.mode === 'pct' ? fq(x.pct) + '%' : k.mode === 'amount' ? 'مبلغ' : fq(x.qty) + ' ' + (k.unit || ''), x.total]); });
    var body = '<div class="inv-sec"><span class="n">1</span> التكاليف (داخلي — مش للعميل)</div><table class="p-table"><thead><tr><th>م</th><th>البيان</th><th>النوع</th><th>الكمية</th><th>الإجمالي</th></tr></thead><tbody>'
      + (lines.map(function (l, i) { return '<tr><td class="idx">' + (i + 1) + '</td><td class="t">' + A.esc(l[0]) + '</td><td>' + A.esc(l[1]) + '</td><td>' + A.esc(l[2]) + '</td><td class="money">' + money(l[3]) + '</td></tr>'; }).join('') || '<tr><td colspan="5">مفيش تكاليف</td></tr>')
      + '</tbody><tfoot><tr><td colspan="4">إجمالي التكاليف</td><td>' + money(r.totalCost) + '</td></tr></tfoot></table>';
    var bySys = '<div class="inv-sec"><span class="n">2</span> كل نظام</div><table class="p-table"><thead><tr><th>م</th><th>النظام</th><th>البيع</th><th>الشراء</th><th>الربح</th></tr></thead><tbody>'
      + j.items.map(function (it, i) { var x = r.items[i]; return '<tr><td class="idx">' + (i + 1) + '</td><td class="t">' + A.esc(itemTitle(it)) + '</td><td class="money">' + money(x.total) + '</td><td class="money">' + money(x.cost) + '</td><td class="money">' + money(x.profit) + '</td></tr>'; }).join('') + '</tbody></table>';
    var summary = '<div class="inv-notes"><h4>الربح</h4><div>قيمة المشروع (من غير الضريبة): <b>' + money(r.total - r.tax) + '</b></div><div>إجمالي التكاليف: <b>' + money(r.totalCost) + '</b></div><div>' + (j.costsComplete ? 'الربح' : 'الربح التقديري') + ': <b>' + money(r.profit) + '</b> (هامش ' + fq(r.margin) + '%)</div></div>';
    return A.render({ section: SECTION, docKey: 'costs:' + j.id, docLabel: 'كشف التكاليف والربح', number: j.number, date: fmtDate(today()), billable: false, currency: cc.name + ' (' + cc.sym + ')', business: business(),
      client: { name: c.name || '', phone: c.phone || '' }, fields: [{ label: 'المشروع', value: j.title || '' }, { label: 'مستند', value: 'داخلي' }], bodyHTML: body + bySys, notesHTML: summary,
      totals: { lines: C.COST_ORDER.filter(function (t) { return r.byType[t]; }).map(function (t) { return [C.COST_TYPES[t], r.byType[t]]; }), total: r.totalCost, totalLabel: 'إجمالي التكاليف', noSum: true }, netLabel: 'إجمالي التكاليف', boxTitle: 'التكاليف', money: money, noWarranty: true, signs: [] });
  }

  // ---------------- الرئيسية ----------------
  function sysTile(s) { return '<button type="button" class="t-tile" data-act="openSys" data-sys="' + s.id + '"><span class="q-ic orange-soft">' + ic(s.icon) + '</span><b>' + esc(s.label) + '</b><small>' + esc(s.en) + '</small></button>'; }
  function renderSystems() {
    var q = ($('sysSearch').value || '').trim().toLowerCase();
    var list = K.SYSTEMS.filter(function (s) { return !q || (s.label + ' ' + s.en + ' ' + s.desc + ' ' + s.kinds.map(function (k) { return KINDS[k].label; }).join(' ')).toLowerCase().indexOf(q) >= 0; });
    var cs = customSystems().filter(function (s) { return !q || s.label.toLowerCase().indexOf(q) >= 0; });
    $('catTiles').innerHTML = list.map(sysTile).join('') + cs.map(function (s) { return '<button type="button" class="t-tile" data-act="quickKind" data-kind="custom" data-sys="' + esc(s.label) + '"><span class="q-ic orange-soft">' + ic('plus') + '</span><b>' + esc(s.label) + '</b><small>نظام بتاعك</small></button>'; }).join('')
      + (q ? '' : '<button type="button" class="t-tile add" data-act="newSystem"><span class="q-ic">' + ic('plus') + '</span><b>نظام جديد</b><small>اسم بتاعك</small></button>');
    var kq = q ? K.TOOLS.filter(function (k) { return KINDS[k].label.toLowerCase().indexOf(q) >= 0; }) : [];
    $('calcHits').innerHTML = kq.length ? '<p class="more-h">حاسبات</p><div class="type-tiles compact">' + kq.map(function (k) { return kindTile(k); }).join('') + '</div>' : '';
  }
  $('sysSearch').addEventListener('input', renderSystems);
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
    renderSystems();
    var t = today(), soon = db.maint.filter(function (m) { return m.nextVisit && C.daysBetween(t, m.nextVisit) <= 7; }).length;
    $('maintBadge').textContent = soon ? soon + ' زيارة قريبة' : 'سجل وضمان وعقود';
    $('notesBadge').textContent = db.notes.length ? db.notes.length + ' حساب' : 'حسابات محفوظة';
    var rec = sortedJobs().slice(0, 4);
    $('homeRecent').innerHTML = rec.length ? rec.map(function (j) { return jobCard(j); }).join('') : '<div class="home-empty">لسه مفيش مشاريع. ابدأ بـ «مشروع جديد» أو افتح أي حاسبة.</div>';
    var h = new Date().getHours();
    $('greetLine').textContent = (h < 12 ? 'صباح الخير' : 'مساء الخير') + ' — التيار الخفيف';
  }
  function renderMore() {
    $('currencySelect').value = cur().code; applyTheme();
    $('bizName').value = settings.business.name || ''; $('bizPhone').value = settings.business.phone || '';
    $('bizAddress').value = settings.business.address || ''; $('bizTerms').value = settings.terms || '';
    $('moreLib').textContent = lib().length + ' صنف في مكتبتك';
    $('moreUnits').innerHTML = units().map(function (u) { var custom = arr(settings.units).indexOf(u) >= 0; return '<span class="chip static">' + esc(u) + (custom ? ' <button type="button" class="chip-x" data-act="delUnit" data-v="' + esc(u) + '">×</button>' : '') + '</span>'; }).join('');
    $('moreSystems').innerHTML = customSystems().length ? customSystems().map(function (s) { return '<span class="chip static">' + esc(s.label) + ' <button type="button" class="chip-x" data-act="delSystem" data-v="' + esc(s.label) + '">×</button></span>'; }).join('') : '<span class="hint">مفيش — ضيف من الرئيسية «نظام جديد»</span>';
    var tot = 0, cost = 0, labor = 0, due = 0;
    db.jobs.forEach(function (j) { if (j.status === 'quote') return; var r = C.job(j); tot += r.total; cost += r.totalCost; labor += r.labor; due += Math.max(r.remaining, 0); });
    $('moreStats').innerHTML = row('عدد المشاريع', String(db.jobs.length)) + row('إجمالي المصنعية', money(labor)) + row('إجمالي قيمة المشاريع', money(tot))
      + row('التكاليف المسجلة', money(cost)) + row('المتبقي عند العملاء', money(due));
  }
  function openSysSheet(id) {
    var s = K.sys(id); if (!s) return;
    openSheet(s.label + ' — ' + s.en, '<p class="hint" style="margin-top:-4px">' + esc(s.desc) + '</p><div class="type-tiles compact">' + s.kinds.map(function (k) { return kindTile(k, 'quickKindSheet'); }).join('') + '</div>'
      + '<button type="button" class="create-opt" data-act="libOfSys" data-sys="' + s.id + '" style="margin-top:10px"><span class="q-ic">' + ic('book') + '</span><span><b>خامات وأجهزة ' + esc(s.label) + '</b><small>من مكتبتك</small></span></button>', { sysId: id });
  }

  function custRev(cid) { return C.money(jobsOf(cid).filter(function (j) { return j.status !== 'quote'; }).reduce(function (s, j) { return s + C.job(j).total; }, 0)); }
  function custPaid(cid) { return C.money(jobsOf(cid).reduce(function (s, j) { return s + C.job(j).paid; }, 0)); }
  function openJobMenu() {
    openSheet('خيارات المشروع', '<div class="menu-list">'
      + '<button type="button" class="action-item" data-act="editJobInfo"><span class="a-ic">' + ic('edit') + '</span><span>تعديل بيانات المشروع<small>العميل، الاسم، الموقع، التاريخ، موعد التسليم</small></span></button>'
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

  // ---------------- اختيار مشروع (للدفعة) ----------------
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
    return ({ quote: 'عرض سعر', costs: 'كشف التكاليف', materials: 'قايمة الخامات', invoice: 'فاتورة' }[pv.doc] || 'فاتورة') + ' ' + (j.number || '') + ' — ' + custName(j);
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
  function findJob() { return getJob(openJobId); }
  var ACT = {
    closeTop: function () { closeTop(); },
    view: function (b) { var go = function () { if (b.dataset.filter) jobFilter.f = b.dataset.filter; switchView(b.dataset.view); }; if (stack.length) closeTop(go); else go(); },
    create: function () {
      openSheet('إنشاء جديد', '<div class="create-list"><button type="button" class="create-opt dark" data-act="newJob"><span class="q-ic orange">' + ic('plus') + '</span><span><b>مشروع جديد</b><small>عميل + أنظمة (كاميرات، شبكة، دش…) + فاتورة</small></span></button>'
        + '<button type="button" class="create-opt" data-act="tool" data-tool="calcs"><span class="q-ic">' + ic('grid') + '</span><span><b>الحاسبات والأدوات</b><small>' + K.TOOLS.length + ' حاسبة تشتغل لوحدها</small></span></button>'
        + '<div class="create-row"><button type="button" class="create-opt" data-act="quickPay"><span class="q-ic green">' + ic('cash') + '</span><span><b>تسجيل دفعة</b><small>من عميل</small></span></button>'
        + '<button type="button" class="create-opt" data-act="tool" data-tool="maint"><span class="q-ic">' + ic('wrench') + '</span><span><b>صيانة / ضمان</b><small>زيارة أو جهاز</small></span></button></div>'
        + '<button type="button" class="create-opt" data-act="newCustomer"><span class="q-ic">' + ic('users') + '</span><span><b>عميل جديد</b><small>اسم وتليفون</small></span></button></div>', {});
    },
    newJob: function () { afterSheet(function () { if (tool) closeTop(function () { openNewJobSheet(null); }); else openNewJobSheet(null); }); },
    newJobFor: function () { openNewJobSheet(openCustId); },
    createJob: createJob,
    quickKind: function (b) { openItem({ kind: b.dataset.kind, sysName: b.dataset.sys }); },
    quickKindSheet: function (b) { var k = b.dataset.kind; afterSheet(function () { openItem({ kind: k }); }); },
    pickKind: function (b) { var id = S.jobId, k = b.dataset.kind, s = b.dataset.sys; closeTop(function () { openItem({ jobId: id, kind: k, sysName: s }); }); },
    addSystem: function () { openSystemPicker(openJobId); },
    openSys: function (b) { openSysSheet(b.dataset.sys); },
    libOfSys: function (b) { var s = b.dataset.sys; afterSheet(function () { openTool('library', { libSys: s, libQ: '' }); }); },
    newSystem: function () { openSheet('نظام جديد', '<div class="field"><label for="f_sysn">اسم النظام</label><input type="text" id="f_sysn" placeholder="مثلاً: ستائر كهربا، شاشات عرض، UPS"></div><p class="hint">النظام المخصص فيه أجهزة وخامات ومسارات كابلات ومصنعية — من غير حاسبة جاهزة.</p><button type="button" class="btn btn-accent" data-act="saveSystem">' + ic('check') + ' حفظ</button>', {}); },
    saveSystem: function () { var n = $('f_sysn').value.trim(); if (!n) { toast('اكتب الاسم'); return; } if (!customSystems().some(function (s) { return s.label === n; })) { settings.systems = customSystems().concat([{ label: n }]); saveSettings(); } closeTop(function () { refresh(); toast('اتضاف «' + n + '»'); }); },
    delSystem: function (b) { settings.systems = customSystems().filter(function (s) { return s.label !== b.dataset.v; }); saveSettings(); refresh(); },
    addUnit: function () { var u = $('f_newUnit').value.trim(); if (!u) return; settings.units = arr(settings.units).concat([u]); saveSettings(); $('f_newUnit').value = ''; refresh(); toast('اتضافت الوحدة'); },
    delUnit: function (b) { settings.units = arr(settings.units).filter(function (u) { return u !== b.dataset.v; }); saveSettings(); refresh(); },
    quickPay: function () { openPickJob('pay'); },
    pickedJob: function (b) { var id = b.dataset.id, purpose = S.pickFor; closeTop(function () { openJob(id); if (purpose === 'pay') openPaySheet(id); }); },
    pickInvoice: function () { switchView('jobs'); setPick(true); renderJobs(); },
    cancelPick: function () { setPick(false); renderJobs(); },
    pickedInvoice: function (b) { setPick(false); renderJobs(); var j = getJob(b.dataset.id); openPreview({ doc: j && j.status === 'quote' ? 'quote' : 'invoice', jobId: b.dataset.id }); },
    openJob: function (b) { var id = b.dataset.id; if (tool) closeTop(function () { openJob(id); }); else openJob(id); },
    openCust: function (b) { openCust(b.dataset.id); },
    newCustomer: function () { afterSheet(function () { openCustomerSheet(null); }); },
    saveCustomer: saveCustomer,
    editCust: function () { openCustomerSheet(openCustId); },
    delCust: delCust,
    statement: function () { openPreview({ doc: 'statement', custId: openCustId }); },
    pickCust: function (b) { var c = getCust(b.dataset.id); if (!c) return; $('f_cname').value = c.name; P().custName = c.name; P().custId = c.id; $('f_csug').innerHTML = ''; if ($('f_cphone') && !$('f_cphone').value) $('f_cphone').value = c.phone || ''; renderTargetJobs(); },
    target: function (b) { P().targetJob = b.dataset.id || null; renderTargetJobs(); },
    // ---- الحاسبة / النظام ----
    editItem: function (b) { openItem({ jobId: openJobId, itemId: b.dataset.id }); },
    setK: function (b) { setPath(E.it, b.dataset.k, b.dataset.v); renderItemPage(); },
    addRow: function (b) { listAt(b.dataset.path).push(clone(ROWDEF[b.dataset.path] || {})); renderItemPage(); },
    delAt: function (b) { listAt(b.dataset.path).splice(+b.dataset.i, 1); renderItemPage(); },
    dupAt: function (b) { var l = listAt(b.dataset.path), x = clone(l[+b.dataset.i]); if (x && x.name) x.name += ' (نسخة)'; if (x && x.id) x.id = uid('l'); l.splice(+b.dataset.i + 1, 0, x); renderItemPage(); },
    addLine: function () { E.it.lines.push({ id: uid('l'), name: '', qty: '1', unit: 'قطعة', cost: '', price: '' }); renderItemPage(); },
    pickLib: function (b) { openLibPick(+b.dataset.i); },
    libPickSys: function (b) { S.sys = b.dataset.v; Array.prototype.forEach.call($('f_lsys').children, function (x) { x.classList.toggle('on', x === b); }); renderLibPick(); },
    libPicked: function (b) { libPicked(b.dataset.id); },
    addRoute: function () { var it = E.it; if (!it.ctypes.length) it.ctypes.push({ type: 'CAT6', reel: '', wastePct: '', cost: '', price: '' }); it.routes.push({ name: 'مسار ' + (it.routes.length + 1), len: '', count: '1', type: it.ctypes[0].type }); renderItemPage(); },
    addCtype: function () { E.it.ctypes.push({ type: 'RG6', reel: '', wastePct: '', cost: '', price: '' }); renderItemPage(); },
    addLabor: function () { E.it.labor.push({ name: '', method: 'lump', qty: '', price: '' }); renderItemPage(); },
    addExtra: function (b) { E.it.extras.push({ name: b.dataset.v, amount: '' }); renderItemPage(); },
    applySug: applySug,
    resetItem: function () { confirmDlg('إعادة ضبط الحاسبة؟', 'هتتمسح المدخلات والسطور والمصنعية في الحاسبة دي (اللي محفوظ قبل كده مش هيتأثر لحد ما تحفظ).', 'أيوه، ابدأ من جديد').then(function (ok) { if (!ok) return; var k = E.it.kind, s = E.it['in'] && E.it['in'].sysName; E.it = blankItem(k, { sysName: s }); renderItemPage(); toast('اتعملت إعادة ضبط'); }); },
    toNote: toNote,
    shareItem: function () { shareText(itemTitle(E.it), itemText(E.it)); },
    saveItem: function () { saveItem(); },
    saveInvoice: function () { saveItem(function (jid) { openJob(jid); openPreview({ doc: (getJob(jid) || {}).status === 'quote' ? 'quote' : 'invoice', jobId: jid }); }); },
    dupItem: function () { var j = getJob(E.jobId); if (!j) return; var src = j.items.find(function (x) { return x.id === E.itemId; }); if (!src) return; var c = clone(src); c.id = uid('i'); j.items.splice(j.items.indexOf(src) + 1, 0, c); touch(j); saveDb(); closeTop(function () { refresh(); toast('اتكرر'); }); },
    delItem: function () {
      var j = getJob(E.jobId), id = E.itemId; if (!j) return;
      confirmDlg('حذف النظام؟', 'هيتمسح «' + itemTitle(E.it) + '» من المشروع.', 'أيوه، امسح').then(function (ok) { if (!ok) return; j.items = j.items.filter(function (x) { return x.id !== id; }); touch(j); saveDb(); closeTop(function () { refresh(); toast('اتمسح'); }); });
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
    costsComplete: function (b) { var j = findJob(); if (!j) return; j.costsComplete = !!b.checked; touch(j); saveDb(); refresh(); },
    // ---- الحساب ----
    addPay: function () { openPaySheet(openJobId); },
    editPay: function (b) { openPaySheet(openJobId, b.dataset.id); },
    payAll: function (b) { $('f_pamt').value = b.dataset.v; },
    savePay: savePay,
    delPay: function () { var j = getJob(S.jobId), id = S.payId; if (!j) return; j.payments = j.payments.filter(function (x) { return x.id !== id; }); touch(j); saveDb(); closeTop(function () { refresh(); toast('اتمسحت الدفعة'); }); },
    editDisc: function () { openDiscSheet(openJobId); },
    discType: function (b) { S.dtype = b.dataset.v; updateDiscLive(); },
    saveDisc: function () { var j = getJob(S.jobId); if (!j) return; j.discount = { type: S.dtype, value: C.num($('f_dval').value) }; touch(j); saveDb(); closeTop(function () { refresh(); toast('اتحفظ الخصم'); }); },
    editTax: function () { var j = findJob(); if (!j) return; openSheet('الضريبة', '<div class="field"><label for="f_tax">نسبة الضريبة %</label><input type="text" id="f_tax" inputmode="decimal" dir="ltr" value="' + esc(v0(j.tax && j.tax.pct)) + '" placeholder="0 = من غير ضريبة"></div><p class="hint">بتتحسب على الإجمالي بعد الخصم وبتظهر في الفاتورة. الضريبة مش ربح.</p><button type="button" class="btn btn-accent" data-act="saveTax">' + ic('check') + ' حفظ</button>', { jobId: j.id }); },
    saveTax: function () { var j = getJob(S.jobId); if (!j) return; j.tax = { pct: C.num($('f_tax').value) }; touch(j); saveDb(); closeTop(function () { refresh(); toast(j.tax.pct ? 'الضريبة ' + j.tax.pct + '%' : 'من غير ضريبة'); }); },
    setStatus: function (b) { var j = findJob(); if (!j) return; j.status = b.dataset.v; touch(j); saveDb(); refresh(); toast(STATUS[j.status][0]); },
    quoteToInvoice: function () { var j = findJob(); if (!j) return; j.status = 'active'; touch(j); saveDb(); refresh(); openPreview({ doc: 'invoice', jobId: j.id }); toast('بقى فاتورة'); },
    scrollProfit: function () { var el = $('profitCard'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); },
    jobMenu: openJobMenu, editJobInfo: openJobInfoSheet, saveJobInfo: saveJobInfo, dupJob: dupJob, delJob: delJob,
    openCustOfJob: function () { var j = findJob(); if (!j || !j.customerId) { toast('الحساب ده من غير عميل — عدّل بيانات المشروع وضيف اسم العميل'); return; } closeTop(function () { openCust(j.customerId); }); },
    preview: function (b) { openPreview({ doc: b.dataset.doc, jobId: openJobId }); },
    pvDoc: function (b) { if (!pv) return; pv.doc = b.dataset.doc; renderPreview(); fitPreview(); },
    clearJobFilter: function () { jobFilter.cust = ''; jobFilter.from = ''; jobFilter.to = ''; $('jobFrom').value = ''; $('jobTo').value = ''; renderJobs(); },
    // ---- الأدوات ----
    tool: function (b) { var t = b.dataset.tool; afterSheet(function () { if (tool) { tool = t; renderTool(); } else openTool(t); }); },
    libSys: function (b) { toolState.libSys = b.dataset.v; renderTool(); },
    libNew: function () { openLibSheet(null); },
    libEdit: function (b) { openLibSheet(b.dataset.id); },
    libSave: libSave,
    libCopy: function () { var id = S.srcId; closeTop(function () { openLibSheet(id, true); }); },
    libDel: function () { var id = S.libId; settings.lib = lib().filter(function (x) { return x.id !== id; }); saveSettings(); closeTop(function () { refresh(); toast('اتمسح من المكتبة'); }); },
    addMethod: function () { var m = $('f_newMethod').value.trim(); if (!m) return; settings.laborMethods = arr(settings.laborMethods).concat([m]); saveSettings(); renderTool(); toast('اتضافت طريقة «' + m + '»'); },
    delMethod: function (b) { settings.laborMethods = arr(settings.laborMethods).filter(function (m) { return m !== b.dataset.v; }); saveSettings(); renderTool(); },
    addLp: function () { var n = $('f_lpName').value.trim(), p = $('f_lpPrice').value; if (!n || !C.num(p)) { toast('اكتب الاسم والسعر'); return; } settings.laborPrices = settings.laborPrices || {}; settings.laborPrices[lpKey(n, $('f_lpMethod').value)] = p; saveSettings(); renderTool(); toast('اتحفظ'); },
    delLp: function (b) { delete settings.laborPrices[b.dataset.v]; saveSettings(); renderTool(); },
    maintTab: function (b) { toolState.maintTab = b.dataset.v; renderTool(); },
    maintNew: function () { openMaintSheet(null); },
    maintEdit: function (b) { openMaintSheet(b.dataset.id); },
    maintSave: maintSave,
    maintDel: function () { var id = S.maintId; db.maint = db.maint.filter(function (x) { return x.id !== id; }); saveDb(); closeTop(function () { refresh(); toast('اتمسح'); }); },
    maintForJob: function () { var j = findJob(); if (!j) return; openMaintSheet(null, { custId: j.customerId, jobId: j.id, installDate: today() }); },
    contractNew: function () { openContractSheet(null); },
    contractEdit: function (b) { openContractSheet(b.dataset.id); },
    kPeriod: function (b) { S.period = b.dataset.v; Array.prototype.forEach.call($('f_kper').children, function (x) { x.classList.toggle('on', x === b); }); },
    contractSave: contractSave,
    contractDel: function () { var id = S.kId; db.contracts = db.contracts.filter(function (x) { return x.id !== id; }); saveDb(); closeTop(function () { refresh(); toast('اتمسح العقد'); }); },
    contractVisit: function (b) { var k = db.contracts.find(function (x) { return x.id === b.dataset.id; }); if (!k) return; k.done = arr(k.done).concat([{ date: today() }]); saveDb(); renderTool(); toast('اتسجلت زيارة'); },
    contractPay: function (b) { openSheet('دفعة على العقد', '<div class="field"><label for="f_kpay">المبلغ</label><input type="text" id="f_kpay" inputmode="decimal" dir="ltr"></div><button type="button" class="btn btn-accent" data-act="contractPaySave">' + ic('check') + ' حفظ</button>', { kId: b.dataset.id }); },
    contractPaySave: function () { var k = db.contracts.find(function (x) { return x.id === S.kId; }), a = C.num($('f_kpay').value); if (!k || !a) { toast('اكتب المبلغ'); return; } k.payments = arr(k.payments).concat([{ amount: a, date: today() }]); saveDb(); closeTop(function () { refresh(); toast('اتسجلت الدفعة'); }); },
    repPeriod: function (b) { toolState.repPeriod = b.dataset.v; renderTool(); },
    noteOpen: function (b) { var n = db.notes.find(function (x) { return x.id === b.dataset.id; }); if (!n) return; closeTop(function () { openItem({ it: n.it, kind: n.kind }); }); },
    noteShare: function (b) { var n = db.notes.find(function (x) { return x.id === b.dataset.id; }); if (n) shareText(n.title, n.text); },
    noteDel: function (b) { db.notes = db.notes.filter(function (x) { return x.id !== b.dataset.id; }); saveDb(); renderTool(); toast('اتمسح من النوتة'); }
  };
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]');
    if (!b || b.disabled) return;
    var f = ACT[b.dataset.act]; if (!f) return;
    if (b.tagName !== 'INPUT') e.preventDefault();
    f(b, e);
  });
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-theme-set]'); if (t) { settings.theme = t.dataset.themeSet; saveSettings(); applyTheme(); }
  });

  // ---------------- البداية ----------------
  if (history.state && history.state.cw) history.replaceState(null, '');
  applyTheme();
  renderHome();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', function () { navigator.serviceWorker.register('./service-worker.js').catch(function () {}); });
  }
  // للاختبارات: نفس الدوال اللي الواجهة بتستخدمها
  window.LowApp = { get db() { return db; }, settings: settings, openJob: openJob, openItem: openItem, openPreview: openPreview, openTool: openTool, calc: C, catalog: K, editor: function () { return E; }, lib: lib };

})();
