# Verification report — 2026-11-17/18

## 1. Baseline (taken before copying)
For every original repository: HEAD commit, clean working tree, and SHA-256 of every file
(`.provenance/*.sha256`, `.provenance/HEADS.txt`, `.provenance/SOURCES.json`).
330 files across 6 apps; `Hesabaty-plaster` has no commits (empty on GitHub too).

## 2. Copies vs. originals
`tools/verify-integrity.sh /home/user` — run after copying **and again after all testing**:

| Module | Files | Result |
|---|---|---|
| Electrical ← Ezaza | 46 | identical |
| Plumbing ← Hesabaty-plumbing | 57 | identical |
| HVAC ← Hesabaty-HAVC | 57 | identical |
| Painting ← Hesabaty-painting | 48 | identical |
| Flooring ← Hesabaty-Flooring | 63 | identical |
| Gypsum ← Hesabaty-Gebsum | 59 | identical |

A `git archive` export of each original commit was also compared with `diff -r` → identical.

## 3. Originals unchanged
Same HEAD commits, clean working trees, no stashes, no new branches, every file checksum
identical, nothing pushed. The originals were only read (`ls`, `grep`, `git archive`, `tar` reading).
Tests never ran inside the originals or inside `Trade-Modules/` — always on throwaway duplicates.

## 4. Each app's OWN test suite: original vs. copy
Run sequentially on a fresh export of the original commit and on a duplicate of the copy
(`tools/run-trade-suites.sh`). Checks passed per suite:

| Suite (written by the app) | Original | Copy |
|---|---|---|
| Flooring — calculation engine (unit) | 13 ✔ | 13 ✔ |
| Flooring — full UI e2e | 15 ✔ | 15 ✔ |
| Flooring — modules (stock, invoices, statements, receipts, backup) | 15 ✔ | 15 ✔ |
| Gypsum — calculation engine (unit) | 19 ✔ | 19 ✔ |
| Gypsum — UI smoke (calc → project → payment → invoice → reload) | 38 ✔ | 38 ✔ |
| HVAC — calculations + all browser functions | 142 ✔ | 142 ✔ |
| HVAC — mobile layout audit | 0 problems | 0 problems |
| Plumbing — calculations + all browser functions (incl. PDF A4) | 215 ✔ | 215 ✔ |
| Plumbing — mobile layout audit | 0 problems | 0 problems |
| Painting — calculations, PDF, backup, currencies, offline | 98 ✔ (4 of 6 runs) | 98 ✔ (5 of 6 runs) |

**Painting note:** across 6 runs per side, the *original* also failed 2 times. Every failure
was the same 4 checks of one live calculator step ("الحاسبة المباشرة بتعرض 454.4"). The
suite is timing-sensitive: it is flaky identically on original and copy, not a copy difference.

**Runner notes:** `node --test tests/` (as written in the Flooring/Gypsum READMEs) does not
run on Node 22 because it treats the folder as a file. The explicit files
(`tests/calc.test.js`, `tests/engine.test.js`) were used. Several suites start their own
server on fixed ports (8790/8791/8795), so suites must run one at a time.

Electrical (Ezaza) ships no automated test suite. It is covered by the launcher tests below,
including an invoice comparison.

## 5. Launcher tests
`node tests/launcher.e2e.js` — **133 / 133 passed** (launcher 1.1.0):
* 6 trades + Plastering shown as "قريباً"; no version numbers and no mention of separate apps on screen.
* Menu (☰): opens, introduces all 6 sections with features and an open button; closes with
  Back / ✕ / Esc; opening a section from it, then Back, returns straight to the home screen.
* For every trade: opens from its copy folder; same document title and page structure as
  standalone; **writes exactly the same storage keys as when run standalone**; no JS errors.
* Back button: first closes the app's own window, then returns to the trade list;
  "كل المهن" returns directly; deep links `#trade` work, including when already open.
* Data persistence via each app's own UI (theme setting): kept after reloading the
  launcher, identical when the copy is opened standalone, and no business data changed
  (timestamps that apps refresh on every boot, e.g. Flooring `updatedAt`, are ignored — same standalone).
