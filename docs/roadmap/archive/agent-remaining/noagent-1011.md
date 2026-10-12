# noagent-1011: what is left (INBOX 801 and 808)

Built: see HISTORY.md "Moved from the plans, 2026-10-11 (CHAT_PLAN, INBOX 801 and 808, Agent with no model)"; decision 22a.

- Not verified: a real Needle engine on the leftover turns (only a stand-in is on disk here; every engine-answered turn asks it nothing). `src/memorymap/ai/needle_provider.py` `_cleaned_calls`.
- Not verified: a real chat model on a one-option ask_user ("The agent calls ask_user with one option, three times in a row"); the fake transport holds it (`tests/test_agent_no_model_801.py`). `src/memorymap/ai/agent.py` `_one_option_ask`.
- Open: "what is there about X" with no model is the composer's quoted answer (one sentence per note); a list of every note found with a line each is what Needle's path says, not the composer's. "search and summarise the found notes" may want the overview shape (decision 64) for "what is there about". `src/memorymap/ai/composer_overview.py` `topic`.
- Open: the place table (`utilities.PLACE_ZONES`) names one zone per country; "the time in Australia" says Sydney's. A country with several zones could list them.
- Open: a typo in a place ("westen australia") is not read; `question_noise.repair` does not reach place names.
- Open: the user's own bubble shows the question as typed (a trailing backslash stays visible there); only routing, the answer and tool arguments use the tidied text.
