// Session-only state by default (sessionStorage). Durable storage only on explicit "Save plan to this device".
const SESSION_KEY = "wsiln:session";
const SAVED_KEY = "wsiln:saved";
const PREF_KEY = "wsiln:prefs"; // language + theme only (no learner data)

export const state = {
  lang: "en", theme: null,
  profile: null,        // { objective, device, hoursPerWeek, english, tech, exposure[], subjects[], selfTiers{} }
  tracks: {},           // trackId -> { subjectId, selfTier, tier, quiz, path, completions, capstone, exitCheck, credentials[], flags }
  primaryTrack: null,
  startedAt: null, planReadyAt: null,
  savedAt: null,
  user: null,
};

function safe(fn, fallback) { try { return fn(); } catch { return fallback; } }

export function loadPrefs() {
  const p = safe(() => JSON.parse(localStorage.getItem(PREF_KEY) || "null"), null);
  if (p) { state.lang = p.lang || "en"; state.theme = p.theme || null; }
}
export function savePrefs() { safe(() => localStorage.setItem(PREF_KEY, JSON.stringify({ lang: state.lang, theme: state.theme })), null); }

export function persistSession() {
  const { profile, tracks, primaryTrack, startedAt, planReadyAt, savedAt } = state;
  safe(() => sessionStorage.setItem(SESSION_KEY, JSON.stringify({ profile, tracks, primaryTrack, startedAt, planReadyAt, savedAt })), null);
}
export function restoreSession() {
  const s = safe(() => JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null"), null);
  if (s) Object.assign(state, s);
  return !!s;
}
export function clearSession() {
  state.profile = null; state.tracks = {}; state.primaryTrack = null; state.startedAt = null; state.planReadyAt = null; state.savedAt = null;
  safe(() => sessionStorage.removeItem(SESSION_KEY), null);
}
export function hasSaved() { return !!safe(() => localStorage.getItem(SAVED_KEY), null); }
export function saveToDevice() {
  state.savedAt = new Date().toISOString();
  const { profile, tracks, primaryTrack, startedAt, planReadyAt, savedAt } = state;
  safe(() => localStorage.setItem(SAVED_KEY, JSON.stringify({ profile, tracks, primaryTrack, startedAt, planReadyAt, savedAt })), null);
  persistSession();
}
export function loadSaved() {
  const s = safe(() => JSON.parse(localStorage.getItem(SAVED_KEY) || "null"), null);
  if (s) { Object.assign(state, s); persistSession(); }
  return !!s;
}
export function deleteSaved() { safe(() => localStorage.removeItem(SAVED_KEY), null); safe(() => localStorage.removeItem("wsiln:keys"), null); state.savedAt = null; persistSession(); }

export function trackState(id) { return state.tracks[id]; }
export function ensureTrack(id, init = {}) {
  if (!state.tracks[id]) state.tracks[id] = { completions: {}, capstone: { status: "none" }, credentials: [], flags: {}, ...init };
  return state.tracks[id];
}
export function exportJson() {
  const { profile, tracks, primaryTrack, startedAt, planReadyAt } = state;
  return JSON.stringify({ app: "what-should-i-learn-next", version: 1, exportedAt: new Date().toISOString(), profile, tracks, primaryTrack, startedAt, planReadyAt }, null, 2);
}
