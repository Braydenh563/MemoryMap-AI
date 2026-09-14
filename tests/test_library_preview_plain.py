"""A Library row's one-line preview is plain words, never markdown marks.

The owner, with a screenshot of the Library list (INBOX 244): "inline md
characters show in the document descriptions", the rows reading
`[[# Girl with bell]]`, `**bold** and *italic*` and `| Example Table |
|------|`. Every case here is one of those, plus the marker a clip can split.
"""

from memorymap.api.routes_library import _clip


def test_wiki_links_become_their_titles():
    assert _clip("**Offline Links**: [[# Girl with bell]], [[Slides|the slides]]") == (
        "Offline Links: Girl with bell, the slides"
    )


def test_emphasis_and_lists_are_plain():
    text = "# Title\n\n- We can include **bold** and *italic* text.\n1. And a list"
    assert _clip(text) == "Title We can include bold and italic text. And a list"


def test_a_table_reads_as_its_cells():
    text = "| Example Table | Value |\n|---------------|-------|\n| Row 1 | 2 |"
    assert _clip(text) == "Example Table Value Row 1 2"


def test_an_unpaired_marker_does_not_survive():
    assert _clip("Offline Links**: no partner ***here") == "Offline Links: no partner here"


def test_an_asterisk_that_is_not_a_marker_stays():
    assert _clip("5 * 3 = 15") == "5 * 3 = 15"
