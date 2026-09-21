# Ask and Chat: checkable answers, one composer, an agent you reach for

**Status: written by Fable by direct instruction ("the ask subtab and chat
tab need to be like perplexity but better"; "the grounding of notes in ai
responses needs a lot of fixing"; "the popup agent feature could do with
more quick prompt options"), from the owner's screenshots and the code.
Executed with WORLD_CLASS_PLAN Briefs 11, 12 and 13, which it specifies.**

Back to [../ROADMAP.md](../ROADMAP.md).

## 1. What exists (checked in the code)

`/chat/stream` (`routes_chat.py`) streams `status`, `meta`, `thinking`,
`grounding`, `related`, `semantic`, `hint`, `answer`, `stats`, `done`.
`ai/grounding.py` splits the answer into sentences and word-matches each
against the retrieved notes (`ground_answer_sentences`). The Chat tab has
a conversation sidebar, a head (title, model, context %, tokens, fork,
compress, kebab), the transcript (user bubbles right, assistant cards
left with a persona label, sources card grid, "Grounded in" chips, stats
line, "Next" chips, a per-answer action strip), a composer (note and
attachment buttons, textarea, mic, Send; a second row of Skills, Web,
Plan, Ask/Agent segment, settings). The Ask sub-tab on Notes has a
single question field, a mode select, tune, Try-asking and Ask-again
chips, and a History panel. The popup agent (`#agent-monitor` and the
Ask-the-agent panel) has four starter chips. Skills run as a collapsible
plan with steps, tool cards and chips of the notes each step read.

## 2. Why it disappoints (measured against the screenshots)

1. **Grounding is thin and wrong-shaped.** An answer that named several
   notes carried one "Grounded in" chip and one superscript; a skill run
   that read ten notes carried none. Cause, in the code: grounding runs
   only over the retrieval set of the final turn and only on the final
   answer text; notes read by tools during the turn are not candidates,
   and the per-sentence match is a bag-of-words overlap that needs a
   sentence to share several rare words with one note.
2. **Sources are a gallery, citations are an afterthought.** A 17-card
   grid of sources under the answer is a second page to read; the marks
   in the text are what Perplexity gets right and the grid is what it
   does not show by default.
3. **The composer is two rows of chips** around one field, and its second
   row (Skills, Web, Plan, Ask/Agent, settings) is a bar of unrelated
   controls; the skills picker is a full-height list.
4. **User bubbles** are a solid accent block with a "YOU" label and an
   avatar; the assistant card is a quiet card. The two do not belong to
   one conversation.
5. **Streaming state** is a static three-dot glyph; "Working" rows render
   above the step they belong to; the "Still writing / Jump to latest"
   pill takes a row of the panel instead of floating.
6. **Ask is a second chat with fewer features** (no citations, no
   follow-ups that carry context, a History panel on an older recipe).
7. **The popup agent** has four starters; the owner "just defaults to one
   of the sentence starters" because the useful things (make a note of
   this, remind me, find, summarise the open note, what changed today)
   are not there, and the panel is on the old recipes.
8. **Skills**: a step is one tool call; `list_notes` paged and the model
   did not page again, so it concluded notes were missing. The owner's
   question: can one-tool-per-step do the job.

## 3. The target, in one paragraph

An answer you can check sentence by sentence: every sentence carries a
mark, the mark names the note, hover highlights the passage, and "I don't
know" is a designed state when fewer than half the sentences are
supported. One composer everywhere (Chat, Ask, the popup agent): one
field, a "+" menu for attachments, scope, persona and skill, a mode
segment (Ask, Agent), Send; nothing else on the bar. Ask is Chat in
single-turn mode with the same answer object. The popup agent is the
same composer with twelve starters grouped by verb (capture, find,
summarise, remind, do), and a "with the open note" toggle. Skills run
until each step's contract is met, paging and retrying inside the step,
and every run ends with a verification line and an Undo.

## 4. Decisions made (do not re-decide)

