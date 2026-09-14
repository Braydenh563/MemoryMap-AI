"""ROADMAP.md item 40's mini AI chat: app-guidance-only, utility model,
no persisted history. `ai_client`/`fake_ollama` give the happy path;
`client` proves it degrades without crashing when the model is offline."""

from __future__ import annotations

import re
from pathlib import Path

from memorymap.ai import help_chat


def test_ask_without_ai_returns_offline_message_never_5xx(client):
    response = client.post("/help/ask", json={"question": "how do I set a reminder?"})
    assert response.status_code == 200
    assert "doesn't seem to be running" in response.json()["content"]
    assert response.json()["badges"] == []


def test_ask_with_only_whitespace_is_a_no_op_not_a_model_call(ai_client, fake_ollama):
    # min_length=1 lets " " through the Pydantic body; help_chat.answer()
    # itself is what actually guards against calling the model on nothing.
    response = ai_client.post("/help/ask", json={"question": " "})
    assert response.status_code == 200
    assert response.json() == {"content": "", "badges": []}


def test_ask_with_working_model(ai_client, fake_ollama):
    fake_ollama.librarian_reply = "Open the Reminders tab and click New reminder."
    response = ai_client.post("/help/ask", json={"question": "how do I set a reminder?"})
    assert response.status_code == 200
    body = response.json()
    assert "New reminder" in body["content"]
    assert {"label": "Reminders", "tab": "reminders"} in body["badges"]


def test_ask_never_writes_history_server_side(ai_client, fake_ollama):
    # Two independent calls with no shared state get no cross-talk, proof
    # this endpoint never reads a database table for context.
    fake_ollama.librarian_reply = "Answer one."
    first = ai_client.post("/help/ask", json={"question": "q1"}).json()
    fake_ollama.librarian_reply = "Answer two."
    second = ai_client.post("/help/ask", json={"question": "q2"}).json()
    assert first["content"] == "Answer one."
    assert second["content"] == "Answer two."


def test_ask_passes_along_client_held_history(ai_client, fake_ollama):
    fake_ollama.librarian_reply = "Following up on that."
    response = ai_client.post(
        "/help/ask",
        json={
            "question": "and what about dark mode?",
            "history": [
                {"role": "user", "content": "how do I change the theme?"},
                {"role": "assistant", "content": "Settings -> Appearance."},
            ],
        },
    )
    assert response.status_code == 200
    assert response.json()["content"] == "Following up on that."


def test_help_chat_answer_function_is_grounded_in_app_guidance_only():
    assert "app guidance only" in help_chat.SYSTEM_PROMPT or "app itself" in help_chat.SYSTEM_PROMPT


def test_ask_grounds_the_model_in_the_matching_reference_notes(ai_client, fake_ollama):
    # The model has no idea what MemoryMap is on its own, item 40's whole
    # "never invent a feature" instruction is only followable if the prompt
    # actually hands it real facts. Assert the reference text lands in the
    # messages sent to the model, not just that the reply looks plausible.
    fake_ollama.librarian_reply = "Open the Reminders tab."
    ai_client.post("/help/ask", json={"question": "how do I set a reminder?"})
    sent = fake_ollama.chat_calls[-1]
    reference_messages = [m["content"] for m in sent if "Reference notes" in m["content"]]
    assert reference_messages
    assert "Overdue" in reference_messages[0]  # from the reminders HELP_TOPICS entry


def test_ask_with_no_matching_topic_sends_no_reference_block(ai_client, fake_ollama):
    fake_ollama.librarian_reply = "I'm not sure: try the Help topics above."
    ai_client.post("/help/ask", json={"question": "purple elephants dance quietly"})
    sent = fake_ollama.chat_calls[-1]
    assert not any("Reference notes" in m["content"] for m in sent)


def test_matching_topics_finds_known_features():
    topics = help_chat._matching_topics("Check the Graph tab for your concept map")
    assert any(t["id"] == "graph" for t in topics)


def test_matching_topics_caps_at_max_topics():
    text = "reminder graph timeline dashboard library document template"
    assert len(help_chat._matching_topics(text)) <= help_chat.MAX_TOPICS


def test_matching_topics_no_match_is_empty():
    assert help_chat._matching_topics("the weather is nice today") == []


def test_matching_topics_keyword_match_is_whole_word_not_substring():
    # "ask" is a keyword (the ask-chat topic); "basket" and "task" both
    # contain it as a raw substring but neither is asking about chat.
    assert help_chat._matching_topics("where's the picnic basket for our task?") == []


