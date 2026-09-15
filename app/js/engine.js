// Deterministic, offline path engine. No network, no randomness: same inputs -> same path.
// Runs in the browser and in Node (tests/run_tests.mjs).
import { CATALOGUE } from "./data/catalogue.js";
import { PICKS } from "./data/picks.js";
import { TRACKS } from "./data/tracks.js";
import { QUIZ_BANK } from "./data/quiz_bank.js";
import { COMPLETION_BANK } from "./data/completion_bank.js";
import { CAPSTONES } from "./data/capstones.js";
import { REFERENCE_PATHWAYS } from "./data/reference_pathways.js";
import { SUBJECTS } from "./data/subjects.js";
import { JOB_SKILLS } from "./data/job_skills.js";

export const byId = new Map(CATALOGUE.map((r) => [r.id, r]));
export const byUrl = new Map();
for (const r of CATALOGUE) { const k = r.u.trim().replace(/\/+$/, "").toLowerCase(); if (!byUrl.has(k)) byUrl.set(k, r); }
export const trackById = new Map(TRACKS.tracks.map((t) => [t.id, t]));
export const subjectById = new Map(SUBJECTS.map((s) => [s.id, s]));
export const TIER_NAMES = TRACKS.tiers; // catalogue names
export const TIER_LABELS = TRACKS.tierLabels; // product-facing

// Prior-exposure checklist. "basic" items gate the tooling-basics module; the rest inform level check context.
export const EXPOSURE_ITEMS = [
  { id: "file", basic: true },      // found a downloaded file in a file manager and opened it
  { id: "cloud", basic: true },     // uploaded a file to Drive/OneDrive and shared a link
  { id: "account", basic: true },   // set up OTP or two-factor login on an account
  { id: "install", basic: true },   // installed a program on a computer (not only a phone app)
  { id: "spreadsheet", basic: false }, // wrote a formula such as SUM or VLOOKUP
  { id: "command", basic: false },     // typed a command into a terminal / command prompt
  { id: "code", basic: false },        // wrote and ran a program
  { id: "git", basic: false },         // saved code with Git / GitHub
];

export function hoursOf(r) {
  if (!r.hr) return 10;
  const [lo, hi] = r.hr;
  return Math.max(1, Math.round((lo + hi) / 2));
}
export function lowHours(r) { return r.hr ? r.hr[0] : 10; }

// Learners with little exposure to basic tooling get a short "tooling basics" module first.
export function needsBasics(exposure = [], tech = 3) {
  const basics = EXPOSURE_ITEMS.filter((e) => e.basic).map((e) => e.id);
  const have = basics.filter((b) => exposure.includes(b)).length;
  // Fewer than two basics, or fewer than three basics combined with "very new to technology".
  return have < 2 || (have < 3 && (tech || 3) <= 1);
}

const TOOLING_URLS = [
  "https://website.spoken-tutorial.org/watch/Introduction+to+Computers/Getting+to+know+computers/Hindi/",
  "https://edu.gcfglobal.org/en/computerbasics/",
  "https://edu.gcfglobal.org/en/internetsafety/",
];
export function toolingModule(profile) {
  const rs = TOOLING_URLS.map((u) => byUrl.get(u.replace(/\/+$/, "").toLowerCase())).filter(Boolean);
  // Hindi-first learners get the Hindi video first; others get GCF first, Hindi second.
  const ordered = (profile.english || 3) <= 2 ? rs : [rs[1], rs[0], rs[2]];
  return ordered.map((r, i) => makeStep(r, "tooling", 0, profile, `tool-${i}`));
}

