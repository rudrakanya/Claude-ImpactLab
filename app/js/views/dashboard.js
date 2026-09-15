// Dashboard: ordered path, checkpoints, feedback-driven re-planning, capstone, exit check, promotion, credentials, work mapping.
import { t, tt, getLang } from "../i18n.js";
import { esc, icon, toast, sheet, fmtHours, confirmSheet, copyText } from "../ui.js";
import { gl } from "../glossary.js";
import { state, persistSession, saveToDevice, hasSaved } from "../state.js";
import { TRACKS } from "../data/tracks.js";
import { WORK } from "../data/work_categories.js";
import { AI_TOPICS } from "../data/ai_topics.js";
import { byId, subjectById, computeProgress, nextStepIndex, feedbackPattern, reinforcementStep, exitCheckQuestions, presentQuestion, generatePath, stepXp, skillCoverage, resourcesForSkill, skillStep, skillsForTrack } from "../engine.js";
import { issueCredential } from "../credentials.js";
import { JOB_SKILLS } from "../data/job_skills.js";
import { learnerPrompt, mentorPrompt } from "../prompts.js";

const L = () => getLang();
const trName = (tr) => (L() === "hi" ? tr.hi : tr.en);
let view = "list";
let activeTid = null;

export function render(root, ctx) {
  if (!state.profile) return ctx.go("intake");
  const tids = Object.keys(state.tracks).map(Number).filter((id) => state.tracks[id].path);
  if (!tids.length) { root.innerHTML = `<section class="glass card"><p>${esc(t("noPath"))}</p><button class="btn btn-primary" id="go">${esc(t("start"))}</button></section>`; root.querySelector("#go").onclick = () => ctx.go("intake"); return; }
  if (!activeTid || !tids.includes(activeTid)) activeTid = tids.includes(state.primaryTrack) ? state.primaryTrack : tids[0];
  const tid = activeTid; const ts = state.tracks[tid]; const tr = TRACKS.tracks.find((x) => x.id === tid);
  const prog = computeProgress(ts); const nextIdx = nextStepIndex(ts); const s = subjectById.get(ts.subjectId);
  const pattern = feedbackPattern(ts);
  root.innerHTML = `
    ${tids.length > 1 ? `<div class="tabs">${tids.map((id) => { const x = TRACKS.tracks.find((y) => y.id === id); return `<button class="${id === tid ? "on" : ""}" data-tab="${id}">${x.emoji} ${esc(trName(x))}</button>`; }).join("")}</div>` : ""}
    <section class="glass card">
      <div class="row-between">
        <div><div class="tag accent" style="margin-bottom:6px">${tr.emoji} ${esc(trName(tr))}</div>
          <h1 style="font-size:1.35rem">${esc(s ? (L() === "hi" && s.hi ? s.hi : s.label) : trName(tr))}</h1>
          ${s && s.url ? `<a class="tag" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer" style="text-decoration:none">${icon("map")} ${esc(tt({ en: "Topic map", hi: "टॉपिक नक्शा" }))}: roadmap.sh</a>` : ""}</div>
        <span class="tag tier-${ts.tier}" style="font-size:.85rem;padding:6px 12px">${esc(t("tier"))}: ${esc(tt(TRACKS.tierLabels[ts.tier]))}</span>
      </div>
      <div class="stat-grid" style="margin-top:12px">
        <div class="stat inner"><div class="k">${esc(t("progress"))}</div><div class="v">${prog.pct}%</div><div class="bar" style="margin-top:6px"><i style="width:${prog.pct}%"></i></div></div>
        <div class="stat inner"><div class="k">${esc(t("xp"))}</div><div class="v">${prog.xp}</div></div>
        <div class="stat inner"><div class="k">${esc(t("rank"))}</div><div class="v">${prog.rank}</div></div>
        <div class="stat inner"><div class="k">${esc(t("plan"))}</div><div class="v">${ts.path.totalWeeks}<span class="small muted"> ${esc(t("weeks"))}</span></div><div class="tiny muted-2">${fmtHours(ts.path.totalHours)} ${esc(t("hoursShort"))} · ${state.profile.hoursPerWeek} ${esc(t("hoursShort"))}/wk</div></div>
      </div>
      <div class="row" style="margin-top:12px">
        <button class="btn btn-ghost btn-sm" data-act="save">${icon("save")} ${esc(hasSaved() ? t("saved") : t("savePlan"))}</button>
        <button class="btn btn-ghost btn-sm" data-act="summary">${icon("print")} ${esc(t("summary"))}</button>
        <button class="btn btn-ghost btn-sm" data-act="work">${icon("briefcase")} ${esc(t("whereLeads"))}</button>
        <button class="btn btn-ghost btn-sm" data-act="add">${icon("map")} ${esc(t("addTrack"))}</button>
      </div>
    </section>
    ${ts.path.toolingFirst ? `<section class="glass card card-sm tooling"><b>🧰 ${esc(tt({ en: "Tooling basics", hi: "टूलिंग बेसिक्स" }))}</b><p class="small muted" style="margin:4px 0 0">${gl(t("toolingNote"))}</p></section>` : ""}
    ${pattern === "hard" && !ts.flags.reinforcedAt ? `<section class="glass card card-sm"><div class="notice">${esc(t("tooHardInserted"))}</div></section>` : ""}
    ${pattern === "easy" && ts.tier < 3 ? `<section class="glass card card-sm"><div class="row-between"><span class="small">${esc(t("tooEasyOffer"))}</span><button class="btn btn-primary btn-sm" data-act="early">${icon("zap")} ${esc(t("tryNextTier"))}</button></div></section>` : ""}
    <section class="glass card">
      <div class="row-between" style="margin-bottom:12px"><h2 style="margin:0">${esc(t("yourPath"))}</h2>
        <div class="seg"><button class="${view === "list" ? "on" : ""}" data-view="list">${esc(t("list"))}</button><button class="${view === "timeline" ? "on" : ""}" data-view="timeline">${esc(t("timeline"))}</button></div></div>
      ${view === "timeline" ? timelineHtml(ts, nextIdx) : ts.path.steps.map((st, i) => stepHtml(st, i, ts, nextIdx)).join("")}
    </section>
    ${capstoneHtml(ts, prog)}
    ${promotionHtml(ts, prog)}
    ${ts.credentials && ts.credentials.length ? credentialsHtml(ts) : ""}
    <section class="glass card" id="skills">${skillsHtml(ts, tid)}</section>
    <section class="glass card card-sm"><div class="row-between"><div style="flex:1;min-width:220px"><b>✨ ${esc(t("askClaude"))}</b><p class="small muted" style="margin:4px 0 0">${esc(t("askClaudeLead"))}</p></div><button class="btn btn-primary btn-sm" data-act="claude">${icon("zap")} ${esc(t("askClaude"))}</button></div></section>
    <section class="glass card" id="work">${workHtml(tid)}</section>
    ${tid === 7 ? aiTopicsHtml() : ""}
    <p class="tiny muted-2 no-print" style="text-align:center">${esc(t("timeToPlan"))}: ${minutesToPlan()} ${esc(t("minutes"))} · <button class="btn-link tiny" data-act="restart">${esc(t("restart"))}</button></p>`;
  wire(root, ctx, tid, ts);
}

function minutesToPlan() { if (!state.startedAt || !state.planReadyAt) return "–"; return Math.max(1, Math.round((new Date(state.planReadyAt) - new Date(state.startedAt)) / 60000)); }

function resTags(r, step) {
  const tags = [];
  tags.push(`<span class="tag">${esc(r.t)}</span>`);
  tags.push(`<span class="tag">${fmtHours(step.hours)} ${esc(t("hoursShort"))}${step.capped ? "+" : ""}</span>`);
  tags.push(`<span class="tag ${r.c === "free" ? "ok" : ""}">${esc(t(r.c))}</span>`);
  if (r.h === "Y") tags.push(`<span class="tag ok">${esc(t("hindiYes"))}</span>`); else if (r.h === "P") tags.push(`<span class="tag ok">${esc(t("hindiPartial"))}</span>`); else tags.push(`<span class="tag">${esc(r.l.split(";")[0])}</span>`);
  if (step.needsComputer) tags.push(`<span class="tag warn">🖥️ ${esc(t("needsComputer"))}</span>`); else if (r.dev === "phone") tags.push(`<span class="tag">📱 ${esc(t("phoneOk"))}</span>`);
  if (r.st !== "ok") tags.push(`<span class="tag warn">${esc(t("status_" + r.st))}</span>`);
  return tags.join("");
}
const FB_EMOJI = { easy: "😴", right: "👍", hard: "😵" };
const KIND = { tooling: { en: "Tooling basics", hi: "टूलिंग बेसिक्स" }, warmup: { en: "Quick win", hi: "त्वरित जीत" }, skill: { en: "Skill gap", hi: "स्किल कमी" }, anchor: { en: "Vetted anchor", hi: "जांचा हुआ मुख्य" }, alt: { en: "Alternative style", hi: "वैकल्पिक शैली" }, fill: { en: "Builds on the above", hi: "ऊपर पर आधारित" }, template: { en: "Mentor template", hi: "मेंटर टेम्पलेट" }, reinforce: { en: "Reinforcement", hi: "मज़बूती" } };

function stepHtml(step, i, ts, nextIdx) {
  const r = byId.get(step.rid); const c = ts.completions[step.id] || {};
  const done = !!c.doneAt; const current = i === nextIdx; const locked = i > nextIdx;
  const cp = step.checkpoint[L()] || step.checkpoint.en;
  const checks = c.checkpoint || cp.criteria.map(() => false);
  return `<div class="step ${done ? "done" : ""} ${current ? "current" : ""} ${locked ? "locked" : ""} ${step.kind === "tooling" ? "tooling" : ""}" data-step="${esc(step.id)}">
    <div class="num">${done ? icon("check") : i + 1}</div>
    <div class="body">
      <div class="row-between"><div class="title">${esc(r.n)}</div><span class="tags">${c.feedback ? `<span class="tag fb-tag ${c.feedback}">${FB_EMOJI[c.feedback]} ${esc(t(c.feedback))}</span>` : ""}<span class="tag accent tiny">${esc(tt(KIND[step.kind] || KIND.fill))}</span></span></div>
      <div class="meta">${resTags(r, step)}</div>
      <div class="small muted">${gl(r.cov)}${step.why && step.why !== "reinforce" ? ` <i>· ${esc(step.why)}</i>` : ""}</div>
      ${step.capped ? `<div class="tiny muted-2">${esc(t("cappedNote"))}</div>` : ""}
      ${r.st === "restricted" || r.st === "flagged" ? "" : ""}
      <div class="row" style="margin-top:8px">
        <a class="btn btn-ghost btn-sm" href="${esc(r.u)}" target="_blank" rel="noopener noreferrer">${icon("external")} ${esc(t("open"))}</a>
        ${!locked ? (done ? `<button class="btn btn-ghost btn-sm" data-undo="${esc(step.id)}">${icon("refresh")} ${esc(t("undo"))}</button>` : `<button class="btn btn-primary btn-sm" data-done="${esc(step.id)}">${icon("check")} ${esc(t("markDone"))}</button>`) : `<span class="tag">${icon("lock")} ${esc(tt({ en: "Unlocks after the previous step", hi: "पिछला कदम पूरा होने पर खुलेगा" }))}</span>`}
      </div>
      <details ${current ? "open" : ""}><summary>🧪 ${esc(t("checkpoint"))}: ${esc(cp.title)} <a href="#/help" class="tag accent" style="margin-left:auto;text-decoration:none">${icon("help")} ${esc(t("stuck"))}</a></summary>
        <ul class="checklist">${cp.criteria.map((cr, k) => `<li><input type="checkbox" id="ck-${esc(step.id)}-${k}" data-ck="${esc(step.id)}" data-k="${k}" ${checks[k] ? "checked" : ""} ${locked ? "disabled" : ""}><label for="ck-${esc(step.id)}-${k}">${gl(cr)}</label></li>`).join("")}</ul>
      </details>
      ${done ? (checks.length && checks.every(Boolean) ? `<div class="fb"><span class="small muted" style="flex-basis:100%">${esc(t("howWasIt"))}</span>
        ${["easy", "right", "hard"].map((f) => `<button class="btn btn-sm ${c.feedback === f ? "btn-primary fb-on" : "btn-ghost"}" data-fb="${f}" data-sid="${esc(step.id)}" aria-pressed="${c.feedback === f}">${c.feedback === f ? icon("check") : ""}${FB_EMOJI[f]} ${esc(t(f))}</button>`).join("")}</div>
        ${c.feedback ? `<div class="fb-received ${c.feedback}">${icon("check")} <b>${esc(t("fbReceived"))}:</b> ${FB_EMOJI[c.feedback]} ${esc(t(c.feedback))} <span class="muted-2">· ${esc(t("fbChange"))}</span></div>` : ""}`
        : `<div class="tiny muted-2" style="margin-top:8px">${icon("lock")} ${esc(t("fbLocked"))}</div>`) : ""}
    </div></div>`;
}

const OVERLAP_DAYS = 3; // related steps overlap: start the next while finishing the current checkpoint
function timelineHtml(ts, nextIdx) {
  const steps = ts.path.steps;
  // Positions in days; consecutive steps of the same track overlap by a few days.
  let cursor = 0; const rows = steps.map((st, i) => {
    const prev = steps[i - 1]; const related = prev && byId.get(prev.rid).tr === byId.get(st.rid).tr;
    const start = Math.max(0, cursor - (related ? OVERLAP_DAYS : 0)); const days = st.weeks * 7; cursor = start + days;
    return { st, i, start, days };
  });
  const capStart = cursor; const cols = Math.min(40, Math.ceil((capStart + 14) / 7));
  const cell = (startDays, days, cls, label) => Array.from({ length: cols }, (_, w) => { const sw = Math.floor(startDays / 7); return `<td class="cell ${w === 0 ? "cur" : ""}">${w === sw ? `<div class="gbar ${cls}" style="left:${2 + ((startDays % 7) / 7) * 44}px;width:${Math.max(30, (days / 7) * 44 - 6)}px">${label}</div>` : ""}</td>`; }).join("");
  return `<div class="timeline"><table>
    <thead><tr><th class="name" style="text-align:left;padding:0 10px;font-weight:500;color:var(--text-3)">${esc(t("step"))}</th>${Array.from({ length: cols }, (_, w) => `<th class="wk ${w === 0 ? "cur" : ""}">W${w + 1}</th>`).join("")}</tr></thead>
    <tbody>${rows.map(({ st, i, start, days }) => { const r = byId.get(st.rid); const done = !!(ts.completions[st.id] || {}).doneAt; return `<tr><td class="name" title="${esc(r.n)}">${i + 1}. ${esc(r.n)}</td>${cell(start, days, done ? "done" : i === nextIdx ? "current" : "", `${done ? "✓ " : ""}${esc(r.n)}`)}</tr>`; }).join("")}
    ${ts.path.capstone ? `<tr><td class="name">🏁 ${esc(tt(ts.path.capstone))}</td>${cell(Math.min(capStart, (cols - 1) * 7), 14, "capstone", "🏁 " + esc(tt(ts.path.capstone)))}</tr>` : ""}
    </tbody></table></div>
    <p class="tiny muted-2" style="margin:8px 0 0">${esc(tt({ en: "Weeks are estimates from the resource hours and your weekly time.", hi: "हफ़्ते संसाधन के घंटों और आपके साप्ताहिक समय से अनुमानित हैं।" }))} ${esc(t("overlapNote"))}</p>`;
}

function capstoneHtml(ts, prog) {
  const cap = ts.path.capstone; if (!cap) return "";
  const st = ts.capstone || { status: "none" };
  const brief = cap.brief[L()] || cap.brief.en;
  return `<section class="glass card capstone">
    <div class="row-between"><h2 style="margin:0">🏁 ${esc(t("capstone"))}: ${esc(tt(cap))}</h2><span class="tag ${st.status === "submitted" ? "ok" : ""}">${st.status === "submitted" ? "✓ " + esc(t("reqCapstone")) : esc(tt({ en: "Not submitted", hi: "जमा नहीं" }))}</span></div>
    <p class="muted small">${esc(t("capstoneLead"))}</p>
    <p>${gl(brief)}</p>
    <ul class="checklist">${cap.criteria.map((c, k) => `<li><input type="checkbox" id="cap-${k}" data-capck="${k}" ${(st.checks || [])[k] ? "checked" : ""}><label for="cap-${k}">${gl(c)}</label></li>`).join("")}</ul>
    <div class="field" style="margin-top:10px"><label class="label small" for="capnotes">${esc(t("capstoneNotes"))}</label><input id="capnotes" class="input" value="${esc(st.notes || "")}" placeholder="https://github.com/… / ${esc(tt({ en: "notebook / printed copy", hi: "नोटबुक / प्रिंट कॉपी" }))}"></div>
    <button class="btn btn-primary" data-act="capstone" ${st.status === "submitted" ? "disabled" : ""}>${icon("check")} ${esc(t("submitCapstone"))}</button>
  </section>`;
}
function promotionHtml(ts, prog) {
  const ex = ts.exitCheck || {};
  const req = (ok, label, detail) => `<div class="yesno"><span class="q">${ok ? "✅" : "⬜"} ${esc(label)} <span class="muted-2 small">${esc(detail || "")}</span></span></div>`;
  return `<section class="glass card">
    <h2>${esc(t("promoReq"))}</h2>
    ${req(prog.evidenceOk, t("reqEvidence"), `${prog.withCheckpoint}/${prog.evidenceThreshold}`)}
    ${req(prog.capstoneOk, t("reqCapstone"))}
    ${req(prog.exitOk, t("reqExit"), ex.score !== undefined ? `${ex.score}/${ex.total}` : "")}
    <details style="margin-top:10px"><summary style="cursor:pointer;font-weight:600;font-size:.9rem">${icon("help")} ${esc(t("ccGuideTitle"))}</summary>
      <ol class="hiw" style="margin-top:8px">${["ccGuide1", "ccGuide2", "ccGuide3", "ccGuide4", "ccGuide5"].map((k) => `<li>${esc(t(k))}</li>`).join("")}</ol></details>
    <div class="row" style="margin-top:12px">
      ${!prog.exitOk ? `<button class="btn btn-ghost" data-act="exit">${icon("shield")} ${esc(t("takeExit"))}</button>` : ""}
      <button class="btn btn-primary" data-act="promote" ${prog.promotable ? "" : "disabled"}>${icon("zap")} ${esc(t("promote"))}</button>
    </div>
    <p class="tiny muted-2" style="margin-top:8px">${esc(t("credNote"))}</p>
  </section>`;
}
function credentialsHtml(ts) {
  return `<section class="glass card"><h2>🎖️ ${esc(t("credentials"))}</h2>
    ${ts.credentials.map((c, i) => `<div class="inner cred"><b>${esc(tt(TRACKS.tierLabels[c.payload.tier]))} · ${esc(c.payload.trackName)}</b><div class="tiny muted-2">${esc(c.payload.issuedAt.slice(0, 10))} · ${esc(c.payload.publicKeyFingerprint)}</div>
      <div class="qr" id="qr-${i}"></div>
      <div class="row" style="justify-content:center"><button class="btn btn-ghost btn-sm" data-copycred="${i}">${icon("copy")} ${esc(t("copyText"))} JSON</button><button class="btn btn-ghost btn-sm" data-showcred="${i}">{ }</button></div>
    </div>`).join("")}
    <p class="tiny muted-2">${esc(t("credNote"))}</p></section>`;
}
const DEMAND_CLS = { "Very High": 0, High: 1, Medium: 2 };
function skillsHtml(ts, tid) {
  const cov = skillCoverage(ts.path, tid);
  if (!cov.length) return `<h2>${esc(t("skillsTitle"))}</h2><p class="small muted">${esc(tt({ en: "No ranked fresher skills are mapped to this track in the local demand list.", hi: "स्थानीय मांग सूची में इस ट्रैक के लिए कोई रैंक की गई फ्रेशर स्किल नहीं है।" }))}</p>`;
  const covered = cov.filter((c) => c.steps.length).length;
  return `<div class="row-between"><h2 style="margin:0">${esc(t("skillsTitle"))}</h2><span class="tag ${covered ? "ok" : ""}">${covered}/${cov.length} ${esc(t("covered"))}</span></div>
    <p class="small muted" style="margin:6px 0 10px">${esc(t("skillsLead"))}</p>
    <div class="bar" style="margin-bottom:10px"><i style="width:${Math.round((covered / cov.length) * 100)}%"></i></div>
    ${cov.map((c) => `<div class="skill-row" data-skill="${c.skill.rank}"><span class="dot ${c.steps.length ? "on" : ""}"></span><span class="nm ${c.steps.length ? "" : "off"}">${esc(c.skill.skill)}</span>
      <span class="tag demand-${DEMAND_CLS[c.skill.demand]}">${esc(tt(STR_D[c.skill.demand]))}</span><span class="tag">${esc(c.skill.role)}</span>
      ${c.steps.length ? `<span class="tiny muted-2">${esc(tt({ en: "step", hi: "कदम" }))} ${c.steps.map((id) => ts.path.steps.findIndex((s) => s.id === id) + 1).join(", ")}</span>` : `<button class="btn btn-ghost btn-sm" data-gap="${c.skill.rank}">${icon("zap")} ${esc(t("fillGap"))}</button>`}</div>`).join("")}
    <p class="tiny muted-2" style="margin-top:8px">${esc(JOB_SKILLS.source)} ${esc(tt(WORK.disclaimer))}</p>`;
}
const STR_D = { "Very High": { en: "Very high demand", hi: "बहुत ऊंची मांग" }, High: { en: "High demand", hi: "ऊंची मांग" }, Medium: { en: "Medium demand", hi: "मध्यम मांग" } };
function workHtml(tid) {
  const cats = WORK.categories.filter((c) => c.track === tid);
  return `<h2>${icon("briefcase")} ${esc(t("whereLeads"))}</h2>
    <div class="notice" style="margin-bottom:10px">${esc(tt(WORK.disclaimer))}</div>
    <div class="work">${cats.map((c) => `<div class="w"><div class="h"><span>${esc(L() === "hi" ? c.hi : c.en)}</span><span class="tags">${c.where.map((w) => `<span class="tag ${w === "Remote" ? "accent" : "ok"}">${esc(w)}</span>`).join("")}</span></div>
      <div class="tags" style="margin-top:6px">${c.skills.map((s) => `<span class="tag">${esc(s)}</span>`).join("")}</div></div>`).join("")}</div>
    <p class="tiny muted-2" style="margin-top:8px">${esc(WORK.method)}</p>`;
}
function aiTopicsHtml() {
  return `<section class="glass card"><details><summary style="cursor:pointer;font-weight:600">${esc(t("aiTopics"))}</summary>
    ${AI_TOPICS.map((tp) => `<div class="inner" style="margin-top:8px"><b>${esc(tp.topic)}</b>${tp.subtopics.map((s) => `<div class="small" style="margin-top:4px"><span class="muted">${esc(s.name)}</span>: ${s.resources.slice(0, 4).map((r) => `<a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.label)}</a>`).join(" · ")}</div>`).join("")}</div>`).join("")}
    <p class="tiny muted-2" style="margin-top:8px">${esc(tt({ en: "Some links on roadmap.sh are affiliate links to paid courses; the path above uses only free catalogue resources.", hi: "roadmap.sh के कुछ लिंक पेड कोर्स के एफ़िलिएट लिंक हैं; ऊपर का रास्ता सिर्फ़ मुफ़्त कैटलॉग संसाधन उपयोग करता है।" }))}</p></details></section>`;
}

function wire(root, ctx, tid, ts) {
  const rerender = () => { persistSession(); render(root, ctx); };
  root.querySelectorAll("[data-tab]").forEach((b) => b.onclick = () => { activeTid = Number(b.dataset.tab); render(root, ctx); });
  root.querySelectorAll("[data-view]").forEach((b) => b.onclick = () => { view = b.dataset.view; render(root, ctx); });
  root.querySelectorAll("[data-done]").forEach((b) => b.onclick = () => { const id = b.dataset.done; ts.completions[id] = { ...(ts.completions[id] || {}), doneAt: new Date().toISOString() }; toast(`+${stepXp(ts.path.steps.find((s) => s.id === id))} XP`); rerender(); });
  root.querySelectorAll("[data-undo]").forEach((b) => b.onclick = () => { const id = b.dataset.undo; const c = ts.completions[id] || {}; delete c.doneAt; delete c.feedback; ts.completions[id] = c; rerender(); });
  root.querySelectorAll("[data-ck]").forEach((cb) => cb.onchange = () => { const id = cb.dataset.ck; const st = ts.path.steps.find((s) => s.id === id); const c = ts.completions[id] || {}; c.checkpoint = c.checkpoint || st.checkpoint.en.criteria.map(() => false); c.checkpoint[Number(cb.dataset.k)] = cb.checked; ts.completions[id] = c; persistSession(); });
  root.querySelectorAll("[data-fb]").forEach((b) => b.onclick = () => {
    const id = b.dataset.sid; ts.completions[id].feedback = b.dataset.fb;
    toast(`${icon("check")} ${t("fbReceived")}: ${FB_EMOJI[b.dataset.fb]} ${t(b.dataset.fb)}`);
    const pattern = feedbackPattern(ts);
    if (pattern === "hard") {
      const idx = nextStepIndex(ts);
      const re = reinforcementStep(state.profile, tid, ts.tier, ts.path.steps.map((s) => s.rid));
      if (re) { ts.path.steps.splice(idx, 0, re); ts.flags.reinforcedAt = null; toast(t("tooHardInserted"), 4000); }
    }
    rerender();
  });
  root.querySelectorAll("[data-capck]").forEach((cb) => cb.onchange = () => { ts.capstone.checks = ts.capstone.checks || []; ts.capstone.checks[Number(cb.dataset.capck)] = cb.checked; persistSession(); });
  const capBtn = root.querySelector('[data-act="capstone"]');
  if (capBtn) capBtn.onclick = () => { const notes = root.querySelector("#capnotes").value.trim(); const checks = ts.capstone.checks || []; const all = ts.path.capstone.criteria.every((_, k) => checks[k]);
    if (!all) { toast(tt({ en: "Tick every acceptance criterion first.", hi: "पहले हर स्वीकृति मानदंड पर टिक करें।" })); return; }
    ts.capstone = { ...ts.capstone, status: "submitted", notes, submittedAt: new Date().toISOString() }; rerender(); };
  const exitBtn = root.querySelector('[data-act="exit"]'); if (exitBtn) exitBtn.onclick = () => runExitCheck(root, ctx, tid, ts);
  const early = root.querySelector('[data-act="early"]'); if (early) early.onclick = () => runExitCheck(root, ctx, tid, ts, true);
  const promo = root.querySelector('[data-act="promote"]'); if (promo) promo.onclick = () => promote(root, ctx, tid, ts);
  root.querySelectorAll("[data-gap]").forEach((b) => b.onclick = () => {
    const skill = skillsForTrack(tid).find((s) => s.rank === Number(b.dataset.gap)); if (!skill) return;
    const opts = resourcesForSkill(skill, ts.tier, state.profile, ts.path.steps.map((s) => s.rid));
    const sh = sheet(`<h3>${esc(skill.skill)} <span class="tag demand-${DEMAND_CLS[skill.demand]}">${esc(tt(STR_D[skill.demand]))}</span></h3>
      ${opts.length ? opts.map((r) => `<div class="inner" style="margin-bottom:8px"><b>${esc(r.n)}</b> <span class="tag">${esc(r.t)}</span> <span class="tag">${fmtHours(Math.min(40, r.hr ? Math.round((r.hr[0] + r.hr[1]) / 2) : 10))} ${esc(t("hoursShort"))}</span> <span class="tag ${r.c === "free" ? "ok" : ""}">${esc(t(r.c))}</span>${r.h !== "N" ? ` <span class="tag ok">${esc(t("hindiYes"))}</span>` : ""}
        <div class="small muted" style="margin:4px 0 8px">${esc(r.cov)}</div>
        <div class="row"><a class="btn btn-ghost btn-sm" href="${esc(r.u)}" target="_blank" rel="noopener noreferrer">${icon("external")} ${esc(t("open"))}</a><button class="btn btn-primary btn-sm" data-addres="${esc(r.id)}">${icon("check")} ${esc(t("addToPath"))}</button></div></div>`).join("") : `<p class="muted">${esc(t("noResource"))}</p>`}`);
    sh.querySelectorAll("[data-addres]").forEach((a) => a.onclick = () => {
      const r = byId.get(a.dataset.addres); const st = skillStep(r, ts.tier, state.profile, skill);
      ts.path.steps.splice(Math.max(nextStepIndex(ts), 0) + 1, 0, st); ts.path.totalHours += st.hours; ts.path.totalWeeks = Math.max(1, Math.ceil(ts.path.totalHours / Math.max(1, state.profile.hoursPerWeek)));
      toast(t("added")); rerender();
    });
  });
  const askBtn = root.querySelector('[data-act="claude"]');
  if (askBtn) askBtn.onclick = () => {
    const sh = sheet(`<h3>✨ ${esc(t("askClaude"))}</h3><p class="small muted">${esc(t("askClaudeLead"))}</p>
      <div class="competence"><button data-p="learner"><span class="n">🎒</span><span>${esc(t("promptLearner"))}</span></button><button data-p="mentor"><span class="n">🧑‍🏫</span><span>${esc(t("promptMentor"))}</span></button></div>
      <div class="row" style="margin-top:10px"><a class="btn btn-ghost btn-sm" href="https://claude.ai/new" target="_blank" rel="noopener noreferrer">${icon("external")} ${esc(t("openClaude"))}</a></div>`);
    sh.querySelectorAll("[data-p]").forEach((p) => p.onclick = () => copyText(p.dataset.p === "mentor" ? mentorPrompt(state.profile, ts, tid) : learnerPrompt(state.profile, ts, tid), tt({ en: "Prompt copied. Paste it into Claude.", hi: "प्रॉम्प्ट कॉपी हुआ। इसे Claude में चिपकाएं।" })));
  };
  root.querySelector('[data-act="save"]').onclick = () => { saveToDevice(); toast(t("saved")); render(root, ctx); };
  root.querySelector('[data-act="summary"]').onclick = () => ctx.go("summary");
  root.querySelector('[data-act="work"]').onclick = () => root.querySelector("#work").scrollIntoView({ behavior: "smooth" });
  root.querySelector('[data-act="add"]').onclick = () => ctx.go("add");
  root.querySelector('[data-act="restart"]').onclick = async () => { if (await confirmSheet(t("confirmFresh"), t("yes"), t("no"))) { sessionStorage.removeItem("wsiln:draft"); ctx.go("intake"); } };
  root.querySelectorAll("[data-copycred]").forEach((b) => b.onclick = () => copyText(JSON.stringify(ts.credentials[Number(b.dataset.copycred)])));
  root.querySelectorAll("[data-showcred]").forEach((b) => b.onclick = () => sheet(`<h3>${esc(t("credentials"))} JSON</h3><pre class="mono">${esc(JSON.stringify(ts.credentials[Number(b.dataset.showcred)], null, 1))}</pre>`));
  (ts.credentials || []).forEach((c, i) => { const el = root.querySelector(`#qr-${i}`); if (el && window.QRCode) { try { new window.QRCode(el, { text: JSON.stringify({ v: 1, fp: c.payload.publicKeyFingerprint, id: c.payload.credentialId, tier: c.payload.tier, track: c.payload.trackId, sig: c.signature.slice(0, 32) }), width: 128, height: 128, correctLevel: window.QRCode.CorrectLevel.M }); } catch {} } });
}

