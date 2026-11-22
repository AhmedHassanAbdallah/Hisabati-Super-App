/*
 * أرزقي | Arzoqi — التيار الخفيف: اختبارات الحسابات (node --test tests/calc.test.js)
 * الاختبارات الإلزامية في المواصفات (بند 31): كاميرات، تخزين، شبكات، PoE، فايبر، حريق، Access، إنتركم، صوتيات، دش، مشاريع.
 */
const test = require('node:test');
const assert = require('node:assert');
const C = require('../js/calc.js');
const close = (a, b, e = 0.01) => Math.abs(a - b) <= e;
const sug = (o, key) => o.sug.find(s => s.key === key);
const warned = (o, re) => o.warn.some(w => re.test(w));

/* ---------- الكاميرات ---------- */
test('كاميرا واحدة: جهاز تسجيل وكابل ووصلات', () => {
  const o = C.cctv({ cams: [{ count: 1, tech: 'AHD', type: 'Bullet', place: 'out', power: 'adapter', len: 20 }], rec: { type: 'DVR', channels: 4, count: 1 }, cable: 'coax' });
  assert.equal(o.metrics.camera, 1);
  assert.equal(sug(o, 'rec').qty, 1);
  assert.equal(sug(o, 'cable').qty, 20);
  assert.equal(sug(o, 'bnc').qty, 2); assert.equal(sug(o, 'adp').qty, 1);
});
test('عدة كاميرات أكتر من قنوات جهاز التسجيل → تنبيه وعدد أجهزة', () => {
  const o = C.cctv({ cams: [{ count: 6, tech: 'IP', power: 'poe', watts: 5, len: 30 }, { count: 4, tech: 'IP', power: 'poe', watts: 7, len: 50 }], rec: { type: 'NVR', channels: 8, count: 1 }, cable: 'utp', reel: 305, waste: 5 });
  assert.equal(o.metrics.camera, 10);
  assert.ok(warned(o, /أكبر من قنوات التسجيل/));
  assert.equal(sug(o, 'rec').qty, 2);
  // 6×30 + 4×50 = 380 م + 5% = 399 → بكرتين 305
  assert.equal(sug(o, 'cable').qty, 2); assert.equal(sug(o, 'cable').unit, 'بكرة');
  assert.equal(sug(o, 'rj45').qty, 20);
});
test('NVR مع كاميرات أنالوج → تنبيه عدم توافق', () => {
  const o = C.cctv({ cams: [{ count: 2, tech: 'TVI' }], rec: { type: 'NVR', channels: 4 } });
  assert.ok(warned(o, /NVR/));
});
test('تخزين: 8 كاميرات × 4 Mbps × 24 ساعة × 30 يوم = 10.368 تيرا، وهامش 10% وهارد 4 تيرا → 3', () => {
  const o = C.storage({ groups: [{ count: 8, bitrate: 4 }], hours: 24, days: 30, margin: 10, diskTB: 4 });
  assert.ok(close(o.perDay, 345.6)); assert.ok(close(o.tb, 10.368)); assert.ok(close(o.sugTB, 11.4048)); assert.equal(o.disks, 3);
});
test('تخزين لأيام مختلفة: 7 أيام ربع الـ 28', () => {
  const a = C.storage({ groups: [{ count: 4, bitrate: 2 }], hours: 24, days: 7 }), b = C.storage({ groups: [{ count: 4, bitrate: 2 }], hours: 24, days: 28 });
  assert.ok(close(b.tb, a.tb * 4));
});
test('مقارنة التسجيل: الحركة 30% = 30% من المستمر', () => {
  const c = C.storage({ groups: [{ count: 4, bitrate: 4 }], hours: 24, days: 10, mode: 'cont' });
  const m = C.storage({ groups: [{ count: 4, bitrate: 4 }], hours: 24, days: 10, mode: 'motion', activity: 30 });
  assert.ok(close(m.tb, c.tb * 0.3)); assert.ok(m.rows.some(r => /مستمر/.test(r[0])));
});
test('تخزين من غير Bitrate: تقدير من الدقة والكوديك مع تنبيه', () => {
  const o = C.storage({ groups: [{ count: 1, res: 2, codec: 'H.264', fps: 25 }], hours: 24, days: 1 });
  assert.ok(close(o.perDay, C.round(4 * 3600 * 24 / 8 / 1000, 4))); assert.ok(warned(o, /تقديري/));
});

