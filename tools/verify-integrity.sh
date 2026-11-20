#!/usr/bin/env bash
# أرزقي (Hisabati Super App) — integrity check (read-only).
#  1) Each copied trade module matches the baseline snapshot taken from the original repository,
#     EXCEPT the files listed in .provenance/changes/<Section>.sha256 — the intended Arzaqi changes
#     (name, theme, icons, unified invoice), each pinned to its exact new checksum.
#     Readable diffs of those changes: .provenance/changes/<Section>.patch
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
  [Hesabaty-plaster@main]=Plastering   # copied 2026-11-20 from GitHub main @ ac46676 (the local clone is still empty)
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

# نسخة القسم = الأصل + التغييرات المقصودة بس
check_copy() { # $1 = dir, $2 = baseline checksum file, $3 = intended-changes checksum file, $4 = label
  local res
  res="$(python3 - "$1" "$2" "$3" <<'PY'
import hashlib, os, sys
d, base_f, chg_f = sys.argv[1:4]
def load(f):
    out = {}
    if os.path.exists(f):
        for line in open(f, encoding='utf8'):
            line = line.rstrip('\n')
            if line: h, n = line.split('  ', 1); out[n] = h
    return out
base, chg = load(base_f), load(chg_f)
bad, n_same, n_chg = [], 0, 0
present = set()
for root, dirs, files in os.walk(d):
    for fn in files:
        p = os.path.join(root, fn); rel = './' + os.path.relpath(p, d); present.add(rel)
        h = hashlib.sha256(open(p, 'rb').read()).hexdigest()
        if base.get(rel) == h and rel not in chg: n_same += 1
        elif chg.get(rel) == h: n_chg += 1
        else: bad.append(rel)
missing = [f for f in base if f not in present]
print(f"{n_same} {n_chg} {len(bad)} {len(missing)} " + " ".join((bad + missing)[:8]))
PY
)"
  set -- "$@" $res
  local same=$5 chg=$6 bad=$7 miss=$8
  if [ "$bad" != "0" ] || [ "$miss" != "0" ]; then
    echo "FAIL  $4  (unexpected changes: $bad, missing: $miss) ${*:9}"; fail=1
  else
    echo "OK    $4  ($same identical to the original + $chg intended Arzaqi changes)"
  fi
}

echo "== Copies vs. baseline (original + intended changes only)"
for src in "${!MAP[@]}"; do
  d="${MAP[$src]}"
  check_copy "$ROOT/Trade-Modules/$d" "$PROV/$src.sha256" "$PROV/changes/$d.sha256" "Trade-Modules/$d"
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
