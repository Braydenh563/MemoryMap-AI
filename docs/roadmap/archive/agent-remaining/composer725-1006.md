# composer725-1006: the no-model composer, as close to a chat bot as the rule allows

INBOX 725 (the owner, 2026-10-06). Worktree `agent-a6f5b97356c68dcbd`, merged
from `claude/mini-release-0.4.1`. Commits: cdff33e (eval), 0f2c602 (composer),
745a3b8 (Chat, chips, follow-ons, Agent mode gate). INBOX 725 stays open:
the items below are not built.

## Measured (tests/_composer_eval.py, 25 questions, showcase notebook)

| Measure | Before | After |
| --- | --- | --- |
| Grounded clause ratio | 1.0 | 1.0 |
| First line answers the question's shape | 1 of 25 | 25 of 25 |
| Redundancy, mean / max (token Jaccard) | 0.096 / 0.267 | 0.105 / 0.333 (same-note sentences; no duplicate) |
| Mean words a sentence | 7.3 | 8.0 |
| Joining phrases an answer / distinct | 3.2 / 27 | 3.6 / 44 |
| Words an answer | 54.0 | 51.2 |

Browser (seeded showcase, no model, 1440 and 390): `composer688.js` clean;
the session sweep: Ask chips drawn, "tell me more" answers with a sentence
not said before, Chat box and Send enabled, Agent mode greyed with its
reason, the banner reworded, Chat composes with 6 markers, no console error,
no sideways scroll.

## Remaining, in order

1. **Chat's next-question chips not seen in the browser.** The composed
   Chat answer reached the page with its markers, but the sweep found no
   `.chat-followups button`; the event carries `next` (route test) and
   `offerFollowups` is handed it. Check `refreshFollowupVisibility` and the
   chip element (it may not be a button), then fix or fix the sweep.
2. **Clicking an Ask chip** was not driven (the sweep's `button` selector
   missed the chip element); the chips render and use the existing handler.
3. **Link reasons from the composer** (the owner: "can the composer be user
   to write better link reasons other than just similar in meaning??, the ai
   should be able to as well"), not started: INBOX 691's concrete overlaps
   first (one note names the other, a shared tag, a shared rare word or
   name, same category in the same week); "similar in meaning" only when
   none apply, then the composer's reason from the two notes' most similar
   sentence pair ("Both are about ...: '...' / '...'", 90 characters plus the
   quotes); with a model running, a one-line model reason from the same pair
   and titles, checked against the notes, the composer's as fallback; both
   feeding Tidy's "Add reasons" and the background "Add reasons to all".
   Grep `link_reason` and 691's "Links to explain". CHAT_PLAN Phase 5 (g).
4. CHAT_PLAN Phase 5 (a) to (f): the composer's sentences as context for a
   running model; the eval with a real embedder (cosine thresholds are
   reasoned, not measured); a "Your notes, no AI" label on a composed Chat
   bubble; pictures attached as files; re-capturing the eval's retrieval;
   "the composer acts" (deterministic commands, confirmed).
