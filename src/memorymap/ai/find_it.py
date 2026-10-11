"""Where is it: "where is the bin", "I can't find backups", "how do I get to
dark mode" answered with the place and a link that opens it and rings the
control (the owner, 2026-10-11: "It should be able to produce nav links if
the user can't find smth").

The places are the app's own: every row of Tools and features
(`frontend/js/app-features.js`, a name, one line and the `revealFeature` key
that lands on it) and the Settings sections (`index.html`), read once, so a
row added there is findable here with no second list. The link is the Ask
box's one acting offer (`digestOffer`, decision 70), `surface` set to
`reveal:<key>[:<arg>]`, `tab:<tab>` or `settings:<section>`.

Words a person says for a place that its row does not ("trash", "dark
mode") are `ALIASES`, keyed by the row's reveal key.
"""

from __future__ import annotations

import re
import sys
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

#: A question that asks where a place is, or says it cannot be found. The
#: rest of the sentence after the frame is the place.
_ASKED = re.compile(
    r"^\s*(?:(?:hey|hi|ok|okay|so|um|please|atlas)\W+)*(?:"
    r"where(?:'s|s| is| are| was| were| would i find| do i find| can i find| do i get| can i get| did| has| have| abouts| about| do i see| can i see| do i| can i| in the app is)?"
    r"|whereabouts(?: is| are)?"
    r"|(?:i )?(?:can'?t|cannot|cant|can not|couldn'?t|could not|don'?t|dont) (?:find|see|locate|get to|spot|work out where|figure out where|seem to find)"
    r"|(?:i'?m |im )?(?:looking|searching) for"
    r"|how (?:do|can|would|should) (?:i|you|we) (?:get to|find|reach|go to|navigate to|get into|open up|locate)"
    r"|how to (?:get to|find|reach|open)"
    r"|take me to|bring me to|show me where|show me how to get to|point me to"
    r"|which (?:tab|menu|page|setting|button|panel|screen|section) (?:is|has|holds|opens|shows|do i use for)"
    r")\b\s*",
    re.I,
)

#: Words around a place's name that are not the place.
_FILLER = re.compile(
    r"\b(?:the|my|a|an|that|this|those|these|is|are|was|go|gone|went|now|again|anymore|any more|"
    r"in the app|in this app|on here|in here|at all|thing|things|option|options|button|buttons|"
    r"setting|settings for|feature|control|controls|menu for|panel for|page for|tab for|screen for|"
    r"where|to|of|please|for me|i|it|at|hiding|hidden|located|kept|live|lives)\b",
    re.I,
)

