# Mind map: what is left

> Companions: [MINDMAP_PLAN.md](../MINDMAP_PLAN.md) ·
> [HANDOVER.md](../HANDOVER.md) · [../../DESIGN.md](../../DESIGN.md)
>
> Rewritten after the second run: reports A to E and H are closed and the
> detail lives in their commits. Everything below was checked in a real
> Chromium against the running app, not read off the source.

## Closed, with the commit that carries the numbers

| Was | Now |
| --- | --- |
| A permanent selection box; B text selection in a node; C a map filed as a note; D the "Point a new node at…" dialog; E a dangling cross-link | First run: see HISTORY and the commits it names. |
| INBOX 42, an edge attached to neither node after a one-node drag | e985f57. Measured 155.6px adrift mid-drag (child) and 129.2px (root), and it stayed adrift after the drop for any node already pinned; 0px in every case after. |
| H, tidy at scale, and a map framing itself on open | 047e385. 201 nodes: 0 overlaps, tidy 2905ms, one full render 134ms; a map opens with its root clear of the top bar (0px overlap, the hit test at its centre lands in the node). |

## The sweeps that gate this

| Sweep | Checks |
| --- | --- |
| `scratchpad/ui-sweeps/mindmap.js` | **63** (was 49) |
| `scratchpad/ui-sweeps/mindmap3.js` | 37 |
| `scratchpad/ui-sweeps/mindmap-theme.js` (`THEME=dark`) | 7 |

Run them against a **fresh** data dir (`serve.sh <port> /tmp/mm-mapN`): the
sweep asserts board-gallery contents, so a dir left over from an earlier run
carries other boards into those checks.

## Left to do, in the brief's order

### F. Redesign the whiteboard and map previews: NOT started

**Do not rebuild the renderer; it exists.** `mapPreview()` in
`frontend/app.js` (~line 1493) is already the single shared preview, used by
the Library cards, the dashboard widget, the timeline and note chips, and it
already draws `preview_edges` under the blocks with labels beside them. The
server half is `_board_preview` / `_preview_items` in
`src/memorymap/api/routes_whiteboard.py` (~580-670), which normalises
positions into 0..1 and samples the board down to `PREVIEW_POINTS` (40).

What the report asks for that is **not** there, checked in the code:

1. **Aspect.** The SVG sets `preserveAspectRatio="none"`, so the miniature is
   stretched to the card's box rather than drawn at the board's own ratio.
2. **Colour.** `preview_items` ships `{x, y, kind, label}` and no colour, so
   every node draws in one grey. A map's branch colour is computed on the
   client (`wbMapColors`), so the server would have to send either the node's
   own `data.color` or its branch index.
3. **Shape.** Nodes are 1.5px-radius rects; the brief asks for rounded rects
   with their colours, edges as curves (they are straight `<line>`s today) and
   drawings as strokes (today a single squiggle glyph per sketch, because
   stroke data is deliberately not shipped).
4. **Cache.** Nothing is cached per `updated_at`; the preview is recomputed on
   every board list. Worth doing with 4 in one pass: the list rebuilds every
   board's thumbnail on every visit to the Library.
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

## Found while measuring, not fixed

- **Tidy persists one node at a time.** `wbSaveBulkMove` awaits a PUT per
  moved node, so a 200-node tidy lays out and renders immediately and then
  spends 2.8s writing (200 requests). Nothing is lost and the canvas is
  correct throughout; a reload inside those 2.8s would see some nodes at
  their old places. A bulk move endpoint, or bounded concurrency here, is
  the fix if it ever matters.
- **A sweep can stall for minutes with the server answering nothing, and it
  is the embedding pass, not a hang.** Seen twice while running these
  sweeps beside two other agents' full test suites on a four-core box: no
  request logged for minutes, `GET /` timing out, the uvicorn process in
  `R` state. The server log says what it is doing, between the request
  lines: `Batches:   0%|          | 0/1 [00:00<?, ?it/s]`, the local
  embedding model indexing the notes the sweep just created. It answers
  again when that finishes. Worth knowing before anyone spends an hour on
  it: check the server log for `Batches:` first, and run a sweep when the
  box is not already running two suites.

## What could not be verified

- One viewport (1440x900, DPR 1) and light theme, except the dark sweep,
  which is unchanged at 7/7. Nothing was measured on a phone.
- No real inference. No AI map tool was driven from the UI.
- The 200-node timings are one run on a loaded machine; they say "no
  overlaps and no stall", not "this is the number".
