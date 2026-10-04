// router.js: every view has an address (WORLD_CLASS_PLAN 22.1 item 1).
//
// "No URLs. Every view is `/`. Reload always lands on the Dashboard, the
// browser's Back leaves the app, a note or chat cannot be linked or
// bookmarked, and `document.title` never names the view." This file gives
// each view a hash (`#/notes/12`, `#/chat/45`, `#/docs/7`, `#/library/images`,
// `#/settings/appearance`) and keeps three things in step:
//
//   - navigation.js's own back stack, which stays the source of truth for
//     what a step *is* (a tab, a sub-tab, a document, a board) and how to go
//     back to one (`openHistoryEntry`). Its comment explains why pushState was
//     refused ("Back would walk out of the app on the first press past the
//     start"); that was right with no router, and the answer here is that the
//     browser's entries are now this app's own views, each carrying the id of
//     the stack entry it mirrors, so the browser's Back and the in-app Back
//     are one walk through one list;
//   - the address bar: a new view is pushed, a refinement of the same view
//     (a sub-tab settling, a note's title arriving) replaces;
//   - the window title: "Half marathon, week 4 · Notes · MemoryMap AI".
//
// `popstate` drives navigation: the in-app Back and Forward call
// `history.go`, the browser answers with `popstate`, and this file opens the
// entry that state names. A hash with no entry behind it (a pasted link, a
// bookmark, one typed by hand) is opened as a fresh visit. A hash that is not
// a route at all (a document's heading anchor, `#intro`) is left alone.
//
// Loaded right after navigation.js; nothing here runs at load except the
// listener and remembering the address the page was opened with, which the
// boot opens once the notebook is unlocked (`routerRestore`, app.js).

const ROUTE_TABS = { dashboard: "dashboard", notes: "notes", chat: "chat", docs: "documents", library: "library", graph: "graph", timeline: "timeline", reminders: "reminders", settings: "settings" };
const ROUTE_NOTES_SECTIONS = ["capture", "writing-room", "ask"];
//: The Library's sub-tabs by the word the address uses. Images and Files are
//: one view (`library-view-media`) in two kinds, so their sections carry the
//: kind; "All" is the view whose id kept the old name, documents.
const ROUTE_LIBRARY = { all: "library-view-documents", documents: "library-view-docs", boards: "library-view-whiteboard", images: "library-view-media:images", files: "library-view-media:files", skills: "library-view-skills", links: "library-view-links", contents: "library-view-contents" };

//: The hash for one history entry (`{tab, section}`, navigation.js).
function routeHash(entry) {
  const tab = entry && entry.tab;
  const section = entry && entry.section != null ? String(entry.section) : "";
  const id = (prefix) => (section.startsWith(prefix) ? section.slice(prefix.length) : "");
  switch (tab) {
    case "notes":
      if (id("note:")) return `#/notes/${id("note:")}`;
      return ROUTE_NOTES_SECTIONS.includes(section) ? `#/notes/${section}` : "#/notes";
    case "chat":
      return id("conv:") ? `#/chat/${id("conv:")}` : "#/chat";
    case "documents":
      return id("doc:") ? `#/docs/${id("doc:")}` : "#/docs";
    case "library":
      if (id("board:")) return `#/library/board/${id("board:")}`;
      {
        const word = Object.keys(ROUTE_LIBRARY).find((key) => ROUTE_LIBRARY[key] === section);
        return word ? `#/library/${word}` : "#/library";
      }
    case "graph":
      return id("focus:") ? `#/graph/focus/${id("focus:")}` : "#/graph";
    case "settings":
      return section ? `#/settings/${section}` : "#/settings";
    default:
      return ROUTE_TABS[tab] === tab ? `#/${tab}` : "#/dashboard";
  }
}

//: The entry a hash names, or null when the hash is not a route (an empty
//: one, an in-page anchor, a tab that does not exist, an id that is not one).
function routeEntry(hash) {
  const match = /^#\/([a-z-]+)(?:\/(.*))?$/.exec(String(hash || ""));
  if (!match) return null;
  const tab = ROUTE_TABS[match[1]];
  if (!tab) return null;
  const rest = match[2] || "";
  const number = (text) => (/^\d+$/.test(text) ? text : null);
  if (!rest) return { tab, section: null };
  switch (tab) {
    case "notes":
      if (ROUTE_NOTES_SECTIONS.includes(rest)) return { tab, section: rest };
      return number(rest) ? { tab, section: `note:${rest}` } : null;
    case "chat":
      return number(rest) ? { tab, section: `conv:${rest}` } : null;
    case "documents":
      return number(rest) ? { tab, section: `doc:${rest}` } : null;
    case "library": {
      const board = /^board\/(\d+)$/.exec(rest);
      if (board) return { tab, section: `board:${board[1]}` };
      return ROUTE_LIBRARY[rest] ? { tab, section: ROUTE_LIBRARY[rest] } : null;
    }
    case "graph": {
      const focus = /^focus\/(\d+)$/.exec(rest);
      return focus ? { tab, section: `focus:${focus[1]}` } : null;
    }
    case "settings":
      return /^[a-z-]+$/.test(rest) ? { tab, section: rest } : null;
    default:
      return null;
  }
}

