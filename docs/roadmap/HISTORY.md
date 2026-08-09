# What is already done


> **The other three:** [ROADMAP.md](../ROADMAP.md) (live work) · [BACKLOG.md](BACKLOG.md) (§1–§29) · [ANALYSIS.md](ANALYSIS.md) (§30–§34, including the licence constraint — AGPL-3.0 now) · [HISTORY.md](HISTORY.md) (already built).

Split out of `ROADMAP.md`. Kept, not deleted, for one reason: **three sessions
have independently rebuilt something that already existed.** This is the file
that answers "has this been done?" before anyone starts.

## Done in the most recent session — read this first

**This session: the notebook became a graph the whole app can walk, retrieval
learned to read the question, and a pile of reported bugs turned out to have
findable causes.** Written up longest-first, because the first item is the one
the rest builds on.

1. **§9's last mile — one traversal engine, used everywhere (`entry/paths.py`).**
   The graph could always show you *that* notes connect and never *how*. A
   weighted search over links, replies and shared tags answers "how are these
   two related?", and the same index answers "what shape is my notebook?" —
   clusters, hubs, and what is connected to nothing.

   Three decisions worth not re-deriving. **Weighted, not breadth-first**: an
   unweighted search returns the fewest hops, so one shared `#misc` beats a
   three-step chain of deliberate links and the answer is technically a path
   and actually noise. **A tag on more than twelve notes creates no edges** —
   otherwise one heavily-used tag makes everything two hops from everything and
   the feature reports a relationship between any two notes it is handed.
   **Six hops is the cap**, and it is an honesty guard rather than a
   performance one: six intermediaries is not a relationship.

   Surfaced in three places, deliberately the same code: `GET /graph/path` and
   `GET /graph/structure`, the `path_between` and `notebook_structure` tools,
   and the Trace strip in the view. A picture and an answer that disagree about
   what is connected is worse than either alone.

2. **The graph is in every answer now, not just the agent's.** When a note
   matches a search, the notes it *links to* come with it. Links and replies
   only, never shared tags — a tag can put fifty unrelated notes one hop apart
   and this list goes straight into a prompt. Appended rather than interleaved,
   because a connected note is context and a match is an answer, so a budgeted
   prompt drops the context first; the model is told which is which, since
   reporting a linked note as a search hit is a quiet fabrication.

3. **Retrieval reads the question before searching it.** Three changes:
   - **Both searches run and their rankings are fused** (reciprocal rank
     fusion). The old rule was either/or, so a note containing the query
     *verbatim* lost to three notes vaguely on topic. RRF combines by rank
     rather than score, which is what makes it robust — a cosine similarity and
     a keyword tally are not on the same scale, so any weighted sum needs a
     tuning constant per notebook.
   - **A time phrase is a filter** (`search/query.py`). "What have I saved in
     the last week" used to dilute the embedding, drag the keyword search off
     course, and apply no range at all. A question that is *only* about time
     lists the range instead of ranking noise.
   - **The scaffolding comes off before embedding.** "What did I write about
     beans" and "beans" now reach the model as the same search. Front only, so
     "how do I prove bread" keeps its "how".

4. **The agent acts when told to act (§35K).** *"I asked for suggestions on my
   categories, and when I asked it to implement them it just gave the
   suggestions again."* The cause was exact: `focus_for` read the current
   message and nothing else, and "implement those suggestions" contains no
   category word — so the turn was offered **no category tools at all**. The
   model was not being lazy; it had nothing to call. A follow-through is now
   read against the previous exchange.

   Also: it **keeps its own reasoning** across a tool call (it was streamed to
   the user and dropped, so every round re-derived the plan), it **stops
   re-reading** what it already read with nothing written since, and a long
   turn is **checkpointed each round** so a stall no longer loses the whole
   conversation.

5. **§35E — the desktop app stops forgetting.** Theme resetting every start and
   onboarding showing every time were one bug: both lived in `localStorage`,
   which the desktop shell does not reliably persist. Mirrored to the server
   and seeded back for keys the browser has lost. The *store* is watched rather
   than its twenty-two callers, so adding a key to `MIRRORED_UI_KEYS` is now
   the whole of making a setting persistent.

6. **The recycle bin, and a note you can delete for good.** "Empty now" was
   reported broken a third time and driven end to end in Chromium again — it
   works. What was actually wrong: **every failure was silent**, so a 401 or a
   locked database produced exactly what was reported, a click and nothing.
   And notes can now be purged one at a time, sharing `_hard_delete` with the
   bulk path so neither can leave an orphaned embedding behind.

7. **The UI pass.** The chat dock's "weird box shadow" was a repaint —
   `background: var(--card)` inside a card that had already painted it, two 55%
   layers stacking. The composer has a viewport-aware ceiling and a drag
   handle. The metadata line was ranked rather than listed. The graph's twelve
   toolbar controls became four plus a ⚙ fold. The top bar had **five different
   control heights**, all centred on the same line and none agreeing; it has
   one now. The web panel's results went 127px → 82px each.

8. **The GitHub Pages site could never have worked**, and two previous fixes
   aimed at the JavaScript could not have helped: **there was no `.nojekyll`**,
   so Pages converted the `.md` files rather than publishing them and every
   same-origin fetch 404'd. Verified with both CDN fallbacks blocked.

**What was checked in a browser this time** — Chromium, measured: the trace
strip at 900–1920px, the header's control heights before and after, the chat
dock in dark + glass, the web panel's row heights, all seven tabs and fourteen
settings sections for console errors and overflow, the bin's Delete-for-good
end to end, a `localStorage` wipe to reproduce the desktop shell, and a paced
NDJSON stream to settle §35H.

**And drag-to-link was shipped broken, then fixed, because it was driven.** It
was written, reviewed, committed and described in a commit message as working —
none of which is evidence. Driven with a real mouse it did nothing: the target
lit up, the release linked nothing, every time. **Dragging reheats the
simulation**, so every other node keeps drifting while you aim; between the
last mousemove and the mouse-up the target moves out from under the pointer,
and the hit test at release finds empty space. It links the note that *was
lit* now, which is also what the person saw happen. The slop went from 6px to
14px for the same reason — a 9px circle that is moving is not a 15px target.

Two of the three attempts to test it were wrong before the app was: pressing at
the centre of the node's `<g>`, which is the empty space between the circle and
its label, and reading `window.graphNodesRef` for a module-scope `let`, which
is not a property of `window`. Worth knowing for the next session that tries.

**So every other gesture built this session was driven too, and a second one
was broken.** Dragging the chat composer taller stored the new height and
snapped the box straight back to one line — immediately, before a keystroke —
because `autoGrow` took `min(scrollHeight, limit)` and an empty box is one row
tall. A hand-set height only ever worked as a ceiling. It is a **floor** now,
which is what "manually adjustable" means. The other three held: Trace from the
node popup, the cluster legend, and a notification row from the keyboard.

**The pattern is worth naming.** Both failures were in code that reads
correctly, was reviewed, and was described in a commit message as working.
Neither was findable by reading — one needed a moving target, the other needed
an empty box — and both took under five minutes to find with a pointer. *Two
out of five gestures built in one session were broken on arrival.* That is the
base rate to assume, not zero.

**§35H's client half turned out to be already fixed.** Driven with a stream
emitting one line every 120ms, the answer element grew 10 → 25 → 42 → 63 → 94
characters inside a plan run: the step timeline uses `liveMarkdownRenderer` and
renders each delta. The LaTeX half is done too (`unlatex`). What remains
possible, and is *not* disproved, is the server side: `_ToolTextGate` holds
text back while deciding whether it is a tool call, so a model that writes tool
calls as prose would still look like it lands complete. That needs a real
model.

---

## The session before that

**Long jobs finish, the agent can plan one, and the chat
controls moved to the composer.** Three user reports and the roadmap's top
open item, and they turned out to be one subject — an agent that starts a big
job and does not finish it.

1. **Rounds are earned, not granted (`agent.EARNED_ROUNDS`).** Reported: *"it
   hits a limit for tool calls which has happened quite a bit."* A flat cap
   cannot tell a model doing eight useful things from one doing the same thing
   eight times, and "tag these eight notes" is eight writes plus a search. A
   round that makes a *new, successful* call now buys another round, to a
   ceiling of `MAX_ROUNDS + EARNED_ROUNDS`. A loop earns nothing and stops
   exactly where it always did — the tests pin both directions.

2. **A stalled step is not a finished one, and a run can be resumed.**
   Reported: *"skills cut out half way through and have to restart."* Two
   bugs. The runner could only see that a step's turn produced text, and "I
   couldn't finish step 1" is text — so a step cut off mid-job was ticked ✓
   and the next step ran on top of half-finished work. The `limit` event
   separates them; a stalled step stops the run and `stopped_at` names it, so
   **Resume from step N** re-enters there instead of re-running steps that
   already wrote to the notebook.

3. **`make_plan` — the agent plans an open-ended job (§35K).** *"I will say
   fix my categories and it will only merge two categories and leave it at
   that."* The model draws 2–6 steps, its turn **ends**, and the skill runner
   works through them a step per turn. **A plan is a skill nobody saved**, so
   there is one runner rather than two, and a plan gets the plan card, the
   ticked steps and an Undo on every change for free. A run may not start a
   run (`tools.RUN_STARTERS`).

4. **The chat controls moved to the composer dock (§36B).** Asked for
   directly. Anything that decides what happens to the *next* message sits
   with the box you type it in; the header keeps only what is about the
   conversation. Every id unchanged, so `app.js` needed no edit at all.

5. **The tab bar's edge fade** no longer dims the Reminders tab when there is
   nothing beyond it (§36A-bis).

6. **§35I's manual half — `🗜 Compress`.** *"There should be a tool as well as
   a manual command… to compress chat context on longer chats so the AI can
   better continue."* The button and `POST /chat/compress` are built; the
   agent-facing tool is not, deliberately (§35I). **The useful finding is a
   correction to the premise:** a long chat never overflowed the window — the
   client sends at most four turns and `fit_history` drops whole pairs from the
   oldest end — so the real failure was silent forgetting, and a summary beats
   a drop rather than merely costing less. Nothing is deleted: the endpoint
   stores nothing, every turn stays on screen and in the saved conversation,
   and undo is one assignment.

7. **The app was opened in a real browser for the first time**, which is the
   most useful thing in this list. Chromium and Playwright are in the sandbox
   and the app runs on localhost — see CLAUDE.md for the recipe. One sitting
   found three things reading the source had not:

   - **`StaticFiles` sent no `Cache-Control`**, so a cache may reuse the
     frontend without asking (RFC 9111 §4.2.2 heuristic freshness). The
     desktop shell has no reload and its own on-disk cache, so after an update
     it can keep running the old `app.js` — *the standing explanation for "that
     button is still broken" about a button whose fix is in the file.* Now
     `no-cache`, pinned by `tests/test_static_freshness.py`.
   - **The reminder poll ran on two timers**: §36C's rewrite left the Wave O
     poller's `setInterval` behind, and JS keeps the last declaration, so the
     stray timer drove the live poller. Measured 4 → 2 requests per 65s.
   - **The tab strip clipped "Dashboard"** at the widths a laptop window
     actually uses. It takes its own row now when measured not to fit.

   The recycle bin's *Empty now* — reported broken again — was driven end to
   end: dialog, confirm, notes gone, server reports an empty bin. It works.
   That is what pointed at the cache header rather than at the button.

**The standing caveat is narrower now.** The provider tests still run against a
fake transport. The UI can be looked at, and 4, 5 and the tab bar were —
measured and screenshotted at five widths. 6's compress panel was not, and
neither were the Continue/Resume buttons. `tests/test_chat_dock.py` and
`test_style_scale.py` still stand in for looking at those, and they check
structure, not appearance.

**Everything below is from earlier sessions.**

---


**This session: §6, §11's output half, model specs, and odysseus read and
triaged (§33).** Four things landed, and they are related — each one made the
next cheaper.

1. **§6 — every OpenAI-compatible backend, not an LM Studio special case.**
   `ai/provider.py` holds what was never Ollama-specific; `ai/openai_client.py`
   is the second dialect; LM Studio, llama.cpp, Jan, vLLM and Ollama's own
   `/v1` all arrive together. Full write-up in §6, including the two things
   the plan did not predict (streamed tool-call fragments are keyed by an index
   and interleave; `loaded_context_length` has to beat `max_context_length`).

2. **The window is reported, not just budgeted.** Every message says how full
   the model's window got — `3.9k/8k window (48%)` — and turns
   warning-coloured past 80%. A raw token count never answered the question
   anyone has, which is whether the *next* turn is the one that starts dropping
   the top of its own prompt. Counts a server won't report are estimated from
   characters and marked `~`, because a guessed number the user believes was
   measured is worse than a blank.

3. **§11's output half — quick / normal / detailed.** One picker moves the
   reply cap, the temperature, the thinking toggle and a length hint together.
   `normal` is byte-for-byte what every turn got before, and a test says so.
   Deliberately a preset rather than automatic routing: choosing by task needs
   a "how hard is this turn" judgement that is itself a model call, and it
   fails by being wrong confidently rather than obviously.

4. **The model's actual specs are read.** Ollama's `/api/show` has been
   reporting parameter count, quantisation and a `capabilities` list all along;
   the app read one field and ignored the rest. Reading `capabilities`
   immediately caught a bug in the preset built three hours earlier — `quick`
   would have sent `think: false` to models that reject it, failing every turn.
   `supports()` is **tri-state**: True, False, or None for "this backend does
   not say", and None is never treated as False.

**One security item, from odysseus's `url_safety.py`.** The backend address is
now a setting, which makes it the one setting that can send notes off this
machine. Link-local (the cloud metadata range) is refused; loopback and LAN are
the normal case and are allowed; anything else is allowed and *warned about*,
because the app's promise is that notes stay here. The check order turned out
to be load-bearing and the first version was wrong: Python classes
`169.254.0.0/16` as both link-local and `is_private`, so an allow-private rule
running first waved the metadata address straight through. Both overlaps have
a test naming them.

**Everything below this line is from earlier sessions.**

---


Newest at the top. Everything here is on `main` (or the branch merging into
it), verified, and must not be rebuilt.

**The whole prompt is budgeted against the model's window now — this was the
"maxed out token window" failure, and it was real.** Asked directly: *"make
sure the AI can run as efficiently and effectively as possible… I don't want
it being too prompt and context heavy and then taking ages to respond or
failing due to a quickly maxed out token window."*

Measured before cutting, as §11a insists. **Nothing added the parts up.** Each
cap was individually reasonable and set in a different session against a
different concern:

| Part | Chars | Tokens |
| --- | ---: | ---: |
| System prompt | 2,416 | ~604 |
| Tool schemas | 4,096 | ~1,024 |
| History (4 turns) | 5,800 | ~1,450 |
| Notes (10 × 900) | 9,000 | ~2,250 |
| Tool results across a loop | 24,000 | ~6,000 |
| **Worst case** | **45,312** | **~11,328** |

Against a 4,096-token window that is **2.8× over**, and the tool-result cap
alone exceeded the whole window by half. Overflow is dropped from the *front*,
which is the system prompt — so it never raised, it just stopped the model
knowing it had tools. `ai/context.py` now derives every share from what is
actually left after the system prompt and a reserve for the reply, so the
worst case fits every window exactly, and a 32k model gets **more** than the
old constants ever allowed (they were sized for the smallest case and applied
to everyone).

**Two things were sent to Ollama for the first time**, and the second is the
subtle one:

- `num_predict` — the reply was unbounded. Output tokens are generated one at
  a time, so they dominate wall-clock; an unbounded reply is the commonest
  reason an answer "takes ages".
- `num_ctx` — **Ollama runs a model at its own default (commonly 4,096)
  regardless of what the model was trained for.** So reading 32k from
  `/api/show` and budgeting against it, *without also asking for 32k*, would
  have reproduced the exact overflow the budget exists to prevent. The number
  budgeted against and the number requested are now the same one. Capped at
  8k by default because the KV cache scales with the window and a 7B at 128k
  wants gigabytes a laptop may not have — `max_context_tokens` raises it.

**Tools are fitted to the model, not to a constant.** Asked directly — *"if
adding more tools is an issue, can we change or improve how tools are used so
that doesn't become an issue?"* — after four category tools took the all-tools
overhead within ~180 characters of a 4096-token window. The answer was that
4096 is Ollama's *fallback when a model declares nothing*, not a fact about
any model anyone runs. `tools.within_budget` now fits the schemas to the
window the model reports via `/api/show`, drops the least relevant when they
do not fit, and logs what it held back. A 16k model gets the whole registry; a
genuine 3B gets a prioritised subset instead of silently losing its system
prompt off the front. **§14's list is open again** — see the table there.

**§1's live log console is finished, and there is a support bundle.** The
Logs screen streams now — NDJSON over `fetch`, **not** the EventSource this
document suggested, because EventSource cannot set headers and this app
authenticates with `X-Auth-Token`; the usual workaround puts the token in the
query string, which on the log endpoint would write it into the records it
protects. Follow/tail pauses when you scroll up and resumes at the bottom;
level, source and text filters re-draw what is held rather than refetching;
tracebacks fold; server and browser records are merged into one time-ordered
list; errors that land while you are elsewhere badge the nav.

The **support bundle** button zips the log, redacted settings, app/model
status and row counts. It is an **allowlist**, not a denylist: named
diagnostic settings go in verbatim, everything else is reported as
`"display_name": "str, 31 chars"`. A denylist would have to predict every
sensitive key anyone ever adds; this only has to name the ones that help.
Nothing is transmitted — that is the whole difference between this and the
crash reporting §30 turned down.

