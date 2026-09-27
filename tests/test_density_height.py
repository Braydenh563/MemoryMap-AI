"""Height-aware density (WORLD_CLASS_PLAN 22.1 item 2).

"The laptop screen is mostly chrome": at 1093x614 (1366x768 at 125%) the
Dashboard's widgets started below the fold. With no density chosen (Auto), a
window 700px tall or less is Compact; a choice in Appearance always wins; the
dashboard's own Full level follows the app's Compact. Measured in a browser
by `scratchpad/ui-sweeps/laptopfold.js`; these hold the wiring.
"""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FRONTEND = ROOT / "frontend"


def _text(name: str) -> str:
    return (FRONTEND / name).read_text(encoding="utf-8")


def test_the_first_paint_and_the_settings_make_the_same_call():
    boot = _text("theme-boot.js")
    settings = _text("settings.js")
    for source, name in ((boot, "theme-boot.js"), (settings, "settings.js")):
        assert '"(max-height: 700px)"' in source, f"{name} no longer asks how tall the window is"
    assert 'localStorage.getItem("density")' in boot, "a chosen density no longer wins at first paint"
    body = settings[settings.index("function effectiveDensity(") :]
    body = body[: body.index("\n}\n")]
    assert 'localStorage.getItem("density")' in body and '"compact"' in body


def test_auto_is_a_choice_in_appearance_and_clears_the_setting():
    html = _text("index.html")
    seg = html[html.index('id="density-seg"') :]
    seg = seg[: seg.index("</div>")]
    assert 'data-density="auto"' in seg
    settings = _text("settings.js")
    assert 'if (b.dataset.density === "auto") localStorage.removeItem("density");' in settings
    assert "window crosses 700px tall" in settings or "DENSITY_SHORT.addEventListener" in settings


def test_the_dashboard_level_is_stored_only_when_chosen_and_follows_compact():
    dash = _text("dashboard.js")
    assert "applyDashDensity(dashDensity(), { persist: false });" in dash
    body = dash[dash.index("function applyDashDensity(") :]
    body = body[: body.index("\n}\n")]
    assert "if (persist) localStorage.setItem(DASH_DENSITY_KEY, density);" in body
    assert 'density === "full" && appCompact ? "compact" : density' in body
