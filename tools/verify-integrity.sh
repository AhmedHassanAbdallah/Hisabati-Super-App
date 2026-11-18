#!/usr/bin/env bash
# Hisabati Super App — integrity check (read-only).
#  1) Each copied trade module is byte-identical to the baseline snapshot
#     taken from the original repository before copying.
#  2) (optional) The original repositories are unchanged: same HEAD commit,
#     clean working tree, and same file checksums as the baseline.
# Usage: tools/verify-integrity.sh [ORIGINALS_DIR]
# Never writes anywhere except stdout.
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROV="$ROOT/.provenance"
ORIG="${1:-}"
fail=0

declare -A MAP=(
  [Ezaza]=Electrical [Hesabaty-plumbing]=Plumbing [Hesabaty-HAVC]=HVAC
  [Hesabaty-painting]=Painting [Hesabaty-Flooring]=Flooring [Hesabaty-Gebsum]=Gypsum
)

check_tree() { # $1 = dir, $2 = baseline checksum file, $3 = label
  local out
  out="$(cd "$1" && sha256sum --quiet -c "$2" 2>&1)"; local rc=$?
  local nb nc
  nb=$(wc -l < "$2")
  nc=$(cd "$1" && find . -path ./.git -prune -o -type f -print | wc -l)
  if [ $rc -ne 0 ] || [ "$nb" -ne "$nc" ]; then
    echo "FAIL  $3  (baseline files: $nb, present: $nc)"; [ -n "$out" ] && echo "$out" | head -20; fail=1
  else
    echo "OK    $3  ($nc files identical)"
  fi
}

echo "== Copies vs. baseline"
for src in "${!MAP[@]}"; do
  check_tree "$ROOT/Trade-Modules/${MAP[$src]}" "$PROV/$src.sha256" "Trade-Modules/${MAP[$src]}"
done

if [ -n "$ORIG" ]; then
  echo "== Originals vs. baseline ($ORIG)"
  while read -r name head _; do
    [ "$head" = "HEAD" ] && head="NO_COMMITS"
    d="$ORIG/$name"
    [ -d "$d" ] || { echo "FAIL  $name missing"; fail=1; continue; }
    now="$(git -C "$d" rev-parse --verify -q HEAD || echo NO_COMMITS)"
    dirty="$(git -C "$d" status --porcelain | wc -l)"
    if [ "$now" != "$head" ] || [ "$dirty" -ne 0 ]; then
      echo "FAIL  $name  HEAD $now (expected $head), uncommitted changes: $dirty"; fail=1
    else
      echo "OK    $name  HEAD ${now:0:12}, working tree clean"
    fi
    [ -s "$PROV/$name.sha256" ] && check_tree "$d" "$PROV/$name.sha256" "$name files"
  done < <(cat "$PROV/HEADS.txt")
fi

[ $fail -eq 0 ] && echo "ALL CHECKS PASSED" || echo "SOME CHECKS FAILED"
exit $fail