#: The words people say for a place that its own row does not, by its
#: reveal key (or `tab:x`, `settings:x`), one phrase between commas.
ALIASES: dict[str, str] = {
    "recycle-bin": "recycle bin, trash, rubbish, deleted notes, deleted things, deleted stuff, restore deleted, wastebasket, bin",
    "set-theme": "dark mode, light mode, night mode, theme, dark theme, light theme",
    "set-accent": "accent colour, highlight colour, accent",
    "set-typography": "font size, text size, font, fonts, bigger text, density, spacing",
    "set-radius": "corners, rounded corners, blur, glass",
    "set-background": "background, wallpaper, animated background",
    "set-contrast": "high contrast, reduce motion, accessibility",
    "set-custom-css": "css, stylesheet",
    "set-backups": "backup, backups, back up, snapshot, restore a backup",
    "set-export": "export, download my notes, download everything, export my notes",
    "set-import-md": "import, obsidian, vault, markdown import, import notes",
    "set-updates": "update, updates, version, check for updates",
    "set-search-relevance": "search strictness, relevance",
    "settings:models": "model, models, ai model, llm, ollama, chat model, language model",
    "settings:account": "password, change password, account, security",
    "settings:tasks": "background jobs, jobs, tasks",
    "settings:privacy": "privacy, connections",
    "settings:logs": "logs, log, error log",
    "settings:memory": "memory, what it remembers, what it knows about me, facts about me",
    "settings:personas": "persona, personas, voice, tone, coach",
    "settings:skills": "skills, skill",
    "settings:templates": "note templates",
    "settings:preferences": "profile, my name, avatar, profile picture",
    "settings:help": "help, manual, guide, documentation",
    "settings:extras": "packages, extras, add ons, addons, plugins",
    "settings:tools": "permissions, tool permissions, tools it can use",
    "settings:websearch": "web search settings",
    "settings:learned": "what it learned, corrections",
    "tag-manager": "tags, tag manager, rename a tag, merge tags, remove a tag, manage tags",
    "notes-capture": "capture, capture box, new note, write a note, quick note, add a note",
    "notes-favourite": "star, pin, pinned notes, favourite, favourites, starred notes",
    "notes-private": "private, encrypt, lock a note, private notes",
    "notes-template": "note template",
    "reminder-magic": "new reminder, add a reminder, add reminder, magic add",
    "statistics": "stats, statistics, numbers",
    "palette": "command palette, palette, ctrl k, commands",
    "shortcuts": "hotkeys, keys, keyboard shortcuts, keybinds, shortcuts",
    "finder": "search everything, find anything, global search, search",
    "chat-conversations": "old chats, past chats, chat history, previous conversations, saved chats, conversations",
    "chat-input": "chat box, message box",
    "chat-agent-mode": "agent, agent mode",
    "chat-web-search": "web search, internet, search the web",
    "chat-export": "export a chat, download a chat, export chat",
    "chat-attach": "attach to chat, attach a file to a message",
    "doc-new": "new document, write a document, long document, documents",
    "doc-history": "version history, versions, document history, earlier versions",
    "doc-export": "export a document, print a document, pdf export",
    "doc-word-goal": "word count, word goal",
    "doc-find": "find and replace, replace",
    "board-new": "whiteboard, board, new board, canvas, boards",
    "map-create": "mind map, mindmap, new mind map, mind maps",
    "library-files": "files, pdfs, uploads, my files",
    "library-images": "images, pictures, photos",
    "library-links": "bookmarks, saved links",
    "library-docs": "my documents",
    "library-skills": "ai skills",
    "graph-physics": "physics, gravity, link force, sliders",
    "graph-edit": "edit on the graph, edit a note on the graph",
    "graph-suggest": "suggested links, link suggestions",
    "suggestions": "suggestions, suggestions inbox",
    "entities": "people, people and things, names",
    "workspace-new": "workspace, workspaces, new notebook",
    "dash-layout": "dashboard layout, widgets, rearrange dashboard",
    "widget-focus": "focus timer, pomodoro, timer",
    "widget-heatmap": "heatmap, activity heatmap",
    "widget-streak": "streak, streaks",
    "recordings": "recordings, audio",
    "voice-note": "voice memo, voice note",
    "notes-dictation": "dictation, dictate",
    "page-reader": "ocr, scan, read text from a picture",
    "onboarding": "tour, welcome tour, intro",
    "agent-palette": "ask from anywhere",
    "notes-review": "filings to check",
    "tidy": "tidy, clean up",
    "tidy-duplicates": "duplicates, duplicate notes",
    "notes-checklist": "checklist, checklists, to do list, todo list",
    "notes-attach": "attach a file to a note",
    "sketch": "sketch, draw, drawing, sketch pad",
    "meeting-new": "meeting note, new meeting",
    "tab:library": "library",
    "tab:graph": "graph, map of notes, network",
    "tab:timeline": "timeline, calendar",
    "tab:reminders": "reminders",
    "tab:dashboard": "dashboard, home, home page",
    "tab:notes": "notes, my notes, notes tab",
    "tab:chat": "chat, chat tab",
    "settings": "settings, preferences, options",
}

#: Where a key with no tab of its own is, said after "It's in".
_PLACE_OF_PREFIX = (
    ("widget-", "the Dashboard"),
    ("dash-", "the Dashboard"),
    ("doc-new", "Library, Documents"),
    ("doc-templates", "Library, Documents"),
    ("doc-", "an open document"),
    ("board-new", "Library, Boards & maps"),
    ("map-create", "Library, Boards & maps"),
    ("board-", "an open board"),
    ("map-", "an open mind map"),
    ("notes-", "the Notes tab"),
    ("tidy", "the Notes tab"),
    ("library-", "the Library tab"),
    ("recycle-", "the Library tab"),
    ("chat-", "the Chat tab"),
    ("graph-", "the Graph tab"),
    ("timeline-", "the Timeline tab"),
    ("reminder-", "the Reminders tab"),
    ("set-theme", "Settings, Appearance"),
    ("set-accent", "Settings, Appearance"),
    ("set-typography", "Settings, Appearance"),
    ("set-radius", "Settings, Appearance"),
    ("set-background", "Settings, Appearance"),
    ("set-companion", "Settings, Appearance"),
    ("set-contrast", "Settings, Appearance"),
    ("set-custom-css", "Settings, Appearance"),
    ("set-search-relevance", "Settings, Search and index"),
    ("set-export", "Settings, Import & export"),
    ("set-import-md", "Settings, Import & export"),
    ("set-backups", "Settings, Import & export"),
    ("set-updates", "Settings, About"),
)