// ---------------- checkpoints (templated per resource, from its own metadata) ----------------
const N_CHALLENGES = [5, 10, 15, 20];
export function checkpointFor(r, tier) {
  const n = N_CHALLENGES[tier] || 5;
  const k = r.k;
  const cov = r.cov ? r.cov.replace(/\.$/, "") : "the material";
  const T = {
    video: {
      en: { title: "Reproduce and extend the shown example", criteria: [
        "Rebuild the example shown in the lessons yourself, without copy-pasting",
        "Change or add one feature of your own to it",
        "It runs or displays correctly, matching the stated outcome",
        "Explain in your own words, in 3 sentences, what it does" ] },
      hi: { title: "दिखाए गए उदाहरण को दोहराएं और बढ़ाएं", criteria: [
        "पाठ में दिखाया उदाहरण कॉपी-पेस्ट किए बिना खुद बनाएं",
        "उसमें अपना एक फ़ीचर बदलें या जोड़ें",
        "यह सही चलता या दिखता है, बताए गए परिणाम से मेल खाता है",
        "3 वाक्यों में अपने शब्दों में समझाएं कि यह क्या करता है" ] } },
    course: {
      en: { title: "Complete its exercises and produce one artifact", criteria: [
        "Finish the exercises or problem sets of the parts you cover",
        `Produce one artifact (a file, program, document or page) that uses ${cov}`,
        "It matches the outcome the course describes",
        "You can explain the artifact to a mentor in your own words" ] },
      hi: { title: "इसके अभ्यास पूरे करें और एक चीज़ बनाएं", criteria: [
        "जो हिस्से आप पढ़ें उनके अभ्यास या प्रश्न-सेट पूरे करें",
        "एक चीज़ बनाएं (फ़ाइल, प्रोग्राम, दस्तावेज़ या पेज) जो सीखी बातों का उपयोग करे",
        "यह कोर्स में बताए परिणाम से मेल खाती है",
        "आप मेंटर को अपने शब्दों में इसे समझा सकते हैं" ] } },
    practice: {
      en: { title: `Solve ${n} challenges and write a short approach note`, criteria: [
        `Solve at least ${n} challenges or levels`,
        "Keep proof: screenshots, flags, or accepted submissions",
        "Write a half-page note on how you approached two of them",
        "Note one thing you could not solve and what you would try next" ] },
      hi: { title: `${n} चुनौतियां हल करें और छोटा अप्रोच नोट लिखें`, criteria: [
        `कम से कम ${n} चुनौतियां या स्तर हल करें`,
        "सबूत रखें: स्क्रीनशॉट, फ़्लैग या स्वीकृत सबमिशन",
        "दो चुनौतियों पर आधे पेज का नोट लिखें कि आपने कैसे सोचा",
        "एक चीज़ लिखें जो हल नहीं हुई और आगे क्या आज़माएंगे" ] } },
    reading: {
      en: { title: "Work through it and build one worked example per part", criteria: [
        "Read or work through the parts you cover, taking short notes",
        "For each part, type and run (or complete) one example yourself",
        "Collect the examples in one folder or document",
        "Summarise the three most useful ideas in your own words" ] },
      hi: { title: "इसे पढ़ें और हर हिस्से का एक उदाहरण बनाएं", criteria: [
        "जो हिस्से पढ़ें उनके छोटे नोट्स बनाएं",
        "हर हिस्से का एक उदाहरण खुद टाइप कर चलाएं (या पूरा करें)",
        "उदाहरणों को एक फ़ोल्डर या दस्तावेज़ में रखें",
        "तीन सबसे उपयोगी विचार अपने शब्दों में लिखें" ] } },
    project: {
      en: { title: "Finish the project and publish it", criteria: [
        "Complete the project as described",
        "It runs or displays correctly for someone else",
        "Publish it (GitHub, a shared link, or a PDF)",
        "Write five lines on what was hardest" ] },
      hi: { title: "प्रोजेक्ट पूरा करें और प्रकाशित करें", criteria: [
        "बताए अनुसार प्रोजेक्ट पूरा करें",
        "यह किसी और के लिए सही चलता या दिखता है",
        "इसे प्रकाशित करें (GitHub, साझा लिंक या PDF)",
        "पांच पंक्तियां लिखें कि सबसे कठिन क्या था" ] } },
    map: {
      en: { title: "Use as a checklist", criteria: ["Mark the topics you already know", "Pick the next three topics", "Find one free resource for each"] },
      hi: { title: "चेकलिस्ट की तरह उपयोग करें", criteria: ["जो टॉपिक आते हैं उन्हें चिह्नित करें", "अगले तीन टॉपिक चुनें", "हर एक के लिए एक मुफ़्त संसाधन ढूंढें"] } },
  };
  return T[k] || T.course;
}

// ---------------- steps ----------------
const PLAN_CAP_HOURS = 40;
function makeStep(r, kind, tier, profile, id) {
  const raw = hoursOf(r);
  const hours = Math.min(raw, PLAN_CAP_HOURS);
  const hpw = Math.max(1, profile.hoursPerWeek || 4);
  return {
    id: id || `${kind}-${r.id}`,
    rid: r.id, kind, tier,
    hours, capped: raw > PLAN_CAP_HOURS, weeks: Math.max(1, Math.ceil(hours / hpw)),
    needsComputer: r.dev === "computer",
    checkpoint: checkpointFor(r, tier),
  };
}

function poolFor(track, tier) {
  return CATALOGUE.filter((r) => (r.tr === track || (r.sec && r.sec.includes(track))) && r.ti.includes(tier) && r.k !== "map");
}

