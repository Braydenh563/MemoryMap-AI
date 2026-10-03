"""INBOX 434: making a note is the fastest, safest thing in the app.

Measured with `scratchpad/ui-sweeps/captureaudit.js`; each test names the
number it holds."""

from __future__ import annotations

from pathlib import Path

from tests._app_js import app_js_text

ROOT = Path(__file__).resolve().parents[1]
JS = ROOT / "frontend" / "js"


def test_a_paste_or_drop_on_the_mounted_editor_reaches_its_note_box():
    """An image pasted into Capture and a file dropped on it both vanished
    (0 attachment cards) because the listeners only answered a bare
    textarea; the live editor is mounted over it. After: 1 and 2 cards."""
    code = app_js_text()
    assert "function fileDropBox(el)" in code
    assert '?.closest?.(".note-surface")?.noteSurfaceHost' in code
    assert "await handleFileUpload(box, files);\n}, true);" in code
