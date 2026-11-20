/*
 * أرزقي للجبس والديكورات — أدوات الواجهة المشتركة
 * أيقونات، تنسيق الأرقام والعملة، النوافذ المنبثقة، الرسائل، بناء النماذج وقراءتها
 * © 2026 أحمد حسن عبدالله - جميع الحقوق محفوظة.
 */
'use strict';
const HGc = HG.core, HGf = HG.finance;
const IN_APP = !!(window.HesabatyApp && typeof window.HesabatyApp.versionName === 'function');
let printJobName = 'أرزقي للجبس';
if (IN_APP) {
  window.open = function (u) { try { window.HesabatyApp.openExternal(String(u)); } catch (e) {} return null; };
  window.print = function () { try { window.HesabatyApp.print(printJobName); } catch (e) {} };
}

/* ---------------- أيقونات (نفس أسلوب التطبيق الأصلي) ---------------- */
const ICONS = {
  share: '<path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v13"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  users: '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0"/><path d="M16 4a4 4 0 0 1 0 8"/><path d="M22 21a7 7 0 0 0-4-6.3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
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
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M9 7h7M9 11h5"/>',
  back: '<path d="M5 12h14"/><path d="M13 6l6 6-6 6"/>',
  box: '<path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8"/>',
  cash: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 10v4M18 10v4"/>',
  layers: '<path d="M12 2l10 5-10 5L2 7z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>',
  list: '<path d="M9 6h12M9 12h12M9 18h12"/><path d="M4 6h.01M4 12h.01M4 18h.01"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  ceiling: '<path d="M2 4h20"/><path d="M6 4v3M12 4v3M18 4v3"/><rect x="3" y="7" width="18" height="4" rx="1"/><path d="M9 11v2h6v-2"/><path d="M12 13v3"/><circle cx="12" cy="18" r="2"/>',
  wall: '<rect x="3" y="3" width="18" height="18" rx="1"/><path d="M3 9h18M3 15h18M9 3v6M15 9v6M9 15v6"/>',
  partition: '<path d="M3 21V3h4v18M17 21V3h4v18"/><path d="M7 8h10M7 16h10"/><path d="M12 8v8"/>',
  column: '<path d="M7 3h10M7 21h10"/><rect x="8" y="5" width="8" height="14"/><path d="M11 5v14"/>',
  bulb: '<path d="M9 18h6M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7V16h8v-1.3A7 7 0 0 0 12 2z"/>',
  frame: '<rect x="3" y="4" width="18" height="16" rx="1"/><rect x="7" y="8" width="10" height="8"/>',
  cornice: '<path d="M3 4h18"/><path d="M3 4c0 4 2 5 6 5h12"/><path d="M3 4v16"/>',
  flower: '<circle cx="12" cy="12" r="2.5"/><path d="M12 2c2 3 2 5 0 7-2-2-2-4 0-7zM12 22c-2-3-2-5 0-7 2 2 2 4 0 7zM2 12c3-2 5-2 7 0-2 2-4 2-7 0zM22 12c-3 2-5 2-7 0 2-2 4-2 7 0z"/>',
  bucket: '<path d="M4 7h16l-2 13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z"/><path d="M4 7a8 3 0 0 1 16 0"/>',
  trowel: '<path d="M3 21l7-7"/><path d="M10 14l8-8 3 3-8 8z"/>',
  truck: '<rect x="1" y="5" width="14" height="11" rx="1"/><path d="M15 9h4l3 3v4h-7z"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>',
  hammer: '<path d="M14 6l4 4"/><path d="M3 21l10-10"/><path d="M12 4l3-1 6 6-1 3-3-3-2 2-4-4 2-2z"/>',
  chart: '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 6-6"/>',
  note: '<path d="M4 4h16v12l-4 4H4z"/><path d="M16 20v-4h4"/><path d="M8 9h8M8 13h5"/>',
  hardhat: '<path d="M2 18h20"/><path d="M4 18v-3a8 8 0 0 1 16 0v3"/><path d="M10 7V5h4v2"/>',
  store: '<path d="M3 9l2-5h14l2 5"/><path d="M3 9v11h18V9"/><path d="M3 9h18"/><path d="M9 20v-6h6v6"/>',
  ruler: '<path d="M3 17L17 3l4 4L7 21z"/><path d="M7 13l2 2M10 10l2 2M13 7l2 2"/>',
  tag: '<path d="M20 12l-8 8-9-9V3h8z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  minus: '<path d="M5 12h14"/>'
};
function icon(name) { return `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`; }
function hydrateIcons(root) { (root || document).querySelectorAll('i[data-icon]').forEach(el => { el.outerHTML = icon(el.dataset.icon); }); }

