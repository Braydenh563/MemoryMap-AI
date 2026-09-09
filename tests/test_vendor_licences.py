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
