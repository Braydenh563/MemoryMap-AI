# Companion physics and perch (stopped mid-run, 2026-10-17)

Done (committed): e4515bf carry and flight no longer restyle the page tree each frame; d675e3c Atlas rig reads style once before writing any (thrown Atlas 29 to 58 fps); the perf agent's branch is merged in (27ec556 --nmb-sway fix).
In the working tree (WIP commit): avatars.js edit and tests/test_companion_throw.py, a failing test written first for the next fix ("failing for the right reason", fix not yet written).

Still to do: finish that fix; the perch-loss repro (resize, scroll, hide the perch element, switch surface, re-render) and re-anchor or fall; re-measure drag and throw frame times with 4x CPU throttle; list the top three app-wide frame costs. Not started: the throwing-stars animation and new actions (an Opus brief, B87c/B88b/c).
