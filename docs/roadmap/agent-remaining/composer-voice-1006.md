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

## Merged after the restart
`wip/composer-voice` (31243bd): the step in progress at the restart, tests green on merge, about 20
lines of composer.py, 12 of tests, and a browser sweep
`scratchpad/ui-sweeps/voice741.js`. Not gated. Run its tests and the gate,
then merge.

## Remaining
1. The eval numbers for the whole track (before and after) were not reported:
   run `tests/_composer_eval.py` and record them here.
2. Browser check of Ask and Chat with no model (`scratchpad/ui-sweeps/voice741.js`, kept on branch `wip/composer-voice` only, under the scratchpad cap: `git show wip/composer-voice:scratchpad/ui-sweeps/voice741.js`), light and
   dark, 1440 and 390: the Did you mean chip and the clarifying question.
3. The noisy-question set's coverage (owner: "any and ALL typos ... all
   slang"): what is still missed, from the eval.

## Vocabulary expansion (2026-10-06, the owner: "just expand its vocabulary")
Built (commits 3df6d27, 118aa18, and the Settings commit after them):
- `question_noise.py`: SLANG 255 to 847 entries (second table: misspellings and
  text-speak across time, money, work, study, health, travel, home, people,
  feelings, tasks, places); SOCIAL words 130 to 253, SOCIAL_PHRASES 81 to 227.
- `ai/composer_tables.py` (new, data only): voices `natural` (default) and
  `professional`, `VOICE_VARIANTS` per phrase key; PHRASES 99 to 341;
  SYNONYM_GROUPS 20 to 148; LEAD_INS 30 to 65 (bare 7 to 28); wrappers 12 to 35;
  contractions 2 to 11; compare patterns 3 to 12 (than, compared with, pros and
  cons, differs from, comparison of); comparison words are asking words; social
  lines 34 to 68 plus a professional set; next steps 3 to 9 plus professional.
- `compose(..., voice=)` and `social(..., voice=)`; preference `composer_voice`
  (Settings, Personas, Answer style, `#pref-voice`, help `composer-voice-help`,
  Guide topic `answer-style`); routes_chat reads it.
- Tests: `tests/test_composer_tables.py` (every variant, synonym group, wrapper,
  compare form, lead-in and social line), `test_question_noise.py` (every slang,
  social word and phrase). Browser sweep `scratchpad/ui-sweeps/voice1006.js`.
Numbers, before to after: grounded 1.0 to 1.0 (both voices); distinct openers
11 to 15 (showcase), 18 to 38 (90-question voice set); connectives distinct
33 to 41; noisy set hand 83/85 to 83/85, derived 301/303 to 301/303; kind right
90/90 and 77/77 turns unchanged; distinct small-talk replies 36 to 65.
Left: other languages' wrappers; professional variants for the next-question
chips and the citation phrases (`mention_*`, `lists`, `echo`, which are tied to
their grammar); the Settings row checked in Chromium at 1440 and 390 on the
light theme only (dark not run); `scripts/gate.sh --staged` run on the first
two commits, run again for the last. static-compression total is 2 bytes under
its cap: any JS added next needs a trim elsewhere.
