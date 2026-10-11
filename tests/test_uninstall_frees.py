"""The Windows uninstaller's "That frees about N MB" counts the notes when it
is told to delete them (OPEN ledger 295, Brief 17's second deliberate gap). Text
only: cmd cannot run here (needs device)."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_the_windows_dry_run_adds_the_notes_when_they_are_deleted():
    text = (ROOT / "uninstall.bat").read_text(encoding="utf-8")
    assert 'if "!DELETE_DATA!"=="1" set /a FREES_MB+=DATA_MB' in text
    assert text.index("set /a FREES_MB=VENV_MB") < text.index("FREES_MB+=DATA_MB") < text.index("That frees about")


def test_the_shell_uninstaller_already_counts_them():
    text = (ROOT / "uninstall.sh").read_text(encoding="utf-8")
    assert 'BEFORE_KB=$((BEFORE_KB + $(mm_size_kb "$DATA_DIR")))' in text or "DELETE_DATA" in text
