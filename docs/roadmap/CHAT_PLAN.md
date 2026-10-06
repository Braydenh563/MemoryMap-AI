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

16. **A read-only note row draws the facts, not the actions** (INBOX 297).
   A search result, an Ask column record and any other row built through
   `clickableResult` gets `entryItem(entry, {facts: true})`: every fact the
   card states about the note (its category, tags, space, confidence, what
   it is linked to, whether it has no tags yet) is true of the note wherever
   it is drawn and belongs on the row. A chip that is really an action does
   not: "Tag with Atlas" starts a model call, and the "No tags yet" flag's
   handler opens the edit form in a list that is not on screen, so on a
   read-only row that flag is a fact with no handler. Measured before the
   decision: the same note drew five chips in Browse and two in Ask.

17. **The composed answer is the answer whenever no model runs, in Ask and in
   Chat** (INBOX 725, the owner: "the composer response should also be able
   to be viewed in chat messages", and "the ai still should be used as the
   chat bot when it is available"). A running model answers every Chat turn
   and every Ask turn unless From your notes is chosen; `_composed` is
   unchanged and the Chat tab's no-model branch composes in place of
   `extractive.answer`. Its chips are the composer's own next questions.

18. **The composer's layout** (INBOX 725, the owner: "you make the composer
   decisions"). The first line is the answer: the lead note named and its
   sentence on the same line; a list of short phrases said as one sentence
   ("lists four: A, B, C and D"), lowered to sentence case only when every
   entry is written that way; a checklist with how many are ticked; a broad
   question ("what do I know about") opened by "At least N of your notes
   mention", said of the notes found. The other notes follow joined by how
   they relate, never the same joining words twice running: "also" or
   "adds" for the question's subject, "Later, on" for a newer note on the
   same thread, "Separately" or "Elsewhere" for another topic, "But your
   newer note" for a pair that may disagree. One topic to a paragraph, two
   notes at most; a fact question (count, when, who, yes or no) brings at
   most two other notes.

19. **Meaning is the embedder's when it runs, shared words when not.**
   Cosine 0.9 is one claim said twice, 0.55 one topic; the lexical twins are
   Jaccard 0.6 and 0.12 over the words that are not the question's own. A
   repeated sentence is said once with "(Your notes say this N times.)"; a
   pair that differs in a figure or a "not" is never folded as a repeat. A
   broad answer's lead is the note named for the subject, else the sentence
   the others lean towards (TextRank weighted by score).

20. **Tried and not kept, from the brief's list.** "For example" as a joiner:
   nothing short of parsing tells a general sentence from an instance of it,
   and a wrong "for example" states a relation the notes never did. "Because"
   as a joiner: only a note's own "because" counts, used as a cue for why
   questions. Pronouns: only "It" or "Its" for the note just named. Fusion:
   only of a list's own entries, never two sentences into one.

21. **Next questions and follow-ups need no model.** A composed answer offers
   up to three: a tag two or more of the notes found share, a note found and
   not quoted whose best sentence scored at least half the best, and the
   question's own short subject asked the other way in time. "Tell me more"
   is the last question again with what it quoted left out; "the second
   one" is the second note the last answer named; a question whose only
   subject is "it" or "that" takes the last question's subject.

22. **With no model, Chat stays open and Agent mode closes** (INBOX 725, the
   owner: "if the composer can respond in the chat, should the chat input bar
   be enabled?? maybe agent mode should be disabled though unless needle is
   used to call tools without an ai"). The box and Send are not model-gated;
   the banner says Chat answers from your notes and what connecting a model
   adds. Agent mode is greyed with its reason unless the Needle extra is on
   disk (`/models/status` `tools_engine`), and then it runs on Needle and its
   title says so; the saved mode is never changed by the gate.

## 5. Phases

### Phase 1: grounding and marks (one session; Brief 12)
Decisions 1 to 4. **Gate:** on the ten fixture questions, ≥ 95% of
supported sentences carry a mark to the right note (fixtures name the
note); a skill run cites the notes it read; hover highlights the passage;
"I don't know" appears on the two unanswerable fixtures.

**Built, all four gate lines and the replay tail, 2026-09-20 to 2026-09-23.**
Moved to HISTORY.md ("Moved from the plans, 2026-09-23", CHAT_PLAN.md): the
fixtures, the passage-scored attribution, the low-support notice and its
replay on a reopened turn, with every measurement.

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

**The `evals` marker and its fixture set: built 2026-10-05**
(`tests/test_skill_evals.py`, the seventy-note loose-ends fixture with eight
planted in `tests/fixtures/chat/loose_ends.json`, and the zero-invalid-calls
count over the built-in skills; a fixture check runs in every suite). Run
once against Qwen2.5-3B-Instruct Q4_K_M (llama-server `-t 2`, four cores at
load 13 to 22, 55 minutes): "Find loose ends" named **2 of 8** (the dentist,
Priya) and one note that is not a loose end. Read from the run: the model
wrote `list_notes({...})` into its prose and then "I cannot execute the tool
call", so the paging never happened; that shape is now recovered as a call
for a read (`provider.extract_text_tool_calls`, pass 5). **Still open**: the
gate itself (8 of 8, and 80% of the skills with no invalid call) on a 3B
after that fix, and the built-in skills pass, which is hours on these cores.

### Phase 5: the composer, after INBOX 725 (open)
Left from INBOX 725, each its own step: (a) when a model runs, feed it the
composer's chosen sentences as context (the owner: "the composer can assist
the ai"); (b) run the 25-question eval with a real embedder and set the
cosine thresholds from it (decision 19's are reasoned, the lexical ones are
measured); (c) a "Your notes, no AI" label on a composed Chat bubble, as
Ask's chip has; (d) a picture attached as a file (`files` captions), not only
one inside a mostly-picture note; (e) re-capture the eval's retrieval when
search changes (`tests/fixtures/composer/showcase_725.json`); (f) "the
composer acts" (the owner: "or the composer can somehow call tools and act
like an agent"): deterministic commands parsed from a Chat message ("make a
reminder for X on Friday", "tag these notes Y"), shown as the action they
would take and confirmed before anything is written, the same confirm card
an agent's write uses; Agent mode then opens with no model for those verbs;
(g) link reasons beyond "similar in meaning" (the owner: "can the composer be
user to write better link reasons"): INBOX 691's concrete overlaps first,
then the composer's quoted sentence pair, a model's checked line when one
runs, feeding Tidy's "Add reasons" and "Add reasons to all". Open items and
numbers: agent-remaining/composer725-1006.md.

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

~~45. The Ask sub-tab.~~ **Folded into 63 and closed with it, 2026-10-05.**

### Found by an agent while measuring something else (2026-09-08, graph)

~~71. Web search panel, extraction UI, agent tools.~~ **Built; checked and
    finished 2026-10-05.** Moved to HISTORY.md, "Moved from the plans,
    2026-10-05 (CHAT_PLAN's placed items)".
~~72. Popup agent panel redesign.~~ **Built 2026-09-13** (`7002cd9`, INBOX
    126); moved to the same HISTORY block.
~~76. Inline citations accurate per sentence.~~ **Built 2026-10-05**:
    twenty answers, precision 26 of 26 and recall 26 of 26, and the popover
    names the matched words. Moved to the same HISTORY block.
~~80. Citation hover/click preview.~~ **Built 2026-09-26.** Moved to
    HISTORY.md, "Moved from the plans, 2026-09-26 (the Chat pass)".
~~90. User chat bubbles.~~ **Built; checked 2026-09-26.** Moved to
    HISTORY.md, "Moved from the plans, 2026-09-26 (the Chat pass)".
~~63. Redesign the Ask sub-tab, Write with the AI and Capture.~~ **Closed
    2026-10-05**, line by line against what renders: the last four lines
    built (a word count and reading time in Capture's foot, a word count on
    each Write pane, the draft in the body font, Escape clearing the Ask
    question), the rest built by earlier passes or superseded by a later
    decision of the owner's, each named. Moved to HISTORY.md, "Moved from
    the plans, 2026-10-05 (INBOX 63 and 45)".

## Placed from INBOX, 2026-09-09 (the owner's evening batch)

**All four checked built, 2026-10-05**, measured at head and moved to
HISTORY.md, "Moved from the plans, 2026-10-05 (CHAT_PLAN's placed items)":
the answer head on one 32px line, the Skills button inside the arranged
strip, the strip's two ends by the owner's own later layout, the panel's
shadow 2px by 8px against a 52.8px gap.

## Placed from INBOX, 2026-09-21 (the Ask sub-tab, four reports in one pass)

**All four built, 2026-09-21.** One pass, because they are one screen and
four separate fixes would have meant four rounds of the same measurement.
The probe is `scratchpad/ui-sweeps/asktab.js` (registered in
`scripts/gate.sh`'s sweep list); it measures rather than captures, and it
drives a real stream through `scratchpad/fake_answer_server.py`, which now
takes `FAKE_DELAY_MS` so a stream lasts long enough to poll. The full record
is in HISTORY.md, "INBOX resolved, 2026-09-21".

~~297. Gaps between an attached file and the badges, and badges that do not
all show.~~ **Built.** The gap: 0.0px to 6.4px, at 1440, 1024, 820 and 390.
The badges: not a truncation and not a wrap (every badge the data implies
was drawn at every width, none clipped, 0px of the lane scrolled out), but a
condition that never fired: `clickableResult` passed `entryItem` no options,
so every chip gated on `options.actions` was missing from a read-only row.
The same note: 2 badges in the Ask column before, 4 after, against 5 in
Browse, the fifth being the one chip decision 16 keeps off a result row.

~~298. No generating animation while the model is thinking and streaming.~~
**Built.** Frames with the answer actually streaming: 250 before, 0 of them
showing anything moving; 63 after, 63 of them showing something. Across the
whole turn: 120 of 372 before, 243 of 243 after. Two existing components
(`progressLine`, `.is-generating`) called from a surface that never called
either, not a new control.

~~299. Number the matching records to match the inline referencing.~~
**Built.** Records numbered: 0 of 5 before, 5 of 5 after, from
`citationNumbers`, the map the prose marks, the "Grounded in" chips and the
Sources panel already share. Marks whose row disagrees with them: 0. Numbers
drawn over a row's own text: 0 (6.4px of clear gutter on every row).

~~300. The sources button reads as a banner and describes a place.~~
**Built.** 525px of a 525px column (100%) before, 204px (38.9%) after;
"Sources: 5 notes, on the right" before, "Show the 5 notes used" after; and
a press now moves the first cited record from 328px below the top of the
window to 72px.

### The four reports, verbatim

297. **The owner, 2026-09-21, verbatim:** "in the ask subtab in notes, make
    sure there are appropriate gaps between uploaded files and attachments
    and the badges and make sure all the badges show."

298. **The owner, 2026-09-21, verbatim:** "there's no generating animation
    while the model is thinking and streaming in the ask tab either."

299. **The owner, 2026-09-21, verbatim:** "can the notes in the matching
    records that appear in the ask tab be numbered accordingly to match the
    inline referencing??"

300. **The owner, 2026-09-21, verbatim:** "fix the ui of this sources button
    in the ask tab."

## Placed from INBOX, 2026-10-03 (the chat stutter, INBOX 413)

Moved from INBOX whole when INBOX 433 arrived (the tray holds under
twenty). Open until the owner's next run reports it gone or not.

413. **The owner, 2026-09-24, verbatim, with a chat screenshot.** "I was in a
    document in the editor, I opened the suggestions panel and pressed check
    with ai, it took me to the chat and a popup above the chat suggested that
    there was a skill available for my requests, it wasnt entirely accurate
    so I closed it by clicking the 'x' on it and then the whole new chat page
    started viciously stuttering jumping up and down slightly really fast."
    Not reproduced headless (with real scrollbars, at 700 to 1048 tall, the
    dismiss gives one flip, not a loop). The one self-feeding path found is
    fixed: `fitChatEmpty` took its own class off to measure inside a
    ResizeObserver; it now reads stored heights with 4px hysteresis, and
    `#chat-messages` keeps a stable scrollbar gutter. Then the owner's log:
    "ResizeObserver loop completed with undelivered notifications", many a
    second, after opening and widening the web panel. The observer now only
    records the size; the fit runs a frame later, for changes of 2px or more,
    at most one flip per 500ms (`o-webpanel.js`: 0 loop errors, 1 flip across
    a 300 to 700px drag, 0 while still). Open until the owner's next run; the skill match being "not entirely accurate" is placed with
    the documents' Check with AI rework (INBOX 410).

## Placed from INBOX, 2026-10-05 (OPEN.md triage)

- ~~The Chat tab's Ask mode ignores `grounding_live`~~ Built 2026-10-05 (HISTORY.md, "Moved from the plans, 2026-10-05 (backlog-1005)").
- The placed lists' triage pass and the question hover row: built 2026-10-05
  (HISTORY.md, "Moved from the plans, 2026-10-05 (op3-1005)").

## Placed from INBOX: the composer everywhere (the owner, 2026-10-06)

Verbatim: "I also want to use the composer basically really good sentence
model like an ai or apple's siri really smartly to improve quality of life
across the app. I need it perfect and I want to integrate it, like with the
companion message bubbles, or other things I havent thought of."

After INBOX 725 (the composer at chat-bot quality), one shared sentence
engine (`ai/composer.py`), the notes' own words joined by meaning, no model
needed, used wherever the app speaks:

1. **Companion bubbles**: what the companion says about the notebook (a
   resurfaced note, a pattern this week, a reminder due, an empty day) is
   composed from the notes, with its source one tap away; rate-limited, never
   twice the same, quiet when the person is typing.
2. **Dashboard greeting and digest**: today's line, the week in review and
   "on this day" written by the composer instead of fixed templates.
3. **Toasts and confirmations** that name the thing ("Moved Passport renewal
   to the bin; it was linked to 3 notes").
4. **Search and Find anything**: a one-line answer above the results when the
   query is a question.
5. **Note and document helpers**: a summary line on a long note, "what links
   these two notes" on a link, a title suggestion from a note's own words.
6. **Reminders and meetings**: the action items and decisions read back as
   sentences; a reminder's notification says why it matters, from its note.
7. **Tidy and filing**: every reason ("filed under Work because…") in one
   voice.

Rules: the 725 constraints (every fact quoted or measured, a fixed tested
phrasebook, offline, deterministic) hold everywhere; one style guide for the
app's voice in DESIGN.md; each surface gets a measured eval like 725's.

Addenda, the owner, 2026-10-06, verbatim: "also the composer could be used to
write better and cheaper followup questions, suggested search results, auto
fills, suggested stuff and more"; "the composer can assist the ai and
complement features"; "the ai still should be used as the chat bot when it is
available". So:

8. **Cheap suggestions**: follow-up questions, suggested searches, autofill
   (titles, tags, reminder wording, link reasons) composed first; a model is
   asked only where it adds something the composer cannot.
9. **The composer assists the model, never replaces it**: when a model is
   running it is the chat bot; the composer supplies the grounded material
   (the selected sentences, their order, the measured values) as the
   model's context, checks the model's answer against the notes, and fills
   in instantly while the model streams. With no model, the composer answers
   on its own (INBOX 725).

**North star for the composer** (the owner, 2026-10-06, verbatim): "I want the
composer to be soooo good that users dont even need to install ai ... some of
my friends dont like ai and probs wont want to install a local model so I want
it to be the best and most capable and well spoken, coherent, well made
composer the world has seen." Next session: the Phase 5 rows and
`agent-remaining/composer725-1006.md` (link reasons from sentence pairs, the
composer feeding a running model, "the composer acts"), each measured on the
725 eval. The owner may run this phase with a Fable planning pass later, by
their own call when usage allows (standing order 4 bars Fable agents unless
the owner says otherwise).

10. **The composer writes for the model and the agent, not only for the
    person** (the owner, 2026-10-06, after reading one of this harness's own
    templated system notices: "maybe the composer could be used to help
    streamline, and assist in agent tasks and ai tasks and responses??").
    Deterministic, templated text where a small model is weakest:
    - **Context packs**: the notes a model reads arrive as a composed brief
      (who, what, when, the measured counts, quoted sentences with ids), not
      raw note dumps; fewer tokens, less to misread.
    - **Tool results**: each agent tool's result is summarised in one fixed
      shape ("Done: tagged 3 notes #trip. Not done: 1, it is private.") so the
      model's next step reads a clean state, and the person sees the same line.
    - **Guard notices**: the agent's own rails (what it may not do, what needs
      confirming, what came from a note rather than the person) as fixed,
      tested wording, the way this harness frames external content.
    - **Progress and run digests**: the Agent activity panel and run history
      written by the composer from the run's events.
    Measured on the agent evals (`pytest -m evals`) with a small local model:
    task success and tokens per task, before and after.

