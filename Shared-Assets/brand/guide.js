/*
 * أرزقي | Arzoqi — «طريقة الاستخدام»: شرح تفاعلي لكل قسم على الشاشة نفسها.
 *
 * بيضلّم الشاشة ويظلل الزرار/الخانة الحقيقية، وتحتها كارت: «الخطوة 3 من 12» + العنوان + الوصف + التالي/السابق/تخطي.
 *  - الجزء الأول: من أول ما تفتح القسم لحد ما تطلّع الفاتورة PDF (بمثال بيتعمل قدامك خطوة بخطوة).
 *  - بعده: «ابدأ استخدام التطبيق» أو «كمّل شرح باقي الأجزاء» (الجزء التاني).
 *  - بيظهر لوحده أول مرة تفتح فيها القسم بس، ومن «المزيد ← طريقة الاستخدام» في أي وقت.
 *  - المثال مش بيأثر على بياناتك: قبل ما الشرح يبدأ بناخد نسخة من بيانات القسم، وفي الآخر بنرجّعها زي ما كانت بالظبط.
 *    ولو التطبيق اتقفل في نص الشرح، أول ما القسم يتفتح تاني بيرجّع البيانات قبل ما أي حاجة تتحمّل.
 *  - كل شرح ليه رقم إصدار: لو القسم اتحدّث وضفنا خطوات جديدة (since)، اللي شاف الشرح قبل كده بيظهرله «الجديد» بس.
 *
 * التعريف (في ملف guide-steps.js بتاع كل قسم):
 *   ArzoqiGuide.define({ id, name, version, keys: ['prefix_'], more: '#view-more', home: [actions], steps: [
 *     { t: 'العنوان', d: 'الوصف', el: 'selector' | function, pre: [actions], act: [actions], part: 1|2, since: 1 } ] })
 *   actions: ['click', sel] · ['fill', sel, value] · ['select', sel, value] · ['check', sel] · ['eval', fn] · ['wait', ms]
 *            · ['back'] (يقفل آخر نافذة/صفحة) · ['unwind'] (يقفل كل النوافذ ويرجع للقسم — من غير ما يخرج منه)
 *   pre بيتنفذ قبل ما الخطوة تظهر (يجهّز الشاشة)، و act بيتنفذ لما تدوس «التالي» (يعمل اللي الخطوة بتشرحه).
 * © 2026 أحمد حسن عبدالله
 */