// Objective-aware boost: a job seeker's path surfaces career-facing resources early.
const OBJECTIVE_BOOST = { job: /resume|interview|job|hiring|career/i };
export function orderKey(r, track, profile, tier) {
  const hindiFirst = (profile.english || 3) <= 2;
  const phone = profile.device === "phone";
  const boost = OBJECTIVE_BOOST[profile.objective];
  let bucket = 2;
  if (hindiFirst && (r.h === "Y" || r.h === "P")) bucket = 1;
  if (boost && boost.test(r.n)) bucket = 0;
  if (tier === 0 && /advanced/i.test(r.n)) bucket += 1;
  if (r.st === "flagged") bucket = Math.max(bucket, 3);
  if (phone && r.dev === "computer") bucket = 4;
  const secondary = r.tr !== track ? 1 : 0;
  return [bucket, secondary, lowHours(r), hoursOf(r), r.n];
}
const urlKey = (r) => r.u.trim().replace(/\/+$/, "").toLowerCase();
export function cmp(a, b) { for (let i = 0; i < a.length; i++) { if (a[i] < b[i]) return -1; if (a[i] > b[i]) return 1; } return 0; }

export function stepCount(profile) {
  const h = profile.hoursPerWeek || 4;
  return h <= 3 ? 5 : h <= 8 ? 6 : 7;
}

// Generate an ordered path for one track x tier. opts.templateId uses a mentor reference pathway.
export function generatePath(profile, track, tier, opts = {}) {
  const key = `${track}-${tier}`;
  const capstone = CAPSTONES[key];
  const tooling = needsBasics(profile.exposure || [], profile.tech) ? toolingModule(profile) : [];
  let steps = [];
  if (opts.templateId) {
    const tpl = REFERENCE_PATHWAYS.pathways.find((p) => p.id === opts.templateId);
    if (tpl) steps = tpl.steps.map((s, i) => Object.assign(makeStep(byId.get(s.r), "template", tier, profile, `tpl-${i}-${s.r}`), { why: s.why }));
  }
  if (!steps.length) {
    const pick = PICKS[key];
    const anchor = pick ? byId.get(pick.primary) : null;
    const alt = pick ? byId.get(pick.alt) : null;
    const usedUrls = new Set(); // the catalogue holds a few rows per URL (hub + child); a path lists each URL once
    const add = (r, kind) => { const k = urlKey(r); if (usedUrls.has(k)) return false; usedUrls.add(k); steps.push(makeStep(r, kind, tier, profile)); return true; };
    const sortKey = (a, b) => cmp(orderKey(a, track, profile, tier), orderKey(b, track, profile, tier));
    const rest = poolFor(track, tier).filter((r) => r !== anchor && r !== alt).sort(sortKey);
    const n = stepCount(profile);
    // Warm-up: a short quick win before a long anchor, for phone-only or very time-constrained learners.
    const constrained = profile.device === "phone" || (profile.hoursPerWeek || 4) <= 3;
    if (anchor && constrained && hoursOf(anchor) > 30) {
      const warm = rest.find((r) => lowHours(r) <= 4 && r.dev !== "computer" && r.st !== "flagged" && urlKey(r) !== urlKey(anchor) && (!alt || urlKey(r) !== urlKey(alt)));
      if (warm) add(warm, "warmup");
    }
    if (anchor) add(anchor, "anchor");
    if (alt && alt !== anchor) add(alt, "alt");
    for (const r of rest) { if (steps.length >= n) break; add(r, "fill"); }
    // Thin cells (e.g. Master where no standalone course exists): pair the picks with the deepest resources of the tier below.
    for (let t = tier - 1; t >= 0 && steps.length < 3; t--) {
      const deep = poolFor(track, t).filter((r) => r.st !== "flagged").sort((a, b) => hoursOf(b) - hoursOf(a) || a.n.localeCompare(b.n));
      for (const r of deep) { if (steps.length >= 3) break; add(r, "fill"); }
    }
  }
  const all = [...tooling, ...steps];
  const totalHours = all.reduce((s, x) => s + x.hours, 0) + 10;
  return {
    track, tier, templateId: opts.templateId || null,
    steps: all, capstone: capstone ? { key, ...capstone } : null,
    toolingFirst: tooling.length > 0,
    totalHours, totalWeeks: Math.max(1, Math.ceil(totalHours / Math.max(1, profile.hoursPerWeek || 4))),
  };
}

export function templatesFor(track, tier) {
  return REFERENCE_PATHWAYS.pathways.filter((p) => p.track === track && p.tier === tier);
}

