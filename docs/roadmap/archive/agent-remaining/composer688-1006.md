# composer688-1006: a composed answer from the notes, toggled in Ask

INBOX 688 (the owner, 2026-10-06): "is there a way to do very good imitations
of ai responses but using string concatenation with the app when the ai isnt
available with the option to toggle between them in the ask subtab?? it needs
to be VERY refined and well worded and designed". Worktree
`agent-af46af752e57238b0`, merged from `claude/mini-release-0.4.1`.

## The rule (the notebook's integrity, from the brief)

Every factual clause in a composed answer is either the person's own words (a
quoted or lightly trimmed sentence from a note, cited) or a number or date the
app measured. Only connective tissue comes from templates. No paraphrase, no
invented claim, no stitched half-sentences.

## Audit: what exists (2026-10-06)

- `ai/extractive.py` (INBOX 269): the no-model answer. One passage per note
  (`grounding.best_passage`, BM25 over 40-word windows inside the note), at
  most four, cut at 320 characters, under one fixed lead ("No model is running,
  so this is not a written answer..."). Grounding rows are exact (the claim is
  the passage). Reached from `routes_chat._plain_events` only when no model
  runs; `recent()` answers a recency question with the newest notes.
- `ai/grounding.py`: `best_passage`, `split_sentences`, `_meaningful_terms`,
  `support`. A passage is a word window, not a sentence, so it starts and
  ends mid-thought and swallows the note's `# heading`.
