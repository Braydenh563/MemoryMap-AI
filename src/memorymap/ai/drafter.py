"""Turn loose thoughts into a written note, and keep revising it.

The shape of the interaction matters more than the prompt here. You write
whatever is in your head, the model turns it into a draft, and then it's a
conversation: you edit the draft directly, or add more thoughts, and the model
folds the new material in *without* undoing your edits.

That last part is the whole trick. A naive implementation regenerates from the
thoughts each time, which silently throws away every correction the user made
— so the draft the model is revising is always sent back to it, and it's told
in as many words that the user's wording wins.
"""

from __future__ import annotations

from memorymap.ai.model_manager import ModelManager
from memorymap.ai.ollama_client import OllamaClient, OllamaError

OFFLINE_MESSAGE = (
    "The AI isn't running, so it can't draft this yet. Start Ollama and try "
    "again — nothing you've typed is lost."
)

FIRST_DRAFT = (
    "The user has written down some loose thoughts. Turn them into one "
    "well-organised note.\n"
    "- Write the note itself and nothing else: no preamble, no sign-off, no "
    "'here is your note'.\n"
    "- Use their facts only. Do not invent details, examples, or numbers.\n"
    "- Keep their voice. If they wrote casually, stay casual.\n"
    "- Structure it the way the content suggests — a short heading and "
    "paragraphs, or bullets for a list. Markdown is fine.\n"
    "- Be comprehensive about what they said, without padding it out."
)

REVISION = (
    "You are revising a note that already exists. The user has added more "
    "thoughts, and may have edited the draft themselves since you last saw "
    "it.\n"
    "- The CURRENT DRAFT below is the source of truth. The user's own wording "
    "and edits must be preserved — do not rewrite passages they have already "
    "settled on.\n"
    "- Fold the new thoughts into it: add, extend, or correct as they imply.\n"
    "- If the new thoughts contradict something in the draft, the new thoughts "
    "win.\n"
    "- Return the complete revised note and nothing else. No commentary about "
    "what you changed."
)

TITLE_PROMPT = (
    "Give this note a short title, 2 to 6 words. Reply with the title only: "
    "no quotes, no trailing punctuation, no explanation."
)


def build_messages(thoughts: str, draft: str | None, instruction: str = "") -> list[dict]:
    """Prompt for a first draft, or for a revision when a draft exists."""
    system = REVISION if (draft or "").strip() else FIRST_DRAFT
    if instruction.strip():
        # A one-off steer ("make it shorter", "add a conclusion") applies to
        # this pass only, and outranks the generic guidance above.
        system = f"{system}\n\nThe user also asks, for this revision: {instruction.strip()}"

    if (draft or "").strip():
        content = (
            f"CURRENT DRAFT:\n{draft.strip()}\n\n"
            f"NEW THOUGHTS TO FOLD IN:\n{thoughts.strip()}"
        )
    else:
        content = f"MY THOUGHTS:\n{thoughts.strip()}"
    return [
        {"role": "system", "content": system},
        {"role": "user", "content": content},
    ]


def compose(
    thoughts: str,
    draft: str | None,
    model_manager: ModelManager,
    ollama: OllamaClient,
    instruction: str = "",
) -> tuple[str, str | None]:
    """(draft text, model's thinking or None).

    Raises nothing: a model that's down returns the existing draft untouched
    alongside an explanation, because losing a draft to an outage would be far
    worse than not improving it.
    """
    if not (thoughts or "").strip() and not (draft or "").strip():
        return "", None
    if not ollama.is_running():
        return (draft or ""), OFFLINE_MESSAGE

    try:
        reply = ollama.chat(
            model_manager.chat_model(),
            build_messages(thoughts, draft, instruction),
        )
    except OllamaError:
        return (draft or ""), OFFLINE_MESSAGE

    text = (reply.get("content") or "").strip()
    if not text:
        # An empty reply must not wipe the draft the user already has.
        return (draft or ""), reply.get("thinking")
    return text, reply.get("thinking")


def suggest_title(draft: str, model_manager: ModelManager, ollama: OllamaClient) -> str:
    """A short title for a finished draft, or "" if the model can't help."""
    if not (draft or "").strip() or not ollama.is_running():
        return ""
    try:
        reply = ollama.chat(
            model_manager.utility_model(),
            [
                {"role": "system", "content": TITLE_PROMPT},
                {"role": "user", "content": draft.strip()[:2000]},
            ],
        )
    except OllamaError:
        return ""
    title = (reply.get("content") or "").strip().splitlines()
    if not title:
        return ""
    cleaned = title[0].strip().strip("\"'`*#").rstrip(".!,;:").strip()
    if not cleaned or len(cleaned) > 80 or len(cleaned.split()) > 10:
        return ""
    return cleaned[0].upper() + cleaned[1:]
