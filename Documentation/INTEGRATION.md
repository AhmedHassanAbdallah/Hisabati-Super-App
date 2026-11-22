# Hisabati Super App — How the integration works

## 1. What was inspected (baseline)

| Trade | Source repo | Commit | Version | Tech | Storage prefix |
|---|---|---|---|---|---|
| Electrical | Ezaza | `0daa269` | 2.4.1 | single `index.html` PWA | `ahmed_elec_*`, `hesabaty_*` |
| Plumbing | Hesabaty-plumbing | `65a05b2` | 1.0.0 | HTML + `js/*.js` PWA | `hesabati_plumbing_*` |
| HVAC | Hesabaty-HAVC | `c1938b3` | 1.0.2 | HTML + `js/*.js` PWA | `hesabati_hvac_*` |
| Painting | Hesabaty-painting | `fbb595e` | 1.1.0 | single `index.html` PWA | `hpaint_*` |
| Flooring | Hesabaty-Flooring | `8561116` | 1.0.0 | HTML + `js/*.js` PWA | `hflooring_*` |
| Gypsum | Hesabaty-Gebsum | `04fda90` | 1.0.0 | HTML + `js/**` PWA | `hgyp_*` |
| Plastering | Hesabaty-plaster | `ac46676` | 1.0.0 | HTML + `js/*.js` PWA (added 2026-11-20) | `hplaster_*` |
| Metalwork | — (original Arzoqi section) | — | 1.0.0 | HTML + `js/calc.js` + `js/app.js` PWA (added 2026-11-22) | `hmetal_*` |
| Carpentry | — (original Arzoqi section) | — | 1.0.0 | HTML + `js/calc.js` + `js/catalog.js` + `js/app.js` PWA (added 2026-11-22) | `hcarp_*` |
| Masonry | — (original Arzoqi section) | — | 1.0.0 | HTML + `js/calc.js` + `js/catalog.js` + `js/app.js` PWA (added 2026-11-22) | `hmas_*` |

All nine apps are static, framework-free Progressive Web Apps with an Android WebView
wrapper (`android/`). There is no backend, build step or database server: data lives
in each app's own `localStorage` / IndexedDB keys, and each app's service worker uses its
own cache-name prefix and resolves every path relative to its own folder.

Important facts that made a zero-modification integration possible:

* **No storage collisions.** Every app uses its own key prefix and only deletes caches
  that start with its own prefix. The apps already share one origin today
  (`ahmedhassanabdallah.github.io`), and Flooring/Painting's own tests verify they never
  touch Electrical's data.
* **Path independent.** Absolute paths such as `/Ezaza/` appear only in `manifest.json`
  (used when installing the standalone app), never at runtime.
* **No frame-busting.** No app reads `window.top`/`window.parent` or blocks framing.

## 2. Integration method: same-origin iframe hosting

```
Hisabati-Super-App/
├── index.html              → redirects to Main-App/
├── Main-App/               ← NEW: the unified launcher (the only new application code)
│   ├── index.html, launcher.css, launcher.js, trades.js
│   ├── manifest.json       (installable PWA, scope Main-App/)
│   └── service-worker.js   (caches the launcher only)
├── Trade-Modules/          ← exact copies, unchanged
│   ├── Electrical/ Plumbing/ HVAC/ Painting/ Flooring/ Gypsum/
│   ├── Plastering/         (added 2026-11-20 from Hesabaty-plaster main)
│   ├── Metalwork/          (added 2026-11-22 — original Arzoqi section, no source repository)
│   ├── Carpentry/          (added 2026-11-22 — original Arzoqi section, no source repository)
│   └── Masonry/            (added 2026-11-22 — original Arzoqi section, no source repository)
├── Shared-Assets/          ← launcher icon + Cairo font (copied from Flooring's bundled font)
├── Documentation/
├── tests/launcher.e2e.js   ← end-to-end test of the launcher with every app
├── tools/                  ← verify-integrity.sh, run-trade-suites.sh, serve.sh
└── .provenance/            ← baseline commit hashes + SHA-256 of every original file
```

When a trade is selected, the launcher creates an `<iframe>` whose `src` is the copied
app's own folder (e.g. `../Trade-Modules/HVAC/`). The app loads as its own, complete
document — its own HTML, CSS, JavaScript, service worker, storage keys, print styles —
exactly as when it is opened on its own. The launcher adds only a slim top bar
("كل المهن" = all trades) above it.

Why this is the safest choice:

