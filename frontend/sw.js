// Service worker (Wave F; hardened in Wave O). Caches the app shell so
// MemoryMap opens instantly and still opens while the local server is
// briefly down. API calls are NEVER cached — notes must always be live.
//
// Wave O fix: a stale cache was serving old app.js/style.css after an
// update (the graph overlay, model pickers, and buttons all looked
// "broken" because the HTML was new but the CSS/JS were old). The cache
// name is now versioned, the worker takes over immediately, and it tells
// open pages to reload once so fresh assets always win.
const CACHE = "memorymap-shell-v2";
const SHELL = [
  "/",
  "/app.js",
  "/style.css",
  "/favicon.svg",
  "/vendor/d3.v7.min.js",
  "/vendor/p5.min.js",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting(); // don't wait for old tabs to close
});

self.addEventListener("activate", (event) => {
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

  // Network first, cache only as an offline fallback — a running server
  // always wins, so an updated asset is served the moment it's deployed.
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
