# Mind map bug run: what is done, what is left

> Companions: [MINDMAP_PLAN.md](../MINDMAP_PLAN.md) ·
> [HANDOVER.md](../HANDOVER.md) · [../../DESIGN.md](../../DESIGN.md)
>
> Written mid-run, deferred rather than dropped. Reports A to H are the
> owner's own, with screenshots. Everything below that says "measured" was
> driven in a real Chromium against the running app on port 8816, not read
> off the source.

## How this was worked

One server per agent (`bash scratchpad/ui-sweeps/serve.sh 8816 /tmp/mm-maps`),
Playwright through `scratchpad/ui-sweeps/lib.js` `boot()`. Every report was
reproduced before anything was changed, and the reproduction is what the sweep
check was then written against. The three sweeps are the gate:

| Sweep | Was | Now |
| --- | --- | --- |
| `scratchpad/ui-sweeps/mindmap.js` | 35 | **49** |
| `scratchpad/ui-sweeps/mindmap3.js` | 32 | **37** |
| `scratchpad/ui-sweeps/mindmap-theme.js` (`THEME=dark`) | 7 | 7 |

`.venv/bin/python -m pytest -q tests/test_whiteboard.py tests/test_style_scale.py
tests/test_css_braces.py tests/test_frontend_ids.py tests/test_frontend_handlers.py`
passes (69), and `ruff check .` is clean.

**One trap found and fixed for every future sweep:** the welcome tour opens
after unlock, and it raced `boot()`'s own hide, so a sweep would fail every
click with "`#onboarding-overlay` intercepts pointer events". It cost two
runs. `lib.js` now sets `onboardingDone` in an init script, before the app
boots, which is the only ordering that cannot lose.

## Done, with the number that proves it

### A. "there's a permanent selection box on my mindmap": fixed

**Reproduced.** It is a real `.wb-marquee` rect, and the only thing that
removed it was a `pointerup` on the board container, so it leaked four ways,
each measured: released outside the container (a 552x440 rect left behind), a
second pointerdown mid-drag (one variable held the reference and it was
overwritten), a `pointercancel`, and none of Escape, an empty-canvas click or
reopening the board cleared it, because the rect lives in `#wb-zoom-group`,
which the render joins by data and never empties.

Fixed in `frontend/whiteboard.js`: the drag captures the pointer, ends on
`pointerup`/`pointercancel`/`lostpointercapture` at window level, refuses a
non-primary button, and `wbClearSelectionOverlays()` sweeps on Escape, on an
empty-canvas click and in `openWhiteboardBoard`. Same for the lasso.

### B. "I cant highlight text in mindmap text boxes": fixed

**Reproduced.** A click-drag across a node being edited selected the empty
string and moved the node 165px. `objDrag`'s filter excluded
`.wb-text-content` by class, and a map node's editor is `.wb-map-text`. The
node's own `pointerdown` `stopPropagation` cannot help: d3-drag listens for
`mousedown`, and this file already records that two event families cannot
cancel each other. Both that filter and the canvas focus-steal now ask the
element whether it is editable. Measured after: drag selects text, the node
does not move, double-click selects a word, Shift+arrows extend.

### C. "I made a mindmap naming it test and I think it came up as a new note??": fixed

