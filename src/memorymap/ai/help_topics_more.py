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
            "companion size", "the little guy", "rub the companion", "flip the companion",
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
            "drag the handle at its corner (double-click or double-tap the handle "
            "for Medium again). Drag it onto a panel and that page "
            "keeps it there. Move the pointer back and forth over it to rub it "
            "and it leans into your hand; shake it up and down while you carry "
            "it and it turns upside down, then lands a little dizzy (each has a "
            "switch in Appearance, under What it does on its own). Right-click it, or press Shift+F10 on it, for its "
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
            "on any face, shows the full drawing; right-click the companion "
            "there to change who it is, its look or its size."
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
            "cut that reply short", "model size", "calculator", "does atlas do sums",
        ),
        "body": (
            "Settings, Tools it can use also has Use these tools from another "
            "app: a snippet to paste into an MCP client such as Claude Desktop, "
            "with a Copy button. "
            "A number Atlas would work out (a sum, a percentage, a conversion, a "
            "count of days) comes from the app's own calculator, Calculate, and a "
            "date in your words from Read text, so a small model computes "
            "nothing in its head; Check answer finds any number its answer "
            "says that the notes do not, and Propose act shows a change as "
            "a card you confirm. "
            "Settings, Tools it can use lists the actions Atlas may take in "
            "Agent mode, grouped as Reads your notebook, Changes your notebook, "
            "Asks you first and Reaches the web; turn one off and it is never "
            "offered. Destructive "
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
            "learned from you", "filing accuracy",
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
            "everything learned act on all of it and never touch your notes. "
            "The Learned from you line under the title counts your corrections "
            "and gives filing accuracy, the share of the notes Atlas filed that "
            "you left where it put them, older half of the last 200 against newer."
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
            "your own ones only (not a quote, a prompt list, a script's line or "
            "a joke answered on the next line), "
            "found when Atlas reads your notes (Read notes now, or on its own "
            "with background tasks on), grouped by note, newest note first: "
            "Open, Answered or Dropped, picked in the bar with a count on each. A "
            "note that asks any says so on its card (2 open questions); pressing "
            "that shows only its questions. A row says when it was asked; when a "
            "later note answers it, the row "
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
            "Settings, General. Bin: auto-clear binned notes, documents, reminders and OCR readings after a "
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
            "embedding models", "multilingual search", "change embedding model",
            "pull a model", "pull a model by name", "found on this computer",
            "uninstall embedding model", "reinstall embedding model", "cached models",
            "rebuild search index", "search index", "search is wrong",
            "too many results", "too few results", "search feels too strict",
            "install search by meaning automatically", "dont install", "refuse install",
            "cancel install", "sentence-transformers", "2 gb download",
        ),
        "body": (
            "Settings, Search and index. Search engine: the built-in one "
            "(recommended, about 650 MB of memory while the app is open) or an "
            "Ollama embedding model such as nomic-embed-text. The built-in one "
            "needs the sentence-transformers package (about 2 GB with PyTorch), "
            "which MemoryMap installs in the background the first time it is "
            "needed, with a notice that says so and a Don't install button; "
            "the switch Install search by meaning automatically turns that "
            "off, and search then uses keywords until you press Install in "
            "Settings, Packages. Changing the engine "
            "re-reads every note in the background (Background tasks shows it, "
            "with Stop) and search keeps using the current model until the new "
            "one has read every note. Embedding models lists the choices, from "
            "MiniLM (smallest, fastest) and BGE Small (the default) to "
            "multilingual ones (Multilingual E5, BGE M3, Qwen3), with each "
            "one's size, languages, context and licence: Use switches in one "
            "press, and a model under other terms (EmbeddingGemma) links to "
            "them instead; each row's ⋮ has Use, Install or Reinstall, and "
            "Uninstall (refused on the model in use). Found on this computer "
            "lists embedding models already here (the Hugging Face cache, "
            "Ollama, LM Studio), with Use where MemoryMap can load them and "
            "why not where it cannot. Pull a model by name takes a Hugging Face "
            "repo (owner/name) or an Ollama name and checks it online only when "
            "you press Pull. Search index: Rebuild search index after an "
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
            "longer answers", "friendly", "professional wording", "formal wording",
            "natural wording", "wording when no model", "composer voice",
        ),
        "body": (
            "Settings, Personas, Answer style: how Atlas words its answers, "
            "Friendly (the default), Concise or Detailed, whichever persona is "
            "active. Below it, Wording when no model is running sets the "
            "register of the short connecting phrases Atlas writes when it "
            "answers from your notes without a model: Natural (the default) "
            "or Professional. Your notes are quoted the same either way."
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
            "run now", "night shift", "stop a job", "cancel a job", "scheduled pass",
        ),
        "body": (
            "Settings, Background tasks shows what the app is doing right now "
            "(re-indexing, downloading a model, installing packages, setting up "
            "search), each running job with a progress bar (a moving one when "
            "it cannot count its steps) and how long it has run, with Stop on "
            "the jobs that can stop safely, and what has finished since it "
            "started. Background jobs lists every kind of job, the never-run "
            "ones too, with when it last ran and how it went; each scheduled "
            "pass (autonomous background AI, the night shift, the daily backup, "
            "resurfacing, the embeddings backfill, housekeeping) also says when "
            "it runs by itself and has Run now. Beside each "
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
        "id": "health",
        "keywords": (
            "health", "is my notebook ok", "integrity", "integrity check", "corrupt",
            "corruption", "last backup", "last error", "data folder size", "how big",
            "is it healthy", "check the database",
        ),
        "body": (
            "Settings, About, Health says how the notebook is, each line dated: "
            "the last backup and when it was taken, the data folder's size, what "
            "is running now, the last error in the log, and Integrity, whose "
            "Check now has the database check itself and counts the search index "
            "beside your notes. The palette's Health goes straight there. The "
            "app also gives the notebook file a quick check each time it starts, "
            "and if that fails it says so and points to the newest backup in "
            "Settings, Import & export."
        ),
        "badge": {"label": "About", "section": "about"},
    },
    {
        "id": "activity",
        "keywords": (
            "activity", "activity panel", "what is running", "stop a job", "stop it",
            "stop the model", "unload the model", "free memory", "model in memory",
            "stop generating", "stop the answer", "agent runs", "running jobs",
        ),
        "body": (
            "Activity lists every job running now: indexing, a model loading or "
            "answering, imports, reading text, transcribing, backups and the "
            "agent's passes, each with a bar and Stop where it can stop part way. "
            "Open it from the status bar's job slot, its agent runs count, or the "
            "palette (Activity). Its Agent runs tab lists each run this session "
            "with its steps, and the log is in its menu. Stop the model, in the "
            "menu and in Settings, Models beside Use this model, stops any answer "
            "and unloads the model from memory (Ollama drops it at once); a server "
            "this app did not start keeps its own model, and the message says so."
        ),
        "badge": {"label": "Models", "section": "models"},
    },
    {
        "id": "packages",
        "keywords": (
            "packages", "package", "pip", "install a feature", "optional feature",
            "extra", "extras", "dictation model", "embedding model", "markitdown",
            "bundle", "bundles", "reinstall", "uninstall", "install several",
        ),
        "body": (
            "Settings, Packages lists what MemoryMap can do with one more "
            "package installed: nothing there is needed to write, search, tag "
            "or organise notes, each one switches on a feature that is "
            "otherwise off, downloaded from PyPI to this machine. Bundles "
            "group the packages one kind of work needs (Documents, Vision, AI, "
            "Voice, Desktop, Code, Languages): a bundle's Install fetches what is "
            "missing, and its ⋮ reinstalls or removes them all. Tick packages "
            "to install, reinstall or remove several at once from the bar "
            "above the list; they run one after another and one that fails "
            "does not stop the rest; a bundle's row shows each of its packages "
            "as it goes, waiting, installing or done. An installed package's ⋮ has Reinstall "
            "(for a feature that is on but not working) and Remove, and its "
            "row shows its version and size on disk. What pip is "
            "doing shows an install as it runs. Dictation model size runs from "
            "Tiny (fastest) to Medium (most accurate). Embedding models lists "
            "the built-in models on this machine, each downloaded once and kept; "
            "which one search uses is chosen in Settings, Search and index."
        ),
        "badge": {"label": "Packages", "section": "extras"},
    },
    {
        "id": "import-export",
        "keywords": (
            "import markdown", "import a folder", "import a pdf", "import word",
            "import as a document", "slide deck", "merge duplicates",
            "tidy up duplicates", "full backup", "restore a full backup", "mmenc", "seal a backup",
            "export csv", "export json", "exports folder", "zip",
        ),
        "body": (
            "Settings, Import & export. Export your data as JSON, CSV, Markdown "
            "or a full backup (the database, media and attached files as one "
            "file, sealed with a password if you type one: a .mmenc, else a "
            ".zip); Restore a full backup, just below, reads either back and "
            "replaces the notebook after a safety snapshot; Open exports "
            "folder and Save exports to set where files land. Tidy up "
            "duplicates finds notes that say much the same thing, no AI "
            "needed, and merging keeps every tag and bins the rest. Import "
            "markdown files or a folder (Obsidian frontmatter is understood), "
            "or a PDF, Word file or slide deck, one note per chapter or slide. "
            "To keep a file whole as a document you can edit instead, open "
            "Library, Documents, the more menu, Import a file as a document. "
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
            "jump to a note", "saved searches", "find a chat",
        ),
        "body": (
            "Find anything (Ctrl+P, or the magnifying glass in the status bar) searches notes, "
            "files, documents, chats and actions in one box as you type: Enter opens "
            "the top result, the arrows move, Esc closes, and the star keeps the "
            "search as a row under Saved searches in the Notes sidebar. Its '?' lists "
            "the operators. It lists the command "
            "palette's actions too, so \"dark\" finds Toggle light/dark, after the "
            "notes and files. The command palette (Ctrl+K) sends what you type "
            "here: its last row, Search everything for, opens this box with "
            "the words already searched."
        ),
        "badge": {"label": "Keyboard shortcuts", "section": "shortcuts"},
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
            "build a scheme", "border style", "shadow", "interface animations",
        ),
        "body": (
            "Settings, Appearance. Themes: save and switch your own. Theme & "
            "colour: Palette, Mode (light, dark or system), Accent colour or a "
            "custom one, Page background, and Build a scheme from one colour. "
            "Typography & layout: Text size, Font, Density, Corner rounding, "
            "Zoom, Border style and Shadow intensity. Effects & accessibility: "
            "Performance mode, the glass's sheen, blur and opacity, Progress "
            "indicators, Reduce motion (stills Atlas, the background art, the "
            "graph and the whiteboard) and Interface animations (on by default: "
            "a button's press, menus and dialogs opening, a tab's sliding marker, "
            "even with Reduce motion on; off makes them instant). Advanced has "
            "Custom CSS. Ctrl+Shift+L "
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
            "finds a setting by any word in it or by what it does, with words "
            "that mean the same (\"night\" or \"darker\" finds the theme, "
            "\"battery\" the battery-efficient mode, \"back up\" Backups), and "
            "lists the matching settings under it, each opening where it sits. A long section lists its "
            "groups under its own name in that list: press one to go to it, and "
            "the one you are reading is marked as you scroll. On a phone the "
            "section picker holds the same groups under the section you are in."
        ),
        "badge": {"label": "General", "section": "general"},
    },
    {
        "id": "lock",
        "keywords": (
            "auto-lock", "auto lock", "change my password", "reset password",
            "other devices", "on my phone", "another computer", "sessions",
            "lock everywhere", "re-encrypt", "new key", "rotate key",
            "recovery key", "make a recovery key",
        ),
        "body": (
            "Settings, Account & security. Signing in: ask for a password when "
            "the app opens (private notes and other devices always ask). Other "
            "devices: let a phone or computer on your network open the app, "
            "always with your password, over https on port 8443. The first "
            "visit warns that the certificate is not trusted: compare its "
            "SHA-256 fingerprint with the one under the switch before you "
            "continue, and Regenerate certificate makes a new one. Under the fingerprint are the names the certificate carries and when it expires; Trust this certificate on your phone downloads it, and its ? says how to install it on iPhone and Android. If this computer's address changes, the app makes a new certificate at the next start. Change your password or PIN (private "
            "notes move across; a new one needs at least 8 characters, and an "
            "easy one gets a warning). Re-encrypt private notes (Settings, Account & security) makes "
            "a new encryption key and moves every private note onto it, so an old "
            "backup stops opening them; every other session is signed out. Sessions: Auto-lock when idle, from 5 minutes "
            "to 12 hours, and Lock everywhere now; the lock in the top bar "
            "locks at once. Recovery key: Make a recovery key (or Replace it) "
            "asks your password and shows a key once, to copy or download and "
            "keep away from this computer; the old one stops working. Forgot "
            "your password? on the lock screen, on this computer only, has two "
            "paths: the recovery key and a new password keeps private notes "
            "and hands you a new key; I don't have it resets the password like "
            "python -m memorymap --reset-password, which keeps ordinary notes, "
            "documents, boards and settings, leaves private notes sealed for "
            "good, and turns other devices off."
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
            "this computer, and can be switched off in Settings, What it "
            "learned, What may run, Model bench."
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
            "Settings, What it learned, What may run, Margin reader."
        ),
        "badge": {"label": "What it learned", "section": "learned"},
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
            "words: Atlas never follows instructions written in it. A note's day "
            "comes from the export where it says one with its year: a daily "
            "note named 2024-03-14, a date: or Created: line; that is its day "
            "on the Timeline, and \"tomorrow\" in it means the day after it was "
            "written. The import's summary names the people and places it read."
        ),
        "badge": {"label": "Import from another app", "section": "data", "target": "import-app-box"},
    },
    {
        "id": "simple-mode",
        "keywords": (
            "simple mode", "fewer tabs", "hide tabs", "hide the tabs", "tabs i do not need", "too many tabs", "simpler", "beginner",
            "where did the graph go", "where did the timeline go", "where are reminders",
        ),
        "body": (
            "Settings, General, Simple mode: Show only Dashboard, Notes, Chat and "
            "Library. It hides the Graph, Timeline and Reminders tabs, the "
            "Library's Boards & maps, What it learned and the advanced response "
            "settings until you want them. Nothing is turned off: every hidden "
            "place still opens from the command palette (Ctrl+K), and reminders "
            "still ring. It is remembered on this device; turn it off in the "
            "same place to bring the tabs back."
        ),
        "badge": {"label": "Simple mode", "section": "general", "target": "simple-mode-box"},
    },
    {
        "id": "usage-ledger",
        "keywords": (
            "what you use", "what i use", "usage", "most used", "never use", "unused features",
            "is it tracking me", "telemetry", "analytics",
        ),
        "body": (
            "Settings, General, What you use counts each tab you open and each "
            "command you run from the palette, on this computer only, in a small "
            "file in your data folder: names and dates, never what you typed, "
            "and never sent anywhere (there is no telemetry). It lists your most "
            "used tabs and commands and the ones not used in 90 days, and the "
            "command palette lists the commands you use most first. Clear the "
            "counts forgets every one."
        ),
        "badge": {"label": "What you use", "section": "general", "target": "usage-box"},
    },
    #: Brief 89: the Statistics page and the palette's small tools, each
    #: written from the controls' own words (statistics.js, utility-tools.js).
    {
        "id": "statistics",
        "keywords": (
            "statistics", "stats", "notes per month", "word count of my notebook", "notebook statistics",
            "this week", "weekly review", "week in review", "growth per month", "usage statistics",
        ),
        "body": (
            "Statistics counts your notebook with no model: notes, words, tags, "
            "categories, documents, links and notes with no link, a chart of notes "
            "made per month over the last year, reminders made, done, open and late, "
            "and what you use on this computer (features used, uses counted, and "
            "the ones not used lately). This week compares notes made, words "
            "written and reminders done since Monday with the whole of last week. "
            "Open it from the Statistics button under the Dashboard's Activity "
            "heatmap (or a click on the heatmap), the This week card's All "
            "statistics, or Statistics in the command palette (Ctrl+K). Private "
            "and binned notes are not counted."
        ),
        "badge": {"label": "Dashboard", "tab": "dashboard"},
    },
    {
        "id": "timer",
        "keywords": (
            "timer", "countdown", "stopwatch", "pomodoro", "set a timer", "start a timer",
            "stop the timer", "time how long",
        ),
        "body": (
            "Type timer in the command palette (Ctrl+K) for Start a timer (25 "
            "minutes) and Start a stopwatch, or type a length, such as timer 10 "
            "minutes, 90s timer or countdown 2h, and press Enter. The time runs "
            "on the status bar (on a phone the bar comes back while it runs); "
            "press it to stop. When a timer runs out it says so in a message and "
            "a notification. The Dashboard's Focus timer widget is a separate "
            "timer with its own Start and Reset."
        ),
        "badge": {"label": "Dashboard", "tab": "dashboard"},
    },
    {
        "id": "live-captions",
        "keywords": (
            "live captions", "captions", "subtitles", "live transcription", "transcribe live",
            "write what i say", "speech to text live", "stop the captions",
        ),
        "body": (
            "Type captions in the command palette (Ctrl+K) for Live captions: a "
            "bar appears over whatever you are looking at and writes what the "
            "microphone hears, on this computer, never over the internet. The "
            "bottom line is still being written; the three above it are done. "
            "Copy takes everything said so far, and Stop (or the palette row "
            "again) saves it as a note tagged captions. Captions need a local "
            "speech helper; its row in Settings, Packages says what is "
            "missing, and without one the row says so and nothing is recorded."
        ),
        "badge": {"label": "Notes", "tab": "notes"},
    },
    {
        "id": "count-words",
        "keywords": (
            "word count", "count words", "character count", "how many words", "reading time",
            "count the selection", "how long is this",
        ),
        "body": (
            "Select text in any editor (a note, the Capture box, a document) and "
            "run Count words from the command palette (Ctrl+K): it says the "
            "words, the characters with and without spaces, and the reading "
            "time, counted the way wc counts. With nothing selected it counts "
            "the whole editor you were in. The Capture box and a document also "
            "show a running count as you type."
        ),
        "badge": {"label": "Notes", "tab": "notes"},
    },
    {
        "id": "translate-offline",
        "keywords": (
            "translate this", "translate offline", "offline translation", "translate without a model",
            "translate to spanish", "bergamot", "ai free translation",
        ),
        "body": (
            "Select a passage in a note, a document or a reading and run "
            "Translate this from the command palette (Ctrl+K): it turns "
            "English into Spanish on this computer, with no model, in about a "
            "second, and Copy or Replace the selection puts it to use. With "
            "nothing selected it takes the whole editor you were in. It needs "
            "Translate offline, a 27 MB download in Settings, Packages "
            "(Languages); until then the row says so and opens that page. "
            "Other languages: the Writing room translates with your model."
        ),
        "badge": {"label": "Packages", "section": "extras"},
    },
    {
        "id": "insert-template",
        "keywords": (
            "insert template", "insert a template", "text snippet", "reusable text", "boilerplate",
            "template into a note", "paste a template",
        ),
        "body": (
            "Type insert template (or template and part of its name) in the "
            "command palette (Ctrl+K) to list your templates; Enter puts the one "
            "you choose where your cursor was, in any editor, with {date}, "
            "{{time}} and {{clipboard}} filled in. With no editor open it goes "
            "into the Capture box. The templates, yours and the built-in ones, "
            "are in Settings, Templates, where you write, edit and reset them."
        ),
        "badge": {"label": "Templates", "section": "templates"},
    },
    {
        "id": "capture-anywhere",
        "keywords": (
            "capture from anywhere", "global hotkey", "global shortcut", "system shortcut",
            "capture without opening", "note from another app", "--capture",
        ),
        "body": (
            "Settings, Keyboard shortcuts, Capture from anywhere shows the command "
            "for this install (memorymap --capture, with its full path) and a "
            "Copy button. Give that command a key in your system's own keyboard "
            "settings: on Windows a desktop shortcut with it as the target and a "
            "Shortcut key, on macOS a Shortcuts action, on Linux a custom keyboard "
            "shortcut. Pressing the key over any app opens a one-line box on the "
            "MemoryMap that is already running; Enter saves the note, filed like "
            "any other, and the box closes. On a phone, Share to MemoryMap does "
            "the same."
        ),
        "badge": {"label": "Capture from anywhere", "section": "shortcuts", "target": "capture-anywhere-box"},
    },
    {
        "id": "install-app",
        "keywords": (
            "install", "install the app", "install as an app", "add to home screen",
            "home screen", "pwa", "own window", "app icon", "share sheet",
            "share to memorymap", "not running on this computer", "offline page",
        ),
        "body": (
            "Settings, About, Install as an app gives MemoryMap its own window "
            "and icon, and adds it to your phone's share sheet, so a page or a "
            "selection shared to it lands in Capture. The button appears only "
            "when your browser offers the install and the app is not installed "
            "yet; on an iPhone, tap Share, then Add to Home Screen. It is the "
            "same app, still served by the copy running on this computer. When "
            "that copy is not running, the installed app shows a page saying "
            "MemoryMap is not running on this computer, with a Retry button, "
            "never an empty notebook: open MemoryMap from the Start menu or "
            "the launcher, then press Retry."
        ),
        "badge": {"label": "Install as an app", "section": "about", "target": "about-install"},
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
            "id": "quick-add",
            "keywords": (
                "chips under the box", "read as", "quick add", "date chip", "what it read",
                "remind me friday", "natural language date", "type a date", "wrong date",
                "time chip", "repeat chip", "tag chip",
            ),
            "body": (
                "Quick add: where you type something dated or tagged (the Reminders "
                "box, Quick note, a new meeting's title, the Timeline's search and the "
                "command palette), what the words were read as shows as chips under "
                "the box as you type: a day, a time, a repeat, a person, a #tag, a "
                "window like \"last week\". Enter saves what the chips say. Press a "
                "chip to leave those words as words. When something needed is "
                "missing (a reminder with no time), it asks once and saves nothing "
                "until you add it, rather than guessing. In Quick note a day is an "
                "offer of a reminder on the note, used when pressed or when the note "
                "starts \"remind me\". On the Timeline, Enter turns a window into the "
                "From and To range and keeps the other words as the search. It all "
                "works with no AI model."
            ),
            "badge": {"label": "Reminders", "tab": "reminders"},
        },
        {
            "id": "editor-offers",
            "keywords": (
                "offers under the note", "offers while i write", "remind me from a note",
                "sum checked", "check my sums", "wrong sum", "link suggestion", "suggest a link",
                "filing suggestion", "why this category", "chips under the note",
            ),
            "body": (
                "While you write a note (Capture, or a note's Edit form), offers show as "
                "chips under the box when you pause: a day in the text becomes Remind me "
                "(press it to set the reminder, with Undo), a sum written with a wrong "
                "answer shows the right one (press it to put it in), a name another note "
                "opens with becomes a [[link]], and File in names the category with its "
                "reason beside it. Nothing is offered on quoted words: text in quotation "
                "marks, a code span or a quote line. At most five show at once. It all "
                "works with no AI model."
            ),
            "badge": {"label": "Notes", "tab": "notes"},
        },
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
                "waiting to save", "not saved", "lost my note", "kept on this device", "lost my edit", "unsaved changes",
                "save while offline", "saved offline", "connection lost", "try now",
            ),
            "body": (
                "A note saved while the MemoryMap server is not answering (from "
                "Capture, Save as draft, Quick note or the dashboard's Quick "
                "capture) is kept on this device rather than lost, and is sent by "
                "itself when the server is back. It sits at the top of the notes "
                "list as a card marked Waiting to save, and a notice above Capture "
                "counts what is waiting, with Try now to send it at once. A note "
                "sent twice is still saved once. An edit left unsaved in a note's "
                "form is kept on this device too: after a reload or a closed "
                "window, a message offers Open them to carry on. A document's "
                "last words before a reload are kept the same way, and Put them "
                "back returns them when that document opens."
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
                "filing style", "review queue", "is:review", "accept the filing",
                "what is filing", "how does filing work", "how filing works",
                "why was it filed", "why this category", "new category", "sensitive notes",
                "file health notes", "health notes", "money notes",
            ),
            "body": (
                "Each new note is filed into a category in the background. Its "
                "card shows how sure the filing was, for example 83% beside the "
                "category, and whether Atlas or your notebook's words filed it; "
                "the note's History names the model. That percentage is Atlas's "
                "own estimate, not the model's raw number: a small model often "
                "says 100% about everything, so nothing it picks reads above "
                "95%, a pick your other notes disagree with is lowered, and so is "
                "a pick for a category with few notes. A filing under 50% shows "
                "check this, and the line under the note box offers the other "
                "categories as one-tap buttons; a note you filed yourself shows "
                "Filed by you and no percentage. With no AI model running, a "
                "note is filed by your other notes and a built-in topic list, "
                "only into a category you have, and says why (It mentions squat "
                "(Fitness), like the 9 notes in Gym). Unsure, it stays in "
                "Uncategorised with one-tap choices, and New: Fitness when none "
                "fits. Health, money and family notes wait for you unless File "
                "health, money and family notes by their words too is on in "
                "Settings, Background tasks. While a "
                "note shows Filing, its chip offers File by meaning now, Leave it "
                "where it is and File it myself, and Stop in Settings, Background "
                "tasks files every waiting note by meaning. A note you file "
                "yourself is never moved by a late answer, and moving notes by "
                "hand teaches the filing where things go. In Settings, Background tasks, Load "
                "the search model when the app starts chooses when filing by "
                "meaning gets ready: at launch, or on the first note, which then "
                "waits a few seconds. Filing style (Settings, Background tasks) files by topic, "
                "by project or by time. Filings Atlas was unsure of wait in "
                "is:review, with Accept the filing on the note's menu."
            ),
            "badge": {"label": "Notes", "tab": "notes"},
        },
        {
            "id": "suggested-tags",
            "keywords": (
                "suggested tag", "suggested tags", "plus tag", "plus tags", "+ tag",
                "tag suggestion", "stop suggesting", "dismiss a tag", "tag with atlas",
                "why is this tag suggested", "why this tag",
            ),
            "body": (
                "The tags Atlas suggested when it filed a note stay on the note's "
                "card as \"+ tag\": one press adds the tag, and its x stops "
                "suggesting it (Undo in the notice brings it back, and the note's "
                "Edit form lists the ones turned down under Not suggested, each "
                "one press from coming back). With no AI running they come from your own tags "
                "on the notes most like this one. Either way a tag is offered "
                "only when the note has a word for it, at most three, and "
                "pointing at one says which word. An untagged note's Tag with "
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
            "id": "tidy",
            "keywords": (
                "tidy", "tidy up", "clean up", "cleanup", "clean up notes", "broom",
                "weak links", "link reasons", "similar in meaning", "specific reason",
                "why are these linked", "auto tags", "tags atlas added", "low confidence",
                "tags used once", "look alike tags", "near duplicate", "duplicate notes",
                "find duplicates", "uncategorised", "short notes", "empty notes",
                "old reminders", "stale reminders", "without the ai", "without ai",
                "bulk", "housekeeping", "apply automatically",
                "categories that overlap", "category names", "similar categories",
                "patterns", "confirm a pattern", "not right", "wrong pattern", "insight",
            ),
            "body": (
                "Tidy is the broom in the Notes dock, beside the search help; the "
                "number on it is how many things its reviews found. It opens on an "
                "overview of all eleven reviews, each a rule that needs no AI, with "
                "its count and one line on what it finds, the ones with nothing to "
                "tidy last; press a row to open that review and its back button to "
                "return to the overview. The reviews: Links to explain (Add reasons "
                "gives a link that only says similar in meaning what the two notes "
                "share, a tag, a name or a week), Weak automatic links (Remove "
                "links), Tags Atlas added (tags written by Atlas or a background "
                "pass, never changed by you, that fit their note poorly; Remove "
                "tags), Tags used once (Remove tags), Tags that look alike (Merge "
                "tags), Notes without a category (Move notes, to the category their "
                "words point to), Near-duplicate notes (Merge notes), Categories "
                "that overlap (Merge categories), Category names (Rename), Empty or very "
                "short notes (Move to bin) and Reminders long past (Mark done). "
                "Each review's description says what its button will change. Tick "
                "the rows (each says why it is listed and what the button will do), "
                "then press the button; one Undo puts the batch back, from the "
                "toast, Ctrl+Z or Recent runs. Apply automatically runs a review "
                "after each note is filed; merging, renaming, binning and removing "
                "tags used once never run on their own. Links to explain also has Add "
                "reasons to all in the background, a job you can stop in Settings, "
                "Background tasks. The command palette and Tools and features open "
                "Tidy too, and new links already say what their notes share when "
                "they can. Under the overview, Patterns says what the notes measure "
                "(golf 4 times since 5 September), each with Confirm, which keeps it "
                "as your own word from then on, and Not right, which never shows it "
                "or anything like it again; Chat and the dashboard's ⋯ offer the same."
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
                "with no notes, Tidy suggestions offer names alike (in spelling or "
                "meaning) as one Merge and categories empty for thirty days to "
                "Remove, Not these never asks about a pair again, and the "
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
                "then and now", "what did it say", "time travel", "as of",
            ),
            "body": (
                "A note's History (in its menu) lists every change and whose it "
                "was: You, Atlas, or You and Atlas (a save that took an Improve "
                "writing suggestion), with the exact time on hover, and any "
                "earlier version can be put back; Then and now on an earlier "
                "version sets what it said against what the note says today, "
                "sentence by sentence (Changed, No longer says, Says now). In Ask, "
                "the clock button answers from your notes as they were on a day "
                "you pick, and Back to now returns to today. It also says who "
                "filed the note "
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
                "an address that opens it in the app. Editing a note has the title, "
                "a line of properties and the text in one box: the category is its "
                "chip with a menu, tags are chips after it (Add tag: Enter or a "
                "comma adds one, pressing one removes it), and the formatting "
                "icons sit above the text, the rest behind More. Related notes "
                "fold into one \"suggested links\" line until you open it. The foot "
                "has Attach a link (pick a saved bookmark) and the word count at "
                "the left and Cancel and Save at the right. On a focused note, F2 edits it, Delete deletes it, and "
                "Home and End jump to the ends of the list. In a window 1280 wide "
                "or more, the note you are reading (the one you clicked, else the "
                "one in view as you scroll) has a Connections column beside the "
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
                "notes by the subjects the graph finds in how they link; F2 or "
                "right-click on a topic's heading renames it or shows it on the graph."
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
            #: INBOX 688, 714: the Ask box's Use AI switch.
            "id": "answers-from-notes",
            "keywords": (
                "from your notes", "answer without ai", "no ai answer", "answer with no model",
                "composed answer", "without the ai", "ai or notes", "notes instead of ai",
                "switch off the ai", "ai off", "who answers", "ask without a model", "use ai",
            ),
            "body": (
                "Ask on the Notes tab has a Use AI switch beside its title. On, your "
                "model writes the answer; off, the answer is From your notes, with "
                "no AI: the app picks the "
                "sentences in your notes that answer the question and strings them "
                "together, the answer on the first line under the note it came from, "
                "the other notes joined by how they relate (also, later, separately, "
                "or but when two may disagree), a sentence several notes repeat said "
                "once with how many say it, a timeline for a when question, the "
                "newest first for a latest question, two sides for a comparison, and "
                "a few questions to ask next. Tell me more, or the second one, "
                "follows on from the answer before. The Chat tab answers the same "
                "way whenever no model is running: its box stays open, and Agent "
                "mode is greyed unless the Needle extra can run it. Every "
                "sentence is quoted from a note and cited like any answer; the app "
                "adds only the joining words and the counts and dates it measured, "
                "names two notes that may disagree, and says which of your words "
                "none of the notes found mention. It never answers yes or no for "
                "you. In Ask the chip over the answer reads Your notes, no AI; in "
                "Chat the reply's head reads Atlas, from your notes (Atlas and the "
                "model's name when a model wrote it). The "
                "choice is kept on this device; with no model running it is the "
                "answer and Use AI is greyed, with the reason on it, until a model runs. "
                "The No model connected line above the Chat box and the Ask box "
                "has a close button (the small x at its end): it hides that line "
                "until the next time you start the app, a new session, and "
                "connecting a model in Settings, Models always brings the answers back."
            ),
            "badge": {"label": "Notes", "tab": "notes"},
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
                "changes notes", "last run of a skill", "undo a skill run", "undo the run",
            ),
            "body": (
                "Library, AI skills lists every skill: the filter beside the "
                "search shows All skills, Yours or Built-in (your own or the ones "
                "that ship with the app, each with its count), and "
                "the sort button (the arrows beside them) orders by Yours first, "
                "Name A to Z or Recently run. Each card says whether the skill Reads only or Changes "
                "notes, and how its last run went. Duplicate makes a copy of any "
                "skill, a built-in one included, to edit as your own; Delete has "
                "Undo. Settings, Skills is where a skill is written and edited. "
                "In Chat, a run's What changed list has an Undo on each change, "
                "and Undo the run puts back every note it changed at once, after "
                "showing what will go back (a board item cannot be undone, and "
                "the list says so)."
            ),
            "badge": {"label": "Library", "tab": "library"},
        },
        {
            "id": "ocr-engine",
            "keywords": (
                "ocr language", "reading language", "tesseract language", "install tesseract",
                "tesseract not working", "tesseract missing", "read again", "which engine",
                "language of the scan", "rapidocr", "ocr without tesseract",
                "choose rapidocr", "rapidocr instead of tesseract",
            ),
            "body": (
                "In the OCR workspace, the reader button's dot says whether "
                "Tesseract can read (green) or not (amber); its menu shows the "
                "version and the language it reads in. Pick the language there, "
                "and every read follows it, the background pass included. When "
                "Tesseract cannot read, the menu names the cause and offers "
                "Install, with its progress, and the tool row's ... menu opens "
                "Settings to manage it; a read it "
                "cannot do falls to the vision model, and each reading names the "
                "engine that read it. Read again reads afresh, and a reading can "
                "be edited by hand or added to an existing note. Settings, "
                "Packages shows the same status and language. RapidOCR, a second "
                "reader with nothing else to install (its own row in Settings, "
                "Packages), can be chosen in the reader button's menu, and then "
                "reads even when Tesseract is ready; with nothing chosen it reads "
                "when Tesseract isn't ready. Its models read English and Chinese, "
                "so the language does not apply. Not installed, the menu says so "
                "and its Install opens that Packages row. With no engine and no "
                "model the menu offers RapidOCR first (about 60 MB, nothing else "
                "to install), then Tesseract, each with its own Install, and Read "
                "says why it cannot read yet. The workspace remembers "
                "the reader you chose."
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
                "installed models", "remove a model", "uninstall a model", "free disk space",
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
                "before it downloads. Installed models shows the models you have "
                "as the same cards, with their size on this computer and what "
                "each is in use for; a card's menu puts it to use, copies its "
                "name or removes it (not while it is in use)."
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
                "Appearance has High contrast, Reduce motion, Interface animations, "
                "Text size and Zoom."
            ),
            "badge": {"label": "Appearance", "section": "appearance"},
        },
        {
            "id": "mind-map-study",
            "keywords": (
                "study the map", "study mode", "revise", "revision", "recall",
                "flashcards", "quiz me on my map", "test myself", "memorise",
            ),
            "body": (
                "Study the map. On a mind map, the board menu's Study the map "
                "goes full screen and asks one branch at a time: what is under "
                "it is hidden until you press Show (or Enter), then Knew it or "
                "Not yet marks it and moves on. Only branches with topics under "
                "them are asked. Nothing on the map changes. Your marks are kept "
                "for that map on this device, a branch you missed says so next "
                "time, and the end says how many you recalled. Esc stops."
            ),
            "badge": {"label": "Library", "tab": "library"},
        },
        {
            "id": "board-comments",
            "keywords": (
                "comment", "comments", "edit a comment", "reply to a comment", "resolve a comment",
                "resolved comments", "comment thread", "link in a comment", "bookmark in a comment",
                "attach to a comment",
            ),
            "body": (
                "Comments on a board or a map. Right-click a card, sticky, shape or "
                "topic and choose Comment… for a thread on it; the count on its "
                "corner opens it again. Each comment has Reply (answered one step in "
                "under it), Edit (in place: Enter keeps it, Esc puts it back, and the "
                "row then says edited), Resolve (folded under N resolved; the corner "
                "counts only what is open, and shows a tick once nothing is) and "
                "Delete (with its replies). In the box, Attach adds a bookmark, note, "
                "document or board, / offers links, a bookmark, an emoji or the date, "
                "and [[ links a note. A link alone on its line shows as a link card. "
                "Enter posts, Shift+Enter breaks the line, and Ctrl+Z takes back any "
                "change. Threads are not exported."
            ),
            "badge": {"label": "Library", "tab": "library"},
        },
        {
            "id": "sticky-notes",
            "keywords": (
                "sticky", "sticky note", "stickies", "note colour", "note color", "sticky colour",
                "text box or note", "text box vs sticky", "paper colour",
            ),
            "body": (
                "Sticky notes and text boxes on a board. A sticky (N, or the note "
                "on the tool dock) is paper: its colour, a lift, and a folded "
                "corner. A text box (T) is words on the board, with no fill and a "
                "faint dashed edge. Select a sticky and its bar starts with seven "
                "papers (yellow, orange, pink, purple, blue, green, grey); any other "
                "colour, and a text box's own fill or edge, are under the bar's ... "
                "menu, Box. Each change is one Undo step. Typing in either, / offers "
                "lists, a to-do, headings, links and an emoji, and [[ links a note."
            ),
            "badge": {"label": "Library", "tab": "library"},
        },
        {
            "id": "emoji-and-icons",
            "keywords": (
                "emoji", "emojis", "icon", "icons", "sticker", "stickers", "emoji picker",
                "icon picker", "insert an emoji", "insert an icon", "drag an icon", ":ph-",
            ),
            "body": (
                "Emoji and icons. One picker holds every Phosphor icon the app ships "
                "and about 470 emoji: Emoji or Icons in the tab strip under its title, "
                "type to search, Recent first, arrows and Enter to choose, Escape to close. On a board or a "
                "map, the smiley on the tool dock (Add on a board, Map on a map) or Insert, "
                "Emoji and icons… keeps it open: press one to place it "
                "in the middle of the view, or drag it where it goes. An emoji lands "
                "as a sticker (no card, resize it like any item), an icon as a shape "
                "you can recolour; dropped on a map topic, either becomes that "
                "topic's icon. Each is one Undo step. In a note or a document, the "
                "smiley in the formatting toolbar (the document's Insert menu) or "
                "Emoji or icon in the / menu puts one at the caret: an emoji as "
                "itself, an icon as :ph-name:, which reading shows as the icon."
            ),
            "badge": {"label": "Library", "tab": "library"},
        },
        {
            "id": "mind-map-look",
            "keywords": (
                "central topic", "centre topic", "center topic", "main branch", "map levels",
                "hierarchy", "level style", "map style", "bigger centre", "core nodes",
                "solid fill", "topic style", "topic icon", "emoji on a topic", "icon picker",
            ),
            "body": (
                "How a map's topics look. A map draws as a hierarchy: the centre "
                "large, bold and filled, each main branch bold on a tinted card "
                "with a thick line, deeper topics plain. Enter on the centre adds "
                "a main branch. A topic's own size, shape or fill always beats "
                "its level's: the Text and Shape menus over a selected topic set "
                "them, and Fill offers Solid colour. View, How this map looks picks "
                "the hierarchy (Classic, Outline with plain text on the lines, "
                "Boxed, or Flat for every topic alike) and, with Setting on The "
                "centre, Main branches or Sub-topics, that level's size, weight, box, edge bar, "
                "fill, line and effect. A topic's Effect, in its Shape group: a soft shadow, or "
                "a glow in its branch colour (No effect keeps one plain on a level that has one). A topic's menu, Look: Copy this topic's style and "
                "Paste style (Ctrl+Alt+C and V, onto every selected topic), and "
                "Use this look for its level, which hands the topic's own look to "
                "every topic at its level. Each is one Undo step. A topic's icon: "
                "the Text menu's Icon row has eleven, and More icons and emoji… "
                "opens every Phosphor icon and about 470 emoji, searchable, with "
                "your recent ones first; an emoji or an icon, one per topic."
            ),
            "badge": {"label": "Library", "tab": "library"},
        },
        #: Brief 69 (DOCUMENTS_PLAN 23, I1): run, preview and test, written
        #: from the run panel (documents-code.js), run-core.js's languages
        #: and the palette rows in DOC_COMMANDS.
        {
            "id": "code-run",
            "keywords": (
                "run code", "run a file", "run python", "run javascript", "run typescript",
                "typescript", "sql", "sqlite", "query", "p5", "p5.js", "sketch", "preview css",
                "preview svg", "svg", "unit test", "unit tests", "run tests", "unittest",
                "input()", "run selection", "run cell", "output panel", "pyodide",
            ),
            "body": (
                "Run (Ctrl+Shift+Enter, beside Format) runs a code document in a "
                "sandbox with no network and none of your notes, and shows what it "
                "prints, its errors and their lines in the Output panel under the "
                "editor. JavaScript runs as it is; TypeScript runs with its types "
                "removed, not checked; SQL runs against an empty SQLite database "
                "made for the run, each statement's result a table; Python runs "
                "once Python is installed in Settings, Packages (until then Run is "
                "greyed and the line beside it goes there), and input() reads its "
                "lines from the panel's Input box. HTML, CSS (over a sample page), "
                "SVG and a p5.js sketch (New from a template, p5.js sketch) show as "
                "a page; Live in the panel refreshes it as you type. A file of "
                "tests (describe, it and expect in JavaScript or TypeScript; "
                "unittest or test_ functions in Python) runs its tests, each "
                "listed with its time and a failure underlined on its line; Run "
                "tests in the panel asks for them. The palette has Run the "
                "selected lines and Run the cell at the caret (between # %% "
                "markers). Stop ends a run; one still going after two seconds is "
                "listed in Activity, whose Stop ends it too. Beside Output, "
                "Problems lists every underline and Tests each test; the Console "
                "(Ctrl+Shift+Y) evaluates a line in what the run left, Python for "
                "a .py file and JavaScript for the rest, Up recalling the last. "
                "Debug (F5) steps "
                "JavaScript, TypeScript and Python; see the debugger."
            ),
            "badge": {"label": "Library", "tab": "library"},
        },
        #: Brief 70 (DOCUMENTS_PLAN 23, I2): the debugger, written from the
        #: Debug tab (documents-code.js, `docDebugView`), the gutter
        #: (`docDebugExtension`) and the palette rows in DOC_COMMANDS.
        {
            "id": "debugger",
            "keywords": (
                "debug", "debugger", "debugging", "breakpoint", "breakpoints", "step over",
                "step in", "step into", "step out", "watch", "watch expression", "call stack",
                "variables", "conditional breakpoint", "f5", "f9", "f10", "f11", "bdb",
            ),
            "body": (
                "Debug runs a JavaScript, TypeScript or Python document to its "
                "first breakpoint and stops there. Click beside a line number (or "
                "press F9 on the line) for a breakpoint; right-click it to add a "
                "condition, and it stops only when that is true. Press F5, or "
                "Start debugging in the run panel's Debug tab; the stopped line is lit, and "
                "the Debug tab shows Variables (the frame's names, then Globals), "
                "Watch (type an expression under it; each stop evaluates it), the "
                "Call stack (a row goes to its line) and Breakpoints. F10 steps "
                "over a line, F11 into a call, Shift+F11 out of the function, F5 "
                "continues and Shift+F5 stops; the same five are buttons at the "
                "top of the tab. An error nothing catches stops on the line that "
                "raised it, with its traceback and the frame's variables. Python's "
                "input() asks in the panel mid-run. Python debugging needs a window "
                "that gives SharedArrayBuffer (the app's own does); JavaScript is "
                "stepped by an interpreter that reads ES5, so let, const, arrow "
                "functions and template strings are rewritten for it, and a class, "
                "destructuring or async code is named with its line and only Run "
                "takes it. A script that uses the page debugs against a stand-in "
                "document, so nothing is drawn."
            ),
            "badge": {"label": "Library", "tab": "library"},
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
    "whiteboard": {"title": "Whiteboards", "path": "Library tab, Boards & maps"},
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
    "simple-mode": {"title": "Simple mode", "path": "Settings, General, Simple mode", "target": "simple-mode-box"},
    "usage-ledger": {"title": "What you use", "path": "Settings, General, What you use", "target": "usage-box"},
    "statistics": {"title": "Statistics", "path": "Dashboard, Activity heatmap, Statistics"},
    "timer": {"title": "Timer and stopwatch", "path": "Command palette, timer"},
    "live-captions": {"title": "Live captions", "path": "Command palette, Live captions"},
    "count-words": {"title": "Count words", "path": "Command palette, Count words"},
    "translate-offline": {"title": "Translate this, offline", "path": "Command palette, Translate this"},
    "insert-template": {"title": "Insert a template", "path": "Command palette, insert template"},
    "capture-anywhere": {"title": "Capture from anywhere", "path": "Settings, Keyboard shortcuts, Capture from anywhere", "target": "capture-anywhere-box"},
    "install-app": {"title": "Install as an app", "path": "Settings, About, Install as an app"},
    "storage": {"title": "Where your data lives", "path": "Settings, Import & export"},
    "websearch": {"title": "Web search", "path": "Settings, Web search"},
    "privacy": {"title": "Privacy", "path": "Settings, Privacy"},
    "undo-bin": {"title": "Undo and the bin", "path": "Ctrl+Z, and the Library's Include the bin"},
    "autonomous": {"title": "Autonomous background AI", "path": "Settings, Background tasks"},
    "guide": {"title": "Atlas, the guide", "path": "Status bar, the compass (Ctrl+Shift+H)"},
    "command-palette": {"title": "The command palette", "path": "Ctrl+K"},
    "security": {"title": "Account and security", "path": "Settings, Account & security"},
    "troubleshooting": {"title": "When something does not work", "path": "Settings, Models, then Settings, Logs", "steps": (
        "Open Settings, Models and check a model is connected.", "Start Ollama, LM Studio or a llama.cpp server, pick a model and press Connect.", "Looks out of date or broken after an update: open Settings, Import & export and press Clear app cache.", "Still stuck: open Settings, Logs and press Email it under the support bundle.")},
    "tour": {"title": "The guided tour", "path": "Settings, Help", "steps": (
        "Open Settings, Help, or press Ctrl+K and choose Take the guided tour.", "Press a section's tour button, or start from the top.", "Next and Back move through it; Finish ends it.")},
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
    "health": {"title": "Health", "path": "Settings, About, Health"},
    "activity": {"title": "Activity", "path": "The status bar's job slot, or the palette, Activity"},
    "packages": {"title": "Packages", "path": "Settings, Packages"},
    "import-export": {"title": "Import and export", "path": "Settings, Import & export"},
    "logs": {"title": "Logs and reporting a problem", "path": "Settings, Logs", "steps": (
        "Open Settings, Logs.", "Press Email it under the support bundle.", "Attach the bundle the app saved and send.")},
    "find-anything": {"title": "Find anything", "path": "Ctrl+P, or the magnifying glass in the status bar"},
    "background-art": {"title": "The animated background", "path": "Settings, Appearance, Animated background"},
    "themes": {"title": "Themes, colour and type", "path": "Settings, Appearance"},
    "tabs-overview": {"title": "The app at a glance", "path": "The tabs along the top"},
    "settings-overview": {"title": "Finding your way round Settings", "path": "The gear in the top bar, or Ctrl+,"},
    "lock": {"title": "Passwords and locking", "path": "Settings, Account & security"},
    #: Titles for the entries that had none (INBOX 448): Settings, Help lists
    #: every entry by its title, and an id read aloud ("Files images") is not one.
    "files-images": {"title": "Pictures, scans and PDFs", "path": "Library tab, Images and Files"},
    "archive": {"title": "Archiving", "path": "Each item's own menu, and the Library's Archived filter"},
    "voice": {"title": "Dictation, recordings and read aloud", "path": "Notes tab, the microphone; Library, Recordings"},
    "meetings": {"title": "Meeting notes", "path": "Dashboard, New meeting; a meeting's meeting chip"},
    "extract-notes": {"title": "Split text into notes", "path": "Notes tab, Writing room, More, Split into notes"},
    "favourites": {"title": "Favourites", "path": "A note's star"},
    "ocr-workspace": {"title": "The OCR workspace", "path": "Read text, on any image or PDF"},
    "document-history": {"title": "A document's history", "path": "A document's ... menu, History"},
    "writing-checks": {"title": "Spelling, grammar and wording", "path": "The document editor"},
    "notebook-questions": {"title": "Questions about your notebook", "path": "Chat tab, or Ask on the Notes tab"},
    "contradictions": {"title": "Notes that disagree", "path": "Dashboard tab"},
    "write-with-atlas": {"title": "Writing room", "path": "Notes tab, Writing room"},
    "search": {"title": "Searching everything", "path": "Ctrl+P, or the dashboard's search box"},
    "links": {"title": "Linking notes", "path": "Type [[ in a note"},
    "performance": {"title": "When the app feels slow", "path": "Settings, Appearance"},
    "translate": {"title": "Translating", "path": "Notes tab, Writing room"},
    "tags-categories": {"title": "Tags and categories", "path": "A note's own row, or Capture's Filing menu"},
    "code-files": {"title": "Code documents", "path": "Library tab, Documents"},
    "code-run": {"title": "Running, previewing and testing code", "path": "A code document, Run", "steps": (
        "Open a code document (.js, .ts, .sql, .py, .html, .css, .svg).",
        "Press Run, or Ctrl+Shift+Enter.",
        "Read the Output panel under the editor; Line N goes to the line.",
        "Ctrl+Shift+Y opens the Console tab: type a line and press Enter.")},
    "debugger": {"title": "Debugging code", "path": "A code document, the gutter beside a line number, F5", "steps": (
        "Open a JavaScript, TypeScript or Python document.",
        "Click beside a line number, or press F9 on it, for a breakpoint.",
        "Press F5; at the stop, F10, F11 and Shift+F11 step, F5 continues.",
        "Read Variables, Watch and the Call stack in the panel's Debug tab.")},
    "mind-maps": {"title": "Mind maps", "path": "Library tab, Boards & maps"},
    "whiteboard-controls": {"title": "Whiteboard keys and controls", "path": "Library tab, Boards & maps"},
    "board-history": {"title": "A board's history, and putting it back", "path": "A board, Board, History…"},
    "board-library": {"title": "The board's library, layers and templates", "path": "A board, the Library button in its top bar"},
    "board-templates": {"title": "Board and map templates", "path": "Library tab, Boards & maps, New, From a template"},
    "board-format": {"title": "The board's Format panel and connectors", "path": "A board, Ctrl+Shift+P or the selection's More menu"},
    "mind-map-controls": {"title": "Mind map keys and controls", "path": "Library tab, Boards & maps"},
    "documents-controls": {"title": "Document editor keys and controls", "path": "Library tab, Documents"},
    "documents-features": {"title": "Document editor features", "path": "Library tab, Documents"},
    "mind-map-features": {"title": "Mind map features", "path": "Library tab, Boards & maps"},
    "mind-map-study": {"title": "Study the map", "path": "Library tab, Boards & maps, a map's board menu"},
    "mind-map-look": {"title": "How a map's topics look", "path": "Library tab, Boards & maps, a map"},
    "emoji-and-icons": {"title": "Emoji and icons", "path": "The smiley on a board's or map's tool dock, or its Insert menu; a topic's Text menu"},
    "board-comments": {"title": "Comments on boards and maps", "path": "An item's right-click menu, Comment…"},
    "sticky-notes": {"title": "Sticky notes and text boxes", "path": "A board's tool dock, Add"},
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
    "editor-offers": {"title": "Offers while you write", "path": "Notes, Capture, or a note's Edit form"},
    "quick-add": {"title": "Dates and tags read as you type", "path": "Reminders, Quick note, New meeting, Timeline search, the command palette"},
    "note-outbox": {"title": "Saving while the server is away", "path": "Notes tab, above Capture"},
    "attachments": {"title": "Pictures and files in a note", "path": "Capture, or a note being edited"},
    "filing": {"title": "How a note is filed", "path": "A note's card, beside its category"},
    "suggested-tags": {"title": "Suggested tags", "path": "A note's card"},
    "tag-manager": {"title": "Managing tags", "path": "Notes tab, the ... menu, Manage tags"},
    "tidy": {"title": "Tidy: reviews with no AI", "path": "Notes tab, the broom in the dock"},
    "manage-categories": {"title": "Managing categories", "path": "Notes tab, the Categories head in the sidebar"},
    "note-history": {"title": "A note's history", "path": "A note's menu, History"},
    "notes-list": {"title": "Sorting and browsing notes", "path": "Notes tab, Your notes"},
    "addresses": {"title": "Every view has an address", "path": "The browser's address bar"},
    "bookmarks": {"title": "Bookmarks", "path": "Library tab, Bookmarks"},
    "contents": {"title": "Contents, the notebook's outline", "path": "Library tab, Contents"},
    "answers-from-notes": {"title": "Answers from your notes, no AI", "path": "Notes tab, Ask, the Use AI switch", "steps": (
        "Open Ask on the Notes tab.", "Turn Use AI off beside the title.", "Ask: the answer is quoted from your notes, with no AI.")},
    "follow-up-trail": {"title": "Where a follow-up came from", "path": "Chat tab, or Ask in the Notes tab, under an answer"},
    "answer-pictures": {"title": "Pictures in answers", "path": "Chat tab, or Ask in the Notes tab, Grounded in"},
    "library-skills": {"title": "AI skills in the Library", "path": "Library tab, AI skills"},
    "ocr-engine": {"title": "Tesseract and the reading language", "path": "The OCR workspace, the reader button"},
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
        "command-palette", "find-anything", "search", "addresses", "settings-overview", "install-app",
    )),
    ("Writing notes", (
        "capture", "quick-note", "quick-add", "editor-offers", "share-note", "capture-anywhere", "note-outbox", "attachments", "notes-controls",
        "notes-list", "note-history", "links", "favourites", "templates",
        "write-with-atlas", "translate", "translate-offline", "extract-notes", "voice", "live-captions", "meetings",
    )),
    ("Filing, tags and categories", (
        "tags-categories", "filing", "suggested-tags", "tag-manager", "manage-categories", "tidy",
    )),
    ("Asking Atlas", (
        "ask-chat", "answers-from-notes", "chat-controls", "chat-acts", "follow-up-trail", "answer-pictures", "time-and-recency", "notebook-questions",
        "contradictions", "skills", "personas", "answer-style", "memory", "learned", "open-questions",
    )),
    ("Documents and code", (
        "documents", "documents-controls", "documents-features", "callouts", "document-history", "writing-checks", "code-files", "code-run",
        "debugger", "margin-reader",
    )),
    ("Boards and maps", (
        "whiteboard", "whiteboard-controls", "board-history", "board-library", "board-templates", "board-format", "mind-maps", "mind-map-controls", "mind-map-features", "mind-map-study", "mind-map-look", "emoji-and-icons",
        "board-comments", "sticky-notes",
    )),
    ("Library and files", (
        "library", "library-controls", "bookmarks", "web-clipper-bookmark", "contents", "library-skills",
        "files-images", "ocr-workspace", "ocr-engine", "archive", "undo-bin",
    )),
    ("Graph, Timeline, Reminders and Dashboard", (
        "graph", "graph-controls", "graph-display", "entities", "properties", "timeline", "timeline-controls", "reminders",
        "reminders-controls", "dashboard", "dashboard-controls", "notifications", "spaces", "statistics",
    )),
    ("Small tools", (
        "timer", "count-words", "insert-template",
    )),
    ("Look and feel", (
        "appearance", "themes", "simple-mode", "accessibility", "performance", "background-art",
        "statusbar", "companion", "atlas-look", "faces",
    )),
    ("Models and the AI", (
        "models", "model-downloads", "model-bench", "tools-setting", "autonomous", "websearch",
        "search-index", "packages",
    )),
    ("Privacy and your data", (
        "privacy", "security", "encryption", "lock", "phone", "two-computers", "delete-data", "storage", "import-export", "import-apps", "usage-ledger", "background-tasks", "activity", "health",
    )),
    ("Settings and support", (
        "profile", "general-settings", "updates", "logs", "troubleshooting",
    )),
]


