// drag-edge.js: a drag-selection near the edge of a list scrolls it, moved out
// of selection.js on 2026-10-05 for the boot-script gzip budget
// (tests/test_boot_budget.py). Only a held mouse drag reaches it, so the boot
// carries nothing but its `LAZY_MODULES.dragEdge` row (app.js), fetched a few
// seconds after boot with the other late bundles; this file's top level wires
// the three listeners itself (phone-shell.js used to call
// `initDragSelectEdgeScroll`).

//: **A drag-selection near the top or bottom of a list scrolls it** (INBOX
//: 608, the owner: "when I drag select off the screen ... it doesnt scroll
//: down or up or the way I am dragging"; the boards and maps pan, see
//: `wbEdgePan` in whiteboard.js, which is tied to the board's zoom and cannot
//: be reused here, so this is the same shape for a plain scroller).
//:
//: Chromium already scrolls a text selection in the last ~20px of a scroller
//: and past it (measured: 700 to 1,100px a second at the edge, 0 from 25px
//: in), so a held drag 40px from the edge, where a hand naturally rests when
//: it is not aiming at the very pixel, did nothing. This takes over from 20px
//: out to 56px and leaves the rest to the browser, so the two never add up.
//: Faster the deeper in (linear, 1px a frame at 56px to 12 at 20px, about
//: the browser's own pace there), and the selection is extended to whatever
//: is now under the pointer, because content that scrolls under a
//: still mouse sends no `mousemove`.
//:
//: Opt-in by zone, not for every scroller: a code editor, a canvas and a
//: textarea each scroll themselves. Mouse only: a touch selection scrolls by
//: its own handles.
const DRAG_EDGE = { x: 0, y: 0, el: null, frame: 0 };
function dragEdgeTick() {
  const d = DRAG_EDGE;
  const sel = window.getSelection();
  d.frame = 0;
  if (!d.el?.isConnected || sel.isCollapsed || !d.el.contains(sel.anchorNode)) return;
  //: 1 to 12px a frame between 56px and 20px from an edge, the browser's own below.
  const pace = (dist) => (dist > 20 && dist < 56 ? Math.round(1 + (11 * (56 - dist)) / 36) : 0);
  const box = d.el.getBoundingClientRect();
  const step = pace(box.bottom - d.y) || -pace(d.y - box.top);
  const was = d.el.scrollTop;
  d.el.scrollTop = was + step;
  const at = d.el.scrollTop !== was && document.caretPositionFromPoint?.(d.x, d.y);
  if (at && d.el.contains(at.offsetNode)) sel.extend(at.offsetNode, at.offset);
  d.frame = requestAnimationFrame(dragEdgeTick);
}
function initDragSelectEdgeScroll() {
  const d = DRAG_EDGE;
  document.addEventListener("mousedown", (e) => {
    let el = e.button === 0 && e.target.closest?.("#entry-list, .library-view-section");
    while (el && el !== document.documentElement && !(/auto|scroll/.test(getComputedStyle(el).overflowY) && el.scrollHeight > el.clientHeight)) el = el.parentElement;
    d.el = el || null;
  }, true);
  document.addEventListener("mousemove", (e) => {
    if (!d.el || !(e.buttons & 1)) return;
    d.x = e.clientX;
    d.y = e.clientY;
    d.frame ||= requestAnimationFrame(dragEdgeTick);
  }, true);
  document.addEventListener("mouseup", () => {
    d.el = null;
    cancelAnimationFrame(d.frame);
    d.frame = 0;
  }, true);
}

initDragSelectEdgeScroll();
