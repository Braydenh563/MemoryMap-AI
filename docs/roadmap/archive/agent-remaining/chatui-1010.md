# chatui-1010: what is left

Agent chatui-1010 (branch `agent/chatui-1010`), the owner's 2026-10-10 chat and
first-run list plus INBOX 694, 727, 728, 731, 742 to 745. Done items are in
the commits and CHANGELOG; this lists only what is still open, one line each,
the owner's words first.

- Item 32, "metadata ... very messy": the chat answer's foot is still three
  rows (Sources, Grounded in, meta), 148 px measured on a five-source answer;
  fold Grounded in and meta into one muted line (chat-agent.js:2275, the
  sources block). The head label and the result-card reason are done.
- INBOX 694 part 1, "the bottom of these pills gets cut off": not reproduced
  at DPR 1 (Ask|Agent and Settings `.seg`: each segment 1 px inside the
  32 px track top and bottom); the Pace pill is drawn in skills.js:462
  (outside this agent's files) and was not measured; try DPR 1.25 and dark.
- INBOX 731, "the help guide failed??": with a model only; no model answers
  (help-chat.js:329 is the catch). Needs the server log line from a model run.
- INBOX 742 and 743, "atlas doesnt seem to change emotions alot", "more mouse
  interaction ... rubbing its head. flipping it upside down": gestures, moods
  from app events, the enlarged view mirroring live state. Not started.
- INBOX 743, "atlas goes out of the border": not reproduced (figure within
  4 px of its svg, no oval frame drawn at this head); recheck the welcome card
  on Windows.
- INBOX 744 (b) and (c), "it didn mention other matching records": composer
  and grounding work (composer*.py, renderAnswerGrounding), off this agent's list.
- Start SearXNG "takes a while": not reproduced (status 21 to 101 ms,
  chat.js:1031 `setWebSearxngRunning`); a search that failed should retry by
  itself once the engine answers.
- Web link cards in chat and the web reader share no recipe with
  markdown.js:1258 `linkCard`; one recipe for both.
- Citation hover, the composer and captions in retrieval (Brief 39) and the
  density items (Brief 41) are owned elsewhere.
