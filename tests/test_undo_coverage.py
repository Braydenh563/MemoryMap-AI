"""Rule 1.8 coverage: every call that writes user data offers Undo (INBOX 898).

`test_undo_contract.py` only holds functions *named* undo to the contract, so
a delete, rename, move or tag change that never calls `pushUndo` passed. This
reads every `api(`/`apiJson(`/`fetch(` call in `frontend/js/*.js` whose
options carry a method other than GET, finds the function it sits in (and the
functions around it, up to the first named one) and asks whether that code
reaches the contract: `pushUndo`/`offerUndo`, a helper whose name says undo and
calls them (`offerCategoryUndo`, `chatTitleUndo`, `pushEntryPutUndo`...), or
a surface's own history (`wbPushUndo`, `docUndo`). A call also counts when it
is an argument of such a call (the inverse closure handed to `pushUndo`), when
its function is one of the inverse closures (`undo`, `redo`, `back`...) of a
covered owner, or when every caller of a small helper is covered.

`EXEMPT` is the ratchet: `"file:function": "reason"`. It may only shrink. A
reason starts with a class: `auth`, `read`, `send`, `settings` (has its own
Reset or history), `telemetry`, `job` (starts or stops work, deletes nothing),
`inverse` (is the undo or redo of an act that offers one), `board` (the
board's own history, reached by Ctrl+Z on an open board), `purge` (permanent
by design, behind a confirm that says so) or `GAP` (a user
data write with no undo yet; each is a line in
`docs/roadmap/agent-remaining/undoall-1011.md`). Fixing a function removes its
line; the test also fails on a line that is no longer needed.

Set `UNDO_COVERAGE_DUMP=1` to print what is uncovered.
"""

from __future__ import annotations

import bisect
import collections
import os
import re
from functools import lru_cache
from pathlib import Path

JS = Path(__file__).resolve().parents[1] / "frontend" / "js"

#: What the contract is, and the surface histories that stand in for it.
SEEDS = {
    "pushUndo", "offerUndo", "settleUndoFromToast", "performUndo",
    "docUndo", "wbUndo", "wbPushUndo", "wbPushDragUndo", "wbPushMoveBatch", "wbPushCall",
    #: Chat loads its helpers (chat-undo.js) on the first write and names one.
    "chatWriteRecord",
    #: Takes an act and its inverse and puts the step on the stack (skills.js).
    "batchEach",
}
#: Whole acts that do their write and put the step on the stack themselves, so
#: a caller that hands them the work is covered.
WRAPPERS = {"toastEntityMerge", "graphRemoveLink"}
#: Closures that are the inverse of an act, named for it. They take the
#: coverage of the function that owns them.
INVERSE_NAMES = {
    "undo", "redo", "back", "again", "remake", "restoreIt", "binIt", "rebin",
    "restoreThem", "binThem", "drop", "restoreAll", "binAll", "restore",
}
NOT_FUNCTION = {
    "if", "for", "while", "switch", "catch", "with", "return", "typeof", "else",
    "do", "try", "finally", "in", "of", "new", "await", "void", "delete",
    "throw", "case", "yield",
}
CALL = re.compile(r"\b(?:api\.upload|api\.stream|apiJson|api|fetch)\(")
CALLID = re.compile(r"\b([A-Za-z_$][\w$]*)\(")
METHOD = re.compile(r"\bmethod\s*:\s*([^,}\n]+)")


def mask(src: str) -> str:
    """`src` with comments, strings, template text and regex bodies blanked.

    Same length, newlines kept, so offsets and line numbers still line up.
    Code inside a template's `${...}` stays visible.
    """
    n = len(src)
    out = list(src)

    def blank(a: int, b: int) -> None:
        for k in range(a, b):
            if out[k] != "\n":
                out[k] = " "

    def code(i: int, until_brace: bool) -> int:
        depth = 0
        prev = ""
        while i < n:
            c = src[i]
            nx = src[i + 1] if i + 1 < n else ""
            if c == "/" and nx == "/":
                j = src.find("\n", i)
                j = n if j < 0 else j
                blank(i, j)
                i = j
                continue
            if c == "/" and nx == "*":
                j = src.find("*/", i + 2)
                j = n if j < 0 else j + 2
                blank(i, j)
                i = j
                continue
            if c in "\"'":
                j = i + 1
                while j < n and src[j] != c and src[j] != "\n":
                    j += 2 if src[j] == "\\" else 1
                blank(i + 1, j)
                i = j + 1
                prev = c
                continue
            if c == "`":
                i = template(i + 1)
                prev = "`"
                continue
            if c == "/" and (prev == "" or prev in "(,=:[!&|?{};+-*%<>~^"):
                j = i + 1
                in_class = False
                while j < n and src[j] != "\n":
                    if src[j] == "\\":
                        j += 2
                        continue
                    if src[j] == "[":
                        in_class = True
                    elif src[j] == "]":
                        in_class = False
                    elif src[j] == "/" and not in_class:
                        break
                    j += 1
                if j < n and src[j] == "/":
                    blank(i + 1, j)
                    i = j + 1
                    prev = "/"
                    continue
            if c == "{":
                depth += 1
            elif c == "}":
                if until_brace and depth == 0:
                    return i + 1
                depth -= 1
            if not c.isspace():
                prev = c
            i += 1
        return i

    def template(i: int) -> int:
        start = i
        while i < n:
            c = src[i]
            if c == "\\":
                blank(i, i + 2)
                i += 2
                continue
            if c == "`":
                blank(start, i)
                return i + 1
            if c == "$" and i + 1 < n and src[i + 1] == "{":
                blank(start, i)
                i = code(i + 2, True)
                start = i
                continue
            i += 1
        return i

    code(0, False)
    return "".join(out)


def _open_of(m: str, close: int) -> int:
    depth = 0
    for i in range(close, -1, -1):
        if m[i] == ")":
            depth += 1
        elif m[i] == "(":
            depth -= 1
            if depth == 0:
                return i
    return -1


