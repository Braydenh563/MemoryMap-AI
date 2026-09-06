"""In-app guidance chat: "how do I..." answers about MemoryMap itself.

ROADMAP.md item 40's "mini AI chat half" — deliberately its own path,
separate from `librarian.converse`/`librarian.answer`, because those two
answer from the user's notes or hold a general conversation, and this one
must do neither: it only explains the app. Uses the utility model (not the
main chat model), its own system prompt, and the existing `"quick"` preset
(low temperature, no extended thinking, a 256-token cap) rather than a new
one, since that preset already is the "speed and accuracy over creativity,
tight budget" the spec asked for.

No persistence: nothing here writes to the database. The caller (the
frontend) is the one holding the running transcript, in memory only, for
exactly as long as the spec allows — this module only ever sees what it's
handed on each call.
"""

from __future__ import annotations

from memorymap.ai.model_manager import ModelManager
from memorymap.ai.provider import Provider

SYSTEM_PROMPT = (
    "You are MemoryMap's in-app help assistant. You answer ONLY questions "
    "about how to use the MemoryMap app itself: its features, tabs, and "
    "settings. You have no access to the user's notes or documents, so if "
    "asked a question about their notebook's own content, say plainly that "
    "this chat is for app guidance only and point them to the Chat or Ask "
    "tab instead of guessing. Keep answers short — a few sentences or a "
    "short numbered list of steps — and name the exact tab or settings "
    "section involved. Never invent a button, setting, or feature you are "
    "not sure exists."
)

OFFLINE_MESSAGE = (
    "The AI guide isn't available right now (the local model doesn't seem "
    "to be running) — the Help topics above still work without it."
)

# keywords -> the badge to attach when a reply mentions that feature, so it
# can jump straight to the tab/settings section it just described. The same
# "Related:" quick-access mechanism the Help accordion already uses, kept as
# a fixed lookup rather than asked of the model: a small local model asked
# for prose *and* structured output in one reply is the unreliable shape
# `librarian.py` already avoids elsewhere (see its own notes on why the Ask
# tab and the chat tab get different prompts, not a shared one with flags).
FEATURE_BADGES: list[tuple[tuple[str, ...], dict]] = [
    (("reminder",), {"label": "Reminders", "tab": "reminders"}),
    (("graph", "concept map", "mind map", "mindmap"), {"label": "Graph", "tab": "graph"}),
    (("timeline",), {"label": "Timeline", "tab": "timeline"}),
    (("dashboard", "widget"), {"label": "Dashboard", "tab": "dashboard"}),
    (("whiteboard", "sketch"), {"label": "Whiteboard", "tab": "whiteboard"}),
    (("library", "image gallery", "ocr", "file "), {"label": "Library", "tab": "library"}),
    (("document",), {"label": "Documents", "tab": "documents"}),
    (("template",), {"label": "Templates", "section": "templates"}),
    (("skill",), {"label": "Skills", "section": "skills"}),
    (("persona",), {"label": "Personas", "section": "personas"}),
    (("web search", "websearch"), {"label": "Web search", "section": "websearch"}),
    (("remembers", "passive capture", "auto capture"), {"label": "What it remembers", "section": "memory"}),
    (
        ("appearance", "theme", "dark mode", "accent colour", "accent color", "font"),
        {"label": "Appearance", "section": "appearance"},
    ),
    (("shortcut", "keyboard"), {"label": "Shortcuts", "section": "shortcuts"}),
    (("utility model", "chat model", "which model", "ollama"), {"label": "Models", "section": "models"}),
    (("backup", "where is my", "data dir", "storage"), {"label": "Data", "section": "data"}),
    (("chat tab", "conversation"), {"label": "Chat", "tab": "chat"}),
    (("space", "workspace"), {"label": "Spaces", "section": "account"}),
]

#: A tight window — this is guidance, not a conversation to reminisce in.
MAX_HISTORY_TURNS = 6
MAX_MESSAGE_CHARS = 1000


def badges_for(text: str) -> list[dict]:
    """Which quick-access badges belong under a reply, based on the
    features it and the question actually mention. Capped at three: a
    guidance answer is about one or two things, not a sitemap."""
    lowered = text.lower()
    seen: set[str] = set()
    out: list[dict] = []
    for keywords, badge in FEATURE_BADGES:
        if badge["label"] in seen:
            continue
        if any(keyword in lowered for keyword in keywords):
            out.append(badge)
            seen.add(badge["label"])
        if len(out) == 3:
            break
    return out


def answer(
    question: str,
    model_manager: ModelManager,
    ollama: Provider,
    history: list[dict] | None = None,
) -> dict:
    """One turn of the help chat.

    `history` is whatever the caller is holding client-side for the current
    session (see module docstring) — never read from or written to the
    database. Returns `{"content": str, "badges": list[dict]}`."""
    question = question.strip()[:MAX_MESSAGE_CHARS]
    if not question:
        return {"content": "", "badges": []}
    if not ollama.is_running():
        return {"content": OFFLINE_MESSAGE, "badges": []}

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for turn in (history or [])[-MAX_HISTORY_TURNS:]:
        role = turn.get("role")
        content = (turn.get("content") or "").strip()
        if role in ("user", "assistant") and content:
            messages.append({"role": role, "content": content[:MAX_MESSAGE_CHARS]})
    messages.append({"role": "user", "content": question})

    reply = ollama.chat(model_manager.utility_model(), messages, mode="quick")
    content = reply["content"].strip()
    return {"content": content, "badges": badges_for(f"{question} {content}")}
