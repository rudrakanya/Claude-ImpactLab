// Per-device, tamper-evident credentials using the browser's Web Crypto API (ECDSA P-256).
// The private key is generated on this device and stored only when the learner saves to device.
const KEY_STORE = "wsiln:keys";
const enc = new TextEncoder();

function b64(buf) { return btoa(String.fromCharCode(...new Uint8Array(buf))); }
function unb64(s) { return Uint8Array.from(atob(s), (c) => c.charCodeAt(0)); }
function canonical(obj) { // stable JSON: sorted keys
  if (Array.isArray(obj)) return "[" + obj.map(canonical).join(",") + "]";
  if (obj && typeof obj === "object") return "{" + Object.keys(obj).sort().map((k) => JSON.stringify(k) + ":" + canonical(obj[k])).join(",") + "}";
  return JSON.stringify(obj);
}
async function fingerprint(jwk) {
  const d = await crypto.subtle.digest("SHA-256", enc.encode(canonical({ crv: jwk.crv, kty: jwk.kty, x: jwk.x, y: jwk.y })));
  return [...new Uint8Array(d)].slice(0, 8).map((b) => b.toString(16).padStart(2, "0")).join(":");
}
let cached = null;
export async function deviceKeys(persist) {
  if (cached) return cached;
  let stored = null;
  try { stored = JSON.parse(localStorage.getItem(KEY_STORE) || "null"); } catch {}
  if (stored) {
    const priv = await crypto.subtle.importKey("jwk", stored.priv, { name: "ECDSA", namedCurve: "P-256" }, true, ["sign"]);
    const pub = await crypto.subtle.importKey("jwk", stored.pub, { name: "ECDSA", namedCurve: "P-256" }, true, ["verify"]);
    cached = { priv, pub, pubJwk: stored.pub, fp: await fingerprint(stored.pub) };
    return cached;
  }
  const kp = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const pubJwk = await crypto.subtle.exportKey("jwk", kp.publicKey);
  const privJwk = await crypto.subtle.exportKey("jwk", kp.privateKey);
  cached = { priv: kp.privateKey, pub: kp.publicKey, pubJwk, fp: await fingerprint(pubJwk) };
  if (persist) { try { localStorage.setItem(KEY_STORE, JSON.stringify({ pub: pubJwk, priv: privJwk })); } catch {} }
  return cached;
}
export async function issueCredential(payload, persistKey) {
  const keys = await deviceKeys(persistKey);
  const body = { ...payload, issuedAt: new Date().toISOString(), publicKeyFingerprint: keys.fp,
    statement: "Self-attestation of completed work recorded in 'What Should I Learn Next?'. Not an institutional accreditation. Not an employment guarantee." };
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, keys.priv, enc.encode(canonical(body)));
  return { v: 1, alg: "ES256", payload: body, publicKey: { kty: keys.pubJwk.kty, crv: keys.pubJwk.crv, x: keys.pubJwk.x, y: keys.pubJwk.y }, signature: b64(sig) };
}
export async function verifyCredential(cred) {
  try {
    if (!cred || cred.v !== 1 || !cred.payload || !cred.publicKey || !cred.signature) return { ok: false, reason: "malformed" };
    const pub = await crypto.subtle.importKey("jwk", cred.publicKey, { name: "ECDSA", namedCurve: "P-256" }, true, ["verify"]);
    const fp = await fingerprint(cred.publicKey);
    if (fp !== cred.payload.publicKeyFingerprint) return { ok: false, reason: "fingerprint mismatch" };
    const ok = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, pub, unb64(cred.signature), enc.encode(canonical(cred.payload)));
    return { ok, reason: ok ? "" : "signature mismatch", fp };
  } catch (e) { return { ok: false, reason: String(e && e.message || e) }; }
}
