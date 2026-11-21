/* =========================================================
   أرزقي HVAC - إدارة ومحاسبة أعمال التكييف والتبريد
   تطبيق مستقل من عائلة أرزقي
   تصميم وتطوير: أحمد حسن عبدالله  |  واتساب: +201015421255
   © 2026 أحمد حسن عبدالله - جميع الحقوق محفوظة.
   ---------------------------------------------------------
   core.js: الثوابت، التخزين المستقل، العملات، المظهر، الأيقونات،
   النوافذ والصفحات وزر الرجوع، والتنقل بين الأقسام.
   ========================================================= */
const APP_VERSION = '1.0.2';
const APP_NAME = 'أرزقي HVAC';
const IS_BETA = /\/beta\//.test(location.pathname);
// كل مفاتيح التخزين تبدأ بهذا البادئ: لا تختلط أبداً ببيانات أرزقي الكهرباء أو النقاشة
const NS = (IS_BETA ? 'beta_' : '') + 'hesabati_hvac_';
const IN_APP = !!(window.HesabatiHvacApp && typeof window.HesabatiHvacApp.versionName === 'function');
const RELEASES_API = 'https://api.github.com/repos/AhmedHassanAbdallah/Hesabaty-HAVC/releases/latest';
const APK_URL = 'https://github.com/AhmedHassanAbdallah/Hesabaty-HAVC/releases/latest/download/hesabati-hvac.apk';
let printJobName = APP_NAME;
if (IN_APP) {
  window.open = function (u) { try { window.HesabatiHvacApp.openExternal(String(u)); } catch (e) {} return null; };
  window.print = function () { try { window.HesabatiHvacApp.print(printJobName); } catch (e) {} };
}

const KEYS = {
  settings: NS + 'settings_v1', business: NS + 'business_v1', docs: NS + 'docs_v1', customers: NS + 'customers_v1',
  devices: NS + 'devices_v1', visits: NS + 'visits_v1', payments: NS + 'payments_v1', inventory: NS + 'inventory_v1',
  workers: NS + 'workers_v1', expenses: NS + 'expenses_v1', pricelists: NS + 'pricelists_v1', contracts: NS + 'contracts_v1',
  notes: NS + 'notes_v1', matlists: NS + 'matlists_v1', backup: NS + 'last_backup', skip: NS + 'skipped_version'
};
const COLLECTIONS = ['docs', 'customers', 'devices', 'visits', 'payments', 'inventory', 'workers', 'expenses', 'pricelists', 'contracts', 'notes', 'matlists'];
const DB = {};
COLLECTIONS.forEach(c => { DB[c] = []; });
const DEFAULT_TITLE = 'فاتورة أعمال تكييف وتبريد';
let business = { title: DEFAULT_TITLE, techName: '', techPhone: '', techAddress: '', logoData: '', showLogo: false, terms: '' };
let settings = { currency: 'EGP', theme: 'auto', currentDocId: null, lastDocType: 'install', seq: {}, activePriceList: null, rates: {}, lastDays: {} };
let storageOK = true;

/* ---------------- التخزين المحلي ---------------- */
function lsGet(key) { try { return localStorage.getItem(key); } catch (e) { storageOK = false; return null; } }
function lsSet(key, val) {
  try { localStorage.setItem(key, val); return true; }
  catch (e) { showAppToast('⚠️ تعذر الحفظ: مساحة التخزين ممتلئة أو غير متاحة — خد نسخة احتياطية'); return false; }
}
function saveCol(col) { return lsSet(KEYS[col], JSON.stringify({ v: 1, items: DB[col] })); }
function loadCol(col) {
  const raw = lsGet(KEYS[col]);
  if (!raw) { DB[col] = []; return; }
  try {
    const p = JSON.parse(raw);
    DB[col] = normalizeCol(col, Array.isArray(p) ? p : (p && p.items));
  } catch (e) {
    DB[col] = [];
    // نحتفظ بالنسخة التالفة بدل ما نمسحها
    lsSet(KEYS[col] + '_corrupt_' + Date.now(), raw);
  }
}
function saveSettings() { lsSet(KEYS.settings, JSON.stringify(settings)); }
function saveBusiness() { lsSet(KEYS.business, JSON.stringify(business)); }
function loadAll() {
  try { const s = JSON.parse(lsGet(KEYS.settings) || '{}'); if (s && typeof s === 'object') settings = Object.assign(settings, s); } catch (e) {}
  try { const b = JSON.parse(lsGet(KEYS.business) || '{}'); if (b && typeof b === 'object') business = Object.assign(business, b); } catch (e) {}
  if (!settings.seq || typeof settings.seq !== 'object') settings.seq = {};
  if (!settings.rates || typeof settings.rates !== 'object') settings.rates = {};
  COLLECTIONS.forEach(loadCol);
}
function saveAll() { COLLECTIONS.forEach(saveCol); saveSettings(); saveBusiness(); }

