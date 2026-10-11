"""The install guide answers "what is this setup file, is it free, can the app
use it" (OPEN ledger 314, the owner's question)."""

from pathlib import Path

TEXT = (Path(__file__).resolve().parents[1] / "docs" / "INSTALL.md").read_text(encoding="utf-8")


def test_the_guide_names_the_tool_its_licence_and_whether_the_app_uses_it():
    section = TEXT[TEXT.index("**What the setup file is") :].split("\n\n", 1)[0]
    assert "Inno Setup" in section and "free" in section
    assert "nothing in the installed app calls it" in section
    assert "/VERYSILENT" in section
