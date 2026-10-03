"""One drawing for a provenance word (INBOX 437).

The owner: "make sure the badges are the same style across the app". Before,
"Built-in" was a hairline box in Settings and bare text on the Library's
skill cards, and "you set this" was a third drawing. DESIGN.md's recipe
index names `chip item-label` for every one of them;
`scratchpad/ui-sweeps/badges.js` measures it in the browser.
"""

from __future__ import annotations

import re

from tests._app_js import JS_DIR

WORDS = ("Built-in", "Edited", "Yours", "you set this")


def _js() -> str:
    return "\n".join(p.read_text(encoding="utf-8") for p in sorted(JS_DIR.glob("*.js")))


def test_every_provenance_chip_is_the_label_recipe():
    js = _js()
    for word in ("Built-in", "Edited"):
        for match in re.finditer(rf'chip\([^;\n]*"{word}"[^;\n]*\)', js):
            assert "item-label" in match.group(0), match.group(0)


def test_the_retired_drawings_stay_retired():
    css = "\n".join(p.read_text(encoding="utf-8") for p in sorted((JS_DIR.parent / "css").glob("*.css")))
    js = _js()
    for name in ("sampling-source-user", "skill-badge-custom"):
        assert name not in css and name not in js, name


def test_the_library_card_and_the_sliders_use_it():
    js = _js()
    assert "`chip item-label skill-badge" in js
    assert '"chip item-label sampling-source"' in js
    assert 'classList.toggle("is-yours", overridden)' in js


def test_a_named_items_actions_are_its_own_column():
    js = _js()
    #: templates, personas and custom skills: the actions beside the row, not in it
    assert js.count("li.append(row, actions)") >= 3
