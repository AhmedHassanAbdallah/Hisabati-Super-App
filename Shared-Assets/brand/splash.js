/*
 * أرزقي — شاشة الافتتاح المتحركة.
 * بتظهر مرة واحدة في كل فتحة للتطبيق، ولونها حسب وضع الموبايل (فاتح/غامق) — أو اختيار المستخدم لو غيّره.
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
  var logo = base + (dark ? 'arzaqi-logo-on-dark.png' : 'arzaqi-logo-on-light.png');

  var el = document.createElement('div');
  el.className = 'az-splash' + (dark ? ' dark' : '');
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', 'أرزقي — لحسابات المصنعية');
  el.innerHTML = '<div class="az-stage" style="--az-mask:url(\'' + logo + '\')">'
    + '<div class="az-halo"></div><img class="az-logo" alt="" src="' + logo + '"><div class="az-shine"></div>'
    + '<div class="az-bars"><i></i><i></i></div></div>';

  function mount() { document.body.appendChild(el); }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);

  var start = Date.now();
  function hide() {
    var wait = Math.max(0, 2100 - (Date.now() - start));
    setTimeout(function () {
      el.classList.add('out');
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 600);
    }, wait);
  }
  if (document.readyState === 'complete') hide(); else window.addEventListener('load', hide);
  el.addEventListener('click', function () { el.classList.add('out'); });
})();
