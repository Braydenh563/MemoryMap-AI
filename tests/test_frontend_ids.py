"""No two elements in index.html may share an id.

`document.getElementById` returns the *first* match and reports no error, so
a duplicate id silently binds half the code to the wrong element. That is
exactly how "Add persona" came to do nothing: a <div> in the Chat tab and the
Settings <textarea> both used `persona-prompt`, so `.value.trim()` ran against
the div, threw, and killed the click handler.

Browsers do not warn, linters do not run on this file, and the Python suite
cannot see the DOM, so this cheap parse is the only thing that would catch
the next one.
"""

from __future__ import annotations

import re
from collections import Counter
from pathlib import Path

from tests._css_paths import css_text

INDEX = Path(__file__).resolve().parents[1] / "frontend" / "index.html"

# Ids that app.js creates at runtime rather than finding in the markup.
# `copy-fallback` is the last-resort copy dialog: it only exists while a
# browser has refused both clipboard mechanisms, so there is nothing to
# declare in index.html.
RUNTIME_IDS = {
    "user-css",
    "focus-timer-display",
    "focus-timer-toggle",
    "copy-fallback",
}


def _markup() -> str:
    """index.html with comments stripped.

    Comments here explain markup, so they quote tags, including ids, and a
    naive scan reads those as real elements.
    """
    return re.sub(r"<!--.*?-->", "", INDEX.read_text(encoding="utf-8"), flags=re.S)


def _frontend_js() -> str:
    """app.js, whiteboard.js, graph.js, documents.js, library.js,
    dashboard.js, settings.js, timeline.js, documents-code.js,
    documents-prose.js and whiteboard-map.js concatenated.

    The whiteboard subsystem (board/card CRUD, sketch drawing, export,
    move/resize) moved out of app.js into its own file, loaded by a second
    <script> tag, the graph view (force-directed map, layouts, tracing,
    the node popup) moved out into a third, the document editor moved out
    into a fourth (§10 of the app.js-split plan), the Library tab moved
    out into a fifth, out of *both* app.js and whiteboard.js, as §88.3's
    second file, the dashboard (widgets, masonry, the generative art) moved
    out into a sixth as §88.3's third file, and the settings modal, logs
    console and appearance system moved out into a seventh, settings.js , 
    as §88.3's fourth and last file, and the Timeline tab moved out into an
    eighth, timeline.js, when the gzipped app.js crossed its size bound
    (2026-09-23), and the document editor's code side and prose tools moved
    out of documents.js into documents-code.js and documents-prose.js
    (2026-09-24), as did whiteboard.js's mind map layer, into
    whiteboard-map.js. See index.html and app.js's LAZY_MODULES. A check that only read
    app.js would go on passing while silently covering none of the moved
    files' own $("...") lookups.
    """
    app = (INDEX.parent / "app.js").read_text(encoding="utf-8")
    whiteboard = (INDEX.parent / "whiteboard.js").read_text(encoding="utf-8")
    graph = (INDEX.parent / "graph.js").read_text(encoding="utf-8")
    documents = (INDEX.parent / "documents.js").read_text(encoding="utf-8")
    library = (INDEX.parent / "library.js").read_text(encoding="utf-8")
    dashboard = (INDEX.parent / "dashboard.js").read_text(encoding="utf-8")
    settings = (INDEX.parent / "settings.js").read_text(encoding="utf-8")
    timeline = (INDEX.parent / "timeline.js").read_text(encoding="utf-8")
    palette = (INDEX.parent / "palette.js").read_text(encoding="utf-8")
    documents_code = (INDEX.parent / "documents-code.js").read_text(encoding="utf-8")
    documents_prose = (INDEX.parent / "documents-prose.js").read_text(encoding="utf-8")
    whiteboard_map = (INDEX.parent / "whiteboard-map.js").read_text(encoding="utf-8")
    return (
        app + "\n" + whiteboard + "\n" + graph + "\n" + documents + "\n" + library
        + "\n" + dashboard + "\n" + settings + "\n" + timeline + "\n" + palette
        + "\n" + documents_code + "\n" + documents_prose + "\n" + whiteboard_map
    )


