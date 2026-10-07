# composer-voice-1006: the composer's voice and understanding (INBOX 741)

Stopped by a container restart, not finished. Written by the orchestrator.

## Merged to main
64f3414 (no "your note starting with ... says"), 9a5b7de (casual and indirect
questions, synonyms, where, yes/no), 70bbc86 (two or three questions in one
message), e1c60e1 (typos, text-speak, follow-ons, length, small talk),
31ca129 (eval: 90 more questions with variety and readability scores),
4ce571a (slang table, keyboard-aware typo repair, run-together words, meaning
fallback), faf6686 (conversational turns answered in kind, Did you mean, a
clarifying question when nothing is found). Its tests are
`tests/test_composer_voice_answers.py` (renamed on merge: the everywhere
agent's `tests/test_composer_voice.py` has the same name) and
`tests/test_composer_voice_turns.py`.

## Not merged
`wip/composer-voice` (31243bd): the step in progress at the restart, about 20
lines of composer.py, 12 of tests, and a browser sweep
`scratchpad/ui-sweeps/voice741.js`. Not gated. Run its tests and the gate,
then merge.

## Remaining
1. The eval numbers for the whole track (before and after) were not reported:
   run `tests/_composer_eval.py` and record them here.
2. Browser check of Ask and Chat with no model (the sweep above), light and
   dark, 1440 and 390: the Did you mean chip and the clarifying question.
3. The noisy-question set's coverage (owner: "any and ALL typos ... all
   slang"): what is still missed, from the eval.