/* ---------- الشبكات ---------- */
test('نقطة شبكة واحدة: (20 + 2) × 1 كابل', () => {
  const o = C.netpoints({ points: [{ name: 'مكتب', count: 1, cat: 'CAT6', len: 20, cables: 1 }], extra: 2, ppPorts: 24 });
  assert.equal(sug(o, 'cbl:CAT6').qty, 22); assert.equal(sug(o, 'ks').qty, 1); assert.equal(sug(o, 'pc').qty, 2); assert.equal(sug(o, 'pp').qty, 1);
});
test('عدة نقاط بأطوال مختلفة + هالك + بكر + Patch Panels', () => {
  const o = C.netpoints({ points: [{ count: 10, cat: 'CAT6', len: 25, cables: 1 }, { count: 4, cat: 'CAT6', len: 40, cables: 2, patch: 2 }, { count: 2, cat: 'CAT6A', len: 60, cables: 1 }], extra: 3, waste: 10, reel: 305, ppPorts: 24 });
  // CAT6: 10×28 + 4×43×2 = 280 + 344 = 624 → +10% = 686.4 → 3 بكر
  assert.equal(sug(o, 'cbl:CAT6').qty, 3);
  assert.equal(sug(o, 'cbl:CAT6A').qty, 1);
  assert.equal(sug(o, 'ks').qty, 10 + 8 + 2);
  assert.equal(sug(o, 'pc').qty, 10 * 2 + 4 * 2 + 2 * 2);
  assert.equal(sug(o, 'pp').qty, 1); // 10 + 8 + 2 = 20 منفذ ÷ 24 → 1
});
test('حاسبة الكابلات بالمسارات: طول المسار + الارتفاع + الزيادات × العدد، والبكر والمتبقي', () => {
  const r = C.routes([{ len: 30, count: 4, rise: 3, extraStart: 2, extraEnd: 1, spare: 1, type: 'CAT6' }, { len: 50, count: 2, type: 'CAT6' }, { len: 100, count: 1, type: 'RG6' }],
    [{ type: 'CAT6', reel: 305, wastePct: 5, cost: 10, price: 15 }, { type: 'RG6', reel: 100, wastePct: 0, cost: 8, price: 12 }]);
  const g = r.groups.find(x => x.type === 'CAT6');
  assert.equal(g.len, 37 * 4 + 100); assert.ok(close(g.after, 248 * 1.05)); assert.equal(g.reels, 1); assert.ok(close(g.left, 305 - 260.4));
  assert.equal(g.cost, 3050); assert.ok(close(g.sell, 260.4 * 15));
  assert.equal(r.groups.find(x => x.type === 'RG6').reels, 1);
});

/* ---------- PoE ---------- */
test('PoE: أجهزة مختلفة الاستهلاك + احتياطي — السويتش بالطاقة مش بالمنافذ بس', () => {
  const o = C.poe({ devs: [{ count: 8, watts: 6 }, { count: 4, watts: 20 }], reserve: 20, sw: { ports: 16, budget: 120, std: 'at' } });
  // 48 + 80 = 128 × 1.2 = 153.6 → المنافذ 12 (سويتش واحد) لكن الطاقة ⌈153.6/120⌉ = 2
  assert.equal(o.ports, 12); assert.ok(close(o.need, 153.6)); assert.equal(o.switches, 2);
});
test('PoE: تجاوز الطاقة المتاحة وعدم توافق المعيار', () => {
  const o = C.poe({ devs: [{ name: 'PTZ', count: 2, watts: 40 }], sw: { ports: 8, budget: 60, std: 'at', count: 1 } });
  assert.ok(warned(o, /الطاقة مش كفاية/)); assert.ok(warned(o, /مش متوافق/));
});
test('PoE: أساس الحساب بأقصى قدرة المنفذ', () => {
  const o = C.poe({ devs: [{ count: 4, watts: 10 }], basis: 'class', sw: { ports: 8, budget: 200 } });
  assert.ok(close(o.need, 4 * 15.4));
});

