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

## Left

- A row added or removed after a list's first render does not fade: the
  lists redraw whole (DESIGN.md says why); needs keyed rendering first.
- Escaped menus and help popovers close at once (they go home on close).
- The tab page fade (INBOX 580, shortened to 120ms here) costs frames in
  headless software compositing; see the report's frame numbers.
