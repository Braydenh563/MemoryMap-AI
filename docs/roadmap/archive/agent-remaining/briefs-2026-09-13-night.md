# The four agents running on the night of 2026-09-13, and how to resume them

Each runs in its own worktree on Opus, reads `agent_common.md` (this folder;
token, save and push rules) and pushes after every commit to
`origin/agent/wip-<name>`. To resume one after a cut-off: cut a worktree from
its wip branch, give it `agent_common.md` plus its brief below, and "continue
from your remaining file's last next line". To merge: review against
CLAUDE.md section 6, `git merge --no-ff`, keep both sides of append-only doc
conflicts but drop INBOX items already in HISTORY, `scripts/gate.sh`, push.

## chrome (port 8801, /tmp/mm-chrome, remaining file chrome-help.md)

Owns app.js header, status bar, popovers, palette, help chat, theme;
settings.js; index.html header, status bar, palette, help-chat markup; CSS
00, 02 (chat and palette), 06, 08; the help route; CHAT_PLAN, DESIGN.md,
test_ui_recipes.py, test_help_chat.py. Not whiteboard.js or 07 CSS.

In order, one commit each, measured, INBOX marked and resolved:
1. INBOX 207: `#agent-btn` and `#guide-btn` leave the header; a `#status-guide`
   slot beside `#status-agent` in `#status-bar` and a row in the phone More
   sheet; the remaining header buttons (bell, theme, gear; lock, power) become
   plain icon-only ghost buttons with no wells or seams, one step apart, tab
   button height.
2. INBOX 206: the `data-help-for` popover capped at `min(60vh, 32rem)` with
   scroll, and placed before it is shown (no first frame at 0,0).
3. INBOX 205 first half: the palette's '?' popover behind the panel
   (`elementFromPoint` at its centre; z-index tier or blurred ancestor).
4. INBOX 202: the theme switch measured (long tasks, repaint count) and its
   cause fixed.
5. INBOX 203: every AI-only control carries `data-needs-model`; one
   `syncModelGatedControls(status)` from the `/models/status` poll disables
   them with a reason; a lint over the inventory.
6. INBOX 205 second half, 204 second half, 208: the starters redesigned as a
   set; the help chat's persona (a fitting name as an INBOX decision, taken),
   empty-state self-description, `/help/ask` context with the tab's help
   lines, README features and shortcuts; the palette's foot row one line each
   with Start over icon-only.

## mapux (port 8802, /tmp/mm-mapux, remaining file mindmap.md, top section)

Owns whiteboard.js, 07 CSS, `wb-` markup, routes_whiteboard.py, MINDMAP_PLAN,
WHITEBOARD_PLAN, test_whiteboard.py, test_mindmap*.py. INBOX 200 and 201.
1. Audit (no code): every control on a twelve-topic map, where, duplicates,
   orphans, into the remaining file.
2. One place per action: ring = what you do to this node from here (six
   slots at most, labels drawn at rest, on the opaque ground); strip = how it
   looks; dock menus = the map. Decisions recorded in MINDMAP_PLAN under
   "Decisions made, 2026-09-13 night".
3. Every ring action on the keyboard and in the context menu; a keyboard-only
   sweep builds a five-node tree.
4. INBOX 201: a core node distinguishable by shape, fill and size at once,
   one toggle in the strip, contrast 4.5:1 both themes.
5. A first-open hint on an empty map, shown once; `data-help-for` on the dock.
6. mapstrip, mapdock, mapring, mindmap, mapnarrow, errors sweeps green.

## backend2 (port 8803, /tmp/mm-back2, remaining file backend-probe.md, top)

WORLD_CLASS_PLAN "Audit, 2026-09-13 night" rows A3 (bounded job pool,
`core/jobs.py`, daemon workers joined on shutdown, every `*_in_background`
enqueues), A4 (`run_agent` adapts to a small model: CORE minus ORCHESTRATION
tools, 4 rounds, short descriptions, text-embedded tool calls before a
re-prompt; fake-transport tests), A5 (split run_agent, _run_skill,
chat_stream, graph, timeline into stages, no behaviour change, AST numbers
in the commit), A6 (nine silent excepts log or name their exception), A9
(the unit CI job installs node, one job installs the PDF extra). Owns
ai/** except grounding.py, core/** except docexport and docview, routes_chat,
routes_graph, routes_timeline, routes_entries, routes_files (job call sites),
workflows, tests, WORLD_CLASS_PLAN (mark rows done), ARCHITECTURE.md.

## boot (port 8804, /tmp/mm-boot2, remaining file boot.md)

Audit rows A1 (per-tab modules load on first use through `ensureModule`,
awaited by `switchTab`, stamped `?v=` read off an existing script tag, boot
cross-file calls guarded, `test_asset_cache_busting.py` extended) and A2
(`/preferences` once, the notes list's first page at 200, boards on first
Library visit). Gate: `scratchpad/ui-sweeps/boottime.js` before and after
(baseline 13 scripts, 1,699 KB compressed, 35 fetches), errors.js clean at
four widths after visiting every tab. Owns app.js `switchTab` and the boot
sequence, the script tags at the foot of index.html, the other modules'
boot-time entry points only.
