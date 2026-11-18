# حساباتي للأرضيات والتشطيبات — HESABATI FLOORING

تطبيق عربي متكامل لحسابات وإدارة أعمال الأرضيات والتشطيبات (سيراميك، بورسلين، رخام وجرانيت، باركيه، إنترلوك، وغيرها)
للصنايعية والتجار والمقاولين في مصر والدول العربية. **يعمل بالكامل بدون إنترنت** والبيانات محفوظة على الموبايل.

> مشروع مستقل تماماً عن تطبيق «حساباتي» للكهرباء (مستودع `Ezaza`): ملفات منفصلة، مفاتيح تخزين منفصلة (`hflooring_*`)،
> كاش منفصل (`hflooring-*`)، واسم حزمة أندرويد منفصل (`com.ahmedhassan.hesabatyflooring`) — مفيش أي تأثير على تطبيق الكهرباء.

## المحتويات
| الملف | الوظيفة |
|---|---|
| `index.html` | هيكل الصفحة |
| `css/app.css` | نفس تصميم حساباتي الأصلي (الألوان والمكونات) |
| `css/flooring.css` | إضافات تطبيق الأرضيات |
| `js/calc.js` | **محرك الحسابات** (مساحات، سلالم، بلاط، باركيه، إنترلوك، رخام، لاصق وترويبة، طرق المحاسبة) — منفصل عن الواجهة |
| `js/finance.js` | الحسابات المالية: قيمة المشروع، التكاليف، الربح، المخزون، العمال، كشف الحساب |
| `js/store.js` | التخزين المحلي والنسخ الاحتياطي |
| `js/ui.js` · `js/app.js` · `js/modules.js` · `js/calculators.js` · `js/docs.js` | الواجهة |
| `service-worker.js` | العمل بدون إنترنت والتحديثات |
| `android/` | مشروع تطبيق أندرويد (WebView) لبناء APK |
| `tests/` | اختبارات الحسابات + اختبارات الواجهة في متصفح حقيقي |

## التشغيل والاختبار
```bash
node --test tests/calc.test.js            # اختبارات محرك الحسابات
python3 -m http.server 8765               # من المجلد الأب، ثم افتح http://localhost:8765/Hesabaty-Flooring/
node tests/e2e.js && node tests/e2e-modules.js   # اختبارات الواجهة (تحتاج Playwright)
```

## النشر على GitHub Pages
Settings ← Pages ← Source: **Deploy from a branch** ← اختار الفرع والمجلد `/ (root)` ← Save.
الرابط هيبقى: `https://ahmedhassanabdallah.github.io/Hesabaty-Flooring/`

## إصدار تحديث
```bash
node tools/bump-version.js 1.0.1 "ملاحظة التحديث"
```

## تطبيق أندرويد (APK)
الـ Action «Android APK» بيبني الـ APK تلقائياً مع كل رفع. للتوقيع الثابت ونشر رابط تحميل: ضيف Secret باسم
`HFLOORING_KEY_PASSWORD` في Settings ← Secrets and variables ← Actions.

© 2026 أحمد حسن عبدالله — جميع الحقوق محفوظة.
