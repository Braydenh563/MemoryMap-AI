# Wrap and alignment sweep: what is left

Agent: worktree `agent-a6db54045f3f6f144`, base commit `28a8911` (PR #142
merge) on `claude/epic-ramanujan-8xocc0`. Seven reports assigned; five fixed
and measured, one found already fixed upstream, one blocked by worktree
staleness and documented below rather than guessed at.

## Done, with numbers

1. **Chat answer header wrap** (`frontend/index.html`, `frontend/css/01-forms-settings.css`).
   Grouped the icon + "AI answer" text + `#answered-by` badge into one
   `.answer-title` flex item (`min-width: 0; flex: 1 1 auto`) so the badge
   can never separate from the title onto its own line the way
   `.answer-actions` does. Before: at 1280px with a realistic model id
   ("answered by llama3.1:8b-instruct-q4_K_M") the row fragmented into
   three lines (title / badge flush left / actions flush right, top values
   296.5 / 320.9 / 348.5). After: badge stays within 2.3px of the title's
   own top at 1024-1460px with two model-id lengths tested; worst case is
   two rows (title, then actions), never three. Commit `8fb0ae2`.

2. **Skills button width** (`frontend/css/04-chat-dock-appearance.css`).
   `--composer-h` moved from `.chat-dock .chat-composer` up to `.chat-dock`
   itself (the shared ancestor) so `.chat-dock-controls`, a sibling of
   `.chat-composer`, can read it too. `#chat-skills-btn` gets
   `min-width: calc(var(--composer-h) * 2 + var(--space-2))`. Measured:
   button now spans 362-456.4px at 1440px, exactly matching the note-picker
   + attach-image pair above it, at every width from 600 to 1440px. Commit
   `af55ba6`.

3. **Chat dock bottom row gap** (`frontend/index.html`,
   `frontend/css/04-chat-dock-appearance.css`). Replaced
   `.chat-tool-group-mode`'s unbounded `margin-left: auto` with an explicit
   `.chat-dock-controls-spacer` (`flex: 1 1 auto; max-width: var(--space-9)`)
   between the two clusters. A capped container max-width was tried first
   and rejected: Skills can reach 18rem and the mode group ~23rem at wide
   viewports, so a cap generous enough for both worst cases barely shrank
   the gap. The spacer bounds the *gap*, not the row, so it carries no new
   wrap case at any content length. Measured: gap now a constant 48px at
   1920/1440/1024/900px (was 766/548/197/113px), narrow-viewport wrap to a
   left-aligned second line still works at 768/640/600px. Commit `4bdec8b`.

4. **Packages rows** (`frontend/app.js`'s `renderExtras`,
   `frontend/css/00-tokens-shell.css`). Same defect shape as #1: title, its
   "Installed"/"Not ready yet" chip, and the actions were three independent
   flex children of `.entry-meta`. Wrapped name + chip into `.entry-title`
   (`min-width: 0; flex: 1 1 auto`), scoped to `.extras-row` so the many
   other `.entry-meta` consumers (notes, reminders, tasks, conversations)
   are untouched. Reproduced with Tesseract's real label forced into its
   installed state (a fresh dev profile has it uninstalled, so this needed
   simulating rather than a real install); title and chip now stay within
   2.3px of the same top at 800-1440px, actions wrap to their own
   right-aligned line as before. `renderEmbedModels`, which shares the same
   classes, was checked and left alone: it already builds its badge inside
   `.entry-actions` rather than beside the title, so it never had this
   failure mode. Commit `34357f0`.

   Note for whoever reads this next: the brief named `frontend/settings.js`;
   the actual code is `renderExtras`/`renderEmbedModels` in `frontend/app.js`.