**Copying an error out was the follow-up ask, and it found something bigger.**
Per-record copy buttons (traceback included), a Copy traceback button, a
clickable error badge that filters to errors, and an honest "Copy 12 shown"
label. Underneath: **every copy button in the app only worked on localhost.**
`navigator.clipboard` exists only in a secure context, `http://localhost`
qualifies, and nothing else does — so a LAN address or a tunnel turned every
copy in the app into a no-op that said "couldn't copy". Three tiers now:
the modern API, `execCommand` for plain http, then a dialog with the text
pre-selected.

Four bugs found while building this, none of them by the existing suite:
the live pill kept reading "● live" after the stream was deliberately closed
(the abort path returned before updating it — found in a browser); the stream
dropped every record that arrived in its last poll interval before handing
over to the client's reconnect (the deadline was checked before the drain —
found by a test that had to be written first); both toolbar dropdowns
collapsed to their arrows (a flex item's automatic minimum size does not
protect a `<select>`, and one of the two only looked right because an earlier
change had given it a `max-width`); and the traceback fold was laid out as a
fifth *column* of a single-line flex row, squeezed to a few characters against
the right edge — the row needed to wrap and the fold to claim `flex: 0 0 100%`.

**The security tier at the top of the priority map is closed — all seven.**
Full detail is up there with each item; the short version:

- **Three were already built**, and the audit is what established that: WAL
  mode, the unlock-gate backoff, and the KDF (scrypt n=2^15 — memory-hard,
  so stronger than the PBKDF2 the item would have settled for). All three are
  now pinned by tests rather than left to be rediscovered a fourth time. This
  is the fourth session in a row where a "grep first" would have saved work.
- **Session tokens expire now**, on an idle clock (12h) and an absolute one
  (7d), and expiry closes the vault as well as dropping the token. SameSite
  turned out not to apply: the token is an `X-Auth-Token` header, not a
  cookie, so no browser ever attaches it cross-site on its own.
- **An Origin/Referer check** (`core/security.py`) refuses requests another
  site's page caused. It matters most *before* a password is set, which is
  the case that looks like it doesn't matter: the gate is open then, and a
  drive-by `POST /auth/setup` could have claimed the notebook.
- **A strict CSP** — no `unsafe-inline`, no `unsafe-eval`, no host named at
  all. The eight `style=""` attributes in `index.html` moved to `style.css`
  to make `style-src 'self'` honest, and the one inline `<script>` (the
  pre-paint theme block) is allowed by a **hash computed from the file at
  startup**, so editing that block can never leave a stale hash and a blank
  page behind.
- **SearXNG's docker path was publishing to the LAN.** `-p 8888:8080`
  publishes on every interface, and docker's own firewall rules mean a host
  firewall set to refuse it never sees the packet. The source path was always
  correct; only docker was wrong. Containers created by earlier versions are
  detected and recreated, because publishing cannot be changed after create.

**One shipped feature broke, and 757 green tests did not notice.** Custom CSS
(Settings → Appearance) applied itself by injecting a `<style>` element —
exactly what the new `style-src 'self'` refuses. It now adopts a constructed
stylesheet, which keeps the feature *and* the strict policy. Found by driving
Chromium and reading the console, which is the only place a CSP violation
surfaces. **Don't redo:** `core/security.py`, the session TTL, the moved
inline styles, the SearXNG publish fix, `tests/test_security_boundaries.py`.

**Skills are jobs now, not saved sentences (§21, the top item).** Steps, a
tool allowlist, declared inputs, and a plan drawn in the timeline before
anything runs. `save_skill` takes steps and tools, so the AI can write a real
one. The built-ins moved from `app.js` to `ai/skills.py` and are served from
`GET /skills`.

**And running one is a job, not a paragraph.** `ai/skill_runner.py` executes
one step per turn, so the app knows where it got to: steps tick off as they
finish, a failed step is named with its reason and stops the run, and the run
ends in a list of what changed with **View** and **Undo** on each row. The
undo is a tool call captured before the write and replayed through
`POST /chat/tools/execute`. Every built-in was rewritten as a real job with
steps and declared inputs, asked for in one dialog before the run.

Driven in Chromium: chips load from the server, the editor saves and refuses
a bad skill by name, the input dialog refuses a blank required field, steps
tick and a failure shows its reason, Undo really undoes it, the whole run
replays after a reload, 0px of horizontal overflow, no page errors.
**Don't redo:** the skill schema, the runner, the allowlist plumbing, the
editor, the plan/step/result UI.

**SearXNG installs and runs.** Five separate bugs, three of them fatal on
every OS and none of them visible in the log, because they all happened
before SearXNG wrote a line: the repository cannot be checked out on Windows
(four filenames contain a colon), `pip install -e .` cannot build it at all
(its setup.py imports a runtime dependency), a plugin downloads a file at boot
and kills the process if that fails, `os.kill(pid, 0)` terminates the process
on Windows instead of checking it, and `rmtree(ignore_errors=True)` leaves a
git checkout half-deleted there while reporting success. Verified end to end
here — installed, started, answered its JSON API, passed the app's own probe.
Full write-up in §8b. **The two Windows-specific fixes are unverified on
Windows** — ask the user.

**Web search has its own settings screen now.** It was four controls two
thirds of the way down Preferences, which is why every error message saying
"Settings → Web search" pointed at a screen that did not exist. It is now
`settings-websearch`, listed under "The AI" in the nav, with a real engine
picker: `auto` / `searxng` / `duckduckgo`, stored as the `search_provider`
preference. **"SearXNG only" does not fall back** — that fallback was wrong
for the one person who most wants SearXNG, someone running it so their
queries stay on their own network. The provider list is served from
`GET /websearch/providers` rather than written out in `app.js`, so the radios
cannot offer something the API rejects, and both the HTTP route and the
agent's `web_search` tool read it through `websearch.settings_from(config)`.

**SearXNG is now debuggable, which it was not.** Its stdout and stderr went to
`DEVNULL`, so "SearXNG started but never answered. Check the port isn't in
use." was a guess, and the same guess every time. Output now goes to
`data/searxng/searxng.log`, the tail is quoted in the failure and shown in a
fold on the settings screen. Alongside it: a **port answer** (free / held by a
working SearXNG / held by something else — only the last is the user's
problem) and a **↻ Reinstall** button, because a part-finished install makes
`source_installed` say yes while the process dies instantly, and there was no
way back short of deleting folders by hand.

`_reason()` also stopped reporting pip's parting "[notice] To update, run:
… --upgrade pip" as the cause of every failed install. It took the *last*
line; that notice is always last.

**The CodeQL alert list is closed**, and two of the thirteen were real:

- The SearXNG *search* path resolved the hostname to check it and then handed
  the hostname to `requests`, which resolved it again — the DNS-rebinding
  window the reader path closed months earlier, still open here. The probe
  pinned; the search that followed it did not. Both now go through one
  `websearch._searxng_target`.
- `execute_tool` could not tell a message a handler wrote from whatever
  `int("abc")` happened to say, so stray exception text reached the model and
  the UI. Handlers now raise `tools.ToolError`; everything else is logged and
  reported by shape.

The rest were quality: log injection (`logbuffer.safe_value` at the call site
— `sanitise` only ever ran at the ring buffer, so the terminal saw raw text),
three `except: pass` blocks that now say what failed, the
model_manager↔embeddings and deps↔embeddings cycles (a `Protocol` and moving
`store_quietly` to `deps`), and a test asserting `"example.com" in label`.

**There is now a prompt budget.** `agent.PROMPT_BUDGET_CHARS` caps the system
prompt plus all tool schemas, and `tests/test_prompt_budget.py` enforces it.
Measured: ~3,050 tokens per round, **77% of it tool schemas, not prose**. This
matters because Ollama defaults to a 4096-token window and overflow is dropped
from the *front* — so a 3B model that overflows stops knowing it has tools,
and reports as "the AI won't use tools". See §11a.

**Also done:** a favicon that survives 16px (the old one was drawn at 100 and
had no background, so its white nodes vanished on a light tab strip), plus a
maskable icon and PNG fallbacks; inline markdown in the note list (§22); the
emblem and wordmark on the dashboard (§22); a full README rewrite.

**Don't redo:** the README, the favicon/icon set, the web-search settings
screen, the engine picker, the SearXNG port/reinstall/log work, the prompt
budget, note markdown, the dashboard hero.

---

## A security audit across the whole backlog — all seven closed

Asked for directly: a triage across *everything* in the roadmap for security gaps, not just what had already been reported. Moved here from ROADMAP.md's priority map once every item was done, so that file stays about what's still open.

**Security — worth doing out of turn, regardless of size.** ~~None of these
are large, and all of them are the kind of gap that's invisible until it
costs something. Do these before anything else in this map, not after the
"quick wins" below, even though most of them *are* quick wins by effort~~
**all seven closed.** Three were already built and the audit is what
established that; four were real and are done. `tests/test_security_boundaries.py`
pins all seven, including the three that were already true — a test is what
stops the next audit having to rediscover them.

1. ~~`PRAGMA journal_mode=WAL` (§20)~~ **already built.** `core/database.py`
   sets it per connection, alongside `busy_timeout=5000` and
   `synchronous=NORMAL`. Nothing to do; now pinned by a test.
2. ~~Session TTL, and `SameSite=Strict` if the session is a cookie (§20)~~
   **done.** Tokens now carry an issue time and a last-used time, and expire
   on two clocks: idle (`_SESSION_IDLE_TTL`, 12h) and absolute
   (`_SESSION_MAX_AGE`, 7d). Expiry closes the vault too — an expiry that left
   the data key in memory would be a lock on one door only. **SameSite does
   not apply and its absence is not a gap:** the token travels as an
   `X-Auth-Token` header the frontend sets explicitly, so a browser never
   attaches it to a cross-site request on its own. That is a stronger position
   than a SameSite cookie, not a missing flag.
3. ~~Origin/Referer check on the API (§20)~~ **done** —
   `core/security.py:OriginCheckMiddleware`. A request is refused when it
   states an Origin (or, failing that, a Referer) that disagrees with the Host
   it was sent to; a request with neither is allowed, because that is curl,
   the pywebview shell and the desktop shortcut, and a browser attaches Origin
   to exactly the cross-site requests this stops. `localhost` and `127.0.0.1`
   are treated as one machine on the same port. **The window this matters most
   in is the one that looks like it doesn't:** before a password is set the
   unlock gate waves everything through, which is also when a drive-by POST to
   `/auth/setup` could claim the notebook and lock the owner out of it.
4. ~~Brute-force backoff on the unlock gate (§8b)~~ **already built.**
   `routes_auth._refuse_if_throttled` — one global bucket, five free tries,
   then an exponential wait to a five-minute ceiling, forgiven after 15
   quiet minutes. Now pinned by a test.
5. ~~A CSP header on the app's own responses (§8b)~~ **done, and it is strict:
   no `unsafe-inline`, no `unsafe-eval`, and no host named anywhere in it** —
   every source is `'self'` or a hash. That was only affordable because of the
   no-CDN rule the project already follows. Two things had to move to get
   there, both worth knowing about before editing them back:
   - The eight `style=""` attributes in `index.html` are now rules in
     `style.css`, so `style-src 'self'` is honest. A test asserts the file has
     none left.
   - **The one inline `<script>` — the pre-paint theme block — is allowed by
     the sha256 of its own contents, computed from the file at startup rather
     than written down.** Written down it would go stale the first time anyone
     edited that block, which this document already expects to happen (its
     theme table is kept in step with `THEME_PRESETS` by hand), and a stale
     hash fails as a blank unstyled page.
   Alongside it: `X-Content-Type-Options`, `X-Frame-Options`,
   `Referrer-Policy: no-referrer`, and a `Permissions-Policy` that turns off
   geolocation/camera/payment/usb — deliberately **not** the microphone, which
   voice capture needs.
6. ~~Confirm the KDF behind private notes is slow (§8b)~~ **already true, and
   better than the item assumed.** `core/crypto.py` uses scrypt at n=2^15,
   r=8, p=1 — a memory-hard KDF, so stronger against GPU guessing than the
   PBKDF2 the item would have accepted. The envelope design (password wraps a
   DEK; the DEK encrypts notes) is also why a password change re-wraps 32
   bytes instead of re-encrypting every note.
7. ~~Confirm SearXNG binds to localhost, not the LAN (§13)~~ **half of it was
   already true and the other half was a real hole.** The source path sets
   `SEARXNG_BIND_ADDRESS=127.0.0.1` and always did. **The docker path did not:**
   it ran `-p 8888:8080`, and that publishes on *every* interface, which is
   not what the plain reading suggests. Worse, docker writes its own firewall
   rules, so the port is reachable from the LAN even behind a host firewall
   set to refuse it — the firewall never sees the packet. An exposed SearXNG
   is not just an open port: it is an unauthenticated proxy to the internet
   that a stranger can run searches through, and a log of everything the owner
   has searched for. Now `-p 127.0.0.1:8888:8080`. **Publishing is fixed when a
   container is created**, so changing the run command only protects people who
   never started SearXNG — a container from an earlier version is detected by
   `docker inspect` and recreated. A container it cannot inspect is left alone
   rather than destroyed on a guess.

> **What this cost, and the lesson worth keeping.** The strict CSP broke one
> shipped feature, and **the full test suite — 757 green — did not notice.**
> Settings → Appearance lets you write custom CSS, and it applied it by
> injecting a `<style>` element, which is precisely what `style-src 'self'`
> refuses. It now adopts a constructed stylesheet (`adoptedStyleSheets`),
> which CSP does not treat as inline content, so the feature works *and* the
> policy stays strict — the alternative, `'unsafe-inline'`, would also have
> re-permitted style injected through note text. It was found by driving
> Chromium and reading the console, which is the only place a CSP violation is
> reported. This is the same lesson §8's bug list already carries, arriving
> again by a new route: **a green suite says nothing about what a browser
> refuses to do.**

## Done in earlier sessions — don't redo

**Bugs fixed** (each reproduced and verified in a browser):

| Symptom | Actual cause |
| --- | --- |
| Settings screens cut off, unscrollable | Modal grid row sized to content, so the scroll pane grew past the dialog and was clipped |
| Page scrolled behind open dialogs | No scroll lock; now one observer derives it from whichever overlay is visible |
| Dashboard empty until Edit layout was opened and cancelled | `switchTab` runs before auth, so widgets painted from 401s and never retried |
| "Thinking… Thinking about your week…" | `typingDots()` renders its own label under reduced motion; the caller appended a second |
| Agent answers arrived in one lump | The loop called the non-streamed `chat_tools` — the default chat path was the only one that didn't stream |
| No metadata when tools were used | The meta line was gated on prose existing |
| Couldn't switch search engines "early" | The picker lived inside the Ollama-only block, including the built-in option that needs no Ollama |
| Movement dropdown blank | `bg-motion` missing from `APPEARANCE_DEFAULTS`, so the value was `undefined` |
| "Ask about this" did nothing | It prefilled text for a model that cannot open a URL; now backed by a real `read_url` tool |
| Top bar out of alignment | Header wrapped at every width 720–1400px; after the first fix, clipped "Reminders" from 900–1300px |
| Jump-to-note dead from search, graph, wiki links | `flashEntry` scrolled to a card inside a `display:none` sub-tab |
| Ask query disappeared | The box was cleared on submit, leaving an answer with nothing saying what it answered |
| Reminder controls misaligned | Four different heights (44/42/41/40px), so "centred" gave four different tops |
| Chat + document sidebars scrolled away | A later ID rule set `position: relative`, outranking the sticky rule |
| **Reminder 5 min ahead read as 10 hours overdue** | SQLite drops the timezone; JS parses naive date-times as *local*. Fixed with a UTC-aware column type covering every table |

The whole of §8's reported bug list has since been closed as well — see that
section for what each one turned out to be.

**Fixed in the session after that**, each reproduced in Chromium first:

| Reported as | What it actually was |
| --- | --- |
| The thinking arrow clashes with the chain circles | `list-style-position: outside` draws the `<details>` marker *outside* the summary's box — exactly where the rail's gutter is. No gutter width could clear it; the native marker is now removed and redrawn inside the summary |
| "MemoryMap AI" is gone from the top bar | Twice my own doing: I moved the hide breakpoint (1390, then 1080) instead of fixing why it hid. `h1` had `flex: 0 1 auto` + `min-width: 0` with `white-space: nowrap`, so the box shrank below the text and the name printed over "Dashboard" — the original overlap report. Now `flex: 0 0 auto`, visible to the 720px mobile breakpoint |
| "Add Persona" does nothing | Two elements shared the id `persona-prompt` — the Chat tab's peek panel `<div>` and the Settings `<textarea>`. `getElementById` returns the first without complaining, so the handler read `.value` off a div and threw |
| The categories sidebar looks awkward | `.category-actions` was `opacity: 0` but still in the flow, so every category row reserved width for invisible buttons and the "All" row, which has none, did not — the counts marched in and out down the list |
| Web search returns nothing, silently | Three different failures (no egress, a rate-limit challenge page, a genuine empty result) all surfaced as an empty list. Now logged and named separately — confirmed working in use |

**Also added:** the AI status dot — four states now (… grey checking, ✓ green,
! amber, ✕ red). The header pill that spelled the state out
in words is now a coloured circle with a glyph (✓ green / ! amber / ✕ red) and
the sentence on hover, focus or click. It reclaimed the 17.5rem the pill's slot
reserved, which is why all six tabs now fit beside the wordmark at 1200px
without scrolling. Amber, not red, is the state for "no AI at all": this app is
built to degrade gracefully, so running without Ollama is supported rather than
broken, and colouring it red would train you to ignore the indicator. Red is
kept for a model that failed to load or a server that can't be reached.

