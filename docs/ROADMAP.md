# MemoryMap AI — work plan

Everything outstanding, in the order I'd do it. Written so a fresh session can
pick up without re-deriving context.

Each item says **why** it matters, not just what to build — the reasoning is
the part that's expensive to reconstruct.

## Contents

- [Do these next, in this order](#do-these-next-in-this-order)
- [Priority map: quick wins → bigger bets](#priority-map-quick-wins-bigger-bets)
- [Folded in from IDEAS.md and outside review](#folded-in-from-ideasmd-and-outside-review)
- [How to work on this repo](#how-to-work-on-this-repo)
- [Done in the most recent session — read this first](#done-in-the-most-recent-session-read-this-first)
- [Done in earlier sessions — don't redo](#done-in-earlier-sessions-dont-redo)
- [1. Live log console (started, not finished)](#1-live-log-console-started-not-finished)
- [2. Quick wins](#2-quick-wins)
- [3. Chat page: Chat / Agent / Browse sub-tabs](#3-chat-page-chat-agent-browse-sub-tabs)
- [4. Library tab: chats, documents, images, archive](#4-library-tab-chats-documents-images-archive)
- [4a. A real whiteboard, not just a bigger sketch](#4a-a-real-whiteboard-not-just-a-bigger-sketch)
- [5. Documents](#5-documents)
- [6. OpenAI-compatible backends (LM Studio, llama.cpp, Jan, vLLM)](#6-openai-compatible-backends-lm-studio-llamacpp-jan-vllm)
- [7. Desktop packaging](#7-desktop-packaging)
- [8. Open bug list](#8-open-bug-list)
- [8b. Web search — two Windows bugs found, and what is left](#8b-web-search-two-windows-bugs-found-and-what-is-left)
- [9. The graph — make it a tool, and give it a look](#9-the-graph-make-it-a-tool-and-give-it-a-look)
- [10. Timeline tab, and time-aware notes](#10-timeline-tab-and-time-aware-notes)
- [11. Performance, accuracy and AI efficiency](#11-performance-accuracy-and-ai-efficiency)
- [12. Does the AI know it is an agent?](#12-does-the-ai-know-it-is-an-agent)
- [13. Web search effectiveness](#13-web-search-effectiveness)
- [14. More tools worth adding](#14-more-tools-worth-adding)
- [15. Appearance: more of everything](#15-appearance-more-of-everything)
- [16. Sweeping UI quality-of-life](#16-sweeping-ui-quality-of-life)
- [17. Use cases the app can't serve yet](#17-use-cases-the-app-cant-serve-yet)
- [18. Agent quality](#18-agent-quality)
- [19. Accessibility audit](#19-accessibility-audit)
- [20. Backend](#20-backend)
- [21. Skills — rebuilt; what is left](#21-skills-rebuilt-what-is-left)
- [22. Reported in use, not yet done](#22-reported-in-use-not-yet-done)
- [23. Organisation: manual grouping and multi-category notes](#23-organisation-manual-grouping-and-multi-category-notes)
- [24. Dashboard: more widgets, and layout depth](#24-dashboard-more-widgets-and-layout-depth)
- [25. App control: tray, health checks, and dependency repair](#25-app-control-tray-health-checks-and-dependency-repair)
- [26. Data lifecycle: archive, a full wipe, and a real trust page](#26-data-lifecycle-archive-a-full-wipe-and-a-real-trust-page)
- [27. Onboarding and first-run experience](#27-onboarding-and-first-run-experience)
- [28. In-app help: an AI that knows the docs](#28-in-app-help-an-ai-that-knows-the-docs)
- [29. Extensibility ideas, not yet scoped](#29-extensibility-ideas-not-yet-scoped)
- [30. External review, filtered — what didn't make the cut](#30-external-review-filtered-what-didnt-make-the-cut)
- [31. Claude's own read: what I'd flag](#31-claudes-own-read-what-id-flag)
- [32. Product direction — asked for directly, kept short on purpose](#32-product-direction-asked-for-directly-kept-short-on-purpose)
- [33. Odysseus, read and triaged](#33-odysseus-read-and-triaged)
- [34. Where I'd take this — an outside read](#34-where-id-take-this-an-outside-read)
- [**35. Reported in one session — the big batch, triaged**](#35-reported-in-one-session-the-big-batch-triaged)
- [Answers to questions already raised](#answers-to-questions-already-raised-so-they-arent-re-asked)

**New in this pass:** a proper line/branch view for the Timeline (§10C), a
search UI + privacy refinement pass now that SearXNG is confirmed working
(§13/§8b), a backend-design pass (§20) and a full priority triage of the
entire backlog — [**Priority map: quick wins → bigger
bets**](#priority-map-quick-wins-bigger-bets), right below — sorted by effort
rather than usage history, since most of it hasn't been used yet to sort the
other way.

## Next session: start here

Ordered by *how much it unlocks*, not by how much is left in the section.

1. **Let the agent run a skill.** The largest gap in the agentic story and the
   smallest change to close it. The agent can list skills, save them, and — as
   of this session — read a `when_to_use` that says which one fits. It still
   cannot start one; that is a click only the user can make, so a model that
   works out exactly what should happen has to ask for it in prose.
   `skill_runner` already exists and already takes an allowlist. **Shape:**
   reuse `ends_turn` (the mechanism `ask_user` introduced) rather than nesting
   an agent loop inside an agent loop — the tool hands control to the skill
   runner and the turn ends, which is also the honest thing to show the user.
   `list_skills` already tells the model it cannot do this; that sentence is
   what to delete when it can.
2. **The graph's last mile (§9).** Walking it and suggesting connections are
   done and token-budgeted. What is missing is *"how are these two related?"* —
   a path between two notes — plus clusters and drag-to-link in the view. The
   traversal code to build a path on is now there.
3. **§20's async-httpx refactor.** Deliberately deferred during §6 so there
   would always be a known-good streaming path to bisect against. That reason
   has expired, and the cost of waiting is real: it now has to touch two
   clients instead of one, and grows with every provider added.
4. **The live log console (§1)** — streamed, but not followed, filtered or
   exportable.
5. **Chat / Agent / Browse sub-tabs (§3)** and **the Library tab (§4)**, the
   two biggest untouched UI sections.

**Verify before building:** every provider test in this repo runs against a
fake transport. The SSE framing, the `[DONE]` sentinel and the tool-call
fragment indices are implemented from the specification, not from a running LM
Studio. Half an hour with the real thing would move §6 from "should work" to
"confirmed", and that is worth doing before anything is built on top of it.

Everything below this block is the standing backlog, unchanged.

---

## Do these next, in this order

> ### ⚠️ Superseded by [§35](#35-reported-in-one-session-the-big-batch-triaged) — read that first
>
> A single round of real use produced twenty-odd reports, most of them in the
> desktop app and most of them invisible to this suite. **§35 is the live
> list**; the six items below are the *previous* round and are all closed.
>
> The order §35 argues for, shortest reason first:
>
> 1. **Hallucinated writes** (§35B) — the agent narrated linking five notes
>    and called no write tool. This is the failure that destroys trust in
>    every other feature, and the net written to catch it did not fire.
> 2. **Quick + a thinking model returns nothing** (§35A.3 / §35D) — a total
>    failure, reproduced twice by the user, with a plausible one-line cause
>    (`num_predict` shared between thinking and answer).
> 3. **The Ask section** (§35A) — four reports on one box, and the direction
>    is clear: it is for interrogating the notebook, not for chatting.
> 4. **The broken buttons and the stacked constellation** (§35F, §35G) —
>    probably one cause between them, and "again" in the report means the
>    last fix was not held by a test.
> 5. **Desktop persistence and file saves** (§35E) — two symptoms, likely
>    one storage bug; the file-save half needs a server-side route.
> 6. Everything else in §35, which is written up in place.
>
> The rule below still governs all of it: **check the running app first.**

Re-prioritised after a round of use. The ordering is by *how often it gets in
the way*, not by how interesting it is to build.

1. ~~**Skills are not skills** (§21)~~ **rebuilt, and running one is a job
   now.** A skill has ordered steps, a tool allowlist and declared inputs;
   `save_skill` takes steps and tools, so "make me a skill that files my inbox
   notes" has somewhere to put them. Running one executes **a step per turn**,
   ticking each off, naming the step that failed, and ending in a list of what
   changed with an Undo on each. The allowlist is both the safety property and
   the §11a win: a run offers its own tools instead of all 28 (1,963
   characters of schema instead of 10,215). What is left is small — see §21.
2. **Web search still returns nothing** (§8b). **Two causes found and fixed
   this session, both Windows-only, both reported by the user rather than
   found in the log** — see §8b. The install error (`does not appear to be a
   Python project`) and "started but never answered" were the same class of
   mistake: a POSIX idiom that does something else on Windows. Unverified on
   Windows itself — the sandbox is Linux — so the next session should confirm
   with the user before assuming this one is closed.
3. **Token usage in chats** (§11a). Asked directly: "is there a way to reduce
   excessive token usage in the chats?" A 3-turn chat is showing 8.7k tokens.
   The history and the retrieved notes are resent whole on every turn.
   *Measured since:* the fixed overhead alone — system prompt plus all 28 tool
   schemas — is ~3,050 tokens per round, and 77% of that is the schemas, not
   the prose. `agent.PROMPT_BUDGET_CHARS` now caps it and a test enforces the
   cap. ~~The remaining win is offering fewer tools per turn~~ **done, both
   halves.** A skill run offers only the tools it declared (1,963 characters
   of schema rather than 10,215); an ordinary turn is now read for what it
   plausibly needs (`tools.focus_for`), which takes the *fixed* overhead of a
   typical question from ~3,157 tokens to ~1,439. ~~What is left here is the
   variable half~~ **the variable half is now budgeted too — see
   `ai/context.py`.** Every part of the prompt is a share of the model's real
   window rather than its own constant, so the worst case fits by
   construction instead of by luck; the measurement that motivated it (the
   old worst case was ~11,328 tokens against a 4,096 window) is written up in
   "Done in the most recent session". **What is genuinely left is the output
   side** — `num_predict` is capped at a flat 1,024 now, and the
   quick/normal/detailed preset below is what would make that adaptive rather
   than uniform.
4. ~~**Markdown rendering for notes** (§22)~~ **done.** Inline only — bold,
   italic, `code`, strike — because `renderMarkdown`'s block elements make a
   note list enormous, which is the problem §22 itself flagged. Wiki links and
   filter highlighting both still work inside emphasis. The dashboard's little
   note lists *strip* the markers instead, since they clip at ~70 characters.
5. ~~**Note timeline** (§10)~~ **both halves built.** Relative time is
   resolved at capture (`entry/timewords.py` → `entry_dates`) and there is a
   **Timeline tab**: a time axis across, bands down the side (category, tag or
   none), and every note plotted at what it is *about* where it says so —
   "the beans need netting next week" sits on that week, marked 🕓 — and at
   when it was written otherwise. What is left is in §10: an `events` table so
   the bands can be events and places rather than only categories and tags.
6. ~~**A hero header on the dashboard** (§22)~~ **done** — emblem and wordmark
   inside the greeting card, hidden below 720px.

**Where this session got to.** Items 1–6 above are all closed. The body
sections below are the backlog now, and the ones with the most left in them
are §9 (the graph's *utility* — paths between notes, clusters, drag-to-link;
the layouts are done), §1 (the live log console), §3 (Chat/Agent/Browse
sub-tabs) and §4 (the Library tab). §5's "attach documents to notes" is done
— see below.

> **Check the running app before building anything here.** This document
> describes intent, and it drifts. An audit of §2 found four of its six "quick
> wins" already built — the sticky sidebar, the per-code-block copy button,
> conversation search by content, and the whole document outline with word
> count and reading time. §5 and §18 each had a completed item still listed as
> outstanding. Three sessions have now independently rebuilt something that
> already existed. Items verified against the code are marked ~~struck
> through~~ with what was found; anything not marked is worth ten seconds of
> grep first.

---

## Priority map: quick wins → bigger bets

Asked for directly — a triage across *everything* in this document, not just
the six items above (those are the ones already proven to matter most in
actual use; this is the rest of the backlog, sorted by effort rather than
usage history, since nobody has used most of it yet to sort it the other
way). Four tiers. Within a tier, order doesn't mean much; between tiers, it
does.

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

**Tier 1 — fastest wins.** ~~Hours, not sessions; contained to one file or one
function; low risk of breaking something else.~~ **all six done.** Unlike the
security tier, none of these turned out to be already built. Pinned by
`tests/test_security_boundaries.py` and `tests/test_tier1_refinements.py`.

- ~~Say which search engine answered a query (§13)~~ **done, and it needed
  more than surfacing a field.** A raw slug already appeared in the status line
  ("8 results via searxng"), which is not the same as saying what the choice
  *meant*. Now: a readable name plus a plain-English privacy note ("SearXNG —
  your own instance, the query stayed on your machine" / "DuckDuckGo — a third
  party saw this query, but not your notes"), said **on an empty result too**,
  which is when it matters most and was exactly when the panel went quiet.
  Per-result, the **upstream engines** SearXNG actually used are now shown —
  it is a metasearch engine, so "via SearXNG" says where the query was
  assembled, not who answered it.
- ~~"N records dropped" visibility in the log console (§1)~~ **done.**
  `GET /logs/stats` reports `dropped`, `dropped_since`, `held`, `capacity` and
  `truncated`, and the viewer shows a caution line above the list. `dropped`
  and `truncated` are deliberately separate numbers: one is gone for good, the
  other is one bigger `limit` away, and conflating them sends a reader looking
  in the wrong place. `/logs` itself is untouched and still a plain list.
- ~~Grey out Gravity/Spread under layouts they don't affect (§8/§9)~~ **done.**
  Both only ever fed `d3.forceSimulation`, which the tree layouts skip
  entirely — so under Tree or Radial they moved, saved, and changed nothing.
  Disabled and dimmed there, with the reason on hover, and restored (along
  with their own tooltips) on the way back to Force. Set on arrival as well as
  on change, or a notebook left on Tree returns with two live-looking dead
  sliders.
- ~~Flip SearXNG to the recommended default (§13)~~ **done — but not the way
  this item says, and the difference matters.** Read literally, "flip the
  default to SearXNG" means the `searxng` provider, which exists precisely so
  it will **not** fall back. As a default that would make every search fail on
  a fresh notebook, which has no SearXNG yet — turning a working feature off
  for everyone who has not installed one. `auto` *already* prefers SearXNG
  whenever it is running, so the behaviour this item wanted was in place; what
  was missing was **saying so**. The provider is now labelled "Automatic
  (recommended)" and its detail explains the preference and the fallback, and
  the settings copy calls SearXNG "the recommended way to search" and mentions
  the one-click install, rather than "an optional, self-hosted search engine".
  README updated to match. A test pins the default at `auto` with the reason.
- ~~Enforce (or at minimum document) single-worker at startup (§20)~~ **both.**
  `deps.refuse_multiple_workers()` runs at the top of `create_app()` and raises
  on `--workers N` (N > 1), `--workers=N`, `-w N` or `WEB_CONCURRENCY`. An
  exception rather than a warning, because every failure it prevents is silent:
  a halved log, an unlock that works only sometimes, two workers each believing
  they own the SearXNG they started. `python -m memorymap` cannot reach this
  (it hands uvicorn an app object, which uvicorn cannot fork); running
  `uvicorn` against the factory can, and is the case it exists for.
  `ARCHITECTURE.md` §13 now has the constraint and a table of what each
  duplicated singleton would actually do.
- ~~Audit SearXNG's generated `settings.yml` (§13)~~ **done; less was wrong
  than feared, and the reasoning is now in the file.** One change:
  `autocomplete` is pinned to `""` rather than merely left at SearXNG's
  default, because it is the one thing in a search UI that leaks *without a
  search being run* — a fragment of every query goes to a third-party
  suggestion endpoint as it is typed — and this file is rewritten on every
  start anyway, so pinning costs nothing and survives both a hand edit and an
  upstream default change. Confirmed already correct: `image_proxy: true`
  (result images come via SearXNG, so rendering a page does not tell every
  pictured site you searched — this is also the answer to the "no client-side
  favicon fetching" worry below), and the engine list, which removes the
  tracking-heavy defaults and adds two that run their own indexes.
  `limiter: false` now carries a comment tying it to the loopback bind: it is
  safe **only** because nothing off this machine can reach the port, and if
  that ever changes the limiter has to come on in the same edit.

> **Unverified against a live SearXNG.** The sandbox has no route to SearXNG's
> archive, so the settings change above was checked by parsing the generated
> file, not by starting an instance on it. It adds one key under an existing
> section, which is the low-risk shape, but a real start is still worth
> watching the first time.

**Tier 2 — quick wins.** A session or so. Real but contained — mostly
extending a pattern that already exists rather than inventing one.

- ~~Finish the live log console: stream via EventSource, tail/autoscroll,
  level filter, merge the browser-side ring buffer (§1)~~ **done** — streamed
  as NDJSON over `fetch` rather than EventSource; see §1 for why that swap was
  forced rather than preferred.
- ~~`create_category` / `merge_categories` / `delete_category` as agent tools,
  following the existing tag-tool pattern (§14)~~ **done** — four of them
  (`rename_category` too). Adding them briefly made the prompt budget the
  binding constraint on §14's list; that has since been **lifted** by fitting
  the tool schemas to the model's real context window rather than to a
  constant. See §14.
- ~~A support-bundle export button (§1)~~ **done**, as an allowlist.
- Fix the specific reported bugs in §8's ideas-parking-lot list — the
  miscategorised note, the dashboard markdown gap, the constellation widget
  not redrawing on theme change, settings on a narrow viewport — each is
  probably small once found, and none has been reproduced in a browser yet
- Collapsible sidebars (§16)
- Keyboard arrow-key movement + Enter-to-open in the note list (§16)
- A per-chat token/context meter in the Chat tab — the number already exists
  server-side (§11a); this is surfacing it
- Save a full custom theme, not just a palette (§15)
- Word-count goal in Documents, the one unbuilt piece of an otherwise
  finished feature (§5)

**Tier 3 — medium bets.** Multiple sessions, genuine design decisions, but
each is scoped and none needs a new abstraction the codebase doesn't already
have a version of.

- The Timeline branch/line view (§10C) — new rendering work, but reuses
  §9's clustering and §10A's date data rather than inventing new grouping
- Chat / Agent / Browse as real sub-tabs (§3) — see the sequencing note
  below before starting this one
- The Library tab (§4)
- The graph's utility — paths between notes, clusters, drag-to-link; the
  layouts are already done (§9)
- An eval/benchmark harness for tokens, latency and filing accuracy
  together (§11, §31)
- A headless Playwright smoke suite in CI (§31) — **do this before the
  module split below, not after.** It's the direct answer to "every layout
  bug passes a green run," and it's also the safety net a mechanical refactor
  of the frontend needs before it happens, not once it's already done.
- Splitting `app.js` into ES modules, one file per tab (§31) — **not a
  standalone session; ride it in on §3.** Asked directly whether this
  refactor should happen first, ahead of everything else here, precisely
  because every new feature adds more code to the one file. The dependency
  runs the other way, though: touching 12k working lines with nothing
  automated to catch a regression is the riskiest kind of change to make
  *before* the smoke suite above exists, not after — the app's own history
  ("every layout bug found so far passed a fully green run") is a warning
  about exactly this. Once the smoke suite exists, the cheapest way to do
  the split is incrementally, one module per tab, timed to land alongside
  work that's already touching that part of the file — §3's Chat/Agent/Browse
  split is the natural first slice, since extracting Chat into its own
  module is close to free as a byproduct of that work, versus a dedicated
  pass that touches the same code twice for no additional feature.
- The app-control/health-check screen, without the tray/packaging work
  around it yet (§25)
- First-run diagnostics folded into onboarding (§27)
- A plain-Markdown-folder importer (§31) — the smallest version of "bring
  notes in from somewhere else" that still covers most real cases

**Tier 4 — bigger bets.** Architecture-level, multi-session, and the scope
itself is still an open question for several of these — worth a deliberate
decision before starting, not a session that discovers the scope midway.

- Multi-category notes (schema change) vs. manual grouping (additive,
  smaller) — decide which is actually wanted before building either (§23)
- Response-mode presets (quick/normal/detailed) with per-mode model
  assignment, and the "optional" dynamic routing on top (§11)
- The agent reachable from anywhere in the app, and — much bigger, and
  flagged rather than scoped — the agent controlling the screen itself (§18)
- Desktop packaging: signed installers, single instance, tray, update
  channels (§7, §25)
- A dedicated whiteboard, distinct from the existing sketch pad (§4)
- MCP tool support (§29) — no shape yet, and needs its own trust model
  before it needs code
- The mobile-access / LAN-exposure decision (§17) — a decision first,
  security work second, code third

---

## Folded in from IDEAS.md and outside review

Two outside reviews of the repo (Perplexity, two passes; Gemini, two passes)
and the running `IDEAS.md` parking lot are merged into the sections below,
rather than kept as separate documents. Worth knowing before trusting any of
it:

**The two reviews failed differently, and §30 tells them apart.**
Perplexity reasoned carefully from a real but stale GitHub bio — "models
bundled directly, no Ollama… required" — which describes a *different*
project, not this one; MemoryMap AI talks to Ollama over its local REST API
(`ai/ollama_client.py`) and has done since Phase 2. Gemini's *first* pass,
denied repo access the same way, didn't hedge — it fabricated a specific
architecture (a "Ghost Sidebar" UI, a ChromaDB/LlamaIndex pipeline) that
matches nothing here. Its *second* pass, after reading the live GitHub Pages
site, is accurate, and its suggestions are judged on their merits rather
than discarded — see §4, §17, §24, §26, §29 and §21 for where they landed.
Full breakdown, including exactly what got dropped and why, is in §30. What
*did* transfer from the first-pass problems are the parts that were really
about general local-AI-app hygiene and happen to fit this repo anyway:
prompt observability, a support bundle, an eval harness, first-run
diagnostics. Those are folded into §1, §11 and §25–§28 below, in this app's
actual shape.

**IDEAS.md was a parking lot on purpose** ("out of scope right now"), so
folding it in here is the point of this pass — some of it duplicates work
already designed elsewhere (image drag-and-drop is already §4 item 1; a
branching timeline is already in §10; a custom-palette builder is already
§15), some of it is a genuine bug report that had never made it to §8, and a
few items are big enough to be their own section (§23–§29). Each folded item
below says where it landed and, for the outside-review material, whether it
survived contact with the actual architecture.

**Every line, accounted for.** So nothing here reads as silently dropped —
`IDEAS.md` had 42 items when this pass was written; this is all of them:

| `IDEAS.md` item | Landed |
|---|---|
| Update README + GH Pages | §22 (new) |
| "ai is cool" filed under Sketches | §8 (new) |
| Expand sketches / whiteboard tab | §4a (new, fully scoped) |
| Image/file uploads + drag-and-drop | §4 item 1 — fully scoped, asked for again directly |
| Manual grouping of notes | §23 (new) |
| Multi-category notes | §23 (new) |
| Guided first-run setup | §27 (new) |
| Note/data compression | §26 (new) |
| Better agentic web search | §13 (extended) |
| Bottom status bar + palette access | §16 (new) |
| Save custom appearances/themes | §15 (extended — a saved *theme* is more than a saved palette) |
| "Notebook constellation" redraw on theme change | §8 (new) |
| Gravity/Spread don't affect other graph layouts | §8 (new) |
| Branching visual timeline | §10 (extended) |
| Better documents UI/usability | already thoroughly scoped in §5 — checked again, nothing missing |
| Settings unreachable on narrow/mobile | §8 (new) + §19 |
| Clean up timeline/graph spacing | §8 (new) |
| Dashboard widgets missing markdown | §8 (new) |
| More dashboard widgets / pie charts | §24 (new) |
| Chat metadata disappears on reload | §8 (new) |
| Better token tracking | §11 (new meter) |
| More category-management tools, better agent workflow | §14 (new) |
| Notes/documents as one whole (OneNote/Obsidian/Notion) | already thoroughly scoped in §5 — checked again, nothing missing |
| Agent permission dialogue + before/after + agent everywhere | §18 (new) |
| Agent controlling the screen itself | §18 (new, flagged as far bigger than the rest) |
| Quick/normal/detailed modes, per-mode models | §11 (new) |
| In-built browser with MCP tool abilities | §29 (new) + §3 (existing browser discussion) |
| Full security sweep | §8b (new) |
| VS Code extension | §29 (new) |
| Cross-platform Linux/Mac | §7 (extended) |
| Console completeness in Settings | §1 (new) |
| Hide the cmd window, tray-accessible | §25 (new) |
| Exit app + close backend, automate setup/fixes | §25 (new) |
| App management interface (health check, repair deps) | §25 (new) |
| Run on mobile / iPhone | §17 (extended) |
| Does the red AI-status ever happen? | closing Q&A (new) |
| In-settings ask-AI help with docs access | §28 (new) |
| Reduce token usage | §11a (already there) + §11 (new: a visible meter, an eval harness) |
| Streamline/optimise the backend and AI interactions | this is §11's whole subject already — no single line answers it, the section does |
| Package the app + improve the Settings → Models page | §7 (packaging, already there) + §30 (what a fancier Models page would and wouldn't add) |
| Expand start.bat / background CLI / dev console | §25 (new) |
| Dynamic model switching by task complexity | §11 (new) |
| Collapsible sidebars | §16 (new) |

---

## How to work on this repo

- `pytest` — 864 tests, fully offline, no Ollama needed (`pytest.ini` sets
  `pythonpath = src`, so this works without an editable install)
- `ruff check .` — matches CI
- `node --check frontend/app.js` — the frontend is one large plain-JS file, so a
  syntax check is worth running after every edit

Four of those tests are guards rather than features, and are the ones most
likely to fail on you without you having broken anything visible:

- `tests/test_frontend_ids.py` — duplicate element ids, and `$("…")` lookups
  with no matching element. Two elements sharing `persona-prompt` is what made
  "Add Persona" silently throw.
- `tests/test_prompt_budget.py` — the agent's fixed per-round overhead. If you
  add a tool, this is what tells you it cost something. See §11a.
- `tests/test_security_boundaries.py` — session expiry, the origin check, the
  CSP, and SearXNG's published port. Two of its assertions are about the
  *frontend*: that `index.html` contains no `style=""` attribute, and that
  custom CSS does not inject a `<style>` tag. Both would otherwise fail
  silently in a browser and nowhere else.
- `tests/test_context_budget.py` — that one turn's worst case still fits the
  model's window, at every window size. This is the one that fails if a new
  part of the prompt is added without giving it a share, or if a share is
  raised without taking it from somewhere else. It also asserts that all four
  Ollama generation paths send an options block, because a payload that
  quietly omits one is a model running on the backend's defaults again.
- the pre-paint theme table in `index.html` drifting from `THEME_PRESETS`.

**Drive the app in a browser before claiming anything works.** Chromium is
preinstalled at `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`, but the
Python package is not — `pip install playwright` first (do *not* run
`playwright install`; the browser is already there). Launch the context with
`service_workers="block"`, or `sw.js` serves a cached `app.js`/`style.css` and
you will be looking at a page that does not contain your change.

Two things make this much faster than it sounds:

- Top-level functions in `app.js` are plain globals, so `page.evaluate` can
  call `switchTab`, `applyThemePreset` or `renderEmbeddingPicker` directly.
  That turns "does this picker stick?" into a five-line test.
- **Assert on measured geometry, not screenshots.** `scrollWidth - clientWidth`
  found a 2145px overflow and then proved it gone; sweeping widths in 20px
  steps found a header that overflowed itself at every size between 740 and
  1400px. A screenshot shows one width and invites you to squint at it.

Every UI bug in §8 passed a fully green test run.

**A working driver script**, if you want to skip re-deriving one — unlock,
dismiss onboarding, then drive:

```python
page.goto("http://localhost:8000", wait_until="networkidle")
page.wait_for_timeout(800)
if page.locator("#lock-overlay").is_visible():        # NOT #unlock-password
    page.fill("#lock-password", "…"); page.click("#lock-submit")
    page.wait_for_timeout(2500)
if page.locator("#onboarding-overlay").is_visible():  # blocks every click
    page.click("#onboarding-skip")
```

**Collect the console while you drive.** The app sends a strict CSP now, and
anything it refuses is reported *only* there — no failed request, no thrown
error, just a thing that quietly does not happen. This is what found the
custom-CSS regression that 757 green tests missed:

```python
violations = []
page.on("console", lambda m: violations.append(m.text) if "Refused" in m.text else None)
page.on("pageerror", lambda e: violations.append(f"pageerror: {e}"))
```

For a violation the console message alone will not locate, listen for the
event instead — it carries `sourceFile` and `lineNumber`, which the console
text does not:

```python
page.add_init_script("""
  window.__v = [];
  document.addEventListener('securitypolicyviolation',
    e => window.__v.push({d: e.violatedDirective, f: e.sourceFile, l: e.lineNumber}));
""")
```

Start the server with `MEMORYMAP_DATA_DIR` pointed at a scratch directory so
you never drive the real notebook. Use the app's own `apiJson` inside
`page.evaluate` rather than raw `fetch` — auth is an `X-Auth-Token` header,
not a bearer token, and a hand-rolled fetch just 401s.

**Installing dependencies in a fresh sandbox:** `download.pytorch.org` is blocked
by the network policy, so `pip install -r requirements.txt` stalls on torch.
Install the non-ML subset from PyPI instead (fastapi, uvicorn, SQLAlchemy,
python-dotenv, requests, numpy, bcrypt, cryptography, python-multipart, pytest,
httpx, ruff), plus `pip install --force-reinstall cffi` — the system
`cryptography` needs a `_cffi_backend` that isn't present by default, and three
test files fail to collect without it.

**There is no general outbound network in the sandbox** — the proxy refuses
anything not explicitly allowed, so you cannot verify a new search-engine
scraper, or anything else that talks to a third-party site, against the real
thing. Don't ship one you couldn't test.

### Traps worth knowing about

1. **Don't guess element ids.** Query generically — "what became visible after
   this click?" — or check the id in `index.html` first.
2. **The test fakes override more than you expect.** `FakeEmbeddingService`
   overrides `embed_text` wholesale, so a test of the embedding cache passed
   while proving nothing. Check what the fake actually replaces.
3. **Reduced motion kills every animation.** Any animation that carries
   *meaning* (a progress indicator) needs a non-motion fallback, or it freezes
   and reads as a rendering fault.
4. **`git checkout <file>` to undo a bad edit discards everything uncommitted in
   that file.** Commit before experimenting.
5. **A POST response can lie about stored state.** SQLAlchemy returns the object
   still in memory, so a serialisation bug only appears on the next read from
   disk. The UTC timestamp bug hid behind exactly this — assert on the LIST
   response, not the create response.
5b. **`utcnow() + offset` is a lie with a timezone attached.** It produces an
   aware datetime *tagged UTC* that actually holds local wall-clock, so
   anything reading its `.isoformat()` is told an offset that is false. This
   shipped: Magic Add handed that string to the model as "the current time",
   the model answered with the same `+00:00` it had been shown, the route
   trusted the offset and skipped its correction, and every relative reminder
   landed out by exactly the user's UTC offset. "In half an hour" became 10am
   the next day for a user at UTC+10, and was perfectly correct for anyone at
   UTC — which is why it survived so long. **Build the user's clock as
   `utcnow().astimezone(timezone(offset))`**, so the frame is true and both
   the naive and aware branches answer the same question. Two datetimes that
   represent the same instant are equal; two that merely *print* the same are
   not the same thing.
6. **Later CSS with equal specificity silently wins.** `position: relative` on
   `#chat-sidebar`, declared 600 lines later for the resize handle, quietly
   un-stuck a `position: sticky` rule. When a style "doesn't apply", grep for
   the property rather than re-declaring it.
7. **The Notes tab is sub-tabbed.** Anything that scrolls to a note must call
   `showNotesSection("browse")` first, or it scrolls to an element inside a
   `display: none` section and appears to do nothing.
8. **Check `main` before building.** Two sessions independently built web-search
   privacy, curated colour sets, and notebook-access tools. Merging them cost
   more than coordinating would have.
9. **The test suite cannot see any of the above.** Every UI bug listed below
   passed 480+ green tests.
10. **CSS automatic minimum sizing is the usual cause of a wide page.** A `1fr`
    grid track and a `min-width: auto` flex item both refuse to shrink below
    their content. `overflow-x: auto` on the child does nothing until every
    ancestor has an explicit floor. This one bug produced three separate
    reports before it was understood.
11. **A POSIX idiom can mean something else on Windows, silently.** Two bugs
    in one module: `os.kill(pid, 0)` terminates the process on Windows rather
    than asking about it, and `shutil.rmtree(ignore_errors=True)` cannot
    delete a read-only file there, so it half-deletes the tree and reports
    success. Both ran on every settings-screen poll. The user runs Windows;
    the sandbox does not, so nothing here reproduces either one.
12. **The app sends a strict CSP, and a violation is reported in the browser
    console and nowhere else.** No test sees it, no request fails, no error is
    thrown — the thing simply does not happen. If a style, a script or a fetch
    "does nothing" and the handler looks right, open the console before
    debugging the handler. Three rules follow from the policy: an injected
    `<style>` tag will not apply (use `adoptedStyleSheets`), a `style=""`
    attribute in `index.html` will not apply (put it in `style.css`), and a
    second inline `<script>` in `index.html` needs no action — its hash is
    computed from the file at startup — but a script loaded from anywhere
    off-origin will be refused outright.
13. **A control that "does nothing" is usually working.** Four reported cases,
    three of which wrote correctly and were then overridden — by CSS source
    order, by a status poll repainting from the server, or by living in a
    hidden section. Check the *computed* result, not the handler.

---

## Done in the most recent session — read this first

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

## 1. Live log console (started, not finished)

**Why.** Asked for directly: the Logs screen should read "like the terminal
running in the background, with key errors flagged", not a list you refresh by
hand.

**What exists.** `core/logbuffer.py` is a 500-record ring buffer attached to the
root logger and uvicorn's. It now sanitises each message to one printable line
(so a chat question or a page title can't forge a row) and keeps tracebacks in a
separate `trace` field for a fold.

**What's left.** ~~Everything below~~ **nothing — §1 is finished.**

- ~~Stream `/logs` while the section is open — an EventSource endpoint is
  cleaner than polling~~ **done, but NOT as EventSource, and the reason is
  worth keeping.** EventSource cannot set request headers, and this app
  authenticates with `X-Auth-Token`, so an EventSource here would simply 401.
  The standard workaround is to put the token in the query string, which is a
  bad trade anywhere and a farcical one on *this* endpoint: the token would be
  written into the very records it protects. So NDJSON over `fetch`, which
  matches the chat and digest streams the app already has. Server-side it
  polls the ring buffer rather than registering subscribers on it — a
  subscriber registry means the logging handler pushes into per-connection
  queues, so a slow reader can stall or grow unboundedly *inside logging
  itself*, and a logging path that can block is a far worse failure than a
  console running 700ms behind.
- ~~Follow/tail mode with autoscroll, pausing the moment the user scrolls
  up~~ **done**, and scrolling back to the bottom resumes it — the same
  gesture every terminal uses. The label says "(paused)" rather than just
  stopping, because silently stopping has the same shape as the app freezing.
- ~~Level filter (all / warnings / errors) and a text filter~~ **done**, plus
  a source filter. Filters only re-draw what is already held and never
  refetch, so changing one mid-incident cannot lose the records you were
  looking at. When a filter hides things it says how many: "nothing matches"
  and "nothing happened" are different answers and only one is fixed by
  changing the filter.
- ~~Render the `trace` field in a fold under its record~~ **done.**
- ~~Merge the browser-side `browserLogs` ring buffer into the same view,
  tagged by source~~ **done** — one array, sorted by time, tagged only in the
  merged view (in a single-source view every row would carry the same tag). A
  browser error and the request that caused it are one event seen from two
  ends, and reading them apart was what made this screen hard to use.
- ~~Count errors since the screen was last opened and badge the nav item~~
  **done**, and the badge is clickable — it opens the screen already filtered
  to errors, since it is the only place a failure announces itself.
- **Getting one error OUT of the log** (asked for directly after the console
  landed: "make sure that if there is an error in the log that it can be
  accessed and copied"). Each record has its own copy button that takes the
  traceback with it, an open traceback has a **Copy traceback** of its own,
  and "Copy all" relabels to "Copy 12 shown" whenever a filter is hiding
  something. **The real find here was underneath:** every copy in the whole
  app went through `navigator.clipboard`, which browsers expose **only in a
  secure context**. `http://localhost` qualifies, which is why nothing had
  ever shown it — but reach the app at `http://192.168.1.20:8000` or through
  a tunnel (§17's mobile-access question, and the proxied client address §8b
  already saw in a real log) and the API is `undefined`, so every copy button
  in the app was a no-op that said "couldn't copy". Copying now tries the
  modern API, then `execCommand` on plain http, then shows the text
  pre-selected in a dialog. A test asserts no caller writes to
  `navigator.clipboard` directly any more, since a helper only some callers
  use leaves the rest quietly lying.
- ~~**Export a support bundle.**~~ **done** — see below; it is an allowlist,
  not a denylist. One button that zips the log buffer,
  `preferences.json` with anything sensitive stripped, and Ollama/model
  status (`/models/status`) into a file the user attaches to a bug report —
  asked for indirectly ("an interface for managing the application… errors
  etc") and echoed by the outside review's "support bundle" suggestion.
  Everything in it is already local and already visible somewhere in the app;
  this only collects it. No new telemetry — the file is written to disk and
  the user chooses whether to send it, which is the difference between this
  and the outside review's other suggestion (opt-in crash reporting),
  rejected in §30.
- **Confirm nothing is silently dropped.** Asked as "make sure all the
  console messages are shown" — `logbuffer.py` is a 500-record ring buffer,
  so a very chatty session can push early records out before the screen is
  opened. Worth a visible "N records dropped, oldest kept is …" rather than a
  silent gap.

---

## 2. Quick wins

Small, self-contained, each removing a visible annoyance.

**Four of these were already done** — checked in the running app rather than
assumed, since three sessions have now rebuilt something that already existed:

- ~~**SearXNG install path**~~ done. Not the `pip install searxng` this section
  suggested: SearXNG doesn't publish to PyPI, so that name is somebody else's
  package. git is only needed to *fetch*, and pip can download and unpack the
  source tarball itself — so it clones when git is there and uses the tarball
  when it isn't. Install progress was already polled and shown inline.
- ~~**Notes sidebar sticky**~~ done — the rule already exists, once, above the
  section that used to duplicate it.
- ~~**Copy button per code block**~~ done, in chat answers.
- ~~**Conversation search** by content~~ done — `conversation_matches` decodes
  the message JSON rather than LIKE-ing the column, so "tent" no longer matches
  every chat by way of the word `content`.

**Still open:**

- **Empty chats can't be deleted.** Saved chats do have a delete action, and
  deleting the last turn deletes the conversation — so this is only about the
  *unsaved* chat in the main pane, which has no affordance but "+ New". Worth
  confirming what was actually meant before building anything.
- **Document outline / table of contents** from the headings, plus word-count
  goal and reading time. The one genuinely unbuilt item here; see §5.

---

## 3. Chat page: Chat / Agent / Browse sub-tabs

**Why.** Asked for directly. The page mixes three activities in one column, and
the web panel is bolted on top of the message list.

**Shape.**

- **Chat** — plain grounded Q&A
- **Agent** — tool-calling with its own controls: which tools are allowed this
  turn, max rounds, visible plan/progress, and a stop that keeps what it already
  did
- **Browse** — web search results, reader view, page history

Cross-linking is the point: the agent hands a page to Browse, Browse hands a page
to the chat. Web-search gating should be independent — a Browse-only mode where
the section works even when the chat/agent `web_search` tool is off.

**On the "in-built browser".** In the browser-served app this can only be an
`<iframe>`, and most sites send `X-Frame-Options`/`frame-ancestors` that refuse
to load in one — it would fail on exactly the sites worth opening. Proxying and
rewriting pages server-side is effectively writing a browser, and re-introduces
every tracker the privacy work removed. So the reader view stays the web path,
and a genuine embedded browser belongs in the desktop shell, whose webview can
navigate anywhere. **This ties §3 to §7.**

---

## 4. Library tab: chats, documents, images, archive

**Why.** Asked for directly. Everything that isn't a note lives only in its own
tab, and there is no archive at all.

**Order matters — images first, since the gallery is a view over what they
store:**

1. **File uploads on notes — asked for again, directly: "I want to be able
   to upload files with notes."** Worth being precise about what's already
   there versus what isn't, since this is narrower than it sounds:
   - **Already exists:** images can be pasted or dropped into a note or
     document (this item, above), and `📎 Attach a file` stores an arbitrary
     file (PDF, `.docx`, anything) against a note and gives you back a
     download — so the storage layer and one upload path both already
     handle non-image files.
   - **What's actually missing:** that attach path is a button, reached
     after the note exists — there's no drag-and-drop of an arbitrary file
     straight onto the **capture box itself**, which is the "upload files
     *with* notes" framing (attaching *while* writing, not as a separate
     step afterward). And a non-image attachment shows no preview in the
     note card — an image gets a thumbnail; a PDF gets nothing to
     distinguish it at a glance, just the filename behind the 📎.
   - **Scope, concretely:** extend the capture box's existing image
     drop-handler (item above) to accept any file type rather than
     branching on MIME type — same `attachments` table, same
     `routes_files.py`, so this is widening an existing path rather than
     building a second one. Multiple files in one drop should attach all of
     them, not just the first. For the preview: a small type-specific icon
     (PDF, doc, generic) is enough — actually rendering a PDF thumbnail is a
     real feature on its own and not needed for this to feel finished.
   - **A step further, genuinely new: extracting text from what's
     uploaded, not just storing it.** An image of a whiteboard photo or a
     handwritten page currently attaches as an opaque file — nothing reads
     it. Local OCR (`pytesseract` or similar, no cloud call needed) run on
     an attached image at upload time could feed its text into the same
     search index notes already use, so "what was on that whiteboard photo
     from March" becomes answerable. This is a genuinely separate capability
     from the file-storage work above — it's the one part of "handle image
     and file uploads" that isn't already half-built — worth scoping as its
     own follow-on rather than folding into the attach-path widening, since
     it needs a new pipeline stage (extract → index), not just a wider
     drop-handler.
2. **A bigger sketch board — asked for again: "improve sketches board, maybe
   a whiteboard tab??"** See below; promoted out of this list into its own
   full write-up given how much is actually being asked for.
3. **Archive.** A state between "active" and "binned", for things you want out
   of the way but not deleted. Applies to notes, chats and documents: one
   `archived_at` column per table, an additive migration.
4. **Library tab.** One place showing stored images, documents, chats and
   archived items, with previews, sorting and search.

---

## 4a. A real whiteboard, not just a bigger sketch

**Why, and what's actually being asked for.** The sketch pad today is one
canvas producing one PNG, tied 1:1 to one note — closer to a Polaroid than a
whiteboard. "Expand and improve sketches board, maybe a whiteboard tab??"
plus the follow-up ask for it directly means something with more freedom
than that: a canvas that isn't locked to a single note, that you can come
back to and keep adding to, and that plausibly holds more than ink — text
boxes, shapes, maybe pinned note cards.

**Two genuinely different things live under "whiteboard," and they have very
different costs:**

- **A bigger, freestanding sketch.** Still a raster canvas producing one
  image, same technology as today's sketch pad — the difference is it's not
  born attached to a note (it's its own Library item, per §4 item 4 above),
  it can be reopened and drawn on further rather than being a one-shot
  export, and it can be arbitrarily large/pannable rather than a fixed
  small pad. This is genuinely close to what already exists: same
  `attachments` storage shape, same rendering approach, mostly a change in
  *lifecycle* (persistent and reopenable, not one-and-done) rather than new
  technology.
- **A structured canvas** — separate movable/resizable elements (shapes,
  text, sticky notes, embedded note cards you can drag onto it), each
  stored as its own positioned object rather than baked into one flat
  image. This is what tools like Excalidraw or tldraw actually are, and
  it's a different kind of feature: an infinite-canvas scene graph with its
  own undo model, not an extension of the sketch pad. It's also the version
  that would let a whiteboard hold *note cards* pinned to it — which is the
  part that would make it feel like part of this app rather than a bolted-on
  drawing tool, since nothing else here does that.

**Worth sequencing rather than picking one.** The freestanding raster
version is a small, mostly-lifecycle change and delivers most of the
"expand the sketch board" ask on its own. The structured version is a real
build — a second rendering system alongside §9's graph — and is only worth
it if the raster version turns out to not be enough. Ship the first as the
actual whiteboard tab; treat the second as a stretch goal that depends on
whether people actually want to move things around after drawing them,
which is not knowable in advance.

**Where it lives.** Library tab (§4) as its own item type is the better fit
than nesting it under Notes — a whiteboard that isn't 1:1 with a note has
nowhere natural to sit in the Notes tab, and the Library tab is already
being built as the home for "everything that isn't a note."

---

## 5. Documents

Checked against the running app, not assumed:

- ~~**Outline / table of contents**, reading time~~ **done.** `renderDocOutline`
  builds a TOC from `#`–`####`, correctly ignoring a `#` inside a code fence,
  hides itself under two headings, and each entry puts the caret on that line.
  `renderDocStats` shows words and reading time at 220 wpm. Verified in a
  browser: a 461-word document reads "461 words · 2 min read" with four
  correctly-nested headings.
- ~~**Expand a note into a document**~~ **done** — leaves the note untouched
  and says so.
- **Word-count goal** — the one unbuilt part of the outline item. A target you
  set, with progress against it.
- **AI chat bar inside the document** — partly there. `doc-ai-panel` already
  edits a selection or the whole document and shows the result as a proposal.
  What's missing is the *conversational* shape: ask a question about the
  document without it proposing an edit.
- **A real document browser** — the sidebar list is not a gallery
- ~~**Attach documents to notes**~~ **done.** Asked for directly: "a way to
  link documents to new notes I create in the capture tab… the documents and
  notes sections and features need to be more integrated together." The
  capture box has an *Add to document* picker, so the connection is made while
  it is obvious rather than after the note is buried in a list; the note card
  carries a 📄 chip that opens the document; the document lists the notes it
  draws on, each with a detach button. `document_links` is its own table
  because the relationship is many-to-many and neither side owns the other —
  detaching removes a connection, never a note, and binning a note takes it
  out of the document's list on its own.

  Asked again straight afterwards — *"also what about adding a document to a
  note??"* — because a capture-time picker only helps the notes you have not
  written yet, and the ones that turn out to belong to a document are usually
  the old ones. **📄 Add to a document** in a note's ⋯ menu picks from the
  documents that note is not already on, and the × on its 📄 chip detaches it
  from the note's side. Both directions now use the same two routes, so there
  is one behaviour to reason about rather than two.
- **Document history** — notes have `EntryRevision`; documents have no
  equivalent table, and the AI edit overwrites on accept

### Asked for this session, not yet built

A round of use produced four requests about documents at once, and they are
one direction rather than four features: *"I want the documents to be more
like using Obsidian or Notion."* Ordered by how much each one gets in the way.

- **A mini AI chat bar in the document editor.** Asked for directly: *"a mini
  chat bar on the documents page to request the ai to do stuff, like write
  something, edit something specific (the whole document or current selection
  etc)."* This is the biggest of the four and the closest to already existing:
  `doc-ai-panel` edits a selection or the whole document and shows the result
  as a proposal, so the *editing* half is built. What is missing is the
  **conversational** half — a bar you type an instruction into, in place, that
  can either answer about the document or propose an edit to it, and that
  keeps the thread of what you have already asked. Two decisions to make
  before building it: whether it shares `/chat`'s conversation store (a
  document's thread is about the document, so probably its own), and whether
  an instruction with a selection active always means "edit this" (it should
  — ambiguity there is what makes an AI editor feel unpredictable).
- **Upload a file as a document, attached to a note.** Asked as *"I want to be
  able to upload a document to a note"*. Distinct from `📎 Attach a file`,
  which stores a blob against the note and gives you back a download: this
  would take a `.md` or `.txt`, make it a real Document with its text in the
  editor, and link it to the note in one step. The pieces exist — `/files`
  ingests uploads, `/documents` creates, `document_links` joins — so this is
  mostly a route that does the three together, plus deciding what to do with a
  `.docx` or a PDF (probably: refuse politely rather than half-convert).
- **Obsidian/Notion editing — asked for again, more emphatically: "have all
  the features as well."** Worth being explicit about what "all the
  features" would actually include, since Obsidian and Notion aren't the
  same product and "all of both" isn't a coherent target. The editor is a
  `<textarea>` with a preview beside it today. What people mean by this
  request, roughly in order of how much each is missed:
  - `[[wiki links]]` between documents (notes already have them — the
    parser is in `renderNoteText`)
  - a `/` command menu at the cursor
  - drag-and-drop images that land as markdown
  - backlinks ("what links here")
  - live-preview editing where the markup renders in place instead of in a
    second pane — the one that would change the feel and also the one that
    means giving up the textarea; worth doing deliberately, and last
  - **Sub-pages.** Notion's documents nest into a tree; MemoryMap's are
    flat. Worth deciding this one early rather than late, since it's a data
    model question (`documents` would need a `parent_id`) that every other
    item in this list is easier to build on top of than to retrofit under.
  - **Transclusion — embedding, not just linking.** `document_links` already
    connects a note to a document, and `[[wiki links]]` connect document to
    document, but both are references you click through, not content
    rendered inline. Obsidian's `![[note]]` embeds the note's actual text
    where you put the embed. This is the feature that would make the
    notes/documents "two halves of a whole" framing actually true visually,
    not just at the data layer — worth building once backlinks exist, since
    an embed is close to a backlink that renders instead of just linking.
  - **A full properties/database system is worth ruling out explicitly,
    not leaving ambiguous.** Notion's defining feature is that a page can
    carry structured properties and be queried like a database row — that's
    a different kind of thing from a markdown document with metadata, and
    building it properly would mean a second data model living alongside
    notes' tags/categories rather than reusing them. Worth deciding this is
    out of scope on purpose (tags and categories already give notes
    lightweight structure; documents don't obviously need a second, heavier
    system) rather than something quietly missing from an "all the
    features" list that was never going to include it.
- **Documents on the graph and the timeline.** Asked as *"docs should also
  probably show on the graph and timeline"*. Both views are built around
  `Entry` and would need a second node/point kind. The design question is not
  technical: a document is not a note, and drawing it as one would say the
  wrong thing. On the graph it wants its own shape and to sit where its notes
  are (it is a hub over them, which is exactly what `document_links` records);
  on the timeline it wants to be a band or a marker rather than a dot, because
  a document is written over weeks and a note happens at a moment.

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

## 7. Desktop packaging

**Why.** Asked for: "run as a professional product".

**Recommendation: not Electron.** The app is Python + static files; Electron
would bundle a second runtime (~150 MB) and a Node toolchain to deliver what
`--desktop` already does in-process via pywebview, and Python would still need
shipping alongside it. Alternatives weighed: Tauri and Wails (Rust/Go shells,
tiny binaries, but neither solves shipping Python), Neutralino (immature), plain
PWA (already supported via `manifest.webmanifest` + `sw.js`).

**Plan.** Harden the existing pywebview mode — single instance, native menus,
tray, graceful port fallback when 8000 is taken, first-run flow — then
PyInstaller one-file builds for Windows/macOS/Linux. pywebview's webview is also
where the genuine embedded browser from §3 becomes possible.

**Portable vs installed, worth deciding rather than defaulting into one.**
PyInstaller can build either — a one-file executable that runs from a USB
stick with `data/` beside it, or a real OS-integrated install (Start Menu
entry, `/Applications`, an uninstaller). They want different things from
`MEMORYMAP_DATA_DIR`: portable mode wants data relative to the executable by
default (so the whole thing is one folder you can move); an installed app
wants a proper per-user data directory (`%APPDATA%`, `~/Library/Application
Support`, `~/.local/share`) so it survives a reinstall. Worth picking the
default deliberately per platform rather than the build script producing
whichever one falls out of the PyInstaller config first.

**Cross-platform status, since it was asked about directly** ("make
memorymap-ai cross-platform and compatible with linux and if possible mac as
well"): closer to done than the ask implies. `start.sh` already exists
alongside `start.bat`, and the app itself is Python + SQLite + a browser, none
of which is Windows-specific. What genuinely is Windows-specific: the two
`searxng_manager` fixes in §8b (`os.kill(pid, 0)` terminating instead of
checking, `rmtree` failing on git's read-only objects) are guarded to only
run their Windows branch, so they should be harmless elsewhere, but that is
still unverified on real macOS/Linux hardware rather than reasoned from the
code — the honest status is "should work," not "confirmed." The PyInstaller
builds above are the part with no cross-platform equivalent yet at all.

---

## 8. Open bug list

- ~~**Renaming the project folder broke the launcher**~~ **fixed.** Reported
  with a screenshot after renaming `MemoryMap-AI-v0` to `MemoryMap-AI`:
  `No module named memorymap`, straight after `[2/4] Dependencies already up
  to date - skipping install.` Those two lines are the whole bug. `pip install
  -e .` writes an **absolute** path into the venv, so the rename left it
  resolving to a folder that no longer exists; the skip marker stores
  `requirements.txt`'s timestamp (`.bat`) or checksum (`.sh`), which a rename
  does not change, so the one thing that would have relinked it was skipped.
  The marker was answering the wrong question — "have requirements changed?"
  rather than "can this venv import the app?" — and those come apart exactly
  when the folder moves. Both launchers now ask the venv directly before
  trusting the marker, which costs one interpreter start and also catches a
  moved folder and a half-deleted venv. Reproduced by renaming a real venv'd
  checkout and confirmed fixed against it.
- ~~**Picking a theme did nothing about half the time**~~ **fixed.**
  Appearance has three layers — defaults, the chosen theme, your manual
  tweaks — and `appearancePref` reads them in that order, manual first. That
  is right for a tweak made *after* choosing a theme and wrong for every theme
  chosen afterwards: one earlier change to the palette or the mode sat on top
  of each new theme and silently cancelled that part of it, and with a few
  stored a theme could change nothing visible at all. Picking a theme now
  clears the manual keys *that theme has an opinion about* — so Lagoon drops a
  stored palette and mode but leaves a font size it says nothing about — and
  clears the custom accent with the palette, since an accent picked against
  one palette has no meaning against another.
- ~~**Lagoon and Shallows needed refining**~~ **done.** Shallows was asked for
  as "a teal light one" and was drawn mostly indigo, so its ground and its
  accent pulled against each other; the page is aqua now and the indigo
  survives as the cooler of the two blobs. Lagoon's `--inner` was 5% white,
  which made every inset panel identical to the card it sat in, and `--muted`
  was low enough to grey out secondary text; both lifted, and the page
  gradient runs greener at the bottom so the teal accent reads as lit from
  inside the water rather than printed on it.
- ~~**Background tasks showed nothing while SearXNG started**~~ **fixed.**
  Reported twice — "I still don't think the bg tasks is working". The list was
  right about installs and wrong about the case the user was actually
  watching: a *start* is not an install, it runs in the request thread, and it
  waits up to `START_TIMEOUT` (90s) for the service to answer. That is the
  longest silence in the app from the outside and it was the one thing not on
  the screen built to explain silences. `searxng_manager.starting()` now
  reports it, with the seconds waited against the timeout as a progress bar.
- ~~**The AI emblem was cramped, and only on two tabs**~~ **fixed.** It was
  put inside the Notes and Chat sidebar headings, wedged between a title and a
  button — too big for the row, differently placed on each, and five more tabs
  would have meant five more of those decisions. It has one home now, in the
  header beside the AI status dot, which is what it is about: on screen for
  every tab, one size to get right, and the first thing to drop when the
  header runs out of room on a narrow window.
- ~~**The dashboard's widgets are missing until you switch tabs**~~ **fixed.**
  Reported as *"initially when I load up the app the dashboard widgets are
  missing until I refresh or change tabs and go back on it again"*. `startApp`
  fired `loadEntries` and `refreshActiveTab` as two independent steps, so on a
  cold load the dashboard rendered against an `allEntries` that was still `[]`
  and drew its brand-new-notebook card — which is correct for an empty
  notebook and wrong for one that has simply not arrived yet. The tab render
  now waits for the entries, and the empty-state card is gated on a flag that
  says the fetch has actually happened, because "empty" and "not loaded" are
  indistinguishable from a length alone.


Every reported bug in this section has been reproduced in Chromium and fixed.
What follows is kept as a record of *what each one actually was*, because in
most cases the stated symptom pointed at the wrong component and the wasted
effort is the expensive part to repeat.

**Fixed, with the real cause**

| Reported as | What it actually was |
| --- | --- |
| Numbered lists always render `1.` | A blank line between items closed the `<ol>`, and models write `1.\n\n2.` far more often than tightly |
| Assistant content too far right | The rail padded each step's own box instead of the container |
| Thinking arrow sits on the timeline circles | `list-style-position: outside` draws the marker *outside* the summary's box — exactly where the rail's gutter is, so no gutter width could clear it. Native marker removed and redrawn inside |
| Thinking boxes vanish on reload | Not reproducible. Verified in a browser: live, three-round, and after a real reload the steps round-trip intact. The report predates the step-timeline work that fixed it |
| A long URL escapes the chat bubble | `overflow-wrap: anywhere` on bubble content |
| Documents show "Invalid Date" | A regression from the UTC fix: `relativeTime` appended `"Z"` to a timestamp already carrying `+00:00`. Two definitions existed, one shadowing the other |
| Dashboard "Search notes" goes nowhere | Focused a box inside the hidden `browse` sub-tab |
| Capture textbox short until clicked | `autoGrow` measured `scrollHeight` while the section was `display: none` |
| "Ask about this" wrecks the layout | CSS automatic minimum sizing: a `1fr` grid track and a `min-width: auto` flex item both refuse to shrink below their content, so one wide code block widened the column, the page and every paragraph beside it. 3425px wide at a 1280px viewport |
| Desktop menu-bar buttons overlap the title | The tab strip was pinned at a rigid 579px because a base rule 70 lines below the media query redeclared `flex` at equal specificity. Nothing could yield, so the header overflowed itself by up to 215px |
| Can't switch search engines | The status poll reset the radios as soon as focus moved, because picking one saves nothing until "Apply & re-index" |
| Colour/font controls stuck under a theme | Two causes. `[data-palette]` rules sit below `[data-accent]` rules at equal specificity, so a palette always won and the swatches were dead under every theme; and `applyAppearance` re-applied every setting *except* the accent, so clearing one left it showing |
| Sketches don't open from the graph | A sketch is a note plus a PNG, and the graph popup showed the caption but never the image — the drawing was unreachable from the map |
| Web search returns nothing | Not a parser bug. Three different failures (no egress, a rate-limit challenge page, a genuine empty result) all surfaced as an empty list. Now logged and named separately |

**Found while fixing the above, also fixed**

- Editing an answer reverted when the chat was reopened — the edit updated
  `content`, but replay renders `steps`, which kept the model's original wording.
- Uploading a file 500'd if the uploads folder had gone missing, losing a
  sketch's drawing while keeping its caption.
- `APPEARANCE_DEFAULTS` declared `bg-motion` twice with different values.
- "New note" on the dashboard did nothing unless the Notes tab happened to be
  left on the capture section — the same hidden-sub-tab trap, on the most-used
  button there. Ten feature-catalog entries had it too.
- `.entry-content` used `pre-wrap`, which keeps typed line breaks but cannot
  break inside a word, so one pasted URL widened the note list and the page.
- `pytest` didn't work in a fresh clone without an editable install.

**From the ideas parking lot, never formally triaged.** Reported informally
(`IDEAS.md`) rather than reproduced in a browser yet — worth the same
ten-second grep-first check as everything else in this document before
anyone spends a session on them:

- **A note filed under the wrong category by a wide margin** — "I wrote 'ai
  is cool' as a note and it was filed under Sketches". Sketches is a specific
  category the janitor's cheap embedding-centroid path can match against
  (§4 of `ARCHITECTURE.md`), so this smells like a centroid gone stale or too
  few notes in the right category to out-vote it, rather than a one-off.
  Worth checking what "Sketches" actually contains before assuming the AI is
  at fault.
- **Settings can't be reached on a narrow/mobile viewport.** Distinct from
  the general accessibility pass in §19 — this is specifically Settings, and
  worth checking against the header's documented degrade order (§10 of
  `ARCHITECTURE.md`) before assuming it needs new CSS rather than a missing
  breakpoint.
- **Some dashboard widgets don't render markdown.** The note list's
  `renderInlineMarkdown` (§22) was deliberately not extended everywhere; the
  dashboard's own small note previews strip markers instead
  (`notePreviewText`). A widget showing raw `**bold**` is likely one that
  calls neither — worth an inventory of which dashboard widgets go through
  which path.
- **The "notebook constellation" widget doesn't redraw on a theme change.**
  The graph's galaxy/starfield styling (§9) points at this widget as proof
  the aesthetic works; §10 of `ARCHITECTURE.md` already documents the general
  version of this bug for the emblem (p5 measures a canvas as zero inside a
  hidden tab, and has to redraw on theme change since the accent moves) —
  very likely the same cause in a second place.
- **Gravity and Spread only affect the force-directed layout.** Real:
  `nodeSize`/panning-based tree and radial-ring layouts (§9) don't run a
  physics simulation, so these two controls have nothing to act on outside
  the default layout. Not obviously a bug — worth deciding whether they
  should grey out under tree/radial, or gain layout-specific meaning (row
  spacing, ring gap) instead of silently doing nothing.

**Still open here**

- **Improve the extracted page's visual rendering.** Not a bug — the reader now
  carries heading levels, so it can be laid out as a real document (typographic
  scale, measure capped around 70ch, blockquotes, lists, code). Grouped with
  §13.

**The lesson worth keeping.** Four of these were "this control does nothing",
and in three of the four the control was working perfectly — the write landed
and was then overridden by CSS source order, a status poll, or a hidden
section. Reading the handler will not show you that. Reproduce in a browser and
measure the *computed* result; it is faster than reading, not slower. The
recurring causes are now written up as invariants in `docs/ARCHITECTURE.md` §10.

---

## 8b. Web search — two Windows bugs found, and what is left

~~**Port 8888 being taken was a dead end.**~~ **fixed.** Asked directly: *"is
there a way to change the port if it is full?? maybe like 8080 or smth"*. The
port report said "close whatever has it", which assumes the user can — often
they cannot, and the thing holding it may be something they need. `start()`
now settles a port first: the wanted one, else 8080/8081/8890/8899, with
`MEMORYMAP_SEARXNG_PORT` to name one. A SearXNG *already answering* on the
wanted port beats a free one, because that is ours from a previous run and
moving would start a second copy beside it.

**Seen in a log this session, not yet fixed:** a start attempt and an install
can be in flight at the same time. The user's log shows `SearXNG didn't answer
within 90s. Its own output was: (nothing — it wrote no output at all)` at
6:54:06, with the install still unpacking at 6:53:12 and writing the `pwd`
shim at 6:54:11 — so the start was waiting 90 seconds for an interpreter that
was still being built. Nothing is broken by this beyond the wasted wait and a
misleading error, but the error is the one the user sees, and it accuses the
wrong thing.

**The direction that is already guarded is the wrong one.** `_start_from_source`
refuses when `_install_state["running"]` is set, so *starting during an
install* is handled. What happened here is the reverse: a start was already
waiting when a reinstall began, and nothing cancels a wait in flight — it sits
out its full `START_TIMEOUT` against a virtualenv being rebuilt underneath it,
then blames SearXNG for writing no output. Fixing it properly means making
`_wait_until_ready` interruptible: give it a generation counter or an
`threading.Event` that `install_source` sets, so the waiter notices the ground
has moved and returns "the install restarted" instead of "it never answered".
Not a quick change, which is why it is here rather than done.

The diagnosis from §8 shipped and is working: the app now says "DuckDuckGo is
rate-limiting this app rather than returning results" instead of showing an
empty panel, which is confirmed in use. That was the whole point — the failure
is now legible.

**The fix is SearXNG, and this session found five reasons it couldn't work.**
None was in the log, which is why reading the log first did not find them —
three of the five happen before SearXNG writes a line, and the other two are
Windows-only.

**Read this first: SearXNG now installs, starts, answers its JSON API, and
passes `websearch.probe_searxng`, verified in this sandbox.** Everything below
was reproduced rather than deduced. The one part still unverified is the
download itself, because the sandbox proxy blocks the archive URL.

**3. `git clone` can never work on Windows.** Reported mid-session:
*"Couldn't download SearXNG: fatal: unable to checkout working tree"*. Four
files in the repository have a colon in the name —
`utils/templates/etc/nginx/default.apps-available/searxng.conf:socket` and
three like it. A colon separates a drive letter, so Windows refuses the name,
git fetches every object and then dies at the checkout, **leaving the
half-written folder that produced bug 2 above**. Nothing about it is
transient; retrying could never help. `pip install <tarball-url>` — the
"install without git" path — unpacks the same files and fails the same way, so
both paths were broken there. Fixed by downloading the archive and unpacking
it ourselves, skipping members this filesystem can't hold (they are nginx and
uwsgi deployment templates) and any that would escape the folder. git is no
longer used at all.

**4. `pip install -e .` can never work, on any OS.** SearXNG's `setup.py`
imports `searx` for its version, `searx/__init__.py` imports `msgspec`, and
pip builds in an isolated environment that has neither —
`ModuleNotFoundError: No module named 'msgspec'`, before setup.py can declare
a requirement. `requirements.txt` now goes in first and the package is built
with `--no-build-isolation`, which is exactly what SearXNG's own `manage`
script does.

**5. The `tracker_url_remover` plugin kills the process at boot.** It
downloads a rules file from `rules1.clearurls.xyz` during `init` and does not
catch a failure, so SearXNG exits before binding the port on any machine that
is offline, proxied or slow. Confirmed here: with the plugin on, the process
died in init; with it off (in the generated `settings.yml`) it booted and
answered. MemoryMap strips tracking parameters itself, so nothing is lost.

**And the two Windows-only ones, from earlier in the session** — the same
mistake twice: a POSIX idiom that means something different on Windows.

**1. "SearXNG started but never answered" — we were killing it.** `_alive()`
asked `os.kill(pid, 0)`, the POSIX way to check a process exists without
touching it. On Windows every signal except `CTRL_C_EVENT`/`CTRL_BREAK_EVENT`
is handed to `TerminateProcess`, so that call *ended* the process (exit code
0) and then returned True. `status()` asks `_source_state()`, which asks
`_alive()`, and the settings screen polls `status()` every three seconds — so
a freshly started SearXNG was shot within seconds of starting, every time,
and the app reported that it started and never answered. That is exactly the
symptom this section was named after. `_alive` now uses
`OpenProcess`/`GetExitCodeProcess` on Windows; `_terminate` is the only thing
that signals.

**2. "does not appear to be a Python project" — reported directly:**

    Couldn't install SearXNG: ERROR: file:///C:/Projects/MemoryMap-AI-v0/
    data/searxng/src does not appear to be a Python project: neither
    'setup.py' nor 'pyproject.toml' found.

`install_source` skipped the download when `data/searxng/src` *existed* and
handed the folder to `pip install -e`. Reinstalling didn't help because
`uninstall_source` used `shutil.rmtree(..., ignore_errors=True)`, and git
marks `.git/objects` read-only, which Windows enforces — so the wipe deleted
the writable files, left the folder standing, and said it had removed it. The
next install then found the folder, skipped the clone, and reproduced the
error exactly. Fixed at all three points: `is_checkout()` asks what is *in*
the folder, `_remove_tree()` clears the read-only bit (and moves the tree
aside if it still can't delete it) and reports what survived, and the
installer verifies `import searx` in the new venv before calling it done.

~~**The two Windows-only fixes are not verified on Windows**~~ **confirmed —
see above.** The tests pin the logic (`tests/test_searxng_install.py`), and
the user has since confirmed SearXNG installs, stays up, and returns results
on the machine that hit both bugs originally.

**6. `import pwd` — SearXNG cannot be imported on Windows.** Reported with a
photo: the install finally *finished*, and the start died with
`ModuleNotFoundError: No module named 'pwd'` from `searx/valkeydb.py` line 22.
`pwd` is POSIX-only. It is the **only** POSIX-only import in the whole
package, and the only thing it is used for is naming the current user in one
error message when a Valkey DB connection fails — a branch that is
unreachable unless a Valkey URL is configured, which MemoryMap never does. A
`pwd` stand-in is written into SearXNG's own virtualenv where the platform
hasn't got one; patching SearXNG's source instead would mean matching text
upstream is free to change and re-applying it after every update.

The install's final check was also too shallow to have caught it: `import
searx` passed on Windows and the *start* then died on `searx.webapp`. It
checks `searx.webapp` now, with the same environment a start uses — verifying
against SearXNG's own defaults verifies something nobody runs, since it
refuses to start on its placeholder `secret_key`.

**Confirmed working.** SearXNG now returns real results on the user's own
machine — the thing this session couldn't test (the sandbox proxy blocks
every engine) is now verified where it matters. That also confirms the two
Windows-only fixes above (`_alive`, `is_checkout`/`_remove_tree`) actually
held on real Windows hardware, not just in the sandboxed logic tests. §8b's
open work is no longer "does this work at all" — it's UI polish and a
privacy pass, both moved to §13 so they live with the rest of web search's
design rather than the bug list.

Also present, from earlier sessions: a `↻ Reinstall` button (wipes the venv
and checkout, keeps `settings.yml` and its secret key) and a port line saying
whether 8888 is free, held by a working SearXNG, or held by something else.

The one thing already ruled out: the generated `settings.yml` *does* include
`- json` under `search.formats`, so the 403-from-a-missing-format theory is
not it.

Known from a user screenshot, now fixed: `_reason()` reported pip's parting
"[notice] To update, run: … --upgrade pip" as the cause of a failed install,
because it took the last line and that notice is always last. If an install
failure is being investigated, the message is trustworthy now; it was not
before.

**A deliberate security pass, rather than more one-off fixes.** Asked
broadly — "full security sweep and analysis… must be fully private, hack
proof, and secure… web browsing should be as private, secure, and
untrackable as possible" — which is this section's whole subject already,
just not gathered into one pass. What exists today: the CodeQL alert list is
closed (§ "Done in the most recent session"), the DNS-rebinding TOCTOU on
both the reader and the SearXNG search path is closed, redirects are
re-checked hop by hop rather than trusted, private notes are encrypted and
excluded from every AI tool, and CodeQL runs on every push plus weekly. What
a deliberate pass would add on top, parallel to §19's accessibility audit:

- A dependency-vulnerability sweep (`pip-audit` / `npm audit` equivalent for
  the vendored JS, since nothing currently checks either), and a fresh look
  at this section's own three easy-to-break rules (§8b's opening) to confirm
  nothing has quietly regressed since they were written down.
- ~~**Brute-force protection on the unlock gate.**~~ **already built** —
  `routes_auth._refuse_if_throttled`: one global bucket (not per-IP, which is
  exactly what a botnet has plenty of), five free tries, then an exponential
  wait to a five-minute ceiling, forgiven after 15 quiet minutes. A correct
  password inside the wait still waits. Pinned by a test now.
- ~~**A Content-Security-Policy header on the app's own pages**~~ **done, and
  tight: no `unsafe-inline`, no `unsafe-eval`, and no host named anywhere in
  the policy** — every source is `'self'` or a hash. The "no asset from a CDN"
  rule is what made that affordable, exactly as this item predicted. What it
  did not predict is that it would break something: custom CSS injected a
  `<style>` element, and a full green suite said nothing. See the note under
  the security tier.
- ~~**The KDF behind private notes, named explicitly.**~~ **confirmed, and
  better than this item would have accepted:** `core/crypto.py` uses scrypt at
  n=2^15, r=8, p=1 — memory-hard, so it resists GPU guessing in a way PBKDF2
  does not. ~100ms and ~32MB per unlock, deliberately.
- ~~**Cross-origin requests against the local API**~~ **done** — see §20,
  where the full reasoning lives.
- **Search-specific items** now live in §13, since SearXNG went from "being
  built" to "actually running" this pass.

---

## 9. The graph — make it a tool, and give it a look

**Why.** Asked repeatedly: "expand on the capabilities of the graph", "more
utility and ways to use and visualise my notes", "it's still kinda plain — it
needs more life and design style". `main` made it keyboard-operable; it is still
a plain force-directed blob that doesn't fill its own panel.

**Layouts — the shape the notes are arranged in.** Asked for directly: "can
you add different types of graph views… like tree graph diagrams and the
like". These are separate from *styling*: a layout decides where a note goes,
a style decides what it looks like once it is there. Layouts first, because a
force-directed blob is the thing that makes the graph hard to read, and no
amount of styling fixes it.

The notebook has three different structures in it, and each one wants a
different picture:

| Structure | Where it comes from | Layout that shows it |
| --- | --- | --- |
| Hierarchy | category → note, and `parent_id` threads | tree, radial tree, treemap, sunburst |
| Network | `entry_links` (wiki links, AI links) | force, arc diagram, adjacency matrix |
| Sequence | `created_at`, `entry_dates` (§10A) | timeline-graph, growth animation |

- ~~**Tree**~~ **built.** Root → category → note, with a note's replies nested
  under it, so a train of thought reads as one branch. This is the layout the
  request was about, and it is the one that suits a notebook with few links
  and many categories — which is most notebooks before the graph has been
  used much.
- ~~**Radial tree**~~ **built.** The same hierarchy wrapped into a circle:
  denser, and it makes the *shape* of a notebook obvious — a fat arc is a
  category you write in constantly.

  Both were first built by handing d3 the panel's dimensions as a bounding
  box, which is the wrong instruction: `d3.tree().size([...])` divides the
  height by the number of leaves, so a 29-note notebook got eighteen pixels a
  row and printed its labels on top of each other. Reported with a photo —
  *"the graph tree and radial are a bit hard to read and aren't neat"*. The
  fix is a set of rules about **what a label needs**, not about what the panel
  has: the tree uses `nodeSize` and pans when it is taller than the panel
  (zooming out only when the whole thing nearly fits, because a tree you
  scroll beats one you cannot read); the radial computes its rings from the
  note count, the category count and the panel, and rings **by depth** rather
  than by d3-cluster's height — cluster put a category containing a thread one
  ring closer in than its siblings, which is what made the circle look ragged.
  Three collisions only a browser can find were fixed on the way: a stylesheet
  rule beating the `text-anchor` presentation attribute so no side-label ever
  moved, a flipped left-half label whose offset sent it back across its own
  node, and a 55%-transparent label halo that let a thread edge show through
  the words it ran behind. All of it is asserted on measured geometry — the
  labels' real rotated corners, separated by a separating-axis test, because
  the axis-aligned box around diagonal text overlaps when the words do not.
- **Mind map from one note** — pick a note as the root and lay everything else
  out by hops along `entry_links`. Different from the tree above: the
  hierarchy there is filing, here it is connection.
- **Treemap / sunburst** — area as weight, so a category with 200 notes looks
  like one. Best for "where does my writing actually go?", and the only layout
  here that answers a question about proportion.
- **Arc diagram** — notes on one line, links as arcs above it. Ugly for
  browsing, excellent for spotting the one note everything connects to.
- **Adjacency matrix** — no crossing edges at all, so it stays readable when a
  force graph has turned into wool. Worth it only once there are hundreds of
  links.
- **Timeline-graph** — the graph laid out left-to-right by date, links as
  arcs. §10's Timeline tab does the axis; this would do the axis *and* the
  links, which is the one thing neither view has.
- **Subway map** — orthogonal edges, categories as lines. Beautiful and
  genuinely hard: it needs edge routing, which is real work rather than a
  layout call.

**Styling — the same layout, dressed differently.** These are skins over
whichever layout is picked, not layouts of their own:

- **Galaxy / starfield** — notes as stars sized by access count, links as
  faint filaments. The dashboard's "notebook constellation" widget already
  proves the aesthetic works.
- **Sea chart** — islands per category, notes as landmarks, links as shipping
  routes, unlinked notes adrift. Parchment palette pairs with it.
- Plain force-directed stays the default; everything else is a picker.

**Fit and framing.** It should size to its panel and re-fit on resize, with
zoom-to-fit, zoom controls, and a minimap for large notebooks.

**Utility it still lacks:**

- Filter by category, tag or date range; double-click to focus a neighbourhood
- **Paths between two notes** — the question a graph is uniquely good at
- Cluster detection, with "name this cluster" handed to the AI
- Orphans and hubs surfaced explicitly
- Create a link by dragging one node onto another
- Timeline scrub — play the notebook's growth
- PNG/SVG export of the current view
- A `related_notes(id, depth)` tool so the model can walk links, not just
  similarity

---

## 10. Timeline tab, and time-aware notes

**Why.** Asked for directly, and it is the most substantial new idea in the
backlog. Notes say "today", "yesterday", "last week", "two days ago" — phrasing
that is correct when written and misleading forever after. Today nothing records
what those phrases *resolved to*.

**Three parts. The first two are done — the third is the one asked for again,
more directly, and is not built yet:**

~~**A. Resolve relative time at capture.**~~ **done.** Every note's temporal
phrases are resolved when it is saved (and re-read when its text is edited)
and stored in `entry_dates` with the phrase beside the date — the resolution
is a rule, not a fact, and a reader can only disagree with it if both are
visible. `entry/timewords.py` is deterministic regexes and arithmetic, not a
model call: it runs on every save, including with Ollama off, and is
best-effort so it can never stop a note being saved. Private notes are
excluded, and marking a note private clears what was already stored — the
same reasoning as dropping its embedding.

Handled: today · tonight · this morning/afternoon/evening · tomorrow ·
yesterday · last night · the day before/after · this/last/next week, month,
year · "in N days/weeks/months" · "N days/weeks ago" · "last/next/this/on
<weekday>". Precision is kept, so "last week" shows as a week rather than
being flattened to a day. The weekday rule is written down in the module,
because both readings of "next Friday" exist and consistency is the most that
can be offered.

Shown as a chip on the note (`🕓 last week → week of Jul 20`, with the full
date on hover) rather than marked up inside the text: `renderNoteText`
already layers wiki links, inline markdown and filter highlighting through
each other, and a fourth pass over the same string is where that breaks. The
resolved dates also travel in `get_note`/`search_notes` results, so the model
can answer "what did I mean by *last week* in that note?".

**Still open from A:** tagging notes that contain relative time so they are
findable as a class, and nudging on stale ones ("this said 'tomorrow' three
weeks ago — did it happen?"). Both are queries over `entry_dates` now that
the data exists.

~~**B. A Timeline tab.**~~ **built, first version — and it is a grid, on
purpose, for what it's for.** A time axis across, one band per category or
tag down the side (or none), and a bucket size you pick — day, week, month,
year. Every note plots at what it is *about* where §10A resolved a date from
its text, and at when it was written otherwise; a note moved by what it says
is marked 🕓 and says so on hover, because a timeline that silently relocates
notes looks broken rather than clever. Clicking a note opens it.

Drawn as a CSS grid rather than SVG: every cell is a real element, so it
scrolls, tabs and reads aloud without any of that being hand-built. Bands are
capped at eight plus an "Everything else" lane — a chart with forty lanes is
not a chart.

**C. A branch/line view — asked for again, more directly, because B reads as
a calendar rather than a timeline.** "Make sure the timeline has the
additional aspect of like a line or branching line/tree-like graph view
because right now it is more like a calendar" — accurate, and not a defect in
B so much as B answering a different question well. A grid answers "what
happened around this date, across every category at once." A line answers
"what was the shape of this one thread over time" — and that's the thing a
grid genuinely cannot show: two notes three months apart in the same project
read as unrelated dots in a grid, and as one continuous line in a flow view.
They're both real questions; this is the second view, not a replacement for
the first.

**Shape.** A spine running through time (main axis, chronological, same
underlying `entry_dates` data as B) with **branches** peeling off it for
threads that run in parallel — a tag, a category, or a linked-note cluster
(§9 already computes these for the graph, so this reuses that grouping rather
than inventing a second one). A branch starts where its first note in the
thread sits on the spine, carries every note in that thread along its own
line rather than back on the shared axis, and either rejoins the spine (the
thread ended, nothing more tags into it) or runs off the visible edge (still
open). Visually closer to a git commit graph or a river/Sankey diagram than
to the force-directed graph in §9 — the *x*-axis is always time, never
force-simulated, which is what makes it still readable as a timeline and not
just the graph with a clock added.

**Why this can't reuse B's CSS grid.** A grid cell is discrete — a bucket, a
band, a note in it. A branch is a continuous path that has to curve away from
the spine and back, at an arbitrary vertical offset that depends on how many
other branches are active at that moment (two projects running at once need
two lanes; the spine has to reserve space before it knows how many). That's
an SVG-path layout problem — closer to what §9's graph already renders than
to a table — so this is new rendering work, not a CSS change to the existing
one. Reasonable to build as: **one shared time-scale function** (date →
x-position) used by both B and C, so the two views can be toggled without
recomputing anything, and C is additive to §10's existing data shape, not a
rework of it.

**What decides where a branch starts and ends** is the open design question,
more than the rendering: automatic (a branch appears the moment three-plus
notes share a tag within some window, ends after a gap with nothing added) is
closest to "do this for me," but will branch on things the user didn't mean
as a thread and miss things they did. Manual (pick a tag or cluster and
"make this a branch") is predictable but is another thing to maintain.
Worth prototyping automatic first, since §9's cluster detection already does
the hard part of "what goes together" — the only new question is *when* a
cluster starts and stops being active enough to draw as a branch.

**Data shape:** no new table — this reads `entry_dates` (§10A) and the
existing tag/cluster grouping (§9) the same way B does; the only new state is
per-view (grid vs branch), which is a preference, not a migration.

**Still open in B (the grid view):**

- **Events as bands.** The shape this slots into: one more `group` value, once
  there is an `events` table. Places and themes can be derived from what is
  already stored; events cannot.
- **Reminders and their completion** as points on the axis.
- **Zoom from days to years as a gesture**, rather than a bucket picker.

**Data shape:** a new `events` table (`title`, `at`, `precision`, `kind`,
`entry_id?`, `source`), plus `entry_dates` for resolved expressions. Both
additive.

---

## 11. Performance, accuracy and AI efficiency

### Headroom — evaluated, not adopted

Asked: *"is it worth trying to analyse and implement something like headroom
for token efficiency?"* ([headroomlabs-ai/headroom][hr] — Apache-2.0, 62k
stars, active). It compresses tool outputs, logs and RAG chunks before they
reach the model: 60–95% off JSON, 15–20% for coding agents, with benchmark
accuracy held. It is a good project. It is the wrong fit here, for three
reasons that are about **this** app rather than about it:

1. **There is no token bill.** Ollama runs on the user's own machine, so a
   token costs latency and context window, not money. Headroom's headline
   numbers are savings on a metered API.
2. **It would compete for the same CPU.** The compression path wants ONNX
   Runtime and a transformer of its own, running immediately before the local
   LLM on the same hardware. Saving 1–2k tokens of prefill by spending an
   inference pass is very likely net-negative on wall-clock for a 7B model on
   a laptop — and it needs AVX2, which is not a promise this app can make.
3. **The JSON it would compress is the JSON that cannot be compressed.**
   This one was worth measuring rather than assuming, and the measurement
   moved the answer. A representative agent prompt — ten retrieved notes, two
   turns of history, focused tools:

   | Part | Chars | Share |
   | --- | ---: | ---: |
   | System prompt (prose) | 2,521 | 34.4% |
   | History (prose) | 77 | 1.1% |
   | Notes + question (prose) | 1,381 | 18.9% |
   | **Tool schemas (JSON)** | **3,340** | **45.6%** |
   | Total | 7,319 | |

   So the prompt *is* nearly half JSON — more than expected. But that JSON is
   the **tool schemas**, and Headroom compresses tool *outputs*, logs, files
   and RAG chunks. A schema is a contract the runtime parses to constrain the
   model's tool calls; compress it and the calls stop being valid. It is the
   one JSON block in this prompt that has to go verbatim.

   What is genuinely in scope: the notes (18.9% — this is the RAG-chunk case
   Headroom is built for) and the tool results appended during a loop, which
   are already hand-shaped summaries (`_note_summary`: id, preview, category,
   tags, dates). At its own headline 60% on the addressable part, that is
   roughly 11% off the prompt — real, but not the 60–70% the numbers suggest
   at a glance, and not worth ONNX Runtime to get.

   **The 45.6% is still the thing to attack — just not with compression.**
   `focus_for` already took it from 10,215 to 3,340 characters. Getting it
   lower is more schema pruning: shorter descriptions, fewer tools per focus,
   dropping parameters with obvious defaults. That is the highest-leverage
   work left in this section and it costs nothing but care.

Set against a **hard** cost: ONNX Runtime plus a model download, in an app
whose whole proposition is offline, self-contained and light — one that
vendors d3 and p5 locally rather than take a CDN.

**What was worth taking from it, and cost nothing:**

- ~~**Prefix-cache alignment** (their CacheAligner)~~ **done, and it found a
  real bug.** The idea is to keep the front of the prompt byte-identical so
  the provider's KV cache survives. Checking ours against that: the system
  prompt carried `local.isoformat()` — *microseconds* — above the history and
  the notes. Every round of every turn differed from the last, so Ollama's
  prefix cache could never hold anything below that line, and each round of a
  tool loop re-read the entire prompt. Now to the minute, which is identical
  across the rounds of one loop and still correct for everything the app does
  with it ("remind me in 10 minutes" is not resolved to the second).
- ~~**Reversible compression** (their CCR — send a short form, let the model
  fetch the original on demand)~~ **done.** A note now goes into the prompt
  capped at `MAX_NOTE_CHARS` (900), cut with a marker naming the call that
  reads the rest: `… [cut — call get_note(7) to read it in full]`. Safe only
  because the model can undo it, which is the whole idea — and the tools guide
  already told it to call `get_note` before quoting. Most notes are a line or
  two and are untouched; ten notes of 4,000 characters used to be 40,000 and
  now fit the budget.
- **Verbosity steering.** Output tokens are half the latency and are not
  budgeted at all. A style hint already exists; a length hint does not.
  Asked for as a bigger idea — a **quick / normal / detailed** picker on chat
  and agent turns, where quick trims the length hint (and, on a model that
  supports it, disables its own "thinking") and detailed asks for the
  opposite, with the option to pin a specific model to each level rather
  than always using whichever is set in Settings → Models. That's a UI and a
  prompt change, not a new capability — the pieces (a style hint, a
  per-purpose model already existing for chat/embedding/utility) are already
  there; this is a preset over them.
- **Temperature and sampling parameters, not just length — asked for
  directly.** "Is it a good idea to change model temperature and other
  parameters, as well as the amount of thinking, based off the type of
  task?" Yes, and it's the same preset idea as the bullet above, widened:
  quick/factual work (recalling a note, answering "when did I write X")
  wants low temperature and a short or disabled thinking budget; open-ended
  work (drafting, brainstorming) wants both opened up. Ollama's
  `/api/chat` already accepts `temperature`, `top_p`, and — on models that
  support it — a `think` toggle or budget per request; none of this needs a
  new capability from the model side, only a place in the request that
  today always uses whatever the default is.
  - **Manual first, automatic second — same ordering logic as model
    routing below, and for the same reason.** A per-mode set of parameters
    the person picks (or accepts a sensible default for) is honest about
    being a preset. Auto-adjusting parameters *by task* needs the same
    "how hard is this turn" judgement call that model routing does, so it
    inherits the same risk of being wrong confidently rather than
    obviously.
  - **Auto-adjusting *by model*, though, is worth doing regardless of the
    task question, because it's not a guess.** Not every installed model
    supports a thinking toggle, and the ones that do vary in what "off"
    means for reasoning quality on a given task. `Settings → Models`
    already knows which model is loaded — extending that to record what
    the model actually supports (thinking toggle, its context length, a
    sane default temperature) means a quick-mode preset can *fail closed*
    gracefully on a model that doesn't support the setting instead of
    sending a parameter Ollama silently ignores or errors on, which is a
    real gap regardless of whether task-based auto-routing ever happens.
- **Dynamically switch models by task complexity.** A related but separate
  ask — "optional," and worth keeping optional: a short factual question
  routed to a small fast model and an agent job routed to a larger one,
  automatically. The honest version of this needs a cheap way to estimate
  "how hard is this turn" before picking a model, which is itself a model
  call or a heuristic that will be wrong sometimes — worth prototyping as a
  manual per-mode assignment (the bullet above) before attempting to guess.
- **A model comparison / test-run feature — asked for directly: "test and
  compare different models for use in the application so you can choose the
  best one."** This is the eval harness below, pointed at a different
  variable. The harness already needs a fixed set of representative prompts
  to catch regressions over *time*; running that same fixed set against
  every installed model in one pass, and showing the results side by side —
  tokens, latency, and (for the ones with a known-good answer, like "what
  did I write about X") whether it actually got it right — answers "which
  model" instead of "did this get worse." One dataset, two use cases: a
  scheduled or CI-triggered run watches for regressions on the model
  currently in use; a manually-triggered run compares candidates before
  switching. Worth building as one feature with two entry points rather
  than two separate ones, since duplicating the prompt set would mean they
  drift out of sync with each other.

**Before any more of this: measure.** §11a was done by counting characters of
tool schema, which is why it worked. "A 3-turn chat shows 8.7k tokens" is not
yet broken down into system / tools / history / notes / question, and until it
is, the next optimisation is a guess.

[hr]: https://github.com/headroomlabs-ai/headroom


**Why.** Asked: "make sure all the code, processes, and AI usage is fully
optimised and efficient", and "more ways to make the program and AI more
accurate, usable, capable, and faster".

**Measure first** — there is no profiling in the repo, so where a chat turn
spends its time is currently a guess.

- **Prompt reuse.** Every agent round resends the whole message list; Ollama's
  `keep_alive` and prompt-prefix reuse are never set.
- **Cap tool output.** Return previews by default, full text only on request.
- **Hybrid retrieval** (semantic + keyword, reciprocal-rank fusion) — a
  well-established accuracy win, and the keyword search already exists.
- **Re-ranking** with a small cross-encoder over the top-20, behind a setting.
- **Batch embeddings** — the backfill embeds one note at a time.
- **Warm the model** so the first chat doesn't pay the load cost.
- **Frontend**: `app.js` is ~12k lines parsed on every load, and
  `renderEntries` rebuilds the entire list on any change.
- **Context warning** as the window fills — the per-turn cost is already shown.
- **A per-chat token/context meter the user can actually see.** Asked twice,
  once directly ("a better way to track tokens and other things") and once
  from the outside review ("prompt inspector, token counts, latency
  breakdown"). §11a already measures this server-side (prompt composition is
  logged per round); what's missing is surfacing it in the Chat tab itself —
  a small "~1.4k tokens this turn, 3.1k fixed overhead" readout, not just a
  log line only visible in Settings → Logs.
- **An eval/benchmark harness tied to changes here.** Every optimisation in
  this section so far has been measured by hand, in one session, against
  whatever the person doing it happened to type. A small fixed set of
  representative prompts (a few notes, a few questions, a skill run) that CI
  or a pre-release check can run against a real Ollama model and report
  tokens/latency/answer-still-correct would catch a regression before a user
  does. The outside review's suggestion that actually survived — not because
  of any specific tool, but because "measure first" is already this
  section's own rule (§11a) and there's no repeatable way to do it yet. The
  same fixed prompt set is also what the model-comparison feature further
  down this section runs, against every installed model instead of just the
  one in use — one dataset, watching for regressions over time and
  differences across models with the same tool.
  - **Worth tracking retrieval quality specifically, not folding it into
    "answer-still-correct."** A wrong answer can come from the model
    reasoning badly over the right notes, or from search handing it the
    wrong notes to begin with — those are different bugs with different
    fixes, and a single pass/fail per prompt can't tell them apart. A known
    query with a known correct note (or set of notes) lets the harness
    check "did search find the right thing" separately from "did the model
    say the right thing," which is what actually lets a hybrid-search or
    re-ranking change (§11) be judged on its own rather than blamed on or
    credited to whatever model happened to be loaded.

**§11a — token usage in chats.** Asked directly: "is there a way to reduce
excessive token usage in the chats?" A three-turn conversation showed 8.7k
tokens. Where it goes, cheapest fix first:

- Retrieved notes are re-sent in full on every turn, including turns that are
  a follow-up to the previous answer and need no new retrieval at all.
- `MAX_CLIENT_HISTORY` turns of prior Q&A go up each time, whole.
- Tool results accumulate within a turn (already capped by
  `TOOL_RESULT_BUDGET_CHARS`, but the cap is generous at 24k characters).
- The system prompt is long and grew again this session; it is re-sent every
  round of every turn, which is where Ollama's prompt-prefix reuse and
  `keep_alive` would actually pay.

**Half of this has now been measured, and the answer was not where anyone was
looking.** The *fixed* overhead — system prompt plus every tool schema, sent
before a word of the question, the notes or the history, on each of up to
`MAX_ROUNDS` rounds — is ~12,400 characters, about **3,050 tokens**. Of that,
**9,957 characters (77%) is the tool schemas**, not the prose. Trimming the
guide was the smaller half by a wide margin.

`agent.PROMPT_BUDGET_CHARS` now caps it and `tests/test_prompt_budget.py`
fails the build if it drifts past, because this grows invisibly: every tool
added costs the same budget and nothing else in the suite would notice.

**Why it matters more than the arithmetic suggests.** Ollama defaults to a
4096-token window unless the model declares otherwise, and overflow is dropped
from the *front* — which is the system prompt. A 3B model (granite4.1:3b,
llama3.2:3b, qwen3.5:2b — the ones this is aimed at) that overflows therefore
stops knowing it has tools at all, and reports as **"the AI won't use
tools"**, which is the hardest possible symptom to trace back to a long
prompt. Settings → Tools is the user-facing escape hatch, and there is now a
test proving that switch reaches the wire rather than only the executor.

**The remaining win is offering fewer tools per turn, not trimming more
words.** 28 schemas go up every round whether the question is "how many notes
do I have" or "remind me to call mum". A relevance filter — or a small
always-on core plus an opt-in rest — is worth more than anything left in the
prose. Do it before §21 adds skill tools to the same budget.

Still unmeasured, and still worth measuring before cutting: which of the
*variable* costs above dominates a real 3-turn chat. Log the prompt-token
count per round. Summarising older history is the usual answer, but it costs a
model call, so it should be the last resort rather than the first.

---

## 12. Does the AI know it is an agent?

**Why.** Asked: "does it know it is an agent and can use tools and skills freely
and in multiple turns if necessary?" and later, "I need agents to use tools more
and better if they are required."

**Honest answer: partly.** `TOOLS_GUIDE` says tools exist and forbids claiming a
save that didn't happen. The loop runs to `MAX_ROUNDS = 6`. What it is *not*
told:

- That taking several rounds deliberately is expected — plan, act, check, answer
- That skills exist at all (the tools are there; the prompt never mentions them)
- What to do when a tool fails — the error is returned with no guidance, so
  small models give up or repeat the same call
- That a search snippet is rarely enough and `read_url` exists
- What the user can already see (the step timeline), so it stops re-narrating

**Done since.** `TOOLS_GUIDE` now says that taking several turns is expected
("look something up, read what you found, look up anything still missing, then
answer"), that a search result is a clipped sentence and `read_url` exists,
and that the user can already see the tool timeline so it should stop
narrating its process back to them.

Failed tool calls now carry a `what_to_do` field matched to the failure — a
missing id says to search rather than guess another, a disabled tool says to
stop calling it, bad arguments say to re-read the schema and retry once — and
an identical call that fails twice is told so explicitly. Previously a failure
was a bare `{"error": …}`, and small models either apologised and stopped or
looped on it until the round limit ran out.

**Still to add:** an explicit `plan` step rendered at the top of the timeline
(build it with §21, which needs the same structure); a "required tools" hint
for requests that clearly need one; and a nudge when the model answers a
notebook question without having searched.

**Note the ordering.** None of this fixes "the AI won't make me a skill" —
that fails because `save_skill` can only store a prompt string, so there is
nothing for a better-instructed model to call. §21 first.

---

## 13. Web search effectiveness

**Now that SearXNG actually works (§8b), what's left is refinement, not
bug-fixing** — asked for directly: "the whole search UI just needs
refinement, and make sure that the search methods are as secure and private
as possible." Split into the two things actually asked for.

**Quality and UX:**

- **Query expansion** — two or three phrasings, results fused
- **Read before answering** — tell the model a snippet is rarely enough
- **Cite sources** with the domains actually read
- **Per-turn result cache**
- ~~**SearXNG as the recommended default** once §2's install path
  works~~ — the install path works now (§8b); worth actually flipping the
  default and updating the README/onboarding copy that still frames it as an
  advanced option
- **Say which engine answered.** DuckDuckGo and SearXNG have different
  privacy properties (§ below) and the person chose one deliberately in
  Settings; the results panel itself doesn't currently say which one served
  a given search, so that choice is invisible at the point it matters
- **Result cards worth reading, not just clicking.** A title and a link today;
  a domain/favicon and a snippet with the matched terms highlighted would let
  someone judge relevance before opening the reader view, the same reasoning
  search engines converged on decades ago
- **Open a result straight into the reader** without a second round trip —
  ties to §3's Browse sub-tab, which is the natural home for this
- **Distinguish *why* zero results came back** in the UI itself, not just the
  log — rate-limited, engine down, genuinely nothing found are three
  different situations and currently look identical to the person searching
- **Deciding *when* to search, not just how well it searches once asked.**
  Asked for as "better agentic web search through chat" — read as being about
  judgement, not just result quality. Today `web_search` is one tool among 28
  the model can choose or not; nothing measures whether it reaches for it
  when a question is actually time-sensitive ("what's the latest version of
  X") versus when it should trust the notebook or say it doesn't know. That's
  a prompting and evaluation question more than a code one — a good
  candidate for the eval harness in §11 to actually track, rather than
  something to "fix" once.

**Privacy and security, specific to search** — extending §8b's general
security pass with what's particular to this feature. What's already true:
only the search words leave the machine, never notes; the request looks like
an ordinary browser rather than naming the app; no cookies survive between
searches; queries go by POST so they don't land in access logs; tracking
parameters are stripped from result URLs before they're ever shown; a
self-hosted SearXNG keeps the query on the user's own network entirely
rather than reaching a third party at all. Worth checking on top of that,
now that SearXNG is a real running thing rather than a plan:

- **SearXNG's own outbound behaviour.** A default SearXNG install can be
  configured to query dozens of upstream engines, including ones with their
  own tracking, and some engine plugins hit third-party autocomplete/suggestion
  endpoints unless turned off — the `tracker_url_remover` plugin was already
  found to break startup entirely (§8b, bug 5) and disabled; worth a pass
  over the *rest* of the generated `settings.yml` for anything else
  defaulting to "on" that shouldn't be, not just the one that crashed.
- **No client-side favicon/thumbnail fetching per result.** A common leak in
  search UIs: fetching each result's favicon from the result's own domain, at
  render time, tells that domain someone searched and got them as a result —
  before the person has chosen to visit anything. Worth confirming the result
  card ideas above don't introduce this by loading icons live rather than
  bundling a small generic set.
- ~~**SearXNG bound to localhost, not the LAN.**~~ **confirmed for the source
  path, and it was wrong for docker.** The instinct behind this item — don't
  assume it inherited the same default — was right, and the two paths had
  drifted apart. `_start_from_source` sets `SEARXNG_BIND_ADDRESS=127.0.0.1`
  and always did; `_start_docker` ran `-p 8888:8080`, which publishes on
  **every** interface. That is docker's default and not what the plain reading
  of the flag suggests, and it is worse than an ordinary open port because
  docker installs its own firewall rules — a host firewall set to refuse 8888
  never sees the packet. The exposure is not abstract: SearXNG has no auth in
  front of it, so anyone on the same network gets a free proxy to the internet
  *and* a log of everything the owner has searched for. Now
  `-p 127.0.0.1:8888:8080`. Publishing is fixed at container-create time, so a
  container an earlier version made is detected via `docker inspect` and
  recreated rather than started as-is; one that cannot be inspected is left
  alone rather than destroyed on a guess.
- **A visible statement of what's true**, not just true in the code. The
  Privacy and security section of the README already says most of this
  clearly; worth linking it from Settings → Web search directly, next to the
  engine picker, so the privacy properties are legible exactly where someone
  is deciding whether to turn search on — rather than something you have to
  already know to go and read.

---

## 14. More tools worth adding

`create_document` / `edit_document` (the AI can read documents but not write
them) · `related_notes(id, depth)` (§9) · `move_notes` (bulk re-file) ·
`merge_notes` · `export_notes` · `find_similar(note_id)` · `stats` ·
`add_event` / `list_events` (§10) · `set_preference` over a small allowlist so
"make your answers shorter" works · `unlink_notes` / `delete_reminder` (§21,
gives skill runs a real undo for those two change types) ·
~~`create_category` / `merge_categories` / `delete_category`~~ **done, plus
`rename_category`.** Asked for indirectly ("more tools for managing…
creating, editing, deleting, and applying categories"); the agent could file
a note into a category it had no way to create, which is the wrong half of
the job. They take **names, not ids** — the model has never seen an id — and
a miss lists what does exist, because "no category called Work" with nothing
after it invites another guess rather than a look.

Three decisions in there worth not re-litigating:

- **`merge_categories` is its own tool even though `rename_category` already
  merges** when the new name is taken. That is right for a rename and a
  terrible way to *ask* for a merge: the model would have to know a name was
  already in use to predict what its own call did.
- **A rename that merged offers no undo.** Once both sets of notes sit in one
  category nothing records which came from where, so an "undo" would move all
  of them back — inventing a history that never happened, which is worse than
  having none. `create_category` and a plain rename do offer one.
- **Lookup is exact-match first, then case-insensitive.** Purely
  case-insensitive resolved both "Work" and "work" to whichever row came back
  first, so `merge_categories(from="work", into="Work")` found the same
  category twice and refused itself — on precisely the duplicate the user was
  trying to clear up. Caught by a test, not by inspection.

> ~~**⚠ The prompt budget is now the binding constraint on this section.**
> There is room for roughly one more tool on this list, and then there is
> none.~~ **Lifted — the constraint was an assumption, not a fact.**
>
> Adding these four did break `tests/test_prompt_budget.py`, exactly as that
> test exists to do, and the first draft went past the 4096-token *window* as
> well. But asked directly — *"if adding more tools is an issue, can we change
> or improve how tools are used so that doesn't become an issue?"* — the honest
> answer was that 4096 is **Ollama's fallback when a model declares nothing**,
> not a property of any model anyone actually runs. A current 7B declares 32k
> or 128k, and rationing it against 4096 withheld tools for nothing.
>
> So the fixed budget is gone. `tools.within_budget` fits the schemas to the
> window the model *reports* (`ollama_client.usable_context`, via `/api/show`),
> spends at most a quarter of it on schemas, drops the least relevant tools
> when they do not fit, and logs what it held back — so "the AI didn't use the
> tool I expected" is distinguishable from the model choosing not to. Core
> tools go first: a model that cannot search or read a note cannot answer
> anything.
>
> | Model window | Tools sent |
> | --- | --- |
> | 2,048 | 4 (core only) |
> | 4,096 | 9 |
> | 8,192 | 19 |
> | 16,384+ | all of them |
>
> **What this means for the rest of this section: add the tools.** The cost of
> one more is no longer "does it fit in a constant" but "what gets sent
> first", which is a per-turn question the app now answers by itself. The
> remaining lever, if a 4096-class model ever needs more room, is
> `focus_for`'s cues rather than the registry's size.

---

## 15. Appearance: more of everything

Asked for: "more options for the appearances — fonts, colours, sizing, themes,
palettes."

- **Fonts**: beyond system/serif/mono — a curated set including a dyslexia-
  friendly face, plus per-surface choice (UI vs note body vs code)
- **Sizing**: independent UI scale and reading size; line-height and measure
  (line width) controls, which matter more for long notes than font size
- **Colours**: per-surface accents, a custom palette builder (pick a base,
  derive the set), and import/export of a palette as JSON
- **More themes and palettes**, and a "surprise me" that generates a coherent
  one
- **Save a custom combination as your own theme**, not just a custom palette.
  Asked as "allow for saving of custom appearances and themes" — the palette
  builder above already covers colour; a theme is colour *plus* light/dark,
  font, density, radius and glass (see "Themes vs palettes?" in the closing
  Q&A), so saving one as a named preset means capturing all of
  `appearancePref`, not just the swatches.
- **Live preview** while hovering a theme, before committing
- ~~Fix the reported bug where individual controls resist change under a
  theme~~ done (§8): a palette always beat an accent on CSS source order, and
  clearing an accent never un-applied it

---

## 16. Sweeping UI quality-of-life

- **A status bar along the bottom** — from IDEAS.md, and the only item there
  with no home anywhere else in this document. What the AI is doing, what
  background jobs are running, which backend answered, and a way into the
  command palette, in one strip that is always visible. Most of the *data*
  already exists and is scattered: the AI dot is in the header, background jobs
  are behind Settings → Tasks, the backend is behind Settings → Models. The
  work is a place to put them, not new plumbing.
- **Sorting and grouping saved chats** — also from IDEAS.md and also homeless
  until now. Conversations sort by recency and nothing else; there is no "by
  length", "by which model answered", no folders, no grouping by topic. The
  data to sort by is already stored per turn (the model, the token cost, the
  timestamps), so this is a list-rendering job. The IDEAS note suggests an
  agent tool and a skill for it too, which would fall out of §14's shape once
  the sort exists.
- **Undo toasts** for anything soft-deleted, instead of confirm dialogs
- **Optimistic UI** — a saved note appears instantly and reconciles
- **Consistent empty states** and loading skeletons
- **Keyboard**: `/` focuses search, `g`+letter jumps tabs, Escape closes every
  overlay
- **Bulk selection** in the note list
- **"What changed" after an AI action** — chips say what ran, not what it did
- **Confirm on close** with unsaved text
- **Relative timestamps** everywhere, absolute on hover
- ~~**Dashboard**: audit every quick-access button actually lands where it
  says~~ done (§8) — every quick link now checked from all three Notes
  sub-tabs. Still worth doing: **add the ones that are missing**
- **Collapsible sidebars.** Asked for directly. The Notes, Chat and Documents
  sidebars are fixed-width; a narrow window (or someone who just wants the
  reading room back) has no way to fold them, distinct from the mobile
  breakpoint that already hides them entirely.
- **A status bar pinned to the bottom.** Asked for as "various statuses and
  quick access to the command palette". The header already carries the AI
  status dot and background-task summary (§1); this would be a persistent
  strip rather than something you open Settings to check, with the command
  palette's `Ctrl/Cmd-K` hint living there too. Overlaps enough with the
  header that it's worth deciding which one owns "what is the app doing right
  now" before building both.
- **Keyboard-only navigation, confirmed end to end rather than assumed.**
  §19 already covers focus traps and screen-reader gaps; this is narrower
  and more basic — can someone move through the note list, open a note, edit
  its tags, and file a reminder without a mouse touching anything? The
  bullet above already has a few keys bound (`/`, `g`+letter, Escape); the
  gap is whether the note list itself supports arrow-key movement and Enter
  to open, which is the one interaction pattern used constantly enough that
  its absence would be felt every session, not just noticed in an audit.
- **A global quick-capture hotkey in desktop mode.** Not asked for directly,
  but the app's own pitch — "just capture, a local AI files it" — implies
  capture should be as close to zero-friction as opening the app currently
  isn't. `--desktop` (§7) already owns a native window; a system-wide
  hotkey that pops a capture box without switching to the app at all (the
  way Apple Notes' quick note or Notion's quick capture work) would make the
  core loop genuinely faster than opening a tab, typing, and filing —
  rather than just as fast. Browser-tab mode can't do this (no OS-level
  hotkey access from a page), so it's specifically a `--desktop` win, and
  worth scoping alongside the rest of §7's packaging work rather than
  separately.

---

## 17. Use cases the app can't serve yet

- **Meeting notes** — record/transcribe into a note (Whisper is already a
  dependency), extract action items into reminders. Highest-value single
  addition.
- **Reading and research** — the Browse section (§3) plus highlights saved as
  notes back-linked to their source
- **Journalling** — a daily-note pattern; the pieces exist, nothing ties them
- **Task management** — reminders are not tasks (no sub-tasks, projects, or
  "someday"). Commit to it or stay deliberately out.
- **Study / revision** — spaced repetition; access-count and embeddings are
  already stored
- **Sharing one note or document** — no export-one-thing path today
- **A second device** — single-user by design; sync is a much larger decision
  and should be stated as out of scope rather than left implied. Asked
  concretely as "a way to run the app on a mobile device like my iPhone",
  which is a smaller ask than sync: the frontend is already a PWA with a
  mobile pass (Wave F), so a phone on the same network *could* just point a
  browser at it — except the server binds to `localhost` on purpose (§1 of
  `ARCHITECTURE.md`), which is exactly what stops that. Opening it to the LAN
  is a real security decision (anyone on the network reaches an unlocked API
  surface until the password gate, not just the person at the keyboard), not
  a config flag to flip quietly — worth stating explicitly as "possible, not
  yet safe to default to" rather than leaving it unaddressed.
  - **If sync is ever actually pursued**, the shape worth reaching for is
    the one Gemini's (grounded) suggestion named: local-network only —
    mDNS discovery plus a direct connection between two instances on the
    same network, never a public relay — which keeps the "nothing leaves
    the machine unless asked" principle intact in spirit (nothing leaves
    *the network*) rather than quietly becoming a cloud feature. Recording
    the shape without changing the decision above: sync is still a much
    bigger undertaking than the mobile-access question alone, and worth
    staying out of scope until that's a deliberate yes.

---

## 18. Agent quality

The registry is now 28 tools and reaches the whole notebook, documents and chat
history. What's still weak:

- No plan/progress for a multi-step job — the step timeline shows what happened,
  not what remains
- ~~No way to stop an agent turn mid-way and keep what it already did~~ **done**
  — `#chat-stop` aborts the stream, and a partial answer is kept, given its
  action buttons and persisted like any other turn. A turn stopped before it
  wrote anything is left silent deliberately: the user asked for that.
- A tool that fails is reported, but the model isn't told how to recover
- `_CLAIM_PATTERN` catches "I saved it" when no write tool ran — worth extending
  to other claim types
- **The agent only lives in the Chat tab.** Asked for as "allow the agent to
  be accessed from anywhere in the program" — every other tab already has the
  pieces this would reuse (the confirm-before-destructive pattern from design
  principle 6, the plan/step/result UI from §21), so a floating entry point
  that opens the same agent against "whatever I'm looking at right now" is
  more a routing change than a new agent. Before/after comparison on an edit
  already exists in one place — a skill run's changes list shows **View** and
  **Undo** per row (§21) — the ask was really for that pattern everywhere an
  edit happens, not a new mechanism.
- **The agent controlling the screen itself** — "allow the agent to control
  your screen within the application to navigate and make changes… with the
  user able to cancel it at any time". A different and much bigger thing than
  the tool-calling loop that exists today: it means the agent driving the
  frontend the way the Playwright driver in §10 of `ARCHITECTURE.md` drives
  it for testing, not just calling an API. Flagging it rather than scoping
  it — it would need its own cancellation and audit story on top of
  everything §21 already built for tool calls, and it's worth deciding
  whether the tool registry can get there first before reaching for UI
  automation.

---

## 19. Accessibility audit

Deserves one deliberate pass rather than more ad-hoc fixes:

- Focus traps in overlays are inconsistent (some cycle, some don't)
- Colour contrast unverified against WCAG AA for the *new* palettes and themes,
  particularly the glass surfaces
- Screen-reader pass; several dynamic regions announce nothing
- Audit remaining meaningful animations for `prefers-reduced-motion` fallbacks
- Settings screens on a narrow/mobile viewport specifically (§8's
  ideas-parking-lot bug) — worth folding into this pass rather than fixing in
  isolation, since it's likely the same class of breakpoint gap as the rest
  of this list

---

## 20. Backend

- **Async httpx client** — touches the streaming path, which is what makes chat
  feel responsive, so a subtle regression wouldn't show up in tests. Do it with
  §6.
- **Alembic migrations** — the additive auto-migrator cannot rename or drop, and
  won't survive a real schema change
- ~~**Session TTL** — tokens live in memory and never expire~~ **done.** Two
  clocks doing different jobs: idle (12h — you walked away, and the notebook
  locks itself the way a phone does) and absolute (7d — the ceiling a token
  leaked from a proxy log or a synced browser profile eventually hits).
  Expiry closes the vault as well, since an expiry that left the data key in
  memory would be a lock on one door only. The brute-force item it was worth
  pairing with turned out to be built already.
- ~~**Cross-origin requests against the local API — worth checking directly,
  not assuming.**~~ **checked, and it was open. Now closed** by
  `core/security.py:OriginCheckMiddleware`; the reasoning below is why, and
  is worth keeping. Two things the check turned up that the item did not
  anticipate: the session is a *header*, not a cookie, so `SameSite` was never
  the lever here — and the most exposed moment is *before* a password exists,
  when the unlock gate is deliberately open and a drive-by `POST /auth/setup`
  could have claimed the notebook outright. This is the specific way
  "single-user, local-only" apps
  have actually been attacked before, Ollama included: the server isn't
  reachable from the internet, but a malicious page open in *any other
  browser tab* can still have the browser send a request to
  `http://localhost:8000` on the person's behalf, because the browser
  enforces the target's CORS policy, not the attacker's. If `allow_origins`
  is permissive (or if the API trusts a session cookie without checking
  where the request actually came from), a page with nothing to do with
  MemoryMap could read or write notes just by being open in a tab. The fix
  is standard and cheap: check the `Origin`/`Referer` header server-side
  (not just an open CORS policy), and if the session is a cookie, set it
  `SameSite=Strict`. Worth confirming this is already the case before
  treating it as done — it's exactly the kind of thing that's invisible
  until someone goes looking, and the cost of being wrong is every route
  behind the unlock gate.
- ~~**Is SQLite in WAL mode?**~~ **yes, and it already was** —
  `core/database.py` sets it on every connect, with `busy_timeout=5000` and
  `synchronous=NORMAL` beside it. Pinned by a test now. The reasoning below
  is still the reason it must stay. Default (rollback-journal) SQLite locks the
  whole file for the duration of a write, which matters here specifically
  because background AI work (the janitor filing a note, an embedding
  re-index) can be writing at the same moment the person is just reading
  their own notebook. WAL mode lets readers proceed during a writer and is
  usually the right default for exactly this "one process, mixed
  read/write" shape — worth confirming `core/database.py` sets
  `PRAGMA journal_mode=WAL` rather than leaving SQLite's default.
- **What blocks the request thread.** A re-index on switching embedding
  models, a SearXNG install, a daily backup — if any of these run
  synchronously on the same thread that serves requests, the whole
  single-user app freezes for their duration rather than just slowing
  down. Worth an inventory of which long-running operations already run in
  a background thread (§25's health-check screen would be a natural place
  to surface "an indexing job is running" if one is) versus which quietly
  block.
- **Singletons and worker count are coupled, and that coupling isn't written
  down anywhere.** `core/config`, the database connection, the in-memory log
  buffer (§1) and the SearXNG process handle are all singletons per
  `ARCHITECTURE.md` — correct and simple for a single process. If the app is
  ever launched with more than one worker (`uvicorn --workers 2`, or a
  well-meaning perf tweak by someone unfamiliar with the codebase), every one
  of those becomes silently per-worker instead of shared — the log console
  would show a fraction of what actually happened, and two workers could
  each think they own the SearXNG subprocess. Cheap to prevent: either
  enforce single-worker at startup (refuse `--workers > 1` with a clear
  message) or write the constraint down where someone deciding to scale it
  would actually see it.
- **No enforced page size on list endpoints, as far as this document
  establishes.** A notebook that's grown for years, all returned from
  `search_notes` or the note list in one response, is a real failure mode
  for a "just works" app that's supposed to degrade gracefully rather than
  time out. Worth confirming every list-shaped route has a cap and a
  cursor/offset, not just the ones that happened to need one during testing
  on a small notebook.
- **What happens when Ollama hangs, rather than errors.** The app already
  handles Ollama being *off* gracefully (design principle 2) — a request
  that never comes back is a different failure, and a more likely one on
  the hardware this app actually targets: a model loading for the first
  time, or a machine too small for the model it's asked to run, can leave a
  request pending indefinitely rather than failing fast. Worth a timeout
  with a clear message ("still waiting on Ollama — this can take a minute
  the first time a model loads" past some threshold, then a real failure
  past a longer one) rather than a spinner with no ceiling.
- **Crash-safe recovery for a re-index or a model download interrupted
  mid-way.** If the app is closed, or the machine loses power, while an
  embedding re-index or a model pull is running, does it resume cleanly or
  leave a half-written state that surfaces as a confusing error next
  launch? Worth checking directly — the health-check screen in §25 is the
  natural place to both detect this ("an interrupted re-index was found —
  resume or restart it") and report it, rather than a repair action with
  nothing that would ever notice the problem needed fixing.

---

## 21. Skills — rebuilt; what is left

**Why.** Reported directly: "the skill system also needs a remake. The way
skills are used currently, and what the skills are at the moment, are
incorrect and are closer to just presaved mini prompts. I keep on trying to
get the AI to make me some skills in the chat but it doesn't recognise that it
needs to use tools and how to properly utilise the workspace."

**That description was accurate**, and the shape has changed. A skill was
`{name, prompt}`; clicking one dropped its prompt into the chat box, and
`save_skill` stored a name and a string — so "make me a skill that files my
inbox notes" could only produce another sentence, because the storage had
nowhere to put the steps. Fixing the prompt alone would not have helped.

**What a skill is now** (`ai/skills.py`, one validator for every way in):

- **prompt** — what it should do. A skill with only this behaves exactly as it
  did before, which is why nothing was lost.
- **steps** — ordered instructions, numbered into the run instruction and
  drawn as a plan at the top of the step timeline before anything runs.
- **tools** — an explicit allowlist. Only those schemas go on the wire and
  anything outside the list is refused at execution, so it is a safety
  property and not just a prompt. It is also §11a: the full registry is 10,215
  characters of schema on *every round*; "🏷 Auto-tag my notes" ships 1,963.
- **inputs** — declared `{{placeholders}}`, asked for before the run. A
  placeholder with no input behind it is refused on save, in the editor and in
  `save_skill` alike, because the alternative is a model handed a literal
  `{{tag}}` inventing a value.

Two decisions worth keeping:

**The built-in skills moved out of `app.js`** and are served from
`GET /skills` with the user's own. The server could not previously resolve a
skill the user clicked, `list_skills` answered "you have none" while ten were
on screen, and every field added to a skill had to be added twice.

**The declared tools are named in the instruction text as well as narrowed on
the wire.** Not redundancy: the reported failure was a model that *had* tools
and did not know it was meant to act, and telling a 3B model "use `tag_note`"
is what makes it reach for one.

**And what running one now does** (`ai/skill_runner.py`):

- **One turn per step.** Not one request carrying a numbered list — that is a
  plan the model may ignore, and a 3B model given four instructions at once
  does the first and narrates the rest. The app knows which step is running,
  so the UI ticks them off as they finish.
- **A step that fails is named**, with the reason, and the run stops there
  instead of ploughing on. §21 asked for exactly this.
- **The run ends in what changed**, not prose claiming something happened:
  a list of every write, each with a **View** and — where an inverse exists —
  an **Undo**. The undo is a tool call captured *before* the write and run
  through `POST /chat/tools/execute`, the same endpoint the confirm button
  uses. It is stripped out of what the model sees, since every field left in
  a tool result is resent on every later round.
- **Every built-in is a real job**: steps, tools, and declared inputs asked
  for in one dialog before the run. "Draft an email" asks who and what
  instead of spending a chat round on it.

**Still to do:**

- **Re-running a past run.** A skill is repeatable; a *run* is not yet
  something you can replay over a different set of notes.
- **Undo the whole run**, rather than one change at a time. Gemini's
  (grounded) suggestion was a heavier version of this worth naming
  explicitly: a local, silent version-control snapshot before a bulk
  operation runs, so a bad auto-tagging pass or a skill gone wrong can be
  rolled back wholesale rather than change by change. This sits between two
  things that already exist rather than needing to be built from nothing —
  daily backups (§ "Where your data lives" in the README) are too coarse
  (once a day, not once per run) and per-change Undo above is too fine (a
  20-note bulk tag is 20 things to individually undo); a snapshot taken
  specifically before a skill run or bulk tool call, kept for a short
  window, is the missing middle size. Worth building as "one more backup,
  triggered by an event instead of a timer" rather than actually reaching
  for git — the existing backup mechanism already solves the storage
  question, just not the timing.
- **Links and reminders have no inverse tool**, so those two changes are
  listed without an Undo. `unlink_notes` / `delete_reminder` would fix it, at
  the cost of two more schemas in the per-round budget (§11a) — worth doing
  when something else needs them too.

---

## 22. Reported in use, not yet done

Small, concrete, each seen in the running app:

- **Take me to the thing the agent just changed.** Asked for directly: *"if the
  agent performs a task like making a note, a button or link will appear to
  navigate to the new note or document or whatever was changed."*

  Today a tool run reports **what** it did — `📝 Created note #41` — and then
  leaves you to go and find #41 yourself, in another tab, by searching for text
  you already know the app knows the id of. The result row is one click away
  from being the shortest path to the thing and instead is a dead end.

  Most of the machinery is already there and this is mostly wiring:
  - Tool results already carry a `label`, and the undo work (§21) already
    proved the runner can put **buttons on a result row** — Undo is one, so a
    View beside it is the same shape.
  - `flashEntry(id)` already exists and does exactly the right thing: switch
    to Notes, scroll to the note, highlight it. The Rediscover widget uses it.
    Documents, reminders and categories need their equivalent.
  - What is missing is that handlers return prose, not a **target**. The fix
    is for each writing tool to include something like
    `{"target": {"kind": "note", "id": 41}}` in its result, and for the chat
    UI to render a View button whenever one is present. Doing it per-tool
    rather than by parsing the label keeps it honest — a label is for reading,
    and pulling an id back out of one is the kind of thing that works until
    someone rewords the sentence.

  Worth covering every kind the agent can create or change, not just notes:
  notes, documents, reminders, categories, tags, links. `create_note`,
  `edit_note`, `pin_note`, `tag_note`, `link_notes`, `set_reminder`,
  `create_category` and the rest all have an obvious destination.

  Two things to decide when it is built: whether a **destructive** result
  should offer to navigate to the recycle bin rather than a note that is no
  longer there, and whether a skill run's final "what changed" list should
  carry the same buttons (it should — that list is where a multi-step run's
  results actually get read).

- ~~**Magic Add schedules relative reminders a whole timezone offset late.**~~
  **fixed.** Reported: *"I just put a sentence in the magic add text box in
  reminders saying 'play league of legends in half an hour' and it scheduled
  it for 10am tomorrow??"* Two faults, and the phrase was the smaller one.
  The route built the user's clock as `utcnow() + offset` — aware, tagged UTC,
  actually holding local wall-clock — so the model was told an offset that was
  a fiction, answered with the same fiction, and was then trusted, skipping the
  correction. Error = exactly the user's UTC offset, so ten hours at UTC+10 and
  zero at UTC, which is why nothing caught it. See trap 5b. Separately, "in
  half an hour" was being handed to a 3B model to do arithmetic on; "in …"
  phrases are resolved by rule now, before the model, which also makes Magic
  Add work with Ollama off. Fifteen phrasings and five offsets are pinned in
  `tests/test_reminder_times.py`, and reverting either half turns eight of
  them red.

- **Background tasks vanish when they finish.** A completed or failed task
  disappears from Settings → Background tasks, so "did the reinstall work?"
  has no answer five minutes later. Keep finished tasks listed as
  ended/previous (with outcome and duration), persist them to the logs, and
  add a "clear history" button — probably one shared affordance for task
  history and logs both.
- **Chat / Agent / Browse selector and a browse UI.** Asked for directly
  ("can the chat interface be improved?? like the selector for agent mode
  and the web browser ui??") — this is §3, already designed there, unbuilt.
  Treat §3 as user-requested now, not speculative.
- **Agent continuation quality.** "The agent really struggles to continue a
  chat based off the previous message." Two things landed for it (2026-07:
  the most recent answer now reaches the next turn nearly whole —
  `librarian.history_messages` / LAST_ANSWER_CHARS — and every agent turn
  logs its prompt composition as memorymap.agent "prompt composition").
  Next step per §11a: read those logs from a real 3-turn chat, see whether
  notes or history dominates, and only then trim the variable half.
- **A skill that writes skills.** `save_skill` already takes steps and tool
  allowlists (§21), so a built-in "skill author" skill that interviews the
  user and calls save_skill is small and real. Not started.
- **Appearance settings page (§15).** Asked whether it can be improved;
  nobody has audited it against §15 yet. The chat empty-state emblem now
  animates (same motion switch as the ai-mark), which was the one concrete
  ask.
- **Bot-walled sites in the reader.** Cloudflare-fronted wikis and Reddit
  403/challenge the reader on TLS fingerprint alone; no header can fix
  that. The reader now names the wall instead of dumping a status
  (websearch.fetch_readable), but actually reading such sites would take
  browser impersonation — decide deliberately whether that dependency is
  ever worth it before anyone "fixes" this again.
- **Chat metadata disappears on a reload or app restart.** Distinct from the
  already-fixed "no metadata when tools were used" bug above (§8) — that was
  about the meta line never appearing; this is about it not surviving a
  reload. `conversations.steps` is what a reopened chat replays (§8 of
  `ARCHITECTURE.md`), so worth checking whether the metadata is part of
  `steps` at all or lives only in the live DOM.
- **README and GitHub Pages drift out of date.** Asked for directly: "update
  the readme and gh pages site to have up to date information". The README's
  own "What's in it" table still said six tabs after the Timeline tab (§10)
  shipped, and its "Next up" list still named the pre-rebuild skill system
  and pre-SearXNG web search as open work after both were done — exactly the
  kind of drift this document itself warns about in its opening note. Worth
  a pass through README, the GitHub Pages site (still on the "ideas, not
  yet" list in `CHANGELOG.md`) and this file together, since all three
  describe the same app and only this one gets updated every session.

- ~~**Notes don't render markdown.**~~ **done** — but read how, before
  extending it. `renderInlineMarkdown` handles bold, italic, `code` and
  strike *only*; `renderMarkdown`'s block elements (headings, tables, lists,
  fences) are deliberately not used in the list, because a list of
  fully-rendered notes gets very tall, which is the problem this section
  itself flagged. Code spans are matched first so `` `**x**` `` stays
  literal, underscore italics are excluded so `snake_case` survives, and
  `[[wiki links]]` and filter highlighting both still work *inside* emphasis.
  The dashboard's little note lists **strip** the markers instead
  (`notePreviewText`) — they clip at ~70 characters, and a clip landing
  mid-`<strong>` is worse than no emphasis. If someone wants block markdown,
  it belongs in an expanded/detail view, not the list.
- ~~**A hero header on the dashboard.**~~ **done** — emblem and wordmark
  inside the greeting card (not above it), hidden below 720px. The emblem is
  drawn in the dashboard's own render, not at startup: p5 measures a canvas
  as zero inside a `display: none` tab, and it has to be redrawn anyway when
  a theme change moves the accent.
- ~~**The chat box can't grow.**~~ **done.** It was an `<input type="text">`,
  which is one line forever: a three-sentence question scrolled sideways
  inside a box the width of a chat pane, so you could not read what you had
  written before sending it. It is a textarea that grows with the text and
  stops at `AUTOGROW_MAX_PX`, the same cap the capture box uses. Enter still
  sends; Shift+Enter is a newline, which a single-line input could not offer
  at all.
- ~~**A long note fills the list.**~~ **done.** One 800-word note pushed
  everything else off the screen, so the list stopped being a list. Anything
  past `LONG_NOTE_CHARS` is clamped with a fade and a "Show more", remembered
  per note for the session. The trigger is the character count, not a measured
  height: the notes list renders inside a `display: none` sub-tab, where every
  measurement is 0 — the trap that has caught four separate features here.
- ~~**SearXNG starts but never answers** — capture its output.~~ The capture
  was done first; the cause was found this session and it was us — the status
  poll's liveness check terminated the process on Windows. See §8b, and
  confirm with the user before calling it closed.

---

## 23. Organisation: manual grouping and multi-category notes

**Why.** Two related asks: "manually group notes together (separate from
the main sorting)" and "a note should be able to have multiple categories".
Both point at the same gap — filing today is exactly one category per note
(`entries.category_id`, a single foreign key, chosen by the janitor or the
user) plus tags for everything else multi-valued.

**Worth checking before building either.** Tags already are a multi-label,
user- or AI-applied system (`entries.tags`, a JSON column, with `tag:work` as
a search operator). A genuine "multiple categories" ask might already be
served by tagging more — worth finding out what the category is doing for
the person that a tag isn't (a category has an embedding centroid the
janitor matches against; a tag doesn't) before adding a join table.

**If it's still wanted after that:**

- **Multi-category** is a schema change — `entries.category_id` becomes a
  join table (`entry_categories`), and the janitor's cheap match (§4 of
  `ARCHITECTURE.md`) needs a rule for what happens when a note matches two
  centroids well. An additive migration, but touches the one part of the
  filing pipeline every other feature assumes is single-valued (the sidebar
  count, the graph's category layer in §9, "all notes in category X" queries).
- **Manual grouping**, kept genuinely separate from categories/tags, is
  smaller: a `collections` table and a join table, with no AI involvement at
  all — the person decides what belongs together, the app doesn't guess.
  Closer to a saved filter (§2) built by hand than to a new kind of filing.

---

## 24. Dashboard: more widgets, and layout depth

**Why.** Asked for directly: "more dashboard widgets! maybe some pie
graphs??" The dashboard already has a rearrangeable layout (Phase 5) and a
widget set (streak, at-a-glance counts, AI digest, activity heatmap,
on-this-day, focus timer) — this is more of the same shape, not a new system.

- **A category/tag breakdown** — the pie chart asked for, over
  `count_notes`-shaped data that already exists for the agent tool of the
  same name (§7 of `ARCHITECTURE.md`).
- **A writing-frequency chart** — bars over the activity heatmap's own data,
  a different read of the same numbers (streak vs volume).
- **A "stale notes" widget** — pairs with §10A's still-open idea of nudging on
  a note whose relative-time phrase has gone stale ("this said 'tomorrow'
  three weeks ago").
- **A "forgotten connections" widget — proactive rather than on-demand.**
  Gemini's actually-grounded suggestion (its second pass, after reading the
  real feature set): the graph already lets the AI suggest connections for
  a note *you're looking at* (§9); this is the same underlying similarity
  search run the other way — periodically, in the background, over notes
  nobody has looked at together, surfacing "these two from months apart
  might be related" on the dashboard rather than waiting to be asked.
  Nothing new to build on the retrieval side — §9's clustering and the
  embedding search both already exist; what's new is running it
  unprompted and having somewhere to show the result. Worth capping
  aggressively (one suggestion, not a feed) so it reads as a genuine find
  rather than the AI narrating its own similarity scores at you.
- Before adding more: audit which existing widgets render markdown and which
  don't (§8's ideas-parking-lot bug) so a new widget doesn't repeat the gap.

---

## 25. App control: tray, health checks, and dependency repair

**Why.** Several asks that are really one request in different words: "an
interface for managing the application… backend, cmd prompt console, quit,
update, install/fix/uninstall/reinstall packages and dependencies,
faster-whisper, and more… application health check, errors" — plus "improve
or expand on start.bat, don't make a cmd prompt window show but make it
accessible (maybe system tray)" and "a way to exit the app and close the
program quitting the backend". §7's desktop-packaging plan already lists
"single instance, native menus, tray" as part of hardening `--desktop`; this
section is the *content* of that tray/console, not the packaging shell
around it.

- **A visible health check.** Is the venv intact, does Ollama answer, is the
  embedding model loaded, is SearXNG (if installed) alive, how much disk is
  `data/` using. Most of these already have an answer somewhere in the app
  (`/models/status`, `searxng_manager.status()`); this is one screen that
  asks all of them and states plainly what's wrong rather than making the
  person go looking.
- **Repair actions from that screen**, not just a diagnosis: reinstall a
  dependency, re-pull a stuck model download, restart SearXNG. The SearXNG
  ↻ Reinstall button (§8) is the existing pattern to extend, not a new idea.
- **A real quit**, distinct from closing the browser tab — stopping the
  server process, not just the window. `--desktop` mode is the natural home
  for this since it already owns a process to exit; browser-tab mode can't
  kill its own server from the tab.
- **Update channels** (stable/beta/dev) — worth deferring until §7 actually
  ships an installer; there's nothing to channel yet while `git pull` plus
  the launcher's own dependency check is the update path.
- **A hidden console window on Windows, reachable rather than gone** — the
  ask was for the cmd window not to show at all *and* to still be reachable,
  which is two different things depending on whether the point is "get it out
  of my way" (a tray icon, minimised) or "I don't need to see it, ever, but
  Settings → Logs already covers that" (nothing to build). Worth confirming
  which was meant.

---

## 26. Data lifecycle: archive, a full wipe, and a real trust page

**Why.** Groups a few related asks that are all "what happens to old or
unwanted data" rather than day-to-day filing: "data and note compression",
plus the general expectation that a local-first app should let someone see
and delete everything it holds — the outside review's "local data map,
retention policy UI" specifically, which is real and not yet one coherent
thing anywhere in the app.

- **Archive** — already scoped in §4 item 2 (an `archived_at` column,
  additive migration). This section doesn't repeat it, just notes it's the
  prerequisite for the rest here.
- **A "delete everything" control.** Export (JSON/CSV/Markdown) already
  exists; there's no equivalent single action for the other direction — wipe
  the database, uploads and preferences and start over, distinct from
  `--reset-password` which only clears the credential. Worth being as
  explicit about what it destroys as `--reset-password` already is.
- **One actual "your data" page, not the pieces scattered.** The individual
  facts already exist — where the data lives and how big it is (README),
  what's in the audit log (Settings → Activity), what export and wipe do
  (above) — but there's nowhere that shows all of it as one trust surface.
  This is mostly assembly, not new data: a page that states plainly what's
  stored, where, for how long by default, and links straight to export and
  wipe from the same screen, rather than requiring someone to already know
  those live in three different places.
- **Opt-in retention rules — "forgetting," not just "archiving."** Archive
  above is a manual action; nothing today acts on a note's age on its own.
  A genuinely opt-in rule ("auto-archive notes untouched for a year") is a
  different, smaller thing than automatic deletion — reversible, off by
  default, and closer to the "stale notes" dashboard nudge (§24) than to a
  destructive background job. Worth being conservative here: the app's own
  design principle is that saving a note never fails and nothing is lost
  silently, so any auto-archival needs to be loud about what it did, not
  quiet.
- **Note compression** — asked for directly, and worth being honest about the
  payoff before building it. Notes are short text in SQLite; a notebook of a
  few thousand notes is low tens of megabytes uncompressed, and SQLite pages
  already compress well under most filesystems' own compression. This is
  likely solving a problem that doesn't exist yet at any realistic notebook
  size — worth measuring an actual `data/memorymap.db` before writing any
  compression code, not assuming it's needed.
- **A synthesised export, not just a raw one.** Export today (JSON/CSV/MD)
  is a dump of what's selected; Gemini's grounded suggestion was a step
  beyond that — pick a tag or a cluster and have the AI *compile* it into
  one coherent document (a project writeup, a portfolio piece, a README)
  rather than a folder of separate files the person still has to assemble
  by hand. Closer to a skill (§21) than to the export routes: it's a
  read-many, write-one operation with a prompt behind it, not a format
  conversion. Worth scoping as a skill once the skill system's tool
  allowlist (§21) is solid, rather than as a fourth export format.

---

## 27. Onboarding and first-run experience

**Why.** Asked for directly: "a guided setup on first install (like setting
your name, choosing a model if one isn't yet downloaded, a tour, making the
first note etc)". There already is an `onboarding-overlay` (referenced by
every Playwright driver script in this document as something to dismiss
before testing), so this is about what it covers, not whether it exists.

- **Confirm what the current onboarding actually walks through** before
  extending it — the driver script only knows it exists and blocks clicks
  until dismissed, not its content.
- **Fold in first-run diagnostics.** The outside review's strongest surviving
  suggestion: check Ollama is reachable, offer to pull a small model
  (`llama3.2`) if none is installed, and check `MEMORYMAP_DATA_DIR` is
  writable — before the person's first capture fails silently into
  `Uncategorised` and they assume the AI is broken rather than absent. The
  app already degrades gracefully when Ollama is off (design principle 2);
  onboarding is where to explain that's what's happening, once, rather than
  leaving the header's status dot to say it quietly forever after.
- **Name, first note, model choice** — as asked. The dashboard's name-nudge
  work ("empty by default and buried among a dozen fields") already solved
  the *name* half; onboarding doing it once at the start is the same fix
  moved earlier, not a new one.
- **Say what the graph and timeline actually are, once, early.** Not asked
  for directly, but the natural place to close the gap identified in §30's
  "product differentiation" note: a first-time user who captures a note and
  asks a question has seen the core loop, but nothing tells them the graph
  and the branch/line timeline are the "map" the app's own name refers to.
  A single onboarding step showing the graph forming around their first
  couple of notes would do more for the product's identity than any new
  feature — it's pointing at something that already exists, not building
  something new.
- **What stays local, and how much space it's using** — the disk-usage half
  of the outside review's onboarding suggestion. Cheap to add alongside the
  Ollama-reachability check above: the data folder's size and path, stated
  plainly, once.
- **Benchmark installed models on first run, to suggest a default rather
  than assuming one.** If more than one Ollama model is already installed
  when MemoryMap first runs, the model-comparison feature (§11) run once,
  quietly, against a couple of trivial prompts is a better way to suggest a
  default than always defaulting to whichever model §11's own
  recommendations table happens to name — worth wiring the two together
  once the comparison feature exists, rather than duplicating the "which
  model is fastest" logic.

---

## 28. In-app help: an AI that knows the docs

**Why.** Asked for directly: "the help area in settings has an ask-AI
feature where the AI has access to all the program documentation and can
help answer your questions."

**Shape.** Closer to the librarian (§4 of `ARCHITECTURE.md`) than to the
agent: grounded, read-only, answers from a fixed corpus rather than the
notebook. The corpus is already written — `README.md`, `ARCHITECTURE.md`,
this file, `CONTRIBUTING.md` — so this is a retrieval index over the repo's
own docs plus a chat surface in Settings → Help, not a new kind of AI
feature. Worth deciding whether it's a `search_docs` tool the *existing*
agent can call (cheaper, reuses everything) or a wholly separate grounded
chat (simpler to reason about, since it never needs to touch the notebook or
a destructive tool). The agent is already offered a narrowed tool set per
question via `tools.focus_for` (§7 of `ARCHITECTURE.md`) — a docs question is
exactly the kind of thing that focusing already exists to route.

---

## 29. Extensibility ideas, not yet scoped

Three asks that are genuinely bigger than anything else in this document and
don't have a shape yet — recorded so they aren't lost, not because any of
them are close to being built:

- **MCP tool support** — "an in-built browser with MCP tool abilities to
  accompany the web search". The Model Context Protocol would let MemoryMap
  either expose its own tools (§7 of `ARCHITECTURE.md`'s 28-tool registry) to
  other MCP clients, or consume external MCP servers as more tools for its
  own agent. Either direction is a real integration, not a checkbox — it
  would need its own trust model, since an external MCP server is exactly
  the kind of thing design principle 1 (offline-first, one narrow opt-in
  exception for web search) currently doesn't have a category for.
- **A VS Code extension.** No stated purpose yet beyond the idea itself —
  worth asking what it would let someone do that the app's own web UI, PWA
  and desktop window don't, before scoping anything.
- **A browser clipper.** Gemini's suggestion: a lightweight extension that
  saves a page's text, link and metadata straight from the browser, rather
  than routing through the in-app reader (§13). Distinct enough from the
  in-built browser idea above to list separately — a clipper is passive
  capture from wherever you're already browsing; the in-built browser is the
  app going out and reading on the agent's behalf. Both would land in the
  same place (a note, or the queue in §4a's file-upload work), but they're
  answering different questions about where "capture" happens, and building
  a browser extension is its own packaging problem on top of anything
  MemoryMap does today.

---

## 30. External review, filtered — what didn't make the cut

The outside reviews (Perplexity, Gemini) were thorough, and had two
different problems, worth telling apart rather than filing under one excuse:

**Perplexity was working from a stale bio** — a real but out-of-date
one-line GitHub profile description — and reasoned carefully from it,
hedging what it couldn't verify. Its mistakes are all one mistake, repeated:
assuming bundled models, which the items below correct.

**Gemini's first pass fabricated an entire architecture it never saw.**
Denied repo access the same way Perplexity was, it didn't hedge — it
described a specific "Ghost Sidebar" UI, a ChromaDB/LlamaIndex RAG pipeline,
and a "cinematic sci-fi… neural constellation" visual theme, none of which
exist anywhere in this codebase. That's not staleness, it's invention, and
none of it is corrected below because none of it needs correcting against
real code — it was never describing real code. **Gemini's *second* pass**,
after it read the live GitHub Pages landing page, is accurate — the
six-tab (now seven) description matches, and the suggestions built on it are
judged on their merits in §4, §17, §24, §26, §29 and §21, wherever they
landed. Recorded here rather than silently dropped, since a future review
hitting the same access wall may fabricate the same way again:

- **Hardware-aware model routing, bundled model packs, checksums, delta
  updates, rollback.** All of this assumes the app ships models. It doesn't —
  Ollama does that job, has its own model management, and MemoryMap already
  has a thin layer over it (`ai/model_manager.py`, Settings → Models: list,
  pull, switch chat/embedding/utility model). Nothing here to build.
- **Backend abstraction across llama.cpp / MLX / ONNX / Vulkan / CUDA.**
  Same premise. The real version of "don't lock into one backend" is already
  scoped, correctly, in §6 — an OpenAI-compatible provider interface over
  Ollama, LM Studio, llama.cpp's server, Jan and vLLM, at the HTTP layer
  MemoryMap actually talks to, not the inference layer it never touches.
- **Opt-in anonymous telemetry / crash reporting.** Weighed deliberately, not
  just discarded for being off-brief: design principle 1 is "no feature may
  depend on a cloud service," and the pitch to users is "no account, no
  cloud, no telemetry" — an *opt-in* toggle for it would be the app's first
  outbound channel besides search and page-reading, both of which exist
  because the person explicitly asked a question that needs the web. A crash
  is not that; the support-bundle idea in §1 gets most of the real value (a
  file the person can choose to attach to a bug report) without the app ever
  sending anything on its own.
- **A capability dashboard / resource meter** (RAM, VRAM, estimated speed
  before loading a model). Not rejected outright, just downgraded — Ollama
  already reports this (`ollama ps`, its own API), so this would be
  re-surfacing data from a tool that already surfaces it, for marginal gain
  over what Settings → Models already shows. Worth doing only if someone
  actually asks for it in-app rather than a review guessing it's missing.
- **A structured memory taxonomy** (episodic/semantic memory, write/read
  policy, conflict resolution, decay). This read the name "MemoryMap" as an
  AI-memory-system product rather than what it is — a personal notebook an
  AI files for you. The genuinely useful parts of that suggestion already
  have real homes under their real names: deduplication is the existing
  near-duplicate finder (`routes_duplicates`), decay/archival is §26,
  retrieval quality is hybrid search and re-ranking in §11. Nothing needs a
  new "memory" abstraction layered on top of notes, tags, links and
  embeddings that already do these jobs.
  - **The one part of that critique worth taking seriously on its own terms,
    separate from the misread:** *"the name MemoryMap suggests something
    more distinctive — persistent memory visualization, editable memory
    structures, temporal recall, spatial/graph-based reasoning over saved
    knowledge."* Read literally, past the "AI memory system" framing, that's
    not a missing feature — it's already what §9 and §10C are. A
    force-directed, editable map of every note and how they connect *is*
    "editable memory structures" and "spatial/graph-based reasoning"; the
    branch/line timeline resolving what a note is *about*, not just when it
    was written, *is* "temporal recall." The product already does the thing
    the name promises. What it doesn't do yet is *say so* — the README
    pitches "your thoughts, mapped by a local AI," which undersells it, and
    nothing in onboarding (§27) tells a first-time user "this graph and this
    timeline are the map the name refers to." The gap isn't technical; it's
    that the identity is built but not narrated. Worth treating as a
    positioning task for §27 and the README, not an engineering one — see
    the product-direction note near the top of this document.
- **Dynamic LoRA adapter loading (`unsloth`), a local vision/RAG pipeline
  built on LlamaIndex/ChromaDB, and anything else describing the fabricated
  first-pass architecture.** Not evaluated on the merits, because there's
  nothing to merge — MemoryMap doesn't fine-tune or swap adapters, and its
  retrieval stack is the app's own `search/` module (keyword + local
  embeddings), not a third-party RAG framework. Recorded so it's clear these
  were seen and set aside deliberately, not missed.
- **Encryption at rest for "the vector database and raw markdown files."**
  Already answered, just under different names: private notes are already
  encrypted individually, and full-database encryption (SQLCipher) is
  already explicitly deferred with reasoning in the README's own
  "Operational decisions" section — OS-level disk encryption covers the rest
  of the file today. Nothing in Gemini's version of this changes that
  reasoning.
- **A weekly "learning journal" background agent.** Already exists in a
  lighter form — the dashboard's AI digest (§24's opening list) is a
  weekly synthesis already. Worth checking whether the digest actually
  covers what was being asked for before treating this as a gap.
- **Graph-to-chat interactivity** (clicking a node populates a chat query
  about that note). Already built — the Graph tab already lets you ask for
  related notes from a selected node. Not a gap.

---

## 31. Claude's own read: what I'd flag

Asked for separately from the outside reviews — my own pass, based on
`ARCHITECTURE.md`, `CHANGELOG.md` and this document, not on the repo's
marketing copy. Same rule as everywhere else here: these are things worth
checking, not things confirmed broken.

- **`app.js` is one ~12k-line file with no module system.** §11 already
  flags this for load-time performance; the maintainability side is a
  separate cost. Seven tabs now, with §3, §4, §23 and §24 all adding more UI
  to the same file — the project's own stated pain point is that "every
  layout and wiring bug found so far passed a fully green run" because the
  backend's ~560 tests can't see the frontend. A single enormous file makes
  that worse, not just slower: there's no natural seam to test a piece of it
  in isolation. Splitting into native ES modules (`<script type="module">`,
  one file per tab plus shared utilities) costs nothing at runtime and no
  build step — it doesn't have to mean adopting a bundler to get "this
  function is 200 lines away from anything unrelated to it" back. **Do this
  after the smoke suite below exists, not before** — see the priority map's
  Tier 3 for the reasoning and the suggested sequencing against §3.
- **The frontend has no CI coverage at all, only manual Playwright driving.**
  The direct consequence of the point above, and worth stating plainly since
  the project's own docs already admit it. If a handful of the driver
  scripts referenced throughout this document (load each tab, dismiss
  onboarding, assert no console errors, assert a couple of known elements
  render) ran headless in CI alongside the existing lint-and-pytest job, that
  specific admitted gap — layout bugs that pass a green run — would shrink
  without needing GPU, models, or network, matching the existing CI's own
  constraints.
- **Export exists in three formats; there's no import.** JSON, CSV and
  Markdown export are all built (§ various), which answers "can I get my
  data out," but nothing answers "can I bring notes in from somewhere else."
  For a single-user local notebook, first-run cold start is a real adoption
  question — someone with two years of Apple Notes or Obsidian has no path
  in short of pasting things one at a time. Doesn't need to be universal; even
  a plain-Markdown-folder importer (the mirror of the Markdown export already
  built) would cover a lot of the realistic cases.
- **No bulk operations in the note list itself.** The agent has
  `move_notes` and `merge_notes` as tools (§14), but a person doing the same
  thing by hand has to ask the agent to do it rather than multi-select in
  the UI and act. Given how much of this document is about giving the agent
  UI-equivalent power (§18), it's worth also closing the gap the other
  direction — a checkbox-select mode in the note list with bulk
  tag/move/archive/delete, so the human path isn't strictly weaker than the
  agent path for the same operation.
- **Backups are taken; restoring one looks unexercised.** `data/backups/`
  exists per the architecture doc, but nothing in this document describes a
  tested restore flow — worth checking directly whether "restore from
  backup" is an actual feature (a button, a documented command) or just
  "the files are there, copy them back yourself." An untested restore path
  is, functionally, not a backup strategy yet; worth confirming rather than
  assuming, and worth a test that actually restores a backup and asserts the
  data matches, not just that a backup file gets written.
- **There's no non-AI fallback for filing quality, only for filing
  happening.** Design principle 2 already guarantees a note always saves —
  it lands in Uncategorised when Ollama is off. That's a fallback for
  *availability*, not for *quality*: someone running fully offline by choice
  gets every note in one bucket forever. A small set of deterministic,
  regex-style rules a user can define themselves (`contains a phone number →
  tag #contact`, `starts with "TODO" → category Tasks`) would extend the
  same "works when the AI doesn't" principle from "doesn't fail" to "doesn't
  fail *uselessly*" — and would double as building blocks the janitor could
  also consult, not just a consolation prize for offline use.
- **Two tabs open on the same note, and nothing arbitrates.** Nothing in
  `ARCHITECTURE.md` describes an edit-conflict story for a note or a document
  open in two tabs (or two windows — `--desktop` alongside a browser tab is
  the obvious way this happens) at once. Given single-user, this reads as
  unlikely rather than impossible, but "unlikely" plus "the loser's edits
  silently vanish" is exactly the kind of bug that's invisible until it costs
  someone a real note. Worth checking directly what happens today — a
  last-write-wins overwrite is at least honest if that's the answer; the
  actual risk is if the *client* believes its stale copy is still current and
  shows it as saved.
- **Filing confidence has no visible trend, only a per-note flag.** The
  janitor already flags low-confidence filings for review (design principle
  1) — what doesn't exist is whether that rate is going up or down over
  time, notebook to notebook or model to model. Since §11's eval harness is
  already being built to measure prompt/token regressions, filing accuracy
  over a small fixed set of known-good notes is a natural thing to fold into
  the same harness rather than build separately — one more signal, not one
  more system.

---

## 32. Product direction — asked for directly, kept short on purpose

This document is now 32 sections long, and that's worth naming as a risk in
its own right before adding a 33rd. Asked directly what I'd suggest for
where this goes — the short version, since the long version is everything
above.

**The differentiated thing is already built — lean into it rather than
diluting it.** §30's note stands: the graph plus the branch/line timeline
plus AI filing is a genuinely distinctive combination — editable, spatial,
temporal recall over a personal notebook, which is what the name promises
and few other tools do together. Chasing Notion/Obsidian feature parity in
§5 is worth doing where it's cheap (wiki-links, backlinks — already mostly
built), but a full properties/database system or true collaborative editing
would be competing with much larger teams on their own ground, for a feature
set §5 has already correctly ruled out once. The graph and timeline are
unclaimed ground; Notion-parity is not.

**Two things earn their place ahead of almost everything else in this
document, because they're not features — they're what makes every feature
after them safe to build:** the frontend module split and the Playwright
smoke suite (§31, sequenced there already). Every tab this document adds —
Library, a whiteboard, a branch timeline — is more surface area on a file
with no automated way to catch a regression. That trade gets worse the
longer it's deferred, not better.

**Tier 4 in the priority map is a "maybe never" list, not a backlog, and is
worth treating that way on purpose.** MCP, a VS Code extension, the agent
controlling the screen, LAN sync — none of these were asked for twice, all
of them are large, and a roadmap that treats every recorded idea as
eventually-do creates its own kind of debt: the next person (or the next
session) reading this document has to re-derive which parts are live
priorities and which are a parking lot, same problem `IDEAS.md` solved once
already. Worth periodically pruning ideas that don't get re-requested,
rather than letting the document only ever grow.

**Worth saying plainly, since this reads as a portfolio piece as much as a
personal tool:** a small number of things done with real depth — the core
capture-file-ask loop, a graph and timeline that actually deliver on the
name, a codebase someone else could read — demonstrates more than a long
feature list does. Everything in Tier 1–3 of the priority map earns its
place either by fixing something broken or by deepening the part of the
product that's already distinctive. Tier 4 is where to be honestly
skeptical of new ideas, including this document's own.

---

## 33. Odysseus, read and triaged

Asked for directly: *"analyse the odysseus repo, then determine what parts of
it are valuable and can be incorporated into memorymap-ai."* Done the way §11's
Headroom evaluation was done — look at what this app actually does first, then
judge the import against it, rather than porting whatever looks impressive.

**The repository**: `pewdiepie-archdaemon/odysseus`, a self-hosted AI workspace
— chat, agents, deep research, documents, email, calendar, a model "cookbook",
an image gallery. Roughly 60k lines of Python against MemoryMap's ~6k, and a
much wider product: MemoryMap is a notebook that happens to have an AI in it,
odysseus is an AI workspace that happens to store things.

---

### The constraint that governs everything below

**Odysseus is AGPL-3.0-or-later. MemoryMap is MIT. No code can be copied
across, in either direction.**

This is not a formality and it is not a thing to work around by paraphrasing a
file. Copying AGPL source into an MIT project relicenses the result and makes
the MIT badge on this repository a false statement about what someone may do
with it. **Everything in this section is a design lesson — an idea, a failure
mode, a shape — to be re-implemented independently.** That is what §6 did: the
provider work below was written from the four questions odysseus's code
*answers*, not from its code.

Two smaller things worth recording so nobody re-derives them:

- Odysseus's own dependency notes and `ACKNOWLEDGMENTS.md` are worth a look
  before adding any dependency it uses, because its licence tolerances are
  wider than this project's.
- The reverse direction is also closed. Nothing from MemoryMap should be
  offered upstream to odysseus as a patch without deciding, deliberately, to
  license that contribution under AGPL.

---

### Adopted this session

Each of these was re-implemented from scratch. What odysseus supplied was the
*idea* and, more valuably, the failure mode it had already hit.

- **A provider layer split by dialect, not by product (§6).** Odysseus's
  `_detect_provider` matches on hostname rather than substring, and falls back
  to "OpenAI-compatible" for everything unknown — which is right, because that
  is what the long tail implements. The lesson taken: build the *dialect*, and
  LM Studio, llama.cpp, Jan and vLLM all arrive together.

- **`loaded_context_length` beats `max_context_length`.** Odysseus reads both
  and prefers the loaded one. MemoryMap's plan for §6 named only the latter; a
  128k model *loaded* at 4k would have had its prompt budgeted at 128k and
  quietly lost its system prompt. This one measurement changed the design.

- **"Known" is a separate fact from "known value".** Odysseus carries a
  `known` flag beside every context length, because a fallback 128k is not
  proof a model holds 128k, and a budget scaled off an unproven number is worse
  than a conservative one. MemoryMap's version of this is `context_length`
  returning `None` and callers falling back rather than a made-up default
  propagating.

- **Multi-field catalog probing.** Every OpenAI-compatible server spells the
  window differently — `max_context_length`, `max_model_len`, `context_length`,
  nested `meta.n_ctx`. Odysseus reads all of them. So does
  `provider.context_from_catalog_entry` now.

- **Never auto-pick an embedding model as a chat model.** Odysseus's
  `_first_chat_model` exists because an OpenAI-style `/models` list routinely
  puts `text-embedding-ada-002` first and "use the first one" silently picks
  something that cannot hold a conversation. Re-implemented as
  `provider.first_chat_model`.

- **Model specs and context usage surfaced in the chat.** Odysseus reports
  `context_percent`, `usage_source: real|estimated`, and per-model metadata on
  every turn. This was the single most transferable *product* idea in the repo,
  and MemoryMap already had every piece needed for it. The message metadata
  line now says how full the window got, and marks an estimate as an estimate.

- **Read the capability list.** Odysseus tracks what each model supports rather
  than assuming. MemoryMap now reads Ollama's `capabilities` from `/api/show` —
  and it immediately caught a bug in the brand-new quick preset, which would
  have sent `think: false` to models that reject it.

- **SSRF hardening on a user-supplied backend URL.** Odysseus's `url_safety.py`
  makes exactly the right call for a local-first app: do *not* blanket-block
  private addresses, because pointing at a local server is the entire use case
  — block the link-local metadata range instead. Re-implemented as
  `security.check_backend_url`, plus a warning MemoryMap needs and odysseus
  does not, because MemoryMap promises the notes never leave the machine.

---

### Tools and skills: is odysseus leaner for small models? Measured, and no

Asked directly: *"does it handle tools and skills more efficiently such that
smaller models can better use them?"* The answer is the other way round, and
the numbers are worth keeping because they settle it.

| | MemoryMap | Odysseus |
| --- | ---: | ---: |
| Tools in the registry | 34 | 69 |
| Total description text | 3,849 chars | 17,792 chars |
| Mean per tool | 113 chars | 257 chars |
| Longest single tool | 306 chars | 1,205 chars |

Odysseus carries **twice the tools and 4.6× the description text**, and its
longest single tool description costs more than MemoryMap's ten shortest
combined. Its RAG tool retrieval is not a refinement that MemoryMap lacks — it
is the thing that makes a 17,792-character registry usable at all. Adopting the
retrieval without the bloat would be adopting a cure for an illness this app
does not have.

**Why their descriptions are that long is the transferable part.** They are not
padded; they are full of *disambiguation* — "do NOT use `app_api` for sessions",
"use `ui_control open_email_reply`, not `reply_to_email`", "this is for
EXISTING research; to START new research use `trigger_research`". That is the
tax on having 69 tools with overlapping responsibilities, paid on every request.
The lesson to keep is the inverse: **the cheapest way to keep the tool prompt
small is to not have two tools that a model could confuse.** Every time a new
tool here needs a sentence explaining when *not* to use it, that sentence is
evidence the boundary is in the wrong place.

**What MemoryMap already does that odysseus does not.** Worth recording so it
does not get "improved" away:

- `tools.within_budget` fits the schemas to the model's *reported* window and
  drops the least relevant tools, so a 4k model receives ~1,450 tokens of tool
  prompt and a 32k model receives all of it. Odysseus retrieves a fixed top-K
  regardless of the window.
- A skill run offers **only its declared tools** — 1,963 characters of schema
  instead of 10,215 — and the allowlist is enforced, not merely suggested.
- `tools.focus_for` is keyword-driven and therefore *readable and testable*.
  A cue that doesn't fire is a predictable failure; a retrieval that ranks
  wrong is not.

**Where MemoryMap's tools genuinely could improve**, in order:

1. **The agent cannot run a skill.** It can list skills and save them, but
   running one is user-initiated through the chip UI. So the model can see a
   job it is perfectly capable of doing and has no way to start it. This is
   the single biggest gap in the agentic story, and it is a small change: the
   skill runner already exists and already takes an allowlist.
2. ~~**A skill has no "when to use".**~~ **built.** `when_to_use` is a field on
   a skill now, the agent can set it through `save_skill`, and `list_skills`
   returns it. This was the prerequisite for item 1: giving the agent the
   ability to run a skill without a basis for choosing one would have been
   worse than not giving it at all.
3. ~~**`list_skills` returns no cost signal.**~~ **built.** It now reports
   `step_count` and `changes_notes`, so a skill that alters the notebook reads
   differently from one that only summarises it — and the note to the model
   says plainly that it cannot start a skill itself, since a model that
   believes it can will narrate having done so.

### Worth building, not this session

Ordered by value-per-effort. Each is a shape to re-implement, never a file to
copy.

1. ~~**An `ask_user` tool that ends the turn (§18, §14).**~~ **built.** Odysseus's agent can
   stop mid-task and ask a multiple-choice question; the user gets clickable
   buttons and their answer arrives as the next message. This is the honest
   answer to a class of failure MemoryMap currently handles by guessing: an
   ambiguous instruction ("file this properly") becomes a confident wrong
   action. It also matches an IDEAS.md line directly ("an agent ask for
   permission dialogue in the chat"). MemoryMap already has the hard half —
   the destructive-action confirm card is exactly this UI — so this is mostly
   a second event type and a tool.

2. **A live plan the agent ticks off (`update_plan`).** Odysseus's agent keeps
   a checklist the user can watch update. MemoryMap's *skill runner* already
   does this — ordered steps, one per turn, each ticked — but an ordinary agent
   turn does not. Generalising the skill runner's plan display to any
   multi-round turn is a smaller job than it sounds, and it is the fix for
   "long agent runs look like nothing is happening".

3. **Semantic tool retrieval, replacing keyword `focus_for` (§11a, §14).**
   Odysseus embeds its tool descriptions and retrieves the top-K per message,
   with a deliberately tiny always-available core. MemoryMap's `tools.focus_for`
   does the same job with keyword cues and already cut fixed overhead from
   ~3,157 to ~1,439 tokens. **The honest note: this is an upgrade, not a fix.**
   MemoryMap has the embedding service to do it, but the current version works
   and the failure mode of the semantic one is worse — a cue that doesn't fire
   is predictable, a retrieval that ranks wrong is not. Worth doing *with a
   measurement*, the way §11 did: if it doesn't beat keyword cues on a set of
   real questions, don't ship it.

4. **A richer skill format.** Odysseus's `SKILL.md` carries frontmatter
   (`description`, `version`, `tags`, `requires_toolsets`, `confidence`,
   `source: learned|taught|imported`) and body sections: **When to Use**,
   **Procedure**, **Pitfalls**, **Verification**. MemoryMap's skills (§21) have
   ordered steps and a tool allowlist — the execution half — but nothing that
   says *when* a skill applies or *how to tell it worked*. "When to Use" is the
   one to steal first: it is what makes a skill findable by the model instead
   of only by the user. Two more ideas from the same file: usage counts live in
   a **sidecar** so the skill itself doesn't churn on every run, and the skill
   *index* (name + description) is always loaded while the *body* is fetched on
   demand — progressive disclosure, which is the same reversible-compression
   idea §11 already adopted for notes.

5. **A completion verifier for effectful turns.** After a turn that used a
   writing tool, odysseus runs an independent check that the claimed work
   actually happened, capped at two rounds. MemoryMap has a cheaper version of
   this already — `_CLAIM_PATTERN` catches a model that says it saved something
   when no write tool ran — and the cheap version covers the common case. The
   upgrade is checking that what was written is what was *asked for*, not just
   that something was written. Worth it only once agent turns get longer.

6. **Better degraded-state reporting.** Odysseus's own roadmap asks for this
   about its own app, which is a useful signal: it is a real gap in a system
   with this many optional parts. MemoryMap is in better shape here (the status
   pill, the embedding error line, the support bundle), but the same principle
   applies to the new provider work — "reachable but wants a key" is a
   different state from "off", and only the endpoint knows it today.

---

### Looked at and deliberately not taken

Recording these so a future session doesn't re-evaluate them from scratch.

- **The Cookbook / `services/hwfit`.** Hardware-aware model recommendation:
  detect the GPU and RAM, score every candidate model on quantisation, VRAM
  fit, architecture age and expected tokens/second. It is the most impressive
  thing in the repository and it is a *product of its own* — thousands of lines
  plus a curated model database that has to be maintained or it rots. MemoryMap
  has `SUGGESTED_MODELS`, a hand-written list of five models that work well on
  a laptop, and for a notebook app that is the right size of answer. Revisit
  only if "which model should I run" becomes a question people actually ask
  here.

- **Sub-sessions, pipelines and agent-to-agent messaging** (`create_session`,
  `send_to_session`, `pipeline`). Real capability, and completely out of scope
  for a single-user notebook: MemoryMap deliberately refuses to run with more
  than one worker.

- **`bash` and `python` tools.** Odysseus gives its agent a shell. MemoryMap
  should not, and this is not a close call — the whole safety story here is
  that the agent's blast radius is the notebook, destructive actions are
  confirmed, and everything is undoable. A shell tool ends all three properties
  at once.

- **The email, calendar and CalDAV integrations.** A different product.

- **Their search ranking (`services/search/ranking.py`).** Genuinely nice —
  recency scoring, domain quality, per-term title/snippet weighting. Not taken
  because MemoryMap's web search is a *reader*, not a search engine: results go
  to the model with a reader view, and the ranking that matters is the one
  SearXNG already did. Reconsider if §13 ever grows a results page people
  browse themselves.

- **`teacher_escalation` — asking a bigger cloud model when a local one is
  stuck.** Interesting, and squarely against this app's promise. A local model
  failing is a thing to report, not a thing to silently escalate to somebody
  else's computer.

---

### What reading it changed about how I'd judge this app

Two things, both uncomfortable and both worth writing down.

**Odysseus's roadmap opens by admitting the CSS is a swamp and that it doesn't
know if its own integrations work.** That candour is the most useful thing in
the repository. This document has the same risk in a milder form and already
names it — the audit that found four of §2's six "quick wins" already built.
The rule that came out of that ("check the running app before building
anything here") is the one worth keeping, and it is worth applying to §33
itself before starting any item above.

**Almost everything odysseus does better, it does by being bigger.** The
context tracking, the tool retrieval, the skill format, the provider layer —
each is a more elaborate version of something MemoryMap already has, and in
every case the elaborate version costs code that has to keep working. The
items adopted above were the ones where the idea was small and the *failure
mode* was the valuable part: `loaded_context_length` beating
`max_context_length` is four lines and a comment, and it prevents a bug that
would have been very hard to find from the symptom. That is the shape of import
worth making, and it is the filter to apply to the "worth building" list too.

---

## 34. Where I'd take this — an outside read

Asked for directly. Written as a working opinion rather than a plan: these are
judgements, and the roadmap's own rule — *check the running app before building
anything here* — applies to this section more than to any other.

### The thing this app is actually good at, which is not what it says on the tin

The pitch is "a local AI files your notes". That is the *capture* story, and it
is solved. What has quietly become the more valuable half is **retrieval you
can check**: an answer arrives beside the notes it came from, every tool result
says where it came from, the graph says *how* two notes connect, and a turn now
reports how full the model's window got and whether the token counts were
measured or guessed.

Almost nothing else in this space does that. Hosted assistants can't (the notes
aren't theirs to show), and most local ones don't bother. **That is the
differentiator, and it is worth defending explicitly** — every future feature
should be asked "can the user check this?" before "is this clever?". The
`might_connect` list is the model to copy: it would have been easier to mix
guesses into the results, and worthless.

### Three things I would prioritise, and why

1. **Finish the agentic loop, then stop adding to it.** Running a skill is the
   missing link (§33). After that the agent can plan, ask, act, and be checked
   — which is a complete story. The temptation will be to keep adding tools;
   resist it. 35 is already past the point where a 4k model gets a trimmed set,
   and odysseus at 69 tools is the cautionary tale in §33: its descriptions are
   4.6× longer per tool because they are full of "don't use X, use Y". **Every
   new tool should have to displace an existing one or justify the trim.**

2. **Make the notebook survive being large.** Everything here is tested against
   tens of notes and reasoned about for thousands. `_suggested_neighbours` does
   a full-table cosine scan; `_graph_neighbours` loads every entry to check
   shared tags; the graph endpoint does pairwise similarity over the whole
   notebook. All are fine at 500 notes and none is fine at 50,000. **This is
   the failure that arrives silently, as "the app got slow", years in.** A
   generated 50k-note fixture and a handful of timing assertions would find all
   of it in an afternoon, and it is much cheaper now than after someone's real
   notebook hits it.

3. **Onboarding, because none of the above matters if nobody gets to it.** §27
   is unbuilt and the first run currently is: install Python, run a script,
   install Ollama separately, pull a model, come back. Every step is a place to
   give up, and the app is at its least impressive precisely then — no notes, so
   no retrieval, so no reason to trust it. The single highest-leverage version
   is not a tour: it is **shipping something to look at**, a handful of example
   notes that can be deleted in one click, so the graph, the timeline and the
   dashboard have something to draw on the first screen.

### Where I think the roadmap is over-invested

Said plainly because a backlog this size needs someone to argue *against* parts
of it:

- **Desktop packaging (§7) is a much bigger commitment than it reads as.**
  PyInstaller builds are the easy 20%; code signing, notarisation, an updater
  and three platforms of support burden are the rest, and they recur forever.
  `start.bat` and a browser tab are unglamorous and they work. I would do this
  only once someone who is not you is asking for it.
- **The whiteboard (§4a) and the in-built browser (§25/IDEAS) are separate
  products** wearing this one's clothes. Each is months, and neither makes the
  notes better.
- **Multi-category notes (§23) is a schema change chasing a small win.** Tags
  already do this. The honest version is "categories are a weak idea that tags
  do better" — worth *considering removing* the tension rather than deepening
  it.

### What is missing that nobody has asked for

- **An answer that says "I don't know" more often.** The hallucinated-write net
  catches the worst case, but a model that pattern-matches four notes into a
  confident wrong summary is the failure that damages trust in retrieval, and
  nothing measures it. A small set of questions with known-correct answers,
  run against each supported model, would turn "which model is good here?" from
  opinion into a table — and that table is worth more to a user choosing a
  model than anything in the Cookbook idea §33 rejected.
- **Export that includes the AI's work.** Notes export; conversations,
  reminders, links, skills and saved looks do not. "It's genuinely yours" is
  only true to the extent you can take it all with you.
- **A second pair of eyes on the crypto.** Private notes use scrypt and
  AES-GCM correctly as far as I can tell, and "as far as I can tell" is not the
  standard that claim deserves. It is the one part of the app where being
  wrong is unrecoverable and silent.

### The one process change worth making

**Nothing in this app has ever been run against a real model in a test.** The
whole suite fakes the provider, which is why it is fast and why it caught the
tool-call-fragment bug — but it also means "works" has always meant "works
against my idea of what Ollama does". One nightly job that pulls a 2B model and
runs ten real turns through both providers would have caught the `think: false`
rejection *before* I shipped it, rather than because I happened to read
`/api/show`'s capability list an hour later.


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

### 35E. The desktop app is a second product and it is not tested

Every one of these is desktop-only, which is itself the finding: `pywebview`
is a different browser with a different origin and different file APIs, and
nothing in the suite touches it.

- **The theme resets to default on every start.**
- **Onboarding shows every time**, so first-run state is not persisting either
  — almost certainly the same root cause as the theme. If preferences are
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

### 35H. Streaming and rendering

- **Agent steps do not stream.** Each section lands complete instead of being
  written out. The server yields `answer` deltas per round, so the likely
  cause is client-side: the skill/step timeline buffers a step's text and
  renders it on completion, where the plain answer path uses
  `liveMarkdownRenderer`. Making the step timeline use the same renderer is
  the fix, and it is the difference between "the app is working" and "the app
  has frozen" on a long run (§33's item 2 makes the same point about plans).
- **Markdown gaps.** Screenshotted: `$\rightarrow$` renders literally. That is
  LaTeX, not markdown — the model emitted it because it was asked for an
  arrow. Two options and they are not exclusive: translate the small set of
  LaTeX escapes models actually reach for (`\rightarrow`, `\to`, `\times`,
  `\leq`) into their characters, and tell the model in the prompt to write
  plain Unicode arrows. The prompt half is cheaper and prevents the rest.
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

- **A button**: "Summarise this chat so far" — replaces the history with a
  summary the user can see and edit, so nothing is silently lost.
- **A tool**, so the agent can do it when it notices it is running out of
  window. §33's warning applies: this is another tool in a registry §34 says
  should stop growing, so it has to displace something or justify the trim.

The reversible-compression idea §11 adopted for notes is the model to copy:
keep the original, show what was dropped, make it undoable.

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

- **A broad instruction gets a token effort.** Reported: *"I will say fix my
  categories and it will only merge two categories and leave it at that,
  ignoring the rest."* This is the counterpart of §21's finding about steps —
  a model given one big instruction does the first part and reports success.
  The skill runner solves it for skills by giving each step its own turn, and
  **the same shape is what an open-ended request needs**: a plan, then a turn
  per item, then a report. §33's "worth building" item 2 (`update_plan`, a
  live plan the agent ticks off) is the mechanism, and this report is the
  strongest argument yet for building it — it is not a progress indicator, it
  is what makes the model finish the job.

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
