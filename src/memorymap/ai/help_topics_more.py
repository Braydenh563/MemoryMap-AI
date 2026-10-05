"""The Guide's reference, part two: every Settings section, the companion, the
faces, and the app's layout, plus how each entry is laid out as an answer.

INBOX 430 (the owner): "expand the help content massively, covering every
tab, setting and feature", after the Guide told him the corner companion was
"a feature within the Ask tab". It had nothing to say about the companion at
all, so a model with no reference guessed. The rule stays the one
`help_chat.HELP_TOPICS` states: an entry is the model's only source of facts
about the app, so each one here was written from the running app's own
controls and their own wording (Settings, section by section), not from
memory of what the app used to do.

`MORE_TOPICS` joins `HELP_TOPICS` (help_chat.py); `TOPIC_META` gives every
entry, old and new, the parts the system answer is laid out from
(`help_chat.system_answer`): a title, the path to where it lives, the steps
where there are steps, and the settings row a link opens (`target`, the row's
id, which `openSettingsModal(section, target)` scrolls to and lights).
"""

from __future__ import annotations

MORE_TOPICS: list[dict] = [
    {
        "id": "companion",
        "keywords": (
            "companion", "corner companion", "buddy", "mascot", "sidekick",
            "little character", "character in the corner", "call back",
            "call it back", "hide the companion", "show the companion",
            "companion size", "the little guy",
        ),
        "body": (
            "The corner companion is a small character that lives on the page, "
            "not in any tab: it finds a free spot on each page, perches on a "
            "panel or a toolbar and rides with it as the page scrolls, reacts "
            "to what you do, and naps when you are away. It steps out of the "
            "way of menus, popups and the guided tour. Choose who it is in "
            "Settings, Appearance, Atlas and faces, Corner companion: Off, "
            "You, The chat's persona, Atlas, or Your own character (a name and "
            "parts of its own). Companion size is Small, Medium or Large, or "
            "drag the handle at its corner. Drag it onto a panel and that page "
            "keeps it there. Right-click it, or press Shift+F10 on it, for its "
            "menu: Say hello, Enlarge, Stay here on every page, Let it choose "
            "its spot here, a size, Call back and reset its place, and Hide. "
            "Ctrl+Shift+Y shows or hides it from anywhere, and the command "
            "palette and Find anything have Show or hide the companion. If it "
            "is ever out of reach, Call back (beside the setting, in its menu "
            "or in the command palette) brings it back."
        ),
        "badge": {"label": "Corner companion", "section": "appearance", "target": "avatar-buddy-row"},
    },
    {
        "id": "atlas-look",
        "keywords": (
            "atlas look", "atlas style", "classic globe", "globe", "atlas character",
            "atlas's face", "atlas mood", "atlas moods", "masculine", "feminine",
            "what does atlas look like", "change atlas", "atlas avatar",
            "assistant avatar", "app emblem", "reply avatar", "chat avatar", "app logo",
        ),
        "body": (
            "Atlas is drawn as a small character of starlight with rings "
            "round its head, or, if you prefer, as the classic glowing globe: "
            "Settings, Appearance, Atlas and faces, Atlas style. Atlas look "
            "picks Masculine or Feminine, or Auto, which follows Face looks "
            "when that is set to one look and your own face's look otherwise; "
            "it is used everywhere Atlas appears, the dashboard mark and the "
            "chat's replies included. Assistant avatar, in the same place, swaps "
            "the face on the assistant's chat replies, the popup agent and the "
            "guide between Atlas and the app's animated emblem (it stays still "
            "under Reduce motion); other personas keep their own faces. "
            "Atlas's face follows the app's mood: "
            "thinking while an answer runs, happy when it lands, worried at an "
            "error, sleepy late at night. Enlarge, in the companion's menu or "
            "on any face, shows the full drawing."
        ),
        "badge": {"label": "Atlas look", "section": "appearance", "target": "atlas-look-row"},
    },
    {
        "id": "faces",
        "keywords": (
            "avatar", "avatars", "generated face", "profile picture", "face looks",
            "avatar animation", "faces follow", "follow the pointer", "persona face",
            "dashboard mark", "faces", "blinking", "my face",
        ),
        "body": (
            "Every person, persona and chat gets a generated face, drawn from "
            "its name: a name that says a mood (\"sleepy wizard\") or an animal "
            "gets that face, and any other name still gets a character of its "
            "own, the same one every time, and each character wears a mood in "
            "its own way. Settings, Appearance, Atlas and faces: Avatar "
            "animation (Always, On hover, Off) lets faces blink and act out "
            "their mood, Faces follow the pointer turns eyes and heads toward "
            "your mouse, Face looks sets hair, brows and jaw (Neutral, "
            "Masculine, Feminine; never read from a name), and Dashboard mark "
            "swaps the dashboard's logo for a face. Your own face is in "
            "Settings, Profile, Your look: Shuffle redraws it, and Choose parts "
            "yourself sets any part by hand. Reduce motion stops the animation."
        ),
        "badge": {"label": "Atlas and faces", "section": "appearance", "target": "avatar-motion-row"},
    },
    {
        "id": "profile",
        "keywords": (
            "profile", "my profile", "my name", "display name", "your look",
            "shuffle", "change my name", "what to call me", "greeting name",
        ),
        "body": (
            "Settings, Profile is you, kept on this computer: Your name (shown "
            "in the greeting and on your mark), Your look (your face, drawn "
            "from your name; Shuffle redraws it and Back to my name's own "
            "undoes that, Choose parts yourself sets each part), and About me, "
            "which Atlas reads for more personal answers only while \"Let Atlas "
            "read your name and About me\" is on. Delete my profile data clears "
            "it; answers just get less personal."
        ),
        "badge": {"label": "Profile", "section": "preferences"},
    },
    {
        "id": "tools-setting",
        "keywords": (
            "tools it can use", "which tools", "turn off a tool", "disable a tool",
            "small model mode", "run budget", "tool list", "tokens per step",
            "tools offered", "using a tool", "use a tool", "stop atlas using",
            "cut that reply short", "model size",
        ),
        "body": (
            "Settings, Tools it can use lists the actions Atlas may take in "
            "Agent mode; turn one off and it is never offered. Destructive "
            "actions always ask you first, and once Atlas has read a web page, "
            "a file, or a note clipped or imported from outside, every change "
            "and every web request asks too. How many are offered at once: Only "
            "what the message needs (the default) or Always send all of them, "
            "if Atlas ever misses a tool you asked for. Small model mode offers "
            "a small model one tool at a time (Auto decides from the model's "
            "name, On, Off). Run budget caps what one skill run may spend, in "
            "tokens per step and in seconds; 0 means no limit. In Agent mode "
            "the model's size, read from its name, decides how many tools it "
            "sees and how long one step may write: under 3B and up to 8B get "
            "a short toolbox and a reply that runs long is cut short, 8B and "
            "up get everything."
        ),
        "badge": {"label": "Tools it can use", "section": "tools"},
    },
    {
        "id": "learned",
        "keywords": (
            "what it learned", "learned", "worked out", "derived", "forget everything learned",
            "read my notes now", "export what it learned",
            "while you were away", "disagree", "contradict", "answered later",
        ),
        "body": (
            "Settings, What it learned is what Atlas worked out by itself while "
            "reading your notes (a claim a note makes, a question it leaves "
            "open, two claims in different notes that disagree, a question a "
            "later note answers), where What it remembers is what you told it. "
            "The Dashboard's While you were away card counts each kind from the "
            "last read; a pair shows the other sentence under it, a button to "
            "open the other note and, for a disagreement, one to link the two "
            "notes as disagreeing. Every row "
            "says which note it came from, which model decided it and how sure "
            "it was. Edit a row and no later run overwrites it; delete one and "
            "it is never worked out again. What may run switches each kind off; "
            "Read my notes now runs it; Export what it learned and Forget "
            "everything learned act on all of it and never touch your notes."
        ),
        "badge": {"label": "What it learned", "section": "learned"},
    },
    {
        "id": "open-questions",
        "keywords": (
            "open questions", "questions view", "unanswered", "undecided", "still undecided",
            "answered by", "mark answered", "drop a question", "ask about these",
            "find questions", "generate questions", "read notes now",
        ),
        "body": (
            "Notes, Questions lists the questions your notes ask in passing, "
            "found when Atlas reads your notes (Read notes now, or on its own "
            "with background tasks on), newest note first: "
            "Open, Answered and Dropped, each with a count. A row says when and "
            "in which note it was asked; when a later note answers it, the row "
            "says so with the sentence, and pressing that line opens the note. "
            "Mark answered asks which note answers it and links the two notes; "
            "Drop puts a question aside; Reopen brings either back. Ask about "
            "these opens Ask answering from the notes with open questions only "
            "(Ask all notes under the box goes back). The Dashboard's While you "
            "were away card counts the open ones and names the oldest."
        ),
        "badge": {"label": "Notes", "tab": "notes"},
    },
    {
        "id": "general-settings",
        "keywords": (
            "smart quotes", "auto clear",
            "empty the bin", "delete old chats", "chat history", "mute notifications",
            "general settings",
        ),
        "body": (
            "Settings, General. Recycle bin: auto-clear binned notes after a "
            "number of days. Chat history: delete saved chats after a number "
            "of days (0 keeps every chat; pinned chats are never deleted). "
            "Notifications: mute everything except reminders. Writing: smart "
            "quotes and dashes in documents. Answer style moved to Settings, "
            "Personas, and Search relevance to Settings, Search and index."
        ),
        "badge": {"label": "General", "section": "general"},
    },
    {
        "id": "search-index",
        "keywords": (
            "search relevance", "minimum similarity", "above-average margin",
            "search engine", "semantic search", "embedding model", "re-index",
            "rebuild search index", "search index", "search is wrong",
            "too many results", "too few results", "search feels too strict",
        ),
        "body": (
            "Settings, Search and index. Search engine: the built-in one "
            "(recommended, about 650 MB of memory while the app is open) or an "
            "Ollama embedding model such as nomic-embed-text; changing it "
            "re-reads every note in the background and search uses keywords "
            "until it finishes. Search index: Rebuild search index after an "
            "update or a restore, or if search stops finding notes you know "
            "are there. Search relevance: Minimum similarity and Above-average "
            "margin; raise them for fewer, surer results, lower them if search "
            "feels too strict, and Reset to default undoes both."
        ),
        "badge": {"label": "Search and index", "section": "searchindex"},
    },
    {
        "id": "answer-style",
        "keywords": (
            "answer style", "concise", "detailed", "shorter answers",
            "longer answers", "friendly",
        ),
        "body": (
            "Settings, Personas, Answer style: how Atlas words its answers, "
            "Friendly (the default), Concise or Detailed, whichever persona is "
            "active."
        ),
        "badge": {"label": "Answer style", "section": "personas", "target": "pref-style"},
    },
    {
        "id": "background-tasks",
        "keywords": (
            "background tasks", "running now", "what is it doing", "job", "jobs",
            "battery", "battery-efficient", "save power", "quit the app",
            "quit memorymap", "stop the server", "close the app properly",
            "last run", "last ran", "background jobs", "job history", "did it run",
        ),
        "body": (
            "Settings, Background tasks shows what the app is doing right now "
            "(re-indexing, downloading a model, setting up search) with Quit on "
            "the jobs that can stop safely, and what has finished since it "
            "started. Background jobs lists every kind of job, the never-run "
            "ones too, with when it last ran and how it went, and beside each "
            "control (Back up now, Rebuild search index, Find duplicates, the "
            "importers) a line reads, for example, \"Last run 2h ago, "
            "succeeded, 412 notes indexed\", with the exact time on hover; a "
            "failure says why in a few words. Autonomous background AI is here "
            "too. Battery-efficient "
            "mode pauses background AI, heavy graph work and the moving "
            "artwork. Quit MemoryMap stops the app and its server properly, so "
            "the next start finds its port free."
        ),
        "badge": {"label": "Background tasks", "section": "tasks"},
    },
    {
        "id": "packages",
        "keywords": (
            "packages", "package", "pip", "install a feature", "optional feature",
            "extra", "extras", "dictation model", "embedding model", "markitdown",
        ),
        "body": (
            "Settings, Packages lists what MemoryMap can do with one more "
            "package installed: nothing there is needed to write, search, tag "
            "or organise notes, each one switches on a feature that is "
            "otherwise off, downloaded from PyPI to this machine. What pip is "
            "doing shows an install as it runs. Dictation model size runs from "
            "Tiny (fastest) to Medium (most accurate). Embedding models chooses "
            "what search by meaning uses; it is downloaded once and kept."
        ),
        "badge": {"label": "Packages", "section": "extras"},
    },
    {
        "id": "import-export",
        "keywords": (
            "import markdown", "import a folder", "import a pdf", "import word",
            "slide deck", "merge duplicates", "tidy up duplicates", "full backup",
            "export csv", "export json", "exports folder", "zip",
        ),
        "body": (
            "Settings, Import & export. Export your data as JSON, CSV, Markdown "
            "or a full backup (.zip of the database and media); Open exports "
            "folder and Save exports to set where files land. Tidy up "
            "duplicates finds notes that say much the same thing, no AI "
            "needed, and merging keeps every tag and bins the rest. Import "
            "markdown files or a folder (Obsidian frontmatter is understood), "
            "or a PDF, Word file or slide deck, one note per chapter or slide. "
            "Backups: Back up now, and how many to keep; one is also taken "
            "each day the app starts, and restoring snapshots first, so even a "
            "restore can be undone. App cache, at the bottom: Clear app cache "
            "reloads the app with fresh files and never touches your notes."
        ),
        "badge": {"label": "Import & export", "section": "data"},
    },
    {
        "id": "logs",
        "keywords": (
            "logs", "log", "support bundle", "report a bug", "bug report", "error report",
            "send a report", "email support",
        ),
        "body": (
            "Settings, Logs shows what happened, for when something did not "
            "work: filter by source and level, follow new lines, copy or clear "
            "them. The ? beside the three dots in its bar says what each control "
            "does. The support bundle collects the logs and the app's state; "
            "Email it opens a message to support with the bundle to attach."
        ),
        "badge": {"label": "Logs", "section": "logs"},
    },
    {
        "id": "find-anything",
        "keywords": (
            "find anything", "ctrl p", "finder", "find a note fast", "find a file",
            "jump to a note",
        ),
        "body": (
            "Find anything (Ctrl+P, or Find in the status bar) searches notes, "
            "files, documents and actions in one box as you type: Enter opens "
            "the top result, the arrows move, Esc closes. It lists the command "
            "palette's actions too, so \"dark\" finds Toggle light/dark."
        ),
        "badge": {"label": "Shortcuts", "section": "shortcuts"},
    },
    {
        "id": "background-art",
        "keywords": (
            "animated background", "background animation", "moving background",
            "wallpaper", "background style", "constellation",
        ),
        "body": (
            "Settings, Appearance, Animated background: Style picks the art, "
            "Movement how much it moves and Intensity how strong it is. Page "
            "background in Theme & colour sets the colour under it. Performance "
            "mode and Battery-efficient mode both stop it, and so does Reduce "
            "motion."
        ),
        "badge": {"label": "Animated background", "section": "appearance", "target": "bg-style-row"},
    },
    {
        "id": "themes",
        "keywords": (
            "save a theme", "my own theme", "custom css", "text size",
            "corner rounding", "zoom level", "colour scheme", "color scheme",
            "build a scheme", "border style", "shadow",
        ),
        "body": (
            "Settings, Appearance. Themes: save and switch your own. Theme & "
            "colour: Palette, Mode (light, dark or system), Accent colour or a "
            "custom one, Page background, and Build a scheme from one colour. "
            "Typography & layout: Text size, Font, Density, Corner rounding, "
            "Zoom, Border style and Shadow intensity. Effects & accessibility: "
            "Performance mode, the glass's sheen, blur and opacity, Progress "
            "indicators and Reduce motion. Advanced has Custom CSS. Ctrl+Shift+L "
            "switches light and dark from anywhere."
        ),
        "badge": {"label": "Appearance", "section": "appearance"},
    },
    {
        "id": "tabs-overview",
        "keywords": (
            "tabs", "what tabs", "overview", "getting started", "where do i start",
            "what is memorymap", "what does this app do", "tour of the app",
            "parts of the app",
        ),
        "body": (
            "MemoryMap has seven tabs along the top. Dashboard: your day at a "
            "glance and quick actions. Notes: capture and your notes list. "
            "Chat: ask and let the agent act on your notes. Graph: how notes "
            "connect. Library: documents, whiteboards, mind maps, files and "
            "everything else in one place. Timeline: everything by date. "
            "Reminders: what is due. Settings (the gear, or Ctrl+,) holds the "
            "rest, and Atlas the guide (this chat) answers how-to questions "
            "from any tab. Press m then a letter to jump between tabs, and "
            "Settings, Help starts the guided tour."
        ),
        "badge": {"label": "Help", "section": "help"},
    },
    {
        "id": "settings-overview",
        "keywords": (
            "settings", "where are the settings", "open settings", "find a setting",
            "search settings", "preferences",
        ),
        "body": (
            "Settings opens from the gear in the top bar or Ctrl+,. Its sections "
            "are grouped: AI (Models, Search and index, Personas, Skills, Tools "
            "it can use, What it remembers, What it learned, Web search), "
            "Notebook (Profile, General, Templates, Import & export), Look and "
            "feel (Appearance, Keyboard shortcuts), Privacy and security "
            "(Account & security, Privacy), System (Packages, Background tasks, "
            "Logs) and Help and About. The search box at the top of the list "
            "finds a setting by any word in it and lists the matching settings "
            "under it, each opening where it sits, and a long section has an "
            "index of its groups along its top."
        ),
        "badge": {"label": "Settings", "section": "general"},
    },
    {
        "id": "lock",
        "keywords": (
            "auto-lock", "auto lock", "change my password", "reset password",
            "other devices", "on my phone", "another computer", "sessions",
            "lock everywhere",
        ),
        "body": (
            "Settings, Account & security. Signing in: ask for a password when "
            "the app opens (private notes and other devices always ask). Other "
            "devices: let a phone or computer on your network open the app, "
            "always with your password; the traffic is plain http, not "
            "encrypted, so only on a network you trust. Change your password or PIN (private "
            "notes move across). Sessions: Auto-lock when idle, from 5 minutes "
            "to 12 hours, and Lock everywhere now; the lock in the top bar "
            "locks at once. There is no reset link: run python -m memorymap "
            "--reset-password in a terminal, which keeps ordinary notes, "
            "loses private ones, whose key is your password, and turns other "
            "devices off."
        ),
        "badge": {"label": "Account & security", "section": "account"},
    },
    {
        "id": "model-bench",
        "keywords": (
            "model bench", "test my models", "which model is best", "compare models",
            "best model for my notes", "benchmark", "try my models",
        ),
        "body": (
            "Settings, Models, Test my models runs your installed models on your "
            "own notes and recommends one. Tick the models to compare and press "
            "Run the test: each model files a sample of the notes you filed "
            "yourself, answers a question about each one from three notes shown "
            "to it, and calls a search tool five times. Every row shows Filing, "
            "Answers and Tools as a percentage, how long an answer took and how "
            "many tokens it used, with the first few things it got wrong, so you "
            "can check the recommendation. Use this one makes that model answer "
            "in chat. Stop ends a run, and a stopped run makes no "
            "recommendation. It needs at least six filed notes, runs entirely on "
            "this computer, and can be switched off in Settings, What the "
            "notebook learned, Model bench."
        ),
        "badge": {"label": "Test my models", "section": "models", "target": "bench-box"},
    },
    {
        "id": "margin-reader",
        "keywords": (
            "margin reader", "margin", "notes beside my writing", "related notes while writing",
            "did I write this before", "contradiction while writing", "second reader",
        ),
        "body": (
            "The margin reader reads with you while you write a document. Turn "
            "it on from the document's menu, While you write, Margin reader. A "
            "column to the right of the editor then shows at most three cards "
            "about the paragraph the caret is in, a moment after you stop "
            "typing: Repeats (you already wrote this in another note), Differs "
            "(the same thing with a different number or a not, or what the "
            "model judges a disagreement), Answers (it answers an open question "
            "from your notes), Date (a time in the paragraph, with Make a "
            "reminder) and Related. Each card has Open and Not this; nothing is "
            "ever written into your text. It is off until you turn it on, "
            "remembered on this device, and can be switched off everywhere in "
            "Settings, What the notebook learned, Margin reader."
        ),
        "badge": {"label": "What the notebook learned", "section": "learned"},
    },
    {
        "id": "web-clipper-bookmark",
        "keywords": (
            "bookmarklet", "clip to memorymap", "clip a page from my browser", "browser extension",
            "save this page", "clipper bookmark", "keep a web page", "clip a web page",
            "from my browser", "clip from the browser",
        ),
        "body": (
            "Settings, Import & export, Web clipper has a bookmark called Clip to "
            "MemoryMap. Drag it to your browser's bookmarks bar (or press Copy the "
            "bookmark and make a bookmark with it as the address). On any page, "
            "press it: a small MemoryMap window opens beside the page with its "
            "title and address, and Save as a note keeps the page's main text, or "
            "only the text you had selected. Your own browser sends the page, so "
            "nothing is fetched from the web: it works with web search off and on "
            "pages you signed in to see. No browser extension is needed. A clipped "
            "note keeps its address, Atlas treats its text as someone else's words "
            "and never follows instructions in it, and clipping the same page again "
            "points you to the note it made the first time."
        ),
        "badge": {"label": "Web clipper", "section": "data", "target": "web-clip-box"},
    },
    {
        "id": "import-apps",
        "keywords": (
            "import from notion", "notion", "evernote", "enex", "apple notes", "obsidian vault",
            "import from another app", "move my notes from", "switch from notion", "switch from evernote",
        ),
        "body": (
            "Settings, Import & export, Import from another app has four buttons: "
            "From Notion (choose the zip from Notion's Export, Markdown & CSV), "
            "From Obsidian (choose the vault folder), From Evernote (choose the "
            ".enex files you exported) and From Apple Notes (choose the folder an "
            "exporter app wrote, one HTML, Markdown or text file per note). "
            "Choosing starts the import and the toast's Undo moves exactly those "
            "notes to the recycle bin. Folders and notebooks become categories, "
            "tags and dates come along where the app wrote them, and links between "
            "Notion pages become wiki links. Each note remembers where it came from, "
            "so importing the same export again adds nothing twice and says how "
            "many were already here. Imported text is treated as someone else's "
            "words: Atlas never follows instructions written in it."
        ),
        "badge": {"label": "Import from another app", "section": "data", "target": "import-app-box"},
    },
]