/* ---------- الفايبر ---------- */
test('فايبر: مسارات متعددة وكور واحتياطي ونهايات ولحامات وملحقات', () => {
  const o = C.fiber({ routes: [{ len: 500, cores: 8, spare: 4, type: 'SM', ends: 2 }, { len: 200, cores: 4, type: 'SM', ends: 2, joints: 1 }], slack: 10, waste: 5, odfPorts: 12, closure: 1 });
  // لحامات: 12×2 + (4×2 + 1×4) = 24 + 12 = 36 ؛ pigtails 24 + 8 = 32
  assert.equal(o.splices, 36);
  assert.equal(sug(o, 'pig').qty, 32); assert.equal(sug(o, 'adp').qty, 32); assert.equal(sug(o, 'slv').qty, 36);
  assert.equal(sug(o, 'odf').qty, 1 * 2 + 1 * 2);
  assert.ok(close(sug(o, 'fib:SM|12').qty, (500 + 20) * 1.05));
  assert.equal(sug(o, 'fpc').qty, 8 * 2 + 4 * 2);
});
test('حاسبة اللحامات: نهايات × كور + وصلات × كور', () => {
  const o = C.splice({ ends: 4, cores: 12, joints: 2, jointCores: 24 });
  assert.equal(o.metrics.splice, 48 + 48); assert.equal(sug(o, 'pig').qty, 48); assert.equal(sug(o, 'closure').qty, 2);
});
test('الراك: أصغر مقاس قياسي يكفي', () => {
  const o = C.rack({ devs: [{ name: 'Patch Panel', u: 1, count: 4 }, { name: 'Switch', u: 1, count: 3 }, { name: 'NVR', u: 2, count: 1 }], reserve: 30 });
  // 9U × 1.3 = 11.7 → 12U
  assert.equal(sug(o, 'rack').name, 'راك 12U');
});

/* ---------- الحريق ---------- */
test('حريق Conventional: حصر أجهزة ولوحات بالزونات وتنبيه إنه مش تصميم معتمد', () => {
  const o = C.fire({ sys: 'conv', zones: [{ name: 'أرضي', smoke: 10, mcp: 2, sounder: 2 }, { name: 'أول', smoke: 8, heat: 2, mcp: 2, sounder: 2 }, { name: 'تاني', smoke: 8, mcp: 2, sounder: 2 }], panelZones: 2, len: 12 });
  assert.equal(sug(o, 'f:smoke').qty, 26); assert.equal(sug(o, 'f:base').qty, 28); assert.equal(sug(o, 'f:panel').qty, 2);
  assert.equal(o.metrics.device, 40); // 14 + 14 + 12
  assert.ok(warned(o, /مش تصميم|حصر كميات وتقدير مبدئي/)); assert.ok(warned(o, /مهندس مؤهل/));
});
test('حريق Addressable: الأجهزة أكبر من سعة الـ Loops', () => {
  const o = C.fire({ sys: 'addr', zones: [{ smoke: 200, mcp: 20, sounder: 20, iso: 10 }], loopCap: 125, loops: 1 });
  assert.ok(warned(o, /أكبر من سعة الـ Loops/)); assert.ok(sug(o, 'f:smoke').name.includes('Addressable'));
});

