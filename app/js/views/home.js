import { t, tt } from "../i18n.js";
import { esc, icon, confirmSheet } from "../ui.js";
import { gl } from "../glossary.js";
import { state, hasSaved, loadSaved, clearSession } from "../state.js";
import { REFERENCE_PATHWAYS } from "../data/reference_pathways.js";
import { TRACKS } from "../data/tracks.js";
import { CATALOGUE } from "../data/catalogue.js";
import { JOB_SKILLS } from "../data/job_skills.js";

export function render(root, ctx) {
  const saved = hasSaved();
  const hasSession = !!state.profile;
  root.innerHTML = `
  <section class="glass card hero">
    <div class="tag accent" style="margin-bottom:10px">${icon("zap")} Bhopal · ${esc(tt({ en: "free resources only", hi: "सिर्फ़ मुफ़्त संसाधन" }))}</div>
    <h1>${esc(t("appName"))}</h1>
    <p class="lead">${gl(t("tagline"))}</p>
    <div class="row" style="margin-top:14px">
      ${hasSession ? `<button class="btn btn-primary" data-act="continue">${icon("arrowRight")} ${esc(t("continueSession"))}</button>` : ""}
      <button class="btn ${hasSession ? "btn-ghost" : "btn-primary"}" data-act="start">${icon("arrowRight")} ${esc(hasSession ? t("startFresh") : t("start"))}</button>
      ${saved ? `<button class="btn btn-ghost" data-act="resume">${icon("save")} ${esc(t("resume"))}</button>` : ""}
    </div>
    <p class="small muted-2" style="margin-top:12px">${icon("lock")} ${gl(t("guestNote"))}</p>
    <div class="feature-grid">
      <div class="feature"><span class="em">⏱️</span>${esc(t("feat1"))}</div>
      <div class="feature"><span class="em">📶</span>${esc(t("feat2"))}</div>
      <div class="feature"><span class="em">📚</span>${esc(t("feat3"))}</div>
      <div class="feature"><span class="em">🛠️</span>${esc(t("feat4"))}</div>
    </div>
  </section>
  <section class="glass card">
    <h2>${esc(t("popular"))}</h2>
    <p class="muted small">${esc(tt({ en: "Mentor-authored starting templates. Pick one to pre-fill your goal, then the intake tailors it.", hi: "मेंटर द्वारा लिखे शुरुआती टेम्पलेट। एक चुनें, फिर शुरुआत इसे आपके अनुसार बनाती है।" }))}</p>
    <div class="chips">
      ${REFERENCE_PATHWAYS.pathways.filter((p) => p.tier === 0).map((p) => { const tr = TRACKS.tracks.find((x) => x.id === p.track); return `<button class="chip" data-goal="${esc(p.id)}"><span class="em">${tr.emoji}</span>${esc(tt(p.goal))}</button>`; }).join("")}
    </div>
  </section>
  <section class="glass card">
    <div class="row-between"><h2 style="margin:0">${esc(tt({ en: "Why this exists", hi: "यह क्यों है" }))}</h2><button class="btn btn-ghost btn-sm" data-act="about">${icon("book")} ${esc(t("about"))}</button></div>
    <p class="muted" style="margin:8px 0 0">${esc(t("impactLine"))}</p>
    <div class="impact-strip">
      <div><b>${CATALOGUE.length}</b><span>${esc(tt({ en: "free resources", hi: "मुफ़्त संसाधन" }))}</span></div>
      <div><b>14</b><span>${esc(tt({ en: "tracks", hi: "ट्रैक" }))}</span></div>
      <div><b>${JOB_SKILLS.skills.length}</b><span>${esc(tt({ en: "local skills", hi: "स्थानीय स्किल" }))}</span></div>
      <div><b>56</b><span>${esc(tt({ en: "capstones", hi: "कैपस्टोन" }))}</span></div>
      <div><b>2</b><span>${esc(tt({ en: "languages", hi: "भाषाएं" }))}</span></div>
      <div><b>0</b><span>${esc(tt({ en: "servers needed", hi: "सर्वर ज़रूरी" }))}</span></div>
    </div>
  </section>`;
  root.querySelector('[data-act="about"]').onclick = () => ctx.go("about");
  root.querySelector('[data-act="start"]').onclick = async () => { if (hasSession && !(await confirmSheet(t("confirmFresh"), t("yes"), t("no")))) return; clearSession(); ctx.go("intake"); };
  const c = root.querySelector('[data-act="continue"]'); if (c) c.onclick = () => ctx.go(state.planReadyAt ? "dashboard" : "intake");
  const r = root.querySelector('[data-act="resume"]'); if (r) r.onclick = () => { loadSaved(); ctx.go("dashboard"); };
  root.querySelectorAll("[data-goal]").forEach((b) => b.onclick = async () => { if (hasSession && !(await confirmSheet(t("confirmFresh"), t("yes"), t("no")))) return; clearSession(); sessionStorage.setItem("wsiln:prefill", b.dataset.goal); ctx.go("intake"); });
}
