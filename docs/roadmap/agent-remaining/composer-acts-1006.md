# composer-acts-1006 (CHAT_PLAN Phase 5 (f), item 10 tool results and guard notices)
Status: stopped at 98% usage; no step landed. Uncommitted in worktree agent-a376cf0bfb09ff1a0:
- tests/test_composer_commands.py: 56-phrasing parse table (intent + args), accuracy test, capability line test. Not yet run.
- src/memorymap/ai/commands.py: parse (6 verbs, no model), plan (confirm event with `steps`, `skipped`, `items`), run (via tools.execute_tool; undo list; bin_reminder/start_meeting own steps). Imports ai/tool_summary.py, which does not exist yet.
Next, in order:
1. ai/tool_summary.py: `summarise(done_clauses, not_done)` -> "Done: tagged 3 notes #trip. Not done: 1, it is private."; `done_clause(name,args,result)`, `not_done(skipped)`, `GUARD` dict (confirm_person, agent.AWAITING_CONFIRMATION note, private, fence.FENCE_RULE) with exact-wording tests. Then run tests/test_composer_commands.py and fix parse misses.
2. routes_chat.py `_stream_lines`: before `_prepare`, if no model and not notes_only/skill: parse; write verbs (both modes) and find/open (Agent mode) -> meta (composed False), confirm/tool event, answer line, done. Agent mode (body.use_tools explicitly True), no model, no needle, unparsed -> commands.CAPABILITY_LINE. New POST /chat/commands/run {steps, skipped} -> commands.run.
3. agent._run_and_record: add result["summary"] for write tools (check agent tests for exact-payload asserts).
4. Frontend: status.js renderChatModeSeg stop greying Agent with no model (new title); chat-attach.js effectiveUseTools = toggle only; onConfirm: event.steps -> lazy chat-commands.js `renderCommandCard` (same .tool-confirm card, Confirm posts /chat/commands/run, chip shows summary, Undo posts undo steps, open meeting via openMeetingSheet). Gzip headroom only 152 bytes (TOTAL 320148 of 320300): keep eager edits net-negative.
5. Help (order 13): help_chat.py Agent mode topic, data-help-for on chat mode, test_manual_parity; CHANGELOG both files; browser check port 8822, /tmp/mm-b1.
Found-not-fixed: when._CLOCK reads "book 2 flights" as 14:00 (Magic add too); tag_note's batch undo {"tool":"batch"} 404s on /chat/tools/execute (changeRow posts it as a tool name).