- `ai/notebook_stats.py`: count and shape questions ("how many notes", "most
  common tags") answered from SQL before retrieval; already instant and exact
  with no model, and it stays first.
- `search/query.py` `understand()`: the time phrase lifted out (since, until,
  `when_phrase`, soft "recently") and the subject with the scaffolding
  stripped. No question shape (what/when/who/how many/compare/why).
- Frontend: `askQuestion` (capture-ask.js) streams the answer, renders it with
  `renderMarkdown`, and places the citation markers by matching each grounding
  row's letters inside the rendered text (`addInlineCitations`), so any
  markdown (headings, bullets, bold) keeps its markers. The chip in the answer
  head (`#answered-by`) says "chat model offline". No way to choose the
  no-model answer while a model runs.
- A finding beside it: `_stream_lines` re-grounds every answer after
  `_plain_events` returns, so the extractive answer's exact rows were replaced
  on the client by the approximate ones a model answer gets (the last
  `grounding` event wins). The composer's rows are kept exact (below).

## How it reads today (seeded notebook, no model)

`scratchpad/ui-sweeps/seed-showcase.py` on a fresh data dir, the ten
questions in `scratchpad/composer688_ask.py`. Every answer opens with the same
two-line apology, then raw passages:

1. "What is the Harbor launch plan?": the plan's passage with its heading glued
   on ("Harbor launch plan Ship the mobile app...") and the checklist
   flattened ("- [x] Beta invite list - [x] Crash reporting"), then the Q4
   roadmap and the launch email passages. No lead, no structure.
2. "When is the dentist check-up?": "Dentist Check-up booked for the 21st. Ask
   about the night guard." The date is there; nothing says it is the answer.
3. "Who asked for a public API?": the right sentence, plus the whole launch
   plan passage, unrelated.
4. "How many beta testers are active?": "41 testers active" buried mid-passage
   behind the heading, plus an unrelated idea note.
5. "Which books am I reading?": the reading list flattened to one line of
   dashes.
6. "Compare Lisbon and Porto": four passages in score order (flights, the
   overview, trains, Lisbon); nothing about Porto on its own, no pairing.
7. "Why did the list feel slow?": the right note, then a podcast on "slow
   productivity", the reading list and a running note, all on the word "slow".
8. "What is the latest on the sync rewrite?": four passages, not ordered by
   date, one about the onboarding rewrite.
9. "Does Harbor work offline?": five passages, the closest one first; no
   attribution, the rest padding.
10. "What hotel did I book in Porto?": four Porto passages and no word that no
    note mentions a hotel.

Read as a whole: honest, cited, and reads like a search results page with an
apology on top. The four faults: passages, not sentences (headings and lists
mangled); no lead; no shape (dates, numbers, pairs, recency ignored); and
silence about what the notes do not say.

## Built (2026-10-06)

- `ai/composer.py`: shape (`classify`: what, when, who, count, list,
  compare, explain, status, yesno, recent), sentences and list items with
  offsets (`read_note`, discourse words trimmed, long ones cut with an
  ellipsis), BM25 over the sentences of the notes found plus heading, tags
  and category, shape cues and rank, note coverage over half the question's
  words, near duplicates dropped, a sentence leaning on the one before it
  brought with it. Composition by shape from `PHRASES` only; every part
  tagged (template, quote, title, measure, asked) and held to the notes by
  `assert_traceable` in `tests/test_composer_688.py` (100 tests).
- `/chat/stream`: `answer_from: "notes"` (or no model) on a notes-only turn
  composes; `meta.composed`; exact rows kept (the extractive answer's too:
  the second grounding pass used to replace them); no trim, no agent, no
  follow-ups (`tests/test_composer_route_688.py`, 7 tests).
- Ask: `#ask-source-seg` (AI, From your notes) and its '?', wired by lazy
  `ask-compose.js` (prefs "ask-answer-from", AI disabled with its reason
  when no model, following the status poll through `#ask-offline`); the chip
  reads "Your notes, no AI" (title "Composed from your notes, no AI: ..."),
  the lead quote in ink (`.answer-composed`). The Questions view moved to
  lazy `questions-view.js` to pay for it: the boot scripts went from 320,251
  to 318,884 bytes gzipped (cap 320,300).
- Help: the `answers-from-notes` topic (Asking Atlas), the ask-chat body,
  the '?' popover.
- Sweep `scratchpad/ui-sweeps/composer688.js`, light and dark, 1440 and 390:
  no console errors, switch state and toggle, every answer composed and
  labelled, every marker on a note in Matching records, no overflow, the
  quote in ink, the chip unclipped. All clean.

## The ten questions after (seeded notebook, no model)

#### What is the Harbor launch plan?

Your note **Harbor launch plan** says:

> Ship the mobile app to the public on the 14th of next month. Three gates before then: beta feedback closed, the onboarding rewrite merged, and the pricing page signed off.

- [x] Beta invite list
- [x] Crash reporting
- [ ] Store listing copy
- [ ] Launch email

Across two more notes, from 5 September to 12 September:
- **Q4 roadmap** (12 September): Three workstreams: Harbor launch, the sync rewrite and the support backlog. Harbor gets two thirds of the team until launch week, then the sync rewrite takes over.
- **Onboarding rewrite** (5 September): Draft screens are on the launch board.

(cites 3 notes)

#### When is the dentist check-up?

The date is in your note **Dentist**:

> Check-up booked for the 21st.

(cites 1 notes)

#### Who asked for a public API?

From your note **Public API, maybe**:

> Three people in the beta asked for one. Not before launch. Write down the read-only version so the idea is not lost.

(cites 1 notes)

#### How many beta testers are active?

The figure is in your note **Beta feedback, week 2**:

> 41 testers active. The top complaint is the sign-up flow (nine fields).

One more note, from 19 September:
- **Offline as the headline** (19 September): Beta testers did not know Harbor works offline.

(cites 2 notes)

#### Which books am I reading?

From your note **Reading list**:

- Designing Data-Intensive Applications
- The Mom Test
- A Pattern Language
- Ways of Seeing

Across three more notes, from 2 September to 28 September:
- **Designing Data-Intensive Applications** (25 September): Leaderless replication and read repair.
- **Four Thousand Weeks** (28 September): Pairs well with the systems book.
- **Teach what I just learned** (2 September): Write a short post after each book: the one idea I would keep. It forces the reading to be active.

(cites 4 notes)

#### Compare Lisbon and Porto

What your notes say about each, side by side.

**Lisbon** (one note)
- Alfama for the walk-everywhere feel, but the hills are steep with luggage. (**Lisbon, where to stay**)
- Príncipe Real is quieter and close to the metro. (**Lisbon, where to stay**)

**Porto** (three notes)
- Hire a car in Porto. (**Douro valley**)
- Ribeira at sunset, the Livraria Lello early or not at all, and a port lodge tour across the bridge in Gaia. (**Porto, three days**)
- Pastéis de nata at the Belém bakery, bifana from a counter, francesinha in Porto once, grilled sardines anywhere with a queue. (**Things to eat**)

**Both together**
- Lisbon to Porto on the Alfa Pendular, 2h50. (**Trains**)
- Out to Lisbon, back from Porto, so no day is lost going back. (**Flights**)

(cites 6 notes)

#### Why did the list feel slow?

Your note **Why the list felt slow** says:

> It was not the database. Every row re-measured its own height on scroll. Caching the height per row took a long list from 40ms a frame to 6.

(cites 1 notes)

#### What is the latest on the sync rewrite?

The most recent, written 25 September, is **Designing Data-Intensive Applications**:

> Chapter 5 on replication is the one to reread before the sync rewrite.

**Earlier**
- 12 September, in **Q4 roadmap**: Three workstreams: Harbor launch, the sync rewrite and the support backlog. Harbor gets two thirds of the team until launch week, then the sync rewrite takes over.
- 29 August, in **Sync rewrite, first notes**: The conflict rule is last-writer-wins today, which silently drops edits. Proposal: keep both versions and ask, the way a document merge does.

(cites 3 notes)

#### Does Harbor work offline?

The closest your notes come is **Offline as the headline**:

> Beta testers did not know Harbor works offline.

One more note, from 21 August:
- **Beta feedback, week 2** (21 August): The top complaint is the sign-up flow (nine fields). Second is that offline mode is hard to find.

(cites 2 notes)

#### What hotel did I book in Porto?

Your note **Flights** says:

> Out to Lisbon, back from Porto, so no day is lost going back. Booked, seats 14A and 14B.

One more note, from 22 September:
- **Trains** (22 September): Lisbon to Porto on the Alfa Pendular, 2h50. Tickets open 60 days ahead and are half price if booked early.

None of these notes mention “hotel”.

(cites 2 notes)

## Not verified

- Against a running model: AI chosen with a model up is covered by the route
  test's fake only; the switch with a real model was simulated (`aiIsOff`
  stubbed) in the sweep.
- At 1024 the Ask head now wraps to two lines (title, then the switch,
  model, History): measured, judged acceptable, not reviewed by the owner.
- Retrieval decides which notes the composer sees; a question whose notes
  retrieval misses is answered from what it found.

## Found, not fixed

- At 390 the Ask head's model picker sits on its own short line (224px of
  330), pre-existing.
- "Ask all notes" (`#ask-scope-clear`) is wired only once the Questions view
  has been opened, pre-existing (the scope is only set from there).
