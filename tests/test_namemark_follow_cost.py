"""The avatar pointer-follow frame must not query the whole document (INBOX 424).

With "eyes follow the pointer" on (the default), every pointer move ran
`document.querySelectorAll(".name-mark[data-nm-on]")` over an 18,000-node
DOM: 279ms of a 60-move pointer sweep at 4x CPU, and the largest single
cost of a graph drag and a board pan. The on-screen faces are now a set kept
by the IntersectionObserver that already marks them: 20ms for the same sweep.
"""

from pathlib import Path

SRC = (Path(__file__).resolve().parent.parent / "frontend" / "avatars.js").read_text(encoding="utf-8")


def _follow_handler() -> str:
    start = SRC.index('document.addEventListener("pointermove"')
    return SRC[start : SRC.index("}, { passive: true });", start)]


def test_the_follow_frame_reads_the_observer_set_not_the_document():
    body = _follow_handler()
    assert "querySelectorAll" not in body
    assert "nameMarkOnScreen" in body


def test_the_observer_keeps_the_set():
    assert "nameMarkOnScreen.add(entry.target)" in SRC
    assert "nameMarkOnScreen.delete(entry.target)" in SRC
