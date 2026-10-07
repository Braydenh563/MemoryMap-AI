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
