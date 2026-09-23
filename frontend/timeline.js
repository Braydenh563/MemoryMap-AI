// timeline.js: the Timeline tab, the feed, the table view, the density
// scrubber, the kind chips and the daily page (split out of app.js, the
// fifth boot-time file after editor.js, dashboard.js and settings.js).
//
// Why now: `tests/test_static_compression.py` bounds the gzipped app.js as a
// smoke test against a runaway file, and it had been raised twice (600 KB,
// then 700 KB, then 750 KB); on 2026-09-23 it went red again at 750,706
// bytes. The test's own comment says a third raise should not be written and
// the split should be done instead (SESSION_BRIEFS Brief 33), so this is the
// split. Moved verbatim: every line below the header is the text app.js had
// between "// --- Timeline (§10B" and "// --- Notes sub-tabs", except the
// two pieces named under "stayed in app.js" at the end of this header.
//
// Loaded after app.js (see index.html's <script> ordering comment): every
// reference here into app.js globals ($, apiJson, switchTab, chip,
// smallButton, selectedIds, selectMode, parseServerTime, renderMarkdown,
// stripMarkdownPreview, showNotesSection, openLightbox, batchTag,
// batchDelete, exitSelectMode, and more) and into the lazy bundles
// (openDocument, openWhiteboardBoard, renderGraph, each behind app.js's
// LAZY_ENTRY_POINTS stand-ins) is either a runtime call inside a function body
// or an event-listener closure, or, for the handful of top-level statements
// in this file, a read of something app.js has already defined by the time
// this file runs:
//
// - the `const`/`let` initialisers (TIMELINE_KINDS and its two derived
//   tables, the page size, the feed's state, the scrubber's constants, the
//   table's columns and sort) use only literals and this file's own names;
// - the listener registrations at top level call app.js's `$` and pass
//   three app.js functions as bare references (`batchTag`, `batchDelete`,
//   `exitSelectMode` on the timeline's own batch bar), all function
//   declarations app.js has finished evaluating before this file starts.
//
// So nothing here reaches forward at parse time. The reverse direction was
// checked the way dashboard.js's and settings.js's splits checked it, by
// grepping every name this file declares against the rest of app.js and the
// other split files, and every hit is a runtime call:
//
// - `switchTab`'s "timeline" branch (`timelineScaleChoice`,
//   `syncTimelineViewSeg`, `renderTimeline`), run on a tab click;
// - `enterSelectMode`/`exitSelectMode` (`syncTimelineSelectUi`,
//   `paintTimeline`), run on a click;
// - `timelineSelectableRows` and the `timeline-batch-select-all` listener
//   (`timelineVisibleRows`, `paintTimeline`), both inside closures;
// - the shortcuts table's `todaysNote` (`openTodaysPage`), inside a closure;
// - documents.js (`dailyNoteTitle`) and library.js (`renderTimelineKinds`),
//   both lazy bundles that arrive long after this file.
//
// Unlike dashboard.js and settings.js, this split found no bare top-level
// line in app.js that had to move with the code it calls: app.js's boot path
// (`refreshActiveTab`, `initAuth`/`startApp`, `applyAppearance`) never
// touches the timeline, so there is no `typeof` guard and no relocated call.
//
// --- stayed in app.js, each for a concrete reason ---
//
// - `stripMarkdownPreview()` sat in the middle of this block, but it is
//   app.js's own helper: `plainText()` (app.js) is built on it, and
//   `plainText` is called from across the app and from the lazy bundles.
//   Moving it would have made a shared helper depend on a feature file.
//   This file calls it at runtime, like any other app.js helper.
// - The "Layout picker (§9)" `#graph-layout` listener was the last thing
//   before "// --- Notes sub-tabs" and so inside the line range, but it is
//   the graph's control, not the timeline's. Left in app.js where the graph
//   tab's other boot-resident wiring lives.
// - `timelineSelectableRows()` and its select-all listener were already
//   outside this block, beside the Notes list's own select-all (the two
//   share `toggleSelectAllRows`); left there.

// --- Timeline (§10B, TIMELINE_PLAN.md Phase 1) -------------------------------
//
// Asked for repeatedly, and with more shape each time: "I want a note timeline
// where I can see notes visually by what time they were made. Maybe I can even
// group them by events or related places etc."
//
// What this replaced, and why, because the shape that went is the shape the
// next session would otherwise reach for again (TIMELINE_PLAN.md §2, measured
// over 48 notes and six months): a **grid** of one column per bucket and one
// card per note, 8,800px wide against a 1,358px viewport with 79% of its cells
// empty, and a **line** view drawn in SVG, 14 text nodes for 48 notes, no
// titles, no keyboard stops, a hover popup as the only way to read anything.
// Both answered a question ("when were notes written") that a notebook's owner
// does not have. The question they do have is the one a journal answers: what
// was I doing then, and what came before and after it.
//
// So the timeline is a feed now: newest first, a `<section>` per bucket with a
// sticky header, a row per entry, the spine and the headers in CSS. Rows are
// real elements, which is what buys the titles, the tab stops, the text
// selection, the ellipsis and the app's own chip recipe without building any
// of them (TIMELINE_PLAN decision 3). The table view is the same rows in a
// `<table>` (Phase 2); both read from `timelineRow()` and from nothing else,
// so the two can never disagree about what a search matched.

