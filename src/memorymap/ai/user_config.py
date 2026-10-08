import json
import os
from . import composer_tables
from . import question_noise

def apply_user_config():
    """Loads custom_rules.json and injects the rules into the composer."""
    config_path = os.path.join(os.path.expanduser("~"), ".memorymap", "ai_config.json")
    if not os.path.exists(config_path):
        return

    try:
        with open(config_path, "r", encoding="utf-8") as f:
            config = json.load(f)
    except Exception as e:
        print(f"Failed to load custom AI config: {e}")
        return

    # 1. Custom Wrappers & Trailers
    if "extra_wrappers" in config:
        composer_tables.EXTRA_WRAPPERS = tuple(config["extra_wrappers"]) + composer_tables.EXTRA_WRAPPERS
    if "extra_trailers" in config:
        composer_tables.EXTRA_TRAILERS = tuple(config["extra_trailers"]) + composer_tables.EXTRA_TRAILERS

    # 2. Custom Voices
    if "voices" in config:
        for voice_name, families in config["voices"].items():
            if voice_name not in composer_tables.VOICES:
                composer_tables.VOICES = composer_tables.VOICES + (voice_name,)
            for key, phrases in families.items():
                if key in composer_tables._FAMILIES:
                    composer_tables._FAMILIES[key][voice_name] = phrases
        composer_tables.PHRASES.clear()
        composer_tables.PHRASES.update(composer_tables._build_phrases())

    # 3. Custom Slang
    if "slang" in config:
        question_noise.SLANG.update(config["slang"])
        
    # 4. Custom Social Reactions
    if "social" in config:
        question_noise.SOCIAL.update(config["social"])

    # 5. Intent Examples (for trigram fallback)
    if "examples" in config:
        for kind, phrases in config["examples"].items():
            if kind in question_noise.EXAMPLES:
                question_noise.EXAMPLES[kind] = tuple(phrases) + question_noise.EXAMPLES[kind]
        question_noise._EXAMPLE_GRAMS = {kind: [question_noise._trigrams(e) for e in examples] for kind, examples in question_noise.EXAMPLES.items()}
