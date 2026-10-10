"""The act registry's table (CHAT_PLAN "The deterministic foundation",
decision 53), a leaf with no imports of its own: the acts, the intents that
wait for Confirm, and the text generated from them (the capability line, the
palette rows, the Guide topic, Ask's line). `ai/acts.py` runs the acts over
`ai/commands.py`; `commands.py` and `help_topics_more.py` read this table, so
neither has to import the runner (an import cycle the lints refused).
"""

from __future__ import annotations

from dataclasses import dataclass

#: The write intents that wait for Confirm before anything changes.
CONFIRM_INTENTS = frozenset({"delete", "rename", "move", "tag", "untag", "link", "unlink", "append"})


@dataclass(frozen=True)
class Act:
    """One act: the intent `commands.read` gives, the verb it is said with,
    the slots it needs, what Undo runs, and how Help says it."""

    intent: str
    verb: str
    label: str
    help: str
    example: str
    slots: tuple[str, ...]
    #: The tool Undo runs, or "" for an act that changes nothing.
    inverse: str = ""
    writes: bool = True

    @property
    def confirm(self) -> bool:
        return self.intent in CONFIRM_INTENTS


#: In the order the capability line says them.
_ACTS = (
    Act("reminder", "remind", "set a reminder", "Say what and when; it is set at once with Undo.",
        "remind me to call mum on Friday at 9", ("text", "due_at"), "bin_reminder"),
    Act("tag", "tag", "tag notes", "Name the notes and the tags; the change waits for Confirm.",
        "tag the knife note with kitchen", ("tags",), "edit_note"),
    Act("untag", "untag", "take a tag off", "Name the tag and the notes; waits for Confirm.",
        "remove the tag urgent from the boiler note", ("tags",), "edit_note"),
    Act("move", "file", "move notes to a category", "Name the notes and the category; waits for Confirm.",
        "move the sourdough note to Cooking", ("category",), "edit_note"),
    Act("new_note", "create", "make a new note", "Start with \"note:\" and the words; saved at once with Undo.",
        "note: buy milk and eggs", ("content",), "delete_note"),
    Act("meeting", "create", "start a meeting", "Starts a meeting note now; Undo bins it.",
        "start a meeting", (), "delete_note"),
    Act("pin", "pin", "pin a note", "Pins one note to the top of the list; Undo unpins it.",
        "pin the dentist note", (), "pin_note"),
    Act("unpin", "unpin", "unpin a note", "Takes one note's pin off; Undo pins it again.",
        "unpin the dentist note", (), "pin_note"),
    Act("link", "link", "link two notes", "Names both notes; waits for Confirm, Undo unlinks them.",
        "link the gym note to the running note", (), "unlink_notes"),
    Act("unlink", "unlink", "unlink two notes", "Names both notes; waits for Confirm, Undo links them again.",
        "unlink the gym note from the running note", (), "link_notes"),
    Act("rename", "rename", "rename a note", "Names the note and its new heading; waits for Confirm.",
        "rename the gym note to Strength plan", ("title",), "edit_note"),
    Act("append", "add", "add a line to a note", "Names the words and the note; waits for Confirm.",
        "add buy chalk to the gym note", ("content",), "edit_note"),
    Act("delete", "delete", "delete a note", "Always waits for Confirm; the note goes to the bin and Undo restores it.",
        "delete the boiler note", (), "restore_note"),
    Act("find", "find", "find a note", "Lists the notes that match.", "find my note about the passport", (), writes=False),
    Act("open", "open", "open a note", "Opens the one note named.", "open the note about the boiler", (), writes=False),
    Act("navigate", "open", "open a part of the app", "Goes to Settings, the graph, the timeline and the rest.",
        "open settings", ("surface",), writes=False),
    Act("summarise", "summarise", "summarise notes", "Says what a set of notes holds, from the notes.",
        "summarise my gym notes", (), writes=False),
)
ACTS: dict[str, Act] = {a.intent: a for a in _ACTS}


# --- what the surfaces say, generated -------------------------------------------------------


def capability_line() -> str:
    """Agent mode with no model, for a sentence that is not an act: every
    write act the registry has, in order, and one example."""
    said = [a.label for a in _ACTS if a.writes and a.intent not in ("untag", "unpin", "unlink", "append", "rename", "delete", "link", "pin")]
    single = "pin, link, rename or delete a note (delete always after you confirm)"
    reads = "find or open a note"
    return (
        "With no model running I can do these myself: "
        + ", ".join([*said[:4], reads, *said[4:]])
        + f", {single}. For example: {ACTS['reminder'].example}."
    )


def ask_line(parsed: dict | None) -> str:
    """What Ask says to a sentence that is an act: where it is done."""
    act = ACTS.get((parsed or {}).get("intent", ""))
    named = f" ({act.label})" if act else ""
    return f"That is something to do{named} rather than to look up: say it in Chat and it is done there, with Undo."


def palette_rows() -> list[dict]:
    """One palette row per act: its label, an example to type, its help."""
    return [{"intent": a.intent, "label": a.label[:1].upper() + a.label[1:], "example": a.example, "help": a.help} for a in _ACTS]


def guide_topic() -> dict:
    """The Guide's topic on acts, generated from the registry."""
    lines = [f"{a.label[:1].upper() + a.label[1:]}: \"{a.example}\"." for a in _ACTS]
    waits = ", ".join(a.label for a in _ACTS if a.confirm)
    return {
        "id": "chat-acts",
        "title": "Things Chat does for you",
        "keywords": ("what can chat do", "chat commands", "commands in chat", "do it for me", "acts", "an act",
                     "with no model running", "undo an act", "things chat does"),
        "badge": {"label": "Chat", "tab": "chat"},
        "body": "Chat does these from one sentence, with no model. " + " ".join(lines)
        + f" These wait for Confirm: {waits}. The rest run at once. Undo on the card, or Ctrl+Z, takes any of them back.",
    }
