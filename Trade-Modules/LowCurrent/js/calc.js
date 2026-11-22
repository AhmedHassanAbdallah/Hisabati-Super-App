/*
 * أرزقي | Arzoqi — التيار الخفيف (Low Current & Satellite): محرك الحسابات.
 * دوال صافية (من غير واجهة ولا تخزين) — نفس الملف بيشتغل في المتصفح (window.LowCalc) وفي اختبارات Node.
 *
 * حصر كميات وتقدير تكاليف بس — مش تصميم هندسي معتمد. أنظمة الحريق والسلامة لازم تتصمم وتتعتمد حسب الكود
 * ومتطلبات الجهة المختصة ومهندس مؤهل. مفيش أسعار ولا أرقام مخفية: سعات الأجهزة وأطوال البكر وقدرات المنافذ
 * والـ Bitrate كلها من المستخدم، ولو حاجة ناقصة بنقول إيه الناقص بدل ما نخترع رقم. القيم المرجعية القليلة اللي
 * بتظهر (حدود معايير PoE، تقدير Bitrate لو المستخدم ما كتبوش، أحجام الراك القياسية) مكتوبة صراحة في النتيجة.
 *
 * كل حاسبة: in (المدخلات) ← { rows: [[البيان، النتيجة، طريقة الحساب]], warn: [], sug: [كميات مقترحة], metrics: {} }
 * والبند (item) بيجمع: الأجهزة والخامات (lines) + مسارات الكابلات (routes) + المصنعية (labor) + الإضافات.
 * © 2026 أحمد حسن عبدالله
 */
