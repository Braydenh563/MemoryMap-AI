"""Choosing an installed chat model when the stored one is missing (the owner,
2026-10-07: "the app should detect and smart choose the available models")."""

from memorymap.ai.model_manager import choose_installed_chat_model

GB = 1024**3


def test_the_largest_general_chat_model_that_fits_is_chosen():
    installed = [
        {"name": "hf.co/unsloth/gemma-4-E4B-it-qat-GGUF:UD-Q4_K_XL", "size": int(5.2 * GB)},
        {"name": "hf.co/unsloth/gemma-4-E2B-it-qat-GGUF:UD-Q4_K_XL", "size": int(3.6 * GB)},
        {"name": "hf.co/LiquidAI/LFM2.5-VL-1.6B-GGUF:latest", "size": int(1.6 * GB)},
        {"name": "granite4.1:3b", "size": int(2.1 * GB)},
        {"name": "hf.co/ggml-org/GLM-OCR-GGUF:Q8_0", "size": int(1.4 * GB)},
        {"name": "huge:70b", "size": 40 * GB},
    ]
    assert choose_installed_chat_model(installed) == "hf.co/unsloth/gemma-4-E4B-it-qat-GGUF:UD-Q4_K_XL"


def test_only_vision_or_ocr_models_choose_nothing():
    installed = [{"name": "hf.co/ggml-org/GLM-OCR-GGUF:Q8_0", "size": GB}, {"name": "llava:7b", "size": 4 * GB}]
    assert choose_installed_chat_model(installed) is None


# -- The launch warm-up never loads a model the person did not choose (101c) ---


def _warm(app_state, installed, preferences=None):
    from memorymap.ai import janitor
    from memorymap.core import deps
    from tests.fakes import FakeOllama

    fake = FakeOllama(running=True)
    fake.installed = installed
    deps.override_ai(ollama=fake)
    for key, value in (preferences or {}).items():
        app_state.set_preference(key, value)
    janitor.warm_filing_model(deps.get_model_manager(), fake)
    return fake


def test_a_fresh_install_warms_the_model_it_chose_from_those_installed(app_state):
    """The owner's "llama3.2 failed": nothing was chosen, the default name
    is not installed, five other models are. The warm-up picks from what is
    there (the same choice as the launch step) and warms that one."""
    fake = _warm(app_state, [{"name": "granite4.1:3b", "size": 2 * GB}, {"name": "tiny:1b", "size": GB}])
    assert fake.chat_models == ["granite4.1:3b"]
    assert app_state.get_preference("chat_model") == "granite4.1:3b"


def test_nothing_installed_warms_nothing_and_reports_nothing(app_state, caplog):
    import logging

    with caplog.at_level(logging.INFO, logger="memorymap.janitor"):
        fake = _warm(app_state, [])
    assert fake.chat_models == []
    assert not [r for r in caplog.records if r.levelno >= logging.WARNING]


def test_a_chosen_model_that_is_gone_is_not_warmed_by_name(app_state):
    """A utility model the person set by hand and has since removed is not
    loaded under the default's name or any other: no call, no failure row."""
    fake = _warm(
        app_state,
        [{"name": "granite4.1:3b", "size": 2 * GB}],
        {"utility_model": "removed-model:7b", "chat_model": "granite4.1:3b"},
    )
    assert fake.chat_models == []


def test_the_installed_chat_model_is_warmed_with_or_without_latest(app_state):
    fake = _warm(app_state, [{"name": "llama3.2:latest", "size": 2 * GB}])
    assert fake.chat_models == ["llama3.2"]
