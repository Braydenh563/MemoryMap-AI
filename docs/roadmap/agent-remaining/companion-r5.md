# Agent: the companion, round 5 (overnight)

Worktree `.claude/worktrees/agent-a42ac8319ec33be28`, merged with
`origin/fix/gemini-fixes-5` through the night. Port 8805, data dir
`/tmp/mm-companion`. Rounds 1 to 4 are in
`docs/roadmap/archive/agent-remaining/companion-426.md`.

## Done

- `adc2ac1` the avatar lab's three inline style attributes (the CSP
  warnings; also fixed on the branch at 7215f16, whose version was kept).
- `3ecadd4` six reactions to real app events, each rate-limited, none under
  Reduce motion: a long note read along, a private note's eyes covered, the
  graph's new layout peeked at, a longer streak cheered once, a night yawn,
  a toast looked at (`companionreact.js`).
- `d15187f` petted, tossed, eyes on a near pointer (`companioninteract.js`).
- `2711f02` the `companionmenu.js` flake: a scroll's event comes a frame
  late and closed a menu opened in that frame (menus.js); 17 of 20 provoked,
  0 of 80 after.
- The edge pin is kept as decided (round 4).
- `18b32a6` the review finding: a walk laid out and repainted Atlas every
  frame (its leg steps inside the svg, unpaced while walking); paced from
  its first step, paints 120 -> 39/s and layouts 60 -> 20/s
  (`atlaswalk.js`).

## Remaining

1. Changing the graph's layout throws `setGraphPhysicsEnabled is not
   defined` (navigation.js, since the app.js split). Not the companion's.
2. A note opened other than by its row or Show more (search, a link, the
   palette) does not yet count as "opened" for reading along.
3. The toss is mouse and touch alike; on a phone a quick swipe on the
   companion tosses it, which was not tried on a device.
4. The rest of the walk's cost is Atlas's legs repainting their svg twenty
   times a second; legs in a layered svg root of their own (as round 4 did
   for its idle loops) would make it the compositor's. That is atlas.js.
5. The full suite once failed
   `test_unlock_throttle_per_client.py::test_the_guesser_is_still_throttled_after_the_owner_unlocks`
   under load (average 7); it passes alone. Not the companion's.
