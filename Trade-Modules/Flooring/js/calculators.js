/*
 * أرزقي للأرضيات — شاشات الحاسبات (المنطق نفسه في calc.js)
 * © 2026 أحمد حسن عبدالله - جميع الحقوق محفوظة.
 */
(function (root) {
  'use strict';
  const { esc, icon, money, fmt, fmtQ } = UI;
  const { nn, round } = Calc;
  const db = () => Store.db;

  const LIST = [
    { id: 'areas', title: 'حاسبة المساحات', short: 'المساحات', icon: 'ruler', tone: 'orange', sub: 'غرف، حوائط، أسقف، خصم أبواب وشبابيك' },
    { id: 'tiles', title: 'البلاط والسيراميك والبورسلين', short: 'البلاط', icon: 'tiles', sub: 'عدد البلاط والكراتين والهالك والتكلفة' },
    { id: 'parquet', title: 'حاسبة الباركيه', short: 'الباركيه', icon: 'wood', sub: 'العبوات، الفوم، العازل، الوزرات' },
    { id: 'interlock', title: 'حاسبة الإنترلوك', short: 'الإنترلوك', icon: 'brick', sub: 'القطع، الحفر، الرمل، السن، البردورات' },
    { id: 'marble', title: 'الرخام والجرانيت', short: 'الرخام', icon: 'gem', sub: 'القطع والمساحات والوزن والتقطيع والجلي' },
    { id: 'stairs', title: 'حاسبة السلالم', short: 'السلالم', icon: 'stairs', sub: 'النائمة والقائمة والوزرات والنواصي' },
    { id: 'adhesive', title: 'اللاصق والترويبة', short: 'اللاصق', icon: 'droplet', sub: 'عدد الشكاير والعبوات حسب معدل الاستهلاك' }
  ];

  /* ---------- حفظ مدخلات الحاسبة (ترجع زي ما سبتها) ---------- */
  function draft(id, defaults) {
    const c = db().settings.calc;
    c[id] = Object.assign({}, defaults, c[id] || {});
    return c[id];
  }
  let saveTimer = null;
  function saveDraft() { clearTimeout(saveTimer); saveTimer = setTimeout(() => Store.save(), 400); }
  const W = () => nn(db().settings.defaultWaste) || 0;

  function renderTab(el) {
    el.innerHTML = `<div class="note" style="margin-bottom:12px">كل حاسبة بتحفظ آخر أرقام كتبتها، وتقدر تضيف النتيجة كبنود في أي مشروع بضغطة واحدة.</div>
      <div class="calc-grid">${LIST.map(c => `<button type="button" class="q-tile${c.id === 'areas' ? ' dark' : ''}" data-calc="${c.id}"><span class="q-ic ${c.id === 'areas' ? 'orange' : 'orange-soft'}">${icon(c.icon)}</span><b>${c.title}</b><small>${c.sub}</small></button>`).join('')}</div>`;
    el.querySelectorAll('[data-calc]').forEach(b => { b.onclick = () => open(b.dataset.calc); });
  }

  /* ---------- مكونات العرض ---------- */
  const big = (label, value, unit, tone) => `<div class="res-big${tone ? ' ' + tone : ''}"><span>${label}</span><strong>${value}</strong>${unit ? `<small>${unit}</small>` : ''}</div>`;
  const line = (l, v, cls) => App.rowLine(l, v, cls);
  function resultCard(inner, total) {
    return `<div class="card result-card"><div class="card-title"><div class="t-ic orange">${icon('calc')}</div><h2>النتيجة</h2></div>${inner}${total != null ? `<div class="sum-total"><span>الإجمالي</span><strong>${money(total)}</strong></div>` : ''}</div>`;
  }
  const errBox = errs => errs.length ? `<div class="warn-box" style="margin:0 0 12px">${errs.map(e => '• ' + esc(e)).join('<br>')}</div>` : '';
  const mk = (name, unit, qty, laborPrice, materialPrice, scope, basis) => {
    const m = Calc.METHODS.find(x => (basis || 'measure') === x.basis && (x.basis !== 'measure' || x.unit === unit) && !x.scope) || Calc.METHODS[0];
    return { name, method: m.id, basis: basis || 'measure', unit, scope: scope || 'labor', qty: round(qty, 3), laborPrice: laborPrice || '', materialPrice: materialPrice || '', amount: '', workers: 1, days: '', wage: '', progress: '', note: '' };
  };
  const lump = (name, amount, scope) => ({ name, method: 'lump', basis: 'lump', unit: 'مقطوعية', scope: scope || 'labor', amount: round(amount, 4), materialAmount: '', qty: '', laborPrice: '', materialPrice: '', note: '' });

  function addItemsToProject(items, extra) {
    items = items.filter(Boolean).filter(it => Calc.item(it).total > 0 || extra === 'allowZero');
    if (!items.length) { UI.toast('⚠️ اكتب الأسعار الأول علشان تتضاف كبنود ليها قيمة', 'err'); return; }
    App.pickProject(pid => {
      const p = Store.get('projects', pid);
      items.forEach(it => p.items.push(Object.assign({}, it, { id: Store.uid('it') })));
      Store.upsert('projects', p);
      if (App.commit()) UI.confirm(`✔️ اتضاف ${items.length} بند لمشروع «${p.name}». تفتح المشروع؟`, () => App.openProject(pid, 'items'), { yes: 'افتح المشروع', safe: true, title: 'تمت الإضافة' });
    });
  }
  function itemsPreview(items) {
    items = items.filter(Boolean).filter(it => Calc.item(it).total > 0);
    if (!items.length) return '';
    return `<div class="card"><div class="card-title"><div class="t-ic">${icon('list')}</div><h2>هيتضاف للمشروع كبنود</h2></div><div class="sum-list">${items.map(it => line(esc(it.name) + ' — ' + esc(Calc.itemQtyText(it, fmtQ)), money(Calc.item(it).total))).join('')}</div></div>`;
  }

  /**
   * صفحة حاسبة عامة
   * cfg = { id, defaults, fields(st) → [], compute(st) → { html, text, items, ok } }
   */
  function calcPage(cfg) {
    const meta = LIST.find(x => x.id === cfg.id);
    const st = draft(cfg.id, cfg.defaults);
    UI.openPage({
      title: meta.title, sub: meta.sub,
      actions: [{ icon: 'refresh', label: 'مسح الأرقام', onClick: () => UI.confirm('مسح كل أرقام الحاسبة دي؟', () => { db().settings.calc[cfg.id] = JSON.parse(JSON.stringify(cfg.defaults)); Store.save(); UI.closeThen(1, () => calcPage(cfg)); }, { yes: 'مسح', safe: true }) }],
      render(body, page) {
        body.innerHTML = `<div class="card calc-form">${UI.formHTML(cfg.fields(st), st)}</div><div data-res></div>`;
        const draw = () => {
          const r = cfg.compute(st);
          const res = body.querySelector('[data-res]');
          res.innerHTML = r.html + itemsPreview(r.items || []) + `<div class="stack">
            ${r.items && r.items.length ? `<button type="button" class="btn btn-accent" data-act="toProject">${icon('briefcase')} إضافة النتيجة لمشروع</button>` : ''}
            ${r.extraButtons || ''}
            <div class="btn-row"><button type="button" class="btn btn-wa" data-act="wa">${icon('send')} واتساب</button><button type="button" class="btn btn-ghost" data-act="copy">${icon('copy')} نسخ</button></div></div>`;
          UI.hydrateIcons(res);
          App.bindActions(res, Object.assign({
            toProject: () => addItemsToProject(cfg.compute(st).items),
            wa: () => UI.openWhatsApp(header() + cfg.compute(st).text),
            copy: () => UI.copyText(header() + cfg.compute(st).text, '✔️ تم نسخ النتيجة')
          }, r.actions || {}));
          if (cfg.after) cfg.after(body, st, page);
        };
        const header = () => `*${meta.title}*\n`;
        body.querySelectorAll('.calc-form input, .calc-form select, .calc-form textarea').forEach(i => {
          i.addEventListener(i.type === 'checkbox' ? 'change' : 'input', () => {
            const o = UI.readForm(body.querySelector('.calc-form'));
            Object.keys(o).forEach(k => { if (!body.querySelector(`.calc-form [data-k="${k}"][data-chips]`)) st[k] = o[k]; });
            saveDraft(); draw();
          });
        });
        UI.bindChips(body.querySelector('.calc-form'), (k, v) => { st[k] = v; if (cfg.onChip) cfg.onChip(k, v, st); saveDraft(); page.refresh(); });
        if (cfg.bind) cfg.bind(body, st, page);
        draw();
      }
    });
  }

  /* ================= 1) المساحات ================= */
  function openAreaEntry(entry, onSave) {
    const st = entry ? JSON.parse(JSON.stringify(entry)) : { name: '', kind: 'floor', shape: 'rect', dims: {}, count: 1, deductions: [] };
    UI.openSheet({
      title: entry ? 'تعديل المساحة' : 'إضافة مساحة',
      render(body, sheet) {
        const shape = Calc.SHAPES[st.shape] || Calc.SHAPES.rect;
        const presets = ['ريسبشن', 'صالة', 'غرفة نوم', 'غرفة أطفال', 'مطبخ', 'حمام', 'طرقة', 'بلكونة', 'مدخل', 'سطح'];
        body.innerHTML = `<div class="chips">${presets.map(p => `<button type="button" class="chip" data-preset="${p}">${p}</button>`).join('')}</div>` + UI.formHTML([
          { k: 'name', label: 'الاسم', placeholder: 'مثال: الصالة', value: st.name },
          { k: 'kind', label: 'النوع', type: 'chips', options: Object.entries(Calc.AREA_KINDS), value: st.kind },
          { k: 'shape', label: 'الشكل', type: 'chips', options: Object.entries(Calc.SHAPES).map(([k, v]) => [k, v.label]), value: st.shape }
        ]) + `<div class="row-2">${shape.fields.map(([k, l]) => `<div class="field"><label>${l}</label><input type="number" inputmode="decimal" min="0" step="any" data-dim="${k}" value="${esc(st.dims[k] == null ? '' : st.dims[k])}" placeholder="0"></div>`).join('')}
          <div class="field"><label>العدد (لو متكررة)</label><input type="number" inputmode="decimal" min="0" step="any" data-count value="${esc(st.count)}"></div></div>
          <div class="section-head" style="margin:2px 0 8px"><h3 style="font-size:.9rem">خصومات (أبواب، شبابيك، أعمدة، أماكن مش هتتنفذ)</h3><button type="button" class="btn btn-soft btn-sm" data-act="addD">${icon('plus')} خصم</button></div>
          ${st.deductions.map((d, i) => `<div class="ded-row"><input type="text" data-d="${i}" data-f="name" placeholder="باب / شباك" value="${esc(d.name)}"><input type="number" inputmode="decimal" min="0" step="any" data-d="${i}" data-f="w" placeholder="عرض م" value="${esc(d.w)}"><input type="number" inputmode="decimal" min="0" step="any" data-d="${i}" data-f="h" placeholder="${st.kind === 'floor' ? 'عمق م' : 'ارتفاع م'}" value="${esc(d.h)}"><input type="number" inputmode="decimal" min="0" step="any" data-d="${i}" data-f="count" placeholder="عدد" value="${esc(d.count == null ? 1 : d.count)}"><button type="button" class="card-del" data-act="rmD" data-id="${i}">${icon('x')}</button></div>`).join('')}
          <div class="live-total" data-live></div>
          <div class="btn-row"><button type="button" class="btn btn-primary" data-act="save">${icon('check')} حفظ</button><button type="button" class="btn btn-ghost" data-act="cancel">إلغاء</button></div>
          ${entry ? `<button type="button" class="btn btn-danger" style="margin-top:10px" data-act="del">${icon('trash')} حذف المساحة</button>` : ''}`;
        const sync = () => {
          st.name = body.querySelector('[data-k=name]').value.trim();
          body.querySelectorAll('[data-dim]').forEach(i => { st.dims[i.dataset.dim] = i.value; });
          st.count = body.querySelector('[data-count]').value;
          body.querySelectorAll('[data-d]').forEach(i => { st.deductions[+i.dataset.d][i.dataset.f] = i.value; });
          const r = Calc.areaEntry(st);
          body.querySelector('[data-live]').innerHTML = `<span>${fmtQ(r.gross)} م²${r.deduct ? ' − خصم ' + fmtQ(r.deduct) : ''}${r.perimeter ? ' · محيط ' + fmtQ(r.perimeter) + ' م' : ''}</span><strong>${fmtQ(r.net)} م²</strong>`;
          return r;
        };
        body.querySelectorAll('input').forEach(i => i.addEventListener('input', sync));
        body.querySelectorAll('[data-preset]').forEach(b => { b.onclick = () => { body.querySelector('[data-k=name]').value = b.dataset.preset; sync(); }; });
        UI.bindChips(body, (k, v) => { sync(); st[k] = v; sheet.refresh(); });
        sync();
        App.bindActions(body, {
          addD: () => { sync(); st.deductions.push({ name: '', w: '', h: '', count: 1 }); sheet.refresh(); },
          rmD: i => { sync(); st.deductions.splice(+i, 1); sheet.refresh(); },
          cancel: () => UI.back(),
          del: () => UI.confirm('حذف المساحة دي؟', () => { if (onSave(null) !== false) UI.back(); }, { yes: 'حذف' }),
          save: () => {
            const r = sync();
            if (!(r.gross > 0)) { UI.toast('⚠️ اكتب المقاسات', 'err'); return; }
            if (r.overDeducted) { UI.toast('⚠️ الخصومات أكبر من المساحة — راجع الأرقام', 'err'); return; }
            st.dims = Object.fromEntries(shape.fields.map(([k]) => [k, nn(st.dims[k])]));
            st.count = st.count === '' ? 1 : nn(st.count);
            st.deductions = st.deductions.filter(d => nn(d.w) && nn(d.h)).map(d => ({ name: d.name || 'خصم', w: nn(d.w), h: nn(d.h), count: d.count === '' ? 1 : nn(d.count) }));
            if (!st.name) st.name = Calc.AREA_KINDS[st.kind] || 'مساحة';
            if (onSave(st) !== false) UI.back();
          }
        });
      }
    });
  }
  function openAreas() {
    const st = draft('areas', { entries: [] });
    UI.openPage({
      title: 'حاسبة المساحات', sub: 'أضف كل غرفة أو حائط أو سقف لوحده والتطبيق يجمع',
      render(body) {
        const t = Calc.areaTotals(st.entries);
        body.innerHTML = `${App.statsHTML([['أرضيات', fmtQ(t.byKind.floor) + ' م²'], ['حوائط', fmtQ(t.byKind.wall) + ' م²'], ['أسقف', fmtQ(t.byKind.ceiling) + ' م²']])}
          <div class="sum-total" style="margin:0 0 12px"><span>إجمالي المساحة الصافية${t.deduct ? ` (بعد خصم ${fmtQ(t.deduct)} م²)` : ''}</span><strong>${fmtQ(t.total)} م²</strong></div>
          ${t.perimeter ? `<div class="note" style="margin-bottom:12px">إجمالي محيط الأرضيات: <strong>${fmtQ(t.perimeter)} م.ط</strong> (يفيد في حساب الوزرات — اخصم عرض الأبواب)</div>` : ''}
          <div class="section-head"><h3>المساحات<span class="count">${t.rows.length}</span></h3><button type="button" class="btn btn-soft btn-sm" data-act="add">${icon('plus')} إضافة</button></div>
          ${t.rows.length ? t.rows.map((r, i) => `<div class="item-card" data-i="${i}"><div class="room-num">${i + 1}</div><div class="i-info"><div class="i-name">${esc(r.entry.name)}</div><div class="i-meta">${esc(Calc.AREA_KINDS[r.entry.kind])} · ${esc(Calc.SHAPES[r.entry.shape].label)}${nn(r.entry.count) > 1 ? ' × ' + r.entry.count : ''}${r.deduct ? ' · خصم ' + fmtQ(r.deduct) : ''}</div></div><div class="i-amt">${fmtQ(r.net)}<small>م²</small></div></div>`).join('') : App.emptyHTML('ruler', 'أضف أول غرفة أو حائط', `<button type="button" class="btn btn-accent" data-act="add">${icon('plus')} إضافة مساحة</button>`)}
          ${t.rows.length ? `<div class="stack"><button type="button" class="btn btn-accent" data-act="toProject">${icon('briefcase')} حفظ المساحات في مشروع</button>
            <div class="btn-row"><button type="button" class="btn btn-wa" data-act="wa">${icon('send')} واتساب</button><button type="button" class="btn btn-ghost" data-act="clear">${icon('trash')} مسح الكل</button></div></div>` : ''}`;
        body.querySelectorAll('[data-i]').forEach(c => { c.onclick = () => openAreaEntry(st.entries[+c.dataset.i], e => { if (e === null) st.entries.splice(+c.dataset.i, 1); else st.entries[+c.dataset.i] = e; Store.save(); }); });
        const text = () => `*حساب المساحات*\n${t.rows.map(r => `• ${r.entry.name}: ${fmtQ(r.net)} م²`).join('\n')}\nالإجمالي: ${fmtQ(t.total)} م²`;
        App.bindActions(body, {
          add: () => openAreaEntry(null, e => { st.entries.push(e); Store.save(); }),
          clear: () => UI.confirm('مسح كل المساحات من الحاسبة؟', () => { st.entries = []; db().settings.calc.areas = st; Store.save(); UI.topPage().refresh(); }, { yes: 'مسح' }),
          wa: () => UI.openWhatsApp(text()),
          toProject: () => App.pickProject(pid => {
            const p = Store.get('projects', pid);
            p.areas = (p.areas || []).concat(JSON.parse(JSON.stringify(st.entries)));
            Store.upsert('projects', p);
            if (App.commit()) UI.confirm(`✔️ اتحفظت ${st.entries.length} مساحة في «${p.name}». تفتح المشروع؟`, () => App.openProject(pid, 'areas'), { yes: 'افتح المشروع', safe: true, title: 'تم الحفظ' });
          })
        });
      }
    });
  }

  /* ================= 2) البلاط ================= */
  const TILE_SIZES = ['30×30', '40×40', '45×45', '60×60', '60×120', '80×80', '25×40', '30×60', '20×120', '120×120'];
  function openTiles() {
    calcPage({
      id: 'tiles',
      defaults: { name: 'بورسلين أرضيات', tileL: '', tileW: '', pcsPerBox: '', boxArea: '', area: '', waste: W(), priceMode: 'box', price: '', laborPrice: '', list: [] },
      fields: st => [
        { k: 'name', label: 'البند / المكان', placeholder: 'مثال: بورسلين الصالة', value: st.name },
        { html: `<div class="field"><label>مقاسات شائعة (سم)</label><div class="unit-chips">${TILE_SIZES.map(s => `<button type="button" class="chip" data-size="${s}">${s}</button>`).join('')}</div></div>` },
        { k: 'tileL', label: 'طول البلاطة (سم)', type: 'number', half: true }, { k: 'tileW', label: 'عرض البلاطة (سم)', type: 'number', half: true },
        { k: 'pcsPerBox', label: 'عدد البلاط في الكرتونة', type: 'number', half: true }, { k: 'boxArea', label: 'مساحة الكرتونة م²', type: 'number', optional: true, half: true, hint: 'لو مكتوبة على الكرتونة' },
        { k: 'area', label: 'المساحة المطلوبة (م²)', type: 'number', half: true }, { k: 'waste', label: 'نسبة الهالك %', type: 'number', half: true, hint: 'عادة 5–15% حسب القص' },
        { k: 'priceMode', label: 'سعر الخامة', type: 'chips', options: [['box', 'بالكرتونة'], ['sqm', 'بالمتر'], ['piece', 'بالبلاطة']], value: st.priceMode },
        { k: 'price', label: `السعر (${UI.curSym()})`, type: 'number', optional: true, half: true }, { k: 'laborPrice', label: `مصنعية المتر (${UI.curSym()})`, type: 'number', optional: true, half: true }
      ],
      bind(body, st, page) {
        body.querySelectorAll('[data-size]').forEach(b => { b.onclick = () => { const [l, w] = b.dataset.size.split('×'); st.tileL = l; st.tileW = w; saveDraft(); page.refresh(); }; });
      },
      compute(st) {
        const r = Calc.tiles(st);
        const list = st.list || [];
        const listRes = list.map(x => ({ x, r: Calc.tiles(x) }));
        const pmLabel = { box: 'الكرتونة', sqm: 'المتر', piece: 'البلاطة' }[st.priceMode];
        const html = errBox(r.errors) + (r.ok ? resultCard(`<div class="res-grid">
            ${big('عدد البلاط', fmt(r.tilesNeeded, 0), 'بلاطة', 'orange')}${big('عدد الكراتين', r.boxes ? fmt(r.boxes, 0) : '—', 'كرتونة')}
            ${big('المساحة المشتراة', fmtQ(r.purchasedArea), 'م²')}${big('الزيادة (هالك + تقريب)', fmtQ(r.extraArea), 'م²')}</div>
            <div class="sum-list">${line('مساحة البلاطة الواحدة', fmt(r.tileArea, 4) + ' م²')}${r.boxArea ? line('مساحة الكرتونة', fmtQ(r.boxArea) + ' م²') : ''}${line('المساحة بالهالك', fmtQ(r.neededArea) + ' م²')}${r.tilesBought !== r.tilesNeeded ? line('البلاط اللي هتشتريه فعلاً', fmt(r.tilesBought, 0) + ' بلاطة') : ''}
            ${r.material ? line(`قيمة الخامات (سعر ${pmLabel} ${fmt(st.price)})`, money(r.material)) : ''}${r.labor ? line(`المصنعية (${fmtQ(st.area)} م² × ${fmt(st.laborPrice)})`, money(r.labor)) : ''}</div>`, r.total || null) : '')
          + `<div class="card"><div class="section-head" style="margin:0 0 8px"><h3>مقاسات متعددة في نفس المشروع<span class="count">${list.length}</span></h3>${r.ok ? `<button type="button" class="btn btn-soft btn-sm" data-act="keep">${icon('plus')} حفظ المقاس ده</button>` : ''}</div>
            ${list.length ? `<div class="sum-list">${listRes.map((y, i) => `<div class="sum-row"><span>${esc(y.x.name || 'مقاس')} — ${esc(y.x.tileL)}×${esc(y.x.tileW)} · ${fmtQ(y.x.area)} م² · ${y.r.boxes || y.r.tilesNeeded} ${y.r.boxes ? 'كرتونة' : 'بلاطة'} <button type="button" class="link-btn" data-act="rm" data-id="${i}">حذف</button></span><strong>${money(y.r.total)}</strong></div>`).join('')}</div>
            <div class="sum-total"><span>إجمالي ${list.length} مقاس — ${fmtQ(Calc.sum(listRes, y => y.x.area))} م²</span><strong>${money(Calc.sum(listRes, y => y.r.total))}</strong></div>` : '<p class="hint">احسب كل مقاس لوحده واضغط «حفظ المقاس ده»، والتطبيق يجمعهم ويضيفهم للمشروع مع بعض.</p>'}</div>`;
        const src = list.length ? list : (r.ok ? [st] : []);
        const items = [];
        src.forEach(x => {
          const y = Calc.tiles(x);
          if (!y.ok) return;
          const nm = x.name || `بلاط ${x.tileL}×${x.tileW}`;
          if (nn(x.laborPrice)) items.push(mk(`تركيب ${nm} ${x.tileL}×${x.tileW}`, 'م²', nn(x.area), nn(x.laborPrice)));
          if (nn(x.price)) {
            if (x.priceMode === 'sqm') items.push(mk(`توريد ${nm}`, 'م²', y.purchasedArea, 0, nn(x.price), 'supply'));
            else if (x.priceMode === 'piece') items.push(mk(`توريد ${nm}`, 'قطعة', y.tilesBought, 0, nn(x.price), 'supply'));
            else if (y.boxes) items.push(mk(`توريد ${nm}`, 'كرتونة', y.boxes, 0, nn(x.price), 'supply'));
          }
        });
        const text = r.ok ? `المقاس: ${st.tileL}×${st.tileW} سم\nالمساحة: ${fmtQ(st.area)} م² + هالك ${st.waste}%\nعدد البلاط: ${r.tilesNeeded}\n${r.boxes ? `عدد الكراتين: ${r.boxes}\n` : ''}المساحة المشتراة: ${fmtQ(r.purchasedArea)} م²${r.material ? `\nالخامات: ${money(r.material)}` : ''}${r.labor ? `\nالمصنعية: ${money(r.labor)}` : ''}${r.total ? `\nالإجمالي: ${money(r.total)}` : ''}` : '';
        return {
          html, items, text,
          actions: {
            keep: () => { const s = db().settings.calc.tiles; s.list = (s.list || []).concat([{ name: s.name, tileL: s.tileL, tileW: s.tileW, pcsPerBox: s.pcsPerBox, boxArea: s.boxArea, area: s.area, waste: s.waste, priceMode: s.priceMode, price: s.price, laborPrice: s.laborPrice }]); s.area = ''; s.name = ''; Store.save(); UI.toast('✔️ اتحفظ المقاس — اكتب المقاس اللي بعده'); UI.topPage().refresh(); },
            rm: i => { const s = db().settings.calc.tiles; s.list.splice(+i, 1); Store.save(); UI.topPage().refresh(); }
          }
        };
      }
    });
  }

  /* ================= 3) الباركيه ================= */
  function openParquet() {
    calcPage({
      id: 'parquet',
      defaults: { type: 'HDF', pattern: 'straight', area: '', waste: Calc.PARQUET_PATTERNS.straight.waste, plankL: '', plankW: '', perPack: '', packArea: '', priceMode: 'pack', price: '', foamRoll: '', foamPrice: '', barrierRoll: '', barrierPrice: '', overlap: 10, perimeter: '', doors: '', skirtLen: 2.4, skirtWaste: 5, skirtPrice: '', laborPrice: '', skirtLabor: '' },
      onChip(k, v, st) { if (k === 'pattern') st.waste = Calc.PARQUET_PATTERNS[v].waste; },
      fields: st => [
        { k: 'type', label: 'النوع', type: 'chips', options: ['HDF', 'MDF', 'SPC', 'LVT', 'WPC', 'باركيه طبيعي'].map(x => [x, x]), value: st.type },
        { k: 'pattern', label: 'طريقة التركيب', type: 'chips', options: Object.entries(Calc.PARQUET_PATTERNS).map(([k, v]) => [k, v.label]), value: st.pattern },
        { k: 'area', label: 'مساحة الأرضية (م²)', type: 'number', half: true }, { k: 'waste', label: 'نسبة الهالك %', type: 'number', half: true, hint: 'اتغيرت حسب طريقة التركيب — تقدر تعدلها' },
        { k: 'packArea', label: 'مساحة العبوة (م²)', type: 'number', half: true }, { k: 'perPack', label: 'عدد الألواح في العبوة', type: 'number', optional: true, half: true },
        { k: 'plankL', label: 'طول اللوح (سم)', type: 'number', optional: true, half: true }, { k: 'plankW', label: 'عرض اللوح (سم)', type: 'number', optional: true, half: true },
        { k: 'priceMode', label: 'سعر الخامة', type: 'chips', options: [['pack', 'بالعبوة'], ['sqm', 'بالمتر']], value: st.priceMode },
        { k: 'price', label: `السعر (${UI.curSym()})`, type: 'number', optional: true, half: true }, { k: 'laborPrice', label: `مصنعية المتر (${UI.curSym()})`, type: 'number', optional: true, half: true },
        { html: '<h4 class="more-h" style="margin:4px 0 8px">الفوم والعازل</h4>' },
        { k: 'foamRoll', label: 'لفة الفوم تغطي (م²)', type: 'number', optional: true, half: true }, { k: 'foamPrice', label: `سعر لفة الفوم`, type: 'number', optional: true, half: true },
        { k: 'barrierRoll', label: 'لفة العازل تغطي (م²)', type: 'number', optional: true, half: true }, { k: 'barrierPrice', label: 'سعر لفة العازل', type: 'number', optional: true, half: true },
        { k: 'overlap', label: 'نسبة التراكب / الزيادة في الفوم %', type: 'number' },
        { html: '<h4 class="more-h" style="margin:4px 0 8px">الوزرات والإكسسوارات</h4>' },
        { k: 'perimeter', label: 'محيط الغرف (م.ط)', type: 'number', half: true }, { k: 'doors', label: 'عرض الأبواب (يُخصم) م', type: 'number', optional: true, half: true },
        { k: 'skirtLen', label: 'طول قطعة الوزرة (م)', type: 'number', half: true }, { k: 'skirtWaste', label: 'هالك الوزرات %', type: 'number', half: true },
        { k: 'skirtPrice', label: 'سعر قطعة الوزرة', type: 'number', optional: true, half: true }, { k: 'skirtLabor', label: 'مصنعية متر الوزرة', type: 'number', optional: true, half: true }
      ],
      compute(st) {
        const r = Calc.parquet(st);
        const nm = `${st.type} ${Calc.PARQUET_PATTERNS[st.pattern].label}`;
        const html = errBox(r.errors) + (r.ok ? resultCard(`<div class="res-grid">
            ${big('عدد العبوات', fmt(r.packs, 0), 'عبوة', 'orange')}${big('عدد الألواح', r.planks ? fmt(r.planks, 0) : '—', 'لوح')}
            ${big('المساحة المشتراة', fmtQ(r.purchasedArea), 'م²')}${big('الوزرات', fmt(r.skirtPieces, 0), `قطعة (${fmtQ(r.skirtLm)} م.ط)`)}</div>
            <div class="sum-list">${line('المساحة بالهالك', fmtQ(r.neededArea) + ' م²')}${r.foamRolls ? line('لفات الفوم', r.foamRolls + ' لفة') : ''}${r.barrierRolls ? line('لفات العازل', r.barrierRolls + ' لفة') : ''}
            ${r.cost.flooring ? line('قيمة الأرضية', money(r.cost.flooring)) : ''}${r.cost.foam ? line('الفوم', money(r.cost.foam)) : ''}${r.cost.barrier ? line('العازل', money(r.cost.barrier)) : ''}${r.cost.skirting ? line('الوزرات', money(r.cost.skirting)) : ''}
            ${r.labor ? line('المصنعية (أرضية + وزرات)', money(r.labor)) : ''}</div>`, r.total || null) : '');
        const items = r.ok ? [
          nn(st.laborPrice) && mk(`تركيب ${nm}`, 'م²', nn(st.area), nn(st.laborPrice)),
          nn(st.price) && (st.priceMode === 'sqm' ? mk(`توريد ${st.type}`, 'م²', r.purchasedArea, 0, nn(st.price), 'supply') : mk(`توريد ${st.type}`, 'عبوة', r.packs, 0, nn(st.price), 'supply')),
          r.foamRolls && nn(st.foamPrice) && mk('توريد فوم', 'وحدة', r.foamRolls, 0, nn(st.foamPrice), 'supply'),
          r.barrierRolls && nn(st.barrierPrice) && mk('توريد عازل رطوبة', 'وحدة', r.barrierRolls, 0, nn(st.barrierPrice), 'supply'),
          r.skirtPieces && nn(st.skirtPrice) && mk('توريد وزرات', 'قطعة', r.skirtPieces, 0, nn(st.skirtPrice), 'supply'),
          r.skirtLm && nn(st.skirtLabor) && mk('تركيب وزرات', 'م.ط', r.skirtLm, nn(st.skirtLabor))
        ] : [];
        const text = r.ok ? `${nm}\nالمساحة: ${fmtQ(st.area)} م² + هالك ${st.waste}%\nالعبوات: ${r.packs}\nالمساحة المشتراة: ${fmtQ(r.purchasedArea)} م²${r.foamRolls ? `\nالفوم: ${r.foamRolls} لفة` : ''}${r.skirtPieces ? `\nالوزرات: ${r.skirtPieces} قطعة (${fmtQ(r.skirtLm)} م.ط)` : ''}${r.total ? `\nالإجمالي: ${money(r.total)}` : ''}` : '';
        return { html, items, text };
      }
    });
  }

  /* ================= 4) الإنترلوك ================= */
  function openInterlock() {
    calcPage({
      id: 'interlock',
      defaults: { use: 'مدخل', area: '', perSqm: '', pieceL: '', pieceW: '', waste: 5, priceMode: 'sqm', price: '', laborPrice: '', excArea: '', excDepth: '', excPrice: '', fillThk: '', fillPrice: '', baseThk: '', basePrice: '', sandThk: '', sandPrice: '', factor: 1, curbLen: '', curbPiece: 100, curbPrice: '', curbLabor: '', compaction: '', transport: '' },
      fields: st => [
        { k: 'use', label: 'المكان', type: 'chips', options: ['رصيف', 'مدخل', 'جراج', 'حديقة', 'طريق / ساحة'].map(x => [x, x]), value: st.use },
        { k: 'area', label: 'المساحة (م²)', type: 'number', half: true }, { k: 'waste', label: 'نسبة الهالك %', type: 'number', half: true },
        { k: 'perSqm', label: 'عدد القطع في المتر المربع', type: 'number', hint: 'حسب التصميم — اكتبه من المصنع (أدق من المقاس)' },
        { k: 'pieceL', label: 'أو طول القطعة (سم)', type: 'number', optional: true, half: true }, { k: 'pieceW', label: 'وعرض القطعة (سم)', type: 'number', optional: true, half: true },
        { k: 'priceMode', label: 'سعر الإنترلوك', type: 'chips', options: [['sqm', 'بالمتر'], ['piece', 'بالقطعة']], value: st.priceMode },
        { k: 'price', label: `السعر (${UI.curSym()})`, type: 'number', optional: true, half: true }, { k: 'laborPrice', label: 'مصنعية المتر', type: 'number', optional: true, half: true },
        { html: '<h4 class="more-h" style="margin:4px 0 8px">الحفر وطبقات التأسيس</h4>' },
        { k: 'excArea', label: 'مساحة الحفر (م²)', type: 'number', optional: true, half: true, hint: 'فاضي = نفس المساحة' }, { k: 'excDepth', label: 'عمق الحفر (سم)', type: 'number', optional: true, half: true },
        { k: 'fillThk', label: 'سمك الردم (سم)', type: 'number', optional: true, half: true }, { k: 'baseThk', label: 'سمك طبقة السن (سم)', type: 'number', optional: true, half: true },
        { k: 'sandThk', label: 'سمك طبقة الرمل (سم)', type: 'number', optional: true, half: true }, { k: 'factor', label: 'معامل الدمك / الانتفاش', type: 'number', half: true, hint: '1 = بدون، مثلاً 1.2' },
        { k: 'excPrice', label: 'سعر حفر م³', type: 'number', optional: true, half: true }, { k: 'fillPrice', label: 'سعر ردم م³', type: 'number', optional: true, half: true },
        { k: 'basePrice', label: 'سعر سن م³', type: 'number', optional: true, half: true }, { k: 'sandPrice', label: 'سعر رمل م³', type: 'number', optional: true, half: true },
        { html: '<h4 class="more-h" style="margin:4px 0 8px">البردورات والنقل</h4>' },
        { k: 'curbLen', label: 'طول البردورات (م.ط)', type: 'number', optional: true, half: true }, { k: 'curbPiece', label: 'طول البردورة (سم)', type: 'number', half: true },
        { k: 'curbPrice', label: 'سعر البردورة', type: 'number', optional: true, half: true }, { k: 'curbLabor', label: 'مصنعية متر البردورة', type: 'number', optional: true, half: true },
        { k: 'compaction', label: 'الدمك (مقطوعية)', type: 'number', optional: true, half: true }, { k: 'transport', label: 'النقل (مقطوعية)', type: 'number', optional: true, half: true }
      ],
      compute(st) {
        const r = Calc.interlock(st);
        const html = errBox(r.errors) + (r.ok ? resultCard(`<div class="res-grid">
            ${big('عدد القطع', fmt(r.pieces, 0), 'قطعة', 'orange')}${big('البردورات', fmt(r.curbPieces, 0), 'قطعة')}
            ${big('حجم الحفر', fmtQ(r.excVol), 'م³')}${big('الرمل + السن', fmtQ(r.sandVol + r.baseVol), 'م³')}</div>
            <div class="sum-list">${line('القطع في المتر', fmtQ(r.perSqm))}${line('مساحة مكافئة للقطع', fmtQ(r.purchasedArea) + ' م²')}${r.fillVol ? line('الردم', fmtQ(r.fillVol) + ' م³') : ''}${r.baseVol ? line('السن', fmtQ(r.baseVol) + ' م³') : ''}${r.sandVol ? line('الرمل', fmtQ(r.sandVol) + ' م³') : ''}
            ${r.cost.pavers ? line('قيمة الإنترلوك', money(r.cost.pavers)) : ''}${r.cost.excavation ? line('الحفر', money(r.cost.excavation)) : ''}${r.cost.fill ? line('الردم', money(r.cost.fill)) : ''}${r.cost.base ? line('السن', money(r.cost.base)) : ''}${r.cost.sand ? line('الرمل', money(r.cost.sand)) : ''}${r.cost.curbs ? line('البردورات', money(r.cost.curbs)) : ''}
            ${nn(st.laborPrice) || nn(st.curbLabor) ? line('المصنعية (تركيب + بردورات)', money(r.labor - r.cost.excavation)) : ''}${r.extras ? line('دمك ونقل', money(r.extras)) : ''}</div>
            ${r.perSqmFromSize && nn(st.perSqm) ? '' : (r.perSqmFromSize ? '<p class="hint">العدد محسوب من مقاس القطعة تقريبياً — التصميمات المتداخلة بيختلف عددها، فاكتب العدد من المصنع لو تعرفه.</p>' : '')}`, r.total || null) : '');
        const items = r.ok ? [
          nn(st.laborPrice) && mk(`تركيب إنترلوك ${st.use}`, 'م²', nn(st.area), nn(st.laborPrice)),
          nn(st.price) && (st.priceMode === 'piece' ? mk('توريد إنترلوك', 'قطعة', r.pieces, 0, nn(st.price), 'supply') : mk('توريد إنترلوك', 'م²', r.purchasedArea, 0, nn(st.price), 'supply')),
          r.excVol && nn(st.excPrice) && mk('حفر', 'م³', r.excVol, nn(st.excPrice)),
          r.fillVol && nn(st.fillPrice) && mk('ردم', 'م³', r.fillVol, 0, nn(st.fillPrice), 'both'),
          r.baseVol && nn(st.basePrice) && mk('طبقة سن', 'م³', r.baseVol, 0, nn(st.basePrice), 'both'),
          r.sandVol && nn(st.sandPrice) && mk('طبقة رمل', 'م³', r.sandVol, 0, nn(st.sandPrice), 'both'),
          r.curbPieces && nn(st.curbPrice) && mk('توريد بردورات', 'قطعة', r.curbPieces, 0, nn(st.curbPrice), 'supply'),
          r.curbLen && nn(st.curbLabor) && mk('تركيب بردورات', 'م.ط', r.curbLen, nn(st.curbLabor)),
          nn(st.compaction) && lump('دمك وتسوية', nn(st.compaction)), nn(st.transport) && lump('نقل', nn(st.transport))
        ] : [];
        const text = r.ok ? `إنترلوك ${st.use}: ${fmtQ(st.area)} م²\nعدد القطع: ${r.pieces}${r.excVol ? `\nالحفر: ${fmtQ(r.excVol)} م³` : ''}${r.sandVol ? `\nالرمل: ${fmtQ(r.sandVol)} م³` : ''}${r.baseVol ? `\nالسن: ${fmtQ(r.baseVol)} م³` : ''}${r.curbPieces ? `\nالبردورات: ${r.curbPieces} قطعة` : ''}${r.total ? `\nالإجمالي: ${money(r.total)}` : ''}` : '';
        return { html, items, text };
      }
    });
  }

  /* ================= 5) الرخام والجرانيت ================= */
  function openMarble() {
    calcPage({
      id: 'marble',
      defaults: { stone: 'رخام', pieces: [{ name: '', l: '', w: '', count: 1 }], extraArea: '', thickness: 2, density: 2.7, waste: W(), price: '', laborPrice: '', cutLm: '', cutPrice: '', polishArea: '', polishPrice: '', edgeLm: '', edgePrice: '', transport: '', lifting: '' },
      onChip(k, v, st) { if (k === 'stone') st.density = v === 'جرانيت' ? 2.7 : (v === 'رخام' ? 2.7 : st.density); },
      fields: st => [
        { k: 'stone', label: 'النوع', type: 'chips', options: ['رخام', 'جرانيت', 'حجر طبيعي', 'حجر صناعي'].map(x => [x, x]), value: st.stone },
        { html: `<div class="field"><label>مقاسات القطع (سم)</label>${st.pieces.map((p, i) => `<div class="ded-row marble"><input type="text" data-pc="${i}" data-f="name" placeholder="المكان" value="${esc(p.name)}"><input type="number" inputmode="decimal" min="0" step="any" data-pc="${i}" data-f="l" placeholder="طول" value="${esc(p.l)}"><input type="number" inputmode="decimal" min="0" step="any" data-pc="${i}" data-f="w" placeholder="عرض" value="${esc(p.w)}"><input type="number" inputmode="decimal" min="0" step="any" data-pc="${i}" data-f="count" placeholder="عدد" value="${esc(p.count)}"><button type="button" class="card-del" data-rmpc="${i}">${icon('x')}</button></div>`).join('')}
          <button type="button" class="chip" data-addpc>${icon('plus')} قطعة / مقاس</button></div>` },
        { k: 'extraArea', label: 'أو مساحة مباشرة (م²)', type: 'number', optional: true, half: true }, { k: 'waste', label: 'نسبة الهالك %', type: 'number', half: true },
        { k: 'thickness', label: 'سمك اللوح (سم)', type: 'number', half: true }, { k: 'density', label: 'الكثافة (طن/م³)', type: 'number', half: true, hint: 'للوزن والنقل' },
        { k: 'price', label: `سعر المتر المسطح (${UI.curSym()})`, type: 'number', optional: true, half: true }, { k: 'laborPrice', label: 'مصنعية تركيب المتر', type: 'number', optional: true, half: true },
        { k: 'cutLm', label: 'تقطيع / تجليخ (م.ط)', type: 'number', optional: true, half: true }, { k: 'cutPrice', label: 'سعر متر التقطيع', type: 'number', optional: true, half: true },
        { k: 'polishArea', label: 'جلي وتلميع (م²)', type: 'number', optional: true, half: true }, { k: 'polishPrice', label: 'سعر متر الجلي', type: 'number', optional: true, half: true },
        { k: 'edgeLm', label: 'نواصي وحليات (م.ط)', type: 'number', optional: true, half: true }, { k: 'edgePrice', label: 'سعر متر الحلية', type: 'number', optional: true, half: true },
        { k: 'transport', label: 'النقل (مقطوعية)', type: 'number', optional: true, half: true }, { k: 'lifting', label: 'الرفع والتنزيل', type: 'number', optional: true, half: true }
      ],
      bind(body, st, page) {
        body.querySelectorAll('[data-pc]').forEach(i => i.addEventListener('input', () => { st.pieces[+i.dataset.pc][i.dataset.f] = i.value; saveDraft(); const r = body.querySelector('[data-res]'); r.dispatchEvent(new Event('redraw')); }));
        body.querySelector('[data-res]').addEventListener('redraw', () => { const x = body.querySelector('.calc-form input[data-k=waste]'); x.dispatchEvent(new Event('input')); });
        body.querySelector('[data-addpc]').onclick = () => { st.pieces.push({ name: '', l: '', w: '', count: 1 }); saveDraft(); page.refresh(); };
        body.querySelectorAll('[data-rmpc]').forEach(b => { b.onclick = () => { st.pieces.splice(+b.dataset.rmpc, 1); if (!st.pieces.length) st.pieces.push({ name: '', l: '', w: '', count: 1 }); saveDraft(); page.refresh(); }; });
      },
      compute(st) {
        const r = Calc.marble(st);
        const html = errBox(r.errors) + (r.ok ? resultCard(`<div class="res-grid">
            ${big('المساحة الصافية', fmtQ(r.netArea), 'م²', 'orange')}${big('المساحة بالهالك', fmtQ(r.purchaseArea), 'م²')}
            ${big('عدد القطع', fmt(r.pieceCount, 0), 'قطعة')}${big('الوزن التقريبي', fmtQ(r.weightTon), 'طن')}</div>
            <div class="sum-list">${r.cost.stone ? line(`قيمة ال${st.stone}`, money(r.cost.stone)) : ''}${r.cost.labor ? line('مصنعية التركيب', money(r.cost.labor)) : ''}${r.cost.cutting ? line('التقطيع والتجليخ', money(r.cost.cutting)) : ''}${r.cost.polishing ? line('الجلي والتلميع', money(r.cost.polishing)) : ''}${r.cost.edges ? line('النواصي والحليات', money(r.cost.edges)) : ''}${r.cost.transport ? line('النقل', money(r.cost.transport)) : ''}${r.cost.lifting ? line('الرفع والتنزيل', money(r.cost.lifting)) : ''}</div>`, r.total || null) : '');
        const items = r.ok ? [
          nn(st.price) && mk(`توريد ${st.stone}`, 'م²', r.purchaseArea, 0, nn(st.price), 'supply'),
          nn(st.laborPrice) && mk(`تركيب ${st.stone}`, 'م²', r.netArea, nn(st.laborPrice)),
          nn(st.cutLm) && nn(st.cutPrice) && mk('تقطيع وتجليخ', 'م.ط', nn(st.cutLm), nn(st.cutPrice)),
          nn(st.polishArea) && nn(st.polishPrice) && mk('جلي وتلميع', 'م²', nn(st.polishArea), nn(st.polishPrice)),
          nn(st.edgeLm) && nn(st.edgePrice) && mk('نواصي وحليات', 'م.ط', nn(st.edgeLm), nn(st.edgePrice)),
          nn(st.transport) && lump('نقل', nn(st.transport)), nn(st.lifting) && lump('رفع وتنزيل', nn(st.lifting))
        ] : [];
        const text = r.ok ? `${st.stone}: ${fmtQ(r.netArea)} م² (${r.pieceCount} قطعة)\nبالهالك: ${fmtQ(r.purchaseArea)} م²\nالوزن التقريبي: ${fmtQ(r.weightTon)} طن${r.total ? `\nالإجمالي: ${money(r.total)}` : ''}` : '';
        return { html, items, text };
      }
    });
  }

  /* ================= 6) السلالم ================= */
  function openStairs() {
    calcPage({
      id: 'stairs',
      defaults: { steps: '', width: '', tread: 30, riser: 16, includeRisers: true, skirtSides: '2', skirtType: 'stepped', landingL: '', landingW: '', landings: '', priceBy: 'step', stepPrice: '', sqmPrice: '', skirtPrice: '', nosingPrice: '' },
      fields: st => [
        { k: 'steps', label: 'عدد الدرجات', type: 'number', half: true }, { k: 'width', label: 'عرض السلم (م)', type: 'number', half: true },
        { k: 'tread', label: 'عمق النائمة (سم)', type: 'number', half: true }, { k: 'riser', label: 'ارتفاع القائمة (سم)', type: 'number', half: true },
        { k: 'includeRisers', label: 'القوائم هتتكسي', type: 'switch', value: st.includeRisers },
        { k: 'skirtSides', label: 'الوزرات الجانبية', type: 'chips', options: [['0', 'بدون'], ['1', 'جنب واحد'], ['2', 'الجنبين']], value: String(st.skirtSides) },
        { k: 'skirtType', label: 'شكل الوزرة', type: 'chips', options: [['stepped', 'مدرجة (مع الدرج)'], ['sloped', 'مائلة (خط واحد)']], value: st.skirtType },
        { k: 'landingL', label: 'طول البسطة (م)', type: 'number', optional: true, half: true }, { k: 'landingW', label: 'عرض البسطة (م)', type: 'number', optional: true, half: true },
        { k: 'landings', label: 'عدد البسطات', type: 'number', optional: true },
        { k: 'priceBy', label: 'المصنعية', type: 'chips', options: [['step', 'بالدرجة'], ['sqm', 'بالمتر المربع']], value: st.priceBy },
        st.priceBy === 'step' ? { k: 'stepPrice', label: `سعر الدرجة (${UI.curSym()})`, type: 'number', optional: true, half: true } : { k: 'sqmPrice', label: `سعر المتر (${UI.curSym()})`, type: 'number', optional: true, half: true },
        { k: 'skirtPrice', label: 'سعر متر الوزرة', type: 'number', optional: true, half: true },
        { k: 'nosingPrice', label: 'سعر متر الناصية / الحلية', type: 'number', optional: true }
      ],
      compute(st) {
        const r = Calc.stairs(Object.assign({}, st, { includeRisers: st.includeRisers !== false && st.includeRisers !== 'false' }));
        const ok = r.steps > 0 && nn(st.width) > 0;
        const labor = st.priceBy === 'step' ? r.steps * nn(st.stepPrice) + (nn(st.stepPrice) ? r.landingArea * 0 : 0) : r.totalArea * nn(st.sqmPrice);
        const skirt = r.skirtingLm * nn(st.skirtPrice), nosing = r.nosingLm * nn(st.nosingPrice);
        const total = labor + skirt + nosing;
        const html = (ok ? '' : errBox(['اكتب عدد الدرجات وعرض السلم'])) + (ok ? resultCard(`<div class="res-grid">
            ${big('إجمالي المساحة', fmtQ(r.totalArea), 'م²', 'orange')}${big('الدرجات', fmt(r.steps, 0), 'درجة')}
            ${big('الوزرات', fmtQ(r.skirtingLm), 'م.ط')}${big('النواصي', fmtQ(r.nosingLm), 'م.ط')}</div>
            <div class="sum-list">${line('مساحة النوائم', fmtQ(r.treadArea) + ' م²')}${line('مساحة القوائم', fmtQ(r.riserArea) + ' م²')}${r.landingArea ? line('مساحة البسطات', fmtQ(r.landingArea) + ' م²') : ''}${line('الارتفاع الكلي', fmtQ(r.totalRise) + ' م')}
            ${labor ? line('المصنعية', money(labor)) : ''}${skirt ? line('الوزرات', money(skirt)) : ''}${nosing ? line('النواصي', money(nosing)) : ''}</div>
            ${st.priceBy === 'step' && r.landingArea ? '<p class="hint">البسطة مش داخلة في سعر الدرجة — ضيفها كبند بالمتر لو بتتحاسب عليها.</p>' : ''}`, total || null) : '');
        const items = ok ? [
          st.priceBy === 'step' ? (nn(st.stepPrice) && mk('تركيب سلم', 'درجة', r.steps, nn(st.stepPrice))) : (nn(st.sqmPrice) && mk('تركيب سلم', 'م²', r.totalArea, nn(st.sqmPrice))),
          r.skirtingLm && nn(st.skirtPrice) && mk('وزرات السلم', 'م.ط', r.skirtingLm, nn(st.skirtPrice)),
          r.nosingLm && nn(st.nosingPrice) && mk('نواصي وحليات السلم', 'م.ط', r.nosingLm, nn(st.nosingPrice))
        ] : [];
        const text = ok ? `${r.steps} درجة × عرض ${st.width} م\nالنوائم: ${fmtQ(r.treadArea)} م²\nالقوائم: ${fmtQ(r.riserArea)} م²${r.landingArea ? `\nالبسطات: ${fmtQ(r.landingArea)} م²` : ''}\nالإجمالي: ${fmtQ(r.totalArea)} م²\nالوزرات: ${fmtQ(r.skirtingLm)} م.ط\nالنواصي: ${fmtQ(r.nosingLm)} م.ط${total ? `\nالتكلفة: ${money(total)}` : ''}` : '';
        return { html, items, text };
      }
    });
  }

  /* ================= 7) اللاصق والترويبة ================= */
  function openAdhesive() {
    calcPage({
      id: 'adhesive',
      defaults: { material: 'لاصق سيراميك', mode: 'rate', area: '', rate: '', tileL: '', tileW: '', joint: 3, depth: '', density: 1.6, packSize: '', waste: 5, packPrice: '', unit: 'شيكارة' },
      fields: st => [
        { k: 'material', label: 'نوع المادة', placeholder: 'لاصق سيراميك / لاصق بورسلين / ترويبة / إيبوكسي', value: st.material },
        { k: 'mode', label: 'طريقة الحساب', type: 'chips', options: [['rate', 'معدل استهلاك (من تعليمات المنتج)'], ['grout', 'ترويبة حسب مقاس البلاط والفاصل']], value: st.mode },
        { k: 'area', label: 'مساحة التنفيذ (م²)', type: 'number', half: true }, { k: 'waste', label: 'نسبة الهالك %', type: 'number', half: true },
        st.mode === 'rate' ? { k: 'rate', label: 'الاستهلاك لكل م² (كجم أو لتر)', type: 'number', hint: 'اكتبه من على الشيكارة أو تعليمات الشركة — بيختلف حسب المنتج والأرضية ومقاس البلاط' } : null,
        st.mode === 'grout' ? { k: 'tileL', label: 'طول البلاطة (سم)', type: 'number', half: true } : null, st.mode === 'grout' ? { k: 'tileW', label: 'عرض البلاطة (سم)', type: 'number', half: true } : null,
        st.mode === 'grout' ? { k: 'joint', label: 'عرض الفاصل (مم)', type: 'number', half: true } : null, st.mode === 'grout' ? { k: 'depth', label: 'عمق الفاصل = سمك البلاطة (مم)', type: 'number', half: true } : null,
        st.mode === 'grout' ? { k: 'density', label: 'كثافة الترويبة', type: 'number', hint: 'عادة 1.6 — راجع المنتج' } : null,
        { k: 'packSize', label: 'وزن / حجم العبوة (كجم أو لتر)', type: 'number', half: true }, { k: 'unit', label: 'اسم العبوة', type: 'select', options: ['شيكارة', 'عبوة', 'كيس', 'جردل', 'كجم'].map(x => [x, x]), value: st.unit, half: true },
        { k: 'packPrice', label: `سعر العبوة (${UI.curSym()})`, type: 'number', optional: true }
      ],
      compute(st) {
        const r = Calc.adhesive(st);
        const html = errBox(r.errors) + (r.ok ? resultCard(`<div class="res-grid">
            ${big('عدد العبوات', r.packs ? fmt(r.packs, 0) : '—', esc(st.unit), 'orange')}${big('الكمية الكلية', fmtQ(r.qty), 'كجم / لتر')}</div>
            <div class="sum-list">${line('الاستهلاك لكل م²', fmt(r.rate, 3))}${r.cost ? line('التكلفة', money(r.cost)) : ''}</div>
            ${r.packs ? '' : '<p class="hint">اكتب وزن العبوة علشان يتحسب عدد الشكاير.</p>'}`, r.cost || null) : '');
        const items = r.ok && r.packs && nn(st.packPrice) ? [mk(`توريد ${st.material}`, st.unit === 'شيكارة' ? 'شيكارة' : 'عبوة', r.packs, 0, nn(st.packPrice), 'supply')] : [];
        const text = r.ok ? `${st.material}: ${fmtQ(st.area)} م²\nالاستهلاك: ${fmt(r.rate, 3)} لكل م²\nالكمية: ${fmtQ(r.qty)}\n${r.packs ? `العبوات: ${r.packs} ${st.unit}` : ''}${r.cost ? `\nالتكلفة: ${money(r.cost)}` : ''}` : '';
        return { html, items, text };
      }
    });
  }

  function open(id) {
    ({ areas: openAreas, tiles: openTiles, parquet: openParquet, interlock: openInterlock, marble: openMarble, stairs: openStairs, adhesive: openAdhesive })[id]();
  }
  root.Calcs = { LIST, renderTab, open, openAreaEntry };
})(typeof self !== 'undefined' ? self : this);
