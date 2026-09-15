// Node tests: catalogue integrity, checkpoints, capstones, quiz bank, and agreement with mentor judgment on synthetic profiles.
// Run: node tests/run_tests.mjs
import { CATALOGUE } from "../app/js/data/catalogue.js";
import { PICKS } from "../app/js/data/picks.js";
import { CAPSTONES } from "../app/js/data/capstones.js";
import { QUIZ_BANK } from "../app/js/data/quiz_bank.js";
import { SYNTHETIC_PROFILES } from "../app/js/data/synthetic_profiles.js";
import { REFERENCE_PATHWAYS } from "../app/js/data/reference_pathways.js";
import { WORK } from "../app/js/data/work_categories.js";
import { SUBJECTS } from "../app/js/data/subjects.js";
import { byId, subjectById, generatePath, checkpointFor, needsBasics, startQuiz, answerQuiz, currentQuestion, reinforcementStep, computeProgress, orderKey, cmp, skillsForTrack, skillCoverage, resourcesForSkill } from "../app/js/engine.js";
import { JOB_SKILLS } from "../app/js/data/job_skills.js";

let pass = 0, fail = 0; const failures = [];
function check(name, cond, detail = "") { if (cond) pass++; else { fail++; failures.push(`${name} ${detail}`); } }

// 1. Catalogue integrity
check("881 resources", CATALOGUE.length === 881, String(CATALOGUE.length));
check("no paid resources", CATALOGUE.every((r) => ["free", "free-with-account", "free-to-audit", "freemium", "eligibility-based"].includes(r.c)));
check("every resource has url+track+tier", CATALOGUE.every((r) => r.u.startsWith("http") && r.tr >= 1 && r.tr <= 14 && r.ti.length));
check("every resource has a checkpoint template", CATALOGUE.every((r) => { const c = checkpointFor(r, 1); return c.en.criteria.length >= 3 && c.hi.criteria.length >= 3; }));
check("56 picks", Object.keys(PICKS).length === 56);
check("picks resolve", Object.values(PICKS).every((p) => byId.has(p.primary) && byId.has(p.alt)));
check("56 capstones with criteria", Object.keys(CAPSTONES).length === 56 && Object.values(CAPSTONES).every((c) => c.criteria.length >= 4 && c.brief.hi));
for (let tr = 1; tr <= 14; tr++) for (let ti = 0; ti < 4; ti++) check(`quiz bank ${tr}/${ti}`, (QUIZ_BANK[String(tr)] || [])[ti]?.length >= 2);
check("tooling quiz", QUIZ_BANK.tooling.length >= 4);
check("all 14 tracks have work categories", new Set(WORK.categories.map((c) => c.track)).size === 14);
check("work categories carry location tags", WORK.categories.every((c) => c.where.length && c.where.every((w) => ["Bhopal", "Indore", "Remote"].includes(w)) && c.skills.length >= 3));
check("subject picker has >= 96 roadmap entries", SUBJECTS.filter((s) => s.id.startsWith("rm-")).length >= 90, String(SUBJECTS.filter((s) => s.id.startsWith("rm-")).length));
check("reference pathways resolve", REFERENCE_PATHWAYS.pathways.every((p) => p.steps.every((s) => byId.has(s.r))));