//: **One row model** (TIMELINE_PLAN decision 2). Everything the feed, the
//: table, search, the filter and the count need, derived once per entry, with
//: the endpoint's wire names translated here and nowhere else.
//:
//: `space`, `words` and `links` are in the shape because the table's columns
//: are (decision 6) and `/timeline` does not send them yet: they read as
//: absent rather than as zero, so a column can say "not known" instead of
//: claiming a note has no links. The endpoint grows them with the table.
function timelineRow(entry) {
  // A board *is* an `Entry` (MINDMAP_PLAN.md §2) and `/timeline` has always
  // returned one, so without this a mind map reads as a note titled
  // "# My map". `loadMapBoardIndex()` is awaited before any row is built.
  const board = mapBoardById(entry.id);
  const flat = stripMarkdownPreview(entry.preview || "").trim();
  const cut = flat.indexOf("\n");
  const head = (cut === -1 ? flat : flat.slice(0, cut)).trim();
  const rest = cut === -1 ? "" : flat.slice(cut + 1).replace(/\s+/g, " ").trim();
  //: **The kind comes from the endpoint now** (TIMELINE_PLAN Phase 4). It used
  //: to be "board if the map index knows this id, note otherwise", which was
  //: the whole truth while the feed was Entry rows and is two of four kinds
  //: now. The map lookup stays because a board's *title* still comes from the
  //: map index rather than from its note text.
  const kind = entry.kind || (board ? "board" : "note");
  const title = entry.title || (board ? board.title : head) || "Untitled note";
  //: **A snippet says something the title does not.** For a board the preview
  //: is its note's own `# Title` line and for a reminder it is the reminder's
  //: text, so both rows repeated their title underneath it, the board's with
  //: the markdown hash still on it (measured: "R board" over "# R board").
  const other = stripMarkdownPreview(entry.preview || "").replace(/\s+/g, " ").trim();
  const snippet = entry.kind === "note" || !entry.kind
    ? rest
    : other && other.replace(/^#+\s*/, "") !== title ? other : "";
  return {
    id: entry.id,
    //: Identity across kinds: note 3 and document 3 are two different things,
    //: and this is what the feed keys its rows, its open row and its keyboard
    //: focus on. `id` is what a row opens.
    key: entry.key || `${kind}:${entry.id}`,
    kind,
    board,
    // The first line of a note is what a person calls it, heading or not.
    title,
    snippet,
    when: parseServerTime(entry.at) || new Date(entry.at),
    whenIso: entry.at,
    writtenAt: entry.written_at,
    //: Said out loud, because the alternative is a timeline that looks like it
    //: has quietly moved someone's notes: "mentioned" means the row sits on a
    //: date the note *talks about*, and `phrase` is the words that did it.
    placedBy: entry.placed_by,
    phrase: entry.phrase || "",
    tags: Array.isArray(entry.tags) ? entry.tags : [],
    category: entry.category || "",
    space: entry.space ?? null,
    words: entry.words ?? null,
    links: entry.links ?? null,
    pinned: Boolean(entry.pinned),
    parentId: entry.parent_id ?? null,
    //: Kind-specific facts, carried rather than fetched: a reminder row says
    //: whether it is done, and a document row what kind of file it is.
    done: entry.done ?? null,
    priority: entry.priority || "",
    fileType: entry.file_type || "",
    entryId: entry.entry_id ?? null,
  };
}

//: **A daily note is a convention, not a table** (TIMELINE_PLAN Phase 4,
//: WORLD_CLASS_PLAN D6). Its first line is the day in ISO form, `# 2026-09-13`,
//: which means a journal entry is an ordinary note: it is searchable, it is in
//: the graph, it exports, and a notebook opened in another editor still has
//: it. A store for it would buy nothing and would have to be migrated. ISO
//: rather than "Friday 13 September" because the app has to be able to find
//: today's note without parsing a date in the reader's own language.
function dailyNoteTitle(bucketKey) {
  return bucketKey;
}

//: **The day's page may be a note or a document** (DOCUMENTS_PLAN section 14).
//: `/timeline` has returned documents as their own kind since Phase 4, so a
//: document titled with the day was already in this feed; the day bucket just
//: did not believe it, and went on offering to start a second page for a day
//: already begun. One day, one page, and which store holds it is the writer's
//: choice: the Documents tab's "Daily" template writes the same ISO title this
//: function reads, so the two surfaces agree by spelling rather than by a
//: shared table.
//:
//: Boards are not in the set on purpose: a mind map named after a date is a
//: map of that date, not the day's writing.
const TIMELINE_DAILY_KINDS = new Set(["note", "document"]);

function timelineDailyNote(bucketKey, rows) {
  const wanted = dailyNoteTitle(bucketKey);
  return rows.find((row) => TIMELINE_DAILY_KINDS.has(row.kind) && row.title.trim() === wanted) || null;
}

//: **The buckets are computed here, not fetched.** `/timeline` labels every
//: entry with a bucket for the `scale` it was asked for, which made a change
//: of scale a round trip, and made "auto" impossible: the rule for auto is a
//: count of what is in range, which is only known once the range has arrived.
//: Bucketing from the row's own moment instead makes Day/Week/Month/Year a
//: repaint (measured at 0 requests), and keeps one definition of "which week
//: is this" rather than one here and one in Python.
//:
//: Monday starts the week, matching `routes_timeline.py`'s `weekday()`, so the
//: two agree for as long as the endpoint's own labels are still read by
//: anything.
function timelineBucketKey(when, scale) {
  const day = new Date(when.getTime());
  day.setHours(0, 0, 0, 0);
  if (scale === "week") day.setDate(day.getDate() - ((day.getDay() + 6) % 7));
  if (scale === "month") day.setDate(1);
  if (scale === "year") {
    day.setMonth(0);
    day.setDate(1);
  }
  return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(
    day.getDate()
  ).padStart(2, "0")}`;
}

// The header a bucket wears. A day gets the words people use for it, which is
// what makes the feed read as a journal rather than as a list of dates; a
// month or a year is already unambiguous and gets its name.
function timelineBucketLabel(key, scale) {
  const day = new Date(`${key}T00:00:00`);
  if (Number.isNaN(day.getTime())) return key;
  const thisYear = day.getFullYear() === new Date().getFullYear();
  if (scale === "year") return String(day.getFullYear());
  if (scale === "month") {
    return day.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  }
  if (scale === "week") {
    return `Week of ${day.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      ...(thisYear ? {} : { year: "numeric" }),
    })}`;
  }
  const today = timelineBucketKey(new Date(), "day");
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (key === today) return "Today";
  if (key === timelineBucketKey(yesterday, "day")) return "Yesterday";
  return day.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(thisYear ? {} : { year: "numeric" }),
  });
}

//: **Auto is the default scale** (TIMELINE_PLAN decision 4). Day buckets over
//: a year of writing are a header every second row; month buckets over a week
//: are one header and no structure at all. The thresholds (day under 60 notes
//: in range, week under 400, else month) are the plan's first guess and are
//: written down there as something to tune against a real notebook, not as a
//: measurement.
//:
//: It counts what the *range* holds rather than what the search left, so
//: typing in the search box never re-cuts the headers under the reader.
//: **The four kinds a row can be** (TIMELINE_PLAN Phase 4, decision 9), the
//: label on their filter chip, and the glyph the row's marker wears. One table,
//: because the chips, the marker and the `kind=` the endpoint is asked for have
//: to agree, and three copies of a list of four is how they stop agreeing.
const TIMELINE_KINDS = [
  { key: "note", label: "Notes", glyph: "ph-note" },
  { key: "board", label: "Boards", glyph: "ph-tree-structure" },
  { key: "document", label: "Documents", glyph: "ph-file-text" },
  { key: "reminder", label: "Reminders", glyph: "ph-bell" },
];
const TIMELINE_KIND_GLYPHS = Object.fromEntries(
  TIMELINE_KINDS.map((kind) => [kind.key, kind.glyph])
);
//: The singular, for the table's Kind column. "Map" rather than "Board"
//: because that is the word the rest of the app uses for the thing a board
//: holds (MINDMAP_PLAN.md), and this column used to say it.
const TIMELINE_KIND_NAMES = {
  note: "Note",
  board: "Map",
  document: "Document",
  reminder: "Reminder",
};
const TIMELINE_KINDS_STORE = "timeline-kinds";

//: All four unless this browser has been told otherwise. Stored rather than
//: reset per visit: which kinds you read the journal for is a preference, and
//: re-ticking three chips on every visit to the tab is the kind of thing that
//: makes a filter not worth having.
function timelineKindChoice() {
  let chosen = null;
  try {
    chosen = JSON.parse(localStorage.getItem(TIMELINE_KINDS_STORE) || "null");
  } catch {
    chosen = null;
  }
  const kept = Array.isArray(chosen)
    ? TIMELINE_KINDS.map((kind) => kind.key).filter((key) => chosen.includes(key))
    : [];
  //: Never empty. A feed with every kind switched off is a blank tab whose
  //: cause is four chips the reader cannot see the state of from the rows, so
  //: the last one cannot be turned off (the chip disables itself, see below).
  return kept.length ? kept : TIMELINE_KINDS.map((kind) => kind.key);
}

function timelineIsDailyNote(row) {
  return (
    TIMELINE_DAILY_KINDS.has(row.kind) &&
    row.title.trim() === dailyNoteTitle(timelineBucketKey(row.when, "day"))
  );
}

//: **One control, not four, and now one button rather than one well** (INBOX
//: 186: "these buttons in the top of the timeline dock are ugly and need a
//: redesign/restructuring"; INBOX 214, the owner, of what replaced them: "is
//: there another better ui and ux way to visualise these buttons?? maybe make
//: them in a dropdown or smth?? because they clash with the ui at large zoom
//: and they dont fit visually").
//:
//: The history is worth keeping because each step was right about the step
//: before it. Four `.library-chip`s at four different widths (121 / 102 / 162
//: / 158px at 1440) were the dock grammar's own counter-example: a chip is a
//: filter you can take *off*, and these four are always all four, never
//: removable and never empty. A `.seg.seg-multi` well fixed that: one ground,
//: one height, `aria-pressed` per segment. What it could not fix is width.
//: Four glyphs and four words is 441px of a row that also holds a search box,
//: a view switch and an Options menu, so at 150% browser zoom (960 CSS px of
//: window) it ran into them; and with all four on, which is the resting state,
//: four accent fills say nothing at all.
//:
//: A dropdown is one width at every zoom, and it can say in words what four
//: fills could not: "Kinds: all", or "Kinds: notes, boards". "Kinds" rather
//: than "Show" because `#timeline-filter-clear`, two controls along, already
//: says "Show: <band>", and one dock row with two different "Show:"es is worse
//: than either wording is good.
//:
//: The count stays in the row's tooltip and its accessible name rather than in
//: the caption ("a filter you have to press to find out is empty wastes the
//: press"), and in a menu row there is now room for it on screen as well.
function renderTimelineKinds() {
  const box = $("timeline-kinds");
  if (!box) return;
  const chosen = timelineKindChoice();
  const counts = new Map();
  for (const row of timelineRows) counts.set(row.kind, (counts.get(row.kind) || 0) + 1);
  box.replaceChildren();
  for (const kind of TIMELINE_KINDS) {
    const on = chosen.includes(kind.key);
    //: A `<label>` wrapping its own checkbox, which is what makes the row a
    //: 40px target rather than a 16px box with words beside it, and what lets
    //: the browser own the checked state. `.doc-dock-menu-check` is the class
    //: that keeps the menu open on a press: every other row in a dock menu
    //: does something and is finished, and a switch whose menu shuts on the
    //: click hides the only feedback it gives.
    const row = document.createElement("label");
    row.className = "menu-item doc-dock-menu-item doc-dock-menu-check checkbox-label";
    const count = counts.get(kind.key);
    const held = count === undefined ? "" : `, ${count} in view`;
    row.title = on
      ? `Stop showing ${kind.label.toLowerCase()}${held}`
      : `Show ${kind.label.toLowerCase()} in the timeline${held}`;
    const icon = document.createElement("i");
    icon.className = `ph ${kind.glyph} ph-lead`;
    icon.setAttribute("aria-hidden", "true");
    const label = document.createElement("span");
    label.textContent = kind.label;
    //: The count, on screen this time: a menu row has the width for it, which
    //: is the whole reason it was a tooltip in a 441px well.
    if (count !== undefined) {
      const many = document.createElement("span");
      many.className = "muted timeline-kind-count";
      many.textContent = ` ${count}`;
      label.appendChild(many);
    }
    const box_ = document.createElement("input");
    box_.type = "checkbox";
    box_.checked = on;
    box_.dataset.timelineKind = kind.key;
    //: The last one on cannot be turned off: see `timelineKindChoice`. A
    //: disabled checkbox rather than a hidden row, so the set stays four.
    if (on && chosen.length === 1) {
      box_.disabled = true;
      row.title = "At least one kind has to be shown";
    }
    row.append(icon, label, box_);
    box.appendChild(row);
  }
  syncTimelineKindsLabel(chosen);
}

//: **What the button says when the menu is shut**, which is the whole of what
//: a dropdown has to give back for the four fills it replaced. "all" when
//: nothing is filtered out, otherwise the kinds that are on, in the table's
//: order and in lower case, because this is a sentence fragment and not a set
//: of labels.
function syncTimelineKindsLabel(chosen = timelineKindChoice()) {
  const label = $("timeline-kinds-label");
  if (!label) return;
  const all = chosen.length === TIMELINE_KINDS.length;
  const words = TIMELINE_KINDS.filter((kind) => chosen.includes(kind.key)).map((kind) =>
    kind.label.toLowerCase()
  );
  label.textContent = `Kinds: ${all ? "all" : words.join(", ")}`;
  const button = $("timeline-kinds-btn");
  if (button) {
    button.title = all
      ? "Which kinds of thing the journal shows: all four"
      : `Showing ${words.join(", ")}. Press to change which kinds the journal shows`;
  }
}

//: A kind is a *server* filter (the rows are not loaded at all), so toggling
//: one refetches rather than repainting: the opposite of the band filter and
//: the search box, which both run over the array already in hand.
async function toggleTimelineKind(key) {
  const chosen = timelineKindChoice();
  const next = chosen.includes(key) ? chosen.filter((k) => k !== key) : [...chosen, key];
  if (!next.length) return;
  try {
    localStorage.setItem(TIMELINE_KINDS_STORE, JSON.stringify(next));
  } catch {
    /* a browser refusing storage still gets the filter for this visit */
  }
  renderTimelineKinds();
  await renderTimeline();
}

const TIMELINE_SCALES = ["day", "week", "month", "year"];
// Density follows the bucket, and nothing else decides it: a day's rows carry
// the snippet, a week's drop it, a month's and a year's are a title and a date
// in two columns. The names are the `data-density` values the CSS reads.
const TIMELINE_DENSITY = { day: "full", week: "compact", month: "dense", year: "dense" };

function timelineScaleChoice() {
  const saved = localStorage.getItem("timeline-scale");
  return saved === "auto" || TIMELINE_SCALES.includes(saved) ? saved : "auto";
}

