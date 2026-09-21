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

- **The Help topics accordion cannot grow a row.** The status bar entry was
  added to `#settings-help` beside the corpus entry and then reverted:
  `test_ui_recipes.py::test_a_folded_group_of_settings_is_the_shared_disclosure_recipe`
  caps bare `<details>` in `index.html` at fourteen and the count may only
  fall, and thirteen of those fourteen are this accordion's own topics. They
  are not undressed: `.help-accordion details > summary` is a real family in
  `08-consistency.css`, and the ratchet counts the class on the element, so it
  cannot see a disclosure dressed by its container. Giving the new row
  `settings-fold` to satisfy the count is not free either: that class adds
  `margin: 0.5rem 0` to the summary (`03-dashboard-widgets.css:705`), so the
  row would sit 8px further apart than its thirteen siblings. The fix is to
  convert the accordion's thirteen to the named family in one commit, which is
  a visual change across the whole list and wants measuring, not a line in
  this task. Until then the corpus can cover a surface the Help list does not,
  which it already does for twenty others.

## Traps met here

- `ai_client` gives a working fake model, so a test of the no-model path
  must use the plain `client` fixture or it asserts against the fake's
  canned reply.
- The onboarding overlay intercepts the click on `#status-guide` on a
  fresh data dir; `#onboarding-skip` exists but is hidden afterwards, so
  the probe checks visibility, not presence.
