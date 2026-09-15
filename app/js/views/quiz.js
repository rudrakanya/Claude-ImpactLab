// Adaptive placement quiz: cross-checks self-rating against demonstrated competence, then builds the path.
import { t, tt, getLang } from "../i18n.js";
import { esc, icon } from "../ui.js";
import { gl } from "../glossary.js";
import { state, persistSession } from "../state.js";
import { TRACKS } from "../data/tracks.js";
import { startQuiz, currentQuestion, presentQuestion, answerQuiz, quizSummary, needsBasics, generatePath, templatesFor, subjectById } from "../engine.js";

export function render(root, ctx, opts = {}) {
  if (!state.profile) return ctx.go("intake");
  const trackIds = opts.trackIds || Object.keys(state.tracks).map(Number).filter((id) => state.tracks[id].tier === null);
  if (!trackIds.length) return ctx.go("dashboard");
  let i = 0;
  const results = {};
  const begin = () => {
    const tid = trackIds[i]; const ts = state.tracks[tid];
    const st = startQuiz(tid, ts.selfTier, i === 0 && !opts.skipTooling && needsBasics(state.profile.exposure, state.profile.tech));
    drawQ(root, st, tid, (final) => {
      results[tid] = final;
      ts.quiz = { placedTier: final.placed, ...quizSummary(final), history: final.history, at: new Date().toISOString() };
      ts.tier = final.placed; persistSession();
      i++;
      if (i < trackIds.length) begin(); else drawResults(root, ctx, trackIds, opts);
    });
  };
  begin();
}

function drawQ(root, st, tid, onDone) {
  const tr = TRACKS.tracks.find((x) => x.id === tid);
  const raw = currentQuestion(st);
  if (!raw || st.done) return onDone(st);
  const q = presentQuestion(raw);
  const total = st.history.length + 1;
  root.innerHTML = `
    <div class="glass progress-wrap"><div class="steps"><span>${esc(t("quizTitle"))} · ${tr.emoji} ${esc(getLang() === "hi" ? tr.hi : tr.en)}</span>
      <span>${st.toolingCheck ? esc(t("toolingCheck")) : `${esc(t("tier"))}: <span class="tag tier-${st.level}">${esc(tt(TRACKS.tierLabels[st.level]))}</span>`}</span></div>
      <div class="dots">${st.history.map((h) => `<i class="${h.ok ? "ok" : "bad"}"></i>`).join("")}<i class="cur"></i></div></div>
    <section class="glass card">
      <p class="muted small">${esc(t("quizLead"))}</p>
      <div class="quiz-q">${gl(getLang() === "hi" && q.hq ? q.hq : q.q)}</div>
      <div class="quiz-opts">${q.opts.map((o, k) => `<button class="opt" data-k="${k}"><span class="num tag">${String.fromCharCode(65 + k)}</span><span class="t">${esc(o)}</span></button>`).join("")}</div>
      <p class="tiny muted-2" style="margin-top:12px">${esc(tt({ en: "Question", hi: "सवाल" }))} ${total}</p>
    </section>`;
  root.querySelectorAll(".opt").forEach((b) => b.onclick = () => {
    const k = Number(b.dataset.k); const ok = k === q.a;
    root.querySelectorAll(".opt").forEach((x) => x.disabled = true);
    b.classList.add(ok ? "correct" : "wrong");
    if (!ok) root.querySelector(`.opt[data-k="${q.a}"]`).classList.add("correct");
    setTimeout(() => { answerQuiz(st, ok); drawQ(root, st, tid, onDone); }, ok ? 450 : 1100);
  });
}

function drawResults(root, ctx, trackIds, opts) {
  const tl = TRACKS.tierLabels;
  root.innerHTML = `
    <section class="glass card">
      <h2>${esc(t("quizTitle"))} ✓</h2>
      ${trackIds.map((tid) => { const ts = state.tracks[tid]; const tr = TRACKS.tracks.find((x) => x.id === tid); const s = subjectById.get(ts.subjectId);
        const diff = ts.tier - ts.selfTier; const msg = diff > 0 ? t("placedUp") : diff < 0 ? t("placedDown") : t("placedSame");
        const tpls = templatesFor(tid, ts.tier); const hint = state.profile.templateHint && tpls.find((p) => p.id === state.profile.templateHint);
        return `<div class="inner" data-tid="${tid}">
          <div class="row-between"><b>${tr.emoji} ${esc(s ? (getLang() === "hi" && s.hi ? s.hi : s.label) : tr.en)}</b><span class="tag tier-${ts.tier}">${esc(t("placed"))}: ${esc(tt(tl[ts.tier]))}</span></div>
          <div class="small muted" style="margin-top:6px">${esc(t("selfSaid"))}: ${esc(tt(tl[ts.selfTier]))} · ${ts.quiz.correct}/${ts.quiz.total} ${esc(tt({ en: "correct", hi: "सही" }))}. ${esc(msg)}</div>
          ${tpls.length ? `<div class="field" style="margin:10px 0 0"><span class="label small">${esc(tt({ en: "Starting point", hi: "शुरुआती बिंदु" }))}</span>
            <div class="competence">
              <button class="${hint ? "" : "on"}" data-tpl=""><span class="n">⚙️</span><span>${esc(t("useGenerated"))}</span></button>
              ${tpls.map((p) => `<button class="${hint && hint.id === p.id ? "on" : ""}" data-tpl="${esc(p.id)}"><span class="n">🧭</span><span>${esc(t("useTemplate"))}: <b>${esc(tt(p.goal))}</b></span></button>`).join("")}
            </div></div>` : ""}
        </div>`; }).join("")}
      <div class="row" style="margin-top:14px"><button class="btn btn-primary btn-block" id="build">${icon("map")} ${esc(t("buildPath"))}</button></div>
    </section>`;
  root.querySelectorAll("[data-tpl]").forEach((b) => b.onclick = () => { const box = b.closest(".competence"); box.querySelectorAll("button").forEach((x) => x.classList.remove("on")); b.classList.add("on"); });
  root.querySelector("#build").onclick = () => {
    for (const tid of trackIds) {
      const ts = state.tracks[tid];
      const sel = root.querySelector(`[data-tid="${tid}"] [data-tpl].on`);
      const templateId = sel && sel.dataset.tpl ? sel.dataset.tpl : null;
      ts.path = generatePath(state.profile, tid, ts.tier, { templateId });
      ts.completions = ts.completions || {}; ts.capstone = { status: "none" }; ts.exitCheck = null; ts.flags = {};
    }
    if (!state.planReadyAt) state.planReadyAt = new Date().toISOString();
    persistSession();
    ctx.go("dashboard");
  };
}
