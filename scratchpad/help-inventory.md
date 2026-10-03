# Help inventory (INBOX 448 (1))

Every user-facing feature from CHANGELOG's Unreleased and 0.3.x sections that a person might need to find, the help entry (`HELP_TOPICS` id) that covered it before this pass, and the one that covers it now. The checked form is `FEATURES` in `tests/test_help_coverage.py`: some entry's body must hold the listed words, and the question must reach that entry in the Guide's top three. Settings, Help lists every entry (`GET /help/topics`), and its search finds an entry by title, keywords or text.

Before: 5 of 52 genuinely covered (8 by the words, 3 of those by accident), 4 of 52 reachable by the question. After: 52 of 52 covered and reachable.

| Feature | Since | Question a person asks | Before | Now |
| --- | --- | --- | --- | --- |
| quick-note | Unreleased | keyboard shortcut for quick note | shortcuts | shortcuts, quick-note |
| offline-outbox | Unreleased | what happens if I save a note while the server is down | none | note-outbox |
| paste-drop | Unreleased | how do I paste a picture into a note | none | attachments |
| inline-tags | Unreleased | how do I tag a note with a hashtag | none | tags-categories |
| web-clip | Unreleased | save a web page as a note | none | quick-note |
| ctrl-enter | Unreleased | how do I save a note from the keyboard | notes-controls | notes-controls, quick-note |
| unsaved-guard | Unreleased | I edited a note in two windows | none | note-history |
| note-history | Unreleased | who changed my note | none | note-history |
| draft-template | Unreleased | make a template with ai | none | templates |
| note-sorts | Unreleased | sort notes by recently edited | none | notes-list |
| connections-column | 0.3.31 | see a note's links beside the list | none | notes-list |
| suggested-tags | Unreleased | what are the plus tags on my note | none | suggested-tags |
| filing-confidence | Unreleased | what does the percentage mean on a note | none | filing |
| filing-no-ai | Unreleased | how are notes filed without ai | none | filing |
| filing-stop | Unreleased | a note is stuck on filing | none | filing |
| tag-manager | Unreleased | how do I rename a tag everywhere | none | tag-manager |
| tag-chip-menu | Unreleased | right click a tag | none | tag-manager |
| manage-categories | Unreleased | how do I merge two categories | none | manage-categories |
| category-colour | Unreleased | change a category colour | none | manage-categories |
| category-chip | Unreleased | view all notes in a category | none | manage-categories |
| bulk-tags | Unreleased | add a tag to several notes at once | none | notes-controls, tag-manager |
| notes-filter | Unreleased | filter notes by date | none | notes-controls |
| bookmarks | Unreleased | where are my bookmarks | none | bookmarks |
| bookmark-link | 0.3.32 | insert a bookmark into a note | none | bookmarks |
| contents-tree | Unreleased | an outline of my whole notebook | none | contents |
| ai-skills-library | Unreleased | copy a built-in skill | none | library-skills |
| attachment-cards | Unreleased | rename an attached file | none | attachments |
| mindmap-reorder | Unreleased | mind map shortcut to add a topic before | none (the words matched code-files only by accident) | code-files, mind-map-controls, documents-controls, chat-controls |
| mindmap-duplicate | Unreleased | duplicate a topic on a mind map | none (Ctrl+D matched today's note in shortcuts) | shortcuts, whiteboard-controls, mind-map-controls, notes-controls |
| undo-depth | Unreleased | how many undo steps on a mind map | none | whiteboard-controls, mind-map-controls |
| board-tab-walk | Unreleased | use the whiteboard with the keyboard only | none ("Tab walks" matched code-files' snippet stops) | code-files, whiteboard-controls |
| ocr-language | Unreleased | change the ocr language | none | ocr-engine |
| time-words | Unreleased | does it understand dates in my notes | none | time-and-recency |
| recency | Unreleased | what did I save recently | none | time-and-recency |
| citation-preview | 0.3.31 | what are the numbers in an answer | none | chat-controls |
| stop-answer | 0.3.31 | how do I stop an answer | none | chat-controls, quick-note |
| job-last-run | Unreleased | when did the backup last run | none | background-tasks |
| lock-dialogs | Unreleased | what happens to open windows when it locks | none | security |
| model-downloads | Unreleased | how do I download a model | none | model-downloads |
| model-fit | Unreleased | which model fits my computer | none | model-downloads |
| settings-search | Unreleased | find a setting | settings-overview | dashboard, search, dashboard-controls, settings-overview |
| view-address | 0.3.31 | does each view have its own address | none | addresses |
| delete-space | Unreleased | delete a space | none | spaces |
| reminders-ics | 0.3.31 | add reminders to my calendar | none | reminders-controls |
| dashboard-menu | Unreleased | what is in the dashboard menu | dashboard-controls (not reached by the question) | dashboard-controls |
| toasts | Unreleased | a message is covering the button | none | accessibility |
| zoom | Unreleased | zoom the app | none | accessibility |
| single-keys | Unreleased | turn off single key shortcuts | none | accessibility |
| screen-reader | Unreleased | does it work with a screen reader | none | accessibility |
| density-auto | 0.3.31 | change the density | none | appearance |
| companion-toggle | 0.3.31 | hide the companion | companion | shortcuts, companion |
| privacy-receipt | 0.3.31 | prove nothing left my computer | none | privacy |

Existing entries corrected on the way: library-controls named a Links sub-tab (it is Bookmarks); settings-overview listed four Settings groups (there are six); the old Settings, Help accordion still taught "g then a letter" for the tab chord (it is m), and is now drawn from the table itself.
