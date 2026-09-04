"""The Library's document and board cards carry a preview of the real thing.

Both sub-tabs were reported as "boring and should probably have previews".
Each showed the same three facts for every row — an icon, a name, and a count
or a date — none of which tells four similarly-named drafts apart, or two
boards you drew last week, which is the job a list of them has.
"""

from __future__ import annotations

from memorymap.api.routes_documents import PREVIEW_CHARS, _preview
from memorymap.api.routes_whiteboard import PREVIEW_POINTS, _preview_points


def test_preview_strips_markdown_structure():
    """A preview that opens with `# ` or `- ` spends its first characters on
    syntax, and a heading is usually a restatement of the title already on the
    card."""
    text = _preview("# Chapter 3\n\n- draft\n\nThe measurement problem is real.")
    assert text.startswith("Chapter 3 draft The measurement")
    assert "#" not in text
    assert "- " not in text


def test_preview_cuts_at_a_word_boundary():
    """A hard slice ended the first rendered preview on "a different kind of
    de", which reads as broken rather than as truncated."""
    text = _preview("word " * 200)
    assert len(text) <= PREVIEW_CHARS + 1  # + the ellipsis
    assert text.endswith("…")
    assert not text.rstrip("…").endswith("wor")


def test_short_document_is_not_ellipsised():
    assert _preview("Just a line.") == "Just a line."


def test_preview_of_an_empty_document_is_empty():
    assert _preview("") == ""
    assert _preview("\n\n   \n") == ""


def test_points_are_normalised_into_the_unit_square():
    points = _preview_points([(100.0, 200.0), (300.0, 600.0), (200.0, 400.0)])
    assert points == [[0.0, 0.0], [1.0, 1.0], [0.5, 0.5]]


def test_a_board_with_no_extent_centres_rather_than_dividing_by_zero():
    """One card, or a perfectly straight row of them, has zero extent on at
    least one axis."""
    assert _preview_points([(5.0, 5.0)]) == [[0.5, 0.5]]
    assert _preview_points([(0.0, 7.0), (10.0, 7.0)]) == [[0.0, 0.5], [1.0, 0.5]]


def test_a_large_board_is_sampled_across_its_whole_width_not_truncated():
    """`rows[:40]` of a 300-card board is whichever 40 cards were inserted
    first, which is not the board's shape."""
    rows = [(float(i), 0.0) for i in range(300)]
    points = _preview_points(rows)
    assert len(points) <= PREVIEW_POINTS
    # The last sampled point must come from near the far end of the board.
    assert points[-1][0] > 0.9


def test_empty_board_has_no_points():
    assert _preview_points([]) == []
