# The app.js split: the plan (INBOX 426 cc)

Measured on the head after 397d4b1 (fix/gemini-fixes-5), where the Agent
Activity section had already gone to agent-activity.js (5b1f809):
`frontend/app.js` is 50,483 lines, 1,579 top-level names, 737,308 bytes
gzipped at level 9 (739,672 at level 6) against the 750,000 ratchet in
`tests/test_static_compression.py`. This file is the plan only; nothing in
app.js moves until the orchestrator says go.

**The instrument.** `scratchpad/appjs-map.js` parses app.js as a classic
script (espree and eslint-scope, from the sandbox's own eslint) and produces
every number below; `scratchpad/appjs-cuts.json` names the thirteen cut
points in the one long stretch with no header comments (lines 2,133 to
10,394); `scratchpad/appjs-files.json` is the proposed file list. Run
`node scratchpad/appjs-map.js --check FROM TO [AFTER]` before every move: it
prints what lines FROM..TO would reference at load from a file loaded later.
"At load" means a top-level statement itself (a top-level IIFE counts), or a
function such a statement calls directly, followed through direct calls
only; a function handed to `addEventListener` is a reference (it must exist)
but its body runs later.

## 1. Section map

One row per header comment (`// ---`, `// ===`, `// §`) and per cut. Columns:
top-level functions; top-level `let`/`const` declared; top-level statements
that run at load (a `const` holding a literal or a function is not counted);
the top-level functions its load-time code calls; the `let`/`const` of OTHER
sections its load-time code reads (`r`) or writes (`w`), with the section they
live in (`$` is the `$` helper, a `const` in section 2); and the forward
references at load, meaning names it needs at load that are declared in a
later section (the split's real hazard, section 4).

| # | lines | n | section | fn | let/const | load stmts | calls at load | other sections' let/const at load | forward at load |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 1-4 | 4 | (file head) | 0 | 0/0 | 0 |  |  |  |
| 2 | 5-146 | 142 | browser log capture (Wave A) | 1 | 16/7 | 7 |  |  |  |
| 3 | 147-489 | 343 | tiny API helper | 8 | 1/3 | 2 |  |  |  |
| 4 | 490-614 | 125 | reading a paged list endpoint whole | 4 | 1/2 | 1 |  |  |  |
| 5 | 615-969 | 355 | auth gate (Phase 4) | 13 | 5/1 | 1 |  |  |  |
| 6 | 970-1299 | 330 | a share from the phone's share sheet lands in Capture | 6 | 0/1 | 1 |  |  |  |
| 7 | 1300-1344 | 45 | capture templates (Wave B) | 2 | 0/1 | 1 |  |  |  |
| 8 | 1345-1520 | 176 | the Capture box's template picker (INBOX 410) | 8 | 2/0 | 0 |  |  |  |
| 9 | 1521-1522 | 2 | rendering | 0 | 0/0 | 0 |  |  |  |
| 10 | 1523-1718 | 196 | icon-aware labels | 7 | 0/3 | 1 |  |  |  |
| 11 | 1719-2132 | 414 | asking before something irreversible (§35F) | 6 | 0/1 | 1 |  |  |  |
| 12 | 2133-3079 | 947 | one map chip and one map preview, used everywhere | 11 | 4/12 | 2 |  |  |  |
| 13 | 3080-3183 | 104 | (cut) the map board index | 4 | 0/4 | 1 |  |  |  |
| 14 | 3184-3306 | 123 | (cut) note card helpers: clamps, file size, favourite, bin | 4 | 0/2 | 0 |  |  |  |
| 15 | 3307-4155 | 849 | (cut) entryItem: the note card | 1 | 0/0 | 0 |  |  |  |
| 16 | 4156-4194 | 39 | (cut) a note's way to the graph and to Atlas | 3 | 0/0 | 0 |  |  |  |
| 17 | 4195-5134 | 940 | (cut) action menus, escaped menus, help popovers | 16 | 1/2 | 5 |  |  |  |
| 18 | 5135-5568 | 434 | (cut) connections, history, privacy, titles | 6 | 0/1 | 2 |  | $ r@2 |  |
| 19 | 5569-6169 | 601 | (cut) menu keyboard, menu builders, the note's overflow me | 4 | 1/0 | 0 |  |  |  |
| 20 | 6170-6594 | 425 | (cut) re-evaluate, inline actions, attachments | 7 | 0/2 | 1 |  |  |  |
| 21 | 6595-8472 | 1878 | (cut) the lightbox | 1 | 3/1 | 0 |  |  |  |
| 22 | 8473-9172 | 700 | (cut) selection to note, the pick dialogs | 11 | 1/1 | 1 |  |  |  |
| 23 | 9173-9580 | 408 | (cut) the selection popup | 11 | 1/0 | 0 |  |  |  |
| 24 | 9581-9922 | 342 | (cut) a note's panels: related, faded, reminders, referenc | 8 | 1/2 | 3 |  |  |  |
| 25 | 9923-10394 | 472 | (cut) the note edit form, categories, linking | 8 | 0/0 | 0 |  |  |  |
| 26 | 10395-11756 | 1362 | the notes filter | 30 | 0/10 | 3 |  |  |  |
| 27 | 11757-12185 | 429 | incremental list rendering (ROADMAP §85.4 items 3 and 4) | 13 | 1/2 | 6 |  | $ r@2 |  |
| 28 | 12186-12796 | 611 | note-list keyboard navigation (ROADMAP Tier 3 §30a / BACKL | 20 | 2/11 | 7 |  |  |  |
| 29 | 12797-12880 | 84 | capture | 3 | 0/1 | 1 |  |  |  |
| 30 | 12881-13503 | 623 | notes ↔ documents | 15 | 5/2 | 4 |  |  |  |
| 31 | 13504-15362 | 1859 | ask | 41 | 4/9 | 4 |  |  |  |
| 32 | 15363-15382 | 20 | suggested questions (Round 1) | 1 | 0/0 | 0 |  |  |  |
| 33 | 15383-15639 | 257 | Ask history: browse back through every notes-only question | 8 | 3/1 | 0 |  |  |  |
| 34 | 15640-16013 | 374 | chat tab (Wave C) | 10 | 5/1 | 1 |  |  |  |
| 35 | 16014-16659 | 646 | §35K: *"the chat bubble's metadata line is not visually ap | 16 | 0/0 | 0 |  |  |  |
| 36 | 16660-17368 | 709 | web panel: search + reader view | 24 | 6/2 | 1 |  |  |  |
| 37 | 17369-17918 | 550 | citing a web page in the chat | 18 | 2/2 | 1 |  |  |  |
| 38 | 17919-18430 | 512 | compressing this conversation's context (§35I) | 14 | 1/5 | 3 |  |  |  |
| 39 | 18431-18799 | 369 | following a stream without fighting the reader | 8 | 0/1 | 0 |  |  |  |
| 40 | 18800-20484 | 1685 | the agent's run, as an ordered timeline | 24 | 1/4 | 4 |  |  |  |
| 41 | 20485-21129 | 645 | the writing room: thoughts in, a note out | 23 | 6/6 | 4 |  |  |  |
| 42 | 21130-21355 | 226 | extract notes (BACKLOG.md §62) | 5 | 1/1 | 1 |  |  |  |
| 43 | 21356-21365 | 10 | attaching notes to a chat message | 0 | 2/0 | 2 |  |  |  |
| 44 | 21366-21479 | 114 | attaching images to a chat message (vision-capable models) | 3 | 2/0 | 2 |  |  |  |
| 45 | 21480-23701 | 2222 | one attach button, two destinations | 34 | 9/5 | 7 |  |  |  |
| 46 | 23702-23856 | 155 | "what to ask next" chips under a finished answer | 6 | 0/0 | 0 |  |  |  |
| 47 | 23857-23882 | 26 | leaving a conversation while it is still answering | 0 | 1/0 | 0 |  |  |  |
| 48 | 23883-24093 | 211 | how long this answer has been coming | 10 | 3/0 | 0 |  |  |  |
| 49 | 24094-24239 | 146 | resizable sidebars | 5 | 1/8 | 3 |  |  |  |
| 50 | 24240-24294 | 55 | the sidebars, as sheets (Phase 9, bands 3 and 4) | 2 | 0/1 | 1 |  |  |  |
| 51 | 24295-24682 | 388 | the dismissal every sheet keeps, wherever it is built | 11 | 0/5 | 2 |  |  |  |
| 52 | 24683-26286 | 1604 | every <select> in the app wears the app's own menu | 28 | 1/6 | 8 |  |  |  |
| 53 | 26287-26828 | 542 | skills (§21): named, repeatable jobs over the notebook | 21 | 3/1 | 2 |  |  |  |
| 54 | 26829-27108 | 280 | the composer's two nudges (BACKLOG: agent-mode + skill aut | 9 | 0/4 | 2 |  |  |  |
| 55 | 27109-27327 | 219 | Wave O: agent-tools toggles | 6 | 0/0 | 4 |  | $ r@2 |  |
| 56 | 27328-27336 | 9 | Wave M: share skills/personas as JSON | 1 | 0/0 | 0 |  |  |  |
| 57 | 27337-27477 | 141 | saving a generated file (§35E) | 6 | 1/0 | 0 |  |  |  |
| 58 | 27478-27624 | 147 | Wave M: batch operations on notes | 8 | 1/1 | 1 |  |  |  |
| 59 | 27625-27932 | 308 | live clock + dashboard welcome | 9 | 1/1 | 10 | startClockTicker, tickClocks, syncEdgeFade | $ r@2 |  |
| 60 | 27933-28011 | 79 | the scroll edge effect (UI_MODERNISATION_PLAN Phase 10, IN | 1 | 0/4 | 2 |  |  |  |
| 61 | 28012-28360 | 349 | the phone's tab bar recedes on the way down (INBOX 104) | 9 | 2/2 | 7 | syncTabOverflowFade | $ r@2 |  |
| 62 | 28361-28909 | 549 | reminders tab (Wave D) | 10 | 6/0 | 3 |  |  |  |
| 63 | 28910-29148 | 239 | the due time, split across two fields | 11 | 0/0 | 0 |  |  |  |
| 64 | 29149-29180 | 32 | §36C rewrote `checkDueReminders` further down this file, b | 1 | 0/0 | 0 |  |  |  |
| 65 | 29181-29255 | 75 | tiny markdown renderer (Round 1) | 4 | 0/0 | 0 |  |  |  |
| 66 | 29256-30430 | 1175 | The block vocabulary, as spellings | 26 | 1/10 | 2 |  |  |  |
| 67 | 30431-30510 | 80 | a long-press is a right-click on a phone (UI Phase 11 item | 1 | 0/2 | 2 | wireLongPress |  |  |
| 68 | 30511-31167 | 657 | the conventions a list is expected to keep (pass2.md, micr | 5 | 3/4 | 10 | wireLongPress |  |  |
| 69 | 31168-31221 | 54 | tabs (Wave A) | 1 | 0/1 | 1 |  |  |  |
| 70 | 31222-32138 | 917 | back / forward through the pages you have visited | 17 | 0/5 | 8 |  |  |  |
| 71 | 32139-32180 | 42 | Timeline: moved to timeline.js | 1 | 0/0 | 1 |  | $ r@2 |  |
| 72 | 32181-32193 | 13 | Notes sub-tabs | 0 | 0/2 | 1 |  |  |  |
| 73 | 32194-32351 | 158 | a new session starts at the front of every tab | 6 | 0/2 | 2 | resetNavigationForNewSession | NOTES_SECTION_STORE r@72 |  |
| 74 | 32352-32703 | 352 | back-to-top button | 8 | 1/7 | 9 |  |  |  |
| 75 | 32704-32820 | 117 | what the AI remembers (ROADMAP §39B) | 1 | 0/0 | 0 |  |  |  |
| 76 | 32821-32833 | 13 | overlay focus-return, scroll lock, autogrow textareas | 0 | 1/0 | 0 |  |  |  |
| 77 | 32834-32852 | 19 | page scroll lock while any overlay is open | 1 | 0/1 | 0 |  |  |  |
| 78 | 32853-33298 | 446 | textareas that grow with what you type | 12 | 0/6 | 0 |  |  |  |
| 79 | 33299-33472 | 174 | account & security | 4 | 3/0 | 0 |  |  |  |
| 80 | 33473-34059 | 587 | Settings → Web search | 17 | 2/4 | 2 |  |  |  |
| 81 | 34060-34269 | 210 | Wave F: backups UI | 7 | 0/0 | 1 |  | $ r@2 |  |
| 82 | 34270-34307 | 38 | §37G: a document (PDF/Word/slide deck) becomes one or more | 1 | 0/0 | 0 |  |  |  |
| 83 | 34308-34421 | 114 | Wave F: command palette (Ctrl/Cmd-K) | 4 | 3/3 | 2 |  |  |  |
| 84 | 34422-35480 | 1059 | landing on the feature a catalogue row names | 23 | 4/2 | 6 |  |  |  |
| 85 | 35481-35663 | 183 | Wave F: whiteboard-lite | 6 | 10/1 | 5 |  |  |  |
| 86 | 35664-35987 | 324 | §37G: an image the user brought in to annotate over, an `I | 11 | 3/1 | 1 |  |  |  |
| 87 | 35988-36177 | 190 | Wave H: voice capture (local Whisper) | 2 | 3/4 | 0 |  |  |  |
| 88 | 36178-36575 | 398 | meeting notes (§17) | 10 | 7/2 | 1 |  |  |  |
| 89 | 36576-36596 | 21 | Wave H: read-aloud (the browser's local voices) | 1 | 0/0 | 0 |  |  |  |
| 90 | 36597-36598 | 2 | toasts (Phase 5) | 0 | 0/0 | 0 |  |  |  |
| 91 | 36599-36645 | 47 | reminders you actually notice (§36C) | 2 | 0/2 | 0 |  |  |  |
| 92 | 36646-37518 | 873 | the notifications centre (§36E) | 34 | 3/10 | 5 |  | $ r@2 |  |
| 93 | 37519-37742 | 224 | global undo/redo (status bar) | 8 | 0/3 | 7 | wireLongPress | $ r@2 |  |
| 94 | 37743-37802 | 60 | quick access: recent questions + most-used entries (Phase  | 2 | 0/0 | 0 |  |  |  |
| 95 | 37803-38289 | 487 | model manager (Phase 3.5) | 11 | 9/6 | 3 |  |  |  |
| 96 | 38290-38769 | 480 | the status bar (§36D) | 11 | 3/1 | 3 |  |  |  |
| 97 | 38770-38877 | 108 | a background job starting and finishing, said out loud | 2 | 0/2 | 2 |  |  |  |
| 98 | 38878-39088 | 211 | optional extras (Settings → Optional extras) | 1 | 1/0 | 0 |  |  |  |
| 99 | 39089-39230 | 142 | embedding models, on the same screen as the packages | 1 | 1/0 | 0 |  |  |  |
| 100 | 39231-39730 | 500 | Wave N: tasks manager (see and quit background jobs) | 10 | 0/3 | 6 |  | $ r@2 |  |
| 101 | 39731-40550 | 820 | a model per feature | 22 | 2/2 | 5 |  | $ r@2 |  |
| 102 | 40551-40627 | 77 | Wave N: AI improve-writing (before/after, user approves) | 4 | 3/0 | 0 |  |  |  |
| 103 | 40628-40814 | 187 | Tensions: where the notebook disagrees with itself | 8 | 0/1 | 1 |  |  |  |
| 104 | 40815-41169 | 355 | Wave N: AI link suggestions (auto-linker, approve each) | 4 | 0/0 | 0 |  |  |  |
| 105 | 41170-41434 | 265 | keeping the look across restarts (§35E) | 7 | 3/3 | 3 |  |  |  |
| 106 | 41435-41792 | 358 | Wave O: the p5 brand emblem (unique each load, reused app- | 6 | 1/8 | 11 |  |  |  |
| 107 | 41793-41913 | 121 | generated faces: moved to avatars.js (2026-09-24) | 2 | 0/1 | 1 |  |  |  |
| 108 | 41914-41974 | 61 | wiring | 0 | 0/0 | 5 |  | $ r@2 |  |
| 109 | 41975-42152 | 178 | the notifications centre's controls (§36E) | 1 | 0/0 | 16 | renderNotificationBadge, watchMirroredUiKeys, initNotesSubtabs, initSelectionPopup (+3) | $ r@2, scrollTopUpdate w@74 | initNotesSubtabs() .. activeSpaceId@144, initNotesSubtabs() .. activeSpaceId()@144, initNotesSubtabs() .. loadSpaces@144, initNotesSubtabs() .. maybeShowOnboarding@136 |
| 110 | 42153-42239 | 87 | the top bar's real height, as a token | 2 | 0/0 | 2 | initHeaderHeightToken, initNotesSubtabHeightToken |  |  |
| 111 | 42240-42301 | 62 | the tab bar docks to the bottom on a phone | 2 | 0/1 | 1 | initBottomTabBar |  |  |
| 112 | 42302-42453 | 152 | the phone top bar: one menu where the desktop has four squ | 3 | 0/2 | 3 | initPhoneHeaderMore, initPhoneStatus |  |  |
| 113 | 42454-42500 | 47 | the phone's sidebar opener: a button in the head, not a ra | 1 | 0/1 | 2 | mountPhoneSidebarOpeners |  |  |
| 114 | 42501-42608 | 108 | swipe a row: star to the right, bin to the left | 1 | 0/2 | 2 | initRowSwipe |  |  |
| 115 | 42609-42688 | 80 | the note page: a note opened on a phone is a page, not a l | 3 | 2/0 | 1 | initNotePage |  |  |
| 116 | 42689-42765 | 77 | the Library reader as the page | 2 | 0/1 | 1 | initOcrPhonePage |  |  |
| 117 | 42766-42900 | 135 | the chat composer on a phone: attachments and mode in one  | 3 | 0/0 | 1 | initPhoneChatRow |  |  |
| 118 | 42901-43017 | 117 | a sheet, the phone's own dialog | 2 | 0/0 | 0 |  |  |  |
| 119 | 43018-43102 | 85 | More: the three tabs the phone's five-item bar does not sh | 2 | 0/1 | 2 |  | $ r@2 |  |
| 120 | 43103-43144 | 42 | how much of the window the on-screen keyboard is covering | 1 | 0/0 | 1 | initKeyboardInset |  |  |
| 121 | 43145-43222 | 78 | the settings section jump list | 1 | 0/0 | 1 | buildSettingsJumpList |  |  |
| 122 | 43223-43287 | 65 | the floating primary action | 2 | 0/2 | 2 | initPrimaryFab |  |  |
| 123 | 43288-44023 | 736 | the dock's arrange zone folds into its own overflow menu | 16 | 0/2 | 53 | initDockFolding, initDockActionFolding, watchOverlays, initAutoGrow (+1) | $ r@2 |  |
| 124 | 44024-44038 | 15 | offline badge | 1 | 0/0 | 3 | reflectOnlineState |  |  |
| 125 | 44039-44187 | 149 | writing room wiring | 1 | 0/0 | 28 | renderDraftQuickstarts, initHelpToggle | $ r@2 |  |
| 126 | 44188-44351 | 164 | one wiring for every "?" added from here on | 4 | 0/3 | 8 | initHelpToggles, atlasSuggestion, restoreDraftLocally | $ r@2 |  |
| 127 | 44352-44357 | 6 | note picker wiring | 0 | 0/0 | 1 |  | $ r@2 |  |
| 128 | 44358-44433 | 76 | image attachment wiring (vision-capable models) | 0 | 1/0 | 8 |  | $ r@2 |  |
| 129 | 44434-44489 | 56 | chat dock "more" disclosure wiring (§37C) | 2 | 0/0 | 8 |  | $ r@2, CHAT_SIDEBAR_SORT_KEY r@52 |  |
| 130 | 44490-45207 | 718 | global find bar (Ctrl+F on any tab except Documents, which | 19 | 7/2 | 56 | mountChatActionsMenu, renderStatusBar, initGraphOptionFolds | $ r@2, RESPONSE_MODE_SELECTS r@37, STATUS_META_KEY r@96 |  |
| 131 | 45208-46010 | 803 | the graph's controls on a phone: one sheet | 10 | 4/2 | 84 | renderPlanToggle | $ r@2, PHONE_TABS r@111, remindersPageSize r@62, reminderView r@62 |  |
| 132 | 46011-46118 | 108 | [[ autocomplete | 5 | 2/0 | 1 |  |  |  |
| 133 | 46119-46242 | 124 | duplicate tidy-up | 3 | 0/0 | 0 |  |  |  |
| 134 | 46243-47231 | 989 | saved filters | 9 | 1/0 | 82 | initHelpToggle, wirePrefsDirtyMarks, wireFeatureModelSelects, wireLongPress (+1) | $ r@2 | resetShortcuts@137 |
| 135 | 47232-47281 | 50 | first-run onboarding tour (learnability) | 0 | 2/1 | 1 |  |  |  |
| 136 | 47282-47563 | 282 | §27's first-run diagnostics: Ollama reachability and where | 8 | 0/0 | 6 |  | $ r@2 |  |
| 137 | 47564-48249 | 686 | rebindable keyboard shortcuts | 19 | 4/8 | 12 | loadShortcuts, stampShortcutTitles, renderUndoBar, wireBackdropClose | $ r@2 |  |
| 138 | 48250-48798 | 549 | Wave F wiring | 4 | 2/3 | 52 | autoGrow, renderEntryAttachmentChips, toast, wireBackdropClose (+1) | $ r@2, notesPageSize r@2 | initAuth() .. loadSpaces@144, initAuth() .. activeSpaceId@144, initAuth() .. activeSpaceId()@144 |
| 139 | 48799-48800 | 2 | FLOATING FORMAT MENU | 0 | 0/0 | 0 |  |  |  |
| 140 | 48801-49116 | 316 | Global Drag and Drop & Paste Image Upload for Textareas | 6 | 0/0 | 6 |  | $ r@2 |  |
| 141 | 49117-49372 | 256 | what shows in the status bar | 8 | 3/1 | 4 |  | $ r@2 |  |
| 142 | 49373-49374 | 2 | Agent Activity: moved to agent-activity.js | 0 | 0/0 | 0 |  |  |  |
| 143 | 49375-49378 | 4 | Global Command Palette (Ctrl+K): moved to palette.js | 0 | 0/0 | 0 |  |  |  |
| 144 | 49379-49769 | 391 | spaces | 13 | 1/1 | 3 | initSpaceSwitcher |  |  |
| 145 | 49770-49949 | 180 | capture templates, Settings pane (extends Wave B) | 7 | 1/0 | 5 | watchForSelects | $ r@2 |  |
| 146 | 49950-50483 | 534 | Find anything | 12 | 8/2 | 6 | wireFinder |  |  |

Reading the table: the load-time code is concentrated at the two ends. The
first 2,132 lines declare the shared state (section 2 alone holds sixteen of
the note list's `let`s) and the helpers everything calls; sections 108 to
141 (lines 41,914 to 49,372) are the wiring, 453 of the file's 694
load-time statements, binding
handlers to functions declared everywhere above them. The middle 39,000
lines are almost all declarations. Only three sections reference anything
declared after them at load, and all three are one shape, a boot call made
before the file ends (section 4).

## 2. The files

Twenty-three classic scripts, contiguous ranges of today's app.js in today's
order, with two moves: the lazy loader (lines 41,506 to 41,791:
`LAZY_MODULES`, `ensureModule`, `LAZY_ENTRY_POINTS` and its stand-in loop)
goes up into app.js, and the two boot kick-offs go to the end of the last
file (section 4, hazard 1). Contiguous is the point: every reference that
is backward today stays backward, so the split changes nothing about load
order except where a file ends. `--check` on each range: 0 forward
references for 21 of them, the two boot calls for the other two.

| # | file | today's lines | lines | gz KB | what it is |
| --- | --- | --- | --- | --- | --- |
| 1 | app.js | 1-2132, 41506-41791 | 2,418 | 40 | log capture, `api`/`apiJson`/`apiPagedList`, the auth gate, the share-sheet intake, capture templates, `setLabel`, the confirm dialogs, the lazy loader |
| 2 | note-cards.js | 2133-4194 | 2,062 | 34 | map chips and previews, the board index, `entryItem` (the note card) |
| 3 | menus.js | 4195-6169 | 1,975 | 30 | action menus and their escape, help popovers, connections, history, the menu keyboard, the note's overflow menu |
| 4 | lightbox.js | 6170-8472 | 2,303 | 33 | re-evaluate, inline actions, attachments, the lightbox |
| 5 | selection.js | 8473-9580 | 1,108 | 14 | selection to note, the pick dialogs, the selection popup |
| 6 | notes-list.js | 9581-12796 | 3,216 | 48 | a note's panels, the edit form, the notes filter, incremental rendering, list keyboard |
| 7 | capture-ask.js | 12797-15639 | 2,843 | 42 | capture, notes and documents, Ask, suggested questions, Ask history |
| 8 | chat.js | 15640-18430 | 2,791 | 40 | the chat tab, message meta, the web panel, citing a page, compressing context |
| 9 | chat-agent.js | 18431-21129 | 2,699 | 37 | following a stream, the agent's run timeline, the writing room |
| 10 | chat-attach.js | 21130-24093 | 2,964 | 41 | extract notes, attaching notes and images, the attach button, follow-up chips, the answer timer |
| 11 | sheets-selects.js | 24094-26286 | 2,193 | 33 | resizable sidebars, sheets and their dismissal, the select menu recipe |
| 12 | skills.js | 26287-27624 | 1,338 | 17 | skills, the composer's nudges, agent tools, sharing, saving a file, batch operations |
| 13 | shell-reminders.js | 27625-29180 | 1,556 | 22 | the clock and welcome, the scroll edge, the phone bar's recede, the Reminders tab |
| 14 | markdown.js | 29181-30430 | 1,250 | 19 | the markdown renderer and the block vocabulary |
| 15 | navigation.js | 30431-32852 | 2,422 | 39 | long-press, list conventions, tabs, back and forward, sub-tabs, back to top, overlay scroll lock |
| 16 | settings-panes.js | 32853-35480 | 2,628 | 37 | autogrow, account, web search, backups, document import, the catalogue's deep links |
| 17 | media.js | 35481-36596 | 1,116 | 14 | the sketch pad, image annotation, voice capture, meeting notes, read-aloud |
| 18 | status.js | 36597-39230 | 2,634 | 37 | toasts, reminder notices, the notifications centre, undo and redo, the model manager, the status bar, extras, embeddings |
| 19 | ai-tools.js | 39231-41434 | 2,204 | 30 | the tasks manager, a model per feature, improve writing, tensions, link suggestions, keeping the look |
| 20 | phone-shell.js | 41435-44023 less the loader | 2,303 | 34 | the emblem, the first wiring, the notification controls, the header tokens, every phone band control, the arrange zone |
| 21 | wiring.js | 44024-46242 | 2,219 | 31 | offline badge, writing room and help wiring, pickers, the find bar, the graph's phone sheet, `[[`, duplicates |
| 22 | settings-wiring.js | 46243-49116 | 2,874 | 42 | saved filters, onboarding and diagnostics, rebindable shortcuts, the Wave F wiring, drag and paste |
| 23 | spaces-find.js | 49117-50483 | 1,367 | 18 | the status bar's slots, spaces, the templates pane, Find anything, then the boot kick-offs |

Every file is 1,108 to 3,216 lines and 14 to 48 KB gzipped, against 737 KB
for today's one file. The names follow what is in them; where a range mixes
two features (13, 20, 21), the name is the larger. A second pass can gather
scattered wiring into its feature's file (the chat's wiring from 21 into 8,
say), each move checked with `--check FROM TO AFTER`, but that is not this
split: moving code out of line order is where the hazards live, and the
contiguous split gets the size down without any.

## 3. Load order in index.html

Where app.js is today, in this order, each `<script src="/NAME.js?v=0.3.2">`
(no `defer`, no `async`, no `type="module"`: classic scripts share one global
scope, as timeline.js, palette.js and agent-activity.js already do):

```
boot-guard.js, theme-boot.js, vendor/d3            (unchanged)
app.js, note-cards.js, menus.js, lightbox.js, selection.js, notes-list.js,
capture-ask.js, chat.js, chat-agent.js, chat-attach.js, sheets-selects.js,
skills.js, shell-reminders.js, markdown.js, navigation.js, settings-panes.js,
media.js, status.js, ai-tools.js, phone-shell.js, wiring.js,
settings-wiring.js, spaces-find.js
agent-activity.js, avatars.js, atlas.js, editor.js, dashboard.js,
timeline.js, palette.js, bg-art.js, settings.js, tour.js   (unchanged)
```

agent-activity.js moves from straight after app.js to after spaces-find.js,
which is where app.js ends today; nothing calls into it at load (its own
header says so). The lazy bundles (`LAZY_MODULES`) still load after all of
these. Twenty-two more requests at boot on a local server with HTTP/1.1
keep-alive and revalidation: to be measured in step 0 (`scratchpad/ui-sweeps/bootbench.js`), and if
the parse-to-first-paint time moves by more than the noise, the answer is
fewer, larger files (the table merges cleanly in pairs), not a bundler.

## 4. Hazards

1. **A boot call that starts async work before the last file has run.**
   `initNotesSubtabs()` (line 42,140, file 20) reaches `activeSpaceId`,
   `loadSpaces` (file 23) and `maybeShowOnboarding` (file 22) through its
   calls; `initAuth()` (line 48,791, file 22) awaits `/auth/status` and then
   runs `startApp`, which calls `loadSpaces` (file 23). In one file these
   are hoisted; across files, a fast `/auth/status` answer can arrive
   between two script executions (the parser yields while it waits for the
   next file), and `startApp` would meet a `loadSpaces` that is not defined
   yet. **Both calls move to the end of spaces-find.js**, the last file,
   in the commit that first splits their file off. Everything after them in
   today's order is declarations and listeners, so nothing depended on them
   having run earlier; confirm by reading the two sections in that step.
   The same race exists today between app.js and dashboard.js, settings.js
   and tour.js, which is why their cross-file calls are `typeof`-guarded;
   the split does not add to it once the two calls are last.
2. **TDZ on `let` and `const` read across files at load.** 38 load-time
   reads of another section's `let`/`const` exist (the table's ninth
   column), all backward, so in-order files keep every one of them legal.
   The hazard is a reorder: moving a section above the one that declares a
   name it reads at load is a `ReferenceError: Cannot access ... before
   initialization`, and so is a function it calls at load reading one.
   `--check FROM TO AFTER` reports both. Two files may not declare the same
   top-level `let`/`const`/`class` (a SyntaxError in the second): cannot
   arise from cutting one file, only from later edits.
3. **Code that runs at load and calls a function now in a later file.** 0
   cases in the contiguous plan besides hazard 1 (`--check` per range);
   `tests/test_frontend_load_order.py` catches the direct form (a call as a
   top-level statement) once the new files are in index.html, and
   `errors.js` catches the rest at runtime.
4. **The lazy loader's stand-ins.** The loop under `LAZY_ENTRY_POINTS`
   installs a stand-in for each name "unless this file (or another that
   always loads) already defines" it, and today every app.js function is
   hoisted before the loop runs. Moved up into app.js, the loop runs before
   files 2 to 23: a name that is both a stand-in and a function in one of
   them would get a stand-in first, and the later file's `function`
   declaration would then replace the property, which is the right end
   state. Measured: no `LAZY_ENTRY_POINTS` name is a function in app.js
   today, so the case does not arise; step 1 re-checks it.
5. **Tests that slice app.js by string.** 105 test files read app.js, most
   as `(FRONTEND / "app.js").read_text()` followed by an `index` of a
   function name or a regex over the whole text; each breaks the moment its
   function leaves. **Step 0** adds `tests/_app_js.py` with
   `app_js_text()`, the concatenation of the app files in index.html order
   (read from the markup, so a new file is included without editing the
   helper), and converts every reader that means "the app's code" to it;
   the readers that mean app.js itself keep the path: the two lazy tables
   (`test_frontend_load_order.py`, `test_packaging_spec.py`,
   `test_lazy_bundle_calls.py`), and `apiPagedList`'s placement (still in
   app.js). The id and handler lints (`test_frontend_ids.py`,
   `test_frontend_handlers.py`) already read palette.js by name and move to
   the helper too. The files, for step 0's checklist:

```
test_ai_name test_ai_reach test_answer_support test_api_entries 
test_ask_answer_object test_bg_art_styles test_board_preview 
test_catalogue_reveal test_chat_attachments test_chat_followups 
test_chat_persona_marks test_chat_resume_controls test_clip_text 
test_code_editing test_code_vscode test_companion_motion 
test_compress_chat_tool test_compression test_css_invalidation 
test_doc_dock test_dock_grammar test_emblem_slots test_emblem_turns 
test_entry_history test_extras test_feature_catalog test_feature_models 
test_file_editing test_files_row_summary test_frontend_handlers 
test_frontend_ids test_frontend_load_order test_frontend_shortcuts 
test_frontend_symbols test_frontend_tool_labels 
test_frontend_workspace_header test_frozen_launch test_graph_api 
test_help_chat test_help_controls test_help_topic_routing 
test_highlight_colours test_icon_names test_inline_citations 
test_inline_math test_lazy_bundle_calls test_library 
test_library_image_origin test_library_images_poll test_library_pass2 
test_lightbox test_lock_boundary test_locked_downloads test_log_console 
test_markdown_link_schemes test_md_blocks test_media_cookie 
test_meeting_notes test_memory_stream test_menu_keyboard test_name_mood 
test_nav_history_seed test_no_glyph_icons test_note_preview_groups 
test_note_surface test_note_template_picker test_notes_extras_api 
test_notifications_centre test_object_actions test_offline_promise 
test_packaging_spec test_palette_contract test_perf_hot_paths 
test_persona_atlas test_preferences_api test_prose_autofill 
test_raw_fetch_headers test_scroll_keys test_security_boundaries 
test_selection_context test_selection_menu test_session_navigation 
test_share_target test_sketch_media test_skills test_staged_images 
test_static_compression test_static_freshness test_status_bar_grammar 
test_streaming_laziness test_style_scale test_support_email 
test_svg_paint_attributes test_tasks test_text_indent test_timeline 
test_touched_notes test_tray test_ui_recipes test_ui_state 
test_unwatched_answer test_whiteboard test_whiteboard_selection 
test_wiki_link_labels test_writing_dictionary_persists
```

6. **The asset cache-busting stamps.** Every new tag carries `?v=0.3.2`
   (`tests/test_asset_cache_busting.py`); `RevalidatedStatic` splices the
   boot token onto every stamp in the served index.html, so the desktop
   window cannot keep a stale piece, whatever its name.
7. **The gzip ratchet** (`test_static_compression.py`, gzipped `/app.js`
   under 750,000 bytes; 737,308 now). After the split `/app.js` is 39 KB
   and the test as written says nothing. Step 0 rewrites it to what it was
   for: every app file under 64 KB gzipped (the largest planned is 48), and
   the app files together under the total at the time, lowered in each
   commit to the new total plus 2%, so the boot JavaScript cannot grow back
   in silence.
8. **Packaging** (`tests/test_packaging_spec.py`): every file the page
   loads must be committed; the spec bundles `frontend/` whole, so a new
   file is in the build if and only if it is in git. Each step adds its file
   in the same commit as the index.html tag (`gate.sh --staged` checks the
   pair).
9. **A top-level error now stops one file, not the whole app.** Today a
   throw at load (the null `addEventListener` of 2026-09-12) aborts the rest
   of app.js; after the split the later files still run. Better, but a
   boot that half works can hide a broken file: `errors.js` at each step is
   what sees it (a page error names the file and line).
10. **Comments that say "app.js".** Hundreds of comments name app.js as the
    home of a function; after the split they point at the right bundle of
    files but the wrong file. Left alone in the move commits (a move commit
    should be a move); corrected in one sweep at the end, with
    `appjs-map.js` giving each function's new file.

## 5. Steps

Each step is one commit, rebased on the branch head first, since the
companion and Atlas agents also edit app.js:

- **Step 0, no code moves.** `tests/_app_js.py` and the readers
  converted (hazard 5); the ratchet rewritten (hazard 7); `scratchpad/ui-sweeps/bootbench.js` run
  three times for a baseline. Gate: `scripts/gate.sh --changed` plus every
  converted test.
- **Step 1: the lazy loader into place.** Lines 41,506 to 41,791 move up to
  the end of today's line 2,132 (still inside app.js). `--check 41506 41791
  2132`: 0 forward references (measured). The stand-in overlap re-checked
  (hazard 4).
- **Steps 2 to 23: one file each, from the end of app.js backwards**
  (spaces-find.js first, then settings-wiring.js, down to note-cards.js).
  From the end, because the piece that leaves is always the tail of what
  is left, so app.js stays one contiguous file and each commit's diff is
  one cut. For each:
  1. `node scratchpad/appjs-map.js --check FROM TO`: 0 forward references,
     or hazard 1's two calls, which go to the end of spaces-find.js in the
     step that creates it (step 2) and stay there.
  2. Cut the range into `frontend/NAME.js` with a three-line header (moved
     from app.js on the date, INBOX 426 cc, a classic script sharing app.js's
     globals, what calls into it at load: nothing, per `--check`), and add
     its tag to index.html after the previous file.
  3. `node --check` on both files; `scripts/gate.sh --staged` (the pair).
  4. Boot: `serve.sh` on the worktree's port, `errors.js` at 1440 and 390
     (0 page errors, 0 console errors); `scratchpad/ui-sweeps/bootbench.js` once.
  5. The tests that read the app's code (step 0's list) and
     `test_frontend_load_order.py`, `test_packaging_spec.py`,
     `test_static_compression.py`, `test_asset_cache_busting.py`.
  6. Lower the ratchet's total to the new sum plus 2%.
- **Step 24:** the comment sweep (hazard 10) and CLAUDE.md, ARCHITECTURE.md
  and DESIGN.md's references to "app.js" as one file; the full suite once
  (standing order 5a: a change the targeted tests cannot all see).

**Progress.** Step 0 done 2026-09-26. Baseline, `bootbench.js` with
`RUNS=9`, three runs: warm median ready 219, 198 and 200 ms (the frame the
boot splash hides), DOMContentLoaded 216, 193 and 197; cold ready 611 to 641
ms; 14 script requests, 1,242 KB cold. Gzipped as served: app.js 740,482,
agent-activity.js 10,651, 751,133 together. The converted readers: 1,612
tests green.

What is measured at the end: app.js and 22 files, each 14 to 48 KB gzipped;
0 page errors at 1440 and 390; boot time within the step 0 baseline's
noise; the full suite green.

## 6. Not decided here

- The file names are proposals; the ranges are what `--check` was run on.
- Whether 23 requests at boot costs anything measurable (step 0 measures it;
  the fallback is merging pairs).
- The second pass that gathers wiring by feature (section 2): optional,
  after the split, each move checked.