def test_badges_for_derives_from_matched_topics():
    topics = help_chat._matching_topics("how do I set a reminder?")
    badges = help_chat.badges_for(topics)
    assert {"label": "Reminders", "tab": "reminders"} in badges


def test_every_help_topic_has_a_non_empty_body_and_badge():
    for topic in help_chat.HELP_TOPICS:
        assert topic["body"].strip()
        assert topic["keywords"]
        assert topic["badge"].get("label")
        assert topic["badge"].get("tab") or topic["badge"].get("section")


# Reported live: clicking the "Whiteboard" badge (a `data-goto-tab="whiteboard"`
# button) blanked the whole app, `switchTab()` hides every tab panel and shows
# none when given a name that matches no real tab, since "whiteboard" is a
# Library *sub*-tab, not a top-level one, and the badge system only knows how to
# switch to a top-level tab.
#
# **Read out of app.js rather than copied into a literal here.** The original
# list was hand-copied and named "documents" among the sub-tabs: true when it
# was written, and false since Documents was promoted to a tab of its own. So
# this test spent that time refusing a badge that would have worked perfectly,
# which is the failure mode a duplicated constant always eventually has. The
# whole point of this lint is that Python cannot see `switchTab`; reading its
# actual `TABS` line is as close as it gets.
APP_JS = Path(__file__).resolve().parents[1] / "frontend" / "app.js"


def _real_top_level_tabs() -> set[str]:
    match = re.search(r"^const TABS = \[(.*?)\];", APP_JS.read_text(encoding="utf-8"), re.M)
    assert match, "app.js no longer declares `const TABS = [...]` on one line"
    return set(re.findall(r'"([a-z-]+)"', match.group(1)))


REAL_TOP_LEVEL_TABS = _real_top_level_tabs()


def test_the_tab_list_was_actually_found():
    """A regex that quietly matched nothing would make the lint below vacuous."""
    assert "dashboard" in REAL_TOP_LEVEL_TABS
    assert len(REAL_TOP_LEVEL_TABS) >= 7


def test_every_badge_tab_is_a_real_top_level_tab():
    for topic in help_chat.HELP_TOPICS:
        tab = topic["badge"].get("tab")
        if tab is not None:
            assert tab in REAL_TOP_LEVEL_TABS, (
                f"{topic['id']!r}'s badge points at {tab!r}, which switchTab() "
                "can't resolve: it isn't one of the app's top-level tabs"
            )


# --- INBOX 190: the Guide is reachable from every tab, so it is told which ---


def test_the_tab_pulls_in_its_own_topics_for_a_question_that_names_none(
    ai_client, fake_ollama
):
    """"How does this work?" has no keyword in it and used to match nothing.

    That is the question the Guide gets most now that it opens from every
    tab's header rather than only from the bottom of the Help pane, and with
    no reference notes the system prompt tells the model to say it is not
    sure, which is the one answer that is never useful.
    """
    fake_ollama.librarian_reply = "The graph draws a dot per note."
    ai_client.post("/help/ask", json={"question": "how does this work?", "tab": "graph"})
    sent = fake_ollama.chat_calls[-1]
    reference = [m["content"] for m in sent if "Reference notes" in m["content"]]
    assert reference, "a tab with topics must ground the answer even with no keyword match"
    assert "graph" in reference[0].lower()
    assert any("graph tab open" in m["content"] for m in sent)


def test_what_the_question_names_still_wins_over_the_tab(ai_client, fake_ollama):
    # Asking about reminders from the Graph tab is a question about reminders.
    fake_ollama.librarian_reply = "Reminders tab."
    ai_client.post(
        "/help/ask", json={"question": "how do I set a reminder?", "tab": "graph"}
    )
    reference = [
        m["content"] for m in fake_ollama.chat_calls[-1] if "Reference notes" in m["content"]
    ]
    assert reference
    assert help_chat.topics_for("how do I set a reminder?", "graph")[0]["id"] == "reminders"


def test_an_unknown_tab_adds_nothing_rather_than_failing(ai_client, fake_ollama):
    fake_ollama.librarian_reply = "Not sure."
    response = ai_client.post(
        "/help/ask", json={"question": "how does this work?", "tab": "nonesuch"}
    )
    assert response.status_code == 200
    assert help_chat.topics_for("how does this work?", "nonesuch") == []