**Also added:** the Lagoon and Shallows themes (an indigo ground with a teal
accent, dark and light), recovery advice on every failed tool call, and a
prompt that tells the agent multiple rounds are expected. Guard tests now
catch duplicate element ids, `$("…")` lookups with no matching element, and
the pre-paint theme table drifting from `THEME_PRESETS`.

**Features added:** 10 curated themes layered over `main`'s 7 palettes
(`your change → theme → default`, with separate "reset theme" and "clear my
changes") · Settings → Account with password change (`vault.rewrap` existed and
was called by nothing) · `--reset-password` CLI · agent step timeline
(thinking → tool → tool → answer, persisted with the turn) · `read_url` tool ·
Agent mode rename · split date/time reminder fields with presets, ±15m/±1d
nudges and a plain-English readout · auto-growing capture and magic-add boxes ·
jump-to-note after capture · name nudge on the dashboard ·
`start-desktop.bat` / `./start.sh --desktop`

**Security/privacy:** the User-Agent named the app to every site searched or
read — now a common browser string, no cookie jar, no Referer, DNT/Sec-GPC,
POST so queries stay out of request lines, tracking params stripped from result
URLs. DNS-rebinding hole in the reader closed by pinning the validated IP on
each redirect hop. Six `except: pass` blocks around embeddings now log, so a
broken backend is visible instead of silently shrinking search.

**CodeQL triage** (from the alert list the user shared): the two Critical SSRF
alerts are inherent to the reader feature and already guarded — the one real gap
was the DNS-rebinding TOCTOU, now closed. Log injection is handled by sanitising
at the buffer. The rest (cyclic imports, empty excepts, unused global) are code
quality, and the assert-with-side-effect ones were real test bugs, now fixed.

---

## 6. OpenAI-compatible backends (LM Studio, llama.cpp, Jan, vLLM) — **done**

**Built.** `ai/provider.py` (the neutral seam), `ai/openai_client.py` (the
second dialect), `deps.build_llm_client`, `POST /models/provider`, and the
Model backend picker in Settings → Models. 47 tests in
`tests/test_providers.py`. The original plan is kept below the status block
because its reasoning is still the reasoning; what follows first is what the
plan got right, what it missed, and what is left.

**What the plan got right.** All four questions it staked out were the right
four, and three of them cost almost nothing because the groundwork was already
there. `usable_context` was already reached through `getattr` for exactly this
reason. `extract_text_tool_calls` already handled the OpenAI spelling of
arguments-as-a-JSON-string, because Ollama models were already inconsistent
among themselves — so the "new" dialect was one this app could already read.
`_ThinkTagSplitter` and `_ToolTextGate` needed no change at all, because the
split was kept at "parse one chunk"; the SSE framing is handled below them and
they never learned it exists.

**What the plan missed, and what it cost.** Two things, both in the streaming
path, and both silent failures rather than errors:

- **Streamed tool-call fragments are keyed by an `index`.** Arguments arrive as
  partial JSON spread over many chunks, and *two concurrent calls interleave on
  the wire*. Folding them in arrival order rather than by index yields one
  unparseable blob — and it only happens when the model asks for two things at
  once, which small models do constantly, so it would have looked like "the
  agent sometimes ignores its tools". There is no Ollama equivalent to have
  learned this from.
- **`loaded_context_length` has to beat `max_context_length`.** LM Studio
  reports both, and the plan only named the latter. A 128k-capable model that
  was *loaded* at 4k will drop the front of the prompt — the system prompt,
  the part telling it that it has tools — if the app budgets against what it
  could have held. This is the same class of mistake as the one §11a existed to
  fix, one layer further out.

A third thing the plan named but understated: **tool results are addressed by
id**, and the interesting case is a model calling the same tool twice in one
turn. Matching results to calls by name alone addresses both to the first call,
leaves one unanswered, and the server rejects the entire turn.

**Decisions worth not re-litigating.**

- **`OllamaError` was aliased, not subclassed.** It *is* `ProviderError` now.
  Introducing a neutral parent and leaving `OllamaError` as a child would have
  looked tidier and silently stopped a dozen existing `except OllamaError`
  handlers firing for the new provider. The tidier-looking change was the
  broken one.
- **The shared helpers were moved, not copied,** and a test asserts they are
  gone from `ollama_client.py`. Two tool-text gates that drift apart is exactly
  the failure this refactor exists to prevent.
- **An unknown context window stays unknown.** Where neither the server nor
  the known-model table can answer, the app budgets against
  `DEFAULT_CONTEXT_TOKENS` and does not invent a number. A fallback 128k is not
  proof a model holds 128k, and a budget scaled off an unverified window is
  worse than a conservative one.
- **Setting a backend does not require it to be up.** You set the address, then
  you start the server. `POST /models/provider` saves either way and reports
  what it found.

**What is left.** Small, and none of it blocking:

- **The async-httpx refactor (§20)** was *not* done alongside this, against the
  plan's own advice. The reason: the second provider was already a full rewrite
  of the streaming path, and doing both at once would have meant no version of
  the streaming path that was known-good to bisect against. It is still worth
  doing, and now has to touch two clients instead of one — that is the price,
  and it was paid deliberately.
- **Unverified against real servers.** Every test here is against a fake
  transport. The SSE framing, the `[DONE]` sentinel and the fragment-index
  behaviour are all from the specification rather than from a running LM Studio.
  Worth thirty minutes with the real thing before calling it confirmed.
- **`api_key` is stored in `preferences.json` in plain text**, like every other
  preference. It is excluded from the support bundle. That is fine for a local
  server that ignores it and *not* fine for a hosted gateway key; if anyone
  points this at a paid API, the key belongs in the vault (§26) instead.
- **Embeddings via the OpenAI backend are implemented but not wired to the
  Settings UI** — `embedding_backend` still offers "built-in" and "ollama"
  only. `OpenAICompatClient.embed` works; nothing calls it yet.

---

### The original plan, kept for its reasoning

**Why.** Asked for directly. LM Studio serves an OpenAI-compatible API on
`http://localhost:1234/v1`, and so do llama.cpp's server, Jan, vLLM — and Ollama
itself. **One provider gets all of them**, rather than an LM Studio special case.

**Shape.** Generalise `ai/ollama_client.py` into a provider interface. This is
real work, not a URL swap: the streaming shape and the tool-call shape both
differ from Ollama's. Provider + base URL configurable in Settings → Models,
with capability detection for tools and streaming, so a backend that can't do
tool calls degrades to plain Q&A exactly as a tool-less Ollama model does today.

Best done together with the async-httpx refactor in §10 — both rewrite the same
client, and doing them separately means touching the streaming path twice.

**Read this before starting — the context work has already staked out the
interface.** Four things a provider must now answer, and what happens when it
cannot:

1. **`usable_context(model)`** — the window to budget against. Already reached
   through `getattr` in `agent.run_agent` for exactly this reason: reporting a
   context length is an Ollama feature (`/api/show`), and a provider that
   cannot answer falls back to `DEFAULT_CONTEXT_TOKENS` rather than crashing
   the turn. **LM Studio does expose this** — `GET /api/v0/models` returns
   `max_context_length` and `loaded_context_length` — so the interface should
   have it, with a `None` return meaning "ask me nothing further".
2. **`runtime_options(model)`** — currently Ollama's `num_ctx`/`num_predict`.
   The OpenAI shape spells these `max_tokens` (and has no `num_ctx` at all —
   the window is fixed when the model is loaded). So this cannot stay an
   Ollama-shaped dict on the interface: either each provider translates a
   neutral `{context_tokens, max_output_tokens}`, or it owns the whole payload.
   **The neutral pair is the better shape** — the agent should not learn four
   dialects.
3. **Tool-call shape.** `_normalise_tool_calls` and `extract_text_tool_calls`
   already exist because Ollama models are inconsistent *among themselves*; the
   OpenAI shape (`tool_calls[].function.arguments` as a JSON *string*) is
   another dialect on the same axis, and `extract_text_tool_calls` already
   handles that spelling. Reuse rather than re-derive.
4. **Streaming shape.** Ollama sends bare JSON lines; OpenAI sends SSE
   `data: {...}` with a `[DONE]` sentinel and deltas nested under
   `choices[0].delta`. `_ThinkTagSplitter` and `_ToolTextGate` sit *above*
   this and should not need to change — keep the split at "parse one chunk"
   so they don't.

The capability-detection point in the paragraph above is now cheap: a provider
that returns `None` from `usable_context` and `[]` from a tools probe already
degrades correctly through paths that exist and are tested.

**One trap that is specific to this work.** `tests/test_context_budget.py`
asserts that all four Ollama generation paths send an options block. A new
provider needs the equivalent assertion of its own, or it will run on the
backend's defaults — which is the bug §11a spent this session fixing, arriving
again through a different door.

---

## Answers to questions already raised, so they aren't re-asked

**Is it one user per app?** Yes. One `users` row, one bcrypt password, gating
every route. Separate notebooks are separate `MEMORYMAP_DATA_DIR`s, not separate
accounts.

**Forgot password?** Two different answers. Ordinary notes are *not* encrypted by
the password — they are plain SQLite rows and come back untouched, via
`python -m memorymap --reset-password`. Private notes *are*: their key is derived
from the password, so without it nobody can recover them, including that command.
The UI and the command both say so before you commit. No backdoor was added, on
purpose.

**Does the AI use my name in the greeting?** Yes, when `display_name` is set in
Preferences. The AI-written path weaves it in about 75% of the time
(`NAME_USE_CHANCE`); the handwritten fallback path always appends it. It was
empty by default and buried among a dozen fields, which is why it looked like
the feature didn't exist — the dashboard now offers to set it once, then stops
asking.

**Themes vs palettes?** Palettes own colour only (7, each with a matched light
and dark set). Themes own everything else — light/dark, font, density, radius,
glass — and *select* a palette rather than carrying colours of their own. They
had to be reconciled: both were writing the accent, and `[data-palette]` rules
come later in the stylesheet, so a theme's colour silently lost.

**Open question for the user:** two pickers on one screen may still be one too
many. The alternative is folding them into ~15 complete looks. Left split,
because "same layout, different colours" is a real thing to want — worth
confirming.

**Does the "AI is off" status ever turn red?** Yes — amber (the common case,
Ollama not running) and red (a model that failed to load, or a server that
can't be reached) are both real states. Asked as "does the X status ever
happen? I've never seen it" — if you've only ever seen amber or green,
that's consistent: red needs Ollama to be *reachable but failing*, which is
rarer than it simply not running.

## 35. Reported in one session — the big batch, triaged — done

One round of real use, mostly the desktop app, triaged into thirteen
sub-items (35A–35L) and worked through. All resolved:

- **The Ask section** (35A): stopped answering smalltalk conversationally,
  fixed retrieval clipping, and the "Quick mode + thinking model produces
  nothing" bug — `num_predict` was one flat cap shared between thinking and
  answer tokens; thinking allowance is now added on top, not carved out of it.
- **Hallucinated writes** (35B): the claim-pattern net widened to catch
  first-person-plural and markdown-bolded claims, and checked per-action
  against the tools that actually ran, not just "did anything write at all."
- **Thinking-model capability reporting** (35C), **response-mode presets**
  (35D), **desktop-app localStorage persistence** (35E), **broken buttons**
  from listeners bound to re-rendered nodes (35F), **a stacking-render bug**
  in the constellation widget (35G), and a **streaming diagnosis** that ruled
  out the client (35H) were each found and fixed.
- **Chat compression's manual half** shipped (35I; the agent tool followed
  in a later session — see the entry below). **Document creation** closed a
  read/write asymmetry (35J). **The agent's character** — long jobs cutting
  out mid-way, a flat round cap unable to tell progress from a loop — got
  earned rounds and resumable skill steps (35K). **The design-token
  foundation** (35L) landed as `DESIGN.md`, with `tests/test_style_scale.py`
  enforcing it against drift.

Full detail, including what verification could and could not cover: git log
for this range, and [CHANGELOG.md](../CHANGELOG.md).

## 36. UI layout and surfaces — the reported list — done

The layout work built on top of §35's design tokens, gathered into one list
rather than scattered remarks: scrolling and sticky surfaces made structural
(the window itself stopped scrolling, so sticky headers resolve against the
right ancestor), and the tab-by-tab layout passes that followed — Notes,
the Library, the graph and Timeline, the chat dock — each converted to the
token scale rather than to whatever looked right that day, per §35L's own
warned-against failure mode.

Full detail: git log for this range, and [CHANGELOG.md](../CHANGELOG.md).

## 37. Reported in one session — the second big batch — done

The four items blocked on a clarifying question (37G/37H/37I/37K) were asked
and closed: sketch image upload with a real eraser (two canvas layers, so
erasing reveals the photo rather than punching a white hole), a document
importer via `markitdown`, compress-as-a-tool, and an emoji audit. 37H
(llama.cpp) was deferred deliberately and is Tier 3 in ROADMAP.md.

Full detail: git log for this range, and [CHANGELOG.md](../CHANGELOG.md).

## 38. The backlog audit — done

A step back from three consecutive rounds of newly-reported work to check
§1–§34 against the actual code, because the backlog had gone stale in both
directions: things marked open that were built, and the project's own outside
review's top recommendation already satisfied and not marked so. Its ranking
is superseded by ROADMAP.md's single tiered list.

## 39. The background librarian, memory streams, and the whiteboard — built

Three capabilities that arrived with the antigravity branch and were finished
during its audit.

- **The background librarian** (`ai/autonomous.py`): a scheduled agent pass
  that tags, links and flags duplicates. Off by default, because it is the one
  place the model writes with nobody watching. Destructive tools are *barred*
  rather than confirmed (there is no one to confirm to), rounds are bounded, it
  uses the utility model, and it skips itself on battery. Every pass records
  what it changed, with the call that reverses each change, shown in
  Settings → Background tasks.
- **Memory streams** (`save_user_preference`): the model can write itself
  standing instructions it gets back on every later turn. Bounded on three
  axes — 200 characters each, 40 active, and a 600-character ceiling on what
  reaches the prompt — because `PROSE_BUDGET_CHARS` is asserted against the
  *static* prompt and anything appended at runtime slips past it. Listed,
  editable and switch-off-able in Settings → The AI → What it remembers.
- **The whiteboard** (`api/routes_whiteboard.py`): note cards and sketches on
  a pannable canvas. A board is itself an entry, so it is searchable and
  filable like anything else; `board_id IS NULL` is the scratch board.

## 40. The antigravity audit — done

A week of another agent's work (~9,600 insertions, no tests) arrived with **90
failing tests and 20 ruff errors** against a `main` whose only two failures
were a time-bomb in a dated test. One thing was reverted — `/chat/stream` had
been rewritten as a WebSocket, costing thread-safety, the auth gate and the
same-origin policy for no gain on a local-first app — and everything else was
kept and fixed.

**The four shapes the failures took**, which is the part that transfers:

1. **A working thing rewritten into a riskier thing**, with no stated reason.
2. **Features that never ran once** — a `start()` never called, a function
   that does not exist called inside a broad `except`, a method name that
   appears nowhere else, 35 inline styles refused by the app's own CSP.
3. **A guard removed while the shape around it was kept** — two tools grew
   batch arguments and stopped calling `_require_note`, the only thing that
   refuses a private note.
4. **Damage that lands far from its cause** — two missing entries in
   `APPEARANCE_DEFAULTS` wrote `undefined`/`NaN` into CSS custom properties,
   and every card, field and dialog in the app rendered flat and borderless on
   every fresh profile. Nothing logged; one `getComputedStyle` found it.

The lesson is narrower than "review harder": **a branch that cannot run CI has
not been reviewed, however carefully it has been read.** 46 tests and 4 lints
were added so the next such branch is judged in minutes. Judgement criteria in
[ANALYSIS.md §34b](ANALYSIS.md).

## 41. The reported list, triaged — done, and the plan it produced

Trace on the graph was rebuilt (it was unusable because `traceModeActive` was
consulted nowhere, so the map never responded and both ends came from selects
listing every note); the autonomous switch that "kept disabling itself" had two
writers and one stale cache; light/dark stopped reaching the page background
because the scheme builder stored one inline colour for one mode. Plus six
whiteboard bugs, the skill descriptions clipped to one line, the documents
sidebar crushing its own list, a dead "+ New Skill" button, two `cryptography`
advisories, and a CodeQL stack-trace exposure.

**Checked and found already correct, so nobody spends a session on it:**
password and secret storage (bcrypt with per-password salt, `token_hex(32)`
session tokens held in memory and swept, private notes encrypted under a
password-derived wrapping key — nothing in plaintext), and the three sketch
swatches reported as identical, which are three distinct colours.

Everything not fixed became ROADMAP.md's tiered list.

## 42. Another reported list, triaged — the correctness half, done

Ten fixes, each reproduced (in Chromium where it was a UI report, against a
fake transport otherwise) before being changed, each with a test:

1. **`recycle_bin_days` 422 on the browser's own console.** The Settings
   number input had `min="1"` but nothing enforced it client-side before the
   PUT, so an emptied field sent `0` and hit the backend's real `ge=1`
   validation as a raw, unexplained error. `savePrefs` clamps now.
2. **`unknown timezone 'Australia/Brisbane'`, every request, on Windows.**
   Not a bad preference — Windows ships no IANA tz database at all, and
   `zoneinfo.ZoneInfo` has nothing to fall back to there without the
   `tzdata` package, which was never a dependency. Added, unconditionally
   (pure data, harmless where the system database already exists).
