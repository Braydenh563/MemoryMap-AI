"""Bookmarks says what it is once (INBOX 464 (19)).

The lede under the dock ("Save links to websites you visit often: a bookmark
shelf that lives in the notebook instead of the browser") and the empty state
under it ("Add a website to keep it a click away.") said the same thing one
above the other. The lede stays, because it is there with a full list too;
the empty state is its title and its one action.
"""
import re
from pathlib import Path

INDEX = (Path(__file__).resolve().parents[1] / "frontend" / "index.html").read_text(encoding="utf-8")


def test_the_empty_state_does_not_repeat_the_lede():
    block = re.search(r'<div id="bookmark-empty"[^>]*>(.*?)</div>', INDEX, re.S).group(1)
    sentences = [p for p in re.findall(r"<p\b([^>]*)>", block) if "empty-title" not in p]
    assert not sentences, "the empty state repeats the lede; its title and button say enough"
    assert 'data-empty-action="add-link"' in block
    assert "Save links to websites you visit often" in INDEX