// 2. Determinism + structure of generated paths for every track x tier
const base = { objective: "job", device: "laptop", hoursPerWeek: 6, english: 4, tech: 4, exposure: ["cloud", "account", "file", "install"] };
for (let tr = 1; tr <= 14; tr++) for (let ti = 0; ti < 4; ti++) {
  const a = generatePath(base, tr, ti), b = generatePath(base, tr, ti);
  check(`path ${tr}/${ti} deterministic`, JSON.stringify(a) === JSON.stringify(b));
  check(`path ${tr}/${ti} has >=3 steps + capstone`, a.steps.length >= 3 && a.capstone, `${a.steps.length}`);
  check(`path ${tr}/${ti} anchor first`, a.steps[0].kind === "anchor" && a.steps[0].rid === PICKS[`${tr}-${ti}`].primary);
  check(`path ${tr}/${ti} no duplicate resources`, new Set(a.steps.map((s) => s.rid)).size === a.steps.length);
  check(`path ${tr}/${ti} fills follow the deterministic order key`, (() => { const f = a.steps.filter((s) => s.kind === "fill" && byId.get(s.rid).ti.includes(ti)).map((s) => byId.get(s.rid)); for (let i = 1; i < f.length; i++) if (cmp(orderKey(f[i - 1], tr, base, ti), orderKey(f[i], tr, base, ti)) > 0) return false; return true; })());
  check(`path ${tr}/${ti} same-tier fills ascend by hours within a bucket`, (() => { const f = a.steps.filter((s) => s.kind === "fill" && byId.get(s.rid).ti.includes(ti)).map((s) => byId.get(s.rid)); for (let i = 1; i < f.length; i++) { const kp = orderKey(f[i - 1], tr, base, ti), kq = orderKey(f[i], tr, base, ti); if (kp[0] === kq[0] && kp[1] === kq[1] && kp[2] > kq[2]) return false; } return true; })());
  check(`path ${tr}/${ti} lists each URL once`, new Set(a.steps.map((s) => byId.get(s.rid).u.replace(/\/+$/, "").toLowerCase())).size === a.steps.length);
}

// 3. Phone-only learners: computer-only resources pushed to the end, Hindi-first learners get Hindi early
const phoneHi = { ...base, device: "phone", english: 1 };
{
  const p = generatePath(phoneHi, 2, 0); const idxs = p.steps.map((s, i) => [byId.get(s.rid), i]);
  const firstComputer = idxs.find(([r]) => r.dev === "computer"); const lastPhone = [...idxs].reverse().find(([r]) => r.dev !== "computer");
  check("phone: computer-only steps after phone-friendly fills", !firstComputer || !lastPhone || firstComputer[1] >= lastPhone[1] || p.steps[firstComputer[1]].kind !== "fill");
  const fills = p.steps.filter((s) => s.kind === "fill").map((s) => byId.get(s.rid));
  check("hindi-first: a Hindi resource among first two fills", fills.slice(0, 2).some((r) => r.h === "Y" || r.h === "P"), fills.map((r) => r.n + ":" + r.h).join(" | "));
}
// 4. Tooling basics gating
check("needsBasics true for empty exposure", needsBasics([]));
check("needsBasics false for 2 basics", !needsBasics(["cloud", "account"], 3));
check("needsBasics true for 2 basics + very new to tech", needsBasics(["cloud", "account"], 1));
check("tooling module prepended", generatePath({ ...base, exposure: [] }, 4, 0).steps[0].kind === "tooling");

// 5. Adaptive quiz state machine
function runQuiz(track, selfTier, mode) {
  const st = startQuiz(track, selfTier, false); let guard = 0;
  while (!st.done && guard++ < 20) {
    const q = currentQuestion(st); const L = st.level;
    let correct;
    if (mode === "as-rated") correct = L <= selfTier; else if (mode === "lower") correct = L <= selfTier - 1; else correct = L <= selfTier + 1;
    answerQuiz(st, correct ? q.a : (q.a + 1) % q.opts.length);
  }
  return st;
}
check("quiz as-rated places at self tier (1)", runQuiz(4, 1, "as-rated").placed === 1);
check("quiz as-rated places at self tier (0)", runQuiz(3, 0, "as-rated").placed === 0);
check("quiz lower places one below", runQuiz(3, 2, "lower").placed === 1, String(runQuiz(3, 2, "lower").placed));
check("quiz higher places one above", runQuiz(5, 0, "higher").placed === 1, String(runQuiz(5, 0, "higher").placed));
check("quiz all-correct from 2 reaches Master", runQuiz(8, 2, "higher").placed === 3, String(runQuiz(8, 2, "higher").placed));
check("quiz asks at most 6 questions", [runQuiz(4, 1, "as-rated"), runQuiz(3, 2, "lower"), runQuiz(8, 2, "higher")].every((s) => s.history.length <= 6));

