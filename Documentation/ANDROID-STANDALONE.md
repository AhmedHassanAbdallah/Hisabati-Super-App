# حساباتي أوفلاين — تطبيق الأندرويد المستقل

## الفرق بين النسختين
| | **حساباتي** (`android/`, TWA) | **حساباتي أوفلاين** (`android-standalone/`) |
|---|---|---|
| Package | `com.ahmedhassan.hisabati` | `com.ahmedhassan.hisabati.offline` |
| مكان الملفات | الموقع (بيتحمّل ويتخزن في Chrome) | **جوه التطبيق نفسه** |
| محتاج Chrome؟ | أيوه | لأ |
| أول تشغيل من غير نت | لأ | **أيوه** |
| التحديثات | تلقائي من الموقع | مع كل إصدار APK/AAB جديد |
| تسجيل الدخول بجوجل | مكتبة جوجل للويب | **أصلي** (Google Identity على أندرويد) |
| الطباعة / PDF | Chrome | طباعة أندرويد (نفس التطبيقات الأصلية) |
| مكان البيانات | Chrome | جوه التطبيق |
| ملفات الرفع | `hisabati.apk` / `hisabati.aab` | `hisabati-offline.apk` / `hisabati-offline.aab` |
| صفحة الإصدارات | Releases ← `v1.x` | Releases ← `offline-v1.x` |

البيانات بين النسختين (أو بين التطبيق والموقع) بتتنقل بالنسخة الاحتياطية على جوجل درايف.

## إزاي شغال
* ملفات `Main-App/` و `Shared-Assets/` و `Trade-Modules/*` بتتنسخ وقت البناء جوه التطبيق
  (`syncWebAssets` في `app/build.gradle`) — من غير ملفات أندرويد/اختبارات الأقسام، ومن غير أي تعديل.
  خطوة في البناء بتتأكد إن الملفات جوه التطبيق مطابقة للموقع بايت ببايت.
* التطبيق بيقدّم لكل قسم نفس الجسر اللي تطبيقه الأصلي كان بيقدّمه (`HesabatyApp`، `HesabatiPlumbingApp`،
  `HesabatiHvacApp`، `HFloorApp`، `PlasterApp`) بنفس الوظائف: الطباعة/PDF، حفظ النسخ في
  التنزيلات ← `Hisabati`، فتح واتساب وفيسبوك، ورقم إصدار القسم.
* كل قسم بيتفتح كصفحة كاملة وفوقه شريط أصلي **"كل المهن"** — علشان طباعة أندرويد تطبع فاتورة القسم نفسها.
* زرار الرجوع: يقفل نافذة القسم ← الصفحة اللي قبلها ← الرئيسية ← يخرج. (أندرويد 16: predictive back.)
* تحديثات الأقسام (فقاعة "تحديث جديد" جوه أي قسم) بتفتح صفحة إصدارات حساباتي، لأن الأقسام بتتحدّث مع التطبيق.

## تفعيل تسجيل الدخول بجوجل في النسخة دي (مرة واحدة)
جوجل بتطلب "عميل Android" منفصل بنفس المشروع:
1. Google Cloud ← مشروع **Hesabaty** ← **Google Auth Platform ← Clients ← Create client**.
2. Application type: **Android**.
3. Package name: `com.ahmedhassan.hisabati.offline`
4. SHA-1 certificate fingerprint: البصمة المكتوبة في صفحة الإصدار `offline-v…` (سطر SHA-1).
5. Create. (مش محتاج تبعت حاجة — التطبيق بيتعرّف تلقائياً بالـ Package + SHA-1.)
6. لما ترفعه على جوجل بلاي: كرّر نفس الخطوات ببصمة **SHA-1** بتاعة **App signing key**
   من Play Console ← App integrity (لأن جوجل بلاي بتعيد توقيع التطبيق).

## البناء
* تلقائي على GitHub Actions (`.github/workflows/android-standalone.yml`): بناء ← تجربة على محاكي أندرويد
  (الرئيسية + الأقسام السبعة) ← نشر في Releases.
* محلياً: افتح فولدر `android-standalone/` في Android Studio، أو `./gradlew assembleRelease bundleRelease`.