function timelineResolvedScale(loaded) {
  const chosen = $("timeline-scale").value || timelineScaleChoice();
  if (TIMELINE_SCALES.includes(chosen)) return chosen;
  //: **Days with something in them, not rows.** The number auto is really
  //: choosing is how many headers the feed will draw, and with day buckets
  //: that is the number of days that have anything on them: counting rows
  //: instead only agrees with it while every day holds about one thing. It
  //: stopped agreeing when the feed gained documents, boards and reminders
  //: (TIMELINE_PLAN Phase 4): a week of writing with two hundred reminders
  //: due in it is seven headers by this rule and "hundreds of rows, use
  //: month buckets" by the old one, which buried the week in one column.
  //:
  //: The thresholds are the old ones, re-based: under 60 days keeps the feed
  //: under 60 headers, and 400 days in week buckets is about 57 of them, so
  //: both mean the same thing they always meant, "keep the headers readable".
  //:
  //: Counted from the density strip rather than from the loaded rows, for the
  //: reason the old comment gives and which still holds: the view is paged,
  //: and deciding from the first page would pick day buckets for a three-year
  //: notebook and re-cut every header when the second page arrived. The rows
  //: are the fallback for a range the endpoint sent no density for.
  const activeDays = Object.entries(timelineDensity).filter(([, n]) => n > 0).length
    || new Set(timelineRows.map((row) => timelineBucketKey(row.when, "day"))).size
    || loaded;
  if (activeDays < 60) return "day";
  if (activeDays < 400) return "week";
  return "month";
}

//: The loaded range, as rows, plus the one row opened in place and the one
//: group filter that is on. Search, filter and sort all run over this array
//: (decision 2), so the feed and the table cannot disagree, and a keystroke
//: costs a repaint rather than a request.
//: One page of rows per request, and what the endpoint said came after it.
//: 300 is `PAGE_SIZE` in `routes_timeline.py`; the two are not enforced to
//: agree because neither has to, the endpoint is the one with the ceiling.
const TIMELINE_PAGE = 300;
// Counts per day for the whole range (not just the loaded pages), which is
// what the scrubber draws.
let timelineDensity = {};
let timelineNextCursor = null;
let timelinePaging = false;
let timelineRows = [];
// By id, so a row that continues another can name it without a scan per row:
// `find` per row is the shape that turns 1,500 rows into a million comparisons
// to draw one screen.
let timelineById = new Map();
let timelineGroupNames = [];
let timelineFilter = null;
let timelineOpenKey = null;

//: The range, as a query. One place, because the first page and every page
//: after it have to ask the same question: a cursor into a different range is
//: a cursor into nothing.
function timelineQuery() {
  let url = `/timeline?scale=${$("timeline-scale").value === "auto" ? "day" : $("timeline-scale").value}`
    + `&group=${$("timeline-group").value}`;
  const daysVal = $("timeline-days").value;
  if (daysVal === "custom") {
    const start = $("timeline-start-date").value;
    const end = $("timeline-end-date").value;
    if (start && end) {
      url += `&start=${start}T00:00:00Z&end=${end}T23:59:59Z`;
    } else {
      url += `&days=365`; // Fallback if they haven't picked both dates yet
    }
  } else {
    url += `&days=${daysVal}`;
  }
  //: Only when it is narrowing something: a URL that always names all four
  //: kinds is a longer URL saying nothing, and the endpoint's own default is
  //: the same four.
  const kinds = timelineKindChoice();
  if (kinds.length < TIMELINE_KINDS.length) url += `&kind=${kinds.join(",")}`;
  return url;
}

async function renderTimeline() {
  const url = `${timelineQuery()}&limit=${TIMELINE_PAGE}`;
  //: Which of these entries are maps, awaited alongside the timeline rather
  //: than before it, because neither needs the other's answer.
  const [body] = await Promise.all([apiJson(url).catch(() => null), loadMapBoardIndex()]);
  //: A null here is a request that failed, not a notebook with nothing in it,
  //: and the two used to look identical on screen: "Nothing to plot yet" over
  //: a notebook full of dated notes. See `surfaceFailed`.
  if (!body) {
    surfaceFailed($("timeline-empty"), "timeline", renderTimeline);
    return;
  }
  surfaceRecovered($("timeline-empty"));
  timelineDensity = body?.density || {};
  timelineNextCursor = body?.next_cursor || null;
  timelineRows = body ? body.rows.map(timelineRow) : [];
  // Newest first by the moment the row *sits* on, not by when it was typed.
  // Those differ for every note placed by what it mentions, and the old grid
  // ordered by one and bucketed by the other, so a note about next Friday
  // arrived in Friday's column behind notes written after it.
  timelineRows.sort((a, b) => b.when - a.when);
  timelineById = new Map(timelineRows.map((row) => [row.key, row]));
  timelineOpenKey = null;
  if (timelineFilter && !timelineRows.some((row) => timelineRowGroups(row).includes(timelineFilter))) {
    // A filter naming a category that is not in the new range would hide
    // everything with no way to tell why.
    timelineFilter = null;
  }
  fillTimelineBandOptions();
  renderTimelineKinds();
  paintTimeline();
  drawTimelineScrubber();
}

//: **A page at a time, as the reader reaches the end of the last one**
//: (TIMELINE_PLAN Phase 3). What this replaced was a hard cap of 1,500 rows
//: with nothing after it: a notebook past the cap lost its older notes off the
//: end of the view, silently. The cursor is the endpoint's own
//: (`created_at|id`, base64url), so a note saved while someone is reading
//: cannot shift the page under them.
//:
//: One request at a time, and the flag is cleared in a `finally`: a rejected
//: fetch that left it set would stop the feed paging for the rest of the
//: session, and the only symptom would be a timeline that ends early.
async function timelineLoadMore() {
  if (!timelineNextCursor || timelinePaging) return;
  timelinePaging = true;
  try {
    const url = `${timelineQuery()}&limit=${TIMELINE_PAGE}&cursor=${encodeURIComponent(timelineNextCursor)}`;
    const body = await apiJson(url).catch(() => null);
    if (!body) return;
    timelineNextCursor = body.next_cursor || null;
    const fresh = body.rows.map(timelineRow);
    for (const row of fresh) {
      if (timelineById.has(row.key)) continue;
      timelineRows.push(row);
      timelineById.set(row.key, row);
    }
    timelineRows.sort((a, b) => b.when - a.when);
    // Appended rather than repainted: a repaint of every loaded row on every
    // page is what turns paging into a stutter, and the rows already on screen
    // have not changed. The table repaints, because its order is whatever
    // column it is sorted by and an append cannot know where a row belongs.
    if (timelineViewMode() === "table") paintTimeline();
    else appendTimelineRows(fresh);
    drawTimelineScrubber();
  } finally {
    timelinePaging = false;
  }
}

//: The new page, into the feed as it stands: into the last bucket if it
//: continues it, into a new section if it does not.
//:
//: **In chunks, across frames.** A page is 300 rows and a row is eight
//: elements, and building all of them in one go was measured at a 117ms frame
//: during paging, over the 100ms the plan draws its line at. Sixty rows a
//: frame keeps every frame inside the budget and the rows still arrive well
//: before the scroll reaches them (the fetch starts 600px early).
const TIMELINE_APPEND_CHUNK = 60;

function appendTimelineRows(fresh, from = 0) {
  const feed = $("timeline-feed");
  const scale = feed.dataset.scale || "day";
  const density = feed.dataset.density || "full";
  const visible = new Set(timelineVisibleRows().map((row) => row.key));
  let section = feed.lastElementChild;
  const slice = fresh.slice(from, from + TIMELINE_APPEND_CHUNK);
  for (const row of slice) {
    if (!visible.has(row.key)) continue;
    const key = timelineBucketKey(row.when, scale);
    if (!section || section.dataset.bucket !== key) {
      section = document.createElement("section");
      section.className = "timeline-bucket";
      section.dataset.bucket = key;
      const head = document.createElement("h3");
      head.className = "timeline-bucket-head";
      const label = document.createElement("span");
      label.className = "timeline-bucket-label";
      label.textContent = timelineBucketLabel(key, scale);
      const count = document.createElement("span");
      count.className = "muted timeline-bucket-count";
      count.textContent = "0";
      head.append(label, count);
      const list = document.createElement("ul");
      list.className = "timeline-rows";
      section.append(head, list);
      feed.appendChild(section);
    }
    section.querySelector(".timeline-rows").appendChild(timelineRowElement(row, density));
    const count = section.querySelector(".timeline-bucket-count");
    count.textContent = String(section.querySelectorAll(".timeline-row").length);
  }
  if (from + TIMELINE_APPEND_CHUNK < fresh.length) {
    requestAnimationFrame(() => appendTimelineRows(fresh, from + TIMELINE_APPEND_CHUNK));
    return;
  }
  applyTimelineRowTabOrder();
  const total = feed.querySelectorAll(".timeline-row").length;
  $("timeline-count").textContent = `${total} note${total === 1 ? "" : "s"} · ${
    feed.querySelectorAll(".timeline-bucket").length
  } ${{ day: "day", week: "week", month: "month", year: "year" }[scale]}s`;
}

//: The end of the feed is the request for the next page. 600px of warning
//: rather than the last pixel, so the rows are there before the scroll
//: reaches them; on the scroll box itself rather than the window, because the
//: feed is what scrolls (05-sidebars-themes.css).
$("timeline-scroll").addEventListener("scroll", () => {
  const box = $("timeline-scroll");
  if (box.scrollTop + box.clientHeight > box.scrollHeight - 600) timelineLoadMore();
  drawTimelineWindow();
});

// What a row belongs to under the current grouping: the value the band filter
// matches against. Threads are named by the note they continue, which is the
// only name a thread has.
function timelineRowGroups(row) {
  const group = $("timeline-group").value;
  if (group === "tag") return row.tags.length ? row.tags : ["untagged"];
  if (group === "thread") return [row.parentId ? `note-${row.parentId}` : `note-${row.id}`];
  if (group === "none") return [];
  // "Uncategorised" is where notes land when a category goes away, and is the
  // name the rest of the app uses for it.
  return [row.category || "Uncategorised"];
}

