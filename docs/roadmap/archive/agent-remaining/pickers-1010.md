# pickers-1010: what is left

Branch agent/pickers-1010, three commits (the "/" table preview, the "[[" note preview, the Questions headers and stale fragments).

- INBOX 784 parts 4 and 5 and all of 785 are built and measured; INBOX.md in this branch does not hold items 784 or 785 (they exist only in the main checkout's staged INBOX), so the orchestrator resolves them there (`python scratchpad/inbox_resolve.py 785`; 784's other parts belong to the uipolish agent).
- Brief item 3 asked for "two questions, each whole" from the owner's ice-breaker sentence. INBOX 745 (b) decided that quoted prompts are not the person's own questions, so the extractor keeps rejecting them (tests/test_questions_own.py `test_a_quoted_prompt_pair_gives_no_fragment_and_no_question`); the fix is that stale rows stored by the pre-fix rule no longer reach the list. If the owner wants quoted prompts kept as questions, that is a reversal of 745 (b), not a bug fix: facts.py `own_question` (the quote tests) and `_sentence_spans` (closing quote kept with its sentence, which changes claim fingerprints).
- The preview of "/" blocks is hidden below 704px wide, so the table preview fix has no phone surface; verified only at 1440 (light and dark).
- Real attached-image notes (an `attachments` image rather than an inline `![](...)`) use `attachmentObjectUrl` in `notePickThumb` (note-pick-preview.js); only the inline path was driven in the browser.
- A sticky group header stacks with its siblings at the same offset (the later one paints over the earlier on an opaque ground); checked by rects at 1440 and 390, not with a screen reader.
