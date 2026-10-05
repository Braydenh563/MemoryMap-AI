"""A new question takes the last answer's support notice with it (INBOX 593).

The owner: "the warning message appeared before the ai had even finished
thinking" and "it disappeared after the response finished". The notice is a
sibling of `#ai-answer`, placed by `renderAnswerSupport` only once an answer
is finished; starting the next question emptied the box and left it standing.
`clearAskAnswerFoot` runs when a question starts and when history reopens one.
"""

from __future__ import annotations

from _app_js import app_js_text


def test_starting_a_question_removes_the_support_notice():
    src = app_js_text()
    start = src.index("function clearAskAnswerFoot()")
    body = src[start : src.index("\n}\n", start)]
    assert ".answer-support" in body and ".remove()" in body