7. **Links Save/Cancel** (`frontend/library.js`, `bookmarkRow`'s in-place
   edit form). Cancel was built as `class="ghost small icon-only"` with the
   text "Cancel" as its content, one function using its own hand-rolled
   buttons instead of the `smallButton()` helper that sizes `icon-only`
   automatically from content length. `icon-only` forces `aspect-ratio: 1`,
   which is right for a bare glyph and wrong for a word. Measured before:
   Save 62.6x28px, Cancel 56.2x56.2px. Fixed by dropping `icon-only`
   (plain `.ghost.small`, matching Save's `.small`). Measured after: both
   28px tall, both 9.8px radius, both `0 12.8px` padding, only the fill
   differs. Checked the other three hand-built Save/Cancel pairs in the app
   (`msg-edit-actions` and the message-edit cancel in app.js, the graph
   link-creation dialog in graph.js) for the same mistake and found none:
   this bookmark row was the only instance. Commit `b41a7c0`.

All five: `node --check` on every edited file, plus
`tests/test_frontend_ids.py`, `test_frontend_handlers.py`,
`test_style_scale.py`, `test_asset_cache_busting.py` (33 tests, all green
after each step) and `ruff check .` clean. `scripts/gate.sh` does not exist
in this worktree (see "Not verified" below), so these four were run by hand
in its place: the closest available substitute for the lint set the brief
asked for.

## Found already fixed, not by me

5. **Quick-nav hint wrap** ("m" and "then" wrapping onto two lines beside
   the key chips, `showTabJumpHint` in `frontend/app.js`). This function
   does not exist anywhere in this worktree's checkout, confirmed with
   `grep -n showTabJumpHint` returning nothing in `frontend/app.js`. It
   does exist on `origin/claude/epic-ramanujan-8xocc0` (read-only, via
   `git show`, never merged into this worktree), where a concurrent session
   has already replaced the small popup with the full-screen "chord guide"
   the owner separately asked for (commit `409f044`, "The quick-nav chord
   is a full-screen guide, and it has three more keys"). Its
   `frontend/css/10-responsive.css` carries a comment that names this exact
   bug as the reason for the rebuild: *"...ten key-and-label pairs in a row
   that wrapped mid-pair, which is why 'm' and 'then' ended up on separate
   lines beside the chips"* and *".chord-guide-row: one pair per chip, so a
   key and its destination can never be split across a line break: the
   exact fault in the screenshot."* I made no changes here: the code this
   report names is gone, its replacement already carries a fix for the same
   defect, and touching it further would be the redesign the brief
   explicitly told me to leave alone.

## Not fixed: blocked, not guessed at

6. **Boards and maps dock** (`frontend/library.js`, the "Boards & maps"
   Library sub-tab). This worktree's `index.html` has an old, simple
   version of this panel: a bare `.row.space-between` with six controls
   (search, sort, the grid/list toggle, one "New board" button, refresh,
   help): it has no "New mind map", "Map from notes…" or "Import
   outline…" buttons at all, so the exact six-control wrap the report
   describes cannot be reproduced against this checkout; there is nothing
   here that matches what was reported.

   Read-only, `origin/claude/epic-ramanujan-8xocc0` already has a much more
   built-out version: a `.dock[data-dock-name="library-boards"]` with the
   four-zone recipe (`dock-identity` / `dock-find` / `dock-arrange` /
   `dock-actions`) from "UI_MODERNISATION_PLAN.md Phase 8", including the
   three new buttons the report names, and a `foldDockArrange` mechanism
   (app.js) that moves the arrange zone into a menu at some width. I did
   not attempt a fix against this: this session's local server serves this
   worktree's own (stale) files, so I cannot open the real panel, drive it
   in Chromium, or measure it: every fix in this report was earned by
   `getBoundingClientRect`/`getComputedStyle` against something actually
   rendering, and guessing at markup I have only read as a diff would break
   that rule for no good reason.

   What I did check, because it was cheap and specifically named: the
   coordinator's mid-task note said `.card > .row.space-between {
   flex-wrap: wrap }` (specificity 0,3,0) has been silently outranking a
   declared `nowrap` elsewhere, and named this dock as one of the affected
   surfaces. In the upstream markup the boards-and-maps dock is
   `<div class="dock" data-dock-name="library-boards">` directly inside
   `<section class="card glass">`, it is not itself `.row.space-between`,
   so that specific selector does not match `.dock-actions` by class. That
   does not clear the dock of the bug, only of *that one* selector; the
   same specificity trap could still exist under a different selector
   somewhere in the dock's own cascade, and I have no way to confirm either
   way without a browser pointed at the real code.

   Next step for whoever picks this up: from a worktree that actually has
   this branch's current `frontend/index.html` and CSS, boot the app, open
   Library → Boards & maps, set the viewport to ~2000px, and read
   `getComputedStyle(document.querySelector('[data-dock-name="library-boards"] .dock-actions')).flexWrap`
   plus the `top` of each of its six children. If wrap is `wrap` where a
   `nowrap` rule was clearly intended, look for what is outranking it the
   same way the graph node panel's fix did (name `.card` or `.dock` in the
   winning selector). If the six actions wrap as one group with a shared
   top, matching the "close the gap sensibly" instruction from report 3
   should generalise: check whether `.dock-actions` needs the same
   spacer-vs-margin-auto treatment used there, rather than the
   `foldDockArrange` menu firing later than the owner expects at exactly
   2000px.

## Not verified

- Real-browser text metrics: everything above was measured against
  Chromium (headless, via Playwright, `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`)
  at 1024/1280/1366/1440/1920px and the app's own `--zoom` appearance
  setting at 95%. Font rendering in a different browser or OS could shift
  an exact wrap breakpoint by a few pixels; none of the fixes above depend
  on an exact breakpoint holding, only on removing the fragmentation
  failure mode, so this should not matter, but it was not itself checked
  against a non-Chromium engine.
- `scripts/gate.sh` referenced throughout the brief and by the coordinator
  does not exist in this worktree (`find . -iname gate.sh` returns
  nothing), nor do several lints the top-level `CLAUDE.md` names as
  existing (`test_css_braces.py`, `test_dock_grammar.py`,
  `test_no_em_dashes.py`, `test_ui_recipes.py`, `test_docs_layout.py`,
  `test_no_innerhtml_interpolation.py`, `test_markdown_link_schemes.py`):
  this worktree's base commit predates them. Ran the four lints that do
  exist locally instead (`test_frontend_ids.py`, `test_frontend_handlers.py`,
  `test_style_scale.py`, `test_asset_cache_busting.py`, all green) plus
  `ruff check .` and `node --check` on every edited file, and manually
  balanced braces (`{`/`}` counts equal) on every CSS file touched, as the
  closest available stand-in. Did not run the full pytest suite, per
  standing orders.
- Did not push. Five commits on this branch, in order: `8fb0ae2`
  (report 1), `af55ba6` (report 2), `4bdec8b` (report 3), `34357f0`
  (report 4), `b41a7c0` (report 7).
- General note on this worktree's drift: its base (`28a8911`) is one merge
  behind `origin/claude/epic-ramanujan-8xocc0`'s tip
  (`83c6c9d` at the time of this session), which already carries several
  more merged agent branches, three new CSS files
  (`08-consistency.css`, `09-editor.css`, `10-responsive.css`), the
  chord-guide redesign, and the boards-and-maps dock rebuild. Reports 5 and
  6 are both downstream of that gap; reports 1-4 and 7 were not, and their
  fixes were made and measured against this worktree's own files as
  instructed.
