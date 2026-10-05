// whiteboard-history.js: a board's time machine (2026-10-05, the features
// audit's W2; WHITEBOARD_PLAN decision 33).
//
// Board, History… puts a slider at the foot of the board over its event log
// (`routes_board_history.py`): drag it back and the board is drawn as it was
// then, a moment at a time (a moment is a run of changes no longer than two
// minutes); the two buttons put the whole board back, or only what was
// selected when History opened, as one Undo step; the X, Esc or the slider's
// far right end come back to now.
//
// **A preview is the real renderer drawing the past.** `wbState` is swapped
// for the moment's rows and the board renders as usual, so a past board
// looks exactly like a board, maps included. Nothing may write while it is
// shown: the board's layers take no pointer (the presenting host class,
// does), the board's keys are held off (a capture listener, as presenting
// does), and any write to `/whiteboard/` that slips through is refused
// before it is sent (`wbHistGuard`), so no path can save a past row over a
// present one. Closing fetches the board afresh, so whatever changed on it
// meanwhile (an agent, another tab) is what comes back.
//
// Loaded in the Library bundle after whiteboard-interchange.js
// (`LAZY_MODULES`); its top level is this file's one state object and its
// listeners.

const wbHist = {
  open: false,
  boardId: null,
  moments: [],
  more: false,
  pos: 0,
  keys: [],
  token: 0,
  timer: 0,
  shown: null,
  focus: null,
  realApi: null,
};

const WB_HIST_BAR = "wb-history-bar";

function wbHistBoardParam() {
  return `board_id=${wbHist.boardId ?? 0}`;
}

//: The moment the slider is on, or null at its right end (now). The slider
//: runs oldest (0) to now (`moments.length`); `moments` is newest first.
function wbHistMoment(pos = wbHist.pos) {
  const n = wbHist.moments.length;
  return pos >= n ? null : wbHist.moments[n - 1 - pos] || null;
}

//: "12 minutes ago: 3 added, 1 changed", from the moment's own counts.
function wbHistWords(moment) {
  if (!moment) return "Now";
  const parts = [];
  if (moment.added) parts.push(`${moment.added} added`);
  if (moment.changed) parts.push(`${moment.changed} changed`);
  if (moment.removed) parts.push(`${moment.removed} removed`);
  const when = relativeTime(moment.at);
  return `${when}: ${parts.join(", ") || "a change"}${moment.kept ? "" : " (not kept in full)"}`;
}

//: Writes to the board refused while the past is on screen, before they go.
function wbHistGuard(on) {
  if (on && !wbHist.realApi) {
    const real = window.apiJson;
    wbHist.realApi = real;
    window.apiJson = (path, options = {}) => {
      const method = String(options.method || "GET").toUpperCase();
      if (wbHist.open && method !== "GET" && /^\/whiteboard\//.test(String(path))) {
        toast("The board is showing an earlier version. Put it back, or press Esc to come back to now.");
        return Promise.reject(new Error("The board is showing an earlier version."));
      }
      return real(path, options);
    };
  } else if (!on && wbHist.realApi) {
    window.apiJson = wbHist.realApi;
    wbHist.realApi = null;
  }
}

function wbHistSync() {
  const slider = document.getElementById("wb-history-slider");
  const when = document.getElementById("wb-history-when");
  const moment = wbHistMoment();
  const words = wbHistWords(moment);
  if (slider) {
    slider.max = String(wbHist.moments.length);
    slider.value = String(wbHist.pos);
    slider.setAttribute("aria-valuetext", words);
  }
  if (when) {
    when.textContent = words;
    when.title = moment ? new Date(moment.at).toLocaleString() : "";
  }
  const canRestore = Boolean(moment && moment.kept && wbHist.shown === moment.id);
  const whole = document.getElementById("wb-history-restore");
  const some = document.getElementById("wb-history-restore-selection");
  if (whole) whole.disabled = !canRestore;
  if (some) some.disabled = !canRestore || !wbHist.keys.length;
}