1. **Citation source set = retrieval set ∪ every note a tool read or
   listed in the turn.** `run_agent` collects `_touched_items` per tool
   result already (`agent.py` ~547); those ids join the grounding
   candidates. Skills therefore cite what they read.
2. **Grounding by passage, not by bag of words.** For each sentence,
   score each candidate note by the best-matching *passage* (a sliding
   window of 40 words) using BM25 over the window plus, when embeddings
   exist, cosine over the window; a sentence is supported when its best
   score clears a threshold calibrated on the eval fixtures (Brief 12);
   the mark stores `{note_id, passage_start, passage_end}` so hover can
   highlight the passage. Sentences with numbers or names get a second
   check that the number or name appears in the passage.
3. **The answer object** is one shape for Chat, Ask and the agent:
   `{sentences: [{text, marks: [{note_id, start, end, score}]}], sources,
   related, next, stats, verification}`; the renderer is one function.
4. **Marks in the text, sources on demand.** Superscript marks with the
   note's short title on hover; the source grid becomes a "Sources (9)"
   disclosure that opens a compact list (title, passage, open), not cards.
5. **The composer recipe** (`.composer`): one field; left: "+" menu
   (attach file, attach note, scope chips, persona, skill); right: mic,
   mode segment, Send (primary). The second row goes. The skills list is
   a searchable menu capped at 40vh.
6. **Bubbles.** User turns are a quiet tinted card (accent-soft, no
   avatar, no label, right-aligned, max 70% width); assistant turns are
   the card they are; the persona label stays.
7. **Streaming.** One animated three-dot indicator (CSS keyframes, honours
   reduced motion) inside the assistant card; step rows render in order
   (Working row inside its step, not above it); "Jump to latest" floats
   over the transcript with no layout row.
8. **Ask = Chat in single-turn mode.** The Ask sub-tab keeps its place
   and its History, both on the app's recipes, but renders the same
   answer object and uses the same composer; "Ask again" chips become
   follow-ups that carry the previous answer as context.
9. **Popup agent starters** (twelve, grouped): Capture: make a note of
   this, add to today's note; Find: notes about..., what did I write this
   week, open the note about...; Summarise: the open note, my week, this
   conversation; Remind: remind me to..., what is due; Do: tag my untagged
   notes, link related notes. Plus a "Use the open note" toggle that
   scopes the run to the entry on screen.
10. **Skills: a step loops until its contract is met**, up to N tool
    calls (default 6) with paging handled inside the step (`list_notes`
    with a cursor is called until the contract's count is reached or the
    cursor ends); the verifier (Brief 13) checks the postcondition. The
    owner's question is answered in the negative: one tool call per step
    is not enough; one *contract* per step is.
10a. **A skill that declares steps needs no separate prompt** (Brief 13).
    A numbered list of steps already says what the job is, and requiring a
    prompt beside it is how the two drift apart: the prompt says one thing,
    the steps do another, and the model reads both. A skill with neither is
    still refused.
10b. **`verify` is a declaration, not a step** (Brief 13). A skill may end
    with `{tool, field, expect}`; the app runs it against the notebook after
    the last step. A step saying "check it worked" is exactly the thing a 3B
    model reports having done without doing, which is the failure the whole
    contract mechanism exists for. Four predicates (min, max, equals,
    unchanged), each answerable from one integer, because a postcondition a
    small model can be graded against has to be a fact rather than a
    judgement.
10c. **A step's paged read is judged on its last call, and only for a tool
    the step's contract names** (Brief 13). "Have I reached the end" is a
    property of the last page, not of any; and holding a step open on an
    incidental `list_notes` would stall runs that work today, the same reason
    a plain string step has no contract at all. Capped at six pages, said out
    loud on the step, in its history and on the result rather than reporting
    a partial pass as a complete one.
10d. **"Find loose ends" pages the notebook instead of searching it**
    (Brief 13). Its first step was one `search_notes` call for "todo, need
    to, should", which is a top-k similarity query, and the skill's claim is
    *the* loose ends, all of them: a note saying "ring the landlord back"
    resembles nothing on that list and is exactly what the skill is for.
