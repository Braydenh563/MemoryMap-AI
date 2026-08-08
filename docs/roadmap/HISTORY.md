# What is already done


> **The other three:** [ROADMAP.md](../ROADMAP.md) (live work) · [BACKLOG.md](BACKLOG.md) (§1–§29) · [ANALYSIS.md](ANALYSIS.md) (§30–§34, including the AGPL/MIT constraint) · [HISTORY.md](HISTORY.md) (already built).

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


<!-- Moved out of ROADMAP.md during the §40 audit: all three were
     complete, and ROADMAP.md is capped at 2,000 lines so it stays
     readable in one sitting. Section numbers are unchanged, so every
     §35/§36/§37 reference in the code still resolves — here. -->

## 35. Reported in one session — the big batch, triaged

Everything below came from one round of real use, mostly in the desktop app.
It is written up before any of it is fixed, because the session that collected
it was running out of room and an unwritten bug report is a bug that gets
rediscovered.

**Read this first: almost none of it is verified here.** The sandbox is Linux
with no Ollama and no pywebview, so "desktop app" and "thinking model" reports
are taken on the user's word. That is not a hedge, it is the same lesson §34
closes on and it has now cost real time twice — see "The standing caveat" at
the end of this section. Where I have found the cause in code, I say so and
name the line. Where I have not, it says **unreproduced**.

---

### 35A. The Ask section is the priority — it is a core feature behaving like a toy

Asked for directly and at length: *"the ask tab should be for reviewing,
revisiting, and searching up/asking about your notes, the chatbot can be for
the chat tab… make sure the ask section works properly and can be used
effectively… it is one of the core features of the program."*

Four separate reports land on this one box, and together they say the Ask
section was built as a cut-down Chat tab rather than as its own thing.

1. **"hey" gets a chatbot answer.** `intent.classify` routes smalltalk away
   from retrieval and `librarian.converse` answers it as an assistant would —
   correct for the Chat tab, wrong here. The Ask box has one job. **The fix is
   not a better classifier**: it is that this box should not offer the
   conversational path at all. A greeting here should say what the box is for
   and get out of the way, which costs no model round and cannot misfire.
   Note that `/chat/stream` is shared by both surfaces, so this is a request
   flag (an "only about the notes" mode), not a change to `classify`.

2. **The retrieved notes look truncated.** Worth confirming before fixing:
   `_prepare` retrieves with `limit=5` and `as_note` passes `entry.content`
   whole, so the truncation is not there — the likely culprits are
   `librarian.build_messages` and `ai/context.py`'s budget, which is *supposed*
   to clip and may be clipping much harder than the window requires. If it is
   the budget, the honest fix is to spend the Ask box's budget differently
   (fewer notes, more of each) rather than to raise the cap: five heavily
   clipped notes are worse than three whole ones for a question about what
   you wrote.

3. **Quick + a thinking model produces nothing at all.** Reported twice, same
   shape both times: it thinks, stops about three-quarters through, and emits
   no answer. This is the most serious item in the whole section — it is a
   total failure, not a degradation. The strong suspicion is `num_predict`:
   §"Do these next" item 3 records it as a flat 1,024 cap, and a thinking
   model spends that budget on *thinking* and then has nothing left for the
   answer. If so the fix is that the cap must be a floor for the answer, not
   a ceiling on both — thinking tokens should not be able to starve the reply.
   See 35D, which is the same bug family from a different angle.

4. **Make it a real feature, not a lesser Chat.** The direction to take: this
   box is for *interrogating the notebook*. That means the things a chat
   window does not do — say which notes it used and let you open them, offer
   a follow-up that narrows rather than continues, filter the search before
   asking, and be honest when the notes do not contain the answer (§34's "an
   answer that says I don't know"). Everything conversational belongs in the
   Chat tab, and removing it from here is what makes room for the rest.

---

### 35B. Hallucinated writes got through the net

The report includes a full transcript: the agent said it had linked notes 12
to 13, 15 and 16, unlinked 28, and suggested retags — narrated in the past
tense, as a numbered list of completed work — having called `related_notes`
once and no write tool at all.

**This is the failure the app most needs not to have**, because it is the one
that quietly destroys trust in everything else. `_CLAIM_PATTERN` exists for
exactly this (`agent.py`, the "Heads up: I described that…" branch) and did
not fire, so the first job is to find out why:

- the pattern very likely does not match "**Linked Notes:** We connected…" —
  it looks for first-person claims like "I saved", and this model wrote "we",
  in a bolded markdown list;
- and the net only runs when `did_write` is false for the *whole turn*. One
  successful `related_notes` call is not a write, so that part should have
  held — meaning the pattern itself is the gap.

Two fixes, and both are worth doing:
1. **Widen the pattern** — "we linked", "we connected", past-tense verbs for
   every write tool, and markdown-bolded headings. Cheap, and testable.
2. **Check the claim against the tools that actually ran**, which is §33's
   "completion verifier" (item 5) arriving early because a real user hit the
   case it was written for. If the turn claims a link and `link_notes` never
   ran, that is knowable without a second model round.

The prompt is also implicated: this model was told what it *could* do and
narrated doing it. §21's finding — that naming the tools in the instruction is
what makes a small model reach for them — is the lever here too.

---

### 35C. "Can Think: No" for a model that thinks

Reported for `gemma4 e2b`. `model_specs`/`supports` read Ollama's `/api/show`
`capabilities` list, which is exactly the mechanism §33 adopted from odysseus
and which caught the `think: false` bug. The likely causes, in order:

- the model genuinely does not declare `thinking` in its capabilities, in
  which case **the UI is wrong to print "No"** — `supports()` returns `None`
  for "can't tell", and §33's own lesson is that *known* is a separate fact
  from *known value*. "No" and "not declared" must not render the same;
- or the capability name differs (`reasoning` vs `thinking`) and the lookup
  misses it.

Either way the immediate fix is the honest one: never print a confident "No"
from an absent declaration. **Unreproduced** — needs a machine with the model.

---

### 35D. The response presets need to be model-aware

Asked directly: *"on the quick setting for the ai settings, it should be like
a flash model, I don't know if it is a good idea to disable thinking or make
it minimal thinking."*

The honest answer is that this is now two questions, and the second one is a
bug (35A.3):

- **Should Quick disable thinking?** Yes for models where it is optional, and
  §33 already found the trap: sending `think: false` to a model that rejects
  it is an error, which is why the capability list gets read first. So Quick
  should ask for no thinking *where the model says that is supported* and
  otherwise leave it alone.
- **`num_predict` must stop being flat.** A single 1,024 cap shared between
  thinking and answer is what plausibly produces "thought, then nothing".
  Quick, Normal and Detailed should each carry their own output budget, and
  the answer needs a reserved floor within it.

This is the item that most deserves a real-model test rather than reasoning
(see the standing caveat).

---

### 35E-bis. ~~"That button is still broken" — the header that explains it~~ — **fixed**

Reported again after §35F fixed it: *"I think the clear trash button is still
broken."* This time the app was **driven in a real browser** (Chromium is
installed in the sandbox; the app runs on localhost) and the flow works end to
end — the dialog opens, Confirm empties the bin, the server reports zero binned
notes. So the fix is in the file and the user is not running it.

**`StaticFiles` sent no `Cache-Control` at all.** A response with neither
`Cache-Control` nor `Expires` may be reused by a cache *without asking*, for a
heuristic fraction of its age (RFC 9111 §4.2.2). In a browser you press reload
and never notice. The desktop shell has no reload, is a WebView2/WebKit
instance with its own on-disk cache, and restarts the *process* without
invalidating any of it — so after an update it can go on running the previous
`app.js` indefinitely. `RevalidatedStatic` now sends `no-cache` (not
`no-store`: the etag still answers 304), and `tests/test_static_freshness.py`
pins it.

**This is the standing explanation for a whole class of report here**, and it
is worth reaching for before re-fixing a button: if the code is right and the
user still sees the old behaviour, ask what they are running.

Two more things the browser found in the same sitting, neither of them
guessable from the source:

- **The reminder poll ran twice.** §36C rewrote `checkDueReminders` further
  down `app.js`; the Wave O version above it was left behind, and JavaScript
  keeps the *last* declaration — so the stray `setInterval` beside the dead one
  was running the live poller on a second 30-second timer. Twice the requests,
  and a race where both polls read the announced-ids list before either wrote
  to it, which announces a reminder twice. Measured before and after: two
  `GET /reminders` per 65 seconds now, four before.
