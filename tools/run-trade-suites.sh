#!/usr/bin/env bash
# Runs every trade app's OWN test suite against the copies in Trade-Modules/.
# The suites run on a temporary duplicate, so Trade-Modules/ is never written to
# (some suites save screenshots/PDFs next to themselves).
# The duplicate uses the original repository folder names, because some suites
# expect them (e.g. Flooring's e2e also opens /Ezaza/ to prove it never touches electrical data).
#
# Usage: tools/run-trade-suites.sh            (needs Node 18+ and Playwright)
# Note: several suites start their own server on fixed ports (8790, 8791, 8795) —
#       stop any other server on those ports first, and run suites one at a time.
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"; LOGS="${LOGS:-$TMP/logs}"; mkdir -p "$LOGS"
PORT="${PORT:-8802}"
declare -A MAP=([Ezaza]=Electrical [Hesabaty-plumbing]=Plumbing [Hesabaty-HAVC]=HVAC
                [Hesabaty-painting]=Painting [Hesabaty-Flooring]=Flooring [Hesabaty-Gebsum]=Gypsum
                [Hesabaty-plaster]=Plastering)
for repo in "${!MAP[@]}"; do mkdir -p "$TMP/$repo"; cp -a "$ROOT/Trade-Modules/${MAP[$repo]}/." "$TMP/$repo/"; done
# ملفات أرزقي المشتركة (الألوان والفاتورة الموحدة) بتتحمّل من ../../Shared-Assets —
# بنوصّلها لكل خادم اختبار علشان الاختبارات تجرب الفاتورة الموحدة نفسها
cp -a "$ROOT/Shared-Assets" "$TMP/Shared-Assets"
for repo in "${!MAP[@]}"; do ln -s "$TMP/Shared-Assets" "$TMP/$repo/Shared-Assets"; done
# الحدادة والنجارة: أقسام أصلية في أرزقي (مش نسخ)، بتتجرب بنفس الطريقة
for d in Metalwork Carpentry Masonry LowCurrent; do mkdir -p "$TMP/$d" && cp -a "$ROOT/Trade-Modules/$d/." "$TMP/$d/"; done

( cd "$TMP" && exec python3 -m http.server "$PORT" --bind 127.0.0.1 >/dev/null 2>&1 ) & SRV=$!
trap 'kill $SRV 2>/dev/null; rm -rf "$TMP"' EXIT
sleep 1
B="http://localhost:$PORT"
fail=0
run() { # name repo cmd...
  local name=$1 repo=$2; shift 2
  ( cd "$TMP/$repo" && timeout 900 "$@" ) > "$LOGS/$name.log" 2>&1; local rc=$?
  printf '%-18s %s\n' "$name" "$([ $rc -eq 0 ] && echo PASS || echo "FAIL (exit $rc, log: $LOGS/$name.log)")"
  [ $rc -eq 0 ] || fail=1
}
run flooring-unit    Hesabaty-Flooring node --test tests/calc.test.js
run flooring-e2e     Hesabaty-Flooring node tests/e2e.js "$B/Hesabaty-Flooring/"
run flooring-modules Hesabaty-Flooring node tests/e2e-modules.js "$B/Hesabaty-Flooring/"
run gypsum-unit      Hesabaty-Gebsum   node --test tests/engine.test.js
run gypsum-ui        Hesabaty-Gebsum   node tests/ui.smoke.js
run hvac-all         Hesabaty-HAVC     node tests/run-tests.js
run hvac-layout      Hesabaty-HAVC     node tests/layout-audit.js
run plumbing-all     Hesabaty-plumbing node tests/run-tests.js
run plumbing-layout  Hesabaty-plumbing node tests/layout-audit.js
run painting-calcs   Hesabaty-painting node tools/test-calcs.js
run plaster-unit     Hesabaty-plaster  node --test tests/engine.test.js
run plaster-e2e      Hesabaty-plaster  node tests/e2e.js
run metalwork-unit   Metalwork         node --test tests/calc.test.js
run metalwork-e2e    Metalwork         node tests/e2e.js "$B/Metalwork/"
run carpentry-unit   Carpentry         node --test tests/calc.test.js
run carpentry-e2e    Carpentry         node tests/e2e.js "$B/Carpentry/"
run masonry-unit     Masonry           node --test tests/calc.test.js
run masonry-e2e      Masonry           node tests/e2e.js "$B/Masonry/"
run lowcurrent-unit  LowCurrent        node --test tests/calc.test.js
run lowcurrent-e2e   LowCurrent        node tests/e2e.js "$B/LowCurrent/"
[ -n "${KEEP_LOGS:-}" ] && { cp -r "$LOGS" "$KEEP_LOGS"; echo "logs copied to $KEEP_LOGS"; }
exit $fail