/* ---------- Access Control ---------- */
test('Access: باب واحد وعدة أبواب بمكونات مختلفة وتكلفة كل باب', () => {
  const inp = { doors: [{ name: 'مدخل', count: 1, sys: 'finger', rin: 1, rout: 1, lock: 'mag', exit: false, contact: true, psu: true, battery: true, len: 15 }, { name: 'مكاتب', count: 3, sys: 'card', rin: 1, lock: 'strike', exit: true, contact: true, psu: true, len: 10 }], ctrlDoors: 2 };
  const o = C.access(inp);
  assert.equal(o.metrics.door, 4); assert.equal(sug(o, 'a:ctrl').qty, 2);
  assert.equal(sug(o, 'a:reader:finger').qty, 2); assert.equal(sug(o, 'a:reader:card').qty, 3);
  assert.equal(sug(o, 'a:lock:mag').qty, 1); assert.equal(sug(o, 'a:lock:strike').qty, 3); assert.equal(sug(o, 'a:exit').qty, 3); assert.equal(sug(o, 'a:psu').qty, 4);
  // البند بأسعار للسطور → تكلفة كل باب
  const lines = o.sug.map(s => ({ name: s.name, qty: s.qty, unit: s.unit, auto: s.key, per: s.per, cost: { 'a:reader:finger': 1000, 'a:reader:card': 400, 'a:lock:mag': 600, 'a:lock:strike': 500, 'a:exit': 50, 'a:contact': 40, 'a:psu': 300, 'a:battery': 200, 'a:ctrl': 2000, 'a:cable': 5 }[s.key] || 0, price: 0 }));
  lines.forEach(l => { l.price = l.cost * 1.25; });
  const it = C.item({ kind: 'access', in: inp, lines, labor: [{ method: 'door', price: 300 }] });
  const d1 = it.units.find(u => u.name === 'مدخل'), d2 = it.units.find(u => u.name === 'مكاتب');
  assert.equal(d1.cost, 2 * 1000 + 600 + 40 + 300 + 200 + 15 * 5);
  assert.equal(d2.cost, 400 + 500 + 50 + 40 + 300 + 10 * 5); assert.equal(d2.costAll, d2.cost * 3);
  assert.equal(it.laborT, 4 * 300);
  assert.equal(it.cost, C.money(lines.reduce((s, l) => s + l.qty * l.cost, 0)));
});

/* ---------- الإنتركم ---------- */
test('إنتركم فيلا', () => {
  const o = C.intercom({ layout: 'villa', type: 'فيديو', ds: 1, monitors: 3, len: 60 });
  assert.equal(sug(o, 'i:ds').qty, 1); assert.equal(sug(o, 'i:mon').qty, 3); assert.equal(sug(o, 'i:lock').qty, 1); assert.equal(sug(o, 'i:cable').qty, 60);
});
test('إنتركم عمارة وعدد شقق مختلف', () => {
  const a = C.intercom({ layout: 'building', type: 'فيديو', bld: 1, floors: 10, apts: 4, entrances: 1, psuCap: 20, distCap: 8, riserH: 3, horiz: 10 });
  assert.equal(sug(a, 'i:mon').qty, 40); assert.equal(sug(a, 'i:psu').qty, 2); assert.equal(sug(a, 'i:dist').qty, 5);
  assert.equal(sug(a, 'i:cable').qty, 10 * 3 + 40 * 10);
  const b = C.intercom({ layout: 'building', type: 'صوت', bld: 2, floors: 5, apts: 2, monPerApt: 2, entrances: 2, psuCap: 20 });
  assert.equal(sug(b, 'i:mon').qty, 40); assert.equal(sug(b, 'i:ds').qty, 4); assert.ok(sug(b, 'i:mon').name.includes('سماعة'));
});

