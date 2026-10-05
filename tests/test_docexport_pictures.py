"""Pictures in the Word export (FEAT-18, INBOX 595).

The audit: "The Word export drops images: `docexport._inline` writes no
picture." A document's pictures are `/media/...` links, so the export reads
each one from the media folder and embeds it, with its alt text and the
document's own `|300|center` options (DOCUMENTS_PLAN D5: width in pixels,
alignment, and the rest as a caption), the same grammar documents.js reads
(`docImageOptions`, `docImageOptionsFromAlt`).

The option grammar and the path check need nothing optional and always run.
The writer needs python-docx, an optional extra the suite must not depend on,
so those tests skip when it is absent (`pytest.importorskip`).
"""

from __future__ import annotations

import io
import re
import zipfile
from pathlib import Path

import pytest

from memorymap.core import docexport

ROOT = Path(__file__).resolve().parents[1]


# --- the option grammar, as the editor reads it -----------------------------


@pytest.mark.parametrize(
    ("alt", "expected"),
    [
        ("A river", {"width": None, "align": None, "caption": "", "alt": "A river"}),
        ("A river|400", {"width": 400, "align": None, "caption": "A river", "alt": "A river"}),
        ("A river|400|center", {"width": 400, "align": "center", "caption": "A river", "alt": "A river"}),
        ("A river|centre", {"width": None, "align": "center", "caption": "A river", "alt": "A river"}),
        ("photo|At dusk|300x200|right", {"width": 300, "align": "right", "caption": "At dusk", "alt": "At dusk"}),
        ("", {"width": None, "align": None, "caption": "", "alt": ""}),
    ],
)
def test_the_options_ride_in_the_alt_text_by_shape(alt, expected):
    options = docexport.picture_options(alt)
    for key, value in expected.items():
        assert options[key] == value, (alt, key, options)


def test_only_a_file_inside_the_media_folder_is_read(tmp_path):
    media = tmp_path / "media"
    media.mkdir()
    (media / "a.png").write_bytes(b"x")
    (tmp_path / "secret.png").write_bytes(b"x")
    assert docexport.media_path(media, "/media/a.png") == (media / "a.png").resolve()
    assert docexport.media_path(media, "/media/../secret.png") is None
    assert docexport.media_path(media, "/media/missing.png") is None
    assert docexport.media_path(media, "https://example.com/a.png") is None
    assert docexport.media_path(None, "/media/a.png") is None


def test_the_route_hands_the_export_its_media_folder():
    """Source check, so it runs without the extra: a writer that can embed
    pictures but is never told where they are embeds none."""
    source = (ROOT / "src" / "memorymap" / "api" / "routes_documents.py").read_text(encoding="utf-8")
    route = source[source.index("def export_docx(") :]
    route = route[: route.index("\n@router")]
    assert re.search(r"docexport\.to_docx\([^)]*media_dir=", route)


# --- the writer (python-docx only) ------------------------------------------


def _png(path: Path, size=(120, 60)) -> None:
    from PIL import Image

    Image.new("RGB", size, (200, 40, 40)).save(path, "PNG")


def _document_xml(data: bytes) -> tuple[str, list[str]]:
    archive = zipfile.ZipFile(io.BytesIO(data))
    return archive.read("word/document.xml").decode("utf-8"), archive.namelist()


def test_a_picture_on_its_own_line_is_embedded_with_its_options(tmp_path):
    pytest.importorskip("docx")
    media = tmp_path / "media"
    media.mkdir()
    _png(media / "river.png")
    text = "Before.\n\n![A river|200|center](/media/river.png)\n\nAfter."
    xml, names = _document_xml(docexport.to_docx("Pictures", text, media_dir=media))
    assert any(name.startswith("word/media/") for name in names), names
    assert 'descr="A river"' in xml
    #: 200 px at 96 dpi, in EMU (914400 per inch).
    assert f'cx="{200 * 9525}"' in xml
    assert '<w:jc w:val="center"/>' in xml
    #: The caption under it, as the editor draws it.
    assert xml.count("A river") >= 2
    assert "Before." in xml and "After." in xml
    assert "![" not in xml


def test_a_plain_picture_keeps_its_alt_text_and_no_caption(tmp_path):
    pytest.importorskip("docx")
    media = tmp_path / "media"
    media.mkdir()
    _png(media / "plain.png")
    xml, _ = _document_xml(docexport.to_docx("Pictures", "![A plain one](/media/plain.png)", media_dir=media))
    assert 'descr="A plain one"' in xml
    assert xml.count("A plain one") == 1


def test_a_picture_wider_than_the_page_is_fitted_to_it(tmp_path):
    pytest.importorskip("docx")
    media = tmp_path / "media"
    media.mkdir()
    _png(media / "wide.png", size=(4000, 400))
    xml, _ = _document_xml(docexport.to_docx("Pictures", "![wide|3000](/media/wide.png)", media_dir=media))
    width = int(re.search(r'<wp:extent cx="(\d+)"', xml).group(1))
    #: Letter or A4 with one-inch margins: well under 7 inches of text.
    assert width <= 7 * 914400


def test_an_inline_picture_sits_in_its_sentence(tmp_path):
    pytest.importorskip("docx")
    media = tmp_path / "media"
    media.mkdir()
    _png(media / "dot.png", size=(16, 16))
    xml, _ = _document_xml(docexport.to_docx("Pictures", "A dot ![dot](/media/dot.png) in a line.", media_dir=media))
    assert 'descr="dot"' in xml
    assert "A dot" in xml and "in a line." in xml


def test_a_picture_that_is_not_there_leaves_its_words(tmp_path):
    pytest.importorskip("docx")
    media = tmp_path / "media"
    media.mkdir()
    (media / "broken.png").write_bytes(b"not a picture")
    text = "![Gone|200](/media/gone.png)\n\n![Broken](/media/broken.png)\n\n![Remote](https://example.com/x.png)"
    xml, names = _document_xml(docexport.to_docx("Pictures", text, media_dir=media))
    assert not any(name.startswith("word/media/") for name in names)
    for words in ("Gone", "Broken", "Remote"):
        assert words in xml
