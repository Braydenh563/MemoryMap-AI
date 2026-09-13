"""Reading a .docx and a saved web page without installing anything.

DOCUMENTS_PLAN Phase 7's import half. Both readers exist for one reason: this
is an offline notebook, and "install a converter first" is a poor answer to
"open the file I just saved". markitdown is still preferred for a .docx where
it is present (it understands tables and footnotes, and these do not); what
these guarantee is that the file opens at all.

The fixtures are deliberately tiny and in the repo (`tests/fixtures/`): a
generated-in-the-test .docx would only ever contain the shapes the test author
remembered, and the point of a fixture is that it is the file, not a
description of one.
"""

from __future__ import annotations

from pathlib import Path

from memorymap.core import docview

FIXTURES = Path(__file__).resolve().parent / "fixtures"


def test_a_word_file_reads_without_markitdown():
    text = docview.docx_to_markdown(FIXTURES / "report.docx")

    assert text.startswith("# A short report")
    assert "## Findings" in text
    assert "**bold ones**" in text
    assert "*In italics at the end.*" in text
    assert "- first finding" in text and "- second finding" in text
    #: The paragraph's runs are one paragraph, not three lines.
    assert "Plain words, then **bold ones**." in text


def test_a_word_file_that_is_not_one_comes_back_empty(tmp_path):
    """Empty, not an exception: the caller's own "no readable text" path is a
    better message than a traceback, and an upload is user input."""
    fake = tmp_path / "not-really.docx"
    fake.write_bytes(b"this is not a zip")

    assert docview.docx_to_markdown(fake) == ""


def test_extracting_a_word_file_reaches_the_reader(tmp_path):
    """Whatever this install has, `extract` returns the words."""
    target = tmp_path / "report.docx"
    target.write_bytes((FIXTURES / "report.docx").read_bytes())

    viewed = docview.extract(target)

    assert "A short report" in viewed.text
    assert viewed.kind == "markdown"
    assert viewed.source == "converted"


def test_a_saved_web_page_becomes_prose():
    html = (FIXTURES / "article.html").read_text(encoding="utf-8")

    text = docview.html_to_markdown(html)

    assert "# What the fixture says" in text
    assert "## A list of things" in text
    assert "**something bold**" in text
    assert "*something italic*" in text
    assert "`inline_code()`" in text
    assert "- the first thing" in text
    assert "> A quoted line." in text
    assert "[link to follow](https://example.com/page)" in text
    assert "![a picture](/media/picture.png)" in text


def test_a_saved_web_page_leaves_the_scripts_and_the_javascript_links_behind():
    """Two ways a page carries something that is not prose, and neither
    travels: `<script>`/`<style>` content, and a `javascript:` href.
    `tests/test_markdown_link_schemes.py` is the rule this keeps."""
    html = (FIXTURES / "article.html").read_text(encoding="utf-8")

    text = docview.html_to_markdown(html)

    assert "window.tracker" not in text
    assert "rebeccapurple" not in text
    assert "javascript:" not in text
    #: The words of the refused link stay: dropping the sentence would be
    #: losing the author's text to protect against a link.
    assert "link not to" in text


def test_extracting_a_saved_page_says_it_converted_it(tmp_path):
    target = tmp_path / "page.html"
    target.write_text((FIXTURES / "article.html").read_text(encoding="utf-8"), encoding="utf-8")

    viewed = docview.extract(target)

    assert viewed.kind == "markdown"
    assert viewed.source == "converted"
    assert "<h1>" not in viewed.text
    assert "# What the fixture says" in viewed.text


def test_importing_either_one_makes_a_markdown_document(client):
    """End to end, through the route people actually use."""
    import io

    for name, data, expected in (
        ("report.docx", (FIXTURES / "report.docx").read_bytes(), "# A short report"),
        (
            "article.html",
            (FIXTURES / "article.html").read_bytes(),
            "# What the fixture says",
        ),
    ):
        response = client.post(
            "/documents/import",
            files={"file": (name, io.BytesIO(data), "application/octet-stream")},
        )

        assert response.status_code == 201, response.text
        body = response.json()
        assert expected in body["content"]
        #: Stored as markdown, because that is what it now is: with the
        #: suffix's own type a converted web page would open in the editor as
        #: HTML source and every markdown feature would be off.
        assert body["file_type"] == "md"