// The band filter's options come from what is loaded, because a filter offering
// a category the range does not contain is a dead end. Built after every fetch
// and after a change of grouping; the current value survives if it is still
// there.
function fillTimelineBandOptions() {
  const select = $("timeline-band");
  const group = $("timeline-group").value;
  const section = $("timeline-band-section");
  section.classList.toggle("hidden", group === "none" || group === "thread");
  const counts = new Map();
  for (const row of timelineRows) {
    for (const name of timelineRowGroups(row)) counts.set(name, (counts.get(name) || 0) + 1);
  }
  const names = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  timelineGroupNames = names.map(([name]) => name);
  select.replaceChildren();
  const all = document.createElement("option");
  all.value = "";
  all.textContent = "Everything";
  select.appendChild(all);
  for (const [name, count] of names) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = `${name} (${count})`;
    select.appendChild(option);
  }
  if (timelineFilter && !counts.has(timelineFilter)) timelineFilter = null;
  select.value = timelineFilter || "";
  syncTimelineFilterChip();
}

// The filter, said out loud in the dock's find zone rather than only inside a
// menu nobody has open: the same shape Graph uses for "a state is on and here
// is the way out of it" (`#graph-highlight-clear`).
function syncTimelineFilterChip() {
  const clear = $("timeline-filter-clear");
  clear.classList.toggle("hidden", !timelineFilter);
  if (timelineFilter) {
    setLabel(clear, `ph:x Show: ${timelineFilter}`);
    clear.title = `Stop showing only ${timelineFilter}`;
  }
}

// Search and the band filter, applied to the array (decision 2). They filter
// rather than dim: a dimmed row still takes its space, still answers Ctrl+F
// and still has to be read past, which is why the old view's search was
// reported as doing nothing useful.
function timelineVisibleRows() {
  const query = ($("timeline-search").value || "").trim().toLowerCase();
  let rows = timelineRows;
  if (timelineFilter) {
    rows = rows.filter((row) => timelineRowGroups(row).includes(timelineFilter));
  }
  if (query) {
    rows = rows.filter((row) =>
      `${row.title} ${row.snippet} ${row.category} ${row.tags.join(" ")}`
        .toLowerCase()
        .includes(query)
    );
  }
  return rows;
}

//: Everything that is true of both views, in one place: which of them is
//: showing, the two empty states, and the rows they share. A view change, a
//: sort, a search keystroke, a filter and a change of bucket all land here, and
//: none of them fetches anything (TIMELINE_PLAN decision 2).
function paintTimeline() {
  const rows = timelineVisibleRows();
  const table = timelineViewMode() === "table";
  const nothingLoaded = timelineRows.length === 0;
  $("timeline-empty").classList.toggle("hidden", !nothingLoaded);
  $("timeline-no-match").classList.toggle("hidden", nothingLoaded || rows.length > 0);
  $("timeline-scroll").classList.toggle("hidden", rows.length === 0);
  $("timeline-feed").classList.toggle("hidden", table);
  $("timeline-table").classList.toggle("hidden", !table);
  // Selecting rows is the table's affordance: the feed has no tick boxes, and
  // offering the mode where it cannot be used is a control that does nothing.
  $("timeline-select-btn").classList.toggle("hidden", !table);
  syncTimelineSelectUi();
  //: The mode not drawn is emptied, not only hidden. Crossing the phone
  //: breakpoint switches the mode, and the hidden feed kept its rows beside
  //: the table's: every `.timeline-row` query (the keyboard walk, the tab
  //: order, the sweeps) then counted both, measured as 113 rows read as 226.
  if (table) {
    $("timeline-feed").replaceChildren();
    paintTimelineTable(rows);
  } else {
    $("timeline-table-body").replaceChildren();
    paintTimelineFeed(rows);
  }
}

function paintTimelineFeed(rows) {
  const feed = $("timeline-feed");
  const scale = timelineResolvedScale(timelineRows.length);
  const density = TIMELINE_DENSITY[scale];
  feed.dataset.scale = scale;
  feed.dataset.density = density;
  feed.replaceChildren();

  // Buckets in the order the rows are in, so the grouping is one pass and the
  // feed's order is the array's order: the two cannot drift.
  const buckets = [];
  let current = null;
  for (const row of rows) {
    const key = timelineBucketKey(row.when, scale);
    if (!current || current.key !== key) {
      current = { key, rows: [] };
      buckets.push(current);
    }
    current.rows.push(row);
  }

  const unit = { day: "day", week: "week", month: "month", year: "year" }[scale];
  const filtered = rows.length !== timelineRows.length;
  //: "Items", not "notes": the feed holds documents, boards and reminders
  //: since Phase 4, and a count line that calls a reminder a note is the same
  //: small lie the response's `notes` key was telling until today.
  $("timeline-count").textContent = rows.length
    ? `${filtered ? `${rows.length} of ${timelineRows.length}` : rows.length} item${
        rows.length === 1 ? "" : "s"
      } · ${buckets.length} ${unit}${buckets.length === 1 ? "" : "s"}`
    : "";

  const fragment = document.createDocumentFragment();
  //: **Today's own day, whether or not anything is in it** (TIMELINE_PLAN
  //: Phase 4, WORLD_CLASS_PLAN D6). A journal whose today is missing until you
  //: have written something is a journal you have to go elsewhere to start, and
  //: the feed's newest header being a date three days ago is the reading that
  //: makes the tab feel out of date rather than empty. Only on the day scale:
  //: "this week" and "this month" already contain today by definition.
  const todayKey = timelineBucketKey(new Date(), "day");
  const showsToday = scale === "day" && !timelineFilter && !$("timeline-search").value.trim();
  if (showsToday && !buckets.some((bucket) => bucket.key === todayKey)) {
    fragment.appendChild(timelineBucketSection({ key: todayKey, rows: [] }, scale, density));
  }
  for (const bucket of buckets) {
    fragment.appendChild(timelineBucketSection(bucket, scale, density, showsToday && bucket.key === todayKey));
  }
  feed.appendChild(fragment);
  applyTimelineRowTabOrder();
}

//: One bucket: its header, its rows, and, on today, the journal's own action.
function timelineBucketSection(bucket, scale, density, isToday = bucket.rows.length === 0) {
  const section = document.createElement("section");
  section.className = "timeline-bucket";
  section.dataset.bucket = bucket.key;
  if (!bucket.rows.length) section.dataset.empty = "1";
  const head = document.createElement("h3");
  head.className = "timeline-bucket-head";
  const label = document.createElement("span");
  label.className = "timeline-bucket-label";
  label.textContent = timelineBucketLabel(bucket.key, scale);
  const count = document.createElement("span");
  count.className = "muted timeline-bucket-count";
  count.textContent = `${bucket.rows.length}`;
  head.append(label, count);
  //: **The action is on the day, and only when the day has none.** A "start
  //: today's note" button beside a today that already has one is a second way
  //: to make the same thing, and the second one would make a note whose first
  //: line is a date that is already taken.
  if (isToday && bucket.key === timelineBucketKey(new Date(), "day")) {
    const existing = timelineDailyNote(bucket.key, bucket.rows);
    head.appendChild(
      existing
        ? //: The button names the kind it found: "today's note" pointing at a
          //: document is a small lie, and the two are different things to open.
          smallButton(
            existing.kind === "document" ? "ph:calendar-dot Today's document" : "ph:calendar-dot Today's note",
            existing.kind === "document" ? "Open today's document" : "Open today's journal note",
            () => focusTimelineRow(existing.key)
          )
        : smallButton("ph:plus Start today's note", "Open a new note with today's date in the title", () =>
            startTodaysNote()
          )
    );
  }
  const list = document.createElement("ul");
  list.className = "timeline-rows";
  for (const row of bucket.rows) list.appendChild(timelineRowElement(row, density));
  section.append(head, list);
  if (!bucket.rows.length) {
    const empty = document.createElement("p");
    empty.className = "muted timeline-bucket-empty";
    empty.textContent = "Nothing written today yet.";
    section.appendChild(empty);
  }
  return section;
}

//: The journal note itself: an ordinary note whose first line is the day
//: (`dailyNoteTitle`). Nothing else about it is special, which is the point:
//: it is searchable, it is in the graph, it exports, and a notebook opened in
//: another editor still has it.
//: **The button opens the composer, it does not write the note.** Asked for
//: directly: "if I click on the 'start today's note' button in the timeline,
//: it shouldnt make the note yet, it should open the capture tab and put in
//: the date text in the title and focus on the main text area". It used to
//: `POST /entries/daily/{day}` on the press, so a press you thought better of
//: left an empty note dated today in the notebook, in the graph and in every
//: export, and the day then had a note, which is what the button beside it
//: checks: pressing it once took the offer away and gave you nothing to
//: write in.
//:
//: Nothing is saved until the composer's own Save, which is also what makes
//: the duplicate guard unnecessary: five presses now fill the same two fields
//: five times rather than making five notes (INBOX 199). The endpoint stays
//: for the agent's own `add to today's note` tool, which has no composer.
//: `Ctrl+D` (WORLD_CLASS_PLAN D6): today's page if the day has one, else the
//: composer with the day's title, exactly what the Timeline's own button does
//: on today's bucket. Asked of `/timeline` for today, so the answer is the one
//: the Timeline itself would give (a note or a document titled with the day,
//: `timelineDailyNote`), and opened where that kind lives.
async function openTodaysPage() {
  const key = timelineBucketKey(new Date(), "day");
  const body = await apiJson("/timeline?scale=day&days=1&kind=note,document", { silent: true }).catch(
    () => null
  );
  const existing = body ? timelineDailyNote(key, (body.rows || []).map(timelineRow)) : null;
  if (!existing) {
    startTodaysNote();
    return;
  }
  const id = Number(String(existing.key).split(":")[1]);
  if (existing.kind === "document") {
    switchTab("documents");
    openDocument(id);
    return;
  }
  flashEntry(id);
}

function startTodaysNote() {
  const title = dailyNoteTitle(timelineBucketKey(new Date(), "day"));
  switchTab("notes");
  showNotesSection("capture");
  const titleBox = $("entry-title");
  const body = $("entry-content");
  //: Only into an empty box. Someone who pressed this with a half-written
  //: note in the composer wants the date, not their draft's title replaced,
  //: and the body is never touched for the same reason.
  if (titleBox && !titleBox.value.trim()) titleBox.value = title;
  //: The caret goes where the writing goes, after the section has been shown:
  //: `focus()` on a box inside a hidden panel does nothing at all.
  setTimeout(() => body?.focus(), 0);
}

