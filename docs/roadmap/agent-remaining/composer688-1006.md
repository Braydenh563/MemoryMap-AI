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

## Plan (the brief's five steps)

1. `ai/composer.py` beside extractive.py: question shape, sentence selection,
   composition by shape, fluency templates; pure and deterministic, tests first
   with a traceability checker.
2. The route: `ChatRequest.answer_from`; a notes-only turn with "notes", or
   any notes-only turn with no model, gets the composed answer with exact
   grounding, `meta.composed`, no model call.
3. Ask: a `.seg` "AI" / "From your notes" in the Ask head, per device
   (`prefs`), AI disabled with the reason when no model runs; the chip reads
   "From your notes" with "Composed from your notes, no AI".
4. Help surfaces, CHANGELOG, the sweep, the after answers below.
