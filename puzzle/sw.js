// Sentence Puzzle service worker. Scope is this folder only (register with "./").
// Cache names start with "puzzle-" so they never collide with the main app's nova-* caches.
// This worker does not delete nova-* caches and does not intercept the parent app or .enc files.
// Version must match puzzle/meta.json "v".
const VERSION = "2";
const CACHE = "puzzle-shell-v" + VERSION;
const SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./meta.json",
  "./sentences.json",
  "./naval.json",
  "./icons/favicon-32.png",
  "./icons/icon-180.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png"
];

function scopePath() {
  return new URL(self.registration.scope).pathname;
}

function inScope(url) {
  return url.origin === self.location.origin && url.pathname.startsWith(scopePath());
}

async function audioUrls() {
  const res = await fetch(new URL("sentences.json", self.registration.scope), { cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json();
  const out = [];
  for (const s of data.sentences || []) {
    const raw = typeof s.audio === "string" ? s.audio : (s.audio && (s.audio.url || s.audio.src));
    if (!raw || /^(https?:|blob:|data:)/i.test(raw) || raw.endsWith(".enc")) continue;
    if (raw.indexOf("audio/naval/") === 0) continue;
    out.push(new URL(raw, self.registration.scope).href);
  }
  return out;
}

async function putOk(cache, url) {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (res.ok) await cache.put(url, res);
  } catch (e) {}
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(SHELL);
    const urls = await audioUrls();
    await Promise.all(urls.map((url) => putOk(cache, url)));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith("puzzle-") && k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (!inScope(url)) return;
  if (url.pathname.endsWith(".enc")) return;
  event.respondWith(fromCache(req, url));
});

async function fromCache(req, url) {
  const cache = await caches.open(CACHE);
  const nav = req.mode === "navigate";
  const meta = url.pathname.endsWith("/meta.json");
  try {
    const fresh = await fetch(req, meta ? { cache: "no-store" } : {});
    if (fresh.ok) {
      const ct = (fresh.headers.get("content-type") || "").toLowerCase();
      if (!(meta && ct.includes("text/html"))) {
        try { await cache.put(req, fresh.clone()); } catch (err) {}
      }
    }
    return fresh;
  } catch (e) {
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    if (nav) {
      const home = await cache.match("./index.html") || await cache.match("./");
      if (home) return home;
    }
    return Response.error();
  }
}
