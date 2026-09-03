---
name: ui-ux-pro-max
description: A checkable UI/UX reference — 98 UX guidelines, ~100 app-interface rules with good/bad code for each, plus catalogues of interface styles, colour palettes, type pairings, motion and chart types. Use it when reviewing or building any screen in this app: before a layout or density change, when picking spacing/type/colour, when auditing accessibility, focus, touch targets, responsive behaviour or reduced motion, and when a screen "feels off" and you need named criteria instead of taste. Read the CSVs directly with grep or the Python snippet below.
---

# UI/UX Pro Max, vendored

## Why this is in the repo and not just installed

Asked directly: *"in a previous session I got you to check out, install and
fix this set of ui skills but idk if you actually saved them as skills for
you to use in future sessions."*

It had not been saved. This sandbox's `~/.claude/skills/` held only the
standard Anthropic set (`frontend-design`, `unslop-ui`,
`web-design-guidelines`, `apple-design`) and no trace of this one — and it
could not have, because the container is rebuilt per session and anything
written to a home directory goes away with it. **The repo is the only place
a skill survives**, so it lives here.

Source: <https://github.com/nextlevelbuilder/ui-ux-pro-max-skill>, MIT, at
v2.13.0. MIT into an AGPL-3.0 project is fine in this direction — see
[ANALYSIS.md](../../../docs/roadmap/ANALYSIS.md) §33 for the constraint that
runs the other way. `LICENSE` sits beside this file.

**What was deliberately left out**, so nobody re-adds it thinking it was
missed: `google-fonts.csv` (732K) and `phosphor-icons-upstream.json` (808K).
This app already ships Phosphor and already has its own type scale in
[DESIGN.md](../../../docs/DESIGN.md); 1.5MB of font and icon catalogues
would be dead weight in every clone. The upstream `scripts/` and
`templates/` were left out too — they generate new projects from stacks this
app does not use (React, Next, Tailwind). What is kept is the part that is
useful here: the rules.

## What is in `data/`

| File | Rows | What it answers |
| --- | ---: | --- |
| `ux-guidelines.csv` | 98 | "What is the rule for this?" — Layout, Responsive, Navigation, Interaction, Forms, Accessibility, Animation, Typography, Content, Feedback, Performance, Touch, Search, Onboarding. |
| `app-interface.csv` | ~100 | The same shape but per-issue, each with **Do / Don't / a good code example / a bad one / a severity.** The most directly checkable file here. |
| `ui-reasoning.csv` | — | Why a choice is made, not just what to choose. |
| `styles.csv` | 84 | Named interface styles with their defining traits. |
| `colors.csv` | 192 | Palettes. |
| `typography.csv` | 74 | Font pairings. |
| `motion.csv` | — | Duration/easing conventions. |
| `charts.csv` | 25 | Chart types and when each is right. |

## How to use it

These are CSVs, not prose — read the rows you need rather than the file.

```bash
# every Layout and Responsive rule
python3 -c "
import csv
for r in csv.DictReader(open('.claude/skills/ui-ux-pro-max/data/ux-guidelines.csv')):
    if r['Category'] in ('Layout','Responsive'): print(r)
"

# one issue, with its good/bad examples
grep -i 'virtualize long lists' .claude/skills/ui-ux-pro-max/data/app-interface.csv
```

## How it applies *here* specifically

This is a local-first desktop-shaped app, not a marketing site, so a lot of
the catalogue (landing pages, product pages, stack templates) does not
apply. The parts that do, and that this codebase has already been measured
against, are in
[docs/roadmap/REDESIGN.md](../../../docs/roadmap/REDESIGN.md) §R1:

- **Layout → Container Width.** Note cards measured 1037px wide for 60-char
  lines. Prose wants 60–75 characters.
- **Performance → Virtualize Long Lists.** The notes list renders every
  entry into the DOM.
- **Layout → Overflow Hidden** and **Content Jumping.** Both have caused
  real, reported bugs in this app already — the nav-history popup's clipped
  glyphs (HANDOVER.md) is textbook "Overflow Hidden".
- **Animation → Respect Reduced Motion.** Any new indefinite animation needs
  a `prefers-reduced-motion` branch; the "Filing…" chip's spinner has one.

**Use it as a checklist, not as a style.** This app has its own design
system with a lint that enforces it ([DESIGN.md](../../../docs/DESIGN.md),
`tests/test_style_scale.py`). Where this skill's palettes or type pairings
disagree with the tokens, the tokens win — the skill is here to catch what
the tokens cannot: behaviour, focus, density, responsive limits.