async function wbOpenHistory() {
  if (wbHist.open) return;
  const boardId = window.currentBoardId ?? null;
  let page = null;
  try {
    page = await apiJson(`/whiteboard/history?board_id=${boardId ?? 0}`);
  } catch (error) {
    toast(error.message || "The board's history could not be read.", true);
    return;
  }
  if (!page?.moments?.length) {
    toast("Nothing has changed on this board yet, so there is no earlier version to go back to.");
    return;
  }
  Object.assign(wbHist, {
    open: true,
    boardId,
    moments: page.moments,
    more: Boolean(page.more),
    pos: page.moments.length,
    keys: [...wbSelectedKeys()],
    shown: null,
    focus: document.activeElement,
  });
  clearWbSelection();
  wbHistGuard(true);
  document.getElementById("library-view-whiteboard")?.classList.add("wb-presenting");
  document.getElementById(WB_HIST_BAR)?.classList.remove("hidden");
  wbHistSync();
  wbAnnounce(`History: ${page.moments.length} moments. Drag the slider or press the Left arrow to go back.`);
  document.getElementById("wb-history-slider")?.focus({ preventScroll: true });
}

//: Older moments, when the slider reaches the oldest one loaded.
async function wbHistLoadOlder() {
  if (!wbHist.more || !wbHist.moments.length) return;
  const oldest = wbHist.moments[wbHist.moments.length - 1];
  let page = null;
  try {
    page = await apiJson(`/whiteboard/history?${wbHistBoardParam()}&before=${oldest.first_id}`);
  } catch {
    return;
  }
  if (!wbHist.open || !page?.moments?.length) {
    wbHist.more = false;
    return;
  }
  wbHist.moments = [...wbHist.moments, ...page.moments];
  wbHist.more = Boolean(page.more);
  wbHist.pos += page.moments.length;
  wbHistSync();
}

//: Show slider position `pos`: the moment's rows, drawn by the board, or now.
//: Debounced, and a reply that arrives after a newer request is dropped.
function wbHistShow(pos) {
  if (!wbHist.open) return;
  wbHist.pos = Math.max(0, Math.min(wbHist.moments.length, pos));
  wbHist.shown = null;
  wbHistSync();
  clearTimeout(wbHist.timer);
  const token = ++wbHist.token;
  wbHist.timer = setTimeout(async () => {
    const moment = wbHistMoment();
    if (!moment) {
      await fetchWhiteboardState();
      if (token !== wbHist.token || !wbHist.open) return;
      renderWhiteboardNow();
      wbHistSync();
      return;
    }
    if (wbHist.pos === 0) wbHistLoadOlder();
    if (!moment.kept) return;
    let rows = null;
    try {
      rows = await apiJson(`/whiteboard/history/${moment.id}?${wbHistBoardParam()}`);
    } catch (error) {
      if (token === wbHist.token) toast(error.message || "That moment could not be read.", true);
      return;
    }
    if (token !== wbHist.token || !wbHist.open) return;
    wbState = { ...wbState, nodes: rows.nodes || [], sketches: rows.sketches || [], objects: rows.objects || [] };
    renderWhiteboardNow();
    wbHist.shown = moment.id;
    wbHistSync();
  }, 120);
}

async function wbCloseHistory({ refetch = true } = {}) {
  if (!wbHist.open) return;
  clearTimeout(wbHist.timer);
  wbHist.token += 1;
  wbHist.open = false;
  wbHistGuard(false);
  document.getElementById("library-view-whiteboard")?.classList.remove("wb-presenting");
  document.getElementById(WB_HIST_BAR)?.classList.add("hidden");
  if (refetch && (window.currentBoardId ?? null) === wbHist.boardId) {
    await fetchWhiteboardState();
    renderWhiteboardNow();
  }
  const focus = wbHist.focus;
  wbHist.focus = null;
  (focus && document.contains(focus) ? focus : document.getElementById("whiteboard-container"))?.focus?.({ preventScroll: true });
}

