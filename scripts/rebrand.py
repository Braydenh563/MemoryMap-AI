"""Rename the product to Tessellate (formerly MemoryMap AI), idempotently.

    python scripts/rebrand.py            # rewrite, print what changed
    python scripts/rebrand.py --check    # print what would change, exit 1 if any
    python scripts/rebrand.py --repo-url Braydenh563/Tessellate

The owner, 2026-10-11 (INBOX 903): "alright lets rename and retrademark to
Tessellate update absolutely everything including all the documentation and
the pages site. make sure to still note the former name though."

Other branches keep landing text written before the rename, so this runs
again after every merge and must change nothing the second time.
`tests/test_brand_name.py` runs `pending()` and fails on anything left.

What it changes: the product name "MemoryMap AI" or "MemoryMap" as a word in
copy, titles, prompts, help, docs and the Pages site; the GitHub repo and
Pages URLs (to `--repo-url`, the renamed repo by default).

What it keeps, by rule rather than by list where it can:
- a name glued to a path, an extension or an identifier (`dist/MemoryMap AI`,
  `MemoryMap AI.exe`, `restartMemoryMap`, `X-MemoryMap-Agent`,
  `MemoryMap-AI-Setup-`): files, folders and wire names that installed copies
  still look for; the internal identifiers move separately, with fallbacks;
- "formerly MemoryMap ..." mentions;
- in the roadmap docs, CLAUDE.md and IDEAS.md, anything in double quotes
  (the owner's words are quoted there);
- a line carrying `brand: keep`, or the line after one carrying
  `brand: keep-next` (a data folder, a certificate subject, a stored value);
- whole files that are records: past CHANGELOG entries, HISTORY, archived
  ledgers, the owner's typo fixtures, running agents' ledgers;
- icons and logos (a separate logo pass follows once the owner picks a mark).
"""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
NEW = "Tessellate"
OLD_REPO = "Braydenh563/MemoryMap-AI"
DEFAULT_REPO = "Braydenh563/Tessellate"

SKIP_FILES = {
    "CHANGELOG.md",
    "docs/CHANGELOG.md",
    "docs/roadmap/HISTORY.md",
    "scripts/rebrand.py",
    "tests/test_brand_name.py",
    "tests/fixtures/owner_typos.json",
}
SKIP_PREFIXES = (
    "docs/roadmap/archive/",
    "docs/roadmap/agent-remaining/",
    "frontend/vendor/",
    "frontend/board-library/",
    "scratchpad/",
)
#: Where the owner's words are quoted inline: quoted spans stay as written.
QUOTE_KEPT = ("docs/roadmap/", "CLAUDE.md", "IDEAS.md")
TEXT_SUFFIXES = {
    ".md", ".html", ".js", ".mjs", ".css", ".py", ".sh", ".bat", ".cmd", ".ps1",
    ".iss", ".wxs", ".spec", ".yml", ".yaml", ".toml", ".txt", ".desktop",
    ".plist", ".xml", ".webmanifest", ".ini", ".cfg", ".in", ".json", ".j2",
}
TEXT_NAMES = {"Makefile", "Dockerfile", "README", "LICENSE"}

NAME = re.compile(r"MemoryMap(?:(?: |&nbsp;|\u00a0|\n *(?:[#;*/-]+ *)?)AI\b)?")
ESCAPED = re.compile(r"(?:\\[nt]|\[[0-9;]*m)$")
QUOTED = re.compile(r"\"[^\"\n]{0,1200}(?:\n[^\"\n]{0,1200}){0,12}\"|“[^”]{0,4000}”")


def _protected_spans(text: str, quotes_kept: bool) -> list[tuple[int, int]]:
    spans: list[tuple[int, int]] = []
    if quotes_kept:
        spans += [m.span() for m in QUOTED.finditer(text)]
    lines = text.splitlines(keepends=True)
    pos, keep_next = 0, False
    for line in lines:
        if keep_next or "brand: keep" in line and "brand: keep-next" not in line:
            spans.append((pos, pos + len(line)))
        keep_next = "brand: keep-next" in line
        pos += len(line)
    return spans


