"""INBOX 803: the owner's buttons, OCR, constellation and capture findings.

The suite cannot see layout, so each test pins the rule that the measured fix
rests on (the numbers are in docs/roadmap/archive/agent-remaining/ownerfix-1011.md).
"""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CSS = ROOT / "frontend" / "css"


def _css(name: str) -> str:
    return (CSS / name).read_text(encoding="utf-8")


def test_notes_select_is_square_when_its_word_is_hidden():
    css = _css("08-consistency.css")
    rule = '[data-dock-name="notes"] .dock-actions > button:has(> .ph-lead + .dock-word)'
    assert rule in css
    block = css[css.index(rule):].split("}", 1)[0]
    assert "width: var(--control-h)" in block and "padding-inline: 0" in block


def test_a_link_row_underlines_its_words_not_its_icon():
    # A button is inline-flex and a decoration on a flex container reaches the
    # icon, so the hover underline lives on the words' own span.
    questions = _css("questions-lazy.css")
    assert ".question-group-link:hover .ph-text" in questions
    hover = questions[questions.index(".question-group-link:hover,"):].split("}", 1)[0]
    assert "text-decoration" not in hover
    consistency = _css("08-consistency.css")
    assert ".library-read-open:hover .ph-text" in consistency
    #: The hover rule shares its block with the focus twin (the uisweep pass), so it ends in a comma.
    plain = consistency[consistency.index(".library-read-open:hover,"):].split("}", 1)[0]
    assert "text-decoration" not in plain
    # An always-underlined link that holds an icon is not a flex row.
    chat = _css("04-chat-dock-appearance.css")
    assert ":is(.linklike, .link-button):has(> .ph) {\n  display: inline-block;" in chat


def test_a_badge_with_no_text_is_hidden():
    css = _css("01-forms-settings.css")
    block = css[css.index(".chip:empty {"):].split("}", 1)[0]
    assert "display: none" in block
    # The two Ask badges are empty in the markup and filled by renderChatMeta,
    # so they are what the rule is for; a space inside would defeat :empty.
    html = (ROOT / "frontend" / "index.html").read_text(encoding="utf-8")
    assert '<span id="answered-by" class="chip answer-model"></span>' in html
    assert '<span id="search-mode" class="chip"></span>' in html


def test_the_companions_words_check_counts_only_drawn_text():
    # INBOX 812: the walk's 400-node cap was spent on text nobody can see (the
    # Ask card's closed history list sits ahead of the answer), so the words
    # under Atlas read as 0 over the "You asked:" line.
    js = (ROOT / "frontend" / "js" / "avatars.js").read_text(encoding="utf-8")
    body = js[js.index("function nameMarkBuddyWordsUnder("):].split("\nconst NMB_WORDS_PX", 1)[0]
    assert "checkVisibility()" in body and "FILTER_REJECT" in body
    assert body.index("n.textContent.trim()") < body.index("seen += 1")


def test_the_ocr_workspace_paints_the_caption_before_the_read_is_awaited():
    # INBOX 803: the saved description showed only after the reader finished.
    js = (ROOT / "frontend" / "js" / "library.js").read_text(encoding="utf-8")
    body = js[js.index("async function ocrLoadPage("):]
    assert body.index("ocrPaintCaption(image);") < body.index("await apiJson(ocrRegionsUrl(")
    # A document's descriptions are asked for beside the read, not behind it.
    assert body.index("const storedAsked") < body.index("await apiJson(ocrRegionsUrl(")


def test_the_constellation_has_a_light_well_and_fades_between_themes():
    js = (ROOT / "frontend" / "js" / "dashboard.js").read_text(encoding="utf-8")
    # HSL lightness 250 clamps to white, the card's own colour: no well.
    assert "250 - (y / height) * 10" not in js
    assert "95 - (y / height) * 4" in js
    body = js[js.index("function refreshArtForTheme("):].split("\nfunction buildArtParticles", 1)[0]
    assert 'className = "art-veil"' in body
    # No veil, so an instant change, with reduced motion or animations off.
    assert "reducedMotionWanted()" in body and 'uiMotion === "off"' in body
    css = _css("02-chat-graph.css")
    veil = css[css.index(".art-holder > .art-veil {"):].split("}", 1)[0]
    assert "transition: opacity calc(var(--ui-slow)" in veil


def test_the_capture_box_holds_its_line_number_column_from_first_paint():
    # INBOX 803: the gutter mounts with documents.js on the box's first focus,
    # and the text jumped 38.8px right when it did.
    css = _css("07-whiteboard-misc.css")
    rule = ':root[data-note-gutter="on"] .note-composer > textarea#entry-content {'
    block = css[css.index(rule):].split("}", 1)[0]
    assert "margin-inline-start: calc(2.1ch + var(--space-4) + var(--space-3))" in block
    assert "width: calc(100% - 2.1ch - var(--space-4) - var(--space-3))" in block
    settings = (ROOT / "frontend" / "js" / "settings.js").read_text(encoding="utf-8")
    assert 'root.dataset.noteGutter = prefs.get("doc-gutter", null) === "1"' in settings
    documents = (ROOT / "frontend" / "js" / "documents.js").read_text(encoding="utf-8")
    # Turning Line numbers on or off moves the reserve with it.
    assert 'document.documentElement.dataset.noteGutter = on ? "on" : "off";' in documents


def test_the_snippets_bar_is_one_height_and_its_label_one_line():
    # INBOX 803: field 32px, button 42.8px with "Save selection" on two lines.
    css = _css("library-lazy.css")
    block = css[css.index(".doc-code-side-bar > button {"):].split("}", 1)[0]
    assert "height: var(--control-h-lg)" in block and "white-space: nowrap" in block
    html = (ROOT / "frontend" / "index.html").read_text(encoding="utf-8")
    # A short label, with the full action in the tooltip and the accessible name.
    start = html.index('<button id="doc-snippet-save"')
    button = html[start:html.index("</button>", start)]
    assert button.endswith("</i>Save")
    assert 'title="Save the selected code as a snippet"' in button
    assert 'aria-label="Save the selected code as a snippet"' in button
    # Every help surface that named the old label now names the button.
    assert "press Save to keep it" in html
    assert "press Save selection" not in (ROOT / "frontend" / "js" / "documents-codekit.js").read_text(encoding="utf-8")
