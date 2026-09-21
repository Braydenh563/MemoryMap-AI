"""The tag suggester is shown the notebook's own tags, not just the note's.

Found by reading karakeep (ANALYSIS.md, the twenty-four repository read,
2026-09-21), whose tagging prompt passes the existing tags where this one did
not. The distinction is easy to miss and expensive: `existing` is the tags on
*this note*, and telling a model not to repeat those says nothing about what
the notebook already calls things. So a note about the same subject as fifty
others could be tagged "machine learning" where all fifty say "ml", and
nothing in the app would ever reconcile the two. Left alone, a notebook's
vocabulary spreads instead of converging, and the spread is invisible until
the tag list is long enough to be useless.
"""

from memorymap.ai import librarian


class _Recorder:
    """An Ollama stand-in that keeps the prompt it was handed."""

    def __init__(self, reply="alpha, beta"):
        self.reply = reply
        self.system = None

    def chat(self, _model, messages):
        self.system = next(m["content"] for m in messages if m["role"] == "system")
        return {"content": self.reply}


class _Models:
    def utility_model(self):
        return "test-model"


def _suggest(**kwargs):
    ollama = _Recorder(kwargs.pop("reply", "alpha, beta"))
    tags = librarian.suggest_tags(
        kwargs.pop("text", "a note about something"),
        kwargs.pop("existing", []),
        _Models(),
        ollama,
        **kwargs,
    )
    return tags, ollama.system


def test_the_notebook_s_tags_reach_the_prompt():
    _tags, system = _suggest(vocabulary=["ml", "research", "teaching"])
    for tag in ("ml", "research", "teaching"):
        assert tag in system, system


def test_reuse_is_instructed_rather_than_merely_offered():
    """A list with no rule attached reads to a small model as more context.
    The constraint is the entire point of passing the list."""
    _tags, system = _suggest(vocabulary=["ml"])
    assert "Prefer one of those" in system
    assert "rather than a new tag that means the same thing" in system


def test_the_note_s_own_tags_are_still_excluded():
    """The original contract: `existing` is what not to repeat, and it keeps
    meaning that now that a second list of tags is in the prompt."""
    tags, system = _suggest(existing=["alpha"], reply="alpha, gamma")
    assert "alpha" not in tags
    assert "gamma" in tags
    assert "don't repeat" in system


def test_without_a_vocabulary_nothing_changes():
    """One caller cannot always reach a session, so the parameter is optional
    and its absence must leave the old prompt exactly as it was."""
    _tags, system = _suggest()
    assert "The notebook already uses these tags" not in system


def test_the_vocabulary_is_capped_so_the_prompt_stays_budgeted():
    """Prompt text is budgeted in this app (agent.PROSE_BUDGET_CHARS). The
    cut falls on the rarest tags because the caller orders by use."""
    many = [f"tag{n}" for n in range(200)]
    _tags, system = _suggest(vocabulary=many)
    shown = [tag for tag in many if f" {tag}," in system or f" {tag}." in system]
    assert len(shown) <= librarian.VOCABULARY_SHOWN
    assert "tag0" in system, "the most used tags are the ones kept"


def test_an_empty_vocabulary_entry_is_dropped_not_printed():
    _tags, system = _suggest(vocabulary=["", "ml", ""])
    assert "ml" in system
    assert ", ," not in system