def _word_before(m: str, k: int) -> tuple[str, int]:
    while k >= 0 and m[k].isspace():
        k -= 1
    e = k + 1
    while k >= 0 and (m[k].isalnum() or m[k] in "_$"):
        k -= 1
    return m[k + 1:e], k


def functions(m: str) -> list[tuple[int, int, str | None]]:
    """(open brace, close brace, name or None) of every braced function body."""
    stack: list[int] = []
    found = []
    for i, c in enumerate(m):
        if c == "{":
            stack.append(i)
            continue
        if c != "}" or not stack:
            continue
        b = stack.pop()
        j = b - 1
        while j >= 0 and m[j].isspace():
            j -= 1
        name = None
        is_fn = False
        if j >= 1 and m[j - 1:j + 1] == "=>":
            is_fn = True
            k = j - 2
            while k >= 0 and m[k].isspace():
                k -= 1
            if k >= 0 and m[k] == ")":
                k = _open_of(m, k) - 1
            else:
                _, k = _word_before(m, k)
            while k >= 0 and m[k].isspace():
                k -= 1
            if k >= 4 and m[k - 4:k + 1] == "async":
                k -= 5
            while k >= 0 and m[k].isspace():
                k -= 1
            if k >= 0 and m[k] in "=:":
                name, _ = _word_before(m, k - 1)
        elif j >= 0 and m[j] == ")":
            ident, _ = _word_before(m, _open_of(m, j) - 1)
            if ident == "function":
                is_fn = True
            elif ident and ident not in NOT_FUNCTION and not ident[0].isdigit():
                is_fn = True
                name = ident
        if is_fn:
            found.append((b, i, name or None))
    found.sort(key=lambda f: (f[0], -f[1]))
    return found


def _direct_ids(m: str, f, funcs) -> set[str]:
    """Names called in `f` outside the functions nested inside it."""
    b, e, _ = f
    inner = sorted(g for g in funcs if g is not f and b < g[0] and g[1] < e)
    ids: set[str] = set()
    pos = b
    for g in inner:
        if g[0] >= pos:
            ids.update(CALLID.findall(m[pos:g[0]]))
            pos = g[1]
    ids.update(CALLID.findall(m[pos:e]))
    return ids


def _statement_end(m: str, start: int) -> int:
    """Where the statement that holds `start` ends: a `;` at its own depth."""
    depth = 0
    for i in range(start, len(m)):
        c = m[i]
        if c in "([{":
            depth += 1
        elif c in ")]}":
            depth -= 1
            if depth < 0:
                return i
        elif c == ";" and depth == 0:
            return i
    return len(m)


def _call_end(m: str, start: int) -> int:
    depth, i = 1, start
    while i < len(m) and depth:
        if m[i] == "(":
            depth += 1
        elif m[i] == ")":
            depth -= 1
        i += 1
    return i


def _parents(funcs) -> list[int]:
    """Index of each function's enclosing function (-1 at the top)."""
    parent, stack = [], []
    for idx, f in enumerate(funcs):
        while stack and funcs[stack[-1]][1] < f[0]:
            stack.pop()
        parent.append(stack[-1] if stack else -1)
        stack.append(idx)
    return parent