_TAB_NAMES = {"notes": "Notes", "library": "Library", "graph": "Graph", "timeline": "Timeline", "reminders": "Reminders",
              "dashboard": "Dashboard", "chat": "Chat"}

#: Words that say nothing about which place.
_STOP = frozenset("a an and the my your of to in on for with it its is are do does can i you me we our this that".split())

#: The least share of a question's place words a row must hold, and the
#: gap under the best at which a second row is also a fair reading (a tie,
#: asked about with a choice rather than guessed).
MIN_SCORE = 0.5
TIE_GAP = 0.12


@dataclass(frozen=True)
class Place:
    key: str  # the surface the offer opens: reveal:<key>[:<arg>], tab:<tab>, settings:<section>, settings
    name: str
    about: str
    where: str
    words: str  # the name and the aliases, one phrase between commas
    more: str  # the group and the line


def _frontend() -> Path | None:
    roots = [Path(__file__).resolve().parents[3]]
    if getattr(sys, "frozen", False):
        roots.insert(0, Path(getattr(sys, "_MEIPASS", Path(sys.executable).parent)))
    for root in roots:
        if (root / "frontend" / "js" / "app-features.js").is_file():
            return root / "frontend"
    return None


_ROW = re.compile(
    r'\{ name: "(?P<name>[^"]+)", desc: "(?P<desc>[^"]*)", '
    r'(?:reveal: "(?P<reveal>[^"]+)"(?:, arg: "(?P<arg>[^"]+)")?|tab: "(?P<tab>[a-z]+)")'
)
_GROUP = re.compile(r'\{ group: "([^"]+)"')
_SECTION = re.compile(r'data-section="([a-z]+)"[^>]*>([^<]+)</button>')


def _place_of(key: str, group: str) -> str:
    if key.startswith("settings:"):
        return ""
    for prefix, place in _PLACE_OF_PREFIX:
        if key.startswith(prefix):
            return place
    return {"Boards, maps & drawing": "Library, Boards & maps", "Make it yours": "Settings, Appearance"}.get(group, "")


def _row_place(m: re.Match, group: str, sections: dict[str, str]) -> tuple[str, str]:
    """A Tools and features row's key and where it is said to be."""
    if m.group("tab"):
        return f"tab:{m.group('tab')}", f"the {_TAB_NAMES.get(m.group('tab'), m.group('tab'))} tab"
    reveal = m.group("reveal")
    if reveal.startswith("settings:"):
        return f"settings:{reveal[9:]}", f"Settings, {sections.get(reveal[9:], m.group('name'))}"
    return f"reveal:{reveal}" + (f":{m.group('arg')}" if m.group("arg") else ""), _place_of(reveal, group)


@lru_cache(maxsize=1)
def places() -> tuple[Place, ...]:
    """Every place a person can be sent to: the Tools and features rows, the
    Settings sections and the tabs, each with where it is said to be."""
    root = _frontend()
    if root is None:
        return ()
    features = (root / "js" / "app-features.js").read_text(encoding="utf-8")
    sections = {m.group(1): m.group(2).replace("&amp;", "&").strip()
                for m in _SECTION.finditer((root / "index.html").read_text(encoding="utf-8"))}
    out: list[Place] = []
    seen: set[str] = set()
    groups = [(m.start(), m.group(1)) for m in _GROUP.finditer(features)]
    for m in _ROW.finditer(features):
        group = next((g for at, g in reversed(groups) if at < m.start()), "")
        key, where = _row_place(m, group, sections)
        if key in seen:
            continue
        seen.add(key)
        alias = ALIASES.get(key.removeprefix("reveal:").split(":")[0] if key.startswith("reveal:") else key, "")
        out.append(Place(key, m.group("name"), m.group("desc"), where, f"{m.group('name')}, {alias}", f"{group} {m.group('desc')}"))
    rest = [(f"settings:{section}", label, f"Settings, {label}", "settings") for section, label in sections.items()]
    rest += [(f"tab:{tab}", label, f"the {label} tab", "tab") for tab, label in _TAB_NAMES.items()]
    for key, label, where, more in rest:
        if key not in seen:
            seen.add(key)
            out.append(Place(key, label, "", where, f"{label}, {ALIASES.get(key, '')}", more))
    out.append(Place("settings", "Settings", "", "the gear at the top right", f"Settings, {ALIASES['settings']}", ""))
    return tuple(out)


