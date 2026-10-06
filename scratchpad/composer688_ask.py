#!/usr/bin/env python3
"""Ask the composer audit's ten questions through /chat/stream (INBOX 688).

    .venv/bin/python scratchpad/composer688_ask.py 8827 [notes|ai]

Prints each answer as the Ask box receives it, with the notes it cites, so the
before and after can be pasted side by side into the remaining file.
"""
from __future__ import annotations

import json
import sys

import requests

PORT = sys.argv[1] if len(sys.argv) > 1 else "8827"
FROM = sys.argv[2] if len(sys.argv) > 2 else ""
BASE = f"http://127.0.0.1:{PORT}"
QUESTIONS = [
    "What is the Harbor launch plan?",
    "When is the dentist check-up?",
    "Who asked for a public API?",
    "How many beta testers are active?",
    "Which books am I reading?",
    "Compare Lisbon and Porto",
    "Why did the list feel slow?",
    "What is the latest on the sync rewrite?",
    "Does Harbor work offline?",
    "What hotel did I book in Porto?",
]

session = requests.Session()
token = session.post(BASE + "/auth/unlock", json={"password": "testpassword123"}, timeout=30).json()["token"]
session.headers.update({"X-Auth-Token": token})
for question in QUESTIONS:
    body = {"question": question, "notes_only": True, "use_tools": False}
    if FROM:
        body["answer_from"] = FROM
    answer, cited, meta = "", [], {}
    with session.post(BASE + "/chat/stream", json=body, stream=True, timeout=120) as response:
        for line in response.iter_lines():
            if not line:
                continue
            event = json.loads(line)
            if event["type"] == "answer":
                answer += event["delta"]
            elif event["type"] == "grounding":
                cited = event["sentences"]
            elif event["type"] == "meta":
                meta = event
    print(f"### {question}\n")
    print(answer.strip())
    print(f"\n(cites {len({row['note_id'] for row in cited})} notes; composed={meta.get('composed')})\n")
