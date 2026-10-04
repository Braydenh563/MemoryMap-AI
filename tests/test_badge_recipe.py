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


#: Every status word (INBOX 461 (1), 468): the words a badge says about the
#: state of a thing (installed, ready, in use, fits) are the same recipe as
#: the provenance words above, the tone on the edge and the icon.
STATUS_WORDS = (
    "Installed", "Not ready yet", "Fits", "Tight fit", "Too big here", "In use for",
    "Download cancelled", "Our starting pick", "confirms first", "online", "in use",
    "is ready", "can't read yet", "Installing Tesseract",
)


def test_every_status_badge_is_the_label_recipe():
    js = _js()
    seen = set()
    for match in re.finditer(r"chip\((`[^`]*`|\"[^\"]*\")\s*,\s*(`[^`]*`|\"[^\"]*\")", js):
        label, cls = match.group(1), match.group(2)
        for word in STATUS_WORDS:
            if word in label:
                seen.add(word)
                assert "item-label" in cls, match.group(0)
    # The fit words live in a table, not a chip() call.
    fit = js[js.index("const FIT_WORDS = {"):][:400]
    assert fit.count('tone: "item-label') == 3, fit
    assert {"Installed", "Not ready yet", "confirms first", "online", "in use"} <= seen


def test_status_badges_are_never_a_fill_again():
    """The fills the status words had (a green, a warn and an accent pill, and
    a grey one) and the per-surface colour rules that drew them are gone; a
    hand-built status badge cannot come back under those names."""
    css = "\n".join(p.read_text(encoding="utf-8") for p in sorted((JS_DIR.parent / "css").glob("*.css")))
    js = _js()
    assert "extras-installed" not in css and "extras-installed" not in js
    assert ".ocr-engine-chip.is-warn" not in css
    assert 'badge.className = `chip item-label${running ? " is-ok" : ""}`' in js
    index = (JS_DIR.parent / "index.html").read_text(encoding="utf-8")
    assert 'id="searxng-host-state" class="chip item-label"' in index
    # The recipe reaches every surface, not three.
    assert ":is(.entry-meta, .skill-card-header, .sampling-row, body) .chip.item-label {" in css
    assert ".chip.item-label.is-ok" in css and ".chip.item-label.is-warn" in css
    # A status word is never drawn with the filing chips' fills.
    for call in re.finditer(r"chip\(([^;\n]*?),\s*\"(confidence|review|tag)\"\)", js):
        assert not any(w in call.group(1) for w in STATUS_WORDS), call.group(0)


def test_a_model_cards_badges_are_a_row_of_their_own():
    """INBOX 468: in the foot beside the action they wrapped into a ragged
    stack. A row of their own, one line, above the actions."""
    models = (JS_DIR / "settings-models.js").read_text(encoding="utf-8")
    card = models[models.index("function buildModelCard("):models.index("function updateModelProgress(")]
    assert "if (badges.children.length) card.appendChild(badges);" in card
    assert "actions.appendChild(badgesNode)" not in card
    css = (JS_DIR.parent / "css" / "01-forms-settings.css").read_text(encoding="utf-8")
    rule = css[css.index(".model-card-badges {"):][:200]
    assert "flex-wrap: nowrap" in rule


def _css() -> str:
    return "\n".join(p.read_text(encoding="utf-8") for p in sorted((JS_DIR.parent / "css").glob("*.css")))


def test_a_chips_words_are_trimmed_to_their_x_height_band():
    """INBOX 503: a flex row centres boxes, and the words' line box is not
    where the eye reads them (the x-height band sits lower by the font's own
    amount), so a fixed drop on the icon was right for one chip and 1.5px off
    on the "Installed" pill. The recipe trims the words to the band and lets
    the row centre it; `scratchpad/ui-sweeps/badgealign.js` measures it."""
    css = _css()
    assert re.search(r"@supports \(text-box: trim-both ex alphabetic\)\s*\{\s*(?:/\*.*?\*/\s*)?\.chip \.ph-text\s*\{\s*text-box: trim-both ex alphabetic;", css, re.S)
    assert re.search(r"\.chip \.ph-lead\s*\{\s*translate: 0 calc\(0\.05em - var\(--ph-ink-dy\)\);", css)
    # The floor that keeps a chip's height now its words' box is trimmed:
    # zero specificity, so every family's own floor wins.
    assert re.search(r":where\(\.chip\)\s*\{\s*min-height: 1\.125rem;", css)


def test_a_chips_icon_gap_is_a_token():
    css = _css()
    assert re.search(r"\n\.chip\s*\{\s*gap: var\(--space-1\);\s*\}", css)


def test_every_chip_builder_puts_its_words_in_a_span():
    """`chip()` wraps bare words in `.ph-text`: text in the chip itself cannot
    be trimmed, and one untrimmed chip in a row sits a pixel below its
    neighbours."""
    js = (JS_DIR / "app.js").read_text(encoding="utf-8")
    body = js[js.index("function chip(text"):]
    body = body[: body.index("\n}\n")]
    assert 'className: "ph-text"' in body



def test_the_timeline_marks_are_even_pixels():
    """INBOX 503: the rail's glyphs sat 0.5 to 1px off their circles because a
    18.4px circle and a 12.88px glyph box leave a fractional gap that the two
    round differently. An even circle and glyph box leave whole pixels."""
    css = (JS_DIR.parent / "css" / "06-timeline-dialogs.css").read_text(encoding="utf-8")
    assert "--timeline-mark: round(1.15rem, 2px);" in css
    assert ".timeline-row-mark > .ph" in css and "round(calc(var(--text-xs) * 1.15), 2px)" in css
