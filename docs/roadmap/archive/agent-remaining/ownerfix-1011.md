# ownerfix-1011 remaining (Sonnet agent, branch agent/ownerfix-1011)

Built (INBOX 803 items 1, 2, 3, 5, 6, 7 and INBOX 812 items 8, 9): see the commits; sweeps in scratchpad/ui-sweeps/ (linkicons.js, constellationtheme.js, capturegutter.js, snippetbar.js, companionask.js). Nothing here is pushed.

## Not built

- INBOX 803 item 4 (the empty squashed box under the read text in the OCR workspace's right column): not reproduced. The owner: "there is an awkward squashed text box at the bottom of the right text area". Measured at 1440x900 and 1366x640 in five states (reading from stored text, a Tesseract-style read with real boxes, with and without a second stored reading, 24 sections scrolling, nothing read yet): every child of `.ocr-regions` that is drawn has content; the only empty one is `#ocr-region-list` in the nothing-read state (an empty `ol`, 305px, no border or ground, so nothing is visible). Needs the owner's screenshot, or the state it appeared in (reader, file kind, window size). Suspects not ruled out: a real RapidOCR read on a PDF (stored page reads), the Edit text panel (`#ocr-edit-panel`, library.js `ocrOpenEdit`), a region answer card (`#ocr-region-results`).

## Found, not fixed

- Capture box: the first click still moves the text 2.4px down and 1.6px left (the formatting strip grows from its collapsed 40px to its expanded 42.4px: `.doc-toolbar.is-collapsed` pads its bottom by `--space-1`, the expanded row mode by `--space-1` plus the scrollbar strip; and CodeMirror's line padding is 1.6px under the textarea's). scratchpad/ui-sweeps/capturegutter.js prints both. 05-sidebars-themes.css:1958 and 07-whiteboard-misc.css:2937.
- Constellation stars' contrast in light: the worst hue (yellow, hue 60) is about 2.1:1 on the new well (core lightness 40), 1.46:1 before on white. Decorative, with the legend naming each cluster, but a stricter 3:1 would need the yellow stars drawn at lightness 30 or less (dashboard.js, the star `p.fill` in `scene`).
- The theme-change cross-fade could only be measured on the veil's opacity (13 to 20 frames in the headless run, one 565ms main-thread stall at the switch itself); the stall is the app repainting for the new theme, not the sketch.
- Select button in the Notes bar is 28x28 only below 1400px (its word shows at 1400 and up, 90px wide, by design); the rows/cards toggle beside it is 28x24.
