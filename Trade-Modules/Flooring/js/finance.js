/*
 * أرزقي للأرضيات — الحسابات المالية (المشروعات، الأرباح، المخزون، العمال، المستندات)
 * © 2026 أحمد حسن عبدالله - جميع الحقوق محفوظة.
 *
 * قواعد ثابتة تمنع احتساب أي مبلغ مرتين:
 *  1) الإيراد = قيمة بنود المشروعات (+ الإضافات − الخصم) + الفواتير غير المربوطة بمشروع فقط.
 *     الفاتورة/المقايسة المربوطة بمشروع «ورقة» تُطبع من المشروع، ومش بتتحسب إيراد تاني.
 *  2) التكاليف = خامات المشروع (المملوكة لك) + أجور العمال + مصروفات المشروع + مشتريات مربوطة بالمشروع
 *     + تكلفة الخامات المباعة في فواتير منفصلة + المصروفات الإدارية العامة.
 *     خامات العميل (اللي هو اشتراها) بتتسجل للكمية فقط وتكلفتها عليك صفر.
 *  3) المخزون يتحسب لحظياً من: الرصيد الافتتاحي + المشتريات − المبيعات − المستخدم في المشروعات − الهالك ± التسوية.
 *  4) الربح = الإيراد − التكاليف (قيمة المقاولة ليست ربحاً).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./calc.js'));
  else root.Fin = factory(root.Calc);
})(typeof self !== 'undefined' ? self : this, function (Calc) {
  'use strict';
  const { nn, round, sum } = Calc;

  const STATUSES = {
    new: 'جديد', inspection: 'جاري المعاينة', progress: 'جاري التنفيذ', paused: 'متوقف',
    done: 'مكتمل', delivered: 'تم التسليم', cancelled: 'ملغي'
  };
  const ACTIVE_STATUSES = ['new', 'inspection', 'progress', 'paused'];

  const DOC_TYPES = {
    labor: { label: 'فاتورة مصنعية', prefix: 'L', revenue: true },
    supply: { label: 'فاتورة توريد خامات', prefix: 'S', revenue: true, sells: true },
    both: { label: 'فاتورة توريد وتركيب', prefix: 'B', revenue: true, sells: true },
    estimate: { label: 'مقايسة مشروع', prefix: 'E' },
    quote: { label: 'عرض سعر', prefix: 'Q' },
    extract: { label: 'مستخلص أعمال', prefix: 'X' },
    purchase: { label: 'فاتورة مشتريات', prefix: 'P' }
  };
  const EXPENSE_CATS = {
    transport: 'نقل', lifting: 'رفع وتنزيل', rent: 'إيجار معدات', labor: 'أجور خارجية',
    materials: 'خامات مشتراة مباشرة', tools: 'عدد وأدوات', admin: 'مصروفات إدارية', other: 'أخرى'
  };
  const PAY_KINDS = { advance: 'مقدم', payment: 'دفعة', extract: 'مستخلص', final: 'تسوية نهائية' };

  const byId = (list, id) => (list || []).find(x => x.id === id) || null;

  /* ---------- المشروع ---------- */
  function projectItems(p) {
    const rows = (p.items || []).map(it => Object.assign({ item: it }, Calc.item(it)));
    return {
      rows,
      labor: round(sum(rows, r => r.labor), 4),
      material: round(sum(rows, r => r.material), 4),
      total: round(sum(rows, r => r.total), 4),
      executed: round(sum(rows, r => r.executed), 4)
    };
  }
  function projectValue(p) {
    const t = projectItems(p);
    const additions = sum(p.additions || [], a => nn(a.amount));
    const discount = Math.min(nn(p.discount), t.total + additions);
    return { items: t, additions: round(additions, 4), discount: round(discount, 4), value: round(t.total + additions - discount, 4) };
  }
  function docIsStandaloneRevenue(d) { return !!(DOC_TYPES[d.type] && DOC_TYPES[d.type].revenue && !d.projectId); }

  function projectFinance(db, p) {
    const v = projectValue(p);
    const cancelled = p.status === 'cancelled';
    const pays = (db.payments || []).filter(x => x.projectId === p.id);
    const mats = (db.projectMaterials || []).filter(x => x.projectId === p.id);
    const mine = mats.filter(m => m.ownership !== 'client');
    const logs = (db.workLogs || []).filter(x => x.projectId === p.id);
    const exps = (db.expenses || []).filter(x => x.projectId === p.id);
    const purchases = (db.docs || []).filter(d => d.type === 'purchase' && d.projectId === p.id);
    const materialsCost = sum(mine, m => nn(m.qty) * nn(m.unitCost));
    const wastedCost = sum(mine.filter(m => m.waste), m => nn(m.qty) * nn(m.unitCost));
    const wages = sum(logs, l => nn(l.days) * nn(l.wage));
    const expensesByCat = {};
    exps.forEach(e => { const k = EXPENSE_CATS[e.category] ? e.category : 'other'; expensesByCat[k] = round((expensesByCat[k] || 0) + nn(e.amount), 4); });
    const expenses = sum(exps, e => nn(e.amount));
    const purchasesCost = sum(purchases, d => Calc.docTotals(d).total);
    const cost = round(materialsCost + wages + expenses + purchasesCost, 4);
    const value = cancelled ? 0 : v.value;
    const paid = sum(pays, x => nn(x.amount));
    return {
      value, grossValue: v.value, items: v.items, additions: v.additions, discount: v.discount,
      paid: round(paid, 4), remaining: round(value - paid, 4),
      materialsCost: round(materialsCost, 4), wastedCost: round(wastedCost, 4), wages: round(wages, 4),
      expenses: round(expenses, 4), expensesByCat, purchasesCost: round(purchasesCost, 4),
      cost, profit: round(value - cost, 4),
      margin: value > 0 ? round((value - cost) / value * 100, 1) : 0,
      clientMaterials: mats.filter(m => m.ownership === 'client'),
      counts: { payments: pays.length, materials: mats.length, logs: logs.length, expenses: exps.length }
    };
  }

  /* ---------- المخزون ---------- */
  function stockOf(db, materialId) {
    const m = byId(db.materials, materialId);
    let q = m ? nn(m.openingStock) : 0;
    (db.stockMoves || []).forEach(mv => {
      if (mv.materialId !== materialId) return;
      if (mv.type === 'purchase') q += nn(mv.qty);
      else if (mv.type === 'sale' || mv.type === 'waste') q -= nn(mv.qty);
      else if (mv.type === 'adjust') q += Calc.n(mv.qty); // التسوية ممكن تكون بالسالب
    });
    (db.projectMaterials || []).forEach(pm => { if (pm.materialId === materialId) q -= nn(pm.qty); });
    (db.docs || []).forEach(d => {
      (d.rows || []).forEach(r => {
        if (r.materialId !== materialId) return;
        if (d.type === 'purchase' && !d.projectId) q += nn(r.qty);
        else if (DOC_TYPES[d.type] && DOC_TYPES[d.type].sells && !d.projectId) q -= nn(r.qty);
      });
    });
    return round(q, 4);
  }
  function inventory(db) {
    const rows = (db.materials || []).map(m => {
      const stock = stockOf(db, m.id);
      return { material: m, stock, value: round(Math.max(0, stock) * nn(m.buyPrice), 4), low: nn(m.minStock) > 0 && stock <= nn(m.minStock) };
    });
    return { rows, value: round(sum(rows, r => r.value), 4), lowCount: rows.filter(r => r.low).length };
  }
  // تكلفة الخامات المباعة في فاتورة منفصلة (بسعر الشراء المسجل)
  function docCogs(db, d) {
    if (!(DOC_TYPES[d.type] && DOC_TYPES[d.type].sells) || d.projectId) return 0;
    return round(sum(d.rows || [], r => { const m = r.materialId && byId(db.materials, r.materialId); return m ? nn(r.qty) * nn(m.buyPrice) : 0; }), 4);
  }

  /* ---------- العمال ---------- */
  function workerBalance(db, w) {
    const logs = (db.workLogs || []).filter(l => l.workerId === w.id);
    const txns = (db.workerTxns || []).filter(t => t.workerId === w.id);
    const earned = sum(logs, l => nn(l.days) * nn(l.wage));
    const days = sum(logs, l => nn(l.days));
    const advances = sum(txns.filter(t => t.kind === 'advance'), t => nn(t.amount));
    const paidOut = sum(txns.filter(t => t.kind !== 'advance'), t => nn(t.amount));
    return { days: round(days, 2), earned: round(earned, 4), advances: round(advances, 4), paid: round(paidOut, 4), due: round(earned - advances - paidOut, 4), logs, txns };
  }

  /* ---------- العميل ---------- */
  function customerAccount(db, c) {
    const projects = (db.projects || []).filter(p => p.customerId === c.id);
    const pf = projects.map(p => ({ project: p, fin: projectFinance(db, p) }));
    const docs = (db.docs || []).filter(d => d.customerId === c.id && docIsStandaloneRevenue(d));
    const docsTotal = sum(docs, d => Calc.docTotals(d).total);
    const docsPaid = sum(docs, d => nn(d.paid));
    const pays = (db.payments || []).filter(x => x.customerId === c.id || (x.projectId && projects.some(p => p.id === x.projectId)));
    const paid = sum(pays, x => nn(x.amount)) + docsPaid;
    const value = sum(pf, x => x.fin.value) + docsTotal;
    return { projects: pf, docs, payments: pays, value: round(value, 4), paid: round(paid, 4), balance: round(value - paid, 4) };
  }

  /* ---------- لوحة التحكم ---------- */
  function dashboard(db) {
    const projects = db.projects || [];
    const pf = projects.map(p => ({ p, f: projectFinance(db, p) }));
    const standalone = (db.docs || []).filter(docIsStandaloneRevenue);
    const sTotals = standalone.map(d => ({ d, t: Calc.docTotals(d), cogs: docCogs(db, d) }));
    const adminExp = sum((db.expenses || []).filter(e => !e.projectId), e => nn(e.amount));
    const wagesNoProject = sum((db.workLogs || []).filter(l => !l.projectId), l => nn(l.days) * nn(l.wage));
    const generalPurchases = 0; // المشتريات غير المربوطة بمشروع = مخزون (تتحسب تكلفة عند الاستخدام أو البيع)
    const revenue = sum(pf, x => x.f.value) + sum(sTotals, x => x.t.total);
    const collected = sum(db.payments || [], x => nn(x.amount)) + sum(standalone, d => nn(d.paid));
    const costs = sum(pf, x => x.f.cost) + sum(sTotals, x => x.cogs) + adminExp + wagesNoProject + generalPurchases;
    // المستحقات: مجموع الأرصدة الموجبة لكل حساب (عميل، أو مشروع/فاتورة بدون عميل)
    const acc = {};
    const add = (k, v) => { acc[k] = (acc[k] || 0) + v; };
    pf.forEach(x => add(x.p.customerId ? 'c:' + x.p.customerId : 'p:' + x.p.id, x.f.value));
    sTotals.forEach(x => add(x.d.customerId ? 'c:' + x.d.customerId : 'd:' + x.d.id, x.t.total - nn(x.d.paid)));
    (db.payments || []).forEach(x => {
      const p = x.projectId && byId(projects, x.projectId);
      const cid = (p && p.customerId) || x.customerId;
      add(cid ? 'c:' + cid : (x.projectId ? 'p:' + x.projectId : 'free'), -nn(x.amount));
    });
    const due = sum(Object.keys(acc).filter(k => k !== 'free'), k => Math.max(0, round(acc[k], 4)));
    return {
      projects: projects.length,
      active: projects.filter(p => ACTIVE_STATUSES.includes(p.status || 'new')).length,
      running: projects.filter(p => p.status === 'progress').length,
      revenue: round(revenue, 4), collected: round(collected, 4), costs: round(costs, 4),
      profit: round(revenue - costs, 4), due: round(due, 4), adminExpenses: round(adminExp, 4)
    };
  }

  /* ---------- تحويل بنود المشروع لصفوف مستند ---------- */
  function rowsFromProject(p, type) {
    const rows = [];
    (p.items || []).forEach(it => {
      const c = Calc.item(it);
      const measure = !it.basis || it.basis === 'measure';
      const name = it.name || 'بند';
      const base = { name, note: it.note || '' };
      if (type === 'labor') {
        if (!(c.labor > 0)) return;
        if (measure) rows.push(Object.assign(base, { qty: nn(it.qty), unit: it.unit || '', price: nn(it.laborPrice) }));
        else if (it.basis === 'daily') rows.push(Object.assign(base, { qty: round((it.workers == null || it.workers === '' ? 1 : nn(it.workers)) * nn(it.days), 3), unit: 'يومية', price: nn(it.wage) }));
        else rows.push(Object.assign(base, { qty: 1, unit: 'مقطوعية', price: c.labor }));
      } else if (type === 'supply') {
        if (!(c.material > 0)) return;
        if (measure) rows.push(Object.assign(base, { qty: nn(it.qty), unit: it.unit || '', price: nn(it.materialPrice) }));
        else rows.push(Object.assign(base, { qty: 1, unit: 'مقطوعية', price: c.material }));
      } else if (type === 'extract') {
        if (!(c.total > 0)) return;
        if (measure) rows.push(Object.assign(base, { qty: nn(it.qty), unit: it.unit || '', price: c.unitPrice }));
        else rows.push(Object.assign(base, { qty: 1, unit: it.basis === 'stage' ? `مرحلة ${Math.min(100, nn(it.progress))}%` : 'مقطوعية', price: c.executed }));
      } else { // both / estimate / quote
        if (!(c.total > 0)) return;
        if (measure) rows.push(Object.assign(base, { qty: nn(it.qty), unit: it.unit || '', price: c.unitPrice }));
        else rows.push(Object.assign(base, { qty: 1, unit: it.basis === 'daily' ? 'يومية' : 'مقطوعية', price: c.total }));
      }
    });
    return rows;
  }

  /* ---------- كشف حساب العميل (حركات بالترتيب) ---------- */
  function customerStatement(db, c) {
    const a = customerAccount(db, c);
    const lines = [];
    a.projects.forEach(x => { if (x.fin.value) lines.push({ date: x.project.startDate || (x.project.createdAt || '').slice(0, 10), text: 'مشروع: ' + (x.project.name || ''), debit: x.fin.value, credit: 0 }); });
    a.docs.forEach(d => {
      const t = Calc.docTotals(d);
      lines.push({ date: d.date, text: (DOC_TYPES[d.type] || {}).label + ' رقم ' + (d.number || ''), debit: t.total, credit: 0 });
      if (nn(d.paid)) lines.push({ date: d.date, text: 'مدفوع على الفاتورة ' + (d.number || ''), debit: 0, credit: nn(d.paid) });
    });
    a.payments.forEach(x => { const p = byId(db.projects, x.projectId); lines.push({ date: x.date, text: (PAY_KINDS[x.kind] || 'دفعة') + (p ? ' — ' + p.name : '') + (x.note ? ' (' + x.note + ')' : ''), debit: 0, credit: nn(x.amount) }); });
    lines.sort((x, y) => String(x.date || '').localeCompare(String(y.date || '')));
    let bal = 0;
    lines.forEach(l => { bal = round(bal + l.debit - l.credit, 4); l.balance = bal; });
    return { account: a, lines };
  }

  return {
    STATUSES, ACTIVE_STATUSES, DOC_TYPES, EXPENSE_CATS, PAY_KINDS, byId,
    projectItems, projectValue, projectFinance, docIsStandaloneRevenue,
    stockOf, inventory, docCogs, workerBalance, customerAccount, dashboard,
    rowsFromProject, customerStatement
  };
});
