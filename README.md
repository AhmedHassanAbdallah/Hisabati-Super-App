# أرزقي — لحسابات المصنعية (Arzaqi · Hisabati Super App)

تطبيق واحد بيجمع كل تطبيقات حساباتي للمهن. افتح التطبيق ← اختار المهنة ← التطبيق الأصلي
بتاعها بيشتغل جوه التطبيق الموحد بنفس حساباته وفواتيره وبياناته بالظبط.

One app that brings all Hisabati trade apps together. The user picks a trade and the
original app for that trade runs inside the unified app — unchanged.

| Trade | Folder | Copied from | Version |
|---|---|---|---|
| الكهرباء — Electrical | `Trade-Modules/Electrical` | Ezaza @ `0daa269` | 2.4.1 |
| السباكة — Plumbing | `Trade-Modules/Plumbing` | Hesabaty-plumbing @ `65a05b2` | 1.0.0 |
| التكييف — HVAC | `Trade-Modules/HVAC` | Hesabaty-HAVC @ `c1938b3` | 1.0.2 |
| النقاشة — Painting | `Trade-Modules/Painting` | Hesabaty-painting @ `fbb595e` | 1.1.0 |
| الأرضيات — Flooring | `Trade-Modules/Flooring` | Hesabaty-Flooring @ `8561116` | 1.0.0 |
| الجبس — Gypsum | `Trade-Modules/Gypsum` | Hesabaty-Gebsum @ `04fda90` | 1.0.0 |
| المحارة — Plastering | `Trade-Modules/Plastering` | Hesabaty-plaster @ `ac46676` | 1.0.0 |

## Golden rule
`Trade-Modules/*` are copies of the original repositories plus the **intended Arzaqi changes only**
(name, theme, icons, unified invoice) — each changed file is pinned in `.provenance/changes/`.
The original repositories are never modified. See `Documentation/ARZAQI.md`.

## Run
```bash
tools/serve.sh            # → http://127.0.0.1:8790/
```
Any static web host works (GitHub Pages, Netlify, …): publish the whole folder.

## Verify
```bash
tools/verify-integrity.sh /path/to/original/repos   # copies == baseline, originals unchanged
node tests/launcher.e2e.js http://127.0.0.1:8790/   # launcher + every app (Playwright)
tools/run-trade-suites.sh                           # every app's own test suite on the copies
```

## Android apps
* `android/` — **حساباتي** (TWA, runs the site in Chrome): `hisabati.apk` / `hisabati.aab` in Releases `v*`.
* `android-standalone/` — **أرزقي** (all sections inside the app, no Chrome needed):
  `arzaqi.apk` / `.aab` in Releases `arzaqi-v*`.
* Both build automatically on GitHub Actions; both open in Android Studio (Gradle wrapper included).
* Google Play: `Documentation/PLAY-STORE.md` (listing text, images, data safety, steps).

## Documentation
* `Documentation/INTEGRATION.md` — what was inspected, why iframe hosting, how back/print/data work, limitations
* `Documentation/VERIFICATION.md` — baseline and test results
* `Documentation/NEXT-STEPS.md` — decisions needed (hosting, Android build, plastering)

تصميم وتطوير التطبيقات: أحمد حسن عبدالله
