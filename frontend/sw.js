// Service worker: caches what can never be stale, and still refuses to paint
// the app without its server.
//
// Two decisions meet here and agree once the offline answer is an honest page:
//
// 1. The owner, earlier: *"if the backend is closed the ui should fail to load
//    or connect on browsers until started back up again."* MemoryMap is a front
//    end for a local server that holds every note, file and model call. With
//    the server down, a cached shell painted tabs, toolbars and empty lists: a
//    working-looking app over an empty notebook, the most alarming thing it
//    could show someone whose notes are all on that machine. So the shell
//    (`/`, `/index.html`) is **never** cached here, and nothing under `/api/`
//    or `/auth/` is either.
// 2. WORLD_CLASS_PLAN decision 49 (25d): the reason the worker used to cache
//    nothing (a stale `app.js` served after an update) is gone, because every
//    local script and stylesheet URL is `?v=<version>-<hash of that file>`
//    (`_stamp_for` in api/app.py). A cache keyed on the full URL cannot hand
//    back a stale file: an edited file is a different key. So stamped
//    `/js/*` and `/css/*`, the vendored libraries, the icons and the manifest
//    are cache-first, and a reload no longer waits on the disk cache's
//    revalidation.
//
// What a failed navigation gets is `/offline.html`: "MemoryMap is not running
// on this computer", one line of what to do, and Retry. It is kept at install
// together with the stylesheets and script it links.
//
// The cache is named for the app version (`memorymap-assets-<version>`, read
// from this worker's own `?v=` in settings-wiring.js), so a version bump
// installs a new worker, which drops the old set when it activates. The
// caches the earlier shell-caching worker left (`memorymap-shell-*`) are
// deleted too, which is why this file must keep running: a worker that is
// simply removed is not fetched again, and every browser that installed the
// old one would serve its stale shell forever. `clearAppCache` (phone-shell.js)
// still clears everything on demand.

const CACHE_PREFIX = "memorymap-assets-";
const RETIRED_CACHE_PREFIX = "memorymap-shell-";
const VERSION = new URL(self.location.href).searchParams.get("v") || "dev";
const CACHE = CACHE_PREFIX + VERSION;
const OFFLINE_PATH = "/offline.html";

// Unstamped files that change only with a release, so the per-version cache
// is their staleness bound. /css and /js are cached only when stamped.
const FIXED_PATHS = new Set([
  "/favicon.svg",
  "/icon-maskable.svg",
  "/icon-512.png",
  "/apple-touch-icon.png",
  "/icon.ico",
  "/manifest.webmanifest",
]);

// The allow-list is the whole policy: anything not matched here, the API,
// the auth routes, the page itself, this worker, is left to the network.
function cacheable(url) {
  if (url.origin !== self.location.origin) return false;
  const path = url.pathname;
  if (path.startsWith("/js/") || path.startsWith("/css/")) return url.searchParams.has("v");
  return path.startsWith("/vendor/") || FIXED_PATHS.has(path);
}

// A plain 200 from this origin. Not a redirect, an error, or a response that
// sets a cookie (a session must never be replayed from a cache).
function storable(response) {
  return (
    response.status === 200 &&
    response.type !== "opaque" &&
    !response.headers.has("set-cookie")
  );
}

async function keepOfflinePage() {
  const cache = await caches.open(CACHE);
  const page = await fetch(OFFLINE_PATH, { cache: "reload" });
  if (!storable(page)) return;
  const html = await page.clone().text();
  await cache.put(new URL(OFFLINE_PATH, self.location.origin).href, page);
  const linked = [...html.matchAll(/(?:href|src)="(\/[^"#]+)"/g)].map((m) => new URL(m[1], self.location.origin));
  await Promise.all(
    linked
      .filter(cacheable)
      .map((url) =>
        fetch(url.href)
          .then((res) => (storable(res) ? cache.put(url.href, res) : undefined))
          .catch(() => {})
      )
  );
}

self.addEventListener("install", (event) => {
  // `skipWaiting` so a browser still running an older worker replaces it on
  // this load rather than the next one. A failed keep (the server went away
  // mid-install) is not fatal: without the page, the browser's own "can't
  // connect" error shows, which is what the worker did before.
  self.skipWaiting();
  event.waitUntil(keepOfflinePage().catch(() => {}));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key.startsWith(RETIRED_CACHE_PREFIX) ||
                (key.startsWith(CACHE_PREFIX) && key !== CACHE)
            )
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  // A top-level page load: network-first. If the server answers, the worker
  // is invisible (the share target's `/?share_text=` included). If it cannot
  // be reached, the offline page, never the app.
  if (request.mode === "navigate" && request.destination === "document") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE);
        return (
          (await cache.match(new URL(OFFLINE_PATH, self.location.origin).href)) ||
          Response.error()
        );
      })
    );
    return;
  }

  // A ranged request is a partial body; it is not stored whole.
  if (request.headers.has("range")) return;
  const url = new URL(request.url);
  if (!cacheable(url)) return;

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const hit = await cache.match(url.href);
      if (hit) return hit;
      const response = await fetch(request);
      if (storable(response)) event.waitUntil(cache.put(url.href, response.clone()));
      return response;
    })
  );
});
