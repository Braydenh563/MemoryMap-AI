# Changelog

All notable changes to MemoryMap AI are recorded here. The format is loosely
based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the
project follows a "waves and phases" development history (see the milestones
below). Versioning is `0.x` while the app stabilises.

## [Unreleased]

### Added

- A file's menu in the Library offers Ask Atlas about this, like every other
  object's menu; the reminder menu's entry uses the same icon as the rest.
- Files: a description or reading typed while the automatic one was still being written is no longer overwritten when the automatic one lands.
- Empty states: the Timeline's sits centred in its card instead of at the foot under a blank body, and the Graph's action button is its own width instead of spanning the map.
- Dashboard: an empty notebook no longer shows a strip of zeros above the welcome card; the figures appear with the first note or reminder.
- The loading screen shows one progress indicator (the bar) instead of animated dots above a bar; the dots stay as the screen reader's loading status.
- Ctrl+D opens today's note from any tab, or starts it in the composer with
  the day as its title when the day has none (a document titled with the day
  counts too). It is in the shortcuts list and can be rebound. On an open
  board Ctrl+D still duplicates the selection, and inside the documents editor
  it still selects the next match.
- Settings, Models says what the built-in search engine costs in memory
  (about 650 MB while the app is open, measured) and that choosing Ollama for
  embeddings keeps MemoryMap itself near 100 MB. Measured with the imports at
  startup, which were already lazy: nothing heavier than FastAPI, SQLAlchemy
  and alembic loads before the embedding model does.
- Dragging a note that is part of a lasso selection on the graph carries the
  whole selection with it, at the same offsets. Before, only the note in hand
  moved and the rest of the selection stayed put. The usual rules hold for
  every note carried: a plain drag places, Shift pins, and a pinned note stays
  pinned where it lands.
- Settings, What it learned can delete or reset several rows at once: tick
  them and the selection bar offers Delete, and Reset when a ticked row was
  edited by you. One request changes them all or none, and each deletion is
  still remembered so the next run does not derive it again.
- A Recent activity widget for the dashboard, in the widget picker: what
  changed in the notebook lately (notes, documents, boards and reminders),
  and whether you, Atlas or a skill changed it. Off until added, so no
  existing dashboard grows a widget. It reads the event log's newest rows
  once and then only what came after, with no timer running while the tab
  sits idle.

### Fixed

- Boards: a concept map card's text is edited in the same editor as every other note box (live formatting, the "/" menu, Ctrl+B), with Enter to finish, Shift+Enter for a new line and Escape to discard; Tab in a card no longer jumps out of it.
- Documents: New from a template shows a preview of the page each template makes beside the list, on a window wide enough for two columns.
- Documents: the outline's rows take the app's 28px control floor under the comfortable and spacious densities and 44px on a touch screen; compact keeps the dense 25px list.
- Library, Boards & maps: a board or map card says when it last changed (the later of its own edit and the last thing drawn on it), like every other Library card.
- Fewer pills: the Library's kind row, the Boards filter, Reminders' Open/All/Done, the Write tab's starters and the dashboard's Jump to row are drawn with a button's corner; category, tag and fact chips with a small one; the dashboard's skill buttons lose their dashed edge; chips no longer rise on hover. On Ask, "Ask again" and "Try asking" questions are one style, a past question marked by a clock.
- Library, Boards & maps on a phone: the dock is two rows like every other Library dock (was four, 198px to 114px at 390); New mind map and Reload move into the dock's menu there and back out on a wider window.
- Segmented controls round their corners from one table: a choice control, a tab strip, a control inside a bar, the chat dock's pills and the one full-bleed strip; the OCR rail's Images, Files and Pages switch and the radio-backed toggles outside a bar now match the rest.
- Ask: every sentence the notes back gets its citation number in the answer, including sentences in a list, after a bold label or with a word in italics (a formatted answer grounded to three notes used to show none); the Matching records column is numbered as each sentence completes instead of after the answer finishes.
- A connection pill's ⋯ is round, so its hover no longer pokes past the
  pill's border, and a linked note whose first line is a heading or a
  clipped image reads as its words (no `#` or half an `![...`).
- A skill's facts line in Settings no longer starts a wrapped line with its
  separator dot.
- A reminder's time sits at the end of its row; with a mouse, its actions
  appear over the time on hover instead of holding an empty 193px gap. An
  overdue reminder keeps its amber edge without the amber frame as well.
- Settings section intros step down to sit under their headings (they were
  larger than the headings they describe).
- Resizing the window across the phone width no longer leaves the Timeline's
  previous view in the page: the rows counted twice (113 read as 226), which
  broke arrow-key walking, the pinned day head and Enter's detail.
- Timeline rows with a second line keep their kind mark and time on the
  title's line, rather than centred between the two lines.
- The graph options panel's four section heads share one style (they wore
  three), and the dashboard's day streak tile opens the Timeline instead of
  doing nothing.
- Labels that lost their capitals in Quiet keep their rank: a section label is small, bold and in ink over a muted description, and the Contents index's section names are headings with the Timeline's underline over rows one step smaller; a Files row's name is in ink and lines up with its facts.
- Scrolling and typing, traced and cut: the page scrollers and the editor scroll on the compositor (Notes scroll raster 2.7s to 0.25s, Library 1.0s to 0.2s, typing in a long document 3.2s to 0.24s over a 30-step scroll or 88 characters at 1184x760); a card's hover animation stands down while a list scrolls; the back-to-top check no longer matches every button in the app on every scroll frame (184ms to 12ms); the open-menu checks on every scroll event walk only the menus; typing in a document no longer restyles the whole editor per keystroke (style 1.65s to 0.35s) or rewrites 51 toolbar states; the Library search no longer cross-fades the window on every letter.
- Dashboard: Quick capture saves on Ctrl+Enter (Cmd+Enter), and its placeholder says so.
- Reminders: Enter adds a reminder from its text field, and in the edit form Enter saves and Escape cancels.
- Settings: Ctrl+F searches Settings while it is open (it used to search the page hidden behind it), and the arrow keys, Home and End walk the pane list.
- Settings: Packages no longer shows its heading twice.
- Dashboard widgets: a map in Boards & maps reads as a title like a board beside it (not an accent pill), the heatmap legend shows its swatches, and a reminder shows its time on a line of its own.
- Settings: a pane's title no longer sits flush on its first group, and a checkbox row keeps a gap from the field above it (found by a sweep for flush-stacked controls across every tab and pane).
- Documents: opening a markdown document right after typing in a code file no longer throws a stale completion error.
- A plain toast can be dismissed by tapping its text, as well as by its close button.
- A confirmation's button names its action ("Delete", "Remove", "Clear"...) read from the question, instead of a red "OK".
- Reminders: a reminder's row keeps its two snoozes and Edit, and gains a menu with Open its note, Ask Atlas about this, Copy text and Delete (still undoable), in place of a fourth icon.
- Lists keep the conventions people expect: a right-click (a hold on a phone) on a Library card, a Documents row, a link, a file, a note or a chat opens that row's own menu at the pointer; F2 renames the focused row; the arrow keys, Home and End move between cards and rows; Shift+click ticks the run between two; with a selection open, Escape clears it, Ctrl+A selects every row instead of the page's text, and Delete presses the bar's own Delete; the Library keeps its scroll position when you come back from another tab; an empty Library search offers Clear the search; Library cards and document rows gain Copy title (and Copy link for a document); New note, New document, New chat, Settings and light/dark name their shortcut in the tooltip.
- Library on a phone: the Files and Images dock is two rows instead of three (sort and view fold into a menu, as on the other sub-tabs), the floating Create shows only on the All view where it belongs instead of beside each sub-tab's own filled action, and New mind map keeps its icon without its word below 600.
- Library, second pass continued: skill cards title at card size (the eyebrow rule had set them at 12px), Built-in as a small label, Run as a ghost button so New skill is the one filled button, and the background workers as the settings switches; the skill log's Clear rests disabled with nothing to clear; the Contents index names a note by its heading, keeps its labels on one edge, and its jump chips lose the accent tint; chips that are still chips carry a hairline edge in the flat looks so they read on a white card; a failed thumbnail (dashboard, Contents, chat sources, timeline) is hidden instead of drawing the missing-image box in its slot; timeline rows show the category with its colour dot and tags as #tag, and leave Uncategorised out.
- With glass on, the status bar is glass like the top bar instead of an opaque strip.
- Resizing or turning a group of selected items is one undo step (Ctrl+Z put nothing back before), and Escape during it puts every member back.
- The board's help, the map rail's help, the rotate and resize grips and the map's canvas menu now name the new gestures and keys (Alt-drag, Shift to constrain, Escape to take back a drag, double-click a grip or a line, Ctrl+0 and Shift+1), so they can be found without being told.
- On a touch screen the Library card ticks and the reminder ticks keep their 44px target but draw a 22px box in the middle of it, instead of a bordered, shadowed 44px square beside every row at rest.
- The keyboard hint strip no longer stands over the bottom of every new mind map (it counted note cards, which a map has none of): a map's selected topic already names the keys on its ring and the rail's ? lists them, and on a whiteboard the strip shows only while a single note card is selected, the only time Tab and Enter act, and never over that card.
- The board and mind map View menu: groups are told apart by a hairline instead of a printed heading (DESIGN.md's menu rule), Zoom in and Zoom out leave it (the zoom bar has both), Zoom to 100% and the keys for it and for Fit join it, the Toolbar row moves in with the panels, the columns break before Panels so no rule sits at the head of a column, and a whiteboard no longer shows an empty "Map" group: 453px to 357px on a map at 1440.
- Lock screen: a real title, the password field at body size and the Unlock button as wide as the field.
- Notifications: the panel is wide enough for its activity picker, and in the flat looks an unread row is marked with a dot instead of a coloured left edge; the palette no longer paints a hovered row like the chosen one.
- Find anything: the text-selection menu no longer appears over the Finder (a search field's selected query is not writing; fields inside overlays are excluded); result rows lose the button glow, titles step to 500, dates read "Sep 23", a zero-count kind is dimmed, the dialog's name is its heading and Sort matches the chips. In the flat looks no button carries the accent glow.
- Settings: every pane opens with its name as a heading (eleven of eighteen began mid-thought), a list row's actions sit on its title line instead of leaving an empty band under it, and labels straight in a pane line up with their text.
- Settings: every section help "?" sits on one right edge (five positions before) with no filled ground in the flat looks; a pane's title is a real heading flush with its text; skills, personas and templates show a title, a hairline Built-in label, dot-separated facts and "Changes notes" in the warn colour instead of rows of identical pills; a persona's voice is clamped to two lines instead of cut mid-word.
- The guided tour is back on, and every door into it works again. It was broken whenever anything was open over the page (the Atlas guide, the command palette, the features browser, the shortcut sheet): each step lit up the overlay instead of the control. The tour now closes what is open before every step and checks that nothing is drawn over the control it points at. On a phone the card is a sheet at the top or bottom of the screen, Settings and Timeline point at More with words that say so, and the step count no longer changes half way through. Typing in the highlighted box types instead of moving the tour.
- Graph: the Documents switch now shows every live document (unattached ones alone, hidden by Hide unlinked like any lone node) instead of only documents attached to notes, which left the switch doing nothing on most notebooks; the options panel's folds are inset from the edge and the Groups field matches its Add button's height.
- Board and mind map conventions, second pass: a board's bare canvas answers a right-click with its own menu (paste here, a text box, a sticky, select all, zoom to 100%, fit) and a double-click with a text box ready to type; Ctrl+0, Ctrl+=, Ctrl+- and Shift+1 work the board's zoom, and the zoom buttons name them; a double-click on a mind map's branch line asks for its label instead of making a new topic on top of it.
- Board and mind map conventions, first pass: double-click a rotate grip stands a card, text box or shape upright again; Shift on a corner keeps the box's proportions (it squared it); Shift keeps a drag on one axis; Alt-drag leaves a copy behind; Escape during a move, resize, turn or link draw puts everything back and records nothing; a burst of arrow nudges is one undo step and no longer drops presses; a group drag undoes whole; Ctrl+D, copy and paste take several items at once and paste at the pointer; a click on a shape's grip no longer deselects it; Ctrl+Shift+G on a board ungroups without also switching agent mode on.
- Library, second pass: cards read left to right in the order the sort promises (they were dealt top to bottom one column at a time, so every tag landed in the last column); a note card no longer repeats its first line as its preview, and a document row no longer repeats its title; "Uncategorised" is left off card feet and a real category shows with its colour dot; a card's picture fills the card's top edge; a board card's icon leads its title; a file's first-page thumbnail that fails no longer draws "Image no longer in this notebook" inside the tile; the tick on Documents, Links and Files rows takes the kind mark's place under the pointer instead of a 28px square on every row; the Links add form folds away behind Add link (Esc or Done closes it); row titles share one rank and a file's read state is a fact, not a pill.
- Note meta line, second pass: the category is a soft pill with its own stable colour dot, tags read #work, a date reads as the day alone (the note's own phrase on hover), and each connection is one pill with its menu inside it, so hidden menus no longer leave gaps between connections; image markdown no longer shows raw in a connection's label. Settings no longer scrolls sideways at 768.
- De-vibecoding, settings: switch labels at 500 instead of bold, a healthy status is a green dot before muted text instead of a green sentence, section help is a bare glyph in the flat looks, number fields share one short width, and the name placeholders no longer carry a real person's name.
- De-vibecoding, reminders: the due readout is a small muted note on the form, and a reminder's own words are body size instead of 12px.
- De-vibecoding, timeline: row titles at 500 and the category as muted text, instead of a column of bold accent pills.
- De-vibecoding, dashboard, chat and graph: sentence-case labels in Quiet, plain stat icons, no eyebrow over the greeting, an even 16px rhythm, the name nudge as inline text; card titles at 600 (650 rendered as bold on static fonts); chat suggestions read as questions, not accent pills; the thread mark and the graph legend lose their extra frames.
- De-vibecoding, Notes and Library: a note's facts are one quiet line (category with a dot, #tags, space, links, date) instead of five pills, and confident AI filing moves to the category's tooltip; in the flat looks a selected tab, segment or filter chip is a neutral ground so the accent marks only actions; the Library hides empty kinds, shows a card's tick on hover (always on touch), drops the per-kind colour stripe in the flat looks, and titles step down to 600; the notes filter placeholder no longer truncates.
- The "No model is connected" notices keep a gap below their button, so the draft chips and the agent's description no longer sit flush against it.
- A cross-link on a mind map is drawn like the map's own branches: the same ribbon or line style, facing anchors, weight and taper, in its branch's colour, instead of a straight pen-coloured line.
- With glass on, the graph's floating dock and panels and the chat composer are frosted panes like the rest of the glass chrome, instead of an opaque bar and a near-black well.
- The full test suite runs across every core (pytest-xdist): under 9 minutes on four cores instead of about 25. The resurface timing test now waits for the embedding warm-up before it starts its clock.
- Quiet utilitarian no longer sets compact density, which had squeezed every spacing token app-wide, and the dashboard's Full view has its labelled rows, two-line hints and larger clock back, so Full and Compact differ again (first widget at 631px against 483px at 1440).
- On a phone the foot of the screen is one bar, not two: Back, Undo and the
  AI status sit in the top bar, and the status bar's other controls are in
  the top bar's menu. The status bar comes back only while a job is running,
  or when offline or on power saver.
- On a phone a note row is the note: no action buttons sitting on its tags,
  no coloured strips at its edges, and the list runs the full width. Swipe
  to favourite or bin, tap to open, or use the row's menu.
- On a phone the Notes and Chat headers are one row (title and actions),
  with the search under it; the chat's model, skills, web search and plan
  are in the "How it answers" sheet behind the gear, so the controls under
  the chat box fit on one row and nothing is cut off.
- On a phone Reminders opens on the list; "New reminder" (the floating
  button, and a button in the list's header on a computer) opens the add
  form as a sheet, which closes once the reminder is added.
- On a phone every list header is one row of title and actions with the
  search under it, and the Library's cards start on the first screen: the
  header is unframed, the words-written line is left to the dashboard, and
  a card's preview is three lines.
- On a phone toasts and the agent activity panel no longer cover the tab
  bar (a toast also clears the floating button), and a long note shows five
  lines in the list rather than eight.
- A board's top bar menus keep an icon when their words are dropped on a
  narrow window, instead of five identical arrows; on a phone an open board
  takes the Library's sub-tabs' space, the map's keyboard hint is left to
  keyboards, and the tool bar at the foot has lost a stray dark frame.
- On a tablet, or any touch screen, every control is a finger's size
  (44px) at any width, not only below 820; the status bar is a touch bar
  there and no longer pushes the page sideways at 768; Reminders opens on
  its list below 1100; and the Library's kind chips stay on one row.
- On a phone every ⋯ menu opens as a sheet from the bottom of the screen,
  with full-width rows; Escape closes only the top sheet when one is open
  over another; and closing the sidebar sheet puts the focus back on the
  button that opened it.
- Tab in the documents editor leaves the caret after the indent it inserts;
  what you typed next used to land before it.
- JSX in a `.js` document is no longer underlined as a syntax error.
- Scrolling does less per frame everywhere: the back-to-top button updates once per frame and only writes what changed, the bar-over-list edge measures only when a list crosses its top, and the graph's wheel listener lives on the graph canvas instead of every tab.
- The packaged Windows app shows a splash from the moment it is opened, drawn
  by the launcher itself before Python starts, and closes it when the window
  appears. Not verified on a Windows build from this sandbox.
- Optional packages installed from the packaged app, or ticked in the
  installer, now actually load: they go into a folder beside your notes that
  the packaged app reads. Needs a Python on PATH to run pip, as before.
- Editing a note right after starting the app no longer blanks the notes list.
- The note count is the same everywhere (drafts are left out, as the list
  already did).
- Select all (and Select none) in every selection bar; the Timeline's only
  ticks notes and boards, the rows its actions can act on.
- Clicking into a table cell in the documents live view puts the caret where
  you clicked.
- Undo covers text formatting, colours and every mind map style change.
- The Notes toolbar stays on one line in the desktop window; the dashboard's
  Start tiles fit one row there, and never wrap in compact view.
- On a mind map the bottom bar offers one Cross-link tool drawn in the map's
  own line style, instead of a generic straight and curved pair; a map
  line's label drags with the pointer and no longer starts a selection box.
- The dashboard's note count leaves out boards and maps, as the Notes list
  does.
- Notes, documents, boards and maps can be taken straight to a chat with
  Atlas from their menus, and a note to the graph (centred and lit).
- Menus, docks, popovers and the graph toolbar follow the chosen look in
  every palette (they stayed navy in dark), the desktop loading page and the
  packaged splash wear the look too, and a new Background wash setting gives
  the flat looks a soft light across the page. Classic is second in the list.
- The mind map node menu is eight rows with Add, Topic, Branch and Order
  flyouts (was eighteen rows, most of the screen), and the topic's ring stays
  open beside it. A press inside any menu no longer closes it before a group
  can open. The dashboard's top is calmer: a lower hero with an ink clock,
  one-line start tiles, and Jump to as quiet pills beside their label.
- A dashboard you have not arranged shows nine widgets (reminders, recent
  notes, favourites, quick capture, documents, boards and maps, the weekly
  digest, on this day, the heatmap) instead of all twenty-three; the rest are
  under Widgets, and Reset returns here. Reminder times read as a day and a
  time, and the heatmap counts notes, not boards.
- The Back and Forward history names places ("Documents: Weekly plan",
  "Library: Documents") instead of internal ids.
- Model pickers show the short model name and stop at 14rem, and no longer
  call an installed model "not installed".
- Theme and palette cards in Appearance keep their text inside the card and
  line up: swatches and names on one line per row, descriptions in body weight.
- Links everywhere use the accent colour (plain links were the browser's own
  blue and purple); Timeline rows for boards and reminders no longer repeat
  their title as a snippet; an empty Ollama embedding picker says why.
- A note's connections are one chip and one ⋯ menu each (edit or clear the
  reason, remove the link), instead of three round buttons inside every chip.
- The chat header names the model that actually answers (on llama.cpp and
  LM Studio, the loaded one), or says a set model is not installed, instead
  of the configured default. A broken search by meaning now says so in a
  toast and the bell, with a Fix it button, not only inside Settings.
- A picture is described once and its text read once: repeat saves no
  longer queue repeat jobs, Tesseract stands down when a vision model reads
  the text, and a running caption shows as one row in Agent activity, not
  two.
- Panning and zooming the whiteboard and mind maps no longer re-styles every
  item on the board each frame (traced: 2.4 s of style work over a 50-step
  pan on a 60-topic map, now 29 ms; zoom 1.4 s to 18 ms). Worst frame at 50
  topics is one frame for pan, drag and zoom alike.
- Text boxes, sticky notes and mind map topics keep their line breaks when
  saved (they were joined into one line), and Tab / Shift+Tab indent lines
  in them. Note boxes indent with Tab from the first keystroke after a
  restart, not only once the editor has loaded. Renaming a topic can be
  undone.
- The note Capture box's formatting toolbar stays on one row in the desktop
  window: the two colour pickers are an icon and a caret, and on a narrow
  window List, Task and Preview show their icons only.
- A missing search-by-meaning package is reported in words, with
  nomic-embed-text offered as the alternative, instead of a traceback.

### Added

- Code documents act like a code editor: a syntax error is underlined with a
  mark beside its line and says what is wrong on hover (Python, TOML, XML
  and YAML checked by the app itself, JSON, JavaScript, TypeScript and CSS in
  the window, nothing sent anywhere), and a list of the language's keywords
  and the names already in the file appears as you type.
- Code documents close quotes and brackets as you type, with the caret
  between them: typing the closer steps over it, Backspace in an empty pair
  takes both, and a pair typed over a selection wraps it. Enter between
  braces opens an indented line with the closer below it, and a typed `}`
  lines up with its opener, in every code type including C, Java, Go, Rust
  and PHP.
- Format for code documents, from a Format button in the document's dock,
  Shift+Alt+F or the command palette: the selected lines, or the whole file
  when nothing is selected. It re-indents by the brackets (by the elements
  for HTML and XML), removes trailing spaces and ends the file with one line
  break, never touches the inside of a string, keeps every JSON number
  exactly as written, and refuses with the reason when the code does not
  parse. Python and YAML keep their indentation, which is their syntax. One
  Ctrl+Z undoes it.
- Quick fixes for code problems: hovering an underline offers its fix as a
  button, and Alt+Enter lists the fixes at the caret (with both formats
  beneath); F8 goes to the next problem. Fixes add a missing bracket or
  quote, change or remove a stray closer, close a comment, remove a JSON
  trailing comma, add a missing comma or quotes in JSON, add Python's
  missing colon, and convert mixed tabs and spaces. C, C++, C#, Java,
  Kotlin, Go, Rust, Swift, PHP, R and SQL documents are now checked for
  unbalanced brackets, strings and comments.

### Changed

- Capture's "Add to this note" tools (Attach, From library, Sketch, Dictate,
  Improve) and "Add to document" are a quiet toolbar rather than a row of
  heavy buttons, with Improve set apart; every Capture row shares one label
  column, and on a phone the labels sit above their fields.
- **A new default look, Quiet utilitarian**: a warm grey ground, solid
  panels, one ink-blue accent and tighter spacing. Two new looks, Editorial
  paper and Technical mono, sit beside it in Appearance, and the previous
  look is kept as Classic. A look you already chose is kept.
- The documents live view reads as a page: the text sits in a measure of about
  75 characters with a margin either side, and the space between blocks comes
  from one scale (more above a section, less under its heading, one gap
  however many blank lines were typed).
- Tables in the documents live view mark the cell you are editing, have the
  rendered view's cell spacing, keep their menu clear of the last heading,
  and a new row from Tab puts the caret where you would type. Code blocks
  have an inset, and quotations have a visible bar in both the live and the
  rendered view.
- The documents live view draws more of markdown: indent guides under
  nested lists, finished tasks struck through (in the rendered view too),
  bare web addresses and `<address>` links as links, and a backslash escape
  without its backslash until you are on the line.
- The mind map node menu is grouped with dividers instead of hover
  submenus, so it works by touch and keyboard. Clearing a line's label
  prompt no longer deletes it; "Take the label off the line" does.
- "Advanced response settings" in Settings, Models lines up with every other
  heading. Its disclosure arrow pushed it 20.8px to the right; the arrow now
  hangs in the margin beside the heading instead of being removed.
- On a phone, the '?' beside "Tools this skill may use" in Settings, Skills
  can be pressed again. The fold's heading wrapped onto two lines inside a
  box pinned to one line's height, which left the '?' outside the box it
  belonged to; a fold heading now grows with its words. Found by a new sweep,
  `scratchpad/ui-sweeps/help-popovers.js`, which opens every '?' in Settings
  at 1440 and 390 and checks each one lands inside the window (82 of 82).
- Reminder alerts no longer miss a reminder that is due when the notebook
  holds many finished ones. The minute-by-minute check read one page of
  reminders ordered oldest first with the ticked-off ones included, so the
  page could be all done reminders; it now asks for open ones only, soonest
  first. And two requests the app made twice at every start (recent
  questions and most-used notes, once for the Notes tab and once for the
  dashboard) are made once, because a request already in flight is now
  shared by whoever asks for the same thing (measured with
  `scratchpad/ui-sweeps/oi-dupfetch.js`: 6 boot requests to 4).
- Similar-notes lists can no longer contain a note that was deleted or made
  private in the same session. Its vector was blanked in place, and a blank
  row outranked every genuinely unrelated note, so a short list could come
  back with a hole in it; blanked rows are now skipped, and dropped from
  memory once they are a quarter of the total.
- A reopened chat or Ask history answer keeps its "Only 1 of 3 sentences here
  comes from your notes" line. The line appeared when an answer arrived and
  was gone once the conversation was reopened, because nothing stored it; the
  saved turn now carries it, counted on the server by the same rule the live
  answer used.
- "Rebuild search index" in Settings, Models rebuilds the word index as well
  as the semantic one. The word index was built once, when its table was
  first made, and could not be rebuilt after a restore, an import or a fault;
  `/search/stats` now also says when it was last rebuilt and with how many
  rows.
- `has:image`, `has:link` and `has:reminder` work in Find anything. They were
  understood and matched nothing; now a picture attached or written into the
  text, a connection to another note, and a reminder on the note each answer,
  checked over the matches rather than on every save.
- Search no longer finds things that are gone. Emptying the bin left each
  purged note in the search index for good (it still answered `is:deleted`),
  and deleting a space left its notes, documents and reminders findable from
  All spaces, because both delete in bulk and the index only follows ordinary
  saves. Both now take their rows out, and a lint fails any new bulk delete
  of a searchable kind that does not.
- A note the AI re-files, by adding context to it or by re-evaluating it, is
  marked as the AI's choice, the same as a note it files on save. Moving one
  of those by hand afterwards now records the correction the filing loop
  learns from; before, only the two create paths set the mark, so a second
  guess by the AI was invisible to it.
- Settings, Models says which model background jobs actually run on, and why
  (INBOX 277). The utility picker shows the stored choice, and that choice is
  not the model in use while smart model routing is off or nothing has been
  chosen; a line under it now reads, for example, "Background jobs run on
  llama3.2, the chat model, because smart model routing is off", from one
  server function (`utility_resolution`) that `utility_model()` itself uses.
  The routing switch beside it also showed unchecked whenever Settings was
  opened on Models, because only Background tasks ever filled it in; it now
  reads the stored value when Models opens. Label in sentence case.

## [0.3.2] - 2026-09-21

### Fixed

- The whiteboard context bar's "More" menu opens against the bar in a short
  window. When neither side of the bar held the whole menu it was pinned
  wherever it fitted, which at 947x608 (the 1184x760 window at 125% zoom) put
  it over the bar it came from, 86px from either edge. It now takes the side
  with more room, ends 2px from the bar's edge and scrolls inside that height.
  The Size field and the bar's centre line were measured and already right on
  this head (Size shows "16" and "128" whole in its 62px; every control
  centred on one line, 0px spread).
- Library, Images: a "Kinds" menu beside the search box shows sketches,
  uploaded images or both, and the sort applies to whatever is left. A
  sketch is the PNG the sketch pad saves as `sketch-<stamp>.png`; each kind's
  count is in its row, and the last kind on cannot be turned off. The menu is
  the Timeline's own "Kinds" dock menu, Images only, as the read filter is
  Files only. The same pass fixes both kinds menus drawing a short label
  centred between its icon and its switch (the Library's two at 669 and
  637px, now both 632).
- The Agent activity panel is laid out on one grid. Its head is the app's
  panel-head recipe (the title, then three icon buttons with tooltips, all on
  one centre line), and every run row is four columns: fold marker, icon,
  name, state pill. The detail line and the bar start under the name rather
  than 33px to the left of it, a long name or detail truncates to one line
  with the whole text on hover, the state is a tinted pill whose right edge
  is the same on every row, and a run's steps start under its icon. Measured
  at 1184x760 by `scratchpad/ui-sweeps/monitorgrid.js`: header centres
  within 0px, name, detail and bar left edges all at 80.4px, pills all
  ending at 388.4px, the first row 57px rather than 96px.
- The weekly digest no longer opens with a greeting or a sentence announcing
  itself, and no longer turns "tonight" in yesterday's note into tonight.
  Each note reaches the model with the day it was written and the prompt
  names today, with an instruction to read relative words against the note's
  own day and to say past ones as past; the previous "use no time
  references" instruction is gone. The answer trim the Ask tab uses now runs
  on the digest too, and also recognises "Based on the notes you provided,
  here is a quick digest...".
- Mind maps show in the Find anything search as mind maps, with their own
  filter chip and glyph, and are found by the words written on their topics,
  not only by their title (a board's text boxes likewise find the board).
  Maps had been indexed as boards, and only the `# Title` line of either was
  indexed. An existing index is put right at the next start by a diff over
  the boards, a no-op once done.
- The packaged Windows app now says what is wrong when it cannot show its
  window, instead of a blank or missing graphic with nothing in any log.
  Reported directly on the .exe build: pywebview's Windows backend needs the
  Microsoft Edge WebView2 Runtime, which the app bundles the loader for but
  not the runtime itself, and a machine without it installed could get a
  launcher with no visible feedback at all. Detected once, before the window
  is created (the same registry key Microsoft's own docs point at), and
  answered with a native message box plus the official installer page opened
  automatically. Not verified against a real machine reproducing the report;
  the detection logic itself is tested against a faked registry, in both
  directions and against a broken registry call, which must never crash the
  launcher.
- The MSI build is switched off in the release workflow. WiX Toolset v7 now
  refuses to build at all without accepting its Open Source Maintenance Fee
  EULA, which had also been taking the working .exe upload down with it: a
  failed step ends the job before the upload step runs. The MSI stays in the
  file, disabled, until the EULA is accepted or an older WiX is pinned.
- Answers arrive without their padding. A greeting, an announcement of what
  the model is about to do, and a closing offer of further help are taken off
  before anything else reads the answer, so the saved turn, the export and the
  grounding marks all see the same text. Conservative on purpose: a qualifier
  like "based on your notes" is part of the claim and stays, and a pleasantry
  that is the whole answer stays too, since an empty answer says less than a
  useless one.
- Tesseract only reads a page when it is the reader you chose. Storing each
  page's regions stopped the repeated reads, but a first look at a page still
  ran Tesseract whether or not you had picked it, which is how a page meant
  for the vision model came back transcribed by the other one, and how an
  edited reading could be replaced by one nobody asked for. The workspace now
  says whether an automatic read is wanted, and answers honestly with "use
  Read this page" when it is not.
- The chat header no longer draws a hairline to the left of its icon. The
  dock's divider rule puts one before every zone after the first, and the
  first zone there is the phone sidebar button, which is not drawn on a
  desktop, so the line stood between nothing and the thread mark.
- The Windows splash screen can be got out of the way. It is a borderless
  window that sits above everything, so a first install that pulls a model
  could hold the screen for minutes with no way to move it aside. There is a
  Minimise button beside Cancel now, and it drops the always-on-top flag while
  minimised so the window restores from the taskbar without jumping back in
  front of what you moved to.
- The guided tour is switched off while it is being fixed. Every door into it
  is disabled and says why: the welcome's last panel offers "Get started"
  instead of starting a tour, and the replay buttons in Settings, Help are
  greyed. One flag in `tour.js` turns it back on.
- The Ask tab's matching records read better: the reference number is a
  square in the top right rather than a rectangle on the left, the badges and
  the timestamp share their rows instead of the date taking one of its own,
  and a note's connection labels are cut at 48 characters rather than 28, so
  a wide card no longer stops two thirds of the way along a row with room to
  spare.
- Two more suggested models, Unsloth's quantisation-aware 4-bit copies of the
  two Gemma MoE models, which are roughly half the download for close to the
  same answers.
- The Ask tab's "show the N notes used" button is gone. It counted the notes
  the Matching records column is already showing and scrolled to the first one
  cited, which is a second door to a list on screen beside the answer that
  already carries the answer's own numbers on its rows. Sources the column
  does not hold, a file or a web page, keep their cards.
- The Ask tab's progress indicator is inside the answer, not above it. The
  dots, "the model is thinking" and the rotating line were drawn above the AI
  ANSWER heading while the bubble underneath held a second set of dots and
  nothing else, so one answer had two indicators and neither was where the
  text would appear. There is one now, in the bubble it is filling.
- A matching record's reference number sits in the top right corner and no
  longer moves the text. On the left it was paid for with padding, which
  indented every line of the card to make room for a mark that only occupies
  the first one.
- The welcome's last panel names both answers. Its primary says "Start the
  tour", and the button beside it, which has always closed the welcome and
  counted as declining the tour, said only "Skip". It says "Skip the tour"
  there, and its tooltip says the tour is still in Settings, Help whenever
  you want it.
- **What the notebook costs while nobody is touching it, measured and then
  cut** (INBOX 266, item 7). With no browser attached the server is asleep:
  0.04s of CPU across 23 threads in 30 seconds, 0.13% of one core, because
  every background piece blocks rather than polls. The cost is the open tab,
  and two things in it were being paid for nothing. Two HH:MM clocks ticked
  once a second and wrote the string already on screen 59 times out of 60;
  they are scheduled on the wall-clock minute now (`startMinuteTicker`),
  which is cheaper *and* more correct, since the status bar's clock was a
  30s interval and could show a minute that had already passed. The model
  status poll asked twice a minute for as long as the app stayed open, and
  every one of those asks reaches Ollama; it now doubles to a two-minute
  ceiling while the answer is identical and drops back to 30s on any change,
  on returning to the tab, on opening Settings or on starting a job.
  Measured with `scratchpad/ui-sweeps/idle.js`, which now counts timer fires
  as well as live intervals: **timer wakes in an idle visible minute 124 to
  5, requests 4 to 2** (WORLD_CLASS_PLAN section 10's gate for this row),
  and idle CPU **6.01% and 6.11% of one core to 5.50% and 5.59%**
  (`scratchpad/ui-sweeps/idlecpu.js`, one server, one notebook, frontend
  swapped). The honest reading is in `docs/ARCHITECTURE.md`: nearly all of
  what is left is the Dashboard's emblem animating on purpose, which parking
  the app on Notes prices at 2.09% against 5.55%.
- **Why the notes live in SQLite, written down as a decision** rather than
  re-argued (INBOX 266, item 7, and `docs/ARCHITECTURE.md`): one file to
  back up, no server to install, transactions that are what "no silent
  loss" is built on, FTS5 search in the same file and written in the same
  transaction, and 1.8 KB per note measured at 50,000 notes. With where it
  would stop being right (concurrent writers, multi-device sync, a vector
  index past these sizes), and why "containers spun up as needed like
  serverless" is the right instinct for a different machine.

- **What happens when the disk fills up, measured on a real full filesystem
  and then made honest** (INBOX 266, item 6). An 80 MB tmpfs was mounted as
  the data dir and filled to 100%, and the app driven against it. Saving a
  note already answered 507 with a sentence about disk space, and reading,
  searching and exporting kept working throughout; three things were wrong.
  **Unlocking answered 507**, so a full disk locked the person out of their
  own notebook entirely, over the audit row written beside the unlock: the
  unlock's two writes are now committed separately and an out-of-space
  failure costs only itself. **A failed backup left a zero-byte file named
  like a backup**, which listed as one, passed `PRAGMA integrity_check`
  (an empty file is a valid empty database), and would have replaced the
  whole notebook with nothing if restored: backups are now written to a
  `.partial` sibling and renamed into place only once whole, empty files
  are never listed or counted as the daily backup, and restoring one is
  refused by name. **A failed upload or export left its half-written file
  behind**, orphaned and taking up the space the person was short of: all
  three streaming writes now clean up after themselves. A single ASGI
  guard (`SpaceGuard`) refuses a write larger than the room left before a
  byte of it is read, so the app can no longer fill the last megabyte and
  lock itself out; the 507 now names the folder, how much is free and
  roughly how much to free up, that sentence reaches every toast in the
  app, and `GET /storage` reports `free_bytes` beside `data_dir_writable`,
  which stayed `true` throughout on a disk that was 100% full. Settings →
  Data carries a `.notice notice-warn` line when the room left is low.

- The reading workspace stops re-reading a scanned page every time you look
  at it, and its reading panel covers the whole document again (INBOX 314).
  Three findings from one report. Where each block sits on a page is now
  stored beside that page's reading and served from there, so an optical
  reader runs once per page rather than once per look: a scroll down and back
  up over a six page scan went from 13 reader calls to 6, and four looks at
  one image from 4 to 1, measured with a fake reader counting its own calls.
  The panel lists every page the app has something for, in page order, rather
  than choosing between the stored reading of every page and the sections of
  the page on screen: Tesseract returns sections for every page, so that
  choice always came down on the second, which is why only one page of text
  could be seen, why it did not follow the pages as they scrolled, and why
  clicking a section could not move the document. Scroll mode itself measured
  healthy on a six page scan and was left alone, except that it no longer
  keeps its own button lit while quietly showing one page.
- Agent mode silently downgraded to a plain answer when the active model
  couldn't call tools, with nothing on screen to say so or how to fix it
  (INBOX 272 part 1's survey). The turn now shows a notice naming the
  model and one button to change it in Settings, Models; a skill run that
  stops mid-way for the same reason names the same fix in its step card.
  `requirements.txt`'s "Optional extras" comment had also drifted behind
  `core/extras.py`'s own allowlist (three installable extras were never
  named there); both are held in step now by `tests/test_failure_remedies.py`.
- The guided tour can no longer close itself halfway through. A step whose
  control it could not find was dropped from the run, and when that took the
  last one the tour ended silently on whatever tab it had just opened, which
  is what pressing Next looked like. Steps are judged after the scroll that
  brings them into view rather than during it, so far fewer are dropped at
  all, and the last one is never dropped: it stays on screen and says the
  control is not visible at this window size.
- The fold arrows in a document's gutter are the app's own icons and line up
  with the numbers beside them. They were the editor's default text triangle,
  which came out as a typed letter in this app's font and sat a little above
  the line it folded, because a character's box belongs to the font rather
  than to the row.
- The bottom bar's history no longer says you have been somewhere you have
  not. On a fresh load that never left the dashboard it listed two visits to
  Notes, because two start-up steps set the Notes tab's default sub-tab while
  that tab was hidden and each was recorded as an arrival. Setting a hidden
  tab's default is not a navigation, so it is not recorded as one, and Back is
  correctly dead until you actually go somewhere.
- Everything read from a file can be copied in one press. The reading panel in
  the Files sub-tab now has a Copy text button beside Open reading, because
  the box it sits under is capped and scrolls, so copying a long reading meant
  dragging through a window. The reading workspace already had the control and
  now says so in words rather than only an icon.
- Two things the Documents agent measured and left for later (INBOX 273).
  The settings Extras row's action buttons (Reinstall/Remove) could push
  past the panel's right edge at 820px because their column never shrank;
  it now takes `min-width: 0` and wraps instead. The shared `enhanceSelect`
  dropdown never read an `<optgroup>`'s label, so grouping set on any
  `<select>` (the whiteboard/mind-map board picker, the Library's document
  property filter) was invisible in the menu a reader actually opens; it
  now draws a group label row per `<optgroup>`, and the Library's flat-text
  workaround for the gap came back out.
- Four low-severity findings from a release security audit (INBOX 310).
  Restoring a backup now writes into a temp file beside the live database,
  runs `PRAGMA integrity_check`, and only then swaps it in atomically,
  instead of streaming pages straight into `memorymap.db`. Importing a
  folder of markdown notes now caps each file at the same size the upload
  importer already enforces, and reports a skip count when one is hit,
  instead of reading every file whole with no ceiling. A bookmark's URL is
  now checked against the same scheme allowlist (http, https, mailto, tel)
  markdown links already use, rejected with a 422 naming the allowed
  schemes if it isn't, and guarded again at render time so a bookmark saved
  before this existed can't become a live link either. The update
  downloader now re-validates every redirect hop against its host
  allowlist instead of only the first one, keeping the real
  github.com-to-objects.githubusercontent.com hop working.
- The graph's full screen no longer spends one Escape on two things. Opening
  the lightbox over a full-screen map and pressing Escape used to close the
  lightbox *and* leave full screen in the same press, because the full-screen
  handler relied on being placed after other Escape handlers rather than on
  anything actually stopping the key. It now asks `activeOverlay()` whether
  something is open over the map first (INBOX 275).
- A saved graph view restores where the unpinned notes sat, not only the
  layout, colour rule, filters, groups and zoom. Reopening a force-layout view
  used to solve the same forces fresh rather than show the picture that was
  saved; it now seeds the simulation with each note's saved spot and starts
  at rest, reheating only for a note added since the view was saved, while
  holding every saved note in place until that settles (GRAPH_PLAN Phase 5).

### Added

- An answer that finishes after you closed its panel now says so. Close the
  popup agent or the Atlas guide while it is still answering, and when the
  answer arrives a notification is recorded in the bell ("Popup agent
  answered: ..." or "Atlas answered: ...") with a toast carrying an Open
  button; either one reopens that panel scrolled to the answer. Nothing is
  posted while the panel is open, or for a turn you stopped, and the mute and
  "Panel only" switches still apply. Verified in a browser with both streams
  held for two seconds (`scratchpad/ui-sweeps/unwatched.js`); not verified
  against a real model.
- The Chat tab, the Ask tab and Write with Atlas each have a model dropdown
  beside where you type, the same setting as that feature's row in Settings,
  Models: change either and the other follows on the next status tick. It
  names the model that will actually run ("Inherited: llama3.2", resolved
  through the role and smart routing), and keeps showing a chosen model that
  is not installed. The Ask tab is its own row now (it had been running on
  the Chat tab's choice without saying so), and the feature rows ride every
  status poll, so the Chat tab's and the documents assistant's model sheets
  no longer say "Models aren't available yet" until Settings has been opened.
- A lint on the release artifact naming scheme (INBOX 266, item 4).
  `tests/test_release_smoke_step.py` now also parses `installer.iss`'s
  `OutputBaseFilename` and fails if the Windows `.exe`'s own filename loses
  its version, platform or architecture; the `.msi`, `.tar.gz` and `.zip`
  were already linted the same way. The `.tar.gz` for Linux (item 2) and the
  `.msi` for Windows (item 3) both already existed on this branch, verified
  by reading `.github/workflows/release.yml`, `packaging/windows/
  installer.iss` and `packaging/windows/installer.wxs`; nothing was rebuilt.
  The naming scheme itself, `<name>-<version>-<platform>-<arch>.<ext>`
  across all four artifacts, is recorded as a decision in
  `WORLD_CLASS_PLAN.md`'s H6.
- A cross-link on a mind map now survives an export. FreeMind files carry it
  in their own arrow element, so a map opened in FreeMind, Freeplane or
  Coggle is drawn with its cross-links; OPML files carry it as an attribute
  other readers ignore and this one reads back. Both come back intact on
  import. The Markdown outline stays an outline, which is what that file is
  for.
- A mind map can hold a look of its own, so a topic no longer has to be
  dressed one at a time. Ten of the eleven things you can set on a topic, its
  text size, weight, slant and alignment, its box and the bar down its edge,
  and the thickness, shape, dash and arrowhead of the branch into it, can now
  be set once for the whole map, and every topic that was never told otherwise
  follows. A topic you did decorate by hand keeps exactly what you gave it: a
  map-wide change can never overwrite a choice somebody made.
- And one way to undo the lot: "bring every topic back to the map" drops the
  colours, shapes and line styles that were set on topics one at a time, so
  they all follow the map again. It is the ring's own "reset to branch" said
  about the whole map rather than one topic, and it takes one request whatever
  the map's size. Pictures stay, because a picture is content rather than a
  look.
- A whiteboard or a mind map can live inside a note as an object: a preview
  card of the board itself, with its name and how much is on it, that opens
  the board when pressed. It is written `![[board:12|House jobs]]`, by id, so
  renaming the board does not break the note. A board that has been deleted
  leaves a card saying what was there rather than taking a paragraph of the
  note with it. An embedded board used to render as "Nothing called House
  jobs yet", which was the one case the transclusion renderer never learnt.
- The "/" menu in a note can insert one: "Board or mind map", which offers
  your boards and maps and writes the object where the caret is.
- The other way round as well: a board's own Board menu, and its card in the
  Library, now offer "Add to a note", which asks which note and puts the
  board in it.
- A note now shows what it made you promise to do: a "2 reminders" chip on
  the card opens the list of them, and each one presses through to the
  Reminders tab. Reminders could already be attached to a note and say which
  note they came from; the note end of that link had nothing on it.
- A link to a board that has been deleted now says so, rather than offering
  to create a note named after the board's address.

### Changed

- A big mind map redraws only what changed. A change to one topic used to
  rebuild every topic and every line on the board, which is why a large map
  felt heavy to work on: at five hundred topics a redraw took just over half
  a second of frozen tab, and opening such a map took two seconds. A redraw
  after moving a topic is now 47.8ms, a redraw that changes every topic at
  once is 149.1ms, and the same map opens in under a second. Picking up a
  branch on a board that also holds hundreds of link lines went from a full
  second of stall to a tenth of one.
- The first screen tells you what you are agreeing to. It asked for a password
  in 26 words that never said what the app is, never said it runs on your own
  machine, never gave the length rule until you had already failed, and never
  mentioned that the password becomes the key to anything you later mark
  private. All four are on it now, before you type.
- A mind map can be laid out to the left, and on both sides of its trunk,
  which is the arrangement most mind-mapping tools are pictured in. The
  branches are split so the two sides hold about the same number of topics
  rather than the same number of branches, and a topic whose parent is to its
  right carries its branch bar on that side.
- A mind map now answers the two gestures anybody tries on a blank part of it.
  A right-click on empty canvas opens a short menu of the things that apply to
  the map itself: add a topic here, tidy it, open every folded branch, fit
  everything. A double-click makes a new trunk where the pointer was, ready to
  be typed, and it stays where it was put. Both did nothing at all before.
- A mind map now says which of its two kinds of connection it is talking
  about, everywhere it talks about one. A branch and a cross-link get the same
  ring, which names the kind it is on and offers the right three things for
  it, including turning a cross-link into a branch when the drawing gesture
  guessed wrong; the tool rail says cross-link on a map and link on a board;
  and a cross-link is drawn in the map's own ink, dashed, from the moment it
  is drawn rather than from the next time the board is opened. It used to take
  the pen's colour, so one drawn while the ink was red read as a branch.
- The bar that appears over a selected topic on a mind map is a third of the
  width it was. It carried fourteen icons in one run, 959px of controls to
  describe a topic 95px wide, which at 1024 took 94% of the window and at no
  width drew a single word; the same fourteen controls now sit behind three
  named doors on it, Text, Shape and Branch line, each of which labels every
  control inside it. The bar measures 314px at 1440, 1024 and 820, and 54px
  tall instead of 150px on a phone.
- The guide answers the question you asked. Three plain questions reached no
  help topic at all ("Can I use this offline?", "How do I add a tag?", "Can I
  import from Obsidian?"), so it answered them from whatever tab you happened
  to be on. Twenty-six plainly worded questions now reach the right entry, and
  a phrase like "web search" beats a bare "search" instead of losing to
  whichever topic came first in the list.
- The graph's zoom controls are drawn like the rest of the app. Zoom in, zoom
  out and fit were typed characters sitting beside a full-screen button drawn
  with a real icon; all four now match, 34px square with an 18.4px icon
  centred in each.
- An answer the notebook barely backs says so. Under half its sentences
  coming from your notes, a line above the answer now says how many did and
  that the rest is the model's own writing. The marks under each sentence have
  always said which ones were grounded; nothing said how few.
- Typing the first word of a "/" command now finds it first. Every command
  label used to open with an emoji, so the menu's "starts with what you typed"
  ranking could never match anything and every search fell through to keyword
  guessing.
- The "/" menu tells you it is there, and opens from the keyboard. Every
  writing box now says "Press / for blocks and commands" while it is empty,
  and Ctrl+/ opens the same menu without you having to know the trick. The
  chord is rebindable and listed with the other shortcuts.
- The "/" menu works again in the note box, the note edit form, the chat
  composer and a skill's steps. It had stopped opening in all four: the file
  that builds an editing surface moved into the Library's on-demand bundle,
  and until you happened to open Library or Documents there was nothing for
  the menu to attach to, so the slash did nothing and said nothing. Measured
  on a fresh load: 0 menu rows before, 14 after. The bundle is now fetched the
  moment you put the caret in one of those boxes, and the keystroke that found
  it missing is replayed once it lands, so even the first "/" of a session
  opens a menu.
- Every row of the "/" menu draws the app's own icon instead of an emoji.
  Thirty-eight of them were emoji, written as escapes, which is how they sat
  through a lint that exists to catch exactly this; the eight callout kinds
  were drawing theirs at the head of every callout in every note and document
  as well. The Library's create menu, the chat attachment close, a note embed's
  marker and two graph arrows went the same way. The lint now reads an escaped
  character as the character it is, so the next one cannot hide the same way.
- Buttons that share a row share a height, and a probe now holds it. The
  greeting's "Add your name" was 29.2px beside its own 28px close button, the
  last mixed row of seventy in the app. The one-line change that would have
  ended the underlying 40-against-42px difference for good was measured
  instead of taken: it moved eighteen buttons, put a half pixel into five
  graph controls and turned a text link into a box, so it was not taken.
- A mind map can be laid out to the left, and on both sides of its trunk,
  which is the arrangement most mind-mapping tools are pictured in. The
  branches are split so the two sides hold about the same number of topics
  rather than the same number of branches, and a topic whose parent is to its
  right carries its branch bar on that side.
- A mind map now answers the two gestures anybody tries on a blank part of it.
  A right-click on empty canvas opens a short menu of the things that apply to
  the map itself: add a topic here, tidy it, open every folded branch, fit
  everything. A double-click makes a new trunk where the pointer was, ready to
  be typed, and it stays where it was put. Both did nothing at all before.
- A mind map now says which of its two kinds of connection it is talking
  about, everywhere it talks about one. A branch and a cross-link get the same
  ring, which names the kind it is on and offers the right three things for
  it, including turning a cross-link into a branch when the drawing gesture
  guessed wrong; the tool rail says cross-link on a map and link on a board;
  and a cross-link is drawn in the map's own ink, dashed, from the moment it
  is drawn rather than from the next time the board is opened. It used to take
  the pen's colour, so one drawn while the ink was red read as a branch.
- The bar that appears over a selected topic on a mind map is a third of the
  width it was. It carried fourteen icons in one run, 959px of controls to
  describe a topic 95px wide, which at 1024 took 94% of the window and at no
  width drew a single word; the same fourteen controls now sit behind three
  named doors on it, Text, Shape and Branch line, each of which labels every
  control inside it. The bar measures 314px at 1440, 1024 and 820, and 54px
  tall instead of 150px on a phone.
- The loading bar on the splash screen is cheaper to draw, so it stays smooth
  on a slow machine, which is the only kind of machine that sees it for long.
  It used to grow by changing its width, which made the browser lay the page
  out again on every frame: 121 times over one 2.4 second load, against none
  now that it scales instead. Every animation in the app is now held to that
  by a lint, so the next one cannot quietly cost more.
- A mind map no longer freezes when a topic is picked up. Dragging a topic
  carries its branch, and the frame that took hold of it was doing the work
  once per topic in the branch rather than once per thing that moved: a board
  scan to find each one, three document-wide queries per line to find its
  parts, and a fresh measurement of both ends of every line on every frame.
  Measured on `scratchpad/ui-sweeps/mapperf.js`, the worst frame of a drag
  falls from 83.3 to 16.8ms on a 50-topic map, 416.6 to 33.3ms at 200 and
  1,650 to 66.8ms at 500. Opening a map and laying it out got faster with it,
  from 3.4 to 2.0 seconds at 500 topics.
- The app calls Atlas by name in eight more places. Five of them are the
  Tools and features descriptions, which said "the assistant" while teaching
  you what the app can do, and one was the persona hint explaining how to
  write the name.
- No phantom row under a table's header in the documents live view. Putting
  the caret in a header row grew the line from 29.2px to 54.8px, because the
  table is a grid whose rows were all implicit, so CodeMirror's own trailing
  line break was auto-placed into a second one. The table's menu also no
  longer moves the caret out of the table when it is pressed.
- The guided tour is legible and the page behind it is genuinely dimmed.
  Reported three times, the last as "the whole tour is completely and utterly
  broken". The dim was one giant shadow cast by the cut-out, whose reach
  depended on the window's shape and on a corner radius nothing could read;
  it is now painted by the four panels that already tile the window around
  the hole, so a lit strip is a failing test rather than a photograph. The
  step card was see-through, and the dashboard clock read straight through
  its text; it now has the same opaque ground as every other dialog.
- The bottom status bar has three zones and its right end has an owner.
  Reported: the navigation and undo buttons "keep getting pushed further and
  further to the left". They were: the run after the spacer was one flat list,
  so every control the bar gained was appended at its right end, and reading
  it right to left gives the order they arrived in. Measured at 1440 against
  the bar's content edge, redo ended 391px from it and the navigation group
  467px. The bar now has state (what the app is holding or doing, left end,
  and the only zone that shrinks), tools (the doorways, and the only zone that
  grows) and control (back, forward, history, undo, redo), which ends the bar
  and takes no new members. Redo is flush with the content edge and the
  navigation group 76px from it, and a control added tomorrow lands in tools
  and pushes tools along. On a phone, where the bar scrolls sideways, the
  controls come first instead, so undo, redo and Back are reachable without
  dragging the bar.

- The dashboard's focused view puts the greeting and the search field on one
  row. Focused had a 47.2px banner saying who you are and, 16px under it, the
  37.2px field that is the only thing a stripped dashboard is reached for:
  100.4px of head to say one thing and offer one control. The banner keeps its
  width on the left and the field takes the rest of the line and the row's
  height, so the head is 47.2px and the chrome above the widgets falls from
  196 to 158.8px. Full and compact are unchanged, and a phone stacks the two
  back up.

- The text extracted from a file shows one more line. In Library, Files, the
  box that opens under "Text extracted from this file" was 64px against an
  18px line, so three and a half lines of a reading that can run to forty
  pages. It is 82px, four and a half lines, which is as far as it can go
  before the row below it leaves the screen on a phone.

- Atlas answers about reminders, documents, notes, spaces and backups again.
  The help corpus had an entry for each of them, and the keyword match was
  written in the singular, so a question asked in the plural reached none of
  them: "Where do reminders live?" was answered with "I'm not sure", from the
  notes and memory entries the open tab supplied instead. Keywords now cover
  the plural and the possessive, a tab's own topics fill in only for a
  question that names nothing, and the corpus gained an entry for the status
  bar, which nothing covered.
- The questions Atlas suggests follow the tab you are on, and every one of
  them is a question the help corpus can answer. The three fixed suggestions
  included one it could not answer at all and two about turning features off.
- Atlas can be typed into with no model running. It carried the attribute
  that disables an AI control when no model is there, although it was built
  to answer from the app's own help text without one.
- The guide no longer promises the utility model outright. It answers on the
  utility model while smart model routing is on, on the chat model while it
  is off, and Settings, Models can give it a model of its own; the panel's
  '?' says so.
- The mind map has been measured against the six things it was reported for,
  and the report that it is slow is true and is one bug. Panning holds 60fps
  at 50, 200 and 500 topics and the layout maths is cheap; a full re-render is
  not, and it runs when a topic is picked up, so a 500-topic map freezes for
  over a second the instant a finger goes down on a node. The read, the
  numbers and the phases that follow from them are MINDMAP_PLAN section 13;
  two probes hold the figures, `mapperf.js` and `maptwokinds.js`.

- Typing part of a word finds it again. The find anything box tried a word as
  a prefix only from four letters, so a note called "test" appeared for "test"
  and not for "tes". Three letters is enough now, and the finder and the note
  search read one threshold instead of each keeping their own.
- Atlas is shown the tags your notebook already uses before it suggests new
  ones. It was told only which tags were on the note in front of it, so it had
  no way to know the notebook already said "ml" and would happily suggest
  "machine learning" beside it. Now it is asked to reuse an existing tag when
  one fits.
- A note with no tags offers to have them written. The action that reads a
  note, suggests tags and links and refiles it was one row deep in the note's
  menu under the name "Re-evaluate", which said the smallest part of what it
  does. It is now "Tag and file with Atlas", and a note with no tags carries
  the offer on the card, where the tags would be.
- The spinner beside "Re-evaluating" on a note is a circle in a narrow row,
  not just a wide one. It sat in a flex row and could be squeezed on the
  width while its height held, so it turned as an ellipse; it now keeps its
  shape whatever the row does.
- A plain highlight in the documents live view is yellow again, and a
  coloured one says its colour instead of showing it. The live view had one
  highlight rule, taking the blue of the app's named set, so every plain
  highlight was blue; and it never read the colour prefix, so `==blue|word==`
  drew "blue|word". Both views now read the same eight colours and take the
  same tokens in both themes.
- The board's top bar carries six controls beside its five menus, down from
  eight: Rename this board and New board moved into the Board menu, which is
  already where this board's own life is kept. On a phone it carries seven in
  all, down from eleven, and no longer runs past its own right edge (75px past
  at 320, 5px at 390, both now 0): Full screen and Arrange leave the bar below
  600, the first being in the View menu and the second being on the context
  bar above a selection, which is the only time it can act. Its five menus
  declared `role="menu"` with no `role="menuitem"` inside, so a screen reader
  was told the menu was empty and the arrow keys moved nothing; they now take
  their roles and their keyboard from the same two places every other menu in
  the app does, and Escape hands the focus back to the toggle that opened them.

- The Files sub-tab's "Text extracted from this file" block is the numbers, the
  reading and one way in. Opening it used to draw four ranks and two controls,
  the first sentence, "14 pages read · 808 words", a full-width "Show the whole
  reading" bar and an "Open reading" button, and the one thing not in that list
  was the reading. It is now "14 pages · 808 words" with Open reading at the end
  of the same line and the reading itself under it, capped at three lines and
  scrolling. Measured at 1440 on a fourteen-page reading: two ranks instead of
  four, one control instead of two, the block 110.4px rather than 120.8px, and
  the row 251.9px open rather than 262.3px with the text still one click away.

- A picture card's reading is one chip, and the chip opens the picture. Asking
  to see the text used to expand the card from 240.7px to 416.3px and draw six
  rows under the thumbnail, a label, the text, a Show more, Tesseract's own box
  and the two model names, and the gallery gives every card in a row the tallest
  one's height. The "Text" chip opens the lightbox at the reading instead, where
  the picture, the caption, the whole text and both bylines already sit together,
  so the card does not move. The model names are on the card's tooltip. Typing a
  reading by hand is still the card menu's "Type the text in this picture".

- The dashboard's Compact and Focused views keep the hero. Compact used to
  delete the one line that says anything about this notebook ("You have 218
  notes, 3 reminders due") and cut the greeting to below body size while keeping
  the clock at twice the greeting's height, and Focused, the level that shows
  least, carried the second largest banner of the three: measured at 1440, the
  three heroes stood 157.2, 76.3 and 133.2px tall. The rule now is one rule: the
  greeting and the one number stay at every level, and what shrinks is the art
  and the secondary rows. The greeting steps down the type scale rather than
  falling off it, the emblem shrinks from 46px to 30px before it goes, the clock
  loses its date and then itself, and Compact's three band labels move onto
  their rows' own line. The heroes are 157.2, 99.6 and 47.2px, and the chrome
  above the first widget is 593.6, 427.9 and 196px (it was 593.6, 456.6 and
  282px).

- The Timeline's table keeps its width when a note row is opened. The Title
  column, the one column with no width of its own, was halving: 1032 to 516 at
  1930, 702 to 351 at 1600, 542 to 271 at 1440, with the other half drawn as
  empty space past the last header. The open row's cell spanned one column more
  than the table draws, because the tick column is only there while the
  selection mode is on, and a fixed table layout answers an extra column by
  splitting the free space with it.
- The Library reader is the page on a phone. It opened as a 342x776 dialog
  inset from every edge of a 390px screen, with an X in its head and its
  Copy, Ask and Save as note under a transcription you had to scroll to; it
  is the whole screen now, with a back chevron and those actions in a bar at
  the bottom where a thumb is, the same shape a note opened on a phone
  already had. Every control in it takes the 44px touch floor.

- The whiteboard and the mind map answer a finger. Two fingers pan and zoom the
  board whatever tool is in hand, which is what every drawing app reserves them
  for: until now a pinch did nothing at all unless you first went and found the
  Pan tool. The tool rail below 600 is one button saying which tool is in hand,
  opening a sheet with every tool in it at a size a thumb can hit, in place of a
  56px band that scrolled 835px of tools through a 358px window and showed 16 of
  its 31 buttons. The board's own bar takes the same 44px floor as the rest of
  the app on a touch screen. The mind map's + handles were already touch-sized
  and are unchanged.

- The graph answers a finger on a phone. A hold on a node opens the node menu
  (the same menu a right-click opens, now the app's own pointer-menu recipe, so
  its rows are 44px, Escape closes it and it cannot be drawn off the edge of the
  window); a hold on the empty map arms the lasso, which until now needed a
  Shift key a phone does not have, so a selection could not be started at all.
  The map's three floating control surfaces (the gear's panel, which covered 42%
  of a 362x653 map, the View menu and the ⋯ menu) open as one sheet below 600
  instead, holding the same controls and putting each one back on close. A hold
  anywhere in the app no longer also does whatever a tap there would do: the
  click the lift synthesises is swallowed, which is why holding a node used to
  open its menu and its panel at once.

- The rotate grip of a group selection on the whiteboard sits at the top centre
  of the group, at any zoom. It was scaled about the canvas's origin rather than
  its own anchor, so it sat right at 100% and drifted further off the box the
  further you zoomed either way: 170px right of centre and below the top edge at
  50%, 340px left of it at 200%. A group also drew every member's own handles on
  top of its own, four rotate knobs and sixteen resize handles for three items;
  members now show their outline and the group carries the grips, and anything
  selected on its own still has all of them.

- The CSS that styled the whiteboard's old export popover is gone. The popover
  became a dialog several phases ago; its class stayed in seventeen grouped
  selectors across three stylesheets, four of them rules with nothing else in
  them.

- The quick sketch pad's ink dots are a finger's size on a phone. They were
  16px targets in a bar whose every other control steps up to 44, and the
  dialog is the one place the touch sweep never looked. The dot is 32px below
  820 with the press reaching 44 past its edge, and the seven of them wrap to
  a second row rather than running off the bar at the largest text and
  spacing settings.

- On a phone, the whiteboard's context bar sits at the top of the canvas
  instead of following the selection around it. At that width it is a band
  rather than a bar, 348px of a 364px canvas, and floating put it on top of the
  drawing tools for a selection low on the board. It also stays on the canvas
  now whichever width you are at: a selection near the bottom could place it
  past the bottom edge, where nothing could reach it.

- A shape on the whiteboard follows the pointer at any zoom. Dragging one at 2x
  moved it half as far as the cursor, and its resize grip widened it half as
  far, because two drag handlers converted a delta that was already in board
  coordinates. A link's bend grip is also the same size on screen at every
  zoom now: it was 24px across at 2x against 12px at 1x, the one grip missing
  from the rule that holds every other one still.

- A highlighter stroke on the sketch pad lands under the pointer. It was
  painted through a layer that scaled coordinates a second time, so a stroke
  sat 15px left and 9px up of the cursor in the middle of the pad.

- The quick sketch pad and the whiteboard have one highlighter. They held two
  copies of it at different values, so the same tool covered the paper on one
  surface and tinted it on the other; both read one table now (0.4 opacity, a
  4x nib clamped to 12 to 24, a flat end and a round join). On the pad, picking
  an ink colour no longer quietly puts the pen back: "highlighter, then yellow"
  drew an opaque yellow line. Measured over a 255.0 paper: one pass 223.7, two
  223.7 before and 199.2 now.

- A highlighter stroke on a dark board lightens where it crosses itself instead
  of muddying. Multiply is worth 3 luminance units a pass on a dark board and 20
  on a light one, so a dark board screens and a light one multiplies; the blend
  follows a theme change on a board that is already open, and an export carries
  the blend its own background asks for. Measured dark: paper 26.4, one pass
  85.9, two passes 128.4, against 26.4 / 23.6 / 22.0 before.

- A phone opens the timeline as the table when no view has been chosen,
  and a reminder row swiped right is done.
- A phone opens a document to read it: the Rendered view is the default
  below 600 when no view has been chosen, and Edit is a press away.
- Chat on a phone: the message box takes one row with the microphone and
  Send, the attachments sit beside the mode switch under it, the mode
  switch is the first thing in that strip rather than off its right edge,
  a reply's sources open as a sheet, and the popup agent goes to the Chat
  tab instead of floating over a 390px window.
- On a phone the sidebar no longer keeps a 52px rail down the left of every
  page. It opens from a button at the start of the page's own head bar and
  the notes, conversations and documents lists take the full width.
- The notes head bar on a phone is three rows, not four: the sidebar button
  sits beside the title and the search box gives way so Filter stays on its
  line. 250px of bar became 166 at 390; the chat bar went from 166 to 114.
- The top bar on a phone is three controls: the space switcher, notifications
  and one menu holding theme, Settings, Lock and Quit. It was six, and at 320
  the last one hung off the edge so every page scrolled sideways. Every
  menu row on a phone is now 44px tall like every other control there.
- numpy, and the embedding/search-matrix code that uses it, loads on first
  use instead of at server start. `ai/embeddings.py`, `ai/janitor.py`,
  `search/engine.py` and `search/search_manager.py` had `import numpy as np`
  at module scope, so simply importing `api/app.py` (every boot) pulled
  numpy in whether or not the notebook had anything to embed yet. A fresh,
  never-used notebook now never loads numpy at all.
- The guide panel is a panel again. It floats in the bottom right corner on one
  inset with all four corners rounded, instead of sitting welded to the bottom
  edge of the window with two square corners and two insets that disagreed; on
  a phone it is still the full-width sheet it has always been there. Its '?'
  moved into the head, beside the line it explains, which gives the question
  box back around 50px; a hairline marks where the conversation ends and what
  you can send begins; the three example questions sit under the transcript and
  over that box, where the Chat tab already puts its own; and a message looks
  like a message in the Chat tab, same radius, padding, tail corner and ground,
  and it follows the compact and spacious density settings, which it used to
  ignore.

- Opening the guide's '?' and pressing Escape no longer leaves the explanation
  stranded on screen after the panel it belongs to has closed.
### Fixed

- The table menu in a document's live view survives being pressed. Clicking a
  table's header row draws a small menu button at its right end, and pressing
  it used to unmount the button and leave the menu standing under the header
  row with nothing to close it, which read as an extra empty row and as a
  button that did nothing. Two causes, both measured: the menu's own work
  (showing, measuring and, when it would be clipped, moving itself out to the
  page) was read by the editor as the document changing under it, and the
  blur that followed removed the button the person had just pressed. The menu
  now claims its own work, an open menu holds its button on screen, and a
  button taken away closes the menu with it.

### Added

- A writing suggestion's underline answers the pointer. Resting on one now
  tints the word in that suggestion's own colour, so a squiggle looks
  pressable before you press it; it was the one part of the writing help that
  gave no sign it was a control.
- The documents formatting strip says what the caret is already in. Stand in a
  bold word and Bold reads as on; the same for italic, code, the three heading
  levels, lists, tasks, quotes and links. Only the buttons that have a state
  to be in say so, so the ones that always insert something new are unchanged.
- The table cell menu is grouped. Its ten commands cover rows, columns,
  alignment and the table itself, and read as one list of ten; they now sit in
  four groups with a hairline between them.
- A "/" menu in a skill's steps box. It offers the two things the form beside
  it already knows and nobody can type from memory: the answers the skill will
  ask you for, as `{{placeholders}}`, and the exact names of the tools it has
  been allowed to use. Nothing else, because a step is one instruction on one
  line, not a block of markdown.
- A Daily page in the documents template gallery, and the Timeline now
  recognises it. New from a template offers Daily alongside the other six; it
  makes a document titled with the day, the same title the journal note uses,
  so a day written as a document gets the calendar mark in the Timeline and
  the day's own row offers to open it rather than to start a second page.
- A topic on a mind map can hold a picture. Put one in from the topic's own
  menu and the node draws as a card with the image as its body and the label
  as the caption under it, rather than a label with a thumbnail beside it. The
  file goes through the same upload every other picture in the app does, so it
  is in the Library too, and taking it out of the topic leaves it there.
- The line into a topic bends where you drag it. Point at a line, or select
  the topic at either end, and a dot appears on it: drag the dot and the line
  follows, whether it is drawn as a curve, an elbow or a straight line.
  Double-click the dot to put the line back. The shape travels with a copied
  branch and through the FreeMind and OPML exports.
- Share to MemoryMap from a phone's share sheet: with the app installed, a
  page, a link or a selection shared to it opens Capture with the title,
  the text and the link as one note ready to save.
- On a phone a note opens as a page: tap the row and the note fills the
  screen with a back chevron, unclamped, and its actions in a bar at the
  foot where a thumb is.
- On a phone a note row swipes: right to favourite, left to move it to the
  bin, the same two actions the row already shows, with the same undo.
- A "New note" button in the Notes bar, and on a phone a floating + above
  the tab bar: one press opens Capture with the caret in the box. The first
  showing of Capture used to drop the focus while it built the box's gutter
  and live editor; it carries it over now.
- A note card says what points at it: "In 1 document · on 1 board · on 1
  map · linked by 1 note", one quiet chip that opens Connections, counted
  for a whole page in one call (`GET /entries/reference-counts`). A mind
  map's own note node now counts as the note being on that map, in the
  chip, the Referenced-by row and the Connections dialog alike, and the
  dialog tells a map from a board and lists every document and note the
  chip counts.
- The Guide answers with no model running. Its whole knowledge of this app is
  hand-written help text, which is also the only source of facts a model is
  given when one does answer, so with the model off it hands that text over
  word for word, with the same quick-access chips, and says that is what it
  is doing. It used to say it was unavailable while holding the exact
  paragraph the question was about.

- A Windows MSI ships alongside the existing .exe installer
  (`MemoryMap-AI-*-windows-x86_64.msi`, built from the same PyInstaller
  output with WiX). It installs per machine rather than per user, supports
  `msiexec /quiet` for a silent or Group Policy deployment, and gets a
  proper Add/Remove Programs entry with Windows Installer's own repair and
  rollback. Unsigned for now, same as the .exe. The MSI's Start Menu group carries the same Repair shortcut
  as the .exe installer's.

- Find anything: one search over your notes, documents, boards, files, links
  and reminders at once, by your words and by what they mean, alongside the
  app's own actions. Every result says why it matched. It opens from a field
  on the dashboard, from Find in the status bar, and on Ctrl+P. The engine
  behind it already existed and nothing in the app had ever called it.

- The dashboard has a density switch: full, compact or focused. Measured
  above the widget grid, the three come to 610, 473 and 298 pixels of chrome.
  Nothing is removed by any of them.

- A note can show the notes you have forgotten that are closest to it.
  "Forgotten notes like this" sits in its menu beside "Similar notes", and
  answers a different question: not what means the same as this, but what
  you have not looked at in a long time that bears on it. The ranking was
  built and had no way in.

- A note can be put on a whiteboard or a mind map from its own menu. "Add to
  a board or map" sits beside "Add to a document" and does the same thing on
  the other kind of surface: the note becomes a card on the board, where you
  can see it and drag it, and the note's "Referenced by" row then says so.

- "Referenced by" on a note. Its menu now answers what points at it:
  the whiteboards and mind maps that carry it, the documents and notes that
  link to it, and the ones that only mention it by name, with which of the
  three said beside each. A link is a decision someone made and a mention is
  a coincidence until they make it, so the rows someone chose come first and
  the row says which it is.

- Settings, "What it learned": everything Atlas worked out on its own, with
  the note it came from, the model that decided it and how sure it was. Edit
  a row and no later run overwrites it; delete one and the same thing is
  never derived again; switch any of the seven background readers off, or
  pause all of them at once; export the lot as JSON, or forget it all
  without touching a note, and a "Read my notes now" button that runs the
  night pass on demand and says what it found. The backend for all of this
  shipped on 2026-09-13 and nothing in the app had ever called it.

- A note's own label no longer shows its wiki brackets. `[text](url)` was
  stripped from a chip and `[[a wiki link]]` was not, because the first rule
  needs the `(url)` to match, so every chip for a note whose first line links
  to another note read `[[The roof quote]]`, brackets and all.

- Battery-efficient mode stops the moving pictures. It paused the background
  AI tasks and the graph's similarity work and reached nothing else, so the
  dashboard's constellation and the animated background kept drawing, which
  is the two most expensive things on screen and the ones a person watching
  for a change would notice. Both stop now, the setting takes effect the
  moment you turn it on rather than on the next load, and its help text says
  what it does.

- A new check in the merge gate catches a request that fails where nobody is
  told. `errors.js` watches the console, which sees a thrown exception; it
  does not see a 404 or a 500 read into a `.catch(() => null)`, which is how
  most of this app reads a response it can live without, and which is the
  other half of "it does nothing and says nothing". The app currently passes
  it: zero failing requests across seven tabs, four Notes sub-tabs, six
  Library views and all eighteen Settings sections, on a fresh notebook and
  on one with four thousand notes.

- The tag autocomplete offers the tags you actually use first, and offers
  all of them. It was built from the notes loaded so far, which on a large
  notebook means it is missing whatever has not paged in yet, and sorted
  alphabetically, so a tag used once came before one used four hundred
  times. It now reads `GET /tags`, which answers tag and count, most used
  first, in one request; that route had no caller in the app at all.

- "Suggest a title" in the Writing Room. A note's title in this app is its
  leading `# Heading`, which is the one part of a long draft nobody writes,
  and the capture box has a title field while the Writing Room never did.
  `POST /drafts/title` shipped with that panel and had no caller: the model
  could name a finished draft and nothing ever asked it to. Undoable like
  every other pass there, and pressing it twice replaces the heading rather
  than stacking a second one.

- Settings, About now shows what the search can actually see: how many notes,
  documents and files are in the index, and whether the meaning-based half is
  loaded. `GET /search/stats` says in its own docstring that the Settings page
  wants this, and the Settings page had never asked.

### Fixed

- A picture read twice shows both readings in the lightbox. A file can carry
  Tesseract's own pass and a vision model's transcription at the same time,
  and the lightbox drew only the vision one, so the other reading was nowhere
  on the surface built for checking text against the picture. The second
  reader's answer now sits under the first, labelled "Also read with Tesseract
  OCR", exactly as the Library card's reading fold already showed it. A
  picture with one reading looks as it did.
- The documents formatting strip rises above the on-screen keyboard while it
  is collapsed, which is how it starts. Expanded it already did; collapsed, a
  more specific rule was overriding the keyboard inset away, so the strip you
  type at sat under the keys. What can sit under a bottom strip is now one
  named length that all three of them add.
- The Copy button on a code block and on a table is drawn with the app's own
  icon. Both said "⧉ Copy", a character typed where an icon belongs, while
  five other Copy buttons in the app used the real one. Save beside them takes
  its icon too, so the pair in one bar read as the same kind of control.
- A picture on a mind map topic is in the board's own PNG and SVG export
  instead of an empty box with a caption.
- "Clean up orphaned media" counts a picture used by a mind map topic as used.
  It looked only at pictures placed on a board as their own object, so the file
  behind a topic's picture was listed as used by nothing.
- The board's top bar answers a finger on a tablet. Between 600 and 820, the
  band whose own rule is that the pointer there is a finger, all thirteen of
  its controls were still 36px tall; and wherever the five menu buttons drop
  their words they were 25.8px wide, narrower than any other control in the
  app. The bar is two rows of 44px controls on a tablet now, and at 820 and
  above it is the single 46px row it was, with nothing under the app's own
  floor.


- The ⋯ on a Library card and on a document row is visible on a touch screen.
  Both were meant to be: each had a rule saying so where there is no pointer
  to hover with, and each was written one class short of the rule it had to
  beat, so neither ever applied and a 44x44 button sat at opacity 0 on every
  card and every row at phone width.


- The Library reader shows the page and what it says. Below 1100px the page
  rail was hidden but its column was not, so the grid kept an empty 593px of
  itself at 1024, squeezed the page into the 320px column beside it and
  pushed the transcription onto a row of its own underneath; at 390 the
  transcription had no width at all. The two panes take the two columns now.

- "Take the tour" takes you on the tour. The dashboard's tile and Settings,
  about's "Take tour again" both opened the welcome card instead, which is a
  different thing: five slides about what MemoryMap is, rather than the
  guided tour's cards anchored on the real controls. Both open the tour now,
  and the welcome card keeps the two doors whose words name it, Settings,
  help and guide's "Replay welcome tour" and the features browser's
  "Welcome tour" row.

- The Ask sub-tab shows each cited note once. Under the answer sat numbered
  source cards for the same five notes, with the same ids in the same order,
  that Matching records was already showing beside them; under the answer
  there is now one line, "Sources: 5 notes, on the right", which brings the
  column into view when pressed. A source the column does not hold, a file or
  a web page, keeps its card and its number. A citation mark now lights the
  records row for its note and shows the passage there, which is where that
  note is drawn on this tab. The Chat tab is unchanged: it has no column
  beside it, so its cards are the only place its sources can be.
- Find anything centres its text in its bar. The field carried the
  stacked-form `margin-bottom` every input in this app has, and the rule that
  turns off the field's border, ground and padding inside the band had not
  turned that off: `align-items: center` centres a flex item with its
  margins, so the field sat 4.8px above the middle with 1px of room above it
  and 11px below. The glyph beside it was dead centre the whole time, which
  is what made the text look dropped. Zeroed, and the bar takes the band's
  44px floor below 820, which it used to reach only by accident.
- The guided tour never draws its cut-out off the page. A step whose control
  was off the right edge clamped to a negative width, which is invalid CSS and
  is dropped, so the cut-out kept the previous step's size and sat outside the
  window: the dim is that element's own box-shadow, so the page went dark with
  a bright band where the shadow's edge fell and nothing highlighted. Measured
  at 2000x1140 with the target at x 3000: the cut-out placed at 2994 carrying
  708px of stale width. A step whose control is not really on screen is now
  dropped, the counter renumbers, and a cut-out that cannot be drawn is not
  drawn at all, with the card centred instead. The tour sweep drives the
  welcome flow's own hand-off at 2000x1140, 1440 and 390 and asserts a visible
  card and an on-screen cut-out on every step.
- The split document view lines its panes up from rects, not `offsetTop`.
  The first fix mapped source lines to rendered blocks correctly and then read
  each block's position with `offsetTop`, which is measured from the nearest
  positioned ancestor rather than from the pane: measured on a real document,
  every block's `offsetTop` ran 218px past its true offset in the pane at
  1440 and 230px at 1024, and collapsing the sidebar changed the bias to
  146px by putting a positioned element in between. Every anchor carried that
  constant, so the preview parked that far past the line the source was
  showing, at every position. The probe that closed the first report read
  `offsetTop` too, so the same bias cancelled on both sides of its
  subtraction and it reported 0px from a pane a paragraph and a half out.
  Measured with rects: worst 444px at 1440 and 453px at 1024 before, 1px
  after, across ten passes covering both directions, a mid-document edit, a
  view switch, a save and the sidebar moving.
- The split document view keeps its two panes on the same place. The sync
  was a scroll fraction, which is exact at both ends and wrong in between
  wherever a block takes a different amount of room in the two halves: a
  picture is one line of source and four hundred pixels of preview, and every
  such block shifts everything below it in one pane only. Measured on a
  five-section document with a table, a code fence and a list in each, the
  preview sat 282, 292, 266, 404 and 550px away from the heading the source
  was showing, growing downwards. `renderMarkdown` now stamps every block
  with the source line it came from and the sync interpolates between the
  nearest pair of anchors: 0, 75, 0, 0, 0px, and the 75 is the editor landing
  21px short of where it was asked to scroll.
- The guide panel says it is the guide, and its thinking box can now be
  drawn. The head reads "Atlas guide" over one muted line, "How this app
  works, from its own help text", and the sheet's accessible name is that
  same string. The streamed turn runs in a preset of its own
  (`presets.GUIDE_MODE`, Quick's brevity and temperature) rather than
  `quick`, whose `think: False` told every reasoning model not to think:
  `.help-chat-think` was drawing an event that could not arrive. Which model
  the panel takes is now pinned by tests in all three cases, because
  `utility_model()` answers the chat model when smart model routing is off
  and when no utility model has been chosen.
- The guided tour switches to its step's tab and waits for the control to
  arrive, leaves that control pressable, and carries a visible way out. The
  dim was one layer across the window, so `elementFromPoint` at the centre of
  all fifteen steps answered the dim and not the control; it is now four
  panels around the cut-out, and the hole belongs to the page. A step that
  navigates waits up to 1.5s of frames for its target rather than dropping it
  on the first frame after `switchTab` resolves, which is why steps inside a
  tab used to vanish and the tour looked as though it never moved. The card's
  head gained a close X beside the counter; Skip and Escape still end the same
  run.
- The Guide streams its answer on a locked notebook. The streaming fetch sent
  no session token, so it was refused and the panel fell back quietly to the
  one-shot route: the reply arrived in one piece, and "streaming is broken"
  was the honest report. A lint now fails on any hand-rolled fetch to a locked
  route that forgets the header.
- "What does Performance mode do?" has an answer. The setting existed and the
  help text did not, so the Guide was told to say it was not sure.
- A document's AI edit reported the model as running when it was not: the
  route compared the note against a constant the offline message stopped
  being.
- A failure now names its way out. DuckDuckGo rate-limiting goes looking for
  a SearXNG on this machine and uses it if there is one, and says where the
  one-press install is if there is not. An embedding model that is selected
  but never downloaded says so, with the button and the command to get it,
  rather than a raw 404.

- A surface whose data did not arrive now says so, with a way to try again,
  instead of drawing its empty state. Measured with every request failing:
  the notes list, the map, the timeline and the library each claimed the
  notebook was empty, and the dashboard's tiles printed "0 this week" and
  "0 day streak" from figures they had not read.

- Alignment guides now appear when a selection is dragged by a sketch. Cards
  have had them for a while; the sketch drag was the one that never asked for
  them, so any group that happened to include a drawing had none.

- A skill run is no longer cut short on a local model. Its token allowance is
  per step rather than per run, and there is no wall-clock limit out of the
  box: a nine-step skill measured on a 4B model reached step three after
  twenty three minutes, and a ninety second budget had already ended it.

- The graph minimap is hidden when there is nothing to map, rather than
  sitting empty in the corner under the top bar.

- The Ask tab keeps its inline citation markers. A live-render paint armed
  before the stream ended fired after the markers were placed and repainted
  the answer from raw markdown, so the numbers appeared and vanished within a
  frame.

- The resurfacing ranking no longer fails when it is asked for the notes near
  a particular one. It read the embedding column by the wrong name, in a loop
  nothing had ever entered.

- The Windows launchers are checked out with CRLF again. cmd.exe seeks a
  batch label by byte offset and its scanner expects CRLF, so in an LF-only
  file every `call :label` landed mid-line: reported from a real install as
  "The system cannot find the batch label specified - bail_if_cancelled"
  between steps 1 and 2 of setup, which meant answering "no" to the
  installer did nothing at all. A `.gitattributes` rule and a lint.

- The desktop window opens about a second and a quarter sooner. Starting the
  app used to import the whole server, FastAPI and SQLAlchemy included,
  before it had read its own command line: 1,203ms of the 1,210ms it took to
  load the entry module. That now happens on the server thread, behind the
  window instead of in front of it, which is also why the packaged build
  looked like it had no splash.

- Board and map previews no longer draw over themselves. Blocks are kept
  inside the thumbnail, a caption's width is measured rather than estimated,
  and a caption that would land on another block or another caption is moved
  or left out. It also finds room for more titles than before, not fewer.

- Headings in the rendered document view are the size they should be. A
  document's biggest heading was drawn smaller than its body text, and two
  levels of heading were identical, because the tags the renderer uses had
  no styling at all. Both views of a document now use the same scale.

- Lists render in the documents live view, which drew them as plain text:
  bullets and numbers now hang in the margin with their text aligned under
  itself, nesting is visible, and a dash is drawn as a bullet unless the
  caret is on its line. A task's checkbox no longer makes its own line
  taller than every other line in the document.

- A group selection on a whiteboard can be resized and rotated. All eight
  handles and the rotate dot were drawn but sat under the card layer, so six
  of the nine could not be pressed. The outline also travels with the group
  while it is dragged, instead of staying where the items started.

- Line numbers in a document stop colliding around a fenced code block.

- Ctrl+S saves your preferences, which the screen has promised for a long
  time without anything doing it, and says so with a toast. Preferences is
  the only settings section that does not save on its own, and now says that
  too: once at the top, and again on the button as soon as you change
  something.

- "What it learned" uses the same switch rows as the rest of Settings. Every
  row's name ran straight into its hint ("Night shiftReads notes you have
  added or changed") because the rows were built from a different recipe.

- Close, download and tick marks are drawn with the app's own icon set
  instead of typed characters, so they match the icons beside them in face,
  size and weight.

- The document editor's ⋯ menu is shorter and stays on screen. Its five
  "Download as" rows and "Print or save as PDF" are one "Download or print"
  row now, opening the same side flyout the notes list's ⋯ menu already uses
  (an accordion at phone width, where there is nowhere for a flyout to go).
  The menu was 706px tall in a 900px window; it is 562px. Separately, these
  menus were only ever clamped vertically: at 390px wide the document ⋯ sat
  53px off the left edge of the screen, with no way to scroll to the start of
  its labels. They are clamped on both axes now.

- A search in what the notebook learned counted rows it was not showing, so
  the table's pager offered pages that were not there. The page and the
  count are narrowed by one function now.

- The graph's minimap no longer writes "NaN" into the viewport rectangle.
  Measured intermittently on a four thousand note notebook: 112 console
  errors in one sweep, all of them `<rect> attribute x: Expected length,
  "NaN"` and the same for y, width and height. Captured at the write, the
  zoom transform itself held NaN while the dimensions and every node
  position were finite. The minimap checks everything it reads now, and the
  three places the app builds a zoom transform refuse to build one out of a
  number that is not one: `Math.min`/`Math.max` propagate NaN rather than
  clamping it, so the scale clamps that looked like guards were not.

- The app calls its AI by name. Atlas was the name in the chat sheet and in
  the prompts, and everywhere else the interface still said "the AI": 68
  strings across eight files and 41 pieces of markup, including the Models
  screen, which read "Active: qwen2.5:7b" and now reads "Atlas, running
  qwen2.5:7b". Copy that means the model or the runtime rather than the
  librarian still says so. `AI_NAME` moved to app.js, the first script the
  page loads, so a string anywhere can read it; a new lint fails the build on
  copy that calls it "the AI" again.

- Four helpers in `documents.js` that no feature called are gone, and the
  tests that covered them now cover what the app runs instead. The table pair
  demonstrated byte-exact cell writes through a writer nothing reached (a cell
  is edited by typing into the source line); the columns test asserted a
  template the "/" menu does not insert; the frontmatter one asserted a
  flattened shape the properties panel never sees. About 120 lines of
  documents.js and three test sections, replaced by checks on cell spans,
  the caret the Tab key computes, the ghost-cell fill the editor really calls,
  and the columns string read straight out of `MD_ACTIONS`.

- A keyboard user is told what the dashboard's activity heatmap is. The grid
  scrolls horizontally, and Chromium gives every scroll container a tab stop
  so it can be scrolled with the arrow keys, so Tab landed on a bare `div`
  that a screen reader announced as nothing. It now carries a role and a name
  ("Activity over the last year, N notes"). Found by walking the tab order,
  which is now a sweep (`scratchpad/ui-sweeps/keyboard.js`, in the gate's
  `--sweeps` set): it presses Tab across all seven tabs and fails on a stop
  that is invisible, unnamed, or reordered by a positive `tabindex`.

- The whiteboard works again. A change that came in from outside the project
  ran a regular expression over `whiteboard.js` to move the board's undo
  history onto the app's stack and deleted ten live functions along with the
  two it meant to replace, among them `wbItemTransform`, which is what
  positions every card on the board. The board threw on its first render and
  drew nothing. That commit is reverted; the three parts of it that were right
  are re-applied below.

- No console window blinks over the packaged Windows app. It is a GUI process,
  so every console tool it runs in the background (`docker`, `pip`,
  `tesseract`, `winget`) was given a real console window by Windows, shown and
  torn down. Every spawn now asks for `CREATE_NO_WINDOW`, and a lint fails the
  build when a new one forgets.

- Tesseract installed on Windows is found even when PATH does not mention it.
  The installers do not reliably add themselves, and the per-user mode never
  does, so the app told people who had just installed Tesseract to install
  Tesseract. It now reads the installer's registry key first, then the standard
  Program Files and LOCALAPPDATA locations, and points `pytesseract` at what it
  finds.

- A note's text stays inside its card on a board. A card could not shrink its
  text below the box the person dragged it to, so the paragraphs were laid out
  past the border and painted over the board; and whether a note got a "Show
  more" was decided by its character count rather than by whether it fitted.

- A card left open on a board is still open when the board is opened again.

- An exported board carries what its cards are showing. Every card's label was
  cut to 160 characters and six lines whatever the card's size, so an expanded
  note exported as six lines. The export dialog now also says when collapsed
  notes are keeping text out of the picture.

- A fenced code block in the Live view no longer has an empty row above and
  below it. The fence lines keep the block's tint and take the height of
  padding, and the language is drawn in the block's corner.

- Three calls to functions that no file defines: the semantic search toggle
  (`loadAllNotes`), every Conversations row in the command palette
  (`loadChatHistory`), and opening a note from a mind map node
  (`openEntryEditor`).

### Changed

- The note list repaints four times while a big notebook loads instead of once
  per page: measured on four thousand notes, `loadEntries()` goes from about
  1.8 s to 0.9 s and hands back three quarters of a second of main thread.

- The settings search reads each section's text once and remembers it, instead
  of rebuilding and lowercasing 63 KB on every keystroke.

- The Docker daemon is probed at most once every fifteen seconds, rather than
  on every status poll with an eight second timeout.
- MemoryMap introduces itself with a guided tour: a small card at a time,
  anchored to the control it is describing, over a page dimmed everywhere
  except that control, with back, next, skip, and a "3 of 7" counter. It comes
  in four short sections (the basics, writing a note, finding things, boards
  and maps); a first run is offered the basics alone, and Settings, help and
  guide replays the whole thing or any one section. Escape leaves it, focus
  goes back where it came from, and it never opens by itself once it has been
  finished or skipped. The welcome that used to describe seven tabs from the
  middle of the screen is now two cards, the greeting and the setup check, and
  hands over to the tour.
- One-click recovery. When start.sh or start.bat's normal launch fails for a
  reason it can fix (no working interpreter in .venv, or a dependency the
  app can't import), it repairs itself once, automatically, with no prompt,
  says in one line what it did, and carries on; a repair that doesn't fix
  it says exactly what is wrong and where the log is, and never loops. The
  Windows installer gained a "Repair MemoryMap AI" shortcut beside the
  ordinary one, running the packaged build's own repair (clears the cached
  window profile, then opens the app normally; notes and preferences are
  untouched).
- Printing a document prints the document. A plain Ctrl+P from the editor put
  the tab bar, the sidebar, the dock and the status bar on the page around the
  text; it now puts black ink on white paper with a reading column, and keeps
  a heading with the text it names, a code block and a quotation whole across
  a page break.

- The serif reading face gets a column of its own width. It is narrower than
  the app's own face, so the same column held 93 characters on a line where
  the default holds 76, which is past what is comfortable to read.

- The command palette carries the documents editor's own actions while a
  document is open, each with the keys that run it, and the keyboard shortcuts
  dialog gained a section listing the editor's chords. Both are built from one
  table, so they cannot disagree about what a key does.

- A section can be moved by dragging its heading in the outline, and the
  heading, its text and everything nested under it travel together. Alt with
  an arrow does the same from the keyboard, on the row that has focus.

- A document's outline folds and filters. A heading with sections under it
  carries a caret that hides them, remembered per document, and past ten
  headings a filter box appears above the list and says how many of them are
  showing.

- The Library's Documents list filters by a property a document declares about
  itself. A document that opens with `status: draft` or `tags: [one, two]` can
  now be found by that, from one control beside the search box that offers only
  the properties the documents on screen actually have, with a count each.

- The formatting strip above a document, and the matching one in the note
  editor, light up under the pointer the way every other bar in the app does.
  A hovered button wore an accent tint and a solid accent rim, so a hand
  crossing twenty-seven controls lit each one in the colour this app uses to
  mean "on".

- The writing panel's answers are reachable from the keyboard. Pressing Enter
  on a row now puts focus on the first suggestion, Escape hands it back to the
  row, and a press with the pointer still leaves the caret in the document
  where the word was just shown.

- The outline marks the section you are writing in, not the one at the top of
  the window. Typing in a section lower down the page left the heading above it
  marked until the view happened to scroll. Scroll far enough that the caret
  leaves the editor and the top of the view takes over again.

- The Word (.docx) export is a button in Settings, optional extras. Without
  python-docx the export answered with the name of a package and nowhere to
  get it, which in an app that asks for no terminal is a dead end.

- Typing into a box that is not a text field no longer triggers the app's
  single-key shortcuts. A "/" typed while correcting a page reading in the
  Library moved focus to the search box and swallowed the rest of the word.

- A passage selected in a document and sent to the chat is re-checked against
  the document you are looking at. It was checked against the empty textarea
  the editor leaves behind, so every document selection was described to the
  model as "the user has since edited it, so this passage may no longer be
  there" while the passage was on screen.
- The graph's display options fit their panel again. Physics, Groups and
  Minimap are the three sections you set once and leave, so each is now a
  fold on the app's own `details.settings-fold` recipe, closed by default and
  remembered once you open it. Measured at 1440x900: 655px of list in a 488px
  box, scrolling, before; 451px in 451px, not scrolling, after. At 1024 the
  same 451 in 451. At 390 the panel still scrolls, as it did, but with 795px
  of list where the same panel held 1071.
- Notes → Write with AI is a writing desk. Its head is a dock on the app's
  own grammar (identity, one Draft button, Stop, Undo, a '?' and a kebab)
  where it used to be a heading and a lone round '?' over a card with two
  filled buttons. Five quick-start chips stand where an empty pair of boxes
  used to; under the thoughts box, three pickers say what to write, in what
  voice and at what length, and an adder hands Atlas up to six of your own
  notes to write from.

- The draft arrives as it is written, with the thinking shown while it runs.
  It used to appear in one piece once the model had finished: measured
  against a stand-in model server, 22.9 seconds and one write of the box
  before, first text in under a fifth of a second and one write per chunk
  after. A pass that fails or is stopped hands back the draft that went in.

- Five things to ask for rather than one: draft a note, carry on writing,
  rewrite it in another voice, open bullets out into prose, close prose back
  into bullets. Tone and length are pickers, not something to phrase.

- What to do with a finished draft is one row: copy it, insert it into a note
  you already have, or save it as a note. Inserting leaves you at the desk
  with your draft, and offers the trip to the note rather than taking it.
  Every draft the session produced is a chip you can go back to, beside the
  undo that was already there.

- A note you already have can be carried on: it comes into the draft, and
  saving writes back to that note rather than filing a second copy of it.

- With no model connected the writing desk says so in a line you can act on,
  with the button that connects one, rather than only in a tooltip on a
  button that cannot be pressed.
- The Timeline's table keeps its title column on a tablet. Between 600 and
  1024 pixels wide the fixed columns took everything and the title, the one
  thing that says which note a row is, was squeezed to nothing and the table
  scrolled sideways. The space and the two counts now give way at that width,
  and the tags below 820.

- The Timeline's density strip appears when it has a shape to draw rather than
  when the notebook passes a note count. It used to hide a real profile (a
  hundred and fifty notes spread over ten months) and show a row of identical
  marks (two hundred notes written in a fortnight).

- A skill can say what "it worked" means, and the app checks it. Settings →
  Skills has a "Check it worked" row: pick a counting tool, what the number
  should be afterwards, and whether to count only the notes with no tags. The
  built-in "Auto-tag my notes" now claims what it actually promises, that no
  note is left untagged, and the two audit skills that could not be checked at
  all now report that they changed nothing. A skill saved from Settings used to
  lose its check on the way to the server without saying so.

- Counting your notes can be narrowed the way listing them always could:
  `count_notes` takes "untagged" and a time window, so a skill can ask the
  notebook a smaller question instead of paging through all of it.

- A citation names the note a sentence actually came from. Which note is now
  decided by the best passage in the answer's own candidate set rather than by
  how many words the note shares with the sentence, so a long note that carries
  a claim's words spread through paragraphs about other things no longer earns a
  second mark beside the note that says the thing. Measured on sixteen fixture
  questions (`tests/fixtures/chat/grounding_cases.json`): 18 of 18 sentences
  cited to the right note, up from 17 of 18, with no mark at all on a sentence
  the notes do not support.

## [0.3.1] - 2026-09-14

- The status bar's help button says "Guide", not the assistant's name. It sat
  beside "Ask" reading "Atlas", so the bar offered two buttons that both mean
  "talk to the AI" and neither said which knows your notes and which knows the
  app. The name is in the tooltip, which also survives renaming the persona.

- A placed note that is showing its whole text sizes to the text. It kept the
  height it was saved at, so "Show more" ran a long note out through the bottom
  edge of its own card.

- A mind map node's icon grows with the node's own text instead of staying at
  the size it started at, and the text-size and resize grips moved off the
  corner where the add buttons hang.

- The chat's Resume and Edit-step buttons survive reopening a conversation.
  They were built from the live stream's own variables, so a run you stopped
  offered to carry on until you changed tab.

- The Ask tab's citation markers, its "Grounded in" chips and its Sources panel
  are numbered together, from one list, and the grounding is drawn once against
  the finished answer rather than into prose that is still streaming.

- The timeline's "Start today's note" opens the composer with the date in the
  title instead of writing an empty note on the press.

- A shape swept up by the selection rectangle shows its selection box and its
  eight anchors, and double tapping an anchor fits a note, text box or sticky
  to its text.

- A run that stops on its budget says where the setting is.

- The chat welcome's '?' moves to its top right corner, out of the middle of
  the sentence it was in, and it opens: the welcome is built after boot, so its
  help trigger had never been wired to anything (INBOX 236).

- The popup agent's suggested questions are rows, not pills. Fourteen bordered
  buttons in two ruled columns are now quiet rows with no edge at rest, the
  family glyph in a quieted accent, a ground that arrives with the pointer, and
  one column below 480px (INBOX 231).

- The document dock's ⋯ menu stays inside the window. Its panel was capped by
  a flat share of the window height rather than by the room under the button,
  so at 1440x700 it ran 114px past the bottom edge with its last row out of
  reach; it is now capped to the room it has, scrolls inside that, and opens
  upward when there is less than 240px below (INBOX 233).

- The kebab menus open on top of the surface they belong to. An escaped ⋯
  menu sat at z-index 1020, chosen when the only thing it opened over was a
  dialog at 1010, so the popup agent's foot menu drew behind the command
  palette at 2000 and looked like a button that does nothing (INBOX 230). The
  tier is now above every overlay a kebab can appear on.

- Atlas's answer badges that name a Settings section now open it. The
  delegated click handler matched `[data-goto-tab]` only, so the "Web search"
  and "Skills" badges under a help answer did nothing while "Chat" worked
  (INBOX 234).

- An Ask answer keeps its citations. `ask_turns` stores the sentence-level
  grounding it was written with, and a turn reopened from the history panel
  draws the same numbered in-text references, "grounded in" chips and source
  cards the live answer had (INBOX 241).
- The Writing Room's two boxes keep their height when you click into them: the
  editor's wrapper takes over the stretching the textarea was doing, so neither
  box drops 184px on its first focus (INBOX 240).
- A table in full view can be closed: an X in the panel's head that names
  Escape, focus handed back to the button that opened it, and the ⋯ menu's
  Back row lifted above the panel it was drawing behind (INBOX 239).
- The agent hand-off files are one ledger: `docs/roadmap/agent-remaining/OPEN.md`
  carries every still-open item from the 38 finished files, by surface, with the
  file, the id and the next step, and those files move whole to
  `docs/roadmap/archive/agent-remaining/` (INBOX 220).
- Aurora's trails end and its ring no longer stamps itself into them (INBOX
  210). The Library's Create chooser is a column of named rows like the
  documents' template dialog (211).
- The notebook's AI is called Atlas. One constant, `memorymap.ai.AI_NAME`, and
  one clause at the head of the three prompts that speak as the app: the chat
  and Ask librarian, the agent, and the in-app help chat. A theme, not a
  persona: no backstory, no tone instructions, and a persona the user wrote is
  left exactly as they wrote it. The untrimmable prose went down rather than
  up, from 52 characters to 41, because the clause is shorter than the
  sentence it replaced.

- The launchers obey the update settings. `start.sh` and `start.bat` ran
  `git pull --ff-only` on every launch of a git checkout whatever Settings
  said, so both switches in Settings, About were half true: "Update
  automatically" turned off still updated the code on the next launch, and
  "Stable (tagged releases)" still followed whatever branch was checked out.
  Both now read `auto_update_enabled` and `update_channel` out of
  `preferences.json` before anything else happens: off does nothing and ticks
  the step "Off in Settings", main fast-forwards the branch as before, and
  stable fetches the tags and fast-forwards to the newest release tag only.
  Both paths stay `--ff-only`, so neither can rewrite local work. A source
  checkout defaults to on, which is what it has always done.
- The first launch of a fresh install sometimes did nothing at all. `set -e`
  plus `set -o pipefail` plus a log rotation whose glob matched nothing yet,
  because the `tee` that creates the log runs in the background, ended
  `start.sh` with exit code 2 and an empty terminal. Measured at 2 failures in
  10 brand new data directories before, 30 clean runs after. The doctor also
  now recognises a `git worktree` checkout, where `.git` is a file rather than
  a directory, which `start.bat` already did.

- The tests that never ran anywhere now run in CI. The unit job installs node,
  so the nine tests that shell out to `node --check` and the plain markdown and
  export scripts stop skipping themselves, and a new `pdf` job installs the
  rasteriser extra (`pypdfium2`, `Pillow`), asserts `pdfpages.available()` and
  runs the ten files gated on it. Measured with the extra present: 159 tests in
  those files, none skipped.

- Nine failures that said nothing now say it at debug. The `except Exception:
  pass` handlers in the embedding enrichment (4), the entity pass, the vision
  read, the two PDF page closes and the task history each log with `exc_info`
  and name what was being attempted; `entities.py` and `taskhistory.py` had no
  logger at all to say it through, and now do. None of the handlers widened.

- The graph and timeline routes name their optional parts. `graph` was 355
  lines and 58 branches and is 227 and 29, with the three opt-in blocks as
  `_add_entity_nodes`, `_add_document_nodes` and `_add_map_edges`; `timeline`
  was 346 and 53 and is 248 and 39, with the three row builders as
  `_place_notes`, `_place_documents` and `_place_reminders`. No behaviour
  changed: 118 graph and mind map tests and 27 timeline tests pass either side.

- The chat stream route is a resolve and a stream, not one 424-line function.
  `chat_stream` is now 71 lines: what one call settles before it opens the
  stream is a `_StreamRequest` record, the no-tools path is `_plain_events`
  (149 lines) and the NDJSON writer is `_stream_lines` (219), both module-level
  rather than closures. No behaviour changed; 264 chat and skill tests pass.

- A skill run reads as a setup, a step and a finish. `_run_skill` was 682 lines
  and 82 branches; it is now 301 and 36, with one step's attempts, contract and
  paging in `_run_one_step` (401 lines), the run's decisions on a `_RunSetup`
  record and what it learns on a `_RunState`. No behaviour changed: the 88
  skills tests and the run, verifier and agent files pass either side.

- The agent's turn reads as three stages rather than one long one. `run_agent`
  was 875 lines and 68 branches by the same AST ruler the audit used
  (`scratchpad/probe_complexity.py`); it is now 279 and 37, with the setup in
  `_prepare_turn` (248 lines), one tool call and its guards in `_dispatch_call`
  (405), and the ledgers the rounds share on a `_TurnState` record. No
  behaviour changed: the same 306 agent, chat and skill tests pass before and
  after.

- The agent knows how big its model is. `run_agent` now asks
  `model_manager.is_small_model` about the model it is actually going to call,
  the same predicate the skills path uses, and a small model gets the core
  tools without the orchestration three, the short descriptions, and four
  rounds rather than six plus six earned. Measured on one turn with a 32k
  window: 11 tools and 3,828 schema bytes against 56 and 27,250. A model whose
  name does not say its size is left alone.

- Background work is bounded. Every upload used to spawn up to three threads of
  its own (Tesseract, the caption, the vision read) plus a document read, so a
  folder of 200 pictures was 600 threads against one Tesseract and one local
  model. `core/jobs.py` is now one pool with two lanes: the CPU lane is the core
  count capped at four, the model lane is one worker, and every
  `*_in_background` enqueues on it. The activity panel lists what is queued, and
  shutdown drops the queue inside a deadline instead of draining it.

- Boot is lighter: p5 (1 MB, decoration only) loads in idle time on first use
  rather than as a blocking script, and the dashboard's seven widgets share one
  `/insights/stats` fetch (44 boot fetches to 35). The graph, documents,
  whiteboard and library code now arrives on the first visit to the tab that
  needs it rather than before anything draws: 8 scripts and 1,072 KB at boot,
  from 13 and 1,699. Boot also stopped asking for the same thing twice:
  preferences once rather than four times, the graph once rather than three
  times, the board list and the note list once each, and the notes list's
  first page is 200 notes rather than the whole notebook. The audit these came
  from is WORLD_CLASS_PLAN "Audit, 2026-09-13 night" (INBOX 209).

### Fixed

- A note's keyboard-focus ring and label on the graph end when the
  keyboard leaves the map, a pointer takes over or the popup closes, so
  Labels off means off (INBOX 263). The trace's path box has inner padding.
- The graph trace's result panel has the dock's padding, so a one-line
  result is no longer a strip the height of its text (INBOX 262).
- A file chip in a note's body has room below it before the badges row
  (INBOX 261).
- The dashboard greeting's persona select no longer draws empty when the
  saved name is the built-in's old one or a persona since deleted (INBOX
  260).
- The embedding model's warm-up waits for the app to go quiet after its
  first requests, so the dashboard's counts no longer load behind the
  torch import when you log in right after launch (INBOX 257).
- The packaged app still checks stable releases when "Track the main
  branch" is on (that switch is the source-install launchers'), and its
  label says so (INBOX 254).
- **The packaged Windows app starts again.** It is built without a console,
  so `sys.stdout` and `sys.stderr` were None and uvicorn's log formatter
  failed on `sys.stderr.isatty()` before a port was bound: "Unable to
  configure formatter 'default'" on launch, and an auto-update into such a
  build left the app unopenable. Both streams now go to
  `<data dir>/logs/desktop-stdio.log` first (INBOX 251). The release
  workflow now starts the frozen app and waits for its page before it
  packages or uploads it, on both platforms; `--reset-password` no longer
  needs a console to confirm.
- Circles on the whiteboard can be moved, resized and rotated again, alone
  or in a marquee selection: their path is written with absolute arcs,
  which neither the bounding-box walk nor the transform walk read (INBOX
  252, 255).
- The built-in librarian persona is Atlas; a preference saved under the old
  name keeps working (INBOX 237). The help page's Ask Atlas row has room
  above it and the Advanced response settings sit above Installed models
  (INBOX 235). The graph's Curved links and Cluster glow switches are what
  the renderer reads, so the menu cannot show one thing and draw another
  (INBOX 247). The empty chat's '?' sits in the pane's corner, not the
  welcome column's (INBOX 248).
- A Library row's preview is plain words: wiki links read as their titles,
  table rules, list markers and pipes are gone, and a bold marker the clip
  split no longer survives (INBOX 244). The Create picker is sized to its
  five rows rather than the 880px modal width (INBOX 245).
- The graph's node popup opens with its body rendered again (headings,
  bold, pictures), and the capture box, the edit form and the draft get the
  note editor on their first focus from a fresh boot: the editor's bundle
  became Library-only when the tabs went lazy, so nothing mounted until
  that tab had been visited; app.js now fetches it on the first focus of a
  note box and the popup mounts it on open (INBOX 242).
- Atlas's answer badges did nothing in the sheet (their click handler was
  delegated on the Settings modal); the sheet head now carries the mark,
  the name, the one-line description and the kebab beside the close, the
  composer's field and buttons share one 40px height, and answers are
  written in under the caret rather than dropped in whole.
- The Library's sub-tabs, the boards controls and the graph pane did not
  wire when their files loaded on first use: their top-level setup waited
  for `DOMContentLoaded`, which had already fired. They wire through
  `onDomReady` now, and a lint fails any lazy file that waits for the event.
- The dashboard's shared `/insights/stats` reader called itself instead of the
  endpoint, so every widget that reads the notebook's totals drew its empty
  state and no request was made at all. Each of the seven call sites has a
  `catch`, which is why nothing showed in the console.

- The mind map's control sweep is closed (INBOX 200): 112 controls audited, one
  place per action, the top bar 60 controls to 40 and the ring's reach 164px to
  88px, with every ring action also a key and also in the topic's own menu.
- The mind map's own sweep reads the map it draws: the last two failures in
  `scratchpad/ui-sweeps/mindmap.js` were its own sampling, a fixed 64 points
  along a path whose spacing grows with the edge. One sample per pixel, on the
  edge belonging to the pair being measured, and the gap after a drag is 0px.
  76/76, from 74/76.
- An empty mind map now says how to start, once for the browser: one line under
  the template offer pointing at the topic's own ring and at Tab, gone the
  moment a map has more than its root. The map's rail carries a '?' that names
  all three surfaces and the keys behind them (INBOX 200).
- A mind map's core idea is told apart four ways at once (INBOX 201): the
  ellipse, a ground filled in its own branch colour with the ink that reads on
  it, one step larger type and a star before the label, all from the one toggle
  in the strip. The ink is computed per colour, so the label clears 4.5:1 on
  every palette entry in both themes (worst 4.62:1, `scratchpad/ui-sweeps/mapcore.js`,
  16 checks light and dark). A topic given a shape by hand keeps it.
- At a higher browser zoom the tab strip no longer runs under the header
  controls (1152 to 1240 measured at 0px overlap) and a mind map's top bar
  folds its picker and Library label from 1216px down (INBOX 195). A board
  export's description shows on its card at once (196). New board from inside
  a board pre-selects the last kind (197). The live view hides a code fence's
  backticks while the caret is elsewhere; the graph node popup opens rendered
  and no longer repeats the note's own pictures (198). Today's note is one
  press, one note, and jumps to it (199). Every sheet has a close button in
  its title row (204). The agent and the Guide leave the header for the
  bottom bar, which takes the header cluster from five buttons to three, and
  the header's icon buttons lose their segmented wells for the header's own
  ground (207). A help '?' popover is capped at a reading height and scrolls
  instead of running the height of the window, and stays inside the window on
  a phone (206), and opens in front of the popup agent rather than behind it
  (205). Switching light and dark is one repaint rather than a dissolve at
  three speeds, and the background art is rebuilt after it rather than during
  it (202). Every control that needs a model says so and is disabled while
  none is running, 15 of them rather than the 7 an array in one file had kept
  up with (203). The popup agent's foot row is one control high in every
  state rather than two or three lines of wrapped captions, 75px and 124px
  before, 51px and 61px now (208). Its starters read as a set: a glyph per
  verb family on all 14, labels left-aligned behind them, each family ruled
  off, and one line of intro rather than four (205). The in-app guide is called
  Atlas, can say what it is and what it cannot see, shows that before the first
  question, and reads as a column rather than a 1356px line (204). The
  Timeline's four kind filters are one dropdown that says what it is set to,
  441px of dock row down to 121px, so they no longer collide with the controls
  beside them at 150% zoom (214). A conversation with the popup agent can be
  kept: "Save as chat" in its foot menu writes it to the Chat tab and offers
  the thread (215). Atlas is one chat rather than two: a sheet on the popup
  agent's recipe with a head, starters, bubbles and a composer, the source help
  topics under each answer, and the Settings page holding the way in rather
  than a second copy of the box (224). Atlas is offered where the question
  comes up: a line under eleven help popovers, in three empty states, as a
  palette command, and as Ctrl+Shift+H, all from one table (224). The command
  palette stopped rendering results after the first keystroke until the Library
  had been opened once.

- The mind map has one place per action (INBOX 200). The node ring is six slots that say what they are, not eight icon-only discs; the topic strip holds every look, including the line shapes that were on the line ring; the dock holds what acts on the map. The ring and the strip are never open together, every ring slot is also a key, and the topic's own menu (the ring's More, or Shift+F10) carries all of it. A map no longer shows the board's Insert and Arrange menus: 60 controls in its top bar before, 40 after.

### Added

- Atlas can be stopped: while a question is out the send button is Stop,
  and a click aborts the request or halts the reveal where it is (INBOX
  259).
- A custom persona may write `{ai_name}` for the assistant's name; the
  Personas page says so beside the box, and the preview shows the filled
  text (INBOX 258).
- A report by email: every error toast has Report this, which saves the
  support bundle and opens your mail app addressed to the developer with
  the error in the message; Settings, Logs has Email the support bundle in
  its menu; and Atlas points
  a question about an error the same way (INBOX 256).
- The `m` chord reaches both assistants: `m` then `a` opens Atlas, `m` then
  `p` the popup agent (INBOX 249). A link out of any overlay closes that
  overlay first (INBOX 250).
- The night pass reads what it already knows in one query instead of one per
  note. Measured on a re-run with nothing new to derive: 9 statements over 5
  notes and 44 over 45 before, flat after.

- `scratchpad/probe_list_queries.py` drives every list endpoint at a page of 5
  and a page of 100 over the same notebook and says which ones cost a query
  per row. None do, measured at 121 notes with 40 attachments; the three
  newest and most joined are pinned in `tests/test_scale_query_counts.py` so
  the next one cannot arrive quietly.

- The journal has a day that opens twice. `POST /entries/daily/{date}` returns
  that day's note and makes it only if it is not there yet, so pressing
  "today's note" a second time no longer leaves two notes headed with the same
  date and the day's writing split between them. `GET /entries/daily` says
  which of the last days were written and how many in a row, counting back
  from the caller's own today and allowing today to still be empty.

- The guard that refuses to fetch a URL pointing back at this machine is one
  function now, `core.security.public_addresses`, rather than a private one
  inside the web reader. A new test walks `src/` for outbound HTTP calls and
  fails on a module that is not written down as either untrusted (it must go
  through the guard) or configured (the address is one the person set).

- Four list endpoints that returned as many rows as the notebook has now take
  a `limit`: the attachment gallery, the memory stream, the orphan scan and
  the duplicate groups. Each still reports the real total, so a screen that
  says "42 files nothing points at" is not counting its own page.
  `tests/test_list_limits.py` walks every route the app serves and fails on a
  fifth, with an allowlist that carries the reason each bounded list is
  bounded rather than a count.

- What the notebook learned, as a table you can correct (WORLD_CLASS_PLAN 15,
  I1 and I9). A night pass reads each note, keeps the claims it makes and the
  questions it leaves open, and records for every one of them the note and the
  exact span it came from, who decided (a model by name, or `local`), when and
  how sure. Each can be edited (and is then never overwritten by a later run),
  deleted (and then never re-derived), reset to what the model said, exported
  as JSON, or forgotten entirely, which leaves notes and revisions untouched.
  One switch per runner plus a master switch, read before every pass.
- A citation mark in a chat answer now shows the exact passage it came from on
  that source's card when hovered or focused, rather than only naming the note.

- The Guide is told which tab the question came from and what the controls on
  it are called, so "how does this work?" is answered about the surface in
  front of you rather than with "I'm not sure". It still cannot read a note:
  only control labels are sent, never text on screen.

- The popup agent and the help chat are reachable from every tab: a wand and a
  '?' in the header, and the '?' also sits in the head every Settings pane
  shares. The help chat has a name, the Guide, and opens as one shared sheet.
- The agent's starters now depend on the tab you opened it over, its arrow keys
  walk them, and its state line says what it is working on and which tool ran.

- Right-clicking or long-pressing a link now opens a menu with Copy link
  address and Open in new tab, anywhere a link is drawn. An internal
  `[[link]]` offers Copy title and Open instead.
- A dock zone that cannot shrink any further now says so instead of spilling
  its last control under the one beside it, and the dashboard's category rows
  are a target rather than 1.2px under the floor. The touch sweep also reads
  the floor off the band it is run in, so it says something true above 820
  rather than asserting a phone's 44px on a desktop.

- Every control on a phone is a 44px target, and a tab's title gets a line of
  its own there. Seven surfaces were walked whole rather than dock by dock:
  the Library and Reminders filter chips were 36px and 22.4px, the sidebar
  sheet's own opener 36px, the graph's zoom controls 34px, and the chat's
  title was 139px of text in a 56px box.

- Opening a picture card's fold no longer stretches the six cards beside it.
  It used to take every card in the row from 240.7px to 411.1px, leaving 213px
  of empty card under each of the others; now only the card you opened grows.
  The row is still equalised at rest, which is the recorded decision.

- On a tablet in landscape the header is one row again and the tabs are a
  finger's target. It was two rows (112px at 820) on the band whose own rule
  says one, with 36px tab buttons; the strip needed 505px against 448px of
  room. The buttons take the narrower padding and smaller caption the band
  below uses, a 44px floor on both axes instead, and the due-reminders count
  sits on its glyph rather than beside it. The strip is 385px in 448 and the
  header 72px.

- The phone's tab bar recedes to its icons while you read down a list and
  takes its words back the moment you turn round. It is never hidden: 57.6px
  of bar with captions becomes 44px of icons, still five columns and still
  44px targets. And the selected tab keeps its caption at 320, where it was
  the one column of five without a word.

- A sheet closes the same way wherever it is built. The three sidebars and
  the graph's panel become sheets in place rather than being built by the
  sheet recipe, and they now share its dismissal: a captured Escape, a press
  outside, and focus back on the control that opened it. The sidebar sheet's
  Escape used to bubble, so a handler inside the page that stopped one took
  it first.

- The timeline dock's kind filter is one control rather than four. The four
  kinds were four filter chips at four widths, which wrapped to three lines
  at 1024 and four at 820 and took the dock to 181.2px; they are a toggle
  set, so they are now a `.seg.seg-multi` well, one row at every width, the
  words in above 1200 and the icons alone below it, 44px cells on a phone.
  The band filter's way out is the one chip beside it, which is the one
  filter here you can take off. The dock is 54px at 1440, 1024 and 820.
- A document can leave with its pictures, as a Word file, and come back from
  one. "Download with images (.zip)" is the markdown plus every image it
  references in `assets/` with the links rewritten to match, so it opens with
  its pictures showing in any markdown reader; "Download as .docx" is a Word
  file where this install has python-docx, and a message naming the package
  where it does not. Importing a .docx now works without any converter
  installed (a Word file is a zip with one XML part in it), and a saved web
  page imports as prose rather than as tags. Measured:
  `tests/test_docexport_bundle.py` and `tests/test_docview_import.py` (14
  tests, 2 skipped without the optional extra), and
  `scratchpad/ui-sweeps/docexports.js` in a browser, 6 of 6 with 0 unexpected
  console errors.

- Every note editor in the app is the same editor. The capture box, the note
  edit form, the graph's node popup and new-note box and the two Write-with-AI
  panes mount the document editor's engine on their first focus: markdown that
  renders as you write, the same Ctrl+B / Ctrl+I / Ctrl+E / Tab chords, the
  same "/" menu and the same toolbar, with the textarea still underneath as
  the value every save path reads and as the fallback if the engine cannot
  load. Measured with `scratchpad/ui-sweeps/notesurface.js`, 22 of 22 checks
  and 0 console errors: six boxes mounted, the typed text in the textarea
  under each, bold from the toolbar and from the keyboard, the "/" menu with
  14 commands in a note, and a script clearing the box clearing the view with
  it.

- A phone gets the formatting it can reach. Below 600px the documents editor
  carries a bar at the bottom edge with bold, italic, heading, list, task,
  link and the "/" menu, sized for a thumb and riding above the on-screen
  keyboard on the inset the app already measures. The 25-control strip at the
  top of the pane is still there for a wider window. Measured with
  `scratchpad/ui-sweeps/docnarrow.js` at 390x820: 7 actions, the smallest
  target 44px, the bar's foot on the window's own edge, the last line of the
  document clear of it, bold writing `**first**` from a selection, the "/"
  button opening the 19-item insert menu, and the bar absent at 800, 1024 and
  1440.
- **Graph node popups draw the pictures and files a note names in its own
  markdown**, not only the ones it carries as attachments, and a file card
  states its size beside its kind. A note whose picture is a library upload
  opened a panel with nothing in it before; both shapes now draw. The graph
  also says what an entity is, in one sentence, in the Show section's help
  popover, in a legend entry and on the node itself.

- **A local map beside an open note or document** (GRAPH_PLAN Phase 4's last
  item). `#graph-pane` is the Graph tab's own canvas renderer at
  `size: "pane"`: it draws `/graph/local` at depth 1 for whatever is open, in
  the Notes sidebar and the Documents sidebar, and clicking one of its notes
  opens that note. Measured (`scratchpad/ui-sweeps/graphpane.js`, 1440x950):
  6 nodes against the local payload's 6 where the tab has 74, a 226x176 box
  that really paints, and the tab's node count, edge count, canvas and camera
  size identical before and after.

- A document can be downloaded as one self-contained HTML file. Images become
  data URIs, the stylesheet is written into the file, comments travel as
  footnotes, controls that only work inside the app are dropped (a `[[link]]`
  keeps its words), and a link back into the app keeps its text without its
  address. Measured with `scratchpad/ui-sweeps/docexporthtml.js`, which opens
  the saved file in a browser with every network request refused: 0 network
  attempts, 1 inline image decoded, the table, the task boxes and the reading
  measure all intact.

- A mind map's lines are styled one branch at a time. Select a topic and the
  strip carries the line coming into it: thin, normal or thick, dashed or
  solid, and an arrowhead on or off. The thickness scales the branch itself
  rather than a line width, so a thick branch is a wider ribbon at the parent
  and still tapers to its topic, and a thin one recedes. A trunk, which has no
  line above it, is shown none of these.

- A citation knows which passage of a note it came from. Grounding scored a
  sentence against a whole note, so a mark could only say "somewhere in here",
  which is no help on a note that mentions its subject in three paragraphs.
  Each mark now carries the span of the best-matching 40-word passage, scored
  with BM25 over the note's own passages, with the figures a claim quotes
  pulling the span towards the paragraph that holds them. The hover highlight
  that uses the span is the renderer's half and is not in yet.

- The phone's bottom bar is five columns instead of seven, and every one of
  them is named. Notes, Chat, Graph and Library are a tap away; Dashboard,
  Timeline, Reminders and Settings are behind More, which opens a sheet from
  the bottom of the screen. Nothing is hidden and nothing is more than two taps
  away. The bar also says where you are while you are on one of the three
  tabs behind More, which it could not before.

- Three ways to change what is in front of you while you write, in the
  document's ⋯ menu and remembered: "Dim all but this paragraph" fades every
  line outside the one you are in, "Keep this line centred" scrolls the pane so
  the line you are typing on stays in the middle, and "Serif for reading" draws
  the rendered page in a serif with a little more leading. Measured with
  `scratchpad/ui-sweeps/docreading.js`: 40 of 41 lines at opacity 0.35 with the
  caret's paragraph at 1, the caret at 0.483 of the pane's height with the
  typewriter on against 0.956 without it, and the rendered page's line height
  24px to 27.52px with its text drawn 24.1px narrower, which is a different
  face rather than a different name for the same one.

- An AI edit arrives as a change you can take apart. The assistant's answer is
  shown as a diff against what it was asked to rewrite, one head per change,
  and any change can be skipped: skipping puts the old lines back rather than
  dropping them, and the text under the diff is always exactly what accepting
  would apply. Editing that text by hand rebuilds the diff against the same
  target. A pure insertion ("write") draws no diff, because a diff of an
  insertion is the insertion. Measured with
  `scratchpad/ui-sweeps/docaidiff.js`: a two-change proposal draws two heads,
  skipping the second restores its original line in the answer and dims its two
  rows to 0.45, and putting it back restores the answer exactly.

- The bar down a mind map topic's edge is now the topic's own choice. The
  strip has a picker beside the shape: solid, dashed or no bar. The bar is what
  carries the branch's colour, so quieting it on a topic lets a dense map read
  as text rather than as a wall of colour, and a dashed one says "this one is
  provisional" without a second control. On a map that grows downward the
  choice moves to the top edge with the bar itself.

- The document history says what changed, not just when. Any version in a
  document's history opens a diff in its own row now: the lines it added and
  the lines it lost, in the app's two diff colours, with the untouched runs
  counted rather than printed, and a head saying which two versions are being
  compared. The list has an "AI edits" filter beside "All", so the versions an
  AI edit replaced can be found without reading past your own. Measured with
  `scratchpad/ui-sweeps/dochistory.js`: a one-line change in a forty-line
  document draws six rows and two counted gaps, and the history row itself came
  down from 346px to 94px, because a third action in the row had squeezed its
  text column to 134.6px and let a preview wrap to 270px.

- A mind map topic can be marked as a core idea. Beside bold and italic in
  the topic strip there is a crown now: a marked topic draws with a heavier
  outline, a wider spine in its branch's own colour and heavier type, so the
  idea a branch hangs off reads as that from across the canvas. The shape
  picker has gained the ellipse that goes with it, so a core idea can be a
  rounded card, a pill or an ellipse. The mark travels with a copied branch
  and "back to the branch" clears it with everything else.

- A mind map topic resizes like a card on a board. Point at a topic and there
  are two grips in its corner now: the "Aa" one that has always set the text
  size, and a new one that drags the topic itself wider and taller. The map's
  layout still owns where a topic sits, so a resize only ever changes its size,
  and the tidy pass makes room for the new one. The height it is given is a
  floor rather than a ceiling, so a topic can still never be cut off by its own
  words.

- A skill run that stops on a step can have that step rewritten and run on its
  own. Beside Resume there is now "Edit step N": change the wording, press Run
  this step, and only that step runs, with the earlier ones left alone and the
  rest of the skill still there to carry on with. The step's contract is not
  editable from there, so rewording an instruction cannot quietly drop the
  condition it has to meet.

- The Timeline is the whole notebook, not only its notes. Documents you
  started, boards you drew and reminders that fell due are rows in the feed
  and the table, each with its own marker, and four chips in the dock turn any
  of them off. A reminder sits on the day it is due, the way a note sits on a
  date it talks about; a document sits where it was started, so it does not
  walk forwards through the feed every time you open it.

- Today is always in the journal, even before you have written anything in it,
  and offers to start the day's note. The note is an ordinary note whose first
  line is the date, so it is searchable, it is in the graph, it exports, and a
  notebook opened in another editor still has it.

- A web link the AI writes on a line of its own now renders as a card: the
  link's own words as the title, the site under it, and the whole thing is the
  target rather than a few underlined characters. A link inside a sentence is
  unchanged, because a card in the middle of a sentence breaks the sentence.
  No favicon: this app fetches nothing from the web that you did not ask it
  to, and the site's name in words says the same thing.

- With no model connected, the app says so where you are and offers one click
  that fixes it. The Ask tab keeps working and explains that it is answering
  from your notes alone, with the matching records beside it; the popup agent,
  which has nothing to fall back on, disables its field and its starters
  rather than hiding them. Every AI-only button now says "Connect a model in
  Settings" instead of naming Ollama, which was the wrong instruction for the
  two other kinds of model this app can use.

- Twelve starters in the popup agent, grouped by what they do: capture, find,
  summarise, remind and do. Each is a verb with a slot ("Remind me to…") that
  drops into the box with the caret after it, or a whole instruction ("Tag my
  untagged notes.") that runs on the press; the three you used last are
  offered first. Beside them is "Use the open note", which sends whatever note
  or document you have open with what you ask, so "summarise this" works from
  a panel that floats over every tab. The card now has a ceiling and scrolls
  inside it, so Start over and Stop stay on screen on a laptop and a phone.

- The Ask tab answers the way the Chat tab does. Under an answer there is now
  a Sources disclosure listing what the answer drew on, an "Elsewhere in your
  notebook" row, and follow-up questions: press one and it is asked with the
  answer above it carried as context, so "when should I do that" resolves
  against what was just said instead of being read cold. All three are the
  Chat tab's own components drawing the same answer object, so an answer means
  the same thing whichever surface asked for it.

- Comments in a document. Select a phrase, choose Comment in the toolbar's
  Highlight menu or "Comment on this" in the "/" menu, and the remark is
  written into the document's own text as `==words== %%remark%%`: there is no
  comment store, so a document written in another editor arrives with its
  remarks already listed, and one written here stays readable anywhere else.
  The remark hides behind a pin in the text, the words it is about carry a
  hairline under the highlight, and the sidebar's Outline tab lists every
  remark with the phrase it is on: press one to jump to it, resolve one to
  take it out and leave the words. Read view shows the document without them;
  a PDF export carries them as footnotes.

- A context window per model. Settings > Models has a Context window box
  beside the model's spec: empty is auto (the window the model file or the
  server reports), a number is what that model runs at, and the choice is
  remembered per model, so a small model and a large one can differ. A
  hand-set window also beats the machine-wide ceiling, because that ceiling
  exists to stop the app guessing big, and a number typed for one named model
  is not a guess. The badge shows used against whatever window is in force.

### Fixed

- The mind map rail's layout picker was a 36px circle reading "T.": the
  rail's round tool-button rule caught the select's face. It fills its
  shell now, field-shaped.
- Local OCR pins Tesseract to one OpenMP thread unless `OMP_THREAD_LIMIT`
  is already set: measured 42 s against 0.28 s for one line of text in a
  four-core container, the thread oversubscription Tesseract's own docs
  warn about, which on a laptop beside a running model made every image
  read look hung.
- The generative background art did not appear after a fresh login:
  `startBgArt` returned early when p5 was not yet loaded, before its own
  on-demand branch. The early return is gone and the callback re-enters
  with the current prefs.
- Four dashboard widgets (Stats, Streak, Notebook constellation,
  Categories) read "Couldn't load this widget.": `fetchDashStats` called
  itself. A test pins the shape.
- The Rediscover widget's rows are one grid each: a one-line title over
  the reason and an icon-only Never again in a right column, so every row
  shares one shape (titles were 48, 24 and 72px tall with the control at
  three heights).
- `SpaceResponse`'s Pydantic V1-style `class Config: from_attributes = True`
  warned `PydanticDeprecatedSince20` on every request that returned a space.
  Moved to `model_config = ConfigDict(from_attributes=True)`; it was the only
  class-based config left in the codebase (checked all 43 `BaseModel`
  subclasses). Verified with
  `pytest tests/test_api*.py tests/test_whiteboard.py tests/test_spaces.py
  tests/test_space_delete_cascades.py -W error::pydantic.warnings.PydanticDeprecatedSince20`,
  clean.
- The popup agent called a mind map or a board "the open note", and sent it to
  the model as a note, so an answer about a map you had just made described an
  entry whose whole content is its title. The toggle names the thing and its
  kind, and the run scopes to the board rather than to a note.

- The Actual size / Fit to panel toggle on an AI-written table did nothing
  outside full view: every rule it drove was scoped to the full-view panel. It
  works in the answer bubble now, and in full view the column widths and row
  heights can be dragged, with the sizes kept for as long as the answer is.

- The table bar under an AI-written table was five labelled buttons, which
  wrapped onto two rows inside the popup agent. It is one Copy button and a
  kebab menu holding Copy as markdown, Save as a note, Save as CSV and the two
  view toggles.

- The chat header's context-window badge drew the subline's separator dot
  inside its own pill, so the number sat 9.2px right of the pill's centre and
  the amber border past 70% of the window wrapped the dot as well as the
  count. The separator now sits in the gap beside the pill.

- The popup agent showed a blinking write caret beside the three-dot waiting
  animation, before any of the answer had arrived. The answer box wore
  `is-streaming` from the moment the request went out, so the caret's
  `> :last-child::after` arm landed on the dots; the class now goes on with
  the first token, which is what the Ask box has always done.
- The document assistant's Edit / Write / Remove row is drawn as the choice
  control it is. It carried a 11.2px track corner and a 6px segment corner
  where every other choice control on the same screen is 15.4px, and its three
  segments were 73.4 / 82.7 / 101.2px wide, so the widest verb read as the
  important one. The track takes `.seg`'s own radius, the segment sits
  concentric inside it at 10.4px, the three are one width (101.2px each) on a
  grid, the chosen one keeps `--accent-surface` behind `--on-accent`, a
  keyboard focus is visible on the segment for the first time, and what the
  three verbs do is behind the row's new '?' rather than above the field.
  Measured with `scratchpad/ui-sweeps/aiedit.js`, light and dark: seams 2.4px
  against a 2.4px gap, ends 5px and 5px, chosen segment 20.98:1 light and
  7.5:1 dark.

- The Live view drew a markdown table as a row of squeezed columns with wide
  empty gaps between them, and every cell wrapped its words one or two to a
  line. Each hidden pipe leaves three zero-width elements behind in the line
  (two CodeMirror widget buffers and the replacement's own empty span), and
  the line's `grid-auto-flow: column` gave every one of them a column: fifteen
  tracks for a three-column table, the cells at 51.6px. The cells are placed by
  index now and everything else is pinned into the first track at zero width,
  so a cell is a third of the row (257.9px of 794) whatever else a decoration
  leaves in the line. A spelling underline also used to be drawn outside the
  cell and split it into five (measured: 21 cells in one three-cell row); it
  nests inside now. Measured with `scratchpad/ui-sweeps/doctable.js`, 24 of 24
  in both themes.

- The board's zoom cluster is the same shape as the tool row it shares an
  edge with: one pill, one inset, instead of a rounded rectangle beside a
  pill (INBOX 43).
- A tidy writes the whole map in one request instead of one per node, and a
  tidy that pushed part of the map off the canvas frames it again.
- On a phone-width map, a branch can be folded again: the node's own action
  row had been sitting on top of its fold chevron, and the template offer on
  a new map covered the only topic that map had.
- A board or map exported into the image library arrives with a description
  naming the board it came from, so its card is no longer a picture over an
  empty strip on a notebook with no vision model (INBOX 184).
- A board or map exported into the image library arrives with a description
  naming the board it came from, so its card is no longer a picture over an
  empty strip on a notebook with no vision model (INBOX 184).
- Both of the mind map's radial rings sit on a ground of their own now, so a
  ring reads as one control rather than eight circles over the canvas
  (INBOX 191).
- The New board dialog opens on the kind of board you made last, and its
  button says Create rather than Save (INBOX 183).
- The map's top bar no longer runs off the right of the window. Layout and
  Tidy moved into the tool dock's own Layout section, the board picker keeps
  a name's worth of width on a narrow window, and the Library button drops
  its word before any menu drops theirs: 0 controls past the edge at 1440,
  1024 and 820 (INBOX 183).
- Shapes, lines and connectors no longer trail the note cards during a pan.
  The pan transform moved from the `<g>` inside each board SVG onto the
  `<svg>` root, because `will-change` on a `<g>` promotes nothing: measured
  through the layer tree, the SVG holding every shape was not a composited
  layer at all while a card was (INBOX 183).
- A middle-button pan on the board now says it is a pan while it runs: the
  grabbing cursor the hand tool uses, no text selection dragged out behind it,
  and the release no longer fires an `auxclick` (INBOX 183).
- Every image in a document's Live view drew "no longer in this notebook" over
  a file that was still there. The Live view's image widget set the raw
  `/media/…` path, and an `<img>` cannot send an unlock header, so the load
  answered 401 and the app's missing-media handler replaced it. It goes through
  `mediaSrc` now, like every other image in the app.

- The Timeline's automatic scale looks at the days you wrote on, not at how
  many things are in range. A week of writing with two hundred reminders due in
  it was being drawn in month buckets, so the whole week sat in one column: it
  keeps day buckets now, and a notebook spread over years still buckets by month.
  The count line under the dock says "items" rather than "notes", because the
  feed holds documents, boards and reminders too.

- Back and Close in Settings can be pressed on a 320px phone. The head of the
  sheet wrapped onto two lines there while keeping the height of one, so both
  controls were drawn over the search field below them and every tap reached
  the field instead.

- The Timeline's rows are called `rows`. The endpoint has called its list
  `notes` since before it held anything else, and it holds documents, boards
  and reminders now, so `notes[3]` could be a reminder. `notes` still carries
  the same list for one release, in case a cached copy of the app is older than
  the server it is talking to; it goes in the release after this one.

- On a phone the Timeline's kind filters are a finger's size and take a line of
  their own. Below 600 the four chips are their icons, which left them 33px
  wide against the 44px every other control in the app meets there, and the
  line they were meant to have was never given to them: their zone does not
  wrap, so at 320 they stacked four deep and the dock took 297px of an 844px
  screen. One row of 44px chips at 320, 360 and 390 now, and the dock is the
  same height at all three.

- A red test log no longer ends in a budget error that was never the fault. A
  skill run holds its token budget open across the generator that streams it,
  and a generator is closed by whoever happens to be running at the time, so a
  run abandoned mid-stream ended with `ValueError: Token was created in a
  different Context` from the budget's own cleanup, printed last and reading
  like the cause. The scope now ends cleanly wherever it is closed.

- The document editor's word menu follows its word, or closes. The menu copied
  the word's position when it opened and nothing re-measured it, so scrolling
  the editor under an open menu left it beside whatever had scrolled into that
  spot, 84px from the word it was about after an 80px scroll, and it stayed
  open after the word had left the editor entirely. It is re-measured on scroll
  and on resize now, and closes when the word is no longer visible: measured
  0px horizontally and 4px below the word after the scroll, closed after the
  word leaves the box.

- The graph's minimap has a size setting, Small or Large, beside its position
  in the graph's dock menu, and it fades out of the way while you are zoomed
  far enough out that the whole map is already on screen.

- Describing a picture with AI and reading text out of one now show up as
  background processes in the activity panel, so you can leave the dialog or
  the tab and still see what is running and how it ended.

- The ring of controls around a mind map topic now says what each one does. A
  caption under the ring names the slot you are pointing at or have moved to
  with the keyboard, and the two slots that Alt swaps for their opposite say
  so on the same line.

- Mind map branches are drawn as tapered ribbons, wide at the parent and
  narrowing towards the child, so a map reads as a tree growing outwards and
  each branch says which way it runs without an arrowhead. Lines you have set
  to straight, elbow or dashed keep the look you chose.

- A link tool on a mind map connects the map. Drawing a line from a topic to
  one that hangs off nothing now attaches it as a branch, with a real tree
  edge, instead of leaving a decorative curve over a node that is still not
  part of the map. Two topics that are both already in the tree still get a
  cross-link.

- Drag-select on a whiteboard or mind map works where the connectors are. Every
  link carries a wide invisible band so it can be clicked, and a rubber-band
  drag that began anywhere on that band did nothing at all, which on a board
  whose links cross the middle is most of the canvas. A connector no longer
  swallows the gesture, and clicking one still selects it.

- A picture card in the Library shows its selection tick when you are near it,
  not on every card all the time. The tick keeps the ground that makes it
  legible over a dark photograph, and stays visible on a card you have ticked,
  while a selection is running, and on a touch screen.

- A board or mind map preview no longer draws its labels over its own edge.
  Which side of a block the label hangs off was decided by the half of the
  board the block started in, so a wide topic just left of centre was labelled
  to its right and the name ran past the paper and was cut at the thumbnail's
  border. Both margins are measured now, the label takes the larger one and is
  cut to what that side can hold, and it is left off entirely where there is
  room for less than four characters.

- Boards and mind maps exported to the image library are described and read
  like any other picture. They were posted as staged uploads, which are
  processed only when a note or document later saves a reference to them, and
  nothing ever references a board export, so it arrived with no description
  and no text reading and the card had neither block on it.

- The document editor's word menu and word completion popup no longer open off
  the screen when the background art is on. Both are placed in the window's own
  coordinates, and both lived inside the document card, which carries a blur
  whenever the art is on; a blurred surface becomes the frame a fixed popup is
  laid out against, so the menu asked for `left 952, top 322` and drew at
  `1245..1485, 399`, 45px past the right edge of a 1440px window, 53px from the
  word it belonged to, and under the bars outside the card. Both popups now
  leave the card while they are open and go back on the way out, and the
  placement measures what was drawn and corrects itself, so any surface that
  gains a blur or a transform later cannot take them with it. Measured at 1440,
  1100 and 820 wide: 0px gap to the word, 0px past the card, nothing outside
  the window; the completion popup opened 294px from the caret before and 0px
  after.

- The writing caret in an answer stops blinking when you ask for less motion.
  It honoured neither the platform's reduce-motion setting nor the app's own
  "Progress indicators: Still", because the rule that stops it carried two of
  the caret's four selectors and both lost on specificity to the longer ones
  that place it after a paragraph, a list item or a quote. The caret itself
  stays either way, still 8px wide: an answer arriving with nothing on screen
  saying it is live is worse than a still caret.

- The bottom tab bar on a phone says which tab you are on. Below 480 all seven
  captions were hidden, so the bar was seven unlabelled glyphs with the selected
  one marked by colour alone; from 360 up the selected tab keeps its caption and
  the other six are icons, which is the shape the 820 to 1100 band already uses.
  Every column also has a 44px floor now: with "Chat" selected the selected
  column had been shrinking to 41.9px.

- A picture in the Library can be opened from the keyboard. The thumbnail and the
  filename both opened the picture on click, and neither was focusable: measured,
  the only controls a keyboard could reach on a resting card were the selection
  tick and Rename, so a keyboard could select a picture and rename it but could
  not open one, and a screen reader was read the file's alt text with nothing to
  say it did anything. The thumbnail is the control it already behaved like now:
  it takes focus, announces "Open <name>", answers Enter and Space, and draws a
  ring inside its own clipped frame.

- The document editor's phone targets. The sidebar sheet's rail toggle, the one
  control that opens the sidebar on a phone, was 36px square, and the Edit/Read
  segment 28px tall; both are 44px below 600px wide. The rail grows with the
  toggle rather than beside it, so the editor pays 8px of measure for it and
  nothing drifts. Rows inside the dock's own menus stay 36px on purpose: their
  target is the full width of the menu, and raising fifteen of them would make
  it 660px tall in an 820px window.

- The graph's minimap shows the graph's shape and where you are in it. It drew
  one dot per note and nothing else, measured at 172 dots and 0 edges on a
  172-note map: a cloud of points cannot say which part of the map is the dense
  cluster and which the chain, which is what an overview is for. The links are
  drawn under the dots now, at a hard cap and sampled evenly on a big notebook,
  and the note you have selected or have the keyboard on takes a ring, so the
  minimap answers "where is the note I am reading" as well as "what can I see".

- The document editor's AI assistant dialog. It opened as a 717px card whose
  largest element was an empty 309px box for the answer it had not been asked
  for yet, under a label for text that was not there and over a Replace button
  for nothing; it is 250px now, and the answer, its label and Replace arrive
  together when there is one. The Edit/Write/Remove toggle, the instruction
  field and the buttons are one height instead of five, the toggle's labels are
  the size of the field rather than larger than it, each verb carries its own
  icon, and the instruction and the button that acts on it share a row.
  Switching verb no longer leaves the previous verb's suggestion on screen
  under the new verb's accept button, which would have applied a rewrite as a
  removal.

- Board previews draw what is on the board. Every sketch on a board was drawn in
  the same corner at the same size, because a stroke is stored with x=0, y=0 and
  its path in board coordinates, so eight shapes previewed as one squiggle
  (measured: eight marks at one position and one size). The server reads each
  stroke's own box now, the way the canvas does, and sends the tool it was drawn
  with and its ink, so a rectangle previews as a rectangle, a circle as a circle,
  a line corner to corner and a pen stroke as a scribble in its own box. Blocks
  also stopped being blobs (a corner was 35% of a block's short side, now 8%), a
  picture on the board gets the picture glyph instead of a third shade of the
  same blue, and a card's title is drawn beside its block when it will not fit
  inside, so "Retry budget" reads as "Retry budget" rather than "Retr…".

- The writing suggestions panel is as tall as what is in it. A finding's
  candidates lie along its row rather than down the panel, and the panel no
  longer keeps a fixed floor it was always shrunk back to: one finding is 109px
  of panel around 97px of content, against 128px before with 29px of nothing in
  it, and the editor above it is up from 45% to 47% of the window. A row opened
  under Large text with Spacious on now fits inside the panel, which the old
  floor was 5px short of.

- A Files row's metadata starts to the right of its filename, not to the left of
  it. The name is a `figcaption` with an 8px inset of its own, while every block
  under it sat on the row's own margin, so the kind, size, reading controls and
  description all began 8px further left than the name they belong to. They
  share one edge 12.8px to its right now, measured at 1440, 820 and 390.

- The bar of actions for a selection stays with the selection. Tick something
  in the Library, the Notes list or the timeline table and the bar that appears
  now sticks to the top of the list it governs instead of scrolling away with
  it: measured before, the Notes bar sat at y=-465 with its list scrolled to
  the end, 677px of scroll putting every action for the selection out of reach.
  It is one component everywhere now rather than five near-copies, so the Notes
  and timeline bars wear the same accent strip as the Library's, and the bar
  under the Notes sub-tab strip stops below it rather than behind it.

- Six chat-surface reports. The user's bubble ran its words at 16px on a
  diagonal gradient with a 12px glow under a white label, beside an answer at
  14.72px; it is one flat accent surface, the answer's size, and a label in
  the body's own ink. Every bubble and the action row under it carried a soft
  8px shadow, three stacked in a band a few pixels tall; they lift by one
  pixel now. The Jump to latest pill's hover was a translucent tint over the
  transcript; it sits on an opaque ground. A bare URL the model writes shows
  as its site and page ("goodreads.com / … / the-page") with the full address
  as the tooltip, and a markdown link whose words are its own address gets the
  same. The dashboard's Continue pill ends in an ellipsis instead of stopping
  mid-word. The popup agent shows the writing caret while an answer streams,
  folds its tool calls under "Finished N steps" as the Chat tab does, and its
  "Opened" badges start at the left with an ellipsis instead of being cut at
  both ends.

- Exports are reachable again after the save. Every file the app saves
  (a graph image, a chat export, a download) now appears in the notifications
  with a click that opens the exports folder on the desktop or the new Recent
  exports list under Settings > Import & export in a browser tab, where each
  file has its own Download.
- The chat composer keeps the height it was dragged to. It forgot the drag
  whenever the box was empty, so a keystroke and a backspace snapped it back
  to one line; a dragged height now holds until the next drag, capped at 70%
  of the window.
- Two unused Phosphor build files (5 MB) left the repository.
- Notes with no tags are pointed out, and pointed at. A real note with no
  tags now carries a "No tags yet" chip where its tags would be, and clicking
  it opens the note for editing with the cursor in the tags field. The
  dashboard's Loose ends widget offers the filtered list beside its link
  finder, and past five untagged notes the bell says so once a week with the
  same list a click away.
- The Write with AI panel held its shape when a field was clicked. Focusing
  the instruction or tags field let the composer's own focus rule widen it to
  the column, pushing Undo and Draft it onto two more lines and the tags caret
  under its label; the rows are one line before and after focus now, and the
  draft's actions end at the column's right edge like the instruction row's.
- Dragging a card on a busy whiteboard cost a frame per pointer move. The
  alignment guides re-measured every other card on every move, forcing a
  layout each time; they measure once per drag now (7.67ms to 0.79ms per move
  on a large board).
- Middle-button panning on the whiteboard fought the browser's own
  autoscroll on Windows; the press is now the pan and nothing else.
- Settings > Packages rows keep their buttons beside the name. A long
  package name with its badges pushed Reinstall and Remove onto a second
  line (and one row onto three); the name wraps now and the buttons stay
  on its first line at every width.
- The graph's suggested-links rows have one control height: the reason
  field was 42px beside 28px buttons, so every row ran to 69px; it is 56px
  with the field at the buttons' height.
- The AI's question card chooses, then sends. An option marks itself, an
  "Or write your own answer" field sits under the options and one Send answer
  button submits; an answer typed in the chat bar folds the card away, so it
  can no longer send a second answer; a turn that ended by asking is not
  reported as having written nothing, and a reloaded thread shows what was
  asked instead of an empty bubble.
- `<br>` in an answer renders as a line break; the logs page's kebab button
  lost the fold chevron that was drawn over its dots; Shift with the arrow
  keys moves whiteboard items five grid cells (or 10px) at a time.
- Picture cards in the Library keep their thumbnails one size. Opening one
  card's text fold used to stretch every picture beside it to match the row;
  the pictures stay put and the row grows only by the fold's own bounded height.
- A table the AI writes can be taken away: Copy (for a spreadsheet),
  Markdown, CSV (saved like any export) and a Full view that lifts the table
  into a window-sized panel; code blocks gain Save beside Copy.
- The full view of a table opens above the app rather than behind its
  chrome, over a dimmed page, with its actions as one segmented control
  instead of four loose buttons; the header's icon buttons are grouped the
  same way, everyday toggles in one cluster and lock/quit in the other.
- Mind maps read better: the ring of controls around a selected topic has an
  opaque ground and an accent edge instead of grey-on-grey circles, branches
  draw at full strength with an arrowhead that takes the branch's colour, the
  text-size grip no longer sits under the node's own buttons, and the link
  tools can start and land on a topic.
- The round '?' buttons are circles again in the capture, Write with AI and
  Ask heads, a table's full view fits the panel with an "Actual size" toggle
  for the scrolling view, and every row of the boards dropdown says whether it
  is a board or a mind map.

- The lock screen could fail to appear on a slow first start. The embedding
  warm-up began importing torch the instant the server was up, and that import
  holds the interpreter for seconds on a small machine, long enough for the
  shell's status probe to time out and the app to say the server could not be
  reached. The warm-up now waits two seconds, so the first page and its probe
  go through first, and it skips an empty notebook altogether, which has
  nothing to warm a model for.
- "Uncaught ReferenceError: sizeDashWidgets is not defined" from the desktop
  window's log. The window resizes itself while the scripts are still loading,
  and the resize handler called into a file that had not arrived yet.

- The Library's picture cards, on the third report about them. The selection
  tick took the app's own surface colour, which over a photograph is a dark
  square on a dark thumbnail; it now has a near-white ground and a ring in both
  themes, because a picture is the same backdrop in both. The filename band was
  a gradient, so it vanished into a dark photograph and read as a grey strip
  across a light one; it is one flat ground of one height on every card (33.2px
  measured across nine). An open transcription could take a card to twice its
  neighbours' height and the grid gave the whole row that height; the fold
  scrolls at 11rem, so an open card measures 411px against a shut 241px.
- A picture's description could come back as a wall of the picture's own text.
  The caption prompt asked for the description "and any visible text worth
  naming", and a small vision model handed a screenshot answers the easier half
  by reading the words out. It now says not to transcribe, which is what the
  document prompt beside it already said.

- **The writing suggestions read as one feature, and the word menu stays next
  to its word.** Four surfaces (the underlines, the word menu, the panel at the
  foot, the dictionary) had grown separately: one finding was described in two
  orders, and acting on a row in the panel opened a 335px popup over the very
  sentence it was about, measured at 70% of a 1440x900 window spent on one
  misspelled word. A row now answers inside the panel (the same candidates and
  actions the menu offers, from one builder), the word it names is scrolled to
  the middle of the editor instead of just inside its bottom edge, the panel
  keeps its settled share when no row is open (14% of the window against the
  editor's 45%) and grows to 20% only while one is, and both the row and the
  menu's head draw the finding the same way: a dot in the colour of its
  underline, the words, the reason.

- **A flagged word that wraps no longer opens its menu somewhere else.** The
  menu was anchored to `getBoundingClientRect()`, which for a mark drawn as two
  fragments is the union of them: measured on a doubled "the the" at a wrap
  point, fragments at 1187..1218 and 471..497 and a union of 471..1218, so the
  menu opened 716px to the left of the words that were clicked, and a click
  anywhere in those 747px claimed the finding. Both questions are asked of
  `getClientRects()` now, so the menu opens against the fragment under the
  pointer. The menu is also clamped to the editor's own card rather than to the
  window (a word at the end of a long line had put 146px of it in the window's
  gutter, clear of the document), clamped on all four sides, and it scrolls a
  word it cannot see into view before pointing at it.

- The note edit form's formatting bar was see-through and hid behind the Notes
  sub-tab strip. Its background was a 4%-opaque tint meant to sit on a pane,
  which on a sticky strip left the note's own text showing through it, and it
  parked in the same band as the sub-tab strip, which is also sticky at the top
  of the same scroller and twenty layers above it. The tint now sits over an
  opaque base, and the bar stops below the strip: measured stuck at y=128 with
  the strip ending at 118, and nothing painted over it at any point down its
  height.

- Every note card claimed to be filed in "a space that no longer exists". The
  chip that names a note's workspace fell back to that wording whenever the
  space list had not arrived yet, and the note list renders before it does, so
  a notebook whose notes are all in the Default Space said the opposite on
  every card. It says nothing until the list lands, and the list re-renders
  when it does.

### Changed

- The graph's gravity slider moves the centring pull and the spacing between
  nodes along with the repulsion, so maximum gravity is tight rather than
  merely less loose (unchanged at the default), and a new View option,
  Length by similarity, on by default, draws a strongly related pair closer
  than a weak one (INBOX 243).
- The graph's look, kept flat to match the rest of the app: each node is
  its category colour with a ring in the card colour so it reads clear of
  the links, every node carries a soft glow (wider on hubs; the earlier
  highlight dot is gone), the halo ring and the accent ring on hubs are
  gone, links are thinner and fainter, and a faint wash of each cluster's
  colour sits behind it so the shape of the notebook reads before a single
  label does. Nodes are drawn from cached sprites, so a large map costs no
  more than before. Two new View options: Curved links and Cluster glow.
- **The graph's touch gestures and its world constant are measured, not
  assumed.** `scratchpad/ui-sweeps/graphtouch.js` drives a real touch context:
  a 96x48 one-finger drag moves the camera 107.3px and a pinch from 80px to
  280px between the fingers scales the map 3.5x, at 390 and at 1440, with the
  page not scrolling sideways at either. `gcWorldFor`'s comment claimed the
  1.6-to-1.25 change was neutral at 35 and 300 notes; it is neutral at 35 at
  both widths, and at 300 only on a desktop, where the viewport floor is 2531
  against a phone's 1168. The comment now says which.

- **Turning "Mind maps" off on the graph now takes them off the map.** The
  switch is called Boards, it covers whiteboards as well, and off means the
  board is not a node at all rather than a node that stops saying it is one:
  measured, five boards drawn as ordinary notes with the switch off before,
  none after, four typed `map` with it on.

- **The canvas graph's forty module globals are one surface object.** The
  renderer kept its node array, camera, worker, hover and selection in
  module-level `let`s, which is exactly right for one canvas and impossible
  for two. Every drawing function now takes the surface it is working on
  (`s = gcTab` by default, so every existing caller and sweep reads as it
  did), and `size: "full" | "pane"` says whether it owns the Graph tab's
  chrome. Behaviour-neutral: `graph.js`, `graph4.js`, `graph4b.js`,
  `graphhover.js`, `graphminimap.js` and `graphcold.js` measured before and
  after on one fixture, same node counts, camera, canvas size, hover and
  minimap.

- **The Timeline is a feed.** It was two views and a popup: a grid of one
  column per bucket (8,800px wide against a 1,358px viewport, 79% of its cells
  empty) and an SVG line chart with 14 text nodes for 48 notes, no titles and
  no keyboard stops. It is now one vertical feed, newest first, with a sticky
  header per day, week, month or year, a row per note carrying its title,
  snippet, category, tags and time, and a note that opens where it sits
  instead of in a hand-placed popup. Rows are reachable by keyboard (arrows
  move, Enter opens), the find box filters the rows rather than dimming them,
  the bucket picker gained an "Auto" default that follows how much is in
  range, and changing the bucket costs no request. Measured at 1440, 1024 and
  390: 0 horizontal scroll (was 7,663px), 48 of 48 rows with a readable title
  (was 0), sticky headers pinned at 0px from the top of the feed.

- **The Timeline is no longer capped at 1,500 notes, and has a density strip.**
  It drew up to 1,500 rows and simply stopped, with nothing on screen to say
  the rest of the notebook was missing. It pages now: 300 rows at a time,
  fetched as you reach the end of the last page, so a notebook of any size
  scrolls through. Beside the feed is a strip showing how much you wrote across
  the whole range, with a marker for where you are; click or drag it to jump.
  It appears once a range holds 200 notes, below which it is a row of identical
  marks. Measured on a 2,048-note notebook over three years: no frame longer
  than 50ms while paging, and no horizontal scrollbar at any point.

- **The Timeline has a table view.** The same notes with every column at once:
  date, title, kind, category, space, tags, words and links, each sortable from
  its own column label, with a sticky head and two columns on a phone. Ticking
  rows drives the Notes list's own Move, Tag and Delete, over the same
  selection and with the same undo. `/timeline` now returns a note's space,
  word count and link count for those columns. Switching between the feed and
  the table is a repaint: it reloads nothing.

### Added

- The README's tour is thirteen screenshots of the current interface, up from
  eight of an older one. Five surfaces it never showed are in it now: a
  whiteboard board, a concept map, the Tools and features browser, the command
  palette and the Appearance panel. `tests/test_readme_freshness.py` fails on a
  README image with no file behind it, and on a capture the README shows
  nowhere.

- Both catalogues know about the app as it is now. "Tools and features" had 48
  rows and the command palette 44, and between them they never mentioned
  documents, boards, concept maps, the Library's sub-tabs, the timeline, the
  page reader's neighbours, resurfacing, the spelling dictionary, workspaces or
  seven of the settings sections. The browser now lists 110 rows in nine
  groups and the palette 57 commands, and `tests/test_feature_catalog.py`
  fails the build when a row names a tab, a section, an element id or a
  function that does not exist.

- The chat composer's attach picker shows the picture. Its Images tab was five
  checkboxes beside five generated filenames, which is not a list you can
  choose from: reported as "images just show as their names but the user might
  not be able to tell what those images are from their names". Every image row
  now carries a thumbnail and the image's caption, or, for a picture with no
  caption, the note it is used in. The "captioned" badge is gone, the caption
  it announced is on the row instead.

- The page reader has a way in that does not start from a file. It was
  reachable only from a file you had already found (a Files row, an image
  card's menu, or the lightbox), so "I want to read something" had no answer.
  It is in the command palette and in Tools & features now, and opens on what
  you were last reading, else your newest PDF or picture, else the Files
  sub-tab with a line saying there is nothing to read yet.

- Documents: a paragraph can be linked to. "Link to this block" in the "/"
  menu gives the paragraph the caret is in a short id and copies
  `[[Document title#^the-id]]`, which resolves from a note, a map node, a chat
  or another document and opens the document at that paragraph rather than at
  the top. `![[Document title#^the-id]]` embeds the paragraph itself, quoted,
  with a line saying where it came from, in both the writing pane and the
  reading one. The id is scaffolding, so it is hidden while you write (and
  comes back when the caret is on its line) and never appears in the reading
  pane or the printed PDF.

- Boards and board images come back a page at a time. Both lists grew with
  the notebook and handed back all of it in one response, and a board row
  carries a preview, so the response grew with every board anyone drew. Each
  takes a page size and an offset now and says how many there are in total,
  and every surface that needs the whole list (the boards gallery, the board
  picker, the command palette, the dashboard widget) reads to the end. Building
  a board's preview is a query per board, and that now happens for the page
  rather than for every board in the notebook.

- Five invisible animations stopped running. The app builds six copies of its
  generated emblem at startup and five of them sit inside a panel you are not
  looking at, each redrawing 24 times a second for a canvas with no size on
  screen: measured on an idle board, six canvases alive, one visible, and five
  animation frames asked for per frame drawn. Each one now pauses while it is
  off screen and turns again the moment it is shown, so the mark is never
  static where you can see it and never drawn where you cannot.

- Mind map: a radial map no longer overlaps itself once it is bigger than one
  turn of the circle. Thirty nodes in the radial layout put six pairs of
  topics on top of each other, the worst by 38 by 28 board units, because the
  layout normalised the whole map onto one turn however much room its nodes
  needed. The rings widen instead, so every node keeps the arc it occupies;
  small maps are laid out exactly as before. Root placement on open and the
  edges that follow a drag are measured now as well: no overlap with the top
  bar, and edge ends that stay on their two nodes through a leaf drag, a whole
  branch drag and a multi-selected drag.

- Whiteboard: export is a dialog, the selection handles are one recipe, and
  the highlighter behaves like one. Export was a list of every scope and
  format pair that ran off the bottom of the window; it is two rows of
  segments and one Export button now. A note, a shape, an image and a text box
  all show the same eight handles, the same rotate grip on a stem and the same
  1px selection box, where a drawn shape used to show a dashed outline of
  itself and no box at all. The highlighter multiplies, so two crossing
  strokes read as two passes of one pen, and its nib is a nib (12 to 24px)
  rather than four times whatever the pen slider said; Shift draws a straight
  run.

- Whiteboard: one context bar where the floating selection pill and the
  properties drawer used to be two. It appears above whatever is selected and
  shows only that kind's controls, so a line offers its ends and a text box
  does not, and the caps it shows are read from the object rather than from
  the tool's own default. The long tail (copy style, the box's background,
  guide colours, extract notes, export) is behind one "..." menu, and the
  drawer that used to hold 13.5rem of every board open, and more than half of
  a phone, is gone.

- Documents: tables you edit rather than type. `/table`, Tab between cells,
  a cell menu for rows, columns and alignment, and the table drawn as a real
  grid in Live. The markdown underneath is the markdown you wrote, to the
  byte: every command edits the smallest span it can, so a hand-aligned table
  keeps its alignment and a cell holding an escaped pipe keeps its pipe.
- Documents: callouts written `> [!note]-` fold away and open again on their
  own label, footnotes render as the raised number they are and go to their
  text when clicked, `$x^2$` renders as math through a MathML renderer in the
  app itself rather than a library, and each heading in the outline carries
  how many of its section's tasks are done.
- Documents: `![[a note]]`, `![[a map]]` and `![[a file]]` draw the thing
  inline, through the same note card, map preview and file tile the rest of
  the app already uses.

- Whiteboard: the arrange tools answer all three of their questions. Space
  evenly now leaves equal gaps rather than equal centres, which is the same
  thing only when every item is the same size and is not what a row of mixed
  cards needs; and "same width" and "same height" exist at all, giving every
  selected item the largest one's size while it keeps its own corner.

- The whiteboard's tool rail says which key holds each tool, and shows the
  ink it will draw with. Every tool now names its key in its tooltip (the
  sticky note is N, the two connectors are C and Shift+C, the image is I),
  each of those keys picks that tool, and a swatch at the end of the rail
  shows the pen's colour and opens the picker without having to open the
  properties drawer to find out what colour is loaded. The board overview
  moved from N to Shift+N, which is the letter it had taken from the sticky.

- Three notes a day that are slipping out of reach. A note you wrote months
  ago, linked to nothing and never opened since, is the one thing a notebook
  can give you that a pile of files cannot, and until now nothing in the app
  ever brought one back. The score is computed from three facts you can
  check (its age, its links, how often you have opened it) rather than a
  model's opinion, the day's three are the same all day and different
  tomorrow, a notebook under ten notes gets nothing rather than the same
  three for ever, and "never again" is permanent.

- A link suggestion you dismiss stays dismissed, and a search remembers
  which result you opened. The dismissal used to live in the browser and die
  with the tab, so the same pair came back; and asking a question a second
  time returned the same order, including the order that was wrong enough
  that you scrolled past the first result. Both are reorders of what the
  search already found, never additions, so one click can never change what
  the notebook appears to contain.

- The notebook keeps what it has been corrected about, in one place. Moving
  a note out of the category the AI chose, dismissing a suggested link,
  opening a result after a question, or sending a resurfacing card away are
  all recorded as corrections, and what a pile of the same correction adds
  up to is a bounded weight that halves every thirty days, so a rule you
  stop reasserting fades rather than becoming permanent.

- Save a copy of a file from the Library. The Files rows' menu now hands you
  the original file back, which nothing in the Library could do before.

- A skill step that has to go through every note now goes through every note.
  A step that reads a page at a time keeps reading until there are no pages
  left, instead of stopping after the first one and ticking itself off. The
  run says which page it is on and how many notes it has read as it goes, and
  if there is more than one step can reach, it says that too rather than
  reporting part of your notebook as all of it.

- A skill run now has a budget: how many tokens and how many seconds it may
  spend, in Settings -> Tools, 20,000 and 90 seconds to begin with. A run that
  reaches it stops between steps, says which limit it hit, and still shows
  what it changed with a way to put it back. Set either to 0 for no limit.

- A skill can say how to check its own work. When it finishes, the app reads
  the answer back out of your notebook itself and shows a line saying whether
  it holds, rather than taking the AI's word for it. "Find loose ends" uses
  it to prove it changed nothing.

- The AI learns where you actually file things. When you move a note the AI
  filed by itself, that move is remembered, and the next few times it decides
  where something belongs in that category it is shown what you corrected.

- A board keeps a history too. Moving a card, rewriting a text box, deleting
  a branch, creating, duplicating, generating or importing a board: each one
  is recorded with who did it and what it looked like before, so a board's
  parts can be rebuilt from their own history the way a note already could.

- A board the AI builds is recorded the same way as one you build by hand.
  Cards it places, links it draws, maps it creates and the nodes it adds all
  keep what they looked like, so a whole board the AI made can be rebuilt
  from its own history. Before this the log said a card had been placed and
  could not say where.

- One search across the whole notebook. Notes, boards, documents, the text
  read out of files, bookmarks and reminders are in one index, so a word you
  wrote in a document is found by the same search that finds it in a note.

- Every result says why it is a result: matched your words, matched the
  title, matched a tag, similar meaning, or linked to the note you have
  open. The Notes list shows it as a line under the note, with the three
  scores behind the tooltip.

- Search operators everywhere they are typed: `tag:`, `kind:`, `in:` (or
  `space:`), `before:` and `after:`, `has:`, `is:`, `"quoted phrases"` and
  `-excluded`. They need no AI and no model running.

- `GET /search` and `GET /search/stats` for anything that wants the same
  answers the app's own search box gets.

### Changed

- The Library's saved links are list rows rather than a table of raw addresses.
  Asked for directly: "is there a wya to redesign the links cards/rows in the
  links library subtab to make them look nicer and more modern??" Measured at
  1440 on eight seeded links: every row drew its own permanent outline, rows
  came in two heights (67.2px, or 89.2px once a link had a group), and each
  held six controls and five type sizes, with an underlined blue title over the
  whole address. Now one row height at every width, on the app's own list-row
  tokens: a mark, the title, and one line of facts (the site, the group, the
  note) in the same shape a Files row uses, with the ground arriving under the
  pointer instead of an edge drawn around every row. Two controls on a row at
  rest, pin and the '...' menu, where Edit, Move to group, Delete and a new
  Copy link live.

- The bottom of a Library picture card is two ranks instead of four. Reported a
  third time: "redesign the bottom text area of the image cards in the library
  images subtab again", with the block reading as four unrelated rows of
  different weights and the cards looking uneven. Measured at 1440: three rows
  under the picture at three type sizes two pixels apart (13.6 / 12 / 11.2),
  and a foot that ran 9.6px to 115.5px across one row of six cards. The count
  and the "text in this image" fold share one line of facts now, the way a
  Files row already puts its own facts on one; the description and the picture's
  name share one size and the facts line is the only other one; and the
  description holds its second line open, so every card that has anything to
  say is the same height inside and its photograph is the same size. Six cards
  at 1440: feet 54.1/95.7/95.7/10.6 by what the card holds, against six
  different feet before, pictures 144px on every card with a caption and a
  fact, 0px of dead space under any card, and contrast 7.48 / 7.53 / 6.56 in
  light and 6.47 / 6.44 / 5.06 in dark.

- Settings → Logs has the same head as every other surface in the app. It was
  two rows of nine controls at four heights (a view segment, two pickers, a
  filter box, a Follow switch, a live pill and three verbs), none of it on the
  dock grammar the tab heads use: reported as "redesign the top dock at the top
  of the settings logs page to be more consistent with the rest of the
  application and modern". One row now, at one height, at every width: the
  title and the live pill, the filter, list or terminal as two icons, and
  Support bundle as the one filled action, with Follow, Copy all, Clear and the
  two pickers in the '...' menu beside it. Three fixes came out of it that were
  not about this screen: an enhanced select in any dock had no width floor (the
  floor had been sizing the hidden native element behind it), a view segment
  folded into a dock menu at narrow widths drew its cells 108px tall instead of
  28px, and the Support bundle button dropped its own icon the first time
  anybody built a bundle.

- The meeting recorder holds its controls the way the rest of the app does.
  Three sentences of explanation stood between the title and the one button the
  dialog is for, and are now one line with the rest behind the app's own '?'.
  The Record button, the clock and the wave that moves while you talk were
  three loose siblings of the card, so the clock read as a stray number and the
  wave pushed the transcript 5rem down the moment recording started: they are
  one panel now, on the same inner corner the sketch pad's bars take. The four
  buttons under the transcript were 40px and 42px in the same row, and Discard
  sat one slip away from Save; they are one height now, with Discard at the far
  end.

- The popup agent looks like the rest of the app. The Ctrl+Shift+A surface had
  no title and no visible way out (Escape and a click on the backdrop both
  worked, and neither is something you can see), its four example prompts wrapped
  three-then-one, its content was inset 8px further left than every other dialog
  in the app, and its two internal hairlines were drawn in two different weights.
  It now opens with the same head every panel here has, the examples sit in two
  columns that are the same shape at every width, and the insets and the rules
  are the card's own.

- The quick sketch pad's controls are grouped and named. The toolbar was one
  pill holding four runs of unequal density: twelve controls at five heights
  across five rows at 1440 and at 1024, with the pen, highlighter and eraser
  wrapping to a second line inside their own box and the paper colour pushed
  under the undo run. It is six labelled sections now, Draw, Shapes, Ink,
  Size, Edit and Paper, separated by the app's own hairline, one row at both
  widths, every button on the control height, and the width slider has a name
  and shows the number it is set to. The bar under the canvas is the toolbar's
  surface upside down, so the toolbar, the canvas and the caption row share
  one inset and one corner instead of three. Reported once more after that
  first pass and fixed with it: the bar wrapped on any machine set to Large
  text or Spacious density, because the card is capped in pixels while
  everything in it is sized in rem. The controls sit on the app's hit-target
  size now, undo, redo, clear, the picture and the paper colour are one Canvas
  group rather than two, and the groups share out whatever width is left, so
  the bar is one row at 1440 and 1024 on every combination of those settings
  and has nothing empty at either end.

- Your documents, reminders and pictures arrive a page at a time. All three
  lists used to hand back every row on every call: 300 documents measured
  116.7 KB in one response, 300 reminders 52.5 KB, 300 pictures 117.6 KB,
  with nothing to stop them growing with the table. Each list now sends at
  most two hundred rows and says how many there really are, and the screens
  that need all of them (the Documents tab, the Library's documents and
  images, the editor's insert menus) ask for the next page until they have
  everything. Nothing you could reach before is out of reach: what is bounded
  is the size of one answer, not the size of your notebook.

- The bottom of a picture card in the Library is a caption again, not a form.
  A card carries its description, clamped to two lines so a long one cannot
  push the cards beside it out of line, and under it only what that picture
  actually has: how many places use it, and a fold for the text found in it
  where there is any. Where the picture is used, opening it full size, copying
  the markdown that puts it in a note, and every note, document and board it
  appears in are rows of the card's menu. A card in a row of six stood 321.1px
  whatever it held, with 54.5px of nothing under the emptiest one; it is
  261.5px now, the bottoms line up, and the slack goes to the photograph.

- The Documents sidebar was redesigned, both of its tabs. The outline now
  takes the height the column has instead of a fixed 224px window that hid 13
  of a 21-heading document's entries, it marks the heading you are reading as
  you scroll and keeps that row in view, and its levels are told apart by
  weight, colour and a guide line rather than by a fraction of a millimetre of
  type. An empty References no longer reserves a heading and a full-width
  button over nothing. In the Documents tab every row draws the same shape
  rather than only the open one, every row is one height, and each says what
  kind of file it is.

- The history of a note no longer keeps a copy of its whole text for ever.
  Changes older than ninety days keep the record of what happened and who
  did it, and let go of the text, apart from the five most recent changes to
  anything, which are always kept. On a notebook of 150 notes edited 40
  times each this took the history from 9.9 MB to 1.5 MB, and the file
  itself from 13.5 MB to 3.0 MB. Putting a note back the way it was still
  works for everything inside the window, and a change whose text is no
  longer kept says so rather than looking empty.

- Opening a note's history is no longer slower the more the notebook has
  been used: it is served from an index rather than by reading the whole
  log. Measured on 60,000 recorded changes, 6.390 ms became 0.082 ms.

- Opening the history of a much edited note is faster again: each page is
  built from its own page rather than from the whole of that note's log.
  Measured on a note with 4,000 recorded changes, the first page went from
  109 ms to 36 ms and an older page from 104 ms to 3 ms.

- The activity feed no longer reports a summarised change as having rewritten
  every field at once. A change whose text has been let go says so, and the
  summary standing in for a run of old changes says how many it covers.

- Finding notes similar to the one you are reading no longer reads every
  stored vector for every note opened. They are held in one array, built
  once when the embedding model finishes loading and kept up to date by
  each save: measured on 5,000 notes on the development sandbox, 18ms a
  call became under a millisecond.

- Every change to a note is recorded as one event, with who made it and the
  whole value of each field it set: a person, a named AI tool, or a named
  background job. A note's History sheet lists them, any point in it can be
  restored, and restoring is itself undoable.

- A note's history can be replayed: the note is rebuilt from its own events
  rather than from a copy, so what the sheet offers to restore is what the
  note actually was at that moment.

- `GET /events?since=` reads the log forwards from a cursor, for anything
  that needs to follow what happens in the notebook.

- Emptying the recycle bin, or deleting several notes for good, records one
  event carrying the list of ids rather than one per note.

- A mind map has its own controls now, not the whiteboard's. Selecting a
  topic puts a strip above it with bold, italic, four text sizes, alignment,
  colour and a link, in the place the board's own selection bar would take;
  right-clicking a topic opens a ring of eight branch actions around it (add
  a branch, add one beside it, fold, lay the branch out again, copy it, label
  the line into it, cut it free, back to the branch), with Alt turning the
  two add slots into the two remove slots; and right-clicking a line opens
  the same ring on the line (turn it around, label it, curve, elbow,
  straight, dash, colour, cut).

- A topic can carry an icon and point at a page, a line can say what it
  means, and both are stored with the map.

- The middle of every line has a `+` that puts a topic between the two it
  joins, and a topic's own corner drags its text size between 10 and 44px.

- Dragging a topic takes its branch with it, and dropping it on another topic
  moves the branch there, with the topic you are aiming at outlined. Ctrl
  held moves the topic alone and lets its children up to its old parent.

- A folded branch's count is a button: clicking the number opens the branch
  again, and the map menu has "Open every folded branch".

- `C` folds and unfolds the selected branch on a map. Space stays the
  canvas pan, and works on a fold control itself when that has the focus.

- A topic can be drawn as a rounded card, a pill, a box, or as plain text on
  the line with no card at all, from the strip above it. The shape is kept in
  the map's exports.

- Exporting a map keeps how it looks. Weight, slant, text size, alignment,
  icon, link, colour, and a line's label, shape and dash are written into the
  FreeMind `.mm` and OPML files and read back when one is imported, each in
  the place that format really has for it. A Markdown outline is still plain
  text on purpose.

- The dashboard's Rediscover widget now shows the three notes slipping out
  of reach rather than a random one: oldest, least linked, least opened, with
  the reason on each card ("120 days old, no links, never opened") and a
  "Never again" the notebook remembers. Under ten notes it still shuffles,
  because the three most faded out of five notes are the same three for ever.
  Notes has a matching "Forgotten first" sort.

### Fixed

- The Ask sub-tab's answer head no longer wraps. The "AI answer" label, the
  model badge and the Retry / Copy / read-aloud buttons were four items
  competing for one width with no rule about which of them gives way: measured
  at 1440, 1024 and 820 the actions always sat a line below the label, and with
  a real long model id the head grew to 91.6px around a 21.2px line of text. It
  is one 36px row at all three widths now, whatever answered the question: the
  badge is the only zone that shrinks, it carries the model id alone with
  "answered by ..." on its tooltip, and the three actions became an all-icon
  group on the app's own control height.

- Opening the page reader from a PDF in the lightbox closes the lightbox. The
  reader opened underneath it (`.lightbox` is z-index 1020, the reader is a
  modal at 1010), so every click landed on the lightbox's dismiss backdrop and
  the reader could not be reached until the lightbox was closed by hand.

- Searching for a percent sign found every note in the notebook. `%` and `_`
  are wildcards in the query the search builds, and nothing in the search box
  said so, so `100%` matched every row and `a_b` matched `axb`. Thirteen
  searches across notes, documents, chats, tags and wiki links now escape
  what you typed, and the test greps every one of them so a new search cannot
  quietly reintroduce it.

- On a phone, the whole application slid 7px sideways under your finger, on
  every tab: the header asked for 410px of a 390px screen. It fits now, and
  on a 360 or a 320 the decorative mark steps aside for the controls. The
  dashboard's "Edit layout" button, which had been half off the right edge
  and only reachable because of that slide, takes a row of its own.

- Touch targets below 44px in thirteen places nobody had measured: both
  sub-tab strips, the dashboard's quick links and stat tiles, and nine of the
  settings sheet's twenty controls. The sweep that checks this covered three
  surfaces out of sixteen and now covers all of them.

- The changelog was the one part of the app that answered a request from
  somebody who had not unlocked the notebook. Every route is now walked by a
  test that asks each one, without a token, whether it says no.

- An update whose download link pointed anywhere but this app's own releases
  is refused before anything is downloaded. The installer is downloaded and
  run silently, so where it comes from is worth checking.

- A note now has the same length limit a document has. The same paste was
  accepted in one box and refused in the other, and the accepted one took
  over two seconds. A tag is trimmed to a label's length instead of being
  stored at whatever length it arrived, and a note is never lost because one
  of its tags was too long.

- A saved link attached to a note or a document can be deleted again.
  Attaching it was what made it permanent: the delete failed and left it in
  the list.

- A note with a saved link, a recognised person or a resurfacing score on
  it can be deleted for good again. Emptying the bin, or destroying one such
  note, failed outright and left it where it was.

- A document with a note attached to it can be deleted again. It could not
  be deleted at all: the delete failed on a database constraint and left the
  document in place, so the feature that joins notes and documents together
  was what made a document permanent.

- Saving two notes at the same moment can no longer lose one. If both
  needed a category that did not exist yet, one of them failed outright on
  a database constraint. Measured with six writers saving twelve notes each:
  5 of 72 saves died before, none after. The app really does have several
  writers, since the desktop window, a browser tab and the overnight filing
  all save notes.

- Nine lists that stopped at the first page now read to the end: the
  Reminders tab and its dashboard widgets, the command palette's reminder
  search, both "file this note under a document" pickers, the note picker's
  document, file and image sources, and the lookup that resolves a pasted
  image back to its library row. Reminders are ordered soonest first, so a
  first page of old ticked-off ones could have hidden everything upcoming.

- Asking the AI about your reminders no longer hands it every reminder you
  have. Everything a tool returns is spent from the model's context window,
  so a long list left no room to reason about it; it now returns a page and
  says how many there are in total.

- On a phone, the Documents editor's "Ask AI" button was entirely off the
  side of the screen and the whole column scrolled sideways. A rule meant
  for card heads told the dock's action row never to shrink, so it
  overflowed instead of wrapping.

- The line numbers go away with the box they number. Turning on line numbers
  and then pressing Preview, in the capture box or in a note's edit form, left
  the numbers column behind as a small tinted box floating above the rendered
  panel, because the column is the writing box's neighbour rather than part of
  it and nothing hid the pair together.

- A dropdown that opens above its button no longer floats away from it. A menu
  taller than the room under its opener was measured at the height it wanted,
  placed by that height, and then drawn shorter by the stylesheet's own limit,
  so the gap between the two was the difference: on a notebook with nine
  categories, the capture form's "File under" list opened 127px above the
  button it belongs to. It now shows all of itself, ending 4px above its
  opener.

- The Ask tab's two rows of suggestions stop repeating each other. "Try
  asking" is generated from your own categories and "Ask again" is what you
  have actually asked, and neither knew about the other, so a suggestion you
  clicked once appeared in both rows from then on. What you have asked wins,
  and the generated row fills the gap with its next suggestion.

- Write with AI is two of the same column. The two writing boxes were
  different heights for no reason, the left column ended with an empty strip
  under it while the draft beside it ran on, the revision instruction sat
  between two buttons that do not read it, and the row under the draft mixed
  a text field into a line of three buttons of three different weights. Both
  columns are now a label, a box, one optional field and one line of actions,
  and the boxes are the same size and end on the same line.

- Every control on the Capture form is one of two heights, and the Ask card's
  blocks sit on one step rather than four.

- A generated or imported mind map replays with its nodes on it. Both
  routes recorded one event for the whole board whose payload held a node
  count rather than the nodes, so rebuilding one from its history gave an
  empty board while every hand-placed object rebuilt correctly.

- Five database indexes that were missing, including both columns of the
  link table. A note's connections, the notes list's bulk link fetch, the
  graph build and search's two-hop walk all read `entry_links` by source or
  target, and neither column was indexed, so each read walked the whole
  table; a board's objects were read the same way. Every list query the app
  issues is now served by an index, with no whole-table sort left.

- A mind map's ring of controls no longer covers the topic it belongs to. It
  was a circle drawn around the topic's centre, so on any topic wider than the
  ring was round two of its eight buttons sat on the topic's own words: the
  ring is now pushed clear of the topic's box, the edit strip above it stands
  off the ring rather than the topic, and the topic's two hover buttons, which
  the ring already offers, stand down while it is open.

- The whiteboard and mind map View menu uses the whole window again. It was
  measured with the stylesheet's own height limit still applied, so it was
  placed lower than it needed to be and then cut to the room left under that
  line: on a 760px-tall window it now shows all of itself where it used to
  scroll, and on shorter windows it shows about 48px more of itself.

- The "new from a template" dialog reads as a list of choices rather than six
  outlined boxes, and its Cancel sits at the right with every other dialog's
  actions. Ten dialogs had been asking for that alignment in their markup
  against a rule that did not exist.

- The note composer's formatting strip, and the one in a note's edit form, are
  the composer's own tighter strip again in both toolbar layouts. The single
  row layout was handing them the document editor's full-page padding, and the
  edit form's strip, which is meant to wrap rather than scroll, was drawing a
  third of its buttons outside its own box.

- The agent activity panel fits its runs. A run's "Step 2 of 3" was breaking
  across two lines beside its progress bar, which made every row a third
  taller and pushed a third run out of sight; the panel also honours "reduce
  motion" now.

- The notes list reads the attachments table once per page instead of once
  per note. Counted on a 60-note page: 67 database statements, 60 of them
  the same attachments query, and 8 after. It is the most-requested
  endpoint in the app.

- The launcher's progress now finishes. Five steps were reported and only
  four were ever ticked, because the last one belongs to the app's own
  window and nothing was marking it done, so the bar stopped short of the
  end of its track every launch and then the app appeared.

- The cursor on a whiteboard or a mind map follows the tool you are holding.
  Hovering a topic with the delete tool showed the open hand that means
  "drag this", which promised the opposite of what the click would do; every
  tool that acts on a point now keeps its own cursor over the things on the
  board. The fill, sticky note and text box tools had no cursor of their own
  at all and showed the hand over the empty canvas too.

- The board picker in the whiteboard's top bar now says which of your boards
  are mind maps and which are whiteboards, the way the board cards already
  do. Before, both kinds read as "Name (N items)" with nothing to tell them
  apart.

- A file row in the Library is a third shorter and says what matters first:
  the name, then one line carrying what the file is, whether it has been
  read and where it is used, then its description. It was five stacked
  blocks each holding one short phrase.

- The tree, radial and arc graph views no longer come out as a scatter of
  crossing links. Switching to one of them while the force layout was still
  settling let a position update from the old layout land after the new one
  had been drawn, overwriting most of it; switching at a quieter moment was
  fine, which is why it came and went.

- Clicking a note on the graph opens its panel in every view, not only the
  force one. The other three views have no drag (their shape is the meaning,
  so a note cannot be pulled out of it), and the click had been riding on the
  drag.

- Trace, started from a note's panel on the graph, finds the note. It always
  answered "that note isn't on the map right now" with the note plainly on the
  map. Picking two notes by clicking them on the map was never affected.

- Panning and zooming the graph does less work per pointer event: the minimap
  moves its viewport rectangle instead of redrawing every dot, and it does it
  once per frame rather than once per event. Measured over a forty-move pan,
  202 document lookups and 40 full minimap repaints before, 0 and 0 after.

- The "related elsewhere" panel a chat answer shows when no note answered
  costs three database scans instead of eighteen. It ran three queries per
  word of the question, each an unindexable `ILIKE '%word%'` over the two
  widest text columns in the schema; measured on 2,000 documents, 2,000
  saved chats and 2,000 reminders, 145.3 ms before and 118.8 ms after, and
  109.8 to 85.3 ms for a question that matches nothing.

- The collapsed sidebar rail's expand button is centred in the rail. It was
  6px from the inside of the left border and 4px from the right, because
  the centring arithmetic halved the rail's 48px column while the button is
  laid out in the rail's 46px padding box; two zero insets and auto margins
  replace the number. Every "?" in Settings now stands at the end of its
  heading row, in one column with the marks on the switch rows, instead of
  hugging headings of four different lengths at four different positions.

- The spell checker knows English again on a Windows checkout. Every one of
  the 92,972 dictionary entries was arriving with a trailing carriage return,
  so none of them matched and an ordinary document came back with a
  suggestion for nearly every word in it. The loader trims each entry, and
  `.gitattributes` now pins line endings so the checkout cannot do it again.

- Tonal buttons no longer wear a panel's shadow. In dark mode every one of
  them painted `rgba(0, 0, 0, 0.35)`, because that shadow token is seven
  times heavier in dark (it has to be, over a near-black page) and was sized
  for a panel rather than a 28px control, so a toolbar came out as a row of
  dark rims. The hairline edge stays, which is what makes a tonal button read
  as pressable.

- The history sheet no longer shows a note's newest fifty changes as though
  they were all of them. It says how many it is showing and offers to load
  the older ones.

- Deleting a card no longer fails on a board that holds a drawing saved in
  an older shape.

- A ring of actions opened on a topic near the edge of the window no longer
  loses the slots that fall past the edge, or puts them under the top bar.
  The whole ring slides back inside the canvas and keeps its shape.

- The strip above a selected topic no longer stands out of the window on a
  phone: it wraps to two rows when the canvas is narrower than it is.

- A right-click on a mind map topic, or on an idle text box, opened nothing
  at all. The guard that protects a text box's own native menu while you are
  typing in it matched every box that was *not* being typed in as well.

- A trunk can carry its own colour. The picker refused it on the grounds that
  a colour paints the line into a node and a trunk has none, which is true of
  the line and false of the card the colour was already painting.

- Clicking a control on a mind map topic no longer saves the topic
  underneath it. A click is a drag that never moved, and the board saved the
  object on every one of them: a click on a fold chevron sent two conflicting
  writes to the same row in one go, so a branch folded on screen and came
  back unfolded.

- Panning a board or a map writes the canvas layers in the event that moved
  them rather than a frame later. The per-frame work (the grid, the overview,
  the selection bar) is still done once a frame, which is what that deferral
  was for.


- The view toggles are one size again. The same two-button icon switch drew
  its icons at 15.64px on Notes and 14.72px on Library, the Timeline and
  Reminders, because the segmented control set no label size at all and each
  strip inherited whatever was around it. Every choice control is now on the
  one control-label size; the sub-tab strips, which are navigation rather
  than a control, keep theirs.

- The Boards & maps dashboard widget shows a board, not a box in a box. Its
  thumbnail was a 40.5px square drawing its own border and fill, with the board
  letterboxed inside it at the board's real shape: 7.6px of empty band above
  and below, inside a second border, and 59% of the box was the picture. It is
  the same 72 by 40 the Library's own board rows use now, with one frame and
  85%. A board's item count also stopped calling its text boxes "images".

- The one square tab in the app is round. Swept every visible element's corner
  radius on all ten tabs: the main strip was never square, and the only
  tab-like control computing 0px was the Documents sidebar's, whose hover
  painted a hard-edged grey rectangle clamped to the word next to a rounded
  collapse toggle.

- The chat composer no longer opens wearing a focus ring. Reported as a panel
  shadow; it was the dock's own accent ring, lit by the focus the app puts in
  the composer so you can arrive typing. The caret still lands there, the ring
  waits until the focus is yours.

- Dark mode answers the Appearance sliders. Measured at 5% and 40%: the
  shadow-strength slider moved every shadow in light and none in dark, the
  sheen slider the same, and the small-raised shadow had no dark value at all,
  so it was a blue-violet ink on a near-black page. Default appearance is
  unchanged; the controls now reach both modes.

- A dropdown is as tall as the room under it. The whiteboard's View and Arrange
  menus were capped against their button's bottom while having already been
  moved higher up the window, so at 1440x700 the View menu scrolled 594px of
  content through a 505px port with 89px of window to spare. Nothing is clipped
  and nothing is short at 900, 700 or 600.

- Ctrl+S reaches the code written for it. A shortcut binding on the same keys
  answered first, so with Settings open it saved the note composer behind the
  modal instead. It now presses the visible section's Save button, or rings the
  nav button for a section that saves as you change it, and the ring is drawn
  on top of the control's own shadow rather than replacing it for its duration.

- The dashboard's Continue pill shows the note again. It is twice the width of
  its neighbours so it can carry the note's first line, and a later rule had
  hidden that line: 68.7px of the word "Continue" centred in a 535px pill.

- "Describe with AI" is asked for a description rather than a transcription.
  Handed two thousand characters of a document and told to describe it, a
  small local model very often gave back the opening of that document,
  lightly reworded. The prompt now rules that out in as many words and asks
  what the file contains, not only what it is about.

- The spelling menu's suggestions read as words again. Every candidate drew
  the same check mark, so five suggestions looked like five identical
  commands and the eye had nothing to tell them apart by except the text it
  was meant to be comparing. The candidates are now bare, with the first in
  bold, and the check mark is kept for the panel's own apply button.

- The Graph's toolbar fits on one row again at laptop widths. Its three zones
  wanted nine pixels more than the row had at 1024, so the whole actions
  group, including the tab's primary action, dropped to a second line with
  667px of empty space beside it. The "Concept maps" link keeps its icon and
  gives up its label below 1200, which buys back 111px.

- A note reference in an answer now says which note it opens. Reported: an
  answer described a bubble tea note, called it "note #68", and the link
  opened a Shakespeare parody. The link was never pointing at the wrong
  place; the model had written an id belonging to a different note, and the
  app repeated it as a citation without saying so. The note's own first line
  is now shown beside the reference, so a mismatch is visible in the sentence
  rather than one click later.

- The Dashboard shows something on a phone. Its "Start something" tiles were
  a one-column grid at 390px (two columns needed 370px of the 364px
  available, so the layout fell back to one by six pixels), which made a
  323px tower and pushed the first widget to y=870 on an 844px screen:
  nothing on the page was above the fold. The tiles now scroll sideways like
  the row beneath them, and the first widget starts at y=624.

- The AI edit history and document history dialogs open centred. They were
  1440px wide against the left edge of the window, because the page-column
  rules reach any direct child of a page and a dialog written there took the
  column's width and margins instead of the centring every other dialog gets.
  Reported three times.

- Pressing a button that centres itself no longer makes it jump. The chat's
  jump-to-latest pill moved 68px to the right for as long as the mouse was
  down, measured; so did anything else placed with a transform, because the
  press cue set `transform` and replaced the placement instead of composing
  with it. Reported twice, for two different buttons.

### Changed

- The two segmented bars in popups (the document assistant's Edit / Write /
  Remove, the graph's layout picker) read as the segmented control they already
  were. The selected option was a 14% accent tint behind body-coloured text
  with a drop shadow under it, at 12px in a 26px segment, where every other
  segmented control in the app paints a solid accent behind white. The bar is
  also as wide as its options now: 209px, from 686px of well holding 161px of
  them.

- Buttons look like buttons again. A tonal button (`button.ghost`, most of
  the app) draws a hairline edge and sits slightly proud of its surface;
  a flat tint with no rim reads as a shape with text in it, which is what
  three reports in a row said. A *run* of them inside something that already
  frames them stays quiet and lights up under the pointer: a dock, a
  whiteboard panel, a card's row actions. Measured: a note list used to put
  52 outlined boxes on one screen, now none, and the largest run of tonal
  buttons anywhere is five.

### Added

- Reading a file with the AI shows up in Settings, Background tasks.
  "Describe with AI", the local OCR pass and the vision read were all
  invisible while they ran: the button went quiet and the panel that lists
  background work showed nothing, so on a slow local model the only evidence
  anything was happening was that the app had not answered yet.

- The documents editor checks spelling against a real dictionary. It used to
  look each word up in a hand-written table of 42 typos and treat everything
  else as correctly spelled, so an ordinary mistyping was never flagged and
  the only mark under it was the browser's own squiggle, which the app cannot
  see and cannot open a menu on. A 92,972-word English list is vendored under
  `frontend/vendor/wordlist/` with its licence, loaded lazily on the first
  prose pass, 252,926 bytes over the wire. Code fences, inline code,
  addresses, link destinations, html tags, note links and frontmatter are not
  read by any of the prose rules, and acronyms, identifiers and anything
  touching a digit or a path are never checked. Measured over 8,000
  characters of this project's README: six findings, no false positives.
- Suggestions for a flagged word come from the dictionary, ranked by how
  specific the edit is, so "tets" now offers "test" first rather than not
  offering it at all.

### Fixed

- An emptied mind map is no longer a dead end. Reported: "if i delete all
  nodes in a mindmap, I cant make more nodes". Every way of adding a node
  hung off a node that was already there, so a map with zero nodes offered
  nothing; it now shows one sentence and one action that makes the first
  topic, in place of the whiteboard's own help panel, which talks about pens
  and shapes.
- A map keeps at least one topic: deleting the last one is refused at both
  delete paths, and the refusal offers "Clear the map", which takes the whole
  map away and leaves one blank topic ready to type into.
- The documents editor's suggestion menu reads down its left edge. The rows
  had inherited the shell's centred button layout, so each icon sat 29, 30 or
  31px from the row edge depending on how long its label was; they line up at
  7px now. The menu also caps its height and scrolls, which it needs now that
  a real dictionary can fill it.
- Markdown markers in the rendered view stay down until someone is in the
  editor. A document nobody had clicked in showed its first heading's "#",
  because an untouched editor's caret sits at offset 0 and a marker on the
  caret's line is revealed by design.
- Tab in the documents editor indents a list item from wherever the caret is
  in it, rather than pushing two spaces into the middle of the word, and
  Shift+Tab pulls it back instead of moving focus to the dock. Reported: "I
  can't press tab to indent without it selecting an element." Shift+Tab with
  no selection also leaves a caret now, where it used to select the whole
  line it had just dedented.
- Autocorrect in the documents editor works again. It had one caller, the
  delegated input listener, which returns early for anything inside the
  CodeMirror view, so the feature had not run since the editor changed
  surface. It also fixes an unambiguous typo the dictionary knows about
  rather than only the 42 in the table, and its correction is now its own
  undo step: one Ctrl+Z used to take back the whole sentence.
- The documents formatting toolbar's single scrolling row no longer clips its
  icons: the horizontal scrollbar's own strip was coming out of the existing
  bottom padding rather than being added beneath it. Measured at 520px wide
  with the scrollbar rendering: 58px tall against a 36px control, 13px under
  the buttons, where it was 50.8px with about 2px clearing the scrollbar.
- The wrapping toolbar no longer spills its second row over the document. A
  `min-height` on the strip replaced the automatic content floor a flex item
  gets from `min-height: auto`; it is now scoped to the scrolling row, where
  the content is always one control tall and the floor can never bite.
- An empty chat composer can be dragged taller. The rule that forgets a
  dragged height on an empty box was firing on the release of the drag
  itself, so the gesture undid itself and an empty composer could not be
  resized at all.
- Dropdowns no longer flash in the top corner before landing. Placement was
  computed from the opener's rect without checking it had been laid out; an
  all-zero rect collapsed the arithmetic to the margin in both axes. It now
  retries once on the next frame, held invisible rather than painted in the
  corner.
- Menu heights are no longer capped from an un-laid-out rect. Measured with
  the whiteboard tab hidden, every board menu reported `top: 0` and was
  given an 892px cap on a 900px viewport; a stale large `top` is the same
  bug in the direction that produces an overly short menu.
- A dropdown inside a native `<dialog>` (the documents dictionary's spelling
  picker) opened behind the dialog: the menu escaped to `<body>`, which is
  outside the dialog's top layer. It now escapes to the dialog itself.
- The dictionary dialog's spelling picker and "Add a word" button are one
  height again.
- `[[wiki links]]` to a document whose title has since changed, or was
  shorter when the link was written, now resolve by prefix as note links
  already did.
- "Describe with AI" on a scan the AI reader had already read no longer
  re-captions a raw page: `vision_ocr_text` was missing from the fallback
  chain.
- A note dragged from the Library onto a whiteboard lands where it was
  dropped. The drop point was measured against the layer that already
  carries the pan and zoom as a CSS transform, then had the same transform
  applied to it a second time.

### Changed

- A mind map has its own dock rather than the whiteboard's. The pen,
  highlighter, eraser, fill, the six shapes, the sticky, the free text box
  and the image are hidden on a map (13 of the 22 tool buttons could do
  nothing a map understands); select, pan, lasso, the link tools, delete and
  undo/redo stay. In their place: add topic, add child, add sibling,
  collapse or expand the selected branch, branch colour and focus, the
  gestures that until now were keys and nothing else.
- Branch colour can be set. The renderer has carried a node's colour down its
  branch since the map's second phase and nothing in the app could choose
  one; it now sits in the map dock, with "Reset the colour to the branch" on
  the node's own menu.
- The quick-nav guide ("m") stays open until dismissed, by pressing "m"
  again or its new close button, rather than hiding on a 900ms timer.
- Line numbers leave the view menu: numbering is a toggle, not a view. Plain
  view now numbers by default, since it is the view with no grammar and no
  decorations, and an explicit off still wins.
- Plain view gets a plain black or white ground, painted behind the editor
  rather than fighting CodeMirror's own stylesheet.

## [0.3.0] - 2026-09-09

**0.3.0 is the modernisation release.** Everything on the branch since
0.2.2 (2026-09-06 to 2026-09-09): a canvas graph with colour rules, groups,
lasso and export; mind maps through Phase 5 with previews and generation
from notes; the documents editor's new chrome and CodeMirror 6 vendored
under the CSP; launchers, uninstallers and a splash on three platforms; the
glass aesthetic scoped to the functional layer with Performance mode;
grounding that names the note each sentence came from; a README and
documentation written for the public; and about forty of the owner's
reported bugs. The detail, by surface, follows; the tag is cut once
this lands on main (docs/RELEASING.md).

### 0.3.0, by surface

Every non-merge commit on `claude/epic-ramanujan-8xocc0` since 2026-09-06,
not already covered above or in [0.2.2], one line each, no hashes. Pure
roadmap bookkeeping (INBOX/HANDOVER updates, plan documents, agent-remaining
notes) is not repeated here; see `docs/roadmap/` for that record.

**Graph**
- Phase 1: a Web Worker running d3-force behind one `renderGraph()` entry
  point, a Canvas 2D renderer, a 2,000-note gate fixture and the numbers
  from running it.
- Phase 2: full-screen mode, label collision avoidance (hover and hits
  first, then degree), a scaled spread so a map opens framed, pan no longer
  re-lights a note nobody pointed at, and the display options moved off a
  strip and onto a dock gear/popover.
- Phase 3: colour rules and groups.
- Phase 4: lasso selection, a selection dock, a right-click menu, session
  hide, saved views moved into the More menu (9 controls down to 6), PNG
  export at 2x with the legend, and Play on the time slider.
- The options panel holds up on a phone and a short window, and fits
  1440x900 without scrolling.
- Concept maps get a labelled door in the Graph tab.

**Mind maps**
- Phase 1 (backend): the map object, containment, tree endpoints,
  export/import, four AI tools.
- Phase 2 (frontend): nodes are drawn and a map is editable from the
  keyboard; a new map's root opens centred and edges follow every card a
  bulk drag moves; edges also follow a single node's drag; a map frames
  itself on open and Tidy is measured at 200 nodes.
- A mind map is a node in the graph, joined to the notes on it, and is also
  a note in its own right (`GET /entries` lists it again).
- Import from an OPML or Markdown outline, and export the same way; attach
  a mind map to a chat message as its outline.
- A map node can point at a note, document, file or link, by hand; purging
  a map unlinks its image files.
- No permanent selection box, and a map node's text can be highlighted;
  readable in dark theme and with glass off.

**Documents**
- CodeMirror 6 vendored (`frontend/vendor/codemirror/`, built by its own
  script from pinned versions, licence beside it) and verified under the
  app's CSP; the editor moves onto it next.
- Phase 0: the fifth bug and the states checked, recorded and built.
- Phase 1: the chrome, three questions in three places, plus one header
  row where the formatting strip only appears when asked for.
- Phase 2 steps 2 to 4: the editor *is* CodeMirror 6 now, behind one
  adapter (`docSurface()`), loaded the first time a document is opened.
  Live preview renders in place instead of in a second pane, with the
  markdown markers hiding themselves until the caret enters what they mark,
  links and `[[wiki links]]` as chips, task checkboxes that tick, callouts
  and quotes with a left bar and images shown; Source is the same editor
  with the rendering off, so switching keeps your place, your selection and
  your undo history. Find and replace is the engine's panel (regular
  expressions, whole-word, a Replace all that one Ctrl+Z puts back),
  headings fold in the line-number column, and twenty-one languages get
  syntax colouring. Typing in a 20,000-word document went from a measured
  160 ms per keystroke to 16 ms. The per-paragraph Live view, the Phase 0
  backdrop and the snapshot undo stack are deleted with it, and the block
  handle goes with them until Phase 3 brings block structure back.
- The owner's evening batch: the Edit / Read pills fit inside their own
  segment (they overhung it by 4px); `---` and a callout's `[!note]` join
  the markdown markers that go invisible until the caret reaches them, the
  callout showing its kind's own label where its marker was; a **Plain**
  view for using the tab as a plain text editor, offered for code files
  too; line numbers reachable from the view menu instead of only from the
  collapsed formatting strip; and code syntax colours drawn from the app's
  own palette, which is what finally makes a code file readable in dark
  mode (a keyword measured 1.76:1 against the page and now reads 6.47:1).
- The follow-up pass on that batch: `.focus()` on a `<select>` is dead code
  everywhere in this app (all thirteen reachable selects would have focused
  the hidden native control), so `focusSelect` replaces it at four call
  sites; a Live marker reveals when the caret is on its line rather than
  inside its range, which stops the caret jumping 28.4px to the right on a
  leftward keystroke; the documents sidebar's sections are as tall as what is
  in them (243px of empty column gone); every text link in the app stops
  drawing a filled button's accent glow behind its words; and Swift, R and
  INI join the highlighter (+2.5 KB gzipped) while PHP and CSV are refused on
  purpose, with the measurements written down.
- The Outline sidebar reads as an outline: entries left-aligned and
  indented by depth in the direction depth goes, an empty state that says
  what fills it, References with its close button on its own line, and the
  "Where are my documents kept?" help no longer pinned across the bottom
  like a footer.
- The instruments VS Code and Word have that this editor did not: real
  underlines in Source view on a backdrop behind the textarea, one click
  on an underline opens ranked suggestions, a file-type change re-runs the
  prose pass, the caret mirror gets a border, the line-number gutter is
  pinned to the textarea it numbers, and line numbers are one remembered
  setting across all three editors.
- An on-request AI review ("Check with AI") for what the local rules
  cannot judge, and inline AI at the caret (`/ai`, Ctrl+J, a wand in the
  selection bar) instead of a side panel.
- A document-local undo stack that spans Live and Source; Live view stops
  dropping the caret.
- The findings chip is a control and the switches moved to the kebab; the
  preview waits for typing to pause.
- Undo for deleting a document, the one permanent loss left in the app.

**Whiteboard**
- Text formatting on boxes and stickies: bold/italic/bullets, alignment,
  toggleable rendered markdown.
- Top-bar menus escape the panel that was cutting them off; the five
  whiteboard menus become one measured menu; pan desync fixed.
- Captioning for documents, not photographs; the lightbox shows a document
  like a document.
- Outline a region on a page and read or describe just that.

**Chat and Ask**
- The chat mode is called Agent, and a skill can switch to it.
- Citations land on the answer a run actually ends with (the inline
  citations were being written and then thrown away).
- Grounds answers in the notes the tools actually read, and in a note's
  distinctive words.
- Ground the Help chatbot in real facts; Help gets its own mini AI chat
  (Help → "Ask the guide").
- A "still writing" pill floats over the transcript instead of taking a
  row, doubling as jump-to-latest, and keeps working after the live turn
  is re-parented.
- The chat box gets a "/" menu of its own commands.
- Chat can attach what the notebook already holds, and attached documents
  finally reach the model.
- Tool results are typed cards; a failed plan step is re-planned, not
  abandoned; a step cut off mid-job is stopped, not re-planned.
- **Tensions**: the notebook finds where you disagreed with yourself,
  reachable as an agent tool, a skill, and from the command palette.
- `read_file` can target a search term instead of only the first ~2000
  characters; `list_documents` and `get_document` got the matching fix.

**Notes, Library and Files**
- Notes carry a space chip, and capture says where it is filing.
- The Files sub-tab is a reading list: a "Read · N words" badge, a primary
  read/open action, and a Read/Not-read filter; the OCR workspace finds its
  own siblings (Images/Files/Pages) and every entry point populates it.
- OCR readings are kept as they complete, split into typed sections without
  Tesseract, deletable on their own, and a Stop button plus a Background
  tasks row while a read runs.
- Ask the notebook about itself: most common tags, busiest categories,
  untagged notes, most-linked notes, when you write most, word counts,
  longest notes, stale notes, tags that keep turning up together, all
  counted from your data with no AI running, and surviving a misspelling.
- Archive extended to chats and documents, alongside notes.
- A "Read · N words" badge on chat images already OCR'd; Contents says what
  a folder is instead of "(written here)"; the Library fits a phone.

**Chat, Notes, Documents copy and small fixes**
- Mark a notification unread, per row, plus "Mark all read".
- "Ask the AI for wordings" in the document suggestion menu.
- Double-tap the chat composer's resize corner to reset its height; the
  composer can be dragged and stops at 40vh.
- Several routes between two notes at once (Yen's K-shortest paths), each
  in its own colour; "Generate story from path" becomes a menu of six
  shapes.
- The onboarding "Your setup" slide warns when the notebook folder has
  gone read-only.

**Dashboard**
- The widgets dialog no longer paints closed behind the hero; the hero
  banner is restored and refined, with the primary start tile tinted
  rather than inverted.
- The toolbar gets breathing room and a name; rearranging now saves; two
  new widgets.

**Settings and the popup agent**
- Performance mode (Effects & accessibility): flat panels, no animations
  and slower graph physics, auto-on for a machine with 4 cores or 4 GB or
  fewer or when the OS asks for less transparency, said once in a toast.
  With the animated background on, cards still frost it.
  Glass itself now blurs only where something scrolls under a surface or
  where it floats (the top bar, sub-tab strips, dialogs, docks, popovers):
  the blurred area at rest fell from a third of the screen to under a tenth.
- The popup agent gets a slot beside the Ctrl-K hint, on by default and
  hideable like every other slot.
- One integrated toggle row everywhere (switch leading), replacing the
  divider-separated grid.
- Ctrl+F searches the Settings dialog and jumps to the answering section;
  the About page reads as a hierarchy again.
- Settings → Packages installs, reinstalls or removes dictation, the
  desktop window and search-by-meaning without a terminal.

**UI modernisation, phases 0-9**
- Phase 0: the sweep runner, screenshot set and signature ratchet.
- Phase 1: one gutter for the shell, two card sizes, a one-row hero, one
  head row.
- Phase 2: buttons on the ramp, two row gaps, one popover shell, one tile.
- Phases 3-4: glass on the shell only, one control size, tone-only hover,
  one focus ring.
- Phase 5: Settings nav and label column, the reminders form rhythm, a
  Voice pass; Settings fits a phone at 390px; Notes and Chat fit a phone.
- Phase 6: one voice, sentence case on every label, every empty state
  offers its next step, every piece of text clears AA contrast in both
  themes.
- Phase 7: line numbers as one remembered setting; the caption/read
  pipeline described above.
- Phase 8: every top dock becomes one bar, applied surface by surface
  (Graph, Library, Notes, Timeline, Reminders, Whiteboard, chat header).
- Phase 9: the phone pass, breakpoint by breakpoint, down to a one-column
  layout, safe areas, hover gating and a working jump list on a phone.
- Keyboard: every tablist walks with arrow keys, Home and End; a
  roving-tabindex pass informed by it.
- Glass, three passes: one token recipe for every surface, a lit rim that
  costs nothing, and a fifth of the blurred layers left, none nested.

**Launcher, installer and uninstaller**
- `start-desktop.bat` no longer fails after the update check with
  `"...\--desktop" is not recognized`: the launcher captures its own path
  before parsing flags, since SHIFT moved %0 along with them.
- The splash's step marquee sits under the step text instead of across it.
- `start.sh`/`start.bat`/`start-desktop.sh`/`start-desktop.bat`: one flag
  set, a doctor, a log for every run, and a splash screen shared by all
  three surfaces.
- `--doctor`, `--logs`, `--shortcut`, `--port`, `--reinstall` and friends
  now behave as documented, including a flag typed without its value
  failing with a message instead of silently killing the script.
- The uninstaller: a dry run with sizes, an `--export` (fixed to work with
  no path given), and a guard against deleting under a running app; the
  freed-space figure now counts the notes that actually went.
- The launcher must not die because it could not open its own log.

**Backend, security and CI**
- Backend hardening: SQLite pragmas and indexes, one error contract,
  media size handling.
- Add `GET /debug/health` (PLAN.md B9) and a Health block in Settings →
  About.
- The session token is redacted from uvicorn's access log; Markdown links
  in notes go through a scheme allow-list; the API schema is behind the
  unlock.
- Several CodeQL findings closed: cyclic imports, no side effects inside
  `assert` in the learned spec, unused regex dropped from an audit script,
  wrong keyword arguments in spec tests, `py/import-and-import-from`.
- Every `.py`/`.js` file in the app's own code and tests: no em-dashes,
  enforced by a lint that cannot match its own needle.

**The final day, 2026-09-09**

Written after the rest of this section, which stopped at that morning. A
hundred and forty commits landed on the last day, from four agents and the
orchestrator; these are the ones that change what the app does.

- **Graph.** A drag places a note and lets the map settle around it; Shift
  and drag pins, which reverses a decision the code defended at length (the
  reason is in GRAPH_PLAN). Tree, radial and arc are read-only for position:
  no pinned ring on every node, and a double click no longer releases one
  into the simulation and pulls the layout apart. The node panel's close
  button stays on its line beside an ellipsised title, its actions became a
  centred footer band, and the suggested-links list shows note names instead
  of raw markdown. The lightbox opens above full screen, and full screen
  keeps its glass when the animated background is on.
- **Mind maps and boards.** A board is a board and a map is a map in the
  Library, not two notes with a pencil icon. The OPML and FreeMind exports
  are iterative and cycle-guarded: a 1,200-node map raised a recursion error
  before, and a map containing a cycle ran 200,000 rows without stopping. A
  map's edges are drawn in their branch colours, which a new lint caught on
  its first run. Board and map previews draw real shapes at real sizes with
  every label inside its shape.
- **Documents.** Plain and code views with line numbers and syntax; rule and
  callout markers hide until the cursor reaches them; setext headings reach
  the outline; the Outline sidebar indents by one step instead of three and
  reads left; the Edit and Read pills fit their control. Code in the dark
  theme was measured at 1.76:1 for keywords and is 6.47 to 13.52 now.
- **Files.** A document describes itself from its own text when it is
  attached, on a background thread, so a Files row says what a file is
  without being asked; the description is a summary rather than a
  transcription, and it needs no vision model. A document's title opens the
  reading workspace. The expanded reading no longer closes itself every six
  seconds.
- **Chat.** A citation's number and its row in the Sources panel are the
  same number, which they were not: the two counted from unrelated
  sequences. An angle-bracket URL renders as a link. The token badge reads
  "used / window" and keeps its size at every width.
- **Everywhere.** Ctrl+S saves the settings section that is on screen and
  marks the button it pressed; the zoom readout appears over dialogs; a menu
  a panel owns no longer counts as a click away from it; the whiteboard's
  selection rectangle draws above the cards; the Arrange tools sit in three
  named rows; a dialog taller than the window scrolls to its last line
  instead of losing it, which the keyboard shortcuts overlay had been doing
  to its whole "Always available" section, whose chord rows now read as keys
  then description rather than one flex item per key; nine settings sections trade walls of prose for help popovers;
  the glass sheen slider drives something for the first time. The Library's
  Contents dock keeps one row at 1024 and at 820, where it wrapped in both
  themes: Collapse all sits in a `...` menu and the four-way segment folds
  below 1100 like every other dock's, the same answer the boards dock took.
- **The suite and the tooling.** A lint fails the build on a merge conflict
  marker in any tracked file; another fails on an SVG paint attribute a
  stylesheet would silently override, now also when the class is assigned
  through a ternary or a template, with a browser sweep covering the
  descendant-selector half no text scan can see; `scripts/gate.sh --changed`
  runs the
  lint set plus the tests naming the files you touched, and the full suite is
  no longer run as routine, because CI runs it unselected on every push. The
  health budget times its fastest sample rather than the median, so it
  measures the endpoint instead of the machine's load.

## [0.2.2] — 2026-09-07

### Recorded late (shipped in 0.2.2, listed under Unreleased until 0.3.0 was cut)

### Added
- **Groups for saved links, with buttons to make and manage them.** The Links
  sub-tab's top dock now has **New group** and **Manage groups**. Renaming a
  group moves every link in it; deleting one keeps the links and simply
  ungroups them. A group you make before filing anything into it is remembered
  until a link lands there.
- **Document history.** Every version a document has had, with who changed it,
  how many words it gained or lost, the opening of that version, and a way to
  read or restore any of them. A stretch of editing coalesces into one entry
  rather than one per autosave, so the list reads as sittings rather than
  keystrokes. Restoring keeps the version it replaced.
- **Ask the notebook about itself.** "What are my most common tags", "which
  categories have the most notes", "how many notes have no tags", "which are my
  most linked notes", "when do I write most" are counted from your data rather
  than generated — exact, instant, and answered with no AI model running at all.
  Private and binned notes are never counted.
- **"Ask the AI for wordings"** in the document suggestion menu: where the
  built-in checks have no mechanical fix, the local model offers two or three
  alternative phrasings to pick from. Nothing changes until you choose one.
- **OCR readings are kept.** A page read is stored as it completes, so a read
  that finishes after you close the workspace is still there when you come
  back, and a range read that is interrupted keeps the pages it managed.
- **The OCR reader picker offers both AI readers** where a machine has two
  different models — a dedicated document reader and a general vision model —
  instead of one option named after whichever it happened to resolve.
- **Mark a notification unread**, per row, plus "Mark all read".
- **"Edit document"** on a previewed document in the lightbox.
- **A "Still writing" pill** in Chat when you scroll away from a live answer,
  doubling as jump-to-latest.
- **Double-tap the chat composer's resize corner** to reset it to the automatic
  height.
- **Help → "Ask the guide"**, a small embedded AI chat for "how do I…"
  questions about the app itself. Answers with the utility model, grounded
  in a fixed set of reference notes (`ai/help_chat.py`'s `HELP_TOPICS`) so a
  small local model isn't guessing at features it has never seen, never
  reads the user's notes, and keeps no history past the current browser
  session. Replies can carry quick-access badges into the exact tab or
  settings section they describe.
- **Onboarding's data-dir writability check.** `GET /storage` now reports
  `data_dir_writable`, and the "Your setup" onboarding slide warns if the
  notebook folder has gone read-only.
- **Document editor: "Check with AI."** Sends the current document to Chat
  with a prompt asking the model to flag wording issues a spellchecker
  can't catch — agreement, tense, clarity — without rewriting the document.
- **Archive extended to chats and documents** (BACKLOG §30b's own named
  remaining scope, after notes got this first). An "Archive" action beside
  Delete in the chat sidebar and the documents dock — kept, never deleted,
  out of the way — and the Library's Shelved filter now covers all three
  kinds.
- **The popup agent in the status bar.** It works from every tab and had
  nothing on screen saying so. Now a slot beside the Ctrl-K hint, on by
  default (the ask was discoverability, and a control nobody switches on
  advertises nothing) and hideable from Settings like every other slot.
- **A Stop button for OCR page and range reads**, and both now appear in
  Settings → Background tasks while they run. A read is a model round-trip
  of several seconds that could not be cancelled and showed up in that panel
  nowhere, so closing the workspace mid-read left no sign the app was still
  working.
- **Inline AI in the document editor.** `/ai` in the "/" menu, Ctrl+J, and a
  wand in the selection bar open a small bar at the caret instead of a side
  panel: type an instruction, the answer replaces the selection (or writes at
  the cursor) and lands *selected*, with Keep / Try again / Undo underneath.
  No new endpoint — the existing `POST /documents/{id}/ai-edit`.
- **Several routes between two notes, not just the best one.** The graph's
  Trace panel now finds up to three genuinely different, loopless routes
  (Yen's K-shortest paths) and draws all of them at once, each in its own
  colour, with switchable chips above the readout.
- **"Generate story from path" is a menu of six shapes** — narrative,
  explainer, timeline, argument, teaching notes, short brief — instead of one
  fixed prompt.
- **The Files sub-tab is a reading list.** Every file tile carries a
  "Read · N words" / "Not read" badge and a primary "Read this" / "Open
  reader" button, plus a Read/Not-read filter.
- **The OCR workspace finds its own siblings and switches between them.** An
  Images/Files/Pages switch above the rail, and every entry point (including
  the lightbox, which previously opened to an empty rail) now populates it.
- **Sections without Tesseract.** A stored reading is split into typed blocks
  (heading/list/table/code/text, read off their own shape) instead of one
  whole-page fallback region, and each region shows which page and section it
  came from.
- **Delete a stored OCR reading**, not just overwrite it by reading again —
  `DELETE /{files,media}/{id}/page-reads/{page}` plus a "Delete this reading"
  action in the workspace. Redo already worked (a re-read replaces the stored
  answer); its button now says so.
- **Ask the notebook about itself, in more ways, and past a typo.** Word
  count, longest notes, notes gone stale, and which tags keep turning up
  together — and every question now survives a misspelling ("catagories",
  "docuemnts") against a small fixed vocabulary, transpositions included.
- **Undo for deleting a document.** The one permanent loss left in the app —
  notes, chats, files and boards were all recoverable, a document was not.
  All four delete doors now offer Undo.
- **A refresh button on the Your Notes sub-tab**, matching the one every
  other Library list already had.
- **A "Read · N words" badge on chat images that have been OCR'd.** The
  caption already showed under the thumbnail; the vision-OCR/Tesseract
  reading was resolved by the backend the whole time but nothing in the
  bubble said it existed. Clicking the badge opens the same lightbox the
  picture itself does.
- **`read_file` can target a search term.** A new optional `query` argument
  returns the text around where it actually appears instead of only the
  first ~2000 characters — a multi-page scan's later pages were previously
  unreachable through this tool no matter how precisely `search_files` had
  already located the match. `list_documents`'s search preview and
  `get_document`'s no-embedding-backend fallback got the same fix.

### Fixed
- **The chat sidebar never marked the open conversation.** A `null` passed as
  the highlight terms threw inside the Sources panel, which aborted
  `openConversation` before it repainted the sidebar — the click worked, the
  transcript rendered, and an unrelated null check stopped the row from ever
  being marked. A third of each row was also dead to clicks, and the mark it
  would have got was a 3px bar and a 13% tint.
- **The chat header's model name opened its panel off the bottom of the
  window** — `position: absolute` with no positioned ancestor put it at (0, 905)
  in a 900px viewport, which is indistinguishable from a control that does
  nothing.
- **A page read that finished after the OCR workspace was closed was lost**,
  even though the app announces such reads as background tasks precisely so the
  window can be closed.
- **The OCR picker and the OCR reader disagreed about which model would run.**
- **The gallery's per-image select checkboxes could not be clicked** — the
  actions row above them stretched across the tile and swallowed every click.
- **The lightbox could not be dismissed by clicking beside the picture**, and
  its close button was covered by the content column on taller documents.
- **The streaming indicator froze and, on a long answer, vanished.** Its
  animation timer destroyed itself the first time the live turn was re-parented,
  and one beat in four of the reduced-motion cycle lit nothing at all.
- **Nineteen buttons drew a typed character where an icon belonged**, and
  eleven more had no gap between icon and label. Two lint tests now refuse both.
- **Twenty-five icon-only buttons were rectangular**, including nine popup close
  buttons measured at 43.6x28.
- **The formatting toolbar's dropdowns un-clipped the whole toolbar**, spilling
  every control past the panel edge.
- **Files and attachments did not render in the timeline or graph popups** —
  both filtered to images and dropped everything else.
- **The dashboard greeting could call you by a misspelt or invented name.**
- **The note cards' ⋯ glyph sat above centre**, drawn as a typed character
  where the app's other ⋯ builder uses the icon font.
- **Deleting a document failed** once it had a history, on a foreign key.
- **Restoring a document version restored the wrong text** — the snapshot taken
  first coalesced into the very revision being restored. Caught by a test
  before it shipped.
- **Short background AI jobs were invisible.** The status loop idles at 10s
  (120s in a hidden tab) and can only announce a job it has seen in a
  `/tasks` payload, so an image caption — often shorter than that gap —
  began and ended unobserved: no "Started" line, no status-bar slot, no
  "Finished" toast. Writes that can leave work on a background thread now
  kick a poll, and `jobsRunning()` counts every task rather than only
  re-index and model pulls.
- **Formatting-toolbar dropdowns escaped their panel.** Measured in the
  capture composer: the Insert menu sat 123px outside the panel's left edge,
  because `.doc-dock-menu-list` is anchored `right: 0` and grows leftwards —
  right for the document ⋯ it was written for, wrong for an opener near the
  left of a toolbar. Clamped inside the panel on open.
- **The OCR workspace's reader picker named the wrong model.** It resolved a
  generic vision model instead of the configured or auto-detected OCR
  document reader, so a dedicated reader could never be chosen even when
  installed.
- **One toggle row everywhere in Settings.** `.setting-check` was a
  divider-separated grid with the switch pinned hard right; it is now the
  same integrated, filled-when-on row with a leading switch that the rest of
  the app uses, which moves the tools list and the appearance outliers
  together.
- **Attached non-image files rendered as nothing** in dashboard widget note
  lists, and the widget picker listed "On this day" twice.
- **Toolbar dropdowns in the capture and documents toolbars opened up to
  151px from the button that opened them**, and after that, in the top-left
  corner of the panel — three related bugs in the same placement function,
  in the same viewport-fixed-menu change: wrong alignment axis, no
  containing-block correction, and a zeroed fallback on a failed measurement.
- **The traced graph path's chips clipped from both ends** ("ting is the
  delivery of computing se") — a flex item that could not shrink, centred in
  its box, overflowing equally on either side; `text-overflow` on the parent
  button never touched it.
- **A misspelt "ask the notebook about itself" question fell through to
  ordinary semantic search**, which is precisely the case that feature exists
  to answer better — and one new question's own pre-filter accidentally
  rejected it before any matcher saw it.
- **`clampToolbarMenu`'s CodeQL-adjacent cousin**: three cyclic imports
  (one already a CodeQL alert, two more of the same shape unreported)
  closed and pinned by a new AST-based lint.

### Verified
- **A real (non-Ollama) backend, driven live for the first time.** A
  stand-in OpenAI-`/v1` server (a real socket, not a mocked `requests`)
  proved `/help/ask`, `/voice/summarize` and a full `/chat/stream` turn —
  SSE framing included — all round-trip correctly through
  `OpenAICompatClient`, the dialect LM Studio/llama.cpp/Jan/vLLM share.
  Tool-call streaming remains spec-verified only; see HISTORY.md §113.

A bug-fix and consistency release, from one long round of live reports.

### Fixed
- **The formatting-toolbar dropdowns rendered as transparent, block-flow
  text.** The previous release's hide-until-placed fix for menu flicker split
  the rule wrongly, leaving the menu's whole appearance (flex column, padding,
  border, background, shadow) behind the `.is-placed` class — and because the
  placement code gives up when a menu measures 0x0, that class was then never
  added. Self-sealing, and it affected every `<details>` menu in the note
  capture, note edit and document toolbars.
- **Turning the background librarian off did not stop the pass already
  running** — nor did battery-saver mode. Both now request a stop, which the
  pass honours at its next checkpoint instead of finishing first.
- **Agent-activity notices ignored both the mute switch and "Panel only"**
  whenever they carried an error. The notifications centre records them
  either way, so nothing is lost by not interrupting.
- **A PDF read page by page showed "No text yet" everywhere outside the OCR
  workspace.** The per-page readings are now joined into the file and media
  list responses, in page order, with a whole-file reading still winning.
- **Chat: scrolling up left the pane stuck** with the answer cut off until
  "Jump to latest" was clicked — `scroll-behavior: smooth` on a pane written
  to every frame turned each auto-scroll into an animation competing with the
  wheel.
- **Chat: every finished answer step kept its blinking caret** during an agent
  run, and the caret sat on a line of its own whenever an answer ended in a
  list.
- **The spaces switcher in the top bar was shorter than everything beside
  it** — 28px against 36px for the tabs and the five icon buttons.
- **The whiteboard's view dropdown had a horizontal scrollbar**, and long
  dropdown menus could run off the bottom of the window instead of scrolling.
  Every popover menu is now capped to the window height and scrolls inside
  itself.
- **A horizontal scrollbar on Notes → Capture**: measured at three widths as
  exactly the scrollbar's own width of phantom overflow, plus a head row that
  crushed its own controls by 30px.
- **Model names in badges were clipped at both ends** (centred flex text
  cannot ellipsis) and carried their `hf.co/` registry prefix.
- **The OCR model never showed as "in use"** in the installed-models list.
- **Document line numbers drifted** against a soft-wrapping code pane.
- The selection tick was hidden under the page render on Files rows in
  preview view; sticky rows painted a hard rectangle over their own card.

### Fixed
- **A mind map's branches are the colours it says they are.** Every edge on
  every map was drawn in the accent, while the same map's thumbnail showed the
  branch colours correctly.
- **A very deep mind map exports.** A long enough branch used to fail the
  download with a server error, and a map whose parents form a loop could hang
  the export instead of finishing it.

### Changed
- **The Boards and maps toolbar fits one row on a laptop**, with the two
  import and generate actions behind its ⋯ menu.
- **A board's preview looks like the board.** Things are drawn at their own
  sizes instead of as identical grey blocks, text boxes and map nodes show
  what is written on them, and the dashboard's miniature is a thumbnail again
  rather than a 300px square that made the widget scroll.
- **The dashboard's top band uses its whole width**: a Continue pill that takes
  you back to the note you were last in, and a fortnight of activity drawn
  beside the counts, where two thirds of two rows used to be empty.
- **Every skill on the dashboard says when it last ran**, so you know before
  spending a model call.
- **Pressing "m" shows a full-screen guide** to what the next key does, instead
  of a notification that wrapped mid-word, and three more keys do things:
  settings, a quick sketch and meeting notes.
- **The activity heatmap is legible**: it starts full width, and its squares are
  four times the size.
- **Back to top appears sooner on the dashboard**, which is the page you scroll
  furthest down.
- **Glass reads like glass in dark mode.** A card sat at almost exactly the
  page's own brightness, so the blur had nothing to separate it from; it now
  sits above it, measured.
- **On a small laptop or an iPad the tabs are icons**, so the header is one row
  again rather than two, and every tab is still one press away.
- **A bar with content moving under it says so.** The top bar, a dock or a
  sub-tab strip fades a soft edge beneath itself while the list under it is
  scrolled, and paints nothing at rest.
- **Menus open out of the button that opened them** rather than appearing
  beside it, and stay still under Reduce motion.
- **All seven tabs are reachable on a tablet in portrait.** Between 600 and
  820 pixels the strip used to need more room than its row had, so two tabs
  sat behind a fade; the captions and their padding step down there instead.
- Anything rounded inside a rounded container follows one token, so it stays
  concentric at every setting of the corner slider.
- Tab indents four spaces where a file type has no convention of its own.
- Zoom feedback is a HUD, not a notification, so muting no longer hides it.
- One menu shell app-wide, matched to the note-card kebab menu.
- Stop buttons all carry the stop icon and the error colour.
- Tighter shell: one `--page-gutter` (ceiling 24px → 18px) for the page edge,
  the sidebar gap and the top, and one gap under both sub-tab strips.
- Surface tiers and a border budget, one button ramp, one eyebrow recipe —
  see `docs/roadmap/UI_MODERNISATION_PLAN.md` for what remains.

## [0.2.0] — 2026-09-05

A long round driven almost entirely by live reports with screenshots. Two
defect *shapes* account for most of the visual bugs in it, and both are
written up at the top of `docs/roadmap/HANDOVER.md`: a CSS recipe that names
its members explicitly and silently drops any control that never enrolled, and
`border: none`, which leaves the width at `medium` for an `!important`
border-style rule to resurrect as 3px.

### Added
- **An OCR workspace.** A page beside its regions: a page rail, the image with
  a clickable box per block Tesseract found, and the text of each block with
  its confidence, one selection shared both ways. `core/ocr.py` gained
  `extract_regions`; `GET /media|files/{id}/ocr-regions` serve it. Fit and
  Actual size, because a portrait scan in a landscape pane was getting cut off.
- **A vault keeps its shape when imported.** `Entry.source_path` holds the
  vault-relative path, `[[wiki links]]` resolve by **filename** (which is what
  Obsidian links name), the Contents index gained a By-folder mode, and
  Settings gained a folder picker beside the file picker.
- **The Contents sub-tab is a real index** — sticky sections, a filter, a jump
  bar, folding, grouping by category, tag or month — rather than a masonry of
  boxes with a scroller inside each one.
- **A selection toolbar** in both editing surfaces, and the note *edit* form
  (the app's poorest editing surface) gained the toolbar, the "/" menu and the
  selection bar it never had. Documents now open in Live view.
- **Live action lines in chat**: each tool call names what it touched, as chips
  that preview the note in place with Open and Edit.
- **Sorting on every Library sub-tab**, and a Cards/Rows switch on Boards.
- **A rebuild-the-search-index suggestion** after a bulk change, rather than a
  standing notice nobody reads.
- **Favourites** as a parallel pseudo-category, integrated everywhere.

### Changed
- The Images/Files gallery kebab is the app's own `kebabMenu()` — it was a
  second implementation of one control, which is how it drifted three times.
- The widgets picker shows Wide as a state, marks Remove as destructive, and
  can be reordered from the keyboard.
- Deleting a file can take its `![...]()` out of the notes that showed it.

### Fixed
- A document chip in chat opened a *note* with the same id.
- A tool row with chips vanished from a reopened conversation.
- Drafts could link to saved notes.
- The Files sub-tab's kebab existed but was invisible and unclickable behind
  the page preview.
- Attached (not embedded) images never appeared in widget rows.


## [0.1.9] — 2026-09-04

### Added
- **A note's attached files can be read.** An attachment now carries a
  caption, extracted text and a vision-model transcription of its own —
  columns `MediaUpload` has always had and `Attachment` never did. One
  endpoint (`POST /files/{id}/analyse`) covers all three: Tesseract for a
  picture, the document extractor for a .docx or a text-layer PDF, and a
  vision model rasterising pages for a scan or a diagram with no text layer
  at all. Any of the three can be typed over by hand.
- **Files show a preview.** A PDF tile renders its own first page.
- **The file gallery multi-selects**, with a count and bulk delete, matching
  the Documents sub-tab.
- **A whiteboard selection can be saved straight to the image library** as a
  PNG, with no file downloaded on the way.
- **The user has an avatar in chat**, alongside the assistant's emblem.
- Ask's two panels have real heads, and the tab says what it does before its
  first use instead of being an input on an empty card.

### Changed
- **Semantic search knows how a note is filed.** A note's category, its tags
  and the text of anything attached to it are part of what gets embedded, so
  "what do I have under hobbies" is a question the vectors can answer.
  Existing notes need a re-index to benefit; new and edited ones do not.
- **One help popover for every "?" in the app.** Three different
  presentations (a floating card, a static bordered paragraph that pushed the
  page down, and bare inline text) are now one anchored, caret-pointing
  popover that no card's overflow can clip.
- The Ask box reads as a single composer rather than five loose controls.
- Image caption and OCR fields read as fields rather than shouting labels,
  and the model that wrote a caption is a badge rather than a bare id.

### Fixed
- **A PDF's pages no longer disappear when you read its text** — pages on one
  side, the extracted text on the other.
- **Popup menus clipped in many places, not one.** Every `<select>` in the
  app now escapes its clipping ancestor; the escape mechanism itself gained
  the z-index and width fixes that only showed up once it was used inside a
  modal.
- **A note's attached PDF never appeared in the Library**, because the
  gallery only ever queried one of the two file tables.
- Agent rows printed their icon spec as text ("ph:folder Merged …").
- Whiteboard link endpoints drifted away from the cursor while zoomed — the
  zoom scale was applied twice.
- Usage chips printed raw markdown instead of a readable line.
- A turn that is still generating now says so for as long as it runs, rather
  than only until the first stream event.


### Added
- A formatting toolbar for the Notes composer, matching the document
  editor's: bold, italic, code, lists, links, plus highlight, a highlight
  colour, a text colour and Remove formatting. Both toolbars share one
  markdown table, so they cannot drift apart.
- Text colour in notes and documents: `++red|text++`, in eight colours.
- Selecting text in any editor now offers the actions menu (it previously
  only worked on rendered content), including Highlight with a colour.
- Similar notes can be turned into real links in place, from both the
  editing panel and the "Similar notes" action on a note card.
- Suggested links now get an AI-drafted reason automatically, which you can
  edit before accepting.
- Settings: automatic image captioning and automatic text-reading (OCR and
  vision model) can each be turned off. Both stay on by default.
- Settings: a Regenerate button for the dashboard's welcome message.
- Text highlighting now supports named colours: `==green|text==`
  (yellow, green, blue, pink, purple, orange).
- Settings → Personas: a "Regenerate greeting" button for the dashboard
  welcome message.
- The image gallery's OCR and vision-OCR text is collapsible like the
  caption, and the lightbox shows who described an image, not just who
  transcribed it.
- Text highlighting in notes and documents: `==highlighted text==`, an
  inline markdown convention rendered everywhere note/document content
  already renders (no new data model).
- A "generate suggested reasons" action for the Graph tab's pending link
  suggestions, filling in empty "Why?" boxes via the AI.
- A "Clear" button for the AI Skills sidebar's run log.

### Fixed
- The navigation-history popup: it capped at 12 entries with a count of
  what is not shown, and its rows no longer clip their own text.
- Editing a saved link now opens one inline form with the title, URL and
  group together, rather than two dialogs in sequence.
- The image gallery's actions menu closes when you pick something, instead
  of staying open over the rename field.
- The AI Skills step list numbers no longer collide with the panel edge.
- The Graph options divider no longer crowds the time read-out.
- Local scripts and stylesheets are versioned, so an upgrade cannot leave a
  browser running the previous release's files.
- **Notes are filed by the AI again.** Auto-categorisation used to return
  on a close vector match and only ask the model if that failed, so in an
  established notebook the model was almost never consulted and notes landed
  in the wrong category. The model is now asked first; the semantic paths
  remain for when no model is running.
- The navigation-history popup was unreadable: its background was 4%
  transparent so the page showed through, and its rows were pinned shorter
  than their own text so every glyph was clipped to a sliver.
- The AI Skills sidebar is now the height of its own panel instead of
  overflowing past the bottom of the screen.
- Long words and URLs no longer overflow the edge of an image-gallery card.
- The nav-history popup's cramped spacing, a cut-off last row, and an
  overly-narrow popup for short entries.
- The Library sub-tab menu bar now matches the Notes sub-tab bar's card
  styling and corner rounding (was picking up a global rounding rule by
  file-load order, since it never set its own `border-radius`).
- Markdown document previews in the lightbox used the translucent card
  background instead of the near-opaque modal one.
- `#search-help` and `#capture-help` now close on outside click/Escape via
  the shared toggle helper, and share the floating popover style used
  elsewhere.
- A stray horizontal scrollbar in the Library Contents outline was cutting
  off text and its hover highlight.
- The AI Skills tab's step/tool fact list had no visual container.
- The Graph Options toggles (and two more elsewhere in Settings) now use
  the same pill styling as other toggles instead of a bare switch.
## [0.1.7] — 2026-08-31

### Added
- **Links**: a bookmark shelf for websites, in a new Library sub-tab —
  save a URL, group them (a free-text group with a "/" convention for
  sub-groups, e.g. "Work/Reading"), filter by group or search text, pin
  favourites to the top. Saving a URL you already have warns rather than
  silently duplicating it.
- **References**: a note or document can now attach a saved bookmark,
  shown live in its editor (next to the note's related-notes panel, or the
  document's Outline sidebar), with a picker to attach one and a one-click
  way to remove it.
- **Contents**: a new Library sub-tab with a hyperlinked outline of the
  whole notebook, grouped by category or by tag — click a note to jump
  straight to it. The fast, scannable companion to the Graph tab's spatial
  view, not a replacement for it.
- The Library "All" tab's create button now opens a "What would you like to
  create?" picker when the active filter has no single obvious answer
  (Everything, Files, Tags, Drafts, Activity, the bin), instead of always
  defaulting to a new note.
- A global Ctrl+F find bar that works on every tab.
- The image/document lightbox gained a real actions bar (zoom, copy text,
  save), drag-to-pan while zoomed, document previews (not just images), and
  the gallery's AI actions (caption, extract notes).
- A related-notes panel that updates live while editing a note, not just
  when you click to reveal it.
- The AI can now read a note's attached files (PDFs, code, text) when that
  note is hand-attached to a chat turn — previously only attached pictures
  were read; other attachments were invisible to the model.
- Meeting-note transcripts get an AI-generated "Decisions" / "Action items"
  summary block prepended automatically when saved as a note, best-effort
  and non-blocking if the model is unavailable.
- `tags:<N` filter syntax, for finding notes with fewer than N tags.
- Pre-save tag suggestions when writing a new note, not just after saving.
- The Timeline gained a thread-line view (threads rendered as tributaries).
- Whiteboards gained bring-to-front / send-to-back for shapes.
- Graph traversal is now weighted by link type and confidence, and a
  double-click node pin persists across reloads instead of resetting.
- Per-stage token accounting, surfaced in the chat metadata line.
- The Library's "All" grid, the Documents sub-tab, and the Reminders tab's
  Done group are now paginated instead of rendering everything at once.
- A status-bar clock detail popover (seconds, date, timezone) and a
  navigation-history popup on the status bar's Back/Forward buttons, plus
  back/forward keyboard hotkeys.
- A "?" syntax guide on the capture composer, matching the one already on
  the notes filter.

### Fixed
- An attached chat document's extracted text never actually reached the
  model — the attachment showed in the composer but the AI couldn't see it.
- A private note could leak its content via `restore_note` while the vault
  was locked.
- The Documents kebab dropdown's real transparency bug (not a z-index issue,
  the background itself was never opaque).
- Whiteboard boards could vanish entirely once emptied of shapes.
- OCR picked the wrong model by priority in some configurations; Tesseract
  availability is now surfaced instead of failing silently.
- The lightbox's zoom-out cursor bled into its info panel.
- The Timeline thread view's band labels overlapped their own dots; lanes
  now space dynamically so dense clusters can't bleed into a neighbour.
- The "Your notes" filter help button (and the capture composer's own "?"
  button) didn't match the app's other circular help-toggle buttons — first
  a markup/class mismatch, then, reported again, a `.library-toolbar button`
  CSS rule silently overriding the circle's height back to the toolbar's
  shared control height while leaving its width alone, stretching it into
  an oval. Both are now fixed.
- The chat composer's file picker accepted types the backend would then
  reject; the two lists are now kept in sync and pinned by a regression test.
- Several real Settings/Skills spacing bugs found by a live measured audit,
  and the Library's context-aware create button now follows the active
  filter instead of always creating a plain note.
- Settings → Logs' "View Logs" button called a function that didn't exist.
- The graph's force simulation kept running in the background (burning CPU)
  after leaving the Graph tab.
- The gallery's kebab menu could render off-grid and get clipped.
- The Documents dock row's alignment, and every scrolling tab strip now
  fades at its clipped edge instead of cutting off abruptly.
- Several CodeQL alerts closed: a path-injection sanitizer, an exception's
  raw text reaching the user, and related lint findings.

## [0.1.6] — 2026-08-30

Follow-on fixes and features added to the 0.1.5 branch after that release was
tagged, ahead of the PR merging.

### Fixed
- A `keydown` handler on the graph map hijacked keystrokes typed into a note's
  popup or the "Grow the map" form — Space/Enter reopened the wrong note
  instead of typing a space or submitting. Now ignored while the event target
  is an input, textarea, select, or contenteditable element.
- An unhandled exception anywhere inside `run_agent`/`run_skill`, outside the
  cases those functions already caught themselves, killed the chat stream
  with zero rendered output. Both the first-event fetch and the per-payload
  drain loop are now wrapped, so a real failure still reaches the user as an
  answer instead of a silently dead connection.
- The Image Gallery's kebab menu could render off the right edge of the grid;
  replaced a `nth-child(3n)` heuristic with a measure-and-flip listener.
- The AI Skills page was unusable below ~900px (fixed two-column grid, a
  sticky sidebar with nowhere to go).
- A private note's new "decrypted" audit-log entry could fire while the vault
  was locked — `readable_content()` returns a placeholder, not the real text,
  when the vault has no key, so a locked-vault read logged a decrypt that
  never happened.
- `<summary>`-based icon buttons (the kebab/ellipsis menus) were off-centre —
  the centring CSS selector only ever matched `<button>`.
- The "Your themes" section in Settings → Appearance had a `-stack` class
  that only overrode `align-items`, not `flex-direction`, so a row with more
  than two children never actually stacked.
- The llama.cpp extra's "unavailable" message implied the app doesn't talk to
  llama.cpp at all; it already does, via `llama-server`'s OpenAI-compatible
  API — only in-process `llama-cpp-python` embedding is unbuilt.
- The Capture tab's "File under" row could run its later buttons off the
  card's right edge instead of wrapping — `.capture-field-row` claimed to
  wrap but never set `flex-wrap: wrap`.
- The Image Gallery's kebab button had square corners: the base `button`
  rule's `border-radius` never reaches a `<summary>` element (it is a
  `<details>` disclosure, not a real button) — the centring fix above this
  same element already got was never joined by one for its corners.
- The lightbox's prev/next arrow icons sat visibly off-centre — inherited
  padding (`0.5rem 1rem`) the sibling close button already resets shrank the
  centring box to less than the glyph's own width, and CSS Grid's "safe
  centre" fallback shifted the oversized glyph to the padding box's edge.
- A tool call a model wrote as text instead of using the structured
  tool_calls field (small/local models do this routinely) silently failed
  to recover whenever its `arguments` were themselves an object or array —
  an entirely ordinary shape — because the fallback regex could not match
  across a nested brace. Replaced with a real brace-balanced scanner.
- `PUT /preferences` logged an audit-log ("Activity") row for every key
  changed, `ui_state` (the interface's entire theme/appearance state behind
  one key) included — a slider drag read identically to changing the model
  backend. Cosmetic/one-shot keys no longer write an audit row; the
  preference itself still saves exactly as before.
- The Library's Activity cards clip long entries at 400 characters
  server-side with no way to see the rest — clicking one with nothing to
  jump to (most of them) now opens the full, un-clipped text.
- The image gallery's popup menu could still run off the *left* edge on a
  narrow (single/two-column) gallery — the existing flip logic only ever
  corrected right-edge overflow. Now clamped back into bounds after the
  flip decision, regardless of which edge or how narrow.
- `renderLibraryDocuments()` and `renderLibraryBoardsGallery()` overwrote
  the Library's empty-state element's `textContent` on every render (to
  show a "no search match" message) — harmless while that element was a
  plain line of text, but it silently erased any richer markup put there
  instead. Found while giving those two subtabs the same icon+title empty
  state "All" and Image Gallery already had (below); the "no match" case
  now has its own sibling element instead of overwriting the real one.
- The "Detailed" response length preset could come back with no answer at
  all, or a much shorter one than promised — the same shared
  thinking/answer token budget already documented as a risk in
  `test_thinking_budget.py` ("1,024 shared between deliberation and answer
  is the same trap in a larger size"). Detailed's own prompt explicitly
  asks the model to reason through the notes, inviting more deliberation
  than Normal or Quick, but got the same flat 1,024-token thinking
  allowance as both — a verbose reasoning model given more to think about
  and no more room for it starved its own answer. Detailed's allowance is
  now 3,072 tokens.
- The launcher's PowerShell splash (`scripts/splash.ps1`) never called
  `[System.Windows.Forms.Application]::EnableVisualStyles()` — without it
  WinForms renders every control with the classic, unthemed renderer, and
  the classic renderer does not animate a Marquee-style ProgressBar at all,
  regardless of its colours (a second, independent cause of the "bar just
  stays empty" symptom already fixed once by removing its ForeColor/
  BackColor). Not verified live — this sandbox has no Windows/PowerShell
  runtime to run it on; the fix is standard WinForms practice and matches
  the documented behaviour, but say so plainly rather than claim it's seen.
- The boot splash (`#boot-splash`, shown for the one `/auth/status` round
  trip on every page load) had three bouncing dots but nothing that read as
  progress. Added a bar that crawls toward ~90% on its own and snaps to
  100% the instant the real request resolves, so it never claims to finish
  before the work behind it does.
- The Library's "Activity" filter chip could land alone on its own row,
  looking like a stray pill under the others — `.library-chip-activity`'s
  `margin-left: auto` (meant to push it to the end of the row) fights
  `flex-wrap` the moment the chips before it don't all fit on one line, and
  a wrapping auto-margin item gets shoved onto a lonely row of its own. The
  chip is already last in DOM order, so the divider alone does the job;
  dropped the margin.

### Added
- `notebook_overview`, an AI tool combining `list_categories` + `list_tags`
  + `count_notes` into one call — a skill wanting "the notebook's shape"
  (Notebook health check, Tidy suggestions) needed three round trips for
  numbers this app already had cheap SQL for.
- `llama-server`'s own `/props` is now probed as a context-length source
  (ROADMAP.md item A.2) — a real number (the `-c` it was started with) in
  place of the guess-from-model-name table, for plain llama.cpp servers
  that report neither `loaded_context_length` nor `max_context_length`.
- Exporting a single note as a `.md` download (`GET /entries/{id}/export.md`),
  mirroring the document export that already existed — a "Download .md"
  item on a note's overflow menu and its Library card menu.
- A tip under the custom-template textarea (Settings → Templates) saying
  `{date}` resolves to today's date — the substitution already worked for
  any template (`applyTemplate()` does a plain string replace), including
  user-made ones; it just wasn't discoverable without reading the source.
- The Library's Documents, Whiteboards, and Image Gallery subtabs now get
  the same icon+title empty state their "All" sibling already had, instead
  of a bare line of muted text (BACKLOG.md §95 item 16).
- A plain-language "what this means for you" line under Settings → Models'
  spec table, computed from the model's real context window (BACKLOG.md
  §95 item 2).
- Settings → Background tasks' finished-jobs list now shows which model did
  the work (captioning, OCR, the autonomous pass), when the job recorded
  one — the data already existed, it just wasn't rendered (BACKLOG.md §95
  item 3).
- macOS gets a launch splash too now — a non-modal `display notification`
  banner (never steals focus, unlike `display dialog`) showing the same
  phase text the Linux/zenity dialog already showed. Asked for directly.
- Recency and pinning are now a search-ranking signal (BACKLOG.md §95 item
  6): hybrid search's candidates are reordered by pinned-first /
  most-recently-touched and fused in as a third ranked list, the same rank-
  position fusion the existing semantic/keyword combination already uses —
  never a new source of matches, only a reorder of notes a real search
  already found relevant.
- The Quick sketch pad's highlighter had no visible transparency — "basically
  a thick pen." `sketchMove` kept extending one open canvas path with
  `lineTo()` and calling `stroke()` on every pointer-move without ever
  starting a fresh path, so `stroke()` re-drew the *entire accumulated path*
  each time, not just the newest segment — a stroke ten points long got its
  first segment recomposited ten times. Invisible on the plain pen (opaque
  drawn twice is still opaque) but at the highlighter's 0.35 alpha, ~10
  overlapping passes already reads as ~99% opaque. Fixed by reopening the
  path from the current point after every stroke, so each call draws its one
  new segment exactly once. Verified by sampling canvas pixels before/after
  a multi-point stroke — the repeatedly-touched start and the once-touched
  end now composite identically.
- CodeQL alerts on `main` (user-pasted screenshots): #289/#290
  (`py/path-injection`, High) — a second fix attempt for this same alert
  still didn't close it; researched CodeQL's actual sanitiser model
  (`Path::SafeAccessCheck`'s only recognised Python shape is a bare
  `x.startswith(base)` as a guard's sole condition) and simplified
  `_within_exports` to match it exactly, dropping the compound condition
  and computed `+ os.sep` argument that likely broke pattern recognition
  the second time. #296 (information exposure through an exception,
  Medium) — `routes_chat.py`'s error-fallback path sent a raw exception's
  `str()` straight to the client; now goes through `safe_value`, the same
  sanitiser `librarian.model_error_message` already uses for the identical
  shape. #319 (duplicate `import re` in a test function), #320/#321
  (mixed implicit/explicit returns in `ollama_client.py`/`openai_client.py`'s
  retry-loop `chat()` methods — added an unreachable trailing raise so the
  function reads as exhaustive).
- Three more Preferences toggles ("Mute notifications except reminders",
  "Let the AI use this profile...", "Allow web search when I ask for it")
  had the same bare-`<label>`-missing-`.check-row` bug as Settings → About's
  five — swept the whole file for the pattern (`<label>` directly wrapping
  a checkbox, no class) rather than trusting the one page already fixed was
  the only one.
- Settings → Help's "Related" links could only ever open another Settings
  section — a topic about a real *tab* (Reminders, Graph, Library…) had
  nowhere to send you but a settings screen that only tangentially mentions
  it. Added `[data-goto-tab]`, the same delegated-click pattern as the
  existing `[data-goto-section]`, closing the modal and switching tabs
  directly. Wired up for every topic with a real tab to go to (Capturing
  notes, Asking & chatting, Skills, Graph, Reminders, Dashboard, Library,
  Timeline); Reminders and Dashboard also gained the Settings links they
  were missing (a notification-mute toggle, the dashboard greeting name —
  both in Preferences). Skills, What it remembers, Spaces, Appearance and
  Keyboard shortcuts have no tab of their own, so no tab link was added for
  those — a manufactured one would be worse than none.
- Arrow-key navigation on the command palette (34+ commands, only ~7 visible
  at once) never scrolled the selected row into view past the first
  screenful — confirmed live (15x ArrowDown left the active row off-screen).
  `renderPalette` rebuilds the list from scratch every keypress, so there
  was never a focused/tracked element for the browser's native
  scroll-on-focus to follow; `.active` is a plain CSS class on an unfocused
  `<li>`. Added an explicit `scrollIntoView` after each move; the same
  defensive fix went onto the Notes list's roving-tabindex navigation and
  the `[[wiki-link]]` autocomplete popup for consistency.
- Every `.small.icon-only`/`.small.icon-button` control (Settings modal's
  back/forward nav arrows, plus several search/sort/filter icon buttons
  elsewhere) rendered oversized and square-boxy — 43px next to a 30px
  "Close" button beside it. `.small`'s own horizontal padding
  (01-forms-settings.css, a later file) was clobbering `.icon-only`'s
  intended padding (00-tokens-shell.css) for the shared physical left/
  right sides, whichever file happened to load second winning regardless
  of which rule actually fit an icon button — `aspect-ratio: 1` then
  squared that oversized width into an oversized height too. A compound
  selector fixes it generally (specificity, not file order), reported live
  with a screenshot against the Settings nav arrows specifically.
- Settings → About's five on/off toggles (three Updates, two desktop-only)
  were still bare `<label>` elements with no `.check-row` class — a prior
  pass's own comment claimed they'd been lined up with every other toggle
  in the app, but only the DOM order changed; the actual pill/box/hover
  treatment `.check-row` provides never applied. Reported live with a
  screenshot ("make the toggle lines and buttons the same as the semantic
  buttons or the attached image"). Now genuinely `.check-row`, matching
  Autonomous Background AI's toggle directly above them on the same page.
- A search box and a rename/delete kebab menu on the Whiteboards subtab's
  board cards, matching the Documents subtab beside it.
- An opt-in clock in the bottom status bar (Settings → Appearance).
- Settings → About redesigned into the same boxed sections every other
  settings page uses; Settings → Help's "Settings → X" mentions are now
  real links to that section, plus two new ones for topics that had none.
- The status bar's back/forward now cover opening Settings and moving
  between its sections, not just the tabs and sub-tabs it already tracked —
  including a second copy of the two buttons in the Settings header itself,
  since the modal overlay sits above the status bar's own.
- Meeting Notes as a real Library filter chip (tag-based, alongside the
  existing kind filters), after two non-functional attempts at a sub-tab.
- AI Skills cards: expandable step/tool lists via `<details>`, and the
  "Run in the background" master toggle separated from the two worker
  toggles it gates.
- A way to attach an image already in the library to a note, without
  re-uploading it.
- Backup retention count as a real Settings → Data control (was already a
  hard-coded, always-enforced cap; now a preference, prunes immediately on
  change).
- A Restart button in Settings → About on the desktop build.
- Four missing topics in Settings → Help, and an explicit answer to whether
  the chat has `/` commands (it doesn't).

### Reverted
- A mechanical check flagging a skill step "failed" if its own instruction
  named one of the skill's tools by identifier and that tool was never
  called — real steps that conditionally act on "each X" legitimately call
  nothing when there is no X, and the check could not tell that apart from
  a step that should have called it and didn't. Reverted before merging;
  see HANDOVER.md §97 for what would be needed to attempt this safely.
- Minimise-on-Quit (`js_api=bridge` on `webview.create_window()`): caused a
  real hang on Windows — a recursion storm in `window.native` COM property
  access on the WebView2 UI thread. Fully reverted; root cause confirmed,
  not re-attempted this release.

## [0.1.5] — 2026-08-30

A correctness and cost release. The headline items are a chat bug that could
file an answer under the wrong conversation, a prompt that spent more on tool
schemas than on the user's own notes, and a Restart button that killed the
packaged app.

### Fixed — a chat turn could be saved into the wrong conversation

`chatConv` is reassigned when you switch chats, and every save read it *live* —
at each checkpoint and again when the turn finished, minutes after the send. So
switching mid-stream wrote the finished answer into whichever conversation was
open when it landed, or made a new one out of it. Visible only as the message
and the generating bubble vanishing.

A turn now pins its conversation and only touches the header, usage meter and
composer while that conversation is on screen. Leaving one mid-answer keeps the
live nodes and re-attaches them on return, so the reply continues in front of
you rather than appearing all at once at the end, and the notice names the
thread that is actually being answered instead of the one you just left.

### Fixed — the tool-call disclosure was permanently open

A chip rendered as its label with the entire raw result stuck to it. The
disclosure was built correctly; `.tool-chip-body` set `display: flex`
unconditionally, and an author rule beats the user-agent rule that hides a
closed `<details>`. It collapses now — one line, click to see the arguments and
the result.

### Fixed — the glass sheen made dialogs unreadable in light mode

The sheen used the `background` shorthand, which re-declared the fill as
`--card` at a specificity that beat `.modal-card`'s deliberately near-opaque
`--modal-bg`. Turning the sheen on quietly reverted every dialog to full page
glass. It layers as `background-image` now, and is halved in light mode where a
white sheen on a near-white surface only flattens it.

### Fixed — an off toggle switch looked like a blank gap

The track was 7% alpha inside a 10% border: invisible on a card, so an unchecked
switch read as empty space. Reported twice, on the semantic-search and
smart-model-routing controls.

### Fixed — Restart from the tray killed the packaged app

`os.execv(sys.executable, [sys.executable, *sys.argv])` is right from source,
but in a PyInstaller build both are the .exe, so the executable's own path
arrived as a positional argument and argparse exited — with no console to print
to. Open and View Logs also failed to raise the window when it was merely
behind something.

### Added — advanced response settings, detected per model

Top-k, top-p, min-p, repeat penalty and the repeat window, in Settings →
Models. Values start at what the model itself recommends: a GGUF ships its
author's parameters and Ollama reports them in `/api/show`, which the app was
already fetching and discarding. Each row says whether a number came from the
model, the task, or you, and only what you change is stored — so switching
model still picks up the new one's recommendations.

### Added — a separate OCR model, and scanned PDFs that actually read

Rasterising a PDF does not read it; it makes a picture a model still has to
read. A general vision model describes an invoice, a document reader
transcribes it — so OCR has its own setting, and automatic mode prefers an
installed reader (GLM-OCR, DeepSeek-OCR, PaddleOCR-VL) over a general VLM.

`core/pdfpages.py` supplies the pages, behind an optional ~16 MB extra. The
path had never once executed before: `docview.extract` has always taken a
vision reader and its only caller passed nothing.

### Added — the chat attach button takes any file

Images to the gallery as before; anything else is imported as a document with
its text extracted. Four verified OCR models were added to the suggested list.

### Added — a splash during the pre-launch work

The git pull, venv build and pip install all happen before Python exists, so no
window could cover them. Now one does, on Windows and on Linux under zenity.

### Changed — the prompt costs a quarter less on a small model

Measured on an 8k window with eight notes and no history: 32% of the context
before the conversation started, with tool schemas costing nearly twice the
user's own notes. Now 23%. Schemas are trimmed before any tool is dropped —
dropping one changes what the app can do — and the tool guide has a short form
below 8k.

### Changed — tool selection reads words, not substrings

`ai/toolwords.py` replaces substring matching, which offered the tag tools for
"my vintage camera" and the link tools for "blinking lights". It ranks rather
than gates, tells a question about a capability from a request to use it, and
stays a suggestion the model may overrule — reaching for an unoffered tool now
widens the set for the rest of the turn.

### Changed — a 500 on the tools path falls back instead of failing

Ollama answers 400 for a model that declares no tool support, but a model whose
chat template breaks answers 500 — common on community re-quants. The app now
retries the same request without tools to tell that apart from a real outage,
and falls back to a plain answer rather than failing the turn.

### Fixed — two buttons wired to nothing

Settings → About's "Take tour again", and the Whiteboards Reload button. After
accounting for ids built at runtime there are now zero interactive elements in
the page without a handler.

### Fixed — whiteboard panels collided below 1180px

The tools row and the zoom cluster shared the bottom edge; by 900px the tools
row ran off the canvas. Verified clean at eight viewports from 1920 to 600.


### Fixed — the Documents Library sub-tab looked nothing like the rest of the app

Reported bluntly and repeatedly: "SOOOO ugly and not consistent with the
other application design style." Root cause, found by screenshotting it
beside the "All" library view: its rows had no scoped CSS at all, so every
one fell through to the app's default filled button style — a solid-accent
bar with the title and word count crammed onto one line. Given a document
icon and a proper card look (border, hover state, title/meta on separate
lines) matching the rest of the Library. Verified in both themes.

### Added — back/forward now covers switching between saved chats

Opening a different saved conversation, or starting a new one, is now a
real history step — Back/Forward restores the right chat. Fixed a genuine
async-ordering bug in the process: `stepTabHistory` now awaits
`openConversation` on that branch, because `openConversation` calls
`recordTabVisit` itself only after a network fetch — without the await,
every Back/Forward through a saved chat would have recorded a spurious new
entry rather than being a no-op. Caught live via Playwright before it
shipped.

### Added — onboarding can pull a model and seed example notes

The first-run tour's "Your setup" slide now makes two one-click offers,
neither automatic: download a starter model when Ollama is running but none
is installed, and add five short, linked example notes when the notebook is
genuinely empty — so the Graph, Timeline and Dashboard have something to show
before your first real note. Seeding refuses server-side on any notebook
that already has a note, so it can never run twice or land on top of real
work.

### Added — "Build a skill", a built-in skill that writes skills

Interviews you about a job you do often — what it should do, whether it
touches your notes, what should be fill-in-the-blank each run — then saves it
as a real skill with `save_skill`: ordered steps and an actual tool
allowlist, not a paraphrase saved as a sentence. Checks `list_skills` first
so a near-duplicate ask reuses or refines what's already there instead of
shipping a second copy.

### Fixed — the "AI isn't available" pill could be wrong while Ollama was up

`/models/status` used to probe Ollama twice on every poll — `is_running()`
and `list_models()` both hit its own `/api/tags` — which could take up to 7s
combined against the frontend's 5s abort on that exact call. One reachability
check now does both jobs, and the frontend's timeout has real headroom above
the new (lower) worst case instead of racing it at the wire.

### Fixed — the agent's "View" button after deleting a note pointed nowhere

A destructive result reused the same navigation as every other change, which
only ever looks in the ordinary notes list — a note the agent just moved to
the bin was never there, so the button silently found nothing. It now opens
the Library's own Bin filter and highlights the note there, which is the one
place a binned note actually lives.

### Added — a minimap and saved views for the Graph

A minimap in the corner of the map shows every note at once with a rectangle marking what you're currently looking at; click anywhere on it to jump there, keeping your zoom level. Alongside it, **saved views**: name a combination of layout, colouring, filters and position, and come back to it later. Both were the missing half of "the graph is a tool" once a notebook gets dense enough that the force layout stops being readable.

### Added — the Library search box can search by meaning

Notes match on meaning as well as words, the same way the Notes tab already worked. Documents, chats, images and skills still match on their words — they have no embeddings — and the toggle says so rather than implying more than it does. Turning it on can only ever add results, never remove one.

### Added — chat history can expire

Saved chats had no retention policy at all and grew forever. Settings → Preferences now takes a number of days after which old chats are deleted. Off by default, and **pinned chats are never deleted, however old they are**.

### Performance — the notes list no longer builds the whole notebook at once

It renders what fits and fills in as you scroll, staying one continuous list rather than becoming pages. On a 1,501-note notebook that took first paint from 533ms to 16ms and the page from 31,680 elements to 4,306. The Library grid does the same.

### Fixed — 49 icon-only buttons were unnamed to a screen reader

Buttons across the whiteboard, sketch pad, document toolbar and status bar announced only as "button". A re-scan found 56 such buttons, not the 13 previously recorded.

### Fixed — several controls were too small to tap reliably

Measured across every tab: a tag chip one pixel under the 24px minimum, two toggle labels four pixels short, the Library's per-card selection tick at 13×13, and a link in Settings.

### Fixed — dropdown panels trapped keyboard focus

The previous release made every dialog trap Tab inside it, which was right for real dialogs and wrong for the notifications panel, the note picker, the graph popups and the help panels — those sit over a page that stays usable, so focus should be able to leave them.

### Fixed — the Agent Activity panel took a third of a phone screen

On the Graph tab in particular, where there is no way to scroll it out of the way, it left barely a third of the screen for the map. Its log area is now compact on narrow screens; it still scrolls, so nothing is lost.

### Added — the text-selection popup is now a kebab, with nine actions instead of three

Highlight text anywhere in the app and a single ⋯ appears; clicking it opens a menu that stays inside the window, flipping up or sideways near an edge rather than running off it. It now offers *Save as a note*, *Save as a draft*, *Add to a note…*, *Save with its source* (when the passage came from the web reader — a quoted clipping with a link back), *Copy*, *Search the notebook*, *Set a reminder*, *Extract notes…* and *Ask the AI about this*. The old three-button bar could not fit on a phone screen, never appeared for a touch selection or a keyboard one, and had no room to grow.

### Added — the selection menu is reachable without a mouse

A long-press drag on a touchscreen now raises the kebab (the popup listened for `mouseup` and nothing else before, so touch selections raised nothing at all), and a new rebindable `Ctrl+Shift+E` opens the menu for a selection made with Shift+Arrow.

### Fixed — the selection popup could render off the left edge of the screen

The clamp that was meant to keep it on screen was nested the wrong way round, so a popup wider than the viewport — which the old three-label bar was, on any phone — ended up at a negative left position instead of pinned to the margin.

### Fixed — arrow keys did nothing in most of the app's ⋯ menus

Arrow-key navigation was written inside the note card's menu specifically, so every other kebab menu — saved conversations, the sidebars, and the new selection menu — had none, even though they announce themselves as menus to a screen reader.

### Fixed — eight dialogs let keyboard focus escape behind them

The confirm and prompt dialogs, the image viewer, note history, the recycle bin, the skill-run panel, the agent command palette and the graph's connection dialog were all missing a focus trap, because the trap worked from a hard-coded list of dialogs that nobody adding a new one knew about. It now recognises any dialog automatically. The image viewer and command palette also gained the dialog semantics they were missing.

### Performance — the note list builds around 76% fewer DOM elements

Every note card was eagerly building its full 19-item ⋯ menu, hidden, at render time — and rebuilding it on every search keystroke, sort change and save. Menus are now built when first opened. Measured on a 1,501-note notebook: 133,748 elements before, 31,680 after.

### Performance — the notebook's list queries are served from an index

The `entries` table had no index on any of the columns its list queries filter and sort by, so SQLite sorted every live note in the notebook on each request. On a 20,000-note database the main list query went from 46 ms to 15 ms; saving a note is 0.02 ms slower.

### Performance — responses are compressed

The app served roughly 2.3MB of uncompressed frontend on a cold load, and uncompressed JSON besides. `app.js` is now 70% smaller over the wire (1071.7 KB → 320.1 KB) and `index.html` 75% smaller. Chat streaming, the weekly digest and the live log are unaffected — they still arrive incrementally.

### Added — a global Undo/Redo system

Two new buttons in the status bar (Undo/Redo), plus Ctrl+Z / Ctrl+Shift+Z, wired into note delete (single and multi-select), note creation, reminder delete, linking/unlinking notes, and note content edits (which covers attaching or removing an image, since that's just a content edit). Session-only, and deliberately steps aside for a text field's own native undo while you're typing in it.

### Fixed — the Ask tab's search-relevance button did nothing

`#ask-search-tune` existed in the markup with the right icon and tooltip, but no click handler was ever attached to it. It now opens the same Settings → Preferences "Search relevance" group its sibling buttons elsewhere in the app already jump to, and sits at the right edge of its row instead of squeezed against the mode chip.

### Fixed — draft notes appearing in Library and Graph

A draft is unfinished by definition, and the Notes tab already excludes drafts from its own note lists — Library's mixed "note" view and the Graph's node list didn't, so an unfinished draft showed up as a first-class card and graph node.

### Security — a real path-injection finding, closed

CodeQL flagged `POST /files/save`'s filename handling (`py/path-injection`) despite an existing whitelist sanitiser; the sanitiser is now built on `os.path.basename` and the write path is checked for real containment inside the exports folder before it's ever used.

## [0.1.3] - 2026-08-23

### Fixed — chat citation badges silently dropped in the Chat tab

The backend already computed per-sentence note grounding and sent a `grounding` event for any notes-related turn, but the frontend only ever rendered it in the Ask tab — the Chat tab never listened for the event at all, so a chat answer that clearly drew on specific notes named none of them. Each chat bubble now gets its own "Grounded in:" chip strip, the same one the Ask tab already had.

### Added — search-relevance help and quick-access links

Settings → Preferences → "Search relevance (advanced)" (minimum similarity, above-average margin) had no explanation and no way in except scrolling Settings by hand. Added a hover tooltip and a click-open panel explaining both numbers, plus three quick-access links — the Dashboard's Tools & Features catalog, the Ask tab's Matching Records heading, and Chat's per-turn matching-notes summary — that jump straight to the setting and highlight it.

### Added — an "Open exports folder" button, and a configurable export location

Graph PNGs, chat exports and the like landed in the app's data folder with only a toast naming the path. Settings → Data now has a button to open that folder directly (desktop app only), and a new preference to redirect where exports are saved, validated as a real, writable folder before it's accepted.

### Fixed — three preferences silently dropped by Settings

`auto_stale_review_enabled` (the autonomous stale/orphaned-note reviewer), `session_idle_ttl_minutes` (Settings → Account's sign-out timer), and `response_mode` (the Quick/Normal/Detailed picker) each had a working Settings control that saved without error but never actually took effect — some were never echoed back after saving (so the control looked reset on reload even though the saved value was in effect), one was never actually accepted by the save endpoint at all. All three now round-trip correctly.

### Fixed — the in-app package installer failing on the packaged Windows build

Reported by a real user: installing "Search by meaning" or dictation from Settings → Packages failed with a cryptic "unrecognized arguments" error and no visible cause. The installer was accidentally re-launching the packaged app itself instead of running `pip`, a mistake only possible in the installed .exe, not a source checkout — which is also the real explanation for two earlier, unresolved "pip install just fails" reports. It now finds a real Python on the system and uses that; if none is found, it says so plainly instead of failing mysteriously. The same fix was needed, and applied, to the SearXNG (private web search) setup process for the same reason.

### Fixed — a missing search-engine component in the packaged build

The packaged Windows app was missing four internal files needed for the optional local web-search engine (SearXNG) to install itself, producing a "module not found" error for anyone who tried. Fixed, and guarded against happening again for any future addition to that engine.

### Fixed — the background-activity notification visibly shrinking the Chat tab

Reported and reproduced live: opening the small "Agent Activity" notification panel while on the Chat tab visibly shoved the whole conversation — messages, the composer, the Send button — up the page. The panel was never meant to overlap the conversation at all (only the chat list beside it), so the leftover spacing rule causing the squeeze was removed.

### Added — a one-click fix when the built-in search engine can't install

If the offline "search by meaning" engine can't be installed (a known limitation on some systems), Settings → Models now offers a single button to switch to an equivalent Ollama-based engine (nomic-embed-text) instead — downloading it and switching over automatically, rather than requiring several manual steps across two different settings panels.

### Changed — the in-chat "Web" toggle now visibly shows when it's off

The web-search toggle in the chat composer looked identical whether it was on or off, which made it easy to overlook that it was left on (or think it was on when it wasn't). It now dims clearly when off, while staying just as easy to turn on.

### Added — automatic updates for the packaged Windows app

Settings → About can now download and install a new release itself — no more being sent back through a browser to redownload and re-run the installer by hand. A popup after login offers it the moment a real release is found (once per version, not every login); Settings → About has the same "Update automatically" action as a manual fallback. Two new, separate switches: whether the app may check GitHub for a release at all, and whether it may apply one automatically once found — turning either off is respected everywhere, including the popup. A "choose a specific version" picker lists recent releases directly in Settings, and a "track the main branch" channel option is now a real, storable preference (main-branch tracking itself still reports honestly as not yet available — no nightly-build pipeline exists yet to make good on it). Every step — checking, downloading, and applying — degrades cleanly when offline or blocked by a firewall/antivirus, and a failed attempt can always be retried, either from the next login's popup or by hand in Settings. Source checkouts (`start.sh`/`start.bat`) already auto-update on every launch via `git pull`; they now default to tracking main (since that's what they're actually doing) and show their own "you were just updated" popup after a real update, using the same mechanism.

### Fixed — a background embedding-model install failure now retries itself

Reported by a real user: when the BGE semantic-search model failed to install, the app fell back to a lower-quality model and stayed there, even after the underlying cause (a transient `pip` failure) resolved itself. A missing `sentence_transformers` package now triggers one automatic reinstall attempt in the background, and search quality recovers on its own once it succeeds — no more permanently stuck on the fallback after a one-off install hiccup.

### Added — search inside uploaded images (OCR), and a search box for the Image Gallery

A whiteboard photo or a scanned page attached to a note used to sit as an opaque file — nothing could search what was actually written on it. Uploaded images now get local OCR text (Tesseract, running entirely on your machine, in the background so uploading never waits on it), and the Library's Image Gallery has a new search box that matches against both filenames and that extracted text — "what was on that whiteboard photo from March" is now answerable by typing a word from it. Entirely optional: without Tesseract installed, images just upload normally with no OCR text, nothing else is affected. Settings → Packages can now install this feature like any other optional extra, and tries to install the Tesseract program itself automatically too (winget/brew/apt/dnf/pacman, whichever this computer has) rather than only pointing at manual instructions.

### Fixed — a security review found two real issues in the new auto-update code, both fixed

`POST /update/apply`'s specific-version picker built a GitHub URL from the requested version without checking its shape first; it now only accepts a real release-tag pattern. A failed install used to report the raw system error, which on Windows could include a local file path; it now reports a safe, generic message while the full detail still goes to the app's own logs.

## [0.1.2] - 2026-08-23

### Added — Dev view / User view console mode, a terminal-style log view, advanced search settings

A first-run choice, and a live Settings/tray toggle, for whether the desktop app keeps a console window open ("Dev view") or runs with none at all ("User view"). The mechanism is a relaunch — a detached `pythonw.exe` that never allocates a console — rather than hiding one already created, after "hide console" reports turned out to trace to Windows Terminal/ConPTY returning a handle to a hidden pseudo-console host rather than the real window. Settings → Logs gained a List/Terminal toggle rendering the same records as raw console-style lines, the GUI answer to User view hiding the real thing. Settings → Preferences gained "Search relevance (advanced)" (minimum similarity, above-average margin, reset to default) for tuning semantic search directly instead of only via a code constant.

### Fixed — a sign-out bug in the console-mode feature above, found the same session it shipped

The first-run popup could fire before real sign-in, fire again after, and randomly sign the user out. It guarded only on a preference flag that read as "unseen" during a stale-token bootstrap pass (not just "not yet answered"), and it called the same route Settings/tray use to live-restart the desktop process — killing the in-memory session mid-login and racing its own "mark this answered" write against that exit. The popup now requires the preferences fetch to have actually succeeded, and never restarts the process itself.

### Fixed — semantic search returning irrelevant results

An unrelated note scored 57% cosine similarity for an unconnected query. The similarity floor assumed "0 means unrelated," which doesn't hold for the current embedding model (BGE-family, anisotropic — unrelated notes routinely land at 0.4-0.6). Added a second, relative floor from each query's own score distribution, self-calibrating rather than a fixed number.

### Fixed — larger local models timing out or failing to respond

Both the Ollama and OpenAI-compatible clients defaulted their request timeout to 120s, unconfigurable — too short for a cold load of a model past roughly 4B parameters on modest hardware. Raised to 600s, and Ollama chat requests now ask the server to keep a model loaded for 30 minutes of idle time instead of its own 5-minute default.

### Fixed — drafts

The primary Capture box had no way to save a note as a draft at all (only three other, less obvious paths did); it does now. Drafts were also never actually surfaced in the Library despite being documented as such — the sub-tab didn't exist — and, separately, kept showing up in All notes and category views, undercutting the point of a separate Drafts section. All three fixed.

### Fixed — a batch of smaller reports

The Image Gallery lightbox miscounting images when one's backing file was missing on disk; the tool-call output panel in chat truncating to 300 characters for no reason tied to cost (raised to 4000); a long model id pushing the chat header's buttons onto their own row; a form-alignment gap in Capture's "File under" row; the AI never seeing the similarity score or matched keyword terms behind its own search results, despite that data already existing for the frontend's badges.

## [0.1.1] - 2026-08-18

### Fixed — two system tray bugs

Both reported directly, right after v0.1.0 shipped. "View Logs" opened
Settings → Logs unconditionally, reaching straight past the lock screen if
the app was locked — now it only jumps into Settings when `#lock-overlay`
isn't showing, otherwise it just brings the (still locked) window forward.
"Quit" closed the window but left the process running in its terminal —
`window.destroy()` runs on the tray's own thread, not the main thread
blocked inside `webview.start()`, and a cross-thread destroy call isn't
guaranteed to unblock that wait. Quit now hard-exits the process directly,
the same trust `_restart`'s `os.execv` already places in a clean exit
being unnecessary here.

## [0.1.0] - 2026-08-18

### Added — an allowlist for note attachments

Reported directly: `POST /entries/{id}/files` (the generic "attach a file"
button on a note) had no file-type validation at all — anything uploaded,
video included. `/media/upload` (pasted/dropped images) already had a real
allowlist for a stored-XSS reason specific to that route; this one is
broader (attachments download rather than render inline) but still refuses
video, audio and executable shapes with a clear 415, while covering images,
PDF, common office formats, and text/code files. Audio specifically is
tracked as a real feature to add (BACKLOG §75 — capture, playback, a
library page) rather than a permanent refusal.

### Changed — a themed dialog for the document word-count goal

Was a bare `window.prompt()` — functional, but the only dialog in the app
with no app styling, font or theme at all. Reported directly. Now a `card
space-dialog` matching every other small dialog in the app (the space
create/rename/delete ones, the documents-storage one).

### Fixed — three UI issues at the top of the Documents sidebar

All reported directly, with a photo. (1) The document title input had no
floor on how far it could shrink, so on a narrow window it was crushed to
a few illegible pixels before the toolbar ever wrapped its buttons onto
their own row — given a real minimum width, the toolbar now wraps instead.
(2) The four new help-tooltip circles (below) rendered as ovals, not
circles, everywhere except the Graph/Timeline tabs — `--control-h`, the
custom property they sized themselves against, is only declared in a
handful of scopes, and silently resolved to nothing everywhere else,
falling back to `button.small`'s asymmetric padding. Fixed with a literal
size instead of a token that isn't always in scope. (3) The Documents/
Outline pill toggle's "Recent"/"+ New" row was reserving the same
right-side clearance for the collapse toggle that the tab strip above it
already reserves, even though the toggle only ever appears once — "+ New"
sat well short of the sidebar's real edge with dead space beside it. Given
its own clearance instead, plus a little extra beyond the bare minimum for
visual breathing room next to the toggle.

### Fixed — the sidebar collapse toggle escaping to the page's top-left on a phone

Reported directly: the collapse toggle (Notes, Chat and Documents sidebars
alike) could render pinned near the very top of the viewport, over the app
header, instead of in its own sidebar's corner. The toggle is `position:
absolute`; two separate mobile breakpoints set its sidebar to `position:
static` to disable the desktop sticky behaviour, and `static` doesn't
establish a positioning context for an absolutely-positioned child, so the
toggle fell through to the page's own initial containing block. `position:
relative` disables sticky the same way while still containing the toggle.

### Removed — two dead files at the repo root

`find_emojis.py` was an unreferenced one-off debugging script (scanned
`app.js` for stray emoji during a past cleanup pass); `mkdocs.yml`
configured a docs site nothing builds — no CI step, no Makefile target, no
`mkdocs` dependency anywhere, and the real GitHub Pages site is the
hand-built `docs/index.html` renderer. Asked for directly.

### Added — help tooltips on Timeline and the three Library subtabs

Asked for directly, matching the existing Graph tab pattern. The Timeline
toolbar and the AI Skills, Whiteboards and Image Gallery subtabs each had a
permanently-visible subtext paragraph explaining what the screen does;
replaced each with a `?` icon button (native `title` tooltip on hover, a
click-to-open panel for the full explanation) so the space is available for
content on every later visit instead of repeating itself. The four new
toggles and the original `#draft-help` one now share a single
`initHelpToggle()` function in `app.js` instead of four more copies of the
same click/outside-click/Escape listener trio. Verified live: all five
panels are hidden by default, open correctly positioned under their button,
and close on outside-click and Escape.

### Fixed — sketch/attachment images rendering below a note's metadata

Reported directly ("attached sketches are below note metadata"). The note
card built its attachment thumbnails and appended them to the list item
*after* the metadata footer was already appended, so images and sketches
always rendered under the category/date line instead of above it. Fixed by
inserting the attachment row before the metadata element rather than
appending after it. Verified live: attachments now render above the
metadata footer in the note list.

### Fixed — two error-prevention gaps

Asked for directly. `deleteAskHistoryTurn` deleted a Q&A permanently with
no confirmation or undo — its own "clear all" sibling already confirms,
this didn't. Now it does. A reminder's `due_at` could be set in the past
(create and edit both) with no check, silently creating a reminder that
could never usefully fire — `POST /reminders` and `PUT /reminders/{id}`
now reject one more than a minute in the past (a small clock-skew/latency
allowance, not real slack) with a clear 422.

### Fixed — Library thumbnails for pasted/dropped images, not just sketches

Asked for directly ("make the sketches render... the same as how images are
visually displayed"). Found the opposite of the assumed direction: sketches
already got a Library thumbnail (a real `Attachment`), but a note with a
pasted or dropped image — inline markdown in the note's own text, no
`Attachment` row — got none at all, and its title/preview showed the raw
`![alt](url)` syntax literally. Root cause: `routes_library.py`'s
`thumb_by_entry` only ever looked at `Attachment` rows, and `_clip()` never
stripped inline markdown the way `routes_graph.py`'s node-label preview
already did.

Fixed by factoring the shared fix out (`manager.strip_inline_markdown`,
reused by both `routes_graph.py` and `routes_library.py` instead of two
near-duplicate regexes) and adding a `thumb_url` fallback — the note's own
first inline image, same URL shapes the note editor itself already renders
— checked only when there's no `Attachment` thumbnail, so a sketch's own
drawing always wins over anything mentioned in its caption. Extended to the
recycle bin and archive views too, which had no thumbnails of either kind
before. Verified live: a pasted-image note and a sketch note both show
correct thumbnails in grid and list view, with clean (non-markdown) titles.

### Added — pagination for `GET /entries`

Requested directly ("that is a real app feature... probably needed for
real world use"). `GET /entries` was genuinely unbounded — every note in
the notebook, every load, no matter its size. Now takes `limit`/`offset`
(default page 1000, hard ceiling 5000) and reports the true total via an
`X-Total-Count` header. `entry/manager.py` grew matching params on all
three list functions plus three new count helpers — additive, so every
existing in-process caller is unaffected.

`app.js`'s `loadEntries()` fetches pages in a loop, painting the first
page immediately and filling the rest in the background; every one of
`allEntries`'s ~30 read sites needed zero changes, since it still ends up
exactly as complete as it always was once loading finishes. Caught and
fixed in the same pass, by grepping every `/entries` call site rather than
assuming the new default was safe everywhere: three dashboard widgets each
independently re-fetched the whole list and would have silently truncated
past 1000 notes (wrong tag counts, most seriously) — now they reuse
`allEntries` instead. Also removed dead code found the same way: `copyLogs()`
built and fetched an `/entries` URL it never used.

Verified live: seeded 2500 notes, confirmed exactly 3 page requests fire,
`allEntries` and the status bar both land on the true total, all rows
render, and the dashboard's widgets show correct totals with zero console
errors.

### Fixed — backend hardening pass

Requested directly ("harden the backend, make sure it's robust"); found by a
targeted audit rather than guessed at, each verified live before being
called fixed:

- `GET /graph/local/{id}?depth=` had no upper bound; the BFS loop ran
  `range(depth)` regardless, so a large `depth` blocked this single-worker
  server's one request thread for real wall-clock time — a trivial DoS on a
  personal-notebook app. Now `Query(ge=1, le=6)`, plus the loop breaks as
  soon as its frontier empties instead of finishing out the range.
- `GET /timeline?days=` had no upper bound either, and fed straight into
  `timedelta(days=days)` — a large enough value raised an unhandled
  `OverflowError` (Python int too large to convert to C int), surfacing as a
  raw 500 instead of a clean error. Now `Query(ge=0, le=40000)` (0 still
  means "everything").
- `POST /import/markdown` capped each file's size but not how many files one
  request could carry, unlike its sibling `/import/document`
  (`MAX_DOCUMENT_IMPORT_NOTES`). Now capped at `MAX_IMPORT_FILES = 500` with
  a clear 422 past that, rather than unbounded work per request.
- Wiki-link resync failures in `create_entry`/`update_entry` were swallowed
  with no logging — the embedding-refresh block three lines above both of
  them explicitly logs on failure ("logged rather than swallowed" is the
  comment right there), and the wiki-link block didn't follow its own
  neighbour's pattern. A real link-resolution bug was invisible in both the
  UI and Settings → Logs; now it isn't.
- `searxng_manager._run_streaming`'s deadline was only checked *between*
  output lines — a child process that went quiet without exiting (a stalled
  download, a hung subprocess) blocked the call forever no matter what
  `timeout` said. Reads the pipe from a background thread into a queue now,
  so the deadline is checked on a real poll loop even when nothing is being
  read. Reproduced the actual hang locally before and after the fix.

### Added — Windows installer

- A real installed build for Windows: `packaging/windows/memorymap.spec`
  (PyInstaller, onedir) and `packaging/windows/installer.iss` (Inno Setup,
  per-user install — no admin prompt). `release.yml` now builds and attaches
  it to the GitHub Release whenever a `v*` tag is pushed. Unsigned for now
  (see README's Windows install note); ships to GitHub Releases only.
- `core/config.py` and `api/app.py` both located `frontend/` and the app
  icon via a path relative to the source file's own position, which assumes
  a `src/` layer a PyInstaller bundle doesn't have — both now branch on
  `sys.frozen` and resolve against the bundle's own extraction root instead.
  Notes now default to `%APPDATA%\MemoryMap AI` (or the platform
  equivalent) only for a frozen build; a source checkout is unaffected.

### Added — system tray, update check

- **System tray for the desktop window.** Closing the window now minimizes it
  to a tray icon instead of quitting; the tray menu is Open / View Logs /
  Restart / Quit. `pystray` + `Pillow` join `pywebview` as the `desktop`
  extra (`core/extras.py`) and are bundled into the Windows installer. Missing
  or unusable on the running platform (no display, package not installed) is
  a soft fallback, not a crash — the window just closes for real, same as
  before.
- **"Check for updates" (Settings → About).** Off by default, same reasoning
  as web search. A `GET /update/check` endpoint compares the running version
  against GitHub's latest release tag; the checkbox, a "Check now" button,
  and a silent startup check (toasts only when a newer version genuinely
  exists) are all new. Caught live rather than merely reasoned about: the new
  `update_check_enabled` preference wasn't declared on `PreferencesBody`, so
  the PUT silently dropped it, and `get_preferences()`'s hand-built response
  dict never echoed it back either — both fixed.

### Fixed / Added — CodeQL cleanup, extract-notes feature, a real private-note leak, design pass

- **Security.** All 81 open CodeQL alerts closed. Separately: a private
  note's ciphertext was reaching the AI in four places once a link, card, or
  reminder referencing it predated the note being marked private
  (`set_private` doesn't touch existing references) — the weekly digest,
  `audit_vague_links`, the whiteboard `read_whiteboard`/`search_whiteboard`
  agent tools, and a reminder's entry preview. All four now respect the
  private-note guard; each has a regression test.
- **Extract notes** (new). Turn selected text — in the Writing Room, a
  Document, or a whiteboard multi-selection — into one or more AI-drafted
  notes, auto-filed and auto-linked with real generated reasons, previewed
  before anything is written. Reuses the janitor's filing/merge judgement
  and the librarian's link-reason generation rather than new logic.
- **Design.** An elevation (`--shadow-sm/md/lg`) and motion
  (`--motion-fast/base/slow`) token scale, replacing a dozen hand-written
  `box-shadow` values and ten distinct transition durations app-wide. A
  live mic-level meter on the dictation buttons, driven by `AnalyserNode`
  off the same stream the recorder already opens. Library/Timeline empty
  states brought in line with the rest of the app; a Library card no longer
  duplicated a titled note's title into its own preview line.
- **Perf.** Two O(n) full-table-scan-shaped bugs fixed: the reevaluate
  endpoint's linked-entry lookup now queries ids instead of loading and
  decrypting every note, and the whiteboard no longer re-parses every
  sketch's JSON on every drag frame.
- **Docs.** ~1,000 lines of resolved ROADMAP/BACKLOG items moved into
  `docs/roadmap/HISTORY.md`; both live docs now hold only open work.

### Fixed / Added — work-recovery session: icon system, spaces, timeline, chat dock, link reasons

A previous session's work was lost; the recovery attempt had left the app
with a broken icon system and several silently-dead features. Baseline was
16 failing tests, not 2 — six of them because the link-reason feature had
never run once (`provider.run_prompt` does not exist).

- **Icons.** The Phosphor stylesheet was vendored but never linked — no icon
  in the app rendered. All 367 colour emoji replaced app-wide (frontend and
  backend tool/skill labels) with Phosphor glyphs via a `ph:name` label
  marker (`setLabel()`) for the ~300 that live in JS string literals rather
  than markup. `lucide.min.js` and its dead branch removed.
- **CSS correctness.** Five custom properties used but never declared
  (`--surface-2`, `--text-main`, `--card-hover`, `--radius-3`,
  `--accent-alpha-1`) — an undeclared property invalidates its whole
  declaration, so the workspace menu had no background and timeline cards no
  radius. A literal `\n` inside a `:root[data-glass="off"]` selector list
  invalidated that entire rule.
- **Spaces.** Rebuilt switcher (markup had been deleted by a bad regex, CSS
  and JS left behind); create/rename/delete hardened — reserved ids can no
  longer be claimed, icon values are validated (were interpolated unescaped
  into a class name), delete reassigns every `WorkspaceMixin` model instead
  of four hardcoded ones and no longer reads a deleted ORM row.
- **Timeline grid.** Cards rebuilt with a header (when, and why), a title
  (the note's first line) and a clamped preview measured by scrollHeight,
  not a CSS clamp that does not engage in the real engine. Column banding
  and a full-height sticky band label. Grid build was O(bands × buckets ×
  notes); now one pass per band into a Map.
- **Chat dock.** Skills folded into one dropdown (selector, Auto|Manual
  pace, Run) instead of four loose controls. Plan is a toggle applied on
  the way out of `sendChatMessage`, so Enter and suggestion chips honour it
  too — previously only its own button sent a plan.
- **Link reasons.** `audit_vague_links` rewritten onto
  `librarian.generate_link_reason` (the old call target did not exist);
  rejects reasons that are themselves vague; commits once per batch instead
  of once per link; retry-limited. `_deduce_reason` no longer makes a
  blocking model call inside the link-creation request path. The backfill
  endpoint now runs the AI pass after the embedding pass, so "Give links a
  reason" writes an actual reason instead of the literal string "similar in
  meaning" for every link. Each suggestion row gets its own editable reason
  field. Background audit confirmed reached from `_run_optimization` with a
  dedicated `auto_link_reason_audit` preference (was previously untested
  that the pass reached the audit at all).
- **Security.** `_unlink_notes` bypassed the private-note guard that
  `link_notes` immediately above it enforces — it could unlink and reveal
  the existence of a private note the caller cannot read.
- **Dashboard.** Widget preview rows: `safeMdSlice` returned the empty
  string whenever an unpaired markdown marker was the first character
  (`cut.slice(0, cut.lastIndexOf(marker))` with index 0), rendering as a
  bare "…" — now falls back to a plain-text slice. Block markdown (headings,
  lists) rendered as literal syntax because the widgets used the inline-only
  renderer; now strip block syntax and show the note's first line as a
  title. A widget-picker modal (roadmap item 26) on top of the existing
  `dashboard_layout` preference and inline edit mode, not a second store.
- **Graph.** Fit-to-view computed its bounding box from node centres
  (ignoring radius/halo/label), used a flat 60px margin regardless of
  container size, and clamped only the zoom-in direction — one distant
  outlier collapsed the whole graph to a scale of 0.07. Padded by rendered
  node extent, container-relative margin, clamped both directions.
- **Whiteboard.** A note card showed 100 characters of escaped plain text
  with no way to see the rest. Now full note, real markdown, clamped past a
  height cap with a Show more/less control matching the notes list.
- **Documents.** Full-height sticky sidebar (was shrink-wrapped to its
  content by a duplicate `#doc-sidebar` rule later in the file that re-set
  `align-self: start`). The storage-path disclosure moved into a dialog
  behind a link-styled button — ~370px back to the document list.
- **Sidebars.** Categories, Chats and Recent headers now sit level with
  their collapse toggle — the toggle is positioned against the card's
  border box, the heading row started at the content box, `--space-6`
  lower, with nothing keeping the two in step.
- **Misc.** `!err?.name === "AbortError"` parsed as `(!err?.name) ===
  "AbortError"`, always false, so no network failure was ever logged to
  Settings → Logs. The Capture textarea reported `scrollHeight: 0` while its
  tab was hidden and sized itself to nothing, only correcting on focus. The
  theme toggle showed a fixed half-circle in both modes; now shows the mode
  you will get (sun for light, moon for dark). Vault key rotation, added
  all-or-nothing with a test proving an interrupted rotation leaves every
  note readable under the old key. Launchers give every network call an
  explicit timeout and tell a network failure apart from a real one, so no
  internet degrades to a one-line message instead of a hang. Library image
  rename (was entirely missing) and a title-regeneration notification (was
  silently dropped by the mute filter, since it is the result of a button
  the user just pressed, not background chatter).


### Fixed / Added — whiteboard redo & select, highlighter persistence, arc-label spacing, touch input (roadmap §11, §15)

- Whiteboard: a redo stack (Ctrl+Y / Ctrl+Shift+Z, toolbar button), and a
  real single-item Select tool (was folded into Pan) with Delete/Backspace
  and Escape support.
- Whiteboard: a highlighter stroke's width/opacity is now saved and
  restored correctly — it previously reloaded as a plain full-opacity 3px
  line, losing the tool's whole point.
- Whiteboard: an arrow tool (shaft + arrowhead as one path/one undo entry).
  **Its live drag-to-save path was not confirmed working this session** —
  see HANDOVER.md for why, and check this first next session.
- Graph (arc view): labels were re-reported as reading like they belonged
  to the wrong node — widened node spacing, shortened the label limit, and
  steepened the label tilt so a label's own reach stays under one node-step.
  Category labels also now get an accent colour, not just bold, so they
  read as a distinct kind of label.
- Whiteboard and graph: switched from mouse events to pointer events (the
  sketch pad already did this) so touch and pen input work, not just a
  mouse — not verified against real touch hardware, reasoned from the
  event model.

### Changed — licence: MIT → AGPL-3.0

MemoryMap is now under the **GNU Affero General Public License v3.0**. The
licence text is the official one from the FSF, unmodified.

What it means in practice:

- Anyone may use, study, modify and share it.
- Anything built on it must be released under the AGPL too, with source.
- **§13, the clause that makes it AGPL rather than GPL:** if someone modifies
  MemoryMap and lets other people use it *over a network*, they must offer
  those users the modified source. Plain GPL would not require that, because
  running a service is not distribution. For an app whose premise is "your
  notebook, on your machine", this is the licence saying what the product
  already says.

**One consequence worth flagging, because it inverts a documented constraint:**
ANALYSIS.md §34a said "odysseus is AGPL, MemoryMap is MIT, no code crosses in
either direction." Half of that is now lifted — odysseus's AGPL code *may* come
in, carrying its notices and attribution — and the other half is tighter:
nothing from here can go out to an MIT project. §34a is rewritten to say so.

Updated: `LICENSE`, the pyproject classifier, the README badge and footer,
ANALYSIS.md §34a, and the cross-reference line in every roadmap file and
CLAUDE.md.


### Fixed — the owner's reported list

Diagnosed in the running app rather than from the report. Full triage, with
what was checked and found already correct, in [ROADMAP.md §41](docs/ROADMAP.md).

- **Trace on the graph is rebuilt.** Reported as "annoying and pretty much
  unusable". `traceModeActive` was set and consulted nowhere, so the map never
  responded to a click and both ends had to be picked from `<select>` elements
  listing every note in the notebook by its opening words. Two clicks on the
  map now, with a readout instead of a form: Swap for the other direction,
  Undo for one step back rather than a reset, Escape to leave, crosshair
  cursor so the mode looks like one.
- **The autonomous-tasks switch turned itself off.** Two controls write that
  preference and the one on the skills panel saved straight to the server
  without updating `prefsCache` — so the next `savePrefs`, which rebuilds the
  whole object from the DOM, read the other checkbox and switched it back.
- **Light/dark stopped affecting the page background** after using the colour
  scheme selector. The builder computes a page colour *for a mode* and stored
  only the current one, written inline on `<html>`, where it outranks every
  `[data-mode="dark"]` rule. Both are stored and re-picked on mode change.
- **Whiteboard:** dragging a card sent no `board_id`, so a card on a named
  board was silently moved to the global one, and a 404 left it on screen
  unsaved; the board list showed "Note 25" because it read two fields an entry
  does not have; the library panel covered its own toggle so it could not be
  closed; the selected tool had no visual indicator; the zoom controls sat
  behind the agent activity monitor.
- **Skill descriptions** were clipped to one line by `.persona-preview`'s
  `white-space: nowrap` (reported twice).
- **The documents sidebar** crushed its own document list to two rows, because
  the outline and help block below it never shrink.
- Tags / Recycle bin / Activity removed from the notes sidebar, as asked.

### Added

- **A text box in "What it remembers".** `save_user_preference` is the model's
  way in; this is the one people reach for first.

### Checked and found correct — not changed

- **Password, token and secret storage.** bcrypt with a per-password salt;
  `secrets.token_hex(32)` session tokens held in memory and swept on expiry;
  private notes encrypted with a key wrapped by a password-derived key.
- The three sketch swatches reported as identical are three distinct colours.
  The real defect underneath is the highlighter at 5% opacity.


### Audited — a week of another agent's work, brought to a mergeable state

`fix/Antigravity-Audit` arrived with 8 commits, ~9,600 insertions and no test
files. It had **90 failing tests and 20 ruff errors** against a `main` whose
only two failures were a self-inflicted time bomb in a dated test. Everything
below is that audit. Full reasoning in [ROADMAP.md §40](docs/ROADMAP.md); the
three new features it brought are documented in §39.

#### Reverted

- **`POST /chat/stream` is NDJSON over a plain POST again**, not a WebSocket.
  The rewrite shared the request's SQLAlchemy Session with a producer thread
  (Sessions are not thread-safe) and closed it twice, leaked that thread when a
  client hung up, had to be mounted outside `dependencies=locked` and reimplement
  auth by hand, and replaced a transport the same-origin policy protects with
  one it does not — so any page the user had open could drive the agent. It
  also accounted for ~70 of the 90 failures. Two genuine improvements from the
  rewrite were kept: mid-stream `error` events, and tool-error logging.
- **`generate_skill` removed.** It wrote unvalidated AI-authored skills straight
  into preferences, bypassing `save_skill`'s schema check, built-in-name guard,
  tool-name validation and `MAX_SKILLS` — and called `config.save_preference`,
  a method with no definition anywhere, so it could only ever have raised.

#### Fixed — security and privacy

- **The AI could tag and link private notes.** `tag_note` and `link_notes` grew
  batch arguments and stopped routing through `_require_note`, the one place
  that refuses a private note. The batch feature is kept; the guard is back.
- **`/media/upload` and `/media/{filename}`** noted as a hardening item — the
  filename is whitelisted so there is no traversal, but uploads are served
  same-origin with no type restriction.

#### Fixed — data loss and correctness

- **JSON export silently dropped `is_deleted`**, so every note in the recycle
  bin would have re-imported as a live note.
- **Semantic search returned nothing after an embedding-model change.** Every
  stored vector was stacked into one array; a notebook holding two widths
  mid-reindex raised on the ragged list and took every query down with it. The
  same crash, plus an N×N memory blowup, was in the graph's similarity edges
  and in link suggestions — all three now go through one blocked,
  dimension-safe `embeddings.similar_pairs`.
- **`?semantic=true` threw away its own ranking**, returning matches in
  notebook order, and swallowed a cold embedding model as "here is your whole
  notebook" instead of a 503.
- **Notes sharing an uppercase tag stopped being neighbours** — the tag index
  was keyed lowercase and intersected against unfolded tags.
- **`search_notes` scaled its ceiling with the context window**, so a 128k
  model could pull 768 note previews into a single tool result.
- **`find_similar_notes` was listed in `WRITE_TOOLS`**, so a pure read cleared
  the agent's read-dedup ledger and counted as work for the claim checker.
- **`ask_user` was culled from small models**, leaving them to guess — the
  exact failure that tool exists to prevent.
- **The memory stream was injected unbounded into the system prompt** on every
  round, past the `PROSE_BUDGET_CHARS` guard that exists to stop that. Now
  capped at 600 characters, newest-first, and never fatal when unavailable.

#### Fixed — features that had never executed once

- **The background librarian was never started.** `app.py` imported
  `autonomous` and called nothing, so the interval, the on/off switch and three
  task toggles in Settings were wired to a loop that did not run.
- **`clean_orphaned_vectors` did not exist.** The call sat inside an
  `except Exception` wide enough to swallow the `AttributeError`. Now
  implemented, and it returns a count.
- **`VACUUM` moved onto an autocommit connection.** Through a `Session` it
  works only while it is the first statement — pysqlite defers its BEGIN — and
  raises once anything has read or written, which is the state the background
  pass leaves behind.
- **`trigger-autonomous` had no guard**, so each press started another agent
  loop against the same notebook.
- **Thirty-five inline `style` attributes in index.html, and five more inside
  app.js template literals**, all refused by the app's own
  `style-src 'self'` CSP and therefore rendering as no styling at all.

#### Fixed — the interface

- **Every card, field and dialog in the app had no border and no shadow.**
  `border-style` and `shadow-intensity` — two new Settings controls — were
  missing from `APPEARANCE_DEFAULTS`, so `undefined` and `NaN` were written
  into two CSS custom properties on `<html>`. Both are invalid where they are
  *used*, which is an `!important` rule matching `.card`, `input`, `textarea`,
  `select`, `.modal` and `.sidebar`, and the `rgba()` inside `--glass-shadow`.
- **`.glass` erased the background of every `card glass` element** by pointing
  at `--bg-glass`, a token no theme declares. The command palette showed an
  input and a hint floating over the page with no surface behind them.
- **Thirteen further undeclared tokens** (`--card-bg`, `--text`, `--panel`,
  `--shadow-sm/md`, `--border-light`, `--sw-*`, …) across 23 dead declarations,
  now aliased to the real theme-aware tokens.
- **Graph Trace threw a ReferenceError.** It moved from two `<select>`s to
  click-two-notes and left three references to the locals the selects filled.
- **Picking a sketch colour left the eraser armed** — the button was renamed
  and one call kept the old id, swallowed by an optional chain.
- **Tags / Recycle bin / Activity** lost their markup but kept their click
  handlers; the sidebar shortcuts are back.
- `applyThemeChoice(undefined)` stamped `data-theme="undefined"` onto `<html>`.

#### Added — tests and lints

46 tests across `test_whiteboard.py`, `test_autonomous.py` and
`test_antigravity_regressions.py`; 28 of the 32 applicable ones fail against
the original branch. Four lints, each closing a gap where nothing was looking:
every appearance setting has a default; no token is used undeclared without a
fallback; the inline-style ban covers app.js; and the dated search tests own
their own clock.


### Fixed — agent robustness pass

- **A skill/plan step now hands the next step the actual notes and
  documents it touched, not just its own prose summary.** Reported as the
  agent "losing the plot half way through a job": a step's own narration
  ("tagged the relevant notes") was all the next step ever saw, so a later
  step needing "those notes" had nothing to act on but a sentence.
  `skill_runner._step_answer` now appends the real ids from the step's own
  `change` events.
- **A skill step that created a document could produce a change whose
  `note_id` was actually that document's id.** `agent.py` read every
  write tool's result `"id"` field and called it a note id unconditionally;
  `create_document`'s `"id"` is a document's. The chat UI's existing View
  button (§21/§22) would then navigate to the wrong note, or nowhere.
  `agent._change_note_id`/`_change_document_id` now resolve each tool's id
  from the field it actually uses.

### Added — §37G, §37I, §37K

- **A document importer.** `markitdown` had been an installable extra with
  nothing calling it since it was added; Settings → Import & export now has
  an "Import a document" button (PDF, Word, slides) alongside the existing
  markdown importer. A converted file with more than one top-level heading
  becomes one note per heading — a deck or a document with real chapters —
  otherwise the whole thing is one note, capped at 25 notes per upload.
- **The sketch pad accepts a background image.** An "🖼️ Add image" button
  draws a chosen photo onto its own canvas layer beneath the pen strokes, so
  drawing over a screenshot or a photo works the way annotating one would be
  expected to. The Eraser now clears pixels to transparent rather than
  painting white, so erasing a stroke reveals the image underneath instead of
  punching a white hole through it.
- **`compress_chat`, an agent tool.** The agent can now ask to compress the
  older part of a long conversation — `POST /chat/compress`'s summarising
  logic, reused rather than duplicated — but the turn still ends on a review
  card the user approves before it replaces anything, the same human-gated
  flow the manual Compress button already used. Deciding *not* to let the
  agent auto-apply its own summary was the point: a summary nobody can
  correct is one they have to trust blindly.
- **A handful of emoji were missing their colour variation selector**
  (⚡️ ✖️ ▶️ ☑️ ⚠️), rendering as thin text-style glyphs on some platforms next
  to fully-qualified emoji in the same row — the same bug one of them was
  already fixed for once, audited across the rest of the frontend.

### Fixed — a second round of reported UI bugs

- **Quick sketch's Close button darkened the background instead of closing.**
  `#sketch-overlay` sat at `z-index: 60`, the toast/popup tier; the "close
  without saving?" confirm dialog is a `.modal-overlay` at `z-index: 55` and
  painted behind it. Lowered to 55, matching every other modal.
  `#improve-overlay` had the identical latent bug and is fixed alongside it.
- **Dropdown arrows clashed with option text app-wide.** The shared
  `input`/`select` rule gave equal padding on both sides, with nothing
  reserved for the browser's own arrow. Every `<select>` now gets a painted
  chevron in reserved padding, not just the chat dock's.
- **The notes-list toolbar's controls were four different heights.** Same fix
  as the Library toolbar: one declared `--control-h` for the filter box, the
  sort select and both buttons.
- **The category sidebar's ✎/🗑 buttons overlapped the note count** instead of
  replacing it — `background: inherit` was meant to hide the count underneath
  but a glass card is never fully opaque. The count now fades out exactly
  when the actions fade in.
- **A stale login token produced a toast storm before the lock screen.**
  Every parallel bootstrap request hitting the same 401 toasted its own
  "Couldn't load X: Locked" on top of the lock screen that had already,
  correctly, explained the one real state. The 401 now carries a marker the
  bootstrap loop checks before toasting.
- **First load now defaults to the Dashboard**, not Notes. Only the fallback
  changed — a returning visit still opens on whichever tab was last active.

### Roadmap

- §37 triages a longer list of reported work (chat dock density, a
  resizable/refined web panel, a UI zoom setting, the graph toolbar, sketch
  image/document upload, llama.cpp wiring, chat compression as an agent tool,
  a real Timeline fix, emoji rendering) in priority order, and corrects three
  stale claims in the roadmap's own top-level priority sections — including
  "the Library tab" listed as an open Tier 3 item after it had been built and
  partly deleted.

### Removed — the three panels the Library replaced (roadmap §36G)

**The first surface this project has taken away rather than added.** The Notes
sidebar's 🗑, 📜 and 🏷 buttons opened the Library, but `#bin-panel`,
`#activity-panel` and `#tags-panel` were still in the markup and still
rendered, so each of those three things had two implementations — and the
bin's two could disagree about what was in it, because each fetched its own
list. Gone with them: `renderBin`, `renderActivity`, `renderTags`, `showPanel`,
the `#bin-empty` handler and `entryItem`'s `options.bin` branch.

- **Reading a binned note in full** is what had to exist first, and is the only
  reason the bin panel had outlived its chip: a Library card shows a preview,
  which is the wrong thing to decide "restore or delete for good?" from. A
  Library card now opens a read-only reader with the note's own markdown,
  Restore, and Delete for good.
- `GET /entries/{id}?deleted=true` reaches into the bin when the caller asks.
  An ordinary read still 404s on a binned note, and reading one does **not**
  count towards "most accessed".
- "Kept for N days" moved to the Library's bin bar. It was the one thing the
  panel said that the Library did not.

### Added

- **Embedding models you can see and remove** (Settings → Optional extras).
  Which models are on this machine, their real size on disk, where the cache
  is, and download / re-download / remove. Answers a question the logs made
  look alarming: the model is fetched **once** — the HuggingFace requests on
  every start are checking the copy you already have.
- **A 🧭 Plan button in the chat.** The `make_plan` tool has existed since
  §35K and the only way to reach it was to hope the model chose it. An action
  rather than a toggle: planning costs a round-trip, and "plan this one" is a
  decision about the message in the box.
- **SearXNG can start with the app** (Settings → Web search, off by default).
  Reported as web search "disabling itself" — it was the container going away
  after a reboot, and every search after that fell through to a rate-limited
  DuckDuckGo.
- **The dashboard's launcher is three labelled groups** — Start something, Jump
  to, Run a skill — instead of one grid of seven identical chips doing three
  different jobs. The Library, the Timeline and the command palette are
  reachable from it at last.
- **Optional extras that nothing calls yet are greyed out** and refused
  server-side, with the reason on the card. `markitdown` and
  `llama-cpp-python` install a library the app never imports.

### Changed

- **Web search opens as a column beside the conversation**, not a drawer inside
  the composer dock. Inside the dock it had to be capped at `min(38vh, 20rem)`
  — a search box, a results list and a whole web page in 20rem — reported as
  *"squashed ugly … what it is right now isn't working"*. As a column it needs
  no cap at all, and the reader takes the column over rather than sharing it.
- **The dock's controls are one visual family**: one corner radius, one border,
  one hover, and selects that give up the platform's chrome. A toggle that is
  on now says so with the accent.
- **Switches instead of checkboxes** wherever a checkbox means on-or-off.
  Radios keep `accent-color` — one-of-several is not on-or-off — and
  checkboxes in a *list* stay ticks.
- The **Rediscover** widget renders markdown instead of showing `## Schedule`
  and `**bold**` spelled out.
- The **logs screen** fills its pane instead of stopping at 46vh.

### Fixed

- **The chat dock drew outside its own card.** Measured at 1849×700 with a
  hand-dragged composer: the dock's box ended at y=614 and the composer at
  y=814, with Send below the window. A dragged height is now trimmed to the
  room the card has — measured, not guessed — and the *preference* is never
  rewritten, so the box comes back when there is room.
- **Starting a skill from the dashboard didn't take you to it.** The run began
  and streamed into a tab nobody was looking at.
- **Every sticky sidebar was 22px too tall.** Three rules wrote the same
  `calc` by hand and all three left out the page's bottom padding, so each
  sidebar ended that far under the status bar. Reported twice in one day, for
  two different sidebars, because it was never one sidebar's bug.
- **The graph drew outside its card** when the legend wrapped: a `22rem` floor
  under the map plus a legend as tall as the notebook has categories is more
  than a short window has.
- **The settings search box** was drawn under the nav's scrollbar.
- A second `py/polynomial-redos` in `search/query.py` (CodeQL, high). A
  character class with `*` next to an anchor is the shape to avoid; the linear
  replacement is again the more readable one.

### Fixed — long jobs finish, or say where they stopped (roadmap §35K)

Two reports, one subject: *"the agent struggles with long tasks like skills
then cuts out half way through and has to restart, or it hits a limit for tool
calls which has happened quite a bit."*

- **Rounds are earned now, not granted.** The cap counted rounds, which cannot
  tell a model doing eight useful things from a model doing the same thing
  eight times — and "tag these eight notes" is a search, a read and eight
  writes. A round that makes a successful call it has not already made buys
  another round, up to a ceiling. A model looping on one call earns nothing and
  still stops where it always did.
- **A step that ran out of rounds is no longer ticked off as done.** The runner
  could only see that the step's turn produced text, and "I couldn't finish
  step 1" is text — so a step cut off mid-job was marked ✓ and the next one ran
  on top of half-finished work. It is marked stalled, the run stops there, and
  the result says which step it stopped on.
- **Resume from step N.** A run that stopped picks up where it stopped instead
  of being restarted over notes it has already changed. A turn that ran out of
  rounds gets a **Continue** button, rather than a paragraph asking you to type
  "carry on".

### Added — the agent can plan a big job and work through it (roadmap §35K)

Reported: *"I will say fix my categories and it will only merge two categories
and leave it at that, ignoring the rest."*

A model given one broad instruction does the first part and reports success.
Skills already solved this — each step is its own turn — but only for a job you
had saved as a skill. Now the agent can call **`make_plan`**: it writes 2–6
steps, its turn ends, and the same runner works through them one at a time,
ticking each off and listing what changed with an Undo on each.

A plan is a skill nobody saved, so it looks and behaves exactly like a skill
run. A plan that is too long is refused rather than trimmed, because silently
dropping the end of the job is the failure this exists to prevent.

### Changed — the chat controls moved down to the chat box (roadmap §36B)

Asked for directly: *"moving the majority of the ui controls like the
chat/agent pull, web search and stuff to the bottom bar with the chat input."*

Chat/Agent, Web, answer length, persona, the skill picker and attached notes
now sit in a dock with the message box, so you set them as you write instead of
scrolling back to the top of a long conversation. The chat header keeps what is
about the conversation itself — its name, what it has cost, and Export. The web
and persona panels moved down with the buttons that open them.

### Added — compress a long conversation (roadmap §35I)

Asked for directly: *"there should be a tool as well as a manual command or
something to be able to compress chat context on longer chats so the AI can
better continue."*

**🗜 Compress** in the chat header summarises the earlier messages, shows you
the summary to read and edit, and then sends that in place of them. What it
fixes is not what it sounds like: a long chat never overflowed the model's
window — the oldest messages were quietly dropped to make room — so the model
was forgetting the start of the conversation and re-asking things you had told
it. A summary keeps the gist of ten messages for the price of one.

Nothing is deleted. Every message stays in the conversation and in the saved
transcript; only what the model is *sent* changes, and one Undo puts it back.

### Changed — the chat's controls are one strip, and its header has two levels

The dock under the chat was three stacked bands — skills, controls, then the
message box — which is most of the height of a short conversation. It is one
line now: skills · what the AI may use · how it answers, with everything the
same height so it reads as a single strip. The skill's description moved into
the picker's tooltip, where the steps and tools it uses already were.

The chat header shows the conversation's name as a heading with its token count
and compression state as quiet metadata beneath, instead of a row of things
that all looked like buttons.

### Fixed — the desktop app could keep running an old build

If a button you were told was fixed is still broken, this is why. The frontend
was served with no `Cache-Control` header at all, which lets a cache reuse it
without checking — and the desktop shell has no reload button, its own on-disk
cache, and restarts the process without clearing it. After an update it could
go on running the previous `app.js` indefinitely. The files are now served
`no-cache`, so every start checks for a newer build (and gets a 304 when there
isn't one).

The recycle bin's **Empty now** was the report that led here. It was driven end
to end in a real browser against this server: the confirm dialog opens, the
notes go, the bin comes back empty. The fix has been in the code since §35F —
what was missing was any guarantee you were running it.

### Fixed — reminders were polled twice a minute, not once

A rewrite left the previous poller's timer behind. Both timers ran the new
poller, so the app asked the server for reminders twice as often as intended,
and two polls landing together could announce the same reminder twice.

### Fixed — all seven tabs stay readable

When the tab strip cannot fit beside the app name and the header buttons it now
takes a row of its own, instead of scrolling with "Dashboard" clipped against
the left edge.

### Fixed — the Reminders tab is no longer faded at the edge

Reported: *"the reminders tab in the top bar is partially faded out on the
right."* The tab strip's fade meant "this bar scrolls" rather than "there is
more that way", so the last tab stayed dimmed with nothing hidden behind it.
Each edge now fades only when there is something beyond it, the fade is a fixed
width rather than a share of the bar, and choosing a tab scrolls it into view.

### Added — any OpenAI-compatible backend (roadmap §6)

The headline ask was "support LM Studio". What got built is the **dialect**,
not the product: LM Studio serves the OpenAI API on `localhost:1234/v1`, and so
do llama.cpp's server, Jan, vLLM, and Ollama's own `/v1` surface. One provider
gets all of them, and the only thing that differs between them is an address.

Pick it in **Settings → Models → Model backend**. It applies immediately — no
restart, nothing to put in `.env` — and the setting is saved whether or not the
server is answering yet, because "set the address, then start the server" is
the normal order to do it in.

- **`ai/provider.py` is the new seam.** Everything that was never actually
  about Ollama moved there and is now shared: the think-tag splitter, the
  tool-text gate and the prose-tool-call recovery, the error classes, the
  context ceiling, the neutral `{context_tokens, max_output_tokens}` budget.
  They were *moved*, not copied — a test asserts they are gone from the old
  file, because two copies of a tool-call gate that drift apart is exactly the
  bug this refactor exists to prevent.

- **`OllamaError` is still the error every route catches**, because it is now
  an alias for the neutral `ProviderError` rather than a sibling of it. A new
  parent class would have read as tidier and quietly stopped a dozen existing
  `except OllamaError` handlers firing for the second provider.

- **Streamed tool calls arrive in fragments keyed by an index**, which has no
  Ollama equivalent: arguments come through as partial JSON spread over many
  chunks, and two concurrent calls interleave on the wire. Folding them by
  arrival order instead of by index produces one unparseable blob the moment a
  model asks for two things at once — which small models do constantly.

- **The window a server *loaded* beats the window a model *could* hold.** LM
  Studio reports both; a 128k model loaded at 4k will drop the front of the
  prompt — the system prompt, the part telling it that it has tools — if the
  app budgets against the bigger number. Where nothing is reported at all
  (plain llama.cpp), a known-model table answers, and where that doesn't
  either, the app says "unknown" and budgets conservatively rather than
  inventing a number nobody verified.

- **Tool results are addressed by id.** Ollama accepts `{"role": "tool",
  "tool_name": …}`; the OpenAI shape wants a `tool_call_id` matching an id the
  assistant turn issued. The agent keeps writing one dialect and the client
  translates at the boundary — including the case where a model calls the same
  tool twice in one turn, where matching on name alone leaves a call
  unanswered and the server rejects the whole turn.

- **The trap §6 named, closed.** `tests/test_context_budget.py` asserts all
  four Ollama generation paths send an options block; `tests/test_providers.py`
  now asserts the equivalent for the new provider, against the payloads that
  actually went out. A path that omits `max_tokens` is a model running unbounded
  on the backend's defaults — the bug the context-budget work was spent fixing,
  arriving again through a different door.

- Downloading models is an Ollama capability, so the suggested-downloads panel
  hides itself on the other backends rather than offering a button that cannot
  work, and the status line names whichever backend actually answered instead
  of telling an LM Studio user to go and install Ollama.

### Added — finished background tasks, and a way to quit

**Settings → Background tasks now shows what stopped, not only what is
running.** The old rule was that a finished job isn't a task and a screen that
accumulates them is a log — tidy, and wrong in the one way that matters: a job
that *fails* disappeared at the moment it became interesting. A re-index that
died halfway left exactly the same empty list as one that finished, and the
reason existed only in the log console, a different screen you have to know to
open. Endings are now recorded with their outcome and reason: in memory,
bounded to the last 40, newest first. Cancelling is reported as *cancelled*
rather than failed — a user's own decision in red is how people learn to ignore
red.

**A Quit button** stops the app and its server properly. Until now the ways out
were Ctrl+C in a window the launcher hides, or closing the tab and leaving the
server running — which is why a second start could find its port taken. It is a
POST behind the unlock gate (a GET would be reachable from a link in another
tab), it replies before it signals, and it uses SIGINT rather than a hard exit
so uvicorn's normal shutdown runs and the SearXNG subprocess is torn down by
the code that knows how.

### Changed — many more suggested models, sorted by what your machine can run

Three chat models became twelve, in three tiers — runs-on-anything, 8 GB, and
a mixture-of-experts tier for 16 GB and up — in Settings → Models and in the
README, on the current Gemma 4 and Qwen 3.5 families.

The MoE tier is the one worth explaining rather than just listing:
`gemma4:26b-a4b` holds 26B of weights but computes with 4B of them at a time,
so it downloads like a big model and answers at roughly the speed of a small
one. Judged on download size alone nobody with 16 GB would try it, and it is
the best answer for that machine.

**Sorted smallest-first rather than best-first**, which is the ordering that
matters: someone reading the list is choosing against hardware they already
own, and a quality-sorted list puts the model they can't run at the top and the
one they should start with out of sight. Each says what it is *for* rather than
how good it is, and the README points at the new "Can use tools" row for agent
work — read from the model rather than guessed.

### Added — five notebook-audit skills, and taking a link back out

Asked for: *"a skill that can do a full audit and clean up of my notebook —
linking notes, removing inaccurate links, analysing categories and tags,
retagging, changing categories, moving notes, combining duplicates."*

Built as **five skills rather than one**, and not for tidiness: a skill runs one
step per turn and holds at most ten steps, so a single "audit everything" skill
would either stop half-finished or have steps so broad a 3B model can't tell
whether it has done them. Each job also wants a different toolbox, and the
allowlist is what keeps a run cheap and safe.

- **🩺 Notebook health check** — the audit. Read-only *by construction*: it is
  offered no tool that can write, so a model that ignores "change nothing"
  still can't. Finishes by naming which clean-up skill fixes each problem.
- **🏷 Clean up my tags** — merges plurals, spellings and synonyms via
  `rename_tag`, then removes tags that don't match what a note says.
- **🗂 Reorganise my categories** — proposes a structure first, then creates,
  renames, merges and moves notes into it. `delete_category` is deliberately
  absent: it's destructive, so it would stop a bulk run for a confirm card, and
  merging keeps the notes together rather than scattering them.
- **🔗 Fix my links** — removes connections that don't hold up and adds ones
  that should exist.
- **🧬 Find notes worth combining** — reports the merged note it *would* write
  and links the group. Deciding what to lose isn't a judgement to hand a model
  across a whole notebook.

**`unlink_notes`** is the tool that made the fourth possible. Its absence had a
specific cost: an audit could add a connection and never correct one, so a wrong
link was permanent from inside the app. It is a write but *not* destructive —
no writing is lost, both notes survive, and the result carries the `link_notes`
call that puts it back — because a confirm card on every correction in a tidy-up
run is how people learn to click through confirm cards. (Removing a link by hand
already worked: the `×` on a link chip in Notes.)

### Changed — the graph tool costs half what it did

Asked for: *"the knowledge graph needs to be very solid and token efficient."*
It wasn't. Twelve neighbours came back as full `_note_summary` rows — 200-char
previews, ISO timestamps, `pinned`, `truncated`, and a null `via` on every
one-hop result — **~1,230 tokens for one call**, a third of a 4k window before
the question or the notes.

A graph walk's job is to say *what connects to what*; reading one in full is
`get_note`'s job. Rows now carry an id, a 90-character preview, the category,
how it connects and how far — with tags and `via` omitted when empty rather than
sent as null. **633 tokens**, and a test holds the worst case under 800.

### Changed — skills the model can find, and a budget guard retired

A skill was findable only by the person who remembered writing it. `when_to_use`
is a field now — *when* to reach for a skill, as opposed to what it is — and
`list_skills` reports it along with `step_count` and `changes_notes`, so a skill
that alters the notebook reads differently from one that only summarises. The
note to the model also says plainly that it cannot start a skill itself, because
a model that believes it can will narrate having done so.

**`PROMPT_BUDGET_CHARS` is retired**, on its own instructions. Its comment said
to retire it if it ever needed raising a third time for a tool rather than for
prose — and the third time came in the same session, for one added argument on
`save_skill`. It weighed the *whole* tool registry, and no turn has sent the
whole registry since `within_budget` started fitting the schemas to the model's
reported window. A guard that must be raised every time the app legitimately
grows is not a guard; it is a chore that teaches people to edit the number.

Two assertions replace it, each measuring something real: `PROSE_BUDGET_CHARS`
covers the persona and TOOLS_GUIDE, which nothing trims and which are sent
whole to a 3B model and a 70B one alike; and the existing post-trim test covers
what actually reaches a 4,096-token model. The registry is capped by the
model's real window, per turn, by code that is tested.

### Added — the graph is walkable by the AI (roadmap §9)

Asked directly: *"is the graph an actual knowledge graph? I want it to be one
for the AI to have easily usable and accessible context."*

It was half of one. The edges were real and persisted — explicit links, reply
threads, shared tags — and the graph *view* has drawn them as typed edges since
it was built. What the agent could see was `get_note`'s `links` field: a bare
list of note ids, with no indication of what any of them meant, one note per
tool call. It could add connections and never follow them.

`related_notes` walks the neighbourhood breadth-first to depth 2, capped at 12
notes, and **every result says how it connects** — "linked", "thread: this is a
reply to it", "shares #recipes" — plus how many hops out and which note it hung
off. The typing is the point: "you linked these" and "these share a tag" are
different strengths of evidence, and a flat list of ids hides that. Sharing a
*category* is deliberately not a connection, since nearly every note shares one.

**Potential connections too**, on request: `include_suggestions` adds notes that
*read* alike but were never linked. They come back in their own list, labelled
"NOT linked yet", with an instruction to say so — because the one way this could
mislead is a guess repeated to the user as a fact. Off by default, since a
similarity sweep costs a comparison per note.

### Security — the AI is locked to this machine by default

The backend address is now *refused* if it isn't on this computer or your own
network, rather than allowed with a warning. "100% offline, on your machine"
should be a promise the app keeps, not one it reminds you that you are breaking.

Enforced in two places, and the second is the one that matters:
`preferences.json` is a plain file, and it is what a restored backup or a copied
config brings with it — so checking only at the endpoint would let an address
that never passed through it be used anyway, silently, on every turn. When the
saved address is refused the app falls back to the local default and logs why,
rather than refusing to start: it has to open so the setting can be fixed from
inside it.

Unlocking is a visible switch in Settings → Models, for anyone who genuinely
wants a hosted API.

### Fixed — "'timeout' is not recognized" on Windows

Reported in use, and real. `start.bat` waited three seconds before opening the
browser with `timeout /t 3`, and `timeout` is `System32\timeout.exe` — an
external program, not a `cmd` builtin. On any machine whose `PATH` has lost
System32 it fails outright, and it also refuses to run when its input is
redirected. It now waits with the virtual environment's own Python, which the
script has already created and checked at an absolute path, so it needs nothing
on `PATH` at all.

### Added — peek, colour schemes, and saving a look (roadmap §33)

Three appearance additions, the first two taken from odysseus.

- **Peek.** A checkbox in the Settings title bar fades the panel so a colour
  change can be seen on the page behind it. The technique is the part worth
  copying: the fade is `color-mix` on the *background*, never element
  `opacity` — opacity fades the swatches and the controls too, which makes the
  thing you are trying to judge harder to see rather than easier. It clears
  itself on close and when you leave Appearance, because a panel left
  semi-transparent on the Logs screen reads as a rendering bug.

- **Build a scheme from one colour.** Picking an accent is easy; picking a page
  background that *goes* with it is the part people give up on. Choose a colour
  and a relationship — monochromatic, analogous, complementary, triadic — and
  the two are worked out together: the hue rotates by the amount that
  relationship names, the saturation drops hard (a background carrying the
  accent's full saturation is exhausting to read against), and the lightness
  goes to whichever end the *resolved* mode needs, so it is right under
  "System" too.

- **Save the look you built.** Everything the appearance controls write —
  colours, font, spacing, corners, background, the selected theme — saved under
  a name and applied again in one click. Stored server-side with the rest of
  your preferences rather than in the browser: a look built by hand is a thing
  you would be upset to lose to a cleared cache, and in preferences it rides
  along in the daily backup and is there in the desktop window too.

### Added — the agent can ask instead of guessing (roadmap §33)

Told "delete the one about the beans" when there are three, the agent had
exactly one move: pick one and act. A confident wrong action on someone's
notebook is worse than a question, and the user finds out afterwards.

`ask_user` offers 2-6 options as buttons and **ends the turn** — which is the
feature, not a limitation: the model asked because it does not know what to do
next, so carrying on would mean carrying on with the guess the question exists
to avoid.

- **No state is parked on the server.** The choice is sent as the user's next
  message, so the answer arrives through the ordinary history the model already
  reads. Nothing to expire, nothing lost on a reload, and the exchange saves
  into the conversation like any other.
- **A malformed question is recoverable, not fatal.** A model that offers one
  option, or sends `"yes, no"` as a string instead of a list, has made a fixable
  mistake — the string is parsed, and anything genuinely unusable goes back to
  the model with the reason so the run continues rather than stranding the user.
- **It cannot be run as an ordinary tool.** The handler raises, so a path that
  bypasses the agent loop can't fabricate an answer to a question nobody saw.
- It is offered on every turn, because a request can be ambiguous whatever it
  is about and a keyword rule has nothing to match on. That is only defensible
  while it stays cheap, so the schema is 507 characters and a test holds it
  under 900.

### Added — quick / normal / detailed (roadmap §11)

The prompt side of a turn has been budgeted against the model's real window
since the context work. The **output** side had one number for everything:
`num_predict` was a flat 1,024 whether the question was "when did I write about
beans" or "draft me a summary of the last month". Output tokens are generated
one at a time, so they cost far more wall-clock each than prompt tokens do — a
uniform cap means every short question pays for the possibility of a long
answer.

One picker in the chat toolbar now moves four settings together: the reply cap,
the temperature, the thinking toggle and a length hint in the prompt. They
belong together — capping the reply without telling the model to be brief
truncates it mid-sentence, which reads as a crash rather than as brevity.

- **`normal` is exactly what every turn got before**, and a test says so. It is
  the default, so anything else would mean upgrading silently changed
  everyone's chats.
- **Settings a model can't do are never sent.** Thinking is only ever toggled
  *off*: turning it off on a model with none is a harmless no-op, while turning
  it on where it isn't supported is the request that errors. An unset
  temperature is omitted rather than sent as null — absent means "your default",
  which is what happened before presets existed.
- **The picker is per-turn, the preference is the default.** One quick answer
  doesn't change the setting for every answer after it, but the last choice is
  remembered so someone who works in Quick isn't re-picking it every reload.
- The mode list is served from `GET /chat/modes` rather than duplicated in
  `app.js`, so adding a fourth preset is a change to `ai/presets.py` alone.

### Security — the backend address is the one setting that can leave the machine

Everything else about MemoryMap is local by construction: the server binds to
localhost, the database is a file, nothing phones home. §6 made the chat
backend an address the user types, and the server posts their notes to whatever
it names on every turn. That is a new outbound surface, and it needs the
*opposite* rule from the web reader's.

`websearch._assert_external` refuses anything that isn't public, because it
follows untrusted links and must never probe this machine. A model backend is
supposed to be on localhost or the LAN, so private addresses are the normal
case there and refusing them would break the only thing the setting is for.

- **Refused: non-http(s) schemes, link-local, multicast and unspecified
  addresses.** The one that matters is link-local: `169.254.169.254` is the
  cloud instance-metadata service and the classic credential-theft target, and
  nobody has ever served a language model from it. `::ffff:169.254.169.254` is
  the same address wearing a hat and is refused too.
- **The check order is load-bearing, and getting it wrong is a real hole.**
  Python classes `169.254.0.0/16` as link-local *and* `is_private`, so an
  allow-private rule running first waves the metadata address straight
  through; `::1` is loopback *and* `is_reserved`, so a refuse-reserved rule
  running first rejects the most ordinary backend there is. A test asserts
  both overlaps, so a well-meaning tidy-up of the order fails loudly.
- **A backend on the internet is allowed and said out loud.** Someone who
  deliberately wants a hosted API is entitled to one; what they are not
  entitled to is for it to happen quietly, because the app's headline promise
  is that notes stay on the machine. Settings → Models shows a plain warning
  naming what is being sent where, and it stays until the address changes.
- A name that does not resolve yet is not an error — "set the address, then
  start the server" is the normal order, and a container name resolves only
  once its container is up.

### Security

The roadmap's security tier, worked through end to end. Three of its seven
items turned out to be built already (SQLite WAL mode, the unlock-gate
backoff, and the scrypt KDF behind private notes); all three now have tests,
so the next audit does not have to rediscover them. The other four were real.

- **SearXNG was reachable from the local network when run under Docker.** The
  container was created with `-p 8888:8080`, which publishes on *every*
  interface rather than just this machine — and because Docker installs its
  own firewall rules, a host firewall set to refuse that port never saw the
  packet. SearXNG has no authentication in front of it, so anyone on the same
  network had both a free proxy to the internet and a view of what had been
  searched for. It is now published to `127.0.0.1` only. Port publishing is
  fixed when a container is created, so **a container left behind by an
  earlier version is detected and recreated** rather than started as it was;
  one that cannot be inspected is left alone rather than removed on a guess.
  The from-source path was never affected — it has always set
  `SEARXNG_BIND_ADDRESS=127.0.0.1`.

- **Requests caused by another site's page are refused.** Binding to localhost
  keeps the network out, but not a page open in another browser tab: it can
  have the browser send requests to `http://localhost:8000` on your behalf,
  which is how local dev servers and Ollama itself have been attacked. The API
  now checks the `Origin` (or, failing that, `Referer`) against the host the
  request was actually sent to. Requests carrying neither header still work —
  that is curl, the desktop window, and a shortcut, none of which a browser
  sends an origin for. This closes a window that was widest **before a
  password was set**, when the unlock gate is deliberately open and a
  drive-by `POST /auth/setup` could have claimed a new notebook outright.

- **Sessions expire.** Unlock tokens lived in memory until the app restarted,
  which on a notebook left open for weeks is not a limit. They now expire 12
  hours after last use, and 7 days after being issued however busy they have
  been. Expiry also forgets the private-note key, so an expired session cannot
  leave decrypted notes behind in memory.

- **Every response carries a strict Content-Security-Policy** — no inline
  script or style, no `eval`, and no remote host named anywhere in it. The
  project's existing "no asset from a CDN" rule is what made a policy this
  tight affordable. Alongside it: `X-Content-Type-Options`,
  `X-Frame-Options`, `Referrer-Policy: no-referrer`, and a `Permissions-Policy`
  disabling geolocation, camera, payment and USB (but deliberately not the
  microphone, which voice capture needs).

### Added

- **The Logs screen is live.** It streams as things happen instead of showing
  whatever was there when you opened it, which is what it was asked to be:
  "like the terminal running in the background, with key errors flagged".
  Alongside that:
  - **Follow** keeps the newest records in view, and pauses the moment you
    scroll up to read something — scrolling back to the bottom resumes it.
  - **Filters** by level (all / warnings / errors), by source, and by text.
    They re-draw what is already on screen rather than refetching, so changing
    one in the middle of an incident cannot lose the records you were reading.
    When a filter hides records it says how many, because "nothing matches"
    and "nothing happened" are different answers.
  - **Tracebacks** fold open under the record they belong to.
  - **Server and browser logs are one list**, tagged by source and ordered by
    time. A browser error and the request that caused it are the same event
    seen from two ends.
  - **Errors that arrive while you are on another screen** show as a count on
    the Logs item in the settings menu.

- **The AI can manage categories, not just use them.** It could already file a
  note into a category but had no way to make one, so asking it to organise
  anything ran into a wall. It now has `create_category`, `rename_category`,
  `merge_categories` and `delete_category` — enough to answer "tidy up my
  duplicate categories" or "file these under a new Recipes category".

  Deleting a category never deletes notes; they're kept and become
  Uncategorised. Merging and deleting ask for your approval before they run,
  because neither can be undone afterwards — nothing records which notes came
  from where. Creating and renaming can be undone, and offer it.

- **Any error in the log can be copied on its own.** Each record has its own
  copy button that takes the traceback with it, and an open traceback has a
  **Copy traceback** button of its own — so getting one error out is a click,
  not a filter-then-select-across-a-scrolling-box. The error count on the Logs
  menu item is clickable and opens the screen already filtered to errors, and
  **Copy all** relabels itself to "Copy 12 shown" whenever a filter is hiding
  something, because copying less than it promised is not something you'd
  discover until you pasted it.

- **A support bundle button** (Settings → Logs). It saves a zip containing the
  log, your settings, app and model status, and how many notes exist — the
  things a bug report needs. Nothing is sent anywhere: the file lands on your
  disk and it is entirely your choice whether to share it.

  Settings are filtered by an **allowlist**, not a denylist. Diagnostic ones go
  in as they are; everything else is described rather than disclosed, so your
  display name appears as `"str, 31 chars"` and never as its value. No note,
  document, chat or reminder content is included at all. The README inside the
  zip says all of this, and suggests skimming the log before sending, since log
  messages can quote things you typed.

- **The results panel says which engine answered, and what that meant.** You
  choose an engine in Settings for a privacy reason, and until now nothing
  reported whether that choice was honoured — under *Automatic* the engine
  that answers is not necessarily the one configured. Searches now report
  "via SearXNG — your own instance, the query stayed on your machine" or
  "via DuckDuckGo — a third party saw this query, but not your notes",
  **including when nothing was found**, which is when it matters most and was
  exactly when the panel used to go quiet. Individual results also name the
  upstream engines SearXNG used to find them: it is a metasearch engine, so
  "via SearXNG" describes where the query was assembled, not who answered it.

- **The log viewer admits when it has forgotten something.** The buffer keeps
  the most recent 500 records and silently discarded the rest, so a busy hour
  and a quiet one looked identical — 500 rows either way, with no way to tell
  whether the top row was the start of the story or the middle of it. It now
  says how many earlier records were dropped and how far back it still
  reaches. Worst in exactly the case the viewer exists for: chasing something
  that keeps failing, where the repetition is what pushed the first occurrence
  out of the window.

- **MemoryMap refuses to start with more than one worker.** Its configuration,
  database handle, log buffer, unlock sessions and SearXNG subprocess are all
  one-per-process; with two workers each silently becomes per-worker, and the
  result is a log showing half of what happened, an unlock that works only
  sometimes, and two workers each believing they own the SearXNG they started.
  None of that fails loudly, so it is refused with an explanation rather than
  warned about. `python -m memorymap` was never able to hit this.

### Changed

- **SearXNG is presented as the recommended way to search**, not "an optional,
  self-hosted search engine" — the one-click install works now, and it needs
  no Docker and no account. The default setting is deliberately still
  *Automatic*, which prefers SearXNG whenever it is running and falls back to
  DuckDuckGo until you have one, so search keeps working on a fresh notebook.
  (*SearXNG only* remains available and still refuses to fall back.)

- **Autocomplete is pinned off in the generated SearXNG settings.** It is the
  one thing in a search UI that leaks without a search being run — a fragment
  of every query goes to a third-party suggestion endpoint as it is typed.
  SearXNG already defaults it off; stating it explicitly means neither a
  hand-edited file nor a changed upstream default can turn it back on.

### Changed

- **The whole prompt is now sized to the model's real context window.** Every
  part of it — the instructions, the tool definitions, your retrieved notes,
  the conversation so far, and the results of anything the AI looks up — used
  to have its own separate limit, and nothing ever added them up. Together they
  came to roughly 11,300 tokens against a window that is commonly 4,096: nearly
  three times too big. When that overflows, the *start* of the prompt is what
  gets discarded, which is the part telling the AI what it can do — so the
  symptom was an assistant that suddenly forgot it had tools, rather than any
  error you could see.

  Each part is now a share of what's actually available, with room kept back
  for the reply. Small models get a tighter, working prompt instead of a broken
  one; large models get **more** than the old limits ever allowed, since those
  were sized for the smallest case and applied to everyone. If notes don't fit,
  the AI is told so it can search for the rest rather than answering as though
  it saw everything.

- **Replies are length-capped, so answers arrive instead of rambling.** Nothing
  bounded the response before. Local models generate one token at a time, so a
  long answer costs far more waiting than a long prompt does.

- **MemoryMap now tells Ollama how much context to allocate.** It previously
  sent no settings at all, so Ollama used its own default — typically 4,096
  tokens — no matter what the model was capable of. Asking for the right window
  is what makes the budgeting above true rather than optimistic. Capped at 8,192
  by default because a larger window costs memory; raise `max_context_tokens`
  in preferences if your machine has room.

- **The AI is given as many tools as its model can actually hold.** The number
  used to be fixed, tuned for a 4,096-token context — which is what Ollama
  falls back to when a model doesn't declare a size, not a fact about any
  particular model. Most current models declare 8k, 32k or far more, and were
  being rationed for no reason; genuinely small ones needed rationing harder
  than one number could express. MemoryMap now asks the model how much room it
  has and fits the tool list to it, keeping the most useful tools when they
  don't all fit and noting in the log what it held back. A 16k model gets
  everything; a 4k model gets a prioritised subset instead of quietly
  overflowing and forgetting it had tools at all.

### Fixed

- **"🎲 Another" in the Rediscover widget often did nothing.** It picked a note
  at random *including the one already on screen*, so a click could land back
  on the same note — 1 in 10 clicks on a ten-note notebook, half of them on
  two notes, and every single one when there was only one note to show. It now
  picks from the others, and says so instead of offering a dead button when
  there's only one note in the notebook.

- **Magic Add put relative reminders out by your whole timezone offset.**
  Reported: *"play league of legends in half an hour"* was scheduled for 10am
  the next day. Two things were wrong.

  The route built your clock as "UTC now, plus your offset" and then labelled
  the result UTC — an aware timestamp claiming `+00:00` while actually holding
  local wall-clock. The AI was told "now is 23:30+00:00" when that `+00:00`
  was a fiction, so when it answered with a timezone of its own (the natural
  thing, having been given one) that answer was trusted as-is and skipped the
  correction. The reminder landed out by exactly your UTC offset — ten hours
  in eastern Australia, which turns half an hour away into 10am tomorrow.
  Anyone on UTC never saw it.

  Separately, *"in half an hour"* was being handed to a 3B model to work out.
  That is arithmetic, and the answer varied with whichever model happened to be
  installed. **"In …" phrases are now resolved by rule before the AI is asked**
  — "in half an hour", "in 20 minutes", "in a couple of hours", "in an hour and
  a half", "in 3 days" and so on — which also means they work **with Ollama
  switched off**, where Magic Add used to refuse outright. Phrases that name a
  time rather than an offset ("at 8pm", "tomorrow morning") still go to the
  model, now inside a timezone frame that is actually true. The time phrase is
  taken out of the reminder text, so it reads "Play league of legends" rather
  than repeating "in half an hour" when it fires.

- **Copy buttons work when the app isn't on localhost.** Every copy in the app
  — a note, an answer, a code block, a log record — used `navigator.clipboard`,
  which browsers only expose in a *secure context*. On `http://localhost` that
  is satisfied, so this looked fine; reach the app at `http://192.168.1.20:8000`
  or through a tunnel and the entire API is `undefined`, and every copy button
  became a no-op that said "couldn't copy". Copying now tries the modern API,
  falls back to the older mechanism that works over plain http, and — if the
  browser refuses both — shows the text in a dialog with it already selected,
  so Ctrl+C still gets it out.

- **Gravity and Spread no longer pretend to work under the tree layouts.**
  Both scale the force simulation, which Tree and Radial tree do not run —
  their positions come from the hierarchy — so the sliders moved, saved their
  value, and changed nothing. They are now disabled and dimmed under those
  layouts, with the reason on hover, and restored when you switch back.

- **Custom CSS works under the new security policy.** Settings → Appearance
  applied your CSS by injecting a `<style>` element, which is precisely what
  the new `Content-Security-Policy` refuses — so the feature would have
  silently stopped working. It now uses an adopted stylesheet, which keeps the
  feature *and* the strict policy; the alternative would have been to permit
  inline styles everywhere, including any injected through note text.

- **Renaming or moving the app folder no longer breaks the launcher.** The
  app is installed into its own `.venv` by absolute path, so a renamed folder
  left the venv pointing at somewhere that no longer exists — and the
  "dependencies already up to date" check, which only watches
  `requirements.txt`, skipped the reinstall that would have fixed it. The
  launch then died with `No module named memorymap`. Both launchers now ask
  the venv whether it can actually import the app, which catches a rename, a
  move, and a half-deleted venv alike.

- **Picking a theme works every time.** A single earlier tweak — one palette,
  one light/dark choice — sat on top of every theme picked afterwards and
  cancelled that part of it, so a theme could appear to do nothing. Choosing a
  theme now clears the manual settings that theme covers, and leaves the ones
  it says nothing about alone.
- **Lagoon and Shallows refined.** Shallows is properly teal rather than
  indigo-tinted, and Lagoon's inset panels and secondary text are no longer
  washed out against their cards.
- **Background tasks shows SearXNG starting**, not just installing. A start
  waits up to 90 seconds for the service to answer — the longest silence in
  the app, and the one thing missing from the screen that exists to explain
  silences.
- **The AI emblem has one home.** It was squeezed into the Notes and Chat
  sidebar headings and absent everywhere else; it now sits in the header next
  to the AI status dot, on screen for every tab.
- **A long note no longer crowds out the rest of your notebook.** Ten notes
  are retrieved so the AI sees ten of them; one note of several pages used to
  fill the prompt on its own. Notes now go in capped, cut with a marker
  telling the AI exactly how to read the rest — which it could already do.
- **A chat's prompt stops moving between rounds.** The clock in the system
  prompt carried microseconds, and that line sits above your notes and the
  conversation so far. Ollama caches the prompt only up to the first
  difference, so every round of every turn re-read the whole thing from
  scratch. It is now to the minute — identical across the rounds of one tool
  loop, which is exactly where the re-reading was costing the most.
- **SearXNG moves to a free port instead of giving up.** Port 8888 is a
  popular number, and "close whatever has it" is advice that assumes you can.
  It now tries 8080, 8081, 8890 and 8899 in turn, and `MEMORYMAP_SEARXNG_PORT`
  picks one yourself. A SearXNG already answering on the wanted port still
  wins over a free one — that is ours from a previous run, and moving would
  start a second copy beside it.
- **The dashboard's widgets no longer go missing on a cold load.** Starting the
  app fetched your notes and rendered the open tab at the same time, so the
  dashboard could draw its brand-new-notebook card over a notebook full of
  notes; switching tabs and back fixed it, which is how it was noticed.

### Added

- **A new document, without leaving the note.** The *Add to document* picker —
  in the capture box and in a note's ⋯ menu — offers **＋ New document…**, so
  a note can go into a document that does not exist yet.
- **The app's icon is the app's icon.** The top bar now shows the favicon, so
  the mark in your browser tab and the mark above the tabs are the same thing.
  The generated emblem stays the hero on the dashboard and appears small and
  animated in the header beside the AI status dot, so it is on screen whatever
  tab you are on.
- **Search operators in the notes filter**: `tag:work`, `cat:recipes`,
  `is:pinned` / `private` / `linked` / `untagged`, `"exact phrase"`, and
  `-exclude`. Plain words now match in any order rather than as one substring.
  The heading shows "3 of 6" while a filter is active, matched words are
  highlighted in the results, and a ? button explains the syntax. All of it
  works with no AI running.
- **Saved filters**: name a filter and keep it as a chip above the notes list.
  Stored as a preference, so it survives a restart.
- **Private notes**: mark any note private and its text is encrypted at rest
  with AES-GCM. The design is an envelope — a random data key encrypts the
  notes, and your password only encrypts that key — so changing your password
  re-wraps 32 bytes instead of re-encrypting every note, which is where an
  interruption could otherwise lose data. Private notes are kept out of search
  and are never given to the AI, and their embeddings are deleted (a vector
  encodes what a note is about, so keeping one would leak the point). The key
  exists in memory only while the app is unlocked. There is no recovery if you
  forget your password — that is inherent to encryption, not a shortcut here.
- **Documents tab**: a markdown editor for long-form writing, with a live
  preview, autosave, `Ctrl+S`/`B`/`I`, `.md` and PDF export, and AI editing.
  Documents are a separate table from notes on purpose — a note is a captured
  thought, a document is something you sit down and write — so they never
  appear in note search or the graph. AI edits are always shown as a proposal
  to accept or reject, never written straight into the file.
- **Writing room** (Notes tab): write loose thoughts, get a drafted note back,
  then edit the draft or add more thoughts and it folds them in without undoing
  your changes. Starts folded so it doesn't add weight to the Notes tab.
- **Attach notes to a chat message**: a 📎 picker with search and multi-select.
  Attached notes go to the model ahead of retrieval and are flagged as chosen
  by you. Binned notes can't be attached.
- **Rename and delete categories**, from the Notes sidebar. Renaming onto an
  existing name merges the two; deleting keeps the notes and moves them to
  Uncategorised. Neither can lose a note.
- **Back-to-top button** on every tab except the graph, and the Notes panels
  (Activity / Tags / Recycle bin) return to the top when opened.
- **Settings navigation is grouped** — the AI, your notebook, system, getting
  help — instead of eleven flat buttons. Appearance is unchanged.
- **Settings → Background tasks shows everything that's running**, not just
  two of them. It knew about re-indexing and model downloads; the embedding
  model loading at startup (a ~90 MB download the first time) and the SearXNG
  install (several minutes) both ran with nothing on that screen to say so —
  which reads as the app being broken rather than busy. The list now comes
  from the server, with a live step for each job, a progress bar where there
  is a real number to show, and a Quit button only on the jobs that can be
  stopped safely.
- **Notes and documents are joined up.** The capture box has an **Add to
  document** picker, so a note can be attached to what you're writing as you
  save it rather than afterwards. The note then carries a 📄 chip that opens
  that document, and the document lists the notes it draws on, each with a
  detach button. Detaching removes the connection and never the note; binning
  a note takes it out of the document's list on its own. A note you wrote
  before the document existed can be added afterwards, too — **📄 Add to a
  document** in a note's ⋯ menu picks from the documents you have, and the ×
  on the note's 📄 chip detaches it again without going to find the document
  first.
- **The graph has layouts.** A picker for how the notes are arranged: the
  force-directed **web** as before, a **tree** — notebook → category → note,
  reading left to right, with a note's replies branching off the note they
  answer — and a **radial tree**, the same shape wrapped into a circle. Most
  notebooks have far more filing than links, and a force graph of
  mostly-unlinked notes is a cloud of dots; a tree shows the structure that is
  actually there. Your choice is remembered.
- **Both trees are legible at the size of a real notebook.** Reported with a
  photo — "the graph tree and radial are a bit hard to read and aren't neat" —
  of 29 notes squeezed into the panel's height at eighteen pixels a row. The
  tree now gives every note the room a label needs and pans if that makes it
  taller than the panel, zooming out only when the whole thing nearly fits;
  labels sit beside their note and above their branch, joined by elbows rather
  than straight diagonals. The radial sizes its rings from the panel and the
  note count instead of a fixed radius, gives each category a wedge of its own
  so a one-note category is not squeezed against its neighbour, and rings by
  depth — notebook, category, note, reply — so a category that happens to
  contain a thread no longer sits a ring in from its siblings.
- **A Timeline tab.** Opening on days by default. Your notes on a time axis, in bands — one per category
  or tag — with the bucket size you choose, from days to years. A note sits
  where it is *about* when it says so ("the beans need netting next week"
  plots on that week, marked 🕓, with the date it was written on hover) and at
  when it was written otherwise. Click any note to open it.
- **Notes remember what "tomorrow" meant.** A note saying "the deadline is
  next Friday" is correct the day it is written and misleading forever after,
  and nothing recorded which Friday it was. Every note's relative time
  phrases — tomorrow, last week, in three days, next Friday, two months ago —
  are now worked out when it is saved and kept beside it, shown as a small
  chip (`🕓 last week → week of Jul 20`) with the full date on hover. The
  phrase is always shown next to the date, because the resolution is a rule
  rather than a fact and you should be able to disagree with it. The AI gets
  them too, so it can answer questions about a note's own dates instead of
  guessing. It is plain pattern-matching, not an AI feature: it works with
  Ollama off, and it can never stop a note being saved. Private notes are
  excluded, and marking a note private removes anything already stored.

### Changed

- **A message is only offered the tools it plausibly needs.** Every tool is
  described to the model again on every round of every message, and all of
  them together were about three quarters of what it read before reaching
  your question — on a small model, most of the window. A question now
  carries the reading tools; "remind me…" adds the reminder ones; "tidy up my
  notes", which could mean anything, still gets everything. Measured: the
  fixed overhead of a typical question drops from ~3,157 tokens to ~1,439.
  It only decides what is *offered* — a tool is never blocked from running —
  and Settings → Tools can turn it off.
- **Skills are jobs now, not saved prompts.** A skill was a name and a string,
  and clicking one dropped that string into the chat box — which is why asking
  the AI to make one only ever produced another sentence. A skill now carries
  ordered **steps**, an explicit **tool allowlist**, and declared **inputs**
  it asks you for before it runs, and `save_skill` accepts all of them so the
  AI can write a real one. Skills with only a prompt keep working exactly as
  before.
  - **Naming a skill's tools makes it work on a small model.** Only those
    tools are offered for the run — 1,963 characters of schema for "Auto-tag
    my notes" instead of the full registry's 10,215 — and calling anything
    outside the list is refused rather than merely discouraged. That leaves
    far more of a 4k context window for the actual question.
  - **Running one is a job, not a paragraph.** Each step is its own turn, so
    the steps tick off as they finish, and a step that fails is named with the
    reason instead of the run quietly doing less than it claimed.
  - **A run ends in what changed** — every note it wrote, with a button to see
    it and a button to put it back. Nothing is taken on trust from the model's
    own account of what it did.
  - **A skill asks for what it needs first.** "Draft an email" has a box for
    who it's to and what it's about, instead of spending a chat round asking.
  - The ten built-in skills moved out of the frontend and are served by the
    API, so the AI can list and run them too — it used to answer "you have no
    skills" while ten were on screen.

### Fixed

- **SearXNG couldn't be imported on Windows at all.** With the install
  finally finishing, the start died on `ModuleNotFoundError: No module named
  'pwd'` — a POSIX-only module SearXNG imports at the top of one file. It is
  the only such import in the whole package, and the only thing it's used for
  is naming the current user in an error message that can't be reached without
  a Valkey database. A stand-in module now goes into SearXNG's own virtualenv
  where the platform hasn't got one.
- **The install said it had worked when it hadn't.** Its final check was
  `import searx`, which passed on Windows while the thing that actually runs —
  `searx.webapp` — could not be imported. It checks that now, using the same
  settings a real start uses.
- **The chat box couldn't grow.** It was a one-line `<input>`, so a
  three-sentence question scrolled sideways inside a box the width of the chat
  pane and you couldn't read what you'd written before sending it. It now
  grows with the text up to a cap. Enter still sends; **Shift+Enter** writes a
  newline, which a single-line box couldn't offer at all.
- **One long note filled the whole list.** Notes past about ten lines are now
  clamped with a fade and a "Show more", so the list stays a list. Only notes
  that genuinely overflow get one — a note you can already read in full never
  grows a button.
- **The app was naming the wrong embedding model.** Settings → Models said
  "Built-in (all-MiniLM)" — it had been `BAAI/bge-small-en-v1.5` for two
  changes, and the only way to find out was to watch it download from Hugging
  Face in the log. Reported by someone who did exactly that. The name now
  comes from the running service rather than a string in the interface, so it
  cannot drift again, and the built-in option says it downloads on first use
  instead of claiming it needs no download.
- **The SearXNG install had no progress and no output**, so a working install
  and a hung one looked identical for several minutes. It now shows which of
  five stages it is in, a bar that moves (the download reports real bytes),
  and the lines pip is printing as it prints them — which is what actually
  tells you it is alive while a bar sits still. Both appear on the Web search
  screen and in Settings → Background tasks.
- **A finished install left "Installing SearXNG…" on screen** under a badge
  that said "Stopped" — reported with a photo, and the install had in fact
  succeeded. That line now always says something current.
- **SearXNG now installs, starts and answers.** Five separate bugs, none of
  them in its log, because three of them happened before it wrote a line.
  - *`git clone` can never work on Windows.* Four files in the SearXNG
    repository have a colon in the name (`…/searxng.conf:socket`), which
    Windows refuses — git fetches everything and then dies at the checkout,
    leaving a half-written folder behind. `pip install <tarball-url>` unpacks
    the same files, so the no-git path was broken there too. The archive is
    now downloaded and unpacked by the app, skipping the handful of members a
    filesystem can't hold (nginx/uwsgi deployment templates) and any that
    would escape the folder. git is no longer used.
  - *`pip install -e .` can never work anywhere.* SearXNG's setup.py imports
    `searx`, which imports `msgspec`, which pip's isolated build environment
    does not have. The requirements go in first now and the package is built
    with `--no-build-isolation`, as SearXNG's own tooling does.
  - *A plugin killed it at boot.* `tracker_url_remover` downloads a rules file
    from clearurls.xyz during startup and doesn't catch a failure, so an
    offline or proxied machine lost the process before it bound the port. The
    generated settings turn it off; MemoryMap strips tracking parameters
    itself.
- **…and two Windows-only bugs, both a POSIX idiom that means something else
  on Windows.**
  - *"…\data\searxng\src does not appear to be a Python project: neither
    'setup.py' nor 'pyproject.toml' found."* The installer skipped the
    download whenever that folder existed, then handed it to pip. Reinstalling
    made it permanent rather than fixing it: the wipe used
    `rmtree(ignore_errors=True)`, git marks `.git/objects` read-only, Windows
    enforces that — so the writable files went, the folder stayed, and the
    wipe reported success. Now the question asked is whether the folder
    *contains a project*, the wipe clears the read-only bit (moving the tree
    aside if it still can't delete it) and says what survived, and an install
    isn't called done until `import searx` works in the new virtualenv.
  - *"SearXNG started but never answered."* The liveness check was
    `os.kill(pid, 0)` — on Windows any signal but CTRL_C/CTRL_BREAK goes to
    `TerminateProcess`, so checking whether the instance was alive killed it.
    The Web search screen polls status every three seconds, so it was killed
    seconds after every start.
- **One wide code block widened the whole page.** "Ask about this" renders a
  fetched page into the chat, and a wide code block, a nine-column table or a
  long URL pushed the layout sideways: a horizontal scrollbar, and text that
  read as scaled up because every paragraph had been stretched to the width of
  the widest thing on screen. Measured at 1280px, the document was 3425px
  wide. The cause was CSS automatic minimum sizing in two places — a `1fr`
  grid track and a flex item with `min-width: auto` — which is what stopped
  the `overflow-x: auto` already set on code blocks and tables from taking
  effect. Now 0 overflow across six tabs at four widths.
- **The top bar overflowed itself by up to 215px.** The block meant to let the
  tab strip scroll declared `flex`, but so did the base rule ~70 lines later
  at equal specificity, so the tabs stayed rigid at 579px and the header
  controls were squeezed to 76px around 201px of buttons — Settings, the lock
  and the theme toggle pushed out of the window. Worst in the desktop shell,
  whose 1200x800 window lands at 800–960 CSS pixels on a scaled display. The
  documented degradation ladder (wordmark → status pill → tab padding → tabs
  scroll) now actually happens, and the scroll fade is measured rather than
  guessed from a breakpoint.
- **Accent swatches did nothing while any theme was selected.** `[data-accent]`
  rules sit near the top of the stylesheet and `[data-palette]` rules near the
  bottom, both the same specificity — so the palette won on source order, and
  every theme selects a palette. An explicit pick is now an inline custom
  property, which beats both. Clearing an accent also left it applied, because
  `applyAppearance` re-applied every setting except that one.
- **The search-engine radios reset themselves.** Picking one saves nothing —
  "Apply & re-index" does — and the guard against the status poll was a focus
  check, so the moment focus moved the poll put the saved backend back and the
  setting looked stuck.
- **Editing an answer reverted when the chat was reopened.** The edit updated
  the message text, but a reopened chat replays the saved step timeline, which
  kept its own copy of the model's original wording.
- **Sketches couldn't be opened from the graph.** A sketch is a note plus a
  PNG, so its node showed the caption and nothing else — the drawing was
  unreachable from the map. Image attachments now preview in the popup and
  open full size on click.
- **"New note" on the dashboard did nothing** unless you had left the Notes tab
  on the capture section. Focusing an element inside a hidden sub-tab silently
  fails; an audit of every quick link from all three starting sections found
  this one and ten feature-catalog entries with the same fault.
- **Uploads failed with a 500** if the uploads folder had gone missing. For a
  sketch that lost the drawing while keeping the caption.
- **`bg-motion` had two conflicting defaults** in `APPEARANCE_DEFAULTS` after
  two sessions fixed the same blank-picker bug independently; the later one
  silently won, so the documented default was not the one anyone got.
- **Web search reported all its failures the same way.** No egress, a
  rate-limit challenge page, and a genuine no-results page all arrived as an
  empty list, which is why this was repeatedly investigated as a parser bug.
  Status and body length are now logged for every search (never the query),
  and the first two are named for what they are.
- **`pytest` didn't work in a fresh clone** without an editable install, though
  the README and CONTRIBUTING both say to run exactly that.
- **Keyword search only matched contiguous substrings.** "bread proving" found
  a note that "proving bread" did not — word order was something you had to
  guess. It now matches every word in any order across content and tags, and
  ranks results (exact phrase, then tags, then the opening of a note) rather
  than listing them newest-first. With no AI running this is the whole of
  search, not a fallback.
- **AI-only buttons looked usable with no AI.** Improve, Magic Add, Draft it
  and AI edit stayed enabled, so you'd type a note, press the button, wait, and
  get an apology. They're disabled with the reason in the tooltip. Save, Ask,
  search, tags, categories, reminders, documents and the graph are unaffected —
  they work fully without AI.
- **The status pill announced faults instead of capability.** "search AI
  unavailable — see Settings → Logs" pointed at a log viewer; it now reads
  "word search on · AI search unavailable" with the detail in the tooltip.
- **The command palette had gone stale** — it knew nothing about Documents, the
  writing room, or the newer settings screens.
- **The chat answered "hey" with a summary of your notebook.** Every message
  was retrieved-for and then answered "using ONLY the notes provided"; on an
  empty notebook a greeting got "I couldn't find any saved notes matching that
  question". Messages are now routed first, and small talk skips retrieval and
  the agent entirely. Anything the router isn't sure about falls through to the
  previous behaviour.
- **Message metadata was missing whenever tools were on** (the default). The
  agent path never read the token counts out of Ollama's response, so the line
  under each answer lost everything but the model name and elapsed time.
- **Editing a chat message didn't edit anything** — it copied the text into the
  input box and left the original exchange in place, so a one-word correction
  left the typo, the answer to the typo, and the fix all in the thread. The
  bubble is now the editor, and saving clears the replies that followed.
- **Only one of the five background-art styles ever ran.** The dropdown's
  values didn't match the implemented styles, the chosen style was read from a
  key nothing writes, and the draw loop called a method on an undefined
  variable. Two styles had no way to be selected at all. The intensity slider
  now scales the art itself, not just its opacity.
- **The Notes sections wouldn't collapse** and showed two chevrons each: two
  implementations of the feature were both live, so every click toggled twice.
- **Reminders landed at the wrong time.** The due field opened at 9am tomorrow
  rather than now, and Magic Add was given the time in UTC, so every relative
  phrase ("tomorrow evening") resolved against the wrong clock.
- **The graph node popup could hang off the bottom of the map** — it was
  positioned before the note loaded, then grew as its chips and buttons
  rendered.
- **Note timestamps were misaligned** from card to card: two `margin-left:auto`
  in one flex row split the free space between them.
- **Jumping to a note looked like nothing happened** — the highlight started
  fading as the scroll began, so it was gone by the time the note arrived.
- **The markdown export navigated the app away** instead of downloading: a
  plain link carries no auth header, so the server's 401 was rendered in place
  of the app.
- Dependency versions are capped, so an upstream major release can no longer
  break a clean install.

### Added

- **Learnability**: a first-run welcome tour (5 slides, re-runnable), a new
  Settings → Help section, and a searchable "Tools & features" directory of
  everything the app can do (reached from the dashboard quick links).
- **Dashboard welcome banner**: an AI-written greeting (`GET
  /insights/greeting`, cached per time-block, with handwritten fallbacks
  whenever the local model is unavailable), a line summarising your notebook,
  a live clock, and one-tap quick actions. The greeting phrase never contains a
  name — the display name is added from preferences. The Reminders tab shows a
  live clock too, so "now" is always visible.
- **One-click launchers**: `start.bat` (Windows) and `start.sh` (macOS/Linux)
  create the virtualenv, install/update dependencies, copy `.env`, and start
  the app. They re-install only when `requirements.txt` changes.
- **Accessibility**: interactive chips are now real buttons (focusable,
  Enter/Space), and the note-card ⋯ menu supports ↑/↓/Home/End/Esc.
- **Reminders**: priority (low/normal/high) and recurring
  (daily/weekly/monthly) fields, priority colour-coding, automatic rescheduling
  when a recurring reminder is completed, and a "Magic Add ✨" box that turns
  natural language into a reminder via `POST /reminders/parse`.
- **Dashboard**: focus-timer widget (presets + custom minutes), activity
  heatmap (`GET /insights/heatmap`), weighted tag cloud
  (`GET /insights/tag-cloud`), a personalised greeting with a `display_name`
  preference, dense grid packing, and a per-widget Wide/Narrow toggle.
- **Appearance**: regrouped into scannable sections, plus a custom accent
  colour, four new accent presets (Sunset, Ocean, Mint, Grape), a custom page
  background, corner-rounding slider (`--radius`), glass blur-strength slider
  (`--glass-blur`), a Spacious density, five background-art styles (Aurora,
  Constellation, Waves, Floating orbs, Mesh gradient), and an advanced
  custom-CSS box.
- **Chat/AI**: an in-chat web-search toggle, per-exchange delete
  (`DELETE /conversations/{id}/turns/{index}`), in-place regenerate
  (`PUT /conversations/{id}/turns/last`) instead of stacking a second answer,
  tool-activity chips that persist across reloads, four more built-in skills,
  and the `get_current_time` + `summarize_notes` tools.
- **Graph**: Gravity/Spread physics sliders, a click-to-edit node popup, a
  Labels toggle, a plain-language stats line, connection-count tooltips, node
  halos, and highlighted "hub" notes. The dashboard constellation gains a
  caption and a category colour key.
- **Notes**: sticky category sidebar, collapsible Capture / Ask / Browse
  section cards with remembered state, and a richer markdown renderer — GFM
  pipe tables, blockquotes, horizontal rules, `####`–`######` headings,
  `~~strikethrough~~`, task-list checkboxes, and bare URLs.

### Fixed

- **Lower chat latency and a smoother typing indicator.** `/chat/stream` now
  flushes a first byte immediately and runs retrieval inside the stream, so the
  UI no longer appears frozen during a cold-start search. Live-markdown
  re-rendering is throttled to cut main-thread jank on long answers, and
  anti-buffering headers were added.
- The dashboard no longer breaks when a widget renderer is synchronous — one
  failing widget can only spoil its own card.
- Settings checkboxes stacked correctly instead of running together (the
  `display: block` rule targeted the wrong container).
- The Appearance "Glass & effects" toggles no longer stack on one line (stale
  `#settings` / `#prefs-panel` selectors that matched nothing).
- A failed startup call no longer stops the rest of the app from loading, and
  an unreachable server fails fast with a clear message instead of hanging.
- `requirements.txt` — two optional extras were written as literal
  `pip install …` lines, which made pip reject the whole file.

### Added

- Repository documentation & tooling pass: `docs/ARCHITECTURE.md` (a full
  project overview), `CONTRIBUTING.md`, `SECURITY.md`, this changelog, GitHub
  issue/PR templates, and a rewritten README.
- CI upgraded to lint with ruff and run the test suite across Python 3.11, 3.12,
  and 3.13, with concurrency-cancellation and manual dispatch.
- CodeQL static security analysis workflow (push / PR / weekly).
- Dependabot config for weekly pip and GitHub Actions updates.

### Added

- **Uninstall Ollama models from the app.** Settings → Models lists installed
  models with their size and a Remove button; the models in use (chat, utility,
  embeddings) are protected. Backed by a new `/models/delete` endpoint.
- **Keyboard-shortcuts cheat-sheet.** Press `?` (or use the command palette) for
  a dialog of all shortcuts.
- **Dashboard: more widgets & cleaner layout.** New "Top tags" and "Recently
  added" widgets; the "Drag widgets" hint now shows only in edit mode; widget
  bodies are height-capped so one tall widget no longer leaves big gaps; and all
  widgets share one consistent internal spacing.
- **Reminders: snooze, edit, presets.** Snooze (+1h / tomorrow), inline edit,
  quick-due presets, group counts, and bidirectional relative times.
- **Editable skills, persona tooltips.** Edit a saved skill in place (rename and
  all), and hover a persona in the chat picker to see what it does.
- **More appearance options.** Nine accent colours, a Font choice
  (System / Serif / Mono), and a Reduce-motion toggle; subtle button press
  feedback throughout.
- **Action skills — skills that actually *do* things.** Skills can now be
  marked "can make changes": running one turns on the AI's tools for that
  message, so it uses them instead of only answering (destructive steps still
  ask first). Two new tool-using built-ins — 🏷 Auto-tag my notes and
  🔗 Link related notes — and a "can make changes" checkbox when you create
  your own. Action skills are marked with a ⚙ in the chip row.
- **Per-note "Re-evaluate with AI".** A ⋯-menu action on every note that
  re-runs the AI to refresh its confidence (and category, unless you filed it
  yourself) and suggests topic tags and links to related notes — each applied
  with a click, inline on the card. Backed by `POST /entries/{id}/reevaluate`
  and a new `librarian.suggest_tags`; every step is best-effort so it still
  works (with empty suggestions) when the AI is offline.
- **Chat enhancements.** Per-message actions revealed on hover — copy any
  message, **edit & resend** your last question, **regenerate** the last answer
  (re-runs it without a duplicate prompt bubble), and read-aloud; **export a
  conversation to Markdown**; role labels on every bubble; and a friendly
  empty-state welcome so the chat page isn't a blank rectangle.
- **Graph view enhancements.** On-screen zoom controls (＋ / － / fit-to-view)
  so zooming no longer depends on discovering scroll/pinch; hover-spotlight —
  pointing at a note dims everything except it and its directly-linked
  neighbours (shares one dimming pass with search so they never conflict); a
  "Hide unlinked" toggle to declutter the map to just the connected web; and a
  visual pass (accent focus ring + glow on the hovered node, a soft radial
  background wash, smoother node transitions).

### Fixed

- **"Ask your notebook": Retry/Copy/read-aloud buttons overlapped the answer.**
  The answer heading's action buttons used `float: right`, which escaped the
  heading and rendered on top of the answer box whenever the "answered by …"
  chip was long. The heading is now a flex row; the buttons sit inline on the
  right and wrap onto their own line when space is tight.
- **Clearer error when a chat model is picked as the Ollama embedding model.**
  Selecting a generation model as the search engine made Ollama answer
  `/api/embed` with a raw `501 Not Implemented` that gave no hint what was
  wrong. The app now detects this (501 / 400 / "does not support embeddings")
  and tells the user to pick a real embedding model such as `nomic-embed-text`.
- **Windows: `torch_xpu.dll` load failure (WinError 127).** After the
  `sentence-transformers` bump pulled a newer torch, the default Windows wheel's
  Intel GPU library failed to load and semantic search silently fell back to
  keywords. `requirements.txt` now installs the CPU-only torch build on Windows
  (all this app needs, and ~10× smaller); other platforms are unaffected. Added
  a README Troubleshooting section for anyone who already installed the broken
  wheel.
- Cleaned up lint issues flagged by ruff (ambiguous variable name, unused
  imports) so `ruff check` is clean.

### Ideas / not yet

- A GitHub Pages **landing page** (marketing/showcase only — the app itself is a
  local Python server and can't run on Pages).

---

## Development history

MemoryMap AI was built in numbered phases and lettered "waves." This is the
condensed record of what each one delivered.

### Phases 1–5 — Core product

- **Phase 1 — Walking skeleton:** server starts, entries stored in SQLite,
  tests green.
- **Phase 2 — Make the AI real:** auto-categorising janitor + question-answering
  librarian + semantic search, verified end-to-end with a real Ollama model.
- **Phase 3 — Web interface:** capture box, category sidebar, chat panel showing
  the answer *and* the raw results, confidence flags.
- **Phase 3.5 — Model Manager:** pick & download Ollama models in-app; switch the
  embedding backend with a safe automatic re-index.
- **Phase 4 — Core MVP:** single-user unlock, manual overrides, recycle bin,
  entry linking, guided mode, audit viewer, export, preferences.
- **Phase 5 — Quick access + polish:** recent questions, most-used dashboard,
  optional AI profile, glassmorphism UI with dark mode.

### Waves A–I — Platform, power features, hardening

- **Waves A–D — App shell & power features:** tabbed UI, settings modal, log
  viewer, note threads/files/pins/tags, chat tab with personas and saved
  conversations, dashboard, reminders.
- **Wave E — Graph view:** Obsidian-style force-directed map (D3 vendored
  locally).
- **Wave F — Platform:** command palette (Ctrl/Cmd-K), markdown import/export,
  daily local backups + restore, PWA + mobile pass, opt-in web search, sketch pad.
- **Wave G — Agentic tools + skills:** the chat AI can create/tag/pin/link/delete
  notes and set reminders (destructive actions always confirmed), plus one-click
  skills.
- **Wave H — Voice & desktop:** local Whisper dictation (optional), read-aloud,
  and a `python -m memorymap --desktop` window (optional pywebview).
- **Wave I — Hardening:** GitHub Actions CI (offline test suite), accessibility +
  keyboard + loading polish.

### Later waves — UI & graph refinements

- **Wave K:** empty states, streak widget, high-contrast mode, larger tap targets.
- **Wave L:** UI rework — accessibility, usability, design.
- **Wave M:** graph filters + search + pinning, image thumbnails, sharing, batch
  operations.
- **Wave N:** graph fixes + auto-linking, AI writing help, a dedicated utility
  model, a tasks manager.
- **Wave O:** stale-cache and re-lock fixes, brand logo, tool toggles; fixed the
  agent hallucinating note creation; expanded Appearance settings.

### A model per feature

- The Chat tab, Write with Atlas, the documents AI assistant and the Guide
  can each run on a model of their own. Settings, Models lists them: every
  row says which model it is on and whether that is its own choice or
  inherited, each row has a reset that is live only while it is overridden,
  and one button under the list hands every feature back to its default and
  says how many that is. The same picker is in each surface's own menu, so
  changing one does not mean walking to Settings. A feature left alone
  follows the model it inherits, so changing the chat model still changes
  it.
- The Notes sub-tab is called "Write with Atlas". The tab button said "Write
  with AI" while the panel it opens was already headed "Write with Atlas".
- The Guide's send button reads as pressable again. It was never disabled:
  it was painted in the app's secondary tier while the field beside it was
  at full strength.
- The Guide's thinking is a labelled block that folds away when the answer
  starts, rather than a line and a half of clipped grey text.
