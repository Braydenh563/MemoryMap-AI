"""Every feature a person can use has help that says so, findable by the words
they would search (INBOX 448 (1)).

The owner, 2026-10-03: "the help settings as well as the help info available
to the agents needs more expansion for all the new features both large and
small so people can easily find out about all the features". `HELP_TOPICS`
is what Chat, the popup agent and Atlas read about the app, and what Settings,
Help lists, so a feature missing from it is one nobody can ask about.

`FEATURES` is the inventory (scratchpad/help-inventory.md has the long form),
drawn from CHANGELOG's Unreleased and 0.3.x sections: per feature, the words
an entry that explains it must contain, and a question somebody would type.
Two checks per row: some entry's body holds every word, and the question
reaches such an entry within the Guide's top three. Measured before the
entries were written: 8 of 52 rows covered by the words (3 of those by
accident, a chord in another entry), 4 of 52 reachable by the question.
"""

from __future__ import annotations

import pytest

from memorymap.ai import help_chat
from memorymap.ai.help_topics_more import HELP_GROUPS, TOPIC_META

#: (feature, words every one of which some entry's body must contain, a
#: question in the words a person would use).
FEATURES: list[tuple[str, tuple[str, ...], str]] = [
    # Writing notes
    ("quick-note", ("Alt+N", "Quick note"), "keyboard shortcut for quick note"),
    ("offline-outbox", ("kept on this device", "Try now"), "what happens if I save a note while the server is down"),
    ("paste-drop", ("paste", "drop"), "how do I paste a picture into a note"),
    ("inline-tags", ("#word",), "how do I tag a note with a hashtag"),
    ("web-clip", ("bare link", "web clipper"), "save a web page as a note"),
    ("ctrl-enter", ("Ctrl+Enter",), "how do I save a note from the keyboard"),
    ("unsaved-guard", ("two windows", "keep your version"), "I edited a note in two windows"),
    ("note-history", ("You and Atlas",), "who changed my note"),
    ("draft-template", ("Draft with Atlas", "template"), "make a template with ai"),
    ("note-sorts", ("Recently edited", "Copy [[link]]"), "sort notes by recently edited"),
    ("connections-column", ("Connections column",), "see a note's links beside the list"),
    # Filing, tags and categories
    ("suggested-tags", ("+ tag",), "what are the plus tags on my note"),
    ("filing-confidence", ("83%",), "what does the percentage mean on a note"),
    ("filing-no-ai", ("notebook's words",), "how are notes filed without ai"),
    ("filing-stop", ("File it myself", "File by meaning"), "a note is stuck on filing"),
    ("tag-manager", ("Manage tags", "merge"), "how do I rename a tag everywhere"),
    ("tag-chip-menu", ("Rename in all notes", "Show notes"), "right click a tag"),
    ("manage-categories", ("Manage categories", "split"), "how do I merge two categories"),
    ("category-colour", ("Colour", "twelve"), "change a category colour"),
    ("category-chip", ("Show notes in the category",), "view all notes in a category"),
    ("bulk-tags", ("selection bar", "Tags"), "add a tag to several notes at once"),
    ("notes-filter", ("title:", "before:", "is:draft"), "filter notes by date"),
    # Library
    ("bookmarks", ("Unread", "Pinned", "By site"), "where are my bookmarks"),
    ("bookmark-link", ("Bookmark link",), "insert a bookmark into a note"),
    ("contents-tree", ("Contents", "headings", "Expand all"), "an outline of my whole notebook"),
    ("ai-skills-library", ("Yours", "Built-in", "Duplicate"), "copy a built-in skill"),
    ("attachment-cards", ("Describe with AI", "Annotate a copy"), "rename an attached file"),
    # Boards and maps
    ("mindmap-reorder", ("Ctrl+Shift", "Shift+Enter"), "mind map shortcut to add a topic before"),
    ("mindmap-duplicate", ("Ctrl+D",), "duplicate a topic on a mind map"),
    ("undo-depth", ("100 steps",), "how many undo steps on a mind map"),
    ("board-tab-walk", ("Tab walks",), "use the whiteboard with the keyboard only"),
    # Reading files
    ("ocr-language", ("language", "Tesseract", "Install"), "change the ocr language"),
    # Asking
    ("time-words", ("this Friday",), "does it understand dates in my notes"),
    ("recency", ("saved recently",), "what did I save recently"),
    ("citation-preview", ("numbered", "Open note"), "what are the numbers in an answer"),
    ("stop-answer", ("Escape",), "how do I stop an answer"),
    # System and settings
    ("job-last-run", ("Last run", "Background jobs"), "when did the backup last run"),
    ("lock-dialogs", ("put away",), "what happens to open windows when it locks"),
    ("model-downloads", ("Suggested downloads", "Hugging Face"), "how do I download a model"),
    ("model-fit", ("too big",), "which model fits my computer"),
    ("settings-search", ("search box",), "find a setting"),
    ("view-address", ("#/notes",), "does each view have its own address"),
    ("delete-space", ("move everything to another space",), "delete a space"),
    ("reminders-ics", ("Add to calendar",), "add reminders to my calendar"),
    ("dashboard-menu", ("Continue", "Tools & features"), "what is in the dashboard menu"),
    # Accessibility
    ("toasts", ("toast", "focused"), "a message is covering the button"),
    ("zoom", ("400%",), "zoom the app"),
    ("single-keys", ("Single-key shortcuts",), "turn off single key shortcuts"),
    ("screen-reader", ("screen reader",), "does it work with a screen reader"),
    ("density-auto", ("Auto", "Compact"), "change the density"),
    ("companion-toggle", ("Ctrl+Shift+Y",), "hide the companion"),
    ("privacy-receipt", ("Privacy", "Nothing left this computer"), "prove nothing left my computer"),
]


