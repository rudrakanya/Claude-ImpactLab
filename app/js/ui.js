// Small DOM helpers: escaping, icons, toast, bottom sheet.
export function esc(s) { return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// Lucide-style inline icons (stroke), same set the design assets use.
const I = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  arrowLeft: '<path d="m12 19-7-7 7-7M19 12H5"/>',
  arrowRight: '<path d="M5 12h14M12 5l7 7-7 7"/>',
  external: '<path d="M15 3h6v6M10 14 21 3M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/>',
  print: '<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/>',
  save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  briefcase: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
  user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
  map: '<path d="M9 18l-6 3V6l6-3 6 3 6-3v15l-6 3-6-3zM9 3v15M15 6v15"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  help: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  refresh: '<path d="M21 12a9 9 0 0 1-15.5 6.3L3 16M3 12a9 9 0 0 1 15.5-6.3L21 8M21 3v5h-5M3 21v-5h5"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
};
export function icon(name, cls = "") { return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[name] || ""}</svg>`; }

let toastTimer;
export function toast(msg, ms = 2400) {
  let el = $("#toast");
  if (!el) { el = document.createElement("div"); el.id = "toast"; el.className = "glass toast"; document.body.appendChild(el); }
  el.innerHTML = msg; el.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.hidden = true; }, ms);
}
export function sheet(html, opts = {}) {
  closeSheet();
  const b = document.createElement("div"); b.className = "sheet-backdrop"; b.id = "sheet";
  b.innerHTML = `<div class="glass sheet" role="dialog" aria-modal="true">${html}<div class="row" style="margin-top:14px"><button class="btn btn-ghost btn-block" data-close>${esc(opts.closeLabel || "OK")}</button></div></div>`;
  b.addEventListener("click", (e) => { if (e.target === b || e.target.closest("[data-close]")) closeSheet(); });
  document.body.appendChild(b);
  return b;
}
export function closeSheet() { const s = $("#sheet"); if (s) s.remove(); }
// Promise-based confirm rendered as a sheet (native confirm() is blocked inside sandboxed hosts).
export function confirmSheet(message, okLabel = "Yes", cancelLabel = "Cancel") {
  return new Promise((resolve) => {
    closeSheet();
    const b = document.createElement("div"); b.className = "sheet-backdrop"; b.id = "sheet";
    b.innerHTML = `<div class="glass sheet" role="dialog" aria-modal="true"><p style="font-weight:600">${esc(message)}</p><div class="row"><button class="btn btn-ghost" data-c="0" style="flex:1">${esc(cancelLabel)}</button><button class="btn btn-primary" data-c="1" style="flex:1">${esc(okLabel)}</button></div></div>`;
    b.addEventListener("click", (e) => { const t = e.target.closest("[data-c]"); if (t) { closeSheet(); resolve(t.dataset.c === "1"); } else if (e.target === b) { closeSheet(); resolve(false); } });
    document.body.appendChild(b);
  });
}
// Clipboard with a fallback: hosts that block the clipboard API get the text in a sheet to copy by hand.
export async function copyText(text, okMsg = "Copied") {
  try { await navigator.clipboard.writeText(text); toast(okMsg); }
  catch { sheet(`<p class="small muted">Select and copy:</p><textarea class="input mono" rows="8" readonly onclick="this.select()">${esc(text)}</textarea>`); }
}
export function fmtHours(h) { return h >= 100 ? `${Math.round(h / 10) * 10}` : `${h}`; }
export function tierColorClass(t) { return `tier-${t}`; }
