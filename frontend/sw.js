// Service worker (Wave F): cache the app shell so MemoryMap opens
// instantly — and still opens at all — while the local server is the
// only network it ever needs. API calls are NEVER cached: notes must
// always be live, and answers must never come from yesterday.
const CACHE = "memorymap-shell-v1";
const SHELL = [
  "/",
  "/app.js",
  "/style.css",
  "/favicon.svg",
  "/vendor/d3.v7.min.js",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Drop caches from older versions of the shell.
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const isShell =
    event.request.method === "GET" &&
    (SHELL.includes(url.pathname) || url.pathname.startsWith("/vendor/"));
  if (!isShell) return; // API and uploads go straight to the server

  // Network first, cache as the fallback: a running server always wins,
  // the cache only steps in when the server isn't up yet.
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