| Option | Verdict |
|---|---|
| Merge the apps' code into one page | ✘ requires rewriting; global names, CSS and IDs collide (`#themeBtn`, `#navPlus`, `toggleTheme()` exist in several apps) |
| External link / redirect | ✘ explicitly not wanted |
| **Same-origin iframe** | ✔ zero changes, full isolation of code and CSS, shared origin keeps each app's data exactly where it already is |

### What the launcher does — and never does

* Never edits, injects into, or wraps any app code or browser API of an app.
* Reads/writes section data **only when the user asks** for a cloud backup or a restore
  (`Main-App/backup.js`), and only keys with the sections' own prefixes:
  `ahmed_elec_*`, `hesabaty_*`, `hesabati_plumbing_*`, `hesabati_hvac_*`, `hpaint_*`, `hflooring_*`,
  `hgyp_*`, `hplaster_*`, plus the photo databases `hesabati_plumbing_media` / `hesabati_hvac_media`
  (object store `media`, version 1 — exactly as the sections create them). Any other key on
  the origin is never copied or touched. Before a restore the current data is saved
  (IndexedDB `hisabati_super_v1`) so the user can undo.
* Its own keys: `hisabati_super_last_v1` (last section), `hisabati_super_theme_v1` (theme),
  `hisabati_super_account_v1` (signed-in name/email/photo — never a token),
  `hisabati_super_last_backup_v1`. Its caches are `hisabati-super-*`.
* Google sign-in (launcher 1.2.0): Google Identity Services token client, scopes
  `openid email profile drive.file`, no server. Backups go to the Drive folder
  "حساباتي — نسخ احتياطية" as JSON. Setup: `Documentation/GOOGLE-SETUP.md`.
* Its service worker is scoped to `Main-App/`, so it can never intercept an app's requests;
  every app keeps being controlled by its own original service worker.
* It shows no version numbers (owner's request, launcher 1.1.0). A side menu (☰) introduces
  Hisabati and each trade section with its main features; the copied apps are presented as
  sections of one app, never as separate apps.

## 3. Behaviour details

**Back button (Android back / browser back).** The apps use `history.pushState` for their
own windows and sheets. An iframe shares the page's session history, so the launcher adds a
single history step when a trade opens. Pressing Back first closes the app's own windows
(exactly as before), and once the app is at its home screen, Back returns to the trade list.
The "كل المهن" button returns directly: it rewinds the app's history steps in one move
(Navigation API), or step by step on browsers without it.

**Invoices / PDF / printing.** Each app calls `window.print()` inside its own document, so
the browser prints the app's invoice with the app's own print CSS — not the launcher.
Verified: the print event fires in the app frame only.

**Local data.** Because the copies are served from the same origin as the launcher, an app
opened inside the launcher and the same copy opened directly read and write the very same
data. Nothing is migrated or transformed.

**Deep links / shortcuts.** `Main-App/#electrical`, `#plumbing`, `#hvac`, `#painting`,
`#flooring`, `#gypsum` open a trade directly; the PWA manifest offers home-screen shortcuts.

**Offline.** The launcher caches itself. Each app becomes available offline the first time
it is opened online (its own service worker caches it) — the same behaviour as the
standalone apps. The launcher deliberately does not pre-install app service workers, so
their version-pinning logic runs exactly as designed.

## 4. Known limitations (not fixed, because fixing them would mean changing app code)

1. **Data location vs. the existing GitHub Pages apps.** Browsers store data per origin.
   If the super app is published on the same origin as the current apps
   (`ahmedhassanabdallah.github.io`), the *storage* is shared with the existing standalone
   apps (same keys) — users would see the same data in both. On a different domain it
   starts empty; users move data with each app's own backup/restore feature.
2. **Android native wrapper.** Each app's Android wrapper exposes a native bridge
   (`window.HesabatyApp` / `window.HFloorApp`) that prints the **whole WebView**. If the super
   app is wrapped in a single Android WebView, native printing would print the launcher page,
   not the app inside the frame. The super app is therefore delivered as a web/PWA app
   (where printing is correct). A native Android build needs a decision first — see
   `Documentation/NEXT-STEPS.md`.
3. **In-app update bubbles.** Each copied app still checks its *own* GitHub repository for
   new releases (unchanged behaviour). Inside the super app that notice refers to the
   standalone app.
4. **Plastering** was added on 2026-11-20. It was copied from GitHub `main` @ `ac46676`;
   the local clone of `Hesabaty-plaster` in the first session was still empty and was not modified.
