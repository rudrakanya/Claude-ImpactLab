// Tap-to-explain glossary: wraps known terms anywhere in app copy and opens a plain-language sheet.
import { GLOSSARY } from "./data/glossary.js";
import { getLang } from "./i18n.js";
import { esc, sheet } from "./ui.js";

const entries = GLOSSARY.map((g) => ({ ...g, all: [g.term, ...(g.aliases || [])].filter(Boolean) }));
const index = new Map();
for (const e of entries) for (const a of e.all) index.set(a.toLowerCase(), e);
// longest aliases first so "browser tab" wins over "browser"
const patterns = [...index.keys()].sort((a, b) => b.length - a.length).map((a) => a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
const re = new RegExp(`(?<![\\w-])(${patterns.join("|")})(?![\\w-])`, "gi");

// Wrap up to `max` distinct terms in an HTML-escaped string.
export function gl(text, max = 6) {
  if (!text) return "";
  const seen = new Set();
  return esc(text).replace(re, (m) => {
    const e = index.get(m.toLowerCase());
    if (!e || seen.has(e.term) || seen.size >= max) return m;
    seen.add(e.term);
    return `<span class="gl" data-term="${esc(e.term)}" role="button" tabindex="0">${m}</span>`;
  });
}
export function explain(term) {
  const e = index.get(String(term).toLowerCase());
  if (!e) return;
  const lang = getLang();
  const body = lang === "hi" ? e.hi : e.en;
  const other = lang === "hi" ? e.en : e.hi;
  sheet(`<h3>${esc(e.term)}</h3><p>${esc(body)}</p><details><summary class="muted-2 small">${lang === "hi" ? "English" : "हिंदी"}</summary><p class="muted">${esc(other)}</p></details>`);
}
export function installGlossary(root = document) {
  root.addEventListener("click", (ev) => { const el = ev.target.closest(".gl"); if (el) { ev.preventDefault(); explain(el.dataset.term); } });
  root.addEventListener("keydown", (ev) => { if (ev.key === "Enter" && ev.target.classList && ev.target.classList.contains("gl")) explain(ev.target.dataset.term); });
}
export function allTerms() { return entries; }
