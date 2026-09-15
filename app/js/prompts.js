// "Ask Claude" bridge: turns the learner's offline plan into a well-structured prompt they (or a mentor) can paste
// into Claude. No API key, no network call from the app, nothing leaves the device until the learner pastes it.
import { byId, computeProgress, nextStepIndex, skillCoverage } from "./engine.js";
import { TRACKS } from "./data/tracks.js";
import { t, getLang } from "./i18n.js";

function planText(profile, ts, tid) {
  const tr = TRACKS.tracks.find((x) => x.id === tid);
  const prog = computeProgress(ts); const nx = nextStepIndex(ts);
  const lines = ts.path.steps.map((st, i) => { const r = byId.get(st.rid); const c = ts.completions[st.id] || {};
    return `${i + 1}. [${c.doneAt ? "done" : i === nx ? "NEXT" : "todo"}] ${r.n} (${r.p}; ~${st.hours}h; ${r.c}; ${r.h === "N" ? "English" : "Hindi available"}) ${r.u}\n   Checkpoint: ${st.checkpoint.en.title}${c.feedback ? ` | learner said: too ${c.feedback === "right" ? "about right" : c.feedback}` : ""}`; });
  const cov = skillCoverage(ts.path, tid);
  const gaps = cov.filter((c) => !c.steps.length).map((c) => `${c.skill.skill} (${c.skill.demand})`);
  return `LEARNER PROFILE
- Objective: ${t("obj_" + profile.objective)}
- Device: ${t("dev_" + profile.device)}; time: ${profile.hoursPerWeek} hours/week
- English reading comfort: ${profile.english}/5; general tech familiarity: ${profile.tech}/5
- Prior exposure: ${profile.exposure.length ? profile.exposure.join(", ") : "none"}
- Track: ${tr.en}; placed tier: ${TRACKS.tierLabels[ts.tier].en} (self-rated ${TRACKS.tierLabels[ts.selfTier].en}; placement quiz ${ts.quiz ? ts.quiz.correct + "/" + ts.quiz.total : "n/a"})
- Progress: ${prog.done}/${prog.total} steps done, ${prog.withCheckpoint} checkpoints complete, XP ${prog.xp}

ORDERED PATH (free resources only)
${lines.join("\n")}

TIER CAPSTONE: ${ts.path.capstone ? ts.path.capstone.en + " — " + ts.path.capstone.brief.en : "n/a"}

LOCAL IN-DEMAND SKILLS NOT YET COVERED BY THIS PATH: ${gaps.length ? gaps.join("; ") : "none"}`;
}

export function learnerPrompt(profile, ts, tid) {
  const hi = getLang() === "hi";
  return `You are a patient learning mentor for a self-directed learner in Bhopal, India, who is using free online resources on a ${profile.device === "phone" ? "phone only" : profile.device === "shared" ? "shared computer" : "laptop"}. ${hi ? "Reply in simple Hindi (Devanagari), keeping technical terms in English." : "Reply in simple English; the learner's English comfort is " + profile.english + "/5, so keep sentences short and define any jargon."}

Using the plan below:
1. Explain the NEXT step in plain language: what it teaches, why it comes now, and what "done" looks like.
2. Turn the next step into a concrete weekly schedule for ${profile.hoursPerWeek} hours/week, with tiny daily tasks.
3. Suggest how to complete its checkpoint on the learner's device, and one common beginner mistake to avoid.
4. Do not promise jobs or outcomes; describe skills only. Do not recommend paid courses.

${planText(profile, ts, tid)}`;
}

export function mentorPrompt(profile, ts, tid) {
  return `You are an experienced technology mentor reviewing an automatically generated learning path for a learner in Bhopal, India. The path was assembled offline from a curated catalogue of free resources, ordered anchor-first, then by ascending time cost.

Review the plan below and answer concisely:
1. Is the placed tier appropriate given the profile and quiz result? If not, which tier and why.
2. Is the ordering sensible? Name any step you would move, remove, or replace (free resources only), with a one-line reason.
3. Which of the uncovered local in-demand skills matter most for this learner's objective, and where in the path would you insert one free resource for each?
4. Rate the capstone's acceptance criteria: concrete and self-checkable? Suggest one improvement.
5. Write three lines of encouragement the learner could read on a phone.

${planText(profile, ts, tid)}`;
}
