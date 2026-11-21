/*
 * أرزقي — الفاتورة الموحدة لكل الأقسام.
 *
 * كل قسم بيحسب أرقامه بنفسه (زي ما هو) وبيبعتها هنا، والملف ده بيرسم الفاتورة بشكل واحد:
 *   1) فوق: بيانات الصنايعي + اللوجو + التليفون (من "بياناتي في الفاتورة" في أرزقي، ولو فاضية من إعدادات القسم)
 *   2) العميل في سطر واحد: الاسم · التليفون · العنوان — وتحته ملحوظة العميل بخط صغير
 *   3) جداول البنود بتاعة القسم (نفس محتواها) بتنسيق موحد
 *   4) صندوق الحساب: بنود الحساب (المصنعية، الخامات على العميل، العمالة على العميل …) ← الإجمالي ← الواصل من العميل ← المتبقي
 *   5) ختم "تم السداد بالكامل" لو العميل دفع كل المبلغ
 *   6) خانة ضمان قابلة للتعديل (بتتحفظ لكل فاتورة)
 *   7) تحت: "تم التصدير من خلال تطبيق" + لوجو أرزقي
 *
 * ArzaqiInvoice.render({
 *   section, docKey, docLabel, number, date, billable,
 *   business: { name, trade, phone, logo },             // احتياطي لو "بياناتي" فاضية
 *   client: { name, phone, address, note },
 *   chips: [html], bodyHTML, notesHTML,
 *   totals: { lines: [[label, amount, sign]], total, totalLabel, paid, paidLabel },
 *   warranty, money: v => '1,000 ج.م', signLabel
 * }) → html
 */
