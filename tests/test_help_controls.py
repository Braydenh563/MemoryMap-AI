"""The Guide can answer "what are all the keys and hidden features of X".

INBOX 410, the owner: "what if the user asks the guide for all the hidden
features, keybinds, controls, utility and more for features like the
whiteboard, mindmap and documents editor etc. can it answer those??" Before
this it could not: the whiteboard entry was two sentences with no key in it,
the documents entry named three, and the shortcuts entry still taught the "g"
chord the app had replaced with "m". Each surface now has a controls entry
written from its own handlers and shortcut tables, and a question that asks
for keys, controls or hidden features about a named surface is routed to that
surface's controls entry rather than to its one-paragraph description.
"""

from __future__ import annotations

import re

import pytest

from memorymap.ai import help_chat


def _first(question: str) -> str | None:
    ranked = help_chat._matching_topics(question)
    return ranked[0]["id"] if ranked else None


CONTROLS = {
    "whiteboard-controls",
    "mind-map-controls",
    "documents-controls",
    "graph-controls",
    "chat-controls",
    "notes-controls",
    "library-controls",
    "timeline-controls",
    "reminders-controls",
    "dashboard-controls",
    "hidden-features",
}


def test_every_surface_has_a_controls_entry():
    ids = {topic["id"] for topic in help_chat.HELP_TOPICS}
    assert CONTROLS <= ids, sorted(CONTROLS - ids)


@pytest.mark.parametrize(
    ("question", "expected"),
    [
        ("what are all the whiteboard shortcuts", "whiteboard-controls"),
        ("keyboard shortcuts for the whiteboard", "whiteboard-controls"),
        ("mind map keybinds", "mind-map-controls"),
        ("what are the document editor shortcuts", "documents-controls"),
        ("graph controls", "graph-controls"),
        ("hidden features", "hidden-features"),
        ("does the doc editor have emmet", "code-files"),
    ],
)
def test_a_controls_question_reaches_the_surface_controls_entry(question, expected):
    assert _first(question) == expected, help_chat._matching_topics(question)


@pytest.mark.parametrize(
    ("question", "expected"),
    [
        ("what is the whiteboard", "whiteboard"),
        ("how do I make a mind map", "mind-maps"),
        ("what does the graph show", "graph"),
        ("how do i set a reminder", "reminders"),
    ],
)
def test_a_plain_question_still_gets_the_description(question, expected):
    """The controls entries are long on purpose; a question that asks what a
    thing is, with no word about keys or controls, is still answered by the
    one-paragraph entry."""
    assert _first(question) == expected, help_chat._matching_topics(question)


def test_a_question_naming_a_chord_finds_the_entry_that_documents_it():
    assert _first("what does F12 do") == "code-files"
    assert _first("what does ctrl shift f do in a document") in {"documents-controls", "code-files"}
    #: A chord an entry claims in its own keywords stays that entry's: Ctrl+P
    #: is Find anything's, however many controls entries mention it.
    assert _first("what does ctrl+p do") == "search"
    assert _first("what does cmd k do") == "command-palette"


def test_the_shortcuts_entry_teaches_the_m_chord_not_the_old_g_one():
    """The chord is "m" then a letter (app.js, `TAB_JUMP_KEYS`); the entry
    said "g" for as long as the guide has existed."""
    body = next(t["body"] for t in help_chat.HELP_TOPICS if t["id"] == "shortcuts")
    assert "m then a letter" in body
    assert "g then a letter" not in body


def test_controls_entries_follow_the_copy_rules():
    for topic in help_chat.HELP_TOPICS:
        if topic["id"] not in CONTROLS | {"shortcuts", "code-files"}:
            continue
        body = topic["body"]
        assert chr(0x2014) not in body, topic["id"]
        #: A "!" only as a key to type (Emmet's own "!"), never ending a sentence.
        assert not re.search(r"\w!", body), topic["id"]
        assert body[0].isupper(), topic["id"]


# --- Freshness: the guide names every key the app's own tables bind ----------
#
# The entries above are prose, and prose about keys goes stale the day a key
# moves: the shortcuts entry taught "g then a letter" for months after the
# chord became "m". These read the tables the app binds from, the same way
# `test_frontend_shortcuts.py` reads `DEFAULT_SHORTCUTS`, and fail when the
# guide does not name a key. The fix for a failure is a sentence in the entry,
# never a looser match here.

from pathlib import Path  # noqa: E402

