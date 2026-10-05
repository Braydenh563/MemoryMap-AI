# MINDMAP_PLAN section 13 and its placed items: what is left (2026-10-04)

> Companions: [MINDMAP_PLAN.md](../../MINDMAP_PLAN.md) section 13 and the
> "Placed from INBOX" lists · [HISTORY.md](../../HISTORY.md) "Moved from the
> plans, 2026-10-04 (the map's palette, font and the app's own default)"
>
> One agent, own worktree, port 8794, data dir `/tmp/mm-mind`. Figures were
> taken in Chromium against the running app at 1440x900 in light unless a
> width or theme is named.

## Done

- 13e's remainder: a branch palette (one server list, `/tree` hands it to the
  canvas, the thumbnail and its cache key read the same name), a map font
  (canvas and image export), and decision 9's pin per themed select.
  `mappalette.js` 13/13 in light, dark and 390; `maptheme.js` 24/24.
- INBOX 24: the New menu's rows carry a visible one-line hint
  (`boardsnew.js`, 0 findings at 2000/1440/820/390, light and dark).
- Placed, verified already built: All draws a map as a map
  (`libraryallmap.js`), the Boards and maps dock is one row from 2000 to 820
  (`boardsdock.js`).
- 13b's remainder: the strip no longer covers the handle of the line into its
  topic, 4/48 to 0/192 (`mapstripcover.js`).
- 13c's in-flight cue and 13f's markup were already closed; `maplinkcue.js`
  12/12 re-run.

## Left to do

- **The Boards and maps dashboard widget's tall maps** (MINDMAP_PLAN, the
  evening batch, still open there): a 25-topic tree-right map draws a 20x40
  paper in the 72x40 row box, a 7-topic one 25x40. `mapPreview`'s rule is
  "the paper is the board's shape"; cropping a tall map to the box, or a
  square box, is a judgement for the owner.
- **13g** (the middle-button pan on the owner's machine) needs the owner.

## Found, not fixed

- On the base branch, before this work, and not touched by it (the KG
  merges): `test_list_limits` and `test_list_endpoints_page` (`/entities`,
  `/note-types`, `/relation-types` have no limit), `test_core_message_wording`
  (`routes_mentions.py` `LINK_UNSAFE_WHY`), `test_no_import_cycles`
  (`routes_entries` and `routes_properties`; `core.database` and
  `core.vault`), and `test_events.py::test_every_manager_write_records_exactly_one_event`
  (`link_label` in entry/manager.py has no driver in core/events.py).
- Found and fixed in this work's own first commit: the export's theming walk
  ran on every map (to drop pins) without a seen set, so a ring in
  `parent_id` hung the export (`test_a_ring_in_the_tree_does_not_hang_an_export`
  hung rather than failed, which is why `test_mindmap.py` first looked slow).

## Not verified

- The `wide` font stack on Windows and macOS (only seen falling back to
  DejaVu Sans here).
- The handles of the lines *out of* the selected topic against the strip.
- A themed map's re-import still comes back as topics carrying the look, not
  as a themed map (unchanged, see [maptheme.md](maptheme.md)).
