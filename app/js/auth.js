// Optional Firebase Authentication + Firestore sync, client SDK only. Guest mode never touches this.
// Enable by filling app/js/firebase-config.js (see README). When disabled, the UI says so plainly.
import { state, persistSession } from "./state.js";

let fb = null; // { app, auth, db, fns }
export async function authAvailable() {
  try {
    const cfg = (await import("./firebase-config.js")).FIREBASE_CONFIG;
    return !!(cfg && cfg.enabled && cfg.apiKey);
  } catch { return false; }
}
async function init() {
  if (fb) return fb;
  const { FIREBASE_CONFIG: cfg } = await import("./firebase-config.js");
  const v = cfg.sdkVersion || "10.12.2";
  const base = `https://www.gstatic.com/firebasejs/${v}`;
  const [{ initializeApp }, authMod, fsMod] = await Promise.all([
    import(`${base}/firebase-app.js`), import(`${base}/firebase-auth.js`), import(`${base}/firebase-firestore.js`),
  ]);
  const app = initializeApp(cfg);
  fb = { app, auth: authMod.getAuth(app), db: fsMod.getFirestore(app), authMod, fsMod };
  authMod.onAuthStateChanged(fb.auth, (u) => { state.user = u ? { uid: u.uid, name: u.displayName, provider: (u.providerData[0] || {}).providerId } : null; document.dispatchEvent(new CustomEvent("auth-change")); });
  return fb;
}
export async function signIn(provider) {
  const f = await init();
  const { GoogleAuthProvider, OAuthProvider, signInWithPopup } = f.authMod;
  const p = provider === "apple" ? new OAuthProvider("apple.com") : new GoogleAuthProvider();
  await signInWithPopup(f.auth, p);
}
export async function signOut() { const f = await init(); await f.authMod.signOut(f.auth); }
// Migrate current guest/session state into the account (explicit, learner-initiated).
export async function syncUp() {
  const f = await init(); if (!state.user) return;
  const { doc, setDoc, serverTimestamp } = f.fsMod;
  const uid = state.user.uid; const p = state.profile || {};
  await setDoc(doc(f.db, "users", uid), { displayName: state.user.name || null, authProvider: state.user.provider || null, createdAt: serverTimestamp(),
    preferences: { language: state.lang, theme: state.theme }, objective: p.objective, techFamiliarity: p.tech, englishFamiliarity: p.english,
    deviceAccess: p.device, timeAvailablePerWeek: p.hoursPerWeek, priorExposureChecklist: p.exposure || [] }, { merge: true });
  for (const [tid, ts] of Object.entries(state.tracks)) {
    await setDoc(doc(f.db, "users", uid, "tracks", String(tid)), { chosenSkillLabels: [ts.subjectId], isPrimary: Number(tid) === state.primaryTrack, currentTier: ts.tier, rankScore: ts.rank || 0, path: ts.path, quiz: ts.quiz || null, completions: ts.completions, capstone: ts.capstone, exitCheck: ts.exitCheck || null }, { merge: true });
    for (const c of ts.credentials || []) await setDoc(doc(f.db, "users", uid, "credentials", c.payload.credentialId), { trackId: Number(tid), tier: c.payload.tier, issuedAt: c.payload.issuedAt, payloadJson: JSON.stringify(c.payload), signature: c.signature, publicKeyFingerprint: c.payload.publicKeyFingerprint });
  }
}
export async function syncDown() {
  const f = await init(); if (!state.user) return false;
  const { doc, getDoc, collection, getDocs } = f.fsMod;
  const uid = state.user.uid;
  const u = await getDoc(doc(f.db, "users", uid)); if (!u.exists()) return false;
  const d = u.data();
  state.profile = state.profile || { objective: d.objective, device: d.deviceAccess, hoursPerWeek: d.timeAvailablePerWeek, english: d.englishFamiliarity, tech: d.techFamiliarity, exposure: d.priorExposureChecklist || [], subjects: [], selfTiers: {} };
  const ts = await getDocs(collection(f.db, "users", uid, "tracks"));
  ts.forEach((snap) => { const x = snap.data(); state.tracks[snap.id] = { subjectId: x.chosenSkillLabels && x.chosenSkillLabels[0], tier: x.currentTier, path: x.path, quiz: x.quiz, completions: x.completions || {}, capstone: x.capstone || { status: "none" }, exitCheck: x.exitCheck, credentials: [], flags: {} }; if (x.isPrimary) state.primaryTrack = Number(snap.id); });
  persistSession();
  return true;
}