#: The acts Chat does from a sentence: generated from the act registry
#: (`ai/act_registry.py`, CHAT_PLAN decision 53), so a new act is in the Guide the
#: moment it is in the registry, and a renamed one cannot drift.
#: The Guide's gaps from the engine probe (CHAT_PLAN section 2, the help
#: row; `agent-remaining/engine-probe-1010.md`): the phone, two computers,
#: encryption, deleting your data and sharing a note had no topic of their
#: own. `tests/test_guide_gaps.py` holds the probe's table at 1.0.
MORE_TOPICS.extend([
    {
        "id": "phone",
        "keywords": ("phone", "on my phone", "mobile", "iphone", "android", "tablet", "ipad", "use it on my phone",
                     "open it on my phone"),
        "body": (
            "Your phone opens this computer's notebook over your own network: turn "
            "on Allow other devices on this network (Settings, Account & security, "
            "Other devices), then open the address it shows on the phone (https, "
            "port 8443) and sign in with your password. The first visit warns that "
            "the certificate is not trusted: compare the fingerprint shown under the "
            "switch, or use Trust this certificate on your phone, whose ? has the "
            "iPhone and Android steps. The phone reads and writes the same notebook; "
            "nothing goes through the internet, so the computer has to be on."
        ),
        "badge": {"label": "Account & security", "section": "account"},
    },
    {
        "id": "two-computers",
        "keywords": ("two computers", "another computer", "second computer", "sync", "syncing", "laptop and desktop",
                     "move to a new computer", "new computer", "other computer", "use it on two"),
        "body": (
            "One notebook lives on one computer, in its data folder (Settings, Import "
            "& export shows where). There is no sync between two copies. To move to a "
            "new computer, save a full backup there and restore it on the new one, or "
            "copy the data folder while the app is closed. To use one notebook from a "
            "second computer at the same time, open it over your network from the "
            "first: Settings, Account & security, Other devices."
        ),
        "badge": {"label": "Import & export", "section": "data"},
    },
    {
        "id": "encryption",
        "keywords": ("encrypted", "encryption", "is my data encrypted", "encrypt my notes", "is it secure", "secure",
                     "who can read my notes"),
        "body": (
            "Private notes are encrypted at rest with a key made from your unlock "
            "password; without it their words cannot be read from the data folder. "
            "Other notes are stored as they are written, in the data folder on your "
            "computer, so your disk's own encryption is what keeps them. A full "
            "backup can be sealed with a password (Settings, Import & export). A "
            "recovery key (Settings, Account & security) opens private notes if the "
            "password is forgotten, and Re-encrypt private notes makes a new key."
        ),
        "badge": {"label": "Account & security", "section": "account"},
    },
    {
        "id": "delete-data",
        "keywords": ("delete my data", "delete everything", "erase my data", "remove my data", "wipe", "uninstall",
                     "start over", "delete all my notes"),
        "body": (
            "A deleted note, document or reminder goes to the bin first: Undo or the "
            "bin's Restore brings it back, and the bin clears itself after the time "
            "set in Settings, General, Bin (or Empty the bin at once). Everything "
            "else is in the data folder (Settings, Import & export shows where): to "
            "erase the notebook, save a backup if you want one, close the app and "
            "delete that folder, then uninstall. Nothing is kept anywhere else."
        ),
        "badge": {"label": "General", "section": "general"},
    },
    {
        "id": "share-note",
        "keywords": ("share a note", "share this note", "send a note", "share", "sharing", "give someone a note",
                     "email a note"),
        "body": (
            "Three ways, none through a server: the note's menu, Download .md, "
            "saves it as a Markdown file to send; copy its "
            "address (every view has one) for anyone opening this notebook with "
            "you; or let them open the notebook from their phone or computer on "
            "your network (Settings, Account & security, Other devices)."
        ),
        "badge": {"label": "Import & export", "section": "data"},
    },
])
TOPIC_META.update({
    "phone": {"title": "On your phone", "path": "Settings, Account & security, Other devices"},
    "two-computers": {"title": "Two computers", "path": "Settings, Import & export"},
    "encryption": {"title": "What is encrypted", "path": "Settings, Account & security"},
    "delete-data": {"title": "Deleting your data", "path": "Settings, General, Bin"},
    "share-note": {"title": "Sharing a note", "path": "A note's menu, Download .md"},
})


def _act_topic() -> dict:
    from memorymap.ai import act_registry

    return act_registry.guide_topic()


MORE_TOPICS.append(_act_topic())
TOPIC_META["chat-acts"] = {"title": "Things Chat does for you", "path": "Chat tab"}