- **It 401'd once per load**, polling before the unlock. The deleted version
  had the `authToken()` guard; it moved across with the deletion.

`tests/test_frontend_handlers.py` gained a check for both.

### 35E. The desktop app is a second product and it is not tested

Every one of these is desktop-only, which is itself the finding: `pywebview`
is a different browser with a different origin and different file APIs, and
nothing in the suite touches it.

- ~~**The theme resets to default on every start.**~~
- ~~**Onboarding shows every time.**~~ **Both fixed, and the guess below was
  right: two symptoms, one storage.** Both lived in `localStorage` and nowhere
  else. The look and the onboarding flag are mirrored into the notebook's own
  preferences (`ui_state`) and seeded back for keys the browser has lost, so a
  shell that does not persist localStorage gets them back and one that does
  never notices. **The store is watched rather than its callers** — twenty-two
  sites write these keys, and a save call added to each would rot the moment
  somebody added the twenty-third. Reproduced and verified by wiping
  localStorage in Chromium between loads.

  Original note, kept for its reasoning: If preferences are
  keyed to an origin that changes per launch (or a storage API pywebview does
  not back), both fall out of one bug. **Find the storage first**; two symptoms
  with one cause is the likely shape.
- **No file-save feature works at all** — the report is "any of the file save
  features in the whole application". Downloads via `<a download>` / blob URLs
  are the usual casualty in an embedded webview, and every export in the app
  uses that path. Needs a save that goes through the *server* (write the file
  and tell the user where it went) rather than through the browser.
- **Markdown export of a chat does not work**, which may be the same download
  problem or may be its own bug. Test it in a browser first to find out which.

**§7 (desktop packaging) is listed in §34 as over-invested, and this section
does not change that** — but it does sharpen it. The app already *ships* a
desktop mode; the argument against §7 was about signing and updaters, not
about leaving the existing mode broken.

---

### 35F. Broken buttons, gathered together

Three reports of the same class — a control that does nothing:

- **The Rediscover widget's buttons, "again"** — the word matters: this has
  regressed at least once before, which means whatever fixed it last time was
  not held by a test.
- **The recycle bin's "Empty now"** (reported twice in one message).
- **The constellation's Regenerate**, "broken and severely glitchy".

Handled as one job, because the cause is probably shared: these are all
handlers bound to elements that are re-rendered, and a listener attached to a
node that a later `replaceChildren` throws away is exactly a button that
silently stops working. The fix that holds is delegation (bind to the
container, not the node) plus a test that would notice — `test_frontend_ids.py`
is the precedent for cheap static checks on this file.

---

### 35G. The constellation renders four or five stacked copies

Screenshotted, so this one is not in doubt. A render that appends instead of
replacing, called once per something — a resize observer, a tab switch, a
theme change. Almost certainly the same root cause as its broken Regenerate
button in 35F, and worth fixing together.

---

### 35H. Streaming and rendering — **the client half is not the problem**

- ~~**Agent steps do not stream.**~~ **The client-side diagnosis below is
  wrong, and it was worth an hour to find out rather than a rewrite.** Driven
  in Chromium against a stream emitting one NDJSON line every 120ms, the answer
  element inside a *plan run* grew 10 → 25 → 42 → 63 → 94 characters: the step
  timeline already routes deltas through `liveMarkdownRenderer`, exactly as the
  plain answer path does. The plan card, the ticked steps and the tool chips
  all appeared in order.

  **What is still possible, and is not disproved:** the *server* side.
  `ollama_client._ToolTextGate` holds prose back while it decides whether the
  text is the beginning of a tool call — which on a model that writes tool
  calls as prose rather than as structured calls would look precisely like
  "lands complete". That needs a real model to see, and it is the thing to
  measure first if this is reported again. **Do not rewrite the timeline.**

  Original note, kept because it is the reasoning that was checked: The server
  yields `answer` deltas per round, so the likely cause is client-side: the
  skill/step timeline buffers a step's text and renders it on completion.
- ~~**Markdown gaps.**~~ **done** — `unlatex` translates the small set of LaTeX
  escapes models reach for, and TOOLS_GUIDE tells the model to write symbols
  plainly. Confirmed in a browser: `$\rightarrow$` renders as →.
  The §22 note applies: this is *inline* rendering, deliberately, and block
  elements are not wanted back.

---

### 35I. Context compression for long chats

Asked for directly: *"there should be a tool as well as a manual command or
something to be able to compress chat context on longer chats so the AI can
better continue."*

This is the missing piece of §11a. Everything there is about the *fixed*
overhead (tool schemas, system prompt) and the *retrieved* half (notes);
nothing addresses a conversation that has simply got long. Two halves, and the
manual one should ship first because it cannot misfire:

- ~~**A button**: "Summarise this chat so far"~~ **built** — `🗜 Compress` in
  the chat header, `POST /chat/compress`.
- **A tool**, so the agent can do it when it notices it is running out of
  window. **Still open.** §33's warning applies: this is another tool in a
  registry §34 says should stop growing, so it has to displace something or
  justify the trim. Note that `make_plan` has since taken a CORE_TOOLS slot,
  which makes the case harder rather than easier — and the manual button now
  covers the case the user actually reported.

**What the built half found, and it changes the framing.** The request assumes
a long chat *overflows*. It does not: the client sends at most the last four
turns and `context.fit_history` drops whole user/assistant pairs from the
oldest end until the rest fits. So the failure is **silent forgetting** — the
model stops knowing what it was told at the start and begins re-asking it.
That is why a summary is strictly better than the current behaviour rather
than merely cheaper: the same few hundred characters carry the gist of ten
turns instead of the whole of one.

The reversible-compression idea §11 adopted for notes is the model to copy:
keep the original, show what was dropped, make it undoable. That is exactly
what shipped — **nothing is deleted.** The endpoint stores nothing and touches
no conversation; the transcript on screen and the saved conversation keep every
turn, and `chatSummary` only changes what is *sent*. Undo is one assignment.
The summary is editable before it is used, because it is about to be the
model's only memory of the first half of the conversation. It is not persisted
across a reload — re-deriving it is one click, and a summary restored against
the wrong thread would be worse than none.

---

### 35J. Smaller, but recorded so they are not lost

- **The agent cannot create a document.** There is `list_documents` and
  `get_document` but no `create_document` — an asymmetry nobody noticed
  because §5's document work was UI-first. This is a genuine gap rather than
  a deliberate limit, and it is the one *new* tool this section asks for.
