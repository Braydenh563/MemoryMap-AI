"""The librarian: answers a question using retrieved notes (LLM prompt #2).

Strictly read-only — it never writes to the database.
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


def model_error_message(model: str, error: Exception) -> str:
    """What to show when the model call itself failed mid-turn — distinct
    from OFFLINE_MESSAGE, and never a substitute for it.

    Reported directly, and confirmed by tracing the exact code path: a turn
    that failed *after* the liveness check already passed (`ollama.is_running()`
    succeeded, so the model name and a real elapsed time show in the message
    metadata line) was still shown OFFLINE_MESSAGE — "Ollama doesn't seem to
    be running" — which is simply false in that case and reads as an
    accusation against the model or Ollama itself when the real cause could
    be anything a live backend can reject a request for (the model tag isn't
    actually pulled, a template/architecture the backend can't run, a
    malformed request). OFFLINE_MESSAGE stays exactly what it was for the
    one place that's actually true: the `ollama_running` check itself came
    back negative, before any model was ever named. This is for every other
    failure, and says what actually happened instead of guessing."""
    return (
        f"The model ({model}) couldn't answer this — "
        f"{error}"
    )

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

# Built-in personas. Users add their own in Settings → Personas.
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


# The user's communication-style preference tweaks the tone.
STYLE_HINTS = {
    "friendly": "Be warm and conversational. Keep it brief.",
    "concise": "Be as brief as possible — bullet points are fine.",
    "detailed": "Be thorough: mention every relevant note and add context.",
}


def length_hint(mode: str | None) -> str:
    """How long the answer should be, as a sentence the model can follow (§11).

    Separate from `STYLE_HINTS` on purpose, because they answer different
    questions and are set in different places: style is a standing preference
    about *voice* ("be warm", "be terse"), and this is a per-turn choice about
    *effort*. Someone whose style is "friendly" can still want one quick answer.

    The reply cap alone would not do this job. A cap truncates mid-sentence,
    which reads as a crash; the hint is what makes the model produce a short
    answer that *ends*.
    """
    from memorymap.ai import presets

    return presets.resolve(mode).length_hint


# Follow-up memory (Round 1): keep the conversation short enough that a
# small local model never runs out of context. Only recent turns matter,
# and a long past answer gets clipped.
MAX_HISTORY_TURNS = 4
MAX_HISTORY_ANSWER_CHARS = 600
# Except the answer being followed up on. "Now save that as a note" refers
# to the answer just given, and a 600-character stump of it was what got
# saved — the *most recent* answer keeps enough of itself that "that" means
# what the user watched being written. Reported as "difficult to get the
# agent to explain something, and then make it as a note".
LAST_ANSWER_CHARS = 4_000


def history_messages(history: list[dict] | None) -> list[dict]:
    """The recent turns as chat messages, oldest first.

    One clipping rule for every chat path — conversational, grounded and
    agent — so a follow-up behaves the same wherever it lands: old answers
    are clipped hard, the latest one travels nearly whole (see
    LAST_ANSWER_CHARS).
    """
    recent = [
        turn
        for turn in (history or [])[-MAX_HISTORY_TURNS:]
        if str(turn.get("question", "")).strip()
        and str(turn.get("answer", "")).strip()
    ]
    messages: list[dict] = []
    for i, turn in enumerate(recent):
        limit = (
            LAST_ANSWER_CHARS if i == len(recent) - 1 else MAX_HISTORY_ANSWER_CHARS
        )
        messages.append({"role": "user", "content": str(turn["question"]).strip()})
        messages.append(
            {"role": "assistant", "content": str(turn["answer"]).strip()[:limit]}
        )
    return messages

# How much of a note goes into the prompt before it is cut short. Most notes
# are a line or two and are never touched by this; a few are pages, and those
# few would otherwise crowd out the rest of the notebook — the whole point of
# retrieving ten notes is that the model sees ten of them.
#
# Cutting is only safe because the model can undo it: `get_note` reads one in
# full, and the tools guide already tells it to before quoting. That is the
# trade — send a short form, let it ask for the original — and it is the one
# idea worth taking from the compression tooling that keeps being suggested
# (see ROADMAP §11).
MAX_NOTE_CHARS = 900

# The same cut, for a turn with no tools on the wire — the Notes tab's Ask box.
#
# Reported (§35A): "the notes that come up in the semantic search that are
# given to the ai when asked smth in the ask section are cut off or truncated."
# They were, and the escape hatch above did not exist there: a clipped note
# said "call get_note(12) to read it in full" to a model that had been offered
# no tools at all, so the missing text was simply missing and the instruction
# was noise.
#
# Two things follow. The marker has to stop naming a tool that isn't there,
# and the allowance can be much larger, because this turn is not paying for
# any tool schemas — the ~1,400-2,500 tokens the agent spends on those is
# budget the Ask box has and was not using. Five notes at this size is still
# far inside the window `ai/context.py` rations for them.
UNTOOLED_NOTE_CHARS = 2_400


def note_for_prompt(note: dict, limit: int = MAX_NOTE_CHARS, can_fetch: bool = True) -> str:
    """A note's text, short enough to sit beside nine others.

    `can_fetch` says whether the model has `get_note` available. It changes
    only the marker, and the marker is the whole difference between a cut the
    model can undo and a hole it cannot see the shape of.
    """
    content = str(note.get("content", ""))
    if len(content) <= limit:
        return content
    note_id = note.get("id")
    if can_fetch and note_id:
        # Naming the tool and the id: a truncation the model cannot act on is
        # just a missing piece of the note.
        where = f" — call get_note({note_id}) to read it in full"
    else:
        # No tools this turn. Say it is cut and say nothing about fixing it,
        # so the model reports the gap instead of promising to look.
        where = " — the rest is in the note itself"
    return f"{content[:limit].rstrip()}… [cut{where}]"


def build_conversational_messages(
    question: str,
    intent: str,
    style: str = "friendly",
    profile: str = "",
    history: list[dict] | None = None,
    persona_prompt: str | None = None,
    mode: str | None = None,
    images: list[str] | None = None,
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
        {
            "role": "system",
            "content": f"{persona} {brief} {style_hint}{profile_hint}{length_hint(mode)}",
        }
    ]
    messages.extend(history_messages(history))
    user_message = {"role": "user", "content": question}
    if images:
        user_message["images"] = images
    messages.append(user_message)
    return messages


def _match_info_hint(match_info: dict | None) -> str:
    """" (similarity: 0.81)" or " (matched: gym, membership)" — a short,
    honest note on *why* this result showed up, the same reasoning the
    "(attached by me)"/"(not a match)" flags beside it already use: told
    nothing, the model has no way to weigh a strong semantic match against
    a loose keyword one, or a borderline result the relative-floor logic
    only just let through."""
    if not match_info:
        return ""
    if match_info.get("type") == "semantic" and "score" in match_info:
        return f" (similarity: {match_info['score']})"
    if match_info.get("type") == "keyword" and match_info.get("terms"):
        return f" (matched: {', '.join(match_info['terms'][:5])})"
    return ""


def build_messages(
    question: str,
    notes: list[dict],
    style: str = "friendly",
    profile: str = "",
    history: list[dict] | None = None,
    persona_prompt: str | None = None,
    mode: str | None = None,
    images: list[str] | None = None,
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
            "content": (
                f"{persona} {GROUNDING} {style_hint}{profile_hint}{length_hint(mode)}"
            ),
        }
    ]
    messages.extend(history_messages(history))

    numbered = "\n".join(
        # A note the user attached by hand is flagged, so the model treats it
        # as the subject rather than as one more search hit — and a note that
        # arrived because it is *linked* to a hit is flagged too, for the
        # opposite reason: it did not match, and an answer that presents it as
        # though it did is telling the user their search found something it
        # did not.
        f"{i}. [{note['category']}]"
        f"{' (attached by me)' if note.get('attached') else ''}"
        f"{' (not a match — linked to one of the above)' if note.get('connected') else ''}"
        f"{_match_info_hint(note.get('match_info'))} "
        # No tools on this path by definition — it is the plain librarian
        # prompt — so notes get the larger allowance and an honest marker.
        f"{note_for_prompt(note, UNTOOLED_NOTE_CHARS, can_fetch=False)}"
        for i, note in enumerate(notes, start=1)
    )
    attached_hint = (
        " The notes marked \"attached by me\" are the ones I specifically chose "
        "for this question — focus on those."
        if any(note.get("attached") for note in notes)
        else ""
    )
    user_message = {
        "role": "user",
        "content": f"My notes:\n{numbered}\n\nMy question: {question}{attached_hint}",
    }
    if images:
        user_message["images"] = images
    messages.append(user_message)
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
    mode: str | None = None,
    images: list[str] | None = None,
    model_override: str | None = None,
    image_context: str | None = None,
) -> tuple[str, str | None]:
    """(answer text, model's thinking or None) for `question` given
    retrieved `notes` (dicts with 'content' and 'category').

    `use_utility_model` routes background jobs (the weekly digest) to the
    small fast model instead of the main chat model. `model_override` and
    `images`/`image_context` are routes_chat.py's own resolution of an
    image-carrying turn, and are mutually exclusive: when the model this
    turn would use can see an image directly, `images` carries the raw data
    URIs and `model_override` is usually unset (the chat model handles it
    itself); when it can't, `image_context` carries a vision model's own
    caption of the image instead, folded into the question text, and
    `images` stays empty — asked for directly, so a chat model with no
    vision of its own still "sees" what was attached without silently
    swapping the whole turn to a different model the user did not choose."""
    # An attached image (raw, or captioned into image_context) and "no
    # matching notes" are unrelated: "what's in this photo" has nothing to
    # do with the notebook and should never hit NO_RESULTS_MESSAGE just
    # because retrieval (which never sees the image) came back empty.
    if not notes and not images and not image_context:
        return NO_RESULTS_MESSAGE, None
    if not ollama.is_running():
        return OFFLINE_MESSAGE, None

    model = model_override or (
        model_manager.utility_model() if use_utility_model else model_manager.chat_model()
    )
    full_question = f"{question}\n\n{image_context}" if image_context else question
    try:
        reply = ollama.chat(
            model,
            build_messages(
                full_question,
                notes,
                style=style,
                profile=profile,
                history=history,
                persona_prompt=persona_prompt,
                mode=mode,
                images=images,
            ),
            mode=mode,
        )
        return reply["content"].strip(), reply["thinking"]
    except OllamaError:
        return OFFLINE_MESSAGE, None


# Said without the model, when Ollama isn't up. A greeting shouldn't produce an
# error message — the assistant can still say hello.
OFFLINE_SMALLTALK = "Hello. The AI model isn't running, but your notes are all still here."

#: What the Notes tab's Ask box says instead of chatting back (§35A).
#:
#: Reported: saying "hey" there got a chatbot answer. That box is for
#: interrogating the notebook, and a greeting is the one input it has nothing
#: to do with — so it says what it is for and gets out of the way, which costs
#: no model round and cannot misfire the way a classifier can.
#:
#: Written as a prompt rather than a scolding: the useful thing here is an
#: example of the kind of question that works.
ASK_IS_FOR_NOTES = (
    "This box searches your notes and answers from them. Try one of these, or "
    "ask about anything you've written. For a general chat, use the Chat tab."
)

#: Offered as buttons, not prose. The first version of this said the same
#: thing in a paragraph and read as a dead end beside an empty results panel —
#: a wall of text telling someone what they did wrong. A question they can
#: click is a way forward from the same place, and it teaches the shape of a
#: question that works better than a description of one does.
ASK_EXAMPLES = [
    "What have I written about recently?",
    "Summarise my notes from last week",
    "What are my most common tags?",
]
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
    mode: str | None = None,
    images: list[str] | None = None,
    model_override: str | None = None,
    image_context: str | None = None,
) -> tuple[str, str | None]:
    """Reply to a message that isn't a question about the notebook.

    Deliberately never touches retrieved notes: this is the path that stops
    "hey" being answered with a summary of the user's notebook.

    `images`/`model_override`/`image_context` mirror `answer()`'s own
    (routes_chat.py resolves them the same way for both — a casual "what's
    this?" with a photo attached used to drop the photo entirely here, since
    this path never accepted images at all before now)."""
    if not ollama.is_running():
        return (OFFLINE_ABOUT_APP if intent == "about_app" else OFFLINE_SMALLTALK), None
    model = model_override or model_manager.chat_model()
    full_question = f"{question}\n\n{image_context}" if image_context else question
    try:
        reply = ollama.chat(
            model,
            build_conversational_messages(
                full_question,
                intent,
                style=style,
                profile=profile,
                history=history,
                persona_prompt=persona_prompt,
                mode=mode,
                images=images,
            ),
            mode=mode,
        )
        return reply["content"].strip(), reply["thinking"]
    except OllamaError:
        return (OFFLINE_ABOUT_APP if intent == "about_app" else OFFLINE_SMALLTALK), None


# --- AI writing help -----------------------------------------------------

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
    custom_instruction: str = "",
) -> str:
    """Return an improved version of `text` (proofread / rewrite / concise /
    custom). Raises OllamaError if the model is unavailable — the caller
    decides what to tell the user. Uses the utility model: this is a quick
    fix, not a conversation.

    `custom_instruction` is read only when `mode == "custom"` — asked for
    directly, so a person isn't limited to the three fixed presets ("make it
    sound more professional", "translate to French", …). It's the same
    person's own note either way, not a second, untrusted party, but it's
    still placed as the instruction's *content* rather than spliced into the
    surrounding sentence, and the "reply with ONLY the edited text" rule is
    restated after it — last word wins for a model reading top to bottom, so
    a custom instruction that tried to talk the model into adding commentary
    still loses to the app's own constraint on the reply shape.
    """
    if mode == "custom" and custom_instruction:
        instruction = f'The user asked for this change: "{custom_instruction}"'
    else:
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


#: A generated title this long or longer reads as a summary sentence, not a
#: title — the model is asked to keep it shorter than this, and this is the
#: hard backstop if it doesn't.
GENERATED_TITLE_MAX_CHARS = 80


def generate_title(text: str, model_manager: ModelManager, ollama: OllamaClient) -> str:
    """A short title for a note that doesn't have one, on request — asked
    for directly as the AI half of "a note's own `# Heading` becomes its
    title": recognising one the user wrote is free (`manager.extract_title`,
    no model call), but *writing* one costs a real request, so this is
    opt-in per note rather than automatic on every save.

    Raises OllamaError if the model is unavailable — the caller decides what
    to tell the user, same as `improve_writing`.
    """
    system = (
        "You write short titles for personal notes. Reply with ONLY the "
        "title — 3 to 8 words, no quotes, no trailing punctuation, no "
        "leading '#'. It must actually describe what this specific note "
        "says, not a generic label like 'Quick note'."
    )
    reply = ollama.chat(
        model_manager.utility_model(),
        [
            {"role": "system", "content": system},
            {"role": "user", "content": text},
        ],
    )
    title = reply["content"].strip().strip("\"'").lstrip("#").strip()
    return title[:GENERATED_TITLE_MAX_CHARS].strip()


def generate_link_reason(source_text: str, target_text: str, model_manager: ModelManager, ollama: OllamaClient) -> str:
    """Generate a very short, SPECIFIC reason (3-8 words) for why two notes
    are linked. Uses the utility model. Raises OllamaError if the model is
    unavailable.

    This exists to fix a reported complaint: the reason shown for almost
    every link was the literal string "similar in meaning"
    (`entry.manager.AUTO_REASON_TEXT`) — true of any two notes an embedding
    thought were close, and useless for telling *which* two. The system
    prompt below asks for the concrete thing the two notes share, not a
    restatement that they're related; the caller (`ai.links.audit_vague_links`)
    is the other half — it rejects a reply that comes back vague anyway
    rather than trust the instruction alone.
    """
    system = (
        "You write short, SPECIFIC reasons explaining why two notes are "
        "connected. Name the concrete thing they share: a project, person, "
        "place, tool, decision, or date that appears in both notes. Do NOT "
        "just assert that they are similar or related — that is exactly the "
        "kind of vague answer to avoid.\n\n"
        "Bad (too vague, never write these): 'similar in meaning', 'both "
        "notes discuss this', 'related programming concepts', 'both mention "
        "studying techniques'.\n"
        "Good (names the specific thing): 'both about the Denver move', "
        "'shared deadline: 12 May', 'both mention Sarah', 'same client: "
        "Riverside project'.\n\n"
        "If you can't find anything specific two notes share, still name "
        "the closest concrete overlap you can see — never fall back to a "
        "generic 'they are related' sentence.\n\n"
        "Reply with ONLY the reason — 3 to 8 words, no quotes, no leading "
        "'because', no trailing punctuation."
    )
    prompt = (
        f"Note 1:\n{source_text[:1000]}\n\n"
        f"Note 2:\n{target_text[:1000]}\n\n"
        "What specific thing do these two notes share?"
    )
    reply = ollama.chat(
        model_manager.utility_model(),
        [
            {"role": "system", "content": system},
            {"role": "user", "content": prompt},
        ],
    )
    reason = reply["content"].strip().strip("\"'").strip()
    return reason



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
