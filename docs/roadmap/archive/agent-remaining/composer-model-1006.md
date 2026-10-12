# composer-model-1006: the composer assisting a running model

Stopped early (owner at 98% weekly usage). Backend of CHAT_PLAN Phase 5 (a) and "the composer everywhere" 9/10 (context packs) built.

- Built: `composer.brief` (notes cut to the parts on the question, every composed-answer quote kept, attached/documents whole); `librarian.BRIEF_HEADER` + `briefed` marker in `note_for_prompt` (names `get_note` with tools); `routes_chat._assist` feeds the brief to the plain path and `agent.run_agent`, and yields `composed_preview` {text, grounding, next} before the model's first token; stats `composition.notes_brief` {before, after}. Tests: `tests/test_composer_brief.py`; eval: `tests/_composer_eval.py` `context_rows`/`context_summary`.
- Measured (25 showcase questions, chars/4, unbudgeted `build_messages`): prompt 18,883 to 15,613 tokens (17.3%), notes message 14,626 to 11,358 (22.3%); 24 of 25 briefed. Showcase notes average 129 chars, so this is the floor.
- Remaining, in order:
  1. Frontend: draw `composed_preview` as a draft in Chat (`chat-attach.js` stream loop, near line 1922) and Ask (`capture-ask.js` near 2634), replaced on the first `answer` delta; lazy module per the gzip ratchets; recipe row in DESIGN.md if new.
  2. "Your notes, no AI" label on a composed Chat bubble (Phase 5 c), as Ask's `setAnsweredBy` (`capture-ask.js` 2238).
  3. chat.js 425: show `composition.notes_brief` in the window meter's tooltip.
  4. Ledger composer725-1006 items 1, 2: Chat chips (`offerFollowups`, `refreshFollowupVisibility` in chat-attach.js 2574-2650) and an Ask chip click, in the browser (serve.sh 8821, /tmp/mm-a1).
  5. Help (order 13) once the UI lands; Guide topics name the preview.
- Not verified: any browser behaviour; a real model's answer quality on the brief (fake transport only); agent turns with the brief (get_note marker untested against a real model).
- Found, not fixed: a titled note's every sentence scores on its title (`_score` TITLE_WEIGHT), so the brief keeps up to 4 dated sentences of a note named for the subject.