- **The suggested models' approximate sizes are wrong.** `SUGGESTED_MODELS`
  is hand-written (§33 defends it as the right size of answer against
  odysseus's Cookbook) — but a hand-written number that is wrong is worse
  than no number. Check them against the registry, or drop the sizes.
- **The generative background art is not saved with a custom theme.** It is
  part of a look and should travel with one. Small, and it belongs to whatever
  fix 35E finds for theme persistence.
- **Quick sketch should be expanded.** Asked for directly. Note the tension
  worth resolving *before* building: §34 argues the whiteboard (§4a) is a
  separate product wearing this one's clothes. Expanding the existing sketch
  is the cheap version of that idea and is probably the right size — decide
  which of the two this is before starting.

---

### 35K. "Annoying and slow to get to do things, and then it only does a little"

A second round of reports, and this one is about the agent's *character*
rather than about individual bugs. Recorded together because they have one
theme: the agent is expensive to use and under-delivers on what it is asked.

- **"Note #12" means nothing to the user.** The model says it because every
  tool result carries an id and ids are what the tools take. But the user has
  never seen an id — the UI shows notes by their text. **Every id the model
  says out loud should be accompanied by the note's first few words**, and the
  prompt should say so; the id is the app's handle, not the user's. Cheap, and
  it makes every other answer more legible.

- ~~**A broad instruction gets a token effort.**~~ **built — `make_plan`.**
  Reported: *"I will say fix my categories and it will only merge two
  categories and leave it at that, ignoring the rest."* The counterpart of
  §21's finding about steps, and it took the same fix: the agent draws a 2–6
  step plan, its turn **ends**, and the skill runner works through the plan a
  step per turn. A plan is a skill nobody saved — same plan card, same ticked
  steps, same change list with an Undo on each — so there is one runner, not
  two. §33's "worth building" item 2 (`update_plan`) is closed by this, and
  the framing there was the useful part: it is not a progress indicator, it
  is what makes the model finish the job.

  Three decisions worth not re-deriving. **2–6 steps**: one step is just the
  action, and every step is its own turn on a local machine, so ten steps is
  minutes of generation before the end is visible. **A plan that is too long
  is refused, not truncated** — silently dropping the end of the job is the
  exact failure the tool exists to prevent, arriving from the other end. **A
  run may not start a run** (`tools.RUN_STARTERS`), or each nested one brings
  fresh rounds and the bound on a turn stops meaning anything.

- ~~**Long jobs cut out part-way.**~~ **fixed, and it was two bugs.** Reported
  later than the rest: *"the agent struggles with long tasks like skills then
  cuts out half way through and has to restart, or it hits a limit for tool
  calls which has happened quite a bit."*
  1. **The round cap counted rounds**, which cannot distinguish a model doing
     eight useful things from one doing the same thing eight times. Rounds are
     *earned* now (`agent.EARNED_ROUNDS`): a round making a successful call it
     has not already made buys another, to a ceiling. A loop earns nothing and
     stops where it always did.
  2. **A step that ran out was ticked off as done** — the runner could only
     see that the turn produced text, and "I couldn't finish step 1" is text.
     It is `stalled` now, the run stops there, and `stopped_at` names the step
     so the run can be **resumed from it** rather than restarted over notes it
     has already written to.

- **The token budget skyrockets on these turns**, which is the same bug seen
  from the cost side: rounds of tool results accumulate and every one is
  resent. §11a's fixed-overhead work is done; this is the *conversation* half
  and it is what §35I's compression is for. The two should be built together.

- **The chat bubble's metadata line is not visually appealing.** It has grown
  a field at a time — model, elapsed, tokens, rounds, context percent, whether
  the count was estimated — and never had a pass. Worth doing *after* the
  above, because what it should show depends on what the turns look like.

---

### 35L. The UI has no design system, and it shows

Asked for directly, and it is the sharpest criticism in this document:

> *"the way spacing, alignment and margins of all the ui features in each tab
> aren't consistent and it changes each tab. I want the UI across the
> application to be very professional, consistent and clean. not to look like
> it is just a bunch of ai generated slop features joined together"*

**That description is accurate and the cause is structural.** Every tab was
built in its own session, each one reaching for whatever spacing looked right
at the time, and `style.css` has grown past 5,000 lines with no shared scale
underneath it. The `.hidden` collision fixed this session (§35F's sibling — a
utility class losing to a component class written later in the same file) is
the same disease showing up as a bug rather than as ugliness.

**Started — the foundation is built. See [docs/DESIGN.md](DESIGN.md),** which
is the contract new features are written against. Done so far:

| | Before | After |
| --- | ---: | ---: |
| Distinct spacing values | 25+ | 9 |
| Distinct font sizes | 37 | 10 (+3 hero one-offs) |
| Distinct corner radii | 12 hard-coded px | 3 tiers, all derived from `--radius` |
| Page gutter treatments | 4 across 7 tabs | 1 |

Four of those were invisible as *bugs* and visible as ugliness. The corner one
was both: `--radius` is a user setting ranging 2–16px, and ~90 declarations
ignored it — so choosing square corners squared the cards and left every chip,
popup and button rounded. The page shell was the same shape of problem: content
began 1.8rem down one tab and 0.8rem down the next, because five rules drew the
same 2rem side gutter with five different tops.

`tests/test_style_scale.py` is the part that makes it hold, and it is worth
more than the conversion: without it the next tab reaches for whatever looks
right and the drift restarts, which is precisely how six tabs got here.

**Still open**, in order: colour has had no equivalent pass (surfaces, borders
and states have no documented scale); density and motion are settings a few
components ignore; and **none of this has been checked in a browser** — the
sandbox is Linux with no display, so every change was bounded to move no single
value more than 0.1rem, which is not the same as verified.

**This is not a "polish pass" and should not be attempted as one.** Going tab
by tab making things look nicer produces a seventh inconsistent tab. The order
that actually works:

1. **Extract the scale that already exists implicitly.** Every margin in the
   file is one of about six numbers with drift around them. Write those six as
   custom properties (`--space-1` … `--space-6`), and a type scale beside them.
2. **Convert one tab to use only those tokens**, and keep it as the reference.
   Notes is the right choice — it is the tab named in the same report as
   needing layout work, and the busiest.
3. **Then the rest, one at a time**, each a diff that only replaces hard-coded
   values. A conversion that also redesigns something is a conversion nobody
   can review.
4. **A lint that fails on a raw `px` margin or padding** outside the token
   block, so tab seven cannot reintroduce the problem. This is the step that
   makes it stick; without it this section will be rewritten in six months.

Related requests, all of which should wait for the tokens rather than land on
top of the current state:

- **The top of the dashboard** wants expanding and tidying.
- **A bottom bar**, mentioned before and worth checking IDEAS.md for.
- **The Notes tab layout, especially note metadata** — how a note's category,
  tags, dates and link count are shown. This is the single most-looked-at
  surface in the app.
- **The chat bubble's metadata line** (§35K) is the same problem in miniature.

**And the tab bar itself.** The Library tab (§4) is still unbuilt, and the
question was asked directly: *is it coming, and will the top bar cope?* The
honest answer is that the bar is already at the width where another tab hurts,
so **Library should not be added as a seventh peer.** Either it absorbs
existing tabs (documents and chats are both "things you have", which is what a
library is), or the bar gains an overflow. Deciding that *before* building §4
is much cheaper than deciding it afterwards.

---

### The standing caveat, now with three pieces of evidence

**Every provider test in this repository runs against a fake transport.** The
SSE framing and the tool-call fragment indices come from reading the
specification, not from a running LM Studio. §34 already says this. Two things
have since made it sharper:

- an hour was spent last session attributing a real bug to GitHub's
  infrastructure by reasoning about it instead of reproducing it;
- and this whole section is a list of failures that a fake transport, a Linux
  sandbox and no desktop shell could not have found — 35C, 35D and every part
  of 35E are invisible to the suite as it stands.

The nightly job §34 asks for (pull a small model, run ten real turns through
both providers) would have caught 35D directly. It is no longer a nice-to-have
in the "worth building" list; it is the reason this section exists.

---

## 36. UI layout and surfaces — the reported list

§35L is the *system* (tokens, scales, the lint). This is the **layout** work
that sits on top of it, reported directly and gathered here so it is one list
rather than a dozen remarks scattered through a chat log.

**Order matters between the two.** Every item below is a change to how a
surface is arranged, and each one is cheaper and more likely to stay right once
it is built from tokens rather than from whatever looked correct that day. The
system landed first on purpose.

---

### 36A. ~~Scrolling and sticky surfaces~~ — **both done**

Built. The window no longer scrolls at all: `body` is one viewport tall and
the visible page is its own scroll container, so the scrollbar starts below the
header. That was also the prerequisite for the sticky chat header — sticky
resolves against the nearest scrolling ancestor, and while that was the window,
a header inside a page could not stick to the top of the page. Four sticky
sidebar rules that cleared `--header-h` were updated with it; the header is
outside the scroll container now, so clearing it would offset them twice.

Original notes kept below.

- **The page scrollbar runs behind the top bar.** Screenshotted. The header is
  `position: sticky; top: 0`, so it floats over a window-level scrollbar that
  starts at pixel zero — the bar and the scrollbar visually collide. The fix is
  structural rather than cosmetic: **the window should not be the scrolling
  element.** Make `body` fixed-height and give the page region below the header
  its own `overflow-y: auto`, so the scrollbar begins where the content does.
  Worth doing early because several items below assume a scroll container that
  is not the window — sticky chat headers especially.
- **Chat headers should stay put while a chat scrolls.** Asked for directly.
  Once the scroll container is the message list rather than the window, this is
  `position: sticky` on the conversation header and nothing else. Doing it
  *before* the container change means fighting the window's scroll position,
  which is why these two are one item.

### 36A-bis. ~~The tab bar's fade sat on the Reminders tab~~ — **fixed**

Reported: *"the reminders tab in the top bar is partially faded out on the
right."* Reminders is the last tab, so it wore the whole of two mistakes in
one rule.

- **The fade said "this bar scrolls", not "there is more that way."** Scrolled
  to the end — or overflowing by four pixels — the last tab was dimmed with
  nothing hidden behind it, which reads as a disabled control rather than as a
  hint. It is per *edge* now, painted only on a side with content beyond it,
  and recomputed on scroll as well as on resize.
- **12% of the bar is a whole tab, not an edge.** The ramp is a fixed
  `1.5rem`, so it fades the same amount at every width.

Selecting a tab now scrolls it into view, so the fade is only ever over a tab
you are not using.

**Then a photograph showed the other half of it**, which fading cannot fix:
"Dashboard" clipped to "oard" against the left edge. A tab you have to drag
sideways to read is a tab people stop using. **When the strip cannot fit beside
the wordmark and the header buttons it now takes a row of its own** — measured
(`tabRowSpace`), not a breakpoint, for the same reason the fade is.

Note that the header's `flex-wrap: nowrap` is deliberate and stays: the *old*
wrap dropped `.header-controls` — which carries `margin-left: auto` — onto a
second row pinned right, at almost every laptop width. Here the tab strip is
what moves, by an explicit order and a 100% basis, and only when measured not
to fit.

**Verified in a browser this time** — Chromium is in the sandbox and the app
runs on localhost. At 1920/1600/1440 the tabs sit inline and nothing fades; at
1280 and 1100 the strip takes its own row with all seven readable and the
controls still on row one. Measured, then screenshotted and looked at.

### 36B. The three surfaces that need rearranging, not restyling

Each of these was called out as needing a **new layout**, not a coat of paint.
They are listed smallest-first, and the rule for all three is the same: decide
what the surface is *for* before moving anything, or the result is the same
controls in a different order.

1. **Settings — "the settings are a mess."** ~~Two changes: group by intent,
   and make it searchable.~~ **Half done, and the half that was left turned out
   to be the whole of it.** An audit found the grouping already built — The AI
   / Your notebook / System — so the remaining problem was never arrangement:
   with fourteen sections, finding a control means guessing which one holds it.
   **The filter is built**, and it searches each section's *rendered contents*
   rather than its title, so "corner" finds Appearance and "backup" finds
   Import & export. Text is read live, because several sections are filled in
   by JS after first paint and an index built at startup would search empty
   panels. What is left is the density *within* the longer sections.
2. ~~**The Chat page controls.**~~ **regrouped, then moved to the composer.**
   Asked for directly after the regrouping: *"I was thinking of moving the
   majority of the ui controls like the chat/agent pull, web search and stuff
   to the bottom bar with the chat input."* Correct, and it is the same split
   taken one step further — a control that decides what happens to the **next
   message** (Chat/Agent, Web, answer length, persona, the skill picker,
   attached notes) now lives in a **dock** at the bottom with the input box;
   the header keeps only what is about the **conversation** (its name, its
   cost, export). You set them as you write instead of scrolling back up.

   The web and persona panels moved down with the buttons that open them — a
   toggle at the bottom opening a panel at the top reads as a button that does
   nothing — and the web panel is capped at 45vh inside the dock. Ids are
   unchanged throughout, so `app.js` needed no edit; `tests/test_chat_dock.py`
   pins the arrangement, because nothing else here can see it.

   **Then made compact**, asked for directly: *"make the bottom dock in the
   chat bar cleaner and better structured ui wise so it's not as bulky."* The
   first version was three stacked bands — a skills row, a controls row and the
   composer — which is most of the height of a short conversation. Now one
   strip of four groups, and the two things that made it tall are gone: the
   skill's description (a sentence of running text, clipped mid-word; it is the
   select's tooltip now, where `skillSummary` already puts the steps and tools)
   and a "⚡ Skill:" label beside a select whose placeholder said the same
   thing. One `--control-h` for every select, button and segment is what makes
   it read as a strip — the segmented control had been four pixels taller than
   its neighbours, which is §35L's complaint in miniature.

   **The header became two levels rather than one row of equals**: the title as
   the heading, the token count and the "reading a summary" note as a quiet
   subline under it, and only the two conversation actions on the right. The
   usage chip used to be a filled pill between the title and the buttons, which
   read as a third button and shoved the actions sideways whenever the number
   gained a digit.

   **Then reported off again, and the cause was worth writing down:** *"some
   are higher or lower than each other and different heights."* Matching the
   heights was not enough. **A margin on a flex item is centred with the
   item** — `.seg` carries `margin-bottom: 0.5rem` from the stacked forms it
   was built for, so under `align-items: center` those 8px sat it 4px above its
   neighbours and made its group 8px taller, pushing the next group 4px down.
   Two visible offsets from one declaration three thousand lines away, and the
   second version of the rule reproduced it in a margin of its own. The strip
   zeroes outside spacing for everything in it now; DESIGN.md has the rule.

   The composer was worse and nobody had measured it: 📎 45.2px, the box 49.0,
   🎙 45.2, Send 43.2, three different tops. It has its own `--composer-h`
   (2.75rem — the 44px touch minimum, since this is the row used on a phone)
   and aligns to `end`, so the buttons stay level with the caret's line as the
   box grows rather than drifting up the side of it.

   Measured and screenshotted in a browser, light and dark: dock 3 rows → 1,
   one top and one height per row (strip 30.4px, composer 44px), header 41px
   empty / 59px with metadata.

   Still open: the composer's own controls (📎, 🎙, Send) have not been looked
   at.

   Original note: The toolbar has grown a control at a time —
   Chat/Agent, Web, response mode, persona, peek, export, skill picker, tools
   toggle — and they are all peers in one row despite answering completely
   different questions (*who* is answering, *how hard* it should work, *what it
   may touch*, *what to do with this conversation*). Grouping them by that
   question, and demoting the per-conversation actions (export, peek) out of
   the per-message row, is most of the work.
3. **The Notes tab.** *Metadata done, layout still open.* The card's chips had
   no hierarchy — category, tags, an AI confidence badge and a date all at one
   weight, with the green confidence badge loudest of all despite being the
   least important. Three levels now, at one size, carried by weight and
   colour. And the reported "massive gap between the lines" had a single
   cause: `.entry-meta-end` carried `margin-left: auto`, so once the chips
   filled a line it wrapped and landed alone on the next one — an empty band
   on every card with more than a few tags. The actions moved out of the flow
   to the card's corner.

   **That pattern is worth knowing about**: `margin-left: auto` inside a
   *wrapping* flex row orphans whenever the row fills. It was also in the graph
   toolbar and the chat toolbar's end group; both now reset it at the width
   where wrapping starts. Any new toolbar wants checking for it.

   **The layout half is done now, and the decision it asked for is: the card is
   the note.** Everything else supports it. What the measurement found was not
   "equal weight" but weights *inverted* — a card was 25px of its own note,
   23px of metadata and 21px of link chips, and the chips were the loudest
   thing on it: filled, accent-coloured, weight 600, each carrying the whole
   first line of another note. On a well-linked card the links were wider than
   the note and read first.

   A link is **navigation, not content**. The chips are clipped to 28
   characters with the full text on hover, outlined rather than filled, muted
   until the card is hovered, and their ✕ follows the card's other actions —
   present on hover and focus, out of the way while reading. Scoped to
   `#entry-list`, because the same chip on a reminder or a document *is* the
   subject of its row and quietening those would be the opposite fix.

   Original note: Called out twice — once for layout generally and once
   specifically for **note metadata and how it is visualised** (§35K). This is
   the most-looked-at surface in the app and the hardest to get right; it wants
   a decision about what a note card is *for* at a glance — is it the text, or
   is it the text plus its category, tags, dates, link count and privacy state?

### 36C. ~~Reminders that you actually notice~~ — **built**

Reported: *"reminders when they go off aren't really noticeable and need to be
more evident, maybe through a browser or system/app notification?"*

Correct, and it turned out to be simpler and worse than "not evident enough":
**nothing checked.** A reminder's only surface was the tab badge, painted by
`updateReminderBadge`, which ran only when something happened to call
`loadReminders()`. Unless you reloaded or opened that tab, a reminder came due
and the app said nothing, indefinitely.

Built: a 30-second poll plus a check on window focus and visibility change (for
the machine-was-asleep case), a count in the document title — the one surface
that works while the app is in a background tab, which is where it usually is
— a system notification and a toast, once per reminder, with announced ids kept
in localStorage so a reload does not re-announce everything overdue. Several
due together get one summary rather than three notifications.

**What is left here is the notifications centre** (§36E), as the place fired
reminders accumulate. The three layers as originally planned:

1. **The Notification API**, which is one call and works in both the browser
   and the desktop window. Needs a permission prompt asked at the right moment
   — when a reminder is *set*, not on first load, because a permission request
   with no context is refused by default and cannot easily be asked again.
2. **An in-app presence that does not depend on the tab being focused** — the
   title bar counter, and a sound the user can turn off.
3. **A notifications centre** (asked for separately below) as the place they
   accumulate, so a reminder that fired while the app was closed is not lost.

The honest note: nothing here should fire while the app is not running, which
is a real limit of a local-first app with no background service. Say so rather
than implying otherwise.

### 36D. The dashboard's quick access, and a status bar

- ~~**Expand the quick-access buttons.**~~ **done.** The row orders by how
  often you press each one, and promotes up to two recently-run skills — with
  New note pinned first and Tools & features pinned last, because a row that
  reorders completely is a row you have to re-read every time, and the value of
  a fixed position is that your hand learns it. Skill runs are recorded from
  `startSkill`, so a run the agent started itself (§33) counts too.
- ~~**Make Quit reachable.**~~ **done**, and it uncovered a real bug that
  predates this work: `$("app-quit").addEventListener` had been spliced into
  the middle of `renderChatModeSeg()`, which runs on every chat-mode change —
  so each call bound another listener, and clicking Quit opened one confirm
  dialog per mode switch. `tests/test_frontend_handlers.py` now catches the
  class.

  Original note: Expand the quick-access buttons at the top of the dashboard. They are the
  first thing on the first screen, and there are currently six that were chosen
  early. Worth making them **reflect what you actually do** — most-used
  actions, recently-used skills — rather than a fixed list.
- **A bottom bar, "like in VS Code but stylised for the application."** Worth
  building, with one caveat recorded up front: VS Code's status bar works
  because every item is either a *state you need at a glance* (branch, errors,
  line number) or a *command you use constantly*. A bottom bar filled with
  things that are neither is a permanent strip of decoration. The candidates
  here that genuinely qualify: **AI/backend status** (currently a pill in the
  header), **reminder count**, **notebook size**, **the current background
  task**, and a **command entry point**. That is enough for a bar; anything
  beyond it should have to displace one of those.
- Note that the bar and the header are competing for the same job for some of
  these — the AI status pill in particular. Moving it down is better than
  showing it twice.

### 36E. Notifications centre, and the changelog in-app

- ~~**A notifications centre**~~ **built.** A bell in the header, because an
  event can arrive while you are on any tab and a notification you have to go
  somewhere to find is one you never see. Fired reminders, finished background
  jobs and runs that stopped early collect there, each actionable where there
  is something to act on.

  Three decisions worth not re-deriving. It is **not a second source of
  truth**: a fired reminder is still a row in the reminders table, and opening
  the panel folds in whatever is *currently* overdue — which is the one case an
  event log cannot cover, a reminder that came due while nothing was running to
  notice. It is **not stored server-side**: these are ephemeral and there can
  be many, and the notebook's preferences file is not a log. And it **says on
  screen** that nothing fires while the app is closed, rather than implying
  otherwise.

  Original note, kept: MemoryMap already *produces* all of these events and
  shows each of them in its own way (a toast, a status pill, a step timeline);
  the centre is the place they persist after their moment has passed.
- ~~**Read `CHANGELOG.md` in the app.**~~ **done.** Served from the real file
  and rendered in Settings → About, folded shut. Serving the file is the point:
  a second in-app list would say roughly the same things and drift within a
  release. A packaged build without the file hides the control rather than
  offering one that opens onto nothing.

### 36G. The Library as the app's management area — **the decided direction**

**§36F's two questions are answered and the first version is built** (see
§36F below, and `routes_library.py`). What follows is the direction the user
set immediately afterwards, in their words: *"I want the library to assimilate
the activity and rubbish bin. The library should also probably assimilate
multiple other features. It will be the central management area for the
application."*

