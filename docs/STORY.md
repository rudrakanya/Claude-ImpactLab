# What Should I Learn Next? — the solution, the build, and the thinking behind it

## The problem in one paragraph

Bhopal has a large population of young people learning technology on their own, on phones, from free videos and paid "roadmap" courses that are identical for everyone. With few visible local employers, they cannot tell what to learn next, in what order, or toward what realistic work. Digital literacy is uneven: many begin without a working model of files, accounts or basic tooling. Content is abundant; sequencing, feedback and local relevance are absent. The result is drop-off, wasted spending, and skills that do not map to work within reach.

## The solution in one paragraph

A phone-first guidance tool that captures a rich learner profile in under five minutes, confirms the learner's level with a short adaptive check, and maps that profile to a short, ordered path assembled entirely offline from a bundled catalogue of 881 free resources across 14 subject areas and 4 competence tiers. Every step carries a self-checkable project, every area and tier has a capstone, and every area shows the categories of work it leads to in Bhopal, Indore or remote roles, alongside a ranked list of 105 locally in-demand fresher skills and which of them the path covers. The learner reports progress and difficulty; the path re-plans incrementally. Everything is in English and Hindi, nothing needs an account, and nothing leaves the device unless the learner chooses.

Live demo: https://claude.ai/artifact/8CFYV4iA6wyBGN1hbTVByh · Source: https://github.com/rudrakanya/Claude-ImpactLab

## What the learner experiences

1. **Intake (about four minutes).** Objective, device access, weekly hours, English reading comfort and general tech familiarity on 1 to 5 scales, an eight-item "have you ever" checklist, and a subject search across 96 roles and skills, 32 plain-language aliases and 105 local skills. Progress and navigation stay pinned while scrolling.
2. **Level check (2 to 6 questions).** Starts at the self-rated level and moves up or down based on answers, so the path begins where the learner actually is, not where they think they are.
3. **The path.** Anchor resource, an alternative in a different teaching style, then fills ordered by ascending time so early steps are quick wins. Learners with little tooling exposure get a short basics module first. A calendar view lays the steps across weeks with a few days of overlap between related steps.
4. **Doing the work.** Each step has a checkpoint with three to four concrete criteria. Marking a step done unlocks the next; difficulty can only be rated after the checkpoint is complete. Two "too hard" ratings in a row insert a reinforcing step; two "too easy" ratings offer the completion check early.
5. **Completion.** A capstone with acceptance criteria, then a completion check drawn from a separate 280-item bank (never the questions from the start). Passing all three promotes the learner and issues a device-signed, offline-verifiable credential that is explicitly a self-attestation, not an accreditation.
6. **Local relevance.** Categories of work with the skills each asks for, tagged Bhopal, Indore or Remote, and a coverage map of in-demand skills with one-tap free resources for the gaps. A no-promises notice sits beside every such panel.
7. **Support.** Tap-to-explain glossary on any plain-language term, a Help page of twelve FAQs for stuck learners, a printable mentor one-pager, and an "Ask Claude" button that copies a structured prompt built from the plan.

## The build journey

**Day one, morning: understand the data before designing anything.** The catalogue arrived as a CSV of 881 rows and a companion Markdown document whose "recommended primary-plus-alternative picks" table named a vetted anchor and alternative for all 56 area-by-tier cells. All 112 pick URLs resolved to catalogue rows, which made a deterministic, mentor-anchored sequencing rule possible. The roadmap.sh export supplied 96 named roles and skills; each was hand-mapped to one of the 14 areas so learners can search for "Kubernetes" or "React" while the path draws from the area's tiered pool.

**Build script first, app second.** A Python build turns the CSV, the picks table, the roadmap export, and later the skills spreadsheet into compact ES modules. The app never computes against a server; the same inputs produce the same path on any device, online or off.

