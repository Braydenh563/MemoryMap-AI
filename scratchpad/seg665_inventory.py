"""INBOX 665: every `.seg` / `.segmented-control` written in index.html, with
its option count and longest label, so the keep / convert list is counted
rather than remembered. JS-built ones are listed by hand in the report.

    python3 scratchpad/seg665_inventory.py
"""

from html.parser import HTMLParser
from pathlib import Path

HTML = Path(__file__).resolve().parents[1] / "frontend" / "index.html"


class Inv(HTMLParser):
    def __init__(self):
        super().__init__()
        self.stack = []  # open seg groups: [depth, name, options, current_text, longest]
        self.depth = 0
        self.rows = []
        self.in_opt = None

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        cls = (a.get("class") or "").split()
        if tag in ("br", "input", "img", "meta", "link"):
            if tag == "input" and a.get("type") == "radio" and self.stack:
                self.stack[-1][2] += 1
            return
        self.depth += 1
        if tag == "div" and ("seg" in cls or "segmented-control" in cls):
            name = a.get("id") or ".".join(cls)
            self.stack.append([self.depth, name, 0, "", 0, a.get("class")])
        elif tag == "button" and self.stack and self.depth == self.stack[-1][0] + 1:
            self.stack[-1][2] += 1
            self.in_opt = self.depth
            self.stack[-1][3] = ""

    def handle_endtag(self, tag):
        if tag in ("br", "input", "img", "meta", "link"):
            return
        if self.in_opt == self.depth and self.stack:
            self.stack[-1][4] = max(self.stack[-1][4], len(self.stack[-1][3].strip()))
            self.in_opt = None
        if self.stack and self.stack[-1][0] == self.depth:
            d, name, n, _, longest, cls = self.stack.pop()
            self.rows.append((name, n, longest, cls))
        self.depth -= 1

    def handle_data(self, data):
        if self.in_opt and self.stack:
            self.stack[-1][3] += data


p = Inv()
p.feed(HTML.read_text(encoding="utf-8"))
for name, n, longest, cls in p.rows:
    print(f"{name:32} options {n:2}  longest label {longest:3}  ({cls})")