def _covering(words: tuple[str, ...]) -> list[str]:
    lowered = [w.lower() for w in words]
    return [t["id"] for t in help_chat.HELP_TOPICS if all(w in t["body"].lower() for w in lowered)]


@pytest.mark.parametrize("feature,words,question", FEATURES, ids=[f[0] for f in FEATURES])
def test_every_feature_has_an_entry(feature, words, question):
    assert _covering(words), f"{feature}: no help entry says {words}"


@pytest.mark.parametrize("feature,words,question", FEATURES, ids=[f[0] for f in FEATURES])
def test_the_question_finds_the_entry(feature, words, question):
    covering = set(_covering(words))
    found = [t["id"] for t in help_chat.topics_for(question)][: help_chat.MAX_TOPICS]
    assert covering & set(found), f"{feature}: {question!r} reached {found}, the entry is {sorted(covering)}"


def test_the_inventory_is_not_trivially_small():
    assert len(FEATURES) >= 50


def test_every_entry_is_in_exactly_one_help_group():
    """Settings, Help lists the entries under these groups; an entry in none
    is one the page never shows."""
    ids = [t["id"] for t in help_chat.HELP_TOPICS]
    grouped = [tid for _, members in HELP_GROUPS for tid in members]
    assert sorted(grouped) == sorted(ids), (set(ids) ^ set(grouped), len(grouped) - len(set(grouped)))


def test_every_entry_has_a_title():
    """The Help list's rows are the entries' titles."""
    assert not [t["id"] for t in help_chat.HELP_TOPICS if not TOPIC_META.get(t["id"], {}).get("title")]


def test_the_topics_route_lists_every_entry_in_its_group(client):
    body = client.get("/help/topics").json()
    listed = [topic["id"] for group in body["groups"] for topic in group["topics"]]
    assert sorted(listed) == sorted(t["id"] for t in help_chat.HELP_TOPICS)
    first = body["groups"][0]["topics"][0]
    assert {"id", "title", "body", "find", "link"} <= set(first)