def _stems(text: str) -> list[str]:
    from memorymap.ai import composer

    words = re.findall(r"[a-z0-9]+", text.lower().replace("&", " and "))
    return [composer._stem(w) for w in words if w not in _STOP]


@lru_cache(maxsize=1)
def _index() -> tuple[tuple[Place, frozenset, frozenset, tuple, frozenset], ...]:
    """Each place with its strong stems (name and aliases), weak stems (its
    group and line), the stem set of each of its phrases, and the stems of
    where it is ("graph" for the Graph tab's physics)."""
    rows = []
    for place in places():
        phrases = tuple(frozenset(_stems(p)) for p in place.words.split(",") if _stems(p))
        strong = frozenset().union(*phrases) if phrases else frozenset()
        home = frozenset(_stems(place.where)) - strong
        rows.append((place, strong, frozenset(_stems(place.more)) - strong - home, phrases, home))
    return tuple(rows)


@lru_cache(maxsize=1)
def _vocabulary() -> frozenset:
    return frozenset().union(*(strong | weak | home for _p, strong, weak, _ph, home in _index()))


_VERB = re.compile(r"^(?:i\s+)?(?:change|set|turn (?:on|off)|turn|switch(?: on| off)?|adjust|edit|use|open|get to|go to|make|see|manage)\s+", re.I)


@lru_cache(maxsize=1)
def _named() -> frozenset:
    return frozenset().union(*(strong for _p, strong, _w, _ph, _h in _index()))


def target(question: str, strip: bool = True) -> str | None:
    """The place `question` asks for, in its own words ("recycle bin" from
    "where did the recycle bin go?"), or None when it does not ask where.
    `strip` drops a leading verb ("change the model" is the model)."""
    text = " ".join((question or "").split()).rstrip("?!. ")
    m = _ASKED.match(text)
    if not m:
        return None
    rest = text[m.end():]
    #: "where do I change the model": the verb is what they will do there.
    rest = _VERB.sub("", rest) if strip else rest
    #: "the theme so I can change it": the place is before the reason, unless
    #: nothing is ("where to turn off animations").
    head = re.split(r"\b(?:so (?:i|that)|because|cause|cos|to (?:change|turn|set|make|see|use|add|do|get|edit))\b", rest, maxsplit=1, flags=re.I)[0]
    rest = head if _FILLER.sub(" ", head).strip() else rest
    rest = _FILLER.sub(" ", rest.replace("'s", ""))
    rest = " ".join(rest.split()).strip(" ,.?")
    if strip:
        #: "can't find where to turn off animations": the verb after the filler.
        rest = _VERB.sub("", rest)
    return rest or None


def _asked_stems(words: str) -> list[str]:
    """The stems of `words` as the app's vocabulary has them, or [] when a
    word is in no place at all."""
    asked = list(dict.fromkeys(_stems(words)))
    vocabulary = _vocabulary()
    #: "heat map" is the heatmap: two words that are one of the app's.
    for i in range(len(asked) - 1, 0, -1):
        if asked[i - 1] + asked[i] in _named():
            asked[i - 1:i + 1] = [asked[i - 1] + asked[i]]
    #: "animations" is the "animated" a row says: the same first six letters.
    asked = [s if s in vocabulary else next((v for v in sorted(vocabulary) if len(s) >= 6 and v[:6] == s[:6]), s) for s in asked]
    return [] if any(s not in vocabulary for s in asked) else asked


