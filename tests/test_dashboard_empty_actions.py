"""A dashboard widget's empty state is one sentence and one action (INBOX 464 (12)).

Measured on a seeded notebook before: eleven widgets (Favourites, Most used,
Most-linked, Top tags, Recent questions, On this day, Reminders, Tag cloud,
Boards & maps, Bookmarks, Unfinished) drew a sentence and nothing to press;
Reminders said "add one in the Reminders tab". DESIGN.md's recipe is
`.empty-state` with one sentence and one action. Every empty widget goes
through `dashEmpty(body, text, action)`, the action names a run the delegated
`[data-empty-action]` listener (navigation.js) knows, and `null` is an
explicit "nothing to do here" rather than a forgotten argument.
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JS = ROOT / "frontend" / "js"
DASH = (JS / "dashboard.js").read_text(encoding="utf-8")
NAV = (JS / "navigation.js").read_text(encoding="utf-8")


def _calls(src: str, name: str) -> list[list[str]]:
    """Each call of `name(...)`, split into its top-level arguments."""
    out = []
    for m in re.finditer(r"(?<![\w.])" + re.escape(name) + r"\(", src):
        if src[max(0, m.start() - 9):m.start()].endswith("function "):
            continue
        i, depth, args, cur, quote = m.end(), 1, [], "", None
        while depth:
            c = src[i]
            if quote:
                cur += c
                if c == "\\":
                    cur += src[i + 1]
                    i += 1
                elif c == quote:
                    quote = None
            elif c in "\"'`":
                quote = c
                cur += c
            elif c in "([{":
                depth += 1
                cur += c
            elif c in ")]}":
                depth -= 1
                if depth:
                    cur += c
            elif c == "," and depth == 1:
                args.append(cur.strip())
                cur = ""
            else:
                cur += c
            i += 1
        if cur.strip():
            args.append(cur.strip())
        out.append(args)
    return out


def test_no_widget_body_is_a_bare_sentence():
    # The two shapes the eleven used: a muted <p> or the body's own text.
    # ("Couldn't load ..." is a failure, not an empty state.)
    assert not re.search(r"body\.textContent\s*=\s*\"(?!Couldn)", DASH)
    assert "add one in the Reminders tab" not in DASH


def test_every_dash_empty_names_its_action():
    calls = _calls(DASH, "dashEmpty")
    assert len(calls) >= 12
    for args in calls:
        assert len(args) == 3, f"dashEmpty without an action: {args}"


def test_every_mini_entry_list_with_a_sentence_names_its_action():
    for args in _calls(DASH, "miniEntryList"):
        if len(args) >= 3 and args[2] not in ('""', "''"):
            assert len(args) == 4, f"miniEntryList without an action: {args}"


def test_every_run_named_is_one_the_listener_knows():
    runs = set(re.findall(r'run:\s*"([a-z-]+)"', DASH))
    assert runs, "no actions found"
    handled = set(re.findall(r'action === "([a-z-]+)"', NAV))
    assert runs <= handled, f"runs nobody handles: {sorted(runs - handled)}"


def test_the_listener_goes_to_the_actions_tab_first():
    block = NAV[NAV.index('closest("[data-empty-action]")'):][:2500]
    assert "emptyTab" in block and "switchTab" in block
    assert "emptySub" in block