// One Tab stop for the feed, kept on the row the reader was on. A repaint
// happens on every keystroke in the search box, and resetting the stop to the
// top of the feed each time takes the focus away mid-typing: the same reason
// `applyEntryListTabOrder` keeps the Notes list's stop where it was.
function applyTimelineRowTabOrder() {
  // Whichever view is showing: `.timeline-row` is the class both a feed row
  // and a table row wear, so the keyboard behaves the same in both.
  const rows = [...$("timeline-scroll").querySelectorAll(".timeline-row")];
  const current = document.activeElement;
  const keepKey = rows.some((row) => row === current) ? current.dataset.key : null;
  for (const row of rows) {
    row.tabIndex = keepKey ? (row.dataset.key === keepKey ? 0 : -1) : -1;
  }
  if (!keepKey && rows.length) rows[0].tabIndex = 0;
}

// A row. The order you read it in: what kind of thing this is and whether it
// is sitting on a date it only talks about, then what it is called, then the
// line under it, then the facts (category, tags) and the time.
function timelineRowElement(row, density) {
  const li = document.createElement("li");
  li.className = "timeline-row";
  li.dataset.id = row.id;
  li.dataset.key = row.key;
  li.dataset.kind = row.kind;
  if (row.placedBy === "mentioned") li.dataset.placed = "mentioned";
  if (row.pinned) li.dataset.pinned = "1";
  //: **Reachable by keyboard, on the app's own recipe for a list.** The SVG
  //: view had 0 focusable notes; the Notes list has a *roving* tab stop
  //: (`applyEntryListTabOrder`): one row in the page's Tab order, arrows to
  //: move between rows. Forty-eight Tab stops in one feed would be the other
  //: failure, and it is not what the rest of the app does. `aria-expanded`
  //: says what Enter will do here.
  li.tabIndex = -1;
  li.setAttribute("aria-expanded", "false");

  const mark = document.createElement("span");
  mark.className = "timeline-row-mark";
  mark.setAttribute("aria-hidden", "true");
  const glyph = document.createElement("i");
  //: The kind is carried by the glyph, and the *placement* by the clock: a
  //: note plotted on a Friday it mentions is a different fact from one
  //: plotted on the day it was typed, and the old view said so only in a
  //: tooltip. Colour is deliberately not the signal here (decision 10 asks
  //: for category tokens, and this app has none: the Library's chips are
  //: accent-and-surface, not one hue per category), so the marker takes its
  //: colour from `--accent` or `--ink-soft` and the icon does the work.
  //: One glyph per kind (TIMELINE_PLAN Phase 4), with the two placement cases
  //: keeping theirs: a note plotted on a Friday it mentions and a reminder due
  //: on that Friday are both "here for what it is about", and the clock is
  //: what says so. A document and a board are always plotted where they were
  //: made, so their own glyph is free to say what they are.
  glyph.className = `ph ${TIMELINE_KIND_GLYPHS[row.kind] || "ph-note"}`;
  if (row.kind === "note" && row.placedBy === "mentioned") glyph.className = "ph ph-clock-countdown";
  //: The day's page carries the calendar whichever store holds it
  //: (DOCUMENTS_PLAN section 14); `timelineIsDailyNote` is what knows the set.
  if (timelineIsDailyNote(row)) glyph.className = "ph ph-calendar-dot";
  mark.appendChild(glyph);

  const main = document.createElement("span");
  main.className = "timeline-row-main";
  const title = document.createElement("span");
  title.className = "timeline-row-title";
  title.textContent = row.title;
  // One native tooltip for the full title, because the ellipsis is the only
  // other escape hatch and the text is already plain.
  title.title = row.title;
  main.appendChild(title);
  if (density === "full" && row.snippet) {
    const snippet = document.createElement("span");
    snippet.className = "timeline-row-snippet";
    snippet.textContent = row.snippet;
    main.appendChild(snippet);
  }

  const meta = document.createElement("span");
  meta.className = "timeline-row-meta";
  if (density !== "dense") {
    // The note row's own chips (`chip()`), not a second chip recipe for the
    // same facts: a tag should look the same here as in the Notes list.
    //: **Which word is the category and which are tags.** Flattened to
    //: muted text in the first de-vibecoding pass, a row's facts read as one
    //: run of words ("Uncategorised personal health"), the owner's "missing
    //: distinguishing between titles that used to be badges". They take the
    //: note meta row's grammar now, so the three surfaces agree: the
    //: category leads with its colour dot in ink, a tag reads #tag, and an
    //: unset category is left out rather than printed on every row.
    if (row.category && row.category !== "Uncategorised") {
      const cat = chip(row.category, "category");
      cat.style.setProperty("--category-dot", categoryDotColour(row.category));
      meta.appendChild(cat);
    }
    for (const tag of row.tags.slice(0, density === "full" ? 3 : 2)) {
      meta.appendChild(chip(tag, "tag hashtag"));
    }
  }
  const when = document.createElement("time");
  when.className = "timeline-row-when";
  when.dateTime = row.whenIso;
  // A day's rows all share their date with the header above them, so the row
  // shows the time; any longer bucket shows the date, which is the thing the
  // header no longer says.
  when.textContent =
    density === "full"
      ? row.when.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
      : row.when.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  when.title =
    row.placedBy === "mentioned"
      ? `“${row.phrase}” in this note meant ${shortDate(row.whenIso)}. Written ${shortDate(row.writtenAt)}.`
      : `Written ${new Date(row.writtenAt).toLocaleString()}`;
  meta.appendChild(when);

  li.append(mark, main, meta);

  // A row that continues another says so and goes there (decision 5's one
  // surviving thread affordance). Only where there is room to say it.
  if (density === "full" && row.parentId) {
    const parent = timelineById.get(row.parentId);
    if (parent) {
      const link = document.createElement("button");
      link.type = "button";
      link.className = "ghost small timeline-row-thread";
      setLabel(link, `ph:arrow-bend-up-left ${parent.title}`);
      link.title = `Continues “${parent.title}”`;
      link.addEventListener("click", (event) => {
        event.stopPropagation();
        focusTimelineRow(parent.key);
      });
      main.appendChild(link);
    }
  }

  li.addEventListener("click", (event) => {
    // The same "don't swallow a click meant for something else" guard the
    // Notes list's own row handler uses.
    if (event.target.closest("a, button, input, textarea, .chip, img")) return;
    if (window.getSelection()?.toString()) return; // a text selection, not a click
    toggleTimelineRow(li, row);
  });
  return li;
}

// Focus, and scroll into view without walking every scrolling ancestor:
// `scrollIntoView` takes the page with it (DESIGN.md's rule for a list that
// says where you are), and the feed is a box inside a card.
function focusTimelineRow(key) {
  const row = $("timeline-scroll").querySelector(`.timeline-row[data-key="${key}"]`);
  if (!row) return;
  const box = $("timeline-scroll");
  const offset = row.getBoundingClientRect().top - box.getBoundingClientRect().top;
  box.scrollTop += offset - box.clientHeight / 3;
  for (const other of $("timeline-scroll").querySelectorAll(".timeline-row")) other.tabIndex = -1;
  row.tabIndex = 0;
  row.focus();
}

//: **Open in place**, which is what replaced the popup (decision 8). The popup
//: was positioned by hand against two different offset parents, clamped
//: itself, re-placed itself on every image that loaded, and could only ever
//: show one note: the row opens underneath itself instead, stays where the
//: reader's eye already is, and keeps its place in the keyboard order.
//:
//: One at a time, the same rule the app's popovers follow, so the feed never
//: becomes a wall of open notes.
//:
//: TIMELINE_PLAN decision 8 names "the app's split panel (the same one Notes
//: uses)". There is no such panel: Notes opens a note by expanding the row it
//: is already in (`expandedRows`, `entryItem`). This is that affordance, built
//: on the same idea, and the plan's wording is the thing that is out of date.
function toggleTimelineRow(el, row) {
  if (el.getAttribute("aria-expanded") === "true") {
    closeTimelineRow(el);
    return;
  }
  if (timelineOpenKey !== null) {
    const open = $("timeline-scroll").querySelector(
      `.timeline-row[data-key="${timelineOpenKey}"][aria-expanded="true"]`
    );
    if (open) closeTimelineRow(open);
  }
  timelineOpenKey = row.key;
  el.setAttribute("aria-expanded", "true");
  // A table row cannot hold a block: its detail is a row of its own with one
  // cell across every column (`openTimelineTableDetail`). Everything inside
  // that cell is what the feed builds, from the same function.
  if (el.tagName === "TR") {
    openTimelineTableDetail(el, row);
    return;
  }
  const detail = document.createElement("div");
  detail.className = "timeline-row-detail";
  el.appendChild(detail);
  openTimelineRowDetail(detail, row);
}

function closeTimelineRow(el) {
  el.setAttribute("aria-expanded", "false");
  if (el.tagName === "TR") {
    const next = el.nextElementSibling;
    if (next && next.classList.contains("timeline-detail-row")) next.remove();
  } else {
    el.querySelector(".timeline-row-detail")?.remove();
  }
  if (timelineOpenKey === el.dataset.key) timelineOpenKey = null;
}