/* ---------------- تنسيق ---------------- */
function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function cur() { return HG.CURRENCIES.find(c => c.code === DB().settings.currency) || HG.CURRENCIES[0]; }
function fmt(n, dec) {
  const d = dec == null ? cur().dec : dec;
  const v = HGc.round(Number(n) || 0, d);
  return v.toLocaleString('en-US', { maximumFractionDigits: d });
}
function fq(n) { return (HGc.round(Number(n) || 0, 3)).toLocaleString('en-US', { maximumFractionDigits: 3 }); }
function money(n) { return `${fmt(n)} ${cur().sym}`; }
function uid(p) { return HG.store.uid(p); }
function todayISO() { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); }
function fmtDate(iso) {
  if (!iso) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso));
  return m ? `${+m[3]}/${+m[2]}/${m[1]}` : String(iso);
}
function initial(name) { return esc((name || '؟').replace(/^(أ\.|م\/|د\.|ح\/)\s*/, '').trim().charAt(0) || '؟'); }
function DB() { return HG.store.db; }
function persist() { HG.store.save(); }
function byId(list, id) { return (DB()[list] || []).find(x => x.id === id) || null; }
function $(id) { return document.getElementById(id); }

/* ---------------- رسائل وتأكيد ---------------- */
let toastTimer = null;
function toast(msg) {
  const t = $('toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}
let confirmCb = null;
function ask(msg, onYes, yesText, danger) {
  $('confirmText').textContent = msg;
  const b = $('confirmYes');
  b.textContent = yesText || 'تأكيد';
  b.className = 'btn ' + (danger === false ? 'btn-accent' : 'btn-danger');
  confirmCb = onYes;
  $('confirmDialog').classList.add('open');
}
function confirmAnswer(yes) {
  $('confirmDialog').classList.remove('open');
  const cb = confirmCb; confirmCb = null;
  if (yes && cb) cb();
}

/* ---------------- النوافذ المنبثقة (Sheet) والصفحات (Page) ---------------- */
const stack = []; // [{type:'sheet'|'page', el, onClose}]
function lockScroll() { document.body.style.overflow = stack.length ? 'hidden' : ''; }
function openSheet(title, html, opts) {
  opts = opts || {};
  const sh = $('sheet');
  $('sheetTitle').textContent = title;
  $('sheetBody').innerHTML = html;
  hydrateIcons($('sheetBody'));
  // لو فيه شيت مفتوح بالفعل: نستبدله
  const i = stack.findIndex(s => s.type === 'sheet');
  const replacing = i >= 0;
  if (replacing) stack.splice(i, 1);
  stack.push({ type: 'sheet', el: sh, onClose: opts.onClose });
  $('backdrop').classList.add('open'); sh.classList.add('open'); sh.scrollTop = 0;
  lockScroll();
  pushHist();
  if (opts.focus) setTimeout(() => { const f = sh.querySelector(opts.focus); if (f) f.focus(); }, 280);
}
function closeSheet(silent) {
  const i = stack.findIndex(s => s.type === 'sheet');
  if (i < 0) return;
  const s = stack.splice(i, 1)[0];
  $('sheet').classList.remove('open'); $('backdrop').classList.remove('open');
  lockScroll();
  if (s.onClose) s.onClose();
  syncHist();
}
let pageSeq = 0;
function openPage(html, opts) {
  opts = opts || {};
  const el = document.createElement('div');
  el.className = 'page-overlay open lvl' + Math.min(3, stack.filter(s => s.type === 'page').length + 1);
  el.dataset.page = opts.name || ('p' + (++pageSeq));
  el.innerHTML = html;
  hydrateIcons(el);
  document.body.appendChild(el);
  stack.push({ type: 'page', el, onClose: opts.onClose, name: el.dataset.page, render: opts.render });
  lockScroll();
  pushHist();
  return el;
}
function topPage() { for (let i = stack.length - 1; i >= 0; i--) if (stack[i].type === 'page') return stack[i]; return null; }
function closePage(silent) {
  for (let i = stack.length - 1; i >= 0; i--) {
    if (stack[i].type !== 'page') continue;
    const p = stack.splice(i, 1)[0];
    p.el.remove();
    lockScroll();
    if (p.onClose) p.onClose();
    syncHist();
    refreshPages();
    return;
  }
}
function closeTop() {
  const t = stack[stack.length - 1];
  if (!t) return false;
  if (t.type === 'sheet') closeSheet(true); else closePage(true);
  return true;
}
function closeAll() { while (stack.length) closeTop(); }
/** إعادة رسم الصفحات المفتوحة بعد أي تعديل */
function refreshPages() { stack.forEach(s => { if (s.type === 'page' && s.render) { const y = s.el.scrollTop; s.render(s.el); hydrateIcons(s.el); s.el.scrollTop = y; } }); }
/* زر الرجوع في الموبايل يقفل آخر نافذة مفتوحة
   سجل واحد فقط في history طول ما فيه نوافذ مفتوحة (بيمنع الرجوع الزيادة خارج التطبيق) */
let skipPop = 0, guard = false;
function printOpen() { const m = $('printPreviewModal'); return !!m && m.style.display === 'block'; }
function overlayCount() { return stack.length + (printOpen() ? 1 : 0); }
function pushHist() { if (!guard) { history.pushState({ hg: 1 }, ''); guard = true; } }
function syncHist() { setTimeout(() => { if (guard && overlayCount() === 0) { guard = false; skipPop++; history.back(); } }, 0); }
window.addEventListener('popstate', () => {
  if (skipPop > 0) { skipPop--; return; }
  guard = false;
  if ($('confirmDialog').classList.contains('open')) confirmAnswer(false);
  else if (printOpen()) closePrint(true);
  else if (stack.length) closeTop();
  else if (typeof currentView !== 'undefined' && currentView !== 'home') switchView('home');
  if (overlayCount() > 0) pushHist();
});

function pageHead(title, sub, right) {
  return `<div class="page-head"><header class="app-header">
    <button type="button" class="icon-btn" onclick="closePage()" aria-label="رجوع"><i data-icon="back"></i></button>
    <div class="titles"><h1>${esc(title)}</h1>${sub ? `<div class="sub">${esc(sub)}</div>` : ''}</div>${right || ''}
  </header></div>`;
}

/* ---------------- بناء النماذج ---------------- */
// كل حقل يحمل data-k = اسم المفتاح، وقوائم الصفوف داخل data-rows
function attrs(o) { return Object.keys(o).filter(k => o[k] != null && o[k] !== false).map(k => o[k] === true ? k : `${k}="${esc(o[k])}"`).join(' '); }
function fNum(k, label, val, o) {
  o = o || {};
  const inp = `<input type="number" inputmode="decimal" step="any" ${attrs({ 'data-k': k, value: val == null ? '' : val, placeholder: o.ph == null ? '' : o.ph, min: o.min == null ? '0' : o.min, id: o.id, oninput: o.oninput })}>`;
  return `<div class="field${o.wide ? ' wide' : ''}"><label>${esc(label)}</label>${o.unit ? `<div class="unit-in">${inp}<span class="u">${esc(o.unit)}</span></div>` : inp}${o.hint ? `<div class="hint">${esc(o.hint)}</div>` : ''}</div>`;
}
function fText(k, label, val, o) {
  o = o || {};
  return `<div class="field${o.wide ? ' wide' : ''}"><label>${esc(label)}</label><input type="${o.type || 'text'}" ${attrs({ 'data-k': k, value: val == null ? '' : val, placeholder: o.ph || '', id: o.id, inputmode: o.inputmode, dir: o.dir, list: o.list, oninput: o.oninput, autocomplete: 'off' })}>${o.hint ? `<div class="hint">${esc(o.hint)}</div>` : ''}</div>`;
}
function fArea(k, label, val, o) { o = o || {}; return `<div class="field wide"><label>${esc(label)}</label><textarea data-k="${k}" placeholder="${esc(o.ph || '')}" rows="${o.rows || 3}">${esc(val || '')}</textarea></div>`; }
function fSel(k, label, val, options, o) {
  o = o || {};
  const opts = Array.isArray(options) ? options.map(x => typeof x === 'object' ? x : { v: x, t: x }) : Object.keys(options).map(v => ({ v, t: typeof options[v] === 'object' ? options[v].name : options[v] }));
  return `<div class="field${o.wide ? ' wide' : ''}"><label>${esc(label)}</label><select ${attrs({ 'data-k': k, id: o.id, onchange: o.onchange })}>${opts.map(x => `<option value="${esc(x.v)}"${String(x.v) === String(val) ? ' selected' : ''}>${esc(x.t)}</option>`).join('')}</select>${o.hint ? `<div class="hint">${esc(o.hint)}</div>` : ''}</div>`;
}
function fChk(k, label, val, o) { o = o || {}; return `<label class="chk${o.wide === false ? '' : ' field wide'}"><input type="checkbox" data-k="${k}"${val ? ' checked' : ''}${o.onchange ? ` onchange="${esc(o.onchange)}"` : ''}><span>${esc(label)}</span></label>`; }

/** قراءة النموذج: يرجّع كائن بالقيم (الأرقام كأرقام، والفاضي '') */
function readForm(root) {
  const out = {};
  root.querySelectorAll('[data-k]').forEach(el => {
    if (el.closest('[data-rows]') && el.closest('[data-rows]') !== root && root.contains(el.closest('[data-rows]'))) return;
    out[el.dataset.k] = valOf(el);
  });
  root.querySelectorAll('[data-rows]').forEach(box => {
    if (box.parentElement.closest('[data-rows]')) return;
    out[box.dataset.rows] = Array.from(box.querySelectorAll(':scope > .row-item')).map(r => {
      const o = {}; r.querySelectorAll('[data-k]').forEach(el => { o[el.dataset.k] = valOf(el); }); return o;
    });
  });
  return out;
}
function valOf(el) {
  if (el.type === 'checkbox') return el.checked;
  if (el.type === 'number') { const v = el.value.trim(); return v === '' ? '' : parseFloat(v); }
  return el.value;
}
function rowsField(key, cols, rows, o) {
  o = o || {};
  const list = rows && rows.length ? rows : [{}];
  return `<div class="rows-box" data-rows="${key}" data-cols='${esc(JSON.stringify(cols))}' data-label="${esc(o.label || 'بند')}" data-oninput="${esc(o.oninput || '')}">${list.map((r, i) => rowHTML(cols, r, i, o)).join('')}</div>
    <button type="button" class="btn btn-soft btn-sm" style="margin-bottom:12px" onclick="addRow(this.previousElementSibling)"><i data-icon="plus"></i> ${esc(o.add || 'إضافة')}</button>`;
}
function rowHTML(cols, r, i, o) {
  o = o || {};
  const inner = cols.map(c => {
    const v = r[c.k] != null ? r[c.k] : (c.def != null ? c.def : '');
    const oi = o.oninput || '';
    if (c.type === 'hidden') return `<input type="hidden" data-k="${c.k}" value="${esc(v)}">`;
    if (c.type === 'sel') return fSel(c.k, c.label, v, c.opts, { wide: c.wide, onchange: oi });
    if (c.type === 'text') return fText(c.k, c.label, v, { ph: c.ph, wide: c.wide, oninput: oi });
    if (c.type === 'chk') return fChk(c.k, c.label, v, { onchange: oi });
    return fNum(c.k, c.label, v, { ph: c.ph, unit: c.unit, wide: c.wide, oninput: oi });
  }).join('');
  return `<div class="row-item"><div class="row-head"><span class="n">${i + 1}</span><span>${esc(o.label || 'بند')}</span><span class="sp"></span><button type="button" class="row-del" onclick="delRow(this)" aria-label="حذف">${icon('trash')}</button></div><div class="row-cols" style="--cols:${o.colsN || Math.min(cols.length, 3)}">${inner}</div></div>`;
}
function addRow(box) {
  const cols = JSON.parse(box.dataset.cols);
  const div = document.createElement('div');
  const n = box.querySelectorAll(':scope > .row-item').length;
  const colsN = (box.querySelector('.row-cols') || {}).style ? (box.querySelector('.row-cols') || { style: {} }).style.getPropertyValue('--cols') : '';
  div.innerHTML = rowHTML(cols, {}, n, { label: box.dataset.label, oninput: box.dataset.oninput, colsN: colsN || undefined });
  const row = div.firstElementChild;
  box.appendChild(row);
  const f = row.querySelector('input'); if (f) f.focus();
  if (box.dataset.oninput) try { (new Function(box.dataset.oninput))(); } catch (e) {}
}
function delRow(btn) {
  const row = btn.closest('.row-item'), box = row.parentElement;
  if (box.querySelectorAll(':scope > .row-item').length <= 1) { row.querySelectorAll('input').forEach(i => { if (i.type === 'checkbox') i.checked = false; else i.value = ''; }); }
  else row.remove();
  box.querySelectorAll(':scope > .row-item .row-head .n').forEach((n, i) => { n.textContent = i + 1; });
  if (box.dataset.oninput) try { (new Function(box.dataset.oninput))(); } catch (e) {}
}

/* ---------------- مشاركة ونسخ ---------------- */
function copyText(text, msg) {
  const done = () => toast(msg || '✔️ اتنسخ');
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text, done));
  else fallbackCopy(text, done);
}
function fallbackCopy(text, done) {
  const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); done(); } catch (e) { toast('مقدرناش ننسخ — انسخ يدوي'); }
  ta.remove();
}
function waPhone(p) {
  let d = String(p || '').replace(/[^\d+]/g, '');
  if (!d) return '';
  if (d.startsWith('+')) return d.slice(1);
  if (d.startsWith('00')) return d.slice(2);
  if (d.startsWith('01') && d.length === 11 && cur().code === 'EGP') return '2' + d;
  return d;
}
function sendWhatsApp(text, phone) {
  const n = waPhone(phone);
  window.open(`https://wa.me/${n}?text=${encodeURIComponent(text)}`, '_blank');
}
function downloadText(name, mime, text) {
  if (IN_APP && window.HesabatyApp.saveFile) { try { window.HesabatyApp.saveFile(name, mime, text); return; } catch (e) {} }
  const blob = new Blob([text], { type: mime });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
