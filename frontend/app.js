// MemoryMap AI frontend: plain JS, no framework (locked decision, plan §2).
// All DOM nodes are built with createElement/textContent, never innerHTML,
// so a note containing <script> is just text, not code.

// --- browser log capture (Wave A) -----------------------------------------------
// Installed before anything else runs so no message is missed. Shown in
// Settings → Logs alongside the server's records.

const browserLogs = [];
const MAX_BROWSER_LOGS = 500;

function recordBrowserLog(level, parts) {
  const record = {
    time: new Date().toISOString(),
    level,
    message: parts
      .map((p) => {
        if (typeof p === "string") return p;
        try {
          return JSON.stringify(p);
        } catch {
          return String(p);
        }
      })
      .join(" "),
  };
  browserLogs.push(record);
  if (browserLogs.length > MAX_BROWSER_LOGS) browserLogs.shift();

  // Live-push into the Logs page if it is currently open.
  // `logRecords`, `logScreenOpen`, `sortLogRecords`, `renderActiveLogView`,
  // `scrollLogToBottom` and `bumpLogErrorBadge` all live in settings.js now
  // (§88.3 item 4; previously later in this same file), which loads after
  // this one: so any `console.*` call during app.js's own early boot,
  // before settings.js has run, needs the same typeof guard this line
  // needed even when everything was one file. Confirmed live: this is
  // exactly the path a `console.warn`/`console.error` fired from app.js's
  // own startup would take, and it already degrades to "skip the live
  // push" rather than throwing, same as before the split.
  if (typeof logRecords !== "undefined" && typeof logScreenOpen !== "undefined") {
    const liveRecord = { ...record, source: "browser", logger: "browser",
      key: `b-live-${Date.now()}-${Math.random()}` };
    logRecords.push(liveRecord);
    if (typeof sortLogRecords === "function") sortLogRecords();
    if (logScreenOpen && typeof renderActiveLogView === "function") {
      renderActiveLogView();
      // Scroll to bottom so the new error is visible without manual scroll.
      if (typeof scrollLogToBottom === "function") scrollLogToBottom();
    }
    // Bump the error badge in the Logs button so the user knows to check.
    if (typeof bumpLogErrorBadge === "function") bumpLogErrorBadge(record);
  }
}

for (const level of ["log", "info", "warn", "error"]) {
  const original = console[level].bind(console);
  console[level] = (...parts) => {
    recordBrowserLog(level.toUpperCase(), parts);
    original(...parts);
  };
}
window.addEventListener("error", (e) =>
  // e.error.stack, when present, is what actually locates the bug, the
  // message/filename/lineno triple alone has sent more than one session
  // hunting for a null-dereference with no line number to start from.
  recordBrowserLog("ERROR", [
    `${e.message} (${e.filename}:${e.lineno}:${e.colno})`,
    e.error?.stack || "",
  ])
);
window.addEventListener("unhandledrejection", (e) =>
  recordBrowserLog("ERROR", [
    "Unhandled promise rejection:",
    e.reason?.stack || String(e.reason),
  ])
);

// Below this confidence an entry gets a "check this" flag (plan Phase 3).
const REVIEW_THRESHOLD = 50;

let allEntries = []; // latest GET /entries result, newest first
// Whether that has ever come back. An empty notebook and a notebook that
// has not loaded yet look identical from `allEntries.length` alone.
let entriesEverLoaded = false;
// Bumped by every loadEntries() call, checked by its own background page
// fetches before they touch allEntries, the same "stale response" guard
// loadOnboardingDiagnostics uses. loadEntries can page in the background for
// a large notebook (see ENTRIES_PAGE_SIZE below), and loadEntries can also
// be called again mid-page-load (saving a note, deleting a category), a
// slow page from the *first* call landing after a second call already
// replaced allEntries would silently splice stale/duplicate rows back in.
let _entriesLoadGeneration = 0;
let activeCategory = null; // sidebar filter; null = All
// A second, orthogonal sidebar filter (not a category): asked for
// directly, so drafts (Writing Room saves, "Save as draft note" captures)
// are findable as a group instead of only a per-note chip. Mutually
// exclusive with activeCategory: picking one clears the other, same as
// switching categories already does.
let draftsOnly = false;
// **Favourites, as a third sidebar filter over a flag that already existed.**
// Asked for: "there should be a favourites folder or side parallel category
// that isnt an actual category but could be treated as one if toggled?? for
// notes??"
//
// Built on `entry.pinned` rather than on a new "starred" column, and that is
// the whole design decision. `pinned` is already per-note, already persisted,
// already toggled from a note's own chip, and already searchable as
// `is:pinned`, a second boolean meaning almost the same thing would be two
// half-used flags and two places to star something, which is exactly the
// "everything is different from everything else" this round is undoing. What
// was missing was never the data; it was the *place*: a row in the sidebar you
// can click, alongside the categories, the way Drafts already is.
//
// So `pinned` keeps its sort meaning (float to the top) and gains a collection
// meaning (a group you can go to). The same note is in both readings.
let favouritesOnly = false;
let linkSource = null; // entry id waiting for its link partner
let editingId = null; // entry id currently in inline-edit mode
//: Set by the "No tags yet" chip: the next edit form for this id opens with
//: its tags field focused. Read and cleared by renderEditForm.
let focusTagsAfterRender = null;
let inlineAction = null; // {id, kind: "context"|"continue"} open on a card
let busyEntryId = null; // entry the AI is currently working on (spinner shown)
let flashConfidenceId = null; // entry whose confidence badge just changed (flash once)
let noteSearch = ""; // Notes-tab text filter (Wave J)
// Why each note is in the filtered list, keyed by id: `{explain, scores}` from
// `GET /search` (the retrieval engine, Brief 11). The list itself is still
// filtered here in the browser, which is what keeps typing instant; this is
// the *explanation* the browser cannot produce, because two of the three
// signals (meaning, and distance over the links) only exist on the server.
// Cleared whenever the box is, so a stale reason can never outlive its query.
const noteSearchWhy = new Map();
let noteSort = "newest"; // newest | oldest | az | most-used (Wave J)
// BACKLOG §77 item 1. "all" (the default) keeps the existing continuous
// scroll (§86's renderIncrementally) untouched; a numeric size switches
// renderEntries to a single flat page of that many notes instead. Persisted
// the same way graph-gravity/graph-spread are, a plain localStorage read at
// declaration time, not the async preferences endpoint, since this is a
// display choice with no reason to round-trip the server.
let notesPageSize = localStorage.getItem("notes-page-size") || "all";
let notesCurrentPage = 1;

const $ = (id) => document.getElementById(id);
const show = (...ids) => ids.forEach((id) => $(id).classList.remove("hidden"));
const hide = (...ids) => ids.forEach((id) => $(id).classList.add("hidden"));

// --- tiny API helper --------------------------------------------------------

function authToken() {
  return localStorage.getItem("token") || "";
}

// `/media/...` and `/files/...` are the two routes a plain `<img src>` (or a
// note's own inline `![]()` markdown, rendered straight into an `<img>` tag)
// points at directly: a declarative resource load never attaches the
// X-Auth-Token header the way `apiJson`/`fetch` calls here do, so every such
// image was a silent 401 (an empty/broken image, nothing thrown, nothing
// logged, `isRenderableUrl` already having confirmed it same-origin) on any
// notebook with a password set, which is the normal case. The backend's
// `require_unlock_media` accepts the media cookie for exactly these two
// prefixes; every other endpoint stays header-only. `mediaSrc` is still the
// one door every such URL goes through (it resolves staged pictures), so
// every call site keeps using it unconditionally.
//: **Declared up here, and the reason is the `SPACE_ALL` story below.** A
//: `const` is in the temporal dead zone until its own line runs, and
//: `mediaSrc` is called during boot, long before the capture composer's own
//: section of this file is reached. Left where they logically belong (beside
//: `handleFileUpload`), the very first render would throw
//: `ReferenceError: Cannot access 'STAGED_URL_PREFIX' before initialization`,
//: which `node --check` cannot see because the file is syntactically perfect.
const STAGED_URL_PREFIX = "staged:";

//: Images waiting for a note to exist, the bytes stay in the browser until
//: Save produces an id. See `handleFileUpload` for the whole arrangement.
let captureStagedImages = [];

//: The one place that knows the placeholder's shape, so the renderer and the
//: rewrite cannot disagree about it.
function stagedImageUrl(key) {
  return `${STAGED_URL_PREFIX}${key}`;
}

function stagedImageByUrl(url) {
  if (typeof url !== "string" || !url.startsWith(STAGED_URL_PREFIX)) return null;
  const key = url.slice(STAGED_URL_PREFIX.length);
  return captureStagedImages.find((image) => image.key === key) || null;
}

//: **The one thing staging must never do: reach the database.**
//:
//: REDESIGN.md §R7.2 held this feature back for a whole session over exactly
//: this failure mode, and the wording is worth keeping: every path that can
//: save the composer has to rewrite the staged markers first, and one that
//: does not leaves `staged:`/`blob:` URLs inside saved note content, 
//: *corrupted notes, which is worse than the recoverable orphan it replaces*
//: (orphans already have a collector; a note whose picture is a dead
//: in-memory key has nothing).
//:
//: That section asked for "a test per save path". This is the stronger
//: version of the same idea and the reason there is no allowlist of save
//: paths anywhere: rather than enumerate the functions that must remember to
//: call `rewriteStagedUrls`, an enumeration a future save path joins by
//: being forgotten: every request in the app passes through `api()`, so the
//: check lives there and a new save path is covered by existing.
//:
//: It throws rather than repairing. A silent fix would hide the bug and ship
//: a note missing its picture; a throw surfaces in the caller's own error
//: toast with the note still unsaved in the box, so nothing is lost.
//:
//: Matched on the markdown embed shape, not on the bare scheme: a note that
//: happens to contain the word "staged:" is ordinary prose, while `](staged:`
//: is a link target this app wrote and never a sentence a person typed.
const STAGED_IN_BODY = /]\((?:staged|blob):/;

function refuseStagedUrls(body) {
  if (typeof body !== "string" || !STAGED_IN_BODY.test(body)) return;
  throw new Error(
    "That still holds an image that hasn't finished uploading: try saving again in a moment."
  );
}

function mediaSrc(url) {
  //: A staged picture has no server url yet; its bytes are a Blob in this
  //: tab. Resolved here rather than at each `<img>` so every surface that
  //: renders note markdown, the composer preview, the live view, a widget , 
  //: shows it without knowing staging exists.
  if (typeof url === "string" && url.startsWith(STAGED_URL_PREFIX)) {
    return stagedImageByUrl(url)?.objectUrl || url;
  }
  //: **No credential goes in the URL** (WORLD_CLASS_PLAN §12, S1). This used
  //: to append the session token as a query parameter, which put the key to
  //: the whole notebook into history, the server's access log and any note an
  //: image address was pasted into. The media cookie the server sets at
  //: unlock (`MEDIA_COOKIE`, routes_auth.py) rides along on these loads by
  //: itself, opens `/media` and `/files` only, and no script can read it;
  //: `refreshMediaSession` below re-asks for it when a token is restored.
  return url;
}

//: The media cookie for a token this tab already holds: called on the boot
//: path before anything renders a picture, because a profile that kept the
//: token in localStorage may have lost its cookies (cleared site data, a
//: browser that drops them on exit). Unlock, setup and a password change set
//: the cookie in their own responses, so they never need this. Never throws:
//: a failure here is a broken picture, not a broken boot, and the first
//: locked request will show the lock screen anyway if the token is stale.
async function refreshMediaSession() {
  if (!authToken()) return;
  try {
    await fetch("/auth/media-session", {
      method: "POST",
      headers: { "X-Auth-Token": authToken() },
    });
  } catch {
    // Offline or the server is gone: the boot path says so on its own.
  }
}

// **A file that is no longer there should say so, not draw a broken frame.**
//
// Reported with a screenshot of a timeline popup: "a photo i attached to a
// note ages ago but deleted still randomly shows itself as a placeholder
// empty image with the image filename". A note's body keeps the
// `![name](/media/…)` markdown it was written with, so deleting the upload
// leaves a live `<img>` pointing at a 404, and what a browser draws for that
// is its own torn-page glyph beside the alt text, which is the filename. It
// looks like the app is broken rather than like the file is gone.
//
// One delegated listener rather than an `onerror` at each of the twenty-odd
// places that build an `<img>`: `error` does not bubble, but it *does*
// capture, so a single capturing listener on the document sees every image
// failure in the app, including the ones inside rendered markdown, which no
// call site here constructs and could not have been given a handler anyway.
//
// The note's text is deliberately left alone. Rewriting a person's own words
// because a file they referenced is missing is a bigger claim than this
// evidence supports (a media route can 404 for a locked notebook or a
// half-finished restore too), and it is not reversible. This says what is
// true, there was an image here and it is not available, in the app's own
// materials, and leaves the source as the record.
function replaceMissingMedia(img) {
  const src = img.getAttribute("src") || "";
  // Only this app's own stored files. An external image that fails is a
  // different situation, and the note may well want it back when the network
  // returns.
  if (!/^\/(media|files)\//.test(src)) return;
  //: **An image the app addresses by id is hidden, never replaced.** This
  //: listener was written for the images inside rendered markdown, which are
  //: built fresh on every render and referred to by nobody: swapping one for a
  //: placeholder costs nothing. `#ocr-image` is the opposite: one long-lived
  //: element that the OCR workspace sets a new `src` on for every page of
  //: every document it opens.
  //:
  //: Measured. Opening a text file (a .md attachment) in the workspace sets
  //: `img.src` to that file's own url before the text branch of `ocrLoadPage`
  //: runs, the browser cannot decode markdown as an image, this listener fired
  //: and `img.replaceWith(gone)` deleted `#ocr-image` from the document. After
  //: that the stage held `SPAN.media-missing` and no `<img>` at all, for the
  //: rest of the session: every later open threw "Cannot set properties of
  //: null (setting 'src')" at `ocrLoadPage`, so clicking the next file's name
  //: opened a workspace that never showed the page. CLAUDE.md's own shape: the
  //: damage lands nowhere near the code that caused it.
  //:
  //: Hidden rather than replaced, so nothing draws a torn-page glyph and the
  //: element the app is holding on to is still there. The surfaces that own
  //: such an image say what happened in their own words (`#ocr-message`), and
  //: they unhide it themselves the moment a page really loads.
  if (img.id) {
    img.classList.add("hidden");
    return;
  }
  //: **A thumbnail is hidden too.** A picture beside a row's own words (the
  //: dashboard's recent notes, the Contents index, a chat source, a
  //: timeline row: every class here ending in `-thumb`) is a hint, and the
  //: words beside it already name the thing. The placeholder, a 170px dashed
  //: box of "Image no longer in this notebook", was drawn into a 2.5rem slot
  //: and pushed the row's title off its column (measured on the dashboard's
  //: Recently added and the Contents index). An attachment's own thumbnail is
  //: the exception: it is the attachment, so saying it is gone is the point.
  if (/-thumb\b/.test(img.className) && !img.classList.contains("attachment-thumb")) {
    img.classList.add("hidden");
    return;
  }
  if (img.dataset.mediaMissing) return;
  img.dataset.mediaMissing = "1";
  const gone = document.createElement("span");
  gone.className = "media-missing";
  const name = (img.getAttribute("alt") || "").trim();
  setLabel(gone, `ph:image-broken ${name || "Image"}`);
  const note = document.createElement("span");
  note.className = "media-missing-note";
  note.textContent = "no longer in this notebook";
  gone.append(note);
  gone.title = `${name || "This image"} was removed. The note still mentions it.`;
  img.replaceWith(gone);
}

//: **After the image's own handler, never before it.** A capturing listener
//: on the document runs ahead of every listener on the image itself, so an
//: image that had its own answer to a failure (a Library file tile's first
//: page, which removes itself and leaves the file glyph underneath) was
//: already swapped for "Image no longer in this notebook" by the time its
//: own handler ran, and that handler then removed a detached element.
//: Measured on the Files sub-tab: the placeholder drawn inside all three PDF
//: tiles, under the tick. A task later, an image its owner removed (or whose
//: tile its owner removed) is no longer connected, and is left alone.
document.addEventListener(
  "error",
  (event) => {
    const img = event.target;
    if (!(img instanceof HTMLImageElement)) return;
    setTimeout(() => {
      if (img.isConnected) replaceMissingMedia(img);
    }, 0);
  },
  true,
);

// A page-load-order bug lived here: this was declared down in the spaces
// section (appended at the end of the file), and `api()`, called from
// `initAuth()` at module load, long before that point in the script runs, 
// reads it via `activeSpaceId()` on every request's headers below. A `const`
// is in the temporal dead zone until its own declaration executes, so the
// very first request the app ever made threw `ReferenceError: Cannot access
// 'SPACE_ALL' before initialization`, caught by api()'s own try/catch and
// surfaced only as "Can't reach the MemoryMap server", the lock screen
// never appeared, with no console error and no failed network request,
// because the fetch was never reached. `node --check` cannot catch this: the
// file is syntactically valid, only wrong in execution order. Declared here,
// before `api()` is ever callable, so this cannot happen again regardless of
// what gets appended below.
const SPACE_ALL = "all";

async function api(path, options = {}) {
  // `silent`: a background poll (model status, reminders): a 401 must not
  // yank the user to the lock screen mid-session (Wave O fix for a
  // long-standing intermittent re-lock). Only an explicit user action
  // shows the lock screen on 401.
  // `timeoutMs`: opt-in abort so a call can't hang the UI forever (used by the
  // startup probe). Off by default, so long-running requests, model pulls,
  // blocking chat: are unaffected.
  // `ownsAuthErrors`: this call treats 401 as part of its own result rather
  // than as an expired session. Change-password answers 401 for "that isn't
  // your current password", a typo there must show a message beside the
  // field, not throw the user out to the lock screen.
  // `readOnly`: a POST that writes nothing (the code checker in documents.js
  // sends a file's text in a body because a query string cannot carry it).
  // Without it every pause in typing a .py file would empty the read cache
  // for the whole app, which is a write's job, not a read's.
  const { silent, timeoutMs, ownsAuthErrors, readOnly, ...fetchOptions } = options;
  refuseStagedUrls(fetchOptions.body);
  // Any write invalidates the read cache above, see clearApiCache().
  if (!readOnly && fetchOptions.method && fetchOptions.method !== "GET") clearApiCache();
  let timer = null;
  if (timeoutMs) {
    const controller = new AbortController();
    timer = setTimeout(() => controller.abort(), timeoutMs);
    fetchOptions.signal = fetchOptions.signal || controller.signal;
  }
  let response;
  try {
    response = await fetch(path, {
      headers: {
        "Content-Type": "application/json",
        "X-Auth-Token": authToken(),
        // Which space this request is scoped to. The server reads it in
        // get_session() and adds a loader criterion for it, so leaving it off
        // means every request silently sees every space, the switcher would
        // change the label in the header and nothing else.
        "X-Workspace-ID": activeSpaceId(),
      },
      ...fetchOptions,
    });
  } catch (networkErr) {
    // fetch() itself threw: this is a real network failure (offline, CORS,
    // connection refused). Log it explicitly so it always appears in Logs.
    //
    // `!networkErr?.name === 'AbortError'` is what this said, which parses as
    // `(!networkErr?.name) === 'AbortError'`, a boolean compared to a string,
    // so it was always false and no network failure was ever logged. The one
    // case the check exists to skip (our own timeout abort) was being logged
    // and everything else was too.
    //: A timeout (`AbortSignal.timeout`, name "TimeoutError") is a slow
    //: answer, not a failure: a warning, so a busy start does not fill the
    //: log with red for a poll that simply asked again a moment later.
    if (networkErr?.name !== "AbortError") {
      recordBrowserLog(networkErr?.name === "TimeoutError" ? "WARN" : "ERROR", [
        `[Network] ${fetchOptions.method || 'GET'} ${path}: ${networkErr.message}`
      ]);
    }
    throw networkErr;
  } finally {
    if (timer) clearTimeout(timer);
  }
  if (response.status === 401 && !ownsAuthErrors) {
    if (!silent) showLockScreen(false); // token expired (e.g. app restarted)
    const locked = new Error("Locked");
    // Marked, so `startApp()`'s bootstrap loop can tell "the session expired"
    // apart from "this one endpoint failed". Reported: *"before signing in, a
    // popup shows a message saying failed to load entries"*, a stale token
    // in localStorage (server restarted since the last visit) makes `startApp`
    // fire a dozen requests in parallel before the user has unlocked
    // anything, every one of them hits this 401, and every one of them used
    // to toast its own "Couldn't load X: Locked" on top of the lock screen
    // that had already, correctly, just appeared. One state: not logged in
    //, was being reported as a dozen unrelated failures.
    locked.isLockout = true;
    throw locked;
  }
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    let errMsg = typeof detail.detail === 'string' ? detail.detail : (JSON.stringify(detail.detail) || `Request failed (${response.status})`);
    //: **Out of space is the one failure the person can act on, so the part
    //: that says how travels with it.** The server answers 507 with a
    //: `hint` naming the folder, the room left and roughly how much to free
    //: up (INBOX 266, item 6); every call site in this app toasts
    //: `error.message` and nothing has ever read `hint`, so the actionable
    //: half was being thrown away at this line. Appended here rather than
    //: at fifty call sites, which is the only version that cannot be
    //: forgotten by the next one.
    if (response.status === 507 && typeof detail.hint === 'string' && detail.hint) {
      errMsg = `${errMsg} ${detail.hint}`;
    }
    if (!silent) {
      // Log HTTP errors so they always appear in Settings → Logs for debugging.
      recordBrowserLog("ERROR", [
        `[HTTP ${response.status}] ${fetchOptions.method || 'GET'} ${path}: ${errMsg}`
      ]);
    }
    throw new Error(errMsg);
  }
  //: A write that can leave a model running on a background thread gets the
  //: task poll looked at now, rather than up to ten seconds from now.
  //:
  //: Reported as *"notifications dont appear when generating image
  //: captions"*, and the cause is a cadence, not a missing notification.
  //: `refreshModelStatus` idles at 10s (120s behind a hidden tab), and
  //: `noticeTaskTransitions` can only announce a job it has actually *seen*
  //: in a `/tasks` payload. A caption is one model round-trip, often
  //: shorter than the gap between two idle polls, so it began and ended
  //: unobserved: no "Started" line, no status-bar job slot, nothing. The
  //: long jobs this panel was built for (a re-index, a model pull) never hit
  //: this because they outlive any poll interval.
  if (fetchOptions.method && fetchOptions.method !== "GET" && JOB_STARTING_PATH.test(path)) {
    kickBackgroundTaskPoll();
  }
  return response;
}

// --- reading a paged list endpoint whole ---------------------------------------
//
// `GET /documents`, `GET /media`, `GET /reminders` and the rest each return a
// page and an `X-Total-Count` header saying how big the selection really is
// (INBOX 117; `GET /entries` has worked this way for longer, see
// `loadEntries`). A caller that needs every row asks for the next page until it
// has them all, which is the half that makes a cap safe: a cap with no offset
// makes everything past it permanently unreachable, and that is exactly the
// failure the old uncapped list was avoiding.
//
// **It lives here, immediately below `api()`, and that placement is the whole
// of a crash report.** It used to live in documents.js, whose own comment
// argued that "both call it from inside a function body, so load order is
// satisfied either way". That stopped being true the moment app.js called it
// from boot code: index.html loads app.js first and documents.js ten lines
// later, so `initNotesSubtabs` running at the bottom of this file reached a
// function that did not exist yet, and the Notes tab died with
// `ReferenceError: apiPagedList is not defined` before it drew anything. Six
// frontend files call this now; the file every one of them is loaded after is
// this one. `tests/test_frontend_load_order.py` is the rule, so the next
// shared helper cannot be put somewhere only some callers can see.
//
// `options` is passed through to `api()` untouched (library.js wants
// `{ silent: true }`). A page that comes back empty ends the loop whatever the
// header says, so a stale or wrong total can never spin forever.
async function apiPagedList(path, pageSize, options = {}) {
  const rows = [];
  let total = Infinity; // discovered from the first response's X-Total-Count
  while (rows.length < total) {
    const joiner = path.includes("?") ? "&" : "?";
    const response = await api(`${path}${joiner}limit=${pageSize}&offset=${rows.length}`, options);
    const page = await response.json();
    if (!Array.isArray(page) || !page.length) break;
    rows.push(...page);
    const reported = Number(response.headers.get("X-Total-Count"));
    total = Number.isFinite(reported) && reported > 0 ? reported : rows.length;
  }
  return rows;
}


//: Paths whose response can leave captioning, OCR or a librarian pass running
//: on a background thread. Deliberately a short list rather than "every
//: write": filing a note or a message is exactly when an attached image
//: starts being read (`core/media_process.py` runs at *commit*, not at
//: upload), but a rename or a preference save can start nothing and should
//: not cost a poll.
const JOB_STARTING_PATH =
  /^\/(entries|documents|media\/upload|media\/\d+\/|files\/\d+\/|conversations\/\d+\/messages|extras\/|models\/pull|search\/reindex|tasks\/trigger-autonomous)/;

//: Debounced, because committing a note with four images is four writes and
//: one job list. 600ms rather than immediately: the thread is started after
//: the response is written, so a poll racing it by a millisecond sees the
//: state from just before the job existed, the exact miss this fixes.
let jobPollKick = null;
function kickBackgroundTaskPoll() {
  //: A write that starts a job is the clearest "something just changed"
  //: there is, so the status poll's idle backoff (see `resetStatusCadence`)
  //: starts again from 30s rather than the job's progress being reported on
  //: a two-minute delay. Reached only from `api()` on a non-GET, which
  //: cannot happen before this file has finished evaluating, so the `const`
  //: that function reads is always past its temporal dead zone by then.
  resetStatusCadence();
  clearTimeout(jobPollKick);
  jobPollKick = setTimeout(() => {
    refreshBackgroundTasks().catch(() => {
      // A poll is best-effort, it runs again on the status loop regardless.
    });
  }, 600);
}

// A short-lived cache for GET responses, opt-in per call.
//
// Every dashboard widget fetches its own data, and switching away from the
// Dashboard and back re-ran all of them against data that is, in practice,
// seconds old: a network round trip and a re-render for nothing new to
// show. Opt-in (`cacheMs`) rather than global: silently serving a stale
// answer to something that must be current the instant it changes (reminder
// due-times, model status) would be a worse bug than the one this fixes.
//
// Invalidated wholesale by any mutating request (see `api()` below) rather
// than tracked per-endpoint: simpler, and correct: the common case this
// exists for is "nothing changed since I was last on this tab", and any
// write at all means that's no longer true.
const _apiCache = new Map();

function clearApiCache() {
  _apiCache.clear();
}

async function apiJson(path, options = {}) {
  const { cacheMs, ...rest } = options;
  if (cacheMs && (!rest.method || rest.method === "GET")) {
    const hit = _apiCache.get(path);
    if (hit && Date.now() - hit.at < cacheMs) return hit.pending || hit.data;
    //: **A request already in flight is shared, not repeated.** Measured at
    //: boot (`scratchpad/ui-sweeps/oi-dupfetch.js`): the Notes tab's "Ask
    //: again" row and the dashboard's Recent questions widget both asked for
    //: `/chat/recent` within the same second, and the same for
    //: `/entries/most-accessed`, because the second caller arrived before the
    //: first answer did and the cache only held finished answers. The promise
    //: is cached with the entry and replaced by the data when it lands; a
    //: failure is dropped from the cache so the next caller asks again.
    const pending = api(path, rest).then((response) => response.json());
    const entry = { pending, at: Date.now() };
    _apiCache.set(path, entry);
    try {
      const data = await pending;
      if (_apiCache.get(path) === entry) _apiCache.set(path, { data, at: entry.at });
      return data;
    } catch (error) {
      if (_apiCache.get(path) === entry) _apiCache.delete(path);
      throw error;
    }
  }
  const data = await (await api(path, options)).json();
  //: A new note is a small event worth a cheer from the companion, and a
  //: proud look from Atlas (atlas.js).
  if (path === "/entries" && options.method === "POST") {
    if (typeof nameMarkBuddyCue === "function") nameMarkBuddyCue("carry");
    if (typeof atlasOn === "function") atlasOn("saved");
  }
  return data;
}

// --- auth gate (Phase 4) -----------------------------------------------------

//: **Optional sign-in** (INBOX 426 aa): "Ask for a password when the app
//: opens", a switch in Settings, Account and security. Off, the server hands
//: this computer a session without the password (`/auth/auto-session`,
//: routes_auth.py, which decides from the connection itself and refuses
//: anyone else), and the boot path skips the lock screen. The vault is not
//: opened by that: private notes ask for the password when they are wanted,
//: through the lock screen's own card in a prompt mode (`askPasswordPrompt`).
//:
//: `autoSessionOffered`: `/auth/status` said this caller may have one.
//: `lockedByHand`: the person pressed Lock, so a 401 afterwards must not
//: quietly start a new session; the next load does (the decision taken).
//: `vaultOpen`: null until an unlock, the auto-session or the account
//: answer says; false only when it is known to be locked.
let autoSessionOffered = false;
let lockedByHand = false;
let vaultOpen = null;
let autoSessionPending = null;
//: The open prompt: `{ submit, resolve, returnFocus }`, or null.
let lockPrompt = null;

//: Ask the server for a session without a password. One request at a time,
//: because a stale token makes every boot request answer 401 together.
//: Plain `fetch`, not `api()`: a refusal here is an answer, not a lockout.
function startWithoutPassword() {
  if (!autoSessionPending) {
    autoSessionPending = fetch("/auth/auto-session", {
      method: "POST",
      headers: { "X-Auth-Token": authToken() },
    })
      .then((response) => (response.ok ? response.json() : null))
      .catch(() => null)
      .finally(() => {
        autoSessionPending = null;
      });
  }
  return autoSessionPending;
}

function enterWithoutPassword(body) {
  localStorage.setItem("token", body.token);
  vaultOpen = Boolean(body.vault_open);
  lockedByHand = false;
  $("lock-overlay").classList.add("hidden");
  startApp();
}

//: A session that expired while sign-in is off comes straight back rather
//: than asking for a password the person chose not to be asked for.
async function resumeWithoutPassword() {
  const body = await startWithoutPassword();
  if (!body) {
    autoSessionOffered = false; // refused: the lock screen stays, as it should
    return;
  }
  if ($("lock-overlay").dataset.mode !== "unlock") return; // setup or a prompt since
  enterWithoutPassword(body);
}

//: Close the prompt, if one is open. `done` is what its promise resolves to.
function settleLockPrompt(done) {
  const prompt = lockPrompt;
  if (!prompt) return;
  lockPrompt = null;
  const overlay = $("lock-overlay");
  overlay.classList.remove("lock-prompt");
  $("lock-cancel").classList.add("hidden");
  $("lock-error").textContent = "";
  $("lock-password").value = "";
  if (overlay.dataset.mode === "prompt") {
    overlay.classList.add("hidden");
    overlay.dataset.mode = "unlock";
    prompt.returnFocus?.focus?.();
  }
  prompt.resolve(done);
}

//: The lock screen's card asking for the password for one action, over
//: whatever is open, with a way out. `submit(password)` throws to show its
//: message under the field. `data-mode="prompt"` is set before the overlay
//: is shown: the document editor's lock watcher (documents.js) reads it, and
//: a prompt is not a lock.
function askPasswordPrompt({ title, message, submitLabel, submit }) {
  settleLockPrompt(false);
  const overlay = $("lock-overlay");
  return new Promise((resolve) => {
    lockPrompt = { submit, resolve, returnFocus: document.activeElement };
    overlay.dataset.mode = "prompt";
    overlay.classList.add("lock-prompt");
    $("lock-title").textContent = title;
    $("lock-message").textContent = message;
    $("lock-setup-note")?.classList.add("hidden");
    $("lock-submit").textContent = submitLabel;
    $("lock-cancel").classList.remove("hidden");
    $("lock-error").textContent = "";
    $("lock-password").value = "";
    $("lock-password").setAttribute("aria-label", "Password");
    $("lock-password").autocomplete = "current-password";
    overlay.classList.remove("hidden");
    $("lock-password").focus();
  });
}

//: "Unlock private notes": the vault's key, for a session that started
//: without the password. The token is kept; only the key is loaded.
async function unlockPrivateNotes() {
  const opened = await askPasswordPrompt({
    title: "Unlock private notes",
    message: "Enter your password to read your private notes.",
    submitLabel: "Unlock",
    submit: (password) =>
      apiJson("/auth/unlock-vault", {
        method: "POST",
        body: JSON.stringify({ password }),
        // 401 here is "wrong password", said beside the field.
        ownsAuthErrors: true,
      }),
  });
  if (!opened) return false;
  vaultOpen = true;
  toast("Private notes unlocked.");
  await loadEntries().catch(() => {});
  return true;
}

//: True when the vault's key is loaded, asking for the password if not.
async function ensureVaultOpen() {
  if (vaultOpen === true) return true;
  const info = await apiJson("/auth/account").catch(() => null);
  if (info && info.vault_open) {
    vaultOpen = true;
    return true;
  }
  return unlockPrivateNotes();
}

function showLockScreen(setupMode) {
  settleLockPrompt(false);
  $("lock-overlay").classList.remove("hidden");
  $("lock-title").textContent = setupMode ? "Welcome to MemoryMap" : "Unlock MemoryMap";
  //: **The trust moment, and it used to say nothing about trust.** This is the
  //: first screen of the app and it asks for a credential; a person deciding
  //: whether to hand one over is deciding whether to believe the product, and
  //: the sentence that would persuade them ("it runs here, nothing goes out")
  //: was three screens later, after the account already existed. It is here
  //: now, along with the two facts that cost something to learn late: the
  //: length rule, which was only ever shown after a failed attempt, and that
  //: `/auth/setup` derives an encryption key from this password on the spot.
  $("lock-message").textContent = setupMode
    ? "A notebook that runs on this machine. Your notes stay here, and nothing goes online unless you turn it on later."
    : "Enter your password to unlock your notebook.";
  //: Four is the backend's own floor (`Field(min_length=4)`,
  //: routes_auth.py), quoted rather than restated so the two cannot drift.
  const note = $("lock-setup-note");
  if (note) {
    note.textContent =
      "Choose a password or PIN, at least four characters. The app asks for it " +
      "when it opens, unless you turn that off in Settings. Ordinary notes are not encrypted and survive a reset, " +
      "but anything you later mark private is locked with this password and cannot " +
      "be recovered without it.";
    note.classList.toggle("hidden", !setupMode);
  }
  $("lock-submit").textContent = setupMode ? "Set password & start" : "Unlock";
  $("lock-overlay").dataset.mode = setupMode ? "setup" : "unlock";
  // One field in two modes (no separate setup form), autocomplete has to
  // switch with it, or a password manager offers to fill an *existing*
  // saved password into a first-run "choose a new one" field.
  $("lock-password").setAttribute("aria-label", setupMode ? "Choose a password" : "Password");
  $("lock-password").autocomplete = setupMode ? "new-password" : "current-password";
  $("lock-password").focus();
  if (!setupMode && autoSessionOffered && !lockedByHand) resumeWithoutPassword();
}

async function submitLockForm() {
  const password = $("lock-password").value;
  const errorLine = $("lock-error");
  errorLine.textContent = "";
  if (password.length < 4) {
    errorLine.textContent = "Use at least 4 characters.";
    return;
  }
  const mode = $("lock-overlay").dataset.mode;
  if (mode === "prompt") {
    const prompt = lockPrompt;
    if (!prompt) return;
    try {
      await prompt.submit(password);
    } catch (error) {
      errorLine.textContent = error.message;
      return;
    }
    settleLockPrompt(true);
    return;
  }
  try {
    const body = await apiJson(`/auth/${mode === "setup" ? "setup" : "unlock"}`, {
      method: "POST",
      body: JSON.stringify({ password }),
    });
    localStorage.setItem("token", body.token);
    vaultOpen = mode === "setup" ? true : Boolean(body.vault_open);
    lockedByHand = false;
    $("lock-password").value = "";
    // **Give the focus back, or every single-key shortcut in the app is
    // dead.** Hiding the overlay does not move focus off the field inside
    // it, so `document.activeElement` stayed `#lock-password` for the whole
    // session that followed. Every handler that (correctly) refuses to steal
    // a keystroke while someone is typing, the whiteboard's V/H/P tool keys,
    // its `n` and `/`, and the same guard elsewhere, therefore returned
    // immediately on every press, until the reader happened to click some
    // other focusable control. Found while testing the tool shortcuts: they
    // did nothing at all from a freshly unlocked app.
    $("lock-password").blur();
    $("lock-overlay").classList.add("hidden");
    $("lock-btn").classList.remove("hidden");
    // Signing in starts a session, and a session starts at the front of every
    // tab: see `resetNavigationForNewSession`. Here as well as at load
    // because the lock screen is an *overlay*, not a page: unlocking after an
    // idle lock never reloads anything, so the load-time reset alone would
    // leave every sub-tab exactly where it was hours ago. Called before
    // `startApp()`, which is what reads the stored section back.
    resetNavigationToDefaults();
    startApp();
  } catch (error) {
    errorLine.textContent = error.message;
  }
}

//: **The containers that hold the user's own words**, cleared when the
//: notebook locks. Enumerated explicitly rather than derived, because this is
//: a privacy boundary and a reviewer should be able to read exactly what is
//: purged without running anything.
//:
//: Static UI text (the Settings panels, the capture form's own labels) is
//: deliberately not here: it belongs to the app, not to the user, and
//: clearing markup that `startApp()` does not rebuild would break the app on
//: unlock.
const LOCK_PURGE_IDS = [
  "entry-list", // notes
  "chat-messages", // the conversation
  "library-grid", // files and images
  "library-docs-list", // documents
  "timeline-scroll", // the timeline
  "reminder-list-card", // reminders
  "graph-svg", // node labels are note titles
  "palette-list", // whatever was last searched for
  "doc-live",
  "doc-preview",
];

//: Empty everything the lock screen is covering.
//:
//: **The lock overlay was a visual cover, not a purge**, and the roadmap
//: ranked auditing it first precisely because it is this app's only privacy
//: boundary. Measured with the notebook locked: `#entry-list` still held 61
//: notes and 3,431 characters of their text, `#library-grid` 5,089, the
//: documents list 6,422: all of it one devtools click, one screen reader,
//: or one browser extension away from being read.
//:
//: The server side was already right (every endpoint answers 401 while
//: locked, verified in the same audit), so this closes the client half.
//:
//: Safe because unlocking runs `startApp()`, which re-fetches and re-renders
//: all of it. The codebase already reasons this way elsewhere, 
//: `hideBootSplash` removes itself from the DOM rather than leaving a hidden
//: overlay, on the same principle that nothing should sit over the viewport
//: invisibly.
function purgeLockedContent() {
  for (const id of LOCK_PURGE_IDS) {
    const el = document.getElementById(id);
    if (el) el.replaceChildren();
  }
  // A textarea's text lives in `.value`, which `replaceChildren` never
  // touches: the document editor would otherwise keep the whole document
  // readable behind the lock screen.
  for (const id of ["doc-content", "doc-title", "entry-input", "chat-input"]) {
    const field = document.getElementById(id);
    if (field && "value" in field) field.value = "";
  }
}

async function lockNow() {
  try {
    await api("/auth/lock", { method: "POST" });
  } catch {
    /* locking locally regardless */
  }
  localStorage.removeItem("token");
  lockedByHand = true;
  vaultOpen = false;
  purgeLockedContent();
  showLockScreen(false);
}

// Fades out and removes #boot-splash (index.html): called once, from
// initAuth() below, the moment its /auth/status round trip resolves,
// whichever of that function's four branches it turns out to be. Removed
// from the DOM after the fade rather than left `hidden`: nothing should
// keep sitting fixed over the whole viewport, even invisibly, once the app
// has decided what it's actually showing.
function hideBootSplash() {
  const splash = document.getElementById("boot-splash");
  if (!splash) return;
  // Snap the bar to 100% before the fade starts, so it never visibly
  // disappears mid-crawl: it always reads as "finished", never "cut off".
  document.getElementById("boot-splash-progress-fill")?.classList.add("done");
  splash.classList.add("hidden");
  splash.addEventListener("transitionend", () => splash.remove(), { once: true });
  // Reduced-motion strips the transition (00-tokens-shell.css), so
  // transitionend never fires: remove immediately in that case instead of
  // leaving a zero-opacity element sitting in the DOM forever.
  if (reducedMotionWanted()) splash.remove();
}

async function initAuth() {
  // Bounded probe: if the server is unreachable or hangs, fail fast with a
  // clear message instead of an indefinite blank/"connecting" screen.
  const status = await apiJson("/auth/status", { timeoutMs: 8000 }).catch(() => null);
  hideBootSplash();
  if (!status) {
    $("save-status").textContent =
      "Can't reach the MemoryMap server, check it's running, then refresh.";
    toast("Can't reach the MemoryMap server. Is it running?", true);
    return;
  }
  if (status.setup_required) {
    showLockScreen(true);
    return;
  }
  $("lock-btn").classList.remove("hidden");
  // Sign-in off, on this computer: straight in, no lock screen. A token
  // still live is kept by the server; a stale one is replaced.
  autoSessionOffered = Boolean(status.auto_session);
  if (autoSessionOffered) {
    const started = await startWithoutPassword();
    if (started) {
      enterWithoutPassword(started);
      return;
    }
    autoSessionOffered = false;
  }
  if (!authToken()) {
    showLockScreen(false);
    return;
  }
  // Token might be stale after a server restart, startApp()'s first
  // request will bounce us to the lock screen if so. The media cookie first,
  // awaited, so the first pictures the app draws already carry it: one local
  // round trip, and without it a profile that lost its cookies drew every
  // picture broken (see `refreshMediaSession`).
  await refreshMediaSession();
  startApp();
}

// --- a share from the phone's share sheet lands in Capture -------------------
// UI_MODERNISATION_PLAN Phase 11 item 5, "upload from the share sheet". The
// installed app is a Web Share Target (manifest.webmanifest): a page, a
// link or a selection shared to MemoryMap opens the app at `/` with
// `share_title`, `share_text` and `share_url` in the query, the GET form,
// which needs no service worker and works on a locked notebook because the
// query survives the lock screen (this runs once the entries have loaded,
// which is after the unlock). The pieces become one capture: the title as
// a heading, the text, the link on its own line, so the link stays a link.
// The query is then cleared from the address bar, or a reload would share
// it again. Files (an image shared from the camera roll) need the POST form
// and a service worker and are not taken here.
const SHARE_PARAMS = ["share_title", "share_text", "share_url"];

function sharedCaptureText(params) {
  const title = (params.get("share_title") || "").trim();
  const text = (params.get("share_text") || "").trim();
  const url = (params.get("share_url") || "").trim();
  const lines = [];
  if (title && title !== text) lines.push(`# ${title}`);
  if (text) lines.push(text);
  if (url && !text.includes(url)) lines.push(url);
  return lines.join("\n\n");
}

function takeSharedIntake() {
  const params = new URLSearchParams(window.location.search);
  if (!SHARE_PARAMS.some((key) => params.has(key))) return;
  const content = sharedCaptureText(params);
  for (const key of SHARE_PARAMS) params.delete(key);
  const rest = params.toString();
  history.replaceState(null, "", `${location.pathname}${rest ? `?${rest}` : ""}${location.hash}`);
  if (!content) return;
  const box = $("entry-content");
  if (!box) return;
  switchTab("notes");
  showNotesSection("capture");
  box.value = box.value ? `${box.value}\n\n${content}` : content;
  box.dispatchEvent(new Event("input", { bubbles: true }));
  box.focus();
  const mounted =
    typeof mountNoteSurface === "function" ? mountNoteSurface(box) : Promise.resolve(null);
  mounted.then((surface) => surface?.focus()).catch(() => {});
  toast("Shared to your notebook. Save it when it reads right.");
}

function startApp() {
  // Whatever the shell was last saying about being unable to reach the server
  // is now provably false, we are about to talk to it. Left uncleared, the
  // "check it's running, then refresh" line sat under the capture form for the
  // whole session after one slow start, telling the user the app was broken
  // while it worked perfectly. Screenshotted.
  const shellStatus = $("save-status");
  if (shellStatus) shellStatus.textContent = "";

  // A failed load must be visible, not a silently empty page, and one
  // broken endpoint must never stop the rest of the app from coming up.
  // Every bootstrap step is isolated so a single rejection surfaces a toast
  // instead of leaving the user staring at a half-loaded (or blank) app.
  const step = (label, fn) => {
    try {
      const result = fn();
      if (result && typeof result.catch === "function") {
        return result.catch((error) => {
          // The lock screen already said what happened; a toast under it
          // repeating "Couldn't X: Locked" for every parallel step is noise
          // about one state dressed up as several failures.
          if (!error.isLockout) toast(`Couldn't ${label}: ${error.message}`, true);
        });
      }
      return Promise.resolve(result);
    } catch (error) {
      if (!error.isLockout) toast(`Couldn't ${label}: ${error.message}`, true);
      return Promise.resolve();
    }
  };

  // Before anything reads a stored setting: bring back whatever this browser
  // has lost. A shell that does not keep localStorage, the desktop window is
  // the reported one (§35E): starts every launch with the default theme and
  // an onboarding tour it has already been through, because both live there
  // and nowhere else. The server's copy fills the gaps, then the look is
  // re-applied so the app settles into the remembered theme rather than
  // staying on the default it painted a moment ago.
  const looksReady = step("restore your settings", async () => {
    if (!prefsCache) {
      await loadPreferences().catch(() => null);
    }
    const restored = prefsCache ? seedUiStateFromServer(prefsCache.ui_state) : false;
    //: The server has had its say, whether it had anything to say or not, so
    //: mirrored writes may be saved from here on (A2). Set before the repaint
    //: below rather than after it, so a throw in any of those five calls cannot
    //: leave the session unable to back up a setting.
    uiStateSeeded = true;
    if (restored) {
      // The same three calls the theme picker makes, in the same order: the
      // root attributes, then the light/dark choice and the palette, neither
      // of which re-records itself as a manual override.
      applyAppearance();
      applyThemeChoice(appearancePref("theme"), false);
      applyPalette(appearancePref("palette"), false);
      renderBrandLogo();
      if (bgArtOn()) startBgArt();
    }
    // A seeded background (microbes, mycelium) started before the
    // preferences arrived grew from the placeholder name; regrow it from the
    // real one. A no-op for every other style and when nothing changed.
    if (typeof bgArtRefreshSeed === "function") bgArtRefreshSeed();
    
    // Always check battery efficient mode regardless of ui_state seeding
    const indicator = $("power-saver-indicator");
    if (indicator) {
      if (prefsCache && prefsCache.battery_efficient_mode) {
        indicator.classList.remove("hidden");
      } else {
        indicator.classList.add("hidden");
      }
    }
    // The bell's own icon reads the mute preference, re-render now that
    // prefsCache actually has it, rather than leaving the pre-load default
    // (unmuted) on screen until the notifications panel happens to be opened.
    renderNotificationBadge();
    // Same reason, for the status bar: the slots the user has turned off are
    // in `prefsCache`, and hiding them here rather than on first paint would
    // mean a visible flash of a bar they chose not to have.
    applyStatusBarSlots();
    applyStatusClock();
  });

  const entriesReady = step("load entries", loadEntries);
  step("load recent questions", loadRecentQuestions);
  step("load ask history badge", loadAskHistoryBadge);
  step("load suggestions", loadSuggestions);
  step("load your most-used items", loadMostUsed);
  step("load templates", loadTemplates).then(() =>
    step("set up chat options", () => {
      personaOptions();
      // Wave G: skills chips + the agent-mode toggle read the
      // same prefsCache that loadTemplates just filled.
      loadChatSkills();
      $("tools-toggle").checked = !prefsCache || prefsCache.tools_enabled !== false;
      renderChatModeSeg();
      renderWebSearchToggle();
    })
  );
  step("load answer-length options", loadResponseModes);
  // Here, not at module level beside initSpaceSwitcher(). The switcher's
  // LISTENERS can be bound before there is a token, nothing about a click
  // handler needs the server, but the LIST cannot: /spaces 401s before
  // unlock, the catch leaves spacesCache empty, and nothing ever asks again.
  // The menu would then offer "All spaces" and nothing else, for the whole
  // session, on every fresh start. This is the same shape as the comment
  // below about switchTab painting from a pile of 401s.
  step("load spaces", loadSpaces);
  entriesReady.then(() => step("take what was shared to it", takeSharedIntake));
  step("tell the server your timezone", reportTimezone);
  // Fires only if the user opted in (Settings -> About); the endpoint itself
  // also checks the preference server-side, but skipping the call here means
  // an opted-out install makes zero network attempts, not a wasted one.
  step("check for an update", () => {
    if (prefsCache && prefsCache.update_check_enabled) return checkForUpdate(true);
  });
  // Independent of update_check_enabled above, this isn't a network
  // check, it's reporting a fact: start.sh/start.bat already git-pulled a
  // real update before this process even started (their own step 0, no
  // preference gates it either). "Only if the app auto updates though,
  // not every time they login", the endpoint self-clears after one read,
  // so this only ever fires the run right after a real update landed.
  step("check for a source-checkout update notice", checkForSourceUpdateNotice);
  step("load conversations", loadConversationList);
  step("check the model status", refreshModelStatus);
  // Reminders poll on their own timer once running (see startReminderWatch);
  // starting that here, not at module level, is the other half of the fix
  // described above revealTab("dashboard")'s module-level call: the same
  // pile of pre-auth 401s, one endpoint earlier.
  step("watch reminders", startReminderWatch);

  // Re-render whichever tab is on screen. This used to be switchTab() itself,
  // called at module level before initAuth() has a token, so a tab that
  // fetches its own data painted itself from a pile of 401s and then never
  // tried again. On the dashboard that meant an empty grid until you opened
  // Edit layout and cancelled out of it, which re-ran renderDashboard by hand
  // (user-reported). Now the module-level call is revealTab(), DOM only,
  // no fetch: and this is the one place the real data load happens.
  // *After* the entries land, not alongside them. These two ran concurrently,
  // so on a cold load the dashboard rendered against an `allEntries` that was
  // still `[]` and drew its brand-new-notebook card instead of the widgets, 
  // reported as "the dashboard widgets are missing until I refresh or change
  // tabs". Every tab wants the notes; none of them wants to guess.
  entriesReady.then(() => step("load this tab", () => refreshActiveTab()));

  // First-run welcome tour (guarded by localStorage; re-runnable from Help).
  //
  // **After the settings are restored, not alongside them.** This is the
  // second half of the reported "onboarding shows every time": the flag lives
  // in localStorage, so a shell that lost it needs the server's copy back
  // *before* this asks: otherwise the tour opens, the flag arrives a moment
  // later, and the person is welcomed to an app they have used for a month.
  looksReady.then(maybeShowOnboarding);
  looksReady.then(maybeShowConsoleViewIntro);
}

// First-run "Dev view or User view?" prompt for the desktop app, asked
// for directly: "dev view is the default on install and the user will be
// presented with a popup option to change it just after install." Gated on
// its own preference (console_view_intro_seen) rather than piggybacking on
// onboardingDone, so changing the console mode later from Settings doesn't
// make this reappear, and vice versa. Browser-tab users never see this, 
// there's no console to speak of outside the desktop shell.
//
// Two bugs reported live, both fixed here:
//
// 1. "Showed both before and after I signed in, and kept coming back." The
//    guard only checked `prefsCache?.console_view_intro_seen`, but
//    `startApp()` also runs with a *stale* token (comment above `apiJson`'s
//    401 handling: "a stale token in localStorage... fire[s] a dozen
//    requests... before the user has unlocked anything"), and on that run
//    the silent /preferences fetch 401s and leaves prefsCache null. `null?.x`
//    is `undefined`, which is falsy, so the prompt fired on that pass too, 
//    before the real sign-in the user was about to do. It then fired AGAIN
//    on the real post-login startApp(), because whatever this function saved
//    the first time round never reached a real, authenticated session.
//    Requiring prefsCache to actually exist closes that: a failed fetch is
//    "we don't know yet", not "this is a fresh profile that hasn't seen it".
//
// 2. "Randomly signed me out." This used to POST /system/console-mode, the
//    same route Settings and the tray use, which restarts the whole desktop
//    process (pythonw.exe/python.exe relaunch, see __main__.py) the instant
//    the choice differs from the default. That is the right call for an
//    explicit Settings/tray toggle, where the user just asked for a live
//    switch and the toast says "restarting…". It is the wrong call for a
//    popup that appears on its own during first login: killing the server
//    (in-memory sessions and all, core/config.py, "restarting locks it
//    again") out from under someone who hasn't even finished signing in is
//    exactly the "signed out at random" report. It also raced its own
//    "remember this was answered" write against that same process exit, 
//    the second request sometimes lost, which is why the popup came back
//    "every other time" rather than never or always. A single PUT that sets
//    both preferences at once, with no restart, has neither problem: the
//    choice takes effect next launch (said plainly below), same as every
//    other preference in this app that isn't asking for a live switch.
async function maybeShowConsoleViewIntro() {
  if (!(await desktopShell())) return;
  if (!prefsCache || prefsCache.console_view_intro_seen) return;
  const wantsDevView = await confirmDialog(
    "Keep a console window open when MemoryMap AI starts?\n\n" +
      "Dev view shows a terminal window alongside the app, useful for " +
      "logs and troubleshooting. User view runs quietly in the background " +
      "with no console window at all, just this app window and a system " +
      "tray icon. Either way, you can switch any time from Settings or " +
      "the tray icon's own menu.\n\nTakes effect next launch.",
    { confirmLabel: "Dev view", cancelLabel: "User view", danger: false }
  );
  try {
    prefsCache = await apiJson("/preferences", {
      method: "PUT",
      body: JSON.stringify({
        show_console_on_startup: wantsDevView,
        console_view_intro_seen: true,
      }),
    });
    toast(
      `${wantsDevView ? "Dev" : "User"} view: starting from next launch.`
    );
  } catch (error) {
    toast(error.message || "Couldn't save your console view choice.", true);
  }
}

// The browser is the only thing that knows where the user actually is. The
// server may be running in UTC, a container, a NAS, a machine whose clock was
// never set: and every relative time the AI computes ("in 10 minutes",
// "tomorrow at 9") is resolved against that. So the zone is reported once at
// startup, and again whenever it changes (travel, or a DST shift).
//
// Only the IANA NAME is sent, never coordinates: "Australia/Brisbane" is what
// makes the arithmetic right, and it is far less identifying than a location.
async function reportTimezone() {
  let zone = "";
  try {
    zone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {
    return; // an environment without Intl still works, just on server time
  }
  //: Awaited, not read straight off `prefsCache` (A2): every `startApp` step
  //: runs in parallel, so this one used to reach the comparison before the
  //: boot GET had answered, find `prefsCache` still null, and PUT the same
  //: zone the server already had on every single cold start. With the shared
  //: reader the comparison has something to compare.
  await loadPreferences().catch(() => null);
  if (!zone || (prefsCache && prefsCache.timezone === zone)) return;
  prefsCache = await apiJson("/preferences", {
    method: "PUT",
    body: JSON.stringify({ timezone: zone }),
    silent: true,
  }).catch(() => prefsCache);
}

// The per-tab data loads switchTab performs, without the tab-switching itself.
// Kept beside switchTab's own dispatch so the two can't drift apart.
async function refreshActiveTab() {
  const name = localStorage.getItem("activeTab") || "notes";
  //: The tab on screen may be one whose code arrives on demand (A1), and this
  //: is the boot-time call that loads its data: `renderGraph`, `loadDocuments`
  //: and `loadLibrary` below are all defined in a file that is fetched here.
  const lazy = TAB_MODULES[name];
  if (lazy) await ensureModule(lazy);

  // Relocate the back-to-top button so it aligns with the chat area bounds
  const scrollTopBtn = document.querySelector(".scroll-top");
  if (scrollTopBtn) {
    if (name === "chat") {
      document.querySelector(".chat-dock")?.appendChild(scrollTopBtn);
    } else {
      document.body.appendChild(scrollTopBtn);
    }
  }
  
  if (name === "dashboard") return renderDashboard();
  if (name === "graph") return renderGraph();
  if (name === "documents") return loadDocuments();
  if (name === "library") return loadLibrary();
  if (name === "reminders") {
    refreshReminderDefaults();
    return loadReminders();
  }
  if (name === "chat") return loadChatSuggestions();
  return undefined; // the notes tab is covered by loadEntries above
}

// --- capture templates (Wave B) ---------------------------------------------------

const BUILTIN_TEMPLATES = [
  { name: "Journal", content: "Journal: {date}\n\nToday I " },
  { name: "Recipe", content: "Recipe: \n\nIngredients:\n- \n\nSteps:\n1. " },
  { name: "Contact", content: "Contact: \nPhone/email: \nWhere we met: \nNotes: " },
  { name: "Meeting", content: "Meeting about \nWho: \nDecisions: \nTo do: " },
];

//: **Built-ins and the person's own, as one catalogue** (INBOX 409, "templates
//: cant be edited"). The persona shape: a saved template that carries a
//: built-in's name is that built-in's edit, kept in `custom_templates` beside
//: the templates that are wholly the person's, so the Built-in group shows
//: the edit's text under the shipped name, Yours shows only their own, and
//: removing the edit is the reset. Nothing else is stored, and the built-in's
//: original text never leaves this file. Both readers (the Capture dropdown
//: and the Settings list) draw from this one function, so they cannot
//: disagree about which templates exist.
function templateCatalogue() {
  const saved = (prefsCache && prefsCache.custom_templates) || [];
  const edits = new Map(saved.map((t) => [t.name, t]));
  const builtin = BUILTIN_TEMPLATES.map((t) => {
    const edit = edits.get(t.name);
    return { ...(edit || t), builtin: true, overridden: Boolean(edit) };
  });
  const shipped = new Set(BUILTIN_TEMPLATES.map((t) => t.name));
  const custom = saved
    .filter((t) => !shipped.has(t.name))
    .map((t) => ({ ...t, builtin: false, overridden: false }));
  return { builtin, custom };
}

async function loadTemplates() {
  // Built-ins + the user's own (kept in preferences). Shared with the two
  // other boot readers (A2): at boot this joins the one request in flight, and
  // afterwards it reads the cache every PUT in this file keeps current, which
  // is why `saveTemplateList` (PUT, then this) still shows the new template.
  await loadPreferences().catch(() => prefsCache);
  // Saved filters live in the same payload, so draw them while it's fresh.
  renderSavedSearches();
  //: The Capture box's picker reads `templateCatalogue()` when it opens
  //: (`openNoteTemplateDialog`), so there is nothing to pre-build here: a
  //: template saved in Settings is in the next opening without a redraw.
}

// --- the Capture box's template picker (INBOX 410) ---------------------------
//
// **Choosing is not making**, for notes as for documents. The owner decided it
// on 2026-09-24: the Capture box's templates get the confirm step the
// documents' New from a template has (`openDocTemplateDialog` in documents.js).
// The picker was a native `<select>` whose `change` filled the box the moment
// a name was touched, so arrowing down the list to read the names wrote the
// note once per name, and a template picked by mistake asked "replace what
// you've written?" before you had seen what it was. Now it is DESIGN.md's
// recipe for a dialog of choices that each make something: radio rows (yours
// first, then the built-in ones), the chosen row's text beside them, and one
// filled button, Use this template, that fills the box. Enter on the list and a
// double click also make it; the first row is chosen on open so one Enter still
// works. This file, not documents.js, because the Capture box is always loaded
// and the documents bundle is not.
let noteTemplateChoice = null;
let noteTemplateMade = false;

//: The text a template puts in the Capture box. One function for the preview
//: and the fill, so the preview cannot show something the button would not
//: write (the recipe's rule, `docTemplateFill`'s for documents).
function noteTemplateFill(template) {
  return String(template?.content || "").replace("{date}", new Date().toLocaleDateString());
}

//: Yours first, then the built-in ones, as the old dropdown's groups were:
//: one recognisable shape for "your stuff first, then what shipped".
function noteTemplateRows() {
  const { builtin, custom } = templateCatalogue();
  return [...custom, ...builtin];
}

function chooseNoteTemplate(template, { focus = false } = {}) {
  if (!template) return;
  noteTemplateChoice = template;
  for (const row of document.querySelectorAll("#note-template-list .doc-template-choice")) {
    const on = row.dataset.template === template.name;
    row.setAttribute("aria-checked", String(on));
    //: The radio pattern's roving tab stop, as in the documents' dialog.
    row.tabIndex = on ? 0 : -1;
    if (on && focus) row.focus();
  }
  showNoteTemplatePreview(template);
}

//: The chosen template's text as it will land in the box, inert and hidden
//: from a screen reader (each row already says what it is). A note is plain
//: text in the box, so the preview is the text itself, wrapped as it would be.
function showNoteTemplatePreview(template) {
  const pane = $("note-template-preview");
  if (!pane || !template) return;
  const page = document.createElement("div");
  page.className = "doc-template-page note-template-page";
  const text = document.createElement("p");
  text.className = "note-template-text";
  text.textContent = noteTemplateFill(template);
  page.appendChild(text);
  pane.replaceChildren(page);
}

async function useNoteTemplate() {
  //: A double click is a click and then a dblclick, and Enter can follow
  //: either: one fill per opening, whichever way it was confirmed.
  if (noteTemplateMade || !noteTemplateChoice) return;
  noteTemplateMade = true;
  const template = noteTemplateChoice;
  $("note-template-dialog")?.close();
  const box = $("entry-content");
  if (!box) return;
  //: Never silently overwrite what has already been typed: asked after the
  //: choice is confirmed, so the question names a template the writer has
  //: seen rather than one the list happened to land on.
  if (box.value.trim()) {
    const replace = await confirmDialog(
      `Replace what you've already written with the “${template.name}” template?`,
      { confirmLabel: "Replace", cancelLabel: "Keep my text" }
    );
    if (!replace) return;
  }
  box.value = noteTemplateFill(template);
  box.dispatchEvent(new Event("input", { bubbles: true }));
  box.focus();
}

function noteTemplateListKeys(event) {
  const rows = [...event.currentTarget.querySelectorAll(".doc-template-choice")];
  if (!rows.length) return;
  const index = rows.findIndex((row) => row.getAttribute("aria-checked") === "true");
  const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key];
  let next = null;
  if (step) next = rows[(index + step + rows.length) % rows.length];
  else if (event.key === "Home") next = rows[0];
  else if (event.key === "End") next = rows[rows.length - 1];
  const find = (row) => noteTemplateRows().find((t) => t.name === row.dataset.template);
  if (next) {
    event.preventDefault();
    chooseNoteTemplate(find(next), { focus: true });
  } else if (event.key === "Enter") {
    //: Enter on a focused row would fire its click, which only chooses; on
    //: this list Enter is the confirmation, as it is on a form.
    event.preventDefault();
    useNoteTemplate();
  }
}

function openNoteTemplateDialog() {
  const dialog = $("note-template-dialog");
  const list = $("note-template-list");
  if (!dialog || !list) return;
  noteTemplateMade = false;
  const templates = noteTemplateRows();
  list.replaceChildren();
  for (const template of templates) {
    const li = document.createElement("li");
    li.setAttribute("role", "presentation");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ghost doc-template-choice";
    button.setAttribute("role", "radio");
    button.setAttribute("aria-checked", "false");
    button.dataset.template = template.name;
    const name = document.createElement("strong");
    name.textContent = template.name;
    //: The row's one line: the template's own description when it has one,
    //: else which group it is in, so a row never repeats its preview.
    const hint = document.createElement("span");
    hint.className = "muted text-sm";
    hint.textContent = template.description || (template.builtin ? (template.overridden ? "Built-in, edited" : "Built-in") : "Yours");
    const check = document.createElement("i");
    check.className = "ph ph-check doc-template-check";
    check.setAttribute("aria-hidden", "true");
    button.append(name, hint, check);
    button.addEventListener("click", () => chooseNoteTemplate(template));
    button.addEventListener("dblclick", useNoteTemplate);
    li.appendChild(button);
    list.appendChild(li);
  }
  dialog.showModal();
  chooseNoteTemplate(templates[0], { focus: true });
}

//: Autocomplete for the tags box, from `GET /tags`.
//:
//: **Out of `allEntries` and onto the route that answers this question.**
//: The list used to be built by flattening every loaded note's tags, which
//: is wrong twice on a notebook of any size. `GET /entries` is paged, so
//: until the last of twenty-one pages has landed the autocomplete is missing
//: the tags that live only in the notes that have not arrived, and it is
//: sorted alphabetically, so a tag used once outranks one used four hundred
//: times. The route answers tag to count, most used first, in one request,
//: and it had no caller in the app at all (found by
//: `scratchpad/probe_dead_routes.py`, INBOX 261).
//:
//: A `<datalist>` has no order of its own that the browser is obliged to
//: honour, but every engine that ships one offers the options in document
//: order, so most-used-first is what a person sees before they have typed
//: anything. Alphabetical was a choice nobody made; this one is the answer
//: to "which tag did I use for this".
//:
//: The failure path keeps whatever is already there rather than emptying
//: the list: a request that did not answer is not the same fact as a
//: notebook with no tags, and the old list is still the best guess.
async function refreshTagSuggestions() {
  const datalist = $("tag-suggestions");
  if (!datalist) return;
  const counts = await apiJson("/tags", { silent: true, cacheMs: 30000 }).catch(() => null);
  if (!counts) return;
  datalist.replaceChildren(
    ...Object.keys(counts).map((tag) => {
      const option = document.createElement("option");
      option.value = tag;
      return option;
    })
  );
}

// --- rendering ---------------------------------------------------------------

// --- icon-aware labels -------------------------------------------------------
//
// Most of the app's small controls are built in JS and take a plain string
// label: chip("Notes"), smallButton("Delete", …), { label: "Improve" }. That
// is why the emoji reform kept missing three hundred icons: they are not in
// index.html, they are string literals passed to functions that assign
// textContent, and you cannot put an <i> in a textContent.
//
// So the label grammar gains one form: a leading `ph:name ` marker.
//
//     chip("ph:file-text Notes")   ->   <i class="ph ph-file-text"></i> Notes
//     smallButton("ph:trash", …)   ->   <i class="ph ph-trash"></i>
//
// Everything else about a label is unchanged, and a label with no marker is
// still set with textContent, so nothing here can turn user text into markup.
// The marker is matched with an anchored, bounded pattern and the captured
// name is rebuilt into a class, a caller cannot smuggle a second class or a
// closing tag through it.
//
// Prose never carries a marker. A toast, a tooltip and anything sent to the
// model are sentences, and `ph:link` in the middle of one is just noise the
// reader has to decode.
const PH_LABEL = /^ph:([a-z0-9-]{1,40})\s*/;
//: **And one at the end**, for a label that carries its own action mark: a
//: chip with a "remove" cross on the right is the shape the whole app uses
//: for "this is attached, take it off", and before this the only way to draw
//: it was to put the character U+2715 in the string. That reads as the app's
//: icon set from a distance and is nothing of the kind up close: measured,
//: the glyph came out system-ui 13.6px at weight 500 beside a Phosphor icon
//: at 15.6px and weight 400, in the same chip (INBOX 263: "I want to strip
//: all signs of being vibecoded by an ai from the ui"). One rule in the
//: label grammar is cheaper than a hand-built chip per call site, which is
//: standing order 11's whole point.
const PH_LABEL_TRAILING = /\s*ph:([a-z0-9-]{1,40})$/;

// Fills `el` with a label, turning a leading `ph:` marker into a real icon
// element. Returns the element, so it composes.
function setLabel(el, label) {
  let text = String(label ?? "");
  //: Taken off before the leading marker is read, so `ph:file-text Name ph:x`
  //: is an icon, a name and an icon rather than a name ending in "ph:x".
  //:
  //: **Only when something comes before it.** The two patterns both match a
  //: label that is nothing but one marker, and the trailing one reading
  //: `"ph:x"` first turned every icon-only button in the app into a trailing
  //: mark with no label to trail: measured the moment this was added, a
  //: `smallButton("ph:x")` came back carrying `ph-trail`, which is 0.35em of
  //: margin on one side and 0.7 opacity on a control that is not a
  //: decoration.
  const tail = PH_LABEL_TRAILING.exec(text);
  if (tail && tail.index > 0) text = text.slice(0, tail.index);
  else if (tail) tail.length = 0;
  const match = PH_LABEL.exec(text);
  //: The trailing icon is appended after whatever the rest of this builds, so
  //: it is the last child in every shape a label can take: text only, icon
  //: and text, or icon only.
  const withTail = (built) => {
    if (tail && tail.length) {
      const mark = document.createElement("i");
      mark.className = `ph ph-${tail[1]} ph-trail`;
      mark.setAttribute("aria-hidden", "true");
      built.append(mark);
    }
    return built;
  };
  if (!match) {
    el.textContent = text;
    return withTail(el);
  }
  const icon = document.createElement("i");
  icon.className = `ph ph-${match[1]}`;
  icon.setAttribute("aria-hidden", "true");
  const rest = text.slice(match[0].length);
  // **The gap is a margin, not a space, and it has to be.** A plain " " text
  // node between the icon and the label is what this did first, and it worked
  // everywhere except in a flex container, where CSS discards anonymous
  // whitespace-only children outright. Half the labels in this app live in
  // flex rows (chips, buttons, status items), so half of them rendered with
  // the glyph jammed against the first letter and the other half did not,
  // which reads as a random inconsistency rather than a rule.
  //
  // Only when there IS following text: an icon-only button must stay exactly
  // as tight as it was, or every icon button in the app gains trailing space
  // and stops being square.
  if (rest) icon.classList.add("ph-lead");
  el.replaceChildren(icon);
  if (rest) {
    const textSpan = document.createElement("span");
    textSpan.className = "ph-text";
    textSpan.textContent = rest;
    el.append(textSpan);
  }
  return withTail(el);
}

//: **Is the Settings dialog open?** Defined here, in app.js, and not in
//: settings.js where the rest of that dialog lives. Reported from a real
//: session, five times in one second:
//:
//:     Uncaught ReferenceError: settingsModalOpen is not defined
//:       at HTMLDocument.<anonymous> (app.js:30278)
//:
//: app.js registers its document-wide keydown handler while it parses, and
//: settings.js is the last script on the page -- so every key pressed in the
//: window between the two threw, and the handler that runs Escape, "/" and
//: every other shortcut died with it. One call site already carried a
//: `typeof ... === "function"` guard, which is the same bug being worked
//: around one line at a time. A three-line DOM check has no reason to live in
//: another file; moving it removes the window entirely rather than papering
//: over it at each caller.
function settingsModalOpen() {
  const modal = document.getElementById("settings-modal");
  return Boolean(modal) && !modal.classList.contains("hidden");
}

//: A category's own colour, the same for the same name on every card and
//: every visit: a hash of the name into ten hues chosen to read on both
//: grounds (the Tableau 10 set the graph's legend already draws from). A dot
//: carries it, never the text, so the name stays at full contrast.
const CATEGORY_DOT_COLOURS = [
  "#4e79a7", "#f28e2c", "#e15759", "#76b7b2", "#59a14f",
  "#edc949", "#af7aa1", "#ff9da7", "#9c755f", "#8cd17d",
];
function categoryDotColour(name) {
  let h = 0;
  for (const ch of String(name || "")) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  return CATEGORY_DOT_COLOURS[h % CATEGORY_DOT_COLOURS.length];
}

function chip(text, extraClass = "", onClick = null) {
  const span = document.createElement("span");
  span.className = `chip ${extraClass}`.trim();
  setLabel(span, text);
  // An interactive chip must be reachable and operable by keyboard, not just
  // the mouse. Passing onClick makes it a real button in the a11y tree.
  if (onClick) {
    span.classList.add("chip-interactive");
    span.setAttribute("role", "button");
    span.setAttribute("tabindex", "0");
    span.addEventListener("click", onClick);
    span.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onClick(event);
      }
    });
  }
  return span;
}

// The one reusable "something is loading" mark (ROADMAP Priority 0 #14), 
// asked for directly, since before this every call site (re-evaluate, per-
// card AI work) built its own one-off spinner chip by hand. The .spinner
// CSS class (01-forms-settings.css, beside .chip-busy which it was
// extracted from) carries the animation and the prefers-reduced-motion
// fallback; aria-hidden because this is a visual accent only, the loading
// state itself belongs in a visible/aria-live status line at the call site,
// the same pattern #meeting-status and its siblings already use.
function spinnerEl() {
  const el = document.createElement("span");
  el.className = "spinner";
  el.setAttribute("aria-hidden", "true");
  return el;
}

// The `.unlink` "×" spans (detach/remove/dismiss) predate chip()'s own
// keyboard support and never got it retrofitted, mouse-only, same gap
// chip() already closed once this session for the "Go to note" chip.
// Dispatches a real click rather than duplicating each call site's own
// handler, so this stays a one-line addition wherever a `.unlink` span
// already has its click listener attached.
function makeUnlinkAccessible(span) {
  span.setAttribute("role", "button");
  span.setAttribute("tabindex", "0");
  span.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      span.click();
    }
  });
}

// A <select> from [value, label] pairs, with one option preselected.
function buildSelect(options, selected) {
  const select = document.createElement("select");
  select.className = "small-select";
  for (const [value, label] of options) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    if (value === selected) option.selected = true;
    select.appendChild(option);
  }
  return select;
}

// --- asking before something irreversible (§35F) ----------------------------------
//
// `window.confirm` is not dependable in the shell this app also runs in.
// pywebview's backends vary in whether they implement it at all, and one that
// does not returns `undefined`, which every `if (!confirm(...)) return;` in
// this file reads as "the user said no". The button then does nothing, says
// nothing, and looks broken. That is the reported shape of "the recycle bin
// empty now button doesn't work either": the endpoint behind it is fine, and
// the click never got past the gate.
//
// A promise-based dialog fixes that and is better in the browser too, it is
// styled like the app, it says what the action is in a heading rather than a
// system font, and the dangerous option can be marked as dangerous.
//: `checkbox` adds one optional decision to the same dialog, `{label, title,
//: checked}`, and the promise then resolves to `{ok, checked}` instead of a
//: bare boolean. Added for "also take this picture out of the notes that show
//: it", which is a second, *different* act from deleting the file: a
//: second dialog for it would be a second modal to dismiss, and doing it
//: silently would be the app editing someone's notes without being asked.
//:
//: Callers that pass no checkbox still get a plain boolean, because thirty of
//: them read the result directly and widening that contract for all of them
//: would be a rewrite in service of one feature.
//: **The button says what it does.** A confirmation whose question is
//: "Delete the 'Audit link reasons' skill?" answered with a red "OK", which
//: is the one label that names no action (every platform's guidelines ask
//: for the verb). Most call sites pass no label, so the default is read off
//: the question itself: its first word, when that word is one of the
//: actions the app asks about. Anything else keeps "OK".
const CONFIRM_VERBS = new Set([
  "delete", "remove", "clear", "discard", "reset", "replace", "archive", "leave",
  "disconnect", "overwrite", "restore", "empty", "forget", "unlink", "stop",
  "merge", "move", "rename", "revert", "undo", "lock",
]);
function confirmVerb(message) {
  const first = String(message || "").trim().split(/\s+/)[0]?.replace(/[^A-Za-z]/g, "") || "";
  return CONFIRM_VERBS.has(first.toLowerCase())
    ? first[0].toUpperCase() + first.slice(1).toLowerCase()
    : "OK";
}

function confirmDialog(message, options = {}) {
  const {
    confirmLabel = confirmVerb(message),
    cancelLabel = "Cancel",
    danger = true,
    checkbox = null,
  } = options;
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay confirm-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");

    const card = document.createElement("div");
    card.className = "card modal-card confirm-card";
    const text = document.createElement("p");
    text.className = "confirm-text";
    // Blank lines in these messages are deliberate paragraphs, the second is
    // usually the consequence ("This cannot be undone"), which is the part
    // worth reading, so it is not run together with the first.
    //: With more than one paragraph the first is the question ("Quit
    //: MemoryMap?", "Delete this note?") and is set as the dialog's title,
    //: the consequence under it in the body voice, the shape every native
    //: confirm has. One paragraph stays one paragraph.
    const parts = String(message).split(/\n{2,}/);
    parts.forEach((part, index) => {
      const line = document.createElement(index === 0 && parts.length > 1 ? "strong" : "span");
      if (index === 0 && parts.length > 1) line.className = "confirm-title";
      line.textContent = part;
      text.append(line, document.createElement("br"));
    });
    const row = document.createElement("div");
    row.className = "row confirm-actions";

    //: Built before `close`, which reads it.
    let extra = null;
    if (checkbox) {
      const label = document.createElement("label");
      label.className = "checkbox-label confirm-extra";
      extra = document.createElement("input");
      extra.type = "checkbox";
      extra.checked = Boolean(checkbox.checked);
      const caption = document.createElement("span");
      caption.textContent = checkbox.label;
      label.append(extra, caption);
      if (checkbox.title) label.title = checkbox.title;
      card.appendChild(label);
    }

    let settled = false;
    const close = (answer) => {
      if (settled) return;
      settled = true;
      document.removeEventListener("keydown", onKey, true);
      overlay.remove();
      returnFocus?.focus?.();
      resolve(checkbox ? { ok: answer, checked: answer && Boolean(extra?.checked) } : answer);
    };
    const onKey = (event) => {
      // Escape cancels and Enter confirms, but only while this dialog is up, 
      // captured, so a keyboard shortcut elsewhere can't fire underneath it.
      if (event.key === "Escape") {
        event.stopPropagation();
        close(false);
      } else if (event.key === "Enter" && event.target.tagName !== "BUTTON") {
        event.stopPropagation();
        close(true);
      }
    };

    const returnFocus = document.activeElement;
    const cancel = smallButton(cancelLabel, cancelLabel, () => close(false));
    const go = smallButton(confirmLabel, confirmLabel, () => close(true), false);
    if (danger) go.classList.add("danger");
    row.append(cancel, go);
    //: `insertBefore`, because the checkbox above was appended to the card
    //: already and the buttons belong under it.
    card.insertBefore(text, card.firstChild);
    card.appendChild(row);
    overlay.appendChild(card);
    // Clicking the backdrop cancels, the way every other overlay here behaves.
    wireBackdropClose(overlay, () => close(false));
    document.addEventListener("keydown", onKey, true);
    document.body.appendChild(overlay);
    // Cancel takes focus, not the dangerous one: a stray Enter or Space
    // arriving with the dialog must not be the thing that deletes the notes.
    cancel.focus();
  });
}

// `confirmDialog`'s other missing sibling: show a whole piece of text with
// no decision to make, just a way to close it. Asked for directly: "longer
// logs get truncated with no way to expand or collapse and view the whole
// log", the Library's Activity cards show a clipped preview (server-side,
// `ACTIVITY_DETAIL_CHARS`) so the grid stays scannable, and this is what a
// click on one opens instead of doing nothing.
function showDetailDialog(title, text) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay confirm-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", title);

    const card = document.createElement("div");
    card.className = "card modal-card confirm-card detail-dialog-card";
    const heading = document.createElement("h3");
    heading.textContent = title;
    const body = document.createElement("p");
    body.className = "confirm-text detail-dialog-text";
    body.textContent = text;
    const row = document.createElement("div");
    row.className = "row confirm-actions";

    let settled = false;
    const close = () => {
      if (settled) return;
      settled = true;
      document.removeEventListener("keydown", onKey, true);
      overlay.remove();
      returnFocus?.focus?.();
      resolve();
    };
    const onKey = (event) => {
      if (event.key === "Escape" || event.key === "Enter") {
        event.stopPropagation();
        close();
      }
    };

    const returnFocus = document.activeElement;
    const ok = smallButton("Close", "Close", close, false);
    row.append(ok);
    card.append(heading, body, row);
    overlay.appendChild(card);
    wireBackdropClose(overlay, () => close());
    document.addEventListener("keydown", onKey, true);
    document.body.appendChild(overlay);
    ok.focus();
  });
}

// `confirmDialog`'s missing sibling: ask for a line of text.
//
// DESIGN.md bans `window.confirm` because the desktop shell does not reliably
// implement it, and a button gated behind one that returns `undefined`
// silently does nothing. `window.prompt` is the same trap with the same shell,
// and the app has been calling it for every rename, so this is not a new
// dialog for a new feature, it is the one the rule always implied.
//
// Resolves to the trimmed text, or "" for cancel/empty. "" rather than null so
// every caller's guard is the same shape as the confirm one.
//: `segment`, when given, adds **one** segmented control under the field:
//: `{label, options: [{value, label, title}], value}`. The dialog then
//: resolves `{text, choice}` instead of a bare string.
//:
//: One extra control in the dialog that already exists, rather than a second
//: dialog after this one. CLAUDE.md records why in as many words: bookmark URL
//: editing was reported broken five times while working end-to-end every time,
//: and the fault was never the handler, "a second modal that only appears
//: *after* you commit the first is a bad way to expose a second field". Naming
//: a new board and saying what kind of board it is are one decision.
function promptDialog(message, initial = "", { confirmLabel = "Save", segment = null } = {}) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay confirm-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");

    const card = document.createElement("div");
    card.className = "card modal-card confirm-card prompt-card";
    //: **A title row, not a sentence above a field.** Reported as one of two
    //: dialogs off the modal recipe: this card's first child was a `<p>`, so
    //: the "New board" dialog had no heading at all while every other dialog
    //: in the app leads with one. Every `promptDialog` message is a short
    //: prompt ("Name the new board:", "Rename this chat:", "Tag to add to the
    //: selected notes:"), which is a title, so all twenty-odd callers are
    //: right to promote it rather than only this one.
    //:
    //: `confirmDialog`'s message stays a `<p>`: that one really is a
    //: sentence, often two, and a question is body copy.
    const head = document.createElement("div");
    head.className = "row confirm-head";
    const text = document.createElement("h3");
    text.className = "confirm-title";
    text.textContent = message;
    head.appendChild(text);
    const input = document.createElement("input");
    input.type = "text";
    input.value = initial;
    input.setAttribute("aria-label", message);

    //: The optional segmented control. `.seg`, the app's own recipe: the
    //: same one the Library's Cards/Rows switch and the dashboard's range
    //: pickers use: so this is a control the user has already met.
    let chosen = segment?.value ?? segment?.options?.[0]?.value ?? null;
    let segRow = null;
    let segField = null;
    if (segment?.options?.length) {
      //: **The choice is named, and the two options fill their track.**
      //: Reported: "also redesign that whiteboard and mindmap toggle in the
      //: popup, its ugly", with a screenshot of the New board dialog. Two
      //: things were wrong in it and both are about the track. `.seg` is
      //: `display: inline-flex`, which in this card (a flex column that
      //: stretches its children) makes the *track* full width while the two
      //: buttons keep their content width: the right half of the pill was
      //: empty, so the control read as a stray bar with two words in it. And
      //: nothing on screen said what the choice was for, because
      //: `segment.label` only ever reached `aria-label`, which a sighted
      //: reader cannot see.
      //:
      //: The label is now drawn, the buttons share the track equally (the CSS
      //: in 06-timeline-dialogs.css), and each option can carry an icon
      //: through `setLabel`'s "ph:name Label" contract, so Board and Mind map
      //: are told apart by shape before they are read.
      segField = document.createElement("div");
      segField.className = "confirm-seg-field";
      if (segment.label) {
        const segLabel = document.createElement("span");
        segLabel.className = "confirm-seg-label";
        segLabel.textContent = segment.label;
        segField.appendChild(segLabel);
      }
      segRow = document.createElement("div");
      segRow.className = "seg seg-compact confirm-seg";
      segRow.setAttribute("role", "group");
      segRow.setAttribute("aria-label", segment.label || message);
      segField.appendChild(segRow);
      for (const option of segment.options) {
        const button = document.createElement("button");
        button.type = "button";
        setLabel(button, option.label);
        button.dataset.value = option.value;
        if (option.title) button.title = option.title;
        button.classList.toggle("active", option.value === chosen);
        button.setAttribute("aria-pressed", option.value === chosen ? "true" : "false");
        button.addEventListener("click", () => {
          chosen = option.value;
          for (const sibling of segRow.querySelectorAll("button")) {
            const on = sibling.dataset.value === chosen;
            sibling.classList.toggle("active", on);
            sibling.setAttribute("aria-pressed", on ? "true" : "false");
          }
          // Straight back to the name: choosing the kind is a detour on the
          // way to typing, not the end of the interaction.
          input.focus();
        });
        segRow.appendChild(button);
      }
    }

    let settled = false;
    const close = (answer) => {
      if (settled) return;
      settled = true;
      document.removeEventListener("keydown", onKey, true);
      overlay.remove();
      returnFocus?.focus?.();
      // The shape changes only when a segment was asked for, so every existing
      // caller keeps the bare string it has always awaited.
      resolve(segment ? { text: answer, choice: chosen } : answer);
    };
    const onKey = (event) => {
      // Captured, so a shortcut elsewhere cannot fire underneath the dialog, 
      // the same reason confirmDialog captures.
      //
      // **preventDefault, not just stopPropagation.** Reported: pressing
      // Enter after typing a title looked like it "did nothing" - the title
      // was in fact saved (a real POST fired), but the dialog immediately
      // reopened empty, so the user only ever saw a blank prompt sitting
      // there. `close()` below returns focus to whatever triggered the
      // dialog - here, the "+ New document" button - synchronously, *while
      // this Enter keypress is still in flight*. Stopping propagation keeps
      // the keydown from reaching the input as a target, but the browser
      // still owes this physical key its native activation behaviour, and
      // now that behaviour lands on the button that just regained focus:
      // its own "Enter activates the focused button" default action fires,
      // clicking it again and opening a second, blank dialog. preventDefault
      // is what tells the browser this key press is spoken for.
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        close("");
      } else if (event.key === "Enter") {
        event.preventDefault();
        event.stopPropagation();
        close(input.value.trim());
      }
    };

    const returnFocus = document.activeElement;
    const row = document.createElement("div");
    row.className = "row confirm-actions";
    row.append(
      smallButton("Cancel", "Cancel", () => close("")),
      smallButton(confirmLabel, confirmLabel, () => close(input.value.trim()), false)
    );
    card.append(head, input);
    if (segField) card.append(segField);
    card.append(row);
    overlay.appendChild(card);
    wireBackdropClose(overlay, () => close(""));
    document.addEventListener("keydown", onKey, true);
    document.body.appendChild(overlay);
    // The text, selected: a rename usually replaces the name rather than
    // editing it, and a caret at position 0 makes you clear it by hand first.
    input.focus();
    input.select();
  });
}

//: Shared by every overlay's backdrop-click-to-close.
//:
//: Reported directly: "when I try to highlight text in text boxes in popup
//: displays, the popup often just closes." `click` fires wherever the mouse
//: went *up*, not where it went down, so starting a text selection inside
//: the card and releasing outside it (a completely normal way to select the
//: last word or two) fires a click whose target is the backdrop, which every
//: one of these listeners used to read as "the backdrop was clicked" and
//: close on. Recording where the *mousedown* started tells the two apart: a
//: real backdrop click starts and ends on the backdrop; a selection drag
//: starts inside the card.
//: `alsoBackdrop` is a selector for elements that *look* like empty space
//: even though they are not the overlay itself, a full-width layout column
//: whose own box extends well past the thing it is centring.
//:
//: Reported: "I cant click off the documents or images to close the lightbox
//: and the close button doesnt work all the time." Measured with the viewer
//: open on a 1440x900 window: `.lightbox-column` is **1396px wide and 134px
//: tall**, so the whole horizontal band either side of the picture belongs to
//: the column, not the backdrop. The four screen edges did close it, which is
//: why this reads as intermittent rather than broken: whether a click "off
//: the image" works depends on whether it landed above or beside it.
//:
//: The elements named by the caller are the ones with no content of their
//: own. `e.target === el` still has to hold for each: a click that lands on
//: the picture, the caption, a button or any other real child is a click on
//: that child, and closes nothing.
function wireBackdropClose(overlay, close, alsoBackdrop = "") {
  const isBackdrop = (target) =>
    target === overlay || (alsoBackdrop && target instanceof Element && target.matches(alsoBackdrop));
  let downOnBackdrop = false;
  overlay.addEventListener("mousedown", (e) => {
    downOnBackdrop = isBackdrop(e.target);
  });
  overlay.addEventListener("click", (e) => {
    if (isBackdrop(e.target) && downOnBackdrop) close();
  });
}

function smallButton(label, title, onClick, ghost = true) {
  // (Wave I) icon-only buttons need a name for screen readers, the
  // title doubles as one.
  const button = document.createElement("button");
  button.className = ghost ? "ghost small" : "small";
  setLabel(button, label);
  // **A button whose whole content is one glyph is square, without the caller
  // having to remember `.icon-only`.** Reported: "the backup x buttons arent
  // square" -- `smallButton("x", ...)` inherits `button.small`'s text padding
  // (0 0.8rem) and comes out a rectangle. CSS cannot see text, so this is the
  // one place that can decide it: setLabel has just told us whether a label
  // followed the icon (it emits `.ph-text` only then), and a bare character
  // label leaves one character of text behind. Everything with real words is
  // untouched.
  if (!button.querySelector(".ph-text") && button.textContent.trim().length <= 1) {
    button.classList.add("icon-only");
  }
  button.title = title;
  if (title) button.setAttribute("aria-label", title);
  button.addEventListener("click", onClick);
  return button;
}

//: **A tab's code arrives when the tab does** (WORLD_CLASS_PLAN A1). Measured
//: on this head before the change: 13 blocking scripts and 1,699 KB of
//: compressed JS parsed before the first tab could draw, of which whiteboard
//: (678 KB), documents (640 KB), library (404 KB) and the two graph files
//: (334 KB) are surfaces most sessions never open. `ensureP5` above is the
//: same idea for the one decoration that was bigger than all of them.
//:
//: Two bundles, not five, because the five files are not five independent
//: modules: library.js renders the boards gallery from whiteboard.js and the
//: documents list from documents.js, whiteboard.js calls back into both, and
//: documents.js renders the library's own filters. That cycle is real (it is
//: one surface split across three files, not three surfaces), so splitting it
//: further would only mean loading two thirds of it and waiting for the rest.
//: The graph pair has no edge into it at all once `formatFileSize` moved to
//: this file, so it stands alone.
//:
//: `async = false` on a dynamically inserted script is what keeps them in
//: document order: a dynamic script defaults to async, and library.js running
//: before documents.js would be a different program.
const LAZY_MODULES = {
  graph: ["/graph.js", "/graph-canvas.js"],
  //: The order the `<script>` tags had, kept: every cross-file call between
  //: these three is inside a function rather than at parse time, so it is not
  //: load-bearing, but it is the order the three files' own headers describe.
  //: documents-code.js and documents-prose.js were split out of documents.js
  //: (2026-09-24) and go *before* it, and that position is load-bearing: their
  //: own top level reads nothing from documents.js, while documents.js's
  //: top-level wiring names their functions, and each file here is followed
  //: by a microtask checkpoint before the next one runs. See their headers.
  //: whiteboard-map.js (the mind map layer, split out of whiteboard.js the
  //: same day) goes before whiteboard.js on the same terms.
  library: [
    "/documents-code.js",
    "/documents-prose.js",
    "/documents.js",
    "/whiteboard-map.js",
    "/whiteboard.js",
    "/library.js",
  ],
};

//: Which bundle a tab needs before its own dispatch runs. `documents` is the
//: document editor the Library opens, which is why it shares the Library's
//: bundle rather than having one of its own.
const TAB_MODULES = { graph: "graph", library: "library", documents: "library" };

const lazyModuleLoads = new Map();

//: **The stamp is read off the page, never rebuilt from `__version__`.** Every
//: local URL carries `?v=<version>`, and `RevalidatedStatic`
//: (src/memorymap/api/app.py) splices a per-process boot token onto the stamps
//: *inside index.html's served body* so a fresh launch of the desktop window
//: can never reuse the last launch's cache. That token exists only in the
//: markup, so a script this file inserts has to copy the stamp a real tag is
//: already wearing; a hard-coded `?v=0.3.0` here would be a second, staler
//: cache key for the same file, which is the exact bug that splice exists to
//: prevent.
function lazyAssetStamp() {
  const src = document.querySelector('script[src*="/app.js?"]')?.getAttribute("src") || "";
  const query = src.indexOf("?");
  return query === -1 ? "" : src.slice(query);
}

//: **A lazy bundle's "when the page is ready" is now.** Three of the files
//: `ensureModule` inserts wrapped their top-level wiring in a
//: `DOMContentLoaded` listener, which was right when they were `<script>`
//: tags in the head and wrong the moment they loaded on first use: the
//: event had fired minutes earlier, the listener never ran, and every
//: Library sub-tab was a button with no handler ("I cant click on any of
//: the library subtabs"). This runs the wiring at once when the document is
//: already parsed and defers it only while it is still loading, so a file
//: behaves the same whether it arrived at boot or on demand.
//: A microtask, not a direct call: the wiring sits in the middle of its file
//: and reads `let` bindings declared further down (`libraryMediaKind`), which
//: a direct call reached before they existed ("Cannot access before
//: initialization"). A microtask runs once the whole script has evaluated,
//: which is the same moment `DOMContentLoaded` gave a boot-time script.
function onDomReady(fn) {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
  else queueMicrotask(fn);
}

function ensureModule(name) {
  const files = LAZY_MODULES[name];
  if (!files) return Promise.resolve(false);
  const pending = lazyModuleLoads.get(name);
  if (pending) return pending;
  const stamp = lazyAssetStamp();
  const loaded = Promise.all(
    files.map(
      (file) =>
        new Promise((resolve) => {
          const script = document.createElement("script");
          script.async = false; // document order, not network order
          script.src = file + stamp;
          script.onload = () => resolve(true);
          script.onerror = () => resolve(false);
          document.head.appendChild(script);
        })
    )
  ).then((results) => results.every(Boolean));
  lazyModuleLoads.set(name, loaded);
  return loaded;
}

//: **The note editor's door, kept at boot.** The rendering editor every note
//: box gets (documents.js's `NOTE_SURFACES` table and `mountNoteSurface`)
//: mounts on the box's first focus through a listener *in documents.js*,
//: which is in the Library bundle now. So on a fresh boot the capture box,
//: the edit form, the draft and the graph's popup all stayed bare textareas
//: until the Library tab had been visited once (the owner: "the graph popup
//: panels no longer auto render the md and images"). This listener is the
//: half that has to live in the file that is always loaded: it fetches the
//: bundle on the first focus of a note box and hands the mount over. Once
//: the bundle is in, its own listener runs on every later focus and this
//: one steps aside. `NOTE_SURFACE_IDS` mirrors the table's keys, and
//: `tests/test_note_surface.py` fails when the two drift.
const NOTE_SURFACE_IDS = new Set([
  "entry-content",
  "entry-edit-content",
  "graph-popup-content",
  "graph-new-content",
  "draft-text",
  "draft-thoughts",
  "wb-card-editor",
]);

//: Mount the editor on one note box now, fetching the bundle if it is not in
//: yet. Resolves to the surface (or null when the engine is unavailable) so
//: a caller that sizes itself to the box can re-place afterwards. Used by
//: the graph popup, which opens rendered rather than waiting for a click.
function mountNoteSurfaceNow(host) {
  if (!host || !NOTE_SURFACE_IDS.has(host.id)) return Promise.resolve(null);
  return ensureModule("library").then((ok) => {
    if (!ok || typeof mountNoteSurface !== "function" || typeof NOTE_SURFACES !== "object") return null;
    return mountNoteSurface(host, NOTE_SURFACES[host.id]);
  });
}

document.addEventListener("focusin", (event) => {
  const host = event.target;
  if (!(host instanceof HTMLTextAreaElement) || !NOTE_SURFACE_IDS.has(host.id)) return;
  //: documents.js is in: its own delegated listener mounts and focuses.
  if (typeof mountNoteSurface === "function") return;
  mountNoteSurfaceNow(host).then((surface) => {
    //: Focus moved on while the bundle was fetching: mount, but do not
    //: steal the caret back.
    if (surface && surface.kind === "codemirror" && document.activeElement === host) surface.focus();
  });
});

//: **Tab indents from the first keystroke** (owner, INBOX 392: "indenting and
//: dedenting across the app also doesnt come in the form it should"). The
//: editor that owns Tab and Shift+Tab (documents.js `indentDocSelection`)
//: arrives with the Library bundle on a note box's first focus, and until it
//: has, the box is a plain textarea: measured on a fresh boot, "- alpha"
//: plus Tab moved focus to the tags field instead of indenting. This bridges
//: that second or two with the same rule the editor applies: whole lines,
//: two spaces, list items as blocks, Shift+Tab only when there is something
//: to take off (so a flush-left caret still tabs backwards out of the box).
//: Once the bundle is in, the textarea is replaced and this never runs.
document.addEventListener("keydown", (event) => {
  const box = event.target;
  if (event.key !== "Tab" || event.ctrlKey || event.altKey || event.metaKey) return;
  if (!(box instanceof HTMLTextAreaElement) || !NOTE_SURFACE_IDS.has(box.id)) return;
  const value = box.value;
  const selStart = box.selectionStart;
  const selEnd = box.selectionEnd;
  const lineStart = value.lastIndexOf("\n", selStart - 1) + 1;
  const endBreak = value.indexOf("\n", selEnd > selStart ? selEnd - 1 : selEnd);
  const lineEnd = endBreak === -1 ? value.length : endBreak;
  const lines = value.slice(lineStart, lineEnd).split("\n");
  let next;
  if (event.shiftKey) {
    if (!lines.some((line) => /^( {1,2}|\t)/.test(line))) return;
    next = lines.map((line) => line.replace(/^( {1,2}|\t)/, ""));
  } else {
    next = lines.map((line) => `  ${line}`);
  }
  event.preventDefault();
  const text = next.join("\n");
  box.setRangeText(text, lineStart, lineEnd, "preserve");
  const shift = next[0].length - lines[0].length;
  box.selectionStart = Math.max(lineStart, selStart + shift);
  box.selectionEnd = selEnd + (text.length - (lineEnd - lineStart));
  box.dispatchEvent(new Event("input", { bubbles: true }));
});

//: **The entry points that can be reached before their own file exists.**
//:
//: Most calls into a lazy module happen on its own tab, after `switchTab` has
//: awaited it. These are the ones that do not: a map chip in the note list
//: opens a board, the command palette opens a document, the notes editor's
//: bold button is documents.js's `applyMarkdown`, and eight of graph.js's
//: functions are read as *bare identifiers* by this file's own top-level
//: wiring (the click listener this file binds on `#graph-popup-close` names
//: `closeGraphPopup` as a bare identifier), which is evaluated the moment that
//: line runs and would throw ReferenceError with graph.js absent.
//:
//: Each name below gets a stand-in that loads the bundle and then calls the
//: real function, which has replaced the stand-in by then: a top-level
//: `function foo()` in a classic script rebinds `globalThis.foo`, so no
//: hand-off is needed beyond looking the name up again.
//:
//: Two rules decide what is on this list, and both matter:
//:
//: 1. **Only functions whose return value nobody reads.** A stand-in has to
//:    return a promise, so a function whose answer is used in the same
//:    statement cannot have one. `docEventFromCm` is the sharp case: editor.js
//:    reads it as `if (typeof docEventFromCm === "function" &&
//:    docEventFromCm(event.target)) return;`, and a promise is truthy, so a
//:    stand-in there would swallow every keystroke in the note editor. Those
//:    functions are left off, and their `typeof` guard then means what it
//:    says: the document surface is not loaded, so this is not one.
//: 2. **Only functions a person's own gesture reaches.** `loadLibrary` and
//:    `renderLibrary` are deliberately absent: they are called from "refresh
//:    the list if it is on screen" guards after an OCR pass or an import
//:    finishes, and a stand-in would pull 1.7 MB in the background because a
//:    caption came back. Skipping is the right answer when the Library has
//:    never been opened; opening it loads and renders it anyway.
const LAZY_ENTRY_POINTS = {
  graph: [
    "clearTrace",
    "closeGraphNewNote",
    "closeGraphPopup",
    "exportGraphPng",
    "openGraphNewNote",
    "placeGraphPopup",
    "renderGraph",
    "saveGraphNewNote",
    "saveGraphPopup",
    "setTracePanelOpen",
    "syncGraphPopupSave",
  ],
  library: [
    "applyDocGutter",
    "applyMarkdown",
    "closeBinnedReader",
    "closeDocAiPanel",
    "createConceptMap",
    "createDocument",
    "createNewBoard",
    "expandNoteIntoDocument",
    "flashLibraryItem",
    "focusLibraryFile",
    "initDocSidebarTabs",
    "loadDocuments",
    "markDocDirty",
    "mountDocToolbarControlsFor",
    "mountGutterFor",
    "openDocDictionary",
    "openDocTemplateDialog",
    "openDocument",
    "renderDocStorage",
    "saveDocument",
    "showDocSidebarSection",
    "toggleDocFindBar",
    "wbOpenBoardSearch",
    "wbShowBoardsLanding",
    "wbShowCanvasView",
    "wbToggleNavigator",
    "wireMarkdownToolbar",
    "wireMdFormatShortcuts",
    "openWhiteboardBoard",
  ],
};

for (const [module, names] of Object.entries(LAZY_ENTRY_POINTS)) {
  for (const name of names) {
    // A name this file (or another that always loads) already defines is that
    // file's, and must not be shadowed.
    if (typeof window[name] === "function") continue;
    const standIn = (...args) =>
      ensureModule(module).then(() => {
        const real = window[name];
        //: The module failed to load (offline, or the file is gone). Calling
        //: the stand-in again here would recurse forever, so this is where it
        //: stops, quietly: the control does nothing, which is what it did
        //: before this list existed.
        if (typeof real !== "function" || real === standIn) return undefined;
        return real(...args);
      });
    window[name] = standIn;
  }
}

// --- one map chip and one map preview, used everywhere ----------------------
//
//: MINDMAP_PLAN.md §5 item 12, and the sentence in it that is the whole
//: reason this exists: *"One `mapChip()` and one `mapPreview()`, used by all
//: of them: the app's recurring failure is the same object drawn five
//: ways."*
//:
//: It had already happened twice before this was written. The Library's board
//: card (`renderLibraryBoardsGallery`, whiteboard.js) drew the minimap with
//: edges, labels, a sketch squiggle and an edge-aware label side; the
//: dashboard's boards widget (`dashBoardThumb`, dashboard.js) drew the *same*
//: `preview_items` at a different scale with **no edges at all**, so the one
//: fact that distinguishes a map from a board was missing from one of the two
//: places a map appears. Neither was wrong on its own; they were two opinions
//: of one picture.
//:
//: Lives in app.js because five files draw these, whiteboard.js, dashboard.js,
//: the timeline and the note renderer here, and the chat transcript, and
//: app.js is the one loaded before all of them (see index.html's script
//: order).

//: The sizes a preview is ever drawn at. A named size rather than a pair of
//: numbers per call site: "the Library card's minimap" and "the dashboard
//: row's thumbnail" are the two real cases, and letting each caller pass its
//: own geometry is how the two drifted apart in the first place.
//:
//: `labels` is off at row size deliberately. Sixteen characters beside a 9×6
//: block is a legible texture in a 100×56 card; the same text in a 40×40
//: thumbnail is a smear.
//:
//: `w`/`h` are the *box the picture is letterboxed into*, not the viewBox:
//: since the drawing is now made at the board's own ratio, the two are the
//: same only for a board that happens to be shaped like the card. Everything
//: else here (`pad`, `blockW`, `blockH`, `font`) is a size in that box, and
//: `mapPreview` divides each of them by the scale the browser is about to
//: apply, so a node in a tall map is drawn the same number of pixels across
//: as a node in a wide one. Without that division the block sizes are in
//: viewBox units and a square board's nodes come out 44% smaller than a wide
//: board's, for no reason a reader could see.
const MAP_PREVIEW_SIZES = {
  card: { w: 100, h: 56, pad: 3, blockW: 9, blockH: 6, labels: true, font: 4.2 },
  row: { w: 40, h: 40, pad: 3, blockW: 4, blockH: 3, labels: false, font: 0 },
};

//: The long side of the board's own box, in viewBox units. Arbitrary: only
//: the *ratio* of the viewBox is meaningful, since `preserveAspectRatio`
//: scales it into the card either way. 100 keeps the numbers in the DOM
//: readable when someone inspects a thumbnail.
const MAP_PREVIEW_BASE = 100;

//: How round a node is, as a fraction of its short side. A node on the canvas
//: is a rounded card, not a dot and not a pill, and the miniature says the
//: same thing at a twentieth of the size.
//:
//: **Was 0.35, and 0.35 is a blob** (INBOX 164: "board previews need upgrading
//: and fixing", with a screenshot of a wash of rounded blobs). Measured on a
//: seeded board at 1440 (`scratchpad/ui-sweeps/boardpreview.js`): every block
//: came out 52.9x24.7 with a rendered corner radius of 8.66px, which is 35% of
//: its own short side. A rectangle whose corners eat a third of its height is
//: not a rounded rectangle, and nothing on the canvas looks like that: a note
//: card is `--radius`, 10px on a 150px side, which is 7%.
const MAP_PREVIEW_NODE_ROUNDING = 0.22;

//: And the ceiling that does the real work, in the nominal units
//: `MAP_PREVIEW_SIZES` is written in. A fraction of the short side alone cannot
//: be right at both sizes this preview draws at: the same 22% is a gentle
//: corner on a 25px-tall block in a Library card and a pill on a 4px one in a
//: dashboard row. It is divided back out by the box's own scale below, so the
//: corner is the same size whatever shape the board is, and the fraction is
//: left as the floor for a block too small to carry it.
//:
//: The nominal box is not pixels: a `card` is 100x56 here and measured 293.5px
//: wide in the Library, so one unit is about 2.9 rendered pixels, and 0.8 of one
//: is the 2px corner a note card has on the canvas.
const MAP_PREVIEW_CORNER_UNITS = 0.8;

//: The floor on a block's drawn size, as a multiple of the size every block
//: used to be. A small object on a large board is a fraction of a viewBox
//: unit once it is drawn to scale, and a preview whose smallest things are
//: invisible is a preview of the big ones only.
const MAP_PREVIEW_MIN_BLOCK = 0.5;

//: A character's width as a fraction of the type size. Still here as the
//: fallback for a browser that cannot measure (see `mapPreviewTextWidth`),
//: and as the unit the padding around a label is expressed in.
//:
//: **It is no longer what decides whether a label fits**, and the reason is a
//: measurement. An estimate that is 0.55 when the font draws wider puts the
//: text past the room it was budgeted, and the budget is what every later
//: decision is made from: measured on a seeded board, "body text" was
//: budgeted into a margin and painted 20.0 units wide starting at x=100.1 in
//: a 100-unit-wide viewBox, so the label began past the edge of the paper.
//: Reported as "the boards and maps previews are kinda a mess".
const MAP_PREVIEW_CHAR_WIDTH = 0.55;

//: **What a label really paints, at font-size 1, cached by string.**
//:
//: One hidden SVG for the whole page, carrying `.board-minimap` so the
//: stylesheet's own family and weight apply: measuring in a different font
//: than the one drawn is worse than not measuring, because it is wrong with
//: confidence. `getComputedTextLength` is the SVG text metric and needs the
//: element in a rendered tree, which a freshly built preview is not, hence a
//: measuring element rather than the label itself.
//:
//: Measured once per distinct string at size 100 and divided back out, so a
//: board's six titles cost six measurements however many previews of it are
//: on screen, and a title that appears in the dashboard widget and in the
//: Library is measured once for both. The cost this comment's predecessor
//: worried about ("laying out every thumbnail twice") is what the cache
//: removes: nothing is laid out twice, and nothing is laid out per preview.
const MAP_PREVIEW_TEXT_WIDTHS = new Map();
const MAP_PREVIEW_MEASURE_SIZE = 100;
let mapPreviewMeasureText = null;

function mapPreviewTextWidth(text, fontSize) {
  const body = String(text || "");
  if (!body) return 0;
  let perUnit = MAP_PREVIEW_TEXT_WIDTHS.get(body);
  if (perUnit === undefined) {
    perUnit = null;
    try {
      if (!mapPreviewMeasureText) {
        const NS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(NS, "svg");
        //: `board-minimap` for the font, `map-preview-measure` for the
        //: off-screen placement: the CSP refuses an inline `style=`, so both
        //: are classes (10-responsive.css holds the second).
        svg.setAttribute("class", "board-minimap map-preview-measure");
        svg.setAttribute("aria-hidden", "true");
        const node = document.createElementNS(NS, "text");
        node.setAttribute("font-size", String(MAP_PREVIEW_MEASURE_SIZE));
        svg.appendChild(node);
        document.body.appendChild(svg);
        mapPreviewMeasureText = node;
      }
      mapPreviewMeasureText.textContent = body;
      const measured = mapPreviewMeasureText.getComputedTextLength();
      if (measured > 0) perUnit = measured / MAP_PREVIEW_MEASURE_SIZE;
    } catch {
      //: A browser with no SVG text metrics, or a document that will not take
      //: the element: the estimate below is what this always used.
      perUnit = null;
    }
    MAP_PREVIEW_TEXT_WIDTHS.set(body, perUnit);
  }
  return perUnit === null
    ? body.length * MAP_PREVIEW_CHAR_WIDTH * fontSize
    : perUnit * fontSize;
}

//: Cut a label to the widest it may paint, measuring rather than counting
//: characters: "Illinois" and "WWWWWWWW" are eight characters and very
//: different widths, and the second is what runs off the paper. Returns null
//: when even one character and the ellipsis will not fit, which is the "draw
//: nothing" case the caller already had.
function mapPreviewFitText(text, fontSize, room) {
  const body = String(text || "");
  if (!body) return null;
  if (mapPreviewTextWidth(body, fontSize) <= room) return body;
  for (let cut = body.length - 1; cut >= 1; cut--) {
    const shown = `${body.slice(0, cut).trimEnd()}\u2026`;
    if (mapPreviewTextWidth(shown, fontSize) <= room) return shown;
  }
  return null;
}

//: Do two boxes share more than a hair? A shared edge is not a collision, and
//: floating point makes an exactly shared edge rare, so the threshold is a
//: fraction of a unit rather than zero.
//: Is a painted box wholly on the thumbnail's paper? The slack is one
//: hundredth of a unit, which is below what `round2` can express, so a box
//: that lands exactly on the border is inside rather than half a rounding
//: error outside it.
function mapPreviewOnPaper(box, vw, vh) {
  return (
    box.x >= -0.01 && box.y >= -0.01
    && box.x + box.w <= vw + 0.01 && box.y + box.h <= vh + 0.01
  );
}

function mapPreviewOverlaps(a, b, slack = 0.35) {
  return (
    Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > slack
    && Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > slack
  );
}

//: **Which ink a label takes when it sits on a coloured node.** Measured
//: with `scratchpad/ui-sweeps/preview.js` the day inside labels landed: a
//: map's branch nodes are drawn at full strength in their branch colour, and
//: the app's own ink on a mid-tone blue is 3.82:1, under the 4.5 the rest of
//: the app is held to. White on that same blue is 4.9:1. The rule is the
//: usual one: pick whichever of the two the colour is further from, and
//: return the name of the class that paints it (see 10-responsive.css).
//:
//: Only for a label *inside* a coloured block. A label beside one sits on the
//: paper and keeps `--ink` from the stylesheet, which is where the theme
//: belongs.
function mapPreviewOnColour(colour) {
  const hex = String(colour || "").trim();
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return null;
  const value = parseInt(m[1], 16);
  const channel = (c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const luminance =
    0.2126 * channel((value >> 16) & 255) +
    0.7152 * channel((value >> 8) & 255) +
    0.0722 * channel(value & 255);
  // 0.18 is where white and black are equally far in WCAG terms.
  return luminance > 0.18 ? "dark" : "light";
}

//: The shortest label worth putting inside a shape. Below this the block is
//: too small to hold a word and the label goes beside it, where it has the
//: whole margin to run into: "M…" on a node says less than nothing.
const MAP_PREVIEW_MIN_INSIDE_CHARS = 5;

//: The shortest label worth drawing beside a shape. Under this the margin the
//: label would hang into holds "C…" and nothing more, which is texture with
//: a tooltip's worth of meaning and reads as a stray mark.
const MAP_PREVIEW_MIN_OUTSIDE_CHARS = 4;

//: How much of the card's width the letterboxed board has to fill before its
//: labels are worth drawing, as a fraction. See where it is used.
const MAP_PREVIEW_LABEL_FLOOR = 0.6;

//: Two decimals, as a number. Every coordinate in a thumbnail is now a
//: division by a scale factor, so without this the DOM fills with
//: `x="17.142857142857142"`: bytes, and unreadable when someone inspects a
//: card to work out what it drew.
function round2(value) {
  return Math.round(value * 100) / 100;
}

//: **One parent→child edge, as a curve.** Straight lines were what the first
//: version drew, and a tree of straight segments at thumbnail size reads as a
//: bar chart: the canvas draws cubic curves (`wbMapEdgePathD`), so the
//: miniature draws them too, and the two pictures of one map agree.
//:
//: The control points follow the dominant axis rather than the board's
//: `layout`: a `tree-right` map curves out sideways and a `tree-down` map
//: curves downward, and asking each segment which way it actually runs gets
//: both right, including the nodes someone dragged off the layout by hand.
//: The caller says how the curve is coloured, because the two ways of doing it
//: cannot both come from a class: an edge in its branch colour carries a
//: `stroke` *attribute*, and a presentation attribute loses to any class that
//: declares `stroke`. So `.board-minimap-edge` is geometry only, and an
//: uncoloured edge takes `.board-minimap-edge-accent` on top of it. The
//: alternative, `el.style.stroke`, writes a `style` attribute, which this
//: app's CSP drops and `mindmap3.js` asserts the absence of.
function mapPreviewEdge(NS, px, py, blockW, blockH, edge) {
  const curve = document.createElementNS(NS, "path");
  curve.setAttribute("class", "board-minimap-edge");
  // Half a block: a line should meet the centre of what it joins, and a block
  // is drawn from its top-left corner.
  const x1 = px(edge.x1) + blockW / 2;
  const y1 = py(edge.y1) + blockH / 2;
  const x2 = px(edge.x2) + blockW / 2;
  const y2 = py(edge.y2) + blockH / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const d = Math.abs(dx) >= Math.abs(dy)
    ? `M${round2(x1)} ${round2(y1)} C${round2(x1 + dx / 2)} ${round2(y1)} ${round2(x2 - dx / 2)} ${round2(y2)} ${round2(x2)} ${round2(y2)}`
    : `M${round2(x1)} ${round2(y1)} C${round2(x1)} ${round2(y1 + dy / 2)} ${round2(x2)} ${round2(y2 - dy / 2)} ${round2(x2)} ${round2(y2)}`;
  curve.setAttribute("d", d);
  return curve;
}

//: **A drawn stroke, drawn as the shape it actually is.** INBOX 164's "one
//: squiggle": every sketch on a board used to come out as the same small wave
//: at the same place, because the server sent every sketch at the board's
//: origin at one default size (fixed in `_sketch_preview`) and this drew one
//: generic mark whatever had been drawn. A board of eight shapes previewed as a
//: single scribble in the corner.
//:
//: The stroke data itself is still not shipped, and deliberately: a path per
//: sketch on a twenty-board list is the payload of a board load, for a picture
//: 290px wide. What is shipped is the tool it was drawn with, which is enough
//: for the thumbnail to say the true thing about each one: a rectangle is a
//: rectangle, a circle is a circle, a line runs corner to corner, and a pen
//: stroke is a scribble that fills its own box. Everything is at the stroke's
//: real position and size, so eight shapes are eight marks where they were
//: drawn.
//:
//: `stroke-width` and `stroke` arrive as attributes and the stylesheet must not
//: declare either, which is the trap `mapPreviewEdge` carries the same note
//: about: a CSS declaration beats a presentation attribute however specific the
//: attribute looks. `.board-minimap-sketch` is geometry only; an uncoloured
//: stroke takes `.board-minimap-sketch-accent` on top of it.
function mapPreviewSketch(NS, x, y, w, h, shape, unit) {
  const r2 = round2;
  const make = (tag) => {
    const el = document.createElementNS(NS, tag);
    el.setAttribute("class", "board-minimap-sketch");
    //: One weight at every size, for the reason the corner cap is in nominal
    //: units: a constant in viewBox units rendered 3.5px in a Library card and
    //: 0.48px in a dashboard row, where it disappeared.
    el.setAttribute("stroke-width", String(r2(1.6 * unit)));
    return el;
  };
  if (shape === "rect") {
    const el = make("rect");
    el.setAttribute("x", String(r2(x)));
    el.setAttribute("y", String(r2(y)));
    el.setAttribute("width", String(r2(w)));
    el.setAttribute("height", String(r2(h)));
    return el;
  }
  if (shape === "circle") {
    const el = make("ellipse");
    el.setAttribute("cx", String(r2(x + w / 2)));
    el.setAttribute("cy", String(r2(y + h / 2)));
    el.setAttribute("rx", String(r2(w / 2)));
    el.setAttribute("ry", String(r2(h / 2)));
    return el;
  }
  if (shape === "triangle" || shape === "diamond") {
    const el = make("polygon");
    const points = shape === "triangle"
      ? [[x + w / 2, y], [x + w, y + h], [x, y + h]]
      : [[x + w / 2, y], [x + w, y + h / 2], [x + w / 2, y + h], [x, y + h / 2]];
    el.setAttribute("points", points.map(([px, py]) => `${r2(px)},${r2(py)}`).join(" "));
    return el;
  }
  if (shape === "line" || shape === "arrow") {
    //: Corner to corner, because that is the only thing the box knows: a
    //: line's box is its two ends, and which diagonal it runs along is not
    //: recoverable from a bounding box. The alternative, a horizontal rule
    //: through the middle, says "a line was drawn" while being a different
    //: line from the one on the board; this one is right for half of them and
    //: the right length for all of them.
    const el = make("line");
    el.setAttribute("x1", String(r2(x)));
    el.setAttribute("y1", String(r2(y)));
    el.setAttribute("x2", String(r2(x + w)));
    el.setAttribute("y2", String(r2(y + h)));
    return el;
  }
  //: A pen or highlighter stroke: a scribble that fills the box it was drawn
  //: in, rather than a fixed wave in the corner of the board. Three humps,
  //: because two read as a tick and four as a wave pattern.
  const el = make("path");
  el.setAttribute("d", [
    `M${r2(x)} ${r2(y + h)}`,
    `C${r2(x + w * 0.18)} ${r2(y)} ${r2(x + w * 0.38)} ${r2(y + h)} ${r2(x + w * 0.52)} ${r2(y + h * 0.5)}`,
    `S${r2(x + w * 0.82)} ${r2(y)} ${r2(x + w)} ${r2(y + h * 0.3)}`,
  ].join(" "));
  return el;
}

//: A miniature of what is actually on a board, from `preview_items` /
//: `preview_edges`, positions already normalised into 0..1 against the
//: board's own bounds by `routes_whiteboard._board_preview`, so this draws the
//: real layout without the client ever loading the board.
//:
//: **An empty board draws the empty state, not nothing.** It used to return
//: null and each caller improvised: the Library's card mode drew no picture
//: at all, its rows mode drew a dashed rail so the rows would still line up,
//: and the dashboard skipped the thumbnail, so three surfaces disagreed about
//: what an empty map looks like and two of them lost their left edge. The
//: empty state is drawn here, once, in the same language as a real preview: a
//: ghost of a three-node map on the same paper, which says "a map goes here"
//: where a blank box said nothing.
//:
//: Built with SVG attributes and never an inline `style` string: this app's
//: CSP drops those outright, and thirty-five of them once shipped as silently
//: dead markup (CLAUDE.md, "a policy silently refusing the work").
function mapPreview(board, { size = "card" } = {}) {
  const geo = MAP_PREVIEW_SIZES[size] || MAP_PREVIEW_SIZES.card;
  const items = Array.isArray(board?.preview_items) ? board.preview_items : [];
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("class", `board-minimap board-minimap-${size}`);
  svg.setAttribute("aria-hidden", "true");

  //: **The board's own shape, letterboxed into the card's box.** The viewBox
  //: is drawn at `preview_aspect` (the board's width/height, which
  //: normalising the positions into 0..1 threw away) and `meet` fits it
  //: inside the element rather than stretching it to fill: a map that runs
  //: down the page used to come back as the same wide rectangle as one that
  //: runs across, and every board in the Library was the same shape as every
  //: other, which is a picture of the card, not of the board.
  const aspect = Number(board?.preview_aspect) > 0 ? Number(board.preview_aspect) : 1;
  const vw = aspect >= 1 ? MAP_PREVIEW_BASE : MAP_PREVIEW_BASE * aspect;
  const vh = aspect >= 1 ? MAP_PREVIEW_BASE / aspect : MAP_PREVIEW_BASE;
  svg.setAttribute("viewBox", `0 0 ${round2(vw)} ${round2(vh)}`);
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  // The scale `meet` is about to apply, so every fixed size below can be
  // expressed in the box's units and divided back out: see MAP_PREVIEW_SIZES.
  const scale = Math.min(geo.w / vw, geo.h / vh);
  const unit = 1 / scale;
  const pad = geo.pad * unit;
  const blockW = geo.blockW * unit;
  const blockH = geo.blockH * unit;
  // The drawable box, inset by the padding on both sides so an item at the
  // extreme edge of the board lands inside the thumbnail rather than half
  // outside it. Floored at zero: an extreme ratio can leave less room than
  // one block needs, and a negative span would mirror the whole picture.
  const spanX = Math.max(0, vw - pad * 2 - blockW);
  const spanY = Math.max(0, vh - pad * 2 - blockH);
  //: **Labels need width, and a letterboxed tall board has not got it.**
  //: Measured on the first run of the redesigned card: a board half as wide as
  //: it is tall draws its paper 82px across inside a 293px card, and the
  //: sixteen-character labels that read as a texture at 293px overlapped each
  //: other and the nodes they belonged to ("First branchRoot"). Below
  //: `MAP_PREVIEW_LABEL_FLOOR` of the box's width the labels come off and the
  //: shape carries the card, which is what the row size already does.
  const labels = geo.labels && vw * scale >= geo.w * MAP_PREVIEW_LABEL_FLOOR;
  const px = (x) => pad + (Number(x) || 0) * spanX;
  const py = (y) => pad + (Number(y) || 0) * spanY;

  //: **The paper.** The frame and fill used to belong to the `<svg>` element
  //: itself, which is the card's box, so the border said "this is the shape
  //: of the board" while being the shape of the card. Drawn as a rect inside
  //: the viewBox instead, it is the letterboxed board, and it is the thing a
  //: sweep can measure: its rendered width/height *is* `preview_aspect`.
  const paper = document.createElementNS(NS, "rect");
  paper.setAttribute("class", "board-minimap-paper");
  paper.setAttribute("x", "0");
  paper.setAttribute("y", "0");
  paper.setAttribute("width", String(round2(vw)));
  paper.setAttribute("height", String(round2(vh)));
  paper.setAttribute("rx", String(round2(2 * unit)));
  svg.appendChild(paper);

  if (!items.length) {
    // The one designed empty state, in the same language as a real preview:
    // three nodes and two curves, ghosted. See the header comment.
    paper.classList.add("board-minimap-paper-empty");
    const ghost = document.createElementNS(NS, "g");
    ghost.setAttribute("class", "board-minimap-ghost");
    const shape = [
      { x: 0.04, y: 0.5 },
      { x: 0.72, y: 0.16 },
      { x: 0.72, y: 0.84 },
    ];
    for (const child of shape.slice(1)) {
      ghost.appendChild(
        mapPreviewEdge(NS, px, py, blockW, blockH, {
          x1: shape[0].x,
          y1: shape[0].y,
          x2: child.x,
          y2: child.y,
        })
      );
    }
    for (const node of shape) {
      const block = document.createElementNS(NS, "rect");
      block.setAttribute("x", String(round2(px(node.x))));
      block.setAttribute("y", String(round2(py(node.y))));
      block.setAttribute("width", String(round2(blockW)));
      block.setAttribute("height", String(round2(blockH)));
      block.setAttribute("rx", String(round2(Math.min(blockW, blockH) * MAP_PREVIEW_NODE_ROUNDING)));
      ghost.appendChild(block);
    }
    svg.appendChild(ghost);
    return svg;
  }

  //: **The tree, drawn first so the lines sit under the blocks** rather than
  //: across their labels. `preview_edges` is the parent→child segments in the
  //: same normalised space as the items (§9.1); an ordinary board ships an
  //: empty list and this loop does nothing, which is exactly the difference
  //: between the two kinds that a scatter of dots cannot show.
  for (const edge of Array.isArray(board.preview_edges) ? board.preview_edges : []) {
    const curve = mapPreviewEdge(NS, px, py, blockW, blockH, edge);
    // The branch's colour, from the server (`_map_branch_colors`), so the
    // thumbnail is the same picture as the canvas rather than a grey diagram
    // of it.
    if (edge.color) curve.setAttribute("stroke", edge.color);
    else curve.classList.add("board-minimap-edge-accent");
    svg.appendChild(curve);
  }

  //: **How big this thing is on the board**, in the viewBox's units, from the
  //: `w`/`h` the server now ships as fractions of the same span `x` and `y`
  //: were normalised into (INBOX 68).
  //:
  //: This is the difference between a picture of the board and a picture of
  //: the renderer. Measured before it: every block in every preview came back
  //: at one size (29.1x21.8 in the dashboard, 26.4x17.6 in the Library), so a
  //: banner across the top of a board, the column beside it and a sticky note
  //: were three identical grey rectangles, which is the owner's "grey blobs"
  //: exactly. A board's own shapes are most of what tells two boards apart.
  //:
  //: Floors, not raw values: a small object on a large board is a fraction of
  //: a viewBox unit and would vanish, and something has to be visible for the
  //: preview to be a preview. The ceiling is the drawable span, so one huge
  //: object cannot spill outside the paper it is drawn on. An older payload
  //: (a cached list from before the server sent sizes) has no `w`, and falls
  //: back to the uniform block, which is what this drew for everything.
  const sizeOf = (item) => {
    const w = Number(item.w);
    const h = Number(item.h);
    if (!(w > 0) || !(h > 0)) return { w: blockW, h: blockH };
    return {
      w: Math.min(spanX + blockW, Math.max(blockW * MAP_PREVIEW_MIN_BLOCK, w * spanX)),
      h: Math.min(spanY + blockH, Math.max(blockH * MAP_PREVIEW_MIN_BLOCK, h * spanY)),
    };
  };

  //: **Every block's painted box, collected as they are drawn**, so the label
  //: pass below can ask whether a caption has landed on something that is not
  //: its own (INBOX 263: the previews "are kinda a mess"). A label beside a
  //: block used to be placed from that block alone, with no idea that the
  //: margin it hung into was already full: measured on a six-card board,
  //: "Retry budget" was drawn 10 units into a neighbouring card and 15.9
  //: units across "Ingest pipeline".
  const drawn = [];

  //: **Nothing is drawn past the paper's edge.** `px`/`py` place an item's
  //: *top-left corner* inside the drawable span, and the span is computed
  //: from the default block's width, while `sizeOf` returns the item's own,
  //: which can be many times larger. The server's `w` compounds it: it is a
  //: fraction of the span between the items' corners (`_preview_items`), and
  //: an item wider than the distance between the outermost two corners has a
  //: `w` above 1 quite legitimately. Measured on a six-card board: cards
  //: 39.06 units wide drawn at x=76.28 in a 100-unit-wide viewBox, so a third
  //: of every card in the right-hand column was outside the thumbnail, which
  //: is most of what "the boards and maps previews are kinda a mess" is
  //: looking at.
  //:
  //: The left edge is kept and the far edge trimmed, rather than the block
  //: being moved: where a thing starts is its position, which is information;
  //: where a clipped block ends is not. A thumbnail is a crop of a board, and
  //: a large item running to the edge should be drawn running to the edge.
  //: The floor is the same one `sizeOf` uses (a fraction of the default
  //: block), not a bare number: `MAP_PREVIEW_MIN_BLOCK` is a multiplier, and
  //: reading it as viewBox units would make the smallest allowed block half a
  //: unit, which is a dot.
  const onPaper = (at, extent, floor, from, to) =>
    Math.max(floor, Math.min(extent, to - Math.max(from, at)));

  for (const item of items) {
    const nx = px(item.x);
    const ny = py(item.y);
    const raw = sizeOf(item);
    const size = {
      w: onPaper(nx, raw.w, blockW * MAP_PREVIEW_MIN_BLOCK, pad, vw - pad),
      h: onPaper(ny, raw.h, blockH * MAP_PREVIEW_MIN_BLOCK, pad, vh - pad),
    };
    if (item.kind !== "sketch") drawn.push({ item, x: nx, y: ny, w: size.w, h: size.h });
    if (item.kind === "sketch") {
      // The shape it was drawn with, at the size and place it was drawn, in
      // its own ink: see `mapPreviewSketch`. The stroke data itself is still
      // not shipped, which is the one thing `preview_items` deliberately
      // leaves out.
      const mark = mapPreviewSketch(NS, nx, ny, size.w, size.h, item.shape, unit);
      if (item.color) mark.setAttribute("stroke", item.color);
      else mark.classList.add("board-minimap-sketch-accent");
      svg.appendChild(mark);
      continue;
    }
    const dot = document.createElementNS(NS, "rect");
    //: **A picture gets its own ink and its own mark.** An image object is the
    //: one thing on a board with no words of its own (the server sends no
    //: label for it, and a thumbnail of a thumbnail is a different feature),
    //: so in one flat accent wash it was indistinguishable from a text box
    //: holding a paragraph. Measured on the seeded board: twelve marks, one
    //: ink. It is a quieter grey block with the universal picture glyph over
    //: it, which says "a picture is here" in the language every other surface
    //: uses for one.
    const grey = item.kind === "card"
      ? "board-minimap-card"
      : item.kind === "image"
        ? "board-minimap-image"
        : "board-minimap-object";
    // A branch node takes its own class rather than the grey one, for the
    // reason on `mapPreviewEdge`: the fill arrives as an attribute, and the
    // grey classes declare `fill`, which would win.
    dot.setAttribute("class", item.color ? "board-minimap-branch" : grey);
    dot.setAttribute("x", String(round2(nx)));
    dot.setAttribute("y", String(round2(ny)));
    dot.setAttribute("width", String(round2(size.w)));
    dot.setAttribute("height", String(round2(size.h)));
    // Rounded like the node it stands for, and rounded by its own size rather
    // than by a fixed 1.5: the block is drawn at a different number of viewBox
    // units on every board shape now, so a constant radius was a sharp corner
    // on one card and a pill on the next. Capped at
    // `MAP_PREVIEW_CORNER_UNITS`, which is what stopped these reading as blobs
    // (INBOX 164): the fraction alone was 35% of a block's
    // short side, measured.
    dot.setAttribute("rx", String(round2(Math.min(
      MAP_PREVIEW_CORNER_UNITS * unit,
      Math.min(size.w, size.h) * MAP_PREVIEW_NODE_ROUNDING
    ))));
    // The grey blocks are faded because an unlabelled box is texture; a
    // coloured node is carrying which branch it belongs to, so it is drawn at
    // full strength (`.board-minimap-branch`).
    if (item.color) dot.setAttribute("fill", item.color);
    svg.appendChild(dot);
    if (item.kind === "image") {
      //: The glyph, inside the block and scaled to it: a horizon line with a
      //: sun over it, which is the picture icon everywhere else in the app.
      //: Skipped on a block too small to hold it, where it would be two
      //: smudges on a grey square.
      const short = Math.min(size.w, size.h);
      if (short > 6 * unit) {
        const mark = document.createElementNS(NS, "path");
        mark.setAttribute("class", "board-minimap-image-mark");
        mark.setAttribute("stroke-width", String(round2(1.2 * unit)));
        const x0 = nx + size.w * 0.18;
        const x1 = nx + size.w * 0.82;
        const base = ny + size.h * 0.72;
        mark.setAttribute("d", [
          `M${round2(x0)} ${round2(base)}`,
          `L${round2(nx + size.w * 0.42)} ${round2(ny + size.h * 0.42)}`,
          `L${round2(nx + size.w * 0.6)} ${round2(base)}`,
          `M${round2(nx + size.w * 0.62)} ${round2(base)}`,
          `L${round2(nx + size.w * 0.74)} ${round2(ny + size.h * 0.56)}`,
          `L${round2(x1)} ${round2(base)}`,
        ].join(" "));
        svg.appendChild(mark);
      }
      continue;
    }
  }

  //: **The labels, placed after every block is drawn and against all of
  //: them.** Reported as "the boards and maps previews are kinda a mess", and
  //: measured on a six-card board before this: "Retry budget" drawn 10 units
  //: into a neighbouring card and 15.9 across "Ingest pipeline", and a
  //: caption starting at x=100.1 in a 100-unit-wide viewBox.
  //:
  //: Three things were wrong and each needed the pass to know more than one
  //: item at a time. The width was estimated from a characters-times-0.55
  //: constant, and a budget that under-reports puts the text past the room it
  //: was granted; the margin a label hangs into was treated as empty when it
  //: often holds the next card; and nothing looked at the other labels at
  //: all. So: measure the text, test the box against the blocks and against
  //: the labels already kept, and drop a caption that has nowhere to go.
  //:
  //: **Dropping is the right answer when there is no room**, not shrinking or
  //: overlapping. A preview is a picture you read at a glance, and two
  //: captions across each other are less use than one caption and a block
  //: with no words on it: the block, its size, its place and its colour still
  //: say what is there.
  //:
  //: Biggest first, so when two want the same margin the one on the larger
  //: thing keeps it, which is also the one a reader's eye goes to.
  if (labels) {
    const kept = [];
    const ordered = drawn
      .filter((row) => row.item.label && row.item.kind !== "image")
      .sort((a, b) => b.w * b.h - a.w * a.h);
    for (const row of ordered) {
      const { item } = row;
      const fontUnits = geo.font * unit;
      const perChar = fontUnits * MAP_PREVIEW_CHAR_WIDTH;
      const gap = 1.5 * unit;
      //: The label's painted height. `getBBox` would give it exactly, and
      //: cannot be asked here (the preview is not in the document yet), but a
      //: cap height plus descender is a fixed fraction of the type size in
      //: any family, which is enough to test a box with.
      const lineH = fontUnits * 1.15;

      //: **Inside the shape when the shape can hold it**, beside it when it
      //: cannot. Reported as the text "sitting off its shapes": before a
      //: topic was drawn at its own size, a block was a fixed 9x6 units
      //: whatever it stood for and nothing could ever contain a word. A
      //: 200x56 node has room for its own name, which is where a person
      //: reading a map expects to find it.
      //:
      //: Nearly all of it, or none: the earlier version cut to fit and drew
      //: "Retr…", "Inge…" and "Open…" on three cards, which is three cards
      //: that cannot be told apart by the one thing meant to tell them apart.
      const insideRoom = row.w - perChar * 2;
      const tall = row.h >= fontUnits * 1.6;
      const full = mapPreviewTextWidth(item.label, fontUnits);
      const insideChars = Math.floor(insideRoom / perChar);
      const fits = tall && full <= insideRoom
        && insideChars >= MAP_PREVIEW_MIN_INSIDE_CHARS;

      let shown = null;
      let box = null;
      let anchor = "start";
      let x = 0;
      let y = 0;
      if (fits) {
        shown = item.label;
        x = row.x + row.w / 2;
        y = row.y + row.h / 2 + fontUnits * 0.36;
        anchor = "middle";
        box = { x: x - full / 2, y: y - fontUnits * 0.8, w: full, h: lineH };
      } else {
        //: Both margins measured from the block's own edges to the paper's,
        //: and the wider one tried first. `nx > vw / 2` was the old test and
        //: it reads the block's *left* edge, so a wide item just left of
        //: centre was labelled to its right at `nx + size.w + gap`, which on
        //: a 200-unit-wide topic is past the paper (INBOX 174).
        const roomRight = Math.max(0, vw - (row.x + row.w + gap));
        const roomLeft = Math.max(0, row.x - gap);
        const roomBelow = Math.max(0, vh - (row.y + row.h + gap));
        const roomAbove = Math.max(0, row.y - gap);
        //: **Four places, not two: beside, and under or over.** Under a
        //: thumbnail's block is where a caption goes in every file browser
        //: ever written, and it was not tried at all, so a board whose cards
        //: sit in a row lost every title but the outermost: the margin left
        //: and right is the next card, and there was nowhere else to look.
        //: Measured on a six-card board: 2 of 6 titles drawn before these two
        //: positions existed.
        //:
        //: The wider margin first, then the taller one, so the caption lands
        //: where there is most room and a board only falls back to stacking
        //: text under a block when its sides are genuinely full.
        const places = [
          { side: "left", room: roomLeft },
          { side: "right", room: roomRight },
          { side: "below", room: roomBelow },
          { side: "above", room: roomAbove },
        ].sort((a, b) => b.room - a.room);
        //: Each vertical position is tried three ways: centred under its
        //: block, then flushed to the block's left edge, then to its right.
        //: A centred caption is the one to want, and on a crowded board it is
        //: often the only one of the three that meets the neighbour: sliding
        //: it to an edge it already shares with its own block keeps it
        //: attached to the right thing while stepping out of the way.
        const alignments = ["centre", "start", "end"];
        const tries = [];
        for (const place of places) {
          if (place.side === "below" || place.side === "above") {
            for (const align of alignments) tries.push({ ...place, align });
          } else {
            tries.push({ ...place, align: "centre" });
          }
        }
        for (const place of tries) {
          const side = place.side;
          const vertical = side === "below" || side === "above";
          //: A caption under a block is bounded by the *paper's* width, not
          //: by the margin below it, which is what has to hold its height.
          if (vertical && place.room < lineH + gap) continue;
          const room = vertical
            ? Math.min(row.x + row.w, vw - row.x) * 2 - perChar
            : place.room - perChar;
          if (room < perChar * MAP_PREVIEW_MIN_OUTSIDE_CHARS) continue;
          const cut = mapPreviewFitText(item.label, fontUnits, room);
          if (!cut) continue;
          const width = mapPreviewTextWidth(cut, fontUnits);
          const centre = row.x + row.w / 2;
          const baseline = side === "below"
            ? row.y + row.h + gap + fontUnits * 0.8
            : side === "above"
              ? row.y - gap
              : row.y + row.h * 0.73;
          //: Where a vertical caption's own box starts, given the alignment
          //: this attempt is trying.
          const under = place.align === "start"
            ? row.x
            : place.align === "end"
              ? row.x + row.w - width
              : centre - width / 2;
          const left = side === "left"
            ? row.x - gap - width
            : side === "right"
              ? row.x + row.w + gap
              : under;
          const candidate = { x: left, y: baseline - fontUnits * 0.8, w: width, h: lineH };
          //: **Off the paper is a reason to try the next position, not a
          //: reason to give up on the label.** This test used to sit after
          //: the loop, which made the first candidate that missed the other
          //: blocks the last one considered: measured on the seeded board,
          //: "Retry budget" cleared every block centred under its own card,
          //: began at x=-1.21, and was then dropped without the two aligned
          //: positions beside it ever being tried, one of which fits. Two
          //: reasons to reject a place belong in the same list.
          if (!mapPreviewOnPaper(candidate, vw, vh)) continue;
          //: Its own block is not a clash: a caption beside a card may touch
          //: the card it names, and often has to on a crowded board.
          const clash = drawn.some((other) => other !== row && mapPreviewOverlaps(candidate, other))
            || kept.some((other) => mapPreviewOverlaps(candidate, other));
          if (clash) continue;
          shown = cut;
          //: The text anchor has to match the box that was just tested, or
          //: the collision test is about a rectangle the browser never draws.
          anchor = side === "left"
            ? "end"
            : side === "right"
              ? "start"
              : place.align === "start" ? "start" : place.align === "end" ? "end" : "middle";
          x = side === "left"
            ? row.x - gap
            : side === "right"
              ? row.x + row.w + gap
              : place.align === "start" ? row.x : place.align === "end" ? row.x + row.w : centre;
          y = baseline;
          box = candidate;
          break;
        }
      }
      if (!shown || !box) continue;
      //: **A label inside its own block is still checked against the labels
      //: already kept.** Blocks legitimately overlap on a board (a card
      //: dropped on another, a topic over a branch), so two captions drawn in
      //: the middle of two overlapping blocks land on top of each other
      //: however correct each one is on its own: measured on a board with
      //: stacked cards, six pairs of identical titles across each other. It
      //: is not checked against the *blocks*, because sitting on a block is
      //: what an inside label is for.
      if (fits && kept.some((other) => mapPreviewOverlaps(box, other))) continue;
      //: The paper's own edges for the inside case, which has only the one
      //: position to offer and so tests them here rather than in a loop. A
      //: caption sliced by the thumbnail's edge reads as a rendering fault,
      //: which is what it is.
      if (!mapPreviewOnPaper(box, vw, vh)) continue;

      const text = document.createElementNS(NS, "text");
      text.setAttribute("class", "board-minimap-label");
      text.setAttribute("x", String(round2(x)));
      text.setAttribute("y", String(round2(y)));
      if (anchor !== "start") text.setAttribute("text-anchor", anchor);
      // The type size, in the box's units divided back out, for the same
      // reason the blocks are: a fixed CSS `font-size` here is in viewBox
      // units, so the labels on a square board came out half the size of the
      // labels on a wide one. The stylesheet keeps the colour and the family.
      text.setAttribute("font-size", String(round2(fontUnits)));
      if (fits) {
        text.classList.add("board-minimap-label-inside");
        //: A class, not a `fill` attribute, and this is the trap the blocks
        //: above already carry a note about: `.board-minimap-label` declares
        //: `fill` in the stylesheet, and a CSS declaration beats a
        //: presentation attribute however specific the attribute looks.
        //: Setting the attribute changed nothing at all, measured: 3.82:1
        //: before and after.
        const onColour = item.color ? mapPreviewOnColour(item.color) : null;
        if (onColour) text.classList.add(`board-minimap-label-${onColour}`);
      }
      text.textContent = shown;
      svg.appendChild(text);
      kept.push(box);
    }
  }
  return svg;
}

//: How many things are on a board, as the sentence a person reads. On a map
//: the objects *are* the nodes, so calling them "images", which every surface
//: did before maps existed, is simply the wrong noun for the only thing on
//: the board.
function mapCountLabel(board) {
  const isMap = board?.type === "map";
  const nodes = board?.node_count || 0;
  const sketches = board?.sketch_count || 0;
  const objects = board?.object_count || 0;
  const parts = [];
  if (nodes) parts.push(`${nodes} card${nodes === 1 ? "" : "s"}`);
  if (sketches) parts.push(`${sketches} sketch${sketches === 1 ? "" : "es"}`);
  if (objects) {
    //: **"items", not "images", on a board.** `object_count` is
    //: `count(WhiteboardObject)` with no filter on `kind`
    //: (`routes_whiteboard.py`, the `/whiteboard/boards` listing), and a
    //: board's objects are text, images, notes, documents, files and links.
    //: A board seeded with five text boxes read "5 images" in the dashboard
    //: widget and in the Library, which is the same class of wrong noun §5
    //: item 12 fixed for a map's nodes and missed here.
    parts.push(isMap
      ? `${objects} node${objects === 1 ? "" : "s"}`
      : `${objects} item${objects === 1 ? "" : "s"}`);
  }
  return parts.length ? parts.join(" · ") : isMap ? "Empty map" : "Empty board";
}

//: **A map as a chip**: its icon, its title and how many nodes it holds, and
//: pressing it opens the map. The one control every surface uses to refer to a
//: map in passing: a note body, the timeline, a dashboard row, the chat
//: transcript.
//:
//: A `<button>`, not a link: opening a map is a tab switch plus a board load
//: (`openWhiteboardBoard` does both), not a navigation this app has a URL for.
//: `.map-chip` sits on `.chip`, the app's own recipe, so it inherits the chip
//: height, radius and hover state rather than inventing a fourth pill shape.
//:
//: `board` may be as little as `{id, title}`, the chat transcript has an id
//: and a label and nothing else. The count line is simply omitted then, rather
//: than the chip refusing to draw or claiming "0 nodes".
//:
//: **`interactive: false` draws the same chip as a `<span>` with no handler**,
//: for the one context where the thing around it is already the control: the
//: dashboard's board rows are `role="button"` list items, and a `<button>`
//: inside one is a nested interactive control, two tab stops that do the same
//: thing, which is worse for a keyboard user than no chip at all. The chip is
//: identical to look at either way; only the element and the listener differ.
function mapChip(board, { onOpen = null, count = true, interactive = true } = {}) {
  const chip = document.createElement(interactive ? "button" : "span");
  if (interactive) chip.type = "button";
  chip.className = "chip map-chip";
  const isMap = board?.type !== "board";
  const title = board?.title || "Untitled map";
  setLabel(chip, `${isMap ? "ph:tree-structure" : "ph:squares-four"} ${title}`);
  const known = board && (board.object_count != null || board.node_count != null);
  if (count && known) {
    const meta = document.createElement("span");
    meta.className = "map-chip-count";
    meta.textContent = mapCountLabel(board);
    chip.appendChild(meta);
  }
  chip.title = known
    ? `${title}: ${mapCountLabel(board)}${interactive ? ". Press to open it." : ""}`
    : interactive
      ? `Open “${title}”`
      : title;
  if (interactive) {
    chip.addEventListener("click", (event) => {
      event.stopPropagation();
      if (onOpen) onOpen(board);
      else if (typeof openWhiteboardBoard === "function") openWhiteboardBoard(board?.id ?? null);
    });
  }
  return chip;
}

//: Every board the notebook has, by id, for the surfaces that are handed an
//: *entry* id and have to find out whether it is a board.
//:
//: One shared cache rather than a fetch per surface: the timeline paints a
//: hundred dots and the note list paints a chip per wiki link, and neither can
//: afford a request each. `apiJson`'s own `cacheMs` does the de-duplication: 
//: this only holds the id→row index built from it, which is the part that
//: would otherwise be rebuilt per dot.
let mapBoardIndexCache = null;
//: When that cache was last filled. It used to be `apiJson`'s own `cacheMs`
//: doing this, and that stopped working when `GET /whiteboard/boards` became
//: paged: `apiPagedList` walks pages through `api`, which has no read cache,
//: and one first page is not an index of every board anyway. So the eight
//: seconds moved here, onto the thing it was really protecting, which is the
//: index rather than the response.
let mapBoardIndexAt = 0;
const MAP_BOARD_INDEX_MS = 8000;
//: The walk in flight, if there is one. The eight seconds above only help a
//: caller that arrives after an earlier one has *finished*, and at boot they
//: do not arrive like that: the note list and the agent panel both ask within
//: the same tick, both find an empty cache, and both walk every page of
//: `/whiteboard/boards` (WORLD_CLASS_PLAN A2, measured as the same request
//: twice). A second caller joins the first walk instead.
let mapBoardIndexWalk = null;

//: `force` skips the eight seconds. One caller passes it: a note's board
//: object that could not find its board (`boardEmbedElement`). Eight seconds
//: is the right answer for a chip that is merely decorating a row, and the
//: wrong one for a card that is about to tell somebody their board has been
//: deleted: a board made a moment ago is missing from an index built before
//: it existed, and nothing else ever rebuilds that index (every other caller
//: returns early while it is set). A walk already in flight is still joined
//: rather than doubled.
function loadMapBoardIndex(force = false) {
  if (!force && mapBoardIndexCache && Date.now() - mapBoardIndexAt < MAP_BOARD_INDEX_MS) {
    return Promise.resolve(mapBoardIndexCache);
  }
  if (mapBoardIndexWalk) return mapBoardIndexWalk;
  mapBoardIndexWalk = apiPagedList("/whiteboard/boards", 200, { silent: true })
    .catch(() => null)
    .then((rows) => {
      //: The walk failed. The stale index is better than none, and an empty
      //: Map keeps `mapBoardById` and friends synchronous for their callers.
      //: Deliberately not cached as an answer: `mapBoardIndexAt` is untouched,
      //: so the next caller tries again rather than waiting out the eight
      //: seconds on a failure.
      if (!rows) return mapBoardIndexCache || new Map();
      mapBoardIndexAt = Date.now();
      mapBoardIndexCache = new Map(rows.filter((b) => b.id != null).map((b) => [b.id, b]));
      return mapBoardIndexCache;
    })
    .finally(() => {
      mapBoardIndexWalk = null;
    });
  return mapBoardIndexWalk;
}

//: The board behind an entry id, or null, synchronous, because the callers
//: are inside a render loop. Returns null until `loadMapBoardIndex` has run
//: once, which is a surface that has not asked for boards yet rather than an
//: error: it degrades to the plain note rendering it had before.
function mapBoardById(id) {
  return mapBoardIndexCache?.get(id) || null;
}

//: The board whose title is `needle` (already lower-cased), or null.
//:
//: One matcher for the `[[wiki]]` resolver and the editor's `@` picker, so
//: the link the picker inserts and the link the renderer resolves cannot
//: drift apart. A board's own row carries `title` with the `# ` already
//: stripped; the raw `# My map` form is matched too, because that is what
//: the picker inserted before it learned better and those links are in real
//: notes now.
function mapBoardTitled(needle) {
  if (!needle || !mapBoardIndexCache) return null;
  for (const board of mapBoardIndexCache.values()) {
    const title = String(board.title || "").trim().toLowerCase();
    if (!title) continue;
    if (title === needle || `# ${title}` === needle) return board;
  }
  return null;
}

//: Every board the notebook has, newest-looking order preserved from
//: `/whiteboard/boards`, the editor's `@`/`[[` picker's own source. Empty
//: until `loadMapBoardIndex` has run once, which is the same "a surface that
//: has not asked for boards yet" degradation `mapBoardById` documents.
function mapBoardRows() {
  return mapBoardIndexCache ? [...mapBoardIndexCache.values()] : [];
}

//: ---------------------------------------------------------------------------
//: **Shared by surfaces that are not loaded yet** (WORLD_CLASS_PLAN A1). Five
//: files now arrive on first use rather than at boot (`ensureModule` below),
//: and a `const` in one of them is a *lexical* global: a bare read of it from
//: here throws ReferenceError until that file has run, which no `typeof`
//: guard and no `window.` stub can paper over. Everything in this block was
//: read by app.js's own boot path (the note list) or by `editor.js`, both of
//: which run with no tab open at all, so each one moved here, to the file
//: that is always present, rather than pinning its whole module to boot.
//:
//: None of it is graph, library or document logic: the clamp is the note
//: list's, the size formatter is read by four files, and the page sizes are
//: the paging contract the backend publishes. They were in those files only
//: because that is where the app.js split happened to leave them.

// How much of a linked note's text a link chip shows. Long enough to know
// which note it is, short enough that four of them are a row rather than a
// paragraph: a chip is a signpost, and a signpost with a sentence on it is
// not a signpost. The full text is the chip's tooltip.
//: Raised from 28 (the owner, 2026-09-21: "note text gets cut off at like
//: 2/3 through the note width, I think it should have a bit more width"). A
//: character count rather than a width is what made it look arbitrary: the
//: chip was cut at the same word whether it sat in a 400px column or across
//: a 1900px card, so on a wide card it stopped two thirds of the way along a
//: row that had room to spare. The chips wrap, so a longer label costs a row
//: at worst, never an overflow.
const LINK_CHIP_CHARS = 48;

// How much of a note the list shows before clamping it. Roughly ten lines at
// a comfortable reading width, long enough that a normal note is never
// clipped, short enough that one essay can't take the whole screen.
const LONG_NOTE_CHARS = 500;
const LONG_NOTE_LINES = 10;
// Which notes the user has opened out, for this session. Not persisted: it is
// a reading position, not a preference.
const expandedNotes = new Set();

// The character count decides which notes *might* be too tall; only a
// measurement can say whether one actually is, because that depends on the
// width it is rendered at. So the clamp goes on optimistically and this takes
// it back off wherever the note fits after all, a "Show more" on a note that
// is fully visible is worse than no clamping at all.
//
// It bails when the list is off screen: this renders inside a `display: none`
// sub-tab, where every measurement is 0. `showNotesSection` calls it again on
// the way in, which is the moment the numbers become real.
function settleNoteClamps() {
  const list = $("entry-list");
  if (!list || !list.offsetParent) return;
  for (const content of list.querySelectorAll(".entry-content.entry-clamped")) {
    const toggle = content.parentElement?.querySelector(".entry-more");
    if (content.scrollHeight <= content.clientHeight + 4) {
      content.classList.remove("entry-clamped");
      toggle?.remove();
    }
  }
}


//: **The facts about a file, as facts.** Asked for directly with the Files
//: sub-tab redesign: "the card format is difficult with files as they can be
//: quite long and large, a single image or ocr caption doesnt fit them. there
//: should be details on the name, a generated description that cna happen,
//: file details such as the type, size, topic/category, linked notes and
//: other features."
//:
//: A tile could show a thumbnail, a name and a caption; everything else a
//: person actually brings to a file list, how big is it, how many pages,
//: when did it arrive, has it been read, was either absent or buried. These
//: are the ones the row can state in one line.
function formatFileSize(bytes) {
  const size = Number(bytes) || 0;
  if (size <= 0) return ""; // unknown, or the file is gone, say nothing
  if (size < 1024) return `${size} B`;
  const units = ["KB", "MB", "GB"];
  let value = size / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  // One decimal below 10 (2.4 MB reads better than 2 MB), none above it.
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}


//: The page size each of those lists is asked for, matching the server's own
//: default (routes_documents.DOCUMENTS_PAGE_SIZE and routes_files
//: .MEDIA_PAGE_SIZE): one request for any realistic notebook, more only when
//: there genuinely is more.
const DOCUMENTS_PAGE_SIZE = 200;
const MEDIA_PAGE_SIZE = 200;

//: **The star that says a note is a favourite, in both states.**
//:
//: Reported with a screenshot: the active one rendered as an **empty circle**
//:, no glyph at all. The cause is worth stating because it is a whole class
//: of bug, not one icon: the off state asked for `ph:star` and the on state
//: for `ph:star-slash`, and **`star-slash` is not in this app's vendored
//: Phosphor subset.** A missing glyph in an icon font is not an error, the
//: character simply has nothing to draw, so it fails silently, looks like a
//: styling problem, and nothing in the suite could see it. One icon name out
//: of 176 was wrong and there was no way to know. `tests/test_icon_names.py`
//: now checks every one against the font.
//:
//: The fix is also the better design. A slashed star means "remove", which is
//: a *verb* on a control whose job is to show *state*; every app the user has
//: ever used shows a favourite as a star that has changed colour. So both
//: states draw `ph:star` and the difference is `is-favourite`, plus
//: `aria-pressed`, which is what makes the state readable without the colour.
function favouriteButton(entry) {
  //: `.favourite-btn` names the control for the phone's swipe (`initRowSwipe`),
  //: which presses it rather than carrying a second copy of the toggle.
  const button = smallButton(
    "ph:star",
    entry.pinned ? "Remove from Favourites" : "Add to Favourites (also floats it to the top)",
    async () => {
      const was = Boolean(entry.pinned);
      await api(`/entries/${entry.id}`, {
        method: "PUT",
        body: JSON.stringify({ pinned: !was }),
      });
      //: On the global stack, because a mis-click here is silent: the star
      //: changes shape and the note moves to the top of the list, and there
      //: was nothing that put it back. Reported as the undo stack being
      //: "significantly outdated and dont register a lot of actions".
      pushEntryPutUndo(
        entry.id,
        was ? "Removed a favourite" : "Added a favourite",
        { pinned: was },
        { pinned: !was }
      );
      await loadEntries();
    }
  );
  button.classList.add("favourite-btn");
  button.classList.toggle("is-favourite", Boolean(entry.pinned));
  button.setAttribute("aria-pressed", String(Boolean(entry.pinned)));
  return button;
}

// One entry card, shared by the browse list, chat results, and the bin.
// "2 hours ago" style, with the exact date kept for the hover tooltip
// (Wave J). Anything older than a week just shows the date.

// The row menu's "Move to bin", as one function, because the phone's swipe
// (`initRowSwipe`) is the same action from a different gesture and must not
// carry a second copy of it. Instant + one-click Undo, soft delete
// underneath (Wave J). Also on the global undo stack (status bar / Ctrl+Z),
// so it survives past the toast's own timeout.
async function binNoteWithUndo(entry) {
  await api(`/entries/${entry.id}`, { method: "DELETE" });
  await loadEntries();
  const restoreIt = async () => {
    await api(`/entries/${entry.id}/restore`, { method: "POST" });
    await loadEntries();
  };
  const binIt = async () => {
    await api(`/entries/${entry.id}`, { method: "DELETE" });
    await loadEntries();
  };
  const action = pushUndo("Moved a note to the bin", restoreIt, binIt);
  toastAction("Moved to the recycle bin.", "Undo", async () => {
    settleUndoFromToast(action);
    await restoreIt();
    toast("Note restored.");
  });
}

function entryItem(entry, options = {}) {
  const li = document.createElement("li");
  li.dataset.id = entry.id;
  if (entry.id === linkSource) li.classList.add("link-source");
  // The phone's swipe underlays read their words from the row (`initRowSwipe`,
  // 10-responsive.css): what a swipe right and a swipe left will do to it.
  if (entry.pinned) li.classList.add("is-favourite-row");
  if (!entry.is_board && !entry.is_draft && options.actions) {
    li.dataset.swipeRight = entry.pinned ? "Unfavourite" : "Favourite";
    li.dataset.swipeLeft = "Bin";
  }
  // An opened-out row renders as the full card, see `expandedRows`. The
  // class does nothing in card view, where every note is already this shape.
  if (expandedRows.has(entry.id)) li.classList.add("row-expanded");

  if (editingId === entry.id && options.actions) {
    renderEditForm(li, entry);
    return li;
  }

  // The row's own open/close control. Rendered always but only *shown* in
  // rows view (CSS), rather than branched on `notesViewMode` here: the
  // view can change without a re-render, and a control that exists only in
  // the mode it was rendered in would go missing on the toggle.
  //
  // A direct child of `<li>` now, not of `.entry-meta`, direct instruction:
  // *"move the note collapse button on the compact rows view to the
  // permanent left, make sure the button keeps its position even when
  // expanded."* `.entry-meta` sits in the row's third grid column while
  // collapsed (title/content/meta side by side) and becomes a bottom-of-card
  // block once expanded (`li.row-expanded` drops the grid for `block`), so a
  // button living inside it visibly jumped from the row's right edge to the
  // card's bottom on every expand. Pinned absolutely to the card's own
  // top-left corner instead (`.row-expand` in 01-forms-settings.css), which
  // neither of those two layouts moves, it is positioned against `<li>`
  // itself, not against whichever of its children currently holds it.
  {
    const open = expandedRows.has(entry.id);
    const expand = document.createElement("button");
    expand.type = "button";
    expand.className = "ghost small icon-only row-expand";
    setLabel(expand, open ? "ph:caret-up" : "ph:caret-down");
    expand.title = open ? "Show less of this note" : "Show the whole note here";
    expand.setAttribute("aria-label", expand.title);
    expand.setAttribute("aria-expanded", String(open));
    expand.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleRowExpanded(entry.id);
    });
    li.appendChild(expand);
  }

  // Click anywhere on a collapsed/expanded row's own body to toggle it,
  // same as the button, direct instruction: "if the user clicks on the
  // main body of the note and not an element on the collapsed row view, it
  // will expand or collapse without the user having to click the button."
  // Scoped to rows view only (`.entry-list.is-rows`, checked live rather
  // than cached: the view can change after this card was built) and
  // skipped whenever the click landed on something that already has its
  // own job: a link, a button, an image, selectable text, the checkbox.
  // `closest("a, button, input, .chip, img")` is the same "don't swallow a
  // click meant for something else" guard the rest of this file already
  // uses for row-level handlers.
  li.addEventListener("click", (event) => {
    if (event.target.closest("a, button, input, textarea, .chip, img, .unlink")) return;
    if (window.getSelection()?.toString()) return; // a text selection, not a click
    // **In select mode the whole card is the checkbox.** Direct instruction:
    // "when I have selected on the 'select' button in the notes tab, I want
    // to be able to click on the whole body of the note to select it, not
    // the select radiobutton in the corner." Asking someone to hit a 16px
    // box in the corner of a card they are already pointing at is the
    // slowest possible way to tick twenty notes, and every list that has a
    // batch mode (Finder, Gmail, Photos) lets the row itself carry it.
    //
    // Checked before the rows-view guard below, and in every view: the
    // expand-on-click behaviour is a *rows* affordance, but selecting is
    // what the card means while this mode is on, so it takes precedence
    // wherever it is shown.
    if (selectMode && options.actions) {
      const check = li.querySelector(".select-check");
      if (check) {
        check.checked = !check.checked;
        // `change` does not fire for a programmatic `.checked`, and the
        // checkbox's own listener is the single place that owns the set.
        check.dispatchEvent(new Event("change", { bubbles: true }));
        li.classList.toggle("is-selected", check.checked);
      }
      return;
    }
    if (!li.closest(".entry-list.is-rows")) return;
    toggleRowExpanded(entry.id);
  });

  // Batch select mode (Wave M): a checkbox leads each card.
  if (options.actions && selectMode) {
    const check = document.createElement("input");
    check.type = "checkbox";
    check.className = "select-check";
    check.checked = selectedIds.has(entry.id);
    check.setAttribute("aria-label", "Select this note");
    check.addEventListener("change", () => {
      if (check.checked) selectedIds.add(entry.id);
      else selectedIds.delete(entry.id);
      // The card carries the selected look, so it has to follow the box
      // whichever of the two was actually clicked.
      li.classList.toggle("is-selected", check.checked);
      updateBatchCount();
    });
    li.appendChild(check);
    li.classList.add("selectable");
    li.classList.toggle("is-selected", check.checked);
  }

  // A note's own leading `# Heading` becomes its title (asked for directly).
  // Not a separate field to edit, the body below is shown with that line
  // taken out, so the title isn't just the same text shown twice.
  if (entry.title) {
    // A <p>, not <h3>, `.card h3` is this app's small-caps *section label*
    // treatment (DESIGN.md's hierarchy), which is the wrong voice for a
    // note's own title: it read as a muted, uppercase eyebrow instead of
    // the prominent heading a title should be. `.entry-title` below defines
    // its own look rather than inheriting one built for a different job.
    const titleEl = document.createElement("p");
    titleEl.className = "entry-title";
    titleEl.textContent = entry.title;
    li.appendChild(titleEl);
  }

  const content = document.createElement("p");
  content.className = "entry-content";
  // One long note used to push everything else off the screen, so the list
  // stopped being a list. Anything past this is clamped with a "Show more".
  //
  // The trigger is the character count, not a measured height: this list
  // renders inside a `display: none` sub-tab, where every measurement comes
  // back 0: the trap that has caught four separate features here already.
  const isLong =
    entry.content.length > LONG_NOTE_CHARS ||
    entry.content.split("\n").length > LONG_NOTE_LINES;
  if (isLong && !expandedNotes.has(entry.id)) content.classList.add("entry-clamped");
  // Mark the matched words while filtering, so it's obvious WHY a note is in
  // the list. Built with createElement/textContent rather than innerHTML, 
  // note text is user content and must never be parsed as markup.
  renderNoteText(
    content,
    entry.title ? bodyWithoutTitleLine(entry.content) : entry.content,
    searchHighlightTerms()
  );
  content.addEventListener("remove-inline-image", async (e) => {
    e.stopPropagation();
    if (!(await confirmDialog("Remove this image from the note?"))) return;
    entry.content = entry.content.replace(e.detail.originalText, "").replace(/\n{3,}/g, "\n\n").trim();
    try {
      await apiJson(`/entries/${entry.id}`, { method: "PUT", body: JSON.stringify({ content: entry.content }) });
      await loadEntries();
      flashEntry(entry.id);
      toast("Image removed.");
    } catch(err) {
      toast(err.message || "Failed to remove image", true);
    }
  });
  li.appendChild(content);
  if (isLong) {
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "entry-more";
    const label = () =>
      expandedNotes.has(entry.id) ? "Show less" : "Show more";
    toggle.textContent = label();
    toggle.addEventListener("click", () => {
      if (expandedNotes.has(entry.id)) expandedNotes.delete(entry.id);
      else expandedNotes.add(entry.id);
      content.classList.toggle("entry-clamped", !expandedNotes.has(entry.id));
      toggle.textContent = label();
    });
    li.appendChild(toggle);
    // **Then check whether it was actually needed.** Reported: "a show
    // more/less button appears when it isnt needed sometimes", and
    // "notes shouldnt be truncated".
    //
    // `isLong` above is a character and line count, not a measurement, and
    // the comment there explains why: this list renders inside a
    // `display: none` sub-tab where every measured height comes back 0, 
    // the trap that has caught four features in this codebase. But a count
    // is a guess, and it is wrong in both directions: a note of 700 short
    // words wrapped narrow really is long, while 700 characters of one
    // paragraph in a wide card is three lines that fit with room to spare,
    // and gets a "Show more" that expands nothing.
    //
    // So: guess first so the markup is right when it cannot be measured,
    // then measure on the next frame and take the control back off when the
    // text was never clipped. `requestAnimationFrame` is after layout, and
    // `clientHeight` of 0 (still hidden) fails the comparison and changes
    // nothing: which is exactly the conservative behaviour that trap
    // wants.
    requestAnimationFrame(() => {
      if (!content.isConnected || expandedNotes.has(entry.id)) return;
      if (content.clientHeight > 0 && content.scrollHeight <= content.clientHeight + 2) {
        content.classList.remove("entry-clamped");
        toggle.remove();
      }
    });
  }

  const meta = document.createElement("div");
  //: `note-meta` scopes the one-line facts styling (08-consistency.css) to a
  //: note card: `.entry-meta` alone is also the chip row of the skills, the
  //: personas and the extras in Settings, which that styling flattened.
  meta.className = "entry-meta note-meta";
  // A note saved with filing deferred is in its holding category, not its
  // real one, and saying "Uncategorised" for the second or two before the
  // background pass lands reads as the AI having failed. Say what is
  // actually happening instead.
  if (entry.filing_state === "pending") {
    const filing = chip("ph:circle-notch Filing…", "filing");
    filing.title = "Atlas is deciding where this note goes. It's already saved.";
    meta.appendChild(filing);
  } else {
    //: `category` names the chip for the meta line's own styles (08-
    //: consistency.css, "one line of facts"): before it had a class, the
    //: category rule was "a chip with none of these variants", which caught
    //: every variant added after it and drew "No tags yet" and "Linked by 5
    //: notes" as accent pills too.
    const categoryEl = chip(entry.category, "category");
    categoryEl.style.setProperty("--category-dot", categoryDotColour(entry.category));
    meta.appendChild(categoryEl);
  }
  //: `hashtag` marks a real tag: `tag` alone is also the quiet look the
  //: documents, the source and the space borrow, and only a tag gets the #.
  for (const tag of entry.tags) meta.appendChild(chip(tag, "tag hashtag"));
  //: **A note with no tags says so, where the tags would be** (INBOX 162:
  //: "notes with no tags or other things arent highlighted"). Only on a real
  //: note in a list that offers actions: a board is not filed by tag and a
  //: draft has not been filed at all. The chip is the fix as well as the
  //: flag: it opens the edit form with the cursor in the tags field, where
  //: the AI's suggestions appear as you type, so the person is one click
  //: from tagged rather than being told and left there.
  if (!entry.tags.length && !entry.is_board && !entry.is_draft
      && (options.actions || options.facts)) {
    //: On a read-only row the flag is a **fact and nothing more**: the
    //: handler below opens the edit form in the note list, which is not the
    //: surface a search result is being read on, so wiring it here would be a
    //: chip that looks pressable and does nothing visible (INBOX 297).
    const untagged = options.actions
      ? chip("ph:tag Add tags", "untagged", (event) => {
        event.stopPropagation();
        editingId = entry.id;
        focusTagsAfterRender = entry.id;
        renderEntries();
        requestAnimationFrame(() => scrollEditingEntryIntoView(entry.id));
      })
      : chip("ph:tag No tags yet", "untagged");
    untagged.title = options.actions
      ? "Add tags to this note"
      : "This note has no tags yet";
    meta.appendChild(untagged);
    //: **And the offer to have them written for you, in the one place a
    //: person is thinking about tags** (INBOX 292, the owner: "half the time
    //: when there are no tags on a note, i want the ai to generate them for
    //: me ... i want it to be more evident that it is an option and to be
    //: offered to the user"). The action already existed, one row deep in
    //: this note's menu under a name that did not mention tags, which is
    //: exactly the kind of thing nobody finds.
    //:
    //: Rendered rather than gated, because a chip is a `<span role="button">`
    //: and `syncModelGatedControls` closes controls by setting `disabled`,
    //: which does nothing to a span. An offer that cannot be honoured is
    //: worse than no offer, so with no model answering there is simply the
    //: flag above and the manual route it already opens.
    //: `options.actions` again: the offer is a model call, which is an
    //: action, so it stays off a read-only row even though the flag above it
    //: is now drawn on one.
    if (options.actions && (!modelStatus || modelStatus.ollama_running !== false)) {
      const askAtlas = chip("ph:sparkle Tag with Atlas", "untagged-ai", (event) => {
        event.stopPropagation();
        reevaluateEntry(entry);
      });
      askAtlas.title = "Atlas reads the note and suggests tags for you to approve";
      meta.appendChild(askAtlas);
    }
  }
  //: **What points at this note, on the card** (INBOX 246's third gap).
  //: Only when the counts for this page have landed; `ensureCardCounts`
  //: patches the chip in afterwards for cards rendered before they had.
  const refs = referenceCountChip(entry, options);
  if (refs) meta.appendChild(refs);
  //: **And what it made you promise to do** (INBOX 309). Same cache, same
  //: patch-in, same line: a reminder that came out of this note is a fact
  //: about the note in exactly the way "on 1 board" is.
  const alarms = reminderCountChip(entry, options);
  if (alarms) meta.appendChild(alarms);

  // "AI 0%: check this" is a warning about the AI's filing, and it only makes
  // sense when the AI actually did some. On a note you filed yourself, or one
  // saved while no AI was running, it accused a perfectly good note of being
  // suspect: which is most notes if you don't run Ollama.
  const aiDidFile = entry.ai_confidence > 0 && !entry.user_filed;
  // Plain-language explanation on hover, "confidence" is jargon otherwise,
  // and the number alone doesn't say what it's confident *about*.
  const confidenceHint = "How sure Atlas was when it picked this note's category.";
  //: **Confident filing is a fact about the category, not a line item.**
  //: A score above the review line asks nothing of anyone, and as its own
  //: pill it was one more badge on every card (owner: "a better ui/ux and
  //: more modern and professional way to ... display all the metadata,
  //: links, badges"). It rides on the category's tooltip instead; the low
  //: score keeps its own mark, because that one is a request to check.
  const categoryChip = meta.querySelector(".chip.category");
  if (aiDidFile && categoryChip && entry.ai_confidence >= REVIEW_THRESHOLD) {
    categoryChip.title = `Filed by Atlas, ${entry.ai_confidence}% sure`;
  }
  const confidenceChip = aiDidFile && entry.ai_confidence < REVIEW_THRESHOLD
    ? // Low confidence from a real attempt, worth a human look (Phase 3).
      chip(`AI ${entry.ai_confidence}%: check this`, "review")
    : null;
  if (confidenceChip) confidenceChip.title = confidenceHint;
  // Flash the badge once when this note's confidence just changed, so the
  // update after a re-evaluation is actually noticeable (user request).
  //: The category flashes when the score went to its tooltip, since the
  //: category is what a re-evaluation actually answered.
  const flashed = confidenceChip || categoryChip;
  if (flashed && entry.id === flashConfidenceId) {
    flashed.classList.add("badge-flash");
    flashConfidenceId = null;
  }
  if (confidenceChip) meta.appendChild(confidenceChip);

  // The documents this note feeds. Notes and documents are separate things
  // on purpose; this is the one place that says they are about the same one.
  for (const doc of entry.documents || []) {
    const mark = chip(`ph:file-text ${doc.title}`, "tag", () => openDocumentFromNote(doc.id));
    mark.title = `Open “${doc.title}”`;
    if (options.actions) {
      // Detach from the note's side too. The document editor has had this
      // since the link existed; from here it took going and finding the
      // document first, which is the wrong way round when the note is what
      // you are already looking at.
      const unlink = document.createElement("span");
      unlink.className = "unlink";
      setLabel(unlink, "ph:x"); // raw "×" glyph vs Phosphor icon font mismatch mis-centers the icon
      unlink.title = `Detach from “${doc.title}”: the note stays`;
      unlink.addEventListener("click", async (event) => {
        event.stopPropagation(); // the chip itself opens the document
        await api(`/documents/${doc.id}/notes/${entry.id}`, { method: "DELETE" });
        await loadEntries();
        toast(`Detached from “${doc.title}”.`);
      });
      makeUnlinkAccessible(unlink);
      mark.appendChild(unlink);
    }
    meta.appendChild(mark);
  }

  // Where a web-reader clipping came from (BACKLOG §65's "source as
  // metadata"). Opens the real page, the note's own body already has the
  // same link inline, this is the at-a-glance version.
  if (entry.source_url) {
    const sourceChip = chip(
      `ph:globe ${entry.source_title || entry.source_url}`,
      "tag",
      () => window.open(entry.source_url, "_blank", "noopener,noreferrer")
    );
    sourceChip.title = `Open the source: ${entry.source_url}`;
    meta.appendChild(sourceChip);
  }

  // What this note's own "tomorrow" meant on the day it was written (§10A).
  // A chip rather than a mark inside the text: `renderNoteText` already
  // layers wiki links, inline markdown and filter highlighting through each
  // other, and a fourth pass over the same string is where that breaks.
  //: **The dates a note mentions, said as mentions** (owner: the meta row is
  //: "a bit hard to read, especially in regards to the date parsing"). Two
  //: calendar chips beside "3 days ago" read as three dates of the same kind;
  //: they are different facts: when the note was written is at the card's
  //: corner, and the days its words point at are one labelled item here.
  const mentioned = [];
  for (const when of entry.dates || []) {
    const day = new Date(`${when.at}T00:00:00`);
    const label =
      when.precision === "day"
        ? day.toLocaleDateString(undefined, { day: "numeric", month: "short" })
        : `${when.precision} of ${day.toLocaleDateString(undefined, { day: "numeric", month: "short" })}`;
    //: The date alone, the phrase on hover (owner, with a screenshot of
    //: "Tonight → 21 Sept on Friday → 25 Sept" in one meta line: "clean up
    //: the notes metadata and badges a bit more"). What a reader scans for is
    //: the day; the words the note used for it are the explanation.
    mentioned.push({
      label,
      title: `“${when.phrase}” meant ${day.toLocaleDateString(undefined, {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
      })}`,
    });
  }
  if (mentioned.length) {
    const shown = mentioned.slice(0, 3).map((m) => m.label).join(", ");
    const more = mentioned.length > 3 ? ` +${mentioned.length - 3}` : "";
    const mark = chip(`ph:calendar-blank Mentions ${shown}${more}`, "when");
    mark.title = `${mentioned.map((m) => m.title).join("; ")}. Worked out from the day this note was written.`;
    meta.appendChild(mark);
  }

  //: **Which space this note is actually filed in (INBOX 1a/38).** "Notes
  //: from a deleted space appear in All spaces" turned out to be
  //: unanswerable without this: there was no way to tell a survivor's real
  //: space apart from a note that always lived in Default Space, so a
  //: report and a non-bug looked identical. Shown whenever the picker at
  //: the top of the tab does not already say it: every card while "All
  //: spaces" is selected, or a card whose own space differs from the one
  //: picked. `spacesCache` is the same list the switcher menu reads, so a
  //: name/icon here can never disagree with the one shown there.
  //: **`spacesCache.length` is not decoration: an empty cache means "not
  //: loaded yet", not "there are no spaces".** `loadSpaces()` fills it from
  //: `GET /spaces` after boot, and the note list renders before that lands, so
  //: without this guard every card drew the chip below with the name it falls
  //: back to and said, of an ordinary note in the Default Space, that it was
  //: "filed in a space that no longer exists". Caught in a README screenshot,
  //: where fifty-seven cards said it at once. Saying nothing until the answer
  //: is known is the honest state; `loadSpaces` re-renders the list once it
  //: has it (see its own comment), so the chip appears a moment later rather
  //: than never.
  //: Only when there is more than one space: with one, "Default Space" on
  //: every note said nothing (owner's screenshots).
  if (entry.workspace_id && spacesCache.length > 1) {
    const active = activeSpaceId();
    if (active === SPACE_ALL || entry.workspace_id !== active) {
      const space = spacesCache.find((s) => s.id === entry.workspace_id);
      // Stored as "ph-house" (a full class name, see the switcher's own
      // `iconEl.className`), not the "ph:house" `setLabel` shorthand
      // expects; stripping the prefix once here is cheaper than a second
      // icon convention.
      const iconName = (space?.icon || "ph-circles-four").replace(/^ph-/, "");
      const spaceName = space ? space.name : "a space that no longer exists";
      const spaceChip = chip(`ph:${iconName} ${spaceName}`, "tag", () =>
        setActiveSpace(entry.workspace_id)
      );
      spaceChip.title = `Filed in ${spaceName}. Click to switch there.`;
      meta.appendChild(spaceChip);
    }
  }

  // While the AI is re-evaluating this note, show a live spinner chip so
  // it's obvious something is running on this specific card.
  if (entry.id === busyEntryId) {
    li.classList.add("entry-busy");
    const busy = chip("Atlas is reading…", "busy");
    busy.classList.add("chip-busy");
    // The shared spinner (ROADMAP Priority 0 #14) replaces this chip's own
    // one-off ring: .chip's own `gap` handles the spacing and vertical
    // centring, so no extra margin is needed.
    busy.prepend(spinnerEl());
    meta.appendChild(busy);
  }

  // The date and the action buttons share one right-aligned group. They used
  // to carry a `margin-left: auto` each, and two auto margins in a flex row
  // split the free space between them, which put the timestamp at a
  // different x on every card, depending on how wide its chips were.
  const metaEnd = document.createElement("span");
  metaEnd.className = "entry-meta-end";

  const date = document.createElement("span");
  date.className = "entry-date";
  const stamp = entry.created_at;
  date.textContent = relativeTime(stamp);
  date.title = `Written ${new Date(stamp).toLocaleString()}`; // exact on hover
  metaEnd.appendChild(date);
  meta.appendChild(metaEnd);

  if (options.actions) {
    // Wave L rework: two everyday actions stay visible; the rest live in
    // one ⋯ menu: the old row of nine icons was unscannable noise.
    const actions = document.createElement("span");
    actions.className = "entry-actions";
    actions.appendChild(
      //: **Star, not pin, and "Favourites", not "pinned".** The flag does two
      //: things: floats a note to the top of a list *and* collects it into
      //: the Favourites row in the sidebar, and it was named for only the
      //: first, so the app showed one concept under two names with two icons.
      //: Asked for: "make sure the favourites feature is actually integrated
      //: everywhere." The tooltip keeps the sort behaviour, since that is the
      //: half a star does not imply on its own.
      favouriteButton(entry)
    );
    actions.appendChild(
      smallButton("ph:clipboard", "Copy this note's text", async () => {
        if (await copyToClipboard(entry.content)) toast("Note copied.");
      })
    );
    actions.appendChild(
      smallButton("ph:pencil-simple", "Edit this entry", () => {
        editingId = entry.id;
        renderEntries();
        //: Scroll the edit form into view after renderEntries rebuilds the
        //: list, otherwise the list resets to the top and the editing note
        //: may be off screen. Nearest scroller, not scrollIntoView: DESIGN.md
        //: rule, scrollIntoView walks every ancestor to the page.
        requestAnimationFrame(() => scrollEditingEntryIntoView(entry.id));
      })
    );
    // Publishing already worked via the "draft" chip below (click it to
    // clear is_draft): reported again anyway ("needs to be...a button for
    // editing a draft and publishing"), so the chip alone wasn't read as an
    // action. An explicit, always-visible button next to Edit for drafts
    // only (a published note has nothing to publish) says the same thing
    // the chip's tooltip already did, just as a button instead of a tag.
    if (entry.is_draft) {
      actions.appendChild(
        smallButton("ph:check-circle", "Publish this draft as a proper note", async () => {
          try {
            await apiJson(`/entries/${entry.id}`, {
              method: "PUT",
              body: JSON.stringify({ is_draft: false }),
            });
            entry.is_draft = false;
            await loadEntries();
            toast("Published.");
          } catch (error) {
            toast(error.message || "Couldn't publish that draft.", true);
          }
        })
      );
    }
    actions.appendChild(entryOverflowMenu(entry));
    metaEnd.appendChild(actions);
  }
  if (entry.is_private) {
    // With the vault known to be locked (sign-in off, INBOX 426 aa), the
    // chip is the way in: it asks for the password and redraws the list.
    const lockedChip = vaultOpen === false
      ? chip("ph:lock-key unlock to read", "", () => unlockPrivateNotes())
      : chip("ph:lock private");
    meta.insertBefore(lockedChip, meta.firstChild);
  }
  if (entry.pinned) meta.insertBefore(chip("ph:star favourite"), meta.firstChild);
  // Set either by the text-selection popup's "Save as draft note" (not yet
  // looked at) or by the Writing Room's "Save as note" (drafted with the AI,
  // however much it was edited before saving), asked for directly: both
  // should be findable as drafts, not just marked in passing. The note stays
  // in its normal place in the list either way; the sidebar/Library Drafts
  // filter (renderSidebar, and the Library's Drafts chip: the old
  // `library-view-drafts` sub-tab it used to name is gone) is what makes them
  // findable as a group.
  //
  // **The chip is also how a draft becomes a real note**, and saying so is the
  // fix: it was labelled "draft" with the tooltip "click to clear the label",
  // which describes the mechanism and not the outcome, reported as "there is
  // no way to edit and finalise drafts, or to publish one as a proper note",
  // when publishing was one click away the whole time and simply unlabelled.
  if (entry.is_draft) {
    const draftChip = chip("ph:pencil-simple-line draft", "draft", async (event) => {
      event.stopPropagation();
      try {
        await apiJson(`/entries/${entry.id}`, {
          method: "PUT",
          body: JSON.stringify({ is_draft: false }),
        });
        entry.is_draft = false;
        await loadEntries();
      } catch (error) {
        toast(error.message || "Couldn't update that note.", true);
      }
    });
    draftChip.title =
      "This is a draft, click to publish it as a proper note. It stays where it is either way; only the Drafts filter changes.";
    meta.insertBefore(draftChip, meta.firstChild);
  }
  //: **Where an imported note came from.** A vault file has a name, the
  //: thing its `[[wiki links]]` use: and this app has no title field to put
  //: it in, so without this the name is invisible: the note shows its opening
  //: words like every other note, and nothing on screen says it is one of a
  //: thousand files someone imported from a folder.
  //:
  //: A chip rather than a heading written into the note: the importer must
  //: not rewrite the file it imported (see `_run_directory_import`, an
  //: earlier attempt did, and three tests caught it).
  if (entry.source_path) {
    const fileChip = chip(`ph:file-md ${entry.source_path.split("/").pop()}`, "source-path");
    fileChip.title = `Imported from ${entry.source_path}`;
    meta.appendChild(fileChip);
  }
  li.appendChild(meta);

  // "Why this result" is its own line under the note, not another chip in
  // the meta lane. Measured: in the compact rows view that lane is a
  // `fit-content(26rem)` track with `overflow-x: auto`, and a chip naming
  // two signals pushed the date and the actions strip out of the visible
  // box (57 to 84px past its right edge, `scratchpad/ui-sweeps/searchwhy.js`),
  // which is the exact crowding `.entry-meta`'s own comment says that track
  // was rebuilt to stop. A row of its own also says what it is: a reason for
  // this note being in *this* list, which appears with a query and goes with
  // it, rather than a permanent fact about the note like its category.
  const why = whyThisResultChip(entry);
  if (why) {
    const line = document.createElement("div");
    line.className = "entry-why";
    line.appendChild(why);
    li.appendChild(line);
  }

  // Attachments (Wave B; images become thumbnails in Wave M).
  if (entry.attachments.length > 0) {
    const fileRow = document.createElement("div");
    fileRow.className = "entry-links";
    for (const attachment of entry.attachments) {
      const removeButton = () => {
        const remove = document.createElement("span");
        remove.className = "unlink";
        setLabel(remove, "ph:x"); // raw "×" glyph vs Phosphor icon font mismatch mis-centers the icon
        remove.title = "Remove this file";
        remove.addEventListener("click", async (e) => {
          e.stopPropagation();
          if (!(await confirmDialog(`Remove ${attachment.filename}?`))) return;
          await api(`/files/${attachment.id}`, { method: "DELETE" });
          await loadEntries();
        });
        makeUnlinkAccessible(remove);
        return remove;
      };

      if (attachment.is_image) {
        // Show the picture itself, not a chip, click for full size.
        const wrap = document.createElement("span");
        wrap.className = "thumb-wrap";
        const img = document.createElement("img");
        img.className = "attachment-thumb";
        img.alt = attachment.filename;
        img.title = `${attachment.filename}: click to view full size`;
        attachmentObjectUrl(attachment)
          .then((url) => (img.src = url))
          .catch(() => wrap.remove());
        img.addEventListener("click", () => {
          const images = entry.attachments.filter((a) => a.is_image);
          openLightbox(
            images.map((a) => ({ filename: a.filename, getUrl: () => attachmentObjectUrl(a) })),
            images.indexOf(attachment)
          );
        });
        wrap.appendChild(img);
        if (options.actions) wrap.appendChild(removeButton());
        fileRow.appendChild(wrap);
      } else {
        // Opens the lightbox's document viewer, not a download, this used
        // to go straight to `downloadAttachment`, the one file surface that
        // never got the fileCard treatment §... unified everywhere else.
        // Reported directly: "I tried to open and view a file i attached to
        // a note, instead it just downloaded it." `mediaSrc()` already knows
        // how to token-gate a `/files/{id}` url the same way it does
        // `/media/{name}`; `show()` below is what learned to read one.
        const fileChip = chip(`ph:file-text ${attachment.filename}`, "link", () =>
          openLightbox(
            [{ filename: attachment.filename, getUrl: () => mediaSrc(`/files/${attachment.id}`) }],
            0
          )
        );
        fileChip.title = `${attachment.filename}: ${Math.max(1, Math.round(attachment.size / 1024))} KB`;
        const downloadBtn = document.createElement("span");
        downloadBtn.className = "unlink";
        setLabel(downloadBtn, "ph:download-simple");
        downloadBtn.title = `Save “${attachment.filename}” to disk`;
        downloadBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          downloadAttachment(attachment);
        });
        makeUnlinkAccessible(downloadBtn);
        fileChip.appendChild(downloadBtn);
        if (options.actions) fileChip.appendChild(removeButton());
        fileRow.appendChild(fileChip);
      }
    }
    // Before `meta` (the category/date/pin/actions footer), not after, 
    // reported directly: a sketch or attached image sat below the note's
    // own metadata row, sandwiched between the footer and whatever came
    // after it, rather than reading as part of the note's own content.
    li.insertBefore(fileRow, meta);
  }

  // Inline add-context / continue-thought forms (Wave B).
  if (options.actions && inlineAction && inlineAction.id === entry.id) {
    li.appendChild(renderInlineAction(entry));
  }

  if (entry.links.length > 0) {
    const linkRow = document.createElement("div");
    linkRow.className = "entry-links";
    for (const link of entry.links) {
      // **A link is navigation, not content.** Measured on the busiest screen
      // in the app: a card was 25px of its own note, 23px of metadata and 21px
      // of link chips: and the chips were the loudest thing on it, filled and
      // bold, each carrying the *whole first line of another note*. On a
      // well-linked note the links were wider than the note and read first,
      // which is §36B.3's "everything at equal weight" with the weights
      // actually inverted.
      //
      // Clipped to a glanceable length, quiet by default, with the full text
      // on hover for when the clip is not enough.
      //: An image in the other note's first line is markdown a chip cannot
      //: draw, and it showed as its raw `![...](...)` (owner's screenshot:
      //: "Gary The Moss Monster :D ![Gary The Moss Monst..."). The picture
      //: is dropped from the label; the words around it stay.
      //: The preview is clipped by the server, so an image can arrive cut
      //: in half (`![WallpaperEngineOverride_rand`, owner's screenshot) and
      //: a heading with its `#`: both go, whole or truncated.
      const label = (link.preview || "")
        .replace(/!\[[^\]]*(?:\](?:\([^)]*\)?)?)?/g, "")
        .replace(/^\s*#{1,6}\s+/, "")
        .replace(/\s{2,}/g, " ")
        .trim();
      const short = label.length > LINK_CHIP_CHARS
        ? `${label.slice(0, LINK_CHIP_CHARS - 1).trimEnd()}…`
        : label;
      // chip() sets plain textContent, right for a tag or category name but
      // not here: `link.preview` is a clip of the *other* note's own text,
      // which can carry the same **bold**/`code` a reader would expect to
      // see rendered, the way the note's own body already does.
      //
      // The click handler is built first and passed into chip()'s own
      // onClick param: every sibling chip() call site in this file does
      // the same and gets keyboard support (Enter/Space, role="button",
      // tabindex) for free. This one used to build a bare chip and attach a
      // plain `click` listener after the fact instead, which quietly opted
      // this specific "Go to note" chip out of keyboard operability while
      // every other chip stayed reachable (Web Interface Guidelines pass).
      const goToLinkedNote = (e) => {
        if (e.target.classList.contains("unlink")) return;
        flashEntry(link.entry_id);
      };
      const linkChip = chip("", "link", goToLinkedNote);
      // **Which way the link points.** Every link used to draw the same
      // bidirectional glyph, because the API merged both directions into one
      // list and never said which was which, so a note could show what it
      // was connected to and never whether it had reached out or been
      // reached for. Those are different facts, and telling them apart is
      // most of what a Connections list is for (asked for by way of
      // Kortex's own, which arrows every row).
      const outgoing = link.direction !== "in";
      linkChip.classList.add(outgoing ? "link-out" : "link-in");
      linkChip.appendChild(
        setLabel(
          document.createElement("span"),
          outgoing ? "ph:arrow-up-right" : "ph:arrow-down-left"
        )
      );
    linkChip.appendChild(document.createTextNode(" "));
      const linkPreview = document.createElement("span");
      renderInlineMarkdown(linkPreview, short, [], true);
      linkChip.appendChild(linkPreview);
      const reasonNote = link.reason
        ? link.reason_confidence != null
          ? `${link.reason} (${Math.round(link.reason_confidence * 100)}% confidence, deduced)`
          : link.reason
        : null;
      const wayRound = outgoing ? "This note links to" : "Links to this note";
      linkChip.title = reasonNote
        ? `${wayRound}: ${label}\nReason: ${reasonNote}`
        : `${wayRound}: ${label}`;
      //: **One chip and one menu per connection** (INBOX 319, the owner: "the
      //: buttons in these connections in notes need a redesign and look").
      //: Edit reason, clear reason and unlink were three round buttons of one
      //: size inside every chip, so three connections were nine identical
      //: circles with the labels reading as captions between them. They are
      //: the `kebabMenu` recipe now (DESIGN.md, standing order 11), which also
      //: gives the label the width the buttons took.
      const editReason = async () => {
        const next = await promptDialog("Why are these notes connected?", link.reason || "");
        if (!next) return;
        await api(`/entries/${entry.id}/links/${link.link_id}/reason`, {
          method: "PUT",
          body: JSON.stringify({ reason: next }),
        });
        await loadEntries();
      };
      const clearReason = async () => {
        await api(`/entries/${entry.id}/links/${link.link_id}/reason`, {
          method: "PUT",
          body: JSON.stringify({ reason: null }),
        });
        await loadEntries();
      };
      const unlink = async () => {
        const otherId = link.entry_id;
        const reason = link.reason;
        let liveLinkId = link.link_id;
        await api(`/entries/${entry.id}/links/${liveLinkId}`, { method: "DELETE" });
        await loadEntries();
        pushUndo(
          "Removed a link between notes",
          async () => {
            const updated = await apiJson(`/entries/${entry.id}/links`, {
              method: "POST",
              body: JSON.stringify({ target_id: otherId, reason }),
            });
            liveLinkId = updated.links.find((l) => l.entry_id === otherId)?.link_id ?? liveLinkId;
            await loadEntries();
          },
          async () => {
            await api(`/entries/${entry.id}/links/${liveLinkId}`, { method: "DELETE" });
            await loadEntries();
          }
        );
      };
      const connection = document.createElement("span");
      connection.className = "link-connection";
      connection.appendChild(linkChip);
      if (options.actions) {
        const items = [
          {
            label: link.reason ? "ph:pencil-simple Edit the reason" : "ph:pencil-simple Add a reason",
            title: link.reason ? "Edit why these notes are connected" : "Say why these notes are connected",
            run: editReason,
            group: "reason",
          },
        ];
        if (link.reason) {
          items.push({ label: "ph:eraser Clear the reason", title: "Keep the link, drop its reason", run: clearReason, group: "reason" });
        }
        items.push({ label: "ph:link-break Remove the link", title: "Remove this link (undoable)", run: unlink, group: "remove" });
        connection.appendChild(kebabMenu(items, `Actions for the link to ${label}`));
      }
      linkRow.appendChild(connection);
    }
    //: **Three links, then a count** (INBOX 424 q): a well-linked note drew
    //: every connection as a chip, measured at 109 controls on the Notes tab
    //: with 19 under 24px, and the chips outweighed the note. The first
    //: three show; the rest wait behind "+N more links", which opens them
    //: in place (and stays open for this render).
    const LINKS_SHOWN = 3;
    const connections = [...linkRow.children];
    if (connections.length > LINKS_SHOWN + 1) {
      for (const extra of connections.slice(LINKS_SHOWN)) extra.classList.add("entry-link-extra");
      const more = document.createElement("button");
      more.type = "button";
      more.className = "ghost small entry-links-more";
      const hidden = connections.length - LINKS_SHOWN;
      more.textContent = `+${hidden} more link${hidden === 1 ? "" : "s"}`;
      more.setAttribute("aria-expanded", "false");
      more.addEventListener("click", (event) => {
        event.stopPropagation();
        linkRow.classList.add("show-all");
        more.remove();
      });
      linkRow.appendChild(more);
    }
    li.appendChild(linkRow);
  }
  return li;
}

//: Take a note to the graph and put it in the middle, lit. The graph is its
//: own lazy bundle and lays itself out after the tab opens, so this waits for
//: the node to exist and to have a position rather than guessing a delay.
async function showNoteInGraph(id) {
  await switchTab("graph");
  const deadline = Date.now() + 4000;
  let node = null;
  while (Date.now() < deadline) {
    node = graphNodeById(id);
    if (node && Number.isFinite(node.x)) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (!node || !Number.isFinite(node.x)) {
    toast("That note is not on the graph right now: a filter or the view may be hiding it.", true);
    return;
  }
  focusGraphNode(node);
  if (typeof graphSvg !== "undefined" && graphSvg && typeof graphZoom !== "undefined" && graphZoom) {
    graphSvg.transition().duration(400).call(graphZoom.translateTo, node.x, node.y);
  }
}

//: Start a chat about one note. Named by its title in the words a person
//: would use, so the agent's own search tools find it, rather than pasting the
//: whole note into the box.
function askAtlasAboutNote(entry) {
  const name = (entry.title || String(entry.content || "").split("\n")[0] || "this note").trim();
  askAtlasAboutThing("note", name);
}

//: One door into the chat for any object: a note, a document, a board, a
//: file. Named, so the agent's own tools find it.
function askAtlasAboutThing(kind, name) {
  const label = String(name || "").trim().slice(0, 80) || `this ${kind}`;
  switchTab("chat");
  const input = $("chat-input");
  if (!input) return;
  input.value = `Tell me about my ${kind} "${label}" and what it connects to.`;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.focus();
}

function inlineActionIs(id, kind) {
  return inlineAction && inlineAction.id === id && inlineAction.kind === kind;
}

// Close every open ⋯ menu (shared by outside-click and Esc, Wave L).
// A kebab menu that stays where it opened while the list scrolls under it
// ends up beside the wrong note (reported: "they stay sticky on the screen
// even when I scroll putting the note I clicked it for off the page"). Any
// scroll outside the open menu closes it; a scroll inside a long menu is
// the menu's own and is left alone.
//: Walked from a live collection rather than asked of the whole document:
//: this runs on every scroll event on every tab (it is a capturing listener),
//: nearly always with nothing open, and a `:not(.hidden)` selector over the
//: app's 10,700 elements was the second-largest script cost of a 30-step
//: wheel scroll (27ms on the Library). The collection holds only the menus.
const ACTION_MENUS = document.getElementsByClassName("action-menu");

function closeActionMenusOnScroll(event) {
  const openMenus = [];
  for (const menu of ACTION_MENUS) if (!menu.classList.contains("hidden")) openMenus.push(menu);
  if (openMenus.length === 0) return;

  // Trackpads send small deltaX values along with deltaY when scrolling vertically.
  // If a dropdown lacks horizontal scroll, browsers often chain the deltaX to the 
  // nearest horizontally scrollable ancestor. If that ancestor scrolls, this function
  // fires. By ignoring the scroll while the user is actively hovering the menu, we 
  // prevent the menu from abruptly closing during trackpad scrolling.
  // We also track the last wheel event time, as :hover is often lost during 
  // momentum scrolling on touchpads.
  const timeSinceLastMenuWheel = Date.now() - (window._lastMenuWheelTime || 0);
  if (
    timeSinceLastMenuWheel < 500 || 
    document.querySelector(".select-menu:hover, .action-menu:hover, .doc-dock-menu-list:hover, .library-image-menu-list:hover, .wb-board-menu:hover")
  ) {
    return;
  }

  if (event.target instanceof Node) {
    for (const open of openMenus) {
      if (open.contains(event.target)) return;
    }
  }
  closeActionMenus();
}
window.addEventListener("scroll", closeActionMenusOnScroll, true);

// Track recent wheel events over menus to prevent them from closing during 
// momentum scrolls where the :hover state might temporarily detach.
window.addEventListener("wheel", (event) => {
  if (event.target.closest(".select-menu, .action-menu, .doc-dock-menu-list, .library-image-menu-list, .wb-board-menu")) {
    window._lastMenuWheelTime = Date.now();
  }
}, { passive: true, capture: true });

function closeActionMenus() {
  for (const menu of document.querySelectorAll(".action-menu:not(.hidden)")) {
    //: Read before the menu hides: a hidden element cannot hold the focus,
    //: and the browser hands it to `body`, which is nowhere a keyboard user
    //: can continue from.
    const held = menu.contains(document.activeElement);
    menu.classList.add("hidden");
    restoreEscapedMenu(menu);
    // `menu._escapedOpener` (set by wireEscapedActionMenu) wins when
    // present: a menu reparented to <body> has no useful `.parentElement`
    // to search: `document.body.querySelector` would find the *first*
    // `[aria-haspopup]` anywhere on the page, not this menu's own opener,
    // and set the wrong button's aria-expanded. Undefined for every other
    // menu, so this changes nothing for them.
    const opener = menu._escapedOpener || menu.parentElement.querySelector("[aria-haspopup]");
    if (opener) opener.setAttribute("aria-expanded", "false");
    if (held && opener?.isConnected) opener.focus({ preventScroll: true });
  }
  for (const strip of document.querySelectorAll(".menu-open")) {
    strip.classList.remove("menu-open");
  }
}

// Opening one, shared by the note cards and the sidebar kebabs so the two
// cannot drift apart.
//
// **`menu-open` is the fix for a reported bug, and it is not cosmetic.** On a
// note card, `.entry-actions` is `position: absolute; z-index: 1`, which
// makes it a *stacking context*, so the menu's own `z-index: 30` is resolved
// inside it and counts for nothing outside it. Every other note's action strip
// is also `z-index: 1`, and later in the document, so it paints on top of an
// open menu. Reported as "the other buttons in notes go over the popup options
// from above notes", and measured: with the first note's menu open, the topmost
// element at three separate points *inside* the menu was a button belonging to
// a different note. So it was not only a menu with buttons drawn over it, it
// was a menu whose items clicked the wrong note's controls.
//
// Raising the owning strip lifts the whole context, menu included. 5 rather
// than something larger because the only thing it has to beat is the 1 on its
// siblings; the page's own chrome is a different context and a big number here
// would only be a number waiting to collide with one.
// The nearest ancestor that actually clips overflow, walking up past plain
// flow containers. `.action-menu` is `position: absolute` inside a `.menu-wrap`
// that is itself absolutely positioned on the row, it never escapes an
// `overflow: auto` ancestor the way a portal would, so a row near the bottom
// of a scrolling list grows that ancestor's scrollHeight by however far the
// menu spills past it, and the menu itself is clipped at the same edge.
// Reported on the Documents subtab: the last row's ⋯ menu appeared cut off
// *and* a scrollbar showed up in a panel that fit without one a moment
// before opening it.
function nearestScrollParent(el) {
  let node = el.parentElement;
  while (node && node !== document.body) {
    if (/(auto|scroll)/.test(getComputedStyle(node).overflowY)) return node;
    node = node.parentElement;
  }
  return document.documentElement;
}

// **One help popover, for every "?" in the app.** Reported directly, with a
// screenshot of Settings' own Search-relevance hint: "the search relevance
// '?' popup tooltip is completely different from all other tooltips like it,
// same with the 'keep the ai on this machine' tooltip… all the ui and ux
// needs to be consistent in how it looks, how it functions, and where it is
// placed."
//
// It genuinely was three different things wearing the same "?" icon:
//   1. `.graph-help-panel`, a floating glass card (Graph, Timeline, three
//      Library sub-tabs).
//   2. the same class inside `.settings-section`, where a CSS override made
//      it `position: static`, so it was not a popover at all, it was a
//      bordered paragraph that shoved the rest of the form down the page.
//      That is the "just text in a box" in the screenshot.
//   3. `.setting-hint`, Settings' own long hints, which expanded inline
//      with no surface, border or shadow whatsoever.
//
// This makes all three the same control: a real popover, lifted to <body> so
// no card's `overflow` or `backdrop-filter` can clip it (the same escape
// `wireEscapedActionMenu` above makes, for the same reason), anchored under
// its own trigger with a caret pointing back at it, and closed the three
// ways every other popover here closes.
function placeHelpPopover(panel, trigger, retry = true) {
  const margin = 8;
  const anchor = trigger.getBoundingClientRect();
  //: **The other half of the flicker, which this function did not have.**
  //: Reported again after the dropdowns were fixed: "the flickering popup
  //: panels and dropdown panels are still happening", "still happen on some
  //: tooltips". `wireEscapedActionMenu`'s `place` already refuses an
  //: all-zero anchor rect (what a trigger inside a `display: none` or
  //: not-yet-laid-out ancestor reports, which collapses every sum below to
  //: the margin and puts the panel in the top corner); this one measured
  //: the same way and trusted it. Same guard, same shape: one retry on the
  //: next frame, held invisible rather than painted in the corner while it
  //: waits, and out of retries it places as best it can rather than
  //: flashing. A "?" whose trigger is genuinely at the origin also has zero
  //: width and height, so the three-way test cannot mistake a real corner
  //: trigger for an unmeasured one.
  if (!anchor.width && !anchor.height && !anchor.top) {
    if (retry) {
      panel.style.visibility = "hidden";
      requestAnimationFrame(() => placeHelpPopover(panel, trigger, false));
      return;
    }
  }
  // Measured while invisible: the panel is shown at 0,0 for the measure
  // and only then moved, which painted one frame in the top-left corner
  // (reported: "they flicker somewhere else on the screen for a split
  // second"). visibility keeps layout and geometry, so the measure is the
  // same, and nothing paints until the position is set.
  panel.style.visibility = "hidden";
  panel.style.left = "0px";
  panel.style.top = "0px";
  const box = panel.getBoundingClientRect();
  // Centred on the trigger, then pulled inside the window, a "?" sitting in
  // a right-hand control cluster would otherwise open half off-screen.
  //: **Clamped to the surface the trigger lives on, not to the window.**
  //: Reported with a screenshot of the search-relevance help hanging off the
  //: right edge of the Settings dialog and over the page behind it: a modal is
  //: narrower than the viewport, so "inside the window" let the popover leave
  //: the thing it belongs to while still being technically on screen. The
  //: window is the fallback for a "?" that is not inside a dialog at all.
  const surface = trigger.closest(".modal-card, .card") || null;
  const bounds = surface ? surface.getBoundingClientRect() : null;
  const minLeft = bounds ? Math.max(margin, bounds.left + margin) : margin;
  const maxLeft = bounds
    ? Math.min(window.innerWidth - margin - box.width, bounds.right - margin - box.width)
    : window.innerWidth - margin - box.width;
  let left = anchor.left + anchor.width / 2 - box.width / 2;
  left = Math.min(Math.max(left, minLeft), Math.max(minLeft, maxLeft));
  //: **The window is the hard bound, the surface is the preference** (INBOX
  //: 206, measured at 390x844: the capture popover sat at x=73 with a 358px
  //: body and ran 41px past the right edge of the screen). When the surface
  //: is narrower than the popover plus its margins, which is every card on a
  //: phone, `maxLeft` falls below `minLeft` and the clamp above resolves to
  //: `minLeft`, the card's own left edge, with nothing left to stop the
  //: right-hand side leaving the window. Clamping to the viewport last cannot
  //: make the surface fit worse: it only ever pulls the panel back towards
  //: the middle of the screen.
  left = Math.min(Math.max(left, margin), Math.max(margin, window.innerWidth - margin - box.width));
  let top = anchor.bottom + 10;
  let above = false;
  if (top + box.height > window.innerHeight - margin) {
    const room = anchor.top - 10 - box.height;
    if (room >= margin) {
      top = room;
      above = true;
    } else {
      top = Math.max(margin, window.innerHeight - margin - box.height);
    }
  }
  panel.style.left = `${Math.round(left)}px`;
  panel.style.top = `${Math.round(top)}px`;
  panel.style.visibility = "";
  panel.classList.toggle("help-popover-above", above);
  // The caret is positioned against the panel, but it has to point at the
  // trigger: which is only the panel's own centre when nothing clamped it.
  const caretX = Math.min(Math.max(anchor.left + anchor.width / 2 - left, 14), Math.max(box.width - 14, 14));
  panel.style.setProperty("--help-caret-x", `${Math.round(caretX)}px`);
}

//: Every open popover this session, so a second one closes the first and
//: nothing is left stranded at <body> after a tab switch.
const openHelpPopovers = new Set();

function closeHelpPopovers() {
  for (const entry of [...openHelpPopovers]) entry.close();
}

function wireHelpPopover(trigger, panel) {
  if (!trigger || !panel || panel.dataset.helpPopover) return;
  panel.dataset.helpPopover = "1";
  let homeParent = null;
  let homeNext = null;
  const entry = {
    close() {
      if (!openHelpPopovers.has(entry)) return;
      openHelpPopovers.delete(entry);
      panel.classList.add("hidden");
      panel.classList.remove("help-popover", "help-popover-above");
      panel.style.left = "";
      panel.style.top = "";
      //: Cleared with the rest of the inline placement: an element left
      //: `visibility: hidden` in its home tree is an element some other
      //: feature will one day show and find invisible.
      panel.style.visibility = "";
      if (homeParent) homeParent.insertBefore(panel, homeNext);
      trigger.setAttribute("aria-expanded", "false");
    },
  };
  const open = () => {
    closeHelpPopovers();
    homeParent = panel.parentElement;
    homeNext = panel.nextSibling;
    document.body.appendChild(panel);
    //: **Hidden before it is shown, revealed only by the placement**
    //: (INBOX 206: "popups still flicker for a split second at the top left
    //: and then appear in the right place"). Removing `hidden` first and
    //: placing afterwards is safe only while nothing between the two can
    //: yield to the compositor, which is true of this function today and is
    //: not a property anyone editing it can see. Setting `visibility` here
    //: makes the invariant local: the panel is laid out, so it can be
    //: measured, and the only line that can make it visible is the one in
    //: `placeHelpPopover` that runs after `left`/`top` are written.
    panel.style.visibility = "hidden";
    panel.classList.remove("hidden");
    // `.setting-hint`'s own collapsed state is a max-height animation, not a
    // `hidden` class: an inline hint has to be un-collapsed as well, or the
    // popover opens at zero height.
    panel.classList.remove("is-collapsed");
    panel.classList.add("help-popover");
    trigger.setAttribute("aria-expanded", "true");
    openHelpPopovers.add(entry);
    placeHelpPopover(panel, trigger);
  };
  trigger.addEventListener("click", (event) => {
    // These triggers live inside <label>s often enough that a bare click
    // would toggle the setting they explain.
    event.preventDefault();
    event.stopPropagation();
    if (openHelpPopovers.has(entry)) entry.close();
    else open();
  });
  panel.addEventListener("click", (event) => event.stopPropagation());
  document.addEventListener("click", (event) => {
    if (!openHelpPopovers.has(entry)) return;
    if (panel.contains(event.target) || trigger.contains(event.target)) return;
    entry.close();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") entry.close();
  });
  window.addEventListener("resize", () => {
    if (openHelpPopovers.has(entry)) placeHelpPopover(panel, trigger);
  }, { passive: true });
  // A popover is anchored to a rect that scrolls away underneath it; every
  // other floating thing in this app closes rather than chasing it.
  window.addEventListener("scroll", () => entry.close(), true);
}
window.wireHelpPopover = wireHelpPopover;

function openActionMenu(menu, opener) {
  closeActionMenus(); // only one open at a time
  //: **Measured while invisible, revealed once.** Reported alongside the
  //: collapsed menu above: "the popup sitll has the left corner screen flicker
  //: before it shows in the right place". Everything below this line needs the
  //: menu laid out to do its job (the flip test reads its rect, and
  //: `escapeMenuIfClipped` reparents it to `<body>` and writes a `top` only
  //: after measuring), and `hidden` is `display: none`, so the menu has to be
  //: shown before any of it can run. That leaves at least one painted frame
  //: where a menu about to be moved is visible where it started, which for an
  //: escaped menu is wherever `<body>` puts an unpositioned child.
  //:
  //: `visibility: hidden` is the difference: the box is laid out and
  //: measurable, and it paints nothing until the last line puts it back. The
  //: same two-step `showSelectionPopupAt` uses, and for the same reason.
  const wasVisibility = menu.style.visibility;
  menu.style.visibility = "hidden";
  menu.classList.remove("hidden", "action-menu-flip");
  opener.setAttribute("aria-expanded", "true");
  // Whichever ancestor is the stacking context this menu is trapped in. On a
  // note card that is `.entry-actions` (positioned, z-index 1); on a Library
  // card it is the card itself, because `backdrop-filter` creates a stacking
  // context too: which is why the same "menu behind the next card" bug turned
  // up again on a surface with no z-index in sight.
  menu.closest(".entry-actions, .library-card")?.classList.add("menu-open");
  // Opens downward by default; flip upward only when that would spill past
  // the nearest clipping ancestor, so a menu near the top of a short list
  // still opens the normal way.
  const bound = nearestScrollParent(opener).getBoundingClientRect();
  if (menu.getBoundingClientRect().bottom > bound.bottom) {
    menu.classList.add("action-menu-flip");
  }
  //: **A select's list starts under its own box** (the owner, with a
  //: screenshot: the Corner companion list opened out to the left of its
  //: select, over the section nav). Menus hang from their opener's right
  //: edge, which suits a ⋯ at the end of a row; a select's list is read
  //: down from the value it replaces, so it takes the opener's left edge
  //: whenever it fits that way, and keeps the right edge only when it
  //: would otherwise run past its container.
  menu.classList.remove("action-menu-start");
  if (opener.closest(".select-shell")) {
    const openerBox = opener.getBoundingClientRect();
    const width = menu.getBoundingClientRect().width;
    if (openerBox.left + width <= Math.min(bound.right, window.innerWidth) - 4) {
      menu.classList.add("action-menu-start");
    }
  }
  //: **And if flipping is not enough, leave the box entirely.** Asked for
  //: app-wide: "make sure the popup menus dont get clipped or go off the
  //: screen." Measured on the live app: **21** absolutely-positioned menus sit
  //: inside an ancestor with `overflow` set: every enhanced `<select>` inside
  //: a scrolling panel, the document dock's own list, the whiteboard's menus.
  //: Flipping upward only helps when the spill is downward and the clipper is
  //: tall enough; sideways, or in a short panel, the menu is simply cut.
  //:
  //: `wireEscapedActionMenu` has solved this since the Library's kebab was
  //: reported: but only for the callers that remembered to ask for it, one at
  //: a time. This makes it the default *when it is needed*: nothing changes for
  //: a menu that fits, and a menu that does not gets the same reparent-to-body
  //: treatment rather than being clipped.
  escapeMenuIfClipped(menu, opener);
  //: Placed, so it can be seen. Restored rather than cleared, in case a caller
  //: had its own reason to hide this menu.
  menu.style.visibility = wasVisibility;
  focusMenuItem(menu.querySelector("button"), menu);
}

//: **Focusing the first row of a menu must never scroll the page behind it.**
//:
//: Measured, not reasoned. The reader picker at the top of the OCR workspace
//: (`#ocr-reader`) would not open at all: one real Chromium click produced,
//: in order, `openActionMenu` (the menu unhides and escapes to <body>), a
//: `focusin` on the chosen row, a `scroll` event on `.ocr-toolbar`, and then
//: `closeActionMenusOnScroll` shutting the menu it had just opened, 3 option
//: rows built and 0 visible. `.ocr-toolbar` is `overflow-x: auto` (it scrolls
//: sideways rather than wrapping, by design), the menu is still a child of
//: that toolbar at the moment the focus lands, and a plain `.focus()` asks
//: the browser to scroll every ancestor until the focused element is in view.
//: So the open *caused* the scroll, and the scroll-away rule, which exists
//: for a real one (a kebab left beside the wrong note while its list scrolls
//: under it), could not tell the two apart.
//:
//: The fix is at the cause rather than at that rule: this app positions its
//: own menus, from the opener's rect, escaping to <body> when they would be
//: clipped, so an ancestor scrolling to "reveal" a menu item is never what is
//: wanted and is the browser undoing the placement. `preventScroll` says
//: exactly that, with no timer for anyone to tune.
//:
//: What it must not lose is the scrolling that *is* wanted: a long menu (the
//: model picker, a 30-option select) whose chosen row is below its own fold
//: has to bring that row into view. So the menu scrolls itself, by the two
//: lines below, and nothing above it moves.
function focusMenuItem(item, menu) {
  if (!item) return;
  item.focus({ preventScroll: true });
  const box = menu || item.closest(".action-menu");
  if (!box || box.scrollHeight <= box.clientHeight) return;
  const top = item.offsetTop;
  const bottom = top + item.offsetHeight;
  if (top < box.scrollTop) box.scrollTop = top;
  else if (bottom > box.scrollTop + box.clientHeight) box.scrollTop = bottom - box.clientHeight;
}

//: The nearest ancestor that would clip this menu, `overflow` anything but
//: `visible` makes a box a clipping context, and `clip` and `hidden` clip
//: without even offering a scrollbar to reach what they cut off.
function menuClippingAncestor(el) {
  let node = el?.parentElement;
  while (node && node !== document.body) {
    const cs = getComputedStyle(node);
    const clips = (value) => value === "auto" || value === "scroll" || value === "hidden" || value === "clip";
    if (clips(cs.overflowX) || clips(cs.overflowY)) return node;
    node = node.parentElement;
  }
  return null;
}

//: The placement `wireEscapedActionMenu` has always used, factored out so the
//: automatic path and the hand-wired one cannot drift into placing the same
//: menu differently. Right-aligned to the opener, flipped above when the whole
//: box fits there, and clamped to the viewport on both axes, which is the
//: "or go off the screen" half of the same report.
//:
//: **This is deliberately not `place()`'s vertical rule** (see
//: `wireEscapedActionMenu` below), and the difference was measured rather
//: than assumed, on the note cards' own kebab menus, which are the automatic
//: path's largest population. `place()` decides between the room above the
//: trigger and the room below it and scrolls inside whichever is larger; this
//: one is allowed to span *across* the trigger and use the whole window. For
//: a menu taller than either side, that is the difference between showing all
//: of it and showing part of it: at 1280x640 a 375px menu opened from a card
//: at y=313 sits 257 to 632 here and needs no scrollbar at all, while
//: `place()`'s rule caps it to the 301px above the card and makes it scroll;
//: at 1280x360 the same menu shows 294px of itself against `place()`'s 207px,
//: with 143px of empty window left under it. A kebab covering its own three
//: dots for as long as it is open costs nothing. A `<select>` dropdown
//: covering the field you are choosing a value in is a different matter,
//: which is why `place()`, whose callers are that shell and the wrap kebabs,
//: keeps the trigger clear and takes the scrollbar instead.
//:
//: What is shared is everything else: the horizontal clamp, the 8px margin,
//: the 4px gap, and the rule that the whole box lands inside the window.
//: Neither can run past the bottom, because `07-whiteboard-misc.css` caps
//: every `.action-menu` at `calc(100vh - var(--space-9) * 2)` with
//: `overflow-y: auto`, measured as 576px in a 640px window and 296px in a
//: 360px one, so a menu is never taller than the window it is placed in.
function placeEscapedMenu(menu, opener) {
  const margin = 8;
  const anchor = opener.getBoundingClientRect();
  // Same reason as placeHelpPopover: no frame at 0,0 before the move.
  menu.style.visibility = "hidden";
  menu.style.left = "0px";
  menu.style.top = "0px";
  const box = menu.getBoundingClientRect();
  let left = anchor.right - box.width;
  let top = anchor.bottom + 4;
  if (left < margin) left = margin;
  if (left + box.width > window.innerWidth - margin) {
    left = Math.max(margin, window.innerWidth - margin - box.width);
  }
  if (top + box.height > window.innerHeight - margin) {
    const above = anchor.top - 4 - box.height;
    //: **Both edges, not just the top.** This branch used to accept `above`
    //: on `above >= margin` alone, which is only half the question: with a
    //: trigger below the fold (a card the list has scrolled past, a menu
    //: opened from script), "above the trigger" is itself off the bottom of
    //: the window. Measured at 1280x360 on the third note card, whose kebab
    //: sits at y=405: the menu landed at top 105, bottom 401, with 41px of it
    //: past the window and nothing able to bring that back. The fallback
    //: below, which pins the box to the last position that fits, was always
    //: the right answer for that case.
    const fits = above >= margin && above + box.height <= window.innerHeight - margin;
    top = fits ? above : Math.max(margin, window.innerHeight - margin - box.height);
  }
  menu.style.left = `${Math.round(left)}px`;
  menu.style.top = `${Math.round(top)}px`;
  menu.style.visibility = "";
}

function escapeMenuIfClipped(menu, opener) {
  //: A menu that already has its own escape wiring is left alone: two
  //: mechanisms reparenting the same node would fight over where home is.
  if (menu._escapeWired || menu._escapedHome) return;
  const clipper = menuClippingAncestor(menu);
  if (!clipper) return;
  const box = menu.getBoundingClientRect();
  const bound = clipper.getBoundingClientRect();
  //: A pixel of tolerance, because a menu whose edge lands exactly on its
  //: container's is not clipped and reparenting it would be a visible jump for
  //: no reason.
  const spills =
    box.right > bound.right + 1 ||
    box.left < bound.left - 1 ||
    box.bottom > bound.bottom + 1 ||
    box.top < bound.top - 1;
  if (!spills) return;
  menu._escapedHome = { parent: menu.parentElement, next: menu.nextSibling };
  //: Read by `closeActionMenus`, which otherwise looks for the opener among
  //: the menu's siblings: and once the menu is a child of <body> that search
  //: finds the first `[aria-haspopup]` on the page, which is the wrong button.
  menu._escapedOpener = opener;
  document.body.appendChild(menu);
  menu.classList.add("action-menu-escaped");
  //: `action-menu-flip` pins `bottom`; `placeEscapedMenu` sets `top`. Both at
  //: once over-constrains an auto-height box, which reproduced as the menu
  //: collapsing to its own padding, see `wireEscapedActionMenu`'s note.
  menu.classList.remove("action-menu-flip");
  placeEscapedMenu(menu, opener);
}

function restoreEscapedMenu(menu) {
  const home = menu._escapedHome;
  if (!home) return;
  //: Put back rather than left in <body>: a page that never restores an
  //: escaped menu accumulates stray fixed nodes forever, and the next
  //: `openActionMenu` expects to find it where it was built.
  home.parent.insertBefore(menu, home.next);
  menu.classList.remove("action-menu-escaped");
  menu.style.left = "";
  menu.style.top = "";
  menu._escapedHome = null;
}

//: **Escape a clipping ancestor, then cap to the room really left below.**
//: The second of this file's two menu recipes, and the one for a menu whose
//: ordinary position comes from the stylesheet rather than from us:
//: `details.dock-menu`'s panel (INBOX 31) and the whiteboard's five top-bar
//: menus (INBOX 43). It was written twice, once in each place, with the same
//: margin, the same floor and the same order; the second copy's own comment
//: said it was "the same recipe ... not a third scheme", which is exactly the
//: state in which a reader improves one of them and leaves the other behind.
//: Measured identical before and after on the whiteboard's own menus at
//: 1440x900, 1280x640 and 1024x560 (View: escaped at the two smaller sizes,
//: capped to 576px and 496px, 20px and 100px of scroll inside it).
//:
//: **Not** folded into `wireEscapedActionMenu`'s `place()`, this file's other
//: recipe, and the difference is not a detail: `place()` *positions* the menu
//: itself, fixed and right-aligned under its opener, every time it opens,
//: because the `.action-menu` it is wired to has no position of its own once
//: it is a child of <body>. These menus do have one. A dock menu that nothing
//: clips is still anchored by CSS under its own summary, and a whiteboard menu
//: under its own toolbar button, so running them through `place()` would move
//: menus that were never in the wrong place to satisfy a shared function. Here
//: the escape stays conditional (a no-op when nothing clips) and only the
//: height is decided.
function escapeAndCapMenu(menu, opener) {
  //: **Measured with every cap off, not just this function's own.**
  //: The inline cap is cleared before the measurement rather than after the
  //: close: the `top` read below has to be this open's real one, and a cap
  //: left over from the last open changes it (a menu that would have flipped
  //: above no longer needs to) as well as hiding the fact that the menu wants
  //: more room.
  //:
  //: `none` rather than empty, because clearing the inline value only hands
  //: the menu back to the *stylesheet's* cap, and that is the same lie one
  //: level down. Measured on the map's View menu at 1440x760 (INBOX 114, "the
  //: view dropdown menu in the whiteboard and mindmap is still broken", with
  //: "Snap to grid" cut in half and a scrollbar): 714px of content, held to
  //: 616 by `.wb-board-menu`'s own `calc(100vh - 9rem)`, so `placeEscapedMenu`
  //: measured 616, found that it fitted under the opener, and left the menu at
  //: top 56. It was then capped to the 696px of room under *that* line and
  //: scrolled 18px of content it had the window height to show: placed at the
  //: top of the window instead, all 714 fit. A menu is moved up by how tall it
  //: really is, or it is moved for the wrong reason.
  menu.style.maxHeight = "none";
  escapeMenuIfClipped(menu, opener);
  const margin = 8;
  //: After the escape, so the number is measured against wherever the menu
  //: has ended up: `placeEscapedMenu` may have flipped it above the opener or
  //: clamped it to the top of the window, and a cap computed from the old top
  //: would be the wrong one for the new position.
  const box = menu.getBoundingClientRect();
  //: **Anchor on the opener, not on the menu, and never on a rect that was
  //: not laid out.** Measured while the whiteboard tab was hidden: every
  //: `.wb-board-menu` reported `top: 0` and this wrote a 892px cap from it,
  //: on a viewport of 900. A rect read from an element inside a
  //: `display: none` ancestor is all zeroes, and the arithmetic below
  //: cannot tell that from a menu genuinely sitting at the top of the
  //: window: it just produces a number, which is how a cap ends up either
  //: meaningless or, when the stale `top` is large, small enough to read as
  //: the reported "overly short" menu.
  //:
  //: The opener is by definition laid out (it was just clicked), so its own
  //: bottom edge is the honest answer to "where does this menu start".
  //: The menu's own top is the fallback for a caller that has no opener,
  //: and if neither is laid out the stylesheet's cap is left alone rather
  //: than replaced with a number derived from zeroes.
  //: **But where it was actually put beats where it would have gone.**
  //: `placeEscapedMenu` measures the menu *uncapped* and, when that height
  //: does not fit below the opener, pins the box higher up the window. The cap
  //: was still being computed from the opener's bottom, so a menu that had
  //: been moved up got the height of the room under the *opener* while sitting
  //: in the larger room under its own top, and scrolled with empty window
  //: below it. Measured on a board at 1440x700 (INBOX 107c, "the arrange
  //: dropdown is also very short"): the View menu was placed at top 96 with
  //: 604px of room under it and capped to 507, scrolling 594px of content
  //: through a 505px port with 89px of window to spare; at 600 it wasted 137.
  //:
  //: `placeEscapedMenu` only ever writes `top` (never `bottom`, the
  //: over-constraint note there says why), so the menu grows downward from
  //: exactly this edge in every one of its branches, and the room under that
  //: edge is the honest answer. The opener stays as the fallback for a menu
  //: the stylesheet placed and for one whose own rect is not laid out.
  const anchor = opener ? opener.getBoundingClientRect() : null;
  const laidOut = (rect) => rect && (rect.width || rect.height || rect.top);
  const top = laidOut(box) ? box.top : laidOut(anchor) ? anchor.bottom + margin : null;
  //: Nothing measurable to cap against: the stylesheet's own cap is the right
  //: thing to fall back to, and `none` above must not be what is left behind.
  if (top === null) {
    menu.style.maxHeight = "";
    return;
  }
  //: The floor keeps a menu opened near the bottom edge a menu rather than a
  //: slit; under it, scrolling inside the panel is the affordance.
  menu.style.maxHeight = `${Math.max(120, Math.round(window.innerHeight - top - margin))}px`;
}

// **Escapes a `kebabMenu()` dropdown from a clipping scroll ancestor.**
// Reported live, with a screenshot: "the documents popup menu in the
// library subtab gets cut off." `.library-view-section` is
// `overflow-y: auto`, and `.action-menu` is `position: absolute`, the
// same shape as the gallery kebab menu's own clipping bug earlier this
// session (`section.card.glass`'s `backdrop-filter`, there), fixed the
// same way: reparent to `<body>` and position from the opener's own rect,
// which is the only thing that actually escapes an ancestor's `overflow`.
//
// Deliberately **not** folded into `openActionMenu`/`closeActionMenus`
// themselves: `.action-menu` is shared by every note card, the chat
// dock, the selection popup and nested submenus, none of which are
// clipped, and none of which this session re-verified live. Rewriting
// what they all depend on to fix one clipped caller is a bigger, riskier
// change than watching that one caller's own open/close state and acting
// on it: which is what this does, via a MutationObserver on the menu's
// own `hidden` class, so `openActionMenu`'s existing flip logic keeps
// running unmodified underneath it.
//
// Call once, right after building a `kebabMenu()` wrap, for any menu
// known to live inside a scrolling ancestor.
function wireEscapedActionMenu(wrap) {
  const menu = wrap.querySelector(".action-menu");
  const opener = wrap.querySelector("[aria-haspopup]");
  if (!menu || !opener) return;
  // Read by closeActionMenus() in place of a DOM-parent lookup, which
  // would otherwise search the whole <body> for the first [aria-haspopup]
  // it finds, the wrong button, once this menu is no longer a
  // descendant of its own opener's wrapper.
  menu._escapedOpener = opener;
  //: Claimed, so `escapeMenuIfClipped` (the automatic path) does not also try
  //: to reparent this one, two mechanisms with two ideas of "home" would put
  //: it back in the wrong place.
  menu._escapeWired = true;
  let homeParent = null;
  let homeNext = null;
  const place = (retry = true) => {
    const margin = 8;
    const anchor = opener.getBoundingClientRect();
    //: **Never place against a rect that was not laid out.** Reported:
    //: dropdowns and tooltips "flicker into the top corner for a second
    //: then appear in the right place". Reproduced by measuring an open
    //: menu frame by frame: with the opener unmeasurable (all-zero rect,
    //: which is what an element inside a `display: none` or
    //: not-yet-laid-out ancestor reports) the arithmetic below resolves to
    //: the margin in both axes and the menu lands at 8,4: the top corner,
    //: exactly as described. A later pass then places it properly, which
    //: is the "and then it appears in the right place" half.
    //:
    //: So: one retry on the next frame, the same shape `clampToolbarMenu`
    //: already uses, and the menu is held invisible rather than painted in
    //: the corner while it waits. `visibility`, not `.hidden`: the class is
    //: the open/closed state that this observer is driven by, and writing
    //: it here would re-enter.
    if (!anchor.width && !anchor.height && !anchor.top) {
      if (retry) {
        menu.style.visibility = "hidden";
        requestAnimationFrame(() => place(false));
        return;
      }
      //: Out of retries: show it where the stylesheet puts it rather than
      //: never, and rather than in a corner of our own choosing.
      menu.style.visibility = "";
      return;
    }
    // Reset first: a stale left/top from the last open would otherwise
    // seed the width/height measurement below at the wrong size on some
    // browsers' layout of a `position: fixed` element mid-transition.
    menu.style.left = "0px";
    menu.style.top = "0px";
    //: **Measure the menu at its full height, not at whatever a stylesheet
    //: last capped it to.** Written in response to the whiteboard's View
    //: menu (INBOX 57, then 105), but the correction belongs here in the
    //: retest, not in the fix: this `place()` is `wireEscapedActionMenu`'s
    //: own, wired only to `enhanceSelect`'s dropdown shell and `kebabMenu`'s
    //: wrap (this file's own two call sites) -- the whiteboard's
    //: `.wb-board-menu` (Insert, Edit, Arrange, View, Board) never calls it.
    //: It goes through the file's other recipe, `escapeAndCapMenu` above,
    //: which leaves a menu the stylesheet has already anchored where it is
    //: and caps `max-height` to the room below its own final `top`. Read that
    //: function's comment before moving anything between the two: they differ
    //: because one owns the menu's position and the other does not.
    //: Retested directly on the real View menu, board and mind map, at
    //: 1440 and 820 wide, 900/700/640 tall: it already holds up (see INBOX
    //: 105's own retest note for the numbers), which is why this fix stayed
    //: scoped to the surfaces that actually call it rather than being
    //: ported into a second implementation that was not shown to need it.
    //: Whichever rule caps it, an inline `max-height: none` for the
    //: duration of the measurement is what makes `box.height` the height this
    //: menu actually wants, so the choice below is made on the real number.
    //:
    //: **And the cap below is not `placeEscapedMenu`'s job, deliberately.**
    //: Sharing it was tried and measured: giving the automatic path this rule
    //: made a 375px note-card menu that fitted whole at 1280x640 into a 301px
    //: scrolling one, and cost 87px of visible menu at 1280x360, because that
    //: path is allowed to span across its trigger and use the window while
    //: this one keeps the trigger clear. The numbers are at
    //: `placeEscapedMenu`, which is the site a reader is more likely to reach
    //: first.
    menu.style.maxHeight = "none";
    const box = menu.getBoundingClientRect();
    let left = anchor.right - box.width;
    let top = anchor.bottom + 4;
    if (left < margin) left = margin;
    if (left + box.width > window.innerWidth - margin) {
      left = Math.max(margin, window.innerWidth - margin - box.width);
    }
    //: The room on each side of the trigger, which is the only honest cap:
    //: a fixed figure is either smaller than the window (the reported bug) or
    //: larger than it (a menu running off the bottom).
    const roomBelow = window.innerHeight - margin - (anchor.bottom + 4);
    const roomAbove = anchor.top - 4 - margin;
    if (box.height <= roomBelow) {
      top = anchor.bottom + 4;
      //: **`none`, not `""`.** Clearing the inline cap hands the menu back to
      //: the *stylesheet's* cap, and that is the same lie one level down that
      //: `escapeAndCapMenu` was fixed for in 8b92164: the menu is then placed
      //: by a height it is not drawn at. Downwards that only wastes room;
      //: upwards, the branch below, it is the reported bug. The height was
      //: measured a few lines up with every cap off and found to fit in the
      //: room on this side, so keeping it is exactly what "it fits" meant.
      menu.style.maxHeight = "none";
      menu.style.overflowY = "";
    } else if (box.height <= roomAbove) {
      //: Upwards only when the whole menu fits there. Opening up and *then*
      //: scrolling puts the first row at the bottom of the panel, furthest
      //: from the button that opened it, which reads as a different menu.
      //:
      //: **This is where the cap mattered** (INBOX 119, the owner: "the let
      //: the ai decide button popup is a massive gap above the picker").
      //: Reproduced on :8895, 1440x900 dark, with nine categories in the
      //: notebook (scratchpad/ui-sweeps/notesmenugap3.js): the File under menu
      //: wanted 410.8px, `.select-menu`'s own `max-height: 18rem` drew it at
      //: 288, and `top` was computed from the 410.8, so the menu opened at
      //: y=99 and its bottom landed 127.1px above the opener at y=514.1, with
      //: the gap covering the formatting toolbar and the note body. The
      //: owner's screenshot measures the same 127. Eight categories gave 91px
      //: of gap, ten 163, eleven 199: exactly `wants - drawn + 4` every time,
      //: which is the signature of placing a box by a height something else
      //: then takes away.
      top = anchor.top - 4 - box.height;
      menu.style.maxHeight = "none";
      menu.style.overflowY = "";
    } else {
      //: Taller than both sides: take the larger side and scroll inside it,
      //: with the cut row visible rather than sliced, which is the
      //: affordance. `--space-*` is not reachable from here, so the eight
      //: pixels are the same `margin` the placement already uses.
      const takeBelow = roomBelow >= roomAbove;
      const room = Math.max(120, takeBelow ? roomBelow : roomAbove);
      top = takeBelow ? anchor.bottom + 4 : margin;
      menu.style.maxHeight = `${Math.round(room)}px`;
      menu.style.overflowY = "auto";
    }
    menu.style.left = `${Math.round(left)}px`;
    menu.style.top = `${Math.round(top)}px`;
    //: **Escaping a clipping ancestor can drop the menu below the surface it
    //: belongs to, and that is a second bug wearing the first one's clothes**
    //: (INBOX 239). `<body>` is a lower place to stand than some of the things
    //: this app draws: the escaped menu is `z-index: 1020` from the
    //: stylesheet, and a table block in full view is a fixed panel at 2400, so
    //: the ⋯ menu opened *inside* that panel drew underneath it. Measured on
    //: :8802: the menu's Back row at 1166,248 with `elementFromPoint` at its
    //: centre returning `DIV.md-table-wrap`, and a real click at that point
    //: leaving the panel open, which is the "no way to close it" report.
    //:
    //: The honest rule is the one this reparenting broke: a menu belongs above
    //: the surface it was opened from. So the opener's own positioned
    //: ancestors are read and the highest of them wins, once, at open time.
    //: Nothing is written when the stylesheet's own tier is already higher,
    //: which is every other caller in the app, so this is inert until a menu
    //: is opened inside a surface that outranks it.
    //: Cleared before it is read, or the second pass (a resize, the retry
    //: frame) measures the lift this one wrote and decides it is already high
    //: enough, which alternates between the two values on every resize.
    menu.style.zIndex = "";
    const ownZ = Number(getComputedStyle(menu).zIndex) || 0;
    let over = 0;
    for (let el = opener.parentElement; el && el !== document.body; el = el.parentElement) {
      const z = Number(getComputedStyle(el).zIndex);
      if (Number.isFinite(z) && z > over) over = z;
    }
    menu.style.zIndex = over >= ownZ ? String(over + 1) : "";
    //: Placed, so it may be seen (see the guard at the top of this
    //: function for what this is undoing).
    menu.style.visibility = "";
  };
  //: **A `<select>` inside a native `<dialog>` escapes to the dialog, not to
  //: `<body>`.** Reported directly, on the documents dictionary dialog's
  //: spelling picker: "the dictionary preferences dropdown appears behind
  //: the panel." A `showModal()` dialog paints in the browser's top layer,
  //: which is *always* above the regular document regardless of z-index;
  //: `<body>` is the regular document, so a menu reparented there is behind
  //: every open dialog by construction, not by any z-index this file could
  //: raise. The dialog element itself is still the top-layer root, so
  //: appending inside it keeps the menu in the same painting layer as its
  //: own opener.
  const escapeTarget = () => opener.closest("dialog[open]") || document.body;
  const observer = new MutationObserver(() => {
    // A menu shown as a phone's action sheet (`openKebabSheet`) is already
    // out of every clipping ancestor; escaping it would take it back out of
    // the sheet.
    if (menu._inSheet) return;
    const open = !menu.classList.contains("hidden");
    const target = escapeTarget();
    if (open && menu.parentElement !== target) {
      homeParent = menu.parentElement;
      homeNext = menu.nextSibling;
      //: **Moving a node takes the focus out of it**, and this runs after the
      //: open has already put the focus on the first row (`openActionMenu`,
      //: the select's chosen option): the observer is a microtask, so the
      //: move lands a tick later and the browser drops the focus to `body`.
      //: Measured by scratchpad/ui-sweeps/menus.js at 1440: every select in
      //: the app and every library kebab opened with `document.activeElement`
      //: on `body`, so ArrowDown did nothing and Escape gave the focus to
      //: nobody. Held across the move and handed back.
      const held = menu.contains(document.activeElement) ? document.activeElement : null;
      target.appendChild(menu);
      if (held && held.isConnected) held.focus({ preventScroll: true });
      menu.classList.add("action-menu-escaped");
      // openActionMenu() may have already set `.action-menu-flip` (`bottom:
      // calc(100% + 4px)`) based on the menu's *pre-escape* position. `place()`
      // below sets its own inline `top` to open up-or-down as needed, left
      // together, an element with both `top` and `bottom` pinned and
      // `height: auto` is over-constrained, and reproduced live as the menu's
      // box collapsing to ~15px (just its padding+border) while the buttons
      // still rendered past that line, which is what "background doesn't
      // fill the dropdown, looks transparent" actually was. `place()` makes
      // this class redundant once escaped, so drop it rather than fight it.
      menu.classList.remove("action-menu-flip");
      place();
    } else if (!open && menu.parentElement !== homeParent && homeParent) {
      // Restored on close, not left wherever it escaped to (`<body>` or an
      // open dialog): closeActionMenus() and any future openActionMenu()
      // call both expect to find this menu where it started, and a page
      // that never puts an escaped menu back accumulates stray
      // position:fixed nodes at the end of whichever element it escaped to.
      //: A menu closed with the focus still inside it (Escape handled by
      //: someone other than `wireMenuKeyboard`, a click on a row that opens
      //: nothing) would drop it to `body` on this move; the opener is where it
      //: belongs. Measured on every select: Escape left the focus on `body`.
      const held = menu.contains(document.activeElement);
      homeParent.insertBefore(menu, homeNext);
      if (held && opener.isConnected) opener.focus({ preventScroll: true });
      menu.classList.remove("action-menu-escaped");
      menu.style.left = "";
      menu.style.top = "";
      menu.style.visibility = "";
      // The height decisions are the escape's, not the menu's own: left
      // behind they would cap it in its home position too. The same goes for
      // the tier the escape may have lifted it to (INBOX 239).
      menu.style.maxHeight = "";
      menu.style.overflowY = "";
      menu.style.zIndex = "";
    }
  });
  observer.observe(menu, { attributes: true, attributeFilter: ["class"] });
  menu._escapedObserver = observer;
  //: **The re-place on resize is one listener for the whole app, not one per
  //: menu.** This used to be `window.addEventListener("resize", ...)` here,
  //: inside a function that runs once per `kebabMenu()`, which is once per
  //: card. The Library draws sixty cards and rebuilds them on every render,
  //: and `window` is never collected, so every one of those closures stayed
  //: alive holding its own `menu`, `opener` and `place`, and through them the
  //: whole detached card.
  //:
  //: Measured per round (`scratchpad` leak probe, 1440x900, eight rounds of
  //: the seven tabs on a four thousand note notebook, three forced GCs before
  //: each sample), because the question is whether it plateaus. Round one is
  //: one-time: it renders tabs that had never been drawn. A leak keeps
  //: climbing after that, and this did, dead straight:
  //:
  //:              round  1     2     3     4     5     6     7     8
  //:   listeners  3999  4719  5439  6159  6879  7599  8319  9039   (+720 each)
  //:   nodes      26767 28793 30820 32843 34868 36895 38920 40943  (+2025 each)
  //:
  //: with the document itself flat at 13,237 nodes throughout, so every one
  //: of those 2,025 nodes a round was detached and retained. 360 of the 370
  //: observers created and never disconnected came from this function too.
  //:
  //: After: 3,866 listeners and 26,768 nodes on every round from the first,
  //: flat. Heap growth over rounds two to eight went from +1.4 MB to +0.7 MB,
  //: and the `resize` registrations in a run from 657 to 104.
  //:
  //: The listener below is registered once and finds its work in the DOM, so
  //: it holds nothing: a menu that is gone is a menu the query does not
  //: return. `_placeEscaped` is on the element, so the closure lives exactly
  //: as long as the element does.
  menu._placeEscaped = place;
  wireEscapedMenuResize();
}

//: One `resize` listener for every escaped menu there will ever be. See
//: `wireEscapedActionMenu` for the measurement that made this necessary.
//:
//: It asks the document rather than holding a list: `closeActionMenus` can
//: remove a menu, a render can replace the card under it, and either would
//: leave a stale entry in a registry. `:not(.hidden)` because a closed menu
//: has nothing to place, and only an escaped one is positioned by this file
//: at all.
let escapedMenuResizeWired = false;
function wireEscapedMenuResize() {
  if (escapedMenuResizeWired) return;
  escapedMenuResizeWired = true;
  window.addEventListener(
    "resize",
    () => {
      for (const menu of document.querySelectorAll(".action-menu-escaped:not(.hidden)")) {
        menu._placeEscaped?.();
      }
    },
    { passive: true }
  );
}

// The Connections block (REDESIGN.md §R7.3 item 1), for a note or a document.
//
// `kind` is "entries" or "documents", the two API prefixes, used verbatim
// as the path segment rather than mapped through a lookup, because a third
// kind would need a third endpoint anyway and a two-entry map is a place for
// them to disagree.
//
// Direction is the whole point of the first two groups. `links_for_entry`
// has always returned both directions merged, so a note could show what it
// was connected to and never which way round, and "this note points at that
// one" and "that one points at this" are different facts. Everything else on
// this dialog is a join that existed in the database and was surfaced
// nowhere: the boards a note is a card on, and the uploads its markdown
// embeds.
async function openConnections(kind, id, subject) {
  const overlay = $("connections-overlay");
  const list = $("connections-list");
  const status = $("connections-status");
  status.classList.remove("error");
  status.textContent = "Loading…";
  list.replaceChildren();
  $("connections-subject").textContent = subject || "";
  overlay.classList.remove("hidden");
  $("connections-close").focus();

  let data;
  try {
    data = await apiJson(`/${kind}/${id}/connections`);
  } catch (error) {
    status.classList.add("error");
    status.textContent = error.message;
    return;
  }
  status.textContent = "";

  // Each group is [heading, rows, how to open one]. Built as data rather
  // than five near-identical blocks of DOM code: the groups differ only in
  // their label field and their click target, and writing that out five
  // times is how one of them quietly loses its keyboard handling.
  const groups =
    kind === "entries"
      ? [
          ["ph:arrow-up-right This note links to", data.outgoing, noteRow],
          ["ph:arrow-down-left Notes that link here", data.incoming, noteRow],
          ["ph:file-text In these documents", data.documents, docRow],
          ["ph:squares-four On these boards and maps", data.boards, boardRow],
          ["ph:image Files it uses", data.files, fileRow],
        ]
      : [
          ["ph:note Notes attached", data.notes, noteRow],
          ["ph:bookmark-simple References", data.bookmarks, bookmarkRow],
          ["ph:image Files it uses", data.files, fileRow],
        ];

  function row(label, title, onOpen) {
    const item = smallButton(label, title, () => {
      overlay.classList.add("hidden");
      onOpen();
    });
    item.classList.add("connection-row");
    return item;
  }
  function noteRow(link) {
    // A private note contributes the fact of the connection and not its
    // words: the server sends "Private note" as the preview, and the flag
    // is what lets this say so rather than showing a label that reads like
    // a real (empty-looking) note title.
    const label = link.is_private ? "ph:lock Private note" : `ph:note ${link.preview}`;
    const why = link.reason ? `\nWhy: ${link.reason}` : "";
    return row(label, `Open this note${why}`, () => flashEntry(link.id));
  }
  function docRow(doc) {
    return row(`ph:file-text ${doc.title}`, `Open “${doc.title}”`, () =>
      openDocumentFromNote(doc.id)
    );
  }
  function boardRow(board) {
    // `kind` is "board" or "map" from the one reader the Referenced-by row
    // uses (INBOX 246): a map is a different surface and gets its own icon.
    const icon = board.kind === "map" ? "ph:tree-structure" : "ph:squares-four";
    return row(`${icon} ${board.title}`, `Open “${board.title}”`, () =>
      openWhiteboardBoard(board.id ?? null)
    );
  }
  function bookmarkRow(mark) {
    return row(`ph:bookmark-simple ${mark.title || mark.url}`, `Open ${mark.url}`, () =>
      window.open(mark.url, "_blank", "noopener,noreferrer")
    );
  }
  function fileRow(file) {
    const name = file.original_name || file.name;
    // `focusLibraryFile` (library.js) rather than the three steps this used
    // to take inline: the media view is two sub-tabs now, so which one to
    // click depends on whether the file is an image, and that decision
    // belongs in one place.
    return row(`ph:image ${name}`, `Find “${name}” in the Library`, () =>
      focusLibraryFile(name, file.url || file.name)
    );
  }

  let shown = 0;
  for (const [heading, rows, build] of groups) {
    if (!rows || !rows.length) continue;
    shown += rows.length;
    const section = document.createElement("div");
    section.className = "connection-group";
    const head = document.createElement("p");
    head.className = "muted connection-heading";
    setLabel(head, `${heading} (${rows.length})`);
    section.appendChild(head);
    const holder = document.createElement("div");
    holder.className = "connection-rows";
    for (const item of rows) holder.appendChild(build(item));
    section.appendChild(holder);
    list.appendChild(section);
  }
  if (!shown) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent =
      kind === "entries"
        ? "Nothing is joined to this note yet. Link it to another note, attach it to a document, or drop it on a whiteboard."
        : "Nothing is joined to this document yet. Attach a note or a reference to it.";
    list.appendChild(empty);
  }
}

$("connections-close")?.addEventListener("click", () =>
  $("connections-overlay").classList.add("hidden")
);

// The ⋯ overflow menu on each note card (Wave L rework).
// Everything that ever happened to one note, with a way back to any of it.
//
// The rows are the event log (Brief 7): every write through the managers
// records one event with an actor and the whole value of each field it set,
// so a row can say who changed the note, what it became, and put it back by
// replaying the log to that point. `revisions` is the older per-edit snapshot
// list, still written and still restorable, and it is what a note whose
// history predates the event log has instead of rows.
const HISTORY_ACTION_WORDS = {
  created: "Written",
  edited: "Edited",
  restored: "Restored",
  deleted: "Moved to the bin",
  archived: "Archived",
  unarchived: "Taken out of the archive",
  linked: "Linked",
  unlinked: "Unlinked",
  purged: "Deleted for good",
};

function historyActorLabel(actor) {
  // "ai:summarise" and "system:auto-file" carry the half worth reading after
  // the colon; "user" is everything a person did and needs no chip at all.
  if (!actor || actor === "user") return "";
  const [kind, rest] = [actor.slice(0, actor.indexOf(":")), actor.slice(actor.indexOf(":") + 1)];
  if (kind === "ai") return `AI: ${rest}`;
  if (kind === "system") return `Background: ${rest}`;
  return actor;
}

async function openEntryHistory(entry) {
  const overlay = $("history-overlay");
  const list = $("history-list");
  $("history-status").textContent = "";
  $("history-status").classList.remove("error");
  list.replaceChildren();
  overlay.classList.remove("hidden");
  $("history-close").focus();

  let history;
  try {
    history = await apiJson(`/entries/${entry.id}/history`);
  } catch (error) {
    $("history-status").classList.add("error");
    $("history-status").textContent = error.message;
    return;
  }
  const events = history?.items || [];
  const revisions = history?.revisions || [];
  if (!events.length && !revisions.length) {
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = "Nothing has happened to this note yet, so there's nothing to go back to.";
    list.appendChild(p);
    return;
  }

  const restoreTo = async (url, message) => {
    if (!(await confirmDialog("Replace the note with this version?\n\nThe current text is kept in the history, so this is undoable."))) return;
    try {
      await apiJson(url, { method: "POST" });
      overlay.classList.add("hidden");
      toast(message);
      await loadEntries();
      flashEntry(entry.id);
    } catch (error) {
      $("history-status").classList.add("error");
      $("history-status").textContent = error.message;
    }
  };

  // The current text first, so you can see what you'd be replacing.
  const current = document.createElement("div");
  current.className = "history-entry history-current";
  const currentHead = document.createElement("p");
  currentHead.className = "muted";
  currentHead.textContent = "Now";
  const currentBody = document.createElement("p");
  currentBody.textContent = notePreviewText(entry.content);
  current.append(currentHead, currentBody);
  list.appendChild(current);

  // The row every event renders as. A function rather than a loop body
  // because a second page of events is rendered by the same code, below.
  const eventRow = (item) => {
    const row = document.createElement("div");
    row.className = "history-entry";
    const head = document.createElement("p");
    head.className = "muted";
    head.textContent = `${HISTORY_ACTION_WORDS[item.action] || item.action} ${relativeTime(item.created_at)}`;
    const actor = historyActorLabel(item.actor);
    if (actor) {
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.textContent = actor;
      head.append(" ", chip);
    }
    row.appendChild(head);
    if (item.compacted) {
      // The event is still a fact, its text is not kept: `events.compact`
      // drops the values behind changes older than the history window so the
      // log stops growing by a copy of the note on every edit. Saying that in
      // the row is the difference between a history with a gap and a history
      // that looks broken.
      const gone = document.createElement("p");
      gone.className = "muted";
      gone.textContent = "The text from this change is no longer kept.";
      row.appendChild(gone);
    } else if (item.content) {
      const body = document.createElement("p");
      body.textContent = notePreviewText(item.content);
      row.appendChild(body);
      // Only a version that differs from what is on screen is worth putting
      // back: offering "restore" on the state the note is already in reads as
      // a broken button rather than a safe one.
      if (item.content !== entry.content) {
        row.appendChild(
          smallButton("ph:arrow-u-up-left Put this back", "Restore this version", () =>
            restoreTo(`/entries/${entry.id}/restore/${item.id}`, "Earlier version restored.")
          )
        );
      }
    }
    return row;
  };

  // **Paging, and saying what is on screen.** `GET /entries/{id}/history`
  // returns at most `HISTORY_PAGE` (fifty) events and a `next_cursor` for
  // what is older than the oldest of them. This sheet used to read the first
  // page and drop the cursor, so a note edited more than fifty times showed
  // its newest fifty and looked like the whole history: silent truncation,
  // which is worse than a short list, because nothing on screen says the
  // rest exists and a version that is still there reads as lost. The row
  // below is both halves of the fix: it counts what is shown and it fetches
  // the next page.
  let shown = 0;
  let paged = false;  // whether "load older" has been pressed at least once
  let cursor = history?.next_cursor || null;

  // The control sits at the bottom of the events and stays there: the pages
  // that follow are inserted above it, so the list stays in newest-first
  // order however many times it is pressed.
  const more = document.createElement("div");
  more.className = "history-entry";

  const addEvents = (items) => {
    for (const item of items) {
      list.insertBefore(eventRow(item), more);
      shown += 1;
    }
  };

  const loadOlder = async () => {
    if (!cursor) return;
    const at = cursor;
    cursor = null;  // so a second press while this one is in flight is a no-op
    renderMore(true);
    let page;
    try {
      page = await apiJson(`/entries/${entry.id}/history?before=${at}`);
    } catch (error) {
      cursor = at;
      renderMore();
      $("history-status").classList.add("error");
      $("history-status").textContent = error.message;
      return;
    }
    addEvents(page?.items || []);
    paged = true;
    cursor = page?.next_cursor || null;
    renderMore();
  };

  const renderMore = (loading = false) => {
    more.replaceChildren();
    // A history that fits in one page says nothing extra: the row exists to
    // answer "is this all of it?", and on a note with a dozen changes the
    // list already answers that by ending.
    more.classList.toggle("hidden", !cursor && !loading && !paged);
    const note = document.createElement("p");
    note.className = "muted";
    if (cursor || loading) {
      // Plain about what it is: the count is what is on screen, not a
      // guess at the total, which the route does not send and which
      // counting would cost a second query to know.
      note.textContent = `Showing the ${shown} most recent changes to this note.`;
    } else if (paged) {
      note.textContent = `That is all ${shown} changes to this note.`;
    }
    more.appendChild(note);
    if (cursor) {
      more.appendChild(
        smallButton("ph:clock-counter-clockwise Load older changes", "Load the next page of this note's history", loadOlder)
      );
    } else if (loading) {
      const wait = document.createElement("p");
      wait.className = "muted";
      wait.textContent = "Loading older changes.";
      more.appendChild(wait);
    }
  };

  list.appendChild(more);
  addEvents(events);
  renderMore();

  // The snapshots are the same versions the events already show, one row
  // earlier, so they are only worth rendering for a note whose edits predate
  // the event log: measured on a note edited twice, both lists said "version
  // one of the note" and the sheet showed it twice.
  const snapshotsOnly = !events.some((item) => item.content);
  for (const revision of snapshotsOnly ? revisions : []) {
    const item = document.createElement("div");
    item.className = "history-entry";
    const head = document.createElement("p");
    head.className = "muted";
    head.textContent = `Before ${new Date(revision.created_at).toLocaleString()}`;
    const body = document.createElement("p");
    body.textContent = notePreviewText(revision.content);
    const restore = smallButton("ph:arrow-u-up-left Put this back", "Restore this version", () =>
      restoreTo(`/entries/${entry.id}/history/${revision.id}/restore`, "Earlier version restored.")
    );
    item.append(head, body, restore);
    list.appendChild(item);
  }
}

async function toggleEntryPrivacy(entry) {
  const makingPrivate = !entry.is_private;
  if (makingPrivate) {
    const ok = (await confirmDialog(
      "Make this note private?\n\n" +
        "It gets encrypted with a key derived from your password, so it stays " +
        "unreadable in the database, in backups, and to anyone without that " +
        "password.\n\n" +
        "It also stops appearing in search and stops being given to Atlas.\n\n" +
        "There is no recovery: if you forget your password this note is gone."
    ));
    if (!ok) return;
  }
  // Both directions need the key, which a session without a password lacks.
  if (!(await ensureVaultOpen())) return;
  try {
    await apiJson(`/entries/${entry.id}/privacy`, {
      method: "POST",
      body: JSON.stringify({ private: makingPrivate }),
    });
    toast(makingPrivate ? "Note encrypted." : "Note is readable again.");
    await loadEntries();
  } catch (error) {
    toast(error.message, true);
  }
}

// Reported: no popup shows when a title is regenerated.
//
// There WAS a toast, and it was being swallowed. `toast()` drops anything
// that is not an error while notifications are muted, which is right for
// background chatter and wrong here: this is the result of a button the user
// just pressed, and a direct action that reports nothing reads as a broken
// button. Muting is about noise you did not ask for.
//
// The "Generating…" toast is also worth keeping distinct from the settled one:
// this call waits on the model, so it can take seconds, and a control that
// looks inert for seconds gets pressed again.
async function generateEntryTitle(entry) {
  const regenerating = Boolean(entry.title);
  try {
    toast(regenerating ? "Regenerating the title…" : "Generating a title…", false, {
      exempt: true,
    });
    const updated = await apiJson(`/entries/${entry.id}/generate-title`, { method: "POST" });
    await loadEntries();
    flashEntry(entry.id);
    const title = updated && updated.title;
    toast(title ? `Titled “${title}”.` : "Titled.", false, { exempt: true });
    // And in the notification centre, so the result survives the 5.5 seconds
    // the toast lives for, the model can finish while you are on another tab.
    recordNotification({
      kind: "task",
      title: regenerating ? "Title regenerated" : "Title generated",
      detail: title ? `“${title}”` : `Note #${entry.id}`,
    });
  } catch (error) {
    toast(error.message || "Couldn't generate a title.", true);
  }
}

async function removeEntryTitle(entry) {
  try {
    await apiJson(`/entries/${entry.id}/remove-title`, { method: "POST" });
    await loadEntries();
    flashEntry(entry.id);
    // Said out loud for the same reason as above: it was silent, so the only
    // feedback was noticing the title had gone.
    toast("Title removed.", false, { exempt: true });
  } catch (error) {
    toast(error.message || "Couldn't remove the title.", true);
  }
}

// Arrow-key navigation, as the `role="menu"` contract implies. ↑/↓ move
// between *top-level* items (wrapping): `:scope >` so a hidden submenu's own
// items (handled by their own keydown handler) never get mixed into this list,
// which would desync Home/End and let arrow keys land on an item the user
// can't currently see. Home/End jump to the ends, Esc closes and returns focus
// to the opener.
//
// **Shared, because it used to belong to one menu.** This was written inline
// inside `entryOverflowMenu`, so the note card's ⋯ had full keyboard
// navigation and every menu built by `kebabMenu`, the conversation list, the
// sidebar kebabs, and now the text-selection menu, had none: Tab still
// stepped through the items (they are buttons), but ↑/↓ did nothing, which is
// the one thing a person who has just opened a menu will try. Found by
// driving the new selection menu from the keyboard and watching ArrowDown
// leave focus where it was.
function wireMenuKeyboard(menu, opener) {
  //: Read by the delegated walker for markup menus (search `menuRowsOf`),
  //: which leaves a menu wired here alone.
  menu.dataset.menuKeys = "1";
  menu.addEventListener("keydown", (event) => {
    const menuItems = [
      ...menu.querySelectorAll(
        //: `role="option"` too: an enhanced select's listbox is wired here, and
        //: with menuitems alone its arrow keys found nothing and returned,
        //: which left every select in the app without ArrowDown (and without
        //: this Escape, so inside Settings the Escape went on to close the
        //: whole Settings window and left the list floating over the page).
        ':scope > [role="option"], ' +
        ':scope > [role="menuitem"], :scope > .menu-group > [role="menuitem"], ' +
        //: `role="group"` as well as `.menu-group`, so a menu written in
        //: markup can use the wrapper ARIA actually names. `kebabMenu` builds
        //: its own groups as `.menu-group` divs with no role, and the board's
        //: five top-bar menus are sections in index.html that become
        //: `role="group"` at boot (`wbStampMenuRoles` in whiteboard.js): with
        //: only the class in this list, ArrowDown in those five found no items
        //: at all and left the focus where it was, which is the one thing a
        //: person who has just opened a menu will try.
        ':scope > [role="group"] > [role="menuitem"]'
      ),
    ]
      //: An item nobody can see is not one the arrows may land on. It never
      //: came up while every menu here was built by `kebabMenu`, which draws
      //: only the items it was given; the board's View menu keeps two map rows
      //: `hidden` on an ordinary whiteboard, and walking onto one of those
      //: calls `focus()` on an element that cannot take it, which leaves the
      //: focus where it was and reads as "the arrow keys do nothing".
      .filter((item) => !item.hidden && item.offsetParent !== null);
    if (!menuItems.length) return;
    const current = menuItems.indexOf(document.activeElement);
    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusMenuItem(menuItems[(current + 1) % menuItems.length], menu);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      focusMenuItem(menuItems[(current - 1 + menuItems.length) % menuItems.length], menu);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusMenuItem(menuItems[0], menu);
    } else if (event.key === "End") {
      event.preventDefault();
      focusMenuItem(menuItems[menuItems.length - 1], menu);
    } else if (event.key === "Escape") {
      event.preventDefault();
      //: The menu owns this Escape: without the stop, the document's own
      //: Escape handler goes on to close whatever the menu is inside (the
      //: Settings window, a sheet), one key doing two things.
      event.stopPropagation();
      closeActionMenus();
      opener.focus();
    }
  });
}

// A single `role="menuitem"` button: shared by the top-level menu and every
// submenu, so a click behaves identically (close everything, then run) no
// matter how deep the item is nested.
function buildMenuItemButton(item) {
  const button = document.createElement("button");
  button.setAttribute("role", "menuitem");
  button.className = "menu-item" + (item.danger ? " menu-danger" : "");
  setLabel(button, item.label);
  if (item.title) button.title = item.title;
  button.addEventListener("click", () => {
    closeActionMenus();
    item.run();
  });
  return button;
}

// At most one grouped flyout (AI actions / Connect / Add) is ever open at
// once, on any note card: `openActionMenu` already guarantees at most one
// top-level kebab is open on the page, and only one of its own groups can
// be expanded at a time. A single reference here is enough to close a
// sibling group's flyout when another opens, without a DOM search that
// escaping the flyout to `<body>` below has already made impossible (see
// `buildMenuGroupButton`'s own note).
let openGroupSubmenu = null;

// A grouped trigger ("AI AI actions ›") that opens a side flyout of its own
// items: asked for directly, to cut a 15-item flat list down to something
// scannable. Hover opens it on a device that has hover; click/tap opens it
// everywhere, which is the only way in on a touchscreen. Below
// `--menu-submenu-stack-width` (phone-width) there is nowhere for a flyout
// to go without running off-screen, so it drops the side-popup positioning
// entirely and expands in place instead, an accordion, not a flyout, which
// is what "compatible with small screens like iPhones" actually means here.
function buildMenuGroupButton(label, subItems) {
  let openedByHoverAt = 0;
  const groupWrap = document.createElement("div");
  groupWrap.className = "menu-group";

  const trigger = document.createElement("button");
  trigger.setAttribute("role", "menuitem");
  trigger.setAttribute("aria-haspopup", "menu");
  trigger.setAttribute("aria-expanded", "false");
  trigger.className = "menu-item has-submenu";
  const labelSpan = document.createElement("span");
  // setLabel, not textContent: these three group triggers ("AI actions",
  // "Connect", "Add") were the one label sink the sweep missed, so the note
  // kebab menu rendered the literal text "ph:magic-wand AI actions".
  setLabel(labelSpan, label);
  const arrow = document.createElement("span");
  arrow.className = "menu-submenu-arrow";
  arrow.setAttribute("aria-hidden", "true");
  arrow.textContent = "›";
  trigger.append(labelSpan, arrow);

  const submenu = document.createElement("div");
  submenu.className = "action-menu submenu hidden";
  submenu.setAttribute("role", "menu");
  //: **An entry may be a button that already exists**, not only a descriptor
  //: to build one from. The document editor's ⋯ is static markup whose rows
  //: carry ids that `documents.js` binds handlers to (`doc-export-md` and
  //: four more), so folding them into a group has to *move* those buttons
  //: rather than rebuild them: a rebuilt row is a row with no handler and an
  //: id that two lints watch. Everything else about the group is identical,
  //: which is the point of reusing this recipe rather than writing a second
  //: flyout for one menu.
  for (const item of subItems) {
    submenu.appendChild(item instanceof HTMLElement ? item : buildMenuItemButton(item));
  }

  // **Reparented to `<body>` while open, like `escapeMenuIfClipped` does for
  // the top-level kebab.** Reported: a submenu opened from a kebab near the
  // bottom or right of the viewport (a note card low in the list, or the
  // last card in a row) drew past the window edge with nothing but a
  // scrollbar to show for it. `.action-menu.submenu` was `position:
  // absolute` against its own `.menu-group`, which only ever checked the
  // *horizontal* edge (`submenu-left`, below); there was no vertical check
  // at all, and once the parent kebab is itself escaped (also `position:
  // fixed`, also reparented to `<body>`) the submenu's containing block
  // moves with it, so a flyout that fit its note card could still miss the
  // actual browser window. Reusing `.action-menu-escaped` (`position:
  // fixed`, the same z-index tier) plus this menu's own placement, computed
  // from the trigger's rect and clamped on both axes, fixes both at once:
  // this is why `openSubmenu`/`closeSubmenuState` below write the same
  // `_escapedHome`/`_escapedOpener` fields `restoreEscapedMenu` already
  // knows how to put back, rather than inventing a second bookkeeping
  // scheme `closeActionMenus`' own document-wide sweep would not see.
  const placeSubmenu = () => {
    const margin = 8;
    const anchor = trigger.getBoundingClientRect();
    submenu.style.marginLeft = "0";
    submenu.style.left = "0px";
    submenu.style.top = "0px";
    const box = submenu.getBoundingClientRect();
    let left = anchor.right + 8;
    let onLeft = false;
    if (left + box.width > window.innerWidth - margin) {
      left = anchor.left - 8 - box.width;
      onLeft = true;
    }
    left = Math.max(margin, left);
    let top = anchor.top;
    if (top + box.height > window.innerHeight - margin) {
      top = Math.max(margin, window.innerHeight - margin - box.height);
    }
    submenu.style.left = `${Math.round(left)}px`;
    submenu.style.top = `${Math.round(top)}px`;
    submenu.classList.toggle("submenu-left", onLeft);
  };

  const openSubmenu = () => {
    // Only one flyout open at a time, at this level or any sibling group;
    // a DOM search under `groupWrap.parentElement` cannot find a sibling's
    // flyout once it may live at `<body>`, so this is tracked directly.
    if (openGroupSubmenu && openGroupSubmenu !== submenu) closeSubmenuState(openGroupSubmenu);
    submenu.classList.remove("hidden");
    trigger.setAttribute("aria-expanded", "true");
    submenu.classList.remove("submenu-left");
    // Below phone-width the flyout positioning is dropped for an in-place
    // accordion (CSS media query); escaping it there would strand it at a
    // fixed viewport position while its own trigger scrolls underneath.
    if (window.innerWidth > 720) {
      submenu._escapedHome = { parent: submenu.parentElement, next: submenu.nextSibling };
      submenu._escapedOpener = trigger;
      document.body.appendChild(submenu);
      submenu.classList.add("action-menu-escaped");
      placeSubmenu();
    }
    openGroupSubmenu = submenu;
  };
  function closeSubmenuState(target) {
    target.classList.add("hidden");
    target._escapedOpener?.setAttribute("aria-expanded", "false");
    restoreEscapedMenu(target);
    target.style.marginLeft = "";
    target.classList.remove("submenu-left");
    if (openGroupSubmenu === target) openGroupSubmenu = null;
  }
  const closeSubmenu = () => closeSubmenuState(submenu);

  let hoverTimer = null;
  groupWrap.addEventListener("mouseenter", () => {
    clearTimeout(hoverTimer);
    hoverTimer = setTimeout(() => {
      openSubmenu();
      openedByHoverAt = Date.now();
    }, 120); // brief delay: a mouse crossing the item isn't a request to open it
  });
  groupWrap.addEventListener("mouseleave", () => {
    clearTimeout(hoverTimer);
    hoverTimer = setTimeout(closeSubmenu, 200); // outlives the diagonal move from the trigger into the flyout
  });
  // Once escaped, the submenu is a sibling of `groupWrap` at `<body>`, not
  // its descendant, so `groupWrap`'s own `mouseleave` above fires the
  // instant the pointer crosses onto the (still open) flyout: measured
  // live, the submenu closed under the cursor before a hovering mouse user
  // could ever reach a second-level item. These two mirror the pair above
  // so hovering the flyout itself also keeps it open.
  submenu.addEventListener("mouseenter", () => clearTimeout(hoverTimer));
  submenu.addEventListener("mouseleave", () => {
    hoverTimer = setTimeout(closeSubmenu, 200);
  });
  trigger.addEventListener("click", (event) => {
    event.stopPropagation();
    //: A click that lands just after the hover opened the flyout is the same
    //: request, not a second one: toggling there closed what the person had
    //: just reached for (measured on the map node menu).
    if (submenu.classList.contains("hidden")) openSubmenu();
    else if (Date.now() - openedByHoverAt > 600) closeSubmenu();
  });
  submenu.addEventListener("keydown", (event) => {
    const subItems = [...submenu.querySelectorAll(':scope > [role="menuitem"]')];
    const current = subItems.indexOf(document.activeElement);
    if (event.key === "ArrowDown") {
      event.preventDefault();
      subItems[(current + 1) % subItems.length]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      subItems[(current - 1 + subItems.length) % subItems.length]?.focus();
    } else if (event.key === "ArrowLeft" || event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation(); // don't also close the whole menu on ArrowLeft
      closeSubmenu();
      trigger.focus();
    }
  });
  trigger.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openSubmenu();
      submenu.querySelector('[role="menuitem"]')?.focus();
    }
  });

  groupWrap.append(trigger, submenu);
  return groupWrap;
}

function entryOverflowMenu(entry) {
  const wrap = document.createElement("span");
  wrap.className = "menu-wrap";

  const menu = document.createElement("div");
  menu.className = "action-menu hidden";
  menu.setAttribute("role", "menu");

  //: Same square-kebab rule as `kebabMenu` below: this is the *other* ⋯
  //: builder (note cards, built lazily on first open), and a rule applied to
  //: one of two implementations of the same control is how they drift.
  //:
  //: **And they had.** Reported: "the ellipse kebab icons in the notes on the
  //: your notes tab are not centred." `kebabMenu` draws `ph:dots-three`; this
  //: one drew the literal character `⋯` (U+22EF), and a text glyph is placed
  //: on the *font's* baseline inside a 19.2px line box centred in a 28px
  //: button: U+22EF sits at the em box's midline, which is above the line
  //: box's optical centre, so the dots rode high. No amount of flex centring
  //: fixes that: the box is centred correctly and the glyph is not centred
  //: within the box. The icon font's own glyph is drawn to fill its box, so
  //: using the same icon as the other builder fixes the centring and the
  //: drift in one go.
  const opener = smallButton("ph:dots-three", "More actions", () => {
    // The phone's action sheet, as `kebabMenu` opens (`openKebabSheet`).
    if (window.matchMedia(PHONE_ACTION_SHEET).matches && typeof openSheet === "function") {
      fillMenu();
      openKebabSheet(menu, opener, "Note actions");
      return;
    }
    const willOpen = menu.classList.contains("hidden");
    if (willOpen) {
      fillMenu();
      openActionMenu(menu, opener);
    } else closeActionMenus();
  });
  opener.classList.add("icon-only");
  opener.setAttribute("aria-haspopup", "menu");
  opener.setAttribute("aria-expanded", "false");

  // **Built on first open, not on render, and that is a scale fix rather than
  // a micro-optimisation.** This menu is 19 items across four groups, call it
  // 45-60 DOM nodes once the submenu wrappers, icon `<i>`s and label `<span>`s
  // are counted: and `entryItem()` builds one of these for *every* note card.
  // The Notes list renders the whole notebook (there is no windowing), so a
  // 2,500-note notebook built well over a hundred thousand permanently-hidden
  // nodes, and rebuilt all of them on every `renderEntries()`, which runs on
  // every search keystroke, every sort change, every filter and every save.
  //
  // Almost none of it is ever looked at: a person opens the ⋯ menu on one note
  // at a time, if at all. Deferring the items costs one function call on the
  // first open and nothing after.
  //
  // The opener itself still renders eagerly, deliberately, it carries the
  // `aria-haspopup`/`aria-expanded` state and it occupies a place in the tab
  // order, so making *it* lazy would change focus behaviour. Only the contents
  // are deferred, and `openActionMenu` is called after `fillMenu()` so it still
  // finds a first item to focus.
  let filled = false;
  function fillMenu() {
    if (filled) return;
    filled = true;
    // Kept flat: the three actions used often enough, or serious enough (a
    // delete), that burying them a level down would cost more than the
    // grouping below saves. Everything else groups into three side flyouts, 
    // asked for directly, to cut what had grown into a 15-item flat list.
    const topLevel = [
      // Direct instruction: a way into multi-select from the row itself,
      // not only the toolbar's own "Select" button: which is real and
      // already works, but requires knowing it exists and is above the
      // list rather than on the note someone actually wants to start
      // selecting from. Reuses that exact same mode (`enterSelectMode`,
      // `selectedIds`) rather than inventing a second one, and seeds it
      // with this note already checked, so choosing "Select" here is a
      // head start rather than an empty selection identical to the
      // toolbar button's own.
      {
        label: "ph:check-square Select",
        title: "Start selecting multiple notes, beginning with this one",
        run: () => {
          enterSelectMode();
          selectedIds.add(entry.id);
          updateBatchCount();
          renderEntries();
        },
      },
      {
        label: entry.is_private ? "ph:lock-open Make readable" : "ph:lock Make private",
        title: entry.is_private
          ? "Decrypt this note so search and Atlas can use it again"
          : "Encrypt this note at rest, and keep it out of search and Atlas",
        run: () => toggleEntryPrivacy(entry),
      },
      {
        // Sits above History because it is the more common question by far:
        // "what else is this about?" is asked of a note every time it is
        // read, and "what did it used to say?" only when something looks
        // wrong.
        label: "ph:graph Connections",
        title: "Everything this note is joined to, links both ways, documents, boards and files",
        // The note's own title when it wrote one, and its first words
        // otherwise: `notePreviewText` alone hands back both lines of a
        // titled note ("Probe A\nrelates to sourdough"), which reads as
        // two sentences jammed together on one line of the dialog.
        run: () =>
          openConnections(
            "entries",
            entry.id,
            entry.title || clipText(notePreviewText(entry.content).split("\n")[0], 80)
          ),
      },
      {
        label: "ph:clock-counter-clockwise History",
        title: "See earlier versions of this note, and put one back",
        run: () => openEntryHistory(entry),
      },
      // BACKLOG.md §95 item D.14: "Full export exists. There is no way to
      // hand one note to someone." Same route shape and same "download,
      // not navigate" pattern the Documents kebab's own "Download .md"
      // already uses (library.js).
      {
        label: "ph:download-simple Download .md",
        title: "Save a copy of this note as a markdown file",
        run: () => downloadFromApi(`/entries/${entry.id}/export.md`, "note.md"),
      },
    ];

    const aiItems = [
      {
        //: **Named for what it does, not for what it is called internally**
        //: (INBOX 292, the owner: "i feel like it is more than just
        //: re-evaluating, and it is hidden away"). The route re-files the
        //: note, refreshing its confidence and its category unless the person
        //: filed it themselves, *and* suggests tags and links for them to
        //: apply. "Re-evaluate" named the smallest part of that, and tags,
        //: the part it is actually reached for, were not in the name at all.
        label: "ph:sparkle Tag and file with Atlas",
        title: "Atlas re-reads the note, suggests tags and links, and may refile it",
        run: () => reevaluateEntry(entry),
      },
      {
        label: "ph:magic-wand Improve writing",
        title: "Proofread or rewrite this note with AI",
        run: () => {
          editingId = entry.id;
          renderEntries();
          // The edit textarea now exists, improve it in place.
          const box = document.querySelector(`#entry-list li[data-id="${entry.id}"] textarea`);
          if (box) openImprove(box);
        },
      },
      {
        // Recognising a title the note already wrote (a leading `# Heading`)
        // is free; writing one costs a real model call, so it's this
        // separate, on-request action rather than something automatic.
        label: entry.title ? "ph:magic-wand Regenerate title" : "ph:magic-wand Generate title",
        title: "Write a short title for this note with AI",
        run: () => generateEntryTitle(entry),
      },
      ...(entry.title
        ? [
            {
              label: "ph:x Remove title",
              title: "Take the title back out, the note's text is unchanged",
              run: () => removeEntryTitle(entry),
            },
          ]
        : []),
    ];

    const connectItems = [
      {
        label: "ph:file-text Add to a document",
        title: "Attach this note to a document you have already started",
        run: () => {
          inlineAction = inlineActionIs(entry.id, "document")
            ? null
            : { id: entry.id, kind: "document" };
          renderEntries();
        },
      },
      {
        //: INBOX 246's first sentence. Next to "Add to a document" because
        //: it is the same act on the other kind of surface, and the note
        //: stays exactly where it is either way.
        label: "ph:squares-four Add to a board or map",
        title: "Put this note on a whiteboard or a mind map",
        run: () => {
          inlineAction = inlineActionIs(entry.id, "board")
            ? null
            : { id: entry.id, kind: "board" };
          renderEntries();
        },
      },
      {
        label: "ph:file-text Expand into a document",
        title: "Start a document from this note, the note stays where it is",
        run: () => expandNoteIntoDocument(entry),
      },
      { label: "ph:link Link to another", run: () => beginOrCompleteLink(entry) },
      { label: "ph:approximate-equals Similar notes", run: () => toggleRelated(entry) },
      {
        label: "ph:arrow-u-up-left Referenced by",
        title: "Documents, notes, boards and maps that point at this note",
        run: () => toggleReferences(entry),
      },
      {
        label: "ph:hourglass-medium Forgotten notes like this",
        title: "Notes you have not looked at in a long time that are close to this one",
        run: () => toggleFaded(entry),
      },
      //: **The note's two other homes, one press away** (INBOX 393: "there
      //: needs to be more integration between all the main features"). The
      //: menu could put a note on a board, in a document and in a reminder,
      //: and could not take it to the graph that draws it or to the chat that
      //: answers about it.
      {
        label: "ph:graph Show in graph",
        title: "Open the graph centred on this note, its links lit",
        run: () => showNoteInGraph(entry.id),
      },
      {
        label: "ph:chat-circle Ask Atlas about this note",
        title: "Start a chat about this note and what it connects to",
        run: () => askAtlasAboutNote(entry),
      },
      {
        label: "ph:translate Translate",
        title: "Open this note in Write with Atlas, set to translate",
        run: () => translateNoteInDesk(entry),
      },
    ];

    const addItems = [
      {
        label: "ph:copy Duplicate",
        title: "Make a copy of this note, opens ready to edit",
        run: async () => {
          closeActionMenus();
          try {
            const copy = await apiJson("/entries", {
              method: "POST",
              body: JSON.stringify({
                content: entry.content,
                title: entry.title ? `${entry.title} (Copy)` : undefined,
                category: entry.category,
                tags: entry.tags || [],
              }),
            });
            await loadEntries();
            // Open the new note in edit mode straight away.
            if (copy && copy.id) {
              editingId = copy.id;
              renderEntries();
              flashEntry(copy.id);
            }
            toast("Note duplicated.");
          } catch (err) {
            toast(err.message || "Couldn't duplicate note.", true);
          }
        },
      },
      {
        label: "ph:plus Add context",
        title: "Append detail: Atlas may refile it",
        run: () => {
          inlineAction = inlineActionIs(entry.id, "context") ? null : { id: entry.id, kind: "context" };
          renderEntries();
        },
      },
      {
        label: "ph:arrow-bend-down-right Continue thought",
        title: "Start or extend a thread from this note",
        run: () => {
          inlineAction = inlineActionIs(entry.id, "continue") ? null : { id: entry.id, kind: "continue" };
          renderEntries();
        },
      },
      {
        label: "ph:alarm Remind me",
        run: () => {
          inlineAction = inlineActionIs(entry.id, "remind") ? null : { id: entry.id, kind: "remind" };
          renderEntries();
        },
      },
      { label: "ph:paperclip Attach a file", run: () => attachFileTo(entry) },
      { label: "ph:images-square Attach from Library", run: () => attachFromLibrary(entry) },
    ];

    // Not destructive, so not grouped with "danger" below: but visually
    // adjacent to it (asked for directly: a way to keep a note but get it
    // out of the way, distinct from binning it) so the two "get this off my
    // list" actions sit together rather than one being buried in a group.
    const archive = entry.archived_at
      ? {
          label: "ph:arrow-u-up-left Unarchive",
          title: "Bring this note back into your notebook",
          run: async () => {
            await apiJson(`/entries/${entry.id}/unarchive`, { method: "POST" });
            await loadEntries();
            toast("Unarchived.");
          },
        }
      : {
          label: "ph:archive Archive",
          title: "Keep it, but out of the way, not the bin",
          run: async () => {
            await apiJson(`/entries/${entry.id}/archive`, { method: "POST" });
            await loadEntries();
            toast("Archived.");
          },
        };

    const danger = {
      label: "ph:trash Move to bin",
      danger: true,
      run: () => binNoteWithUndo(entry),
    };

    //: Three groups, broken by the same hairline `kebabMenu` draws for a
    //: grouped menu (DESIGN.md: past five rows a menu is grouped): what you
    //: do to this note, the three families that open further, and the two
    //: that put it away. Ten rows read as one list before this (menus.js).
    const rule = () => {
      const sep = document.createElement("div");
      sep.className = "menu-sep";
      sep.setAttribute("role", "separator");
      return sep;
    };
    for (const item of topLevel) menu.appendChild(buildMenuItemButton(item));
    menu.appendChild(rule());
    menu.appendChild(buildMenuGroupButton("ph:magic-wand AI actions", aiItems));
    menu.appendChild(buildMenuGroupButton("ph:link Connect", connectItems));
    menu.appendChild(buildMenuGroupButton("ph:plus Add", addItems));
    menu.appendChild(rule());
    menu.appendChild(buildMenuItemButton(archive));
    menu.appendChild(buildMenuItemButton(danger));
  }

  wireMenuKeyboard(menu, opener);

  wrap.append(opener, menu);
  return wrap;
}

// The Add context / continue / remind boxes inside an entry card.
// Ask the AI to re-evaluate one note, then show its suggestions inline.
async function reevaluateEntry(entry) {
  closeActionMenus();
  toast("Atlas is reading this note…");
  // Show a spinner on this exact card while the AI works.
  busyEntryId = entry.id;
  renderEntries();
  try {
    const result = await apiJson(`/entries/${entry.id}/reevaluate`, { method: "POST" });
    // If the confidence actually changed, flash the badge on the next render.
    const newConfidence = result.entry ? result.entry.ai_confidence : null;
    if (newConfidence !== null && newConfidence !== entry.ai_confidence) {
      flashConfidenceId = entry.id;
    }
    inlineAction = { id: entry.id, kind: "reevaluate", data: result };
    busyEntryId = null;
    await loadEntries(); // reflect the refreshed confidence/category, then show suggestions
  } catch (error) {
    busyEntryId = null;
    renderEntries();
    toast(error.message || "Atlas could not read this note.", true);
  }
}

// The inline result of a re-evaluate: new confidence, plus tag and link
// suggestions the user applies with a click (nothing is applied on its own).
function renderReevaluateResult(entry, wrap) {
  const data = inlineAction.data;
  const confidence = data.entry ? data.entry.ai_confidence : entry.ai_confidence;

  const head = document.createElement("p");
  head.className = "muted";
  head.textContent = data.recategorised_to
    ? `Read: confidence ${confidence}%, moved to “${data.recategorised_to}”.`
    : `Read: confidence now ${confidence}%.`;
  wrap.appendChild(head);

  // Drop suggestions the user already applied (the card re-renders after each).
  const haveTags = new Set(entry.tags);
  const linkedIds = new Set((entry.links || []).map((l) => l.entry_id));
  const tags = (data.suggested_tags || []).filter((t) => !haveTags.has(t));
  const links = (data.suggested_links || []).filter((l) => !linkedIds.has(l.id));

  if (tags.length) {
    const tagRow = document.createElement("div");
    tagRow.className = "recent";
    const label = document.createElement("span");
    label.className = "muted";
    label.textContent = "Add tags:";
    tagRow.appendChild(label);
    for (const tag of tags) {
      const tagChip = chip(`ph:plus ${tag}`, "tag", async () => {
        try {
          await api(`/entries/${entry.id}`, {
            method: "PUT",
            body: JSON.stringify({ tags: [...entry.tags, tag] }),
          });
          tagChip.remove();
          toast(`Tagged “${tag}”.`);
          loadEntries();
        } catch (error) {
          toast(error.message, true);
        }
      });
      tagChip.title = `Add the “${tag}” tag`;
      tagRow.appendChild(tagChip);
    }
    wrap.appendChild(tagRow);
  }

  if (links.length) {
    const label = document.createElement("p");
    label.className = "muted";
    label.textContent = "Link to related notes:";
    wrap.appendChild(label);
    for (const link of links) {
      const row = document.createElement("div");
      row.className = "row space-between reevaluate-link";
      const preview = document.createElement("span");
      renderInlineMarkdown(preview, link.preview, [], true);
      row.appendChild(preview);
      row.appendChild(
        smallButton("ph:link Link", "Link these two notes", async () => {
          try {
            const updated = await apiJson(`/entries/${entry.id}/links`, {
              method: "POST",
              body: JSON.stringify({ target_id: link.id }),
            });
            row.remove();
            toast("Notes linked.");
            loadEntries();
            let liveLinkId = updated.links.find((l) => l.entry_id === link.id)?.link_id;
            pushUndo(
              "Linked two notes",
              async () => {
                if (liveLinkId == null) return;
                await api(`/entries/${entry.id}/links/${liveLinkId}`, { method: "DELETE" });
                await loadEntries();
              },
              async () => {
                const redone = await apiJson(`/entries/${entry.id}/links`, {
                  method: "POST",
                  body: JSON.stringify({ target_id: link.id }),
                });
                liveLinkId = redone.links.find((l) => l.entry_id === link.id)?.link_id ?? liveLinkId;
                await loadEntries();
              }
            );
          } catch (error) {
            toast(error.message, true);
          }
        })
      );
      wrap.appendChild(row);
    }
  }

  if (!tags.length && !links.length) {
    const none = document.createElement("p");
    none.className = "muted";
    none.textContent = "No new tags or links to suggest right now.";
    wrap.appendChild(none);
  }

  wrap.appendChild(
    smallButton("Done", "Close", () => {
      inlineAction = null;
      renderEntries();
    })
  );
}

function renderInlineAction(entry) {
  const wrap = document.createElement("div");
  wrap.className = "inline-action";

  if (inlineAction.kind === "reevaluate") {
    renderReevaluateResult(entry, wrap);
    return wrap;
  }

  if (inlineAction.kind === "document") {
    renderAttachToDocument(entry, wrap);
    return wrap;
  }

  if (inlineAction.kind === "board") {
    renderAttachToBoard(entry, wrap);
    return wrap;
  }

  if (inlineAction.kind === "remind") {
    const preview = entry.content.length > 40 ? entry.content.slice(0, 39) + "…" : entry.content;
    const textInput = document.createElement("input");
    textInput.type = "text";
    textInput.value = `Follow up: ${preview}`;
    const dueInput = document.createElement("input");
    dueInput.type = "datetime-local";
    dueInput.value = defaultDueValue();
    const row = document.createElement("div");
    row.className = "row";
    row.appendChild(
      smallButton("Set reminder", "", async () => {
        if (await addReminder(textInput.value.trim(), dueInput.value, entry.id)) {
          inlineAction = null;
          renderEntries();
        }
      }, false)
    );
    row.appendChild(
      smallButton("Cancel", "", () => {
        inlineAction = null;
        renderEntries();
      })
    );
    wrap.append(textInput, dueInput, row);
    setTimeout(() => textInput.focus(), 0);
    return wrap;
  }

  const isContext = inlineAction.kind === "context";

  const textarea = document.createElement("textarea");
  textarea.rows = 2;
  textarea.placeholder = isContext
    ? "Add detail: Atlas re-reads the whole note and may refile it…"
    : "Continue this train of thought…";
  wrap.appendChild(textarea);

  const row = document.createElement("div");
  row.className = "row";
  row.appendChild(
    smallButton(
      isContext ? "Add context" : "Add to thread",
      "",
      async () => {
        const text = textarea.value.trim();
        if (!text) return;
        try {
          if (isContext) {
            const updated = await apiJson(`/entries/${entry.id}/context`, {
              method: "POST",
              body: JSON.stringify({ text }),
            });
            toast(
              updated.category === entry.category
                ? `Context added: still filed under “${updated.category}”.`
                : `Context added: refiled under “${updated.category}”.`
            );
          } else {
            await apiJson("/entries", {
              method: "POST",
              body: JSON.stringify({ content: text, parent_id: entry.id }),
            });
            toast("Thread continued.");
          }
          inlineAction = null;
          await loadEntries();
        } catch (error) {
          toast(error.message, true);
        }
      },
      false
    )
  );
  row.appendChild(
    smallButton("Cancel", "", () => {
      inlineAction = null;
      renderEntries();
    })
  );
  wrap.appendChild(row);
  setTimeout(() => textarea.focus(), 0);
  return wrap;
}

function attachFileTo(entry) {
  const input = document.createElement("input");
  input.type = "file";
  // The backend already accepts one attachment per POST and a note already
  // renders any number of them, the only thing missing was the picker
  // itself only ever taking `files[0]`, silently dropping a multi-select.
  input.multiple = true;
  input.addEventListener("change", async () => {
    const files = [...input.files];
    if (!files.length) return;
    let failures = 0;
    for (const file of files) {
      const form = new FormData();
      form.append("file", file);
      // Raw fetch: multipart must NOT get the JSON content-type header.
      const response = await fetch(`/entries/${entry.id}/files`, {
        method: "POST",
        // X-Workspace-ID alongside X-Auth-Token: a raw fetch (multipart body,
        // so it cannot go through api()/apiJson()) does not get either header
        // for free the way every JSON call in this file does.
        headers: { "X-Auth-Token": authToken(), "X-Workspace-ID": activeSpaceId() },
        body: form,
      });
      if (!response.ok) {
        failures++;
        const detail = await response.json().catch(() => ({}));
        toast(detail.detail || `${file.name}: upload failed (${response.status})`, true);
      }
    }
    const attached = files.length - failures;
    if (attached > 0) {
      toast(attached === 1 ? `Attached ${files[0].name}.` : `Attached ${attached} files.`);
    }
    await loadEntries();
  });
  input.click();
}

// The Library's other half of "upload directly, attach later", asked for
// directly. `attachFileTo` above always opens a fresh disk picker; this
// instead offers whatever already lives in the Library's image/PDF gallery
// (MediaUpload: GET /media), so an image uploaded once doesn't need
// re-uploading onto every note that wants it. Note attachments (Attachment,
// PDFs, docs, audio: attachFileTo's own domain) have no "floating, not yet
// attached to anything" state to pick from, so this is images/PDFs only,
// same as the Library gallery itself.
async function attachFromLibrary(entry) {
  const images = await apiJson("/media", { silent: true }).catch(() => null);
  if (!images) {
    toast("Couldn't load the Library gallery.", true);
    return;
  }
  if (!images.length) {
    toast("Nothing in the Library gallery yet, upload one from Library → Files & Images first.", true);
    return;
  }

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay library-attach-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Attach from Library");

  const card = document.createElement("div");
  card.className = "card modal-card";
  const head = document.createElement("div");
  head.className = "row space-between library-head";
  const title = document.createElement("h2");
  title.textContent = "Attach from Library";
  const close = document.createElement("button");
  close.type = "button";
  close.className = "ghost small";
  close.setAttribute("aria-label", "Close");
  setLabel(close, "ph:x");
  head.append(title, close);
  const hint = document.createElement("p");
  hint.className = "muted";
  hint.textContent = "Pick an image or PDF already in the Library to attach it to this note.";
  const grid = document.createElement("div");
  grid.className = "library-image-grid library-attach-grid";

  const done = () => {
    document.removeEventListener("keydown", onKey, true);
    overlay.remove();
  };
  const onKey = (event) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      done();
    }
  };
  close.addEventListener("click", done);
  wireBackdropClose(overlay, () => done());
  document.addEventListener("keydown", onKey, true);

  const isPdf = (url) => /\.pdf$/i.test(url);
  for (const image of images) {
    const fig = document.createElement("figure");
    fig.className = "library-image-tile";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "library-attach-pick";
    button.title = `Attach “${image.original_name}”`;
    if (isPdf(image.url)) {
      const icon = document.createElement("i");
      icon.className = "ph ph-file-pdf";
      icon.setAttribute("aria-hidden", "true");
      button.appendChild(icon);
    } else {
      const img = document.createElement("img");
      img.src = mediaSrc(image.url);
      img.alt = "";
      img.loading = "lazy";
      button.appendChild(img);
    }
    button.addEventListener("click", async () => {
      const markdown = isPdf(image.url)
        ? `[${image.original_name}](${image.url})\n`
        : `![${image.original_name}](${image.url})\n`;
      const nextContent = `${entry.content.trim()}\n\n${markdown}`.trim();
      try {
        await apiJson(`/entries/${entry.id}`, {
          method: "PUT",
          body: JSON.stringify({ content: nextContent }),
        });
        toast(`Attached ${image.original_name}.`);
        done();
        await loadEntries();
        pushEntryPutUndo(
          entry.id,
          `Attached ${image.original_name}`,
          { content: entry.content },
          { content: nextContent }
        );
      } catch (error) {
        toast(error.message || "Couldn't attach that file.", true);
      }
    });
    const cap = document.createElement("figcaption");
    cap.textContent = image.original_name;
    cap.title = image.original_name;
    fig.append(button, cap);
    grid.appendChild(fig);
  }

  card.append(head, hint, grid);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
  close.focus();
}

// Thumbnails need the auth header, which <img src> can't send: fetch
// the bytes once per attachment and cache an object URL (Wave M).
const thumbUrlCache = new Map();

async function attachmentObjectUrl(attachment) {
  if (thumbUrlCache.has(attachment.id)) return thumbUrlCache.get(attachment.id);
  const response = await api(`/files/${attachment.id}`);
  const url = URL.createObjectURL(await response.blob());
  thumbUrlCache.set(attachment.id, url);
  return url;
}

//: **Who wrote a caption, in words** (the owner, 2026-09-24). `caption_model` names the
//: author of a caption: a vision or utility model, or `APP_CAPTION_AUTHOR`
//: when the app wrote it itself (a board export's "Part of the mind map ...,
//: exported from MemoryMap", stored with `source: "app"` by routes_files.py).
//: That one is "Written by", not "Described by": nothing looked at the
//: picture. The lightbox byline and the Library card both read this, so the
//: same picture says the same thing in both places. `short` is the Library
//: card's own shortener for a long model name.
const APP_CAPTION_AUTHOR = "MemoryMap";
function captionCredit(model, short = (name) => name) {
  return model === APP_CAPTION_AUTHOR
    ? `Written by ${APP_CAPTION_AUTHOR}`
    : `Described by ${short(model)}`;
}

// Full-size image viewer: click anywhere or press Esc to close (Wave M).
// `items` is every image this click can page through, e.g. all the image
// attachments on the same note, as `{filename, getUrl}`, `getUrl` being a
// (possibly async) thunk so unopened images aren't fetched until reached.
// `startIndex` is which one was clicked; a single image is just a one-item
// list. Reported directly: click-anywhere-to-close alone isn't discoverable,
// so there's now an explicit close button too, both still work.
//: `opts.focusReading` opens the dialog *at the reading* rather than at the
//: top of the file, Phase 7.5's "an 'Open reading' action that opens the
//: lightbox at the reading". On a tall document the info panel is below the
//: fold, so a plain open lands the reader on a page and leaves them to find
//: the text they asked for.
function openLightbox(items, startIndex = 0, opts = {}) {
  let index = startIndex;
  const overlay = document.createElement("div");
  overlay.className = "lightbox";
  // Not decoration: this is what puts the lightbox inside `activeOverlay()`'s
  // reach (see its comment), and it is what a screen reader needs to announce
  // the thing as a dialog rather than as a stray region.
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Image viewer");
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-label", "Image preview");

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "lightbox-close";
  closeBtn.setAttribute("aria-label", "Close");
  // A raw "×" character, not an icon-font glyph, reported live as still
  // off-centre even inside the `display:grid;place-items:center` box that
  // fixed every *padding*-driven case of this: `place-items` centres the
  // line box, not necessarily where a font renders that specific character's
  // ink within it, and that varies by system font. Every other close button
  // in the app already uses the ph:x icon glyph for exactly this reason, 
  // matching it here fixes the centring and the inconsistency together.
  setLabel(closeBtn, "ph:x");

  const img = document.createElement("img");
  const broken = document.createElement("p");
  broken.className = "lightbox-broken hidden";
  const meta = document.createElement("div");
  meta.className = "lightbox-meta";

  // What the app knows *about* the picture, shown with the picture. Asked for
  // directly: "if clicking on an image to view expand it in the lightbox…can
  // the captions and ocr accompany it somehow??", before this, the caption a
  // vision model wrote and the text it read off the page existed only on the
  // Library tile, which is the one view too small to read them in. Optional
  // per item (`caption`, `text`, and their bylines): every other caller
  // passes only `{filename, getUrl}` and gets exactly what it got before.
  // Mirrors `syncCaptionBadge` on the Library tile (library.js) exactly, so
  // the same picture says the same thing in both places: which model wrote
  // the description, and whether a person has since changed it.
  const captionBylineFor = (row) => {
    if (!row || !row.caption) return "";
    const parts = [];
    if (row.caption_model) parts.push(captionCredit(row.caption_model));
    if (row.caption_edited) parts.push(row.caption_model ? "edited" : "typed by hand");
    return parts.join(" · ");
  };

  const info = document.createElement("div");
  info.className = "lightbox-info hidden";
  const infoCaption = document.createElement("p");
  infoCaption.className = "lightbox-caption";
  // Who wrote the caption. Reported directly: "there is also no 'text read
  // by' line in the lightbox for the image captions, only the ocr", the
  // Library tile has carried a caption byline (`captionBadge`, library.js)
  // since captions could be edited by hand, and only the lightbox was
  // missing its half, so the same picture named its transcriber but not its
  // describer.
  const infoCaptionByline = document.createElement("p");
  infoCaptionByline.className = "lightbox-byline";
  const infoText = document.createElement("p");
  infoText.className = "lightbox-text";
  const infoByline = document.createElement("p");
  infoByline.className = "lightbox-byline";
  //: The second reader's answer to the same question, under the first one's,
  //: in the same two elements the first one uses: see `lightboxReadingsFor`
  //: for why it is here at all and why it is not a toggle. Both are hidden
  //: together, so a picture with one reading looks exactly as it did.
  const infoAltText = document.createElement("p");
  infoAltText.className = "lightbox-text lightbox-alt-text";
  const infoAltByline = document.createElement("p");
  infoAltByline.className = "lightbox-byline";
  //: **Each reading can be deleted where it is shown** (INBOX 421 e, the
  //: owner: "I cant delete the ocr entry in ... the lightbox"). The OCR
  //: workspace had a Delete reading and this panel, the other place a reading
  //: is read, had none, so a wrong one (a model's "Test, Test, Test" loop)
  //: could only be removed by opening the workspace. One trash button at the
  //: end of each reading's byline, clearing that reading's own field
  //: (`textSource`/`altSource` from `lightboxReadingsFor`), confirmed first,
  //: the workspace's own wording. Only for a picture with a media row: a url
  //: with nothing behind it has nothing to delete.
  const readingDelete = (which) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ghost small icon-only danger lightbox-reading-delete hidden";
    button.title = "Delete this reading";
    button.setAttribute("aria-label", "Delete this reading");
    setLabel(button, "ph:trash");
    button.addEventListener("click", async (event) => {
      event.stopPropagation();
      //: Held before the first `await`: `currentTarget` is gone once the
      //: click's dispatch ends (the workspace's own Delete reading lost its
      //: button that way, 6e072b2).
      const self = event.currentTarget;
      const item = lightboxInfoItem || items[index];
      const source = which === "alt" ? item?.altSource : item?.textSource;
      const id = lightboxMediaId(item);
      if (!item || !source || !id) return;
      const whose = source === "vision" ? "the vision model's" : "Tesseract's";
      if (!(await confirmDialog(`Delete ${whose} reading of this image? You can read it again any time.`))) return;
      self.disabled = true;
      try {
        const updated = await apiJson(`/media/${id}/${source === "vision" ? "vision-ocr" : "ocr"}`, {
          method: "POST",
          body: JSON.stringify({ text: "" }),
        });
        Object.assign(item, lightboxReadingsFor(updated));
        if (overlay.isConnected) renderInfo(item, true);
        if (typeof loadLibrary === "function") loadLibrary();
        toast("Reading deleted.");
      } catch (err) {
        toast(err.message || "Could not delete that reading.", true);
      } finally {
        self.disabled = false;
      }
    });
    return button;
  };
  const infoTextDelete = readingDelete("text");
  const infoAltDelete = readingDelete("alt");
  const bylineRow = (byline, remove) => {
    const row = document.createElement("div");
    row.className = "lightbox-byline-row";
    row.append(byline, remove);
    return row;
  };
  // Dimensions, when it was added, the filename, the "other info about it"
  // half of the request. First, because it is the line that says *which*
  // picture this is; the readings below it are about what is in it.
  const infoFacts = document.createElement("p");
  infoFacts.className = "lightbox-facts";
  //: **What only a document has** (UI_MODERNISATION_PLAN Phase 7.1). Reported:
  //: "the lightbox needs improving for file and pdf previews, no sections or
  //: info are below it really compared to the images." An image already got
  //: facts, caption, reading and bylines under it; a PDF got the pages and
  //: nothing else: and the three things a *document* can say that a
  //: photograph cannot (how many pages it has, which of them have been read,
  //: and which one you are looking at) had nowhere to be said.
  //:
  //: One row of `.chip`s, one per page, in the panel that already exists, 
  //: not a second info block. A chip is a page: it says whether that page has
  //: a stored reading, and clicking it scrolls the pages column to it, which
  //: is also what makes "open the reader at *this* page" a meaningful offer.
  const infoPages = document.createElement("div");
  infoPages.className = "row lightbox-pages hidden";
  info.append(
    infoFacts,
    infoPages,
    infoCaption,
    infoCaptionByline,
    infoText,
    bylineRow(infoByline, infoTextDelete),
    infoAltText,
    bylineRow(infoAltByline, infoAltDelete)
  );
  //: The media row a reading can be deleted from: the Library's own items
  //: carry it as `id` (and a document as `kind`, which has no such row); a
  //: picture opened from a note or a chat learns it from `/media/meta`.
  function lightboxMediaId(item) {
    if (!item || item.kind) return null;
    return item.id || item.metaId || null;
  }
  //: Shown only beside a reading that is on screen and deletable. Not on a
  //: document's page: that text is the page's own `PageRead`, deleted from
  //: the workspace, not a field of the file.
  function syncReadingDeletes(item, { text = "", alt = "", perPage = false } = {}) {
    const id = lightboxMediaId(item);
    infoTextDelete.classList.toggle("hidden", perPage || !id || !text || !item?.textSource);
    infoAltDelete.classList.toggle("hidden", perPage || !id || !alt || !item?.altSource);
  }

  //: Drawn from one place, because both `show()` and `renderInfo` paint this
  //: panel and a second reading left behind by the previous picture is worse
  //: than never showing one at all.
  function renderAltReading(text, byline) {
    const alt = (text || "").trim();
    infoAltText.textContent = alt;
    infoAltText.classList.toggle("hidden", !alt);
    infoAltByline.textContent = alt ? byline || "" : "";
    infoAltByline.classList.toggle("hidden", !alt || !byline);
  }
  // Clicking the panel must not dismiss the dialog, someone selecting a line
  // of transcribed text to copy is the whole reason it is here.
  info.addEventListener("click", (e) => e.stopPropagation());

  const prevBtn = document.createElement("button");
  prevBtn.type = "button";
  prevBtn.className = "lightbox-nav lightbox-prev";
  prevBtn.setAttribute("aria-label", "Previous image");
  setLabel(prevBtn, "ph:caret-left");

  const nextBtn = document.createElement("button");
  nextBtn.type = "button";
  nextBtn.className = "lightbox-nav lightbox-next";
  nextBtn.setAttribute("aria-label", "Next image");
  setLabel(nextBtn, "ph:caret-right");

  // **The arrows are centred by the layout now, not by a measurement.**
  //
  // They used to be `position: fixed` at `top: 50%`, which is the viewport's
  // centre and not the image's; a previous fix measured the image's rendered
  // box on every `show()` and wrote a `top` back. That worked while the
  // lightbox was one centred stack, and stopped working the moment it grew a
  // scrollable info panel: reported with a screenshot of both arrows sitting
  // level with the top edge of the picture.
  //
  // The fix is structural: the image and the two arrows share a positioned
  // wrapper, so `top: 50%; translateY(-50%)` is the middle of the *image*, at
  // every size, at every scroll offset, with no JS and nothing to keep in
  // sync. `positionNav`, its `resize` listener and its two callers are gone.
  const stage = document.createElement("div");
  stage.className = "lightbox-stage";

  // **The actions bar.** Asked for directly: "improve on and expand the
  // capabilities and features at the bottom of the lightbox". Until now the
  // lightbox was purely an *information* surface, filename, dimensions,
  // caption, OCR text: with no action on it at all, which meant the one
  // place you are actually looking at a picture was the one place you could
  // not do anything to it.
  //
  // Everything here works from what `openLightbox` already receives, so it
  // lights up for **every** caller (notes, chat, graph, dashboard, library)
  // rather than only the Library's richer items. Actions that need a media
  // id, describe with AI, re-run OCR, rename, delete, are deliberately
  // not here: no caller passes one today, and inventing a half-working row
  // that only the Library populates is the "two buttons guaranteed to fail"
  // shape this project has already rejected once on the whiteboard menu.
  const actions = document.createElement("div");
  actions.className = "lightbox-actions";
  actions.addEventListener("click", (e) => e.stopPropagation());

  // Zoom is the gap that mattered most: a lightbox that cannot magnify is
  // just a bigger thumbnail, and the OCR panel below is often the only way
  // to read text in a picture precisely because you could not zoom into it.
  let zoom = 1;
  const ZOOM_MIN = 1;
  const ZOOM_MAX = 6;
  const zoomLabel = document.createElement("span");
  zoomLabel.className = "muted lightbox-zoom-label";
  // A single image is the usual target; a PDF shown as pages (pdfPages,
  // below) is a second one, added when PDFs stopped being AI-text-only, 
  // "or zoom. a lot of controls are missing," reported live once pages
  // started rendering. Same zoom state and the same three buttons drive
  // both; only which element the transform lands on, and which container's
  // scroll resets on "Fit", differ.
  const zoomTarget = () => (!pdfPages.classList.contains("hidden") ? pdfPages : img);
  const scrollTarget = () => (!pdfPages.classList.contains("hidden") ? doc : stage);
  const applyZoom = () => {
    const target = zoomTarget();
    target.style.transform = zoom === 1 ? "" : `scale(${zoom})`;
    // Set on the stage too, a multi-page column has no single element
    // whose own hover state would otherwise flip the grab cursor.
    target.classList.toggle("zoomed", zoom > 1);
    stage.classList.toggle("zoomed", zoom > 1);
    zoomLabel.textContent = `${Math.round(zoom * 100)}%`;
    // Only grab-able once there is something to pan to.
    //: **Only when it is not already there** (INBOX 424f). `show()` sets the
    //: zoom back to fit for every picture, so paging through a gallery called
    //: `scrollTo` on every press, and a `scrollTo` against a stage whose
    //: picture was just swapped is a forced layout: measured at 4x CPU, 375ms
    //: of five next/previous presses, for a stage that was already at its
    //: origin. `scrolledAway` is kept by the scroll listeners below, so the
    //: question costs no layout read.
    if (zoom === 1) {
      const scroller = scrollTarget();
      if (scrolledAway.has(scroller)) {
        scroller.scrollTo({ left: 0, top: 0 });
        scrolledAway.delete(scroller);
      }
    }
  };
  //: Which of the two scrollers is somewhere other than its top-left corner,
  //: from their own scroll events (a pan, a scrollbar, a wheel, the browser
  //: clamping after the content changed), read when the event fires, when
  //: layout is already clean.
  const scrolledAway = new WeakSet();
  const trackScrolledAway = (el) => {
    el.addEventListener(
      "scroll",
      () => {
        if (el.scrollLeft || el.scrollTop) scrolledAway.add(el);
        else scrolledAway.delete(el);
      },
      { passive: true }
    );
  };
  trackScrolledAway(stage);
  const setZoom = (next) => {
    zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(next * 100) / 100));
    applyZoom();
  };
  const actionBtn = (label, title, fn) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "ghost small lightbox-action";
    b.title = title;
    setLabel(b, label);
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      fn(b);
    });
    actions.appendChild(b);
    return b;
  };

  const zoomOutBtn = actionBtn("ph:magnifying-glass-minus", "Zoom out", () => setZoom(zoom - 0.5));
  actions.appendChild(zoomLabel);
  const zoomInBtn = actionBtn("ph:magnifying-glass-plus", "Zoom in", () => setZoom(zoom + 0.5));
  const resetBtn = actionBtn("ph:arrows-in Fit", "Back to fit", () => setZoom(1));

  //: **The page stepper**: Phase 7.1's "a way to say which page you are on".
  //:
  //: The pages column already scrolls, and scrolling is the right way to read
  //: a document; what it could not do is *name* the page under your eye, which
  //: is the one fact everything else here hangs off, the read/unread chip that
  //: is current, and which page "open the reader here" opens. So this is a
  //: readout with two buttons, not a pager that replaces scrolling: both
  //: directions still work and they stay in sync (the scroll listener wired in
  //: `wireDocPageTracking` below writes the label back).
  //:
  //: Built here rather than further down because `actionBtn` appends in
  //: creation order and "where you are" belongs beside the zoom controls,
  //: which are the other thing that answers "what am I looking at".
  let docPageCount = 0;
  let docPage = 0;
  const docPagesRead = new Set();
  //: page index -> `{text, model, caption, caption_model}`, from the same
  //: `page-reads` response the chips are built from. **Per page** is the whole
  //: point (Phase 7.3): one caption under a whole PDF describes none of its
  //: pages, and the joined reading of every page is not what you are looking
  //: at when page 4 is on screen.
  const docPageRows = new Map();
  const pagePrevBtn = actionBtn("ph:caret-left", "Previous page", () => setDocPage(docPage - 1));
  const pageLabel = document.createElement("span");
  pageLabel.className = "muted lightbox-page-label";
  //: `role="status"`, matching the OCR workspace's own page label: the page
  //: changes without focus moving, so a screen reader is otherwise never told.
  pageLabel.setAttribute("role", "status");
  actions.appendChild(pageLabel);
  const pageNextBtn = actionBtn("ph:caret-right", "Next page", () => setDocPage(docPage + 1));
  const pageControls = [pagePrevBtn, pageLabel, pageNextBtn];
  const showPageControls = (on) =>
    pageControls.forEach((el) => el.classList.toggle("hidden", !on));
  showPageControls(false);

  //: Whichever box actually scrolls the pages. In the plain document view that
  //: is `.lightbox-doc`; once the reading is showing beside the pages
  //: (`lightbox-doc-split`) the pages column becomes its own scroller. Asking
  //: the DOM rather than tracking the mode: the split is toggled in three
  //: places and a fourth would silently scroll the wrong box.
  const pageScroller = () =>
    pdfPages.scrollHeight > pdfPages.clientHeight + 1 ? pdfPages : doc;

  function syncPageChips() {
    for (const chip of infoPages.querySelectorAll(".lightbox-page-chip")) {
      chip.classList.toggle("is-current", Number(chip.dataset.page) === docPage);
      chip.setAttribute("aria-current", Number(chip.dataset.page) === docPage ? "true" : "false");
    }
    pageLabel.textContent = docPageCount ? `Page ${docPage + 1} of ${docPageCount}` : "";
    pagePrevBtn.disabled = docPage <= 0;
    pageNextBtn.disabled = docPage >= docPageCount - 1;
    //: The panel below is about *this* page, its reading, its figures, so
    //: it is redrawn with the number, not only when the file changes.
    if (lightboxInfoItem) renderInfo(lightboxInfoItem, true);
    //: The workspace button opens at the page named here, so it has to say so
    //:, a button whose behaviour depends on invisible state is the affordance
    //: problem this app keeps fixing elsewhere.
    readWithAiBtn.title = docPageCount
      ? `Open the page reader at page ${docPage + 1}: the page beside what it says`
      : "Open the page reader: see each page beside what it says";
  }

  //: Set the current page *and* scroll to it. `setDocPage` is the user asking
  //: for a page; `noteDocPage` (below) is the scroll position telling us which
  //: one arrived: they must not call each other, or a scroll would fight the
  //: scroll it triggered.
  function setDocPage(next) {
    if (!docPageCount) return;
    docPage = Math.max(0, Math.min(docPageCount - 1, next));
    const target = pdfPages.children[docPage];
    if (target) {
      const scroller = pageScroller();
      //: Rects rather than `offsetTop`: `offsetTop` is measured against the
      //: nearest *positioned* ancestor, which is not the scroller in either
      //: of the two layouts this has to work in.
      scroller.scrollTop += target.getBoundingClientRect().top
        - scroller.getBoundingClientRect().top;
    }
    syncPageChips();
  }

  //: One chip per page, marked with whether that page has a stored reading.
  //: This is Phase 7.1's "which pages have been read", and it is deliberately
  //: the same `.chip` recipe the rest of the app uses rather than a bespoke
  //: badge: a page is a thing you can pick, which is what a chip is for.
  function renderDocPages() {
    infoPages.replaceChildren();
    infoPages.classList.toggle("hidden", docPageCount < 1);
    if (docPageCount < 1) return;
    const lead = document.createElement("span");
    lead.className = "muted text-sm lightbox-pages-lead";
    lead.textContent = docPagesRead.size
      ? `${docPagesRead.size} of ${docPageCount} pages read`
      : `${docPageCount} page${docPageCount === 1 ? "" : "s"} · none read yet`;
    infoPages.appendChild(lead);
    for (let i = 0; i < docPageCount; i++) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip chip-interactive lightbox-page-chip";
      chip.classList.toggle("is-read", docPagesRead.has(i));
      chip.dataset.page = String(i);
      chip.textContent = String(i + 1);
      //: The number alone is not a label, "3" tells a screen reader nothing
      //: about what it is or what pressing it does.
      chip.setAttribute(
        "aria-label",
        docPagesRead.has(i) ? `Page ${i + 1}, already read` : `Page ${i + 1}, not read yet`
      );
      chip.title = chip.getAttribute("aria-label");
      chip.addEventListener("click", (e) => {
        e.stopPropagation();
        setDocPage(i);
      });
      infoPages.appendChild(chip);
    }
    syncPageChips();
  }

  //: Back to "this is not a document", called wherever the lightbox changes
  //: what it is showing, so a photograph never inherits the previous file's
  //: page count and a stale stepper never offers page 7 of an image.
  function resetDocPages() {
    docPageCount = 0;
    docPage = 0;
    docPagesRead.clear();
    docPageRows.clear();
    showPageControls(false);
    infoPages.replaceChildren();
    infoPages.classList.add("hidden");
  }

  //: Which pages already have a stored reading (`PageRead`, see the model's
  //: own docstring). Best-effort and never throws: the pages themselves render
  //: with no AI in the loop at all, and this panel must not be the thing that
  //: makes a document unviewable when the store cannot answer.
  async function loadDocPageReads(attachmentId, name, item) {
    let base = attachmentId ? `/files/${attachmentId}` : "";
    if (!base) {
      //: A `/media/` upload is addressed by *id* here and by *stored name*
      //: everywhere else in this function. The Library gallery is the one
      //: caller that already holds the id; every other one has a url, so the
      //: id is looked up the same way `hydrate` looks up the rest of the
      //: metadata rather than leaving the panel empty for eight of nine
      //: callers.
      let id = item.id;
      if (!id && name) {
        const row = await apiJson(`/media/meta/${encodeURIComponent(name)}`).catch(() => null);
        id = row?.id;
      }
      if (!id) return;
      //: Now that the id is known the workspace can be addressed too, the
      //: same button previously fell back to the flat inline reading for
      //: exactly this case.
      if (!lightboxOcrTarget) {
        lightboxOcrTarget = {
          id,
          _isAttachment: false,
          original_name: item.filename || name,
          //: See the note beside the other place this target is built: the
          //: page images are addressed by stored name, so leaving `url` off
          //: opens the workspace on a stage that 404s.
          url: `/media/${name}`,
        };
      }
      base = `/media/${id}`;
    }
    const body = await apiJson(`${base}/page-reads`).catch(() => null);
    for (const page of body?.pages || []) {
      const index = Number(page.page) || 0;
      if ((page.text || "").trim()) docPagesRead.add(index);
      docPageRows.set(index, {
        text: (page.text || "").trim(),
        model: page.model || "",
        caption: (page.caption || "").trim(),
        caption_model: page.caption_model || "",
      });
    }
    renderDocPages();
    //: The facts line carries the same count, so it has to be redrawn with the
    //: chips or the panel says "none read yet" above a row of read pages.
    renderInfo(item, true);
  }

  function noteDocPage() {
    if (!docPageCount) return;
    const scroller = pageScroller();
    const top = scroller.getBoundingClientRect().top;
    let nearest = 0;
    let best = Infinity;
    for (let i = 0; i < pdfPages.children.length; i++) {
      //: The page whose top edge is closest to the top of the viewport, from
      //: either side: a page scrolled half off the top is still the page you
      //: are reading, so `Math.abs` rather than "the first one still below".
      const distance = Math.abs(pdfPages.children[i].getBoundingClientRect().top - top);
      if (distance < best) {
        best = distance;
        nearest = i;
      }
    }
    if (nearest === docPage) return;
    docPage = nearest;
    syncPageChips();
  }
  //: **"Open this in the editor", from the preview.** Asked for directly: "add
  //: an edit document button to previewed documents in the lightbox." The
  //: Library's own kebab offers Preview *and* Open, but once you are in the
  //: preview and have decided you want to change something, the only route
  //: back was to close the lightbox, find the row again and pick the other
  //: menu item: three steps to answer a question the preview itself raised.
  //:
  //: Only for a *document*: the lightbox also shows attachments and uploaded
  //: files, which have their own in-place edit (`editFileBtn`) and no row in
  //: the Documents tab to open. `item.documentId` is what says which is which,
  //: set by the one caller that previews a document.
  const openDocBtn = actionBtn("ph:pencil-simple Edit document", "Open this in the document editor", () => {
    const target = items[index];
    if (!target || !target.documentId) return;
    close();
    switchTab("documents");
    openDocument(target.documentId);
  });
  openDocBtn.classList.add("hidden");
  // Zoom is an image control. A document scrolls and reflows instead, so
  // showing a disabled-in-spirit 100% beside a page of text is three
  // controls that do nothing, the same "only show what this can do"
  // reasoning the whiteboard context menu already settled.
  const zoomControls = [zoomOutBtn, zoomLabel, zoomInBtn, resetBtn];
  const showZoomControls = (on) =>
    zoomControls.forEach((el) => el.classList.toggle("hidden", !on));

  // Wheel-to-zoom, because that is what every image viewer does and a person
  // who has zoomed once will try it. Non-passive so the page behind cannot
  // scroll out from under the picture mid-zoom.
  //
  // **Only while an image is actually showing.** Reported live, from a real
  // multi-page PDF: "it crashed when I tried to view a pdf and i couldnt
  // scroll." Not a crash: `stage` is the shared container for both the
  // picture view and `.lightbox-doc` (text, and now PDF pages), and this
  // handler used to call `preventDefault()` on every wheel event over it
  // unconditionally, regardless of which one was showing. Over a scrolling
  // multi-page PDF that blocked the browser's own scroll on every tick
  // while doing nothing visible in return, `setZoom` only ever touches the
  // single `<img>` element's transform, which isn't part of the document
  // view at all. `doc.classList.contains("hidden")` is the same check
  // `show()` already uses to know which of the two is current.
  stage.addEventListener(
    "wheel",
    (e) => {
      // A browser reports a trackpad pinch gesture as a wheel event with
      // ctrlKey set: the same convention Chrome/Firefox use for
      // Maps/Docs/Figma-style pinch-to-zoom: so it still reaches zoom even
      // while the document view owns plain scroll below. Plain wheel/two-
      // finger scroll over a document (not pinch) is left alone entirely.
      if (!doc.classList.contains("hidden") && !e.ctrlKey) return;
      if (!doc.classList.contains("hidden") && pdfPages.classList.contains("hidden")) return; // plain text: nothing to zoom
      e.preventDefault();
      setZoom(zoom + (e.deltaY < 0 ? 0.25 : -0.25));
    },
    { passive: false }
  );

  // Drag to pan, once zoomed. The scrollbars already pan the stage, but a
  // magnified picture with `cursor: grab` on it that does not actually drag
  // is an affordance telling a lie, every image viewer drags here.
  //
  // Bound to both `img` and `pdfPages`, panning whichever container
  // `scrollTarget()` says actually scrolls (`stage` for the image, `doc`
  // for PDF pages): reported live: "when zooming in on docs or images etc
  // in the lightbox, i cant drag to adjust the zoom position." This only
  // ever panned `stage.scroll{Left,Top}` via listeners on `img` alone, the
  // same single-target gap `zoomTarget()`/`scrollTarget()` above already
  // exist to close for zoom and Fit; drag never got the same treatment when
  // PDF pages gained their own zoomable, independently-scrolling view.
  let panning = null;
  const startPan = (el) => (e) => {
    if (zoom === 1) return;
    e.preventDefault();
    const scroller = scrollTarget();
    panning = { x: e.clientX, y: e.clientY, left: scroller.scrollLeft, top: scroller.scrollTop };
    el.setPointerCapture(e.pointerId);
    el.style.cursor = "grabbing";
  };
  const movePan = (e) => {
    if (!panning) return;
    const scroller = scrollTarget();
    scroller.scrollLeft = panning.left - (e.clientX - panning.x);
    scroller.scrollTop = panning.top - (e.clientY - panning.y);
    //: Now, not at the scroll event a frame later: a Fit pressed inside that
    //: frame must still see the pan.
    scrolledAway.add(scroller);
  };
  const endPan = (el) => (e) => {
    if (!panning) return;
    panning = null;
    el.style.cursor = "";
    if (e.pointerId !== undefined && el.hasPointerCapture(e.pointerId)) {
      el.releasePointerCapture(e.pointerId);
    }
  };
  // A drag that ends on the picture must not also read as a click on the
  // backdrop, which closes the dialog, panning to the edge of a picture
  // and having the whole thing vanish is the bug this prevents.
  //
  // `pdfPages` doesn't exist yet at this point in `openLightbox` (it's
  // built further down, alongside the rest of the document view), wiring
  // it up here throws a temporal-dead-zone ReferenceError the instant the
  // lightbox opens. `bindPan`, called once `pdfPages` is actually in scope.
  const bindPan = (el) => {
    el.addEventListener("pointerdown", startPan(el));
    el.addEventListener("pointermove", movePan);
    el.addEventListener("pointerup", endPan(el));
    el.addEventListener("pointercancel", endPan(el));
    el.addEventListener("click", (e) => e.stopPropagation());
  };
  bindPan(img);

  // Copy the text the app read out of the picture. Hidden unless this item
  // actually has some: an enabled button that copies "" is a lie.
  // Goes through the app's own `copyToClipboard` helper rather than the raw
  // browser clipboard call: caught by
  // test_every_copy_path_goes_through_the_fallback (whose naive string scan
  // would otherwise flag even *this comment* if it spelled the call out
  // literally, which is why it doesn't). The helper already covers what a
  // hand-rolled version here did not: a non-secure context, permission
  // refused, and a last-resort "here's the text, already selected" UI when
  // both fail, instead of this button just going silent.
  //: What the info panel is currently showing, which for a document is *one
  //: page's* reading rather than the file's joined one (see `renderInfo`).
  //: Copy has to hand over what is on screen: copying every page while the
  //: panel shows page 4 is the app disagreeing with itself about "this text".
  let lightboxShownText = "";
  const copyBtn = actionBtn("ph:copy Copy text", "Copy the text read from this image", async (b) => {
    const value = (lightboxShownText || items[index].text || "").trim();
    if (!value) return;
    await copyToClipboard(value, b);
  });

  // Save the original file. `download` needs a same-origin href to name the
  // file, which `mediaSrc()` gives us: it is this app's own /media route.
  actionBtn("ph:download-simple Save", "Save this file to your computer", async () => {
    try {
      const current = items[index];
      const href = await current.getUrl();
      const a = document.createElement("a");
      a.href = href;
      // **A document leaves `download` unset, an image sets it.** A
      // non-empty `download` attribute wins over the server's own
      // `Content-Disposition: filename="..."`, for
      // `/documents/{id}/export.md`, that header already carries the
      // right extension for the file's actual type (`.py`, `.json`,
      // `.md`, whatever `filetypes.get` picked), computed server-side.
      // Setting `download` to a bare title here would have downloaded a
      // "Quarterly Report" with no extension at all, silently discarding
      // that work: an image has no such header to defer to, so it keeps
      // naming itself.
      if (!current.kind) a.download = current.filename || "image";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      toast("Couldn't save that file.", true);
    }
  });

  // Only shown while a PDF is displayed as pages (see showDocument): swaps
  // to the AI-extracted-text view on demand, rather than automatically. A
  // PDF's *pages* render with zero AI involvement; reading its words with a
  // model is a deliberate, opt-in second step, not something a user has to
  // sit through just to look at their own document.
  //: **Which PDF the OCR workspace should open, or null.** Set by
  //: `showDocument`'s PDF branch, where the file's identity is actually
  //: known; cleared wherever the lightbox resets for a new file.
  let lightboxOcrTarget = null;

  const readWithAiBtn = actionBtn("ph:sparkle Read text with AI", "Open the page reader: see each page beside what it says", () => {
    //: **One reader, not two.** Reported: *"that panel is separate from the
    //: lightbox where you can select to read the text on the document, and I
    //: feel like that button should show the other text on page panel
    //: popup."* This button used to swap the lightbox to a flat blob of
    //: extracted text, while the OCR workspace, page rail, region boxes,
    //: per-page and now per-range reads, copy, save as note, was a separate
    //: window reachable only from a file card's menu. Two answers to "what
    //: does this document say", and the worse one was on the file you were
    //: looking at.
    //:
    //: Falls back to the old inline text when the workspace cannot be
    //: addressed (no id resolved, or library.js absent on this surface):
    //: degrading to the flat reading beats a button that does nothing.
    //: **At the page you are looking at, not at page 1.** Phase 7.1 asked for
    //: "a way into the OCR Workspace at that page", and the third argument is
    //: it: a fifteen-page scan opened at its first page from page nine is a
    //: navigation the reader has to redo by hand, every time.
    if (lightboxOcrTarget && typeof window.openOcrWorkspace === "function") {
      //: **The lightbox goes before the workspace arrives.** Reported: *"when
      //: I open a pdf file in the lightbox and press the read text with ai, it
      //: opens the ocr workspace but behind the lightbox so the lightbox needs
      //: to close when the workspace opens."* Measured: `.lightbox` is
      //: `z-index: 1020` (raised there to clear the CSS full-screen graph, see
      //: its own comment) and the workspace is a `.modal-overlay` at 1010, so
      //: the workspace really did open underneath and every click landed on
      //: the lightbox's zoom-out backdrop instead. The fix is the one the
      //: gallery kebab's "See text on the page" row already uses ten lines
      //: down, `close()` first: two stacked overlays leave the page behind
      //: unreachable whichever of them wins the stacking contest, so raising
      //: the workspace above the lightbox would answer the z-index and not the
      //: report. The target and the page are read into locals before the
      //: dismiss because `close()` empties the lightbox's own state.
      const target = lightboxOcrTarget;
      const atPage = docPageCount ? docPage : 0;
      close();
      window.openOcrWorkspace(target, [], atPage);
      return;
    }
    lightboxLoadExtractedText?.();
  });
  readWithAiBtn.classList.add("hidden");

  //: **Edit / Save / Cancel for a text file**, §R7.1 item 2. Set by
  //: `showDocument` for whichever file is open; null while the lightbox is
  //: showing a picture or a PDF's pages, which is what keeps these three
  //: buttons from acting on the file that happened to be open before.
  let lightboxEditTarget = null;

  function setLightboxEditing(on) {
    docEdit.classList.toggle("hidden", !on);
    docBody.classList.toggle("hidden", on);
    //: Find-in-document searches the *rendered* body, so it has nothing to
    //: work on while the source is showing, and leaving it up would offer a
    //: search that silently matches nothing.
    find.classList.toggle("hidden", on);
    findCount.classList.add("hidden");
    editFileBtn.classList.toggle("hidden", on);
    saveFileBtn.classList.toggle("hidden", !on);
    cancelEditBtn.classList.toggle("hidden", !on);
    //: Export hands back what was *saved*; while a draft is open in the box
    //: the two disagree, and a file exported mid-edit would silently be the
    //: version before the changes on screen.
    if (on) exportTextBtn.classList.add("hidden");
    else if (lightboxExtractedText) exportTextBtn.classList.remove("hidden");
    if (on) docEdit.focus();
  }

  const editFileBtn = actionBtn("ph:pencil-simple Edit", "Edit this file's text", () => {
    if (!lightboxEditTarget) return;
    docEdit.value = lightboxEditTarget.text;
    setLightboxEditing(true);
  });
  editFileBtn.classList.add("hidden");

  const saveFileBtn = actionBtn("ph:check Save changes", "Save this text back over the file", async (button) => {
    if (!lightboxEditTarget) return;
    button.disabled = true;
    try {
      const saved = await apiJson(lightboxEditTarget.url, {
        method: "PUT",
        body: JSON.stringify({ text: docEdit.value }),
      });
      //: Re-rendered from what the server wrote back, not from what was
      //: typed. They are the same today; if they ever differ, a normalised
      //: line ending, a file the OS rewrote, the reader should be looking at
      //: the file, not at the draft of it.
      lightboxEditTarget.text = saved.text || "";
      setLightboxEditing(false);
      lightboxLoadExtractedText?.();
      toast("Saved.");
    } catch (error) {
      //: A 409 is the server declining to overwrite (`docview.editability`),
      //: and its `detail` is written to be read by a person, so it is shown
      //: rather than replaced with a generic failure.
      toast(error.message || "Couldn't save that file.", true);
    } finally {
      button.disabled = false;
    }
  });
  saveFileBtn.classList.add("hidden");

  const cancelEditBtn = actionBtn("ph:x Cancel", "Discard these changes", () => {
    setLightboxEditing(false);
  });
  cancelEditBtn.classList.add("hidden");

  //: **Exporting the *text*, which is a different thing from Save** (§R7.1
  //: item 5, "export, per-format, from the same place the file is viewed").
  //: Save hands back the file as it is on disk, the .pdf, the .docx. This
  //: hands back what the viewer is showing, which for a scanned PDF or a Word
  //: file is the only readable form of it the app has, and until now could be
  //: reached only by selecting the whole pane and copying.
  //:
  //: The extension follows `kind`, not the source file's: markdown text saved
  //: as `report.pdf.md` is honest about being neither a PDF nor a plain
  //: transcript, and opens in the right thing.
  let lightboxExtractedText = null;
  const exportTextBtn = actionBtn("ph:export Export text", "Save the extracted text as a file", async (button) => {
    if (!lightboxExtractedText) return;
    button.disabled = true;
    try {
      const { name, kind, text } = lightboxExtractedText;
      const stem = (name || "document").replace(/\.[^./\\]+$/, "") || "document";
      const extension = kind === "markdown" ? "md" : "txt";
      await saveFile(`${stem}.${extension}`, new Blob([text], { type: "text/plain" }));
    } catch (error) {
      toast(error.message || "Couldn't export that text.", true);
    } finally {
      button.disabled = false;
    }
  });
  exportTextBtn.classList.add("hidden");

  //: Whether the preview frame is currently showing something.
  let docPreviewOn = false;

  function clearDocPreview() {
    docPreviewOn = false;
    docFrame.classList.add("hidden");
    //: `about:blank` rather than leaving the last file loaded: an iframe that
    //: still holds a document keeps rendering it, and paging to the next file
    //: would show the previous one's page for as long as the new fetch takes.
    docFrame.src = "about:blank";
    previewHtmlBtn.setAttribute("aria-pressed", "false");
    setLabel(previewHtmlBtn, "ph:browser Preview");
  }

  const previewHtmlBtn = actionBtn("ph:browser Preview", "Render this HTML file (scripts are not run)", () => {
    if (docPreviewOn) {
      clearDocPreview();
      docBody.classList.remove("hidden");
      find.classList.remove("hidden");
      return;
    }
    if (!lightboxPreviewSource) return;
    //: **A server URL, not a `blob:` from the text we already have.** The
    //: first version did the obvious thing and built a Blob, and a `blob:`
    //: document inherits its creator's CSP, so this app's `style-src 'self'`
    //: applied to the framed page and refused the page's *own* `<style>`
    //: block. Measured: "Refused to apply inline style", and a page setting
    //: `background:#eef` rendered transparent. `/files/{id}/html-preview`
    //: carries its own policy (`HTML_PREVIEW_CSP`, routes_files.py): 
    //: sandboxed, scriptless, and allowed to style itself.
    docFrame.src = mediaSrc(lightboxPreviewSource);
    docPreviewOn = true;
    docFrame.classList.remove("hidden");
    docBody.classList.add("hidden");
    //: Find-in-document reads the rendered *source* listing; the frame is a
    //: separate document this page deliberately cannot reach into.
    find.classList.add("hidden");
    findCount.classList.add("hidden");
    previewHtmlBtn.setAttribute("aria-pressed", "true");
    setLabel(previewHtmlBtn, "ph:code Show source");
  });
  previewHtmlBtn.classList.add("hidden");
  previewHtmlBtn.setAttribute("aria-pressed", "false");

  //: The URL the preview frame would load, set by `showDocument` only for a
  //: file that is actually HTML *and* is a real attachment (a `/media/`
  //: upload is never HTML, `MEDIA_SUFFIXES` is images and PDF, and a native
  //: document has no file behind it at all). Null the rest of the time, which
  //: is what keeps the button from framing the file viewed before this one.
  let lightboxPreviewSource = null;

  // **The AI/manage actions: gated on a media id, and only ever visible
  // when one is present.** Reported directly, and left open on purpose the
  // first time this bar was built: rename, describe with AI, read text (two
  // ways) and delete all need a real `MediaUpload` row, and of nine
  // `openLightbox` callers only the Library's own gallery has one to pass.
  // Every other caller (a note attachment, a chat image, a graph or
  // dashboard thumbnail, a whiteboard object) opens the lightbox from a bare
  // url, and a menu that 404s on click is worse than no menu, the same "two
  // buttons guaranteed to fail" shape this project already rejected once on
  // the whiteboard's own context menu.
  //
  // Reuses the endpoints and request shapes the gallery kebab already
  // established (library.js) rather than inventing a second idea of what
  // "describe with AI" does.
  let moreMenu = null;
  const buildMoreMenu = (item) => {
    //: **The job outlives the window that started it.**
    //:
    //: Reported: "if i close the lightbox as I am generating ocr, then it
    //: stops and I have to restart it again." The request never actually
    //: stopped: a `POST` keeps going and writes its result to the database
    //: whatever the browser does next, but every trace of it was inside the
    //: lightbox, so closing that window meant the work became invisible and
    //: then, on reopening, appeared not to have happened.
    //:
    //: Three changes make it true as well as visible: a progress toast that
    //: lives outside the lightbox, a re-render that is guarded rather than
    //: assumed (the panel may be gone by now, and writing to it threw), and a
    //: Library refresh so the gallery behind shows the new text either way.
    const run = (label, busyText, endpoint, applyTo) => async () => {
      const name = item.original_name || "this file";
      const progress = toastProgress(`${busyText} ${name}`);
      try {
        //: Registered with the OCR workspace's own in-flight map, so a read
        //: started here is still findable after this window closes, reported:
        //: "I close the lightbox, the ocr workspace is gone… it should be
        //: openable if an active ocr reading is going on."
        const updated = await (window.trackOcrRead || ((_i, _l, p) => p))(
          item,
          `${busyText} ${name}`,
          //: `force: true`, always. Reported: "the image captioning and ocr didnt
          //: work when I didnt like the output, deleted what was there and
          //: tried to do it again." A click on Describe / Read *is* the
          //: request to do it again, the server's "keep what exists" guard is
          //: for the automatic pass on upload, not for a person pressing the
          //: button a second time.
          apiJson(`/media/${item.id}${endpoint}`, { method: "POST", body: JSON.stringify({ force: true }) })
        );
        applyTo(item, updated);
        //: Only if this lightbox is still the one on screen. `renderInfo`
        //: writes into elements this closure captured, and they are detached
        //: once the overlay closes.
        if (overlay.isConnected && !overlay.classList.contains("hidden")) renderInfo(item, true);
        if (typeof loadLibrary === "function") loadLibrary();
        progress.done(`Finished reading ${name}.`, {
          actionLabel: "Show it",
          onAction: () => {
            switchTab("library");
            if (typeof renderLibrary === "function") renderLibrary();
          },
        });
      } catch (err) {
        progress.done(err.message || `Couldn't ${label.toLowerCase()}.`, { isError: true });
      }
    };
    const items = [
      {
        label: "ph:sparkle Describe with AI",
        title: "Generate a caption for this image",
        run: run("describe", "Describing…", "/caption", (it, u) => {
          it.caption = u.caption || "";
          it.captionByline = captionBylineFor(u);
        }),
      },
      {
        label: "ph:text-aa Read text with AI",
        title: "Read the text in this image with a vision model",
        //: The response carries both readings, so the panel is rebuilt from the
        //: whole row rather than from the field this call happened to write:
        //: re-reading with a model used to drop a Tesseract reading that was
        //: still stored, and running Tesseract used to promote it over a vision
        //: reading that is still the current one.
        run: run("read text", "Reading…", "/vision-ocr", (it, u) => {
          Object.assign(it, lightboxReadingsFor(u));
        }),
      },
    ];
    // "the whole application is offline anyway with local models so that
    // title is confusing" (reported directly): renamed to name the actual
    // method (Tesseract) instead of a property ("offline") every reading
    // path in this app already shares. And: "the option should be disabled
    // or hidden if the user doesn't have pytesseract installed", `/models/
    // status`'s `tesseract_available` (routes_models.py) is a plain
    // `shutil.which` check, so this can just not offer a button that would
    // otherwise silently do nothing, matching how the model-pull panel
    // already hides itself on a backend that can't pull.
    //: And now it is *left out* rather than shown greyed, which is the
    //: second half of the same report: "make sure all the fila and document
    //: ocr worfs with ai ocr models, I dont use tesseract." A disabled row
    //: that can never become enabled (this app never installs the binary, by
    //: instruction) is a permanent piece of dead chrome in a menu that opens
    //: on every image: and it sat directly under the row that does the same
    //: job with a model, which is the one the reader wants. INSTALL.md still
    //: documents the offline reader for anyone who wants it.
    if (!modelStatus || modelStatus.tesseract_available !== false) {
      items.push({
        label: "ph:scan Read text (Tesseract OCR)",
        title: "Read the text in this image with Tesseract, a fast local tool, no AI model involved",
        run: run("read text", "Reading…", "/ocr", (it, u) => {
          Object.assign(it, lightboxReadingsFor(u));
        }),
      });
    }
    //: The other door into the OCR workspace (library.js). The gallery's own
    //: kebab has it too, and this is the same act from the other surface: the
    //: lightbox is where you are *looking* at the page, which is exactly when
    //: "where did that line come from" gets asked. Gated on a media id like
    //: every other row here, and on the row being an image the extractor can
    //: open: a menu row guaranteed to 415 is worse than a shorter menu.
    //: PDFs included since the workspace learned to rasterise a page
    //: (`_pdf_regions_for`, routes_files.py): reported as *"is the document
    //: ocr even working??"*, and it was not: this gate is what kept every
    //: document out of the one window built to read documents.
    if (/\.(png|jpe?g|gif|webp|bmp|pdf)$/i.test(item.filename || "")) {
      items.push({
        label: "ph:selection-all See text on the page",
        title: "Open this file beside the text read from it, page by page",
        run: async () => {
          //: `close` is this lightbox's own dismiss (defined further down in
          //: `openLightbox`, hoisted and initialised long before any menu row
          //: can run). The workspace is a modal too, and two stacked overlays
          //: leave the page behind unreachable.
          close();
          //: `_src`, not `url`: the lightbox item already carries a resolved
          //: src (`getUrl` runs it through `mediaSrc`, which resolves a staged
          //: picture to its blob), so the workspace takes it as it is.
          window.openOcrWorkspace?.(
            {
              id: item.id,
              _src: item.getUrl ? item.getUrl() : "",
              original_name: item.filename,
              _isImage: !/\.pdf$/i.test(item.filename || ""),
            },
            [],
          );
        },
      });
    }
    return kebabMenu(
      [
        ...items,
        {
          label: "ph:pencil-simple Rename",
          title: "Rename this image",
          run: async () => {
            const next = window.prompt("New name", item.filename || "");
            if (!next || !next.trim() || next === item.filename) return;
            try {
              const updated = await apiJson(`/media/${item.id}`, {
                method: "PUT",
                body: JSON.stringify({ original_name: next.trim() }),
              });
              item.filename = updated.original_name;
              renderInfo(item, true);
            } catch (err) {
              toast(err.message || "Couldn't rename that image.", true);
            }
          },
        },
        {
          label: "ph:trash Delete",
          title: "Delete this image",
          run: async () => {
            if (!(await confirmDialog(`Delete "${item.filename || "this image"}"?`))) return;
            try {
              await apiJson(`/media/${item.id}`, { method: "DELETE" });
              items.splice(index, 1);
              if (!items.length) {
                close();
                return;
              }
              show(index);
            } catch (err) {
              toast(err.message || "Couldn't delete that image.", true);
            }
          },
        },
      ],
      "More actions for this image"
    );
  };
  const syncMoreMenu = (item) => {
    moreMenu?.remove();
    // `!item.kind` matters here, not just belt-and-braces: a native
    // document preview item (below) also carries `item.id`, but that id
    // names a *document*, not a media upload, feeding it to
    // `/media/{id}/caption` or `/media/{id}` DELETE would act on whatever
    // media row happens to share that number, or 404. This menu is media-
    // actions only; `item.kind` is how a document identifies itself.
    moreMenu = item.id && !item.kind ? buildMoreMenu(item) : null;
    if (moreMenu) actions.appendChild(moreMenu);
  };


  // **The document half of the showcase.** Asked for directly: the lightbox
  // should be "a sort of document preview… for viewing pdfs, word documents,
  // spreadsheets, text files, code files etc but in a presentable way that
  // isn't editable".
  //
  // Read-only is not a shortcut here, `/media/text` returns *extracted*
  // text, so what is on screen has already stopped being a .docx and there
  // is nothing coherent to write back into. `core/docview.py`'s own module
  // docstring makes the same point.
  const doc = document.createElement("div");
  doc.className = "lightbox-doc hidden";
  const docBody = document.createElement("div");
  docBody.className = "lightbox-doc-body";
  const docNote = document.createElement("p");
  docNote.className = "muted lightbox-doc-note hidden";
  // A PDF's actual pages, rasterised server-side, direct instruction, after
  // the AI-extraction path alone left a scanned PDF stuck on "Reading…"
  // forever: "pdfs and documents should be viewable, accessible and
  // manageable without the ai, even if the ai cant read them." Plain
  // <img>s, one per page, in their own scrolling column so a PDF scrolls
  // like a PDF: no script, no PDF renderer, no AI in this path at all.
  const pdfPages = document.createElement("div");
  pdfPages.className = "lightbox-pdf-pages hidden";
  bindPan(pdfPages);
  //: Bound here rather than beside `noteDocPage` itself, and for the same
  //: reason `bindPan` exists: `doc` and `pdfPages` are created further down
  //: this function, so touching either from the block that defines the page
  //: stepper is a temporal-dead-zone ReferenceError the instant the lightbox
  //: opens. Bound once each, never rebound per document, a listener added on
  //: every `showDocument` is the unbounded accumulation
  //: `test_frontend_handlers.py` exists to catch.
  //:
  //: Both boxes, because which one scrolls depends on the layout (see
  //: `pageScroller`), and `noteDocPage` is a no-op when there are no pages.
  doc.addEventListener("scroll", noteDocPage, { passive: true });
  pdfPages.addEventListener("scroll", noteDocPage, { passive: true });
  trackScrolledAway(doc);
  //: **Editing a file in place** (REDESIGN.md §R7.1 item 2, and the request:
  //: *"all the files should be managable, viewable and editable in the
  //: library and document/file/text editor"*). A plain textarea over the
  //: file's own text, and only ever for the files where that text *is* the
  //: file: `docview.editability` decides, server-side, and the route
  //: re-checks rather than trusting the flag it sent.
  const docEdit = document.createElement("textarea");
  docEdit.className = "lightbox-doc-edit hidden";
  docEdit.spellcheck = false;
  docEdit.setAttribute("aria-label", "Edit this file's text");
  //: **The HTML preview pane** (§R7.1 item 4, from the odysseus comparison:
  //: *"viewing html and other code"*). An .html file is the one type where
  //: the source and the thing it describes are both worth looking at, and
  //: showing only the source is showing half the file.
  //:
  //: `sandbox` with **no** `allow-` tokens, and that is the whole security
  //: story: no scripts, no forms, no same-origin, no top-level navigation.
  //: The page renders as layout and can do nothing else, which is what makes
  //: it safe to point at a file nobody in this notebook wrote. `core/security`
  //: allows `frame-src blob:` for this; the sandbox is what bounds it.
  const docFrame = document.createElement("iframe");
  docFrame.className = "lightbox-doc-frame hidden";
  docFrame.setAttribute("sandbox", "");
  docFrame.setAttribute("title", "Preview of this HTML file");
  doc.append(docNote, docBody, docEdit, docFrame, pdfPages);
  doc.addEventListener("click", (e) => e.stopPropagation());
  stage.appendChild(doc);

  // Find within the document. Deliberately a filter over the rendered text
  // rather than the browser's own Ctrl+F: this panel scrolls inside a
  // dialog, and the native find has no idea the rest of the page is inert.
  const find = document.createElement("input");
  find.type = "search";
  find.className = "lightbox-find hidden";
  find.placeholder = "Find in document";
  find.setAttribute("aria-label", "Find in document");
  const findCount = document.createElement("span");
  findCount.className = "muted lightbox-find-count hidden";
  const clearFind = () => {
    find.value = "";
    findCount.textContent = "";
    docBody.querySelectorAll("mark.lightbox-hit").forEach((m) => {
      m.replaceWith(document.createTextNode(m.textContent));
    });
    docBody.normalize();
  };
  find.addEventListener("input", () => {
    // Unwrap previous hits before re-scanning, or each keystroke would
    // search text already split across <mark> boundaries.
    docBody.querySelectorAll("mark.lightbox-hit").forEach((m) => {
      m.replaceWith(document.createTextNode(m.textContent));
    });
    docBody.normalize();
    const needle = find.value.trim();
    if (!needle) {
      findCount.textContent = "";
      findCount.classList.add("hidden");
      return;
    }
    // Walk text nodes and wrap matches. Text-node surgery rather than an
    // innerHTML replace, which would corrupt the rendered markup and is the
    // classic way this feature introduces an injection bug.
    const lower = needle.toLowerCase();
    const walker = document.createTreeWalker(docBody, NodeFilter.SHOW_TEXT);
    const targets = [];
    let node;
    while ((node = walker.nextNode())) {
      if (node.nodeValue.toLowerCase().includes(lower)) targets.push(node);
    }
    let hits = 0;
    for (const textNode of targets) {
      const parts = textNode.nodeValue.split(new RegExp(`(${escapeForFind(needle)})`, "gi"));
      if (parts.length < 2) continue;
      const frag = document.createDocumentFragment();
      for (const part of parts) {
        if (part.toLowerCase() === lower) {
          const mark = document.createElement("mark");
          mark.className = "lightbox-hit";
          mark.textContent = part;
          frag.appendChild(mark);
          hits += 1;
        } else if (part) {
          frag.appendChild(document.createTextNode(part));
        }
      }
      textNode.replaceWith(frag);
    }
    findCount.textContent = hits ? `${hits} match${hits === 1 ? "" : "es"}` : "No matches";
    findCount.classList.remove("hidden");
    docBody.querySelector("mark.lightbox-hit")?.scrollIntoView({ block: "center" });
  });
  actions.append(find, findCount);

  // Which suffixes this viewer renders as a *picture*. Everything else that
  // reaches the lightbox is offered to the document reader instead.
  const IMAGE_SUFFIXES = /\.(png|jpe?g|gif|webp|avif|bmp|ico|svg)$/i;

  // Reassigned on every `showDocument` call: see `readWithAiBtn` above,
  // which is the only caller. A closure rather than a stored url string so
  // the "Read with AI" button always re-derives from whichever item and
  // text-endpoint are current, the same way `show(i)` already recomputes
  // everything else per item rather than caching it.
  let lightboxLoadExtractedText = null;

  async function showDocument(item, name, attachmentId) {
    img.classList.add("hidden");
    broken.classList.add("hidden");
    doc.classList.remove("hidden");
    docBody.replaceChildren();
    pdfPages.replaceChildren();
    pdfPages.classList.add("hidden");
    docNote.classList.add("hidden");
    readWithAiBtn.classList.add("hidden");
    //: A new file, so any half-finished edit of the previous one goes with
    //: it. Cleared *before* the fetch rather than after: the two buttons are
    //: on screen the whole time it is in flight, and Save on a stale target
    //: would write one file's text over another's.
    lightboxEditTarget = null;
    docEdit.value = "";
    setLightboxEditing(false);
    editFileBtn.classList.add("hidden");
    lightboxPreviewSource = null;
    lightboxExtractedText = null;
    lightboxOcrTarget = null;
    //: A new file, so the previous one's page count, stepper and read-chips go
    //: with it: the PDF branch below re-establishes them when there are pages.
    resetDocPages();
    exportTextBtn.classList.add("hidden");
    clearDocPreview();
    previewHtmlBtn.classList.add("hidden");
    clearFind();
    find.classList.remove("hidden");

    // A native MemoryMap document (the Documents list) or a real Attachment
    // row each has its own text/info endpoint; a `/media/` upload has a
    // third. All three converge on the same `AttachedFileTextOut` shape, so
    // everything past this point reads one variable rather than branching
    // three ways again and again.
    const textUrl = attachmentId
      ? `/files/${attachmentId}/text`
      : `/media/text/${encodeURIComponent(name)}`;
    const isPdf = /\.pdf$/i.test(item.filename || name || "");

    async function loadExtractedText() {
      // **The pages stay.** Reported directly: "when I select to read the
      // text from the document in a pdf, the pdf view disappears entirely. I
      // want the pdf view to be on one side, and the live extracted document
      // text and visuals on the right." Reading a scan *against* its pages is
      // the entire point: the text is a machine's reading of an image, and
      // hiding the image removes the only way to check it. So for a file
      // that has rendered pages, this becomes a split: pages left, text
      // right, both scrolling on their own. Anything without pages (a .docx,
      // a .txt) still gets the full width, because there is nothing to put
      // beside it.
      const hasPages = pdfPages.childElementCount > 0;
      doc.classList.toggle("lightbox-doc-split", hasPages);
      pdfPages.classList.toggle("hidden", !hasPages);
      docBody.classList.remove("hidden");
      find.classList.remove("hidden");
      showZoomControls(hasPages);
      if (!hasPages) setZoom(1);
      docBody.textContent = "Reading…";
      let payload = null;
      // See the doc-viewer comment block above `doc`'s own creation: a
      // native document already has its text, set by the Documents list's
      // "Preview" action: nothing to fetch.
      if (item.kind && item.text != null) {
        payload = { kind: item.kind, text: item.text, source: item.source || "file" };
      } else {
        try {
          payload = await apiJson(textUrl);
        } catch {
          payload = null;
        }
      }
      if (!payload) {
        docBody.textContent = "";
        docNote.textContent =
          "This file can't be previewed here. Use Save to open it in another app.";
        docNote.classList.remove("hidden");
        find.classList.add("hidden");
        return;
      }
      docBody.replaceChildren();
      const body = payload.text || "";
      //: **Decided before the empty-body return below, not after it.** A
      //: .docx on an install without markitdown extracts to nothing, so that
      //: return fires: and the read-only reason, which is exactly what such
      //: a file needs to say, used to be computed past it and never shown.
      //: Measured: the note read only "Importing documents needs the optional
      //: markitdown package", with no word about editing at all.
      //:
      //: **Preview is offered only for HTML**, and keyed off the *filename*
      //: rather than the extracted kind: docview reports `.html` as "code",
      //: which is right for how the source renders and says nothing about
      //: whether the file is a page. A .py is code too and has nothing to
      //: preview.
      if (body.trim()) {
        lightboxExtractedText = {
          name: item.filename || name || "document",
          kind: payload.kind,
          text: body,
        };
        exportTextBtn.classList.remove("hidden");
      }
      if (attachmentId && /\.html?$/i.test(item.filename || name || "") && body.trim()) {
        lightboxPreviewSource = `/files/${attachmentId}/html-preview`;
        previewHtmlBtn.classList.remove("hidden");
      }
      const editNotes = [];
      if (item.kind && item.text != null) {
        editFileBtn.classList.add("hidden");
      } else if (payload.editable) {
        lightboxEditTarget = { url: textUrl, text: body };
        editFileBtn.classList.remove("hidden");
      } else {
        editFileBtn.classList.add("hidden");
        if (payload.edit_message) editNotes.push(`Read-only: ${payload.edit_message}`);
      }
      if (!body.trim()) {
        docNote.textContent = [
          payload.message || "There's no readable text in this file.",
          ...editNotes,
        ].join(" · ");
        docNote.classList.remove("hidden");
        return;
      }
      if (payload.kind === "markdown") {
        // The same renderer documents and chat use, so a previewed .md
        // looks like the same app rather than a second idea of markdown.
        renderMarkdown(docBody, body);
      } else {
        // Code and plain text keep their own whitespace, which is most of
        // what makes them readable.
        const pre = document.createElement("pre");
        pre.className = "lightbox-doc-pre";
        const code = document.createElement("code");
        if (payload.kind === "code") {
          //: §R7.1 item 3. `highlightCodeInto` (editor.js) picks the language
          //: off the filename and builds spans with `textContent`, so a file
          //: cannot inject markup by being written to look like markup.
          highlightCodeInto(code, body, item.filename || name || "");
        } else {
          code.textContent = body;
        }
        pre.appendChild(code);
        docBody.appendChild(pre);
      }
      // `source` is shown, not just logged: text a vision model
      // transcribed off a scanned page is a *reading* of the file, and
      // presenting it identically to text read out of a .txt would state a
      // guess as fact.
      const notes = [];
      if (payload.source === "vision-ocr") notes.push("Text read off the page by a vision model");
      else if (payload.source === "converted") notes.push("Converted for preview");
      if (payload.truncated) notes.push("Long file: showing the beginning only");
      if (payload.message) notes.push(payload.message);
      //: **The reason a file cannot be edited, shown where it is read.** §R7.1
      //: item 2 asked for the honest reason in the UI rather than a control
      //: that quietly does nothing. Computed above, beside the button it
      //: belongs to; pushed here so it reads as one line with the rest.
      notes.push(...editNotes);
      docNote.textContent = notes.join(" · ");
      docNote.classList.toggle("hidden", !notes.length);
    }
    lightboxLoadExtractedText = loadExtractedText;

    // A native document is markdown from the database, there is no PDF
    // underneath it to rasterise, so it always takes the text path above.
    if (isPdf && !item.kind) {
      const infoUrl = attachmentId ? `/files/${attachmentId}/pdf-info` : `/media/pdf-info/${encodeURIComponent(name)}`;
      const pageUrl = (i) =>
        attachmentId ? `/files/${attachmentId}/pdf-page/${i}` : `/media/pdf-page/${encodeURIComponent(name)}/${i}`;
      let info = null;
      try {
        info = await apiJson(infoUrl);
      } catch {
        info = null;
      }
      if (info && info.available && info.pages > 0) {
        docBody.classList.add("hidden");
        find.classList.add("hidden"); // nothing here is text to search yet
        //: The identity the OCR workspace needs, built here because this is
        //: the one place that knows whether the open file is an attachment or
        //: a media upload. `original_name` rather than the stored name: the
        //: workspace's own `ocrIsPdf` tests the extension of exactly that.
        //: `url` matters as much as `id` for an upload: the workspace renders a
        //: page through `/media/pdf-page/{stored name}/{n}`, not by id, so a
        //: target without it asked for `/media/pdf-page//0` and got a 404, the
        //: workspace opened on an empty stage. Measured against the running app
        //: while wiring the "open at this page" route in; the attachment side
        //: has an id-addressed page endpoint and never hit it.
        lightboxOcrTarget = attachmentId
          ? { id: attachmentId, _isAttachment: true, original_name: item.filename || name }
          : item.id
          ? {
              id: item.id,
              _isAttachment: false,
              original_name: item.filename || name,
              url: `/media/${name}`,
            }
          : null;
        readWithAiBtn.classList.remove("hidden");
        pdfPages.classList.remove("hidden");
        // Zoom, same as the image view, reported live once pages actually
        // rendered: "or zoom. a lot of controls are missing." `setZoom(1)`
        // resets any leftover magnification from a previously viewed item;
        // `zoomTarget()`/`applyZoom` (above) already know to scale
        // `pdfPages` rather than `img` while this view is the one showing.
        showZoomControls(true);
        setZoom(1);
        for (let i = 0; i < info.pages; i++) {
          const pageImg = document.createElement("img");
          pageImg.className = "lightbox-pdf-page";
          pageImg.loading = "lazy";
          pageImg.alt = `Page ${i + 1} of ${info.pages}`;
          pageImg.src = mediaSrc(pageUrl(i));
          pdfPages.appendChild(pageImg);
        }
        //: **The document block** (Phase 7.1). The page count is known right
        //: here and nowhere else, so this is where the stepper, the chips and
        //: the facts line are told about it. The chips render immediately as
        //: "not read yet" and the stored readings fill them in when they
        //: arrive: a panel that waits for a request before showing the page
        //: count would leave the viewer blank for the one fact it already has.
        docPageCount = info.pages;
        docPage = 0;
        showPageControls(info.pages > 1);
        renderDocPages();
        //: `renderInfo`, not the inline copy in `show()`'s image path: a
        //: document reaches the early return below, so nothing else would ever
        //: draw the facts line for it. Reported as part of the same item, 
        //: "no sections or info are below it really compared to the images."
        renderInfo(item, true);
        loadDocPageReads(attachmentId, name, item).catch(() => {});
        return;
      }
      // pdfpages isn't installed, or this particular file can't be opened: 
      // `info.message` already says which. Fall through to the AI-text path
      // below, which gives the same honest message (docview.py's own
      // "couldn't be opened" vs. "probably a scan" split) rather than a
      // second, differently-worded dead end.
    }
    await loadExtractedText();
  }

  async function show(i) {
    index = (i + items.length) % items.length;
    const item = items[index];
    // **`Promise.resolve()`, not a bare `.catch()` on the call.** Found live,
    // not by reading: this crashed the entire lightbox, not just the new
    // document detection: for the Library's own gallery, whose `getUrl` is
    // `() => mediaSrc(i.url)`, a plain synchronous string return, not a
    // Promise. `.catch` does not exist on a string, so this threw
    // synchronously and no code past it in `show()` ever ran, including the
    // metadata panel that predates this change entirely. `await` on a
    // non-Promise already resolves fine (`show()`'s other two `getUrl()`
    // call sites never hit this); wrapping in `Promise.resolve()` first is
    // what makes `.catch()` safe to chain regardless of which shape a
    // caller returns.
    const rawUrl = await Promise.resolve(item.getUrl()).catch(() => "");
    const name = (/\/media\/([^/?#]+)/.exec(rawUrl || "") || [])[1] || "";
    // A note's own attached file (the `Attachment` model, `/files/{id}`), 
    // distinct from a `/media/{name}` upload, and until now the only file
    // shape the lightbox's document viewer could not read at all: it went
    // straight to a download instead. Same token-gated url shape `mediaSrc`
    // already handles; `showDocument` below is what learned to use it.
    const looksLikeImage =
      IMAGE_SUFFIXES.test(item.filename || "") || IMAGE_SUFFIXES.test(name);
    // A note's own attached file (the `Attachment` model, `/files/{id}`), 
    // distinct from a `/media/{name}` upload, and until now the only file
    // shape the lightbox's document viewer could not read at all: it went
    // straight to a download instead. Same token-gated url shape `mediaSrc`
    // already handles; `showDocument` below is what learned to use it.
    //
    // Gated on `!looksLikeImage`, matching the `name` case just below it, 
    // the comment here used to claim this was "only ever set for a
    // non-image /files/{id}", true only because nothing had ever opened an
    // *image* attachment through this lightbox yet. The Library gallery's
    // own Attachment rows (`renderLibraryImagesGallery`, library.js) changed
    // that: a photo attached to a note now reaches this same code path, and
    // without this guard it fell into the document viewer below, no PDF
    // pages, no image to show, `isPdf` false, straight to `loadExtractedText`
    // asking `/files/{id}/text` for a picture, "no readable text in this
    // file" for what should have been a plain zoomable image.
    const attachmentId = name || looksLikeImage
      ? ""
      : (/\/files\/(\d+)(?:[/?#]|$)/.exec(rawUrl || "") || [])[1] || "";
    // A native document (item.kind already set: see showDocument) has no
    // `/media/...` url to sniff at all; a caller that already declares
    // itself a document skips the filename guess entirely.
    if (item.kind || attachmentId || (name && !looksLikeImage)) {
      overlay.setAttribute("aria-label", item.filename || "Document preview");
      meta.textContent =
        items.length > 1
          ? `${item.filename || ""}, ${index + 1} of ${items.length}`
          : item.filename || "";
      actions.classList.remove("hidden");
      setZoom(1);
      showZoomControls(false);
      openDocBtn.classList.toggle("hidden", !item.documentId);
      syncMoreMenu(item);
      await showDocument(item, name, attachmentId);
      hydrate(index, item, true);
      return;
    }
    doc.classList.add("hidden");
    //: A picture is never a document, so paging from a previewed document to
    //: an image must take this away with the rest of the text controls.
    openDocBtn.classList.add("hidden");
    //: A picture has no text to edit, and leaving Edit/Save on the bar after
    //: paging from a .md to a .png would offer to write the note's markdown
    //: over an image. Cleared with the target, not just hidden.
    lightboxEditTarget = null;
    setLightboxEditing(false);
    editFileBtn.classList.add("hidden");
    lightboxPreviewSource = null;
    lightboxExtractedText = null;
    lightboxOcrTarget = null;
    //: A picture has no pages. Paging from a PDF to an image must take the
    //: stepper and the page chips with it, or the panel keeps offering "page 4
    //: of 9" for a photograph.
    resetDocPages();
    exportTextBtn.classList.add("hidden");
    clearDocPreview();
    previewHtmlBtn.classList.add("hidden");
    find.classList.add("hidden");
    findCount.classList.add("hidden");
    showZoomControls(true);
    img.alt = item.filename || "";
    img.src = rawUrl;
    // A failed decode used to be swallowed here, leaving a blank box with no
    // explanation: reported live as "the second page doesn't load" (an
    // image whose underlying file was gone, paged to from a gallery that
    // itself hides broken tiles, so the lightbox was the only place the
    // failure was ever visible, and it said nothing). Now it says so.
    const ok = await img.decode().then(
      () => true,
      () => false
    );
    img.classList.toggle("hidden", !ok);
    broken.classList.toggle("hidden", ok);
    if (!ok) broken.textContent = `Couldn't load "${item.filename || "this image"}", the file may have been deleted.`;
    overlay.setAttribute("aria-label", item.filename || "Image preview");
    meta.textContent =
      items.length > 1
        ? `${item.filename || ""}, ${index + 1} of ${items.length}`
        : item.filename || "";
    const caption = (item.caption || "").trim();
    const text = (item.text || "").trim();
    infoCaption.textContent = caption;
    infoCaption.classList.toggle("hidden", !caption);
    infoCaptionByline.textContent = caption ? item.captionByline || "" : "";
    infoCaptionByline.classList.toggle("hidden", !caption || !item.captionByline);
    infoText.textContent = text;
    infoText.classList.toggle("hidden", !text);
    infoByline.textContent = item.byline || "";
    infoByline.classList.toggle("hidden", !item.byline);
    renderAltReading(item.altText, item.altByline);
    syncReadingDeletes(item, { text, alt: (item.altText || "").trim() });
    info.classList.toggle("hidden", !caption && !text && !item.filename);
    // The picture's own facts, which the app knew and never showed. Asked
    // for: "maybe it can have the image information and other info about it
    // below the image with the caption and ocr text??" Dimensions come from
    // the decoded image rather than from the server, it is the one fact the
    // browser already has and the API does not carry.
    const facts = [];
    if (ok && img.naturalWidth) facts.push(`${img.naturalWidth} × ${img.naturalHeight}`);
    if (item.addedAt) {
      const when = new Date(item.addedAt);
      if (!Number.isNaN(when.valueOf())) facts.push(`Added ${when.toLocaleDateString()}`);
    }
    if (item.filename) facts.push(item.filename);
    infoFacts.textContent = facts.join("  ·  ");
    infoFacts.classList.toggle("hidden", !facts.length);
    // Paging to another picture starts it at fit, the same way opening one
    // does: carrying a 400% zoom onto the next image lands you somewhere
    // arbitrary in a picture you have not seen yet.
    setZoom(1);
    copyBtn.classList.toggle("hidden", !text);
    // Nothing to act on when the file itself failed to load.
    actions.classList.toggle("hidden", !ok);
    syncMoreMenu(item);

    // **Fill in whatever the caller did not know.** Reported directly: the
    // caption, OCR text and facts appeared in the Image Gallery and nowhere
    // else. The lightbox was never the problem, this metadata arrived as
    // *arguments*, and of nine callers only the gallery holds a full media
    // row to pass. Everywhere else (a note attachment, a chat image, a graph
    // or dashboard thumbnail, a whiteboard object) has a url and a name, so
    // the panel below the picture stayed empty on the same picture that
    // showed a full description one tab over.
    //
    // Asking the server closes that gap in one place instead of nine, and
    // covers callers added later without them having to know to pass
    // anything. Only ever *fills*: a caller that did pass a caption keeps
    // the one it passed, so the gallery's own (possibly just-edited,
    // not-yet-saved) values still win.
    hydrate(index, item, ok);
  }

  // Looked up once per filename per lightbox, then remembered: paging back
  // and forth across a gallery would otherwise refetch the same rows.
  const metaCache = new Map();
  async function hydrate(forIndex, item, ok) {
    if (item.caption && item.text && item.addedAt) return;
    let url;
    try {
      url = await item.getUrl();
    } catch {
      return;
    }
    // `/media/<stored name>`, possibly with a query string (an address
    // saved before 2026-09-24 can still carry one), which is not part of the
    // name.
    const match = /\/media\/([^/?#]+)/.exec(url || "");
    if (!match) return;
    const name = match[1];
    if (!metaCache.has(name)) {
      metaCache.set(
        name,
        apiJson(`/media/meta/${encodeURIComponent(name)}`).catch(() => null)
      );
    }
    const row = await metaCache.get(name);
    // Not an error worth surfacing: plenty of images in this app are not
    // `MediaUpload` rows at all (a sketch rendered straight to a data url,
    // a file whose row was deleted out from under a note that still links
    // it). No metadata simply means no panel, exactly as before.
    if (!row) return;
    // The picture may have been paged away from while this was in flight.
    if (forIndex !== index) return;

    const readings = lightboxReadingsFor(row);
    if (!item.caption && row.caption) item.caption = row.caption;
    if (row.id && !item.metaId) item.metaId = row.id;
    if (!item.text) {
      item.text = readings.text;
      item.textSource = readings.textSource;
    }
    if (!item.addedAt && row.created_at) item.addedAt = row.created_at;
    if (!item.byline) item.byline = readings.byline;
    //: The alternate is filled whenever the row has one, rather than only when
    //: the item arrived without it: a caller that passed a reading but knew
    //: nothing of the second one (every caller with a bare url) would otherwise
    //: keep the panel one reading short for the whole visit.
    if (!item.altText) {
      item.altText = readings.altText;
      item.altByline = readings.altByline;
      item.altSource = readings.altSource;
    }
    if (!item.captionByline) item.captionByline = captionBylineFor(row);
    // The gallery passes `original_name`; a bare url caller passes the
    // stored name or nothing, and the human-readable one is better.
    if (row.original_name && (!item.filename || item.filename === name)) {
      item.filename = row.original_name;
    }
    renderInfo(item, ok);
  }

  // The half of `show()` that draws the panel, split out so `hydrate` can
  // redraw it once the answer arrives without re-running the image load.
  //: Which item the info panel was last drawn for, so a page change can redraw
  //: it without `show()` having to hand the item down through the stepper.
  let lightboxInfoItem = null;

  function renderInfo(item, ok) {
    lightboxInfoItem = item;
    //: **For a document, the panel is about the page on screen** (Phase 7.3).
    //: The file-level values are one caption for a whole PDF, which describes
    //: none of its pages, and the *joined* reading of every page, which is
    //: not what you are looking at when page 4 is up. `docPageRows` has both,
    //: per page, from the `PageRead` store; a page with neither falls back to
    //: the file's own values so nothing that used to show now disappears.
    const row = docPageCount ? docPageRows.get(docPage) : null;
    const perPage = Boolean(row && (row.text || row.caption));
    const caption = perPage ? row.caption : (item.caption || "").trim();
    const text = perPage ? row.text : (item.text || "").trim();
    const captionByline = perPage
      ? row.caption_model
        ? `Figures on page ${docPage + 1}, described by ${shortModelName(row.caption_model)}`
        : ""
      : item.captionByline || "";
    const byline = perPage
      ? row.model
        ? `Page ${docPage + 1}, read by ${shortModelName(row.model)}`
        : row.text
          ? `Page ${docPage + 1}`
          : ""
      : item.byline || "";
    //: What Copy hands over has to be what is on screen: copying every page's
    //: reading while the panel shows one page's is the app disagreeing with
    //: itself about what "this text" means.
    lightboxShownText = text;
    infoCaption.textContent = caption;
    infoCaption.classList.toggle("hidden", !caption);
    infoCaptionByline.textContent = caption ? captionByline : "";
    infoCaptionByline.classList.toggle("hidden", !caption || !captionByline);
    infoText.textContent = text;
    infoText.classList.toggle("hidden", !text);
    infoByline.textContent = byline;
    infoByline.classList.toggle("hidden", !byline);
    //: Not on a page of a document: `docPageRows` holds one reading per page
    //: (`PageRead`), so there is no second reader to footnote there, and the
    //: file-level alternate would be a claim about the whole PDF sitting under
    //: page 4's own text.
    renderAltReading(perPage ? "" : item.altText, item.altByline);
    syncReadingDeletes(item, { text, alt: perPage ? "" : (item.altText || "").trim(), perPage });
    info.classList.toggle("hidden", !caption && !text && !item.filename);
    meta.textContent =
      items.length > 1
        ? `${item.filename || ""}, ${index + 1} of ${items.length}`
        : item.filename || "";
    const facts = [];
    //: A document's dimensions are its *pages*, and the picture's pixel size
    //: is meaningless for one, `docPageCount` is 0 for anything that is not a
    //: rendered PDF, so an image is unaffected.
    if (docPageCount) {
      facts.push(`${docPageCount} page${docPageCount === 1 ? "" : "s"}`);
      facts.push(
        docPagesRead.size
          ? `${docPagesRead.size} read`
          : "none read yet"
      );
    } else if (ok && img.naturalWidth) {
      facts.push(`${img.naturalWidth} × ${img.naturalHeight}`);
    }
    if (item.addedAt) {
      const when = new Date(item.addedAt);
      if (!Number.isNaN(when.valueOf())) facts.push(`Added ${when.toLocaleDateString()}`);
    }
    if (item.filename) facts.push(item.filename);
    infoFacts.textContent = facts.join("  ·  ");
    infoFacts.classList.toggle("hidden", !facts.length);
    copyBtn.classList.toggle("hidden", !text);
    copyBtn.title = perPage
      ? `Copy the text read from page ${docPage + 1}`
      : "Copy the text read from this image";
  }

  const close = () => {
    overlay.remove();
    document.removeEventListener("keydown", onKey);
  };
  const onKey = (e) => {
    if (e.key === "Escape") close();
    else if (e.key === "ArrowLeft" && items.length > 1) show(index - 1);
    else if (e.key === "ArrowRight" && items.length > 1) show(index + 1);
  };
  // Only empty space closes on click, the picture, the metadata and the
  // nav/close buttons all need to stay clickable without dismissing the
  // dialog they sit inside. The three layout boxes named here have no content
  // of their own: the column is full-window-width and only as tall as the
  // picture, so without them the entire band left and right of the image was
  // dead to a dismissing click. See `wireBackdropClose`.
  wireBackdropClose(overlay, close, ".lightbox-column, .lightbox-stage-wrap, .lightbox-stage");
  closeBtn.addEventListener("click", close);
  prevBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    show(index - 1);
  });
  nextBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    show(index + 1);
  });
  document.addEventListener("keydown", onKey);

  stage.append(img, broken);
  // **The arrows must not live inside the stage.** The stage scrolls now
  // (zoom needs it to, so a magnified picture can be panned to its edges),
  // and an absolutely-positioned child of a scrolling box scrolls with its
  // content: so the arrows drifted off-centre and away from the edges the
  // moment anything overflowed. Reported live: "completely off, different
  // distances from the edge of the screen, at different heights, and not
  // even aligned."
  //
  // A non-scrolling wrapper holds both: the stage scrolls inside it, the
  // arrows are positioned against it, and because the wrapper is exactly
  // the stage's box, `top: 50%` is still the middle of the picture, which
  // is the property the note on `.lightbox-nav` says two earlier attempts
  // lost.
  const stageWrap = document.createElement("div");
  stageWrap.className = "lightbox-stage-wrap";
  stageWrap.appendChild(stage);
  //: `lightbox-paged` narrows the stage by the arrows' room, so the picture
  //: never goes under one (02-chat-graph.css).
  if (items.length > 1) {
    stageWrap.append(prevBtn, nextBtn);
    stageWrap.classList.add("lightbox-paged");
  }
  const column = document.createElement("div");
  column.className = "lightbox-column";
  column.append(stageWrap, meta, actions, info);
  overlay.append(closeBtn, column);
  document.body.appendChild(overlay);
  closeBtn.focus();
  //: `.then`, not `await`: `openLightbox` is not async and its nine callers
  //: do not expect it to be. The dialog is already on screen and interactive
  //: by the time this resolves; all that is left is where to point the reader.
  Promise.resolve(show(startIndex)).then(() => {
    if (!opts.focusReading) return;
    //: Start on the first page that actually has a reading. Page 1 of a scan
    //: is often a cover, and "open the reading" landing on a page with none is
    //: the same disappointment as not opening it at all.
    if (docPageCount && docPagesRead.size) {
      setDocPage(Math.min(...docPagesRead));
    }
    //: `block: "end"` because the panel sits *under* the file: bringing its
    //: bottom into view is what puts the reading on screen, where "nearest"
    //: would decide it is already close enough and do nothing.
    info.scrollIntoView({ block: "end" });
    //: Focus follows the eye. `-1` so it is a destination rather than another
    //: stop on the way through the dialog's own controls.
    infoText.tabIndex = -1;
    infoText.focus();
  });
}

// A small kebab (⋯) near whatever the user just selected, anywhere in the
// app's actual content: a document, the graph, a web search result, a chat
// message, a note. Asked for directly: "if the user highlights an output or
// piece of text... the user can save it as a note, search the notebook for
// similar phrases or meaning/topics, ask the ai about it".
//
// **It used to be three flat buttons, and the shape was the problem.** Asked
// for directly, second time round: "a kebab 3-dot button which when clicked on
// shows the Popup buttons within the application window". Three things go
// wrong with a bar that is always open, and all three are fixed by a kebab:
//
//   1. **It ran off the screen.** The old clamp was
//      `Math.min(Math.max(margin, left), innerWidth - width - margin)`. When
//      the bar is wider than the viewport the upper bound is *smaller* than
//      the lower bound, so `Math.min` wins and `left` goes negative. The bar
//      could not wrap (`white-space: nowrap`, no `flex-wrap`) and its three
//      labels ran to ~50 characters, comfortably wider than a 360px phone.
//      The clamp below is written the other way round, so a box too wide to
//      fit pins to the margin instead of hanging off the left edge.
//   2. **It covered the thing you had just selected.** A 28px dot does not.
//   3. **Three actions was the ceiling.** The app's richest capture surface
//      offered less than a note card's own ⋯ menu. A menu has room, so this
//      is now where a selection can become a note, a draft, an addition to an
//      existing note, several linked notes, a reminder, or a question.
//
// Denylist rather than an allowlist of containers: excluding form fields
// (which already have their own selection/context-menu behaviour a popup
// stealing focus would fight) and the popup's own text is simpler than
// naming every readable surface in the app and it can't silently miss one
// that gets added later.
//: Overlays are out too: the Finder, the palette and a dialog are about the
//: thing they show, and a popup offering to turn their text into a note
//: would sit over the controls a person is using.
const SELECTION_POPUP_EXCLUDED =
  "input, textarea, [contenteditable], .selection-popup, .lock-overlay, .modal-overlay, .command-palette";

let selectionPopupEl = null;
let selectionPopupText = "";
let selectionPopupSource = null;

// Where the selected passage came from, when the app actually knows.
//
// Only the web reader can answer this today, and it can answer it exactly:
// `webReaderPage` already holds the url and title of the page on screen. This
// is the "capture surface" half of BACKLOG.md §65 (highlight/web-clip
// capture): the half that item calls small. Everywhere else in the app the
// honest answer is "no external source", and `null` says so rather than
// inventing one.
function selectionSource(node) {
  const el = node && (node.nodeType === 1 ? node : node.parentElement);
  if (!el || !el.closest("#web-reader")) return null;
  if (!webReaderPage?.url) return null;
  return { url: webReaderPage.url, title: webReaderPage.title || webReaderPage.domain || "" };
}

// A passage, quoted, with its origin attributed underneath.
//
// Markdown blockquote rather than a bare paste, because a clipping is somebody
// else's words and a notebook that cannot tell them from yours is worse than
// one that refuses the clipping. The source line is a real markdown link, so
// it stays clickable in the rendered note.
function clippingMarkdown(text, source) {
  const quoted = text
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
  if (!source) return quoted;
  const label = source.title || source.url;
  return `${quoted}\n\n: [${label}](${source.url})`;
}

async function saveSelectionAsNote(text, { draft = false, source = null } = {}) {
  const content = source ? clippingMarkdown(text, source) : text;
  // Real metadata alongside the body's own blockquote+link (BACKLOG §65's
  // "source as metadata, not just folded into body text"), the body copy
  // stays so the note is still a plain, portable markdown file with no app
  // behind it; the columns are what let a note card show a real badge or a
  // future "everything clipped from this site" filter without parsing it
  // back out.
  const sourceFields = source
    ? { source_url: source.url, source_title: source.title || "" }
    : {};
  try {
    const created = await apiJson("/entries", {
      method: "POST",
      body: JSON.stringify({ content, is_draft: draft, ...sourceFields }),
    });
    // Undoable, like every other create in this app (the global stack: 
    // see pushUndo). Saving a clipping by accident and having no way back
    // would be a worse experience than the old three-button bar's.
    pushUndo(
      draft ? "Saved a selection as a draft" : "Saved a selection as a note",
      async () => {
        await api(`/entries/${created.id}`, { method: "DELETE" });
        await loadEntries();
      },
      async () => {
        await apiJson("/entries", {
          method: "POST",
          body: JSON.stringify({ content, is_draft: draft, ...sourceFields }),
        });
        await loadEntries();
      }
    );
    toast(draft ? "Saved as a draft note." : "Saved as a note.");
    // Same fix as saveChatAnswerAsNote(): unconditional. A selection saved
    // from wherever the popup was invoked (not necessarily the Notes tab)
    // must not leave the in-memory `entries` list stale until something
    // else happens to refetch it.
    loadEntries();
  } catch (error) {
    toast(error.message || "Couldn't save that note.", true);
  }
}

// Append the selection to a note the user picks.
//
// Uses `pickEntryDialog` below rather than the chat dock's `#note-picker-panel`
//, that one is a multi-select bound to the chat composer, not a general
// chooser, and reusing it would mean it had two owners.
//: `jump` is for the one caller that is not a selection: the writing desk's
//: "Insert into a note". `flashEntry` is the app's answer to "where did it
//: go", and it is the right answer for the selection popup, which has nothing
//: left behind it. From the desk it walks off a half-written draft and its
//: thoughts to show a note that is already saved, so that caller takes the
//: same trip as an offer instead (`toastAction`), and stays where it is.
async function appendSelectionToNote(text, { jump = true, message = null, what = "the selected text" } = {}) {
  const entry = await pickEntryDialog(message || "Add the selected text to which note?");
  if (!entry) return;
  const before = entry.content;
  const after = `${before.trimEnd()}\n\n${text}`;
  try {
    await api(`/entries/${entry.id}`, {
      method: "PUT",
      body: JSON.stringify({ content: after }),
    });
    pushEntryPutUndo(entry.id, "Added text to a note", { content: before }, { content: after });
    await loadEntries();
    if (jump) {
      toast("Added to the note.");
      flashEntry(entry.id);
    } else {
      toastAction("Added to the note.", "Open it", () => flashEntry(entry.id));
    }
  } catch (error) {
    toast(error.message || `Couldn't add ${what} to the note.`, true);
  }
}

//: **The board's own way into a note** (INBOX 309). The second of the two
//: doorways the owner asked for, and the one that starts where the thought
//: does: you are looking at the board, and it belongs with something you
//: wrote.
//:
//: Deliberately `appendSelectionToNote` rather than a second write path. That
//: function already picks the note, appends, records the undo
//: (`pushEntryPutUndo`) and reloads the list; a board-shaped copy of it would
//: be a second place for "add text to a note" to get its undo wrong.
//:
//: The index is invalidated before the note is drawn again, because the board
//: may have been made in the last eight seconds: see `loadMapBoardIndex`'s
//: `force`. Without it the note would paint the board's own object as a
//: tombstone the moment it was added, which is the worst possible first
//: impression of this feature.
async function addBoardToNote(board) {
  if (!board || board.id == null) {
    toast("The default board has no name to put in a note. Make a board first.");
    return;
  }
  const isMap = board.type !== "board";
  await appendSelectionToNote(boardEmbedMarkdown(board), {
    jump: false,
    what: isMap ? "that map" : "that board",
    message: `Add \u201c${board.title || (isMap ? "this map" : "this board")}\u201d to which note?`,
  });
  if (typeof loadMapBoardIndex === "function") loadMapBoardIndex(true);
}

// A one-off "choose a note" dialog: search box, live list, Escape to cancel.
//
// Built on the same shape as `promptDialog` (overlay + card + captured
// keydown + returned focus) rather than beside it, so a dialog opened from a
// selection behaves identically to every other dialog in the app, 
// `activeOverlay()` picks it up from its `role="dialog"` and traps Tab inside
// it with no registration step.
function pickEntryDialog(message) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay confirm-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", message);

    const card = document.createElement("div");
    card.className = "card modal-card confirm-card entry-pick-card";
    const text = document.createElement("p");
    text.className = "confirm-text";
    text.textContent = message;
    const search = document.createElement("input");
    search.type = "text";
    search.placeholder = "Search your notes…";
    search.setAttribute("aria-label", "Search your notes");
    const list = document.createElement("div");
    list.className = "entry-pick-list";

    const returnFocus = document.activeElement;
    let settled = false;
    const close = (entry) => {
      if (settled) return;
      settled = true;
      document.removeEventListener("keydown", onKey, true);
      overlay.remove();
      returnFocus?.focus?.();
      resolve(entry);
    };
    const onKey = (event) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      close(null);
    };

    // Drafts excluded: adding to a half-finished draft is not what "an
    // existing note" means, and the Notes tab already keeps them out of every
    // other list for the same reason.
    const paint = () => {
      const term = search.value.trim().toLowerCase();
      const matches = allEntries
        .filter((e) => !e.is_draft && !e.is_deleted)
        .filter((e) => !term || (e.content || "").toLowerCase().includes(term))
        .slice(0, 40);
      list.replaceChildren();
      if (!matches.length) {
        const empty = document.createElement("p");
        empty.className = "muted";
        empty.textContent = term ? "No notes match that." : "No notes yet.";
        list.appendChild(empty);
        return;
      }
      for (const entry of matches) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "entry-pick-row";
        button.textContent = entry.title || clipText(notePreviewText(entry.content), 90);
        button.addEventListener("click", () => close(entry));
        list.appendChild(button);
      }
    };
    search.addEventListener("input", paint);
    paint();

    const row = document.createElement("div");
    row.className = "row confirm-actions";
    row.append(smallButton("Cancel", "Cancel", () => close(null)));
    card.append(text, search, list, row);
    overlay.appendChild(card);
    wireBackdropClose(overlay, () => close(null));
    document.addEventListener("keydown", onKey, true);
    document.body.appendChild(overlay);
    search.focus();
  });
}

//: **Choose any one thing the library holds**, a note, a document, a file or
//: a saved link: as `{kind, id, label}`.
//:
//: A fourth chooser only because the three that exist answer different
//: questions. `pickEntryDialog` above returns a *note* and nothing else;
//: `pickMediaDialog` below returns an upload; the chat dock's
//: `#note-picker-panel` is a multi-select bound to the composer's own
//: attachment lists, so borrowing it would give it two owners (its own
//: comment says as much). This one returns exactly one item and says which of
//: the four tables it came from, which is what a map's reference node needs:
//: `POST /whiteboard/boards/{id}/nodes` takes a `kind` and a `ref_id` and
//: resolves the label itself (MINDMAP_PLAN.md §9.2: a copied title goes
//: stale the moment the thing behind it is renamed).
//:
//: `kind` is deliberately the *server's* vocabulary: note / document / file
//: / link, `MAP_REFERENCE_KINDS` in routes_whiteboard.py: rather than a
//: display word, so a caller never has to translate between what the picker
//: says and what the endpoint accepts.
//: **`optIn` keeps a source out of the default set.** A board is a thing the
//: Library holds and a perfectly good thing to point at from a note (INBOX
//: 309), but this dialog's first caller feeds a map's reference node, and
//: `MAP_REFERENCE_KINDS` in routes_whiteboard.py is note / document / file /
//: link: a board offered there would be a row that cannot be saved. So the
//: board source exists, and only a caller that names it in `sources` is
//: shown it.
const LIBRARY_PICK_SOURCES = [
  { kind: "note", label: "Notes", icon: "ph:note", placeholder: "Search your notes…" },
  { kind: "document", label: "Documents", icon: "ph:file-text", path: "/documents", placeholder: "Search your documents…" },
  { kind: "file", label: "Files", icon: "ph:paperclip", path: "/files/gallery", placeholder: "Search your files…" },
  { kind: "link", label: "Links", icon: "ph:link-simple", path: "/bookmarks", placeholder: "Search your links…" },
  {
    kind: "board",
    label: "Boards and maps",
    //: Per row, not per source: a whiteboard and a mind map sit in one list
    //: here, and the owner has already reported once that a list of bare
    //: titles gives no way to tell them apart.
    icon: (row) => (row?.type === "board" ? "ph:squares-four" : "ph:tree-structure"),
    path: "/whiteboard/boards",
    placeholder: "Search your boards and maps…",
    //: The unnamed scratch board (`id: null`) is left out, the same rule
    //: `renderAttachToBoard` states: it is where things land when nobody
    //: chose a board, not somewhere to point at on purpose.
    keep: (row) => row && row.id != null,
    optIn: true,
  },
];

//: One row's label per source, in one table for the reason `notePickerShape`
//: gives for its own: the renderer is the same list either way, and four
//: copies of it is how the four drift apart.
function libraryPickLabel(kind, row) {
  if (kind === "note") return noteLabel(row, 70);
  if (kind === "board") return row.title || (row.type === "board" ? "Untitled board" : "Untitled map");
  if (kind === "document") return row.title || "Untitled document";
  if (kind === "file") return row.original_name || row.filename || "File";
  return row.title || row.url || "Link";
}

//: Fetched once per dialog rather than per keystroke, and per source rather
//: than all four up front, the same two rules `notePickerRows` follows, and
//: for the same reason: three of these lists are never looked at by someone
//: who came to point at a note.
function pickLibraryItemDialog(message, { sources = null } = {}) {
  const available = LIBRARY_PICK_SOURCES.filter((source) =>
    sources ? sources.includes(source.kind) : !source.optIn
  );
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay confirm-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", message);

    const card = document.createElement("div");
    card.className = "card modal-card confirm-card entry-pick-card";
    const text = document.createElement("p");
    text.className = "confirm-text";
    text.textContent = message;

    let active = available[0];
    const seg = document.createElement("div");
    seg.className = "seg seg-compact";
    seg.setAttribute("role", "tablist");
    seg.setAttribute("aria-label", "What to point at");

    const search = document.createElement("input");
    search.type = "search";
    search.placeholder = active.placeholder;
    search.setAttribute("aria-label", message);
    const list = document.createElement("div");
    list.className = "entry-pick-list";

    const returnFocus = document.activeElement;
    let settled = false;
    const close = (choice) => {
      if (settled) return;
      settled = true;
      document.removeEventListener("keydown", onKey, true);
      overlay.remove();
      returnFocus?.focus?.();
      resolve(choice);
    };
    const onKey = (event) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      close(null);
    };

    //: Per-source, so switching tabs and back does not re-fetch. Notes are
    //: never in here: `allEntries` is already in memory and is kept current
    //: by every save, so a second copy would be the stale one.
    const cache = {};
    let token = 0;

    const rowsFor = async (kind) => {
      if (kind === "note") {
        //: Drafts, deleted notes, private notes and boards are all excluded.
        //: Drafts for the reason `pickEntryDialog` gives: "an existing note"
        //: does not mean a half-typed capture, and a board because it is
        //: usually the very thing this picker was opened *from*.
        return (typeof allEntries !== "undefined" ? allEntries : []).filter(
          (entry) => !entry.is_draft && !entry.is_deleted && !entry.is_board && !entry.is_private
        );
      }
      if (cache[kind]) return cache[kind];
      const source = available.find((s) => s.kind === kind);
      //: The gallery is paged (tests/test_gallery_paging.py); the other
      //: sources answer in one response.
      const read = source.path === "/files/gallery"
        ? apiPagedList(source.path, 200, { silent: true })
        : apiJson(source.path, { silent: true });
      const rows = await read.catch(() => []);
      const list = Array.isArray(rows) ? rows : rows.documents || [];
      cache[kind] = source.keep ? list.filter(source.keep) : list;
      return cache[kind];
    };

    const paint = async () => {
      const mine = (token += 1);
      const kind = active.kind;
      const term = search.value.trim().toLowerCase();
      const rows = await rowsFor(kind);
      // A slow fetch that finished after the user moved on must not paint
      // over the tab they are actually looking at.
      if (mine !== token || active.kind !== kind) return;
      const matches = rows
        .map((row) => ({ row, label: libraryPickLabel(kind, row) }))
        .filter(({ label }) => !term || label.toLowerCase().includes(term))
        .slice(0, 40);
      list.replaceChildren();
      if (!matches.length) {
        const empty = document.createElement("p");
        empty.className = "muted";
        empty.textContent = term
          ? `No ${active.label.toLowerCase()} match that.`
          : `No ${active.label.toLowerCase()} yet.`;
        list.appendChild(empty);
        return;
      }
      for (const { row, label } of matches) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "entry-pick-row";
        setLabel(button, `${typeof active.icon === "function" ? active.icon(row) : active.icon} ${label}`);
        button.title = label;
        //: The row itself travels with the choice. A caller that only needs
        //: an id is unchanged (it destructures the three it always did), and
        //: a caller that needs a fact the row already carries, whether a
        //: board is a map, gets it without a second fetch for a list it has
        //: just read.
        button.addEventListener("click", () => close({ kind, id: row.id, label, row }));
        list.appendChild(button);
      }
    };

    for (const source of available) {
      const tab = document.createElement("button");
      tab.type = "button";
      tab.setAttribute("role", "tab");
      tab.dataset.pickKind = source.kind;
      tab.textContent = source.label;
      const on = source.kind === active.kind;
      tab.classList.toggle("active", on);
      tab.setAttribute("aria-selected", on ? "true" : "false");
      tab.addEventListener("click", () => {
        active = source;
        for (const sibling of seg.querySelectorAll("button")) {
          const chosen = sibling.dataset.pickKind === source.kind;
          sibling.classList.toggle("active", chosen);
          sibling.setAttribute("aria-selected", chosen ? "true" : "false");
        }
        search.placeholder = source.placeholder;
        paint();
        search.focus();
      });
      seg.appendChild(tab);
    }

    search.addEventListener("input", paint);
    paint();

    const row = document.createElement("div");
    row.className = "row confirm-actions";
    row.append(smallButton("Cancel", "Cancel", () => close(null)));
    card.append(text, seg, search, list, row);
    overlay.appendChild(card);
    wireBackdropClose(overlay, () => close(null));
    document.addEventListener("keydown", onKey, true);
    document.body.appendChild(overlay);
    search.focus();
  });
}

//: **Several notes at once**, which `pickLibraryItemDialog` above deliberately
//: cannot do: that one closes on the first click, because pointing a node at a
//: note is one choice and a confirm step would be a second click for nothing.
//: "Make a map of these notes" is the opposite shape, a list you assemble, so
//: the row is a checkbox and the dialog closes on a button.
//:
//: It draws the same `.entry-pick-*` recipe as its single-pick sibling rather
//: than a second look for the same job, and it reads `allEntries`, the
//: in-memory list every save keeps current, so there is no fetch and no second
//: copy of the notebook to go stale.
//:
//: Resolves with an array of `{id, label}` in the order they were ticked, or
//: null if the dialog was dismissed: the empty array is a real answer nobody
//: wants (a map of no notes), so the confirm button stays disabled until at
//: least one row is on.
function pickNotesDialog(message, { confirmLabel = "Continue", limit = 40 } = {}) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay confirm-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", message);

    const card = document.createElement("div");
    card.className = "card modal-card confirm-card entry-pick-card";
    const head = document.createElement("div");
    head.className = "row confirm-head";
    const title = document.createElement("h3");
    title.className = "confirm-title";
    title.textContent = message;
    head.appendChild(title);

    const search = document.createElement("input");
    search.type = "search";
    search.placeholder = "Search your notes…";
    search.setAttribute("aria-label", message);
    const list = document.createElement("div");
    list.className = "entry-pick-list";
    const count = document.createElement("p");
    count.className = "muted";

    //: The ticks live here and not in the DOM, so a note stays chosen when a
    //: search term hides its row: typing a second term to find the second note
    //: would otherwise silently unpick the first.
    const chosen = new Map();
    const returnFocus = document.activeElement;
    let settled = false;
    const close = (answer) => {
      if (settled) return;
      settled = true;
      document.removeEventListener("keydown", onKey, true);
      overlay.remove();
      returnFocus?.focus?.();
      resolve(answer);
    };
    const onKey = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      close(null);
    };

    const confirm = smallButton(confirmLabel, confirmLabel, () => {
      if (!chosen.size) return;
      close([...chosen.entries()].map(([id, label]) => ({ id, label })));
    }, false);

    const refreshCount = () => {
      count.textContent = chosen.size
        ? `${chosen.size} note${chosen.size === 1 ? "" : "s"} chosen${chosen.size >= limit ? ` (the most this can use is ${limit})` : ""}`
        : "Pick the notes this should be built from.";
      confirm.disabled = chosen.size === 0;
    };

    const paint = () => {
      const term = search.value.trim().toLowerCase();
      const rows = (typeof allEntries !== "undefined" ? allEntries : []).filter(
        (entry) => !entry.is_draft && !entry.is_deleted && !entry.is_board && !entry.is_private
      );
      const matches = rows
        .map((row) => ({ row, label: noteLabel(row, 70) }))
        .filter(({ label }) => !term || label.toLowerCase().includes(term))
        .slice(0, 60);
      list.replaceChildren();
      if (!matches.length) {
        const empty = document.createElement("p");
        empty.className = "muted";
        empty.textContent = term ? "No notes match that." : "No notes yet.";
        list.appendChild(empty);
        return;
      }
      for (const { row, label } of matches) {
        const line = document.createElement("label");
        line.className = "entry-pick-row entry-pick-check";
        const box = document.createElement("input");
        box.type = "checkbox";
        box.checked = chosen.has(row.id);
        box.addEventListener("change", () => {
          if (box.checked && chosen.size >= limit && !chosen.has(row.id)) {
            box.checked = false;
            toast(`That is the most this can use at once: ${limit} notes.`);
            return;
          }
          if (box.checked) chosen.set(row.id, label);
          else chosen.delete(row.id);
          refreshCount();
        });
        const text = document.createElement("span");
        text.textContent = label;
        line.append(box, text);
        line.title = label;
        list.appendChild(line);
      }
    };

    search.addEventListener("input", paint);
    paint();
    refreshCount();

    const row = document.createElement("div");
    row.className = "row confirm-actions";
    row.append(smallButton("Cancel", "Cancel", () => close(null)), confirm);
    card.append(head, search, list, count, row);
    overlay.appendChild(card);
    wireBackdropClose(overlay, () => close(null));
    document.addEventListener("keydown", onKey, true);
    document.body.appendChild(overlay);
    search.focus();
  });
}

// Pick something already uploaded rather than uploading it again, asked for
// directly: "I also want to be able to attach images that are already in the
// image library... to new notes in the capture subtab." `/media` (the same
// list the Image Gallery renders from) has no mime field, only a filename
// and an original name, reusing the gallery's own approach of just trying
// each as an <img> and dropping the tile on error, rather than guessing from
// a file extension.
function pickMediaDialog() {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay confirm-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Choose from your library");

    const card = document.createElement("div");
    card.className = "card modal-card confirm-card entry-pick-card";
    const text = document.createElement("p");
    text.className = "confirm-text";
    text.textContent = "Choose an image already in your library";
    const search = document.createElement("input");
    search.type = "text";
    search.placeholder = "Search by filename…";
    search.setAttribute("aria-label", "Search your uploaded images");
    const grid = document.createElement("div");
    grid.className = "media-pick-grid";

    const returnFocus = document.activeElement;
    let settled = false;
    const close = (upload) => {
      if (settled) return;
      settled = true;
      document.removeEventListener("keydown", onKey, true);
      overlay.remove();
      returnFocus?.focus?.();
      resolve(upload);
    };
    const onKey = (event) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      close(null);
    };

    let uploads = [];
    const paint = () => {
      const term = search.value.trim().toLowerCase();
      const matches = uploads
        .filter((u) => !term || u.original_name.toLowerCase().includes(term))
        .slice(0, 60);
      grid.replaceChildren();
      if (!matches.length) {
        const empty = document.createElement("p");
        empty.className = "muted";
        empty.textContent = uploads.length
          ? "No uploads match that."
          : "Nothing uploaded yet: attach a new file to start your library.";
        grid.appendChild(empty);
        return;
      }
      for (const upload of matches) {
        const tile = document.createElement("button");
        tile.type = "button";
        tile.className = "media-pick-tile";
        tile.title = upload.original_name;
        const img = document.createElement("img");
        img.src = mediaSrc(upload.url);
        img.alt = "";
        img.loading = "lazy";
        // Not every upload is an image (there's no mime field to check
        // first): a file that can't decode as one drops its own tile
        // rather than showing a broken-image glyph, same as the gallery.
        img.addEventListener("error", () => tile.remove());
        const name = document.createElement("span");
        name.textContent = upload.original_name;
        tile.append(img, name);
        tile.addEventListener("click", () => close(upload));
        grid.appendChild(tile);
      }
    };
    search.addEventListener("input", paint);

    const row = document.createElement("div");
    row.className = "row confirm-actions";
    row.append(smallButton("Cancel", "Cancel", () => close(null)));
    card.append(text, search, grid, row);
    overlay.appendChild(card);
    wireBackdropClose(overlay, () => close(null));
    document.addEventListener("keydown", onKey, true);
    document.body.appendChild(overlay);
    search.focus();

    apiJson("/media", { silent: true })
      .then((list) => {
        uploads = list || [];
        paint();
      })
      .catch(() => {
        grid.replaceChildren();
        const err = document.createElement("p");
        err.className = "muted";
        err.textContent = "Couldn't load your library.";
        grid.appendChild(err);
      });
  });
}

// Turn the selection into a reminder, through the same parser the Reminders
// tab's "magic add" box uses: not a second one.
async function remindFromSelection(text) {
  try {
    const reminder = await apiJson("/reminders/parse", {
      method: "POST",
      // Our clock, so "tomorrow evening" resolves against the time the user
      // can see rather than the server's UTC: same as magicAddReminder.
      body: JSON.stringify({ text, tz_offset_minutes: -new Date().getTimezoneOffset() }),
    });
    toast(`Reminder set: ${relativeWhen(reminder.due_at)}.`);
    askNotificationPermission();
    // Same fix as saveChatAnswerAsNote()/saveSelectionAsNote(): unconditional,
    // so a reminder created from wherever this popup was invoked doesn't sit
    // stale out of the Reminders tab's in-memory list.
    loadReminders();
  } catch (error) {
    toast(error.message || "Couldn't read a reminder from that.", true);
  }
}

// The actions the ⋯ offers. Rebuilt on every open rather than once, because
// two of them depend on state that changes between selections: whether the
// passage has a source to attribute, and whether the local model is running.
// The <textarea>/<input> a selection came from, or null when the selection is
// in rendered content. Kept separate from `selectionPopupText` because the
// field is what an edit action needs to write back into.
let selectionPopupField = null;

// A selection inside a text field, or null.
//
// This needs its own path because `window.getSelection()` does not see inside
// a <textarea>, the browser keeps that selection on the element itself, as
// `selectionStart`/`selectionEnd`. That is the real reason the popup never
// appeared while editing, and reading the DOM selection alone will always
// come back empty there no matter what the exclusion list says.
function fieldSelection() {
  const el = document.activeElement;
  if (!el || (el.tagName !== "TEXTAREA" && el.tagName !== "INPUT")) return null;
  // `selectionStart` is null on input types that do not support it (number,
  // email, colour…), which is exactly the set we should not offer this on.
  if (el.selectionStart == null || el.selectionStart === el.selectionEnd) return null;
  //: A search box's selected query is not writing (the Finder and the
  //: palette open with their query selected so typing replaces it), and a
  //: field inside an overlay belongs to that overlay: the popup drew its
  //: menu over the Finder's own results. Writing fields only.
  if (el.type === "search" || el.closest(".lock-overlay, .modal-overlay, .command-palette, [role='combobox']")) {
    return null;
  }
  const text = el.value.slice(el.selectionStart, el.selectionEnd);
  return text.trim() ? { el, start: el.selectionStart, end: el.selectionEnd, text } : null;
}

// Replace a field's selected range, then put the caret back around the same
// passage. Dispatches `input` because everything downstream of typing, 
// draft autosave, the character counter, the live markdown preview, listens
// for it, and a programmatic value change fires nothing on its own.
function wrapFieldSelection(field, before, after) {
  const { el, start, end, text } = field;
  el.value = el.value.slice(0, start) + before + text + after + el.value.slice(end);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.focus();
  el.setSelectionRange(start + before.length, start + before.length + text.length);
}

function selectionMenuItems() {
  const text = selectionPopupText;
  const source = selectionPopupSource;
  const aiOff = modelStatus ? modelStatus.ollama_running === false : false;

  const items = [];

  // **Where highlighting is discoverable from.** `==text==` renders as a
  // highlight, but a syntax nobody is told about may as well not exist, 
  // reported exactly that way ("I still dont know how to highlight text").
  // Selecting the words you want marked and picking a colour is the
  // affordance; the syntax it writes is still plain text in the note, so
  // nothing here is a second way of storing a highlight.
  if (selectionPopupField) {
    const field = selectionPopupField;
    items.push(
      makeMenuItem("ph:highlighter Highlight", "Mark this passage (yellow)", () =>
        wrapFieldSelection(field, "==", "==")
      ),
      makeMenuItem("ph:palette Highlight in a colour…", "Green, blue, pink, purple or orange", async () => {
        const colour = (await promptDialog(
          "Colour: green, blue, pink, purple or orange:", "green"
        )).trim().toLowerCase();
        if (!colour) return;
        if (!["yellow", "green", "blue", "pink", "purple", "orange"].includes(colour)) {
          toast("Pick one of: yellow, green, blue, pink, purple, orange.", true);
          return;
        }
        wrapFieldSelection(field, colour === "yellow" ? "==" : `==${colour}|`, "==");
      }),
      makeMenuItem("ph:text-b Bold", "Wrap this in **bold**", () =>
        wrapFieldSelection(field, "**", "**")
      ),
      makeMenuItem("ph:text-italic Italic", "Wrap this in *italic*", () =>
        wrapFieldSelection(field, "*", "*")
      )
    );
  }

  items.push(
    makeMenuItem("ph:note-pencil Save as a note", "File this straight into your notebook", () =>
      saveSelectionAsNote(text)
    ),
    makeMenuItem("ph:pencil-simple-line Save as a draft", "Keep it as an unfinished draft", () =>
      saveSelectionAsNote(text, { draft: true })
    ),
    makeMenuItem("ph:plus-circle Add to a note…", "Append this to a note you already have", () =>
      appendSelectionToNote(text)
    )
  );

  if (source) {
    items.push(
      makeMenuItem(
        "ph:quotes Save with its source",
        `Save as a quote, credited to ${source.title || source.url}`,
        () => saveSelectionAsNote(text, { source })
      )
    );
  }

  items.push(
    // Through the shared helper, not `navigator.clipboard` directly: it falls
    // back to a hidden textarea and then to showing the text pre-selected,
    // which is what makes copy work in the hardened webview the desktop build
    // runs in. (`tests/test_log_console.py` enforces this, and caught the
    // direct call that was here first.)
    makeMenuItem("ph:copy Copy", "Copy the selected text", async () => {
      if (await copyToClipboard(text)) toast("Copied.");
    }),
    makeMenuItem("ph:magnifying-glass Search the notebook", "Find notes that match this", () => {
      switchTab("notes");
      showNotesSection("browse");
      noteSearch = text;
      $("note-search").value = text;
      $("save-search").classList.remove("hidden");
      renderEntries();
      if ($("semantic-search-toggle")?.checked) loadEntries();
    }),
    makeMenuItem("ph:bell Set a reminder", "Read a reminder out of the selection", () =>
      remindFromSelection(text)
    )
  );

  // AI-only, and disabled rather than hidden when the model is off, the same
  // convention `data-needs-model` applies to every other AI action, so the
  // capability stays discoverable and the reason is on the item itself.
  // (That attribute is read from the markup by `syncModelGatedControls`, and
  // these items are built fresh on every open, so they carry the state
  // directly instead.)
  items.push(
    makeMenuItem(
      "ph:scissors Extract notes…",
      aiOff
        ? `Extracting notes needs the local AI. ${AI_OFFLINE_HINT}.`
        : "Split this into one or more linked notes, with a preview first",
      () => {
        if (aiOff) {
          toast("Extracting notes needs the local AI.", true);
          return;
        }
        openExtractPreview(text);
      }
    ),
    makeMenuItem("ph:chat-circle Ask Atlas about this", "Start a chat about the selection", () => {
      switchTab("chat");
      const input = $("chat-input");
      input.value = `Tell me about this: "${text}"`;
      input.focus();
    })
  );
  return items;
}

function selectionPopup() {
  if (selectionPopupEl) return selectionPopupEl;
  const box = document.createElement("div");
  box.className = "selection-popup hidden";
  document.body.appendChild(box);
  selectionPopupEl = box;
  return box;
}

function hideSelectionPopup() {
  selectionPopupEl?.classList.add("hidden");
  selectionPopupText = "";
  selectionPopupSource = null;
}

// Keep the menu inside the window, the literal ask ("shows the Popup buttons
// within the application window").
//
// `.action-menu` is `position: absolute; right: 0; top: calc(100% + 4px)`,
// which is right for a kebab sitting in a card near the top of a page and
// wrong for one that can appear anywhere, including two lines above the
// footer. Measured after opening, the same way `buildMenuGroupButton` already
// decides which side a submenu flies out to, and using the same
// measure-then-classify shape rather than a second mechanism.
function clampSelectionMenu(menu) {
  menu.classList.remove("menu-flip-up", "menu-flip-left");
  //: **A menu that has left its box is already placed, and flipping it here
  //: collapses it.** Reported: "when I highlight text and the popup kebab
  //: button appears, the first time I click it, a little collapsed line
  //: appears below it, then I need to click the button to close the popup and
  //: reopen it for it to actually show".
  //:
  //: `openActionMenu` calls `escapeMenuIfClipped` first, which reparents a
  //: clipped menu to `<body>`, makes it `position: fixed` and writes an
  //: explicit `top`. `.menu-flip-up` is `top: auto; bottom: calc(100% + 4px)`,
  //: written for a menu positioned against its own offset parent; on an
  //: escaped menu that `100%` resolves against the viewport, so the rule asks
  //: for a box whose bottom edge is four pixels above the top of the screen
  //: and the auto-height box collapses to its own padding. That is the strip
  //: in the report, and it is the same over-constraint
  //: `escapeMenuIfClipped` already guards against for `action-menu-flip`,
  //: one line of which says so: "Both at once over-constrains an auto-height
  //: box, which reproduced as the menu collapsing to its own padding."
  //:
  //: The second click appears to fix it because by then `_escapedHome` is set,
  //: `escapeMenuIfClipped` returns early, and whichever branch runs next
  //: happens not to add the class.
  //:
  //: Nothing is lost by leaving early: `placeEscapedMenu` positions the menu
  //: against the viewport directly, which is strictly better than choosing
  //: between two fixed anchors, and it is what this function is trying to
  //: approximate.
  if (menu.classList.contains("action-menu-escaped") || menu._escapedHome) return;
  const margin = 8;
  let rect = menu.getBoundingClientRect();
  if (rect.bottom > window.innerHeight - margin) menu.classList.add("menu-flip-up");
  rect = menu.getBoundingClientRect();
  if (rect.left < margin) menu.classList.add("menu-flip-left");
}

function showSelectionPopupAt(rect, text, source, point) {
  const box = selectionPopup();
  //: Reported: "I have to click it twice for it to actually properly
  //: expand". The click on the ⋯ opener ends in a `selectionchange` (the
  //: selection is unchanged, the event still fires), which re-entered here
  //: and rebuilt the popup, closed, over the menu that had just opened. The
  //: same selection with its menu open is left exactly as it is.
  if (
    !box.classList.contains("hidden") &&
    selectionPopupText === text &&
    selectionPopupSource === source &&
    box.querySelector(".action-menu:not(.hidden)")
  ) {
    return;
  }
  selectionPopupText = text;
  selectionPopupSource = source;

  // Rebuilt per selection: the item list depends on whether this passage has
  // a source and on whether the model is up.
  box.replaceChildren();
  const kebab = kebabMenu(selectionMenuItems(), "Actions for the selected text");
  box.appendChild(kebab);
  const opener = kebab.querySelector("[aria-haspopup]");
  const menu = kebab.querySelector(".action-menu");
  // Clicking the opener must not clear the selection underneath it. The old
  // three-button bar did this per button for the same reason; the text itself
  // is already captured above, but keeping the visible selection is what makes
  // the menu feel attached to it rather than to nothing.
  opener?.addEventListener("mousedown", (e) => e.preventDefault());
  opener?.addEventListener("click", () => {
    if (!menu.classList.contains("hidden")) clampSelectionMenu(menu);
  });

  // Position *before* revealing. Removing `hidden` first: which is what this
  // used to do: paints one frame of a `position: fixed` element that has no
  // left/top yet, i.e. at the bottom of `<body>`, as a visible flash.
  box.style.visibility = "hidden";
  box.classList.remove("hidden");
  const margin = 8;
  const boxRect = box.getBoundingClientRect();
  // Note the bound order: `max(margin, min(wanted, limit))`. Written the other
  // way round (`min(max(...), limit)`) a box wider than the viewport produces
  // a limit below the floor, `min` wins, and the popup lands off-screen left.
  // Anchored to the selection's top-right corner, just clear of the last
  // character. Asked for directly ("appear to the top right of the selection
  // while still remaining within the screen/window"), and it is the better
  // anchor than the centre this used to use: centred, the kebab drifts as the
  // selection grows, so it is never in the same place twice and it sits over
  // the middle of what you just highlighted. The right-hand end is where the
  // cursor already is when a left-to-right drag finishes.
  //
  // Both clamps keep the bound order `max(margin, min(wanted, limit))`, see
  // the note below on why the other way round puts it off-screen.
  // The cursor when we have one, the selection's right-hand end when we do
  // not (keyboard selections, and any caller without a pointer event).
  const anchorX = point ? point.x : rect.right;
  const anchorY = point ? point.y : rect.top;
  const left = Math.max(
    margin,
    Math.min(anchorX + 4, window.innerWidth - boxRect.width - margin)
  );
  let wantedTop = anchorY - boxRect.height - margin;
  // No room above the anchor, drop below it instead.
  if (wantedTop < margin) wantedTop = (point ? point.y : rect.bottom) + margin;
  const top = Math.max(
    margin,
    Math.min(wantedTop, window.innerHeight - boxRect.height - margin)
  );
  box.style.left = `${left}px`;
  box.style.top = `${top}px`;
  box.style.visibility = "";
}

// Whether a selection is one this popup should offer to act on.
//
// Both ends are checked, not just `anchorNode`. A drag that starts in prose
// and ends inside a textarea (or the reverse) is one selection with two
// different homes, and testing only the anchor let the popup appear over a
// form field half the time, which is exactly the case the denylist exists
// to prevent.
function selectionIsActionable(selection) {
  const ends = [selection.anchorNode, selection.focusNode];
  for (const node of ends) {
    const el = node && (node.nodeType === 1 ? node : node.parentElement);
    if (!el || el.closest(SELECTION_POPUP_EXCLUDED)) return false;
  }
  return true;
}

// Where the pointer was when the selection finished, or null.
//
// Asked for directly: the kebab should appear off the top-right of the
// *cursor*, not of the highlighted text. Those differ a lot on a multi-line
// selection: the range's corner can be half a screen from where the user
// actually let go, which is the one place they are already looking.
//
// Only a pointer can answer this: a keyboard selection (Shift+Arrow) and a
// touch long-press dispatch `selectionchange` with no coordinates at all, so
// those keep the range-rectangle anchoring. Cleared on keydown so a mouse
// selection followed by Shift+Arrow does not keep using a stale point.
let selectionPointerPoint = null;

function syncSelectionPopup() {
  // Text fields first. Asked for twice ("the ellipse button doesnt appear
  // when I highlight text in textboxes"), the editor is a <textarea>, whose
  // selection lives on the element rather than in the DOM selection, so the
  // rendered-content path below can never see it.
  const field = fieldSelection();
  if (field) {
    selectionPopupField = field;
    // A textarea has no range rectangle to anchor to, the browser exposes no
    // geometry for a selection inside one, so the pointer is the anchor when
    // there is one, and the field's own box is the fallback for a keyboard
    // selection. Passing the field rect as `rect` keeps showSelectionPopupAt's
    // existing "top-right of the selection" logic working unchanged.
    showSelectionPopupAt(
      field.el.getBoundingClientRect(),
      field.text,
      null,
      selectionPointerPoint
    );
    return;
  }

  const selection = window.getSelection();
  const text = (selection?.toString() || "").trim();
  if (!text || selection.isCollapsed || !selectionIsActionable(selection)) {
    // Don't yank the popup away while its own menu is open, the selection is
    // often cleared as a side effect of interacting with the menu.
    if (!selectionPopupEl?.querySelector(".action-menu:not(.hidden)")) hideSelectionPopup();
    return;
  }
  selectionPopupField = null;
  showSelectionPopupAt(
    selection.getRangeAt(0).getBoundingClientRect(),
    text,
    selectionSource(selection.anchorNode),
    selectionPointerPoint
  );
}

function initSelectionPopup() {
  // **Three ways in, because there used to be one.** `mouseup` alone meant the
  // popup did not exist for anyone selecting by touch (a long-press drag on a
  // phone dispatches `selectionchange`, not a useful `mouseup`) or by keyboard
  // (Shift+Arrow dispatches neither): so the app's richest capture surface
  // was mouse-only, on an app that ships a PWA manifest and a mobile layout.
  //
  // `selectionchange` fires continuously *during* a drag, so it is debounced:
  // repositioning the popup on every intermediate range is both wasteful and
  // visually noisy. `mouseup` stays as the immediate path so a mouse selection
  // still feels instant rather than delayed by the debounce.
  document.addEventListener("mouseup", (event) => {
    if (event.target.closest(".selection-popup")) return;
    selectionPointerPoint = { x: event.clientX, y: event.clientY };
    syncSelectionPopup();
  });
  // Touch releases carry coordinates too, on the changedTouches list rather
  // than the event itself, a long-press drag should anchor to the finger for
  // the same reason a mouse selection anchors to the cursor.
  document.addEventListener("touchend", (event) => {
    const touch = event.changedTouches && event.changedTouches[0];
    if (touch) selectionPointerPoint = { x: touch.clientX, y: touch.clientY };
  });
  // A keyboard selection has no pointer, so fall back to the range rectangle
  // rather than anchoring to wherever the mouse happened to be last.
  document.addEventListener("keydown", (event) => {
    if (event.shiftKey || event.key === "Escape") selectionPointerPoint = null;
  });

  let selectionSettleTimer;
  document.addEventListener("selectionchange", () => {
    clearTimeout(selectionSettleTimer);
    selectionSettleTimer = setTimeout(syncSelectionPopup, 200);
  });

  document.addEventListener("mousedown", (event) => {
    if (!event.target.closest(".selection-popup")) hideSelectionPopup();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") hideSelectionPopup();
  });
  window.addEventListener("scroll", hideSelectionPopup, true);
  window.addEventListener("resize", hideSelectionPopup);
}

// Open the selection menu from the keyboard, for a selection made with
// Shift+Arrow. Without this the whole feature is unreachable without a mouse:
// the popup can now *appear* from a keyboard selection (selectionchange fires
// for those too), but its menu still needed a pointer to open.
function openSelectionMenuFromKeyboard() {
  syncSelectionPopup();
  if (!selectionPopupText) {
    toast("Select some text first, then press this again.");
    return;
  }
  const opener = selectionPopupEl?.querySelector("[aria-haspopup]");
  const menu = selectionPopupEl?.querySelector(".action-menu");
  if (!opener || !menu) return;
  openActionMenu(menu, opener);
  clampSelectionMenu(menu);
}

async function downloadAttachment(attachment) {
  const response = await api(`/files/${attachment.id}`);
  await saveFile(attachment.filename, await response.blob());
}

//: **One open panel, named by which one it is.** Three menu items open a row
//: under a note card: "Similar notes", "Referenced by" and "Forgotten notes
//: like this". Each kept its own open-id, and two of them said in their own
//: comments that there should only be one, which is what happens when a
//: third arrives: opening one left the others' ids set, so the next click on
//: a *different* panel toggled the stale id instead and did nothing visible.
//:
//: One id and one kind, because the panels genuinely are one thing: they draw
//: the same `.entry-links` row in the same place on the same card, and
//: `renderEntries` clears whichever is showing, so only one can ever be on
//: screen anyway. The variable now says that rather than three variables
//: agreeing by accident.
let notePanel = { id: null, kind: null };

//: Toggle the named panel on a note: returns true when it should now be
//: drawn, false when the click closed it. `renderEntries` between the two is
//: what takes the previous panel off, whichever card it was on.
function toggleNotePanel(entry, kind) {
  const open = notePanel.id === entry.id && notePanel.kind === kind;
  notePanel = open ? { id: null, kind: null } : { id: entry.id, kind };
  renderEntries();
  return !open;
}

//: Is the panel this render is finishing still the one that was asked for? An
//: `await` sits between the click and the append, and in that window the
//: reader can open something else or close this one.
function notePanelStillOpen(entry, kind) {
  return notePanel.id === entry.id && notePanel.kind === kind;
}


async function toggleRelated(entry) {
  if (!toggleNotePanel(entry, "related")) return;
  const related = await apiJson(`/entries/${entry.id}/related`).catch(() => []);
  const card = document.querySelector(`#entry-list li[data-id="${entry.id}"]`);
  if (!card || !notePanelStillOpen(entry, "related")) return;
  const row = document.createElement("div");
  row.className = "entry-links";
  const label = document.createElement("span");
  label.className = "muted";
  label.textContent = related.length ? "Similar:" : "No similar notes found.";
  row.appendChild(label);
  for (const other of related) {
    row.appendChild(similarNoteRow(entry, other, () => {
      // Nothing else on this card changes, so re-rendering the whole list
      // would only cost the open panel its place.
      if (!row.querySelector(".entry-related-row")) {
        label.textContent = "All similar notes are linked.";
      }
    }));
  }
  card.appendChild(row);
}

//: **What points at this note** (INBOX 246, the owner: "I want it to show in
//: notes if they are attached to or referenced in/by a document, note,
//: whiteboard, or mindmap").
//:
//: Deliberately the same shape as `toggleRelated` above, down to the single
//: open-id variable: the two answer neighbouring questions ("what is like
//: this" and "what points at this"), they open in the same place on the same
//: card from the same menu, and a second way of drawing a row under a note
//: would be a second thing to keep consistent for no gain.
//:
//: What each kind of reference is called on the chip, and the icon that says
//: it without being read. A table rather than a chain of ternaries, because
//: the kinds are the four the owner named and a missing one should be
//: obvious rather than silently falling through to "note".
const REFERENCE_KIND_LABELS = {
  document: ["ph:file-text", "document"],
  note: ["ph:note", "note"],
  board: ["ph:squares-four", "board"],
  map: ["ph:tree-structure", "map"],
};

//: **The faded notes nearest this one** (INBOX 261). `GET
//: /resurface/near/{entry_id}` shipped with the rest of resurfacing and no
//: `frontend/*.js` ever named it: found by `scratchpad/probe_dead_routes.py`,
//: the same scan that found WORLD_CLASS_PLAN I9's whole backend built with no
//: screen at all. A ranking nobody can read is a ranking that does not exist.
//:
//: **Not the same question as "Similar notes" above**, which is why it is its
//: own row rather than a filter on that one. `/entries/{id}/related` answers
//: "what means the same as this", newest and busiest notes included;
//: `resurface.for_context` answers "what have you forgotten that bears on
//: this", ranking by age, links and opens first and nearness second. The
//: first is a lookup, the second is the thing this app is for.
//:
//: One open panel at a time across all three: see `notePanel` above, which is
//: the single piece of state the three share.

async function toggleFaded(entry) {
  if (!toggleNotePanel(entry, "faded")) return;
  const answer = await apiJson(`/resurface/near/${entry.id}`, { silent: true }).catch(() => null);
  const card = document.querySelector(`#entry-list li[data-id="${entry.id}"]`);
  if (!card || !notePanelStillOpen(entry, "faded")) return;
  const row = document.createElement("div");
  row.className = "entry-links";
  const label = document.createElement("span");
  label.className = "muted";
  const items = (answer && answer.items) || [];
  //: Three states, not two, exactly as `toggleReferences` has them: "nothing
  //: is faded near this" and "we could not ask" are different facts, and the
  //: second has a third cause of its own here (a notebook under
  //: `resurface.MIN_NOTEBOOK` is refused a ranking by design, so an empty
  //: answer on a small notebook is not a finding about this note).
  label.textContent = !answer
    ? "Couldn't look for forgotten notes near this one."
    : items.length
      ? "Forgotten, and close to this:"
      : "Nothing faded is close to this note.";
  row.appendChild(label);
  for (const item of items) {
    const wrap = document.createElement("span");
    wrap.className = "entry-related-row";
    const fadedChip = chip("", "link", () => flashEntry(item.id));
    setLabel(fadedChip, `ph:hourglass-medium ${item.title}`);
    //: The card's own sentence, which the route sends precisely so a panel
    //: can say why it chose something: "120 days old, no links, never
    //: opened" is checkable and "0.82" is not.
    fadedChip.title = item.reason || item.preview || "";
    wrap.appendChild(fadedChip);
    const why = document.createElement("span");
    why.className = "muted entry-reference-how";
    why.textContent = item.reason || "";
    wrap.appendChild(why);
    row.appendChild(wrap);
  }
  card.appendChild(row);
}

//: **This note's reminders, under the card** (INBOX 309). The other half of
//: the chip above.
//:
//: The same shape as `toggleReferences` and `toggleFaded` below, down to the
//: shared `notePanel` state, because it answers a neighbouring question about
//: the same note in the same place: a second way of drawing a row under a
//: note is a second thing to keep consistent for no gain.
//:
//: Live reminders only, which is what the chip counted. A reminder ticked off
//: last month is not something this note still wants from you, and the
//: Reminders tab is where a finished one is still readable.
async function toggleNoteReminders(entry) {
  if (!toggleNotePanel(entry, "reminders")) return;
  const answer = await apiJson(
    `/reminders?entry_id=${entry.id}&include_done=false&limit=20`,
    { silent: true }
  ).catch(() => null);
  const card = document.querySelector(`#entry-list li[data-id="${entry.id}"]`);
  if (!card || !notePanelStillOpen(entry, "reminders")) return;
  const row = document.createElement("div");
  row.className = "entry-links";
  const label = document.createElement("span");
  label.className = "muted";
  const items = Array.isArray(answer) ? answer : [];
  //: Three states, not two, the rule the two panels beside this one already
  //: follow: "nothing is due from this note" and "we could not ask" are
  //: different facts.
  label.textContent = !answer
    ? "Couldn't read this note's reminders."
    : items.length
      ? "Reminds you to:"
      : "Nothing is due from this note.";
  row.appendChild(label);
  for (const item of items) {
    const wrap = document.createElement("span");
    wrap.className = "entry-related-row";
    const due = relativeWhen(item.due_at);
    //: `flashReminder` rather than a jump of this panel's own: a
    //: reminder has one home, it loads the tab's list, clears the filter
    //: that would hide it and highlights the row. A second way in here
    //: would be a fifth place a reminder can be read.
    const alarm = chip("", "link", () => flashReminder(item.id));
    setLabel(alarm, `ph:alarm ${item.text}`);
    alarm.title = `Due ${due}. Press to open it in Reminders`;
    wrap.appendChild(alarm);
    const when = document.createElement("span");
    when.className = "muted entry-reference-how";
    when.textContent = due;
    wrap.appendChild(when);
    row.appendChild(wrap);
  }
  card.appendChild(row);
}

async function toggleReferences(entry) {
  if (!toggleNotePanel(entry, "references")) return;
  const answer = await apiJson(`/entries/${entry.id}/references`).catch(() => null);
  const card = document.querySelector(`#entry-list li[data-id="${entry.id}"]`);
  if (!card || !notePanelStillOpen(entry, "references")) return;
  const row = document.createElement("div");
  row.className = "entry-links";
  const label = document.createElement("span");
  label.className = "muted";
  const items = (answer && answer.items) || [];
  //: Three states, not two: "nothing points at this" and "we could not ask"
  //: are different facts and a person acting on the first one deserves to
  //: know it was really the second.
  label.textContent = !answer
    ? "Couldn't check what points at this note."
    : items.length
      ? "Referenced by:"
      : "Nothing points at this note yet.";
  row.appendChild(label);
  for (const item of items) {
    const [icon, word] = REFERENCE_KIND_LABELS[item.kind] || ["ph:note", item.kind];
    const wrap = document.createElement("span");
    wrap.className = "entry-related-row";
    const refChip = chip("", "link", () => {
      //: A board and a map open in the Library, a note in Notes, a document
      //: in its editor. Each already has one way in; this is not a fifth.
      //: Each kind already has exactly one way in, and this uses it rather
      //: than becoming a fifth. `typeof` because the board and document
      //: files are lazy-loaded with the Library bundle and a note card can
      //: be on screen before either has landed.
      if (item.kind === "board" || item.kind === "map") {
        if (typeof openWhiteboardBoard === "function") openWhiteboardBoard(item.id);
      } else if (item.kind === "document") {
        openDocumentFromNote(item.id);
      } else {
        flashEntry(item.id);
      }
    });
    setLabel(refChip, `${icon} ${item.label}`);
    //: Read out loud rather than assembled: "This board on it" is what
    //: pasting the server's phrase after the kind gives you, and it is not a
    //: sentence. The phrase beside the chip stays terse because it sits in a
    //: row of them; the tooltip is where there is room to say it properly.
    refChip.title = {
      "on it": `This ${word} has this note on it`,
      "links to it": `This ${word} links to this note`,
      "mentions it": `This ${word} mentions this note by name`,
    }[item.how] || `This ${word} ${item.how}`;
    wrap.appendChild(refChip);
    //: The relationship, beside the thing rather than inside its name: "on
    //: it", "links to it" and "mentions it" are three different strengths of
    //: claim and the middle one is the only one somebody chose.
    const how = document.createElement("span");
    how.className = "muted entry-reference-how";
    how.textContent = item.how;
    wrap.appendChild(how);
    row.appendChild(wrap);
  }
  card.appendChild(row);
}

// One similar note, with the button that turns it into a real link.
//
// Shared by both places this app shows "≈ Similar", the panel that stays
// open while a note is being edited, and the "≈ Similar notes" menu item on
// a note card. They were already two near-identical loops; adding an action
// to only one of them is exactly how the two would have drifted, and the
// ask named the card one specifically ("like in the similar notes shown in
// the notes tab").
//
// A button, not something either view does on its own: `≈` is a resemblance
// the embedding noticed, while a link is a claim the user makes. The reason
// is deduced server-side for a pair this similar (create_link's
// AUTO_REASON_THRESHOLD) and stays editable wherever links are shown, so
// nothing is asked for at this point.
function similarNoteRow(entry, other, onLinked) {
  const preview = other.content.length > 50 ? other.content.slice(0, 49) + "…" : other.content;
  const wrap = document.createElement("span");
  wrap.className = "entry-related-row";
  const relChip = chip("", "link", () => flashEntry(other.id));
  //: The same mark the menu item that opens this row wears, drawn the same
  //: way: an `<i class="ph">` rather than the character U+2248, which came
  //: out in the page font at the text's own weight beside Phosphor icons in
  //: every neighbouring chip (INBOX 263).
  const relMark = document.createElement("i");
  relMark.className = "ph ph-approximate-equals ph-lead";
  relMark.setAttribute("aria-hidden", "true");
  relChip.appendChild(relMark);
  const previewSpan = document.createElement("span");
  renderInlineMarkdown(previewSpan, preview, [], true);
  relChip.appendChild(previewSpan);
  wrap.appendChild(relChip);

  const linkBtn = smallButton("ph:link Link", `Link this note to “${preview}”`, async () => {
    linkBtn.disabled = true;
    try {
      await apiJson(`/entries/${entry.id}/links`, {
        method: "POST",
        body: JSON.stringify({ target_id: other.id }),
      });
      toast("Linked.");
      wrap.remove();
      onLinked?.();
    } catch (error) {
      linkBtn.disabled = false;
      toast(error.message || "Couldn't link those notes.", true);
    }
  });
  linkBtn.classList.add("entry-related-link-btn");
  wrap.appendChild(linkBtn);
  return wrap;
}

//: **The formatting row the note edit form never had.**
//:
//: Editing an existing note is the most common editing action in a notebook,
//: and it was the app's poorest surface by a distance: a bare three-row
//: textarea with no toolbar, no "/" menu and no selection bar, while the
//: composer beside it and the document editor both had all three. That is
//: most of what *"the editors feel very fake and just rudimentary"* is about.
//:
//: The same `data-md` contract the other two toolbars use, wired here rather
//: than through `initMarkdownToolbars` (documents.js) because that runs once
//: over the markup at load and this row is built each time a note is opened.
//: The same set the document editor's strip carries (minus colours), in
//: the same groups: asked for: "the ui and features when editing a note
//: need to be updated with the new upgraded formatting toolbar". `null`
//: entries are group separators.
const NOTE_EDIT_TOOLBAR = [
  { md: "h1", label: "ph:text-h-one", title: "Heading 1 (Ctrl+1)" },
  { md: "h2", label: "ph:text-h-two", title: "Heading 2 (Ctrl+2)" },
  { md: "h3", label: "ph:text-h-three", title: "Heading 3 (Ctrl+3)" },
  null,
  { md: "bold", label: "ph:text-b", title: "Bold (Ctrl+B)" },
  { md: "italic", label: "ph:text-italic", title: "Italic (Ctrl+I)" },
  { md: "strike", label: "ph:text-strikethrough", title: "Strikethrough" },
  { md: "highlight", label: "ph:highlighter", title: "Highlight" },
  { md: "code", label: "ph:code", title: "Inline code (Ctrl+E)" },
  { md: "clearformat", label: "ph:eraser", title: "Clear highlight and colour" },
  null,
  { md: "ul", label: "ph:list-bullets", title: "Bulleted list" },
  { md: "ol", label: "ph:list-numbers", title: "Numbered list" },
  { md: "task", label: "ph:check-square", title: "Task list" },
  { md: "quote", label: "ph:quotes", title: "Quote" },
  null,
  { md: "link", label: "ph:link", title: "Link" },
  { md: "table", label: "ph:table", title: "Table (Tab moves between cells)" },
  { md: "codeblock", label: "ph:brackets-curly", title: "Code block" },
  { md: "hr", label: "ph:minus", title: "Divider" },
];

function noteEditToolbar(boxId) {
  //: **The same strip as the capture box, cloned**, reported: "the toolbar
  //: isn't the same as the note capture and documents". The capture strip
  //: (`#note-toolbar`) is the source of truth; a clone drops the extras the
  //: mount appended (their listeners do not survive cloning) and is wired
  //: fresh by `wireMarkdownToolbar`, which mounts them again. The hand-built
  //: list below is only the fallback for a page without that strip.
  const source = document.getElementById("note-toolbar");
  if (source && typeof wireMarkdownToolbar === "function") {
    const clone = source.cloneNode(true);
    clone.removeAttribute("id");
    //: `note-toolbar` is kept on the clone: it is what makes this the
    //: *composer's* strip rather than the full-page editor's, and dropping it
    //: gave a form inside a note card the document editor's own chrome padding
    //: (measured 91px against the composer's 88 at the same width, both above
    //: a small box). Reported with the capture strip beside it.
    clone.className = "doc-toolbar note-toolbar note-edit-toolbar";
    clone.setAttribute("aria-label", "Formatting");
    for (const extra of clone.querySelectorAll("[data-md-extra]")) extra.remove();
    //: **The Preview button stays in the strip.** It used to be cut out of
    //: the clone because the edit form carried a separate Write / Preview
    //: pill of its own -- which is precisely what the report was about:
    //: "if the formatting bar was the same, the preview button would be in
    //: it". Counted in the browser, the clone came out at 60 controls
    //: against the capture strip's 61, and Preview was the one missing. It
    //: is marked here because the id is stripped two lines down, and
    //: renderEditForm needs to find it again to wire it to *this* note's
    //: preview pane.
    clone.querySelector("#entry-preview-toggle")?.setAttribute("data-note-preview", "1");
    //: **Every id goes.** A clone carries the capture strip's ids, and two
    //: elements with one id means `document.getElementById` hands back the
    //: *capture* toolbar's control: so the edit form's dropdowns opened and
    //: then applied their formatting to the capture box instead of the note
    //: being edited (reported: "none of the toolbar dropdowns work"). Nothing
    //: in `wireMarkdownToolbar` needs an id; it walks elements.
    for (const el of clone.querySelectorAll("[id]")) el.removeAttribute("id");
    delete clone.dataset.mdExtras;
    clone.dataset.mdTarget = boxId;
    //: The wrap/collapse group is appended by `mountDocToolbarControls`, so a
    //: clone carries a *dead* copy of it -- two arrow buttons whose listeners
    //: did not survive cloning -- and, because it was cloned in place rather
    //: than appended, it sat mid-strip where the capture bar's sits last.
    //: Dropped and re-mounted, which is the same trick `data-md-extra` plays
    //: for the dropdown menus.
    clone.querySelector(".doc-toolbar-tools")?.remove();
    wireMarkdownToolbar(clone);
    if (typeof mountDocToolbarControlsFor === "function") mountDocToolbarControlsFor(clone);
    return clone;
  }
  const bar = document.createElement("div");
  bar.className = "doc-toolbar note-toolbar note-edit-toolbar";
  bar.setAttribute("role", "toolbar");
  bar.setAttribute("aria-label", "Formatting");
  for (const action of NOTE_EDIT_TOOLBAR) {
    if (!action) {
      const sep = document.createElement("span");
      sep.className = "doc-toolbar-sep";
      sep.setAttribute("aria-hidden", "true");
      bar.appendChild(sep);
      continue;
    }
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.md = action.md;
    button.title = action.title;
    button.setAttribute("aria-label", action.title);
    setLabel(button, action.label);
    //: mousedown-preventDefault keeps the caret in the textarea, the same
    //: rule `initMarkdownToolbars` and the selection bar both follow, and for
    //: the same reason: a click moves focus first and the selection is gone.
    button.addEventListener("mousedown", (event) => event.preventDefault());
    button.addEventListener("click", () => applyMarkdown(action.md, boxId));
    bar.appendChild(button);
  }
  return bar;
}

function renderEditForm(li, entry) {
  const textarea = document.createElement("textarea");
  textarea.rows = 3;
  textarea.value = entry.content;
  //: A stable id, because three separate features key off one: the "/" menu
  //: and the `[[` autocomplete (EDITOR_SURFACES in editor.js), the selection
  //: bar, and this form's own toolbar. Safe to be a constant rather than a
  //: per-note id: `editingId` allows exactly one open edit form at a time.
  textarea.id = "entry-edit-content";
  textarea.className = "note-edit-box";
  //: Ctrl+B/Ctrl+I/Ctrl+Shift+S, same as the capture box (documents.js:
  //: `wireMdFormatShortcuts`). Passed the element itself, not its id: this
  //: textarea is not in the document yet, and a fresh one exists every
  //: time a note is opened for editing, so this runs on every open rather
  //: than once at boot.
  if (typeof wireMdFormatShortcuts === "function") wireMdFormatShortcuts(textarea);
  //: Three rows is a form field; a note is prose. Grows with its content the
  //: way the composer does, up to the same shared ceiling.
  textarea.addEventListener("input", () => autoGrow(textarea));
  //: `requestAnimationFrame`, not `queueMicrotask`: a microtask runs before
  //: the browser has laid anything out, and `autoGrow` reads `scrollHeight`,
  //: which is 0 on an element that is not yet in the document, measured, the
  //: box stayed at its three-row height with the note scrolling inside it.
  //: Also on focus, because a note opened while its list was hidden (a tab
  //: switch, a filter) is laid out only when it becomes visible.
  textarea.addEventListener("focus", () => autoGrow(textarea));
  requestAnimationFrame(() => autoGrow(textarea));

  const tagsInput = document.createElement("input");
  tagsInput.type = "text";
  tagsInput.placeholder = "Tags, comma separated";
  tagsInput.value = entry.tags.join(", ");
  tagsInput.className = "note-edit-tags";
  if (focusTagsAfterRender === entry.id) {
    focusTagsAfterRender = null;
    // The form is not in the document yet; focus once it is.
    requestAnimationFrame(() => tagsInput.focus());
  }

  const categorySelect = document.createElement("select");
  fillCategoryOptions(categorySelect, entry.category);

  const row = document.createElement("div");
  row.className = "row";
  row.appendChild(
    smallButton(
      "Save changes",
      "Save your corrections",
      async () => {
        const category = await resolveCategoryChoice(categorySelect);
        if (category === undefined) return; // user cancelled the prompt
        const before = { content: entry.content, category: entry.category, tags: entry.tags };
        const after = {
          content: textarea.value.trim() || entry.content,
          category,
          tags: tagsInput.value.split(",").map((t) => t.trim()).filter(Boolean),
        };
        await api(`/entries/${entry.id}`, { method: "PUT", body: JSON.stringify(after) });
        editingId = null;
        toast("Entry updated.");
        await loadEntries();
        pushEntryPutUndo(entry.id, "Edited a note", before, after);
      },
      false
    )
  );
  row.appendChild(
    smallButton("Cancel", "Discard changes", () => {
      editingId = null;
      renderEntries();
    })
  );

  //: One meta row, tags, category, then Save/Cancel at the right, instead
  //: of three stacked full-width rows under the text (reported with a
  //: screenshot: "better ui structure").
  const meta = document.createElement("div");
  meta.className = "note-edit-meta";
  row.classList.add("note-edit-actions");
  meta.append(tagsInput, categorySelect, row);
  const toolbarEl = noteEditToolbar(textarea.id);
  //: Preview: reported: "there is no preview", then, once there was one,
  //: "if the formatting bar was the same, the preview button would be in
  //: it". So there is no second Write / Preview control any more: the
  //: cloned strip's own Preview button is the switch, exactly as in the
  //: capture box and the document editor, and it renders the textarea's
  //: current text with the same renderer every note card uses.
  const previewBtn = toolbarEl.querySelector("[data-note-preview]");
  const preview = document.createElement("div");
  preview.className = "markdown-body note-edit-preview hidden";
  const setView = (mode) => {
    const showPreview = mode === "preview";
    if (showPreview) renderMarkdown(preview, textarea.value);
    preview.classList.toggle("hidden", !showPreview);
    textarea.classList.toggle("hidden", showPreview);
    if (previewBtn) {
      //: `is-active` is what the stylesheet paints a pressed toolbar toggle
      //: with (`.doc-toolbar-toggle.is-active`, 01-forms-settings.css) and what
      //: the capture strip's own button carries; `active` was a second name for
      //: the same state that nothing draws, so this button looked unpressed in
      //: preview while the capture one looked pressed. Both are written, since
      //: the clone can arrive carrying either.
      previewBtn.classList.toggle("is-active", showPreview);
      previewBtn.classList.toggle("active", showPreview);
      previewBtn.setAttribute("aria-pressed", String(showPreview));
    }
    if (!showPreview) textarea.focus();
  };
  previewBtn?.addEventListener("click", () => setView(previewBtn.getAttribute("aria-pressed") === "true" ? "write" : "preview"));
  //: **The clone carries the capture strip's state, including this button's.**
  //: This toolbar is a `cloneNode(true)` of `#note-toolbar` (see
  //: `noteEditToolbar`), so a form opened while the capture box is in preview
  //: arrives with Preview already pressed while showing the textarea, and the
  //: first click on it then reads as doing nothing. Measured while
  //: reproducing INBOX 119 on :8895: `aria-pressed="true"` on a form whose
  //: box was visible. The state is reset rather than `setView("write")` called:
  //: that would focus the textarea, and opening a note for editing does not
  //: otherwise move the caret into it.
  if (previewBtn?.getAttribute("aria-pressed") === "true") {
    previewBtn.classList.remove("is-active", "active");
    previewBtn.setAttribute("aria-pressed", "false");
  }
  //: Attachment cards for whatever this note already carries: rename its
  //: caption, generate one, or remove it, and removing takes the markdown
  //: with it, in the edit form exactly as in the capture box.
  const chipsHost = document.createElement("div");
  chipsHost.className = "row attachment-chips hidden";
  chipsHost.id = "entry-edit-attachment-chips";
  li.append(toolbarEl, textarea, preview, chipsHost, meta);
  // The same line-number gutter the capture box and the documents editor
  // carry (documents.js `mountGutterFor`); it follows the one remembered
  // choice, so a person who turned numbers on in Capture sees them here too.
  //: On the next frame, not now: this <li> is still detached (`entryItem`
  //: returns it to the list renderer), and `applyDocGutter` walks the
  //: document to set the strip button's pressed state: measured, the button
  //: opened with no state and no title until the first click without this.
  //:
  //: **Both are lazy entry points** (`LAZY_ENTRY_POINTS`). `applyDocGutter`
  //: was not, so before the Library bundle had loaded this line threw a
  //: ReferenceError in the middle of `renderEntries` and left the list half
  //: drawn: the owner's "the first time I try editing a note after a restart,
  //: the notes page goes blank". The mount is awaited so the strip exists
  //: when the pressed state is set.
  Promise.resolve(mountGutterFor(textarea)).then(() => requestAnimationFrame(() => applyDocGutter()));
  renderEntryAttachmentChips(textarea, chipsHost);
  textarea.addEventListener("input", () => renderEntryAttachmentChips(textarea, chipsHost));
  renderRelatedWhileEditing(li, entry);
  renderNoteBookmarksWhileEditing(li, entry);
}

// **A related-notes panel, live while a note is open for editing**, asked
// for as a competitor gap (Mem.ai's own "AI Thought Partner" pitch keeps a
// similar-notes rail visible continuously while writing, not behind a
// click). This app already had the same signal one click away
// (`toggleRelated`'s "≈ Similar notes" menu item, same `/entries/{id}/related`
// endpoint): the gap was that it stayed hidden until asked for, so it read
// as a lookup rather than a thing the app was already thinking about. Shown
// automatically the moment the edit form opens, not gated behind a second
// interaction; a note with nothing similar says so rather than leaving a
// blank space that looks broken.
async function renderRelatedWhileEditing(li, entry) {
  const panel = document.createElement("div");
  panel.className = "entry-related-live muted text-sm";
  panel.textContent = "Finding related notes…";
  li.appendChild(panel);
  let related;
  try {
    related = await apiJson(`/entries/${entry.id}/related`);
  } catch {
    panel.remove(); // a failed lookup says nothing rather than "no notes found"
    return;
  }
  // The form may have closed (Save/Cancel) or moved on to a different note
  // while this was in flight.
  if (editingId !== entry.id || !panel.isConnected) return;
  panel.replaceChildren();
  if (!related.length) {
    panel.textContent = "No related notes yet.";
    return;
  }
  const label = document.createElement("span");
  label.textContent = "Related: ";
  panel.appendChild(label);
  for (const other of related) {
    panel.appendChild(similarNoteRow(entry, other, () => {
      if (!panel.querySelector(".entry-related-row")) {
        panel.textContent = "All related notes are linked.";
      }
    }));
  }
}

// **A note's References** (§30, directly requested: "attach a bookmark to
// a note... show up in References"): the saved-links half of what a note
// can point at, alongside `entry.links`' [[wiki links]] to other notes.
// Its own small panel and its own endpoint (`/entries/{id}/bookmarks`),
// not folded into `entry.links`, a Bookmark isn't an Entry (see the
// Bookmark model's own docstring), so this is a second, parallel kind of
// reference rather than a variant of the first.
async function renderNoteBookmarksWhileEditing(li, entry) {
  const panel = document.createElement("div");
  panel.className = "entry-related-live muted text-sm";
  li.appendChild(panel);

  const attachButton = document.createElement("button");
  attachButton.type = "button";
  attachButton.className = "ghost small";
  setLabel(attachButton, "ph:link Attach a link");
  attachButton.addEventListener("click", () => openBookmarkAttachPicker(entry, panel));

  async function refresh() {
    let attached;
    try {
      attached = await apiJson(`/entries/${entry.id}/bookmarks`);
    } catch {
      return;
    }
    if (editingId !== entry.id || !panel.isConnected) return;
    panel.replaceChildren();
    if (attached.length) {
      const label = document.createElement("span");
      label.textContent = "References: ";
      panel.appendChild(label);
      for (const bookmark of attached) {
        // safeHref(): same scheme guard as library.js's bookmark rows
        // (INBOX 310), so an already-stored bad-scheme bookmark can't reach
        // window.open() from this chip either.
        const bmChip = chip(`ph:link ${bookmark.title || bookmark.url}`, "link", () =>
          window.open(safeHref(bookmark.url), "_blank", "noopener,noreferrer")
        );
        bmChip.title = bookmark.url;
        const detach = document.createElement("span");
        detach.className = "unlink";
        setLabel(detach, "ph:x"); // raw "×" glyph vs Phosphor icon font mismatch mis-centers the icon
        detach.title = "Remove this reference";
        detach.setAttribute("aria-label", `Remove reference to ${bookmark.title || bookmark.url}`);
        detach.addEventListener("click", async (e) => {
          e.stopPropagation();
          await apiJson(`/entries/${entry.id}/bookmarks/${bookmark.id}`, { method: "DELETE" });
          refresh();
        });
        makeUnlinkAccessible(detach);
        bmChip.appendChild(detach);
        panel.appendChild(bmChip);
      }
    }
    panel.appendChild(attachButton);
  }
  await refresh();
}

async function openBookmarkAttachPicker(entry, panel) {
  let all;
  try {
    all = await apiJson("/bookmarks");
  } catch (error) {
    toast(error.message, true);
    return;
  }
  if (!all.length) {
    toast("No saved links yet, add one in Library → Links first.");
    return;
  }
  const select = document.createElement("select");
  select.className = "bookmark-attach-picker";
  const placeholder = document.createElement("option");
  placeholder.textContent = "Pick a saved link…";
  placeholder.value = "";
  select.appendChild(placeholder);
  for (const bookmark of all) {
    const option = document.createElement("option");
    option.value = String(bookmark.id);
    option.textContent = bookmark.title || bookmark.url;
    select.appendChild(option);
  }
  select.addEventListener("change", async () => {
    if (!select.value) return;
    await apiJson(`/entries/${entry.id}/bookmarks`, {
      method: "POST",
      body: JSON.stringify({ bookmark_id: Number(select.value) }),
    });
    select.remove();
    renderNoteBookmarksWhileEditing(panel.parentElement, entry);
  });
  panel.appendChild(select);
  //: `focusSelect`, not `select.focus()`: the native control is out of the tab
  //: order once `enhanceSelect` has replaced it, so the direct call focuses
  //: nothing and this picker opened with the focus on the page body.
  focusSelect(select);
}

// Category <select> shared by capture (guided mode) and the edit form.
function fillCategoryOptions(select, selected) {
  select.replaceChildren();
  const names = [...new Set(allEntries.map((e) => e.category))].sort();
  if (selected === null) {
    const auto = document.createElement("option");
    auto.value = "";
    auto.textContent = "Let Atlas decide";
    select.appendChild(auto);
  }
  for (const name of names) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    if (name === selected) option.selected = true;
    select.appendChild(option);
  }
  const custom = document.createElement("option");
  custom.value = "__new__";
  custom.textContent = "+ New category…";
  select.appendChild(custom);
}

// "" → null (AI decides); "__new__" → ask for a name; else the value.
// Returns undefined when the user cancels the prompt.
async function resolveCategoryChoice(select) {
  if (select.value === "") return null;
  if (select.value !== "__new__") return select.value;
  // promptDialog resolves to trimmed text, or "" for cancel: one shape for
  // both, so there is no null to check the way window.prompt needed.
  const name = await promptDialog("Name for the new category:", "", { confirmLabel: "Create" });
  return name || undefined;
}

function beginOrCompleteLink(entry) {
  //: **A draft and a saved note cannot be connected**, asked for directly,
  //: and refused by `manager.create_link` whichever route asks. Caught here as
  //: well so the answer arrives before the click that would fail: starting a
  //: link from a draft and hunting for a target, only to be told no at the
  //: end, is the worst order to learn a rule in.
  //:
  //: Two drafts are still fine; the rule is that drafts stay separate from the
  //: notebook, not from each other.
  if (linkSource !== null && linkSource !== entry.id) {
    const source = allEntries.find((e) => e.id === linkSource);
    if (source && Boolean(source.is_draft) !== Boolean(entry.is_draft)) {
      const draftFirst = Boolean(source.is_draft);
      linkSource = null;
      renderEntries();
      toast(
        draftFirst
          ? "A draft can't be linked to a saved note. Save the draft first."
          : "A saved note can't be linked to a draft. Save the draft first.",
        true
      );
      return;
    }
  }
  if (linkSource === null) {
    linkSource = entry.id;
    toast("Now click Link on the entry you want to connect it to (Esc cancels).");
    renderEntries();
    return;
  }
  if (linkSource === entry.id) {
    linkSource = null; // clicked the same one again = cancel
    renderEntries();
    return;
  }
  const source = linkSource;
  const target = entry.id;
  linkSource = null;
  apiJson(`/entries/${source}/links`, {
    method: "POST",
    body: JSON.stringify({ target_id: target }),
  })
    .then((updated) => {
      toast("Linked!");
      let liveLinkId = updated.links.find((l) => l.entry_id === target)?.link_id;
      pushUndo(
        "Linked two notes",
        async () => {
          if (liveLinkId == null) return;
          await api(`/entries/${source}/links/${liveLinkId}`, { method: "DELETE" });
          await loadEntries();
        },
        async () => {
          const redone = await apiJson(`/entries/${source}/links`, {
            method: "POST",
            body: JSON.stringify({ target_id: target }),
          });
          liveLinkId = redone.links.find((l) => l.entry_id === target)?.link_id ?? liveLinkId;
          await loadEntries();
        }
      );
      return loadEntries();
    })
    .catch((error) => {
      toast(error.message, true);
      renderEntries();
    });
}

// Text filter (Wave J): match note content or any tag, case-insensitive.
// --- the notes filter ------------------------------------------------------------
// Same lesson as the server's keyword search: a single substring match means
// the words have to be typed in the order they appear, which nobody can guess.
// This one also understands a few operators, because narrowing by tag or
// category is the thing you actually want once you have more than a few
// hundred notes: and it needs no AI whatsoever.
//
//   tag:work            only notes tagged "work"
//   cat:recipes         only notes in that category (category: also works)
//   is:favourite        favourite (is:pinned too) / private / linked / untagged
//   tags:<2             fewer than 2 tags, also <=, >, >=, = (or bare N)
//   -picnic             notes that do NOT mention "picnic"
//   "exact phrase"      that phrase, verbatim
//
// Anything else is a plain word: all of them must appear, in any order.

// `tags:<2`, `tags:<=1`, `tags:0` and so on: "how many tags", not "which
// ones" (that's plain `tag:`). Asked for directly: a way to find the notes
// that only ever got the janitor's default filing and never a second look,
// since `is:untagged` alone only ever answered the zero case.
const TAG_COUNT_RE = /^tags:(<=|>=|<|>|=)?(\d+)$/;

//: **The Notes tab, filtered, from anywhere.** The palette's "Show untagged
//: notes", the dashboard's Loose ends widget and the untagged nudge in the
//: bell all land here (INBOX 162: "notes with no tags or other things arent
//: highlighted"): one route to "the notes I mean" rather than three copies
//: of the same four lines.
function showNotesFilter(query) {
  switchTab("notes");
  const search = $("note-search");
  search.value = query;
  search.dispatchEvent(new Event("input"));
  search.focus();
}

function parseNoteQuery(raw) {
  const query = {
    words: [],
    phrases: [],
    exclude: [],
    tags: [],
    categories: [],
    flags: [],
    tagCount: null,
  };
  // Pull quoted phrases out first so their spaces don't become word breaks.
  const remainder = (raw || "").replace(/"([^"]+)"/g, (_, phrase) => {
    query.phrases.push(phrase.toLowerCase().trim());
    return " ";
  });
  for (const token of remainder.split(/\s+/)) {
    if (!token) continue;
    const lower = token.toLowerCase();
    const tagCountMatch = TAG_COUNT_RE.exec(lower);
    if (lower.startsWith("tag:")) query.tags.push(lower.slice(4));
    else if (lower.startsWith("category:")) query.categories.push(lower.slice(9));
    else if (lower.startsWith("cat:")) query.categories.push(lower.slice(4));
    else if (lower.startsWith("is:")) query.flags.push(lower.slice(3));
    else if (tagCountMatch) {
      query.tagCount = { op: tagCountMatch[1] || "=", n: Number(tagCountMatch[2]) };
    } else if (lower.startsWith("-") && lower.length > 1) query.exclude.push(lower.slice(1));
    else query.words.push(lower);
  }
  return query;
}

function noteQueryIsEmpty(query) {
  return (
    !query.words.length &&
    !query.phrases.length &&
    !query.exclude.length &&
    !query.tags.length &&
    !query.categories.length &&
    !query.flags.length &&
    !query.tagCount
  );
}

function matchesTagCount(tagCount, n) {
  switch (tagCount.op) {
    case "<":
      return n < tagCount.n;
    case "<=":
      return n <= tagCount.n;
    case ">":
      return n > tagCount.n;
    case ">=":
      return n >= tagCount.n;
    default:
      return n === tagCount.n;
  }
}

function matchesSearch(entry) {
  if (!noteSearch) return true;
  const query = parseNoteQuery(noteSearch);
  if (noteQueryIsEmpty(query)) return true;

  const content = (entry.content || "").toLowerCase();
  const tags = (entry.tags || []).map((t) => t.toLowerCase());
  const category = (entry.category || "").toLowerCase();
  const haystack = `${content} ${tags.join(" ")}`;

  // A tag: or cat: filter is a statement about which notes count at all.
  if (query.tags.length && !query.tags.every((t) => tags.some((tag) => tag.includes(t)))) {
    return false;
  }
  if (query.categories.length && !query.categories.some((c) => category.includes(c))) {
    return false;
  }
  for (const flag of query.flags) {
    //: `is:favourite` is the name the rest of the app now uses; `is:pinned` is
    //: kept because it is in this app's own help text, in saved filters people
    //: already have, and in muscle memory. Two spellings of one flag is a
    //: smaller cost than breaking a filter somebody saved.
    if ((flag === "pinned" || flag === "favourite" || flag === "favourites") && !entry.pinned) {
      return false;
    }
    if (flag === "private" && !entry.is_private) return false;
    if (flag === "linked" && !(entry.links || []).length) return false;
    if (flag === "untagged" && tags.length) return false;
  }
  if (query.tagCount && !matchesTagCount(query.tagCount, tags.length)) return false;
  if (query.exclude.some((word) => haystack.includes(word))) return false;
  if (!query.phrases.every((phrase) => content.includes(phrase))) return false;
  // Every word must appear somewhere, in any order.
  return query.words.every((word) => haystack.includes(word));
}

// Write `text` into `element`, wrapping each matched term in a <mark>.
// Never uses innerHTML: a note containing "<script>" is text, not markup.
// Render note text with [[wiki links]] as clickable chips and search terms
// marked. Splits on the links first so a highlight can't land inside one.
// Inline markdown in note text, and deliberately only the inline kind.
//
// Reported: notes show raw `**text**` while chat answers, documents and the
// dashboard digest all render markdown. They render it with renderMarkdown,
// which also does headings, tables, lists and fenced code, and a list of
// notes rendered that way gets very tall very fast, which is a worse problem
// than the one being fixed. What people actually type in a note is bold, a
// little italic, and the odd `code` span.
//
// Order matters: code spans are matched first and their contents are never
// looked at again, so `**not bold**` inside backticks stays literal.
// Underscore italics are left out on purpose, snake_case_names are common in
// notes and `_` italics would eat them.
//
// Images and links, added after the original four groups rather than before
// them, so existing callers keyed to `m[1]`–`m[4]` (`notePreviewText` below)
// keep working unchanged. This is what an uploaded image actually looks like
// once pasted/dropped/attached (`![name](/media/hash.ext)`, per
// `handleFileUpload`), and until now nothing in the note-card list rendered
// either form at all, so it showed as the literal markdown source, brackets
// and all. Both accept a same-origin relative URL as well as `https?://`:
// unlike `appendInline`'s own link pattern (chat/documents, which only ever
// links *out*), a note's images live at `/media/...` on this same server.
//
// **The two link/image alternatives are length-bounded, and that is not
// cosmetic.** `\[([^\]\n]+)\]\(...\)` against text with an unclosed `[`
// makes the engine consume to the end of the line and back off one
// character at a time looking for a `]` that isn't there: once per start
// position, so O(n²) on a note that is entirely user-controlled text. That
// is CodeQL's `js/polynomial-redos`, and this file's own `[[wiki link]]`
// pattern already bounds itself (`{1,120}`) for exactly this reason. The
// caps are far past any real link (200 characters of link text, 500 of
// URL) and turn the per-position work into a constant.
// `==highlighted text==`, asked for directly ("a highlighting text
// feature in notes and documents"). An inline markdown convention, not a
// new data model: the same choice every other bit of note formatting here
// already made (**bold**, ~~strike~~, [[wiki links]]): a highlight is
// still just characters in the note's own plain-text `content`, so it
// needs no new column, no span-range table, and works everywhere that
// content already goes (search, the AI's own reading of a note, export).
// Bounded the same way `~~…~~` is (excludes its own delimiter and `\n`
// inside the class) rather than the link/image alternatives' explicit
// length caps: the reason those need one (an unbounded `[^\]\n]+` against
// unclosed `[` is O(n²), CodeQL's js/polynomial-redos) doesn't apply to a
// class that already excludes its own closing character.
// The colour set here is the same eight the toolbars offer (MD_COLOURS in
// documents.js) and the same eight that have stylesheet rules. Keeping the
// three in step matters: this listed only six for a while, so picking Red or
// Grey from the highlight menu wrote `==red|text==`, the optional-colour group
// declined to match "red|", and the note rendered the literal text "red|text"
// in a yellow highlight. Adding a colour means all three, or the new one
// silently prints its own name. tests/test_highlight_colours.py pins them.
const INLINE_MD =
  /`([^`\n]+)`|\*\*([^*\n]+?)\*\*|~~([^~\n]+?)~~|==(?:(yellow|green|blue|pink|purple|orange|red|grey)\|)?([^=\n]+?)==|\+\+(yellow|green|blue|pink|purple|orange|red|grey)\|([^+\n]+?)\+\+|\*([^*\n]+?)\*|!\[([^\]\n]{0,200})\]\(([^)\n]{1,500})\)|\[([^\]\n]{1,200})\]\(([^)\n]{1,500})\)/g;

// `appendInline`'s own grammar, before it was merged into renderInlineMarkdown
// below: adds `__bold__`/`_italic_` and bare `https://…` autolinking, and its
// character classes don't stop at a newline. Kept as a **textually separate**
// pattern rather than folded into INLINE_MD behind an "underscore syntax"
// flag applied after matching, appendInline's callers (block-markdown
// lines, already split on "\n" and rejoined with spaces before this ever
// runs) never feed it a newline, so the missing `\n` exclusion is invisible
// in practice, but a shared superset pattern would make renderInlineMarkdown
// start matching `_word_`/bare URLs it doesn't today, splitting its plain
// prose runs differently and changing exactly what substring a caller that
// passes search `terms` ever hands to highlightInto. Two literal patterns,
// selected by `options.underscoreSyntax` below, guarantee neither caller's
// matching behaviour moves at all.
const INLINE_MD_LEGACY =
  /`([^`]+)`|\*\*([^*]+)\*\*|__([^_]+)__|~~([^~]+)~~|==(?:(yellow|green|blue|pink|purple|orange|red|grey)\|)?([^=]+?)==|\+\+(yellow|green|blue|pink|purple|orange|red|grey)\|([^+]+?)\+\+|\*([^*]+)\*|(?<![\w])_([^_]+)_(?![\w])|!\[([^\]]{0,200})\]\(([^)\s]{1,500})\)|\[([^\]]{1,200})\]\(([^)\s]{1,500})\)|(https?:\/\/[^\s)]+)/g;

// Same allowlist an <img src> or <a href> built from note text has to pass:
// an absolute http(s) URL, or a same-origin relative path (one leading
// slash, not two: `//evil.com/x` is also "one string starting with /" but
// is a protocol-relative link off this origin). Rejects `javascript:`,
// `data:`, and anything else a pasted note could contain.
function isRenderableUrl(url) {
  //: `staged:` is this app's own scheme for a picture whose bytes are still
  //: in the browser (see `captureStagedImages`), renderable, because the
  //: preview draws it from the Blob, and never saved, because the save path
  //: rewrites every one of them to a real url first.
  if (typeof url === "string" && url.startsWith(STAGED_URL_PREFIX)) return true;
  return /^https?:\/\//i.test(url) || (url.startsWith("/") && !url.startsWith("//"));
}

// A non-image attachment (handleFileUpload's link-syntax branch) previously
// rendered as a bare link, indistinguishable at a glance from an ordinary
// URL: BACKLOG §4's "genuinely still open" follow-up. Only applied to our
// own /media/ uploads, not arbitrary external links, since a random web
// page's URL extension says nothing reliable about its content.
const ATTACHMENT_ICONS = {
  pdf: "ph-file-pdf", doc: "ph-file-doc", docx: "ph-file-doc", rtf: "ph-file-doc",
  xls: "ph-file-xls", xlsx: "ph-file-xls", csv: "ph-file-csv",
  ppt: "ph-file-ppt", pptx: "ph-file-ppt",
  zip: "ph-file-archive", rar: "ph-file-archive", "7z": "ph-file-archive",
  mp3: "ph-file-audio", wav: "ph-file-audio", ogg: "ph-file-audio", m4a: "ph-file-audio", webm: "ph-file-audio",
  mp4: "ph-file-video", mov: "ph-file-video",
  txt: "ph-file-text", md: "ph-file-md", json: "ph-file-code",
  png: "ph-file-image", jpg: "ph-file-image", jpeg: "ph-file-image",
  gif: "ph-file-image", webp: "ph-file-image", heic: "ph-file-image", heif: "ph-file-image",
};

// `name` is optional and only matters for a `/files/{id}` URL: the
// note-attachment download endpoint, opaque and extension-less by design
// (unlike `/media/<filename>.ext`, which pasted/dropped inline images use).
// Without it, a note's attached PDF/docx/etc. had no extension anywhere in
// its URL to read a type from, so every non-image attachment fell through
// to nothing rendering at all wherever a caller built the URL that way.
function attachmentIconClass(url, name) {
  const source = name || (url.startsWith("/media/") ? url : "");
  if (!source) return null;
  const ext = source.split(".").pop().split(/[?#]/)[0].toLowerCase();
  return ATTACHMENT_ICONS[ext] || "ph-file";
}

//: Extensions the file card labels by name rather than by the generic
//: "File", the type is the second most useful thing about a file after
//: what it is called, and "PDF · Open" reads as a thing you can do where
//: "myfile.pdf" alone reads as text that happens to end in .pdf.
const FILE_KIND_LABELS = {
  pdf: "PDF", doc: "Word", docx: "Word", odt: "Document", rtf: "Document",
  xls: "Sheet", xlsx: "Sheet", ods: "Sheet", csv: "CSV",
  ppt: "Slides", pptx: "Slides", odp: "Slides",
  txt: "Text", md: "Markdown", markdown: "Markdown",
  json: "JSON", xml: "XML", yaml: "YAML", yml: "YAML",
  html: "HTML", htm: "HTML", css: "CSS",
  js: "Code", ts: "Code", jsx: "Code", tsx: "Code", py: "Code", java: "Code",
  c: "Code", h: "Code", cpp: "Code", hpp: "Code", cs: "Code", go: "Code",
  rs: "Code", rb: "Code", php: "Code", sh: "Code", sql: "SQL",
  swift: "Code", kt: "Code",
  zip: "Archive", mp3: "Audio", wav: "Audio", m4a: "Audio",
  mp4: "Video", mov: "Video", webm: "Video",
};

function fileKindLabel(url, name) {
  const source = name || url;
  const ext = source.split(".").pop().split(/[?#]/)[0].toLowerCase();
  return FILE_KIND_LABELS[ext] || "File";
}

/** A file attached to a note, rendered as something you can see and act on.
 *
 * Three affordances, and each one is a thing that was missing rather than a
 * flourish: **open** (the card itself, into the lightbox's document viewer: 
 * the fix for the 401 dead end described at the call site), **save** (the
 * only way to get the bytes out, since a plain link cannot authenticate),
 * and the **type and name**, so a note full of files reads as a list of
 * files instead of a paragraph of blue text.
 *
 * Deliberately not a `<a>` at all. An anchor to `/media/…` is the bug; an
 * anchor with a token in the query string would put an unlock credential
 * into anything that logs or copies a URL. A button that fetches with the
 * header, like every other call in this app, has neither problem.
 */
/** The one-line form of `fileCard`, for a surface too small for a card. */
function fileChip(name, url) {
  const label = name && name !== url ? name : url.split("/").pop();
  const chipEl = document.createElement("span");
  chipEl.className = "chip file-chip";
  setLabel(chipEl, `${(attachmentIconClass(url, name) || "ph-file").replace("ph-", "ph:")} ${label}`);
  chipEl.title = `${fileKindLabel(url, name)}: ${label}`;
  return chipEl;
}

function fileCard(name, url) {
  const label = name && name !== url ? name : url.split("/").pop();
  const card = document.createElement("span");
  card.className = "file-card";

  const open = document.createElement("button");
  open.type = "button";
  open.className = "file-card-open";
  open.title = `Open “${label}”`;
  const icon = document.createElement("i");
  icon.className = `ph ${attachmentIconClass(url, name) || "ph-file"} file-card-icon`;
  icon.setAttribute("aria-hidden", "true");
  const text = document.createElement("span");
  text.className = "file-card-text";
  const nameEl = document.createElement("span");
  nameEl.className = "file-card-name";
  nameEl.textContent = label;
  const kindEl = document.createElement("span");
  kindEl.className = "file-card-kind";
  kindEl.textContent = fileKindLabel(url, name);
  text.append(nameEl, kindEl);
  open.append(icon, text);
  open.addEventListener("click", () => {
    openLightbox([{ filename: label, getUrl: () => mediaSrc(url) }], 0);
  });

  const save = document.createElement("button");
  save.type = "button";
  save.className = "ghost small icon-only file-card-save";
  setLabel(save, "ph:download-simple");
  save.title = `Save “${label}” to disk`;
  save.setAttribute("aria-label", save.title);
  save.addEventListener("click", async (event) => {
    event.stopPropagation();
    try {
      const response = await api(url);
      await saveFile(label, await response.blob());
    } catch (error) {
      toast(error.message || `Couldn't save “${label}”.`, true);
    }
  });

  card.append(open, save);
  return card;
}

// LaTeX escapes that models reach for when they want a symbol (§35H).
//
// Screenshotted: a bullet reading "Jokes $\rightarrow$ Social Skills", with
// the LaTeX printed literally. That is not a markdown gap, the model was
// asked for an arrow and reached for the notation it saw most in training.
// Rendering a whole maths engine for this would be absurd; translating the
// dozen symbols that actually show up costs nothing and covers all of it.
//
// The prompt also asks for plain Unicode, which prevents most of these. This
// is the half that catches the model doing it anyway.
const LATEX_SYMBOLS = {
  rightarrow: "\u2192", to: "\u2192", longrightarrow: "\u27f6", Rightarrow: "\u21d2",
  leftarrow: "\u2190", gets: "\u2190", Leftarrow: "\u21d0",
  leftrightarrow: "\u2194", Leftrightarrow: "\u21d4", uparrow: "\u2191", downarrow: "\u2193",
  times: "\u00d7", div: "\u00f7", pm: "\u00b1", mp: "\u2213", cdot: "\u00b7",
  leq: "\u2264", le: "\u2264", geq: "\u2265", ge: "\u2265",
  neq: "\u2260", ne: "\u2260", approx: "\u2248", equiv: "\u2261", sim: "\u223c",
  ldots: "\u2026", dots: "\u2026", cdots: "\u22ef",
  infty: "\u221e", deg: "\u00b0", bullet: "\u2022", star: "\u2605",
  checkmark: "\u2713", surd: "\u221a", propto: "\u221d", therefore: "\u2234",
  alpha: "\u03b1", beta: "\u03b2", gamma: "\u03b3", delta: "\u03b4",
  lambda: "\u03bb", mu: "\u03bc", pi: "\u03c0", sigma: "\u03c3", omega: "\u03c9",
  Delta: "\u0394", Sigma: "\u03a3", Omega: "\u03a9",
};

//: **Inline maths, `$formula$` on one line** (INBOX 423c). Mirrors the
//: block delimiter's own currency guard (see `mdMathBlockFrom`'s comment):
//: no space just inside either `$` (a genuine `$ x $` is vanishingly rare
//: and a stray space is nearly always somebody's sentence), and the closing
//: `$` may not be immediately followed by a digit or a second `$` (a price
//: range, "$20 and $30", or a `$$…$$` display block's own second dollar).
//: The two lookarounds around the *opening* `$` (`(?<!\$)`, `(?!\$|\s)`) are
//: what keeps this from ever matching inside a `$$…$$` run at all: both
//: dollars of that pair fail one side or the other, so a display block is
//: never mistaken for two stray inline ones. Read by `unlatex` (which
//: decides what survives to be drawn as maths) and by `renderInlineMarkdown`
//: (which actually draws it); the same object so the two can never
//: disagree about what counts.
const INLINE_MATH_RE = /(?<!\$)\$(?!\$|\s)([^$\n]{1,300}?)(?<!\s)\$(?!\$|\d)/g;

function unlatex(text) {
  // The overwhelmingly common case: nothing to do, and not worth two regex
  // passes over every note and every streaming frame to find that out.
  if (!text || (!text.includes("\\") && !text.includes("$"))) return text;
  const swap = (s) =>
    s.replace(/\\([A-Za-z]+)/g, (whole, name) =>
      Object.prototype.hasOwnProperty.call(LATEX_SYMBOLS, name)
        ? LATEX_SYMBOLS[name]
        : whole
    );
  // The old rule, for everything INLINE_MATH_RE does not claim below:
  // inline maths delimiters are dropped only when the span is actually
  // maths *and* everything in it became plain characters.
  //
  // Both halves are load-bearing. Without the first, "cost $5 and $10 today"
  // is a matching span containing no commands, and the dollars vanish, a
  // notebook full of prices is a much more likely thing than a notebook full
  // of LaTeX. Without the second, a span still holding \frac or \sum gets
  // stripped of its delimiters and left as half-translated notation, which is
  // worse than leaving it alone: the user can at least read the source.
  const swapDollarSpans = (s) =>
    s.replace(/\$([^$\n]{1,200})\$/g, (whole, inner) => {
      if (!/\\[A-Za-z]/.test(inner)) return whole; // not maths: currency, prose
      const plain = swap(inner);
      return /\\[A-Za-z]/.test(plain) ? whole : plain;
    });
  //: A span INLINE_MATH_RE claims is carried through byte for byte, dollar
  //: signs and all: `renderInlineMarkdown` draws it as real maths, through
  //: the same TeX-to-MathML renderer the `$$` blocks already use, rather
  //: than this function reducing it to a Unicode stand-in symbol (what used
  //: to happen to `$\alpha$`, and what always happened to `$x$`: it has no
  //: `\command` for the old rule above to even notice). Everything between
  //: two such spans still gets the old rule, which is why this walks the
  //: text in segments instead of running one `.replace` over the whole
  //: string: the old rule's own `$…$` regex is looser than INLINE_MATH_RE
  //: (no spacing or digit guard) and would otherwise re-match and mangle
  //: the very span just carried through.
  INLINE_MATH_RE.lastIndex = 0;
  let out = "";
  let cursor = 0;
  let m;
  while ((m = INLINE_MATH_RE.exec(text))) {
    out += swap(swapDollarSpans(text.slice(cursor, m.index))) + m[0];
    cursor = INLINE_MATH_RE.lastIndex;
  }
  out += swap(swapDollarSpans(text.slice(cursor)));
  return out;
}

// `compact`: skip the actual <img> and show the alt text instead, for a
// label-sized surface (a link chip, a document sidebar button) where a
// note's own image markdown would otherwise cram a thumbnail into a spot
// sized for a line of text. The note card's own body always gets the real
// image; everywhere smaller gets the same treatment `notePreviewText`
// already gives one to a plain-text preview.
//
// `options` is where appendInline's five real behavioural differences from
// the note-card grammar live, now that the two hand-rolled parsers (each
// with its own separately maintained `isRenderableUrl` call, per
// ROADMAP.md §0/§2) are one function:
//   - `dismissible` (default true): render an image with the note-card
//     delete/lightbox chrome. appendInline's callers (chat, documents, table
//     cells) pass false: there is no note markdown line for a "remove this
//     image" click to edit there, so they get a plain <img>.
//   - `autolinkBareUrls` (default false): turn a plain `https://…` run into
//     a real link. Off for note cards (unchanged), on for appendInline.
//   - `underscoreSyntax` (default false): also recognize `__bold__`/
//     `_italic_` and bare-URL autolinking, using INLINE_MD_LEGACY instead of
//     INLINE_MD: see that constant's comment for why this is a second
//     literal pattern rather than a superset with the extra alternatives
//     suppressed after matching.
//   - `strikeTag` (default "s"): appendInline's callers always used <del>,
//     not the note-card renderer's <s>; style.css has separate rules for
//     `.entry-content s` vs `.answer/.bubble-answer/.dash-body del`.
//   - `applyLatex` (default true): appendInline never ran unlatex() on its
//     text, so it stays off for that mode to keep behaviour unchanged.
// Every default matches renderInlineMarkdown's original, options-less
// behaviour exactly, so no existing call site needs to change.
// The allow-list for anything a note's own text can turn into an href:
// web links, mail, this app's own paths and in-page anchors. Everything
// else (javascript:, data:, vbscript:, file:) becomes a dead link rather
// than a live one. Kept beside the renderer that needs it.
function safeHref(url) {
  const value = String(url || "").trim();
  if (/^(https?:|mailto:|tel:)/i.test(value)) return value;
  if (/^[/#?.]/.test(value) || !/^[a-z][a-z0-9+.-]*:/i.test(value)) return value;
  return "#";
}

//: **CommonMark's angle-bracket autolink, `<https://example.com>`.** INBOX
//: 81: "Web search results in the Sources dropdown: links rendered as
//: Markdown links", with a screenshot of a model's table showing the raw
//: `<https://...>` text. Neither inline pattern here has ever matched that
//: form, so it fell through to plain prose and the reader saw the brackets.
//:
//: Rewritten to `[url](url)` *before* matching rather than added as another
//: alternative to `INLINE_MD`. That pattern's capture groups are addressed by
//: number in the renderer below, and its own comment records a bug where two
//: indices were off by two and every image in the app rendered "undefined":
//: adding a group in the middle of it is exactly how that happens again. A
//: pre-pass cannot move an index.
//:
//: Only http and https, which is the same allowlist `isRenderableUrl`
//: applies afterwards; the point of the check here is to leave anything else
//: (an HTML tag, `<3`, a generic like `Array<T>`) exactly as it was.
function expandAngleAutolinks(text) {
  return String(text || "").replace(
    /<(https?:\/\/[^\s<>]{1,500})>/g,
    (whole, url) => `[${url}](${url})`,
  );
}

//: What a bare URL is shown as: the host without its `www.`, then the path
//: shortened to its last meaningful segment, so
//: `https://www.goodreads.com/series/319859-he-who-fights-with-monsters`
//: reads "goodreads.com / …he-who-fights-with-monsters". The query string and
//: fragment are dropped from the label (never from the link): they are
//: tracking and position, not identity. A string the URL parser refuses comes
//: back as it was, so a malformed address is still shown rather than hidden.
const READABLE_URL_SEGMENT = 40;

function readableUrl(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  const host = parsed.hostname.replace(/^www\./i, "");
  const segments = parsed.pathname.split("/").filter(Boolean);
  if (!segments.length) return host;
  let last = decodeURIComponent(segments[segments.length - 1]);
  if (last.length > READABLE_URL_SEGMENT) last = last.slice(0, READABLE_URL_SEGMENT - 1) + "\u2026";
  //: An ellipsis stands in for the middle of a deep path, so "site / … / page"
  //: still says there was more between them.
  return segments.length > 1 ? `${host} / \u2026 / ${last}` : `${host} / ${last}`;
}

function renderInlineMarkdown(element, text, terms, compact = false, options = {}) {
  const { underscoreSyntax = false, applyLatex = true } = options;
  // appendInline never cleared `element`, it only ever appended into a
  // freshly created element, except the task-list-checkbox case, which
  // appends a <input type=checkbox> *before* calling appendInline on the
  // rest of the item text. A `replaceChildren()` here would delete that
  // checkbox out from under it, so the note-card renderer's clear-first
  // behaviour is kept only for its own (non-legacy) callers.
  if (!underscoreSyntax) element.replaceChildren();
  if (applyLatex) text = unlatex(text);
  text = expandAngleAutolinks(text);
  //: **Inline maths, cut out before the `**bold**`/`` `code` ``/link
  //: grammar below ever sees it** (INBOX 423c). A span INLINE_MATH_RE
  //: claims (its own comment has the exact rule) is drawn by the same
  //: TeX-to-MathML renderer the `$$` blocks use, one run of ordinary
  //: grammar-matching per gap between formulas rather than one run over the
  //: whole string, so `**bold**` either side of a formula still matches.
  //: A formula *inside* `**bold $x$ text**` does not come out bold: that
  //: would need maths as a token of the grammar below rather than a cut
  //: made before it runs, and nothing reported here asked for that.
  INLINE_MATH_RE.lastIndex = 0;
  let mathCursor = 0;
  let mathMatch;
  let sawMath = false;
  while ((mathMatch = INLINE_MATH_RE.exec(text))) {
    sawMath = true;
    if (mathMatch.index > mathCursor) {
      appendInlineRun(element, text.slice(mathCursor, mathMatch.index), terms, compact, options);
    }
    element.appendChild(mdInlineMathElement(mathMatch[1].trim()));
    mathCursor = INLINE_MATH_RE.lastIndex;
  }
  if (sawMath) {
    if (mathCursor < text.length) appendInlineRun(element, text.slice(mathCursor), terms, compact, options);
    return;
  }
  appendInlineRun(element, text, terms, compact, options);
}

//: The `**bold**`/`` `code` ``/link/image/highlight/bare-url grammar,
//: over one run of text `renderInlineMarkdown` has already established
//: holds no inline maths. Never clears `element`: a run is one piece of a
//: larger call that may already have appended earlier runs and maths nodes.
function appendInlineRun(element, text, terms, compact, options) {
  const { dismissible = true, autolinkBareUrls = false, underscoreSyntax = false, strikeTag = "s" } = options;
  const pattern = new RegExp((underscoreSyntax ? INLINE_MD_LEGACY : INLINE_MD).source, "g");
  let cursor = 0;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) {
      const chunk = text.slice(cursor, match.index);
      // Same reasoning as the clear-first skip above: appendInline appended
      // plain prose as a bare text node, never wrapped in a <span> (it never
      // had search terms to mark). Keeping that distinction means neither
      // mode's DOM shape moves for its own callers.
      if (underscoreSyntax) {
        element.appendChild(document.createTextNode(chunk));
      } else {
        const before = document.createElement("span");
        highlightInto(before, chunk, terms);
        element.appendChild(before);
      }
    }
    let code, bold, strike, markColour, mark, inkColour, ink, italic, imageAlt, imageUrl, linkText, linkUrl, bareUrl;
    if (underscoreSyntax) {
      let boldStar, boldUnderscore, italicStar, italicUnderscore;
      [
        , code, boldStar, boldUnderscore, strike, markColour, mark, inkColour, ink, italicStar, italicUnderscore,
        imageAlt, imageUrl, linkText, linkUrl, bareUrl,
      ] = match;
      bold = boldStar ?? boldUnderscore;
      italic = italicStar ?? italicUnderscore;
    } else {
      [, code, bold, strike, markColour, mark, inkColour, ink, italic, imageAlt, imageUrl, linkText, linkUrl] = match;
    }
    // Images and links are their own element kinds, not a wrap-in-a-tag like
    // the four above: built and appended directly rather than falling
    // through to the generic `tag`/`node` shape below, since neither one
    // takes searched-term highlighting inside it (an <img> has no text to
    // highlight, and a link's own text isn't split into marks any more than
    // a code span's is).
    if (imageUrl !== undefined) {
      if (compact) {
        element.appendChild(document.createTextNode(imageAlt || "Image"));
      } else if (isRenderableUrl(imageUrl)) {
        if (!dismissible) {
          const img = document.createElement("img");
          img.src = mediaSrc(imageUrl);
          img.alt = imageAlt || "";
          img.className = "entry-inline-image";
          img.loading = "lazy";
          element.appendChild(img);
          cursor = pattern.lastIndex;
          continue;
        }
        const wrapper = document.createElement("span");
        wrapper.className = "thumb-wrap";
        const img = document.createElement("img");
        img.src = mediaSrc(imageUrl);
        img.alt = imageAlt || "";
        img.className = "attachment-thumb";
        img.loading = "lazy";
        img.style.cursor = "zoom-in";
        img.addEventListener("click", (e) => {
          e.stopPropagation();
          openLightbox([{ filename: imageAlt || "Image", getUrl: () => mediaSrc(imageUrl) }], 0);
        });
        const dismissBtn = document.createElement("span");
        dismissBtn.className = "unlink";
        dismissBtn.title = "Remove image from note";
        setLabel(dismissBtn, "ph:x"); // raw "×" glyph vs Phosphor icon font mismatch mis-centers the icon
        // `match` is one `let` binding reused by every pass of the while
        // loop above (a `while` reassigns it, unlike a `for (let x of …)`'s
        // fresh-per-iteration binding): every dismiss button's closure
        // shared the same variable, and by the time anyone actually clicked
        // one, the loop had long since finished with `match` sitting at
        // `null` (the value that ends the `while` condition). Every click
        // threw `Cannot read properties of null (reading '0')` before the
        // confirm dialog could even open, reported as "the remove button
        // doesn't work". Capturing the text this match actually matched
        // into its own const, right here in the loop body, gives each
        // button's closure the value for *its own* image instead of
        // whatever `match` happened to hold after parsing ended.
        const originalText = match[0];
        dismissBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          wrapper.dispatchEvent(new CustomEvent("remove-inline-image", {
            bubbles: true,
            detail: { originalText }
          }));
        });
        makeUnlinkAccessible(dismissBtn);
        wrapper.appendChild(img);
        wrapper.appendChild(dismissBtn);
        // Asked for directly: a deleted image left a broken-image glyph in
        // the note that referenced it, a closable "deleted" box instead.
        // Only dismisses the placeholder from this render; the note's own
        // markdown line is left alone; editing it back out is a further,
        // separate feature.
        img.addEventListener("error", () => {
          const placeholder = document.createElement("span");
          placeholder.className = "entry-inline-image-deleted";
          placeholder.append(document.createTextNode(`${imageAlt || "Image"} deleted`));
          const dismiss = document.createElement("span");
          dismiss.className = "unlink";
          dismiss.title = "Dismiss";
          setLabel(dismiss, "ph:x"); // raw "×" glyph vs Phosphor icon font mismatch mis-centers the icon
          dismiss.addEventListener("click", (e) => { e.stopPropagation(); placeholder.remove(); });
          makeUnlinkAccessible(dismiss);
          placeholder.appendChild(dismiss);
          wrapper.replaceWith(placeholder);
        });
        element.appendChild(wrapper);
      } else {
        element.appendChild(document.createTextNode(match[0]));
      }
      cursor = pattern.lastIndex;
      continue;
    }
    if (linkUrl !== undefined) {
      if (isRenderableUrl(linkUrl)) {
        const iconClass = attachmentIconClass(linkUrl);
        if (iconClass) {
          // **A file, not a link, and this fixes a dead end, not just the
          // looks.** Reported directly: "once I uploaded two files into a
          // note, they became hyperlinked text, I clicked on them, and it
          // took me to a black fode screen with some text about needing to
          // unlock first… there was no way for me to go back except for
          // closing the application entirely."
          //
          // That is exactly what an `<a href="/media/x.pdf">` does here. A
          // plain navigation carries no `X-Auth-Token` header: only
          // `apiJson` and `mediaSrc` attach one: so the browser leaves the
          // single-page app, gets the unlock guard's 401 JSON body, and
          // renders it with its own JSON viewer. The app is gone, and in the
          // desktop shell there is no back button to bring it back.
          //
          // The lightbox already reads this exact file: `show()` sniffs a
          // `/media/…` url that is not an image and hands it to the document
          // viewer, which renders PDFs, Office files, code and plain text
          // through `/media/text`. Nothing routed a note's own files to it, 
          // that missing wire is the whole bug.
          // `compact` is the same label-sized-surface case the image branch
          // above uses it for: a dashboard preview row or a link chip has
          // room for a line of text, not a two-line card with its own
          // buttons. The name and the type still say what it is.
          element.appendChild(
            compact ? fileChip(linkText, linkUrl) : fileCard(linkText, linkUrl)
          );
        } else {
          const a = document.createElement("a");
          // Only schemes a note may point at. A `[x](javascript:...)` link
          // would otherwise be a click-to-run script in a note that came
          // from an import or a shared file; the CSP blocks it today, and
          // this is the second lock in case the CSP is ever loosened.
          a.href = safeHref(linkUrl);
          if (/^https?:\/\//i.test(linkUrl)) {
            a.target = "_blank";
            a.rel = "noopener noreferrer";
          }
          //: `[https://x.com/a/b](https://x.com/a/b)` is how a model writes a
          //: bare URL when it has been told to use markdown: the same address
          //: twice, and the same wall of slug on screen. Shown as the bare
          //: form is (see `readableUrl` below); a link whose words differ from
          //: its address is a real label and is left alone.
          const labelIsTheUrl = linkText.trim() === linkUrl.trim();
          if (labelIsTheUrl) a.title = linkUrl;
          highlightInto(a, labelIsTheUrl ? readableUrl(linkUrl) : linkText, terms);
          element.appendChild(a);
        }
      } else {
        element.appendChild(document.createTextNode(match[0]));
      }
      cursor = pattern.lastIndex;
      continue;
    }
    if (bareUrl !== undefined) {
      if (autolinkBareUrls) {
        const a = document.createElement("a");
        a.href = bareUrl;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        //: The address is the tooltip; the words are the site and the path.
        //: Asked for with a screenshot of an answer that tabulated five
        //: results by their raw URLs, each one a hundred characters of
        //: `https://www.` and slug, overflowing the bubble sideways: "is it
        //: possible to better render the links that the ai writes??" A model
        //: writes bare URLs constantly and nobody reads a URL; they read where
        //: it goes. `readableUrl` keeps the host and a shortened path, which
        //: is what a browser's own address bar shows, and the full address
        //: stays one hover (and the click) away.
        a.title = bareUrl;
        highlightInto(a, readableUrl(bareUrl), terms);
        element.appendChild(a);
      } else {
        const span = document.createElement("span");
        highlightInto(span, bareUrl, terms);
        element.appendChild(span);
      }
      cursor = pattern.lastIndex;
      continue;
    }
    const tag = code
      ? "code"
      : bold
        ? "strong"
        : strike
          ? strikeTag
          : mark
            ? "mark"
            : ink
              ? "span"
              : "em";
    const node = document.createElement(tag);
    // Distinguishes a `==highlight==` from highlightInto's own <mark> below
    // (used for search-term matches), same tag, different meaning, so they
    // need different styling or a highlighted note reads as "this matched
    // your search" with no search active.
    // `++red|text++`, a foreground colour, the counterpart to the highlight's
    // background one. The colour is part of a class name, never an inline
    // style: this app's CSP rejects inline styles outright (a whole batch of
    // them was found doing nothing once), and a closed allowlist means every
    // colour that can be typed has a theme-aware rule written for it.
    if (ink) node.className = `text-ink text-ink-${inkColour}`;
    if (mark) {
      // `==text==` is the plain (yellow) highlight; `==green|text==` picks one
      // of a small named set. An allowlist baked into the pattern itself, not
      // a free-form colour: the value lands in a class name, and every colour
      // that can appear here therefore has a stylesheet rule written for it
      // (05-sidebars-themes.css) that is theme-aware in both light and dark.
      node.className = markColour
        ? `text-highlight text-highlight-${markColour}`
        : "text-highlight";
    }
    // A code span is literal by definition, so it is never searched-highlighted
    // into pieces: the rest still is, or filtering would stop marking any
    // word that happened to sit inside emphasis.
    if (code) node.textContent = code;
    else highlightInto(node, bold || strike || mark || ink || italic, terms);
    element.appendChild(node);
    cursor = pattern.lastIndex;
  }
  if (cursor < text.length) {
    const rest = text.slice(cursor);
    if (underscoreSyntax) {
      element.appendChild(document.createTextNode(rest));
    } else {
      const restSpan = document.createElement("span");
      highlightInto(restSpan, rest, terms);
      element.appendChild(restSpan);
    }
  }
}

// Inline formatting: **bold**/__bold__, *italic*/_italic_, `code`, ~~strike~~,
// ==highlight==, [text](http…url), images, and bare http(s) URLs. Built with textContent
// only: note/answer text can never inject markup. Was its own ~90-line
// hand-rolled parser with its own `isRenderableUrl` gate call; now a thin
// wrapper over renderInlineMarkdown (ROADMAP.md §0/§2): see that function's
// `options` comment for exactly which behaviours these five overrides
// reproduce and why each one is there.
function appendInline(parent, text) {
  renderInlineMarkdown(parent, text, [], false, {
    dismissible: false,
    autolinkBareUrls: true,
    underscoreSyntax: true,
    // `.answer del`/`.bubble-answer del`/`.dash-body del` (style.css) style
    // this tag specifically: appendInline's own callers always used <del>,
    // not the note-card renderer's <s>, and the CSS was written for that.
    strikeTag: "del",
    applyLatex: false,
  });
}

// Mirrors manager.extract_title's own rule (the first non-blank line, and
// only that line) so the body shown under a title never repeats it, called
// only when the backend has already said this note has a title, so this
// never has to decide on its own whether a line "looks like" a heading.
function bodyWithoutTitleLine(content) {
  const lines = content.split("\n");
  let i = 0;
  while (i < lines.length && lines[i].trim() === "") i++;
  if (i >= lines.length) return content;
  lines.splice(i, 1);
  if (lines[i] !== undefined && lines[i].trim() === "") lines.splice(i, 1);
  return lines.join("\n");
}

// The note a [[wiki link]] names, or null.
//
// One resolver, because there were two: renderNoteText matched notes by the
// opening words and layerDocWikiLinks matched documents by exact title, so the
// same [[name]] meant different things depending on which pane rendered it.
// Notes are matched first and by prefix (that is what applyWikiSuggestion
// inserts: a note's opening words); documents fall back to an exact,
// case-insensitive title. Private notes are never a target: they cannot be
// linked, and resolving to one would leak that it exists.
//: **The lowercased forms a wiki lookup compares against, computed once per
//: note rather than once per note per link.**
//:
//: `resolveWikiTarget` runs for every `[[link]]` that renders, and it used to
//: lowercase every note's whole body, twice (once plain, once with the
//: heading marker stripped by a regex), on every one of those calls. At four
//: thousand notes averaging 594 bytes that is up to 4.8 MB of string work per
//: link, and a note list draws sixty cards at a time. Profiled over fourteen
//: seconds of ordinary use, `opening` and `openingTitle` and their caller
//: came to 267 ms of self time, more than the dashboard's p5 sketch.
//:
//: Two things fix it and neither can go stale. The forms are cached **on the
//: entry, keyed by the content string they were derived from**, so an edit
//: invalidates them by construction: no generation counter to forget to bump,
//: no cache to clear when `allEntries` is replaced. And only the first
//: `WIKI_PREFIX_MAX` characters are lowercased, because every comparison here
//: is `startsWith` against a needle that is a title. A needle longer than that
//: falls back to the full string, so the bound is an optimisation and never a
//: behaviour.
const WIKI_PREFIX_MAX = 300;

function wikiForms(entry, needleLength) {
  const content = entry.content || "";
  if (needleLength > WIKI_PREFIX_MAX) {
    const full = content.toLowerCase();
    return { opening: full, title: full.replace(/^#{1,6}[ \t]*/, "") };
  }
  if (entry._wikiSrc !== content) {
    const head = content.slice(0, WIKI_PREFIX_MAX).toLowerCase();
    entry._wikiSrc = content;
    entry._wikiOpening = head;
    entry._wikiTitle = head.replace(/^#{1,6}[ \t]*/, "");
  }
  return { opening: entry._wikiOpening, title: entry._wikiTitle };
}

//: The same trick for the imported-vault path: a file stem is derived from
//: `source_path` with a split, a pop and a regex, which was also being redone
//: per link per note.
function wikiStem(entry) {
  const path = entry.source_path || "";
  if (entry._wikiStemSrc !== path) {
    entry._wikiStemSrc = path;
    entry._wikiStem = path.split("/").pop().replace(/\.(md|markdown)$/i, "").toLowerCase();
  }
  return entry._wikiStem;
}

//: **A board or a map named by its id**, the form the "/" menu and the
//: board's own "Add to a note" write: `board:12|House jobs`, or `map:12|The
//: house`.
//:
//: Why an id rather than the title every other `[[link]]` uses (INBOX 309,
//: the owner: "there is also no way to attach a whiteboard or mindmap to a
//: note as like an object in the notes"). A title-addressed object breaks the
//: moment the board is renamed, and it breaks *silently*: a renamed board and
//: a deleted one look identical to the resolver, so the note either points at
//: nothing or tombstones a board that is still there. A board is an `Entry`,
//: so its id is stable, and renaming it now leaves every note that carries it
//: pointing at the same board.
//:
//: **The title travels with the id anyway**, for two reasons that are not
//: decoration. It is what a tombstone says when the board really is gone
//: ("Old plan" beats "board 12"), and it is what the backend's own reference
//: scan matches on: `_reference_rows` in routes_entries.py finds a board's
//: references with a LIKE over note content for the board's label, so a note
//: carrying the title still counts towards the card's "on 1 board" chip with
//: no backend change at all.
//:
//: `whiteboard` and `mindmap` are accepted as spellings of the same two
//: things because somebody typing this by hand will write one of them.
const BOARD_REF_PATTERN = /^\s*(board|whiteboard|map|mindmap)\s*:\s*(\d{1,9})\s*(?:\|\s*([^|]*))?$/i;

function boardEmbedRef(name) {
  const match = BOARD_REF_PATTERN.exec(String(name || ""));
  if (!match) return null;
  return {
    id: Number(match[2]),
    title: (match[3] || "").trim(),
    //: What the writer *said* it was, used only until the board itself is
    //: found: the board's own `type` is the truth, and a map turned into a
    //: whiteboard after the note was written should draw as a whiteboard.
    map: /map/i.test(match[1]),
  };
}

//: The board a reference points at, or null when it is really gone.
//:
//: Two lookups, in this order. The id is exact and is what the writer meant.
//: The title is the fallback for the one case an id cannot survive: a board
//: exported and imported again, or restored from a backup, keeps its name and
//: takes a new id. Trying it before calling anything missing is the difference
//: between a tombstone that is right and one that is merely early.
function boardEmbedTarget(ref) {
  if (!ref || !ref.id) return null;
  const byId = typeof mapBoardById === "function" ? mapBoardById(ref.id) : null;
  if (byId) return byId;
  if (!ref.title || typeof mapBoardTitled !== "function") return null;
  return mapBoardTitled(ref.title.toLowerCase());
}

function resolveWikiTarget(name) {
  //: An id-addressed board is answered before anything is lower-cased or
  //: scanned: it names exactly one thing, and the notes-then-documents walk
  //: below could only ever find something else called "board:12".
  const ref = boardEmbedRef(name);
  if (ref) {
    const board = boardEmbedTarget(ref);
    return board ? { kind: "board", entry: board } : null;
  }
  const needle = String(name || "").trim().toLowerCase();
  if (!needle) return null;
  const entries = typeof allEntries !== "undefined" ? allEntries : [];
  //: **A vault's links name the file.** An imported note carries the path it
  //: came from, and Obsidian writes `[[Roadmap]]` for `Projects/Roadmap.md`, 
  //: so this is tried first, and matched exactly: a file called "Index"
  //: should not lose to a note that merely opens with the word "index". Same
  //: rule as `find_by_wiki_name` in entry/manager.py, which is what makes the
  //: link the backend stores and the link this pane draws point at one note.
  const vaultNote = entries.find(
    (e) => !e.is_private && e.source_path && wikiStem(e) === needle
  );
  if (vaultNote) return { kind: "note", entry: vaultNote };
  //: **A board is a link target, and it is not a note.** MINDMAP_PLAN.md §5
  //: item 12 asks for a map chip in note bodies, and the `@`/`[[` picker in
  //: editor.js has offered boards as targets since it was written, so the
  //: link could already be *typed* and resolved to something. What it resolved
  //: to was `{kind: "note"}`, and the click called `flashEntry`, which scrolls
  //: the Notes tab to a row that is not there: a board is filtered out of
  //: every note list in the app. So the link worked, looked like a note, and
  //: went nowhere.
  //:
  //: Matched on the board's *title* with the `# ` stripped, and by prefix on
  //: the raw content underneath, because both forms exist in real notes: the
  //: picker used to insert the whole first line (`[[# My map]]`) and now
  //: inserts the title (`[[My map]]`).
  //:
  //: **Read from the board index, not from `allEntries`.** `GET /entries` is
  //: the notes list and no longer carries boards at all (see its `boards`
  //: parameter, a map called "test" was showing up as a note, reported), so
  //: this used to resolve against a list that will not have the board in it.
  //: `mapBoardIndexCache` is `/whiteboard/boards`, which is the list of
  //: boards by definition, and it is already loaded for the map chips.
  const board = mapBoardTitled(needle);
  if (board) return { kind: "board", entry: board };
  //: **Two ways a note's opening words can be written, and both resolve.** The
  //: `[[` picker inserts the note's first line *verbatim*, `# ` and all, so
  //: matching the content by prefix is what makes `[[# Girl with bell]]`
  //: resolve. Anybody typing a link by hand writes the title they can see,
  //: `[[Girl with bell]]`, and that matched nothing at all: the note's content
  //: starts with the hash, so the prefix test failed on the first character.
  //: Reported by the agent that built the document embeds, which had to avoid
  //: the shape in its own fixture.
  //:
  //: The second comparison strips a leading heading marker from the *content*
  //: rather than adding one to the needle, because the marker is one to six
  //: hashes and any amount of space, and the content is where that is known.
  //: One pass, not a `filter` into a four thousand entry array followed by
  //: two `find`s over it. The plain-opening match still wins over the
  //: marker-stripped one, which is what the two passes were for: it is
  //: remembered rather than searched for twice.
  let note = null;
  let titleMatch = null;
  for (const entry of entries) {
    if (entry.is_private || entry.is_board) continue;
    const forms = wikiForms(entry, needle.length);
    if (forms.opening.startsWith(needle)) {
      note = entry;
      break;
    }
    if (!titleMatch && forms.title.startsWith(needle)) titleMatch = entry;
  }
  note = note || titleMatch;
  if (note) return { kind: "note", entry: note };
  //: **The document list the documents editor holds, when this one is
  //: empty.** `editorDocumentCache` is filled only once the `[[` picker has
  //: been opened, so until then every `![[A document]]` in the Read view said
  //: "Nothing called A document yet" while the Live view of the same line,
  //: which resolves through documents.js's own `docs`, drew it: two views of
  //: one line disagreeing (found by `scratchpad/ui-sweeps/blockbar.js`).
  const cached = typeof editorDocumentCache !== "undefined" && editorDocumentCache && editorDocumentCache.length
    ? editorDocumentCache
    : null;
  const documents = cached || (typeof docs !== "undefined" && Array.isArray(docs) ? docs : null);
  const docList = documents || [];
  const doc =
    docList.find((d) => (d.title || "").trim().toLowerCase() === needle) ||
    //: Reported directly: "still cant open note links from the document
    //: editor", on a link whose visible text ended mid-word ("...and
    //: progr"). Exact match only fails both plausible causes of that: a
    //: shorter string was written into the `[[...]]` than the document's
    //: current title (however that happened), or the document was
    //: retitled after the link was made. A prefix match is the same
    //: fallback `note` above already gets for exactly the same reason,
    //: and a link that is a genuine prefix of a longer title is a much
    //: likelier accident than two documents sharing one.
    docList.find((d) => (d.title || "").trim().toLowerCase().startsWith(needle));
  if (doc) return { kind: "document", doc };
  return null;
}

// A note card's text: block constructs first, then the inline pass.
//
// Notes deliberately do not go through renderMarkdown, this pass keeps
// search-term highlighting, which that renderer has no concept of. So the two
// block constructs the "/" menu can insert are handled here explicitly and
// everything else falls through to exactly the inline rendering this function
// always did. When a note contains neither, the DOM produced is identical to
// before, which is why the fall-through appends to `element` directly rather
// than wrapping runs in a container.
function renderNoteText(element, text, terms) {
  element.replaceChildren();
  const lines = String(text ?? "").replace(/\r\n/g, "\n").split("\n");
  let buffer = [];
  const flush = () => {
    if (!buffer.length) return;
    renderNoteInline(element, buffer.join("\n"), terms);
    buffer = [];
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    const embedded = line.match(/^\s*!\[\[([^[\]]{1,120})\]\]\s*$/);
    if (embedded) {
      flush();
      element.appendChild(mdEmbedElement(embedded[1].trim(), 0));
      i++;
      continue;
    }

    //: The structural blocks the "/" menu writes (INBOX 421 b: they had to
    //: work "in documents and notes"), through the same builders the page
    //: renderer uses. A column is rendered by this function, so it keeps the
    //: card's search highlighting.
    const columns = mdColumnsFrom(lines, i);
    if (columns) {
      flush();
      element.appendChild(mdColumnsElement(columns.columns, (host, body) => renderNoteText(host, body, terms)));
      i = columns.end;
      continue;
    }
    const maths = mdMathBlockFrom(lines, i);
    if (maths) {
      flush();
      element.appendChild(mdMathElement(maths.tex));
      i = maths.end;
      continue;
    }
    const rule = mdDividerKind(line);
    if (rule) {
      flush();
      element.appendChild(mdRuleElement(rule));
      i++;
      continue;
    }
    //: A card's headings are not elements to jump to (the card is one
    //: paragraph of text), so its contents block is the outline itself: the
    //: note's headings, indented by level, as a list to read.
    if (MD_TOC_LINE.test(line)) {
      flush();
      const toc = mdTocElement();
      const list = toc.querySelector(".md-toc-list");
      const entries = mdTocEntries(lines.join("\n"));
      const top = entries.length ? Math.min(...entries.map((e) => e.level)) : 1;
      for (const entry of entries) {
        const item = document.createElement("li");
        item.className = `md-toc-item md-toc-depth-${Math.min(3, entry.level - top)}`;
        renderInlineMarkdown(item, entry.text, terms);
        list.appendChild(item);
      }
      if (!entries.length) {
        const empty = document.createElement("li");
        empty.className = "md-toc-empty";
        empty.textContent = "Headings you add appear here.";
        list.appendChild(empty);
      }
      element.appendChild(toc);
      i++;
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      const quoted = [];
      let j = i;
      while (j < lines.length && /^\s*>\s?/.test(lines[j])) {
        quoted.push(lines[j].replace(/^\s*>\s?/, ""));
        j++;
      }
      const box = mdCalloutElement(quoted, 0);
      if (box) {
        flush();
        element.appendChild(box);
        i = j;
        continue;
      }
      // An ordinary blockquote, not a callout: leave it to the inline pass
      // exactly as it was written, rather than eating the "> " markers.
    }

    buffer.push(line);
    i++;
  }
  flush();
}

// The inline half: [[wiki links]], emphasis, and search-term highlighting.
// Appends to `parent`; does not clear it.
function renderNoteInline(element, text, terms) {
  const pattern = /\[\[([^[\]]{1,120})\]\]/g;
  let cursor = 0;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) {
      const span = document.createElement("span");
      renderInlineMarkdown(span, text.slice(cursor, match.index), terms);
      element.appendChild(span);
    }
    const name = match[1].trim();
    //: **A link that names a map draws as a map chip** (MINDMAP_PLAN.md §5
    //: item 12: "note bodies"). Resolved here rather than on click, which is
    //: what every other kind still does, because the *shape* of the control
    //: depends on the answer: a chip carries the map's icon and node count,
    //: and neither can be decided after the element is already on screen.
    //: One `find` over `allEntries` per wiki link, on a list that is already
    //: in memory: the same lookup the click handler was doing anyway.
    const mapTarget = resolveWikiTarget(name);
    if (mapTarget && mapTarget.kind === "board") {
      const board = mapBoardById(mapTarget.entry.id) || {
        id: mapTarget.entry.id,
        title: name,
        type: "map",
      };
      element.appendChild(mapChip(board));
      cursor = pattern.lastIndex;
      continue;
    }
    const link = document.createElement("button");
    link.type = "button";
    link.className = "wiki-link";
    const label = wikiLinkLabel(name);
    link.textContent = label;
    link.title = `Go to the note starting "${label}"`;
    link.addEventListener("click", (event) => {
      event.stopPropagation();
      const target = resolveWikiTarget(name);
      if (target && target.kind === "note") flashEntry(target.entry.id);
      else if (target && target.kind === "board") openWhiteboardBoard(target.entry.id);
      else if (target && target.kind === "document") openDocument(target.doc.id);
      // Nothing by that name yet, offer to make it rather than dead-ending.
      // A link you typed on purpose is the clearest possible statement that
      // the thing should exist; making the user go and create it by hand, then
      // come back, is the friction this removes.
      else offerToCreateWikiTarget(name);
    });
    element.appendChild(link);
    cursor = pattern.lastIndex;
  }
  if (cursor < text.length) {
    const span = document.createElement("span");
    renderInlineMarkdown(span, text.slice(cursor), terms);
    element.appendChild(span);
  }
}

//: `terms` is "the words to highlight", and **every caller that has nothing to
//: highlight passes something falsy rather than `[]`**, `chatSourcesPanel`
//: passes a literal `null`, which is what a snippet with no search behind it
//: honestly is. This read `terms.length` directly and threw
//: `Cannot read properties of null (reading 'length')`.
//:
//: The throw is worth recording because of where it landed rather than what it
//: was. `renderInlineMarkdown` is called while a saved conversation's Sources
//: panel is being built, which happens inside `openConversation`, so the
//: exception aborted the rest of that function, including the
//: `loadConversationList()` at its end that repaints the sidebar. Reported as
//: "I clicked on other chat conversations in the chat sidebar but the
//: conversations didnt visibly select in the sidebar": the click worked, the
//: fetch worked, and an unrelated null check three calls down stopped the row
//: from ever being marked. Nothing was logged where anyone would look.
//:
//: Normalised here, at the one place that reads it, rather than at each call
//: site: the next caller to pass `null` should not have to know either.
function highlightInto(element, text, terms) {
  element.replaceChildren();
  if (!terms || !terms.length) {
    element.textContent = text;
    return;
  }
  // One pass, longest terms first so "bread rolls" wins over "bread".
  const ordered = [...terms].sort((a, b) => b.length - a.length);
  const lower = text.toLowerCase();
  let cursor = 0;
  while (cursor < text.length) {
    let bestAt = -1;
    let bestTerm = "";
    for (const term of ordered) {
      const at = lower.indexOf(term, cursor);
      if (at !== -1 && (bestAt === -1 || at < bestAt)) {
        bestAt = at;
        bestTerm = term;
      }
    }
    if (bestAt === -1) {
      element.appendChild(document.createTextNode(text.slice(cursor)));
      return;
    }
    if (bestAt > cursor) {
      element.appendChild(document.createTextNode(text.slice(cursor, bestAt)));
    }
    const mark = document.createElement("mark");
    mark.textContent = text.slice(bestAt, bestAt + bestTerm.length);
    element.appendChild(mark);
    cursor = bestAt + bestTerm.length;
  }
}

// The words worth highlighting in a result, operators aren't text to find.
function searchHighlightTerms() {
  if (!noteSearch) return [];
  const query = parseNoteQuery(noteSearch);
  return [...query.phrases, ...query.words].filter((t) => t.length > 1);
}

// "Why this result", in words rather than a number, from the three scores the
// engine returns with every hit (`search/engine.py`). Asked for by Brief 11
// directly: the list says *matched the title*, *similar meaning*, *linked to
// the open note*, and the exact percentages sit in the tooltip for anyone who
// disagrees with the order. The chip recipe is the one the chat results
// already use (`.chip.result-reason-chip`), not a new look.
function whyThisResultChip(entry) {
  const hit = noteSearchWhy.get(entry.id);
  const words = hit?.explain?.join(" · ");
  if (!words) return null;
  const badge = chip(`ph:sparkle ${words}`, "result-reason-chip result-reason-why");
  const percent = (value) => Math.round((value || 0) * 100);
  badge.title =
    `Why this result: words ${percent(hit.scores?.bm25)}%, ` +
    `meaning ${percent(hit.scores?.cosine)}%, ` +
    `links ${percent(hit.scores?.graph)}%.`;
  return badge;
}

// One call per settled query, not per keystroke: the caller debounces, and a
// reply that arrives after the box has moved on is dropped rather than
// painting reasons for a query nobody is looking at any more.
async function refreshNoteSearchWhy() {
  const asked = noteSearch;
  if (!asked) {
    noteSearchWhy.clear();
    return;
  }
  // What the person is looking at, when that is unambiguous: one note opened
  // out in the list is the app's own "open note", and it is what makes the
  // third signal (distance over the links) mean anything. Two open rows, or
  // none, is not a context, and passing a guess would put "linked to the open
  // note" on a note linked to something nobody is reading.
  const open =
    editingId || (expandedRows.size === 1 ? [...expandedRows][0] : null);
  let body;
  try {
    // 50 is the endpoint's own ceiling (`routes_search.MAX_LIMIT`): a search
    // box shows a page, not a notebook, and a note past the fiftieth best
    // match simply carries no reason chip rather than a wrong one.
    body = await apiJson(
      `/search?q=${encodeURIComponent(asked)}&kind=note,board,map&limit=50` +
        (open ? `&entry_id=${open}` : "")
    );
  } catch {
    // The list is already rendered and already correct; the reasons are the
    // only thing missing, so a failed call leaves the notes alone.
    return;
  }
  if (noteSearch !== asked) return;
  noteSearchWhy.clear();
  for (const hit of body?.hits || []) noteSearchWhy.set(hit.id, hit);
  renderEntries();
}

// Sort comparator for the chosen mode (Wave J). Pinned always floats to
// the top first, matching the server's own ordering.
function sortEntries(entries) {
  const byPinned = (a, b) => Number(b.pinned) - Number(a.pinned);
  const modes = {
    newest: (a, b) => b.id - a.id,
    oldest: (a, b) => a.id - b.id,
    az: (a, b) => a.content.localeCompare(b.content),
    "most-used": (a, b) => b.access_count - a.access_count || b.id - a.id,
    //: The server's own fading order, by position rather than by a score
    //: recomputed here: `ai/resurface.py` weighs age, links and opens, and a
    //: second copy of those weights in the browser is the two-answers shape
    //: this app has paid for before. A note the ranking has not reached (it
    //: is capped, and a dismissed note is not in it) sorts after every note
    //: that is in it, rather than jumping to the top on a missing key.
    forgotten: (a, b) => {
      const far = forgottenOrder.size + 1;
      return (forgottenOrder.get(a.id) ?? far) - (forgottenOrder.get(b.id) ?? far) || b.id - a.id;
    },
  };
  const cmp = modes[noteSort] || modes.newest;
  return [...entries].sort((a, b) => byPinned(a, b) || cmp(a, b));
}

// --- incremental list rendering (ROADMAP §85.4 items 3 and 4) ---------------
//
// **The problem this solves, measured rather than assumed.** Four of this
// app's lists: the Notes list, the Library grid, the Timeline, the log
// console: built one DOM node per record for the *entire* collection, with
// no cap and no windowing. At 1,501 notes `renderEntries()` took ~533ms, and
// it re-runs on every search keystroke, sort change, filter and save.
//
// **Why chunk-on-scroll rather than true virtualisation.** Real
// virtualisation (absolute positioning against a scroll offset) needs to know
// each row's height before it renders one. Every list here has variable
// heights: a note card grows with its text, its tags, its attachments and
// whether its inline actions are open, so a virtualiser would either need
// measurement passes that cost what it saves, or fixed heights the design
// does not have. Rendering in chunks as the end of the list approaches keeps
// the DOM proportional to what has been *scrolled past* rather than to the
// notebook, needs no height information at all, and leaves the list one
// continuous scroll rather than turning it into pages, which is the
// distinction BACKLOG §77 draws and deliberately asks for.
//
// **The honest trade:** the browser's own Ctrl+F cannot find text in a chunk
// that has not rendered yet. That is a real loss, and it is why `initial` is
// generous rather than minimal, a screenful and change is always present , 
// and why it is applied to lists that have their own search box sitting
// directly above them. It is not applied anywhere that the browser's find is
// the only way through.
//
// `root: null` (the viewport) rather than the scroll container: an element
// inside the scrolled-away part of a *nested* scroller is not intersecting
// the viewport either, so one observer is correct for both a page-level and a
// container-level scroll, without having to find which one this list is in.
const listWindows = new WeakMap();

function renderIncrementally(container, items, buildItem, options = {}) {
  const { initial = 60, chunk = 40, afterChunk } = options;

  // Tear down the previous run first. Without this a re-render (a keystroke in
  // the search box) leaves the old observer alive, still holding the old
  // items, still appending them into a container that has moved on, the
  // "listener added without removal" shape, and the reason this is a
  // WeakMap rather than a local.
  listWindows.get(container)?.disconnect();
  listWindows.delete(container);

  const paint = (from, to) => {
    const fragment = document.createDocumentFragment();
    for (let i = from; i < to; i++) fragment.appendChild(buildItem(items[i], i));
    container.appendChild(fragment);
  };

  paint(0, Math.min(initial, items.length));
  afterChunk?.();
  if (items.length <= initial) return;

  let rendered = initial;
  // A zero-height marker after the last painted item. It is the *list's* own
  // last child rather than a sibling of the container, so it moves down as
  // chunks land and it inherits whatever scroller the list is in.
  const sentinel = document.createElement("li");
  sentinel.className = "list-window-sentinel";
  sentinel.setAttribute("aria-hidden", "true");
  container.appendChild(sentinel);

  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      const next = Math.min(rendered + chunk, items.length);
      // Insert *before* the sentinel so it stays last and keeps observing.
      const fragment = document.createDocumentFragment();
      for (let i = rendered; i < next; i++) fragment.appendChild(buildItem(items[i], i));
      container.insertBefore(fragment, sentinel);
      rendered = next;
      afterChunk?.();
      if (rendered >= items.length) {
        observer.disconnect();
        listWindows.delete(container);
        sentinel.remove();
      }
    },
    // Start the next chunk while the sentinel is still a screen away, so the
    // list refills before the user reaches the bottom rather than after.
    { root: null, rootMargin: "600px 0px" }
  );
  observer.observe(sentinel);
  listWindows.set(container, observer);
}

// BACKLOG §77 item 1, the user-facing page-size control, deliberately kept
// separate from §86's scroll-chunking (renderIncrementally above): that stays
// one continuous scroll under "All notes" (the default, and this function's
// no-op path). A numeric size instead slices whatever list renderEntries was
// about to paint down to one page and updates the Prev/Next bar.
//
// Threads are the one place this is a known, accepted simplification: a
// thread and its children can, at a page boundary, split across two pages
// (part 2 of §77, routing a wiki-link click to the *right* page, depends
// on sort/filter state and is scoped separately, not solved here).
function paginateNotesForDisplay(items) {
  const bar = $("notes-pagination");
  if (notesPageSize === "all") {
    bar.classList.add("hidden");
    return items;
  }
  const pageSize = Number(notesPageSize);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  notesCurrentPage = Math.min(Math.max(1, notesCurrentPage), totalPages);
  const start = (notesCurrentPage - 1) * pageSize;
  bar.classList.toggle("hidden", items.length === 0);
  $("notes-page-status").textContent = `Page ${notesCurrentPage} of ${totalPages}`;
  $("notes-page-prev").disabled = notesCurrentPage <= 1;
  $("notes-page-next").disabled = notesCurrentPage >= totalPages;
  return items.slice(start, start + pageSize);
}

// **The exact order the Notes list would paint, computed without painting
// it.** Split out of `renderEntries` (BACKLOG §77 item 2, routing a
// wiki-link click to the right *page*) so there is exactly one place that
// decides "what order do these notes render in", used both to actually
// render them and to answer "which page would note N land on" before a
// jump. Threads are the reason this can't be a plain sort-then-slice: a
// child's position depends on its parent's position, not on the child's own
// sort key, so `renderEntries`'s own thread-flattening (`ordered`,
// `addWithChildren`) is reproduced here rather than approximated.
//
// Reads the same module-level filter state `renderEntries` does
// (`draftsOnly`, `activeCategory`, `noteSearch`, `noteSort`), a caller that
// wants a *different* view's ordering (see `resolveNotePage` below) sets
// those first, the same way `flashEntry` already resets category/search/
// drafts before it ever draws anything.
function orderedNotesForCurrentView() {
  let visible = draftsOnly
    ? allEntries.filter((e) => e.is_draft)
    : favouritesOnly
      ? allEntries.filter((e) => e.pinned && !e.is_draft)
      : activeCategory
        ? allEntries.filter((e) => e.category === activeCategory && !e.is_draft)
        : allEntries.filter((e) => !e.is_draft);
  visible = visible.filter(matchesSearch);

  const flat = Boolean(noteSearch) || noteSort !== "newest";
  if (flat) return sortEntries(visible).map((entry) => [entry, 0]);

  const visibleIds = new Set(visible.map((e) => e.id));
  const childrenOf = new Map();
  for (const entry of visible) {
    if (entry.parent_id && visibleIds.has(entry.parent_id)) {
      if (!childrenOf.has(entry.parent_id)) childrenOf.set(entry.parent_id, []);
      childrenOf.get(entry.parent_id).push(entry);
    }
  }
  const ordered = [];
  const addWithChildren = (entry, depth) => {
    ordered.push([entry, depth]);
    const children = (childrenOf.get(entry.id) || []).slice().reverse();
    for (const child of children) addWithChildren(child, depth + 1);
  };
  for (const entry of visible) {
    const parentVisible = entry.parent_id && visibleIds.has(entry.parent_id);
    if (!parentVisible) addWithChildren(entry, 0);
  }
  return ordered;
}

// Which page (1-based) a note lands on in the Notes list's *current*
// filter/sort: the arithmetic half of BACKLOG §77 item 2. "All notes" (no
// pagination) always answers page 1, since there is only one. Returns null
// for a note the current filters would hide entirely (a category filter
// excluding it, say): a page number for a note that isn't in the list
// would be a lie, not an answer.
function resolveNotePage(id) {
  if (notesPageSize === "all") return 1;
  const order = orderedNotesForCurrentView();
  const index = order.findIndex(([entry]) => entry.id === id);
  if (index === -1) return null;
  return Math.floor(index / Number(notesPageSize)) + 1;
}

//: Rows or cards.
//:
//: **Cards is the default, by direct instruction**, "maybe make the cards
//: notes view default", after rows shipped as the default first. Rows
//: exist because a two-line note was a 111px card plus a 10px gap, so a
//: 900px window showed five notes; they fit twelve. But density is not the
//: only thing a list of notes is for, and a card shows the note rather than
//: a clipped line of it. Both are one click apart, and a row expands in
//: place (see `row-expanded` below), so the compact view is no longer a
//: view that *withholds* things.
//:
//: **The choice is remembered**, also asked for directly. localStorage
//: rather than a server preference: it is a property of this screen on this
//: machine, the same family as the expanded/collapsed sets above, and a
//: round trip to change how a list looks would be the wrong trade. Read as
//: "rows only if rows was explicitly chosen", so a profile that has never
//: touched the toggle gets cards.
let notesViewMode = localStorage.getItem("notesViewMode") === "rows" ? "rows" : "cards";

function applyNotesViewMode() {
  const list = $("entry-list");
  if (list) list.classList.toggle("is-rows", notesViewMode === "rows");
  $("notes-view-rows")?.classList.toggle("active", notesViewMode === "rows");
  $("notes-view-cards")?.classList.toggle("active", notesViewMode === "cards");
  $("notes-view-rows")?.setAttribute("aria-pressed", String(notesViewMode === "rows"));
  $("notes-view-cards")?.setAttribute("aria-pressed", String(notesViewMode === "cards"));
  updateExpandAllButton();
}

//: **Expand / collapse every row in the list you are looking at.** Asked for
//: directly ("on the collapsed note view mode there should be an expand
//: and/or collapse all button"). One button rather than two, because the
//: only two states it can be in each have exactly one useful next move.
//:
//: It reads the rendered `<li>`s rather than recomputing which notes are
//: visible. Filtering, sorting, threading and pagination all decide that
//: between them, and a second implementation of "which notes are on screen"
//: is a second thing to keep in step, the DOM already holds the answer.
function listedNoteIds() {
  return [...document.querySelectorAll("#entry-list > li[data-id]")].map((li) =>
    Number(li.dataset.id)
  );
}

function updateExpandAllButton() {
  const button = $("notes-expand-all");
  if (!button) return;
  // Cards view opens every note by definition, so the control would say
  // nothing there.
  button.classList.toggle("hidden", notesViewMode !== "rows");
  if (notesViewMode !== "rows") return;
  const ids = listedNoteIds();
  const anyCollapsed = ids.some((id) => !expandedRows.has(id));
  setLabel(
    button,
    anyCollapsed ? "ph:arrows-out-line-vertical Expand all" : "ph:arrows-in-line-vertical Collapse all"
  );
  button.title = anyCollapsed
    ? "Open every note in this list"
    : "Close every note back to a single line";
  button.setAttribute("aria-label", button.title);
  button.disabled = ids.length === 0;
}

function toggleExpandAllRows() {
  const ids = listedNoteIds();
  if (!ids.length) return;
  const anyCollapsed = ids.some((id) => !expandedRows.has(id));
  for (const id of ids) {
    if (anyCollapsed) expandedRows.add(id);
    else expandedRows.delete(id);
  }
  renderEntries();
}

function setNotesViewMode(mode) {
  notesViewMode = mode === "cards" ? "cards" : "rows";
  localStorage.setItem("notesViewMode", notesViewMode);
  applyNotesViewMode();
}

//: Which rows the reader has opened out. Asked for directly: "I think the
//: compact cards need to be expandable to show all the note details and
//: features."
//:
//: A row is a summary, it clips the body to one line and hides images, file
//: cards and link chips, which is what makes twelve of them fit. That is the
//: right default and the wrong dead end: wanting to *see* one of them should
//: not mean switching the whole list to cards and losing your place. An
//: expanded row drops back to the full card layout in place, so one note can
//: be open inside an otherwise compact list.
//:
//: Not persisted, deliberately. It is a reading position, not a preference, 
//: coming back to a list with six notes arbitrarily open would be worse than
//: coming back to a tidy one.
const expandedRows = new Set();

function toggleRowExpanded(id) {
  if (expandedRows.has(id)) expandedRows.delete(id);
  else expandedRows.add(id);
  renderEntries();
}

$("notes-expand-all")?.addEventListener("click", toggleExpandAllRows);
$("notes-view-rows")?.addEventListener("click", () => setNotesViewMode("rows"));
$("notes-view-cards")?.addEventListener("click", () => setNotesViewMode("cards"));

function noteCountExcludingDrafts() {
  let n = 0;
  for (const e of allEntries) if (!e.is_draft) n += 1;
  return n;
}

function libraryVisibleRows() {
  let visible = draftsOnly
    ? allEntries.filter((e) => e.is_draft)
    : favouritesOnly
      ? allEntries.filter((e) => e.pinned && !e.is_draft)
      : activeCategory
        ? allEntries.filter((e) => e.category === activeCategory && !e.is_draft)
        : allEntries.filter((e) => !e.is_draft);
  return visible.filter(matchesSearch);
}

function renderEntries() {
  closeNotePageIfGone();
  // A cleared box clears its reasons here rather than at each of the five
  // places that can clear the box: a reason for a query nobody typed is
  // worse than no reason at all.
  if (!noteSearch && noteSearchWhy.size) noteSearchWhy.clear();
  const list = $("entry-list");
  const empty = $("empty-message");
  const noMatch = $("no-match-message");
  list.replaceChildren();
  // Re-applied on every render, not just on a click: `replaceChildren`
  // above leaves the class alone, but a later render that rebuilt the <ul>
  // itself would not: and this failing silently would look like the
  // toggle not working rather than a class being dropped.
  applyNotesViewMode();

  // Drafts stay out of All/category views entirely, user-reported: they
  // should only show up in the Drafts filter until saved as a real note.
  const visible = libraryVisibleRows();

  // "Notes" everywhere else on this tab ("Your notes", "notebook", the
  // status-bar note count): this heading used to say "entries" (the API's
  // internal name, /entries), the one place on the tab that didn't match
  // (Part C terminology audit).
  const scope = draftsOnly
    ? "Drafts"
    : favouritesOnly
      ? "Favourites"
      : activeCategory
        ? `${activeCategory} notes`
        : "All notes";
  // Say how many matched out of how many there are. Without it a filter that
  // hides most of the notebook looks identical to a notebook that's nearly
  // empty, and there's no signal that a filter is even active.
  const total = draftsOnly
    ? allEntries.filter((e) => e.is_draft).length
    : favouritesOnly
      ? allEntries.filter((e) => e.pinned && !e.is_draft).length
      : activeCategory
        ? allEntries.filter((e) => e.category === activeCategory && !e.is_draft).length
        : allEntries.filter((e) => !e.is_draft).length;
  $("entries-heading-label").textContent =
    noteSearch && visible.length !== total
      ? `${scope}: ${visible.length} of ${total}`
      : scope;
  // Distinguish "empty notebook" from "filter matched nothing".
  const notebookEmpty = allEntries.length === 0;
  empty.classList.toggle("hidden", !notebookEmpty);
  noMatch.classList.toggle("hidden", notebookEmpty || visible.length > 0);

  // A search or a non-default sort means the user wants a flat, ordered
  // list: thread nesting only applies to the default newest view.
  const flat = Boolean(noteSearch) || noteSort !== "newest";
  if (flat) {
    renderIncrementally(
      list,
      paginateNotesForDisplay(sortEntries(visible)),
      (entry) => entryItem(entry, { actions: true }),
      {
        afterChunk: () => {
          applyEntryListTabOrder(list);
          ensureCardCounts(list, _entriesLoadGeneration);
        },
      }
    );
    return;
  }

  // Threads (Wave B): children render indented under their parent. A
  // child whose parent isn't visible (filtered out) shows at top level.
  const visibleIds = new Set(visible.map((e) => e.id));
  const childrenOf = new Map();
  for (const entry of visible) {
    if (entry.parent_id && visibleIds.has(entry.parent_id)) {
      if (!childrenOf.has(entry.parent_id)) childrenOf.set(entry.parent_id, []);
      childrenOf.get(entry.parent_id).push(entry);
    }
  }

  // Flattened to `[entry, depth]` pairs *before* rendering, rather than
  // recursing straight into the DOM. A thread has to stay whole, a parent and
  // its continuations are one unit and must never be split across a chunk
  // boundary: so the recursion produces the order and the depth, and the
  // renderer below decides how much of that order to paint. Threads are the
  // reason this list cannot simply be sliced: position in `visible` is not
  // position on screen.
  const ordered = [];
  const addWithChildren = (entry, depth) => {
    ordered.push([entry, depth]);
    // Oldest continuation first: a thread reads top to bottom.
    const children = (childrenOf.get(entry.id) || []).slice().reverse();
    for (const child of children) addWithChildren(child, depth + 1);
  };

  for (const entry of visible) {
    const parentVisible = entry.parent_id && visibleIds.has(entry.parent_id);
    if (!parentVisible) addWithChildren(entry, 0);
  }

  renderIncrementally(
    list,
    paginateNotesForDisplay(ordered),
    ([entry, depth]) => {
      const li = entryItem(entry, { actions: true });
      if (depth > 0) {
        li.classList.add("thread-child");
        li.style.marginLeft = `${Math.min(depth, 4) * 1.4}rem`;
      }
      return li;
    },
    {
      afterChunk: () => {
        applyEntryListTabOrder(list);
        ensureCardCounts(list, _entriesLoadGeneration);
        // After the list is in the DOM: drop the clamp from any note that
        // turned out to fit. No-op while the sub-tab is hidden;
        // showNotesSection re-runs it.
        settleNoteClamps();
        // Expand-all reads the rendered rows, and `applyNotesViewMode` runs
        // at the *top* of this function, right after `replaceChildren()`,
        // when the list is empty and the button would read "Expand all
        // (disabled)" forever. Refreshed here, once the rows exist.
        updateExpandAllButton();
      },
    }
  );
}

// --- note-list keyboard navigation (ROADMAP Tier 3 §30a / BACKLOG §16) ------------
// Named directly as "the one interaction pattern used constantly enough that
// its absence would be felt every session, not just noticed in an audit."
// A roving tabindex: only one <li> is ever a Tab stop, so the list is one
// stop in the page's tab order rather than one per note, matching the
// standard listbox/grid keyboard pattern.
// `li[data-id]`, not `list.children`: the incremental renderer parks a
// zero-height sentinel `<li>` at the end of the list to know when to paint the
// next chunk, and it is not a note. Left in `children` it would join the
// roving tabindex and the arrow-key walk below, so ArrowDown at the bottom of
// the list would focus an invisible element and appear to do nothing.
const entryListItems = (list) => Array.from(list.querySelectorAll(":scope > li[data-id]"));

function applyEntryListTabOrder(list) {
  const items = entryListItems(list);
  const current = document.activeElement;
  // Re-renders happen constantly (search-as-you-type, sort, edits): if the
  // previously-focused note is still present, keep it as the one Tab stop
  // instead of silently resetting focus back to the top of the list.
  const keepId = items.some((li) => li === current) ? current.dataset.id : null;
  items.forEach((li) => {
    li.tabIndex = keepId ? (li.dataset.id === keepId ? 0 : -1) : -1;
  });
  if (!keepId && items.length > 0) items[0].tabIndex = 0;
}

function initEntryListKeyboardNav() {
  const list = $("entry-list");
  list.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp" && event.key !== "Enter") return;
    //: A note's own ⋯ menu lives inside its row, so its arrow keys bubble
    //: here too: ArrowDown in the menu moved to the next item and then this
    //: moved the focus out of the menu onto the row (measured, menus.js).
    if (event.target.closest('.action-menu, [role="menu"], [role="listbox"]')) return;
    const items = entryListItems(list);
    const current = event.target.closest("li");
    const index = current ? items.indexOf(current) : -1;
    if (index === -1) return;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const nextIndex = Math.min(
        Math.max(index + (event.key === "ArrowDown" ? 1 : -1), 0),
        items.length - 1
      );
      items.forEach((li, i) => { li.tabIndex = i === nextIndex ? 0 : -1; });
      items[nextIndex].focus();
      // .focus() alone scrolls in most browsers, but not predictably, 
      // explicit and consistent with the same fix on the command palette's
      // own arrow-key nav, which has no focus to lean on at all.
      items[nextIndex].scrollIntoView({ block: "nearest" });
    } else if (event.key === "Enter" && event.target === current) {
      // Only when the <li> itself has focus, not a button/link/textarea
      // inside it: those already handle their own Enter behaviour, and
      // this app has no separate "note view" to open: editing in place is
      // what opening a note means here.
      event.preventDefault();
      current.querySelector(".entry-actions [title='Edit this entry']")?.click();
    }
  });
}

// name -> {id, count}. Needed because renaming and deleting work on ids,
// while the sidebar itself is built from the entries already in memory.
let categoryMeta = new Map();

async function loadCategories() {
  const rows = await apiJson("/categories", { silent: true }).catch(() => []);
  categoryMeta = new Map(rows.map((c) => [c.name, c]));
  renderSidebar();
}

function renderSidebar() {
  // Categories + counts are derived from the loaded entries, the
  // simplest thing that works; no extra endpoint needed yet.
  // Drafts only belong in the Drafts row (user-reported: they were still
  // showing under All/category counts, undercutting the point of a
  // separate section): until saved as a real note, a draft doesn't count.
  const counts = new Map();
  for (const entry of allEntries) {
    if (entry.is_draft) continue;
    counts.set(entry.category, (counts.get(entry.category) || 0) + 1);
  }

  const ul = $("category-list");
  ul.replaceChildren();

  const addRow = (label, count, category) => {
    const li = document.createElement("li");
    if (category === activeCategory) li.classList.add("active");
    const name = document.createElement("span");
    name.className = "category-name";
    name.textContent = label;
    name.title = label;
    const badge = document.createElement("span");
    badge.className = "count";
    badge.textContent = count;
    li.append(name, badge);
    li.addEventListener("click", () => {
      activeCategory = category;
      draftsOnly = false; // exclusive with the Drafts filter below
      favouritesOnly = false; // and with Favourites, for the same reason
      // The list this filters lives in the "browse" sub-tab, and the sidebar
      // is visible from all four, so picking a category while writing a note
      // or asking a question filtered a list that was `display: none`, and the
      // click appeared to do nothing at all. Reported. The same fix
      // `flashEntry` already carries for jumping to a note, for the same
      // reason: a sidebar that is always on screen must be able to bring the
      // thing it controls on screen with it.
      showNotesSection("browse");
      renderSidebar();
      renderEntries();
    });

    // Rename/delete for real categories only, "All" is a filter, and
    // Uncategorised is where notes land when a category goes away.
    const meta = category ? categoryMeta.get(category) : null;
    if (meta && category !== "Uncategorised") {
      const actions = document.createElement("span");
      actions.className = "category-actions";
      actions.append(
        smallButton("ph:pencil-simple", `Rename ${category}`, (event) => {
          event.stopPropagation();
          renameCategory(meta, category);
        }),
        smallButton("ph:trash", `Delete ${category}`, (event) => {
          event.stopPropagation();
          deleteCategory(meta, category, count);
        })
      );
      li.appendChild(actions);
    }
    ul.appendChild(li);
  };

  addRow("All", allEntries.filter((e) => !e.is_draft).length, null);

  // A drafts count, not a category, asked for directly: a Drafts filter
  // findable in the same place categories are, so a note drafted with the
  // AI (Writing Room) or captured from a selection isn't only markable one
  // at a time via its own chip (entryItem). Always shown, even at 0, so it
  // stays discoverable rather than appearing only once something lands in it.
  const draftCount = allEntries.filter((e) => e.is_draft).length;
  const draftRow = document.createElement("li");
  draftRow.className = "category-drafts-row";
  if (draftsOnly) draftRow.classList.add("active");
  const draftName = document.createElement("span");
  draftName.className = "category-name";
  setLabel(draftName, "ph:pencil-simple-line Drafts");
  const draftBadge = document.createElement("span");
  draftBadge.className = "count";
  draftBadge.textContent = draftCount;
  draftRow.append(draftName, draftBadge);
  draftRow.addEventListener("click", () => {
    draftsOnly = !draftsOnly;
    favouritesOnly = false;
    activeCategory = null;
    showNotesSection("browse");
    renderSidebar();
    renderEntries();
  });

  // **Favourites.** Asked for as "a favourites folder or side parallel category
  // that isnt an actual category but could be treated as one if toggled", so
  // it is built exactly like Drafts directly above: a row where the categories
  // are, a count, a toggle, and mutually exclusive with the other two filters.
  // This app already has one pseudo-category, and a second that behaved
  // differently would be a second sign for the same idea.
  //
  // The notes it collects are the pinned ones (see `favouritesOnly`), no new
  // flag, no second place to star something.
  const favouriteCount = allEntries.filter((e) => e.pinned && !e.is_draft).length;
  const favouriteRow = document.createElement("li");
  favouriteRow.className = "category-drafts-row";
  if (favouritesOnly) favouriteRow.classList.add("active");
  const favouriteName = document.createElement("span");
  favouriteName.className = "category-name";
  setLabel(favouriteName, "ph:star Favourites");
  const favouriteBadge = document.createElement("span");
  favouriteBadge.className = "count";
  favouriteBadge.textContent = favouriteCount;
  favouriteRow.append(favouriteName, favouriteBadge);
  favouriteRow.title = "Notes you have starred, they also float to the top of every list";
  favouriteRow.addEventListener("click", () => {
    favouritesOnly = !favouritesOnly;
    draftsOnly = false;
    activeCategory = null;
    showNotesSection("browse");
    renderSidebar();
    renderEntries();
  });
  ul.appendChild(draftRow);
  ul.appendChild(favouriteRow);

  for (const [category, count] of [...counts.entries()].sort()) {
    addRow(category, count, category);
  }
}

async function renameCategory(meta, currentName) {
  const name = await promptDialog(`Rename "${currentName}" to:`, currentName);
  if (!name || name === currentName) return;

  // Renaming onto a category that already exists merges them, which is
  // usually the point: but it's destructive-looking, so it's confirmed.
  if (categoryMeta.has(name)) {
    const target = categoryMeta.get(name);
    const ok = (await confirmDialog(
      `"${name}" already exists. Merge "${currentName}" into it?\n\n` +
        `Its notes move across, nothing is deleted. "${name}" would then ` +
        `hold ${target.count + meta.count} notes.`
    ));
    if (!ok) return;
  }

  try {
    const result = await apiJson(`/categories/${meta.id}`, {
      method: "PUT",
      body: JSON.stringify({ name }),
    });
    if (activeCategory === currentName) activeCategory = name;
    toast(result.merged ? `Merged into "${name}".` : `Renamed to "${name}".`);
    await loadEntries();
    await loadCategories();
  } catch (error) {
    toast(error.message, true);
  }
}

async function deleteCategory(meta, name, count) {
  const ok = (await confirmDialog(
    `Delete the category "${name}"?\n\n` +
      (count
        ? `Its ${count} note${count === 1 ? "" : "s"} are kept and become ` +
          `Uncategorised: deleting a category never deletes notes.`
        : "It has no notes in it.")
  ));
  if (!ok) return;
  try {
    await apiJson(`/categories/${meta.id}`, { method: "DELETE" });
    if (activeCategory === name) activeCategory = null;
    toast(`Deleted "${name}". Its notes are in Uncategorised.`);
    await loadEntries();
    await loadCategories();
  } catch (error) {
    toast(error.message, true);
  }
}

// Loading skeletons (Wave I): shimmer placeholders instead of a blank
// list on the very first load, so a slow disk never looks broken.
function showEntrySkeletons() {
  const list = $("entry-list");
  if (list.children.length > 0) return; // only ever on a truly empty list
  for (let i = 0; i < 3; i++) {
    const li = document.createElement("li");
    li.className = "skeleton";
    li.setAttribute("aria-hidden", "true");
    list.appendChild(li);
  }
}

//: The same placeholders for any list that fetches before it can draw
//: (INBOX 399 (4)): the Library's grid and the Timeline's feed showed a blank
//: card until their first response, which on a slow disk reads as an empty
//: notebook. Only into a list with nothing in it, so a refresh never covers
//: what is already there; the list's own render replaces them, and
//: `clearSkeletons` takes them out on a path that draws nothing (a failed
//: request). `aria-busy` tells a screen reader the list is on its way.
function showSkeletons(container, count = 3, tag = "div") {
  if (!container || container.children.length > 0) return;
  container.setAttribute("aria-busy", "true");
  for (let i = 0; i < count; i++) {
    const el = document.createElement(tag);
    el.className = "skeleton";
    el.setAttribute("aria-hidden", "true");
    container.appendChild(el);
  }
}

function clearSkeletons(container) {
  if (!container) return;
  container.removeAttribute("aria-busy");
  for (const el of container.querySelectorAll(":scope > .skeleton")) el.remove();
}

// A page of the plain list. Smaller than the backend's own default
// (`ENTRIES_PAGE_SIZE = 1000` in routes_entries.py, still the cap a caller
// gets by asking for nothing) on purpose, WORLD_CLASS_PLAN A2: the boot
// request for the whole notebook was the slowest fetch a cold start made, 258
// ms measured, and everything it carried past the first screenful was paid for
// before anything drew. The loop below renders each page as it lands, so this
// is the size of the first paint, not of the list: a notebook larger than this
// still ends up exactly as complete, one page later.
const ENTRIES_PAGE_SIZE = 200;

//: How long the list may go without showing a newly arrived page while the
//: background paging runs. Short enough that a big notebook still visibly
//: fills in, long enough that twenty-one pages are a handful of repaints
//: rather than twenty-one.
const ENTRIES_PROGRESS_MS = 250;
let _entriesProgressTimer = null;

function paintEntriesProgress() {
  clearTimeout(_entriesProgressTimer);
  _entriesProgressTimer = null;
  renderStatusBar(); // the notebook's size changed, and the bar reads it here
  renderEntries();
}

function scheduleEntriesProgress() {
  if (_entriesProgressTimer !== null) return;
  _entriesProgressTimer = setTimeout(paintEntriesProgress, ENTRIES_PROGRESS_MS);
}

async function loadEntries() {
  //: Wrapped, because every path below this either paints the notebook or
  //: throws, and a throw used to leave the skeletons and then the empty state
  //: on screen: "Your notebook is empty" is a claim about the person's own
  //: notes that a failed GET is no basis for. See `surfaceFailed`.
  return loadSurface($("empty-message"), "notes", _loadEntries);
}

async function _loadEntries() {
  const generation = ++_entriesLoadGeneration;
  referenceCountsCache.clear();
  reminderCountsCache.clear();
  showEntrySkeletons();

  const isSemantic = $("semantic-search-toggle")?.checked;
  if (isSemantic && noteSearch) {
    // Semantic search is already bounded server-side (SEMANTIC_LIST_LIMIT)
    //, nothing here needs paging.
    const results = await apiJson(
      `/entries?q=${encodeURIComponent(noteSearch)}&semantic=true`
    );
    if (generation !== _entriesLoadGeneration) return; // a newer load took over
    allEntries = results;
    entriesEverLoaded = true;
    renderStatusBar();
    renderSidebar();
    loadCategories();
    renderEntries();
    ensureMapChipsFor(results, generation);
    fillCategoryOptions($("entry-category"), null);
    refreshTagSuggestions();
    return;
  }

  // Paginated: GET /entries used to return the whole notebook in one
  // response, which is fine at a few hundred notes and a real risk of
  // timing out (or just feeling broken) at the size a "just works" notebook
  // reaches after years of use. The first page paints immediately, for
  // most notebooks that's everything, indistinguishable from before, and
  // any further pages fill in the background, so nothing downstream of
  // allEntries (search, keyboard nav, the sidebar, tag suggestions) had to
  // change: it still ends up exactly as complete as it always was.
  let offset = 0;
  let total = Infinity; // discovered from the first response's X-Total-Count
  //: Any repaint this load still owes. Cleared by `paintEntriesProgress`, so
  //: the immediate paint on the last page cannot be followed by a stale
  //: throttled one a moment later.
  clearTimeout(_entriesProgressTimer);
  _entriesProgressTimer = null;
  let first = true;
  while (offset < total) {
    const response = await api(`/entries?limit=${ENTRIES_PAGE_SIZE}&offset=${offset}`);
    const page = await response.json();
    if (generation !== _entriesLoadGeneration) return; // superseded mid-load

    allEntries = first ? page : allEntries.concat(page);
    entriesEverLoaded = true;
    offset += page.length;
    const reported = Number(response.headers.get("X-Total-Count"));
    total = Number.isFinite(reported) ? reported : allEntries.length;

    ensureMapChipsFor(page, generation);
    //: **Twenty-one pages used to mean twenty-one full re-renders.**
    //: `renderEntries()` costs 79 ms on a four thousand note list (measured
    //: at 1440x900), and the loop called it for every page, so a notebook
    //: that pages twenty-one times spent about 1.7 s of main thread redrawing
    //: a list that nobody had asked to change. The first page is what the
    //: reader is actually looking at; the pages after it are background.
    //:
    //: So the first page and the last one paint at once, the ones in between
    //: are throttled. The list still visibly grows, which is the point of
    //: painting during the load at all, it just grows in steps of a quarter
    //: second rather than in twenty-one full repaints.
    const lastPage = offset >= total || page.length === 0;
    if (first || lastPage) paintEntriesProgress();
    else scheduleEntriesProgress();
    if (first || offset >= total) {
      renderSidebar();
      // Categories the AI has filed notes into since the last load need
      // their ids fetched before rename/delete can work on them.
      // Deliberately not awaited: the list renders now and the controls
      // light up a moment later.
      loadCategories();
      fillCategoryOptions($("entry-category"), null);
      refreshTagSuggestions();
    }
    first = false;
    if (page.length === 0) break; // safety: never loop forever on a stale total
  }
  nudgeUntaggedNotes();
}

//: **What the note list needs to draw a `[[map]]` as a map chip**, fetched
//: once and only for a notebook that has one.
//:
//: `renderNoteInline` is synchronous and runs once per wiki link, so it cannot
//: fetch; the index has to be in memory before the render. It used to be
//: filled unconditionally at the top of `loadEntries`, which meant
//: `GET /whiteboard/boards?limit=200` on every cold start, 204 ms measured,
//: for a notebook that may contain no `[[` at all (WORLD_CLASS_PLAN A2). Now
//: the page that has just arrived is asked first, so a notebook with no wiki
//: links never asks for boards and one that has them asks once.
//:
//: The re-render is the half the old placement never had: fired and not
//: awaited, the index always landed *after* the render it was for, and the
//: chips stayed plain text until something else redrew the list. Guarded on
//: the load generation, because a newer `loadEntries` may have taken over
//: while this was in flight and its list is the one on screen.
//: **"In 2 documents · on 1 board · linked by 3 notes", on the card.**
//: INBOX 246's third gap: a card showed nothing until Connections was opened,
//: so a note on two boards and in three documents looked exactly like a
//: note nothing had ever touched. One muted chip on the card, opening
//: Connections, from one batched call per page (`/entries/reference-counts
//: ?ids=`): fifty cards asking `/references` each would be fifty scans per
//: render. Cleared with every reload (`_loadEntries`), which is also what
//: both attach panels call after a write, so a fresh attachment shows on
//: the next paint without a second cache to keep honest.
const referenceCountsCache = new Map();
const _referenceCountsInFlight = new Set();
const REFERENCE_COUNTS_BATCH = 60; // `REFERENCE_COUNT_IDS_MAX` in routes_entries.py
const REFERENCE_COUNT_PHRASES = [
  ["document", "in", "document", "documents"],
  ["board", "on", "board", "boards"],
  ["map", "on", "map", "maps"],
  ["note", "linked by", "note", "notes"],
];

function referenceCountText(counts) {
  const parts = [];
  for (const [kind, verb, one, many] of REFERENCE_COUNT_PHRASES) {
    const n = counts[kind] || 0;
    if (n) parts.push(`${verb} ${n} ${n === 1 ? one : many}`);
  }
  if (!parts.length) return "";
  // Read out loud as one line, sentence case on the first word only.
  const line = parts.join(" · ");
  return line[0].toUpperCase() + line.slice(1);
}

function referenceCountChip(entry, options = {}) {
  //: `facts` as well as `actions` (INBOX 297): what a note is joined to is
  //: true of the note wherever it is drawn, and this chip is DESIGN.md's
  //: "a fact on a facts line that is also the way in" rather than an action.
  if ((!options.actions && !options.facts) || entry.is_board || entry.is_draft) return null;
  const counts = referenceCountsCache.get(entry.id);
  if (!counts || !counts.total) return null;
  const refChip = chip(`ph:graph ${referenceCountText(counts)}`, "refs", (event) => {
    event.stopPropagation();
    openConnections(
      "entries",
      entry.id,
      entry.title || clipText(notePreviewText(entry.content).split("\n")[0], 80)
    );
  });
  refChip.title = "Everything this note is joined to. Open Connections";
  return refChip;
}

//: Called from the list's `afterChunk`, so it sees exactly the cards that
//: are in the DOM and asks for the ones the cache has not met. Cards are
//: patched in place rather than re-rendered: a re-render mid-chunking would
//: restart the incremental renderer that called this.
//: **What this note made you promise to do** (INBOX 309, the owner: "or to
//: link reminders to notes").
//:
//: The link itself was never missing: `Reminder.entry_id` has existed since
//: reminders did, the note card's own "Remind me" passes it, and the
//: `set_reminder` tool takes a `note_id`. One end of it was drawn and the
//: other was not: a reminder says which note it came from, and a note that
//: caused three reminders looked exactly like a note that caused none. So
//: this is the same answer INBOX 246 gave for boards and documents: one
//: muted chip on the card, from one batched count per page.
//:
//: **A chip on the facts line, not a section under the note.** The card is
//: already a title, a body and one line of facts about it, and a second
//: block under every note with a reminder would push the next note off the
//: screen for a fact that is usually one word long. It presses open the same
//: `.entry-links` row "Referenced by" and "Similar notes" use, which is also
//: what keeps it to one open panel per card.
const reminderCountsCache = new Map();
const _reminderCountsInFlight = new Set();

function reminderCountChip(entry, options = {}) {
  if ((!options.actions && !options.facts) || entry.is_board || entry.is_draft) return null;
  const count = reminderCountsCache.get(entry.id) || 0;
  if (!count) return null;
  const alarm = chip(`ph:alarm ${count} reminder${count === 1 ? "" : "s"}`, "reminders", (event) => {
    event.stopPropagation();
    toggleNoteReminders(entry);
  });
  alarm.title = "What this note made you promise to do. Press to see them";
  return alarm;
}

//: **The two count strips a card carries, as data.**
//:
//: They are the same mechanism twice over: read the ids on screen, ask once
//: for all of them, patch the chip onto the cards that are still there. The
//: reference counts had it first and the reminders would have been a second
//: copy of it, which is how the two would come to disagree about batching,
//: about a note deleted mid-flight, or about which generation of the list
//: they belong to. One walker, one table of what differs.
const CARD_COUNT_SOURCES = [
  {
    cache: referenceCountsCache,
    inFlight: _referenceCountsInFlight,
    path: (ids) => `/entries/reference-counts?ids=${ids}`,
    marker: ".chip.refs",
    //: A note the server did not answer for (deleted under us) is recorded
    //: as empty, not left unknown, or it would be asked for again on every
    //: chunk.
    empty: { total: 0 },
    chip: (entry) => referenceCountChip(entry, { actions: true }),
  },
  {
    cache: reminderCountsCache,
    inFlight: _reminderCountsInFlight,
    path: (ids) => `/reminders/counts?ids=${ids}`,
    marker: ".chip.reminders",
    empty: 0,
    chip: (entry) => reminderCountChip(entry, { actions: true }),
  },
];

function ensureCardCounts(list, generation) {
  for (const source of CARD_COUNT_SOURCES) ensureOneCardCount(list, generation, source);
}

function ensureOneCardCount(list, generation, source) {
  const wanted = [];
  for (const li of list.querySelectorAll("li[data-id]")) {
    const id = Number(li.dataset.id);
    if (!id || source.cache.has(id) || source.inFlight.has(id)) continue;
    wanted.push(id);
    if (wanted.length >= REFERENCE_COUNTS_BATCH) break;
  }
  if (!wanted.length) return;
  for (const id of wanted) source.inFlight.add(id);
  apiJson(source.path(wanted.join(",")), { silent: true })
    .then((answer) => {
      if (generation !== _entriesLoadGeneration) return;
      const counts = (answer && answer.counts) || {};
      for (const id of wanted) {
        const given = counts[String(id)];
        source.cache.set(id, given === undefined || given === null ? source.empty : given);
      }
      for (const id of wanted) {
        const li = list.querySelector(`li[data-id="${id}"]`);
        const meta = li && li.querySelector(":scope > .entry-meta");
        if (!meta || meta.querySelector(source.marker)) continue;
        const entry = allEntries.find((e) => e.id === id);
        const built = entry && source.chip(entry);
        if (built) meta.insertBefore(built, meta.querySelector(".entry-meta-end"));
      }
      // The page may hold more than one batch; the next call finds the rest.
      if (list.querySelectorAll("li[data-id]").length > wanted.length) {
        ensureOneCardCount(list, generation, source);
      }
    })
    .catch(() => {})
    .finally(() => {
      for (const id of wanted) source.inFlight.delete(id);
    });
}

function ensureMapChipsFor(page, generation) {
  if (mapBoardIndexCache) return; // one index per session, as it always was
  if (!page.some((entry) => String(entry.content || "").includes("[["))) return;
  loadMapBoardIndex()
    .then(() => {
      if (generation === _entriesLoadGeneration) renderEntries();
    })
    .catch(() => {});
}

//: **The app notices what the person has not got round to** (INBOX 162).
//: Once the notebook is loaded, a bell entry counts the real notes with no
//: tag and offers the filtered list. Keyed by the ISO week, so it is said
//: once a week at most however often the list reloads, and only past a
//: handful: three untagged notes is a Tuesday, not a backlog.
const UNTAGGED_NUDGE_MIN = 5;

function nudgeUntaggedNotes() {
  const untagged = allEntries.filter((e) => !e.is_board && !e.is_draft && !(e.tags || []).length);
  if (untagged.length < UNTAGGED_NUDGE_MIN) return;
  const now = new Date();
  const week = Math.floor((now - new Date(now.getFullYear(), 0, 1)) / (7 * 86400000));
  recordNotification({
    kind: "assist",
    title: `${untagged.length} notes have no tags`,
    detail: "Tags are how notes find each other. Open the list and add a few.",
    key: `untagged:${now.getFullYear()}-${week}`,
    action: { tab: "notes", filter: "is:untagged" },
  });
}

// --- capture -----------------------------------------------------------------

// Human explanations of how a note was filed ("visuals of what happened").
// A "go to it" link beside the save confirmation. Replaced each save, and
// cleared as soon as you start typing the next note.
function offerJumpToNewNote(saved, status) {
  if (!saved || !saved.id) return;
  const jump = document.createElement("button");
  jump.type = "button";
  jump.className = "ghost small jump-to-note";
  setLabel(jump, "ph:arrow-right Go to it");
  jump.title = "Open this note in your list";
  jump.addEventListener("click", () => flashEntry(saved.id));
  status.append(" ", jump);
}

// A deferred note's filing runs after its POST returns, so the composer has
// to find out where it landed some other way. It polls this one endpoint, 
// three fields, no joins, on a widening interval, because the answer
// arrives either in well under a second (a semantic match, no model call)
// or in however long the local model takes, and a fixed 250ms poll would
// spend most of its requests on the gap between those two.
//
// Giving up is deliberately quiet. The note is already saved and already in
// the list; the only thing a timeout costs is the toast, and a notebook
// whose model has gone away should not accumulate error messages for notes
// that saved perfectly well.
const FILING_POLL_STEPS = [400, 600, 900, 1400, 2000, 3000, 4000, 6000, 8000];

async function watchFiling(entry) {
  for (const wait of FILING_POLL_STEPS) {
    await new Promise((r) => setTimeout(r, wait));
    let status;
    try {
      status = await apiJson(`/entries/${entry.id}/filing`, { silent: true });
    } catch {
      return; // deleted, or the server went away, nothing to report
    }
    if (status.filing_state === "pending") continue;
    if (status.filing_state === "failed") {
      toast(`Saved, but Atlas couldn't file it: it's in “${status.category}”.`, true);
    } else {
      toastAction(
        `Filed under “${status.category}” (${status.ai_confidence}% sure).`,
        "Go to it",
        () => flashEntry(entry.id)
      );
      // The near-duplicate search moved into the same background pass, so
      // this warning arrives here now rather than on the create response.
      // Still purely informational, still never blocking, the note saved.
      if (status.similar) {
        toast(`Heads up: this is close to an existing note, “${status.similar.preview}”`);
      }
    }
    // The card in the list still says "Filing…" and still shows the holding
    // category until something re-reads it.
    await loadEntries();
    return;
  }
}

function filedByText(saved) {
  if (saved.filing_state === "pending") {
    return "Saved. Filing it in the background, keep writing.";
  }
  switch (saved.filed_by) {
    case "semantic-match":
      return `Filed under “${saved.category}” (${saved.ai_confidence}% sure): matched by meaning, no AI call needed`;
    case "llm":
      //: **"Atlas, running qwen2.5:7b"**, the form the owner's own decision
      //: names (INBOX 225): the librarian's name is what the app calls
      //: itself, and the model's name stays beside it, because "which model
      //: decided this" is the question this line exists to answer and a
      //: persona name alone would stop answering it.
      return `Filed under “${saved.category}” (${saved.ai_confidence}% sure): decided by ${aiNameNow()}${
        modelStatus && modelStatus.chat_model ? `, running ${modelStatus.chat_model}` : ""
      }`;
    case "user":
      return `Filed under “${saved.category}”: your choice, ${aiNameNow()} stayed out of it`;
    default:
      return `Saved as “${saved.category}”: ${aiNameNow()} wasn't available to file it`;
  }
}

// --- notes ↔ documents ------------------------------------------------------
// Asked for directly: "a way to link documents to new notes I create in the
// capture tab… the documents and notes sections need to be more integrated".
// The picker adds; the chips are how you take one back off before saving.

const captureDocuments = new Set();

//: Files waiting to become attachments on a note that does not exist yet.
//: The long "why staging" explanation lives on `handleFileUpload`, which is
//: the only thing that fills this.
//:
//: **Declared here, ~19,000 lines before its first write, and that is the
//: fix for a real crash.** It was originally declared next to
//: `handleFileUpload`, near the end of the file, but `renderCaptureFiles`
//: reads it, and the draft-restore IIFE calls that at module load time, from
//: *earlier* in the file. `let` is hoisted into the temporal dead zone
//: rather than initialised, so that read threw `Cannot access
//: 'captureStagedFiles' before initialization`, which aborted the rest of
//: app.js: `initAuth` never ran, the splash never hid, and the app sat on
//: its loading screen forever. Reported exactly that way, and caught by the
//: boot guard added the same session, which is the only reason the cause was
//: visible at all rather than being a silent hang.
//:
//: `node --check` does not catch this: it is valid syntax and a runtime
//: ordering fault. The lesson for anything similar: module-level state read
//: during load must be declared above every path that runs at load.
let captureStagedFiles = [];

async function loadCaptureDocuments() {
  //: To the end, not the first page: the picker exists to file this note
  //: under *any* document, and a document past the server's page would be
  //: invisible with nothing on screen saying so (`archive/agent-remaining/
  //: list-paging.md`). `apiPagedList` is one request at any realistic size.
  const documents = await apiPagedList("/documents", 200).catch(() => []);
  renderCaptureDocuments(documents);
}

// The picker's value for "one that doesn't exist yet". A string, so it can
// never collide with a document id.
const NEW_DOCUMENT = "new";

// Ask for a title and start an empty document. Shared by the capture box and
// the note card's "Add to a document", so both offer the same thing.
async function createDocumentNamed(suggestion = "") {
  const title = await promptDialog("Title for the new document:", suggestion, { confirmLabel: "Create" });
  if (!title) return null;
  try {
    const doc = await apiJson("/documents", {
      method: "POST",
      body: JSON.stringify({ title, content: `# ${title}\n\n` }),
    });
    return doc; // the documents tab refetches on switch, so nothing to sync
  } catch (error) {
    toast(error.message, true);
    return null;
  }
}

let captureDocumentTitles = new Map();
// The last list the server gave us, so removing a chip can put that document
// back in the adder's menu without a second round trip.
let captureDocumentList = [];

function renderCaptureDocuments(documents) {
  if (documents) {
    captureDocumentList = documents;
    captureDocumentTitles = new Map(documents.map((d) => [String(d.id), d.title]));
  }
  const box = $("entry-document-chips");
  box.replaceChildren();
  for (const id of captureDocuments) {
    const chipEl = chip(`ph:file-text ${captureDocumentTitles.get(String(id)) || id} ph:x`, "tag", () => {
      captureDocuments.delete(id);
      renderCaptureDocuments();
    });
    chipEl.title = "Don't attach this note to that document after all";
    box.appendChild(chipEl);
  }
  renderCaptureDocumentAdder();
}

//: **The picked documents are chips; the control that adds one is an adder.**
//:
//: Reported by the owner (INBOX 116) as "the add to document combobox not
//: changing", and it was not a bug in the handler: the handler wrote
//: `event.target.value = ""` on every pick *on purpose*, because a note can
//: go onto several documents and the select could only ever show one. So the
//: box snapped back to "None" the instant you chose something and the choice
//: appeared as a chip beside it. A select that refuses to hold the value you
//: just gave it reads as broken however correct its reasons are.
//:
//: The decision (recorded in UI_MODERNISATION_PLAN, "Decisions made"): a
//: thing you pick and it *acts* is a menu, and the recipe for a menu behind a
//: worded button is `labelledMenu` (DESIGN.md's recipe index). That is also
//: the shape "Attach" and "From library" already have on this same row, so
//: the three now read as one family of adders rather than one dropdown and
//: two buttons.
//:
//: Rebuilt rather than mutated on every render: the menu's contents depend on
//: which documents are already chips, and a five-item list is cheaper to
//: rebuild than to diff.
function renderCaptureDocumentAdder() {
  const slot = $("entry-document-adder");
  if (!slot) return;
  const items = [];
  for (const doc of captureDocumentList) {
    if (captureDocuments.has(doc.id)) continue;
    items.push(
      makeMenuItem(`ph:file-text ${doc.title}`, `Attach this note to “${doc.title}”`, () => {
        captureDocuments.add(doc.id);
        renderCaptureDocuments();
      }),
    );
  }
  // Asked for: "the add to document should have the option for a new document
  // as well". Wanting to file a note under something that does not exist yet
  // is the normal case at the start of a project, and leaving to make the
  // document loses the note you were in the middle of writing.
  items.push(
    makeMenuItem("ph:plus New document…", "Start a document and attach this note to it", async () => {
      const doc = await createDocumentNamed($("entry-content").value.trim().slice(0, 60));
      if (!doc) return;
      captureDocuments.add(doc.id);
      await loadCaptureDocuments(); // so the new one is in the list to remove
    }),
  );
  const adder = labelledMenu("ph:file-plus Add to document", items, "Add this note to a document", "ghost");
  slot.replaceChildren(adder);
}

//: **Put this note on a whiteboard or a mind map** (INBOX 246, the owner:
//: "I also want to be able to attach whiteboards and mindmaps to notes").
//:
//: "Attach" here means the thing a person means by it: the note goes on the
//: board, as a card, where they can see it. That is a `WhiteboardNode` row,
//: which is the reference the board already stores when it carries a note,
//: written from the note's side. No new relation, no second way for a note
//: and a board to be connected, and the "Referenced by" row above reads it
//: back without knowing which side wrote it.
//:
//: Deliberately the shape of `renderAttachToDocument` below, which does the
//: same job for documents: the same inline panel, the same select, the same
//: Attach/Cancel pair, the same toast with a way in. Two adders that behave
//: differently would be two things to learn for one idea.
//:
//: **No "new board" option**, unlike the document picker. A document made
//: from a note is a document with that note in it and nothing else to
//: decide; a board made from a note needs a type (board or map) and a name,
//: which is a dialog, and the Library's own "New board" already asks both.
//: Offering a half version here would be a third place that creates boards.
async function renderAttachToBoard(entry, wrap) {
  const status = document.createElement("p");
  status.className = "muted";
  status.textContent = "Loading boards\u2026";
  wrap.appendChild(status);

  const boards = await apiJson("/whiteboard/boards", { silent: true }).catch(() => null);
  if (!boards) {
    status.textContent = "Couldn't load your boards.";
    return;
  }
  //: The unnamed scratch board (`id: null`) is left out: it is where things
  //: land when nobody chose a board, not somewhere to file a note on
  //: purpose, and it has no name to offer in a list.
  const named = boards.filter((board) => board.id != null);
  if (!named.length) {
    status.textContent = "No boards or maps yet. Make one in the Library first.";
    const only = document.createElement("div");
    only.className = "row";
    only.appendChild(
      smallButton("Cancel", "", () => {
        inlineAction = null;
        renderEntries();
      })
    );
    wrap.appendChild(only);
    return;
  }
  status.textContent = "Put this note on:";

  const picker = document.createElement("select");
  for (const board of named) {
    const option = document.createElement("option");
    option.value = String(board.id);
    //: The kind in the label, because the owner asked for whiteboards and
    //: mind maps by name and a list of bare titles does not say which is
    //: which. The word, not an icon: this is an `<option>`, and an option's
    //: text is all it has.
    option.textContent = `${board.title || "Untitled"} (${board.type === "map" ? "map" : "board"})`;
    //: The name on its own, for the toast. The `(board)` half belongs in a
    //: list where two kinds sit together and reads as part of the name
    //: anywhere else: "Put on \u201cHouse jobs (board)\u201d" is not a sentence
    //: somebody wrote.
    option.dataset.title = board.title || "Untitled";
    picker.appendChild(option);
  }

  const row = document.createElement("div");
  row.className = "row";
  row.appendChild(
    smallButton(
      "Attach",
      "Put this note on the chosen board",
      async () => {
        const id = Number(picker.value);
        const title = picker.selectedOptions[0]?.dataset.title || "that board";
        try {
          await apiJson("/whiteboard/nodes", {
            method: "POST",
            //: Placed rather than dropped at the origin: every board already
            //: has something at 0,0 sooner or later, and a card that lands
            //: exactly under another one reads as "nothing happened". This is
            //: the same offset the board's own "add a card" starts from, and
            //: the card is draggable the moment it is there.
            body: JSON.stringify({ entry_id: entry.id, board_id: id, x: 80, y: 80, z: 1 }),
          });
          inlineAction = null;
          await loadEntries();
          toastAction(`Put on \u201c${title}\u201d.`, "Open", () => {
            if (typeof openWhiteboardBoard === "function") openWhiteboardBoard(id);
          });
        } catch (error) {
          toast(error.message, true);
        }
      },
      false
    )
  );
  row.appendChild(
    smallButton("Cancel", "", () => {
      inlineAction = null;
      renderEntries();
    })
  );
  wrap.append(picker, row);
  focusSelect(picker);
}

// The other direction, asked for straight after the capture-time picker:
// "what about adding a document to a note??". A note you wrote weeks ago
// turns out to belong to something you are writing now, and the capture box
// is long gone by then.
async function renderAttachToDocument(entry, wrap) {
  const status = document.createElement("p");
  status.className = "muted";
  status.textContent = "Loading documents…";
  wrap.appendChild(status);

  //: To the end, same reason as `loadCaptureDocuments`.
  const documents = await apiPagedList("/documents", 200).catch(() => null);
  if (!documents) {
    status.classList.add("error");
    status.textContent = "Couldn't load your documents.";
    return;
  }
  const already = new Set((entry.documents || []).map((doc) => doc.id));
  const free = documents.filter((doc) => !already.has(doc.id));

  status.textContent = free.length
    ? "Add this note to:"
    : documents.length
      ? "This note is on all of your documents, or start a new one:"
      : "No documents yet: start one:";
  const picker = document.createElement("select");
  for (const doc of free) {
    const option = document.createElement("option");
    option.value = String(doc.id);
    option.textContent = doc.title || "Untitled";
    picker.appendChild(option);
  }
  // Same offer as the capture box: the document this note belongs to often
  // does not exist until the note makes you realise you want it.
  const fresh = document.createElement("option");
  fresh.value = NEW_DOCUMENT;
  //: No mark at all, and that is the only honest answer here: an `<option>`
  //: may hold text and nothing else, so it cannot carry one of the app's
  //: icons, and a typed one beside a menu of Phosphor is the mismatch this
  //: rule exists to stop. The ellipsis already says "this opens something".
  fresh.textContent = "New document…";
  picker.appendChild(fresh);

  const row = document.createElement("div");
  row.className = "row";
  row.appendChild(
    smallButton(
      "Attach",
      "Add this note to the chosen document",
      async () => {
        let id = picker.value;
        let title = picker.selectedOptions[0]?.textContent || "that document";
        if (id === NEW_DOCUMENT) {
          const made = await createDocumentNamed(entry.content.trim().slice(0, 60));
          if (!made) return;
          id = String(made.id);
          title = made.title;
        }
        try {
          await apiJson(`/documents/${id}/notes`, {
            method: "POST",
            body: JSON.stringify({ entry_id: entry.id }),
          });
          inlineAction = null;
          await loadEntries();
          toastAction(`Added to “${title}”.`, "Open", () =>
            openDocumentFromNote(Number(id))
          );
        } catch (error) {
          toast(error.message, true);
        }
      },
      false
    )
  );
  row.appendChild(
    smallButton("Cancel", "", () => {
      inlineAction = null;
      renderEntries();
    })
  );
  wrap.append(picker, row);
  //: `picker` is a `<select>`, so the same trap: see `focusSelect`. The
  //: `setTimeout` was there to wait for the element to be in the document;
  //: `focusSelect` waits for the frame that gives it its opener, which is the
  //: later of the two events and the one that actually matters.
  focusSelect(picker);
}

function openDocumentFromNote(documentId) {
  switchTab("documents");
  // The tab's own loader races us otherwise, and opens the last document.
  setTimeout(() => openDocument(documentId), 150);
}

// ROADMAP.md Tier 2 §16d, asked for directly: an optional title field
// where a note is created. Not a second stored field, it writes the same
// leading `# heading` line `manager.extract_title` already reads on every
// note (§43), so a title typed here reads back identically to one typed
// as the note's own first line. Only prepended when the title box actually
// has something in it, so a note with no title is unchanged from today.
function withTitle(content, title) {
  const trimmed = (title || "").trim();
  return trimmed ? `# ${trimmed}\n\n${content}` : content;
}

// Shared by saveEntry and saveEntryAsDraft: clear the capture box and every
// field that goes with it once the content has actually been saved
// somewhere. Pulled out rather than left duplicated, both paths need
// exactly this, and it drifting between two copies is how one of them ends
// up leaving a stale category or template selected after a save.
function resetCaptureForm(contentBox, titleBox) {
  contentBox.value = "";
  if (titleBox) titleBox.value = "";
  renderEntryAttachmentChips();
  autoGrow(contentBox); // the box shrinks back with its content
  localStorage.removeItem("captureDraft"); // it's saved for real now
  $("entry-count").textContent = "0 characters";
  $("entry-tags").value = "";
  $("entry-category").value = "";
  captureDocuments.clear();
  renderCaptureDocuments();
  clearCaptureTagSuggestions();
  // NOT cleared here: `captureStagedFiles`. `saveEntry` hands the list to
  // `uploadStagedFiles`, which takes ownership of it and empties it itself.
  // Clearing here as well would race that and silently drop the attachments
  // on every save: the composer resets before the uploads finish, by
  // design. `saveEntryAsDraft` clears it explicitly instead, below.
  renderCaptureFiles();
}

// **Tag suggestions while composing, not just after saving.** Reported
// directly: "the ai and application doesnt suggest tags either before
// creating a new note or after", "after" already existed
// (renderReevaluateResult, above), buried in a saved note's own kebab menu;
// "before" had nothing at all. `/entries/suggest-tags` needs only the
// draft's own text, so this can run on the Capture box itself, debounced the
// same way autosave-to-localStorage already is elsewhere in this file.
let captureTagSuggestTimer = null;
let captureTagSuggestSeq = 0; // invalidated on every keystroke, a slow reply
// to an earlier, shorter draft must never overwrite what a newer one asked for.

function clearCaptureTagSuggestions() {
  captureTagSuggestSeq++;
  clearTimeout(captureTagSuggestTimer);
  const row = $("entry-tag-suggestions");
  row.replaceChildren();
  row.classList.add("hidden");
}

function renderCaptureTagSuggestions(tags) {
  const row = $("entry-tag-suggestions");
  row.replaceChildren();
  if (!tags.length) {
    row.classList.add("hidden");
    return;
  }
  const label = document.createElement("span");
  label.className = "muted";
  label.textContent = "Suggested tags:";
  row.appendChild(label);
  for (const tag of tags) {
    const tagChip = chip(`ph:plus ${tag}`, "tag", () => {
      const box = $("entry-tags");
      const have = box.value.split(",").map((t) => t.trim()).filter(Boolean);
      if (!have.includes(tag)) box.value = [...have, tag].join(", ");
      tagChip.remove();
      if (!row.querySelector(".chip")) row.classList.add("hidden");
    });
    tagChip.title = `Add the "${tag}" tag`;
    row.appendChild(tagChip);
  }
  row.classList.remove("hidden");
}

function scheduleCaptureTagSuggestions() {
  clearTimeout(captureTagSuggestTimer);
  const content = $("entry-content").value.trim();
  // Not worth a round trip for a fragment this short, nothing useful to
  // label yet, and it would just relabel itself a few keystrokes later.
  if (content.length < 20) {
    clearCaptureTagSuggestions();
    return;
  }
  captureTagSuggestTimer = setTimeout(async () => {
    const seq = ++captureTagSuggestSeq;
    const tags = $("entry-tags").value.split(",").map((t) => t.trim()).filter(Boolean);
    let suggested;
    try {
      const result = await apiJson("/entries/suggest-tags", {
        method: "POST",
        body: JSON.stringify({ content, tags }),
      });
      suggested = result.suggested_tags || [];
    } catch {
      suggested = [];
    }
    if (seq !== captureTagSuggestSeq) return; // superseded by a later keystroke
    renderCaptureTagSuggestions(suggested);
  }, 1200);
}

//: Wipes the composer's error line as soon as the person answers it. Bound
//: once per complaint rather than at startup, so a composer that never
//: errored carries no listener at all, and `{ once: true }` means the pair
//: cannot accumulate over a session of near-misses.
function clearCaptureStatusOnInput() {
  const status = $("save-status");
  const clear = () => {
    if (!status.classList.contains("error")) return;
    status.textContent = "";
    status.classList.remove("error");
  };
  $("entry-content")?.addEventListener("input", clear, { once: true });
  $("entry-title")?.addEventListener("input", clear, { once: true });
}

async function saveEntry() {
  const contentBox = $("entry-content");
  const titleBox = $("entry-title");
  const status = $("save-status");
  const button = $("save-btn");

  const content = withTitle(contentBox.value.trim(), titleBox?.value);
  if (!content) {
    //: No exclamation mark (the copy rule), and it clears itself the moment
    //: anything is typed. Reported on 2026-09-09: "the words 'write something
    //: first' is at the bottom of the note capture tab when I didnt do
    //: anything?? maybe I fumbled a button." Nothing ever cleared this line,
    //: so one press of Save (or of Ctrl+S, which reaches the same button) on
    //: an empty box left an error sitting under the composer for the rest of
    //: the session, long after it had stopped being true.
    status.textContent = "Write something first, then save.";
    status.classList.add("error");
    clearCaptureStatusOnInput();
    return;
  }
  const tags = $("entry-tags").value.split(",").map((t) => t.trim()).filter(Boolean);
  const category = await resolveCategoryChoice($("entry-category"));
  if (category === undefined) return;

  // Filing in the background is the default, and the reason is the whole
  // point of the preference: filing asks a local model, so on a small
  // machine this form used to sit disabled behind "Filing…" for seconds
  // per note: reported as "the making of new notes was slow and annoying…
  // I feel like the note panels should disappear while filing and
  // continuing in the backend with a popup notification so I dont have to
  // wait twiddling my thumbs". Choosing a category yourself skips it
  // either way: there is nothing to wait for.
  const deferFiling = !category && (prefsCache.background_filing ?? true);

  button.disabled = true;
  status.classList.remove("error");
  status.textContent = category
    ? "Saving…"
    : deferFiling
      ? "Saving…"
      : modelStatus && !modelStatus.embedding_ready
        ? "Filing… (the search AI is still warming up, this first one can take longer)"
        : "Filing… (Atlas is reading and categorising your note)";
  try {
    //: **The pictures go up before the note does.** They were staged as
    //: `staged:<key>` urls while the note had no id (see `captureStagedImages`);
    //: this is the moment the user commits, so the bytes are uploaded and every
    //: placeholder in the text is replaced with the url the upload returned.
    //: A failure throws out of here and the save stops with the reason, a note
    //: saved with a dead `staged:` url in it would be a broken picture forever,
    //: and dropping the picture silently would be worse.
    const stagedUrls = await commitCaptureImages();
    const body = rewriteStagedUrls(content, stagedUrls);
    const saved = await apiJson("/entries", {
      method: "POST",
      body: JSON.stringify({
        content: body,
        tags,
        category,
        document_ids: [...captureDocuments],
        defer_filing: deferFiling,
      }),
    });
    clearStagedImages();
    status.textContent = filedByText(saved);
    if (saved.filing_state === "pending") watchFiling(saved);
    // The note finally has an id, which is the only thing the staged files
    // were ever waiting for. Not awaited: the composer is already clear and
    // the toasts report per file, making Save wait on N uploads would put
    // back exactly the blocking this session removed from filing.
    uploadStagedFiles(saved.id);
    if (saved.similar) {
      // Duplicate detection (Wave B): informational, never blocking.
      toast(
        `Heads up: this is ${Math.round(saved.similar.similarity * 100)}% similar ` +
          `to an existing note, “${saved.similar.preview}”`
      );
    }
    resetCaptureForm(contentBox, titleBox);
    await loadEntries();
    loadSuggestions(); // new categories → fresher recommended questions
    pushUndo(
      "Created a note",
      async () => {
        await api(`/entries/${saved.id}`, { method: "DELETE" });
        await loadEntries();
      },
      async () => {
        await api(`/entries/${saved.id}/restore`, { method: "POST" });
        await loadEntries();
      }
    );
    // Saving from Capture leaves you on Capture, with the note you just wrote
    // now somewhere in a list on another sub-tab. Offer to go to it rather
    // than making you switch tabs and hunt (user request). An offer, not a
    // jump: capturing several thoughts in a row is the common case, and
    // teleporting away after each one would fight that.
    offerJumpToNewNote(saved, status);
  } catch (error) {
    status.textContent = error.message;
    status.classList.add("error");
  } finally {
    button.disabled = false;
  }
}

// "No option to save a note as a draft in the capture section" (user-
// reported). is_draft already existed as a note field, the text-selection
// popup, the Writing Room, and "save this answer as a draft note" in chat
// all set it: but the primary capture box had no path to it. Deliberately
// skips category resolution: a draft is "save this fast, decide later", the
// same reasoning the other three draft-creating call sites already use, 
// none of them file a category either.
async function saveEntryAsDraft() {
  const contentBox = $("entry-content");
  const titleBox = $("entry-title");
  const status = $("save-status");
  const button = $("save-draft-btn");

  const content = withTitle(contentBox.value.trim(), titleBox?.value);
  if (!content) {
    //: No exclamation mark (the copy rule), and it clears itself the moment
    //: anything is typed. Reported on 2026-09-09: "the words 'write something
    //: first' is at the bottom of the note capture tab when I didnt do
    //: anything?? maybe I fumbled a button." Nothing ever cleared this line,
    //: so one press of Save (or of Ctrl+S, which reaches the same button) on
    //: an empty box left an error sitting under the composer for the rest of
    //: the session, long after it had stopped being true.
    status.textContent = "Write something first, then save.";
    status.classList.add("error");
    clearCaptureStatusOnInput();
    return;
  }
  const tags = $("entry-tags").value.split(",").map((t) => t.trim()).filter(Boolean);

  button.disabled = true;
  status.classList.remove("error");
  status.textContent = "Saving as draft…";
  try {
    //: Same commit-then-write order as a full save, a draft is a note with
    //: an id, so its pictures are real from the same moment.
    const stagedUrls = await commitCaptureImages();
    const saved = await apiJson("/entries", {
      method: "POST",
      body: JSON.stringify({
        content: rewriteStagedUrls(content, stagedUrls),
        tags,
        document_ids: [...captureDocuments],
        is_draft: true,
      }),
    });
    clearStagedImages();
    status.textContent = "Saved as a draft, find it later under Drafts in the sidebar.";
    resetCaptureForm(contentBox, titleBox);
    // A draft is still a note with an id, so staged files attach to it the
    // same way. Doing this here rather than in `resetCaptureForm` is what
    // keeps that function from having to know which of its two callers has
    // already taken the list, see its own comment.
    uploadStagedFiles(saved.id);
    await loadEntries();
  } catch (error) {
    status.textContent = error.message;
    status.classList.add("error");
  } finally {
    button.disabled = false;
  }
}

// --- ask ----------------------------------------------------------------------

// Follow-up memory (Round 1): the running conversation, sent back so the
// model can handle "and what about…". Capped so requests stay small.
let conversation = [];
const MAX_CLIENT_HISTORY = 4;
let askController = null; // AbortController for the in-flight stream
let lastQuestion = ""; // powers the Retry button

// Honest label for how the matching notes were found.
const SEARCH_MODE_LABELS = {
  // Both searches ran and their rankings were fused, which is the normal case
  // whenever an embedding backend is up. Named for what it is: "semantic
  // search" would now be a half-truth, and the label is the app's own account
  // of how it found what it is showing you.
  hybrid: "meaning + keywords",
  semantic: "semantic search",
  keyword: "keyword search",
  recent: "recent notes", // broad question → showing recent entries
  // These two were missing and rendered raw, so the panel said "dated", the
  // internal name, in a strip whose whole job is telling you in plain words how
  // the app found what it is showing you.
  dated: "by date",
  none: "nothing searched",
  // Matched the subject, not the stated time, see the note above
  // renderChatMeta's empty-results branch for the reasoning (§38 bug report:
  // a joke tagged joke/jokes/funny, asked about as "two weeks ago", was
  // actually three).
  outside_range: "matched, wrong time",
};

// Say something to a screen reader without putting anything on screen. Used
// for changes whose only visible signal is colour or position.
function announce(message) {
  const region = $("live-region");
  if (!region) return;
  // Clearing first guarantees the change is seen as new even when the same
  // message is announced twice in a row.
  region.textContent = "";
  requestAnimationFrame(() => (region.textContent = message));
}

// Jump to an entry in the Notes tab and flash it, shared by search
// results, most-used, and related-notes chips.
//: What the popup agent's "Use the open note" toggle reads when nothing is
//: being edited: the last note this session actually opened. `flashEntry` is
//: every route to a note there is (a search result, a citation, the graph, a
//: wiki link), which is why the tracking sits here rather than at the dozen
//: call sites.
let lastOpenedEntryId = null;

//: Bring the currently-open edit form into view within its nearest scrolling
//: ancestor, without moving the page scroll position. Called after
//: `renderEntries()` rebuilds the list from scratch, which resets the notes
//: pane's scroll to the top: the editing note might then be off screen.
//: Nearest-scroller pattern per DESIGN.md: `scrollIntoView` walks every
//: ancestor to the page, including the page itself, which is not what we want.
function scrollEditingEntryIntoView(id) {
  const li = document.querySelector(`#entry-list li[data-id="${id}"]`);
  if (!li) return;
  let node = li.parentElement;
  while (node && node !== document.body) {
    const style = getComputedStyle(node);
    if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 1) {
      const liTop = li.getBoundingClientRect().top;
      const nodeTop = node.getBoundingClientRect().top;
      const liBottom = liTop + li.offsetHeight;
      const nodeBottom = nodeTop + node.clientHeight;
      if (liTop < nodeTop) {
        node.scrollTop += liTop - nodeTop - 8;
      } else if (liBottom > nodeBottom) {
        node.scrollTop += liBottom - nodeBottom + 8;
      }
      return;
    }
    node = node.parentElement;
  }
  // Fallback: page-level scroll, only if no scrolling ancestor found.
  const rect = li.getBoundingClientRect();
  if (rect.top < 0) window.scrollBy(0, rect.top - 8);
}

function flashEntry(id) {
  lastOpenedEntryId = id;
  switchTab("notes");
  // The Notes tab is split into sub-tabs, and the note list lives in "browse".
  // Without this the card is found and scrolled to while its whole section is
  // display:none: so jumping to a note from a search result, the graph, or a
  // wiki link silently did nothing (user-reported).
  showNotesSection("browse");
  activeCategory = null;
  // A draft target needs the Drafts filter ON now that drafts are excluded
  // from every other view (user-reported): otherwise jumping to one from
  // Library's "Open" button would find nothing.
  draftsOnly = allEntries.some((e) => e.id === id && e.is_draft);
  // Same reason as the line above and the search reset below: a note that is
  // not pinned is filtered out of Favourites, so jumping to one while that
  // filter is on would scroll to nothing.
  favouritesOnly = false;
  // Clear any active filter too: a note that doesn't match the current search
  // is filtered out of the list, so there'd be nothing to scroll to.
  noteSearch = "";
  const searchBox = $("note-search");
  if (searchBox) searchBox.value = "";
  // **BACKLOG §77 item 2, the page half of "jump to a note."** Everything
  // above already resets category/drafts/search to whatever view actually
  // contains the target (the design question that item scoped: a jump
  // always lands in that reset default view, never in whatever filter the
  // *origin*, Chat, the graph, a document, happened to have active,
  // since most origins have no Notes-tab filter state to preserve at all).
  // With that view now fixed, `resolveNotePage` answers the one thing that
  // reset alone didn't: which *page* of it. Set before `renderEntries()` so
  // the list paints the right page the first time, not the first page
  // followed by a jump.
  const targetPage = resolveNotePage(id);
  if (targetPage) notesCurrentPage = targetPage;
  renderSidebar();
  renderEntries();
  requestAnimationFrame(() => {
    const card = document.querySelector(`#entry-list li[data-id="${id}"]`);
    if (!card) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    card.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
    // Restart the animation even when the same note is jumped to twice in a
    // row: without the reflow the class is already there and nothing replays.
    card.classList.remove("flash");
    void card.offsetWidth;
    card.classList.add("flash");
    // Announce it too: a colour change alone tells a screen-reader user
    // nothing about where they've just been sent.
    // Just the note's own text: card.textContent would drag in the category
    // chip, every tag, and the confidence badge.
    const body = card.querySelector(".entry-content")?.textContent || "";
    announce(`Showing note: ${body.trim().slice(0, 80)}`);
    clearTimeout(flashEntry.timer);
    flashEntry.timer = setTimeout(() => card.classList.remove("flash"), 2700);
  });
}

// ROADMAP.md Tier 2 §13: changeRow's View button only ever reached notes and
// documents: reminders and categories had no navigation target at all, on
// top of having no backend id/name resolver. Same shape as flashEntry above.
async function flashReminder(id) {
  switchTab("reminders");
  // The change that brought us here (setting or completing a reminder) may
  // not match whatever filter was last active, "open" is the default, and
  // completing one is exactly the case where it would just have vanished.
  reminderFilter = "all";
  for (const b of document.querySelectorAll("#reminder-filter button")) {
    b.classList.toggle("active", b.dataset.filter === "all");
  }
  await loadReminders();
  requestAnimationFrame(() => {
    const item = document.querySelector(`#reminder-groups li[data-id="${id}"]`);
    if (!item) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    item.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
    item.classList.remove("flash");
    void item.offsetWidth;
    item.classList.add("flash");
    announce(`Showing reminder: ${(item.textContent || "").trim().slice(0, 80)}`);
    clearTimeout(flashReminder.timer);
    flashReminder.timer = setTimeout(() => item.classList.remove("flash"), 2700);
  });
}

// Categories have no single note to scroll to, "View" means "show me what's
// in it", the same job the sidebar's own category filter already does.
function flashCategory(name) {
  switchTab("notes");
  showNotesSection("browse");
  activeCategory = name;
  draftsOnly = false;
  noteSearch = "";
  const searchBox = $("note-search");
  if (searchBox) searchBox.value = "";
  renderSidebar();
  renderEntries();
}

// A raw search result the user can click to open the note (Wave C).
//: `facts: true`, not `actions: true`. Reported as INBOX 297, "make sure all
//: the badges show", and measured rather than guessed: the same note drew
//: five chips in Browse and two here, because this call passed **no options
//: at all** and every chip in `entryItem` that is gated on `options.actions`
//: is gated on the row being one you can act on. Two of the three missing
//: ones deserve that gate ("Tag with Atlas" starts a model call, and the
//: "No tags yet" flag opens the edit form in a list that is not on screen);
//: the third, the reference count, is a plain fact about the note that
//: happened to be behind the same flag. So a second option, meaning "this
//: row is read-only, draw the facts anyway", rather than turning the actions
//: on and getting an edit button in a search result.
function clickableResult(entry) {
  const li = entryItem(entry, { facts: true });
  li.classList.add("clickable-result");
  li.title = "Open this note in the Notes tab";
  li.addEventListener("click", () => flashEntry(entry.id));
  return li;
}

// ROADMAP.md item 36: which retrieved note backs which sentence of a direct
// Q&A answer: surfaced the same understated way `match_info`'s own badges
// already are (a strip of small chips, not a rewrite of the answer's own
// text). One chip per *note* (not per sentence: several grounded sentences
// often share a note, and a chip per sentence would repeat itself), the
// chip's title carrying the actual sentence(s) it backs. Clicking a chip
// opens that note, same as a search result row already does.
// **Numbered citations in the answer itself.** Asked for directly: "inline
// referencing with hyperlinks in ai chat messages would be amazing."
//
// The data for this already existed and only ever reached a chip row *under*
// the answer: `ground_answer_sentences` (ai/grounding.py) returns
// {sentence, note_id} pairs, scored by word overlap against the notes that
// were actually retrieved: so the app already knows, per sentence, which
// note backs it. What it did not do was say so where the sentence is, which
// is the only place the claim and its source are read together.
//
// Deliberately conservative about *where* a marker may go: it walks real text
// nodes and only places one where a grounded sentence is found whole inside a
// single node. A sentence split across an <em> or a link is skipped rather
// than reassembled: a citation attached to the wrong half of a sentence is
// worse than no citation, and the chip row below still lists every source
// either way, so nothing is lost by skipping.
//: **`answerEl` is every prose block of the turn, latest first, not one
//: element.** Reported: an agent answer and a skill run showed no markers at
//: all, while a plain Ask answer showed them. The cause is one word:
//: `querySelector`. A skill run's timeline writes each step's prose into its
//: own `.bubble-answer` node (`startAnswer`, called again after every `step`
//: event), so the *first* one is step 1's narration and the run's real answer
//: is the last. The backend grounds the turn's whole prose as one string, so
//: every sentence it returned came from the final answer, and every one of
//: them was hunted for in the wrong paragraph.
//:
//: Latest first because a run repeats itself: a sentence the closing summary
//: and an intermediate step both contain belongs on the summary, which is
//: what a reader takes away. A step's own unique sentence still gets its
//: marker where it is, which is what walking all of them buys over simply
//: picking the last.
//: `orderedSources` is the Sources panel's own list, in the order it numbers
//: them. INBOX 81's second half asks that "the sources list numbers web
//: results after the notes so [5] resolves to a site", and reading the two
//: numberings side by side showed a wider problem than that: the panel counts
//: its rows from 1 in list order (notes, then what the turn touched, then
//: what it read off the web), while the block below counted from 1 in
//: *order first cited* among the grounded sentences. Those are two unrelated
//: sequences, so [2] in the prose and 2 in the panel were only ever the same
//: source by luck, with no web results involved at all.
//:
//: Passed rather than recomputed here, because the panel builds the list from
//: three inputs this function does not have, and two functions deriving "the
//: same" order independently is how they drift apart again. Optional, so the
//: Ask box's own call keeps its existing behaviour until it grows a panel to
//: agree with.
//: **One numbering, read by everything that prints a digit.** Reported of the
//: Ask tab: "In-text referencing and grounding in the ask subtab doesn't
//: stick, the wrong numbers will be used and in the wrong spot, and the
//: numbers wont match the grounding". Three things there number the same
//: sources: the markers in the prose, the "Grounded in" chips under it and
//: the Sources panel below that. Each counted for itself, so a note could be
//: 1 in the prose, 2 on a chip and 3 in the panel, and the Chat tab had
//: already been given the panel's order for exactly this reason while Ask had
//: not. A function rather than a convention: two loops that agree today are
//: two loops that disagree after the next edit to either.
//:
//: A note the panel did not list (it caps its rows) keeps a number after the
//: listed ones rather than none at all: an unnumbered citation is worse than
//: one whose row needs scrolling to.
function citationNumbers(sentences, orderedSources = null) {
  const numberFor = new Map();
  if (orderedSources && orderedSources.length) {
    orderedSources.forEach((source, index) => {
      if (source && source.kind === "note") numberFor.set(source.id, index + 1);
    });
    let next = orderedSources.length + 1;
    for (const g of sentences || []) {
      if (!numberFor.has(g.note_id)) numberFor.set(g.note_id, next++);
    }
  } else {
    for (const g of sentences || []) {
      if (!numberFor.has(g.note_id)) numberFor.set(g.note_id, numberFor.size + 1);
    }
  }
  return numberFor;
}

//: **What a sentence is matched on: its letters and digits, nothing else**
//: (INBOX 318). The grounded sentence is the answer's markdown source and the
//: page holds what the renderer made of it, and the two differ in exactly the
//: characters that carry no words: `**` and `*` vanish, a list's `- ` is
//: drawn as a bullet, a link keeps its text and loses its target, and
//: emphasis cuts one sentence into three text nodes. Measured with an answer
//: shaped the way a model writes (a lead-in, a list with bold labels, a
//: closing sentence with one word in italics): the grounding named every note
//: and not one marker was placed, because the old search looked for the raw
//: sentence inside one text node at a time. Compared on letters and digits
//: across the whole block, the formatting cannot make a sentence unfindable,
//: and it cannot make one match in the wrong place either: a sentence of a
//: dozen words is the same run of letters wherever it is drawn.
const CITATION_WORD_CHAR = /[\p{L}\p{N}]/u;

function citationKey(sentence) {
  //: `plainText` first, for the one difference that *is* letters: a link's
  //: target and a wikilink's brackets are not on the page.
  const text = plainText(sentence || "");
  let key = "";
  for (let i = 0; i < text.length; i += 1) {
    if (CITATION_WORD_CHAR.test(text[i])) key += text[i].toLowerCase();
  }
  return key;
}

//: The answer's own letters, in order, each with the text node and offset it
//: sits at. Rebuilt after every marker, because placing one splits a node and
//: the offsets after the split point move to the new half.
function citationTextIndex(targets) {
  let text = "";
  const at = [];
  for (const target of targets) {
    const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT, {
      //: A marker's own digit is not answer text, and neither is code: the
      //: backend never grounds a fenced block, so its letters could only
      //: produce a false match.
      acceptNode: (node) =>
        node.parentElement?.closest(".answer-citation, pre, .typing-dots, .typing-label")
          ? NodeFilter.FILTER_REJECT
          : NodeFilter.FILTER_ACCEPT,
    });
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const data = node.data;
      for (let i = 0; i < data.length; i += 1) {
        if (!CITATION_WORD_CHAR.test(data[i])) continue;
        for (const low of data[i].toLowerCase()) {
          text += low;
          at.push([node, i]);
        }
      }
    }
  }
  return { text, at };
}

//: Where the marker goes once the sentence's last letter is found: after the
//: punctuation that closes it, and outside any bold or italic the sentence
//: ended inside, so the digit is not drawn bold because the last word was.
const CITATION_CLOSING = /[.!?:;,)\]"'”’]/;
const CITATION_INLINE_TAGS = new Set(["STRONG", "EM", "B", "I", "A", "CODE", "MARK", "S", "DEL", "SPAN"]);
function citationInsertionPoint(node, offset, targets) {
  let end = offset + 1;
  while (end < node.data.length && CITATION_CLOSING.test(node.data[end])) end += 1;
  if (end < node.data.length) {
    const tail = node.splitText(end);
    return { parent: tail.parentNode, before: tail };
  }
  let anchor = node;
  while (
    !anchor.nextSibling &&
    anchor.parentElement &&
    CITATION_INLINE_TAGS.has(anchor.parentElement.tagName) &&
    !targets.includes(anchor.parentElement)
  ) {
    anchor = anchor.parentElement;
  }
  const next = anchor.nextSibling;
  if (next && next.nodeType === Node.TEXT_NODE) {
    let run = 0;
    while (run < next.data.length && CITATION_CLOSING.test(next.data[run])) run += 1;
    if (run) {
      const tail = next.splitText(run);
      return { parent: tail.parentNode, before: tail };
    }
  }
  return { parent: anchor.parentNode, before: anchor.nextSibling };
}

function addInlineCitations(answerEl, sentences, rawResults, orderedSources = null) {
  const targets = [
    ...(answerEl && !answerEl.nodeType ? [...answerEl] : answerEl ? [answerEl] : []),
  ];
  if (!targets.length) return;
  //: **Idempotent.** The Ask tab now calls this after every live paint as
  //: well as once at the end (INBOX 320), and a paint that happened not to
  //: rebuild the box would otherwise collect a second set of digits.
  for (const target of targets) {
    for (const old of target.querySelectorAll(".answer-citation")) old.remove();
    target.normalize();
  }
  if (!sentences || !sentences.length) return;
  const byId = new Map((rawResults || []).map((entry) => [entry.id, entry]));
  // One number per note, in the order they are first cited, the numbering a
  // reader expects, rather than note ids, which mean nothing to anyone.
  const numberFor = citationNumbers(sentences, orderedSources);
  //: One place per sentence, holding every note it was grounded to: a
  //: sentence about two notes gets both digits side by side, in number order.
  const bySentence = new Map();
  for (const g of sentences) {
    const key = citationKey(g.sentence);
    //: A dozen letters is about three words; below that a "sentence" is a
    //: fragment that could match anywhere, and the backend never grounds one.
    if (key.length < 12) continue;
    if (!bySentence.has(key)) bySentence.set(key, []);
    if (!bySentence.get(key).some((row) => row.note_id === g.note_id)) bySentence.get(key).push(g);
  }
  //: Longest first, and a claimed stretch is never reused by a different
  //: sentence: when one grounded sentence is contained in another, the short
  //: one must find its own occurrence, not the middle of the long one.
  const claimed = [];
  const overlaps = (start, end) => claimed.some(([s, e]) => start < e && end > s);
  const wanted = [...bySentence.entries()].sort((a, b) => b[0].length - a[0].length);
  for (const [key, rows] of wanted) {
    const index = citationTextIndex(targets);
    let start = index.text.indexOf(key);
    while (start !== -1 && overlaps(start, start + key.length)) {
      start = index.text.indexOf(key, start + 1);
    }
    if (start === -1) continue;
    claimed.push([start, start + key.length]);
    const [node, offset] = index.at[start + key.length - 1];
    const { parent, before } = citationInsertionPoint(node, offset, targets);
    rows.sort((a, b) => (numberFor.get(a.note_id) || 0) - (numberFor.get(b.note_id) || 0));
    for (const g of rows) parent.insertBefore(citationMarker(g, byId, numberFor), before);
  }
  collapseCitationRuns(targets);
}

//: **One mark per run, at its end** (the owner, 2026-09-24: "the amount of
//: intext referencing like with the 1's is a little excessive"). Measured on
//: that answer: a paragraph of three sentences from the one guide carried
//: three 1s in a row, and one of four carried four. A run of sentences in one
//: paragraph backed by the same notes is one claim to the reader, and the
//: convention (and every answer engine's) is one mark where the run ends.
//: A mark stays where the set of notes changes or the paragraph does, so no
//: sentence loses the source it came from; its hover passage moves to the
//: run's last mark, which is the one still drawn.
const CITATION_BLOCK = "p, li, blockquote, td, th, h1, h2, h3, h4, h5, h6, dd";
function collapseCitationRuns(targets) {
  for (const target of targets) {
    const groups = [];
    for (const marker of target.querySelectorAll(".answer-citation")) {
      const prev = marker.previousSibling;
      const last = groups[groups.length - 1];
      if (last && prev === last.markers[last.markers.length - 1]) {
        last.markers.push(marker);
      } else {
        groups.push({ markers: [marker], block: marker.closest(CITATION_BLOCK) || target });
      }
    }
    for (const group of groups) {
      group.key = group.markers.map((m) => m.dataset.noteId).sort().join(",");
    }
    for (let i = 0; i < groups.length - 1; i += 1) {
      const here = groups[i];
      const next = groups[i + 1];
      if (here.block === next.block && here.key === next.key) {
        for (const marker of here.markers) marker.remove();
      }
    }
  }
}

function citationMarker(g, byId, numberFor) {
  const marker = document.createElement("sup");
  marker.className = "answer-citation";
  //: Which note this digit stands for, on the element itself. The number
  //: was the only thing on screen tying a mark to a source, so nothing
  //: outside this function could check that the mark and the record row
  //: it points at agree (INBOX 299), and `showCitedPassage` already reads
  //: exactly this attribute off a source card.
  marker.dataset.noteId = String(g.note_id);
  const link = document.createElement("button");
  link.type = "button";
  link.className = "answer-citation-link";
  const entry = byId.get(g.note_id);
  // A note a tool read mid-turn is not in `rawResults`; the backend
  // sends its opening words on the entry itself for exactly this case.
  const name = noteLabel({ content: entry?.content || g.label || "" }, 40);
  link.textContent = String(numberFor.get(g.note_id));
  link.title = `Open the note this came from: ${name}`;
  link.setAttribute("aria-label", `Source ${numberFor.get(g.note_id)}: ${name}`);
  link.addEventListener("click", (event) => {
    event.stopPropagation();
    flashEntry(g.note_id);
  });
  //: **Hover shows the passage, not the whole note** (CHAT_PLAN decision
  //: 2, the last step of `archive/agent-remaining/chat-timeline-skills.md` item
  //: 1). The span has been on every grounding row since the passage
  //: scorer landed and nothing on screen read it, so a mark said "note 4"
  //: where it could say which forty words of note 4. The card is the
  //: place for it rather than a tooltip: it is already the thing that
  //: says what this source is, and a tooltip cannot hold a paragraph.
  const passage =
    Number.isInteger(g.start) && Number.isInteger(g.end) && g.end > g.start
      ? (entry?.content || "").slice(g.start, g.end)
      : "";
  if (passage) {
    for (const name of ["mouseenter", "focus"]) {
      link.addEventListener(name, () => showCitedPassage(g.note_id, passage));
    }
    for (const name of ["mouseleave", "blur"]) {
      link.addEventListener(name, clearCitedPassage);
    }
  }
  marker.appendChild(link);
  return marker;
}

//: The passage a citation came from, shown on its own card while the mark is
//: hovered or focused. Focus as well as hover, because a person moving
//: through an answer with Tab reaches these markers and would otherwise get
//: the one thing this adds only with a mouse.
function showCitedPassage(noteId, passage) {
  clearCitedPassage();
  //: **Both places a cited note can be drawn.** The Chat tab holds its
  //: sources as cards under the answer; the Ask tab holds its notes in the
  //: Matching records column beside it and draws no cards for them (INBOX
  //: 274). A mark that only knew about the cards did nothing at all on Ask
  //: once the cards went, which is a feature quietly lost rather than a
  //: duplicate removed.
  const cards = [
    ...document.querySelectorAll(`.chat-source-card[data-note-id="${noteId}"]`),
    ...document.querySelectorAll(`#raw-results li[data-id="${noteId}"]`),
  ];
  for (const card of cards) {
    //: A closed disclosure cannot show anything, and the mark is the reader
    //: asking to see this source: opened, and left open, because closing it
    //: again the moment the pointer moves would be the panel flickering at
    //: every mark passed over on the way down an answer.
    card.closest("details")?.setAttribute("open", "");
    card.classList.add("is-cited");
    const box = document.createElement("p");
    box.className = "chat-source-passage";
    const mark = document.createElement("mark");
    //: `textContent`, not the markdown renderer: this is a slice taken at
    //: character offsets, so it can begin mid-emphasis, and rendering half a
    //: `**` is how a highlight starts eating the rest of the card.
    mark.textContent = passage;
    box.appendChild(mark);
    card.appendChild(box);
  }
}

function clearCitedPassage() {
  for (const box of document.querySelectorAll(".chat-source-passage")) box.remove();
  for (const card of document.querySelectorAll(".is-cited")) card.classList.remove("is-cited");
}

// The "nothing in your notes, but…" row. Sent only on the empty path (see
// `_related_elsewhere`, routes_chat.py): a question whose answer lives in a
// document, a saved chat or a reminder used to end at "I couldn't find any
// saved notes matching that question", which is true and a dead end.
//
// Chips, matching every other "here is something to open" row in this app,
// each landing on the thing itself rather than on a search for it.
function renderRelatedElsewhere(target, items) {
  if (!target || !items || !items.length) return;
  const row = document.createElement("div");
  row.className = "answer-related";
  const label = document.createElement("span");
  label.className = "muted answer-grounding-label";
  label.textContent = "Elsewhere in your notebook:";
  row.appendChild(label);
  const icons = { document: "ph:file-text", chat: "ph:chat-circle", reminder: "ph:bell" };
  for (const item of items) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chip chip-interactive answer-related-chip";
    setNoteLabel(button, icons[item.kind] || "ph:link", item.label || item.kind, 120);
    button.title = `Open this ${item.kind}`;
    button.addEventListener("click", () => {
      if (item.kind === "document") {
        switchTab("documents");
        openDocument(item.id);
      } else if (item.kind === "chat") {
        switchTab("chat");
        openConversation?.(item.id);
      } else if (item.kind === "reminder") {
        switchTab("reminders");
      }
    });
    row.appendChild(button);
  }
  target.appendChild(row);
}

//: The citation number, printed on the record it belongs to (INBOX 299).
//:
//: Guarded on the Ask tab's own grounding holder: the Chat tab calls
//: `renderAnswerGrounding` with a bubble's holder and has no records column,
//: so without this a chat turn would renumber a column left over from the
//: last question asked on the other tab.
//:
//: `.chat-source-index` rather than a mark of its own: the Sources panel
//: already draws "this is source n" that way, and one treatment learnt once
//: is the whole point of the recipe index. An uncited row gets no number
//: rather than a placeholder, because a digit that matches nothing in the
//: answer is worse than a row with none.
function numberMatchingRecords(target, numberFor) {
  if (!target || target.id !== "ai-answer-grounding") return;
  const list = $("raw-results");
  if (!list) return;
  for (const li of list.querySelectorAll("li[data-id]")) {
    li.querySelector(":scope > .record-index")?.remove();
    const n = numberFor.get(Number(li.dataset.id)) ?? numberFor.get(li.dataset.id);
    if (!n) {
      li.classList.remove("is-numbered");
      continue;
    }
    const mark = document.createElement("span");
    mark.className = "chat-source-index record-index";
    mark.textContent = String(n);
    //: Said aloud as well as shown: a screen reader reading "3" against a
    //: note has no way to know what the digit is counting.
    mark.setAttribute("aria-label", `Source ${n} in the answer`);
    mark.title = `The answer cites this note as ${n}`;
    li.classList.add("is-numbered");
    li.insertBefore(mark, li.firstChild);
  }
}

//: `question`, when the caller knows it, is what turns a click into a
//: correction: opening the third source after asking something is the one
//: signal the search has that its own order was wrong (WORLD_CLASS_PLAN I7,
//: and `search_manager._learned_order`, which has been reading these
//: corrections since Brief 23 while nothing in the browser wrote one). Left
//: optional because the third caller rebuilds an old chat from storage, and
//: a click on a source from last week is not evidence about today's ranking.
//: How much of an answer the notebook actually backed, said out loud.
//:
//: CHAT_PLAN Phase 1's fourth gate line, and Brief 12's decision: under half
//: the sentences supported, the app says so. The marks have always shown
//: *which* sentences came from notes; nothing showed how many, so an answer
//: with one cited sentence in six read, at a glance, exactly like one with six
//: in six. That is the one thing a notebook that cites must not get wrong.
//:
//: **The threshold is the backend's, not this file's** (`grounding.support`,
//: which sends `low` beside the numbers). Two places each choosing when an
//: answer counts as thin is two places to disagree, and the copy here would
//: then be describing a different answer from the one the marks describe.
//:
//: Placed above the answer rather than beside the chips below it: the chips
//: are a key to marks somebody has already read, and this is a thing to know
//: before reading. `.notice`, the app's recipe for exactly that
//: (08-consistency.css), in its `notice-warn` tone, which is an edge and not a
//: fill: a filled warning band would read as a failed answer, and it is not a
//: failed answer, it is an answer with less behind it than usual.
function renderAnswerSupport(answerEl, support) {
  //: Every prose block of the turn may be passed (a skill run has one per
  //: step); the notice belongs above the first.
  const first = answerEl && answerEl.length ? answerEl[0] : answerEl;
  if (!first || !first.parentElement) return;
  const existing = first.parentElement.querySelector(":scope > .answer-support");
  if (existing) existing.remove();
  if (!support || !support.low) return;
  const line = document.createElement("p");
  line.className = "notice notice-warn answer-support";
  line.setAttribute("role", "note");
  const { supported = 0, sentences = 0 } = support;
  setLabel(
    line,
    `ph:warning Only ${supported} of ${sentences} sentences here ` +
      `${supported === 1 ? "comes" : "come"} from your notes. ` +
      "The rest is the model's own writing, treat it as a draft."
  );
  first.parentElement.insertBefore(line, first);
}

//: INBOX 272 part 1, "every failure names its way out": the same
//: `.notice.notice-warn` recipe as `renderAnswerSupport` above, plus the one
//: control that fixes it, right under the turn that hit it rather than a
//: sentence pointing at a different screen. Only the Chat tab's Agent mode
//: can produce this event (the Ask box always sends `useTools: false`), so
//: this has one caller.
function renderToolsUnsupportedNotice(container, event) {
  if (!container || !event) return;
  const line = document.createElement("p");
  line.className = "notice notice-warn tools-unsupported-notice";
  line.setAttribute("role", "note");
  setLabel(line, `ph:warning ${event.message || "This model can't call tools."}`);
  const row = document.createElement("div");
  row.className = "row tools-unsupported-fix-row";
  row.appendChild(
    smallButton("ph:gear Change the model", "Open Settings, Models", () => {
      openSettingsModal("models", "chat-model-select");
    })
  );
  container.append(line, row);
}

function renderAnswerGrounding(
  target, sentences, rawResults, answerEl = null, question = "", orderedSources = null,
  support = null
) {
  if (!target) return;
  renderAnswerSupport(answerEl, support);
  // The markers go in the answer itself; the chip row below is their key.
  // Both are built from the same `sentences` and the same numbering
  // (`citationNumbers`), so they cannot disagree about which note is number 2,
  // and passing the panel's order in makes the third thing on screen agree too.
  addInlineCitations(answerEl, sentences, rawResults, orderedSources);
  target.replaceChildren();
  if (!sentences || !sentences.length) {
    target.classList.add("hidden");
    return;
  }
  const byId = new Map((rawResults || []).map((entry) => [entry.id, entry]));
  const byNote = new Map(); // note_id -> sentences[]
  const labelFor = new Map(); // note_id -> backend label, for touched notes
  for (const g of sentences) {
    if (!byNote.has(g.note_id)) byNote.set(g.note_id, []);
    byNote.get(g.note_id).push(g.sentence);
    if (g.label && !labelFor.has(g.note_id)) labelFor.set(g.note_id, g.label);
  }
  const label = document.createElement("span");
  label.className = "muted answer-grounding-label";
  label.textContent = "Grounded in:";
  target.appendChild(label);
  const numberFor = citationNumbers(sentences, orderedSources);
  //: **And the third place a digit is printed: the records column itself**
  //: (INBOX 299, the owner: "can the notes in the matching records that
  //: appear in the ask tab be numbered accordingly to match the inline
  //: referencing??"). Measured before this: five records on screen, five
  //: marks in the prose, and nought numbers in the column, so the two lists
  //: could only be read against each other by matching the words.
  //:
  //: From `numberFor`, here, rather than by numbering the column separately:
  //: that map is already what the markers, the chips and the Sources panel
  //: print, and a fourth loop deriving "the same" order is exactly how the
  //: first three came to disagree (see `citationNumbers`' own comment).
  numberMatchingRecords(target, numberFor);
  //: Drawn in the order the digits run, not in the order the sentences
  //: happened to arrive: a key whose rows read 2, 1, 3 is a key you have to
  //: search rather than read.
  const chips = [...byNote.entries()].sort(
    (a, b) => (numberFor.get(a[0]) || 0) - (numberFor.get(b[0]) || 0)
  );
  for (const [noteId, forSentences] of chips) {
    const entry = byId.get(noteId);
    const n = numberFor.get(noteId) || 0;
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip result-reason-chip result-reason-connected answer-grounding-chip";
    // Numbered to match the markers `addInlineCitations` puts in the answer, 
    // the row is the key to those, so the two have to count the same way.
    // `setNoteLabel`, not `setLabel`: the second half of this string is the
    // note's own Markdown, and the number is app-written, so they cannot go
    // through the renderer as one string (`1. ` is an ordered-list marker).
    setNoteLabel(chip, `ph:file-text ${n}.`, entry?.content || labelFor.get(noteId) || "", 30);
    chip.title = forSentences.join(" ");
    chip.addEventListener("click", () => {
      if (question) {
        apiJson("/learned/corrections", {
          method: "POST",
          silent: true,
          body: JSON.stringify({
            kind: "open_after_ask",
            subject: { question, entry_id: noteId },
          }),
        }).catch(() => {});
      }
      flashEntry(noteId);
    });
    target.appendChild(chip);
  }
  target.classList.remove("hidden");
}

//: **The answer object** (CHAT_PLAN.md decision 3, Phase 3). One shape for an
//: answer whichever surface produced it: `{question, text, sentences, sources,
//: related, next, stats, verification}`, where a sentence is
//: `{text, marks: [{note_id, start, end, score}]}`.
//:
//: Built here rather than at each call site because the three surfaces were
//: reading three different shapes of the same stream. Grounding arrives as one
//: row per *(sentence, note)* pair, which is the shape the scorer produces and
//: the wrong shape to render from: a sentence backed by two notes arrives
//: twice, and a renderer walking the rows draws the sentence twice with one
//: mark each instead of once with two. Folding it is a four-line job that had
//: been done differently, or not at all, in every place that needed it.
//:
//: `start`/`end` are the passage span of CHAT_PLAN decision 2 (Phase 1, not
//: built): carried through when the backend sends one and left `null`
//: otherwise, never defaulted to 0, because a start of 0 is a claim that the
//: passage begins at the note's first word and a renderer would highlight it.
function answerObject({
  question = "",
  text = "",
  grounding = [],
  meta = null,
  related = [],
  next = [],
  stats = null,
  verification = null,
  touched = [],
  toolEvents = [],
} = {}) {
  const bySentence = new Map();
  for (const row of grounding || []) {
    const sentence = row.sentence || "";
    if (!sentence) continue;
    if (!bySentence.has(sentence)) bySentence.set(sentence, { text: sentence, marks: [] });
    bySentence.get(sentence).marks.push({
      note_id: row.note_id,
      start: typeof row.start === "number" ? row.start : null,
      end: typeof row.end === "number" ? row.end : null,
      score: typeof row.score === "number" ? row.score : null,
      label: row.label || "",
    });
  }
  return {
    question,
    text,
    sentences: [...bySentence.values()],
    //: The same builder the Chat tab's bubble uses, so the two surfaces cannot
    //: disagree about what counts as a source or about the order they are
    //: numbered in.
    sources: chatSourcesFrom({ meta, toolEvents, touched }),
    related: related || [],
    next: next || [],
    stats: stats || null,
    verification: verification || null,
  };
}

//: **What the Ask tab draws under an answer** (CHAT_PLAN Phase 3, decision 8:
//: "Ask = Chat in single-turn mode"). Three components, none of them written
//: for this surface: `renderRelatedElsewhere`, `chatSourcesPanel` and the
//: follow-up strip are the Chat tab's, called here with the same object.
//:
//: Each gets its own container, which is the fix for a bug this restructuring
//: found: related items and grounding chips were both written into
//: `#ai-answer-grounding`, and `renderAnswerGrounding` opens with
//: `replaceChildren()`. The `related` event arrives before `grounding` on
//: every stream that has both, so "Elsewhere in your notebook" was built and
//: then deleted a moment later, on every answer, invisibly.
function clearAskAnswerFoot() {
  $("ask-answer-foot")?.classList.add("hidden");
  $("ask-answer-related")?.replaceChildren();
  $("ask-answer-sources")?.replaceChildren();
  const strip = $("ask-followups");
  if (strip) {
    strip.replaceChildren();
    strip.classList.add("hidden");
  }
}

function renderAskAnswerFoot(object, meta) {
  const foot = $("ask-answer-foot");
  if (!foot) return;

  const related = $("ask-answer-related");
  related.replaceChildren();
  related.classList.toggle("hidden", !object.related.length);
  if (object.related.length) renderRelatedElsewhere(related, object.related);

  const sources = $("ask-answer-sources");
  sources.replaceChildren();
  //: **The notes are on the right, so they are not also under the answer.**
  //: The owner, 2026-09-20, with a screenshot: "having the notes appear as
  //: sources below the ai response in the notes tab ask subtab is
  //: uncnecessary when they are shown already on the right next to the ai
  //: response". Measured on that screen: five numbered source cards under the
  //: answer and the same five notes, same ids, same order, as rows in
  //: Matching records beside it. The whole point of the two-column Ask layout
  //: is that the records are already in view; a second copy of them is the
  //: column's own content pushed down the page by a picture of itself.
  //:
  //: The Chat tab keeps its panel, and that is not an inconsistency: Chat has
  //: no column beside it, so the panel is the only place its sources can be.
  //: This is the same components arranged for a layout that already shows
  //: them.
  const onRight = askNotesOnTheRight();
  const here = object.sources.filter(
    (source) => source.kind === "note" && source.id != null && onRight.has(String(source.id))
  );
  //: Anything the column does not hold still needs somewhere to be: a file, a
  //: web result or a document is a source of this answer and Matching records
  //: is notes. Those keep the panel, and keep their own numbers, so a citation
  //: marker in the answer still points at the row it names.
  const elsewhere = object.sources.filter((source) => !here.includes(source));
  //: **No control for the notes the column is already showing** (the owner,
  //: 2026-09-21: "remove the show x notes used button in the ask subtab as
  //: well, it isnt needed"). It counted them and scrolled to the first one
  //: cited, which is a second door to a list that is already on screen beside
  //: the answer and carries the answer's own numbers on its rows. A control
  //: that leads to what you can already see is furniture.
  const panel = elsewhere.length
    ? chatSourcesPanel({ sources: elsewhere, meta, numberFrom: object.sources })
    : null;
  if (panel) sources.appendChild(panel);
  sources.classList.toggle("hidden", !panel);

  foot.classList.toggle(
    "hidden",
    !object.related.length && !panel && $("ask-followups").classList.contains("hidden")
  );
}

//: The note ids the Matching records column is showing right now, as strings
//: because that is what `dataset` answers on both sides of the comparison.
function askNotesOnTheRight() {
  const rows = document.querySelectorAll("#raw-results li[data-id]");
  return new Set([...rows].map((row) => row.dataset.id));
}


//: Into view through the nearest scrolling ancestor's own `scrollTop`, which
//: is DESIGN.md's rule: `scrollIntoView` walks every scrolling ancestor up to
//: the page, and the page moving is how a reader loses the answer they were
//: reading while trying to look at what it was built from.
function askRevealRecords(noteId = null) {
  const list = $("raw-results");
  if (!list) return;
  //: The row the answer cites first, when there is one, and the column's own
  //: top otherwise: a press that lands on source 1 answers "which notes?"
  //: with the note rather than with the heading above it.
  const row = noteId == null ? null : list.querySelector(`li[data-id="${noteId}"]`);
  const half = row || list.closest(".chat-half") || list;
  let node = half.parentElement;
  while (node && node !== document.body) {
    const style = getComputedStyle(node);
    if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 1) {
      //: Rects rather than `offsetTop`, which is measured against the nearest
      //: *positioned* ancestor and not against the scroller.
      node.scrollTop += half.getBoundingClientRect().top - node.getBoundingClientRect().top;
      return;
    }
    node = node.parentElement;
  }
  const scroller = document.scrollingElement || document.documentElement;
  scroller.scrollTop += half.getBoundingClientRect().top - 12;
}

//: **A follow-up is a question that keeps the answer above it** (decision 8:
//: "'Ask again' chips become follow-ups that carry the previous answer as
//: context"). The chips themselves are `/chat/followups`, the same second
//: model call the Chat tab makes after a turn is on screen, and clicking one
//: calls `askQuestion`, which sends `conversation` as history: so the context
//: is carried by the path every Ask turn already takes, not by a second one
//: built for chips.
//:
//: Silent on every failure, including the AI not running: an answer that
//: arrived is not made worse by having nothing to offer after it.
async function renderAskFollowups(question, answer) {
  const strip = $("ask-followups");
  if (!strip) return;
  strip.replaceChildren();
  strip.classList.add("hidden");
  if (!question || !answer) return;
  let picks = [];
  try {
    picks = await apiJson("/chat/followups", {
      method: "POST",
      silent: true,
      body: JSON.stringify({ question, answer }),
    });
  } catch {
    return;
  }
  if (!Array.isArray(picks) || !picks.length) return;
  const label = document.createElement("span");
  label.className = "muted answer-grounding-label";
  label.textContent = "Ask next:";
  strip.appendChild(label);
  for (const pick of picks) {
    strip.appendChild(
      chip(pick, "Ask this next, keeping the answer above as context", () => {
        $("question").value = pick;
        askQuestion(pick);
      })
    );
  }
  strip.classList.remove("hidden");
  $("ask-answer-foot")?.classList.remove("hidden");
}

// The Ask box's "that isn't a question about your notes" card (§35A).
//
// Deliberately not rendered as an answer. Reported after the first version:
// a paragraph of instructions where the answer goes, next to a results panel
// saying "No matching records", reads as the app having broken rather than as
// guidance. Here the examples are buttons, a way forward from the same place,
// which also teaches the shape of a question that works.
function renderAskHint(box, hint) {
  box.replaceChildren();
  const card = document.createElement("div");
  card.className = "ask-hint";
  const text = document.createElement("p");
  text.className = "ask-hint-text";
  text.textContent = hint.text;
  card.appendChild(text);
  const row = document.createElement("div");
  row.className = "row ask-hint-examples";
  for (const example of hint.examples || []) {
    row.appendChild(
      smallButton(example, `Ask: ${example}`, () => {
        $("question").value = example;
        askQuestion(example);
      })
    );
  }
  if (row.childElementCount) card.appendChild(row);
  box.appendChild(card);
}

//: **The badge in the answer head, and the sentence behind it.**
//: The chip ellipsises now rather than wrapping the head onto a second line
//: (01-forms-settings.css, `.answer-model`, records the measurements), and an
//: ellipsis cuts the end off a model id, which is where the useful part of one
//: lives: `…Qwen2.5-14B-Instruct-GGUF:Q4_K_M`. So the full phrase always goes
//: on the `title` even when the visible text is complete, and the visible text
//: is as short as the fact allows: "answered by" spent about 100px of a 356px
//: column saying what a chip beside the words "AI answer" already says.
function setAnsweredBy(text, full) {
  const chip = $("answered-by");
  chip.textContent = text;
  //: Removed rather than emptied: an empty `title` is still a title, and a
  //: tooltip that opens blank reads as a broken one.
  if (full) chip.title = full;
  else chip.removeAttribute("title");
}

function renderChatMeta(meta) {
  $("search-mode").textContent = SEARCH_MODE_LABELS[meta.search_mode] || meta.search_mode;
  // "offline" only when Ollama is genuinely down, not merely because a
  // question found nothing to answer from.
  if (meta.answered_by) setAnsweredBy(meta.answered_by, `Answered by ${meta.answered_by}`);
  else if (meta.ollama_running === false) {
    setAnsweredBy("chat model offline", "The chat model is not running, so nothing answered this");
  } else setAnsweredBy("", "");
  const rawList = $("raw-results");
  rawList.replaceChildren();
  if (meta.raw_results.length === 0 && meta.search_mode === "none") {
    // Nothing was searched for, the message was not a question about the
    // notes. "No matching records" would report a failed search that never
    // happened, which is the half of the greeting case that read as broken.
    $("chat-results").classList.remove("hidden");
  $("ask-idle")?.classList.add("hidden");
    document.querySelector(".chat-half:last-child")?.classList.add("hidden");
    return;
  }
  document.querySelector(".chat-half:last-child")?.classList.remove("hidden");
  if (meta.search_mode === "outside_range" && meta.raw_results.length) {
    // Matched what was asked about, not when it was asked about, the note
    // is real, the stated time was just wrong (reported directly: a joke
    // asked about as "two weeks ago" that was actually three). Said before
    // the results, not folded silently into them, so this never reads as a
    // date-scoped answer it isn't.
    const li = document.createElement("li");
    li.className = "muted";
    li.textContent = meta.when_phrase
      ? `Nothing about this in “${meta.when_phrase}”: here's what matched from another time:`
      : "Nothing in that time range, here's what matched from another time:";
    rawList.appendChild(li);
  }
  if (meta.raw_results.length === 0) {
    const li = document.createElement("li");
    li.className = "muted";
    // A dated question that found nothing has *two* facts to report, and only
    // saying the first is what makes an empty result look like a broken
    // search: nothing matched, **and** the window you named is why it was
    // looking so narrowly. Naming the phrase is also the fastest route to the
    // fix, because the next thing to try is asking again without it.
    li.textContent =
      meta.search_mode === "dated" && meta.when_phrase
        ? `Nothing matching “${meta.when_phrase}”. Try asking without it.`
        : "No matching records.";
    rawList.appendChild(li);
  }
  // Notes that came along because they are *connected* to a match are labelled
  // as such. Without it the panel shows notes about something else with no
  // explanation, which reads as the search having misfired, and the whole
  // point of pulling them in is that the person can see the connection.
  const connected = new Set(meta.connected_ids || []);
  const matchInfo = meta.match_info || {};
  for (const entry of meta.raw_results) {
    const row = clickableResult(entry);
    const badge = matchReasonBadge(matchInfo[entry.id]);
    if (badge) {
      if (connected.has(entry.id)) row.classList.add("result-connected");
      if (matchInfo[entry.id]?.type === "connected_2hop") row.classList.add("result-connected-2hop");
      row.appendChild(badge);
    }
    rawList.appendChild(row);
  }
  //: The reference count is a fact the card draws from a cache the *note
  //: list* fills, so a result row rendered before that list has been opened
  //: had nowhere to read it from and drew nothing. The same patch-in the
  //: note list uses, pointed at this list: one implementation, and a second
  //: one is how the two would come to disagree about what "linked by" counts.
  ensureCardCounts(rawList, _entriesLoadGeneration);
  $("chat-results").classList.remove("hidden");
  $("ask-idle")?.classList.add("hidden");
}

// Why a result showed up, as a badge, not a footnote. Reported directly:
// the one existing explanation ("Link linked to a match") was a muted chip
// easy to miss, and every *other* result, the actual matches, carried no
// reason at all, so "why is this here?" only had an answer for the minority
// of rows that arrived by connection rather than by matching. `match_info`
// (search/search_manager.py's `_retrieve`) now carries real provenance for
// the rest: a cosine similarity score for a semantic hit, the words that
// matched for a keyword hit, both for a hybrid one.
const MATCH_REASON_LABEL = {
  // `info.reason` is the link's own reason, when whoever made the link gave
  // one ("both about scheduling"), asked for directly: does a link's
  // reason show up here too, not just on the graph and in Trace. It does
  // now (search_manager.graph_expansion carries it through).
  connected: (info) => ({
    text: info.reason ? `ph:link Linked (${info.reason})` : "ph:link Linked to a match",
    title: info.reason
      ? `This note didn't match your question, it's here because it's linked to one that did: ${info.reason}.`
      : "This note didn't match your question, it's here because it is linked to one that did.",
  }),
  // ROADMAP.md item 33: an opt-in second hop, linked to something linked
  // to a match, not to the match itself. Real evidence, weaker evidence;
  // its own badge text says so rather than reading identically to a direct
  // connection, and `.result-connected-2hop` (style.css) renders it dimmer.
  connected_2hop: (info) => ({
    text: info.reason ? `ph:link Two steps away (${info.reason})` : "ph:link Two steps from a match",
    title: info.reason
      ? `This note is linked to a note that's linked to a match, not to the match itself: ${info.reason}.`
      : "This note is linked to a note that's linked to a match, not to the match itself, weaker evidence than a direct connection.",
  }),
  semantic: (info) => ({
    text: `ph:target ${Math.round(info.score * 100)}% similar`,
    title: `Matched by meaning, not exact words, ${Math.round(info.score * 100)}% cosine similarity to your question.`,
  }),
  keyword: (info) => ({
    text: `ph:magnifying-glass Matched “${info.terms.join("”, “")}”`,
    title: `Matched the word(s) “${info.terms.join(", ")}” in your question.`,
  }),
  hybrid: (info) => ({
    text: `ph:target ${Math.round(info.score * 100)}% similar · “${info.terms.join("”, “")}”`,
    title: `Matched both by meaning (${Math.round(info.score * 100)}% similarity) and by the word(s) “${info.terms.join(", ")}”.`,
  }),
};

function matchReasonBadge(info) {
  if (!info || !MATCH_REASON_LABEL[info.type]) return null;
  const { text, title } = MATCH_REASON_LABEL[info.type](info);
  const badge = document.createElement("span");
  badge.className = `chip result-reason-chip result-reason-${info.type}`;
  setLabel(badge, text);
  badge.title = title;
  return badge;
}

// Longer than the backend's own 120s per-chunk Ollama timeout (see the
// idle-read guard inside streamChat below) so a real "offline" answer from
// that always has time to arrive first.
const STREAM_IDLE_TIMEOUT_MS = 150_000;

// The one NDJSON stream reader, shared by the Notes quick-ask and the
// Chat tab (Wave C). Callers own all rendering via the handlers.
async function streamChat({
  question,
  history,
  persona,
  mode,
  useTools,
  noteIds,
  imageMediaIds,
  documentIds,
  fileIds,
  boardIds,
  skill,
  skillInputs,
  skillFromStep,
  skillOnlyStep,
  skillStepText,
  skillManual,
  skillManualNote,
  plan,
  notesOnly,
  attachedNotesOnly,
  answeringAgent,
  signal,
  onMeta,
  onPlan,
  onStep,
  onResult,
  onLimit,
  onThinking,
  onAnswer,
  onTool,
  onConfirm,
  onAsk,
  onRunSkill,
  onRunPlan,
  onCompressReview,
  onHint,
  onStats,
  onGrounding,
  onGroundingLive,
  onAnswerFinal,
  onRelated,
  onUnsupported,
}) {
  const body = { question, history: history || [] };
  if (persona) body.persona = persona;
  // Per-turn, not a setting: one quick answer shouldn't change the default
  // for every answer after it.
  if (mode) body.mode = mode;
  if (typeof useTools === "boolean") body.use_tools = useTools;
  if (notesOnly) body.notes_only = true;
  // The deliberately-closed-set case (Trace's "Generate story from path"):
  // retrieval must not add notes beyond the ones the caller attached.
  if (attachedNotesOnly) body.attached_notes_only = true;
  // A reply to the agent's own question ("yes", "ok") reads as small talk to
  // intent.classify, correctly, in isolation, which would otherwise route
  // it to the tool-less conversational path and strand whatever the model
  // was asking about (Tier 1 §4). The caller already knows this reply is
  // answering a pending `ask` event, so it says so rather than making the
  // classifier guess from three letters.
  if (answeringAgent) body.answering_agent = true;
  if (noteIds && noteIds.length) body.note_ids = noteIds;
  // Vision-capable models (ROADMAP.md's largest open item): ids from
  // /media/upload, the same endpoint the note/document editors already use
  // for drag-and-drop images: see `_resolve_chat_images` (routes_chat.py)
  // for how an id becomes a data URI the provider actually sends.
  if (imageMediaIds && imageMediaIds.length) body.image_media_ids = imageMediaIds;
  //: **Documents and files were staged, drawn, persisted -- and never sent
  //: here.** `streamChat` took `noteIds` and `imageMediaIds` and nothing else,
  //: so an attached document reached `/chat` (the non-streaming path, used by
  //: Ask) and never `/chat/stream`, which is the path the Chat tab actually
  //: uses. The chip appeared on the message, the id was saved on the
  //: conversation, and the model was never given a word of it -- the same
  //: failure `document_ids` shipped once before, one layer further out.
  if (documentIds && documentIds.length) body.document_ids = documentIds;
  if (fileIds && fileIds.length) body.file_ids = fileIds;
  //: A mind map attached by hand (MINDMAP_PLAN.md §5 item 11). Its own
  //: field, not folded into `note_ids`, because a board's `content` is the
  //: single line `# My map`, sent as a note the model would get a heading
  //: and be told it was a map. `_attached_boards` (routes_chat.py) turns the
  //: id into the outline instead.
  if (boardIds && boardIds.length) body.board_ids = boardIds;
  // Running a skill sends its name, not its prompt: the server owns what a
  // skill is, the steps, the values, the tools it may use, so the two
  // definitions can't drift apart.
  if (skill) {
    body.skill = skill;
    if (skillInputs && Object.keys(skillInputs).length) body.skill_inputs = skillInputs;
    // Resuming: the steps before this one ran in an earlier attempt and are
    // not repeated. Sent as an index rather than as a list of what to skip,
    // so the server stays the one place that knows what the steps are.
    if (skillFromStep) body.skill_from_step = skillFromStep;
    //: Re-running one step, optionally reworded (AGENT_SKILLS_REFORM.md Phase
    //: D). `!= null` rather than truthiness: step 0 is a step.
    if (skillOnlyStep != null) body.skill_only_step = skillOnlyStep;
    if (skillStepText) body.skill_step_text = skillStepText;
  }
  // A plan the model just made. Carries its own steps because nothing saved
  // it: that is the only way it differs from a skill run, here and on the
  // server.
  const hasPlan = plan && plan.steps && plan.steps.length;
  if (hasPlan) body.plan = plan;
  // Manual (step-through) mode: a pause after every completed step. Applies
  // equally to a saved skill or a plan the model just drew, both run
  // through the same step-by-step runner server-side. Sent on every call for
  // this run, resume included, since a run started manual stays manual.
  if (skill || hasPlan) {
    if (skillManual) body.skill_manual = true;
    if (skillManualNote) body.skill_manual_note = skillManualNote;
  }
  // NDJSON over a plain POST, deliberately, not a WebSocket. A WebSocket was
  // tried here and reverted: it needed the session on a second thread (a
  // SQLAlchemy Session is not thread-safe), it had to be mounted outside the
  // `locked` dependency and re-implement auth by hand, and a WS handshake is
  // exempt from the same-origin policy that protects this `fetch`, any page
  // the user had open could have opened it. `fetch` + a reader gives the same
  // token-by-token delivery with none of that.
  const response = await fetch("/chat/stream", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Auth-Token": authToken(),
      // Missing here, this fetch is hand-rolled rather than going through
      // api()/apiJson() (it needs the raw streaming body, which those don't
      // expose): and every one of the app's *other* fetches gets this
      // header automatically, so it was easy to not notice this one never
      // did. Reported directly: a space hidden from "All spaces" still
      // surfaced its notes from Ask's semantic search. The real bug was
      // wider than that one symptom, with no X-Workspace-ID at all,
      // get_session() never populates session.info["workspace_id"], so
      // database.py's workspace filter never runs, and *every* chat or Ask
      // turn searched every space regardless of which one was active,
      // hidden or not.
      "X-Workspace-ID": activeSpaceId(),
    },
    body: JSON.stringify(body),
    signal,
  });
  if (response.status === 401) {
    showLockScreen(false);
    throw new Error("Locked");
  }
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new Error(detail.detail || `Request failed (${response.status})`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffered = "";
  while (true) {
    // **No timeout on the stream** (reported: "the AI fails to respond
    // while still saying it is writing"). The backend's own read against
    // Ollama times out and turns into a real "offline" line on the wire, 
    // but only for a hang *inside that one socket call*. Anything that
    // stalls the backend before or between chunks (retrieval, a stuck
    // lock, a dead process) has nothing to catch it, and `reader.read()`
    // then waits forever with no sign of life. `STREAM_IDLE_TIMEOUT_MS` is
    // comfortably longer than the backend's own 120s per-chunk timeout, so
    // a real recovery message from *that* always wins the race; this is
    // only for the case where nothing, not even an error, ever arrives.
    const chunk = await Promise.race([
      reader.read(),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("stream_idle_timeout")),
          STREAM_IDLE_TIMEOUT_MS
        )
      ),
    ]).catch((err) => {
      if (err.message === "stream_idle_timeout") {
        reader.cancel().catch(() => {}); // stop the underlying fetch too
        throw new Error(
          "The model stopped responding. It may still be loading a large " +
            "model, or Ollama may have stalled, try again, or check " +
            "Settings → Models."
        );
      }
      throw err;
    });
    const { done, value } = chunk;
    if (done) break;
    buffered += decoder.decode(value, { stream: true });
    const lines = buffered.split("\n");
    buffered = lines.pop(); // last piece may be a partial line
    for (const line of lines) {
      if (!line.trim()) continue;
      let event;
      // One malformed line must not abort a whole answer. Before this, a
      // single bad frame threw out of the read loop and the user saw a
      // half-written reply with no error.
      try {
        event = JSON.parse(line);
      } catch (parseErr) {
        recordBrowserLog("WARN", [`[Chat stream] Unparseable line: ${line.slice(0, 80)}`]);
        continue;
      }
      if (event.type === "meta") onMeta(event);
      else if (event.type === "plan" && onPlan) onPlan(event);
      else if (event.type === "step" && onStep) onStep(event);
      else if (event.type === "result" && onResult) onResult(event);
      else if (event.type === "limit" && onLimit) onLimit(event);
      else if (event.type === "thinking") onThinking(event.delta);
      else if (event.type === "answer") onAnswer(event.delta);
      else if (event.type === "tool" && onTool) onTool(event);
      else if (event.type === "confirm" && onConfirm) onConfirm(event);
      else if (event.type === "ask" && onAsk) onAsk(event);
      else if (event.type === "run_skill" && onRunSkill) onRunSkill(event);
      else if (event.type === "run_plan" && onRunPlan) onRunPlan(event);
      else if (event.type === "compress_review" && onCompressReview) onCompressReview(event);
      else if (event.type === "hint" && onHint) onHint(event);
      else if (event.type === "stats" && onStats) onStats(event);
      // ROADMAP.md item 36: which retrieved note backs which sentence of a
      // direct-Q&A answer. Only ever sent for that path (routes_chat.py).
      else if (event.type === "grounding" && onGrounding) onGrounding(event);
      //: INBOX 320: the rows so far, sent each time a sentence completes, so
      //: a record can be numbered while the answer is still being written.
      //: Provisional: the `grounding` event above replaces them at the end.
      else if (event.type === "grounding_live" && onGroundingLive) onGroundingLive(event);
      //: The finished answer, sent only when the server trimmed a greeting or
      //: a sign-off off it (routes_chat.py, `trim_assistant_padding`). The
      //: stream has already drawn the untrimmed text, so this replaces it once
      //: rather than filtering every delta, which would flicker.
      else if (event.type === "answer_final" && onAnswerFinal) onAnswerFinal(event);
      // Sent only when a question found no notes at all, the notebook is
      // more than its notes, so the answer names what else mentions it
      // (routes_chat.py's `_related_elsewhere`).
      else if (event.type === "related" && onRelated) onRelated(event);
      // INBOX 272 part 1: Agent mode was asked for and the model couldn't
      // call tools, so it answered as a plain question instead. Silently
      // dropped before this (routes_chat.py used to `pass` on it); now it
      // carries the remedy in `message` and the caller shows it.
      else if (event.type === "unsupported" && onUnsupported) onUnsupported(event);
      else if (event.type === "error") {
        // The server caught something mid-stream and said so. Surfacing it
        // beats the silent truncation this used to be.
        throw new Error(event.message || "The answer stopped early.");
      }

      if (event.type === "tool" && event.ok === false) {
        recordBrowserLog("WARN", [
          `[Agent tool error] ${event.label || event.name || "?"}: ${event.error || "unknown error"}`,
        ]);
      }
    }
  }
}

// Live markdown while streaming. Re-parsing the WHOLE accumulated answer on
// every animation frame is what made long answers feel laggy (each frame
// rebuilt the entire DOM). We now coalesce updates to ~15fps and skip the
// work entirely when the text hasn't changed: smooth, and far less main-
// thread churn, so other animations (the typing dots) don't stutter.
const LIVE_RENDER_INTERVAL_MS = 66;
//: `afterPaint`, when given, runs after every paint: a paint rebuilds the box
//: from raw markdown, so anything written into it afterwards (the Ask tab's
//: citation markers, placed while the answer streams, INBOX 320) has to be
//: written again each time or it lasts a fifteenth of a second.
function liveMarkdownRenderer(box, afterPaint = null) {
  let latest = "";
  let rendered = null;
  let timer = null;
  let lastRun = 0;

  const flush = () => {
    timer = null;
    lastRun = performance.now();
    if (latest === rendered) return; // nothing new since last paint
    rendered = latest;
    renderMarkdown(box, latest);
    afterPaint?.();
  };

  const render = (text) => {
    latest = text;
    if (timer) return;
    const wait = Math.max(0, LIVE_RENDER_INTERVAL_MS - (performance.now() - lastRun));
    timer = setTimeout(flush, wait);
  };
  //: **The last paint has to be cancellable, or it lands after the turn is
  //: over.** Measured while fixing INBOX 40: a skill run's citation markers
  //: were placed correctly and then vanished within a frame or two, and this
  //: is what removed them. Every delta schedules a paint up to
  //: `LIVE_RENDER_INTERVAL_MS` in the future; the stream then ends,
  //: `finalise()` re-renders each step from its raw markdown and the caller
  //: puts the markers in, and *then* the timer that was already armed fires
  //: and repaints the box from `latest`, throwing them away again. Nothing
  //: about it is visible: the prose is identical, only the markers are gone,
  //: which is why it read as "citations do not work in a skill run" rather
  //: than as a race.
  render.stop = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    rendered = latest; // so a later call cannot decide it still owes a paint
  };
  return render;
}

// Ask ⇄ Stop while a stream is in flight.
function setAsking(active) {
  $("ask-btn").classList.toggle("hidden", active);
  $("stop-btn").classList.toggle("hidden", !active);
  $("question").disabled = active;
}

function stopAnswer() {
  if (askController) askController.abort();
}

function newChat() {
  conversation = [];
  lastQuestion = "";
  clearAskAnswerFoot();
  $("chat-results").classList.add("hidden");
  $("ask-idle")?.classList.remove("hidden");
  $("new-chat-btn").classList.add("hidden");
  $("ask-status").textContent = "";
  $("question").value = "";
  loadSuggestions();
}

// Echo the question above its answer. Without it, an answer that has been on
// screen a while, or one you scrolled back to, is a paragraph with no
// subject.
function renderAskedQuestion(question) {
  const holder = $("asked-question");
  if (!holder) return;
  holder.replaceChildren();
  if (!question) {
    holder.classList.add("hidden");
    return;
  }
  const label = document.createElement("span");
  label.className = "asked-label";
  label.textContent = "You asked: ";
  const text = document.createElement("span");
  text.className = "asked-text";
  text.textContent = question;
  holder.append(label, text);
  holder.classList.remove("hidden");
}

//: **What the Ask tab shows while the model works** (INBOX 298, the owner:
//: "there's no generating animation while the model is thinking and streaming
//: in the ask tab either"). Measured before this: 250 of 250 frames with the
//: answer actually streaming had nothing moving on them anywhere.
//:
//: Three separate holes, one shape. `#ask-status` was plain text, so the
//: whole turn was a sentence sitting still. The typing dots went into the
//: answer box and `onThinking` removes them on the first thinking delta, so
//: a model that streams its reasoning (which is what the owner runs) loses
//: the indicator before the answer even starts. And `.is-generating`, the
//: app's one universal "this is the thing producing the output" ring, was
//: added on the first *answer* token rather than when the work began.
//:
//: The Chat tab already solved all three and wrote down why (see
//: `bubble.classList.add("is-generating")` and its comment): the ring goes on
//: before the request and comes off in the `finally`, and a `progressLine`
//: lives for the whole turn. So this is two existing components called from a
//: surface that never called them, not a new control: DESIGN.md's recipe
//: index has no room for a second way of saying "working".
function askStatusText(text = "") {
  const status = $("ask-status");
  if (!status) return null;
  status.replaceChildren();
  status.textContent = text;
  return status;
}

//: Returns the progress line itself, because the caller drives it: `setStatus`
//: for the words and `setPhase("writing")` for the moment the dots become the
//: writing trace. A fresh one per turn, since the component owns timers that
//: stop themselves when it leaves the page.
//: **The progress line belongs in the bubble it is filling** (the owner,
//: 2026-09-21, with a screenshot: the dots, "The model is thinking..." and
//: the rotating line were drawn above the AI ANSWER heading while the bubble
//: underneath held a second set of dots and nothing else). `#ask-status` sits
//: above the whole answer block, so a status put there describes the answer
//: from outside it and reads as a message about the page. It goes into
//: `#ai-answer`, where the text it is a placeholder for will appear, and the
//: separate typing dots that used to fill the bubble are gone with it: one
//: indicator, in the place the answer arrives.
function askStatusBusy(text) {
  const box = $("ai-answer");
  if (!box) return null;
  $("ask-status")?.classList.remove("error");
  $("ask-status")?.replaceChildren();
  box.replaceChildren();
  const line = progressLine(text);
  box.appendChild(line);
  //: **And brought into view, because it is now further down the page than
  //: the old one was.** `#ask-status` sat directly under the question box, so
  //: it was always in sight; the answer bubble is below the asked question
  //: and below the thinking disclosure, which expands as the model reasons and
  //: pushes the bubble further down. Reported as "nothing happens except the
  //: send button changing to stop": the indicator was there and off screen,
  //: which is the same thing as not having one.
  requestAnimationFrame(() => {
    try {
      line.scrollIntoView({ block: "nearest", behavior: "smooth" });
    } catch {
      //: An older engine without the options object still gets the default.
      line.scrollIntoView();
    }
  });
  return line;
}

async function askQuestion(preset) {
  const status = $("ask-status");
  const questionBox = $("question");

  const question = (preset ?? questionBox.value).trim();
  if (!question) {
    //: Sentence case and no exclamation mark: DESIGN.md's copy rule, and
    //: `tests/test_no_em_dashes.py`'s neighbour rules exist because this one
    //: kept coming back.
    askStatusText("Type a question first.");
    status.classList.add("error");
    return;
  }
  lastQuestion = question;

  // A new answer is coming, hide the suggestion/recent chips and the
  // per-answer action buttons until it lands.
  $("suggested-questions").classList.add("hidden");
  hide("retry-btn", "copy-btn", "speak-btn");
  setAsking(true);
  status.classList.remove("error");
  // Reset the output areas for the new answer.
  const answerBox = $("ai-answer");
  const thinkingBox = $("thinking-box");
  const thinkingText = $("ai-thinking");
  renderAskedQuestion(question);
  answerBox.textContent = "";
  //: After the reset, not before it: the progress line lives inside the
  //: answer box now, so creating it first would only have it wiped.
  const progress = askStatusBusy(
    modelStatus && modelStatus.embedding_ready
      ? "Searching your notes by meaning…"
      : "Searching your notes…"
  );
  const say = (text) => (progress ? progress.setStatus(text) : askStatusText(text));
  $("ai-answer-grounding").replaceChildren();
  $("ai-answer-grounding").classList.add("hidden");
  //: The whole foot goes with it, not only the grounding chips: a sources
  //: disclosure left open from the previous question is a list of notes that
  //: have nothing to do with the one being asked.
  clearAskAnswerFoot();
  thinkingText.textContent = "";
  thinkingBox.classList.add("hidden");
  thinkingBox.open = false;

  //: **On before the request, off in the `finally`.** The ring marks the
  //: thing producing the output for as long as it is being produced: added on
  //: the first token instead, it says nothing during the wait that is the
  //: part actually worth marking, which is the Chat tab's own recorded bug
  //: one surface over.
  answerBox.classList.add("is-generating");
  let answerRaw = "";
  let stopped = false;
  let groundingRawResults = []; // set by onMeta, read by onGrounding
  let groundedSupport = null; // how much of the answer the notes backed
  //: Kept beyond the callback that receives them, because the answer element
  //: is rebuilt after the stream ends and the markers have to be put back.
  let groundedSentences = [];
  //: Kept for the same reason: the answer object (CHAT_PLAN decision 3) is
  //: built once, after the stream, from every event the turn produced, and
  //: three of those events arrive long before the last token.
  let relatedItems = [];
  let answerStats = null;
  let answerMeta = null;
  // The box explained itself instead of answering, so the final markdown
  // pass, the saved turn and the answer actions all sit this one out.
  let hinted = false;
  //: **Numbered while it streams** (INBOX 320, the owner: "the numbers only
  //: appear after the ai response is finished"). The backend now grounds each
  //: sentence as it completes and sends the rows so far (`grounding_live`);
  //: the records column is numbered from them at once, and the markers are
  //: put back into the prose after every live paint, which rebuilds it. The
  //: numbering is the same `citationNumbers` over the same source order the
  //: finished answer uses (`chatSourcesFrom` over this turn's meta), so a
  //: digit that appears mid-answer is the digit it keeps.
  let liveSources = null;
  const placeLiveCitations = () => {
    if (groundedSentences.length) {
      addInlineCitations(answerBox, groundedSentences, groundingRawResults, liveSources);
    }
  };
  const renderLive = liveMarkdownRenderer(answerBox, placeLiveCitations);
  askController = new AbortController();
  try {
    // Stream: raw results arrive first, then thinking/answer tokens live.
    await streamChat({
      question,
      history: conversation.slice(-MAX_CLIENT_HISTORY),
      // Sent per turn now that this box has its own picker. It always obeyed
      // the *saved* mode via the server's fallback; carrying it explicitly is
      // what makes changing the box's dropdown affect the very next answer
      // rather than only the one after the preference round-trips.
      mode: $("ask-mode-select")?.value || null,
      useTools: false, // the quick-ask box is pure Q&A; actions live in the Chat tab
      // This box interrogates the notebook and nothing else (§35A). Sent as a
      // flag rather than left to the classifier, which is right about "hey"
      // being small talk: it is this surface that doesn't want small talk.
      notesOnly: true,
      signal: askController.signal,
      onMeta: (meta) => {
        renderChatMeta(meta);
        answerMeta = meta;
        groundingRawResults = meta.raw_results || [];
        say("Reading your notes…");
      },
      onThinking: (delta) => {
        //: Only a stray placeholder, never the progress line itself: that is
        //: the thing saying what is happening, and it stays until the first
        //: answer token replaces it.
        for (const stray of answerBox.querySelectorAll(".typing-dots, .typing-label")) {
          if (!progress || !progress.contains(stray)) stray.remove();
        }
        // Auto-expand while the model reasons (user request).
        thinkingBox.classList.remove("hidden");
        thinkingBox.open = true;
        thinkingText.textContent += delta;
        keepAtBottom(thinkingText); // follow the reasoning, unless scrolled away
        say("The model is thinking…");
      },
      onAnswer: (delta) => {
        //: The first answer token is the moment "waiting" becomes "writing",
        //: so the indicator changes with it. `setPhase` is idempotent, so
        //: calling it on every delta costs nothing.
        answerBox.querySelector(".typing-dots")?.setPhase?.("writing");
        if (thinkingBox.open) thinkingBox.open = false; // reasoning done → tuck away
        answerRaw += delta;
        // Same caret the Chat tab's timeline gets, for the same reason, see
        // `.is-streaming` in 01-forms-settings.css. Set here rather than
        // before the request because the dots own the "nothing yet" state.
        answerBox.classList.add("is-streaming", "is-generating");
        renderLive(answerRaw); // markdown renders AS it streams (user request)
        //: The indicator changes shape with the stage, not only its words: a
        //: three-dot "thinking" animation beside the sentence "the model is
        //: writing" is the exact mismatch reported of the Chat tab.
        progress?.setPhase("writing");
        say("The model is writing…");
      },
      onHint: (event) => {
        // Not an answer, so it does not go through the markdown renderer or
        // into the conversation: it is the box explaining itself.
        hinted = true;
        renderAskHint(answerBox, event);
        askStatusText("");
      },
      //: Collected, not drawn: it is a field of the answer object and is
      //: rendered with the rest of the foot once the stream is over. Drawing
      //: it here is what put it inside `#ai-answer-grounding`, which the
      //: grounding event then cleared out from under it.
      onRelated: (event) => {
        relatedItems = event.items || [];
      },
      onStats: (event) => {
        answerStats = event;
      },
      //: The server took a greeting or a sign-off off the answer, so the text
      //: on screen is not the text anything else will use. Repainted from the
      //: trimmed version, and `answerRaw` moves with it: the grounding markers
      //: placed a moment later are offsets into *this* string.
      onAnswerFinal: (event) => {
        answerRaw = event.text || answerRaw;
        renderLive(answerRaw);
      },
      onGroundingLive: (event) => {
        groundedSentences = event.sentences || [];
        liveSources ??= chatSourcesFrom({ meta: answerMeta, toolEvents: [], touched: [] });
        numberMatchingRecords(
          $("ai-answer-grounding"),
          citationNumbers(groundedSentences, liveSources)
        );
        placeLiveCitations();
      },
      onGrounding: (event) => {
        //: **Remembered here, drawn once at the end.** This used to draw the
        //: chips and the markers the moment the event arrived, which is
        //: before the answer has finished streaming and before the Sources
        //: panel exists. Both were then wrong in the way the owner reported:
        //: the markers were placed into prose that was still growing (and
        //: thrown away by the final markdown pass a moment later), and the
        //: chips were numbered with nothing to agree with, so the digits did
        //: not match the panel the foot drew underneath them.
        groundedSentences = event.sentences || [];
        //: Remembered with them and drawn in the same pass, for the same
        //: reason: the answer is still streaming when this arrives, so a
        //: notice placed now would sit above prose that is still growing.
        groundedSupport = event.support || null;
      },
    });

    //: **The live renderer's armed paint is cancelled before anything else**
    //: (`liveMarkdownRenderer`'s own `stop`, and the same call the Chat tab's
    //: `finalise` has made since INBOX 40). Reported as *"grounding and
    //: in-text referencing not working now"* and, more precisely, *"doesn't
    //: stick"*: measured, the markers were placed, all three of them, and a
    //: `setTimeout` armed up to `LIVE_RENDER_INTERVAL_MS` before the stream
    //: ended then fired and repainted this box from the raw markdown, which
    //: removes every one of them. The prose is identical either way, so
    //: nothing about it looks like a race; only the little numbers go.
    //:
    //: The Ask tab was the one caller of this renderer that never stopped it.
    //: The fix is the call, not a delay: a timer cancelled cannot fire late,
    //: whereas a longer wait only makes the race rarer.
    renderLive.stop();
    // Final render (catches anything after the last animation frame).
    if (!hinted) renderMarkdown(answerBox, answerRaw);
    //: **And the citations go back in.** Reported: *"in the ask tab, no inline
    //: or grounding links to the notes viewed and referenced appear."* The
    //: markers were being inserted, `onGrounding` fires during the stream and
    //: `addInlineCitations` writes them straight into the answer, and then
    //: the line above rebuilt the whole answer element from the raw markdown
    //: and threw every one of them away. The grounding event arrives *before*
    //: `done`, so this was true of every answer that had any: the feature ran,
    //: correctly, and its output survived for a few milliseconds.
    //:
    //: Applied once, here, rather than during the stream, because the live
    //: render is what makes the answer readable as it arrives and the markers
    //: simply have to be the last thing written, against the finished text.
    if (!hinted) {
      conversation.push({ question, answer: answerRaw });
      show("retry-btn", "copy-btn", "speak-btn", "new-chat-btn");
      //: **The answer object, rendered** (CHAT_PLAN Phase 3). Built after the
      //: stream rather than updated event by event, because two of its fields
      //: (the sentences and the sources they came from) are only complete when
      //: the last event has arrived, and a foot that rearranges itself under a
      //: reader mid-answer is worse than one that appears when the answer does.
      //: Built before the grounding is drawn rather than after, so the chips
      //: and the markers can be numbered from the panel's own list of sources
      //: (`citationNumbers`). The Chat tab has done this since the panel
      //: existed; the Ask tab numbered each of the three for itself, which is
      //: the "numbers wont match the grounding" that was reported.
      const answer = answerObject({
        question,
        text: answerRaw,
        grounding: groundedSentences,
        meta: answerMeta,
        related: relatedItems,
        stats: answerStats,
      });
      if (groundedSentences.length) {
        renderAnswerGrounding(
          $("ai-answer-grounding"),
          groundedSentences,
          groundingRawResults,
          answerBox,
          question,
          answer.sources,
          groundedSupport
        );
      }
      renderAskAnswerFoot(answer, answerMeta);
      //: Not awaited: it is a second model call, and the answer is already on
      //: screen. The same contract `offerFollowups` has in the Chat tab.
      renderAskFollowups(question, answerRaw);
    }
    askStatusText("");
    // Asking changes both quick-access lists, and, for a real (non-hint)
    // answer: the browsable history too.
    loadRecentQuestions();
    loadMostUsed();
    if (!hinted) {
      loadAskHistoryBadge();
      if (askHistoryOpen) loadAskHistoryPage(true);
    }
  } catch (error) {
    if (error.name === "AbortError") {
      stopped = true;
      //: Same reason as the success path above: Stop is an exit too, and an
      //: armed paint outlives the turn it belongs to.
      renderLive.stop();
      renderMarkdown(answerBox, answerRaw); // keep what streamed so far
      askStatusText("Stopped.");
      show("retry-btn", "copy-btn", "speak-btn");
    } else {
      askStatusText(error.message);
      status.classList.add("error");
    }
  } finally {
    // Every exit path, including Stop and an error: a caret still blinking on
    // an answer that stopped arriving is worse than never showing one.
    answerBox.classList.remove("is-streaming", "is-generating");
    askController = null;
    setAsking(false);
    // The question used to be cleared here, which left an answer on screen with
    // nothing saying what it answered (user-reported). It stays in the box, 
    // ready to refine and re-ask, and is echoed above the answer so the pair
    // reads together even after you start typing the next one.
    if (!stopped) questionBox.select();
  }
}

function retryAnswer() {
  if (lastQuestion) askQuestion(lastQuestion);
}

async function copyAnswer() {
  if (await copyToClipboard($("ai-answer").textContent)) toast("Answer copied.");
}

// --- suggested questions (Round 1) ----------------------------------------------

async function loadSuggestions() {
  const box = $("suggested-questions");
  // Only meaningful before the first answer of a conversation.
  if (!$("chat-results").classList.contains("hidden")) return;
  const picks = await apiJson("/chat/suggestions").catch(() => []);
  box.replaceChildren();
  box.classList.toggle("hidden", picks.length === 0);
  if (picks.length === 0) return;
  const label = document.createElement("span");
  label.className = "muted";
  label.textContent = "Try asking:";
  box.appendChild(label);
  for (const question of picks) {
    const chipEl = chip(question, "", () => askQuestion(question));
    box.appendChild(chipEl);
  }
}

// --- Ask history: browse back through every notes-only question, not just
// the last five as reask chips. Requested directly: "I want the ask feature
// to be basically a personal notes browser." Every turn behind this panel
// was already written server-side by chat_stream (routes_ask_history.py);
// this is read, search, pin, delete and "reopen" only. ---------------------

let askHistoryOpen = false;
let askHistoryOffset = 0;
let askHistoryTotal = 0;
const ASK_HISTORY_PAGE = 20;

async function loadAskHistoryBadge() {
  const badge = $("ask-history-badge");
  if (!badge) return;
  const stats = await apiJson("/ask-history/stats").catch(() => null);
  if (!stats || !stats.total) {
    badge.classList.add("hidden");
    return;
  }
  badge.textContent = stats.total > 99 ? "99+" : String(stats.total);
  badge.classList.remove("hidden");
}

function askHistoryRow(turn) {
  const li = document.createElement("li");
  li.className = "ask-history-item";
  li.dataset.id = turn.id;
  li.tabIndex = 0;
  li.setAttribute("role", "button");
  li.title = "Open this question and its answer";

  const head = document.createElement("div");
  head.className = "ask-history-item-head";
  const question = document.createElement("span");
  question.className = "ask-history-question";
  question.textContent = turn.question;
  head.appendChild(question);

  const actions = document.createElement("span");
  actions.className = "ask-history-actions";
  const pinBtn = document.createElement("button");
  pinBtn.type = "button";
  pinBtn.className = "icon-btn ask-history-pin" + (turn.pinned ? " active" : "");
  pinBtn.title = turn.pinned ? "Unpin" : "Pin so this survives Clear";
  pinBtn.setAttribute("aria-label", turn.pinned ? "Unpin question" : "Pin question");
  setLabel(pinBtn, turn.pinned ? "ph:push-pin-slash" : "ph:push-pin");
  pinBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleAskHistoryPin(turn.id, !turn.pinned);
  });
  const delBtn = document.createElement("button");
  delBtn.type = "button";
  delBtn.className = "icon-btn ask-history-delete";
  delBtn.title = "Delete this question";
  delBtn.setAttribute("aria-label", "Delete question");
  delBtn.innerHTML = '<i class="ph ph-trash" aria-hidden="true"></i>';
  delBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    deleteAskHistoryTurn(turn.id);
  });
  actions.append(pinBtn, delBtn);
  head.appendChild(actions);
  li.appendChild(head);

  const meta = document.createElement("div");
  meta.className = "ask-history-meta muted";
  const parts = [relativeTime(turn.created_at)];
  if (turn.result_count) {
    parts.push(`${turn.result_count} note${turn.result_count === 1 ? "" : "s"}`);
  }
  meta.textContent = parts.join(" · ");
  li.appendChild(meta);

  if (turn.answer_preview) {
    const preview = document.createElement("p");
    preview.className = "ask-history-preview";
    preview.textContent = turn.answer_preview;
    li.appendChild(preview);
  }

  const open = () => viewAskHistoryTurn(turn.id);
  li.addEventListener("click", open);
  li.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      open();
    }
  });
  return li;
}

async function loadAskHistoryPage(reset) {
  if (reset) askHistoryOffset = 0;
  const list = $("ask-history-list");
  const params = new URLSearchParams({
    limit: String(ASK_HISTORY_PAGE),
    offset: String(askHistoryOffset),
  });
  const q = $("ask-history-search")?.value.trim();
  if (q) params.set("q", q);
  if ($("ask-history-pinned-only")?.checked) params.set("pinned_only", "true");
  const body = await apiJson(`/ask-history?${params}`).catch(() => null);
  if (!body) return;
  askHistoryTotal = body.total;
  if (reset) list.replaceChildren();
  for (const turn of body.turns) list.appendChild(askHistoryRow(turn));
  askHistoryOffset += body.turns.length;
  $("ask-history-empty").classList.toggle("hidden", askHistoryOffset > 0);
  $("ask-history-more").classList.toggle("hidden", askHistoryOffset >= askHistoryTotal);
}

function toggleAskHistoryPanel() {
  askHistoryOpen = !askHistoryOpen;
  $("ask-history-panel").classList.toggle("hidden", !askHistoryOpen);
  $("ask-history-toggle").setAttribute("aria-expanded", String(askHistoryOpen));
  if (askHistoryOpen) loadAskHistoryPage(true);
}

// Reopen a past turn exactly where a live answer renders, no re-asking the
// model, which is the whole point of this being a browser and not a search
// box that happens to remember your last five questions.
async function viewAskHistoryTurn(id) {
  const turn = await apiJson(`/ask-history/${id}`).catch(() => null);
  if (!turn) {
    toast("That question is no longer in your history.", true);
    return;
  }
  $("suggested-questions").classList.add("hidden");
  $("question").value = turn.question;
  lastQuestion = turn.question;
  renderAskedQuestion(turn.question);
  const answerBox = $("ai-answer");
  renderMarkdown(answerBox, turn.answer);
  $("ai-answer-grounding").replaceChildren();
  $("ai-answer-grounding").classList.add("hidden");
  clearAskAnswerFoot();
  $("thinking-box").classList.add("hidden");
  //: **A reopened turn is the answer object, not a paragraph of its text**
  //: (INBOX 241, the owner: "the grounding, intext numbered referencing, and
  //: sources that appeared in the ask subtab in notes, dissappeared on reload
  //: and didnt persist. they didnt persist when I reaccessed them through the
  //: history panel"). The two clears above are still right, they are what
  //: takes the *previous* answer's foot down, and until now nothing put this
  //: one's back up: the panel redrew the prose, the results and the badges and
  //: stopped, so every citation and every source card was lost the moment a
  //: turn was browsed rather than asked.
  //:
  //: Built from the same two calls the live path ends on,
  //: `renderAnswerGrounding` (which puts the numbered markers into the answer
  //: itself as well as drawing the chip row that is their key) and the foot
  //: from `answerObject`. The live path calls `addInlineCitations` a second
  //: time after those, and this deliberately does not: there it is a repair,
  //: its final `renderMarkdown` rebuilds the answer element and throws the
  //: markers away, whereas here the markdown is rendered *before* the
  //: grounding, so the markers are already the last thing written. Calling it
  //: again would mark every grounded sentence twice, the walker's `placed` set
  //: being per call and the guard only skipping text already inside a marker.
  //: `meta` carries only `raw_results` because that is all `chatSourcesFrom`
  //: reads for a notes-only turn, which every Ask turn is.
  //:
  //: What is deliberately *not* rebuilt: the follow-up chips and the stats
  //: line. Both are a fresh model call and a live timing, neither belongs to
  //: the turn being reopened, and `setAnsweredBy` below already says this is
  //: a remembered answer rather than one just written.
  //: **The records first, then what reads them** (the owner, 2026-09-24: a
  //: reopened question lost its record numbers and grew a Sources box of
  //: the same notes). `numberMatchingRecords` and `askNotesOnTheRight`
  //: both read `#raw-results`, and this used to fill it after both ran.
  const rawList = $("raw-results");
  rawList.replaceChildren();
  // Same badges as a live Ask answer: this turn's own match_info/connected_ids
  // were saved alongside it (routes_chat.py's _save_ask_turn) for exactly
  // this reason: browsing back shouldn't lose the "why" a result showed up.
  const connected = new Set(turn.connected_ids || []);
  const matchInfo = turn.match_info || {};
  for (const entry of turn.raw_results) {
    const row = clickableResult(entry);
    const badge = matchReasonBadge(matchInfo[entry.id]);
    if (badge) {
      if (connected.has(entry.id)) row.classList.add("result-connected");
      if (matchInfo[entry.id]?.type === "connected_2hop") row.classList.add("result-connected-2hop");
      row.appendChild(badge);
    }
    rawList.appendChild(row);
  }
  if (turn.omitted_results) {
    const li = document.createElement("li");
    li.className = "muted";
    li.textContent =
      turn.omitted_results === 1
        ? "1 note from this answer is no longer available (deleted or made private since)."
        : `${turn.omitted_results} notes from this answer are no longer available (deleted or made private since).`;
    rawList.appendChild(li);
  }
  const groundingRows = turn.grounding || [];
  const historyMeta = { raw_results: turn.raw_results || [] };
  //: Built first, for its `sources`: a reopened turn numbers its markers,
  //: chips and panel rows together, the same way the live path does.
  const remembered = answerObject({
    question: turn.question,
    text: turn.answer,
    grounding: groundingRows,
    meta: historyMeta,
  });
  if (groundingRows.length) {
    renderAnswerGrounding(
      $("ai-answer-grounding"),
      groundingRows,
      historyMeta.raw_results,
      answerBox,
      turn.question,
      remembered.sources,
      //: The stored turn's support (`routes_ask_history.py`), so a reopened
      //: answer keeps the low-support notice the live one had.
      turn.support || null
    );
  }
  renderAskAnswerFoot(remembered, historyMeta);
  $("ai-thinking").textContent = "";
  //: A remembered turn says *when* rather than *what by*: the model that
  //: answered it may not even be installed any more. The tooltip carries the
  //: same fact spelled out, since the chip is ellipsised.
  setAnsweredBy(`asked ${relativeTime(turn.created_at)}`, `Asked ${relativeTime(turn.created_at)}`);
  $("search-mode").textContent = SEARCH_MODE_LABELS[turn.search_mode] || turn.search_mode;
  document.querySelector(".chat-half:last-child")?.classList.remove("hidden");
  $("chat-results").classList.remove("hidden");
  $("ask-idle")?.classList.add("hidden");
  $("ask-status").textContent = "";
  show("retry-btn", "copy-btn", "speak-btn", "new-chat-btn");
}

async function toggleAskHistoryPin(id, pinned) {
  await apiJson(`/ask-history/${id}/pin?pinned=${pinned}`, { method: "PUT" }).catch(() => null);
  loadAskHistoryPage(true);
}

async function deleteAskHistoryTurn(id) {
  // Permanent: no restore endpoint behind this one, unlike a note's bin.
  // "Clear all" right next to this already confirms; a single turn deleted
  // by the same one-click miss deserves the same guard, not less.
  if (!(await confirmDialog("Delete this question and answer?"))) return;
  await apiJson(`/ask-history/${id}`, { method: "DELETE" }).catch(() => null);
  loadAskHistoryPage(true);
  loadAskHistoryBadge();
}

async function clearAskHistory() {
  const ok = await confirmDialog(
    "Clear your question history?\n\nPinned questions are kept. This cannot be undone for the rest.",
    { confirmLabel: "Clear history", danger: true }
  );
  if (!ok) return;
  await apiJson("/ask-history", { method: "DELETE" }).catch(() => null);
  loadAskHistoryPage(true);
  loadAskHistoryBadge();
}
