# Analysis and outside reads


> **The other three:** [ROADMAP.md](../ROADMAP.md) (live work) · [BACKLOG.md](BACKLOG.md) (§1–§29) · [ANALYSIS.md](ANALYSIS.md) (§30–§34, including the AGPL/MIT constraint) · [HISTORY.md](HISTORY.md) (already built).

Split out of `ROADMAP.md`. These sections are **reference, not work** — they
record judgements, a competitor read, and what was deliberately *not* taken, so
nobody re-derives them. Nothing here is a task list.

The live work is in [ROADMAP.md](../ROADMAP.md); the standing backlog is in
[BACKLOG.md](BACKLOG.md).

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

1. ~~**The agent cannot run a skill.**~~ **built.** Flagged stale by this
   session's backlog audit — `run_skill` exists in `ai/tools.py`'s `HANDOFFS`
   table (§35 area of ROADMAP.md), so this section's own "single biggest gap"
   claim no longer holds. `make_plan` shipped alongside it: an open-ended
   request nobody saved as a skill gets a 2–6 step plan drawn by the agent,
   its turn ends, and the same runner works through it — which is also item 2
   below, "a live plan the agent ticks off", done the same way.
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

2. ~~**A live plan the agent ticks off (`update_plan`).**~~ **built, via
   `make_plan`** — see the correction on item 1 above. The skill runner's
   ticked-step display is now what any open-ended agent turn gets too, not
   only a saved skill.

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

1. ~~**Finish the agentic loop, then stop adding to it.**~~ **Done — the
   "then stop" half is now the live instruction.** `run_skill` and `make_plan`
   both shipped (§33's correction, this session's audit); the agent can plan,
   ask, act, and be checked. What's left of this recommendation is the second
   half, which is a standing constraint rather than a task: odysseus at 69
   tools is still the cautionary tale, so **every new tool should still have
   to displace an existing one or justify the trim** — that sentence doesn't
   get to retire just because the tool list it was warning about stopped
   growing for a while.

2. ~~**Make the notebook survive being large.**~~ **Measured, and two of the
   three predicted failures were real** — `scripts/scale_test.py`, a
   generated fixture up to 50,000 notes, run by hand (it isn't a pytest test;
   see the script's own docstring for why). The actual numbers, not the
   guess:

   | Call | at 50k notes, before | after |
   | --- | ---: | ---: |
   | `GET /graph` (no similarity) | ~19s (extrapolated) | 1.8s |
   | `search_manager.retrieve` — every chat turn's search | 6.6s | 0.5s |
   | `_suggested_neighbours` — one agent tool call | ~20s (extrapolated) | 1.3s |
   | `GET /graph?similarity=true` | O(n²), already known, off by default | unchanged |
   | `_graph_neighbours` / `_related_notes` | 1.3-1.5s, bounded by `MAX_GRAPH_NOTES` | unchanged, judged acceptable |

   Both fixed causes were the same shape: an ORM object (a full `Entry`, or a
   `Category` via `session.get()`) materialised for every row in a table
   scan, when only a handful were ever going to be used. `routes_graph.graph()`
   was resolving each note's category with its own query (10,000 calls of it
   were 87% of the endpoint's time on a 10k-note notebook, found by
   profiling, not by guessing); `semantic_search()`'s own docstring already
   said "revisit only if it ever feels slow" — it did. Both fixed by scoring
   or matching against raw ids/vectors first, and only fetching the small set
   of `Entry` rows that actually rank. Pinned by
   `tests/test_scale_query_counts.py` (query *count*, not wall-clock —
   deterministic under CI load where a timing assertion isn't).

   **`GET /graph?similarity=true`'s O(n²) is real and untouched** — 30
   seconds at just 2,000 notes in the same measurement run, which is well
   within an active user's actual reach (unlike 50k). It's off by default and
   the route's own comment already names the tradeoff ("it's personal-
   notebook scale"); worth a real fix (cap the comparison pool, or drop the
   pairwise scan for a nearest-neighbour index) before recommending anyone
   turn the toggle on, not before then.

   **Storage was not a problem** — 50,000 notes measured at 12MB (this
   fixture's small vectors); rescaled to a real ~384-dim embedding model,
   ~1.8KB/note, ~360MB for 200,000 notes. Attachments are separate and
   unbounded, but nothing here suggests the database itself is a concern at
   any size a real notebook would reach.

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