#: **Every feature since 0.3.0, large and small** (INBOX 448 (1), the owner:
#: "the help settings as well as the help info available to the agents needs
#: more expansion for all the new features both large and small so people can
#: easily find out about all the features"). The inventory is
#: `tests/test_help_coverage.py`'s `FEATURES`, read from CHANGELOG's
#: Unreleased and 0.3.x sections: before these entries 8 of its 52 rows had an
#: entry that said so, and 4 reached it from the question a person would ask.
#: Each entry was written from the controls' own labels (index.html and the
#: module that draws them) and is keyed by the words a person searches with,
#: not the feature's name ("what does the percentage mean", "where are my
#: bookmarks").
MORE_TOPICS.extend(
    [
        {
            "id": "quick-note",
            "keywords": (
                "quick note", "alt+n", "jot down", "note from anywhere",
                "without leaving the page", "quick capture", "web clipper",
                "save a web page", "web page as a note", "clip a page", "paste a link",
                "clear the box", "clear what i typed", "clear button", "eraser", "undo clear", "start over on a note",
            ),
            "body": (
                "Quick note (Alt+N, or Quick note in the command palette) opens a "
                "small box over whatever tab you are on: type, press Ctrl+Enter, "
                "and the note is saved and filed in the background while you stay "
                "where you were. Escape closes it and keeps the words for next "
                "time; Open in Capture moves them to the full composer. The "
                "dashboard's Quick capture saves the same way. A bare link pasted "
                "into Capture or Quick note offers its page as a note through the "
                "web clipper, only while web search is allowed. \"Clear\" (the eraser "
                "icon) is in every box you type into: Capture, with its title, tags "
                "and files, Quick note, Ask, Chat and the popup agent. It shows only "
                "while the box holds something, empties it, and Undo (in the toast, "
                "or beside the box in a popup) puts it all back."
            ),
            "badge": {"label": "Notes", "tab": "notes"},
        },
        {
            "id": "note-outbox",
            "keywords": (
                "server is down", "server down", "server away", "failed to fetch",
                "waiting to save", "not saved", "lost my note", "kept on this device",
                "save while offline", "saved offline", "connection lost", "try now",
            ),
            "body": (
                "A note saved while the MemoryMap server is not answering (from "
                "Capture, Save as draft, Quick note or the dashboard's Quick "
                "capture) is kept on this device rather than lost, and is sent by "
                "itself when the server is back. It sits at the top of the notes "
                "list as a card marked Waiting to save, and a notice above Capture "
                "counts what is waiting, with Try now to send it at once. A note "
                "sent twice is still saved once."
            ),
            "badge": {"label": "Notes", "tab": "notes"},
        },
        {
            "id": "attachments",
            "keywords": (
                "paste a picture", "paste an image", "paste image", "paste a screenshot",
                "drag and drop", "drop a file", "attach a file", "attached file",
                "attachment card", "file card", "rename a file", "annotate", "describe with ai",
            ),
            "body": (
                "Paste a picture into Capture or a note being edited, or drop a "
                "file on it, and it is kept with the note. An attached file is one "
                "card everywhere (the note, Capture, a document, the graph and the "
                "Timeline): the picture or a kind icon, its name, kind, size and "
                "date. Click the card to open it; its ... menu has Open, Download, "
                "Rename, Describe with AI, Edit description, Annotate a copy, Copy "
                "as a link and Remove. Removing a file can be undone, and the "
                "upload is only deleted once nothing else uses it."
            ),
            "badge": {"label": "Notes", "tab": "notes"},
        },
        {
            "id": "filing",
            "keywords": (
                "percentage", "percent", "how sure", "confidence", "filed", "filed without ai",
                "stuck on filing", "still filing", "file by meaning", "file it myself",
                "wrong category", "uncategorised", "uncategorized", "choose category",
            ),
            "body": (
                "Each new note is filed into a category in the background. Its "
                "card shows how sure the filing was, for example 83% beside the "
                "category, and whether Atlas or your notebook's words filed it; "
                "the note's History names the model. With no AI model running, a "
                "note is filed from your notebook's own words (the notes already "
                "in each category, their tags and the moves you made by hand) and "
                "stays in Uncategorised when that is not sure, with its likely "
                "categories as one-tap buttons beside Choose category. While a "
                "note shows Filing, its chip offers File by meaning now, Leave it "
                "where it is and File it myself, and Stop in Settings, Background "
                "tasks files every waiting note by meaning. A note you file "
                "yourself is never moved by a late answer, and moving notes by "
                "hand teaches the filing where things go. In Settings, Background tasks, Load "
                "the search model when the app starts chooses when filing by "
                "meaning gets ready: at launch, or on the first note, which then "
                "waits a few seconds."
            ),
            "badge": {"label": "Notes", "tab": "notes"},
        },
        {
            "id": "suggested-tags",
            "keywords": (
                "suggested tag", "suggested tags", "plus tag", "plus tags", "+ tag",
                "tag suggestion", "stop suggesting", "dismiss a tag", "tag with atlas",
            ),
            "body": (
                "The tags Atlas suggested when it filed a note stay on the note's "
                "card as \"+ tag\": one press adds the tag, and its x stops "
                "suggesting it. With no AI running they come from your own tags "
                "on the notes most like this one. An untagged note's Tag with "
                "Atlas asks again."
            ),
            "badge": {"label": "Notes", "tab": "notes"},
        },
        {
            "id": "tag-manager",
            "keywords": (
                "manage tags", "tag manager", "rename a tag", "rename tag", "merge tags",
                "merge a tag", "remove a tag", "delete a tag", "every tag", "tag counts",
                "tags row", "tag chip", "right click a tag", "right-click a tag",
                "tags everywhere", "duplicate tags", "similar tags", "sort tags",
                "unused tags", "used once",
            ),
            "body": (
                "The tag manager lists every tag with how many notes use it. Open "
                "it from the Notes ... menu (Manage tags), the Tags row in the "
                "notes sidebar, Settings or the command palette. Rename a tag, "
                "merge it into another, or remove it from all notes, one or "
                "several at a time; each change shows in the notes' history and "
                "has one Undo. Sort it by name, by notes or by the tag used most "
                "recently; Used once lists the tags only one note carries; tags "
                "that look like one (idea and ideas, to-do and todo) are offered "
                "as one Merge above the list, and the count after a tag shows its "
                "notes. Right-click a tag chip (or press the menu key on it) for "
                "Show notes, Rename in all notes, Remove from this note "
                "and Manage tags. The selection bar's Tags adds or removes tags on "
                "every selected note at once."
            ),
            "badge": {"label": "Notes", "tab": "notes"},
        },
        {
            "id": "manage-categories",
            "keywords": (
                "manage categories", "merge categories", "merge two categories",
                "split a category", "delete a category", "category colour",
                "category color", "colour of a category", "color of a category",
                "rename a category", "notes in a category", "view category",
                "category chip", "duplicate categories", "similar categories",
                "empty categories", "sort categories", "colour several categories",
            ),
            "body": (
                "Manage categories (the Categories head in the notes sidebar, a "
                "category's ... menu, Settings or the command palette) renames, "
                "merges, splits and deletes categories, asking where the notes "
                "go; every change can be undone, and deleting one can always keep "
                "its notes in Uncategorised. A split can be suggested from the "
                "notes' tags or by Atlas, which reads the notes and proposes "
                "named groups to review. Colour gives a category one of twelve "
                "swatches (or Automatic), shown on its dots, chips, graph nodes, "
                "the Timeline and the Dashboard; select several to colour, merge "
                "or delete them together, with one question and one Undo. Sort by "
                "name, notes or the one used most recently, Empty lists the ones "
                "with no notes, look-alike names are offered as one Merge, and the "
                "count after a name shows its notes. A category chip on a note opens "
                "Show notes in the category, Move to another category and Manage "
                "categories; dragging a note's category label onto another "
                "category moves it too."
            ),
            "badge": {"label": "Notes", "tab": "notes"},
        },
        {
            "id": "note-history",
            "keywords": (
                "note history", "who changed", "who edited", "changed my note",
                "edited by atlas", "you and atlas", "two windows", "two tabs",
                "edited twice", "conflict", "keep your version",
            ),
            "body": (
                "A note's History (in its menu) lists every change and whose it "
                "was: You, Atlas, or You and Atlas (a save that took an Improve "
                "writing suggestion), with the exact time on hover, and any "
                "earlier version can be put back. It also says who filed the note "
                "and how sure, and a change made by an AI tool names the model "
                "that made it. When the same note or document is edited in two "
                "windows, a save over text changed elsewhere is refused and you "
                "choose: keep your version, take the other one, or compare the "
                "two first."
            ),
            "badge": {"label": "Notes", "tab": "notes"},
        },
        {
            "id": "notes-list",
            "keywords": (
                "sort notes", "recently edited", "a to z", "copy link", "copy wiki link", "copy app link",
                "connections column", "beside the list", "forgotten", "close to this",
                "backlinks", "unlinked mentions", "mentioned, not linked", "linked mentions",
                "most used", "note order", "f2",
            ),
            "body": (
                "Sort notes: Newest first, Oldest first, Recently edited, A to Z "
                "(\"note 2\" before \"note 10\"), Most used or Forgotten first; "
                "the choice is remembered. A note's menu has Copy wiki link to "
                "paste a [[link]] to it into another note, and Copy app link for "
                "an address that opens it in the app. Editing a note has a title "
                "field. On a focused note, F2 edits it, Delete deletes it, and "
                "Home and End jump to the ends of the list. In a window 1280 wide "
                "or more, the note you open has a Connections column beside the "
                "list: the notes it links to, the notes that link to it with the "
                "sentence each says it in, \"Mentioned, not linked\" (notes and "
                "documents that name it without a link; Link turns those words "
                "into a [[link]], and is greyed out when the name has a square "
                "bracket in it, which a [[link]] cannot hold), and \"Forgotten, and close to this\". The "
                "note's Connections sheet shows the same."
            ),
            "badge": {"label": "Notes", "tab": "notes"},
        },
        {
            "id": "addresses",
            "keywords": (
                "address", "url", "address bar", "web address", "browser back",
                "back button", "deep link", "link to this view", "own address",
                "copy app link", "app link", "link to a note", "hyperlink", "share a note",
            ),
            "body": (
                "Every view has its own address, such as #/notes/12, #/chat/45, "
                "#/docs/7, #/library/images or #/settings/appearance. A reload "
                "keeps the view, a bookmark or a pasted link opens it, the "
                "browser's Back and Forward walk the app's own history, and the "
                "window title names the view and what is open in it. To link to one "
                "thing, open its menu and choose Copy app link (notes, documents, "
                "boards, mind maps and chats have it): it copies an address that "
                "opens that thing while the app is running. Paste it into a note "
                "or a document and it becomes a link that opens in the same "
                "window. Copy wiki link is the other one: a [[link]] for pointing "
                "at a note or document from inside a note."
            ),
            "badge": {"label": "Notes", "tab": "notes"},
        },
        {
            "id": "bookmarks",
            "keywords": (
                "bookmark", "bookmarks", "reading list", "saved links", "saved link",
                "read later", "by site", "web links", "my links", "mark read",
                "bookmark link",
            ),
            "body": (
                "Library, Bookmarks is a reading list of web links; Add bookmark "
                "saves one. Unread and Pinned narrow the list (with counts), and "
                "opening a link marks it read. Sort by newest, oldest, title or By "
                "site, which groups links under their site in folds you can close. "
                "Each link shows its kind, Details opens in place with a note "
                "field, and selecting several offers Move to group, Mark read and "
                "Pin; pinned links lead every order but By site, and every delete "
                "has Undo. In a note or document, the / menu's Bookmark link "
                "inserts a saved bookmark as a link."
            ),
            "badge": {"label": "Library", "tab": "library"},
        },
        {
            "id": "contents",
            "keywords": (
                "contents", "table of contents", "outline of my notebook",
                "whole notebook", "notebook outline", "tree of notes", "index of notes",
                "expand all", "collapse all", "group by", "group the index",
            ),
            "body": (
                "Library, Contents is the whole notebook as a tree: pick By "
                "category, By tag, By topic, By month or By folder in its Group by list, "
                "and each group folds at its heading. A document lists its "
                "headings, so a press jumps straight to one. Expand all and "
                "Collapse all, in the ⋯ menu, open or fold every group; folded, "
                "the groups are a list of places to go. From the keyboard the Up and Down "
                "arrows move, Right opens a row, Left folds it, Home and End jump "
                "to the ends, and Enter opens. By month puts each document under "
                "the month it was made, with that month's notes. By topic groups "
                "notes by the subjects the graph finds in how they link."
            ),
            "badge": {"label": "Library", "tab": "library"},
        },
        {
            "id": "answer-pictures",
            "keywords": (
                "pictures in answers", "images in answers", "image in chat",
                "picture in chat", "sketch in chat", "show the picture",
                "thumbnail", "photo in the answer", "picture in note", "[picture 1]",
                "figure in the answer", "show me the sketch",
            ),
            "body": (
                "When an answer in Chat or Ask draws on a note with pictures or "
                "sketches, the note's numbered chip under Grounded in has up to "
                "three small pictures beside it (a +n says there are more). The "
                "chip opens the note; a picture opens in the image viewer, with "
                "its caption and the text read off it. Atlas can also place a "
                "picture inside its answer by writing [picture 2] for note 2 "
                "([picture 2.2] for its second): it appears as a figure under "
                "the paragraph, with its caption and a From note 2 link that "
                "opens the note, and a click opens the image viewer. Atlas "
                "shows one only when seeing it answers or shows the point; ask "
                "for the picture (show me the sketch) and a cited note's "
                "picture appears even without the token. At most three figures "
                "an answer; reopening the chat "
                "draws them again."
            ),
            "badge": {"label": "Chat", "tab": "chat"},
        },
        {
            "id": "follow-up-trail",
            "keywords": (
                "follow-up", "follow up", "followup", "suggested question",
                "ask next", "next question", "breadcrumb", "bread crumb",
                "trail", "where did this question come from", "question chain",
            ),
            "body": (
                "Under a finished answer, Chat offers Next questions and Ask "
                "offers Ask next. A question sent from one of them shows a "
                "Follow-up of line above it: each earlier question in the "
                "chain, as a link. In Chat a link scrolls to that question and "
                "lights it; in Ask, which shows one answer at a time, it opens "
                "that earlier answer under the line, and a second press folds "
                "it. The line is saved with the chat, so it is there when the "
                "chat is reopened. A question you type yourself starts a new "
                "chain."
            ),
            "badge": {"label": "Chat", "tab": "chat"},
        },
        {
            "id": "library-skills",
            "keywords": (
                "ai skills", "built-in skill", "built in skill", "copy a skill",
                "duplicate a skill", "my skills", "skill list", "reads only",
                "changes notes", "last run of a skill",
            ),
            "body": (
                "Library, AI skills lists every skill: Yours and Built-in switch "
                "between your own and the ones that ship with the app (each with "
                "a count), and the sort is Yours first, Name A to Z or Recently "
                "run. Each card says whether the skill Reads only or Changes "
                "notes, and how its last run went. Duplicate makes a copy of any "
                "skill, a built-in one included, to edit as your own; Delete has "
                "Undo. Settings, Skills is where a skill is written and edited."
            ),
            "badge": {"label": "Library", "tab": "library"},
        },
        {
            "id": "ocr-engine",
            "keywords": (
                "ocr language", "reading language", "tesseract language", "install tesseract",
                "tesseract not working", "tesseract missing", "read again", "which engine",
                "language of the scan",
            ),
            "body": (
                "In the OCR workspace, one line under the toolbar says whether "
                "Tesseract can read, its version and the language it reads in; "
                "pick the language there, and every read follows it, the "
                "background pass included. When Tesseract cannot read, the line "
                "names the cause and offers Install, with its progress; a read it "
                "cannot do falls to the vision model, and each reading names the "
                "engine that read it. Read again reads afresh, and a reading can "
                "be edited by hand or added to an existing note. Settings, "
                "Packages shows the same status and language."
            ),
            "badge": {"label": "Packages", "section": "extras"},
        },
        {
            "id": "time-and-recency",
            "keywords": (
                "dates in my notes", "time words", "this friday", "next friday",
                "saved recently", "recently saved", "lately", "last note", "latest note",
                "newest note", "newest notes", "what did i write", "what did i save",
                "recent notes",
            ),
            "body": (
                "Ask and Chat read a note's time words as the note meant them: "
                "\"this Friday\" in a note written two weeks ago is that Friday, "
                "with its date, not this week's, and the weekly digest reads them "
                "the same way. Questions about recency are answered from the "
                "notebook rather than by searching for the words: \"What have I "
                "saved recently?\", \"what did I write lately\" or \"my last "
                "note\" lists your newest notes newest first, each cited with when "
                "it was written, and works with no AI model running."
            ),
            "badge": {"label": "Chat", "tab": "chat"},
        },
        {
            "id": "model-downloads",
            "keywords": (
                "download a model", "suggested downloads", "suggested models",
                "which model fits", "fits my computer", "fit my computer", "too big",
                "hugging face", "huggingface", "pull a model", "install a model",
                "gguf", "custom model", "model name", "get a model",
            ),
            "body": (
                "Settings, Models, Suggested downloads: cards grouped by purpose "
                "(chat and filing, bigger machines, search, images, reading "
                "text), each with its size on disk, the memory it asks for, what "
                "it is good at and whether it fits this computer, and one "
                "starting pick per group. One button downloads it or puts it to "
                "use, with progress and Cancel on the card; Remove and Copy name "
                "are in its menu. Hide models too big for this computer leaves "
                "out the ones that will not fit. Download another model takes any "
                "Ollama model name or a Hugging Face link and says what it is "
                "before it downloads."
            ),
            "badge": {"label": "Models", "section": "models"},
        },
        {
            "id": "accessibility",
            "keywords": (
                "accessibility", "accessible", "screen reader", "zoom the app",
                "browser zoom", "200%", "400%", "keyboard only", "single key",
                "single-key", "speech input", "voice control", "toast", "toasts",
                "covering the button", "message covering", "larger text", "bigger text",
            ),
            "body": (
                "Accessibility. The app works at 200% and 400% browser zoom: on a "
                "short window Chat flows as a page, and sub-tab strips scroll with "
                "the page so a focused control stays in view. Settings, Keyboard "
                "shortcuts has Single-key shortcuts: turn it off so speech input "
                "or a stray key cannot set off m, / or ? and the other keys with "
                "no Ctrl or Alt. A toast steps aside, fading and letting clicks "
                "through, while the focused control is under it. For a screen "
                "reader every tab has one main landmark, editors and panels have "
                "names, and resize grips say how wide a panel is. Settings, "
                "Appearance has High contrast, Reduce motion, Text size and Zoom."
            ),
            "badge": {"label": "Appearance", "section": "appearance"},
        },
    ]
)

