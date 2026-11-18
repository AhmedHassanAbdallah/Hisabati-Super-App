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