10e. **The run budget is a scope, not a parameter** (Brief 13, after
    `core/events.py`). What has to be true is that every model call made
    inside a run counts against that run, including the ones written later by
    somebody who has never read `ai/budget.py`; a parameter threaded through
    is true only of the call sites somebody remembered to change. Checked
    between rounds, never mid-stream: stopping inside a model call leaves half
    an answer on screen and a tool result nobody read.
10f. **A correction is recorded outside the `edited` write scope** (Brief
    13). `events.record` folds anything recorded inside a write into that
    write's own event, correctly for a category created on the way past and
    wrongly for this: a correction is a second, separately readable fact, and
    folded it is invisible to the query that looks for it. Keyed on where the
    note ended up, because "notes like this belong in B" is the half that is
    usable when filing something new.
10g. **A verify block may carry arguments, and they may only narrow it**
    (2026-09-20, taken while closing `brief-13-harness.md` item 3). Decision
    10b's shape is `{tool, field, expect}`, which can only ask a tool its
    unfiltered question: how many notes are there. The postcondition a
    *writing* skill makes is narrower, and "Auto-tag my notes" is the case
    that names itself: it claims it leaves no untagged note behind, which is
    `count_notes(untagged) max 0` and is unsayable without an argument. So the
    block takes `args`, flat scalars only, at most four
    (`skills.MAX_VERIFY_ARGS`), and `count_notes` takes the same `untagged`
    and `since` filters `list_notes` has always had, out of one shared
    function so the count and the list can never disagree about what
    "untagged" means. What does not change is what a verifier may *do*: the
    runner still refuses any tool that writes, and an argument only ever makes
    a reading narrower. The three read-only audit skills that could not verify
    without widening their allowlist now declare `count_notes` and are checked
    with it, which is the widening, stated: one read-only counting tool, on
    the wire, for a run that would otherwise only promise it changed nothing.
10h. **The page cap stays at six pages of twenty-five, and the answer to a
    large notebook is a narrower read** (2026-09-20; `brief-13-harness.md`
    item 4 asked for this to be decided in the plan rather than in the
    constant). Raising `MAX_PAGES_PER_STEP` trades one wrong answer for
    another: a run that spends its whole budget paging is not a better run
    than one that says it saw the first hundred and fifty. What was missing
    was any way to ask a *smaller* question, and that is what 10g's filters
    are: "the untagged ones", "the last thirty days", "this category", each
    answered by the database rather than by a model holding a notebook in its
    head (§R5). A step that needs more than one page of the whole notebook is
    a step whose filter has not been written yet. The honest `truncated`
    report stays exactly as it is.

12. **A link the AI writes is a card when it is the whole line, and stays
    inline otherwise** (INBOX 172, decided 2026-09-13 in Phase 3). The two
    forms answer two different questions and the plan had been reading them as
    one. A link inside a sentence is a reference: a card in the middle of a
    sentence breaks the sentence, so it keeps the inline "host / page" form
    with the full address on hover. A link a model puts on a line of its own is
    a thing being handed to you, and it gets a card: the link's own words as
    the title (a bare address falls back to its path, because the host is
    already the second line), the host under it, the source card's own recipe,
    and a hit area rather than eleven characters of underlined prose.
    **No favicon, and that is the decision rather than an omission**: fetching
    one would be the first time this app asked the web for something nobody had
    asked it to, in an app whose first line of description is that it is
    offline. The host in words is the half of a favicon that carries meaning.

