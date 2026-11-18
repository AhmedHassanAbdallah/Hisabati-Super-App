#!/usr/bin/env bash
# اختبار تشغيل APK حساباتي HVAC على المحاكي: يتثبت ويفتح وتظهر الصفحة بدون أخطاء
set -uo pipefail
PKG="com.ahmedhassan.hesabatihvac"
APK="$(ls apk/*.apk | head -1)"
adb install -r "$APK" || exit 1
adb logcat -c || true
adb shell am start -W -n "$PKG/.MainActivity"
for i in $(seq 1 45); do
  sleep 2
  adb logcat -d > logcat.txt || true
  grep -q "HESABATI_HVAC_READY" logcat.txt && break
  if [ "$i" = "20" ]; then adb shell am force-stop "$PKG"; adb shell am start -W -n "$PKG/.MainActivity"; fi
done
sleep 3
adb logcat -d > logcat.txt || true
adb exec-out screencap -p > screen.png || true
PID=""
for i in 1 2 3 4 5; do PID="$(adb shell pidof "$PKG" | tr -d '\r' || true)"; [ -n "$PID" ] && break; sleep 1; done
echo "pid=$PID"
grep -E "HesabatiHvacWeb|HESABATI_HVAC|Uncaught|FATAL EXCEPTION|AndroidRuntime" logcat.txt | head -60 || true
grep -q "HESABATI_HVAC_READY" logcat.txt || { echo "::error::صفحة التطبيق ما اتحملتش"; exit 1; }
[ -n "$PID" ] || echo "::warning::المحاكي ما رجّعش رقم العملية، بس الصفحة اتحملت"
if grep "HesabatiHvacWeb" logcat.txt | grep -q "Uncaught"; then echo "::error::خطأ JavaScript في الصفحة"; exit 1; fi
if grep -A4 "FATAL EXCEPTION" logcat.txt | grep -q "$PKG"; then echo "::error::التطبيق وقع"; exit 1; fi
adb shell input keyevent KEYCODE_BACK; sleep 2
adb shell am start -W -n "$PKG/.MainActivity"; sleep 5
adb logcat -d | grep -A4 "FATAL EXCEPTION" | grep -q "$PKG" && { echo "::error::التطبيق وقع بعد الرجوع"; exit 1; }
echo "✔ تطبيق حساباتي HVAC اشتغل والصفحة اتحملت بدون أخطاء"
