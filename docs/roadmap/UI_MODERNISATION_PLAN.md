# UI modernisation — the dev plan for the next session

> Companions: [ROADMAP.md](../ROADMAP.md) (live list — this plan is its top
> priority) · [HANDOVER.md](HANDOVER.md) (what the last session measured and
> left) · [../DESIGN.md](../DESIGN.md) (the rules this plan extends) ·
> [BACKLOG.md](BACKLOG.md) · [HISTORY.md](HISTORY.md) · [ANALYSIS.md](ANALYSIS.md)

## The instruction, verbatim

> fix instances like this where there are hard rectangle box background
> colours behind rows. and there are still a lot of inconsistencies in ui
> style, sizing, alignment, positioning, spacing, gaps, margins, colour, style
> aesthetic etc. also sometimes when oeping dropdown menus or panels like for
> tooltips or in the formatting toolbars, the panels will flicker somewhere
> else on the screen then appear in the right place. now that you have done
> the structure fix. I need you to do a consistency fix, and also adjust the
> larger mass spacing and panels for the app. it needs to be professional and
> usable, not overly performative. the aesthetic needs to fit, not just be a
> crude imitation of modern aesthetics. I need you to modernise the ui.

And: "the ui needs to be modernised and proffesionalised for the whole
application ... the application still feels fake, vibe coded and not ready
for professional use. some things feel performative and not at professional
standards in the ui and ux."

## What "fake / vibe coded / performative" means here, concretely