13. **The help chat is a sheet reachable from anywhere** (INBOX 193, filed
    and taken 2026-09-13; asked for in INBOX 190, "give it a fitting name??").
    **Its name is decision 15's, not this one's**: "Guide" here was superseded
    a day later by the owner, and the paragraph below is kept as written
    because the reasoning in it is what decision 15 had to answer. "Guide" rather than a person's name or a
    mascot: it explains the app and nothing else, it cannot read the notebook,
    and a name implying a personality would be the second thing in this app
    claiming to be an assistant while being the one that knows least about
    you. Its heading already read "Ask the guide", so the name was half
    chosen. One instance, not three: `openHelpChat()` moves the existing
    `#help-chat-group` into an `openSheet` and puts it back on close, because
    the chat is stateful (a running transcript, a form, three handlers bound
    by id) and a second copy would be a second set of ids. Reachable from the
    header's '?' on every tab and from the head the fifteen Settings panes
    share.

15. **The guide is called Atlas** (INBOX 204, the owner: "give the help ai a
    name fitting for the application like a persona and improve its
    capabillity and knowledge"). This supersedes decision 13's naming half,
    one day after it was taken, because the owner asked twice and "Guide" was
    the wrong answer both times: INBOX 190's "give it a fitting name??" was
    read as a request for a label, and a label is what it got.
    An atlas is a book of maps: the thing you open to find your way around a
    place you are already standing in, which is what this chat is for an app
    called MemoryMap, and it is already drawn with a compass in the status
    bar. It also keeps decision 13's actual objection intact, which was never
    to names as such but to a name that claims a personality: a reference work
    has no personality to claim, does not pretend to know the reader, and does
    not imply it has read the notebook it cannot see. The voice in the system
    prompt is the same restraint the rest of this app's copy keeps: plain,
    sentence case, no greeting before the answer, and it says what it is when
    asked rather than inventing a character.
    The name lives in exactly two constants, `help_chat.GUIDE_NAME` and
    `GUIDE_NAME` in settings.js, and `tests/test_help_chat.py` asserts the
    word in the model's prompt is the word on the screen. A `guide` entry in
    `HELP_TOPICS` is what lets it answer "who are you" and "what can you do",
    which matched no topic at all before and so were answered "I'm not sure".

14. **The popup agent's own reach is the header, not seven docks** (INBOX
    190). The ask was "usable across the whole app"; the header is the one
    piece of chrome on every tab, a dock belongs to the surface under it, and
    seven copies of one control is seven places for it to drift and seven
    docks for two agents to conflict in. One wand, one '?', the chord in the
    tooltip. The starters are per tab (`AGENT_TAB_STARTERS`), which is where
    "depends where you are" belongs: the panel is the same everywhere and
    what it offers first is not.

11. **When no model is connected**, every AI control is visible, disabled,
    with a tooltip "Connect a model in Settings" and a one-click link;
    Ask falls back to search results with passages; nothing is hidden.

## 5. Phases

### Phase 1: grounding and marks (one session; Brief 12)
Decisions 1 to 4. **Gate:** on the ten fixture questions, ≥ 95% of
supported sentences carry a mark to the right note (fixtures name the
note); a skill run cites the notes it read; hover highlights the passage;
"I don't know" appears on the two unanswerable fixtures.

