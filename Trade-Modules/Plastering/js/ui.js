/*
 * HESABATI PLASTER — أدوات الواجهة: الأيقونات، التنسيق، النوافذ، النماذج، التنقل والربط
 */
(function () {
  'use strict';
  const E = window.PlasterEngine, C = window.PlasterCatalog, S = window.PlasterStore;

  /* ---------------- الأيقونات ---------------- */
  const ICONS = {
    plus: '<path d="M12 5v14M5 12h14"/>',
    back: '<path d="M5 12h14"/><path d="M13 6l6 6-6 6"/>',
    home: '<path d="M3 11l9-8 9 8"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    calc: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M8 6h8"/><path d="M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 18.5h.01M12 18.5h.01M16 18.5h.01"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    users: '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0"/><path d="M16 4a4 4 0 0 1 0 8"/><path d="M22 21a7 7 0 0 0-4-6.3"/>',
    worker: '<path d="M4 17a8 8 0 0 1 16 0"/><path d="M2 17h20v3H2z"/><path d="M10 9V5h4v4"/>',
    wallet: '<rect x="3" y="6" width="18" height="14" rx="3"/><path d="M3 10h18"/><path d="M16 15h2"/>',
    cash: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 10v4M18 10v4"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    send: '<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/>',
    share: '<path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v13"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
    check: '<path d="M20 6L9 17l-5-5"/>',
    trash: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    x: '<path d="M18 6L6 18M6 6l12 12"/>',
    printer: '<path d="M6 9V2h12v7"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v8H6z"/>',
    file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/>',
    receipt: '<path d="M5 2h14v20l-3-2-2 2-2-2-2 2-2-2-3 2z"/><path d="M9 7h6M9 11h6M9 15h4"/>',
    clipboard: '<rect x="5" y="4" width="14" height="18" rx="2"/><path d="M9 4V2h6v2"/><path d="M9 11h6M9 15h4"/>',
    download: '<path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/>',
    upload: '<path d="M12 21V9"/><path d="M7 14l5-5 5 5"/><path d="M5 3h14"/>',
    save: '<path d="M5 3h11l5 5v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M7 3v5h8"/><rect x="7" y="13" width="10" height="8"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/>',
    alert: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
    pin: '<path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    box: '<path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8"/>',
    store: '<path d="M3 9l9-5 9 5v11H3z"/><path d="M7 20v-7h10v7"/><path d="M7 16h10"/>',
    layers: '<path d="M12 2l10 5-10 5L2 7z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>',
    list: '<path d="M9 6h12M9 12h12M9 18h12"/><path d="M4 6h.01M4 12h.01M4 18h.01"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12z"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>',
    trowel: '<rect x="3" y="13" width="18" height="5" rx="1.5"/><path d="M8 13V10a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v3"/><path d="M12 8V4"/>',
    building: '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2"/><path d="M10 21v-3h4v3"/>',
    texture: '<path d="M3 7c2-2 4 2 6 0s4 2 6 0 4 2 6 0"/><path d="M3 12c2-2 4 2 6 0s4 2 6 0 4 2 6 0"/><path d="M3 17c2-2 4 2 6 0s4 2 6 0 4 2 6 0"/>',
    roller: '<rect x="3" y="3" width="15" height="6" rx="2"/><path d="M18 6h2a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-8v3"/><rect x="10" y="14" width="4" height="7" rx="1"/>',
    facade: '<path d="M3 21h18"/><path d="M5 21V8l7-5 7 5v13"/><rect x="8" y="11" width="3" height="3"/><rect x="13" y="11" width="3" height="3"/><path d="M10 21v-4h4v4"/>',
    truck: '<path d="M1 6h13v10H1z"/><path d="M14 9h4l3 3v4h-7"/><circle cx="5.5" cy="18" r="2"/><circle cx="17.5" cy="18" r="2"/>',
    ruler: '<path d="M3 17L17 3l4 4L7 21z"/><path d="M7 13l2 2M10 10l2 2M13 7l2 2"/>',
    chart: '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    percent: '<path d="M19 5L5 19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
    flag: '<path d="M4 22V4"/><path d="M4 4h12l-2 4 2 4H4"/>',
    map: '<path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/>',
    move: '<path d="M7 7h11l-3-3"/><path d="M17 17H6l3 3"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    link: '<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>'
  };
  function icon(name) { return `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ICONS.list}</svg>`; }
  function hydrateIcons(root) { (root || document).querySelectorAll('i[data-icon]').forEach(el => { el.outerHTML = icon(el.dataset.icon); }); }

  /* ---------------- التنسيق ---------------- */
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function cur() { const d = S.db(); return C.CURRENCIES.find(c => c.code === d.settings.currency) || C.CURRENCIES[0]; }
  function fmt(n) { const c = cur(); const f = Math.pow(10, c.dec); const v = Math.round((Number(n) || 0) * f) / f; return v.toLocaleString('en-US', { maximumFractionDigits: c.dec }); }
  function fq(n, d) { const v = E.round(n, d == null ? 2 : d); return v.toLocaleString('en-US', { maximumFractionDigits: d == null ? 2 : d }); }
  function money(n, cls) { return `<span class="num ${cls || ''}">${fmt(n)}</span> <small class="cur">${esc(cur().sym)}</small>`; }
  function moneyT(n) { return fmt(n) + ' ' + cur().sym; }
  function fmtDate(s) {
    if (!s) return '';
    const p = String(s).split('-');
    return p.length === 3 ? `${Number(p[2])}/${Number(p[1])}/${p[0]}` : s;
  }
  function initials(name) { const t = String(name || '').trim(); return t ? t[0] : '؟'; }

  /* ---------------- الإشعارات والتأكيد ---------------- */
  let toastTimer = null;
  function toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  }
  function confirmBox(msg, onYes, opts) {
    opts = opts || {};
    const w = document.getElementById('confirmDlg');
    document.getElementById('confirmTitle').textContent = opts.title || 'تأكيد';
    document.getElementById('confirmText').textContent = msg;
    const yes = document.getElementById('confirmYes');
    yes.textContent = opts.yes || 'نعم، تأكيد';
    yes.className = 'btn ' + (opts.safe ? 'btn-accent' : 'btn-danger');
    w.classList.add('open');
    const close = () => { w.classList.remove('open'); yes.onclick = null; };
    yes.onclick = () => { close(); onYes && onYes(); };
    document.getElementById('confirmNo').onclick = close;
  }

  /* ---------------- النافذة السفلية ---------------- */
  let sheetOnClose = null;
  function openSheet(title, html, opts) {
    opts = opts || {};
    const sh = document.getElementById('sheet');
    sh.innerHTML = `<div class="grab"></div><div class="sheet-head"><h3>${esc(title)}</h3><button type="button" class="close-x" data-act="closeSheet" aria-label="إغلاق">${icon('x')}</button></div><div id="sheetBody">${html}</div>`;
    hydrateIcons(sh);
    sh.scrollTop = 0;
    document.getElementById('backdrop').classList.add('open');
    sh.classList.add('open');
    sheetOnClose = opts.onClose || null;
    if (opts.onOpen) opts.onOpen(sh);
    const first = sh.querySelector('[autofocus]');
    if (first) setTimeout(() => { try { first.focus(); } catch (e) {} }, 250);
  }
  function closeSheet() {
    document.getElementById('sheet').classList.remove('open');
    document.getElementById('backdrop').classList.remove('open');
    const f = sheetOnClose; sheetOnClose = null;
    if (f) f();
  }

  /* ---------------- النماذج العامة ----------------
   * fields: [{ k, label, type: text|num|tel|date|select|textarea|check, options: [[v, label]], ph, hint, half, autofocus }]
   */
  function fieldHtml(f, v) {
    const id = 'f_' + f.k;
    const val = v == null ? '' : v;
    let input;
    if (f.type === 'select') {
      input = `<select id="${id}" data-fk="${f.k}">${(f.options || []).map(o => `<option value="${esc(o[0])}"${String(o[0]) === String(val) ? ' selected' : ''}>${esc(o[1])}</option>`).join('')}</select>`;
    } else if (f.type === 'textarea') {
      input = `<textarea id="${id}" data-fk="${f.k}" placeholder="${esc(f.ph || '')}">${esc(val)}</textarea>`;
    } else if (f.type === 'check') {
      return `<label class="switch${f.half ? '' : ' span-all'}"><span>${esc(f.label)}</span><input type="checkbox" id="${id}" data-fk="${f.k}"${val ? ' checked' : ''}></label>`;
    } else if (f.type === 'html') {
      return `<div class="span-all">${f.html}</div>`;
    } else {
      const t = f.type === 'num' ? 'text" inputmode="decimal' : f.type === 'tel' ? 'tel' : f.type === 'date' ? 'date' : 'text';
      input = `<input type="${t}" id="${id}" data-fk="${f.k}" value="${esc(val)}" placeholder="${esc(f.ph || '')}"${f.autofocus ? ' autofocus' : ''}${f.type === 'tel' ? ' dir="ltr" style="text-align:right"' : ''}>`;
    }
    return `<div class="field${f.half ? '' : ' span-all'}"><label for="${id}">${esc(f.label)}</label>${input}${f.hint ? `<div class="hint">${esc(f.hint)}</div>` : ''}</div>`;
  }
  function formSheet(opts) {
    const vals = opts.values || {};
    const body = `<div class="row-2">${opts.fields.map(f => fieldHtml(f, vals[f.k])).join('')}</div>
      ${opts.extraHtml || ''}
      <div class="stack mt">
        <button type="button" class="btn btn-accent" id="formSave">${icon('check')} ${esc(opts.saveLabel || 'حفظ')}</button>
        ${opts.onDelete ? `<button type="button" class="btn btn-danger" id="formDel">${icon('trash')} ${esc(opts.deleteLabel || 'حذف')}</button>` : ''}
      </div>`;
    openSheet(opts.title, body, {
      onOpen(sh) {
        const read = () => {
          const out = {};
          sh.querySelectorAll('[data-fk]').forEach(el => { out[el.dataset.fk] = el.type === 'checkbox' ? el.checked : el.value.trim(); });
          return out;
        };
        sh.querySelector('#formSave').onclick = () => {
          const v = read();
          if (opts.validate) { const err = opts.validate(v); if (err) { toast(err); return; } }
          closeSheet();
          opts.onSave(v);
        };
        const del = sh.querySelector('#formDel');
        if (del) del.onclick = () => confirmBox(opts.deleteConfirm || 'متأكد من الحذف؟', () => { closeSheet(); opts.onDelete(); });
        if (opts.onOpen) opts.onOpen(sh, read);
      }
    });
  }
  function optionSheet(title, options, onPick, opts) {
    // options: [{ v, label, sub, icon, cls }]
    const html = (opts && opts.before || '') + `<div class="opt-list">${options.map((o, i) => `<button type="button" class="opt${o.on ? ' on' : ''}" data-oi="${i}">${o.icon ? `<span class="o-ic ${o.cls || ''}">${icon(o.icon)}</span>` : ''}<span style="flex:1;min-width:0">${esc(o.label)}${o.sub ? `<small>${esc(o.sub)}</small>` : ''}</span></button>`).join('')}</div>`;
    openSheet(title, html, {
      onOpen(sh) {
        sh.querySelectorAll('[data-oi]').forEach(b => { b.onclick = () => { const o = options[Number(b.dataset.oi)]; closeSheet(); onPick(o.v, o); }; });
      }
    });
  }

  /* ---------------- الربط المباشر بين الحقول والبيانات ----------------
   * <input data-bind="item:measure.room.l">  — الجذر يحدده BIND_ROOTS
   * data-re="1" يعيد رسم الصفحة بعد التغيير، وإلا يتم تحديث النتائج فقط (live)
   */
  const BIND_ROOTS = {};
  function getPath(obj, path) { return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj); }
  function setPath(obj, path, val) {
    const ks = path.split('.');
    let o = obj;
    for (let i = 0; i < ks.length - 1; i++) {
      if (o[ks[i]] == null || typeof o[ks[i]] !== 'object') o[ks[i]] = /^\d+$/.test(ks[i + 1]) ? [] : {};
      o = o[ks[i]];
    }
    o[ks[ks.length - 1]] = val;
  }
  function resolveBind(spec) {
    const i = spec.indexOf(':');
    const root = BIND_ROOTS[spec.slice(0, i)];
    return { obj: root ? root() : null, path: spec.slice(i + 1) };
  }
  function bv(spec) { const r = resolveBind(spec); return r.obj ? getPath(r.obj, r.path) : undefined; }
  function onBindEvent(ev) {
    const el = ev.target.closest('[data-bind]');
    if (!el) return;
    if (ev.type === 'input' && (el.tagName === 'SELECT' || el.type === 'checkbox')) return;
    const r = resolveBind(el.dataset.bind);
    if (!r.obj) return;
    let val;
    if (el.type === 'checkbox') val = el.checked;
    else if (el.dataset.t === 'num') val = el.value.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace('٫', '.').replace(',', '.');
    else if (el.dataset.t === 'int') val = Number(el.value);
    else val = el.value;
    if (el.dataset.t === 'bool') val = el.value === 'true';
    setPath(r.obj, r.path, val);
    S.save();
    if (el.dataset.re && ev.type === 'change') rerender();
    else if (el.dataset.re && el.tagName === 'SELECT') rerender();
    else live();
  }
  function seg(spec, options, cur, re) {
    // أزرار اختيار مرتبطة بقيمة: options [[v, label]]
    return `<div class="segmented">${options.map(o => `<button type="button" class="${String(o[0]) === String(cur) ? 'on' : ''}" data-act="setv" data-spec="${esc(spec)}" data-v="${esc(o[0])}"${re === false ? ' data-nore="1"' : ''}>${esc(o[1])}</button>`).join('')}</div>`;
  }
  function inp(spec, label, opts) {
    opts = opts || {};
    const v = bv(spec);
    const t = opts.text ? 'text' : 'text" inputmode="decimal';
    return `<div class="field${opts.cls ? ' ' + opts.cls : ''}">${label != null ? `<label>${label}</label>` : ''}<input type="${t}" data-bind="${esc(spec)}"${opts.text ? '' : ' data-t="num"'} value="${esc(v == null ? '' : v)}" placeholder="${esc(opts.ph || '')}"${opts.re ? ' data-re="1"' : ''}>${opts.hint ? `<div class="hint">${opts.hint}</div>` : ''}</div>`;
  }
  function mini(spec, label, opts) {
    opts = opts || {};
    const v = bv(spec);
    return `<div><span class="mini-label">${esc(label)}</span><input type="text" ${opts.text ? '' : 'inputmode="decimal" data-t="num"'} data-bind="${esc(spec)}" value="${esc(v == null ? '' : v)}" placeholder="${esc(opts.ph || '')}"${opts.re ? ' data-re="1"' : ''}></div>`;
  }
  function sel(spec, label, options, opts) {
    opts = opts || {};
    const v = bv(spec);
    return `<div class="field${opts.cls ? ' ' + opts.cls : ''}">${label != null ? `<label>${label}</label>` : ''}<select data-bind="${esc(spec)}"${opts.re ? ' data-re="1"' : ''}${opts.t ? ` data-t="${opts.t}"` : ''}>${options.map(o => `<option value="${esc(o[0])}"${String(o[0]) === String(v) ? ' selected' : ''}>${esc(o[1])}</option>`).join('')}</select>${opts.hint ? `<div class="hint">${opts.hint}</div>` : ''}</div>`;
  }
  function sw(spec, label, re) {
    return `<label class="switch"><span>${esc(label)}</span><input type="checkbox" data-bind="${esc(spec)}"${bv(spec) ? ' checked' : ''}${re !== false ? ' data-re="1"' : ''}></label>`;
  }

  /* ---------------- التنقل ---------------- */
  const VIEWS = {};
  const ACTIONS = {};
  let current = { name: 'home', args: [] };
  let currentView = null;

  function parseHash() {
    const h = (location.hash || '#/home').replace(/^#\/?/, '');
    const parts = h.split('/').filter(Boolean).map(decodeURIComponent);
    return { name: parts[0] || 'home', args: parts.slice(1) };
  }
  function go(name, ...args) {
    const h = '#/' + [name].concat(args.filter(a => a != null && a !== '')).map(encodeURIComponent).join('/');
    if (location.hash === h) render(); else location.hash = h;
  }
  function replace(name, ...args) {
    const h = '#/' + [name].concat(args.filter(a => a != null && a !== '')).map(encodeURIComponent).join('/');
    history.replaceState(null, '', h);
    navStack[navStack.length - 1] = h;
    render();
  }
  // سجل تنقل داخلي علشان زرار الرجوع يرجع للصفحة السابقة فعلاً (وزرار الرجوع في أندرويد كمان)
  const navStack = [location.hash || '#/home'];
  function onHash() {
    const h = location.hash || '#/home';
    if (navStack.length > 1 && navStack[navStack.length - 2] === h) navStack.pop();
    else if (navStack[navStack.length - 1] !== h) navStack.push(h);
  }
  function back() {
    if (navStack.length > 1) history.back();
    else {
      const p = currentView && currentView.parent ? currentView.parent.apply(null, current.args) : ['home'];
      const h = '#/' + p.map(encodeURIComponent).join('/');
      history.replaceState(null, '', h);
      navStack[0] = h;
      render();
    }
  }

  function render(keepScroll) {
    const r = parseHash();
    const sameView = r.name === current.name && r.args.join('/') === current.args.join('/');
    current = r;
    const v = VIEWS[r.name] || VIEWS.home;
    currentView = v;
    let out;
    try { out = v.render.apply(null, r.args) || {}; }
    catch (e) { console.error(e); out = { html: `<div class="empty"><p>حصلت مشكلة في عرض الصفحة</p><button class="btn btn-soft" data-act="goHome">الرجوع للرئيسية</button></div>` }; }
    if (out.redirect) { replace.apply(null, out.redirect); return; }
    const y = window.scrollY;
    // الرأس
    const head = document.getElementById('appHeader');
    const isTab = !!v.tab;
    head.innerHTML = isTab
      ? `<img class="brand-ic" src="./icons/icon-192.png" alt=""><div class="titles"><div class="sub">${esc(out.sub || 'حساباتي للمحارة والواجهات')}</div><h1>${esc(out.title || 'HESABATI PLASTER')}</h1></div>
         <button type="button" class="icon-btn" data-act="toggleTheme" aria-label="الوضع الليلي">${icon(isDark() ? 'sun' : 'moon')}</button>`
      : `<button type="button" class="icon-btn" data-act="back" aria-label="رجوع">${icon('back')}</button><div class="titles"><h1>${esc(out.title || '')}</h1>${out.sub ? `<div class="sub">${esc(out.sub)}</div>` : ''}</div>
         ${(out.actions || []).map(a => `<button type="button" class="icon-btn${a.accent ? ' accent' : ''}" data-act="${esc(a.act)}"${a.data ? Object.keys(a.data).map(k => ` data-${k}="${esc(a.data[k])}"`).join('') : ''} aria-label="${esc(a.label || '')}">${icon(a.icon)}</button>`).join('')}`;
    // المحتوى
    const main = document.getElementById('main');
    main.innerHTML = `<section class="view">${out.html || ''}</section>`;
    hydrateIcons(main);
    // شريط سفلي خاص (محرر) أو شريط التنقل
    const bar = document.getElementById('editorBar');
    if (out.bar) { bar.innerHTML = out.bar; bar.classList.remove('hidden'); hydrateIcons(bar); }
    else { bar.innerHTML = ''; bar.classList.add('hidden'); }
    document.body.classList.toggle('no-nav', !isTab);
    document.querySelectorAll('.nav-item[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === (v.tabKey || r.name)));
    if (keepScroll || sameView) window.scrollTo(0, y); else window.scrollTo(0, 0);
    if (out.after) out.after(main);
    live();
  }
  function rerender() { render(true); }
  function live() { if (currentView && currentView.live) { try { currentView.live.apply(null, current.args); } catch (e) { console.error(e); } } }

  /* ---------------- المظهر ---------------- */
  const darkQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function themeMode() { const t = S.db().settings.theme; return t === 'dark' || t === 'light' ? t : 'auto'; }
  function isDark() { const m = themeMode(); return m === 'dark' || (m === 'auto' && !!(darkQuery && darkQuery.matches)); }
  function applyTheme() {
    const m = themeMode();
    if (m === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', m);
    try { localStorage.setItem(S.THEME_KEY, m); } catch (e) {}
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', '#0b1b33');
  }
  function setTheme(m) { S.db().settings.theme = m; S.save(); applyTheme(); rerender(); }

  /* ---------------- الأحداث العامة ---------------- */
  document.addEventListener('click', ev => {
    const el = ev.target.closest('[data-act]');
    if (!el) return;
    const fn = ACTIONS[el.dataset.act];
    if (fn) { ev.preventDefault(); fn(el, ev); }
  });
  document.addEventListener('input', onBindEvent);
  document.addEventListener('change', onBindEvent);
  window.addEventListener('hashchange', () => { onHash(); closeSheet(); render(); });

  Object.assign(ACTIONS, {
    back() { back(); },
    goHome() { go('home'); },
    go(el) { go.apply(null, [el.dataset.view].concat((el.dataset.args || '').split('|').filter(Boolean))); },
    closeSheet() { closeSheet(); },
    toggleTheme() { setTheme(isDark() ? 'light' : 'dark'); },
    setTheme(el) { setTheme(el.dataset.v); },
    setv(el) {
      const r = resolveBind(el.dataset.spec);
      if (!r.obj) return;
      let v = el.dataset.v;
      if (v === 'true') v = true; else if (v === 'false') v = false;
      setPath(r.obj, r.path, v);
      S.save();
      if (el.dataset.nore) { el.parentNode.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === el)); live(); }
      else rerender();
    },
    addRow(el) {
      const r = resolveBind(el.dataset.spec);
      if (!r.obj) return;
      let arr = getPath(r.obj, r.path);
      if (!Array.isArray(arr)) { arr = []; setPath(r.obj, r.path, arr); }
      const tpl = ROW_TEMPLATES[el.dataset.tpl];
      arr.push(tpl ? tpl(el) : {});
      S.save(); rerender();
    },
    delRow(el) {
      const r = resolveBind(el.dataset.spec);
      const arr = r.obj ? getPath(r.obj, r.path) : null;
      if (!Array.isArray(arr)) return;
      arr.splice(Number(el.dataset.i), 1);
      S.save(); rerender();
    }
  });

  const ROW_TEMPLATES = {
    shape: () => ({ type: 'rect', name: '', a: '', b: '', h: '', count: 1, sign: 1 }),
    addition: () => ({ type: 'rect', name: '', a: '', b: '', h: '', count: 1, sign: 1 }),
    opening: el => {
      const k = el.dataset.k || 'door';
      if (k === 'window') return { name: 'شباك', w: 1.2, h: 1.2, count: 1, deduct: 'auto', reveal: 'none', depth: 20 };
      if (k === 'door') return { name: 'باب', w: 0.9, h: 2.1, count: 1, deduct: 'auto', reveal: 'none', depth: 20 };
      return { name: 'فتحة', w: '', h: '', count: 1, deduct: 'auto', reveal: 'none', depth: 20 };
    },
    linear: () => ({ name: '', len: '', count: 1 }),
    floor: () => ({ name: '', h: 3 }),
    extra: () => ({ name: '', mode: 'fixed', qty: '', unit: 'عدد', price: '' })
  };

  window.UI = {
    E, C, S, ICONS, icon, hydrateIcons, esc, cur, fmt, fq, money, moneyT, fmtDate, initials,
    toast, confirmBox, openSheet, closeSheet, formSheet, optionSheet, fieldHtml,
    BIND_ROOTS, getPath, setPath, bv, seg, inp, mini, sel, sw, ROW_TEMPLATES,
    VIEWS, ACTIONS, go, replace, back, render, rerender, live, current: () => current,
    applyTheme, setTheme, isDark, themeMode
  };
})();
