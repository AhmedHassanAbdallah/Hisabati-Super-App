/*
 * اختبارات محرك الحسابات — كل رقم متوقع هنا محسوب يدوياً (الحسبة مكتوبة في التعليق جنبه)
 * التشغيل: node --test tests/
 */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../js/engine/core');
const board = require('../js/engine/board');
const plaster = require('../js/engine/plaster');
const decor = require('../js/engine/decor');
const fin = require('../js/engine/finance');

const q = (out, key) => { const m = out.materials.find(x => x.key === key); return m ? m.qty : 0; };
const s = (out, label) => { const m = out.summary.find(x => x.label === label); return m ? m.value : undefined; };

test('core: التقريب لأعلى بدون أخطاء الكسور', () => {
  assert.equal(core.ceil(20 / 0.4), 50);          // 50.000000001 لازم تبقى 50 مش 51
  assert.equal(core.ceil(20 * 1.05 / 3), 7);
  assert.equal(core.pieces(18.9, 3), 7);
});

test('core: خطة القص FFD', () => {
  // غرفة 5×4 وكورنيش 2 م: 5 = 2+2+1 ، 4 = 2+2 → 8 قطع كاملة + (1+1) في قطعة واحدة = 9
  const p = core.cutPlan([5, 4, 5, 4], 2, 0);
  assert.equal(p.bars, 9);
  assert.equal(p.offcut, 0);
});

/* ---------------------------------------------------------------
   اختبار 1: سقف جبسون بورد — غرفة 5 × 4 م
   النظام: رئيسي كل 1.00 م + ثانوي كل 0.40 م + علاقات كل 1.00 م
   لوح 1.2 × 2.4 م، طبقة واحدة، هالك ألواح 10% وقطاعات 5%، أطوال القطاعات 3 م
   --------------------------------------------------------------- */
test('سقف 5×4 — نظام رئيسي وثانوي', () => {
  const out = board.ceiling({
    rooms: [{ L: 5, W: 4, count: 1 }], system: 'mf', boardW: 1.2, boardL: 2.4, layers: 1,
    waste: 10, profileWaste: 5, mainSpacing: 1, furSpacing: 0.4, hangerSpacing: 1,
    mainLen: 3, furLen: 3, angleLen: 3, angleFix: 0.5, screwSpacing: 0.17,
    compoundRate: 0.4, compoundBag: 20, tapeRoll: 75, slabHeight: 3.0, newLevel: 2.7
  });
  assert.deepEqual(out.warnings, []);
  assert.equal(s(out, 'إجمالي المساحة'), 20);           // 5 × 4
  assert.equal(s(out, 'إجمالي أطوال المحيط'), 18);      // 2 × (5 + 4)
  assert.equal(s(out, 'مسافة النزول'), 30);             // 300 - 270 سم
  assert.equal(q(out, 'board_std_12.5'), 8);             // 20 × 1.10 / 2.88 = 7.64 → 8
  assert.equal(q(out, 'main_channel'), 7);               // صفوف = 4/1 = 4 × 5 م = 20 م × 1.05 / 3 = 7
  assert.equal(q(out, 'furring'), 20);                   // صفوف = 5/0.4 = 12.5→13 +1 = 14 × 4 م = 56 × 1.05 / 3 = 19.6 → 20
  assert.equal(q(out, 'hanger'), 20);                    // 4 صفوف × (5/1 = 5)
  assert.equal(q(out, 'cross_clip'), 56);                // 4 × 14
  assert.equal(q(out, 'main_joiner'), 4);                // 4 × (ceil(5/3) - 1)
  assert.equal(q(out, 'furring_joiner'), 14);            // 14 × (ceil(4/3) - 1)
  assert.equal(q(out, 'wall_angle'), 7);                 // 18 × 1.05 / 3 = 6.3 → 7
  assert.equal(q(out, 'anchor'), 56);                    // 20 علاقة + 18/0.5 = 36
  assert.equal(q(out, 'screw_board'), 310);              // 20 / (0.4 × 0.17) = 294.1 → 295 × 1.05 = 309.75 → 310
  assert.equal(q(out, 'screw_metal'), 38);               // (2×14 + 2×4) = 36 × 1.05 = 37.8 → 38
  assert.equal(q(out, 'tape'), 1);                       // 20 × (1/1.2 + 1/2.4) = 25 م × 1.1 = 27.5 م → لفة 75 م
  assert.equal(q(out, 'compound'), 1);                   // 20 × 0.4 × 1.1 = 8.8 كجم → عبوة 20 كجم
  assert.equal(out.work[0].qty, 20);
});

