// Service worker (Wave F; hardened in Wave O). Caches the app shell so
// MemoryMap opens instantly and still opens while the local server is
// briefly down. API calls are NEVER cached — notes must always be live.
//
// Wave O fix: a stale cache was serving old app.js/style.css after an
// update (the graph overlay, model pickers, and buttons all looked
// "broken" because the HTML was new but the CSS/JS were old). The cache
// name is now versioned, the worker takes over immediately, and it tells
// open pages to reload once so fresh assets always win.
// Bumped with the icon set: a stale cache would keep serving the old favicon
// long after the new one shipped, which is exactly the class of bug the
// version in this name exists to prevent.
// Bumped again for the style.css split (ROADMAP.md Priority 0 item 2):
// single-file "/style.css" no longer exists on disk, and precaching a 404
// would fail the whole addAll() call, taking the entire shell offline-cache
// with it — not a soft failure, install() rejects and nothing gets cached.
// Bumped a third time for the app.js/whiteboard.js split (same roadmap
// item's other half): the whiteboard tab is now served from a second file
// that also has to be in this list, or a page loaded offline gets app.js
// from the cache but a 404 for whiteboard.js and the tab renders blank.
// Bumped a fourth time for the graph.js extraction (frontend refactor
// path, the step after whiteboard): same failure mode — the Graph tab
// would 404 offline without this file precached too.
const CACHE = "memorymap-shell-v10";
const SHELL = [
  "/",
  "/graph.js",
  "/app.js",
  "/whiteboard.js",
  // style.css split into eight files, in load order — see index.html's
  // <link> tags for why the order matters (00 holds :root and other
  // global-scope declarations later files' var() calls depend on).
  "/css/00-tokens-shell.css",
  "/css/01-forms-settings.css",
  "/css/02-chat-graph.css",
  "/css/03-dashboard-widgets.css",
  "/css/04-chat-dock-appearance.css",
  "/css/05-sidebars-themes.css",
  "/css/06-timeline-dialogs.css",
  "/css/07-whiteboard-misc.css",
  // The icon font and its stylesheet are shell, not decoration: without them
  // every button in the app is a blank square. Precached so a cold offline
  // start still draws icons.
  "/vendor/phosphor/style.css",
  "/vendor/phosphor/Phosphor.woff2",
  "/favicon.svg",
  "/icon-maskable.svg",
  "/apple-touch-icon.png",
  "/icon-512.png",
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
