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

# The persona is WHO the assistant is; the grounding is non-negotiable
# and survives any persona swap — answers always come from the notes.
DEFAULT_PERSONA = "You are the librarian of the user's personal notebook."
GROUNDING = (
    "Answer the user's question in plain English using ONLY the notes "
    "provided. If the notes don't answer the question, say so honestly."
)
SYSTEM_PROMPT = f"{DEFAULT_PERSONA} {GROUNDING}"

# Built-in personas (Wave C). Users add their own in Settings → Personas.
BUILTIN_PERSONAS = [
    {"name": "Librarian", "prompt": DEFAULT_PERSONA},
    {
        "name": "Coach",
        "prompt": (
            "You are an encouraging personal coach reviewing the user's "
            "notes. Spot patterns, celebrate progress, and suggest one "
            "concrete next step."
        ),
    },
    {
        "name": "Analyst",
        "prompt": (
            "You are a precise analyst. Extract the facts, numbers, and "
            "patterns from the notes and organise your answer clearly."
        ),
    },
]

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
    persona_prompt: str | None = None,
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
    persona = (persona_prompt or DEFAULT_PERSONA).strip()
    messages = [
        {
            "role": "system",
            "content": f"{persona} {GROUNDING} {style_hint}{profile_hint}",
        }
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
    persona_prompt: str | None = None,
    use_utility_model: bool = False,
) -> tuple[str, str | None]:
    """(answer text, model's thinking or None) for `question` given
    retrieved `notes` (dicts with 'content' and 'category').

    `use_utility_model` routes background jobs (the weekly digest) to the
    small fast model instead of the main chat model (Wave N)."""
    if not notes:
        return NO_RESULTS_MESSAGE, None
    if not ollama.is_running():
        return OFFLINE_MESSAGE, None

    model = (
        model_manager.utility_model() if use_utility_model else model_manager.chat_model()
    )
    try:
        reply = ollama.chat(
            model,
            build_messages(
                question,
                notes,
                style=style,
                profile=profile,
                history=history,
                persona_prompt=persona_prompt,
            ),
        )
        return reply["content"].strip(), reply["thinking"]
    except OllamaError:
        return OFFLINE_MESSAGE, None


# --- AI writing help (Wave N) -----------------------------------------------------

IMPROVE_MODES = {
    "proofread": (
        "Fix spelling, grammar, and punctuation in the user's note. Keep "
        "their wording and meaning as close to the original as possible — "
        "correct mistakes, don't rewrite."
    ),
    "rewrite": (
        "Rewrite the user's note so it reads clearly and well, keeping the "
        "same meaning, facts, and rough length. Keep their voice."
    ),
    "concise": (
        "Tighten the user's note: remove filler and repetition so it says "
        "the same thing in fewer words. Keep every fact."
    ),
}


def improve_writing(
    text: str,
    mode: str,
    model_manager: ModelManager,
    ollama: OllamaClient,
) -> str:
    """Return an improved version of `text` (proofread / rewrite / concise).
    Raises OllamaError if the model is unavailable — the caller decides
    what to tell the user. Uses the utility model: this is a quick fix,
    not a conversation (Wave N)."""
    instruction = IMPROVE_MODES.get(mode, IMPROVE_MODES["proofread"])
    system = (
        f"You are a careful copy-editor. {instruction} Reply with ONLY the "
        "edited note text — no preamble, no quotes, no explanation."
    )
    reply = ollama.chat(
        model_manager.utility_model(),
        [
            {"role": "system", "content": system},
            {"role": "user", "content": text},
        ],
    )
    # Thinking models may reason first; content already has think-tags split.
    return reply["content"].strip()
