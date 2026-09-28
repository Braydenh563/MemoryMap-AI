"""The capture box's draft never keeps or restores whitespace alone.

The owner, 2026-09-27: "sometimes when I load up the app, there is randomly
3 new lines in the main note capture text box meaning the help text that
shows when it is empty doesnt show". A textarea's placeholder only shows when
its value is exactly "", so blank lines saved as a "draft" and restored on
the next load hide it. Both ends are guarded: the input handler does not
save a blank draft, and the restore drops one that an older build saved.
"""

import re

from tests._app_js import app_js_text


def _draft_code():
    text = app_js_text()
    start = text.index('$("entry-content").addEventListener("input"')
    end = text.index("renderEntryAttachmentChips();", text.index('localStorage.getItem("captureDraft")'))
    return text[start:end]


def test_a_blank_draft_is_not_saved():
    code = _draft_code()
    saved = re.search(r'^\s*if \((.*)\) localStorage\.setItem\("captureDraft"', code, re.M)
    assert saved, "the draft save moved; update this test"
    assert ".trim()" in saved.group(1), "a whitespace-only draft must not be saved"


def test_a_blank_draft_is_not_restored():
    code = _draft_code()
    restore = code[code.index('localStorage.getItem("captureDraft")') :]
    guard = restore.index("if (!draft.trim())")
    assert guard < restore.index("box.value = draft"), "blank drafts must be dropped before the box is filled"
    assert 'localStorage.removeItem("captureDraft")' in restore[guard : guard + 200]