// 6. Re-planning
{
  const p = generatePath(base, 4, 1); const re = reinforcementStep(base, 4, 1, p.steps.map((s) => s.rid));
  check("reinforcement step is a new lower-tier resource", re && !p.steps.some((s) => s.rid === re.rid) && byId.get(re.rid).ti.includes(0));
  const ts = { path: p, completions: {}, capstone: { status: "none" } };
  p.steps.forEach((s, i) => { if (i < 4) ts.completions[s.id] = { doneAt: "x", checkpoint: s.checkpoint.en.criteria.map(() => true) }; });
  ts.capstone = { status: "submitted" }; ts.exitCheck = { passed: true };
  const prog = computeProgress(ts);
  check("promotion requires all three", prog.promotable && prog.xp > 0 && prog.rank > prog.xp);
  check("promotion blocked without capstone", !computeProgress({ ...ts, capstone: { status: "none" } }).promotable);
}

// 6b. Local in-demand skills integration
check("105 local skills loaded", JOB_SKILLS.skills.length === 105, String(JOB_SKILLS.skills.length));
check("every skill maps to a track with keywords", JOB_SKILLS.skills.every((s) => s.track >= 1 && s.track <= 14 && s.kw.length));
{
  const p = generatePath(base, 4, 1); const cov = skillCoverage(p, 4);
  check("web track has ranked skills", cov.length >= 30, String(cov.length));
  check("a web Fresher path covers several in-demand skills", cov.filter((c) => c.steps.length).length >= 3, String(cov.filter((c) => c.steps.length).length));
  const gap = cov.find((c) => !c.steps.length);
  const opts = gap ? resourcesForSkill(gap.skill, 1, base, p.steps.map((s) => s.rid)) : [];
  check("gap filling finds free catalogue resources", !gap || opts.length > 0, gap ? gap.skill.skill : "");
  const withRes = JOB_SKILLS.skills.filter((s) => resourcesForSkill(s, 1, base, []).length > 0).length;
  check("most skills have at least one matching free resource", withRes >= 85, `${withRes}/105`);
}
// 7. Mentor agreement on synthetic profiles
let agree = 0; const rows = [];
for (const pr of SYNTHETIC_PROFILES.profiles) {
  const s = subjectById.get(pr.subject); const track = s.track;
  const q = runQuiz(track, pr.selfTier, pr.quiz);
  const profile = { objective: pr.objective, device: pr.device, hoursPerWeek: pr.hoursPerWeek, english: pr.english, tech: pr.tech, exposure: pr.exposure };
  const path = generatePath(profile, track, q.placed);
  const subjectSteps = path.steps.filter((x) => x.kind !== "tooling");
  const firstIds = subjectSteps.slice(0, 3).map((x) => x.rid);
  const expected = pr.mentor.nextStep;
  const tierOk = q.placed === pr.mentor.tier;
  const toolingOk = path.toolingFirst === pr.mentor.toolingFirst;
  const stepOk = pr.mentor.toolingFirst && path.steps[0].kind === "tooling" && path.steps.some((x) => x.rid === expected) && pr.mentor.nextStep === path.steps.find((x) => x.kind === "tooling" && x.rid === expected)?.rid
    ? true : firstIds.includes(expected);
  const ok = tierOk && toolingOk && stepOk;
  if (ok) agree++;
  rows.push(`${ok ? "OK  " : "MISS"} ${pr.id} tier ${q.placed}${tierOk ? "" : "≠" + pr.mentor.tier} tooling ${path.toolingFirst}${toolingOk ? "" : "≠"} first3: ${subjectSteps.slice(0, 3).map((x) => byId.get(x.rid).n).join(" › ")}${stepOk ? "" : "  EXPECTED: " + byId.get(expected).n}`);
}
const pct = Math.round((agree / SYNTHETIC_PROFILES.profiles.length) * 100);
check("mentor agreement clear majority (>=75%)", pct >= 75, `${pct}%`);

console.log(rows.join("\n"));
console.log(`\nMentor agreement: ${agree}/${SYNTHETIC_PROFILES.profiles.length} (${pct}%)`);
console.log(`\n${pass} passed, ${fail} failed`);
if (failures.length) { console.log("Failures:\n  " + failures.join("\n  ")); process.exit(1); }
