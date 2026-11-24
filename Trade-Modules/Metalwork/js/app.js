/*
 * أرزقي | Arzoqi — الحدادة وتصنيع الحديد: الواجهة.
 * الحسابات كلها في js/calc.js (MetalCalc). البيانات على الموبايل بس (localStorage):
 *   hmetal_db_v1        العملاء والحسابات (البنود، الخامات، تكاليف التشغيل والهالك، الخصم، الدفعات، الملاحظات)
 *   hmetal_settings_v1  المظهر، العملة، وحدة المقاسات، بيانات الفاتورة الاحتياطية، آخر أسعار ومنتجات كتبتها
 * الفاتورة: ArzaqiInvoice (نفس فاتورة كل الأقسام). نوتة العمال: ArzoqiCrew (نفس النوتة في كل الأقسام).
 * زرار الرجوع: كل نافذة أو صفحة بتتفتح بخطوة في سجل الرجوع (history.pushState)، فالرجوع بيقفلها.
 * © 2026 أحمد حسن عبدالله
 */
(function () {
  'use strict';
  var C = window.MetalCalc;
  var DB_KEY = 'hmetal_db_v1', SET_KEY = 'hmetal_settings_v1';
  var SECTION = 'metalwork', SECTION_NAME = 'الحدادة';
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ic(n) { return '<svg class="ic" aria-hidden="true"><use href="#i-' + n + '"/></svg>'; }
  function uid(p) { return (p || '') + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function loadJSON(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } }
  function arr(x) { return Array.isArray(x) ? x : []; }

  // ---------------- البيانات ----------------
  function normDb(d) {
    d = d && typeof d === 'object' ? d : {};
    return { v: 1, seq: Number(d.seq) || 0, customers: arr(d.customers), jobs: arr(d.jobs).map(normJob) };
  }
  function normJob(j) {
    j.items = arr(j.items); j.materials = arr(j.materials); j.consumables = arr(j.consumables); j.payments = arr(j.payments);
    j.discount = j.discount && typeof j.discount === 'object' ? j.discount : { type: 'amount', value: 0 };
    return j;
  }
  var db = normDb(loadJSON(DB_KEY, null));
  var settings = loadJSON(SET_KEY, {}) || {};
  ['business', 'lastPrice'].forEach(function (k) { if (!settings[k] || typeof settings[k] !== 'object') settings[k] = {}; });
  ['products', 'consNames', 'matNames'].forEach(function (k) { settings[k] = arr(settings[k]); });
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
    { code: 'EGP', country: 'مصر', name: 'جنيه مصري', sym: 'ج.م', dec: 2 },
    { code: 'SAR', country: 'السعودية', name: 'ريال سعودي', sym: 'ر.س', dec: 2 },
    { code: 'AED', country: 'الإمارات', name: 'درهم إماراتي', sym: 'د.إ', dec: 2 },
    { code: 'KWD', country: 'الكويت', name: 'دينار كويتي', sym: 'د.ك', dec: 3 },
    { code: 'QAR', country: 'قطر', name: 'ريال قطري', sym: 'ر.ق', dec: 2 },
    { code: 'BHD', country: 'البحرين', name: 'دينار بحريني', sym: 'د.ب', dec: 3 },
    { code: 'OMR', country: 'عُمان', name: 'ريال عماني', sym: 'ر.ع', dec: 3 },
    { code: 'JOD', country: 'الأردن', name: 'دينار أردني', sym: 'د.أ', dec: 3 },
    { code: 'IQD', country: 'العراق', name: 'دينار عراقي', sym: 'د.ع', dec: 0 },
    { code: 'SYP', country: 'سوريا', name: 'ليرة سورية', sym: 'ل.س', dec: 0 },
    { code: 'LBP', country: 'لبنان', name: 'ليرة لبنانية', sym: 'ل.ل', dec: 0 },
    { code: 'ILS', country: 'فلسطين', name: 'شيكل', sym: '₪', dec: 2 },
    { code: 'YER', country: 'اليمن', name: 'ريال يمني', sym: 'ر.ي', dec: 0 },
    { code: 'LYD', country: 'ليبيا', name: 'دينار ليبي', sym: 'د.ل', dec: 3 },
    { code: 'TND', country: 'تونس', name: 'دينار تونسي', sym: 'د.ت', dec: 3 },
    { code: 'DZD', country: 'الجزائر', name: 'دينار جزائري', sym: 'د.ج', dec: 2 },
    { code: 'MAD', country: 'المغرب', name: 'درهم مغربي', sym: 'د.م', dec: 2 },
    { code: 'SDG', country: 'السودان', name: 'جنيه سوداني', sym: 'ج.س', dec: 2 },
    { code: 'MRU', country: 'موريتانيا', name: 'أوقية', sym: 'أ.م', dec: 2 },
    { code: 'SOS', country: 'الصومال', name: 'شلن صومالي', sym: 'ش.ص', dec: 0 },
    { code: 'DJF', country: 'جيبوتي', name: 'فرنك جيبوتي', sym: 'ف.ج', dec: 0 },
    { code: 'KMF', country: 'جزر القمر', name: 'فرنك قمري', sym: 'ف.ق', dec: 0 },
    { code: 'USD', country: 'دولار أمريكي', name: 'دولار', sym: '$', dec: 2 }
  ];
  function cur() { return CURRENCIES.find(function (c) { return c.code === settings.currency; }) || CURRENCIES[0]; }
  function fmt(n, dec) { var d = dec == null ? cur().dec : dec; var v = Number(n) || 0; return v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: d }); }
  function money(n) { return fmt(n) + ' ' + cur().sym; }
  function fq(n) { return (Number(n) || 0).toLocaleString('en-US', { maximumFractionDigits: 3 }); }

  // ---------------- التاريخ ----------------
  function today() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function fmtDate(s) { return s ? String(s).slice(0, 10).split('-').join('/') : ''; }

  // ---------------- رسائل وتأكيد ----------------
  var toastT;
  function toast(msg) { var t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('show'); }, 2400); }

  // ---------------- زرار الرجوع: طبقات النوافذ ----------------
  var stack = [], afterPop = [];
  function pushLayer(layer) { stack.push(layer); history.pushState({ mw: stack.length }, ''); }
  function topLayer() { return stack[stack.length - 1]; }
  function closeTop(then) {
    if (!stack.length) { if (then) then(); return; }
    if (then) afterPop.push(then);
    history.back();
  }
  window.addEventListener('popstate', function (e) {
    var depth = (e.state && e.state.mw) || 0;
    while (stack.length > depth) stack.pop().hide();
    var cbs = afterPop; afterPop = [];
    cbs.forEach(function (f) { try { f(); } catch (err) { console.error(err); } });
  });

  var dlgResolve = null;
  function confirmDlg(title, msg, yes) {
    return new Promise(function (resolve) {
      $('dlgTitle').textContent = title; $('dlgMsg').textContent = msg || ''; $('dlgYes').textContent = yes || 'أيوه، امسح';
      $('dialog').classList.add('open');
      dlgResolve = resolve;
      pushLayer({ type: 'dialog', hide: function () { $('dialog').classList.remove('open'); if (dlgResolve) { var r = dlgResolve; dlgResolve = null; r(false); } } });
    });
  }
  $('dlgNo').addEventListener('click', function () { closeTop(); });
  $('dlgYes').addEventListener('click', function () { var r = dlgResolve; dlgResolve = null; closeTop(function () { if (r) r(true); }); });

  // ---------------- النافذة المنبثقة (sheet) ----------------
  var sheet = $('sheet'), backdrop = $('backdrop');
  var S = {}; // حالة النافذة المفتوحة
  function openSheet(title, body, state) {
    S = state || {};
    sheet.innerHTML = '<div class="grab"></div><div class="sheet-head"><h3>' + esc(title) + '</h3><button type="button" class="close-x" data-act="closeTop" aria-label="قفل">' + ic('x') + '</button></div>' + body;
    sheet.scrollTop = 0;
    var t = topLayer();
    if (t && t.type === 'sheet') return; // استبدال المحتوى في نفس النافذة
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
    var dark = isDark();
    $('themeBtn').innerHTML = ic(dark ? 'sun' : 'moon');
    $('themeBtn').setAttribute('aria-label', dark ? 'التبديل للوضع الفاتح' : 'التبديل للوضع الليلي');
    Array.prototype.forEach.call(document.querySelectorAll('[data-theme-set]'), function (b) { b.classList.toggle('on', b.dataset.themeSet === m); });
  }
  if (darkQ && darkQ.addEventListener) darkQ.addEventListener('change', applyTheme);
  $('themeBtn').addEventListener('click', function () { settings.theme = isDark() ? 'light' : 'dark'; saveSettings(); applyTheme(); });

  // ---------------- التنقل بين الصفحات ----------------
  var currentView = 'home', pickInvoice = false;
  var jobFilter = { q: '', f: 'all', cust: '', from: '', to: '' };
  function switchView(v) {
    currentView = v;
    ['home', 'jobs', 'customers', 'more'].forEach(function (n) {
      $('view-' + n).classList.toggle('active', n === v);
      $('navBtn-' + n).classList.toggle('active', n === v);
    });
    if (v !== 'jobs') setPick(false);
    renderView();
    window.scrollTo(0, 0);
  }
  function setPick(on) { pickInvoice = on; $('pickBar').classList.toggle('hidden', !on); }
  function renderView() {
    if (currentView === 'home') renderHome();
    else if (currentView === 'jobs') renderJobs();
    else if (currentView === 'customers') renderCustomers();
    else renderMore();
  }
  function refresh() {
    renderView();
    if ($('jobPage').classList.contains('open') && openJobId) renderJob(openJobId);
    if ($('custPage').classList.contains('open') && openCustId) renderCust(openCustId);
  }

  // ---------------- كروت ----------------
  function kindIcon(k) { return { laser: 'laser', hand: 'hand', door: 'door', roof: 'roof', piece: 'chair', lump: 'tractor' }[k] || 'file'; }
  function jobCard(j) {
    var r = C.job(j);
    var kinds = Object.keys(r.byKind).map(function (k) { return '<span class="kind-tag">' + esc(C.KINDS[k].short) + '</span>'; }).join('');
    var status = j.status === 'done' ? '<span class="status-badge done">خلصانة</span>' : '<span class="status-badge active">جارية</span>';
    var amt = r.remaining > 0.005 ? '<small class="due">باقي ' + esc(money(r.remaining)) + '</small>' : (r.total > 0 ? '<small class="ok">خالص</small>' : '<small>—</small>');
    return '<div class="inv-card" data-act="' + (pickInvoice ? 'pickedInvoice' : 'openJob') + '" data-id="' + esc(j.id) + '">'
      + '<div class="inv-avatar">' + esc((custName(j) || '؟').trim().charAt(0)) + '</div>'
      + '<div class="inv-info"><div class="n">' + esc(custName(j)) + status + '</div>'
      + '<div class="m">' + esc([j.title, j.number, fmtDate(j.date), j.items.length + ' بند'].filter(Boolean).join(' · ')) + '</div>'
      + (kinds ? '<div class="job-kinds">' + kinds + '</div>' : '') + '</div>'
      + '<div class="inv-amount">' + esc(money(r.total)) + amt + '</div></div>';
  }
  function custCard(c) {
    var js = jobsOf(c.id), due = 0, tot = 0;
    js.forEach(function (j) { var r = C.job(j); due += r.remaining; tot += r.total; });
    return '<div class="cust-card" data-act="openCust" data-id="' + esc(c.id) + '">'
      + '<div class="inv-avatar">' + esc((c.name || '؟').trim().charAt(0)) + '</div>'
      + '<div class="inv-info"><div class="n">' + esc(c.name) + '</div><div class="m">' + esc([c.phone, js.length + ' حساب'].filter(Boolean).join(' · ')) + '</div></div>'
      + '<div class="cust-amt ' + (due > 0.005 ? 'due' : 'ok') + '">' + esc(money(Math.max(due, 0))) + '<small>' + (due > 0.005 ? 'متبقي' : (tot ? 'خالص' : '—')) + '</small></div></div>';
  }
  function sortedJobs() { return db.jobs.slice().sort(function (a, b) { return String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)); }); }

  // ---------------- الرئيسية ----------------
  function renderHome() {
    var due = 0, active = 0, month = 0, ym = today().slice(0, 7);
    db.jobs.forEach(function (j) {
      var r = C.job(j);
      if (r.remaining > 0) due += r.remaining;
      if (j.status !== 'done') active++;
      if (String(j.date || '').slice(0, 7) === ym) month += r.total;
    });
    $('homeDue').textContent = fmt(due);
    $('homeActive').textContent = active;
    $('homeCust').textContent = db.customers.length;
    $('homeMonth').textContent = fmt(month, 0);
    Array.prototype.forEach.call(document.querySelectorAll('.cur'), function (el) { el.textContent = cur().sym; });
    var rec = sortedJobs().slice(0, 4);
    $('homeRecent').innerHTML = rec.length ? rec.map(jobCard).join('')
      : '<div class="home-empty">لسه مفيش حسابات. ابدأ بـ «حساب جديد» أو اختار نوع الشغل من فوق.</div>';
    var h = new Date().getHours();
    $('greetLine').textContent = (h < 12 ? 'صباح الخير' : 'مساء الخير') + ' — الحدادة';
  }

  // ---------------- الحسابات ----------------
  function matchJob(j) {
    var r = C.job(j);
    if (jobFilter.f === 'active' && j.status === 'done') return false;
    if (jobFilter.f === 'done' && j.status !== 'done') return false;
    if (jobFilter.f === 'due' && !(r.remaining > 0.005)) return false;
    if (jobFilter.cust && j.customerId !== jobFilter.cust) return false;
    if (jobFilter.from && String(j.date || '') < jobFilter.from) return false;
    if (jobFilter.to && String(j.date || '') > jobFilter.to) return false;
    var q = jobFilter.q.trim();
    if (q) {
      var c = getCust(j.customerId) || {};
      var hay = [c.name, c.phone, j.title, j.number, j.notes].concat(j.items.map(function (it) { return [it.desc, it.name, it.title].join(' '); })).join(' ');
      if (hay.indexOf(q) < 0) return false;
    }
    return true;
  }
  function renderJobs() {
    var sel = $('jobCust'), keep = jobFilter.cust;
    sel.innerHTML = '<option value="">كل العملاء</option>' + db.customers.slice().sort(function (a, b) { return a.name.localeCompare(b.name, 'ar'); })
      .map(function (c) { return '<option value="' + esc(c.id) + '">' + esc(c.name) + '</option>'; }).join('');
    sel.value = keep;
    Array.prototype.forEach.call($('jobFilters').children, function (b) { b.classList.toggle('on', b.dataset.f === jobFilter.f); });
    var list = sortedJobs().filter(matchJob);
    var tot = 0, due = 0;
    list.forEach(function (j) { var r = C.job(j); tot += r.total; due += Math.max(r.remaining, 0); });
    $('jobSum').innerHTML = list.length ? '<span><b>' + list.length + '</b> حساب</span>·<span>الإجمالي <b>' + esc(money(tot)) + '</b></span>·<span>المتبقي <b>' + esc(money(due)) + '</b></span>' : '';
    $('jobList').innerHTML = list.length ? list.map(jobCard).join('')
      : (db.jobs.length ? '<div class="home-empty">مفيش حسابات بالفلترة دي</div>' : '<div class="empty"><div class="big">' + ic('file') + '</div><p>لسه مفيش حسابات</p><button type="button" class="btn btn-accent" data-act="newJob">' + ic('plus') + ' حساب جديد</button></div>');
  }
  $('jobSearch').addEventListener('input', function () { jobFilter.q = this.value; renderJobs(); });
  $('jobFilters').addEventListener('click', function (e) { var b = e.target.closest('[data-f]'); if (!b) return; jobFilter.f = b.dataset.f; renderJobs(); });
  $('jobCust').addEventListener('change', function () { jobFilter.cust = this.value; renderJobs(); });
  $('jobFrom').addEventListener('change', function () { jobFilter.from = this.value; renderJobs(); });
  $('jobTo').addEventListener('change', function () { jobFilter.to = this.value; renderJobs(); });

  // ---------------- العملاء ----------------
  function renderCustomers() {
    var q = ($('custSearch').value || '').trim();
    var list = db.customers.filter(function (c) { return !q || (c.name + ' ' + (c.phone || '')).indexOf(q) >= 0; })
      .sort(function (a, b) { return String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)); });
    $('custList').innerHTML = list.length ? list.map(custCard).join('')
      : '<div class="home-empty">' + (db.customers.length ? 'مفيش عميل بالاسم ده' : 'لسه مفيش عملاء — العميل بيتضاف لوحده أول ما تعمله حساب') + '</div>';
  }
  $('custSearch').addEventListener('input', renderCustomers);

  // ---------------- المزيد ----------------
  function renderMore() {
    $('currencySelect').value = cur().code;
    applyTheme();
    Array.prototype.forEach.call(document.querySelectorAll('[data-unit-set]'), function (b) { b.classList.toggle('on', b.dataset.unitSet === (settings.dimUnit || 'm')); });
    $('bizName').value = settings.business.name || ''; $('bizPhone').value = settings.business.phone || '';
    $('bizAddress').value = settings.business.address || ''; $('bizTerms').value = settings.terms || '';
    var labor = 0, costs = 0, total = 0, due = 0;
    db.jobs.forEach(function (j) { var r = C.job(j); labor += r.labor; costs += r.costs; total += r.total; due += Math.max(r.remaining, 0); });
    $('moreStats').innerHTML = row('عدد الحسابات', String(db.jobs.length)) + row('إجمالي المصنعية', money(labor)) + row('إجمالي قيمة الشغل', money(total))
      + row('تكاليف الخامات والتشغيل والهالك', money(costs)) + '<div class="sum-row profit' + (total - costs < 0 ? ' neg' : '') + '"><span>صافي الربح التقديري</span><strong>' + esc(money(total - costs)) + '</strong></div>'
      + row('المتبقي عند العملاء', money(due));
  }
  function row(l, v, cls) { return '<div class="sum-row' + (cls ? ' ' + cls : '') + '"><span>' + esc(l) + '</span><strong>' + esc(v) + '</strong></div>'; }
  $('currencySelect').innerHTML = CURRENCIES.map(function (c) { return '<option value="' + c.code + '">' + esc(c.country) + ' — ' + esc(c.name) + ' (' + esc(c.sym) + ')</option>'; }).join('');
  $('currencySelect').addEventListener('change', function () { settings.currency = this.value; saveSettings(); refresh(); toast('العملة: ' + cur().name); });
  [['bizName', 'name'], ['bizPhone', 'phone'], ['bizAddress', 'address']].forEach(function (p) {
    $(p[0]).addEventListener('input', function () { settings.business[p[1]] = this.value.trim(); saveSettings(); });
  });
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
  function ensureCustomer(name, phone, address) {
    var c = findCustByName(name);
    if (!c) { c = { id: uid('c'), name: String(name).trim(), phone: phone || '', address: address || '', note: '', createdAt: new Date().toISOString() }; db.customers.push(c); }
    else { if (phone && !c.phone) c.phone = phone; if (address && !c.address) c.address = address; }
    c.updatedAt = new Date().toISOString();
    return c;
  }
  function custSuggestHTML() { return '<div id="f_csug"></div>'; }
  function bindCustSuggest() {
    var inp = $('f_cname'); if (!inp) return;
    inp.addEventListener('input', function () {
      var q = inp.value.trim(), box = $('f_csug');
      S.custId = (findCustByName(q) || {}).id || null;
      var list = q ? db.customers.filter(function (c) { return c.name.indexOf(q) >= 0 && c.name !== q; }).slice(0, 5) : [];
      box.innerHTML = list.length ? '<div class="suggest">' + list.map(function (c) {
        return '<button type="button" data-act="pickCust" data-id="' + esc(c.id) + '"><span class="s-av">' + esc(c.name.charAt(0)) + '</span><span>' + esc(c.name) + '<small>' + esc(c.phone || '') + '</small></span></button>';
      }).join('') + '</div>' : '';
      renderTargetJobs();
    });
  }
  // لو العميل موجود وعنده حسابات جارية: تختار تضيف عليها أو حساب جديد
  function renderTargetJobs() {
    var box = $('f_target'); if (!box) return;
    var c = S.custId ? getCust(S.custId) : null;
    var act = c ? jobsOf(c.id).filter(function (j) { return j.status !== 'done'; }) : [];
    if (!act.length) { S.targetJob = null; box.innerHTML = ''; return; }
    if (S.targetJob && !act.some(function (j) { return j.id === S.targetJob; })) S.targetJob = null;
    box.innerHTML = '<label class="mini-lbl" style="margin-top:8px">ضيف البند على</label><div class="chips">'
      + '<button type="button" class="chip' + (!S.targetJob ? ' on' : '') + '" data-act="target" data-id="">حساب جديد</button>'
      + act.map(function (j) { return '<button type="button" class="chip' + (S.targetJob === j.id ? ' on' : '') + '" data-act="target" data-id="' + esc(j.id) + '">' + esc((j.title || 'حساب') + ' ' + j.number) + '</button>'; }).join('') + '</div>';
  }

  function openCustomerSheet(id) {
    var c = id ? getCust(id) : {};
    openSheet(id ? 'تعديل بيانات العميل' : 'عميل جديد',
      '<div class="field"><label for="f_cn">اسم العميل</label><input type="text" id="f_cn" value="' + esc(c.name || '') + '" autocomplete="off"></div>'
      + '<div class="row-2"><div class="field"><label for="f_cp">التليفون</label><input type="text" id="f_cp" inputmode="tel" dir="ltr" value="' + esc(c.phone || '') + '"></div>'
      + '<div class="field"><label for="f_ca">العنوان</label><input type="text" id="f_ca" value="' + esc(c.address || '') + '"></div></div>'
      + '<div class="field"><label for="f_cnote">ملحوظة</label><input type="text" id="f_cnote" value="' + esc(c.note || '') + '"></div>'
      + '<button type="button" class="btn btn-primary" data-act="saveCustomer">' + ic('check') + ' حفظ</button>',
      { custEdit: id || null });
  }
  function saveCustomer() {
    var name = $('f_cn').value.trim();
    if (!name) { toast('اكتب اسم العميل'); $('f_cn').focus(); return; }
    var other = findCustByName(name);
    if (other && other.id !== S.custEdit) { toast('فيه عميل بنفس الاسم'); return; }
    var c = S.custEdit ? getCust(S.custEdit) : null;
    if (!c) { c = { id: uid('c'), createdAt: new Date().toISOString() }; db.customers.push(c); }
    c.name = name; c.phone = $('f_cp').value.trim(); c.address = $('f_ca').value.trim(); c.note = $('f_cnote').value.trim();
    c.updatedAt = new Date().toISOString();
    saveDb();
    var isNew = !S.custEdit;
    closeTop(function () { refresh(); toast('اتحفظ'); if (isNew) openCust(c.id); });
  }

  // ---------------- حساب جديد ----------------
  function newJobRecord(cust, title, date) {
    db.seq = (Number(db.seq) || 0) + 1;
    var now = new Date().toISOString();
    var j = normJob({ id: uid('j'), number: 'MTL-' + pad(db.seq), customerId: cust.id, title: title || '', date: date || today(), status: 'active', notes: '', billConsumables: false, createdAt: now, updatedAt: now });
    db.jobs.push(j);
    return j;
  }
  function openNewJobSheet(cid) {
    var c = cid ? getCust(cid) : null;
    openSheet('حساب جديد',
      '<div class="field"><label for="f_cname">اسم العميل</label><input type="text" id="f_cname" autocomplete="off" value="' + esc(c ? c.name : '') + '" placeholder="اكتب الاسم أو اختار عميل موجود">' + custSuggestHTML() + '</div>'
      + '<div class="row-2"><div class="field"><label for="f_cphone">التليفون (اختياري)</label><input type="text" id="f_cphone" inputmode="tel" dir="ltr" value="' + esc(c ? c.phone || '' : '') + '"></div>'
      + '<div class="field"><label for="f_date">التاريخ</label><input type="date" id="f_date" value="' + today() + '"></div></div>'
      + '<div class="field"><label for="f_jtitle">اسم الشغلانة أو المشروع (اختياري)</label><input type="text" id="f_jtitle" placeholder="مثلاً: بوابة الفيلا + أبواب المخزن"></div>'
      + '<button type="button" class="btn btn-accent" data-act="createJob">' + ic('check') + ' ابدأ الحساب</button>',
      { custId: c ? c.id : null });
    bindCustSuggest();
  }
  function createJob() {
    var name = $('f_cname').value.trim();
    if (!name) { toast('اكتب اسم العميل'); $('f_cname').focus(); return; }
    var c = ensureCustomer(name, $('f_cphone').value.trim());
    var j = newJobRecord(c, $('f_jtitle').value.trim(), $('f_date').value || today());
    saveDb();
    closeTop(function () { refresh(); openJob(j.id); openKindSheet(j.id); });
  }

  // ---------------- اختيار نوع الشغل ----------------
  function kindGridHTML(act) {
    return '<div class="kind-grid">' + C.KIND_ORDER.map(function (k) {
      var K = C.KINDS[k], basis = { area: 'بالمتر المربع', weight: 'بالكيلو', piece: 'بالقطعة', lump: 'مبلغ إجمالي' }[K.basis];
      return '<button type="button" class="kind-opt" data-act="' + act + '" data-kind="' + k + '"><span class="k-ic">' + ic(kindIcon(k)) + '</span><span><b>' + esc(K.label) + '</b><small>' + basis + '</small></span></button>';
    }).join('') + '</div>';
  }
  function openKindSheet(jobId) { openSheet('إضافة بند — اختار نوع الشغل', kindGridHTML('chooseKind'), { jobId: jobId }); }

  // ---------------- البند: النموذج حسب نوع الشغل ----------------
  var PRODUCT_PRESETS = ['كرسي حديد', 'ترابيزة حديد', 'قاعدة جهاز', 'حامل', 'رف حديد', 'وحدة حديد', 'سرير حديد', 'شباك حماية'];
  var DESC_LABEL = { laser: 'وصف البوابة / التصميم', hand: 'وصف البوابة / التصميم', door: 'وصف الباب', roof: 'وصف المساحة (مثلاً: سقف الجراج)' };
  function numInput(id, label, value, unit) {
    return '<div class="field"><label for="' + id + '">' + esc(label) + (unit ? ' <span class="u-lbl" data-u="' + id + '">(' + esc(unit) + ')</span>' : '') + '</label>'
      + '<input type="text" inputmode="decimal" id="' + id + '" value="' + esc(value == null ? '' : value) + '" autocomplete="off" dir="ltr" placeholder="0"></div>';
  }
  function v0(x) { return x == null || x === '' ? '' : x; }
  function stepper(id, label, val) {
    return '<div class="field"><label for="' + id + '">' + esc(label) + '</label><div class="stepper"><button type="button" data-act="step" data-t="' + id + '" data-d="-1" aria-label="أقل">−</button>'
      + '<input type="text" inputmode="decimal" id="' + id + '" value="' + esc(v0(val)) + '" dir="ltr"><button type="button" data-act="step" data-t="' + id + '" data-d="1" aria-label="أكتر">+</button></div></div>';
  }
  function priceHint(kind) {
    var lp = settings.lastPrice[kind];
    return lp ? '<div class="price-hint"><button type="button" class="chip" data-act="usePrice" data-v="' + esc(lp) + '">آخر سعر كتبته: ' + esc(fmt(lp)) + '</button></div>' : '';
  }

  function openItemSheet(opts) {
    var job = opts.jobId ? getJob(opts.jobId) : null;
    var it = job && opts.itemId ? job.items.find(function (x) { return x.id === opts.itemId; }) : null;
    var kind = it ? it.kind : opts.kind;
    var K = C.KINDS[kind];
    var d = it || { kind: kind, count: 1, dimUnit: settings.dimUnit || 'm', tasks: [{ desc: '', amount: '' }], date: today() };
    var body = '';
    if (!job) {
      body += '<div class="cust-pick"><div class="field" style="margin-bottom:8px"><label for="f_cname">اسم العميل</label><input type="text" id="f_cname" autocomplete="off" placeholder="اكتب الاسم أو اختار عميل موجود">' + custSuggestHTML() + '</div>'
        + '<div class="field" style="margin-bottom:0"><label for="f_jtitle">اسم الشغلانة أو المشروع (اختياري)</label><input type="text" id="f_jtitle"></div><div id="f_target"></div></div>';
    }
    if (K.basis === 'area') {
      body += '<div class="field"><label for="f_desc">' + esc(DESC_LABEL[kind]) + '</label><input type="text" id="f_desc" value="' + esc(d.desc || '') + '"></div>'
        + '<div class="field"><label>وحدة المقاسات</label><div class="segmented seg-sm" id="f_unit"><button type="button" data-act="dimUnit" data-u="m">متر</button><button type="button" data-act="dimUnit" data-u="cm">سنتيمتر</button></div></div>'
        + '<div class="row-2">' + numInput('f_h', K.hLabel, v0(d.h), d.dimUnit === 'cm' ? 'سم' : 'م') + numInput('f_w', K.wLabel, v0(d.w), d.dimUnit === 'cm' ? 'سم' : 'م') + '</div>'
        + '<div class="row-2">' + stepper('f_count', K.countLabel, v0(d.count)) + numInput('f_price', K.priceLabel, v0(d.price), cur().sym + ' / م²') + '</div>';
    } else if (K.basis === 'weight') {
      body += '<div class="field"><label for="f_desc">' + esc(DESC_LABEL[kind]) + '</label><input type="text" id="f_desc" value="' + esc(d.desc || '') + '"></div>'
        + '<div class="row-2">' + numInput('f_weight', 'وزن البوابة الفعلي', v0(d.weight), 'كجم') + stepper('f_count', K.countLabel, v0(d.count)) + '</div>'
        + numInput('f_price', K.priceLabel, v0(d.price), cur().sym + ' / كجم');
    } else if (K.basis === 'piece') {
      var prods = settings.products.concat(PRODUCT_PRESETS.filter(function (p) { return settings.products.indexOf(p) < 0; })).slice(0, 14);
      body += '<div class="field"><label for="f_name">اسم المنتج</label><input type="text" id="f_name" value="' + esc(d.name || '') + '" placeholder="اكتب أي منتج — كرسي، ترابيزة، حامل…">'
        + '<div class="unit-chips">' + prods.map(function (p) { return '<button type="button" class="chip" data-act="setName" data-v="' + esc(p) + '">' + esc(p) + '</button>'; }).join('') + '</div></div>'
        + '<div class="field"><label for="f_specs">المقاسات أو المواصفات (اختياري)</label><input type="text" id="f_specs" value="' + esc(d.specs || '') + '" placeholder="مثلاً: 45×45 سم، مواسير 2.5 سم"></div>'
        + '<div class="row-2">' + stepper('f_count', K.countLabel, v0(d.count)) + numInput('f_price', K.priceLabel, v0(d.price), cur().sym + ' / قطعة') + '</div>';
    } else {
      var tasks = d.tasks && d.tasks.length ? d.tasks : [{ desc: '', amount: '' }];
      body += '<div class="field"><label for="f_title2">اسم المشروع أو المعدة</label><input type="text" id="f_title2" value="' + esc(d.title || '') + '" placeholder="مثلاً: مقطورة جرار — محراث"></div>'
        + '<div class="field"><label for="f_desc">وصف الشغل بالتفصيل</label><textarea id="f_desc" placeholder="إيه اللي هيتعمل بالظبط">' + esc(d.desc || '') + '</textarea></div>'
        + '<div class="field"><label>المهام وقيمة كل مهمة (' + esc(cur().sym) + ')</label><div id="f_tasks">' + tasks.map(taskRow).join('') + '</div>'
        + '<button type="button" class="btn btn-ghost btn-sm" data-act="addTask">' + ic('plus') + ' مهمة كمان</button><p class="hint">لو الشغل كله بمبلغ واحد اكتبه في مهمة واحدة.</p></div>'
        + '<div class="field"><label for="f_date">تاريخ التنفيذ</label><input type="date" id="f_date" value="' + esc(d.date || '') + '"></div>';
    }
    if (K.basis !== 'lump') body += priceHint(kind);
    body += '<div class="field"><label for="f_notes">ملاحظات (اختياري)</label><input type="text" id="f_notes" value="' + esc(d.notes || '') + '"></div>'
      + '<div class="calc-break" id="f_break"></div>'
      + '<div class="live-total"><span>إجمالي مصنعية البند</span><strong id="f_total">0</strong></div>'
      + '<button type="button" class="btn btn-accent" data-act="saveItem">' + ic('check') + (it ? ' حفظ التعديل' : ' إضافة البند') + '</button>'
      + (it ? '<div class="btn-row" style="margin-top:10px"><button type="button" class="btn btn-ghost" data-act="dupItem">' + ic('copy') + ' تكرار البند</button><button type="button" class="btn btn-danger" data-act="delItem">' + ic('trash') + ' حذف</button></div>' : '');
    openSheet((it ? 'تعديل: ' : '') + K.label, body, { form: 'item', kind: kind, jobId: job ? job.id : null, itemId: it ? it.id : null, dimUnit: d.dimUnit || settings.dimUnit || 'm', custId: null, targetJob: null });
    if (!job) bindCustSuggest();
    syncUnitSeg();
    updateItemLive();
  }
  function taskRow(t) {
    return '<div class="task-row"><input type="text" class="t-desc" value="' + esc(t.desc || '') + '" placeholder="المهمة">'
      + '<input type="text" inputmode="decimal" class="t-amt" value="' + esc(v0(t.amount)) + '" placeholder="المبلغ" dir="ltr">'
      + '<button type="button" class="btn btn-danger btn-icon" data-act="delTask" aria-label="حذف المهمة">' + ic('x') + '</button></div>';
  }
  function syncUnitSeg() {
    var seg = $('f_unit'); if (!seg) return;
    Array.prototype.forEach.call(seg.children, function (b) { b.classList.toggle('on', b.dataset.u === S.dimUnit); });
    Array.prototype.forEach.call(sheet.querySelectorAll('.u-lbl[data-u="f_h"], .u-lbl[data-u="f_w"]'), function (l) { l.textContent = '(' + (S.dimUnit === 'cm' ? 'سم' : 'م') + ')'; });
  }
  function val(id) { var el = $(id); return el ? el.value : ''; }
  function readItemForm() {
    var k = S.kind, K = C.KINDS[k];
    var it = { kind: k, notes: val('f_notes').trim() };
    var cnt = val('f_count');
    if (K.basis === 'area') { it.desc = val('f_desc').trim(); it.dimUnit = S.dimUnit; it.h = C.num(val('f_h')); it.w = C.num(val('f_w')); it.count = String(cnt).trim() === '' ? 1 : C.num(cnt); it.price = C.num(val('f_price')); }
    else if (K.basis === 'weight') { it.desc = val('f_desc').trim(); it.weight = C.num(val('f_weight')); it.count = String(cnt).trim() === '' ? 1 : C.num(cnt); it.price = C.num(val('f_price')); }
    else if (K.basis === 'piece') { it.name = val('f_name').trim(); it.specs = val('f_specs').trim(); it.count = String(cnt).trim() === '' ? 1 : C.num(cnt); it.price = C.num(val('f_price')); }
    else {
      it.title = val('f_title2').trim(); it.desc = val('f_desc').trim(); it.date = val('f_date');
      it.tasks = Array.prototype.map.call(sheet.querySelectorAll('#f_tasks .task-row'), function (r) { return { desc: r.querySelector('.t-desc').value.trim(), amount: C.num(r.querySelector('.t-amt').value) }; })
        .filter(function (t) { return t.desc || t.amount; });
    }
    return it;
  }
  function breakText(it, r) {
    var K = C.KINDS[it.kind], u = it.dimUnit === 'cm' ? 'سم' : 'م';
    if (K.basis === 'area') return 'المساحة = <b>' + fq(it.h) + ' × ' + fq(it.w) + ' ' + u + '</b> = <b>' + fq(r.areaEach) + ' م²</b>'
      + (r.count !== 1 ? ' × ' + fq(r.count) + ' = <b>' + fq(r.area) + ' م²</b>' : '') + '<br>المصنعية = ' + fq(r.area) + ' م² × ' + esc(fmt(r.price)) + ' = <b>' + esc(money(r.total)) + '</b>';
    if (K.basis === 'weight') return 'إجمالي الوزن = <b>' + fq(r.weightEach) + ' كجم</b>' + (r.count !== 1 ? ' × ' + fq(r.count) + ' = <b>' + fq(r.weight) + ' كجم</b>' : '')
      + '<br>المصنعية = ' + fq(r.weight) + ' كجم × ' + esc(fmt(r.price)) + ' = <b>' + esc(money(r.total)) + '</b>';
    if (K.basis === 'piece') return 'المصنعية = ' + fq(r.count) + ' قطعة × ' + esc(fmt(r.price)) + ' = <b>' + esc(money(r.total)) + '</b>';
    return 'مجموع <b>' + r.tasks.length + '</b> مهمة = <b>' + esc(money(r.total)) + '</b>';
  }
  function updateItemLive() {
    if (S.form !== 'item') return;
    var it = readItemForm(), r = C.item(it);
    $('f_total').textContent = money(r.total);
    $('f_break').innerHTML = breakText(it, r);
  }
  function itemValid(it) {
    var K = C.KINDS[it.kind];
    if (K.basis === 'area' && !(it.h > 0 && it.w > 0)) return 'اكتب ' + K.hLabel + ' و' + K.wLabel;
    if (K.basis === 'weight' && !(it.weight > 0)) return 'اكتب وزن البوابة';
    if (K.basis === 'piece' && !it.name) return 'اكتب اسم المنتج';
    if (K.basis === 'lump' && !it.tasks.length) return 'اكتب مهمة واحدة على الأقل وقيمتها';
    if (K.basis !== 'lump' && !(it.count > 0)) return 'العدد لازم يكون أكبر من صفر';
    return '';
  }
  function saveItem() {
    var it = readItemForm(), err = itemValid(it);
    if (err) { toast(err); return; }
    var job = S.jobId ? getJob(S.jobId) : null, fromHome = !job;
    if (!job) {
      var name = val('f_cname').trim();
      if (!name) { toast('اكتب اسم العميل'); $('f_cname').focus(); return; }
      var c = ensureCustomer(name);
      job = S.targetJob ? getJob(S.targetJob) : null;
      if (!job) job = newJobRecord(c, val('f_jtitle').trim() || C.KINDS[it.kind].short, today());
    }
    if (S.itemId) {
      var i = job.items.findIndex(function (x) { return x.id === S.itemId; });
      it.id = S.itemId; if (i >= 0) job.items[i] = it; else job.items.push(it);
    } else { it.id = uid('i'); job.items.push(it); }
    if (it.price > 0) settings.lastPrice[it.kind] = it.price;
    if (it.kind === 'piece' && it.name) settings.products = [it.name].concat(settings.products.filter(function (p) { return p !== it.name; })).slice(0, 12);
    if (it.dimUnit) settings.dimUnit = it.dimUnit;
    touch(job); saveDb(); saveSettings();
    var jid = job.id, wasEdit = !!S.itemId;
    closeTop(function () { refresh(); toast(wasEdit ? 'اتعدل البند' : 'اتضاف البند'); if (fromHome) openJob(jid); });
  }
  sheet.addEventListener('input', function (e) {
    if (S.form === 'item') updateItemLive();
    else if (S.form === 'cons' || S.form === 'mat') updateSimpleLive();
    else if (S.form === 'disc') updateDiscLive();
  });

  // ---------------- الخامات وتكاليف التشغيل والهالك ----------------
  var CONS_PRESETS = [['سلك لحام', 'كيلو'], ['أقطاب لحام', 'عبوة'], ['أقراص قطع', 'قطعة'], ['أقراص جلخ', 'قطعة'], ['أقراص صنفرة', 'قطعة'], ['بنط تخريم', 'قطعة'],
    ['غاز', 'أنبوبة'], ['استهلاك معدات اللحام', 'ساعة'], ['هالك حديد', 'كيلو'], ['هالك صاج', 'كيلو'], ['مستهلكات أخرى', 'قطعة']];
  var MAT_PRESETS = [['حديد مربع', 'عود'], ['حديد مبسط', 'عود'], ['زوايا', 'عود'], ['مواسير', 'عود'], ['ألواح صاج', 'لوح'], ['صاج مموج', 'لوح'], ['شبك', 'متر'], ['مفصلات', 'قطعة'], ['كوالين', 'قطعة'], ['سلاقون / بوية', 'عبوة']];
  var UNITS = ['قطعة', 'كيلو', 'متر', 'عبوة'];
  function openSimpleSheet(kind, jobId, rowId) {
    var job = getJob(jobId); if (!job) return;
    var isCons = kind === 'cons';
    var list = isCons ? job.consumables : job.materials;
    var x = rowId ? list.find(function (r) { return r.id === rowId; }) : null;
    var d = x || { unit: '', billed: true };
    var custom = arr(isCons ? settings.consNames : settings.matNames);
    var presets = (isCons ? CONS_PRESETS : MAT_PRESETS);
    var chips = custom.map(function (n) { return [n, '']; }).concat(presets.filter(function (p) { return custom.indexOf(p[0]) < 0; }));
    var units = UNITS.slice(); if (d.unit && units.indexOf(d.unit) < 0) units.push(d.unit);
    var body = '<div class="field"><label for="f_sname">' + (isCons ? 'اسم المستهلك' : 'اسم الخامة') + '</label><input type="text" id="f_sname" value="' + esc(d.name || '') + '" autocomplete="off">'
      + '<div class="unit-chips">' + chips.map(function (p) { return '<button type="button" class="chip" data-act="setSName" data-v="' + esc(p[0]) + '" data-u="' + esc(p[1]) + '">' + esc(p[0]) + '</button>'; }).join('') + '</div></div>'
      + '<div class="row-2">' + numInput('f_sqty', isCons ? 'الكمية المستخدمة' : 'الكمية', v0(d.qty)) + '<div class="field"><label for="f_sunit">وحدة القياس</label><input type="text" id="f_sunit" value="' + esc(d.unit || '') + '" placeholder="قطعة / كيلو / متر…"></div></div>'
      + '<div class="unit-chips" style="margin:-4px 0 12px">' + units.map(function (u) { return '<button type="button" class="chip" data-act="setSUnit" data-v="' + esc(u) + '">' + esc(u) + '</button>'; }).join('') + '</div>'
      + numInput('f_sprice', 'سعر الوحدة' + (isCons ? ' (اختياري)' : ''), v0(d.price), cur().sym)
      + (isCons ? '<p class="hint" style="margin:-6px 0 12px">من غير سعر: بيتسجل الاستهلاك بس من غير ما يدخل في التكلفة.</p>'
        : '<label class="bill-toggle"><span>على حساب العميل (بتدخل في الفاتورة)</span><input type="checkbox" id="f_sbilled"' + (d.billed !== false ? ' checked' : '') + '></label><p class="hint" style="margin-bottom:12px">لو اشتريتها على حسابك ومش هتحاسب العميل عليها، اقفل الاختيار ده: هتتحسب تكلفة عليك بس.</p>')
      + '<div class="field"><label for="f_snote">ملاحظات (اختياري)</label><input type="text" id="f_snote" value="' + esc(d.note || '') + '"></div>'
      + '<div class="live-total"><span>' + (isCons ? 'إجمالي تكلفة المستهلك' : 'إجمالي الخامة') + '</span><strong id="f_stotal">0</strong></div>'
      + '<button type="button" class="btn btn-accent" data-act="saveSimple">' + ic('check') + (x ? ' حفظ التعديل' : ' إضافة') + '</button>'
      + (x ? '<button type="button" class="btn btn-danger" data-act="delSimple" style="margin-top:10px">' + ic('trash') + ' حذف</button>' : '');
    openSheet((x ? 'تعديل: ' : '') + (isCons ? 'تكاليف التشغيل والهالك' : 'خامة'), body, { form: kind, jobId: jobId, rowId: rowId || null });
    updateSimpleLive();
  }
  function updateSimpleLive() {
    var t = $('f_stotal'); if (!t) return;
    var q = C.num(val('f_sqty')), p = C.num(val('f_sprice'));
    t.textContent = p > 0 ? money(C.money(q * p)) : (S.form === 'cons' ? 'من غير سعر' : money(0));
  }
  function saveSimple() {
    var job = getJob(S.jobId); if (!job) return;
    var isCons = S.form === 'cons';
    var name = val('f_sname').trim();
    if (!name) { toast(isCons ? 'اكتب اسم المستهلك' : 'اكتب اسم الخامة'); return; }
    var qty = C.num(val('f_sqty'));
    if (!(qty > 0)) { toast('اكتب الكمية'); return; }
    var x = { id: S.rowId || uid(isCons ? 'k' : 'm'), name: name, qty: qty, unit: val('f_sunit').trim(), price: C.num(val('f_sprice')), note: val('f_snote').trim() };
    if (!isCons) x.billed = !!($('f_sbilled') && $('f_sbilled').checked);
    var list = isCons ? job.consumables : job.materials;
    var i = list.findIndex(function (r) { return r.id === x.id; });
    if (i >= 0) list[i] = x; else list.push(x);
    var presetNames = (isCons ? CONS_PRESETS : MAT_PRESETS).map(function (p) { return p[0]; });
    if (presetNames.indexOf(name) < 0) {
      var key = isCons ? 'consNames' : 'matNames';
      settings[key] = [name].concat(settings[key].filter(function (n) { return n !== name; })).slice(0, 10);
      saveSettings();
    }
    touch(job); saveDb();
    closeTop(function () { refresh(); toast('اتسجل'); });
  }

  // ---------------- الدفعات والخصم ----------------
  function openPaySheet(jobId, payId) {
    var job = getJob(jobId); if (!job) return;
    var r = C.job(job);
    var p = payId ? job.payments.find(function (x) { return x.id === payId; }) : null;
    var rem = p ? r.remaining + C.num(p.amount) : r.remaining;
    openSheet(p ? 'تعديل دفعة' : 'تسجيل دفعة من ' + custName(job),
      numInput('f_pamt', 'المبلغ', v0(p && p.amount), cur().sym)
      + (rem > 0.005 ? '<div class="price-hint" style="margin:-6px 0 12px"><button type="button" class="chip" data-act="payAll" data-v="' + esc(C.money(rem)) + '">الباقي كله: ' + esc(money(rem)) + '</button></div>' : '')
      + '<div class="row-2"><div class="field"><label for="f_pdate">التاريخ</label><input type="date" id="f_pdate" value="' + esc(p ? p.date : today()) + '"></div>'
      + '<div class="field"><label for="f_pnote">ملحوظة</label><input type="text" id="f_pnote" value="' + esc(p ? p.note || '' : '') + '" placeholder="عربون، دفعة…"></div></div>'
      + '<button type="button" class="btn btn-accent" data-act="savePay">' + ic('check') + ' حفظ الدفعة</button>'
      + (p ? '<button type="button" class="btn btn-danger" data-act="delPay" style="margin-top:10px">' + ic('trash') + ' حذف الدفعة</button>' : ''),
      { form: 'pay', jobId: jobId, payId: payId || null });
  }
  function savePay() {
    var job = getJob(S.jobId); if (!job) return;
    var amt = C.num(val('f_pamt'));
    if (!(amt > 0)) { toast('اكتب المبلغ'); return; }
    var p = { id: S.payId || uid('p'), amount: amt, date: val('f_pdate') || today(), note: val('f_pnote').trim() };
    var i = job.payments.findIndex(function (x) { return x.id === p.id; });
    if (i >= 0) job.payments[i] = p; else job.payments.push(p);
    touch(job); saveDb();
    closeTop(function () { refresh(); toast('اتسجلت الدفعة'); });
  }
  function openDiscSheet(jobId) {
    var job = getJob(jobId); if (!job) return;
    var d = job.discount || { type: 'amount', value: 0 };
    openSheet('خصم على الحساب',
      '<div class="segmented" id="f_dtype"><button type="button" data-act="discType" data-v="amount">مبلغ</button><button type="button" data-act="discType" data-v="percent">نسبة %</button></div>'
      + numInput('f_dval', 'قيمة الخصم', v0(d.value || ''), '')
      + '<div class="live-total"><span id="f_dlbl">الإجمالي بعد الخصم</span><strong id="f_dtotal">0</strong></div>'
      + '<button type="button" class="btn btn-accent" data-act="saveDisc">' + ic('check') + ' حفظ</button>'
      + (C.num(d.value) ? '<button type="button" class="btn btn-ghost" data-act="clearDisc" style="margin-top:10px">من غير خصم</button>' : ''),
      { form: 'disc', jobId: jobId, dtype: d.type === 'percent' ? 'percent' : 'amount' });
    updateDiscLive();
  }
  function updateDiscLive() {
    var job = getJob(S.jobId); if (!job) return;
    Array.prototype.forEach.call($('f_dtype').children, function (b) { b.classList.toggle('on', b.dataset.v === S.dtype); });
    var tmp = Object.assign({}, job, { discount: { type: S.dtype, value: C.num(val('f_dval')) } });
    var r = C.job(tmp);
    $('f_dtotal').textContent = money(r.total);
    $('f_dlbl').textContent = 'الخصم ' + money(r.discount) + ' — الإجمالي بعده';
  }

  // ---------------- صفحة الحساب ----------------
  var openJobId = null, openCustId = null;
  function openJob(id) {
    if (!getJob(id)) return;
    openJobId = id;
    renderJob(id);
    var el = $('jobPage');
    el.classList.add('open'); el.scrollTop = 0;
    pushLayer({ type: 'page', hide: function () { el.classList.remove('open'); openJobId = null; } });
  }
  function itemTitle(it) {
    var K = C.KINDS[it.kind] || C.KINDS.piece;
    if (it.kind === 'piece') return it.name || K.short;
    if (it.kind === 'lump') return it.title || K.label;
    return it.desc ? K.short + ' — ' + it.desc : K.label;
  }
  function itemMeta(it, r) {
    var u = it.dimUnit === 'cm' ? 'سم' : 'م';
    if (C.KINDS[it.kind].basis === 'area') return fq(it.h) + ' × ' + fq(it.w) + ' ' + u + (r.count !== 1 ? ' × ' + fq(r.count) : '') + ' = ' + fq(r.area) + ' م² · ' + fmt(r.price) + ' ' + cur().sym + '/م²';
    if (it.kind === 'hand') return fq(r.weightEach) + ' كجم' + (r.count !== 1 ? ' × ' + fq(r.count) + ' = ' + fq(r.weight) + ' كجم' : '') + ' · ' + fmt(r.price) + ' ' + cur().sym + '/كجم';
    if (it.kind === 'piece') return fq(r.count) + ' قطعة × ' + fmt(r.price) + (it.specs ? ' · ' + it.specs : '');
    return r.tasks.length + ' مهمة · مقطوعية' + (it.date ? ' · ' + fmtDate(it.date) : '');
  }
  function renderJob(id) {
    var j = getJob(id); if (!j) return;
    var c = getCust(j.customerId) || {};
    var r = C.job(j);
    var items = j.items.map(function (it, i) {
      var x = r.items[i];
      return '<div class="item-card" data-act="editItem" data-id="' + esc(it.id) + '"><span class="room-num">' + (i + 1) + '</span>'
        + '<div class="i-info"><div class="i-name">' + esc(itemTitle(it)) + '</div><div class="i-meta">' + esc(itemMeta(it, x)) + '</div>' + (it.notes ? '<div class="i-meta">' + esc(it.notes) + '</div>' : '') + '</div>'
        + '<div class="i-amt">' + esc(money(x.total)) + '<small>' + esc(C.KINDS[it.kind].short) + '</small></div></div>';
    }).join('');
    var mats = j.materials.map(function (m, i) {
      var x = r.materials[i];
      return '<div class="mat-row" data-act="editMat" data-id="' + esc(m.id) + '"><div class="m-info"><div class="m-name">' + esc(m.name) + (m.billed === false ? ' <span class="src-badge">على حسابي</span>' : ' <span class="src-badge">على العميل</span>') + '</div>'
        + '<div class="m-meta">' + esc(fq(m.qty) + ' ' + (m.unit || '') + (x.price ? ' × ' + fmt(x.price) : '') + (m.note ? ' · ' + m.note : '')) + '</div></div><span class="m-qty">' + esc(money(x.total)) + '</span></div>';
    }).join('');
    var cons = j.consumables.map(function (k, i) {
      var x = r.consumables[i];
      return '<div class="mat-row" data-act="editCons" data-id="' + esc(k.id) + '"><div class="m-info"><div class="m-name">' + esc(k.name) + '</div>'
        + '<div class="m-meta">' + esc(fq(k.qty) + ' ' + (k.unit || '') + (x.priced ? ' × ' + fmt(x.price) : ' · من غير سعر') + (k.note ? ' · ' + k.note : '')) + '</div></div><span class="m-qty">' + (x.priced ? esc(money(x.total)) : '—') + '</span></div>';
    }).join('');
    var pays = j.payments.slice().sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); }).map(function (p) {
      return '<div class="entry pay-row" data-act="editPay" data-id="' + esc(p.id) + '"><span class="e-ic">' + ic('cash') + '</span><div class="e-info"><div class="e-title">' + esc(p.note || 'دفعة') + '</div><div class="e-meta">' + esc(fmtDate(p.date)) + '</div></div><span class="e-amt">' + esc(money(p.amount)) + '</span></div>';
    }).join('');
    var disc = C.num(j.discount && j.discount.value) ? (j.discount.type === 'percent' ? ' (' + fq(j.discount.value) + '%)' : '') : '';
    var html = '<div class="pg-head"><button type="button" class="icon-btn" data-act="closeTop" aria-label="رجوع">' + ic('back') + '</button>'
      + '<div class="titles"><h2>' + esc(c.name || 'عميل') + '</h2><div class="sub">' + esc([j.title, j.number, fmtDate(j.date)].filter(Boolean).join(' · ')) + '</div></div>'
      + '<button type="button" class="icon-btn" data-act="jobMenu" aria-label="خيارات الحساب">' + ic('more') + '</button></div>'
      + '<div class="container">'
      + '<section class="home-sum"><div class="hs-label">إجمالي الحساب</div><div class="hs-value">' + esc(fmt(r.total)) + ' <small>' + esc(cur().sym) + '</small></div>'
      + '<div class="hs-stats"><button type="button" data-act="addPay"><span>المدفوع</span><strong>' + esc(fmt(r.paid)) + '</strong></button>'
      + '<button type="button" data-act="addPay"><span>المتبقي</span><strong>' + esc(fmt(r.remaining)) + '</strong></button>'
      + '<button type="button" class="mat" data-act="scrollProfit"><span>صافي الربح التقديري</span><strong>' + esc(fmt(r.profit)) + '</strong></button></div></section>'
      + '<div class="status-row" style="margin:-4px 2px 12px"><button type="button" class="chip' + (j.status !== 'done' ? ' on' : '') + '" data-act="setStatus" data-v="active">جارية</button>'
      + '<button type="button" class="chip' + (j.status === 'done' ? ' on' : '') + '" data-act="setStatus" data-v="done">خلصانة</button></div>'
      // البنود
      + '<div class="card"><div class="card-title"><span class="t-ic orange">' + ic('flame') + '</span><h2>بنود الشغل</h2>' + (j.items.length ? '<span class="tag">' + j.items.length + ' بند</span>' : '') + '</div>'
      + (items || '<p class="card-empty">اختار نوع الشغل وضيف أول بند:</p>' + kindGridHTML('chooseKindJob'))
      + (items ? '<button type="button" class="btn btn-soft" data-act="addItem">' + ic('plus') + ' إضافة بند</button>' : '')
      + (items ? '<div class="sum-total"><span>إجمالي المصنعية</span><strong>' + esc(money(r.labor)) + '</strong></div>' : '') + '</div>'
      // الخامات
      + '<div class="card"><div class="card-title"><span class="t-ic">' + ic('box') + '</span><h2>الخامات</h2><button type="button" class="btn btn-soft btn-sm" data-act="addMat">' + ic('plus') + ' خامة</button></div>'
      + (mats || '<p class="card-empty">اختياري — حديد، صاج، مواسير، مفصلات… على حساب العميل أو تكلفة عليك</p>')
      + (mats ? '<div class="sum-list" style="margin-top:6px">' + row('على حساب العميل (في الفاتورة)', money(r.matBilled)) + row('إجمالي تكلفة الخامات', money(r.matCost)) + '</div>' : '') + '</div>'
      // تكاليف التشغيل
      + '<div class="card" id="consCard"><div class="card-title"><span class="t-ic orange">' + ic('flame') + '</span><h2>تكاليف التشغيل والهالك</h2><button type="button" class="btn btn-soft btn-sm" data-act="addCons">' + ic('plus') + ' مستهلك</button></div>'
      + (cons || '<p class="card-empty">اختياري — سلك وأقطاب لحام، أقراص قطع وجلخ وصنفرة، بنط، غاز، هالك حديد وصاج</p>')
      + (cons ? '<div class="sum-list" style="margin-top:6px">' + row('إجمالي تكاليف المستهلكات', money(r.consCost)) + '</div>'
        + (r.consUnpriced ? '<p class="cost-note">' + r.consUnpriced + ' مستهلك متسجل من غير سعر — بيظهر في السجل ومش داخل في التكلفة.</p>' : '')
        + '<label class="bill-toggle"><span>أضفها على فاتورة العميل</span><input type="checkbox" data-act="billCons"' + (j.billConsumables ? ' checked' : '') + '></label>' : '') + '</div>'
      // الحساب
      + '<div class="card"><div class="card-title"><span class="t-ic">' + ic('receipt') + '</span><h2>الحساب</h2></div><div class="sum-list">'
      + row('إجمالي المصنعية', money(r.labor))
      + (r.matBilled ? row('الخامات على العميل', money(r.matBilled)) : '')
      + (r.consBilled ? row('تكاليف التشغيل والهالك', money(r.consBilled)) : '')
      + '<div class="sum-row minus"><span>الخصم' + esc(disc) + ' <button type="button" class="edit-link" data-act="editDisc">' + (r.discount ? 'تعديل' : 'إضافة خصم') + '</button></span><strong>' + (r.discount ? '- ' : '') + esc(money(r.discount)) + '</strong></div>'
      + row('المبلغ النهائي', money(r.total), 'bold') + row('المدفوع', money(r.paid)) + '</div>'
      + '<div class="sum-total"><span>' + (r.remaining < -0.005 ? 'زيادة للعميل' : 'المتبقي على العميل') + '</span><strong>' + esc(money(Math.abs(r.remaining))) + '</strong></div>'
      + (pays ? '<div style="margin-top:10px">' + pays + '</div>' : '')
      + '<button type="button" class="btn btn-ghost" data-act="addPay" style="margin-top:10px">' + ic('cash') + ' تسجيل دفعة</button></div>'
      // صافي الربح
      + '<div class="card" id="profitCard"><div class="card-title"><span class="t-ic orange">' + ic('chart') + '</span><h2>صافي الربح التقديري</h2></div><div class="sum-list">'
      + row('إجمالي قيمة الشغل', money(r.total)) + row('تكلفة الخامات', money(r.matCost)) + row('تكاليف التشغيل والهالك', money(r.consCost))
      + '<div class="sum-row profit' + (r.profit < 0 ? ' neg' : '') + '"><span>صافي الربح التقديري</span><strong>' + esc(money(r.profit)) + '</strong></div></div>'
      + '<p class="cost-note">' + (r.hasCosts ? '' : 'لسه مفيش تكاليف متسجلة — الربح = قيمة الشغل كلها. ') + 'يوميات العمال والصنايعية والمساعدين في النوتة تحت.</p></div>'
      // نوتة العمال (مشتركة في كل الأقسام)
      + '<div data-az-crew="' + SECTION + ':' + esc(j.customerId) + '" data-sec="' + SECTION_NAME + '" data-name="' + esc(c.name || '') + '" data-phone="' + esc(c.phone || '') + '" data-address="' + esc(c.address || '') + '" data-rev="' + esc(custRev(j.customerId)) + '" data-paid="' + esc(custPaid(j.customerId)) + '" data-cur="' + esc(cur().sym) + '"></div>'
      // ملاحظات
      + '<div class="card"><div class="card-title"><span class="t-ic">' + ic('edit') + '</span><h2>ملاحظات الحساب</h2></div><textarea id="jobNotes" placeholder="بتظهر في الفاتورة">' + esc(j.notes || '') + '</textarea></div>'
      + '<div class="btn-row"><button type="button" class="btn btn-primary" data-act="preview" data-doc="invoice">' + ic('receipt') + ' الفاتورة</button><button type="button" class="btn btn-ghost" data-act="preview" data-doc="quote">' + ic('file') + ' عرض سعر</button></div>'
      + '<div class="btn-row" style="margin-top:10px"><button type="button" class="btn btn-ghost" data-act="dupJob">' + ic('copy') + ' تكرار الحساب</button><button type="button" class="btn btn-danger" data-act="delJob">' + ic('trash') + ' حذف الحساب</button></div>'
      + '</div>'
      + '<div class="pg-foot"><div class="eb-info"><span>المبلغ النهائي</span><strong>' + esc(money(r.total)) + '</strong></div>'
      + '<button type="button" class="btn btn-accent" data-act="preview" data-doc="invoice">' + ic('print') + ' الفاتورة PDF</button></div>';
    var el = $('jobPage'), st = el.scrollTop;
    el.innerHTML = html; el.scrollTop = st;
    $('jobNotes').addEventListener('input', function () { j.notes = this.value; touch(j); saveDb(); });
  }
  function custRev(cid) { return C.money(jobsOf(cid).reduce(function (s, j) { return s + C.job(j).total; }, 0)); }
  function custPaid(cid) { return C.money(jobsOf(cid).reduce(function (s, j) { return s + C.job(j).paid; }, 0)); }

  function openJobMenu() {
    var j = getJob(openJobId); if (!j) return;
    openSheet('خيارات الحساب',
      '<div class="menu-list">'
      + '<button type="button" class="action-item" data-act="editJobInfo"><span class="a-ic">' + ic('edit') + '</span><span>تعديل بيانات الحساب<small>العميل، اسم الشغلانة، التاريخ</small></span></button>'
      + '<button type="button" class="action-item" data-act="openCustOfJob"><span class="a-ic">' + ic('users') + '</span><span>صفحة العميل<small>كل حساباته وكشف الحساب</small></span></button>'
      + '<button type="button" class="action-item" data-act="dupJob"><span class="a-ic orange">' + ic('copy') + '</span><span>تكرار الحساب<small>نسخة جديدة بنفس البنود (من غير الدفعات)</small></span></button>'
      + '<button type="button" class="action-item" data-act="delJob"><span class="a-ic" style="background:var(--danger-soft);color:var(--danger)">' + ic('trash') + '</span><span>حذف الحساب<small>بعد التأكيد</small></span></button></div>', {});
  }
  function openJobInfoSheet() {
    var j = getJob(openJobId); if (!j) return;
    var c = getCust(j.customerId) || {};
    openSheet('بيانات الحساب',
      '<div class="field"><label for="f_cname">العميل</label><input type="text" id="f_cname" autocomplete="off" value="' + esc(c.name || '') + '">' + custSuggestHTML() + '</div>'
      + '<div class="field"><label for="f_jtitle">اسم الشغلانة أو المشروع</label><input type="text" id="f_jtitle" value="' + esc(j.title || '') + '"></div>'
      + '<div class="row-2"><div class="field"><label for="f_date">التاريخ</label><input type="date" id="f_date" value="' + esc(j.date || today()) + '"></div>'
      + '<div class="field"><label for="f_num">رقم الحساب</label><input type="text" id="f_num" dir="ltr" value="' + esc(j.number || '') + '"></div></div>'
      + '<button type="button" class="btn btn-primary" data-act="saveJobInfo">' + ic('check') + ' حفظ</button>', { jobId: j.id, custId: c.id || null });
    bindCustSuggest();
  }
  function saveJobInfo() {
    var j = getJob(S.jobId); if (!j) return;
    var name = val('f_cname').trim();
    if (!name) { toast('اكتب اسم العميل'); return; }
    var c = ensureCustomer(name);
    j.customerId = c.id; j.title = val('f_jtitle').trim(); j.date = val('f_date') || j.date; j.number = val('f_num').trim() || j.number;
    touch(j); saveDb();
    closeTop(function () { refresh(); toast('اتحفظ'); });
  }
  function dupJob() {
    var j = getJob(openJobId); if (!j) return;
    var c = getCust(j.customerId) || ensureCustomer('عميل');
    var n = newJobRecord(c, (j.title || 'حساب') + ' (نسخة)', today());
    var copy = JSON.parse(JSON.stringify(j));
    n.items = copy.items.map(function (x) { x.id = uid('i'); return x; });
    n.materials = copy.materials.map(function (x) { x.id = uid('m'); return x; });
    n.consumables = copy.consumables.map(function (x) { x.id = uid('k'); return x; });
    n.discount = copy.discount; n.notes = copy.notes; n.billConsumables = copy.billConsumables;
    saveDb();
    // نقفل الحساب القديم (والقايمة لو مفتوحة) ونفتح النسخة
    var steps = topLayer() && topLayer().type === 'sheet' ? 2 : 1;
    var go = function () { refresh(); openJob(n.id); toast('اتعملت نسخة: ' + n.number); };
    if (steps === 2) closeTop(function () { closeTop(go); }); else closeTop(go);
  }
  function delJob() {
    var j = getJob(openJobId); if (!j) return;
    var doIt = function () {
      confirmDlg('حذف الحساب؟', 'هيتمسح حساب ' + custName(j) + ' ' + (j.number || '') + ' بكل بنوده ودفعاته. مش هينفع ترجّعه.', 'أيوه، امسح').then(function (ok) {
        if (!ok) return;
        db.jobs = db.jobs.filter(function (x) { return x.id !== j.id; });
        saveDb();
        closeTop(function () { refresh(); toast('اتمسح الحساب'); });
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
    var tot = 0, paid = 0;
    js.forEach(function (j) { var r = C.job(j); tot += r.total; paid += r.paid; });
    var html = '<div class="pg-head"><button type="button" class="icon-btn" data-act="closeTop" aria-label="رجوع">' + ic('back') + '</button>'
      + '<div class="titles"><h2>' + esc(c.name) + '</h2><div class="sub">' + esc([c.phone, c.address].filter(Boolean).join(' · ') || 'عميل') + '</div></div>'
      + '<button type="button" class="icon-btn" data-act="editCust" aria-label="تعديل">' + ic('edit') + '</button></div><div class="container">'
      + '<div class="mini-stats"><div><span>إجمالي الحسابات</span><strong>' + esc(money(tot)) + '</strong></div><div><span>المدفوع</span><strong>' + esc(money(paid)) + '</strong></div><div><span>المتبقي</span><strong>' + esc(money(tot - paid)) + '</strong></div></div>'
      + (c.note ? '<div class="note" style="margin-bottom:12px">' + esc(c.note) + '</div>' : '')
      + (c.phone ? '<a class="btn btn-ghost" href="tel:' + esc(c.phone) + '" style="margin-bottom:10px">' + ic('phone') + ' اتصال</a>' : '')
      + '<button type="button" class="btn btn-accent" data-act="newJobFor" style="margin-bottom:14px">' + ic('plus') + ' حساب جديد لـ ' + esc(c.name) + '</button>'
      + '<div class="section-head"><h3>الحسابات <span class="count">' + js.length + '</span></h3></div>'
      + (js.length ? js.map(jobCard).join('') : '<div class="home-empty">مفيش حسابات للعميل ده</div>')
      + '<div style="margin-top:14px" data-az-crew="' + SECTION + ':' + esc(c.id) + '" data-sec="' + SECTION_NAME + '" data-name="' + esc(c.name) + '" data-phone="' + esc(c.phone || '') + '" data-address="' + esc(c.address || '') + '" data-rev="' + esc(C.money(tot)) + '" data-paid="' + esc(C.money(paid)) + '" data-cur="' + esc(cur().sym) + '"></div>'
      + '<div class="btn-row" style="margin-top:12px"><button type="button" class="btn btn-primary" data-act="statement">' + ic('receipt') + ' كشف حساب PDF</button><button type="button" class="btn btn-danger" data-act="delCust">' + ic('trash') + ' حذف العميل</button></div>'
      + '</div>';
    var el = $('custPage'), st = el.scrollTop; el.innerHTML = html; el.scrollTop = st;
  }
  function delCust() {
    var c = getCust(openCustId); if (!c) return;
    var n = jobsOf(c.id).length;
    confirmDlg('حذف العميل؟', n ? 'هيتمسح ' + c.name + ' ومعاه ' + n + ' حساب. مش هينفع ترجّعهم.' : 'هيتمسح ' + c.name + '.', 'أيوه، امسح').then(function (ok) {
      if (!ok) return;
      db.jobs = db.jobs.filter(function (j) { return j.customerId !== c.id; });
      db.customers = db.customers.filter(function (x) { return x.id !== c.id; });
      saveDb();
      closeTop(function () { refresh(); toast('اتمسح العميل'); });
    });
  }

  // ---------------- اختيار حساب (للتكاليف أو الدفعة) ----------------
  function openPickJob(purpose) {
    var list = sortedJobs().sort(function (a, b) { return (a.status === 'done') - (b.status === 'done'); });
    if (purpose === 'pay') list = list.filter(function (j) { return C.job(j).remaining > 0.005; });
    if (!list.length) {
      if (purpose === 'pay') { toast('مفيش حسابات عليها فلوس'); return; }
      openSheet('تكاليف التشغيل والهالك', '<div class="empty"><div class="big">' + ic('flame') + '</div><p>التكاليف بتتسجل على حساب عميل. اعمل حساب الأول.</p><button type="button" class="btn btn-accent" data-act="newJob">' + ic('plus') + ' حساب جديد</button></div>', {});
      return;
    }
    openSheet(purpose === 'pay' ? 'تسجيل دفعة — اختار الحساب' : 'تكاليف التشغيل والهالك — اختار الحساب',
      '<div class="pick-list">' + list.slice(0, 40).map(function (j) { return jobCard(j).replace('data-act="openJob"', 'data-act="pickedJob"').replace('data-act="pickedInvoice"', 'data-act="pickedJob"'); }).join('') + '</div>',
      { pickFor: purpose });
  }

  // ---------------- المستندات (فاتورة / عرض سعر / كشف حساب) ----------------
  var pv = null; // { doc, jobId, custId }
  function business() { var b = settings.business || {}; return { name: b.name || '', trade: 'أعمال الحدادة وتصنيع الحديد', phone: b.phone || '', address: b.address || '', logo: b.logo || '' }; }
  function unitLabel(k) { return { laser: 'م²', door: 'م²', roof: 'م²', hand: 'كجم', piece: 'قطعة', lump: 'مقطوعية' }[k]; }
  function jobDocHTML(j, doc) {
    var r = C.job(j), c = getCust(j.customerId) || {}, A = window.ArzaqiInvoice;
    var rows = '';
    j.items.forEach(function (it, i) {
      var x = r.items[i], K = C.KINDS[it.kind], u = it.dimUnit === 'cm' ? 'سم' : 'م', qty, price;
      if (K.basis === 'area') { qty = fq(it.h) + ' × ' + fq(it.w) + ' ' + u + (x.count !== 1 ? ' × ' + fq(x.count) : '') + ' = <b>' + fq(x.area) + ' م²</b>'; price = fmt(x.price) + ' / م²'; }
      else if (K.basis === 'weight') { qty = fq(x.weightEach) + ' كجم' + (x.count !== 1 ? ' × ' + fq(x.count) : '') + ' = <b>' + fq(x.weight) + ' كجم</b>'; price = fmt(x.price) + ' / كجم'; }
      else if (K.basis === 'piece') { qty = '<b>' + fq(x.count) + '</b> قطعة'; price = fmt(x.price); }
      else { qty = '—'; price = '—'; }
      var sub = [];
      if (it.kind === 'piece' && it.specs) sub.push(it.specs);
      if (it.kind === 'lump' && it.desc) sub.push(it.desc);
      if (it.kind === 'lump' && it.date) sub.push('تاريخ التنفيذ: ' + fmtDate(it.date));
      if (it.notes) sub.push(it.notes);
      // نوع العمل في عموده، فالبند بيكتب الوصف بس (ولو مفيش وصف: اسم النوع)
      var name = (it.kind === 'piece' ? it.name : it.kind === 'lump' ? it.title : it.desc) || K.label;
      rows += '<tr><td class="idx">' + (i + 1) + '</td><td class="t">' + A.esc(name) + sub.map(function (s) { return '<span class="sub-note">' + A.esc(s) + '</span>'; }).join('') + '</td>'
        + '<td>' + A.esc(K.label) + '</td><td>' + unitLabel(it.kind) + '</td><td>' + qty + '</td><td class="money">' + price + '</td><td class="money">' + money(x.total) + '</td></tr>';
      // مهام المقطوعية: كل مهمة بمبلغها في عمود السعر (الإجمالي في سطر البند بس)
      if (it.kind === 'lump' && x.tasks.length > 1) x.tasks.forEach(function (t) {
        rows += '<tr class="task"><td></td><td class="t" colspan="4">— ' + A.esc(t.desc || 'مهمة') + '</td><td class="money">' + money(t.amount) + '</td><td></td></tr>';
      });
    });
    var body = '<div class="inv-sec"><span class="n">1</span> بنود الشغل</div>'
      + '<table class="p-table"><thead><tr><th>م</th><th>البند</th><th>نوع العمل</th><th>وحدة الحساب</th><th>الكمية / المقاسات</th><th>سعر الوحدة</th><th>الإجمالي</th></tr></thead><tbody>'
      + (rows || '<tr><td colspan="7">لسه مفيش بنود</td></tr>') + '</tbody><tfoot><tr><td colspan="6">إجمالي المصنعية</td><td>' + money(r.labor) + '</td></tr></tfoot></table>';
    var sec = 1;
    var billedMats = j.materials.map(function (m, i) { return [m, r.materials[i]]; }).filter(function (p) { return p[1].billed; });
    if (billedMats.length) {
      sec++;
      body += '<div class="inv-sec"><span class="n">' + sec + '</span> الخامات</div><table class="p-table"><thead><tr><th>م</th><th>الخامة</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th></tr></thead><tbody>'
        + billedMats.map(function (p, i) { return '<tr><td class="idx">' + (i + 1) + '</td><td class="t">' + A.esc(p[0].name) + (p[0].note ? '<span class="sub-note">' + A.esc(p[0].note) + '</span>' : '') + '</td><td>' + fq(p[0].qty) + ' ' + A.esc(p[0].unit || '') + '</td><td class="money">' + fmt(p[1].price) + '</td><td class="money">' + money(p[1].total) + '</td></tr>'; }).join('')
        + '</tbody><tfoot><tr><td colspan="4">إجمالي الخامات</td><td>' + money(r.matBilled) + '</td></tr></tfoot></table>';
    }
    if (r.consBilled > 0) {
      sec++;
      body += '<div class="inv-sec"><span class="n">' + sec + '</span> تكاليف التشغيل والهالك</div><table class="p-table"><thead><tr><th>م</th><th>المستهلك</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th></tr></thead><tbody>'
        + j.consumables.map(function (k, i) { var x = r.consumables[i]; return '<tr><td class="idx">' + (i + 1) + '</td><td class="t">' + A.esc(k.name) + '</td><td>' + fq(k.qty) + ' ' + A.esc(k.unit || '') + '</td><td class="money">' + (x.priced ? fmt(x.price) : '—') + '</td><td class="money">' + (x.priced ? money(x.total) : '—') + '</td></tr>'; }).join('')
        + '</tbody><tfoot><tr><td colspan="4">إجمالي تكاليف التشغيل والهالك</td><td>' + money(r.consBilled) + '</td></tr></tfoot></table>';
    }
    var notes = [j.notes, settings.terms].map(function (s) { return String(s || '').trim(); }).filter(Boolean);
    var discLbl = 'الخصم' + (j.discount && j.discount.type === 'percent' && C.num(j.discount.value) ? ' (' + fq(j.discount.value) + '%)' : '');
    var cc = cur();
    return A.render({
      section: SECTION, docKey: doc + ':' + j.id, docLabel: doc === 'quote' ? 'عرض سعر' : 'فاتورة',
      number: j.number, date: fmtDate(j.date || today()), billable: doc !== 'quote', currency: cc.name + ' (' + cc.sym + ')',
      business: business(), client: { name: c.name || '', phone: c.phone || '', address: c.address || '', note: c.note || '' },
      fields: [{ label: 'الشغلانة', value: j.title || '' }],
      bodyHTML: body,
      notesHTML: notes.length ? '<div class="inv-notes"><h4>ملاحظات</h4>' + notes.map(function (n) { return '<div>' + A.esc(n).replace(/\n/g, '<br>') + '</div>'; }).join('') + '</div>' : '',
      totals: { lines: [['إجمالي المصنعية', r.labor], ['الخامات', r.matBilled], ['تكاليف التشغيل والهالك', r.consBilled], [discLbl, r.discount, '-']], total: r.total, totalLabel: doc === 'quote' ? 'إجمالي العرض' : 'المبلغ النهائي', paid: r.paid, paidLabel: 'المدفوع' },
      netLabel: 'إجمالي عرض السعر',
      money: money, signLabel: 'توقيع الحداد'
    });
  }
  function statementHTML(cid) {
    var c = getCust(cid) || {}, A = window.ArzaqiInvoice;
    var js = jobsOf(cid).sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); });
    var tot = 0, paid = 0, pays = [];
    var rows = js.map(function (j, i) {
      var r = C.job(j); tot += r.total; paid += r.paid;
      j.payments.forEach(function (p) { pays.push({ date: p.date, job: j, amount: C.num(p.amount), note: p.note }); });
      return '<tr><td class="idx">' + (i + 1) + '</td><td class="t">' + A.esc(j.title || 'حساب') + '<span class="sub-note">' + A.esc(j.number || '') + '</span></td><td>' + fmtDate(j.date) + '</td><td class="money">' + money(r.total) + '</td><td class="money">' + money(r.paid) + '</td><td class="money">' + money(r.remaining) + '</td></tr>';
    }).join('');
    pays.sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); });
    var body = '<div class="inv-sec"><span class="n">1</span> الحسابات</div><table class="p-table"><thead><tr><th>م</th><th>الحساب</th><th>التاريخ</th><th>الإجمالي</th><th>المدفوع</th><th>المتبقي</th></tr></thead><tbody>'
      + (rows || '<tr><td colspan="6">مفيش حسابات</td></tr>') + '</tbody><tfoot><tr><td colspan="3">الإجمالي</td><td>' + money(tot) + '</td><td>' + money(paid) + '</td><td>' + money(tot - paid) + '</td></tr></tfoot></table>';
    if (pays.length) body += '<div class="inv-sec"><span class="n">2</span> الدفعات</div><table class="p-table"><thead><tr><th>م</th><th>التاريخ</th><th>الحساب</th><th>ملحوظة</th><th>المبلغ</th></tr></thead><tbody>'
      + pays.map(function (p, i) { return '<tr><td class="idx">' + (i + 1) + '</td><td>' + fmtDate(p.date) + '</td><td>' + A.esc(p.job.number || '') + '</td><td class="t">' + A.esc(p.note || '') + '</td><td class="money">' + money(p.amount) + '</td></tr>'; }).join('') + '</tbody></table>';
    var cc = cur();
    return A.render({
      section: SECTION, docKey: 'statement:' + cid, docLabel: 'كشف حساب', date: fmtDate(today()), billable: true, currency: cc.name + ' (' + cc.sym + ')',
      business: business(), client: { name: c.name || '', phone: c.phone || '', address: c.address || '', note: c.note || '' },
      bodyHTML: body, totals: { lines: [['إجمالي الحسابات', tot]], total: tot, totalLabel: 'الإجمالي المستحق', paid: paid, paidLabel: 'المدفوع' },
      money: money, noWarranty: true, signs: [], boxTitle: 'ملخص الحساب'
    });
  }
  function docTitle() {
    if (!pv) return document.title;
    if (pv.custId) return 'كشف حساب — ' + ((getCust(pv.custId) || {}).name || '');
    var j = getJob(pv.jobId) || {};
    return (pv.doc === 'quote' ? 'عرض سعر' : 'فاتورة') + ' ' + (j.number || '') + ' — ' + custName(j);
  }
  function openPreview(o) {
    pv = o;
    renderPreview();
    var m = $('printPreviewModal');
    m.style.display = 'block'; m.scrollTop = 0;
    pushLayer({ type: 'preview', hide: function () { m.style.display = 'none'; pv = null; } });
    fitPreview();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitPreview);
    setTimeout(fitPreview, 300);
  }
  function renderPreview() {
    if (!pv) return;
    $('pvDocs').innerHTML = pv.jobId ? '<button type="button" data-act="pvDoc" data-doc="invoice" class="' + (pv.doc !== 'quote' ? 'on' : '') + '">فاتورة</button><button type="button" data-act="pvDoc" data-doc="quote" class="' + (pv.doc === 'quote' ? 'on' : '') + '">عرض سعر</button>' : '';
    $('printSheet').innerHTML = pv.custId ? statementHTML(pv.custId) : jobDocHTML(getJob(pv.jobId), pv.doc);
  }
  function fitPreview() {
    var sh = $('printSheet'), vp = $('printViewport');
    if (!sh || $('printPreviewModal').style.display !== 'block') return;
    var w = sh.offsetWidth || 794, s = Math.min(1, (window.innerWidth - 16) / w);
    sh.style.transform = 'scale(' + s + ')';
    vp.style.width = (w * s) + 'px'; vp.style.height = (sh.offsetHeight * s) + 'px';
  }
  window.addEventListener('resize', fitPreview);
  var BRIDGES = ['HesabatyApp', 'HesabatiPlumbingApp', 'HesabatiHvacApp', 'HFloorApp', 'PlasterApp'];
  $('pvPrint').addEventListener('click', function () {
    var title = docTitle(), prev = document.title;
    document.title = title;
    var restore = function () { document.title = prev; window.removeEventListener('afterprint', restore); };
    window.addEventListener('afterprint', restore);
    // جوه تطبيق أندرويد: الطباعة / حفظ PDF من جسر التطبيق (زي باقي الأقسام)
    for (var i = 0; i < BRIDGES.length; i++) {
      var b = window[BRIDGES[i]];
      if (b && typeof b.print === 'function') { try { b.print(title); setTimeout(restore, 4000); return; } catch (e) {} }
    }
    setTimeout(function () { window.print(); }, 60);
  });

  // ---------------- الأزرار ----------------
  var ACT = {
    closeTop: function () { closeTop(); },
    view: function (b) {
      var go = function () { if (b.dataset.filter) jobFilter.f = b.dataset.filter; switchView(b.dataset.view); };
      if (stack.length) closeTop(go); else go();
    },
    create: function () {
      openSheet('إنشاء جديد',
        '<div class="create-list"><button type="button" class="create-opt dark" data-act="newJob"><span class="q-ic orange">' + ic('plus') + '</span><span><b>حساب جديد</b><small>عميل + بنود من أي نوع + فاتورة</small></span></button>'
        + '<p class="more-h">أو ابدأ بنوع الشغل على طول</p>' + kindGridHTML('quickKindSheet')
        + '<div class="create-row"><button type="button" class="create-opt" data-act="quickCosts"><span class="q-ic orange-soft">' + ic('flame') + '</span><span><b>تكاليف التشغيل</b><small>والهالك</small></span></button>'
        + '<button type="button" class="create-opt" data-act="quickPay"><span class="q-ic green">' + ic('cash') + '</span><span><b>تسجيل دفعة</b><small>من عميل</small></span></button></div>'
        + '<button type="button" class="create-opt" data-act="newCustomer"><span class="q-ic">' + ic('users') + '</span><span><b>عميل جديد</b><small>اسم وتليفون وعنوان</small></span></button></div>', {});
    },
    newJob: function () { openNewJobSheet(null); },
    newJobFor: function () { openNewJobSheet(openCustId); },
    createJob: createJob,
    quickKind: function (b) { openItemSheet({ kind: b.dataset.kind }); },
    quickKindSheet: function (b) { openItemSheet({ kind: b.dataset.kind }); },
    quickCosts: function () { openPickJob('costs'); },
    quickPay: function () { openPickJob('pay'); },
    pickedJob: function (b) {
      var id = b.dataset.id, purpose = S.pickFor;
      closeTop(function () { openJob(id); if (purpose === 'pay') openPaySheet(id); else openSimpleSheet('cons', id); });
    },
    pickInvoice: function () { switchView('jobs'); setPick(true); renderJobs(); },
    cancelPick: function () { setPick(false); renderJobs(); },
    pickedInvoice: function (b) { setPick(false); renderJobs(); openPreview({ doc: 'invoice', jobId: b.dataset.id }); },
    openJob: function (b) { openJob(b.dataset.id); },
    openCust: function (b) { openCust(b.dataset.id); },
    newCustomer: function () { openCustomerSheet(null); },
    saveCustomer: saveCustomer,
    editCust: function () { openCustomerSheet(openCustId); },
    delCust: delCust,
    statement: function () { openPreview({ doc: 'statement', custId: openCustId }); },
    pickCust: function (b) {
      var c = getCust(b.dataset.id); if (!c) return;
      $('f_cname').value = c.name; S.custId = c.id; $('f_csug').innerHTML = '';
      if ($('f_cphone') && !$('f_cphone').value) $('f_cphone').value = c.phone || '';
      renderTargetJobs();
    },
    target: function (b) { S.targetJob = b.dataset.id || null; renderTargetJobs(); },
    addItem: function () { openKindSheet(openJobId); },
    chooseKind: function (b) { openItemSheet({ jobId: S.jobId, kind: b.dataset.kind }); },
    chooseKindJob: function (b) { openItemSheet({ jobId: openJobId, kind: b.dataset.kind }); },
    editItem: function (b) { openItemSheet({ jobId: openJobId, itemId: b.dataset.id }); },
    saveItem: saveItem,
    dupItem: function () {
      var j = getJob(S.jobId); if (!j) return;
      var it = j.items.find(function (x) { return x.id === S.itemId; }); if (!it) return;
      var c = JSON.parse(JSON.stringify(it)); c.id = uid('i');
      j.items.splice(j.items.indexOf(it) + 1, 0, c); touch(j); saveDb();
      closeTop(function () { refresh(); toast('اتكرر البند'); });
    },
    delItem: function () {
      var j = getJob(S.jobId), id = S.itemId; if (!j) return;
      closeTop(function () {
        confirmDlg('حذف البند؟', 'هيتمسح البند من الحساب.', 'أيوه، امسح').then(function (ok) {
          if (!ok) return;
          j.items = j.items.filter(function (x) { return x.id !== id; }); touch(j); saveDb(); refresh(); toast('اتمسح البند');
        });
      });
    },
    dimUnit: function (b) {
      var from = S.dimUnit, to = b.dataset.u;
      if (from === to) return;
      // تحويل الأرقام المكتوبة علشان المقاس يفضل هو هو
      ['f_h', 'f_w'].forEach(function (id) { var el = $(id), n = C.num(el.value); if (n) el.value = String(C.round(to === 'cm' ? n * 100 : n / 100, 4)); });
      S.dimUnit = to; syncUnitSeg(); updateItemLive();
    },
    step: function (b) {
      var el = $(b.dataset.t), n = C.num(el.value) || 0;
      n = Math.max(0, n + Number(b.dataset.d)); el.value = String(C.round(n, 3));
      updateItemLive();
    },
    usePrice: function (b) { $('f_price').value = b.dataset.v; updateItemLive(); },
    setName: function (b) { $('f_name').value = b.dataset.v; updateItemLive(); },
    addTask: function () { $('f_tasks').insertAdjacentHTML('beforeend', taskRow({})); var rs = $('f_tasks').querySelectorAll('.t-desc'); rs[rs.length - 1].focus(); },
    delTask: function (b) { var rs = $('f_tasks').querySelectorAll('.task-row'); if (rs.length > 1) b.closest('.task-row').remove(); else { rs[0].querySelector('.t-desc').value = ''; rs[0].querySelector('.t-amt').value = ''; } updateItemLive(); },
    addMat: function () { openSimpleSheet('mat', openJobId); },
    editMat: function (b) { openSimpleSheet('mat', openJobId, b.dataset.id); },
    addCons: function () { openSimpleSheet('cons', openJobId); },
    editCons: function (b) { openSimpleSheet('cons', openJobId, b.dataset.id); },
    setSName: function (b) { $('f_sname').value = b.dataset.v; if (b.dataset.u && !$('f_sunit').value) $('f_sunit').value = b.dataset.u; updateSimpleLive(); },
    setSUnit: function (b) { $('f_sunit').value = b.dataset.v; },
    saveSimple: saveSimple,
    delSimple: function () {
      var j = getJob(S.jobId), id = S.rowId, isCons = S.form === 'cons'; if (!j) return;
      if (isCons) j.consumables = j.consumables.filter(function (x) { return x.id !== id; }); else j.materials = j.materials.filter(function (x) { return x.id !== id; });
      touch(j); saveDb(); closeTop(function () { refresh(); toast('اتمسح'); });
    },
    billCons: function (b) { var j = getJob(openJobId); if (!j) return; j.billConsumables = !!b.checked; touch(j); saveDb(); refresh(); },
    addPay: function () { openPaySheet(openJobId); },
    editPay: function (b) { openPaySheet(openJobId, b.dataset.id); },
    payAll: function (b) { $('f_pamt').value = b.dataset.v; },
    savePay: savePay,
    delPay: function () { var j = getJob(S.jobId), id = S.payId; if (!j) return; j.payments = j.payments.filter(function (x) { return x.id !== id; }); touch(j); saveDb(); closeTop(function () { refresh(); toast('اتمسحت الدفعة'); }); },
    editDisc: function () { openDiscSheet(openJobId); },
    discType: function (b) { S.dtype = b.dataset.v; updateDiscLive(); },
    saveDisc: function () { var j = getJob(S.jobId); if (!j) return; j.discount = { type: S.dtype, value: C.num(val('f_dval')) }; touch(j); saveDb(); closeTop(function () { refresh(); toast('اتحفظ الخصم'); }); },
    clearDisc: function () { var j = getJob(S.jobId); if (!j) return; j.discount = { type: 'amount', value: 0 }; touch(j); saveDb(); closeTop(function () { refresh(); }); },
    setStatus: function (b) { var j = getJob(openJobId); if (!j) return; j.status = b.dataset.v; touch(j); saveDb(); refresh(); toast(j.status === 'done' ? 'الحساب خلصان' : 'الحساب جاري'); },
    scrollProfit: function () { var el = $('profitCard'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); },
    jobMenu: openJobMenu,
    editJobInfo: openJobInfoSheet,
    saveJobInfo: saveJobInfo,
    openCustOfJob: function () { var j = getJob(openJobId); if (!j) return; closeTop(function () { openCust(j.customerId); }); },
    dupJob: dupJob,
    delJob: delJob,
    preview: function (b) { openPreview({ doc: b.dataset.doc, jobId: openJobId }); },
    pvDoc: function (b) { if (!pv) return; pv.doc = b.dataset.doc; renderPreview(); fitPreview(); },
    clearJobFilter: function () { jobFilter.cust = ''; jobFilter.from = ''; jobFilter.to = ''; $('jobFrom').value = ''; $('jobTo').value = ''; renderJobs(); }
  };
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]');
    if (!b || b.disabled) return;
    var f = ACT[b.dataset.act];
    if (!f) return;
    if (b.tagName !== 'INPUT') e.preventDefault();
    f(b, e);
  });
  // المظهر ووحدة المقاسات من «المزيد»
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-theme-set]');
    if (t) { settings.theme = t.dataset.themeSet; saveSettings(); applyTheme(); return; }
    var u = e.target.closest('[data-unit-set]');
    if (u) { settings.dimUnit = u.dataset.unitSet; saveSettings(); renderMore(); }
  });

  // ---------------- البداية ----------------
  if (history.state && history.state.mw) history.replaceState(null, '');
  applyTheme();
  renderHome();

  // العمل من غير إنترنت
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', function () { navigator.serviceWorker.register('./service-worker.js').catch(function () {}); });
  }

  // للاختبارات: نفس الدوال اللي الواجهة بتستخدمها
  window.MetalApp = { get db() { return db; }, settings: settings, openJob: openJob, openPreview: openPreview, calc: C };
})();