@lru_cache(maxsize=1)
def analyse():
    """(sites, helpers). A site is (file, function, line, method, covered)."""
    files = {}
    for path in sorted(JS.glob("*.js")):
        src = path.read_text(encoding="utf-8")
        m = mask(src)
        funcs = functions(m)
        files[path.name] = (src, m, funcs, _parents(funcs), [f[0] for f in funcs])
    direct = {}
    by_name: dict[str, set[str]] = collections.defaultdict(set)
    for fn, (src, m, funcs, _, _) in files.items():
        for f in funcs:
            ids = _direct_ids(m, f, funcs)
            direct[(fn, f[0])] = ids
            if f[2]:
                by_name[f[2]] |= ids
    helpers = set(SEEDS)
    #: A function named for an undo that puts the step on the stack itself.
    for fn, (_, _, funcs, parent, _) in files.items():
        for f in funcs:
            if f[2] and "ndo" in f[2] and direct[(fn, f[0])] & SEEDS:
                helpers.add(f[2])
    helpers |= WRAPPERS
    helper_call = re.compile(r"\b(" + "|".join(sorted(map(re.escape, helpers))) + r")\(")

    def chain_of(fn, pos):
        _, _, funcs, parent, starts = files[fn]
        i = bisect.bisect_left(starts, pos) - 1
        while i >= 0 and not (funcs[i][0] < pos < funcs[i][1]):
            i = parent[i] if i >= 0 else -1
            if i < 0:
                break
        out = []
        while i >= 0:
            out.append(funcs[i])
            i = parent[i]
        return out

    #: Where each helper call's arguments end, so "inside `pushUndo(...)`" is a lookup.
    arg_spans: dict[str, list[tuple[int, int]]] = {}
    for fn, (src, m, *_rest) in files.items():
        arg_spans[fn] = [(c.end(), _call_end(m, c.end())) for c in helper_call.finditer(m)]

    def inside_helper_call(fn, pos):
        return any(a <= pos < b for a, b in arg_spans[fn])

    def in_same_statement(fn, pos):
        """`api(...).then((r) => { pushUndo(...) })`: the contract in a callback of the call's own chain."""
        m = files[fn][1]
        end = min(_statement_end(m, pos), pos + 1500)
        return any(pos <= a <= end for a, _ in arg_spans[fn])

    def reaches(fn, pos, strict=False):
        """Does the code around `pos`, up to its first real function, reach the contract?

        `strict` (a helper's caller) looks only at the function the use sits in:
        a big builder that offers an undo for one thing must not excuse every
        other thing it wires.
        """
        if inside_helper_call(fn, pos) or (not strict and in_same_statement(fn, pos)):
            return True
        if strict:
            #: Near, and in the same function: the contract call follows the use
            #: within a screenful, the way `await put(x); offerUndo(...)` does.
            inner = next(iter(chain_of(fn, pos)), None)
            lo, hi = (inner[0], inner[1]) if inner else (0, len(files[fn][1]))
            return any(
                max(lo, pos - 200) <= a <= min(hi, pos + 1200) for a, _ in arg_spans[fn]
            )
        for f in chain_of(fn, pos):
            if direct[(fn, f[0])] & helpers:
                return True
            if f[2] and f[2] not in INVERSE_NAMES:
                return False
        return False

    # Raw call sites first; the helper-callers rule needs every use of a name.
    raw = []
    for fn, (src, m, *_rest) in files.items():
        for c in CALL.finditer(m):
            end = _call_end(m, c.end())
            if c.group(0).startswith("api.upload"):
                value = '"POST"'  # api.upload is a POST by definition (app.js)
            else:
                mm = METHOD.search(src, c.end(), end)
                if not mm:
                    continue
                value = mm.group(1).strip()
            if value in ('"GET"', "'GET'"):
                continue
            funcs = files[fn][2]
            chain = [funcs.index(f) for f in chain_of(fn, c.start())]
            owner_i = next((i for i in chain if funcs[i][2]), None)
            named_i = next((i for i in chain if funcs[i][2] and funcs[i][2] not in INVERSE_NAMES), None)
            #: Or the step is pushed in a callback a screenful further down the
            #: same function: `send(x).then(() => pushUndo(...))`.
            near = next(iter(chain_of(fn, c.start())), None)
            hi = near[1] if near else len(m)
            ahead = any(c.start() <= a <= min(hi, c.start() + 1000) for a, _ in arg_spans[fn])
            raw.append((fn, c.start(), named_i, owner_i, value, reaches(fn, c.start()) or ahead))

    #: Where each name is written, for the helper-callers rule below.
    wanted = {files[r[0]][2][r[2]][2] for r in raw if r[2] is not None and not r[5]}
    ident = re.compile(r"(?<![\w$.])([A-Za-z_$][\w$]*)\b(?!\s*:)")
    where: dict[str, dict[str, list[int]]] = {}
    for fn, (src, m, *_rest) in files.items():
        found = collections.defaultdict(list)
        for hit in ident.finditer(m):
            if hit.group(1) in wanted:
                before = m[max(0, hit.start() - 9):hit.start()]
                if not before.endswith(("function ", "function*", "const ", "let ", "var ")):
                    found[hit.group(1)].append(hit.start())
        where[fn] = found
    callers_ok: dict[tuple[str, int], bool] = {}

    def all_callers_reach(fn, fi):
        """Every use of this helper sits in code that reaches the contract.

        A helper nested in another function is only visible there, so only
        that function's text is searched; a top-level one is a global.
        """
        key = (fn, fi)
        if key not in callers_ok:
            funcs, parent = files[fn][2], files[fn][3]
            name = funcs[fi][2]
            if parent[fi] == -1:
                hits = [(f, p) for f, found in where.items() for p in found.get(name, [])]
            else:
                lo, hi = funcs[parent[fi]][0], funcs[parent[fi]][1]
                hits = [(fn, p) for p in where[fn].get(name, []) if lo < p < hi]
            callers_ok[key] = bool(hits) and all(reaches(f, p, strict=True) for f, p in hits)
        return callers_ok[key]

    sites = []
    for fn, pos, named_i, owner_i, value, covered in raw:
        funcs = files[fn][2]
        if not covered and named_i is not None and all_callers_reach(fn, named_i):
            covered = True
        name = funcs[named_i][2] if named_i is not None else funcs[owner_i][2] if owner_i is not None else None
        if name is None:
            #: A handler with no name of its own is told apart by what it calls.
            first = re.sub(r"\s+", " ", files[fn][0][pos:pos + 80].split(",")[0].split("(", 1)[-1]).strip(" \"'`")
            name = f"(anonymous {first[:36]})"
        sites.append((fn, name, files[fn][0].count("\n", 0, pos) + 1, value[:40], covered))
    return sites, helpers


def uncovered() -> dict[str, list[int]]:
    sites, _ = analyse()
    out: dict[str, list[int]] = collections.defaultdict(list)
    for fn, name, line, _, covered in sites:
        if not covered:
            out[f"{fn}:{name}"].append(line)
    return dict(out)


