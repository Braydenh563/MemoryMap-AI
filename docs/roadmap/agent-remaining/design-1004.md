# Design 1004: what is left

Four items, all done; the accounts are in HISTORY.md, "Moved from the plans,
2026-10-04 (design-1004)".

1. One filled button per dialog: `PRIMARY_RATCHET` gone, strict, the four
   stage-gated pairs hand the fill over with `stagePrimary` (`STAGE_PAIRS`).
2. Meta chips: 13 rules to 0; a pressable chip is styled through
   `.chip-interactive`; `META_EDGED` keeps two edges by name.
3. The viewport popups with the background art on: measured clean
   (`scratchpad/ui-sweeps/popupsart.js`), no app change.
4. The document's first line on a phone: Read view 255 to 199 at 390x844
   (`scratchpad/ui-sweeps/docphonetop.js`).

## Still open, in the order to take them

1. **The chat model panel with a model connected.** `popupsart.js` cannot
   open `#chat-model-panel` without a configured chat model
   (`openChatModelPanel` returns); it is a child of body, so no card can trap
   it, but its rows were not measured. Sonnet, with `scratchpad/llama-dev.sh`.
2. **The chat dock's select menus at 390.** The selects live in the How it
   answers sheet there; the sweep measures the sheet, not a select opened
   from inside it. Sonnet: open the sheet, then the opener inside it.
3. **WORLD_CLASS_PLAN 1.2's wording and DESIGN.md's label recipe disagree**
   on whether a status is meta (no edge) or a label (hairline box). Taken
   here: the label recipe, the later and more specific decision (INBOX 461),
   kept by name in `META_EDGED`. If the owner wants statuses edgeless, it is
   one rule (`.chip.item-label`'s border) and the set entry.

## Not verified

- A real phone: `popupsart.js` and `docphonetop.js` run Chromium's touch
  emulation at 390x844.
- The art's actual pixels behind a popup: every popup measured has an
  opaque ground (alpha 1), so contrast is the ground's, not the art's.
