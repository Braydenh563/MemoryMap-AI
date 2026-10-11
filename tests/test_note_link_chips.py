"""INBOX 474: a note's connections row.

Two reports from one screenshot. "+N more links" opened the row and left no
way back ("I cant go back to the collapsed links way it was before"), and a
chip read the linked note's raw Markdown ("something lol [something](https://
something.com..."): the server clips the preview at 60 characters, so a link
or a `**` arrives cut in half and the inline renderer printed it as typed."""

from tests._app_js import app_js_text


def _links_block():
    app = app_js_text()
    start = app.index("if (entry.links.length > 0) {")
    return app[start : app.index("return li;", start)]


def test_the_more_links_button_is_a_toggle():
    block = _links_block()
    assert 'linkRow.classList.toggle("show-all")' in block
    assert '"Show less"' in block
    # The old one-way door removed the button on its first click.
    assert "more.remove()" not in block
    assert 'more.setAttribute("aria-expanded", String(open))' in block


def test_a_chip_label_is_plain_text_not_rendered_markdown():
    block = _links_block()
    assert "plainText(" in block
    assert "renderInlineMarkdown(linkPreview" not in block
    assert "linkPreview.textContent = short;" in block
    # A `[` whose `]` the server's clip cut off goes too.
    assert ".replace(/\\[([^\\]]*)$/" in block
