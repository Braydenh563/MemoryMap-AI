# First run, walked as a new person (INBOX 472)

Base 910a9ad. Fresh data dir each walk (`/tmp/mm-a865`), no Ollama, the
built-in search model installed. 1440x900 and 390x844 (isMobile, hasTouch),
light and dark. Sweeps: `scratchpad/ui-sweeps/firstrun.js` (lock screen,
welcome, every tab and sub-tab empty), `firstrun2.js` (the AI pill,
Settings > Models, first capture, Chat with no model, graph with one note),
`firstrun-filing.js` (how long a no-AI note says "Filing").

What already holds, measured: the lock screen fits (card 420x459 at 1440,
351x471 at 390, no scroll); a short password says "Use at least 4
characters."; no console errors and no 4xx on any walk; Documents, Boards &
maps, Images, Files, Contents, Timeline and Reminders each draw the recipe
(icon, title, one sentence, one action); Chat, Ask and the writing desk each
say "No model is connected" with one button to Settings > Models;
Settings > Models says "Ollama isn't running" with the download link; the
first note saves with no AI and says where it went ("Saved in
Uncategorised: no AI model is running to file it", with Choose category).

## Ranked defects

| # | Where | What a new person meets | Measured | Status |
|---|---|---|---|---|
| 1 | Graph, empty notebook | "Every note is hidden. All 0 notes are filtered out by the map's settings." and a Show every note button that can show nothing. A false claim and a dead end on the first visit. | all four walks; `graph-empty-filtered` visible with 0 notes | fixed |
| 2 | AI status pill, no AI | An amber warning dot with "!" for the supported no-AI state; on a phone it is a 44x44 amber circle in the middle of the top bar, the loudest thing on the first screen. Its popup says "Start Ollama" and nothing points at Settings > Models. | level `warn`, glyph `!`, bg rgba(245,189,79,.25), fg #8a5003; 44x44 at 390 | fixed |
| 3 | Dashboard, "here's the whole idea" tiles | The tile recipe drawn two ways on one screen: the start tiles' description is 600 weight and the label 900, against 400 and 600 on the Quick access tiles directly above. Reads as shouting. | `.start-step .muted` 600/12.8px vs `.quick-link-hint` 400/12px | fixed |
| 4 | Dashboard copy | "Your notebook is empty" said twice on one screen (hero and card), the card heading is a comma splice ("Your notebook is empty, here's the whole idea"), the footer runs to two lines. | 1440: footer 2 lines | fixed |
| 5 | Library, All | The empty state's title is two bold sentences ("Nothing here yet. Make a document, a board or a map, or upload a file.") where its seven sibling sections use title plus one muted line. | 1440 / 390 | fixed |
| 6 | Library, Bookmarks | Title and button only, no line saying what a bookmark is; every sibling has one. | "No bookmarks saved yet / Add a bookmark" | fixed |
| 7 | Welcome, "Your setup" slide | Two marks stacked (the app emblem and a stethoscope); a paragraph of 6 lines at 1440 and 8 at 390 that repeats the first slide's privacy sentence; a comma splice ("Ollama isn't running right now, MemoryMap still works without it."); and no way from the slide that says the AI is off to where it is set up. | card 480x468 at 1440, 342x606 at 390 | fixed |
| 8 | Chat, "Try asking" chips with no model | The box is disabled and says Chat cannot answer, but the three suggestion chips still send: "Summarise my notes" with two notes saved answered "I couldn't find any saved notes matching that question." | POST /chat/stream from a chip with `ollama_running: false` | fixed |
| 9 | Lock screen, setup | A 5-line, 12px paragraph under the field (73 words) and "Set password & start" with an ampersand. | 1440: note 378x90 | open |
| 10 | Notes > Ask, no model | Two empty states stacked: the no-model notice with Try asking chips, then "Ask your own notes a question" with three sentences; the model picker reads "Inherited: llama3.2 (not connected)". | 390: the second empty state starts at y=673 | open |
| 11 | Chat rail | "No saved chats yet. Ask something to start one." sits at the foot of the rail, 600px below its heading, and asks for something Chat cannot do with no model. | 1440: text at y=740 | open |
| 12 | First note, no AI | The first note says "Filing..." and the status bar "Filing a note, 1 running" for several seconds while the built-in search model loads, though no AI can file it; the composer's Filing select says "Let Atlas decide". Second note: settled in under 1s. | first walk: still filing at +5s; probe: 1.0s | open |
| 13 | Welcome slide 2 at 390 | Skip the tour, Back and Start the tour wrap to two rows, Skip alone on the first. | 390: footer two rows | open |
| 14 | Library, All, empty | "Activity 2" beside "Everything 0" on a notebook with nothing in it. | 1440 / 390 | open |