//: Put the board, or only what was selected, back as it was at the moment
//: shown: one request, then the board read afresh inside a recorded gesture,
//: so the whole restore is one Undo step (`wbRecordGesture`).
async function wbHistRestore(onlySelection) {
  const moment = wbHistMoment();
  if (!moment || wbHist.shown !== moment.id) return;
  const keys = onlySelection ? [...wbHist.keys] : null;
  if (onlySelection && !keys.length) return;
  const words = wbHistWords(moment).split(":")[0];
  const asked = onlySelection
    ? `Put the ${keys.length === 1 ? "selected item" : `${keys.length} selected items`} back as ${keys.length === 1 ? "it was" : "they were"} ${words}?`
    : `Put the whole board back as it was ${words}?`;
  if (!(await confirmDialog(`${asked}\n\nUndo (Ctrl+Z) takes it back, and the change is in the history too.`))) return;
  const boardId = wbHist.boardId;
  await wbCloseHistory({ refetch: false });
  if ((window.currentBoardId ?? null) !== boardId) return;
  //: The board as it is now, before the gesture reads it: the past rows
  //: are still in `wbState` until this.
  await fetchWhiteboardState();
  let counts = null;
  try {
    await wbRecordGesture(async () => {
      counts = await apiJson(`/whiteboard/history/${moment.id}/restore?board_id=${boardId ?? 0}`, {
        method: "POST",
        body: JSON.stringify({ keys }),
      });
      await fetchWhiteboardState();
    });
  } catch (error) {
    toast(error.message || "The board could not be put back.", true);
    await fetchWhiteboardState();
    renderWhiteboardNow();
    return;
  }
  renderWhiteboardNow();
  const done = counts ? [counts.made && `${counts.made} made`, counts.changed && `${counts.changed} changed`, counts.removed && `${counts.removed} removed`].filter(Boolean).join(", ") : "";
  const said = `${onlySelection ? "Selection" : "Board"} put back as it was ${words}${done ? `: ${done}` : ""}. Ctrl+Z undoes it.`;
  wbAnnounce(said);
  toast(said);
}

//: While History is open the keys are its own, ahead of the board's
//: (capture, on the window, as presenting does): the arrows step the
//: moments, Home and End go to the oldest and to now, Esc comes back to now,
//: and nothing else reaches the board (a tool letter, Delete, Ctrl+Z).
window.addEventListener("keydown", (event) => {
  if (!wbHist.open) return;
  const inBar = Boolean(event.target.closest?.(`#${WB_HIST_BAR}`));
  if (event.key === "Escape") {
    event.preventDefault();
    event.stopImmediatePropagation();
    wbCloseHistory();
    return;
  }
  if (event.key === "Tab") return;
  if (inBar) {
    //: The slider's own keys move it (an input event follows); a button's
    //: Enter and Space press it. Only the board's listeners are held off.
    event.stopImmediatePropagation();
    return;
  }
  event.stopImmediatePropagation();
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  const step = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 }[event.key];
  if (step) {
    event.preventDefault();
    wbHistShow(wbHist.pos + step);
  } else if (event.key === "Home") {
    event.preventDefault();
    wbHistShow(0);
  } else if (event.key === "End") {
    event.preventDefault();
    wbHistShow(wbHist.moments.length);
  }
}, true);

document.addEventListener("input", (event) => {
  if (event.target?.id === "wb-history-slider") wbHistShow(Number(event.target.value));
});

document.addEventListener("click", (event) => {
  const button = event.target.closest?.(`#${WB_HIST_BAR} button`);
  if (!button || !wbHist.open || button.disabled) return;
  if (button.id === "wb-history-end") wbCloseHistory();
  else if (button.id === "wb-history-restore") wbHistRestore(false);
  else if (button.id === "wb-history-restore-selection") wbHistRestore(true);
});