def test_the_surfaces_own_help_copy_reaches_the_model_and_is_capped(
    ai_client, fake_ollama
):
    """The client sends the `.help-body` text of whatever is on screen.

    It is the app's own wording, which makes it the best reference note there
    is; it is also user-supplied input on the wire, so the cap is asserted
    here rather than trusted to the browser that sent it.
    """
    fake_ollama.librarian_reply = "That toggle turns web search off."
    ai_client.post(
        "/help/ask",
        json={
            "question": "what is this toggle?",
            "tab": "notes",
            "context": "A quiet marker on a note you have not read since it changed.",
        },
    )
    sent = fake_ollama.chat_calls[-1]
    assert any("quiet marker on a note" in m["content"] for m in sent)

    over = "x" * (help_chat.MAX_CONTEXT_CHARS + 500)
    response = ai_client.post(
        "/help/ask", json={"question": "what is this?", "context": over}
    )
    # The route's own Field(max_length=...) refuses it rather than truncating,
    # which is the shape every other bounded body field in this app has.
    assert response.status_code == 422


def test_no_tab_behaves_exactly_as_before(ai_client, fake_ollama):
    fake_ollama.librarian_reply = "Reminders tab."
    ai_client.post("/help/ask", json={"question": "how do I set a reminder?"})
    sent = fake_ollama.chat_calls[-1]
    assert not [m for m in sent if "tab open" in m["content"]]
    assert help_chat.topics_for("how do I set a reminder?") == help_chat._matching_topics(
        "how do I set a reminder?"
    )


# --- INBOX 204: the guide has a name, and knows what it is -------------------


def test_the_guide_is_named_once_and_the_interface_agrees(ai_client, fake_ollama):
    """CHAT_PLAN decision 15. The owner asked for "a name fitting for the
    application like a persona"; a persona whose name is typed out in nine
    places is a persona that gets renamed in eight of them.

    So the server holds one constant, the frontend holds one constant, and this
    asserts that the word in the model's prompt is the word on the screen.
    """
    from pathlib import Path

    frontend = Path(__file__).resolve().parents[1] / "frontend"
    settings_js = (frontend / "settings.js").read_text(encoding="utf-8")
    index = (frontend / "index.html").read_text(encoding="utf-8")

    assert help_chat.GUIDE_NAME == "Atlas"
    assert f'const GUIDE_NAME = "{help_chat.GUIDE_NAME}"' in settings_js
    #: The sheet's own title comes from that constant rather than a literal.
    assert "label: GUIDE_NAME," in settings_js
    #: And the one surface that is markup says the same word.
    assert f"Ask {help_chat.GUIDE_NAME}</h4>" in index
    #: The model is told who it is in the first system message, not in a
    #: reference note that a question may or may not pull in.
    assert help_chat.SYSTEM_PROMPT.startswith(f"You are {help_chat.GUIDE_NAME},")
    assert help_chat.GUIDE_NAME in help_chat.OFFLINE_MESSAGE


def test_the_guide_can_answer_what_it_is():
    """It could not. "Who are you?" and "what can you do?" carry none of the
    feature keywords, so no topic matched, and the prompt tells the model to
    say it is not sure when it has no reference notes: the guide answered "I'm
    not sure" to the first question anybody asks a chat.
    """
    for question in ("who are you?", "what can you do?", "what is Atlas?"):
        ids = [topic["id"] for topic in help_chat.topics_for(question)]
        assert "guide" in ids, question
    body = next(t for t in help_chat.HELP_TOPICS if t["id"] == "guide")["body"]
    #: The three facts that make it useful rather than just present: the model
    #: it uses, what it cannot see, and that nothing is kept.
    assert "utility model" in body
    assert "cannot read your notes" in body
    assert "nothing said to it is saved" in body


def test_the_empty_chat_says_what_it_is_and_the_first_turn_retires_it():
    """An empty log under a field is a chat that has to be guessed at. The
    description is markup (it is true before anything has happened) and the
    two places that change the transcript are the two that have to know about
    it: the first appended row hides it, "New chat" brings it back.
    """
    from pathlib import Path

    frontend = Path(__file__).resolve().parents[1] / "frontend"
    index = (frontend / "index.html").read_text(encoding="utf-8")
    settings_js = (frontend / "settings.js").read_text(encoding="utf-8")

    assert 'id="help-chat-empty"' in index
    assert "cannot read your notes or your documents" in index
    start = settings_js.index("function helpChatAppendRow(")
    assert 'empty.hidden = true' in settings_js[start : settings_js.index("\n}\n", start)]
    start = settings_js.index('$("help-chat-clear")?.addEventListener')
    clear = settings_js[start : settings_js.index("\n});", start)]
    #: `replaceChildren()` here took the description away with the transcript
    #: and left a blank rectangle under the field.
    assert "list.replaceChildren()" not in clear
    assert 'empty.hidden = false' in clear
