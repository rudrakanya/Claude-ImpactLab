// Router + shell. Hash routes so the app works from any static host, file://, or offline cache.
import { state, loadPrefs, savePrefs, restoreSession } from "./state.js";
import { setLang, t, getLang } from "./i18n.js";
import { esc, icon, $ } from "./ui.js";
import { installGlossary } from "./glossary.js";
import * as home from "./views/home.js";
import * as intake from "./views/intake.js";
import * as quiz from "./views/quiz.js";
import * as dashboard from "./views/dashboard.js";
import * as summary from "./views/summary.js";
import * as account from "./views/account.js";
import * as add from "./views/add.js";
import * as about from "./views/about.js";

const routes = { home, intake, quiz, dashboard, summary, account, add, about };
let routeOpts = {};
const ctx = { go(route, opts = {}) { routeOpts = opts; if (location.hash === `#/${route}`) renderRoute(); else location.hash = `#/${route}`; } };

function applyTheme() {
  const sys = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = state.theme || (sys ? "dark" : "light");
  document.documentElement.setAttribute("data-theme", theme);
  const m = $('meta[name="theme-color"]'); if (m) m.setAttribute("content", theme === "dark" ? "#0c0f24" : "#eef0fa");
}
function renderTop() {
  const theme = document.documentElement.getAttribute("data-theme");
  const nav = state.planReadyAt ? "dashboard" : "home";
  $("#top").innerHTML = `
    <div class="brand" data-go="${nav}" role="link" tabindex="0"><div class="logo">${icon("map")}</div><span>${esc(t("appName"))}</span></div>
    <div class="pill-toggle" aria-label="${esc(t("language"))}"><button class="${getLang() === "en" ? "on" : ""}" data-lang="en">EN</button><button class="${getLang() === "hi" ? "on" : ""}" data-lang="hi">हिं</button></div>
    <button class="icon-btn" data-go="account" aria-label="${esc(t("account"))}">${icon("user")}</button>
    <button class="icon-btn" id="theme" aria-label="${esc(t("theme"))}">${icon(theme === "dark" ? "sun" : "moon")}</button>`;
  $("#top").querySelectorAll("[data-go]").forEach((b) => { b.onclick = () => ctx.go(b.dataset.go); b.onkeydown = (e) => { if (e.key === "Enter") ctx.go(b.dataset.go); }; });
  $("#top").querySelectorAll("[data-lang]").forEach((b) => b.onclick = () => { state.lang = b.dataset.lang; setLang(state.lang); document.documentElement.lang = state.lang; savePrefs(); renderTop(); renderRoute(); });
  $("#theme").onclick = () => { const cur = document.documentElement.getAttribute("data-theme"); state.theme = cur === "dark" ? "light" : "dark"; savePrefs(); applyTheme(); renderTop(); };
}
async function renderRoute() {
  const name = (location.hash.replace(/^#\/?/, "") || "home").split("?")[0];
  const view = routes[name] || routes.home;
  const root = $("#view");
  root.className = "";
  try { await view.render(root, ctx, routeOpts); } catch (e) { console.error(e); root.innerHTML = `<section class="glass card"><h2>Something went wrong</h2><pre class="mono small">${esc(e.stack || e)}</pre><button class="btn btn-primary" onclick="location.hash='#/home'">Home</button></section>`; }
  routeOpts = {};
  renderTop();
}
function boot() {
  loadPrefs(); setLang(state.lang); document.documentElement.lang = state.lang; applyTheme();
  restoreSession();
  installGlossary();
  window.addEventListener("hashchange", renderRoute);
  if (window.matchMedia) window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { if (!state.theme) { applyTheme(); renderTop(); } });
  renderRoute();
  // Offline: cache the app shell + data when a service worker is allowed by the host.
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) { navigator.serviceWorker.register("sw.js").catch(() => {}); }
}
boot();
