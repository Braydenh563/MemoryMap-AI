# Agent: the Atlas guide, INBOX 304

Worktree `.claude/worktrees/agent-guide` on `worktree-agent-guide`, cut
from `claude/open-sections-a-b`. Port 8803, data dir `/tmp/mm-guide`
(`bash scratchpad/ui-sweeps/serve.sh 8803 /tmp/mm-guide`).

INBOX 304 is fixed and moved to HISTORY's "INBOX resolved", with the
measurement for each of its three causes. Nothing below blocks it.

## Done

Commits `59985b9`, `322b7b9`, `b71f56b`, `8e44c13`, `d22ed70`.
`tests/test_help_chat.py` is the gate: 63 tests, and eight of them are new
and hold the guide to its job rather than to its retrieval code (a topic
per surface, the same through `/help/ask`, the sources named for a question
that names its subject, plural to singular, every offered question
answerable, the model copy, the composer not gated).

## Remaining, none of it started

- **The corpus is thirty-two hand-written paragraphs kept in step with the
  Help accordion by hand**, which `help_chat.py`'s own header calls the
  thing to re-check first when a feature changes. Nothing checks the two
  against each other. A lint that compares the accordion's `.help-body`
  text against `HELP_TOPICS` bodies, even loosely (every topic id has an
  accordion section and vice versa), would catch the next drift. Not
  attempted here: the accordion is static HTML with no ids to key on, so
  the lint needs the accordion marked up first, which is a change to
  `index.html` this task had no reason to make.
- **Retrieval is keyword matching and nothing else.** It is now
  inflection-tolerant, which was the reported fault, but a question with no
  shared word still reaches nothing: "how do I stop it nagging me" finds no
  reminders entry. The offline path makes that a real dead end rather than
  a model's chance to paraphrase. A synonym column per topic is the cheap
  next step; embeddings over thirty-two paragraphs would be the thorough
  one and the app already has an embedding service.
- **`MAX_TOPICS` is 3 and `_matching_topics` ranks by how many keywords
  hit, with ties broken by table order.** A question naming two features
  gets both plus whatever is third, unranked by relevance. Not measured as
  a fault; noted because the tie-break is positional and the table's order
  is historical.
- **The offline reply is the topic paragraph verbatim.** Measured in the
  browser it reads well for one topic and would read as a wall for three.
  Worth a look at what three matched topics look like in the panel.

## Traps met here

- `ai_client` gives a working fake model, so a test of the no-model path
  must use the plain `client` fixture or it asserts against the fake's
  canned reply.
- The onboarding overlay intercepts the click on `#status-guide` on a
  fresh data dir; `#onboarding-skip` exists but is hidden afterwards, so
  the probe checks visibility, not presence.
