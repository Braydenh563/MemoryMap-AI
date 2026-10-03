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
        ),
        "body": (
            "Atlas is drawn as a small character of starlight with rings "
            "round its head, or, if you prefer, as the classic glowing globe: "
            "Settings, Appearance, Atlas and faces, Atlas style. Atlas look "
            "picks Masculine or Feminine, or Auto, which follows Face looks "
            "when that is set to one look and your own face's look otherwise; "
            "it is used everywhere Atlas appears, the dashboard mark and the "
            "chat's replies included. Atlas's face follows the app's mood: "
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
        ),
        "body": (
            "Settings, Tools it can use lists the actions Atlas may take in "
            "Agent mode; turn one off and it is never offered. Destructive "
            "actions always ask you first. How many are offered at once: Only "
            "what the message needs (the default) or Always send all of them, "
            "if Atlas ever misses a tool you asked for. Small model mode offers "
            "a small model one tool at a time (Auto decides from the model's "
            "name, On, Off). Run budget caps what one skill run may spend, in "
            "tokens per step and in seconds; 0 means no limit."
        ),
        "badge": {"label": "Tools it can use", "section": "tools"},
    },
    {
        "id": "learned",
        "keywords": (
            "what it learned", "learned", "worked out", "derived", "forget everything learned",
            "read my notes now", "export what it learned",
        ),
        "body": (
            "Settings, What it learned is what Atlas worked out by itself while "
            "reading your notes (a claim a note makes, a question it leaves "
            "open), where What it remembers is what you told it. Every row "
            "says which note it came from, which model decided it and how sure "
            "it was. Edit a row and no later run overwrites it; delete one and "
            "it is never worked out again. What may run switches each kind off; "
            "Read my notes now runs it; Export what it learned and Forget "
            "everything learned act on all of it and never touch your notes."
        ),
        "badge": {"label": "What it learned", "section": "learned"},
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
        ),
        "body": (
            "Settings, Background tasks shows what the app is doing right now "
            "(re-indexing, downloading a model, setting up search) with Quit on "
            "the jobs that can stop safely, and what has finished since it "
            "started. Autonomous background AI is here too. Battery-efficient "
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
            "restore can be undone."
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
            "them. The support bundle collects the logs and the app's state; "
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
            "are grouped: Atlas (Models, Profile, Personas, Skills, Tools it can "
            "use, What it remembers, What it learned, Web search), Your notebook "
            "(General, Appearance, Templates, Keyboard shortcuts, Import & "
            "export), System (Account & security, Privacy, Packages, Background "
            "tasks, Logs) and Getting help (Help, About). The search box at the "
            "top of the list finds a setting by any word in it."
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
            "always with your password. Change your password or PIN (private "
            "notes move across). Sessions: Auto-lock when idle, from 5 minutes "
            "to 12 hours, and Lock everywhere now; the lock in the top bar "
            "locks at once. There is no reset link: run python -m memorymap "
            "--reset-password in a terminal, which keeps ordinary notes and "
            "loses private ones, whose key is your password."
        ),
        "badge": {"label": "Account & security", "section": "account"},
    },
]

#: How each entry is laid out as a system answer. `title` heads it, `path`
#: says where it lives, `steps` are there when there is something to do in
#: order. An entry with no meta is laid out from its id and body alone.
TOPIC_META: dict[str, dict] = {
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
    "storage": {"title": "Where your data lives", "path": "Settings, Import & export"},
    "websearch": {"title": "Web search", "path": "Settings, Web search"},
    "privacy": {"title": "Privacy", "path": "Settings, Privacy"},
    "undo-bin": {"title": "Undo and the recycle bin", "path": "Ctrl+Z, and the Library's Recycle bin"},
    "autonomous": {"title": "Autonomous background AI", "path": "Settings, Background tasks"},
    "guide": {"title": "Atlas, the guide", "path": "Status bar, Guide (Ctrl+Shift+H)"},
    "command-palette": {"title": "The command palette", "path": "Ctrl+K"},
    "security": {"title": "Account and security", "path": "Settings, Account & security"},
    "troubleshooting": {"title": "When something does not work", "path": "Settings, Models, then Settings, Logs", "steps": (
        "Open Settings, Models and check a model is connected.", "Start Ollama, LM Studio or a llama.cpp server, pick a model and press Connect.", "Still stuck: open Settings, Logs and press Email it under the support bundle.")},
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
}
