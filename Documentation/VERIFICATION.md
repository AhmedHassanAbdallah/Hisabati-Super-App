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