// A reinforcing step when a learner reports "too hard" twice in a row: shortest lower-tier (or same-tier) resource not yet in the path.
export function reinforcementStep(profile, track, tier, excludeIds) {
  const ex = new Set(excludeIds);
  const tryTier = (t) => {
    const pool = poolFor(track, t).filter((r) => !ex.has(r.id) && ["course", "video", "reading"].includes(r.k) && r.st !== "flagged" && !(profile.device === "phone" && r.dev === "computer"));
    pool.sort((a, b) => cmp(orderKey(a, track, profile, t), orderKey(b, track, profile, t)));
    return pool[0] || null;
  };
  const r = (tier > 0 ? tryTier(tier - 1) : null) || tryTier(tier);
  return r ? Object.assign(makeStep(r, "reinforce", Math.max(0, tier - 1), profile, `re-${r.id}-${Date.now()}`), { why: "reinforce" }) : null;
}

// ---------------- adaptive level check ----------------
export function quizQuestions(track, level) {
  const bank = QUIZ_BANK[String(track)];
  return bank ? bank[level] || [] : [];
}
export function startQuiz(track, selfTier, toolingCheck = false) {
  const level = Math.min(Math.max(0, selfTier || 0), 2);
  const st = { track, start: level, level, round: 0, idx: 0, correct: 0, visited: {}, history: [], done: false, placed: null,
    toolingCheck, toolingIdx: 0, toolingCorrect: 0 };
  st.pending = toolingCheck ? QUIZ_BANK.tooling : quizQuestions(track, level);
  return st;
}
export function currentQuestion(st) { return st.pending[st.idx] || null; }
// Deterministic per-question option order (seeded by the question text) so the correct answer is not always "A".
function hashStr(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
export function presentQuestion(q) {
  const idx = q.opts.map((_, i) => i); let h = hashStr(q.q);
  for (let i = idx.length - 1; i > 0; i--) { h = (Math.imul(h, 1103515245) + 12345) >>> 0; const j = h % (i + 1); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  return { ...q, opts: idx.map((i) => q.opts[i]), a: idx.indexOf(q.a) };
}
// `choice` is either an index into the raw options or a boolean "was correct".
export function answerQuiz(st, choice) {
  const q = currentQuestion(st);
  if (!q || st.done) return st;
  const ok = typeof choice === "boolean" ? choice : choice === q.a;
  st.history.push({ level: st.toolingCheck ? "tooling" : st.level, q: q.q, ok });
  if (st.toolingCheck) {
    if (ok) st.toolingCorrect++;
    st.idx++;
    if (st.idx >= st.pending.length) { st.toolingCheck = false; st.idx = 0; st.pending = quizQuestions(st.track, st.level); }
    return st;
  }
  if (ok) st.correct++;
  st.idx++;
  if (st.idx >= st.pending.length) {
    const s = st.correct; const L = st.level;
    st.visited[L] = s; st.round++;
    let next = null;
    if (s >= 2) { next = L < 3 && st.visited[L + 1] === undefined && st.round < 3 ? L + 1 : null; if (next === null) st.placed = L; }
    else if (s === 0) { if (L > 0 && st.visited[L - 1] === undefined && st.round < 3) next = L - 1; else st.placed = Math.max(0, L - 1); }
    else st.placed = L;
    if (st.placed === null && next !== null) { st.level = next; st.idx = 0; st.correct = 0; st.pending = quizQuestions(st.track, next); }
    else {
      // If we went down and scored partially/fully, keep that level; if we came from above with 0 and lower has >=1 -> lower.
      if (st.placed === null) st.placed = L;
      st.done = true;
    }
  }
  return st;
}
export function quizSummary(st) {
  const total = st.history.filter((h) => h.level !== "tooling").length;
  const correct = st.history.filter((h) => h.level !== "tooling" && h.ok).length;
  return { total, correct, placed: st.placed, toolingCorrect: st.toolingCorrect };
}

// ---------------- progress, evidence, rank, promotion ----------------
export function stepXp(step) { return Math.round(step.hours); }
export function computeProgress(trackState) {
  const path = trackState.path; if (!path) return null;
  const comps = trackState.completions || {};
  const steps = path.steps;
  let xp = 0, done = 0, withCheckpoint = 0;
  for (const s of steps) {
    const c = comps[s.id];
    if (c && c.doneAt) { done++; xp += stepXp(s); if (c.checkpoint && c.checkpoint.length && c.checkpoint.every(Boolean)) { withCheckpoint++; xp += Math.round(stepXp(s) * 0.5); } }
  }
  const cap = trackState.capstone || {};
  if (cap.status === "submitted") xp += 100;
  const quiz = trackState.quiz || {};
  const quizScore = quiz.total ? Math.round((quiz.correct / quiz.total) * 100) : 0;
  const exit = trackState.exitCheck || {};
  const evidenceThreshold = Math.max(3, Math.ceil(steps.length * 0.6));
  const evidenceOk = withCheckpoint >= evidenceThreshold;
  const rank = xp + quizScore + (exit.passed ? 50 : 0);
  return {
    xp, done, total: steps.length, withCheckpoint, evidenceThreshold, evidenceOk,
    capstoneOk: cap.status === "submitted", exitOk: !!exit.passed,
    promotable: evidenceOk && cap.status === "submitted" && !!exit.passed,
    rank, quizScore, pct: steps.length ? Math.round((done / steps.length) * 100) : 0,
  };
}
export function nextStepIndex(trackState) {
  const steps = trackState.path.steps; const comps = trackState.completions || {};
  for (let i = 0; i < steps.length; i++) if (!(comps[steps[i].id] && comps[steps[i].id].doneAt)) return i;
  return steps.length;
}
// Feedback pattern: last two completed steps.
export function feedbackPattern(trackState) {
  const steps = trackState.path.steps; const comps = trackState.completions || {};
  const fbs = steps.map((s) => comps[s.id] && comps[s.id].doneAt ? comps[s.id].feedback : null).filter((x) => x);
  const last2 = fbs.slice(-2);
  if (last2.length === 2 && last2.every((f) => f === "hard")) return "hard";
  if (last2.length === 2 && last2.every((f) => f === "easy")) return "easy";
  return null;
}
// ---------------- local in-demand skills: coverage and gap filling ----------------
const DEMAND_RANK = { "Very High": 0, High: 1, Medium: 2 };
export function skillsForTrack(track) {
  return JOB_SKILLS.skills.filter((s) => s.track === track).sort((a, b) => DEMAND_RANK[a.demand] - DEMAND_RANK[b.demand] || a.rank - b.rank);
}
function resourceText(r) { return (r.n + " " + r.cov).toLowerCase(); }
export function resourceMatchesSkill(r, skill) { const txt = resourceText(r); return skill.kw.some((k) => txt.includes(k)); }
// For each in-demand skill of the track: which path steps touch it.
export function skillCoverage(path, track) {
  const steps = path ? path.steps : [];
  return skillsForTrack(track).map((skill) => ({ skill, steps: steps.filter((st) => resourceMatchesSkill(byId.get(st.rid), skill)).map((st) => st.id) }));
}
// Top free resources for one skill at (or one tier around) the learner's tier, not already in the path.
export function resourcesForSkill(skill, tier, profile, excludeIds = [], n = 3) {
  const ex = new Set(excludeIds);
  const tiers = [tier, Math.max(0, tier - 1), Math.min(3, tier + 1)];
  const pool = CATALOGUE.filter((r) => !ex.has(r.id) && r.k !== "map" && r.st !== "flagged" && r.ti.some((t) => tiers.includes(t)) && resourceMatchesSkill(r, skill));
  pool.sort((a, b) => cmp([a.ti.includes(tier) ? 0 : 1, a.tr === skill.track ? 0 : 1, ...orderKey(a, skill.track, profile, tier)], [b.ti.includes(tier) ? 0 : 1, b.tr === skill.track ? 0 : 1, ...orderKey(b, skill.track, profile, tier)]));
  return pool.slice(0, n);
}
export function skillStep(r, tier, profile, skill) {
  return Object.assign(makeStep(r, "skill", tier, profile, `sk-${r.id}`), { why: skill.skill });
}

// Completion check: a separate bank from the level check, 5 items per track x tier. Draws 2 from the learner's tier
// and 2 from the next tier (Master: 4 from its own pool), rotating with the attempt number so retakes see new items.
export function completionPool(track, tier) {
  const bank = COMPLETION_BANK[String(track)];
  return bank && bank[tier] ? bank[tier] : quizQuestions(track, tier);
}
function rotate(arr, n, attempt) {
  const out = []; const len = arr.length; if (!len) return out;
  for (let i = 0; i < Math.min(n, len); i++) out.push(arr[(attempt * n + i) % len]);
  return out;
}
export function exitCheckQuestions(track, tier, attempt = 0) {
  if (tier >= 3) return rotate(completionPool(track, 3), 4, attempt);
  return [...rotate(completionPool(track, tier), 2, attempt), ...rotate(completionPool(track, tier + 1), 2, attempt)];
}
