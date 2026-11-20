/*
 * أرزقي — الواجهة الرئيسية
 *
 * كل قسم بيتفتح كمستند كامل جوه <iframe> من فولدره في Trade-Modules/ (نفس الأصل).
 * الواجهة دي ما بتعدلش أي ملف من ملفات الأقسام ولا بتحقن كود جواها.
 * بيانات الأقسام بتتقرا/تتكتب بس لما المستخدم يطلب نسخة احتياطية أو استرجاع (backup.js).
 *
 * زرار الرجوع: الأقسام بتستخدم history.pushState لنوافذها، والـ iframe بيشارك سجل التنقل
 * مع الصفحة. فبنضيف خطوة {hs:'app'} عند فتح القسم، وخطوة {hs:'layer'} عند فتح القائمة أو الحساب.
 */
(function () {
  'use strict';

  const LAUNCHER_VERSION = '2.0.0'; // داخلي بس — مش بيظهر للمستخدم
  const LAST_KEY = 'hisabati_super_last_v1';
  const THEME_KEY = 'hisabati_super_theme_v1';
  const TRADES = window.HISABATI_TRADES || [];
  const CFG = window.HISABATI_CONFIG || {};
  const Cloud = window.HisabatiCloud;
  const Backup = window.HisabatiBackup;

  const $ = id => document.getElementById(id);
  const byId = id => TRADES.find(t => t.id === id) || null;
  const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = (n, cls) => `<svg${cls ? ` class="${cls}"` : ''} aria-hidden="true"><use href="#i-${n}"/></svg>`;

  const tradeBase = t => new URL('../Trade-Modules/' + t.dir + '/', location.href).href;
  const tradeIcon = t => '../Trade-Modules/' + t.dir + '/icons/icon-192.png';
  const initial = t => esc(t.name.replace(/^ال/, '').slice(0, 1));

  // جوه تطبيق الأندرويد المستقل: كل قسم بيتفتح كصفحة كاملة (مش iframe) علشان طباعة أندرويد
  // تطبع فاتورة القسم نفسها، والتطبيق بيعرض شريط "كل المهن" بشكل أصلي فوقها.
  const NATIVE_APP = !!(window.HisabatiNative && typeof window.HisabatiNative.isNative === 'function' && window.HisabatiNative.isNative());

  let current = null;   // القسم المفتوح
  let frame = null;     // الـ iframe الحالي
  let homing = null;    // حالة الرجوع للرئيسية (لو شغالة)

  /* ================= رسائل وتأكيد ================= */
  let toastTimer = 0;
  function toast(msg, ms) {
    const t = $('toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), ms || 2800);
  }
  let confirmResolve = null;
  function ask(title, text, yesLabel, danger) {
    $('confirmTitle').textContent = title;
    $('confirmText').textContent = text || '';
    const yes = $('confirmYes');
    yes.textContent = yesLabel || 'تمام';
    yes.className = 'btn ' + (danger ? 'danger' : 'primary');
    $('confirm').hidden = false;
    setTimeout(() => yes.focus(), 30);
    return new Promise(res => { confirmResolve = res; });
  }
  function answer(v) { if (!confirmResolve) return; const r = confirmResolve; confirmResolve = null; $('confirm').hidden = true; r(v); }
  $('confirmYes').addEventListener('click', () => answer(true));
  $('confirmNo').addEventListener('click', () => answer(false));
  $('confirm').addEventListener('click', e => { if (e.target === $('confirm')) answer(false); });

  /* ================= التنسيق ================= */
  const fmtDate = iso => { try { return new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso)); } catch (e) { return iso; } };
  function ago(iso) {
    const s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (!isFinite(s)) return '';
    const rtf = new Intl.RelativeTimeFormat('ar', { numeric: 'auto' });
    if (s < 60) return 'دلوقتي';
    if (s < 3600) return rtf.format(-Math.round(s / 60), 'minute');
    if (s < 86400) return rtf.format(-Math.round(s / 3600), 'hour');
    return rtf.format(-Math.round(s / 86400), 'day');
  }
  const fmtSize = b => b < 1024 ? b + ' بايت' : b < 1048576 ? (b / 1024).toFixed(0) + ' ك.ب' : (b / 1048576).toFixed(1) + ' م.ب';
  function greeting() {
    const h = new Date().getHours();
    const part = h >= 4 && h < 12 ? 'صباح الخير' : 'مساء الخير';
    const acc = Cloud.account();
    const first = acc ? (acc.given || String(acc.name || '').split(' ')[0]) : '';
    return first ? `${part} يا ${first} 👋` : `${part} 👋`;
  }

  /* ================= الرئيسية ================= */
  function renderHome() {
    $('greet').textContent = greeting();
    renderAccountBtn();
    renderResume();
    renderProfileCard();
    renderGrid();
    renderCloudCard();
  }

  function renderAccountBtn() {
    const acc = Cloud.account();
    const b = $('accountBtn');
    b.classList.toggle('signed', !!acc);
    b.innerHTML = acc && acc.picture
      ? `<img src="${esc(acc.picture)}" alt="" referrerpolicy="no-referrer">`
      : icon('user');
    b.setAttribute('aria-label', acc ? `حسابي: ${acc.name}` : 'تسجيل الدخول والنسخ الاحتياطي');
  }

  function renderResume() {
    const t = byId(lsGet(LAST_KEY));
    const r = $('resumeCard');
    if (!t || !t.available) { r.hidden = true; return; }
    r.hidden = false;
    r.style.setProperty('--c', t.color);
    r.dataset.resume = t.id;
    r.innerHTML = `<img src="${esc(tradeIcon(t))}" alt="">
      <span class="resume-text"><small>كمّل شغلك في</small><strong>قسم ${esc(t.name)}</strong></span>
      <span class="go">${icon('arrow')}</span>`;
  }

  function renderGrid() {
    const last = lsGet(LAST_KEY);
    $('tradeGrid').innerHTML = TRADES.map((t, i) => {
      const style = `--c:${esc(t.color)};--i:${i}`;
      if (!t.available) {
        return `<button class="trade" type="button" disabled style="${style}" aria-disabled="true">
          <div class="trade-icon" aria-hidden="true">${initial(t)}</div>
          <div class="trade-name">${esc(t.name)}</div>
          <div class="trade-desc">قسم جديد في الطريق</div>
          <div class="trade-foot"><span class="pill">قريباً</span></div>
        </button>`;
      }
      return `<button class="trade" type="button" data-trade="${esc(t.id)}" style="${style}">
        <div class="trade-icon"><img src="${esc(tradeIcon(t))}" alt="" width="56" height="56" loading="lazy"></div>
        <div class="trade-name">${esc(t.name)}</div>
        <div class="trade-desc">${esc(t.desc)}</div>
        <div class="trade-foot">
          ${last === t.id ? '<span class="pill last">آخر استخدام</span>' : '<span></span>'}
          <span class="go">${icon('arrow')}</span>
        </div>
      </button>`;
    }).join('');
  }

  function renderCloudCard() {
    const acc = Cloud.account();
    const c = $('cloudCard');
    if (!acc) {
      c.innerHTML = `<div class="cloud-top">
          <div class="cloud-ic">${icon('cloud-up')}</div>
          <div class="cloud-text"><strong>احفظ شغلك على جوجل درايف</strong>
          <span>سجّل بحساب جوجل وخد نسخة احتياطية من كل الأقسام، ورجّعها في أي وقت أو على أي موبايل.</span></div>
        </div>
        <div class="cloud-actions"><button class="btn-google" type="button" data-act="signin">${icon('google')} تسجيل الدخول بحساب جوجل</button></div>`;
      return;
    }
    const last = Cloud.lastBackupAt();
    const stale = !last || (Date.now() - new Date(last).getTime()) > 3 * 86400000;
    c.innerHTML = `<div class="cloud-top">
        <div class="cloud-ic">${acc.picture ? `<img src="${esc(acc.picture)}" alt="" referrerpolicy="no-referrer">` : icon('user')}</div>
        <div class="cloud-text"><strong>${esc(acc.name)}</strong>
        <span class="${stale ? 'warn' : ''}">${last ? 'آخر نسخة احتياطية ' + esc(ago(last)) : 'لسه ما عملتش نسخة احتياطية من الجهاز ده'}</span></div>
      </div>
      <div class="cloud-actions">
        <button class="btn primary" type="button" data-act="backup">${icon('cloud-up')} نسخة دلوقتي</button>
        <button class="btn ghost" type="button" data-act="open-account">${icon('cloud-down')} النسخ المحفوظة</button>
      </div>`;
  }

  /* ================= فتح القسم ================= */
  function openTrade(id, opts) {
    const push = !opts || opts.push !== false;
    const t = byId(id);
    if (!t || !t.available) return;
    if (NATIVE_APP) { lsSet(LAST_KEY, t.id); location.href = tradeBase(t); return; }
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
    if (homing) homing.onStep();
    else if (ok) attachFramePop();
  }

  // بنسمع (من غير ما نعدل حاجة) على رجوع جوه القسم — بنحتاجه بس وقت الرجوع للرئيسية
  function attachFramePop() {
    try { frame.contentWindow.addEventListener('popstate', () => { if (homing) homing.onStep(); }); } catch (e) {}
  }

  function showRunner() { $('runner').hidden = false; document.body.dataset.view = 'app'; }

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
    document.title = 'أرزقي — لحسابات المصنعية';
    renderHome();
    if (was) { const b = document.querySelector(`[data-trade="${was.id}"]`); if (b) b.focus({ preventScroll: true }); }
  }

  /* ================= الرجوع للرئيسية ================= */
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
    if (!st || st.hs !== 'app') { closeTrade(); return; }
    if (homing) return;
    $('runner').hidden = true;
    document.body.dataset.view = 'home';

    const depth = frameDepth();
    let steps = 0;
    const stepBack = () => {
      if (!homing) return;
      if (++steps > 80) { closeTrade(); return; }
      clearTimeout(homing.timer);
      homing.timer = setTimeout(() => { if (homing) closeTrade(); }, 1500);
      history.back();
    };
    homing = { timer: 0, onStep() { setTimeout(() => { if (homing && history.state && history.state.hs === 'app') stepBack(); }, 0); } };
    if (depth !== null) {
      homing.timer = setTimeout(() => { if (homing) closeTrade(); }, 2000);
      history.go(-(depth + 1));
    } else {
      stepBack();
    }
  }
  function finishHoming() { if (homing) { clearTimeout(homing.timer); homing = null; } }

  /* ================= الطبقات: القائمة والحساب ================= */
  const LAYERS = { menu: 'drawer', account: 'accountSheet', profile: 'profileSheet' };
  let layerReturnFocus = null;
  function openLayerName() { for (const [n, id] of Object.entries(LAYERS)) if ($(id).classList.contains('open')) return n; return null; }
  function showLayer(name) {
    if (openLayerName() === name) return;
    hideLayers(true);
    const el = $(LAYERS[name]);
    if (!layerReturnFocus) layerReturnFocus = document.activeElement;
    el.classList.add('open'); el.setAttribute('aria-hidden', 'false');
    document.body.classList.add('locked');
    if (name === 'menu') $('menuBtn').setAttribute('aria-expanded', 'true');
    if (name === 'account') renderAccountSheet();
    if (name === 'profile') fillProfileForm();
    setTimeout(() => { const b = el.querySelector('[data-close]:not(.layer-backdrop)'); if (b) b.focus(); }, 60);
  }
  function hideLayers(keepFocus) {
    let had = false;
    for (const id of Object.values(LAYERS)) { const el = $(id); if (el.classList.contains('open')) { had = true; el.classList.remove('open'); el.setAttribute('aria-hidden', 'true'); } }
    $('menuBtn').setAttribute('aria-expanded', 'false');
    document.body.classList.remove('locked');
    if (had && !keepFocus && layerReturnFocus && layerReturnFocus.focus) { layerReturnFocus.focus(); layerReturnFocus = null; }
  }
  // فتح طبقة بيضيف خطوة في سجل الرجوع علشان زرار الرجوع في الموبايل يقفلها
  function openLayer(name) {
    if (current) return;
    if (history.state && history.state.hs === 'layer') history.replaceState({ hs: 'layer', layer: name }, '', location.pathname + location.search);
    else history.pushState({ hs: 'layer', layer: name }, '', location.pathname + location.search);
    showLayer(name);
  }
  function closeLayer() {
    if (history.state && history.state.hs === 'layer') history.back();
    else hideLayers();
  }
  ['drawer', 'accountSheet', 'profileSheet'].forEach(id => $(id).addEventListener('click', e => { if (e.target.closest('[data-close]')) closeLayer(); }));

  window.addEventListener('popstate', e => {
    const s = e.state;
    if (confirmResolve) answer(false);
    if (s && s.hs === 'layer') { if (!current && LAYERS[s.layer]) showLayer(s.layer); return; }
    hideLayers();
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
      if (!current || current.id !== id) { hideLayers(true); history.replaceState({ hs: 'app', id }, '', '#' + id); openTrade(id, { push: false }); }
    } else if (!id && current) {
      history.replaceState({ hs: 'home' }, '', location.pathname + location.search);
      closeTrade();
    }
  });

  /* ================= القائمة ================= */
  function renderDrawer() {
    $('drawerTrades').innerHTML = TRADES.map(t => {
      const style = `--c:${esc(t.color)}`;
      if (!t.available) {
        return `<div class="dt soon" style="${style}"><div class="dt-sum">
          <div class="dt-icon" aria-hidden="true">${initial(t)}</div>
          <div class="dt-text"><strong>${esc(t.name)}</strong><small>${esc(t.about)}</small></div>
          <span class="soon-tag">قريباً</span></div></div>`;
      }
      return `<details class="dt" style="${style}">
        <summary>
          <div class="dt-icon"><img src="${esc(tradeIcon(t))}" alt="" width="40" height="40" loading="lazy"></div>
          <div class="dt-text"><strong>${esc(t.name)}</strong><small>${esc(t.desc)}</small></div>
          ${icon('chev', 'dt-chev')}
        </summary>
        <div class="dt-body">
          <p>${esc(t.about)}</p>
          <ul>${t.features.map(f => `<li>${esc(f)}</li>`).join('')}</ul>
          <button class="dt-open" type="button" data-open="${esc(t.id)}">افتح قسم ${esc(t.name)}</button>
        </div>
      </details>`;
    }).join('');
  }
  $('drawer').addEventListener('click', e => {
    const go = e.target.closest('[data-goto]');
    if (go) {
      if (go.dataset.goto === 'account') { openLayer('account'); return; }
      if (go.dataset.goto === 'profile') { openLayer('profile'); return; }
      if (go.dataset.goto === 'dev') {
        closeLayer();
        setTimeout(() => { const d = document.querySelector('.dev-card'); d.scrollIntoView({ behavior: 'smooth', block: 'center' }); d.classList.remove('flash'); void d.offsetWidth; d.classList.add('flash'); }, 300);
      }
      return;
    }
    const b = e.target.closest('[data-open]');
    if (!b) return;
    const id = b.dataset.open;
    // خطوة القائمة بتتبدل بخطوة القسم: الرجوع من القسم يروح للرئيسية على طول
    if (history.state && history.state.hs === 'layer') history.replaceState({ hs: 'app', id }, '', '#' + id);
    else history.pushState({ hs: 'app', id }, '', '#' + id);
    layerReturnFocus = null;
    hideLayers(true);
    openTrade(id, { push: false });
  });

  /* ================= الحساب والنسخ الاحتياطي ================= */
  let backups = null;          // null = لسه ما اتحملتش
  let backupsState = 'idle';   // idle | loading | error
  let busy = false;

  function cloudError(e) {
    const m = String(e && e.message || e);
    if (m === 'not-configured') return 'تسجيل الدخول بجوجل هيتفعّل قريباً.';
    if (m === 'android-not-configured') return 'تسجيل الدخول بجوجل لسه بيتجهز على تطبيق الأندرويد.';
    if (m === 'auth-failed' || m === 'native-failed' || m === 'consent-required') return 'ما قدرناش نسجّل الدخول بجوجل — جرّب تاني.';
    if (m === 'offline' || /Failed to fetch|NetworkError/.test(m)) return 'مفيش إنترنت — اتأكد من الاتصال وجرّب تاني.';
    if (m === 'drive-not-granted') return 'لازم توافق على صلاحية جوجل درايف علشان نقدر نحفظ النسخة.';
    if (m === 'popup_closed' || m === 'access_denied' || m === 'popup_failed_to_open') return 'اتلغى تسجيل الدخول.';
    if (m === 'auth-expired') return 'الجلسة خلصت — دوس تاني علشان تكمّل.';
    if (m === 'not-a-hisabati-backup' || /^foreign-|^bad-value|newer-format/.test(m)) return 'الملف ده مش نسخة احتياطية سليمة من أرزقي.';
    if (/QuotaExceeded/i.test(m)) return 'مساحة التخزين على الجهاز مش كفاية.';
    return 'حصلت مشكلة — جرّب تاني.';
  }

  async function doSignIn() {
    if (!Cloud.isConfigured()) { toast('تسجيل الدخول بجوجل هيتفعّل قريباً.'); return; }
    if (busy) return; busy = true;
    try {
      const acc = await Cloud.signIn();
      toast(`أهلاً يا ${acc.given || acc.name} — اتسجل دخولك ✓`);
      renderHome();
      backups = null;
      if (openLayerName() === 'account') renderAccountSheet();
      await loadBackups(true);
      // جهاز جديد ومفيش بيانات عليه + فيه نسخة على درايف → نعرض الاسترجاع
      if (!Backup.hasLocalData() && backups && backups.length) {
        busy = false;
        const b = backups[0];
        if (await ask('لقينا نسخة احتياطية', `فيه نسخة محفوظة على حسابك من ${fmtDate(b.createdTime)}.\nتحب ترجعها على الجهاز ده دلوقتي؟`, 'رجّعها')) await doRestore(b.id, true);
      }
    } catch (e) { toast(cloudError(e)); }
    finally { busy = false; }
  }

  async function doBackup() {
    if (busy) return; busy = true;
    const tokenP = Cloud.requestToken(); // جوه الضغطة
    setBusyButtons(true);
    try {
      await tokenP;
      toast('بنجهز النسخة…', 8000);
      const snap = await Backup.collect();
      if (!Backup.totalItems(snap)) { toast('لسه مفيش بيانات في أي قسم علشان نحفظها.'); return; }
      await Cloud.uploadBackup(snap);
      toast('اتحفظت نسخة احتياطية على جوجل درايف ✓');
      backups = null;
      renderCloudCard();
      if (openLayerName() === 'account') await loadBackups(true);
    } catch (e) { toast(cloudError(e)); }
    finally { busy = false; setBusyButtons(false); }
  }

  async function doRestore(id, skipAsk) {
    const b = (backups || []).find(x => x.id === id);
    if (!skipAsk) {
      const ok = await ask('استرجاع النسخة؟', `هترجع بيانات كل الأقسام زي ما كانت يوم ${b ? fmtDate(b.createdTime) : ''}.\nبياناتك الحالية هتتحفظ على الجهاز الأول، وتقدر تتراجع في أي وقت.`, 'استرجاع');
      if (!ok) return;
    }
    if (busy) return; busy = true;
    try {
      await Cloud.requestToken();
      toast('بنحمّل النسخة…', 15000);
      const snap = await Cloud.downloadBackup(id);
      if (current) closeTrade();
      await Backup.restore(snap);
      toast('اترجعت بياناتك ✓ — بنعيد التشغيل…', 4000);
      setTimeout(() => location.reload(), 900);
    } catch (e) { toast(cloudError(e)); busy = false; }
  }

  async function doDelete(id) {
    const b = (backups || []).find(x => x.id === id);
    if (!(await ask('حذف النسخة؟', `نسخة ${b ? fmtDate(b.createdTime) : ''} هتتمسح من جوجل درايف نهائياً.`, 'احذف', true))) return;
    if (busy) return; busy = true;
    try {
      await Cloud.requestToken();
      await Cloud.deleteBackup(id);
      backups = (backups || []).filter(x => x.id !== id);
      toast('اتمسحت النسخة');
      renderAccountSheet();
    } catch (e) { toast(cloudError(e)); }
    finally { busy = false; }
  }

  async function doUndo() {
    if (!(await ask('تتراجع عن آخر استرجاع؟', 'هترجع بياناتك زي ما كانت قبل آخر مرة رجّعت فيها نسخة.', 'تراجع'))) return;
    try {
      if (current) closeTrade();
      await Backup.undoLastRestore();
      toast('رجعت بياناتك زي ما كانت ✓', 4000);
      setTimeout(() => location.reload(), 900);
    } catch (e) { toast(cloudError(e)); }
  }

  async function doSignOut() {
    if (!(await ask('تسجيل الخروج؟', 'بياناتك على الجهاز والنسخ اللي على درايف هيفضلوا زي ما هم.', 'خروج'))) return;
    Cloud.signOut();
    backups = null;
    toast('اتسجل خروجك');
    renderHome();
    renderAccountSheet();
  }

  async function loadBackups(force) {
    if (!Cloud.account()) return;
    if (!force && backups) return;
    backupsState = 'loading'; renderAccountSheet();
    try {
      await Cloud.requestToken();
      backups = await Cloud.listBackups();
      backupsState = 'idle';
    } catch (e) { backupsState = 'error'; backups = null; toast(cloudError(e)); }
    renderAccountSheet();
  }

  function setBusyButtons(on) {
    document.querySelectorAll('[data-act="backup"]').forEach(b => { b.disabled = on; });
  }

  async function renderAccountSheet() {
    const body = $('accountBody');
    const acc = Cloud.account();
    const privacy = `<p class="fine">${icon('shield')} أرزقي بيوصل بس للملفات اللي هو بيعملها على درايف بتاعك، ومفيش أي سيرفر بيشوف بياناتك. <a href="./privacy.html">سياسة الخصوصية</a></p>`;
    if (!acc) {
      body.innerHTML = `<div class="about">
          <h2>احفظ شغلك على جوجل درايف</h2>
          <p>سجّل بحساب جوجل وخد نسخة احتياطية من بيانات كل الأقسام: الفواتير، العملاء، المشروعات، الخامات، العمال والصور. تقدر ترجّعها في أي وقت، أو على موبايل جديد.</p>
        </div>
        <div class="sheet-actions"><button class="btn-google" type="button" data-act="signin">${icon('google')} تسجيل الدخول بحساب جوجل</button></div>
        ${privacy}`;
      return;
    }
    let list;
    if (backupsState === 'loading') list = `<div class="loading-row"><div class="spinner sm"></div> بنجيب النسخ من درايف…</div>`;
    else if (backupsState === 'error') list = `<div class="empty">ما قدرناش نجيب النسخ.<br><button class="btn ghost" type="button" data-act="load">${icon('cloud-down')} جرّب تاني</button></div>`;
    else if (!backups) list = `<div class="empty">النسخ الاحتياطية محفوظة على جوجل درايف.<br><button class="btn ghost" type="button" data-act="load">${icon('cloud-down')} اعرض النسخ المحفوظة</button></div>`;
    else if (!backups.length) list = `<div class="empty">لسه مفيش نسخ احتياطية على حسابك.<br>اعمل أول نسخة دلوقتي ☝️</div>`;
    else list = `<div class="bk-list">${backups.map((b, i) => `<div class="bk" style="--i:${i}">
          <div class="bk-ic">${icon('doc')}</div>
          <div class="bk-text"><strong>${esc(fmtDate(b.createdTime))}</strong>
          <small>${esc(ago(b.createdTime))}${b.device ? ' · ' + esc(b.device) : ''}${b.items ? ' · ' + b.items + ' عنصر' : ''} · ${esc(fmtSize(b.size))}</small></div>
          <button class="bk-btn" type="button" data-restore="${esc(b.id)}">استرجاع</button>
          <button class="bk-del" type="button" data-delete="${esc(b.id)}" aria-label="حذف النسخة">${icon('trash')}</button>
        </div>`).join('')}</div>`;
    let undo = '';
    try { if (await Backup.loadSafety()) undo = `<div class="undo-box">${icon('undo')}<span>عندك نسخة من بياناتك قبل آخر استرجاع.</span><button class="bk-btn" type="button" data-act="undo">تراجع</button></div>`; } catch (e) {}
    body.innerHTML = `<div class="profile">
        ${acc.picture ? `<img src="${esc(acc.picture)}" alt="" referrerpolicy="no-referrer">` : `<div class="ph">${esc(String(acc.name || '?').slice(0, 1))}</div>`}
        <div class="profile-text"><strong>${esc(acc.name)}</strong><span>${esc(acc.email)}</span></div>
        <button class="icon-plain" type="button" data-act="signout" aria-label="تسجيل الخروج">${icon('logout')}</button>
      </div>
      <div class="sheet-actions"><button class="btn primary" type="button" data-act="backup">${icon('cloud-up')} نسخة احتياطية دلوقتي</button></div>
      ${undo}
      <div class="list-head"><h3>النسخ المحفوظة على درايف</h3>${backups && backups.length ? `<small>${backups.length} نسخة</small>` : ''}</div>
      ${list}
      ${privacy}`;
  }

  // كل أزرار الحساب (في الكارت والشيت)
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-act],[data-restore],[data-delete]');
    if (!a || a.closest('.trade')) return;
    if (a.dataset.restore) return void doRestore(a.dataset.restore);
    if (a.dataset.delete) return void doDelete(a.dataset.delete);
    switch (a.dataset.act) {
      case 'signin': doSignIn(); break;
      case 'backup': doBackup(); break;
      case 'open-account': openLayer('account'); if (Cloud.hasToken()) loadBackups(); break;
      case 'open-profile': openLayer('profile'); break;
      case 'load': loadBackups(true); break;
      case 'undo': doUndo(); break;
      case 'signout': doSignOut(); break;
    }
  });

  /* ================= بياناتي في الفاتورة (مشتركة بين كل الأقسام) ================= */
  const PROFILE_KEY = 'arzaqi_profile_v1';
  function getProfile() { try { return JSON.parse(lsGet(PROFILE_KEY) || '{}') || {}; } catch (e) { return {}; } }
  function renderProfileCard() {
    const p = getProfile();
    const c = $('profileCard');
    const filled = !!(p.name || p.phone);
    c.classList.toggle('filled', filled);
    c.innerHTML = `<span class="pc-logo">${p.logo ? `<img src="${esc(p.logo)}" alt="">` : icon('doc')}</span>
      <span class="pc-text">${filled
        ? `<strong>${esc(p.name || 'بياناتي')}</strong><small>${esc([p.trade, p.phone].filter(Boolean).join(' · ') || 'دوس لتعديل بياناتك')}</small>`
        : `<strong>ضيف بياناتك للفاتورة</strong><small>اسمك ولوجو ورقم تليفونك يظهروا فوق في كل فاتورة</small>`}</span>
      <span class="go">${icon('arrow')}</span>`;
  }
  let pfLogo = '';
  function setLogoPreview() {
    const pv = $('pfLogoPreview');
    pv.style.backgroundImage = pfLogo ? `url("${pfLogo}")` : '';
    pv.textContent = pfLogo ? '' : 'مفيش لوجو';
    $('pfLogoRemove').hidden = !pfLogo;
  }
  function fillProfileForm() {
    const p = getProfile();
    $('pfName').value = p.name || ''; $('pfTrade').value = p.trade || '';
    $('pfPhone').value = p.phone || ''; $('pfWarranty').value = p.warranty || '';
    pfLogo = p.logo || ''; setLogoPreview();
  }
  // اللوجو بيتصغّر لحد 512 بكسل علشان يفضل خفيف في التخزين والنسخ الاحتياطي
  $('pfLogo').addEventListener('change', e => {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, 512 / Math.max(img.width, img.height));
        const cv = document.createElement('canvas');
        cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        pfLogo = cv.toDataURL('image/png'); setLogoPreview();
      };
      img.onerror = () => toast('الصورة دي مش مدعومة');
      img.src = r.result;
    };
    r.readAsDataURL(f);
  });
  $('pfLogoRemove').addEventListener('click', () => { pfLogo = ''; setLogoPreview(); });
  $('profileForm').addEventListener('submit', e => {
    e.preventDefault();
    const p = {
      name: $('pfName').value.trim(), trade: $('pfTrade').value.trim(), phone: $('pfPhone').value.trim(),
      warranty: $('pfWarranty').value.trim(), logo: pfLogo, updatedAt: new Date().toISOString()
    };
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); } catch (err) { toast('مساحة التخزين مش كفاية للوجو — جرّب صورة أصغر'); return; }
    toast('اتحفظت بياناتك ✓ — هتظهر في كل الفواتير');
    renderProfileCard();
    closeLayer();
  });

  /* ================= الثيم ================= */
  function toggleTheme() {
    const root = document.documentElement;
    const cur = root.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const next = cur === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    lsSet(THEME_KEY, next);
  }

  /* ================= المطوّر ================= */
  (function dev() {
    const d = CFG.developer || {};
    if (d.photo) $('devPhoto').src = d.photo;
    if (d.name) { $('devName').textContent = d.name; $('devPhoto').alt = d.name; }
    if (d.role) $('devRole').textContent = d.role;
    $('devWa').href = 'https://wa.me/' + (d.whatsapp || '');
    $('devFb').href = d.facebook || '#';
    $('devTel').href = 'tel:+' + (d.whatsapp || '');
    $('devTel').setAttribute('aria-label', 'اتصال ' + (d.phoneDisplay || ''));
  })();

  /* ================= تشغيل ================= */
  $('tradeGrid').addEventListener('click', e => { const b = e.target.closest('[data-trade]'); if (b) openTrade(b.dataset.trade); });
  $('resumeCard').addEventListener('click', () => { const id = $('resumeCard').dataset.resume; if (id) openTrade(id); });
  $('homeBtn').addEventListener('click', goHome);
  $('themeBtn').addEventListener('click', toggleTheme);
  $('menuBtn').addEventListener('click', () => openLayer('menu'));
  $('accountBtn').addEventListener('click', () => { openLayer('account'); if (Cloud.hasToken()) loadBackups(); });
  $('retryBtn').addEventListener('click', () => { const t = current; if (!t) return; destroyFrame(); current = null; openTrade(t.id, { push: false }); });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (confirmResolve) answer(false);
    else if (openLayerName()) closeLayer();
  });

  renderDrawer();
  renderHome();
  Cloud.preload();

  // رابط مباشر لقسم: Main-App/#electrical (وكمان اختصارات أيقونة التطبيق)
  const startId = decodeURIComponent(location.hash.slice(1));
  const st = history.state;
  if (st && st.hs === 'layer') {
    history.replaceState({ hs: 'home' }, '', location.pathname + location.search);
  } else if (st && st.hs === 'app' && byId(st.id)) {
    openTrade(st.id, { push: false });
  } else {
    history.replaceState({ hs: 'home' }, '', location.pathname + location.search);
    if (startId && byId(startId) && byId(startId).available) openTrade(startId);
  }

  if ('serviceWorker' in navigator && location.protocol !== 'file:' && !NATIVE_APP) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('./service-worker.js', { scope: './' }).catch(() => {}); });
  }

  // للاختبارات الآلية
  window.__hisabatiLauncher = {
    version: LAUNCHER_VERSION, nativeApp: NATIVE_APP, openTrade, goHome, openLayer, closeLayer,
    get current() { return current && current.id; }, get frame() { return frame; }
  };
})();