/* ---------- الصوتيات ---------- */
test('صوتيات 100V: سماعات وقدرات مختلفة ومناطق متعددة والحمل على الأمبليفاير', () => {
  const o = C.pa({ volt: '100', groups: [{ zone: 'صالة', type: 'سقف', count: 12, tap: 6 }, { zone: 'جراج', type: 'Horn', count: 4, tap: 15 }, { zone: 'حديقة', type: 'خارجي', count: 6, tap: 10 }], headroom: 20, ampW: 120, ampCount: 1 });
  // 72 + 60 + 60 = 192 × 1.2 = 230.4 → 2 أمبليفاير 120
  assert.equal(o.load, 192); assert.ok(close(o.need, 230.4)); assert.equal(sug(o, 's:amp').qty, 2);
  assert.ok(warned(o, /أقل من المطلوب/)); assert.equal(o.metrics.speaker, 22);
});
test('صوتيات Low Impedance: معاوقة القناة أقل من المسموح', () => {
  const o = C.pa({ volt: 'lowz', groups: [{ count: 4, tap: 30 }], spkZ: 8, perCh: 4, ampMinZ: 4, ampW: 200 });
  assert.ok(warned(o, /أقل من أقل معاوقة/));
});

/* ---------- السنترال ---------- */
test('سنترال IP مع خطوط أنالوج وتليفونات أنالوج → Gateways', () => {
  const o = C.pbx({ type: 'IP PBX', users: 30, co: 6, analog: 5, ip: 25, fxo: 4, fxs: 8, pbxExt: 24 });
  assert.equal(sug(o, 'p:fxo').qty, 2); assert.equal(sug(o, 'p:fxs').qty, 1); assert.ok(warned(o, /أكبر من سعة السنترال/));
});

