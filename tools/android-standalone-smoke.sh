#!/usr/bin/env bash
# اختبار تشغيل "أرزقي" على المحاكي: يتثبت، يفتح الرئيسية، يفتح كل قسم من الأقسام السبعة
# من جوه التطبيق، ويتأكد إن كل صفحة اتحملت وجسرها موجود ومفيش أخطاء JavaScript ولا انهيار.
set -uo pipefail
PKG=com.ahmedhassan.arzaqi
# اسم الكلاس في الكود (namespace) مختلف عن اسم الباكدج، فلازم الاسم الكامل
ACT=$PKG/com.ahmedhassan.hisabati.offline.MainActivity
APK="$(ls apk/*.apk | head -1)"
mkdir -p shots
adb install -r "$APK" || exit 1
fail=0

wait_for() { # $1 = نص في السجل
  for i in $(seq 1 45); do
    sleep 2
    adb logcat -d > logcat.txt || true
    grep -q "$1" logcat.txt && return 0
  done
  return 1
}

adb logcat -c || true
adb shell am start -W -n "$ACT"
if wait_for "HISABATI_CHECK https://appassets.androidplatform.net/Main-App/index.html"; then
  echo "✔ الواجهة الرئيسية اتحملت: $(grep -o 'HISABATI_CHECK https://appassets.androidplatform.net/Main-App/[^ ]* .*' logcat.txt | tail -1)"
else
  # أول تشغيل للـ WebView على المحاكي ساعات بيعلق (حصلت مرتين قبل كده والأقسام بعدها اشتغلت عادي):
  # نقفل التطبيق ونفتحه تاني مرة واحدة قبل ما نعتبرها مشكلة — ولو اشتغلت التانية بنكتب تحذير
  echo "::warning::الواجهة الرئيسية ما اتحملتش في أول فتحة — بنعيد فتح التطبيق مرة"
  adb logcat -d > logcat-00-home-first.txt || true
  adb shell am force-stop "$PKG"; sleep 2; adb logcat -c || true
  adb shell am start -W -n "$ACT" >/dev/null
  if wait_for "HISABATI_CHECK https://appassets.androidplatform.net/Main-App/index.html"; then
    echo "✔ الواجهة الرئيسية اتحملت في الفتحة التانية: $(grep -o 'HISABATI_CHECK https://appassets.androidplatform.net/Main-App/[^ ]* .*' logcat.txt | tail -1)"
  else
    echo "::error::الواجهة الرئيسية ما اتحملتش"; fail=1
  fi
fi
adb logcat -d > logcat-00-home.txt || true
echo "::group::سجل فتح الرئيسية"
grep -E "Hisabati|AndroidRuntime|FATAL|ActivityTaskManager.*$PKG|cr_|chromium" logcat-00-home.txt | tail -120
echo "::endgroup::"
sleep 2; adb exec-out screencap -p > shots/00-home.png || true

for d in Electrical Plumbing HVAC Painting Flooring Gypsum Plastering; do
  adb logcat -c || true
  adb shell am start -W -n "$ACT" -e path "Trade-Modules/$d/" >/dev/null
  if wait_for "HISABATI_CHECK https://appassets.androidplatform.net/Trade-Modules/$d/"; then
    line="$(grep -o "HISABATI_CHECK https://appassets.androidplatform.net/Trade-Modules/$d/.*" logcat.txt | tail -1)"
    echo "✔ $d: $line"
    echo "$line" | grep -q '\\"bridges\\":5' || echo "$line" | grep -q '"bridges":5' || { echo "::error::$d: الجسور مش موجودة"; fail=1; }
    echo "$line" | grep -qE 'body\\?"?:0' && { echo "::error::$d: الصفحة فاضية"; fail=1; }
  else
    echo "::error::$d ما اتحملش"; fail=1
  fi
  sleep 3
  adb exec-out screencap -p > "shots/$d.png" || true
  adb logcat -d > "logcat-$d.txt" || true
  if grep "HisabatiWeb" "logcat-$d.txt" | grep -q "Uncaught"; then
    echo "::error::$d: خطأ JavaScript"; grep "HisabatiWeb" "logcat-$d.txt" | grep "Uncaught" | head -5; fail=1
  fi
done

# زرار الرجوع وإعادة الفتح
adb shell input keyevent KEYCODE_BACK; sleep 2
adb shell am start -W -n "$ACT" >/dev/null; sleep 5
adb logcat -d > logcat.txt || true
cat logcat-*.txt >> logcat.txt 2>/dev/null || true
if grep -A4 "FATAL EXCEPTION" logcat.txt | grep -q "$PKG"; then echo "::error::التطبيق وقع"; fail=1; fi
[ $fail -eq 0 ] && echo "✔ التطبيق المستقل اشتغل: الرئيسية + 7 أقسام بدون أخطاء" || echo "✘ فيه مشاكل"
exit $fail