test('سقف: طبقتين ومقاس لوح مختلف يغيروا الكميات (مفيش معامل ثابت)', () => {
  const base = { rooms: [{ L: 5, W: 4 }], waste: 10 };
  const one = board.ceiling(base);
  const two = board.ceiling(Object.assign({}, base, { layers: 2 }));
  const big = board.ceiling(Object.assign({}, base, { boardL: 3.0 }));
  assert.equal(q(one, 'board_std_12.5'), 8);
  assert.equal(q(two, 'board_std_12.5'), 16);            // 40 × 1.1 / 2.88 = 15.28 → 16
  assert.equal(q(big, 'board_std_12.5'), 7);             // 22 / 3.6 = 6.11 → 7
  const omega = board.ceiling(Object.assign({}, base, { system: 'omega' }));
  assert.equal(q(omega, 'main_channel'), 0);
  assert.equal(q(omega, 'omega'), 20);                    // 14 صف × 4 م × 1.05 / 3 = 19.6 → 20
});

test('سقف: إدخال مساحة ومحيط بدل الطول والعرض', () => {
  const out = board.ceiling({ rooms: [{ area: 20, perimeter: 18 }] });
  assert.equal(s(out, 'إجمالي المساحة'), 20);
  assert.equal(out.detail[0].L, 5);
  assert.equal(out.detail[0].W, 4);
});

test('سقف معلق بلاطات 60×60', () => {
  const out = board.ceiling({ rooms: [{ L: 6, W: 3.6 }], system: 'tgrid', waste: 0, profileWaste: 0 });
  assert.equal(q(out, 'ceiling_tile'), 60);              // 21.6 / 0.36
  assert.equal(q(out, 'tee_main'), 5);                   // صفوف = 3.6/1.2 = 3 × 6 م = 18 م / 3.6 = 5
});

/* ---------------------------------------------------------------
   اختبار 2: قاطع 4 × 3 م بوجهين وطبقة لكل وجه + باب 0.90 × 2.10
   قوائم كل 60 سم، أطوال 3 م
   --------------------------------------------------------------- */
test('قاطع 4×3 وجهين + باب', () => {
  const out = board.partition({
    walls: [{ L: 4, H: 3, count: 1 }], openings: [{ type: 'door', w: 0.9, h: 2.1, count: 1 }],
    faces: 2, layers: 1, studSpacing: 0.6, studLen: 3, trackLen: 3, waste: 10, profileWaste: 5,
    screwSpacing: 0.25, anchorSpacing: 0.6
  });
  assert.equal(s(out, 'المساحة الهندسية للقاطع'), 12);   // 4 × 3
  assert.equal(s(out, 'خصم الفتحات'), 1.89);             // 0.9 × 2.1
  assert.equal(s(out, 'صافي مساحة القاطع'), 10.11);
  assert.equal(s(out, 'مساحة الألواح الفعلية'), 20.22);  // 10.11 × وجهين × طبقة
  assert.equal(s(out, 'عدد القوائم الرأسية'), 10);       // 4/0.6 = 6.67→7 +1 = 8 + 2 جوانب الباب
  assert.equal(s(out, 'أطوال المسارات الأفقية'), 8.3);   // علوي 4 + سفلي (4-0.9) + فوق الباب (0.9+0.3)
  assert.equal(q(out, 'board_std_12.5'), 8);             // 20.22 × 1.1 / 2.88 = 7.72 → 8
  assert.equal(q(out, 'c_stud'), 11);                    // 10 × 1.05 = 10.5 → 11
  assert.equal(q(out, 'u_track'), 3);                    // 8.3 × 1.05 / 3 = 2.9 → 3
  assert.equal(q(out, 'corner_bead'), 4);                // (0.9 + 2×2.1) × 2 وجه = 10.2 × 1.05 / 3 = 3.57 → 4
  assert.equal(q(out, 'anchor'), 22);                    // (4 + 3.1 + 2×3) / 0.6 = 21.8 → 22
  assert.equal(q(out, 'screw_board'), 142);              // 20.22 / (0.6×0.25) = 134.8 → 135 × 1.05 → 142
  assert.equal(q(out, 'tape'), 1);
  assert.equal(q(out, 'compound'), 1);                   // 20.22 × 0.4 × 1.1 = 8.9 كجم
  assert.equal(out.work[0].qty, 10.11);
});