/* ---------- الدش ---------- */
test('دش فردي Single LNB لرسيفر واحد', () => {
  const o = C.dish({ receivers: 1, sats: 1, len: 15, size: 90 });
  assert.equal(o.lnbType, 'Single'); assert.equal(sug(o, 'd:lnb').qty, 1); assert.equal(sug(o, 'd:f').qty, 2); assert.equal(sug(o, 'd:rg6').qty, 15);
});
test('Twin و Quad و Octo حسب عدد الرسيفرات', () => {
  assert.equal(C.lnb({ receivers: 2 }).lnbType, 'Twin');
  assert.equal(C.lnb({ receivers: 3 }).lnbType, 'Quad');
  assert.equal(C.lnb({ receivers: 2, tuners: 2 }).lnbType, 'Quad');
  assert.equal(C.lnb({ receivers: 6 }).lnbType, 'Octo');
  const big = C.lnb({ receivers: 10 }); assert.ok(warned(big, /Quattro/));
});
test('عدة أقمار + DiSEqC: سويتش لكل تيونر و LNB لكل قمر', () => {
  const o = C.dish({ receivers: 3, sats: 3, len: 20, jumper: 1.5 });
  assert.equal(o.diseqc, 4); assert.equal(sug(o, 'd:dq').qty, 3); assert.equal(sug(o, 'd:lnb').qty, 3); assert.ok(sug(o, 'd:lnb').name.includes('Quad'));
  // كابل: 3×20 + 3 سويتش × 3 قمر × 1.5 = 73.5
  assert.ok(close(sug(o, 'd:rg6').qty, 73.5)); assert.equal(sug(o, 'd:f').qty, 3 * 2 + 9 * 2);
});
test('دش متحرك: موتور وطبق واحد وتنبيه لو أكتر من رسيفر', () => {
  const o = C.dish({ receivers: 2, sats: 5, motor: true, len: 10 });
  assert.equal(sug(o, 'd:motor').qty, 1); assert.equal(sug(o, 'd:lnb').qty, 1); assert.ok(!sug(o, 'd:dq')); assert.ok(warned(o, /الموتور/));
});
test('دش مركزي لعمارة: ملتي سويتش لكل دور + Trunk + نقاط', () => {
  const o = C.central({ floors: 8, apts: 4, ppa: 2, sats: 2, msOut: 8, riserH: 3, horiz: 12, topo: 'floor', jumper: 0.5, ampEvery: 4 });
  // نقاط 64، خطوط 8، ملتي سويتش لكل دور 1 → 8، Trunk = 8 × 24 = 192 م
  assert.equal(o.points, 64); assert.equal(o.trunks, 8); assert.equal(o.ms, 8);
  assert.equal(sug(o, 'c:trunk').qty, 192); assert.equal(sug(o, 'c:rg6').qty, 64 * 12);
  assert.equal(sug(o, 'c:amp').qty, 2); assert.equal(sug(o, 'c:out').qty, 64); assert.equal(sug(o, 'c:lnb').qty, 2);
  assert.equal(sug(o, 'c:f').qty, 64 * 2 + 8 * 2 * 8 + 2 * 4);
});
test('دش مركزي: عدد أدوار وشقق مختلف + توزيع من مكان واحد', () => {
  const o = C.central({ floors: 5, apts: 3, ppa: 1, sats: 1, msOut: 16, riserH: 3, horiz: 8, topo: 'central', extra: [{ name: 'أمن', points: 2 }] });
  assert.equal(o.points, 17); assert.equal(o.ms, 2); assert.equal(o.trunks, 4);
  assert.ok(close(sug(o, 'c:rg6').qty, 17 * 8 + 17 * 3 * 3));
});
test('MATV/SMATV: Modulators و Taps و Splitters وفقد الإشارة', () => {
  const o = C.matv({ sys: 'smatv', channels: 12, perMod: 4, outlets: 40, tapOut: 4, branches: 4, splWays: 4, trunk: 80, drop: 5,
    loss: { out: 110, spl: 8, cable: 20, run: 100, taps: 5, tapIns: 1.5, tapOff: 20, min: 60 } });
  assert.equal(sug(o, 'm:mod').qty, 3); assert.equal(sug(o, 'm:tap').qty, 10); assert.equal(sug(o, 'm:spl').qty, 1);
  // 110 − 8 − 20 − 1.5×4 − 20 = 56 < 60
  assert.ok(close(o.level, 56)); assert.ok(warned(o, /أقل من الحد الأدنى/));
});
test('حاسبة كابلات الدش: RG6 و RG11 والبكر والـ F', () => {
  const o = C.dishcable({ points: 20, horiz: 10, extra: 0.5, risers: 4, riserLen: 30, riserType: 'RG11', jumpers: 4, jumperLen: 2, waste: 5, reel: 100, reel11: 100 });
  // RG6 = 20 × 11 + 8 = 228 × 1.05 = 239.4 → 3 بكر ؛ RG11 = 120 × 1.05 = 126 → 2
  assert.equal(sug(o, 'dc:rg6').qty, 3); assert.equal(sug(o, 'dc:rg11').qty, 2); assert.equal(sug(o, 'dc:f').qty, (20 + 4 + 4) * 2);
});
test('تكلفة نقطة التلفزيون: تأسيس فقط بيستبعد المخرج والكابل', () => {
  const o = C.tvpoint({ ptype: 'found', points: 10, pp: { cable: 12, pipe: 12, box: 1, outlet: 1, conn: 2, fix: 1 } });
  assert.ok(!sug(o, 'tp:outlet')); assert.ok(!sug(o, 'tp:cable')); assert.equal(sug(o, 'tp:pipe').qty, 120);
  const it = C.item({ kind: 'tvpoint', in: { ptype: 'single', points: 10, pp: { cable: 10, outlet: 1 } }, lines: [{ name: 'RG6', qty: 100, unit: 'متر', cost: 6, price: 8 }, { name: 'مخرج', qty: 10, cost: 30, price: 45 }], labor: [{ method: 'tvpoint', price: 100 }] });
  assert.equal(it.perPoint.cost, 90); assert.equal(it.perPoint.sell, 80 + 45 + 100);
});