That is a bigger claim than §4 made and it is the right one, so it is written
down before anyone builds the next piece against the old, smaller idea.

**What is built.** Documents, chats, files and the bin in one grid; filter
chips with counts; search across titles *and* previews; four sorts; a ⋯ menu
per card (pin/rename/delete for a chat, rename/download/delete for a document,
restore for a binned note, download for a file); an **Include bin** toggle,
off by default, because deleted things are not part of "everything you have
made". Assembled server-side so a new kind appears without touching `app.js`.

**What is next, in order.** *(1 and 2 are done, and 4 has happened: the three
panels are deleted — see the end of this section.)*

1. ~~**The bin, in full.**~~ **done.** The Library shows binned notes and restores them, and
   that is all — the bin panel still owns *Empty now*, the "kept for N days"
   line, and permanent delete. Reported directly: *"in the bin section it
   should have all the features of the rubbish bin."* Those move here, and the
   sidebar's 🗑 button follows the 📚 pattern — it opens the Library on the Bin
   chip rather than opening a second panel.
2. ~~**Activity.**~~ **done.** The audit log is a list of things you did, which is the same
   shape as the Library's list of things you made, and it is currently a panel
   behind a sidebar button that nobody finds. It becomes a kind: `activity`,
   read-only, with the same filter chip and the same card.