async function openTimelineRowDetail(detail, row) {
  const actions = document.createElement("div");
  actions.className = "row timeline-row-actions";

  //: A document's body is not a note's: it is long, it is `file_type`-shaped,
  //: and loading it into a row would put a thousand lines inside a feed. The
  //: row says what it is and opens the editor, which is where a document is
  //: read (TIMELINE_PLAN Phase 4).
  if (row.kind === "document") {
    const line = document.createElement("p");
    line.className = "timeline-row-body";
    line.textContent = row.snippet || "This document is empty.";
    detail.appendChild(line);
    actions.appendChild(
      smallButton("ph:file-text Open this document", "Open it in the editor", () => {
        switchTab("documents");
        openDocument(row.id);
      })
    );
    detail.appendChild(actions);
    return;
  }

  if (row.kind === "reminder") {
    const line = document.createElement("p");
    line.className = "timeline-row-body";
    line.textContent = row.done ? "Done." : "Not done yet.";
    detail.appendChild(line);
    //: A reminder attached to a note can reach it, which is the one link the
    //: Reminders tab has that a row here would otherwise lose.
    if (row.entryId) {
      actions.appendChild(
        smallButton("ph:note The note this is about", "Open the note this reminder is on", () => {
          flashEntry(row.entryId);
        })
      );
    }
    actions.appendChild(
      smallButton("ph:bell Open in reminders", "Show this in the Reminders tab", () => {
        switchTab("reminders");
      })
    );
    detail.appendChild(actions);
    return;
  }

  if (row.kind === "board") {
    // A map has no prose to render. Its own chip says what it is and how big
    // it is, which is what the Library and the dashboard show for one too.
    detail.append(mapChip(row.board, { interactive: false }));
    actions.appendChild(
      smallButton("ph:tree-structure Open this map", "Open this map on the whiteboard", () =>
        openWhiteboardBoard(row.board.id)
      )
    );
    detail.appendChild(actions);
    return;
  }

  const body = document.createElement("div");
  body.className = "timeline-row-body";
  body.textContent = "Loading…";
  const media = document.createElement("div");
  media.className = "timeline-row-media hidden";
  detail.append(body, media, actions);

  actions.appendChild(
    smallButton("ph:pencil-simple Open in editor", "Open this note in the Notes tab", () => {
      switchTab("notes");
      showNotesSection("browse");
      flashEntry(row.id);
    })
  );

  const entry = await apiJson(`/entries/${row.id}`).catch(() => null);
  // The row may have been closed, or the feed repainted, while this was in
  // flight; writing into a detached node would be invisible and confusing.
  if (!detail.isConnected) return;
  if (!entry) {
    body.textContent = "Couldn't load this note.";
    return;
  }
  body.replaceChildren();
  renderMarkdown(body, entry.content || "");
  renderTimelineRowMedia(entry, media);
}

//: **Everything attached, not only the pictures.** Reported twice against the
//: popup this moved out of: "a photo i attached to a note ... doesn't render"
//: and "files and attachments dont render in the timeline and popups". The
//: non-image half is `fileCard`, the same control the note cards, the chat
//: transcript and the widgets use, so a file looks the same wherever the app
//: shows it. Kept through the redesign on purpose: the popup went, the two
//: fixes it carried did not.
function renderTimelineRowMedia(entry, box) {
  box.replaceChildren();
  const all = entry.attachments || [];
  box.classList.toggle("hidden", all.length === 0);
  if (!all.length) return;
  const images = all.filter((a) => a.is_image);
  for (const attachment of all.filter((a) => !a.is_image)) {
    //: `url` is what every other file surface is given; attachments carry
    //: theirs as `/files/{id}` when the row does not spell one out.
    box.appendChild(
      fileCard(attachment.filename || attachment.name || "", attachment.url || `/files/${attachment.id}`)
    );
  }
  for (const attachment of images) {
    const img = document.createElement("img");
    img.className = "timeline-row-thumb";
    img.alt = attachment.filename;
    img.title = `${attachment.filename}: click to view full size`;
    attachmentObjectUrl(attachment)
      .then((url) => {
        img.src = url;
      })
      .catch(() => img.remove());
    img.addEventListener("click", () => {
      openLightbox(
        images.map((a) => ({ filename: a.filename, getUrl: () => attachmentObjectUrl(a) })),
        images.indexOf(attachment)
      );
    });
    box.appendChild(img);
  }
}

//: The keys are the app's (TIMELINE_PLAN §6): arrows walk the rows in document
//: order, Enter and Space open one in place, Escape closes it. Delegated to the
//: feed rather than bound per row, because a repaint builds every row again and
//: a listener per row is a listener per row per repaint.
//:
//: Guarded on the row itself being the target: a chip inside a row is its own
//: `role="button"` with its own Enter, and an arrow pressed inside one should
//: not steal the key from it.
$("timeline-scroll").addEventListener("keydown", (event) => {
  const row = event.target.closest?.(".timeline-row");
  if (!row || event.target !== row) return;
  const rows = [...$("timeline-scroll").querySelectorAll(".timeline-row")];
  const at = rows.indexOf(row);
  const go = (index) => {
    const next = rows[Math.max(0, Math.min(rows.length - 1, index))];
    if (next) {
      event.preventDefault();
      focusTimelineRow(next.dataset.key);
    }
  };
  if (event.key === "ArrowDown") return go(at + 1);
  if (event.key === "ArrowUp") return go(at - 1);
  if (event.key === "Home") return go(0);
  if (event.key === "End") return go(rows.length - 1);
  if (event.key === " " && selectMode && row.tagName === "TR") {
    event.preventDefault();
    const model = timelineById.get(row.dataset.key);
    //: Space selects, and only where a tick box exists: see `timelineTableRow`.
    if (model && (model.kind === "note" || model.kind === "board")) {
      setTimelineRowSelected(row, model, !selectedIds.has(model.id));
    }
    return;
  }
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    const model = timelineById.get(row.dataset.key);
    if (model) toggleTimelineRow(row, model);
    return;
  }
  if (event.key === "Escape" && row.getAttribute("aria-expanded") === "true") {
    event.preventDefault();
    closeTimelineRow(row);
  }
});
// A date with no time, in the reader's locale. Used where a full timestamp is
// noise: a card header, a tooltip's second line.
function shortDate(iso) {
  const date = parseServerTime(iso) || new Date(iso);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

//: **The density strip** (TIMELINE_PLAN decision 7). The one thing the feed
//: cannot show: how much was written across the *whole* range, including the
//: pages that have not been fetched, so that six months of silence and the
//: fortnight everything happened in are visible at a glance and one drag away.
//: It is the only SVG left in the tab, and it is one path.
//:
//: **It hides when the shape it would draw says nothing**, which the plan
//: asked to be measured rather than assumed (section 7: "it may read as noise
//: and should hide below a threshold measured then"). It hid under 200 notes
//: until 2026-09-20, and the measurement
//: (`scratchpad/ui-sweeps/timelinedensity.js`, over a 2,000-note seed sliced
//: into every size from 25 notes up, in both of the two shapes a notebook
//: comes in) says a count is the wrong variable: it admits a notebook the
//: strip cannot draw and hides one it can.
//:
//: - **A young notebook**, everything written in the last few weeks. The span
//:   is the range, so 200 notes over 18 days fill 18 of the 120 slots and the
//:   other 102 are empty: a comb of 18 teeth, which is the same complaint the
//:   48-note seed earned, at the size that passed. 86% of the strip is either
//:   empty or at the peak.
//: - **An old, sparse notebook**, a few notes a month for years. 150 notes
//:   fill 103 slots with a peak of 5, and that reads as a profile: 16% at an
//:   extreme. The count rule hid it.
//:
//: So the test is on the drawn shape: enough slots carry something that the
//: strip is not a comb, and the peak is deep enough that the bars differ at
//: all (with a peak of 1 to 3 every bar is full, a third or two thirds, which
//: is a bar code). Measured values: a fifth of the slots, and a peak of four.
//: Both are read off the density of the **whole range**, not off what is
//: loaded, so the strip does not appear halfway down a notebook that was
//: always big enough.
const TIMELINE_SCRUBBER_MIN_SLOTS = 24;
const TIMELINE_SCRUBBER_MIN_PEAK = 4;
const TIMELINE_SCRUBBER_SLOTS = 120;
const TIMELINE_SCRUBBER_HEIGHT = 1000; // the viewBox's own units

// The range the strip spans, newest at the top, as milliseconds.
function timelineDensitySpan() {
  const days = Object.keys(timelineDensity);
  if (!days.length) return null;
  let newest = -Infinity;
  let oldest = Infinity;
  for (const day of days) {
    const at = new Date(`${day}T00:00:00`).getTime();
    if (Number.isNaN(at)) continue;
    if (at > newest) newest = at;
    if (at < oldest) oldest = at;
  }
  if (!Number.isFinite(newest) || !Number.isFinite(oldest)) return null;
  // A range of one day would divide by zero; a day is a day wide.
  const width = Math.max(newest - oldest, 86400000);
  return { newest, oldest: newest - width, width };
}

function drawTimelineScrubber() {
  const strip = $("timeline-scrubber");
  const span = timelineDensitySpan();
  // One slot per band of time, filled with everything written inside it: the
  // strip is a shape, not a list of days, and 120 slots is about one per 8
  // pixels of a full-height strip.
  const slots = new Array(TIMELINE_SCRUBBER_SLOTS).fill(0);
  if (span) {
    for (const [day, count] of Object.entries(timelineDensity)) {
      const at = new Date(`${day}T00:00:00`).getTime();
      if (Number.isNaN(at)) continue;
      const fraction = (span.newest - at) / span.width;
      const slot = Math.min(TIMELINE_SCRUBBER_SLOTS - 1, Math.max(0, Math.round(fraction * (TIMELINE_SCRUBBER_SLOTS - 1))));
      slots[slot] += count;
    }
  }
  const peak = Math.max(...slots, 1);
  //: The shape decides, not the count: see the constants above. The slotting
  //: has to run first to ask the question at all, which is cheap (120 numbers
  //: over the days in range) and is the work this function was going to do
  //: anyway on every notebook large enough to draw.
  const show =
    span !== null &&
    slots.filter((count) => count > 0).length >= TIMELINE_SCRUBBER_MIN_SLOTS &&
    peak >= TIMELINE_SCRUBBER_MIN_PEAK;
  strip.classList.toggle("hidden", !show);
  if (!show) return;
  const step = TIMELINE_SCRUBBER_HEIGHT / TIMELINE_SCRUBBER_SLOTS;
  // A step chart drawn from the strip's right edge, closed along it, so the
  // shape reads as a profile of the writing rather than as a line drawing.
  const parts = ["M 40 0"];
  slots.forEach((count, index) => {
    const x = 40 - (count / peak) * 34;
    parts.push(`L ${x.toFixed(1)} ${(index * step).toFixed(1)}`);
    parts.push(`L ${x.toFixed(1)} ${((index + 1) * step).toFixed(1)}`);
  });
  parts.push(`L 40 ${TIMELINE_SCRUBBER_HEIGHT}`, "Z");
  $("timeline-density-path").setAttribute("d", parts.join(" "));
  drawTimelineWindow();
}

//: Where the reader is, as a band on the strip. Taken from the rows actually
//: on screen rather than from `scrollTop / scrollHeight`, because the feed is
//: linear in *rows* and the strip is linear in *time*: a fortnight of daily
//: writing and a quiet year take the same scroll distance per note, and a
//: marker computed from the scroll would drift further from the truth the more
//: uneven the notebook is, which is exactly the notebook this strip is for.
function drawTimelineWindow() {
  const strip = $("timeline-scrubber");
  if (strip.classList.contains("hidden")) return;
  const span = timelineDensitySpan();
  if (!span) return;
  const box = $("timeline-scroll").getBoundingClientRect();
  //: **Several probes, not one.** A single probe at the top centre of the box
  //: misses a row in two ways, and both were measured as a marker stuck at
  //: `y=0` after a jump tens of thousands of pixels down: the top of the box
  //: is a sticky bucket header as often as it is a row, and the month and year
  //: densities lay the rows out in two columns above 1024, with the gap
  //: between them running down the centre. So: four heights inward from the
  //: edge, at a quarter of the way across as well as at the middle.
  const at = (y, step) => {
    for (let i = 0; i < 4; i++) {
      for (const x of [box.left + box.width / 4, box.left + box.width / 2]) {
        const el = document.elementFromPoint(x, y + i * step)?.closest?.(".timeline-row");
        const row = el && timelineById.get(el.dataset.key);
        if (row) return row.when.getTime();
      }
    }
    return null;
  };
  const top = at(box.top + 4, 44) ?? span.newest;
  const bottom = at(box.bottom - 8, -44) ?? top;
  const y = (moment) =>
    Math.min(1, Math.max(0, (span.newest - moment) / span.width)) * TIMELINE_SCRUBBER_HEIGHT;
  const from = y(top);
  const to = y(bottom);
  const window_ = $("timeline-scrubber-window");
  window_.setAttribute("y", String(Math.min(from, to)));
  // A floor of 6 units, or a window over one busy day is a hairline nobody
  // can see and nobody can aim at.
  window_.setAttribute("height", String(Math.max(6, Math.abs(to - from))));
}

//: Click or drag to go there. The strip is linear in time, so a position on it
//: is a moment; the row to land on is the first one at or before that moment,
//: which is a binary search over the array (it is sorted newest first and can
//: hold thousands of rows).
function timelineScrubTo(clientY) {
  const span = timelineDensitySpan();
  if (!span) return;
  const box = $("timeline-scrubber").getBoundingClientRect();
  const fraction = Math.min(1, Math.max(0, (clientY - box.top) / Math.max(box.height, 1)));
  const target = span.newest - fraction * span.width;
  const rows = timelineVisibleRows();
  if (!rows.length) return;
  let low = 0;
  let high = rows.length - 1;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (rows[mid].when.getTime() <= target) high = mid;
    else low = mid + 1;
  }
  const row = rows[low];
  // Past the end of what is loaded: go to the end and ask for the next page,
  // which is what a reader dragging into the older half is asking for.
  if (row.when.getTime() > target && timelineNextCursor) {
    const box2 = $("timeline-scroll");
    box2.scrollTop = box2.scrollHeight;
    timelineLoadMore();
    return;
  }
  focusTimelineRow(row.key);
  drawTimelineWindow();
}