**Reproduced**, and worse than reported: on a notebook with nine maps the
Notes list drew twelve rows, ten of them maps, and the dashboard's list
carried the map too. `GET /entries` had no board filter at all. It now takes
`boards=exclude` (the new default) `|include|only`, with the count header
following the same mode; the manager keeps `include` as its own default so no
in-process caller changed. The two callers that wanted boards in that response
(the `[[wiki]]` resolver and the editor's `@` picker) read the board index
that already backs the map chips.

**The timeline was left alone on purpose.** A map there renders as a
`.map-chip`, not as a note row (measured), which is MINDMAP_PLAN.md §5 item 12
working as designed.

### D. The "Point a new node at…" dialog: fixed

**Reproduced and measured**: 63px of title past the row's own edge, and
`justify-content: center` from the generic button rule. Two causes: the row is
a `<button>`, and `text-overflow` does nothing on a flex container whose item
has no `min-width: 0`. Plus one the report did not name and the screenshot
shows: every row carried the base button's accent glow over a transparent
background. Fixed in `.entry-pick-row` (04-chat-dock-appearance.css, where the
component lives, because the dialog is shared with the selection kebab's "Add
to a note…"). After: 0px overflow, ellipsis on the title, every icon at 9px
and every title at 37px from the row's left edge, all rows 38px, no shadow.

### E. A dangling edge to nowhere: fixed

**Reproduced**, two faults. Client: deleting one end of a cross-link removed
the row on the server but the client kept its copy, so the render set the
path's `d` to `""` and left the `<g>` on the canvas until a reload. Server: a
link's ends are ids inside JSON, not foreign keys, and purging a note deletes
its `WhiteboardNode` rows in bulk without going through a delete route, so the
link outlived the card. There is now an integrity pass on board load
(`_drop_orphan_links`) and the sketch data join filters an unresolvable link.
A deliberate free end (`sourcePoint`/`targetPoint`) is kept, and the test
asserts both halves.

## Left to do, in the brief's order

### F. Redesign the whiteboard and map previews: NOT started

**Do not rebuild the renderer; it exists.** `mapPreview()` in
`frontend/app.js` (~line 1493) is already the single shared preview, used by
the Library cards, the dashboard widget, the timeline and note chips, and it
already draws `preview_edges` under the blocks with labels beside them. The
server half is `_board_preview` / `_preview_items` in
`src/memorymap/api/routes_whiteboard.py` (~580-670), which normalises
positions into 0..1 and samples the board down.

What the report actually asks for that is **not** there, checked in the code:

1. **Aspect.** The SVG sets `preserveAspectRatio="none"`, so the miniature is
   stretched to the card's box rather than drawn at the board's own ratio.
   That is the "wrong aspect / raw canvas dump" half of the report.
2. **Colour.** `preview_items` ships `{x, y, kind, label}` and no colour, so
   every node draws in one grey. A map's branch colour is computed on the
   client (`wbMapColors`), so the server would have to send either the node's
   own `data.color` or its branch index.
3. **Shape.** Nodes are 1.5px-radius rects; the brief asks for rounded rects
   with their colours, edges as curves (they are straight `<line>`s today) and
   drawings as strokes (today a single squiggle glyph per sketch, because
   stroke data is deliberately not shipped).
4. **Cache.** Nothing is cached per `updated_at`; the preview is recomputed on
   every board list.
5. **Empty state.** `mapPreview` returns `null` for an empty board and each
   caller improvises. The brief asks for one designed empty state.

**Next step**: extend `_preview_items` to carry a colour and an aspect ratio
(the board's own bounds w/h, already computed there), add an `updated_at`-keyed
cache beside it, then rework `mapPreview()` to letterbox into the card's box
instead of stretching. Gate it with a new sweep, and reuse the dashboard
"Boards & maps" widget check that `mindmap3.js` already has.

### G. MINDMAP_PLAN.md Phases 4 and 5: NOT started

Phase 4 items 14 and 16 are partly built already (the four AI tools, and the
Markdown/OPML exports plus OPML/Markdown import), MINDMAP_PLAN.md §9 and §10
record exactly what landed, and §10.4 records that **no AI tool has ever been
exercised from the UI**. Phase 5 (focus mode, perspectives, metrics,
templates) is untouched. Read §10.4 before starting either; three sessions
have rebuilt existing work in this repo.

**Next step**: Phase 4 item 15 (AI generation) or item 16's PNG/SVG/PDF half,
each gated by its own sweep, in the plan's order.

### H. General mindmap usability: mostly built, two open

Checked in the running app, not assumed:

- **Keyboard is built and green**: Tab child, Enter sibling, Shift+Tab
  outdent, Delete subtree with Undo, arrows walk the tree, F2 and double-click
  edit. `mindmap.js` asserts each one.
- **Hover affordances** exist (`+` and the library button appear on hover or
  selection, measured non-overlapping) and the **collapse chevron** sits on
  the node's own edge with the count badge above it, both asserted.
- **Tidy does not overlap** at five nodes in all three layouts, asserted.

Open, and honestly open:

1. **Tidy at scale.** Every overlap measurement in this feature's history is
   on a five-node map. §10.4 says as much. Nothing has built a map of
   hundreds of nodes and timed the layout or checked for overlap.
2. **Double-click to edit needs the node in the clear.** Measured while
   reproducing B: with the root at the board origin the node sits under
   `#wb-topbar`, and a click on its text hits the top bar instead. The sweep
   works around it with `wbZoomToFit`. A newly opened map should frame its own
   root rather than leave it under the chrome.

**Next step**: build a 200-node map through the API, run Tidy, and measure
overlaps and frame time; then make `openWhiteboardBoard` fit a map's content
on open.

## What could not be verified

- One viewport (1440x900, DPR 1) and light theme for everything except the
  dark sweep, which is unchanged at 7/7. Nothing was measured on a phone.
- No real inference. No AI map tool was driven from the UI.
- `errors.js` was not re-run after this run's CSS change; the picker dialog
  was measured directly instead (`bodyOverflow` 0, card inside the viewport).
- The full 2,700-test suite was not run end to end; the five gate files and
  the `-k "entries or entry or timeline or graph or library or search"`
  selection were, and both pass.