def test_no_duplicate_element_ids():
    ids = re.findall(r'\sid="([^"]+)"', _markup())
    duplicates = {name: n for name, n in Counter(ids).items() if n > 1}
    assert not duplicates, f"duplicate id(s) in index.html: {duplicates}"


def test_every_id_the_app_looks_up_actually_exists():
    """A typo'd id is `null`, and the failure lands wherever it is next used."""
    app = _frontend_js()
    declared = set(re.findall(r'\sid="([^"]+)"', _markup()))
    # Only the literal $("…") lookups; anything built from a variable can't be
    # checked statically and is skipped rather than guessed at.
    looked_up = set(re.findall(r'\$\("([a-z0-9-]+)"\)', app))
    missing = sorted(looked_up - declared - RUNTIME_IDS)
    assert not missing, (
        f"app.js/whiteboard.js/graph.js/documents.js/library.js/dashboard.js/settings.js/timeline.js look up ids that aren't "
        f"in index.html: {missing}"
    )


def test_the_prepaint_theme_table_matches_app_js():
    """index.html carries its own copy of THEME_PRESETS. Keep them equal.

    The inline script runs before app.js (and long before settings.js, which
    now owns THEME_PRESETS: §88.3 item 4) so the first paint already wears
    the right theme: without it every reload flashes the default. The cost
    is two copies of the same table, and a theme added to one and not the
    other looks fine until you reload, when the app flashes the wrong
    colours or falls back to the default entirely. Nothing else would
    notice.

    The pattern matches on the entry's *shape*, not on its first key. It used
    to require `theme:` there, which quietly stopped matching anything the day
    the presets became palette-only, they now compose with the separate
    light/dark choice instead of overriding it, so `midnight`/`daylight` became
    one `default` and no preset names a mode. A zero-match regex made this
    assert "the table has moved" while the table was sitting right there and
    the two copies agreed perfectly.
    """
    # **`theme-boot.js`, not index.html.** The block moved out of the page
    # when the last inline script was removed (the CSP kept refusing it, see
    # `test_static_freshness.py::test_the_page_has_no_inline_script_left`).
    # It is still the pre-paint copy and still has to match; only its file
    # changed. This test read index.html and, once the block left, reported
    # "the table has moved", which was true, and is exactly what it is for.
    boot = (INDEX.parent / "theme-boot.js").read_text(encoding="utf-8")
    settings = (INDEX.parent / "settings.js").read_text(encoding="utf-8")

    inline = set(re.findall(r"^\s{4}(\w+): \{ ", boot, re.M))
    declared = set(re.findall(r"^  (\w+): \{\n\s+label:", settings, re.M))

    assert inline, "the pre-paint theme table wasn't found: has it moved?"
    assert declared, "THEME_PRESETS wasn't found in settings.js, has it moved?"
    assert inline == declared, (
        "pre-paint themes and THEME_PRESETS disagree: "
        f"only in index.html={sorted(inline - declared)}, "
        f"only in settings.js={sorted(declared - inline)}"
    )


def test_every_theme_names_a_palette_that_exists():
    """A theme selecting a palette with no CSS silently renders as default."""
    # THEME_PRESETS moved to settings.js with the rest of appearance (§88.3
    # item 4): read from there now.
    app = (INDEX.parent / "settings.js").read_text(encoding="utf-8")
    css = css_text()

    used = set(re.findall(r'palette: "(\w+)"', app))
    defined = set(re.findall(r':root\[data-palette="(\w+)"\]', css))
    # "default" is the base :root, deliberately without a [data-palette] block.
    missing = sorted(used - defined - {"default"})
    assert not missing, f"themes select palettes with no CSS: {missing}"


