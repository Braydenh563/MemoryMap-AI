# iconalign-skel-1005 (2026-10-05)

Done
- INBOX 542 (icon and text alignment): ran the existing `iconalign.js` (9 views, 1440 and 390, light and dark, default font and `FONT=segoe`) and `badgealign.js`; no new sweep or rule. Real outlier fixed: the Timeline row's mark sat 1.2px (Segoe 2.2px) above its title (`align-content: center` on the row, title start-aligned; `tests/test_icon_label_align.py`). Pairs over 1px: 26 to 12 (default font), 14 to 0 (Segoe).
- Skeleton loaders: `scratchpad/ui-sweeps/settings-skeletons.js` (API held 800ms) found 10 empty lists in 8 Settings panes; Packages, embedding models, Skills, Tools, Personas, Backups, Privacy and Account now show `.skeleton` rows (1 left, see below). Dashboard, notes list, Timeline, Library, Graph were already covered (INBOX 596, 598, 602) and measure `ok` in `skeletons.js`.

Left
- `badgealign.js` still measures against the x-height band (INBOX 503) while the recipe's target is the capital centre (INBOX 592): it prints 1.0 to 1.8px "outliers" for link, skill-fact and item-fact chips that are 0.5 to 1.0px from the capital's painted ink centre (`/tmp` probes, DPR 1 and 3). Decide the target in one place and move the sweep to it.
- `iconalign.js` prints 1.17px for the Installed badge and the search result chips in the sandbox font (fractional box against a snapped baseline); 0.95px in Segoe. Painted ink is 0.5px (DPR 1).
- Settings, Models pane: "Checking the models…" shows as a bare line until the first status answer; its lists are skeleton-ready (`status.js`) but the sweep never caught the null-status frame.
- Settings, What it learned, What it remembers, Logs lists and the skill tool picker were not given skeletons: the sweep showed no blank frame in the first three after the fix pass (they draw from already loaded state or a stream) and the picker sits in a closed form.
- Windows rasteriser at 125% and 150% scale not verified.
