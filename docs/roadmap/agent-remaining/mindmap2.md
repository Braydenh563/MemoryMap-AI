# Mind map, §12.1's last two live items: what is left

> Companions: [MINDMAP_PLAN.md](../MINDMAP_PLAN.md) ·
> [mindmap.md](mindmap.md) (the ninth run's own list) ·
> [HISTORY.md](../HISTORY.md) ("Moved from the plans, 2026-09-21")
>
> One agent, one worktree (`worktree-agent-mindmap2`), port 8793, data dir
> `/tmp/mm-mindmap2`. Everything below was measured in a real Chromium against
> the running app, not read off the source.

## Done

- **An image in a node** (§12.1 item 2's fourth). `data.image`, a
  `/media/upload` url held to `MEDIA_URL_RE` by a validator on the field, drawn
  as a second node shape (`data-body="picture"`: the body becomes a column, the
  picture takes the card's width, the label is the caption). Put in and taken
  out from the topic's own menu. `scratchpad/ui-sweeps/mindmapimage.js`, 10/10:
  a 160x90 PNG through the real file chooser draws at 182.2x102.5 inside a
  200x137.8 card at aspect 1.78, the sibling stays 44px, removal returns it to
  44px, and the FreeMind export carries `_image`.
- **Curve control points drag to reshape a tree edge** (§12.1 item 5's third).
  `edge_bend` and `edge_slide` on the child, two fractions of the line's own
  length. Composes with all three line shapes and with the tapered ribbon.
  `scratchpad/ui-sweeps/mindmapcurve.js`, 14/14: the handle is 0.19 to 0.39
  board units off the path for all three shapes, a drag moves the centreline 74
  units, and the stored pair comes back inside the schema's bounds.
- Both probes are in `scripts/gate.sh`'s sweep list by name.
- The grip follows DESIGN.md's canvas-grip recipe, which gained the row and
  two lints in `tests/test_ui_recipes.py` (every canvas grip cancels the
  board's zoom; a grip drawn invisible does not take the pointer).
- A picture topic draws as its picture in the board's own PNG/SVG export.

## Left to do

- **Neither probe has been run at 390x844.** Both were run in dark as well as
  light (14/14 and 10/10 either way), and both take `VIEWPORT`, but neither has
  been read at phone width.
- **A picture node on a phone is unmeasured.** A 200px card with a 10rem
  picture cap is fine at 1440; at 390x844 with the map zoomed out the caption
  may be the only readable part. Worth one pass of `mindmapimage.js` with
  `VIEWPORT=390x844`.
- **The map strip can still cover the handle of a line into the selected
  topic.** This is why the hover route exists, and the hover route is measured
  working with nothing selected, so the control is always reachable. What is
  not done is the strip's own placement: it opens 44px above the topic,
  several hundred pixels wide, and knows nothing about what is under it. If
  this is ever worth fixing it belongs to the strip, not to this item.
- **`scratchpad/ui-sweeps/mindmap3.js` times out** at `#wb-boards-generate`
  (the "make a map from my notes" flow, the AI half OPEN.md already says no
  sandbox here can exercise). Nothing in this work touches the boards list or
  that button, and mindmap3 is not in the gate's sweep list, so it was left
  alone; whether it is pre-existing was not checked against the base branch.
- **Nothing resizes the node to the picture.** A picture node keeps whatever
  width the topic had (200 in the probe, 170 by default) and grows only in
  height. Widening a topic on upload was left out deliberately: the resize grip
  and `sized` already exist, and a node that changed width by itself would
  fight the tidy pass. Worth a decision if someone asks for it.