(function () {
  'use strict';
  var STATE_KEY = 'arzaqi_guide_v1', SNAP_KEY = 'arzaqi_guide_snap';
  var EXTRA_KEYS = ['arzaqi_inv_extra_v1'];
  function readJSON(store, k, d) { try { var v = JSON.parse(store.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } }
  function writeJSON(store, k, v) { try { store.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  var here = location.pathname.replace(/index\.html$/, '');

  // ---------- استرجاع البيانات لو الشرح اتقطع (بيتنفذ قبل ما سكريبتات القسم تقرا التخزين) ----------
  function restore(snap) {
    if (!snap || !snap.data) return false;
    var keep = snap.data, pre = snap.prefixes || [], i, k, del = [];
    for (i = 0; i < localStorage.length; i++) { k = localStorage.key(i); if (owned(k, pre) && !(k in keep)) del.push(k); }
    del.forEach(function (k) { localStorage.removeItem(k); });
    Object.keys(keep).forEach(function (k) { try { localStorage.setItem(k, keep[k]); } catch (e) {} });
    return true;
  }
  function owned(k, pre) { return EXTRA_KEYS.indexOf(k) >= 0 || pre.some(function (p) { return k.indexOf(p) === 0; }); }
  function pendingSnap() {
    var s = readJSON(localStorage, SNAP_KEY, null) || readJSON(sessionStorage, SNAP_KEY, null);
    return s && s.path === here ? s : null;
  }
  function clearSnap() { try { localStorage.removeItem(SNAP_KEY); } catch (e) {} try { sessionStorage.removeItem(SNAP_KEY); } catch (e) {} }
  (function () { var s = pendingSnap(); if (s) { restore(s); clearSnap(); } })();

  // ---------- الحالة ----------
  function seen() { return readJSON(localStorage, STATE_KEY, {}) || {}; }
  function markSeen(def) { var all = seen(); all[def.id] = { v: def.version, at: new Date().toISOString() }; writeJSON(localStorage, STATE_KEY, all); }
  var DEF = null, run = null;

  // ---------- أدوات ----------
  function $(sel) { if (typeof sel === 'function') { try { return sel(); } catch (e) { return null; } } try { return document.querySelector(sel); } catch (e) { return null; } }
  // ظاهر فعلاً: له مقاس، ومش مخفي، ومش جوه لوحة ثابتة (نافذة/شيت) مقفولة برا الشاشة أو شفافة
  function visible(el) {
    if (!el || !el.getBoundingClientRect) return false;
    var r = el.getBoundingClientRect(); if (!(r.width > 0 && r.height > 0) || getComputedStyle(el).visibility === 'hidden') return false;
    for (var x = el; x && x.nodeType === 1 && x !== document.body; x = x.parentElement) {
      var c = getComputedStyle(x); if (c.display === 'none' || +c.opacity === 0) return false;
      if (c.position === 'fixed') { var q = x.getBoundingClientRect(); if (q.top >= innerHeight - 2 || q.bottom <= 2 || q.left >= innerWidth - 2 || q.right <= 2) return false; }
    }
    return true;
  }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function waitFor(sel, ms) {
    var end = Date.now() + (ms || 4000);
    return new Promise(function (res) { (function tick() { var el = $(sel); if (el && visible(el)) return res(el); if (Date.now() > end) return res(null); setTimeout(tick, 80); })(); });
  }
  function setVal(el, v) {
    var proto = el.tagName === 'SELECT' ? HTMLSelectElement.prototype : el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    var d = Object.getOwnPropertyDescriptor(proto, 'value'); if (d && d.set) d.set.call(el, v); else el.value = v;
    el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
  }
  function doActions(list) {
    var chain = Promise.resolve();
    (list || []).forEach(function (a) {
      chain = chain.then(function () {
        var t = a[0];
        if (t === 'wait') return sleep(a[1] || 300);
        if (t === 'unwind') return unwind();
        if (t === 'back') return backOnce().then(function () { return sleep(250); });
        if (t === 'eval') { try { a[1](); } catch (e) { warn('eval: ' + e.message); } return sleep(350); }
        return waitFor(a[1], 4000).then(function (el) {
          if (!el) { warn('مش لاقي: ' + a[1]); return; }
          if (t === 'click') el.click();
          else if (t === 'fill' || t === 'select') setVal(el, a[2]);
          else if (t === 'check') { if (!el.checked) el.click(); }
          return sleep(t === 'click' ? 420 : 120);
        });
      });
    });
    return chain;
  }
  // رجوع خطوة واحدة في طبقات القسم (نافذة/صفحة) ومستني لحد ما يخلص — مش بيخرج برا القسم أبداً
  function layered() {
    if (DEF && typeof DEF.layered === 'function') { try { return !!DEF.layered(); } catch (e) { return false; } }
    return !!(history.state && (history.state.cw || history.state.layer || history.state.page || history.state.sheet || history.state.az));
  }
  function backOnce() {
    if (!layered()) return Promise.resolve(false);
    return new Promise(function (res) {
      var done = false, fin = function () { if (done) return; done = true; window.removeEventListener('popstate', fin); setTimeout(function () { res(true); }, 120); };
      window.addEventListener('popstate', fin); history.back(); setTimeout(fin, 700);
    });
  }
  function unwind() { var n = 0; return (function loop() { return layered() && n++ < 10 ? backOnce().then(loop) : sleep(150); })(); }
  function warn(m) { if (run) run.misses.push(m); if (window.console) console.warn('[Arzoqi guide] ' + m); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // ---------- الواجهة ----------
  var ui = null;
  function buildUI() {
    if (ui) return ui;
    var root = document.createElement('div'); root.className = 'azg-root'; root.setAttribute('dir', 'rtl');
    root.innerHTML = '<div class="azg-block"></div><div class="azg-spot"></div><div class="azg-card" role="dialog" aria-live="polite"></div>';
    document.body.appendChild(root);
    ui = { root: root, spot: root.querySelector('.azg-spot'), card: root.querySelector('.azg-card') };
    root.addEventListener('click', function (e) { var b = e.target.closest('[data-azg]'); if (!b) return; e.preventDefault(); e.stopPropagation(); onBtn(b.getAttribute('data-azg')); }, true);
    window.addEventListener('resize', place); window.addEventListener('scroll', place, true);
    return ui;
  }
  function place() {
    if (!run || !ui) return;
    var el = run.el, card = ui.card, vh = window.innerHeight, vw = window.innerWidth;
    if (el && visible(el)) {
      var r = el.getBoundingClientRect(), pad = 6;
      var top = Math.max(r.top - pad, 4), left = Math.max(r.left - pad, 4), w = Math.min(r.width + pad * 2, vw - 8), h = Math.min(r.height + pad * 2, vh - 8);
      ui.spot.style.cssText = 'top:' + top + 'px;left:' + left + 'px;width:' + w + 'px;height:' + h + 'px';
      ui.root.classList.remove('azg-center');
      var ch = card.offsetHeight || 200, below = vh - (r.bottom + pad), above = r.top - pad;
      var ct = below >= ch + 16 || below >= above ? r.bottom + pad + 12 : top - ch - 12;
      card.style.top = Math.max(12, Math.min(ct, vh - ch - 12)) + 'px'; // الكارت دايماً جوه الشاشة
    } else {
      ui.spot.style.cssText = 'top:50%;left:50%;width:0;height:0';
      ui.root.classList.add('azg-center'); card.style.top = '';
    }
  }
  function render() {
    var s = run.steps[run.i], n = run.steps.length, isLast = run.i === n - 1, end = run.endPart1 === run.i;
    var back = run.i > 0 && !(run.steps[run.i - 1].act || []).length && !(s.pre || []).length;
    var label = run.whatsNew ? 'الجديد في القسم' : (s.part === 2 ? 'باقي الأجزاء' : 'من البداية لحد الفاتورة PDF');
    var html = '<div class="azg-top"><span class="azg-sec">' + esc(DEF.name) + ' · ' + label + '</span><button type="button" class="azg-skip" data-azg="skip">تخطي ✕</button></div>'
      + '<div class="azg-count">الخطوة ' + (run.i + 1) + ' من ' + n + '</div><div class="azg-bar"><i style="width:' + Math.round((run.i + 1) / n * 100) + '%"></i></div>'
      + '<h3 class="azg-t">' + esc(s.t) + '</h3><p class="azg-d">' + esc(s.d).replace(/\n/g, '<br>') + '</p>';
    if (end && run.hasPart2) html += '<div class="azg-btns azg-two"><button type="button" class="azg-btn ghost" data-azg="finish">ابدأ استخدام التطبيق</button><button type="button" class="azg-btn" data-azg="next">كمّل شرح باقي الأجزاء ←</button></div>';
    else html += '<div class="azg-btns">' + (back ? '<button type="button" class="azg-btn ghost" data-azg="prev">→ السابق</button>' : '<span></span>')
      + '<button type="button" class="azg-btn" data-azg="' + (isLast || end ? 'finish' : 'next') + '">' + (isLast || end ? 'تمام، ابدأ الاستخدام ✓' : 'التالي ←') + '</button></div>';
    ui.card.innerHTML = html;
    place();
  }
  function show(i) {
    run.i = i; run.busy = true;
    var s = run.steps[i];
    ui.card.classList.add('azg-wait');
    return doActions(s.pre).then(function () { return s.el ? waitFor(s.el, 3500) : null; }).then(function (el) {
      if (!run) return;
      if (s.el && !el) warn('الخطوة «' + s.t + '»: العنصر مش ظاهر');
      run.el = el;
      if (el) {
        try { el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }); } catch (e) { try { el.scrollIntoView(); } catch (e2) {} }
        // احتياطي: لو لسه برا الشاشة (بعض الصفحات scrollIntoView مش بيحرّكها) نحرّك الصفحة نفسها
        var q = el.getBoundingClientRect();
        if (q.bottom > innerHeight || q.top < 0) { try { window.scrollBy({ top: q.top + Math.min(q.height, innerHeight) / 2 - innerHeight / 2, behavior: 'instant' }); } catch (e) { window.scrollBy(0, q.top - innerHeight / 3); } }
      }
      return sleep(el ? 260 : 0);
    }).then(function () { if (!run) return; ui.card.classList.remove('azg-wait'); render(); run.shown.push(i); run.busy = false; });
  }
  function onBtn(a) {
    if (!run || run.busy) return;
    if (a === 'skip' || a === 'finish') return finish(a === 'finish');
    if (a === 'prev') return show(run.i - 1);
    if (a === 'next') {
      var s = run.steps[run.i]; run.busy = true; ui.card.classList.add('azg-wait');
      doActions(s.act).then(function () { if (run) show(run.i + 1); });
    }
  }

  // ---------- البداية والنهاية ----------
  function start(opts) {
    if (!DEF || run) return false;
    opts = opts || {};
    var all = DEF.steps.filter(function (s) { return !opts.only || opts.only(s); });
    if (!all.length) return false;
    // نسخة من بيانات القسم قبل المثال
    var data = {}, pre = DEF.keys || [], i, k;
    for (i = 0; i < localStorage.length; i++) { k = localStorage.key(i); if (owned(k, pre) && k !== SNAP_KEY) data[k] = localStorage.getItem(k); }
    var snap = { path: here, prefixes: pre, data: data, at: new Date().toISOString() };
    // النسخة الكبيرة (بيانات كتير) بتتحفظ في sessionStorage علشان ما تزحمش مساحة القسم وهو بيحفظ المثال؛
    // وفي كل الأحوال فيه نسخة في الذاكرة هي اللي بترجع البيانات في آخر الشرح
    var big = JSON.stringify(data).length > 1500000;
    if (big ? !writeJSON(sessionStorage, SNAP_KEY, snap) && !writeJSON(localStorage, SNAP_KEY, snap) : !writeJSON(localStorage, SNAP_KEY, snap) && !writeJSON(sessionStorage, SNAP_KEY, snap)) {
      if (window.console) console.warn('[Arzoqi guide] مفيش مساحة لنسخة احتياطية مؤقتة — النسخة في الذاكرة بس');
    }
    var p1 = all.filter(function (s) { return (s.part || 1) === 1; }), p2 = all.filter(function (s) { return s.part === 2; });
    run = { steps: p1.concat(p2), i: 0, el: null, busy: true, misses: [], shown: [], endPart1: p2.length && p1.length ? p1.length - 1 : -1, hasPart2: !!p2.length && !!p1.length, whatsNew: !!opts.whatsNew, snap: snap };
    buildUI(); ui.root.classList.add('azg-on'); document.documentElement.classList.add('azg-lock');
    doActions(DEF.home).then(function () { show(0); });
    return true;
  }
  function finish(completed) {
    if (!run) return;
    var r = run; run = null;
    markSeen(DEF);
    ui.root.classList.remove('azg-on'); document.documentElement.classList.remove('azg-lock');
    // رجّع بيانات القسم زي ما كانت قبل المثال، وافتح القسم من جديد على الرئيسية
    var changed = false, pre = r.snap.prefixes, i, k, now = {};
    for (i = 0; i < localStorage.length; i++) { k = localStorage.key(i); if (owned(k, pre) && k !== SNAP_KEY) now[k] = localStorage.getItem(k); }
    var a = Object.keys(now), b = Object.keys(r.snap.data);
    changed = a.length !== b.length || a.some(function (key) { return r.snap.data[key] !== now[key]; });
    restore(r.snap);
    window.__azgLast = { completed: !!completed, misses: r.misses, shown: r.shown.length, total: r.steps.length, changed: changed };
    // النسخة بتفضل محفوظة لحد الفتحة الجاية: لو القسم حفظ حاجة وهو بيقفل، أول سطر في الصفحة بيرجّع البيانات تاني قبل أي حاجة
    if (window.__azgNoReload) clearSnap(); else location.reload();
  }

  // ---------- «طريقة الاستخدام» في المزيد ----------
  function injectMore() {
    if (!DEF || !DEF.more) return;
    var box = $(DEF.more); if (!box || box.querySelector('.azg-more')) return;
    var card = document.createElement('div'); card.className = 'azg-more';
    card.innerHTML = '<div class="azg-more-ic">؟</div><div class="azg-more-tx"><b>طريقة الاستخدام</b><small>شرح خطوة بخطوة على الشاشة: من أول القسم لحد الفاتورة PDF وباقي الأجزاء — من غير ما يغيّر بياناتك</small></div><button type="button" class="azg-more-btn">ابدأ الشرح</button>';
    card.querySelector('button').addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); start(); });
    if (DEF.moreAfter) { var ref = box.querySelector(DEF.moreAfter); if (ref) { ref.parentNode.insertBefore(card, ref.nextSibling); return; } }
    box.insertBefore(card, box.firstChild);
  }
  function auto() {
    if (!DEF) return;
    var off = false; try { off = localStorage.getItem('arzaqi_guide_off') === '1'; } catch (e) {}
    // الاختبارات الآلية مش بيظهرلها الشرح لوحده (إلا لو طالباه)
    if (off || (navigator.webdriver && !readJSON(localStorage, 'arzaqi_guide_test', null))) return;
    var rec = seen()[DEF.id];
    if (!rec) start();
    else if ((rec.v || 0) < DEF.version) {
      var since = rec.v || 0;
      if (!start({ only: function (s) { return (s.since || 1) > since; }, whatsNew: true })) markSeen(DEF);
    }
  }

  window.ArzoqiGuide = {
    define: function (def) {
      DEF = def; DEF.version = DEF.version || 1;
      var go = function () {
        injectMore();
        new MutationObserver(function () { injectMore(); }).observe(document.body, { childList: true, subtree: true });
        setTimeout(auto, DEF.delay || 900);
      };
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
    },
    start: start, finish: finish,
    get running() { return !!run; },
    get step() { return run ? { i: run.i, total: run.steps.length, title: run.steps[run.i].t, el: !!run.el, busy: run.busy, endPart1: run.endPart1 } : null; },
    get def() { return DEF; },
    next: function () { onBtn('next'); }, skip: function () { onBtn('skip'); }
  };
})();