(function () {
  'use strict';
  var PROFILE_KEY = 'arzaqi_profile_v1';
  var EXTRA_KEY = 'arzaqi_inv_extra_v1';
  var me = document.currentScript;
  var BASE = (me && me.src) ? me.src.replace(/[^/]*$/, '') : '../../Shared-Assets/brand/';

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function readJSON(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } }
  function profile() { return readJSON(PROFILE_KEY, {}) || {}; }
  function extras() { return readJSON(EXTRA_KEY, {}) || {}; }
  function extraFor(key) { return (extras()[key]) || {}; }
  function saveExtra(key, patch) {
    if (!key) return;
    var all = extras(); var cur = all[key] || {};
    for (var k in patch) cur[k] = patch[k];
    cur.updatedAt = new Date().toISOString();
    all[key] = cur;
    var keys = Object.keys(all);
    if (keys.length > 800) { keys.sort(function (a, b) { return String(all[a].updatedAt).localeCompare(String(all[b].updatedAt)); }); delete all[keys[0]]; }
    try { localStorage.setItem(EXTRA_KEY, JSON.stringify(all)); } catch (e) {}
  }
  var CE = 'contenteditable="true"';
  var ICON = {
    phone: '<svg viewBox="0 0 24 24"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg>',
    user: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
    pin: '<svg viewBox="0 0 24 24"><path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>',
    shield: '<svg viewBox="0 0 24 24"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/></svg>'
  };

  function render(m) {
    var money = m.money || function (v) { return String(v); };
    var p = profile();
    var b = m.business || {};
    var name = p.name || b.name || '';
    var trade = p.name ? (p.trade || '') : (p.trade || b.trade || '');
    var phone = p.phone || b.phone || '';
    var logo = p.logo || b.logo || '';
    var key = m.section && m.docKey ? (m.section + ':' + m.docKey) : '';
    var ex = key ? extraFor(key) : {};
    var warranty = ex.warranty != null ? ex.warranty : (m.warranty || p.warranty || '');
    var t = m.totals || {};
    var total = Number(t.total) || 0;
    var paid = m.billable ? (Number(t.paid) || 0) : 0;
    var remaining = total - paid;
    var paidInFull = !!(m.billable && total > 0 && remaining <= 0.005);
    var c = m.client || {};

    // ---------- الهيدر ----------
    var head = '<header class="az-head">'
      + '<div class="az-biz">'
      + (logo ? '<div class="az-biz-logo"><img src="' + esc(logo) + '" alt=""></div>' : '')
      + '<div class="az-biz-text">'
      + '<div class="az-biz-name" ' + CE + '>' + esc(name || 'اسم الصنايعي') + '</div>'
      + (trade ? '<p class="az-trade" ' + CE + '>' + esc(trade) + '</p>' : '')
      + (phone ? '<p class="az-phone">' + ICON.phone + '<b dir="ltr" ' + CE + '>' + esc(phone) + '</b></p>' : '')
      + (b.address && !p.name ? '<p class="az-trade" ' + CE + '>' + esc(b.address) + '</p>' : '')
      + '</div></div>'
      + '<div class="az-doc">'
      + '<h1 class="az-doc-type"><span ' + CE + '>' + esc(m.docLabel || 'فاتورة') + '</span></h1>'
      + (m.number ? '<span class="az-doc-line">رقم: <b dir="ltr" ' + CE + '>' + esc(m.number) + '</b></span>' : '')
      + '<span class="az-doc-line">التاريخ: <b ' + CE + '>' + esc(m.date || '-') + '</b></span>'
      + (m.currency ? '<span class="az-doc-line">العملة: <b ' + CE + '>' + esc(m.currency) + '</b></span>' : '')
      + '</div></header>'
      + '<div class="az-stripe"><i></i><i></i><i></i></div>';

    // ---------- العميل (سطر واحد) ----------
    var parts = [];
    parts.push('<span class="az-c">' + ICON.user + '<em>العميل:</em> <b ' + CE + '>' + esc(c.name || '-') + '</b></span>');
    if (c.phone) parts.push('<span class="az-c">' + ICON.phone + '<b dir="ltr" ' + CE + '>' + esc(c.phone) + '</b></span>');
    if (c.address) parts.push('<span class="az-c az-c-addr">' + ICON.pin + '<span ' + CE + '>' + esc(c.address) + '</span></span>');
    var client = '<section class="az-client"><div class="az-client-row">' + parts.join('<span class="az-dot">•</span>') + '</div>'
      + (c.note ? '<div class="az-client-note" ' + CE + '>ملحوظة: ' + esc(c.note) + '</div>' : '') + '</section>';

    var allChips = (m.fields || []).filter(function (f) { return f && f.value; }).map(function (f) {
      return '<span class="inv-chip navy" ' + CE + '>' + esc(f.label) + ': <b>' + esc(f.value) + '</b></span>';
    }).concat(m.chips || []);
    var chips = allChips.length ? '<div class="az-chips inv-pricing">' + allChips.join('') + '</div>' : '';

    // ---------- صندوق الحساب ----------
    var rows = (t.lines || []).filter(function (l) { return l && Number(l[1]); }).map(function (l) {
      var sign = l[2] || '';
      return '<tr class="' + (sign === '-' ? 'minus' : '') + '"><td ' + CE + '>' + l[0] + '</td><td ' + CE + '>' + (sign ? sign + ' ' : '') + money(Math.abs(Number(l[1]))) + '</td></tr>';
    }).join('');
    var box = '<div class="az-totals">'
      + '<div class="az-totals-title">' + (m.billable ? 'حساب الفاتورة' : 'ملخص الحساب') + '</div>'
      + '<table>' + rows
      + '<tr class="az-sum"><td ' + CE + '>' + esc(t.totalLabel || (m.billable ? 'الإجمالي المستحق' : 'الإجمالي')) + '</td><td ' + CE + '>' + money(total) + '</td></tr>'
      + (m.billable ? '<tr class="az-paid"><td ' + CE + '>' + esc(t.paidLabel || 'الواصل من العميل') + '</td><td ' + CE + '>- ' + money(paid) + '</td></tr>' : '')
      + '</table>'
      + (m.billable
        ? '<div class="az-net' + (paidInFull ? ' done' : '') + '"><span ' + CE + '>' + (remaining < -0.005 ? 'زيادة للعميل' : 'المتبقي المطلوب سداده') + '</span><strong ' + CE + '>' + money(Math.abs(remaining)) + '</strong></div>'
        : '<div class="az-net"><span ' + CE + '>' + esc(m.netLabel || 'إجمالي العرض') + '</span><strong ' + CE + '>' + money(total) + '</strong></div>')
      + '</div>';
    var stamp = paidInFull ? '<div class="az-stamp-wrap"><div class="az-stamp" aria-label="تم السداد بالكامل"><span class="s1">تم السداد</span><span class="s2">بالكامل</span><span class="s3">' + esc(m.date || '') + '</span></div></div>' : '';

    // ---------- الضمان + الملاحظات + التوقيع ----------
    var side = '<div class="az-side">'
      + '<div class="az-warranty' + (warranty ? '' : ' empty') + '">' + ICON.shield
      + '<div><div class="az-w-lbl">الضمان</div><div class="az-w-txt" ' + CE + ' data-az-warranty="' + esc(key) + '" data-placeholder="اكتب الضمان هنا (اختياري)">' + esc(warranty) + '</div></div></div>'
      + (m.notesHTML || '')
      + stamp
      + '<div class="az-sign"><div ' + CE + '>' + esc(m.signLabel || 'توقيع الصنايعي') + '</div><div ' + CE + '>توقيع العميل</div></div>'
      + '</div>';

    var foot = '<footer class="az-foot"><span>تم التصدير من خلال تطبيق</span>'
      + '<img src="' + BASE + 'arzaqi-logo-on-light.png" alt="أرزقي"></footer>';

    return '<div class="az-inv' + (paidInFull ? ' az-is-paid' : '') + '">' + head + client + chips
      + '<div class="az-body">' + (m.bodyHTML || '') + '</div>'
      + '<div class="az-bottom">' + side + box + '</div>' + foot + '</div>';
  }

  // حفظ الضمان المكتوب في كل فاتورة
  document.addEventListener('input', function (e) {
    var el = e.target && e.target.closest && e.target.closest('[data-az-warranty]');
    if (!el) return;
    var txt = el.innerText.replace(/\s+$/, '');
    el.parentNode.parentNode.classList.toggle('empty', !txt);
    saveExtra(el.getAttribute('data-az-warranty'), { warranty: txt });
  });

  // تحميل التصميم مرة واحدة
  if (!document.querySelector('link[data-az-invoice]')) {
    var l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = BASE + 'invoice.css'; l.setAttribute('data-az-invoice', '1');
    (document.head || document.documentElement).appendChild(l);
  }

  /**
   * تجميع أسطر صندوق الحساب من مجاميع الأنواع بتاعة القسم:
   * أنواع المصنعية كل واحد في سطر، والخامات كلها في سطر واحد "على العميل"، وأجور العمال في سطر "على العميل".
   * groups: { materials: [kinds], workers: [kinds] }
   */
  function kindLines(byKind, labels, order, groups, opts) {
    opts = opts || {};
    var mat = 0, wrk = 0, out = [];
    (order || Object.keys(byKind)).forEach(function (k) {
      var v = Number(byKind[k]) || 0;
      if (!v) return;
      if (groups.materials && groups.materials.indexOf(k) >= 0) { mat += v; return; }
      if (groups.workers && groups.workers.indexOf(k) >= 0) { wrk += v; return; }
      out.push([esc(labels[k] || k), v]);
    });
    if (mat) out.push([esc(opts.materialsLabel || 'الخامات (على العميل)'), mat, '+']);
    if (wrk) out.push([esc(opts.workersLabel || 'أجور العمال (على العميل)'), wrk, '+']);
    return out;
  }

  /**
   * للأقسام اللي بترسم الفاتورة جوه #printSheet مباشرة: بناخد جداول البنود اللي القسم رسمها
   * (عناوين الأقسام + الجداول + شرائح الأسعار + الملاحظات) زي ما هي، ونعيد رسم الصفحة بالشكل الموحد.
   */
  function harvest(root) {
    var body = '', chips = [], notes = '';
    Array.prototype.forEach.call(root.querySelectorAll('.inv-sec, table.p-table'), function (el) {
      if (el.closest('.inv-totals')) return;
      body += el.outerHTML;
    });
    Array.prototype.forEach.call(root.querySelectorAll('.inv-pricing > *'), function (el) { chips.push(el.outerHTML); });
    Array.prototype.forEach.call(root.querySelectorAll('.inv-notes'), function (el) { notes += el.outerHTML; });
    return { bodyHTML: body, chips: chips, notesHTML: notes };
  }
  function wrapSheet(sheet, m) {
    if (!sheet) return;
    var h = harvest(sheet);
    var model = {};
    for (var k in h) model[k] = h[k];
    for (var k2 in m) if (m[k2] !== undefined) model[k2] = m[k2];
    sheet.innerHTML = render(model);
  }

  function fieldsFromHTML(html) {
    if (!html) return [];
    var tmp = document.createElement('div'); tmp.innerHTML = html;
    return Array.prototype.map.call(tmp.querySelectorAll('.inv-field, .d-field'), function (f) {
      var l = f.querySelector('.lbl'), v = f.querySelector('.val');
      return { label: l ? l.textContent.trim() : '', value: v ? v.textContent.trim() : '' };
    });
  }

  window.ArzaqiInvoice = { render: render, profile: profile, esc: esc, kindLines: kindLines, harvest: harvest, wrapSheet: wrapSheet, fieldsFromHTML: fieldsFromHTML };
})();
