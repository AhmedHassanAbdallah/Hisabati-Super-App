# حساباتي — التطبيق الموحد (Hisabati Super App)

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
| المحارة — Plastering | `Trade-Modules/Plastering` | Hesabaty-plaster — *empty repository* | — |

## Golden rule
`Trade-Modules/*` are byte-identical copies of the original repositories (only `.git`
excluded). **Do not edit them here** — the original repositories remain the source of truth.
The only new application code is `Main-App/`.

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

## Documentation
* `Documentation/INTEGRATION.md` — what was inspected, why iframe hosting, how back/print/data work, limitations
* `Documentation/VERIFICATION.md` — baseline and test results
* `Documentation/NEXT-STEPS.md` — decisions needed (hosting, Android build, plastering)

تصميم وتطوير التطبيقات: أحمد حسن عبدالله
