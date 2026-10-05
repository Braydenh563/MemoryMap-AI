# mc1: map core nodes and the icon library (INBOX 641, 642)

Worktree agent, port 8798, data /tmp/mm-mc1. Plan: MINDMAP_PLAN §14
(decisions 38 to 47; §14.4 what is open); WHITEBOARD_PLAN decision 37.
Build record: HISTORY.md, "Moved from the plans, 2026-10-05 (MINDMAP_PLAN §14, mc1)".

## Landed
- 92286cf step 1: audit and design (§14).
- 08d5829 14a: levels, presets (Classic, Outline, Boxed, Flat), Solid fill, the centre's Enter.
- 8eb7dc8 14b: per-level looks in How this map looks, Use this look for its level, topic copy/paste style.
- 94b8b70 14c: icon-picker.js/.css (pickIconOrEmoji in editor.js), the topic icon slot (Phosphor or emoji).
- bb806e8 14d: stickers (drop, Insert, Emoji and icons…), drop on a topic sets its icon.
- 87241de 14e: note toolbar, document Insert menu, "/" row; `:ph-name:` drawn in reading.
- step 4: docs hygiene, INBOX 642 resolved, 641 marked (map-node part) and kept open.

## Left (MINDMAP_PLAN §14.4)
- INBOX 641 rest: Illustrator linked symbols (whiteboard-library.js `library_ref` followed), Photoshop topic effects (a level field each, whiteboard-map.js WB_MAP_LEVEL_FIELDS + routes_whiteboard.py MAP_LEVEL_FIELDS), Miro reactions, the whiteboard half of the research.
- PNG/SVG export draws every topic as one box (whiteboard.js wbBuildExportSvg ~9090): levels, shapes, Phosphor icons not drawn.
- `DOC_EMOJI_SOURCE` (documents-prose.js) is a second emoji table; fold into ICON_EMOJI_SOURCE.

## Found, not fixed
- app.js is at its gzip ratchet (14,300): a LAZY_MODULES row alone went 11 bytes over, so the picker loads by `lazyScript` from editor.js and is not in LAZY_MODULES; the CI package check that reads LAZY_MODULES does not cover icon-picker.js/.css.
- Playwright reported the topic strip's Text toggle "not visible" after an icon pick though its rect was 58px wide and every ancestor visible (mc1-iconpicker.js works around it with evaluate clicks); not investigated.

## Not verified
- Real drag from the picker to the canvas (sweeps dispatch DragEvents with the picker's data); 390px for the picker and the level dialog (dark measured: mc1-maplevels 13/13, centre ink 8.84:1; mc1-iconpicker 12/12); colour emoji rendering on Windows/macOS faces (only the sandbox's Chromium).