function runExitCheck(root, ctx, tid, ts, early = false) {
  // Guideline first, then the four questions.
  const g = sheet(`<h3>${icon("shield")} ${esc(t("exitCheck"))}</h3><p class="small muted">${esc(t("ccGuideTitle"))}</p>
    <ol class="hiw">${["ccGuide1", "ccGuide2", "ccGuide3", "ccGuide4", "ccGuide5"].map((k) => `<li>${esc(t(k))}</li>`).join("")}</ol>
    <button class="btn btn-primary btn-block" id="cc-start" style="margin-top:12px">${icon("arrowRight")} ${esc(t("startCheck"))}</button>`, { closeLabel: tt({ en: "Not now", hi: "अभी नहीं" }) });
  g.querySelector("#cc-start").onclick = () => runExitQuestions(root, ctx, tid, ts, early);
}
function runExitQuestions(root, ctx, tid, ts, early) {
  ts.exitAttempts = (ts.exitAttempts || 0) + 1; persistSession();
  const qs = exitCheckQuestions(tid, ts.tier, ts.exitAttempts - 1).map(presentQuestion); let i = 0, score = 0;
  const draw = () => {
    const q = qs[i];
    if (!q) {
      const passed = score >= Math.ceil(qs.length * 0.75);
      ts.exitCheck = { score, total: qs.length, passed, at: new Date().toISOString(), early };
      if (early && passed && ts.tier < 3) { ts.flags.earlyPromotionEligible = true; }
      persistSession(); render(root, ctx);
      sheet(`<h3>${esc(t("exitCheck"))}</h3><p>${score}/${qs.length} · <b>${passed ? "✅ " + esc(t("reqExit")) : "❌ " + esc(tt({ en: "Not yet. Keep going and try again later.", hi: "अभी नहीं। आगे बढ़ें और बाद में फिर कोशिश करें।" }))}</b></p>${early && passed ? `<p class="small">${esc(tt({ en: "You passed the next tier's check. Finish the capstone and checkpoints to promote.", hi: "आपने अगले स्तर की जांच पास की। पदोन्नति के लिए कैपस्टोन और चेकपॉइंट पूरे करें।" }))}</p>` : ""}`);
      return;
    }
    const b = sheet(`<div class="tiny muted-2">${esc(t("exitCheck"))} · ${i + 1}/${qs.length}</div><div class="quiz-q">${gl(L() === "hi" && q.hq ? q.hq : q.q)}</div><div class="quiz-opts">${q.opts.map((o, k) => `<button class="opt" data-k="${k}"><span class="tag">${String.fromCharCode(65 + k)}</span><span>${esc(o)}</span></button>`).join("")}</div>`, { closeLabel: tt({ en: "Cancel", hi: "रद्द" }) });
    b.querySelectorAll(".opt").forEach((o) => o.onclick = () => { if (Number(o.dataset.k) === q.a) score++; i++; draw(); });
  };
  draw();
}