* Launcher uses only `hisabati_super_last_v1` / `hisabati_super_theme_v1`.
* Electrical points invoice: the preview text is identical inside the launcher and standalone.
  Pressing "طباعة / PDF" fires printing **in the app document only** (not the launcher).
  A real A4 PDF was generated.

`node tests/launcher.offline.js` — **18 / 18 passed**:
* Launcher service worker scope is `Main-App/` only.
* Each of the 6 apps inside the launcher is controlled by **its own original service worker**.
* 7 separate registrations, so cache names never overlap.
* Offline: the launcher and all 6 apps open and run.

`node tests/cloud-backup.e2e.js` — **35 / 35 passed** (launcher 1.2.0). Google itself can't be
used in automated tests, so the test serves a stand-in for Google Identity Services and an
in-memory Google Drive v3 (same requests/responses, CORS, bearer tokens). Everything else is real:
* Without a Client ID the sign-in button explains the service is coming — no errors.
* Device 1: settings made through each section's own UI + business data + HVAC photos →
  sign in (consent asked) → backup creates the folder and a JSON file containing **every section
  key with identical values** and the photos; no foreign keys, no launcher/account keys, no token stored.
* Device 2 (empty): sign in → offered to restore the latest backup → all section data identical
  byte-for-byte, photos restored, unrelated keys untouched, all 6 sections open with restored settings.
* Undo of the last restore, restore from the list, delete from Drive, sign-out (local data kept).
* Restore rejects files that are not Hisabati backups or contain foreign keys/databases.

Screenshots: `Documentation/screenshots/`.

## 6. Plastering section added (2026-11-20)
* Source: `Hesabaty-plaster` GitHub `main` @ `ac46676` (v1.0.0). The local clone from the first
  session was still empty and was not touched. Copied with `git archive` → 44 files, byte-identical
  (`.provenance/Hesabaty-plaster@main.sha256`, `tools/verify-integrity.sh`).
* Integration checks: unique storage prefix `hplaster_`, cache prefix `hplaster-`, no IndexedDB,
  no frame-busting, hash-based navigation (`#/home`) — works inside the launcher unchanged.
* The app's own suites, original vs. copy: engine **16/16 = 16/16**, browser e2e **PASSED = PASSED**
  (including "clear all data clears only plastering data").
* Launcher suites with 7 sections: `launcher.e2e.js` **151/151**, `cloud-backup.e2e.js` **36/36**
  (backup/restore include `hplaster_*`), `launcher.offline.js` **20/20** (8 separate service workers).

## 7. Android apps for Google Play (2026-11-20)
**حساباتي (TWA, `android/`) 1.1.0** — GitHub Actions build: APK + AAB, targetSdk 36, signed → release `v1.1.0`.

**حساباتي أوفلاين (standalone, `android-standalone/`) 1.1.0** — GitHub Actions run 44815570414:
* Build: APK + AAB compiled; check step confirmed the web files inside the app are byte-identical to
  `Main-App/`, `Shared-Assets/`, `Trade-Modules/*` index files and that no section android/tests files were bundled.
* Android emulator (API 34, google_apis): installed and cold-started; home + all 7 sections loaded from inside
  the APK with their own titles, all 5 native bridges present, no JavaScript errors, no crash, back key OK.
* Release `offline-v1.1.0` (SHA-1 `F3:67:70:A9:02:F5:A1:CF:2D:A7:86:49:0A:AA:76:38:A6:34:81:1D`).
* Browser simulation of the native bridge (`tests/native-mode.e2e.js`) **14/14**: sections open full page,
  back returns home, Google sign-in and Drive backup go through the native path, no web Google library loaded.
* Web suites after the change: launcher **151/151**, cloud backup **36/36**.
* Not testable automatically: native Google sign-in on a device (needs the Android OAuth client —
  `ANDROID-STANDALONE.md`), and the Android print dialog (needs a person).


## 8. Arzaqi 2.0.0 — new identity + unified invoice (2026-11-21)
Only the copies in `Trade-Modules/` were changed; every changed file is pinned in
`.provenance/changes/<Section>.sha256` with a readable diff in `.patch`
(regenerate with `tools/update-change-pins.sh`).

