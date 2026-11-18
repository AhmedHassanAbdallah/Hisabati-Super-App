/*
 * حساباتي للأرضيات — أدوات الواجهة: الأيقونات، الرسائل، النوافذ المنبثقة، الصفحات، النماذج
 * © 2026 أحمد حسن عبدالله - جميع الحقوق محفوظة.
 */
(function (root) {
  'use strict';
  const ICONS = {
    share: '<path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v13"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    users: '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0"/><path d="M16 4a4 4 0 0 1 0 8"/><path d="M22 21a7 7 0 0 0-4-6.3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    wallet: '<rect x="3" y="6" width="18" height="14" rx="3"/><path d="M3 10h18"/><path d="M16 15h2"/>',
    calc: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M8 6h8"/><path d="M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 18.5h.01M12 18.5h.01M16 18.5h.01"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    send: '<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
    check: '<path d="M20 6L9 17l-5-5"/>',
    trash: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
    briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/>',
    download: '<path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/>',
    upload: '<path d="M12 21V9"/><path d="M7 14l5-5 5 5"/><path d="M5 3h14"/>',
    save: '<path d="M5 3h11l5 5v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M7 3v5h8"/><rect x="7" y="13" width="10" height="8"/>',
    chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12z"/>',
    facebook: '<path d="M15 3h-2a4 4 0 0 0-4 4v3H7v4h2v7h4v-7h3l1-4h-4V7a1 1 0 0 1 1-1h2z"/>',
    file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/>',
    home: '<path d="M3 11l9-8 9 8"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
    x: '<path d="M18 6L6 18M6 6l12 12"/>',
    printer: '<path d="M6 9V2h12v7"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v8H6z"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    alert: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
    pin: '<path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    back: '<path d="M5 12h14"/><path d="M13 6l6 6-6 6"/>',
    box: '<path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8"/>',
    cash: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 10v4M18 10v4"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>',
    layers: '<path d="M12 2l10 5-10 5L2 7z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>',
    list: '<path d="M9 6h12M9 12h12M9 18h12"/><path d="M4 6h.01M4 12h.01M4 18h.01"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    tiles: '<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/>',
    ruler: '<path d="M3 17L17 3l4 4L7 21z"/><path d="M7 13l2 2M10 10l2 2M13 7l2 2"/>',
    stairs: '<path d="M3 21h5v-5h5v-5h5V6h3"/><path d="M3 21V3"/>',
    wood: '<path d="M3 7h12l-2 4H3zM9 13h12l-2 4H9z"/><path d="M3 11v0M21 13"/>',
    brick: '<rect x="2" y="4" width="20" height="16" rx="1"/><path d="M2 9.3h20M2 14.6h20M8 4v5.3M16 4v5.3M12 9.3v5.3M8 14.6V20M16 14.6V20"/>',
    gem: '<path d="M6 3h12l4 6-10 12L2 9z"/><path d="M2 9h20M12 21L8 9l4-6 4 6z"/>',
    droplet: '<path d="M12 2.7l5.7 5.6a8 8 0 1 1-11.4 0z"/>',
    truck: '<path d="M1 4h14v12H1z"/><path d="M15 9h4l3 3v4h-7"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>',
    hardhat: '<path d="M2 18h20"/><path d="M4 18v-3a8 8 0 0 1 16 0v3"/><path d="M10 7V4h4v3"/>',
    note: '<path d="M4 4h12l4 4v12H4z"/><path d="M16 4v4h4"/><path d="M8 12h8M8 16h5"/>',
    chart: '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>',
    store: '<path d="M3 9l1.5-5h15L21 9"/><path d="M3 9h18v2a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0z"/><path d="M5 13v8h14v-8"/>',
    receipt: '<path d="M5 2h14v20l-3-2-2 2-2-2-2 2-2-2-3 2z"/><path d="M9 7h6M9 11h6M9 15h4"/>',
    tag: '<path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z"/><circle cx="7" cy="7" r="1.5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    arrowUp: '<path d="M12 19V5M5 12l7-7 7 7"/>',
    arrowDown: '<path d="M12 5v14M19 12l-7 7-7-7"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    hammer: '<path d="M14 6l4 4"/><path d="M3 21l9-9"/><path d="M12.5 4.5l3-1.5 5.5 5.5-1.5 3-3.5-1-2.5 2.5-3-3 2.5-2.5z"/>'
  };
  function icon(name, cls) { return `<svg class="ic${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`; }
  function hydrateIcons(rootEl) { (rootEl || document).querySelectorAll('i[data-icon]').forEach(el => { el.outerHTML = icon(el.dataset.icon); }); }
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  /* ---------- العملة والأرقام ---------- */
  const CURRENCIES = [
    { code: 'EGP', country: 'مصر', name: 'جنيه مصري', sym: 'ج.م', dec: 2 },
    { code: 'SAR', country: 'السعودية', name: 'ريال سعودي', sym: 'ر.س', dec: 2 },
    { code: 'AED', country: 'الإمارات', name: 'درهم إماراتي', sym: 'د.إ', dec: 2 },
    { code: 'KWD', country: 'الكويت', name: 'دينار كويتي', sym: 'د.ك', dec: 3 },
    { code: 'BHD', country: 'البحرين', name: 'دينار بحريني', sym: 'د.ب', dec: 3 },
    { code: 'QAR', country: 'قطر', name: 'ريال قطري', sym: 'ر.ق', dec: 2 },
    { code: 'OMR', country: 'عُمان', name: 'ريال عماني', sym: 'ر.ع', dec: 3 },
    { code: 'JOD', country: 'الأردن', name: 'دينار أردني', sym: 'د.أ', dec: 3 },
    { code: 'IQD', country: 'العراق', name: 'دينار عراقي', sym: 'د.ع', dec: 0 },
    { code: 'LYD', country: 'ليبيا', name: 'دينار ليبي', sym: 'د.ل', dec: 3 },
    { code: 'TND', country: 'تونس', name: 'دينار تونسي', sym: 'د.ت', dec: 3 },
    { code: 'MAD', country: 'المغرب', name: 'درهم مغربي', sym: 'د.م', dec: 2 },
    { code: 'DZD', country: 'الجزائر', name: 'دينار جزائري', sym: 'د.ج', dec: 2 },
    { code: 'LBP', country: 'لبنان', name: 'ليرة لبنانية', sym: 'ل.ل', dec: 0 },
    { code: 'SYP', country: 'سوريا', name: 'ليرة سورية', sym: 'ل.س', dec: 0 },
    { code: 'YER', country: 'اليمن', name: 'ريال يمني', sym: 'ر.ي', dec: 0 },
    { code: 'SDG', country: 'السودان', name: 'جنيه سوداني', sym: 'ج.س', dec: 2 },
    { code: 'MRU', country: 'موريتانيا', name: 'أوقية موريتانية', sym: 'أ.م', dec: 2 },
    { code: 'ILS', country: 'فلسطين', name: 'شيكل', sym: '₪', dec: 2 },
    { code: 'SOS', country: 'الصومال', name: 'شلن صومالي', sym: 'ش.ص', dec: 0 },
    { code: 'DJF', country: 'جيبوتي', name: 'فرنك جيبوتي', sym: 'ف.ج', dec: 0 },
    { code: 'KMF', country: 'جزر القمر', name: 'فرنك قمري', sym: 'ف.ق', dec: 0 },
    { code: 'USD', country: 'دولار أمريكي', name: 'دولار', sym: '$', dec: 2 }
  ];
  let cur = CURRENCIES[0];
  function setCurrency(code) { cur = CURRENCIES.find(c => c.code === code) || CURRENCIES[0]; document.querySelectorAll('.cur').forEach(el => { el.textContent = cur.sym; }); }
  function fmt(v, dec) {
    const d = dec == null ? cur.dec : dec;
    const f = Math.pow(10, d);
    const x = Math.round(((Number(v) || 0) + Number.EPSILON) * f) / f;
    return x.toLocaleString('en-US', { maximumFractionDigits: d });
  }
  function fmtQ(v) { return fmt(v, 3); }
  function money(v) { return `${fmt(v)} ${cur.sym}`; }
  function curSym() { return cur.sym; }
  function fmtDate(iso) {
    if (!iso) return '';
    const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${+m[3]}/${+m[2]}/${m[1]}` : String(iso);
  }

  /* ---------- رسائل ---------- */
  function toast(msg, kind) {
    const t = document.getElementById('appToast');
    t.textContent = msg;
    t.classList.toggle('err', kind === 'err');
    t.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove('show'), 2800);
  }
  function confirmBox(msg, onYes, opts) {
    opts = opts || {};
    const m = document.getElementById('appConfirmModal');
    document.getElementById('appConfirmTitle').textContent = opts.title || 'تأكيد';
    document.getElementById('appConfirmText').textContent = msg;
    const yes = document.getElementById('appConfirmYesBtn');
    yes.textContent = opts.yes || 'نعم، تأكيد';
    yes.className = 'btn ' + (opts.safe ? 'btn-primary' : 'btn-danger');
    const no = document.getElementById('appConfirmNoBtn');
    no.textContent = opts.no || 'إلغاء';
    no.classList.toggle('hidden', !!opts.alertOnly);
    m.classList.add('open');
    yes.onclick = () => { m.classList.remove('open'); if (onYes) onYes(); };
    no.onclick = () => { m.classList.remove('open'); if (opts.onNo) opts.onNo(); };
  }
  function alertBox(msg, title) { confirmBox(msg, null, { title: title || 'تنبيه', yes: 'حسناً', safe: true, alertOnly: true }); }

  /* ---------- مكدس الصفحات والنوافذ + زر الرجوع في الموبايل ---------- */
  const stack = [];
  let zBase = 150;
  function lockScroll() { document.body.style.overflow = stack.length ? 'hidden' : ''; }
  function pushEntry(entry) {
    stack.push(entry);
    lockScroll();
    try { history.pushState({ hfDepth: stack.length }, ''); } catch (e) {}
  }
  function popEntry() {
    const e = stack.pop();
    if (!e) return;
    e.destroy();
    if (e.onClose) try { e.onClose(); } catch (err) { console.error(err); }
    lockScroll();
    // بعد قفل أي نافذة: حدّث الصفحة اللي تحتها
    const top = stack[stack.length - 1];
    if (top && top.kind === 'page' && e.kind === 'sheet' && e.refreshBelow !== false) top.refresh();
    if (!stack.length && root.App && App.refreshView) App.refreshView();
  }
  window.addEventListener('popstate', ev => {
    const cm = document.getElementById('appConfirmModal');
    if (cm && cm.classList.contains('open')) cm.classList.remove('open');
    const depth = (ev.state && ev.state.hfDepth) || 0;
    while (stack.length > depth) popEntry();
  });
  function back() { if (stack.length) { try { history.back(); } catch (e) { popEntry(); } } }
  // يقفل آخر n نوافذ ثم ينفذ الإجراء بعد اكتمال الرجوع
  function closeThen(n, fn) {
    n = Math.min(n == null ? 1 : n, stack.length);
    if (!n) { if (fn) fn(); return; }
    const h = () => { window.removeEventListener('popstate', h); setTimeout(() => fn && fn(), 30); };
    window.addEventListener('popstate', h);
    try { history.go(-n); } catch (e) { window.removeEventListener('popstate', h); for (let i = 0; i < n; i++) popEntry(); if (fn) fn(); }
  }
  function closeAllThen(fn) { closeThen(stack.length, fn); }
  function depth() { return stack.length; }

  /**
   * صفحة كاملة فوق التطبيق: openPage({ title, sub, actions:[{icon, label, onClick}], render(body, page), onClose })
   */
  function openPage(opts) {
    const el = document.createElement('div');
    el.className = 'page-overlay';
    el.style.zIndex = zBase + stack.length * 3;
    el.innerHTML = `<header class="app-header"><button type="button" class="icon-btn" data-back aria-label="رجوع">${icon('back')}</button>
      <div class="titles"><h1 class="pg-title"></h1><div class="sub pg-sub"></div></div><div class="pg-actions"></div></header>
      <div class="container pg-body"></div>`;
    document.body.appendChild(el);
    el.querySelector('[data-back]').onclick = back;
    const body = el.querySelector('.pg-body');
    const page = {
      kind: 'page', el, body, opts, onClose: opts.onClose,
      setTitle(t, s) { el.querySelector('.pg-title').textContent = t || ''; el.querySelector('.pg-sub').textContent = s || ''; },
      setActions(actions) {
        const box = el.querySelector('.pg-actions');
        box.innerHTML = '';
        (actions || []).forEach(a => {
          const b = document.createElement('button');
          b.type = 'button'; b.className = 'icon-btn' + (a.accent ? ' accent' : ''); b.setAttribute('aria-label', a.label); b.title = a.label;
          b.innerHTML = icon(a.icon); b.onclick = a.onClick; box.appendChild(b);
        });
      },
      refresh() {
        if (!document.body.contains(el)) return;
        const y = el.scrollTop;
        try { opts.render(body, page); } catch (err) { console.error(err); body.innerHTML = `<div class="warn-box">حصل خطأ أثناء عرض الصفحة: ${esc(err.message)}</div>`; }
        hydrateIcons(body);
        el.scrollTop = y;
      },
      close() { back(); },
      destroy() { el.classList.remove('open'); setTimeout(() => el.remove(), 10); }
    };
    page.setTitle(opts.title, opts.sub);
    page.setActions(opts.actions);
    page.refresh();
    el.classList.add('open');
    el.scrollTop = 0;
    pushEntry(page);
    return page;
  }

  /**
   * نافذة منبثقة من أسفل: openSheet({ title, render(body, sheet), onClose })
   */
  function openSheet(opts) {
    const z = zBase + 60 + stack.length * 3;
    const bd = document.createElement('div');
    bd.className = 'backdrop'; bd.style.zIndex = z;
    const el = document.createElement('div');
    el.className = 'sheet'; el.style.zIndex = z + 1;
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
    el.innerHTML = `<div class="grab"></div><div class="sheet-head"><h3></h3><button type="button" class="close-x" aria-label="إغلاق">${icon('x')}</button></div><div class="sheet-body"></div>`;
    el.querySelector('h3').textContent = opts.title || '';
    document.body.appendChild(bd); document.body.appendChild(el);
    bd.onclick = back;
    el.querySelector('.close-x').onclick = back;
    const body = el.querySelector('.sheet-body');
    const sheet = {
      kind: 'sheet', el, body, onClose: opts.onClose, refreshBelow: opts.refreshBelow,
      setTitle(t) { el.querySelector('h3').textContent = t; },
      refresh() { opts.render(body, sheet); hydrateIcons(body); },
      close() { back(); },
      destroy() { el.classList.remove('open'); bd.classList.remove('open'); setTimeout(() => { el.remove(); bd.remove(); }, 320); }
    };
    sheet.refresh();
    pushEntry(sheet);
    requestAnimationFrame(() => { bd.classList.add('open'); el.classList.add('open'); });
    const first = opts.autofocus && body.querySelector('input:not([type=hidden]), textarea');
    if (first) setTimeout(() => first.focus(), 320);
    return sheet;
  }
  function topPage() { for (let i = stack.length - 1; i >= 0; i--) if (stack[i].kind === 'page') return stack[i]; return null; }
  function refreshPages() { stack.forEach(e => { if (e.kind === 'page') e.refresh(); }); }

  /* ---------- النماذج ---------- */
  /**
   * fields: [{ k, label, type, value, placeholder, hint, options, half, wide, step, min, inputmode, dir, required }]
   * الأنواع: text, tel, number, date, textarea, select, chips (اختيار واحد), switch
   */
  function fieldHTML(f, values) {
    const v = values && values[f.k] != null ? values[f.k] : (f.value != null ? f.value : '');
    const id = 'f_' + f.k + '_' + Math.random().toString(36).slice(2, 6);
    const lbl = f.label ? `<label for="${id}">${f.label}${f.optional ? ' <span class="hint">(اختياري)</span>' : ''}</label>` : '';
    const hint = f.hint ? `<div class="hint">${f.hint}</div>` : '';
    let input = '';
    const ph = f.placeholder != null ? ` placeholder="${esc(f.placeholder)}"` : '';
    switch (f.type) {
      case 'textarea': input = `<textarea id="${id}" data-k="${f.k}"${ph}>${esc(v)}</textarea>`; break;
      case 'select': input = `<select id="${id}" data-k="${f.k}">${(f.options || []).map(o => `<option value="${esc(o[0])}"${String(o[0]) === String(v) ? ' selected' : ''}>${esc(o[1])}</option>`).join('')}</select>`; break;
      case 'chips': input = `<div class="unit-chips" data-k="${f.k}" data-chips data-value="${esc(v)}">${(f.options || []).map(o => `<button type="button" class="chip${String(o[0]) === String(v) ? ' on' : ''}" data-v="${esc(o[0])}">${esc(o[1])}</button>`).join('')}</div>`; break;
      case 'switch': return `<label class="switch${f.wide ? ' wide' : ''}"><span>${f.label}</span><input type="checkbox" data-k="${f.k}"${v ? ' checked' : ''}></label>${hint}`;
      case 'number': input = `<input type="number" inputmode="decimal" id="${id}" data-k="${f.k}" min="0" step="any" value="${esc(v)}"${ph}>`; break;
      case 'date': input = `<input type="date" id="${id}" data-k="${f.k}" value="${esc(v)}">`; break;
      case 'tel': input = `<input type="text" inputmode="tel" dir="ltr" style="text-align:right" id="${id}" data-k="${f.k}" value="${esc(v)}"${ph}>`; break;
      default: input = `<input type="text" id="${id}" data-k="${f.k}" value="${esc(v)}"${ph} autocomplete="off">`;
    }
    return `<div class="field${f.wide ? ' wide' : ''}" data-field="${f.k}">${lbl}${input}${hint}</div>`;
  }
  function formHTML(fields, values) {
    let html = '', buf = [];
    const flush = () => { if (buf.length) { html += `<div class="row-2">${buf.join('')}</div>`; buf = []; } };
    fields.forEach(f => {
      if (!f) return;
      if (f.html) { flush(); html += f.html; return; }
      if (f.half) buf.push(fieldHTML(f, values)); else { flush(); html += fieldHTML(f, values); }
    });
    flush();
    return html;
  }
  // تفعيل أزرار الاختيار (chips)
  function bindChips(rootEl, onChange) {
    rootEl.querySelectorAll('[data-chips]').forEach(box => {
      box.querySelectorAll('.chip').forEach(b => {
        b.onclick = () => {
          box.querySelectorAll('.chip').forEach(x => x.classList.toggle('on', x === b));
          box.dataset.value = b.dataset.v;
          if (onChange) onChange(box.dataset.k, b.dataset.v);
        };
      });
    });
  }
  function readForm(rootEl) {
    const o = {};
    rootEl.querySelectorAll('[data-k]').forEach(el => {
      const k = el.dataset.k;
      if (el.hasAttribute('data-chips')) o[k] = el.dataset.value || '';
      else if (el.type === 'checkbox') o[k] = el.checked;
      else o[k] = el.value.trim();
    });
    return o;
  }
  function setVal(rootEl, k, v) { const el = rootEl.querySelector(`[data-k="${k}"]`); if (el) el.value = v; }

  // تحميل ملف (JSON أو غيره) — داخل تطبيق أندرويد يتم الحفظ عن طريق التطبيق
  function downloadText(filename, mime, text) {
    if (root.HFloorApp && typeof root.HFloorApp.saveFile === 'function') {
      try { root.HFloorApp.saveFile(filename, mime, text); return true; } catch (e) { return false; }
    }
    try {
      const blob = new Blob([text], { type: mime });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 3000);
      return true;
    } catch (e) { return false; }
  }
  function openWhatsApp(text, phone) {
    let p = String(phone || '').replace(/[^\d+]/g, '');
    if (p.startsWith('00')) p = p.slice(2); else if (p.startsWith('+')) p = p.slice(1); else p = '';
    const url = 'https://wa.me/' + p + '?text=' + encodeURIComponent(text);
    if (root.HFloorApp && typeof root.HFloorApp.openExternal === 'function') { try { root.HFloorApp.openExternal(url); return; } catch (e) {} }
    window.open(url, '_blank', 'noopener');
  }
  function copyText(text, done) {
    const ok = () => toast(done || '✔️ اتنسخ');
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(ok).catch(fallback); else fallback();
    function fallback() {
      const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); ok(); } catch (e) { toast('⚠️ تعذر النسخ', 'err'); }
      ta.remove();
    }
  }

  root.UI = {
    ICONS, icon, hydrateIcons, esc, CURRENCIES, setCurrency, currency: () => cur, fmt, fmtQ, money, curSym, fmtDate,
    toast, confirm: confirmBox, alert: alertBox, openPage, openSheet, back, closeThen, closeAllThen, depth, topPage, refreshPages,
    fieldHTML, formHTML, bindChips, readForm, setVal, downloadText, openWhatsApp, copyText
  };
})(typeof self !== 'undefined' ? self : this);
