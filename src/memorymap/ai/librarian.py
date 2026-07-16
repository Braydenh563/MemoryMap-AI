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

# Follow-up memory (Round 1): keep the conversation short enough that a
# small local model never runs out of context. Only recent turns matter,
# and a long past answer gets clipped.
MAX_HISTORY_TURNS = 4
MAX_HISTORY_ANSWER_CHARS = 600


def build_messages(
    question: str,
    notes: list[dict],
    style: str = "friendly",
    profile: str = "",
    history: list[dict] | None = None,
) -> list[dict]:
    """The librarian's prompt — shared by the blocking and streaming
    chat endpoints so they can never drift apart.

    `history` is prior [{"question", "answer"}] turns, replayed as
    user/assistant messages so follow-ups ("and what about…") keep
    context. The freshly retrieved `notes` still ground the current
    answer, so a follow-up searches the notebook anew."""
    style_hint = STYLE_HINTS.get(style, STYLE_HINTS["friendly"])
    # The profile is context about the user, never an instruction source.
    profile_hint = f" About the user: {profile.strip()}" if profile.strip() else ""
    messages = [
        {"role": "system", "content": f"{SYSTEM_PROMPT} {style_hint}{profile_hint}"}
    ]
    for turn in (history or [])[-MAX_HISTORY_TURNS:]:
        past_question = str(turn.get("question", "")).strip()
        past_answer = str(turn.get("answer", "")).strip()[:MAX_HISTORY_ANSWER_CHARS]
        if past_question and past_answer:
            messages.append({"role": "user", "content": past_question})
            messages.append({"role": "assistant", "content": past_answer})

    numbered = "\n".join(
        f"{i}. [{note['category']}] {note['content']}"
        for i, note in enumerate(notes, start=1)
    )
    messages.append(
        {"role": "user", "content": f"My notes:\n{numbered}\n\nMy question: {question}"}
    )
    return messages


def answer(
    question: str,
    notes: list[dict],
    model_manager: ModelManager,
    ollama: OllamaClient,
    style: str = "friendly",
    profile: str = "",
    history: list[dict] | None = None,
) -> tuple[str, str | None]:
    """(answer text, model's thinking or None) for `question` given
    retrieved `notes` (dicts with 'content' and 'category')."""
    if not notes:
        return NO_RESULTS_MESSAGE, None
    if not ollama.is_running():
        return OFFLINE_MESSAGE, None

    try:
        reply = ollama.chat(
            model_manager.chat_model(),
            build_messages(question, notes, style=style, profile=profile, history=history),
        )
        return reply["content"].strip(), reply["thinking"]
    except OllamaError:
        return OFFLINE_MESSAGE, None
