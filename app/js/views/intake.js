// Sticky, mobile-first, multi-step intake. Progress + navigation stay in reach while scrolling.
import { t, tt, getLang } from "../i18n.js";
import { esc, icon, toast } from "../ui.js";
import { gl } from "../glossary.js";
import { state, persistSession } from "../state.js";
import { SUBJECTS } from "../data/subjects.js";
import { TRACKS } from "../data/tracks.js";
import { REFERENCE_PATHWAYS } from "../data/reference_pathways.js";
import { EXPOSURE_ITEMS } from "../engine.js";

const DRAFT_KEY = "wsiln:draft";
const STEPS = 5;
const OBJ = ["job", "role", "project", "coursework", "exploring"];
const OBJ_EM = { job: "💼", role: "📈", project: "🛠️", coursework: "🎓", exploring: "🧭" };
const DEV = ["phone", "shared", "laptop"];
const DEV_EM = { phone: "📱", shared: "🖥️", laptop: "💻" };
export const COMP_TO_TIER = [0, 0, 1, 2, 3];

function loadDraft() {
  try { const d = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "null"); if (d) return d; } catch {}
  const d = { step: 0, objective: null, device: null, hoursPerWeek: 4, english: 3, tech: 3, exposure: {}, subjects: [], comp: {}, startedAt: new Date().toISOString() };
  const pre = sessionStorage.getItem("wsiln:prefill");
  if (pre) { const p = REFERENCE_PATHWAYS.pathways.find((x) => x.id === pre); if (p) { d.subjects = [`tr-${p.track}`]; d.templateHint = p.id; } sessionStorage.removeItem("wsiln:prefill"); }
  return d;
}
function saveDraft(d) { try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch {} }
const trackOf = (id) => TRACKS.tracks.find((x) => x.id === id);
const subj = (id) => SUBJECTS.find((s) => s.id === id);
const label = (s) => (getLang() === "hi" && s.hi) ? s.hi : s.label;

