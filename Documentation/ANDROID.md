# تطبيق الأندرويد (APK)

## نوعه: Trusted Web Activity (TWA)
التطبيق بيفتح `https://ahmedhassanabdallah.github.io/Hisabati-Super-App/Main-App/` جوه **Chrome**
بملء الشاشة (من غير شريط المتصفح، بعد ربط الدومين — تحت). اتختار النوع ده بدل WebView لأن:
* **تسجيل الدخول بجوجل** ممنوع من جوجل جوه WebView، وشغّال في TWA.
* **الطباعة / PDF** من جوه الأقسام: Chrome بيطبع مستند القسم نفسه. في WebView كان هيطبع الشاشة كلها.
* الأقسام بتفضل زي ما هي بالظبط (نفس الموقع)، والتحديثات بتوصل من غير APK جديد.
* بيشتغل أوفلاين بعد أول فتح (Service Workers بتاعة Chrome).
محتاج Chrome على الموبايل (موجود على أغلب أجهزة أندرويد). من غيره بيفتح في متصفح تاني يدعم Custom Tabs.

## البناء
`.github/workflows/android.yml` على GitHub Actions — مع كل تعديل في `android/` أو `version.json`،
أو يدوياً من تبويب **Actions ← Android APK ← Run workflow**.
* الـ APK بيتنشر في **Releases** باسم `hisabati.apk`.
* رقم الإصدار من `version.json` في جذر المستودع.

## مفتاح التوقيع (مرة واحدة)
**Settings ← Secrets and variables ← Actions ← New repository secret**
* Name: `HISABATI_KEY_PASSWORD`
* Secret: كلمة سر قوية **احتفظ بيها** — من غيرها مش هتقدر تطلّع تحديث يتثبت فوق القديم.
أول تشغيل بيعمل المفتاح ويحفظه مشفّر في `android/keystore.enc`، وبيكتب بصمته في `android/assetlinks.json`.

## إخفاء شريط العنوان (ربط الدومين)
Chrome بيتأكد إن الموقع بتاعك فعلاً عن طريق ملف لازم يكون في **جذر الدومين**:
`https://ahmedhassanabdallah.github.io/.well-known/assetlinks.json`
1. اعمل مستودع عام جديد اسمه بالظبط `AhmedHassanAbdallah.github.io`.
2. حط فيه محتوى `android/assetlinks.json` في المسار `.well-known/assetlinks.json` + ملف فاضي `.nojekyll`.
لحد ما ده يحصل التطبيق بيشتغل عادي، بس بيظهر شريط صغير فوق فيه عنوان الموقع.
