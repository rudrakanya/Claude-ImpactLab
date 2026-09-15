// Account (optional sign-in), save/delete on device, export, and the offline credential verifier.
import { t, tt } from "../i18n.js";
import { esc, icon, toast, confirmSheet, copyText } from "../ui.js";
import { state, hasSaved, saveToDevice, deleteSaved, exportJson, loadSaved } from "../state.js";
import { authAvailable, signIn, signOut, syncUp, syncDown } from "../auth.js";
import { verifyCredential } from "../credentials.js";

export async function render(root, ctx) {
  const avail = await authAvailable();
  root.innerHTML = `
    <div class="auth-wrap">
    <section class="glass card">
      <div style="text-align:center;margin-bottom:12px"><div class="logo" style="width:48px;height:48px;border-radius:14px;background:var(--grad);display:grid;place-items:center;margin:0 auto 10px;color:#fff">${icon("user")}</div>
        <h2 style="margin:0">${esc(t("account"))}</h2><p class="muted small">${esc(t("authLead"))}</p></div>
      ${state.user ? `<div class="inner">${icon("check")} ${esc(state.user.name || state.user.uid)} <span class="muted-2 small">· ${esc(state.user.provider || "")}</span></div>
        <button class="btn btn-primary" data-act="syncup">${icon("save")} ${esc(tt({ en: "Save progress to account", hi: "प्रगति खाते में सहेजें" }))}</button>
        <button class="btn btn-ghost" data-act="syncdown">${icon("refresh")} ${esc(tt({ en: "Load progress from account", hi: "खाते से प्रगति लोड करें" }))}</button>
        <button class="btn btn-ghost" data-act="signout">${esc(tt({ en: "Sign out", hi: "साइन आउट" }))}</button>` :
      avail ? `<button class="btn btn-primary" data-act="google">${icon("globe")} ${esc(t("signIn"))} · Google</button>
        <button class="btn btn-ghost" data-act="apple">${icon("lock")} ${esc(t("signIn"))} · Apple</button>` :
      `<div class="notice">${esc(t("authOff"))}</div>`}
      <div class="divider">${esc(tt({ en: "or", hi: "या" }))}</div>
      <button class="btn btn-ghost" data-act="guest">${icon("arrowRight")} ${esc(t("guest"))}</button>
    </section>
    <section class="glass card">
      <h3>${icon("save")} ${esc(tt({ en: "On this device", hi: "इस डिवाइस पर" }))}</h3>
      <p class="small muted">${esc(tt({ en: "Saving keeps your plan, progress and signing key in this browser only. Deleting removes them.", hi: "सहेजने से आपकी योजना, प्रगति और साइनिंग की सिर्फ़ इस ब्राउज़र में रहती है। हटाने से ये मिट जाती हैं।" }))}</p>
      <button class="btn btn-primary" data-act="save" ${state.profile ? "" : "disabled"}>${icon("save")} ${esc(hasSaved() ? t("saved") : t("savePlan"))}</button>
      ${hasSaved() ? `<button class="btn btn-ghost" data-act="load">${icon("refresh")} ${esc(t("resume"))}</button><button class="btn btn-ghost" data-act="del" style="color:var(--bad)">${icon("x")} ${esc(t("deleteSaved"))}</button>` : ""}
      <button class="btn btn-ghost" data-act="export" ${state.profile ? "" : "disabled"}>${icon("copy")} ${esc(tt({ en: "Copy plan JSON", hi: "योजना JSON कॉपी करें" }))}</button>
    </section>
    <section class="glass card">
      <h3>${icon("shield")} ${esc(t("verifyTitle"))}</h3>
      <p class="small muted">${esc(t("verifyLead"))}</p>
      <textarea id="credjson" class="input mono" rows="6" placeholder='{"v":1,"alg":"ES256",...}'></textarea>
      <button class="btn btn-primary" data-act="verify" style="margin-top:8px">${icon("check")} ${esc(t("verify"))}</button>
      <div id="vres" style="margin-top:10px"></div>
    </section></div>`;
  const on = (sel, fn) => { const el = root.querySelector(sel); if (el) el.onclick = fn; };
  on('[data-act="guest"]', () => ctx.go(state.planReadyAt ? "dashboard" : "intake"));
  on('[data-act="google"]', async () => { try { await signIn("google"); toast("Signed in"); render(root, ctx); } catch (e) { toast(esc(e.message)); } });
  on('[data-act="apple"]', async () => { try { await signIn("apple"); toast("Signed in"); render(root, ctx); } catch (e) { toast(esc(e.message)); } });
  on('[data-act="signout"]', async () => { await signOut(); render(root, ctx); });
  on('[data-act="syncup"]', async () => { try { await syncUp(); toast("Saved to account"); } catch (e) { toast(esc(e.message)); } });
  on('[data-act="syncdown"]', async () => { try { const ok = await syncDown(); toast(ok ? "Loaded" : "Nothing saved yet"); if (ok) ctx.go("dashboard"); } catch (e) { toast(esc(e.message)); } });
  on('[data-act="save"]', () => { saveToDevice(); toast(t("saved")); render(root, ctx); });
  on('[data-act="load"]', () => { loadSaved(); ctx.go("dashboard"); });
  on('[data-act="del"]', async () => { if (await confirmSheet(t("deleteSaved") + "?", t("yes"), t("no"))) { deleteSaved(); toast("Deleted"); render(root, ctx); } });
  on('[data-act="export"]', () => copyText(exportJson()));
  on('[data-act="verify"]', async () => {
    const out = root.querySelector("#vres");
    let obj; try { obj = JSON.parse(root.querySelector("#credjson").value); } catch { out.innerHTML = `<div class="notice">${esc(t("invalid"))}</div>`; return; }
    const r = await verifyCredential(obj);
    out.innerHTML = r.ok ? `<div class="inner" style="border-color:var(--ok)"><b style="color:var(--ok)">✅ ${esc(t("valid"))}</b><div class="small" style="margin-top:6px">${esc(obj.payload.trackName)} · ${esc(obj.payload.tierLabel)} · ${esc(obj.payload.issuedAt)}<br>${esc(tt({ en: "Key fingerprint", hi: "की फ़िंगरप्रिंट" }))}: <span class="mono">${esc(r.fp)}</span><br>${esc(obj.payload.stepsCompleted)} steps · ${esc(obj.payload.checkpointsCompleted)} checkpoints · exit ${esc(obj.payload.exitCheck)}</div><p class="tiny muted-2" style="margin-top:6px">${esc(obj.payload.statement)}</p></div>`
      : `<div class="notice" style="border-color:var(--bad)"><b style="color:var(--bad)">❌ ${esc(t("invalid"))}</b> <span class="small">${esc(r.reason)}</span></div>`;
  });
}
