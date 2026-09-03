"""Module-level state is declared before anything that runs at load reads it.

**This exists because of a crash that reached the user.** The staging list
for files attached to an unsaved note (`captureStagedFiles`) was declared with
`let` near the end of `app.js`, beside the function that fills it — while
`renderCaptureFiles`, which reads it, is called at module load time by the
draft-restore block much earlier in the file. `let` is hoisted into the
temporal dead zone rather than initialised, so that read threw:

    Uncaught ReferenceError: Cannot access 'captureStagedFiles'
    before initialization

which aborted the rest of `app.js`. `initAuth` never ran, `hideBootSplash`
was never called, and the app sat on its loading screen forever. Reported
exactly that way.

**Three things made it survive every check the project already had**, and
each is the reason this file is a lint rather than a note in a handover:

1. `node --check` passes. It is valid syntax and a runtime ordering fault.
2. Every cold-boot check in the browser passed, because the draft-restore
   block returns early when there is no saved draft — so on a fresh profile
   the crashing line never ran. The bug needed exactly one condition: an
   unsaved note left in the capture box.
3. The declaration and the read are 19,000 lines apart, so neither diff nor
   review puts them on the same screen.

**What this file checks, and what it does not.** It pins the one
declaration by name. A general "nothing read at load is declared below it"
lint was written first and removed — see the comment below for why it could
not be made sound with a regex, and what guards the general case instead.
"""

from __future__ import annotations

from pathlib import Path

FRONTEND = Path(__file__).resolve().parents[1] / "frontend"

#: The one file this pins. Kept as a constant so the path appears once.
APP_JS = FRONTEND / "app.js"


# A general version of this check was written first and **deliberately
# removed**, which is worth recording rather than quietly retrying.
#
# It scanned for top-level statements that execute (an IIFE, a bare call, an
# `addEventListener` registration) and flagged any that mentioned a
# `let`/`const` declared further down. It found nine, and **every one was a
# false positive**: they were `document.addEventListener("keydown", (e) => …)`
# registrations whose *callbacks* read `shortcuts` and `TAB_JUMP_KEYS` at
# event time, long after the file finished evaluating. The TDZ only bites a
# read that happens during evaluation, and telling those apart needs to know
# which text is inside a nested function body — that is a parser, not a
# regex.
#
# A lint that reports nine false alarms is a lint someone silences, and the
# usual way to silence one is to widen its rule until it catches nothing —
# which is worse than not having it, because the file still claims to be
# protecting something. So this keeps only the check that is *exact*, and
# says plainly what actually guards the general case: the browser. The
# regression check in `scratchpad/draftboot.js` sets a `captureDraft` and
# reloads, which is the condition the crash needed; running the app under
# Playwright with a saved draft is the real test, and CLAUDE.md's own
# "measure and look before you claim a UI change works" is the rule it falls
# under.


def test_the_capture_staging_list_is_declared_early():
    """The specific regression, pinned by name.

    Exact rather than clever: it says what the fix actually was, so a later
    refactor cannot quietly undo it and still be green. `import re` stays
    unused-free by not being needed here at all.
    """
    body = APP_JS.read_text(encoding="utf-8")
    decl = body.find("let captureStagedFiles")
    first_read = body.find("captureStagedFiles.length")
    assert decl != -1, "`captureStagedFiles` is gone — update or delete this test"
    assert first_read == -1 or decl < first_read, (
        "`captureStagedFiles` is declared after something reads it again. It "
        "belongs beside the other capture state, ~19,000 lines before its "
        "first use — see this module's docstring for what happens otherwise."
    )
