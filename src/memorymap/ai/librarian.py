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

# GROUNDING is right for a question about the notebook and wrong for anything
# else — it's what turned "hey" into a summary of your notes. Conversational
# messages get their own brief instead, and never see retrieved notes.
CONVERSATIONAL = (
    "This message is small talk, not a question about the notebook. Reply the "
    "way a helpful assistant would: one or two short sentences, warm and "
    "natural. Do NOT list, summarise, or mention the user's notes unless they "
    "ask. Don't offer a menu of features. If a nudge fits, at most one short "
    "question about what they'd like to do."
)

# What the app can actually do, for "what can you do?". Kept as prose the model
# puts in its own words rather than a list it recites verbatim.
CAPABILITIES = (
    "You help the user work with their personal notebook. You can: find and "
    "summarise notes they've written; create, edit, tag, categorise and delete "
    "notes; set and list reminders; look at their tags and categories; and "
    "search the web when they've turned that on. The app also has a graph view "
    "of how notes connect, a dashboard, and a chat that remembers the "
    "conversation."
)
ABOUT_APP_BRIEF = (
    "The user is asking what you can do, not asking about their notes. Answer "
    "from the capability description below, in your own words, in a few short "
    "sentences. Don't recite it as a list of every item, and don't mention any "
    "of their actual notes."
)

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

def resolve_persona_prompt(name: str | None, config) -> str | None:
    """Persona name → its system prompt.

    The user's saved list wins over the built-ins (that's how editing a
    built-in works — the edit is stored as an override; deleting the override
    resets it). Unknown names fall back to the default persona. Shared by the
    chat routes, the dashboard greeting, and chat auto-naming, so the voice the
    user picked is used consistently everywhere.
    """
    wanted = name or config.get_preference("active_persona", "Librarian")
    custom = config.get_preference("personas", [])
    for persona in list(custom) + BUILTIN_PERSONAS:
        if persona.get("name") == wanted and persona.get("prompt"):
            return persona["prompt"]
    return None


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


def build_conversational_messages(
    question: str,
    intent: str,
    style: str = "friendly",
    profile: str = "",
    history: list[dict] | None = None,
    persona_prompt: str | None = None,
) -> list[dict]:
    """Prompt for a message that isn't about the notebook.

    Same persona and history as a normal answer, so it still sounds like the
    assistant the user chose — but no notes, and no instruction to ground the
    reply in them.
    """
    persona = (persona_prompt or DEFAULT_PERSONA).strip()
    style_hint = STYLE_HINTS.get(style, STYLE_HINTS["friendly"])
    profile_hint = f" About the user: {profile.strip()}" if profile.strip() else ""
    if intent == "about_app":
        brief = f"{ABOUT_APP_BRIEF}\n\nWhat you can do: {CAPABILITIES}"
    else:
        brief = CONVERSATIONAL
    messages = [
        {"role": "system", "content": f"{persona} {brief} {style_hint}{profile_hint}"}
    ]
    for turn in (history or [])[-MAX_HISTORY_TURNS:]:
        past_question = str(turn.get("question", "")).strip()
        past_answer = str(turn.get("answer", "")).strip()[:MAX_HISTORY_ANSWER_CHARS]
        if past_question and past_answer:
            messages.append({"role": "user", "content": past_question})
            messages.append({"role": "assistant", "content": past_answer})
    messages.append({"role": "user", "content": question})
    return messages


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
        # A note the user attached by hand is flagged, so the model treats it
        # as the subject rather than as one more search hit.
        f"{i}. [{note['category']}]{' (attached by me)' if note.get('attached') else ''} "
        f"{note['content']}"
        for i, note in enumerate(notes, start=1)
    )
    attached_hint = (
        " The notes marked \"attached by me\" are the ones I specifically chose "
        "for this question — focus on those."
        if any(note.get("attached") for note in notes)
        else ""
    )
    messages.append(
        {
            "role": "user",
            "content": f"My notes:\n{numbered}\n\nMy question: {question}{attached_hint}",
        }
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


# Said without the model, when Ollama isn't up. A greeting shouldn't produce an
# error message — the assistant can still say hello.
OFFLINE_SMALLTALK = "Hello. The AI model isn't running, but your notes are all still here."
OFFLINE_ABOUT_APP = (
    "I help you work with your notebook — finding, writing, tagging and "
    "summarising notes, and setting reminders. The AI model isn't running "
    "right now, so start it to ask me anything."
)


def converse(
    question: str,
    intent: str,
    model_manager: ModelManager,
    ollama: OllamaClient,
    style: str = "friendly",
    profile: str = "",
    history: list[dict] | None = None,
    persona_prompt: str | None = None,
) -> tuple[str, str | None]:
    """Reply to a message that isn't a question about the notebook.

    Deliberately never touches retrieved notes: this is the path that stops
    "hey" being answered with a summary of the user's notebook.
    """
    if not ollama.is_running():
        return (OFFLINE_ABOUT_APP if intent == "about_app" else OFFLINE_SMALLTALK), None
    try:
        reply = ollama.chat(
            model_manager.chat_model(),
            build_conversational_messages(
                question,
                intent,
                style=style,
                profile=profile,
                history=history,
                persona_prompt=persona_prompt,
            ),
        )
        return reply["content"].strip(), reply["thinking"]
    except OllamaError:
        return (OFFLINE_ABOUT_APP if intent == "about_app" else OFFLINE_SMALLTALK), None


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


def suggest_tags(
    text: str,
    existing: list[str],
    model_manager: ModelManager,
    ollama: OllamaClient,
    limit: int = 5,
) -> list[str]:
    """Suggest a few short topic tags for a note (Wave: re-evaluate). Uses
    the utility model. Raises OllamaError if the model is unavailable —
    the caller decides what to do. Returns lowercased, de-duplicated tags,
    excluding any already on the note."""
    have = ", ".join(existing) if existing else "none"
    system = (
        "You label notes with short topic tags. Reply with ONLY a comma-separated "
        f"list of {limit} or fewer tags, each one or two lowercase words, no "
        "hashtags, no explanation. Tags already on the note (don't repeat): " + have
    )
    reply = ollama.chat(
        model_manager.utility_model(),
        [
            {"role": "system", "content": system},
            {"role": "user", "content": text},
        ],
    )
    seen = {t.lower() for t in existing}
    tags: list[str] = []
    for raw in reply["content"].replace("\n", ",").split(","):
        tag = raw.strip().lstrip("#").lower()
        if tag and tag not in seen and len(tag) <= 30:
            seen.add(tag)
            tags.append(tag)
    return tags[:limit]
