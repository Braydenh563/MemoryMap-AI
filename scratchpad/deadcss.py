"""List CSS classes no code uses (design-rows-1005: room in the boot CSS budget).

A class is dead when its name appears nowhere in frontend/js, any .html, the
service worker or src/ (Python writes markup too: the help text, server
rendered pages). A name that a script builds (`prefix-${x}`, `"prefix-" +`)
is never reported for that prefix, so a class like `chip-${kind}` survives.

    python scratchpad/deadcss.py            # every dead class, by file
    python scratchpad/deadcss.py --boot     # only the stylesheets index.html boots

It prints candidates, not verdicts: a class can also be named in a test, a
fixture or a markdown renderer's output; read each rule before deleting it.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FRONT = ROOT / "frontend"

def corpus() -> str:
    parts = []
    for p in list((FRONT / "js").rglob("*.js")) + list(ROOT.glob("frontend/**/*.html")) + [FRONT / "sw.js"]:
        if "vendor" in p.parts:
            continue
        text = p.read_text(encoding="utf-8", errors="replace")
        # Comments name old classes ("was `.foo`"), which is not a use.
        text = re.sub(r"<!--.*?-->", "", text, flags=re.S)
        text = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
        text = re.sub(r"(?m)^\s*//.*$", "", text)
        parts.append(text)
    for p in (ROOT / "src").rglob("*"):
        if p.suffix in {".py", ".html", ".js", ".md", ".txt", ".css"} and p.is_file():
            parts.append(p.read_text(encoding="utf-8", errors="replace"))
    return "\n".join(parts)


def dynamic_prefixes(text: str) -> set[str]:
    out = set(re.findall(r"([a-z][a-z0-9-]*)\$\{", text))
    out |= set(re.findall(r"""["'`]([a-z][a-z0-9-]*)["'`]\s*\+""", text))
    # A one-letter stem ("h" of `h${n}`) would excuse half the stylesheet.
    return {p for p in out if len(p) > 2}


def css_files(boot_only: bool) -> list[Path]:
    files = sorted((FRONT / "css").glob("*.css"))
    if boot_only:
        html = (FRONT / "index.html").read_text(encoding="utf-8")
        booted = set(re.findall(r'href="/?css/([^"?]+\.css)', html))
        files = [f for f in files if f.name in booted]
    return files


def main() -> None:
    text = corpus()
    words = set(re.findall(r"[A-Za-z0-9_-]+", text))
    prefixes = dynamic_prefixes(text)
    for f in css_files("--boot" in sys.argv):
        css = re.sub(r"/\*.*?\*/", "", f.read_text(encoding="utf-8"), flags=re.S)
        # Selectors only: the text before each `{`, minus anything in a value.
        sels = " ".join(re.findall(r"([^{}]+)\{", css))
        # A class only inside `:not(...)` is a guard, not a rule for it:
        # deleting it would change what the rule matches.
        sels = re.sub(r":not\([^()]*\)", "", sels)
        names = set(re.findall(r"\.([a-zA-Z_][a-zA-Z0-9_-]*)", sels))
        # Ids as well, written `#name`: a hex colour never sits in a selector.
        names |= {"#" + n for n in re.findall(r"#([a-zA-Z_][a-zA-Z0-9_-]*)", sels)}
        dead = sorted(n for n in names if n.lstrip("#") not in words and not any(n.lstrip("#").startswith(p) for p in prefixes)
                      and not re.fullmatch(r"\d.*|ph|ph-.*", n))
        if dead:
            print(f"{f.name}: {len(dead)}")
            for n in dead:
                print("   ", n)


if __name__ == "__main__":
    main()
