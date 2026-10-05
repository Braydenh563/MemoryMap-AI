"""Print each dock's zones and their direct children, from index.html (INBOX 621)."""
import re
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TEXT = re.sub(r"<!--.*?-->", "", (ROOT / "frontend/index.html").read_text(encoding="utf-8"), flags=re.S)
VOID = {"input", "img", "br", "hr", "meta", "link"}


class P(HTMLParser):
    def __init__(self):
        super().__init__()
        self.stack = []
        self.out = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        cls = a.get("class") or ""
        depth = len(self.stack)
        dock = next((f for f in reversed(self.stack) if f.get("dock")), None)
        if "data-dock-name" in a:
            self.out.append(f"\n== {a['data-dock-name']}")
        elif dock is not None:
            rel = depth - dock["depth"]
            if rel <= 2:
                desc = f"{'  ' * rel}{tag}#{a.get('id', '')}.{cls.replace(' ', '.')}"
                self.out.append(desc)
        frame = {"tag": tag, "dock": "data-dock-name" in a, "depth": depth}
        if tag not in VOID:
            self.stack.append(frame)

    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i]["tag"] == tag:
                del self.stack[i:]
                return


p = P()
p.feed(TEXT)
print("\n".join(p.out))
