"""Every vendored bundle carries its licence (DOCUMENTS_PLAN Phase 2, step 1).

A directory under frontend/vendor/ has a LICENSE file beside its bundle; a
single-file bundle at the top level has a `<name>.LICENSE.txt` beside it. AGPL-3.0 can take MIT code in with
its notices (ANALYSIS.md, the licence constraint); it cannot take it in
silently.
"""

from __future__ import annotations

from pathlib import Path

VENDOR = Path(__file__).resolve().parent.parent / "frontend" / "vendor"


def test_every_vendored_directory_has_a_licence_file() -> None:
    for entry in VENDOR.iterdir():
        if entry.is_dir():
            assert (entry / "LICENSE").is_file(), f"{entry.name} has no LICENSE beside it"


def test_every_top_level_bundle_has_a_licence_beside_it() -> None:
    for entry in VENDOR.iterdir():
        if entry.is_file() and entry.suffix == ".js":
            stem = entry.name.split(".")[0]
            assert (VENDOR / f"{stem}.LICENSE.txt").is_file(), (
                f"{entry.name} has no {stem}.LICENSE.txt beside it"
            )


def test_codemirror_bundle_is_the_patched_build() -> None:
    """The style-mod patch build.sh applies is what keeps the editor styled
    under `style-src 'self'`; a rebuild without it would render an unstyled
    editor and nothing in the suite would notice."""
    bundle = (VENDOR / "codemirror" / "codemirror.min.js").read_text(encoding="utf-8")
    assert "!e.head&&e.adoptedStyleSheets" not in bundle
    assert ".adoptedStyleSheets&&" in bundle
    assert (VENDOR / "codemirror" / "build.sh").is_file()
    assert (VENDOR / "codemirror" / "package.json").is_file()


def test_the_word_list_is_there_and_is_a_word_list() -> None:
    """The documents editor's spelling check is a fetch of this file.

    If it goes missing from a build nothing throws: `docLoadWordlist` catches,
    the browser's own spellcheck stays on, and the app quietly goes back to
    knowing 42 typos. That is precisely the failure that is invisible from
    inside the app, so it is checked from outside it.
    """
    words = VENDOR / "wordlist" / "en.txt"
    assert words.is_file(), "frontend/vendor/wordlist/en.txt is missing"
    assert (VENDOR / "wordlist" / "build.sh").is_file()
    lines = words.read_text(encoding="utf-8").split("\n")
    entries = [line for line in lines if line]
    assert len(entries) > 50_000, f"only {len(entries)} words: this is not an English dictionary"
    assert entries == sorted(entries), "the list is not sorted"
    assert all(line == line.lower() for line in entries), (
        "the checker lowercases before it looks a word up, so a capitalised "
        "entry here can never be found"
    )
    for common in ("the", "environment", "colour", "color", "test"):
        assert common in entries, f"{common!r} is not in the word list"


def test_the_editor_reads_the_word_list_it_is_given() -> None:
    """The url in the code and the file on disk are one edit apart otherwise."""
    source = (VENDOR.parent / "documents.js").read_text(encoding="utf-8")
    assert 'DOC_WORDLIST_URL = "/vendor/wordlist/en.txt"' in source