/* ---------- باقي الأنظمة ---------- */
test('إنذار سرقة: حساسات ولوحات بالزونات، ولاسلكي من غير كابل', () => {
  const o = C.alarm({ type: 'wired', zones: [{ pir: 4, mc: 3 }, { pir: 2, glass: 1 }], panelZones: 8, keypads: 1, sirenOut: 1, len: 15 });
  assert.equal(sug(o, 'al:panel').qty, 2); assert.equal(sug(o, 'al:pir').qty, 6); assert.equal(sug(o, 'al:cable').qty, (10 + 1 + 1) * 15);
  const w = C.alarm({ type: 'wireless', zones: [{ pir: 4 }], panelZones: 32, len: 15 }); assert.ok(!sug(w, 'al:cable')); assert.ok(warned(w, /بطاريات/));
});
test('البوابات وسمارت هوم و BMS والحضور ونداء التمريض و IPTV', () => {
  const g = C.gates({ gates: [{ type: 'Barrier', count: 2, motor: 1, ctrl: 1, readers: 1, loops: 2, len: 30 }] });
  assert.equal(sug(g, 'g:loops').qty, 4); assert.equal(sug(g, 'g:cable').qty, 60);
  const s = C.smart({ protocol: 'Zigbee', rooms: [{ switches: 4, sensors: 2 }, { switches: 3, curtains: 2 }], hubCap: 5 });
  assert.equal(sug(s, 'sh:hub').qty, 3);
  const k = C.smart({ protocol: 'KNX', rooms: [{ switches: 40 }, { switches: 40 }], lineCap: 64, len: 10 });
  assert.equal(sug(k, 'sh:knxpsu').qty, 2); assert.equal(sug(k, 'sh:cable').qty, 800);
  const b = C.bms({ pts: [{ type: 'DI', count: 40 }, { type: 'AO', count: 20 }], ctrlCap: 32 }); assert.equal(sug(b, 'b:ddc').qty, 2); assert.ok(warned(b, /مش تصميم/));
  const a = C.attendance({ devices: 2, users: 5000, cap: 2000 }); assert.ok(warned(a, /أكتر من سعة/));
  const nn = C.nurse({ rooms: 20, beds: 2, baths: 1, ctrlCap: 32 }); assert.equal(sug(nn, 'n:pat').qty, 40); assert.equal(sug(nn, 'n:ctrl').qty, 2);
  const i = C.iptv({ screens: 100, channels: 30, br: 8, perEnc: 8, stb: true }); assert.equal(sug(i, 'ip:enc').qty, 4); assert.ok(i.rows.some(r => /240 Mbps/.test(r[1])));
});

