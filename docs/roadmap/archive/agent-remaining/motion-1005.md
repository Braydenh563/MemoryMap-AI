# motion-1005: the motion polish pass, Interface animations

Worktree `agent-a86809db022c80bc8`, cut from `claude/notes-flow-rebuild`.
Sweeps on port 8816, data `/tmp/mm-motion`; `scratchpad/ui-sweeps/motion1005.js`.

## Landed

- 4489b54 Interface animations (Appearance, Effects & accessibility, on by
  default, `data-ui-motion`, `--ui-*`); the reduced-motion blankets still
  the animations and leave transitions to the switch; decorative surfaces
  (Atlas, graph, whiteboard) keep reduced motion.
- d8183cf One sliding indicator for every strip (`glideStrip`, the strip's
  `::before` moved by `transform`); the anchored inset glide and the top
  bar's own box are gone; glide.js and tabglide.js folded into motion1005.js.
- 3f8bb53 The polish set: press (0.97 and a deeper ground), focus ring
  eases in, hovers ease (no shadow animates), menus and popovers grow from
  their opener (grow 1ms late, placement unaffected) and close over
  `--ui-exit`, dialogs leave the way they came, lists settle in where their
  skeletons were, toasts arrive from their edge and stack by `translate`.
- docs: CHANGELOG, DESIGN.md (Motion, Interface animations, recipe rows),
  HISTORY (UI_MODERNISATION Phase 4 item 2), the Guide's Appearance topics.

- cb89715 no nested sub-tab fade (it doubled a tab switch's missed frames),
  chips press, docs.
- merge of claude/notes-flow-rebuild at 2ad4baa: perfpolish's menu exit
  kept (escaped menus go home after the exit) with the grow's path back on
  `--ui-exit`; tour.js made a lazy bundle (`tour`, stand-ins `openTour` and
  `renderTourReplay`) because the merged boot JS was 866 bytes over the cap
  (the branch alone 344 over): 10,302 under after; boot CSS 23 under after
  folding thirteen row hovers into the one hover rule.

## Left

- A row added or removed after a list's first render does not fade: the
  lists redraw whole (DESIGN.md says why); needs keyed rendering first.
- Help popovers and the phone's action sheets close at once (a popover goes
  home and a sheet is removed on close, which cancels a transition).
- A sub-tab's panel does not cross-fade (only its line slides): CSS cannot
  tell a section switch from its page arriving; needs a class set by
  `showNotesSection`.
