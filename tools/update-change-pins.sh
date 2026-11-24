#!/usr/bin/env bash
# بيحدّث سجل التغييرات المقصودة في نسخ الأقسام (.provenance/changes/<Section>.sha256 و .patch).
# كل ملف في نسخة القسم مختلف عن لقطة الأصل (.provenance/<repo>.sha256) بيتسجّل ببصمته الجديدة،
# والفرق المقروء بيتعمل من النسخة الأصلية اللي اتنسخت أول مرة في تاريخ git للمستودع ده.
# بيكتب في .provenance/changes بس — ما بيلمسش الأقسام ولا المستودعات الأصلية.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; cd "$ROOT"
declare -A MAP=([Ezaza]=Electrical [Hesabaty-plumbing]=Plumbing [Hesabaty-HAVC]=HVAC
  [Hesabaty-painting]=Painting [Hesabaty-Flooring]=Flooring [Hesabaty-Gebsum]=Gypsum
  [Hesabaty-plaster@main]=Plastering)
for src in "${!MAP[@]}"; do
  d="${MAP[$src]}"
  python3 - "$d" ".provenance/$src.sha256" <<'PY'
import hashlib, os, subprocess, sys, tempfile, difflib
d, base_f = sys.argv[1:3]
root = os.path.join('Trade-Modules', d)
base = {}
for line in open(base_f, encoding='utf8'):
    line = line.rstrip('\n')
    if line: h, n = line.split('  ', 1); base[n] = h
# أول commit ضاف القسم = النسخة الأصلية بالظبط
first = subprocess.run(['git', 'log', '--diff-filter=A', '--format=%H', '--', root + '/index.html'],
                       capture_output=True, text=True, check=True).stdout.split()[-1]
def original(rel):
    r = subprocess.run(['git', 'show', f'{first}:{root}/{rel[2:]}'], capture_output=True)
    if r.returncode: return None
    if hashlib.sha256(r.stdout).hexdigest() != base.get(rel): sys.exit(f'{d}: {rel} في أول commit مش مطابق للأصل')
    return r.stdout
changed = []
for dp, dirs, files in os.walk(root):
    for fn in sorted(files):
        p = os.path.join(dp, fn); rel = './' + os.path.relpath(p, root)
        h = hashlib.sha256(open(p, 'rb').read()).hexdigest()
        if base.get(rel) != h: changed.append((rel, h))
changed.sort()
# ملفات أصلية اتشالت عن قصد من النسخة (مثلاً نسخة مكررة بقت في Shared-Assets) بتتسجل بعلامة «-»
missing = sorted(n for n in base if not os.path.exists(os.path.join(root, n[2:])))
os.makedirs('.provenance/changes', exist_ok=True)
with open(f'.provenance/changes/{d}.sha256', 'w', encoding='utf8') as f:
    for rel, h in changed: f.write(f'{h}  {rel}\n')
    for rel in missing: f.write(f'-  {rel}\n')
out = []
for rel, _ in changed:
    new = open(os.path.join(root, rel[2:]), 'rb').read()
    old = original(rel) if rel in base else b''
    a, b = f'{d}/{rel[2:]}', f'Trade-Modules/{d}/{rel[2:]}'
    try:
        ot, nt = old.decode('utf8'), new.decode('utf8')
    except UnicodeDecodeError:
        out.append(f'Binary files {a} and {b} differ\n'); continue
    out.extend(difflib.unified_diff(ot.splitlines(True), nt.splitlines(True), a if rel in base else '/dev/null', b))
    if out and not out[-1].endswith('\n'): out[-1] += '\n\\ No newline at end of file\n'
for rel in missing: out.append(f'Deleted (moved to Shared-Assets or removed on purpose): {d}/{rel[2:]}\n')
open(f'.provenance/changes/{d}.patch', 'w', encoding='utf8').write(''.join(out))
print(f'{d}: {len(changed)} ملف متغير و{len(missing)} اتشال عن قصد (من أصل {len(base)})')
PY
done