test('قاطع بعزل صوف صخري', () => {
  const out = board.partition({ walls: [{ L: 4, H: 3 }], insulation: 'rockwool', insPack: 10, profileWaste: 5 });
  assert.equal(q(out, 'ins_rockwool'), 2);               // 12 × 1.05 / 10 = 1.26 → 2
});

/* ---------------------------------------------------------------
   اختبار 3: بيت نور حول غرفة 5 × 4 — عرض 60 سم، نزول 30 سم، شفة إضاءة 10 سم
   --------------------------------------------------------------- */
test('بيت نور غرفة 5×4', () => {
  const out = board.bulkhead({ mode: 'room', L: 5, W: 4, levels: [{ w: 0.6, d: 0.3 }], lip: 0.1, hiddenLight: true, waste: 10, profileWaste: 5 });
  assert.deepEqual(out.warnings, []);
  assert.equal(s(out, 'الطول على الحائط'), 18);           // 2 × (5 + 4)
  assert.equal(s(out, 'الطول عند الحافة الداخلية'), 13.2); // 2 × (3.8 + 2.8)
  assert.equal(s(out, 'مساحة القاع (الأرضية)'), 9.36);   // 20 - 3.8 × 2.8
  assert.equal(s(out, 'مساحة الجوانب (نزول + شفة)'), 5.28); // 13.2 × 0.3 + 13.2 × 0.1
  assert.equal(s(out, 'مساحة الألواح الفعلية'), 14.64);
  assert.equal(q(out, 'board_std_12.5'), 6);             // 14.64 × 1.1 / 2.88 = 5.59 → 6
  assert.equal(q(out, 'u_track'), 21);                   // (18 + 2×13.2 + 13.2) × 1.05 / 3 = 20.16 → 21
  assert.equal(q(out, 'c_stud'), 7);                     // 22 عضو × (0.6 + 0.3) = 19.8 × 1.05 / 3 = 6.93 → 7
  assert.equal(q(out, 'corner_bead'), 10);               // (13.2 + 13.2) × 1.05 / 3 = 9.24 → 10
  assert.equal(out.work[0].qty, 18);
  assert.equal(out.work[0].unit, 'م.ط');
});

test('بيت نور أطوال مستقيمة بنهايتين', () => {
  const out = board.bulkhead({ mode: 'straight', segments: [{ len: 3 }], ends: 2, levels: [{ w: 0.5, d: 0.4 }], waste: 0 });
  // قاع 3×0.5 = 1.5 + رأسي 3×0.4 = 1.2 + نهايتين 2×0.5×0.4 = 0.4 → 3.1 م²
  assert.equal(s(out, 'مساحة الألواح الفعلية'), 3.1);
});

test('تكسية حوائط + أعمدة', () => {
  const w = board.cladding({ walls: [{ L: 4, H: 3 }], frame: 'direct', waste: 0, profileWaste: 0 });
  assert.equal(s(w, 'صافي المساحة'), 12);
  assert.equal(q(w, 'furring'), 8);                       // 4/0.6 → 7 + 1 = 8 صفوف × عود 3 م
  assert.equal(q(w, 'direct_bracket'), 24);               // 8 × (3/1.0 = 3)
  const c = board.columns({ columns: [{ a: 0.5, b: 0.5, H: 3, count: 2, sides: 4 }], waste: 0, profileWaste: 0 });
  assert.equal(s(c, 'مساحة التكسية'), 12);               // 2×(0.5+0.5)×3 × 2 عمود
  assert.equal(s(c, 'أطوال الزوايا الخارجية'), 24);      // 4 زوايا × 3 م × 2
});

/* ---------------------------------------------------------------
   اختبار 4: كرانيش غرفة 5 × 4 — قطعة 2 م وهالك 10%
   --------------------------------------------------------------- */
test('كرانيش غرفة 5×4', () => {
  const out = decor.cornice({ mode: 'room', L: 5, W: 4, pieceLen: 2, waste: 10, allowance: 0 });
  assert.equal(s(out, 'إجمالي الأطوال'), 18);            // المحيط
  assert.equal(s(out, 'أقل عدد قطع (خطة القص)'), 9);
  assert.equal(s(out, 'عدد القطع المطلوبة'), 10);        // 18 × 1.1 / 2 = 9.9 → 10
  assert.equal(s(out, 'كمية الهالك'), 2);                // 10 × 2 - 18
  assert.equal(s(out, 'زوايا داخلية / خارجية'), '4 / 0');
});

/* ---------------------------------------------------------------
   اختبار 5: حائط فيه 4 بانوهات مختلفة المقاسات
   1.2×0.8 ، 1.2×0.8 ، 0.6×1.5 ، 2.0×1.0 بإطار داخلي على بعد 10 سم
   --------------------------------------------------------------- */