3. **Then decide what else.** "Multiple other features" is right in spirit and
   dangerous as an instruction — the Library earns its place by *replacing*
   surfaces, not by collecting them. The test each candidate has to pass is
   §36F's: does moving it here make the app **smaller**? Tags and Saved
   searches both pass (both are finding surfaces, both are behind buttons in
   one sidebar). Reminders does not — a reminder is a thing that happens to
   you, not a thing you go and find.
4. **Then the tab bar.** Once Bin and Activity are here, the Notes sidebar
   loses three of its buttons, and that is the moment to look at the bar again.

**One trap, recorded because it has now cost two sessions.** A popup inside a
card is trapped by the card's stacking context, and `backdrop-filter` creates
one — no `z-index` has to be in sight. The note cards hit it via
`.entry-actions` and the Library cards hit it via the blur; both are fixed by
lifting the *owning element* (`.menu-open`), never the menu. If a menu is
reported behind something, that is the first thing to check.

#### The panels are deleted — the first surface this project has removed

`#bin-panel`, `#activity-panel` and `#tags-panel` are gone from `index.html`,
and `renderBin`, `renderActivity`, `renderTags`, `PANELS`, `showPanel`, the
`.panel-close` wiring, the `#bin-empty` handler and `entryItem`'s
`options.bin` branch are gone from `app.js`.

**Why it was the top item and not merely tidying:** each of those three things
had two implementations, and the bin's two could *disagree about what was in
it*, because each fetched its own list. Two surfaces that can contradict each
other about whether a note still exists is a correctness bug wearing a
duplication costume.

**What had to be built first**, and the one thing that kept the panel alive
past its chip: reading a binned note **in full**. A Library card shows a
preview — right for a grid of mixed things, wrong as the only way to see a
note you are about to destroy, because "restore or delete for good?" is a
question you answer by reading it. So `#binned-overlay`: read-only, the note's
own markdown, Restore and Delete for good, backed by
`GET /entries/{id}?deleted=true`. That read is deliberately opt-in (an
ordinary read still 404s on a binned note) and deliberately does not count
towards "most accessed".

"Kept for N days" came down with it, into the Library's bin bar. It was the
one thing the panel said that the Library did not, and it is the difference
between a bin you trust to clear itself and one you assume you must empty.

**The rule this establishes.** A surface may be replaced without being
deleted, but only for as long as it can still do something its replacement
cannot. Write that thing down when the replacement ships, because it is the
whole of the remaining work — here it was one sentence ("read a binned note in
full") and one overlay.

#### Should the Library absorb Notes and Documents too?

Asked directly, with the honest caveat attached: *"I did have a thought that it
could absorb the notes and documents tab as well but I don't know if that's a
good idea or not."* Here is the reasoning, so the next session does not have to
re-derive it.

**Documents: yes, and it is now done to the same shape as Chat.** *(An earlier
draft of this paragraph said the Documents tab had no list of its own. It did —
the tab button had gone but the full list and its filter box were still in the
sidebar, so there really were two. That is fixed rather than re-described.)*
The filter box moved to the Library, the list is capped at eight recent, and
the sidebar is otherwise about the document you have **open**: its outline, the
notes it draws on, where it is kept. A `📚 Browse all in Library →` button says
where the rest went, exactly as the chat sidebar does.

What is left for the editor itself: it is reached only from the Library now, so
it can stop pretending to be a tab — a wider writing column, and the outline
and linked-notes panels earning their place beside it rather than sitting
folded shut under a list.

**Notes: no — and the reason is not sentiment.** The Library is a *finding and
managing* surface: you arrive knowing roughly what you want and leave having
done something to it. The Notes tab is a *working* surface: capture, ask,
write, browse, four sub-tabs you move between while thinking. Those are
different jobs and the same argument that justified absorbing the others cuts
the other way here — absorbing Notes would not make the app smaller, it would
make the Library the app, with the Library's own management furniture (ticks,
bulk bars, kind chips) sitting on top of the one surface where you want none of
it.