$("timeline-scrubber").addEventListener("pointerdown", (event) => {
  // Pointer capture, so a drag that leaves the 40px strip keeps scrubbing
  // instead of stopping the moment the pointer wanders into the feed.
  $("timeline-scrubber").setPointerCapture(event.pointerId);
  timelineScrubTo(event.clientY);
});

$("timeline-scrubber").addEventListener("pointermove", (event) => {
  if (!event.buttons) return;
  timelineScrubTo(event.clientY);
});

//: **The table** (TIMELINE_PLAN Phase 2, decision 6). The same rows the feed
//: draws, in the shape you want when the question is "which of these" rather
//: than "what happened then": every column at once, sortable, and several rows
//: at a time. It is a real `<table>`, so the columns are a header row a screen
//: reader announces, the sort lives on the header cells where a person looks
//: for it, and `aria-sort` says which way round it is.
//:
//: Switching views is a repaint of the array, never a fetch: the two views
//: cannot disagree about what a search matched, because they read the same
//: `timelineVisibleRows()`.
function timelineViewMode() {
  const stored = localStorage.getItem("timeline-view");
  if (stored === "table" || stored === "feed") return stored;
  //: **A phone opens the timeline as the table** (UI_MODERNISATION_PLAN
  //: Phase 11 item 8): the feed's two-column ribbon is a desktop's shape,
  //: and the table is one row per event at any width. A choice made on
  //: either surface still wins.
  return window.matchMedia("(max-width: 599.98px)").matches ? "table" : "feed";
}

// The columns, in the order decision 6 sets them out, with how each one sorts.
// `kind` and the counts are the reason this is a table at all: they are facts
// about a note that a feed row has no room for.
const TIMELINE_COLUMNS = [
  { key: "when", label: "Date", type: "time" },
  { key: "title", label: "Title", type: "text" },
  { key: "kind", label: "Kind", type: "text" },
  { key: "category", label: "Category", type: "text" },
  { key: "space", label: "Space", type: "text" },
  { key: "tags", label: "Tags", type: "text" },
  { key: "words", label: "Words", type: "number" },
  { key: "links", label: "Links", type: "number" },
];

// Newest first is the timeline's own order, so it is the table's default too.
let timelineSort = { key: "when", dir: "desc" };

function timelineSortValue(row, key) {
  if (key === "when") return row.when.getTime();
  if (key === "tags") return row.tags.join(", ");
  //: The same word the cell shows, or the column sorts by one string and
  //: displays another: a document sorted as "Note" and shown as "Document" is
  //: a column that looks broken (`timelinetable.js` caught exactly that).
  if (key === "kind") return TIMELINE_KIND_NAMES[row.kind] || "Note";
  if (key === "words" || key === "links") return row[key];
  return row[key] || "";
}

function timelineSortedRows(rows) {
  const { key, dir } = timelineSort;
  const column = TIMELINE_COLUMNS.find((c) => c.key === key) || TIMELINE_COLUMNS[0];
  const sign = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const left = timelineSortValue(a, key);
    const right = timelineSortValue(b, key);
    // A column the endpoint has not filled in yet (`words` and `links` are
    // null on an old payload) sorts last in both directions rather than
    // pretending to be zero, which would put every unknown note at one end and
    // read as a fact.
    if (left === null || left === undefined) return 1;
    if (right === null || right === undefined) return -1;
    if (column.type === "text") return sign * String(left).localeCompare(String(right));
    return sign * (left - right);
  });
}

function paintTimelineTable(rows) {
  const body = $("timeline-table-body");
  body.replaceChildren();
  const filtered = rows.length !== timelineRows.length;
  const column = TIMELINE_COLUMNS.find((c) => c.key === timelineSort.key);
  $("timeline-count").textContent = rows.length
    ? `${filtered ? `${rows.length} of ${timelineRows.length}` : rows.length} note${
        rows.length === 1 ? "" : "s"
      } · by ${(column ? column.label : "date").toLowerCase()}`
    : "";
  const sorted = timelineSortedRows(rows);
  const fragment = document.createDocumentFragment();
  for (const row of sorted) fragment.appendChild(timelineTableRow(row));
  body.appendChild(fragment);

  // The head says what it is sorted by, to the eye and to a screen reader.
  for (const button of $("timeline-table-head").querySelectorAll(".timeline-sort")) {
    const on = button.dataset.sort === timelineSort.key;
    button.classList.toggle("is-on", on);
    button.closest("th").setAttribute(
      "aria-sort",
      on ? (timelineSort.dir === "asc" ? "ascending" : "descending") : "none"
    );
  }
  for (const cell of document.querySelectorAll(".timeline-col-select")) {
    cell.classList.toggle("hidden", !selectMode);
  }
  syncTimelineDetailSpans();
  applyTimelineRowTabOrder();
}

//: **How many columns the table is actually drawing.** The tick column is
//: `.hidden` unless the selection mode is on (`timelineTableRow` below), so the
//: count is not `TIMELINE_COLUMNS.length + 1`: it is that, less the column that
//: is not there.
function timelineTableColumnCount() {
  return TIMELINE_COLUMNS.length + (selectMode ? 1 : 0);
}

//: **And the open detail row spans exactly that many, never one more.**
//:
//: Reported as "the timeline table view shrinks horizontally when opening a
//: note row" (INBOX 279). The detail was already a row of the table rather than
//: a sibling pane, so nothing was reflowing the card: what shrank was the one
//: column that has no width of its own. `table-layout: fixed` gives every
//: auto-width column an equal share of what the sized columns leave, and a
//: `colSpan` one past the last real column invents a tenth, auto-width column
//: for the share to be split with. Measured at three widths with the second row
//: opened, the Title column went 1032 to 516 at 1930, 702 to 351 at 1600 and
//: 542 to 271 at 1440: exactly half, every time, with the other half drawn as
//: empty space past the last header.
//:
//: Called from the paint (which is also where the tick column is shown and
//: hidden) as well as from the opener, so turning the selection mode on under
//: an open row re-spans it rather than leaving it a column short.
function syncTimelineDetailSpans() {
  const span = timelineTableColumnCount();
  for (const cell of document.querySelectorAll(".timeline-detail-row > td")) {
    if (cell.colSpan !== span) cell.colSpan = span;
  }
}

