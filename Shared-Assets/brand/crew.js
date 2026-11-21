/*
 * أرزقي | Arzoqi — نوتة العمال واليوميات (مشتركة بين كل الأقسام).
 *
 * لكل عميل في أي قسم: تسجيل يوميات العمال والصنايعية والمساعدين اللي اشتغلوا عنده، والفلوس اللي اتدفعتلهم،
 * والمصروفات التانية (نقل، أكل، عدة…) — فتعرف مين ليه فلوس ومين خالص، وصافي ربحك من الشغلانة:
 *   صافي الربح = قيمة الشغلانة (من فواتير العميل في القسم، أو رقم تكتبه) − أجور العمال − المصروفات.
 *
 * القسم بيحط في صفحة العميل مكان فاضي:
 *   <div data-az-crew="plumbing:<id العميل>" data-sec="السباكة" data-name=".." data-phone=".." data-address=".."
 *        data-rev="قيمة الشغلانة" data-paid="اللي وصل من العميل" data-cur="ج.م"></div>
 * والملف ده بيملاه بكارت ملخص، والدوسة عليه بتفتح النوتة كاملة.
 * العمال نفسهم مشتركين بين كل الأقسام والعملاء (نفس الصنايعي ممكن يشتغل معاك في كذا شغلانة).
 * البيانات في localStorage تحت arzaqi_crew_v1 (بتدخل في النسخة الاحتياطية على درايف مع باقي بيانات أرزقي).
 */
