"""A shared helper lives in a file every caller is loaded after.

There is no bundler and no module system here: `index.html` lists the scripts
and the browser runs them in that order. A `function` declaration is hoisted
inside its own file only, so code that runs while the page is still loading can
reach helpers from a script that has already run, and nothing else.

The report this exists for, from the running app:

    ReferenceError: apiPagedList is not defined
        at loadCaptureDocuments (app.js:10059)
        at showNotesSection (app.js:25240)
        at initNotesSubtabs (app.js:25290)
        at app.js:32441

`apiPagedList` was defined in documents.js, which index.html loads ten lines
after app.js. Its own comment argued the placement was safe because "both call
it from inside a function body, so load order is satisfied either way": true
when it was written, false the moment app.js called it from boot code. The
Notes tab died before drawing anything, and no other test here could see it,
because a Python test cannot run the page and every call site reads as correct
on its own.

**What this checks, and what it does not.** Two cheap rules: a call written as
a statement in a script's own top-level code, and the placement of the helpers
that are shared widely enough for the question to arise at all. The general
version, following the call graph from every top-level statement, was written
and then cut: the walk has to know which bodies are callbacks (a body handed to
`addEventListener` runs later, not now), and getting that right without a
parser took longer to run than the whole lint set. `errors.js` in the sweeps
catches the runtime half by loading the page and reading the console, which is
how this one would have been caught before it shipped. Recorded in BACKLOG.
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FRONTEND = ROOT / "frontend"
INDEX = FRONTEND / "index.html"

#: Scripts that run before the app's own code and guard every cross-file call
#: they make (`typeof x === "function"`, `window.x?.()`). They are the boot
#: shims, and the guard is the point of them.
BOOT_SHIMS = {"boot-guard.js", "theme-boot.js"}

#: The bundles `ensureModule` fetches on the first visit to a tab that needs
#: them (WORLD_CLASS_PLAN row A1). They are not `<script>` tags in index.html
#: any more, but the rule this file exists for is unchanged for them: they run
#: after every script index.html lists, and inside a bundle they run in the
#: order the table gives, because `ensureModule` sets `async = false`. Reading
#: the table out of app.js rather than restating it here means a file moved
#: between bundles is checked in its new position on the next run.
LAZY_TABLE = re.compile(r"const LAZY_MODULES = \{(.*?)\n\};", re.S)


def _lazy_order() -> list[str]:
    app = (FRONTEND / "app.js").read_text(encoding="utf-8")
    table = LAZY_TABLE.search(app)
    assert table, "app.js has no LAZY_MODULES table; has the lazy loader moved?"
    names = [name for name in re.findall(r'"/([A-Za-z0-9_.-]+\.js)"', table.group(1))]
    assert names, "the LAZY_MODULES table lists no files"
    for name in names:
        assert (FRONTEND / name).exists(), f"LAZY_MODULES names {name}, which does not exist"
    return names


#: The stand-ins app.js installs for the lazy bundles' entry points. A name on
#: this table is bound by app.js's own top-level code (the loop under the
#: table replaces `window[name]` with a function that fetches the bundle and
#: then calls the real one), so for the purposes of the walk below it is
#: defined by app.js and not by the file it finally comes from.
ENTRY_POINT_TABLE = re.compile(r"const LAZY_ENTRY_POINTS = \{(.*?)\n\};", re.S)


def _stand_ins() -> set[str]:
    app = (FRONTEND / "app.js").read_text(encoding="utf-8")
    table = ENTRY_POINT_TABLE.search(app)
    assert table, "app.js has no LAZY_ENTRY_POINTS table; has the lazy loader moved?"
    names = set(re.findall(r'"([A-Za-z_$][\w$]*)"', table.group(1)))
    assert names, "the LAZY_ENTRY_POINTS table lists no names"
    return names


def _script_order() -> list[str]:
    html = INDEX.read_text(encoding="utf-8")
    names: list[str] = []
    for match in re.finditer(r'<script src="/([A-Za-z0-9_.-]+\.js)', html):
        name = match.group(1)
        if (FRONTEND / name).exists() and name not in names:
            names.append(name)
    assert names, "no local scripts found in index.html"
    for name in _lazy_order():
        if name not in names:
            names.append(name)
    return names


def _top_level(source: str) -> str:
    """Everything outside a top-level `function` declaration: the code that
    runs the moment the browser reaches the line."""
    out: list[str] = []
    depth = 0
    for line in source.split("\n"):
        stripped = line.strip()
        if depth == 0 and not stripped.startswith(("//", "/*", "*")):
            out.append(line)
        depth += line.count("{") - line.count("}")
        depth = max(depth, 0)
    return "\n".join(out)


STATEMENT_CALL = re.compile(r"^\s*(?:await\s+|void\s+)?([A-Za-z_$][\w$]*)\s*\(", re.M)
NOT_CALLS = {"if", "for", "while", "switch", "catch", "return", "typeof", "function"}


def test_no_script_calls_a_later_script_from_its_own_top_level():
    order = _script_order()
    sources = {name: (FRONTEND / name).read_text(encoding="utf-8") for name in order}
    defined_in: dict[str, str] = {}
    for name in order:
        for function in re.findall(r"^(?:async )?function ([A-Za-z_$][\w$]*)\(", sources[name], re.M):
            defined_in.setdefault(function, name)
    #: A lazy bundle's entry point is reachable from the moment app.js installs
    #: its stand-in, which is what that table is for, so the walk must read it
    #: as app.js's own. Without this the walk would report every one of them and
    #: the only way to quiet it would be to load the bundles at boot again.
    for function in _stand_ins():
        defined_in[function] = "app.js"

    problems = []
    for index, name in enumerate(order):
        if name in BOOT_SHIMS:
            continue
        already = set(order[: index + 1])
        called = {m.group(1) for m in STATEMENT_CALL.finditer(_top_level(sources[name]))} - NOT_CALLS
        for function in sorted(called):
            home = defined_in.get(function)
            if home and home not in already:
                problems.append(f"{name} calls {function}() at load, defined in {home}")

    assert not problems, (
        "these calls run while the page is loading and name a helper from a "
        "script that has not run yet, which is a ReferenceError in the browser "
        "and invisible to every other test here: " + "; ".join(problems)
    )


def test_the_paging_helper_is_reachable_from_the_script_that_boots_with_it():
    """The specific case, named, because the walk above only sees the direct
    call and this one arrived three frames deep: `initNotesSubtabs()` at the
    bottom of app.js, into `showNotesSection`, into `loadCaptureDocuments`.

    Six frontend files call `apiPagedList` now. The one they are all loaded
    after is app.js, so that is where it lives.
    """
    order = [name for name in _script_order() if name not in BOOT_SHIMS]
    callers = [
        name
        for name in order
        if re.search(r"(?<![\w$.])apiPagedList\s*\(", (FRONTEND / name).read_text(encoding="utf-8"))
    ]
    assert callers, "nothing calls apiPagedList any more; is it still needed?"
    home = [
        name
        for name in order
        if re.search(r"^(?:async )?function apiPagedList\(", (FRONTEND / name).read_text(encoding="utf-8"), re.M)
    ]
    assert len(home) == 1, f"apiPagedList is defined in {home}"
    assert order.index(home[0]) <= order.index(callers[0]), (
        f"apiPagedList lives in {home[0]}, which index.html loads after "
        f"{callers[0]}, and app.js reaches it from `initNotesSubtabs` at load"
    )


def test_every_lazy_name_app_js_reads_at_load_has_a_stand_in():
    """The rule that replaced the `<script>` order for the lazy bundles.

    graph.js used to be loaded *before* app.js, because app.js's own top-level
    wiring reads eight of its functions as bare identifiers
    (`addEventListener("click", closeGraphPopup)`), and a `function`
    declaration hoists inside its own script element only. Now that the bundle
    arrives on the first visit to the tab, those reads are ReferenceErrors
    unless app.js has bound the name itself first, which is what
    `LAZY_ENTRY_POINTS` does.

    So: every function a lazy bundle defines and app.js names anywhere in its
    own top-level code has to be on that table. This is the half
    `test_no_script_calls_a_later_script_from_its_own_top_level` above cannot
    see, because that one only looks at calls written as statements, and most
    of these are references handed to `addEventListener`.
    """
    lazy_files = _lazy_order()
    lazy_functions: dict[str, str] = {}
    for name in lazy_files:
        source = (FRONTEND / name).read_text(encoding="utf-8")
        for function in re.findall(r"^(?:async )?function ([A-Za-z_$][\w$]*)\(", source, re.M):
            lazy_functions.setdefault(function, name)

    app = (FRONTEND / "app.js").read_text(encoding="utf-8")
    #: app.js's own declarations win: a name it defines is its, and the install
    #: loop skips it for exactly that reason.
    own = set(re.findall(r"^(?:async )?function ([A-Za-z_$][\w$]*)\(", app, re.M))
    stand_ins = _stand_ins()

    missing: list[str] = []
    for line in _top_level(app).split("\n"):
        code = re.sub(r'"[^"]*"|\'[^\']*\'|`[^`]*`', '""', line).split("//")[0]
        for match in re.finditer(r"[A-Za-z_$][\w$]*", code):
            function = match.group(0)
            if match.start() and code[match.start() - 1] == ".":
                continue
            if function in own or function in stand_ins:
                continue
            if function in lazy_functions:
                missing.append(f"{function} ({lazy_functions[function]}), app.js: {line.strip()[:80]}")

    assert not missing, (
        "app.js names these lazily-loaded functions in its own top-level code "
        "but has no stand-in for them, so the name is undefined until the tab "
        "is opened: " + "; ".join(sorted(set(missing)))
    )


def test_the_stand_ins_name_functions_that_exist():
    """A stand-in for a name nothing defines is a control that silently does
    nothing: `ensureModule` resolves, the lookup finds the stand-in itself, and
    the call returns undefined. Renaming a function in a lazy file without
    touching the table is how that happens."""
    lazy_functions: set[str] = set()
    for name in _lazy_order():
        source = (FRONTEND / name).read_text(encoding="utf-8")
        lazy_functions.update(re.findall(r"^(?:async )?function ([A-Za-z_$][\w$]*)\(", source, re.M))
    orphans = sorted(_stand_ins() - lazy_functions)
    assert not orphans, (
        "LAZY_ENTRY_POINTS names these, which no lazily-loaded file defines: " + ", ".join(orphans)
    )


def test_lazy_bundles_do_not_wait_for_domcontentloaded():
    """A file `ensureModule` inserts on first use arrives long after
    `DOMContentLoaded` fired, so a listener on that event never runs. Seven
    of library.js's top-level wirings were wrapped that way and every Library
    sub-tab lost its click handler the day the bundle went lazy. Lazy files
    wire through `onDomReady` (app.js), which runs at once when the document
    is already parsed."""
    for file in _lazy_order():
        text = (FRONTEND / file).read_text(encoding="utf-8")
        assert 'addEventListener("DOMContentLoaded"' not in text, (
            f"{file} waits for DOMContentLoaded; use onDomReady() so it wires when loaded on demand"
        )