EXEMPT: dict[str, str] = {
    "wiring.js:(anonymous /preferences)": "settings: a setting with its own Reset or the settings history",
    "wiring.js:(anonymous /graph/unpin-all)": "settings: the map's pinned positions are view state; pinning again is the way back",
    "usage-ledger.js:(anonymous /usage)": "telemetry: telemetry or a background warm-up; no user data",
    "status.js:(anonymous /preferences)": "settings: a setting with its own Reset or the settings history",
    "settings.js:(anonymous /models/sampling)": "settings: a setting with its own Reset or the settings history",
    "settings.js:(anonymous /debug/health/integrity)": "telemetry: telemetry or a background warm-up; no user data",
    "settings-data.js:(anonymous /suggestions/dismissed/clear)": "settings: clears the dismissed-suggestions list, a preference",
    "settings-controls.js:(anonymous /websearch/searxng/stop)": "job: starts or stops work or a model; deletes no user data",
    "settings-controls.js:(anonymous /websearch/searxng/start)": "job: starts or stops work or a model; deletes no user data",
    "settings-controls.js:(anonymous /websearch/searxng/reinstall)": "job: starts or stops work or a model; deletes no user data",
    "settings-controls.js:(anonymous /websearch/detect-searxng${query})": "job: starts or stops work or a model; deletes no user data",
    "settings-controls.js:(anonymous /templates/draft)": "read: asks the model to draft a template, shown for review",
    "settings-controls.js:(anonymous /tasks/trigger-autonomous)": "job: starts a background pass",
    "settings-controls.js:(anonymous /tasks/history/clear)": "telemetry: clears the list of finished background tasks",
    "settings-controls.js:(anonymous /tasks/autonomous/last/clear)": "telemetry: clears the last background-run note",
    "settings-controls.js:(anonymous /system/console-mode)": "job: starts or stops work or a model; deletes no user data",
    "settings-controls.js:(anonymous /preferences)": "settings: a setting with its own Reset or the settings history",
    "settings-controls.js:(anonymous /files/open-exports-folder)": "job: starts or stops work or a model; deletes no user data",
    "settings-controls.js:(anonymous /backups/retention)": "settings: a setting with its own Reset or the settings history",
    "settings-controls.js:(anonymous /auth/password-on-open)": "auth: sign-in, recovery or lock; no user data",
    "settings-controls.js:(anonymous /auth/lock-all)": "auth: sign-in, recovery or lock; no user data",
    "settings-controls.js:(anonymous /auth/lan-certificate)": "auth: sign-in, recovery or lock; no user data",
    "settings-controls.js:(anonymous /auth/lan-access)": "auth: sign-in, recovery or lock; no user data",
    "settings-controls.js:(anonymous /activity/model/stop)": "job: starts or stops work or a model; deletes no user data",
    "navigation.js:(anonymous /search/warm)": "telemetry: telemetry or a background warm-up; no user data",
    "model-bench.js:(anonymous /models/bench/stop)": "job: starts or stops work or a model; deletes no user data",
    "library.js:(anonymous /recycle-bin/empty)": "purge: Empty bin is permanent by design, behind a confirm that says so",
    "library.js:(anonymous /media/upload)": "GAP: POST /media/upload",
    "library.js:(anonymous /entries/${id}/purge)": "purge: Delete for good is permanent by design, behind a confirm that says so",
    "library.js:(anonymous /audit?entity_type=skill)": "telemetry: clears a skill's run log, not the person's data",
    "library.js:(anonymous ${base}/page-caption?page=${ocrWorks)": "read: reads a page's caption, shown for review",
    "library.js:(anonymous ${base}/ocr-page-read?page=${page}&r)": "read: reads a page's text, shown for review",
    "documents.js:(anonymous /preferences)": "settings: a setting with its own Reset or the settings history",
    "dashboard.js:(anonymous /recordings/recover)": "job: starts or stops work or a model; deletes no user data",
    "app.js:(anonymous path)": "read: the api.upload shorthand itself; each caller is scanned as its own site",
    "whiteboard.js:wbPlaceUploadedImage": "GAP: POST /media/upload",
    "whiteboard.js:wbCloneConnect": "GAP: POST /whiteboard/sketches",
    "whiteboard.js:wbClearBoard": "GAP: DELETE ${base}/${item.id}",
    "whiteboard.js:wbApplyHistoryEntry": "inverse: applies the board history's own undo and redo",
    "whiteboard.js:initWhiteboard": "GAP: POST /media/upload",
    "whiteboard-map.js:wbMapTakePicture": "GAP: POST /media/upload",
    "whiteboard-map.js:wbMapSuggestBranches": "read: asks the model for branch ideas",
    "whiteboard-map.js:wbMapSever": "GAP: PUT /whiteboard/boards/${boardId}/nodes/${id}/move",
    "whiteboard-map.js:wbMapRemoveKeepingBranch": "GAP: PUT /whiteboard/boards/${boardId}/nodes/move-many",
    "whiteboard-map.js:wbMapPasteText": "GAP: POST /whiteboard/boards/${boardId}/nodes/outline",
    "whiteboard-map.js:wbMapCutCrossLink": "GAP: DELETE /whiteboard/sketches/${sketchId}",
    "whiteboard-map.js:wbMapCrossLinkToBranch": "GAP: DELETE /whiteboard/sketches/${sketchId}",
    "whiteboard-map.js:wbMapClearToOneTopic": "GAP: DELETE /whiteboard/objects/${root.id}",
    "whiteboard-library.js:wbLibPlace": "GAP: POST /whiteboard/boards/${boardId}/place",
    "whiteboard-interchange.js:wbMermaidPlaceNode": "GAP: POST /whiteboard/sketches",
    "whiteboard-interchange.js:wbImportMermaid": "GAP: POST /whiteboard/sketches",
    "whiteboard-interchange.js:wbImportBoardRows": "GAP: POST /whiteboard/sketches",
    "whiteboard-interchange.js:wbDrawioPlace": "GAP: POST /whiteboard/sketches",
    "whiteboard-interchange.js:post": "GAP: POST /whiteboard/sketches",
    "whiteboard-history.js:wbRestoreToEvent": "board: restoring a board to an earlier moment is the board's version history",
    "whiteboard-history.js:wbHistRestore": "board: restoring a board to an earlier moment is the board's version history",
    "tidy.js:tidyRunLinkReasons": "job: starts a background pass",
    "settings.js:learnedDelete": "GAP: DELETE /learned/${fact.id}",
    "meetings.js:nameRecordingSpeakers": "read: asks the model to name speakers, shown for review",
    "library.js:ocrRunRegion": "read: reads a region of a picture, shows the text for review",
    "chat.js:compressChatContext": "read: asks the model to shorten the chat's context; writes nothing",
    "whiteboard.js:wbRestoreLinks": "GAP: POST /whiteboard/sketches",
    "whiteboard-map.js:wbMapWriteDocument": "GAP: POST /documents",
    "whiteboard-map.js:wbMapSetNumbered": "GAP: PUT /whiteboard/boards/${boardId}",
    "whiteboard-map.js:wbMapSetLayout": "GAP: PUT /whiteboard/boards/${boardId}",
    "whiteboard-map.js:wbMapReverseEdge": "GAP: PUT /whiteboard/boards/${boardId}/nodes/${id}/move",
    "whiteboard-map.js:wbMapReverseCrossLink": "GAP: PUT /whiteboard/sketches/${sketchId}",
    "whiteboard-map.js:wbMapRestoreRows": "GAP: POST /whiteboard/boards/${boardId}/nodes",
    "whiteboard-map.js:wbMapAdoptProvisional": "GAP: POST /whiteboard/boards/${row.board_id}/nodes",
    "settings-wiring.js:commitCaptureImages": "GAP: POST /media/upload",
    "notes-list.js:offerWikiRename": "GAP: POST /entries/${entryId}/wiki-rename",
    "library.js:noteRead": "GAP: PUT /bookmarks/${bookmark.id}",
    "chat-undo.js:chatPut": "inverse: the chat undo helpers' own PUT",
    "batch-space.js:batchSpaceRequest": "inverse: the move request itself; batchMoveToSpace pushes the step with the answer's old places",
    "settings-controls.js:restoreFullBackup": "job: a confirmed restore that snapshots the current notebook first; the snapshot is the way back",
    "meetings.js:meetingTakeAppend": "job: uploads the audio chunks of a take in progress; Discard is the take's own undo",
    "media.js:toggleDictation": "read: transcribes speech into the box being typed in",
    "documents.js:docAiReview": "read: asks the model to check a document, shows a result",
    "capture-ask.js:streamChatEvents": "send: streams the Ask box's answer; the question is kept in Ask history",
    "account-recovery.js:onMake": "auth: sign-in, recovery or lock; no user data",
    "account-recovery.js:saveRecoveryKeyFile": "auth: sign-in, recovery or lock; no user data",
    "account-recovery.js:submit": "auth: sign-in, recovery or lock; no user data",
    "account-recovery.js:submitPasswordReset": "auth: sign-in, recovery or lock; no user data",
    "account-recovery.js:submitRecovery": "auth: sign-in, recovery or lock; no user data",
    "activity-panel.js:stopActivityJob": "job: starts or stops work or a model; deletes no user data",
    "activity-panel.js:stopActivityModel": "job: starts or stops work or a model; deletes no user data",
    "activity-panel.js:stopAllActivity": "job: starts or stops work or a model; deletes no user data",
    "ai-tools.js:applyEmbeddingBackend": "settings: a setting with its own Reset or the settings history",
    "ai-tools.js:applyFeatureModel": "settings: a setting with its own Reset or the settings history",
    "ai-tools.js:renderTasks": "job: starts or stops work or a model; deletes no user data",
    "ai-tools.js:runImprove": "read: reads or asks the model; shows a result, writes nothing",
    "ai-tools.js:saveUiState": "settings: a setting with its own Reset or the settings history",
    "ai-tools.js:wireReindexButton": "job: starts or stops work or a model; deletes no user data",
    "app-palette.js:openPalette": "telemetry: telemetry or a background warm-up; no user data",
    "app.js:lockNow": "auth: sign-in, recovery or lock; no user data",
    "app.js:startApp": "telemetry: telemetry or a background warm-up; no user data",
    "app.js:startWithoutPassword": "auth: sign-in, recovery or lock; no user data",
    "ask-chart.js:renderAskChart": "read: reads or asks the model; shows a result, writes nothing",
    "ask-compose.js:renderActCard": "read: reads or asks the model; shows a result, writes nothing",
    "ask-history.js:clearAskHistory": "GAP: DELETE /ask-history",
    "ask-history.js:deleteAskHistoryTurn": "GAP: DELETE /ask-history/${id}",
    "ask-history.js:forgetRecentQuestion": "GAP: DELETE /chat/recent?question=${encodeURIComponent(quest",
    "attach-to.js:renderAttachToBoard": "GAP: POST /whiteboard/nodes",
    "attachment-actions.js:caption": "read: asks the model for a caption shown for review",
    "attachment-actions.js:describe": "read: asks the model for a description shown for review",
    "attachment-actions.js:remove": "GAP: DELETE /files/${spec.attachment.id}",
    "boot-guard.js:report": "telemetry: telemetry or a background warm-up; no user data",
    "captions.js:captionSendNext": "read: reads or asks the model; shows a result, writes nothing",
    "captions.js:startLiveCaptions": "read: reads or asks the model; shows a result, writes nothing",
    "captions.js:stopLiveCaptions": "read: reads or asks the model; shows a result, writes nothing",
    "capture-ask.js:renderAnswerGrounding": "GAP: POST /learned/corrections",
    "capture-ask.js:renderAskFollowups": "read: reads or asks the model; shows a result, writes nothing",
    "capture-ask.js:scheduleCaptureTagSuggestions": "read: reads or asks the model; shows a result, writes nothing",
    "capture.js:save": "GAP: POST /entries",
    "categories-panel.js:drawCategoryTidy": "GAP: POST /tidy-proposals/dismiss",
    "categories-panel.js:propose": "read: asks for a split proposal",
    "chat-agent.js:answer": "GAP: POST /memory/${proposal.id}/answer",
    "chat-agent.js:renderToolConfirm": "send: runs a tool the agent asked for, in the chat's own turn history",
    "chat-attach.js:commitStagedImages": "GAP: POST /media/upload",
    "chat-attach.js:offerFollowups": "read: reads or asks the model; shows a result, writes nothing",
    "chat-attach.js:openExtractPreview": "read: reads or asks the model; shows a result, writes nothing",
    "chat-attach.js:saveFollowups": "telemetry: stores suggested follow-up chips",
    "chat-attach.js:sendChatMessage": "send: a chat message, kept by the chat's own turn history",
    "chat-attach.js:writeCheckpoint": "send: a chat message, kept by the chat's own turn history",
    "chat-edit.js:editAndResend": "GAP: POST /conversations/${chatConv.id}/truncate",
    "chat.js:setResponseMode": "settings: a setting with its own Reset or the settings history",
    "chat.js:setWebSearxngRunning": "job: starts or stops work or a model; deletes no user data",
    "clip.js:save": "GAP: POST /links/clip-page",
    "dashboard.js:nightFactRow": "GAP: POST /entries/tensions/accept",
    "dashboard.js:paintFadedNotes": "GAP: POST /learned/corrections",
    "dashboard.js:renderNightCard": "job: starts or stops work or a model; deletes no user data",
    "dashboard.js:saveDashLayout": "settings: a setting with its own Reset or the settings history",
    "dashboard.js:saveQuickAccess": "settings: a setting with its own Reset or the settings history",
    "dashboard.js:saveQuickTints": "settings: a setting with its own Reset or the settings history",
    "dashboard.js:streamDigest": "read: reads or asks the model; shows a result, writes nothing",
    "dashboard.js:undoActorFrom": "inverse: reverses an actor's changes through /events/undo (existing UNFOLDED entry)",
    "date-field.js:foot": "read: reads or asks the model; shows a result, writes nothing",
    "documents-code.js:docFormatRemoteRefusal": "read: reads or asks the model; shows a result, writes nothing",
    "documents-code.js:docRemoteDiagnostics": "read: reads or asks the model; shows a result, writes nothing",
    "documents-codekit.js:docAssistAsk": "read: reads or asks the model; shows a result, writes nothing",
    "documents-word.js:docWordUploadPicture": "GAP: POST /media/upload",
    "documents.js:docDesktopFullscreenToggle": "job: starts or stops work or a model; deletes no user data",
    "documents.js:docDictionaryWrite": "settings: a setting with its own Reset or the settings history",
    "documents.js:docPutFields": "board: document field write; its callers push their own undo",
    "documents.js:docSuggestAnswers": "read: reads or asks the model; shows a result, writes nothing",
    "documents.js:ensureDocumentExists": "board: creates the document being typed into; the editor's history starts there",
    "documents.js:openDocAiHistory": "inverse: reverts an AI edit from its log, which is itself the undo",
    "documents.js:runDocAiEdit": "GAP: POST /documents/${currentDoc.id}/ai-edit",
    "documents.js:saveDocument": "board: the document editor's autosave; typing is the editor's own docUndo history",
    "editor.js:inlineAiSubmit": "GAP: POST /documents/${currentDoc.id}/ai-edit",
    "embed-choices.js:embedChoiceInstall": "job: starts or stops work or a model; deletes no user data",
    "embed-choices.js:embedChoiceUninstall": "job: starts or stops work or a model; deletes no user data",
    "embed-choices.js:embedChoiceUse": "settings: a setting with its own Reset or the settings history",
    "embed-choices.js:embedPullTyped": "job: starts or stops work or a model; deletes no user data",
    "first-run.js:firstStepName": "settings: a setting with its own Reset or the settings history",
    "first-run.js:firstStepsSample": "job: starts or stops work or a model; deletes no user data",
    "graph-canvas.js:gcDragEnd": "GAP: PUT /graph/pins",
    "graph-canvas.js:gcSaveTopicName": "GAP: PUT /graph/topics/name",
    "graph-canvas.js:gcShowTopic": "read: reads a topic summary",
    "graph-canvas.js:gcTogglePin": "GAP: PUT /graph/pin/${node.id}",
    "graph-canvas.js:gcWireSelectionDock": "GAP: PUT /entries/${node.id}",
    "graph.js:openGraphLinkPanel": "read: reads or asks the model; shows a result, writes nothing",
    "graph.js:renderGraphSvg": "GAP: PUT /graph/pin/${d.id}",
    "help-chat.js:helpChatStreamTurn": "read: reads or asks the model; shows a result, writes nothing",
    "library.js:analyseMediaRow": "read: asks the model to read a picture",
    "library.js:bulkDeleteLibraryMedia": "GAP: DELETE endpoint",
    "library.js:filterLibraryImagesGallery": "GAP: DELETE endpoint",
    "library.js:finish": "GAP: PUT /graph/topics/name",
    "library.js:libraryActions": "GAP: PUT /conversations/${item.id}/pin",
    "library.js:ocrReadRange": "read: reads or asks the model; shows a result, writes nothing",
    "lightbox-view.js:buildMoreMenu": "read: menu of analysis actions on a picture",
    "lightbox-view.js:readingDelete": "GAP: POST /media/${id}/${source === vision ? vision-ocr : ",
    "lightbox-view.js:run": "GAP: PUT /media/${item.id}",
    "lightbox.js:reevaluateEntry": "read: asks the model to re-check a note, applied through renderReevaluateResult",
    "lightbox.js:renderInlineAction": "read: asks the model about a note",
    "margin-reader.js:marginAsk": "read: reads or asks the model; shows a result, writes nothing",
    "media.js:saveSketch": "GAP: POST /media/upload",
    "meetings.js:meetingSummarise": "read: asks the model for a summary",
    "meetings.js:meetingTakeBegin": "GAP: POST /recordings",
    "meetings.js:meetingTakeDiscard": "GAP: DELETE /recordings/${id}",
    "meetings.js:meetingTakeFinish": "GAP: POST /recordings/${meetingTake.id}/finish",
    "meetings.js:meetingTranscribeTake": "read: transcribes a take",
    "model-bench.js:benchRow": "settings: a setting with its own Reset or the settings history",
    "model-bench.js:runModelBench": "job: starts or stops work or a model; deletes no user data",
    "navigation.js:usageFlush": "telemetry: telemetry or a background warm-up; no user data",
    "note-cards.js:entryItem": "GAP: PUT /entries/${entry.id}",
    "note-history.js:toggleThenAndNow": "read: reads a comparison",
    "note-history.js:undoSkillRun": "inverse: reverses a skill run's writes after a confirm (existing UNFOLDED entry)",
    "ocr-engine.js:ocrEngineLanguagePicker": "settings: a setting with its own Reset or the settings history",
    "ocr-engine.js:ocrEngineStartInstall": "job: starts or stops work or a model; deletes no user data",
    "onboarding.js:maybeShowConsoleViewIntro": "settings: a setting with its own Reset or the settings history",
    "onboarding.js:renderOnboardingActions": "job: starts or stops work or a model; deletes no user data",
    "phone-shell.js:clearAppCache": "job: starts or stops work or a model; deletes no user data",
    "phone-shell.js:openExportsFromNotification": "job: starts or stops work or a model; deletes no user data",
    "phone-shell.js:quitApp": "auth: sign-in, recovery or lock; no user data",
    "questions-view.js:initQuestionsView": "job: starts or stops work or a model; deletes no user data",
    "quick-note.js:flushNoteOutbox": "GAP: POST /entries",
    "quickadd.js:noteOffersFetch": "read: reads or asks the model; shows a result, writes nothing",
    "reminder-notify.js:showReminderNotification": "telemetry: telemetry or a background warm-up; no user data",
    "search.js:persistSavedFinds": "settings: a setting with its own Reset or the settings history",
    "semantic-notice.js:semanticDecline": "job: starts or stops work or a model; deletes no user data",
    "semantic-notice.js:semanticOnboardingOffer": "job: starts or stops work or a model; deletes no user data",
    "semantic-notice.js:semanticSetAutoInstall": "settings: a setting with its own Reset or the settings history",
    "settings-controls.js:addPersona": "settings: a setting with its own Reset or the settings history",
    "settings-controls.js:applyBackendChoice": "settings: a setting with its own Reset or the settings history",
    "settings-controls.js:applyChatModel": "settings: a setting with its own Reset or the settings history",
    "settings-controls.js:applyOcrModel": "settings: a setting with its own Reset or the settings history",
    "settings-controls.js:applyUtilityModel": "settings: a setting with its own Reset or the settings history",
    "settings-controls.js:applyVisionModel": "settings: a setting with its own Reset or the settings history",
    "settings-controls.js:deleteProfile": "settings: a setting with its own Reset or the settings history",
    "settings-controls.js:exportFullBackup": "job: starts or stops work or a model; deletes no user data",
    "settings-controls.js:resetAllFeatureModels": "settings: a setting with its own Reset or the settings history",
    "settings-controls.js:restartMemoryMap": "job: starts or stops work or a model; deletes no user data",
    "settings-controls.js:runEmbeddingFallback": "job: starts or stops work or a model; deletes no user data",
    "settings-controls.js:saveExportSaveDir": "settings: a setting with its own Reset or the settings history",
    "settings-controls.js:saveModelContextWindow": "settings: a setting with its own Reset or the settings history",
    "settings-controls.js:saveRunBudget": "settings: a setting with its own Reset or the settings history",
    "settings-controls.js:saveWebSearchSettings": "settings: a setting with its own Reset or the settings history",
    "settings-controls.js:submit": "auth: sign-in, recovery or lock; no user data",
    "settings-data.js:backupNow": "job: starts or stops work or a model; deletes no user data",
    "settings-data.js:importDirectory": "job: starts or stops work or a model; deletes no user data",
    "settings-data.js:run": "job: a confirmed restore that snapshots the current notebook first; deleting a backup file is housekeeping",
    "settings-data.js:settingsHistoryApply": "settings: a setting with its own Reset or the settings history",
    "settings-models.js:checkCustomModel": "read: reads or asks the model; shows a result, writes nothing",
    "settings-models.js:modelCancel": "job: starts or stops work or a model; deletes no user data",
    "settings-models.js:modelDownload": "job: starts or stops work or a model; deletes no user data",
    "settings-models.js:modelRemove": "job: starts or stops work or a model; deletes no user data",
    "settings-models.js:modelUse": "settings: picks the active model",
    "settings-models.js:run": "settings: a setting with its own Reset or the settings history",
    "settings-packages.js:renderEmbedModels": "job: starts or stops work or a model; deletes no user data",
    "settings-panes.js:changePassword": "auth: sign-in, recovery or lock; no user data",
    "settings-panes.js:reportTimezone": "settings: a setting with its own Reset or the settings history",
    "settings-panes.js:savePrefs": "settings: a setting with its own Reset or the settings history",
    "settings-panes.js:saveSearchProvider": "settings: a setting with its own Reset or the settings history",
    "settings-panes.js:setPreference": "settings: a setting with its own Reset or the settings history",
    "settings-wiring.js:handleFileUpload": "GAP: POST /media/upload",
    "settings-wiring.js:persistSavedSearches": "settings: a setting with its own Reset or the settings history",
    "settings-wiring.js:submitLockForm": "auth: sign-in, recovery or lock; no user data",
    "settings.js:clearLogs": "telemetry: telemetry or a background warm-up; no user data",
    "settings.js:deleteSavedTheme": "settings: a setting with its own Reset or the settings history",
    "settings.js:learnedBulk": "GAP: POST /learned/bulk",
    "settings.js:learnedForget": "GAP: DELETE /learned",
    "settings.js:learnedRunNow": "job: starts or stops work or a model; deletes no user data",
    "settings.js:learnedSetSwitch": "settings: a setting with its own Reset or the settings history",
    "settings.js:renderJobOverview": "job: starts or stops work or a model; deletes no user data",
    "settings.js:renderSamplingRows": "settings: a setting with its own Reset or the settings history",
    "settings.js:save": "settings: a setting with its own Reset or the settings history",
    "settings.js:saveCurrentLook": "settings: a setting with its own Reset or the settings history",
    "sheets-selects.js:renderPersonas": "read: reads or asks the model; shows a result, writes nothing",
    "sheets-selects.js:savePersonaList": "settings: a setting with its own Reset or the settings history",
    "shell-reminders.js:refreshMediaSession": "auth: sign-in, recovery or lock; no user data",
    "skills.js:onchange": "settings: a setting with its own Reset or the settings history",
    "skills.js:saveFile": "GAP: POST /files/save",
    "skills.js:saveSkillList": "settings: a setting with its own Reset or the settings history",
    "skills.js:saveToolSwitch": "settings: a setting with its own Reset or the settings history",
    "spaces-find.js:initSpaceSwitcher": "GAP: POST /spaces",
    "spaces-find.js:saveTemplateList": "settings: a setting with its own Reset or the settings history",
    "status.js:insightSend": "settings: a verdict on an insight, either way reversible by the other verdict",
    "status.js:setChatMode": "settings: a setting with its own Reset or the settings history",
    "status.js:toggleNotificationMute": "settings: a setting with its own Reset or the settings history",
    "suggestions-inbox.js:fillReasons": "read: reads or asks the model; shows a result, writes nothing",
    "suggestions-inbox.js:inboxCorrection": "GAP: POST /learned/corrections",
    "suggestions-inbox.js:inboxLinksPane": "read: reads or asks the model; shows a result, writes nothing",
    "suggestions-inbox.js:inboxTypeRow": "GAP: POST /suggestions/types/accept",
    "suggestions-inbox.js:tensionCard": "GAP: POST /entries/tensions/accept",
    "tag-manager.js:drawTurnedDown": "settings: turned-down tag suggestions list, a preference",
    "tidy.js:tidyDismiss": "GAP: POST ${path}/dismiss",
    "tidy.js:tidyHistory": "inverse: undoes a past tidy run from the history list",
    "tidy.js:tidyTools": "settings: a setting with its own Reset or the settings history",
    "update-dialogs.js:applyUpdateNow": "job: installs an update, with its own confirm",
    "update-dialogs.js:askUpdateChoiceOnce": "settings: a setting with its own Reset or the settings history",
    "usage-ledger.js:renderUsage": "telemetry: telemetry or a background warm-up; no user data",
    "vault-unlock.js:unlockPrivateNotes": "auth: sign-in, recovery or lock; no user data",
    "whiteboard-history.js:build": "board: board snapshot list, the board's version history",
    "whiteboard-history.js:wbSnapshotRow": "board: board snapshot list, the board's version history",
    "whiteboard-library.js:run": "GAP: DELETE /board-library/libraries/${lib.id}",
    "whiteboard-library.js:wbLibImportFile": "GAP: POST /board-library/import",
    "whiteboard-library.js:wbLibNewBoardFrom": "GAP: POST /board-library/new-board",
    "whiteboard-library.js:wbLibNewLibrary": "GAP: POST /board-library/libraries",
    "whiteboard-library.js:wbLibReplace": "GAP: PUT /board-library/${entry.ref.slice(5)}",
    "whiteboard-map.js:wbMapClearEveryTopic": "GAP: POST /whiteboard/boards/${boardId}/nodes/clear-style",
    "whiteboard-map.js:wbMapFromDocument": "GAP: POST /whiteboard/boards/import",
    "whiteboard-map.js:wbMapSetTheme": "GAP: PUT /whiteboard/boards/${boardId}",
    "whiteboard-map.js:wbMapSummariseBranch": "read: asks the model for a summary",
    "whiteboard.js:createConceptMap": "GAP: POST /whiteboard/boards",
    "whiteboard.js:createNewBoard": "GAP: POST /board-library/new-board",
    "whiteboard.js:finish": "GAP: PUT /whiteboard/boards/${boardId}",
    "whiteboard.js:uploadToLibrary": "GAP: POST /media/upload",
    "whiteboard.js:wbCreateBlankBoard": "GAP: POST /whiteboard/boards",
    "whiteboard.js:wbCreateCopies": "board: low-level board create; its callers push wbPushUndo",
    "whiteboard.js:wbGenerateMapFromNotes": "read: asks the model for a proposal",
    "whiteboard.js:wbImportOutlineFile": "GAP: POST /whiteboard/boards/import",
    "whiteboard.js:wbNewUntitledBoard": "GAP: PUT /whiteboard/boards/${boardId}",
    "whiteboard.js:wbPaintStickyDates": "read: reads dates out of sticky text",
    "whiteboard.js:wbSaveMapBulkMove": "board: low-level board save; its callers push wbPushUndo",
    "whiteboard.js:wbSaveNode": "board: low-level board save; its callers push wbPushUndo",
    "whiteboard.js:wbSaveObject": "board: low-level board save; its callers push wbPushUndo",
    "whiteboard.js:wbSaveSketchProps": "board: low-level board save; its callers push wbPushUndo",
    "wiring.js:applyPendingChatTitle": "GAP: PUT /conversations/${conversationId}",
}


