# Agent: the companion and the faces, INBOX 426 c to g and j to p

Worktree `.claude/worktrees/agent-a42ac8319ec33be28`, merged with
`origin/fix/gemini-fixes-5` at `feb28bc`. Port 8805, data dir
`/tmp/mm-companion` (`bash scratchpad/ui-sweeps/serve.sh 8805 /tmp/mm-companion`).

## Done

- `7698576` c, j, k (arms): parts framed 7 units wider (an SVG group's box
  leaves out its stroke), the holding arm kept while hanging, the rude
  gesture removed, a test that every named gesture is drawn.
- `4ec5ded` d, g, k, l, m, n, o, p: the companion rides with its panel,
  moves on its own beat, never fades elsewhere, pinned never moves, Call
  back in its menu, Appearance and the palette, its menu opens beside it,
  a new profile name redraws it.
- `2c529d7` e: Your own character as the companion.
- `de3c2db` f: what a face holds shows in its head mark again.

Sweeps: `scratchpad/ui-sweeps/companionscroll.js` (exits 1 on a glue error
over 2px, a frame step over 45px beyond its panel, or any opacity under 1;
PASS at 1440x900 on Notes and on a dashboard widget) and
`companionbeats.js` (fast tab switching, pin, resize, menu, call back, idle
loop). Proof in the main checkout's `scratchpad/shots/companion-426/`.

## Remaining

1. Not measured on real smooth scrolling: headless wheel steps are 40 to
   120px jumps, so the one-frame main-thread lag behind a compositor scroll
   on the owner's machine is reasoned, not observed.
2. The desktop window (pywebview) was not driven; the menu offset in 59.png
   did not reproduce at any scroll here, and the fix anchors to the
   companion's own box whatever the cause.
3. A panel that moves by a transform (not a scroll, a resize or a layout
   change) is caught by the 2s look, eased over 300ms, not per frame.
4. Neither sweep is in `scripts/gate.sh`'s sweep list yet.
5. `gate.sh --changed` runs most of the suite on this branch (everything
   differs from `origin/main`) and was stopped at 79% with no failures;
   the targeted tests and `--staged` pass for every commit.