#: How each entry is laid out as a system answer. `title` heads it, `path`
#: says where it lives, `steps` are there when there is something to do in
#: order. An entry with no meta is laid out from its id and body alone.
TOPIC_META: dict[str, dict] = {
    "open-questions": {"title": "Open questions", "path": "Notes tab, Questions"},
    "capture": {"title": "Capturing a note", "path": "Notes tab", "steps": (
        "Open the Notes tab (m then n).", "Type into Capture a thought.", "Press Save: a local AI files it and suggests tags.")},
    "ask-chat": {"title": "Asking and chatting", "path": "Chat tab, or Ctrl+Shift+A over any tab"},
    "skills": {"title": "Skills", "path": "Settings, Skills"},
    "graph": {"title": "The graph", "path": "Graph tab"},
    "reminders": {"title": "Reminders", "path": "Reminders tab"},
    "dashboard": {"title": "The dashboard", "path": "Dashboard tab"},
    "library": {"title": "The Library", "path": "Library tab"},
    "documents": {"title": "Documents", "path": "Library tab, Documents"},
    "whiteboard": {"title": "Whiteboards", "path": "Library tab, Whiteboards"},
    "timeline": {"title": "The Timeline", "path": "Timeline tab"},
    "memory": {"title": "What it remembers", "path": "Settings, What it remembers"},
    "spaces": {"title": "Spaces", "path": "The picker at the top of the sidebar"},
    "appearance": {"title": "Appearance", "path": "Settings, Appearance"},
    "statusbar": {"title": "The status bar", "path": "Settings, Appearance, Status bar"},
    "shortcuts": {"title": "Keyboard shortcuts", "path": "Settings, Keyboard shortcuts"},
    "models": {"title": "Models", "path": "Settings, Models"},
    "model-bench": {"title": "Test my models", "path": "Settings, Models, Test my models", "target": "bench-box"},
    "margin-reader": {"title": "The margin reader", "path": "A document's menu, While you write, Margin reader"},
    "web-clipper-bookmark": {"title": "Clip a page from your browser", "path": "Settings, Import & export, Web clipper", "target": "web-clip-box"},
    "import-apps": {"title": "Import from another app", "path": "Settings, Import & export, Import from another app", "target": "import-app-box"},
    "storage": {"title": "Where your data lives", "path": "Settings, Import & export"},
    "websearch": {"title": "Web search", "path": "Settings, Web search"},
    "privacy": {"title": "Privacy", "path": "Settings, Privacy"},
    "undo-bin": {"title": "Undo and the recycle bin", "path": "Ctrl+Z, and the Library's Recycle bin"},
    "autonomous": {"title": "Autonomous background AI", "path": "Settings, Background tasks"},
    "guide": {"title": "Atlas, the guide", "path": "Status bar, Guide (Ctrl+Shift+H)"},
    "command-palette": {"title": "The command palette", "path": "Ctrl+K"},
    "security": {"title": "Account and security", "path": "Settings, Account & security"},
    "troubleshooting": {"title": "When something does not work", "path": "Settings, Models, then Settings, Logs", "steps": (
        "Open Settings, Models and check a model is connected.", "Start Ollama, LM Studio or a llama.cpp server, pick a model and press Connect.", "Looks out of date or broken after an update: open Settings, Import & export and press Clear app cache.", "Still stuck: open Settings, Logs and press Email it under the support bundle.")},
    "tour": {"title": "The guided tour", "path": "Settings, Help", "steps": (
        "Open Settings, Help.", "Press a section's tour button, or start from the top.", "Next and Back move through it; Finish ends it.")},
    "personas": {"title": "Personas", "path": "Settings, Personas"},
    "templates": {"title": "Templates", "path": "Settings, Templates"},
    "updates": {"title": "Updates", "path": "Settings, About"},
    "notifications": {"title": "Notifications", "path": "The bell in the top bar"},
    "companion": {"title": "The corner companion", "path": "Settings, Appearance, Atlas and faces, Corner companion", "steps": (
        "Open Settings, Appearance, Atlas and faces.", "Pick who it is under Corner companion.", "Right-click it on the page for its menu; Ctrl+Shift+Y shows or hides it.")},
    "atlas-look": {"title": "How Atlas looks", "path": "Settings, Appearance, Atlas and faces, Atlas style and Atlas look"},
    "faces": {"title": "Generated faces", "path": "Settings, Appearance, Atlas and faces"},
    "profile": {"title": "Your profile", "path": "Settings, Profile"},
    "tools-setting": {"title": "Tools it can use", "path": "Settings, Tools it can use"},
    "learned": {"title": "What it learned", "path": "Settings, What it learned"},
    "general-settings": {"title": "General settings", "path": "Settings, General"},
    "search-index": {"title": "Search and index", "path": "Settings, Search and index"},
    "answer-style": {"title": "Answer style", "path": "Settings, Personas, Answer style"},
    "background-tasks": {"title": "Background tasks", "path": "Settings, Background tasks"},
    "packages": {"title": "Packages", "path": "Settings, Packages"},
    "import-export": {"title": "Import and export", "path": "Settings, Import & export"},
    "logs": {"title": "Logs and reporting a problem", "path": "Settings, Logs", "steps": (
        "Open Settings, Logs.", "Press Email it under the support bundle.", "Attach the bundle the app saved and send.")},
    "find-anything": {"title": "Find anything", "path": "Ctrl+P, or Find in the status bar"},
    "background-art": {"title": "The animated background", "path": "Settings, Appearance, Animated background"},
    "themes": {"title": "Themes, colour and type", "path": "Settings, Appearance"},
    "tabs-overview": {"title": "The app at a glance", "path": "The tabs along the top"},
    "settings-overview": {"title": "Finding your way round Settings", "path": "The gear in the top bar, or Ctrl+,"},
    "lock": {"title": "Passwords and locking", "path": "Settings, Account & security"},
    #: Titles for the entries that had none (INBOX 448): Settings, Help lists
    #: every entry by its title, and an id read aloud ("Files images") is not one.
    "files-images": {"title": "Pictures, scans and PDFs", "path": "Library tab, Images and Files"},
    "archive": {"title": "Archiving", "path": "Each item's own menu, and the Library's Archived filter"},
    "voice": {"title": "Dictation, meetings and read aloud", "path": "Notes tab, the microphone"},
    "extract-notes": {"title": "Extract notes and the Writing Room", "path": "Notes tab"},
    "favourites": {"title": "Favourites", "path": "A note's star"},
    "ocr-workspace": {"title": "The OCR workspace", "path": "Read text, on any image or PDF"},
    "document-history": {"title": "A document's history", "path": "A document's ... menu, History"},
    "writing-checks": {"title": "Spelling, grammar and wording", "path": "The document editor"},
    "notebook-questions": {"title": "Questions about your notebook", "path": "Chat tab, or Ask on the Notes tab"},
    "contradictions": {"title": "Notes that disagree", "path": "Dashboard tab"},
    "write-with-atlas": {"title": "Write with Atlas", "path": "Notes tab, Write with Atlas"},
    "search": {"title": "Searching everything", "path": "Ctrl+P, or the dashboard's search box"},
    "links": {"title": "Linking notes", "path": "Type [[ in a note"},
    "performance": {"title": "When the app feels slow", "path": "Settings, Appearance"},
    "translate": {"title": "Translating", "path": "Notes tab, Write with Atlas"},
    "tags-categories": {"title": "Tags and categories", "path": "A note's own row, or Capture's Filing menu"},
    "code-files": {"title": "Code documents", "path": "Library tab, Documents"},
    "mind-maps": {"title": "Mind maps", "path": "Library tab, Boards and maps"},
    "whiteboard-controls": {"title": "Whiteboard keys and controls", "path": "Library tab, Boards and maps"},
    "mind-map-controls": {"title": "Mind map keys and controls", "path": "Library tab, Boards and maps"},
    "documents-controls": {"title": "Document editor keys and controls", "path": "Library tab, Documents"},
    "callouts": {"title": "Callouts", "path": "Library tab, Documents"},
    "graph-controls": {"title": "Graph keys and controls", "path": "Graph tab"},
    "graph-display": {"title": "More graph controls", "path": "Graph tab, the gear"},
    "properties": {"title": "Note properties and types", "path": "a note's ⋯, Properties; or the command palette, Note types"},
    "entities": {"title": "People and things", "path": "Graph tab, an entity; or the command palette, People and things"},
    "chat-controls": {"title": "Chat keys and controls", "path": "Chat tab"},
    "notes-controls": {"title": "Notes keys, filters and selection", "path": "Notes tab"},
    "library-controls": {"title": "Library controls", "path": "Library tab"},
    "timeline-controls": {"title": "Timeline controls", "path": "Timeline tab"},
    "reminders-controls": {"title": "Reminders controls", "path": "Reminders tab"},
    "dashboard-controls": {"title": "Dashboard controls", "path": "Dashboard tab"},
    "hidden-features": {"title": "Hidden features and power keys", "path": "Everywhere"},
    "quick-note": {"title": "Quick note", "path": "Alt+N, from any tab"},
    "note-outbox": {"title": "Saving while the server is away", "path": "Notes tab, above Capture"},
    "attachments": {"title": "Pictures and files in a note", "path": "Capture, or a note being edited"},
    "filing": {"title": "How a note is filed", "path": "A note's card, beside its category"},
    "suggested-tags": {"title": "Suggested tags", "path": "A note's card"},
    "tag-manager": {"title": "Managing tags", "path": "Notes tab, the ... menu, Manage tags"},
    "manage-categories": {"title": "Managing categories", "path": "Notes tab, the Categories head in the sidebar"},
    "note-history": {"title": "A note's history", "path": "A note's menu, History"},
    "notes-list": {"title": "Sorting and browsing notes", "path": "Notes tab, Your notes"},
    "addresses": {"title": "Every view has an address", "path": "The browser's address bar"},
    "bookmarks": {"title": "Bookmarks", "path": "Library tab, Bookmarks"},
    "contents": {"title": "Contents, the notebook's outline", "path": "Library tab, Contents"},
    "follow-up-trail": {"title": "Where a follow-up came from", "path": "Chat tab, or Ask in the Notes tab, under an answer"},
    "answer-pictures": {"title": "Pictures in answers", "path": "Chat tab, or Ask in the Notes tab, Grounded in"},
    "library-skills": {"title": "AI skills in the Library", "path": "Library tab, AI skills"},
    "ocr-engine": {"title": "Tesseract and the reading language", "path": "The OCR workspace, under the toolbar"},
    "time-and-recency": {"title": "Dates and recent notes in answers", "path": "Chat tab, or Ask on the Notes tab"},
    "model-downloads": {"title": "Downloading a model", "path": "Settings, Models, Suggested downloads"},
    "accessibility": {"title": "Accessibility and zoom", "path": "Settings, Keyboard shortcuts and Appearance"},
}

