"""Pressing Library from inside an open board or map returns to the Library
(INBOX 516). The board is drawn inside the Library tab, so `switchTab` to the
tab already showing changed nothing. `scratchpad/ui-sweeps/libtab.js`: board
and map both open before the press, the landing after it."""
from pathlib import Path

JS = (Path(__file__).resolve().parents[1] / "frontend" / "js" / "phone-shell.js").read_text(encoding="utf-8")


def test_the_tab_press_closes_an_open_board():
    assert 'button.dataset.tab === "library" && button.classList.contains("active")' in JS
    assert '!$("wb-canvas-view").classList.contains("hidden")' in JS
    assert "wbShowBoardsLanding();" in JS