**Three of the four gate lines are green, 2026-09-20**, and the fixture set
they are scored on now exists: `tests/fixtures/chat/grounding_cases.json`,
sixteen cases, scored by `tests/test_grounding_fixtures.py`. Which note
grounds a sentence is decided by the passage score (decision 2's open half);
the account and the numbers moved to
[HISTORY.md](HISTORY.md), "Moved from the plans, 2026-09-20". A skill run
citing what it read is decision 1 and has been covered since it landed
(`tests/test_grounding.py`, the tool-read cases); hover highlighting the
passage is measured in the browser by
`scratchpad/ui-sweeps/citepassage.js`.

**What is left of Phase 1: the fourth gate line, the low-support state.**
Brief 12 decided it ("unsupported sentences get a hollow mark and the 'I
don't know' copy is triggered when < 50% of sentences are supported") and
nothing in the app reads a support ratio: `grep` for `answer-citation` finds
the marks, and there is no unsupported variant of one and no notice above an
answer that came from the model rather than from the notebook. The empty case
is designed already (`librarian.NO_RESULTS_MESSAGE` plus the "Elsewhere in
your notebook" chips), so what is missing is only the partly-supported one.
The fixture set can gate it as it stands: `recipe-and-general-knowledge` is
one supported sentence of two, and the two `unanswerable-*` cases are zero of
two. Next step, in order: the ratio on the `grounding` event
(`routes_chat.py`, where `sentence_grounding` is assembled), one notice line
above the answer on the app's own recipe, and a sweep that asserts it appears
on an answer whose sentences are half marked and not on one that is fully
marked.

### Phase 2: one composer, bubbles, streaming: **built 2026-09-13**, see
[HISTORY.md](HISTORY.md) "Moved from the plans, 2026-09-13". Gate green
(`scratchpad/ui-sweeps/chatphase2.js`), with one gate line superseded by the
owner's own later instructions and said so there.

### Phase 3: Ask unified, popup agent: **built 2026-09-13**, see
[HISTORY.md](HISTORY.md) "Moved from the plans, 2026-09-13". Decisions 8, 9,
11 and 12. Gate green in both halves it has
(`scratchpad/ui-sweeps/chatphase3.js` for the browser,
`tests/test_ask_answer_object.py` for the transport). One gate line was
superseded by the owner's own later instruction and re-run in that form: the
starters are decision 9's twelve **plus the current tab's two** (INBOX 190,
decision 14), so the sweep asserts 14 chips in 6 groups with the tab's own
group first.

### Phase 4: skills that finish (one session; Brief 13)
Decisions 10 and 10a to 10h. Built, 2026-09-12: see HISTORY.md, "Moved from
the plans", Brief 13. The harness items that were left with it are closed as
of 2026-09-20 (the `verify` control in the editor, the two audit skills that
had no check, `count_notes`'s filters, and the page-cap question, now decision
10h): see HISTORY.md, "Moved from the plans, 2026-09-20".

**What is left, and why it is still left: the `evals` marker and its fixture
set** (the loose-ends fixture with eight planted loose ends, the
zero-invalid-calls count over the built-in skills). It wants the dev model
script (WORLD_CLASS_PLAN 9) to be worth more than a restatement of the unit
tests: a fake transport calls whatever its script says, so "80% of the skills
complete with no invalid tool call" measured against one would be a
measurement of the script. Nothing was built towards it this time, deliberately:
a test module that can never run in CI is a feature that never ran once.
See `docs/roadmap/archive/agent-remaining/brief-13-harness.md`.

## 6. Consistency rules

The answer renderer, the composer and the bubbles are one component each
used in three places; chips are `.library-chip`; menus the one recipe;
keys: Enter sends, Shift+Enter newline, Ctrl+K palette, Escape stops
streaming. No em-dashes in any generated copy either: the prompt asks the
model for plain punctuation.

## 7. Not verified until built

Threshold values for "supported" need the fixtures; passage highlighting
on notes with images; behaviour with a 1B model (it may not follow the
citation format at all, in which case marks come only from grounding,
which is the design anyway).

## 8. Research: what the reference products actually do, and what it changes here

Written from working knowledge of the products as of 2026, not from a
live teardown in this sandbox; where a claim matters to a decision, the
session that builds the phase should confirm it in the product first.

- **Perplexity** puts numbered marks inline at sentence ends, renders the
  source list as a horizontal strip of small cards above the answer (not a
  grid below it), shows "N sources" as a count you can expand, and offers
  follow-up questions as the primary next action. Its marks come from the
  model being asked to cite by number over a numbered context; the marks
  are therefore only as honest as the model. Implication: decision 2
  (grounding computed by us, by passage) is stronger than Perplexity's
  own mechanism for a small local model, and the strip-above-answer layout
  is worth copying for the sources disclosure (decision 4) because it
  keeps sources visible without a second page.
- **NotebookLM** cites by passage with an inline chip that opens the exact
  passage in the source pane; it refuses ("not in your sources") when the
  answer is not grounded. Implication: the hover-highlights-the-passage
  behaviour and the designed "I don't know" state are table stakes, not
  extras; the threshold in decision 2 should be calibrated so that
  refusal happens *before* a fabricated sentence, erring towards refusal.
- **ChatGPT, Claude.ai** composers: one field, a "+" for attachments and
  tools, a mode toggle, a send button; nothing else on the bar. Implication:
  decision 5 is the industry shape; the two-row composer is the outlier.
- **Obsidian Copilot, Smart Connections** (local-model chat over a vault)
  show the notes used as a list of links under the answer and let a note
  be inserted as `[[link]]`. Implication: the "Add answer to note with
  citations" action (§114 F2-4) belongs on the answer's action strip.
- **Raycast AI, Spotlight-style agents** win on quick actions because
  each starter is a verb with a slot ("Remind me to ___"), not a full
  sentence, and the panel remembers the last three used. Implication:
  decision 9's twelve starters should be verb-plus-slot chips, with the
  three most recent first.
- **Small-model reality**: a 3B model asked to cite by number over 17
  sources will drop marks or invent numbers; the eval fixtures must
  include this case so decision 2's grounding, not the model's marks, is
  what the UI trusts. Decision 10's "loop until the contract is met" is
  how Claude Code and similar harnesses behave; the missing piece in
  `skill_runner` today is paging inside the step.

## Placed from INBOX, 2026-09-09

172 (part). **Web links the AI writes, "better and more modern cool".**
Decided and built in Phase 3: decision 12 below. Both forms, chosen by where
the link sits.

The owner's reports this plan owns, moved whole from INBOX.md with their numbers (never reused). Each becomes a phase row when its phase is written; until then this list is the phase.

45. **The Ask sub-tab**: extra scroll, overflow, and the owner wants a
    redesign with an integrated advanced search and more utility. Owner:
    CHAT_PLAN Phase 1 (Ask) plus WORLD_CLASS 5.1 operators; the scroll
    part is 33.

### Found by an agent while measuring something else (2026-09-08, graph)

71. **Web search panel, function extraction UI, agent tools: "redesign
    them and make them better, more utility and abilities"**. Owner:
    CHAT_PLAN (next session, Opus): web search results as a source list
    with favicon, domain, title and a one-line snippet, "Open" and "Save as
    note" per result, persistent in the turn; the extraction UI (Extract
    notes) as a review list with checkboxes and per-item edit before
    saving; the Tools settings as a grouped table (read, write, destructive)
    with a search box, per-tool on/off and a "why" popover.
72. **Popup agent panel "still hasn't had its modern redesign"**. Owner:
    CHAT_PLAN (next session, Opus), with INBOX 45's Ask redesign.
76. **Inline citations must be accurate to the specific notes referenced
    where they are referenced.** Owner: WORLD_CLASS §14 grounding (Fable):
    the distinctive-terms rule already places numbers per sentence; add
    the evaluation: a fixture of 20 answers with hand-marked sentence to
    note pairs, precision and recall reported by `tests/test_grounding.py`,
    and the popover (INBOX 80) shows the matched terms so a wrong number
    is visible.
80. **Citation hover/click preview**: hovering or clicking a numbered
    reference shows a popover with a preview of the thing (note, document,
    mind map, file, website) and a button to go to it; clicking the
    preview panel itself goes there. Owner: CHAT_PLAN (Opus, next
    session): one `referencePopover(kind, id)` for every kind, reusing the
    Library's previews.
90. **User chat bubbles "still very ugly"** (screenshot: a lavender block
    with "YOU" and an avatar circle top-right). Owner: CHAT_PLAN (Opus):
    a quieter bubble (accent-soft fill, no avatar, the label as a small
    muted "You" above, radius from tokens, max-width 70%).
63. **Redesign the Ask sub-tab, Write with the AI and Capture** (three
    screenshots, 01:12; the owner: "modernise them and bring them up to
    standard with features, function and ui ux"). Owner: Opus, next slot,
    one brief (CHAT_PLAN's INBOX 45 folds in). Decisions: Capture keeps
    its one-column form but the title, the formatting strip and the box
    become one framed field (title as the first line, strip inside the
    frame's top edge, no separate rounded strip), the six action buttons
    collapse to Attach + Dictate + Improve with From library and Sketch
    under Attach, the "Add to document" and "File under" selects move to
    one settings row under the box with the space note, Save primary and
    "Save as draft" ghost; a live "N words · reading time" in the foot;
    Ctrl+Enter saves. Write with the AI becomes a two-pane editor with
    one shared toolbar (Draft it primary; Undo, Extract notes, Discard
    ghost; tone and length as a segmented control instead of a free
    text hint, with the hint field behind it), the draft pane in the
    body font not monospace, a word count per pane, and the tag field
    beside Save. Ask keeps its layout and gets: the AI answer and the
    matching records as two equal-height columns with their own scroll,
    the answer box unframed (one panel, not a card in a card), the
    "Ask again" chips as a scrolling row, a "Sources" foot listing every
    grounded note with confidence, an Answer style segment (Brief,
    Detailed, Bullets) replacing the select, keyboard: Enter asks,
    Shift+Enter newline, Esc clears; the settings popover keeps its id.

## Placed from INBOX, 2026-09-09 (the owner's evening batch)

- "at 100% and 95% zoom on my laptop, the ai answer with the ai model badge
  and the retry, copy and dictate read out loud buttons are misalligned
  because of wrap" (screenshot: the ANSWERED BY badge on the first line and
  Retry / Copy / speak dropping to a second, overlapping row). The answer
  header is one flex row that wraps without a reflow rule; measure it at
  1440, 1366 and 1280 and at 95% and 100% zoom.
- "can you make the skills button the width of the two buttons above it so
  it looks neat and symmetrical?? is that a good design choice??" Yes, with
  a caveat worth stating: matching the pair's combined width plus their gap
  is the symmetry the eye reads, and it only holds while the row above has
  exactly two buttons. Bind it to the row rather than to a fixed number.
- "Im wondering if the elements in the bottom row of the chat dock should
  be rearranged better??" (screenshot at full width: Skills, a divider, Web
  and Plan, then a long gap, then Ask / Agent and a gear). The gap is the
  problem, not the order: the mode pair and the gear are pinned right by
  `margin-left: auto` while the left group sits at the far left of a 2000px
  bar.
- "in the chat tab, the main chat panel shadow actually reaches all the way
  down on the gap."

## Placed from INBOX, 2026-09-21 (the Ask sub-tab, four reports in one pass)

297. **The owner, 2026-09-21, verbatim:** "in the ask subtab in notes, make
    sure there are appropriate gaps between uploaded files and attachments
    and the badges and make sure all the badges show." His screenshot shows
    a file chip, "cab432_lecture_agents.pdf" with a download button, sitting
    hard against the row of badges under it: Courses & Study, AI 72%,
    Default Space, and the date. Two things in one: the spacing, and badges
    that do not all appear. Placed into CHAT_PLAN.


298. **The owner, 2026-09-21, verbatim:** "there's no generating animation
    while the model is thinking and streaming in the ask tab either." The
    Ask sub-tab in notes. Note that the app has a shared `.spinner`
    (01-forms-settings.css) whose shape was fixed tonight, so this is a
    missing call site rather than a new control. Placed into CHAT_PLAN.


299. **The owner, 2026-09-21, verbatim:** "can the notes in the matching
    records that appear in the ask tab be numbered accordingly to match the
    inline referencing??" The answer's inline references are numbered, and
    the matching records beside them are not, so the two cannot be read
    against each other. Placed into CHAT_PLAN.


300. **The owner, 2026-09-21, verbatim:** "fix the ui of this sources button
    in the ask tab." His screenshot shows a full-width pill reading "Sources:
    10 notes, on the right", spanning the answer column under a "Grounded in"
    line, with "Ask next" suggestions below it. It reads as a banner rather
    than a control and it describes where something is rather than doing
    anything. Placed into CHAT_PLAN.

