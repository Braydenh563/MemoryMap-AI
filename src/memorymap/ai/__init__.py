"""The notebook's AI.

`AI_NAME` is the one place the assistant's name is written down (INBOX 225).
It is a **theme, not a persona**: one clause at the head of the prompts that
speak as the app, and nothing else. No backstory, no tone instructions, no
"you are helpful and friendly". The reasons are the same two this project
keeps running into:

* Every character of persona is resent on every round of every turn and is
  never trimmed to fit the window (`agent.PROSE_BUDGET_CHARS`), so a
  paragraph of character notes is paid for by a 3B model's context on every
  single message.
* A persona with opinions competes with the instructions that matter. The
  grounding rule, the tool contract and the recovery hints are what decide
  whether an answer is right; a name is what makes the app feel like one
  thing rather than four surfaces that each say "the assistant".

A user's own persona (Settings, Personas) replaces the default outright and
is not decorated with this: that text is the user speaking, not the app.
"""

AI_NAME = "Atlas"
