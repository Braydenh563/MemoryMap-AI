"""Every head in a Settings pane, after the pane's own title, heads a group.

DESIGN.md's recipe "A group head in Settings": an `h3`/`h4` at `--text-lg`,
650, ink, with the divider under it, *inside* a `.settings-group`. INBOX 464
measured the drift this lint now holds shut (scratchpad/ui-sweeps/
groupheads.js, 1440): 44 heads followed the recipe and 10 sat loose on the
pane at 12px/600 (Personas' Answer style, Dashboard greeting, Add your own
and Share; Templates' Add your own; Skills' Share; Web search's two), while
Web search's "Your SearXNG instance" drew at the pane title's 18.4px. Three
voices for one job, in one dialog. A loose head is what a pane gets when a
group is added by appending an `<h3>` and its fields to the section, so this
reads the markup rather than the computed style: the cause, not the symptom.

Allowed containers besides a group: a folded group (`details.settings-fold`),
a dock's identity (Logs), the profile's own head (the person's name beside
their mark), and a `.help-accordion` panel's body.

A pane's title is the head in its `.settings-pane-title` dock when it has
one (the pane-title bars, INBOX 599); otherwise the pane's first loose head.
Before the lint knew the bar, every pane with one lost its title to the
dock, so the next loose head (Background tasks' "Quit MemoryMap") was read
as the title and passed, and the guard test below saw one pane of seven.
"""

from __future__ import annotations

import re
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HTML = ROOT / "frontend" / "index.html"

#: Containers a head may stand in without being a loose head.
HOMES = {"settings-group", "settings-fold", "dock", "profile-head", "help-accordion", "help-body"}
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}


class _Heads(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.stack: list[tuple[str, set[str], str]] = []
        self.loose: dict[str, list[str]] = {}
        self.titled: dict[str, str] = {}
        self._capture: tuple[str, int, bool] | None = None
        self._text: list[str] = []

    def _section(self) -> str | None:
        for tag, classes, ident in self.stack:
            if tag == "section" and "settings-section" in classes:
                return ident
        return None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        classes = set((attrs.get("class") or "").split())
        if tag in {"h3", "h4"} and self._section():
            if any("settings-pane-title" in c for _, c, _ in self.stack):
                self._capture = (self._section(), len(self.stack), True)
                self._text = []
            elif not any(c & HOMES for _, c, _ in self.stack):
                self._capture = (self._section(), len(self.stack), False)
                self._text = []
        if tag not in VOID:
            self.stack.append((tag, classes, attrs.get("id") or ""))

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        while self.stack:
            top = self.stack.pop()
            if top[0] == tag:
                break
        if self._capture and tag in {"h3", "h4"} and len(self.stack) == self._capture[1]:
            text = " ".join("".join(self._text).split())
            if self._capture[2]:
                self.titled[self._capture[0]] = text
            else:
                self.loose.setdefault(self._capture[0], []).append(text)
            self._capture = None

    def handle_data(self, data):
        if self._capture:
            self._text.append(data)


def _loose_heads() -> dict[str, list[str]]:
    html = re.sub(r"<!--.*?-->", "", HTML.read_text(encoding="utf-8"), flags=re.S)
    parser = _Heads()
    parser.feed(html)
    # A pane with a title bar has its title there; otherwise the first loose
    # head of a pane is the pane's own title.
    out = {}
    for section, heads in parser.loose.items():
        rest = heads if section in parser.titled else heads[1:]
        if rest:
            out[section] = rest
    return out


def test_every_settings_head_after_the_title_heads_a_group():
    loose = _loose_heads()
    assert not loose, (
        "a Settings head outside a .settings-group (wrap the head and its fields in "
        f'<div class="settings-group">, DESIGN.md "A group head in Settings"): {loose}'
    )


def test_the_lint_reads_the_panes_it_means():
    # A parser that silently matched nothing would pass forever.
    parser = _Heads()
    parser.feed(re.sub(r"<!--.*?-->", "", HTML.read_text(encoding="utf-8"), flags=re.S))
    titles = {section: heads[0] for section, heads in parser.loose.items()}
    titles.update(parser.titled)
    assert titles.get("settings-websearch") == "Web search", titles
    assert titles.get("settings-templates") == "Templates", titles
    assert len(titles) >= 6, titles
