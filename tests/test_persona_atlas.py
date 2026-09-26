"""The built-in librarian persona is Atlas, and the old name still resolves.

INBOX 237: the owner named the app's AI Atlas and asked that the librarian
persona be Atlas acting as the librarian. A notebook that saved
`active_persona = "Librarian"` before the rename must keep answering.
"""

from memorymap.ai import librarian
from tests._app_js import app_js_text


class _Config:
    def __init__(self, prefs):
        self.prefs = prefs

    def get_preference(self, key, default=None):
        return self.prefs.get(key, default)


def test_atlas_is_the_default_persona():
    assert librarian.BUILTIN_PERSONAS[0]["name"] == "Atlas"
    assert librarian.resolve_persona_prompt(None, _Config({})) == librarian.DEFAULT_PERSONA


def test_the_old_name_resolves_to_atlas():
    assert librarian.resolve_persona_prompt("Librarian", _Config({})) == librarian.DEFAULT_PERSONA
    saved = _Config({"active_persona": "Librarian"})
    assert librarian.resolve_persona_prompt(None, saved) == librarian.DEFAULT_PERSONA


def test_a_custom_override_under_the_old_name_still_wins():
    config = _Config({"personas": [{"name": "Librarian", "prompt": "grumpy"}]})
    assert librarian.resolve_persona_prompt("Librarian", config) == "grumpy"


def test_the_persona_text_the_app_shows_is_the_text_the_model_gets():
    """"What this persona tells the AI" reads app.js's mirror of the
    built-ins; it said "the librarian of the user's personal notebook" while
    the model was told "You are Atlas, this notebook's librarian" (the owner,
    2026-09-14: "atlas's librarian persona should be You are Atlas...")."""
    import re

    app = app_js_text()
    match = re.search(r"^    \[name\]: `([^`]+)`,", app, re.M)
    assert match, "app.js's builtinPersonas() has no templated librarian row"
    from memorymap.ai import AI_NAME

    assert match.group(1).replace("${name}", AI_NAME) == librarian.DEFAULT_PERSONA
    assert "BUILTIN_PERSONAS" not in app, "the persona table must be built from the name, not a literal"


def test_a_custom_persona_may_write_the_placeholder():
    config = _Config({"personas": [{"name": "Pirate", "prompt": "You are {ai_name}, a pirate."}]})
    from memorymap.ai import AI_NAME

    assert librarian.resolve_persona_prompt("Pirate", config) == f"You are {AI_NAME}, a pirate."


def test_the_placeholder_is_explained_beside_the_prompt_box_and_filled_in_the_preview():
    from pathlib import Path

    root = Path(__file__).resolve().parents[1]
    html = (root / "frontend" / "index.html").read_text(encoding="utf-8")
    app = app_js_text()
    assert 'id="persona-placeholder-hint"' in html and "{ai_name}" in html
    assert 'replaceAll("{ai_name}", aiNameNow())' in app