| Check | Result |
|---|---|
| `tools/verify-integrity.sh /home/user` | **ALL CHECKS PASSED** — originals: same HEAD, clean tree, every file identical; copies = original + listed changes only (Electrical 8, Plumbing 18, HVAC 16, Painting 8, Flooring 17, Gypsum 22, Plastering 15 files) |
| `tools/run-trade-suites.sh` (each app's own tests on the copies) | **12/12 suites PASS** |
| `tests/launcher.e2e.js` | 151 passed · 0 failed |
| `tests/launcher.offline.js` | 20 passed · 0 failed |
| `tests/native-mode.e2e.js` | 14 passed · 0 failed |
| `tests/cloud-backup.e2e.js` | 36 passed · 0 failed |
| Offline: each section opened, network cut, reloaded | 7/7 load with Arzaqi theme + unified invoice + logo |

Intended differences that the original suites see (handled, not hidden):
* App name حساباتي → أرزقي. One Plumbing check asserts the old name; the copy's test now expects
  `أرزقي السباكة` (pinned change in `Plumbing/tests/run-tests.js`). Every other check is unchanged.
* The shared Arzaqi files (`Shared-Assets/brand/section-theme.css`, `invoice.js`, `invoice.css`, logo) live
  outside each section's folder, so each section's service worker caches them too — under the section's own
  cache prefix (the sections' cache-isolation checks still pass).
* Invoices: the document type is the page's `<h1>` as before; the craftsman's name is above it with logo and phone.

## 9. أرزقي | Arzoqi 2.1.0 — bilingual brand, teal identity, new fonts (2026-11-21)
| Check | Result |
|---|---|
| `tools/verify-integrity.sh /home/user` | **ALL CHECKS PASSED** — originals untouched; copies = original + pinned changes only |
| `tools/run-trade-suites.sh` (each app's own tests, incl. the two layout audits with the new fonts) | **12/12 PASS** |
| `tests/launcher.e2e.js` / `launcher.offline.js` / `native-mode.e2e.js` / `cloud-backup.e2e.js` | 151 / 20 / 14 / 36 passed · 0 failed |
| Offline: each section reloaded with the network cut | 7/7: theme, fonts (IBM Plex Sans Arabic + Inter), unified invoice, wordmark |

Intended differences seen by the original suites: the Plumbing title check now expects `أرزقي | Arzoqi — السباكة`
(pinned in `Plumbing/tests/run-tests.js`); the Drive folder is `أرزقي | Arzoqi — نسخ احتياطية` (launcher cloud test).

## 10. 2.2.0 — workers' daily log, all printables unified, Painting door lump-sum deduction (2026-11-22)
* `tests/crew.e2e.js` (19 passed · 0 failed): card on the customer page in all 7 sections; daily entries for several workers, payouts,
  expenses, who is owed, manual job value, net profit, printable sheet, shared workers across sections — see run below.
* Painting's own suite has 4 new checks for the lump-sum door deduction (pinned in `Painting/tools/test-calcs.js`).
* Converted printables spot-checked: Plumbing receipt + statement, Electrical material list, Painting / Gypsum /
  Flooring / Plastering statements — header, client row, tables, totals and footer all in the unified style.
* Full run: launcher 151 / offline 20 / native 14 / cloud 36 passed · 0 failed; `tools/run-trade-suites.sh` 12/12 PASS;
  `tools/verify-integrity.sh /home/user` ALL CHECKS PASSED.

## 11. 2.2.1 — no black frame around printed pages in dark mode (2026-11-22)
Cause: with the phone in dark mode the page kept `color-scheme: dark`, and Chrome/WebView paints the area around the
A4 sheet dark when printing — a black frame in every exported PDF. Fix (print-only, `section-theme.css`): light
color-scheme and white page/backdrops in `@media print`. `tests/print-white.e2e.js`: 0/7 before the fix, 7/7 after;
PDF exports of all 7 sections rendered with white corners. All suites pass (launcher 151, offline 20, native 14,
cloud 36, crew 19; 12/12 section suites).

## 12. 2.2.2 — the frame around printed pages in the Android app (2026-11-22)
The user still saw a frame in the app's print preview. Its color sampled from the screenshot is exactly `#002624` —
the native WebView background (`webView.setBackgroundColor(NAVY)`), not any page color: the Android WebView print
adapter fills whatever the document does not cover (page margins) with the view's own background, so the CSS fix of
2.2.1 could not reach it. Fix (`android-standalone` MainActivity `doPrint`): the WebView background is white while
the print job runs and goes back to navy in the adapter's `onFinish`. New emulator check: the smoke test opens
`Shared-Assets/brand/print-check.html` (dark page that prints through the same bridge as the sections' invoices),
screenshots the system print preview, and `tools/print-frame-check.py` requires the page's magenta marker to be
visible and no navy frame pixels (the user's screenshot gives 39,114 navy pixels; the limit is 150).

## 13. 2.3.0 — new section: الحدادة وتصنيع الحديد (Metalwork) + print margins (2026-11-22)
* `Trade-Modules/Metalwork` is an original Arzoqi section (no source repository); `tools/verify-integrity.sh` lists it as
  NEW and still verifies the seven copies against their originals (ALL CHECKS PASSED — no copy file changed).
* `tests/calc.test.js` 19/19 — every spec example: laser 2×3×500 = 6 m² / 3,000; handmade 120 kg × 35 = 4,200;
  sheet door 2×1×2×300 = 1,200; iron chair 5×250 = 1,250; lump sum 3,500; plus cm input, Arabic digits, "2,000" vs "2,5",
  no NaN/Infinity/negatives, empty count = 1, discounts (amount/percent, capped), materials and consumables.
* `tests/e2e.js` 123/123 — the same examples typed through the real UI, six work types in one job, consumables with and
  without price, materials on the customer or on the smith, discount, payments, invoice / quote / statement (real A4 PDF),
  edit / duplicate / delete with confirmation, reload persistence, search and filters, Back button, dark/light, currencies.
* Print margins: `crew.css` had `@page { margin: 8mm }` inside `@media print`, which applies to every print on the page —
  after a customer page loaded the workers' notebook, invoices printed smaller than the preview with an 8 mm margin (painted
  with the app background on Android). Moved inside the notebook sheet. `tests/print-white.e2e.js` now also loads
  `crew.css` and requires all @page margins to be 0: 0/8 with the old file, 8/8 after.
* Suites: launcher 169, offline 22, native 14, cloud 37, crew 20, print-white 8; `run-trade-suites` 14/14.

## 14. 2.3.1 — automatic daily Drive backup (2026-11-22)
* `tests/auto-backup.e2e.js` 35/35 (mock Google/Drive, simulated Android bridge): nothing happens or is stored when signed
  out; first open after sign-in uploads one backup in the background with a non-interactive token and no message; once per
  day; skipped when data is unchanged (card says «مفيش تغيير من بعدها»); a manual backup today counts; keeps the last 10
  automatic backups of this device while manual backups and another phone's backups stay; «تلقائية» badge; the switch turns
  it off/on; consent-required and offline do nothing until the next open; in the browser without a token no Google window opens.
* The Drive mock in `tests/cloud-backup.e2e.js` now honours every `appProperties has {…}` filter like real Drive.
* Suites: cloud 37, launcher 169, offline 22, native 14.

## 15. 2.4.0 — new section: النجارة والأثاث (Carpentry) (2026-11-22)
* `Trade-Modules/Carpentry` is an original Arzoqi section; `tools/verify-integrity.sh` lists it as NEW (ALL CHECKS PASSED).
* `tests/calc.test.js` 26/26: the spec's 7 examples (wardrobe 3 m × 1,500 = 4,500 in m/cm/mm; 3 doors × 1,200 = 3,600;
  kitchen base 4 × 1,000 + wall 3 × 800 = 6,400; 5 tables × 700 = 3,500; 10 boards × 500 = 5,000; 5% waste = 250 per
  material or as % of materials, never automatic; costs 10,500 vs price 15,000 → profit 4,500, margin 30%), every
  pricing method, billed vs internal costs, discount, natural wood (m³, ft³, piece, m.run), and the panel nesting:
  parts inside the trimmed sheet, no overlap with kerf, grain lock prevents rotation, oversize parts flagged,
  several board types, shortage vs stock, sheets ≥ theoretical minimum.
* Spec example 7 lists 8,000 + 1,500 + 5,000 + 1,000 = 15,500 as a cost of 10,500. Implemented as stated by the spec's
  own rule ("المصنعية ليست الربح"): the carpenter's own labour price is not a cost; paid workers ("عمالة") are.
* `tests/e2e.js` 106/106 through the real UI: the 6-step item sheet, the examples typed in, bedroom piece by piece,
  doors with separate install and "شامل الحلق", kitchen zones, linked materials/accessories, costs/waste/profit,
  discount, payments, invoice/quote/internal cost sheet (A4 PDF), edit/duplicate/delete, cutting tool with drawn
  layouts added to the project and printed, natural wood, materials library, custom work type reused, other methods
  (m², parts, daily, hour, lump, board), reload persistence, search/filters, Back button, dark/light, currencies.
* Suites: launcher 187, offline 24, native 14, cloud 38, crew 21, print-white 9, auto-backup 35; `run-trade-suites` 16/16.

## 16. 2.5.0 — new section: البناء وأعمال المباني وحساب الطوب (Masonry) (2026-11-22)
* `Trade-Modules/Masonry` is an original Arzoqi section; `tools/verify-integrity.sh` lists it as NEW (ALL CHECKS PASSED).
* `tests/calc.test.js` 25/25: the spec's 10 tests — wall 10 × 3 = 30 m²; door 1 × 2.1 → 27.9; door + 2 windows 1.2 × 1.2 →
  openings 4.98, net 25.02; brick 25 × 12 × 6.5 with 1 cm joints per bond (half 51.282/m², one 102.564/m², 1½, 2, edge);
  1,000 + 5% = 1,050; block 40 × 20 with 1 cm joints on 8 × 3 → 11.61/m² → 279; three walls with two brick types grouped
  separately; mortar 1 m³ + 10% with 1:4 and dry factor 1.3 → 9 bags + 1.144 m³ sand; labour by every method; and a full
  project (bricks + blocks + mortar + labour + workers + transport + waste + discount + payments + profit). Also: identical
  walls, oversize openings, mm/cm/m, count by volume (estimate), packs rounded up, wall mortar = wall − brick volume
  (hollow voids not counted as mortar), missing mix inputs reported instead of invented, sand by load, plaster, floor
  layers, stone, demolition, workers with advances, and no NaN/Infinity/negatives.
* `tests/e2e.js` 115/115 through the real UI: the 10 spec tests typed in, waste none/%/qty, brick price per piece/thousand/
  pack, block calculator, multi-wall + room (4 walls), quick calculation without a customer, “+ إضافة نوع طوب” from the
  library and from inside the calculator, plaster/floor/stone/demolition, workers tool → project labour cost, costs
  (qty × price, amount, % of materials), discount, payments, profit; invoice/quote/materials/internal costs (internal
  costs and profit never on the invoice), edit/duplicate/delete, reload persistence, search by brick name, dark/light,
  currency, storage limited to `hmas_*`.
* Suites: launcher 205, offline 26, native 14, cloud 39, crew 22, print-white 10, auto-backup 35; `run-trade-suites` 18/18.

## 17. 2.6.0 — new section: التيار الخفيف وأنظمة الدش (Low Current & Satellite) (2026-11-22)
* `Trade-Modules/LowCurrent` is an original Arzoqi section; `tools/verify-integrity.sh` lists it as NEW (ALL CHECKS PASSED).
* `tests/calc.test.js` 40/40 — the spec's mandatory tests (section 31): one camera, several cameras, more cameras than
  recorder channels, storage for different retention days, continuous vs motion recording; one network point, several
  points, different cable lengths, waste, reels and leftover, point accessories; PoE with mixed consumption, port counts,
  exceeded budget, reserve and standard mismatch; fiber routes, cores, spare cores, ends, splices, accessories; fire
  alarm conventional and addressable with the "not an approved design" warning; access control one door / many doors
  with different components and per-door cost; intercom villa and buildings with different apartment counts; PA with
  different speakers/taps/zones and amplifier load (and low-impedance check); PBX gateways; dish single/Twin/Quad/Octo,
  several receivers, motorized, multi-satellite DiSEqC, central dish for different floors/apartments, cable lengths,
  waste, multiswitch, amplifiers, MATV/SMATV with signal-level estimate, dish cables, TV point cost; alarm, gates,
  smart home (Zigbee/KNX), BMS, attendance, nurse call, IPTV; item lines with waste, supply vs install-only, auto
  labour quantities; multi-system project with costs, discount, tax, payments and profit; warranty/contract/visit;
  empty/negative/zero/text inputs never give NaN/Infinity.
* `tests/e2e.js` 121/121 through the real UI: all 16 systems and the calculators, apply suggested quantities and manual
  overrides, library add/search/copy/delete and pick into a line, saved labour prices and custom labour methods,
  routes, notes and sharing, a project with 5 systems + workers/transport/expenses + discount + 14% tax + payments,
  invoice/quote/materials list/internal costs (no internal costs on the invoice), quote → invoice, site and late due
  date, maintenance/warranty records and contracts, reports, quick calculation without customer, reload persistence,
  search by device, custom units and systems, dark/light, currency, storage limited to `hlow_*`.
* Suites: launcher 223, offline 28, native 14, cloud 40, crew 23, print-white 11, auto-backup 35; `run-trade-suites` 20/20.

## 18. 2.7.0 — new section: الألوميتال وUPVC (Aluminium & UPVC) (2026-11-23)
* `Trade-Modules/Aluminium` is an original Arzoqi section; `tools/verify-integrity.sh` lists it as NEW (ALL CHECKS PASSED).
* `tests/calc.test.js` 29/29 — section 39 of the spec: the safe formula evaluator; small/large windows, 1/2/3 sashes, divisions,
  fixed + moving, different glass (minimum billable area) and different systems giving different lengths; m/cm/mm equivalence;
  bad formulas/negative lengths reported; estimate templates flagged; doors (hinged, double with bolt, sliding, folding, full glass,
  with transoms); UPVC sliding/casement/tilt & turn/fixed with reinforcement steel; glass calculator with mixed pieces;
  Cut List (multiple lengths/counts, kerf, trim, remnants kept vs waste, best fit uses fewer bars, stock bars of different lengths
  and remnants used first, oversize pieces, spare %, inventory remnants); bars, waste, sashes; facade with uneven divisions + ACP;
  shutter with motor weight check; mosquito screens; shower cabins; per-item cost/price/profit/per-piece profit with internal costs
  and waste; install-only scope; the full accounting chain (discount %, additions, returns, tax, multiple payments, worker logs);
  project cut plan with remnants; workers due; price/margin/payment plan/manufacturing/installation; no NaN/Infinity.
* `tests/e2e.js` 95/95 through the real UI: library prices and bar lengths, a new system with catalogue formulas and live test,
  formula errors, role mapping; a survey (مقايسة) with sliding/casement/double door/UPVC tilt & turn openings and fixed/folding
  checks; apply quantities with library prices; per-piece profit; survey → quote (terms, duration, validity) → invoice; payments
  with method/type/reference; additions/returns/transport/install costs/tax; stages; work order with cut list and bars; measurements
  sheet; materials list; internal costs (never on customer documents); late delivery; remnants into stock; Cut Optimizer with
  stock remnants; glass/shutter/mosquito/shower/facade/sashes/price/payment plan/waste/area/installation calculators; workers with
  job-linked work and advances; customer file and history; reports; delivery at the last stage; edit/delete; reload persistence;
  dark/light; no horizontal scroll on a phone; storage limited to `halu_*`.
* Suites: launcher 241, offline 30, native 14, cloud 41, crew 24, print-white 12, auto-backup 35; `run-trade-suites` 22/22.

## 19. 2.8.0 — new section: الرخام والجرانيت (Marble & Granite Works) (2026-11-23)
* `Trade-Modules/Marble` is an original Arzoqi section; `tools/verify-integrity.sh` lists it as NEW (ALL CHECKS PASSED).
* `tests/calc.test.js` 29/29 — section 36 of the spec: shapes (rect, square, triangle, trapezoid, circle, semicircle, corner cut, L, U,
  manual area; curved without an area is refused, not estimated) in mm/cm/m; straight kitchen with back, edge and slab basis (estimate
  labelled); L and U kitchens (each corner counted once); island/bar/ends; multi-corner kitchen by segments with different depths;
  sink/hob/mixer cut-outs priced from settings and special cuts (corner, chamfer, drain, groove); backsplash with sockets/mixers;
  stairs with equal steps (treads, risers, landing, skirting on the rake, nosing edge) and with different step sizes, risers off;
  entrance with several shapes and materials, edges and holes; walls minus openings and weight from density (no assumed density);
  square and round columns; facade with zones per material, openings, projections, fixing chosen by the user, scaffolding; floors
  minus exclusions with tiles and border; linear metre and edges; slabs by area (waste, usable %, a second thickness size); pieces per
  slab with kerf; waste by %, area, per piece, per slab (reusable remnants excluded) and manual; slab nesting (all pieces inside the
  margin, no overlap with kerf, used + remnants + waste = slab area, grain-locked pieces never rotated, remnants used before a new slab,
  large leftovers kept as remnants); nesting from stored remnants of the same material; Bookmatch/Waterfall numbering; finish, price,
  margin, transport, payment plan; a full kitchen item (library prices, edges, cut-outs, auto labour, internal costs, install-only);
  the project (multiple payments, remaining, discount, additions, returns, tax, worker logs, profit); a project slab plan per material;
  workers.
* `tests/e2e.js` 103/103 through the real UI: 9 work types on the home screen and the 35 calculators of section 31; library prices,
  slab sizes, density, a new material with its family, finish, a second-thickness size and a photo (IndexedDB); edge/cut-out/finish
  price tables, kerf/margin/remnant settings and a custom edge type; a site survey (MRB-0001) with straight, L, U, island and
  multi-corner kitchens, sink and hob cut-outs, applying quantities with library and settings prices, auto labour, internal costs and
  profit; stairs equal and step-by-step; an entrance with several shapes/materials, shape drawings, curved piece needing a manual area
  and a piece photo; facade, floor and walls; items grouped by place; project slab plan; site photo; survey grouped by place,
  measurements sheet, work order with slab drawings, quote with terms/duration/validity, % discount, invoice, deposit and
  after-materials payments with method and reference, additions/returns, transport cost, profit card, internal costs sheet, materials
  list; slab nesting with grain lock, remnants saved to stock and used first; slabs, waste (% and per slab), linear metre, vein
  matching, note; manual remnant with original slab no. and location; workers (m² rate, job-linked work, advance); customer file;
  reports with customer and work-type filters; delivery at the last of the 16 stages; edit/delete; reload persistence including
  photos; dark/light; no horizontal scroll on a phone; storage limited to `hmar_*`; no console errors.
* Wiring: launcher card (13 sections), backup prefix `hmar_` + IndexedDB `hmar_media`, launcher service worker, Android standalone
  bundle/MainActivity/emulator smoke, CI file check, `run-trade-suites` (24 suites), `verify-integrity` NATIVE list.
* Suites: launcher 259, offline 32, native 14, cloud 42, crew 25, print-white 13, auto-backup 35; `run-trade-suites` 24/24.

## 20. 2.8.1 — Cairo font, smaller bundle, privacy pages (2026-11-24)
Requested fixes; app behaviour unchanged (backup/Drive/allowBackup/export, package name, signing, OAuth client and section icons untouched).
* **Font:** Cairo is the first `font-family` everywhere (launcher + 13 sections + all privacy pages + invoice + workers' note).
  `Shared-Assets/fonts/arzoqi-fonts.css` declares the bundled Cairo variable font (weights 200–1000; arabic / latin / latin-ext);
  IBM Plex Sans Arabic and Inter remain only as last fallbacks. All `fonts.googleapis.com` / `fonts.gstatic.com` links and
  service-worker branches were removed from the app (also the standalone app's dead font-host shim). Verified in Chromium with every
  external request blocked: 28/28 pages have Cairo as the computed first family and load `cairo-*.woff2` from local files.
  Remaining mentions exist only outside the APK: the original sections' legacy `android/` + `tools/android-assets.sh` folders
  (excluded from the bundle) and the `.provenance` diff records.
* **Size:** PNGs optimised with `optipng -o5` (lossless; each file verified pixel-identical with the same dimensions before replacing,
  every section keeps its own icon) — 5.62 MB → 3.75 MB. Exact duplicates removed: the identical `css/app.css` of 5 sections →
  `Shared-Assets/brand/section-app.css`; 5 copies of `developer.jpg` → `Shared-Assets/images/developer.jpg`; Flooring's Cairo copy →
  `Shared-Assets/fonts`. References and service-worker cache lists updated.
* **Privacy:** `privacy.html` added to Metalwork, Carpentry, Masonry, LowCurrent, Aluminium, Marble (same template as Plumbing, with each
  section's own data description) + footer link + service-worker cache entry. The old "uses the internet to download fonts" sentence
  in the existing privacy pages was corrected (fonts are bundled now).
* **WRITE_EXTERNAL_STORAGE (maxSdk 28) kept:** `doSaveFile` (saving the backup JSON to Downloads/Arzoqi) uses MediaStore on Android 10+,
  but on Android 6–9 (minSdk 23–28) writes to the public Downloads folder, which needs this permission. Removing it would break backup
  export on older phones.
* **Versions:** app 2.8.1 (versionCode 20801); launcher SW 2.8.1; every section's `version.json`, service-worker version and
  `APP_VERSION` constant bumped one patch level.
* **Checks:** every file in every service-worker cache list exists (465 entries / 14 SWs); `node --check` on all 85 bundled JS files;
  `tools/update-change-pins.sh` + `tools/verify-integrity.sh` (which now record and accept intentional deletions of duplicated files
  as `-` entries) → ALL CHECKS PASSED.
* **Layout:** Cairo's digits are wider than Inter's, so an extreme stress total (18,289,612,574.55 ج.م at 360 px) no longer fit on one
  line in the Plumbing calculator. One shared rule in `section-theme.css` lets `.sum-total strong` wrap inside its card (normal amounts
  stay on one line). The Plumbing/HVAC test servers did not send `text/css` / `font/woff2` content types (so Chromium ignored the shared
  stylesheet in those audits); they now do, so the audits see the page exactly as the app renders it.
* Suites: `run-trade-suites` 24/24 (plumbing-layout 0 issues, hvac-all 141/141 after the fix); launcher 259, offline 32, native 14,
  cloud 42, crew 25, print-white 13, auto-backup 35. The APK itself is built and emulator-tested by CI (no Android SDK here).

## 21. 2.8.2 — section-name badge in the header (2026-11-24)
* Every section now shows its name in a small pill next to «أرزقي | Arzoqi» in the top header, the same style as the HVAC badge
  (HVAC and Plumbing already had theirs and are unchanged). One CSS rule in `section-theme.css` draws it (`#tabTitle::after` /
  Plastering's `#appHeader .brand-ic + .titles h1::after`) from `style="--az-sec-tag:'…'"` on each header — no JavaScript changed, and
  the badge stays when a section changes the tab title. Checked at 360 px on every tab of the 11 sections: badge present, no overflow, no
  JS errors; light and dark screenshots reviewed.
* Versions: app 2.8.2; the 11 changed sections bumped one patch level (SW + version.json + APP_VERSION). Integrity: ALL CHECKS PASSED;
  465/465 cached files present.
* Suites: `run-trade-suites` 24/24; launcher 259, offline 32, native 14, cloud 42, crew 25, print-white 13, auto-backup 35.
