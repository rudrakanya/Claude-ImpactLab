# What Should I Learn Next?

Skills and digital literacy guidance for self-directed learners in Bhopal. A sticky, mobile-first intake (under five minutes) plus an adaptive level check feed a **deterministic, fully offline** path mapper over a bundled catalogue of 881 free learning resources across 14 tracks and 4 competence tiers. Every step carries a templated checkpoint project; every track × tier has a hand-authored capstone; every track shows the categories of work it leads to in Bhopal, Indore or remote, never a job promise.

Built for the Claude hackathon. Design language: the frosted-glass system from `DesignAssets/` (auth card, dashboard cards, gantt timeline).

**Live demo:** https://claude.ai/artifact/8CFYV4iA6wyBGN1hbTVByh · **In-app walkthrough and demo script:** open *About this project* from the footer.

## What makes it different

- **Deep intake in under five minutes**, sticky on a phone: objective, device, weekly time, English comfort and tech familiarity on linear scales, an 8-item prior-exposure checklist, and a subject picker over 96 roadmap.sh roles/skills, 32 plain-language aliases, and 105 locally in-demand fresher skills.
- **Adaptive level check** (2 to 6 questions, options shuffled deterministically) that cross-checks self-rating against demonstrated competence before any path is built.
- **Deterministic, offline path mapping**: anchor → alternative → fills by ascending time cost, adjusted for Hindi-first and phone-only learners, with a tooling-basics module for first-time users and mentor reference pathways as templates.
- **A project at every step**: a checkpoint template derived from each resource's own type, plus 56 hand-authored capstones. Promotion needs evidence, capstone and an exit check, never elapsed time. Difficulty can be rated only after the checkpoint is complete, and the path re-plans from that signal.
- **Local relevance**: per-track work categories (Bhopal / Indore / Remote, employers anonymised) and a coverage map of the 105 in-demand skills with one-tap free resources to fill gaps.
- **Ask Claude**: one tap copies a structured prompt with the learner's plan for a plain-language explanation, weekly schedule, or mentor-style review. No API key, nothing sent until the learner pastes it.
- Hindi/English, tap-to-explain glossary, light/dark, device-signed credentials with an offline verifier, and a printable mentor one-pager.

## Source

Open source under the MIT licence at https://github.com/rudrakanya/Claude-ImpactLab. Issues and pull requests are welcome; run the tests before opening one.

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
| `app/js/engine.js` | Pure path engine: level check state machine, path generation, checkpoint templates, re-planning, evidence/rank/promotion rules. Runs in the browser and in Node. |
| `app/js/views/*.js` | Home, sticky intake, adaptive quiz, dashboard (list + gantt timeline, capstone, exit check, promotion, credentials, work panel), mentor one-pager, account/verify, add-track |
| `app/js/i18n.js`, `app/js/glossary.js` | Pre-authored English/Hindi UI copy; tap-to-explain glossary wrapped around any plain-language term |
| `app/js/credentials.js` | Per-device ECDSA P-256 credentials via Web Crypto; offline verifier |
| `app/js/auth.js`, `app/js/firebase-config.js` | Optional Firebase Auth + Firestore sync (client SDK only). Disabled by default. |
| `app/js/data/*.js` | Generated, bundled reference data (identical for every learner) |
| `app/js/prompts.js` | Builds the "Ask Claude" learner and mentor prompts from the offline plan |
| `data/*.json`, `data/Top_100_Local_Tech_Fresher_Skills-v2.xlsx` | Hand-authored source data (work categories, mentor reference pathways, quiz bank, capstones, glossary, synthetic profiles) and the ranked local in-demand skills sheet |
| `tools/build_data.py` | Builds `app/js/data/` from the CSV/Markdown catalogue, the roadmap.sh export, and `data/*.json` |
| `tools/make_artifact.py` | Produces `dist/artifact.html` (body-only, CSS inlined) for hosts that wrap the page |
| `tests/run_tests.mjs` | Node tests: catalogue integrity, determinism, quiz level check, re-planning, mentor agreement on synthetic profiles |

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