test('4 بانوهات مختلفة + التكلفة', () => {
  const out = decor.panels({
    panels: [
      { w: 1.2, h: 0.8 }, { w: 1.2, h: 0.8 }, { w: 0.6, h: 1.5 },
      { w: 2.0, h: 1.0, inner: 1, gap: 0.1 }
    ], pieceLen: 2, waste: 10, allowance: 0
  });
  // 4.0 + 4.0 + 4.2 + (6.0 + 2×(1.8+0.8)=5.2) = 23.4 م
  assert.equal(s(out, 'أطوال الإطارات'), 23.4);
  assert.equal(s(out, 'عدد الإطارات'), 5);
  assert.equal(s(out, 'عدد الزوايا (قص ميتر)'), 20);
  assert.equal(s(out, 'عدد قطع البروفايل'), 13);          // خطة القص = 13 ، 23.4×1.1/2 = 12.87 → 13
  // التكلفة: بانوه = تصنيع وتركيب — تصنيع 500 + تركيب 150 للبانوه ، البروفايل تكلفة داخلية 40 للقطعة
  const item = { method: 'piece', scope: 'fab_install', qty: 4, fabRate: 500, laborRate: 150, fabCost: 300,
    materials: [{ qty: 13, buy: 40, sell: 60 }] };
  const a = fin.itemAmounts(item);
  assert.equal(a.client, 2600);                           // 4 × (500 + 150)
  assert.equal(a.materials, 0);                           // الخامات مش بتتحسب على العميل مرتين
  assert.equal(a.cost, 1720);                             // 4×300 + 13×40
  assert.equal(a.profit, 880);
});

/* ---------------------------------------------------------------
   اختبار 6: جبس بلدي — غرفة 4×3 بارتفاع 3 م، باب وشباك، سمك 1 سم
   --------------------------------------------------------------- */
test('جبس بلدي حوائط غرفة', () => {
  const out = plaster.plaster({
    rooms: [{ L: 4, W: 3, H: 3, walls: true }],
    openings: [{ w: 0.9, h: 2.1 }, { w: 1.2, h: 1.2 }],
    plasterType: 'baladi', rate: 1.0, thickness: 10, layers: 1, waste: 10, bagKg: 25
  });
  assert.equal(s(out, 'المساحة الإجمالية'), 38.67);      // 14 × 3 = 42 - 1.89 - 1.44
  assert.equal(s(out, 'كمية الجبس'), 425.37);            // 38.67 × 10 × 1.0 × 1.1
  assert.equal(s(out, 'عدد الشكاير'), 18);               // 425.37 / 25 = 17.01 → 18
  // تغيير المعدل يغير الكمية (المعدل مش ثابت)
  const out2 = plaster.plaster({ area: 38.67, rate: 1.2, thickness: 10, waste: 10, bagKg: 40 });
  assert.equal(s(out2, 'كمية الجبس'), 510.44);           // 38.67 × 10 × 1.2 × 1.1
  assert.equal(s(out2, 'عدد الشكاير'), 13);
});

/* ---------------------------------------------------------------
   المحرك المالي: عدم الازدواج + الربح
   --------------------------------------------------------------- */
test('طرق المحاسبة ونوع الاتفاق', () => {
  const mats = [{ qty: 8, buy: 300, sell: 350 }];
  assert.equal(fin.itemAmounts({ method: 'm2', scope: 'labor', qty: 20, laborRate: 80, materials: mats }).client, 1600);
  assert.equal(fin.itemAmounts({ method: 'm2', scope: 'labor', qty: 20, laborRate: 80, materials: mats }).cost, 0);
  const si = fin.itemAmounts({ method: 'm2', scope: 'supply_install', qty: 20, laborRate: 80, materials: mats });
  assert.equal(si.client, 4400); assert.equal(si.cost, 2400); assert.equal(si.profit, 2000);
  const sup = fin.itemAmounts({ method: 'm2', scope: 'supply', qty: 20, laborRate: 80, materials: mats });
  assert.equal(sup.client, 2800);                         // المصنعية متتحسبش في التوريد فقط
  const lump = fin.itemAmounts({ method: 'lump', scope: 'supply_install', qty: 20, laborRate: 80, lumpSum: 5000, materials: [{ qty: 1, buy: 1000, sell: 1500 }] });
  assert.equal(lump.client, 5000); assert.equal(lump.cost, 1000);
});

