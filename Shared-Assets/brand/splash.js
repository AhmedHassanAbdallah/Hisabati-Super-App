/*
 * أرزقي | Arzoqi — شاشة الافتتاح.
 * بتشغّل فيديو الهوية الرسمي (فاتح أو غامق حسب وضع الموبايل — أو اختيار المستخدم لو غيّره)،
 * وبيظهر فوقه الاسم العربي "أرزقي" فوق كلمة Arzoqi، فالاسمين بيظهروا مع بعض.
 * مرة واحدة في كل فتحة للتطبيق، ودوسة واحدة بتقفلها.
 * لو الموبايل منع تشغيل الفيديو أو "تقليل الحركة" مفعّل: بتظهر آخر لقطة من الفيديو ثابتة مع الاسم.
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

  var forced = document.documentElement.getAttribute('data-theme');
  var dark = forced ? forced === 'dark' : !!(window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
  var mode = dark ? 'dark' : 'light';
  var reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  var el = document.createElement('div');
  el.className = 'az-splash' + (dark ? ' dark' : '');
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', 'أرزقي | Arzoqi — صنايعي في جيبك');
  el.innerHTML = '<div class="az-sv">'
    + '<img class="az-poster" alt="" src="' + base + 'arzoqi-splash-' + mode + '.jpg">'
    + (reduce ? '' : '<video muted playsinline webkit-playsinline preload="auto" src="' + base + 'arzoqi-splash-' + mode + '.mp4"></video>')
    + '<div class="az-sv-ar">أرزقي</div></div>';
  var box = el.firstChild, video = el.querySelector('video');

  // الفيديو 9:16 — بيتعرض كامل في نص الشاشة (contain) والخلفية بنفس لونه
  function fit() {
    var w = Math.min(window.innerWidth, window.innerHeight * 9 / 16), h = w * 16 / 9;
    box.style.width = w + 'px'; box.style.height = h + 'px';
    el.querySelector('.az-sv-ar').style.fontSize = Math.round(w * 0.155) + 'px';
  }
  fit(); window.addEventListener('resize', fit);

  var done = false;
  function hide() {
    if (done) return; done = true;
    el.classList.add('out');
    window.removeEventListener('resize', fit);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 600);
  }
  function still() { // من غير فيديو: آخر لقطة ثابتة + الاسم
    el.classList.add('az-static', 'az-go');
    setTimeout(hide, 2200);
  }

  function mount() {
    document.body.appendChild(el);
    if (!video) { still(); return; }
    video.addEventListener('playing', function () { el.classList.add('az-go'); }, { once: true });
    video.addEventListener('ended', function () { setTimeout(hide, 350); });
    video.addEventListener('error', still);
    var p = video.play();
    if (p && p.catch) p.catch(function () { if (!el.classList.contains('az-go')) still(); });
    setTimeout(hide, 7000); // أمان: ما تفضلش أكتر من كده
  }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
  el.addEventListener('click', hide);
})();