function timelineTableRow(row) {
  const tr = document.createElement("tr");
  tr.className = "timeline-row timeline-trow";
  tr.dataset.id = row.id;
  tr.dataset.key = row.key;
  tr.dataset.kind = row.kind;
  if (row.placedBy === "mentioned") tr.dataset.placed = "mentioned";
  tr.tabIndex = -1;
  tr.setAttribute("aria-expanded", "false");

  // The tick box only exists while the mode is on, the way the Notes list's
  // does: a column of empty boxes down a table nobody is selecting in is a
  // column of noise.
  const select = document.createElement("td");
  select.className = `timeline-col-select${selectMode ? "" : " hidden"}`;
  //: **Only a row that is a note can be selected.** The selection bar is the
  //: Notes list's (`#select-btn`'s code path, TIMELINE_PLAN decision 6), and
  //: every action on it, delete, tag, move, is an action on an `Entry`. A
  //: reminder ticked into that bar would be an id handed to the wrong table,
  //: which is the shape of bug that deletes the wrong thing. A board is an
  //: Entry and can be selected; a document and a reminder cannot.
  const selectable = row.kind === "note" || row.kind === "board";
  if (selectMode && selectable) {
    const check = document.createElement("input");
    check.type = "checkbox";
    check.className = "select-check";
    check.checked = selectedIds.has(row.id);
    check.setAttribute("aria-label", `Select ${row.title}`);
    check.addEventListener("change", () => {
      setTimelineRowSelected(tr, row, check.checked);
    });
    select.appendChild(check);
  }
  tr.appendChild(select);

  const when = document.createElement("td");
  const time = document.createElement("time");
  time.dateTime = row.whenIso;
  time.textContent = shortDate(row.whenIso);
  time.title =
    row.placedBy === "mentioned"
      ? `“${row.phrase}” in this note meant ${shortDate(row.whenIso)}. Written ${shortDate(row.writtenAt)}.`
      : `Written ${new Date(row.writtenAt).toLocaleString()}`;
  when.appendChild(time);
  tr.appendChild(when);

  const title = document.createElement("td");
  title.className = "timeline-col-title";
  title.textContent = row.title;
  title.title = row.title;
  tr.appendChild(title);

  const kind = document.createElement("td");
  kind.className = "timeline-col-wide";
  kind.textContent = TIMELINE_KIND_NAMES[row.kind] || "Note";
  tr.appendChild(kind);

  const category = document.createElement("td");
  category.className = "timeline-col-wide";
  category.textContent = row.category || "";
  tr.appendChild(category);

  const space = document.createElement("td");
  //: Its own class as well as the wide one: the tablet band hides this column
  //: and the two number columns (`06-timeline-dialogs.css`), and the head cell
  //: carries the same pair.
  space.className = "timeline-col-wide timeline-col-space";
  space.textContent = row.space || "";
  tr.appendChild(space);

  const tags = document.createElement("td");
  tags.className = "timeline-col-wide timeline-col-tags";
  tags.textContent = row.tags.join(", ");
  tags.title = row.tags.join(", ");
  tr.appendChild(tags);

  for (const key of ["words", "links"]) {
    const cell = document.createElement("td");
    cell.className = "timeline-col-wide timeline-col-number";
    // An em dash is not allowed and a 0 would be a claim: a blank cell with a
    // title is what "the endpoint did not say" looks like.
    cell.textContent = row[key] === null || row[key] === undefined ? "" : String(row[key]);
    if (row[key] === null || row[key] === undefined) cell.title = "Not known for this note";
    tr.appendChild(cell);
  }

  tr.addEventListener("click", (event) => {
    if (event.target.closest("a, button, input, textarea, .chip, img")) return;
    if (window.getSelection()?.toString()) return;
    if (selectMode) {
      setTimelineRowSelected(tr, row, !selectedIds.has(row.id));
      return;
    }
    toggleTimelineRow(tr, row);
  });
  if (selectedIds.has(row.id)) tr.setAttribute("aria-selected", "true");
  return tr;
}

function setTimelineRowSelected(tr, row, on) {
  if (on) selectedIds.add(row.id);
  else selectedIds.delete(row.id);
  tr.setAttribute("aria-selected", on ? "true" : "false");
  const check = tr.querySelector(".select-check");
  if (check) check.checked = on;
  updateBatchCount();
}

// Opening a row in a table is a row of its own: a `<td>` spanning every
// column, under the row it belongs to, which is the table's version of the
// feed's detail box and uses the same builder.
function openTimelineTableDetail(tr, row) {
  const holder = document.createElement("tr");
  holder.className = "timeline-detail-row";
  const cell = document.createElement("td");
  cell.colSpan = timelineTableColumnCount();
  const detail = document.createElement("div");
  detail.className = "timeline-row-detail";
  cell.appendChild(detail);
  holder.appendChild(cell);
  tr.after(holder);
  openTimelineRowDetail(detail, row);
}

//: The Select mode, in the Options menu because the row is at its
//: seven-control ceiling. It is the app's one selection mode, not a second
//: one: `enterSelectMode` clears the set, fills both bars and repaints both
//: surfaces.
function syncTimelineSelectUi() {
  const table = timelineViewMode() === "table";
  $("timeline-batch-bar").classList.toggle("hidden", !(selectMode && table));
  $("timeline-select-btn").classList.toggle("is-on", selectMode);
  $("timeline-select-btn").setAttribute("aria-pressed", String(selectMode));
}

$("timeline-select-btn").addEventListener("click", () => {
  if (selectMode) exitSelectMode();
  else enterSelectMode();
});

$("timeline-batch-tag").addEventListener("click", batchTag);
$("timeline-batch-delete").addEventListener("click", batchDelete);
$("timeline-batch-done").addEventListener("click", exitSelectMode);

//: Sorting is a click on the column head, and clicking the column you are
//: already sorted by turns it around. Time starts newest first and text starts
//: A to Z, because those are the two orders a person means by "sort by this".
$("timeline-table-head").addEventListener("click", (event) => {
  const button = event.target.closest(".timeline-sort");
  if (!button) return;
  const key = button.dataset.sort;
  const column = TIMELINE_COLUMNS.find((c) => c.key === key);
  if (!column) return;
  timelineSort =
    timelineSort.key === key
      ? { key, dir: timelineSort.dir === "asc" ? "desc" : "asc" }
      : { key, dir: column.type === "text" ? "asc" : "desc" };
  paintTimeline();
});

$("timeline-view-seg").addEventListener("click", (event) => {
  const button = event.target.closest("[data-timeline-view]");
  if (!button) return;
  const mode = button.dataset.timelineView;
  if (mode === timelineViewMode()) return;
  localStorage.setItem("timeline-view", mode);
  syncTimelineViewSeg();
  // A repaint, not a reload: `timelineRows` is already in memory and both
  // views render from it.
  paintTimeline();
});

function syncTimelineViewSeg() {
  const mode = timelineViewMode();
  for (const button of $("timeline-view-seg").querySelectorAll("[data-timeline-view]")) {
    const on = button.dataset.timelineView === mode;
    button.classList.toggle("active", on);
    button.setAttribute("aria-pressed", String(on));
  }
}

//: Scale is a repaint, not a request (see `timelineBucketKey`), and it is
//: remembered the way the graph's layout is: which bucket suits a notebook is
//: a property of the notebook rather than of one visit. "Auto" is stored like
//: any other choice, so a notebook that grows past the day threshold re-cuts
//: its own headers without anyone touching the control.
$("timeline-scale").addEventListener("change", (event) => {
  localStorage.setItem("timeline-scale", event.target.value);
  paintTimeline();
});

//: Grouping decides what the band filter offers, so it rebuilds the options
//: and repaints. It does not refetch either: every row already carries its
//: category, its tags and the note it continues.
$("timeline-group").addEventListener("change", () => {
  timelineFilter = null;
  fillTimelineBandOptions();
  paintTimeline();
});

//: **The bands are a filter now, not lanes** (TIMELINE_PLAN decision 5). As
//: lanes they were mostly empty: eight rows of whitespace with a handful of
//: dots in each. The same choice is worth more as "show me only this", which
//: is what the rest of the app does with a category.
$("timeline-band").addEventListener("change", (event) => {
  timelineFilter = event.target.value || null;
  syncTimelineFilterChip();
  paintTimeline();
});

//: One delegated handler on the list, not one per row: the rows are rebuilt
//: after every fetch, and a listener bound per row would accumulate with them
//: (`tests/test_frontend_handlers.py` exists because of exactly that shape).
//:
//: `change`, not `click`, since INBOX 214: the control is a checkbox inside
//: its own `<label>`, so a press on the words fires a click on the label and a
//: second one on the input it labels, and a click handler would toggle the
//: kind twice and land back where it started.
$("timeline-kinds")?.addEventListener("change", (event) => {
  const box = event.target.closest("[data-timeline-kind]");
  if (!box || box.disabled) return;
  toggleTimelineKind(box.dataset.timelineKind);
});

$("timeline-filter-clear").addEventListener("click", () => {
  timelineFilter = null;
  $("timeline-band").value = "";
  syncTimelineFilterChip();
  paintTimeline();
});

const timelineDays = $("timeline-days");
if (timelineDays) {
  timelineDays.addEventListener("change", () => {
    const isCustom = timelineDays.value === "custom";
    const customRangeEl = $("timeline-custom-range");
    if (customRangeEl) {
      customRangeEl.classList.toggle("hidden", !isCustom);
    }
    // A range is the one control that has to go back to the server.
    if (!isCustom || ($("timeline-start-date").value && $("timeline-end-date").value)) {
      renderTimeline();
    }
  });
}

$("timeline-start-date")?.addEventListener("change", () => {
  if ($("timeline-end-date").value) renderTimeline();
});
$("timeline-end-date")?.addEventListener("change", () => {
  if ($("timeline-start-date").value) renderTimeline();
});

//: Today is at the top of a newest-first feed, so this is a scroll rather than
//: a search. It still looks the bucket up by key rather than assuming the
//: first section is today's: a notebook with nothing written today should land
//: on the newest day it has, not claim that day is today.
$("timeline-jump-today")?.addEventListener("click", () => {
  const feed = $("timeline-feed");
  const today = timelineBucketKey(new Date(), feed.dataset.scale || "day");
  const section =
    feed.querySelector(`.timeline-bucket[data-bucket="${today}"]`) || feed.firstElementChild;
  if (!section) return;
  const box = $("timeline-scroll");
  box.scrollTop += section.getBoundingClientRect().top - box.getBoundingClientRect().top;
  section.querySelector(".timeline-row")?.focus();
});

//: **Search filters, it does not dim** (decision 2). Dimming left every row in
//: place: the same scroll distance, the same Ctrl+F hits, 48 rows to read past
//: to find the two that matched. 150ms is the debounce the Notes, Library and
//: Graph boxes use, and a repaint costs no request.
let timelineSearchDebounceTimeout;
$("timeline-search").addEventListener("input", () => {
  clearTimeout(timelineSearchDebounceTimeout);
  timelineSearchDebounceTimeout = setTimeout(paintTimeline, 150);
});

$("timeline-clear-search")?.addEventListener("click", () => {
  $("timeline-search").value = "";
  paintTimeline();
  $("timeline-search").focus();
});
