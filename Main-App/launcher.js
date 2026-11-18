/*
 * حساباتي — التطبيق الموحد (Launcher)
 *
 * طريقة الدمج: كل مهنة بتتفتح كمستند كامل مستقل جوه <iframe> من نفس الأصل (same-origin)
 * من فولدر نسختها في Trade-Modules/. اللانشر:
 *   - ما بيعدلش أي ملف من ملفات التطبيقات، وما بيحقنش أي كود جواها.
 *   - ما بيقراش ولا بيكتب أي بيانات خاصة بالتطبيقات (كل تطبيق محتفظ بمفاتيح التخزين بتاعته).
 *   - بيستخدم مفاتيح خاصة بيه بس: hisabati_super_*
 *
 * زرار الرجوع: التطبيقات بتستخدم history.pushState لنوافذها، والـ iframe بيشارك
 * نفس سجل التنقل (joint session history) مع الصفحة الأم. فاللانشر بيضيف خطوة واحدة
 * {hs:'app'} عند فتح المهنة؛ الرجوع بيقفل نوافذ التطبيق الأول، وبعدها بيرجع لقائمة المهن.
 */
(function () {
  'use strict';

  const LAUNCHER_VERSION = '1.1.0'; // داخلي بس — مش بيظهر للمستخدم
  const LAST_KEY = 'hisabati_super_last_v1';
  const THEME_KEY = 'hisabati_super_theme_v1';
  const TRADES = window.HISABATI_TRADES || [];

  const $ = id => document.getElementById(id);
  const byId = id => TRADES.find(t => t.id === id) || null;
  const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const tradeBase = t => new URL('../Trade-Modules/' + t.dir + '/', location.href).href;
  const tradeIcon = t => '../Trade-Modules/' + t.dir + '/icons/icon-192.png';

  let current = null;   // المهنة المفتوحة
  let frame = null;     // الـ iframe الحالي
  let homing = null;    // حالة الرجوع للقائمة (لو شغالة)

  /* ---------------- الرئيسية ---------------- */
  function renderGrid() {
    const last = lsGet(LAST_KEY);
    $('tradeGrid').innerHTML = TRADES.map(t => {
      const style = `--c:${esc(t.color)}`;
      if (!t.available) {
        return `<button class="trade" type="button" disabled style="${style}" aria-disabled="true">
          <div class="trade-icon" aria-hidden="true">${esc(t.name.replace(/^ال/, '').slice(0, 1))}</div>
          <div class="trade-name">${esc(t.name)}</div>
          <div class="trade-desc">${esc(t.desc)}</div>
          <div class="trade-meta"><span class="pill">قريباً</span></div>
        </button>`;
      }
      return `<button class="trade" type="button" data-trade="${esc(t.id)}" style="${style}">
        <div class="trade-icon"><img src="${esc(tradeIcon(t))}" alt="" width="52" height="52" loading="lazy"></div>
        <div class="trade-name">${esc(t.name)}</div>
        <div class="trade-desc">${esc(t.desc)}</div>
        <div class="trade-meta">
          ${last === t.id ? '<span class="pill last">آخر استخدام</span>' : ''}
        </div>
      </button>`;
    }).join('');
  }

  /* ---------------- فتح المهنة ---------------- */
  function openTrade(id, opts) {
    const push = !opts || opts.push !== false;
    const t = byId(id);
    if (!t || !t.available) return;
    if (current && current.id === id && frame) { showRunner(); return; }

    destroyFrame();
    current = t;
    if (push) history.pushState({ hs: 'app', id: t.id }, '', '#' + t.id);

    $('barName').textContent = t.name;
    $('barIcon').src = tradeIcon(t);
    document.title = t.full;
    $('frameError').hidden = true;
    $('frameLoading').hidden = false;

    // iframe جديد لكل فتح (التحميل الأول لـ iframe جديد ما بيضيفش خطوة في سجل الرجوع)
    frame = document.createElement('iframe');
    frame.title = t.full;
    frame.setAttribute('allow', 'clipboard-read; clipboard-write; web-share; fullscreen');
    frame.addEventListener('load', onFrameLoad);
    frame.src = tradeBase(t);
    $('frameHost').appendChild(frame);

    showRunner();
    lsSet(LAST_KEY, t.id);
  }

  function onFrameLoad() {
    if (!frame) return;
    let ok = false;
    try {
      const d = frame.contentDocument;
      ok = !!(d && d.body && d.URL && d.URL !== 'about:blank' && d.body.childElementCount > 0);
    } catch (e) { ok = false; } // صفحة خطأ المتصفح (أوفلاين) بتبقى من أصل مختلف
    $('frameLoading').hidden = true;
    $('frameError').hidden = ok;
    if (homing) homing.onStep(); // لو بنرجع وخطوة الرجوع نقلت لصفحة تانية جوه التطبيق
    else if (ok) attachFramePop();
  }

  // بنسمع (من غير ما نعدل حاجة) على رجوع جوه التطبيق — بنحتاجه بس وقت الرجوع للقائمة
  function attachFramePop() {
    try { frame.contentWindow.addEventListener('popstate', () => { if (homing) homing.onStep(); }); } catch (e) {}
  }

  function showRunner() {
    $('runner').hidden = false;
    document.body.dataset.view = 'app';
  }

  function destroyFrame() {
    if (frame) { frame.removeEventListener('load', onFrameLoad); frame.remove(); frame = null; }
  }

  function closeTrade() {
    destroyFrame();
    finishHoming();
    const was = current;
    current = null;
    $('runner').hidden = true;
    document.body.dataset.view = 'home';
    document.title = 'حساباتي — كل المهن';
    renderGrid();
    if (was) { const b = document.querySelector(`[data-trade="${was.id}"]`); if (b) b.focus({ preventScroll: false }); }
  }

  /* ---------------- الرجوع للقائمة ---------------- */
  // عدد خطوات الرجوع = خطوات التطبيق جوه الـ iframe + خطوة اللانشر
  function frameDepth() {
    try {
      const nav = frame && frame.contentWindow && frame.contentWindow.navigation;
      if (nav && nav.currentEntry && typeof nav.currentEntry.index === 'number' && nav.currentEntry.index >= 0) return nav.currentEntry.index;
    } catch (e) {}
    return null;
  }

  function goHome() {
    if (!current) return;
    const st = history.state;
    if (!st || st.hs !== 'app') { closeTrade(); return; } // مفيش خطوة للانشر (مثلاً بعد إعادة تحميل)
    if (homing) return;

    // بنخفي التطبيق فوراً علشان الإحساس يبقى سريع، والسجل بيتظبط في الخلفية
    $('runner').hidden = true;
    document.body.dataset.view = 'home';

    const depth = frameDepth();
    let steps = 0;
    const MAX_STEPS = 80;
    const stepBack = () => {
      if (!homing) return;
      if (++steps > MAX_STEPS) { closeTrade(); return; }
      clearTimeout(homing.timer);
      homing.timer = setTimeout(() => { // أمان: لو مفيش استجابة نقفل مباشرة
        if (homing) closeTrade();
      }, 1500);
      history.back();
    };
    homing = {
      timer: 0,
      // اتنفذت خطوة رجوع جوه التطبيق ولسه ما وصلناش للقائمة → خطوة كمان
      onStep() { setTimeout(() => { if (homing && history.state && history.state.hs === 'app') stepBack(); }, 0); }
    };

    if (depth !== null) {
      homing.timer = setTimeout(() => { if (homing) closeTrade(); }, 2000);
      history.go(-(depth + 1)); // خطوة واحدة مجمعة (Navigation API)
    } else {
      stepBack(); // متصفحات من غير Navigation API: خطوة بخطوة
    }
  }

  function finishHoming() {
    if (homing) { clearTimeout(homing.timer); homing = null; }
  }

  window.addEventListener('popstate', e => {
    const s = e.state;
    if (s && s.hs === 'menu') { if (!current) showDrawer(); return; }
    hideDrawer();
    if (s && s.hs === 'app') {
      if (homing) return;
      if (!current || current.id !== s.id) openTrade(s.id, { push: false });
      else showRunner();
    } else {
      closeTrade();
    }
  });

  // تغيير الرابط يدوياً أو من اختصار وهو مفتوح: Main-App/#plumbing
  window.addEventListener('hashchange', () => {
    if (homing) return;
    const id = decodeURIComponent(location.hash.slice(1));
    const t = byId(id);
    if (t && t.available) {
      if (!current || current.id !== id) {
        history.replaceState({ hs: 'app', id }, '', '#' + id);
        openTrade(id, { push: false });
      }
    } else if (!id && current) {
      history.replaceState({ hs: 'home' }, '', location.pathname + location.search);
      closeTrade();
    }
  });

  /* ---------------- القائمة: التعريف بالأقسام ---------------- */
  const chev = '<svg class="dt-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
  function renderDrawer() {
    $('drawerTrades').innerHTML = TRADES.map(t => {
      const style = `--c:${esc(t.color)}`;
      if (!t.available) {
        return `<div class="dt soon" style="${style}"><div class="dt-sum" style="display:flex;align-items:center;gap:10px;padding:11px 12px">
          <div class="dt-icon" aria-hidden="true">${esc(t.name.replace(/^ال/, '').slice(0, 1))}</div>
          <div class="dt-text"><strong>${esc(t.name)}</strong><small>${esc(t.about)}</small></div>
          <span class="soon-tag">قريباً</span></div></div>`;
      }
      return `<details class="dt" style="${style}">
        <summary>
          <div class="dt-icon"><img src="${esc(tradeIcon(t))}" alt="" width="40" height="40" loading="lazy"></div>
          <div class="dt-text"><strong>${esc(t.name)}</strong><small>${esc(t.desc)}</small></div>
          ${chev}
        </summary>
        <div class="dt-body">
          <p>${esc(t.about)}</p>
          <ul>${t.features.map(f => `<li>${esc(f)}</li>`).join('')}</ul>
          <button class="dt-open" type="button" data-open="${esc(t.id)}">افتح قسم ${esc(t.name)}</button>
        </div>
      </details>`;
    }).join('');
  }
  let drawerReturnFocus = null;
  function showDrawer() {
    const d = $('drawer');
    if (d.classList.contains('open')) return;
    drawerReturnFocus = document.activeElement;
    d.classList.add('open'); d.setAttribute('aria-hidden', 'false');
    $('menuBtn').setAttribute('aria-expanded', 'true');
    setTimeout(() => { const b = d.querySelector('.drawer-head [data-close]'); if (b) b.focus(); }, 60);
  }
  function hideDrawer() {
    const d = $('drawer');
    if (!d.classList.contains('open')) return;
    d.classList.remove('open'); d.setAttribute('aria-hidden', 'true');
    $('menuBtn').setAttribute('aria-expanded', 'false');
    if (drawerReturnFocus && drawerReturnFocus.focus) drawerReturnFocus.focus();
  }
  // فتح القائمة بيضيف خطوة في سجل الرجوع علشان زرار الرجوع في الموبايل يقفلها
  function openDrawer() {
    if (current) return;
    history.pushState({ hs: 'menu' }, '', location.pathname + location.search);
    showDrawer();
  }
  function closeDrawer() {
    if (history.state && history.state.hs === 'menu') history.back(); // popstate بيقفلها
    else hideDrawer();
  }
  $('menuBtn').addEventListener('click', openDrawer);
  $('drawer').addEventListener('click', e => {
    if (e.target.closest('[data-close]')) { closeDrawer(); return; }
    const b = e.target.closest('[data-open]');
    if (!b) return;
    const id = b.dataset.open;
    // خطوة القائمة بتتبدل بخطوة القسم: الرجوع من القسم يروح للرئيسية على طول
    if (history.state && history.state.hs === 'menu') history.replaceState({ hs: 'app', id }, '', '#' + id);
    else history.pushState({ hs: 'app', id }, '', '#' + id);
    drawerReturnFocus = null;
    hideDrawer();
    openTrade(id, { push: false });
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('drawer').classList.contains('open')) closeDrawer(); });
  renderDrawer();

  /* ---------------- الثيم ---------------- */
  function toggleTheme() {
    const root = document.documentElement;
    const cur = root.getAttribute('data-theme') ||
      (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const next = cur === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    lsSet(THEME_KEY, next);
  }

  /* ---------------- تشغيل ---------------- */
  $('tradeGrid').addEventListener('click', e => {
    const b = e.target.closest('[data-trade]');
    if (b) openTrade(b.dataset.trade);
  });
  $('homeBtn').addEventListener('click', goHome);
  $('themeBtn').addEventListener('click', toggleTheme);
  $('retryBtn').addEventListener('click', () => {
    const t = current;
    if (!t) return;
    destroyFrame(); current = null;
    openTrade(t.id, { push: false });
  });

  renderGrid();

  // رابط مباشر لمهنة: Main-App/#electrical (وكمان اختصارات أيقونة التطبيق)
  const startId = decodeURIComponent(location.hash.slice(1));
  const st = history.state;
  if (st && st.hs === 'menu') {
    history.replaceState({ hs: 'home' }, '', location.pathname + location.search);
  } else if (st && st.hs === 'app' && byId(st.id)) {
    openTrade(st.id, { push: false }); // إعادة تحميل الصفحة وهي على مهنة
  } else {
    history.replaceState({ hs: 'home' }, '', location.pathname + location.search);
    if (startId && byId(startId) && byId(startId).available) openTrade(startId);
  }

  // Service Worker خاص باللانشر بس — نطاقه Main-App/ فما بيلمسش طلبات التطبيقات
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js', { scope: './' }).catch(() => {});
    });
  }

  // للاختبارات الآلية
  window.__hisabatiLauncher = { version: LAUNCHER_VERSION, openTrade, goHome, openDrawer, closeDrawer, get current() { return current && current.id; }, get frame() { return frame; } };
})();
