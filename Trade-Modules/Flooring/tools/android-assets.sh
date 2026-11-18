#!/usr/bin/env bash
# تجهيز ملفات تطبيق الويب داخل مشروع أندرويد (تعمل بدون إنترنت — الخط العربي مضمّن)
# © 2026 أحمد حسن عبدالله - جميع الحقوق محفوظة.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
A="$ROOT/android/app/src/main/assets"
rm -rf "$A"
mkdir -p "$A/www"
cp "$ROOT/index.html" "$ROOT/manifest.json" "$ROOT/privacy.html" "$ROOT/version.json" "$A/www/"
cp -r "$ROOT/css" "$ROOT/js" "$ROOT/fonts" "$ROOT/icons" "$A/www/"
ls -la "$A/www"
