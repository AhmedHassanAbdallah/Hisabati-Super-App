/*
 * حساباتي للجبس والديكورات — المحرك المالي
 * طرق المحاسبة / نوع الاتفاق / إجماليات المشروع / الأرباح / بيانات المستندات
 * © 2026 أحمد حسن عبدالله - جميع الحقوق محفوظة.
 *
 * قاعدة عدم الازدواج:
 *  - مصنعية فقط      ← العميل يدفع المصنعية فقط، والخامات (لو مكتوبة) للعلم ولا تُحسب عليه.
 *  - توريد فقط       ← العميل يدفع سعر بيع الخامات فقط.
 *  - توريد وتركيب    ← مصنعية + سعر بيع الخامات (كل واحدة مرة واحدة).
 *  - تصنيع وتركيب    ← سعر التصنيع + التركيب؛ الخامات هنا تكلفة داخلية فقط (لأن سعر التصنيع شاملها).
 *  - المقطوعية/المقاولة/حسب التصميم ← مبلغ واحد شامل، والخامات تكلفة داخلية فقط.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./core'));
  else { root.HG = root.HG || {}; root.HG.finance = factory(root.HG.core); }
})(typeof self !== 'undefined' ? self : this, function (C) {
  'use strict';
  const { num, pos, r2, r3 } = C;

  const METHODS = {
    m2: { name: 'بالمتر المربع', unit: 'م²' },
    lm: { name: 'بالمتر الطولي', unit: 'م.ط' },
    piece: { name: 'بالقطعة', unit: 'قطعة' },
    count: { name: 'بالعدد', unit: 'عدد' },
    day: { name: 'باليومية', unit: 'يوم' },
    stage: { name: 'حسب المرحلة', unit: 'مرحلة' },
    weight: { name: 'بالوزن / الكمية', unit: 'كجم' },
    contract: { name: 'بالمقاولة الكاملة', unit: 'مقاولة', lump: true },
    lump: { name: 'بالمقطوعية', unit: 'مقطوعية', lump: true },
    design: { name: 'حسب التصميم', unit: 'تصميم', lump: true }
  };
  const SCOPES = {
    labor: { name: 'مصنعية فقط (تركيب فقط)', short: 'مصنعية', hint: 'العميل بيوفر الخامات وانت بتحسب أجر التنفيذ' },
    supply: { name: 'توريد خامات فقط', short: 'توريد', hint: 'حساب الخامات وسعر البيع والربح' },
    supply_install: { name: 'توريد وتركيب', short: 'توريد وتركيب', hint: 'خامات + مصنعية + نقل ومصاريف' },
    fab_install: { name: 'تصنيع وتركيب', short: 'تصنيع وتركيب', hint: 'تصنيع البانوهات/الوحدات ثم نقلها وتركيبها' }
  };
  const SECTIONS = {
    board: 'الجبسون بورد',
    plaster: 'الجبس البلدي',
    decor: 'الكرانيش والبانوهات والديكورات',
    other: 'أعمال أخرى'
  };
  const PROJECT_STATUS = {
    quote: 'عرض سعر', active: 'جاري التنفيذ', paused: 'متوقف', done: 'تم التسليم', cancelled: 'ملغي'
  };
  const EXPENSE_CATS = {
    transport: 'نقل', loading: 'تحميل وتنزيل', rent: 'إيجارات', purchase: 'مشتريات', emergency: 'مصروفات طارئة', tools: 'عدد وأدوات', other: 'أخرى'
  };

  const isLump = m => !!(METHODS[m] && METHODS[m].lump);
  const matSum = (list, field) => (list || []).reduce((t, m) => t + pos(m.qty) * pos(m[field]), 0);

  /** مبالغ بند واحد */
  function itemAmounts(it) {
    const scope = SCOPES[it.scope] ? it.scope : 'labor';
    const lump = isLump(it.method);
    const q = lump ? 1 : pos(it.qty);
    const matSell = matSum(it.materials, 'sell');
    const matBuy = matSum(it.materials, 'buy');
    const hasLabor = scope === 'labor' || scope === 'supply_install' || scope === 'fab_install';
    const labor = !lump && hasLabor ? q * pos(it.laborRate) : 0;
    const fab = !lump && scope === 'fab_install' ? q * pos(it.fabRate) : 0;
    const materials = !lump && (scope === 'supply' || scope === 'supply_install') ? matSell : 0;
    const client = lump ? pos(it.lumpSum) : labor + fab + materials;
    const matCost = scope === 'labor' ? 0 : matBuy;
    const fabCost = scope === 'fab_install' ? (lump ? pos(it.fabCost) : q * pos(it.fabCost)) : 0;
    const extraCost = pos(it.extraCost);
    const cost = matCost + fabCost + extraCost;
    // نسبة المنفذ (للمستخلص)
    const portion = lump ? Math.min(1, pos(it.donePct) / 100) : (q > 0 ? pos(it.doneQty) / q : 0);
    return {
      lump, scope, qty: q,
      labor: r2(labor), fab: r2(fab), materials: r2(materials), client: r2(client),
      matSell: r2(matSell), matBuy: r2(matBuy), matCost: r2(matCost), fabCost: r2(fabCost), extraCost: r2(extraCost),
      cost: r2(cost), profit: r2(client - cost),
      unitPrice: q > 0 ? r2(client / q) : 0,
      portion, done: r2(client * portion)
    };
  }

  /** إجماليات مشروع: ctx = { payments, expenses, attendance, workers } (كلها مفلترة على المشروع) */
  function projectTotals(project, ctx) {
    ctx = ctx || {};
    const t = { labor: 0, fab: 0, materials: 0, subtotal: 0, matCost: 0, fabCost: 0, extraCost: 0, done: 0, bySection: {} };
    (project.items || []).forEach(it => {
      const a = itemAmounts(it);
      t.labor += a.labor; t.fab += a.fab; t.materials += a.materials; t.subtotal += a.client;
      t.matCost += a.matCost; t.fabCost += a.fabCost; t.extraCost += a.extraCost; t.done += a.done;
      const s = SECTIONS[it.section] ? it.section : 'other';
      t.bySection[s] = r2((t.bySection[s] || 0) + a.client);
    });
    const additions = (project.additions || []).reduce((s, a) => s + pos(a.amount), 0);
    const discount = pos(project.discount);
    const revenue = t.subtotal - discount + additions;
    const workersById = {};
    (ctx.workers || []).forEach(w => { workersById[w.id] = w; });
    const wages = (ctx.attendance || []).reduce((s, a) => s + pos(a.days) * pos(a.wage != null && a.wage !== '' ? a.wage : (workersById[a.workerId] || {}).wage), 0);
    const expenses = (ctx.expenses || []).reduce((s, e) => s + pos(e.amount), 0);
    const paid = (ctx.payments || []).reduce((s, p) => s + pos(p.amount), 0);
    const cost = t.matCost + t.fabCost + t.extraCost + wages + expenses;
    const profit = revenue - cost;
    return {
      labor: r2(t.labor), fab: r2(t.fab), materials: r2(t.materials), subtotal: r2(t.subtotal),
      discount: r2(discount), additions: r2(additions), revenue: r2(revenue),
      matCost: r2(t.matCost), fabCost: r2(t.fabCost), extraCost: r2(t.extraCost), wages: r2(wages), expenses: r2(expenses),
      cost: r2(cost), profit: r2(profit), margin: revenue > 0 ? r2(profit / revenue * 100) : 0,
      paid: r2(paid), due: r2(revenue - paid), done: r2(t.done), bySection: t.bySection
    };
  }

  /** حساب مستحقات عامل */
  function workerBalance(worker, attendance, advances, pays) {
    const mine = x => x.workerId === worker.id;
    const att = (attendance || []).filter(mine);
    const days = att.reduce((s, a) => s + pos(a.days), 0);
    const wages = att.reduce((s, a) => s + pos(a.days) * pos(a.wage != null && a.wage !== '' ? a.wage : worker.wage), 0);
    const adv = (advances || []).filter(mine).reduce((s, a) => s + pos(a.amount), 0);
    const paid = (pays || []).filter(mine).reduce((s, a) => s + pos(a.amount), 0);
    return { days: r2(days), wages: r2(wages), advances: r2(adv), paid: r2(paid), due: r2(wages - adv - paid) };
  }

  /** المخزون: القيمة + التنبيهات */
  function stockSummary(stock) {
    let value = 0, sellValue = 0; const low = [];
    (stock || []).forEach(s => {
      const q = num(s.qty);
      value += Math.max(0, q) * pos(s.buy); sellValue += Math.max(0, q) * pos(s.sell);
      if (s.min !== '' && s.min != null && q <= num(s.min)) low.push(s);
    });
    return { value: r2(value), sellValue: r2(sellValue), low, count: (stock || []).length };
  }

  /* =====================================================
     بيانات المستندات (بدون HTML) — الواجهة تعرضها وتطبعها
     ===================================================== */
  const DOC_TYPES = {
    labor_inv: { name: 'فاتورة مصنعية', tag: 'فاتورة' },
    supply_inv: { name: 'فاتورة توريد خامات', tag: 'فاتورة' },
    si_inv: { name: 'فاتورة توريد وتركيب', tag: 'فاتورة' },
    boq_board: { name: 'مقايسة أعمال جبسون بورد', tag: 'مقايسة', section: 'board' },
    boq_plaster: { name: 'مقايسة أعمال جبس بلدي', tag: 'مقايسة', section: 'plaster' },
    boq_decor: { name: 'مقايسة بانوهات وكرانيش وديكورات', tag: 'مقايسة', section: 'decor' },
    quote: { name: 'عرض سعر', tag: 'عرض سعر' },
    progress: { name: 'مستخلص أعمال', tag: 'مستخلص' },
    receipt: { name: 'إيصال استلام نقدية', tag: 'إيصال', noProject: false },
    statement: { name: 'كشف حساب عميل', tag: 'كشف حساب', customer: true },
    cost_report: { name: 'تقرير تكلفة مشروع', tag: 'تقرير' },
    profit_report: { name: 'تقرير أرباح', tag: 'تقرير', global: true }
  };

  function unitOf(it) { return isLump(it.method) ? (METHODS[it.method] || {}).unit : (it.unit || (METHODS[it.method] || {}).unit || ''); }
  function aggregateMaterials(items, opts) {
    const map = new Map();
    (items || []).forEach(it => {
      const scope = it.scope || 'labor';
      if (opts && opts.sellOnly && (isLump(it.method) || !(scope === 'supply' || scope === 'supply_install'))) return;
      (it.materials || []).forEach(m => {
        if (!(pos(m.qty) > 0)) return;
        const k = [m.key || '', m.name, m.unit, opts && opts.sellOnly ? pos(m.sell) : ''].join('|');
        const e = map.get(k) || { name: m.name, unit: m.unit, qty: 0, price: pos(m.sell), detail: m.spec || '' };
        e.qty += pos(m.qty); map.set(k, e);
      });
    });
    return Array.from(map.values()).map(e => ({ name: e.name, detail: e.detail, qty: r3(e.qty), unit: e.unit, price: r2(e.price), total: r2(e.qty * e.price) }));
  }

  /**
   * بناء بيانات مستند
   * @param {string} type نوع المستند
   * @param {object} src { project, customer, ctx, projects, payment, opts }
   */
  function buildDoc(type, src) {
    const T = DOC_TYPES[type];
    if (!T) throw new Error('نوع مستند غير معروف: ' + type);
    const project = src.project || { items: [] };
    const items = project.items || [];
    const opts = src.opts || {};
    const doc = { type, title: T.name, tag: T.tag, columns: 'std', rows: [], materials: [], totals: {}, info: [] };
    const tot = projectTotals(project, src.ctx);
    const finish = (sub, useProject) => {
      const discount = opts.discount != null && opts.discount !== '' ? pos(opts.discount) : (useProject ? tot.discount : 0);
      const additions = opts.additions != null && opts.additions !== '' ? pos(opts.additions) : (useProject ? tot.additions : 0);
      const final = sub - discount + additions;
      const paid = opts.paid != null && opts.paid !== '' ? pos(opts.paid) : (useProject ? tot.paid : 0);
      doc.totals = { subtotal: r2(sub), discount: r2(discount), additions: r2(additions), final: r2(final), paid: r2(paid), due: r2(final - paid) };
    };
    const rowOf = (it, price, total) => ({ name: it.name, detail: it.notes || '', qty: isLump(it.method) ? 1 : r3(pos(it.qty)), unit: unitOf(it), price: r2(price), total: r2(total), section: it.section });

    switch (type) {
      case 'labor_inv': {
        items.forEach(it => {
          const a = itemAmounts(it);
          if (a.scope === 'supply') return;
          if (a.lump) doc.rows.push(Object.assign(rowOf(it, a.client, a.client), { detail: 'مبلغ شامل' }));
          else if (a.labor + a.fab > 0) doc.rows.push(rowOf(it, pos(it.laborRate) + (a.scope === 'fab_install' ? pos(it.fabRate) : 0), a.labor + a.fab));
        });
        finish(doc.rows.reduce((s, r) => s + r.total, 0), false);
        break;
      }
      case 'supply_inv': {
        doc.rows = aggregateMaterials(items, { sellOnly: true });
        items.forEach(it => { const a = itemAmounts(it); if (a.lump && a.scope === 'supply') doc.rows.push(rowOf(it, a.client, a.client)); });
        finish(doc.rows.reduce((s, r) => s + r.total, 0), false);
        break;
      }
      case 'si_inv':
      case 'quote': {
        items.forEach(it => { const a = itemAmounts(it); doc.rows.push(rowOf(it, a.unitPrice, a.client)); });
        finish(tot.subtotal, true);
        if (type === 'quote') { doc.totals.paid = 0; doc.totals.due = doc.totals.final; doc.noPaid = true; doc.validity = pos(opts.validity) || 15; }
        break;
      }
      case 'boq_board':
      case 'boq_plaster':
      case 'boq_decor': {
        const sec = items.filter(it => (it.section || 'other') === T.section);
        sec.forEach(it => { const a = itemAmounts(it); doc.rows.push(rowOf(it, a.unitPrice, a.client)); });
        doc.materials = aggregateMaterials(sec).map(m => ({ name: m.name, detail: m.detail, qty: m.qty, unit: m.unit }));
        finish(doc.rows.reduce((s, r) => s + r.total, 0), false);
        doc.noPaid = true;
        break;
      }
      case 'progress': {
        doc.columns = 'progress';
        items.forEach(it => {
          const a = itemAmounts(it);
          doc.rows.push({ name: it.name, unit: unitOf(it), qty: a.lump ? 1 : r3(pos(it.qty)), done: a.lump ? r2(pos(it.donePct)) + '%' : r3(pos(it.doneQty)), price: a.unitPrice, total: a.done, contractTotal: a.client });
        });
        finish(tot.done, false);
        doc.totals.contract = tot.revenue;
        if (opts.paid == null || opts.paid === '') { doc.totals.paid = tot.paid; doc.totals.due = r2(doc.totals.final - tot.paid); }
        break;
      }
      case 'receipt': {
        doc.columns = 'receipt';
        const p = src.payment || {};
        doc.receipt = { amount: r2(pos(p.amount)), date: p.date || '', method: p.method || 'نقدي', note: p.note || '' };
        doc.totals = { final: tot.revenue, paid: tot.paid, due: tot.due, amount: r2(pos(p.amount)) };
        break;
      }
      case 'statement': {
        doc.columns = 'statement';
        const entries = [];
        (src.projects || []).forEach(pr => {
          const pt = projectTotals(pr, src.ctxOf ? src.ctxOf(pr) : {});
          entries.push({ date: pr.startDate || pr.created || '', name: `مشروع: ${pr.name || pr.address || ''}`, debit: pt.revenue, credit: 0 });
          ((src.ctxOf ? src.ctxOf(pr).payments : []) || []).forEach(p => entries.push({ date: p.date || '', name: `دفعة${p.note ? ' — ' + p.note : ''}`, debit: 0, credit: pos(p.amount) }));
        });
        (src.loosePayments || []).forEach(p => entries.push({ date: p.date || '', name: `دفعة${p.note ? ' — ' + p.note : ''}`, debit: 0, credit: pos(p.amount) }));
        entries.sort((a, b) => String(a.date).localeCompare(String(b.date)));
        let bal = 0;
        doc.rows = entries.map(e => { bal += e.debit - e.credit; return Object.assign(e, { debit: r2(e.debit), credit: r2(e.credit), balance: r2(bal) }); });
        const debit = entries.reduce((s, e) => s + e.debit, 0), credit = entries.reduce((s, e) => s + e.credit, 0);
        doc.totals = { final: r2(debit), paid: r2(credit), due: r2(debit - credit) };
        break;
      }
      case 'cost_report': {
        doc.columns = 'report';
        const rows = [
          ['قيمة الأعمال للعميل (قبل الخصم)', tot.subtotal],
          ['الخصم', -tot.discount],
          ['إضافات على العميل', tot.additions],
          ['إجمالي الإيرادات', tot.revenue, 'sub'],
          ['تكلفة الخامات (سعر الشراء)', -tot.matCost],
          ['تكلفة التصنيع', -tot.fabCost],
          ['تكاليف إضافية على البنود', -tot.extraCost],
          ['أجور العمال', -tot.wages],
          ['المصروفات (نقل، تحميل، إيجار...)', -tot.expenses],
          ['إجمالي التكاليف', -tot.cost, 'sub'],
          ['صافي الربح', tot.profit, 'net'],
          ['هامش الربح %', tot.margin, 'pct'],
          ['المبالغ المستلمة فعلياً', tot.paid],
          ['المتبقي على العميل', tot.due]
        ];
        doc.rows = rows.map(([name, v, k]) => ({ name, total: r2(v), kind: k || '' }));
        doc.totals = { final: tot.revenue, cost: tot.cost, profit: tot.profit, paid: tot.paid, due: tot.due };
        break;
      }
      case 'profit_report': {
        doc.columns = 'profit';
        let R = 0, Cc = 0, P = 0, D = 0;
        (src.projects || []).forEach(pr => {
          const pt = projectTotals(pr, src.ctxOf ? src.ctxOf(pr) : {});
          R += pt.revenue; Cc += pt.cost; P += pt.paid; D += pt.due;
          doc.rows.push({ name: pr.name || 'مشروع', detail: (src.customerName ? src.customerName(pr) : ''), revenue: pt.revenue, cost: pt.cost, profit: pt.profit, paid: pt.paid, due: pt.due });
        });
        const general = pos(src.generalExpenses);
        doc.totals = { revenue: r2(R), cost: r2(Cc), general: r2(general), profit: r2(R - Cc - general), paid: r2(P), due: r2(D) };
        break;
      }
    }
    return doc;
  }

  return { METHODS, SCOPES, SECTIONS, PROJECT_STATUS, EXPENSE_CATS, DOC_TYPES, isLump, itemAmounts, projectTotals, workerBalance, stockSummary, aggregateMaterials, buildDoc, unitOf };
});
