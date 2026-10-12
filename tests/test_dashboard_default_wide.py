"""A widget that starts wide must be able to go narrow (the heatmap's Narrow
button once saved an empty list that read as "never chosen")."""

import re
from pathlib import Path

JS = (Path(__file__).resolve().parents[1] / "frontend" / "js" / "dashboard.js").read_text(encoding="utf-8")


def test_every_default_wide_widget_is_a_real_widget_shown_by_default():
    wide = re.search(r"const DASH_DEFAULT_WIDE = \[([^\]]*)\]", JS).group(1)
    shown = re.search(r"const DASH_DEFAULT_SHOWN = \[([^\]]*)\]", JS, re.S).group(1)
    for name in re.findall(r'"([\w-]+)"', wide):
        assert f'  {name}: {{' in JS or f'"{name}": {{' in JS, name
        assert f'"{name}"' in shown, f"{name} starts wide but is not shown by default"


def test_narrowing_is_remembered_so_the_default_does_not_come_back():
    toggle = JS.split("async function toggleDashWidgetWide", 1)[1].split("\n}\n", 1)[0]
    assert "next.narrow" in toggle
    assert ".filter((n) => !(saved.narrow || []).includes(n))" in JS
