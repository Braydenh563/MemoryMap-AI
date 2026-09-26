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