(function (root) {
  'use strict';

  function num(v) {
    if (typeof v === 'number') return isFinite(v) && v > 0 ? v : 0;
    var s = String(v == null ? '' : v).trim()
      .replace(/[٠-٩]/g, function (c) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(c); })
      .replace(/[۰-۹]/g, function (c) { return '۰۱۲۳۴۵۶۷۸۹'.indexOf(c); })
      .replace(/[٬\s]/g, '');
    if (s.charAt(0) === '-') return 0;
    s = /^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s) ? s.replace(/,/g, '') : s.replace(/[٫,]/g, '.');
    s = s.replace(/[^\d.]/g, '');
    var n = parseFloat(s);
    return isFinite(n) && n > 0 ? n : 0;
  }
  function round(n, d) { var p = Math.pow(10, d == null ? 4 : d); n = Number(n) || 0; return Math.round(n * p + (n >= 0 ? 1e-9 : -1e-9)) / p; }
  function money(n) { return round(n, 2); }
  function ceil(n) { return n > 0 ? Math.ceil(n - 1e-7) : 0; }
  function cnt(v) { return (v == null || String(v).trim() === '') ? 1 : num(v); }
  function arr(x) { return Array.isArray(x) ? x : []; }
  function sum(a, f) { return a.reduce(function (s, x) { return s + (f ? f(x) : x); }, 0); }
  function fq(n) { return (Number(n) || 0).toLocaleString('en-US', { maximumFractionDigits: 3 }); }
  function has(v) { return v != null && String(v).trim() !== ''; }
  function out(o) { o = o || {}; o.rows = o.rows || []; o.warn = o.warn || []; o.sug = (o.sug || []).filter(function (s) { return s.qty > 0; }); o.metrics = o.metrics || {}; return o; }
  function S(key, name, qty, unit, cat, lib) { return { key: key, name: name, qty: round(qty, 3), unit: unit || 'قطعة', cat: cat || 'device', lib: lib || name }; }

  // ---------------- الكابلات بالمسارات (مشتركة لكل الأنظمة) ----------------
  // route: { name, from, to, len, count, rise, extraStart, extraEnd, spare, type }
  // ctypes: [{ type, reel, wastePct, cost, price }] — طول البكرة وسعر المتر بيكتبهم المستخدم لكل نوع كابل
  function routeLen(r) { return round(num(r.len) + num(r.rise) + num(r.extraStart) + num(r.extraEnd) + num(r.spare), 4); }
  function routes(list, ctypes) {
    var types = {};
    arr(ctypes).forEach(function (t) { if (t && t.type) types[t.type] = t; });
    var groups = {}, rs = arr(list).map(function (r, i) {
      var per = routeLen(r), n = cnt(r.count), type = (r.type || (arr(ctypes)[0] || {}).type || 'كابل');
      var x = { name: r.name || ('مسار ' + (i + 1)), from: r.from || '', to: r.to || '', type: type, per: per, count: n, total: round(per * n, 4) };
      var g = groups[type] || (groups[type] = { type: type, routes: 0, cables: 0, len: 0 });
      g.routes++; g.cables += n; g.len = round(g.len + x.total, 4);
      return x;
    });
    var res = Object.keys(groups).map(function (k) {
      var g = groups[k], t = types[k] || {}, w = Math.min(num(t.wastePct), 100), reel = num(t.reel);
      g.wastePct = w; g.waste = round(g.len * w / 100, 4); g.after = round(g.len + g.waste, 4);
      g.reel = reel; g.reels = reel ? ceil(g.after / reel) : 0; g.bought = reel ? round(g.reels * reel, 4) : g.after; g.left = round(g.bought - g.after, 4);
      g.costPer = num(t.cost); g.pricePer = num(t.price);
      g.cost = money(g.bought * g.costPer); g.sell = money(g.after * g.pricePer);
      g.reelMissing = !reel;
      return g;
    });
    return { routes: rs, groups: res, len: round(sum(res, function (g) { return g.len; }), 4), after: round(sum(res, function (g) { return g.after; }), 4),
      cost: money(sum(res, function (g) { return g.cost; })), sell: money(sum(res, function (g) { return g.sell; })), count: rs.length };
  }
  // طول بالهالك والبكر لكمية واحدة
  function reelCalc(len, wastePct, reel) {
    var w = Math.min(num(wastePct), 100), r = num(reel), after = round(len * (1 + w / 100), 4), reels = r ? ceil(after / r) : 0;
    return { len: round(len, 4), waste: round(after - len, 4), after: after, reels: reels, bought: r ? round(reels * r, 4) : after, left: r ? round(reels * r - after, 4) : 0 };
  }
  function cableSug(key, name, len, inp) {
    var c = reelCalc(len, inp.waste, inp.reel);
    var sg = c.reels ? S(key, name + ' (بكرة ' + fq(num(inp.reel)) + ' م)', c.reels, 'بكرة', 'cable', name) : S(key, name, c.after, 'متر', 'cable', name);
    if (c.reels) sg.per = num(inp.reel);
    return { calc: c, sug: sg };
  }
  function cableRows(label, c, inp) {
    var r = [[label + ' قبل الهالك', fq(c.len) + ' م', '']];
    if (num(inp.waste)) r.push(['الهالك ' + fq(num(inp.waste)) + '%', fq(c.waste) + ' م', fq(c.len) + ' × ' + fq(num(inp.waste)) + '%']);
    r.push([label + ' بعد الهالك', fq(c.after) + ' م', '']);
    if (num(inp.reel)) r.push(['البكر (' + fq(num(inp.reel)) + ' م)', c.reels + ' بكرة', '⌈' + fq(c.after) + ' ÷ ' + fq(num(inp.reel)) + '⌉ — والمتبقي ' + fq(c.left) + ' م']);
    return r;
  }
  function needReel(o, inp, len) { if (len > 0 && !num(inp.reel)) o.warn.push('طول البكرة مش مكتوب — الكابل محسوب بالمتر (اكتب طول البكرة عندك علشان نحسب عدد البكر).'); }

  // ====================================================================
  // كاميرات المراقبة CCTV
  // ====================================================================
  var ANALOG = ['Analog', 'HD Analog', 'AHD', 'TVI', 'CVI'], IPT = ['IP', 'Wi-Fi'];
  function cctv(inp) {
    inp = inp || {}; var o = out({}), cams = arr(inp.cams), rec = inp.rec || {};
    var total = 0, analog = 0, ip = 0, cable = 0, adapters = 0, poe = 0, outdoor = 0, poeW = 0;
    cams.forEach(function (c, i) {
      var n = cnt(c.count); if (!n) return;
      total += n; var isIP = IPT.indexOf(c.tech) >= 0 || /IP|PoE|Wi/i.test(c.tech || '');
      if (isIP) ip += n; else analog += n;
      if (c.place === 'out') outdoor += n;
      if (c.power === 'adapter') adapters += n; if (c.power === 'poe') { poe += n; poeW += n * num(c.watts); }
      if (c.tech !== 'Wi-Fi') cable += n * num(c.len);
      var nm = ['كاميرا', c.type, c.tech, num(c.res) ? fq(num(c.res)) + 'MP' : '', c.place === 'out' ? 'خارجي' : c.place === 'in' ? 'داخلي' : '', c.brand, c.model].filter(Boolean).join(' ');
      o.sug.push(S('cam' + i, nm, n, 'قطعة', 'device', 'كاميرا ' + (c.type || '')));
    });
    o.rows.push(['عدد الكاميرات', String(total), cams.length + ' مجموعة']);
    if (ip && analog) o.rows.push(['IP / أنالوج', ip + ' / ' + analog, '']);
    var ch = num(rec.channels), rc = num(rec.count), type = rec.type || '';
    if (type === 'NVR' && analog) o.warn.push('جهاز NVR بيستقبل كاميرات IP بس — عندك ' + analog + ' كاميرا أنالوج/HD أنالوج.');
    if (type === 'DVR' && ip) o.warn.push('جهاز DVR للكاميرات الأنالوج/HD — عندك ' + ip + ' كاميرا IP (استخدم NVR أو XVR/Hybrid يدعمها، وراجع عدد قنوات IP في الجهاز).');
    if (ch) {
      var need = ceil(total / ch), have = rc || 0;
      o.rows.push(['قنوات جهاز التسجيل', ch + ' قناة', 'عدد الأجهزة المطلوب = ⌈' + total + ' ÷ ' + ch + '⌉ = ' + need]);
      if (have && total > have * ch) o.warn.push('عدد الكاميرات (' + total + ') أكبر من قنوات التسجيل (' + have + ' × ' + ch + ' = ' + have * ch + ') — محتاج ' + need + ' جهاز أو جهاز بقنوات أكتر.');
      if (type) o.sug.push(S('rec', (type || 'جهاز تسجيل') + ' ' + ch + ' قناة', Math.max(have, need), 'جهاز', 'device', type));
    } else if (total) o.warn.push('اكتب عدد قنوات جهاز التسجيل علشان نحسب عدد الأجهزة.');
    if (num(rec.hdd)) o.sug.push(S('hdd', 'هارد ' + (num(rec.hddTB) ? fq(num(rec.hddTB)) + ' تيرا' : 'تخزين'), num(rec.hdd), 'قطعة', 'device', 'هارد ديسك'));
    if (num(rec.monitors)) o.sug.push(S('mon', 'شاشة عرض', num(rec.monitors), 'قطعة', 'device', 'شاشة'));
    // الكابلات والوصلات
    var cab = inp.cable || (ip && !analog ? 'utp' : 'coax');
    if (cable) {
      var cs = cableSug('cable', cab === 'utp' ? 'كابل شبكة UTP' : cab === 'coaxp' ? 'كابل كواكس + باور' : 'كابل كواكس', cable, inp);
      o.rows = o.rows.concat(cableRows('الكابل', cs.calc, inp)); o.sug.push(cs.sug); needReel(o, inp, cable);
    }
    if (ip && cab === 'utp') o.sug.push(S('rj45', 'RJ45', ip * 2, 'قطعة', 'acc'));
    if (analog && cab !== 'utp') o.sug.push(S('bnc', 'وصلة BNC', analog * 2, 'قطعة', 'acc'));
    if (analog && cab === 'utp') o.sug.push(S('balun', 'بالون (Video Balun)', analog * 2, 'قطعة', 'acc'));
    if (analog) o.sug.push(S('dcj', 'وصلة DC', analog, 'قطعة', 'acc'));
    if (adapters) o.sug.push(S('adp', 'أدابتر كاميرا', adapters, 'قطعة', 'acc'));
    var cps = cams.filter(function (c) { return c.power === 'psu'; }).reduce(function (s, c) { return s + cnt(c.count); }, 0);
    if (cps) { if (num(inp.psuCh)) o.sug.push(S('psu', 'باور سبلاي مركزي ' + fq(num(inp.psuCh)) + ' مخرج', ceil(cps / num(inp.psuCh)), 'قطعة', 'device')); else o.warn.push('كاميرات على باور مركزي: اكتب عدد مخارج الباور سبلاي.'); }
    if (poe) o.rows.push(['كاميرات PoE', String(poe), poeW ? 'استهلاكها ' + fq(poeW) + ' وات — راجعها في حاسبة PoE' : 'اكتب استهلاك كل كاميرا وراجع ميزانية الطاقة في حاسبة PoE']);
    if (inp.boxes && outdoor) o.sug.push(S('jbox', 'علبة توصيل كاميرا', outdoor, 'قطعة', 'acc'));
    if (inp.mounts) o.sug.push(S('mount', 'قاعدة تثبيت كاميرا', total, 'قطعة', 'acc'));
    o.metrics = { camera: total, device: total + (ch ? Math.max(rc, ceil(total / ch)) : 0), point: total, m: round(cable, 3) };
    return o;
  }

  // ---------------- تخزين CCTV ----------------
  // Bitrate تقديري (Mbps عند 25 إطار) لو المستخدم ما كتبش الـ Bitrate — قيمة مرجعية بتظهر في النتيجة كتقدير
  var BR_EST = { 'H.264': { 1: 2, 2: 4, 3: 5, 4: 6, 5: 8, 6: 9, 8: 12 }, 'H.265': { 1: 1, 2: 2, 3: 2.5, 4: 3, 5: 4, 6: 4.5, 8: 6 } };
  function estBitrate(res, codec, fps) {
    var t = BR_EST[codec] || BR_EST['H.264'], r = num(res); if (!r) return 0;
    var keys = Object.keys(t).map(Number).sort(function (a, b) { return a - b; }), k = keys.find(function (x) { return x >= r; }) || keys[keys.length - 1];
    return round(t[k] * (num(fps) ? num(fps) / 25 : 1), 3);
  }
  function gbDay(mbps, hours, activity) { return mbps * 3600 * hours * activity / 8 / 1000; }
  function storage(inp) {
    inp = inp || {}; var o = out({}), hours = Math.min(num(inp.hours), 24), days = num(inp.days), motion = inp.mode === 'motion', act = motion ? Math.min(num(inp.activity), 100) / 100 : 1;
    var cams = 0, perDay = 0, perDayCont = 0, est = false;
    arr(inp.groups).forEach(function (g, i) {
      var n = cnt(g.count), br = num(g.bitrate); if (!n) return;
      if (!br) { br = estBitrate(g.res, g.codec, g.fps); if (br) est = true; }
      if (!br) { o.warn.push('المجموعة ' + (i + 1) + ': اكتب الـ Bitrate (أو الدقة والكوديك علشان نقدّره).'); return; }
      var d = gbDay(br, hours, act), dc = gbDay(br, hours, 1);
      cams += n; perDay += d * n; perDayCont += dc * n;
      o.rows.push(['كاميرا ' + (g.name || (i + 1)) + ' (' + fq(br) + ' Mbps' + (num(g.bitrate) ? '' : ' تقديري') + ')', fq(round(d, 2)) + ' جيجا/يوم', fq(br) + ' × 3600 × ' + fq(hours) + ' ساعة' + (motion ? ' × ' + fq(act * 100) + '% حركة' : '') + ' ÷ 8 ÷ 1000 — × ' + n + ' كاميرا']);
    });
    if (!hours) o.warn.push('اكتب عدد ساعات التسجيل في اليوم.');
    if (!days) o.warn.push('اكتب عدد أيام الاحتفاظ بالتسجيل.');
    if (motion && !num(inp.activity)) o.warn.push('التسجيل بالحركة: اكتب نسبة وقت الحركة التقريبية %.');
    if (est) o.warn.push('فيه Bitrate تقديري (H.264: 2MP≈4، 4MP≈6، 8MP≈12 Mbps عند 25 إطار؛ H.265 تقريباً النص) — الأدق تكتب الـ Bitrate من إعدادات الكاميرا.');
    var total = perDay * days, tb = total / 1000, margin = num(inp.margin), sugTB = tb * (1 + margin / 100);
    o.rows.push(['الاستهلاك اليومي الكلي', fq(round(perDay, 2)) + ' جيجا', cams + ' كاميرا']);
    o.rows.push(['خلال ' + fq(days) + ' يوم', fq(round(total, 1)) + ' جيجا = ' + fq(round(tb, 2)) + ' تيرا', fq(round(perDay, 2)) + ' × ' + fq(days)]);
    if (motion && perDayCont) o.rows.push(['للمقارنة: تسجيل مستمر', fq(round(perDayCont * days / 1000, 2)) + ' تيرا', 'نفس الكاميرات بدون حركة']);
    o.rows.push(['السعة المقترحة', fq(round(sugTB, 2)) + ' تيرا', margin ? fq(round(tb, 2)) + ' + هامش ' + fq(margin) + '%' : 'من غير هامش (تقدر تكتب هامش %)']);
    var disk = num(inp.diskTB), disks = disk ? ceil(sugTB / disk) : 0;
    if (disk) {
      o.rows.push(['عدد الهاردات', disks + ' × ' + fq(disk) + ' تيرا', '⌈' + fq(round(sugTB, 2)) + ' ÷ ' + fq(disk) + '⌉']);
      if (num(inp.bays) && disks > num(inp.bays)) o.warn.push('محتاج ' + disks + ' هارد والجهاز بياخد ' + fq(num(inp.bays)) + ' بس — زوّد سعة الهارد أو قلّل أيام الاحتفاظ أو جهاز تاني.');
      o.sug.push(S('hdd', 'هارد ' + fq(disk) + ' تيرا (مراقبة)', disks, 'قطعة', 'device', 'هارد ديسك'));
    } else if (tb) o.warn.push('اكتب سعة الهارد الواحد علشان نحسب عدد الهاردات.');
    o.metrics = { camera: cams, device: disks };
    o.tb = round(tb, 4); o.sugTB = round(sugTB, 4); o.disks = disks; o.perDay = round(perDay, 4);
    return o;
  }

  // ====================================================================
  // الشبكات: نقاط الشبكة
  // ====================================================================
  function netpoints(inp) {
    inp = inp || {}; var o = out({}), extra = num(inp.extra), byCat = {}, ks = 0, fp = 0, pc = 0, ports = 0, pts = 0, units = [];
    arr(inp.points).forEach(function (p, i) {
      var n = cnt(p.count), cables = cnt(p.cables), len = num(p.len), cat = p.cat || 'CAT6';
      if (!n) return; pts += n;
      var m = (len + extra) * cables * n;
      byCat[cat] = round((byCat[cat] || 0) + m, 4);
      var k = has(p.keystones) ? num(p.keystones) : cables, f = has(p.faceplates) ? num(p.faceplates) : 1, c = has(p.patch) ? num(p.patch) : cables * 2;
      ks += k * n; fp += f * n; pc += c * n; ports += cables * n;
      var comps = { ks: k, fp: f, pc: c }; comps['cbl:' + cat] = (len + extra) * cables;
      units.push({ name: p.name || ('نقطة ' + (i + 1)), count: n, comps: comps });
      o.rows.push([(p.name || 'نقطة ' + (i + 1)) + (p.place ? ' — ' + p.place : ''), fq(round(m, 2)) + ' م', '(' + fq(len) + (extra ? ' + ' + fq(extra) : '') + ') × ' + cables + ' كابل' + (n > 1 ? ' × ' + n + ' نقطة' : '')]);
    });
    Object.keys(byCat).forEach(function (cat) {
      var cs = cableSug('cbl:' + cat, 'كابل ' + cat, byCat[cat], inp);
      o.rows = o.rows.concat(cableRows('كابل ' + cat, cs.calc, inp)); o.sug.push(cs.sug); needReel(o, inp, byCat[cat]);
    });
    if (ks) o.sug.push(S('ks', 'Keystone Jack', ks, 'قطعة', 'acc'));
    if (fp) o.sug.push(S('fp', 'Faceplate', fp, 'قطعة', 'acc'));
    if (pc) o.sug.push(S('pc', 'Patch Cord', pc, 'قطعة', 'acc'));
    if (num(inp.ppPorts) && ports) { var pp = ceil(ports / num(inp.ppPorts)); o.sug.push(S('pp', 'Patch Panel ' + fq(num(inp.ppPorts)) + ' منفذ', pp, 'قطعة', 'device')); o.rows.push(['Patch Panels', String(pp), '⌈' + ports + ' منفذ ÷ ' + fq(num(inp.ppPorts)) + '⌉']); }
    else if (ports) o.warn.push('اكتب عدد منافذ الـ Patch Panel علشان نحسب عددها.');
    if (pts && !has((arr(inp.points)[0] || {}).patch)) o.rows.push(['Patch Cords', String(pc), 'افتراضي 2 لكل كابل (طرف عند الجهاز وطرف عند الراك) — عدّلها في النقطة']);
    o.metrics = { netpoint: pts, point: pts, m: round(sum(Object.keys(byCat).map(function (k) { return byCat[k]; })), 3), device: 0 };
    o.units = units;
    return o;
  }

  // ---------------- حاسبة الكابلات (المسارات بس) ----------------
  function cables() { return out({ rows: [], metrics: {} }); }

  // ====================================================================
  // PoE
  // ====================================================================
  var POE = { af: { name: '802.3af (PoE)', pd: 12.95, pse: 15.4, lvl: 1 }, at: { name: '802.3at (PoE+)', pd: 25.5, pse: 30, lvl: 2 }, bt3: { name: '802.3bt Type 3', pd: 51, pse: 60, lvl: 3 }, bt4: { name: '802.3bt Type 4', pd: 71.3, pse: 90, lvl: 4 } };
  var POE_ORDER = ['af', 'at', 'bt3', 'bt4'];
  function stdFor(w) { return POE_ORDER.find(function (k) { return w <= POE[k].pd; }) || null; }
  function poe(inp) {
    inp = inp || {}; var o = out({}), ports = 0, power = 0, classP = 0, sw = inp.sw || {}, swStd = POE[sw.std] || null, bad = [];
    arr(inp.devs).forEach(function (d, i) {
      var n = cnt(d.count), w = num(d.watts); if (!n) return;
      var std = POE[d.std] ? d.std : stdFor(w);
      ports += n; power += n * w; classP += n * (std ? POE[std].pse : w);
      if (!w) o.warn.push((d.name || 'جهاز ' + (i + 1)) + ': اكتب استهلاكه بالوات.');
      if (w && !std) o.warn.push((d.name || 'جهاز ' + (i + 1)) + ': ' + fq(w) + ' وات أكبر من أي معيار PoE قياسي (أقصى 71.3 وات عند الجهاز).');
      if (std && swStd && POE[std].lvl > swStd.lvl) bad.push((d.name || 'جهاز ' + (i + 1)) + ' محتاج ' + POE[std].name + ' والسويتش ' + swStd.name);
      o.rows.push([(d.name || 'جهاز ' + (i + 1)) + ' × ' + n, fq(round(n * w, 2)) + ' وات', fq(w) + ' وات' + (std ? ' — ' + POE[std].name : '')]);
    });
    bad.forEach(function (b) { o.warn.push('مش متوافق: ' + b + '.'); });
    var basis = inp.basis === 'class' ? classP : power, res = num(inp.reserve), need = basis * (1 + res / 100);
    o.rows.push(['إجمالي المنافذ', String(ports), '']);
    o.rows.push(['الطاقة المطلوبة', fq(round(basis, 2)) + ' وات', inp.basis === 'class' ? 'بأقصى قدرة المنفذ لكل معيار (عند السويتش)' : 'باستهلاك الأجهزة نفسها']);
    if (res) o.rows.push(['الاحتياطي ' + fq(res) + '%', fq(round(basis * res / 100, 2)) + ' وات', '']);
    o.rows.push(['PoE Budget المطلوب', fq(round(need, 2)) + ' وات', '']);
    var sp = num(sw.ports), sb = num(sw.budget), have = num(sw.count);
    if (sp && sb) {
      var n = Math.max(ceil(ports / sp), ceil(need / sb));
      o.rows.push(['عدد السويتشات المقترح', String(n), 'الأكبر من: ⌈' + ports + ' ÷ ' + fq(sp) + ' منفذ⌉ = ' + ceil(ports / sp) + ' و ⌈' + fq(round(need, 1)) + ' ÷ ' + fq(sb) + ' وات⌉ = ' + ceil(need / sb)]);
      if (have) {
        o.rows.push(['المتاح عندك', fq(have * sp) + ' منفذ / ' + fq(have * sb) + ' وات', have + ' سويتش']);
        if (ports > have * sp) o.warn.push('المنافذ مش كفاية: محتاج ' + ports + ' والمتاح ' + fq(have * sp) + '.');
        if (need > have * sb) o.warn.push('الطاقة مش كفاية: محتاج ' + fq(round(need, 1)) + ' وات والمتاح ' + fq(have * sb) + ' وات.');
      }
      o.sug.push(S('sw', 'سويتش PoE ' + fq(sp) + ' منفذ ' + fq(sb) + ' وات', Math.max(n, have), 'جهاز', 'device', 'PoE Switch'));
      o.switches = n;
    } else if (ports) o.warn.push('اكتب عدد منافذ السويتش وميزانية الطاقة بتاعته (PoE Budget) — مش بنقترح سويتش بعدد المنافذ بس.');
    o.ports = ports; o.need = round(need, 3);
    o.metrics = { device: ports, point: ports };
    return o;
  }

  // ====================================================================
  // الفايبر + اللحامات
  // ====================================================================
  function fiber(inp) {
    inp = inp || {}; var o = out({}), slack = num(inp.slack), byType = {}, splices = 0, pig = 0, pcs = 0, odf = 0, ends = 0, nR = 0;
    arr(inp.routes).forEach(function (r, i) {
      var cores = num(r.cores), spare = num(r.spare), tot = cores + spare, e = has(r.ends) ? num(r.ends) : 2, j = num(r.joints), len = num(r.len);
      if (!len && !tot) return; nR++;
      var m = len + slack * e, key = (r.type || 'SM') + '|' + tot;
      byType[key] = round((byType[key] || 0) + m, 4);
      var sp = tot * e + j * tot; splices += sp; pig += tot * e; pcs += (has(r.patch) ? num(r.patch) : cores) * e; ends += e;
      if (num(inp.odfPorts)) odf += ceil(tot / num(inp.odfPorts)) * e;
      o.rows.push([(r.name || 'مسار ' + (i + 1)) + ' — ' + tot + ' كور', fq(round(m, 2)) + ' م · ' + sp + ' لحام', fq(len) + (slack ? ' + ' + fq(slack) + ' × ' + e + ' احتياطي لفة' : '') + ' م؛ لحامات = ' + tot + ' × ' + e + ' نهاية' + (j ? ' + ' + j + ' وصلة × ' + tot : '')]);
    });
    Object.keys(byType).forEach(function (k) {
      var p = k.split('|'), cs = cableSug('fib:' + k, 'كابل فايبر ' + p[0] + ' ' + p[1] + ' كور', byType[k], { waste: inp.waste, reel: inp.drum });
      o.rows = o.rows.concat(cableRows('فايبر ' + p[0] + ' ' + p[1] + ' كور', cs.calc, { waste: inp.waste, reel: inp.drum })); o.sug.push(cs.sug);
    });
    o.rows.push(['اللحامات', String(splices), 'Pigtails ' + pig + ' · Adapters ' + pig]);
    o.sug.push(S('pig', 'Pigtail', pig, 'قطعة', 'acc'), S('adp', 'Adapter فايبر', pig, 'قطعة', 'acc'), S('slv', 'جراب لحام (Sleeve)', splices, 'قطعة', 'acc'), S('fpc', 'Fiber Patch Cord', pcs, 'قطعة', 'acc'));
    if (odf) o.sug.push(S('odf', 'ODF ' + fq(num(inp.odfPorts)) + ' منفذ', odf, 'قطعة', 'device', 'ODF'));
    else if (pig) o.warn.push('اكتب عدد منافذ الـ ODF علشان نحسب عددها.');
    arr(inp.spl).forEach(function (s) { if (num(s.count)) o.sug.push(S('spl:' + (s.ratio || ''), 'Splitter ' + (s.ratio || ''), num(s.count), 'قطعة', 'device', 'Splitter فايبر')); });
    [['closure', 'Joint Closure'], ['fat', 'FAT'], ['fdb', 'FDB'], ['mc', 'Media Converter']].forEach(function (p) { if (num(inp[p[0]])) o.sug.push(S(p[0], p[1], num(inp[p[0]]), 'قطعة', 'device')); });
    o.splices = splices;
    o.metrics = { splice: splices, route: nR, point: ends, m: round(sum(Object.keys(byType).map(function (k) { return byType[k]; })), 3), device: odf };
    return o;
  }
  function splice(inp) {
    inp = inp || {}; var o = out({}), e = num(inp.ends), c = num(inp.cores), j = num(inp.joints), jc = has(inp.jointCores) ? num(inp.jointCores) : c;
    var term = e * c, mid = j * jc, tot = term + mid;
    o.rows.push(['لحامات النهايات', String(term), e + ' نهاية × ' + c + ' كور'], ['لحامات الوصلات', String(mid), j + ' وصلة × ' + jc + ' كور'], ['إجمالي اللحامات', String(tot), '']);
    o.sug.push(S('pig', 'Pigtail', term, 'قطعة', 'acc'), S('adp', 'Adapter فايبر', term, 'قطعة', 'acc'), S('slv', 'جراب لحام (Sleeve)', tot, 'قطعة', 'acc'));
    if (j) o.sug.push(S('closure', 'Joint Closure', j, 'قطعة', 'device'));
    if (inp.test) o.rows.push(['اختبارات', String(c * (e ? e / 2 : 1)) + ' كور', 'اختبار لكل كور (OTDR/Power meter) حسب اللي هتعمله']);
    o.metrics = { splice: tot, point: e, device: 0 };
    return o;
  }

  // ---------------- الراك ----------------
  var RACK_U = [6, 9, 12, 15, 18, 22, 27, 32, 37, 42, 47];
  function rack(inp) {
    inp = inp || {}; var o = out({}), used = 0;
    arr(inp.devs).forEach(function (d) { var u = num(d.u), n = cnt(d.count); if (!u) return; used += u * n; o.rows.push([(d.name || 'جهاز') + ' × ' + n, fq(u * n) + 'U', fq(u) + 'U × ' + n]); });
    var res = num(inp.reserve), need = ceil(used * (1 + res / 100));
    o.rows.push(['المستخدم', fq(used) + 'U', ''], ['المطلوب' + (res ? ' بالاحتياطي ' + fq(res) + '%' : ''), need + 'U', '']);
    if (!need) return o;
    var size = num(inp.size) || RACK_U.find(function (u) { return u >= need; }), racks = size ? ceil(need / size) : 0;
    if (!num(inp.size) && !size) { size = 42; racks = ceil(need / 42); }
    o.rows.push(['الراك', racks + ' × ' + size + 'U', num(inp.size) ? 'المقاس اللي اخترته' : 'أصغر مقاس قياسي يكفي (6/9/12/15/18/22/27/32/37/42/47U)']);
    o.sug.push(S('rack', 'راك ' + size + 'U', racks, 'قطعة', 'device', 'Network Rack'));
    if (num(inp.managers)) o.sug.push(S('cm', 'Cable Manager', num(inp.managers), 'قطعة', 'acc'));
    o.metrics = { device: racks };
    return o;
  }

  // ====================================================================
  // إنذار الحريق (حصر كميات فقط)
  // ====================================================================
  var FIRE_DEV = [['smoke', 'كاشف دخان'], ['heat', 'كاشف حرارة'], ['mcp', 'Manual Call Point'], ['sounder', 'Sounder / Bell'], ['strobe', 'Strobe'], ['ss', 'Sounder Strobe'], ['io', 'Input/Output Module'], ['relay', 'Relay Module'], ['iso', 'Isolator']];
  function fire(inp) {
    inp = inp || {}; var o = out({}), addr = inp.sys === 'addr', tot = {}, zones = 0, devs = 0;
    FIRE_DEV.forEach(function (d) { tot[d[0]] = 0; });
    arr(inp.zones).forEach(function (z, i) {
      var n = 0; FIRE_DEV.forEach(function (d) { var v = num(z[d[0]]); tot[d[0]] += v; n += v; });
      if (!n) return; zones++; devs += n;
      o.rows.push([(z.name || 'منطقة ' + (i + 1)) + (z.floor ? ' — ' + z.floor : ''), n + ' جهاز', '']);
    });
    var pre = addr ? 'Addressable ' : '';
    FIRE_DEV.forEach(function (d) { if (tot[d[0]]) o.sug.push(S('f:' + d[0], pre + d[1], tot[d[0]], 'قطعة', 'device', d[1])); });
    var bases = tot.smoke + tot.heat; if (bases) o.sug.push(S('f:base', 'قاعدة كاشف', bases, 'قطعة', 'acc'));
    var boxes = tot.mcp + tot.sounder + tot.strobe + tot.ss; if (boxes && inp.boxes) o.sug.push(S('f:box', 'علبة (Back box)', boxes, 'قطعة', 'acc'));
    o.rows.push(['إجمالي الأجهزة', String(devs), zones + ' منطقة']);
    if (!addr) {
      var pz = num(inp.panelZones);
      if (pz) { var p = ceil(zones / pz); o.rows.push(['لوحات Conventional', String(p), '⌈' + zones + ' منطقة ÷ ' + fq(pz) + ' زون في اللوحة⌉']); o.sug.push(S('f:panel', 'لوحة إنذار حريق ' + fq(pz) + ' زون', p, 'جهاز', 'device', 'Fire Alarm Panel')); if (num(inp.panels) && num(inp.panels) * pz < zones) o.warn.push('عدد المناطق أكبر من زونات اللوحات اللي كتبتها.'); }
      else if (zones) o.warn.push('اكتب عدد زونات اللوحة علشان نحسب عدد اللوحات.');
    } else {
      var lc = num(inp.loopCap), loops = num(inp.loops), loopDevs = devs;
      if (lc) {
        var need = ceil(loopDevs / lc);
        o.rows.push(['Loops مطلوبة (حصر)', String(need), '⌈' + loopDevs + ' جهاز ÷ ' + fq(lc) + ' جهاز في الـ Loop⌉']);
        if (loops && need > loops) o.warn.push('الأجهزة (' + loopDevs + ') أكبر من سعة الـ Loops اللي كتبتها (' + loops + ' × ' + fq(lc) + ').');
        o.sug.push(S('f:panel', 'لوحة Addressable', num(inp.panels) || 1, 'جهاز', 'device', 'Addressable Panel'));
      } else if (devs) o.warn.push('اكتب سعة الـ Loop (عدد الأجهزة) من كتالوج اللوحة.');
    }
    var len = num(inp.len) * devs;
    if (len) { var cs = cableSug('f:cable', 'كابل حريق', len, inp); o.rows = o.rows.concat(cableRows('كابل الحريق', cs.calc, inp)); o.sug.push(cs.sug); needReel(o, inp, len); }
    o.warn.push('حصر كميات وتقدير مبدئي بس — تصميم نظام الحريق (عدد الأجهزة وتقسيم المناطق وسعات اللوحات والـ Loops) واعتماده لازم يكون حسب الكود ومتطلبات الجهة المختصة ومهندس مؤهل.');
    o.metrics = { device: devs, point: devs, m: round(len, 3) };
    return o;
  }

  // ====================================================================
  // التحكم في الدخول: كل باب لوحده
  // ====================================================================
  var LOCKS = { mag: 'قفل مغناطيسي', strike: 'Electric Strike', bolt: 'Electric Bolt' };
  function access(inp) {
    inp = inp || {}; var o = out({}), T = {}, units = [], doors = 0, len = 0;
    function add(k, v) { T[k] = (T[k] || 0) + v; }
    arr(inp.doors).forEach(function (d, i) {
      var n = cnt(d.count); if (!n) return; doors += n;
      var c = {};
      var rd = num(d.rin) + num(d.rout); if (rd) c['a:reader:' + (d.sys || 'card')] = rd;
      if (num(d.locks) || d.lock) c['a:lock:' + (d.lock || 'mag')] = has(d.locks) ? num(d.locks) : 1;
      ['exit', 'contact', 'psu', 'battery', 'breakglass', 'closer'].forEach(function (k) { if (d[k]) c['a:' + k] = 1; });
      var l = num(d.len); if (l) c['a:cable'] = l;
      Object.keys(c).forEach(function (k) { add(k, c[k] * n); });
      len += l * n;
      units.push({ name: d.name || ('باب ' + (i + 1)), count: n, comps: c });
      o.rows.push([(d.name || 'باب ' + (i + 1)) + (n > 1 ? ' × ' + n : ''), Object.keys(c).filter(function (k) { return k !== 'a:cable'; }).length + ' مكون', [d.type, ACC_SYS[d.sys] || '', d.lock ? LOCKS[d.lock] : ''].filter(Boolean).join(' · ')]);
    });
    Object.keys(T).forEach(function (k) {
      if (k === 'a:cable') return;
      var p = k.split(':'), nm = p[1] === 'reader' ? 'قارئ ' + (ACC_SYS[p[2]] || '') : p[1] === 'lock' ? LOCKS[p[2]] : ACC_COMP[p[1]];
      o.sug.push(S(k, nm, T[k], 'قطعة', p[1] === 'cable' ? 'cable' : 'device', nm));
    });
    var cap = num(inp.ctrlDoors);
    if (cap && doors) { var nc = ceil(doors / cap); o.rows.push(['الكنترولرات', String(nc), '⌈' + doors + ' باب ÷ ' + fq(cap) + ' باب للكنترولر⌉']); o.sug.push(S('a:ctrl', 'كنترولر ' + fq(cap) + ' باب', nc, 'جهاز', 'device', 'Access Controller')); }
    else if (doors && !inp.standalone) o.warn.push('اكتب عدد الأبواب اللي الكنترولر الواحد بيشغّلها (أو علّم إن الأجهزة Standalone).');
    if (len) { var cs = cableSug('a:cable', 'كابل تحكم', len, inp); o.rows = o.rows.concat(cableRows('الكابل', cs.calc, inp)); o.sug.push(cs.sug); }
    o.rows.unshift(['عدد الأبواب', String(doors), '']);
    o.units = units;
    o.metrics = { door: doors, device: sum(Object.keys(T).filter(function (k) { return k !== 'a:cable'; }).map(function (k) { return T[k]; })), point: doors, m: round(len, 3) };
    return o;
  }
  var ACC_SYS = { card: 'كارت RFID', finger: 'بصمة', face: 'وجه', keypad: 'كيباد' };
  var ACC_COMP = { exit: 'زر خروج', contact: 'Door Contact', psu: 'باور سبلاي', battery: 'بطارية احتياطي', breakglass: 'Emergency Release', closer: 'Door Closer' };

  // ====================================================================
  // الإنتركم: فيلا أو عمارات
  // ====================================================================
  function intercom(inp) {
    inp = inp || {}; var o = out({}), t = inp.type ? inp.type + ' ' : '', video = /فيديو|Video|IP/i.test(inp.type || '');
    var mon, ds, locks, m = 0, apts = 0, bld = 1;
    if (inp.layout === 'villa') {
      ds = num(inp.ds); mon = num(inp.monitors); locks = has(inp.locks) ? num(inp.locks) : ds;
      m = num(inp.len);
      o.rows.push(['إنتركم فيلا', ds + ' وحدة خارجية · ' + mon + ' ' + (video ? 'شاشة' : 'سماعة'), '']);
      if (num(inp.psu)) o.sug.push(S('i:psu', 'باور سبلاي إنتركم', num(inp.psu), 'قطعة', 'device'));
    } else {
      bld = cnt(inp.bld); var fl = num(inp.floors), ap = num(inp.apts);
      apts = bld * fl * ap; mon = apts * cnt(inp.monPerApt); ds = bld * cnt(inp.entrances); locks = has(inp.locks) ? num(inp.locks) * bld : ds;
      o.rows.push(['عدد الشقق', String(apts), bld + ' عمارة × ' + fl + ' دور × ' + ap + ' شقة'], ['الأجهزة الداخلية', String(mon), apts + ' × ' + cnt(inp.monPerApt)], ['الوحدات الخارجية', String(ds), bld + ' × ' + cnt(inp.entrances) + ' مدخل']);
      var perB = fl * ap;
      if (num(inp.distCap)) { var dist = ceil(perB / num(inp.distCap)) * bld; o.rows.push(['وحدات التوزيع', String(dist), '⌈' + perB + ' ÷ ' + fq(num(inp.distCap)) + '⌉ × ' + bld]); o.sug.push(S('i:dist', 'وحدة توزيع إنتركم', dist, 'قطعة', 'device')); }
      if (num(inp.psuCap)) { var ps = ceil(perB / num(inp.psuCap)) * bld; o.sug.push(S('i:psu', 'باور سبلاي إنتركم', ps, 'قطعة', 'device')); }
      else if (apts) o.warn.push('اكتب عدد الشقق اللي الباور سبلاي الواحد بيغذيها (من كتالوج النظام).');
      var riser = bld * fl * num(inp.riserH), hz = apts * num(inp.horiz);
      m = riser + hz;
      if (m) o.rows.push(['الكابل الرأسي / الأفقي', fq(round(riser, 2)) + ' / ' + fq(round(hz, 2)) + ' م', bld + ' × ' + fl + ' دور × ' + fq(num(inp.riserH)) + ' م ؛ ' + apts + ' شقة × ' + fq(num(inp.horiz)) + ' م']);
    }
    if (ds) o.sug.push(S('i:ds', 'وحدة خارجية ' + t, ds, 'قطعة', 'device', 'Door Station'));
    if (mon) o.sug.push(S('i:mon', (video ? 'شاشة داخلية ' : 'سماعة داخلية ') + t, mon, 'قطعة', 'device', video ? 'Indoor Monitor' : 'سماعة إنتركم'));
    if (locks) o.sug.push(S('i:lock', 'قفل كهربا', locks, 'قطعة', 'device'));
    if (num(inp.masters)) o.sug.push(S('i:master', 'Master Station', num(inp.masters), 'قطعة', 'device'));
    if (m) { var cs = cableSug('i:cable', 'كابل إنتركم', m, inp); o.rows = o.rows.concat(cableRows('الكابل', cs.calc, inp)); o.sug.push(cs.sug); needReel(o, inp, m); }
    o.metrics = { device: (mon || 0) + (ds || 0), point: (mon || 0) + (ds || 0), m: round(m, 3) };
    return o;
  }

  // ====================================================================
  // الصوتيات PA: الأحمال على الأمبليفاير
  // ====================================================================
  function pa(inp) {
    inp = inp || {}; var o = out({}), line = inp.volt !== 'lowz', load = 0, n = 0, zones = {};
    arr(inp.groups).forEach(function (g, i) {
      var c = cnt(g.count), tap = num(g.tap); if (!c) return;
      n += c; load += c * tap; zones[g.zone || ('منطقة ' + (i + 1))] = 1;
      o.sug.push(S('s:' + i, 'سماعة ' + (g.type || '') + (tap ? ' ' + fq(tap) + ' وات' : ''), c, 'قطعة', 'device', 'سماعة ' + (g.type || '')));
      o.rows.push([(g.zone || 'منطقة ' + (i + 1)) + ' — ' + (g.type || 'سماعة'), fq(c * tap) + ' وات', c + ' × ' + fq(tap) + ' وات' + (line ? ' (Tap)' : '')]);
      if (line && !tap) o.warn.push((g.zone || 'المجموعة ' + (i + 1)) + ': اختار الـ Tap (وات) لكل سماعة.');
    });
    var nz = Object.keys(zones).length, head = num(inp.headroom), need = load * (1 + head / 100), aw = num(inp.ampW), ac = num(inp.ampCount);
    o.rows.push(['عدد السماعات / المناطق', n + ' / ' + nz, ''], ['إجمالي الحمل', fq(load) + ' وات', 'مجموع الـ Taps'], ['المطلوب بالهامش', fq(round(need, 1)) + ' وات', head ? fq(load) + ' × (1 + ' + fq(head) + '%)' : 'من غير هامش — يُفضّل تكتب هامش حسب توصية المصنع']);
    if (aw) {
      var na = ceil(need / aw);
      o.rows.push(['الأمبليفايرات', na + ' × ' + fq(aw) + ' وات', '⌈' + fq(round(need, 1)) + ' ÷ ' + fq(aw) + '⌉']);
      if (ac && ac * aw < need) o.warn.push('قدرة الأمبليفايرات (' + ac + ' × ' + fq(aw) + ' = ' + fq(ac * aw) + ' وات) أقل من المطلوب (' + fq(round(need, 1)) + ' وات).');
      o.sug.push(S('s:amp', 'أمبليفاير ' + (line ? (inp.volt || '100') + 'V ' : '') + fq(aw) + ' وات', Math.max(na, ac), 'جهاز', 'device', 'Amplifier'));
    } else if (n) o.warn.push('اكتب قدرة الأمبليفاير (وات) علشان نحسب العدد.');
    if (!line) {
      var z = num(inp.spkZ), per = num(inp.perCh), mz = num(inp.ampMinZ);
      if (z && per) { var zt = z / per; o.rows.push(['معاوقة كل قناة (توصيل متوازي)', fq(round(zt, 2)) + ' أوم', fq(z) + ' ÷ ' + fq(per) + ' سماعة']); if (mz && zt < mz) o.warn.push('المعاوقة ' + fq(round(zt, 2)) + ' أوم أقل من أقل معاوقة للأمبليفاير (' + fq(mz) + ' أوم) — قلل السماعات على القناة.'); }
      else o.warn.push('نظام Low Impedance: اكتب معاوقة السماعة وعدد السماعات على القناة علشان نتأكد من الحمل.');
    }
    [['mics', 'ميكروفون'], ['mixers', 'ميكسر'], ['volctl', 'Volume Control']].forEach(function (p) { if (num(inp[p[0]])) o.sug.push(S('s:' + p[0], p[1], num(inp[p[0]]), 'قطعة', 'device')); });
    var len = num(inp.len) * n;
    if (len) { var cs = cableSug('s:cable', 'كابل سماعات', len, inp); o.rows = o.rows.concat(cableRows('الكابل', cs.calc, inp)); o.sug.push(cs.sug); needReel(o, inp, len); }
    o.load = load; o.need = round(need, 3);
    o.metrics = { speaker: n, device: n, point: n, m: round(len, 3) };
    return o;
  }

  // ====================================================================
  // السنترال
  // ====================================================================
  function pbx(inp) {
    inp = inp || {}; var o = out({}), co = num(inp.co), an = num(inp.analog), ip = num(inp.ip), ext = an + ip, isIP = /IP|VoIP|Hybrid/i.test(inp.type || '');
    o.rows.push(['المستخدمين', fq(num(inp.users)), ''], ['الداخلي (أجهزة)', String(ext), an + ' أنالوج + ' + ip + ' IP'], ['الخطوط الخارجية', String(co), '']);
    if (num(inp.pbxExt) && ext > num(inp.pbxExt)) o.warn.push('الداخلي (' + ext + ') أكبر من سعة السنترال (' + fq(num(inp.pbxExt)) + ').');
    if (num(inp.pbxCo) && co > num(inp.pbxCo)) o.warn.push('الخطوط الخارجية (' + co + ') أكبر من سعة السنترال (' + fq(num(inp.pbxCo)) + ').');
    if (!isIP && ip) o.warn.push('سنترال أنالوج مع تليفونات IP — محتاج سنترال IP/Hybrid أو Gateway.');
    o.sug.push(S('p:pbx', 'سنترال ' + (inp.type || ''), cnt(inp.pbxCount), 'جهاز', 'device', 'سنترال'));
    if (an) o.sug.push(S('p:an', 'تليفون أنالوج', an, 'قطعة', 'device'));
    if (ip) o.sug.push(S('p:ip', 'تليفون IP', ip, 'قطعة', 'device'));
    if (isIP && co && num(inp.fxo)) { var g = ceil(co / num(inp.fxo)); o.rows.push(['FXO Gateways', String(g), '⌈' + co + ' خط ÷ ' + fq(num(inp.fxo)) + '⌉']); o.sug.push(S('p:fxo', 'FXO Gateway ' + fq(num(inp.fxo)) + ' منفذ', g, 'جهاز', 'device')); }
    if (isIP && an && num(inp.fxs)) { var f = ceil(an / num(inp.fxs)); o.rows.push(['FXS Gateways', String(f), '⌈' + an + ' تليفون أنالوج ÷ ' + fq(num(inp.fxs)) + '⌉']); o.sug.push(S('p:fxs', 'FXS Gateway ' + fq(num(inp.fxs)) + ' منفذ', f, 'جهاز', 'device')); }
    if (num(inp.gsm)) o.sug.push(S('p:gsm', 'GSM Gateway', num(inp.gsm), 'جهاز', 'device'));
    var len = num(inp.len) * ext;
    if (len) { var cs = cableSug('p:cable', ip && !an ? 'كابل شبكة' : 'كابل تليفون', len, inp); o.rows = o.rows.concat(cableRows('الكابل', cs.calc, inp)); o.sug.push(cs.sug); needReel(o, inp, len); }
    o.metrics = { device: ext, point: ext, m: round(len, 3) };
    return o;
  }

  // ====================================================================
  // الدش: فردي / أقمار متعددة / متحرك — و حاسبة LNB
  // ====================================================================
  function lnbFor(outs) { return outs <= 1 ? ['Single', 1] : outs <= 2 ? ['Twin', 2] : outs <= 4 ? ['Quad', 4] : outs <= 8 ? ['Octo', 8] : ['Quattro + Multiswitch', 4]; }
  function diseqcFor(sats) { return sats <= 1 ? 0 : sats <= 2 ? 2 : sats <= 4 ? 4 : sats <= 8 ? 8 : 16; }
  function lnb(inp) {
    inp = inp || {}; var o = out({}), outs = num(inp.receivers) * cnt(inp.tuners), sats = cnt(inp.sats), motor = !!inp.motor;
    var t = lnbFor(outs), dq = motor ? 0 : diseqcFor(sats);
    o.rows.push(['المخارج المطلوبة', String(outs), num(inp.receivers) + ' رسيفر × ' + cnt(inp.tuners) + ' تيونر']);
    o.rows.push(['نوع الـ LNB المقترح', t[0] + (outs > 8 ? '' : ' (' + t[1] + ' مخرج)'), outs > 8 ? 'أكتر من 8 مخارج → Quattro + Multiswitch (استخدم حاسبة الدش المركزي)' : 'كل تيونر محتاج مخرج مستقل']);
    var nl = motor ? 1 : sats;
    if (outs > 8) { o.sug.push(S('d:lnbq', 'LNB Quattro ' + (inp.band || 'Ku'), nl, 'قطعة', 'device', 'Quattro LNB')); o.warn.push('أكتر من 8 مخارج: النظام بيبقى Quattro + Multiswitch — كمّل في حاسبة الدش المركزي.'); }
    else if (outs) o.sug.push(S('d:lnb', 'LNB ' + t[0] + ' ' + (inp.band || 'Ku'), nl, 'قطعة', 'device', t[0] + ' LNB'));
    if (dq && outs <= 8) { o.rows.push(['DiSEqC', outs + ' × ' + dq + 'x1', 'سويتش لكل تيونر (' + sats + ' قمر)']); o.sug.push(S('d:dq', 'DiSEqC ' + dq + 'x1', outs, 'قطعة', 'device', 'DiSEqC Switch')); if (sats > 8) o.warn.push('أكتر من 8 أقمار: راجع توفر DiSEqC 16x1 ونوع الرسيفر.'); }
    if (motor && outs > 1) o.warn.push('مع الموتور: كل الرسيفرات بتشوف القمر اللي الطبق واقف عليه — الرسيفر اللي بيتحكم في الموتور هو اللي بيحدد.');
    o.outs = outs; o.lnbType = t[0]; o.diseqc = dq;
    return o;
  }
  function dish(inp) {
    inp = inp || {}; var o = lnb(inp), rec = num(inp.receivers), outs = o.outs, sats = cnt(inp.sats), motor = !!inp.motor, dishes = has(inp.dishes) ? num(inp.dishes) : (motor ? 1 : 1);
    o.rows.unshift(['الأطباق', dishes + ' طبق' + (num(inp.size) ? ' ' + fq(num(inp.size)) + ' سم' : '') + ' ' + (inp.band || ''), motor ? 'متحرك' : sats > 1 ? sats + ' قمر (Multifeed أو أطباق)' : 'ثابت']);
    o.sug.unshift(S('d:dish', 'طبق دش ' + (num(inp.size) ? fq(num(inp.size)) + ' سم ' : '') + (inp.dtype || '') + ' ' + (inp.band || ''), dishes, 'قطعة', 'device', 'طبق دش'));
    o.sug.push(S('d:mount', 'حامل / قاعدة طبق', dishes, 'قطعة', 'acc', 'Dish Mount'));
    if (motor) { o.sug.push(S('d:motor', 'موتور DiSEqC', 1, 'قطعة', 'device', 'DiSEqC Motor')); if (inp.positioner) o.sug.push(S('d:pos', 'Positioner', 1, 'قطعة', 'device')); }
    if (rec) o.sug.push(S('d:rcv', 'رسيفر ' + (inp.rcvType || ''), rec, 'جهاز', 'device', 'رسيفر'));
    var lines = num(inp.len) * outs, jumpers = o.diseqc && outs <= 8 ? outs * sats : 0, jl = jumpers * num(inp.jumper), m = lines + jl;
    if (jumpers && !num(inp.jumper)) o.warn.push('اكتب طول الوصلة بين الـ LNB والـ DiSEqC (متر).');
    if (m) { var cs = cableSug('d:rg6', 'كابل RG6', m, inp); o.rows = o.rows.concat(cableRows('RG6', cs.calc, inp)); o.sug.push(cs.sug); needReel(o, inp, m); }
    var fc = outs * 2 + jumpers * 2; if (fc) o.sug.push(S('d:f', 'F Connector', fc, 'قطعة', 'acc'));
    if (rec && inp.outlets) o.sug.push(S('d:out', 'مخرج تلفزيون (TV Outlet)', rec, 'قطعة', 'acc'));
    o.metrics = { tvpoint: rec, point: rec, device: dishes + rec, m: round(m, 3) };
    return o;
  }

  // ====================================================================
  // الدش المركزي (Multiswitch)
  // ====================================================================
  function central(inp) {
    inp = inp || {}; var o = out({}), fl = num(inp.floors), ap = num(inp.apts), ppa = cnt(inp.ppa), extra = sum(arr(inp.extra), function (x) { return num(x.points); });
    var perFloor = ap * ppa, points = fl * perFloor + extra, sats = cnt(inp.sats), terr = inp.terr ? 1 : 0, trunks = sats * 4 + terr, msOut = num(inp.msOut);
    o.rows.push(['نقاط التلفزيون', String(points), fl + ' دور × ' + ap + ' شقة × ' + ppa + ' نقطة' + (extra ? ' + ' + extra + ' إضافية' : '')], ['خطوط الـ Trunk', String(trunks), sats + ' قمر × 4 (Quattro)' + (terr ? ' + أرضي' : '')]);
    if (msOut && msOut < 4) o.warn.push('مخارج الملتي سويتش قليلة — راجع الموديل.');
    var ms = 0, riser = 0, horiz = num(inp.horiz) * points, rh = num(inp.riserH), jl = num(inp.jumper), jumpers = 0;
    if (!msOut) o.warn.push('اكتب عدد مخارج الملتي سويتش (حسب الموديل) علشان نحسب العدد.');
    else if (inp.topo === 'central') {
      ms = ceil(points / msOut);
      riser = points * rh * (fl + 1) / 2;
      jumpers = trunks * Math.max(ms - 1, 0);
      o.rows.push(['ملتي سويتش (مكان واحد)', ms + ' × ' + trunks + '/' + fq(msOut), '⌈' + points + ' ÷ ' + fq(msOut) + '⌉ متوصلين كاسكيد']);
      if (rh) o.rows.push(['كابلات النقاط الرأسية', fq(round(riser, 1)) + ' م', points + ' نقطة × متوسط ارتفاع (' + fq(fl) + ' + 1) ÷ 2 × ' + fq(rh) + ' م']);
    } else {
      var per = ceil(perFloor / msOut);
      ms = per * fl + (extra ? ceil(extra / msOut) : 0);
      riser = trunks * (fl * rh + num(inp.riserExtra));
      jumpers = trunks * Math.max(per - 1, 0) * fl;
      o.rows.push(['ملتي سويتش لكل دور', per + ' (إجمالي ' + ms + ')', '⌈' + perFloor + ' نقطة ÷ ' + fq(msOut) + '⌉ × ' + fl + ' دور']);
      if (rh) o.rows.push(['الـ Trunk الرأسي', fq(round(riser, 1)) + ' م', trunks + ' خط × (' + fl + ' × ' + fq(rh) + (num(inp.riserExtra) ? ' + ' + fq(num(inp.riserExtra)) : '') + ') م']);
    }
    if (ms && !rh) o.warn.push('اكتب ارتفاع الدور (متر) علشان نحسب الكابلات الرأسية.');
    var dishes = has(inp.dishes) ? num(inp.dishes) : sats;
    o.sug.push(S('c:dish', 'طبق دش ' + (num(inp.size) ? fq(num(inp.size)) + ' سم' : ''), dishes, 'قطعة', 'device', 'طبق دش'), S('c:mount', 'حامل / قاعدة طبق', dishes, 'قطعة', 'acc', 'Dish Mount'),
      S('c:lnb', 'LNB Quattro', sats, 'قطعة', 'device', 'Quattro LNB'));
    if (ms) o.sug.push(S('c:ms', 'Multiswitch ' + trunks + '/' + fq(msOut), ms, 'قطعة', 'device', 'Multiswitch'));
    var amps = num(inp.ampEvery) ? ceil(fl / num(inp.ampEvery)) : num(inp.amps);
    if (amps) { o.sug.push(S('c:amp', 'مكبر خطوط (Line Amplifier) ' + trunks + ' خط', amps, 'قطعة', 'device', 'Amplifier')); o.rows.push(['المكبرات', String(amps), num(inp.ampEvery) ? '⌈' + fl + ' ÷ ' + fq(num(inp.ampEvery)) + ' دور⌉' : 'اللي كتبته']); }
    if (num(inp.psu)) o.sug.push(S('c:psu', 'باور سبلاي ملتي سويتش', num(inp.psu), 'قطعة', 'device'));
    if (ms) o.sug.push(S('c:term', 'Terminator 75 أوم', trunks, 'قطعة', 'acc'));
    var trunkM = (inp.topo === 'central' ? 0 : riser) + jumpers * jl, pointM = horiz + (inp.topo === 'central' ? riser : 0);
    if (jumpers && !jl) o.warn.push('اكتب طول وصلة الكاسكيد بين الملتي سويتشات.');
    var trunkCable = inp.trunkCable || 'RG6';
    if (trunkM) { var ct = cableSug('c:trunk', 'كابل ' + trunkCable + ' (Trunk)', trunkM, { waste: inp.waste, reel: trunkCable === 'RG11' ? inp.reel11 : inp.reel }); o.rows = o.rows.concat(cableRows(trunkCable + ' Trunk', ct.calc, { waste: inp.waste, reel: trunkCable === 'RG11' ? inp.reel11 : inp.reel })); o.sug.push(ct.sug); }
    if (pointM) { var cp = cableSug('c:rg6', 'كابل RG6 (للنقاط)', pointM, inp); o.rows = o.rows.concat(cableRows('RG6 للنقاط', cp.calc, inp)); o.sug.push(cp.sug); needReel(o, inp, pointM); }
    var fc = points * 2 + trunks * 2 * (ms || 0) + sats * 4;
    o.sug.push(S('c:f', 'F Connector', fc, 'قطعة', 'acc'), S('c:out', 'مخرج تلفزيون (TV Outlet)', points, 'قطعة', 'acc'));
    o.rows.push(['F Connectors', String(fc), points + ' نقطة × 2 + ' + trunks + ' خط × 2 × ' + (ms || 0) + ' ملتي سويتش + ' + sats + ' LNB × 4']);
    o.warn.push('حساب كميات بس — مستوى الإشارة وتوهين الكابلات والمكبرات محتاج بيانات المصنع وقياس فعلي. عدّل الكميات قبل الاعتماد.');
    o.points = points; o.ms = ms; o.trunks = trunks;
    o.metrics = { tvpoint: points, point: points, device: ms + sats + amps, m: round(trunkM + pointM, 3) };
    return o;
  }

  // ====================================================================
  // MATV / SMATV (Headend + توزيع RF بالـ Taps) + فقد الإشارة لو البيانات موجودة
  // ====================================================================
  function matv(inp) {
    inp = inp || {}; var o = out({}), ch = num(inp.channels), outlets = num(inp.outlets), smatv = inp.sys !== 'matv';
    if (ch) {
      var per = cnt(inp.perMod), mods = ceil(ch / per);
      o.rows.push(['القنوات', String(ch), smatv ? 'من الأقمار' : 'أرضي'], ['Modulators / Transmodulators', String(mods), '⌈' + ch + ' ÷ ' + per + ' قناة للجهاز⌉']);
      o.sug.push(S('m:mod', (smatv ? 'Transmodulator / Modulator' : 'Modulator') + (per > 1 ? ' ' + per + ' قناة' : ''), mods, 'جهاز', 'device', 'Modulator'));
      if (smatv && inp.rcvPerCh) o.sug.push(S('m:rcv', 'رسيفر Headend', ch, 'جهاز', 'device', 'رسيفر'));
      if (mods > 1) o.sug.push(S('m:comb', 'Combiner / Multiplexer', 1, 'جهاز', 'device', 'Multiplexer'));
      o.sug.push(S('m:amp', 'مكبر Headend', cnt(inp.amps), 'جهاز', 'device', 'Amplifier'));
    }
    if (outlets) {
      var to = num(inp.tapOut);
      if (to) { var taps = ceil(outlets / to); o.rows.push(['Taps', String(taps), '⌈' + outlets + ' مخرج ÷ ' + fq(to) + ' مخرج للـ Tap⌉']); o.sug.push(S('m:tap', 'Tap ' + fq(to) + ' مخرج', taps, 'قطعة', 'device', 'Tap')); }
      else o.warn.push('اكتب عدد مخارج الـ Tap.');
      var br = num(inp.branches), sw = num(inp.splWays);
      if (br > 1 && sw > 1) { var sp = ceil((br - 1) / (sw - 1)); o.sug.push(S('m:spl', 'Splitter ' + fq(sw) + ' طريق', sp, 'قطعة', 'device', 'Splitter')); o.rows.push(['Splitters', String(sp), '⌈(' + br + ' فرع − 1) ÷ (' + fq(sw) + ' − 1)⌉']); }
      if (br) o.sug.push(S('m:term', 'Terminator 75 أوم', br, 'قطعة', 'acc'));
      o.sug.push(S('m:out', 'مخرج تلفزيون (TV Outlet)', outlets, 'قطعة', 'acc'), S('m:f', 'F Connector', outlets * 2 + (to ? ceil(outlets / to) * 2 : 0) + br * 2, 'قطعة', 'acc'));
      var m = num(inp.trunk) + outlets * num(inp.drop);
      if (m) { var cs = cableSug('m:cable', 'كابل كواكس', m, inp); o.rows = o.rows.concat(cableRows('الكابل', cs.calc, inp)); o.sug.push(cs.sug); needReel(o, inp, m); }
    }
    var L = inp.loss || {}, keys = ['out', 'cable', 'run', 'tapIns', 'tapOff', 'taps', 'min'];
    if (keys.every(function (k) { return has(L[k]); })) {
      var lv = num(L.out) - num(L.spl) - num(L.run) * num(L.cable) / 100 - num(L.tapIns) * Math.max(num(L.taps) - 1, 0) - num(L.tapOff);
      o.rows.push(['مستوى أبعد مخرج (تقدير)', fq(round(lv, 1)) + ' dBµV', fq(num(L.out)) + (num(L.spl) ? ' − ' + fq(num(L.spl)) + ' Splitter' : '') + ' − ' + fq(num(L.run)) + ' م × ' + fq(num(L.cable)) + '/100 − ' + fq(num(L.tapIns)) + ' × ' + Math.max(num(L.taps) - 1, 0) + ' Tap − ' + fq(num(L.tapOff)) + ' Tap-off']);
      if (lv < num(L.min)) o.warn.push('المستوى المتوقع (' + fq(round(lv, 1)) + ') أقل من الحد الأدنى (' + fq(num(L.min)) + ' dBµV) — محتاج مكبر أو تقسيم تاني.');
      o.level = round(lv, 3);
    } else o.warn.push('حساب فقد الإشارة اختياري ومحتاج بيانات المصنع (خرج الهيد إند، فقد الكابل/100م، فقد الـ Tap) — من غيرها بنحسب الكميات بس.');
    o.metrics = { tvpoint: outlets, point: outlets, device: ch ? ceil(ch / cnt(inp.perMod)) : 0 };
    return o;
  }

  // ---------------- مخارج التلفزيون ----------------
  function tvout(inp) {
    inp = inp || {}; var o = out({}), n = 0;
    arr(inp.rooms).forEach(function (r, i) { var c = num(r.outlets); if (!c) return; n += c; o.rows.push([(r.name || 'غرفة ' + (i + 1)), c + ' مخرج', r.type === 'through' ? 'مخرج عبور (Loop-through)' : 'مخرج نهاية']); });
    o.rows.push(['إجمالي المخارج', String(n), '']);
    var w = num(inp.ways), sp = w && inp.star ? ceil(n / w) : 0;
    o.sug.push(S('t:out', 'مخرج تلفزيون (TV Outlet)', n, 'قطعة', 'acc'), S('t:box', 'علبة', inp.boxes ? n : 0, 'قطعة', 'acc'), S('t:f', 'F Connector', n * 2 + sp * (w + 1), 'قطعة', 'acc'));
    if (sp) { o.sug.push(S('t:spl', 'Splitter ' + fq(w) + ' طريق', sp, 'قطعة', 'device', 'Splitter')); o.rows.push(['Splitters', String(sp), '⌈' + n + ' ÷ ' + fq(w) + '⌉']); }
    var m = n * num(inp.len);
    if (m) { var cs = cableSug('t:rg6', 'كابل RG6', m, inp); o.rows = o.rows.concat(cableRows('RG6', cs.calc, inp)); o.sug.push(cs.sug); needReel(o, inp, m); }
    o.metrics = { tvpoint: n, point: n, m: round(m, 3) };
    return o;
  }

  // ---------------- كابلات الدش ----------------
  function dishcable(inp) {
    inp = inp || {}; var o = out({}), p = num(inp.points), ex = num(inp.extra);
    var hz = p * (num(inp.horiz) + 2 * ex), jm = num(inp.jumpers) * num(inp.jumperLen), rv = num(inp.risers) * num(inp.riserLen), rt = inp.riserType || 'RG6';
    o.rows.push(['الأفقي (النقاط)', fq(round(hz, 2)) + ' م', p + ' نقطة × (' + fq(num(inp.horiz)) + (ex ? ' + 2 × ' + fq(ex) : '') + ')'], ['الوصلات', fq(round(jm, 2)) + ' م', num(inp.jumpers) + ' × ' + fq(num(inp.jumperLen))], ['الرأسي', fq(round(rv, 2)) + ' م', num(inp.risers) + ' × ' + fq(num(inp.riserLen)) + ' — ' + rt]);
    var rg6 = hz + jm + (rt === 'RG6' ? rv : 0), rg11 = rt === 'RG11' ? rv : 0;
    if (rg6) { var a = cableSug('dc:rg6', 'كابل RG6', rg6, { waste: inp.waste, reel: inp.reel }); o.rows = o.rows.concat(cableRows('إجمالي RG6', a.calc, { waste: inp.waste, reel: inp.reel })); o.sug.push(a.sug); needReel(o, { reel: inp.reel }, rg6); }
    if (rg11) { var b = cableSug('dc:rg11', 'كابل RG11', rg11, { waste: inp.waste, reel: inp.reel11 }); o.rows = o.rows.concat(cableRows('إجمالي RG11', b.calc, { waste: inp.waste, reel: inp.reel11 })); o.sug.push(b.sug); }
    var w = num(inp.ways), spl = w ? ceil(p / w) * (inp.useSpl ? 1 : 0) : 0, fc = (p + num(inp.jumpers) + num(inp.risers)) * 2 + spl * (w + 1);
    o.sug.push(S('dc:f', 'F Connector', fc, 'قطعة', 'acc'), S('dc:out', 'مخرج تلفزيون (TV Outlet)', p, 'قطعة', 'acc'));
    if (spl) o.sug.push(S('dc:spl', 'Splitter ' + fq(w) + ' طريق', spl, 'قطعة', 'device', 'Splitter'));
    if (num(inp.joints)) o.sug.push(S('dc:j', 'وصلة كابل (Coupler)', num(inp.joints), 'قطعة', 'acc'));
    o.rows.push(['F Connectors', String(fc), '2 لكل طرف كابل' + (spl ? ' + منافذ الـ Splitters' : '')]);
    o.metrics = { tvpoint: p, point: p, m: round(rg6 + rg11, 3) };
    return o;
  }

  // ---------------- تكلفة نقطة التلفزيون ----------------
  var TVP = { single: ['cable', 'pipe', 'box', 'outlet', 'conn', 'fix'], central: ['cable', 'pipe', 'box', 'outlet', 'conn', 'fix'], extra: ['cable', 'pipe', 'box', 'outlet', 'conn', 'fix'], found: ['pipe', 'box', 'fix'], install: ['cable', 'outlet', 'conn'], maint: [] };
  var TVP_NAME = { cable: ['كابل RG6', 'متر'], pipe: ['ماسورة', 'متر'], box: ['علبة', 'قطعة'], outlet: ['مخرج تلفزيون (TV Outlet)', 'قطعة'], conn: ['F Connector', 'قطعة'], fix: ['مستلزمات تثبيت', 'طقم'] };
  function tvpoint(inp) {
    inp = inp || {}; var o = out({}), n = num(inp.points), use = TVP[inp.ptype] || TVP.single, pp = inp.pp || {};
    use.forEach(function (k) { var q = num(pp[k]); if (q && n) o.sug.push(S('tp:' + k, TVP_NAME[k][0], q * n, TVP_NAME[k][1], k === 'cable' ? 'cable' : 'acc')); });
    o.rows.push(['عدد النقاط', String(n), ''], ['مكونات النقطة', use.map(function (k) { return TVP_NAME[k][0] + (num(pp[k]) ? ' ' + fq(num(pp[k])) : ''); }).join('، ') || 'مصنعية بس', 'الكمية لكل نقطة × عدد النقاط']);
    o.metrics = { tvpoint: n, point: n };
    o.perPoint = n;
    return o;
  }

  // ====================================================================
  // الإنذار ضد السرقة
  // ====================================================================
  var AL_SENS = [['pir', 'حساس حركة PIR'], ['mc', 'Magnetic Contact'], ['glass', 'Glass Break'], ['outdoor', 'حساس خارجي'], ['panic', 'زر طوارئ']];
  function alarm(inp) {
    inp = inp || {}; var o = out({}), T = {}, sensors = 0, wl = inp.type === 'wireless';
    AL_SENS.forEach(function (s) { T[s[0]] = 0; });
    arr(inp.zones).forEach(function (z, i) { var n = 0; AL_SENS.forEach(function (s) { var v = num(z[s[0]]); T[s[0]] += v; n += v; }); if (n) { sensors += n; o.rows.push([z.name || 'منطقة ' + (i + 1), n + ' حساس', '']); } });
    AL_SENS.forEach(function (s) { if (T[s[0]]) o.sug.push(S('al:' + s[0], s[1] + (wl ? ' لاسلكي' : ''), T[s[0]], 'قطعة', 'device', s[1])); });
    var zonesUsed = inp.zoneMode === 'row' ? arr(inp.zones).length : sensors, pz = num(inp.panelZones);
    o.rows.push(['الحساسات', String(sensors), ''], ['الزونات المستخدمة', String(zonesUsed), inp.zoneMode === 'row' ? 'زون لكل منطقة' : 'زون لكل حساس']);
    var panels = 0;
    if (pz) { panels = ceil(zonesUsed / pz); o.rows.push(['اللوحات', String(panels), '⌈' + zonesUsed + ' ÷ ' + fq(pz) + ' زون⌉']); o.sug.push(S('al:panel', 'لوحة إنذار ' + fq(pz) + ' زون', panels, 'جهاز', 'device', 'Alarm Panel')); }
    else if (sensors) o.warn.push('اكتب عدد زونات اللوحة علشان نحسب عدد اللوحات.');
    [['keypads', 'كيباد'], ['sirenIn', 'سارينة داخلية'], ['sirenOut', 'سارينة خارجية'], ['remotes', 'ريموت'], ['gsm', 'GSM Module'], ['ipm', 'IP Module']].forEach(function (p) { if (num(inp[p[0]])) o.sug.push(S('al:' + p[0], p[1], num(inp[p[0]]), 'قطعة', 'device')); });
    var bat = has(inp.batteries) ? num(inp.batteries) : panels; if (bat) o.sug.push(S('al:bat', 'بطارية', bat, 'قطعة', 'acc'));
    if (wl && sensors) o.warn.push('الحساسات اللاسلكية بتشتغل ببطاريات — راجع نوع البطارية ومدى الإشارة للوحة.');
    var len = wl ? 0 : (sensors + num(inp.sirenIn) + num(inp.sirenOut) + num(inp.keypads)) * num(inp.len);
    if (len) { var cs = cableSug('al:cable', 'كابل إنذار', len, inp); o.rows = o.rows.concat(cableRows('الكابل', cs.calc, inp)); o.sug.push(cs.sug); needReel(o, inp, len); }
    o.metrics = { device: sensors + panels, point: sensors, m: round(len, 3) };
    return o;
  }

  // ---------------- البوابات ----------------
  var GATE_C = [['motor', 'موتور'], ['ctrl', 'وحدة تحكم'], ['readers', 'قارئ'], ['loops', 'Loop Detector'], ['photo', 'حساس (فوتوسل)'], ['remotes', 'ريموت']];
  function gates(inp) {
    inp = inp || {}; var o = out({}), T = {}, n = 0, len = 0, units = [];
    arr(inp.gates).forEach(function (g, i) {
      var c = cnt(g.count); if (!c) return; n += c; var comps = {};
      T['g:gate:' + (g.type || 'بوابة')] = (T['g:gate:' + (g.type || 'بوابة')] || 0) + c; comps['g:gate:' + (g.type || 'بوابة')] = 1;
      GATE_C.forEach(function (p) { var v = num(g[p[0]]); if (v) { T['g:' + p[0]] = (T['g:' + p[0]] || 0) + v * c; comps['g:' + p[0]] = v; } });
      len += num(g.len) * c; if (num(g.len)) comps['g:cable'] = num(g.len);
      units.push({ name: g.name || g.type || ('بوابة ' + (i + 1)), count: c, comps: comps });
      o.rows.push([(g.name || g.type || 'بوابة ' + (i + 1)) + ' × ' + c, (g.reader ? g.reader + ' · ' : '') + (num(g.len) ? fq(num(g.len)) + ' م كابل' : ''), '']);
    });
    Object.keys(T).forEach(function (k) { var p = k.split(':'); var nm = p[1] === 'gate' ? p[2] : (GATE_C.find(function (x) { return x[0] === p[1]; }) || [0, p[1]])[1]; o.sug.push(S(k, nm, T[k], 'قطعة', 'device', nm)); });
    if (len) { var cs = cableSug('g:cable', 'كابل بوابات', len, inp); o.rows = o.rows.concat(cableRows('الكابل', cs.calc, inp)); o.sug.push(cs.sug); }
    o.units = units; o.metrics = { device: n, point: n, door: n, m: round(len, 3) };
    return o;
  }

  // ---------------- سمارت هوم ----------------
  var SM = [['switches', 'مفتاح ذكي'], ['lights', 'وحدة إضاءة'], ['plugs', 'بريزة ذكية'], ['sensors', 'حساس'], ['curtains', 'موتور ستارة'], ['locks', 'قفل ذكي'], ['ir', 'IR Controller'], ['thermo', 'ثرموستات']];
  function smart(inp) {
    inp = inp || {}; var o = out({}), T = {}, dev = 0, proto = inp.protocol || 'Zigbee';
    SM.forEach(function (s) { T[s[0]] = 0; });
    arr(inp.rooms).forEach(function (r, i) { var n = 0; SM.forEach(function (s) { var v = num(r[s[0]]); T[s[0]] += v; n += v; }); if (n) { dev += n; o.rows.push([r.name || 'غرفة ' + (i + 1), n + ' جهاز', '']); } });
    SM.forEach(function (s) { if (T[s[0]]) o.sug.push(S('sh:' + s[0], s[1] + ' ' + proto, T[s[0]], 'قطعة', 'device', s[1])); });
    o.rows.push(['إجمالي الأجهزة', String(dev), proto], ['نقاط التحكم', String(T.switches + T.ir + T.thermo), 'مفاتيح + IR + ثرموستات']);
    var cap = num(inp.hubCap);
    if (/Zigbee|Z-Wave|Bluetooth/i.test(proto) && dev) {
      var hubs = has(inp.hubs) ? num(inp.hubs) : cap ? ceil(dev / cap) : 1;
      o.rows.push(['Hub / Gateway', String(hubs), cap ? '⌈' + dev + ' ÷ ' + fq(cap) + ' جهاز للـ Hub⌉' : 'واحد على الأقل — اكتب سعة الـ Hub من الكتالوج']);
      o.sug.push(S('sh:hub', 'Smart Hub ' + proto, hubs, 'جهاز', 'device', 'Smart Hub'));
    }
    if (/Wi-?Fi/i.test(proto) && dev) o.warn.push('أجهزة Wi-Fi بتتوصل على الراوتر — راجع عدد الأجهزة اللي الراوتر بيستحملها وتغطية الشبكة.');
    if (proto === 'KNX' && dev) {
      var lc = num(inp.lineCap), lines = lc ? ceil(dev / lc) : 1;
      o.rows.push(['خطوط KNX', String(lines), lc ? '⌈' + dev + ' ÷ ' + fq(lc) + ' جهاز في الخط⌉' : 'اكتب عدد الأجهزة في الخط من مواصفات النظام']);
      o.sug.push(S('sh:knxpsu', 'KNX Power Supply', lines, 'قطعة', 'device'), S('sh:knxip', 'KNX IP Interface', 1, 'قطعة', 'device'));
    }
    var len = (proto === 'KNX' || inp.wired) ? dev * num(inp.len) : 0;
    if (len) { var cs = cableSug('sh:cable', proto === 'KNX' ? 'كابل KNX Bus' : 'كابل تحكم', len, inp); o.rows = o.rows.concat(cableRows('الكابل', cs.calc, inp)); o.sug.push(cs.sug); }
    o.metrics = { device: dev, point: T.switches + T.ir + T.thermo, m: round(len, 3) };
    return o;
  }

  // ---------------- BMS ----------------
  function bms(inp) {
    inp = inp || {}; var o = out({}), T = { DI: 0, DO: 0, AI: 0, AO: 0 }, tot = 0;
    arr(inp.pts).forEach(function (p, i) { var c = num(p.count); if (!c) return; var t = T[p.type] != null ? p.type : 'DI'; T[t] += c; tot += c; o.rows.push([p.name || 'نقطة ' + (i + 1), c + ' ' + t, '']); });
    o.rows.push(['النقاط', String(tot), 'DI ' + T.DI + ' · DO ' + T.DO + ' · AI ' + T.AI + ' · AO ' + T.AO]);
    var cap = num(inp.ctrlCap);
    if (cap && tot) { var c = ceil(tot / cap); o.rows.push(['Controllers (DDC)', String(c), '⌈' + tot + ' ÷ ' + fq(cap) + ' نقطة⌉ — من غير توزيع الأنواع']); o.sug.push(S('b:ddc', 'DDC Controller ' + fq(cap) + ' نقطة', c, 'جهاز', 'device', 'DDC Controller')); }
    else if (tot) o.warn.push('اكتب عدد النقاط اللي الكنترولر الواحد بيستحملها.');
    [['sensors', 'حساس'], ['gateways', 'Gateway'], ['panels', 'لوحة تحكم'], ['modules', 'Module']].forEach(function (p) { if (num(inp[p[0]])) o.sug.push(S('b:' + p[0], p[1], num(inp[p[0]]), 'قطعة', 'device')); });
    var len = tot * num(inp.len);
    if (len) { var cs = cableSug('b:cable', 'كابل اتصالات/تحكم', len, inp); o.rows = o.rows.concat(cableRows('الكابل', cs.calc, inp)); o.sug.push(cs.sug); }
    o.warn.push('حصر أجهزة وتكاليف بس — مش تصميم هندسي ولا مخطط تحكم معتمد.');
    o.metrics = { point: tot, device: tot, m: round(len, 3) };
    return o;
  }

  // ---------------- الحضور والانصراف ----------------
  function attendance(inp) {
    inp = inp || {}; var o = out({}), d = num(inp.devices), u = num(inp.users), cap = num(inp.cap);
    o.rows.push(['الأجهزة', String(d), ''], ['المستخدمين (تقديري)', String(u), '']);
    if (cap && u > d * cap) o.warn.push('المستخدمين (' + u + ') أكتر من سعة الأجهزة (' + d + ' × ' + fq(cap) + ').');
    if (d) o.sug.push(S('at:dev', 'جهاز حضور وانصراف ' + (inp.tech || ''), d, 'جهاز', 'device', 'Attendance Device'));
    if (num(inp.doors)) o.sug.push(S('at:lock', 'قفل باب (ربط Access)', num(inp.doors), 'قطعة', 'device'));
    if (inp.psu && d) o.sug.push(S('at:psu', 'باور سبلاي', d, 'قطعة', 'device'));
    if (num(inp.licenses)) o.sug.push(S('at:lic', 'رخصة برنامج', num(inp.licenses), 'رخصة', 'device'));
    var len = d * num(inp.len);
    if (len) { var cs = cableSug('at:cable', 'كابل شبكة', len, inp); o.rows = o.rows.concat(cableRows('الكابل', cs.calc, inp)); o.sug.push(cs.sug); o.sug.push(S('at:rj', 'RJ45', d * 2, 'قطعة', 'acc')); }
    o.metrics = { device: d, point: d, netpoint: d, m: round(len, 3) };
    return o;
  }

  // ---------------- نداء التمريض ----------------
  function nurse(inp) {
    inp = inp || {}; var o = out({}), rooms = num(inp.rooms), beds = rooms * cnt(inp.beds), baths = rooms * num(inp.baths);
    o.rows.push(['الغرف / الأسرة', rooms + ' / ' + beds, rooms + ' × ' + cnt(inp.beds) + ' سرير'], ['شد الحمامات', String(baths), rooms + ' × ' + num(inp.baths)]);
    o.sug.push(S('n:pat', 'Patient Station', beds, 'قطعة', 'device'), S('n:pull', 'Bathroom Pull Cord', baths, 'قطعة', 'device'), S('n:light', 'Corridor Light', inp.corridor === false ? 0 : rooms, 'قطعة', 'device'));
    [['masters', 'Master Station'], ['displays', 'Display Unit']].forEach(function (p) { if (num(inp[p[0]])) o.sug.push(S('n:' + p[0], p[1], num(inp[p[0]]), 'قطعة', 'device')); });
    var cap = num(inp.ctrlCap), st = beds + baths;
    if (cap && st) o.sug.push(S('n:ctrl', 'Controller نداء تمريض', ceil(st / cap), 'جهاز', 'device'));
    var len = rooms * num(inp.len);
    if (len) { var cs = cableSug('n:cable', 'كابل نداء تمريض', len, inp); o.rows = o.rows.concat(cableRows('الكابل', cs.calc, inp)); o.sug.push(cs.sug); }
    o.warn.push('حصر كميات بس — تصميم نظام نداء التمريض وتوافقه مع متطلبات المنشأة مسؤولية فنية متخصصة.');
    o.metrics = { device: st + rooms, point: st, m: round(len, 3) };
    return o;
  }

  // ---------------- IPTV ----------------
  function iptv(inp) {
    inp = inp || {}; var o = out({}), sc = num(inp.screens), ch = num(inp.channels), br = num(inp.br);
    if (br) {
      o.rows.push(['باندويث القنوات (Multicast)', fq(round(ch * br, 2)) + ' Mbps', ch + ' قناة × ' + fq(br) + ' Mbps']);
      o.rows.push(['أسوأ حالة لو Unicast', fq(round(sc * br, 2)) + ' Mbps', sc + ' شاشة × ' + fq(br)]);
    } else if (ch) o.warn.push('اكتب Bitrate القناة (Mbps) علشان نقدّر الباندويث.');
    var pe = num(inp.perEnc), enc = pe && ch ? ceil(ch / pe) : 0;
    if (enc) { o.rows.push(['Encoders', String(enc), '⌈' + ch + ' ÷ ' + fq(pe) + '⌉']); o.sug.push(S('ip:enc', 'IPTV Encoder ' + fq(pe) + ' قناة', enc, 'جهاز', 'device', 'Encoder')); }
    else if (ch) o.warn.push('اكتب عدد القنوات لكل Encoder.');
    if (inp.stb && sc) o.sug.push(S('ip:stb', 'IPTV Receiver / STB', sc, 'جهاز', 'device', 'رسيفر IPTV'));
    if (num(inp.servers)) o.sug.push(S('ip:srv', 'IPTV Server / Middleware', num(inp.servers), 'جهاز', 'device'));
    if (num(inp.licenses)) o.sug.push(S('ip:lic', 'رخصة IPTV', num(inp.licenses), 'رخصة', 'device'));
    var ports = sc + enc + num(inp.servers);
    o.rows.push(['منافذ السويتش المطلوبة', String(ports), sc + ' شاشة + ' + enc + ' Encoder + ' + num(inp.servers) + ' سيرفر']);
    var len = sc * num(inp.len);
    if (len) { var cs = cableSug('ip:cable', 'كابل شبكة', len, inp); o.rows = o.rows.concat(cableRows('الكابل', cs.calc, inp)); o.sug.push(cs.sug); }
    if (inp.multicast !== false) o.warn.push('IPTV على الشبكة: السويتشات لازم تدعم Multicast (IGMP Snooping) وغالباً VLAN منفصلة.');
    o.metrics = { device: sc + enc, point: sc, netpoint: sc, tvpoint: sc, m: round(len, 3) };
    return o;
  }

  function custom() { return out({}); }

  var KIND_CALC = { cctv: cctv, storage: storage, netpoints: netpoints, cables: cables, poe: poe, fiber: fiber, splice: splice, rack: rack, fire: fire, access: access, intercom: intercom, pa: pa, pbx: pbx,
    dish: dish, central: central, matv: matv, lnb: lnb, tvout: tvout, dishcable: dishcable, tvpoint: tvpoint, alarm: alarm, gates: gates, smart: smart, bms: bms, attendance: attendance, nurse: nurse, iptv: iptv, custom: custom };

  // ====================================================================
  // البند: الأجهزة والخامات + المسارات + المصنعية
  // ====================================================================
  var LABOR = { point: 'بالنقطة', piece: 'بالقطعة', m: 'بالمتر', lm: 'بالمتر الطولي', device: 'بالجهاز', camera: 'بالكاميرا', door: 'بالباب', speaker: 'بالسماعة', netpoint: 'بنقطة الشبكة',
    tvpoint: 'بنقطة التلفزيون', route: 'بالمسار', splice: 'باللحام', hour: 'بالساعة', daily: 'باليومية', lump: 'مقطوعية' };
  var METRIC = { point: 'point', piece: 'device', m: 'm', lm: 'm', device: 'device', camera: 'camera', door: 'door', speaker: 'speaker', netpoint: 'netpoint', tvpoint: 'tvpoint', route: 'route', splice: 'splice' };
  var COUNTABLE = /^(قطعة|جهاز|نقطة|بكرة|علبة|كرتونة|مجموعة|طقم|رخصة)$/;
  function line(l, supply) {
    l = l || {};
    var q = num(l.qty), w = Math.min(num(l.wastePct), 100), wq = q * w / 100, fin = q + wq;
    if (w && COUNTABLE.test(l.unit || 'قطعة')) fin = ceil(fin);
    var r = { name: l.name || '', unit: l.unit || 'قطعة', qty: round(q, 4), waste: round(fin - q, 4), final: round(fin, 4), cost: num(l.cost), price: num(l.price), cat: l.cat || 'device', key: l.auto || '', per: num(l.per) || 1 };
    r.costT = supply ? money(r.final * r.cost) : 0; r.sellT = supply ? money(r.final * r.price) : 0;
    return r;
  }
  function laborLine(l, m) {
    l = l || {}; m = m || {};
    var meth = LABOR[l.method] ? l.method : (l.method || 'lump'), price = num(l.price), r = { name: l.name || '', method: meth, label: LABOR[meth] || String(meth).replace(/^x:/, ''), price: price, auto: false };
    if (meth === 'lump') { r.qty = 1; r.amount = money(price); }
    else if (meth === 'daily') { r.qty = num(l.qty); r.workers = cnt(l.workers); r.amount = money(r.qty * r.workers * price); }
    else {
      if (has(l.qty)) r.qty = num(l.qty); else { r.qty = round(m[METRIC[meth]] || 0, 3); r.auto = !!METRIC[meth]; }
      r.amount = money(r.qty * price);
    }
    return r;
  }
  function item(it) {
    it = it || {};
    var f = KIND_CALC[it.kind] || custom, c = f(it['in'] || {}), supply = it.supply !== false;
    var rt = arr(it.routes).length ? routes(it.routes, it.ctypes) : null;
    var m = Object.assign({}, c.metrics);
    if (rt) { m.route = (m.route || 0) + rt.count; m.m = round((m.m || 0) + rt.after, 3); }
    var lines = arr(it.lines).map(function (l) { return line(l, supply); });
    var labor = arr(it.labor).map(function (l) { return laborLine(l, m); });
    var extras = arr(it.extras).map(function (e) { return { name: (e && e.name) || '', amount: money(num(e && e.amount)) }; });
    var r = { kind: it.kind, calc: c, routes: rt, metrics: m, lines: lines, labor: labor, extras: extras, supply: supply };
    r.linesSell = money(sum(lines, function (x) { return x.sellT; })); r.linesCost = money(sum(lines, function (x) { return x.costT; }));
    r.cableSell = rt && supply ? rt.sell : 0; r.cableCost = rt && supply ? rt.cost : 0;
    r.laborT = money(sum(labor, function (x) { return x.amount; })); r.extrasT = money(sum(extras, function (x) { return x.amount; }));
    r.matSell = money(r.linesSell + r.cableSell); r.matCost = money(r.linesCost + r.cableCost);
    r.total = money(r.matSell + r.laborT + r.extrasT); r.cost = r.matCost; r.profit = money(r.total - r.cost);
    // تكلفة كل وحدة (باب / نقطة / بوابة): مكوناتها × أسعار السطور اللي ليها نفس المفتاح + مصنعية الوحدة
    if (c.units && c.units.length) {
      var byKey = {}; arr(it.lines).forEach(function (l, i) { if (l.auto) byKey[l.auto] = lines[i]; });
      var perUnitLabor = sum(labor, function (x) { return METRIC[x.method] && m[METRIC[x.method]] && ['door', 'netpoint', 'point'].indexOf(METRIC[x.method]) >= 0 ? x.price : 0; });
      r.units = c.units.map(function (u) {
        var cost = 0, sell = 0;
        Object.keys(u.comps).forEach(function (k) { var L = byKey[k]; if (!L || !supply) return; cost += u.comps[k] * L.cost / L.per; sell += u.comps[k] * L.price / L.per; });
        return { name: u.name, count: u.count, cost: money(cost), sell: money(sell + perUnitLabor), costAll: money(cost * u.count), sellAll: money((sell + perUnitLabor) * u.count) };
      });
    }
    var per = m.tvpoint && it.kind === 'tvpoint' ? m.tvpoint : 0;
    if (per) { r.perPoint = { cost: money(r.cost / per), sell: money(r.total / per) }; }
    return r;
  }

  // ---------------- المشروع ----------------
  var COST_TYPES = { mat: 'خامات وأجهزة', labor: 'عمالة ويوميات', transport: 'نقل', expense: 'مصروفات', waste: 'هالك', other: 'مصاريف أخرى' };
  var COST_ORDER = ['mat', 'labor', 'transport', 'expense', 'waste', 'other'];
  function cost(c, matBase) {
    c = c || {};
    var type = COST_TYPES[c.type] ? c.type : 'other', r = { type: type, billed: !!c.billed, qty: num(c.qty), price: num(c.price), wastePct: Math.min(num(c.wastePct), 100) };
    if (c.mode === 'pct') { r.pct = Math.min(num(c.pct), 100); r.base = money(matBase || 0); r.amount = money(r.base * r.pct / 100); }
    else if (c.mode === 'amount') r.amount = money(num(c.amount));
    else r.amount = money(r.qty * r.price);
    r.wasteQty = round(r.qty * r.wastePct / 100, 4); r.wasteCost = money(r.wasteQty * r.price);
    r.total = money(r.amount + r.wasteCost);
    return r;
  }
  function job(j) {
    j = j || {};
    var items = arr(j.items).map(item);
    var itemCost = sum(items, function (x) { return x.cost; });
    var raw = arr(j.costs);
    var matBase = itemCost + sum(raw, function (c) { return c && c.type === 'mat' && c.mode !== 'pct' && c.mode !== 'amount' ? num(c.qty) * num(c.price) : 0; });
    var costs = raw.map(function (c) { return cost(c, matBase); });
    var matSell = money(sum(items, function (x) { return x.matSell; })), laborT = money(sum(items, function (x) { return x.laborT; })), extras = money(sum(items, function (x) { return x.extrasT; }));
    var billedCosts = money(sum(costs, function (c) { return c.billed ? c.total : 0; }));
    var subtotal = money(matSell + laborT + extras + billedCosts);
    var d = j.discount || {};
    var discount = d.type === 'percent' ? money(subtotal * Math.min(num(d.value), 100) / 100) : money(Math.min(num(d.value), subtotal));
    var taxPct = Math.min(num(j.tax && j.tax.pct), 100), tax = money((subtotal - discount) * taxPct / 100);
    var total = money(subtotal - discount + tax), paid = money(sum(arr(j.payments), function (p) { return num(p && p.amount); }));
    var byType = { mat: money(itemCost) };
    COST_ORDER.forEach(function (t) { if (byType[t] == null) byType[t] = 0; });
    costs.forEach(function (c) { byType[c.type] = money(byType[c.type] + c.amount); if (c.wasteCost) byType.waste = money(byType.waste + c.wasteCost); });
    var totalCost = money(itemCost + sum(costs, function (c) { return c.total; }));
    var revenue = money(total - tax);
    var bySys = {}; items.forEach(function (x) { var b = bySys[x.kind] || (bySys[x.kind] = { total: 0, cost: 0, labor: 0, count: 0 }); b.total = money(b.total + x.total); b.cost = money(b.cost + x.cost); b.labor = money(b.labor + x.laborT); b.count++; });
    return { items: items, costs: costs, matSell: matSell, labor: laborT, extras: extras, billedCosts: billedCosts, subtotal: subtotal, discount: discount, taxPct: taxPct, tax: tax, total: total, paid: paid, remaining: money(total - paid),
      byType: byType, totalCost: totalCost, profit: money(revenue - totalCost), margin: revenue > 0 ? round((revenue - totalCost) / revenue * 100, 1) : 0, matBase: money(matBase), bySys: bySys };
  }

  // ---------------- الصيانة والعقود ----------------
  function daysBetween(a, b) { var x = Date.parse(a), y = Date.parse(b); return isFinite(x) && isFinite(y) ? Math.round((y - x) / 86400000) : null; }
  function warranty(rec, today) {
    if (!rec || !rec.wEnd) return { state: 'none', label: 'من غير ضمان' };
    var d = daysBetween(today, rec.wEnd);
    if (d == null) return { state: 'none', label: '' };
    return d < 0 ? { state: 'expired', label: 'الضمان انتهى من ' + (-d) + ' يوم', days: d } : { state: 'active', label: 'ضمان ساري — باقي ' + d + ' يوم', days: d };
  }
  var PERIOD = { monthly: ['شهري', 1], quarterly: ['ربع سنوي', 3], semi: ['نص سنوي', 6], annual: ['سنوي', 12], visits: ['عدد زيارات', 0] };
  function contract(k) {
    k = k || {}; var value = num(k.value), paid = sum(arr(k.payments), function (p) { return num(p && p.amount); });
    var p = PERIOD[k.period] || PERIOD.monthly, months = num(k.months), visits = k.period === 'visits' ? num(k.visits) : (p[1] && months ? Math.floor(months / p[1]) : 0);
    var done = arr(k.done).length;
    return { value: money(value), paid: money(paid), remaining: money(value - paid), visits: visits, done: done, left: Math.max(visits - done, 0), label: p[0] };
  }
  function visit(v) { v = v || {}; return { parts: money(num(v.partsPrice)), partsCost: money(num(v.partsCost)), labor: money(num(v.labor)), total: money(num(v.partsPrice) + num(v.labor)), profit: money(num(v.partsPrice) + num(v.labor) - num(v.partsCost)) }; }

  var api = { LABOR: LABOR, METRIC: METRIC, COST_TYPES: COST_TYPES, COST_ORDER: COST_ORDER, POE: POE, POE_ORDER: POE_ORDER, RACK_U: RACK_U, BR_EST: BR_EST, FIRE_DEV: FIRE_DEV, AL_SENS: AL_SENS, SM: SM, GATE_C: GATE_C, TVP: TVP, TVP_NAME: TVP_NAME, PERIOD: PERIOD,
    ACC_SYS: ACC_SYS, ACC_COMP: ACC_COMP, LOCKS: LOCKS, ANALOG: ANALOG,
    num: num, round: round, money: money, ceil: ceil, routes: routes, routeLen: routeLen, reelCalc: reelCalc, estBitrate: estBitrate, lnbFor: lnbFor, diseqcFor: diseqcFor, stdFor: stdFor,
    cctv: cctv, storage: storage, netpoints: netpoints, poe: poe, fiber: fiber, splice: splice, rack: rack, fire: fire, access: access, intercom: intercom, pa: pa, pbx: pbx, dish: dish, central: central, matv: matv, lnb: lnb,
    tvout: tvout, dishcable: dishcable, tvpoint: tvpoint, alarm: alarm, gates: gates, smart: smart, bms: bms, attendance: attendance, nurse: nurse, iptv: iptv,
    KIND_CALC: KIND_CALC, line: line, laborLine: laborLine, item: item, cost: cost, job: job, warranty: warranty, contract: contract, visit: visit, daysBetween: daysBetween };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.LowCalc = api;
})(typeof window !== 'undefined' ? window : this);