Read against the measurements the last session took (HANDOVER.md, "This
session"), the feeling has five measurable causes. Every phase below attacks
one of them and is judged by a count, not by looking at a screenshot.

1. **Many recipes for one thing.** 17–21 button signatures on a tab; two
   eyebrow recipes; three seg recipes; row gaps of 4/6.4/8/9.6/16px; head
   rows 28/38/40px tall; two card radii. A professional UI has one of each,
   and the eye reads the difference as "assembled from parts".
2. **Decoration doing the work of structure.** Borders inside borders,
   sheen, blobs, shadows and glass everywhere, because tone and whitespace
   were never trusted to group things. Surface tiers started this; it is not
   finished (chips, fields, popovers, the whiteboard panels, the chat dock).
3. **Uneven mass.** 18px card padding on a 1100px card; 12/10/18px shell
   gaps (now one gutter); a hero that is 150px tall for a greeting; widgets
   with 47px of head for one line. Modern layouts are generous at the shell
   and dense inside the component, not the other way round.
4. **Things that move when they should not.** Menus that paint before they
   are placed (fixed for toolbar menus; audit the rest), rows that change
   shape on hover, transitions on layout properties.
5. **Copy and states that are not designed.** Empty states as one grey line,
   errors as toasts, loading as nothing, labels in three tones of voice.

## Rules for the whole plan

- **Measure, change, re-measure.** `scratchpad/ui-sweeps/` holds the sweep
  scripts from the last session (`buttons.js`, `borders.js`, `caps.js`,
  `segs.js`, `rows.js`, `space.js`, `heads.js`, `lib.js`). Each prints a
  signature table per tab. A phase is done when its count is what the phase
  says, in both themes, on the default palette. Run:
  `SCRATCH=<dir> BASE=http://127.0.0.1:<port> PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/<x>.js`
- **Tokens only.** No new px/rem values; `tests/test_style_scale.py` fails
  otherwise. If a phase needs a value the scale lacks, add the token with a
  comment saying which measurement asked for it.
- **Subtract before adding.** Every phase first removes a recipe, a border,
  a shadow, a size — and only then adjusts what is left.
- **One commit per phase, pushed, with the before/after counts in the
  message.** The user's usage is finite; a session that ends mid-phase must
  leave a green, pushed head.
- **Not performative:** no new gradients, glows, animations, badges or
  "AI sparkle" anywhere in this plan. The glass stays where it reads as
  material (the shell, a floating panel) and goes where it reads as effect.

## Phase 0 — tooling and acceptance gates (½ session)

1. Add `tests/test_ui_signatures.py`: a static lint that counts distinct
   `gap:`/`padding:` values on `.row`-class selectors and distinct
   `border-radius` values on surface selectors, with a ceiling the later
   phases lower. It cannot see the DOM; it stops regressions between
   sessions.
2. Add a `make ui-sweep` (or a `scratchpad/ui-sweeps/all.sh`) that runs every
   sweep against a running app and writes the tables to one file, so
   before/after is one diff.
3. Screenshot set: every tab + every Settings section, light and dark, 1440
   and 1024 wide, into the scratchpad. Same script each session.

## Phase 1 — mass and layout (1 session)

Target: the app reads as one shell with rooms in it, not as cards on a
gradient.

1. **Shell.** One gutter (`--page-gutter`, done) — extend to the dashboard
   grid gap, the Library grid gap, and the gap between the sub-tab strip and
   its content (measured 24/17/8px). Status bar and top bar: same height
   family (`--header-h`), same horizontal padding as the page gutter so the
   logo, first tab, sidebar edge and first card edge share one x.
2. **Card system.** `.card` padding to `--space-6/--space-7` on ≥1100px
   content columns (measured 16/20px everywhere, which is dense for a full-
   width panel and right for a widget). Define two card sizes only:
   `.card` (panel) and `.card.compact` (widget, sidebar). Kill card-in-card:
   `.card .card` becomes a tone (`--surface-2`), never a bordered pane.
3. **Dashboard.** Hero from 150px to one row (greeting · date · time · name),
   quick actions become the first widget row, stat tiles fold into the
   Stats widget. Widget head row: 32px, title + one action, no border below.
4. **Sidebars.** One width token, one head row (28/38px measured → one),
   list rows at `--target-min` with tone hover, no bordered rows.
5. **Max reading width.** `.entry-list.is-rows` already caps the measure;
   apply the same `--measure` token to chat bubbles, document preview, the
   Contents page and Settings prose (currently 100% of a 640px column, fine;
   100% of a 1100px column, not).

Acceptance: `space.js` shows one card padding per card size, one card gap,
one shell gutter; head rows at one height; screenshots side by side.

## Phase 2 — component consistency (1–2 sessions)

Target: one recipe per component family, counted.

| Family | Now (measured) | Target |
| --- | --- | --- |
| Buttons | 13–21 signatures per tab | 4: filled, tonal, plain, icon-tonal (+ danger colour) |
| Rows (`.row`, toolbars) | gaps 4/6.4/8/9.6/16px | 2: `--space-3` inside a control group, `--space-4` between groups |
| Head rows | 28/38/40px | 1: `--control-h` |
| Chips/badges | ~6 recipes (tag, link, status, count, filter, inline) | 2: static tag (tone, no border) and interactive filter chip (tonal button) |
| Fields | inputs with border+inset; selects with border+shadow | 1: recessed well, `--field-inset`, no drop shadow |
| Segmented | 3 | 2: tab strip (well) and choice (chip well) — done, keep |
| Menus/popovers | action-menu, select-menu, doc-dock-menu, help-popover, graph panels — 5 shells | 1 `.popover` shell: `--modal-bg-opaque`, `--border`, `--glass-shadow`, `--radius-md`, hidden-until-placed |
| Dialogs | modal-card + 4 one-off panels | 1 |
| List rows | entry-list li, library-card, bookmark-row, extras-row, setting-row | 2: card row (tone) and divider row |

Method per family: run the sweep, read the signature table, pick the winner
(the one most used, already on tokens), rewrite the others onto it, delete
the one-off rules, re-run. Record each family's before/after count in the
commit.

## Phase 3 — typography, colour, glass restraint (½ session)

1. Type: `--text-md` for control labels everywhere (measured 0.85/0.92rem
   one-offs remain in Settings labels and library meta). Muted text at one
   colour, one opacity — no `opacity: 0.75` on top of `--muted`.
2. Colour: the accent is for the one filled action, selection, and links.
   Remove accent from decorative borders, dots and icons that are not
   interactive. Status colours (`--ok/--warn/--error`) only on status.
3. Glass: keep `backdrop-filter` on the top bar, sidebars, floating panels
   and sticky strips. Remove it from widgets and list cards (tone instead) —
   the measured blur layer count drops again and the page stops shimmering.
   Sheen: off by default; the setting stays.
4. Background: the blobs at half strength by default; a professional product
   has a quiet page.

## Phase 4 — motion and placement (½ session)

1. Every floating panel opens through one path: measure → place → reveal.
   The toolbar menus do (`.is-placed`); port the same class to
   `.action-menu`, `.select-menu`, `.help-popover`, the graph panels and the
   whiteboard floating panel, and the chat model panel.
2. No transitions on `left/top/width/height`; opacity and transform only,
   ≤ `--motion-base`. Hover changes tone, never size or shape.
3. Focus rings: one recipe (`--accent` 2px offset) on every interactive
   element; verify with a keyboard-walk script.

## Phase 5 — per-surface passes (1 session each, in this order)

1. **Settings** — the most visited and the most measured; apply phases 1–3
   and the #129 list (spacing, hierarchy, proximity per page).
2. **Notes** (Browse, Capture, Write, Ask) — #132; the capture toolbar's
   density; the row list as the reference list component.
3. **Chat** — dock, sidebar, bubbles; #35's odysseus-style shape as the
   target, kept restrained.
4. **Library** — All/Documents/Files/Images/Links/Contents rows onto the two
   list-row recipes; #101.
5. **Dashboard** — phase 1's hero and widget head; widget internals onto the
   compact card.
6. **Graph, Timeline, Reminders** — toolbars onto the row recipe; the graph's
   floating panels onto the popover shell.
7. **Whiteboard and Documents editor** — panel chrome onto the popover
   shell; the toolbar strip as the reference toolbar; #133, #134.

## Phase 6 — designed states and copy (½ session)

1. Empty states: icon + one sentence + one action, one component, used by
   every list. 2. Loading: skeleton rows for lists, a spinner only inside a
button. 3. Errors: inline under the control that failed; toasts only for
background work. 4. Copy: sentence case everywhere except eyebrows; verbs on
buttons; no exclamation marks; one voice (DESIGN.md gets a "Voice" section).

## Verification, every phase

- Sweep tables before/after in the commit message.
- Screenshots, light and dark, both widths, looked at *and* measured (pixel
  samples for any colour claim, `scrollHeight` for any clipping claim).
- `python -m pytest tests/` green; `ruff`; `node --check`.
- The four traps in CLAUDE.md still apply: stale server, stale `app.js`, a
  screenshot is not a measurement, "already exists" is where triage starts.

## Not in this plan

New features. The plan is subtraction and alignment; the feature backlog
(BACKLOG.md) waits until the shell is quiet.