**Authoring the missing layers.** The PRD asked for data that did not exist yet: 56 capstones with acceptance criteria, a placement bank, a glossary, mentor reference pathways, anonymised work categories, and synthetic learner profiles with mentor-written expected next steps. These were drafted with Claude, checked against the catalogue, and stored as plain JSON so a mentor can edit them without touching code.

**Tests as the mentor in the loop.** A Node test suite checks catalogue integrity, path determinism for all 56 cells, quiz behaviour in every direction, re-planning, and agreement with the mentor judgment on twelve synthetic profiles. The first run exposed real defects: sparse Master cells producing two-step paths, duplicate catalogue URLs appearing twice, and a tooling-basics rule that ignored tech familiarity. Each fix was a small rule change and the suite grew with it. It now runs 654 checks; mentor agreement is 11 of 12, and the one disagreement is documented rather than hidden.

**Iteration with the judges' rubric.** The second pass integrated the 105-skill local demand sheet, made the checklist and quiz items more technical, gated difficulty ratings on checkpoint completion, added the About page and the Ask Claude bridge, and put the code under an MIT licence on GitHub. The third pass came from a final read as a learner: the word "placement" was removed everywhere, goals and areas were merged into one chip list, the self-rating became a slider, related steps overlap on the calendar, the exit check became a "completion check" with a guideline and its own question pool, and a Help page was added for learners who get stuck.

## Inclusive thinking behind the major design decisions

**Phone-only is the default, not an edge case.** No images, no web fonts, one cached load, and a service worker so the app runs offline afterwards. Resources that need a computer are kept but moved later in the path and labelled, and the Help page lists library, centre and phone-app options.

**Language is a tag on the resource, never a machine translation of it.** The interface and all instructional copy exist in pre-authored English and Hindi. Third-party resources show their actual language and Hindi availability; learners who prefer Hindi get Hindi-available resources moved earlier in the ordering rather than a mistranslated page.

**No prior vocabulary is assumed.** The checklist asks "have you saved a file and found it again", not "do you know what a file system is". Any plain-language term anywhere in the app opens a two-sentence explanation. Learners with little exposure get a basics module before their subject so no one is dropped into jargon.

**Self-rating is checked, not trusted or dismissed.** The level check exists because learners both overestimate and underestimate themselves; the synthetic profiles include both cases, and the result screen explains the difference without judgement.

**Evidence over time.** Promotion never depends on elapsed time. It needs checkpoints, a capstone and a completion check, and the check draws different questions from the ones used at the start so it measures learning rather than memory.

**Honesty about work.** Categories of work and the skills they require come from anonymised public postings; no employer names, no listings, no promises. That constraint is rendered next to every work panel, not buried in policy text.

**Privacy by default.** Intake, quiz and progress live in the session and are discarded when it ends. Durable storage requires an explicit action: saving to the device or creating an account. The credential is a self-attestation signed on the device; anyone can verify it offline.

**Claude where it helps, nowhere it would exclude.** Claude drafted the reference data and built the app, but the runtime path is deliberately deterministic and offline so it behaves identically for a learner on a weak connection. The Ask Claude button copies a prompt instead of calling an API, so no key, no cost and no data leaves the device until the learner pastes it.

**Mentors and community spaces are first-class users.** The one-pager prints with blank comment lines, the reference pathways are a ground truth a mentor can edit, and the test suite is written in the mentor's own terms: expected next step per profile.

## What is inside

| Item | Count |
|---|---|
| Free resources in the catalogue | 881 |
| Subject areas × competence tiers | 14 × 4 |
| Vetted anchor/alternative picks | 56 pairs |
| Capstones with acceptance criteria | 56 |
| Level-check items | 116 |
| Completion-check items (separate bank) | 280 |
| Locally in-demand fresher skills mapped | 105 |
| Work categories, anonymised, location-tagged | 40 |
| Glossary terms, English and Hindi | 34 |
| Help FAQs | 12 |
| Automated checks | 654 |