def _glued(text: str, start: int, end: int) -> bool:
    """A name that is part of a path, a file, a header or an identifier."""
    before = text[start - 1] if start else ""
    after = text[end : end + 3]
    if before and (before.isalnum() or before in "_/\\.-$"):
        # "\nMemoryMap has stopped", "[1;38;5;73mMemoryMap": an escape, not a word.
        return not ESCAPED.search(text[max(0, start - 16) : start])
    if after[:1].isalnum() or after[:1] in "_/\\":
        return True
    if after.startswith("-AI") or after.startswith("-Agent"):
        return True
    # MemoryMap AI.exe, MemoryMap AI.lnk: a file; "MemoryMap." ends a sentence.
    return after[:1] == "." and after[1:2].isalnum()


def _formerly(text: str, start: int) -> bool:
    return text[max(0, start - 12) : start].lower().rstrip(" (").endswith("formerly")


def rebrand_text(text: str, quotes_kept: bool, repo: str = DEFAULT_REPO) -> tuple[str, int]:
    spans = _protected_spans(text, quotes_kept)

    def inside(i: int) -> bool:
        return any(a <= i < b for a, b in spans)

    out, last, count = [], 0, 0
    for m in NAME.finditer(text):
        s, e = m.span()
        if inside(s) or _glued(text, s, e) or _formerly(text, s):
            continue
        out.append(text[last:s])
        out.append(NEW)
        last = e
        count += 1
    out.append(text[last:])
    text = "".join(out)
    if repo != OLD_REPO:
        owner, name = repo.split("/", 1)
        old_pages = f"{OLD_REPO.split('/')[0].lower()}.github.io/{OLD_REPO.split('/')[1]}"
        new_pages = f"{owner.lower()}.github.io/{name}"
        # The owner/name slug only ever names the repo: github.com, the API,
        # raw files, badges.
        for old, new in ((OLD_REPO, repo), (old_pages, new_pages)):
            pieces = text.split(old)
            if len(pieces) > 1:
                rebuilt = [pieces[0]]
                pos = len(pieces[0])
                for piece in pieces[1:]:
                    if inside(pos):
                        rebuilt.append(old)
                    else:
                        rebuilt.append(new)
                        count += 1
                    rebuilt.append(piece)
                    pos += len(old) + len(piece)
                text = "".join(rebuilt)
    return text, count


def _quotes_kept(path: Path) -> bool:
    rel = path.relative_to(ROOT).as_posix()
    return path.suffix.lower() == ".md" and rel.startswith(QUOTE_KEPT)


def _read(path: Path) -> str:
    # newline="": a .bat keeps its CRLF; cmd.exe misreads labels without it.
    with open(path, encoding="utf-8", newline="") as handle:
        return handle.read()


def candidate_files() -> list[Path]:
    listed = subprocess.run(["git", "ls-files", "-z"], cwd=ROOT, capture_output=True, check=True).stdout
    files = []
    for raw in listed.split(b"\0"):
        rel = raw.decode("utf-8", "replace")
        if not rel or rel in SKIP_FILES or rel.startswith(SKIP_PREFIXES):
            continue
        path = ROOT / rel
        if path.suffix.lower() == ".svg":  # logos and icons wait for the logo pass
            continue
        if path.suffix.lower() in TEXT_SUFFIXES or path.name in TEXT_NAMES:
            files.append(path)
    return files


def pending(repo: str = DEFAULT_REPO) -> dict[str, int]:
    """File -> replacements still to make; empty when the rename is complete."""
    found: dict[str, int] = {}
    for path in candidate_files():
        try:
            text = _read(path)
        except (UnicodeDecodeError, FileNotFoundError):
            continue
        if "MemoryMap" not in text:
            continue
        _, count = rebrand_text(text, _quotes_kept(path), repo)
        if count:
            found[path.relative_to(ROOT).as_posix()] = count
    return found


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--check", action="store_true", help="change nothing; exit 1 if anything is left")
    parser.add_argument("--repo-url", default=DEFAULT_REPO, help="owner/name of the GitHub repo")
    args = parser.parse_args(argv)
    total = 0
    for rel, count in sorted(pending(args.repo_url).items()):
        total += count
        print(f"{count:5d}  {rel}")
        if not args.check:
            path = ROOT / rel
            new, _ = rebrand_text(_read(path), _quotes_kept(path), args.repo_url)
            with open(path, "w", encoding="utf-8", newline="") as handle:
                handle.write(new)
    verb = "left" if args.check else "changed"
    print(f"{total} {verb}")
    return 1 if args.check and total else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
