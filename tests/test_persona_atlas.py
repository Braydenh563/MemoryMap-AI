"""The built-in librarian persona is Atlas, and the old name still resolves.

INBOX 237: the owner named the app's AI Atlas and asked that the librarian
persona be Atlas acting as the librarian. A notebook that saved
`active_persona = "Librarian"` before the rename must keep answering.
"""

from memorymap.ai import librarian


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
