// Add another subject/track to an existing profile (each track has its own tier, XP and rank).
import { t, tt, getLang } from "../i18n.js";
import { esc, icon, toast } from "../ui.js";
import { state, persistSession } from "../state.js";
import { SUBJECTS } from "../data/subjects.js";
import { TRACKS } from "../data/tracks.js";
import { COMP_TO_TIER } from "./intake.js";

export function render(root, ctx) {
  if (!state.profile) return ctx.go("intake");
  let chosen = null, comp = null;
  const trackOf = (id) => TRACKS.tracks.find((x) => x.id === id);
  const label = (s) => (getLang() === "hi" && s.hi) ? s.hi : s.label;
  const draw = () => {
    root.innerHTML = `<section class="glass card">
      <h2>${esc(t("addTrack"))}</h2><p class="muted small">${esc(t("s3Lead"))}</p>
      <input id="q" class="input" type="search" placeholder="${esc(t("searchPh"))}" autocomplete="off"><div class="search-results" id="results" hidden></div>
      ${chosen ? `<div class="inner" style="margin-top:10px"><b>${trackOf(chosen.track).emoji} ${esc(label(chosen))}</b> <span class="muted small">· ${esc(getLang() === "hi" ? trackOf(chosen.track).hi : trackOf(chosen.track).en)}</span>
        <div class="competence" style="margin-top:8px">${[0, 1, 2, 3, 4].map((n) => `<button class="${comp === n ? "on" : ""}" data-v="${n}"><span class="n">${n}</span><span>${esc(t("c" + n))}</span></button>`).join("")}</div></div>` : ""}
      <div class="row" style="margin-top:12px"><button class="btn btn-ghost" data-act="back">${icon("arrowLeft")} ${esc(t("back"))}</button><button class="btn btn-primary" data-act="go" ${chosen && comp !== null ? "" : "disabled"}>${esc(t("startQuiz"))} ${icon("arrowRight")}</button></div>
    </section>`;
    const q = root.querySelector("#q"), res = root.querySelector("#results");
    q.oninput = () => { const v = q.value.trim().toLowerCase(); if (!v) { res.hidden = true; return; }
      const hits = SUBJECTS.filter((s) => !state.tracks[s.track] && (s.label.toLowerCase().includes(v) || (s.hi && s.hi.includes(v)))).slice(0, 12);
      res.innerHTML = hits.map((s) => `<button data-pick="${esc(s.id)}"><span>${trackOf(s.track).emoji}</span><span>${esc(label(s))}</span><span class="cat">${esc(s.cat)}</span></button>`).join("") || `<div class="muted small" style="padding:10px">–</div>`; res.hidden = false; };
    res.onclick = (e) => { const b = e.target.closest("[data-pick]"); if (!b) return; chosen = SUBJECTS.find((s) => s.id === b.dataset.pick); comp = null; draw(); };
    root.querySelectorAll("[data-v]").forEach((b) => b.onclick = () => { comp = Number(b.dataset.v); draw(); });
    root.querySelector('[data-act="back"]').onclick = () => ctx.go("dashboard");
    root.querySelector('[data-act="go"]').onclick = () => {
      if (!chosen || comp === null) return;
      const tier = COMP_TO_TIER[comp];
      state.tracks[chosen.track] = { subjectId: chosen.id, selfTier: tier, tier: null, quiz: null, path: null, completions: {}, capstone: { status: "none" }, credentials: [], flags: {} };
      state.profile.selfTiers[chosen.track] = tier; persistSession();
      ctx.go("quiz", { trackIds: [chosen.track], skipTooling: true });
    };
  };
  draw();
}
