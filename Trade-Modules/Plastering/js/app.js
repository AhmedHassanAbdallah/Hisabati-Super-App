/*
 * HESABATI PLASTER — التشغيل
 */
(function () {
  'use strict';
  const U = window.UI, S = U.S;
  window.APP_VERSION = '1.0.0';

  S.load();
  U.applyTheme();
  U.hydrateIcons(document);
  if (!location.hash) history.replaceState(null, '', '#/home');
  U.render();

  // حفظ فوري عند الخروج أو إخفاء التطبيق
  window.addEventListener('pagehide', () => S.flush());
  document.addEventListener('visibilitychange', () => { if (document.hidden) S.flush(); });
  if (window.matchMedia) {
    const q = window.matchMedia('(prefers-color-scheme: dark)');
    const f = () => { if (U.themeMode() === 'auto') U.rerender(); };
    if (q.addEventListener) q.addEventListener('change', f); else if (q.addListener) q.addListener(f);
  }
  window.addEventListener('offline', () => U.toast('أنت الآن بدون إنترنت — التطبيق شغال عادي وبياناتك محفوظة'));

  // زرار الرجوع في أندرويد: يقفل النافذة المفتوحة الأول
  window.onAndroidBack = function () {
    const pm = document.getElementById('printModal');
    if (pm.classList.contains('open')) { window.Docs.closeDoc(); return true; }
    if (document.getElementById('sheet').classList.contains('open')) { U.closeSheet(); return true; }
    const dl = document.getElementById('confirmDlg');
    if (dl.classList.contains('open')) { dl.classList.remove('open'); return true; }
    return false;
  };

  // العمل بدون إنترنت (داخل تطبيق أندرويد الملفات مضمّنة أصلاً)
  if ('serviceWorker' in navigator && !window.PlasterApp && location.protocol.indexOf('http') === 0) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js').then(reg => {
        reg.addEventListener('updatefound', () => {
          const nw = reg.installing;
          if (!nw) return;
          nw.addEventListener('statechange', () => {
            if (nw.state === 'installed' && navigator.serviceWorker.controller) U.toast('تم تنزيل تحديث جديد — هيشتغل في المرة الجاية اللي تفتح فيها التطبيق');
          });
        });
      }).catch(() => {});
    });
  }
})();
