"""The librarian: answers a question using retrieved notes (LLM prompt #2).

Strictly read-only — it never writes to the database (plan Phase 2).
When the chat model is unavailable the caller still gets a friendly
sentence, never an exception, because the raw results are shown anyway.
"""

from __future__ import annotations

from memorymap.ai.model_manager import ModelManager
from memorymap.ai.ollama_client import OllamaClient, OllamaError

OFFLINE_MESSAGE = (
    "The AI answer isn't available right now (Ollama doesn't seem to be "
    "running), but here are the notes that match your question."
)
NO_RESULTS_MESSAGE = "I couldn't find any saved notes matching that question."

SYSTEM_PROMPT = (
    "You are the librarian of the user's personal notebook. Answer their "
    "question in plain English using ONLY the notes provided. "
    "If the notes don't answer the question, say so honestly."
)

# The user's communication-style preference (Phase 4) tweaks the tone.
STYLE_HINTS = {
    "friendly": "Be warm and conversational. Keep it brief.",
    "concise": "Be as brief as possible — bullet points are fine.",
    "detailed": "Be thorough: mention every relevant note and add context.",
}


def answer(
    question: str,
    notes: list[dict],
    model_manager: ModelManager,
    ollama: OllamaClient,
    style: str = "friendly",
    profile: str = "",
) -> str:
    """Conversational answer for `question` given retrieved `notes`
    (dicts with 'content' and 'category')."""
    if not notes:
        return NO_RESULTS_MESSAGE
    if not ollama.is_running():
        return OFFLINE_MESSAGE

    numbered = "\n".join(
        f"{i}. [{note['category']}] {note['content']}"
        for i, note in enumerate(notes, start=1)
    )
    style_hint = STYLE_HINTS.get(style, STYLE_HINTS["friendly"])
    # The profile is context about the user, never an instruction source.
    profile_hint = f" About the user: {profile.strip()}" if profile.strip() else ""
    try:
        return ollama.chat(
            model_manager.chat_model(),
            [
                {"role": "system", "content": f"{SYSTEM_PROMPT} {style_hint}{profile_hint}"},
                {
                    "role": "user",
                    "content": f"My notes:\n{numbered}\n\nMy question: {question}",
                },
            ],
        ).strip()
    except OllamaError:
        return OFFLINE_MESSAGE
