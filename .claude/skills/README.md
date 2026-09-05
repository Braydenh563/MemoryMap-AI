# Vendored design skills

Seven Claude Code skills copied verbatim from
[nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)
at commit `91c193ac059b487d13ce535c7015b021eb71c841` (skill version 2.13.0),
MIT-licensed — the licence text is kept beside them as `LICENSE.ui-ux-pro-max`.

**Licence direction matters here.** This project is AGPL-3.0. MIT code may come
*in* (that is this directory); nothing from this project may go *out* to an MIT
project. Same rule as `docs/roadmap/ANALYSIS.md` records for odysseus.

| Skill | What it is |
| --- | --- |
| `ui-ux-pro-max` | The main one. A searchable local CSV/JSON corpus — 79 styles, 192 palettes, 74 font pairings, 119 UX guidelines, 105 icons, 25 chart types, 22 stacks — driven by `scripts/search.py`. |
| `design` | Umbrella skill routing to logo / CIP / slides / banner / social-photo work. |
| `design-system` | Three-layer design tokens (primitive → semantic → component), component specs. |
| `ui-styling` | shadcn/ui + Tailwind guidance, plus 81 OFL-licensed TTFs in `canvas-fonts/` for canvas rendering. |
| `brand` | Brand voice, visual identity, asset conventions. |
| `slides` | HTML presentations with Chart.js. |
| `banner-design` | Social/ad/web/print banner formats and safe zones. |

## Local modifications

Kept to the minimum, so an upstream refresh is a re-copy plus re-applying these:

1. `ui-ux-pro-max/SKILL.md` — every documented command path was
   `${CLAUDE_PLUGIN_ROOT}/.claude/skills/…`, which only resolves when the repo
   is installed as a *plugin*. These are project skills, so that variable is
   unset and every example expanded to `/.claude/skills/…` — an absolute path
   that does not exist. Changed to `${CLAUDE_PLUGIN_ROOT:-.}/…`, which is
   correct in both installations.
2. `pyproject.toml` — `.claude/skills` added to ruff's `extend-exclude`; see the
   comment there.
3. `.gitignore` — a negation for `.claude/skills/**/data/`. The existing `data/`
   rule (app user-data, build plan §7) has no leading slash, so it matches at
   any depth and was silently swallowing every skill's `data/` corpus — the
   CSVs these skills exist to search. Staged without it, five of the seven
   skills would have arrived broken on a fresh clone.

Nothing else was touched. Their scripts are Python 3 with no third-party
dependencies, so they run without the project venv:

```bash
python3 ".claude/skills/ui-ux-pro-max/scripts/search.py" "<query>" --domain style
python3 ".claude/skills/ui-ux-pro-max/scripts/search.py" "<query>" --design-system -p "Name"
```

## What has and has not been checked

Verified here: the skills load as project skills, `search.py` returns real
results from the bundled CSVs (`--domain style` smoke-tested), the repo's own
test suite does not walk this directory (`tests/` scanning is scoped to `docs/`
and `frontend/`), and `ruff check .` is unaffected.

**Not checked: any design output.** These skills mostly target React / Next.js /
Tailwind / shadcn stacks. MemoryMap's frontend is vanilla JS and CSS custom
properties under `docs/DESIGN.md`, enforced by `tests/test_style_scale.py`.
Treat their palette, type and UX advice as input to a decision; the design
system in `docs/DESIGN.md` still wins on anything that lands in `frontend/`.
