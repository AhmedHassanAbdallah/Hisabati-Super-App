# Decisions needed before going further

These items were deliberately **not** done, because each one either requires changing a
copied app's code or is a publishing decision that belongs to the owner.

## 1. Where to keep this workspace
The workspace was built in a temporary cloud container. It has its own local git history
(not connected to any original repository). To keep it, create a **new, empty** GitHub
repository (e.g. `Hisabati-Super-App`) and push this folder there. Nothing must be pushed to
the original app repositories.

## 2. Publishing (domain = which data users see)
* Same GitHub Pages account (`ahmedhassanabdallah.github.io/Hisabati-Super-App/`):
  the copies share browser storage with the existing standalone apps → users see their
  existing invoices immediately.
* Different domain: starts empty; users use each app's backup → restore.

## 3. Native Android app (optional)
A single Android WebView wrapper around the launcher would work for everything **except**
native printing/saving through the per-app bridges (`HesabatyApp.print`, `HFloorApp…`),
which print the whole WebView. Options, all requiring owner approval:
* a. Keep the super app as an installable PWA (current delivery — printing works).
* b. Android wrapper that opens each trade as a full-screen page instead of an iframe
     (printing works; the launcher bar is replaced by the Android back button).
* c. Android wrapper whose native print targets the frame — needs new native code and
     possibly app-side changes in the copies.

## 4. Plastering
Add the plastering app when it exists (see `Trade-Modules/Plastering/README.md`).
