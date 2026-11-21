/*
 * أرزقي | Arzoqi — شاشة الافتتاح (حركة بالكود، من غير فيديو).
 * لوجو الكلمة الرسمي Arzoqi متقسّم لأجزائه زي ما هو بالظبط (splash/light أو splash/dark: كل حرف، قوس الـ A،
 * القوس اللي تحت، والنقطة)، والكود بيحرّكهم بنفس حركة فيديو الهوية:
 *   الحروف بتطير وتتركّب واحد ورا التاني ← القوس البرتقالي بيترسم ← القوس اللي تحت ← النقطة بتنزل بحلقة وشرار
 *   ← لمعة على الكلمة ← «صنايعي في جيبك» كلمة كلمة.
 * فاتح أو غامق حسب وضع الموبايل (أو اختيار المستخدم). مرة واحدة في كل فتحة للتطبيق، ودوسة بتقفلها.
 * لو "تقليل الحركة" مفعّل: اللوجو بيظهر ثابت على طول.
 * الاستخدام: <script src="../Shared-Assets/brand/splash.js" data-base="../Shared-Assets/brand/"></script>
 */
(function () {
  'use strict';
  var me = document.currentScript;
  var base = (me && me.getAttribute('data-base')) || '../Shared-Assets/brand/';
  var KEY = 'arzaqi_splash_shown';
  var force = /[?&]splash\b/.test(location.search);
  if (!force) {
    try { if (sessionStorage.getItem(KEY)) return; sessionStorage.setItem(KEY, '1'); } catch (e) {}
    if (navigator.webdriver) return; // الاختبارات الآلية
  }

  // أماكن الأجزاء جوه اللوجو الأصلي (بكسل): [x, y, عرض, ارتفاع]
  var GEO = {
    light: { w: 1200, h: 342, p: { A: [41, 11, 341, 234], r: [384, 62, 143, 175], z: [514, 61, 199, 178], o: [707, 61, 209, 182], q: [912, 61, 219, 227], i: [1120, 69, 75, 165], swoosh: [1, 86, 387, 198], arc: [112, 232, 1019, 110], dot: [1122, 0, 76, 70] } },
    dark: { w: 1200, h: 354, p: { A: [38, 13, 338, 243], r: [358, 76, 154, 186], z: [501, 61, 186, 197], o: [652, 67, 255, 197], q: [895, 71, 228, 251], i: [1115, 78, 85, 185], swoosh: [1, 106, 372, 185], arc: [121, 251, 972, 103], dot: [1120, 0, 78, 79] } }
  };
  // الحروف: منين بتيجي (بالنسبة لعرض اللوجو) + لفّتها + بتبدأ امتى (ثانية)
  var FLY = { A: [-0.10, -0.42, -32, 0.30], r: [0.00, 0.55, 26, 0.38], z: [0.06, -0.55, -36, 0.46], o: [0.10, 0.62, 40, 0.54], q: [0.20, 0.50, 28, 0.62], i: [0.28, -0.12, 46, 0.70] };

  var forced = document.documentElement.getAttribute('data-theme');
  var dark = forced ? forced === 'dark' : !!(window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
  var mode = dark ? 'dark' : 'light', G = GEO[mode];
  var reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  var el = document.createElement('div');
  el.className = 'az-splash' + (dark ? ' dark' : '') + (reduce ? ' az-instant' : '');
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', 'Arzoqi — صنايعي في جيبك');
  var stage = document.createElement('div');
  stage.className = 'az-stage';
  stage.style.aspectRatio = G.w + ' / ' + G.h;
  var html = '<i class="az-glow"></i>';
  Object.keys(G.p).forEach(function (k) {
    var b = G.p[k];
    html += '<img class="az-p az-p-' + k + '" alt="" draggable="false" src="' + base + 'splash/' + mode + '/' + k + '.png" style="left:'
      + (b[0] / G.w * 100) + '%;top:' + (b[1] / G.h * 100) + '%;width:' + (b[2] / G.w * 100) + '%;height:' + (b[3] / G.h * 100) + '%">';
  });
  // لمعة بتعدّي على الكلمة كلها (ماسك بشكل اللوجو نفسه)
  html += '<i class="az-shine" style="--az-mask:url(\'' + base + 'arzoqi-wordmark-' + mode + '.png\')"></i>';
  // حلقة وشرار عند النقطة
  var d = G.p.dot, cx = (d[0] + d[2] / 2) / G.w * 100, cy = (d[1] + d[3] / 2) / G.h * 100;
  html += '<i class="az-ring" style="left:' + cx + '%;top:' + cy + '%"></i>';
  for (var n = 0; n < 12; n++) {
    var ang = (n / 12) * Math.PI * 2 + (n % 3) * 0.35, dist = 0.05 + (n % 4) * 0.022;
    html += '<i class="az-spark" style="left:' + cx + '%;top:' + cy + '%;--sx:' + (Math.cos(ang) * dist * 100).toFixed(2) + 'cqw;--sy:' + (Math.sin(ang) * dist * 100).toFixed(2) + 'cqw;--s:' + (3 + (n % 3) * 1.6) + 'px;animation-delay:' + (1.98 + (n % 4) * 0.03).toFixed(2) + 's"></i>';
  }
  stage.innerHTML = html;
  el.appendChild(stage);
  var tag = document.createElement('div');
  tag.className = 'az-tag';
  tag.innerHTML = '<span>صنايعي</span> <span>في</span> <span class="az-or">جيبك</span><i></i>';
  el.appendChild(tag);

  // الحروف بتطير من أماكن مختلفة — المسافة بالنسبة لعرض اللوجو
  function fit() {
    var w = Math.min(window.innerWidth * 0.82, 460, window.innerHeight * 0.9 * G.w / G.h);
    stage.style.width = w + 'px';
    tag.style.fontSize = Math.round(w * 0.088) + 'px';
    Object.keys(FLY).forEach(function (k) {
      var f = FLY[k], img = stage.querySelector('.az-p-' + k);
      img.style.setProperty('--dx', (f[0] * w).toFixed(1) + 'px');
      img.style.setProperty('--dy', (f[1] * w).toFixed(1) + 'px');
      img.style.setProperty('--rot', f[2] + 'deg');
      img.style.animationDelay = f[3] + 's';
    });
  }
  fit(); window.addEventListener('resize', fit);

  var done = false;
  function hide() {
    if (done) return; done = true;
    el.classList.add('out');
    window.removeEventListener('resize', fit);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 600);
  }
  function start() {
    document.body.appendChild(el);
    // يبدأ لما الصور تكون جاهزة (كلها جوه التطبيق)، علشان الحركة ما تتقطعش
    var imgs = stage.querySelectorAll('img'), left = imgs.length, started = false;
    var go = function () {
      if (started) return; started = true;
      el.classList.add('az-go');
      setTimeout(hide, reduce ? 1300 : 4000);
    };
    Array.prototype.forEach.call(imgs, function (im) {
      if (im.complete) { if (!--left) go(); }
      else im.addEventListener('load', function () { if (!--left) go(); }), im.addEventListener('error', function () { if (!--left) go(); });
    });
    setTimeout(go, 900);
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
  el.addEventListener('click', hide);
})();