(function () {
  'use strict';
  if (window.ArzoqiCrew) return;
  var me = document.currentScript;
  var BASE = (me && me.src) ? me.src.replace(/[^/]*$/, '') : '../../Shared-Assets/brand/';
  var KEY = 'arzaqi_crew_v1';
  var ROLES = { craft: 'صنايعي', helper: 'مساعد', worker: 'عامل' };
  var EXP_PRESETS = ['نقل ومواصلات', 'أكل وشرب', 'عدة وأدوات', 'خامات صغيرة', 'أخرى'];

  // ---------------- التخزين ----------------
  function load() {
    var d;
    try { d = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { d = null; }
    d = d && typeof d === 'object' ? d : {};
    return { v: 1, workers: arr(d.workers), jobs: d.jobs && typeof d.jobs === 'object' ? d.jobs : {}, entries: arr(d.entries), pays: arr(d.pays), exps: arr(d.exps) };
  }
  function save(d) {
    try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { alert('تعذر الحفظ: مساحة التخزين ممتلئة'); }
    refreshCards();
  }
  function arr(x) { return Array.isArray(x) ? x : []; }
  function uid(p) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function num(v) { var n = parseFloat(String(v == null ? '' : v).replace(/[٠-٩]/g, function (c) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(c); }).replace(',', '.')); return isFinite(n) ? n : 0; }
  function r2(n) { return Math.round(n * 100) / 100; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmt(n) { return (Math.round(n * 100) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 }); }
  function today() { var d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); }
  function fdate(s) { if (!s) return ''; var p = String(s).split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : s; }

  // ---------------- الحسابات ----------------
  /** حساب شغلانة (عميل في قسم): لكل عامل الأيام والمستحق والمدفوع والباقي، والإجماليات وصافي الربح */
  function stats(d, job, revenue) {
    var J = d.jobs[job] || {};
    var ws = {}, wages = 0, paidOut = 0, exps = 0, days = 0;
    d.entries.forEach(function (e) {
      if (e.job !== job) return;
      var w = ws[e.workerId] || (ws[e.workerId] = { days: 0, earned: 0, paid: 0 });
      var amt = r2(num(e.days) * num(e.wage));
      w.days += num(e.days); w.earned += amt; wages += amt; days += num(e.days);
    });
    d.pays.forEach(function (p) {
      if (p.job !== job) return;
      var w = ws[p.workerId] || (ws[p.workerId] = { days: 0, earned: 0, paid: 0 });
      w.paid += num(p.amount); paidOut += num(p.amount);
    });
    d.exps.forEach(function (x) { if (x.job === job) exps += num(x.amount); });
    var owed = 0;
    Object.keys(ws).forEach(function (id) { var w = ws[id]; w.left = r2(w.earned - w.paid); if (w.left > 0) owed += w.left; });
    var value = J.value != null && J.value !== '' ? num(J.value) : num(revenue);
    return { workers: ws, wages: r2(wages), paidOut: r2(paidOut), owed: r2(owed), exps: r2(exps), days: r2(days),
      value: r2(value), valueManual: J.value != null && J.value !== '', profit: r2(value - wages - exps) };
  }
  /** حساب العامل في كل الشغلانات (كل الأقسام) */
  function workerTotal(d, workerId) {
    var earned = 0, paid = 0;
    d.entries.forEach(function (e) { if (e.workerId === workerId) earned += num(e.days) * num(e.wage); });
    d.pays.forEach(function (p) { if (p.workerId === workerId) paid += num(p.amount); });
    return { earned: r2(earned), paid: r2(paid), left: r2(earned - paid) };
  }
  function worker(d, id) { for (var i = 0; i < d.workers.length; i++) if (d.workers[i].id === id) return d.workers[i]; return null; }

  // ---------------- الكارت في صفحة العميل ----------------
  function ctxOf(el) {
    return { job: el.getAttribute('data-az-crew'), sec: el.getAttribute('data-sec') || '', name: el.getAttribute('data-name') || '',
      phone: el.getAttribute('data-phone') || '', address: el.getAttribute('data-address') || '',
      rev: num(el.getAttribute('data-rev')), paid: num(el.getAttribute('data-paid')), cur: el.getAttribute('data-cur') || 'ج.م' };
  }
  var ICON = {
    crew: '<svg viewBox="0 0 24 24"><circle cx="9" cy="7" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 4.5a3 3 0 0 1 0 5.8M21 20a5.5 5.5 0 0 0-4-5.3"/></svg>',
    arrow: '<svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg>',
    back: '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    cash: '<svg viewBox="0 0 24 24"><rect x="2.5" y="6" width="19" height="12" rx="2.5"/><circle cx="12" cy="12" r="2.6"/></svg>',
    bag: '<svg viewBox="0 0 24 24"><path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
    print: '<svg viewBox="0 0 24 24"><path d="M7 9V3h10v6M7 17H4v-6h16v6h-3"/><rect x="7" y="14" width="10" height="7"/></svg>',
    edit: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',
    trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
    x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>'
  };
  function cardHTML(c) {
    var d = load(), s = stats(d, c.job, c.rev), n = Object.keys(s.workers).length, cur = esc(c.cur);
    return '<button type="button" class="azc-card" data-az-crew-open>'
      + '<span class="azc-card-ic">' + ICON.crew + '</span>'
      + '<span class="azc-card-main"><b>نوتة العمال واليوميات</b>'
      + '<small>' + (n ? n + ' عامل · ' + fmt(s.days) + ' يومية · أجور ' + fmt(s.wages) + ' ' + cur : 'سجّل يوميات الصنايعية والمساعدين اللي اشتغلوا عند العميل ده') + '</small>'
      + (n || s.exps ? '<span class="azc-card-stats"><i class="' + (s.owed > 0 ? 'owe' : 'ok') + '">' + (s.owed > 0 ? 'ليهم عندك ' + fmt(s.owed) + ' ' + cur : 'العمال خالصين') + '</i>'
        + '<i class="' + (s.profit >= 0 ? 'pro' : 'loss') + '">صافي ربحك ' + fmt(s.profit) + ' ' + cur + '</i></span>' : '')
      + '</span><span class="azc-card-go">' + ICON.arrow + '</span></button>';
  }
  function refreshCards() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-az-crew]'), function (el) {
      var c = ctxOf(el);
      if (!c.job) return;
      var html = cardHTML(c);
      if (el.__azHtml !== html) { el.innerHTML = html; el.__azHtml = html; }
    });
  }
  // أي مكان فاضي بيظهر في الصفحة بيتملى لوحده
  function watch() {
    refreshCards();
    try {
      new MutationObserver(function (ms) {
        for (var i = 0; i < ms.length; i++) for (var j = 0; j < ms[i].addedNodes.length; j++) {
          var n = ms[i].addedNodes[j];
          if (n.nodeType === 1 && (n.hasAttribute && n.hasAttribute('data-az-crew') || n.querySelector && n.querySelector('[data-az-crew]'))) { refreshCards(); return; }
        }
      }).observe(document.documentElement, { childList: true, subtree: true });
    } catch (e) {}
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-az-crew-open]');
    if (!b) return;
    var host = b.closest('[data-az-crew]');
    if (host) { e.preventDefault(); e.stopPropagation(); open(ctxOf(host)); }
  }, true);

  // ---------------- النوتة الكاملة ----------------
  var ov = null, C = null, sheetEl = null;
  function isDark() {
    var h = document.documentElement, t = h.getAttribute('data-theme') || (h.classList.contains('dark') ? 'dark' : '') || (document.body && document.body.classList.contains('dark') ? 'dark' : '');
    if (t) return t === 'dark';
    var bg = getComputedStyle(document.body).backgroundColor.match(/\d+/g);
    if (bg && bg.length >= 3) return (0.299 * bg[0] + 0.587 * bg[1] + 0.114 * bg[2]) < 110;
    return !!(window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
  }
  function open(c) {
    C = c;
    if (!ov) {
      ov = document.createElement('div');
      ov.className = 'azc-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.dir = 'rtl';
      document.body.appendChild(ov);
      ov.addEventListener('click', onClick);
    }
    ov.classList.toggle('azc-dark', isDark());
    render();
    ov.classList.add('on');
    document.documentElement.classList.add('azc-lock');
    try { history.pushState({ azCrew: 1 }, ''); } catch (e) {}
  }
  function close(fromPop) {
    if (!ov || !ov.classList.contains('on')) return;
    closeSheet();
    ov.classList.remove('on');
    document.documentElement.classList.remove('azc-lock');
    refreshCards();
    if (!fromPop) { try { if (history.state && history.state.azCrew) history.back(); } catch (e) {} }
  }
  window.addEventListener('popstate', function () {
    if (sheetEl) { closeSheet(); try { history.pushState({ azCrew: 1 }, ''); } catch (e) {} return; }
    if (ov && ov.classList.contains('on')) close(true);
  });

  function render() {
    var d = load(), s = stats(d, C.job, C.rev), cur = esc(C.cur);
    var ids = Object.keys(s.workers);
    var wcards = ids.map(function (id) {
      var w = worker(d, id) || { name: 'عامل محذوف', role: 'worker' }, x = s.workers[id], all = workerTotal(d, id);
      var state = x.left > 0.005 ? '<span class="azc-badge owe">ليه ' + fmt(x.left) + ' ' + cur + '</span>'
        : (x.left < -0.005 ? '<span class="azc-badge adv">مقدّم ' + fmt(-x.left) + ' ' + cur + '</span>' : '<span class="azc-badge ok">خالص</span>');
      return '<div class="azc-w">'
        + '<div class="azc-w-top"><span class="azc-av">' + esc((w.name || '؟').trim().charAt(0)) + '</span>'
        + '<div class="azc-w-name"><b>' + esc(w.name) + '</b><small>' + esc(ROLES[w.role] || 'عامل') + (w.wage ? ' · يوميته ' + fmt(w.wage) + ' ' + cur : '') + '</small></div>' + state
        + '<button type="button" class="azc-ib" data-act="editWorker" data-id="' + esc(id) + '" aria-label="تعديل">' + ICON.edit + '</button></div>'
        + '<div class="azc-w-nums"><span><em>اليوميات</em>' + fmt(x.days) + '</span><span><em>المستحق</em>' + fmt(x.earned) + '</span><span><em>اتدفعله</em>' + fmt(x.paid) + '</span><span><em>الباقي</em>' + fmt(x.left) + '</span></div>'
        + (Math.abs(all.left - x.left) > 0.005 ? '<div class="azc-w-all">حسابه في كل الشغلانات: ' + (all.left > 0 ? 'ليه ' + fmt(all.left) : all.left < 0 ? 'مقدّم ' + fmt(-all.left) : 'خالص') + ' ' + cur + '</div>' : '')
        + '<div class="azc-w-act"><button type="button" class="azc-btn soft" data-act="day" data-id="' + esc(id) + '">' + ICON.plus + ' يومية</button>'
        + '<button type="button" class="azc-btn soft" data-act="pay" data-id="' + esc(id) + '">' + ICON.cash + ' دفعتله</button></div></div>';
    }).join('');

    // السجل: اليوميات والدفعات والمصروفات بالتاريخ
    var log = [];
    d.entries.forEach(function (e) { if (e.job === C.job) log.push({ k: 'e', o: e, date: e.date, t: e.t || 0 }); });
    d.pays.forEach(function (p) { if (p.job === C.job) log.push({ k: 'p', o: p, date: p.date, t: p.t || 0 }); });
    d.exps.forEach(function (x) { if (x.job === C.job) log.push({ k: 'x', o: x, date: x.date, t: x.t || 0 }); });
    log.sort(function (a, b) { return String(b.date).localeCompare(String(a.date)) || b.t - a.t; });
    var logHTML = log.map(function (it) {
      var o = it.o, w = worker(d, o.workerId), nm = w ? w.name : '';
      if (it.k === 'e') return row('day', 'يومية: ' + esc(nm), fmt(o.days) + ' يوم × ' + fmt(o.wage), fmt(r2(num(o.days) * num(o.wage))), o, 'e');
      if (it.k === 'p') return row('pay', 'دفعت لـ ' + esc(nm), '', fmt(o.amount), o, 'p');
      return row('exp', 'مصروف: ' + esc(o.label || 'أخرى'), '', fmt(o.amount), o, 'x');
    }).join('');
    function row(cls, title, sub, amt, o, k) {
      return '<div class="azc-log ' + cls + '"><div class="azc-log-main"><b>' + title + '</b><small>' + esc(fdate(o.date)) + (sub ? ' · ' + sub : '') + (o.note ? ' · ' + esc(o.note) : '') + '</small></div>'
        + '<strong>' + amt + '</strong><button type="button" class="azc-ib" data-act="del" data-k="' + k + '" data-id="' + esc(o.id) + '" aria-label="حذف">' + ICON.trash + '</button></div>';
    }

    ov.innerHTML = '<div class="azc-bar"><button type="button" class="azc-ib light" data-act="close" aria-label="رجوع">' + ICON.back + '</button>'
      + '<div class="azc-bar-t"><b>نوتة العمال واليوميات</b><small>' + esc(C.name) + (C.sec ? ' · ' + esc(C.sec) : '') + '</small></div>'
      + '<button type="button" class="azc-ib light" data-act="print" aria-label="طباعة PDF">' + ICON.print + '</button></div>'
      + '<div class="azc-body">'
      + '<section class="azc-hero ' + (s.profit < 0 ? 'loss' : '') + '"><span>صافي ربحك من الشغلانة</span><strong>' + fmt(s.profit) + ' <small>' + cur + '</small></strong>'
      + '<div class="azc-hero-grid">'
      + '<button type="button" data-act="value"><em>قيمة الشغلانة ' + ICON.edit + '</em><b>' + fmt(s.value) + '</b><small>' + (s.valueManual ? 'رقم انت كاتبه' : 'من فواتير العميل') + '</small></button>'
      + '<div><em>أجور العمال</em><b>− ' + fmt(s.wages) + '</b><small>' + fmt(s.days) + ' يومية</small></div>'
      + '<div><em>مصروفات تانية</em><b>− ' + fmt(s.exps) + '</b><small>نقل، أكل، عدة…</small></div>'
      + '<div class="' + (s.owed > 0 ? 'owe' : '') + '"><em>ليهم عندك</em><b>' + fmt(s.owed) + '</b><small>اتدفعلهم ' + fmt(s.paidOut) + '</small></div>'
      + '</div></section>'
      + '<div class="azc-actions"><button type="button" class="azc-btn main" data-act="day">' + ICON.plus + ' تسجيل يومية</button>'
      + '<button type="button" class="azc-btn" data-act="pay">' + ICON.cash + ' دفعت لعامل</button>'
      + '<button type="button" class="azc-btn" data-act="exp">' + ICON.bag + ' مصروف</button></div>'
      + '<h3 class="azc-h">العمال في الشغلانة <span>' + ids.length + '</span></h3>'
      + (wcards || '<div class="azc-empty">لسه مفيش يوميات. دوس «تسجيل يومية» واختار العمال اللي اشتغلوا النهارده — مرة واحدة لكذا عامل.</div>')
      + '<h3 class="azc-h">السجل <span>' + log.length + '</span></h3>'
      + (logHTML || '<div class="azc-empty">اليوميات والدفعات والمصروفات هتظهر هنا بالتاريخ.</div>')
      + '<p class="azc-note">صافي الربح = قيمة الشغلانة − أجور العمال − المصروفات. العمال مشتركين بين كل الأقسام، فحساب كل عامل في كل شغلاناته بيظهر تحت اسمه.</p>'
      + '</div>';
  }

  // ---------------- النوافذ الصغيرة (يومية / دفع / مصروف / عامل / قيمة) ----------------
  function sheet(title, body, onSave, extraBtn) {
    closeSheet();
    sheetEl = document.createElement('div');
    sheetEl.className = 'azc-sheet-wrap';
    sheetEl.innerHTML = '<div class="azc-sheet" role="dialog"><div class="azc-sheet-h"><b>' + title + '</b><button type="button" class="azc-ib" data-sx aria-label="قفل">' + ICON.x + '</button></div>'
      + '<div class="azc-sheet-b">' + body + '</div><div class="azc-sheet-f"><button type="button" class="azc-btn main" data-ss>حفظ</button>' + (extraBtn || '') + '<button type="button" class="azc-btn" data-sx>إلغاء</button></div></div>';
    ov.appendChild(sheetEl);
    sheetEl.addEventListener('click', function (e) {
      if (e.target === sheetEl || e.target.closest('[data-sx]')) { closeSheet(); return; }
      if (e.target.closest('[data-ss]')) { if (onSave(sheetEl) !== false) { closeSheet(); render(); } }
    });
    setTimeout(function () { sheetEl && sheetEl.classList.add('on'); }, 10);
    return sheetEl;
  }
  function closeSheet() { if (sheetEl && sheetEl.parentNode) sheetEl.parentNode.removeChild(sheetEl); sheetEl = null; }
  function field(label, html) { return '<label class="azc-f"><span>' + label + '</span>' + html + '</label>'; }
  function val(root, sel) { var e = root.querySelector(sel); return e ? e.value : ''; }

  function dayForm(preId) {
    var d = load();
    var list = d.workers.slice().sort(function (a, b) { return (b.last || 0) - (a.last || 0); });
    var chips = list.map(function (w) {
      return '<button type="button" class="azc-chip' + (w.id === preId ? ' on' : '') + '" data-w="' + esc(w.id) + '">' + esc(w.name) + '<small>' + esc(ROLES[w.role] || '') + (w.wage ? ' · ' + fmt(w.wage) : '') + '</small></button>';
    }).join('');
    var body = (list.length ? field('مين اشتغل؟ (اختار واحد أو أكتر)', '<div class="azc-chips" data-workers>' + chips + '</div>') : '')
      + '<details class="azc-new"' + (list.length ? '' : ' open') + '><summary>' + ICON.plus + ' عامل جديد</summary>'
      + field('الاسم', '<input data-nw-name maxlength="40" placeholder="مثلاً: أسطى محمود">')
      + field('الصفة', '<div class="azc-chips" data-role>' + Object.keys(ROLES).map(function (k, i) { return '<button type="button" class="azc-chip' + (i === 0 ? ' on' : '') + '" data-r="' + k + '">' + ROLES[k] + '</button>'; }).join('') + '</div>')
      + field('اليومية بتاعته', '<input data-nw-wage inputmode="decimal" placeholder="مثلاً 400">') + '</details>'
      + '<div class="azc-2">' + field('التاريخ', '<input type="date" data-date value="' + today() + '">')
      + field('عدد الأيام', '<input data-days inputmode="decimal" value="1">') + '</div>'
      + '<div class="azc-chips" data-dq><button type="button" class="azc-chip" data-q="1">يوم</button><button type="button" class="azc-chip" data-q="0.5">نص يوم</button><button type="button" class="azc-chip" data-q="2">يومين</button></div>'
      + field('اليومية (لو عايز تغيّرها للمرة دي)', '<input data-wage inputmode="decimal" placeholder="من يومية كل عامل">')
      + field('ملاحظة (اختياري)', '<input data-note maxlength="80" placeholder="مثلاً: تكسير الحمام">');
    var el = sheet('تسجيل يومية', body, function (root) {
      var dd = load();
      var picked = Array.prototype.map.call(root.querySelectorAll('[data-workers] .on'), function (b) { return b.getAttribute('data-w'); });
      var nn = val(root, '[data-nw-name]').trim();
      if (nn) {
        var role = (root.querySelector('[data-role] .on') || {}).getAttribute ? root.querySelector('[data-role] .on').getAttribute('data-r') : 'worker';
        var nw = { id: uid('w'), name: nn, role: role, wage: num(val(root, '[data-nw-wage]')), phone: '' };
        dd.workers.push(nw); picked.push(nw.id);
      }
      if (!picked.length) { alert('اختار العامل أو اكتب اسم عامل جديد'); return false; }
      var days = num(val(root, '[data-days]')), wageOver = val(root, '[data-wage]').trim(), date = val(root, '[data-date]') || today();
      if (!(days > 0)) { alert('اكتب عدد الأيام'); return false; }
      var t = Date.now();
      for (var i = 0; i < picked.length; i++) {
        var w = worker(dd, picked[i]);
        var wage = wageOver !== '' ? num(wageOver) : num(w && w.wage);
        if (!(wage > 0)) { alert('اكتب يومية «' + (w ? w.name : '') + '» (أو اكتب اليومية للمرة دي)'); return false; }
        dd.entries.push({ id: uid('e'), job: C.job, workerId: picked[i], date: date, days: days, wage: wage, note: val(root, '[data-note]').trim(), t: t + i });
        if (w) w.last = t;
      }
      jobMeta(dd); save(dd);
    });
    el.addEventListener('click', function (e) {
      var b = e.target.closest('.azc-chip'); if (!b) return;
      var g = b.parentNode;
      if (g.hasAttribute('data-workers')) b.classList.toggle('on');
      else if (g.hasAttribute('data-role')) { Array.prototype.forEach.call(g.children, function (x) { x.classList.remove('on'); }); b.classList.add('on'); }
      else if (g.hasAttribute('data-dq')) el.querySelector('[data-days]').value = b.getAttribute('data-q');
    });
  }
  function payForm(preId) {
    var d = load(), s = stats(d, C.job, C.rev);
    var ids = Object.keys(s.workers);
    var opts = d.workers.slice().sort(function (a, b) { return (ids.indexOf(b.id) >= 0) - (ids.indexOf(a.id) >= 0); }).map(function (w) {
      var x = s.workers[w.id];
      return '<option value="' + esc(w.id) + '"' + (w.id === preId ? ' selected' : '') + '>' + esc(w.name) + (x ? ' — الباقي له ' + fmt(x.left) : '') + '</option>';
    }).join('');
    if (!opts) { alert('سجّل يومية الأول علشان العامل يتضاف'); return; }
    var el = sheet('دفعت لعامل', field('العامل', '<select data-w>' + opts + '</select>')
      + '<div class="azc-2">' + field('المبلغ', '<input data-amt inputmode="decimal" placeholder="0">') + field('التاريخ', '<input type="date" data-date value="' + today() + '">') + '</div>'
      + '<div class="azc-chips"><button type="button" class="azc-chip" data-rest>الباقي له كله</button></div>'
      + field('ملاحظة (اختياري)', '<input data-note maxlength="80" placeholder="مثلاً: كاش في الموقع">'),
      function (root) {
        var amt = num(val(root, '[data-amt]'));
        if (!(amt > 0)) { alert('اكتب المبلغ'); return false; }
        var dd = load();
        dd.pays.push({ id: uid('p'), job: C.job, workerId: val(root, '[data-w]'), date: val(root, '[data-date]') || today(), amount: amt, note: val(root, '[data-note]').trim(), t: Date.now() });
        jobMeta(dd); save(dd);
      });
    el.addEventListener('click', function (e) {
      if (!e.target.closest('[data-rest]')) return;
      var x = stats(load(), C.job, C.rev).workers[val(el, '[data-w]')];
      el.querySelector('[data-amt]').value = x && x.left > 0 ? x.left : '';
    });
  }
  function expForm() {
    var el = sheet('مصروف على الشغلانة', field('المصروف', '<div class="azc-chips" data-ex>' + EXP_PRESETS.map(function (x, i) { return '<button type="button" class="azc-chip' + (i === 0 ? ' on' : '') + '">' + x + '</button>'; }).join('') + '</div>')
      + field('اسم تاني (اختياري)', '<input data-label maxlength="40" placeholder="مثلاً: إيجار سقالة">')
      + '<div class="azc-2">' + field('المبلغ', '<input data-amt inputmode="decimal" placeholder="0">') + field('التاريخ', '<input type="date" data-date value="' + today() + '">') + '</div>',
      function (root) {
        var amt = num(val(root, '[data-amt]'));
        if (!(amt > 0)) { alert('اكتب المبلغ'); return false; }
        var lbl = val(root, '[data-label]').trim() || (root.querySelector('[data-ex] .on') || {}).textContent || 'أخرى';
        var dd = load();
        dd.exps.push({ id: uid('x'), job: C.job, date: val(root, '[data-date]') || today(), amount: amt, label: lbl, t: Date.now() });
        jobMeta(dd); save(dd);
      });
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-ex] .azc-chip'); if (!b) return;
      Array.prototype.forEach.call(b.parentNode.children, function (x) { x.classList.remove('on'); }); b.classList.add('on');
    });
  }
  function workerForm(id) {
    var d = load(), w = worker(d, id); if (!w) return;
    sheet('بيانات العامل', field('الاسم', '<input data-n maxlength="40" value="' + esc(w.name) + '">')
      + field('الصفة', '<select data-r>' + Object.keys(ROLES).map(function (k) { return '<option value="' + k + '"' + (w.role === k ? ' selected' : '') + '>' + ROLES[k] + '</option>'; }).join('') + '</select>')
      + '<div class="azc-2">' + field('اليومية', '<input data-wg inputmode="decimal" value="' + esc(w.wage || '') + '">') + field('التليفون (اختياري)', '<input data-ph inputmode="tel" dir="ltr" value="' + esc(w.phone || '') + '">') + '</div>'
      + '<p class="azc-note">تغيير اليومية هنا بيتطبق على اليوميات الجاية بس — اللي اتسجل قبل كده بيفضل بيوميته.</p>',
      function (root) {
        var dd = load(), x = worker(dd, id);
        x.name = val(root, '[data-n]').trim() || x.name; x.role = val(root, '[data-r]'); x.wage = num(val(root, '[data-wg]')); x.phone = val(root, '[data-ph]').trim();
        save(dd);
      });
  }
  function valueForm() {
    var d = load(), s = stats(d, C.job, C.rev);
    var el = sheet('قيمة الشغلانة', '<p class="azc-note" style="margin-top:0">من فواتير العميل في القسم: <b>' + fmt(C.rev) + ' ' + esc(C.cur) + '</b>. لو الاتفاق مختلف اكتب الرقم هنا.</p>'
      + field('قيمة الشغلانة', '<input data-v inputmode="decimal" value="' + (s.valueManual ? esc(s.value) : '') + '" placeholder="' + esc(fmt(C.rev)) + '">'),
      function (root) {
        var dd = load(), v = val(root, '[data-v]').trim();
        dd.jobs[C.job] = Object.assign(dd.jobs[C.job] || {}, { value: v === '' ? null : num(v) });
        jobMeta(dd); save(dd);
      }, s.valueManual ? '<button type="button" class="azc-btn soft" data-reset>من الفواتير</button>' : '');
    el.addEventListener('click', function (e) {
      if (!e.target.closest('[data-reset]')) return;
      var dd = load(); if (dd.jobs[C.job]) dd.jobs[C.job].value = null; save(dd); closeSheet(); render();
    });
  }
  function jobMeta(dd) { dd.jobs[C.job] = Object.assign(dd.jobs[C.job] || {}, { name: C.name, sec: C.sec, updated: Date.now() }); }

  function onClick(e) {
    var b = e.target.closest('[data-act]'); if (!b || !ov.contains(b)) return;
    var act = b.getAttribute('data-act'), id = b.getAttribute('data-id');
    if (act === 'close') close();
    else if (act === 'day') dayForm(id);
    else if (act === 'pay') payForm(id);
    else if (act === 'exp') expForm();
    else if (act === 'value') valueForm();
    else if (act === 'editWorker') workerForm(id);
    else if (act === 'print') print();
    else if (act === 'del') {
      if (!confirm('تحذف القيد ده؟')) return;
      var d = load(), k = { e: 'entries', p: 'pays', x: 'exps' }[b.getAttribute('data-k')];
      d[k] = d[k].filter(function (o) { return o.id !== id; }); save(d); render();
    }
  }

  // ---------------- الطباعة: كشف يوميات بنفس شكل فواتير أرزقي ----------------
  function sheetHTML() {
    var d = load(), s = stats(d, C.job, C.rev), cur = C.cur;
    var money = function (v) { return fmt(v) + ' ' + esc(cur); };
    var ids = Object.keys(s.workers);
    var sec = 0, body = '';
    function head(t) { return '<h2 class="inv-sec"><span class="n">' + (++sec) + '</span><span>' + t + '</span></h2>'; }
    if (ids.length) {
      body += head('حساب العمال') + '<table class="p-table"><thead><tr><th>العامل</th><th>الصفة</th><th>اليوميات</th><th>المستحق</th><th>اتدفعله</th><th>الباقي له</th></tr></thead><tbody>'
        + ids.map(function (id) { var w = worker(d, id) || {}, x = s.workers[id]; return '<tr><td class="t">' + esc(w.name || '') + '</td><td>' + esc(ROLES[w.role] || '') + '</td><td>' + fmt(x.days) + '</td><td class="money">' + money(x.earned) + '</td><td>' + money(x.paid) + '</td><td class="money">' + (x.left > 0.005 ? money(x.left) : 'خالص') + '</td></tr>'; }).join('')
        + '</tbody><tfoot><tr><td colspan="2">الإجمالي</td><td>' + fmt(s.days) + '</td><td>' + money(s.wages) + '</td><td>' + money(s.paidOut) + '</td><td>' + money(s.owed) + '</td></tr></tfoot></table>';
    }
    var es = d.entries.filter(function (e) { return e.job === C.job; }).sort(function (a, b) { return String(a.date).localeCompare(String(b.date)) || (a.t || 0) - (b.t || 0); });
    if (es.length) body += head('اليوميات') + '<table class="p-table"><thead><tr><th>التاريخ</th><th>العامل</th><th>الأيام</th><th>اليومية</th><th>الإجمالي</th><th>ملاحظة</th></tr></thead><tbody>'
      + es.map(function (e) { var w = worker(d, e.workerId) || {}; return '<tr><td>' + esc(fdate(e.date)) + '</td><td class="t">' + esc(w.name || '') + '</td><td>' + fmt(e.days) + '</td><td>' + money(e.wage) + '</td><td class="money">' + money(r2(num(e.days) * num(e.wage))) + '</td><td>' + esc(e.note || '') + '</td></tr>'; }).join('') + '</tbody></table>';
    var ps = d.pays.filter(function (p) { return p.job === C.job; });
    if (ps.length) body += head('الفلوس اللي اتدفعت للعمال') + '<table class="p-table"><thead><tr><th>التاريخ</th><th>العامل</th><th>المبلغ</th><th>ملاحظة</th></tr></thead><tbody>'
      + ps.map(function (p) { var w = worker(d, p.workerId) || {}; return '<tr><td>' + esc(fdate(p.date)) + '</td><td class="t">' + esc(w.name || '') + '</td><td class="money">' + money(p.amount) + '</td><td>' + esc(p.note || '') + '</td></tr>'; }).join('') + '</tbody></table>';
    var xs = d.exps.filter(function (x) { return x.job === C.job; });
    if (xs.length) body += head('مصروفات تانية') + '<table class="p-table"><thead><tr><th>التاريخ</th><th>المصروف</th><th>المبلغ</th></tr></thead><tbody>'
      + xs.map(function (x) { return '<tr><td>' + esc(fdate(x.date)) + '</td><td class="t">' + esc(x.label || '') + '</td><td class="money">' + money(x.amount) + '</td></tr>'; }).join('') + '</tbody></table>';
    if (!body) body = '<p style="text-align:center;color:#476966">لسه مفيش يوميات مسجلة.</p>';
    if (!window.ArzaqiInvoice) return '<div class="az-inv">' + body + '</div>';
    return window.ArzaqiInvoice.render({
      docLabel: 'كشف يوميات العمال', date: fdate(today()), number: '', billable: false, noWarranty: true, signs: ['توقيع الصنايعي'],
      client: { name: C.name, phone: C.phone, address: C.address }, chips: C.sec ? ['<span class="inv-chip navy">القسم: <b>' + esc(C.sec) + '</b></span>'] : [],
      bodyHTML: body, money: money, boxTitle: 'ربح الشغلانة',
      totals: { lines: [['قيمة الشغلانة' + (s.valueManual ? '' : ' (من الفواتير)'), s.value], ['أجور العمال', s.wages, '-'], ['مصروفات تانية', s.exps, '-']], total: s.profit, noSum: true },
      netLabel: 'صافي ربحك'
    });
  }
  function print() {
    var host = document.getElementById('azCrewPrint');
    if (!host) { host = document.createElement('div'); host.id = 'azCrewPrint'; document.body.appendChild(host); }
    host.innerHTML = sheetHTML();
    var html = document.documentElement, prevTitle = document.title;
    html.classList.add('azc-printing');
    document.title = 'كشف يوميات العمال — ' + (C.name || '');
    var done = function () { html.classList.remove('azc-printing'); document.title = prevTitle; window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    // جوه تطبيق الأندرويد: الطباعة بتعدّي على جسر التطبيق (نفس اللي بيطبع فواتير الأقسام)
    var bridges = ['HesabatyApp', 'HesabatiPlumbingApp', 'HesabatiHvacApp', 'HFloorApp', 'PlasterApp'];
    for (var i = 0; i < bridges.length; i++) {
      var b = window[bridges[i]];
      if (b && typeof b.print === 'function') { try { b.print(document.title); setTimeout(done, 4000); return; } catch (e) {} }
    }
    setTimeout(function () { window.print(); setTimeout(done, 1500); }, 60);
  }

  // التصميم
  if (!document.querySelector('link[data-az-crew]')) {
    var l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = BASE + 'crew.css'; l.setAttribute('data-az-crew', '1');
    (document.head || document.documentElement).appendChild(l);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch); else watch();

  window.ArzoqiCrew = { open: open, close: close, stats: function (job, rev) { return stats(load(), job, rev); }, sheetHTML: function (c) { C = c; return sheetHTML(); }, KEY: KEY };
})();