def _score(asked: list[str], wanted: frozenset, row: tuple) -> float:
    _place, strong, weak, phrases, home = row
    if wanted in phrases:
        return 2.0
    score = sum(1.0 if s in strong else 0.6 if s in home else 0.34 if s in weak else 0.0 for s in asked) / len(asked)
    #: A phrase holding all the words and little else is nearer than a row
    #: that holds them across its phrases.
    score += max((0.2 - 0.05 * len(p - wanted) for p in phrases if wanted <= p), default=0.0)
    return round(score, 3)


def find(words: str) -> list[tuple[float, Place]]:
    """The places `words` names, best first, each with its score. A place
    one of whose phrases is the words exactly scores 2; otherwise the share
    of the words its name or aliases hold (a word only in its line counts a
    third). Nothing when a word is in no place at all: "where is my coffee
    note" is a note to find, not a place."""
    asked = _asked_stems(words)
    if not asked:
        return []
    wanted = frozenset(asked)
    scored = [(_score(asked, wanted, row), row[0]) for row in _index() if wanted & row[1]]
    scored.sort(key=lambda pair: -pair[0])
    #: The same name twice (a catalogue row and its Settings section) is one place.
    out, names = [], set()
    for score, place in scored:
        if place.name.lower() not in names:
            names.add(place.name.lower())
            out.append((score, place))
    return out


def link_label(place: Place) -> str:
    return f"Show me {place.name}"


def _close(found: list[tuple[float, Place]]) -> list[Place]:
    """The places near the top, at most three; one Settings section said
    twice is one."""
    best_score = found[0][0]
    close = [p for s, p in found if s >= MIN_SCORE and best_score - s <= TIE_GAP]
    if len(close) > 1 and close[0].where == close[1].where and close[0].key.split(":")[0] == close[1].key.split(":")[0] == "settings":
        close = close[:1]
    return close[:3]


def _one_place(place: Place) -> dict:
    """Where one place is, its line, and the link."""
    name = place.name if place.name[:1].isupper() else place.name.capitalize()
    line = place.about.rstrip(".") + "." if place.about else ""
    if place.key == "settings":
        lead = "Settings is the gear at the top right."
    elif place.where and name.lower() in place.where.lower():
        lead = f"It's in {place.where}."
    elif place.where:
        lead = f"You'll find {name} in {place.where}."
    else:
        #: "Manage tags: rename, merge ..."; a line that opens on a key
        #: ("Ctrl/⌘-K to run ...") keeps its capital.
        said = line[:1].lower() + line[1:] if re.match(r"[A-Z][a-z]+\b(?![/+-])", line) else line
        lead, line = (f"{name}: {said}" if line else f"{name}."), ""
    text = "\n\n".join(x for x in (lead, line, link_label(place)) if x)
    return {"text": text, "offer": {"kind": "open", "label": link_label(place), "surface": place.key}, "places": [place.key]}


def answer(question: str) -> dict | None:
    """{"text", "offer", "places"} for a where-is question with a place the
    app has, else None. One place: where it is, its line, and the link. Two
    near the top: both, as a choice."""
    from memorymap.ai import question_noise

    def best(text: str) -> list[tuple[float, Place]]:
        #: With its verb and without ("edit on the graph" is a place's name;
        #: "change the model" is the model): the reading that scores higher.
        readings = [find(w) for w in dict.fromkeys((target(text, strip=False), target(text))) if w]
        return max(readings, key=lambda r: r[0][0] if r else 0.0, default=[])

    found = best(question or "")
    if not found or found[0][0] < MIN_SCORE:
        #: A misspelt frame ("wher is") or place ("recylce bin"), read again.
        found = best(question_noise.repair(question or ""))
    if not found or found[0][0] < MIN_SCORE:
        return None
    close = _close(found)
    if len(close) == 1:
        return _one_place(close[0])
    names = [p.name for p in close]
    said = ", ".join(names[:-1]) + f" or {names[-1]}"
    labels = [link_label(p) for p in close]
    text = "\n\n".join([f"That could be {said}. Which one?", *labels])
    offers = [{"kind": "open", "label": link_label(p), "surface": p.key} for p in close]
    return {"text": text, "offer": {**offers[0], "also": offers[1:]}, "places": [p.key for p in close]}
