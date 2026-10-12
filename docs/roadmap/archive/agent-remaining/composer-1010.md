# composer-1010: INBOX 787, the composer and the Guide (2026-10-10)

The owner: "make the composer better please :)"; "the composer is still pretty
barebone, has no life to it and I may as well just ignore it and use the
matching records". Decisions 63 (the Guide) and 64 (the overview) in
CHAT_PLAN section 4 of "The deterministic foundation".

## Measured: 20 questions on an owner-like notebook, no model

Notebook: 24 notes (ideas, games, uni subjects, three pictures with captions
and multi-line OCR text, people, a checklist), seeded through `/entries` with
`MediaUpload` rows, asked through `/chat/stream` with no model
(`scratchpad/cmp/harness.py` in the session scratchpad; base answers from
commit c4aee459e, after from this branch).

Rubric, one point each, 8 a question: R1 answers in the first sentence; R2
groups by theme or time (a single fact answered from one note scores 1); R3
says counts and dates; R4 quotes short and clean (no heading run into the
next quote, no cut reading); R5 no raw caption or OCR dump ("shows The image
shows", `text in it: "Ranked Solo/Duo.`); R6 no garbled "you" rewriting; R7
reads as prose a person would write (no "[your note, X]" between sentences,
no stock filler such as "That may be a hobby forming"); R8 a next question
that follows from the notes (an echo of the subject, "What is the latest on
assignment due?", scores 0). Scored by the agent that built it, not blind.

| # | Question | Before | After |
| --- | --- | --- | --- |
| 1 | ideas for projects | 2 | 8 |
| 2 | games notes | 1 | 8 |
| 3 | what did I write about uni | 3 | 8 |
| 4 | what am I working on | 4 | 8 |
| 5 | what did I write last week | 7 | 8 |
| 6 | what did I write in August | 4 | 8 |
| 7 | who is Jake | 3 | 8 |
| 8 | what did Priya say | 5 | 8 |
| 9 | what are my app ideas | 3 | 8 |
| 10 | what do I know about League of Legends | 4 | 4 |
| 11 | when is my assignment due | 6 | 6 |
| 12 | what is on my feature list | 1 | 7 |
| 13 | what games do I want to try | 6 | 6 |
| 14 | what did I do in September | 4 | 8 |
| 15 | summarise my uni notes | 3 | 8 |
| 16 | what do I have on spaced repetition | 7 | 7 |
| 17 | how many notes about games | 3 | 8 |
| 18 | what is my rank in league | 3 | 7 |
| 19 | when is Jake's birthday | 6 | 6 |
| 20 | what did I note about binary search trees | 3 | 7 |
| | **Total (of 160)** | **78** | **146** |

Counts over the 20 answers: caption or OCR dumps 12 to 0; "[your note, X]"
markers 22 to 6; next questions offered 14 to 34; quoted rows 57 to 114;
decision 52's maxims findings 2 to 0; grounded parts (`trace_failures`) 0
failures on the new tests.

### Before and after, word for word

"games notes", before:

> Games to try: Hollow Knight, Hades, Celeste. Hades is on sale until Friday. [your note, 9 September]
>
> Idea: a game mod that adds a co-op mode to Stardew Valley. Probably too big for now, but fun to think about. [your note, 20 August] The picture in your note from 5 September shows The image shows a screenshot of a game statistics screen with a win rate graph.; text in it: "Ranked Solo/Duo.

After:

> There are six notes on games, from July to September; League comes up in three of them.
>
> **League**
> - 17 July: League of Legends. You hit Gold 2 this season.
> - 2 August: Tilted after three losses in a row. Rule: stop after two losses.
> - 5 September: a screenshot of a game statistics screen with a win rate graph, with the words “Ranked Solo/Duo”.
>
> **Also**
> - 20 August: Idea: a game mod that adds a co-op mode to Stardew Valley. Probably too big for now, but fun to think about.
> - 24 August: Minecraft server with Jake and Sam. We are building a castle on the north island.
> - 9 September: Games to try: Hollow Knight, Hades, Celeste. Hades is on sale until Friday.
>
> Gold is in two of these notes.
>
> Next: What did I write about League? / What did I write about Gold? / What is the latest on games?

"what did I write about uni", before:

> Uni timetable: COMP1511 on Monday and Wednesday, MATH1131 on Tuesday, and a stats tutorial on Thursday at 2pm. [your note, 1 September]

After:

> Your notebook holds six notes about uni, all from September; COMP1511 is in three of them.
>
> **COMP1511**
> - 1 September: Uni timetable: COMP1511 on Monday and Wednesday, MATH1131 on Tuesday, and a stats tutorial on Thursday at 2pm.
> - 15 September: COMP1511 week 3. Pointers are variables that store memory addresses.
> - 25 September: Group project for COMP1511 with Priya and Jake. Priya is doing the parser, you are doing the tests.
>
> **The rest**
> - 12 September: The determinant is zero when the matrix is not invertible. Quiz 2 is on 22 October.
> - 18 September: STAT tutorial: the central limit theorem says sample means are roughly normal for large samples. Tutor is Dr Patel.
> - 22 September: a lecture slide about binary search trees with a diagram, which reads “Binary Search Trees”.
>
> MATH1131 is in two of them.
>
> Next: What did I write about COMP1511? / What did I write about MATH1131? / What is the latest on uni?

## The Guide, driven in Chromium (port 8846, fresh data dir)

"hey": "Hi, I'm Atlas, the app's guide. Ask me where a feature lives, what a
setting does or how to do something here. Three to start with:" and three
starter chips, no topic, no Go to button. "how do I set a reminder?": two
tabs, Atlas's answer selected, "It takes three steps, from the Reminders
tab:" and the three steps, then "From the app's help, with no model running.",
with Go to Reminders; From the help shows the topic word for word. No page
errors.

## Left, one line each

- A broad frame ("what do I know about X", "what do I have on X", "how many notes ...") keeps INBOX 729's answer unless its notes are filed under the subject more than they say it (`composer._overview_over_broad`; the 725 and 741 evals hold that answer). So "what do I know about League of Legends" still quotes one sentence (4 of 8): the next step is the overview's body under the 729 lead, measured on both evals.

- Single-note answers still end "[your note, 9 September]" (decision 18 and INBOX 741's citation for an untitled note); the owner's "games notes" shot named it. Recommendation: an untitled note's citation as its day in the bubble's own muted style. `composer.py` `_Answer.cite`.
- "when is my assignment due" offers "What is the latest on assignment due?": the subject keeps the asking word "due". `composer.py` `_next_questions`.
- "what is my rank in league" leads "Looking at your notes: The picture ... reading “Ranked Solo/Duo”, “Gold II”": the value is there, not said as the answer; the 17 July "I hit Gold 2" is not quoted. `select` and `_opening`.
- An overview counts the notes the route read (keyword and tag, 24 at most, `routes_chat.OVERVIEW_LIMIT`); past 24 it should say "at least". `composer._overview_lead`.
- Threads are names (capitalised after a lower-case word, or a heading's first word two notes share); with an embedder running, meaning could group notes that share no name. `composer_overview.themes`.
- A list note whose entries are not all sentence case is said with semicolons and its capitals ("a list: A habit tracker ...; A Discord bot ..."); decision 18 keeps the person's casing. `composer._overview_line`.
- The help text of Reminders gained steps; most topics have none, so a how-to answer leads with the topic's best sentence. Steps for the top twenty how-to topics would lift the Guide most. `help_topics_more.TOPIC_META`.
- Not verified: the overview with a real embedder, with the professional voice in a browser, at 390 px, and the picture notice in a browser (no fixture answer is mostly pictures now).