/* ---------- البند والمشروع ---------- */
test('البند: سطور بهالك ومسارات ومصنعية بالكاميرا تلقائي من العدد', () => {
  const it = C.item({ kind: 'cctv', in: { cams: [{ count: 8, tech: 'IP', len: 20 }], rec: { type: 'NVR', channels: 8, count: 1 } },
    lines: [{ name: 'كاميرا', qty: 8, cost: 800, price: 1000 }, { name: 'كابل', qty: 160, unit: 'متر', wastePct: 10, cost: 10, price: 14 }, { name: 'RJ45', qty: 16, wastePct: 10, cost: 3, price: 5 }],
    routes: [{ len: 40, count: 1, type: 'CAT6' }], ctypes: [{ type: 'CAT6', cost: 10, price: 15 }],
    labor: [{ name: 'تركيب', method: 'camera', price: 150 }, { name: 'برمجة', method: 'lump', price: 500 }, { name: 'تأسيس', method: 'm', price: 5, qty: 100 }] });
  assert.equal(it.lines[1].final, 176); assert.equal(it.lines[2].final, 18); // 17.6 → 18 (قطع)
  assert.equal(it.labor[0].qty, 8); assert.ok(it.labor[0].auto); assert.equal(it.laborT, 1200 + 500 + 500);
  assert.equal(it.linesCost, 6400 + 1760 + 54); assert.equal(it.cableCost, 400); assert.equal(it.cableSell, 600);
  assert.equal(it.total, C.money(8000 + 176 * 14 + 18 * 5 + 600 + 2200));
});
test('تركيب فقط (الأجهزة من العميل): الخامات مش في السعر ولا التكلفة', () => {
  const it = C.item({ kind: 'custom', supply: false, lines: [{ name: 'كاميرا', qty: 4, cost: 800, price: 1000 }], labor: [{ method: 'device', qty: 4, price: 200 }] });
  assert.equal(it.total, 800); assert.equal(it.cost, 0);
});
test('مشروع بأكتر من نظام: خصم وضريبة ومصروفات وعمالة ودفعات وربح', () => {
  const j = { items: [
      { kind: 'cctv', in: { cams: [{ count: 4, tech: 'IP' }] }, lines: [{ name: 'كاميرا', qty: 4, cost: 800, price: 1000 }], labor: [{ method: 'camera', price: 200 }] },
      { kind: 'netpoints', in: { points: [{ count: 6, len: 20 }] }, lines: [{ name: 'كابل', qty: 1, unit: 'بكرة', cost: 2500, price: 3000 }], labor: [{ method: 'netpoint', price: 150 }] },
      { kind: 'central', in: { floors: 4, apts: 2, sats: 1, msOut: 8 }, lines: [{ name: 'ملتي سويتش', qty: 4, cost: 900, price: 1200 }], labor: [{ method: 'tvpoint', price: 100 }] }],
    costs: [{ type: 'transport', qty: 1, price: 300, billed: true }, { type: 'labor', mode: 'amount', amount: 1500 }, { type: 'expense', mode: 'amount', amount: 200 }],
    discount: { type: 'amount', value: 500 }, tax: { pct: 14 }, payments: [{ amount: 5000 }] };
  const r = C.job(j);
  assert.equal(r.matSell, 4000 + 3000 + 4800); assert.equal(r.labor, 800 + 900 + 800);
  const sub = 11800 + 2500 + 300; assert.equal(r.subtotal, sub);
  assert.equal(r.tax, C.money((sub - 500) * 0.14)); assert.equal(r.total, C.money(sub - 500 + (sub - 500) * 0.14));
  assert.equal(r.totalCost, 3200 + 2500 + 3600 + 300 + 1500 + 200);
  assert.equal(r.profit, C.money(sub - 500 - r.totalCost)); // الضريبة مش ربح
  assert.equal(r.remaining, C.money(r.total - 5000));
  assert.equal(Object.keys(r.bySys).length, 3);
});
test('الضمان والعقود والزيارات', () => {
  assert.equal(C.warranty({ wEnd: '2027-01-01' }, '2026-12-01').state, 'active');
  assert.equal(C.warranty({ wEnd: '2026-01-01' }, '2026-12-01').state, 'expired');
  const k = C.contract({ period: 'quarterly', months: 12, value: 4000, payments: [{ amount: 1000 }], done: [{}] });
  assert.equal(k.visits, 4); assert.equal(k.left, 3); assert.equal(k.remaining, 3000);
  const v = C.visit({ partsCost: 300, partsPrice: 450, labor: 200 }); assert.equal(v.total, 650); assert.equal(v.profit, 350);
});
test('قيم فاضية وسالبة وصفر ونصوص: مفيش NaN ولا Infinity', () => {
  const bad = { count: '-5', len: 'abc', watts: '', reel: '0', bitrate: '-1', cores: '', points: '-3' };
  Object.keys(C.KIND_CALC).forEach(k => {
    const o = C.KIND_CALC[k]({ cams: [bad], groups: [bad], points: [bad], devs: [bad], routes: [bad], zones: [bad], doors: [bad], rooms: [bad], gates: [bad], pts: [bad], floors: '-2', apts: '', sats: 'x', receivers: '-1', screens: '', channels: '' });
    const s = JSON.stringify(o);
    assert.ok(!/NaN|Infinity|null/.test(s), k + ': ' + s.slice(0, 200));
    o.sug.forEach(x => assert.ok(x.qty >= 0));
  });
  const it = C.item({ kind: 'cctv', lines: [{ qty: '-3', cost: 'x', price: '' }], labor: [{ method: 'camera', price: '-1' }] });
  assert.ok(!/NaN|Infinity/.test(JSON.stringify(it)));
});
