"""Brief 42: Word files read by Mammoth and written by docx, in the browser.

The owner's decision (DOCUMENTS_PLAN Phase 7, superseded row, INBOX 765):
both vendored, credited, loaded only when a Word file is imported or
exported. The round trip itself is measured by
`scratchpad/ui-sweeps/docs42d.js` in Chromium.
"""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JS = ROOT / "frontend" / "js"
VENDOR = ROOT / "frontend" / "vendor"


def _function(text: str, name: str) -> str:
    start = text.index(f"function {name}(")
    return text[start : text.index("\n}\n", start) + 3]


def test_both_libraries_are_vendored_with_their_licences_and_credited() -> None:
    credits = (ROOT / "docs" / "THIRD_PARTY.md").read_text(encoding="utf-8")
    for folder, script, licence in (("mammoth", "mammoth.browser.min.js", "BSD-2-Clause"), ("docx", "docx.min.js", "MIT")):
        assert (VENDOR / folder / script).is_file()
        assert (VENDOR / folder / "LICENSE").is_file()
        assert f"`{folder}/`" in credits and licence in credits


def test_they_load_only_when_a_word_file_is_used() -> None:
    index = (ROOT / "frontend" / "index.html").read_text(encoding="utf-8")
    app = (JS / "app.js").read_text(encoding="utf-8")
    for name in ("documents-word.js", "mammoth", "docx.min.js"):
        assert name not in index, name
        assert name not in app, name


def test_export_and_import_go_through_the_browser_path() -> None:
    docs = (JS / "documents.js").read_text(encoding="utf-8")
    export = _function(docs, "exportDocumentDocx")
    assert 'lazyScript("/js/documents-word.js")' in export and "docWordExport()" in export
    assert "export.docx" not in export
    library = (JS / "library.js").read_text(encoding="utf-8")
    imp = _function(library, "importLibraryDocuments")
    assert "docWordImport(file)" in imp and "\\.docx$" in imp
    word = (JS / "documents-word.js").read_text(encoding="utf-8")
    assert "convertToHtml" in word and "docHtmlToMarkdown" in word
    assert "Packer.toBlob" in word and "renderMarkdown(" in word