/* ---------------- أدوات مساعدة ---------------- */
function uid(prefix) { return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function n0(v) { const x = Number(v); return isFinite(x) ? x : 0; }
function pos(v) { return Math.max(0, n0(v)); }
function round2(n) { const f = Math.pow(10, Math.max(2, CUR_DEC)); return Math.round((Number(n) || 0) * f) / f; }
function fmt(n) {
  const f = Math.pow(10, CUR_DEC);
  const v = Math.round((Number(n) || 0) * f) / f;
  return v.toLocaleString('en-US', { maximumFractionDigits: CUR_DEC });
}
function fmtN(n, d = 3) { const f = Math.pow(10, d); return (Math.round((Number(n) || 0) * f) / f).toLocaleString('en-US', { maximumFractionDigits: d }); }
function money(v) { return `${fmt(v)} ${CUR}`; }
function val(id) { const el = document.getElementById(id); return el ? el.value : ''; }
function num(id) { return parseFloat(val(id)) || 0; }
function todayISO() { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); }
function addDaysISO(iso, days) { const d = new Date((iso || todayISO()) + 'T00:00:00'); d.setDate(d.getDate() + days); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); }
function addMonthsISO(iso, months) { const d = new Date((iso || todayISO()) + 'T00:00:00'); const day = d.getDate(); d.setMonth(d.getMonth() + months); if (d.getDate() < day) d.setDate(0); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); }
function daysBetween(a, b) { return Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000); }
function fmtDate(iso) {
  if (!iso) return '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  try {
    const d = new Date(iso + 'T00:00:00');
    if (isNaN(d)) return iso;
    return d.toLocaleDateString('ar-EG-u-nu-latn', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch (e) { return iso; }
}
function initialOf(name) { return esc((name || '؟').replace(/^(أ\.|م\/|د\.|م\.)\s*/, '').trim().charAt(0) || '؟'); }
function byNewest(a, b) { return (b.date || '').localeCompare(a.date || '') || ((b.createdAt || 0) - (a.createdAt || 0)); }
function waPhone(p) { let phone = String(p || '').replace(/\D/g, ''); if (/^01\d{9}$/.test(phone)) phone = '2' + phone; return phone; }
function opt(value, label, sel) { return `<option value="${esc(value)}"${String(value) === String(sel) ? ' selected' : ''}>${esc(label)}</option>`; }
function nextNumber(prefix) {
  settings.seq[prefix] = (Number(settings.seq[prefix]) || 0) + 1;
  saveSettings();
  return `${prefix}-${String(settings.seq[prefix]).padStart(4, '0')}`;
}

function showAppToast(msg) {
  const t = document.getElementById('appToast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}
function showAppConfirm(msg, onConfirm) {
  const modal = document.getElementById('appConfirmModal');
  document.getElementById('appConfirmText').textContent = msg;
  modal.classList.add('open');
  document.getElementById('appConfirmYesBtn').onclick = () => { modal.classList.remove('open'); onConfirm(); };
  document.getElementById('appConfirmNoBtn').onclick = () => modal.classList.remove('open');
}
function copyText(text, doneMsg) {
  const done = () => showAppToast(doneMsg);
  const fallback = () => {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    ta.remove(); done();
  };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done).catch(fallback);
  else fallback();
}
function sendWhatsApp(phone, text) { window.open(`https://wa.me/${waPhone(phone)}?text=` + encodeURIComponent(text), '_blank'); }

/* ---------------- العملات (نفس نظام أرزقي) ---------------- */
const CURRENCIES = [
  { code: 'EGP', country: 'مصر', name: 'جنيه مصري', sym: 'ج.م', short: 'ج', dec: 2 },
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
let CUR = 'ج.م', CUR_SHORT = 'ج', CUR_DEC = 2;
function currencyByCode(code) { return CURRENCIES.find(c => c.code === code) || null; }
function currentCurrency() { return currencyByCode(settings.currency) || CURRENCIES[0]; }
function applyCurrency() {
  const c = currentCurrency();
  CUR = c.sym; CUR_SHORT = c.short || c.sym; CUR_DEC = c.dec;
  document.querySelectorAll('.cur').forEach(el => { el.textContent = CUR; });
  const sel = document.getElementById('currencySelect');
  if (sel) sel.value = c.code;
}
// تغيير العملة يغيّر الرمز والمنازل العشرية فقط ولا يحوّل أي مبلغ مسجل
function setCurrency(code) {
  if (!currencyByCode(code)) return;
  settings.currency = code;
  saveSettings();
  applyCurrency();
  refreshAll();
  const c = currentCurrency();
  showAppToast(`✔️ العملة: ${c.name} (${c.sym}) — اتطبقت على كل الأسعار`);
}

/* ---------------- المظهر ---------------- */
const darkQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
function themeMode() { return settings.theme === 'dark' || settings.theme === 'light' ? settings.theme : 'auto'; }
function isDarkNow() { const m = themeMode(); return m === 'dark' || (m === 'auto' && !!(darkQuery && darkQuery.matches)); }
function applyTheme() {
  const m = themeMode();
  if (m === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', m);
  const dark = isDarkNow();
  const btn = document.getElementById('themeBtn');
  if (btn) { btn.innerHTML = icon(dark ? 'sun' : 'moon'); btn.setAttribute('aria-label', dark ? 'التبديل للوضع الفاتح' : 'التبديل للوضع الليلي'); }
  [['auto', 'themeAuto'], ['light', 'themeLight'], ['dark', 'themeDark']].forEach(([k, id]) => {
    const b = document.getElementById(id);
    if (b) { b.classList.toggle('on', m === k); b.setAttribute('aria-checked', m === k ? 'true' : 'false'); }
  });
  const tag = document.getElementById('themeTag');
  if (tag) tag.textContent = m === 'auto' ? `تلقائي (${dark ? 'ليلي' : 'فاتح'})` : (m === 'dark' ? 'ليلي' : 'فاتح');
}
function setTheme(mode) { settings.theme = mode === 'dark' || mode === 'light' ? mode : 'auto'; saveSettings(); applyTheme(); }
function toggleTheme() { setTheme(isDarkNow() ? 'light' : 'dark'); showAppToast(isDarkNow() ? '🌙 الوضع الليلي' : '☀️ الوضع الفاتح'); }
if (darkQuery) { try { darkQuery.addEventListener('change', applyTheme); } catch (e) { try { darkQuery.addListener(applyTheme); } catch (e2) {} } }

/* ---------------- الأيقونات ---------------- */
const ICONS = {
  share: '<path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v13"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  arrow: '<path d="M19 12H5"/><path d="M11 18l-6-6 6-6"/>',
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
  undo: '<path d="M9 14l-5-5 5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
  save: '<path d="M5 3h11l5 5v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M7 3v5h8"/><rect x="7" y="13" width="10" height="8"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12z"/>',
  facebook: '<path d="M15 3h-2a4 4 0 0 0-4 4v3H7v4h2v7h4v-7h3l1-4h-4V7a1 1 0 0 1 1-1h2z"/>',
  file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/>',
  home: '<path d="M3 11l9-8 9 8"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
  x: '<path d="M18 6L6 18M6 6l12 12"/>',
  printer: '<path d="M6 9V2h12v7"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v8H6z"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  alert: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
  gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5"/>',
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
  pin: '<path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M9 7h7M9 11h5"/>',
  back: '<path d="M5 12h14"/><path d="M13 6l6 6-6 6"/>',
  link: '<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>',
  box: '<path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8"/>',
  cash: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 10v4M18 10v4"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>',
  users: '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0"/><path d="M16 4a4 4 0 0 1 0 8"/><path d="M22 21a7 7 0 0 0-4-6.3"/>',
  layers: '<path d="M12 2l10 5-10 5L2 7z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>',
  list: '<path d="M9 6h12M9 12h12M9 18h12"/><path d="M4 6h.01M4 12h.01M4 18h.01"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  snow: '<path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7"/><path d="M9.5 3.5L12 6l2.5-2.5M9.5 20.5L12 18l2.5 2.5M3.6 10.4L7 9.5 6.1 6.1M20.4 13.6L17 14.5l.9 3.4M6.1 17.9l.9-3.4-3.4-.9M17.9 6.1L17 9.5l3.4.9"/>',
  ac: '<rect x="2" y="4" width="20" height="10" rx="2.5"/><path d="M6 10.5h12"/><path d="M7 17.5c0 1.3-1 1.8-1 3M12 17.5c0 1.3-1 1.8-1 3M17 17.5c0 1.3-1 1.8-1 3"/>',
  wrench: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/>',
  thermo: '<path d="M14 14.8V4a2 2 0 0 0-4 0v10.8a4 4 0 1 0 4 0z"/><path d="M12 9v7"/>',
  fan: '<circle cx="12" cy="12" r="2"/><path d="M12 10c0-4 1-7 4-7 2 0 3 2 1 4l-3 3M14 12c4 0 7 1 7 4 0 2-2 3-4 1l-3-3M12 14c0 4-1 7-4 7-2 0-3-2-1-4l3-3M10 12c-4 0-7-1-7-4 0-2 2-3 4-1l3 3"/>',
  gauge: '<path d="M12 14l4-4"/><path d="M3.3 17a10 10 0 1 1 17.4 0"/><circle cx="12" cy="14" r="1.5"/>',
  droplet: '<path d="M12 2.7l5.7 5.6a8 8 0 1 1-11.4 0z"/>',
  pipe: '<path d="M2 8h9a5 5 0 0 1 5 5v9"/><path d="M2 14h5a3 3 0 0 1 3 3v5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
  tag: '<path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z"/><circle cx="7" cy="7" r="1.5"/>',
  chart: '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  camera: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
  hard: '<path d="M2 18h20"/><path d="M4 18v-3a8 8 0 0 1 16 0v3"/><path d="M10 7V4h4v3"/>',
  swap: '<path d="M17 3l4 4-4 4"/><path d="M3 7h18"/><path d="M7 21l-4-4 4-4"/><path d="M21 17H3"/>',
  receipt: '<path d="M5 2h14v20l-3-2-2 2-2-2-2 2-2-2-3 2z"/><path d="M9 7h6M9 11h6M9 15h4"/>',
  truck: '<rect x="1" y="6" width="14" height="10" rx="1"/><path d="M15 9h4l3 3v4h-7"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/>',
  report: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 17v-3M12 17v-6M15 17v-4"/>',
  star: '<path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>'
};
function icon(name) { return `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`; }
function hydrateIcons(root = document) { root.querySelectorAll('i[data-icon]').forEach(el => { el.outerHTML = icon(el.dataset.icon); }); }

/* =========================================================
   النوافذ المنبثقة والصفحات + زر الرجوع في أندرويد
   ========================================================= */
const overlayStack = [];
const PAGE_MAX = 7;
const pageStack = []; // [{key, args}]
function sheetOverlay(name, onClose) {
  return { open: () => toggleSheet(name, true), close: () => { toggleSheet(name, false); if (onClose) onClose(); } };
}
const OVERLAYS = {
  create: sheetOverlay('create'),
  docType: sheetOverlay('docType'),
  actions: sheetOverlay('actions'),
  form: sheetOverlay('form', () => { formCtx.form = null; }),
  form2: sheetOverlay('form2', () => { formCtx.form2 = null; }),
  pick: sheetOverlay('pick', () => { pickCtx = null; }),
  appUpd: sheetOverlay('appUpd'),
  editor: {
    open: () => { document.body.classList.add('in-editor'); },
    close: () => { document.body.classList.remove('in-editor'); showView(lastTab); }
  },
  preview: {
    open: () => { document.getElementById('printPreviewModal').style.display = 'block'; },
    close: () => { document.getElementById('printPreviewModal').style.display = 'none'; }
  }
};
for (let i = 1; i <= PAGE_MAX; i++) {
  OVERLAYS['page' + i] = {
    open: () => { const pg = document.getElementById('page' + i); pg.style.zIndex = 150 + overlayStack.length; pg.classList.add('open'); pg.scrollTop = 0; },
    close: () => {
      document.getElementById('page' + i).classList.remove('open');
      pageStack.length = Math.min(pageStack.length, i - 1);
      refreshAll();
    }
  };
}
function toggleSheet(name, open) {
  const s = document.getElementById(name + 'Sheet');
  s.classList.toggle('open', open);
  if (open) s.style.zIndex = 210 + overlayStack.length * 2;
  const b = document.getElementById(name + 'Backdrop');
  b.classList.toggle('open', open);
  if (open) b.style.zIndex = 209 + overlayStack.length * 2;
}
function lockBodyScroll() { document.body.style.overflow = overlayStack.some(n => n !== 'editor') ? 'hidden' : ''; }
function openOverlay(name) {
  if (overlayStack[overlayStack.length - 1] === name) return;
  OVERLAYS[name].open();
  overlayStack.push(name);
  lockBodyScroll();
  try { history.pushState({ ovDepth: overlayStack.length }, ''); } catch (e) {}
}
function closeOverlay() {
  if (!overlayStack.length) return;
  try { history.back(); } catch (e) { popOverlay(); }
}
function popOverlay() {
  const name = overlayStack.pop();
  if (name) OVERLAYS[name].close();
  lockBodyScroll();
}
window.addEventListener('popstate', e => {
  const confirmModal = document.getElementById('appConfirmModal');
  if (confirmModal.classList.contains('open')) confirmModal.classList.remove('open');
  const depth = (e.state && e.state.ovDepth) || 0;
  while (overlayStack.length > depth) popOverlay();
});
function inEditor() { return overlayStack.includes('editor'); }
function goBackThen(n, fn) {
  if (n <= 0) { fn(); return; }
  const handler = () => { window.removeEventListener('popstate', handler); setTimeout(fn, 30); };
  window.addEventListener('popstate', handler);
  try { history.go(-n); } catch (e) { window.removeEventListener('popstate', handler); for (let i = 0; i < n; i++) popOverlay(); fn(); }
}
// يقفل النوافذ المنبثقة فوق صفحة الفاتورة (ويسيب الصفحة نفسها) ثم ينفذ الإجراء
function closeAllThen(fn) { const ed = overlayStack.lastIndexOf('editor'); goBackThen(overlayStack.length - (ed + 1), fn); }
function closeEverythingThen(fn) { goBackThen(overlayStack.length, fn); }
function closeTopThen(fn) { goBackThen(overlayStack.length ? 1 : 0, fn); }
// يقفل النوافذ المنبثقة (sheets) بس ويسيب الصفحات المفتوحة
function closeSheetsThen(fn) {
  let n = 0;
  for (let i = overlayStack.length - 1; i >= 0; i--) { const nm = overlayStack[i]; if (/^page\d$/.test(nm) || nm === 'editor') break; n++; }
  goBackThen(n, fn);
}
function exitEditor() { if (inEditor()) closeEverythingThen(() => {}); }
function runAction(fn) { closeAllThen(fn); }

/* ---------------- الصفحات (عميل، جهاز، زيارة، أقسام...) ---------------- */
const PAGES = {}; // key -> function(...args) => {title, sub, actions, html, after}
function openPage(key, ...args) {
  if (!PAGES[key]) return;
  // نفس الصفحة مفتوحة تحت؟ ارجع لها بدل ما تفتح نسخة تانية
  const existing = pageStack.findIndex(p => p.key === key && JSON.stringify(p.args) === JSON.stringify(args));
  if (existing >= 0) {
    const level = existing + 1;
    const idx = overlayStack.lastIndexOf('page' + level);
    goBackThen(overlayStack.length - 1 - idx, () => renderPage(level));
    return;
  }
  if (pageStack.length >= PAGE_MAX) { showAppToast('اقفل بعض الصفحات المفتوحة الأول'); return; }
  pageStack.push({ key, args });
  const level = pageStack.length;
  renderPage(level);
  openOverlay('page' + level);
  const pg = document.getElementById('page' + level);
  requestAnimationFrame(() => fitStats(pg));
}
function renderPage(level) {
  const p = pageStack[level - 1];
  if (!p) return;
  const r = PAGES[p.key](...p.args);
  if (!r) return;
  const pg = document.getElementById('page' + level);
  const keepScroll = pg.scrollTop;
  pg.querySelector('h1').textContent = r.title || '';
  pg.querySelector('.sub').textContent = r.sub || '';
  pg.querySelector('.pg-actions').innerHTML = (r.actions || []).map((a, i) =>
    `<button type="button" class="icon-btn${a.accent ? ' accent' : ''}" data-act="${i}" aria-label="${esc(a.label || '')}">${icon(a.icon)}</button>`).join('');
  pg.querySelectorAll('.pg-actions button').forEach(b => { b.onclick = () => r.actions[+b.dataset.act].onClick(); });
  const body = document.getElementById('page' + level + 'Body');
  body.oninput = null; body.onchange = null; body.onclick = null;
  body.innerHTML = r.html;
  if (r.after) r.after(body);
  fitStats(pg);
  pg.scrollTop = keepScroll;
}
function refreshPages() { for (let i = 1; i <= pageStack.length; i++) renderPage(i); }
function topPage() { return pageStack[pageStack.length - 1] || null; }

// الأرقام الكبيرة في مربعات الملخص: بيصغر الخط لحد ما الرقم يدخل كامل في إطاره
function fitStats(root) {
  (root || document).querySelectorAll('.hero-stat strong, .hs-stats strong, .mini-stats strong').forEach(el => {
    el.style.fontSize = '';
    if (!el.offsetParent) return;
    let size = parseFloat(getComputedStyle(el).fontSize) || 14;
    for (let i = 0; i < 10 && el.scrollWidth > el.clientWidth + 1 && size > 9; i++) { size -= 1; el.style.fontSize = size + 'px'; }
  });
}
window.addEventListener('resize', () => fitStats());
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => fitStats());

/* ---------------- النماذج المنبثقة (form / form2) ---------------- */
const formCtx = { form: null, form2: null };
// يفتح نموذج في أول مستوى فاضي
function openForm(cfg) {
  const level = formCtx.form && overlayStack.includes('form') ? 'form2' : 'form';
  formCtx[level] = cfg;
  document.getElementById(level + 'Title').textContent = cfg.title || '';
  const body = document.getElementById(level + 'Body');
  // نفس الحاوية بتتستخدم لنماذج مختلفة: امسح معالجات النموذج السابق
  body.oninput = null; body.onchange = null; body.onclick = null;
  body.innerHTML = cfg.html || '';
  const foot = document.getElementById(level + 'Foot');
  foot.innerHTML = `
    ${cfg.onSave ? `<div class="btn-row"><button type="button" class="btn btn-primary" data-f="save">${esc(cfg.saveText || 'حفظ')}</button><button type="button" class="btn btn-ghost" data-f="cancel">إلغاء</button></div>` : `<button type="button" class="btn btn-ghost" data-f="cancel">إغلاق</button>`}
    ${cfg.onDelete ? `<button type="button" class="btn btn-danger" data-f="del">${icon('trash')} ${esc(cfg.deleteText || 'حذف')}</button>` : ''}`;
  foot.querySelectorAll('button').forEach(b => {
    b.onclick = () => {
      const c = formCtx[level];
      if (!c) return;
      if (b.dataset.f === 'cancel') closeOverlay();
      else if (b.dataset.f === 'save') { if (c.onSave(body) !== false) { closeOverlay(); refreshAll(); } }
      else if (b.dataset.f === 'del') c.onDelete(body);
    };
  });
  if (cfg.after) cfg.after(body);
  openOverlay(level);
  document.getElementById(level + 'Sheet').scrollTop = 0;
  return body;
}

/* ---------------- منتقي القوائم ---------------- */
let pickCtx = null;
function openPicker(cfg) {
  pickCtx = cfg;
  document.getElementById('pickTitle').textContent = cfg.title || 'اختيار';
  const s = document.getElementById('pickSearch');
  s.value = '';
  s.parentElement.classList.toggle('hidden', cfg.search === false);
  renderPickList();
  openOverlay('pick');
}
function renderPickList() {
  if (!pickCtx) return;
  const q = val('pickSearch').trim();
  const items = pickCtx.items.filter(it => !q || (it.title + ' ' + (it.sub || '') + ' ' + (it.keys || '')).includes(q));
  let html = items.map((it, i) => `<button type="button" data-i="${pickCtx.items.indexOf(it)}"><span class="s-av"${it.color ? ` style="background:${it.color};color:#fff"` : ''}>${it.avatar || icon(it.icon || 'user')}</span><span>${esc(it.title)}${it.sub ? `<small>${it.sub}</small>` : ''}</span></button>`).join('');
  if (pickCtx.addNew) html += `<button type="button" data-new="1"><span class="s-av add">${icon('plus')}</span><span>${esc(pickCtx.addNew.label(q))}${pickCtx.addNew.sub ? `<small>${esc(pickCtx.addNew.sub)}</small>` : ''}</span></button>`;
  if (!html) html = `<p class="hint" style="padding:14px;text-align:center">${esc(pickCtx.empty || 'لا توجد عناصر')}</p>`;
  const box = document.getElementById('pickList');
  box.innerHTML = html;
  box.onclick = e => {
    const b = e.target.closest('button');
    if (!b || !pickCtx) return;
    const ctx = pickCtx;
    if (b.dataset.new) { closeTopThen(() => ctx.addNew.fn(val('pickSearch').trim())); return; }
    const it = ctx.items[+b.dataset.i];
    closeTopThen(() => ctx.onPick(it));
  };
}

/* ---------------- التنقل بين الأقسام ---------------- */
const VIEW_TITLES = { home: 'أرزقي | Arzoqi', info: 'بيانات الفاتورة', lines: 'بنود الأعمال', summary: 'الحساب والمدفوعات', docs: 'الفواتير والمستندات', ledger: 'العملاء', more: 'المزيد' };
const EDITOR_VIEWS = ['info', 'lines', 'summary'];
let currentView = 'home';
let lastTab = 'home';
function switchView(key) {
  if (EDITOR_VIEWS.includes(key)) { openEditor(key); return; }
  lastTab = key;
  if (inEditor() || overlayStack.length) { closeEverythingThen(() => showView(key)); return; }
  showView(key);
}
function openEditor(step) {
  if (!inEditor()) openOverlay('editor');
  showView(step || 'info');
}
function showView(key) {
  currentView = key;
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + key));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.id === 'navBtn-' + key));
  const order = EDITOR_VIEWS.indexOf(key);
  EDITOR_VIEWS.forEach((v, i) => { const b = document.getElementById('stepBtn-' + v); b.classList.toggle('on', i === order); b.classList.toggle('done', order > i); });
  document.getElementById('headerTitle').textContent = VIEW_TITLES[key] || '';
  document.getElementById('tabTitle').textContent = VIEW_TITLES[key] || 'أرزقي | Arzoqi';
  document.getElementById('addLineFab').classList.toggle('hidden', key !== 'lines');
  renderCurrentView();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function renderCurrentView() {
  const k = currentView;
  if (EDITOR_VIEWS.includes(k)) renderEditor();
  else if (k === 'home') renderHome();
  else if (k === 'docs') renderDocsView();
  else if (k === 'ledger') renderLedger();
  else if (k === 'more') renderMore();
  fitStats(document.getElementById('editorApp'));
}
// إعادة رسم كل ما هو ظاهر بعد أي تعديل في البيانات
function refreshAll() {
  syncPaymentsToCustomers();
  renderCurrentView();
  if (inEditor() && !EDITOR_VIEWS.includes(currentView)) renderEditor();
  refreshPages();
}
