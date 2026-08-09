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
