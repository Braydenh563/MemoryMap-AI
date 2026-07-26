"""Turn a natural-language reminder into structured fields (Magic Add).

Reuses the local utility model — the same one the digest/janitor use — so
nothing leaves the machine. Parsing is best-effort: if the model is unavailable
or returns something unusable, callers get a sensible fallback (the raw text,
due tomorrow at 9am, normal priority) rather than an error.

The `now` handed in is the user's local wall-clock time, not the server's UTC:
"this evening" is meaningless against the wrong clock, and getting it wrong put
every relative reminder hours out.
"""

from __future__ import annotations

import json
from datetime import datetime, timedelta

_PRIORITIES = ("low", "normal", "high")

_SYSTEM = (
    "You convert a short natural-language reminder into JSON. "
    "The current date and time is {now}. "
    'Reply with ONLY a JSON object of the form '
    '{{"text": string, "due_at": ISO-8601 date-time, "priority": one of '
    '"low"/"normal"/"high"}}. '
    "That time is the user's own local clock — answer on the same clock, and "
    "resolve relative times (tomorrow, this evening, next week, in 2 hours) "
    "against it. If a time of day is given but no date, choose the next time "
    "that is still in the future. If no time at all is given, use 9am the "
    "following morning. If no priority is given, use normal. Keep the reminder "
    "text short and imperative."
)


def _fallback(text: str, now: datetime) -> dict:
    due = (now + timedelta(days=1)).replace(hour=9, minute=0, second=0, microsecond=0)
    return {"text": text.strip() or "Reminder", "due_at": due, "priority": "normal"}


def _extract_json(content: str) -> dict | None:
    start = content.find("{")
    end = content.rfind("}")
    if start == -1 or end == -1 or end < start:
        return None
    try:
        parsed = json.loads(content[start : end + 1])
    except (ValueError, TypeError):
        return None
    return parsed if isinstance(parsed, dict) else None


def parse_reminder(text: str, ollama, model_manager, now: datetime) -> dict:
    """Return {text, due_at: datetime, priority} parsed from natural language."""
    messages = [
        {"role": "system", "content": _SYSTEM.format(now=now.isoformat())},
        {"role": "user", "content": text},
    ]
    try:
        reply = ollama.chat(model_manager.utility_model(), messages)
    except Exception:  # noqa: BLE001 — any model failure degrades gracefully
        return _fallback(text, now)

    parsed = _extract_json(reply.get("content", "") if isinstance(reply, dict) else "")
    if not parsed:
        return _fallback(text, now)

    result = _fallback(text, now)
    if isinstance(parsed.get("text"), str) and parsed["text"].strip():
        result["text"] = parsed["text"].strip()[:500]
    priority = str(parsed.get("priority", "")).lower()
    if priority in _PRIORITIES:
        result["priority"] = priority
    due_raw = parsed.get("due_at")
    if isinstance(due_raw, str):
        try:
            result["due_at"] = datetime.fromisoformat(due_raw.replace("Z", "+00:00"))
        except ValueError:
            pass  # keep the fallback due time
    return result