3. **The autonomous loop only read its own settings once per scheduled
   tick**, sleeping up to the full interval (6h default) between reads.
   Toggling battery-saver off, or the scheduler back on, did nothing until
   that sleep ran out — reported as "background tasks skip things thinking
   battery mode is on" and "finishing a task disables automatic tasks,
   forcing a re-toggle". `autonomous.wake()` interrupts the sleep;
   `PUT /preferences` calls it when a relevant key changes.
4. **"A dark rectangle behind the chat header" and "the sidebar collapse
   button overlaps" were the same bug**, reported from two angles.
   `#tab-chat`'s `.layout` hardcodes `grid-template-rows: minmax(0, 1fr)`
   for its desktop two-column layout; the 720px breakpoint stacks it into
   two rows without ever resetting that template, so the implicit second
   row claimed nearly all the height and the sidebar's own row — and its
   collapse toggle, its "Browse all" button — rendered in a ~25px sliver
   with the rest spilling out past its own card background via
   `overflow: visible`. Reset to `grid-template-rows: none` when stacked.
5. **Search results explained why they matched, for exactly one case** — a
   note pulled in by connection, "🔗 linked to a match" — **and not at all
   for the actual matches**, the majority of every result list.
   `search_manager._retrieve` now keeps the per-entry provenance `_rank`/
   `_fuse` used to discard, threaded through `/chat` and `/chat/stream` as
   `match_info`; the panel renders a badge per row — a semantic score, the
   keyword(s) matched, or both — replacing the old single-case chip.
6. **Improve Writing** had three fixed presets and no way to just say what
   you want changed. Added a fourth "Custom…" mode with a text field.
7. **The graph's "✨ Generate Story from Path" button** was three inline
   `.style.x =` assignments against `var(--primary)`/`var(--primary-fg)` —
   tokens this design system doesn't have — and the CSP's
   `style-src: 'self'` refuses an inline style attribute outright
   regardless, which is what `.style.x =` sets under the hood. Both
   silently no-op; real CSS class, real tokens now. Separately, attaching
   the trace's notes to the turn never stopped retrieval from *also*
   running against the turn's own instruction text, so the story could
   come back with notes from outside the traced path — new
   `attached_notes_only` flag skips retrieval when there's an explicit,
   closed attachment to fall back to.
