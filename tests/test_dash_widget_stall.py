"""A dashboard widget never stays on "Loading…" (INBOX 513: Stats, Streak and
the constellation "stuck loading"). The three share one `/insights/stats`
request; one that never answered left all three empty, which the CSS shows as
"Loading…" for good. Measured by `scratchpad/ui-sweeps/dashhang.js` (a stats
request held open: both cards end on Retry; Retry draws them)."""
from pathlib import Path

JS = (Path(__file__).resolve().parents[1] / "frontend" / "js" / "dashboard.js").read_text(encoding="utf-8")


def test_the_shared_stats_request_has_a_deadline_and_forgets_a_failure():
    js = JS
    assert 'apiJson("/insights/stats", { timeoutMs: 15000 })' in js
    assert "if (dashStatsInflight === pending) dashStatsInflight = null;" in js


def test_every_widget_mounts_through_the_stall_guard():
    js = JS
    assert "mountWidgetBody(widget, body);" in js
    assert "widget.render(body))\n        .catch" not in js
    assert '"This is taking longer than it should."' in js


def test_the_constellation_waits_for_its_library():
    js = JS
    assert 'if (typeof p5 === "undefined" && !(await ensureP5()))' in js