async function promote(root, ctx, tid, ts) {
  const tr = TRACKS.tracks.find((x) => x.id === tid); const prog = computeProgress(ts);
  const payload = { credentialId: `${tid}-${ts.tier}-${Date.now().toString(36)}`, trackId: tid, trackName: tr.en, tier: ts.tier, tierLabel: TRACKS.tierLabels[ts.tier].en,
    stepsCompleted: prog.done, checkpointsCompleted: prog.withCheckpoint, capstone: tt(ts.path.capstone), capstoneNotes: ts.capstone.notes || "", exitCheck: `${ts.exitCheck.score}/${ts.exitCheck.total}`, rankScore: prog.rank };
  const cred = await issueCredential(payload, hasSaved());
  ts.credentials = ts.credentials || []; ts.credentials.push(cred);
  ts.tierHistory = ts.tierHistory || []; ts.tierHistory.push({ tier: ts.tier, path: ts.path, completions: ts.completions, capstone: ts.capstone, exitCheck: ts.exitCheck, promotedAt: new Date().toISOString() });
  if (ts.tier < 3) { ts.tier += 1; ts.path = generatePath(state.profile, tid, ts.tier, {}); ts.completions = {}; ts.capstone = { status: "none" }; ts.exitCheck = null; ts.flags = {}; }
  persistSession(); if (hasSaved()) saveToDevice();
  render(root, ctx);
  toast(`🎖️ ${tt({ en: "Credential issued. Welcome to", hi: "क्रेडेंशियल जारी। स्वागत है" })} ${tt(TRACKS.tierLabels[ts.tier])}`, 4000);
}