def test_rediscover_never_offers_the_note_it_is_already_showing():
    """Reported as "the Another button is broken", and it was.

    The pick was uniform over every note WITH REPLACEMENT, so it could hand
    back the note already on screen and the click did nothing visible. Not
    rare: 1 in N, so a tenth of clicks on a ten-note notebook, half of them on
    two notes, and every single one when there is only one note to show.
    """
    # renderRandomNoteWidget moved to dashboard.js with the rest of the
    # dashboard widgets (§88.3's app.js split), and the shuffle it used to be
    # is now `renderRandomShuffle`: the widget leads with the scored notes
    # (WORLD_CLASS_PLAN 15, I4) and falls back to the shuffle under ten notes,
    # which is where this guard still belongs. Pointed at the function that
    # holds the behaviour rather than relaxed: the "Another" button is exactly
    # as broken as it ever was if it can hand back the note on screen.
    app = (INDEX.parent / "dashboard.js").read_text(encoding="utf-8")
    start = app.index("async function renderRandomShuffle(")
    body = app[start : start + 2200]
    assert "entries.filter(" in body, "the current note is not excluded from the pool"
    assert "current" in body


def test_rediscover_disables_another_when_there_is_nothing_else_to_show():
    """A live-looking button that cannot do anything is the exact shape of
    "this control is broken", trap 12, arriving by a new route."""
    # renderRandomShuffle holds the shuffle now, see the note above.
    app = (INDEX.parent / "dashboard.js").read_text(encoding="utf-8")
    start = app.index("async function renderRandomShuffle(")
    # The end of the function, not a fixed character count. A 2600-char window
    # was doing this job and a comment added inside the function pushed the
    # line being asserted past it, a lint that fails on prose is a lint people
    # learn to weaken.
    body = app[start : app.index("\n}\n", start)]
    assert "entries.length < 2" in body
    assert "disabled = true" in body


def test_a_widget_does_not_stack_class_names_on_every_render():
    """`className += " muted"` appends again each time the dashboard redraws."""
    app = (INDEX.parent / "app.js").read_text(encoding="utf-8")
    assert 'className += " muted"' not in app


APPEARANCE_KEY = re.compile(r'appearancePref\(\s*"([\w-]+)"')
DEFAULTS_BLOCK = re.compile(r"const APPEARANCE_DEFAULTS = \{(.*?)\n\};", re.S)
DEFAULT_KEY = re.compile(r'(?m)^\s*"?([\w-]+)"?\s*:')


def test_every_appearance_setting_has_a_default():
    """A missing default is not a missing default, it is the string
    "undefined" written into a CSS custom property.

    `applyAppearance` pipes these straight into `root.style.setProperty`, so a
    key absent from `APPEARANCE_DEFAULTS` reaches the stylesheet as literal
    `undefined` (or `NaN`, once it goes through `Number()`). That is invalid
    wherever it is *used*, not where it is set, so the damage lands far from
    the cause: `border-style` and `shadow-intensity` shipped without defaults,
    and between them took the border off every card, input, textarea, select
    and modal in the app, `border-style: var(--border-style) !important`
    matches all of those, and the shadow off every card, by poisoning the
    rgba() inside `--glass-shadow`. The app rendered flat and borderless on
    every fresh profile and nothing anywhere reported an error.
    """
    # APPEARANCE_DEFAULTS moved to settings.js with the rest of appearance
    # (§88.3 item 4): but appearancePref() itself is still called from a
    # handful of places in app.js too (renderEmblem's motion check, the
    # startup closure's theme/palette restore), so a key read only from
    # app.js has to be checked against the same table or this test would
    # miss exactly the class of bug it exists for.
    app = (INDEX.parent / "app.js").read_text(encoding="utf-8")
    settings = (INDEX.parent / "settings.js").read_text(encoding="utf-8")
    block = DEFAULTS_BLOCK.search(settings)
    assert block, "APPEARANCE_DEFAULTS wasn't found in settings.js, has it moved?"

    #: Settings whose "unset" state is meaningful, so a default would be wrong.
    #: `page-bg` unset means "let the palette supply the page", and
    #: `applyPageBackground` reads a falsy value as exactly that.
    OPTIONAL = {"page-bg"}

    declared = set(DEFAULT_KEY.findall(block.group(1)))
    used = set(APPEARANCE_KEY.findall(app)) | set(APPEARANCE_KEY.findall(settings))
    missing = sorted(used - declared - OPTIONAL)
    assert not missing, (
        "These appearance settings are read but have no entry in "
        f"APPEARANCE_DEFAULTS: {missing}. Each one resolves to undefined and is "
        "written into a CSS custom property as that word."
    )


