/*
 * حساباتي للأرضيات — الخامات والمخزون، العمال، المصروفات، النوتة، أنواع الأعمال، الإعدادات، النسخ الاحتياطي
 * © 2026 أحمد حسن عبدالله - جميع الحقوق محفوظة.
 */
(function (root) {
  'use strict';
  const { esc, icon, money, fmt, fmtQ, fmtDate } = UI;
  const { nn, round } = Calc;
  const db = () => Store.db;
  const by = (col, id) => Store.get(col, id);
  const today = () => Store.todayISO();
  const commit = m => App.commit(m);
  const act = (el, map) => App.bindActions(el, map);
  const MAT_UNITS = ['م²', 'م.ط', 'قطعة', 'كرتونة', 'عبوة', 'شيكارة', 'كجم', 'طن', 'م³', 'لتر', 'وحدة'];
  const MAT_CATS = ['سيراميك', 'بورسلين', 'رخام', 'جرانيت', 'باركيه', 'إنترلوك', 'بردورات', 'لاصق', 'ترويبة', 'أسمنت', 'رمل', 'سن / زلط', 'فوم وعوازل', 'وزرات', 'إكسسوارات', 'أخرى'];
  const btnRow = (save, del) => `<div class="btn-row"><button type="button" class="btn btn-primary" data-act="save">${icon('check')} ${save || 'حفظ'}</button><button type="button" class="btn btn-ghost" data-act="cancel">إلغاء</button></div>${del ? `<button type="button" class="btn btn-danger" style="margin-top:10px" data-act="del">${icon('trash')} ${del}</button>` : ''}`;

  /* ================= الخامات والمخزون ================= */
  function materialLabel(m) { return [m.name, m.size, m.color, m.brand].filter(Boolean).join(' '); }
  function openInventory() {
    let q = '', catF = 'all', lowOnly = false;
    UI.openPage({
      title: 'الخامات والمخزون', sub: 'الأسعار والكميات والتنبيهات',
      actions: [{ icon: 'plus', label: 'إضافة خامة', accent: true, onClick: () => openMaterialEdit(null) }],
      render(body, page) {
        const inv = Fin.inventory(db());
        const cats = [...new Set(db().materials.map(m => m.category).filter(Boolean))];
        let rows = inv.rows.filter(r => (catF === 'all' || r.material.category === catF) && (!lowOnly || r.low) && (!q || (materialLabel(r.material) + ' ' + (r.material.supplier || '')).includes(q)));
        rows.sort((a, b) => (b.low - a.low) || a.material.name.localeCompare(b.material.name, 'ar'));
        body.innerHTML = `<section class="hero"><div class="hero-label">قيمة المخزون (بسعر الشراء)</div><div class="hero-value">${fmt(inv.value)}<small>${UI.curSym()}</small></div>
          <div class="hero-stats"><div class="hero-stat"><span>عدد الأصناف</span><strong>${inv.rows.length}</strong></div><div class="hero-stat"><span>قربت تخلص</span><strong>${inv.lowCount}</strong></div><div class="hero-stat"><span>فواتير مشتريات</span><strong>${db().docs.filter(d => d.type === 'purchase').length}</strong></div></div></section>
          <div class="btn-row" style="margin-bottom:12px"><button type="button" class="btn btn-soft" data-act="purchase">${icon('download')} فاتورة مشتريات</button><button type="button" class="btn btn-soft" data-act="sale">${icon('upload')} فاتورة بيع خامات</button></div>
          <div class="field" style="margin-bottom:10px"><input type="search" data-q placeholder="ابحث باسم الخامة أو المورد..." value="${esc(q)}"></div>
          <div class="filter-chips"><button type="button" class="chip${catF === 'all' && !lowOnly ? ' on' : ''}" data-c="all">الكل</button><button type="button" class="chip${lowOnly ? ' on' : ''}" data-c="low">قربت تخلص</button>${cats.map(c => `<button type="button" class="chip${catF === c ? ' on' : ''}" data-c="${esc(c)}">${esc(c)}</button>`).join('')}</div>
          <div data-list>${rows.length ? rows.map(r => `<div class="inv-card" data-mat="${r.material.id}"><div class="inv-avatar${r.low ? ' warn' : ''}">${icon('box')}</div>
            <div class="inv-info"><div class="n">${esc(materialLabel(r.material))}</div><div class="m">${esc(r.material.category || '')}${r.material.supplier ? ' · ' + esc(r.material.supplier) : ''} · شراء ${fmt(r.material.buyPrice)} / بيع ${fmt(r.material.sellPrice)}</div></div>
            <div class="inv-amount${r.low ? ' due' : ''}">${fmtQ(r.stock)}<small>${esc(r.material.unit || '')}${r.low ? ' · قربت تخلص' : ''}</small></div></div>`).join('') : App.emptyHTML('box', db().materials.length ? 'مفيش نتائج' : 'ضيف الخامات اللي بتشتغل بيها أو بتبيعها علشان تتابع أسعارها ومخزونها')}</div>`;
        const inp = body.querySelector('[data-q]');
        inp.oninput = () => { q = inp.value.trim(); const pos = inp.selectionStart; page.refresh(); const n = page.body.querySelector('[data-q]'); n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) {} };
        body.querySelectorAll('[data-c]').forEach(b => { b.onclick = () => { if (b.dataset.c === 'low') { lowOnly = !lowOnly; catF = 'all'; } else { catF = b.dataset.c; lowOnly = false; } page.refresh(); }; });
        body.querySelectorAll('[data-mat]').forEach(c => { c.onclick = () => openMaterial(c.dataset.mat); });
        act(body, { purchase: () => Docs.openEditor(Docs.newDoc('purchase')), sale: () => Docs.openEditor(Docs.newDoc('supply')) });
      }
    });
  }
  function openMaterialEdit(m, onSaved) {
    const st = m ? Object.assign({}, m) : { name: '', category: '', size: '', color: '', brand: '', unit: 'م²', buyPrice: '', sellPrice: '', openingStock: '', minStock: '', supplier: '', purchaseDate: today(), note: '' };
    UI.openSheet({
      title: m ? 'تعديل الخامة' : 'إضافة خامة', autofocus: !m,
      render(body, sheet) {
        body.innerHTML = UI.formHTML([
          { k: 'name', label: 'اسم الخامة', placeholder: 'مثال: بورسلين / لاصق سيراميك / بردورة', value: st.name },
          { k: 'category', label: 'التصنيف', type: 'chips', options: MAT_CATS.map(c => [c, c]), value: st.category },
          { k: 'size', label: 'المقاس', placeholder: '60×60', value: st.size, half: true },
          { k: 'color', label: 'اللون', optional: true, value: st.color, half: true },
          { k: 'brand', label: 'الشركة المصنعة', optional: true, value: st.brand, half: true },
          { k: 'supplier', label: 'المورد', optional: true, value: st.supplier, half: true },
          { k: 'unit', label: 'وحدة البيع', type: 'chips', options: MAT_UNITS.map(u => [u, u]), value: st.unit },
          { k: 'buyPrice', label: `سعر الشراء (${UI.curSym()})`, type: 'number', placeholder: '0', value: st.buyPrice, half: true },
          { k: 'sellPrice', label: `سعر البيع (${UI.curSym()})`, type: 'number', placeholder: '0', value: st.sellPrice, half: true },
          { k: 'openingStock', label: m ? 'الرصيد الافتتاحي' : 'الكمية الموجودة حالياً', type: 'number', placeholder: '0', value: st.openingStock, half: true },
          { k: 'minStock', label: 'نبهني لما توصل لـ', type: 'number', placeholder: '0', value: st.minStock, half: true },
          { k: 'purchaseDate', label: 'تاريخ الشراء', type: 'date', value: st.purchaseDate },
          { k: 'note', label: 'ملاحظات', type: 'textarea', optional: true, value: st.note },
          { html: btnRow('حفظ الخامة', m ? 'حذف الخامة' : '') }
        ]);
        UI.bindChips(body, (k, v) => { st[k] = v; });
        act(body, {
          cancel: () => UI.back(),
          del: () => {
            if (Store.materialInUse(m.id)) { UI.alert('الخامة دي مستخدمة في مشروعات أو فواتير أو حركات مخزن. مينفعش تتحذف علشان الحسابات ما تبوظش.', 'مينفعش الحذف'); return; }
            UI.confirm(`حذف «${materialLabel(m)}»؟`, () => { Store.remove('materials', m.id); commit('🗑️ تم الحذف'); UI.closeThen(UI.topPage() && UI.topPage().opts.materialId === m.id ? 2 : 1); }, { yes: 'حذف' });
          },
          save: () => {
            Object.assign(st, UI.readForm(body), { category: st.category, unit: st.unit });
            if (!st.name) { UI.toast('⚠️ اكتب اسم الخامة', 'err'); return; }
            ['buyPrice', 'sellPrice', 'openingStock', 'minStock'].forEach(k => { st[k] = nn(st[k]); });
            const saved = Store.upsert('materials', m ? Object.assign(by('materials', m.id), st) : st);
            if (commit('✔️ تم حفظ الخامة')) UI.closeThen(1, () => onSaved && onSaved(saved));
          }
        });
      }
    });
  }
  function materialHistory(mid) {
    const d = db(), out = [];
    const m = by('materials', mid);
    if (m && nn(m.openingStock)) out.push({ date: m.purchaseDate || (m.createdAt || '').slice(0, 10), text: 'رصيد افتتاحي', qty: nn(m.openingStock) });
    d.stockMoves.filter(x => x.materialId === mid).forEach(x => out.push({ id: x.id, move: true, date: x.date, text: ({ purchase: 'شراء', sale: 'بيع', waste: 'هالك / فاقد', adjust: 'تسوية جرد' })[x.type] + (x.note ? ' — ' + x.note : '') + (x.supplier ? ' — ' + x.supplier : ''), qty: x.type === 'purchase' ? nn(x.qty) : (x.type === 'adjust' ? Calc.n(x.qty) : -nn(x.qty)) }));
    d.projectMaterials.filter(x => x.materialId === mid).forEach(x => out.push({ date: x.date, text: 'صرف لمشروع: ' + App.projectName(x.projectId) + (x.waste ? ' (هالك)' : ''), qty: -nn(x.qty) }));
    d.docs.forEach(doc => (doc.rows || []).forEach(r => {
      if (r.materialId !== mid || doc.projectId) return;
      if (doc.type === 'purchase') out.push({ doc: doc.id, date: doc.date, text: 'فاتورة مشتريات ' + (doc.number || ''), qty: nn(r.qty) });
      else if (Fin.DOC_TYPES[doc.type] && Fin.DOC_TYPES[doc.type].sells) out.push({ doc: doc.id, date: doc.date, text: Fin.DOC_TYPES[doc.type].label + ' ' + (doc.number || ''), qty: -nn(r.qty) });
    }));
    return out.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  }
  function openMaterial(id) {
    UI.openPage({
      materialId: id,
      render(body, page) {
        const m = by('materials', id);
        if (!m) { body.innerHTML = App.emptyHTML('alert', 'الخامة اتحذفت'); return; }
        const stock = Fin.stockOf(db(), id);
        const low = nn(m.minStock) > 0 && stock <= nn(m.minStock);
        const hist = materialHistory(id);
        page.setTitle(materialLabel(m), m.category || '');
        page.setActions([{ icon: 'edit', label: 'تعديل', onClick: () => openMaterialEdit(m) }]);
        body.innerHTML = `<section class="hero"><div class="hero-label">الكمية في المخزن</div><div class="hero-value">${fmtQ(stock)}<small>${esc(m.unit || '')}</small></div>
          <div class="hero-stats"><div class="hero-stat"><span>سعر الشراء</span><strong>${fmt(m.buyPrice)}</strong></div><div class="hero-stat"><span>سعر البيع</span><strong>${fmt(m.sellPrice)}</strong></div><div class="hero-stat"><span>قيمة المخزون</span><strong>${fmt(Math.max(0, stock) * nn(m.buyPrice))}</strong></div></div></section>
          ${low ? `<div class="warn-box" style="margin:0 0 12px"><b>تنبيه:</b> الكمية وصلت لحد التنبيه (${fmtQ(m.minStock)} ${esc(m.unit || '')}).</div>` : ''}
          <div class="btn-row" style="margin-bottom:10px"><button type="button" class="btn btn-accent" data-act="buy">${icon('download')} تسجيل شراء</button><button type="button" class="btn btn-soft" data-act="sell">${icon('upload')} بيع (فاتورة)</button></div>
          <div class="btn-row" style="margin-bottom:14px"><button type="button" class="btn btn-ghost" data-act="waste">${icon('trash')} تسجيل هالك</button><button type="button" class="btn btn-ghost" data-act="count">${icon('check')} جرد (تسوية)</button></div>
          ${m.note || m.supplier ? `<div class="note" style="margin-bottom:12px">${m.supplier ? `<strong>المورد:</strong> ${esc(m.supplier)}<br>` : ''}${esc(m.note || '')}</div>` : ''}
          <div class="section-head"><h3>حركة الخامة<span class="count">${hist.length}</span></h3></div>
          ${hist.length ? `<div class="card">${hist.map(h => `<div class="entry${h.qty < 0 ? ' mat' : ''}"${h.move ? ` data-move="${h.id}"` : ''}${h.doc ? ` data-doc="${h.doc}"` : ''}><span class="e-ic">${icon(h.qty < 0 ? 'arrowUp' : 'arrowDown')}</span><div class="e-info"><div class="e-title">${esc(h.text)}</div><div class="e-meta">${esc(fmtDate(h.date))}</div></div><div class="e-amt" dir="ltr">${h.qty > 0 ? '+' : ''}${fmtQ(h.qty)}</div></div>`).join('')}</div>` : App.emptyHTML('box', 'مفيش حركات لسه')}`;
        body.querySelectorAll('[data-move]').forEach(e => { e.onclick = () => openMoveSheet(m, null, by('stockMoves', e.dataset.move)); });
        body.querySelectorAll('[data-doc]').forEach(e => { e.onclick = () => Docs.openEditor(by('docs', e.dataset.doc)); });
        act(body, {
          buy: () => openMoveSheet(m, 'purchase'), waste: () => openMoveSheet(m, 'waste'), count: () => openMoveSheet(m, 'adjust'),
          sell: () => { const d = Docs.newDoc('supply'); d.rows.push({ id: Store.uid('r'), name: materialLabel(m), qty: 1, unit: m.unit, price: m.sellPrice, materialId: m.id }); Docs.openEditor(d); }
        });
      }
    });
  }
  function openMoveSheet(m, type, mv) {
    type = mv ? mv.type : type;
    const stock = Fin.stockOf(db(), m.id);
    const st = mv ? Object.assign({}, mv) : { materialId: m.id, type, qty: '', price: type === 'purchase' ? m.buyPrice : '', date: today(), supplier: m.supplier || '', note: '' };
    if (type === 'adjust' && !mv) st.actual = '';
    const titles = { purchase: 'تسجيل شراء', waste: 'تسجيل هالك / فاقد', adjust: 'جرد المخزن (تسوية)', sale: 'بيع' };
    UI.openSheet({
      title: titles[type], autofocus: true,
      render(body) {
        const f = type === 'adjust' && !mv
          ? [{ k: 'actual', label: `الكمية الفعلية بعد الجرد (${m.unit || ''})`, type: 'number', hint: `المسجل حالياً: ${fmtQ(stock)} — الفرق هيتسجل تسوية` }]
          : [{ k: 'qty', label: `الكمية (${m.unit || ''})`, type: type === 'adjust' ? 'text' : 'number', value: st.qty, half: type === 'purchase', hint: type === 'adjust' ? 'بالسالب للنقص' : '' }];
        if (type === 'purchase') f.push({ k: 'price', label: `سعر شراء الوحدة (${UI.curSym()})`, type: 'number', value: st.price, half: true }, { k: 'supplier', label: 'المورد', optional: true, value: st.supplier }, { k: 'updatePrice', label: 'حدّث سعر الشراء في بيانات الخامة', type: 'switch', value: !mv });
        f.push({ k: 'date', label: 'التاريخ', type: 'date', value: st.date }, { k: 'note', label: 'ملاحظة', optional: true, value: st.note }, { html: btnRow('حفظ', mv ? 'حذف الحركة' : '') });
        body.innerHTML = (type === 'purchase' ? '<p class="hint" style="margin:-6px 0 10px">للمشتريات الكبيرة من مورد بأكتر من صنف استخدم «فاتورة مشتريات».</p>' : '') + UI.formHTML(f, st);
        act(body, {
          cancel: () => UI.back(),
          del: () => UI.confirm('حذف الحركة دي؟ المخزن هيتعدل.', () => { Store.remove('stockMoves', mv.id); commit('🗑️ تم الحذف'); UI.back(); }, { yes: 'حذف' }),
          save: () => {
            const o = UI.readForm(body);
            if (type === 'adjust' && !mv) {
              if (o.actual === '') { UI.toast('⚠️ اكتب الكمية الفعلية', 'err'); return; }
              const diff = round(Calc.n(o.actual) - stock, 4);
              if (!diff) { UI.toast('الكمية مطابقة، مفيش تسوية'); UI.back(); return; }
              Store.upsert('stockMoves', { materialId: m.id, type: 'adjust', qty: diff, date: o.date, note: o.note || ('جرد: ' + fmtQ(o.actual)) });
            } else {
              const q = type === 'adjust' ? Calc.n(o.qty) : nn(o.qty);
              if (!q) { UI.toast('⚠️ اكتب الكمية', 'err'); return; }
              Object.assign(st, { qty: q, price: nn(o.price), supplier: o.supplier || '', date: o.date, note: o.note });
              Store.upsert('stockMoves', mv ? Object.assign(by('stockMoves', mv.id), st) : st);
              if (type === 'purchase' && o.updatePrice && nn(o.price)) { const mm = by('materials', m.id); mm.buyPrice = nn(o.price); if (o.supplier) mm.supplier = o.supplier; Store.upsert('materials', mm); }
            }
            if (commit('✔️ تم تسجيل الحركة')) UI.back();
          }
        });
      }
    });
  }
  function pickMaterial(cb) {
    let q = '';
    UI.openSheet({
      title: 'اختيار خامة من المخزن', refreshBelow: false,
      render(body) {
        body.innerHTML = `<div class="field"><input type="search" data-q placeholder="ابحث..."></div><div class="suggest pick-list" style="margin-top:0" data-list></div>`;
        const draw = () => {
          const rows = Fin.inventory(db()).rows.filter(r => !q || materialLabel(r.material).includes(q));
          const l = body.querySelector('[data-list]');
          l.innerHTML = `<button type="button" data-new="1"><span class="s-av add">${icon('plus')}</span><span style="flex:1">إضافة خامة جديدة للمخزن</span></button>` +
            rows.map(r => `<button type="button" data-id="${r.material.id}"><span class="s-av">${icon('box')}</span><span style="flex:1;min-width:0">${esc(materialLabel(r.material))}<small>المتاح ${fmtQ(r.stock)} ${esc(r.material.unit || '')} · شراء ${fmt(r.material.buyPrice)} · بيع ${fmt(r.material.sellPrice)}</small></span></button>`).join('');
          UI.hydrateIcons(l);
          l.querySelectorAll('[data-id]').forEach(b => { b.onclick = () => { const m = by('materials', b.dataset.id); UI.closeThen(1, () => cb(m)); }; });
          l.querySelector('[data-new]').onclick = () => UI.closeThen(1, () => openMaterialEdit(null, cb));
        };
        body.querySelector('[data-q]').oninput = e => { q = e.target.value.trim(); draw(); };
        draw();
      }
    });
  }

  /* ================= العمال ================= */
  function openWorkers() {
    UI.openPage({
      title: 'العمال والصنايعية', sub: 'اليوميات والسلف والمستحقات',
      actions: [{ icon: 'plus', label: 'إضافة عامل', accent: true, onClick: () => openWorkerEdit(null) }],
      render(body) {
        const ws = db().workers.map(w => ({ w, b: Fin.workerBalance(db(), w) }));
        const active = ws.filter(x => x.w.active !== false), inactive = ws.filter(x => x.w.active === false);
        const card = x => `<div class="cust-card" data-w="${x.w.id}"><div class="inv-avatar">${icon('hardhat')}</div><div class="inv-info"><div class="n">${esc(x.w.name)}</div><div class="m">${esc(x.w.role || '')} · يومية ${fmt(x.w.dailyWage)} · ${fmtQ(x.b.days)} يوم</div></div><div class="cust-amt ${x.b.due > 0 ? 'due' : 'ok'}">${fmt(Math.abs(x.b.due))}<small>${x.b.due > 0 ? 'مستحق له' : (x.b.due < 0 ? 'عليه (سلف زيادة)' : 'خالص')}</small></div></div>`;
        body.innerHTML = `<section class="hero"><div class="hero-label">إجمالي المستحق للعمال</div><div class="hero-value">${fmt(Calc.sum(ws, x => Math.max(0, x.b.due)))}<small>${UI.curSym()}</small></div>
          <div class="hero-stats"><div class="hero-stat"><span>عدد العمال</span><strong>${active.length}</strong></div><div class="hero-stat"><span>إجمالي الأجور</span><strong>${fmt(Calc.sum(ws, x => x.b.earned))}</strong></div><div class="hero-stat"><span>السلف</span><strong>${fmt(Calc.sum(ws, x => x.b.advances))}</strong></div></div></section>
          <button type="button" class="btn btn-accent" style="margin-bottom:12px" data-act="day">${icon('calendar')} تسجيل يومية (لعامل أو أكتر)</button>
          ${active.length ? active.map(card).join('') : App.emptyHTML('hardhat', 'ضيف العمال والمساعدين علشان تسجل يومياتهم وسلفهم', `<button type="button" class="btn btn-soft" data-act="add">${icon('plus')} إضافة عامل</button>`)}
          ${inactive.length ? `<h4 class="more-h">عمال متوقفين</h4>${inactive.map(card).join('')}` : ''}`;
        body.querySelectorAll('[data-w]').forEach(c => { c.onclick = () => openWorker(c.dataset.w); });
        act(body, { day: () => openDailyLog({}), add: () => openWorkerEdit(null) });
      }
    });
  }
  function openWorkerEdit(w) {
    const st = w ? Object.assign({}, w) : { name: '', role: 'صنايعي', dailyWage: '', phone: '', note: '', active: true };
    UI.openSheet({
      title: w ? 'تعديل بيانات العامل' : 'إضافة عامل', autofocus: !w,
      render(body) {
        body.innerHTML = UI.formHTML([
          { k: 'name', label: 'الاسم', value: st.name },
          { k: 'role', label: 'الصفة', type: 'chips', options: [['صنايعي', 'صنايعي / فني'], ['مساعد', 'مساعد'], ['عامل', 'عامل'], ['مقاول باطن', 'مقاول باطن']], value: st.role },
          { k: 'dailyWage', label: `الأجر اليومي (${UI.curSym()})`, type: 'number', value: st.dailyWage, half: true },
          { k: 'phone', label: 'الهاتف', type: 'tel', optional: true, value: st.phone, half: true },
          { k: 'note', label: 'ملاحظات', type: 'textarea', optional: true, value: st.note },
          w ? { k: 'active', label: 'العامل شغال معايا حالياً', type: 'switch', value: st.active !== false } : null,
          { html: btnRow('حفظ', w ? 'حذف العامل' : '') }
        ]);
        UI.bindChips(body, (k, v) => { st[k] = v; });
        act(body, {
          cancel: () => UI.back(),
          del: () => {
            const b = Fin.workerBalance(db(), w);
            if (b.logs.length || b.txns.length) { UI.alert('العامل ده عليه يوميات أو سلف مسجلة. علشان حسابات المشروعات ما تتأثرش، خليه «متوقف» بدل الحذف.', 'مينفعش الحذف'); return; }
            UI.confirm(`حذف «${w.name}»؟`, () => { Store.remove('workers', w.id); commit('🗑️ تم الحذف'); UI.closeThen(UI.topPage() && UI.topPage().opts.workerId === w.id ? 2 : 1); }, { yes: 'حذف' });
          },
          save: () => {
            Object.assign(st, UI.readForm(body), { role: st.role });
            if (!st.name) { UI.toast('⚠️ اكتب الاسم', 'err'); return; }
            st.dailyWage = nn(st.dailyWage);
            Store.upsert('workers', w ? Object.assign(by('workers', w.id), st) : st);
            if (commit('✔️ تم الحفظ')) UI.back();
          }
        });
      }
    });
  }
  function logEntryHTML(l) {
    const w = by('workers', l.workerId);
    return `<div class="entry" data-log="${l.id}"><span class="e-ic">${icon('hardhat')}</span><div class="e-info"><div class="e-title">${esc(w ? w.name : 'عامل')} — ${fmtQ(l.days)} يوم</div><div class="e-meta">${esc(fmtDate(l.date))} · ${esc(App.projectName(l.projectId) || 'بدون مشروع')} · يومية ${fmt(l.wage)}${l.note ? ' · ' + esc(l.note) : ''}</div></div><div class="e-amt">${fmt(nn(l.days) * nn(l.wage))}</div></div>`;
  }
  function txnEntryHTML(t) {
    return `<div class="entry ${t.kind === 'advance' ? 'mat' : 'matpay'}" data-txn="${t.id}"><span class="e-ic">${icon(t.kind === 'advance' ? 'wallet' : 'cash')}</span><div class="e-info"><div class="e-title">${t.kind === 'advance' ? 'سلفة' : 'صرف مستحقات'}</div><div class="e-meta">${esc(fmtDate(t.date))}${t.note ? ' · ' + esc(t.note) : ''}</div></div><div class="e-amt">${fmt(t.amount)}</div></div>`;
  }
  function openWorker(id) {
    UI.openPage({
      workerId: id,
      render(body, page) {
        const w = by('workers', id);
        if (!w) { body.innerHTML = App.emptyHTML('alert', 'العامل اتحذف'); return; }
        const b = Fin.workerBalance(db(), w);
        page.setTitle(w.name, `${w.role || ''} · يومية ${fmt(w.dailyWage)}`);
        page.setActions([{ icon: 'edit', label: 'تعديل', onClick: () => openWorkerEdit(w) }]);
        const items = b.logs.map(l => ({ d: l.date, h: logEntryHTML(l) })).concat(b.txns.map(t => ({ d: t.date, h: txnEntryHTML(t) }))).sort((x, y) => String(y.d).localeCompare(String(x.d)));
        body.innerHTML = `<section class="hero"><div class="hero-label">${b.due >= 0 ? 'المستحق له' : 'عليه (سلف زيادة عن أجره)'}</div><div class="hero-value">${fmt(Math.abs(b.due))}<small>${UI.curSym()}</small></div>
          <div class="hero-stats"><div class="hero-stat"><span>أيام العمل</span><strong>${fmtQ(b.days)}</strong></div><div class="hero-stat"><span>إجمالي الأجر</span><strong>${fmt(b.earned)}</strong></div><div class="hero-stat"><span>سلف + مصروف</span><strong>${fmt(b.advances + b.paid)}</strong></div></div></section>
          <button type="button" class="btn btn-accent" style="margin-bottom:10px" data-act="log">${icon('calendar')} تسجيل يومية</button>
          <div class="btn-row" style="margin-bottom:14px"><button type="button" class="btn btn-soft" data-act="adv">${icon('wallet')} سلفة</button><button type="button" class="btn btn-soft" data-act="pay">${icon('cash')} صرف مستحقات</button></div>
          ${w.phone ? `<a class="btn btn-ghost" style="margin-bottom:14px" href="tel:${esc(w.phone)}">${icon('phone')} اتصال</a>` : ''}
          <div class="section-head"><h3>السجل<span class="count">${items.length}</span></h3></div>
          ${items.length ? `<div class="card">${items.map(x => x.h).join('')}</div>` : App.emptyHTML('calendar', 'مفيش يوميات أو سلف لسه')}`;
        body.querySelectorAll('[data-log]').forEach(e => { e.onclick = () => openLogSheet(by('workLogs', e.dataset.log)); });
        body.querySelectorAll('[data-txn]').forEach(e => { e.onclick = () => openTxnSheet(w, null, by('workerTxns', e.dataset.txn)); });
        act(body, { log: () => openDailyLog({ workerId: id }), adv: () => openTxnSheet(w, 'advance'), pay: () => openTxnSheet(w, 'pay', null, b.due) });
      }
    });
  }
  function openTxnSheet(w, kind, t, due) {
    kind = t ? t.kind : kind;
    const st = t ? Object.assign({}, t) : { workerId: w.id, kind, amount: kind === 'pay' && due > 0 ? round(due, 2) : '', date: today(), note: '' };
    UI.openSheet({
      title: (kind === 'advance' ? 'سلفة' : 'صرف مستحقات') + ' — ' + w.name, autofocus: true,
      render(body) {
        body.innerHTML = UI.formHTML([{ k: 'amount', label: `المبلغ (${UI.curSym()})`, type: 'number', value: st.amount, half: true }, { k: 'date', label: 'التاريخ', type: 'date', value: st.date, half: true }, { k: 'note', label: 'ملاحظة', optional: true, value: st.note }, { html: btnRow('حفظ', t ? 'حذف' : '') }]);
        act(body, {
          cancel: () => UI.back(),
          del: () => UI.confirm('حذف السجل ده؟', () => { Store.remove('workerTxns', t.id); commit('🗑️ تم الحذف'); UI.back(); }, { yes: 'حذف' }),
          save: () => { const o = UI.readForm(body); if (!(nn(o.amount) > 0)) { UI.toast('⚠️ اكتب المبلغ', 'err'); return; } Object.assign(st, o, { amount: nn(o.amount) }); Store.upsert('workerTxns', t ? Object.assign(by('workerTxns', t.id), st) : st); if (commit('✔️ تم الحفظ')) UI.back(); }
        });
      }
    });
  }
  // تسجيل يومية لعامل أو أكتر على مشروع
  function openDailyLog(init) {
    const workers = db().workers.filter(w => w.active !== false);
    if (!workers.length) { UI.confirm('لازم تضيف العمال الأول. تضيف عامل دلوقتي؟', () => openWorkerEdit(null), { yes: 'إضافة عامل', safe: true }); return; }
    const st = { projectId: init.projectId || null, date: today(), days: 1, sel: {}, note: '' };
    workers.forEach(w => { st.sel[w.id] = { on: init.workerId === w.id, wage: w.dailyWage }; });
    UI.openSheet({
      title: 'تسجيل يومية',
      render(body, sheet) {
        const p = st.projectId && by('projects', st.projectId);
        body.innerHTML = `<div class="field"><label>المشروع</label><div class="link-box" style="margin-top:0"><span class="l-ic">${icon('briefcase')}</span><span class="l-txt"><b>${p ? esc(p.name) : 'بدون مشروع (مصروف عام)'}</b></span><button type="button" class="btn btn-ghost btn-sm" data-act="proj">تغيير</button></div></div>
          ${UI.formHTML([{ k: 'date', label: 'التاريخ', type: 'date', value: st.date, half: true }, { k: 'days', label: 'عدد الأيام', type: 'number', value: st.days, half: true, hint: 'نص يوم = 0.5' }])}
          <label class="field" style="display:block"><span style="font-size:.8rem;color:var(--muted);font-weight:700">العمال (علّم على اللي اشتغلوا)</span></label>
          ${workers.map(w => `<div class="worker-row"><label class="wr-check"><input type="checkbox" data-w="${w.id}"${st.sel[w.id].on ? ' checked' : ''}><span>${esc(w.name)}<small>${esc(w.role || '')}</small></span></label><input type="number" inputmode="decimal" min="0" step="any" data-wage="${w.id}" value="${esc(st.sel[w.id].wage)}" aria-label="اليومية"></div>`).join('')}
          ${UI.formHTML([{ k: 'note', label: 'ملاحظة', optional: true, value: st.note }])}
          <div class="live-total"><span id="dlCount"></span><strong id="dlTotal"></strong></div>${btnRow('تسجيل')}`;
        const live = () => {
          Object.assign(st, UI.readForm(body));
          body.querySelectorAll('[data-w]').forEach(c => { st.sel[c.dataset.w].on = c.checked; });
          body.querySelectorAll('[data-wage]').forEach(i => { st.sel[i.dataset.wage].wage = i.value; });
          const on = Object.values(st.sel).filter(s => s.on);
          body.querySelector('#dlCount').textContent = `${on.length} عامل × ${fmtQ(st.days)} يوم`;
          body.querySelector('#dlTotal').textContent = money(Calc.sum(on, s => nn(s.wage) * nn(st.days)));
        };
        body.querySelectorAll('input').forEach(i => i.addEventListener('input', live));
        body.querySelectorAll('input[type=checkbox]').forEach(i => i.addEventListener('change', live));
        live();
        act(body, {
          proj: () => { live(); App.pickProject(id => { st.projectId = id; sheet.refresh(); }); },
          cancel: () => UI.back(),
          save: () => {
            live();
            const on = Object.entries(st.sel).filter(([, s]) => s.on);
            if (!on.length) { UI.toast('⚠️ علّم على عامل واحد على الأقل', 'err'); return; }
            if (!(nn(st.days) > 0)) { UI.toast('⚠️ اكتب عدد الأيام', 'err'); return; }
            on.forEach(([wid, s]) => Store.upsert('workLogs', { workerId: wid, projectId: st.projectId, date: st.date, days: nn(st.days), wage: nn(s.wage), note: st.note }));
            if (commit(`✔️ تم تسجيل يومية ${on.length} عامل`)) UI.back();
          }
        });
      }
    });
  }
  function openLogSheet(l) {
    const st = Object.assign({}, l);
    UI.openSheet({
      title: 'تعديل اليومية',
      render(body, sheet) {
        const w = by('workers', st.workerId), p = st.projectId && by('projects', st.projectId);
        body.innerHTML = `<div class="note" style="margin-bottom:12px"><strong>${esc(w ? w.name : 'عامل')}</strong> — ${esc(p ? p.name : 'بدون مشروع')} <button type="button" class="chip" data-act="proj">تغيير المشروع</button></div>` + UI.formHTML([
          { k: 'date', label: 'التاريخ', type: 'date', value: st.date, half: true }, { k: 'days', label: 'الأيام', type: 'number', value: st.days, half: true },
          { k: 'wage', label: `اليومية (${UI.curSym()})`, type: 'number', value: st.wage }, { k: 'note', label: 'ملاحظة', optional: true, value: st.note }, { html: btnRow('حفظ', 'حذف اليومية') }]);
        act(body, {
          proj: () => { Object.assign(st, UI.readForm(body)); App.pickProject(id => { st.projectId = id; sheet.refresh(); }); },
          cancel: () => UI.back(),
          del: () => UI.confirm('حذف اليومية دي؟', () => { Store.remove('workLogs', l.id); commit('🗑️ تم الحذف'); UI.back(); }, { yes: 'حذف' }),
          save: () => { const o = UI.readForm(body); if (!(nn(o.days) > 0)) { UI.toast('⚠️ اكتب الأيام', 'err'); return; } Object.assign(st, o, { days: nn(o.days), wage: nn(o.wage) }); Store.upsert('workLogs', Object.assign(by('workLogs', l.id), st)); if (commit('✔️ تم الحفظ')) UI.back(); }
        });
      }
    });
  }

  /* ================= المصروفات ================= */
  function expenseEntryHTML(e) {
    return `<div class="entry mat" data-exp="${e.id}"><span class="e-ic">${icon(e.category === 'transport' ? 'truck' : 'receipt')}</span><div class="e-info"><div class="e-title">${esc(Fin.EXPENSE_CATS[e.category] || 'مصروف')}${e.note ? ' — ' + esc(e.note) : ''}</div><div class="e-meta">${esc(fmtDate(e.date))} · ${esc(App.projectName(e.projectId) || 'مصروف عام / إداري')}</div></div><div class="e-amt">${fmt(e.amount)}</div></div>`;
  }
  function openExpenseSheet(init) {
    const orig = init && init.id ? init : null;
    const st = orig ? Object.assign({}, orig) : Object.assign({ projectId: null, category: 'transport', amount: '', date: today(), note: '' }, init || {});
    UI.openSheet({
      title: orig ? 'تعديل المصروف' : 'تسجيل مصروف', autofocus: !orig,
      render(body, sheet) {
        const p = st.projectId && by('projects', st.projectId);
        body.innerHTML = `<div class="field"><label>على مشروع؟</label><div class="link-box" style="margin-top:0"><span class="l-ic">${icon('briefcase')}</span><span class="l-txt"><b>${p ? esc(p.name) : 'مصروف عام / إداري (مش على مشروع)'}</b></span><button type="button" class="btn btn-ghost btn-sm" data-act="proj">${p ? 'تغيير' : 'اختيار'}</button>${p ? `<button type="button" class="btn btn-ghost btn-sm" data-act="noproj">عام</button>` : ''}</div></div>` + UI.formHTML([
          { k: 'category', label: 'نوع المصروف', type: 'chips', options: Object.entries(Fin.EXPENSE_CATS), value: st.category },
          { k: 'amount', label: `المبلغ (${UI.curSym()})`, type: 'number', value: st.amount, half: true }, { k: 'date', label: 'التاريخ', type: 'date', value: st.date, half: true },
          { k: 'note', label: 'البيان / ملاحظة', optional: true, placeholder: 'مثال: نقل 40 شيكارة لاصق', value: st.note }, { html: btnRow('حفظ', orig ? 'حذف' : '') }]);
        const sync = () => Object.assign(st, UI.readForm(body), { category: st.category });
        UI.bindChips(body, (k, v) => { st[k] = v; });
        act(body, {
          proj: () => { sync(); App.pickProject(id => { st.projectId = id; sheet.refresh(); }); },
          noproj: () => { sync(); st.projectId = null; sheet.refresh(); },
          cancel: () => UI.back(),
          del: () => UI.confirm('حذف المصروف؟', () => { Store.remove('expenses', orig.id); commit('🗑️ تم الحذف'); UI.back(); }, { yes: 'حذف' }),
          save: () => { sync(); if (!(nn(st.amount) > 0)) { UI.toast('⚠️ اكتب المبلغ', 'err'); return; } st.amount = nn(st.amount); Store.upsert('expenses', orig ? Object.assign(by('expenses', orig.id), st) : st); if (commit('✔️ تم تسجيل المصروف')) UI.back(); }
        });
      }
    });
  }
  function openExpenses() {
    let f = 'all';
    UI.openPage({
      title: 'المصروفات', sub: 'مصروفات المشروعات والمصروفات الإدارية',
      actions: [{ icon: 'plus', label: 'مصروف جديد', accent: true, onClick: () => openExpenseSheet({}) }],
      render(body, page) {
        const all = db().expenses.slice().sort(App.sortByDateDesc);
        const list = all.filter(e => f === 'all' || (f === 'general' ? !e.projectId : (f === 'project' ? !!e.projectId : e.category === f)));
        const month = today().slice(0, 7);
        body.innerHTML = `${App.statsHTML([['الإجمالي', money(Calc.sum(all, e => e.amount))], ['الشهر ده', money(Calc.sum(all.filter(e => String(e.date).startsWith(month)), e => e.amount))], ['إدارية / عامة', money(Calc.sum(all.filter(e => !e.projectId), e => e.amount))]])}
          <div class="filter-chips">${[['all', 'الكل'], ['project', 'على مشروعات'], ['general', 'عامة']].concat(Object.entries(Fin.EXPENSE_CATS)).map(([k, l]) => `<button type="button" class="chip${f === k ? ' on' : ''}" data-f="${k}">${l}</button>`).join('')}</div>
          ${list.length ? `<div class="card">${list.map(expenseEntryHTML).join('')}</div>` : App.emptyHTML('receipt', 'مفيش مصروفات')}`;
        body.querySelectorAll('[data-f]').forEach(b => { b.onclick = () => { f = b.dataset.f; page.refresh(); }; });
        body.querySelectorAll('[data-exp]').forEach(e => { e.onclick = () => openExpenseSheet(by('expenses', e.dataset.exp)); });
      }
    });
  }

  /* ================= النوتة ================= */
  const NOTE_KINDS = { general: 'عامة', customer: 'عميل', project: 'مشروع', debt: 'مديونية', appointment: 'موعد', measure: 'مقاسات', agreement: 'اتفاق', quick: 'سريعة' };
  function noteCardHTML(n) {
    const overdue = n.date && !n.done && n.date < today() && (n.kind === 'appointment' || n.kind === 'debt');
    const links = [App.customerName(n.customerId), App.projectName(n.projectId)].filter(Boolean).join(' · ');
    return `<div class="note-card${n.done ? ' done' : ''}" data-note="${n.id}"><div class="nc-top"><span class="src-badge">${esc(NOTE_KINDS[n.kind] || 'عامة')}</span>${n.date ? `<span class="nc-date${overdue ? ' over' : ''}">${icon('calendar')} ${esc(fmtDate(n.date))}</span>` : ''}${n.done ? '<span class="nc-date">✓ تم</span>' : ''}</div>
      ${n.title ? `<b>${esc(n.title)}</b>` : ''}${n.body ? `<p>${esc(n.body)}</p>` : ''}${links ? `<small>${icon('pin')} ${esc(links)}</small>` : ''}</div>`;
  }
  function bindNoteCards(el) { el.querySelectorAll('[data-note]').forEach(c => { c.onclick = () => openNoteSheet(by('notes', c.dataset.note)); }); }
  function openNoteSheet(n, init) {
    const st = n ? Object.assign({}, n) : Object.assign({ kind: 'general', title: '', body: '', customerId: null, projectId: null, date: '', done: false }, init || {});
    UI.openSheet({
      title: n ? 'تعديل الملاحظة' : 'ملاحظة جديدة', autofocus: !n,
      render(body, sheet) {
        const c = st.customerId && by('customers', st.customerId), p = st.projectId && by('projects', st.projectId);
        body.innerHTML = UI.formHTML([
          { k: 'kind', label: 'النوع', type: 'chips', options: Object.entries(NOTE_KINDS), value: st.kind },
          { k: 'title', label: 'العنوان', optional: true, placeholder: 'مثال: معاينة شقة المعادي', value: st.title },
          { k: 'body', label: 'الملاحظة', type: 'textarea', placeholder: 'اكتب أي تفاصيل: مقاسات، اتفاق، مبلغ متبقي...', value: st.body },
          { k: 'date', label: st.kind === 'appointment' ? 'ميعاد الموعد' : 'تاريخ (اختياري)', type: 'date', value: st.date },
          { html: `<div class="field"><label>مربوطة بـ</label><div class="btn-row"><button type="button" class="chip" data-act="cust">${icon('user')} ${c ? esc(c.name) : 'عميل'}</button><button type="button" class="chip" data-act="proj">${icon('briefcase')} ${p ? esc(p.name) : 'مشروع'}</button></div>${c || p ? '<button type="button" class="link-btn" data-act="unlink">فك الربط</button>' : ''}</div>` },
          n ? { k: 'done', label: 'تم / انتهت', type: 'switch', value: st.done } : null,
          { html: btnRow('حفظ', n ? 'حذف الملاحظة' : '') }]);
        const sync = () => Object.assign(st, UI.readForm(body), { kind: st.kind });
        UI.bindChips(body, (k, v) => { sync(); st[k] = v; sheet.refresh(); });
        act(body, {
          cust: () => { sync(); App.pickCustomer(id => { st.customerId = id; sheet.refresh(); }); },
          proj: () => { sync(); App.pickProject(id => { st.projectId = id; const pr = by('projects', id); if (pr && pr.customerId) st.customerId = pr.customerId; sheet.refresh(); }); },
          unlink: () => { sync(); st.customerId = null; st.projectId = null; sheet.refresh(); },
          cancel: () => UI.back(),
          del: () => UI.confirm('حذف الملاحظة؟', () => { Store.remove('notes', n.id); commit('🗑️ تم الحذف'); UI.back(); }, { yes: 'حذف' }),
          save: () => { sync(); if (!st.title && !st.body) { UI.toast('⚠️ اكتب الملاحظة', 'err'); return; } Store.upsert('notes', n ? Object.assign(by('notes', n.id), st) : st); if (commit('✔️ تم حفظ الملاحظة')) UI.back(); }
        });
      }
    });
  }
  function openNotes() {
    let f = 'all', q = '';
    UI.openPage({
      title: 'النوتة', sub: 'ملاحظات، مواعيد، مديونيات، مقاسات',
      actions: [{ icon: 'plus', label: 'ملاحظة جديدة', accent: true, onClick: () => openNoteSheet(null) }],
      render(body, page) {
        let list = db().notes.slice();
        if (f === 'open') list = list.filter(n => !n.done); else if (f !== 'all') list = list.filter(n => n.kind === f);
        if (q) list = list.filter(n => [n.title, n.body, App.customerName(n.customerId), App.projectName(n.projectId)].join(' ').includes(q));
        list.sort((a, b) => (a.done - b.done) || String(b.date || b.createdAt).localeCompare(String(a.date || a.createdAt)));
        body.innerHTML = `<div class="field" style="margin-bottom:10px"><input type="search" data-q placeholder="ابحث في النوتة..." value="${esc(q)}"></div>
          <div class="filter-chips">${[['all', 'الكل'], ['open', 'مفتوحة']].concat(Object.entries(NOTE_KINDS)).map(([k, l]) => `<button type="button" class="chip${f === k ? ' on' : ''}" data-f="${k}">${l}</button>`).join('')}</div>
          ${list.length ? list.map(noteCardHTML).join('') : App.emptyHTML('note', 'النوتة فاضية. سجّل أي حاجة: مقاسات، اتفاق مع عميل، ميعاد معاينة...')}`;
        const inp = body.querySelector('[data-q]');
        inp.oninput = () => { q = inp.value.trim(); const pos = inp.selectionStart; page.refresh(); const x = page.body.querySelector('[data-q]'); x.focus(); try { x.setSelectionRange(pos, pos); } catch (e) {} };
        body.querySelectorAll('[data-f]').forEach(b => { b.onclick = () => { f = b.dataset.f; page.refresh(); }; });
        bindNoteCards(body);
      }
    });
  }

  /* ================= أنواع الأرضيات والأعمال ================= */
  function openFloorTypes() {
    UI.openPage({
      title: 'أنواع الأرضيات والأعمال', sub: 'الكتالوج اللي بتختار منه البنود',
      actions: [{ icon: 'plus', label: 'إضافة نوع', accent: true, onClick: () => openFloorTypeEdit(null) }],
      render(body) {
        const cats = db().settings.categories;
        body.innerHTML = `<div class="note" style="margin-bottom:12px">حدد لكل شغلانة وحدتها وطريقة حسابها وسعرك المعتاد، علشان لما تضيف بند في مشروع يتملى لوحده. تقدر تضيف أنواع وتصنيفات جديدة أو تعدل أو تحذف.</div>
          <button type="button" class="btn btn-ghost" style="margin-bottom:12px" data-act="cats">${icon('layers')} التصنيفات (${Object.keys(cats).length})</button>
          ${Object.entries(cats).map(([k, label]) => { const items = db().floorTypes.filter(f => f.cat === k); return `<div class="section-head"><h3>${esc(label)}<span class="count">${items.length}</span></h3></div>${items.length ? `<div class="card">${items.map(f => `<div class="entry" data-ft="${f.id}"><span class="e-ic">${icon('tiles')}</span><div class="e-info"><div class="e-title">${esc(f.name)}</div><div class="e-meta">${esc(f.unit)} · ${esc(Calc.SCOPES[f.scope] || '')}${nn(f.waste) ? ' · هالك ' + f.waste + '%' : ''}</div></div><div class="e-amt">${nn(f.laborPrice) ? fmt(f.laborPrice) : '—'}</div></div>`).join('')}</div>` : ''}`; }).join('')}
          ${db().floorTypes.some(f => !cats[f.cat]) ? `<div class="section-head"><h3>بدون تصنيف</h3></div><div class="card">${db().floorTypes.filter(f => !cats[f.cat]).map(f => `<div class="entry" data-ft="${f.id}"><span class="e-ic">${icon('tiles')}</span><div class="e-info"><div class="e-title">${esc(f.name)}</div></div></div>`).join('')}</div>` : ''}`;
        body.querySelectorAll('[data-ft]').forEach(e => { e.onclick = () => openFloorTypeEdit(by('floorTypes', e.dataset.ft)); });
        act(body, { cats: openCategories });
      }
    });
  }
  function openFloorTypeEdit(f) {
    const cats = db().settings.categories;
    const st = f ? Object.assign({}, f) : { cat: Object.keys(cats)[0] || 'other', name: '', unit: 'م²', basis: 'measure', scope: 'labor', laborPrice: '', materialPrice: '', waste: '' };
    UI.openSheet({
      title: f ? 'تعديل نوع العمل' : 'إضافة نوع عمل', autofocus: !f,
      render(body, sheet) {
        body.innerHTML = UI.formHTML([
          { k: 'name', label: 'اسم الشغلانة', placeholder: 'مثال: تركيب سيراميك 120×60', value: st.name },
          { k: 'cat', label: 'التصنيف', type: 'chips', options: Object.entries(cats), value: st.cat },
          { k: 'basis', label: 'طريقة الحساب', type: 'chips', options: Object.entries(Calc.BASIS), value: st.basis },
          st.basis === 'measure' ? { k: 'unit', label: 'الوحدة', type: 'chips', options: Calc.UNITS.map(u => [u, u]), value: st.unit } : null,
          { k: 'scope', label: 'النطاق', type: 'chips', options: Object.entries(Calc.SCOPES), value: st.scope },
          { k: 'laborPrice', label: `سعر المصنعية المعتاد (${UI.curSym()})`, type: 'number', optional: true, value: st.laborPrice, half: true },
          { k: 'materialPrice', label: `سعر الخامة المعتاد (${UI.curSym()})`, type: 'number', optional: true, value: st.materialPrice, half: true },
          { k: 'waste', label: 'نسبة الهالك المعتادة %', type: 'number', optional: true, value: st.waste },
          { html: btnRow('حفظ', f ? 'حذف' : '') }]);
        UI.bindChips(body, (k, v) => { Object.assign(st, UI.readForm(body)); st[k] = v; if (k === 'basis' && v !== 'measure') st.unit = v === 'daily' ? 'يوم' : 'مقطوعية'; sheet.refresh(); });
        act(body, {
          cancel: () => UI.back(),
          del: () => UI.confirm(`حذف «${f.name}» من الكتالوج؟ (البنود المسجلة في المشروعات مش هتتأثر)`, () => { Store.remove('floorTypes', f.id); commit('🗑️ تم الحذف'); UI.back(); }, { yes: 'حذف' }),
          save: () => { Object.assign(st, UI.readForm(body), { cat: st.cat, basis: st.basis, unit: st.unit, scope: st.scope }); if (!st.name) { UI.toast('⚠️ اكتب الاسم', 'err'); return; } Store.upsert('floorTypes', f ? Object.assign(by('floorTypes', f.id), st) : st); if (commit('✔️ تم الحفظ')) UI.back(); }
        });
      }
    });
  }
  function openCategories() {
    UI.openSheet({
      title: 'تصنيفات الأرضيات',
      render(body, sheet) {
        const cats = db().settings.categories;
        body.innerHTML = `${Object.entries(cats).map(([k, l]) => `<div class="extra-row" style="grid-template-columns:1fr 40px"><input type="text" data-cat="${esc(k)}" value="${esc(l)}"><button type="button" class="card-del" data-act="rm" data-id="${esc(k)}">${icon('trash')}</button></div>`).join('')}
          <div class="extra-row" style="grid-template-columns:1fr 40px"><input type="text" data-newcat placeholder="تصنيف جديد (مثلاً: حجر هاشمي)"><button type="button" class="card-del soft" data-act="add">${icon('plus')}</button></div>
          <button type="button" class="btn btn-primary" data-act="save">حفظ الأسماء</button>`;
        const syncNames = () => body.querySelectorAll('[data-cat]').forEach(i => { if (i.value.trim()) cats[i.dataset.cat] = i.value.trim(); });
        act(body, {
          add: () => { syncNames(); const v = body.querySelector('[data-newcat]').value.trim(); if (!v) return; cats['c' + Date.now().toString(36)] = v; commit('✔️ تمت الإضافة'); sheet.refresh(); },
          rm: k => { const used = db().floorTypes.filter(f => f.cat === k).length + db().projects.filter(p => p.type === k).length; UI.confirm(used ? `التصنيف ده مستخدم في ${used} نوع/مشروع. هيفضلوا موجودين بس من غير تصنيف. تحذفه؟` : 'حذف التصنيف؟', () => { delete cats[k]; commit('🗑️ تم الحذف'); sheet.refresh(); }, { yes: 'حذف' }); },
          save: () => { syncNames(); if (commit('✔️ تم الحفظ')) UI.back(); }
        });
      }
    });
  }

  /* ================= الإعدادات ================= */
  function openBizSettings() {
    const s = db().settings;
    UI.openSheet({
      title: 'بيانات النشاط على الفواتير',
      render(body, sheet) {
        body.innerHTML = UI.formHTML([
          { k: 'bizName', label: 'اسم النشاط', placeholder: 'مثال: الأمين لأعمال السيراميك والرخام', value: s.bizName },
          { k: 'ownerName', label: 'اسمك / لقبك المهني', placeholder: 'المعلم / م. ...', value: s.ownerName },
          { k: 'phone', label: 'رقم الهاتف', type: 'tel', value: s.phone, half: true }, { k: 'phone2', label: 'هاتف آخر', type: 'tel', optional: true, value: s.phone2, half: true },
          { k: 'address', label: 'العنوان', optional: true, value: s.address },
          { k: 'invoiceNotes', label: 'ملاحظات ثابتة أسفل الفواتير', type: 'textarea', optional: true, placeholder: 'مثال: الأسعار لا تشمل النقل', value: s.invoiceNotes },
          { k: 'quoteTerms', label: 'شروط عرض السعر', type: 'textarea', optional: true, value: s.quoteTerms },
          { html: `<div class="logo-box" style="margin-bottom:12px">${s.logo ? `<img src="${s.logo}" alt="اللوجو">` : `<div class="ph">${icon('image')}</div>`}<div style="flex:1;min-width:0"><div style="font-weight:800;font-size:.9rem">لوجو الفاتورة</div><div class="hint" style="margin:0">${s.logo ? 'تم اختيار لوجو' : 'لم يتم اختيار لوجو'}</div></div><button type="button" class="btn btn-soft btn-sm" data-act="logo">اختيار</button>${s.logo ? `<button type="button" class="btn btn-danger btn-icon" data-act="rmlogo" aria-label="حذف اللوجو">${icon('trash')}</button>` : ''}<input type="file" accept="image/*" class="hidden" data-file></div>` },
          { k: 'showLogo', label: 'إظهار اللوجو أعلى الفواتير', type: 'switch', value: s.showLogo },
          { html: btnRow('حفظ البيانات') }]);
        const file = body.querySelector('[data-file]');
        const sync = () => Object.assign(s, UI.readForm(body));
        file.onchange = () => {
          const f = file.files[0]; if (!f) return;
          const img = new Image(), rd = new FileReader();
          rd.onload = () => { img.onload = () => {
            // تصغير اللوجو علشان ما ياخدش مساحة كبيرة من التخزين
            const max = 360, k = Math.min(1, max / Math.max(img.width, img.height));
            const cv = document.createElement('canvas'); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
            cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
            sync(); s.logo = cv.toDataURL('image/png'); s.showLogo = true; commit('✔️ تم حفظ اللوجو'); sheet.refresh();
          }; img.src = rd.result; };
          rd.readAsDataURL(f);
        };
        act(body, { logo: () => file.click(), rmlogo: () => { sync(); s.logo = ''; commit('تم حذف اللوجو'); sheet.refresh(); }, cancel: () => UI.back(), save: () => { sync(); if (commit('✔️ تم حفظ بيانات النشاط')) UI.back(); } });
      }
    });
  }
  function openSettings() {
    const s = db().settings;
    UI.openSheet({
      title: 'العملة والمظهر',
      render(body, sheet) {
        body.innerHTML = UI.formHTML([
          { k: 'currency', label: 'عملة التطبيق', type: 'select', options: UI.CURRENCIES.map(c => [c.code, `${c.country} — ${c.name} (${c.sym})`]), value: s.currency, hint: 'بتغيّر رمز العملة وعدد الكسور بس. التطبيق ما بيحوّلش المبالغ بأسعار صرف.' },
          { k: 'theme', label: 'المظهر', type: 'chips', options: [['auto', 'تلقائي (حسب الموبايل)'], ['light', 'فاتح'], ['dark', 'ليلي']], value: s.theme || 'auto' },
          { k: 'defaultWaste', label: 'نسبة الهالك الافتراضية في الحاسبات %', type: 'number', value: s.defaultWaste, hint: 'تقدر تغيّرها في كل حساب' }]);
        body.querySelector('[data-k=currency]').onchange = e => { s.currency = e.target.value; UI.setCurrency(s.currency); commit('✔️ العملة: ' + UI.currency().name); };
        body.querySelector('[data-k=defaultWaste]').oninput = e => { s.defaultWaste = nn(e.target.value); commit(); };
        UI.bindChips(body, (k, v) => { App.setTheme(v); });
      }
    });
  }
  function backupLine() {
    const t = Store.lastBackup();
    if (!t) return 'لسه ما اخدتش نسخة احتياطية';
    const days = Math.floor((Date.now() - t) / 86400000);
    return 'آخر نسخة: ' + (days < 1 ? 'النهارده' : `من ${days} يوم`);
  }
  function openBackup() {
    UI.openPage({
      title: 'النسخ الاحتياطي والاستعادة',
      render(body, page) {
        const d = db();
        body.innerHTML = `<div class="card"><div class="card-title"><div class="t-ic green">${icon('shield')}</div><h2>بياناتك محفوظة على الموبايل ده</h2></div>
          <p class="hint" style="margin:-6px 0 12px">التطبيق شغال من غير إنترنت وكل البيانات متخزنة على جهازك بس. خد نسخة احتياطية كل فترة وابعتها لنفسك على واتساب أو الإيميل، علشان لو الموبايل ضاع أو اتمسح تقدر ترجّع كل حاجة.</p>
          ${App.statsHTML([['المشروعات', d.projects.length], ['الفواتير', d.docs.length], ['العملاء', d.customers.length]])}
          ${App.statsHTML([['الخامات', d.materials.length], ['العمال', d.workers.length], ['حجم البيانات', Store.sizeKB() + ' ك.ب']])}
          <div class="backup-line${Store.lastBackup() ? '' : ' warn'}" style="margin-bottom:12px">${backupLine()}</div>
          <div class="btn-row"><button type="button" class="btn btn-accent" data-act="export">${icon('download')} تنزيل نسخة</button><button type="button" class="btn btn-ghost" data-act="import">${icon('upload')} استعادة نسخة</button></div>
          <input type="file" accept=".json,application/json" class="hidden" data-file></div>
          <div class="card"><div class="card-title"><div class="t-ic" style="background:var(--danger-soft);color:var(--danger)">${icon('trash')}</div><h2>مسح كل البيانات</h2></div>
          <p class="hint" style="margin:-6px 0 12px">بيمسح كل بيانات «حساباتي للأرضيات» من الموبايل ده بس (مش بيلمس تطبيق حساباتي للكهرباء). خد نسخة احتياطية الأول.</p>
          <button type="button" class="btn btn-danger" data-act="wipe">${icon('trash')} مسح كل البيانات</button></div>`;
        const file = body.querySelector('[data-file]');
        file.onchange = () => {
          const f = file.files[0]; if (!f) return;
          const rd = new FileReader();
          rd.onload = () => {
            let obj; try { obj = JSON.parse(rd.result); } catch (e) { UI.alert('الملف ده مش ملف نسخة احتياطية صالح.'); return; }
            const err = Store.validateBackup(obj); if (err) { UI.alert(err, 'مينفعش الاستعادة'); return; }
            const cnt = k => (obj[k] || []).length;
            UI.confirm(`استعادة النسخة دي؟\nفيها: ${cnt('projects')} مشروع، ${cnt('docs')} مستند، ${cnt('customers')} عميل، ${cnt('materials')} خامة.\n⚠️ البيانات الحالية على الموبايل هتتستبدل بالكامل بالنسخة دي.`, () => {
              if (!Store.restore(obj)) { UI.alert('ما قدرناش نحفظ النسخة (المساحة ممتلئة).'); return; }
              UI.setCurrency(db().settings.currency); App.applyTheme(); UI.toast('✔️ تمت الاستعادة بنجاح'); page.refresh();
            }, { yes: 'استعادة' });
          };
          rd.readAsText(f); file.value = '';
        };
        act(body, {
          export: () => {
            const name = `حساباتي_للأرضيات_نسخة_${today()}.json`;
            if (UI.downloadText(name, 'application/json', JSON.stringify(Store.exportObject(), null, 1))) { Store.markBackup(); UI.toast('✔️ تم تنزيل النسخة: ' + name); page.refresh(); }
            else UI.toast('⚠️ تعذر تنزيل الملف', 'err');
          },
          import: () => file.click(),
          wipe: () => UI.confirm('متأكد إنك عايز تمسح كل المشروعات والفواتير والعملاء والخامات والعمال؟ مفيش رجوع.', () => UI.confirm('تأكيد أخير: مسح كل بيانات حساباتي للأرضيات؟', () => { Store.wipe(); UI.setCurrency(db().settings.currency); App.applyTheme(); UI.toast('تم مسح البيانات'); page.refresh(); }, { yes: 'امسح كله' }), { yes: 'أيوه، كمّل' })
        });
      }
    });
  }
  function openAbout() {
    UI.openPage({
      title: 'عن التطبيق',
      render(body) {
        body.innerHTML = `<div class="card"><div class="card-title"><div class="t-ic orange">${icon('refresh')}</div><h2>الإصدار والتحديثات</h2></div>
          <div class="ver-box"><span class="dot${root.SWUpdate && root.SWUpdate.waiting ? ' warn' : ''}"></span><div style="flex:1"><div class="s">الإصدار الحالي</div><div class="v">${esc(root.APP_VERSION)}</div></div></div>
          <div class="note" style="margin-bottom:12px">${root.SWUpdate && root.SWUpdate.waiting ? 'في تحديث جديد جاهز.' : 'التطبيق بيدور على التحديثات لوحده لما يكون في إنترنت، وبياناتك مش بتتأثر بالتحديث.'}</div>
          <div class="stack">${root.SWUpdate && root.SWUpdate.waiting ? `<button type="button" class="btn btn-accent" data-act="apply">${icon('download')} تحديث الآن</button>` : ''}<button type="button" class="btn btn-soft" data-act="check">${icon('refresh')} البحث عن تحديث</button></div></div>
          <div class="dev-card"><img class="dev-avatar" src="./icons/developer.jpg" alt="أحمد حسن عبدالله" width="96" height="96"><div class="dev-name">أحمد حسن عبدالله</div><div class="dev-role">مطوّر ومصمّم التطبيق</div>
          <div class="dev-links"><a class="btn btn-wa" href="https://wa.me/201015421255" target="_blank" rel="noopener">${icon('chat')} واتساب</a><a class="btn btn-fb" href="https://www.facebook.com/share/1CTcsmiTif/" target="_blank" rel="noopener">${icon('facebook')} فيسبوك</a></div><div class="dev-phone">+20 101 542 1255</div></div>
          <div class="copyright"><b>حساباتي للأرضيات والتشطيبات</b> — HESABATI FLOORING · الإصدار ${esc(root.APP_VERSION)}<br>© ${new Date().getFullYear()} <b>أحمد حسن عبدالله</b>. جميع الحقوق محفوظة.<br><a href="./privacy.html" style="color:var(--primary)">سياسة الخصوصية</a></div>`;
        act(body, {
          apply: () => root.SWUpdate.apply(),
          check: () => { if (!root.SWUpdate) { UI.toast('التحديث التلقائي غير متاح هنا'); return; } root.SWUpdate.check().then(r => UI.toast(r ? '✔️ في تحديث جديد — اضغط تحديث الآن' : '✔️ أنت على آخر إصدار')).catch(() => UI.toast('⚠️ مفيش إنترنت دلوقتي', 'err')); }
        });
      }
    });
  }

  /* ================= الأرباح والتقارير ================= */
  function openReports() {
    UI.openPage({
      title: 'الأرباح والتقارير', sub: 'الإيرادات − التكاليف = صافي الربح',
      render(body) {
        const d = Fin.dashboard(db());
        const rows = db().projects.map(p => ({ p, f: Fin.projectFinance(db(), p) })).filter(x => x.p.status !== 'cancelled').sort((a, b) => b.f.profit - a.f.profit);
        body.innerHTML = `<section class="hero"><div class="hero-label">صافي الربح الإجمالي</div><div class="hero-value">${fmt(d.profit)}<small>${UI.curSym()}</small></div>
          <div class="hero-stats"><div class="hero-stat"><span>الإيرادات</span><strong>${fmt(d.revenue)}</strong></div><div class="hero-stat"><span>التكاليف</span><strong>${fmt(d.costs)}</strong></div><div class="hero-stat"><span>المستحق</span><strong>${fmt(d.due)}</strong></div></div></section>
          <div class="card"><div class="sum-list">${App.rowLine('إجمالي الإيرادات (قيمة الأعمال + الفواتير المنفصلة)', money(d.revenue))}${App.rowLine('تكاليف المشروعات والخامات المباعة', '- ' + money(d.costs - d.adminExpenses), 'minus')}${App.rowLine('مصروفات إدارية / عامة', '- ' + money(d.adminExpenses), 'minus')}${App.rowLine('المحصّل فعلاً', money(d.collected))}</div><div class="sum-total"><span>صافي الربح</span><strong>${money(d.profit)}</strong></div></div>
          <div class="section-head"><h3>ربح كل مشروع<span class="count">${rows.length}</span></h3></div>
          ${rows.length ? rows.map(x => `<div class="inv-card" data-project="${x.p.id}"><div class="inv-avatar">${App.initial(x.p.name)}</div><div class="inv-info"><div class="n">${esc(x.p.name)}</div><div class="m">قيمة ${fmt(x.f.value)} · تكلفة ${fmt(x.f.cost)}</div></div><div class="inv-amount ${x.f.profit < 0 ? 'due' : ''}">${money(x.f.profit)}<small>${x.f.margin}%</small></div></div>`).join('') : App.emptyHTML('chart', 'مفيش مشروعات لسه')}`;
        App.bindProjectCards(body);
      }
    });
  }

  root.Mods = {
    MAT_UNITS, materialLabel, openInventory, openMaterialEdit, openMaterial, pickMaterial,
    openWorkers, openWorker, openWorkerEdit, openDailyLog, openLogSheet, logEntryHTML,
    expenseEntryHTML, openExpenseSheet, openExpenses, NOTE_KINDS, noteCardHTML, bindNoteCards, openNoteSheet, openNotes,
    openFloorTypes, openFloorTypeEdit, openBizSettings, openSettings, backupLine, openBackup, openAbout, openReports
  };
})(typeof self !== 'undefined' ? self : this);
