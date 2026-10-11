"""The calendar's Month / Week / Day strip slides (the owner, 2026-10-11).

`glideStrip` slides a strip's indicator from where it was drawn, so the strip
element and its parent must survive a repaint: moving an element cancels its
running animation. Measured in Chromium: the indicator's transform changes
over the glide (matrix tx -5.0, -2.6, -0.2 at 30 ms steps) once the strip is kept.
"""

from pathlib import Path

JS = (Path(__file__).resolve().parent.parent / "frontend/js/timeline-calendar.js").read_text()


def test_the_span_strip_and_head_are_kept_between_paints():
    assert "timelineCal.spanSeg" in JS and "timelineCal.headEl" in JS
    assert "timelineCalMount(box, head" in JS
    assert "box.replaceChildren(head" not in JS
    assert "box.replaceChildren(timelineCalHead" not in JS
