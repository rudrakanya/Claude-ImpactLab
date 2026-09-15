// Printable, offline one-page plan a mentor can annotate. No account or backend needed.
import { t, tt, getLang } from "../i18n.js";
import { esc, icon, copyText } from "../ui.js";
import { state } from "../state.js";
import { TRACKS } from "../data/tracks.js";
import { byId, subjectById, computeProgress, nextStepIndex } from "../engine.js";
import { mentorPrompt } from "../prompts.js";

export function render(root, ctx) {
  if (!state.profile) return ctx.go("intake");
  const tids = Object.keys(state.tracks).map(Number).filter((id) => state.tracks[id].path);
  const p = state.profile; const L = getLang();
  const date = new Date().toISOString().slice(0, 10);
  root.innerHTML = `
    <div class="row no-print" style="margin-bottom:12px">
      <button class="btn btn-ghost btn-sm" data-act="back">${icon("arrowLeft")} ${esc(t("dashboard"))}</button>
      <button class="btn btn-primary btn-sm" data-act="print">${icon("print")} ${esc(t("print"))}</button>
      <button class="btn btn-ghost btn-sm" data-act="copy">${icon("copy")} ${esc(t("copyText"))}</button>
      <button class="btn btn-ghost btn-sm" data-act="mentorprompt">✨ ${esc(t("promptMentor"))}</button>
    </div>
    <section class="glass card" id="onepager">
      <div class="row-between"><h1 style="font-size:1.3rem;margin:0">${esc(t("appName"))} · ${esc(t("summary"))}</h1><span class="tag">${date}</span></div>
      <div class="inner" style="margin-top:10px"><b>${esc(tt({ en: "Learner profile", hi: "सीखने वाले की प्रोफ़ाइल" }))}</b><br>
        ${esc(t("obj_" + p.objective))} · ${esc(t("dev_" + p.device))} · ${p.hoursPerWeek} ${esc(t("hoursShort"))}/${esc(tt({ en: "week", hi: "हफ़्ता" }))} · ${esc(tt({ en: "English", hi: "अंग्रेज़ी" }))} ${p.english}/5 · ${esc(tt({ en: "Tech", hi: "तकनीक" }))} ${p.tech}/5 · ${esc(tt({ en: "Prior exposure", hi: "पिछला अनुभव" }))}: ${p.exposure.length ? esc(p.exposure.join(", ")) : esc(tt({ en: "none", hi: "कोई नहीं" }))}</div>
      ${tids.map((tid) => { const ts = state.tracks[tid]; const tr = TRACKS.tracks.find((x) => x.id === tid); const s = subjectById.get(ts.subjectId); const prog = computeProgress(ts); const nx = nextStepIndex(ts);
        return `<h2 style="margin-top:16px">${tr.emoji} ${esc(s ? s.label : tr.en)} <span class="tag tier-${ts.tier}">${esc(tt(TRACKS.tierLabels[ts.tier]))}</span> <span class="tag">${prog.done}/${prog.total} ${esc(t("done"))}</span> <span class="tag">${esc(t("rank"))} ${prog.rank}</span></h2>
        <div class="small muted">${esc(tt({ en: "Level check", hi: "स्तर जांच" }))}: ${esc(t("selfSaid"))} ${esc(tt(TRACKS.tierLabels[ts.selfTier]))}, ${esc(tt({ en: "quiz", hi: "क्विज़" }))} ${ts.quiz ? `${ts.quiz.correct}/${ts.quiz.total}` : "–"} → ${esc(tt(TRACKS.tierLabels[ts.tier]))}${ts.path.templateId ? ` · ${esc(t("useTemplate"))}` : ""}</div>
        <ol style="padding-left:18px;margin:8px 0">${ts.path.steps.map((st, i) => { const r = byId.get(st.rid); const c = ts.completions[st.id] || {}; const cp = st.checkpoint[L] || st.checkpoint.en; const ck = (c.checkpoint || []).filter(Boolean).length;
          return `<li style="margin-bottom:6px"><b>${c.doneAt ? "☑" : i === nx ? "▶" : "☐"} ${esc(r.n)}</b> <span class="small muted">(${esc(r.p)} · ${st.hours}${esc(t("hoursShort"))} · ${esc(r.c)}${r.h !== "N" ? " · हिंदी" : ""})</span><br><span class="small">🧪 ${esc(cp.title)} — ${ck}/${cp.criteria.length}${c.feedback ? ` · ${esc(t(c.feedback))}` : ""}</span><br><span class="tiny muted-2">${esc(r.u)}</span></li>`; }).join("")}</ol>
        ${ts.path.capstone ? `<div class="inner"><b>🏁 ${esc(t("capstone"))}: ${esc(tt(ts.path.capstone))}</b> · ${esc(ts.capstone.status === "submitted" ? t("reqCapstone") : tt({ en: "not yet", hi: "अभी नहीं" }))}<br><span class="small">${esc(ts.path.capstone.brief[L] || ts.path.capstone.brief.en)}</span></div>` : ""}
        <div style="margin-top:12px"><b>✍️ ${esc(t("mentorNotes"))}</b><div class="mentor-lines">${"<div></div>".repeat(5)}</div></div>`; }).join("")}
      <p class="tiny muted-2" style="margin-top:14px">${esc(tt({ en: "Generated offline on the learner's device. Resources are free to access; the path describes categories of work only and promises no employment outcome.", hi: "सीखने वाले के डिवाइस पर ऑफ़लाइन बनाया गया। संसाधन मुफ़्त हैं; रास्ता सिर्फ़ काम की श्रेणियां बताता है और रोज़गार का कोई वादा नहीं करता।" }))}</p>
    </section>`;
  root.querySelector('[data-act="back"]').onclick = () => ctx.go("dashboard");
  root.querySelector('[data-act="print"]').onclick = () => window.print();
  root.querySelector('[data-act="mentorprompt"]').onclick = () => copyText(tids.map((tid) => mentorPrompt(p, state.tracks[tid], tid)).join("\n\n---\n\n"), tt({ en: "Mentor prompt copied. Paste it into Claude.", hi: "मेंटर प्रॉम्प्ट कॉपी हुआ। इसे Claude में चिपकाएं।" }));
  root.querySelector('[data-act="copy"]').onclick = () => {
    const text = tids.map((tid) => { const ts = state.tracks[tid]; const tr = TRACKS.tracks.find((x) => x.id === tid);
      return `${tr.en} — ${TRACKS.tierLabels[ts.tier].en}\n` + ts.path.steps.map((st, i) => { const r = byId.get(st.rid); const c = ts.completions[st.id] || {}; return `${c.doneAt ? "[x]" : "[ ]"} ${i + 1}. ${r.n} (${st.hours}h) ${r.u}\n    Checkpoint: ${st.checkpoint.en.title}`; }).join("\n") + (ts.path.capstone ? `\nCapstone: ${ts.path.capstone.en}` : ""); }).join("\n\n");
    copyText(`${t("appName")} — plan ${date}\n\n${text}\n\nMentor comments:\n\n\n`);
  };
}