def test_scanner_sees_the_writes():
    sites, helpers = analyse()
    assert len(sites) > 600, "the scanner lost the mutating calls"
    assert {"pushUndo", "offerUndo", "offerCategoryUndo", "pushEntryPutUndo"} <= helpers
    assert sum(1 for s in sites if s[4]) > 100


def test_every_write_offers_undo_or_is_exempt():
    left = {k: v for k, v in uncovered().items() if k not in EXEMPT}
    if os.environ.get("UNDO_COVERAGE_DUMP"):
        for key, lines in sorted(uncovered().items()):
            print(key, lines)
    assert not left, (
        "These functions send a POST/PUT/PATCH/DELETE without reaching the undo "
        "contract (pushUndo/offerUndo or a helper built on them). Offer an Undo "
        "with a working redo, or explain why not in EXEMPT:\n"
        + "\n".join(f"  {k} (line {v[0]})" for k, v in sorted(left.items()))
    )


def test_exempt_only_shrinks():
    now = uncovered()
    stale = sorted(k for k in EXEMPT if k not in now)
    assert not stale, "Remove from EXEMPT, they now offer undo or are gone:\n  " + "\n  ".join(stale)


def test_exempt_reasons_are_classed():
    classes = ("auth", "read", "send", "settings", "telemetry", "job", "inverse", "board", "purge", "GAP")
    bad = [k for k, v in EXEMPT.items() if not v.startswith(tuple(c + ":" for c in classes))]
    assert not bad, "EXEMPT reasons start with a class and a colon:\n  " + "\n  ".join(bad)
