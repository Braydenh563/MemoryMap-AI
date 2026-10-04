"""INBOX 458: a long note's clamped preview showed "..." alone under its
title. The body kept the blank line after the title (or a second one), and
the two-line clamp spent its lines on blanks. The preview strips every blank
line after the title and, while clamped, runs the paragraphs together."""

from _app_js import app_js_text


def test_every_blank_line_after_the_title_goes():
    app = app_js_text()
    body = app[app.index("function bodyWithoutTitleLine"):]
    body = body[: body.index("\n}\n")]
    assert 'while (lines[i] !== undefined && lines[i].trim() === "") lines.splice(i, 1);' in body


def test_a_clamped_card_collapses_its_blank_lines_and_an_open_one_does_not():
    app = app_js_text()
    assert 'content.classList.contains("entry-clamped") ? body.replace(' in app
    # Opening, closing and the "it fitted after all" check all redraw.
    assert app.count("fillContent();") >= 3