FRONTEND = Path(__file__).resolve().parents[1] / "frontend"
_ENTRY = re.compile(r'^\s*(\w+):\s*\{\s*keys:\s*"([^"]+)"', re.MULTILINE)


def _body(topic_id: str) -> str:
    return next(t["body"] for t in help_chat.HELP_TOPICS if t["id"] == topic_id)


def _table(source: str, start: str, end: str = "\n};") -> str:
    at = source.index(start)
    return source[at : source.index(end, at)]


def _named(key: str, body: str) -> bool:
    """A chord is named when it appears as written, or as the entries spell
    two of its keys for a reader ("Alt+Left", "Alt+Up"). A bare key ("/",
    "?") must stand on its own, and a chord must not be the head or tail of a
    longer one ("Ctrl+Z" inside "Ctrl+Shift+Z" is not Ctrl+Z)."""
    shown = key.replace("ArrowLeft", "Left").replace("ArrowRight", "Right")
    shown = shown.replace("↑", "Up").replace("↓", "Down")
    if len(shown) == 1:
        return bool(re.search(rf"(?:^|[\s(]){re.escape(shown)}(?=[\s),.;:])", body))
    return bool(re.search(rf"(?<![\w+]){re.escape(shown)}(?![\w+])", body))


def test_every_global_shortcut_is_in_the_shortcuts_entry():
    app = (FRONTEND / "app.js").read_text(encoding="utf-8")
    table = dict(_ENTRY.findall(_table(app, "const DEFAULT_SHORTCUTS")))
    assert len(table) > 15, "DEFAULT_SHORTCUTS has moved; this test cannot read it"
    body = _body("shortcuts")
    missing = sorted(f"{name} ({keys})" for name, keys in table.items() if not _named(keys, body))
    assert not missing, f"the shortcuts entry does not name: {missing}"


def test_every_m_chord_letter_is_in_the_hidden_features_entry():
    app = (FRONTEND / "app.js").read_text(encoding="utf-8")
    tabs = dict(re.findall(r'^\s*(\w): "(\w+)"', _table(app, "const TAB_JUMP_KEYS"), re.MULTILINE))
    actions = dict(
        re.findall(r'^\s*(\w): \{ label: "([^"]+)"', _table(app, "const CHORD_ACTIONS"), re.MULTILINE)
    )
    assert len(tabs) >= 7 and len(actions) >= 5, (tabs, actions)
    body = _body("hidden-features")
    wanted = {f"{k} ({v.capitalize()})" for k, v in tabs.items()} | {f"{k} ({v})" for k, v in actions.items()}
    missing = sorted(w for w in wanted if w not in body)
    assert not missing, f"the hidden features entry does not name: {missing}"


def test_every_document_command_key_is_in_the_editor_entries():
    docs = (FRONTEND / "documents.js").read_text(encoding="utf-8")
    table = _table(docs, "const DOC_COMMANDS = [", "\n];")
    keys = {k for k in re.findall(r'keys: "([^"]*)"', table) if k}
    assert len(keys) > 15, "DOC_COMMANDS has moved; this test cannot read it"
    body = _body("documents-controls") + " " + _body("code-files")
    missing = sorted(k for k in keys if not all(_named(part.strip(), body) for part in k.split(" / ")))
    assert not missing, f"the documents and code entries do not name: {missing}"


def test_every_whiteboard_tool_key_is_in_the_whiteboard_entry():
    board = (FRONTEND / "whiteboard.js").read_text(encoding="utf-8")
    tools = re.findall(r'^\s*(\w): "[\w-]+",', _table(board, "const WB_TOOL_KEYS", "\n  };"), re.MULTILINE)
    shifted = re.findall(r'^\s*(\w): "[\w-]+",', _table(board, "const WB_TOOL_SHIFT_KEYS", "\n  };"), re.MULTILINE)
    actions = re.findall(r'^\s*(\w): "[\w-]+",', _table(board, "const WB_ACTION_KEYS", "\n  };"), re.MULTILINE)
    assert len(tools) > 15, "WB_TOOL_KEYS has moved; this test cannot read it"
    body = _body("whiteboard-controls")
    listed = body[body.index("Tools:") : body.index("Moving around")]
    missing = [k.upper() for k in tools + actions if not re.search(rf"\b{k.upper()}\b", listed)]
    missing += [f"Shift+{k.upper()}" for k in shifted if f"Shift+{k.upper()}" not in listed]
    assert not missing, f"the whiteboard entry's tool list does not name: {missing}"
