"""The sub-tab strip stays opaque while another pane scrolls (owner,
2026-10-12: "sometimes the submenubar can glitch and go transparent when
scrolled"). Measured in a browser: the page scroll set `data-scrolled` on the
strip; an inner pane scrolling once cleared it (null), because every region
cleared every bar that was not its own. Now only the region that set a bar may
take it back (verified: flag stays "1" after the pane scrolls)."""

from pathlib import Path

JS = (Path(__file__).resolve().parent.parent / "frontend" / "js" / "shell-reminders.js").read_text(encoding="utf-8")


def test_a_region_only_clears_the_bars_it_set():
    assert "const scrollEdgeOwner = new WeakMap();" in JS
    assert '(scrollEdgeOwner.get(bar) || region) === region) bar.removeAttribute("data-scrolled")' in JS


def test_both_places_that_set_a_bar_record_the_owner():
    assert JS.count("scrollEdgeOwner.set(") == 2