#: Every control whose own handler reaches a route that cannot answer without a
#: model, with the route that makes it so (INBOX 203, the owner: "many ai
#: exclusive features are still enabled even when an ai isnt available or
#: running"). This is the inventory; `data-needs-model` on the element is the
#: implementation, and `syncModelGatedControls` (app.js) reads the attribute
#: rather than a list in the code, because the list in the code is what fell
#: behind: it carried seven of the fifteen there were then.
#:
#: Adding an AI control means adding it here and marking it in the markup. A
#: control that degrades without a model does NOT belong here: Ask falls back
#: to the search results beside it and says so, and the meeting note's Save
#: summarises when it can and files the note either way, so neither is gated.
MODEL_GATED_CONTROLS = {
    "improve-btn": "/entries/improve",
    "improve-retry": "/entries/improve",
    # The desk streams its draft, so the gate is the streaming route.
    "draft-compose": "/drafts/compose/stream",
    "draft-title": "/drafts/title",
    # The same pass with an instruction in hand, and the same route, so it is
    # gated by the same rule: a Refine that looks available with no model
    # would fail only once it had been pressed.
    "draft-refine": "/drafts/compose/stream",
    "draft-extract": "/entries/extract/preview",
    "extract-commit": "/entries/extract/commit",
    "doc-ai": "/documents/<id>/ai-edit",
    "doc-ai-run": "/documents/<id>/ai-edit",
    "doc-extract": "/entries/extract/preview",
    "wb-extract-notes": "/entries/extract/preview",
    "wb-boards-generate": "/whiteboard/boards/propose",
    "reminder-magic-add": "/reminders/parse",
    "chat-send": "/chat/stream",
    "chat-input": "/chat/stream",
    #: **Atlas is not here, and that is this rule's own rule** (INBOX 304).
    #: The guide's field and Send were gated with the rest of INBOX 203's
    #: fifteen, and then `help_chat.offline_answer` was built precisely so the
    #: guide does not need a model: with none running, `/help/ask` answers with
    #: the app's own help text for what was asked, and says in its first line
    #: that it is doing so. That is the paragraph two lines up, word for word,
    #: so the two entries were removed rather than the paragraph amended.
    #: Measured in a browser with no model: the composer was disabled, so the
    #: one AI feature written to work without a model could not be typed into.
}


def test_every_ai_only_control_says_it_needs_a_model():
    """A control that only fails once pressed is what makes an app feel broken.

    The failure this catches is silent in every other way: the control looks
    available, the click reaches a route, the route has no model, and the
    apology arrives after the person has committed to the action.
    """
    markup = _markup()
    missing = sorted(
        ident
        for ident in MODEL_GATED_CONTROLS
        if 'id="%s" data-needs-model="' % ident not in markup
    )
    assert not missing, (
        "These controls call an AI route but do not carry data-needs-model in "
        f"index.html, so nothing disables them when no model is running: {missing}"
    )


def test_every_model_gated_control_gives_a_reason_and_is_in_the_inventory():
    """The attribute's value is the sentence the disabled control shows."""
    markup = _markup()
    marked = dict(re.findall(r'\sid="([^"]+)" data-needs-model="([^"]*)"', markup))
    blank = sorted(ident for ident, why in marked.items() if not why.strip())
    assert not blank, f"data-needs-model with no reason to show: {blank}"
    # An element marked in the markup but absent from the inventory above is
    # the same drift in the other direction: the list stops describing the app.
    stray = sorted(set(marked) - set(MODEL_GATED_CONTROLS))
    assert not stray, (
        "These carry data-needs-model but are not in MODEL_GATED_CONTROLS, so "
        f"the inventory no longer says what is gated: {stray}"
    )
    # Every marked element must be one with a disabled state of its own, which
    # is what makes the attribute enough by itself: no wrappers.
    for ident in MODEL_GATED_CONTROLS:
        block = re.search(r'<(\w+)[^>]*\sid="%s" data-needs-model=' % ident, markup)
        assert block, f"{ident} is not marked on an element of its own"
        assert block.group(1) in {"button", "input", "textarea", "select"}, (
            f"{ident} is a <{block.group(1)}>, which has no disabled state to set"
        )