What Notes *should* lose is what it was already lending: its sidebar's Tags,
Recycle bin and Activity buttons now open the Library, and the panels behind
them can go once the Library's versions have every control they had. That is
the absorption worth doing — it shortens Notes without moving it.

**The theme.** Asked for: *"a library bookshelf kinda theme."* The first piece
is built and it is deliberately structural rather than decorative — every card
wears a coloured **spine** down its left edge, one colour per kind, so a shelf
of mixed things is scannable by edge alone before a single title is read. The
next pieces, in the order they add most: shelf *rows* with a rule under each
group when sorting by kind, a warmer paper/board treatment for the card face
that survives both themes, and the grid's own empty state drawn as an empty
shelf rather than a sentence. Anything decorative that makes a card harder to
scan should lose to the scan — this is a management screen wearing a theme,
not a bookshelf that happens to hold data.

### 36F. The Library tab, and the tab bar it has to fit in — **decided, and built**

> **Both questions below are answered.** 1: the Library **absorbs** — it
> replaced the Documents tab and the chat sidebar's list, and the bar is the
> same length it was. 2: therefore no overflow was needed. The chat sidebar
> kept a *switcher* (eight recent, no search) because switching mid-conversation
> is a different job from finding; browsing moved here. See §36G for where it
> goes next.

**The Library (§4) is part of this work, not a separate feature to build
afterwards.** Asked for directly. It is the only major surface still unbuilt,
which makes it the one chance to get a tab right *from* the design system
rather than retrofitted into it — and the test of whether §35L actually holds:
if a new tab built from the tokens still needs its own gutter, its own
heading sizes and its own spacing, the system has not worked.

Two decisions to make before any of it is built, because both are much more
expensive afterwards:

1. **What the Library absorbs.** §4 describes it as chats, documents, images
   and archive. Documents is already a tab; conversations already have a
   sidebar. A "library" that duplicates two surfaces that exist is worse than
   no library — the honest version is that it *replaces* them, and the tab bar
   gets shorter rather than longer.
2. **What the tab bar becomes.** It is already at the width where another tab
   hurts, and the **bottom bar (§36D)** changes what belongs up there anyway.
   Either the Library absorbs tabs as above, or the bar gains an overflow.
   Deciding this while the Library is still on paper is the cheap moment.

Its layout should follow the same rule as §36B: decide what the surface is
*for* first. A library is for **finding something you made before** — which is
a different job from the Notes tab's "work with what I have", and should look
like it: bigger units, more metadata, sort and filter as first-class controls
rather than an afterthought.

---

## 37. Reported in one session — the second big batch, reprioritised

A long list arrived in one sitting, most of it about UI polish. Written up
**before** most of it is built, at the user's explicit request: *"first
reprioritise the roadmap development plan so that all the key features and
fixes are appropriately prioritised and ordered for the next session."* Six
items were small and clear enough to fix the same session — those are marked
**done** with the reasoning, so the next session does not re-derive them. The
rest is ordered by how much it unlocks or how often it gets in the way, the
same rule §36's handover ranking uses, not by how interesting it is.

**Read the standing caveat before touching anything visual.** §35's own
warning still applies to part of this list: nothing here was driven against a
real Ollama, and the desktop shell was not available to reproduce any of it in.
Everything marked **done** below *was* reproduced in Chromium — the two things
kept separate deliberately.

---

### 37A. Done this session

1. ~~**Quick sketch's Close button just darkened the background.**~~ **Fixed
   and verified with `elementFromPoint`.** `#sketch-overlay` sat at
   `z-index: 60` — the toast/notification tier — while `closeSketch()`'s
   "close without saving?" confirm dialog is a `.modal-overlay` at
   `z-index: 55`. Equal or lower z-index paints *behind* a higher one
   regardless of DOM order, so the confirm dialog's own darkened backdrop
   rendered underneath the sketch pad, its card hidden beneath the canvas —
   which is exactly *"darkens the background"* instead of showing a dialog to
   click. Lowered to `z-index: 55`, matching every other modal, so a nested
   confirm (later in the DOM, equal z-index) now correctly paints on top.
   **`#improve-overlay` had the identical latent bug** — same private
   `z-index: 60`, just no confirm dialog wired to it yet — fixed alongside it
   so the next feature that adds one does not rediscover this.
2. ~~**Dropdown/select boxes are tight; the arrow clashes with the text.**~~
   **Fixed at the base `select` rule**, app-wide, not just the chat dock (which
   already had this treatment from the previous session). `appearance: none`
   plus a painted two-line chevron in reserved padding (`--space-8` on the
   inline-end side), so the arrow can never sit under a long option — a
   persona name, "Newest first", a model id.
3. ~~**UI elements above the notes list are different heights.**~~ **Fixed.**
   `.browse-tools` (the filter box, `?`, the sort select, Select) now declares
   one `--control-h: 2.3rem` the way `.library-toolbar` already does — the
   same three-heights-on-one-line bug, same fix, different toolbar. Verified:
   all four controls measure 37px.
4. ~~**Popup buttons in the notes sidebar clash with the category note
   numbers.**~~ **Fixed and verified.** `.category-actions` (✎/🗑) is
   `position: absolute; right: 0.5rem`, overlaying the row on hover; `.count`
   is a normal-flow sibling at the same spot, kept hidden underneath only by
   `background: inherit` — which a glass card is never fully opaque enough to
   guarantee, and `.active`/hover both change the background anyway. The count
   now fades out exactly when the actions fade in (`:has(.category-actions)`),
   rather than trusting paint order to hide it. The touch fallback had a worse
   version of the same bug — `opacity: 1` with no hover on touch meant the
   icons sat on top of the number *permanently*, not just while pointed at —
   fixed by taking the actions out of absolute positioning entirely on
   `(hover: none)`, so the row makes room for both.
5. ~~**Before signing in, a popup says "failed to load entries."**~~ **Fixed
   and verified with a stale-token reload: lock screen shows, zero toasts.**
   A token left over in `localStorage` (server restarted since the last visit)
   makes `startApp()` fire a dozen bootstrap requests in parallel before
   anyone has unlocked anything. Every one hits the same 401, `api()`
   correctly shows the lock screen — and then threw a plain `Error("Locked")`
   that `startApp()`'s per-step `.catch()` *also* toasted, once per step:
   "Couldn't load entries: Locked", "Couldn't load recent questions: Locked",
   and so on, stacked in front of the lock screen that had already, correctly,
   explained the one real state. The 401 error now carries `isLockout = true`
   and the step wrapper skips its own toast when that flag is set — the lock
   screen is the single source of truth for "you are not logged in."
6. ~~**On first load I want it to show the Dashboard.**~~ **Fixed.** Only the
   *fallback* changed — `switchTab(localStorage.getItem("activeTab") ||
   "dashboard")`, was `"notes"`. A returning visit still opens on whichever
   tab was last active; that is the point of remembering it. The odd choice
   was defaulting a genuinely first-ever run, with nothing in the notebook
   yet, to a list with nothing to browse.

### 37B. Decided — no. Skip the lock-screen Quit button

**Answered with the user in the room, as this section asked.** No unauthenticated
`/auth/shutdown` route, no lock-screen Quit button. The trade-off below is why:
on `localhost` a working Quit changes nothing a terminal `Ctrl+C` couldn't
already do, but the app already hints at LAN/phone access elsewhere in
Settings, and an unauthenticated shutdown route is a standing DoS the moment
that happens. Not worth it for a convenience button. Leave `quitApp()`
unwired on the lock screen — its `catch {}` swallowing the 401 is now the
correct behaviour, not a bug to fix.

The original write-up, for the reasoning:

**A Quit button on the lock/login screen.** Asked for, and worth building —
but wiring it to the existing `quitApp()` without a backend change would
silently do nothing: `/shutdown` lives in `routes_tasks.router`, mounted with
`dependencies=locked`, so a click before unlocking hits the same 401 every
other pre-auth request does, and `quitApp()`'s `catch {}` swallows it. Making
the button work means one of:

- **A second, unauthenticated route** (`POST /auth/shutdown`, reusing the
  three-property shutdown documented on the existing endpoint: POST-only,
  behind `OriginCheckMiddleware`, SIGINT not a hard exit). The origin check
  already runs globally and already protects `/auth/setup` before a password
  exists — the exact analogous case — so this does not open a new *kind* of
  hole against a browser-based cross-site attacker.
- **The trade-off that is real:** it removes the requirement to know the
  password before the process can be killed remotely. On `localhost` that
  changes nothing a terminal `Ctrl+C` could not already do — the app's whole
  threat model is single-user, local-first. If MemoryMap is ever bound to
  `0.0.0.0` for phone access (hinted at elsewhere in the settings), an
  unauthenticated shutdown becomes a denial-of-service anyone on the LAN can
  trigger without the password. That is a deliberate choice about the auth
  model, not a UI bug — **make it with the user in the room**, not folded into
  a batch of forty other fixes.

If it goes ahead: reuse the existing SIGINT-via-timer logic (factor it out of
`routes_tasks.shutdown` rather than duplicating it) and mount the new route
in `routes_auth.py`, which already has the pattern for pre-auth endpoints.

### 37C. The chat dock — asked for again, and the reason is worth naming

Reported repeatedly across this list: *"full redesign and improvement of the
bottom dock,"* *"the bottom dock in the chat is verrry bulky and needs re
designing."* Two sessions have now fixed real bugs in it (the overflow that
drew outside the card, the web panel that had to leave, the controls unified
into one visual family, a Plan button added) without it stopping being
reported as bulky — which means **the remaining complaint is about density,
not correctness.** Bug fixes and a density pass are different jobs, and this
one is still owed the second.

Concretely, in the order they'd help most:
1. ~~**Fewer rows at rest.**~~ **Done** (commit `46df305`) — length/persona
   moved behind a "⚙" disclosure, collapsing the control area from two
   wrapped rows to one. **Marked "start here next" below after it had
   already shipped** — corrected in place rather than left to be rebuilt.
2. ~~**A compact/expanded toggle**~~. **Checked in Chromium, not built**: with
   item 1's disclosure in place, an 800px window shows the whole dock at
   103px (`.chat-dock top:611.6 bottom:714.2` vs `innerHeight:800`) — one
   control row, one composer row, already the shape item 1 was meant to
   produce. Re-open only against a specific narrower-window report.
3. Re-measure against **37E's zoom setting**, which now exists — item 2's
   check covers this too.

**§37C is done.**

### 37D. The web panel — resizable, and the reader refined

Landed this session as a column beside the conversation (§36G-adjacent, see
the handover); asked for more work on the same afternoon: *"the web browser
popup still needs some work and I want the web browser sidebar to be
adjustable in width, the in-app render feature needs refining and the popup
buttons need some ui adjustments."* Three distinct asks:

1. ~~**Resizable width.**~~ **Done.** `#web-panel` isn't a grid column like
   the three sidebars `makeSidebarResizable()` handles — it's a flex sibling of
   `#chat-main` inside `<main>`, sized by `flex-basis: clamp(19rem, 30%,
   26rem)` — so it gets its own `makeWebPanelResizable()` rather than a line
   added to the existing function. The handle sits on the panel's *left*
   (leading) edge, the mirror of the sidebars' trailing-edge handles, since
   the panel is the right-hand column. Deliberately does **not** apply an
   inline width on load the way the sidebars do: the `clamp()` is a
   considered default (see the comment above the CSS rule), so only a drag
   overrides it, and Home/dblclick *remove* the inline style rather than
   reapplying a remembered number — the responsive default comes back rather
   than a frozen copy of it. Below the 1100px breakpoint where `#web-panel`
   takes all of `<main>`, the inline override is suppressed (an inline style
   would otherwise beat that media query regardless of screen width) and
   restored via a `matchMedia` listener when the window widens back past it.
   Verified in Chromium: drag either direction moves the panel edge, the
   width survives a reload, and the mobile breakpoint still takes over full
   width regardless of a saved drag.
2. **The reader view "needs refining."** No specifics given — this needs a
   short round of the user actually reading a page in it and saying what is
   wrong (too narrow now that it has a whole column instead of 20rem? typography
   too small? the ← Results / 💬 Ask about this / ＋ Save row cramped?) before
   guessing at a fix.
3. **"Popup buttons need UI adjustments"** — likely the same three
   (← Results, Ask about this, Save as note) now stacked in `.web-reader-actions`
   under the column layout. Worth a screenshot from the user showing the
   specific awkwardness rather than re-deriving blind.

### 37E. A UI zoom setting in Appearance — done

*"my computer is a small 13-inch laptop so I need to go to like 80% browser
zoom to see everything and not have it so squished or narrow."* A real,
common case the app currently has no answer for beyond the browser's own
Ctrl+/Ctrl- — which resets on every launch and is not a MemoryMap setting at
all.

**Built on the third option this section weighed** — a root `font-size`
percentage, not CSS `zoom` or `transform: scale` — because a check made the
choice easy: `data-fontsize="small"/"large"` already scales the root font and
ships today, and control heights/icons are already in rem (§35L's spacing
scale), so a root-font-size change was already proven to reach them for free.
`zoom`'s bad interaction with `--page-viewport`/`--page-sticky-h` and
`transform: scale`'s "shrinks a fixed page instead of fitting more on it"
were real risks the other two carried; this one doesn't.

**The `--density`-vs-zoom collision this section worried about turned out to
be a `--fontsize`-vs-zoom collision instead** — both want the same `font-size`
property; density only touches spacing. Solved with one custom property:
`--zoom` (percent/100, default `1`) multiplies into every `font-size` rule via
`calc()` — `:root { font-size: calc(16px * var(--zoom)); }`, same pattern for
`data-fontsize="small"/"large"` — so "Large text at 80% zoom" and "Normal text
at 100%" land at related, non-fighting sizes. The settings row says so:
*"Combines with Text size above."*

Wired exactly like `radius`/`glass-blur` (`APPEARANCE_DEFAULTS.zoom = "100"`,
in `OVERRIDABLE_KEYS`, mirrored to `ui_state` the same as every other manual
tweak, a 70–130% slider in Settings → Appearance → Typography & layout). No
new persistence mechanism needed.