//: What the window title calls a view.
const ROUTE_VIEW_NAMES = { dashboard: "Dashboard", notes: "Notes", chat: "Chat", documents: "Documents", library: "Library", graph: "Graph", timeline: "Timeline", reminders: "Reminders", settings: "Settings" };

//: The address the page was opened with, read before anything below rewrites
//: it: the boot's own first visit (the Dashboard) replaces the address, and
//: the view that was asked for is opened after the unlock.
const routerBootHash = location.hash;
//: True while this file is opening an entry: the visits that opening makes
//: are the same view, so they replace rather than push.
let routerReplacing = false;
let routerNextId = 1;

//: The window's title for an entry: the open thing (a note, a document, a
//: conversation, a board), the view, and the app's name (`setTitleView`,
//: status.js, keeps the notification count in front of all three).
function routerPaintTitle(entry) {
  if (typeof setTitleView !== "function" || !entry) return;
  const view = ROUTE_VIEW_NAMES[entry.tab] || "";
  let item = entry.section && typeof historyTitles !== "undefined" ? historyTitles.get(entry.section) || "" : "";
  //: A sub-tab by the word its address uses (Images, Capture, Appearance).
  if (!item && entry.section) {
    const word = entry.tab === "library"
      ? Object.keys(ROUTE_LIBRARY).find((key) => ROUTE_LIBRARY[key] === entry.section)
      : entry.tab === "settings" || ROUTE_NOTES_SECTIONS.includes(entry.section) ? entry.section : "";
    if (word) item = word.charAt(0).toUpperCase() + word.slice(1).replace(/-/g, " ");
  }
  setTitleView([item, view].filter(Boolean).join(" · "));
}

//: A visit navigation.js has just recorded (`pushed`: a new entry; else the
//: entry on top was refined in place). Mirrored into the browser's history
//: with the stack entry's id, so a `popstate` can find it again.
function routerOnVisit(entry, pushed) {
  if (!entry) return;
  if (!entry.navId) entry.navId = routerNextId++;
  const hash = routeHash(entry);
  const state = { navId: entry.navId };
  const url = `${location.pathname}${location.search}${hash}`;
  try {
    if (pushed && !routerReplacing && history.state && history.state.navId) history.pushState(state, "", url);
    else history.replaceState(state, "", url);
  } catch {
    // A sandboxed or file: page can refuse; the in-app stack still works.
  }
  routerPaintTitle(entry);
}

//: The in-app Back and Forward, through the browser's own history, so the
//: two cannot disagree: `history.go` answers with `popstate`, below. Only
//: when the entry on screen is one this file mirrored; otherwise (a history
//: the browser does not have, a page that refused pushState) the stack walks
//: on its own, the way it did before there was a router.
function routerGo(delta) {
  const here = tabHistory.stack[tabHistory.index];
  if (!delta || !here || !history.state || history.state.navId !== here.navId) return false;
  history.go(delta);
  return true;
}

//: Open a view named by an address that has no entry behind it: a pasted
//: link, a bookmark, a hash typed by hand, a reload. A fresh visit, opened by
//: the same code the history walk uses, replacing the address it came from.
async function routerOpen(entry) {
  if (!entry || typeof openHistoryEntry !== "function") return false;
  routerReplacing = true;
  try {
    await openHistoryEntry(entry);
  } finally {
    routerReplacing = false;
  }
  return true;
}

window.addEventListener("popstate", async (event) => {
  const navId = event.state && event.state.navId;
  const index = navId ? tabHistory.stack.findIndex((entry) => entry.navId === navId) : -1;
  if (index >= 0) {
    await goToTabHistory(index, { fromBrowser: true });
    routerPaintTitle(tabHistory.stack[tabHistory.index]);
    return;
  }
  const entry = routeEntry(location.hash);
  if (entry) await routerOpen(entry);
});

//: The boot's half (app.js, once the notes are in): the view the page was
//: opened with, if it named one other than where the app starts. True when
//: it opened one, so the boot does not also reload the Dashboard over it.
async function routerRestore() {
  const entry = routeEntry(routerBootHash);
  if (!entry || (entry.tab === "dashboard" && !entry.section)) return false;
  return routerOpen(entry);
}

//: Settings closed by its own X or Escape rather than by a step through
//: history: the address and the title name the tab it was over again. The
//: history entry is kept (Back from here still steps past it), only what it
//: shows is corrected.
function routerSettle() {
  if (!/^#\/settings/.test(location.hash)) return;
  const entry = { tab: localStorage.getItem("activeTab") || "dashboard", section: null };
  try {
    history.replaceState(history.state, "", `${location.pathname}${location.search}${routeHash(entry)}`);
  } catch {
    // As in routerOnVisit.
  }
  routerPaintTitle(entry);
}
