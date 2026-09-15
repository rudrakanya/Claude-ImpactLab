// Network-first service worker with cache fallback: online you always get the latest files; offline the whole app
// (shell + bundled catalogue) is served from the cache filled on first load.
const CACHE = "wsiln-v3";
const ASSETS = ["./", "./index.html", "./css/app.css", "./vendor/qrcode.min.js", "./js/main.js", "./js/state.js", "./js/i18n.js", "./js/ui.js", "./js/glossary.js", "./js/engine.js", "./js/credentials.js", "./js/auth.js", "./js/firebase-config.js",
  "./js/views/home.js", "./js/views/intake.js", "./js/views/quiz.js", "./js/views/dashboard.js", "./js/views/summary.js", "./js/views/account.js", "./js/views/add.js", "./js/views/about.js", "./js/prompts.js",
  "./js/data/catalogue.js", "./js/data/picks.js", "./js/data/subjects.js", "./js/data/tracks.js", "./js/data/quiz_bank.js", "./js/data/capstones.js", "./js/data/glossary.js", "./js/data/work_categories.js", "./js/data/reference_pathways.js", "./js/data/ai_topics.js", "./js/data/synthetic_profiles.js", "./js/data/job_skills.js"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then((res) => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); } return res; }).catch(() => caches.match(e.request).then((hit) => hit || caches.match("./index.html"))));
});
