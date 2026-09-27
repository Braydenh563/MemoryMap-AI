"""The popup agent's reply rows wear the persona avatar circle, the same as
Chat's own bubbles (coordinator ask, reconciling d640710 with c941505).

**Why this needed reconciling rather than just building.** d640710 gave
`cmdPaletteAsk`'s rows a `.msg-role`/`.msg-avatar` header before Chat's own
per-persona face system (`paintPersonaAvatar`, c941505) existed on this
branch, on a checkout where `app.js` was still one file; its own commit
message says to revisit this once both landed. Neither survived into
`palette.js` (the app.js split moved `cmdPaletteAsk` there without that
header): `cmdPaletteAsk`'s assistant row still had no `.msg-role`/`.msg-avatar`
at all. This adds the real thing, built on what c941505 actually shipped for
Chat (`paintPersonaAvatar`, `personaDisplayName`), not a second generic
emblem.
"""

from __future__ import annotations

import re
from pathlib import Path

#: palette.js is a lazy bundle (loaded after timeline.js, per its own header
#: comment), not one of the 23 always-loaded scripts `app_js_text()` covers
#: (`app.js` through `agent-activity.js`, tests/_app_js.py), so it is read
#: directly here rather than through that helper.
PALETTE_JS = (Path(__file__).resolve().parents[1] / "frontend" / "palette.js").read_text(
    encoding="utf-8"
)


def _cmd_palette_ask() -> str:
    start = PALETTE_JS.index("async function cmdPaletteAsk(")
    rest = PALETTE_JS[start + len("async function cmdPaletteAsk(") :]
    end = re.search(r"\n(?:async )?function \w+\(", rest)
    return PALETTE_JS[
        start : start + len("async function cmdPaletteAsk(") + (end.start() if end else len(rest))
    ]


def test_the_reply_row_gets_the_same_avatar_header_chats_bubbles_carry() -> None:
    body = _cmd_palette_ask()
    assert '"msg-role msg-role-assistant"' in body
    assert '"msg-avatar"' in body
    assert "paintPersonaAvatar(agentAvatar," in body


def test_the_avatar_is_painted_after_the_row_is_attached() -> None:
    """p5 cannot size a canvas inside a detached element (the same reasoning
    `addAssistantBubble`'s own comment gives), so painting must come after
    `cmdPaletteResults.appendChild(agentMsg)`, not before."""
    body = _cmd_palette_ask()
    append_at = body.index("cmdPaletteResults.appendChild(agentMsg)")
    paint_at = body.index("paintPersonaAvatar(agentAvatar,")
    assert append_at < paint_at


def test_the_persona_is_captured_once_at_send_time_not_reread_from_the_picker() -> None:
    """The live path captures the persona it sent, the same rule Chat's own
    `addAssistantBubble` follows, so a reply is never relabelled by a persona
    switch that happened while it was still streaming."""
    body = _cmd_palette_ask()
    capture_at = body.index("const askedPersona = (prefsCache && prefsCache.active_persona) || null;")
    avatar_paint_at = body.index("paintPersonaAvatar(agentAvatar, askedWriter")
    assert capture_at < avatar_paint_at
    # The meta row's own "who answered" fact must read the same captured
    # value, not a second live lookup that could disagree with the avatar.
    meta_at = body.index("persona: askedPersona,")
    assert capture_at < meta_at
    after_capture_line = body.index("\n", capture_at) + 1
    assert "prefsCache.active_persona" not in body[after_capture_line:], (
        "a second live read of the picker is exactly the bug this reconciles"
    )