Verified in Chromium at 1280×800 (the reported 13" case): root `font-size`
measured 16/12.8/20.8px at 100/80/130%, `--zoom` matched (1/0.8/1.3), the
value survived a full reload including via the server-mirrored path (a fresh
browser with empty `localStorage` picked it back up from `ui_state`), and the
chat dock and graph toolbar (§37F) both stayed legible and unclipped at 80%
with real headroom. `test_style_scale.py` (unaffected — margin/padding/gap
only) and the full suite stayed green.

**Not done, worth naming:** JS pixel constants (`SIDEBAR_MIN`/`MAX`,
`WEB_PANEL_MIN`/`MAX` from §37D.1, the timeline's grid-template maths) don't
scale with `--zoom` — container floors, not text sizing, out of scope here.

### 37F. The graph toolbar — bulky, and specifically why — done

*"redesign the ui layout of the controls above the graph as they are very
bulky and take up a lot of space."* **Correction: most of this was already
fixed the day before this section was written** (`3e77f57`, "One control
height in the top bar, and the graph's options folded away") — the
twelve-controls-in-one-row toolbar described below no longer existed by the
time this session picked it up. Toolbar was already one row of nine (heading,
search, Layout, Colour, New note, ⚙ Options, ↻ Refresh), the tuned-once
controls were already folded behind ⚙ Options, and "How to use this map" was
already a closed `<details>`. Check the running app before a roadmap
paragraph, per CLAUDE.md — this section's own premise had gone stale.

**The one real gap — now fixed too:** Trace was still a permanently-drawn
second row, exactly what "belongs behind a toggle" (below) argued for. It now
gets the same ⚙ Options treatment: a `🛣 Trace` toggle button, `#graph-trace`
starts `hidden`, state remembered (`graph-trace-open`, added to
`MIRRORED_UI_EXTRAS` alongside `graph-options-open`) and restored per visit.
One wrinkle: the node popup's "Trace from/to here" buttons call
`setTraceEnd()`, which can fire a trace immediately — a hidden row would make
that click look like it did nothing, so `setTraceEnd()` opens the panel too,
via a `setTracePanelOpen()` shared with the toggle button and the tab-switch
restore. Verified in Chromium: hidden by default, `is-on` highlight on open,
survives a reload.

The shape, still worth keeping: group by question, not list by feature (§36B).
"Layout"/"Colour" answer *how it's drawn*; New note/Options/Refresh answer
*what to do with it*; Trace is its own mode, not a setting left on.

### 37G. Quick sketch — bring in images and documents — done, both halves

*"I want to expand on and improve the quick sketch feature. I want to be able
to upload documents and images."* Asked which was meant; the user said both:

- **Sketch pad image upload.** A second canvas (`#sketch-bg-canvas`) sits
  under the strokes canvas; an "🖼️ Add image" button draws the chosen file
  onto it, fit-inside and centred. The Eraser switches to
  `globalCompositeOperation: "destination-out"` rather than painting white, so
  erasing a stroke reveals the image underneath instead of punching a white
  hole through it — verified pixel-by-pixel in Chromium (alpha 0 on the
  stroke layer, the image's own colour on the background layer beneath it).
  Clear wipes strokes only; Save composites both layers into the one PNG
  attachment.
- **The markitdown importer.** `core/extras.py`'s `documents` extra had
  nothing calling it since it was added; `POST /import/document`
  (routes_settings.py, beside the existing markdown importer) does now —
  MarkItDown converts the file, and a result with more than one top-level
  heading becomes one note per heading (a deck, a document with chapters)
  rather than one long note, capped at 25 notes per upload. Settings →
  Import & export has the button. Verified end to end with the real package
  (installed for this session only, per its own "optional, from the app"
  design) and with it faked for the suite, the same convention
  `test_waveh_voice.py` uses for faster-whisper.

### 37H. llama.cpp, actually wired in

Flagged as `unavailable` this session in Settings → Optional extras — installs
the library, does nothing, because *"not wired into the chat backend yet."*
Building the wiring is the next-up item the README already names. Shape of the
work: a new provider in the `ai/provider.py` family (alongside the Ollama and
OpenAI-compatible ones), a model file picker (GGUF files are just files on
disk, not a registry to pull from — different UX from both existing
providers), and `core/extras.py`'s `unavailable` string comes off once it is
real. This is a backend feature, not a UI one — budget a full session.

### 37I. Compress the chat — as a tool the agent can call — done

*"make compressing the chat an agent tool so the agent can do it
automatically."* Raised the tension §35K already reasoned through for
skills: skip the review step (fast, but the safeguard this feature was built
around is gone for exactly the runs where it matters most) or still hand off
to a human mid-run (safe, but a pause the agent didn't ask for). **Decided
with the user: still hand off.** `compress_chat` joins `ask_user`/
`run_skill`/`make_plan` in `ai/tools.py`'s `HANDOFFS` table, `ends_turn=True`
— the model's turn ends on a `compress_review` event, and `app.js`'s
`onCompressReview` opens the exact same `showCompressReview` panel the manual
button already fills in, so a summary the agent asked for gets the identical
edit-before-Apply review as one the user pressed a button for. The
summarising logic moved to `tools.summarise_turns` (was inline in
`routes_chat.py`) so the endpoint and the tool share one prompt and one
ceiling rather than two that could drift.

### 37J. The Timeline — narrow columns, clipped text, no markdown, low utility — done

Screenshotted: day columns of `minmax(5.5rem, 1fr)` — about 88px at minimum —
holding note chips clamped to two lines via `-webkit-line-clamp`, rendered
with `textContent` rather than `renderMarkdown`, so a note written with
`**bold**` or a heading shows the raw syntax in the one place it is smallest
and most cramped to read. *"text is cut off, it is tight, not very visually
pleasing, and there is a lack of utility as well as md rendering."*

**Note for whoever picks this up:** the *other* screenshot in this same
report — coloured circles with heavily overlapping labels — is the **Graph**
tab, not the Timeline, and is the lattice bug this session already fixed by
widening the simulation's world box (§36's handover, "the graph's new world
box"). Keep the two separate; re-diagnosing the graph screenshot as a Timeline
bug would rebuild something already done.

The Timeline's real, distinct list, **all three now done and verified in
Chromium** (`renderTimeline`/`timelineDot`/`openTimelineBand` in `app.js`):

1. ~~Markdown-rendered previews~~ **Done, by stripping rather than
   rendering.** A `stripMarkdownPreview()` helper deletes markdown delimiter
   characters (`#`, `` ` ``, `**`, `__`, `~~`, list/quote markers, link
   brackets), not matched opening/closing pairs — the preview is already
   sliced to 120 chars server-side, so a pair can be truncated mid-token, and
   deleting delimiters outright handles that the same as a complete one. Full
   `renderMarkdown` was deliberately **not** used: it builds block-level DOM
   (headings, a fenced-code block with its own copy button) that doesn't
   clamp sensibly to two lines inside a `<button>`. Verified: a note saved as
   `"Buy milk **tomorrow** at the store"` shows as plain words, no `*`.
2. ~~Wider columns~~ **Done.** `minmax(5.5rem, 1fr)` → `minmax(9rem, 1fr)` —
   5.5rem was sized for a bucket's date label, not two lines of note text.
3. ~~More utility~~ **Done, for the "band row does nothing" half.** A band
   name is now a `<button>` that filters Notes → Browse to that band —
   `activeCategory` for a category band (the sidebar's own click pattern),
   `tag:`/`is:untagged` in the search box for a tag band (the Library tag
   card's pattern via `openLibraryItem`), clears filters for the long-tail
   "Everything else" band. **Not done:** seeing a band's whole list without
   scrolling sideways, or reading a note inline without leaving the tab.

### 37K. Emoji rendering — done, the bounded reading

*"I want to change how text emoji characters are rendered."* Too open to build
against blind — asked which of three readings (the variation-selector shape
below, a bundled Twemoji/Noto font, or plain-text alternatives for a
low-vision mode) was meant. **Decided: the variation-selector audit**, the one
concrete precedent already in this codebase (the ⚡️ fix — a bare U+26A1
renders as a thin text-style glyph on platforms whose default presentation
for it is text). Swept `app.js`/`index.html` for the classic list (⚡ ▶ ✖ ☑ ⚠
and others) and added the missing U+FE0F to every UI-visible hit — the
several that were only in comments were left alone, and ✉ ☎ ✂ ♻ ❤ ✔ don't
appear in the frontend at all. A different emoji font or a plain-text mode are
still open, undecided reinterpretations of the same original request.

### 37L. Dashboard widgets — shorter, and the full-audit umbrella

*"the widgets in the application being a little shorter or not taking up so
much space"* and, separately, the broad ask this whole batch sits under:
*"do a full ui overview, refine and make consistent... make sure the ui is
properly adaptable for all screen sizes and aesthetic configurations."* The
second is not a task, it is a **program** — the same shape as §35L (the
spacing-scale work) and worth exactly that kind of session: pick one
dimension (heights, this time, given how many of 37A–37J are height/spacing
mismatches on adjacent controls), sweep the whole app for it, and — the step
that made §35L stick — add the lint that stops it drifting back. §37E's zoom
setting and a genuine widget-density pass are the two concrete pieces of this
umbrella worth scheduling; "full UI overview" on its own is too broad to start
a session with and should be broken into dated sub-items as each is tackled,
the way §36 itself was.

---

**Priority order for the next session**, all of the above folded in. **Items
1–5 are now done** (37B decided no; 37D.1/37J/37F/37E built, verified in
Chromium) across two sessions picking up this list in order:

1. ~~**37B's decision**~~ **Decided: no.** See §37B.
2. ~~**37D.1** (resizable web panel)~~ **Done.** See §37D.
3. ~~**37J** (Timeline)~~ **Done.** See §37J.
4. ~~**37F** (graph toolbar)~~ **Mostly already done before it was picked up**
   (§37F's correction note); the real gap — Trace as a permanent row — fixed.
5. ~~**37E** (zoom setting)~~ **Done** — root `font-size` composing with
   `data-fontsize` via `--zoom`. See §37E.
6. ~~**37C**~~ **Done.** Item 1 had already shipped when this list was
   written (corrected in place); item 2/3 checked in Chromium, not needed.
7. ~~**37I**~~ **Done** — `compress_chat`, still hand off to a human, not auto-apply.
8. ~~**37G**~~ **Done, both halves** — sketch image upload, the markitdown importer.
9. ~~**37K**~~ **Done** — the variation-selector audit, the bounded reading.
10. **37H** — asked directly; user chose not this session. Still queued.
11. **37L** — the umbrella program; break into dated sub-items.

---
