# تفعيل تسجيل الدخول بجوجل والنسخ على درايف

الكود كله جاهز. ناقص بس **معرّف OAuth (Client ID)** من حساب جوجل بتاعك، يتحط في
`Main-App/config.js` في `googleClientId`. المعرّف ده **عام ومش سر** (أي موقع بيستخدم
تسجيل الدخول بجوجل بيكون ظاهر في كوده).

## الخطوات (حوالي 10 دقايق)

1. افتح **https://console.cloud.google.com** بحسابك ← اعمل مشروع جديد باسم `Hisabati`.
2. **APIs & Services ← Library** ← دوّر على **Google Drive API** ← **Enable**.
3. **Google Auth Platform ← Branding** (شاشة الموافقة):
   - App name: `حساباتي`
   - User support email: إيميلك
   - App logo (اختياري): `Shared-Assets/icons/icon-512.png`
   - App home page: `https://ahmedhassanabdallah.github.io/Hisabati-Super-App/Main-App/`
   - Privacy policy: `https://ahmedhassanabdallah.github.io/Hisabati-Super-App/Main-App/privacy.html`
   - Authorized domains: `ahmedhassanabdallah.github.io`
   - Developer contact: إيميلك
4. **Audience**: اختار **External**.
5. **Data Access ← Add or remove scopes**: اختار
   `openid` و `.../auth/userinfo.email` و `.../auth/userinfo.profile` و `.../auth/drive.file`.
6. **Clients ← Create client**:
   - Application type: **Web application**
   - Name: `Hisabati Web`
   - **Authorized JavaScript origins**: `https://ahmedhassanabdallah.github.io` (من غير أي مسار في الآخر)
   - Authorized redirect URIs: سيبها فاضية
   - **Create** ← انسخ الـ **Client ID** (آخره `.apps.googleusercontent.com`).
7. ابعت الـ Client ID، وهيتحط في `config.js` ويترفع.
8. **Audience ← Publish app** علشان أي حد يقدر يسجل دخول.
   طول ما التطبيق في وضع **Testing**، بس الإيميلات اللي تضيفها في **Test users** (لحد 100) هي اللي تقدر تسجل.

## ملاحظات
* الصلاحيات المطلوبة كلها **غير حساسة** (`drive.file` بيشوف بس الملفات اللي التطبيق عملها)،
  فمش محتاجة مراجعة أمنية من جوجل. ممكن جوجل تطلب "Brand verification" للاسم واللوجو
  قبل ما تظهر في شاشة الموافقة — بتاخد أيام قليلة.
* لو غيرت مكان نشر التطبيق (دومين تاني)، ضيف الدومين الجديد في **Authorized JavaScript origins**.
* تسجيل الدخول بجوجل ما بيشتغلش جوه WebView بتاع أندرويد (جوجل بتمنعه). شغّال في المتصفح وفي
  التطبيق المثبّت من المتصفح ("إضافة إلى الشاشة الرئيسية").
