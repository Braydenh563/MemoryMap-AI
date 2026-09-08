"""Count descriptive helper paragraphs over 120 characters that are NOT already
inside a help popover.

A "hit" is an innermost descriptive element (<p>, <small>, or one carrying a
muted/hint/desc/... class) whose own visible text is longer than 120 chars and
which contains no other hit inside it — so a wrapper is never counted twice.

Anything inside a help popover body (`.graph-help-panel`, `.help-body`,
`.setting-hint`, `.help-popover`) is excluded: that text already lives behind a
"?" and is exactly where this task wants it.

Run: python3 scratchpad/help-audit/count.py frontend/index.html
"""
import re
import sys
from html.parser import HTMLParser

DESC_CLASS = re.compile(r"muted|hint|desc|intro|help|note|caption|lead|explain|blurb|sub")
POPOVER_CLASS = re.compile(r"graph-help-panel|help-body|help-popover|setting-hint|wb-help|search-help|capture-help|help-accordion|onboard|empty-state|tour-")
EXEMPT_ID = re.compile(r"^(onboarding|tour|welcome)")

VOID = {"br", "img", "input", "hr", "meta", "link", "source", "area", "col"}


class P(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []
        self.hits = []

    def handle_starttag(self, tag, attrs):
        if tag in VOID:
            return
        a = dict(attrs)
        self.stack.append([tag, a, [], self.getpos()[0], False])

    def handle_startendtag(self, tag, attrs):
        pass

    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i][0] == tag:
                node = self.stack.pop(i)
                self._finish(node)
                for orphan in self.stack[i:]:
                    self._finish(orphan)
                del self.stack[i:]
                return

    def _finish(self, node):
        tag, attrs, parts, line, had_hit = node
        text = " ".join("".join(parts).split())
        cls = attrs.get("class", "")
        idv = attrs.get("id", "")
        descriptive = tag in ("p", "small") or DESC_CLASS.search(cls) or DESC_CLASS.search(idv)
        # An ancestor already behind a disclosure exempts everything under it:
        # the Help & guide accordion's own topics are the whole point of that
        # screen, and text inside a popover body is where this task wants it.
        in_popover = bool(POPOVER_CLASS.search(cls) or EXEMPT_ID.match(idv))
        for anc in self.stack:
            if POPOVER_CLASS.search(anc[1].get("class", "")) or EXEMPT_ID.match(
                anc[1].get("id", "")
            ):
                in_popover = True
        hit = False
        if len(text) > 120 and descriptive and not had_hit and not in_popover:
            self.hits.append((line, tag, cls, idv, text))
            hit = True
        if self.stack:
            self.stack[-1][2].append(text)
            if hit or had_hit or in_popover:
                self.stack[-1][4] = True

    def handle_data(self, data):
        if self.stack:
            self.stack[-1][2].append(data)


def main(path):
    src = open(path, encoding="utf-8").read()
    def blank(m):
        return "\n" * m.group(0).count("\n")

    src = re.sub(r"<!--.*?-->", blank, src, flags=re.S)
    src = re.sub(r"<script\b.*?</script>", blank, src, flags=re.S)
    src = re.sub(r"<style\b.*?</style>", blank, src, flags=re.S)
    p = P()
    p.feed(src)
    for node in reversed(p.stack):
        p._finish(node)
    out = sorted(p.hits)
    for line, tag, cls, idv, text in out:
        print(f'{line}\t<{tag} class="{cls}" id="{idv}"> ({len(text)})')
        print(f"\t{text[:300]}")
    print("TOTAL", len(out))


if __name__ == "__main__":
    main(sys.argv[1])
