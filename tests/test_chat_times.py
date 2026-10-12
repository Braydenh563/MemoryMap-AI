"""Every saved chat message carries the time it was written (INBOX 868).

The owner: "there should be a time stamp on each chat message in the chat tab
and sessions". The server stamps `at` (UTC ISO) on both halves of a turn when
it writes them, so the browser never has to invent a time; a message saved
before this has no `at` and the page falls back to the conversation's own
time. The sessions list carries the last message's time as `last_at`.
"""

from __future__ import annotations

import json
import shutil
import subprocess
from datetime import datetime
from pathlib import Path

import pytest

TURN = {"question": "what is in my notes?", "answer": "Not much yet."}


def _parse(value: str) -> datetime:
    parsed = datetime.fromisoformat(value)
    assert parsed.tzinfo is not None, "a stamp must say it is UTC"
    return parsed


def test_a_new_conversation_stamps_both_messages(client):
    created = client.post("/conversations", json=TURN).json()
    messages = client.get(f"/conversations/{created['id']}").json()["messages"]
    assert [m["role"] for m in messages] == ["user", "assistant"]
    assert all(_parse(m["at"]) for m in messages)


def test_an_appended_turn_gets_a_later_stamp_than_the_first(client):
    created = client.post("/conversations", json=TURN).json()
    client.post(f"/conversations/{created['id']}/turns", json=TURN)
    messages = client.get(f"/conversations/{created['id']}").json()["messages"]
    stamps = [_parse(m["at"]) for m in messages]
    assert stamps == sorted(stamps) and len(stamps) == 4


def test_a_regenerated_turn_is_stamped_again(client):
    created = client.post("/conversations", json=TURN).json()
    client.put(f"/conversations/{created['id']}/turns/last", json={**TURN, "answer": "Fresh."})
    messages = client.get(f"/conversations/{created['id']}").json()["messages"]
    assert messages[-1]["content"] == "Fresh." and _parse(messages[-1]["at"])


def test_an_old_message_without_a_stamp_still_opens_and_lists(client):
    old = json.dumps([{"role": "user", "content": "q"}, {"role": "assistant", "content": "a"}])
    restored = client.post(
        "/conversations/restore",
        json={"id": 4001, "title": "Old", "messages": old, "updated_at": "2026-01-02T03:04:05+00:00"},
    )
    assert restored.status_code == 201, restored.text
    opened = client.get("/conversations/4001").json()
    assert all("at" not in m for m in opened["messages"])  # reads as it was written
    assert opened["last_at"].startswith("2026-01-02T03:04:05")  # the conversation's own time


def test_the_list_row_carries_the_last_messages_time(client):
    created = client.post("/conversations", json=TURN).json()
    client.post(f"/conversations/{created['id']}/turns", json=TURN)
    row = client.get("/conversations").json()[0]
    last = client.get(f"/conversations/{created['id']}").json()["messages"][-1]
    assert row["last_at"] == last["at"]


def test_the_question_is_stamped_before_the_answer_by_the_turns_own_duration(client):
    created = client.post("/conversations", json={**TURN, "elapsed_ms": 90_000}).json()
    asked, answered = client.get(f"/conversations/{created['id']}").json()["messages"]
    gap = (_parse(answered["at"]) - _parse(asked["at"])).total_seconds()
    assert 89 <= gap <= 91


# The page half. The label function is pure, so node runs the real file with
# a fixed clock and locale (en-GB: 24-hour, "14:05").
ROOT = Path(__file__).resolve().parents[1]


def _labels(pairs: list[tuple[str, str]]) -> list[str]:
    source = (ROOT / "frontend/js/chat-time.js").read_text(encoding="utf-8")
    head = source[: source.index("//: Put (or take away)")]
    script = (
        "const parseServerTime = (s) => { const d = new Date(/[Zz]$|[+-]\\d{2}:?\\d{2}$/.test(s) ? s : s + 'Z'); return Number.isNaN(d.getTime()) ? null : d; };\n"
        + head
        + f"\nconst pairs = {json.dumps(pairs)};\n"
        + "console.log(JSON.stringify(pairs.map(([at, now]) => chatTimeLabel(at, new Date(now))?.text ?? null)));"
    )
    out = subprocess.run(
        ["node", "-e", script], capture_output=True, text=True, check=True,
        env={"TZ": "UTC", "LC_ALL": "en_GB.UTF-8", "PATH": "/usr/bin:/bin:/usr/local/bin:/opt/node22/bin"},
    ).stdout
    return json.loads(out)


@pytest.mark.skipif(not shutil.which("node"), reason="needs node")
def test_a_message_time_reads_by_how_far_back_it_is():
    now = "2026-10-11T16:00:00"  # a Sunday, local (TZ=UTC) time
    got = _labels([
        ("2026-10-11T14:05:00Z", now),  # today
        ("2026-10-10T23:50:00Z", now),  # yesterday, under 24 hours ago by the clock but a calendar day back
        ("2026-10-08T14:05:00Z", now),  # within the week
        ("2026-09-21T09:30:00Z", now),  # this year
        ("2025-09-06T09:30:00Z", now),  # another year
        ("nonsense", now),
    ])
    assert got[0] in ("14:05", "2:05 pm", "2:05 PM")
    assert got[1].lower().startswith("yesterday")
    assert got[2].startswith("Thu") and got[2].endswith(got[0])
    assert "Sep" in got[3] and "2026" not in got[3]
    assert "2025" in got[4]
    assert got[5] is None


def test_the_page_stamps_bubbles_and_the_sessions_list_reads_the_last_message():
    boot = "".join((ROOT / "frontend/js" / f).read_text(encoding="utf-8") for f in ("chat-agent.js", "sheets-selects.js"))
    assert 'lazyScript("/js/chat-time.js")' in boot
    assert "stampChatTimes(full.messages)" in boot
    assert "relativeTime(conversation.last_at)" in boot