export function render(root, ctx) {
  const d = loadDraft();
  const draw = () => {
    saveDraft(d);
    root.innerHTML = `
      ${d.step === 0 ? `<section class="glass card card-sm" style="margin-bottom:14px"><h3 style="margin-bottom:6px">${esc(t("howItWorks"))}</h3>
        <ol class="hiw">${["hiw1", "hiw2", "hiw3", "hiw4"].map((k) => `<li>${gl(t(k))}</li>`).join("")}</ol></section>` : ""}
      <div class="glass progress-wrap">
        <div class="steps"><span>${esc(t("step"))} ${d.step + 1} ${esc(t("of"))} ${STEPS}</span><span>${["s1Title", "s2Title", "s3Title", "s4Title", "s5Title"].map((k) => esc(t(k)))[d.step]}</span></div>
        <div class="bar"><i style="width:${((d.step + 1) / STEPS) * 100}%"></i></div>
      </div>
      <section class="glass card" id="stepbody">${stepHtml(d)}</section>
      <div class="bottom-nav"><div class="glass inner-nav">
        <button class="btn btn-ghost" id="back" ${d.step === 0 ? "disabled" : ""}>${icon("arrowLeft")} ${esc(t("back"))}</button>
        <button class="btn btn-primary" id="next">${d.step === STEPS - 1 ? esc(t("startQuiz")) : esc(t("next"))} ${icon("arrowRight")}</button>
      </div></div>`;
    wire(d, root, ctx, draw);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  draw();
}

function stepHtml(d) {
  if (d.step === 0) return `
    <h2>${esc(t("s1Title"))}</h2><p class="muted">${esc(t("s1Lead"))}</p>
    <div class="field"><span class="label">${esc(t("objective"))}</span>
      <div class="opt-grid">${OBJ.map((o) => `<button class="opt ${d.objective === o ? "on" : ""}" data-obj="${o}"><span class="em">${OBJ_EM[o]}</span><span><div class="t">${esc(t("obj_" + o))}</div><div class="d">${esc(t("obj_" + o + "_d"))}</div></span></button>`).join("")}</div></div>
    <div class="field"><span class="label">${esc(t("device"))}</span>
      <div class="opt-grid">${DEV.map((o) => `<button class="opt ${d.device === o ? "on" : ""}" data-dev="${o}"><span class="em">${DEV_EM[o]}</span><span class="t">${esc(t("dev_" + o))}</span></button>`).join("")}</div></div>
    <div class="field"><label class="label" for="hours">${esc(t("hours"))}: <b id="hoursv">${d.hoursPerWeek}</b> ${esc(t("hoursShort"))}</label>
      <input id="hours" class="slider" type="range" min="1" max="30" step="1" value="${d.hoursPerWeek}"><div class="help">${esc(t("hoursHelp"))}</div></div>
    <div class="field"><span class="label">${esc(t("english"))}</span>
      <div class="scale" data-scale="english">${[1, 2, 3, 4, 5].map((n) => `<button class="${d.english === n ? "on" : ""}" data-v="${n}" aria-label="${n}">${n}</button>`).join("")}</div>
      <div class="scale-ends"><span>${esc(t("englishLo"))}</span><span>${esc(t("englishHi"))}</span></div></div>
    <div class="field"><span class="label">${esc(t("tech"))}</span>
      <div class="scale" data-scale="tech">${[1, 2, 3, 4, 5].map((n) => `<button class="${d.tech === n ? "on" : ""}" data-v="${n}" aria-label="${n}">${n}</button>`).join("")}</div>
      <div class="scale-ends"><span>${esc(t("techLo"))}</span><span>${esc(t("techHi"))}</span></div></div>`;
  if (d.step === 1) return `
    <h2>${esc(t("s2Title"))}</h2><p class="muted">${esc(t("s2Lead"))}</p>
    ${EXPOSURE_ITEMS.map((e) => `<div class="yesno"><span class="q">${gl(t("ex_" + e.id))}</span>
      <div class="seg"><button class="${d.exposure[e.id] === true ? "on" : ""}" data-ex="${e.id}" data-v="1">${esc(t("yes"))}</button><button class="${d.exposure[e.id] === false ? "on" : ""}" data-ex="${e.id}" data-v="0">${esc(t("no"))}</button></div></div>`).join("")}`;
  if (d.step === 2) return `
    <h2>${esc(t("s3Title"))}</h2><p class="muted">${esc(t("s3Lead"))}</p>
    <div class="field"><input id="q" class="input" type="search" placeholder="${esc(t("searchPh"))}" autocomplete="off" ${d.subjects.length >= 2 ? "disabled" : ""}><div class="search-results" id="results" hidden></div></div>
    <div id="chosen">${chosenHtml(d)}</div>
    <div class="field" style="margin-top:14px"><span class="label small muted">${esc(t("popular"))}</span>
      <div class="chips">${REFERENCE_PATHWAYS.pathways.filter((p) => p.tier === 0).map((p) => `<button class="chip" data-pick="tr-${p.track}" data-tpl="${p.id}"><span class="em">${trackOf(p.track).emoji}</span>${esc(tt(p.goal))}</button>`).join("")}</div></div>
    <div class="field"><span class="label small muted">${esc(tt({ en: "Or browse the 14 tracks", hi: "या 14 ट्रैक देखें" }))}</span>
      <div class="chips">${TRACKS.tracks.map((tr) => `<button class="chip" data-pick="tr-${tr.id}"><span class="em">${tr.emoji}</span>${esc(getLang() === "hi" ? tr.hi : tr.en)}</button>`).join("")}</div></div>`;
  if (d.step === 3) return `
    <h2>${esc(t("s4Title"))}</h2><p class="muted">${esc(t("s4Lead"))}</p>
    ${d.subjects.map((sid) => { const s = subj(sid); const tr = trackOf(s.track); return `<div class="field"><span class="label">${tr.emoji} ${esc(label(s))} <span class="muted-2 small">· ${esc(getLang() === "hi" ? tr.hi : tr.en)}</span></span>
      <div class="competence">${[0, 1, 2, 3, 4].map((n) => `<button class="${d.comp[sid] === n ? "on" : ""}" data-comp="${sid}" data-v="${n}"><span class="n">${n}</span><span>${esc(t("c" + n))}</span></button>`).join("")}</div></div>`; }).join("")}`;
  const tiers = TRACKS.tierLabels;
  return `
    <h2>${esc(t("s5Title"))}</h2><p class="muted">${esc(t("s5Lead"))}</p>
    <div class="inner"><b>${esc(t("objective"))}</b><br>${esc(t("obj_" + d.objective))}</div>
    <div class="inner"><b>${esc(t("device"))}</b><br>${esc(t("dev_" + d.device))} · ${d.hoursPerWeek} ${esc(t("hoursShort"))}/${esc(tt({ en: "week", hi: "हफ़्ता" }))}</div>
    <div class="inner"><b>${esc(tt({ en: "English", hi: "अंग्रेज़ी" }))}</b> ${d.english}/5 · <b>${esc(tt({ en: "Tech", hi: "तकनीक" }))}</b> ${d.tech}/5 · <b>${esc(tt({ en: "Prior exposure", hi: "पिछला अनुभव" }))}</b> ${Object.values(d.exposure).filter(Boolean).length}/${EXPOSURE_ITEMS.length}</div>
    ${d.subjects.map((sid) => { const s = subj(sid); const tr = trackOf(s.track); const c = d.comp[sid] ?? 0; return `<div class="inner"><b>${tr.emoji} ${esc(label(s))}</b><br><span class="muted">${esc(getLang() === "hi" ? tr.hi : tr.en)} · ${esc(t("selfSaid"))}: ${esc(t("c" + c))} → <span class="tag tier-${COMP_TO_TIER[c]}">${esc(tt(tiers[COMP_TO_TIER[c]]))}</span></span></div>`; }).join("")}`;
}
function chosenHtml(d) {
  if (!d.subjects.length) return "";
  return `<span class="label small muted">${esc(t("chosen"))}</span><div class="chips">${d.subjects.map((sid) => { const s = subj(sid); const tr = trackOf(s.track); return `<span class="chip on">${tr.emoji} ${esc(label(s))} <span class="muted-2 tiny" style="color:inherit;opacity:.7">· ${esc(getLang() === "hi" ? tr.hi : tr.en)}</span><button class="btn-link" style="color:inherit;padding:0 2px" data-rm="${sid}" aria-label="remove">✕</button></span>`; }).join("")}</div>
    ${d.subjects.length === 1 ? `<div class="help">${esc(t("addSecondary"))}</div>` : ""}`;
}
function valid(d) {
  if (d.step === 0) return d.objective && d.device;
  if (d.step === 1) return EXPOSURE_ITEMS.every((e) => d.exposure[e.id] === true || d.exposure[e.id] === false);
  if (d.step === 2) return d.subjects.length >= 1;
  if (d.step === 3) return d.subjects.every((s) => d.comp[s] !== undefined);
  return true;
}
function wire(d, root, ctx, draw) {
  const body = root.querySelector("#stepbody");
  body.onclick = (ev) => {
    const b = ev.target.closest("button"); if (!b) return;
    if (b.dataset.obj) { d.objective = b.dataset.obj; return draw(); }
    if (b.dataset.dev) { d.device = b.dataset.dev; return draw(); }
    if (b.closest("[data-scale]")) { d[b.closest("[data-scale]").dataset.scale] = Number(b.dataset.v); return draw(); }
    if (b.dataset.ex) { d.exposure[b.dataset.ex] = b.dataset.v === "1"; return draw(); }
    if (b.dataset.pick) { addSubject(d, b.dataset.pick); if (b.dataset.tpl) d.templateHint = b.dataset.tpl; return draw(); }
    if (b.dataset.rm) { d.subjects = d.subjects.filter((s) => s !== b.dataset.rm); delete d.comp[b.dataset.rm]; return draw(); }
    if (b.dataset.comp) { d.comp[b.dataset.comp] = Number(b.dataset.v); return draw(); }
  };
  const hours = body.querySelector("#hours");
  if (hours) hours.oninput = () => { d.hoursPerWeek = Number(hours.value); body.querySelector("#hoursv").textContent = hours.value; saveDraft(d); };
  const q = body.querySelector("#q");
  if (q) {
    const res = body.querySelector("#results");
    q.oninput = () => {
      const v = q.value.trim().toLowerCase();
      if (v.length < 1) { res.hidden = true; return; }
      const hits = SUBJECTS.filter((s) => !d.subjects.includes(s.id) && (s.label.toLowerCase().includes(v) || (s.hi && s.hi.includes(v)) || (getLang() === "hi" ? trackOf(s.track).hi : trackOf(s.track).en).toLowerCase().includes(v))).slice(0, 12);
      res.innerHTML = hits.length ? hits.map((s) => `<button data-pick="${esc(s.id)}"><span>${trackOf(s.track).emoji}</span><span>${esc(label(s))}</span><span class="cat">${esc(s.cat)} · ${esc(getLang() === "hi" ? trackOf(s.track).hi : trackOf(s.track).en)}</span></button>`).join("") : `<div class="muted small" style="padding:10px 12px">${esc(tt({ en: "No match. Try a track below.", hi: "कोई मेल नहीं। नीचे कोई ट्रैक चुनें।" }))}</div>`;
      res.hidden = false;
    };
    q.focus();
  }
  root.querySelector("#back").onclick = () => { d.step = Math.max(0, d.step - 1); draw(); };
  root.querySelector("#next").onclick = () => {
    if (!valid(d)) { toast(tt({ en: "Please answer everything on this step.", hi: "कृपया इस कदम के सभी सवालों के जवाब दें।" })); return; }
    if (d.step < STEPS - 1) { d.step++; return draw(); }
    finish(d, ctx);
  };
}
function addSubject(d, id) {
  if (d.subjects.includes(id) || d.subjects.length >= 2) return;
  const s = subj(id); if (!s) return;
  if (d.subjects.some((x) => subj(x).track === s.track)) { toast(tt({ en: "That is the same track as your first choice.", hi: "यह आपके पहले चुनाव के ट्रैक जैसा ही है।" })); return; }
  d.subjects.push(id);
}
function finish(d, ctx) {
  const exposure = Object.entries(d.exposure).filter(([, v]) => v).map(([k]) => k);
  state.profile = { objective: d.objective, device: d.device, hoursPerWeek: d.hoursPerWeek, english: d.english, tech: d.tech, exposure, subjects: d.subjects, selfTiers: {}, templateHint: d.templateHint || null };
  state.startedAt = d.startedAt;
  state.tracks = {};
  d.subjects.forEach((sid, i) => { const s = subj(sid); const tier = COMP_TO_TIER[d.comp[sid] ?? 0]; state.profile.selfTiers[s.track] = tier;
    state.tracks[s.track] = { subjectId: sid, selfTier: tier, tier: null, quiz: null, path: null, completions: {}, capstone: { status: "none" }, credentials: [], flags: {} };
    if (i === 0) state.primaryTrack = s.track; });
  sessionStorage.removeItem(DRAFT_KEY);
  persistSession();
  ctx.go("quiz");
}