test('إجماليات المشروع والأرباح والمتبقي', () => {
  const project = {
    discount: 200, additions: [{ name: 'نقل', amount: 300 }],
    items: [
      { section: 'board', method: 'm2', scope: 'supply_install', qty: 20, laborRate: 80, materials: [{ qty: 8, buy: 300, sell: 350 }] },
      { section: 'decor', method: 'lm', scope: 'labor', qty: 18, laborRate: 50 }
    ]
  };
  const t = fin.projectTotals(project, {
    workers: [{ id: 'w1', wage: 250 }],
    attendance: [{ workerId: 'w1', days: 2 }],
    expenses: [{ amount: 150 }],
    payments: [{ amount: 3000 }]
  });
  assert.equal(t.subtotal, 5300);                        // 4400 + 900
  assert.equal(t.revenue, 5400);                         // 5300 - 200 + 300
  assert.equal(t.cost, 3050);                            // 2400 خامات + 500 أجور + 150 مصروفات
  assert.equal(t.profit, 2350);
  assert.equal(t.paid, 3000);
  assert.equal(t.due, 2400);                             // الإيراد ≠ المستلم فعلياً
});

test('المستندات: فاتورة مصنعية وتوريد ومستخلص', () => {
  const project = {
    items: [
      { name: 'سقف', section: 'board', method: 'm2', scope: 'supply_install', qty: 20, laborRate: 80, doneQty: 10,
        materials: [{ key: 'b', name: 'لوح', unit: 'لوح', qty: 8, buy: 300, sell: 350 }] },
      { name: 'كرانيش', section: 'decor', method: 'lm', scope: 'labor', qty: 18, laborRate: 50, doneQty: 18 }
    ]
  };
  const labor = fin.buildDoc('labor_inv', { project });
  assert.equal(labor.totals.final, 2500);                // 1600 + 900
  const sup = fin.buildDoc('supply_inv', { project });
  assert.equal(sup.totals.final, 2800);
  const all = fin.buildDoc('si_inv', { project });
  assert.equal(all.totals.final, 5300);                  // = مصنعية + توريد (بدون تكرار)
  const prog = fin.buildDoc('progress', { project });
  assert.equal(prog.totals.final, 3100);                 // نص السقف 2200 + الكرانيش كلها 900
  const boq = fin.buildDoc('boq_board', { project });
  assert.equal(boq.rows.length, 1);
  assert.equal(boq.materials[0].qty, 8);
});

test('مستحقات العامل', () => {
  const b = fin.workerBalance({ id: 'w', wage: 300 }, [{ workerId: 'w', days: 5 }, { workerId: 'w', days: 0.5, wage: 400 }], [{ workerId: 'w', amount: 500 }], [{ workerId: 'w', amount: 600 }]);
  assert.equal(b.wages, 1700);                            // 5×300 + 0.5×400
  assert.equal(b.due, 600);
});

test('خانات فاضية من الواجهة بتاخد القيم الافتراضية (مش صفر)', () => {
  // الواجهة بتبعت '' للخانات اللي المستخدم مكتبش فيها
  const c = decor.cornice({ mode: 'room', L: '5', W: '4', count: '', pieceLen: '', waste: '', allowance: '', innerCorners: '', outerCorners: '' });
  assert.equal(s(c, 'عدد القطع المطلوبة'), 10);
  const pn = decor.panels({ panels: [{ w: '1.2', h: '0.8', count: '', inner: '', outer: '', gap: '' }], pieceLen: '', waste: '' });
  assert.equal(s(pn, 'عدد قطع البروفايل'), 3);           // خطة القص = 2 (1.2+0.8 | 1.2+0.8) لكن 4 م × 1.1 هالك / 2 = 2.2 → 3
  const hm = decor.cornice({ mode: 'room', L: 5, W: 4, exec: 'handmade', kgPerMeter: '', bagKg: '' });
  assert.equal(q(hm, 'plaster_baladi'), 2);              // 18 × 1.5 × 1.1 = 29.7 كجم → شيكارة 25
  const pl = plaster.plaster({ area: '10', rate: '', bagKg: '', thickness: '', layers: '', waste: '' });
  assert.equal(s(pl, 'كمية الجبس'), 121);               // 10 × 10 مم × 1.1 (جبس بلدي) × 1.1
  const ce = board.ceiling({ rooms: [{ L: '5', W: '4', count: '', area: '', perimeter: '' }], mainSpacing: '', furSpacing: '', layers: '', boardW: '', boardL: '', waste: '' });
  assert.equal(q(ce, 'board_std_12.5'), 8);
  assert.equal(q(ce, 'furring'), 20);
});