#: **How Settings, Help lists the entries** (INBOX 448 (1)). The page used to
#: hold thirteen hand-written topics beside this table's sixty, kept in step by
#: hand, and they had drifted (it still taught "g then a letter" for the tab
#: chord). It is drawn from this table now (`GET /help/topics`, settings-find.js
#: `renderHelpTopics`), in these groups and this order, so a new entry shows
#: on the page the moment it exists; `tests/test_help_coverage.py` fails when an
#: entry is in no group, or in two.
HELP_GROUPS: list[tuple[str, tuple[str, ...]]] = [
    ("Getting started", (
        "tabs-overview", "tour", "guide", "hidden-features", "shortcuts",
        "command-palette", "find-anything", "search", "addresses", "settings-overview",
    )),
    ("Writing notes", (
        "capture", "quick-note", "note-outbox", "attachments", "notes-controls",
        "notes-list", "note-history", "links", "favourites", "templates",
        "write-with-atlas", "translate", "extract-notes", "voice",
    )),
    ("Filing, tags and categories", (
        "tags-categories", "filing", "suggested-tags", "tag-manager", "manage-categories",
    )),
    ("Asking Atlas", (
        "ask-chat", "chat-controls", "follow-up-trail", "answer-pictures", "time-and-recency", "notebook-questions",
        "contradictions", "skills", "personas", "answer-style", "memory", "learned", "open-questions",
    )),
    ("Documents and code", (
        "documents", "documents-controls", "callouts", "document-history", "writing-checks", "code-files",
        "margin-reader",
    )),
    ("Boards and maps", (
        "whiteboard", "whiteboard-controls", "mind-maps", "mind-map-controls",
    )),
    ("Library and files", (
        "library", "library-controls", "bookmarks", "web-clipper-bookmark", "contents", "library-skills",
        "files-images", "ocr-workspace", "ocr-engine", "archive", "undo-bin",
    )),
    ("Graph, Timeline, Reminders and Dashboard", (
        "graph", "graph-controls", "graph-display", "entities", "properties", "timeline", "timeline-controls", "reminders",
        "reminders-controls", "dashboard", "dashboard-controls", "notifications", "spaces",
    )),
    ("Look and feel", (
        "appearance", "themes", "accessibility", "performance", "background-art",
        "statusbar", "companion", "atlas-look", "faces",
    )),
    ("Models and the AI", (
        "models", "model-downloads", "model-bench", "tools-setting", "autonomous", "websearch",
        "search-index", "packages",
    )),
    ("Privacy and your data", (
        "privacy", "security", "lock", "storage", "import-export", "import-apps", "background-tasks",
    )),
    ("Settings and support", (
        "profile", "general-settings", "updates", "logs", "troubleshooting",
    )),
]