8. **The graph's time filter** had two bugs: `window.graphSliderInitialized`
   gated the slider's min/max to a one-time computation, so any note added
   after the first render sat beyond the slider's own "all time" end and
   was silently hidden; and the label overwrote the HTML default ("All
   Time") with a raw date on every render, so the *unfiltered* position
   looked like an active filter. Both fixed; also fixed a `.graph-temporal`
   label with no `flex-shrink: 0`, which is why "Time Filter" wrapped onto
   two lines under moderate width.
9. **The trace overlay on Arc layout** drew a straight chord regardless of
   layout; Arc puts every node on one shared baseline (that's why its own
   edges are curves), so a highlighted path there sat exactly where the row
   of ordinary nodes already was. Drawn as its own taller arc in that one
   layout now.
10. **Timeline grid cards** clipped previews with unprefixed `line-clamp: 3`
    under a `-webkit-box` display — a combination this Chromium doesn't
    connect, so nothing was actually clamping and long text hard-cropped
    mid-word with no ellipsis. Fixed, plus the backend's own preview field,
    a bare `text[:120]` slice with no "…" on truncation.

**Not fixed, and why**, plus the rest of the same report (a whiteboard
feature-parity list, a widget-management hub, an Obsidian-style graph ask,
a guided-tour request, and "clean up the tests") are in ROADMAP.md's tiers —
each scoped against the actual current code, not guessed at, per this file's
own standing rule.

## 43. A follow-up burst on top of §42 — the time filter was still broken, link reasons grew a confidence score and an editor, notes got optional titles

Same session as §42, continued after that write-up: the user came back with a
run of small, specific asks in quick succession rather than another
unstructured list. Each is below in the order it was answered.

1. **The time filter slider still didn't move** — reported immediately after
   §42 claimed it fixed. It had, for the bug §42 found (the sticky
   `graphSliderInitialized` flag); it hadn't, for a second, worse one hiding
   behind it. `/graph`'s two hand-built node dicts did
   `e.created_at.isoformat() + "Z"` — a habit from before
   `core/database.DateTime` existed, back when `.isoformat()` needed help to
   say UTC. It says so on its own now (`...+00:00`), so the `+ "Z"` produced
   `...+00:00Z`: two timezone markers in one string, which `new Date(...)`
   parses as `Invalid Date` with no error anywhere. The frontend's bounds
   calculation drops unparseable dates, so `min`/`max` always collapsed to
   `Date.now()` — for every note in the notebook, not a rare one. §42's own
   testing had used notes created moments apart in the same session, which
   masked it: near-simultaneous *good* dates and near-simultaneous *invalid*
   ones look the same on a slider with no range. Backdating a note directly in
   SQL and reading `/graph`'s raw response is what actually showed
   `"2025-12-01T23:40:32.022250+00:00Z"`. Fixed by dropping the redundant
   `+ "Z"` in both places; a new pair of tests parses the returned
   `created_at` with `datetime.fromisoformat()` rather than trusting a string
   shape again.
2. **Link reasons, asked about from three directions at once.** §42 shipped
   the *reason* — free text, optional, shown on the edge, in Trace, and in
   `related_notes`. This round added the two things a reason on its own
   doesn't give you:
   - **A confidence score, for the reasons nobody actually wrote.**
     `manager.create_link` now tries `_deduce_reason` whenever it's asked to
     link two notes with no reason given — the same embedding-cosine check
     `/entries/link-suggestions` already ranks by (`AUTO_REASON_THRESHOLD =
     0.55`, the same bar). At or above it, the link gets `reason = "similar
     in meaning"` and a `reason_confidence` (0–1) alongside it; below it, or
     with no embedding for one or both notes (private notes have none —
     `set_private` deletes it — so this is naturally a no-op for them), both
     stay null, which reads identically to "nobody tried." A reason a person
     or the AI actually typed never gets a score — it isn't a similarity
     measurement, and forcing one on it would misrepresent a stated reason as
     a guess. `EntryLink.reason_confidence` is a new nullable column (the
     same additive-migration path `reason` used). The suggested-links
     "🔗 Link" button in the frontend dropped its own hand-built
     `"NN% similar in meaning"` text for this reason — it was duplicating,
     with a slightly different number, exactly what the backend now derives
     from the same embeddings on every other undecorated link. Surfaced
     everywhere a reason already showed: the graph edge's SVG `<title>` and
     `entry/paths.py`'s `Step.how` (Trace, and the story-mode prompt) append
     `", NN% confidence, deduced"` when `reason_confidence` is set, so a
     guess never reads with the same certainty as something a person said.
   - **An editor**, because a reason — typed, AI-given, or deduced — was
     write-once until asked for directly. New `manager.set_link_reason` and
     `PUT /entries/{id}/links/{link_id}/reason` (empty/`null` clears it);
     always overwrites `reason_confidence` back to null, since an edited
     link and a fresh, untouched auto-reasoned one need to stay tellable
     apart. In the note card's own link chips, a ✎ opens the existing
     `promptDialog` prefilled with the current reason (blank submissions are
     read as "no change," same convention as every other rename in the app,
     which is why clearing is a separate ⊘ next to it rather than the same
     control with an empty box) and a ⊘ clears it outright — both only ever
     appear next to a link, never touch the link itself.
   - The autonomous background auto-linker's persona now explicitly invites
     a reason ("pass a reason if the connection isn't obvious ... e.g. 'both
     about scheduling'") when linking is enabled, matching the wording
     `link_notes`' own tool schema already used — nudging the one path that
     previously had no reminder at all.
3. **Notes got an optional title.** Answered as a design question first
   ("does a title restrict how many notes can be on one topic, or is there a
   better way?") — recommended a title that's read off the note rather than
   demanded or generated by default, and built what the user then confirmed:
   a note's title is `manager.extract_title(content)`, the leading `#`–`######`
   heading line if the first non-blank line of the note is one, computed on
   every read rather than stored as its own column — so it can never drift
   out of sync with an edited first line the way a duplicated, separately-
   saved title could. Shown in the note card as its own `<p class="entry-title">`
   above the body (`<h3>` was tried first and reverted — `.card h3` is this
   design system's small-caps section-label convention, and it leaked
   straight into a note's own title). The card body itself drops the heading
   line when a title is showing (`bodyWithoutTitleLine`), so the text isn't
   repeated. Three actions round it out, all via the note's own overflow
   menu: **✨ Generate title** (or **Regenerate**, if one exists) calls a new
   `librarian.generate_title` and `POST /{id}/generate-title`; **✕ Remove
   title** strips just the leading heading line and one following blank line
   via `manager.remove_title`, `POST /{id}/remove-title`. Both refuse a
   private note outright (400) rather than risk it: each reads
   `manager.readable_content` — decrypted — and would otherwise write that
   plaintext straight back to `entry.content`, un-encrypting the note as a
   side effect of titling it. A test asserts `crypto.is_encrypted` still
   holds after a refused attempt on both routes.
4. **"When I close and reopen the app, start on the dashboard."** The boot
   sequence read `localStorage.getItem("activeTab")` and restored whatever
   tab was last open; now it always opens on Dashboard
   (`switchTab("dashboard")`, unconditional). Small, but worth naming the
   trap it hit: an *earlier*, unrelated occurrence of the exact string
   `switchTab("dashboard");` inside a menu handler meant a substring-based
   test assertion matched the wrong call site until it was anchored with a
   leading newline.
5. **The glassmorphism blur slider, asked whether it actually scales the
   frosted-glass effect** — investigated and found working as built. Two
   screenshots at different slider positions looked identical to the eye, so
   this was checked by comparing the raw screenshot byte buffers rather than
   trusting a visual read: they differ (different sizes), meaning the
   `backdrop-filter: blur(...)` value the slider drives does change between
   settings. No fix made — there was nothing to fix — and reported as such
   rather than as a guessed-at change, per this project's standing rule about
   saying plainly what wasn't broken as much as what was.

**Verified live in Chromium**: the manual link → ✎ add a reason → chip title
updates → ⊘ clears it → chip title reverts, end to end, including the actual
`PUT .../reason` round trip. **Not verified live**: the auto-deduced-reason
path and its graph-edge tooltip specifically — this sandbox's embedding
backend is the fake keyword one from the test suite in `pytest`, and driving
it live needs a real embedding model this sandbox doesn't have; a set of
notes linked in the same live session also happened to land inside the
graph's "Uncategorised" cluster supernode (semantic-zoom clustering, all
notes sharing the one category), which hides individual link edges behind
the cluster rather than rendering them directly. The backend behaviour is
covered by `pytest` (`test_waven_api.py`, `test_wavee_graph.py`,
`test_graph_paths.py` — deduction, confidence, editing, clearing, the 404
case, and the graph edge's own `reason_confidence` field), and the browser
check above proves the same JS code path (`api(... PUT .../reason)`,
re-render, chip title) that the auto-deduce path also runs through — but the
pixels of a deduced reason's tooltip specifically were not seen, and that is
worth re-checking with a real embedding backend before calling it done.

## 44. §8's two perf fixes, a real "ran without being enabled" bug, link suggestions grew the reason they'd get if linked, a mute option — plus three reports investigated and not reproduced

An unattended run: checked the running app and both handover files first,
per this project's own standing rule, then worked ROADMAP.md's Tier 1 top
item — §8's two backend perf findings, explicitly flagged "start here next"
— before anything the user raised live mid-session. Committed and pushed in
batches rather than one large commit, in case of a usage-limit cutoff.

**§8, both perf findings, fixed and pinned by query-count tests (not
timing):**

1. `tools._graph_neighbours` fetched every non-deleted `Entry` — the whole
   table, `content` included — whenever the note it was walking from had
   tags, to find tag matches by hand. `_related_notes` calls it once per BFS
   node (up to ~12 at depth 2), so this scaled per call as well as per
   entry. Tags are a JSON text column with no per-tag index, so a SQL filter
   can only narrow candidates, not resolve the match exactly: rewritten to
   `ilike` pre-filter per tag (the same pattern `list_tags`/`_count_notes`
   already used elsewhere in this file) before the existing exact Python
   check, which also removes any substring false positive ("art" matching
   "cart") the `ilike` lets through.
2. `manager.entry_dates` (one `SELECT` per entry) was called inside
   `_note_summary`, itself called per row by `list_notes` (≤25) and
   `summarize_notes` (≤40) — an N+1 on the agent's two most-used read tools.
   New `manager.entry_dates_bulk` fetches every returned note's dates in one
   `WHERE entry_id IN (...)` query, grouped by id; `_note_summary` takes an
   optional pre-fetched `dates` list so the two batch callers can pass it in
   while single-note callers (`get_note`, etc.) keep querying one at a time.

Both pinned in `tests/test_scale_query_counts.py` (extended, not a new
file) with a query count at 20 vs. 220 entries — a fixed handful either way,
not one-per-entry — matching that file's own stated reasoning for counting
queries instead of timing them.

**A real correctness bug, reproduced live before being fixed, not
theorised**: the user reported *"I get notifications that the autonomous
optimisation completed when I didn't have it enabled??"* Read
`ai/autonomous.py` first and found the shape: `_loop()` checks
`autonomous_tasks_enabled` before ever calling `_run_optimization`, but
`trigger_now()` (the "Run optimization now" button, and its `POST
/tasks/trigger-autonomous` endpoint) never did — it only guards against a
pass already running. Confirmed with a live server rather than assumed: on
a fresh profile (`autonomous_tasks_enabled` unset), `curl -X POST
.../tasks/trigger-autonomous` returned `started: true` and a real pass ran.
The button itself is hidden while the toggle is off, which is a UI
convenience, not an authorization check — anything else reaching the
endpoint (a stray script, a future dashboard shortcut) hit the same gap.
Fixed in the route, not in `_run_optimization` or `trigger_now`: ten-plus
existing tests call `_run_optimization()` directly and treat the master
toggle as the caller's job to check (by design — its docstring is "one
pass", and `_loop` already owns that check), so folding the guard into the
shared function would have broken that contract and every one of those
tests. The route now checks the preference itself before calling
`trigger_now`, with a distinct response body (`"switched off in Settings"`)
so a caller can't confuse "disabled" with "already running" the way a
single bool would. Re-verified live after the fix: disabled →
`started: false` with the new message; explicitly enabled → `started: true`,
a real pass. Two new tests in `test_autonomous.py` pin both branches at the
route level.

**Link reasons, extended on two fronts the user asked about directly:**

- *"I feel like the suggested links should include a suggested reason
  somewhere."* `GET /entries/link-suggestions` and `manager.create_link`'s
  own deduction threshold (`AUTO_REASON_THRESHOLD`, renamed from
  `_AUTO_REASON_TEXT` to make it importable) are numerically identical
  (0.55), so every suggestion already clears the bar a real link would need
  to get this same text — added it to the response as `reason` rather than
  computing anything new, and it's a preview of the real outcome, not a
  separate guess.
- *"None of my notes have a linked reason yet — is there an easy way to give
  them all a reason?"* There wasn't: `_deduce_reason` only ever ran at the
  moment `create_link` made a *new* link, so a notebook full of links made
  before §43 shipped (or made while the embedding backend was off) had no
  way back to a reason. New `manager.backfill_link_reasons` runs the same
  deduction once over every existing reason-less link — same rule as a
  fresh link: a person's own reason is never touched, and a link that still
  can't be deduced (no embedding, or under threshold) is left exactly as it
  was rather than given a manufactured answer. `POST
  /entries/links/backfill-reasons`, and a "💡 Give existing links a reason"
  button next to Suggest links in the graph's suggestion panel. Four new
  tests: the suggestion's `reason` field, a backfill that fills the similar
  pair and leaves the unrelated one alone, and one confirming a hand-written
  reason is never overwritten.

**A notifications-mute option, asked for directly**: "there can be an
option to mute notifications except for reminders." New preference
`notifications_muted_except_reminders` (Settings → Preferences →
Notifications). `toast()` gained an `exempt` flag — set on the three
reminder-alert call sites so a due reminder always gets through — and
returns early for everything else, except errors, when muted (silencing a
real failure would defeat the point of the toggle more than the noise it's
meant to quiet). `recordNotification` (the persistent panel) does the same,
keyed off `kind !== "reminder"`. Not built: mirroring ordinary UI-action
toasts ("Saved.", "Linked.") into the panel, the other half of the same
message — every call site would need a `kind` first, and flooding the panel
with routine feedback isn't obviously wanted; needs its own pass at which
toasts actually belong there.

**A graph-toolbar readability fix, reported directly**: "the labels and
what UI control element they connect to is confusing in the graph tab."
`.graph-time-label` ("All time") is a plain read-out of the Time Filter
slider, styled identically to the *interactive* toggle labels
(Similarity/Hide unlinked/Labels) sitting right after it with the same flex
gap — nothing marked where the slider's own group ended and the toggles
began. Grouped the three toggles under one `.graph-toggle-group` span and
drew a divider before each top-level group, reusing `.chat-tool-group`'s
existing `+`-selector convention (a divider on the group itself survives
any neighbour being hidden) rather than inventing a second one.

**Three things reported live, investigated, and correctly left alone rather
than guessed at** — full detail in ROADMAP.md's new "Open questions raised
this session" section:

- Whether Capture should grow its own title field, separate from §43's
  leading-heading convention — a design question in the same shape §43 was
  worked through as, not a bug. Not built; needs a decision first.
- *"The dashboard isn't detecting my name."* Traced end to end
  (`renderNameNudge`, `withDisplayName`, `savePrefs`'s cache update and
  re-render) and the code is correct — the nudge is designed to show exactly
  when `display_name` is empty. Read as "the feature working as built on a
  profile with no name saved" rather than a bug, absent a case where a name
  was actually saved and still didn't show.
- The Timeline grid's "text cut off with no ellipsis" report, re-driven live
  in Chromium with notes up to 122 characters at the grid's real column
  width. Found one real, previously-undocumented fact — `display:
  -webkit-box`'s **computed** value in this sandbox's Chromium is
  `flow-root`, not `-webkit-box`, so the existing code comment's claim about
  which property "actually reads" here is not quite right — but clamping
  still worked correctly in every case tried (`scrollHeight === clientHeight`
  throughout, nothing overflowing). Could not reproduce the reported
  clipping with any input tried; said so rather than guess at a CSS change
  with nothing to verify it against.

**What could and couldn't be verified**: the two §8 perf fixes and the
autonomous-toggle fix were all reproduced and re-verified against a real
running server (`curl`, not just reasoning about the code) — the standing
trap this project's own history has fallen into more than once. The
graph-toolbar divider, the suggestion-reason text, the backfill button and
the mute option are CSS/JS reasoned from the DOM and existing conventions
but were **not** driven in a browser this session — say so plainly rather
than claim a screenshot that doesn't exist. Full `pytest tests/` (~1,600+
tests), `ruff check .`, and `node --check frontend/app.js` all green after
every batch.

## 45. Skill runs get a manual mode — the single most-requested unbuilt thing on the list

Continued the same session as §44, straight after committing and pushing it.
ROADMAP.md's own Tier 2 item 8 named this "the single most-requested unbuilt
thing on the list" — asked for directly more than once: a pause after every
completed step with a Continue button and a text box, so a person can add
what the agent missed or answer a question it raised, rather than a run
barrelling through five steps unattended.

**Built by reusing the existing resume machinery, not inventing a second
one.** `skill_runner.run_skill` already stops mid-run and hands back
`stopped_at` for a step that failed or stalled, and `start_at` already
resumes past it without re-running earlier steps — the exact mechanism a
pause needs. `run_skill(..., manual=True)` now takes the same stop after
*every* step that finishes `done` too, not only a broken one; the new
`result.paused` field is the only difference the caller needs to tell
"waiting for you" from "something went wrong" and render each one
differently — a paused run is not reported as a failure, and does not raise
the "stopped early" notification a genuine failure does (nobody needs to be
told ten minutes later about a pause they're sitting in front of).

**`manual_note` — what gets typed in at the pause — is folded into the
*next* step's own instruction**, not appended to `step_history`: this is
what the person is asking for as part of that step specifically, and a
history entry is something the model may or may not weigh against
everything else in its window, the same reasoning `_step_answer` already
uses for putting the ids a step touched into its own line rather than a
separate structure. Applied once, at the first step a given call actually
runs (`index == resume_from`) — a later resume with no note of its own
does not repeat it, so a comment made once about step 2 doesn't quietly
keep steering step 4.

**Frontend**: a "Run skills step-by-step" checkbox in the chat dock's `⚙`
settings panel (alongside answer length and persona — a standing preference
about how a run behaves, not a per-launch choice), read live when a run
starts *or* resumes rather than captured once, so a run can be switched
into or out of manual mode between steps. The pause itself renders as a new
`manualPauseControls` card — a text input and a **▶ Continue** button — kept
deliberately separate from the existing `continueRunControls` (Resume /
ran-out-of-rounds), which stays exactly as it was for an actual failure.

**Not built**: the identical pause for a plan run (`opts.plan` — a plan the
model draws for one request, per §35K). The backend treats a plan and a
saved skill identically already (`skill_manual`/`skill_manual_note` are
sent whenever either is present, per `streamChat`'s own body-building
logic), but the *existing* Resume-from-failure button was already
skill-only before this session — extending both paths to plans is one
further, separate change, not a gap this feature introduced.

**What was and wasn't verified**: six new tests in `test_skills.py`
(`test_manual_mode_pauses_after_the_first_step_instead_of_continuing`,
`..._off_runs_straight_through_as_before`, `..._does_not_pause_after_the_last_step`,
`test_a_paused_run_is_never_reported_as_failed_or_stalled`,
`test_manual_note_is_folded_into_the_next_steps_own_instruction`,
`test_manual_note_only_reaches_the_step_it_was_added_before`) drive the
whole backend path through the real `/chat/stream` endpoint with the fake
Ollama transport — pause, resume, the note appearing in exactly one step's
prompt and nowhere else. The checkbox and the pause card's text box were
**not** driven in a browser this session; say so plainly rather than claim
a screenshot that doesn't exist. Full `pytest tests/`, `ruff check .`, and
`node --check frontend/app.js` all green.

## 46. The sketch pad's highlighter and a real background colour — both checked live, one caught a real CSS trap along the way

Continued the same session, straight after §45. ROADMAP.md's next item: the
sketch pad's highlighter at 5% opacity ("completely wrong" in the report),
"then a reachable size control, a background colour, and a selection tool."

**Checked before touching anything, per this file's own rule, and found
half of it already done.** `#sketch-size` already existed, was already
wired (`sketchPen.size = Number($("sketch-size").value)`), and already
reached every tool — pen, highlighter, eraser, and every shape's stroke
width (`line`, `rect`, `circ`, `arrow`) all read `sketchPen.size`. ROADMAP's
own claim that a size control was missing was stale; corrected in place
rather than rebuilt.

**The highlighter, fixed and verified live.** `globalAlpha` was a literal
`0.05` in two places (`sketchMove`, `sketchEnd`) — roughly twenty
overlapping passes before a stroke showed at all, indistinguishable from the
tool doing nothing. Now `0.35` (a named `SKETCH_HIGHLIGHTER_ALPHA` constant,
not a second magic number), which reads as an actual highlighter given the
existing `multiply` blend mode — translucent, tints rather than covers.
Verified in a real Chromium session, not just the diff: drew one stroke,
read the canvas pixel back with `getImageData` (a distinct blue rather than
the near-white a 0.05 alpha would leave), and took a screenshot showing a
clearly visible band.

**A background colour, built and then caught doing nothing — the real find
of this item.** A first pass added `--sketch-board-bg` as a CSS custom
property on `#sketch-bg-canvas`'s `background`, the exact shape the
whiteboard's own `--wb-board-bg` already uses. It changed nothing on
screen. The reason: `sketchDrawBackground()` — called every time the pad
opens or a background image loads — already does
`context.fillStyle = "#ffffff"; context.fillRect(...)` across the whole
canvas, and **that fill is opaque pixels drawn into the canvas element's own
bitmap**, which sits in front of (and fully hides) whatever the element's
CSS `background` is. A CSS background on a `<canvas>` is only ever visible
through pixels the canvas itself left transparent — exactly the shape of
trap this project's own traps list already names ("a value that is invalid
where it is used, not where it is set, does its damage nowhere near the
code that caused it"), just for `display` bugs rather than paint order.
Found by checking the *pixel data* after picking a colour, not by reading
the CSS and assuming it applied.

Fixed properly: `sketchBgColor` (a plain module-level variable, persisted
in `localStorage` the same way the whiteboard's board colour is) replaces
the hardcoded `"#ffffff"` as `sketchDrawBackground()`'s own `fillStyle`, so
the chosen colour is real pixel data from the moment it's picked — which
also means it survives into `saveSketch()`'s composite untouched, since
that function just `drawImage`s the two canvases together and never knew
the difference. Verified three ways live: the bg-canvas's own pixels before
and after picking a colour, and — because a canvas correctly *showing* a
colour on screen is not the same fact as a save correctly *storing* it —
the exact same composite `saveSketch()` builds, read back pixel by pixel,
confirming the chosen colour (not the old default) is what actually gets
attached to the note.

**Still genuinely open**: a selection tool (clicking an existing
stroke/shape to move, resize or delete it — today's tools only ever draw a
new one, the same gap the whiteboard had before its own select/move/rotate
work was scoped). The toolbar redesign stays *after* that, per the item's
own ordering, not before.

**What was and wasn't verified**: both fixes were driven in a real
Chromium session with pixel-level reads, not screenshots alone — the
highlighter's visible colour, the background colour's presence in the
canvas's own bitmap, and its survival into the actual save-composite.
Nobody actually clicked "Save as note" through the UI end to end this
session (a stray Agent Activity toast intermittently overlapped the Save
button in the test viewport, a test-harness nuisance rather than an app
bug); the composite was verified by calling the exact same drawing calls
`saveSketch()` makes, not by guessing that it would behave the same way.
Full `pytest tests/`, `ruff check .`, and `node --check frontend/app.js`
all green (this item has no backend surface, so no new Python tests).

## 47. A link that turned out to already be a link, and the document half of "take me to what changed"

Continued the same session, straight after §46. Tier 2 item 12 next:
*"a note's linked notes should be clickable through to those notes; today
they are decoration."*

**Checked before touching anything and found it already done.** Every
place a link chip renders — a note card's own `entry.links`, the "Similar"
panel, a reminder's attached-note chip — already calls `flashEntry` on
click, which switches to Notes → Browse, clears any active filter, and
scrolls the target into view with a highlight, the same function search
results and `[[wiki links]]` already use. Traced all three render sites in
`app.js` rather than trusting the first one; all three were already wired.
ROADMAP's own claim that they were "decoration" was stale — corrected in
place rather than re-derived or rebuilt.

**Item 13, the other half of "take me to what changed," had a real gap
this time.** `agent._change_document_id` has resolved a real document id
on every write since §21 — the groundwork was correct, as ROADMAP already
said — but `changeRow`, the one shared function both the chat's "what
changed" list and the autonomous-pass review panel render a change
through, only ever checked `change.note_id`. A skill or the background
librarian writing a document produced a change with a real `document_id`
sitting right there, unused. Fixed with one more `if` reusing
`openDocumentFromNote` — the exact function a note's own "go to this
document" link already calls, not a new navigation path. Verified live: a
synthetic `document_id` change rendered a View button, and clicking it
actually un-hid `#tab-documents` (Playwright, not just reading the diff and
assuming the click handler does what it says).

**Still open**: reminders and categories have no `_change_reminder_id`/
`_change_category_id` equivalent on the backend at all — extending
`changeRow` further needs that resolver work first, the same shape
`_change_note_id`/`_change_document_id` already are, not just another
`if` with nothing behind it.

**What was and wasn't verified**: both fixes were checked live in
Chromium — the three link-chip render sites by reading and tracing the
code (each one calling the same already-proven `flashEntry`, so a fourth
browser round-trip would have re-confirmed a fact already established three
times over), and the document View button by an actual click producing an
actual visible tab change. Full `pytest tests/`, `ruff check .`, and
`node --check frontend/app.js` green (no backend change this item, so no
new Python tests).

## 48. Arc view's "labels behind nodes" — investigated live, did not reproduce

Continued the same session, straight after §47. ROADMAP's next item: "Arc
view: labels behind nodes."

**Read the code first**: `labelLayer` (`canvas.append("g").attr("class",
"graph-label-layer")`) is appended after every node circle in
`renderGraph`, for every layout including Arc — in SVG, a later sibling
always paints over an earlier one, so DOM order alone should already put
every label on top of every node, with nothing layout-specific that would
single out Arc.

**Then checked live rather than trusting that reasoning on its own**,
per this file's own rule about UI claims: seeded 8 notes, switched Graph to
Arc, and screenshotted it. Every label was clearly legible, angled outward
from its node at -40°, sitting on top of the nodes and the dotted
filing-hierarchy arcs beneath them — nothing hidden behind anything. A
first attempt at hit-testing this with `elementFromPoint` at a label's
`getBoundingClientRect()` centre gave a false negative (the SVG background,
not the label) — a known trap with rotated SVG text: the axis-aligned
bounding box of a rotated shape has a centre point that can fall in empty
space between the actual rotated glyphs, so it tests the wrong thing
entirely. The screenshot, not the hit-test, is what actually answered the
question.

**Left open rather than marked fixed, because nothing was found to fix.**
The report may depend on something this session's synthetic dataset
didn't reproduce — a much larger or more deeply nested tree, longer note
previews (this session's were short), a specific zoom level, or notes with
real `entry_links` rather than only the filing hierarchy. Recorded in
ROADMAP.md as needing the original report's exact steps or a screenshot
before a future session spends more time on it, rather than guessing at a
CSS change with nothing to verify it against — the same standing rule that
governed the Timeline "text cut off" investigation two items earlier in
this same session (§44).

## 49. A notifications-panel mute toggle, and the real bug it caught: eight preferences that saved and worked but never came back from GET

Asked for directly: a mute toggle inside the notifications panel itself,
not only in Settings, and the bell icon changing to show whether anything
but a reminder will get through. Built `#notif-mute-toggle` (🔕 Mute / 🔔
Unmute, `aria-pressed`) in the panel header, and `#notif-btn` now renders 🔕
instead of 🔔 whenever `notifications_muted_except_reminders` is set —
both driven by the same `notificationsMuted()` the toast/panel muting from
§44 already used.

**Verified live, and it didn't work — which is the real finding here.**
Clicking the toggle correctly called `PUT /preferences`, correctly got a
response back, and the bell still showed 🔔. Isolated with
`page.evaluate(() => toggleNotificationMute())` to rule out a click/DOM
issue: the function ran, returned `"ok"`, and the state still didn't
change. The cause: `get_preferences()` in `routes_settings.py` is a
hand-built dict of named keys, and the new `notifications_muted_except_reminders`
key was never added to it — so every `GET /preferences` (including the one
`update_preferences()` returns after a `PUT`) silently omitted it, no
matter what was actually stored.

**Checked whether the same shape existed elsewhere rather than assuming
this was a one-off, and found seven more**: `autonomous_tasks_enabled`,
`auto_tag_enabled`, `auto_link_enabled`, `auto_dedupe_enabled`,
`autonomous_tasks_interval_hours`, `autonomous_tasks_model`,
`battery_efficient_mode`, and `smart_model_routing_enabled` — every one of
them settable, and every one of them read straight from storage by
`autonomous.py` or `model_manager.py`, so the *behaviour* was always
correct. What was never correct is what the Settings UI showed: every
checkbox bound to one of these reset to unchecked the moment the page
reloaded or the panel reopened, regardless of what had actually been saved
and was actually in effect. The exact user-facing shape of "keeps
disabling itself" this project has chased before (§42) — but a different
cause: §42 was two controls fighting over one preference; this is the GET
response never having the preference in it at all, for eight separate
keys, the whole time.

**Why the test suite never caught it**: plenty of tests set these
preferences and assert on the *behaviour* that reads them (does the
scheduler wake, does `_run_optimization` skip, does routing pick the
utility model) — nothing ever asserted what `GET /preferences` echoes back.
Two new regression tests close that gap directly:
`test_autonomous_and_battery_preferences_round_trip_through_get` (all eight,
set to non-default values, then read back) and
`test_notification_mute_preference_round_trips_through_get`.

**Verified live end to end after the fix**: `curl`/Playwright round-trip
through the real running server — PUT true, bell shows 🔕, reload the page,
still 🔕; PUT false, back to 🔔. Full `pytest tests/`, `ruff check .`, and
`node --check frontend/app.js` all green.

**What was and wasn't verified**: driven live in Chromium with a real
screenshot, not just reasoning about DOM order. No code changed this item —
say so plainly rather than claim a fix that has nothing to point at. Full
`pytest tests/`, `ruff check .`, and `node --check frontend/app.js` were
already green from the previous item and nothing here touched either
codebase.

## 50. A CodeQL ReDoS in the title regex, then Tier 1's two highest-value graph bugs, both diagnosed live and fixed

Started from a CodeQL alert (`py/polynomial-redos`, high severity) on
`manager._TITLE_LINE.match(stripped)` in `extract_title`/`apply_title`/
`remove_title` (§43's note-title feature). `^#{1,6}[ \t]+(\S.*)$` is exactly
the anchored-quantifier-before-`$` shape CLAUDE.md already names as the one
to avoid (the same family as the `_TRAILING` fix on `main`). Replaced with
`_heading_text`, a hand-rolled linear scan (count leading `#` up to 6, require
a space/tab, reject if what follows is empty or itself whitespace) — no
backtracking possible because there's no backtracking engine involved.
Checked it matches the regex's exact semantics on the edge cases that matter
(7+ hashes, a `#` with no space, non-ASCII whitespace like `\xa0` right after
the hashes) before trusting it, and measured 80,000 tabs at 1.8ms, flat.
`tests/test_core.py`/`test_private_notes.py`/`test_waven_api.py`'s existing
title tests all still pass unchanged — this is a drop-in replacement, not a
behaviour change. (A second CodeQL alert on the same file, `py/cyclic-import`,
Note severity, was checked and left alone: `_deduce_reason`'s
`from memorymap.ai.embeddings import ...` is already deliberately deferred
inside the function to break a real cycle — `ai.embeddings` →
`ai.model_manager` → `entry.manager` for `log_action` — which is the standard
fix for a Python import cycle, not a bug.)

**Then ROADMAP.md's own "start here next" — Tier 1 items 10 and 11, both
undiagnosed, both high value.** Read the code before touching anything, per
this project's standing rule, and both turned out to share a family of root
cause: a value with no sensible default read as "right now" instead of
"never", or a hover event misfiring during a gesture that isn't really a
hover.

**Item 10 — Tree/Radial/Arc lost every edge when the Time Filter left "All
time".** `renderGraph`'s `applyTimeFilter` checks
`d.source.created_at`/`d.target.created_at` per edge. That only holds a real
note's timestamp once `d3.forceLink` has resolved a link's `source`/`target`
from an id to the actual node object — true for Force. Tree/Radial/Arc build
their edges in `layoutHierarchy` instead, and a huge fraction of them are
*filing* edges from a category heading (or the synthetic `root`) down to a
note — `layoutHierarchy`'s own `graphGroupNode` has no `created_at` field at
all. `undefined || Date.now()` read every one of those as "created this
instant", later than any cutoff short of "All time", so the heading — and
every edge touching it — vanished the moment the slider moved even slightly.
Force never hits this because it has no synthetic heading nodes.

Reproduced before fixing, not guessed at: seeded linked notes via Playwright,
switched the layout in `localStorage`, called `renderGraph()`, and counted
`.graph-edge` elements with `visibility !== "hidden"` before and after
dragging the slider. Unpatched: Tree went from 14/14 visible edges to **0/14**
the instant the filter left "All time"; Force stayed correct at 2/4 the whole
time. Fixed by treating `isGroup` nodes (headings, root) as exempt from the
time filter — they're organising furniture, not a dated note, so hiding them
was never the intent — via a shared `timeVisible(d, val)` helper used by the
node, label, *and* edge visibility checks (an edge shows only if both its
ends do). Re-verified the same way after the fix: no longer zero on any
layout.

**Item 11 — dragging on empty graph canvas sometimes highlighted an unrelated
note.** Reproduced first (the item was explicitly "not yet reproduced" in
ROADMAP.md): a Playwright drag starting and ending on genuinely empty canvas
— confirmed with `document.elementFromPoint` at the start coordinate, not
assumed — left a node's `.graph-focus` class stuck on well after the pointer
had moved away and the button released. Cause: panning translates the whole
`<g>` canvas under a *stationary* cursor, so a node's on-screen position can
slide directly under the pointer mid-drag without the user ever moving their
mouse onto it — and that fires a completely genuine, native `mouseenter` on
whatever node happens to pass by. The matching `mouseleave` doesn't reliably
fire again before the mouse button releases, so the hover-spotlight
(`graphHoveredId`, `applyGraphHighlight`) stays lit on a note the user never
meant to touch.

A first attempt — clearing `graphHoveredId` on the zoom behaviour's own
`start`/`end` events — cut the failure rate but didn't close it: a
`mouseenter` mid-gesture could still re-set the hover *after* `start` had
already cleared it, and nothing cleared it again until the next real hover
somewhere else. Fixed properly with a `graphIsPanning` flag, set on `start`
and cleared on `end`, that the `mouseenter`/`mouseleave` handlers both check
and bail out of — so a node sliding past mid-pan never lights up at all, and
only a genuine, stationary hover once the drag has ended does. Verified with
6 consecutive clean Playwright runs after the fix (`hoveredId: null,
focusCount: 0`), against a 100% reproduction rate before it. One test-harness
trap worth recording: an early "still stuck" result was the *test's* own
200ms wait being shorter than d3-zoom's async `end` dispatch, not a bug in
the fix — confirmed by logging the zoom's own `start`/`end` events and seeing
`end` reliably fire, just later than the check.

Both graph fixes are pure `frontend/app.js` changes with no backend
counterpart, so there is nothing for `pytest` to pin — the Playwright
reproduction *is* the regression test for both, run against a real `uvicorn`
server per CLAUDE.md's recipe, not reasoned from reading the DOM. Full
`pytest tests/` (~1,600 tests), `ruff check .`, and `node --check
frontend/app.js` all green throughout.

**What's next**: ROADMAP.md's remaining Tier 1 items (meeting transcription,
the skill-run timeout/false-done-tick pair, the small-talk/TOOLS_GUIDE prompt
contradiction, background tasks that never appear in the task list), then
Tier 2 top-down.

## 51. All of Tier 1 cleared (four items were already fixed, four bugs weren't), then Tier 2 top-down: change-target resolvers for reminders/categories, a real bold/italic toggle, and two whiteboard single-click bugs

Continued straight from §50 in the same long unattended session, per the
user's own "work autonomously, don't wait for my prompt" instruction. §50
covers the ReDoS fix and the two graph bugs; this section is everything
after Tier 1 was fully clear.

**Tier 1's last four items (2, 3, 4, 6) were found already done**, not
built. Each was checked against the actual code and existing tests before
being crossed out — not assumed from an uncrossed-out ROADMAP line, which
is exactly the staleness this project's own history keeps warning about.
Items 2/3 (skill step timeout, false "done" tick, network-error handling)
were already in `skill_runner.py` and `app.js`'s `STREAM_IDLE_TIMEOUT_MS`,
pinned by `test_a_step_that_produces_nothing_is_not_ticked_done` and
`test_a_network_failure_mid_step_stops_the_run_instead_of_repeating` — both
§41's work. Item 4 (small talk reaching the agent's `TOOLS_GUIDE`) turned
out to be a non-issue: `routes_chat.py` only ever calls the tool-enabled
agent when `intent.needs_retrieval(...)` is true, which `SMALLTALK` never
is, and `test_a_bare_yes_is_ordinarily_smalltalk_not_the_agent` already
proves it. Item 6 (unregistered background threads) turned into a full
sweep — every `threading.Thread(` call site in `src/memorymap` checked by
hand against `routes_tasks.collect()` — and found all nine already
covered, one of them (`embedmodels.py`) carrying its own "Tier 1 §6"
comment from whichever earlier session actually fixed it.

**Tier 1 item 1 (meeting transcription) was re-confirmed, not re-fixed,
one step further than before.** `faster-whisper` installed cleanly (no
torch — the standing CLAUDE.md constraint is about `sentence-transformers`
and torch specifically, not this package). A real WAV clip POSTed to
`/voice/transcribe-meeting` on a live server got back `503 "Couldn't load
the Whisper 'base' model... check your internet connection"` — the exact
distinct error §41 built, not the old generic mystery error. A genuinely
successful transcription still couldn't be observed: this sandbox's
network policy blocks `huggingface.co` outright (403 at the proxy,
confirmed via `$HTTPS_PROXY/__agentproxy/status` rather than assumed from
the symptom) — an environment limitation, not a code question. Said so
plainly in ROADMAP.md rather than claiming a screenshot that doesn't
exist.

**Then Tier 2, item 13 — reminders and categories got the same
`_change_*_id` resolver notes and documents already had.** `agent.py`
gained `_change_reminder_id` (an int id, same shape as `_change_note_id`)
and `_change_category_name` (a *name* — every category tool already works
in names, so this names the field that carries one rather than inventing
an id nothing else uses; `delete_category` is destructive like
`delete_document` and never reaches this code path). `changeRow` grew two
View buttons: `flashReminder(id)` (switches to Reminders, forces the
filter to "all" since the change that brought you here, e.g. completing a
reminder, is exactly the case the default "open" filter would hide, then
scroll-flashes it the way `flashEntry` does for notes) and
`flashCategory(name)` (reuses the sidebar's own `activeCategory` filter
rather than a second filtering mechanism). Verified live: created a real
reminder and a real note in a fresh category via the API, called both
functions directly, confirmed the tab switched, the item was found, and —
waiting the two animation frames the flash needs, which an early check
missed — the `.flash` class was actually applied.

**Item 16b — the document editor's bold/italic didn't toggle off.**
`wrapDocSelection` only ever wrapped; a second press on already-bold text
stacked a second `**` pair instead of removing the first. Now checks both
shapes a selection can be in — markers just outside it, or included inside
it — before wrapping, so a second press strips them either way. No JS test
runner exists for this file, so verified directly against the real
`#doc-content` textarea: `hello world` → Bold → `**hello** world` → Bold
again → `hello world`, byte for byte; the whole-span-selected and italic
cases both round-tripped the same way.

**Then two whiteboard bugs, reported live mid-session and fixed the same
way §50's graph bugs were — diagnosed before touching anything.** The pen
tool's "doesn't respond to a single click, only a drag" turned out to be a
whiteboard-only gap: the sketch pad's own pen already drew a dot on a
stationary click (`sketchEnd`'s `!sketchMoved` branch), but the
whiteboard's separate SVG-path implementation discarded a click with no
movement outright (`currentDrawData.length < 2` → delete the path, return).
Mirrored the sketch pad's own trick — a near-zero-length line segment,
which a round linecap renders as a visible dot — instead of a second,
different fix. The eraser had the same symptom for a different cause: it
only ever caught a stroke via `mouseenter` while the button was held, which
needs real movement to fire at all, so a plain click on a shape did
nothing; its `click` handler (already there for the Delete tool) now also
fires for the eraser. Verified live against a real running server, not
assumed from the code: single pen click on empty canvas, 0 sketches → 1;
single eraser click on that same dot, 1 → 0.

**A related, small feature asked for directly**: a `↺` reset button next
to the whiteboard's board-colour picker, since picking a colour left no way
back to the theme's own default short of guessing its hex. Clears the
`localStorage` override and re-reads the *live* computed colour rather than
a hardcoded hex, so "reset" still means "the theme's colour" after a
light/dark switch. Verified live: pick a colour → persisted; reset → the
swatch shows the real computed default, not a placeholder.

**What's still open, reported live and correctly not force-fixed**: the
single-node hover-highlight during a drag was re-reported as still
happening, outside this sandbox, after §50's fix — which specifically
targeted panning (dragging empty canvas) and was verified 6/6 clean here.
Checked whether an actual node-drag shares the same cause and it doesn't:
every *other* node is pinned (`fx`/`fy` set) for the length of a node drag,
so nothing can slide under a stationary cursor the way panned content
does. No obvious quick fix without a fresh repro (which tool, which
gesture, which browser) — named in ROADMAP.md rather than guessed at.
Also named but not built: "a lot of the whiteboard's tools are missing —
it should be an upgraded version of the sketch pad", asked for directly
but not itemised; most of what's actually missing (redo, select/rotate,
shift-to-lock, images) is already named in item 11's own open list rather
than being a new, separate gap.

**Then item 16a — the document editor's sidebar, reported with
screenshots.** The sticky/floating half was already done (`#doc-sidebar`
already has `position: sticky`) — stale by the time it was reported,
corrected rather than rebuilt, the same shape as items 2/3/4/6 above. The
Outline-collapses half was real, and measured live before touching
anything: 10 headings' outline went from 258px tall to exactly **0px** the
instant the "Where are my documents kept?" disclosure opened. Cause:
`.doc-sidebar > details` was `flex: 0 0 auto` — flex-shrink *zero*, which
means *exempt* from shrinking — while the outline above it had no minimum
height at all, so the entire squeeze landed on the one sibling that could
give and had nothing left to give. That is backwards from what the CSS
block's own comment already said the intent was ("the help disclosure
gives up its space first"). Fixed by giving the outline a real floor
(`min-height: 4rem`) and actually making the disclosure shrinkable with
its own internal scroll. Re-measured after: outline settles around 100px,
visible and scrollable, instead of 0.

**Then item 14's other open half — the Timeline line view's own note
popup showed no markdown and no attachments.** `openTimelinePopup` set the
content with `.textContent`, so `# Heading`/`**bold**` showed their raw
punctuation, and never touched `#timeline-popup-media` at all — the div
existed in the markup (reusing the graph popup's own CSS class) but
nothing had ever populated it: a feature that never ran once, the exact
shape CLAUDE.md's own review checklist names. Rewired to reuse
`renderMarkdown` (the note card's own renderer, not a second
implementation) and a `renderTimelinePopupMedia` that mirrors
`renderGraphPopupMedia` almost line for line — same
`attachmentObjectUrl`/`openLightbox` calls, so a thumbnail click still
opens the full-size lightbox the same way. Also fixed in passing: the
popup's screen position was computed once, before an attachment's
thumbnail had loaded and made the popup taller — `placeTimelinePopup` now
re-runs after the image resolves, the same fix the graph popup already
needed and had. Verified live against a real running server, not reasoned
from the code: a note with a heading and bold/italic text rendered as real
`<h3>`/`<strong>`/`<em>` elements with zero literal asterisks; a real
uploaded PNG showed as an `<img>` with a genuine `blob:` src.

**Then item 16c — "images and files still can't be copied, pasted, or
dragged into notes."** Checked live before building anything, per this
project's own standing rule, and two of the three claimed-missing paths
already worked: a global `document`-level `paste`/`dragover`/`drop`
handler in `app.js` matches *any* `<textarea>` generically, and
`#entry-content` (Capture) is one — so paste and drag-drop already
uploaded to `/media/upload` and inserted markdown, with nobody having
wired Capture specifically. Verified live with real dispatched `paste` and
`drop` events carrying a PNG, not assumed from reading the handler. The
third path — a file-picker button — was genuinely missing (the only
"attach" control near Capture links existing *notes* to a chat message,
not a file upload) and is now built: `📎 Attach`, reusing the same
`handleFileUpload` the other two paths already call. Verified live with a
real Playwright file chooser and a real PNG on disk. One trap worth
recording for next time: Capture lives in the Notes tab's own `capture`
sub-section, so `switchTab("notes")` alone leaves it `display: none` and
the button unclickable — needs `showNotesSection("capture")` too, the
CLAUDE.md-documented Notes-tab trap, hit here for a different element than
the one it already names.

**Then item 18 — the full-screen graph's suggested-links list "runs off
the bottom without scrolling."** Reproduced live before fixing: with the
Options panel open and 15 link suggestions, full-screen content was
1061px tall in a 498px window, and `#graph-card`'s own `overflow: hidden`
— added deliberately in an earlier session for a different bug entirely
(the graph "being out of the main UI panel"; its own comment explains why)
— still applied in full screen, since an ID beats a class on specificity
no matter what order the rules are written in. A plain
`.graph-fullscreen { overflow-y: auto }` would have lost that fight
silently and changed nothing. The last several suggestions weren't just
unscrolled, they were unreachable outright. Fixed with
`#graph-card.graph-fullscreen { overflow-y: auto }` — an id *and* a class
together, which wins outright — and confirmed live with a DOM marker on
the last suggestion: off-screen and permanently so before the fix,
reachable by scrolling after it. The item's other clause, "the sketch/image
toggles," didn't match anything in the current Options panel (Similarity /
Hide unlinked / Labels, no sketch or image controls at all) — left alone
rather than guessed at; possibly a stale note from whatever session first
triaged this list.

**Then a note card menu redesign, asked for directly** (not a prior
ROADMAP item): the ⋯ overflow menu had grown to 15 flat items (14 without
a title), and the ask was to group related ones into sub-sections that
open a side popup on hover or click, working on small screens too.
Restructured `entryOverflowMenu`: three items stay flat at the top level
(Make private/readable, History, and the destructive Move to bin, kept
one click away rather than buried), and the other twelve group into three
side flyouts — **✨ AI actions** (Re-evaluate, Improve writing,
Generate/Regenerate title, Remove title), **🔗 Connect** (Add/Expand into
a document, Link to another, Similar notes), and **➕ Add** (Add context,
Continue thought, Remind me, Attach a file). A new `buildMenuGroupButton`
opens its flyout on `mouseenter` (a 120ms delay so a mouse merely crossing
the item doesn't trigger it) and on click (the only way in on a
touchscreen), flips from the right side to the left when it would run off
the viewport's right edge (measured live, the same "which side has room"
check the graph/timeline popups already use), and — below 720px, this
project's own standing phone breakpoint — drops the side-popup
positioning entirely in favour of expanding in place, since there is
nowhere for a flyout to go on a phone-width screen without running off it.
Reused `buildMenuItemButton` for every item at both levels so a click
behaves identically no matter how deep it's nested, and scoped the
top-level arrow-key handler to `:scope >` children specifically — without
that, a hidden submenu's own items would have joined the top-level
Up/Down/Home/End list and silently broken it, since `querySelectorAll`
does not stop at the first level by default. Verified live end to end:
clicking a group trigger opens the correct three (or four) items, nothing
else; hovering a *different* group closes whichever was open and opens
the one under the pointer, never both; at 390px width (iPhone-sized) the
submenu measured `position: static` with zero horizontal overflow, versus
`position: absolute` and a real `left`/`right` flyout at desktop width.

Full `pytest tests/` (~1,600+ tests), `ruff check .`, and `node --check
frontend/app.js` all green throughout — each fix run individually before
moving to the next, per this project's own standing practice.

**What's next**: ROADMAP.md's remaining Tier 2 items, prioritised by
correctness-bug-over-new-feature the same way Tier 1 was — the larger,
properly scoped items (the sketch pad's selection tool, the whiteboard's
redo/select/rotate list, onboarding's seeded-notes/guided-tour work) roughly in
that order, unless a live report reprioritises something above them.

## 52. The Arc view's real labels-vs-arcs clash, an optional title field decided and built, and a whiteboard panel-layout reset

Continued straight from §51 in the same session, driven by three things the
user raised live: a screenshot of the Arc view's labels, a direct decision
on §16d's title-field question, and a request for a way back to the
whiteboard's default panel layout.

**Item 15, finally reproduced.** Earlier sessions (§48) investigated "labels
behind nodes" and found nothing — DOM order already put every label on top,
so z-order was never the bug. A fresh screenshot this session showed the
real problem was never z-order: it was *position*. Arc's labels were tilted
`rotate(-40, ...)` — upward — and `arcPath`'s connection arcs curve through
exactly that same strip above the baseline, so text and arcs were fighting
for the same space. Measured live before touching anything: 9 of 10 labels'
bounding boxes overlapped a `.graph-edge`. Flipped the tilt to `rotate(40,
...)` (down instead of up), which moves every label into the arcs' empty
side of the row while keeping the same anti-collision shape — still angled,
still reading outward from its own node rather than stacking onto the next
one. Verified two ways, not just reasoned about the trig: a `getBoundingClientRect`
check that every label now sits mostly below its node's vertical centre
(true for all, false before the flip), and a zoom-to-fit screenshot showing
labels clearly readable underneath the row with the dotted arcs undisturbed
above it.

**Item 16d, decided and built the same session it was asked.** The user
confirmed the shape ROADMAP.md had already scoped: write the title into
`content` as a leading `# {title}` heading — the exact line
`manager.extract_title` (§43) already reads — rather than a second stored
field. One shared `withTitle(content, title)` helper, used by both
dedicated note-creation forms: `#entry-title` in Capture, and
`#graph-new-note-title` in the graph's own "+ New note"/"+ Connected note"
popup (voice dictation, templates and quick actions all write into
Capture's own textarea already, so they needed no separate wiring). Also
confirmed rather than assumed: a note started with a bare single `#` (not
only `##`–`######`) was already read as a title before this change —
`extract_title`'s own `#{1,6}` always covered H1, so the "detecting a
single #" half of the ask was already true and needed no build. Verified
live end to end against a real server: a title typed in Capture produced
`# My Explicit Title\n\n...` in the saved note, with the computed `title`
field reading back correctly and the input clearing after save; a bare `#`
line typed straight into the body, with the title box left empty, read
back with the same computed title; the graph popup's own field round-tripped
identically.

**A whiteboard panel-position reset, asked for directly.** Once a panel
(board switcher / library+colour-picker / tool strip) had been dragged,
there was no way back to its default corner short of clearing
`localStorage` by hand. A `⟲` button next to the board-colour reset clears
every panel's `wb-panel-pos-*` key and its drag-time inline styles
(`left`/`top`/`right`/`bottom`/`transform` — all `place()` ever sets), so
each panel's own `top-left`/`top-right`/`bottom-center` CSS class — never
removed, only ever overridden by those inline styles — takes back over.
Verified live: simulated a drag (moved the board panel to an arbitrary
position, saved to `localStorage` the same way a real drag does), clicked
reset, confirmed the panel's rendered position and `localStorage` entry
both returned to their pre-drag state.

Full `pytest tests/` (~1,600+ tests), `ruff check .`, and `node --check
frontend/app.js` all green. Every fix in this section was verified against
a real running server via Playwright — screenshots, `getBoundingClientRect`
measurements, real saved notes read back through the API — not reasoned
from the code alone.

**What's next**: the remaining Tier 2 items are unchanged from §51's own
list — the sketch pad's selection tool, the whiteboard's larger redo/
select/rotate/images list, item 16 (documents in the graph, needs scoping),
and onboarding's remaining pieces (seeded notes, the model-pull UI, a
data-dir writability probe, a guided tour). 16e/16f (an emoji picker, a
full emoji-usage sweep) are still open design questions, not yet asked
about directly the way 16d just was.

## 53. A user-reported bug list, then the whiteboard rebuilt into a real OneNote/draw.io-style canvas

Condensed from HANDOVER.md's own (much longer) writeup of this session —
read there for the full detail, including the CodeQL path-traversal fix and
the exact verification steps.

Fixed a live-reported bug list first: `PUT /whiteboard/nodes` 500ing on a
stale card (missing `_hard_delete` cleanup); two Preferences sections
overwriting each other's saved fields; glassmorphism opacity having no
independent control from blur; inline `![...]()` images rendering as raw
markdown app-wide instead of `<img>`. Then the whiteboard, per ROADMAP §11:
a redesigned board picker (`GET /whiteboard/boards` — only boards actually
in use, not every note in the notebook); a new `WhiteboardObject`
table/kind for images and text boxes (upload/paste/drag-drop, 8-handle
resize, full drag); clear-board, SVG/PNG/PDF export, and three grid types
with snap-to-grid wired into card/object dragging. **Explicitly not
attempted**: real anchor/connection points (fixed corners+edges, a free
point along an edge) — named as "the biggest single piece, worth its own
session" rather than built shallow. A CodeQL alert on the image-object
delete path (`py/path-injection` — a `startswith("/media/")` check that
`/media/../../etc/passwd` passes) was fixed with an exact-shape regex plus a
resolve-and-confirm-containment check.

## 54. The whiteboard bug list — copy/paste, sketch move/resize, multi-select, a real security/correctness bug in `/media`, and the rest of §11/§53's own "still open" list

A user-supplied list of 17 specific whiteboard/notes bugs, worked first per
this project's own standing rule, then the rest of ROADMAP §11's still-open
list and several more reports that arrived mid-session. Long session, no
check-ins asked for; every fix below was reproduced live in this sandbox's
Chromium before and after, not reasoned from the code.

**The one that wasn't about the whiteboard at all.** "Image upload on the
whiteboard doesn't work" turned out to be one symptom of a real, previously
unnoticed bug reaching every `/media/` image in the app: `GET
/media/{filename}` (and `GET /files/{attachment_id}`) required the
`X-Auth-Token` header, which a plain `<img src>` — or a CSS
`background-image`, or an `<image>` inside an exported SVG — never attaches;
only `fetch`/`XHR` can set a custom header. Every such image was a silent
401 (a blank/broken image, nothing thrown, nothing logged) on any notebook
with a password set, which is the normal case — including, per §53's own
"verified live" claim, the note-list inline-image fix from the previous
session, which most likely only ever confirmed the `<img>` element existed
in the DOM, not that it painted. Fixed with a query-param token fallback
scoped to just those two routes (`require_unlock_media`, a separate
`media_router` in `routes_files.py` — every other route stays header-only,
so the token doesn't end up in every access-log line, only these two), and
a frontend `mediaSrc()` helper wired into every affected render site
(whiteboard image objects, inline note/doc markdown images, Library
thumbnails, the whiteboard's own background image and SVG export). Verified
live: an uploaded image's `naturalWidth`/`naturalHeight` now match the real
file instead of failing to load.

**Whiteboard bugs, reproduced and fixed:**
- **Drawing over a card moved the card instead of drawing on it.** Cards
  live in `#wb-html-layer`, a sibling painted on top of `#wb-svg-layer` — a
  pointerdown landing on a card never reached the SVG layer's own draw
  listener, and the card's own `d3.drag` (bound directly to it) claimed the
  gesture regardless of which tool was active. Fixed by filtering the
  card/object drags to bail while a brush tool is active, and moving the
  brush pointerdown/move/up listeners from `svgCanvas` to `containerEl` (an
  ancestor of both layers, so it sees the pointerdown either way — mirroring
  the eraser-tracking listener's own established pattern).
- **Sketches (pen/line/rect/circle/highlighter/arrow) had no move or resize
  at all** — only cards/objects did. A sketch's only representation is its
  SVG path string, so both mean rewriting the coordinates inside it: a
  small path-transform interpreter (`wbTransformPathD`/`wbPathBBox`, scoped
  to exactly the commands this app's own tools ever emit — M/L/C/h/v/a/Z)
  handles translate-for-move and anchored-scale-for-resize; 8 resize
  handles render only while a sketch is selected. A straight line's
  bbox-corner resize doubles as "shorten the line". Link sketches (computed
  live from two cards' positions) are excluded from handles by design.
- **Copy/paste, asked for directly.** Ctrl+C/Ctrl+V for the current
  selection, offset +24,+24 on paste. Cards excluded on purpose:
  `POST /whiteboard/nodes` is one-card-per-note-per-board by backend design
  (routes_whiteboard.py's own comment), so a "copy" would silently *move*
  the original card to the paste offset instead of duplicating it.
- **Multi-select — shift-click, rectangle marquee, bulk delete, bulk
  move.** `wbMultiSelection`, a set alongside (not replacing) the existing
  single-item `wbSelectedItem`. A real bug caught mid-build: deciding
  bulk-move eligibility in a drag's "start" handler (which d3 calls on
  *every* pointerdown, moved or not) meant a second shift-click meant to
  toggle a member back off was mistaken for the start of a bulk move and
  did nothing — fixed by deferring that decision to the first actual "drag"
  frame instead. Lasso (freeform) select not built; rectangle marquee
  covers the same real need.
- **Grid-snap only moved notes, not shapes/lines — and diagonal movement
  under snap felt stuck.** Two separate causes. Sketches had no drag at all
  (see above) — fixed as part of it, with the same `wbSnap` wired in. The
  "stuck" feeling was a real accumulation bug in the *existing* card/object
  drag: `d.x = wbSnap(d.x + event.dx)` re-snaps the *already-snapped* `d.x`
  every frame, discarding the sub-grid remainder each time instead of
  carrying it forward, so many frames of real small motion could sum to
  nothing until one single frame happened to cross a whole grid step by
  itself — worse on a diagonal drag, where each frame's per-axis delta is
  smaller for the same total speed. Fixed by tracking a raw, never-snapped
  running position and only reading it through `wbSnap` when
  applying/saving.
- **"Resizing and drawing shapes is glitchy and slow to update."** Dragging
  a card called a full `renderWhiteboard()` — rebinding every card, sketch
  and object on the board — on *every single mousemove frame*, purely to
  keep that card's own link lines following it. Replaced with
  `wbUpdateLinkedSketches(nodeId)`, which updates only the link paths
  touching the dragged card directly via `setAttribute`. Shape-drawing
  itself was already efficient (direct `setAttribute` per frame, no
  re-render) — this was the actual bottleneck.
- **Board picker / library accessibility** — checked, already built
  (`GET /whiteboard/boards`, §53), reachable via Library → Whiteboard's
  `#wb-board-select`. No fix needed.
- **Arrowheads.** `window.currentArrowStyle` (none/start/end/both), a
  toolbar `<select>` shown only while the arrow tool is active, read by the
  same drawing code (factored into `wbArrowHeadPath`, one head-stroke
  helper both ends now share).
- **More shapes.** Triangle and diamond, plain `L`-command polygons — no
  new path-command type for the move/resize transform to learn.
- **A dropped note card landed offset from the drop point** (reported
  mid-session). `d.x`/`d.y` are a card's own top-left corner, but the drop
  handler stored the raw cursor position there — for the ~250×150 default
  card that reads as up to 125px right/75px down from where it was actually
  dropped. Fixed by centring on the drop point instead, matching how a text
  box/image already places itself. A related, smaller inconsistency in the
  same drag-to-link code (`+125,+50` instead of `+125,+75` for a card's
  approximate centre) was fixed alongside it.
- **The eraser couldn't touch-drag to delete (the pen worked fine
  touch-dragged the same way), reported mid-session.** The eraser relied
  entirely on native `pointerenter` firing per element while held — touch
  implicitly captures the pointer to whatever element received the initial
  touch, so a dragging finger never fires `pointerenter` on the *other*
  items it crosses, only the one first touched. Fixed with
  `releasePointerCapture` on pointerdown plus coordinate-based
  (`elementFromPoint`) hit-testing on `pointermove`, which doesn't depend on
  capture behaving correctly at all. Verified via mouse drag-erase (no
  regression, all three items on a drag path erased in one pass); the
  touch-capture mechanism itself is reasoned from the Pointer Events spec,
  not observed on real touch hardware — this sandbox has none.
- **Text boxes were hard to see against the board.** `.wb-object-text` had
  a 1px *dashed* `--glass-border` (10–13% alpha in most themes) and no
  blur/shadow — every other floating surface on this board
  (`.whiteboard-floating-panel`) is a `.card.glass` and gets both. Given a
  solid border, a blur+shadow, and a background-opacity floor (`max(...,
  0.55)`) so it stays legible even with glass opacity turned all the way
  down.
- **The snap-to-grid checkbox rendered as a bare native control** — the
  app's own switch styling (`.settings-section label>input[type=checkbox]`
  etc., itself the fix for "ditch the radio buttons... make the UI match")
  never reached `.wb-snap-label`. Added to the same selector list.
- **Shift-to-constrain (square/perfect circle/etc.) while drawing a
  shape**, asked for directly — `wbShapeDims`, squares to the larger of the
  two raw dimensions so the shape still reaches the cursor.
- **Alt to temporarily bypass grid-snap for one drag**, asked for directly,
  the same convention Figma/Illustrator use — `wbSnap` takes an optional
  `bypass` flag, read from the drag event's own `altKey`.
- **"Does grid-lock apply when the grid isn't shown?"** — checked: no,
  `wbSnapOn()` already requires a grid type other than `"none"`, and the
  checkbox itself is disabled without one. Already correct; nothing to fix.
- **Clear board not clearing highlights, and highlights not being
  erasable** — investigated, not reproduced. A highlighter stroke is an
  ordinary sketch; drawing one, erasing it (both by a single click and a
  drag), and clearing a board holding one all worked correctly on the
  current code. Left as-is rather than guess-fixing something that
  reproduces as already working.
- **"Most used" list showing raw markdown or stripped-plain text instead of
  rendering it.** Two separate widgets, two different gaps: the Notes tab's
  own `#most-used-box` already called `renderInlineMarkdown` but truncated
  the *raw* string first, corrupting tokens cut mid-marker (a `` `code` ``
  span missing its closing backtick left a bare backtick visible); the
  Dashboard's newer per-widget Most-used/Pinned/Recent (`miniEntryList`)
  used `notePreviewText`, which strips markdown to plain text rather than
  rendering it — a deliberate past decision, per its own comment, made
  specifically to avoid the same mid-token corruption. A new `safeMdSlice()`
  helper (drops a dangling marker at the truncation boundary) fixes the
  actual problem the old workaround was avoiding, so both were switched to
  real rendering.

Full `pytest tests/` (~1,600+ tests), `ruff check .`, and `node --check
frontend/app.js` all green throughout. **Still open from §11/§53's own
list, not attempted this session**: real anchor/connection points (still
"worth its own session" — see ROADMAP item 11), a properties panel for
colour/border/fill on the current selection, rotation (needs a real backend
schema change — no whiteboard table has an angle column), card resize (only
images/text objects have it), image cropping, and an AI-guided
diagram-generation mode.

## 55. Continuing §54's own "still open" list: a properties panel, card resize, grouping, undo/redo for move and resize, arrow-key nudge, alignment/distribute, and rotation — plus a real silent-reset bug found the same way §54's own `group_id` one was

Same session as §54, continued after a context compaction — same user,
still working top-down through the "still open" list §54 itself left
behind, plus several more features named directly mid-session (a
properties panel, "suggested modes", grouping, arrow-key movement,
alignment tools). Authorised to work through the night unattended
("assume I agree with everything... commit and push as you go"). Every
behavioural claim below was driven against a real running server via
Playwright, not reasoned from the code — see the coordinate traps at the
end, which cost real time before the fixes below were confirmed real.

- **A properties panel for the current single selection**, asked for
  directly, more than once. `#wb-properties-panel`, populated by
  `wbUpdatePropertiesPanel()` from whichever kind is selected: a sketch
  gets colour+width (+arrowhead if it's an arrow); a text object gets
  colour+fill+border+font-size. Hidden entirely for a multi-selection, a
  card, or an image — none of those have a stroke/fill of their own to
  edit here.
- **Card resize**, asked about directly, confirmed missing by reading the
  render code in §54. `WhiteboardNode` gained nullable `width`/`height`
  columns (unset = the old ~250×150 CSS default, so an existing row renders
  unchanged); the same 8-handle drag as an object's own resize, factored
  into `nodeResizeDrag`. **Two real bugs found and fixed before this
  shipped, not after**: the card's own move-drag `.filter()` didn't exclude
  `.wb-resize-handle` the way an object's already did, so the card-level
  drag silently intercepted the same pointerdown and no resize ever
  happened; and a defensive `overflow-y: auto` added to `.wb-card` along
  the way triggered a real CSS spec quirk — setting one overflow axis
  non-`visible` while the other is unset forces *both* axes to compute
  non-`visible`, silently clipping the negatively-positioned resize handles
  sitting just outside the card's own box. Reverted; the pre-existing
  `.wb-card-content` 3-line clamp already handles long text without it.
- **Object grouping** (Ctrl+G / Ctrl+Shift+G), asked for directly. A
  `group_id` column on all three whiteboard tables (opaque
  `crypto.randomUUID()`, not a foreign key — one group spans three
  different tables, so there's no single row for it to point at) rather
  than an in-memory-only set: `wbMultiSelection` disappears on reload, a
  persisted group doesn't. Clicking any one grouped member re-selects the
  whole group (the other half of Ctrl+G, in `wbHandleItemClick`), and the
  existing bulk-move machinery drags a group "for free" once it's selected.
- **Undo/redo extended to cover move and resize, not just create/delete**,
  asked for directly ("account for resizes, rotates, positional movement").
  A new `"move"` entry type in `wbApplyHistoryEntry`, storing the item's
  whole pre-change payload (x/y, width/height, a sketch's own `d`) as
  `before` — one shape covers move *and* resize, since both just mean "the
  payload changed." Wired into every drag/resize end handler across all
  three kinds. A single dragged/resized item in a multi-selection gets its
  own undo entry; the rest of the group, moved via the separate bulk-move
  path, does not — a real, acknowledged limitation, not attempted further.
- **Arrow-key nudge**, asked for directly. Step size follows grid-snap
  (a full grid step when snap is on, 1px normally, 10px with Shift held) —
  moves the whole current selection (single item or multi) at once. Needed
  a genuinely new undo shape: nudging three selected items is one user
  action, and Undo pressed once should reverse all three, not one at a
  time — a new `"batch"` entry (an array of ordinary `"move"` sub-entries,
  replayed through the same `wbApplyHistoryEntry` recursively) covers this,
  and alignment/distribute below reuse it too.
- **Alignment tools** (left/h-centre/right/top/v-centre/bottom) and
  **distribute** (horizontal/vertical), asked for directly ("alignment
  tools... missing", named again this session). Live in the properties
  panel as a `wb-prop-multi-row` that replaces the single-item rows
  whenever `wbMultiSelection` is non-empty. Align references the whole
  selection's own combined bounding box (the same convention every other
  drawing app uses); distribute needs three or more, keeps the two outer
  items (by centre, along the chosen axis) fixed, and spaces what's between
  them evenly.
- **Rotation**, asked about directly, three sessions running. `WhiteboardNode`
  and `WhiteboardObject` each gained a nullable `rotation` (degrees). A
  round handle above the item's own top-centre (distinct at a glance from
  the square resize handles); dragging it computes the angle from the
  item's own screen-space centre to the pointer — `getBoundingClientRect()`'s
  centre stays correct even mid-rotation, since an axis-aligned box's centre
  coincides with the true rotation centre regardless of how far the box has
  turned, so this needs none of the zoom/pan-scale math a position drag
  does. Shift snaps to 15°. **Deliberately scoped to cards and objects, not
  sketches** — a sketch's shape *is* its path data, and rotating a path
  correctly (the `a` command's elliptical-arc flags flip under rotation)
  is real trig `wbTransformPathD`'s existing translate/scale math doesn't
  need; left for a future session rather than a shortcut that gets arcs
  wrong.
- **A real bug, found live, of the exact shape §54's own `group_id` bug
  was**: `wbSaveObject`/`wbSaveNode` each build their own PUT body by hand,
  independently of the `WB_KIND_INFO` payload builders used for undo — and
  neither one had been taught about `rotation` when it was added. Since the
  backend assigns `obj.rotation = body.rotation` unconditionally (a full
  replace, not a partial update), every single save — not just a rotation
  drag, *any* move, resize, or property edit — silently reset rotation
  back to `None`. Caught by a Playwright test reading `wbState` back after
  a rotate-and-wait, not by inspection: the live CSS transform showed
  `rotate(90deg)` (set synchronously during the drag) while the state
  object the async save had since overwritten already read back `null`.
  Fixed in both functions. **The lesson repeats**: every whiteboard field
  needs to be added at every call site that builds a request body by hand,
  and there is more than one such site per kind — grep for all of them, not
  just the first one found.

**One more real bug, found by looking, not testing** — the standing rule
this project's own CLAUDE.md states plainly ("measure and look before you
claim a UI change works"). A screenshot taken to sanity-check the new
multi-select properties panel showed the board picker reading
`UI screenshot (0 items)` for a board that visibly held three text boxes.
`refreshBoardList()`'s own item count summed `node_count + sketch_count`
only — `object_count` (images/text boxes), which `GET /whiteboard/boards`
has returned since §53, was never added to the sum. A board holding only
objects (no cards or sketches) read as empty in the picker even with
content on it. One-line fix; the screenshot that caught it was taken to
check panel *layout*, not this.

**Two Playwright coordinate traps found live, worth recording since they
cost real debugging time before being understood as test bugs, not app
bugs**: a marquee drag starting near the container's own top-left corner
lands on a floating toolbar panel sitting on top of the canvas there, and
the pointerdown never reaches the canvas at all (0 items selected, not a
partial miss) — start below roughly `container.top + 260`. And a marquee
ending too far down the viewport (`container.top + 700` in a 900px-tall
viewport) overshoots the canvas entirely and releases over the app's own
bottom tab bar instead — confirmed by logging every pointer/mouse event's
target during the drag, which showed the sequence ending on
`pointerup>tab-library`, not on anything whiteboard-related. Both are
about where a synthetic drag starts/ends, not a selection-logic bug; the
marquee/rectangle-intersection code itself was correct throughout.

Full `pytest tests/` (~1,600+ tests), `ruff check .`, and `node --check
frontend/app.js` all green. **Still open** (see ROADMAP item 11 for the
full ranked list): real anchor/connection points (still "worth its own
session," now named three times), sketch rotation, image cropping, an
AI-guided diagram-generation mode, uploaded whiteboard images not showing
in the Library as files, and a whiteboard backend/perf pass beyond the one
full-rerender bug already fixed in §54.

## 56. Real anchor/connection points, built and verified live — then a live-reported whiteboard bug list that arrived mid-session, all fixed and verified the same way

Started exactly where HANDOVER.md's own "start here" pointed: item 11's
confirmed build order, anchors first. Built and verified live via
Playwright before a long list of new UI reports arrived mid-session (the
user watching and chipping in, not a scripted list) — worked those next,
per this project's own standing rule to fix what's reported before
resuming a build plan. Mind-mapping mode and the AI+whiteboard integration
pieces (the second and third items in that same confirmed order) were
**not reached this session** — see "what's next" below.

**Real anchor/connection points**, matching how draw.io itself splits the
fixed-vs-free distinction, exactly as scoped at the end of §55:
- Eight **fixed** anchors (corners + edge midpoints) as `{x, y}` fractions
  (0–1) of a card's own bounding box — `sourceAnchor`/`targetAnchor` live
  as two more keys in the link sketch's existing `data` JSON blob, no
  schema migration, per the plan. A **floating** end (no anchor persisted)
  resolves fresh every render via the standard rectangle/ray intersection
  toward whatever the *other* end actually is — its fixed point if it has
  one, its centre otherwise — not always the other shape's raw centre,
  which is what makes a floating end track a moving fixed end correctly
  instead of just pointing at a static point.
- One set of shared helpers (`WB_FIXED_ANCHORS`, `wbAnchorPoint`,
  `wbNearestAnchor`, `wbBoxRayIntersection`, `wbLinkEndpoints`,
  `wbLinkPathD`) used by all three call sites named in ROADMAP's own
  scoping notes — the render path (`sketchUpdate.each`), the per-drag-frame
  follow (`wbUpdateLinkedSketches`), and the link-drawing gesture itself
  (`dragStart`/`dragging`/`dragEndNode`) — so the endpoint math can't drift
  between them the way the old hardcoded `x+125, y+75` centre offset was
  at least consistent about (wrong in the same way everywhere) but never
  actually correct anywhere.
- A drag now snaps to the nearest fixed anchor within ~16 board-px of
  where the gesture started/ended, on both the source and target end
  independently; anything farther persists no anchor (floating). Small
  SVG dots at a shape's 8 fixed points appear during a link drag —
  brighter/larger on whichever one is currently in snapping range — so the
  snap targets are discoverable rather than a silent hit-test, matching
  draw.io's own on-hover anchor markers.
- **Verified live end to end via Playwright**, not reasoned from the code:
  dragging from a card's exact top-right corner to another card's
  top-left corner produced `sourceAnchor: {x:1,y:0}`,
  `targetAnchor: {x:0,y:0}`, and a rendered path terminating precisely at
  those two corners (`M 350 500 L 700 700` for cards at board (100,500)
  and (700,700)); moving the target card afterward re-rendered the path to
  follow the new fixed corner exactly (`M 350 500 L 900 750` after a
  `+200,+50` move), not the old centre point. A centre-to-centre drag (no
  anchor in snapping range on either end) persisted a sketch with **no**
  `sourceAnchor`/`targetAnchor` keys at all and rendered at the exact
  rectangle-intersection point the shared maths predicts by hand
  calculation. The anchor-hint dots were confirmed to appear at drag start
  and while hovering a valid target, and to clear on drop.
- **Scoping decision, stated plainly rather than silently accepted**:
  anchor points are computed against each card's *unrotated* bounding box.
  A rotated card's anchors sit at its unrotated corners, not its visually
  rotated ones — the same simplification the old centre-point code already
  had (rotating around the centre doesn't move the centre, so that code
  never had to think about rotation at all; real corner anchors do, and
  this session didn't spend the trig on it). Worth fixing alongside sketch
  rotation (ROADMAP item 11's own "still open" list) rather than now.
- **A real, previously-unknown bug found *because* anchors target exact
  corners, not despite it.** Every card/object resize and rotate handle
  was `opacity: 0` by default (shown on hover/selection) but never
  `pointer-events: none` — an *invisible* handle still wins a hit-test
  over the card/object beneath it, at every corner and edge, for
  **any** tool, not only while selected, and the browser's own `:hover`
  fires the instant the cursor crosses the card regardless of which tool
  is active. A synthetic drag aimed at a card's exact corner (to test
  anchor-snapping) kept landing on the invisible resize handle instead of
  starting a link — reproduced by checking `document.elementsFromPoint`
  mid-gesture, not guessed at. Fixed two ways, both needed: `pointer-events:
  none` on the handles by default, `auto` again only inside a new
  `#whiteboard-container[data-current-tool="select"] ... :hover`/`.wb-selected`
  rule (hover alone wasn't enough — a link/pan gesture near a corner lost
  to the handle just as often once handles were shown on plain hover
  outside Select too). **Very likely the whole of a report that arrived
  minutes later** — see below.

**Then, live and unprompted, the user reported a run of specific
whiteboard UI problems while watching the session** — worked each one in
turn, per CLAUDE.md's own "fix what's broken before building" rule, all
reproduced and verified live before and after, not guessed at:

- **"Objects are also difficult and annoying to move around."** Traced to
  two separate causes, not one. First, the resize-handle bug just above —
  a small object's clickable area is mostly covered by its own 8 (now
  correctly non-interactive-when-hidden) handles, so this alone was a
  large part of it. Second, and specific to **text** objects: `.wb-text-
  content` (the contenteditable div) correctly excludes itself from the
  object's own drag — typing has to reach it — but since it fills the
  entire box, that left only the ~0.5rem padding strip around the text as
  a draggable surface, the exact width the resize handles sit on top of.
  Fixed with a dedicated `.wb-object-grip` (⠿, same glyph and convention as
  the floating panels' own drag grip), always visible, with its own
  separate d3-drag instance. **A real bug caught building the fix, not
  shipped with it**: the grip's first version reused the object's own
  `objDrag` behaviour (excluding `.wb-object-grip` from *that* instance's
  filter, mirroring how the resize/rotate handles already exclude
  themselves) — but `objDrag` is one shared behaviour bound to *both* the
  object and the grip, so the same filter runs for both elements' own
  pointerdown, and a target-`closest()` check can't tell "the grip's own
  listener firing" from "the object's listener catching a bubbled grip
  click" apart; excluding the grip's class from the filter silently
  disabled the grip's own drag too, not just the parent's duplicate. Fixed
  with a second, genuinely separate `gripDrag` instance (`event.sourceEvent
  .stopPropagation()` in its own start handler, the same fix `resizeDrag`/
  `objectRotateDrag` already use for the identical shared-parent problem).
  Verified live: dragging by the grip moved the object by the expected
  delta, checked mid-gesture and after drop, not just after.
- **"The bottom tool bar is getting quite long... make them like a
  selectable dropdown."** The six shape tools (line/arrow/rect/circle/
  triangle/diamond) collapsed into one `#wb-shape-toggle` + popover, still
  plain `data-tool` buttons underneath so the existing delegated click
  listener on `#wb-tool-group` needed no change. **Grouped in two,
  asked for directly** ("line and arrow should be one group, and the other
  shapes should be another") — line+arrow sit together above a divider
  from rect/circle/triangle/diamond, which is also functional: the
  relocated "Line ends" control only applies to the first group. **A real
  bug caught live, not shipped**: the first version called
  `shapeMenu.addEventListener("click", stopPropagation)` to keep clicks on
  the line-ends select from being treated as "outside the menu" by the
  close-on-outside-click listener — except the outside-click listener
  already excluded anything inside `#wb-shape-picker` via its own
  `closest()` check, so this line was not just unnecessary but actively
  wrong: it also stopped a tool-button click from *ever* bubbling to
  `#wb-tool-group`'s delegated listener, so picking a shape did nothing at
  all and the menu never closed. Found by an end-to-end Playwright check
  (pick "circle" → assert `currentTool === "circle"`) that failed cleanly
  rather than by reading the code twice. Verified live after the fix:
  opening the menu, picking each shape, confirming `currentTool` updates,
  the toggle's own icon swaps to match, and the menu closes both on a
  pick and on an outside click.
- **"I also want to be able to adjust it as a sidebar and not just a
  bottom bar."** A `#wb-dock-toggle` button flips `data-dock` between
  `"bottom"`/`"side"` (persisted in `localStorage`), which the CSS reads to
  switch the tools panel between its usual horizontal row and a vertical
  column pinned to the left edge — same controls, same click handlers,
  laid out differently. **One specificity trap worth recording**: a later,
  unrelated rule earlier established for spacing (`.bottom-center { bottom:
  var(--space-3) }`) has the identical specificity (0,2,0) as a bare
  `[data-dock="side"]` attribute selector, so without deliberately writing
  the dock rule as `.bottom-center[data-dock="side"]` (specificity
  (0,3,0)), source order alone would have let that later rule silently win
  and pin the "sidebar" to the bottom edge regardless of the toggle.
  Verified live: toggling produced a tall, narrow, left-docked panel
  (68×656px in the test viewport) with its tool row now vertical; toggling
  back restored the original bottom-center layout exactly.
- **"Cursor changing to the rotate icon when hovering over or using the
  rotate nodes."** The rotate handle already had `cursor: grab`; replaced
  with a small inline-SVG curved-arrow cursor (same `data:image/svg+xml`
  technique `wbCursorUrl` already uses for the drawing tools, just written
  as static CSS here since this is one fixed element's `:hover`, not a
  per-tool cursor computed in JS), `grab`/`grabbing` kept as the fallback.
- **"Regular lines should also get line end options... arrow heads."** The
  Line tool now shares the same "Line ends" control the Arrow tool already
  had (`window.currentArrowStyle`, applied identically in the live-drag
  preview) rather than a second, separate control — picking "End" and
  drawing with the Line tool now produces the same multi-`M` arrowhead
  path an Arrow draw already did, verified live by reading the saved
  sketch's own `data.d` back (three `M`s: shaft + two head strokes). A
  full "circles, squares, single/double/triple lines" end-cap system
  (asked for in the same message) was **not built** — scoped, not
  guessed at, see "what's next" below.
- **"The properties panel title should be right at the top next to the
  drag move icon."** The grip and the "PROPERTIES" title were two separate
  block-level rows inside the panel's own `flex-direction: column`,
  which is what put a large gap between them — wrapped both in one
  `.wb-panel-header` row instead. Verified live (real selection, real
  panel, not a static screenshot): grip and title's own bounding rects
  now share the same `top`, a few pixels apart horizontally, not stacked.
- **"Clean up the UI spacing, height and alignment... everything is
  different heights."** Real and structural, not a screenshot artifact:
  there was no `.icon-button` CSS rule at all — every plain icon button,
  `button.small` (Library, zoom, board-picker), `<select>`, and the colour
  swatch `<input type="color">` were each sized by their own default
  padding/content, so a text+icon button stood taller than its round
  neighbour. Scoped to the whiteboard's own floating panels (not a global
  button/select change, which have their own established sizing
  elsewhere) — every control now shares one explicit height. Verified
  live: every visible control's `getBoundingClientRect().height` in the
  tools panel now reads the same 36px.
- **"Make the corners of the whiteboard rounded if the user has rounded
  edges set in their appearance settings."** `.whiteboard-container` had
  no `border-radius` at all — added `var(--radius)`, the same global token
  the Appearance slider already writes everywhere else, so the board's own
  corners now follow it instead of being the one hard-edged rectangle in
  the app. `overflow: hidden` (already present, for the grid/background
  layers) is what actually clips content to the rounded shape. Verified
  live: computed `border-radius` reads `14px` at the default setting.

All ~1,600 tests pass (Python side is untouched this session — every
change above is `frontend/app.js`/`index.html`/`style.css` only), `ruff
check .` is clean, `node --check frontend/app.js` is clean, and the three
frontend-shape lint tests (`test_frontend_ids.py`, `test_frontend_
handlers.py`, `test_style_scale.py`) all pass. **What was and wasn't
verified**: every behavioural claim above — anchor snapping and its exact
coordinates, the resize-handle pointer-events fix, the grip drag, the
shape-menu pick/close cycle, the dock toggle's own layout, the line
arrowhead, the properties-panel header, and the uniform control heights —
was driven against a real running server via Playwright, reading back
`wbState`/computed styles/DOM rects, not reasoned from the diff. The
rounded-corner fix is a one-line, low-risk CSS token addition confirmed by
computed style but not screenshotted. **Two environment traps cost real
time this session and are worth recording so the next one doesn't repeat
them**: a test object/card placed near board y≈700–900 in a 900px-tall
viewport can land under the Agent Activity monitor panel or the app's own
tab bar, exactly the same class of problem HISTORY.md §55 already named
for the container's top-left corner (`container.top + 260`) — place test
geometry away from *both* edges, not just the top one. And restarting the
dev server without confirming the old process actually died (this
project's own standing trap) produced a server that looked healthy
(`curl /health` answered) while silently still being the *previous*
process on a stale `MEMORYMAP_DATA_DIR`-free port bind failure — always
check `pgrep`/kill by PID number and verify a fresh `Started server
process [PID]` line in the log before trusting a restart.

**What's next, unchanged from the confirmed order** except anchors
dropping off the front: (1) **mind-mapping mode** (ROADMAP item 25 — an
"Arrange as mind map" button reusing the Graph tab's Tree/Radial layout
code against the whiteboard's own node/link data, plus Tab/Enter keyboard
branch entry) is next, and can now build real anchor-terminated branch
lines rather than arbitrary-corner ones. (2) **AI + whiteboard
integration**, three pieces confirmed wanted together (a chat-agent read
tool over a board's contents, whiteboard content in search, AI-guided
diagram generation as the write side of the first) — still fully
unscoped code-wise, though the read tool's shape is already sketched in
ROADMAP item 11's own notes. (3) A **full end-cap system** (circle/square/
multi-line ends, asked for directly) beyond the arrowhead-sharing done
this session. (4) Sketch rotation and image cropping, both already named
and both explicitly deferred again.
