# What Should I Learn Next?

Skills and digital literacy guidance for self-directed learners in Bhopal. A sticky, mobile-first intake (under five minutes) plus an adaptive placement quiz feed a **deterministic, fully offline** path mapper over a bundled catalogue of 881 free learning resources across 14 tracks and 4 competence tiers. Every step carries a templated checkpoint project; every track × tier has a hand-authored capstone; every track shows the categories of work it leads to in Bhopal, Indore or remote, never a job promise.

Built for the Claude hackathon. Design language: the frosted-glass system from `DesignAssets/` (auth card, dashboard cards, gantt timeline).

## Run locally

Any static server works. No build step is required to run.

```bash
python -m http.server 8765 --directory app
```

Then open http://localhost:8765. Guest mode has no backend dependency; after the first load a service worker keeps the app usable offline.

## Project layout

| Path | What it is |
|---|---|
| `app/index.html`, `app/css/app.css` | Page shell and the frosted-glass design system (light/dark via `data-theme`, system preference by default) |
| `app/js/engine.js` | Pure path engine: placement quiz state machine, path generation, checkpoint templates, re-planning, evidence/rank/promotion rules. Runs in the browser and in Node. |
| `app/js/views/*.js` | Home, sticky intake, adaptive quiz, dashboard (list + gantt timeline, capstone, exit check, promotion, credentials, work panel), mentor one-pager, account/verify, add-track |
| `app/js/i18n.js`, `app/js/glossary.js` | Pre-authored English/Hindi UI copy; tap-to-explain glossary wrapped around any plain-language term |
| `app/js/credentials.js` | Per-device ECDSA P-256 credentials via Web Crypto; offline verifier |
| `app/js/auth.js`, `app/js/firebase-config.js` | Optional Firebase Auth + Firestore sync (client SDK only). Disabled by default. |
| `app/js/data/*.js` | Generated, bundled reference data (identical for every learner) |
| `data/*.json` | Hand-authored source data: work categories, mentor reference pathways, quiz bank, capstones, glossary, synthetic profiles |
| `tools/build_data.py` | Builds `app/js/data/` from the CSV/Markdown catalogue, the roadmap.sh export, and `data/*.json` |
| `tools/make_artifact.py` | Produces `dist/artifact.html` (body-only, CSS inlined) for hosts that wrap the page |
| `tests/run_tests.mjs` | Node tests: catalogue integrity, determinism, quiz placement, re-planning, mentor agreement on synthetic profiles |

## Rebuild data and run tests

```bash
python tools/build_data.py
```

```bash
node tests/run_tests.mjs
```

The test run prints mentor agreement on the synthetic profiles (currently 11/12).

## Enable accounts (optional)

Guest mode and "Save plan to this device" are complete without any backend. To offer Google/Apple sign-in and cross-device sync, create a Firebase project, enable Authentication providers and Firestore, then set `enabled: true` and paste the web config into `app/js/firebase-config.js`. Deploy with the Firebase CLI:

```bash
firebase deploy --only hosting
```

`firebase.json` already points hosting at `app/`.

## Data and constraints honoured

- Only resources whose cost is free / free-with-account / free-to-audit / freemium (free part) / eligibility-based are included; each card shows its own access terms, language, Hindi availability and last-verified status.
- No learner data leaves the session unless the learner explicitly saves to the device or signs in.
- Work-mapping entries were written from anonymised public postings: categories and skills only, no employers, and the no-promises notice is rendered next to every panel.
- Tier names: Intern/Newbie → Newbie, Fresher → Apprentice, Developer → Adept, Master → Master (catalogue tiers).
